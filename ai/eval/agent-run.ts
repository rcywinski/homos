/**
 * npm run ai:agent:eval -- --run A1|B1|C|A2|B2|QA-cl1|QA-cl2|QA-c1|QA-c2 [--format-with-tools] [--num-ctx 24576]
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
import { AnthropicAgentModel, type AgentEffort, type AgentModel } from '../agent/model';
import { OllamaAgentModel } from '../agent/model-ollama';
import { ollamaPs, ollamaUnload } from '../answer/local';
import { SYSTEM_PROMPTS, JOBS_ADDENDUM } from '../agent/prompt';
import { toolDefinitions } from '../agent/tools';
import { LOCAL_MODELS } from './answers';
import { PHASE3_CAP_USD, phase3Spent, PHASE3_JUDGMENTS } from './judge';
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
/**
 * Step 3.5 (owner, 16 Nov 2026): the agent on qwen3.8:27b through Ollama, prompt A, thinking off, compaction on demand
 * with restore on a repeated call (ai/agent/model-ollama.ts). QA-cl: search_journal on fully local retrieval (variant
 * B, nothing leaves the box). QA-c: search_journal as for Sonnet (contexts plus Sonnet query translation, the only
 * cloud call). Two runs each, QA-cl first. Separate result files, so the step 2.4 files and guard are untouched.
 */
export const LOCAL_AGENT_RUNS: Record<string, { variant: 'QA-cl' | 'QA-c'; retrieval: 'local' | 'chosen' }> = {
  'QA-cl1': { variant: 'QA-cl', retrieval: 'local' },
  'QA-cl2': { variant: 'QA-cl', retrieval: 'local' },
  'QA-c1': { variant: 'QA-c', retrieval: 'chosen' },
  'QA-c2': { variant: 'QA-c', retrieval: 'chosen' },
};
export const LOCAL_EVAL_PREFIX = '2026-11-16-agent-eval-local-';
export const LOCAL_JUDGED_FILE = `ai/eval/results/2026-11-16-agent-local-judged.json`;
/** Qwen settings for the agent: card sampling without thinking, repetition penalties off as in P (paths and quotes repeat). */
export const LOCAL_AGENT = { model: 'qwen3.8:27b', tokenizerDir: 'ai/index/tokenizers/qwen3.8-27b', numCtx: 24576, numPredict: 4096, sampling: { temperature: 0.7, top_p: 0.8, top_k: 20, min_p: 0, presence_penalty: 0, repeat_penalty: 1.0 }, keepAlive: '10m' };

/** Everything phase 3 has spent: the answer judgments, the local agent judge file and the tool costs of local runs. */
export function phase3TotalSpent(): number {
  let s = phase3Spent([PHASE3_JUDGMENTS]);
  if (existsSync(LOCAL_JUDGED_FILE)) s += (JSON.parse(readFileSync(LOCAL_JUDGED_FILE, 'utf8')) as { costUsd: number }).costUsd;
  for (const f of readdirSync(RESULTS).filter((x) => x.startsWith(LOCAL_EVAL_PREFIX) && x.endsWith('.json')))
    s += (JSON.parse(readFileSync(path.join(RESULTS, f), 'utf8')) as { tasks: Array<{ costUsd: number }> }).tasks.reduce((n, t) => n + t.costUsd, 0);
  return s;
}

/**
 * A calibrated local agent model. Load order (owner, 16 Nov 2026, after the bge-m3 eviction and runner crash): every
 * model unloaded first, bge-m3 included; Qwen loads with the cold calibration call (both tool sets, the larger overhead
 * kept); then one embed loads bge-m3 next to it. Both must then be in /api/ps and Qwen fully on the GPU.
 */
export async function startLocalAgent(baseUrl: string, variant: string, numCtx = LOCAL_AGENT.numCtx, formatWithTools = false): Promise<OllamaAgentModel> {
  const local = new OllamaAgentModel({ baseUrl, ...LOCAL_AGENT, numCtx, variant, formatWithTools });
  for (const m of [...LOCAL_MODELS, 'bge-m3']) await ollamaUnload(baseUrl, m);
  const left = await ollamaPs(baseUrl);
  if (left.length) throw new Error(`models still loaded: ${left.map((m) => m.name).join(', ')}`);
  const o1 = await local.calibrate(`${SYSTEM_PROMPTS.A}\n\n${JOBS_ADDENDUM}`, toolDefinitions(true));
  const o2 = await local.calibrate(SYSTEM_PROMPTS.A, toolDefinitions(false));
  local.overhead = Math.max(o1, o2);
  const emb = await fetch(`${baseUrl.replace(/\/$/, '')}/api/embed`, { method: 'POST', body: JSON.stringify({ model: 'bge-m3', input: ['load bge-m3 after the generator'], truncate: false }) });
  if (!emb.ok) throw new Error(`bge-m3 did not load next to ${LOCAL_AGENT.model}: HTTP ${emb.status}; not retrying`);
  const both = await ollamaPs(baseUrl);
  if (!both.some((m) => m.name === 'bge-m3:latest') || !both.some((m) => m.name === LOCAL_AGENT.model)) throw new Error(`after loading bge-m3 the loaded models are ${both.map((m) => m.name).join(', ')}; both must stay`);
  const ps = both.find((m) => m.name === LOCAL_AGENT.model);
  if (!ps || ps.size_vram < ps.size) throw new Error(`${LOCAL_AGENT.model} not fully on the GPU after calibration`);
  console.log(`calibrated overhead ${o1} (with jobs) and ${o2} (without); using ${local.overhead}; ${LOCAL_AGENT.model} ${(ps.size_vram / 2 ** 30).toFixed(2)} GiB on GPU; num_ctx ${numCtx}`);
  console.log(`loaded now: ${(await ollamaPs(baseUrl)).map((m) => `${m.name} ${(m.size_vram / 2 ** 30).toFixed(2)}/${(m.size / 2 ** 30).toFixed(2)} GiB`).join(', ')}`);
  return local;
}

export const STEP_CAP_USD = 25;
/**
 * Kept free for the judge while the runs go (added 12 Nov during run A1, when the first tasks cost about $0.25 each):
 * without it the runs could use the whole cap and leave nothing to judge them.
 */
export const JUDGE_RESERVE_USD = 4;
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
  const localCfg = LOCAL_AGENT_RUNS[run];
  const cfg = RUNS[run] ?? (localCfg ? { prompt: 'A' as const, effort: 'medium' as const } : undefined);
  if (!cfg) throw new Error(`--run must be one of ${[...Object.keys(RUNS), ...Object.keys(LOCAL_AGENT_RUNS)].join(', ')}`);
  const out = `${RESULTS}/${localCfg ? LOCAL_EVAL_PREFIX : EVAL_PREFIX}${run}.json`;
  if (existsSync(out)) throw new Error(`${out} exists; an evaluation run is not repeated over itself`);
  const runsDir = path.join(process.cwd(), 'ai/agent/runs-eval', run);
  if (existsSync(runsDir) && readdirSync(runsDir).length) throw new Error(`${runsDir} is not empty`);
  mkdirSync(runsDir, { recursive: true });

  const tasks = loadTasks();
  let model: AgentModel;
  let local: OllamaAgentModel | null = null;
  const baseUrl = process.env.INFERENCE_URL ?? '';
  if (localCfg) {
    const numCtx = process.argv.includes('--num-ctx') ? Number(process.argv[process.argv.indexOf('--num-ctx') + 1]) : LOCAL_AGENT.numCtx;
    local = await startLocalAgent(baseUrl, localCfg.variant, numCtx, process.argv.includes('--format-with-tools'));
    model = local;
  } else model = new AnthropicAgentModel('sonnet', undefined, cfg.effort);
  const rows: unknown[] = [];
  const save = () => writeFileSync(out, JSON.stringify({ date: localCfg ? new Date().toISOString().slice(0, 10) : '2026-11-12', run, prompt: cfg.prompt, effort: localCfg ? null : cfg.effort, model: model.name, settings: model.settings(), capPerQuestionUsd: DEFAULT_CAP_USD, ...(localCfg ? { variant: localCfg.variant, retrieval: localCfg.retrieval } : {}), tasks: rows }, null, 2) + '\n');
  for (const task of tasks) {
    const spent = (localCfg ? phase3TotalSpent() : stepSpent()) + rows.reduce((n: number, r) => n + (r as { costUsd: number }).costUsd, 0);
    if (localCfg && spent + DEFAULT_CAP_USD > PHASE3_CAP_USD) {
      save();
      throw new Error(`stopping before ${task.id}: phase 3 spend $${spent.toFixed(4)} (cap $${PHASE3_CAP_USD})`);
    }
    if (!localCfg && spent + DEFAULT_CAP_USD > STEP_CAP_USD - JUDGE_RESERVE_USD) {
      save();
      throw new Error(`stopping before ${task.id}: step spend $${spent.toFixed(4)}, one more question may cost $${DEFAULT_CAP_USD} (cap $${STEP_CAP_USD}, $${JUDGE_RESERVE_USD} kept for the judge)`);
    }
    if (local && !(await ollamaPs(baseUrl)).some((m) => m.name === LOCAL_AGENT.model)) {
      save();
      throw new Error(`stopping before ${task.id}: ${LOCAL_AGENT.model} is no longer loaded (evicted, crashed or the box restarted); not reloading it (owner rule)`);
    }
    const deps = realDeps(process.cwd(), task.jobs ? { approve: async () => true, runsDir } : undefined, localCfg?.retrieval ?? 'chosen');
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
        // Step 3.5: tool calls the validator rejected (unknown tool or arguments outside the schema).
        invalidToolCalls: r.calls.filter((c) => c.isError && /^(unknown tool|invalid arguments)/.test(c.content)).length,
      },
      ...(local ? { local: { ...local.lastStats } } : {}),
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
  if (local) {
    await ollamaUnload(baseUrl, LOCAL_AGENT.model);
    console.log(`Wrote ${out}; unloaded ${LOCAL_AGENT.model}; phase 3 spend so far $${phase3TotalSpent().toFixed(4)} of $${PHASE3_CAP_USD}`);
  } else console.log(`Wrote ${out}; step spend so far $${stepSpent().toFixed(4)} of $${STEP_CAP_USD}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
