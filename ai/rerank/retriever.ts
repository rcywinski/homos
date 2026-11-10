/**
 * RerankRetriever: takes the top `candidates` of a first-stage retriever (hybrid-stem-prefix6, decided in 1.5),
 * reorders them with a Reranker and returns that list. It cannot add chunks the first stage missed, so its
 * recall@candidates equals the first stage's: only the order inside the candidate set changes.
 */
import type { Chunk } from '../corpus/types';
import type { Retriever, SearchHit } from '../store/types';
import type { Reranker } from './types';

/** What the reranker reads for a chunk. `plain` is the chunk text as indexed. */
export type DocFormat = 'plain' | 'meta';

/**
 * `meta` (variant hybrid-rerank-meta, declared before measuring in step 1.6): one header line built only from
 * metadata the chunk already has, then the text. Example:
 *   `[journal/DECYZJE-2026-08-26.md | 2026-08-26 | 11f. (Nowe, 25.08 noc) ANALIZA 720d ...]`
 * Nothing is generated, so this is not contextual retrieval (step 1.7).
 */
export function docText(c: Chunk, format: DocFormat): string {
  if (format === 'plain') return c.text;
  const header = [c.file, c.date, c.title].filter((x) => x && x.trim()).join(' | ');
  return `[${header}]\n${c.text}`;
}

export class RerankRetriever implements Retriever {
  readonly name: string;
  /** Pairs cut by the service's max_length, over all queries of the last search. */
  truncatedPairs = 0;
  totalPairs = 0;
  /**
   * Ties: candidates whose score equals another candidate's score for the same query. The service runs fp16 on the
   * GPU, where logits around -10 have a resolution of 1/128, so distinct documents can get identical scores and their
   * relative order is then arbitrary. `tiedInTop10` counts tied candidates that sit in the top 10.
   */
  tiedCandidates = 0;
  tiedInTop10 = 0;
  queriesWithTies = 0;

  constructor(
    private readonly first: Retriever,
    private readonly reranker: Reranker,
    private readonly chunks: Map<string, Chunk>,
    private readonly candidates = 30,
    private readonly format: DocFormat = 'plain',
  ) {
    this.name = `${first.name}>${reranker.name}(top${candidates}${format === 'plain' ? '' : `,doc=${format}`})`;
  }

  async search(queries: string[], k: number): Promise<SearchHit[][]> {
    const firstStage = await this.first.search(queries, this.candidates);
    const out: SearchHit[][] = [];
    for (let i = 0; i < queries.length; i++) {
      const docs = firstStage[i].map((h) => {
        const c = this.chunks.get(h.id);
        return { id: h.id, text: c ? docText(c, this.format) : '' };
      });
      const ranked = await this.reranker.rerank(queries[i], docs);
      this.totalPairs += ranked.length;
      this.truncatedPairs += ranked.filter((r) => r.truncated).length;
      const count = new Map<number, number>();
      for (const r of ranked) count.set(r.score, (count.get(r.score) ?? 0) + 1);
      const tied = ranked.map((r) => (count.get(r.score) ?? 0) > 1);
      const nTied = tied.filter(Boolean).length;
      this.tiedCandidates += nTied;
      this.tiedInTop10 += tied.slice(0, 10).filter(Boolean).length;
      if (nTied) this.queriesWithTies++;
      out.push(ranked.slice(0, k).map((r) => ({ id: r.id, score: r.score })));
    }
    return out;
  }
}
