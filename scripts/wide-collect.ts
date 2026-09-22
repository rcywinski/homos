/**
 * wide-collect.ts — FUNNEL v2, TIER 2: collector of swap history (720d)
 * + full run (walkforward) for the top of the WIDE ranking, by class.
 * (Rafal's decision 02.09: "let it start collecting slowly" — data for the
 * "365d/720d vs HODL, full run" columns in the ranking tables, Batch 22).
 *
 *   npx tsx scripts/wide-collect.ts --dry-run          # queue + mapping only (no fetch)
 *   npx tsx scripts/wide-collect.ts --one              # one pool (fetch + walkforward) and stop
 *   npx tsx scripts/wide-collect.ts --max-minutes 300  # loop, does not start a new pool past the budget
 *   npx tsx scripts/wide-collect.ts                    # whole queue (nights; resumable)
 *   options: --per-class 8 (how many pools per class), --refresh (rerun walkforward on already fetched)
 *
 * PURPOSE: run BY THE CC-Win SUBAGENT in the background, NOT in the pipeline
 * (the nightly pipeline is short and critical; this script takes hours).
 * Concurrency safety: (1) own lock `.bot/wide-collect.lock`
 * (a second instance exits immediately); (2) PAUSE while the pipeline is running
 * (`data/pipeline.lock` exists or pipeline.log has a START entry without END
 * within the last 3h) — it waits, does not compete for CPU/RAM with backtest-run.
 *
 * QUEUE (.bot/wide-collect-queue.json, resumable): from the newest
 * data/wide-score/wide-score-*.json takes the top `--per-class` pools of EACH class
 * (pegged/LST/stable overrepresented by design — TASKS-FUNNEL §2), only
 * uniswap-v3 (v4 = singleton, different events — out of the fetcher's reach) on
 * mainnet/base/arbitrum. Bot pools (BOT_POOLS) have a 720d cache in the pipeline —
 * skipped. The queue GROWS (new pools from subsequent rankings are added), old
 * entries do not disappear — history once fetched stays.
 *
 * MAPPING llama → on-chain: token addresses from `underlyingTokens` (t0/t1 in
 * wide-score), pool = factory.getPool(lo, hi, fee) + token0/token1 sanity check,
 * decimals() from the chain. Engine orientation (repo convention, as in
 * candidate-funnel): QUOTE leg = stable > WETH > BTC(WBTC/cbBTC);
 * `ethIsToken0` = position of the NON-quote leg... except for pairs with WETH and no
 * stable, where (base-cbbtc-weth-005 convention) `ethIsToken0` = position of WETH.
 * USD references: quote WETH → USDC/WETH 720d of that chain; quote BTC →
 * BTC/USDC 720d cache of that chain (queued FIRST, id `ref-*`),
 * with explicit orientation `quoteRefAssetIsToken0` (read by backtest/load.ts).
 *
 * RUN: walkforward 30/15 on 720d, WF_SET=wide (class width from
 * wide-score: crypto-stable ±50, eth-btc/crypto-crypto ±40, pegged tight;
 * hybrid ±5% only for wide classes). Summary result → .bot/wide-backtests.json
 * (key = llama uuid) — read by the server (/api/wide-backtests) and the UI (Batch 22).
 */
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import 'dotenv/config';
import { BOT_POOLS, RPC, STATE_DIR } from '../bot/config';

const ROOT = path.join(__dirname, '..');
const BOT = path.join(ROOT, STATE_DIR);
const SCORE_DIR = path.join(ROOT, 'data', 'wide-score');
const CFG_DIR = path.join(ROOT, 'data', 'candidates');
const CACHE_DIR = path.join(ROOT, 'data', 'cache');
const RESULTS_DIR = path.join(ROOT, 'backtest', 'results');
const QUEUE_PATH = path.join(BOT, 'wide-collect-queue.json');
const OUT_PATH = path.join(BOT, 'wide-backtests.json');
const LOCK_PATH = path.join(BOT, 'wide-collect.lock');
const PIPELINE_LOCK = path.join(ROOT, 'data', 'pipeline.lock');
const PIPELINE_LOG = path.join(ROOT, 'data', 'pipeline.log');

const DAYS = 720;
const WINDOW_D = 30;
const STEP_D = 15;
const FETCH_TIMEOUT_MIN = 180;
const WF_TIMEOUT_MIN = 90;

const CHAIN_MAP: Record<string, string> = { Ethereum: 'mainnet', Base: 'base', Arbitrum: 'arbitrum' };
const FACTORY: Record<string, string> = {
  mainnet: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  base: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  arbitrum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
};
const FEE_BPS: Record<string, number> = { '0.01%': 100, '0.05%': 500, '0.3%': 3000, '1%': 10000 };
const FEE_CODE: Record<number, string> = { 100: '001', 500: '005', 3000: '030', 10000: '100' };
const STABLES = new Set(['USDC', 'USDT', 'DAI', 'USDS', 'PYUSD', 'USDE', 'LUSD', 'GHO', 'FRAX', 'USDBC']);
const ETH_LIKE = new Set(['WETH', 'ETH']);
const BTC_LIKE = new Set(['WBTC', 'CBBTC']);
const ZERO_ADDR = /^0x0{40}$/i;

/** USD-per-WETH reference 720d per chain (cache from the pipeline) */
const WETH_USD_REF: Record<string, string> = {
  mainnet: 'mainnet-usdc-weth-005-720d',
  base: 'base-weth-usdc-030-720d',
  arbitrum: 'arbitrum-weth-usdc-005-720d',
};
/** USD-per-BTC reference per chain: queued by this script (id ref-*) */
const BTC_USD_REF: Record<string, { id: string; btc: string; btcSym: string; usdc: string; feeBps: number }> = {
  mainnet: { id: 'ref-mainnet-wbtc-usdc-030-720d', btc: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', btcSym: 'WBTC', usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', feeBps: 3000 },
  base: { id: 'ref-base-cbbtc-usdc-005-720d', btc: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', btcSym: 'CBBTC', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', feeBps: 500 },
  arbitrum: { id: 'ref-arbitrum-wbtc-usdc-005-720d', btc: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', btcSym: 'WBTC', usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', feeBps: 500 },
};

/** class widths — THE SAME as CLASS_PARAMS.wOurs in wide-score.ts */
const CLASS_W: Record<string, { w: number; narrow: number | null }> = {
  'crypto-stable': { w: 0.5, narrow: 0.05 },
  'eth-btc': { w: 0.4, narrow: 0.05 },
  'crypto-crypto': { w: 0.4, narrow: 0.05 },
  'pegged-btc': { w: 0.01, narrow: null },
  'lst-eth': { w: 0.02, narrow: null },
  'stable-stable': { w: 0.005, narrow: null },
};

const log = (m: string) => console.log(`${new Date().toISOString()} collect: ${m}`);
const arg = (name: string, def: string) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : def; };
const flag = (name: string) => process.argv.includes(name);

// ── queue ───────────────────────────────────────────────────────────────────
type QItem = {
  key: string; // llama uuid or 'ref:<id>'
  id: string; // cache id
  chain: string; symbol: string; feeTier: string; cls: string; score: number | null;
  t0: string; t1: string; // addresses from DefiLlama (order = symbol)
  status: 'pending' | 'mapped' | 'fetched' | 'done' | 'unmapped' | 'failed';
  cfgPath?: string; note?: string; addedAt: string; updatedAt?: string; attempts?: number;
  isRef?: boolean;
};
type Queue = { generatedAt: string; sourceFile: string | null; items: QItem[] };

const readJson = (p: string) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const saveQueue = (q: Queue) => { fs.mkdirSync(BOT, { recursive: true }); fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2)); };

function latestScoreFile(): string | null {
  if (!fs.existsSync(SCORE_DIR)) return null;
  const files = fs.readdirSync(SCORE_DIR).filter((f) => /^wide-score-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  return files.length ? path.join(SCORE_DIR, files[files.length - 1]) : null;
}

function botPoolCached(chain: string, syms: string[], feeBps: number): boolean {
  const s = new Set(syms.map((x) => x.toUpperCase()));
  return BOT_POOLS.some((b) => b.chain === chain && b.feeBps === feeBps && s.has(b.sym0.toUpperCase()) && s.has(b.sym1.toUpperCase()));
}

function buildQueue(perClass: number): Queue {
  const q: Queue = readJson(QUEUE_PATH) ?? { generatedAt: '', sourceFile: null, items: [] };
  const byKey = new Map(q.items.map((i) => [i.key, i]));
  const file = latestScoreFile();
  if (!file) { log(`no data/wide-score/*.json — run npm run wide:score first`); return q; }
  const rows: any[] = readJson(file).rows ?? [];
  const perClassCount: Record<string, number> = {};
  const now = new Date().toISOString();
  for (const r of rows) {
    if (r.score === null || r.project !== 'uniswap-v3') continue;
    const chain = CHAIN_MAP[r.chain];
    if (!chain || !r.t0 || !r.t1) continue;
    const cls = r.cls;
    if (!CLASS_W[cls]) continue;
    perClassCount[cls] = (perClassCount[cls] ?? 0) + 1;
    if (perClassCount[cls] > perClass) continue;
    const feeBps = FEE_BPS[String(r.feeTier).trim()];
    if (!feeBps) continue;
    const syms = String(r.symbol).toUpperCase().split('-');
    if (syms.length !== 2) continue;
    if (botPoolCached(chain, syms, feeBps)) continue; // bot pools have a 720d cache from the pipeline
    if (byKey.has(r.pool)) continue;
    const item: QItem = {
      key: r.pool, id: `wide-${chain}-${syms[0].toLowerCase()}-${syms[1].toLowerCase()}-${FEE_CODE[feeBps]}-720d`,
      chain, symbol: r.symbol, feeTier: String(r.feeTier), cls, score: r.score, t0: r.t0, t1: r.t1,
      status: 'pending', addedAt: now,
    };
    q.items.push(item); byKey.set(item.key, item);
  }
  q.generatedAt = now; q.sourceFile = path.relative(ROOT, file);
  saveQueue(q);
  return q;
}

// ── eth_call ────────────────────────────────────────────────────────────────
async function ethCall(chain: string, to: string, data: string): Promise<string> {
  let lastErr: unknown = new Error(`no RPC for ${chain}`);
  for (const url of RPC[chain] ?? []) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }), signal: AbortSignal.timeout(20_000) });
      const j: any = await r.json();
      if (j.error) throw new Error(`${j.error.code}: ${j.error.message}`);
      if (typeof j.result === 'string' && j.result !== '0x') return j.result;
      throw new Error('empty response');
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
const addrArg = (a: string) => a.toLowerCase().slice(2).padStart(64, '0');
const parseAddr = (res: string) => ('0x' + res.slice(-40)).toLowerCase();
const parseUint = (res: string) => Number(BigInt(res));

async function getPool(chain: string, a: string, b: string, feeBps: number): Promise<string> {
  const [lo, hi] = [a.toLowerCase(), b.toLowerCase()].sort();
  const data = '0x1698ee82' + addrArg(lo) + addrArg(hi) + feeBps.toString(16).padStart(64, '0');
  return parseAddr(await ethCall(chain, FACTORY[chain], data));
}

type Cfg = { id: string; chain: string; address: string; feeBps: number; ethIsToken0: boolean; token0Decimals: number; token1Decimals: number; days: number; quoteRefId?: string; quoteRefAssetIsToken0?: boolean };

async function mapItem(it: QItem): Promise<{ cfg: Cfg } | { unmapped: string }> {
  const feeBps = FEE_BPS[it.feeTier.trim()];
  const syms = it.symbol.toUpperCase().split('-');
  const toks = [it.t0.toLowerCase(), it.t1.toLowerCase()];
  const pool = await getPool(it.chain, toks[0], toks[1], feeBps);
  if (ZERO_ADDR.test(pool)) return { unmapped: 'factory.getPool → 0x0' };
  const tok0 = parseAddr(await ethCall(it.chain, pool, '0x0dfe1681'));
  const tok1 = parseAddr(await ethCall(it.chain, pool, '0xd21220a7'));
  const idx0 = toks.indexOf(tok0), idx1 = toks.indexOf(tok1);
  if (idx0 < 0 || idx1 < 0) return { unmapped: `pool token0/token1 ≠ underlyingTokens (${tok0},${tok1})` };
  const sym0 = syms[idx0], sym1 = syms[idx1];
  const d0 = parseUint(await ethCall(it.chain, tok0, '0x313ce567'));
  const d1 = parseUint(await ethCall(it.chain, tok1, '0x313ce567'));
  const isStable = (s: string) => STABLES.has(s), isEth = (s: string) => ETH_LIKE.has(s), isBtc = (s: string) => BTC_LIKE.has(s);
  const cfg: Cfg = { id: it.id, chain: it.chain, address: pool, feeBps, ethIsToken0: true, token0Decimals: d0, token1Decimals: d1, days: DAYS };
  if (isStable(sym0) || isStable(sym1)) {
    // quote = stable; asset = the other leg (for stable-stable: token0 by convention)
    cfg.ethIsToken0 = isStable(sym0) && isStable(sym1) ? true : !isStable(sym0);
  } else if (isEth(sym0) || isEth(sym1)) {
    // repo convention for pairs with WETH and no stable (base-cbbtc-weth-005): ethIsToken0 = position of WETH
    cfg.ethIsToken0 = isEth(sym0);
    cfg.quoteRefId = WETH_USD_REF[it.chain];
  } else if (isBtc(sym0) || isBtc(sym1)) {
    // quote = BTC; asset = the other leg; BTC/USDC reference (queued as ref-*)
    const ref = BTC_USD_REF[it.chain];
    if (!ref) return { unmapped: `no BTC/USD reference for ${it.chain}` };
    cfg.ethIsToken0 = isBtc(sym0) && isBtc(sym1) ? true : !isBtc(sym0);
    cfg.quoteRefId = ref.id;
    // in the reference pool BTC is token0 when the BTC address < the USDC address
    cfg.quoteRefAssetIsToken0 = ref.btc.toLowerCase() < ref.usdc.toLowerCase();
  } else {
    return { unmapped: `no stable/WETH/BTC leg (${it.symbol}) — no USD reference` };
  }
  return { cfg };
}

async function refCfg(chain: string): Promise<Cfg> {
  const ref = BTC_USD_REF[chain];
  const pool = await getPool(chain, ref.btc, ref.usdc, ref.feeBps);
  if (ZERO_ADDR.test(pool)) throw new Error(`ref ${ref.id}: getPool → 0x0`);
  const btcIs0 = ref.btc.toLowerCase() < ref.usdc.toLowerCase();
  return { id: ref.id, chain, address: pool, feeBps: ref.feeBps, ethIsToken0: btcIs0, token0Decimals: btcIs0 ? 8 : 6, token1Decimals: btcIs0 ? 6 : 8, days: DAYS };
}

// ── processes ───────────────────────────────────────────────────────────────
function runStep(name: string, script: string, args: string[], timeoutMin: number, extraEnv: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', script, ...args], { cwd: ROOT, env: { ...process.env, ...extraEnv }, shell: process.platform === 'win32', stdio: 'inherit' });
    const killer = setTimeout(() => {
      log(`✗ ${name}: TIMEOUT ${timeoutMin} min — killing (fetch is resumable)`);
      if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
      else child.kill('SIGKILL');
    }, timeoutMin * 60_000);
    child.on('close', (code) => { clearTimeout(killer); resolve(code ?? 1); });
  });
}

function pipelineRunning(): boolean {
  if (fs.existsSync(PIPELINE_LOCK)) return true;
  if (!fs.existsSync(PIPELINE_LOG)) return false;
  const tail = fs.readFileSync(PIPELINE_LOG, 'utf8').split('\n').slice(-400);
  let start: number | null = null, end: number | null = null;
  for (const l of tail) {
    const ts = Date.parse(l.slice(0, 24));
    if (!Number.isFinite(ts)) continue;
    if (/PIPELINE START/.test(l)) start = ts;
    if (/PIPELINE KONIEC/.test(l)) end = ts; // PARSING CONTRACT: 'PIPELINE KONIEC' (= "PIPELINE END") is written by scripts/pipeline.ts — migrate both sides together
  }
  return start !== null && (end === null || end < start) && Date.now() - start < 3 * 3600e3;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitForPipeline() {
  let warned = false;
  while (pipelineRunning()) {
    if (!warned) { log('nightly pipeline in progress — pausing (checking every 5 min)'); warned = true; }
    await sleep(5 * 60_000);
  }
}

function cacheComplete(id: string): boolean {
  const meta = readJson(path.join(CACHE_DIR, `${id}.meta.json`));
  const st = readJson(path.join(CACHE_DIR, `${id}.state.json`));
  return !!meta && !!st && typeof meta.latest === 'number' && typeof st.nextBlock === 'number' && st.nextBlock >= meta.latest;
}

function harvest(it: QItem, w: { w: number; narrow: number | null }): any | null {
  const j = readJson(path.join(RESULTS_DIR, `walkforward-${it.id}-${WINDOW_D}d.json`));
  if (!j?.summary) return null;
  const pick = (re: RegExp) => { const k = Object.keys(j.summary).find((n) => re.test(n)); return k ? { name: k, ...j.summary[k] } : null; };
  const wPct = (w.w * 100).toFixed(0);
  return {
    id: it.id, chain: it.chain, symbol: it.symbol, feeTier: it.feeTier, cls: it.cls, widthPct: w.w * 100,
    windows: j.windows, windowDays: j.windowDays, stepDays: j.stepDays, regimeCounts: j.regimeCounts,
    // PARSING CONTRACT: strategy names 'Pasywny ±N%' (= "Passive") and 'FlatOnly wąski' (= "narrow") come from backtest/strategies.ts — keep the regexes in sync with it
    passive: pick(new RegExp(`^Pasywny ±${wPct}%$`)),
    hybrid: w.narrow ? pick(/^FlatOnly wąski/) : null,
    hodlByRegime: j.hodlByRegime ?? null,
    computedAt: new Date().toISOString(),
  };
}

// ── main ────────────────────────────────────────────────────────────────────
(async () => {
  const dryRun = flag('--dry-run'), one = flag('--one'), refresh = flag('--refresh');
  const perClass = Number(arg('--per-class', '8'));
  const maxMin = Number(arg('--max-minutes', '0'));
  const t0 = Date.now();

  fs.mkdirSync(BOT, { recursive: true });
  if (fs.existsSync(LOCK_PATH)) {
    const age = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
    if (age < 12 * 3600e3) { log(`lock ${LOCK_PATH} (${(age / 60000).toFixed(0)} min) — another instance is running, exiting`); process.exit(0); }
    log('lock older than 12h — taking over');
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));
  const unlock = () => { try { fs.unlinkSync(LOCK_PATH); } catch { /* */ } };
  process.on('exit', unlock); process.on('SIGINT', () => { unlock(); process.exit(130); });

  const q = buildQueue(perClass);
  // BTC/USD references first, when any pool needs them
  const needRef = new Set(q.items.filter((i) => !i.isRef && i.status !== 'done' && i.status !== 'unmapped').map((i) => i.chain));
  for (const chain of needRef) {
    const ref = BTC_USD_REF[chain];
    if (!ref || q.items.some((i) => i.key === `ref:${ref.id}`)) continue;
    q.items.unshift({ key: `ref:${ref.id}`, id: ref.id, chain, symbol: `${ref.btcSym}-USDC`, feeTier: `${ref.feeBps / 10000}%`, cls: 'ref', score: null, t0: ref.btc, t1: ref.usdc, status: 'pending', addedAt: new Date().toISOString(), isRef: true });
  }
  saveQueue(q);
  const counts: Record<string, number> = {};
  for (const i of q.items) counts[i.status] = (counts[i.status] ?? 0) + 1;
  log(`queue: ${q.items.length} pools (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}) · source ${q.sourceFile}`);
  if (dryRun) {
    for (const i of q.items) log(`  ${i.status.padEnd(9)} ${i.cls.padEnd(13)} ${i.chain.padEnd(8)} ${i.symbol} ${i.feeTier} score ${i.score}`);
    process.exit(0);
  }

  const out: Record<string, any> = readJson(OUT_PATH) ?? {};
  // refs first, then by score descending; skip done (unless --refresh) / unmapped
  const todo = q.items
    .filter((i) => i.status !== 'unmapped' && (refresh || i.status !== 'done'))
    .sort((a, b) => (a.isRef ? -1 : 0) - (b.isRef ? -1 : 0) || (b.score ?? -1e9) - (a.score ?? -1e9));

  for (const it of todo) {
    if (maxMin && Date.now() - t0 > maxMin * 60_000) { log(`budget of ${maxMin} min exhausted — stopping`); break; }
    await waitForPipeline();
    log(`=== ${it.symbol} ${it.feeTier} @ ${it.chain} [${it.cls}] score ${it.score} → ${it.id} ===`);
    it.attempts = (it.attempts ?? 0) + 1; it.updatedAt = new Date().toISOString();
    // 1. mapping
    if (!it.cfgPath || !fs.existsSync(path.join(ROOT, it.cfgPath))) {
      try {
        const m = it.isRef ? { cfg: await refCfg(it.chain) } : await mapItem(it);
        if ('unmapped' in m) { it.status = 'unmapped'; it.note = m.unmapped; log(`✗ unmapped: ${m.unmapped}`); saveQueue(q); continue; }
        // the BTC/USD ref required by this pool must already be fetched
        if (m.cfg.quoteRefId?.startsWith('ref-') && !cacheComplete(m.cfg.quoteRefId)) {
          it.note = `waiting for reference ${m.cfg.quoteRefId}`; log(`⏸ ${it.note}`); saveQueue(q); continue;
        }
        fs.mkdirSync(CFG_DIR, { recursive: true });
        const p = path.join(CFG_DIR, `${m.cfg.id}.cfg.json`);
        fs.writeFileSync(p, JSON.stringify(m.cfg, null, 2));
        it.cfgPath = path.relative(ROOT, p); it.status = 'mapped'; it.note = `pool ${m.cfg.address}`;
        log(`mapped → ${m.cfg.address}${m.cfg.quoteRefId ? ` (ref ${m.cfg.quoteRefId})` : ''}`);
      } catch (e) { it.status = 'failed'; it.note = `mapping: ${String(e).slice(0, 140)}`; log(`✗ ${it.note}`); saveQueue(q); continue; }
      saveQueue(q);
    }
    // 2. 720d fetch (resumable)
    if (!cacheComplete(it.id)) {
      const code = await runStep(`fetch-${it.id}`, 'scripts/fetch-swaps-hypersync.ts', ['--cfg', it.cfgPath!], FETCH_TIMEOUT_MIN);
      if (code !== 0 || !cacheComplete(it.id)) { it.status = 'failed'; it.note = `fetch exit ${code} (resumable — will retry in the next run)`; log(`✗ ${it.note}`); saveQueue(q); if (one) break; continue; }
    }
    it.status = 'fetched'; it.updatedAt = new Date().toISOString(); saveQueue(q);
    if (it.isRef) { it.status = 'done'; saveQueue(q); log(`✓ reference ${it.id} ready`); continue; }
    // 3. walkforward WF_SET=wide (class width)
    const w = CLASS_W[it.cls];
    await waitForPipeline();
    const code = await runStep(`walkforward-${it.id}`, 'backtest/walkforward.ts', [it.id, String(WINDOW_D), String(STEP_D)], WF_TIMEOUT_MIN, {
      WF_SET: 'wide', WIDE_W: String(w.w), WIDE_NARROW: w.narrow ? String(w.narrow) : '', SIGMA_MODE: 'grid15',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=8192`.trim(),
    });
    const h = code === 0 ? harvest(it, w) : null;
    if (!h) { it.status = 'failed'; it.note = `walkforward exit ${code}`; log(`✗ ${it.note}`); saveQueue(q); if (one) break; continue; }
    out[it.key] = h;
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 1));
    it.status = 'done'; it.note = `passive ±${w.w * 100}%: mean ${h.passive?.mean?.toFixed(2)} / win ${h.passive?.winPct?.toFixed(0)}% / worst ${h.passive?.worst?.toFixed(2)}`;
    log(`✓ ${it.note}`);
    saveQueue(q);
    if (one) break;
  }
  log(`done: ${Object.keys(out).length} pools with a full run in ${path.relative(ROOT, OUT_PATH)}`);
  unlock();
})();
