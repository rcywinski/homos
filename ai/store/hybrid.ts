/**
 * Hybrid search by Reciprocal Rank Fusion: each retriever's top `depth` list gives a chunk 1 / (c + rank),
 * the sums decide the order. RRF looks only at ranks, so cosine scores (0.4-0.7) and BM25 scores (0-30) need no
 * common scale and there is no weight to tune (with 26 questions any tuned weight would fit the test set).
 * c = 60 is the standard constant from the RRF paper (Cormack et al., 2009), not tuned here.
 */
import type { Retriever, SearchHit } from './types';

export function rrf(lists: SearchHit[][], c = 60): SearchHit[] {
  const score = new Map<string, number>();
  for (const list of lists) list.forEach((h, i) => score.set(h.id, (score.get(h.id) ?? 0) + 1 / (c + i + 1)));
  return [...score].map(([id, s]) => ({ id, score: s })).sort((a, b) => b.score - a.score);
}

export class HybridRetriever implements Retriever {
  readonly name: string;
  constructor(
    private readonly retrievers: Retriever[],
    private readonly depth = 100,
    private readonly c = 60,
  ) {
    this.name = `hybrid-rrf(${retrievers.map((r) => r.name).join('+')},depth=${depth},c=${c})`;
  }

  async search(queries: string[], k: number): Promise<SearchHit[][]> {
    const all = await Promise.all(this.retrievers.map((r) => r.search(queries, this.depth)));
    return queries.map((_, qi) => rrf(all.map((lists) => lists[qi]), this.c).slice(0, k));
  }
}
