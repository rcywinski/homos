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
import { hodl5050, cash100, flatOnlyLP, passiveWide, passiveW, fixedNaive, volAdaptive, volAdaptiveTrend, volAdaptiveHedge } from './strategies';
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
  // 'hup' (eksperyment 20.08, zlecenie Rafała): ASYMETRYCZNA histereza —
  // krótsza (6/12h) lub dłuższa (48h) gdy cena wychodzi z zakresu GÓRĄ
  // (h=24 przy wyjściu dołem bez zmian). Motywacja: 19–20.08 ETH +18.7%,
  // 3 pule ETH/stable stały 100% w USDC czekając pełne 24h. Hipoteza
  // dwustronna: krótsze hUp = szybciej wraca do zbierania fees, ale kupuje
  // ETH drożej po pompie (chase); dłuższe hUp = mniej chase'u. Porównanie
  // WYŁĄCZNIE z zamrożonym v1.1 na tych samych oknach; k=2 czysty exit dla
  // pul cbBTC (przy interpretacji patrzeć na wiersze zgodne z profilem puli).
  const mkHup = (): Strategy[] => {
    const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
    const cb = { ...trendBase, k: 2, mode: 'exit' as const };
    return [
      hodl5050,
      volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
      volAdaptiveTrend(v11), // referencja: zamrożony v1.1
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 6 * 3600 }),
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 12 * 3600 }),
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600 }),
      volAdaptiveTrend(cb), // referencja: zamrożony profil cbBTC
      volAdaptiveTrend({ ...cb, hysteresisUpSec: 6 * 3600 }),
      volAdaptiveTrend({ ...cb, hysteresisUpSec: 12 * 3600 }),
    ];
  };
  // 'funnel' (auto-lejek kandydatów, TASKS-FUNNEL.md): tylko benchmark +
  // dwa ZAMROŻONE profile v1.2 (ETH/stable = v1.1 re>EMA; cbBTC = k=2 czysty
  // exit) — bramkę liczy candidate-funnel.ts z summary po nazwie strategii.
  // Mały zestaw = szybszy przebieg (kandydat ma zdążyć w oknie pipeline'u).
  const mkFunnel = (): Strategy[] => [
    hodl5050,
    volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }),
    volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit' }),
  ];
  // 'y2' (eksperyment 720d, 25.08 — DECYZJE pkt 12+13): baseline'y + zamrożone
  // profile + kandydat hUp48 + NOWY up→5050 (wyjście górą → parking 50/50
  // HODL zamiast 100% quote) w obu odmianach. Cel: te same strategie na
  // oknie z DWOMA dużymi reżimami (bull 24-25 + spadki 25-26).
  const mkY2 = (): Strategy[] => {
    const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
    return [
      hodl5050, passiveWide,
      volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
      volAdaptiveTrend(v11), // zamrożony v1.1
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600 }), // kandydat v1.3 (hUp48)
      volAdaptiveTrend({ ...v11, upFallback: '5050' }), // pkt 12: up→50/50
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600, upFallback: '5050' }), // hUp48 + up→50/50
      volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit' }), // zamrożony profil cbBTC
      // "LP tylko gdy rynek nie trenduje" (Rafał 25.08 noc, po analizie 720d):
      // SYMETRYCZNY bezpiecznik — trend w GÓRĘ też wyrzuca do 50/50 (HODL
      // łapie betę), powrót po ostygnięciu gapu; reakcja na SYGNAŁ trendu,
      // nie na wypadnięcie z zakresu (za późno — lekcja z up→5050)
      volAdaptiveTrend({ ...v11, upExitThresh: 0.05 }),
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600, upExitThresh: 0.05 }),
      volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit', upExitThresh: 0.05 }), // profil cbBTC + upX
    ];
  };
  // 'recal' (paczka rekalibracyjna, decyzje przeglądu 26.08 — TASKS-RECAL §5):
  // odpalać z SIGMA_MODE=grid15 (σ z zamknięć kubełków 15-min)! Cel: sweep k
  // na NAPRAWIONEJ σ (stare k są w jednostkach zepsutego estymatora — DECYZJE
  // 11/11a), rozstrzygnięcie cbBTC k2/k3, kandydat hUp48/h48 i warianty
  // "LP tylko bez trendu" (upX — teza Rafała o rynku bocznym; upX=8% =
  // łagodniejszy sygnał UP z 11f.d). Histereza wciąż stara (udział czasu =
  // §2, osobny krok) — jedna zmienna naraz.
  const mkRecal = (): Strategy[] => {
    const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
    return [
      hodl5050,
      passiveWide, // ±50% — dotychczasowy "lider" 720d; na grid15 σ zobaczymy, czy adapt go dogania
      fixedNaive(0.3), // referencja sweepu base-030 ("Sztywny ±30%")
      volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
      volAdaptiveTrend({ ...v11, k: 2 }),
      volAdaptiveTrend({ ...v11, k: 2.5 }),
      volAdaptiveTrend(v11), // k=3, referencja v1.1
      volAdaptiveTrend({ ...v11, k: 4 }),
      volAdaptiveTrend({ ...v11, hysteresisSec: 48 * 3600 }), // h=48 (kierunek ze sweepu)
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600 }), // kandydat v1.3 (hUp48)
      volAdaptiveTrend({ ...trendBase, k: 2, mode: 'exit' }), // zamrożony profil cbBTC (k=2)
      volAdaptiveTrend({ ...trendBase, k: 3, mode: 'exit' }), // cbBTC k=3 (pkt 3 agendy)
      volAdaptiveTrend({ ...v11, upExitThresh: 0.05 }), // "LP tylko bez trendu" (upX=5%)
      volAdaptiveTrend({ ...v11, upExitThresh: 0.08 }), // upX=8% — mniej nerwowy (11f.d)
    ];
  };
  // 'next' (26.08 popołudnie, decyzja Rafała "testujemy wszystko"):
  // (B) rodzina FLAT-ONLY — domyślnie cash, LP tylko w potwierdzonym flat,
  // wyjście na trend w OBIE strony; benchmark = cash100, NIE HODL!
  // (C) histereza share (DECYZJE pkt 10) + upConfirm (mniej nerwowy upX).
  // Odpalać z SIGMA_MODE=grid15.
  const mkNext = (): Strategy[] => {
    const v11 = { ...trendBase, mode: 'exit' as const, reentryAboveEma: true };
    const flatBase = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 };
    return [
      hodl5050,
      cash100, // benchmark rodziny flat-only
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.03, exitThresh: 0.06, confirmSec: 24 * 3600 }),
      volAdaptiveTrend(v11), // referencja
      volAdaptiveTrend({ ...v11, hysteresisShare: 0.8 }),
      volAdaptiveTrend({ ...v11, hysteresisUpSec: 48 * 3600, hysteresisShare: 0.8 }),
      volAdaptiveTrend({ ...v11, upExitThresh: 0.05, upConfirmSec: 6 * 3600 }),
      volAdaptiveTrend({ ...v11, upExitThresh: 0.05, upConfirmSec: 12 * 3600 }),
      volAdaptiveTrend({ ...v11, upExitThresh: 0.08, upConfirmSec: 12 * 3600 }),
    ];
  };
  // 'final' (26.08 wieczór — OSTATNIA runda przed decyzją o projekcie):
  // dwa kandydaty na produkt po dyskusji Rafał/Fable i researchu literatury:
  // (1) WIDE-PASSIVE "HODL z yieldem" — jedyna rodzina wygrywająca w
  //     fullperiod 4/4 (+$603…+$2574 vsHODL) i spójna z badaniami
  //     (szeroki zakres minimalizuje divergence loss + koszty≈0);
  // (2) FLATONLY-HODL (pomysł Rafała) — baza 50/50 ZAWSZE (w trendzie
  //     remis z HODL zamiast przegranej), wąski LP tylko w POTWIERDZONYM
  //     flat (nasza nisza 74-100% wygr.). Kryteria: flat ≥65% vsHODL,
  //     up/down remis (±1 p.p.), worst>-3, fullperiod ≥ HODL.
  const mkFinal = (): Strategy[] => {
    const flatBase = { horizonDays: 7, trendHLDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, idle: 'hodl' as const };
    return [
      hodl5050,
      passiveW(0.4),
      passiveWide, // ±50%
      passiveW(0.6),
      fixedNaive(0.5), // re-centrowanie tylko po wyjściu z pasma (rzadkie)
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }),
      flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.03, exitThresh: 0.06, confirmSec: 24 * 3600 }),
      volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }), // referencja v1.1
    ];
  };
  // 'hybrid' (27.08, pomysł Rafała #3 — FlatWide): wąski LP we flat,
  // poza flat SZEROKI pasywny LP (idle:'passive') zamiast HODL. Teza:
  // FlatOnly-HODL + fees w trendach, kosztem ogona passiveW. Referencje:
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
  // WF_SET=product (29.08): bramka wielookienna dla produktu, którym GRAMY —
  // hybryda ze STAŁĄ szerokością wąskiej nogi (±5% = próg wyjścia), a nie
  // k×σ×√7 z doradcy v1.2. Do 29.08 walkforward i produkt liczyły różne
  // szerokości; ten zestaw domyka rozjazd. Warianty ±4/±5/±8% + referencja
  // k×σ pokazują, czy zmiana szerokości przechodzi bramkę, a nie tylko
  // poprawia EV epizodów (flatwindows) i wynik jednego okna (fullperiod).
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
      flatOnlyLP({ ...base, passiveWidth: 0.4 }), // k×σ×√7 — produkt sprzed 29.08
      flatOnlyLP({ ...base, passiveWidth: 0.4, narrowWidth: 0.05, recenter: 'noswap' }),
      flatOnlyLP({ ...base, passiveWidth: 0.5, narrowWidth: 0.05, recenter: 'noswap' }),
    ];
  };
  const mkStrategies = (): Strategy[] =>
    process.env.WF_SET === 'hedge'
      ? mkHedge()
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
  const dist: Record<string, Array<{ v: number; regime: Regime; start: number; pchg: number; apr: number }>> = {};
  const hodlDist: Array<{ regime: Regime; apr: number }> = []; // benchmark do prognozy per pogoda rynku
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
      (dist[r.name] ??= []).push({ v: ((r.finalUsd / hodl.finalUsd) - 1) * 100, regime, start, pchg: pchg * 100, apr: r.aprPct });
    }
    hodlDist.push({ regime, apr: hodl.aprPct });
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

  const q = (vals: number[], p: number) => {
    const s = [...vals].sort((a, b) => a - b);
    return s[Math.min(Math.floor(p * s.length), s.length - 1)];
  };
  const summary: any = {};
  for (const [name, entries] of Object.entries(dist)) {
    const s = stat(entries.map((e) => e.v));
    // absolutne APR okien (do prognozy zysku "dla ludzi" w UI):
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
        `   └ ${rg.padEnd(5)} (${String(b.windows).padStart(2)} okien)`.padEnd(44) +
        pct(b.mean).padStart(8) + pct(b.med).padStart(8) +
        b.winPct.toFixed(0).padStart(7) + '%' + pct(b.worst).padStart(11) + pct(b.best).padStart(11)
      );
    }
    if (recent90) {
      console.log(
        `   └ recent90 (${String(recent90.windows).padStart(2)} okien)`.padEnd(44) +
        pct(recent90.mean).padStart(8) + pct(recent90.med).padStart(8) +
        recent90.winPct.toFixed(0).padStart(7) + '%' + pct(recent90.worst).padStart(11) + pct(recent90.best).padStart(11)
      );
    }
  }

  console.log('\nKRYTERIUM "prawidłowego" algorytmu: %wygr. ≥ 65 i najgorsze okno > -3; bramka PLAN.md: wygrana w ≥2 reżimach.');
  fs.mkdirSync(OUT, { recursive: true });
  // benchmark HODL per reżim (kontrast "algorytm vs zwykłe trzymanie" w prognozie)
  const hodlByRegime: any = {};
  for (const rg of ['up', 'down', 'flat'] as Regime[]) {
    const aprs = hodlDist.filter((e) => e.regime === rg).map((e) => e.apr);
    if (aprs.length) hodlByRegime[rg] = { aprQ25: q(aprs, 0.25), aprMed: q(aprs, 0.5), aprQ75: q(aprs, 0.75), windows: aprs.length };
  }
  fs.writeFileSync(
    path.join(OUT, `walkforward-${id}-${windowDays}d.json`),
    JSON.stringify({ id, windowDays, stepDays, windows, regimeThreshold: REGIME_THRESHOLD, regimeCounts, windowMeta, summary, hodlByRegime }, null, 2)
  );
})();
