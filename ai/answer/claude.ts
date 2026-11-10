/**
 * ClaudeGenerator (step 1.8): one Messages API call per question with structured output (JSON schema), parsed by the
 * SDK. Generator is Sonnet 5.5; Opus 5.5 is kept for the 1.9 judge, so the judge is a different, stronger model.
 */
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import type { Chunk } from '../corpus/types';
import { MODELS, usd, type ModelKey } from '../context/pricing';
import type { TokenUsage } from '../context/types';
import { ANSWER_SCHEMA, ANSWER_SYSTEM, answerUserPrompt } from './prompt';
import type { GeneratedAnswer, Generator, GeneratorResult } from './types';

export const ANSWER_EFFORT = 'medium' as const;

export class ClaudeGenerator implements Generator {
  readonly name: string;
  private readonly client: Anthropic;

  constructor(
    private readonly key: ModelKey = 'sonnet',
    client?: Anthropic,
  ) {
    this.name = `answer:${MODELS[key].id}(effort=${ANSWER_EFFORT})`;
    this.client = client ?? new Anthropic({ maxRetries: 4 });
  }

  async generate(question: string, chunks: Chunk[]): Promise<GeneratorResult> {
    const t0 = Date.now();
    const res = await this.client.messages.parse({
      model: MODELS[this.key].id,
      max_tokens: 8000,
      output_config: { effort: ANSWER_EFFORT, format: jsonSchemaOutputFormat(ANSWER_SCHEMA) },
      system: ANSWER_SYSTEM,
      messages: [{ role: 'user', content: answerUserPrompt(question, chunks) }],
    });
    const usage: TokenUsage = {
      input: res.usage.input_tokens,
      cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
      output: res.usage.output_tokens,
    };
    const base = { usage, costUsd: usd(usage, MODELS[this.key].price), ms: Date.now() - t0 };
    if (res.stop_reason === 'refusal') return { ...base, output: null, error: 'refusal' };
    if (res.stop_reason === 'max_tokens') return { ...base, output: null, error: 'max_tokens' };
    const out = res.parsed_output as GeneratedAnswer | null;
    if (!out) return { ...base, output: null, error: 'unparsed output' };
    return { ...base, output: out };
  }
}
