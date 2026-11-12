/**
 * The model behind the agent (step 2.2). The loop (run.ts) knows only this interface: start a conversation, ask for
 * "a turn with tools" or "a final turn without tools", and get either tool calls or a final answer back, with usage
 * and cost. Everything specific to one provider stays in its implementation: for the Anthropic API below that is the
 * content-block history (thinking blocks passed back unchanged), tool_choice "none" for the final turn, strict tool
 * schemas, structured output and cache markers. A local model through Ollama can implement the same interface.
 */
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, usd, type ModelKey } from '../context/pricing';
import type { TokenUsage } from '../context/types';
import type { ToolDefinition } from './tools';

export interface AgentCitation {
  chunkId: string;
  quote: string;
}

export interface DataRef {
  name: string;
  path: string[];
  value: string;
}

export interface AgentAnswer {
  answer: string;
  coverage: 'full' | 'partial' | 'none';
  citations: AgentCitation[];
  dataRefs: DataRef[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface ToolReply {
  id: string;
  content: string;
  isError: boolean;
}

interface TurnBase {
  usage: TokenUsage;
  costUsd: number;
  ms: number;
  /** Provider's stop reason, for the log. */
  stopReason: string;
  /** Visible text the model wrote in this turn besides tool calls or the answer (may be empty). */
  text: string;
}

export type Turn = TurnBase & ({ kind: 'tools'; calls: ToolCall[] } | { kind: 'final'; output: AgentAnswer | null; error?: string });

export interface AgentConversation {
  /** A turn in which the model may call tools or answer. `replies` answer every tool call of the previous turn. */
  turnWithTools(replies: ToolReply[]): Promise<Turn>;
  /** A turn that must be the final answer: no tool call is possible. `note` tells the model why. */
  finalTurn(replies: ToolReply[], note: string): Promise<Turn>;
  /**
   * Estimated upper cost of the next turn, USD, when `replyChars` characters of tool results are added. Assumes the
   * history so far is read from the provider's cache; the spend is checked against actual costs after every turn.
   */
  estimateNextUsd(replyChars: number): number;
}

export interface AgentModel {
  readonly name: string;
  settings(): Record<string, unknown>;
  start(system: string, tools: ToolDefinition[], schema: Record<string, unknown>, question: string): AgentConversation;
}

export const AGENT_EFFORT = 'medium' as const;
export const AGENT_MAX_TOKENS = 8000;

/** Strict tool schemas do not take string or array length limits: drop them (tools.ts validates them anyway). */
export function strictSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(strictSchema);
  if (typeof s !== 'object' || s === null) return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) if (!['minLength', 'maxLength', 'minItems', 'maxItems'].includes(k)) out[k] = strictSchema(v);
  return out;
}

export function parseAgentAnswer(text: string): AgentAnswer | null {
  try {
    const o = JSON.parse(text) as AgentAnswer;
    const ok =
      typeof o.answer === 'string' &&
      ['full', 'partial', 'none'].includes(o.coverage) &&
      Array.isArray(o.citations) &&
      o.citations.every((c) => typeof c.chunkId === 'string' && typeof c.quote === 'string') &&
      Array.isArray(o.dataRefs) &&
      o.dataRefs.every((d) => typeof d.name === 'string' && Array.isArray(d.path) && d.path.every((p) => typeof p === 'string') && typeof d.value === 'string');
    return ok ? o : null;
  } catch {
    return null;
  }
}

/** Minimal client surface used here, so tests can pass a fake. */
export interface MessagesClient {
  messages: { create(body: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> };
}

export class AnthropicAgentModel implements AgentModel {
  readonly name: string;
  private readonly client: MessagesClient;

  constructor(
    private readonly key: ModelKey = 'sonnet',
    client?: MessagesClient,
  ) {
    this.name = `agent:${MODELS[key].id}(effort=${AGENT_EFFORT})`;
    this.client = client ?? new Anthropic({ maxRetries: 4 });
  }

  settings() {
    return { model: MODELS[this.key].id, effort: AGENT_EFFORT, maxTokens: AGENT_MAX_TOKENS, thinking: 'adaptive (model default)', strictTools: true, cache: 'system marker + automatic tail' };
  }

  start(system: string, tools: ToolDefinition[], schema: Record<string, unknown>, question: string): AgentConversation {
    return new AnthropicConversation(this.client, this.key, system, tools, schema, question);
  }
}

class AnthropicConversation implements AgentConversation {
  private readonly messages: Anthropic.MessageParam[];
  private readonly tools: Anthropic.Tool[];
  private lastPromptTokens = 0;
  private lastOutputTokens = 0;
  private readonly firstPromptChars: number;

  constructor(
    private readonly client: MessagesClient,
    private readonly key: ModelKey,
    private readonly system: string,
    tools: ToolDefinition[],
    private readonly schema: Record<string, unknown>,
    question: string,
  ) {
    this.messages = [{ role: 'user', content: question }];
    this.tools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: strictSchema(t.input_schema) as Anthropic.Tool.InputSchema, strict: true }));
    this.firstPromptChars = system.length + JSON.stringify(this.tools).length + JSON.stringify(schema).length + question.length;
  }

  turnWithTools(replies: ToolReply[]): Promise<Turn> {
    this.addReplies(replies, null);
    return this.call(false);
  }

  finalTurn(replies: ToolReply[], note: string): Promise<Turn> {
    this.addReplies(replies, note);
    return this.call(true);
  }

  estimateNextUsd(replyChars: number): number {
    const p = MODELS[this.key].price;
    // About 1 token per 2 characters for Polish and JSON (an overestimate for English).
    const fresh = this.lastPromptTokens === 0 ? this.firstPromptChars / 2 : this.lastOutputTokens + replyChars / 2;
    return (this.lastPromptTokens * p.cacheRead + fresh * p.cacheWrite + AGENT_MAX_TOKENS * p.output) / 1e6;
  }

  /** Tool results go back in one user message; a final-turn note is a text block after them. History is append-only. */
  private addReplies(replies: ToolReply[], note: string | null) {
    const blocks: Anthropic.ContentBlockParam[] = replies.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.content, ...(r.isError ? { is_error: true } : {}) }));
    if (note) blocks.push({ type: 'text', text: note });
    if (blocks.length === 0) return;
    const last = this.messages[this.messages.length - 1];
    if (last.role === 'user' && replies.length === 0 && typeof last.content === 'string') {
      this.messages[this.messages.length - 1] = { role: 'user', content: [{ type: 'text', text: last.content }, ...blocks] };
    } else {
      this.messages.push({ role: 'user', content: blocks });
    }
  }

  private async call(final: boolean): Promise<Turn> {
    const t0 = Date.now();
    const res = await this.client.messages.create({
      model: MODELS[this.key].id,
      max_tokens: AGENT_MAX_TOKENS,
      system: [{ type: 'text', text: this.system, cache_control: { type: 'ephemeral' } }],
      tools: this.tools,
      ...(final ? { tool_choice: { type: 'none' as const } } : {}),
      messages: this.messages,
      output_config: { effort: AGENT_EFFORT, format: { type: 'json_schema', schema: this.schema } },
      cache_control: { type: 'ephemeral' },
    });
    // The assistant turn goes back exactly as returned, thinking blocks included.
    this.messages.push({ role: 'assistant', content: res.content as unknown as Anthropic.ContentBlockParam[] });
    const usage: TokenUsage = {
      input: res.usage.input_tokens,
      cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
      output: res.usage.output_tokens,
    };
    this.lastPromptTokens = usage.input + usage.cacheWrite + usage.cacheRead;
    this.lastOutputTokens = usage.output;
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
    const base = { usage, costUsd: usd(usage, MODELS[this.key].price), ms: Date.now() - t0, stopReason: String(res.stop_reason) };
    const calls = res.content.flatMap((b) => (b.type === 'tool_use' ? [{ id: b.id, name: b.name, args: b.input }] : []));
    if (res.stop_reason === 'tool_use' && calls.length) return { ...base, text, kind: 'tools', calls };
    if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') return { ...base, text, kind: 'final', output: null, error: String(res.stop_reason) };
    const output = parseAgentAnswer(text);
    return output ? { ...base, text: '', kind: 'final', output } : { ...base, text, kind: 'final', output: null, error: 'unparsable final answer' };
  }
}
