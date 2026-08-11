/**
 * compare-caches.ts — porównanie 1:1 dwóch cache'ów swapów tej samej puli
 * (np. referencja z RPC vs test HyperSync). Sekcja E RESEARCH-QUEUE.
 *
 *   npx tsx scripts/compare-caches.ts base-weth-usdc-030 base-weth-usdc-030-hstest
 *
 * Okna czasowe obu fetchy różnią się (startBlock liczony od "teraz"), więc
 * porównujemy CZĘŚĆ WSPÓLNĄ zakresów blokowych:
 *   1. liczba swapów w części wspólnej musi być identyczna,
 *   2. per blok: identyczny multizbiór linii (sortujemy linie wewnątrz bloku —
 *      kolejność logów w obrębie bloku może zależeć od źródła, dane nie),
 *   3. raport rozjazdów (max 10 przykładów) + skrajne linie.
 * Exit code: 0 = zgodne, 1 = rozjazd / błąd.
 */
import * as fs from 'fs';
import * as path from 'path';

const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache');

// Math.min(...keys) wysadza stos przy setkach tysięcy bloków — pętla zamiast spreadu
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
    console.error(`Brak pliku ${p}`);
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
      console.error(`${id}: linia bez pola b: ${line.slice(0, 120)}`);
      process.exit(1);
    }
    const b = Number(m[1]);
    const arr = byBlock.get(b);
    if (arr) arr.push(line);
    else byBlock.set(b, [line]);
  }
  const [mn, mx] = minMax(byBlock.keys());
  console.log(`[${id}] ${n} linii, bloki ${mn}..${mx}`);
  return byBlock;
}

const [idA, idB] = [process.argv[2], process.argv[3]];
if (!idA || !idB) {
  console.error('Użycie: npx tsx scripts/compare-caches.ts <idA> <idB>');
  process.exit(1);
}

const A = loadCache(idA);
const B = loadCache(idB);
const [minA, maxA] = minMax(A.keys());
const [minB, maxB] = minMax(B.keys());
const lo = Math.max(minA, minB);
const hi = Math.min(maxA, maxB);
console.log(`Część wspólna zakresów: bloki ${lo}..${hi}`);
if (lo > hi) {
  console.error('Zakresy się nie przecinają — nie ma czego porównywać.');
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
        `blok ${b}: ${idA}=${la.length} vs ${idB}=${lb.length} linii` +
          (la.length === lb.length
            ? `\n  A: ${la.find((l, i) => l !== lb[i])?.slice(0, 160)}\n  B: ${lb.find((l, i) => l !== la[i])?.slice(0, 160)}`
            : '')
      );
    }
  }
}

console.log(`\nSwapy w części wspólnej: ${idA}=${countA}  ${idB}=${countB}`);
console.log(`Bloki z rozjazdem: ${blocksDiff} / ${blocks.size}`);
console.log(`Pierwsza linia (A): ${firstA.slice(0, 160)}`);
console.log(`Ostatnia linia (A): ${lastA.slice(0, 160)}`);
if (blocksDiff || countA !== countB) {
  console.log('\nPrzykłady rozjazdów:');
  for (const e of examples) console.log('  ' + e);
  console.log('\nWERDYKT: ❌ ROZJAZD — nie przełączać grindu na HyperSync bez wyjaśnienia.');
  process.exit(1);
}
console.log('\nWERDYKT: ✅ ZGODNE 1:1 w części wspólnej — HyperSync może przejąć fetch.');
