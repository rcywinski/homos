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

export interface GeneratorResult {
  output: GeneratedAnswer | null;
  usage: TokenUsage;
  costUsd: number;
  ms: number;
  error?: string;
}

export interface Generator {
  readonly name: string;
  generate(question: string, chunks: Chunk[]): Promise<GeneratorResult>;
}
