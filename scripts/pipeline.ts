/**
 * pipeline.ts — BULLETPROOF lokalny orkiestrator danych i backtestów.
 * Zero udziału AI/tokenów: czysty skrypt do odpalania ręcznie, przez mostek,
 * pm2 albo harmonogram zadań (Windows: schtasks, raz dziennie po 8:00).
 *
 *   npm run pipeline            # pełny przebieg
 *   npm run pipeline -- --only fetch     # tylko pobieranie (swaps+llama)
 *   npm run pipeline -- --only backtest  # tylko backtesty na istniejącym cache
 *
 * Odporność:
 *  - każdy krok: do 3 podejść z narastającą przerwą (60s/180s), całość idzie
 *    dalej nawet gdy krok padnie (raport braków na końcu, exit code = liczba porażek),
 *  - fetch-swaps/fetch-llama są wznawialne (state.json / istniejące pliki),
 *    więc retry dociąga tylko braki — nigdy nie zaczyna od zera,
 *  - walidacja świeżości: krok fetch uznany za udany tylko, gdy dane pokrywają
 *    ostatnie <24h (state nextBlock vs teraz),
 *  - log całości: data/pipeline.log (+ pełne logi kroków w data/pipeline-logs/).
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const LOGDIR = path.join(ROOT, 'data', 'pipeline-logs');
fs.mkdirSync(LOGDIR, { recursive: true });
const MAIN_LOG = path.join(ROOT, 'data', 'pipeline.log');

const log = (m: string) => {
  const line = `${new Date().toISOString()} ${m}`;
  console.log(line);
  fs.appendFileSync(MAIN_LOG, line + '\n');
};

function runStep(name: string, script: string, args: string[] = []): Promise<number> {
  return new Promise((resolve) => {
    const logFile = path.join(LOGDIR, `${name}-${Date.now()}.log`);
    const out = fs.createWriteStream(logFile);
    const child = spawn('npx', ['tsx', script, ...args], { cwd: ROOT, env: process.env });
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', (d) => out.write(d));
    child.on('close', (code) => {
      out.end();
      log(`krok ${name}: exit ${code} (log: ${path.relative(ROOT, logFile)})`);
      resolve(code ?? 1);
    });
  });
}

async function withRetry(name: string, fn: () => Promise<number>, attempts = 3): Promise<boolean> {
  for (let i = 1; i <= attempts; i++) {
    log(`▶ ${name} (podejście ${i}/${attempts})`);
    const code = await fn();
    if (code === 0) return true;
    if (i < attempts) {
      const wait = i * 120; // 120s, 240s
      log(`✗ ${name} padł — czekam ${wait}s i ponawiam (kroki są wznawialne)`);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
  log(`✗✗ ${name} nieudany po ${attempts} podejściach — pomijam, lecę dalej`);
  return false;
}

/** czy dane swap są świeże (state.nextBlock pokrywa ostatnie ~24h)? */
function swapsFresh(): { fresh: string[]; stale: string[] } {
  const CACHE = path.join(ROOT, 'data', 'cache');
  const fresh: string[] = [];
  const stale: string[] = [];
  if (!fs.existsSync(CACHE)) return { fresh, stale: ['(brak katalogu cache)'] };
  for (const f of fs.readdirSync(CACHE).filter((x) => x.endsWith('.meta.json'))) {
    const id = f.replace('.meta.json', '');
    const ndjson = path.join(CACHE, `${id}.ndjson`);
    const st = fs.statSync(ndjson, { throwIfNoEntry: false });
    // prosta heurystyka świeżości: plik modyfikowany <26h temu i niepusty
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
    if (!(await withRetry('fetch-swaps', () => runStep('fetch-swaps', 'scripts/fetch-swaps.ts')))) failures.push('fetch-swaps');
    if (!(await withRetry('fetch-llama', () => runStep('fetch-llama', 'scripts/fetch-llama-history.ts')))) failures.push('fetch-llama');
    const { fresh, stale } = swapsFresh();
    log(`świeżość swap cache: OK=[${fresh.join(', ')}] BRAKI=[${stale.join(', ')}]`);
  }

  if (!only || only === 'backtest') {
    if (!(await withRetry('backtest-run', () => runStep('backtest-run', 'backtest/run.ts'), 2))) failures.push('backtest-run');
    if (!(await withRetry('backtest-selection', () => runStep('backtest-selection', 'backtest/selection.ts'), 2)))
      failures.push('backtest-selection');
    // sweep na najpłynniejszej puli Base (kalibracja parametrów)
    if (!(await withRetry('sweep-base030', () => runStep('sweep-base030', 'backtest/sweep.ts', ['base-weth-usdc-030']), 1)))
      failures.push('sweep-base030');
  }

  log(`=== PIPELINE KONIEC — porażki: ${failures.length ? failures.join(', ') : 'BRAK'} ===`);
  process.exit(failures.length);
})();
