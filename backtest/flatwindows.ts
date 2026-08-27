/**
 * flatwindows.ts — E1 (RESEARCH-QUEUE): statystyka epizodów FLAT wg definicji
 * produktu FlatWide + wycena zwężenia (expected value FLAT_ENTER).
 *
 * Pytanie biznesowe (27.08): zanim pierwszy raz PODPISZEMY zwężenie pozycji
 * produktowej — ile flatów w ogóle bywa, jak długo trwają i czy dodatkowe
 * fees z wąskiego zakresu pokrywają koszt dwóch przejść (zwężenie+powrót).
 *
 * Metoda (celowo BEZ silnika — czysta arytmetyka na strumieniu swapów):
 *  - EMA log-ceny względnej pary (HL_D dni) → gap = log(P/EMA);
 *  - epizod flat: |gap|<ENTER utrzymane CONFIRM_H godzin (licznik zerowany
 *    wybiciem, jak w flatOnlyLP) → trwa do |gap|>EXIT;
 *  - w epizodzie liczymy fees hipotetycznej pozycji o kapitale CAP:
 *    (a) SZEROKIEJ ±WIDE i (b) WĄSKIEJ ±NARROW — obie wycentrowane w momencie
 *    potwierdzenia flatu, bez recenteringu (konserwatywnie);
 *    fees per swap = wolumen_wejściowy_USD × feeRate × ourL/(poolL+ourL),
 *    naliczane tylko gdy tick w zakresie pozycji; poolL = ev.L (realne!).
 *  - EV epizodu = feesNarrow − feesWide − 2×COST (zwężenie i powrót).
 * Przybliżenia: brak recenteringu wąskiej (in-range% raportowany), brak IL
 * (we flat z definicji mały i symetryczny), koszt przejścia stały COST.
 *
 * Użycie: npx tsx backtest/flatwindows.ts <poolId>
 * Env: ENTER=0.02 EXIT=0.05 CONFIRM_H=24 HL_D=7 CAP=2500 WIDE=0.5
 *      NARROW=0.08 COST=6
 */
import { unitPrices, ethUsd, PoolSpec } from './engine';
import { loadPool } from './load';

const id = process.argv[2];
if (!id) {
  console.error('Użycie: npx tsx backtest/flatwindows.ts <poolId>');
  process.exit(1);
}
const ENTER = Number(process.env.ENTER ?? 0.02);
const EXIT = Number(process.env.EXIT ?? 0.05);
const CONFIRM_S = Number(process.env.CONFIRM_H ?? 24) * 3600;
const HL_D = Number(process.env.HL_D ?? 7);
const CAP = Number(process.env.CAP ?? 2500);
const WIDE = Number(process.env.WIDE ?? 0.5); // ± (geometrycznie: [P/(1+w), P(1+w)])
const NARROW = Number(process.env.NARROW ?? 0.08);
const COST = Number(process.env.COST ?? 6); // USD za jedno pełne przejście (zamknij+otwórz)

/** L_raw pozycji o wartości V USD, zakres [s/√r, s·√r] wokół raw sqrt s. */
function ourL(V: number, r: number, s: number, spec: PoolSpec, px0: number, px1: number): number {
  const f = 1 - 1 / Math.sqrt(r);
  const perL = (f / s / 10 ** spec.d0) * px0 + s * f / 10 ** spec.d1 * px1;
  return perL > 0 ? V / perL : 0;
}

interface Episode {
  startTs: number; endTs: number; confirmed: boolean;
  volUsd: number; feesWide: number; feesNarrow: number;
  swapsIn: number; swapsInNarrow: number;
  p0: number; p1: number;
}

(async () => {
  const loaded = await loadPool(id);
  if (!loaded) { console.error(`Brak cache dla ${id}`); process.exit(1); }
  const { swaps, spec } = loaded;
  const tau = (HL_D * 86400) / Math.LN2;
  const rWide = 1 + WIDE;
  const rNarrow = 1 + NARROW;

  let ema: number | null = null;
  let lastTs = 0;
  let flatSince: number | null = null;
  let cur: (Episode & { sLoW: number; sHiW: number; sLoN: number; sHiN: number; LW: number; LN: number }) | null = null;
  const episodes: Episode[] = [];

  for (const ev of swaps) {
    if (spec.quote === 'WETH' && spec.usdPerEth) spec.usdPerEthNow = spec.usdPerEth(ev.b);
    const price = ethUsd(ev.sqrtP, spec); // cena względna bazy (USD lub WETH — do gapu obojętne)
    if (!(price > 0) || !Number.isFinite(price)) continue; // zepsute pierwsze punkty cache (anomalia cand-*)
    const logP = Math.log(price);
    if (ema === null) { ema = logP; lastTs = ev.ts; continue; }
    const dt = Math.max(ev.ts - lastTs, 0);
    ema = (1 - (1 - Math.exp(-dt / tau))) * ema + (1 - Math.exp(-dt / tau)) * logP;
    lastTs = ev.ts;
    const gap = Math.abs(logP - ema);

    if (cur) {
      // fees obu hipotetycznych pozycji
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      const volUsd = Math.max(ev.a0 > 0 ? ev.a0 * px0 : 0, ev.a1 > 0 ? ev.a1 * px1 : 0);
      const feePool = volUsd * spec.feeRate;
      cur.volUsd += volUsd;
      if (ev.sqrtP >= cur.sLoW && ev.sqrtP <= cur.sHiW) {
        cur.feesWide += feePool * (cur.LW / (ev.L + cur.LW));
        cur.swapsIn++;
      }
      if (ev.sqrtP >= cur.sLoN && ev.sqrtP <= cur.sHiN) {
        cur.feesNarrow += feePool * (cur.LN / (ev.L + cur.LN));
        cur.swapsInNarrow++;
      }
      if (gap > EXIT) {
        cur.endTs = ev.ts; cur.p1 = price; cur.confirmed = true;
        episodes.push(cur); cur = null; flatSince = null;
      }
      continue;
    }

    if (gap < ENTER) {
      if (flatSince === null) flatSince = ev.ts;
      if (ev.ts - flatSince >= CONFIRM_S) {
        const { px0, px1 } = unitPrices(ev.sqrtP, spec);
        const s = ev.sqrtP;
        cur = {
          startTs: ev.ts, endTs: ev.ts, confirmed: false,
          volUsd: 0, feesWide: 0, feesNarrow: 0, swapsIn: 0, swapsInNarrow: 0,
          p0: price, p1: price,
          sLoW: s / Math.sqrt(rWide), sHiW: s * Math.sqrt(rWide),
          sLoN: s / Math.sqrt(rNarrow), sHiN: s * Math.sqrt(rNarrow),
          LW: ourL(CAP, rWide, s, spec, px0, px1),
          LN: ourL(CAP, rNarrow, s, spec, px0, px1),
        };
        flatSince = null;
      }
    } else {
      flatSince = null;
    }
  }
  if (cur) { cur.endTs = lastTs; episodes.push(cur); } // epizod trwający na końcu danych

  const t0 = swaps[0].ts, t1 = swaps[swaps.length - 1].ts;
  const totalDays = (t1 - t0) / 86400;
  const durD = (e: Episode) => (e.endTs - e.startTs) / 86400;
  const flatDays = episodes.reduce((a, e) => a + durD(e), 0);
  const evOf = (e: Episode) => e.feesNarrow - e.feesWide - 2 * COST;

  console.log(`${id}: ${totalDays.toFixed(0)} dni · ENTER<${ENTER * 100}% ${(CONFIRM_S / 3600).toFixed(0)}h → EXIT>${EXIT * 100}% · EMA HL${HL_D}d · CAP $${CAP} · ±${WIDE * 100}% vs ±${NARROW * 100}% · koszt przejścia $${COST}×2\n`);
  console.log('epizod  start        dni    vol$        feesWide$  feesNarrow$  uplift  inN%   EV$');
  for (let i = 0; i < episodes.length; i++) {
    const e = episodes[i];
    const up = e.feesWide > 0 ? e.feesNarrow / e.feesWide : 0;
    const inN = e.swapsIn > 0 ? (100 * e.swapsInNarrow) / e.swapsIn : 0;
    console.log(
      `${String(i + 1).padStart(4)}   ${new Date(e.startTs * 1000).toISOString().slice(0, 10)}  ${durD(e).toFixed(1).padStart(5)}  ` +
      `${e.volUsd.toLocaleString('en-US', { maximumFractionDigits: 0 }).padStart(11)} ` +
      `${e.feesWide.toFixed(2).padStart(9)}  ${e.feesNarrow.toFixed(2).padStart(10)}  ${up.toFixed(1).padStart(5)}×  ${inN.toFixed(0).padStart(3)}%  ${evOf(e).toFixed(2).padStart(7)}${e.confirmed ? '' : '  (trwa na końcu danych)'}`
    );
  }
  const durs = episodes.map(durD).sort((a, b) => a - b);
  const med = durs.length ? durs[Math.floor(durs.length / 2)] : 0;
  const evPos = episodes.filter((e) => evOf(e) > 0);
  console.log(`\nPODSUMOWANIE: epizodów ${episodes.length} (${((episodes.length / totalDays) * 365).toFixed(1)}/rok) · mediana ${med.toFixed(1)}d · czas we flat ${((flatDays / totalDays) * 100).toFixed(1)}% · EV>0: ${evPos.length}/${episodes.length} · ΣEV $${episodes.reduce((a, e) => a + evOf(e), 0).toFixed(2)}`);
  if (evPos.length) {
    const minDur = Math.min(...evPos.map(durD));
    console.log(`próg praktyczny: wszystkie epizody EV>0 trwały ≥${minDur.toFixed(1)} dnia — FLAT_ENTER podpisywać, gdy flat rokuje co najmniej tyle.`);
  }
  console.log(`\nUWAGI: wąska pozycja bez recenteringu (inN% pokazuje, ile wolumenu łapała); IL we flat pominięty (symetryczny, mały); nasza płynność ujęta w mianowniku share.`);
})();
