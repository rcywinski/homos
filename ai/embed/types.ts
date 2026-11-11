/**
 * Embedder: turns texts into vectors. Every embedding call in the AI layer goes through this interface,
 * so retrieval and evaluation never know where the vectors come from (local GPU box, a cloud API, a fake).
 */

export type EmbedKind = 'document' | 'query';

export interface Embedder {
  /** Stable name, used as the index file name: ai/index/<name>.json. */
  readonly name: string;
  readonly dims: number;
  /**
   * One vector per text, in the same order. `kind` matters for models that embed queries and documents
   * differently (e.g. voyage-4, e5); bge-m3 does not, and its implementation ignores it.
   */
  embed(texts: string[], kind: EmbedKind): Promise<number[][]>;
}

/** Thrown when the server rejects an input as too long: a chunking bug, never retried. */
export class InputTooLongError extends Error {
  constructor(readonly index: number, message: string) {
    super(message);
    this.name = 'InputTooLongError';
  }
}
