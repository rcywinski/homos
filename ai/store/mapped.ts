/**
 * MappedRetriever: rewrites each query before passing it to an inner retriever. Used in step 1.7 (query-pl) so that
 * only BM25 gets the question plus its Polish rendering; the vectors and the reranker keep the original question.
 */
import type { Retriever, SearchHit } from './types';

export class MappedRetriever implements Retriever {
  readonly name: string;
  constructor(
    private readonly inner: Retriever,
    private readonly map: (query: string) => string,
    tag: string,
  ) {
    this.name = `${inner.name}+${tag}`;
  }
  search(queries: string[], k: number): Promise<SearchHit[][]> {
    return this.inner.search(queries.map(this.map), k);
  }
}
