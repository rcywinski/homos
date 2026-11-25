/**
 * Step 6.1: retrieval diagnosis from stored files only (no API call, no box).
 * Run: npx tsx ai/eval/diagnose.ts
 *
 * For every golden question that was not judged correct in all six judged runs of the served retrieval (the fully
 * local variant: meta index, plain BM25, hybrid RRF, rerank of the top 30), prints:
 * - the verdicts of those runs in order (C correct, P partially, I incorrect);
 * - the rank of the first evidence chunk after the hybrid first stage and after the reranker (stored rows of 10 Nov,
 *   the same retriever and corpus hash as the live server);
 * - how many evidence spans the 10 chunks given to the generator cover (stored lists of 11 Nov; the live guest run of
 *   18 Nov received exactly these lists for all 34 questions).
 * The failure classes are assigned by hand in ai/eval/results/2026-11-25-diagnosis-golden-v1-4.md.
 */
import { readFileSync } from 'fs';
import { loadCorpus } from '../corpus/load';
import { corpusHash } from '../embed/index-file';
import { overlaps, type GoldenQuestion } from './golden';

const R = 'ai/eval/results/';
const RUNS: [string, string][] = [
  ['2026-11-16-judged-phase3-golden-v1-4.json', 'local-pb1'],
  ['2026-11-16-judged-phase3-golden-v1-4.json', 'local-pb2'],
  ['2026-11-17-judged-lan48-golden-v1-4.json', 'local-lan48'],
  ['2026-11-17-judged-lan48b-golden-v1-4.json', 'local-lan48b'],
  ['2026-11-17-judged-lan48c-golden-v1-4.json', 'local-lan48c'],
  ['2026-11-18-judged-guest46e-golden-v1-4.json', 'guest-guest46e'],
];
const FIRST_STAGE = '2026-11-10-meta-index-hybrid-golden-v1-4.json';
const RERANKED = '2026-11-10-meta-index-hybrid-rerank-golden-v1-4.json';
const LISTS = '2026-11-11-chunk-lists-k10-golden-v1-4.json';

interface JudgedItem {
  id: string;
  run: string;
  verdict?: { correctness: string };
  result?: { verdict?: { correctness: string } };
}
interface RankRow {
  id: string;
  rank: number | null;
}

const read = <T>(f: string): T => JSON.parse(readFileSync(R + f, 'utf8')) as T;
const letter: Record<string, string> = { correct: 'C', partially_correct: 'P', incorrect: 'I' };

function main() {
  const chunks = loadCorpus();
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const golden = readFileSync('ai/eval/golden.jsonl', 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenQuestion);

  const verdicts: Record<string, string> = {};
  for (const [file, run] of RUNS)
    for (const it of read<{ items: JudgedItem[] }>(file).items)
      if (it.run === run) verdicts[it.id] = (verdicts[it.id] ?? '') + (letter[(it.result?.verdict ?? it.verdict)?.correctness ?? ''] ?? '?');

  const ranks = (f: string) => {
    const j = read<{ corpusHash: string; perQuestion: RankRow[] }>(f);
    return { hash: j.corpusHash, by: new Map(j.perQuestion.map((p) => [p.id, p.rank])) };
  };
  const first = ranks(FIRST_STAGE);
  const reranked = ranks(RERANKED);
  const lists = read<{ variants: { local: { lists: Record<string, string[]> } } }>(LISTS).variants.local.lists;
  const hash = corpusHash(chunks);
  if (first.hash !== hash || reranked.hash !== hash) throw new Error(`corpus hash ${hash} differs from the stored rows`);

  let spans = 0;
  let split = 0;
  console.log(`corpus ${hash}, ${chunks.length} chunks; runs: ${RUNS.map((r) => r[1]).join(', ')}`);
  console.log('| id | answerable | verdicts | first stage | reranked | spans in top 10 |');
  console.log('|---|---|---|---|---|---|');
  for (const q of golden) {
    const perSpan = q.evidence.map((e) => chunks.filter((c) => overlaps(c, e)).length);
    spans += perSpan.length;
    split += perSpan.filter((n) => n > 1).length;
    const v = verdicts[q.id] ?? '';
    if (!/[PI]/.test(v)) continue;
    const given = lists[q.id].map((id) => byId.get(id)!);
    const has = q.evidence.length > 0;
    const cov = has ? `${q.evidence.filter((e) => given.some((c) => overlaps(c, e))).length}/${q.evidence.length}` : '-';
    const r1 = first.by.get(q.id);
    const r2 = reranked.by.get(q.id);
    console.log(`| ${q.id} | ${q.answerable} | ${v} | ${r1 ?? (has ? '>100' : '-')} | ${r2 ?? (has ? '>30' : '-')} | ${cov} |`);
  }
  console.log(`evidence spans that cross a chunk boundary: ${split} of ${spans}`);
}

main();
