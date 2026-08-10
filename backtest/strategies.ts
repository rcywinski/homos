/**
 * strategies.ts — benchmarki i strategie aktywne (PLAN.md §6 Faza 1).
 * Ceny zakresów liczone w przestrzeni ticków: width jako ułamek ceny
 * przekłada się na ±log(1+w)/log(1.0001) ticków wokół ceny bieżącej.
 */
import { Strategy, Ctx } from './engine';
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

export const ALL_STRATEGIES: Strategy[] = [
  hodl5050,
  fullRange,
  passiveWide,
  fixedNaive(0.05),
  fixedNaive(0.15),
  volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 6 * 3600, maxPaybackDays: 7 }),
  volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 12 * 3600, maxPaybackDays: 5 }),
  volAdaptive({ k: 1.5, horizonDays: 3, hysteresisSec: 2 * 3600, maxPaybackDays: 10 }),
];
