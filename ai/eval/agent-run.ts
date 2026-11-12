/**
 * npm run ai:agent:eval -- --run A1|B1|C|A2|B2
 * One evaluation run of step 2.4 over the 18 tasks of ai/eval/agent-tasks.jsonl.
 *   A: prompt A (the 2.2 prompt), effort medium.  B: prompt B (A plus five sentences), effort medium.
 *   C: prompt A, effort high.
 * Tasks with jobs on run with run_backtest, approved unattended (as --yes-jobs), in a runs directory of this run
 * only (ai/agent/runs-eval/<run>/, must be empty), so no run sees another run's job results. Every task is logged as
 * JSONL in ai/agent/logs/. The step spend cap ($25, runs plus judge) is checked before every task against all result
 * files of the step: a task starts only if the worst case of one question ($0.50) still fits.
 * Writes ai/eval/results/2026-11-12-agent-eval-<run>.json after every task.
 */
import 'dotenv/config';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { JsonlLog } from '../agent/log';
import { AnthropicAgentModel, type AgentEffort } from '../agent/model';
import type { PromptVariant } from '../agent/prompt';
import { DEFAULT_CAP_USD, runAgent } from '../agent/run';
import { realDeps } from '../agent/tools';
import { legendCitations, redundantCalls, requiredSources, unneededJob, type AgentTask, type CallRecord } from './agent-measures';

export const RUNS: Record<string, { prompt: PromptVariant; effort: AgentEffort }> = {
  A1: { prompt: 'A', effort: 'medium' },
  B1: { prompt: 'B', effort: 'medium' },
  C: { prompt: 'A', effort: 'high' },
  A2: { prompt: 'A', effort: 'medium' },
  B2: { prompt: 'B', effort: 'medium' },
};
export const STEP_CAP_USD = 25;
export const RESULTS = 'ai/eval/results';
export const EVAL_PREFIX = '2026-11-12-agent-eval-';
export const JUDGED_FILE = `${RESULTS}/2026-11-12-agent-judged.json`;

export const loadTasks = (): AgentTask[] => readFileSync('ai/eval/agent-tasks.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as AgentTask);

/** Everything spent in step 2.4 so far: every evaluation run file plus the judge file. */
export function stepSpent(): number {
  let s = 0;
  for (const f of readdirSync(RESULTS).filter((x) => x.startsWith(EVAL_PREFIX) && x.endsWith('.json'))) {
    s += (JSON.parse(readFileSync(path.join(RESULTS, f), 'utf8')) as { tasks: Array<{ costUsd: number }> }).tasks.reduce((n, t) => n + t.costUsd, 0);
  }
  if (existsSync(JUDGED_FILE)) s += (JSON.parse(readFileSync(JUDGED_FILE, 'utf8')) as { costUsd: number }).costUsd;
  return s;
}

async function main() {
  const run = process.argv[process.argv.indexOf('--run') + 1];
  const cfg = RUNS[run];
  if (!cfg) throw new Error(`--run must be one of ${Object.keys(RUNS).join(', ')}`);
  const out = `${RESULTS}/${EVAL_PREFIX}${run}.json`;
  if (existsSync(out)) throw new Error(`${out} exists; an evaluation run is not repeated over itself`);
  const runsDir = path.join(process.cwd(), 'ai/agent/runs-eval', run);
  if (existsSync(runsDir) && readdirSync(runsDir).length) throw new Error(`${runsDir} is not empty`);
  mkdirSync(runsDir, { recursive: true });

  const tasks = loadTasks();
  const model = new AnthropicAgentModel('sonnet', undefined, cfg.effort);
  const rows: unknown[] = [];
  const save = () => writeFileSync(out, JSON.stringify({ date: '2026-11-12', run, prompt: cfg.prompt, effort: cfg.effort, model: model.name, settings: model.settings(), capPerQuestionUsd: DEFAULT_CAP_USD, tasks: rows }, null, 2) + '\n');
  for (const task of tasks) {
    const spent = stepSpent() + rows.reduce((n: number, r) => n + (r as { costUsd: number }).costUsd, 0);
    if (spent + DEFAULT_CAP_USD > STEP_CAP_USD) {
      save();
      throw new Error(`stopping before ${task.id}: step spend $${spent.toFixed(4)}, one more question may cost $${DEFAULT_CAP_USD} (cap $${STEP_CAP_USD})`);
    }
    const deps = realDeps(process.cwd(), task.jobs ? { approve: async () => true, runsDir } : undefined);
    const log = new JsonlLog(`eval-${run}-${task.id}`);
    const t0 = Date.now();
    const r = await runAgent(model, deps, task.question, { log, prompt: cfg.prompt });
    const calls: CallRecord[] = r.calls.map((c) => ({ name: c.name, args: c.args, isError: c.isError, content: c.content, chunkIds: c.chunks?.map((x) => x.id), repeatOf: c.repeatOf }));
    const redundant = redundantCalls(calls, r.output);
    const required = requiredSources(task, calls, r.verification);
    const v = r.verification;
    rows.push({
      id: task.id,
      category: task.category,
      status: r.status,
      error: r.error ?? null,
      output: r.output,
      verification: v,
      measures: {
        citationsOk: v ? v.citations.filter((c) => c.status === 'ok').length : 0,
        citations: v ? v.citations.length : 0,
        legendCitations: legendCitations(v).length,
        legendCitationsOk: legendCitations(v).filter((c) => c.status === 'ok').length,
        dataRefsOk: v ? v.dataRefs.filter((d) => d.status === 'ok').length : 0,
        dataRefs: v ? v.dataRefs.length : 0,
        unbackedNumbers: v ? v.unbackedNumbers.length : 0,
        requiredOk: required.ok,
        requiredMissing: required.missing,
        unneededJob: unneededJob(task, calls),
        redundant: redundant.length,
        redundantByKind: redundant.reduce((m: Record<string, number>, x) => ((m[x.kind] = (m[x.kind] ?? 0) + 1), m), {}),
        rereadsUsedInDataRef: redundant.filter((x) => x.usedInDataRef).length,
        steps: r.turns.length,
        toolCalls: r.calls.length,
        reasoningTokens: r.turns.reduce((n, t) => n + (t.reasoningTokens ?? 0), 0),
      },
      turns: r.turns.map((t) => ({ step: t.step, mode: t.mode, kind: t.kind, stopReason: t.stopReason, usage: t.usage, reasoningTokens: t.reasoningTokens, costUsd: t.costUsd, ms: t.ms, reasoning: t.reasoning })),
      calls: r.calls.map((c, i) => ({ step: c.step, name: c.name, args: c.args, isError: c.isError, chars: c.chars, ms: c.ms, costUsd: c.costUsd, chunkIds: c.chunks?.map((x) => x.id), repeatOf: c.repeatOf, redundant: redundant.find((x) => x.index === i)?.kind ?? null, error: c.isError ? c.content.slice(0, 300) : undefined })),
      usage: r.usage,
      modelCostUsd: r.modelCostUsd,
      toolCostUsd: r.toolCostUsd,
      costUsd: r.costUsd,
      ms: Date.now() - t0,
      log: path.relative(process.cwd(), log.file),
    });
    save();
    console.log(`${run} ${task.id}: ${r.status}, ${r.turns.length} turns, ${r.calls.length} calls, required ${required.ok ? 'ok' : 'MISSING'}, $${r.costUsd.toFixed(4)}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  save();
  console.log(`Wrote ${out}; step spend so far $${stepSpent().toFixed(4)} of $${STEP_CAP_USD}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
