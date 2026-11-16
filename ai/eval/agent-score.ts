/**
 * npm run ai:agent:score
 * The step 2.4 report, after the owner's blind grading and his review of the pooled missing-source list (16 Nov 2026):
 *   1. owner grades vs the judge on the six blind items: exact and within one step, correctness and faithfulness
 *      separately, every disagreement with both verdicts, the judge's reason and the owner's note;
 *   2. results for the whole set per run (A1, A2, B1, B2, C): judge verdicts, required sources before and after the
 *      review, end statuses, redundant calls by kind, rereads later used in a dataRef, unneeded jobs, legend citations,
 *      steps, cost and latency;
 *   3. the spread between the two runs of A and of B, and which differences between variants exceed it;
 *   4. per-category numbers, shown and not compared.
 * Reads the five run files, the judge file, the blind file, its key and record. Writes
 * ai/eval/results/2026-11-16-agent-eval-report.{json,md}. No model call.
 */
import { readFileSync, writeFileSync } from 'fs';
import { agreement, parseGrades, type BlindKeyEntry } from '../judge/blind';
import type { JudgedItem } from '../judge/items';
import { changes } from '../judge/measures';
import { CORRECTNESS, FAITHFULNESS } from '../judge/types';
import type { AgentVerification } from '../agent/verify';
import { requiredSources, type AgentTask, type CallRecord } from './agent-measures';
import { BLIND, BLIND_KEY } from './agent-judge';
import { EVAL_PREFIX, JUDGED_FILE, loadTasks, RESULTS, RUNS } from './agent-run';

const RECORD = 'ai/eval/review/blind-2.4-record.json';
const REPORT = `${RESULTS}/2026-11-16-agent-eval-report`;

/**
 * Chunks the owner accepted on 16 Nov 2026 after reading the pooled list (ai/eval/review/required-missing-2.4.md),
 * added to the task's first chunk group for all variants at once.
 */
export const ACCEPTED_AFTER_REVIEW: Record<string, string[]> = {
  'x-01': ['docs/ALGORITHM.md:43'],
  'x-02': ['journal/CONTEXT.md:2178#p3'],
};

export function withAccepted(task: AgentTask): AgentTask {
  const add = ACCEPTED_AFTER_REVIEW[task.id];
  if (!add) return task;
  const groups = task.sources.chunkGroups ?? [];
  if (!groups.length) throw new Error(`${task.id} has no chunk group to extend`);
  return { ...task, sources: { ...task.sources, chunkGroups: [[...groups[0], ...add], ...groups.slice(1)] } };
}

interface Row {
  id: string;
  category: AgentTask['category'];
  status: string;
  verification: AgentVerification | null;
  measures: {
    citationsOk: number;
    citations: number;
    legendCitations: number;
    legendCitationsOk: number;
    dataRefsOk: number;
    dataRefs: number;
    unbackedNumbers: number;
    requiredOk: boolean;
    requiredMissing: string[];
    unneededJob: boolean;
    redundant: number;
    redundantByKind: Record<string, number>;
    rereadsUsedInDataRef: number;
    steps: number;
    toolCalls: number;
    reasoningTokens: number;
  };
  calls: Array<{ name: string; args: unknown; isError: boolean }>;
  costUsd: number;
  modelCostUsd: number;
  toolCostUsd: number;
  ms: number;
}

const STATUSES = ['answered', 'repeated', 'step-limit', 'spend-cap', 'error'];
const KINDS = ['repeat', 'reread', 'no-new-chunks', 'second-read'];
const r4 = (x: number) => Number(x.toFixed(4));
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/** The numeric measures of a set of rows (a run, or a run within one category). */
export function summarize(rows: Row[], items: JudgedItem[], tasks: AgentTask[]) {
  const verdict = (id: string) => items.find((x) => x.id === id)?.result?.verdict;
  const count = <T extends string>(keys: readonly T[], get: (r: Row) => T | undefined) =>
    Object.fromEntries([...keys, 'none'].map((k) => [k, rows.filter((r) => (get(r) ?? 'none') === k).length])) as Record<T | 'none', number>;
  const after = rows.map((r) => {
    const t = withAccepted(tasks.find((x) => x.id === r.id)!);
    return { id: r.id, ...requiredSources(t, r.calls as CallRecord[], r.verification) };
  });
  const sum = (f: (r: Row) => number) => rows.reduce((n, r) => n + f(r), 0);
  const premiseRows = rows.filter((r) => tasks.find((t) => t.id === r.id)!.answerable !== 'yes');
  return {
    n: rows.length,
    correctness: count(CORRECTNESS, (r) => verdict(r.id)?.correctness),
    faithfulness: count(FAITHFULNESS, (r) => verdict(r.id)?.faithfulness),
    premiseHandled: premiseRows.filter((r) => verdict(r.id)?.premise === 'handled').length,
    premiseN: premiseRows.length,
    requiredOkBefore: rows.filter((r) => r.measures.requiredOk).length,
    requiredOkAfter: after.filter((x) => x.ok).length,
    requiredMissingAfter: after.filter((x) => !x.ok).map((x) => ({ id: x.id, missing: x.missing })),
    status: count(STATUSES, (r) => r.status),
    redundant: sum((r) => r.measures.redundant),
    redundantByKind: Object.fromEntries(KINDS.map((k) => [k, sum((r) => r.measures.redundantByKind[k] ?? 0)])),
    rereadsUsedInDataRef: sum((r) => r.measures.rereadsUsedInDataRef),
    unneededJobs: rows.filter((r) => r.measures.unneededJob).length,
    legendCitations: sum((r) => r.measures.legendCitations),
    legendCitationsOk: sum((r) => r.measures.legendCitationsOk),
    answersWithLegendCitation: rows.filter((r) => r.measures.legendCitations > 0).length,
    citationsOk: sum((r) => r.measures.citationsOk),
    citations: sum((r) => r.measures.citations),
    dataRefsOk: sum((r) => r.measures.dataRefsOk),
    dataRefs: sum((r) => r.measures.dataRefs),
    unbackedNumbers: sum((r) => r.measures.unbackedNumbers),
    steps: sum((r) => r.measures.steps),
    toolCalls: sum((r) => r.measures.toolCalls),
    reasoningTokens: sum((r) => r.measures.reasoningTokens),
    costUsd: r4(sum((r) => r.costUsd)),
    toolCostUsd: r4(sum((r) => r.toolCostUsd)),
    maxCostUsd: r4(Math.max(0, ...rows.map((r) => r.costUsd))),
    totalS: Math.round(sum((r) => r.ms) / 1000),
    medianS: Number((median(rows.map((r) => r.ms)) / 1000).toFixed(1)),
    noJobMedianS: Number((median(rows.filter((r) => !tasks.find((t) => t.id === r.id)!.jobs).map((r) => r.ms)) / 1000).toFixed(1)),
  };
}
type Summary = ReturnType<typeof summarize>;

/** The scalar measures compared against the run-to-run spread. */
const SCALARS: Array<[string, (s: Summary) => number]> = [
  ['correct', (s) => s.correctness.correct],
  ['partially correct', (s) => s.correctness.partially_correct],
  ['incorrect', (s) => s.correctness.incorrect],
  ['supported', (s) => s.faithfulness.supported],
  ['partly supported', (s) => s.faithfulness.partly_supported],
  ['unsupported', (s) => s.faithfulness.unsupported],
  ['premise handled', (s) => s.premiseHandled],
  ['required ok (after review)', (s) => s.requiredOkAfter],
  ['answered', (s) => s.status.answered],
  ['repeated', (s) => s.status.repeated],
  ['step-limit', (s) => s.status['step-limit']],
  ['spend-cap', (s) => s.status['spend-cap']],
  ['redundant calls', (s) => s.redundant],
  ['rereads used in a dataRef', (s) => s.rereadsUsedInDataRef],
  ['unneeded jobs', (s) => s.unneededJobs],
  ['legend citations', (s) => s.legendCitations],
  ['unbacked numbers', (s) => s.unbackedNumbers],
  ['steps', (s) => s.steps],
  ['tool calls', (s) => s.toolCalls],
  ['cost $', (s) => s.costUsd],
  ['median s (no-job tasks)', (s) => s.noJobMedianS],
];

/**
 * Rule for "exceeds the spread" (written before reading the comparison): A vs B, the difference of the two-run means
 * exceeds the larger of the two run-to-run spreads |A1-A2| and |B1-B2|; C (one run) vs A, C lies outside A1..A2 by more
 * than |A1-A2|. With 18 tasks and two runs per variant this is a weak test; it only says what the spread does not explain.
 */
export function compare<S>(s: Record<string, S>, scalars: Array<[string, (x: S) => number]>) {
  return scalars.map(([name, f]) => {
    const [a1, a2, b1, b2, c] = ['A1', 'A2', 'B1', 'B2', 'C'].map((r) => f(s[r]));
    const spreadA = Math.abs(a1 - a2);
    const spreadB = Math.abs(b1 - b2);
    const meanA = (a1 + a2) / 2;
    const meanB = (b1 + b2) / 2;
    const bVsA = meanB - meanA;
    const cOut = c > Math.max(a1, a2) ? c - Math.max(a1, a2) : c < Math.min(a1, a2) ? c - Math.min(a1, a2) : 0;
    return {
      name,
      a1, a2, b1, b2, c,
      spreadA: r4(spreadA),
      spreadB: r4(spreadB),
      bVsA: r4(bVsA),
      bExceeds: Math.abs(bVsA) > Math.max(spreadA, spreadB),
      cOutsideA: r4(cOut),
      cExceeds: Math.abs(cOut) > spreadA,
    };
  });
}

function main() {
  const tasks = loadTasks();
  const judged = JSON.parse(readFileSync(JUDGED_FILE, 'utf8')) as { judge: string; costUsd: number; items: JudgedItem[] };
  if (judged.items.some((x) => !x.result?.verdict)) throw new Error('some answers have no verdict');
  const key = (JSON.parse(readFileSync(BLIND_KEY, 'utf8')) as { key: BlindKeyEntry[] }).key;
  const record = JSON.parse(readFileSync(RECORD, 'utf8')) as { procedure: string[]; gloss: Record<string, string> };
  const grades = parseGrades(readFileSync(BLIND, 'utf8'));
  const agree = agreement(key, grades, judged.items);
  if (agree.ungraded.length) throw new Error(`not graded: ${agree.ungraded.join(', ')}`);

  const runs = Object.keys(RUNS);
  const rowsOf: Record<string, Row[]> = Object.fromEntries(runs.map((r) => [r, (JSON.parse(readFileSync(`${RESULTS}/${EVAL_PREFIX}${r}.json`, 'utf8')) as { tasks: Row[] }).tasks]));
  const itemsOf = (run: string) => judged.items.filter((x) => x.run === run);
  // Sanity: recomputing the stored "before" measure from the stored calls and verification gives the same answer.
  for (const run of runs)
    for (const r of rowsOf[run])
      if (requiredSources(tasks.find((t) => t.id === r.id)!, r.calls as CallRecord[], r.verification).ok !== r.measures.requiredOk) throw new Error(`required-source recompute differs for ${run} ${r.id}`);

  const order = ['A1', 'A2', 'B1', 'B2', 'C'];
  const summaries = Object.fromEntries(order.map((r) => [r, summarize(rowsOf[r], itemsOf(r), tasks)]));
  const cmp = compare(summaries, SCALARS);
  const spreadA = changes(itemsOf('A1'), itemsOf('A2'));
  const spreadB = changes(itemsOf('B1'), itemsOf('B2'));
  const categories = [...new Set(tasks.map((t) => t.category))];
  const perCategory = Object.fromEntries(categories.map((c) => [c, Object.fromEntries(order.map((r) => [r, summarize(rowsOf[r].filter((x) => x.category === c), itemsOf(r), tasks)]))]));
  const runCost = r4(order.reduce((n, r) => n + summaries[r].costUsd, 0));

  writeFileSync(`${REPORT}.json`, JSON.stringify({ date: '2026-11-16', judge: judged.judge, judgeCostUsd: judged.costUsd, runCostUsd: runCost, acceptedAfterReview: ACCEPTED_AFTER_REVIEW, agreement: agree, grading: record, summaries, comparison: cmp, spread: { A: spreadA, B: spreadB }, perCategory }, null, 2) + '\n');

  const out: string[] = ['# Agent evaluation, step 2.4: report', ''];
  out.push(`Runs of 12 Nov 2026, 18 tasks each; judge \`${judged.judge}\` ($${judged.costUsd}); runs $${runCost}; step total $${r4(runCost + judged.costUsd)} of $25. A = prompt A, effort medium (two runs); B = prompt B, effort medium (two runs); C = prompt A, effort high (one run).`, '');
  const pct = (a: number, n: number) => `${a}/${n}`;
  out.push('## 1. Owner blind grading vs the judge', '');
  out.push(`Six items, one per category, rule fixed before the runs. Correctness: exact ${pct(agree.correctness.exact, agree.correctness.n)}, within one step ${pct(agree.correctness.withinOne, agree.correctness.n)}. Faithfulness: exact ${pct(agree.faithfulness.exact, agree.faithfulness.n)}, within one step ${pct(agree.faithfulness.withinOne, agree.faithfulness.n)}.`, '');
  out.push('| item | run | task | owner correctness | judge correctness | owner faithfulness | judge faithfulness |', '|---|---|---|---|---|---|---|');
  for (const r of agree.rows) out.push(`| ${r.label} | ${r.run} | ${r.id} | ${r.owner.correctness} | ${r.judge.correctness} | ${r.owner.faithfulness} | ${r.judge.faithfulness} |`);
  out.push('', '### Disagreements', '');
  const note = (label: string, n?: string) => (n ? `Owner's note: "${n}" (gloss: ${record.gloss[label] ?? 'none'})` : "No owner's note.");
  let nDis = 0;
  for (const r of agree.rows) {
    if (r.owner.correctness !== r.judge.correctness) {
      nDis++;
      out.push(`- ${r.label} (${r.id}, ${r.run}) correctness: owner ${r.owner.correctness}, judge ${r.judge.correctness}. Judge: ${r.judge.correctnessReason} ${note(r.label, r.owner.note)}`);
    }
    if (r.owner.faithfulness !== r.judge.faithfulness) {
      nDis++;
      out.push(`- ${r.label} (${r.id}, ${r.run}) faithfulness: owner ${r.owner.faithfulness}, judge ${r.judge.faithfulness}. Judge: ${r.judge.faithfulnessReason} ${note(r.label, r.owner.note)}`);
    }
  }
  if (!nDis) out.push('None.');
  out.push('', '### How the grading was done', '', ...record.procedure.map((p) => `- ${p}`));

  out.push('', '## 2. Whole set, per run (18 tasks each)', '');
  const row = (label: string, f: (s: Summary) => string | number) => `| ${label} | ${order.map((r) => f(summaries[r])).join(' | ')} |`;
  out.push(`| measure | ${order.join(' | ')} |`, `|---|${order.map(() => '---').join('|')}|`);
  out.push(
    row('correct / partially / incorrect', (s) => `${s.correctness.correct} / ${s.correctness.partially_correct} / ${s.correctness.incorrect}`),
    row('supported / partly / unsupported', (s) => `${s.faithfulness.supported} / ${s.faithfulness.partly_supported} / ${s.faithfulness.unsupported}`),
    row('premise handled (p-01..p-03)', (s) => `${s.premiseHandled}/${s.premiseN}`),
    row('required sources ok, before review', (s) => `${s.requiredOkBefore}/${s.n}`),
    row('required sources ok, after review', (s) => `${s.requiredOkAfter}/${s.n}`),
    row('answered / repeated / step-limit / spend-cap', (s) => `${s.status.answered} / ${s.status.repeated} / ${s.status['step-limit']} / ${s.status['spend-cap']}`),
    row('redundant calls', (s) => s.redundant),
    ...KINDS.map((k) => row(`  of which ${k}`, (s) => s.redundantByKind[k])),
    row('rereads later used in a dataRef', (s) => s.rereadsUsedInDataRef),
    row('unneeded jobs', (s) => s.unneededJobs),
    row('legend citations (verified) / answers with one', (s) => `${s.legendCitations} (${s.legendCitationsOk}) / ${s.answersWithLegendCitation}`),
    row('citations verified', (s) => `${s.citationsOk}/${s.citations}`),
    row('dataRefs verified', (s) => `${s.dataRefsOk}/${s.dataRefs}`),
    row('unbacked numbers', (s) => s.unbackedNumbers),
    row('steps (sum) / tool calls', (s) => `${s.steps} / ${s.toolCalls}`),
    row('reasoning tokens', (s) => s.reasoningTokens),
    row('cost $ (of which in tools) / max per task', (s) => `${s.costUsd} (${s.toolCostUsd}) / ${s.maxCostUsd}`),
    row('time s total / median / median without jobs', (s) => `${s.totalS} / ${s.medianS} / ${s.noJobMedianS}`),
  );
  out.push('', 'Required sources still missing after the review:', '');
  for (const r of order) for (const m of summaries[r].requiredMissingAfter) out.push(`- ${r} ${m.id}: ${m.missing.join('; ')}`);

  out.push('', '## 3. Spread and what exceeds it', '');
  out.push('Rule, fixed in `ai/eval/agent-score.ts`: B vs A exceeds when the difference of the two-run means is larger than both run-to-run spreads |A1-A2| and |B1-B2|; C exceeds when it lies outside A1..A2 by more than |A1-A2|.', '');
  out.push('| measure | A1 | A2 | B1 | B2 | C | spread A | spread B | B - A (means) | exceeds | C outside A by | exceeds |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const x of cmp) out.push(`| ${x.name} | ${x.a1} | ${x.a2} | ${x.b1} | ${x.b2} | ${x.c} | ${x.spreadA} | ${x.spreadB} | ${x.bVsA} | ${x.bExceeds ? 'yes' : ''} | ${x.cOutsideA} | ${x.cExceeds ? 'yes' : ''} |`);
  const listChanges = (title: string, c: ReturnType<typeof changes>) => {
    out.push('', `${title}: correctness changed on ${c.correctness.length} of ${c.n} tasks, faithfulness on ${c.faithfulness.length}.`, '');
    for (const x of c.correctness) out.push(`- ${x.id}: correctness ${x.a.correctness} -> ${x.b.correctness}`);
    for (const x of c.faithfulness) out.push(`- ${x.id}: faithfulness ${x.a.faithfulness} -> ${x.b.faithfulness}`);
  };
  listChanges('A1 vs A2', spreadA);
  listChanges('B1 vs B2', spreadB);

  out.push('', '## 4. Per category (shown, not compared)', '');
  out.push(`| category | run | correct/part/incorr | supp/partly/unsupp | required after | statuses a/r/s/$ | redundant | rereads in dataRef | unneeded jobs | legend | steps | cost $ |`, '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const c of categories)
    for (const r of order) {
      const s = perCategory[c][r];
      out.push(`| ${c} | ${r} | ${s.correctness.correct}/${s.correctness.partially_correct}/${s.correctness.incorrect} | ${s.faithfulness.supported}/${s.faithfulness.partly_supported}/${s.faithfulness.unsupported} | ${s.requiredOkAfter}/${s.n} | ${s.status.answered}/${s.status.repeated}/${s.status['step-limit']}/${s.status['spend-cap']} | ${s.redundant} | ${s.rereadsUsedInDataRef} | ${s.unneededJobs} | ${s.legendCitations} | ${s.steps} | ${s.costUsd} |`);
    }

  out.push('', '## 5. Per answer (judge)', '');
  for (const it of [...judged.items].sort((a, b) => a.id.localeCompare(b.id) || order.indexOf(a.run) - order.indexOf(b.run))) {
    const v = it.result!.verdict!;
    out.push(`- **${it.id} ${it.run}**: ${v.correctness} (${v.correctnessReason}) / ${v.faithfulness} (${v.faithfulnessReason})${it.answerable !== 'yes' ? ` / premise ${v.premise} (${v.premiseReason})` : ''}`);
  }
  writeFileSync(`${REPORT}.md`, out.join('\n') + '\n');
  console.log(`Wrote ${REPORT}.{json,md}`);
}

if (require.main === module) main();
