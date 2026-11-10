/** FakeContextualizer for tests: deterministic context, fixed usage and cost, records call order. */
import type { ContextRequest, ContextResult, Contextualizer, TokenUsage } from './types';

export class FakeContextualizer implements Contextualizer {
  readonly name = 'context:fake';
  readonly calls: string[] = [];
  active = 0;
  maxActive = 0;

  constructor(
    private readonly costPerCall = 0.01,
    private readonly worstPerCall = 0.02,
    private readonly delayMs = 5,
  ) {}

  worstCaseUsd(_req: ContextRequest): number {
    return this.worstPerCall;
  }

  costUsd(u: TokenUsage): number {
    return u.output * this.costPerCall;
  }

  async contextualize(req: ContextRequest): Promise<ContextResult> {
    this.active++;
    this.maxActive = Math.max(this.maxActive, this.active);
    this.calls.push(req.chunk.id);
    await new Promise((r) => setTimeout(r, this.delayMs));
    this.active--;
    const date = req.chunk.date ?? 'Undated:';
    return { id: req.chunk.id, context: `${date} context of ${req.chunk.title}`, usage: { input: 1, cacheWrite: 0, cacheRead: 0, output: 1 } };
  }
}
