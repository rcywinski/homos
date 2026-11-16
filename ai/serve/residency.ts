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
 * Before each question the server checks /api/ps again; if the generator was unloaded (keep_alive expiry, a restart
 * of Ollama, someone else's model) the same order is replayed, because loading the generator alone would evict
 * bge-m3. If the check still fails, the question gets the "model unavailable" text.
 */

export interface ResidencyOptions {
  baseUrl: string;
  generator: string;
  numCtx: number;
  embedder: string;
  keepAlive: string;
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

async function call(o: ResidencyOptions, path: string, body?: unknown): Promise<unknown> {
  const fetchFn = o.fetchFn ?? fetch;
  const res = await fetchFn(`${o.baseUrl.replace(/\/$/, '')}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(o.timeoutMs ?? 300_000),
  });
  if (!res.ok) throw new ResidencyError(`${path} answered ${res.status}`);
  return res.json();
}

export async function loadedModels(o: ResidencyOptions): Promise<PsModel[]> {
  const j = (await call(o, '/api/ps')) as { models?: PsModel[] };
  return j.models ?? [];
}

/** Loads in the fixed order and checks the result; throws ResidencyError when the check fails. */
export async function warmUp(o: ResidencyOptions): Promise<PsModel[]> {
  await call(o, '/api/chat', {
    model: o.generator,
    messages: [{ role: 'user', content: 'Reply with one word: ready.' }],
    stream: false,
    think: false,
    keep_alive: o.keepAlive,
    options: { num_ctx: o.numCtx, num_predict: 1 },
  });
  // No options at all for the embedder: changing num_ctx would restart its runner, and bge-m3 caps it at 8192.
  await call(o, '/api/embed', { model: o.embedder, input: ['warm up'], keep_alive: o.keepAlive });
  const models = await loadedModels(o);
  const problem = residencyProblem(models, o);
  if (problem) throw new ResidencyError(`after loading in order: ${problem}`);
  return models;
}

/**
 * Before a question: cheap /api/ps check; when the set is not as required, replay the load order once. Callers run
 * this inside the GPU queue, so two questions never warm up at the same time.
 */
export async function ensureResident(o: ResidencyOptions): Promise<'resident' | 'reloaded'> {
  const problem = residencyProblem(await loadedModels(o), o);
  if (!problem) return 'resident';
  await warmUp(o);
  return 'reloaded';
}
