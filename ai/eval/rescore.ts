/**
 * Step 6.2: re-score stored k=10 chunk lists on two golden versions, side by side (no API call, no box).
 * Run: npx tsx ai/eval/rescore.ts [--old <git-rev>] [--out <file.md>]
 *
 * The lists are those of 11 Nov (`2026-11-11-chunk-lists-k10-golden-v1-4.json`): for the served variant ("local") the
 * live guest run received exactly these lists. The old golden is read from git (default: the last commit on v1.4),
 * the new one from the working tree. Per version and variant, over answerable questions: recall@5 and @10, MRR@10 and
 * evidence span coverage in the top 10. Headline (phase 6 decisions): computed on required spans only, so adding a
 * supporting span to an item cannot raise them. Second: the same on any span (the v1.4 definition).
 */
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { loadCorpus } from '../corpus/load';
import { corpusHash } from '../embed/index-file';
import type { GoldenQuestion } from './golden';
import { score } from './span-score';

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
    'Answerable questions only. **Headline columns** (used for phase 6 decisions): recall and MRR on required spans only',
    '(unmarked = required), so a supporting span added to an item cannot raise them, and **facts covered**: the facts of',
    'the reference with at least one of their spans in the top 10 (a question not yet marked counts each required span',
    'as one fact; facts no span states are counted apart). Other columns: required spans covered (the v1.5 measure)',
    'and the any-span versions (the v1.4 definition), kept for comparison with earlier results.',
    '',
    '| variant | golden | **recall@5, required** | **recall@10, required** | **MRR@10, required** | **facts covered** | spans covered, required | recall@10, any | MRR@10, any | spans covered, all |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  const changed: string[] = [];
  for (const [name, v] of Object.entries(stored.variants)) {
    const a = score(oldGolden, v.lists, byId);
    const b = score(newGolden, v.lists, byId);
    for (const [ver, x] of [[oldVersion, a], [newVersion, b]] as const)
      out.push(`| ${name} | v${ver} | ${x.r5} | ${x.r10} | ${x.mrr} | ${x.facts} | ${x.req} | ${x.r10Any} | ${x.mrrAny} | ${x.all} |`);
    for (const [id, x] of b.perQ) {
      const y = a.perQ.get(id);
      if (!y || y.rank !== x.rank || y.all !== x.all || y.req !== x.req || y.facts !== x.facts)
        changed.push(
          `| ${name} | ${id} | ${y?.rank ?? '-'} ${y?.span ?? ''} | ${x.rank ?? '-'} ${x.span} | ${y?.facts ?? '-'} | ${x.facts} | ${y?.req ?? '-'} | ${x.req} | ${y?.all ?? '-'} | ${x.all} |`,
        );
    }
  }
  out.push('', 'Retrievers:', '');
  for (const [name, v] of Object.entries(stored.variants)) out.push(`- ${name}: \`${v.retrieval}\``);
  out.push(
    '',
    '## Questions whose numbers changed',
    '',
    'Facts "x/y+z": x of y facts covered, z facts with no span. A first required hit shows its rank and the required',
    'span it overlaps, so a change in MRR can be traced to the span that became supporting or was added.',
    '',
    `| variant | id | first required hit v${oldVersion} | first required hit v${newVersion} | facts v${oldVersion} | facts v${newVersion} | required spans v${oldVersion} | required spans v${newVersion} | all spans v${oldVersion} | all spans v${newVersion} |`,
    '|---|---|---|---|---|---|---|---|---|---|',
    ...changed,
    '',
  );
  const text = out.join('\n');
  if (OUT) writeFileSync(OUT, text);
  console.log(text);
}

main();
