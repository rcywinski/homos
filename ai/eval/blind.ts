/**
 * npm run ai:blind -- make    writes ai/eval/review/blind-1.9.md (for the owner) and its key (which answer is which)
 * npm run ai:blind -- score   reads the owner's grades, compares them with the judge and writes the step 1.9 report
 *                             ai/eval/results/2026-11-10-judge-golden-v1-4.{json,md}
 * The sample rule is in ai/judge/blind.ts. `make` refuses to overwrite a file that already has grades in it.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { agreement, blindSample, parseGrades, renderBlind, type BlindKeyEntry } from '../judge/blind';
import type { JudgedItem } from '../judge/items';
import { changes, runSummary } from '../judge/measures';
import { JUDGED, RESULTS, RUNS } from './judge';

const BLIND = 'ai/eval/review/blind-1.9.md';
const KEY = 'ai/eval/review/blind-1.9-key.json';
/** How the grading was done and English glosses of the owner's Polish notes, written after grading. */
const RECORD = 'ai/eval/review/blind-1.9-record.json';

interface GradingRecord {
  procedure: string[];
  revisions: Array<{ label: string; field: string; from: string; to: string }>;
  gloss: Record<string, string>;
}
const REPORT = `${RESULTS}/2026-11-10-judge-golden-v1-4`;

function loadJudged(): { judge: string; items: JudgedItem[] } {
  const j = JSON.parse(readFileSync(JUDGED, 'utf8')) as { judge: string; items: JudgedItem[] };
  const missing = j.items.filter((x) => !x.result?.verdict).length;
  if (missing) throw new Error(`${missing} answers have no verdict yet: finish npm run ai:judge first`);
  return j;
}

function make() {
  const { items } = loadJudged();
  if (existsSync(BLIND) && parseGrades(readFileSync(BLIND, 'utf8')).some((g) => g.correctness || g.faithfulness))
    throw new Error(`${BLIND} already has grades in it; not overwriting`);
  const key = blindSample(items);
  writeFileSync(BLIND, renderBlind(key, items));
  writeFileSync(KEY, JSON.stringify({ rule: 'ai/judge/blind.ts', key }, null, 2) + '\n');
  console.log(`Wrote ${BLIND} (${key.length} items, ${key.filter((k) => k.inAgreementSample).length} in the agreement sample) and ${KEY}`);
}

const pct = (a: number, n: number) => (n ? `${a}/${n} (${Math.round((100 * a) / n)}%)` : '0/0');

function score() {
  const { judge, items } = loadJudged();
  const key = (JSON.parse(readFileSync(KEY, 'utf8')) as { key: BlindKeyEntry[] }).key;
  const grades = parseGrades(readFileSync(BLIND, 'utf8'));
  const agree = agreement(key, grades, items);
  if (agree.ungraded.length) throw new Error(`not graded yet: ${agree.ungraded.join(', ')}`);
  const runOf = (r: string) => items.filter((x) => x.run === r);
  const summaries = Object.fromEntries(RUNS.map(({ run }) => [run, runSummary(runOf(run))]));
  const spread = changes(runOf('k5-run1'), runOf('k5-run2'));
  const k10vsRun1 = changes(runOf('k5-run1'), runOf('k10'));
  const k10vsRun2 = changes(runOf('k5-run2'), runOf('k10'));
  const record: GradingRecord = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, 'utf8')) : { procedure: [], revisions: [], gloss: {} };
  const result = { date: '2026-11-10', goldenVersion: '1.4', judge, summaries, spread, k10vsRun1, k10vsRun2, agreement: agree, grading: record };
  writeFileSync(`${REPORT}.json`, JSON.stringify(result, null, 2) + '\n');

  const out = ['# Answer quality, judged: k = 5 (two runs) and k = 10', '', `Date 2026-11-10. Golden set v1.4. Judge \`${judge}\`, blind to k and run.`, ''];
  out.push('## Verdicts per run', '', '| run | correct | partially correct | incorrect | supported | partly supported | unsupported | premise handled (partial + no) | judge cost |', '|---|---|---|---|---|---|---|---|---|');
  for (const [run, s] of Object.entries(summaries))
    out.push(`| ${run} | ${s.correctness.correct} | ${s.correctness.partially_correct} | ${s.correctness.incorrect} | ${s.faithfulness.supported} | ${s.faithfulness.partly_supported} | ${s.faithfulness.unsupported} | ${s.premise.handled}/${s.premise.n} | $${s.judgeCostUsd} |`);
  out.push('', 'Answerable questions only (26):', '', '| run | correct | partially correct | incorrect |', '|---|---|---|---|');
  for (const [run, s] of Object.entries(summaries)) out.push(`| ${run} | ${s.answerableYes.correct} | ${s.answerableYes.partially_correct} | ${s.answerableYes.incorrect} |`);
  const listChanges = (title: string, c: ReturnType<typeof changes>) => {
    out.push('', `## ${title}`, '', `Correctness changed on ${c.correctness.length} of ${c.n} questions, faithfulness on ${c.faithfulness.length}.`, '');
    for (const x of c.correctness) out.push(`- ${x.id}: correctness ${x.a.correctness} -> ${x.b.correctness}`);
    for (const x of c.faithfulness) out.push(`- ${x.id}: faithfulness ${x.a.faithfulness} -> ${x.b.faithfulness}`);
  };
  listChanges('Run-to-run spread (k5-run1 vs k5-run2, same settings)', spread);
  listChanges('k5-run1 vs k10', k10vsRun1);
  listChanges('k5-run2 vs k10', k10vsRun2);
  out.push('', '## Owner blind grading vs the judge', '');
  out.push(`Agreement sample (${agree.correctness.n} answers, fixed rule in ai/judge/blind.ts): correctness exact ${pct(agree.correctness.exact, agree.correctness.n)}, within one step ${pct(agree.correctness.withinOne, agree.correctness.n)}; faithfulness exact ${pct(agree.faithfulness.exact, agree.faithfulness.n)}, within one step ${pct(agree.faithfulness.withinOne, agree.faithfulness.n)}.`, '');
  out.push('| item | run | question | in sample | owner correctness | judge correctness | owner faithfulness | judge faithfulness |', '|---|---|---|---|---|---|---|---|');
  for (const r of agree.rows) out.push(`| ${r.label} | ${r.run} | ${r.id} | ${r.inAgreementSample ? 'yes' : 'no (dated-05 extra)'} | ${r.owner.correctness} | ${r.judge.correctness} | ${r.owner.faithfulness} | ${r.judge.faithfulness} |`);
  const ownerNote = (r: (typeof agree.rows)[number]) => (r.owner.note ? `owner's note: "${r.owner.note}" (gloss: ${record.gloss[r.label] ?? 'none'})` : "no owner's note");
  const verdictOf = (r: (typeof agree.rows)[number]) => items.find((x) => x.run === r.run && x.id === r.id)!.result!.verdict!;
  out.push('', '### Disagreements in the agreement sample', '');
  for (const r of agree.rows.filter((x) => x.inAgreementSample)) {
    const v = verdictOf(r);
    if (r.owner.correctness !== r.judge.correctness) out.push(`- ${r.label} (${r.id}, ${r.run}) correctness: owner ${r.owner.correctness}, judge ${r.judge.correctness}. Judge: ${v.correctnessReason} ${ownerNote(r)}.`);
    if (r.owner.faithfulness !== r.judge.faithfulness) out.push(`- ${r.label} (${r.id}, ${r.run}) faithfulness: owner ${r.owner.faithfulness}, judge ${r.judge.faithfulness}. Judge: ${v.faithfulnessReason} ${ownerNote(r)}.`);
  }
  out.push('', '### The two dated-05 answers (outside the sample)', '');
  for (const r of agree.rows.filter((x) => !x.inAgreementSample)) {
    const v = verdictOf(r);
    out.push(`- ${r.label} = ${r.run}. Judge: ${v.correctness} (${v.correctnessReason}) / ${v.faithfulness} (${v.faithfulnessReason}). Owner: ${r.owner.correctness} / ${r.owner.faithfulness}; ${ownerNote(r)}.`);
  }
  out.push('', '### How the grading was done', '', ...record.procedure.map((p) => `- ${p}`));
  out.push('', '## Per answer', '');
  for (const it of [...items].sort((a, b) => a.id.localeCompare(b.id) || a.run.localeCompare(b.run))) {
    const v = it.result!.verdict!;
    out.push(`- **${it.id} ${it.run}**: ${v.correctness} (${v.correctnessReason}) / ${v.faithfulness} (${v.faithfulnessReason})${it.answerable !== 'yes' ? ` / premise ${v.premise} (${v.premiseReason})` : ''}`);
  }
  writeFileSync(`${REPORT}.md`, out.join('\n') + '\n');
  console.log(`Wrote ${REPORT}.{json,md}`);
}

const cmd = process.argv[2];
if (cmd === 'make') make();
else if (cmd === 'score') score();
else {
  console.error('usage: npm run ai:blind -- make | score');
  process.exit(1);
}
