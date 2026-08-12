/**
 * advisor.ts — "mózg" półautomatu (Faza 3 preview).
 * Liczy na danych on-chain z ostatnich godzin dokładnie to samo, co strategia
 * adaptacyjna w backteście (backtest/strategies.ts):
 *  - zmienność dzienną (EWMA na log-returnach z eventów Swap),
 *  - trailing fee-yield aktywnego pasma puli,
 *  - sugerowany zakres: szerokość = k · σ_dzienna · √(horyzont dni),
 *  - ocenę opłacalności rebalansu (payback kosztów z oczekiwanych fee).
 * Parametry (k, horyzont, payback) będą kalibrowane wynikami backtestu Fazy 1.
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
  volDaily: number; // σ log-returnów przeskalowana na dzień
  feeYieldDaily: number; // dzienny yield fee aktywnego pasma (±1 spacing)
  lastTick: number;
  lastSqrtP: bigint;
  swapsAnalyzed: number;
  hoursCovered: number;
}

export interface RangeSuggestion {
  tickLower: number;
  tickUpper: number;
  widthPct: number; // połówkowa szerokość (±%)
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
  // k=3 od ALGORITHM.md v1.1 (walk-forward 365d: k3 h24 jedyna dodatnia śr.+med.
  // w obu oknach; wcześniej 2). Pary skorelowane (cbBTC/WETH): k=2 — override
  // per pula przez BotPool.advisorK (bot/config.ts), nie tutaj.
  k: 3,
  horizonDays: 7,
  maxPaybackDays: 7,
  minWidth: 0.01,
  maxWidth: 0.6,
  slippageBps: 5,
};

const BLOCK_TIME: Record<number, number> = { 1: 12, 8453: 2, 42161: 0.25, 11155111: 12 };
const GAS_USD: Record<number, number> = { 1: 8, 8453: 0.08, 42161: 0.1, 11155111: 0 };
// chunk getLogs per chain: Arbitrum ma 4 bloki/s — przy 1000 bl./chunk 24h
// wymagałoby ~350 wywołań co cykl; publiczne RPC Arbitrum znoszą 10k.
const LOG_CHUNK: Record<number, bigint> = { 42161: 10_000n };

/** Pobiera eventy Swap z ostatnich `hours` godzin (chunkowane getLogs). */
export async function fetchRecentSwaps(
  client: PublicClient,
  poolAddress: Address,
  chainId: number,
  hours = 24
): Promise<RecentSwap[]> {
  const latest = await client.getBlockNumber();
  const blocksBack = BigInt(Math.floor((hours * 3600) / (BLOCK_TIME[chainId] || 12)));
  const start = latest - blocksBack;
  const CHUNK = LOG_CHUNK[chainId] ?? 1000n; // publiczne RPC często limitują getLogs do ~1-2k bloków
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

/** Statystyki puli z listy swapów (identyczna metodologia jak w backteście). */
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

  let volVar = 0.03 * 0.03;
  let feeYield = 0;
  let lastP: number | null = null;
  let lastBlock = swaps[0].block;

  for (const s of swaps) {
    const p = sqrtPriceX96ToHumanPrice(s.sqrtPriceX96, d0, d1);
    const dt = Math.max(Number(s.block - lastBlock) * bt, bt);
    if (lastP !== null && p > 0 && lastP > 0) {
      const r = Math.log(p / lastP);
      const perDay = (r * r * 86400) / dt;
      const a = 1 - Math.exp(-dt / (43200 / Math.LN2)); // half-life 12h
      volVar = (1 - a) * volVar + a * perDay;
    }
    // fee yield aktywnego pasma ±1 spacing
    const sp = Number(s.sqrtPriceX96) / 2 ** 96;
    const spLo = sp * Math.pow(1.0001, -tickSpacing / 2);
    const spHi = sp * Math.pow(1.0001, tickSpacing / 2);
    const L = Number(s.liquidity);
    if (L > 0) {
      const raw0 = L * ((spHi - sp) / (sp * spHi));
      const raw1 = L * (sp - spLo);
      // wartość pasma w token0 (human): raw0 + raw1/p_raw, gdzie p_raw = sp^2
      const bandTok0 = (raw0 + raw1 / (sp * sp)) / 10 ** d0;
      const feeTok0 =
        (s.amount0 > 0n ? Number(s.amount0) / 10 ** d0 : (Number(s.amount1) / 10 ** d1) / p) * feeRate;
      if (bandTok0 > 0 && feeTok0 >= 0) {
        const inst = (feeTok0 / bandTok0) * (86400 / dt);
        const a = 1 - Math.exp(-dt / (86400 / Math.LN2)); // half-life 1 dzień
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

export function assessPosition(
  pos: { tickLower: number; tickUpper: number; valueUsd: number },
  stats: PoolStats,
  chainId: number,
  feeAmount: FeeAmount,
  feeRate: number,
  d0: number,
  d1: number,
  params = ADVISOR_PARAMS
): RebalanceAssessment {
  const suggestion = suggestRange(stats, feeAmount, d0, d1, params);
  const inRange = stats.lastTick >= pos.tickLower && stats.lastTick < pos.tickUpper;

  const spacing = TICK_SPACINGS[feeAmount];
  const ourTicks = Math.max(suggestion.tickUpper - suggestion.tickLower, 2 * spacing);
  const ourYieldDaily = stats.feeYieldDaily * ((2 * spacing) / ourTicks);
  const expectedDailyFeesUsd = pos.valueUsd * ourYieldDaily;
  const costUsd = (GAS_USD[chainId] ?? 5) + pos.valueUsd * 0.5 * (feeRate + params.slippageBps / 10_000);
  const paybackDays = expectedDailyFeesUsd > 0 ? costUsd / expectedDailyFeesUsd : null;

  if (inRange) return { action: 'IN_RANGE_HOLD', paybackDays, expectedDailyFeesUsd, costUsd, suggestion };
  if (paybackDays !== null && paybackDays <= params.maxPaybackDays)
    return { action: 'REBALANCE', paybackDays, expectedDailyFeesUsd, costUsd, suggestion };
  return { action: 'WAIT_NOT_PROFITABLE', paybackDays, expectedDailyFeesUsd, costUsd, suggestion };
}
