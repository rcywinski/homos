/**
 * vol-estimator-check.ts — porównanie estymatorów zmienności NA TYCH SAMYCH
 * danych i w TYM SAMYM oknie. Powstało 21.08, żeby rozstrzygnąć spór:
 * czy per-swapowy EWMA z `computeStats` (advisor) zaniża σ względem
 * standardowego realized vol, czy nie.
 *
 *   npx tsx scripts/vol-estimator-check.ts mainnet-usdc-weth-005 [godzin=24]
 *
 * WAŻNE metodologicznie: porównywać wolno TYLKO estymatory policzone na tym
 * samym oknie. Zestawianie "advisor z okna spokojnego" z "realized vol z okna
 * zmiennego" nie mówi nic o obciążeniu estymatora — mówi o rynku.
 *
 * Wyjście: σ dzienna wg (a) formuły advisora, (b) realized vol z próbek
 * 1/5/15/60 min, plus implikowana szerokość zakresu dla k=2,3,4.
 */
import * as fs from 'fs';
import * as path from 'path';

const CACHE = path.join(__dirname, '..', 'data', 'cache');
const BLOCK_TIME: Record<string, number> = { mainnet: 12, base: 2, arbitrum: 0.25, optimism: 2 };

const id = process.argv[2];
const hours = Number(process.argv[3] || 24);
if (!id) {
  console.error('Podaj id puli, np. mainnet-usdc-weth-005');
  process.exit(1);
}
const metaPath = path.join(CACHE, `${id}.meta.json`);
const dataPath = path.join(CACHE, `${id}.ndjson`);
if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) {
  console.error(`Brak ${id}.meta.json albo ${id}.ndjson w data/cache`);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const cfg = meta.cfg;
const bt = BLOCK_TIME[cfg.chain];
const d0 = cfg.token0Decimals;
const d1 = cfg.token1Decimals;

type Row = { b: number; sp: string };

/**
 * Czytanie OD KOŃCA pliku, chunkami — cache potrafi mieć >1.6GB, a limit
 * stringa w Node to ~536MB (crash `Cannot create a string longer than
 * 0x1fffffe8 characters`, zgłoszony przez CC-Win 21.08). Czytamy tylko tyle,
 * ile trzeba na żądane okno godzin.
 */
function readTailRows(file: string, needFrom: (lastBlock: number) => number): Row[] {
  const CHUNK = 4 * 1024 * 1024;
  const fd = fs.openSync(file, 'r');
  try {
    let pos = fs.fstatSync(fd).size;
    let carry = ''; // niedokończony PIERWSZY wiersz z poprzedniego (późniejszego) chunku
    let rows: Row[] = [];
    let fromBlock: number | null = null;
    while (pos > 0) {
      const len = Math.min(CHUNK, pos);
      pos -= len;
      const buf = Buffer.allocUnsafe(len);
      fs.readSync(fd, buf, 0, len, pos);
      const text = buf.toString('utf8') + carry;
      const parts = text.split('\n');
      carry = pos > 0 ? parts.shift() ?? '' : ''; // pierwszy fragment może być ucięty
      const parsed: Row[] = [];
      for (const l of parts) {
        if (!l.trim()) continue;
        try {
          const r = JSON.parse(l) as Row;
          if (r && r.sp && Number.isFinite(r.b)) parsed.push(r);
        } catch {
          /* ucięty/uszkodzony wiersz pomijamy */
        }
      }
      rows = parsed.concat(rows);
      if (fromBlock === null && rows.length) fromBlock = needFrom(Math.max(...rows.map((r) => r.b)));
      if (fromBlock !== null && rows.length && Math.min(...rows.map((r) => r.b)) <= fromBlock) break;
    }
    return rows.sort((a, b) => a.b - b.b);
  } finally {
    fs.closeSync(fd);
  }
}

// cena "ludzka" nogi bazowej (ta sama konwencja co advisor/paper)
const price = (r: Row) => {
  const sp = Number(BigInt(r.sp)) / 2 ** 96;
  const p = sp * sp * 10 ** (d0 - d1);
  return cfg.ethIsToken0 ? p : 1 / p;
};

const rows = readTailRows(dataPath, (last) => last - Math.floor((hours * 3600) / bt));
if (!rows.length) {
  console.error(`${id}: brak wczytanych swapów`);
  process.exit(1);
}
const lastBlock = rows[rows.length - 1].b;
const fromBlock = lastBlock - Math.floor((hours * 3600) / bt);
const w = rows.filter((r) => r.b > fromBlock);
if (w.length < 50) {
  console.error(`Za mało swapów w oknie ${hours}h (${w.length}) — zwiększ okno.`);
  process.exit(1);
}

// (a) estymator advisora: EWMA r^2 per swap, półtrwanie 12h
let volVar = 0;
let lastP: number | null = null;
let lastB: number | null = null;
let zeroMoves = 0;
for (const r of w) {
  const p = price(r);
  const dt = Math.max((r.b - (lastB ?? r.b)) * bt, bt);
  if (lastP !== null && p > 0 && lastP > 0) {
    const lr = Math.log(p / lastP);
    if (lr === 0) zeroMoves++;
    const perDay = (lr * lr * 86400) / dt;
    const a = 1 - Math.exp(-dt / (43200 / Math.LN2));
    volVar = (1 - a) * volVar + a * perDay;
  }
  lastP = p;
  lastB = r.b;
}
const volAdvisor = Math.sqrt(volVar);

// (b) realized vol na próbce co N sekund (ostatnia cena w koszyku)
function resampled(sec: number): number | null {
  const bucket = Math.max(1, Math.floor(sec / bt));
  const m = new Map<number, number>();
  for (const r of w) m.set(Math.floor(r.b / bucket), price(r));
  const ks = [...m.keys()].sort((a, b) => a - b);
  let s = 0;
  let n = 0;
  for (let i = 1; i < ks.length; i++) {
    if (ks[i] - ks[i - 1] !== 1) continue; // luki pomijamy, nie sklejamy
    const lr = Math.log(m.get(ks[i])! / m.get(ks[i - 1])!);
    s += lr * lr;
    n++;
  }
  return n >= 20 ? Math.sqrt((s / n) * (86400 / sec)) : null;
}

// (c) diagnostyka trend vs szarpanina: |ruch netto| / √Σr² po krokach swapowych.
// ≈1 → błądzenie losowe; <1 → cena szarpie się w miejscu (estymator swapowy
// ZAWYŻA względem realnego przemieszczenia); >1 → cena idzie w jedną stronę
// małymi krokami (estymator swapowy ZANIŻA — suma kwadratów małych kroków jest
// dużo mniejsza niż kwadrat ruchu łącznego).
let sumR2 = 0;
let prev: number | null = null;
for (const r of w) {
  const p = price(r);
  if (prev) sumR2 += Math.log(p / prev) ** 2;
  prev = p;
}
const netMove = Math.abs(Math.log(price(w[w.length - 1]) / price(w[0])));
const trendRatio = sumR2 > 0 ? netMove / Math.sqrt(sumR2) : null;

const width = (sigma: number, k: number) => Math.min(Math.max(k * sigma * Math.sqrt(7), 0.01), 0.6);
const line = (nazwa: string, v: number | null) =>
  v === null
    ? `${nazwa.padEnd(28)} — za mało próbek`
    : `${nazwa.padEnd(28)} ${(v * 100).toFixed(2)}%/d   zakres k=2/3/4: ±${(width(v, 2) * 100).toFixed(1)}% / ±${(width(v, 3) * 100).toFixed(1)}% / ±${(width(v, 4) * 100).toFixed(1)}%`;

console.log(`\npula ${id} (${cfg.chain}) | okno ${hours}h | swapów ${w.length} | bez ruchu ceny: ${zeroMoves} (${((zeroMoves / w.length) * 100).toFixed(0)}%)`);
console.log(`cena na koniec okna: ${price(w[w.length - 1]).toFixed(2)}\n`);
console.log(line('(a) advisor (per swap)', volAdvisor));
for (const [nm, sec] of [['1 min', 60], ['5 min', 300], ['15 min', 900], ['1 h', 3600]] as const)
  console.log(line(`(b) realized vol @ ${nm}`, resampled(sec)));
// --- werdykt z UWZGLĘDNIENIEM szumu mikrostruktury -------------------------
// UWAGA (poprawka 21.08): realized vol przy próbce 1–5 min sam bywa ZAWYŻONY
// przez odbijanie ceny w paśmie opłaty (bid-ask bounce) — im szersza opłata
// (0.30% vs 0.05%), tym mocniej. Jeśli σ maleje monotonicznie wraz z
// wydłużaniem próbki, to sygnatura szumu, a nie prawdziwa zmienność — wtedy
// punktem odniesienia ma być próbka 15min/1h, NIE 5min.
const v5 = resampled(300);
const v15 = resampled(900);
const v60 = resampled(3600);
const noiseDecay = v5 && v60 ? (v5 - v60) / v5 : null;
const ref = v60 ?? v15 ?? v5;
const refName = v60 ? '1h' : v15 ? '15min' : '5min';
if (ref) {
  const diff = ((volAdvisor - ref) / ref) * 100;
  console.log(
    `\nwerdykt (odniesienie: realized@${refName}): advisor ${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%  ` +
      `${Math.abs(diff) < 15 ? '→ zgodne, brak istotnego obciążenia' : diff < 0 ? '→ advisor ZANIŻA' : '→ advisor ZAWYŻA'}`
  );
  if (noiseDecay !== null)
    console.log(
      `spadek σ z próbki 5min→1h: ${(noiseDecay * 100).toFixed(0)}%  ` +
        `${noiseDecay > 0.25 ? '(silny szum mikrostruktury — NIE używaj 5min jako odniesienia)' : '(szum umiarkowany)'}`
    );
  console.log(`fee tier: ${(cfg.feeBps / 10000).toFixed(2)}% — im szersza opłata, tym większe odbicie w paśmie.`);
}
if (trendRatio !== null) {
  console.log(
    `\ntrend vs szarpanina: |ruch netto| ${(netMove * 100).toFixed(2)}% / √Σr² ${(Math.sqrt(sumR2) * 100).toFixed(2)}% = ${trendRatio.toFixed(2)}  ` +
      (trendRatio < 0.5
        ? '→ cena szarpie się w miejscu; estymator SWAPOWY zawyża wobec realnego przemieszczenia'
        : trendRatio > 1.2
          ? '→ cena idzie w jedną stronę małymi krokami; estymator SWAPOWY zaniża (suma kwadratów ≪ kwadrat ruchu)'
          : '→ blisko błądzenia losowego')
  );
  console.log(
    'WNIOSEK: dla ustawiania zakresu liczy się WIELKOŚĆ RUCHU w horyzoncie, nie „chop".\n' +
      'σ liczona ze skoków swap-po-swapie jest zależna od mikrostruktury puli (fee tier,\n' +
      'częstość transakcji), a nie od zmienności aktywa — dlatego dwie pule na TYM SAMYM\n' +
      'ETH potrafią dać σ różniące się kilkukrotnie. Próbka czasowa (15min/1h) tego nie ma.'
  );
}
