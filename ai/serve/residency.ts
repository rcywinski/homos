/**
 * Model residency on the GPU box (phase 4; finding of step 3.5, relayed by CC-Mac on 16 Nov 2026).
 *
 * With Ollama 0.40.15 on Windows, loading the generator evicts a resident bge-m3, while bge-m3 loading next to a
 * resident generator is allowed (about 1.1 GiB of VRAM). After the owner's 48 GB pagefile, generator, embedder and
 * reranker stay resident together (23 980 of 24 576 MiB). So the order is fixed:
 *   1. the generator first: one short chat with the served num_ctx and a long keep_alive;
 *   2. then bge-m3: one embed, with the same long keep_alive and no num_ctx;
 *   3. /api/ps must list both, and the generator must be fully in VRAM (size_vram equal to size), or the server
 *      refuses to start.
 * The reranker (its own service on port 11435, step 1.6) is checked the same way: `GET /health` must answer with the
 * served model on CUDA, at start and before each question (owner, 16 Nov 2026).
 * Before each question the server checks /api/ps again; if the generator was unloaded (keep_alive expiry, a restart
 * of Ollama, someone else's model) the same order is replayed, because loading the generator alone would evict
 * bge-m3. If the check still fails, the question gets the "model unavailable" text.
 */

import type { LoadTarget, ModelBackend } from './models-state';

export interface ResidencyOptions {
  baseUrl: string;
  generator: string;
  numCtx: number;
  embedder: string;
  keepAlive: string;
  /** Base URL of the reranker service (RERANK_URL). */
  rerankUrl: string;
  /** Model the reranker must report in /health. */
  reranker: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export interface PsModel {
  name: string;
  model?: string;
  size: number;
  size_vram: number;
  context_length?: number;
}

export class ResidencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResidencyError';
  }
}

const tagged = (m: string) => (m.includes(':') ? m : `${m}:latest`);

/** What is wrong with the loaded set, or null when generator and embedder are both resident as required. */
export function residencyProblem(models: PsModel[], o: Pick<ResidencyOptions, 'generator' | 'embedder' | 'numCtx'>): string | null {
  const find = (m: string) => models.find((x) => x.name === tagged(m) || x.model === tagged(m));
  const gen = find(o.generator);
  const emb = find(o.embedder);
  if (!gen) return `${o.generator} is not loaded`;
  if (gen.size_vram < gen.size) return `${o.generator} is only partly on the GPU (${gen.size_vram} of ${gen.size} bytes)`;
  if (gen.context_length !== undefined && gen.context_length !== o.numCtx) return `${o.generator} is loaded with num_ctx ${gen.context_length}, not ${o.numCtx}`;
  if (!emb) return `${o.embedder} is not loaded`;
  return null;
}

async function call(o: ResidencyOptions, path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const fetchFn = o.fetchFn ?? fetch;
  const timeout = AbortSignal.timeout(o.timeoutMs ?? 300_000);
  const res = await fetchFn(`${o.baseUrl.replace(/\/$/, '')}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new ResidencyError(`${path} answered ${res.status}`);
  return res.json();
}

export interface RerankHealth {
  model?: string;
  device?: string;
  gpu?: string;
}

/** What is wrong with the reranker's /health answer, or null when it serves the expected model on CUDA. */
export function rerankProblem(h: RerankHealth | null, o: Pick<ResidencyOptions, 'reranker'>): string | null {
  if (!h) return 'the reranker does not answer';
  if (!h.model || !h.model.endsWith(o.reranker)) return `the reranker serves ${h.model ?? 'an unknown model'}, not ${o.reranker}`;
  if (h.device !== 'cuda') return `the reranker runs on ${h.device ?? 'an unknown device'}, not on the GPU`;
  return null;
}

export async function rerankHealth(o: ResidencyOptions): Promise<RerankHealth | null> {
  try {
    const res = await (o.fetchFn ?? fetch)(`${o.rerankUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as RerankHealth) : null;
  } catch {
    return null;
  }
}

async function requireReranker(o: ResidencyOptions): Promise<void> {
  const problem = rerankProblem(await rerankHealth(o), o);
  if (problem) throw new ResidencyError(problem);
}

export async function loadedModels(o: ResidencyOptions): Promise<PsModel[]> {
  const j = (await call(o, '/api/ps')) as { models?: PsModel[] };
  return j.models ?? [];
}

/** One load request as it happened: the model, the endpoint, when it was sent and how long it took. */
export interface LoadStep {
  model: string;
  request: '/api/chat' | '/api/embed';
  startedAt: string;
  ms: number;
}

export interface WarmUpResult {
  /** In the order the requests were made (the order that matters for eviction). */
  steps: LoadStep[];
  /** As /api/ps lists them; Ollama does not list them in load order, so this is not the order of loading. */
  resident: PsModel[];
}

/** One line for the log: the load order with times, then what /api/ps reports. */
export function describeWarmUp(r: WarmUpResult): string {
  const steps = r.steps.map((s, i) => `${i + 1}. ${s.model} via ${s.request} at ${s.startedAt.slice(11, 23)} UTC (${(s.ms / 1000).toFixed(1)} s)`).join(', ');
  return `load order: ${steps}; resident per /api/ps (not load order): ${r.resident.map((m) => m.name).join(', ')}`;
}

async function timed(o: ResidencyOptions, model: string, request: LoadStep['request'], body: unknown, steps: LoadStep[]) {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  await call(o, request, body);
  steps.push({ model, request, startedAt, ms: Date.now() - t0 });
}

/** Loads in the fixed order (each request finishes before the next is sent) and checks the result. */
export async function warmUp(o: ResidencyOptions): Promise<WarmUpResult> {
  const steps: LoadStep[] = [];
  await timed(o, o.generator, '/api/chat', {
    model: o.generator,
    messages: [{ role: 'user', content: 'Reply with one word: ready.' }],
    stream: false,
    think: false,
    keep_alive: o.keepAlive,
    options: { num_ctx: o.numCtx, num_predict: 1 },
  }, steps);
  // No options at all for the embedder: changing num_ctx would restart its runner, and bge-m3 caps it at 8192.
  await timed(o, o.embedder, '/api/embed', { model: o.embedder, input: ['warm up'], keep_alive: o.keepAlive }, steps);
  const resident = await loadedModels(o);
  const problem = residencyProblem(resident, o);
  if (problem) throw new ResidencyError(`after loading in order: ${problem}`);
  await requireReranker(o);
  return { steps, resident };
}

/**
 * Before a question: cheap /api/ps check; when the set is not as required, replay the load order once. Callers run
 * this inside the GPU queue, so two questions never warm up at the same time.
 */
export async function ensureResident(o: ResidencyOptions): Promise<{ state: 'resident' } | { state: 'reloaded'; warmUp: WarmUpResult }> {
  const problem = residencyProblem(await loadedModels(o), o);
  if (!problem) {
    await requireReranker(o);
    return { state: 'resident' };
  }
  return { state: 'reloaded', warmUp: await warmUp(o) };
}

// --- Step 4.10b: models on demand on the box ---

const listed = (models: PsModel[], m: string) => models.some((x) => x.name === tagged(m) || x.model === tagged(m));

/**
 * What the server checks at start when the models load on demand: everything that does not need the GPU. Ollama
 * answers, both models are on disk, the reranker serves its model on CUDA. Null when all is well.
 */
export async function startupProblem(o: ResidencyOptions): Promise<string | null> {
  try {
    await call(o, '/api/version');
  } catch (e) {
    return `Ollama does not answer at ${o.baseUrl}: ${e instanceof Error ? e.message : String(e)}`;
  }
  const tags = ((await call(o, '/api/tags')) as { models?: { name: string; model?: string }[] }).models ?? [];
  for (const m of [o.generator, o.embedder]) {
    if (!tags.some((x) => x.name === tagged(m) || x.model === tagged(m))) return `${m} is not on disk (ollama pull ${m})`;
  }
  return rerankProblem(await rerankHealth(o), o);
}

/**
 * At start-up the server knows of no loaded model, but a previous server process may have left the generator and
 * bge-m3 in Ollama (a crash, a restart, a swap): up to keep_alive (60 min) of occupied VRAM while the page says "off".
 * Returns the served models /api/ps lists, so the caller can release them through the normal release path.
 */
export async function leftoverModels(o: ResidencyOptions): Promise<string[]> {
  const listedNow = await loadedModels(o);
  return [o.generator, o.embedder].filter((m) => listed(listedNow, m));
}

export interface OllamaBackendOptions extends ResidencyOptions {
  /** How long a release waits for /api/ps to drop the models before it reports a problem. */
  releaseWaitMs?: number;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * The real model services for the state machine (ai/serve/models-state.ts). Loads in the fixed order with the
 * served num_ctx and the keep_alive ceiling; releases the way `ollama stop` does (keep_alive 0 on /api/generate,
 * which also works for an embedding model), generator first, and confirms with /api/ps. A model that appears after
 * the release was sent (Ollama finishing a load whose request was aborted) is released again while waiting.
 */
export class OllamaModelBackend implements ModelBackend {
  constructor(private readonly o: OllamaBackendOptions) {}

  private sleep(ms: number) {
    return (this.o.sleep ?? ((x: number) => new Promise<void>((r) => setTimeout(r, x))))(ms);
  }

  async loadGenerator(signal: AbortSignal) {
    await call(
      this.o,
      '/api/chat',
      {
        model: this.o.generator,
        messages: [{ role: 'user', content: 'Reply with one word: ready.' }],
        stream: false,
        think: false,
        keep_alive: this.o.keepAlive,
        options: { num_ctx: this.o.numCtx, num_predict: 1 },
      },
      signal,
    );
  }

  async loadEmbedder(signal: AbortSignal) {
    // No options for the embedder: changing num_ctx would restart its runner, and bge-m3 caps it at 8192.
    await call(this.o, '/api/embed', { model: this.o.embedder, input: ['warm up'], keep_alive: this.o.keepAlive }, signal);
  }

  private stop(model: string, signal?: AbortSignal) {
    // The tagged name, as /api/ps lists it (bge-m3 is bge-m3:latest).
    return call(this.o, '/api/generate', { model: tagged(model), keep_alive: 0 }, signal);
  }

  async releaseEmbedder(signal: AbortSignal) {
    await this.stop(this.o.embedder, signal);
    const problem = await this.waitGone([this.o.embedder]);
    if (problem) throw new Error(problem);
  }

  async check(target: LoadTarget): Promise<string | null> {
    const models = await loadedModels(this.o);
    const problem = target === 'ready' ? residencyProblem(models, this.o) : listed(models, this.o.embedder) ? null : `${this.o.embedder} is not loaded`;
    return problem ?? rerankProblem(await rerankHealth(this.o), this.o);
  }

  async releaseAll(watchMs = 0): Promise<string | null> {
    const models = [this.o.generator, this.o.embedder];
    // Generator first, then bge-m3. An error here (model not loaded, Ollama down) is not final: /api/ps decides.
    for (const m of models) await this.stop(m).catch(() => undefined);
    return this.waitGone(models, watchMs);
  }

  /**
   * Polls /api/ps until none of the models is listed, sending the release again for any that (re)appears. With
   * `minMs`, an empty list counts only after that long (a model may still appear after an aborted load).
   */
  private async waitGone(models: string[], minMs = 0): Promise<string | null> {
    const start = Date.now();
    const deadline = start + minMs + (this.o.releaseWaitMs ?? 15_000);
    for (;;) {
      let resident: PsModel[];
      try {
        resident = await loadedModels(this.o);
      } catch (e) {
        return `Ollama did not answer /api/ps: ${e instanceof Error ? e.message : String(e)}`;
      }
      const left = models.filter((m) => listed(resident, m));
      if (!left.length && Date.now() - start >= minMs) return null;
      if (Date.now() >= deadline) return `still listed by /api/ps after ${Math.round((this.o.releaseWaitMs ?? 15_000) / 1000)} s: ${left.join(', ')}`;
      for (const m of left) await this.stop(m).catch(() => undefined);
      await this.sleep(this.o.pollMs ?? 500);
    }
  }
}
