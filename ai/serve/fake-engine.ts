/**
 * Dry-run engine for the public chat (phase 4, step 4.4b): fake embedder, fake reranker and a fake generator over the
 * real corpus, so the whole server (queue, limits, streaming, verification, masking, logs) can run on the box without
 * touching the GPU. Selected only with `SERVE_ENGINE=fake`; every answer is labelled as a dry run.
 */
import type { GeneratedAnswer, Generator, GeneratorResult } from '../answer/types';
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { FakeEmbedder } from '../embed/fake';
import { FakeReranker } from '../rerank/fake';
import { buildLocalRetrieval, metaView, type ChatRetrieval } from './retrieve';

export const FAKE_ENGINE = { id: 'fake', label: 'dry run: fake models, no GPU' };

/** Quotes the first sentence-like stretch of the best chunk, so the verifier marks it verified. */
export class DryRunGenerator implements Generator {
  readonly name = 'answer:dry-run';
  constructor(private readonly delayMs = 0) {}
  async generate(_question: string, chunks: Chunk[]): Promise<GeneratorResult> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    const usage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
    const first = chunks[0];
    if (!first) return { output: { answer: '', coverage: 'none', citations: [] }, usage, costUsd: 0, ms: this.delayMs };
    const quote = first.text.split(/\s+/).filter(Boolean).slice(0, 10).join(' ');
    const out: GeneratedAnswer = {
      answer: `Dry run, no model was called. The best matching source is ${first.file}, which begins: "${quote}"`,
      coverage: 'partial',
      citations: [{ chunkId: first.id, quote }],
    };
    return { output: out, usage, costUsd: 0, ms: this.delayMs };
  }
}

export async function fakeRetrieval(root = process.cwd()): Promise<ChatRetrieval> {
  const chunks = loadCorpus(root);
  const view = metaView(chunks).chunks;
  const embedder = new FakeEmbedder(64);
  const index = { ids: view.map((c) => c.id), vectors: await embedder.embed(view.map((c) => c.text), 'document') };
  return buildLocalRetrieval({ chunks, embedder, reranker: new FakeReranker(), index });
}
