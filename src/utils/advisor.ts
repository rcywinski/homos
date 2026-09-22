/**
 * advisor.ts — the "brain" of the semi-automatic mode (Phase 3 preview).
 * Computes on on-chain data from the last hours exactly what the adaptive
 * strategy in the backtest computes (backtest/strategies.ts):
 *  - daily volatility (EWMA on log-returns from Swap events),
 *  - trailing fee-yield of the pool's active band,
 *  - suggested range: width = k · σ_daily · √(horizon days),
 *  - rebalance profitability assessment (payback of costs from expected fees).
 * Parameters (k, horizon, payback) will be calibrated with the Phase 1 backtest results.
 */
import { PublicClient, parseAbiItem, Address } from 'viem';
import { nearestUsableTick, TICK_SPACINGS, FeeAmount } from '@uniswap/v3-sdk';
import { sqrtPriceX96ToHumanPrice } from './v3math';

export const SWAP_EVENT = parseAbiItem(
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'
);

export interface RecentSwap {
  block: bigint;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
}

export interface PoolStats {
  volDaily: number; // σ of log-returns rescaled to a day
  feeYieldDaily: number; // daily fee yield of the active band (±1 spacing)
  lastTick: number;
  lastSqrtP: bigint;
  swapsAnalyzed: number;
  hoursCovered: number;
}

export interface RangeSuggestion {
  tickLower: number;
  tickUpper: number;
  widthPct: number; // half-width (±%)
  priceLower: number; // human, token1/token0
  priceUpper: number;
}

export interface RebalanceAssessment {
  action: 'IN_RANGE_HOLD' | 'REBALANCE' | 'WAIT_NOT_PROFITABLE';
  paybackDays: number | null;
  expectedDailyFeesUsd: number;
  costUsd: number;
  suggestion: RangeSuggestion;
}

export const ADVISOR_PARAMS = {
  // k=3 since ALGORITHM.md v1.1 (walk-forward 365d: k3 h24 the only positive mean+median
  // in both windows; previously 2). Correlated pairs (cbBTC/WETH): k=2 — per-pool
  // override via BotPool.advisorK (bot/config.ts), not here.
  k: 3,
  horizonDays: 7,
  maxPaybackDays: 7,
  minWidth: 0.01,
  maxWidth: 0.6,
  slippageBps: 5,
};

const BLOCK_TIME: Record<number, number> = { 1: 12, 8453: 2, 42161: 0.25, 11155111: 12 };
const GAS_USD: Record<number, number> = { 1: 8, 8453: 0.08, 42161: 0.1, 11155111: 0 };
// getLogs chunk per chain: Arbitrum has 4 blocks/s — at 1000 blocks/chunk 24h
// would require ~350 calls per cycle; public Arbitrum RPCs tolerate 10k.
const LOG_CHUNK: Record<number, bigint> = { 42161: 10_000n };

/** Fetches Swap events from the last `hours` hours (chunked getLogs). */
export async function fetchRecentSwaps(
  client: PublicClient,
  poolAddress: Address,
  chainId: number,
  hours = 24
): Promise<RecentSwap[]> {
  const latest = await client.getBlockNumber();
  const blocksBack = BigInt(Math.floor((hours * 3600) / (BLOCK_TIME[chainId] || 12)));
  const start = latest - blocksBack;
  const CHUNK = LOG_CHUNK[chainId] ?? 1000n; // public RPCs often limit getLogs to ~1-2k blocks
  const out: RecentSwap[] = [];
  for (let from = start; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    try {
      const logs = await client.getLogs({ address: poolAddress, event: SWAP_EVENT, fromBlock: from, toBlock: to });
      for (const l of logs) {
        out.push({
          block: l.blockNumber!,
          amount0: l.args.amount0!,
          amount1: l.args.amount1!,
          sqrtPriceX96: l.args.sqrtPriceX96!,
          liquidity: l.args.liquidity!,
          tick: l.args.tick!,
        });
      }
    } catch (e) {
      console.warn('advisor getLogs chunk failed', e);
    }
  }
  return out;
}

/** Pool statistics from a list of swaps (identical methodology to the backtest). */
export function computeStats(
  swaps: RecentSwap[],
  chainId: number,
  d0: number,
  d1: number,
  feeRate: number,
  tickSpacing: number
): PoolStats | null {
  if (swaps.length < 10) return null;
  const bt = BLOCK_TIME[chainId] || 12;

  // --- σ: 'grid15' mode behind the SIGMA_MODE flag (TASKS-RECAL §1, review 26.08).
  // The swap-by-swap estimator measures the pool's microstructure (DECISIONS 11: a
  // 4.5× spread on the same ETH); 'grid15' computes returns between the closes of
  // 15-min buckets (time from block deltas). Default 'swap' — production/paper
  // unchanged until the decision after the recalibration batch (algoVersion bump).
  // typeof guard: this file also ends up in the browser bundle (webpack).
  const sigmaGrid15 =
    typeof process !== 'undefined' && (process as { env?: Record<string, string | undefined> }).env?.SIGMA_MODE === 'grid15';
  const GRID_SEC = 900;
  let gridCurBucket = -1;
  let gridCurLast = 0;
  let gridCloseP = 0;
  let gridCloseBucket = -1;

  let volVar = 0.03 * 0.03;
  let feeYield = 0;
  let lastP: number | null = null;
  let lastBlock = swaps[0].block;
  const block0 = swaps[0].block;

  for (const s of swaps) {
    const p = sqrtPriceX96ToHumanPrice(s.sqrtPriceX96, d0, d1);
    const dt = Math.max(Number(s.block - lastBlock) * bt, bt);
    if (!sigmaGrid15) {
      if (lastP !== null && p > 0 && lastP > 0) {
        const r = Math.log(p / lastP);
        const perDay = (r * r * 86400) / dt;
        const a = 1 - Math.exp(-dt / (43200 / Math.LN2)); // half-life 12h
        volVar = (1 - a) * volVar + a * perDay;
      }
    } else if (p > 0) {
      const tSec = Number(s.block - block0) * bt;
      const bucket = Math.floor(tSec / GRID_SEC);
      if (bucket !== gridCurBucket) {
        if (gridCurBucket >= 0 && gridCurLast > 0) {
          if (gridCloseP > 0 && gridCloseBucket >= 0) {
            const dtg = (gridCurBucket - gridCloseBucket) * GRID_SEC;
            const r = Math.log(gridCurLast / gridCloseP);
            const perDay = (r * r * 86400) / dtg;
            const a = 1 - Math.exp(-dtg / (43200 / Math.LN2)); // half-life 12h
            volVar = (1 - a) * volVar + a * perDay;
          }
          gridCloseP = gridCurLast;
          gridCloseBucket = gridCurBucket;
        }
        gridCurBucket = bucket;
      }
      gridCurLast = p;
    }
    // fee yield of the active band ±1 spacing
    const sp = Number(s.sqrtPriceX96) / 2 ** 96;
    const spLo = sp * Math.pow(1.0001, -tickSpacing / 2);
    const spHi = sp * Math.pow(1.0001, tickSpacing / 2);
    const L = Number(s.liquidity);
    if (L > 0) {
      const raw0 = L * ((spHi - sp) / (sp * spHi));
      const raw1 = L * (sp - spLo);
      // band value in token0 (human): raw0 + raw1/p_raw, where p_raw = sp^2
      const bandTok0 = (raw0 + raw1 / (sp * sp)) / 10 ** d0;
      const feeTok0 =
        (s.amount0 > 0n ? Number(s.amount0) / 10 ** d0 : (Number(s.amount1) / 10 ** d1) / p) * feeRate;
      if (bandTok0 > 0 && feeTok0 >= 0) {
        const inst = (feeTok0 / bandTok0) * (86400 / dt);
        const a = 1 - Math.exp(-dt / (86400 / Math.LN2)); // half-life 1 day
        feeYield = (1 - a) * feeYield + a * inst;
      }
    }
    lastP = p;
    lastBlock = s.block;
  }

  const last = swaps[swaps.length - 1];
  return {
    volDaily: Math.sqrt(volVar),
    feeYieldDaily: feeYield,
    lastTick: last.tick,
    lastSqrtP: last.sqrtPriceX96,
    swapsAnalyzed: swaps.length,
    hoursCovered: (Number(last.block - swaps[0].block) * bt) / 3600,
  };
}

export function suggestRange(
  stats: PoolStats,
  feeAmount: FeeAmount,
  d0: number,
  d1: number,
  params = ADVISOR_PARAMS
): RangeSuggestion {
  const spacing = TICK_SPACINGS[feeAmount];
  const w = Math.min(Math.max(params.k * stats.volDaily * Math.sqrt(params.horizonDays), params.minWidth), params.maxWidth);
  const dTicks = Math.round(Math.log(1 + w) / Math.log(1.0001));
  let lo = nearestUsableTick(stats.lastTick - dTicks, spacing);
  let hi = nearestUsableTick(stats.lastTick + dTicks, spacing);
  if (hi <= lo) hi = lo + spacing;
  const toPrice = (t: number) => Math.pow(1.0001, t) * Math.pow(10, d0 - d1);
  return { tickLower: lo, tickUpper: hi, widthPct: w * 100, priceLower: toPrice(lo), priceUpper: toPrice(hi) };
}

/** PRODUCT 27.08 (FlatWide hybrid): a range of FIXED width ±widthPct%
 *  around the current price (idle posture = wide passive LP), instead of k×σ.
 *  The same tick math as suggestRange, with w given up front. */
export function suggestFixedRange(
  stats: PoolStats,
  feeAmount: FeeAmount,
  d0: number,
  d1: number,
  widthPct: number
): RangeSuggestion {
  const spacing = TICK_SPACINGS[feeAmount];
  const w = widthPct / 100;
  const dTicks = Math.round(Math.log(1 + w) / Math.log(1.0001));
  let lo = nearestUsableTick(stats.lastTick - dTicks, spacing);
  let hi = nearestUsableTick(stats.lastTick + dTicks, spacing);
  if (hi <= lo) hi = lo + spacing;
  const toPrice = (t: number) => Math.pow(1.0001, t) * Math.pow(10, d0 - d1);
  return { tickLower: lo, tickUpper: hi, widthPct, priceLower: toPrice(lo), priceUpper: toPrice(hi) };
}

export function assessPosition(
  pos: { tickLower: number; tickUpper: number; valueUsd: number },
  stats: PoolStats,
  chainId: number,
  feeAmount: FeeAmount,
  feeRate: number,
  d0: number,
  d1: number,
  params = ADVISOR_PARAMS,
  /** live gas cost of a full cycle in USD (review decision 26.08, DECISIONS
   *  6a): the observer supplies the value from eth_gasPrice; without it, fallback to
   *  the static GAS_USD table (UI/backtest until the recalibration batch). */
  gasUsd?: number | null
): RebalanceAssessment {
  const suggestion = suggestRange(stats, feeAmount, d0, d1, params);
  const inRange = stats.lastTick >= pos.tickLower && stats.lastTick < pos.tickUpper;

  const spacing = TICK_SPACINGS[feeAmount];
  const ourTicks = Math.max(suggestion.tickUpper - suggestion.tickLower, 2 * spacing);
  const ourYieldDaily = stats.feeYieldDaily * ((2 * spacing) / ourTicks);
  const expectedDailyFeesUsd = pos.valueUsd * ourYieldDaily;
  const costUsd = (gasUsd ?? GAS_USD[chainId] ?? 5) + pos.valueUsd * 0.5 * (feeRate + params.slippageBps / 10_000);
  const paybackDays = expectedDailyFeesUsd > 0 ? costUsd / expectedDailyFeesUsd : null;

  if (inRange) return { action: 'IN_RANGE_HOLD', paybackDays, expectedDailyFeesUsd, costUsd, suggestion };
  if (paybackDays !== null && paybackDays <= params.maxPaybackDays)
    return { action: 'REBALANCE', paybackDays, expectedDailyFeesUsd, costUsd, suggestion };
  return { action: 'WAIT_NOT_PROFITABLE', paybackDays, expectedDailyFeesUsd, costUsd, suggestion };
}
