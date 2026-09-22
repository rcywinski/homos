/**
 * engine.ts — Uniswap v3 LP position simulator, swap by swap.
 *
 * PRECISION CONVENTION: the simulator computes in float (double, ~15 digits) —
 * enough for COMPARING strategies. But sqrt(price) for ticks is taken from the
 * exact v3math (bigint → Number, 1 ulp error), so position geometry is
 * identical to production. The production engine (bot) remains bigint-only.
 *
 * KNOWN APPROXIMATIONS (deliberate, to be sharpened in v2):
 *  - fee accrual uses the tick AFTER the swap (a swap crossing a range boundary
 *    is credited in full or not at all) — the error shrinks with swap count;
 *  - our fee share = L/(L_pool + L); we assume our liquidity does not change
 *    the price path (true at $5-25k in $5M+ pools);
 *  - swap cost on rebalance = pool fee tier + slippageBps on turnover.
 */
import { getSqrtRatioAtTick, MIN_TICK, MAX_TICK } from '../src/utils/v3math';

export interface SwapEv {
  b: number; // block
  ts: number; // unix (interpolated from anchors)
  a0: number; // amount0 (human units, sign: >0 = flowed into the pool)
  a1: number;
  sqrtP: number; // sqrt(raw price) — no decimals correction
  L: number; // active pool liquidity (raw)
  t: number; // tick after the swap
}

export interface PoolSpec {
  id: string;
  feeRate: number; // 0.0005 for 0.05%
  ethIsToken0: boolean;
  d0: number;
  d1: number;
  tickSpacing: number;
  gasUsdPerRebalance: number; // full cycle: burn+collect+swap+mint
  slippageBps: number; // extra turnover cost on rebalance
  /** pair quote: 'USD' (default, stable leg=$1) or 'WETH' (e.g. cbBTC/WETH) */
  quote?: 'USD' | 'WETH';
  /** for quote:'WETH': USD per 1 WETH by block (step-function from the reference cache) */
  usdPerEth?: (block: number) => number;
  /** internal: current usdPerEth value, updated per event by runStrategy */
  usdPerEthNow?: number;
}

/** sqrt(raw) for a tick — from the exact v3math */
export const tickSqrt = (tick: number): number => Number(getSqrtRatioAtTick(tick)) / 2 ** 96;

/** human price token1/token0 from raw sqrt */
export const humanP = (sqrtP: number, spec: PoolSpec) => sqrtP * sqrtP * 10 ** (spec.d0 - spec.d1);

/** ETH price in USD according to pool orientation (ETH/stable pair) */
export const ethUsd = (sqrtP: number, spec: PoolSpec) => {
  const p = humanP(sqrtP, spec);
  return spec.ethIsToken0 ? p : 1 / p;
};

/** unit prices of token0/token1 in USD.
 *  - quote 'USD' (default): ETH/stable pair, stable leg = $1;
 *  - quote 'WETH' (e.g. cbBTC/WETH): USD-per-WETH from an external reference
 *    (spec.usdPerEthNow, updated per event by runStrategy). */
export const unitPrices = (sqrtP: number, spec: PoolSpec): { px0: number; px1: number } => {
  if (spec.quote === 'WETH') {
    const E = spec.usdPerEthNow;
    if (E === undefined) throw new Error(`${spec.id}: quote WETH without usdPerEthNow — no USD reference`);
    const p = humanP(sqrtP, spec); // token1 per token0
    // WETH is token0 → px1 = USD/token1 = (USD/WETH)/(token1/WETH) = E/p
    // WETH is token1 → px0 = USD/token0 = (WETH/token0)x(USD/WETH) = pxE
    return spec.ethIsToken0 ? { px0: E, px1: E / p } : { px0: p * E, px1: E };
  }
  const E = ethUsd(sqrtP, spec);
  return spec.ethIsToken0 ? { px0: E, px1: 1 } : { px0: 1, px1: E };
};

/** token amounts (human units) for liquidity L_raw in range [lo,hi] at sqrtP */
export function amountsForL(
  Lraw: number,
  lo: number,
  hi: number,
  sqrtP: number,
  spec: PoolSpec
): { a0: number; a1: number } {
  const sa = tickSqrt(lo);
  const sb = tickSqrt(hi);
  const sp = Math.min(Math.max(sqrtP, sa), sb);
  const raw0 = Lraw * ((sb - sp) / (sp * sb));
  const raw1 = Lraw * (sp - sa);
  return { a0: raw0 / 10 ** spec.d0, a1: raw1 / 10 ** spec.d1 };
}

/** maximum L_raw attainable from the budget (a0,a1 human) in range [lo,hi] */
export function liquidityForBudget(
  a0: number,
  a1: number,
  lo: number,
  hi: number,
  sqrtP: number,
  spec: PoolSpec
): number {
  const sa = tickSqrt(lo);
  const sb = tickSqrt(hi);
  const sp = Math.min(Math.max(sqrtP, sa), sb);
  const raw0 = a0 * 10 ** spec.d0;
  const raw1 = a1 * 10 ** spec.d1;
  const L0 = sp < sb ? raw0 * ((sp * sb) / (sb - sp)) : Infinity;
  const L1 = sp > sa ? raw1 / (sp - sa) : Infinity;
  return Math.min(L0, L1);
}

export interface Position {
  L: number; // raw liquidity
  lo: number;
  hi: number;
  fees0: number; // human units, uncollected
  fees1: number;
}

export interface PortfolioState {
  cash0: number; // human units outside the position
  cash1: number;
  pos: Position | null;
  // statistics
  feesUsd: number;
  gasUsd: number;
  swapCostUsd: number;
  rebalances: number;
}

export interface Ctx {
  spec: PoolSpec;
  state: PortfolioState;
  ev: SwapEv;
  /** EWMA of daily volatility of ETH price log-returns */
  volDaily: number;
  /** trailing: pool fee volume / value of active liquidity (estimated daily yield) */
  poolFeeYieldDaily: number;
  valueUsd(): number;
  /** close the position to cash (no gas cost — it is a component of rebalance) */
  closePosition(): void;
  /** open a position with ALL available cash in range [lo,hi]; auto-swap to the target ratio */
  openPosition(lo: number, hi: number): void;
  /** full rebalance = close + open + gas costs */
  rebalance(lo: number, hi: number): void;
  /** even out cash to 50/50 USD (used by HODL at start) */
  toHalfHalf(): void;
  alignTick(tick: number): number;
}

export interface Strategy {
  name: string;
  init?(ctx: Ctx): void;
  onEvent(ctx: Ctx): void;
}

export interface RunResult {
  name: string;
  finalUsd: number;
  startUsd: number;
  aprPct: number;
  vsHodlPct: number; // filled in by the runner after the HODL run
  maxDrawdownPct: number;
  feesUsd: number;
  gasUsd: number;
  swapCostUsd: number;
  rebalances: number;
  inRangePct: number;
  equity: Array<{ ts: number; usd: number; eth: number }>; // equity curve (sampled)
}

export function runStrategy(
  swaps: SwapEv[],
  spec: PoolSpec,
  strategy: Strategy,
  startCapitalUsd: number
): RunResult {
  const s0 = swaps[0];
  // USD reference for WETH-quoted pairs: set BEFORE the first unitPrices
  const updateUsdRef = (b: number) => {
    if (spec.quote === 'WETH') {
      if (!spec.usdPerEth) throw new Error(`${spec.id}: quote WETH requires spec.usdPerEth`);
      spec.usdPerEthNow = spec.usdPerEth(b);
    }
  };
  updateUsdRef(s0.b);
  const px = unitPrices(s0.sqrtP, spec);
  const state: PortfolioState = {
    // start: 50/50 USD in both tokens
    cash0: (startCapitalUsd / 2) / px.px0,
    cash1: (startCapitalUsd / 2) / px.px1,
    pos: null,
    feesUsd: 0,
    gasUsd: 0,
    swapCostUsd: 0,
    rebalances: 0,
  };

  let volDaily = 0.03; // starting prior 3%/day
  // --- σ on a 15-min grid (TASKS-RECAL §1, review decision of 26.08) ---
  // The swap-by-swap estimator measures pool microstructure, not asset
  // volatility (CONTEXT/DECISIONS 11: same ETH, same day, σ spread of 4.5x
  // between pools; on a time grid 1.4x). Mode 'grid15': return computed
  // between CLOSING PRICES of 15-min buckets, EMA as before (HL 12h).
  // Default 'swap' = behaviour before the change — v1.2 frozen; recalibration
  // runs are launched with SIGMA_MODE=grid15 (env), and switching the default
  // = Rafal's decision after the batch + an algoVersion bump.
  const SIGMA_GRID15 = process.env.SIGMA_MODE === 'grid15';
  const GRID_SEC = 900;
  let gridCurBucket = -1; // bucket we are currently in
  let gridCurLast = 0; // last price seen in the current bucket
  let gridCloseP = 0; // closing price of the previous closed bucket
  let gridCloseBucket = -1;
  let lastTs = s0.ts;
  let lastP = ethUsd(s0.sqrtP, spec);
  let prevTick = s0.t; // tick before the current swap (for the fee path)
  let prevL = s0.L; // pool L before the current swap (conservative share)
  // trailing pool yield (fee/active liquidity) — daily EWMA
  let poolFeeYieldDaily = 0;
  let inRangeEvents = 0;
  let posEvents = 0;

  const mkCtx = (ev: SwapEv): Ctx => ({
    spec,
    state,
    ev,
    volDaily,
    poolFeeYieldDaily,
    valueUsd: () => {
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      let v = state.cash0 * px0 + state.cash1 * px1;
      if (state.pos) {
        const a = amountsForL(state.pos.L, state.pos.lo, state.pos.hi, ev.sqrtP, spec);
        v += (a.a0 + state.pos.fees0) * px0 + (a.a1 + state.pos.fees1) * px1;
      }
      return v;
    },
    closePosition: () => {
      if (!state.pos) return;
      const a = amountsForL(state.pos.L, state.pos.lo, state.pos.hi, ev.sqrtP, spec);
      state.cash0 += a.a0 + state.pos.fees0;
      state.cash1 += a.a1 + state.pos.fees1;
      state.pos = null;
    },
    openPosition: (lo: number, hi: number) => {
      if (state.pos) throw new Error('position already open');
      // clamp to the v3 domain (fix 26.08 after the crash "Tick out of bounds: -887332"
      // on cand-base-weth-cbbtc-030-720d): anomalous ticks from the early life of
      // a pool can push the range beyond MIN/MAX_TICK — v3math throws on purpose
      // (it must be bit-exact with Uniswap), so we guard the bounds here.
      lo = Math.max(lo, MIN_TICK);
      hi = Math.min(hi, MAX_TICK);
      if (hi <= lo) hi = Math.min(lo + spec.tickSpacing, MAX_TICK);
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      const totalUsd = state.cash0 * px0 + state.cash1 * px1;
      // target proportions for the range
      const unit = amountsForL(1e18, lo, hi, ev.sqrtP, spec);
      const unitUsd = unit.a0 * px0 + unit.a1 * px1;
      const Ltarget = (totalUsd / unitUsd) * 1e18;
      let need0 = (Ltarget / 1e18) * unit.a0;
      let need1 = (Ltarget / 1e18) * unit.a1;
      // swap cost: turnover |delta| from current cash to the target proportions
      const delta0 = need0 - state.cash0; // >0 = we must buy token0
      const turnoverUsd = Math.abs(delta0) * px0;
      const costUsd = turnoverUsd * (spec.feeRate + spec.slippageBps / 10_000);
      state.swapCostUsd += costUsd;
      // the cost is taken proportionally from both sides (simplification)
      const eff = Math.max(totalUsd - costUsd, 0) / totalUsd;
      need0 *= eff;
      need1 *= eff;
      const L = liquidityForBudget(need0, need1, lo, hi, ev.sqrtP, spec);
      state.pos = { L, lo, hi, fees0: 0, fees1: 0 };
      state.cash0 = 0;
      state.cash1 = 0;
    },
    rebalance: (lo: number, hi: number) => {
      const c = mkCtx(ev);
      c.closePosition();
      state.gasUsd += spec.gasUsdPerRebalance;
      // gas paid "from outside"? NO — honestly: from capital (preferably in the stable token)
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      const gasInToken0 = spec.gasUsdPerRebalance / px0;
      if (state.cash0 >= gasInToken0) state.cash0 -= gasInToken0;
      else state.cash1 -= spec.gasUsdPerRebalance / px1;
      c.openPosition(lo, hi);
      state.rebalances++;
    },
    toHalfHalf: () => {
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      const total = state.cash0 * px0 + state.cash1 * px1;
      state.cash0 = total / 2 / px0;
      state.cash1 = total / 2 / px1;
    },
    alignTick: (tick: number) => Math.round(tick / spec.tickSpacing) * spec.tickSpacing,
  });

  // init
  strategy.init?.(mkCtx(s0));
  const startUsd = mkCtx(s0).valueUsd();

  const equity: RunResult['equity'] = [];
  let peak = startUsd;
  let maxDD = 0;
  let lastSampleTs = 0;

  for (const ev of swaps) {
    updateUsdRef(ev.b);
    // 1. volatility update (EWMA on log-returns, half-life ~12h)
    // Note for quote:'WETH': P is the RELATIVE price of the pair (not USD) — the
    // right one for vol/ranges/IL; USD valuation goes exclusively through unitPrices.
    const P = ethUsd(ev.sqrtP, spec);
    const dt = Math.max(ev.ts - lastTs, 1);
    if (!SIGMA_GRID15) {
      // mode 'swap' (historical): EWMA of squared swap-by-swap returns
      if (P > 0 && lastP > 0 && dt > 0) {
        const r = Math.log(P / lastP);
        const perDay = (r * r * 86400) / dt; // variance rescaled to one day
        const alpha = 1 - Math.exp(-dt / (43200 / Math.LN2));
        volDaily = Math.sqrt((1 - alpha) * volDaily * volDaily + alpha * perDay);
      }
    } else if (P > 0) {
      // mode 'grid15': return between closes of 15-min buckets
      const bucket = Math.floor(ev.ts / GRID_SEC);
      if (bucket !== gridCurBucket) {
        if (gridCurBucket >= 0 && gridCurLast > 0) {
          // bucket gridCurBucket has just closed at price gridCurLast
          if (gridCloseP > 0 && gridCloseBucket >= 0) {
            const dtg = (gridCurBucket - gridCloseBucket) * GRID_SEC;
            const r = Math.log(gridCurLast / gridCloseP);
            const perDay = (r * r * 86400) / dtg;
            const alpha = 1 - Math.exp(-dtg / (43200 / Math.LN2));
            volDaily = Math.sqrt((1 - alpha) * volDaily * volDaily + alpha * perDay);
          }
          gridCloseP = gridCurLast;
          gridCloseBucket = gridCurBucket;
        }
        gridCurBucket = bucket;
      }
      gridCurLast = P;
    }

    // 2. trailing pool fee yield: volume fees / value of active liquidity
    {
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      const feeUsd = (ev.a0 > 0 ? ev.a0 * px0 : ev.a1 * px1) * spec.feeRate;
      // value of active liquidity in a narrow band: approximation ±1 tickSpacing
      const t = ev.t;
      // clamp the band to the v3 domain (fix 26.08 — crash "Tick out of bounds":
      // a swap with a tick right at MIN/MAX_TICK gave t±spacing outside the domain)
      const act = amountsForL(
        ev.L,
        Math.max(t - spec.tickSpacing, MIN_TICK),
        Math.min(t + spec.tickSpacing, MAX_TICK),
        ev.sqrtP, spec
      );
      const actUsd = act.a0 * px0 + act.a1 * px1;
      if (actUsd > 0 && feeUsd >= 0) {
        const instDaily = (feeUsd / actUsd) * (86400 / dt);
        const alpha = 1 - Math.exp(-dt / (86400 / Math.LN2)); // half-life 1 day
        poolFeeYieldDaily = (1 - alpha) * poolFeeYieldDaily + alpha * instDaily;
      }
    }

    // 3. fee accrual for our position.
    // v2 (2026-08-11): credit proportional to the OVERLAP of the swap path
    // [prevTick, ev.t] with our range — previously a swap counted in full or
    // not at all based on the tick AFTER the swap. On ETH/stable pairs the
    // difference is cosmetic (paths short vs range); on pegged pairs the old
    // version credited entire excursions through empty ticks to wide positions
    // (fees overstated x10+).
    if (state.pos && ev.L > 0) {
      const lo = Math.min(prevTick, ev.t);
      const hi = Math.max(prevTick, ev.t);
      const pathLen = hi - lo;
      let frac = 0;
      if (pathLen === 0) {
        frac = ev.t >= state.pos.lo && ev.t < state.pos.hi ? 1 : 0;
      } else {
        const ovLo = Math.max(lo, state.pos.lo);
        const ovHi = Math.min(hi, state.pos.hi);
        frac = ovHi > ovLo ? (ovHi - ovLo) / pathLen : 0;
      }
      if (frac > 0) {
        // Lpool: 'max' (default, conservative) = max(L before, L after) —
        // an excursion through empty ticks does not get share≈1 for volume
        // executed at the peg (where L is large); 'end' (optimistic) = L after
        // the swap. The truth lies in between — env FEE_SHARE_L=end gives the
        // upper bound. On ETH/stable pairs both models give identical results
        // (L changes slowly); the difference concerns pegged pools with
        // excursions (section F).
        const Lpool = process.env.FEE_SHARE_L === 'end' ? ev.L : Math.max(ev.L, prevL);
        const share = (state.pos.L / (Lpool + state.pos.L)) * frac;
        const { px0, px1 } = unitPrices(ev.sqrtP, spec);
        if (ev.a0 > 0) {
          const f = ev.a0 * spec.feeRate * share;
          state.pos.fees0 += f;
          state.feesUsd += f * px0;
        } else if (ev.a1 > 0) {
          const f = ev.a1 * spec.feeRate * share;
          state.pos.fees1 += f;
          state.feesUsd += f * px1;
        }
        inRangeEvents++;
      }
    }
    if (state.pos) posEvents++;
    prevTick = ev.t;
    prevL = ev.L;

    // 4. strategy
    const ctx = mkCtx(ev);
    ctx.volDaily = volDaily;
    ctx.poolFeeYieldDaily = poolFeeYieldDaily;
    strategy.onEvent(ctx);

    // 5. equity sampling (every ~1h) + drawdown
    const v = ctx.valueUsd();
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
    if (ev.ts - lastSampleTs >= 3600) {
      equity.push({ ts: ev.ts, usd: v, eth: P });
      lastSampleTs = ev.ts;
    }

    lastTs = ev.ts;
    lastP = P;
  }

  const last = swaps[swaps.length - 1];
  const finalUsd = mkCtx(last).valueUsd();
  const days = (last.ts - s0.ts) / 86400;
  const aprPct = (Math.pow(finalUsd / startUsd, 365 / Math.max(days, 1)) - 1) * 100;

  return {
    name: strategy.name,
    finalUsd,
    startUsd,
    aprPct,
    vsHodlPct: 0,
    maxDrawdownPct: maxDD * 100,
    feesUsd: state.feesUsd,
    gasUsd: state.gasUsd,
    swapCostUsd: state.swapCostUsd,
    rebalances: state.rebalances,
    inRangePct: posEvents ? (inRangeEvents / posEvents) * 100 : 0,
    equity,
  };
}
