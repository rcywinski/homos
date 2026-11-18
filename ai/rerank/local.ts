/**
 * LocalReranker: client of the reranker service on the GPU box (inference/reranker, contract in inference/README.md).
 * POST /rerank {query, documents, maxLength?, device?} -> {scores, truncated, device, maxLength, elapsedMs},
 * scores in document order. maxLength and device are per request, so a CPU or 1024-token run needs no service restart.
 */
import type { RerankDoc, RerankResult, Reranker } from './types';

export interface LocalRerankerOptions {
  baseUrl: string;
  timeoutMs?: number;
  retries?: number;
  fetchFn?: typeof fetch;
  /** Tokens per pair; the service default (2048) when omitted. */
  maxLength?: number;
  /** 'cuda' or 'cpu'; the service default (cuda) when omitted. */
  device?: 'cuda' | 'cpu';
}

interface RerankResponse {
  model?: string;
  device?: string;
  maxLength?: number;
  scores?: number[];
  truncated?: boolean[];
  elapsedMs?: number;
}

export class LocalReranker implements Reranker {
  name = 'rerank:bge-reranker-v2-m3';
  /** Filled from the last response: what the service actually ran on. */
  lastDevice: string | null = null;
  lastMaxLength: number | null = null;
  /** Server-side milliseconds per call, for the latency numbers in docs/AI-RAG.md. */
  readonly serverMs: number[] = [];
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: LocalRerankerOptions) {
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.retries = opts.retries ?? 3;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  async rerank(query: string, docs: RerankDoc[]): Promise<RerankResult[]> {
    if (!docs.length) return [];
    const res = await this.call(query, docs.map((d) => d.text));
    this.lastDevice = res.device ?? null;
    this.lastMaxLength = res.maxLength ?? null;
    if (typeof res.elapsedMs === 'number') this.serverMs.push(res.elapsedMs);
    const scores = res.scores ?? [];
    const truncated = res.truncated ?? [];
    if (scores.length !== docs.length || truncated.length !== docs.length)
      throw new Error(`reranker returned ${scores.length} scores for ${docs.length} documents`);
    return docs
      .map((d, i) => ({ id: d.id, score: scores[i], truncated: truncated[i] }))
      .sort((a, b) => b.score - a.score);
  }

  private async call(query: string, documents: string[]): Promise<RerankResponse> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const r = await this.fetchFn(`${this.opts.baseUrl.replace(/\/$/, '')}/rerank`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, documents, maxLength: this.opts.maxLength, device: this.opts.device }),
          signal: controller.signal,
        });
        // 4xx is a request bug (empty query, too many documents): not retried.
        if (r.status >= 400 && r.status < 500) throw new RequestError(`HTTP ${r.status}: ${await r.text()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
        return (await r.json()) as RerankResponse;
      } catch (e) {
        if (e instanceof RequestError) throw e;
        lastError = e;
        if (attempt < this.retries) await new Promise((res) => setTimeout(res, 1000 * 2 ** (attempt - 1)));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`rerank failed after ${this.retries} attempts: ${String(lastError)}`);
  }
}

class RequestError extends Error {}

export interface RerankerHealth {
  device?: string;
  cudaAvailable?: boolean;
  loadedDevices?: string[];
}

/**
 * Pre-flight before a run that needs the reranker (owner, 18 Nov 2026): the service on the box holds VRAM only while an
 * evaluation needs it, so it may be stopped. One GET /health with a short timeout and no retry, so a run stops at once
 * with an instruction instead of spending money and then failing at its first rerank call.
 */
export async function checkReranker(baseUrl: string, opts: { timeoutMs?: number; fetchFn?: typeof fetch } = {}): Promise<RerankerHealth> {
  if (!baseUrl) throw new Error('RERANK_URL is not set (see .env.example)');
  const fetchFn = opts.fetchFn ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  let reason: string;
  try {
    const r = await fetchFn(`${baseUrl.replace(/\/$/, '')}/health`, { signal: controller.signal });
    if (r.ok) return (await r.json()) as RerankerHealth;
    reason = `HTTP ${r.status}`;
  } catch (e) {
    reason = controller.signal.aborted ? 'no answer within the timeout' : e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(timer);
  }
  throw new Error(
    `reranker at ${baseUrl} is not available (${reason}). It runs only when an evaluation needs it: ask the owner to ` +
      `have CC-Win start the "HOMOS reranker" task on the box (a cold start takes about 35 s), then run again.`,
  );
}
