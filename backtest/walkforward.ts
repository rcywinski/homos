/**
 * walkforward.ts — strategy robustness test on rolling windows
 * + SPLIT BY REGIME (B2 from RESEARCH-QUEUE).
 *
 *   npx tsx backtest/walkforward.ts <pool-id> [windowDays=30] [stepDays=15]
 *
 * Instead of a single run (result dominated by 1-3 rebalance decisions)
 * we cut the history into overlapping windows and measure the distribution:
 * mean/median vsHODL, % of windows won, worst window. A strategy is "sound"
 * only when it wins in the majority of windows, not in a single run.
 *
 * REGIMES: each window is tagged by the change of the pair's RELATIVE price in the window
 * (P_end/P_start − 1): up > +10%, down < −10%, flat in between. The per-regime
 * report answers the B1 question: are the worst windows the trend windows
 * (if so, the improvement lies in the trend safety switch/hedge, not in tuning k/h).
 * PLAN.md gate: the strategy must win in ≥2 regimes.
 *
 * Output: backtest/results/walkforward-<id>-<windowDays>d.json
 * (name includes the window — previously a 45d run overwrote the 60d result).
 */
import * as fs from 'fs';
import * as path from 'path';
import { runStrategy, Strategy, ethUsd } from './engine';
import { hodl5050, cash100, flatOnlyLP, passiveWide, passiveW, passiveAsym, fixedNaive, innerTrig, volAdaptive, volAdaptiveTrend, volAdaptiveHedge } from './strategies';
import { loadPool, loadFunding } from './load'; // shared loader (also handles quote:'WETH' pairs)

const OUT = path.join(__dirname, 'results');

const pct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);

type Regime = 'up' | 'down' | 'flat';
const REGIME_THRESHOLD = 0.10; // ±10% relative price change within the window

(async () => {
  const id = process.argv[2] || 'base-weth-usdc-030';
  const windowDays = Number(process.argv[3] || 30);
  const stepDays = Number(process.argv[4] || 15);
  const loaded = await loadPool(id);
  if (!loaded) {
    console.error(`No cache for ${id}`);
    process.exit(1);
  }
  const { swaps, spec } = loaded;
  const t0 = swaps[0].ts, t1 = swaps[swaps.length - 1].ts;
  const totalDays = (t1 - t0) / 86400;
  console.log(`${id}: ${swaps.length} swaps, ${totalDays.toFixed(1)} days · windows ${windowDays}d every ${stepDays}d · regime: ±${REGIME_THRESHOLD * 100}%\n`);

  const trendBase = { k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, trendHLDays: 7, trendThresh: 0.05 } as const;
  // set controlled by env WF_SET: 'hedge' = F4 (perp hedge; requires
  // data/funding/ETHUSDT.json), 'trend-sweep' = exit variants, default canon.
  const fundingAt = loadFunding('ETHUSDT');
  const mkHedge = (): Strategy[] => {
    if (!fundingAt) {
      console.error('WF_SET=hedge requires data/funding/ETHUSDT.json — first run: npx tsx scripts/fetch-funding.ts ETHUSDT 400');
      process.exit(1);
    }
    return [
      hodl5050,
      volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
      volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }), // default v1.1
      volAdaptiveHedge({ ...trendBase, sizing: 'full', fundingAt }),
      volAdaptiveHedge({ ...trendBase, sizing: 'excess', fundingAt }),
      volAdaptiveHedge({ ...trendBase, sizing: 'excess', fundingAt, reentryAboveEma: true }),
    ];
  };
  // 'hup' (experiment 20.08, Rafal's request): ASYMMETRIC hysteresis —
  // shorter (6/12h) or longer (48h) when the price leaves the range UPWARDS
  // (h=24 on a downward exit unchanged). Motivation: 19–20.08 ETH +18.7%,
  // 3 ETH/stable pools sat 100% in USDC waiting the full 24h. Two-sided
  // hypothesis: shorter hUp = returns to collecting fees sooner, but buys
  // ETH dearer after the pump (chase); longer hUp = less chase. Comparison
  // ONLY against the frozen v1.1 on the same windows; k=2 pure exit for
  // cbBTC pools (when interpreting, look at the rows matching the pool profile).
  const mkHup = (): Strategy[] => {
    const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
    const cb = { ...trendBase, k: 2, mode: 'exit' as const };
    return [
      hodl5050,
      volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
      volAdaptiveTrend(v11), // reference: frozen v1.1
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 6 * 3600 }),
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 12 * 3600 }),
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600 }),
      volAdaptiveTrend(cb), // reference: frozen cbBTC profile
      volAdaptiveTrend({ ...cb, hysteresisUpSec: 6 * 3600 }),
      volAdaptiveTrend({ ...cb, hysteresisUpSec: 12 * 3600 }),
    ];
  };
  // 'funnel' (auto candidate funnel, TASKS-FUNNEL.md): benchmark only +
  // two FROZEN v1.2 profiles (ETH/stable = v1.1 re>EMA; cbBTC = k=2 pure
  // exit) — the gate is computed by candidate-funnel.ts from summary by strategy name.
  // Small set = faster run (the candidate has to fit in the pipeline window).
  const mkFunnel = (): Strategy[] => [
    hodl5050,
    volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }),
    volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit' }),
  ];
  // 'y2' (720d experiment, 25.08 — DECISIONS items 12+13): baselines + frozen
  // profiles + candidate hUp48 + NEW up→5050 (upward exit → parking in 50/50
  // HODL instead of 100% quote) in both variants. Goal: the same strategies on
  // a window with TWO big regimes (bull 24-25 + declines 25-26).
  const mkY2 = (): Strategy[] => {
    const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
    return [
      hodl5050, passiveWide,
      volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
      volAdaptiveTrend(v11), // frozen v1.1
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600 }), // candidate v1.3 (hUp48)
      volAdaptiveTrend({ ...v11, upFallback: '5050' }), // item 12: up→50/50
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600, upFallback: '5050' }), // hUp48 + up→50/50
      volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit' }), // frozen cbBTC profile
      // "LP only when the market is not trending" (Rafal 25.08 night, after the 720d analysis):
      // SYMMETRIC safety switch — an UP trend also kicks out to 50/50 (HODL
      // catches the beta), return once the gap has cooled; reaction to the trend
      // SIGNAL, not to falling out of range (too late — lesson from up→5050)
      volAdaptiveTrend({ ...v11, upExitThresh: 0.05 }),
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600, upExitThresh: 0.05 }),
      volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit', upExitThresh: 0.05 }), // cbBTC profile + upX
    ];
  };
  // 'recal' (recalibration batch, review decisions 26.08 — TASKS-RECAL §5):
  // run with SIGMA_MODE=grid15 (σ from 15-min bucket closes)! Goal: sweep k
  // on the FIXED σ (old k values are in units of the broken estimator — DECISIONS
  // 11/11a), settle cbBTC k2/k3, candidate hUp48/h48 and the
  // "LP only without trend" variants (upX — Rafal's sideways-market thesis; upX=8% =
  // gentler UP signal from 11f.d). Hysteresis still the old one (time share =
  // §2, separate step) — one variable at a time.
  const mkRecal = (): Strategy[] => {
    const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
    return [
      hodl5050,
      passiveWide, // ±50% — the 720d "leader" so far; on grid15 σ we will see whether adapt catches up
      fixedNaive(0.3), // reference from the base-030 sweep ("Sztywny ±30%" = "Fixed ±30%")
      volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
      volAdaptiveTrend({ ...v11, k: 2 }),
      volAdaptiveTrend({ ...v11, k: 2.5 }),
      volAdaptiveTrend(v11), // k=3, v1.1 reference
      volAdaptiveTrend({ ...v11, k: 4 }),
      volAdaptiveTrend({ ...v11, hysteresisSec: 48 * 3600 }), // h=48 (direction from the sweep)
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600 }), // candidate v1.3 (hUp48)
      volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit' }), // frozen cbBTC profile (k=2)
      volAdaptiveTrend({ ...trendBase, k: 3, mode: 'exit' }), // cbBTC k=3 (agenda item 3)
      volAdaptiveTrend({ ...v11, upExitThresh: 0.05 }), // "LP only without trend" (upX=5%)
      volAdaptiveTrend({ ...v11, upExitThresh: 0.08 }), // upX=8% — less jumpy (11f.d)
    ];
  };
  // 'next' (26.08 afternoon, Rafal's decision "we test everything"):
  // (B) FLAT-ONLY family — cash by default, LP only in a confirmed flat,
  // exit on trend in BOTH directions; benchmark = cash100, NOT HODL!
  // (C) share hysteresis (DECISIONS item 10) + upConfirm (less jumpy upX).
  // Run with SIGMA_MODE=grid15.
  const mkNext = (): Strategy[] => {
    const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
    const flatBase = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 };
    return [
      hodl5050,
      cash100, // benchmark of the flat-only family
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.03, exitThresh: 0.06, confirmSec: 24 * 3600 }),
      volAdaptiveTrend(v11), // reference
      volAdaptiveTrend({ ...v11, hysteresisShare: 0.8 }),
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600, hysteresisShare: 0.8 }),
      volAdaptiveTrend({ ...v11, upExitThresh: 0.05, upConfirmSec: 6 * 3600 }),
      volAdaptiveTrend({ ...v11, upExitThresh: 0.05, upConfirmSec: 12 * 3600 }),
      volAdaptiveTrend({ ...v11, upExitThresh: 0.08, upConfirmSec: 12 * 3600 }),
    ];
  };
  // 'final' (26.08 evening — LAST round before the decision about the project):
  // two product candidates after the Rafal/Fable discussion and literature research:
  // (1) WIDE-PASSIVE "HODL with yield" — the only family winning in
  //     fullperiod 4/4 (+$603…+$2574 vsHODL) and consistent with the research
  //     (a wide range minimizes divergence loss + costs≈0);
  // (2) FLATONLY-HODL (Rafal's idea) — 50/50 base ALWAYS (in a trend a
  //     draw with HODL instead of a loss), narrow LP only in a CONFIRMED
  //     flat (our niche, 74-100% win rate). Criteria: flat ≥65% vsHODL,
  //     up/down draw (±1 p.p.), worst>-3, fullperiod ≥ HODL.
  const mkFinal = (): Strategy[] => {
    const flatBase = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, idle: 'hodl' as const };
    return [
      hodl5050,
      passiveW(0.4),
      passiveWide, // ±50%
      passiveW(0.6),
      fixedNaive(0.5), // re-centering only after leaving the range (rare)
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.03, exitThresh: 0.06, confirmSec: 24 * 3600 }),
      volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }), // v1.1 reference
    ];
  };
  // 'hybrid' (27.08, Rafal's idea #3 — FlatWide): narrow LP in flat,
  // outside flat a WIDE passive LP (idle:'passive') instead of HODL. Thesis:
  // FlatOnly-HODL + fees in trends, at the cost of passiveW's tail. References:
  // hodl, passiveW ±40, FlatOnly-HODL k=3|24h.
  const mkHybrid = (): Strategy[] => {
    const flatBase = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 };
    return [
      hodl5050,
      passiveW(0.4),
      flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600, idle: 'hodl' }),
      flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600, idle: 'passive', passiveWidth: 0.4 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600, idle: 'passive', passiveWidth: 0.4 }),
      flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600, idle: 'passive', passiveWidth: 0.5 }),
    ];
  };
  // WF_SET=product (29.08): multi-window gate for the product we actually PLAY —
  // a hybrid with a FIXED width of the narrow leg (±5% = exit threshold), not
  // k×σ×√7 from the v1.2 advisor. Until 29.08 walkforward and the product computed
  // different widths; this set closes the gap. Variants ±4/±5/±8% + the k×σ
  // reference show whether the width change passes the gate, and not merely
  // improves episode EV (flatwindows) and a single-window result (fullperiod).
  const mkProduct = (): Strategy[] => {
    const base = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600, idle: 'passive' as const };
    return [
      hodl5050,
      passiveW(0.4),
      passiveW(0.5),
      flatOnlyLP({ ...base, passiveWidth: 0.4, narrowWidth: 0.05 }),
      flatOnlyLP({ ...base, passiveWidth: 0.5, narrowWidth: 0.05 }),
      flatOnlyLP({ ...base, passiveWidth: 0.4, narrowWidth: 0.04 }),
      flatOnlyLP({ ...base, passiveWidth: 0.5, narrowWidth: 0.04 }),
      flatOnlyLP({ ...base, passiveWidth: 0.4, narrowWidth: 0.08 }),
      flatOnlyLP({ ...base, passiveWidth: 0.4 }), // k×σ×√7 — the product before 29.08
      flatOnlyLP({ ...base, passiveWidth: 0.4, narrowWidth: 0.05, recenter: 'noswap' }),
      flatOnlyLP({ ...base, passiveWidth: 0.5, narrowWidth: 0.05, recenter: 'noswap' }),
    ];
  };
  // WF_SET=shape (02.09): multi-window gate for the SHAPE of the wide leg —
  // skewed interval (3) and barbell (4); set description in fullperiod.ts.
  // Barbell = average of two rows (result is linear in capital).
  const mkShape = (): Strategy[] => {
    const base = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600, idle: 'passive' as const };
    return [
      hodl5050,
      passiveW(0.4),
      passiveW(0.5),
      passiveAsym(0.5, 0.5),
      passiveAsym(0.5, 0.4), // round 2 (02.09): intermediate — smaller penalty in up
      passiveAsym(0.55, 0.4),
      passiveAsym(0.6, 0.35),
      passiveAsym(0.65, 0.3),
      passiveAsym(0.4, 0.4),
      passiveAsym(0.45, 0.35),
      passiveAsym(0.5, 0.3),
      flatOnlyLP({ ...base, passiveWidth: 0.5, narrowWidth: 0.05 }),
      flatOnlyLP({ ...base, passiveWidth: 0.5, narrowWidth: 0.05, passiveAsym: [0.6, 0.35] }),
      flatOnlyLP({ ...base, passiveWidth: 0.4, narrowWidth: 0.05, passiveAsym: [0.5, 0.3] }),
      passiveW(0.15),
      passiveW(0.2),
      innerTrig(0.15, 1 / 3, 0.5),
      innerTrig(0.2, 1 / 3, 0.5),
      fixedNaive(0.5),
    ];
  };
  // WF_SET=wide (02.09, funnel Floor 2 — scripts/wide-collect.ts): width of the
  // pair CLASS from env WIDE_W (0.5 crypto-stable, 0.4 crypto-crypto, tight for
  // pegged), FlatWide hybrid with the narrow leg WIDE_NARROW only when given
  // (wide classes). Minimal set: HODL, passive, hybrid — what ends up in the
  // "full run" columns of the ranking tables (Batch 22).
  const mkWide = (): Strategy[] => {
    const w = Number(process.env.WIDE_W || '0.5');
    const narrow = process.env.WIDE_NARROW ? Number(process.env.WIDE_NARROW) : null;
    const base = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600, idle: 'passive' as const };
    const out: Strategy[] = [hodl5050, passiveW(w)];
    if (narrow) out.push(flatOnlyLP({ ...base, passiveWidth: w, narrowWidth: narrow }));
    return out;
  };
  const mkStrategies = (): Strategy[] =>
    process.env.WF_SET === 'hedge'
      ? mkHedge()
      : process.env.WF_SET === 'wide'
      ? mkWide()
      : process.env.WF_SET === 'shape'
      ? mkShape()
      : process.env.WF_SET === 'product'
      ? mkProduct()
      : process.env.WF_SET === 'hybrid'
      ? mkHybrid()
      : process.env.WF_SET === 'final'
      ? mkFinal()
      : process.env.WF_SET === 'next'
      ? mkNext()
      : process.env.WF_SET === 'recal'
      ? mkRecal()
      : process.env.WF_SET === 'y2'
      ? mkY2()
      : process.env.WF_SET === 'funnel'
      ? mkFunnel()
      : process.env.WF_SET === 'hup'
      ? mkHup()
      : process.env.WF_SET === 'trend-sweep'
      ? [
          hodl5050,
          volAdaptiveTrend({ ...trendBase, mode: 'exit', volGateRatio: 1.4, trendThresh2: 0.10 }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit', volGateRatio: 1.4, trendThresh2: 0.12 }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit', volGateRatio: 1.4, trendThresh2: 0.15 }),
        ]
      : [
          // CANONICAL set for cross-validation (11.08): baselines + 3 safety-switch
          // profiles from the sweep on base-030-365d (max tail protection / balance /
          // sharper return) — the same configs on EVERY pool (generalization test)
          hodl5050, passiveWide,
          volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
          volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit' }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit', volGateRatio: 1.4, trendThresh2: 0.10 }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }),
        ];

  // per strategy: list of {vsHodl, regime, start} from each window
  const dist: Record<string, Array<{ v: number; regime: Regime; start: number; pchg: number; apr: number }>> = {};
  const hodlDist: Array<{ regime: Regime; apr: number }> = []; // benchmark for the per-market-weather forecast
  const windowMeta: Array<{ start: number; pchgPct: number; regime: Regime }> = [];
  let windows = 0;

  for (let start = t0; start + windowDays * 86400 <= t1; start += stepDays * 86400) {
    const end = start + windowDays * 86400;
    const slice = swaps.filter((s) => s.ts >= start && s.ts < end);
    if (slice.length < 500) continue;
    windows++;

    // regime tag: change of the pair's relative price within the window
    const p0 = ethUsd(slice[0].sqrtP, spec);
    const p1 = ethUsd(slice[slice.length - 1].sqrtP, spec);
    const pchg = p1 / p0 - 1;
    const regime: Regime = pchg > REGIME_THRESHOLD ? 'up' : pchg < -REGIME_THRESHOLD ? 'down' : 'flat';
    windowMeta.push({ start, pchgPct: pchg * 100, regime });

    const strategies = mkStrategies(); // fresh instances (internal state)
    const res = strategies.map((s) => runStrategy(slice, spec, s, 10_000));
    const hodl = res.find((r) => r.name === 'HODL 50/50')!;
    for (const r of res) {
      if (r.name === 'HODL 50/50') continue;
      (dist[r.name] ??= []).push({ v: ((r.finalUsd / hodl.finalUsd) - 1) * 100, regime, start, pchg: pchg * 100, apr: r.aprPct });
    }
    hodlDist.push({ regime, apr: hodl.aprPct });
    process.stdout.write(`\rwindow ${windows} (${regime}, ${pct(pchg * 100)}%)…  `);
  }

  const regimeCounts: Record<Regime, number> = { up: 0, down: 0, flat: 0 };
  for (const w of windowMeta) regimeCounts[w.regime]++;
  console.log(`\n\n${windows} windows (up ${regimeCounts.up} / down ${regimeCounts.down} / flat ${regimeCounts.flat}) · vsHODL% per ${windowDays}d window:`);
  console.log('strategy'.padEnd(44) + 'mean'.padStart(8) + 'med.'.padStart(8) + '%win'.padStart(8) + 'worst'.padStart(11) + 'best'.padStart(11));

  const stat = (vals: number[]) => {
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      mean: vals.reduce((s, v) => s + v, 0) / vals.length,
      med: sorted[Math.floor(sorted.length / 2)],
      winPct: (vals.filter((v) => v > 0).length / vals.length) * 100,
      worst: sorted[0],
      best: sorted[sorted.length - 1],
      windows: vals.length,
    };
  };

  const q = (vals: number[], p: number) => {
    const s = [...vals].sort((a, b) => a - b);
    return s[Math.min(Math.floor(p * s.length), s.length - 1)];
  };
  const summary: any = {};
  for (const [name, entries] of Object.entries(dist)) {
    const s = stat(entries.map((e) => e.v));
    // absolute window APRs (for the "human-friendly" profit forecast in the UI):
    const aprs = entries.map((e) => e.apr);
    (s as any).aprQ25 = q(aprs, 0.25);
    (s as any).aprMed = q(aprs, 0.5);
    (s as any).aprQ75 = q(aprs, 0.75);
    const byRegime: any = {};
    for (const rg of ['up', 'down', 'flat'] as Regime[]) {
      const es = entries.filter((e) => e.regime === rg);
      if (es.length) {
        byRegime[rg] = stat(es.map((e) => e.v));
        const aprs = es.map((e) => e.apr);
        byRegime[rg].aprQ25 = q(aprs, 0.25);
        byRegime[rg].aprMed = q(aprs, 0.5);
        byRegime[rg].aprQ75 = q(aprs, 0.75);
      }
    }
    const recentEntries = entries.filter((e) => e.start >= t1 - 90 * 86400);
    const recent90 = recentEntries.length ? stat(recentEntries.map((e) => e.v)) : null;
    summary[name] = { ...s, byRegime, recent90 };
    console.log(
      name.padEnd(44) + pct(s.mean).padStart(8) + pct(s.med).padStart(8) +
      s.winPct.toFixed(0).padStart(7) + '%' + pct(s.worst).padStart(11) + pct(s.best).padStart(11)
    );
    for (const rg of ['up', 'down', 'flat'] as Regime[]) {
      const b = byRegime[rg];
      if (!b) continue;
      console.log(
        `   └ ${rg.padEnd(5)} (${String(b.windows).padStart(2)} windows)`.padEnd(44) +
        pct(b.mean).padStart(8) + pct(b.med).padStart(8) +
        b.winPct.toFixed(0).padStart(7) + '%' + pct(b.worst).padStart(11) + pct(b.best).padStart(11)
      );
    }
    if (recent90) {
      console.log(
        `   └ recent90 (${String(recent90.windows).padStart(2)} windows)`.padEnd(44) +
        pct(recent90.mean).padStart(8) + pct(recent90.med).padStart(8) +
        recent90.winPct.toFixed(0).padStart(7) + '%' + pct(recent90.worst).padStart(11) + pct(recent90.best).padStart(11)
      );
    }
  }

  console.log('\nCRITERION for a "sound" algorithm: %win ≥ 65 and worst window > -3; PLAN.md gate: win in ≥2 regimes.');
  fs.mkdirSync(OUT, { recursive: true });
  // HODL benchmark per regime (the "algorithm vs plain holding" contrast in the forecast)
  const hodlByRegime: any = {};
  for (const rg of ['up', 'down', 'flat'] as Regime[]) {
    const aprs = hodlDist.filter((e) => e.regime === rg).map((e) => e.apr);
    if (aprs.length) hodlByRegime[rg] = { aprQ25: q(aprs, 0.25), aprMed: q(aprs, 0.5), aprQ75: q(aprs, 0.75), windows: aprs.length };
  }
  fs.writeFileSync(
    path.join(OUT, `walkforward-${id}-${windowDays}d.json`),
    // perWindow (E8.3, 07.09): raw vsHODL per window per strategy — for
    // conditioning windows on the volatility state at entry (backtest/e8-timing.ts).
    // Until now `dist` lived only in memory; summary is not enough for bucketing.
    JSON.stringify({ id, windowDays, stepDays, windows, regimeThreshold: REGIME_THRESHOLD, regimeCounts, windowMeta, summary, hodlByRegime, perWindow: dist }, null, 2)
  );
})();
