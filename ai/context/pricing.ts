/**
 * Prices in USD per million tokens, Claude API, as listed on 10 Nov 2026 (claude-api reference, models table).
 * Cache writes (5-minute TTL) cost 1.25x the input price, cache reads 0.1x (Sonnet 5.5: $0.20 as listed).
 * The Haiku 5.5 cache multipliers are the general ones, not separately listed: treat the Haiku cost as an estimate.
 * Haiku 5.5 doubles in price above a 100k-token prompt; our prompts stay far below that (checked per request).
 */
import type { TokenUsage } from './types';

export interface Price {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
  /** Prompts above this many tokens are billed at a higher tier we do not model: refuse instead. */
  maxPromptTokens?: number;
}

export const MODELS = {
  haiku: { id: 'claude-haiku-5-5', price: { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01, maxPromptTokens: 100_000 } },
  sonnet: { id: 'claude-sonnet-5-5', price: { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 } },
  // Opus 5.5: $4 / $20, cache reads 0.05x ($0.20) as listed; cache writes are not used by the judge.
  opus: { id: 'claude-opus-5-5', price: { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 } },
} as const satisfies Record<string, { id: string; price: Price }>;

export type ModelKey = keyof typeof MODELS;

export function usd(u: TokenUsage, p: Price): number {
  return (u.input * p.input + u.cacheWrite * p.cacheWrite + u.cacheRead * p.cacheRead + u.output * p.output) / 1e6;
}
