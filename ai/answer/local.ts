/**
 * LocalGenerator (step 1.11): the same system prompt, user prompt and JSON schema as ClaudeGenerator, sent to a model
 * in Ollama on the inference box (`/api/chat`, `format` = the answer schema, non-streaming). No prompt tuning for the
 * local model.
 *
 * Ollama truncates an over-long prompt silently, so every call is checked twice:
 *   - before: the prompt length from the model's own tokenizer plus `num_predict` must fit `num_ctx`;
 *   - after: the prompt tokens the server reports (`prompt_eval_count`) must equal the expected count (system + user
 *     + the chat-template overhead, measured once on the first call and fixed after that), within `tolerance`.
 * Any mismatch throws: a run never continues on a prompt the model did not fully see.
 *
 * A structured output that does not parse or does not match the schema counts as invalid; one retry, then the answer
 * is recorded as invalid. The thinking text (thinking mode only) is returned for the result file, never as answer.
 */
import { readFileSync } from 'fs';
import { Tokenizer } from '@huggingface/tokenizers';
import type { Chunk } from '../corpus/types';
import { ANSWER_SCHEMA, ANSWER_SYSTEM, answerUserPrompt } from './prompt';
import type { Coverage, GeneratedAnswer, Generator, GeneratorResult, LocalCallStats } from './types';

export interface LocalGenOptions {
  baseUrl: string;
  model: string;
  /** Tokenizer files (tokenizer.json, tokenizer_config.json) of the same model, from its Hugging Face repo. */
  tokenizerDir: string;
  think: boolean;
  numCtx: number;
  numPredict: number;
  /** Sampling settings from the model card for the chosen mode; sent as Ollama options and recorded. */
  sampling: { temperature: number; top_p: number; top_k: number; min_p: number; presence_penalty: number; repeat_penalty: number };
  keepAlive: string;
  /** Allowed difference between expected and server prompt tokens after calibration. */
  tolerance?: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  /**
   * Calls that got no response at all, repeated while the model is still loaded. The owner's rule for step 1.11
   * (11 Nov 2026): 0, so the run stops at the first transport failure. Default 0.
   */
  maxNetworkRetries?: number;
  /** For tests: a token counter instead of the tokenizer files. */
  countTokens?: (text: string) => number;
}

interface OllamaChatResponse {
  message?: { content?: string; thinking?: string };
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export function loadTokenCounter(dir: string): (text: string) => number {
  const tok = new Tokenizer(JSON.parse(readFileSync(`${dir}/tokenizer.json`, 'utf8')), JSON.parse(readFileSync(`${dir}/tokenizer_config.json`, 'utf8')));
  return (text: string) => tok.encode(text, { add_special_tokens: false }).ids.length;
}

const COVERAGE: Coverage[] = ['full', 'partial', 'none'];

/** The parsed object if it matches ANSWER_SCHEMA exactly (no extra keys), else null. */
export function parseAnswer(raw: string): GeneratedAnswer | null {
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const a = o as Record<string, unknown>;
  if (Object.keys(a).some((k) => !['answer', 'coverage', 'citations'].includes(k))) return null;
  if (typeof a.answer !== 'string' || !COVERAGE.includes(a.coverage as Coverage) || !Array.isArray(a.citations)) return null;
  for (const c of a.citations as unknown[]) {
    if (!c || typeof c !== 'object') return null;
    const r = c as Record<string, unknown>;
    if (Object.keys(r).some((k) => k !== 'chunkId' && k !== 'quote') || typeof r.chunkId !== 'string' || typeof r.quote !== 'string') return null;
  }
  return a as unknown as GeneratedAnswer;
}

export class LocalGenerator implements Generator {
  readonly name: string;
  private readonly fetchFn: typeof fetch;
  private readonly count: (text: string) => number;
  /** Chat-template overhead in tokens, measured on the first call. */
  templateOverhead: number | null = null;

  constructor(private readonly o: LocalGenOptions) {
    this.name = `answer:ollama:${o.model}(think=${o.think},num_ctx=${o.numCtx},num_predict=${o.numPredict},temperature=${o.sampling.temperature})`;
    this.fetchFn = o.fetchFn ?? fetch;
    this.count = o.countTokens ?? loadTokenCounter(o.tokenizerDir);
  }

  /** Every setting that shapes the output, for the result file. */
  settings() {
    const { baseUrl: _b, fetchFn: _f, countTokens: _c, tokenizerDir, ...rest } = this.o;
    return { ...rest, tokenizer: tokenizerDir, format: 'ANSWER_SCHEMA (ai/answer/prompt.ts)', stream: false, seed: 'not set' };
  }

  private async chat(user: string): Promise<{ r: OllamaChatResponse; ms: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.o.timeoutMs ?? 600_000);
    const t0 = Date.now();
    try {
      const res = await this.fetchFn(`${this.o.baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.o.model,
          messages: [
            { role: 'system', content: ANSWER_SYSTEM },
            { role: 'user', content: user },
          ],
          format: ANSWER_SCHEMA,
          think: this.o.think,
          stream: false,
          keep_alive: this.o.keepAlive,
          options: { num_ctx: this.o.numCtx, num_predict: this.o.numPredict, ...this.o.sampling },
        }),
      });
      if (!res.ok) throw new Error(`ollama /api/chat ${res.status}: ${await res.text()}`);
      return { r: (await res.json()) as OllamaChatResponse, ms: Date.now() - t0 };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Expected prompt tokens without the template overhead, and the pre-call fit check. */
  promptTokens(question: string, chunks: Chunk[]): { user: string; bare: number } {
    const user = answerUserPrompt(question, chunks);
    const bare = this.count(ANSWER_SYSTEM) + this.count(user);
    const overhead = this.templateOverhead ?? 0;
    if (bare + overhead + this.o.numPredict > this.o.numCtx)
      throw new Error(`prompt does not fit: ${bare + overhead} prompt tokens + num_predict ${this.o.numPredict} > num_ctx ${this.o.numCtx}`);
    return { user, bare };
  }

  private checkServerCount(bare: number, server: number): number {
    if (this.templateOverhead === null) {
      const overhead = server - bare;
      if (overhead < 0 || overhead > 64) throw new Error(`prompt token count: server ${server}, tokenizer ${bare}: overhead ${overhead} is not a chat template`);
      this.templateOverhead = overhead;
    }
    const expected = bare + this.templateOverhead;
    if (Math.abs(server - expected) > (this.o.tolerance ?? 2))
      throw new Error(`prompt token mismatch: server evaluated ${server}, expected ${expected} (tokenizer ${bare} + template ${this.templateOverhead}); truncation or prompt caching`);
    return expected;
  }

  async generate(question: string, chunks: Chunk[]): Promise<GeneratorResult> {
    const { user, bare } = this.promptTokens(question, chunks);
    let invalid = 0;
    let network = 0;
    let ms = 0;
    let last: OllamaChatResponse = {};
    let expected = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      let call: { r: OllamaChatResponse; ms: number } | null = null;
      while (!call) {
        try {
          call = await this.chat(user);
        } catch (e) {
          // A transport failure (no response) is repeated at most twice per answer, counted apart from invalid outputs,
          // and only while the model is still loaded on the box. On 11 Nov 2026 the box lost power under load; a retry
          // after its reboot would have loaded the model again, and did. So: box unreachable or model gone = stop.
          if (!(e instanceof TypeError) || network >= (this.o.maxNetworkRetries ?? 0)) throw e;
          const loaded = await ollamaPs(this.o.baseUrl, this.fetchFn).catch(() => null);
          if (!loaded) throw new Error(`inference box unreachable after a failed call; not retrying (${e.message})`);
          if (!loaded.some((m) => m.name === this.o.model)) throw new Error(`${this.o.model} is no longer loaded (box or Ollama restarted?); not reloading it`);
          network++;
        }
      }
      const { r, ms: callMs } = call;
      ms += callMs;
      last = r;
      expected = this.checkServerCount(bare, r.prompt_eval_count ?? -1);
      const out = r.done_reason === 'length' ? null : parseAnswer(r.message?.content ?? '');
      if (out) return this.result(out, r, ms, expected, invalid, attempt > 0, network);
      invalid++;
    }
    return { ...this.result(null, last, ms, expected, invalid, true, network), error: last.done_reason === 'length' ? 'num_predict reached' : 'invalid structured output' };
  }

  private result(output: GeneratedAnswer | null, r: OllamaChatResponse, ms: number, expected: number, invalid: number, retried: boolean, network: number): GeneratorResult {
    const thinking = r.message?.thinking ?? '';
    const local: LocalCallStats = {
      promptTokensExpected: expected,
      promptTokensServer: r.prompt_eval_count ?? -1,
      evalTokens: r.eval_count ?? 0,
      tokensPerSecond: r.eval_count && r.eval_duration ? Number(((r.eval_count * 1e9) / r.eval_duration).toFixed(1)) : 0,
      thinkingTokens: thinking ? this.count(thinking) : 0,
      ...(thinking ? { thinking } : {}),
      invalidOutputs: invalid,
      networkRetries: network,
      retried,
      doneReason: r.done_reason ?? '',
    };
    return { output, usage: { input: r.prompt_eval_count ?? 0, cacheWrite: 0, cacheRead: 0, output: r.eval_count ?? 0 }, costUsd: 0, ms, local };
  }
}

/** Models loaded in Ollama with their VRAM share (`/api/ps`). */
export async function ollamaPs(baseUrl: string, fetchFn: typeof fetch = fetch) {
  const res = await fetchFn(`${baseUrl.replace(/\/$/, '')}/api/ps`);
  const j = (await res.json()) as { models: Array<{ name: string; size: number; size_vram: number; context_length?: number }> };
  return j.models;
}

/** Unloads a model now (keep_alive 0) and waits until /api/ps no longer lists it (it lags by a few seconds). */
export async function ollamaUnload(baseUrl: string, model: string, fetchFn: typeof fetch = fetch, waitMs = 15_000) {
  const res = await fetchFn(`${baseUrl.replace(/\/$/, '')}/api/generate`, { method: 'POST', body: JSON.stringify({ model, keep_alive: 0 }) });
  if (!res.ok) throw new Error(`unload ${model}: ${res.status}`);
  const name = model.includes(':') ? model : `${model}:latest`;
  for (let t = 0; t < waitMs; t += 500) {
    if (!(await ollamaPs(baseUrl, fetchFn)).some((m) => m.name === name)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${model} still loaded ${waitMs / 1000} s after unload`);
}
