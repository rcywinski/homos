/**
 * Dry-run engine for the public chat (phase 4, steps 4.4b and 4.5): fake embedder, fake reranker and a fake generator
 * over the real corpus, so the whole server (queue, limits, streaming, verification, masking, logs) and the browser
 * suite can run without touching the GPU. Selected only with `SERVE_ENGINE=fake`; every answer says it is a dry run.
 *
 * The fake generator is deterministic and exercises every visitor path the end-to-end suite checks:
 *   - no word of the question (4 letters or more) in the best chunk: coverage "none" (the "not in the data" text);
 *   - otherwise: one real quote of about 14 words around the first question word found in the best chunk (verified;
 *     a private address in that stretch is masked on the way out), one made-up quote (shown "not verified"), and one
 *     made-up figure in the answer text (a "not verified" number).
 */
import type { GeneratedAnswer, Generator, GeneratorResult } from '../answer/types';
import { verifyCitation } from '../answer/verify';
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { FakeEmbedder } from '../embed/fake';
import { FakeReranker } from '../rerank/fake';
import type { LoadTarget, ModelBackend } from './models-state';
import { buildLocalRetrieval, metaView, type ChatRetrieval } from './retrieve';

export const FAKE_ENGINE = { id: 'fake', label: 'dry run: fake models, no GPU' };

const STOP = new Set(
  'about above after again also been before being below between both could does doing down during each from further have having here into itself just more most other over same should some such than that their them then there these they this those through under until very were what when where which while whom why with would write your tell show give please'.split(' '),
);
const words = (t: string) => [...new Set((t.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []).filter((w) => !/^\d+$/.test(w) && !STOP.has(w)))];

export class DryRunGenerator implements Generator {
  readonly name = 'answer:dry-run';
  constructor(private readonly delayMs = 0) {}
  /** Generations cancelled by a signal, for the step 4.7 test. */
  aborted = 0;
  async generate(question: string, chunks: Chunk[], signal?: AbortSignal): Promise<GeneratorResult> {
    if (this.delayMs > 0) {
      // Like the real model call: the signal cancels the wait at once.
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.delayMs);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            this.aborted++;
            reject(signal.reason instanceof Error ? signal.reason : new DOMException('aborted', 'AbortError'));
          },
          { once: true },
        );
      });
    }
    const usage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
    const done = (output: GeneratedAnswer): GeneratorResult => ({ output, usage, costUsd: 0, ms: this.delayMs });
    const first = chunks[0];
    const inChunk = new Set(words(first?.text ?? ''));
    const hit = words(question).find((w) => inChunk.has(w));
    if (!first || !hit) return done({ answer: 'Dry run: the best source does not mention the question.', coverage: 'none', citations: [] });

    // A stretch of about 14 words around the hit, on one line, that the real verifier accepts.
    const given = new Map(chunks.map((c) => [c.id, c]));
    let quote = '';
    for (const line of first.text.split('\n')) {
      const tokens = line.split(/\s+/).filter(Boolean);
      const at = tokens.findIndex((t) => t.toLowerCase().includes(hit));
      if (at < 0) continue;
      const candidate = tokens.slice(Math.max(0, at - 4), at + 10).join(' ');
      if (verifyCitation({ chunkId: first.id, quote: candidate }, given).status === 'ok') {
        quote = candidate;
        break;
      }
    }
    if (!quote) quote = first.text.split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
    return done({
      answer: `Dry run, no model was called. The best matching source is ${first.file}. It says: "${quote}" The dry run adds a made-up figure, 4242, to show a number that is not verified.`,
      coverage: 'partial',
      citations: [
        { chunkId: first.id, quote },
        { chunkId: (chunks[1] ?? first).id, quote: 'This quote is made up by the dry run and is not in the source.' },
      ],
    });
  }
}

export async function fakeRetrieval(root = process.cwd()): Promise<ChatRetrieval> {
  const chunks = loadCorpus(root);
  const view = metaView(chunks).chunks;
  const embedder = new FakeEmbedder(64);
  const index = { ids: view.map((c) => c.id), vectors: await embedder.embed(view.map((c) => c.text), 'document') };
  return buildLocalRetrieval({ chunks, embedder, reranker: new FakeReranker(), index });
}

/**
 * Dry-run model services for the state machine of step 4.10a: each stage waits `stageMs` (cancellable) and the stage
 * named in `failAt` throws, so the browser suite sees staged progress and the failure path without a GPU.
 */
export class FakeModelBackend implements ModelBackend {
  readonly calls: string[] = [];
  constructor(
    private readonly stageMs = 300,
    private readonly failAt: '' | 'generator' | 'embedder' | 'check' = '',
  ) {}

  private wait(name: string, signal: AbortSignal): Promise<void> {
    this.calls.push(name);
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      const t = setTimeout(() => (this.failAt === name ? reject(new Error(`dry run: ${name} failed on purpose`)) : resolve()), this.stageMs);
      signal.addEventListener('abort', () => (clearTimeout(t), reject(signal.reason)), { once: true });
    });
  }

  loadGenerator(signal: AbortSignal) {
    return this.wait('generator', signal);
  }
  loadEmbedder(signal: AbortSignal) {
    return this.wait('embedder', signal);
  }
  releaseEmbedder(signal: AbortSignal) {
    return this.wait('release-embedder', signal);
  }
  /** The dry run's residency check: a problem string when failAt is "check", as the real check reports one. */
  async check(target: LoadTarget): Promise<string | null> {
    this.calls.push('check');
    await new Promise((r) => setTimeout(r, this.stageMs));
    return this.failAt === 'check' ? `dry run: the ${target} check failed on purpose` : null;
  }
}
