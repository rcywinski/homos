/**
 * Reranker: scores (query, document) pairs with a cross-encoder and returns them best first.
 * Same pattern as Embedder: every call goes through this interface, so the service can be swapped or faked.
 */

export interface RerankDoc {
  id: string;
  text: string;
}

export interface RerankResult {
  id: string;
  score: number;
  /** The pair was longer than the service's max_length and its tail was cut. */
  truncated: boolean;
}

export interface Reranker {
  readonly name: string;
  rerank(query: string, docs: RerankDoc[]): Promise<RerankResult[]>;
}
