/**
 * engine.ts — symulator pozycji LP Uniswap v3, swap-po-swapie.
 *
 * KONWENCJA DOKŁADNOŚCI: symulator liczy na float (double, ~15 cyfr) — to
 * wystarcza do PORÓWNYWANIA strategii. Ale sqrt(price) dla ticków bierzemy
 * z dokładnego v3math (bigint → Number, błąd 1 ulp), więc geometria pozycji
 * jest identyczna z produkcją. Silnik produkcyjny (bot) pozostaje bigint-only.
 *
 * ZNANE PRZYBLIŻENIA (świadome, do wyostrzenia w v2):
 *  - naliczanie fee używa ticku PO swapie (swap przecinający granicę zakresu
 *    jest zaliczany w całości albo wcale) — błąd maleje z liczbą swapów;
 *  - nasz udział w fee = L/(L_pool + L); zakładamy, że nasza płynność nie
 *    zmienia ścieżki cen (prawda przy $5-25k w pulach $5M+);
 *  - koszt swapu przy rebalansie = fee tier puli + slippageBps na obrocie.
 */
import { getSqrtRatioAtTick, MIN_TICK, MAX_TICK } from '../src/utils/v3math';

export interface SwapEv {
  b: number; // block
  ts: number; // unix (interpolowany z anchorów)
  a0: number; // amount0 (human units, znak: >0 = wpłynęło do puli)
  a1: number;
  sqrtP: number; // sqrt(raw price) — bez korekty decimals
  L: number; // aktywna płynność puli (raw)
  t: number; // tick po swapie
}

export interface PoolSpec {
  id: string;
  feeRate: number; // 0.0005 dla 0.05%
  ethIsToken0: boolean;
  d0: number;
  d1: number;
  tickSpacing: number;
  gasUsdPerRebalance: number; // pełny cykl: burn+collect+swap+mint
  slippageBps: number; // dodatkowy koszt obrotu przy rebalansie
}

/** sqrt(raw) dla ticku — z dokładnego v3math */
export const tickSqrt = (tick: number): number => Number(getSqrtRatioAtTick(tick)) / 2 ** 96;

/** human price token1/token0 z raw sqrt */
export const humanP = (sqrtP: number, spec: PoolSpec) => sqrtP * sqrtP * 10 ** (spec.d0 - spec.d1);

/** cena ETH w USD wg orientacji puli (para ETH/stable) */
export const ethUsd = (sqrtP: number, spec: PoolSpec) => {
  const p = humanP(sqrtP, spec);
  return spec.ethIsToken0 ? p : 1 / p;
};

/** ceny jednostkowe token0/token1 w USD (dla par ETH/stable) */
export const unitPrices = (sqrtP: number, spec: PoolSpec): { px0: number; px1: number } => {
  const E = ethUsd(sqrtP, spec);
  return spec.ethIsToken0 ? { px0: E, px1: 1 } : { px0: 1, px1: E };
};

/** ilości tokenów (human units) dla płynności L_raw w zakresie [lo,hi] przy sqrtP */
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

/** maksymalna L_raw osiągalna z budżetu (a0,a1 human) w zakresie [lo,hi] */
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
  fees0: number; // human units, nieodebrane
  fees1: number;
}

export interface PortfolioState {
  cash0: number; // human units poza pozycją
  cash1: number;
  pos: Position | null;
  // statystyki
  feesUsd: number;
  gasUsd: number;
  swapCostUsd: number;
  rebalances: number;
}

export interface Ctx {
  spec: PoolSpec;
  state: PortfolioState;
  ev: SwapEv;
  /** EWMA zmienności dziennej log-returnów ceny ETH */
  volDaily: number;
  /** trailing: fee wolumen puli / wartość aktywnej płynności (dzienny yield estymowany) */
  poolFeeYieldDaily: number;
  valueUsd(): number;
  /** zamknij pozycję do cash (bez kosztu gazu — składnik rebalansu) */
  closePosition(): void;
  /** otwórz pozycję na CAŁYM dostępnym cash w zakresie [lo,hi]; auto-swap do proporcji */
  openPosition(lo: number, hi: number): void;
  /** pełny rebalans = close + open + koszty gazu */
  rebalance(lo: number, hi: number): void;
  /** wyrównaj cash do 50/50 USD (używane przez HODL na starcie) */
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
  vsHodlPct: number; // wypełniane przez runner po przebiegu HODL
  maxDrawdownPct: number;
  feesUsd: number;
  gasUsd: number;
  swapCostUsd: number;
  rebalances: number;
  inRangePct: number;
  equity: Array<{ ts: number; usd: number; eth: number }>; // krzywa kapitału (probkowana)
}

export function runStrategy(
  swaps: SwapEv[],
  spec: PoolSpec,
  strategy: Strategy,
  startCapitalUsd: number
): RunResult {
  const s0 = swaps[0];
  const px = unitPrices(s0.sqrtP, spec);
  const state: PortfolioState = {
    // start: 50/50 USD w obu tokenach
    cash0: (startCapitalUsd / 2) / px.px0,
    cash1: (startCapitalUsd / 2) / px.px1,
    pos: null,
    feesUsd: 0,
    gasUsd: 0,
    swapCostUsd: 0,
    rebalances: 0,
  };

  let volDaily = 0.03; // start prior 3%/dzień
  let lastTs = s0.ts;
  let lastP = ethUsd(s0.sqrtP, spec);
  // trailing yield puli (fee/aktywna płynność) — EWMA dzienna
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
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      const totalUsd = state.cash0 * px0 + state.cash1 * px1;
      // docelowe proporcje dla zakresu
      const unit = amountsForL(1e18, lo, hi, ev.sqrtP, spec);
      const unitUsd = unit.a0 * px0 + unit.a1 * px1;
      const Ltarget = (totalUsd / unitUsd) * 1e18;
      let need0 = (Ltarget / 1e18) * unit.a0;
      let need1 = (Ltarget / 1e18) * unit.a1;
      // koszt swapu: obrót |delta| od aktualnego cash do proporcji docelowych
      const delta0 = need0 - state.cash0; // >0 = musimy dokupić token0
      const turnoverUsd = Math.abs(delta0) * px0;
      const costUsd = turnoverUsd * (spec.feeRate + spec.slippageBps / 10_000);
      state.swapCostUsd += costUsd;
      // koszt zdejmujemy proporcjonalnie z obu stron (upraszczenie)
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
      // gas płacony "z zewnątrz"? NIE — uczciwie: z kapitału (proporcjonalnie w tokenie stable)
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
    // 1. aktualizacja zmienności (EWMA na log-returnach, half-life ~12h)
    const P = ethUsd(ev.sqrtP, spec);
    const dt = Math.max(ev.ts - lastTs, 1);
    if (P > 0 && lastP > 0 && dt > 0) {
      const r = Math.log(P / lastP);
      const perDay = (r * r * 86400) / dt; // wariancja przeskalowana na dzień
      const alpha = 1 - Math.exp(-dt / (43200 / Math.LN2));
      volDaily = Math.sqrt((1 - alpha) * volDaily * volDaily + alpha * perDay);
    }

    // 2. trailing fee yield puli: fee wolumenu / wartość aktywnej płynności
    {
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      const feeUsd = (ev.a0 > 0 ? ev.a0 * px0 : ev.a1 * px1) * spec.feeRate;
      // wartość aktywnej płynności w wąskim paśmie: przybliżenie ±1 tickSpacing
      const t = ev.t;
      const act = amountsForL(ev.L, t - spec.tickSpacing, t + spec.tickSpacing, ev.sqrtP, spec);
      const actUsd = act.a0 * px0 + act.a1 * px1;
      if (actUsd > 0 && feeUsd >= 0) {
        const instDaily = (feeUsd / actUsd) * (86400 / dt);
        const alpha = 1 - Math.exp(-dt / (86400 / Math.LN2)); // half-life 1 dzień
        poolFeeYieldDaily = (1 - alpha) * poolFeeYieldDaily + alpha * instDaily;
      }
    }

    // 3. naliczenie fee dla naszej pozycji
    if (state.pos && ev.t >= state.pos.lo && ev.t < state.pos.hi && ev.L > 0) {
      const share = state.pos.L / (ev.L + state.pos.L);
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
    if (state.pos) posEvents++;

    // 4. strategia
    const ctx = mkCtx(ev);
    ctx.volDaily = volDaily;
    ctx.poolFeeYieldDaily = poolFeeYieldDaily;
    strategy.onEvent(ctx);

    // 5. próbkowanie equity (co ~1h) + drawdown
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
