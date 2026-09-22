/**
 * fullperiod.ts — full-period simulation "I put in $X once and hold the
 * strategy for the WHOLE cache period" (Rafal's question 26.08: "2 years ago
 * I put in $5k — what would have happened to it?").
 *
 * This is a COMPLEMENTARY view to walkforward.ts (the gate): here there is one
 * entry point (start of the series) and compounding until today — i.e. real
 * dollar amounts; walkforward evaluates ~46 different entry moments in 30d
 * windows and answers the question of robustness to timing. A full-period
 * result can flatter or punish a strategy through the mere choice of start
 * date — that is why the gate stays on windows; this table serves INTUITION
 * and the conversation about amounts.
 *
 * Usage: [SIGMA_MODE=grid15] npx tsx backtest/fullperiod.ts <poolId> [startUsd=5000]
 *   e.g. the WF recal set on the new σ:
 *   SIGMA_MODE=grid15 npx tsx backtest/fullperiod.ts base-cbbtc-weth-005-720d 5000
 */
import { runStrategy, ethUsd, Strategy, RunResult } from './engine';
import { hodl5050, cash100, passiveWide, passiveW, passiveAsym, fixedNaive, fixedNaiveAsym, innerTrig, flatOnlyLP, volAdaptive, volAdaptiveTrend } from './strategies';
import { loadPool } from './load';

const id = process.argv[2];
const startUsd = Number(process.argv[3] ?? 5000);
if (!id) {
  console.error('Usage: npx tsx backtest/fullperiod.ts <poolId> [startUsd]');
  process.exit(1);
}
(async () => {
const loaded = await loadPool(id);
if (!loaded) {
  console.error(`No cache for ${id}`);
  process.exit(1);
}
let { swaps } = loaded;
const { spec } = loaded;
// FP_DAYS=N (27.08, Rafal's question about "the last 3 months"): trim the
// series to the last N days of the cache — entry in the middle of history
// instead of at the beginning.
const fpDays = Number(process.env.FP_DAYS ?? 0);
if (fpDays > 0 && swaps.length) {
  const cutoff = swaps[swaps.length - 1].ts - fpDays * 86400;
  swaps = swaps.filter((s) => s.ts >= cutoff);
  if (!swaps.length) {
    console.error(`FP_DAYS=${fpDays}: empty series after trimming`);
    process.exit(1);
  }
}
const t0 = swaps[0].ts, t1 = swaps[swaps.length - 1].ts;
const days = (t1 - t0) / 86400;
const p0 = ethUsd(swaps[0].sqrtP, spec);
const p1 = ethUsd(swaps[swaps.length - 1].sqrtP, spec);

// sets: default = same as WF_SET=recal; FP_SET=final = final round 26.08
// (wide-passive + flatOnly-HODL) — keep in sync with walkforward.ts by hand
const trendBase = { k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, trendHLDays: 7, trendThresh: 0.05 } as const;
const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
const flatBase = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, idle: 'hodl' as const };
const finalSet: Strategy[] = [
  hodl5050,
  cash100,
  passiveW(0.4),
  passiveWide,
  passiveW(0.6),
  fixedNaive(0.5),
  flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600 }),
  flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
  flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
  flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.03, exitThresh: 0.06, confirmSec: 24 * 3600 }),
  volAdaptiveTrend(v11),
];
const recalSet: Strategy[] = [
  hodl5050,
  passiveWide,
  fixedNaive(0.3),
  volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
  volAdaptiveTrend({ ...v11, k: 2 }),
  volAdaptiveTrend({ ...v11, k: 2.5 }),
  volAdaptiveTrend(v11),
  volAdaptiveTrend({ ...v11, k: 4 }),
  volAdaptiveTrend({ ...v11, hysteresisSec: 48 * 3600 }),
  volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600 }),
  volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit' }),
  volAdaptiveTrend({ ...trendBase, k: 3, mode: 'exit' }),
  volAdaptiveTrend({ ...v11, upExitThresh: 0.05 }),
  volAdaptiveTrend({ ...v11, upExitThresh: 0.08 }),
];
const hybridSet: Strategy[] = [
  hodl5050,
  passiveW(0.4),
  flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }), // idle:'hodl' from flatBase
  flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600, idle: 'passive', passiveWidth: 0.4 }),
  flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600, idle: 'passive', passiveWidth: 0.4 }),
  flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600, idle: 'passive', passiveWidth: 0.5 }),
];
// FP_SET=product (29.08, Rafal's question "I enter with $2500 two years ago —
// how much comes out after 720 days?"): exactly the product we play live,
// i.e. the FlatWide hybrid with a FIXED width of the narrow leg (±5% = exit
// threshold), not kxσx√7 from the v1.2 advisor. The ±4/±5/±8% variants show
// the cost and gain of changing that single parameter; `kxσ` = the product
// from before 29.08 (the one that passed walkforward — hence it is in the set:
// we want to see whether the width change does not break the FULL-PERIOD
// result, not only the episode EV). Both idle widths (±40 cbBTC / ±50
// base-030) in one set — read the row matching the pool.
const productBase = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600, idle: 'passive' as const };
const productSet: Strategy[] = [
  hodl5050,
  cash100,
  passiveW(0.4),
  passiveW(0.5),
  flatOnlyLP({ ...productBase, passiveWidth: 0.4, narrowWidth: 0.05 }),
  flatOnlyLP({ ...productBase, passiveWidth: 0.5, narrowWidth: 0.05 }),
  flatOnlyLP({ ...productBase, passiveWidth: 0.4, narrowWidth: 0.04 }),
  flatOnlyLP({ ...productBase, passiveWidth: 0.5, narrowWidth: 0.04 }),
  flatOnlyLP({ ...productBase, passiveWidth: 0.4, narrowWidth: 0.08 }),
  flatOnlyLP({ ...productBase, passiveWidth: 0.5, narrowWidth: 0.08 }),
  flatOnlyLP({ ...productBase, passiveWidth: 0.4 }), // kxσx√7 — the product from before 29.08
  flatOnlyLP({ ...productBase, passiveWidth: 0.5 }),
  // 29.08, Rafal's idea: re-posturing WITHOUT a swap (range shifted to match
  // the portfolio composition, up to and including one-sided) — the same
  // product, a different way of executing the transition
  flatOnlyLP({ ...productBase, passiveWidth: 0.4, narrowWidth: 0.05, recenter: 'noswap' }),
  flatOnlyLP({ ...productBase, passiveWidth: 0.5, narrowWidth: 0.05, recenter: 'noswap' }),
];
// FP_SET=shape (02.09, two ideas from the brief — the SHAPE of the wide leg,
// not its steering):
//  (3) SKEWED RANGE: rangeAround is symmetric in LOG-price, so the product's
//      "±50%" = −33%/+50% in price — less room on the downside, and the
//      downside is what hurts (MC 01.09). Variants: truly symmetric −50/+50,
//      skewed down −60/+35, −65/+30, −70/+25; for cbBTC (±40):
//      −40/+40, −50/+30, −55/+25. Read the row matching the pool.
//  (4) BARBELL: two static positions (½ narrow ±15/±20%, ½ wide) — the engine
//      holds one position, but the result is linear in capital, so barbell =
//      the AVERAGE of two rows: e.g. ½·[Wewn. ±15% recentr. gdy poza −33/+50]
//      + ½·[Pasywny ±50%]. The "never touch" version = ½·[Pasywny ±15%]
//      + ½·[Pasywny ±50%]. For comparison: all capital in [Pasywny ±50%].
// Gate as always: fullperiod is an illustration, WF_SET=shape decides.
const productHybrid = (asym: [number, number]) =>
  flatOnlyLP({ ...productBase, passiveWidth: 0.5, narrowWidth: 0.05, passiveAsym: asym });
const shapeSet: Strategy[] = [
  hodl5050,
  passiveW(0.4), // = −29/+40 in price (cbBTC today)
  passiveW(0.5), // = −33/+50 in price (base-030 today)
  // (3) skewed range — passive
  passiveAsym(0.5, 0.5),
  passiveAsym(0.6, 0.35),
  passiveAsym(0.65, 0.3),
  passiveAsym(0.7, 0.25),
  passiveAsym(0.4, 0.4),
  passiveAsym(0.5, 0.3),
  passiveAsym(0.55, 0.25),
  // (3) skewed range — full hybrid (asymmetric wide leg, narrow ±5%)
  productHybrid([0.6, 0.35]),
  productHybrid([0.65, 0.3]),
  // (4) barbell — legs to be averaged with passiveW(0.5)/(0.4)
  passiveW(0.15),
  passiveW(0.2),
  innerTrig(0.15, 1 / 3, 0.5),
  innerTrig(0.2, 1 / 3, 0.5),
  innerTrig(0.15, 0.29, 0.4),
  fixedNaive(0.5), // wide leg with recentering after exit (pair to innerTrig)
  fixedNaiveAsym(0.6, 0.35),
];
const strategies: Strategy[] =
  process.env.FP_SET === 'final' ? finalSet
    : process.env.FP_SET === 'hybrid' ? hybridSet
    : process.env.FP_SET === 'product' ? productSet
    : process.env.FP_SET === 'shape' ? shapeSet
    : recalSet;

console.log(
  `${id}: ${swaps.length} swaps, ${days.toFixed(0)} days · start $${startUsd} · ` +
    `base price ${p0.toFixed(2)} → ${p1.toFixed(2)} (${(((p1 - p0) / p0) * 100).toFixed(1)}%) · ` +
    `SIGMA_MODE=${process.env.SIGMA_MODE ?? 'swap'}\n`
);

const results: RunResult[] = [];
for (const s of strategies) {
  const r = runStrategy(swaps, spec, s, startUsd);
  results.push(r);
  process.stderr.write(`  done: ${r.name}\n`);
}
const hodl = results.find((r) => r.name === 'HODL 50/50')!;

const fmt = (n: number, w = 9) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }).padStart(w);
const pct = (n: number, w = 7) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`.padStart(w);

console.log(
  'strategy'.padEnd(52) + 'final$'.padStart(9) + 'PnL$'.padStart(9) + 'PnL%'.padStart(8) +
  'fees$'.padStart(8) + 'costs$'.padStart(9) + 'reb'.padStart(5) + 'inRng'.padStart(7) +
  'maxDD'.padStart(8) + 'vsHODL$'.padStart(9)
);
for (const r of [...results].sort((a, b) => b.finalUsd - a.finalUsd)) {
  const costs = r.gasUsd + r.swapCostUsd;
  console.log(
    r.name.padEnd(52) + fmt(r.finalUsd) + fmt(r.finalUsd - startUsd) +
    pct(((r.finalUsd - startUsd) / startUsd) * 100, 8) + fmt(r.feesUsd, 8) + fmt(costs) +
    String(r.rebalances).padStart(5) + `${r.inRangePct.toFixed(0)}%`.padStart(7) +
    pct(-Math.abs(r.maxDrawdownPct), 8) + fmt(r.finalUsd - hodl.finalUsd)
  );
}
console.log(
  '100% USDC (do nothing)'.padEnd(52) + fmt(startUsd) + fmt(0) + pct(0, 8) +
  fmt(0, 8) + fmt(0) + '0'.padStart(5) + '—'.padStart(7) + pct(0, 8) + fmt(startUsd - hodl.finalUsd)
);
console.log(
  `\nINTERPRETATION NOTE: a single entry point (${new Date(t0 * 1000).toISOString().slice(0, 10)}) — ` +
  `the result depends on that date; robustness to timing is measured by walkforward (the gate), not by this table.`
);
})();
