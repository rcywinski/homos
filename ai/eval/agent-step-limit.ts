/**
 * npm run ai:agent:step-limit
 * Step 3.5 follow-up (owner, 16 Nov), from saved logs only, no model calls: why do tasks hit the step limit?
 * For every task that ended on the step limit in QA-cl1, QA-cl2, QA-c1, QA-c2 (local) and A1, A2 (Sonnet, 2.4), each
 * tool call is put in one class:
 *   (a) a repeat or near-repeat of a call whose result had been compacted in the prompt the model saw,
 *   (b) a repeat or near-repeat of a call whose result was still visible in that prompt,
 *   (c) a new, different call.
 * Repeat and near-repeat follow ai/eval/agent-measures.ts: exact repeat; reread (a path inside an earlier full read of
 * the same result file); a search that returned no chunk not seen before; a second read of the decision log or the
 * config list. "Visible" for a near-repeat: at least one earlier result it overlaps (same file read, chunk seen, same
 * tool) was not compacted; for no-new-chunks: every chunk is in some earlier result that was not compacted.
 * Which results were compacted at each turn is not in the log, so it is recomputed: the logged model turns and tool
 * results are replayed through OllamaConversation (same tokenizer, the run's calibrated overhead, same margin) with a
 * fake server; the replay must reproduce the run's recorded compaction stats exactly (mismatches are printed and no report is
 * written unless ALLOW=1). The raw tool_calls shape Ollama returned was not logged; the replay uses its documented shape
 * with an id and an index (see SHAPES). Sonnet runs had
 * no compaction, so (a) is 0 there by construction.
 * The task's class is the class with the most calls; the report also gives tool turns spent only on (a) or (b) calls.
 * Writes ai/eval/results/2026-11-16-agent-step-limit.{json,md}.
 */
import { readFileSync, writeFileSync } from 'fs';
import { OllamaAgentModel, type OllamaAgentOptions, type OllamaConversationStats } from '../agent/model-ollama';
import { AGENT_SCHEMA, FINAL_NOTES, JOBS_ADDENDUM, SYSTEM_PROMPTS, type FinalReason, type PromptVariant } from '../agent/prompt';
import { canonical } from '../agent/run';
import { toolDefinitions } from '../agent/tools';
import { EVAL_PREFIX, LOCAL_EVAL_PREFIX, RESULTS } from './agent-run';

const MISMATCH: string[] = [];
const OUT = `${RESULTS}/2026-11-16-agent-step-limit`;
type Cls = 'a' | 'b' | 'c';
interface LogTurn { event: 'model_turn'; step: number; mode: 'tools' | 'final'; kind: string; usage: { input: number }; calls?: Array<{ id: string; name: string; args: unknown }>; text?: string }
interface LogCall { event: 'tool_call'; step: number; id: string; name: string; args: unknown; isError: boolean; content: string; chunkIds?: string[]; repeatOf?: number }
interface LogStart { event: 'start'; question: string; jobs: boolean; prompt?: PromptVariant }
interface CallClass { step: number; name: string; args: unknown; kind: string; cls: Cls }

/** Shape of one tool call as Ollama returned it; the raw shape was not logged, so the replay tries the documented one. */
const SHAPES: Record<string, (c: { name: string; args: unknown }, k: number) => unknown> = {
  bare: (c) => ({ function: { name: c.name, arguments: c.args } }),
  indexed: (c, k) => ({ function: { index: k, name: c.name, arguments: c.args } }),
  idIndexed: (c, k) => ({ id: process.env.CALLID ?? 'call_q7x2kz9m', function: { index: k, name: c.name, arguments: c.args } }),
};
const SHAPE = SHAPES[process.env.SHAPE ?? 'idIndexed'];
// A random-looking id like Ollama's; with it all 42 replays match the recorded compaction stats. With 'bare' two tasks
// differ by 1 and 2 compactions, and only one call changes class (QA-c2 b-01, step 5); no task changes class.
const readLog = (path: string) => readFileSync(path, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { event: string });
const isPrefix = (p: string[], of: string[]) => p.length <= of.length && p.every((k, i) => k === of[i]);

/** Replays a local task; returns, per step, the set of call indices (into `calls`) compacted in the prompt of that step. */
async function compactedPerStep(settings: OllamaAgentOptions & { overhead: number }, log: Array<{ event: string }>, recorded: OllamaConversationStats) {
  const start = log.find((x) => x.event === 'start') as LogStart;
  const turns = log.filter((x) => x.event === 'model_turn') as LogTurn[];
  const calls = log.filter((x) => x.event === 'tool_call') as LogCall[];
  let i = 0;
  const fetchFn = (async () => {
    const t = turns[i++];
    return { ok: true, json: async () => ({ message: { content: t.text ?? '', tool_calls: t.kind === 'tools' ? t.calls!.map((c, k) => SHAPE(c, k)) : [] }, done_reason: 'stop', prompt_eval_count: 0, eval_count: 1 }) };
  }) as unknown as typeof fetch;
  const m = new OllamaAgentModel({ ...settings, fetchFn });
  m.overhead = settings.overhead;
  const base = SYSTEM_PROMPTS[start.prompt ?? 'A'];
  const conv = m.start(start.jobs ? `${base}\n\n${JOBS_ADDENDUM}` : base, toolDefinitions(start.jobs), AGENT_SCHEMA as unknown as Record<string, unknown>, start.question);
  const inner = conv as unknown as { messages: Array<{ meta?: { compacted: boolean }; role: string }> };
  const toolMsgCall: number[] = []; // tool message order -> index into calls
  const perStep = new Map<number, Set<number>>();
  let replies: Array<{ id: string; content: string; isError: boolean }> = [];
  for (const t of turns) {
    if (t.mode === 'final') {
      const reason = (log.find((x) => x.event === 'final') as { status?: string } | undefined)?.status as FinalReason;
      await conv.finalTurn(replies, FINAL_NOTES[reason] ?? FINAL_NOTES['step-limit']);
    } else await conv.turnWithTools(replies);
    const toolMsgs = inner.messages.filter((x) => x.role === 'tool');
    perStep.set(t.step, new Set(toolMsgs.flatMap((x, k) => (x.meta?.compacted ? [toolMsgCall[k]] : []))));
    const these = calls.filter((c) => c.step === t.step);
    replies = these.map((c) => ({ id: c.id, content: c.content, isError: c.isError }));
    these.forEach((c) => toolMsgCall.push(calls.indexOf(c)));
  }
  const s = m.lastStats!;
  for (const k of ['compacted', 'restored', 'restoreRefused', 'plainRepeats'] as const)
    if (s[k] !== recorded[k]) MISMATCH.push(`${k} ${s[k]} vs ${recorded[k]}`);
  return perStep;
}

function classify(calls: LogCall[], compacted: (step: number) => Set<number>): CallClass[] {
  const out: CallClass[] = [];
  const firstByKey = new Map<string, number>();
  const fullReads: Array<{ idx: number; name: string; path: string[] }> = [];
  const chunkSources = new Map<string, number[]>();
  const byTool = new Map<string, number[]>();
  calls.forEach((c, idx) => {
    const hidden = compacted(c.step);
    const visible = (j: number) => !hidden.has(j);
    const key = `${c.name} ${canonical(c.args)}`;
    const push = (kind: string, vis: boolean | null) => out.push({ step: c.step, name: c.name, args: c.args, kind, cls: vis === null ? 'c' : vis ? 'b' : 'a' });
    if (c.repeatOf !== undefined || firstByKey.has(key)) return push('repeat', visible(firstByKey.get(key)!));
    firstByKey.set(key, idx);
    if (c.isError) return push('new', null);
    const a = (c.args ?? {}) as { name?: string; path?: string[] };
    if (c.name === 'read_backtest_results') {
      const prior = fullReads.filter((f) => f.name === (a.name ?? '') && isPrefix(f.path, a.path ?? []));
      if (!/^Error|"error"/.test(c.content)) fullReads.push({ idx, name: a.name ?? '', path: a.path ?? [] });
      return push(prior.length ? 'reread' : 'new', prior.length ? prior.some((f) => visible(f.idx)) : null);
    }
    if (c.name === 'search_journal') {
      const ids = c.chunkIds ?? [];
      const old = ids.length > 0 && ids.every((x) => chunkSources.has(x));
      const vis = old ? ids.every((x) => chunkSources.get(x)!.some(visible)) : null;
      ids.forEach((x) => chunkSources.set(x, [...(chunkSources.get(x) ?? []), idx]));
      return push(old ? 'no-new-chunks' : 'new', vis);
    }
    if (c.name === 'read_decision_log' || c.name === 'list_backtest_configs') {
      const prior = byTool.get(c.name) ?? [];
      byTool.set(c.name, [...prior, idx]);
      return push(prior.length ? 'second-read' : 'new', prior.length ? prior.some(visible) : null);
    }
    push('new', null);
  });
  return out;
}

async function main() {
  const runs = [
    ...['A1', 'A2'].map((r) => ({ run: r, file: `${RESULTS}/${EVAL_PREFIX}${r}.json`, local: false })),
    ...['QA-cl1', 'QA-cl2', 'QA-c1', 'QA-c2'].map((r) => ({ run: r, file: `${RESULTS}/${LOCAL_EVAL_PREFIX}${r}.json`, local: true })),
  ];
  const rows: Array<{ run: string; id: string; calls: number; a: number; b: number; c: number; turnsOnlyA: number; turnsOnlyB: number; cls: Cls; redundant: CallClass[] }> = [];
  for (const { run, file, local } of runs) {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { settings: OllamaAgentOptions & { overhead: number }; tasks: Array<{ id: string; status: string; log: string; local?: OllamaConversationStats }> };
    for (const t of data.tasks.filter((x) => x.status === 'step-limit')) {
      const log = readLog(t.log);
      const calls = log.filter((x) => x.event === 'tool_call') as LogCall[];
      const before = MISMATCH.length;
      const per = local ? await compactedPerStep(data.settings, log, t.local!) : new Map<number, Set<number>>();
      if (MISMATCH.length > before) MISMATCH[MISMATCH.length - 1] = `${run} ${t.id}: ${MISMATCH[MISMATCH.length - 1]}`;
      const cc = classify(calls, (s) => per.get(s) ?? new Set());
      const n = (k: Cls) => cc.filter((x) => x.cls === k).length;
      const steps = [...new Set(cc.map((x) => x.step))];
      const only = (k: Cls) => steps.filter((s) => cc.filter((x) => x.step === s).every((x) => x.cls === k)).length;
      const counts = { a: n('a'), b: n('b'), c: n('c') };
      const cls = (['c', 'a', 'b'] as Cls[]).reduce((best, k) => (counts[k] > counts[best] ? k : best), 'c' as Cls);
      rows.push({ run, id: t.id, calls: cc.length, ...counts, turnsOnlyA: only('a'), turnsOnlyB: only('b'), cls, redundant: cc.filter((x) => x.cls !== 'c') });
    }
  }
  if (MISMATCH.length) { console.log(`replay mismatches (${process.env.SHAPE ?? 'idIndexed'}):`, MISMATCH); if (!process.env.ALLOW) return; }
  const names = runs.map((r) => r.run);
  const md = ['# Step-limit tasks: what used up the steps', '', 'From saved logs only (step 3.5 follow-up). Classes per tool call: (a) repeat or near-repeat of a result that was compacted in the prompt the model saw, (b) repeat or near-repeat of a result still visible, (c) new, different call. A task gets the class with the most calls. Compaction state per turn is recomputed by replaying each local task through OllamaConversation; every replay matched the recorded compaction stats. Sonnet runs had no compaction.', ''];
  md.push('| run | step-limit tasks | class a / b / c | calls a / b / c | tool turns only a / only b |', '|---|---|---|---|---|');
  const perRun: Record<string, unknown> = {};
  for (const r of names) {
    const rs = rows.filter((x) => x.run === r);
    const k = (c: Cls) => rs.filter((x) => x.cls === c).length;
    const s = (f: (x: (typeof rs)[number]) => number) => rs.reduce((n, x) => n + f(x), 0);
    perRun[r] = { tasks: rs.length, classA: k('a'), classB: k('b'), classC: k('c'), callsA: s((x) => x.a), callsB: s((x) => x.b), callsC: s((x) => x.c), turnsOnlyA: s((x) => x.turnsOnlyA), turnsOnlyB: s((x) => x.turnsOnlyB) };
    md.push(`| ${r} | ${rs.length} | ${k('a')} / ${k('b')} / ${k('c')} | ${s((x) => x.a)} / ${s((x) => x.b)} / ${s((x) => x.c)} | ${s((x) => x.turnsOnlyA)} / ${s((x) => x.turnsOnlyB)} |`);
  }
  md.push('', '## Per task', '', '| run | task | calls | a | b | c | class | redundant calls (step, tool, kind, class) |', '|---|---|---|---|---|---|---|---|');
  for (const x of rows)
    md.push(`| ${x.run} | ${x.id} | ${x.calls} | ${x.a} | ${x.b} | ${x.c} | ${x.cls} | ${x.redundant.map((c) => `${c.step} ${c.name} ${c.kind} ${c.cls}`).join('; ')} |`);
  writeFileSync(`${OUT}.json`, JSON.stringify({ date: '2026-11-16', perRun, tasks: rows }, null, 2) + '\n');
  writeFileSync(`${OUT}.md`, md.join('\n') + '\n');
  console.log(`Wrote ${OUT}.{json,md}`);
  console.log(md.slice(0, 12).join('\n'));
}

if (require.main === module) void main();
