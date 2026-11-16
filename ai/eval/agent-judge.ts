/**
 * Judge and blind grading for the step 2.4 agent evaluation.
 *
 *   npm run ai:agent:judge -- blind   writes the owner's blind grading file ai/eval/review/blind-2.4.md and its key
 *   npm run ai:agent:judge -- judge   judges every answer of the five runs with the step 1.9 judge (Opus 5.5, blind)
 *
 * What the judge sees (agentJudgeInput): the question, the task's answerable label, the reference answer (plus the
 * task notes for partial and no tasks), the answer, and its evidence as quotes: every citation with its file and lines
 * (a legend citation as "legend of <result>"), and every dataRef as "result <name>, path [...]" with the value found
 * at that path in the data the run read, or a note that no such value was read. Never the run, the variant, the
 * prompt, the effort, the steps or the verification status.
 *
 * Blind sample rule (fixed in code before any evaluation run, 12 Nov 2026; independent of the judge):
 *   one answer per category, six in all. In each category the task is the one with the smallest
 *   sha256("agent-blind-v1|<category>|<task id>"); the run rotates over the categories in the order journal,
 *   decision-log, backtest, journal+backtest, job, premise as A1, B1, C, A2, B2, A1. Items are shown in hash order,
 *   labelled B01..B06, with no run, variant or verdict.
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DEFAULT_CAP_USD } from '../agent/run';
import type { AgentVerification } from '../agent/verify';
import type { AgentAnswer } from '../agent/model';
import { renderBlind, type BlindKeyEntry } from '../judge/blind';
import { ClaudeJudge } from '../judge/claude';
import { byHash, type JudgedItem } from '../judge/items';
import type { JudgeInput } from '../judge/types';
import type { AgentTask } from './agent-measures';
import { EVAL_PREFIX, JUDGED_FILE, loadTasks, RESULTS, RUNS, STEP_CAP_USD, stepSpent } from './agent-run';

export const BLIND = 'ai/eval/review/blind-2.4.md';
export const BLIND_KEY = 'ai/eval/review/blind-2.4-key.json';
export const CATEGORY_ORDER = ['journal', 'decision-log', 'backtest', 'journal+backtest', 'job', 'premise'] as const;
export const BLIND_RUNS = ['A1', 'B1', 'C', 'A2', 'B2', 'A1'];

interface RunTask {
  id: string;
  output: AgentAnswer | null;
  verification: AgentVerification | null;
}

const fmtLines = (c: { file?: string; lines?: [number, number]; chunkId: string }) =>
  c.chunkId.startsWith('legend:') ? `legend of ${c.chunkId.slice(7)}` : c.lines ? `${c.file}:${c.lines[0]}${c.lines[1] !== c.lines[0] ? `-${c.lines[1]}` : ''}` : (c.file ?? c.chunkId);

export function agentJudgeInput(task: AgentTask, rec: RunTask): JudgeInput {
  const v = rec.verification;
  return {
    question: task.question,
    answerable: task.answerable,
    reference: task.reference,
    ...(task.answerable !== 'yes' && task.notes ? { keyNotes: task.notes } : {}),
    answer: rec.output?.answer ?? '',
    quotes: [
      ...(v?.citations ?? []).map((c) => ({ where: fmtLines(c), quote: c.quote })),
      ...(v?.dataRefs ?? []).map((d) => ({
        where: `result ${d.name}, path ${JSON.stringify(d.path)}`,
        quote: d.stored !== undefined && d.status !== 'no-call' && d.status !== 'not-in-result' ? `value in the result read: ${String(d.stored)}` : 'no such value in the results this answer read',
      })),
    ],
  };
}

export function loadItems(): JudgedItem[] {
  const tasks = loadTasks();
  const items: JudgedItem[] = [];
  for (const run of Object.keys(RUNS)) {
    const f = `${RESULTS}/${EVAL_PREFIX}${run}.json`;
    if (!existsSync(f)) continue;
    for (const rec of (JSON.parse(readFileSync(f, 'utf8')) as { tasks: RunTask[] }).tasks) {
      const task = tasks.find((t) => t.id === rec.id)!;
      items.push({ run, id: rec.id, answerable: task.answerable, input: agentJudgeInput(task, rec) });
    }
  }
  return items;
}

const h = (s: string) => createHash('sha256').update(s).digest('hex');

export function blindKey(tasks: AgentTask[]): BlindKeyEntry[] {
  const picks = CATEGORY_ORDER.map((cat, i) => {
    const t = tasks.filter((x) => x.category === cat).sort((a, b) => (h(`agent-blind-v1|${cat}|${a.id}`) < h(`agent-blind-v1|${cat}|${b.id}`) ? -1 : 1))[0];
    return { run: BLIND_RUNS[i], id: t.id };
  });
  return byHash(picks).map((p, i) => ({ label: `B${String(i + 1).padStart(2, '0')}`, run: p.run, id: p.id, inAgreementSample: true }));
}

function makeBlind() {
  const key = blindKey(loadTasks());
  const items = loadItems();
  for (const k of key) if (!items.some((x) => x.run === k.run && x.id === k.id)) throw new Error(`answer ${k.run} ${k.id} not found; run the evaluation first`);
  const md = renderBlind(key, items).replace('# Blind grading, step 1.9', '# Blind grading, step 2.4 (agent answers)').replace(
    'Some items may answer the same question.',
    'Each item is a different question. Evidence lines starting with "result" are numbers the answer took from a backtest result file, shown with the value actually found at that path. Some items may answer the same question.',
  );
  writeFileSync(BLIND, md);
  writeFileSync(BLIND_KEY, JSON.stringify({ rule: 'ai/eval/agent-judge.ts (blindKey)', key }, null, 2) + '\n');
  console.log(`Wrote ${BLIND} (${key.length} items) and ${BLIND_KEY}`);
}

async function judgeAll() {
  const items = byHash(loadItems());
  const prev = existsSync(JUDGED_FILE) ? (JSON.parse(readFileSync(JUDGED_FILE, 'utf8')) as { items: JudgedItem[] }).items : [];
  const done = new Map(prev.map((x) => [`${x.run}|${x.id}`, x]));
  const judge = new ClaudeJudge();
  const out: JudgedItem[] = [];
  let cost = prev.reduce((n, x) => n + (x.result?.costUsd ?? 0), 0);
  const save = () => writeFileSync(JUDGED_FILE, JSON.stringify({ date: '2026-11-12', judge: judge.name, costUsd: Number(cost.toFixed(4)), items: out }, null, 2) + '\n');
  for (const it of items) {
    const old = done.get(`${it.run}|${it.id}`);
    if (old?.result?.verdict) {
      out.push(old);
      continue;
    }
    // Worst case of one judge call is far below a question's cap; reuse it as a conservative bound.
    if (stepSpent() + DEFAULT_CAP_USD > STEP_CAP_USD) {
      save();
      throw new Error(`stopping the judge: step spend $${stepSpent().toFixed(4)} (cap $${STEP_CAP_USD})`);
    }
    const r = await judge.judge(it.input);
    cost += r.costUsd;
    out.push({ ...it, result: r });
    save();
  }
  save();
  console.log(`Judged ${out.length} answers, $${cost.toFixed(4)}; step spend $${stepSpent().toFixed(4)} of $${STEP_CAP_USD}`);
}

if (require.main === module) {
  const cmd = process.argv[2];
  (cmd === 'blind' ? Promise.resolve(makeBlind()) : cmd === 'judge' ? judgeAll() : Promise.reject(new Error('usage: agent-judge.ts blind|judge'))).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
