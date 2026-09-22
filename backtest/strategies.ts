/**
 * strategies.ts — benchmarks and active strategies (PLAN.md §6 Phase 1).
 * Range prices are computed in tick space: width as a fraction of price
 * translates to ±log(1+w)/log(1.0001) ticks around the current price.
 *
 * NOTE on strategy `name` strings: they are kept verbatim (partly Polish, e.g.
 * "Pasywny" = passive, "Sztywny" = fixed, "Adaptacyjna" = adaptive, "wąski" =
 * narrow, "Wewn." = inner, "bez swapu" = no swap, "naiwny" = naive) because
 * they are DATA-CONTRACT KEYS: they end up as keys in walkforward `summary` /
 * `perWindow` JSON, are regex-matched by scripts/wide-collect.ts and
 * scripts/candidate-funnel.ts, and are passed via the STRATS env of e8-timing.ts.
 */
import { Strategy, Ctx, ethUsd, unitPrices, amountsForL } from './engine';
import { MIN_TICK as VMIN, MAX_TICK as VMAX } from '../src/utils/v3math';

const widthToTicks = (w: number) => Math.round(Math.log(1 + w) / Math.log(1.0001));

/** RANGE WITHOUT A SWAP (29.08, Rafal's idea: "can't we just add ETH?").
 *  Instead of re-posturing through the market (swap to the 50/50 proportions
 *  of a range centred on the price — cost = turnover x pool tier + slippage),
 *  we shift the range so that the REQUIRED proportions coincide with what we
 *  currently hold in the portfolio. The extreme case is a ONE-SIDED range:
 *  after ETH has been sold off we place a band of pure USDC BELOW the price —
 *  if the price comes back, the market buys ETH back for us and even pays us
 *  fees for it (a limit order that earns while waiting).
 *  The WIDTH is preserved (2w in log scale); only the centre moves.
 *  We search for the shift by bisection — an analytical solution exists, but
 *  bisection is robust to edge cases (position out of range, zero balances)
 *  and costs ~40 iterations per rebalance, i.e. nothing.
 *  NOTE: this does NOT cancel IL (we still sold lower than we will buy back) —
 *  it only removes the swap cost and lets us buy back at a price we choose
 *  ourselves instead of the market price at the moment of clicking. */
const rangeNoSwap = (ctx: Ctx, w: number): [number, number] => {
  const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
  const have0 = ctx.state.cash0 * px0;
  const have1 = ctx.state.cash1 * px1;
  const total = have0 + have1;
  if (total <= 0) return rangeAround(ctx, w);
  const wantShare0 = have0 / total; // what share of value should be in token0
  const dt = widthToTicks(w);
  // token0 share for a range shifted by `off` ticks: grows when the range
  // moves UP (more band above the price = more token0)
  const share0For = (off: number): number => {
    const lo = ctx.ev.t - dt + off;
    const hi = ctx.ev.t + dt + off;
    const sP = Math.sqrt(1.0001 ** ctx.ev.t);
    const sa = Math.sqrt(1.0001 ** lo);
    const sb = Math.sqrt(1.0001 ** hi);
    const sPc = Math.min(Math.max(sP, sa), sb);
    const a0 = 1 / sPc - 1 / sb;
    const a1 = sPc - sa;
    const v0 = a0 * (px0 * 10 ** ctx.spec.d0);
    const v1 = a1 * (px1 * 10 ** ctx.spec.d1);
    return v0 + v1 > 0 ? v0 / (v0 + v1) : 0;
  };
  let lo = -2 * dt;
  let hi = 2 * dt;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (share0For(mid) < wantShare0) lo = mid;
    else hi = mid;
  }
  const off = Math.round((lo + hi) / 2);
  let l = ctx.alignTick(ctx.ev.t - dt + off);
  let h = ctx.alignTick(ctx.ev.t + dt + off);
  if (h <= l) h = l + ctx.spec.tickSpacing;
  return [Math.max(l, VMIN + ctx.spec.tickSpacing), Math.min(h, VMAX - ctx.spec.tickSpacing)];
};

const rangeAround = (ctx: Ctx, w: number): [number, number] => {
  const dt = widthToTicks(w);
  let lo = ctx.alignTick(ctx.ev.t - dt);
  let hi = ctx.alignTick(ctx.ev.t + dt);
  if (hi <= lo) hi = lo + ctx.spec.tickSpacing;
  return [Math.max(lo, VMIN + ctx.spec.tickSpacing), Math.min(hi, VMAX - ctx.spec.tickSpacing)];
};

/** RANGE ASYMMETRIC IN PRICE (02.09, "skewed range"). MIND the convention:
 *  `rangeAround(w)` is symmetric in LOG-price, i.e. "±50%" = [P/1.5, P·1.5]
 *  = −33% down / +50% up. The live product (advisor.suggestFixedRange)
 *  computes identically — so our wide leg has HALF as much room in the
 *  direction that, per Monte Carlo (01.09), hurts the most (below the band:
 *  100% in the falling asset).
 *  Here `down`/`up` are fractions of PRICE: lo = P·(1−down), hi = P·(1+up).
 *  passiveAsym(0.5, 0.5) = true −50/+50; passiveW(0.5) ≡
 *  passiveAsym(0.333, 0.5). */
const rangeAsym = (ctx: Ctx, down: number, up: number): [number, number] => {
  const dLo = Math.round(-Math.log(1 - down) / Math.log(1.0001));
  const dHi = Math.round(Math.log(1 + up) / Math.log(1.0001));
  let lo = ctx.alignTick(ctx.ev.t - dLo);
  let hi = ctx.alignTick(ctx.ev.t + dHi);
  if (hi <= lo) hi = lo + ctx.spec.tickSpacing;
  return [Math.max(lo, VMIN + ctx.spec.tickSpacing), Math.min(hi, VMAX - ctx.spec.tickSpacing)];
};
const asymName = (down: number, up: number) => `−${(down * 100).toFixed(0)}%/+${(up * 100).toFixed(0)}%`;

/** 1. HODL 50/50 — the exit-gate benchmark. */
export const hodl5050: Strategy = {
  name: 'HODL 50/50',
  init: (ctx) => ctx.toHalfHalf(),
  onEvent: () => {},
};

/** Swap all cash into the QUOTE leg (for ETH/stable = stable, i.e. true
 *  cash without beta; NOTE: for WETH-quoted pools, e.g. cbBTC/WETH, the quote
 *  is WETH — beta vs USD remains). Cost: tier fee + slippage on turnover. */
const toQuoteAll = (ctx: Ctx) => {
  const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
  const ethIs0 = ctx.spec.ethIsToken0;
  const amt = ethIs0 ? ctx.state.cash0 : ctx.state.cash1; // base leg to sell
  if (amt <= 0) return;
  const usd = amt * (ethIs0 ? px0 : px1);
  const cost = usd * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000);
  ctx.state.swapCostUsd += cost;
  if (ethIs0) {
    ctx.state.cash0 = 0;
    ctx.state.cash1 += Math.max(usd - cost, 0) / px1;
  } else {
    ctx.state.cash1 = 0;
    ctx.state.cash0 += Math.max(usd - cost, 0) / px0;
  }
};

/** 1b. 100% quote (cash) — baseline for strategies whose default posture is
 *  OUT of the market (the flat-only family, 26.08). On ETH/stable ≈ "I hold USDC". */
export const cash100: Strategy = {
  name: '100% quote (cash, bez LP)', // data-contract key: "100% quote (cash, no LP)"
  init: (ctx) => toQuoteAll(ctx),
  onEvent: () => {},
};

/** Swap all cash into the BASE leg (ETH/cbBTC) — mirror of toQuoteAll. */
const toBaseAll = (ctx: Ctx) => {
  const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
  const ethIs0 = ctx.spec.ethIsToken0;
  const amt = ethIs0 ? ctx.state.cash1 : ctx.state.cash0; // quote leg to sell
  if (amt <= 0) return;
  const usd = amt * (ethIs0 ? px1 : px0);
  const cost = usd * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000);
  ctx.state.swapCostUsd += cost;
  if (ethIs0) {
    ctx.state.cash1 = 0;
    ctx.state.cash0 += Math.max(usd - cost, 0) / px0;
  } else {
    ctx.state.cash0 = 0;
    ctx.state.cash1 += Math.max(usd - cost, 0) / px1;
  }
};

/** 1d. SWING "buy the dips, sell the tops" (Rafal's idea 29.08) —
 *  NO LP, pure direction: when the price is `thresh` BELOW the EMA → all
 *  capital into the base asset; when `thresh` ABOVE → all into quote.
 *  The same signal (log-gap to the HL7d EMA) used by the flat detector, so
 *  the comparison is fair: this is not new information, only a different
 *  way of using it. Zero fees — the strategy provides no liquidity, it only
 *  pays swap costs on every switch. */
export const swingHold = (opts: { thresh: number; hlDays?: number }): Strategy => {
  let ema: number | null = null;
  let lastTs: number | null = null;
  let side: 'base' | 'quote' | null = null;
  const tau = ((opts.hlDays ?? 7) * 86400) / Math.LN2;
  return {
    name: `Swing ±${(opts.thresh * 100).toFixed(0)}% (dołki→aktywo, górki→quote)`, // data-contract key: "(dips→asset, tops→quote)"
    init: (ctx) => {
      ctx.toHalfHalf();
      ema = Math.log(ethUsd(ctx.ev.sqrtP, ctx.spec));
      lastTs = ctx.ev.ts;
    },
    onEvent: (ctx) => {
      const logP = Math.log(ethUsd(ctx.ev.sqrtP, ctx.spec));
      if (ema === null || lastTs === null) { ema = logP; lastTs = ctx.ev.ts; return; }
      const dt = Math.max(ctx.ev.ts - lastTs, 1);
      const a = 1 - Math.exp(-dt / tau);
      ema = (1 - a) * ema + a * logP;
      lastTs = ctx.ev.ts;
      const gap = logP - ema;
      if (gap < -opts.thresh && side !== 'base') { toBaseAll(ctx); side = 'base'; ctx.state.rebalances++; }
      else if (gap > opts.thresh && side !== 'quote') { toQuoteAll(ctx); side = 'quote'; ctx.state.rebalances++; }
    },
  };
};

/**
 * 1c. FLAT-ONLY LP (26.08, direction from the review + Rafal's sideways-market
 * thesis): DEFAULT CASH (100% quote — zero beta on ETH/stable), entry into LP
 * only when the detector says "sideways" (|gap to EMA| < enterThresh
 * CONTINUOUSLY for confirmSec), exit to cash on a trend in EITHER direction
 * (|gap| > exitThresh). While in LP, normal range re-centering (hysteresis +
 * payback as in volAdaptive). Benchmark: cash100, not HODL — the question is
 * "how many fees do I add to cash without risking the tail", not "do I beat
 * holding the pair".
 */
export const flatOnlyLP = (opts: {
  k: number;
  horizonDays: number;
  enterThresh: number; // |gap| < this for confirmSec → flat → entry
  exitThresh: number; // |gap| > this → trend → exit to cash
  confirmSec: number;
  hysteresisSec: number;
  maxPaybackDays: number;
  trendHLDays: number;
  minWidth?: number;
  maxWidth?: number;
  /** posture OUTSIDE LP (26.08 evening, Rafal's idea): 'quote' [default] =
   *  cash without beta; 'hodl' = 50/50 — in a trend you ride WITH the market
   *  (vs HODL ≈ a draw instead of a loss), in a flat you add fees.
   *  The benchmark for 'hodl' is HODL 50/50, for 'quote' — cash100.
   *  'passive' (27.08, Rafal's idea #2): outside the flat a WIDE passive LP
   *  (±passiveWidth) instead of bare HODL — fees also in a trend, at the
   *  cost of the passiveW tail. The FlatWide hybrid. */
  idle?: 'quote' | 'hodl' | 'passive';
  /** width of the passive LP for idle:'passive' (default 0.4 = ±40%) */
  passiveWidth?: number;
  /** re-posturing WITHOUT A SWAP (29.08): 'swap' [default] centres the range
   *  on the price and tops up the difference through the market; 'noswap'
   *  shifts the range so it matches what we hold in the portfolio (up to and
   *  including a one-sided range) — zero turnover, zero slippage. */
  recenter?: 'swap' | 'noswap';
  /** FIXED width of the NARROW leg in a flat (29.08). Without it the narrow
   *  band is computed as kxσx√horizonDays — the v1.2 advisor formula, which
   *  the product ABANDONED (it gave ±16–19% at an exit threshold of 5%, i.e.
   *  liquidity out of reach of the FLAT_WIDEN signal). Production plays a
   *  fixed width = FLAT.exitGap (±5%), so the backtest must be able to
   *  compute the same — otherwise walkforward and fullperiod measure a
   *  different product than the one we play (drift detected 29.08). */
  narrowWidth?: number;
  /** ASYMMETRIC wide idle leg in PRICE (02.09): [down, up] — overrides
   *  passiveWidth (which is log-symmetric, see rangeAsym). */
  passiveAsym?: [number, number];
}): Strategy => {
  let ema: number | null = null;
  let lastTs: number | null = null;
  let flatSince: number | null = null;
  let outSince: number | null = null;
  const tau = (opts.trendHLDays * 86400) / Math.LN2;
  // width of the NARROW leg: fixed from the product when given; otherwise kxσx√h
  const width = (ctx: Ctx) =>
    opts.narrowWidth ??
    Math.min(Math.max(opts.k * ctx.volDaily * Math.sqrt(opts.horizonDays), opts.minWidth ?? 0.01), opts.maxWidth ?? 0.6);
  const halfGas = (ctx: Ctx) => {
    const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
    const g = ctx.spec.gasUsdPerRebalance / 2;
    ctx.state.gasUsd += g;
    if (ctx.state.cash0 * px0 >= g) ctx.state.cash0 -= g / px0;
    else ctx.state.cash1 -= g / px1;
  };
  // idle posture: cash in quote or 50/50 (with the cost of the equalizing swap)
  const toIdle = (ctx: Ctx) => {
    if ((opts.idle ?? 'quote') === 'quote') return toQuoteAll(ctx);
    const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
    const total = ctx.state.cash0 * px0 + ctx.state.cash1 * px1;
    const turnover = Math.abs(ctx.state.cash0 * px0 - total / 2);
    const cost = turnover * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000);
    ctx.state.swapCostUsd += cost;
    const eff = total > 0 ? Math.max(total - cost, 0) / total : 0;
    ctx.state.cash0 = ((total / 2) * eff) / px0;
    ctx.state.cash1 = ((total / 2) * eff) / px1;
  };
  const mkRange = (ctx: Ctx, w: number): [number, number] =>
    (opts.recenter ?? 'swap') === 'noswap' ? rangeNoSwap(ctx, w) : rangeAround(ctx, w);
  const idleMode = opts.idle ?? 'quote';
  const passive = idleMode === 'passive';
  const pw = opts.passiveWidth ?? 0.4;
  // wide leg: asymmetric in price when passiveAsym is given (02.09);
  // the noswap variant concerns only transitions from the narrow leg, so not here
  const mkIdleRange = (ctx: Ctx): [number, number] =>
    opts.passiveAsym ? rangeAsym(ctx, opts.passiveAsym[0], opts.passiveAsym[1]) : mkRange(ctx, pw);
  let inFlat = false; // for idle:'passive' — whether the current position is the NARROW LP
  const idleName = idleMode === 'quote' ? 'cash' : idleMode === 'hodl' ? 'HODL50/50'
    : opts.passiveAsym ? asymName(opts.passiveAsym[0], opts.passiveAsym[1]) : `±${(pw * 100).toFixed(0)}%`;
  return {
    // data-contract key: "[bez swapu]" = "[no swap]", "wąski" = "narrow" (scripts/wide-collect.ts matches /^FlatOnly wąski/)
    name: `FlatOnly${(opts.recenter ?? 'swap') === 'noswap' ? ' [bez swapu]' : ''} ${opts.narrowWidth ? `wąski ±${(opts.narrowWidth * 100).toFixed(0)}%` : `k=${opts.k}`} |gap|<${(opts.enterThresh * 100).toFixed(0)}%/${(opts.confirmSec / 3600).toFixed(0)}h→LP, >${(opts.exitThresh * 100).toFixed(0)}%→${idleName} (HL${opts.trendHLDays}d)`,
    init: (ctx) => {
      if (passive) {
        ctx.openPosition(...mkIdleRange(ctx)); // idle = wide passive LP
        inFlat = false;
      } else {
        toIdle(ctx); // start OUT of the market in the idle posture
      }
      ema = Math.log(ethUsd(ctx.ev.sqrtP, ctx.spec));
      lastTs = ctx.ev.ts;
    },
    onEvent: (ctx) => {
      const logP = Math.log(ethUsd(ctx.ev.sqrtP, ctx.spec));
      if (ema === null || lastTs === null) {
        ema = logP;
        lastTs = ctx.ev.ts;
        return;
      }
      const dt = Math.max(ctx.ev.ts - lastTs, 1);
      const a = 1 - Math.exp(-dt / tau);
      ema = (1 - a) * ema + a * logP;
      lastTs = ctx.ev.ts;
      const gap = Math.abs(logP - ema);
      const p = ctx.state.pos;

      if (p && (inFlat || !passive)) {
        // trend in either direction → exit to the idle posture
        if (gap > opts.exitThresh) {
          ctx.closePosition();
          halfGas(ctx);
          if (passive) {
            ctx.openPosition(...mkIdleRange(ctx)); // back to wide
            inFlat = false;
          } else {
            toIdle(ctx);
          }
          ctx.state.rebalances++;
          flatSince = null;
          outSince = null;
          return;
        }
        // normal range re-centering (hysteresis + payback)
        const out = ctx.ev.t < p.lo || ctx.ev.t >= p.hi;
        if (!out) {
          outSince = null;
          return;
        }
        if (outSince === null) outSince = ctx.ev.ts;
        if (ctx.ev.ts - outSince < opts.hysteresisSec) return;
        const w = width(ctx);
        const valueUsd = ctx.valueUsd();
        const costUsd =
          ctx.spec.gasUsdPerRebalance + valueUsd * 0.5 * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000);
        const bandTicks = 2 * ctx.spec.tickSpacing;
        const ourTicks = Math.max(widthToTicks(w) * 2, bandTicks);
        const expectedDailyFees = valueUsd * ctx.poolFeeYieldDaily * (bandTicks / ourTicks);
        if (Number.isFinite(opts.maxPaybackDays) && expectedDailyFees > 0 && costUsd / expectedDailyFees > opts.maxPaybackDays) return;
        ctx.rebalance(...mkRange(ctx, w));
        outSince = null;
        return;
      }

      // idle posture (cash/HODL/wide LP): waiting for a confirmed flat
      if (gap < opts.enterThresh) {
        if (flatSince === null) flatSince = ctx.ev.ts;
        if (ctx.ev.ts - flatSince >= opts.confirmSec) {
          if (passive && ctx.state.pos) ctx.closePosition(); // close the wide one
          halfGas(ctx);
          ctx.openPosition(...mkRange(ctx, width(ctx)));
          inFlat = true;
          ctx.state.rebalances++;
          flatSince = null;
          outSince = null;
        }
      } else {
        flatSince = null;
      }
    },
  };
};

/** 2. Passive full-range (as in v2). */
export const fullRange: Strategy = {
  name: 'Pasywny full-range', // data-contract key: "Passive full-range"
  init: (ctx) => {
    const lo = ctx.alignTick(VMIN + ctx.spec.tickSpacing);
    const hi = ctx.alignTick(VMAX - ctx.spec.tickSpacing);
    ctx.openPosition(lo, hi);
  },
  onEvent: () => {},
};

/** 3. Passive wide ±50% — open once, never touch. */
export const passiveWide: Strategy = {
  name: 'Pasywny ±50%', // data-contract key: "Passive ±50%" (matched by scripts/wide-collect.ts and e8-timing.ts)
  init: (ctx) => {
    const [lo, hi] = rangeAround(ctx, 0.5);
    ctx.openPosition(lo, hi);
  },
  onEvent: () => {},
};

/** Passive ±w% — open once, never touch (the "HODL with yield" family,
 *  26.08 evening: the only family winning in fullperiod 4/4 and consistent
 *  with the literature — a wide range minimizes divergence loss and costs). */
export const passiveW = (w: number): Strategy => ({
  name: `Pasywny ±${(w * 100).toFixed(0)}%`, // data-contract key: "Passive ±w%" (matched by scripts/wide-collect.ts)
  init: (ctx) => ctx.openPosition(...rangeAround(ctx, w)),
  onEvent: () => {},
});

/** Passive asymmetric −down/+up (in PRICE) — open once, never touch.
 *  The "skewed range" family (02.09): wider on the downside, narrower on the upside. */
export const passiveAsym = (down: number, up: number): Strategy => ({
  name: `Pasywny ${asymName(down, up)}`, // data-contract key: "Passive −down%/+up%"
  init: (ctx) => ctx.openPosition(...rangeAsym(ctx, down, up)),
  onEvent: () => {},
});

/** Fixed asymmetric with naive rebalance after exit (pair to fixedNaive). */
export const fixedNaiveAsym = (down: number, up: number): Strategy => ({
  name: `Sztywny ${asymName(down, up)} (naiwny)`, // data-contract key: "Fixed −down%/+up% (naive)"
  init: (ctx) => ctx.openPosition(...rangeAsym(ctx, down, up)),
  onEvent: (ctx) => {
    const p = ctx.state.pos;
    if (p && (ctx.ev.t < p.lo || ctx.ev.t >= p.hi)) ctx.rebalance(...rangeAsym(ctx, down, up));
  },
});

/** INNER LEG OF A "BARBELL" (02.09, idea: two static positions instead of
 *  one). The engine holds ONE position, but the result is linear in capital
 *  (fixed gas and the L/(Lpool+L) share are negligible non-linearities at $2.5k
 *  vs a $10M+ pool), so barbell = the AVERAGE of two separate runs:
 *    barbell(A,B) ≈ ½·final(A) + ½·final(B)   (the same for fees/gas/swap)
 *  Inner leg: narrow ±wIn (log-sym.), recentred ONLY when the price leaves
 *  [c·(1−trigDown), c·(1+trigUp)] from the centre c — i.e. exactly when we
 *  would be re-positioning the wide leg anyway. In between: NOTHING (zero cost).
 *  This is NOT the narrowing of 29.08 (there the narrow leg chased the price
 *  on every exit — costs ate the effect); here the position sits still most
 *  of the time. */
export const innerTrig = (wIn: number, trigDown: number, trigUp: number): Strategy => {
  let center = 0;
  return {
    name: `Wewn. ±${(wIn * 100).toFixed(0)}% recentr. gdy poza ${asymName(trigDown, trigUp)}`, // data-contract key: "Inner ±w% recentred when outside −d%/+u%"
    init: (ctx) => {
      center = ctx.ev.t;
      ctx.openPosition(...rangeAround(ctx, wIn));
    },
    onEvent: (ctx) => {
      const dLo = Math.round(-Math.log(1 - trigDown) / Math.log(1.0001));
      const dHi = Math.round(Math.log(1 + trigUp) / Math.log(1.0001));
      if (ctx.ev.t < center - dLo || ctx.ev.t >= center + dHi) {
        center = ctx.ev.t;
        ctx.rebalance(...rangeAround(ctx, wIn));
      }
    },
  };
};

/** 4. Fixed ±w% with a naive rebalance immediately after leaving the range. */
export const fixedNaive = (w: number): Strategy => ({
  name: `Sztywny ±${(w * 100).toFixed(0)}% (naiwny)`, // data-contract key: "Fixed ±w% (naive)"
  init: (ctx) => ctx.openPosition(...rangeAround(ctx, w)),
  onEvent: (ctx) => {
    const p = ctx.state.pos;
    if (p && (ctx.ev.t < p.lo || ctx.ev.t >= p.hi)) {
      ctx.rebalance(...rangeAround(ctx, w));
    }
  },
});

/**
 * 5. Adaptive: width ∝ volatility, time hysteresis + price buffer,
 *    profitability condition based on the pool's trailing fee yield.
 */
export const volAdaptive = (opts: {
  /** volatility multiplier: width = k * σ_daily * sqrt(horizon days) */
  k: number;
  horizonDays: number;
  /** minimum time out of range before a rebalance (seconds) */
  hysteresisSec: number;
  /** ASYMMETRY (experiment 20.08): separate hysteresis when the RELATIVE base
   *  price (ETH/cbBTC) left the range UPWARDS; absent = symmetric hysteresisSec */
  hysteresisUpSec?: number;
  /** required payback of the cost from fees within N days (Infinity = disabled) */
  maxPaybackDays: number;
  minWidth?: number;
  maxWidth?: number;
}): Strategy => {
  let outSince: number | null = null;
  return {
    name: `Adaptacyjna k=${opts.k} h=${(opts.hysteresisSec / 3600).toFixed(0)}h${opts.hysteresisUpSec !== undefined ? `/hUp=${(opts.hysteresisUpSec / 3600).toFixed(0)}h` : ''} payback≤${opts.maxPaybackDays}d`, // data-contract key: "Adaptive k=..."
    init: (ctx) => {
      const w = Math.min(
        Math.max(opts.k * ctx.volDaily * Math.sqrt(opts.horizonDays), opts.minWidth ?? 0.01),
        opts.maxWidth ?? 0.6
      );
      ctx.openPosition(...rangeAround(ctx, w));
    },
    onEvent: (ctx) => {
      const p = ctx.state.pos;
      if (!p) return;
      const out = ctx.ev.t < p.lo || ctx.ev.t >= p.hi;
      if (!out) {
        outSince = null;
        return;
      }
      if (outSince === null) outSince = ctx.ev.ts;
      // exit direction in the RELATIVE base price: ethIsToken0 → price ~1.0001^t
      // (upwards = t≥hi); eth as token1 → price ~1/1.0001^t (upwards = t<lo)
      const outUp = ctx.spec.ethIsToken0 ? ctx.ev.t >= p.hi : ctx.ev.t < p.lo;
      const hSec = outUp ? opts.hysteresisUpSec ?? opts.hysteresisSec : opts.hysteresisSec;
      if (ctx.ev.ts - outSince < hSec) return;

      // profitability condition: the rebalance cost must pay back from fees within maxPaybackDays
      const w = Math.min(
        Math.max(opts.k * ctx.volDaily * Math.sqrt(opts.horizonDays), opts.minWidth ?? 0.01),
        opts.maxWidth ?? 0.6
      );
      const valueUsd = ctx.valueUsd();
      const costUsd =
        ctx.spec.gasUsdPerRebalance +
        valueUsd * 0.5 * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000); // ~half the value is swapped
      // yield for OUR concentration: fee yield of the narrow band / (band_width/2*tickSpacing)...
      // simplification: the active band yield scales inversely with range width
      const bandTicks = 2 * ctx.spec.tickSpacing;
      const ourTicks = Math.max(widthToTicks(w) * 2, bandTicks);
      const ourYieldDaily = ctx.poolFeeYieldDaily * (bandTicks / ourTicks);
      const expectedDailyFees = valueUsd * ourYieldDaily;
      if (
        Number.isFinite(opts.maxPaybackDays) &&
        expectedDailyFees > 0 &&
        costUsd / expectedDailyFees > opts.maxPaybackDays
      ) {
        return; // not worth it — we wait (out of range there is no IL relative to holding the tokens)
      }
      ctx.rebalance(...rangeAround(ctx, w));
      outSince = null;
    },
  };
};

/**
 * 6. Adaptive WITH A DOWNTREND CIRCUIT BREAKER (conclusion from B2: all the
 *    worst walk-forward windows are down windows; tuning k/h does not fix that).
 *
 * Detector (causal, 2 parameters): EMA of the relative log-price with half-life
 * trendHLDays; DOWN signal when logP − EMA < −trendThresh; the signal CLEARS
 * (hysteresis) when logP − EMA > −trendThresh/2.
 *
 * Defence modes:
 *  - 'widen': during DOWN the range width x widenMult (rebalances per the
 *    normal base rules) — gentle, zero extra gas;
 *  - 'exit': on the signal close the position to 50/50 cash (honestly: ½ of the
 *    cycle gas + the cost of the equalizing swap), return to LP once the signal
 *    clears (the other ½ of the gas at openPosition; the engine counts the swap)
 *    — "LP on/off", no directional bet beyond what HODL has;
 *  - 'block': when out of range during DOWN — do not rebalance (wait until the
 *    trend clears); the cheapest, but holds a bag of the falling token.
 */
export const volAdaptiveTrend = (opts: {
  k: number;
  horizonDays: number;
  hysteresisSec: number;
  /** ASYMMETRY (experiment 20.08): separate hysteresis on an UPWARD exit (as above) */
  hysteresisUpSec?: number;
  maxPaybackDays: number;
  trendHLDays: number;
  trendThresh: number;
  mode: 'widen' | 'exit' | 'block';
  widenMult?: number;
  minWidth?: number;
  maxWidth?: number;
  /** volatility gate: DOWN signal only when volDaily > ratio x slow vol EMA
   *  (a crash = high vol; calm chop in a flat does not trigger the breaker) */
  volGateRatio?: number;
  /** stricter re-entry: return to LP only when the price is ABOVE the EMA (gap > 0),
   *  not at gap > −thresh/2 */
  reentryAboveEma?: boolean;
  /** second UNCONDITIONAL threshold (a downward grind without a vol spike):
   *  DOWN signal also when gap < −trendThresh2, regardless of the vol gate */
  trendThresh2?: number;
  /** UP-FALLBACK (item 12 of DECISIONS-2026-08-26, Rafal's idea 25.08; only
   *  mode:'exit'): an UPWARD exit from the range leaves the LP 100% in quote
   *  (it sold the base on the way) — instead of waiting out the whole
   *  hysteresis with no exposure, after 1h of confirmation we move to 50/50
   *  HODL (catching the trend beta), and return to LP after the full hUp
   *  counted from the range EXIT (the "don't buy the top" mechanism of hUp48
   *  stays intact). */
  upFallback?: '5050';
  /** SYMMETRIC UP BREAKER (Rafal's idea, night of 25.08, after the 720d
   *  analysis; only mode:'exit'): UP signal when gap = logP − EMA > threshold →
   *  exit from LP to 50/50 (HODL catches the trend beta); the signal clears at
   *  gap < threshold/2; we return to LP when BOTH signals (down and up) are
   *  cleared = "LP only when the market is not trending". Difference vs
   *  upFallback: reacts to the TREND (early), not to falling out of range (late). */
  upExitThresh?: number;
  /** (26.08, DECISIONS item 10) hysteresis as a TIME SHARE out of range:
   *  instead of "24h continuously, a touch resets" — an EMA of the out-of-range
   *  indicator with time constant hysteresisSec (hUp for an upward exit);
   *  rebalance when the share > hysteresisShare (e.g. 0.8). Robust to sampling
   *  frequency — the same semantics deployable in paper (15 min) and the observer. */
  hysteresisShare?: number;
  /** (26.08, 11f.d — "a less jumpy UP signal") upExitThresh fires only once
   *  gap>threshold has held CONTINUOUSLY for upConfirmSec (a drop below the
   *  threshold before confirmation resets the counter). */
  upConfirmSec?: number;
}): Strategy => {
  let outSince: number | null = null;
  let upCashSince: number | null = null; // time of the UPWARD exit, when we park at 50/50
  let upSig = false; // symmetric uptrend signal (upExitThresh)
  let upGapSince: number | null = null; // since when gap>threshold (for upConfirmSec)
  let fracOut = 0; // EMA of the out-of-range indicator (hysteresisShare)
  let prevOutTs: number | null = null;
  let prevOut = false;
  let ema: number | null = null;
  let lastTs: number | null = null;
  let down = false;
  let volSlow: number | null = null; // slow EMA of volDaily (HL 10 days) for the gate
  const tau = (opts.trendHLDays * 86400) / Math.LN2;
  const tauVol = (10 * 86400) / Math.LN2;

  const width = (ctx: Ctx) => {
    let w = Math.min(
      Math.max(opts.k * ctx.volDaily * Math.sqrt(opts.horizonDays), opts.minWidth ?? 0.01),
      opts.maxWidth ?? 0.6
    );
    if (down && opts.mode === 'widen') w = Math.min(w * (opts.widenMult ?? 2), 1.5);
    return w;
  };

  const updateTrend = (ctx: Ctx) => {
    const logP = Math.log(ethUsd(ctx.ev.sqrtP, ctx.spec));
    if (ema === null || lastTs === null) {
      ema = logP;
      lastTs = ctx.ev.ts;
      volSlow = ctx.volDaily;
      return;
    }
    const dt = Math.max(ctx.ev.ts - lastTs, 1);
    const a = 1 - Math.exp(-dt / tau);
    ema = (1 - a) * ema + a * logP;
    const av = 1 - Math.exp(-dt / tauVol);
    volSlow = (1 - av) * (volSlow ?? ctx.volDaily) + av * ctx.volDaily;
    lastTs = ctx.ev.ts;
    const gap = logP - ema;
    const volOk = !opts.volGateRatio || ctx.volDaily > opts.volGateRatio * (volSlow ?? ctx.volDaily);
    const sigCrash = gap < -opts.trendThresh && volOk;
    const sigGrind = opts.trendThresh2 !== undefined && gap < -opts.trendThresh2;
    if (!down && (sigCrash || sigGrind)) down = true;
    else if (down) {
      const backAt = opts.reentryAboveEma ? 0 : -opts.trendThresh / 2;
      if (gap > backAt) down = false;
    }
    if (opts.upExitThresh !== undefined) {
      if (!upSig) {
        if (gap > opts.upExitThresh) {
          if (opts.upConfirmSec === undefined) upSig = true;
          else {
            if (upGapSince === null) upGapSince = ctx.ev.ts;
            if (ctx.ev.ts - upGapSince >= opts.upConfirmSec) upSig = true;
          }
        } else {
          upGapSince = null; // continuity broken before confirmation
        }
      } else if (gap < opts.upExitThresh / 2) {
        upSig = false; // hysteresis as for down
        upGapSince = null;
      }
    }
  };

  /** honest exit to 50/50 cash: ½ of the cycle gas + the cost of the equalizing swap */
  const exitToHalfHalf = (ctx: Ctx) => {
    ctx.closePosition();
    const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
    const g = ctx.spec.gasUsdPerRebalance / 2;
    ctx.state.gasUsd += g;
    if (ctx.state.cash0 * px0 >= g) ctx.state.cash0 -= g / px0;
    else ctx.state.cash1 -= g / px1;
    const total = ctx.state.cash0 * px0 + ctx.state.cash1 * px1;
    const turnover = Math.abs(ctx.state.cash0 * px0 - total / 2);
    const cost = turnover * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000);
    ctx.state.swapCostUsd += cost;
    const eff = total > 0 ? Math.max(total - cost, 0) / total : 0;
    ctx.state.cash0 = ((total / 2) * eff) / px0;
    ctx.state.cash1 = ((total / 2) * eff) / px1;
  };

  /** entry from cash: ½ of the cycle gas (the swap is added by openPosition) */
  const enter = (ctx: Ctx) => {
    const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
    const g = ctx.spec.gasUsdPerRebalance / 2;
    ctx.state.gasUsd += g;
    if (ctx.state.cash0 * px0 >= g) ctx.state.cash0 -= g / px0;
    else ctx.state.cash1 -= g / px1;
    ctx.openPosition(...rangeAround(ctx, width(ctx)));
  };

  return {
    // data-contract key (matched by scripts/candidate-funnel.ts regex /k=3 .*trend\(exit,.*re>ema\)/)
    name: `Adapt k=${opts.k} h=${(opts.hysteresisSec / 3600).toFixed(0)}h${opts.hysteresisUpSec !== undefined ? `/hUp=${(opts.hysteresisUpSec / 3600).toFixed(0)}h` : ''} + trend(${opts.mode},HL${opts.trendHLDays}d,${(opts.trendThresh * 100).toFixed(0)}%${opts.volGateRatio ? `,vg${opts.volGateRatio}` : ''}${opts.trendThresh2 !== undefined ? `,t2=${(opts.trendThresh2 * 100).toFixed(0)}%` : ''}${opts.reentryAboveEma ? ',re>ema' : ''}${opts.upFallback ? ',up→5050' : ''}${opts.upExitThresh !== undefined ? `,upX=${(opts.upExitThresh * 100).toFixed(0)}%` : ''}${opts.upConfirmSec !== undefined ? `,upConf=${(opts.upConfirmSec / 3600).toFixed(0)}h` : ''}${opts.hysteresisShare !== undefined ? `,share=${(opts.hysteresisShare * 100).toFixed(0)}%` : ''})`,
    init: (ctx) => {
      updateTrend(ctx);
      ctx.openPosition(...rangeAround(ctx, width(ctx)));
    },
    onEvent: (ctx) => {
      updateTrend(ctx);
      const p = ctx.state.pos;

      if (opts.mode === 'exit') {
        if ((down || upSig) && p) {
          exitToHalfHalf(ctx); // 50/50: neutral on the way down, catches beta on the way up
          ctx.state.rebalances++;
          outSince = null;
          upCashSince = null; // the trend breaker overrides the range-exit parking
          fracOut = 0;
          prevOut = false;
          return;
        }
        if (!down && !upSig && !p) {
          // return from the 50/50 parking after an upward exit: full hUp hysteresis
          // counted from the range exit (as in the variant without the fallback)
          if (upCashSince !== null) {
            const hUp = opts.hysteresisUpSec ?? opts.hysteresisSec;
            if (ctx.ev.ts - upCashSince < hUp) return;
            upCashSince = null;
          }
          enter(ctx);
          ctx.state.rebalances++;
          return;
        }
      }
      if (!p) return;

      const out = ctx.ev.t < p.lo || ctx.ev.t >= p.hi;
      // hysteresisShare: EMA of the out-of-range indicator updated on EVERY
      // swap (in range it decays towards 0 — touching the range no longer RESETS
      // the counter, it only weakens it proportionally to time in range)
      if (opts.hysteresisShare !== undefined) {
        if (prevOutTs !== null) {
          const dtOut = Math.max(ctx.ev.ts - prevOutTs, 1);
          const upNow = out && (ctx.spec.ethIsToken0 ? ctx.ev.t >= p.hi : ctx.ev.t < p.lo);
          const tauH = upNow ? opts.hysteresisUpSec ?? opts.hysteresisSec : opts.hysteresisSec;
          const ah = 1 - Math.exp(-dtOut / tauH);
          fracOut = (1 - ah) * fracOut + ah * (prevOut ? 1 : 0);
        }
        prevOut = out;
        prevOutTs = ctx.ev.ts;
      }
      if (!out) {
        outSince = null;
        return;
      }
      if (opts.mode === 'block' && down) return; // wait until the trend clears
      if (outSince === null) outSince = ctx.ev.ts;
      const outUp = ctx.spec.ethIsToken0 ? ctx.ev.t >= p.hi : ctx.ev.t < p.lo;
      const hSec = outUp ? opts.hysteresisUpSec ?? opts.hysteresisSec : opts.hysteresisSec;

      // UP-FALLBACK: after 1h of confirmed upward exit → 50/50 HODL (see the
      // option description); the return to LP is handled by the mode:'exit' branch above.
      if (opts.upFallback && opts.mode === 'exit' && outUp) {
        if (ctx.ev.ts - outSince >= 3600) {
          upCashSince = outSince; // hUp counted from the range exit, not from the swap
          exitToHalfHalf(ctx);
          ctx.state.rebalances++;
          outSince = null;
        }
        return; // within the confirmation window (<1h) we do nothing
      }
      // hysteresis: classic (continuously out, a touch resets) OR
      // time share in the window (share, DECISIONS item 10 — 26.08)
      if (opts.hysteresisShare !== undefined ? fracOut < opts.hysteresisShare : ctx.ev.ts - outSince < hSec) return;

      const w = width(ctx);
      const valueUsd = ctx.valueUsd();
      const costUsd =
        ctx.spec.gasUsdPerRebalance +
        valueUsd * 0.5 * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000);
      const bandTicks = 2 * ctx.spec.tickSpacing;
      const ourTicks = Math.max(widthToTicks(w) * 2, bandTicks);
      const ourYieldDaily = ctx.poolFeeYieldDaily * (bandTicks / ourTicks);
      const expectedDailyFees = valueUsd * ourYieldDaily;
      if (
        Number.isFinite(opts.maxPaybackDays) &&
        expectedDailyFees > 0 &&
        costUsd / expectedDailyFees > opts.maxPaybackDays
      ) {
        return;
      }
      ctx.rebalance(...rangeAround(ctx, w));
      outSince = null;
      fracOut = 0;
      prevOut = false;
    },
  };
};

/**
 * 7. F4: Adaptive WITH A PERP HEDGE instead of exiting the LP.
 *
 * During a DOWN signal (the same EMA detector as volAdaptiveTrend) the LP
 * position STAYS (keeps collecting fees), and the ETH delta is neutralized by
 * a short ETH perp:
 *  - sizing 'full'   — short = the entire ETH exposure (delta→0; maximum defence,
 *    in up/flat windows with a signal it pays for the bounce),
 *  - sizing 'excess' — short = the ETH excess above 50% of portfolio value
 *    (neutralizes only the LP's convexity relative to HODL 50/50 — a fairer vsHODL).
 * Costs: taker takerBps on every short adjustment + HISTORICAL FUNDING
 * (fundingAt: r per 8h; perp convention: r>0 → the short RECEIVES funding, r<0 →
 * the short pays — in bear markets r is often negative and that is the main
 * cost of this defence).
 * Simplifications (deliberate, to be described with the conclusions): cross-margin
 * without a deposit/liquidation model; short PnL settled continuously into the
 * stable leg (it may temporarily go below zero); quote:'USD' pools only.
 */
export const volAdaptiveHedge = (opts: {
  k: number;
  horizonDays: number;
  hysteresisSec: number;
  maxPaybackDays: number;
  trendHLDays: number;
  trendThresh: number;
  sizing: 'full' | 'excess';
  fundingAt: (tsSec: number) => number;
  takerBps?: number;
  reentryAboveEma?: boolean;
  minWidth?: number;
  maxWidth?: number;
}): Strategy => {
  let outSince: number | null = null;
  let ema: number | null = null;
  let lastTs: number | null = null;
  let down = false;
  let shortSize = 0; // ETH
  let shortLastP = 0;
  let shortLastTs = 0;
  const tau = (opts.trendHLDays * 86400) / Math.LN2;
  const taker = (opts.takerBps ?? 5) / 10_000;

  const width = (ctx: Ctx) =>
    Math.min(Math.max(opts.k * ctx.volDaily * Math.sqrt(opts.horizonDays), opts.minWidth ?? 0.01), opts.maxWidth ?? 0.6);

  const stableLeg = (ctx: Ctx): 'cash0' | 'cash1' => (ctx.spec.ethIsToken0 ? 'cash1' : 'cash0');

  const ethExposure = (ctx: Ctx): number => {
    const ethCash = ctx.spec.ethIsToken0 ? ctx.state.cash0 : ctx.state.cash1;
    let ethPos = 0;
    if (ctx.state.pos) {
      const a = amountsForL(ctx.state.pos.L, ctx.state.pos.lo, ctx.state.pos.hi, ctx.ev.sqrtP, ctx.spec);
      ethPos = ctx.spec.ethIsToken0 ? a.a0 + ctx.state.pos.fees0 : a.a1 + ctx.state.pos.fees1;
    }
    return ethCash + ethPos;
  };

  const settleAndAdjust = (ctx: Ctx) => {
    if (ctx.spec.quote === 'WETH') throw new Error('volAdaptiveHedge: USD-quoted pools only');
    const P = ethUsd(ctx.ev.sqrtP, ctx.spec);
    const leg = stableLeg(ctx);
    // 1. settle the existing short: price PnL + funding
    if (shortSize > 0) {
      const pnl = shortSize * (shortLastP - P);
      const dt = Math.max(ctx.ev.ts - shortLastTs, 0);
      const funding = shortSize * P * opts.fundingAt(ctx.ev.ts) * (dt / 28_800);
      ctx.state[leg] += pnl + funding;
    }
    shortLastP = P;
    shortLastTs = ctx.ev.ts;
    // 2. target size
    let target = 0;
    if (down) {
      const exp = ethExposure(ctx);
      target = opts.sizing === 'full' ? exp : Math.max(0, exp - ctx.valueUsd() / 2 / P);
    }
    // 3. adjustment with a 15% band (taker cost on turnover)
    const base = Math.max(target, shortSize);
    if ((base > 0 && Math.abs(target - shortSize) / base > 0.15) || (target === 0 && shortSize > 0)) {
      const turnover = Math.abs(target - shortSize) * P;
      ctx.state[leg] -= turnover * taker;
      ctx.state.swapCostUsd += turnover * taker;
      shortSize = target;
    }
  };

  const updateTrend = (ctx: Ctx) => {
    const logP = Math.log(ethUsd(ctx.ev.sqrtP, ctx.spec));
    if (ema === null || lastTs === null) {
      ema = logP;
      lastTs = ctx.ev.ts;
      return;
    }
    const dt = Math.max(ctx.ev.ts - lastTs, 1);
    const a = 1 - Math.exp(-dt / tau);
    ema = (1 - a) * ema + a * logP;
    lastTs = ctx.ev.ts;
    const gap = logP - ema;
    if (!down && gap < -opts.trendThresh) down = true;
    else if (down && gap > (opts.reentryAboveEma ? 0 : -opts.trendThresh / 2)) down = false;
  };

  return {
    name: `Adapt k=${opts.k} + hedge(${opts.sizing},HL${opts.trendHLDays}d,${(opts.trendThresh * 100).toFixed(0)}%${opts.reentryAboveEma ? ',re>ema' : ''})`,
    init: (ctx) => {
      updateTrend(ctx);
      ctx.openPosition(...rangeAround(ctx, width(ctx)));
      shortLastP = ethUsd(ctx.ev.sqrtP, ctx.spec);
      shortLastTs = ctx.ev.ts;
    },
    onEvent: (ctx) => {
      updateTrend(ctx);
      settleAndAdjust(ctx);
      const p = ctx.state.pos;
      if (!p) return;
      const out = ctx.ev.t < p.lo || ctx.ev.t >= p.hi;
      if (!out) {
        outSince = null;
        return;
      }
      if (outSince === null) outSince = ctx.ev.ts;
      if (ctx.ev.ts - outSince < opts.hysteresisSec) return;
      const w = width(ctx);
      const valueUsd = ctx.valueUsd();
      const costUsd = ctx.spec.gasUsdPerRebalance + valueUsd * 0.5 * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000);
      const bandTicks = 2 * ctx.spec.tickSpacing;
      const ourTicks = Math.max(widthToTicks(w) * 2, bandTicks);
      const ourYieldDaily = ctx.poolFeeYieldDaily * (bandTicks / ourTicks);
      const expectedDailyFees = valueUsd * ourYieldDaily;
      if (Number.isFinite(opts.maxPaybackDays) && expectedDailyFees > 0 && costUsd / expectedDailyFees > opts.maxPaybackDays) return;
      ctx.rebalance(...rangeAround(ctx, w));
      outSince = null;
    },
  };
};

export const ALL_STRATEGIES: Strategy[] = [
  hodl5050,
  fullRange,
  passiveWide,
  fixedNaive(0.05),
  fixedNaive(0.15),
  volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }), // winner of the base-030 sweep
  volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 12 * 3600, maxPaybackDays: 7 }),
  volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
];
