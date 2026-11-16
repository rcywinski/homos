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
import { corpusHash, indexPath, type IndexFile } from '../embed/index-file';
import { existsSync, readFileSync } from 'fs';
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

export class IndexMismatch extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IndexMismatch';
  }
}

/** Path of the saved index the served retrieval needs: `ai/index/ollama-bge-m3.meta.json` under `root`. */
export function servedIndexPath(chunks: Chunk[], embedderName = 'ollama-bge-m3', root = process.cwd()): string {
  return indexPath(embedderName + metaView(chunks).suffix, root);
}

/**
 * Start-up check (owner rule, 16 Nov 2026): the server refuses to run when the index was not built from this exact
 * corpus. Compares the corpus hash stored in the index with the hash of the meta view of the corpus on disk, and the
 * index's embedder, size and ids with what the retrieval expects. A Windows checkout gives the same hash: the corpus
 * loader normalises line endings.
 */
export function checkIndex(index: IndexFile, chunks: Chunk[], embedderName: string, file: string): void {
  const view = metaView(chunks).chunks;
  const expected = corpusHash(view);
  if (index.corpusHash !== expected) {
    throw new IndexMismatch(`${file} was built from another corpus (index ${index.corpusHash}, corpus on disk ${expected}). Copy the index built from this commit, or rebuild it, before starting.`);
  }
  if (index.embedder !== embedderName) throw new IndexMismatch(`${file} was built with ${index.embedder}, the served retrieval uses ${embedderName}`);
  if (index.ids.length !== view.length || index.vectors.length !== view.length) {
    throw new IndexMismatch(`${file} has ${index.ids.length} vectors, the corpus has ${view.length} chunks`);
  }
  const ids = new Set(view.map((c) => c.id));
  const missing = index.ids.filter((id) => !ids.has(id));
  if (missing.length > 0) throw new IndexMismatch(`${file} has ${missing.length} ids that are not in the corpus, for example ${missing[0]}`);
}

/** Reads and checks the saved index; throws IndexMismatch when it is missing or does not match. */
export function loadCheckedIndex(chunks: Chunk[], embedderName = 'ollama-bge-m3', root = process.cwd()): IndexFile {
  const file = servedIndexPath(chunks, embedderName, root);
  if (!existsSync(file)) throw new IndexMismatch(`${file} is missing. Copy it to the box before starting (see ai/APP-PLAN.md, step 4.8).`);
  const index = JSON.parse(readFileSync(file, 'utf8')) as IndexFile;
  checkIndex(index, chunks, embedderName, file);
  return index;
}

/**
 * The corpus on disk must be the one the served preset was measured on: the plain corpus hash and the meta-view hash
 * (the one stored in the index) both have to match the preset. Throws IndexMismatch otherwise.
 */
export function checkCorpus(chunks: Chunk[], expected: { corpusHash: string; indexCorpusHash: string }): void {
  const plain = corpusHash(chunks);
  const meta = corpusHash(metaView(chunks).chunks);
  if (plain !== expected.corpusHash || meta !== expected.indexCorpusHash) {
    throw new IndexMismatch(
      `the corpus on disk (corpus hash ${plain}, meta view ${meta}) is not the one the served preset was measured on (${expected.corpusHash}, ${expected.indexCorpusHash}). A corpus change needs a new index and new measured runs.`,
    );
  }
}

/** The real thing: reads the corpus and the checked index, talks to the box. Never called in tests. */
export function localRetrieval(inferenceUrl: string, rerankUrl: string, expected: { corpusHash: string; indexCorpusHash: string }, root = process.cwd()): ChatRetrieval {
  const chunks = loadCorpus(root);
  checkCorpus(chunks, expected);
  const embedder = new LocalEmbedder({ baseUrl: inferenceUrl });
  const index = loadCheckedIndex(chunks, embedder.name, root);
  return buildLocalRetrieval({ chunks, embedder, reranker: new LocalReranker({ baseUrl: rerankUrl, timeoutMs: 120_000 }), index });
}
