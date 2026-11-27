/**
 * Step 6.3: the pure parts of the retrieval diagnostic (no box, no cache). Run: npx tsx ai/eval/retrieval-diag.test.ts
 */
import type { Chunk } from '../corpus/types';
import { compareWithPreset, localOptions } from './answers';
import { decide, type Counts } from './compare-611';
import { DEFAULT_PRESET, PRESETS } from '../serve/config';
import type { Evidence } from './golden';
import { bm25QueryFor, contextsFor, capTitles, detectDates, detectIds, detectTemporal, factChange, fileNeighbours, fuseOrders, matchFront, putFirst, temporalReorder, withNext, keyDiff, listDiff, rerankOrder, spanRank, type EntryKey } from './retrieval-diag';

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

// Per-question fact change: totals, gaining and losing questions, only differing ones listed.
const fc = factChange(['a', 'b', 'c'], { a: 1, b: 2, c: 0 }, { a: 3, b: 1, c: 0 });
check('fact change totals', fc.base === 3 && fc.cand === 4 && fc.gain === 1 && fc.loss === 1);
check('fact change lists only differing questions', fc.rows.map((r) => r.id).join() === 'a,b');

// Fusion of the reranker order with the first-stage order (6.6): the two ends reproduce the two orders, ties go to
// the first-stage rank, and a mid weight mixes them.
const fsOrder = ['a', 'b', 'c', 'd'];
const rrOrder = ['c', 'd', 'b', 'a'];
check('fusion w = 0 is the first-stage order', fuseOrders(fsOrder, rrOrder, 0).join() === fsOrder.join());
check('fusion w = 1 is the reranker order', fuseOrders(fsOrder, rrOrder, 1).join() === rrOrder.join());
// a: 1/63 + 1/61 ties c: 1/61 + 1/63 at w = 0.5, a has the better first-stage rank; b: 2/62 is just below.
check('fusion tie goes to the first-stage rank', fuseOrders(['a', 'b', 'c'], ['c', 'b', 'a'], 0.5).join() === 'a,c,b');
check('fusion at w = 0.9 follows the reranker mostly', fuseOrders(['a', 'b', 'c'], ['c', 'b', 'a'], 0.9).join() === 'c,b,a');
let threw = false;
try {
  fuseOrders(['a', 'x'], ['a'], 0.5);
} catch {
  threw = true;
}
check('fusion refuses an id missing from the reranked pool', threw);

// Neighbours (6.7): same file only, line order; the list respects the cap, skips duplicates and fills when asked.
const mk = (id: string, file: string, lineStart: number) => ({ id, file, lineStart, lineEnd: lineStart + 1, kind: 'entry', title: '', text: '' }) as unknown as Chunk;
const nb = fileNeighbours([mk('f1b', 'f1', 10), mk('f1a', 'f1', 1), mk('f1c', 'f1', 20), mk('f2a', 'f2', 1)]);
check('next in line order within the file', nb.next.get('f1a') === 'f1b' && nb.next.get('f1b') === 'f1c' && !nb.next.has('f1c'));
check('previous in line order, none across files', nb.prev.get('f1b') === 'f1a' && !nb.prev.has('f1a') && !nb.prev.has('f2a') && !nb.next.has('f2a'));
check('top 1 with next, filled to 3', withNext(['f1a', 'f2a', 'f1c'], nb.next, 1, 3, true).join() === 'f1a,f1b,f2a');
check('next already listed is not repeated', withNext(['f1a', 'f1b', 'f2a'], nb.next, 2, 10, false).join() === 'f1a,f1b,f1c');
check('cap respected without fill', withNext(['f1a', 'f1b', 'f2a'], nb.next, 3, 2, false).join() === 'f1a,f1b');

// 6.8 detectors on real development question texts, false positives included (why-09 says "first").
check('temporal: first is ascending', detectTemporal('When did the nightly run first complete without errors?') === 'asc');
check('temporal: last is descending', detectTemporal('When did the last backtest finish?') === 'desc');
check('temporal: whole words only', detectTemporal('How long did it last?') === 'desc' && detectTemporal('Was it firstly planned?') === null);
check('temporal: why-09 is a false positive, kept', detectTemporal('Why did the first 365-day backtests suggest some strategies were profitable?') === 'asc');
check('dates: day and month name', detectDates('Which positions were open on 15 September?').join() === '2026-09-15');
check('dates: none in a plain question', detectDates('When was the capital withdrawn?').length === 0);
check('ids: # number by its digits', detectIds('Is position #5978579 a wide or a narrow position?').join() === '5978579');
check('ids: UPPER_SNAKE, camelCase, letter and digits', detectIds('Is FLAT_NARROW in fetchFreshPool, stage E8.2 or package D0?').join() === 'FLAT_NARROW,fetchFreshPool,E8.2,D0');
check('ids: none in a plain question', detectIds('In which database were the backtest results stored?').length === 0);

// 6.8 reorderings.
const dates: Record<string, string> = { a: '2026-09-01', b: '2026-08-01', d: '2026-08-15' };
const dOf = (id: string) => dates[id];
check('temporal w = 0 keeps the order', temporalReorder(['a', 'c', 'b', 'd', 'e'], dOf, 'asc', [], 0, 4).join() === 'a,c,b,d,e');
check('temporal w = 1, ascending, undated keep their slot, after the pool unchanged', temporalReorder(['a', 'c', 'b', 'd', 'e'], dOf, 'asc', [], 1, 4).join() === 'b,c,d,a,e');
check('temporal: a named date goes first', temporalReorder(['a', 'c', 'd'], dOf, null, ['2026-08-15'], 0.5).join() === 'd,a,c');
check('match front within n, base order', matchFront(['a', 'b', 'c', 'd'], (id) => id === 'c' || id === 'd', 3).join() === 'c,a,b,d');
check('put first, capped, no duplicates', putFirst(['a', 'b', 'c'], ['c', 'x', 'y'], 2).join() === 'c,x,a,b');
check('cap titles, fill in base order', capTitles(['a', 'b', 'c', 'd'], (id) => (id === 'd' ? 'T2' : 'T1'), 3, 2).join() === 'a,b,d,c');

// 6.10: the answer runner's generator against the served preset, every setting that shapes an answer.
const preset = PRESETS[DEFAULT_PRESET];
const fromPreset = compareWithPreset({ ...preset.generator, baseUrl: 'http://x' }, preset);
check('preset against itself: all equal', fromPreset.every((c) => c.equal), fromPreset.filter((c) => !c.equal).map((c) => c.field).join());
check('compared fields include prompt, builder, context and sampling', ['systemSha256', 'userPrompt', 'numCtx', 'numPredict', 'think', 'model', 'sampling.temperature', 'sampling.frequency_penalty'].every((f) => fromPreset.some((c) => c.field === f)));
const tuningP = compareWithPreset(localOptions('http://x', false, 'qwen3.8:27b', 'P'), preset);
check('tuning variant P equals the served preset (the measured run it came from)', tuningP.every((c) => c.equal), tuningP.filter((c) => !c.equal).map((c) => `${c.field} ${c.run}/${c.served}`).join());
const base = compareWithPreset(localOptions('http://x', false), preset).filter((c) => !c.equal).map((c) => c.field);
check('tuning base differs from the preset and is named', base.includes('numCtx') && base.includes('systemSha256') && base.includes('sampling.presence_penalty'), base.join());
const hot = compareWithPreset({ ...preset.generator, baseUrl: 'http://x', sampling: { ...preset.generator.sampling, temperature: 1 } }, preset);
check('one sampling change is caught', hot.filter((c) => !c.equal).map((c) => c.field).join() === 'sampling.temperature');

// 6.11 rule, as committed: sanity, guard margins, choice.
const cc = (correct: number, incorrect = 5, unsupported = 1): Counts => ({ correct, partly: 34 - correct - incorrect, incorrect, unsupported, missing: 0 });
const two = (a: Counts, b: Counts = a): [Counts, Counts] => [a, b];
check('sanity fails when both S runs are 12 or below', !decide({ S: two(cc(12), cc(11)), N: two(cc(17)), H: two(cc(17)) }).sane);
check('sanity holds with one S run outside', decide({ S: two(cc(12), cc(16)), N: two(cc(17)), H: two(cc(17)) }).sane);
check('guard: a drop of exactly 3 passes, more fails', decide({ S: two(cc(17)), N: two(cc(14)), H: two(cc(13), cc(14)) }).guard.N.pass && !decide({ S: two(cc(17)), N: two(cc(14)), H: two(cc(13), cc(14)) }).guard.H.pass);
check('guard: incorrect up by more than 2 fails', !decide({ S: two(cc(17, 5)), N: two(cc(17, 8)), H: two(cc(17)) }).guard.N.pass);
check('guard: unsupported up by more than 2 fails', !decide({ S: two(cc(17, 5, 1)), N: two(cc(17, 5, 4)), H: two(cc(17)) }).guard.N.pass);
check('choice: both pass, H by under 3, N', decide({ S: two(cc(17)), N: two(cc(17)), H: two(cc(19)) }).choice === 'N');
check('choice: both pass, H by 3, H', decide({ S: two(cc(17)), N: two(cc(16)), H: two(cc(19)) }).choice === 'H');
check('choice: neither passes, S stays', decide({ S: two(cc(19)), N: two(cc(15)), H: two(cc(15)) }).choice === 'S');

console.log(`retrieval-diag: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
