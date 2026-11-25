/**
 * Step 6.2: re-score stored k=10 chunk lists on two golden versions, side by side (no API call, no box).
 * Run: npx tsx ai/eval/rescore.ts [--old <git-rev>] [--out <file.md>]
 *
 * The lists are those of 11 Nov (`2026-11-11-chunk-lists-k10-golden-v1-4.json`): for the served variant ("local") the
 * live guest run received exactly these lists. The old golden is read from git (default: the last commit on v1.4),
 * the new one from the working tree. Per version and variant: recall@5 and @10, MRR@10, and evidence span coverage in
 * the top 10 over answerable questions, for all spans and (new) for required spans only.
 */
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { loadCorpus } from '../corpus/load';
import { corpusHash } from '../embed/index-file';
import type { Chunk } from '../corpus/types';
import { overlaps, requiredOnly, type Evidence, type GoldenQuestion } from './golden';
import { firstHitRank, fmtRatio, mrrAt, recallAt } from './metrics';

const R = 'ai/eval/results/';
const LISTS = `${R}2026-11-11-chunk-lists-k10-golden-v1-4.json`;
const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const OLD_REV = arg('--old') ?? '666b16a';
const OUT = arg('--out');

const parse = (text: string) =>
  text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenQuestion);

interface Score {
  r5: string;
  r10: string;
  mrr: string;
  all: string;
  req: string;
  perQ: Map<string, { rank: number | null; all: string; req: string }>;
}

function coverage(given: Chunk[], spans: Evidence[]): [number, number] {
  return [spans.filter((e) => given.some((c) => overlaps(c, e))).length, spans.length];
}

function score(golden: GoldenQuestion[], lists: Record<string, string[]>, byId: Map<string, Chunk>): Score {
  const ranks: Array<number | null> = [];
  let [aHit, aN, rHit, rN] = [0, 0, 0, 0];
  const perQ = new Map<string, { rank: number | null; all: string; req: string }>();
  for (const q of golden) {
    if (q.answerable !== 'yes') continue;
    const given = lists[q.id].map((id) => byId.get(id)!);
    const rank = firstHitRank(given, q.evidence);
    ranks.push(rank);
    const [ah, an] = coverage(given, q.evidence);
    const [rh, rn] = coverage(given, requiredOnly(q.evidence));
    aHit += ah;
    aN += an;
    rHit += rh;
    rN += rn;
    perQ.set(q.id, { rank, all: `${ah}/${an}`, req: `${rh}/${rn}` });
  }
  return {
    r5: fmtRatio(recallAt(ranks, 5)),
    r10: fmtRatio(recallAt(ranks, 10)),
    mrr: mrrAt(ranks, 10).toFixed(3),
    all: fmtRatio({ hits: aHit, n: aN }),
    req: fmtRatio({ hits: rHit, n: rN }),
    perQ,
  };
}

function main() {
  const chunks = loadCorpus();
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const hash = corpusHash(chunks);
  const stored = JSON.parse(readFileSync(LISTS, 'utf8')) as {
    goldenVersion: string;
    variants: Record<string, { retrieval: string; lists: Record<string, string[]> }>;
  };
  const meta = (t: string) => (JSON.parse(t) as { version: string }).version;
  const oldGolden = parse(execFileSync('git', ['show', `${OLD_REV}:ai/eval/golden.jsonl`], { encoding: 'utf8' }));
  const oldVersion = meta(execFileSync('git', ['show', `${OLD_REV}:ai/eval/golden-meta.json`], { encoding: 'utf8' }));
  const newGolden = parse(readFileSync('ai/eval/golden.jsonl', 'utf8'));
  const newVersion = meta(readFileSync('ai/eval/golden-meta.json', 'utf8'));

  const out: string[] = [
    `# Stored k=10 lists re-scored on golden v${oldVersion} and v${newVersion}`,
    '',
    `Produced by \`npx tsx ai/eval/rescore.ts\`: no API call, no box. Lists: \`${LISTS.replace(R, '')}\` (made on golden`,
    `v${stored.goldenVersion}). Old golden from git \`${OLD_REV}\`, new from the working tree. Corpus \`${hash}\`, ${chunks.length} chunks.`,
    'Answerable questions only. Recall and MRR count any evidence span (required or supporting) as a hit; span coverage',
    'is the share of evidence spans that the 10 chunks cover, for all spans and for required spans (unmarked = required).',
    '',
    '| variant | golden | recall@5 | recall@10 | MRR@10 | spans covered, all | spans covered, required |',
    '|---|---|---|---|---|---|---|',
  ];
  const changed: string[] = [];
  for (const [name, v] of Object.entries(stored.variants)) {
    const a = score(oldGolden, v.lists, byId);
    const b = score(newGolden, v.lists, byId);
    out.push(`| ${name} | v${oldVersion} | ${a.r5} | ${a.r10} | ${a.mrr} | ${a.all} | ${a.req} |`);
    out.push(`| ${name} | v${newVersion} | ${b.r5} | ${b.r10} | ${b.mrr} | ${b.all} | ${b.req} |`);
    for (const [id, x] of b.perQ) {
      const y = a.perQ.get(id);
      if (!y || y.rank !== x.rank || y.all !== x.all || y.req !== x.req)
        changed.push(
          `| ${name} | ${id} | ${y?.rank ?? '-'} | ${x.rank ?? '-'} | ${y?.all ?? '-'} | ${x.all} | ${y?.req ?? '-'} | ${x.req} |`,
        );
    }
  }
  out.push('', 'Retrievers:', '');
  for (const [name, v] of Object.entries(stored.variants)) out.push(`- ${name}: \`${v.retrieval}\``);
  out.push(
    '',
    '## Questions whose numbers changed',
    '',
    `| variant | id | first hit v${oldVersion} | first hit v${newVersion} | all spans v${oldVersion} | all spans v${newVersion} | required v${oldVersion} | required v${newVersion} |`,
    '|---|---|---|---|---|---|---|---|',
    ...changed,
    '',
  );
  const text = out.join('\n');
  if (OUT) writeFileSync(OUT, text);
  console.log(text);
}

main();
