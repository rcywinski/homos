/**
 * ClaudeJudge (step 1.9): Opus 5.5, a different and stronger model than the Sonnet 5.5 generator. One call per
 * answer, structured output parsed by the SDK. Opus 5.5 always thinks; effort is the only control.
 */
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { MODELS, usd } from '../context/pricing';
import type { TokenUsage } from '../context/types';
import { JUDGE_SCHEMA, JUDGE_SYSTEM, judgeUserPrompt } from './prompt';
import type { Judge, JudgeInput, JudgeResult, Verdict } from './types';

export const JUDGE_EFFORT = 'medium' as const;

export class ClaudeJudge implements Judge {
  readonly name = `judge:${MODELS.opus.id}(effort=${JUDGE_EFFORT})`;
  private readonly client: Anthropic;

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic({ maxRetries: 4 });
  }

  async judge(input: JudgeInput): Promise<JudgeResult> {
    const t0 = Date.now();
    const res = await this.client.messages.parse({
      model: MODELS.opus.id,
      max_tokens: 8000,
      output_config: { effort: JUDGE_EFFORT, format: jsonSchemaOutputFormat(JUDGE_SCHEMA) },
      system: JUDGE_SYSTEM,
      messages: [{ role: 'user', content: judgeUserPrompt(input) }],
    });
    const usage: TokenUsage = {
      input: res.usage.input_tokens,
      cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
      output: res.usage.output_tokens,
    };
    const base = { usage, costUsd: usd(usage, MODELS.opus.price), ms: Date.now() - t0 };
    if (res.stop_reason === 'refusal') return { ...base, verdict: null, error: 'refusal' };
    if (res.stop_reason === 'max_tokens') return { ...base, verdict: null, error: 'max_tokens' };
    const v = res.parsed_output as Verdict | null;
    if (!v) return { ...base, verdict: null, error: 'unparsed output' };
    return { ...base, verdict: v };
  }
}
