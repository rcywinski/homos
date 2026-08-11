/**
 * strategies.ts — benchmarki i strategie aktywne (PLAN.md §6 Faza 1).
 * Ceny zakresów liczone w przestrzeni ticków: width jako ułamek ceny
 * przekłada się na ±log(1+w)/log(1.0001) ticków wokół ceny bieżącej.
 */
import { Strategy, Ctx, ethUsd, unitPrices } from './engine';
import { MIN_TICK as VMIN, MAX_TICK as VMAX } from '../src/utils/v3math';

const widthToTicks = (w: number) => Math.round(Math.log(1 + w) / Math.log(1.0001));

const rangeAround = (ctx: Ctx, w: number): [number, number] => {
  const dt = widthToTicks(w);
  let lo = ctx.alignTick(ctx.ev.t - dt);
  let hi = ctx.alignTick(ctx.ev.t + dt);
  if (hi <= lo) hi = lo + ctx.spec.tickSpacing;
  return [Math.max(lo, VMIN + ctx.spec.tickSpacing), Math.min(hi, VMAX - ctx.spec.tickSpacing)];
};

/** 1. HODL 50/50 — benchmark bramki wyjścia. */
export const hodl5050: Strategy = {
  name: 'HODL 50/50',
  init: (ctx) => ctx.toHalfHalf(),
  onEvent: () => {},
};

/** 2. Pasywny full-range (jak v2). */
export const fullRange: Strategy = {
  name: 'Pasywny full-range',
  init: (ctx) => {
    const lo = ctx.alignTick(VMIN + ctx.spec.tickSpacing);
    const hi = ctx.alignTick(VMAX - ctx.spec.tickSpacing);
    ctx.openPosition(lo, hi);
  },
  onEvent: () => {},
};

/** 3. Pasywny szeroki ±50% — otwórz raz, nie ruszaj. */
export const passiveWide: Strategy = {
  name: 'Pasywny ±50%',
  init: (ctx) => {
    const [lo, hi] = rangeAround(ctx, 0.5);
    ctx.openPosition(lo, hi);
  },
  onEvent: () => {},
};

/** 4. Sztywny ±w% z naiwnym rebalansem natychmiast po wyjściu z zakresu. */
export const fixedNaive = (w: number): Strategy => ({
  name: `Sztywny ±${(w * 100).toFixed(0)}% (naiwny)`,
  init: (ctx) => ctx.openPosition(...rangeAround(ctx, w)),
  onEvent: (ctx) => {
    const p = ctx.state.pos;
    if (p && (ctx.ev.t < p.lo || ctx.ev.t >= p.hi)) {
      ctx.rebalance(...rangeAround(ctx, w));
    }
  },
});

/**
 * 5. Adaptacyjna: szerokość ∝ zmienność, histereza czasowa + bufor cenowy,
 *    warunek opłacalności na bazie trailing fee-yield puli.
 */
export const volAdaptive = (opts: {
  /** mnożnik zmienności: szerokość = k * σ_dzienna * sqrt(horyzont dni) */
  k: number;
  horizonDays: number;
  /** min czas poza zakresem przed rebalansem (sekundy) */
  hysteresisSec: number;
  /** wymagany zwrot kosztu z fee w N dni (Infinity = wyłączony) */
  maxPaybackDays: number;
  minWidth?: number;
  maxWidth?: number;
}): Strategy => {
  let outSince: number | null = null;
  return {
    name: `Adaptacyjna k=${opts.k} h=${(opts.hysteresisSec / 3600).toFixed(0)}h payback≤${opts.maxPaybackDays}d`,
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
      if (ctx.ev.ts - outSince < opts.hysteresisSec) return;

      // warunek opłacalności: koszt rebalansu musi się zwrócić z fee w maxPaybackDays
      const w = Math.min(
        Math.max(opts.k * ctx.volDaily * Math.sqrt(opts.horizonDays), opts.minWidth ?? 0.01),
        opts.maxWidth ?? 0.6
      );
      const valueUsd = ctx.valueUsd();
      const costUsd =
        ctx.spec.gasUsdPerRebalance +
        valueUsd * 0.5 * (ctx.spec.feeRate + ctx.spec.slippageBps / 10_000); // ~połowa wartości swapowana
      // yield dla NASZEJ koncentracji: fee-yield wąskiego pasma / (szerokość_pasma/2*tickSpacing)...
      // uproszczenie: yield aktywnego pasma skaluje się odwrotnie do szerokości zakresu
      const bandTicks = 2 * ctx.spec.tickSpacing;
      const ourTicks = Math.max(widthToTicks(w) * 2, bandTicks);
      const ourYieldDaily = ctx.poolFeeYieldDaily * (bandTicks / ourTicks);
      const expectedDailyFees = valueUsd * ourYieldDaily;
      if (
        Number.isFinite(opts.maxPaybackDays) &&
        expectedDailyFees > 0 &&
        costUsd / expectedDailyFees > opts.maxPaybackDays
      ) {
        return; // nie opłaca się — czekamy (poza zakresem nie ma IL względem trzymania tokenów)
      }
      ctx.rebalance(...rangeAround(ctx, w));
      outSince = null;
    },
  };
};

/**
 * 6. Adaptacyjna Z BEZPIECZNIKIEM TRENDU SPADKOWEGO (wniosek z B2: wszystkie
 *    najgorsze okna walk-forwardu to okna down; strojenie k/h tego nie łata).
 *
 * Detektor (przyczynowy, 2 parametry): EMA log-ceny względnej z half-life
 * trendHLDays; sygnał DOWN gdy logP − EMA < −trendThresh; sygnał GAŚNIE
 * (histereza) gdy logP − EMA > −trendThresh/2.
 *
 * Tryby obrony:
 *  - 'widen': w trakcie DOWN szerokość zakresu × widenMult (rebalanse wg
 *    normalnych reguł bazowych) — łagodne, zero dodatkowego gazu;
 *  - 'exit': na sygnale zamknij pozycję do cash 50/50 (uczciwie: ½ gazu cyklu
 *    + koszt swapu wyrównującego), wróć do LP po zgaśnięciu sygnału (druga
 *    ½ gazu przy openPosition; swap liczy silnik) — "LP on/off", bez zakładu
 *    kierunkowego ponad to, co ma HODL;
 *  - 'block': gdy poza zakresem w trakcie DOWN — nie rebalansuj (czekaj aż
 *    trend zgaśnie); najtańsze, ale trzyma worek spadającego tokena.
 */
export const volAdaptiveTrend = (opts: {
  k: number;
  horizonDays: number;
  hysteresisSec: number;
  maxPaybackDays: number;
  trendHLDays: number;
  trendThresh: number;
  mode: 'widen' | 'exit' | 'block';
  widenMult?: number;
  minWidth?: number;
  maxWidth?: number;
  /** bramka zmienności: sygnał DOWN tylko gdy volDaily > ratio × wolna EMA vol
   *  (krach = wysoka vol; spokojny chop we flat nie odpala bezpiecznika) */
  volGateRatio?: number;
  /** ostrzejszy powrót: wróć do LP dopiero gdy cena NAD EMA (gap > 0),
   *  nie przy gap > −thresh/2 */
  reentryAboveEma?: boolean;
  /** drugi próg BEZWARUNKOWY (grind spadkowy bez vol-spike'a): sygnał DOWN
   *  także gdy gap < −trendThresh2, niezależnie od bramki vol */
  trendThresh2?: number;
}): Strategy => {
  let outSince: number | null = null;
  let ema: number | null = null;
  let lastTs: number | null = null;
  let down = false;
  let volSlow: number | null = null; // wolna EMA volDaily (HL 10 dni) dla bramki
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
  };

  /** uczciwe wyjście do cash 50/50: ½ gazu cyklu + koszt swapu wyrównującego */
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

  /** wejście z cash: ½ gazu cyklu (swap dolicza openPosition) */
  const enter = (ctx: Ctx) => {
    const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
    const g = ctx.spec.gasUsdPerRebalance / 2;
    ctx.state.gasUsd += g;
    if (ctx.state.cash0 * px0 >= g) ctx.state.cash0 -= g / px0;
    else ctx.state.cash1 -= g / px1;
    ctx.openPosition(...rangeAround(ctx, width(ctx)));
  };

  return {
    name: `Adapt k=${opts.k} h=${(opts.hysteresisSec / 3600).toFixed(0)}h + trend(${opts.mode},HL${opts.trendHLDays}d,${(opts.trendThresh * 100).toFixed(0)}%${opts.volGateRatio ? `,vg${opts.volGateRatio}` : ''}${opts.trendThresh2 !== undefined ? `,t2=${(opts.trendThresh2 * 100).toFixed(0)}%` : ''}${opts.reentryAboveEma ? ',re>ema' : ''})`,
    init: (ctx) => {
      updateTrend(ctx);
      ctx.openPosition(...rangeAround(ctx, width(ctx)));
    },
    onEvent: (ctx) => {
      updateTrend(ctx);
      const p = ctx.state.pos;

      if (opts.mode === 'exit') {
        if (down && p) {
          exitToHalfHalf(ctx);
          ctx.state.rebalances++;
          outSince = null;
          return;
        }
        if (!down && !p) {
          enter(ctx);
          ctx.state.rebalances++;
          return;
        }
      }
      if (!p) return;

      const out = ctx.ev.t < p.lo || ctx.ev.t >= p.hi;
      if (!out) {
        outSince = null;
        return;
      }
      if (opts.mode === 'block' && down) return; // czekamy aż trend zgaśnie
      if (outSince === null) outSince = ctx.ev.ts;
      if (ctx.ev.ts - outSince < opts.hysteresisSec) return;

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
    },
  };
};

export const ALL_STRATEGIES: Strategy[] = [
  hodl5050,
  fullRange,
  passiveWide,
  fixedNaive(0.05),
  fixedNaive(0.15),
  volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }), // zwycięzca sweepu base-030
  volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 12 * 3600, maxPaybackDays: 7 }),
  volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
];
