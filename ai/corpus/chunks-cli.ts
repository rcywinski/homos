/**
 * npm run ai:chunks
 * Builds the chunk list and prints: chunks per file, a size histogram, the 5 largest and 5 smallest
 * chunks, and how the test-case entry (CONTEXT.md, 2026-08-29) was split.
 * Exits with 1 if a chunk is above the cap or two chunks share an id.
 */
import { loadCorpus } from './load';
import { estimateTokens, MAX_CHUNK_TOKENS } from './tokens';
import type { Chunk } from './types';

const chunks = loadCorpus();
const tok = (c: Chunk) => estimateTokens(c.text);
const short = (s: string, n = 70) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const pad = (s: string | number, n: number) => String(s).padStart(n);

console.log(`\n${chunks.length} chunks, cap ${MAX_CHUNK_TOKENS} estimated tokens\n`);

console.log('Chunks per file');
const perFile = new Map<string, Chunk[]>();
for (const c of chunks) perFile.set(c.file, [...(perFile.get(c.file) ?? []), c]);
const reports = [...perFile.keys()].filter((f) => f.startsWith('journal/reports/'));
for (const [file, list] of perFile) {
  if (file.startsWith('journal/reports/')) continue;
  const split = list.filter((c) => c.part).length;
  console.log(`  ${pad(list.length, 4)}  ${file}${split ? `  (${split} of them are parts of split units)` : ''}`);
}
const reportChunks = reports.flatMap((f) => perFile.get(f) ?? []);
console.log(`  ${pad(reportChunks.length, 4)}  journal/reports/*.md  (${reports.length} reports)`);

console.log('\nBy kind');
const kinds = new Map<string, number>();
for (const c of chunks) kinds.set(c.kind, (kinds.get(c.kind) ?? 0) + 1);
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`  ${pad(n, 4)}  ${k}`);

console.log('\nSize histogram (estimated tokens)');
const edges = [0, 50, 100, 200, 400, 800, 1200, MAX_CHUNK_TOKENS + 1, Infinity];
const counts = edges.slice(1).map(() => 0);
for (const c of chunks) counts[edges.findIndex((e, i) => tok(c) >= e && tok(c) < edges[i + 1])]++;
const maxCount = Math.max(...counts);
counts.forEach((n, i) => {
  const label = edges[i + 1] === Infinity ? `> ${edges[i] - 1}` : `${edges[i]}-${edges[i + 1] - 1}`;
  console.log(`  ${label.padStart(9)}  ${pad(n, 4)}  ${'#'.repeat(Math.round((n / maxCount) * 50))}`);
});

const bySize = [...chunks].sort((a, b) => tok(b) - tok(a));
const row = (c: Chunk) => `  ${pad(tok(c), 5)}  ${short(c.id, 44).padEnd(44)}  ${short(c.title, 60)}`;
console.log('\n5 largest');
bySize.slice(0, 5).forEach((c) => console.log(row(c)));
console.log('\n5 smallest');
bySize.slice(-5).reverse().forEach((c) => console.log(row(c)));

const testCase = chunks.filter((c) => c.file === 'journal/CONTEXT.md' && c.date === '2026-08-29' && c.part);
if (testCase.length) {
  console.log(`\nTest case: ${short(testCase[0].title, 90)}`);
  for (const c of testCase) {
    const firstWords = short(c.text.slice(c.title.length).trim().replace(/\s+/g, ' '), 60);
    console.log(`  p${c.part?.index}/${c.part?.of}  lines ${c.lineStart}-${c.lineEnd}  ${pad(tok(c), 5)} tok  "${firstWords}"`);
  }
}

const over = chunks.filter((c) => tok(c) > MAX_CHUNK_TOKENS);
const ids = new Set<string>();
const dup = chunks.filter((c) => (ids.has(c.id) ? true : (ids.add(c.id), false)));
console.log(`\nAbove cap: ${over.length}. Duplicate ids: ${dup.length}.`);
over.forEach((c) => console.log(`  OVER ${c.id} ${tok(c)}`));
dup.forEach((c) => console.log(`  DUP  ${c.id}`));
if (over.length || dup.length) process.exit(1);
