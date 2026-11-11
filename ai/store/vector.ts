/**
 * In-memory vector store: brute-force dot product over all chunk vectors.
 * Vectors are L2-normalised (checked by LocalEmbedder), so the dot product is the cosine similarity.
 * 957 x 1024 is about a million multiplications per query, a millisecond or two: no ANN index needed at this scale.
 */
import type { Embedder } from '../embed/types';
import type { Retriever, SearchHit } from './types';

export class VectorStore implements Retriever {
  readonly name: string;

  constructor(
    private readonly ids: string[],
    private readonly vectors: number[][],
    private readonly embedder: Embedder,
  ) {
    if (ids.length !== vectors.length) throw new Error('ids and vectors differ in length');
    this.name = `vector:${embedder.name}`;
  }

  /** Rank all chunks for one query vector. */
  searchVector(query: number[], k: number): SearchHit[] {
    const scored: SearchHit[] = this.vectors.map((v, i) => {
      let s = 0;
      for (let d = 0; d < v.length; d++) s += v[d] * query[d];
      return { id: this.ids[i], score: s };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  async search(queries: string[], k: number): Promise<SearchHit[][]> {
    const vecs = await this.embedder.embed(queries, 'query');
    return vecs.map((q) => this.searchVector(q, k));
  }
}
