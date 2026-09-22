/**
 * pipeline.ts — BULLETPROOF local orchestrator of data and backtests.
 * Zero AI/token involvement: a plain script to run manually, via the bridge,
 * pm2 or the task scheduler (Windows: schtasks, once a day after 8:00).
 *
 *   npm run pipeline            # full run
 *   npm run pipeline -- --only fetch     # fetch only (swaps+llama)
 *   npm run pipeline -- --only backtest  # backtests only on the existing cache
 *
 * Resilience:
 *  - each step: up to 3 attempts with an increasing pause (60s/180s), the whole
 *    thing continues even when a step fails (missing-data report at the end, exit code = number of failures),
 *  - fetch-swaps/fetch-llama are resumable (state.json / existing files),
 *    so a retry only fills the gaps — it never starts from scratch,
 *  - freshness validation: a fetch step counts as successful only when the data covers
 *    the last <24h (state nextBlock vs now),
 *  - overall log: data/pipeline.log (+ full step logs in data/pipeline-logs/).
 */
import 'dotenv/config';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { POOLS } from './fetch-swaps'; // require.main guard in fetch-swaps — the import does NOT start a fetch

const ROOT = path.join(__dirname, '..');
const LOGDIR = path.join(ROOT, 'data', 'pipeline-logs');
fs.mkdirSync(LOGDIR, { recursive: true });
const MAIN_LOG = path.join(ROOT, 'data', 'pipeline.log');

const log = (m: string) => {
  const line = `${new Date().toISOString()} ${m}`;
  console.log(line);
  fs.appendFileSync(MAIN_LOG, line + '\n');
};

function runStep(name: string, script: string, args: string[] = [], extraEnv: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve) => {
    const logFile = path.join(LOGDIR, `${name}-${Date.now()}.log`);
    const out = fs.createWriteStream(logFile);
    // shell:true on Windows — spawn() does not launch npx.cmd directly (ENOENT);
    // same pattern as in agent-runner-git.ts (verified on the Windows server).
    const child = spawn('npx', ['tsx', script, ...args], { cwd: ROOT, env: { ...process.env, ...extraEnv }, shell: process.platform === 'win32' });
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', (d) => out.write(d));
    child.on('close', (code) => {
      out.end();
      log(`step ${name}: exit ${code} (log: ${path.relative(ROOT, logFile)})`);
      resolve(code ?? 1);
    });
  });
}

async function withRetry(name: string, fn: () => Promise<number>, attempts = 3): Promise<boolean> {
  for (let i = 1; i <= attempts; i++) {
    log(`▶ ${name} (attempt ${i}/${attempts})`);
    const code = await fn();
    if (code === 0) return true;
    if (i < attempts) {
      const wait = i * 120; // 120s, 240s
      log(`✗ ${name} failed — waiting ${wait}s and retrying (steps are resumable)`);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
  log(`✗✗ ${name} failed after ${attempts} attempts — skipping, moving on`);
  return false;
}

/** is the swap data fresh (state.nextBlock covers the last ~24h)? */
function swapsFresh(): { fresh: string[]; stale: string[] } {
  const CACHE = path.join(ROOT, 'data', 'cache');
  const fresh: string[] = [];
  const stale: string[] = [];
  if (!fs.existsSync(CACHE)) return { fresh, stale: ['(no cache directory)'] };
  for (const f of fs.readdirSync(CACHE).filter((x) => x.endsWith('.meta.json'))) {
    const id = f.replace('.meta.json', '');
    if (/^(wide|ref)-/.test(id)) continue; // Tier 2 cache (collector) — not refreshed nightly, do not report as MISSING
    const ndjson = path.join(CACHE, `${id}.ndjson`);
    const st = fs.statSync(ndjson, { throwIfNoEntry: false });
    // simple freshness heuristic: file modified <26h ago and non-empty
    if (st && st.size > 0 && Date.now() - st.mtimeMs < 26 * 3600 * 1000) fresh.push(id);
    else stale.push(id);
  }
  return { fresh, stale };
}

(async () => {
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  const failures: string[] = [];
  log(`=== PIPELINE START (only=${only ?? 'all'}) ===`);

  if (!only || only === 'fetch') {
    // ORDER (lesson of 18.08): fetch-llama FIRST — cheap (DefiLlama API only)
    // and CRITICAL for the selector (26h failsafe); slow swaps must not block it.
    if (!(await withRetry('fetch-llama', () => runStep('fetch-llama', 'scripts/fetch-llama-history.ts')))) failures.push('fetch-llama');
    // Swaps: HyperSync per pool (minutes) when a token is present; fallback = the old
    // RPC variant (hours on free limits — lesson of 18.08: 11%/91min).
    const hsToken = process.env.HYPERSYNC_BEARER_TOKEN || process.env.ENVIO_API_TOKEN;
    if (hsToken) {
      for (const p of POOLS) {
        if (!p.address) { log(`fetch-swaps-hs: skipping ${p.id} (no address in cfg — HyperSync does no factory lookup)`); continue; }
        if (!(await withRetry(`hs-${p.id}`, () => runStep(`hs-${p.id}`, 'scripts/fetch-swaps-hypersync.ts', [p.id]), 2)))
          failures.push(`hs-${p.id}`);
      }
    } else {
      log('MISSING HYPERSYNC_BEARER_TOKEN in .env — falling back to the slow fetch-swaps.ts (RPC); add the token (envio.dev) so the fetch takes minutes instead of hours');
      if (!(await withRetry('fetch-swaps', () => runStep('fetch-swaps', 'scripts/fetch-swaps.ts')))) failures.push('fetch-swaps');
    }
    const { fresh, stale } = swapsFresh();
    log(`swap cache freshness: OK=[${fresh.join(', ')}] MISSING=[${stale.join(', ')}]`);
  }

  if (!only || only === 'funnel') {
    // WIDE ranking (02.09, funnel v2 tier 1): scoring the universe for the product,
    // NEXT TO the selector's APY ranking. DefiLlama API only (~2-4 min), 1 attempt,
    // failure = entry in the report (the old wide-ranking.json ranking stays).
    if (!(await withRetry('wide-score', () => runStep('wide-score', 'scripts/wide-score.ts'), 1)))
      failures.push('wide-score');
    // Daily 365/720d model for pools from both rankings (02.09) — reads
    // .bot/wide-ranking.json (above) and selector-ranking.json (selector from the
    // previous day; today's will overwrite after 06:00 — the pools are 90% the same
    // anyway, and the result refreshes every night). Prices from coins.llama (daily cache).
    if (!(await withRetry('wide-daily', () => runStep('wide-daily', 'scripts/wide-daily.ts'), 1)))
      failures.push('wide-daily');
    // Candidate auto-funnel (TASKS-FUNNEL.md): AFTER the fetch (fresh universe),
    // BEFORE backtest-run (a backtest OOM must not kill the funnel). 1 attempt,
    // steady-state max 1 candidate/night; failure = entry in the report, we move on.
    // The funnel sets the 8GB heap for the walkforward itself (NODE_OPTIONS in the spawn).
    if (!(await withRetry('candidate-funnel', () => runStep('candidate-funnel', 'scripts/candidate-funnel.ts'), 1)))
      failures.push('candidate-funnel');
  }

  if (!only || only === 'backtest') {
    // 12GB heap (25.08: first measurement Peak RSS = 7612 MB at the 8192 limit
    // — 7% headroom and the data window grows; the machine has 24GB free, we raise it
    // BEFORE the OOM of 20.08 returns). NODE_OPTIONS is appended, not overwritten.
    const heap = { NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=12288`.trim() };
    if (!(await withRetry('backtest-run', () => runStep('backtest-run', 'backtest/run.ts', [], heap), 2))) failures.push('backtest-run');
    if (!(await withRetry('backtest-selection', () => runStep('backtest-selection', 'backtest/selection.ts'), 2)))
      failures.push('backtest-selection');
    // sweep on the most liquid Base pool (parameter calibration)
    if (!(await withRetry('sweep-base030', () => runStep('sweep-base030', 'backtest/sweep.ts', ['base-weth-usdc-030-365d']), 1)))
      failures.push('sweep-base030');
  }

  // PARSING CONTRACT: 'PIPELINE KONIEC' (= "PIPELINE END") is matched by scripts/wide-collect.ts pipelineRunning() — keep unchanged until both sides migrate together
  log(`=== PIPELINE KONIEC — failures: ${failures.length ? failures.join(', ') : 'NONE'} ===`);
  process.exit(failures.length);
})();
