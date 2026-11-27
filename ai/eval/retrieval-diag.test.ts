/**
 * Step 6.3: the pure parts of the retrieval diagnostic (no box, no cache). Run: npx tsx ai/eval/retrieval-diag.test.ts
 */
import type { Chunk } from '../corpus/types';
import type { Evidence } from './golden';
import { bm25QueryFor, contextsFor, keyDiff, listDiff, rerankOrder, spanRank, type EntryKey } from './retrieval-diag';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

// Rerank order: score descending, ties kept in first-stage order, only the first n candidates.
const top = ['a', 'b', 'c', 'd', 'e'];
check('order by score', rerankOrder(top, [0.1, 0.9, 0.5, 0.3, 0.2], 5).join() === 'b,c,d,e,a');
check('ties keep first-stage order', rerankOrder(top, [0.5, 0.5, 0.9, 0.5, 0.1], 5).join() === 'c,a,b,d,e');
check('only the first n are reranked', rerankOrder(top, [0.1, 0.2, 0.3, 0.4, 0.9], 3).join() === 'c,b,a');

// Span rank: first chunk overlapping the span, 1-based.
const chunk = (id: string, file: string, a: number, b: number) => ({ id, file, lineStart: a, lineEnd: b, text: '' }) as unknown as Chunk;
const byId = new Map([chunk('x', 'journal/CONTEXT.md', 1, 10), chunk('y', 'journal/CONTEXT.md', 11, 20), chunk('z', 'docs/PLAN.md', 1, 9)].map((c) => [c.id, c]));
const span = { file: 'journal/CONTEXT.md', lines: [15, 16] } as Evidence;
check('span found at its rank', spanRank(['z', 'x', 'y'], byId, span) === 3);
check('span not found', spanRank(['z', 'x'], byId, span) === null);

// List differences are named, not silent.
check('same list', listDiff(['a', 'b'], ['a', 'b']) === null);
check('swap reported with rank', listDiff(['a', 'b', 'c'], ['a', 'c', 'b']) === 'order from rank 2: stored b, now c');
check('changed set reported', listDiff(['a', 'b'], ['a', 'c']) === 'stored only b; now only c');

// Cache key: any field that differs is named.
const key: EntryKey = {
  variant: 'local',
  question: 'q',
  corpusHash: 'h',
  index: 'ollama-bge-m3.meta',
  indexCreatedAt: 't',
  indexCorpusHash: 'i',
  embedder: 'ollama-bge-m3',
  reranker: 'rerank:bge-reranker-v2-m3',
  rerankFormat: 'meta',
  contexts: null,
  bm25Query: 'q',
};
check('same key', keyDiff(key, { ...key }).length === 0);
const d = keyDiff(key, { ...key, corpusHash: 'other', question: 'q2' });
check('changed corpus and question named', d.length === 2 && d.some((x) => x.startsWith('corpusHash')) && d.some((x) => x.startsWith('question')), d.join('; '));

// Variants: only "chosen" gives BM25 the Polish rendering; only "local" has no contexts (6.10 keeps the plain question).
const pl = { question: 'q', polish: 'pytanie', keywords: ['a', 'b'] };
check('chosen BM25 gets the Polish rendering', bm25QueryFor('chosen', 'q', pl) === 'q pytanie a b');
check('chosen without a rendering is marked', bm25QueryFor('chosen', 'q', undefined) === '(missing)');
check('ctx-plain BM25 gets the plain question', bm25QueryFor('ctx-plain', 'q', pl) === 'q');
check('local BM25 gets the plain question', bm25QueryFor('local', 'q', pl) === 'q');
check('contexts: none for local, the Haiku file for chosen and ctx-plain', contextsFor('local') === null && contextsFor('chosen') === contextsFor('ctx-plain') && !!contextsFor('ctx-plain'));

console.log(`retrieval-diag: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
