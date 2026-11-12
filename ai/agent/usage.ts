/** Token usage arithmetic for the agent (step 2.2). */
import type { TokenUsage } from '../context/types';

export const zeroUsage = (): TokenUsage => ({ input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });

export const addUsage = (a: TokenUsage, b: TokenUsage): TokenUsage => ({
  input: a.input + b.input,
  cacheWrite: a.cacheWrite + b.cacheWrite,
  cacheRead: a.cacheRead + b.cacheRead,
  output: a.output + b.output,
});
