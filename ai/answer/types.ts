/**
 * Answer generation (step 1.8). Every model call goes through `Generator`, so it can be faked in tests.
 */
import type { Chunk } from '../corpus/types';
import type { TokenUsage } from '../context/types';

/** How much of the question the given chunks answer; compared with the golden `answerable` (yes, partial, no). */
export type Coverage = 'full' | 'partial' | 'none';

export interface Citation {
  chunkId: string;
  /** Verbatim from the chunk text, in the source language, at most about 40 words. */
  quote: string;
}

export interface GeneratedAnswer {
  answer: string;
  coverage: Coverage;
  citations: Citation[];
}

/** Per-call details from a local (Ollama) generator, step 1.11. */
export interface LocalCallStats {
  /** Prompt tokens expected from the model's own tokenizer (system + user + chat-template overhead). */
  promptTokensExpected: number;
  /** Prompt tokens the server reports having evaluated (`prompt_eval_count`). */
  promptTokensServer: number;
  /** Generated tokens (`eval_count`, thinking included) and decode speed. */
  evalTokens: number;
  tokensPerSecond: number;
  /** Tokens of the thinking text, counted with the model tokenizer; 0 when thinking is off. */
  thinkingTokens: number;
  /** The thinking text: stored in the result file, never given to the verifier or the judge. */
  thinking?: string;
  /** Structured outputs that failed to parse or validate (0, 1 or 2) and whether a retry was made. */
  invalidOutputs: number;
  /** Calls lost to a network error (no response at all) and repeated; at most 2 per answer. */
  networkRetries: number;
  retried: boolean;
  doneReason: string;
  /** Citation by reference (step 1.12, L): references given, valid, outside the given chunks, invalid ranges, over 40 words. */
  refStats?: { refs: number; valid: number; outside: number; invalidRange: number; overLong: number };
}

export interface GeneratorResult {
  output: GeneratedAnswer | null;
  usage: TokenUsage;
  costUsd: number;
  ms: number;
  error?: string;
  local?: LocalCallStats;
}

export interface Generator {
  readonly name: string;
  generate(question: string, chunks: Chunk[]): Promise<GeneratorResult>;
}
