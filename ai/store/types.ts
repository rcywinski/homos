/**
 * Retriever: anything that turns questions into ranked chunk ids. The vector store (1.4), hybrid search (1.5)
 * and the reranker (1.6) all implement it, so the evaluation in ai/eval/run.ts never changes.
 */

export interface SearchHit {
  id: string;
  score: number;
}

export interface Retriever {
  readonly name: string;
  /** Batch-first: one ranked list per query, best first, at most k hits each. */
  search(queries: string[], k: number): Promise<SearchHit[][]>;
}
