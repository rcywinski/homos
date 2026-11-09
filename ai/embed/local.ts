/**
 * LocalEmbedder: bge-m3 served by Ollama on the LAN GPU box (contract in inference/README.md).
 *
 * Request rules from that contract:
 *  - no `options` at all: changing options (num_ctx) restarts the model runner, 1.5 to 9.5 s per change;
 *  - `truncate: false`: the server embeds at most 2048 tokens and would otherwise cut silently;
 *    HTTP 413 therefore means a chunk is too long, a chunker bug, and is never retried;
 *  - `keep_alive` only during indexing, so the model is not unloaded between batches.
 */
import { InputTooLongError, type EmbedKind, type Embedder } from './types';

export interface LocalEmbedderOptions {
  baseUrl: string;
  model?: string;
  batchSize?: number;
  timeoutMs?: number;
  retries?: number;
  /** e.g. '30m' during indexing; omitted for normal queries (server default 5 min). */
  keepAlive?: string;
  /** Injected for tests. */
  fetchFn?: typeof fetch;
  onBatch?: (done: number, total: number) => void;
}

const DIMS = 1024;

export class LocalEmbedder implements Embedder {
  readonly name: string;
  readonly dims = DIMS;
  private readonly model: string;
  private readonly batchSize: number;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: LocalEmbedderOptions) {
    this.model = opts.model ?? 'bge-m3';
    this.name = `ollama-${this.model}`;
    this.batchSize = opts.batchSize ?? 32;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.retries = opts.retries ?? 3;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  // bge-m3 embeds queries and documents the same way, so `kind` is not used.
  async embed(texts: string[], _kind: EmbedKind): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      out.push(...(await this.embedBatch(batch, i)));
      this.opts.onBatch?.(Math.min(i + this.batchSize, texts.length), texts.length);
    }
    return out;
  }

  private body(input: string[]): string {
    return JSON.stringify({
      model: this.model,
      input,
      truncate: false,
      ...(this.opts.keepAlive ? { keep_alive: this.opts.keepAlive } : {}),
    });
  }

  private async embedBatch(batch: string[], offset: number): Promise<number[][]> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchFn(`${this.opts.baseUrl.replace(/\/$/, '')}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: this.body(batch),
          signal: controller.signal,
        });
        if (res.status === 413) {
          throw new InputTooLongError(offset, `input too long in batch starting at ${offset}: ${await res.text()}`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        return this.validate((await res.json()) as { embeddings?: number[][] }, batch.length);
      } catch (e) {
        if (e instanceof InputTooLongError) throw e;
        lastError = e;
        if (attempt < this.retries) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`embedding failed after ${this.retries} attempts: ${String(lastError)}`);
  }

  private validate(json: { embeddings?: number[][] }, expected: number): number[][] {
    const vecs = json.embeddings;
    if (!Array.isArray(vecs) || vecs.length !== expected)
      throw new Error(`expected ${expected} vectors, got ${Array.isArray(vecs) ? vecs.length : 'none'}`);
    for (const v of vecs) {
      if (v.length !== DIMS) throw new Error(`expected ${DIMS} dimensions, got ${v.length}`);
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      if (Math.abs(norm - 1) > 0.01) throw new Error(`vector not normalised (norm ${norm.toFixed(4)})`);
    }
    return vecs;
  }
}
