/**
 * Step 6.4: report of the judged baseline, two runs of the served local configuration through the public chat
 * server on the 34 development questions. Offline, no API call: reads the two judged sets (npm run ai:judge --
 * --set b64r1 | b64r2) and their answers files.
 *
 *   npx tsx ai/eval/baseline-64.ts
 *
 * Writes ai/eval/results/2026-11-27-baseline-6-4-golden-v1-7.md with:
 * - the verdict counts of both runs, next to the earlier chat-server runs lan48b and lan48c for context (same judge
 *   and prompt; the question and reference text is unchanged since golden v1.0, so verdicts are comparable, while
 *   retrieval coverage numbers on v1.4 are not);
 * - the verdicts per question in both runs, so the run-to-run spread is visible;
 * - a consistency check: the chunk ids each answer was given against the stored 11 Nov lists for local (rerank top
 *   30, k = 10), which the 6.3 diagnostic reproduced. Same ids mean the judged baseline and the 6.3 numbers describe
 *   the same system; a difference is listed per question, not hidden.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { AnswerRecord } from '../answer/measures';
import type { Correctness, Faithfulness } from '../judge/types';
import { listDiff } from './retrieval-diag';
import { loadItems, SETS, type SetName } from './judge';
import type { JudgedItem } from '../judge/items';

const RUNS: SetName[] = ['b64r1', 'b64r2'];
const CONTEXT: { set: SetName; step: string }[] = [
  { set: 'lan48b', step: '4.8j2' },
  { set: 'lan48c', step: '4.8j3' },
];
const STORED = 'ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json';
const OUT = 'ai/eval/results/2026-11-27-baseline-6-4-golden-v1-7.md';

const LETTER: Record<Correctness, string> = { correct: 'C', partially_correct: 'P', incorrect: 'I' };

interface Counts {
  correct: number;
  partly: number;
  incorrect: number;
  supported: number;
  partlySupported: number;
  unsupported: number;
  missing: number;
}

function counts(items: JudgedItem[]): Counts {
  const c: Counts = { correct: 0, partly: 0, incorrect: 0, supported: 0, partlySupported: 0, unsupported: 0, missing: 0 };
  for (const x of items) {
    const v = x.result?.verdict;
    if (!v) {
      c.missing++;
      continue;
    }
    if (v.correctness === 'correct') c.correct++;
    else if (v.correctness === 'partially_correct') c.partly++;
    else c.incorrect++;
    const f: Faithfulness = v.faithfulness;
    if (f === 'supported') c.supported++;
    else if (f === 'partly_supported') c.partlySupported++;
    else c.unsupported++;
  }
  return c;
}

function answers(set: SetName): AnswerRecord[] {
  const file = SETS[set].runs[0].file;
  return (JSON.parse(readFileSync(file, 'utf8')) as { perQuestion: AnswerRecord[] }).perQuestion;
}

function main() {
  const missingFiles = RUNS.flatMap((s) => [SETS[s].runs[0].file, SETS[s].judgments]).filter((f) => !existsSync(f));
  if (missingFiles.length) {
    console.error(`refused, nothing written: missing\n  ${missingFiles.join('\n  ')}`);
    process.exit(1);
  }
  const judged = new Map(RUNS.map((s) => [s, loadItems(s)]));
  const quotes = (set: SetName) => {
    const all = answers(set).flatMap((a) => a.citations);
    return `${all.filter((c) => c.status !== 'ok').length} of ${all.length}`;
  };

  const countRow = (label: string, c: Counts, q: string) =>
    `| ${label} | ${c.correct} | ${c.partly} | ${c.incorrect} | ${c.supported} | ${c.partlySupported} | ${c.unsupported} | ${c.missing} | ${q} |`;
  const rows: string[] = [];
  for (const s of RUNS) rows.push(countRow(`**${s} (6.4)**`, counts(judged.get(s)!), quotes(s)));
  for (const { set, step } of CONTEXT) if (existsSync(SETS[set].judged)) rows.push(countRow(`${set} (${step}, context)`, counts(loadItems(set)), quotes(set)));

  // Per question, both runs.
  const letter = (set: SetName, id: string) => {
    const v = judged.get(set)!.find((x) => x.id === id)?.result?.verdict;
    return v ? LETTER[v.correctness] : '-';
  };
  const ids = judged.get('b64r1')!.map((x) => x.id);
  const perQ = ids.map((id) => `| ${id} | ${letter('b64r1', id)} | ${letter('b64r2', id)} | ${letter('b64r1', id) === letter('b64r2', id) ? '' : 'differs'} |`);
  const differ = ids.filter((id) => letter('b64r1', id) !== letter('b64r2', id)).length;

  // Consistency check against the stored lists.
  const stored = (JSON.parse(readFileSync(STORED, 'utf8')) as { variants: { local: { lists: Record<string, string[]> } } }).variants.local.lists;
  const check: string[] = [];
  for (const s of RUNS)
    for (const a of answers(s)) {
      const d = listDiff(stored[a.id] ?? [], a.chunkIds ?? []);
      if (d) check.push(`| ${s} | ${a.id} | ${d} |`);
    }

  const md = [
    '# Step 6.4: judged baseline on the development set (golden v1.7)',
    '',
    'The served local configuration (Qwen, live retrieval through the public chat server on the box, rerank top 30,',
    'k = 10), two runs on the 34 development questions only; the test set is not used (its first run is step 6.12).',
    'Judged on the Mac with the step 3.2 judge and prompt, `--no-retry`. Produced by `npx tsx ai/eval/baseline-64.ts`.',
    '',
    'Comparability: the question, reference and answerable text is unchanged since golden v1.0 (answersHash',
    '311917237fe235c7), so these verdicts compare with the earlier judged runs (rows marked context, same judge and',
    'prompt, golden v1.4). Retrieval coverage numbers on v1.4 do not compare: evidence roles and facts changed.',
    '',
    '| run | correct | partly | incorrect | supported | partly supported | unsupported | no verdict | quotes not verified (all citations) |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
    `## Verdict per question (C correct, P partly, I incorrect)`,
    '',
    `${differ} of ${ids.length} questions get a different correctness verdict in the two runs.`,
    '',
    '| id | b64r1 | b64r2 | |',
    '|---|---|---|---|',
    ...perQ,
    '',
    '## Chunks given to the model against the stored local lists (rerank top 30, k = 10)',
    '',
    check.length
      ? `${check.length} answers were given a list that differs from the stored one:`
      : 'Every answer of both runs was given exactly the stored list, in the same order: the judged baseline and the 6.3 numbers describe the same system.',
    '',
    ...(check.length ? ['| run | id | difference |', '|---|---|---|', ...check, ''] : []),
  ].join('\n');
  writeFileSync(OUT, md);
  console.log(`wrote ${OUT}`);
}

if (require.main === module) main();
