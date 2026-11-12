/**
 * Retrieval for answering (step 1.8): the variant chosen in 1.7, Haiku contexts (run-1 file) in the index, BM25 gets
 * the question plus its Polish rendering, hybrid RRF, cross-encoder rerank of the top 30 with the metadata header.
 * Returns the top k chunks as source text (no generated context): that is what the generator sees.
 * Variant "local" (step 1.11, variant B): no cloud step at all, the meta-index plus rerank row of 1.7 (metadata header
 * in the index and to the reranker, plain question to BM25, no generated context, no query translation).
 */
import { applyContexts } from '../context/contexts-file';
import { ClaudeQueryRewriter, expandedQuery, readQueries, type PolishQuery } from '../context/query';
import { loadCorpus } from '../corpus/load';
import type { TokenUsage } from '../context/types';
import type { Chunk } from '../corpus/types';
import { indexPath, readIndex } from '../embed/index-file';
import { indexView } from '../embed/index-view';
import { LocalEmbedder } from '../embed/local';
import { LocalReranker } from '../rerank/local';
import { RerankRetriever } from '../rerank/retriever';
import { Bm25Index } from '../store/bm25';
import { HybridRetriever } from '../store/hybrid';
import { MappedRetriever } from '../store/mapped';
import { VectorStore } from '../store/vector';

export const CONTEXTS_FILE = 'ai/context/contexts-haiku.jsonl';
export const QUERIES_FILE = 'ai/context/queries-pl-sonnet.jsonl';

export type RetrievalVariant = 'chosen' | 'local';

/** Model of the live query translation (step 1.7 measured Sonnet). */
export const QUERY_MODEL = 'sonnet' as const;

export class AnswerRetrieval {
  readonly name: string;
  private readonly source: Map<string, Chunk>;
  private readonly queries: Map<string, PolishQuery>;
  private readonly retriever: RerankRetriever;
  private rewriter: ClaudeQueryRewriter | null = null;
  /** Questions translated live (not in the cached file), for the cost line. */
  liveTranslations = 0;
  /** Called with the token usage of every live translation call (step 2.2: the agent counts it in its spend). */
  onUsage: ((u: TokenUsage) => void) | null = null;

  constructor(
    root = process.cwd(),
    private readonly variant: RetrievalVariant = 'chosen',
  ) {
    const inferenceUrl = process.env.INFERENCE_URL;
    const rerankUrl = process.env.RERANK_URL;
    if (!inferenceUrl || !rerankUrl) throw new Error('INFERENCE_URL and RERANK_URL must be set (see .env.example)');
    const chunks = loadCorpus(root);
    this.source = new Map(chunks.map((c) => [c.id, c]));
    const local = variant === 'local';
    const view = indexView(chunks, 'meta', local ? undefined : CONTEXTS_FILE);
    const embedder = new LocalEmbedder({ baseUrl: inferenceUrl });
    const index = readIndex(indexPath(embedder.name + view.suffix, root), view.chunks);
    this.queries = local ? new Map() : readQueries(QUERIES_FILE);
    const plainBm25 = new Bm25Index(view.chunks, { stem: 'prefix6' });
    const bm25 = local
      ? plainBm25
      : new MappedRetriever(
          plainBm25,
          (q) => {
            const pl = this.queries.get(q);
            if (!pl) throw new Error(`no Polish rendering for: ${q}`);
            return expandedQuery(pl);
          },
          'query-pl',
        );
    const withContext = new Map((local ? chunks : applyContexts(chunks, CONTEXTS_FILE)).map((c) => [c.id, c]));
    const hybrid = new HybridRetriever([new VectorStore(index.ids, index.vectors, embedder), bm25]);
    this.retriever = new RerankRetriever(hybrid, new LocalReranker({ baseUrl: rerankUrl, timeoutMs: 120_000 }), withContext, 30, 'meta');
    this.name = `${this.retriever.name} index=${embedder.name}${view.suffix}`;
  }

  /** Polish rendering for questions outside the cached file: one Sonnet call each, as measured in 1.7. */
  private async ensureTranslated(questions: string[]): Promise<void> {
    for (const q of questions) {
      if (this.queries.has(q)) continue;
      this.rewriter ??= new ClaudeQueryRewriter(QUERY_MODEL);
      let r = await this.rewriter.rewrite(q);
      this.onUsage?.(r.usage);
      if (!r.result) {
        r = await this.rewriter.rewrite(q);
        this.onUsage?.(r.usage);
      }
      if (!r.result) throw new Error(`query translation failed: ${r.error}`);
      this.queries.set(q, r.result);
      this.liveTranslations++;
    }
  }

  async retrieve(questions: string[], k: number): Promise<Chunk[][]> {
    if (this.variant !== 'local') await this.ensureTranslated(questions);
    const hits = await this.retriever.search(questions, k);
    return hits.map((list) => list.map((h) => this.source.get(h.id)!));
  }
}
