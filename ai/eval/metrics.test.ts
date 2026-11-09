/**
 * Tests for retrieval metrics and the vector store (offline, FakeEmbedder).
 * Run: npx tsx ai/eval/metrics.test.ts
 */
import type { Chunk } from '../corpus/types';
import { FakeEmbedder } from '../embed/fake';
import { VectorStore } from '../store/vector';
import { firstHitRank, fmtRatio, journalOnly, mrrAt, recallAt } from './metrics';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const chunk = (file: string, a: number, b: number): Chunk => ({
  id: `${file}:${a}`, file, lineStart: a, lineEnd: b, kind: 'journal-entry', title: 't', text: 't',
});

async function main() {
  // 1. recall and MRR on hand-made ranks.
  const ranks = [1, 3, 7, null, 25];
  const r5 = recallAt(ranks, 5);
  check('recall@5', r5.hits === 2 && r5.n === 5);
  check('recall@10', recallAt(ranks, 10).hits === 3);
  check('recall@30', recallAt(ranks, 30).hits === 4);
  check('mrr@10', Math.abs(mrrAt(ranks, 10) - (1 + 1 / 3 + 1 / 7) / 5) < 1e-12);
  check('mrr ignores ranks below k', mrrAt([25], 10) === 0);
  check('format with counts', fmtRatio({ hits: 12, n: 27 }) === '44% (12/27)');

  // 2. first hit: overlap on lines in the same file; journal-only drops docs/ ranges.
  const ranked = [chunk('docs/CASE-STUDY.md', 67, 90), chunk('journal/CONTEXT.md', 246, 276), chunk('journal/CONTEXT.md', 96, 96)];
  const evidence = [
    { file: 'docs/CASE-STUDY.md', lines: [81, 84] as [number, number] },
    { file: 'journal/CONTEXT.md', lines: [96, 96] as [number, number] },
  ];
  check('first hit full', firstHitRank(ranked, evidence) === 1);
  check('first hit journal-only', firstHitRank(ranked, journalOnly(evidence)) === 3);
  check('no hit', firstHitRank(ranked, [{ file: 'journal/HANDOFF.md', lines: [1, 5] }]) === null);
  check('adjacent lines are not a hit', firstHitRank([chunk('journal/CONTEXT.md', 97, 99)], [{ file: 'journal/CONTEXT.md', lines: [96, 96] }]) === null);

  // 3. VectorStore with FakeEmbedder: the text sharing the query's words ranks first; scores descend.
  const e = new FakeEmbedder(64);
  const texts = ['raport poranny pipeline backtest', 'pozycja #5978579 szeroki zakres cbBTC', 'decyzja zwężenie flat'];
  const vectors = await e.embed(texts, 'document');
  const store = new VectorStore(['a', 'b', 'c'], vectors, e);
  const [hits] = await store.search(['#5978579 szeroki'], 3);
  check('best match first', hits[0].id === 'b', JSON.stringify(hits));
  check('scores descending', hits.every((h, i) => i === 0 || h.score <= hits[i - 1].score));
  check('k respected', (await store.search(['x'], 2))[0].length === 2);

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
