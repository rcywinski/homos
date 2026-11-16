/**
 * Tests for the fixed model load order and the residency check (step 3.5 finding, 16 Nov 2026). Offline: a fake
 * Ollama that behaves like the box (loading the generator evicts bge-m3; bge-m3 loads next to the generator).
 * Run: npx tsx ai/serve/residency.test.ts
 */
import type { AddressInfo } from 'net';
import { createApp } from './app';
import type { AskDeps } from './ask';
import { loadConfigForTest } from './residency.fixtures';
import { DryRunGenerator, FAKE_ENGINE, fakeRetrieval } from './fake-engine';
import { MemoryLog } from './log';
import { GpuQueue } from './queue';
import { RateLimiter } from './ratelimit';
import { ensureResident, residencyProblem, ResidencyError, warmUp, type PsModel, type ResidencyOptions } from './residency';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const GEN = 'qwen3.8:27b';
const EMB = 'bge-m3';
const GiB = 1024 ** 3;

/** A fake Ollama: loading the generator evicts the embedder; the embedder loads next to the generator. */
class FakeOllama {
  loaded = new Map<string, PsModel>();
  calls: { path: string; body: Record<string, unknown> | null }[] = [];
  /** When set, the generator only partly fits on the GPU. */
  partial = false;
  fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    this.calls.push({ path, body });
    const json = (x: unknown) => new Response(JSON.stringify(x), { status: 200, headers: { 'content-type': 'application/json' } });
    if (path === '/api/ps') return json({ models: [...this.loaded.values()] });
    if (path === '/api/chat') {
      const options = (body?.options ?? {}) as { num_ctx?: number };
      this.loaded.delete(`${EMB}:latest`);
      this.loaded.set(GEN, { name: GEN, model: GEN, size: 17 * GiB, size_vram: this.partial ? 15 * GiB : 17 * GiB, context_length: options.num_ctx });
      return json({ message: { content: 'ready' } });
    }
    if (path === '/api/embed') {
      this.loaded.set(`${EMB}:latest`, { name: `${EMB}:latest`, model: `${EMB}:latest`, size: 1.1 * GiB, size_vram: 1.1 * GiB });
      return json({ embeddings: [[0.1, 0.2]] });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

const opts = (o: FakeOllama): ResidencyOptions => ({ baseUrl: 'http://box.invalid:11434', generator: GEN, numCtx: 17408, embedder: EMB, keepAlive: '24h', fetchFn: o.fetch });

async function main() {
  // The order and the requests.
  const box = new FakeOllama();
  const models = await warmUp(opts(box));
  const posts = box.calls.filter((c) => c.body);
  check('generator loads first, then the embedder', posts.map((c) => c.path).join() === '/api/chat,/api/embed', posts.map((c) => c.path).join());
  check('the generator gets the served num_ctx', (posts[0].body?.options as { num_ctx: number }).num_ctx === 17408);
  check('the generator gets the long keep_alive', posts[0].body?.keep_alive === '24h');
  check('the embed request sends no num_ctx and no options', !('options' in (posts[1].body ?? {})));
  check('the embedder gets the long keep_alive', posts[1].body?.keep_alive === '24h');
  check('both resident after warm-up', models.length === 2);

  // What the check refuses.
  const full: PsModel = { name: GEN, size: 17, size_vram: 17, context_length: 17408 };
  const emb: PsModel = { name: `${EMB}:latest`, size: 1, size_vram: 1 };
  check('both resident: no problem', residencyProblem([full, emb], opts(box)) === null);
  check('embedder missing is refused', residencyProblem([full], opts(box))?.includes('bge-m3 is not loaded') === true);
  check('generator missing is refused', residencyProblem([emb], opts(box))?.includes('is not loaded') === true);
  check('generator partly on the GPU is refused', residencyProblem([{ ...full, size_vram: 15 }, emb], opts(box))?.includes('partly on the GPU') === true);
  check('generator with another num_ctx is refused', residencyProblem([{ ...full, context_length: 4096 }, emb], opts(box))?.includes('num_ctx 4096') === true);

  const partialBox = new FakeOllama();
  partialBox.partial = true;
  let refused = '';
  try {
    await warmUp(opts(partialBox));
  } catch (e) {
    refused = e instanceof ResidencyError ? e.message : '';
  }
  check('warm-up refuses to start when the generator does not fit', refused.includes('partly on the GPU'), refused);

  // Before a question: nothing to do when resident; replay the order after the generator was unloaded.
  box.calls = [];
  check('resident set: no reload', (await ensureResident(opts(box))) === 'resident' && box.calls.every((c) => c.path === '/api/ps'));
  box.loaded.delete(GEN);
  box.calls = [];
  check('generator gone: reload', (await ensureResident(opts(box))) === 'reloaded');
  check('the reload replays the order', box.calls.filter((c) => c.body).map((c) => c.path).join() === '/api/chat,/api/embed');
  // Loading the generator alone would have evicted the embedder; the replay brings both back.
  check('both resident after the reload', residencyProblem(await (async () => [...box.loaded.values()])(), opts(box)) === null);

  // In the app: a failing residency check gives the visitor the "model unavailable" text, inside the queue.
  const deps: AskDeps = {
    retrieval: await fakeRetrieval(),
    generator: new DryRunGenerator(),
    engine: FAKE_ENGINE,
    k: 10,
    beforeWork: async () => {
      await ensureResident(opts(partialBox));
    },
  };
  const app = createApp(deps, {
    maxQuestionChars: 500,
    queue: new GpuQueue(5, 60_000),
    limiter: new RateLimiter({ perHour: 100, perDay: 100, globalPerDay: 1000 }),
    log: new MemoryLog(),
    probe: { up: async () => true },
    trustProxy: 'none',
    paused: () => false,
  });
  const srv = await new Promise<{ url: string; close: () => void }>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
  });
  const quiet = console.error;
  console.error = () => {};
  try {
    const r = await fetch(`${srv.url}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'Why wide ranges?' }) });
    const j = (await r.json()) as { error: string; message: string };
    check('a failed residency check is "model unavailable" for the visitor', r.status === 503 && j.error === 'model-unavailable' && j.message.includes('may not fit'), JSON.stringify(j));
  } finally {
    console.error = quiet;
    srv.close();
  }

  // Configuration: keep_alive is long by default and validated.
  check('default keep_alive is long', loadConfigForTest({}).keepAlive === '24h');
  check('keep_alive -1 accepted', loadConfigForTest({ SERVE_KEEP_ALIVE: '-1' }).keepAlive === '-1');
  let bad = false;
  try {
    loadConfigForTest({ SERVE_KEEP_ALIVE: 'forever' });
  } catch {
    bad = true;
  }
  check('a malformed keep_alive is refused', bad);

  console.log(`residency: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
