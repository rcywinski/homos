/**
 * BM25 over chunks, built in memory at start-up (957 chunks: tens of milliseconds, no file on disk).
 *
 * Besides the chunk text, a chunk with a date in its metadata gets that date's canonical token (d20260915).
 * This is indexing existing metadata (a report section's date lives only in its file name), not generated text;
 * generating context for chunks is step 1.7. The vector index is not affected.
 */
import type { Chunk } from '../corpus/types';
import { isoDateToken, tokenize, type TokenizeOptions } from './tokenize';
import type { Retriever, SearchHit } from './types';

export interface Bm25Options extends TokenizeOptions {
  k1?: number;
  b?: number;
  /** Add the metadata date token to each chunk (default true). */
  dateMetadata?: boolean;
}

export class Bm25Index implements Retriever {
  readonly name: string;
  private readonly ids: string[];
  private readonly tf: Array<Map<string, number>>;
  private readonly len: number[];
  private readonly df = new Map<string, number>();
  private readonly avgLen: number;
  private readonly k1: number;
  private readonly b: number;

  constructor(
    chunks: Chunk[],
    private readonly opts: Bm25Options,
  ) {
    this.k1 = opts.k1 ?? 1.2;
    this.b = opts.b ?? 0.75;
    this.name = `bm25(stem=${opts.stem}${opts.dropNie ? ',drop-nie' : ''}${opts.dateMetadata === false ? ',no-date-meta' : ''})`;
    this.ids = chunks.map((c) => c.id);
    this.tf = chunks.map((c) => {
      const tokens = tokenize(c.text, opts);
      const dt = opts.dateMetadata !== false && c.date ? isoDateToken(c.date) : null;
      if (dt) tokens.push(dt);
      const m = new Map<string, number>();
      for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
      return m;
    });
    this.len = this.tf.map((m) => [...m.values()].reduce((s, n) => s + n, 0));
    this.avgLen = this.len.reduce((s, n) => s + n, 0) / Math.max(1, this.len.length);
    for (const m of this.tf) for (const t of m.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
  }

  private idf(term: string): number {
    const n = this.df.get(term) ?? 0;
    return Math.log(1 + (this.ids.length - n + 0.5) / (n + 0.5));
  }

  /** Ranked chunks with a positive score (chunks sharing no term with the query are not returned). */
  searchOne(query: string, k: number): SearchHit[] {
    const terms = [...new Set(tokenize(query, this.opts))];
    const hits: SearchHit[] = [];
    this.tf.forEach((m, i) => {
      let s = 0;
      for (const t of terms) {
        const f = m.get(t);
        if (!f) continue;
        s += (this.idf(t) * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * this.len[i]) / this.avgLen));
      }
      if (s > 0) hits.push({ id: this.ids[i], score: s });
    });
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, k);
  }

  async search(queries: string[], k: number): Promise<SearchHit[][]> {
    return queries.map((q) => this.searchOne(q, k));
  }
}
