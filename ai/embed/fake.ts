/**
 * FakeEmbedder for tests: deterministic, offline. Each word is hashed into one of `dims` buckets
 * (bag of words), then the vector is L2-normalised, so texts sharing words get similar vectors.
 */
import type { EmbedKind, Embedder } from './types';

function hash(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class FakeEmbedder implements Embedder {
  readonly name: string;
  constructor(readonly dims = 64) {
    this.name = `fake-${dims}`;
  }

  async embed(texts: string[], _kind: EmbedKind): Promise<number[][]> {
    return texts.map((t) => {
      const v = new Array<number>(this.dims).fill(0);
      for (const w of t.toLowerCase().match(/[\p{L}\p{N}_#]+/gu) ?? []) v[hash(w) % this.dims] += 1;
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
      return v.map((x) => x / norm);
    });
  }
}
