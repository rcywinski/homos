/**
 * Step 6.11: the judged comparison on the development set, applied as the decision rule committed before the first
 * run (ai/DECISIONS.md, "step 6.11 decision rule", commit 6be01c5). Offline, no API call: reads the six judged sets
 * (npm run ai:judge -- --set s611r1 ... h611r2) and their answers files, and the reranker timing of the window.
 *
 *   npx tsx ai/eval/compare-611.ts
 *
 * Writes ai/eval/results/2026-11-27-compare-6-11-golden-v1-7.md. The rule is applied in code so the verdict cannot be
 * read selectively: sanity of the path, the guard per candidate, the choice, then the watched questions.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { AnswerRecord } from '../answer/measures';
import type { JudgedItem } from '../judge/items';
import { loadItems, SETS, type SetName } from './judge';

const OUT = 'ai/eval/results/2026-11-27-compare-6-11-golden-v1-7.md';
const TIMING = 'ai/eval/results/2026-11-27-rerank-time-6-11.json';

/** Fixed by the rule before the first run. */
export const RULE_611 = {
  servedRange: [15, 19] as [number, number],
  clearlyBelow: 12,
  clearlyAbove: 22,
  maxCorrectDrop: 3,
  maxIncorrectRise: 2,
  maxUnsupportedRise: 2,
  hOverN: 3,
  watched: ['dated-04', 'dated-05', 'dated-06', 'id-07'],
};

export type Config = 'S' | 'N' | 'H';
export const RUNS_611: Record<Config, [SetName, SetName]> = { S: ['s611r1', 's611r2'], N: ['n611r1', 'n611r2'], H: ['h611r1', 'h611r2'] };
const NAMES: Record<Config, string> = { S: 'S served (local, rerank top 30)', N: 'N 6.10 without the reranker, with B2', H: 'H 6.10 rerank top 100' };

export interface Counts {
  correct: number;
  partly: number;
  incorrect: number;
  unsupported: number;
  missing: number;
}

export function counts(items: Pick<JudgedItem, 'result'>[]): Counts {
  const c: Counts = { correct: 0, partly: 0, incorrect: 0, unsupported: 0, missing: 0 };
  for (const x of items) {
    const v = x.result?.verdict;
    if (!v) {
      c.missing++;
      continue;
    }
    if (v.correctness === 'correct') c.correct++;
    else if (v.correctness === 'partially_correct') c.partly++;
    else c.incorrect++;
    if (v.faithfulness === 'unsupported') c.unsupported++;
  }
  return c;
}

export interface Decision {
  sane: boolean;
  guard: Record<'N' | 'H', { pass: boolean; reasons: string[] }>;
  choice: Config;
  why: string;
}

/** The committed rule, on the means of two runs per configuration. */
export function decide(c: Record<Config, [Counts, Counts]>): Decision {
  const mean = (k: Config, f: keyof Counts) => (c[k][0][f] + c[k][1][f]) / 2;
  const [s1, s2] = c.S.map((x) => x.correct);
  const sane = !((s1 <= RULE_611.clearlyBelow && s2 <= RULE_611.clearlyBelow) || (s1 >= RULE_611.clearlyAbove && s2 >= RULE_611.clearlyAbove));
  const guardOf = (k: 'N' | 'H') => {
    const reasons: string[] = [];
    if (mean('S', 'correct') - mean(k, 'correct') > RULE_611.maxCorrectDrop) reasons.push(`correct ${mean(k, 'correct')} against S ${mean('S', 'correct')}`);
    if (mean(k, 'incorrect') - mean('S', 'incorrect') > RULE_611.maxIncorrectRise) reasons.push(`incorrect ${mean(k, 'incorrect')} against S ${mean('S', 'incorrect')}`);
    if (mean(k, 'unsupported') - mean('S', 'unsupported') > RULE_611.maxUnsupportedRise) reasons.push(`unsupported ${mean(k, 'unsupported')} against S ${mean('S', 'unsupported')}`);
    return { pass: reasons.length === 0, reasons };
  };
  const guard = { N: guardOf('N'), H: guardOf('H') };
  if (!sane) return { sane, guard, choice: 'S', why: 'S runs clearly outside the served range: the path differs from the chat server, nothing is decided.' };
  if (guard.N.pass && guard.H.pass) {
    const d = mean('H', 'correct') - mean('N', 'correct');
    return d >= RULE_611.hOverN
      ? { sane, guard, choice: 'H', why: `both pass; H's mean correct exceeds N's by ${d} (3 or more).` }
      : { sane, guard, choice: 'N', why: `both pass; H's mean correct exceeds N's by ${d}, under 3, so the cheaper N (facts level, 59 against 60).` };
  }
  if (guard.N.pass) return { sane, guard, choice: 'N', why: 'only N passes the guard.' };
  if (guard.H.pass) return { sane, guard, choice: 'H', why: 'only H passes the guard.' };
  return { sane, guard, choice: 'S', why: 'neither candidate passes the guard: S stays.' };
}

function main() {
  const all = Object.values(RUNS_611).flat();
  const missing = all.flatMap((s) => [SETS[s].runs[0].file, SETS[s].judged]).filter((f) => !existsSync(f));
  if (missing.length) {
    console.error(`refused, nothing written: missing\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }
  const judged = new Map(all.map((s) => [s, loadItems(s)]));
  const answers = (s: SetName) => (JSON.parse(readFileSync(SETS[s].runs[0].file, 'utf8')) as { perQuestion: AnswerRecord[]; measures: { cost: { msMedian: number } } });
  const c = Object.fromEntries((Object.keys(RUNS_611) as Config[]).map((k) => [k, RUNS_611[k].map((s) => counts(judged.get(s)!))])) as Record<Config, [Counts, Counts]>;
  const d = decide(c);
  const timing = existsSync(TIMING) ? (JSON.parse(readFileSync(TIMING, 'utf8')) as { summary: { median30Ms: number; median100Ms: number; median1Ms: number } }).summary : null;
  const letter = (s: SetName, id: string) => {
    const v = judged.get(s)!.find((x) => x.id === id)?.result?.verdict;
    return v ? { correct: 'C', partially_correct: 'P', incorrect: 'I' }[v.correctness] : '-';
  };
  const runRows = (Object.keys(RUNS_611) as Config[]).flatMap((k) =>
    RUNS_611[k].map((s, i) => `| ${NAMES[k]} | ${s} | ${c[k][i].correct} | ${c[k][i].partly} | ${c[k][i].incorrect} | ${c[k][i].unsupported} | ${c[k][i].missing} | ${(answers(s).measures.cost.msMedian / 1000).toFixed(1)} s |`),
  );
  const mean = (k: Config, f: keyof Counts) => (c[k][0][f] + c[k][1][f]) / 2;
  const meanRows = (Object.keys(RUNS_611) as Config[]).map((k) => `| ${NAMES[k]} | ${mean(k, 'correct')} | ${mean(k, 'partly')} | ${mean(k, 'incorrect')} | ${mean(k, 'unsupported')} |`);
  const ids = judged.get('s611r1')!.map((x) => x.id);
  const perQ = ids.map((id) => `| ${id} | ${all.map((s) => letter(s, id)).join(' | ')} |`);
  const watched = RULE_611.watched.map((id) => `| ${id} | ${all.map((s) => letter(s, id)).join(' | ')} |`);

  const md = [
    '# Step 6.11: judged comparison on the development set (golden v1.7)',
    '',
    'Three configurations, two runs each, Qwen with the served preset (checked field by field in every run file) on',
    'the committed k = 10 lists, run from the Mac against the box in one window (27 Nov, 17:10 to 17:46 UTC, order',
    'S N H S N H, no guest request during the window). Judged with the step 3.2 judge and prompt, `--no-retry`,',
    'concurrency 1. The decision rule was committed before the first run (ai/DECISIONS.md, commit 6be01c5) and is',
    'applied here in code. Produced by `npx tsx ai/eval/compare-611.ts`.',
    '',
    '| configuration | run | correct | partly | incorrect | unsupported | no verdict | median time per answer |',
    '|---|---|---|---|---|---|---|---|',
    ...runRows,
    '',
    '## Means of two runs',
    '',
    '| configuration | correct | partly | incorrect | unsupported |',
    '|---|---|---|---|---|',
    ...meanRows,
    '',
    '## The rule',
    '',
    `Sanity of the path: S runs ${c.S[0].correct} and ${c.S[1].correct} correct against the served range ${RULE_611.servedRange.join(' to ')} (clearly outside: both at ${RULE_611.clearlyBelow} or below, or both at ${RULE_611.clearlyAbove} or above): **${d.sane ? 'passes' : 'fails'}**.`,
    '',
    `Guard against S (correct not lower by more than ${RULE_611.maxCorrectDrop}, incorrect and unsupported not higher by more than ${RULE_611.maxIncorrectRise}; it catches a clear regression only):`,
    '',
    `- N: **${d.guard.N.pass ? 'passes' : 'fails'}**${d.guard.N.reasons.length ? ` (${d.guard.N.reasons.join('; ')})` : ''}`,
    `- H: **${d.guard.H.pass ? 'passes' : 'fails'}**${d.guard.H.reasons.length ? ` (${d.guard.H.reasons.join('; ')})` : ''}`,
    '',
    `Choice: **${NAMES[d.choice]}**: ${d.why}`,
    '',
    timing
      ? `Reranker time per question, measured in the window from the Mac (median): ${timing.median30Ms} ms for the served 30 documents, ${timing.median100Ms} ms for H's 100 documents with contexts, ${timing.median1Ms} ms for 1 document (network floor). N calls no reranker.`
      : 'Reranker timing file missing.',
    '',
    '## Watched questions (C correct, P partly, I incorrect)',
    '',
    `| id | ${all.join(' | ')} |`,
    `|---|${all.map(() => '---').join('|')}|`,
    ...watched,
    '',
    '## Verdict per question',
    '',
    `| id | ${all.join(' | ')} |`,
    `|---|${all.map(() => '---').join('|')}|`,
    ...perQ,
    '',
  ].join('\n');
  writeFileSync(OUT, md);
  console.log(`wrote ${OUT}: choice ${d.choice}; ${d.why}`);
}

if (require.main === module) main();
