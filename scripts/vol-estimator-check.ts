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
const rows: Row[] = fs
  .readFileSync(dataPath, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((r: Row) => r.sp)
  .sort((a: Row, b: Row) => a.b - b.b);

// cena "ludzka" nogi bazowej (ta sama konwencja co advisor/paper)
const price = (r: Row) => {
  const sp = Number(BigInt(r.sp)) / 2 ** 96;
  const p = sp * sp * 10 ** (d0 - d1);
  return cfg.ethIsToken0 ? p : 1 / p;
};

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
const ref = resampled(300);
if (ref) {
  const diff = ((volAdvisor - ref) / ref) * 100;
  console.log(`\nadvisor vs realized@5min: ${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%  ${Math.abs(diff) < 15 ? '(zgodne — brak istotnego obciążenia)' : diff < 0 ? '(advisor ZANIŻA)' : '(advisor ZAWYŻA)'}`);
}
