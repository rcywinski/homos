/**
 * fullperiod.ts — symulacja pełnookresowa "wrzucam $X raz i trzymam strategię
 * przez CAŁY okres cache'a" (pytanie Rafała 26.08: "2 lata temu wrzuciłem
 * $5k — co by się z nimi stało?").
 *
 * To jest widok KOMPLEMENTARNY do walkforward.ts (bramka): tu jest jeden
 * punkt wejścia (początek serii) i procent składany do dziś — czyli realne
 * kwoty; walkforward liczy ~46 różnych momentów wejścia w oknach 30d i
 * odpowiada na pytanie o odporność na timing. Wynik pełnookresowy potrafi
 * schlebiać albo krzywdzić strategię przez sam wybór daty startu — dlatego
 * bramka pozostaje na oknach; ta tabela służy INTUICJI i rozmowie o kwotach.
 *
 * Użycie: [SIGMA_MODE=grid15] npx tsx backtest/fullperiod.ts <poolId> [startUsd=5000]
 *   np. WF-owy zestaw recal na nowej σ:
 *   SIGMA_MODE=grid15 npx tsx backtest/fullperiod.ts base-cbbtc-weth-005-720d 5000
 */
import { runStrategy, ethUsd, Strategy, RunResult } from './engine';
import { hodl5050, cash100, passiveWide, passiveW, fixedNaive, flatOnlyLP, volAdaptive, volAdaptiveTrend } from './strategies';
import { loadPool } from './load';

const id = process.argv[2];
const startUsd = Number(process.argv[3] ?? 5000);
if (!id) {
  console.error('Użycie: npx tsx backtest/fullperiod.ts <poolId> [startUsd]');
  process.exit(1);
}
(async () => {
const loaded = await loadPool(id);
if (!loaded) {
  console.error(`Brak cache dla ${id}`);
  process.exit(1);
}
let { swaps } = loaded;
const { spec } = loaded;
// FP_DAYS=N (27.08, pytanie Rafała o "ostatnie 3 miesiące"): przytnij serię
// do ostatnich N dni cache'a — wejście w środku historii zamiast na początku.
const fpDays = Number(process.env.FP_DAYS ?? 0);
if (fpDays > 0 && swaps.length) {
  const cutoff = swaps[swaps.length - 1].ts - fpDays * 86400;
  swaps = swaps.filter((s) => s.ts >= cutoff);
  if (!swaps.length) {
    console.error(`FP_DAYS=${fpDays}: pusta seria po przycięciu`);
    process.exit(1);
  }
}
const t0 = swaps[0].ts, t1 = swaps[swaps.length - 1].ts;
const days = (t1 - t0) / 86400;
const p0 = ethUsd(swaps[0].sqrtP, spec);
const p1 = ethUsd(swaps[swaps.length - 1].sqrtP, spec);

// zestawy: default = jak WF_SET=recal; FP_SET=final = runda finałowa 26.08
// (wide-passive + flatOnly-HODL) — trzymać w synchronie z walkforward.ts ręcznie
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
  flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600 }), // idle:'hodl' z flatBase
  flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600, idle: 'passive', passiveWidth: 0.4 }),
  flatOnlyLP({ ...flatBase, k: 2, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 12 * 3600, idle: 'passive', passiveWidth: 0.4 }),
  flatOnlyLP({ ...flatBase, k: 3, enterThresh: 0.02, exitThresh: 0.05, confirmSec: 24 * 3600, idle: 'passive', passiveWidth: 0.5 }),
];
// FP_SET=product (29.08, pytanie Rafała „wchodzę $2500 dwa lata temu — ile
// wychodzi po 720 dniach?"): dokładnie ten produkt, którym gramy na żywo,
// czyli hybryda FlatWide ze STAŁĄ szerokością wąskiej nogi (±5% = próg
// wyjścia), a nie k×σ×√7 z doradcy v1.2. Warianty ±4/±5/±8% pokazują koszt
// i zysk zmiany tego jednego parametru, `k×σ` = produkt sprzed 29.08 (ten,
// który przeszedł walkforward — stąd jest w zestawie: chcemy widzieć,
// czy zmiana szerokości nie psuje wyniku PEŁNOOKRESOWEGO, nie tylko EV
// epizodów). Obie szerokości idle (±40 cbBTC / ±50 base-030) w jednym
// zestawie — czytaj wiersz pasujący do puli.
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
  flatOnlyLP({ ...productBase, passiveWidth: 0.4 }), // k×σ×√7 — produkt sprzed 29.08
  flatOnlyLP({ ...productBase, passiveWidth: 0.5 }),
  // 29.08, pomysł Rafała: przestawianie postury BEZ swapu (zakres przesunięty
  // do składu portfela, do jednostronnego włącznie) — ten sam produkt, inny
  // sposób wykonania przejścia
  flatOnlyLP({ ...productBase, passiveWidth: 0.4, narrowWidth: 0.05, recenter: 'noswap' }),
  flatOnlyLP({ ...productBase, passiveWidth: 0.5, narrowWidth: 0.05, recenter: 'noswap' }),
];
const strategies: Strategy[] =
  process.env.FP_SET === 'final' ? finalSet
    : process.env.FP_SET === 'hybrid' ? hybridSet
    : process.env.FP_SET === 'product' ? productSet
    : recalSet;

console.log(
  `${id}: ${swaps.length} swapów, ${days.toFixed(0)} dni · start $${startUsd} · ` +
    `cena bazy ${p0.toFixed(2)} → ${p1.toFixed(2)} (${(((p1 - p0) / p0) * 100).toFixed(1)}%) · ` +
    `SIGMA_MODE=${process.env.SIGMA_MODE ?? 'swap'}\n`
);

const results: RunResult[] = [];
for (const s of strategies) {
  const r = runStrategy(swaps, spec, s, startUsd);
  results.push(r);
  process.stderr.write(`  policzone: ${r.name}\n`);
}
const hodl = results.find((r) => r.name === 'HODL 50/50')!;

const fmt = (n: number, w = 9) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }).padStart(w);
const pct = (n: number, w = 7) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`.padStart(w);

console.log(
  'strategia'.padEnd(52) + 'koniec$'.padStart(9) + 'PnL$'.padStart(9) + 'PnL%'.padStart(8) +
  'fees$'.padStart(8) + 'koszty$'.padStart(9) + 'reb'.padStart(5) + 'inRng'.padStart(7) +
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
  '100% USDC (nic nie robię)'.padEnd(52) + fmt(startUsd) + fmt(0) + pct(0, 8) +
  fmt(0, 8) + fmt(0) + '0'.padStart(5) + '—'.padStart(7) + pct(0, 8) + fmt(startUsd - hodl.finalUsd)
);
console.log(
  `\nUWAGA interpretacyjna: jeden punkt wejścia (${new Date(t0 * 1000).toISOString().slice(0, 10)}) — ` +
  `wynik zależy od tej daty; odporność na timing mierzy walkforward (bramka), nie ta tabela.`
);
})();
