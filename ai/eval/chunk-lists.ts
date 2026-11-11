/**
 * npm run ai:chunk-lists
 * Step 1.11, before any generation: retrieval for every golden question, saved as chunk-id lists, so the generator
 * runs need no embedder on the GPU. Two variants, each retrieved twice to check that retrieval is deterministic:
 *   - chosen (variant A): must reproduce the saved Sonnet k=10 run of step 1.8, whose chunk lists were not stored.
 *     Check per question: the same `evidenceGiven`, and every chunk Sonnet cited is in the list;
 *   - local (variant B): meta-index plus rerank; its recall@10 must match the saved meta-index rerank row.
 * Writes ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json and exits non-zero on any mismatch.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import type { AnswerRecord } from '../answer/measures';
import { AnswerRetrieval, type RetrievalVariant } from '../answer/retrieval';
import type { Chunk } from '../corpus/types';
import { overlaps, type GoldenQuestion } from './golden';

const K = 10;
export const CHUNK_LISTS = 'ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json';
const SONNET_K10 = 'ai/eval/results/2026-11-10-answers-k10-golden-v1-4.json';
const META_ROW = 'ai/eval/results/2026-11-10-meta-index-hybrid-rerank-golden-v1-4.json';

async function main() {
  const golden = readFileSync('ai/eval/golden.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as GoldenQuestion);
  const questions = golden.map((q) => q.question);
  const problems: string[] = [];
  const out: Record<string, { retrieval: string; lists: Record<string, string[]> }> = {};
  const given = (q: GoldenQuestion, list: Chunk[]) => (q.evidence.length === 0 ? 'no-evidence' : list.some((c) => q.evidence.some((e) => overlaps(c, e))) ? 'yes' : 'no');

  for (const variant of ['chosen', 'local'] as RetrievalVariant[]) {
    const r = new AnswerRetrieval(process.cwd(), variant);
    const first = await r.retrieve(questions, K);
    const second = await r.retrieve(questions, K);
    golden.forEach((q, i) => {
      const a = first[i].map((c) => c.id).join();
      const b = second[i].map((c) => c.id).join();
      if (a !== b) problems.push(`${variant} ${q.id}: two retrievals differ`);
    });
    out[variant] = { retrieval: r.name, lists: Object.fromEntries(golden.map((q, i) => [q.id, first[i].map((c) => c.id)])) };

    if (variant === 'chosen') {
      const saved = JSON.parse(readFileSync(SONNET_K10, 'utf8')) as { retrieval: string; perQuestion: AnswerRecord[] };
      if (saved.retrieval !== r.name) problems.push(`chosen: retrieval name differs from the saved run: ${saved.retrieval} vs ${r.name}`);
      let cited = 0;
      for (const p of saved.perQuestion) {
        const i = golden.findIndex((q) => q.id === p.id);
        const ids = new Set(first[i].map((c) => c.id));
        if (given(golden[i], first[i]) !== p.evidenceGiven) problems.push(`chosen ${p.id}: evidenceGiven ${given(golden[i], first[i])} vs saved ${p.evidenceGiven}`);
        for (const c of p.citations) {
          cited++;
          if (!ids.has(c.chunkId)) problems.push(`chosen ${p.id}: cited chunk ${c.chunkId} not in the list`);
        }
      }
      console.log(`chosen: ${saved.perQuestion.length} questions and ${cited} cited chunks checked against the saved Sonnet k=10 run`);
    } else {
      const row = JSON.parse(readFileSync(META_ROW, 'utf8')) as { metrics: { full: Record<string, { hits: number; n: number }> } };
      const hits = golden.filter((q, i) => q.answerable === 'yes' && given(q, first[i]) === 'yes').length;
      const want = row.metrics.full['recall@10'];
      console.log(`local: recall@10 ${hits}/${want.n}, saved meta-index rerank row ${want.hits}/${want.n}`);
      if (hits !== want.hits) problems.push(`local: recall@10 ${hits} vs saved row ${want.hits}`);
    }
  }

  writeFileSync(CHUNK_LISTS, JSON.stringify({ date: '2026-11-11', goldenVersion: '1.4', k: K, deterministic: !problems.some((p) => p.includes('differ')), problems, variants: out }, null, 2) + '\n');
  console.log(problems.length ? `PROBLEMS (${problems.length}):\n  ${problems.join('\n  ')}` : 'all checks passed');
  console.log(`Wrote ${CHUNK_LISTS}`);
  if (problems.length) process.exit(1);
}

// Guarded: ai/eval/answers.ts imports CHUNK_LISTS from here, and must not trigger a retrieval run (11 Nov mishap).
if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
