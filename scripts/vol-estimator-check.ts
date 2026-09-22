/**
 * vol-estimator-check.ts — comparison of volatility estimators ON THE SAME
 * data and in THE SAME window. Created 21.08 to settle a dispute:
 * does the per-swap EWMA from `computeStats` (advisor) underestimate σ relative
 * to standard realized vol, or not.
 *
 *   npx tsx scripts/vol-estimator-check.ts mainnet-usdc-weth-005 [hours=24]
 *
 * IMPORTANT methodologically: only estimators computed on the same window may be
 * compared. Pitting "advisor from a calm window" against "realized vol from a
 * volatile window" says nothing about estimator bias — it speaks about the market.
 *
 * Output: daily σ per (a) the advisor formula, (b) realized vol from
 * 1/5/15/60 min samples, plus the implied range width for k=2,3,4.
 */
import * as fs from 'fs';
import * as path from 'path';

const CACHE = path.join(__dirname, '..', 'data', 'cache');
const BLOCK_TIME: Record<string, number> = { mainnet: 12, base: 2, arbitrum: 0.25, optimism: 2 };

const id = process.argv[2];
const hours = Number(process.argv[3] || 24);
if (!id) {
  console.error('Provide a pool id, e.g. mainnet-usdc-weth-005');
  process.exit(1);
}
const metaPath = path.join(CACHE, `${id}.meta.json`);
const dataPath = path.join(CACHE, `${id}.ndjson`);
if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) {
  console.error(`Missing ${id}.meta.json or ${id}.ndjson in data/cache`);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const cfg = meta.cfg;
const bt = BLOCK_TIME[cfg.chain];
const d0 = cfg.token0Decimals;
const d1 = cfg.token1Decimals;

type Row = { b: number; sp: string };

/**
 * Reading FROM THE END of the file, in chunks — the cache can exceed 1.6GB, and the
 * string limit in Node is ~536MB (crash `Cannot create a string longer than
 * 0x1fffffe8 characters`, reported by CC-Win 21.08). We read only as much
 * as the requested window of hours needs.
 */
function readTailRows(file: string, needFrom: (lastBlock: number) => number): Row[] {
  const CHUNK = 4 * 1024 * 1024;
  const fd = fs.openSync(file, 'r');
  try {
    let pos = fs.fstatSync(fd).size;
    let carry = ''; // unfinished FIRST row from the previous (later) chunk
    let rows: Row[] = [];
    let fromBlock: number | null = null;
    while (pos > 0) {
      const len = Math.min(CHUNK, pos);
      pos -= len;
      const buf = Buffer.allocUnsafe(len);
      fs.readSync(fd, buf, 0, len, pos);
      const text = buf.toString('utf8') + carry;
      const parts = text.split('\n');
      carry = pos > 0 ? parts.shift() ?? '' : ''; // the first fragment may be cut off
      const parsed: Row[] = [];
      for (const l of parts) {
        if (!l.trim()) continue;
        try {
          const r = JSON.parse(l) as Row;
          if (r && r.sp && Number.isFinite(r.b)) parsed.push(r);
        } catch {
          /* skip a cut-off/corrupted row */
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

// "human" price of the base leg (same convention as advisor/paper)
const price = (r: Row) => {
  const sp = Number(BigInt(r.sp)) / 2 ** 96;
  const p = sp * sp * 10 ** (d0 - d1);
  return cfg.ethIsToken0 ? p : 1 / p;
};

const rows = readTailRows(dataPath, (last) => last - Math.floor((hours * 3600) / bt));
if (!rows.length) {
  console.error(`${id}: no swaps loaded`);
  process.exit(1);
}
const lastBlock = rows[rows.length - 1].b;
const fromBlock = lastBlock - Math.floor((hours * 3600) / bt);
const w = rows.filter((r) => r.b > fromBlock);
if (w.length < 50) {
  console.error(`Too few swaps in the ${hours}h window (${w.length}) — widen the window.`);
  process.exit(1);
}

// (a) advisor estimator: EWMA r^2 per swap, half-life 12h
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

// (b) realized vol on a sample every N seconds (last price in the bucket)
function resampled(sec: number): number | null {
  const bucket = Math.max(1, Math.floor(sec / bt));
  const m = new Map<number, number>();
  for (const r of w) m.set(Math.floor(r.b / bucket), price(r));
  const ks = [...m.keys()].sort((a, b) => a - b);
  let s = 0;
  let n = 0;
  for (let i = 1; i < ks.length; i++) {
    if (ks[i] - ks[i - 1] !== 1) continue; // gaps are skipped, not stitched
    const lr = Math.log(m.get(ks[i])! / m.get(ks[i - 1])!);
    s += lr * lr;
    n++;
  }
  return n >= 20 ? Math.sqrt((s / n) * (86400 / sec)) : null;
}

// (c) trend vs chop diagnostic: |net move| / √Σr² over swap steps.
// ≈1 → random walk; <1 → the price chops in place (the swap estimator
// OVERESTIMATES relative to the real displacement); >1 → the price moves one way
// in small steps (the swap estimator UNDERESTIMATES — the sum of squares of small
// steps is much smaller than the square of the total move).
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
    ? `${nazwa.padEnd(28)} — too few samples`
    : `${nazwa.padEnd(28)} ${(v * 100).toFixed(2)}%/d   range k=2/3/4: ±${(width(v, 2) * 100).toFixed(1)}% / ±${(width(v, 3) * 100).toFixed(1)}% / ±${(width(v, 4) * 100).toFixed(1)}%`;

console.log(`\npool ${id} (${cfg.chain}) | window ${hours}h | swaps ${w.length} | no price move: ${zeroMoves} (${((zeroMoves / w.length) * 100).toFixed(0)}%)`);
console.log(`price at window end: ${price(w[w.length - 1]).toFixed(2)}\n`);
console.log(line('(a) advisor (per swap)', volAdvisor));
for (const [nm, sec] of [['1 min', 60], ['5 min', 300], ['15 min', 900], ['1 h', 3600]] as const)
  console.log(line(`(b) realized vol @ ${nm}`, resampled(sec)));
// --- verdict TAKING microstructure noise INTO ACCOUNT ------------------------
// NOTE (correction 21.08): realized vol at a 1–5 min sample is itself often INFLATED
// by the price bouncing within the fee band (bid-ask bounce) — the wider the fee
// (0.30% vs 0.05%), the stronger. If σ decreases monotonically as the sample
// lengthens, that is the signature of noise, not true volatility — then the
// reference point should be the 15min/1h sample, NOT 5min.
const v5 = resampled(300);
const v15 = resampled(900);
const v60 = resampled(3600);
const noiseDecay = v5 && v60 ? (v5 - v60) / v5 : null;
const ref = v60 ?? v15 ?? v5;
const refName = v60 ? '1h' : v15 ? '15min' : '5min';
if (ref) {
  const diff = ((volAdvisor - ref) / ref) * 100;
  console.log(
    `\nverdict (reference: realized@${refName}): advisor ${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%  ` +
      `${Math.abs(diff) < 15 ? '→ consistent, no significant bias' : diff < 0 ? '→ advisor UNDERESTIMATES' : '→ advisor OVERESTIMATES'}`
  );
  if (noiseDecay !== null)
    console.log(
      `σ decay from 5min→1h sample: ${(noiseDecay * 100).toFixed(0)}%  ` +
        `${noiseDecay > 0.25 ? '(strong microstructure noise — do NOT use 5min as the reference)' : '(moderate noise)'}`
    );
  console.log(`fee tier: ${(cfg.feeBps / 10000).toFixed(2)}% — the wider the fee, the larger the bounce within the band.`);
}
if (trendRatio !== null) {
  console.log(
    `\ntrend vs chop: |net move| ${(netMove * 100).toFixed(2)}% / √Σr² ${(Math.sqrt(sumR2) * 100).toFixed(2)}% = ${trendRatio.toFixed(2)}  ` +
      (trendRatio < 0.5
        ? '→ the price chops in place; the SWAP estimator overestimates relative to the real displacement'
        : trendRatio > 1.2
          ? '→ the price moves one way in small steps; the SWAP estimator underestimates (sum of squares ≪ square of the move)'
          : '→ close to a random walk')
  );
  console.log(
    'CONCLUSION: for setting the range what matters is the SIZE OF THE MOVE over the horizon, not "chop".\n' +
      'σ computed from swap-by-swap jumps depends on the pool microstructure (fee tier,\n' +
      'trade frequency), not on the asset volatility — which is why two pools on THE SAME\n' +
      'ETH can give σ differing several-fold. A time sample (15min/1h) does not have this.'
  );
}
