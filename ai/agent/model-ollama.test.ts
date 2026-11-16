/**
 * Tests for the Ollama agent model (step 3.5), offline: a fake /api/chat and a word-count tokenizer. Covers the request
 * shape (tools, format, thinking off), tool call ids and replies, the final turn, text instead of a tool call,
 * compaction on demand, restoring a compacted result on a repeated call, the loud context limit and the server-count
 * check, plus one run through the real loop. Run: npx tsx ai/agent/model-ollama.test.ts
 */
import path from 'path';
import type { Chunk } from '../corpus/types';
import { DirResultsStore } from './handlers';
import { CANNOT_RESTORE, OllamaAgentModel, RESTORED_NOTE, type OllamaAgentOptions } from './model-ollama';
import { AGENT_SCHEMA } from './prompt';
import { runAgent } from './run';
import { toolDefinitions, type ToolDeps } from './tools';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
type Reply = { content?: string; calls?: Array<{ name: string; args: unknown }>; promptDelta?: number; done?: string };
const answer = JSON.stringify({ answer: 'A.', coverage: 'full', citations: [], dataRefs: [] });

/** Fake Ollama: replies in order; prompt_eval_count = words of everything sent (a lower bound of our estimate). */
function fake(replies: Reply[]) {
  const bodies: Array<Record<string, unknown>> = [];
  let i = 0;
  const fetchFn = (async (_u: string, init?: { body?: string }) => {
    const b = JSON.parse(init?.body ?? '{}') as { messages: Array<{ content: string }> };
    bodies.push(b as unknown as Record<string, unknown>);
    const r = replies[Math.min(i++, replies.length - 1)];
    const prompt = b.messages.reduce((s, m) => s + words(m.content), 0) + (r.promptDelta ?? 0);
    return { ok: true, json: async () => ({ message: { content: r.content ?? '', tool_calls: r.calls?.map((c) => ({ function: { name: c.name, arguments: c.args } })) }, done_reason: r.done ?? 'stop', prompt_eval_count: prompt, eval_count: 10, eval_duration: 1e9 }) } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fetchFn, bodies };
}

const opts = (fetchFn: typeof fetch, extra: Partial<OllamaAgentOptions> = {}): OllamaAgentOptions => ({
  baseUrl: 'http://box:11434',
  model: 'qwen3.8:27b',
  tokenizerDir: 'unused',
  numCtx: 100_000,
  numPredict: 100,
  sampling: { temperature: 0.7, top_p: 0.8, top_k: 20, min_p: 0, presence_penalty: 0, repeat_penalty: 1 },
  keepAlive: '10m',
  variant: 'test',
  fetchFn,
  countTokens: words,
  ...extra,
});
const tools = toolDefinitions(false);
const big = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

async function main() {
  // 1. Calibration and request shape.
  {
    const f = fake([{ content: 'ok', promptDelta: 40 }, { calls: [{ name: 'read_decision_log', args: {} }] }, { content: answer }]);
    const m = new OllamaAgentModel(opts(f.fetchFn));
    let threw = false;
    try {
      m.start('sys', tools, AGENT_SCHEMA as unknown as Record<string, unknown>, 'q');
    } catch {
      threw = true;
    }
    check('a conversation needs calibration first', threw);
    const over = await m.calibrate('sys', tools);
    check('calibration: overhead is server count minus our count, at least 0', over >= 0 && m.overhead === over, String(over));
    const c = m.start('sys', tools, AGENT_SCHEMA as unknown as Record<string, unknown>, 'q');
    const t1 = await c.turnWithTools([]);
    const b1 = f.bodies[1] as { tools?: unknown[]; format?: unknown; think: boolean; options: { num_ctx: number } };
    check('tool turn: tools sent, no format by default, thinking off, num_ctx set', Array.isArray(b1.tools) && b1.tools.length === 4 && b1.format === undefined && b1.think === false && b1.options.num_ctx === 100_000);
    check('tool calls get ids made here', t1.kind === 'tools' && t1.calls[0].id === 'ollama_1' && t1.calls[0].name === 'read_decision_log');
    const t2 = await c.finalTurn([{ id: 'ollama_1', content: 'LOG', isError: false }], 'answer now');
    const b2 = f.bodies[2] as { tools?: unknown; format?: unknown; messages: Array<{ role: string; content: string; tool_name?: string }> };
    check('final turn: no tools, the answer schema as format', b2.tools === undefined && !!b2.format);
    check('the reply goes back as a tool message with the tool name, then the note', b2.messages.some((x) => x.role === 'tool' && x.tool_name === 'read_decision_log' && x.content === 'LOG') && b2.messages[b2.messages.length - 1].content === 'answer now');
    check('final answer parsed', t2.kind === 'final' && t2.output?.answer === 'A.');
    check('cost 0, spend estimate 0', t2.costUsd === 0 && c.estimateNextUsd(1000) === 0);
  }

  // 2. Text instead of a tool call: a final request follows in the same turn, counted.
  {
    const f = fake([{ content: 'ok' }, { content: 'I think the answer is A.' }, { content: answer }]);
    const m = new OllamaAgentModel(opts(f.fetchFn));
    await m.calibrate('sys', tools);
    const c = m.start('sys', tools, AGENT_SCHEMA as unknown as Record<string, unknown>, 'q');
    const t = await c.turnWithTools([]);
    check('text in a tool turn: final request follows, answer returned, counted', t.kind === 'final' && t.output !== null && m.lastStats!.textInsteadOfTools === 1 && f.bodies.length === 3 && !(f.bodies[2] as { tools?: unknown }).tools);
    const f2 = fake([{ content: 'ok' }, { calls: [{ name: 'read_decision_log', args: {} }] }, { content: 'not json' }]);
    const m2 = new OllamaAgentModel(opts(f2.fetchFn));
    await m2.calibrate('sys', tools);
    const c2 = m2.start('sys', tools, AGENT_SCHEMA as unknown as Record<string, unknown>, 'q');
    await c2.turnWithTools([]);
    const t2 = await c2.finalTurn([{ id: 'ollama_1', content: 'x', isError: false }], 'n');
    check('unparsable final answer counted as a schema failure', t2.kind === 'final' && t2.output === null && m2.lastStats!.schemaFailures === 1);
  }

  // 3. Compaction on demand, restore on a repeated call, the honest note, the loud context limit. No tool definitions
  // here, so the budget is only the conversation (word-count tokenizer, 5% margin).
  {
    const none: typeof tools = [];
    const S = AGENT_SCHEMA as unknown as Record<string, unknown>;
    const calls = (n: string) => [{ name: 'search_journal', args: { query: n } }];
    const repeat = 'repeated call: search_journal was already called with exactly these arguments in step 1; its result is above. Use it, or call with different arguments.';
    const toolMsgs = (b: Record<string, unknown>) => (b as { messages: Array<{ role: string; content: string }> }).messages.filter((x) => x.role === 'tool');
    const f = fake([{ content: 'ok' }, { calls: calls('a') }, { calls: calls('b') }, { calls: calls('c') }, { calls: calls('a') }, { content: answer }]);
    const m = new OllamaAgentModel(opts(f.fetchFn, { numCtx: 1100 }));
    await m.calibrate('sys', none);
    const c = m.start('sys', none, S, 'q');
    await c.turnWithTools([]);
    await c.turnWithTools([{ id: 'ollama_1', content: `A ${big(350)}`, isError: false }]);
    await c.turnWithTools([{ id: 'ollama_2', content: `B ${big(350)}`, isError: false }]);
    check('two results fit: nothing compacted yet', m.lastStats!.compacted === 0 && toolMsgs(f.bodies[3]).every((x) => !x.content.startsWith('[earlier result')), JSON.stringify(m.lastStats));
    await c.turnWithTools([{ id: 'ollama_3', content: `C ${big(350)}`, isError: false }]);
    const sent4 = toolMsgs(f.bodies[4]);
    check('third result: the oldest is compacted to a stub, the newest kept whole', m.lastStats!.compacted === 1 && sent4[0].content.startsWith('[earlier result of search_journal') && sent4[2].content.startsWith('C '), JSON.stringify(m.lastStats));
    const t = await c.finalTurn([{ id: 'ollama_4', content: repeat, isError: true }], 'answer now');
    const sent5 = toolMsgs(f.bodies[5]);
    check('a repeat of a compacted result restores it in place of the refusal, counted', sent5[sent5.length - 1].content.startsWith(RESTORED_NOTE + 'A ') && m.lastStats!.restored === 1 && t.kind === 'final', JSON.stringify(m.lastStats));

    const g = fake([{ content: 'ok' }, { calls: calls('a') }, { calls: calls('a') }, { content: answer }]);
    const m2 = new OllamaAgentModel(opts(g.fetchFn));
    await m2.calibrate('sys', none);
    const c2 = m2.start('sys', none, S, 'q');
    await c2.turnWithTools([]);
    await c2.turnWithTools([{ id: 'ollama_1', content: 'A', isError: false }]);
    await c2.finalTurn([{ id: 'ollama_2', content: repeat, isError: true }], 'n');
    check('a repeat of a result never compacted is a plain repeat, refusal kept', m2.lastStats!.plainRepeats === 1 && m2.lastStats!.restored === 0 && toolMsgs(g.bodies[3]).pop()!.content === repeat);

    const h = fake([{ content: 'ok' }, { calls: calls('a') }, { calls: calls('b') }, { calls: calls('a') }, { content: answer }]);
    const m3 = new OllamaAgentModel(opts(h.fetchFn, { numCtx: 760 }));
    await m3.calibrate('sys', none);
    const c3 = m3.start('sys', none, S, 'q');
    await c3.turnWithTools([]);
    await c3.turnWithTools([{ id: 'ollama_1', content: `A ${big(500)}`, isError: false }]);
    await c3.turnWithTools([{ id: 'ollama_2', content: `B ${big(500)}`, isError: false }]);
    const t3 = await c3.finalTurn([{ id: 'ollama_3', content: repeat, isError: true }], 'n');
    const last3 = toolMsgs(h.bodies[4]).pop()!.content;
    check('restored result too large even with all older results compacted: honest note sent, counted as refused', t3.kind === 'final' && last3 === CANNOT_RESTORE && m3.lastStats!.restoreRefused === 1 && m3.lastStats!.restored === 0, JSON.stringify({ s: m3.lastStats, last3: last3.slice(0, 60) }));

    const k = fake([{ content: 'ok' }, { calls: calls('a') }, { content: answer }]);
    const m4 = new OllamaAgentModel(opts(k.fetchFn, { numCtx: 600 }));
    await m4.calibrate('sys', none);
    const c4 = m4.start('sys', none, S, 'q');
    await c4.turnWithTools([]);
    const before = k.bodies.length;
    const t4 = await c4.turnWithTools([{ id: 'ollama_1', content: big(900), isError: false }]);
    check('newest result alone does not fit: loud context-limit, no call made', t4.kind === 'final' && t4.output === null && /context-limit/.test(t4.error ?? '') && m4.lastStats!.contextLimit && k.bodies.length === before);
    check('CANNOT_RESTORE says the result can still be cited', /may still cite it/.test(CANNOT_RESTORE));
  }

  // 4. A server count above the estimate stops the run.
  {
    const f = fake([{ content: 'ok' }, { calls: [{ name: 'read_decision_log', args: {} }], promptDelta: 5000 }]);
    const m = new OllamaAgentModel(opts(f.fetchFn));
    await m.calibrate('sys', tools);
    const c = m.start('sys', tools, AGENT_SCHEMA as unknown as Record<string, unknown>, 'q');
    let msg = '';
    await c.turnWithTools([]).catch((e: Error) => (msg = e.message));
    check('server prompt above the estimate throws', /larger than estimated/.test(msg), msg);
  }

  // 5. Through the real loop: a call, its result, the answer.
  {
    const f = fake([{ content: 'ok' }, { calls: [{ name: 'read_decision_log', args: {} }] }, { content: answer }]);
    const m = new OllamaAgentModel(opts(f.fetchFn));
    await m.calibrate('sys', tools);
    const d: ToolDeps = { journal: { async search() { return { chunks: [] as Chunk[], costUsd: 0 }; } }, results: new DirResultsStore(path.join(__dirname, 'fixtures', 'results')), readDecisionLog: () => '| a | b |' };
    const r = await runAgent(m, d, 'q');
    check('runs through the unchanged loop: answered, one tool call, cost 0', r.status === 'answered' && r.calls.length === 1 && r.costUsd === 0 && r.output?.answer === 'A.', JSON.stringify({ s: r.status, e: r.error }));
  }

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main();
