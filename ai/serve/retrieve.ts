/**
 * Retrieval for the public chat (phase 4, step 4.3): the fully local variant of step 1.11 (variant B), the one measured
 * with the served prompt in step 3.2. Meta-index plus BM25 on the plain question, hybrid RRF, cross-encoder rerank of
 * the top 30 with the metadata header. No cloud step at all.
 *
 * Built here instead of through `AnswerRetrieval` on purpose: that class also holds the phase 1 variant, which
 * translates every new question with a live Sonnet call, and its module imports the Anthropic client. The public path
 * imports neither. `serve.test.ts` checks that the name of this retriever equals the retrieval recorded in the measured
 * run, so the two cannot drift apart unnoticed.
 */
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { indexPath, readIndex, type IndexFile } from '../embed/index-file';
import { indexView } from '../embed/index-view';
import { LocalEmbedder } from '../embed/local';
import type { Embedder } from '../embed/types';
import { LocalReranker } from '../rerank/local';
import { RerankRetriever } from '../rerank/retriever';
import type { Reranker } from '../rerank/types';
import { Bm25Index } from '../store/bm25';
import { HybridRetriever } from '../store/hybrid';
import { VectorStore } from '../store/vector';

export interface ChatRetrieval {
  readonly name: string;
  retrieve(question: string, k: number): Promise<Chunk[]>;
}

export interface RetrievalParts {
  chunks: Chunk[];
  embedder: Embedder;
  reranker: Reranker;
  /** Vectors of the meta view of `chunks`, built by `npm run ai:index` (or by a fake embedder in tests). */
  index: Pick<IndexFile, 'ids' | 'vectors'>;
}

/** The meta view the index is built on; exported so tests can build a matching fake index. */
export function metaView(chunks: Chunk[]) {
  return indexView(chunks, 'meta', undefined);
}

export function buildLocalRetrieval(p: RetrievalParts): ChatRetrieval {
  const view = metaView(p.chunks);
  const source = new Map(p.chunks.map((c) => [c.id, c]));
  const bm25 = new Bm25Index(view.chunks, { stem: 'prefix6' });
  const hybrid = new HybridRetriever([new VectorStore(p.index.ids, p.index.vectors, p.embedder), bm25]);
  const retriever = new RerankRetriever(hybrid, p.reranker, source, 30, 'meta');
  return {
    name: `${retriever.name} index=${p.embedder.name}${view.suffix}`,
    async retrieve(question: string, k: number): Promise<Chunk[]> {
      const [hits] = await retriever.search([question], k);
      return hits.map((h) => {
        const c = source.get(h.id);
        if (!c) throw new Error(`retriever returned an unknown chunk ${h.id}`);
        return c;
      });
    },
  };
}

/** The real thing: reads the corpus and the saved index, talks to the box. Never called in tests. */
export function localRetrieval(inferenceUrl: string, rerankUrl: string, root = process.cwd()): ChatRetrieval {
  const chunks = loadCorpus(root);
  const embedder = new LocalEmbedder({ baseUrl: inferenceUrl });
  const index = readIndex(indexPath(embedder.name + metaView(chunks).suffix, root), metaView(chunks).chunks);
  return buildLocalRetrieval({ chunks, embedder, reranker: new LocalReranker({ baseUrl: rerankUrl, timeoutMs: 120_000 }), index });
}
