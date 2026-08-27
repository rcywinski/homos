/**
 * strategies.ts — benchmarki i strategie aktywne (PLAN.md §6 Faza 1).
 * Ceny zakresów liczone w przestrzeni ticków: width jako ułamek ceny
 * przekłada się na ±log(1+w)/log(1.0001) ticków wokół ceny bieżącej.
 */
import { Strategy, Ctx, ethUsd, unitPrices, amountsForL } from './engine';
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

/** Swap całego cash do nogi QUOTE (dla ETH/stable = stable, czyli prawdziwy
 *  cash bez bety; UWAGA: dla pul kwotowanych w WETH, np. cbBTC/WETH, quote
 *  to WETH — beta vs USD zostaje). Koszt: fee tieru + slippage od obrotu. */
const toQuoteAll = (ctx: Ctx) => {
  const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
  const ethIs0 = ctx.spec.ethIsToken0;
  const amt = ethIs0 ? ctx.state.cash0 : ctx.state.cash1; // noga bazowa do sprzedania
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

/** 1b. 100% quote (cash) — baseline dla strategii z domyślną pozycją POZA
 *  rynkiem (rodzina flat-only, 26.08). Na ETH/stable ≈ "trzymam USDC". */
export const cash100: Strategy = {
  name: '100% quote (cash, bez LP)',
  init: (ctx) => toQuoteAll(ctx),
  onEvent: () => {},
};

/**
 * 1c. FLAT-ONLY LP (26.08, kierunek z przeglądu + teza Rafała o rynku
 * bocznym): DOMYŚLNIE CASH (100% quote — zero bety na ETH/stable), wejście
 * do LP dopiero gdy detektor mówi "bocznie" (|gap do EMA| < enterThresh
 * NIEPRZERWANIE przez confirmSec), wyjście do cash na trend w DOWOLNĄ
 * stronę (|gap| > exitThresh). W trakcie LP normalne re-centrowanie
 * zakresu (histereza + payback jak w volAdaptive). Benchmark: cash100,
 * nie HODL — pytanie brzmi "ile fees dokładam do gotówki, nie ryzykując
 * ogona", a nie "czy biję trzymanie pary".
 */
export const flatOnlyLP = (opts: {
  k: number;
  horizonDays: number;
  enterThresh: number; // |gap| < tego przez confirmSec → flat → wejście
  exitThresh: number; // |gap| > tego → trend → wyjście do cash
  confirmSec: number;
  hysteresisSec: number;
  maxPaybackDays: number;
  trendHLDays: number;
  minWidth?: number;
  maxWidth?: number;
  /** postura POZA LP (26.08 wieczór, pomysł Rafała): 'quote' [default] =
   *  cash bez bety; 'hodl' = 50/50 — w trendzie jedziesz Z RYNKIEM
   *  (vs HODL ≈ remis zamiast przegranej), we flat dokładasz fees.
   *  Benchmark dla 'hodl' to HODL 50/50, dla 'quote' — cash100.
   *  'passive' (27.08, pomysł Rafała #2): poza flat SZEROKI pasywny LP
   *  (±passiveWidth) zamiast gołego HODL — fees także w trendzie,
   *  kosztem ogona passiveW. Hybryda FlatWide. */
  idle?: 'quote' | 'hodl' | 'passive';
  /** szerokość pasywnego LP dla idle:'passive' (default 0.4 = ±40%) */
  passiveWidth?: number;
}): Strategy => {
  let ema: number | null = null;
  let lastTs: number | null = null;
  let flatSince: number | null = null;
  let outSince: number | null = null;
  const tau = (opts.trendHLDays * 86400) / Math.LN2;
  const width = (ctx: Ctx) =>
    Math.min(Math.max(opts.k * ctx.volDaily * Math.sqrt(opts.horizonDays), opts.minWidth ?? 0.01), opts.maxWidth ?? 0.6);
  const halfGas = (ctx: Ctx) => {
    const { px0, px1 } = unitPrices(ctx.ev.sqrtP, ctx.spec);
    const g = ctx.spec.gasUsdPerRebalance / 2;
    ctx.state.gasUsd += g;
    if (ctx.state.cash0 * px0 >= g) ctx.state.cash0 -= g / px0;
    else ctx.state.cash1 -= g / px1;
  };
  // postura idle: cash w quote albo 50/50 (z kosztem swapu wyrównującego)
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
  const idleMode = opts.idle ?? 'quote';
  const passive = idleMode === 'passive';
  const pw = opts.passiveWidth ?? 0.4;
  let inFlat = false; // dla idle:'passive' — czy obecna pozycja to WĄSKI LP
  const idleName = idleMode === 'quote' ? 'cash' : idleMode === 'hodl' ? 'HODL50/50' : `±${(pw * 100).toFixed(0)}%`;
  return {
    name: `FlatOnly k=${opts.k} |gap|<${(opts.enterThresh * 100).toFixed(0)}%/${(opts.confirmSec / 3600).toFixed(0)}h→LP, >${(opts.exitThresh * 100).toFixed(0)}%→${idleName} (HL${opts.trendHLDays}d)`,
    init: (ctx) => {
      if (passive) {
        ctx.openPosition(...rangeAround(ctx, pw)); // idle = szeroki pasywny LP
        inFlat = false;
      } else {
        toIdle(ctx); // start POZA rynkiem w posturze idle
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
        // trend w dowolną stronę → wyjście do postury idle
        if (gap > opts.exitThresh) {
          ctx.closePosition();
          halfGas(ctx);
          if (passive) {
            ctx.openPosition(...rangeAround(ctx, pw)); // z powrotem szeroki
            inFlat = false;
          } else {
            toIdle(ctx);
          }
          ctx.state.rebalances++;
          flatSince = null;
          outSince = null;
          return;
        }
        // normalne re-centrowanie zakresu (histereza + payback)
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
        ctx.rebalance(...rangeAround(ctx, w));
        outSince = null;
        return;
      }

      // postura idle (cash/HODL/szeroki LP): czekamy na potwierdzony flat
      if (gap < opts.enterThresh) {
        if (flatSince === null) flatSince = ctx.ev.ts;
        if (ctx.ev.ts - flatSince >= opts.confirmSec) {
          if (passive && ctx.state.pos) ctx.closePosition(); // zamknij szeroki
          halfGas(ctx);
          ctx.openPosition(...rangeAround(ctx, width(ctx)));
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

/** Pasywny ±w% — otwórz raz, nigdy nie dotykaj (rodzina "HODL z yieldem",
 *  26.08 wieczór: jedyna rodzina wygrywająca w fullperiod 4/4 i spójna z
 *  literaturą — szeroki zakres minimalizuje divergence loss i koszty). */
export const passiveW = (w: number): Strategy => ({
  name: `Pasywny ±${(w * 100).toFixed(0)}%`,
  init: (ctx) => ctx.openPosition(...rangeAround(ctx, w)),
  onEvent: () => {},
});

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
  /** ASYMETRIA (eksperyment 20.08): osobna histereza gdy cena WZGLĘDNA bazy
   *  (ETH/cbBTC) wyszła GÓRĄ z zakresu; brak = symetrycznie hysteresisSec */
  hysteresisUpSec?: number;
  /** wymagany zwrot kosztu z fee w N dni (Infinity = wyłączony) */
  maxPaybackDays: number;
  minWidth?: number;
  maxWidth?: number;
}): Strategy => {
  let outSince: number | null = null;
  return {
    name: `Adaptacyjna k=${opts.k} h=${(opts.hysteresisSec / 3600).toFixed(0)}h${opts.hysteresisUpSec !== undefined ? `/hUp=${(opts.hysteresisUpSec / 3600).toFixed(0)}h` : ''} payback≤${opts.maxPaybackDays}d`,
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
      // kierunek wyjścia w cenie WZGLĘDNEJ bazy: ethIsToken0 → cena ~1.0001^t
      // (górą = t≥hi); eth jako token1 → cena ~1/1.0001^t (górą = t<lo)
      const outUp = ctx.spec.ethIsToken0 ? ctx.ev.t >= p.hi : ctx.ev.t < p.lo;
      const hSec = outUp ? opts.hysteresisUpSec ?? opts.hysteresisSec : opts.hysteresisSec;
      if (ctx.ev.ts - outSince < hSec) return;

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
  /** ASYMETRIA (eksperyment 20.08): osobna histereza przy wyjściu GÓRĄ (jw.) */
  hysteresisUpSec?: number;
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
  /** UP-FALLBACK (pkt 12 DECYZJE-2026-08-26, pomysł Rafała 25.08; tylko
   *  mode:'exit'): wyjście z zakresu GÓRĄ zostawia LP w 100% quote (bazę
   *  sprzedał po drodze) — zamiast czekać całą histerezę bez ekspozycji,
   *  po 1h potwierdzenia przechodzimy na 50/50 HODL (łapiemy betę trendu),
   *  a do LP wracamy po pełnym hUp od WYJŚCIA z zakresu (mechanizm
   *  "nie kupuj szczytu" z hUp48 zostaje nienaruszony). */
  upFallback?: '5050';
  /** SYMETRYCZNY BEZPIECZNIK UP (pomysł Rafała 25.08 noc, po analizie 720d;
   *  tylko mode:'exit'): sygnał UP gdy gap = logP − EMA > próg → wyjście
   *  z LP do 50/50 (HODL łapie betę trendu); sygnał gaśnie przy gap <
   *  próg/2; do LP wracamy, gdy OBA sygnały (down i up) zgaszone = "LP
   *  tylko gdy rynek nie trenduje". Różnica vs upFallback: reaguje na
   *  TREND (wcześnie), nie na wypadnięcie z zakresu (późno). */
  upExitThresh?: number;
  /** (26.08, DECYZJE pkt 10) histereza jako UDZIAŁ CZASU poza zakresem:
   *  zamiast "24h nieprzerwanie, dotknięcie zeruje" — EMA wskaźnika
   *  poza-zakresem ze stałą czasową hysteresisSec (hUp dla wyjścia górą);
   *  rebalans gdy udział > hysteresisShare (np. 0.8). Odporne na
   *  częstotliwość próbkowania — ta sama semantyka wdrażalna w paper
   *  (15 min) i observerze. */
  hysteresisShare?: number;
  /** (26.08, 11f.d — "mniej nerwowy sygnał UP") upExitThresh strzela
   *  dopiero, gdy gap>próg utrzyma się NIEPRZERWANIE przez upConfirmSec
   *  (spadek poniżej progu przed potwierdzeniem zeruje licznik). */
  upConfirmSec?: number;
}): Strategy => {
  let outSince: number | null = null;
  let upCashSince: number | null = null; // czas WYJŚCIA górą, gdy parkujemy 50/50
  let upSig = false; // symetryczny sygnał trendu wzrostowego (upExitThresh)
  let upGapSince: number | null = null; // od kiedy gap>próg (dla upConfirmSec)
  let fracOut = 0; // EMA wskaźnika poza-zakresem (hysteresisShare)
  let prevOutTs: number | null = null;
  let prevOut = false;
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
    if (opts.upExitThresh !== undefined) {
      if (!upSig) {
        if (gap > opts.upExitThresh) {
          if (opts.upConfirmSec === undefined) upSig = true;
          else {
            if (upGapSince === null) upGapSince = ctx.ev.ts;
            if (ctx.ev.ts - upGapSince >= opts.upConfirmSec) upSig = true;
          }
        } else {
          upGapSince = null; // przerwanie ciągłości przed potwierdzeniem
        }
      } else if (gap < opts.upExitThresh / 2) {
        upSig = false; // histereza jak w down
        upGapSince = null;
      }
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
          exitToHalfHalf(ctx); // 50/50: w dół neutralnie, w górę łapie betę
          ctx.state.rebalances++;
          outSince = null;
          upCashSince = null; // bezpiecznik trendu nadpisuje parking z zakresu
          fracOut = 0;
          prevOut = false;
          return;
        }
        if (!down && !upSig && !p) {
          // powrót z parkingu 50/50 po wyjściu górą: pełna histereza hUp
          // liczona od wyjścia z zakresu (jak w wariancie bez fallbacku)
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
      // hysteresisShare: EMA wskaźnika poza-zakresem aktualizowana na KAŻDYM
      // swapie (w zakresie zanika ku 0 — dotknięcie zakresu już nie ZERUJE
      // licznika, tylko go osłabia proporcjonalnie do czasu w zakresie)
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
      if (opts.mode === 'block' && down) return; // czekamy aż trend zgaśnie
      if (outSince === null) outSince = ctx.ev.ts;
      const outUp = ctx.spec.ethIsToken0 ? ctx.ev.t >= p.hi : ctx.ev.t < p.lo;
      const hSec = outUp ? opts.hysteresisUpSec ?? opts.hysteresisSec : opts.hysteresisSec;

      // UP-FALLBACK: po 1h potwierdzenia wyjścia górą → 50/50 HODL (patrz
      // opis opcji); powrót do LP obsługuje gałąź mode:'exit' wyżej.
      if (opts.upFallback && opts.mode === 'exit' && outUp) {
        if (ctx.ev.ts - outSince >= 3600) {
          upCashSince = outSince; // hUp liczone od wyjścia z zakresu, nie od swapa
          exitToHalfHalf(ctx);
          ctx.state.rebalances++;
          outSince = null;
        }
        return; // w oknie potwierdzenia (<1h) nie robimy nic
      }
      // histereza: klasyczna (nieprzerwanie poza, dotknięcie zeruje) ALBO
      // udział czasu w oknie (share, DECYZJE pkt 10 — 26.08)
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
 * 7. F4: Adaptacyjna Z HEDGE PERP zamiast wyjścia z LP.
 *
 * W czasie sygnału DOWN (ten sam detektor EMA co volAdaptiveTrend) pozycja LP
 * ZOSTAJE (dalej zbiera fees), a deltę ETH neutralizuje short ETH-perp:
 *  - sizing 'full'   — short = cała ekspozycja ETH (delta→0; maksymalna obrona,
 *    w oknach up/flat z sygnałem płaci odbiciem),
 *  - sizing 'excess' — short = nadwyżka ETH ponad 50% wartości portfela
 *    (neutralizuje tylko wypukłość LP względem HODL 50/50 — uczciwsze vsHODL).
 * Koszty: taker takerBps na każdej korekcie shorta + FUNDING historyczny
 * (fundingAt: r za 8h; konwencja perpów: r>0 → short DOSTAJE funding, r<0 →
 * short płaci — w bearach r bywa ujemny i to jest główny koszt tej obrony).
 * Uproszczenia (świadome, opisać przy wnioskach): cross-margin bez modelu
 * depozytu/likwidacji; PnL shorta rozliczany na bieżąco do nogi stable
 * (może chwilowo zejść pod zero); tylko pule quote:'USD'.
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
    if (ctx.spec.quote === 'WETH') throw new Error('volAdaptiveHedge: tylko pule quote USD');
    const P = ethUsd(ctx.ev.sqrtP, ctx.spec);
    const leg = stableLeg(ctx);
    // 1. rozliczenie istniejącego shorta: PnL ceny + funding
    if (shortSize > 0) {
      const pnl = shortSize * (shortLastP - P);
      const dt = Math.max(ctx.ev.ts - shortLastTs, 0);
      const funding = shortSize * P * opts.fundingAt(ctx.ev.ts) * (dt / 28_800);
      ctx.state[leg] += pnl + funding;
    }
    shortLastP = P;
    shortLastTs = ctx.ev.ts;
    // 2. docelowy rozmiar
    let target = 0;
    if (down) {
      const exp = ethExposure(ctx);
      target = opts.sizing === 'full' ? exp : Math.max(0, exp - ctx.valueUsd() / 2 / P);
    }
    // 3. korekta z pasmem 15% (koszt taker na obrocie)
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
  volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }), // zwycięzca sweepu base-030
  volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 12 * 3600, maxPaybackDays: 7 }),
  volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
];
