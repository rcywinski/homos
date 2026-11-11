/** FakeReranker for tests: score = number of distinct query words found in the document (offline, deterministic). */
import type { RerankDoc, RerankResult, Reranker } from './types';

export class FakeReranker implements Reranker {
  readonly name = 'rerank:fake';
  async rerank(query: string, docs: RerankDoc[]): Promise<RerankResult[]> {
    const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}_#]+/gu) ?? [])];
    return docs
      .map((d) => {
        const text = d.text.toLowerCase();
        return { id: d.id, score: words.filter((w) => text.includes(w)).length, truncated: false };
      })
      .sort((a, b) => b.score - a.score);
  }
}
