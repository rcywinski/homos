/**
 * The agent on a local model through Ollama (step 3.5): an `AgentModel` for Ollama's `/api/chat` tool calling. The
 * loop (run.ts) and the tools are unchanged; what Ollama does not offer, or does differently, is handled here:
 *
 * - Tool call ids: Ollama returns none, so ids are made here and replies go back in the same order as `role: "tool"`
 *   messages with the tool name.
 * - The final turn: Ollama has no `tool_choice`, so the final turn is a request without `tools` and with the answer
 *   schema as `format`. In a turn with tools, `format` is sent too only when `formatWithTools` is set (Ollama does not
 *   document the combination; decided by a probe before the runs). A tool turn that answers in text without calling a
 *   tool is followed at once by a final request, inside the same turn, and counted.
 * - Thinking off (owner, 16 Nov 2026); no prompt cache to price, so the cost is 0 and the spend estimate is 0.
 * - Context: Ollama truncates an over-long prompt silently, so before every call the prompt is counted with the
 *   model's own tokenizer plus a template overhead calibrated once on a cold call, with a 5% margin. When the history
 *   does not fit `num_ctx - num_predict`, the oldest tool results are compacted on demand: replaced by a one-line stub,
 *   newest round never, until it fits. When it still does not fit, the turn ends the task loudly as a final turn with
 *   no answer and the error "context-limit" (the loop records "no-answer" with that error). After a call, a server
 *   prompt count above the estimate stops the run (the estimate was wrong); a lower one is expected with llama.cpp's
 *   prompt cache.
 * - A repeated call after compaction: the loop refuses an identical call with "its result is above", which is false
 *   once that result was compacted. The conversation then restores the full result in place of the refusal (marked as
 *   restored), compacting older results to make room; if it cannot fit, the refusal is replaced by an honest note that
 *   the result cannot be shown again. Both cases are counted, so a stuck model is not mistaken for a weak one.
 *
 * The verifier always uses the full results the loop recorded, so citations and dataRefs to a compacted result still
 * verify. Per-task counts are in `lastStats` after a conversation.
 */
import { loadTokenCounter } from '../answer/local';
import { parseAgentAnswer, type AgentConversation, type AgentModel, type ToolReply, type Turn } from './model';
import type { ToolDefinition } from './tools';

export interface OllamaAgentOptions {
  baseUrl: string;
  model: string;
  tokenizerDir: string;
  numCtx: number;
  numPredict: number;
  sampling: { temperature: number; top_p: number; top_k: number; min_p: number; presence_penalty: number; repeat_penalty: number };
  keepAlive: string;
  /** Send the answer schema as `format` also in turns that offer tools (only if a probe shows Ollama honours both). */
  formatWithTools?: boolean;
  /** Name of the variant, recorded in the model name (e.g. "QA-cl"). */
  variant: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  countTokens?: (text: string) => number;
}

export interface OllamaConversationStats {
  /** Tool results replaced by a stub to make the history fit. */
  compacted: number;
  /** Repeated calls answered by restoring a compacted result. */
  restored: number;
  /** Repeated calls of a compacted result that could not be restored within the context limit. */
  restoreRefused: number;
  /** Repeated calls whose result was never compacted (a genuine repeat). */
  plainRepeats: number;
  /** Tool turns in which the model answered in text instead of calling a tool or giving the JSON answer. */
  textInsteadOfTools: number;
  /** Final answers that did not parse against the answer schema. */
  schemaFailures: number;
  /** The task ended because even the compacted history did not fit. */
  contextLimit: boolean;
  /** Largest estimated prompt (tokens, with the calibrated overhead) and largest server-reported prompt. */
  maxPromptEstimate: number;
  maxPromptServer: number;
  calls: number;
}

interface Msg {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{ function: { name: string; arguments: unknown } }>;
  tool_name?: string;
  /** Local bookkeeping, never sent. */
  meta?: { key: string; full: string; round: number; compacted: boolean; restored?: boolean; name: string; args: unknown };
}

interface ChatResponse {
  message?: { content?: string; tool_calls?: Array<{ function: { name: string; arguments: unknown } }>; thinking?: string };
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

const MARGIN = 1.05;
const PER_MESSAGE = 8;
const REPEAT_PREFIX = 'repeated call:';

export const stubFor = (name: string, args: unknown, chars: number) =>
  `[earlier result of ${name} ${JSON.stringify(args)}: removed from the conversation to save space (${chars} characters). It was read in this run, so you may still cite it. If you need its content again, call the tool with the same arguments and it is shown again.]`;
export const RESTORED_NOTE = '[shown again: this result had been removed from the conversation to save space]\n';
export const CANNOT_RESTORE =
  'This result was removed from the conversation to save space and cannot be shown again within the context limit. It was read in this run, so you may still cite it; answer from what you have.';

const canonical = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (typeof v === 'object' && v !== null) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
};

export class OllamaAgentModel implements AgentModel {
  readonly name: string;
  readonly count: (text: string) => number;
  /** Template and tool-definition overhead in tokens, calibrated once on a cold call. */
  overhead: number | null = null;
  lastStats: OllamaConversationStats | null = null;

  constructor(readonly o: OllamaAgentOptions) {
    this.name = `agent:ollama:${o.model}(variant=${o.variant},think=false,num_ctx=${o.numCtx},num_predict=${o.numPredict},compaction=on-demand)`;
    this.count = o.countTokens ?? loadTokenCounter(o.tokenizerDir);
  }

  settings() {
    const { fetchFn: _f, countTokens: _c, ...rest } = this.o;
    return { ...rest, think: false, compaction: 'on demand, oldest tool results first, newest round kept', overhead: this.overhead, margin: MARGIN };
  }

  get fetchFn() {
    return this.o.fetchFn ?? fetch;
  }

  async chat(body: Record<string, unknown>): Promise<{ r: ChatResponse; ms: number }> {
    const t0 = Date.now();
    const res = await this.fetchFn(`${this.o.baseUrl.replace(/\/$/, '')}/api/chat`, { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(this.o.timeoutMs ?? 600_000) });
    if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
    return { r: (await res.json()) as ChatResponse, ms: Date.now() - t0 };
  }

  ollamaTools(tools: ToolDefinition[]) {
    return tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  }

  /**
   * Measures the overhead the server adds to our token count (chat template, tool definitions as rendered): one call
   * with the system prompt, the tools and a short question, made right after the model is loaded so no prompt cache
   * can lower the count. Returns the overhead.
   */
  async calibrate(system: string, tools: ToolDefinition[]): Promise<number> {
    const question = 'Calibration call: reply with one word.';
    const { r } = await this.chat({ model: this.o.model, stream: false, think: false, keep_alive: this.o.keepAlive, tools: this.ollamaTools(tools), messages: [{ role: 'system', content: system }, { role: 'user', content: question }], options: { num_ctx: this.o.numCtx, num_predict: 1 } });
    const ours = this.count(system) + this.count(JSON.stringify(tools)) + this.count(question) + 2 * PER_MESSAGE;
    const server = r.prompt_eval_count ?? -1;
    if (server <= 0) throw new Error('calibration: no prompt_eval_count from the server');
    this.overhead = Math.max(0, server - ours);
    return this.overhead;
  }

  start(system: string, tools: ToolDefinition[], schema: Record<string, unknown>, question: string): AgentConversation {
    if (this.overhead === null) throw new Error('OllamaAgentModel: calibrate() before the first conversation');
    const conv = new OllamaConversation(this, system, tools, schema, question);
    this.lastStats = conv.stats;
    return conv;
  }
}

class OllamaConversation implements AgentConversation {
  readonly stats: OllamaConversationStats = { compacted: 0, restored: 0, restoreRefused: 0, plainRepeats: 0, textInsteadOfTools: 0, schemaFailures: 0, contextLimit: false, maxPromptEstimate: 0, maxPromptServer: 0, calls: 0 };
  private readonly messages: Msg[];
  private readonly toolsTokens: number;
  private readonly ollamaTools: unknown[];
  /** Tool calls of the last assistant turn, by the id given to the loop. */
  private pending = new Map<string, { name: string; args: unknown; key: string }>();
  /** The first full result of every call key, by key. */
  private originals = new Map<string, Msg>();
  private round = 0;
  private nextId = 0;

  constructor(
    private readonly m: OllamaAgentModel,
    system: string,
    tools: ToolDefinition[],
    private readonly schema: Record<string, unknown>,
    question: string,
  ) {
    this.messages = [
      { role: 'system', content: system },
      { role: 'user', content: question },
    ];
    this.ollamaTools = m.ollamaTools(tools);
    this.toolsTokens = m.count(JSON.stringify(tools));
  }

  estimateNextUsd(): number {
    return 0;
  }

  turnWithTools(replies: ToolReply[]): Promise<Turn> {
    this.addReplies(replies, null);
    return this.turn(false);
  }

  finalTurn(replies: ToolReply[], note: string): Promise<Turn> {
    this.addReplies(replies, note);
    return this.turn(true);
  }

  private addReplies(replies: ToolReply[], note: string | null) {
    if (replies.length) this.round++;
    for (const r of replies) {
      const p = this.pending.get(r.id);
      if (!p) throw new Error(`reply to an unknown tool call id ${r.id}`);
      let content = r.content;
      let restored = false;
      if (r.isError && r.content.startsWith(REPEAT_PREFIX)) {
        const orig = this.originals.get(p.key);
        if (orig?.meta?.compacted) {
          content = RESTORED_NOTE + orig.meta.full;
          restored = true;
          this.stats.restored++;
        } else this.stats.plainRepeats++;
      }
      const msg: Msg = { role: 'tool', tool_name: p.name, content, meta: { key: p.key, full: content, round: this.round, compacted: false, restored, name: p.name, args: p.args } };
      this.messages.push(msg);
      if (!r.isError && !this.originals.has(p.key)) this.originals.set(p.key, msg);
    }
    this.pending.clear();
    if (note) this.messages.push({ role: 'user', content: note });
  }

  private tokens(msg: Msg): number {
    return this.m.count(msg.content) + (msg.tool_calls ? this.m.count(JSON.stringify(msg.tool_calls)) : 0) + PER_MESSAGE;
  }

  private estimate(final: boolean): number {
    // A final turn sends no tool definitions.
    return (this.m.overhead ?? 0) + (final ? 0 : this.toolsTokens) + this.messages.reduce((s, x) => s + this.tokens(x), 0);
  }

  /** Compacts the oldest tool results (never the newest round) until the prompt fits; false when it cannot. */
  private fit(final: boolean): boolean {
    const limit = this.m.o.numCtx - this.m.o.numPredict;
    const fits = () => this.estimate(final) * MARGIN <= limit;
    while (!fits()) {
      const victim = this.messages.find((x) => x.meta && !x.meta.compacted && x.meta.round < this.round);
      if (victim?.meta) {
        victim.content = stubFor(victim.meta.name, victim.meta.args, victim.meta.full.length);
        victim.meta.compacted = true;
        this.stats.compacted++;
        continue;
      }
      // Nothing older left: a result restored in the newest round gives way to the honest note.
      const restored = this.messages.find((x) => x.meta?.restored && x.meta.round === this.round && x.content !== CANNOT_RESTORE);
      if (restored) {
        restored.content = CANNOT_RESTORE;
        this.stats.restored--;
        this.stats.restoreRefused++;
        continue;
      }
      return false;
    }
    return true;
  }

  private body(final: boolean) {
    return {
      model: this.m.o.model,
      stream: false,
      think: false,
      keep_alive: this.m.o.keepAlive,
      messages: this.messages.map(({ meta: _m, ...x }) => x),
      ...(final ? {} : { tools: this.ollamaTools }),
      ...(final || this.m.o.formatWithTools ? { format: this.schema } : {}),
      options: { num_ctx: this.m.o.numCtx, num_predict: this.m.o.numPredict, ...this.m.o.sampling },
    };
  }

  private async turn(final: boolean): Promise<Turn> {
    const empty = { usage: { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }, costUsd: 0, ms: 0, text: '', reasoning: '', reasoningTokens: null };
    if (!this.fit(final)) {
      this.stats.contextLimit = true;
      return { ...empty, stopReason: 'context-limit', kind: 'final', output: null, error: `context-limit: the prompt does not fit num_ctx ${this.m.o.numCtx} minus num_predict ${this.m.o.numPredict} even with every older result compacted` };
    }
    const est = Math.ceil(this.estimate(final) * MARGIN);
    const { r, ms } = await this.m.chat(this.body(final));
    this.stats.calls++;
    const server = r.prompt_eval_count ?? 0;
    this.stats.maxPromptEstimate = Math.max(this.stats.maxPromptEstimate, est);
    this.stats.maxPromptServer = Math.max(this.stats.maxPromptServer, server);
    if (server > est) throw new Error(`prompt larger than estimated: server ${server} tokens, estimate with margin ${est}; stopping (a silent truncation could follow)`);
    const base = { usage: { input: server, cacheWrite: 0, cacheRead: 0, output: r.eval_count ?? 0 }, costUsd: 0, ms, stopReason: r.done_reason ?? '', text: '', reasoning: '', reasoningTokens: null };
    const content = r.message?.content ?? '';
    const calls = r.message?.tool_calls ?? [];
    if (!final && calls.length) {
      this.messages.push({ role: 'assistant', content, tool_calls: calls });
      const out = calls.map((c) => {
        const id = `ollama_${++this.nextId}`;
        this.pending.set(id, { name: c.function.name, args: c.function.arguments, key: `${c.function.name} ${canonical(c.function.arguments)}` });
        return { id, name: c.function.name, args: c.function.arguments };
      });
      return { ...base, text: content, kind: 'tools', calls: out };
    }
    if (r.done_reason === 'length') return { ...base, text: content, kind: 'final', output: null, error: 'num_predict reached' };
    const output = parseAgentAnswer(content);
    if (output) return { ...base, kind: 'final', output };
    if (!final) {
      // Text instead of a tool call or the JSON answer: ask for the answer at once, in the same turn.
      this.stats.textInsteadOfTools++;
      this.messages.push({ role: 'assistant', content });
      this.messages.push({ role: 'user', content: 'Give your final answer now, as JSON in the required format.' });
      const t = await this.turn(true);
      return { ...t, usage: { input: base.usage.input + t.usage.input, cacheWrite: 0, cacheRead: 0, output: base.usage.output + t.usage.output }, ms: ms + t.ms };
    }
    this.stats.schemaFailures++;
    return { ...base, text: content, kind: 'final', output: null, error: 'unparsable final answer' };
  }
}
