/**
 * compare-caches.ts — 1:1 comparison of two swap caches of the same pool
 * (e.g. RPC reference vs HyperSync test). Section E of RESEARCH-QUEUE.
 *
 *   npx tsx scripts/compare-caches.ts base-weth-usdc-030 base-weth-usdc-030-hstest
 *
 * The time windows of the two fetches differ (startBlock computed from "now"), so
 * we compare the INTERSECTION of the block ranges:
 *   1. the number of swaps in the intersection must be identical,
 *   2. per block: identical multiset of lines (we sort lines within a block —
 *      log order within a block may depend on the source, the data does not),
 *   3. mismatch report (max 10 examples) + boundary lines.
 * Exit code: 0 = consistent, 1 = mismatch / error.
 */
import * as fs from 'fs';
import * as path from 'path';

const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache');

// Math.min(...keys) blows the stack with hundreds of thousands of blocks — loop instead of spread
function minMax(keys: Iterable<number>): [number, number] {
  let mn = Infinity;
  let mx = -Infinity;
  for (const k of keys) {
    if (k < mn) mn = k;
    if (k > mx) mx = k;
  }
  return [mn, mx];
}

function loadCache(id: string): Map<number, string[]> {
  const p = path.join(CACHE_DIR, `${id}.ndjson`);
  if (!fs.existsSync(p)) {
    console.error(`Missing file ${p}`);
    process.exit(1);
  }
  const byBlock = new Map<number, string[]>();
  const raw = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const line of raw.split('\n')) {
    if (!line) continue;
    n++;
    const m = line.match(/"b":(\d+)/);
    if (!m) {
      console.error(`${id}: line without field b: ${line.slice(0, 120)}`);
      process.exit(1);
    }
    const b = Number(m[1]);
    const arr = byBlock.get(b);
    if (arr) arr.push(line);
    else byBlock.set(b, [line]);
  }
  const [mn, mx] = minMax(byBlock.keys());
  console.log(`[${id}] ${n} lines, blocks ${mn}..${mx}`);
  return byBlock;
}

const [idA, idB] = [process.argv[2], process.argv[3]];
if (!idA || !idB) {
  console.error('Usage: npx tsx scripts/compare-caches.ts <idA> <idB>');
  process.exit(1);
}

const A = loadCache(idA);
const B = loadCache(idB);
const [minA, maxA] = minMax(A.keys());
const [minB, maxB] = minMax(B.keys());
const lo = Math.max(minA, minB);
const hi = Math.min(maxA, maxB);
console.log(`Range intersection: blocks ${lo}..${hi}`);
if (lo > hi) {
  console.error('Ranges do not intersect — nothing to compare.');
  process.exit(1);
}

let countA = 0;
let countB = 0;
let blocksDiff = 0;
const examples: string[] = [];
const blocks = new Set<number>();
for (const b of A.keys()) if (b >= lo && b <= hi) blocks.add(b);
for (const b of B.keys()) if (b >= lo && b <= hi) blocks.add(b);

let firstA = '';
let lastA = '';
for (const b of [...blocks].sort((x, y) => x - y)) {
  const la = (A.get(b) ?? []).slice().sort();
  const lb = (B.get(b) ?? []).slice().sort();
  countA += la.length;
  countB += lb.length;
  if (la.length && !firstA) firstA = la[0];
  if (la.length) lastA = la[la.length - 1];
  const same = la.length === lb.length && la.every((l, i) => l === lb[i]);
  if (!same) {
    blocksDiff++;
    if (examples.length < 10) {
      examples.push(
        `block ${b}: ${idA}=${la.length} vs ${idB}=${lb.length} lines` +
          (la.length === lb.length
            ? `\n  A: ${la.find((l, i) => l !== lb[i])?.slice(0, 160)}\n  B: ${lb.find((l, i) => l !== la[i])?.slice(0, 160)}`
            : '')
      );
    }
  }
}

console.log(`\nSwaps in the intersection: ${idA}=${countA}  ${idB}=${countB}`);
console.log(`Blocks with mismatch: ${blocksDiff} / ${blocks.size}`);
console.log(`First line (A): ${firstA.slice(0, 160)}`);
console.log(`Last line (A): ${lastA.slice(0, 160)}`);
if (blocksDiff || countA !== countB) {
  console.log('\nMismatch examples:');
  for (const e of examples) console.log('  ' + e);
  console.log('\nVERDICT: ❌ MISMATCH — do not switch the grind to HyperSync without an explanation.');
  process.exit(1);
}
console.log('\nVERDICT: ✅ CONSISTENT 1:1 in the intersection — HyperSync can take over the fetch.');
