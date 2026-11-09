/**
 * RerankRetriever: takes the top `candidates` of a first-stage retriever (hybrid-stem-prefix6, decided in 1.5),
 * reorders them with a Reranker and returns that list. It cannot add chunks the first stage missed, so its
 * recall@candidates equals the first stage's: only the order inside the candidate set changes.
 */
import type { Chunk } from '../corpus/types';
import type { Retriever, SearchHit } from '../store/types';
import type { Reranker } from './types';

export class RerankRetriever implements Retriever {
  readonly name: string;
  /** Pairs cut by the service's max_length, over all queries of the last search. */
  truncatedPairs = 0;
  totalPairs = 0;

  constructor(
    private readonly first: Retriever,
    private readonly reranker: Reranker,
    private readonly chunks: Map<string, Chunk>,
    private readonly candidates = 30,
  ) {
    this.name = `${first.name}>${reranker.name}(top${candidates})`;
  }

  async search(queries: string[], k: number): Promise<SearchHit[][]> {
    const firstStage = await this.first.search(queries, this.candidates);
    const out: SearchHit[][] = [];
    for (let i = 0; i < queries.length; i++) {
      const docs = firstStage[i].map((h) => ({ id: h.id, text: this.chunks.get(h.id)?.text ?? '' }));
      const ranked = await this.reranker.rerank(queries[i], docs);
      this.totalPairs += ranked.length;
      this.truncatedPairs += ranked.filter((r) => r.truncated).length;
      out.push(ranked.slice(0, k).map((r) => ({ id: r.id, score: r.score })));
    }
    return out;
  }
}
