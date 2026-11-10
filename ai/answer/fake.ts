/** FakeGenerator for tests: returns a fixed answer, records what it was given. */
import type { Chunk } from '../corpus/types';
import type { GeneratedAnswer, Generator, GeneratorResult } from './types';

export class FakeGenerator implements Generator {
  readonly name = 'answer:fake';
  readonly seen: Array<{ question: string; chunkIds: string[] }> = [];
  constructor(private readonly output: GeneratedAnswer) {}
  async generate(question: string, chunks: Chunk[]): Promise<GeneratorResult> {
    this.seen.push({ question, chunkIds: chunks.map((c) => c.id) });
    return { output: this.output, usage: { input: 10, cacheWrite: 0, cacheRead: 0, output: 5 }, costUsd: 0.001, ms: 3 };
  }
}
