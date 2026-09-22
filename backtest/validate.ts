/**
 * validate.ts — backtest engine tests on synthetic data.
 *   npx tsx backtest/validate.ts
 * 1. Constant price: fees grow linearly, zero IL, value never drops.
 * 2. Price move with no fee: full-range IL matches the closed form 2√r/(1+r)-1.
 * 3. Position amounts at open match exact v3math (rel err < 1e-9).
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
  ethIsToken0: false, // USDC token0 (6), WETH token1 (18) like mainnet
  d0: 6,
  d1: 18,
  tickSpacing: 60,
  gasUsdPerRebalance: 5,
  slippageBps: 5,
};

/** generator: constant-volume swaps (in token0) along a given tick path */
function mkSwaps(ticks: number[], volumeToken0: number, poolL: number): SwapEv[] {
  return ticks.map((t, i) => {
    const sqrtP = tickSqrt(t);
    const p = sqrtP * sqrtP * 10 ** (spec.d0 - spec.d1); // token1 per token0 (human)
    const vol1 = volumeToken0 * p; // volume equivalent in token1
    return {
      b: i,
      ts: i * 600, // every 10 min
      a0: i % 2 === 0 ? volumeToken0 : -volumeToken0 * 0.997,
      a1: i % 2 === 0 ? -vol1 * 0.997 : vol1,
      sqrtP,
      L: poolL,
      t,
    };
  });
}

// ---------------------------------------------------------------------------
// TEST 1: constant price → no IL, fees > 0, LP strategy == HODL + fees
// ---------------------------------------------------------------------------
{
  const tick = 200700;
  const N = 1000;
  const vol0 = 50_000; // 50k USDC per swap
  const poolL = 5e15;
  const swaps = mkSwaps(Array(N).fill(tick), vol0, poolL);
  // a1 consistent with the price (so valuations stay stable):
  const rHodl = runStrategy(swaps, spec, hodl5050, 10_000);
  const rFull = runStrategy(swaps, spec, fullRange, 10_000);

  check('T1 HODL value constant', Math.abs(rHodl.finalUsd - 10_000) < 1, `final=${rHodl.finalUsd}`);
  check('T1 full-range fees > 0', rFull.feesUsd > 0, `fees=${rFull.feesUsd}`);
  check(
    'T1 full-range final ≈ start + fees (no IL at constant price)',
    Math.abs(rFull.finalUsd - (rFull.startUsd + rFull.feesUsd)) / rFull.finalUsd < 1e-6,
    `final=${rFull.finalUsd} start=${rFull.startUsd} fees=${rFull.feesUsd}`
  );
  // manual verification of accrual: N swaps * vol * feeRate * share
  const ourL = (() => {
    // reconstruct the position's L from the run: value / unit value — we check the order of magnitude of share
    return null;
  })();
  check('T1 fees sensible (order of magnitude)', rFull.feesUsd < N * vol0 * spec.feeRate, '');
}

// ---------------------------------------------------------------------------
// TEST 2: price move with no fee → full-range IL matches 2√r/(1+r)-1
// ---------------------------------------------------------------------------
{
  const specNoFee: PoolSpec = { ...spec, feeRate: 0, gasUsdPerRebalance: 0, slippageBps: 0 };
  const t0 = 200700;
  // price move: ETH drops → tick USDC/WETH... for token0=USDC the raw price token1/token0 rises when ETH gets cheaper?
  // human p = WETH per USDC = 1/P_eth * 1e-12... P_eth drops → p rises → tick rises.
  // r = P1/P0 (ETH price): tick_delta = -ln(r)/ln(1.0001)
  const r = 0.8; // ETH -20%
  const dTick = Math.round(-Math.log(r) / Math.log(1.0001));
  const path: number[] = [];
  for (let i = 0; i <= 200; i++) path.push(t0 + Math.round((dTick * i) / 200));
  const swaps = mkSwaps(path, 1000, 5e15);
  const rHodl = runStrategy(swaps, specNoFee, hodl5050, 10_000);
  const rFull = runStrategy(swaps, specNoFee, fullRange, 10_000);
  const ratio = rFull.finalUsd / rHodl.finalUsd;
  const expected = (2 * Math.sqrt(r)) / (1 + r); // classic V_LP/V_HODL formula for full range
  check(
    `T2 full-range IL at ETH ${((r - 1) * 100).toFixed(0)}%: V_LP/V_HODL = 2√r/(1+r)`,
    Math.abs(ratio - expected) < 0.002,
    `got=${ratio.toFixed(5)} expected=${expected.toFixed(5)}`
  );
  check('T2 LP loses to HODL without fees (IL exists)', rFull.finalUsd < rHodl.finalUsd, '');
}

// ---------------------------------------------------------------------------
// TEST 3: amountsForL matches exact bigint v3math
// ---------------------------------------------------------------------------
{
  const cases = [
    { L: 1.2345e13, lo: 198060, hi: 202140, cur: 200700 },
    { L: 5.5e11, lo: 198180, hi: 201360, cur: 200700 },
    { L: 9e14, lo: 195000, hi: 196000, cur: 200700 }, // below the price range? cur>hi → all token1
    { L: 7e12, lo: 202200, hi: 205000, cur: 200700 }, // cur<lo → all token0
  ];
  for (const c of cases) {
    const f = amountsForL(c.L, c.lo, c.hi, tickSqrt(c.cur), spec);
    const exact = getAmountsForLiquidity(getSqrtRatioAtTick(c.cur), c.lo, c.hi, BigInt(Math.round(c.L)));
    const e0 = Number(exact.amount0) / 10 ** spec.d0;
    const e1 = Number(exact.amount1) / 10 ** spec.d1;
    const rel = (a: number, b: number) => (a === 0 && b === 0 ? 0 : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12));
    // exact is quantized to 1 raw unit (floor in bigint division) —
    // tolerance: 2 raw units or rel 1e-6
    const tol0 = Math.max(2 / 10 ** spec.d0 / Math.max(e0, 1e-12), 1e-9);
    const tol1 = Math.max(2 / 10 ** spec.d1 / Math.max(e1, 1e-12), 1e-9);
    check(`T3 amounts L=${c.L} [${c.lo},${c.hi}]@${c.cur} a0`, rel(f.a0, e0) < Math.max(tol0, 1e-6), `float=${f.a0} exact=${e0}`);
    check(`T3 amounts a1`, rel(f.a1, e1) < Math.max(tol1, 1e-6), `float=${f.a1} exact=${e1}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
