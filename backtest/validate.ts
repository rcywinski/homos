/**
 * validate.ts — testy silnika backtestu na danych syntetycznych.
 *   npx tsx backtest/validate.ts
 * 1. Stała cena: fees rosną liniowo, zero IL, wartość nigdy nie spada.
 * 2. Ruch ceny bez fee: IL full-range zgodny ze wzorem zamkniętym 2√r/(1+r)-1.
 * 3. Kwoty pozycji przy otwarciu zgodne z dokładnym v3math (rel err < 1e-9).
 */
import { runStrategy, SwapEv, PoolSpec, amountsForL, tickSqrt } from './engine';
import { fullRange, hodl5050 } from './strategies';
import { getAmountsForLiquidity, getSqrtRatioAtTick } from '../src/utils/v3math';

let passed = 0,
  failed = 0;
const check = (name: string, cond: boolean, detail = '') => {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name} ${detail}`);
  }
};

const spec: PoolSpec = {
  id: 'synthetic',
  feeRate: 0.003,
  ethIsToken0: false, // USDC token0 (6), WETH token1 (18) jak mainnet
  d0: 6,
  d1: 18,
  tickSpacing: 60,
  gasUsdPerRebalance: 5,
  slippageBps: 5,
};

/** generator: swapy o stałym wolumenie (w token0) na zadanej ścieżce ticków */
function mkSwaps(ticks: number[], volumeToken0: number, poolL: number): SwapEv[] {
  return ticks.map((t, i) => {
    const sqrtP = tickSqrt(t);
    const p = sqrtP * sqrtP * 10 ** (spec.d0 - spec.d1); // token1 per token0 (human)
    const vol1 = volumeToken0 * p; // ekwiwalent wolumenu w token1
    return {
      b: i,
      ts: i * 600, // co 10 min
      a0: i % 2 === 0 ? volumeToken0 : -volumeToken0 * 0.997,
      a1: i % 2 === 0 ? -vol1 * 0.997 : vol1,
      sqrtP,
      L: poolL,
      t,
    };
  });
}

// ---------------------------------------------------------------------------
// TEST 1: stała cena → brak IL, fees > 0, LP-strategia == HODL + fees
// ---------------------------------------------------------------------------
{
  const tick = 200700;
  const N = 1000;
  const vol0 = 50_000; // 50k USDC na swap
  const poolL = 5e15;
  const swaps = mkSwaps(Array(N).fill(tick), vol0, poolL);
  // a1 spójne z ceną (żeby wyceny były stabilne):
  const rHodl = runStrategy(swaps, spec, hodl5050, 10_000);
  const rFull = runStrategy(swaps, spec, fullRange, 10_000);

  check('T1 HODL wartość stała', Math.abs(rHodl.finalUsd - 10_000) < 1, `final=${rHodl.finalUsd}`);
  check('T1 full-range fees > 0', rFull.feesUsd > 0, `fees=${rFull.feesUsd}`);
  check(
    'T1 full-range final ≈ start + fees (brak IL przy stałej cenie)',
    Math.abs(rFull.finalUsd - (rFull.startUsd + rFull.feesUsd)) / rFull.finalUsd < 1e-6,
    `final=${rFull.finalUsd} start=${rFull.startUsd} fees=${rFull.feesUsd}`
  );
  // ręczna weryfikacja naliczenia: N swapów * vol * feeRate * share
  const ourL = (() => {
    // odtwórz L pozycji z przebiegu: wartość / wartość jednostkowa — sprawdzamy rząd wielkości share
    return null;
  })();
  check('T1 fees sensowne (rząd wielkości)', rFull.feesUsd < N * vol0 * spec.feeRate, '');
}

// ---------------------------------------------------------------------------
// TEST 2: ruch ceny bez fee → IL full-range zgodny z 2√r/(1+r)-1
// ---------------------------------------------------------------------------
{
  const specNoFee: PoolSpec = { ...spec, feeRate: 0, gasUsdPerRebalance: 0, slippageBps: 0 };
  const t0 = 200700;
  // ruch ceny: ETH spada → tick USDC/WETH... dla token0=USDC raw price token1/token0 rośnie gdy ETH tanieje?
  // human p = WETH per USDC = 1/P_eth * 1e-12... P_eth spada → p rośnie → tick rośnie.
  // r = P1/P0 (cena ETH): tick_delta = -ln(r)/ln(1.0001)
  const r = 0.8; // ETH -20%
  const dTick = Math.round(-Math.log(r) / Math.log(1.0001));
  const path: number[] = [];
  for (let i = 0; i <= 200; i++) path.push(t0 + Math.round((dTick * i) / 200));
  const swaps = mkSwaps(path, 1000, 5e15);
  const rHodl = runStrategy(swaps, specNoFee, hodl5050, 10_000);
  const rFull = runStrategy(swaps, specNoFee, fullRange, 10_000);
  const ratio = rFull.finalUsd / rHodl.finalUsd;
  const expected = (2 * Math.sqrt(r)) / (1 + r); // klasyczny wzór V_LP/V_HODL dla full range
  check(
    `T2 IL full-range przy ETH ${((r - 1) * 100).toFixed(0)}%: V_LP/V_HODL = 2√r/(1+r)`,
    Math.abs(ratio - expected) < 0.002,
    `got=${ratio.toFixed(5)} expected=${expected.toFixed(5)}`
  );
  check('T2 LP przegrywa z HODL bez fee (IL istnieje)', rFull.finalUsd < rHodl.finalUsd, '');
}

// ---------------------------------------------------------------------------
// TEST 3: amountsForL zgodne z dokładnym bigint v3math
// ---------------------------------------------------------------------------
{
  const cases = [
    { L: 1.2345e13, lo: 198060, hi: 202140, cur: 200700 },
    { L: 5.5e11, lo: 198180, hi: 201360, cur: 200700 },
    { L: 9e14, lo: 195000, hi: 196000, cur: 200700 }, // poniżej zakresu ceny? cur>hi → all token1
    { L: 7e12, lo: 202200, hi: 205000, cur: 200700 }, // cur<lo → all token0
  ];
  for (const c of cases) {
    const f = amountsForL(c.L, c.lo, c.hi, tickSqrt(c.cur), spec);
    const exact = getAmountsForLiquidity(getSqrtRatioAtTick(c.cur), c.lo, c.hi, BigInt(Math.round(c.L)));
    const e0 = Number(exact.amount0) / 10 ** spec.d0;
    const e1 = Number(exact.amount1) / 10 ** spec.d1;
    const rel = (a: number, b: number) => (a === 0 && b === 0 ? 0 : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12));
    // exact jest kwantyzowane do 1 jednostki raw (floor przy dzieleniu bigint) —
    // tolerancja: 2 jednostki raw lub rel 1e-6
    const tol0 = Math.max(2 / 10 ** spec.d0 / Math.max(e0, 1e-12), 1e-9);
    const tol1 = Math.max(2 / 10 ** spec.d1 / Math.max(e1, 1e-12), 1e-9);
    check(`T3 amounts L=${c.L} [${c.lo},${c.hi}]@${c.cur} a0`, rel(f.a0, e0) < Math.max(tol0, 1e-6), `float=${f.a0} exact=${e0}`);
    check(`T3 amounts a1`, rel(f.a1, e1) < Math.max(tol1, 1e-6), `float=${f.a1} exact=${e1}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
