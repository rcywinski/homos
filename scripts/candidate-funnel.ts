/**
 * candidate-funnel.ts — AUTO-FUNNEL validating selector candidates (TASKS-FUNNEL.md).
 *
 * Automates the FUNNEL (qualification → on-chain mapping → 365d fetch →
 * walkforward → gate verdict), NOT the decision: PASS lands in the brief as a
 * recommendation, BOT_POOLS is edited by a human.
 *
 *   npx tsx scripts/candidate-funnel.ts             # steady-state: 1 candidate (pipeline step 05:30)
 *   npx tsx scripts/candidate-funnel.ts --all       # BACKFILL: whole queue sequentially (manual, evenings)
 *   npx tsx scripts/candidate-funnel.ts --dry-run   # qualification + queue snapshot only, no fetch/walkforward
 *
 * Qualification (guardrails from TASKS-FUNNEL.md §2):
 *  - top10 of the ranking by 7d MEDIAN apyBase (not mean — spike-resistant)
 *    with persistence ≥3 days (selector streaks), TVL ≥ $3M, majors, uniswap-v3
 *  - OR an open OPEN proposal outside BOT_POOLS (llamaPool from proposals.json)
 *  - minus: pools in BOT_POOLS, pools with a valid verdict (current algoVersion)
 *  - age ≥180 days of llama history — younger → deferral (QUEUED with a note), not FAIL
 * Verdict: PASS = winPct ≥65 AND worst >−3 (profile by pair: ETH/stable = v1.1
 * re>EMA; BTC leg without stable = cbBTC profile k=2 clean exit). PERSISTENT write
 * to .bot/candidate-verdicts.json with algoVersion — retest only after an
 * algorithm change or manual removal of the entry.
 *
 * Mapping safety: token addresses from the local majors dictionary, pool address
 * from factory.getPool (eth_call), then a SANITY CHECK of the pool's token0()/token1()
 * vs the dictionary — mismatch = UNMAPPED, never silently wrong data. Token outside
 * the dictionary = UNMAPPED (we do not guess addresses).
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { BOT_POOLS, RPC, STATE_DIR } from '../bot/config';
import { SEED_VERDICTS } from '../bot/candidates';

const ROOT = path.join(__dirname, '..');
const LLAMA = path.join(ROOT, 'data', 'llama');
const BOT = path.join(ROOT, STATE_DIR);
const CAND_DIR = path.join(ROOT, 'data', 'candidates'); // cfg files (data/ untracked)
const RESULTS = path.join(ROOT, 'backtest', 'results');
const VERDICTS_PATH = path.join(BOT, 'candidate-verdicts.json');
const QUEUE_PATH = path.join(BOT, 'candidate-queue.json');

const ALGO_VERSION = 'v1.2'; // bump when ALGORITHM.md changes → old verdicts become invalid
const MIN_TVL = 3_000_000;
const MAJORS = /ETH|BTC|USDC|USDT|DAI|USDS/;
const CHAIN_MAP: Record<string, string> = { Ethereum: 'mainnet', Base: 'base', Arbitrum: 'arbitrum' };
const FEE_BPS: Record<string, number> = { '0.01%': 100, '0.05%': 500, '0.3%': 3000, '1%': 10000 };
const FEE_CODE: Record<number, string> = { 100: '001', 500: '005', 3000: '030', 10000: '100' };
const PERSIST_DAYS = 3;
const TOP_N = 10;
const MIN_HISTORY_D = 180;
const STEP_TIMEOUT_MIN = 60; // hard timeout for fetch and for walkforward (each separately)

// reference USD-per-WETH cache (365d) per chain — for candidates quoted in WETH
const WETH_USD_REF_365D: Record<string, string> = {
  mainnet: 'mainnet-usdc-weth-005-365d',
  base: 'base-weth-usdc-030-365d',
  arbitrum: 'arbitrum-weth-usdc-005-365d',
};

// Majors dictionary per chain: symbol → address variants (order = preference;
// USDC on Arbitrum has native and bridged). Wrong address → getPool returns 0x0 or
// token0/token1 will not match → UNMAPPED (sanity check below), not bad data.
type TokenDef = { addr: string; decimals: number };
const TOKENS: Record<string, Record<string, TokenDef[]>> = {
  mainnet: {
    WETH: [{ addr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 }],
    USDC: [{ addr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 }],
    USDT: [{ addr: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 }],
    DAI: [{ addr: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 }],
    WBTC: [{ addr: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 }],
    CBBTC: [{ addr: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 }],
    TBTC: [{ addr: '0x18084fbA666a33d37592fA2633fD49a74DD93a88', decimals: 18 }],
    WSTETH: [{ addr: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18 }],
  },
  base: {
    WETH: [{ addr: '0x4200000000000000000000000000000000000006', decimals: 18 }],
    USDC: [{ addr: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 }],
    USDT: [{ addr: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 }],
    DAI: [{ addr: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 }],
    CBBTC: [{ addr: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 }],
  },
  arbitrum: {
    WETH: [{ addr: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 }],
    USDC: [
      { addr: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 }, // native
      { addr: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 }, // USDC.e
    ],
    USDT: [{ addr: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }],
    WBTC: [{ addr: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 }],
    CBBTC: [{ addr: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 }],
  },
};
const FACTORY: Record<string, string> = {
  mainnet: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  base: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  arbitrum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
};
const STABLES = new Set(['USDC', 'USDT', 'DAI', 'USDS']);
const ETH_LIKE = new Set(['WETH']);
const ZERO_ADDR = /^0x0{40}$/i;

const log = (m: string) => console.log(`${new Date().toISOString()} funnel: ${m}`);

// --- mini eth_call with fallback over the RPC list from bot/config ---
async function ethCall(chain: string, to: string, data: string): Promise<string> {
  const urls = RPC[chain] ?? [];
  let lastErr: unknown = new Error(`no RPC for ${chain}`);
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
        signal: AbortSignal.timeout(20_000),
      });
      const j: any = await r.json();
      if (j.error) throw new Error(`${j.error.code}: ${j.error.message}`);
      if (typeof j.result === 'string') return j.result;
      throw new Error('empty response');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
const addrArg = (a: string) => a.toLowerCase().slice(2).padStart(64, '0');
const parseAddr = (res: string) => ('0x' + res.slice(-40)).toLowerCase();

// --- verdict types/IO (shape matches bot/candidates.ts CandidateVerdict) ---
type Verdict = {
  llamaPool: string; chain: string; symbol: string; feeTier: string;
  verdict: 'PASS' | 'FAIL' | 'QUEUED' | 'UNMAPPED';
  winPct?: number; worst?: number; testedAt?: string; note?: string;
  algoVersion?: string; candId?: string; poolAddress?: string; strategy?: string;
};
const readRuntimeVerdicts = (): Verdict[] => {
  try { return JSON.parse(fs.readFileSync(VERDICTS_PATH, 'utf8')); } catch { return []; }
};
function upsertVerdict(v: Verdict): void {
  const all = readRuntimeVerdicts().filter((x) => x.llamaPool !== v.llamaPool);
  all.push(v);
  fs.mkdirSync(BOT, { recursive: true });
  fs.writeFileSync(VERDICTS_PATH, JSON.stringify(all, null, 2));
  log(`verdict saved: ${v.symbol} ${v.feeTier} @ ${v.chain} → ${v.verdict}${v.winPct !== undefined ? ` (${v.winPct}% win, worst ${v.worst})` : ''}`);
}

// --- qualification ---
interface QueueItem {
  llamaPool: string; chain: string; symbol: string; feeTier: string;
  tvlUsd: number; streak: number; reason: string;
}

function median7dApy(uuid: string): { med: number | null; historyDays: number } {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(LLAMA, 'history', `${uuid}.json`), 'utf8'));
    const all: Array<{ apyBase: number | null }> = j.series || [];
    const vals = all.slice(-7).map((r) => r.apyBase).filter((v): v is number => v !== null && v !== undefined);
    if (vals.length < 5) return { med: null, historyDays: all.length };
    const s = [...vals].sort((a, b) => a - b);
    return { med: s[Math.floor(s.length / 2)], historyDays: all.length };
  } catch {
    return { med: null, historyDays: 0 };
  }
}

function inBotPools(chainLlama: string, symbol: string, feeTier: string): boolean {
  const chain = CHAIN_MAP[chainLlama];
  if (!chain) return false;
  const feeBps = FEE_BPS[feeTier.trim()];
  const syms = new Set(symbol.split('-').map((s) => s.toUpperCase()));
  return BOT_POOLS.some(
    (b: any) => b.chain === chain && b.feeBps === feeBps && syms.has(String(b.sym0).toUpperCase()) && syms.has(String(b.sym1).toUpperCase())
  );
}

function buildQueue(): { queue: QueueItem[]; deferred: QueueItem[]; universeAgeH: number } {
  const uniPath = path.join(LLAMA, 'universe.json');
  const st = fs.statSync(uniPath); // missing file = hard error (pipeline did not run)
  const universeAgeH = (Date.now() - st.mtimeMs) / 3_600_000;
  const universe: any[] = JSON.parse(fs.readFileSync(uniPath, 'utf8'));

  let streaks: Record<string, number> = {};
  try { streaks = JSON.parse(fs.readFileSync(path.join(BOT, 'selector-state.json'), 'utf8')).streaks ?? {}; } catch { /* no selector state = streak 0 */ }

  // valid verdicts (the seed lives in bot/candidates.ts, but the funnel writes only
  // runtime; for filtering we need BOTH)
  const byId = new Map<string, Verdict>();
  for (const v of SEED_VERDICTS as Verdict[]) byId.set(v.llamaPool, v);
  for (const v of readRuntimeVerdicts()) byId.set(v.llamaPool, v);
  const settled = (uuid: string): boolean => {
    const v = byId.get(uuid);
    if (!v || v.verdict === 'QUEUED') return false;
    return !v.algoVersion || v.algoVersion === ALGO_VERSION; // old algo version = invalid → retest
  };

  // open OPEN proposals outside BOT_POOLS (second qualification entry point)
  const openProposals = new Set<string>();
  try {
    const props: any[] = JSON.parse(fs.readFileSync(path.join(BOT, 'proposals.json'), 'utf8'));
    for (const p of props) if (p.kind === 'OPEN' && p.status === 'open' && !p.poolId && p.llamaPool) openProposals.add(p.llamaPool);
  } catch { /* no proposals.json (Mac / fresh server) — the entry point is simply empty */ }

  const ranked = universe
    .filter((p) => p.project === 'uniswap-v3' && CHAIN_MAP[p.chain] && p.tvlUsd >= MIN_TVL &&
      String(p.symbol).split('-').every((t: string) => MAJORS.test(t)))
    .map((p) => ({ ...p, ...median7dApy(p.pool) }))
    .filter((p) => p.med !== null)
    .sort((a, b) => b.med - a.med);

  const queue: QueueItem[] = [];
  const deferred: QueueItem[] = [];
  const seen = new Set<string>();
  const consider = (p: any, reason: string) => {
    if (seen.has(p.pool)) return;
    seen.add(p.pool);
    const feeTier = (p.poolMeta || '').trim();
    if (!FEE_BPS[feeTier]) return; // unknown tier — outside v3 scope
    if (inBotPools(p.chain, p.symbol, feeTier)) return; // already running in the bot
    if (settled(p.pool)) return; // a valid verdict exists
    const item: QueueItem = {
      llamaPool: p.pool, chain: p.chain, symbol: p.symbol, feeTier,
      tvlUsd: p.tvlUsd, streak: streaks[p.pool] || 0, reason,
    };
    if ((p.historyDays ?? 0) < MIN_HISTORY_D) {
      item.reason += ` · DEFERRED: ${p.historyDays}d of history (<${MIN_HISTORY_D})`;
      deferred.push(item);
    } else queue.push(item);
  };

  // "TOP10 GOOD ONES" (Rafal 25.08): pools rejected by verdict do not take slots —
  // we scan the ranking until TOP_N pools without FAIL/UNMAPPED are collected (so the
  // funnel also examines pools that moved into the slots of rejected ones).
  const rejected = (uuid: string): boolean => {
    const v = byId.get(uuid);
    return !!v && (v.verdict === 'FAIL' || v.verdict === 'UNMAPPED') && (!v.algoVersion || v.algoVersion === ALGO_VERSION);
  };
  let good = 0;
  for (const p of ranked) {
    if (!rejected(p.pool)) {
      good++;
      if ((streaks[p.pool] || 0) >= PERSIST_DAYS) consider(p, `top${TOP_N} good by 7d median (streak ${streaks[p.pool]})`);
    }
    if (good >= TOP_N) break;
  }
  for (const p of ranked) if (openProposals.has(p.pool)) consider(p, 'OPEN proposal outside BOT_POOLS');

  // FIFO by persistence, then TVL (TASKS-FUNNEL §2)
  queue.sort((a, b) => b.streak - a.streak || b.tvlUsd - a.tvlUsd);
  return { queue, deferred, universeAgeH };
}

// --- mapping llama → on-chain PoolCfg ---
type CandCfg = {
  id: string; chain: string; address: string; feeBps: number; ethIsToken0: boolean;
  token0Decimals: number; token1Decimals: number; days: number;
  quoteRefId?: string; // for pairs quoted in WETH — read by load.ts
};

async function mapCandidate(item: QueueItem): Promise<{ cfg: CandCfg } | { unmapped: string }> {
  const chain = CHAIN_MAP[item.chain];
  const feeBps = FEE_BPS[item.feeTier];
  const symsRaw = item.symbol.split('-').map((s) => s.toUpperCase());
  if (symsRaw.length !== 2) return { unmapped: `symbol "${item.symbol}" is not a pair` };
  const hasStable = symsRaw.some((s) => STABLES.has(s));
  const hasEthLeg = symsRaw.some((s) => ETH_LIKE.has(s));
  if (!hasStable && !hasEthLeg) return { unmapped: 'no stable or WETH leg (exotic/BTC-BTC — outside the funnel, like tbtc-wbtc)' };

  const defs = symsRaw.map((s) => TOKENS[chain]?.[s]);
  if (defs.some((d) => !d)) return { unmapped: `token outside the majors dictionary: ${symsRaw.filter((s) => !TOKENS[chain]?.[s]).join(',')} @ ${chain}` };

  // address variants (e.g. native vs bridged USDC) — the first existing pool wins
  for (const dA of defs[0]!) for (const dB of defs[1]!) {
    const [lo, hi] = [dA, dB].sort((x, y) => (x.addr.toLowerCase() < y.addr.toLowerCase() ? -1 : 1));
    const data = '0x1698ee82' + addrArg(lo.addr) + addrArg(hi.addr) + feeBps.toString(16).padStart(64, '0');
    let poolAddr: string;
    try { poolAddr = parseAddr(await ethCall(chain, FACTORY[chain], data)); } catch (e) { return { unmapped: `RPC getPool failed: ${String(e).slice(0, 100)}` }; }
    if (ZERO_ADDR.test(poolAddr)) continue;
    // SANITY: the pool's token0/token1 must match the dictionary
    let t0: string, t1: string;
    try {
      t0 = parseAddr(await ethCall(chain, poolAddr, '0x0dfe1681'));
      t1 = parseAddr(await ethCall(chain, poolAddr, '0xd21220a7'));
    } catch (e) { return { unmapped: `RPC token0/token1 failed: ${String(e).slice(0, 100)}` }; }
    if (t0 !== lo.addr.toLowerCase() || t1 !== hi.addr.toLowerCase()) {
      return { unmapped: `token sanity check of pool ${poolAddr} failed (token0/1 ≠ dictionary)` };
    }
    const symOf = (d: TokenDef) => symsRaw[defs[0]!.includes(d) ? 0 : 1];
    const sym0 = symOf(lo), sym1 = symOf(hi);
    const wethIsToken0 = ETH_LIKE.has(sym0);
    // ethIsToken0: for pairs with WETH — position of WETH (repo convention); for
    // BTC/stable without WETH — position of the asset (engine: "asset is token0")
    const ethIsToken0 = hasEthLeg ? wethIsToken0 : !STABLES.has(sym0);
    const cfg: CandCfg = {
      id: `cand-${chain}-${sym0.toLowerCase()}-${sym1.toLowerCase()}-${FEE_CODE[feeBps]}`,
      chain, address: poolAddr, feeBps, ethIsToken0,
      token0Decimals: lo.decimals, token1Decimals: hi.decimals, days: 365,
    };
    if (hasEthLeg && !hasStable) cfg.quoteRefId = WETH_USD_REF_365D[chain]; // pair quoted in WETH
    return { cfg };
  }
  return { unmapped: `factory.getPool returned 0x0 for all address variants (${item.symbol} ${item.feeTier} @ ${chain})` };
}

// --- spawn with a hard timeout (Windows: taskkill /T — shell:true creates a cmd wrapper) ---
function runStep(name: string, script: string, args: string[], extraEnv: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', script, ...args], {
      cwd: ROOT, env: { ...process.env, ...extraEnv }, shell: process.platform === 'win32', stdio: 'inherit',
    });
    const killer = setTimeout(() => {
      log(`✗ ${name}: TIMEOUT ${STEP_TIMEOUT_MIN} min — killing (fetch state is resumable)`);
      if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
      else child.kill('SIGKILL');
    }, STEP_TIMEOUT_MIN * 60_000);
    child.on('close', (code) => { clearTimeout(killer); resolve(code ?? 1); });
  });
}

// --- gate ---
function evaluateGate(candId: string, symsUpper: string[]): { verdict: 'PASS' | 'FAIL'; winPct: number; worst: number; strategy: string; windows: number } | { error: string } {
  const p = path.join(RESULTS, `walkforward-${candId}-30d.json`);
  let j: any;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { error: `missing result ${path.relative(ROOT, p)}` }; }
  const hasStable = symsUpper.some((s) => STABLES.has(s));
  // profile: ETH/stable → v1.1 (k=3, re>EMA); BTC leg without stable → cbBTC (k=2 clean exit)
  const want = hasStable ? /k=3 .*trend\(exit,.*re>ema\)/ : /k=2 .*trend\(exit,(?!.*re>ema)/;
  const name = Object.keys(j.summary ?? {}).find((k) => want.test(k));
  if (!name) return { error: `summary has no strategy for the profile (${hasStable ? 'v1.1 re>ema' : 'cbBTC k=2'}); keys: ${Object.keys(j.summary ?? {}).join(' | ')}` };
  const s = j.summary[name];
  const pass = s.winPct >= 65 && s.worst > -3;
  return { verdict: pass ? 'PASS' : 'FAIL', winPct: Math.round(s.winPct * 10) / 10, worst: Math.round(s.worst * 100) / 100, strategy: name, windows: j.windows };
}

// --- main ---
(async () => {
  const all = process.argv.includes('--all');
  const dryRun = process.argv.includes('--dry-run');
  const { queue, deferred, universeAgeH } = buildQueue();
  log(`universe.json ${universeAgeH.toFixed(1)}h · queue: ${queue.length} · deferred: ${deferred.length}`);
  if (universeAgeH > 26) log(`WARNING: universe.json >26h — qualification on stale data (dry-run/diagnostics OK, in production the pipeline should be fresh)`);
  for (const q of queue) log(`  → ${q.symbol} ${q.feeTier} @ ${q.chain} (streak ${q.streak}, TVL $${(q.tvlUsd / 1e6).toFixed(1)}M) — ${q.reason}`);
  for (const d of deferred) log(`  ⏸ ${d.symbol} ${d.feeTier} @ ${d.chain} — ${d.reason}`);

  // queue snapshot for the report/UI (ALWAYS written, even with an empty queue)
  fs.mkdirSync(BOT, { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), universeAgeH: Math.round(universeAgeH * 10) / 10, queue, deferred }, null, 2));

  // deferred: persist the note in verdicts (visibility in the UI), without taking a slot
  for (const d of deferred) {
    upsertVerdict({ llamaPool: d.llamaPool, chain: d.chain, symbol: d.symbol, feeTier: d.feeTier, verdict: 'QUEUED', note: d.reason });
  }

  if (dryRun) { log('--dry-run: done (no fetch/walkforward)'); process.exit(0); }
  if (!queue.length) { log('queue empty — nothing to validate'); process.exit(0); }

  const todo = all ? queue : queue.slice(0, 1); // steady-state: max 1/night
  let hardFail = false;
  for (const item of todo) {
    log(`=== candidate: ${item.symbol} ${item.feeTier} @ ${item.chain} ===`);
    const mapped = await mapCandidate(item);
    if ('unmapped' in mapped) {
      upsertVerdict({ llamaPool: item.llamaPool, chain: item.chain, symbol: item.symbol, feeTier: item.feeTier, verdict: 'UNMAPPED', testedAt: new Date().toISOString().slice(0, 10), note: mapped.unmapped, algoVersion: ALGO_VERSION });
      continue;
    }
    const { cfg } = mapped;
    log(`mapped: ${cfg.id} → ${cfg.address}${cfg.quoteRefId ? ` (quote WETH, ref ${cfg.quoteRefId})` : ''}`);
    fs.mkdirSync(CAND_DIR, { recursive: true });
    const cfgPath = path.join(CAND_DIR, `${cfg.id}.cfg.json`);
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

    // 365d fetch (resumable; 2 attempts within a shared time budget)
    let code = await runStep(`fetch-${cfg.id}`, 'scripts/fetch-swaps-hypersync.ts', ['--cfg', path.relative(ROOT, cfgPath)]);
    if (code !== 0) code = await runStep(`fetch-${cfg.id} (retry)`, 'scripts/fetch-swaps-hypersync.ts', ['--cfg', path.relative(ROOT, cfgPath)]);
    if (code !== 0) { log(`✗ fetch ${cfg.id} failed (exit ${code}) — candidate stays in the queue for tomorrow`); hardFail = true; continue; }

    // walkforward 22 windows 30/15, frozen v1.2, heap 8GB, set 'funnel'
    code = await runStep(`walkforward-${cfg.id}`, 'backtest/walkforward.ts', [cfg.id, '30', '15'], {
      WF_SET: 'funnel',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=8192`.trim(),
    });
    if (code !== 0) { log(`✗ walkforward ${cfg.id} failed (exit ${code}) — candidate stays in the queue`); hardFail = true; continue; }

    const gate = evaluateGate(cfg.id, item.symbol.split('-').map((s) => s.toUpperCase()));
    if ('error' in gate) { log(`✗ gate: ${gate.error}`); hardFail = true; continue; }
    upsertVerdict({
      llamaPool: item.llamaPool, chain: item.chain, symbol: item.symbol, feeTier: item.feeTier,
      verdict: gate.verdict, winPct: gate.winPct, worst: gate.worst,
      testedAt: new Date().toISOString().slice(0, 10),
      note: `auto-funnel: ${gate.windows} windows 30/15, strategy "${gate.strategy}"`,
      algoVersion: ALGO_VERSION, candId: cfg.id, poolAddress: cfg.address, strategy: gate.strategy,
    });
  }
  process.exit(hardFail ? 1 : 0);
})();
