/**
 * Contextualizer (step 1.7): writes one or two English sentences that situate a chunk, so the index can match
 * English questions to Polish text. Every model call goes through this interface, so it can be faked in tests.
 */
import type { Chunk } from '../corpus/types';

export interface ContextRequest {
  chunk: Chunk;
  /** The chunk's parent unit (whole journal entry or whole morning report) when it is larger than the chunk. */
  parent?: { label: string; text: string };
  /** Set on the single retry after a context failed validation: which rule it broke. */
  retryNote?: string;
}

export interface TokenUsage {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
}

export interface ContextResult {
  id: string;
  context: string;
  usage: TokenUsage;
  /** Set when the model declined or returned nothing usable; `context` is then empty. */
  error?: string;
}

export interface Contextualizer {
  readonly name: string;
  contextualize(req: ContextRequest): Promise<ContextResult>;
  /** Worst-case cost in USD of one request, used to keep a hard spend cap before a request is sent. */
  worstCaseUsd(req: ContextRequest): number;
  /** Cost in USD of a finished request, from the usage the API reported. */
  costUsd(usage: TokenUsage): number;
}
