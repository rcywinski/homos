/**
 * The agent loop (step 2.2). Provider-neutral: it asks an AgentModel for "a turn with tools" or "a final turn without
 * tools" and runs the tools through runTool (validation, caps, errors as results). Rules:
 *   - at most MAX_STEPS model turns; the last one is a final turn, the run is marked "step-limit";
 *   - a call repeated with the same arguments is not run again: the model gets an error pointing at the earlier
 *     result; at the third identical call the next turn is final, marked "repeated";
 *   - a spend cap per question, model calls plus model calls inside tools (query translation): before a turn with
 *     tools there must be room for that turn and for a final turn after one more round of results, otherwise the turn
 *     is final ("spend-cap"); when not even a final turn fits, the run stops without an answer;
 *   - every turn and tool call goes to the event sink (JSONL log) and to an optional progress callback.
 */
import type { Chunk } from '../corpus/types';
import type { TokenUsage } from '../context/types';
import { addUsage, zeroUsage } from './usage';
import type { AgentAnswer, AgentModel, ToolReply, Turn } from './model';
import { AGENT_SCHEMA, AGENT_SYSTEM, FINAL_NOTES, JOBS_ADDENDUM, MAX_STEPS, type FinalReason } from './prompt';
import { runTool, SEARCH_CAP, toolDefinitions, type ToolDeps } from './tools';
import { nullLog, type EventSink } from './log';
import { verifyAgentAnswer, type AgentVerification } from './verify';

export const DEFAULT_CAP_USD = 0.5;

export type RunStatus = 'answered' | FinalReason | 'no-answer';

export interface ToolCallRecord {
  step: number;
  id: string;
  name: string;
  args: unknown;
  isError: boolean;
  content: string;
  chars: number;
  ms: number;
  costUsd: number;
  chunks?: Chunk[];
  /** Set when the call repeated an earlier one and was not run: the step of the first call. */
  repeatOf?: number;
}

export interface TurnRecord {
  step: number;
  mode: 'tools' | 'final';
  kind: Turn['kind'];
  stopReason: string;
  text: string;
  reasoning: string;
  reasoningTokens: number | null;
  usage: TokenUsage;
  costUsd: number;
  ms: number;
  calls?: Array<{ id: string; name: string; args: unknown }>;
}

export interface AgentRunResult {
  question: string;
  model: string;
  settings: Record<string, unknown>;
  status: RunStatus;
  error?: string;
  output: AgentAnswer | null;
  verification: AgentVerification | null;
  turns: TurnRecord[];
  calls: ToolCallRecord[];
  usage: TokenUsage;
  modelCostUsd: number;
  toolCostUsd: number;
  costUsd: number;
  capUsd: number;
  ms: number;
}

export interface RunOptions {
  maxSteps?: number;
  capUsd?: number;
  log?: EventSink;
  onTurn?: (t: TurnRecord) => void;
  onCall?: (c: ToolCallRecord) => void;
  root?: string;
}

/** JSON with object keys sorted, so equal arguments give equal keys whatever their order. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (typeof v === 'object' && v !== null) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

export async function runAgent(model: AgentModel, deps: ToolDeps, question: string, opts: RunOptions = {}): Promise<AgentRunResult> {
  const maxSteps = opts.maxSteps ?? MAX_STEPS;
  const capUsd = opts.capUsd ?? DEFAULT_CAP_USD;
  const log = opts.log ?? nullLog;
  const t0 = Date.now();
  const turns: TurnRecord[] = [];
  const calls: ToolCallRecord[] = [];
  let usage = zeroUsage();
  let modelCost = 0;
  let toolCost = 0;
  const spent = () => modelCost + toolCost;
  log.write({ event: 'start', question, model: model.name, settings: model.settings(), maxSteps, capUsd, jobs: !!deps.jobs });

  const jobs = !!deps.jobs;
  const system = jobs ? `${AGENT_SYSTEM}\n\n${JOBS_ADDENDUM}` : AGENT_SYSTEM;
  const conv = model.start(system, toolDefinitions(jobs), AGENT_SCHEMA as unknown as Record<string, unknown>, question);
  let lastTurnEnd = Date.now();
  let replies: ToolReply[] = [];
  let force: FinalReason | null = null;
  const seen = new Map<string, { step: number; count: number }>();
  let output: AgentAnswer | null = null;
  let status: RunStatus = 'no-answer';
  let error: string | undefined;

  for (let step = 1; step <= maxSteps; step++) {
    const replyChars = replies.reduce((s, r) => s + r.content.length, 0);
    const idleMs = Date.now() - lastTurnEnd;
    let reason: FinalReason | null = force ?? (step === maxSteps ? 'step-limit' : null);
    if (!reason) {
      // Reserve for a final turn after one more round of results; with jobs, that round may outlive the cache.
      const room = conv.estimateNextUsd(replyChars, idleMs) + conv.estimateNextUsd(replyChars + SEARCH_CAP, jobs ? Infinity : 0);
      if (spent() + room > capUsd) reason = 'spend-cap';
    }
    if (reason && spent() + conv.estimateNextUsd(replyChars, idleMs) > capUsd) {
      status = 'spend-cap';
      error = `stopped before step ${step}: spent $${spent().toFixed(4)}, a final turn could exceed the $${capUsd} cap`;
      log.write({ event: 'stop', step, reason: error });
      break;
    }

    const turn = reason ? await conv.finalTurn(replies, FINAL_NOTES[reason]) : await conv.turnWithTools(replies);
    lastTurnEnd = Date.now();
    usage = addUsage(usage, turn.usage);
    modelCost += turn.costUsd;
    const rec: TurnRecord = { step, mode: reason ? 'final' : 'tools', kind: turn.kind, stopReason: turn.stopReason, text: turn.text, reasoning: turn.reasoning, reasoningTokens: turn.reasoningTokens, usage: turn.usage, costUsd: turn.costUsd, ms: turn.ms };
    if (turn.kind === 'tools') rec.calls = turn.calls;
    turns.push(rec);
    log.write({ event: 'model_turn', ...rec, ...(turn.kind === 'final' ? { output: turn.output, error: turn.error } : {}) });
    opts.onTurn?.(rec);

    if (turn.kind === 'final') {
      output = turn.output;
      status = output ? (reason ?? 'answered') : 'no-answer';
      error = turn.error;
      break;
    }
    if (reason) {
      status = 'no-answer';
      error = 'the model called a tool in a final turn';
      break;
    }

    replies = [];
    for (const call of turn.calls) {
      const key = `${call.name} ${canonical(call.args)}`;
      const prev = seen.get(key);
      const t1 = Date.now();
      let r: { content: string; isError: boolean; costUsd: number; chunks?: Chunk[] };
      if (prev) {
        prev.count++;
        if (prev.count >= 3) force = 'repeated';
        r = { isError: true, costUsd: 0, content: `repeated call: ${call.name} was already called with exactly these arguments in step ${prev.step}; its result is above. Use it, or call with different arguments.` };
      } else {
        seen.set(key, { step, count: 1 });
        r = await runTool(deps, call.name, call.args);
      }
      toolCost += r.costUsd;
      const c: ToolCallRecord = { step, id: call.id, name: call.name, args: call.args, isError: r.isError, content: r.content, chars: r.content.length, ms: Date.now() - t1, costUsd: r.costUsd, ...(r.chunks ? { chunks: r.chunks } : {}), ...(prev ? { repeatOf: prev.step } : {}) };
      calls.push(c);
      log.write({ event: 'tool_call', step, id: c.id, name: c.name, args: c.args, isError: c.isError, chars: c.chars, ms: c.ms, costUsd: c.costUsd, repeatOf: c.repeatOf, chunkIds: c.chunks?.map((x) => x.id), content: c.content });
      opts.onCall?.(c);
      replies.push({ id: call.id, content: r.content, isError: r.isError });
    }
  }

  const verification = output ? verifyAgentAnswer(output, calls, opts.root) : null;
  const result: AgentRunResult = {
    question,
    model: model.name,
    settings: model.settings(),
    status,
    ...(error ? { error } : {}),
    output,
    verification,
    turns,
    calls,
    usage,
    modelCostUsd: modelCost,
    toolCostUsd: toolCost,
    costUsd: spent(),
    capUsd,
    ms: Date.now() - t0,
  };
  log.write({ event: 'final', status, error, output, verification, steps: turns.length, toolCalls: calls.length, usage, modelCostUsd: modelCost, toolCostUsd: toolCost, costUsd: spent(), ms: result.ms });
  return result;
}
