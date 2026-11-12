/**
 * Tests for the agent loop, the Anthropic model adapter and the answer check (step 2.2), offline: a scripted fake
 * AgentModel, a fake Messages client, fake tool dependencies. Run: npx tsx ai/agent/run.test.ts
 */
import path from 'path';
import type Anthropic from '@anthropic-ai/sdk';
import type { Chunk } from '../corpus/types';
import { DirResultsStore } from './handlers';
import { AnthropicAgentModel, parseAgentAnswer, strictSchema, type AgentAnswer, type AgentConversation, type AgentModel, type MessagesClient, type ToolCall, type ToolReply, type Turn } from './model';
import { AGENT_SCHEMA, AGENT_SYSTEM, FINAL_NOTES } from './prompt';
import { canonical, runAgent } from './run';
import { DECISION_LOG, runTool, TOOL_DATA_RULE, toolDefinitions, type ToolDeps } from './tools';
import { unbackedNumbers, verifyDataRef, type CallForCheck } from './verify';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const usage = { input: 100, cacheWrite: 0, cacheRead: 0, output: 50 };
const chunk: Chunk = { id: 'journal/CONTEXT.md:1303#p2', file: 'journal/CONTEXT.md', lineStart: 1332, lineEnd: 1360, date: '2026-08-30', kind: 'journal-entry', title: 't', text: 'produkt live zostaje szeroki ±50%, bo wąskie przegrały' };
const FIX = path.join(__dirname, 'fixtures', 'results');

function deps(searchCost = 0): ToolDeps & { searches: string[] } {
  const searches: string[] = [];
  return {
    searches,
    journal: {
      async search(q) {
        searches.push(q);
        return { chunks: [chunk], costUsd: searchCost };
      },
    },
    results: new DirResultsStore(FIX),
    readDecisionLog: () => '# Decision log\n| 10 Aug | **Backtesting before any deployment.** Gate: a strategy must beat HODL 50/50 in ≥ 2 market regimes. |',
  };
}

type Script = Array<{ calls?: ToolCall[]; answer?: AgentAnswer; cost?: number }>;

/** Scripted model: returns the turns in order; records what the loop asked for. */
class FakeModel implements AgentModel {
  readonly name = 'fake';
  asked: Array<{ mode: 'tools' | 'final'; replies: ToolReply[]; note?: string }> = [];
  constructor(
    private readonly script: Script,
    private readonly estimate = 0.01,
  ) {}
  settings() {
    return {};
  }
  start(): AgentConversation {
    let i = 0;
    const next = (mode: 'tools' | 'final', replies: ToolReply[], note?: string): Turn => {
      this.asked.push({ mode, replies, note });
      const s = this.script[Math.min(i++, this.script.length - 1)];
      const base = { usage, costUsd: s.cost ?? 0.01, ms: 1, stopReason: s.calls ? 'tool_use' : 'end_turn', text: '', reasoning: '', reasoningTokens: null };
      if (mode === 'final' || !s.calls) return { ...base, kind: 'final', output: s.answer ?? null, ...(s.answer ? {} : { error: 'no answer' }) };
      return { ...base, kind: 'tools', calls: s.calls };
    };
    return {
      turnWithTools: async (r) => next('tools', r),
      finalTurn: async (r, note) => next('final', r, note),
      estimateNextUsd: () => this.estimate,
    };
  }
}

const ans = (answer: string, extra: Partial<AgentAnswer> = {}): AgentAnswer => ({ answer, coverage: 'full', citations: [], dataRefs: [], ...extra });
const call = (id: string, name: string, args: unknown): ToolCall => ({ id, name, args });

async function main() {
  // 1. Prompt and schema.
  {
    check('system prompt carries the tool-data rule', AGENT_SYSTEM.includes(TOOL_DATA_RULE));
    check('system prompt has no em or en dashes', !/[\u2013\u2014]/.test(AGENT_SYSTEM) && Object.values(FINAL_NOTES).every((n) => !/[\u2013\u2014]/.test(n)));
    check('schema requires citations and dataRefs', JSON.stringify(AGENT_SCHEMA.required) === '["answer","coverage","citations","dataRefs"]');
    check('parseAgentAnswer accepts a valid answer and rejects a bad one', parseAgentAnswer(JSON.stringify(ans('a'))) !== null && parseAgentAnswer('{"answer":"a"}') === null && parseAgentAnswer('not json') === null);
  }

  // 2. A normal run: two tool calls in one turn, then the answer; replies go back in one batch.
  {
    const m = new FakeModel([{ calls: [call('t1', 'search_journal', { query: 'why wide' }), call('t2', 'read_decision_log', {})] }, { answer: ans('Wide.', { citations: [{ chunkId: chunk.id, quote: 'produkt live zostaje szeroki' }] }) }]);
    const d = deps(0.002);
    const r = await runAgent(m, d, 'Why wide?');
    check('answered in two turns', r.status === 'answered' && r.turns.length === 2 && r.calls.length === 2, JSON.stringify({ s: r.status, t: r.turns.length }));
    check('both replies sent together, in call order', m.asked[1].replies.map((x) => x.id).join() === 't1,t2' && m.asked[1].mode === 'tools');
    check('cost counts the model calls and the call inside the tool', Math.abs(r.costUsd - (0.02 + 0.002)) < 1e-12 && r.toolCostUsd === 0.002, String(r.costUsd));
    check('citation from a returned chunk verifies', r.verification!.citations[0].status === 'ok');
  }

  // 3. Step limit: the last turn is final, with the step-limit note.
  {
    const script: Script = Array.from({ length: 12 }, (_, i) => ({ calls: [call(`c${i}`, 'search_journal', { query: `q${i}` })] }));
    script[9] = { answer: ans('Limited.') };
    const m = new FakeModel(script);
    const r = await runAgent(m, deps(), 'q', { maxSteps: 10 });
    check('ten model turns at most', r.turns.length === 10, String(r.turns.length));
    check('the tenth turn is final with the step-limit note', m.asked[9].mode === 'final' && m.asked[9].note === FINAL_NOTES['step-limit'] && m.asked.slice(0, 9).every((a) => a.mode === 'tools'));
    check('status step-limit with an answer', r.status === 'step-limit' && r.output?.answer === 'Limited.');
  }

  // 4. Repeated calls: the second is not run and gets an error; the third forces a final turn.
  {
    const same = { query: 'same' } as const;
    const m = new FakeModel([{ calls: [call('a', 'search_journal', same)] }, { calls: [call('b', 'search_journal', { query: 'same' })] }, { calls: [call('c', 'search_journal', same)] }, { answer: ans('Done.') }]);
    const d = deps();
    const r = await runAgent(m, d, 'q');
    check('the repeated call is not run again', d.searches.length === 1, String(d.searches.length));
    check('the repeat gets an error pointing at step 1', r.calls[1].isError && r.calls[1].repeatOf === 1 && /already called with exactly these arguments in step 1/.test(r.calls[1].content));
    check('the third identical call forces a final turn marked repeated', m.asked[3].mode === 'final' && m.asked[3].note === FINAL_NOTES.repeated && r.status === 'repeated', r.status);
    check('canonical JSON ignores key order', canonical({ b: 1, a: [1, { d: 2, c: 3 }] }) === canonical({ a: [1, { c: 3, d: 2 }], b: 1 }));
  }

  // 5. Spend cap: when a tool turn plus a final turn do not fit, the turn is final; when nothing fits, stop.
  {
    const m = new FakeModel([{ calls: [call('a', 'search_journal', { query: 'x' })], cost: 0.3 }, { answer: ans('Capped.') }], 0.11);
    const r = await runAgent(m, deps(), 'q', { capUsd: 0.5 });
    check('second turn is final under the cap (0.3 spent, 0.11 + 0.11 reserve would pass 0.5)', m.asked[1].mode === 'final' && m.asked[1].note === FINAL_NOTES['spend-cap'] && r.status === 'spend-cap' && r.output?.answer === 'Capped.', JSON.stringify(m.asked.map((a) => a.mode)));
    const m2 = new FakeModel([{ calls: [call('a', 'search_journal', { query: 'x' })], cost: 0.45 }, { answer: ans('never') }], 0.11);
    const r2 = await runAgent(m2, deps(), 'q', { capUsd: 0.5 });
    check('no turn when even a final one may exceed the cap', m2.asked.length === 1 && r2.status === 'spend-cap' && r2.output === null && /cap/.test(r2.error ?? ''), JSON.stringify(r2.error));
    const m3 = new FakeModel([{ answer: ans('x') }], 0.3);
    const r3 = await runAgent(m3, deps(), 'q', { capUsd: 0.5 });
    check('the first turn is final when two turns would not fit', m3.asked[0].mode === 'final' && r3.status === 'spend-cap');
  }

  // 6. Unknown tool and tool errors come back as results; the loop goes on.
  {
    const m = new FakeModel([{ calls: [call('a', 'run_backtest', { config: 'x' }), call('b', 'read_backtest_results', { name: '../../.env' })] }, { answer: ans('No.') }]);
    const r = await runAgent(m, deps(), 'q');
    check('unknown tool is an error result', r.calls[0].isError && /unknown tool "run_backtest"/.test(r.calls[0].content));
    check('invalid name is an error result', r.calls[1].isError && /invalid result name/.test(r.calls[1].content));
    check('the run still answers', r.status === 'answered' && m.asked[1].replies.every((x) => x.isError));
  }

  // 7. A model that answers with nothing usable.
  {
    const r = await runAgent(new FakeModel([{}]), deps(), 'q');
    check('no usable answer gives no-answer', r.status === 'no-answer' && r.output === null && r.verification === null);
  }

  // 8. Answer check: citations against this run's chunks and the decision log; dataRefs against this run's reads.
  {
    const wf = 'walkforward-fixture-pool-45d';
    const read = await runTool(deps(), 'read_backtest_results', { name: wf, path: ['byStrat'] });
    const calls: CallForCheck[] = [{ name: 'read_backtest_results', args: { name: wf, path: ['byStrat'] }, ...read }];
    const answer = 'Passive ±50% averaged -0.71% and won 62.4% of 3 windows.';
    const v = (ref: { name: string; path: string[]; value: string }) => verifyDataRef(ref, calls, answer);
    const p = ['byStrat', 'Pasywny ±50%', 'WSZYSTKIE'];
    check('a value read in this run verifies', v({ name: wf, path: [...p, 'mean'], value: '-0.71' }).status === 'ok');
    check('rounding to the written decimals', v({ name: wf, path: [...p, 'winPct'], value: '62.4' }).status === 'ok' && v({ name: wf, path: [...p, 'winPct'], value: '62' }).status === 'not-in-answer');
    check('a typographic minus in the answer matches', verifyDataRef({ name: wf, path: [...p, 'mean'], value: '-0.71' }, calls, 'a mean of \u22120.71 points').status === 'ok');
    check('a wrong value is a mismatch', v({ name: wf, path: [...p, 'mean'], value: '-0.72' }).status === 'mismatch');
    check('a value with a unit is rejected', v({ name: wf, path: [...p, 'winPct'], value: '62.4%' }).status === 'bad-value');
    check('a value not in the answer text', v({ name: wf, path: [...p, 'windows'], value: '3' }).status === 'ok' && verifyDataRef({ name: wf, path: [...p, 'windows'], value: '3' }, calls, 'no number').status === 'not-in-answer');
    check('a path outside the read is no-call', v({ name: wf, path: ['windowDays'], value: '45' }).status === 'no-call');
    check('a file not read in this run is no-call', v({ name: 'walkforward-other', path: ['x'], value: '1' }).status === 'no-call');
    check('a missing key is not-in-result', v({ name: wf, path: [...p, 'median'], value: '1' }).status === 'not-in-result');
    const big = { name: 'read_backtest_results', args: { name: 'big' }, isError: false, content: '<tool_data tool="read_backtest_results">\n[legend: none]\n[data]\n[overview: the whole file is ...]\n{"a": "<object with 2 keys: x, y>"}\n</tool_data>' };
    check('an overview does not count as the value being in the result', verifyDataRef({ name: 'big', path: ['a', 'x'], value: '1' }, [big], '1').status === 'not-in-result');
    check('-0.7 for stored -0.71 passes at one decimal, -0.8 does not', verifyDataRef({ name: wf, path: [...p, 'mean'], value: '-0.7' }, calls, 'x -0.7 y').status === 'ok' && verifyDataRef({ name: wf, path: [...p, 'mean'], value: '-0.8' }, calls, 'x -0.8 y').status === 'mismatch');

    const m = new FakeModel([
      { calls: [call('a', 'read_decision_log', {})] },
      { answer: ans('The gate: beat HODL in 2 regimes, set 10 Aug.', { citations: [{ chunkId: DECISION_LOG, quote: 'Gate: a strategy must beat HODL 50/50 in ≥ 2 market regimes.' }, { chunkId: chunk.id, quote: 'produkt live' }] }) },
    ]);
    const r = await runAgent(m, deps(), 'q');
    check('decision log quote verifies after read_decision_log', r.verification!.citations[0].status === 'ok', JSON.stringify(r.verification!.citations[0]));
    check('a chunk not returned in this run is unknown', r.verification!.citations[1].status === 'unknown-chunk');
    check('unbacked numbers: 2 is in the quote, 10 is not', JSON.stringify(r.verification!.unbackedNumbers) === '["10"]', JSON.stringify(r.verification!.unbackedNumbers));
    const m2 = new FakeModel([{ answer: ans('x', { citations: [{ chunkId: DECISION_LOG, quote: 'Backtesting before any deployment.' }] }) }]);
    check('decision log quote without reading it is unknown', (await runAgent(m2, deps(), 'q')).verification!.citations[0].status === 'unknown-chunk');
    check('unbackedNumbers ignores verified values', unbackedNumbers(ans('a 1.5 b 7'), [], [{ name: 'n', path: [], value: '1.5', status: 'ok' }]).join() === '7');
  }

  // 9. The Anthropic adapter: strict schemas, cache markers, tool_choice none only in the final turn, append-only
  //    history with the assistant content (thinking included) passed back unchanged.
  {
    const bodies: Anthropic.MessageCreateParamsNonStreaming[] = [];
    const responses: Array<Partial<Anthropic.Message>> = [
      { stop_reason: 'tool_use', content: [{ type: 'thinking', thinking: 'plan', signature: 'sig' } as unknown as Anthropic.ContentBlock, { type: 'tool_use', id: 'tu1', name: 'search_journal', input: { query: 'x' } } as Anthropic.ContentBlock] },
      { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(ans('A.')) } as Anthropic.ContentBlock] },
    ];
    let i = 0;
    const client: MessagesClient = {
      messages: {
        create: async (b) => {
          bodies.push(JSON.parse(JSON.stringify(b)));
          const r = responses[i++];
          return { ...r, usage: { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 500, cache_read_input_tokens: 2000 } } as Anthropic.Message;
        },
      },
    };
    const conv = new AnthropicAgentModel('sonnet', client).start('SYS', toolDefinitions(), AGENT_SCHEMA as unknown as Record<string, unknown>, 'Q?');
    const t1 = await conv.turnWithTools([]);
    const t2 = await conv.finalTurn([{ id: 'tu1', content: 'result', isError: false }], 'NOTE');
    const b0 = bodies[0] as unknown as Record<string, unknown> & { tools: Array<Record<string, unknown>>; system: Array<Record<string, unknown>> };
    check('tool turn returns the calls', t1.kind === 'tools' && t1.calls[0].name === 'search_journal');
    check('final turn returns the parsed answer', t2.kind === 'final' && t2.output?.answer === 'A.');
    check('strict tools without length limits', b0.tools.every((t) => t.strict === true) && !JSON.stringify(b0.tools).includes('maxLength') && !JSON.stringify(b0.tools).includes('maxItems'));
    check('cache marker on the system prompt and automatic tail caching', (b0.system[0].cache_control as { type: string }).type === 'ephemeral' && (b0.cache_control as { type: string }).type === 'ephemeral');
    check('adaptive thinking with summarized display', JSON.stringify(b0.thinking) === '{"type":"adaptive","display":"summarized"}');
    check('thinking summary returned as reasoning', t1.reasoning === 'plan');
    check('estimate after the cache lifetime is higher', conv.estimateNextUsd(0, 6 * 60_000) > conv.estimateNextUsd(0, 60_000));
    check('structured output and effort medium', JSON.stringify((b0.output_config as Record<string, unknown>).format).includes('dataRefs') && (b0.output_config as { effort: string }).effort === 'medium');
    check('no tool_choice in the tool turn, none in the final turn', !('tool_choice' in b0) && JSON.stringify((bodies[1] as unknown as Record<string, unknown>).tool_choice) === '{"type":"none"}');
    const msgs = bodies[1].messages as Array<{ role: string; content: unknown }>;
    check('history: question, assistant turn unchanged (thinking kept), then results and note', msgs.length === 3 && msgs[0].content === 'Q?' && JSON.stringify(msgs[1].content) === JSON.stringify(responses[0].content) && JSON.stringify(msgs[2].content) === JSON.stringify([{ type: 'tool_result', tool_use_id: 'tu1', content: 'result' }, { type: 'text', text: 'NOTE' }]));
    check('first request is a prefix of the second (append-only)', JSON.stringify(bodies[1].messages.slice(0, 1)) === JSON.stringify(bodies[0].messages));
    check('cost from usage at Sonnet prices', Math.abs(t1.costUsd - (1000 * 2 + 500 * 2.5 + 2000 * 0.2 + 100 * 10) / 1e6) < 1e-12, String(t1.costUsd));
    check('estimate assumes the history is cached', conv.estimateNextUsd(0) > 0 && conv.estimateNextUsd(10_000) > conv.estimateNextUsd(0));
    check('strictSchema drops numeric ranges and keeps the enum', JSON.stringify(strictSchema({ type: 'integer', minimum: 1, maximum: 9, description: 'd' })) === '{"type":"integer","description":"d"}');
    check('job tool schema sent without ranges', !JSON.stringify(strictSchema(toolDefinitions(true)[4].input_schema)).match(/minimum|maximum|maxLength/) && JSON.stringify(strictSchema(toolDefinitions(true)[4].input_schema)).includes('optimism-weth-usdc-030-365d'));
    check('strictSchema drops only length limits', JSON.stringify(strictSchema({ type: 'string', maxLength: 3, enum: ['a'] })) === '{"type":"string","enum":["a"]}');
  }

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
