/**
 * npm run ai:agent:local-score
 * Step 3.5 report: the agent on qwen3.8:27b through Ollama (QA-cl: fully local search_journal; QA-c: search_journal as
 * for Sonnet), two runs each, next to Sonnet runs A1 and A2 of step 2.4 (prompt A, effort medium). The same measures
 * as 2.4 (ai/eval/agent-score.ts summarize, required sources after the owner's review), plus what only the local runs
 * have: tool calls the validator rejected, final answers that did not parse, tasks stopped on the context limit, and
 * compaction (results compacted, restored on a repeated call, restores refused, plain repeats), per task. Spread rule
 * of 2.4: a variant differs from another when the difference of the two-run means is larger than both spreads.
 * Sonnet costs at the corrected price; local model cost is 0 (only Sonnet query translation inside QA-c's tool).
 * Writes ai/eval/results/2026-11-16-agent-local-report.{json,md}.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { JudgedItem } from '../judge/items';
import type { OllamaConversationStats } from '../agent/model-ollama';
import { summarize, type Row, type Summary } from './agent-score';
import { EVAL_PREFIX, JUDGED_FILE, LOCAL_EVAL_PREFIX, LOCAL_JUDGED_FILE, loadTasks, RESULTS } from './agent-run';

const OUT = `${RESULTS}/2026-11-16-agent-local-report`;
type LocalRow = Row & { local?: OllamaConversationStats; measures: Row['measures'] & { invalidToolCalls?: number } };

const r4 = (x: number) => Number(x.toFixed(4));

/** Two runs against two runs: differs when the mean gap exceeds both run-to-run spreads (2.4 rule). */
export function pairRule(a: [number, number], b: [number, number]) {
  const spreadA = Math.abs(a[0] - a[1]);
  const spreadB = Math.abs(b[0] - b[1]);
  const diff = (b[0] + b[1]) / 2 - (a[0] + a[1]) / 2;
  return { spreadA: r4(spreadA), spreadB: r4(spreadB), diff: r4(diff), exceeds: Math.abs(diff) > Math.max(spreadA, spreadB) };
}

function main() {
  const tasks = loadTasks();
  const sonnet = (JSON.parse(readFileSync(JUDGED_FILE, 'utf8')) as { items: JudgedItem[] }).items;
  const localJ = existsSync(LOCAL_JUDGED_FILE) ? (JSON.parse(readFileSync(LOCAL_JUDGED_FILE, 'utf8')) as { items: JudgedItem[]; costUsd: number }) : { items: [], costUsd: 0 };
  const cols: Array<{ run: string; label: string; rows: LocalRow[]; items: JudgedItem[]; local: boolean }> = [];
  for (const run of ['A1', 'A2']) cols.push({ run, label: `Sonnet ${run} (2.4)`, rows: (JSON.parse(readFileSync(`${RESULTS}/${EVAL_PREFIX}${run}.json`, 'utf8')) as { tasks: LocalRow[] }).tasks, items: sonnet.filter((x) => x.run === run), local: false });
  for (const run of ['QA-cl1', 'QA-cl2', 'QA-c1', 'QA-c2']) {
    const f = `${RESULTS}/${LOCAL_EVAL_PREFIX}${run}.json`;
    if (!existsSync(f)) continue;
    const rows = (JSON.parse(readFileSync(f, 'utf8')) as { tasks: LocalRow[] }).tasks;
    const items = localJ.items.filter((x) => x.run === run);
    if (items.length !== rows.length || items.some((x) => !x.result?.verdict)) throw new Error(`${run}: not fully judged`);
    cols.push({ run, label: run, rows, items, local: true });
  }
  const sum = (c: (typeof cols)[number], f: (r: LocalRow) => number) => c.rows.reduce((n, r) => n + f(r), 0);
  const summaries: Record<string, Summary> = Object.fromEntries(cols.map((c) => [c.run, summarize(c.rows, c.items, tasks, c.local ? (r) => r.toolCostUsd : undefined)]));
  const localSums = (c: (typeof cols)[number]) => ({
    invalidToolCalls: sum(c, (r) => r.measures.invalidToolCalls ?? r.calls.filter((x) => x.isError && /^(unknown tool|invalid arguments)/.test((x as { error?: string }).error ?? '')).length),
    schemaFailures: sum(c, (r) => r.local?.schemaFailures ?? 0),
    contextLimit: sum(c, (r) => (r.local?.contextLimit ? 1 : 0)),
    compacted: sum(c, (r) => r.local?.compacted ?? 0),
    tasksWithCompaction: sum(c, (r) => ((r.local?.compacted ?? 0) > 0 ? 1 : 0)),
    restored: sum(c, (r) => r.local?.restored ?? 0),
    restoreRefused: sum(c, (r) => r.local?.restoreRefused ?? 0),
    plainRepeats: sum(c, (r) => r.local?.plainRepeats ?? 0),
    textInsteadOfTools: sum(c, (r) => r.local?.textInsteadOfTools ?? 0),
    maxPromptServer: Math.max(0, ...c.rows.map((r) => r.local?.maxPromptServer ?? 0)),
  });
  const extra = Object.fromEntries(cols.map((c) => [c.run, c.local ? localSums(c) : null]));

  const out = ['# Local agent, step 3.5: report', ''];
  out.push(`Sonnet A1 and A2 from step 2.4 (prompt A, effort medium; cost at the corrected price). QA-cl and QA-c: qwen3.8:27b through Ollama, prompt A, thinking off, compaction on demand with restore on a repeated call; QA-cl searches with fully local retrieval, QA-c with the Sonnet setup (contexts plus Sonnet query translation). Local judge spend $${localJ.costUsd}.`, '');
  const order = cols.map((c) => c.run);
  const row = (label: string, f: (s: Summary, run: string) => string | number) => `| ${label} | ${order.map((r) => f(summaries[r], r)).join(' | ')} |`;
  const lx = (f: (x: ReturnType<typeof localSums>) => number | string) => (_s: Summary, run: string) => (extra[run] ? f(extra[run]!) : 'n/a');
  out.push(`| measure | ${cols.map((c) => c.label).join(' | ')} |`, `|---|${cols.map(() => '---').join('|')}|`);
  out.push(
    row('correct / partially / incorrect', (s) => `${s.correctness.correct} / ${s.correctness.partially_correct} / ${s.correctness.incorrect}`),
    row('supported / partly / unsupported', (s) => `${s.faithfulness.supported} / ${s.faithfulness.partly_supported} / ${s.faithfulness.unsupported}`),
    row('premise handled (p-01..p-03)', (s) => `${s.premiseHandled}/${s.premiseN}`),
    row('required sources ok (after the 2.4 review)', (s) => `${s.requiredOkAfter}/${s.n}`),
    row('answered / repeated / step limit / spend guard / no answer', (s) => `${s.status.answered} / ${s.status.repeated} / ${s.status['step-limit']} / ${s.status['spend-cap']} / ${s.n - s.status.answered - s.status.repeated - s.status['step-limit'] - s.status['spend-cap']}`),
    row('redundant calls (repeat / reread / no new chunks)', (s) => `${s.redundant} (${s.redundantByKind.repeat} / ${s.redundantByKind.reread} / ${s.redundantByKind['no-new-chunks']})`),
    row('rereads later used in a dataRef', (s) => s.rereadsUsedInDataRef),
    row('unneeded jobs', (s) => s.unneededJobs),
    row('legend citations', (s) => s.legendCitations),
    row('citations verified', (s) => `${s.citationsOk}/${s.citations}`),
    row('dataRefs verified', (s) => `${s.dataRefsOk}/${s.dataRefs}`),
    row('turns, sum / tool calls', (s) => `${s.steps} / ${s.toolCalls}`),
    row('invalid tool calls (rejected by the validator)', lx((x) => x.invalidToolCalls)),
    row('final answers that did not parse', lx((x) => x.schemaFailures)),
    row('tasks stopped on the context limit', lx((x) => x.contextLimit)),
    row('tool turns answered in text', lx((x) => x.textInsteadOfTools)),
    row('results compacted / tasks with compaction', lx((x) => `${x.compacted} / ${x.tasksWithCompaction}`)),
    row('repeats after compaction: restored / refused; plain repeats', lx((x) => `${x.restored} / ${x.restoreRefused}; ${x.plainRepeats}`)),
    row('largest server prompt (tokens)', lx((x) => x.maxPromptServer)),
    row('cost $ (cloud only)', (s) => s.costUsd),
    row('time s total / median without jobs', (s) => `${s.totalS} / ${s.noJobMedianS}`),
  );

  const metrics: Array<[string, (s: Summary) => number]> = [
    ['correct', (s) => s.correctness.correct],
    ['incorrect', (s) => s.correctness.incorrect],
    ['required ok', (s) => s.requiredOkAfter],
    ['answered', (s) => s.status.answered],
    ['redundant calls', (s) => s.redundant],
    ['turns', (s) => s.steps],
    ['median s without jobs', (s) => s.noJobMedianS],
  ];
  const pairs: Array<[string, string[], string[]]> = [
    ['QA-cl against Sonnet A', ['A1', 'A2'], ['QA-cl1', 'QA-cl2']],
    ['QA-c against Sonnet A', ['A1', 'A2'], ['QA-c1', 'QA-c2']],
    ['QA-c against QA-cl (retrieval only)', ['QA-cl1', 'QA-cl2'], ['QA-c1', 'QA-c2']],
  ];
  const comparisons: Record<string, unknown> = {};
  out.push('', '## Spread and what exceeds it', '', 'A variant differs when the difference of its two-run mean from the other\'s is larger than both run-to-run spreads.', '');
  for (const [name, a, b] of pairs) {
    if (![...a, ...b].every((r) => summaries[r])) continue;
    out.push(`### ${name}`, '');
    const res = metrics.map(([m, f]) => ({ m, ...pairRule([f(summaries[a[0]]), f(summaries[a[1]])], [f(summaries[b[0]]), f(summaries[b[1]])]) }));
    comparisons[name] = res;
    for (const x of res) out.push(`- ${x.m}: ${b.join(', ')} minus ${a.join(', ')} = ${x.diff} (spreads ${x.spreadA} and ${x.spreadB}): ${x.exceeds ? 'EXCEEDS' : 'within'}.`);
    out.push('');
  }

  out.push('## Compaction per task', '', `| task | ${cols.filter((c) => c.local).map((c) => c.run).join(' | ')} |`, `|---|${cols.filter((c) => c.local).map(() => '---').join('|')}|`);
  for (const t of tasks)
    out.push(`| ${t.id} | ${cols.filter((c) => c.local).map((c) => { const l = c.rows.find((r) => r.id === t.id)?.local; return l ? `${l.compacted} compacted, ${l.restored} restored, ${l.restoreRefused} refused${l.contextLimit ? ', CONTEXT LIMIT' : ''}` : 'n/a'; }).join(' | ')} |`);

  writeFileSync(`${OUT}.json`, JSON.stringify({ date: new Date().toISOString().slice(0, 10), localJudgeCostUsd: localJ.costUsd, summaries, local: extra, comparisons }, null, 2) + '\n');
  writeFileSync(`${OUT}.md`, out.join('\n') + '\n');
  console.log(`Wrote ${OUT}.{json,md}`);
}

if (require.main === module) main();
