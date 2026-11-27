/**
 * Step 6.12: the guest path as a Generator, for runs on saved chunk lists from the Mac. It sends exactly the request
 * the public server hands to a visitor's browser (`guestRequestBody` of ai/serve/guest.ts: Sonnet 5.5, effort medium,
 * 2 048 output tokens, the measured answer schema, the step 1.8 system prompt) and parses the reply with the server's
 * own `parseGuestAnswer`. The caller passes the chunks masked (`maskChunk`), as the server does, and verifies the
 * citations against those masked chunks, as `checkGuestAnswer` does. No retry: a failed call stays failed, as in
 * the 4.6e guest-key run.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Chunk } from '../corpus/types';
import { MODELS, usd } from '../context/pricing';
import type { TokenUsage } from '../context/types';
import { GUEST_EFFORT, GUEST_MAX_TOKENS, GUEST_MODEL, guestRequestBody, parseGuestAnswer } from '../serve/guest';
import type { Generator, GeneratorResult } from './types';

export class GuestGenerator implements Generator {
  readonly name = `answer:guest:${GUEST_MODEL}(effort=${GUEST_EFFORT},max_tokens=${GUEST_MAX_TOKENS},guestRequestBody)`;
  private readonly client: Anthropic;

  constructor(client?: Anthropic) {
    if (MODELS.sonnet.id !== GUEST_MODEL) throw new Error(`pricing has ${MODELS.sonnet.id}, the guest path uses ${GUEST_MODEL}`);
    this.client = client ?? new Anthropic({ maxRetries: 0 });
  }

  async generate(question: string, chunks: Chunk[]): Promise<GeneratorResult> {
    const t0 = Date.now();
    const res = await this.client.messages.create(guestRequestBody(question, chunks) as unknown as Anthropic.MessageCreateParamsNonStreaming);
    const usage: TokenUsage = {
      input: res.usage.input_tokens,
      cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
      output: res.usage.output_tokens,
    };
    const base = { usage, costUsd: usd(usage, MODELS.sonnet.price), ms: Date.now() - t0 };
    if (res.stop_reason === 'refusal') return { ...base, output: null, error: 'refusal' };
    if (res.stop_reason === 'max_tokens') return { ...base, output: null, error: 'max_tokens' };
    const text = res.content.find((b) => b.type === 'text');
    let parsed: unknown = null;
    try {
      parsed = text && text.type === 'text' ? JSON.parse(text.text) : null;
    } catch {
      parsed = null;
    }
    const out = parseGuestAnswer(parsed);
    return out ? { ...base, output: out } : { ...base, output: null, error: 'invalid guest answer' };
  }
}
