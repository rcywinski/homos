/**
 * walkforward.ts — test odporności strategii na przesuwanych oknach
 * + PODZIAŁ NA REŻIMY (B2 z RESEARCH-QUEUE).
 *
 *   npx tsx backtest/walkforward.ts <pool-id> [windowDays=30] [stepDays=15]
 *
 * Zamiast jednego przebiegu (wynik zdominowany przez 1-3 decyzje rebalansu)
 * tniemy historię na nakładające się okna i mierzymy rozkład: średnia/mediana
 * vsHODL, % okien wygranych, najgorsze okno. Strategia jest "prawidłowa"
 * dopiero gdy wygrywa w większości okien, nie w jednym przebiegu.
 *
 * REŻIMY: każde okno tagujemy zmianą ceny WZGLĘDNEJ pary w oknie
 * (P_end/P_start − 1): up > +10%, down < −10%, flat pomiędzy. Raport per
 * reżim odpowiada na pytanie z B1: czy najgorsze okna to okna trendu
 * (wtedy poprawa leży w bezpieczniku trendowym/hedge, nie w strojeniu k/h).
 * Bramka PLAN.md: strategia ma wygrywać w ≥2 reżimach.
 *
 * Wynik: backtest/results/walkforward-<id>-<windowDays>d.json
 * (nazwa z oknem — wcześniej run 45d nadpisywał wynik 60d).
 */
import * as fs from 'fs';
import * as path from 'path';
import { runStrategy, Strategy, ethUsd } from './engine';
import { hodl5050, passiveWide, fixedNaive, volAdaptive, volAdaptiveTrend, volAdaptiveHedge } from './strategies';
import { loadPool, loadFunding } from './load'; // wspólny loader (obsługuje też pary quote:'WETH')

const OUT = path.join(__dirname, 'results');

const pct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);

type Regime = 'up' | 'down' | 'flat';
const REGIME_THRESHOLD = 0.10; // ±10% zmiany ceny względnej w oknie

(async () => {
  const id = process.argv[2] || 'base-weth-usdc-030';
  const windowDays = Number(process.argv[3] || 30);
  const stepDays = Number(process.argv[4] || 15);
  const loaded = await loadPool(id);
  if (!loaded) {
    console.error(`Brak cache dla ${id}`);
    process.exit(1);
  }
  const { swaps, spec } = loaded;
  const t0 = swaps[0].ts, t1 = swaps[swaps.length - 1].ts;
  const totalDays = (t1 - t0) / 86400;
  console.log(`${id}: ${swaps.length} swapów, ${totalDays.toFixed(1)} dni · okna ${windowDays}d co ${stepDays}d · reżim: ±${REGIME_THRESHOLD * 100}%\n`);

  const trendBase = { k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, trendHLDays: 7, trendThresh: 0.05 } as const;
  // zestaw sterowany env WF_SET: 'hedge' = F4 (hedge perp; wymaga
  // data/funding/ETHUSDT.json), 'trend-sweep' = warianty exit, domyślnie kanon.
  const fundingAt = loadFunding('ETHUSDT');
  const mkHedge = (): Strategy[] => {
    if (!fundingAt) {
      console.error('WF_SET=hedge wymaga data/funding/ETHUSDT.json — najpierw: npx tsx scripts/fetch-funding.ts ETHUSDT 400');
      process.exit(1);
    }
    return [
      hodl5050,
      volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
      volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }), // domyślny v1.1
      volAdaptiveHedge({ ...trendBase, sizing: 'full', fundingAt }),
      volAdaptiveHedge({ ...trendBase, sizing: 'excess', fundingAt }),
      volAdaptiveHedge({ ...trendBase, sizing: 'excess', fundingAt, reentryAboveEma: true }),
    ];
  };
  const mkStrategies = (): Strategy[] =>
    process.env.WF_SET === 'hedge'
      ? mkHedge()
      : process.env.WF_SET === 'trend-sweep'
      ? [
          hodl5050,
          volAdaptiveTrend({ ...trendBase, mode: 'exit', volGateRatio: 1.4, trendThresh2: 0.10 }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit', volGateRatio: 1.4, trendThresh2: 0.12 }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit', volGateRatio: 1.4, trendThresh2: 0.15 }),
        ]
      : [
          // zestaw KANONICZNY do cross-walidacji (11.08): baseline'y + 3 profile
          // bezpiecznika z sweepu na base-030-365d (max ochrona ogona / balans /
          // ostrzejszy powrót) — te same configi na KAŻDEJ puli (test generalizacji)
          hodl5050, passiveWide,
          volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
          volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit' }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit', volGateRatio: 1.4, trendThresh2: 0.10 }),
          volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }),
        ];

  // per strategia: lista {vsHodl, regime, start} z każdego okna
  const dist: Record<string, Array<{ v: number; regime: Regime; start: number; pchg: number }>> = {};
  const windowMeta: Array<{ start: number; pchgPct: number; regime: Regime }> = [];
  let windows = 0;

  for (let start = t0; start + windowDays * 86400 <= t1; start += stepDays * 86400) {
    const end = start + windowDays * 86400;
    const slice = swaps.filter((s) => s.ts >= start && s.ts < end);
    if (slice.length < 500) continue;
    windows++;

    // tag reżimu: zmiana ceny względnej pary w oknie
    const p0 = ethUsd(slice[0].sqrtP, spec);
    const p1 = ethUsd(slice[slice.length - 1].sqrtP, spec);
    const pchg = p1 / p0 - 1;
    const regime: Regime = pchg > REGIME_THRESHOLD ? 'up' : pchg < -REGIME_THRESHOLD ? 'down' : 'flat';
    windowMeta.push({ start, pchgPct: pchg * 100, regime });

    const strategies = mkStrategies(); // świeże instancje (stan wewn.)
    const res = strategies.map((s) => runStrategy(slice, spec, s, 10_000));
    const hodl = res.find((r) => r.name === 'HODL 50/50')!;
    for (const r of res) {
      if (r.name === 'HODL 50/50') continue;
      (dist[r.name] ??= []).push({ v: ((r.finalUsd / hodl.finalUsd) - 1) * 100, regime, start, pchg: pchg * 100 });
    }
    process.stdout.write(`\rokno ${windows} (${regime}, ${pct(pchg * 100)}%)…  `);
  }

  const regimeCounts: Record<Regime, number> = { up: 0, down: 0, flat: 0 };
  for (const w of windowMeta) regimeCounts[w.regime]++;
  console.log(`\n\n${windows} okien (up ${regimeCounts.up} / down ${regimeCounts.down} / flat ${regimeCounts.flat}) · vsHODL% na okno ${windowDays}d:`);
  console.log('strategia'.padEnd(44) + 'śr.'.padStart(8) + 'med.'.padStart(8) + '%wygr.'.padStart(8) + 'najgorsze'.padStart(11) + 'najlepsze'.padStart(11));

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

  const summary: any = {};
  for (const [name, entries] of Object.entries(dist)) {
    const s = stat(entries.map((e) => e.v));
    const byRegime: any = {};
    for (const rg of ['up', 'down', 'flat'] as Regime[]) {
      const vals = entries.filter((e) => e.regime === rg).map((e) => e.v);
      if (vals.length) byRegime[rg] = stat(vals);
    }
    summary[name] = { ...s, byRegime };
    console.log(
      name.padEnd(44) + pct(s.mean).padStart(8) + pct(s.med).padStart(8) +
      s.winPct.toFixed(0).padStart(7) + '%' + pct(s.worst).padStart(11) + pct(s.best).padStart(11)
    );
    for (const rg of ['up', 'down', 'flat'] as Regime[]) {
      const b = byRegime[rg];
      if (!b) continue;
      console.log(
        `   └ ${rg.padEnd(5)} (${String(b.windows).padStart(2)} okien)`.padEnd(44) +
        pct(b.mean).padStart(8) + pct(b.med).padStart(8) +
        b.winPct.toFixed(0).padStart(7) + '%' + pct(b.worst).padStart(11) + pct(b.best).padStart(11)
      );
    }
  }

  console.log('\nKRYTERIUM "prawidłowego" algorytmu: %wygr. ≥ 65 i najgorsze okno > -3; bramka PLAN.md: wygrana w ≥2 reżimach.');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT, `walkforward-${id}-${windowDays}d.json`),
    JSON.stringify({ id, windowDays, stepDays, windows, regimeThreshold: REGIME_THRESHOLD, regimeCounts, windowMeta, summary }, null, 2)
  );
})();
