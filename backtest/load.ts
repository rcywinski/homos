/**
 * load.ts — SHARED swap-cache loader for run/walkforward/sweep
 * (previously three duplicated copies of loadPool; one source of truth here).
 *
 * NEW: support for WETH-quoted pairs (quote:'WETH'), e.g. cbBTC/WETH,
 * WTAO/WETH. The engine assumed an ETH/stable pair (non-ETH leg = $1) —
 * for WETH pairs that produced nonsensical units (see CONTEXT
 * 2026-08-11). Fix: the USD-per-WETH price is taken PER BLOCK from a parallel
 * USDC/WETH cache on THE SAME chain (same block numbers — join by block,
 * step-function sampled every SAMPLE_EVERY swaps).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { SwapEv, PoolSpec } from './engine';

const CACHE = path.join(__dirname, '..', 'data', 'cache');
export const TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };
export const GAS_USD: Record<string, number> = { mainnet: 8, base: 0.08, arbitrum: 0.1, optimism: 0.05 };

/** WETH-quoted pools → id of the reference USDC/WETH cache on the same chain */
export const QUOTE_WETH_REF: Record<string, string> = {
  'base-cbbtc-weth-005': 'base-weth-usdc-030',
  'base-cbbtc-weth-005-365d': 'base-weth-usdc-030-365d',
  'base-cbbtc-weth-005-720d': 'base-weth-usdc-030-720d', // 720d experiment (25.08)
  'mainnet-wtao-weth-100': 'mainnet-usdc-weth-005',
  'mainnet-wsteth-weth-001': 'mainnet-usdc-weth-005-365d', // F.B: LST, token1=WETH
};

/** QUOTE_REF (20.08): pools quoted in an asset OTHER than WETH/stable (e.g.
 *  tbtc-wbtc → USD-per-WBTC). Engine-wise identical to quote:'WETH' — spec.quote
 *  really means "quote leg priced by an external USD reference".
 *  `assetIsToken0`: whether the priced asset is token0 IN THE REFERENCE POOL —
 *  explicit, because the reference's cfg.ethIsToken0 speaks about ETH, not our
 *  asset (wbtc-usdc-030 has ethIsToken0:false, while WBTC IS token0). */
export const QUOTE_REF_EXT: Record<string, { ref: string; assetIsToken0: boolean }> = {
  // token0=tBTC(d18), token1=WBTC(d8) → quote asset WBTC = token1 (spec.ethIsToken0:false from cfg ✓)
  'mainnet-tbtc-wbtc-001': { ref: 'mainnet-wbtc-usdc-030', assetIsToken0: true },
};

const SAMPLE_EVERY = 100; // sampling of the reference series (every N-th swap)

/** step-function USD-per-<asset> by block, from the <asset>/stable pair cache.
 *  `assetIsToken0` — explicit orientation override (default cfg.ethIsToken0,
 *  correct for USDC/WETH references; for other assets pass explicitly). */
async function loadUsdRef(refId: string, assetIsToken0?: boolean): Promise<(b: number) => number> {
  const metaPath = path.join(CACHE, `${refId}.meta.json`);
  const dataPath = path.join(CACHE, `${refId}.ndjson`);
  if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) {
    throw new Error(`Missing reference cache ${refId} (needed for USD pricing of a WETH-quoted pair)`);
  }
  const cfg = JSON.parse(fs.readFileSync(metaPath, 'utf8')).cfg;
  const blocks: number[] = [];
  const prices: number[] = [];
  let i = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(dataPath) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (i++ % SAMPLE_EVERY !== 0) continue;
    const j = JSON.parse(line);
    const sqrtP = Number(BigInt(j.sp)) / 2 ** 96;
    const p = sqrtP * sqrtP * 10 ** (cfg.token0Decimals - cfg.token1Decimals); // token1/token0 human
    const usd = (assetIsToken0 ?? cfg.ethIsToken0) ? p : 1 / p;
    blocks.push(j.b);
    prices.push(usd);
  }
  if (!blocks.length) throw new Error(`Reference cache ${refId} is empty`);
  // note: the append-only ndjson is sorted by block (fetch goes ascending)
  return (b: number): number => {
    // binary search: last sample with block ≤ b (before the range → the first one)
    let lo = 0;
    let hi = blocks.length - 1;
    if (b <= blocks[0]) return prices[0];
    if (b >= blocks[hi]) return prices[hi];
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (blocks[mid] <= b) lo = mid;
      else hi = mid;
    }
    return prices[lo];
  };
}

/** perp funding (F4): step-function ts(sec) → rate per 8h period (Binance).
 *  Convention: r > 0 → the short RECEIVES funding. */
export function loadFunding(symbol = 'ETHUSDT'): ((tsSec: number) => number) | null {
  const p = path.join(__dirname, '..', 'data', 'funding', `${symbol}.json`);
  if (!fs.existsSync(p)) return null;
  const arr = JSON.parse(fs.readFileSync(p, 'utf8')) as Array<{ t: number; r: number }>;
  if (!arr.length) return null;
  const ts = arr.map((x) => x.t / 1000);
  const rs = arr.map((x) => x.r);
  return (tsSec: number): number => {
    if (tsSec <= ts[0]) return rs[0];
    if (tsSec >= ts[ts.length - 1]) return rs[rs.length - 1];
    let lo = 0;
    let hi = ts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] <= tsSec) lo = mid;
      else hi = mid;
    }
    return rs[lo];
  };
}

export async function loadPool(id: string): Promise<{ swaps: SwapEv[]; spec: PoolSpec } | null> {
  const metaPath = path.join(CACHE, `${id}.meta.json`);
  const dataPath = path.join(CACHE, `${id}.ndjson`);
  if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const cfg = meta.cfg;
  const anchors: Array<{ block: number; ts: number }> = meta.anchors;

  const tsForBlock = (b: number): number => {
    let i = 0;
    while (i < anchors.length - 2 && anchors[i + 1].block < b) i++;
    const a = anchors[i];
    const c = anchors[i + 1];
    return a.ts + ((b - a.block) / (c.block - a.block)) * (c.ts - a.ts);
  };

  const spec: PoolSpec = {
    id,
    feeRate: cfg.feeBps / 1_000_000,
    ethIsToken0: cfg.ethIsToken0,
    d0: cfg.token0Decimals,
    d1: cfg.token1Decimals,
    tickSpacing: TICK_SPACING[cfg.feeBps],
    gasUsdPerRebalance: GAS_USD[cfg.chain],
    slippageBps: 5,
  };

  if (QUOTE_WETH_REF[id]) {
    spec.quote = 'WETH';
    spec.usdPerEth = await loadUsdRef(QUOTE_WETH_REF[id]);
  } else if (QUOTE_REF_EXT[id]) {
    // engine-wise the same as quote:'WETH' — external USD reference for the quote leg
    spec.quote = 'WETH';
    spec.usdPerEth = await loadUsdRef(QUOTE_REF_EXT[id].ref, QUOTE_REF_EXT[id].assetIsToken0);
  } else if (cfg.quoteRefId) {
    // DYNAMIC reference from meta.cfg (auto-funnel candidates: candidate-funnel
    // writes quoteRefId into cfg, fetch-swaps-hypersync carries it into meta.json) —
    // the static maps above do not know `cand-*` ids. Refs are USDC/WETH, so the
    // default orientation (the reference's cfg.ethIsToken0) is correct.
    // 02.09 (wide-collect): `quoteRefAssetIsToken0` = explicit orientation of a
    // reference other than USDC/WETH (e.g. BTC/USDC, where BTC may be token0).
    spec.quote = 'WETH';
    spec.usdPerEth = await loadUsdRef(cfg.quoteRefId, cfg.quoteRefAssetIsToken0);
  }

  const swaps: SwapEv[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(dataPath) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    swaps.push({
      b: j.b,
      ts: tsForBlock(j.b),
      a0: Number(BigInt(j.a0)) / 10 ** spec.d0,
      a1: Number(BigInt(j.a1)) / 10 ** spec.d1,
      sqrtP: Number(BigInt(j.sp)) / 2 ** 96,
      L: Number(BigInt(j.L)),
      t: j.t,
    });
  }
  swaps.sort((a, b) => a.b - b.b);
  // dedup (resume can duplicate the last chunk) — PER BLOCK, not with a global
  // Set: the key of the original Set started with the block number anyway,
  // so the semantics are identical, while the global Set crashed with RangeError
  // "Set maximum size exceeded" at >16.7M entries (V8 limit; first case:
  // arbitrum-weth-usdc-005-720d, 25.6M swaps — CC-Win 25.08).
  // The Set is reset at the block boundary → memory O(swaps per block), event
  // order within a block untouched (the sort is stable).
  const dedup: SwapEv[] = [];
  let blockSeen = new Set<string>();
  let curBlock = -1;
  for (const s of swaps) {
    if (s.b !== curBlock) {
      curBlock = s.b;
      blockSeen = new Set();
    }
    const k = `${s.a0}-${s.a1}-${s.t}`;
    if (blockSeen.has(k)) continue;
    blockSeen.add(k);
    dedup.push(s);
  }
  // PROBE-SWAP FILTER (17.08, after the WETH-USDT 0.01% anomaly: probes through
  // empty ticks ±13–20k ticks away from the market fired a false trend signal
  // and the strategy "exited" at an absurd price → −100%). We drop events
  // deviating > 1000 ticks (~10.5%) from the rolling median of 201 swaps — real
  // moves (even flash crashes) do not jump 10% within ~200 swaps on the pools we
  // analyze; for deep pools the filter is a no-op (verified: mainnet-030 results
  // identical). pegged.ts has its own, stricter one (300).
  const OUTLIER_TICKS = 1000;
  const W = 201;
  const win: number[] = [];
  const sortedW: number[] = [];
  const ins = (v: number) => {
    let lo = 0, hi = sortedW.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sortedW[m] < v) lo = m + 1; else hi = m; }
    sortedW.splice(lo, 0, v);
  };
  const del = (v: number) => {
    let lo = 0, hi = sortedW.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sortedW[m] < v) lo = m + 1; else hi = m; }
    sortedW.splice(lo, 1);
  };
  const filtered: SwapEv[] = [];
  let dropped = 0;
  for (const s of dedup) {
    if (win.length >= 50 && Math.abs(s.t - sortedW[sortedW.length >> 1]) > OUTLIER_TICKS) {
      dropped++;
      continue;
    }
    filtered.push(s);
    win.push(s.t);
    ins(s.t);
    if (win.length > W) del(win.shift()!);
  }
  if (dropped) console.log(`[${id}] probe-swap filter: dropped ${dropped} (${((dropped / dedup.length) * 100).toFixed(4)}%)`);
  return { swaps: filtered, spec };
}
