/**
 * Tests for step 4.10a: the models state machine (off, idle, loading, search, ready), the fixed load order, single
 * flight, no retries, the load endpoints and their limits, and questions refused until the models are ready.
 * Offline: fake models only, no call to the box.
 * Run: npx tsx ai/serve/models-state.test.ts
 */
import type { AddressInfo } from 'net';
import { createApp, MESSAGES } from './app';
import type { AskDeps } from './ask';
import { DryRunGenerator, FAKE_ENGINE, FakeModelBackend, fakeRetrieval } from './fake-engine';
import { MemoryLog } from './log';
import { LoadFailed, LoadRefused, Models, plan, type ModelBackend, type ModelState, type ModelsView } from './models-state';
import { OllamaModelBackend, type PsModel } from './residency';
import { GpuQueue } from './queue';
import { RateLimiter } from './ratelimit';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const TYPICAL = { 'release-embedder': 1000, generator: 21_000, embedder: 3000, check: 1000 };
const direct = (work: (s: AbortSignal) => Promise<ModelState>) => work(new AbortController().signal);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Waits until the state machine leaves "unloading" (a release confirmed), at most 2 s. */
async function settled(m: Models) {
  for (let i = 0; i < 200 && m.state() === 'unloading'; i++) await sleep(10);
  return m.state();
}

async function machine() {
  // The order: a full load is generator first (it evicts a resident bge-m3, step 3.5), then bge-m3, then the check.
  check('full load order', plan('idle', 'ready').join() === 'generator,embedder,check');
  check('search load: bge-m3 only', plan('idle', 'search').join() === 'embedder,check');
  check('search to ready releases bge-m3 first', plan('search', 'ready').join() === 'release-embedder,generator,embedder,check');
  check('nothing to do when already there', plan('ready', 'ready').length === 0 && plan('ready', 'search').length === 0);

  let on = false;
  const backend = new FakeModelBackend(20);
  const m = new Models({ backend, typicalMs: TYPICAL, switchOn: () => on });
  check('switch off: state off', m.state() === 'off');
  check('off serves nothing', !m.serves('ready') && !m.serves('search'));
  const refused = await m.start('ready', direct).catch((e: Error) => e.message);
  check('off refuses a load', refused === 'switch-off' && backend.calls.length === 0, String(refused));
  on = true;
  check('switch on: idle', m.state() === 'idle');
  check('the button shows the typical full load', m.view().typicalLoadMs === 25_000);

  const seen: ModelsView[] = [];
  const unsub = m.subscribe((v) => seen.push(v));
  const first = m.start('ready', direct);
  const second = m.start('ready', direct);
  check('a second request joins', m.joins('ready'));
  check('loading shows stages with typical times', m.view().state === 'loading' && m.view().stages?.map((s) => `${s.name}:${s.typicalMs}`).join() === 'generator:21000,embedder:3000,check:1000');
  const [a, b] = await Promise.all([first, second]);
  unsub();
  check('both requests reach ready', a === 'ready' && b === 'ready');
  check('single flight: each stage ran once', backend.calls.join() === 'generator,embedder,check', backend.calls.join());
  check('ready serves questions and search', m.serves('ready') && m.serves('search'));
  check('progress was published per stage', seen.some((v) => v.stages?.[0].status === 'running') && seen.some((v) => v.stages?.[1].status === 'done'));
  check('the running stage carries its elapsed time', seen.some((v) => v.stages?.some((s) => s.status === 'running' && typeof s.elapsedMs === 'number')));
  check('the finished view has no stages', m.view().stages === undefined);
  check('a load from ready does nothing', (await m.start('ready', direct)) === 'ready' && backend.calls.length === 3);
  on = false;
  check('switch off with models resident: "unloading", never "off"', m.state() === 'unloading' && !m.serves('ready'));
  await m.tick();
  check('the switch-off release targets both models', backend.calls.includes('release-all'), backend.calls.join());
  check('after a confirmed release: off', (await settled(m)) === 'off');
  on = true;
  check('switch on again: idle', m.state() === 'idle');
  await m.start('ready', direct);
  await m.lost('generator evicted');
  check('a lost model: the rest is released, idle, no reload by itself', m.state() === 'idle' && backend.calls.filter((c) => c === 'generator').length === 2 && backend.calls.filter((c) => c === 'release-all').length === 2, backend.calls.join());

  // Search first, then a full load: release bge-m3, then the fixed order.
  const b2 = new FakeModelBackend(5);
  const m2 = new Models({ backend: b2, typicalMs: TYPICAL, switchOn: () => true });
  check('search load reaches search', (await m2.start('search', direct)) === 'search' && b2.calls.join() === 'embedder,check');
  check('search serves retrieval only', m2.serves('search') && !m2.serves('ready'));
  await m2.start('ready', direct);
  check('search to ready in the safe order', b2.calls.join() === 'embedder,check,release-embedder,generator,embedder,check', b2.calls.join());

  // A full load asked for during a search load waits for it, then goes on.
  const b3 = new FakeModelBackend(5);
  const m3 = new Models({ backend: b3, typicalMs: TYPICAL, switchOn: () => true });
  const s = m3.start('search', direct);
  check('a full request does not join a search load', !m3.joins('ready') && m3.joins('search'));
  const r = await m3.start('ready', direct);
  await s;
  check('then goes on to ready', r === 'ready' && b3.calls.join() === 'embedder,check,release-embedder,generator,embedder,check', b3.calls.join());

  // Failures: no retry, back to idle, the stage named for the log, not for the visitor.
  for (const at of ['generator', 'embedder', 'check'] as const) {
    const bf = new FakeModelBackend(5, at);
    const logged: string[] = [];
    const mf = new Models({ backend: bf, typicalMs: TYPICAL, switchOn: () => true, log: (x) => logged.push(x) });
    const e = await mf.start('ready', direct).catch((x: unknown) => x);
    check(`failure at ${at}: LoadFailed for that stage`, e instanceof LoadFailed && e.stage === at, String(e));
    check(`failure at ${at}: released, then idle`, (await settled(mf)) === 'idle' && bf.calls.includes('release-all'), bf.calls.join());
    check(`failure at ${at}: not retried`, bf.calls.filter((c) => c === at).length === 1, bf.calls.join());
    check(`failure at ${at}: logged`, logged.some((l) => l.startsWith('model load failed')));
    check(`failure at ${at}: the view carries no reason`, !JSON.stringify(mf.view()).includes('purpose'));
    check(`failure at ${at}: cool-down shown`, (mf.view().retryAfterSec ?? 0) > 100);
    const again = await mf.start('ready', direct).catch((x: unknown) => x);
    check(`failure at ${at}: a new load waits for the cool-down`, again instanceof LoadRefused && again.code === 'cooldown');
  }
  const mi = new Models({ backend: new FakeModelBackend(0), typicalMs: TYPICAL, switchOn: () => true, initial: 'ready' });
  check('a server may start ready', mi.state() === 'ready');
}

/** Step 4.10b: switch off during a load, the idle release, a release that cannot be confirmed. */
async function releases() {
  // Switch off in the middle of the generator stage: the load is aborted and both models are released.
  let on = true;
  const slow = new FakeModelBackend(300);
  const m = new Models({ backend: slow, typicalMs: TYPICAL, switchOn: () => on });
  const loading = m.start('ready', direct).catch((x: unknown) => x);
  await sleep(50);
  on = false;
  check('switch off while loading: still "loading" until aborted', m.state() === 'loading');
  const ticking = m.tick();
  const e = await loading;
  check('the running load is aborted', e instanceof LoadFailed && e.stage === 'generator' && e.aborted, String(e));
  await ticking;
  check('then both models are released and the state is off', (await settled(m)) === 'off' && slow.calls.includes('release-all') && !slow.calls.includes('embedder'), slow.calls.join());
  on = true;
  check('an aborted load starts no cool-down', m.view().retryAfterSec === undefined);

  // The idle release: 15 minutes after the last question, not while a question runs.
  let t = 1_000_000;
  let busy = false;
  const b = new FakeModelBackend(1);
  const mi = new Models({ backend: b, typicalMs: TYPICAL, switchOn: () => true, now: () => t, busy: () => busy });
  await mi.start('ready', direct);
  t += 14 * 60_000;
  await mi.tick();
  check('14 minutes idle: still ready', mi.state() === 'ready');
  mi.touch();
  t += 14 * 60_000;
  await mi.tick();
  check('a question resets the idle time', mi.state() === 'ready');
  t += 2 * 60_000;
  busy = true;
  await mi.tick();
  check('no idle release while a question runs or waits', mi.state() === 'ready');
  busy = false;
  await mi.tick();
  check('16 minutes idle: released, idle', (await settled(mi)) === 'idle' && b.calls.includes('release-all'));

  // A release that cannot be confirmed: "unloading" stays, the reason is logged, it is checked again, no new load.
  let failures = 2;
  const logged: string[] = [];
  const stubborn: ModelBackend = {
    ...new FakeModelBackend(1),
    loadGenerator: async () => undefined,
    loadEmbedder: async () => undefined,
    releaseEmbedder: async () => undefined,
    check: async () => null,
    releaseAll: async () => (failures-- > 0 ? 'still listed by /api/ps after 15 s: qwen3.8:27b' : null),
  };
  let t2 = 5_000_000;
  const ms = new Models({ backend: stubborn, typicalMs: TYPICAL, switchOn: () => true, now: () => t2, releaseRetryMs: 30_000, log: (x) => logged.push(x) });
  await ms.start('ready', direct);
  void ms.unload('test');
  await sleep(10);
  check('unconfirmed release: still "unloading"', ms.state() === 'unloading');
  check('unconfirmed release: the reason is logged', logged.some((l) => l.includes('release not confirmed') && l.includes('qwen3.8:27b')));
  const st = ms.releaseStatus();
  check('unconfirmed release: the owner view has reason, problem and next check', st.pending && st.problem?.includes('qwen3.8:27b') === true && st.nextCheckInSec === 30, JSON.stringify(st));
  check('unconfirmed release: the visitor view has no reason', !JSON.stringify(ms.view()).includes('qwen'));
  const refused = await ms.start('ready', direct).catch((x: unknown) => x);
  check('unconfirmed release: no new load', refused instanceof LoadRefused && refused.code === 'unloading');
  await ms.tick();
  check('not checked again before the interval', ms.state() === 'unloading' && logged.filter((l) => l.includes('release not confirmed')).length === 1);
  t2 += 30_000;
  await ms.tick();
  check('checked again after the interval, still not confirmed', ms.state() === 'unloading' && logged.filter((l) => l.includes('release not confirmed')).length === 2);
  t2 += 30_000;
  await ms.tick();
  check('confirmed on a later check: idle', ms.state() === 'idle' && !ms.releaseStatus().pending);
}

/** A fake Ollama behind fetch, for the real backend: loads, releases, /api/ps, a model that appears late. */
function fakeOllama(o: { lateMs?: number; stuck?: string[] } = {}) {
  const loaded = new Map<string, PsModel>();
  const calls: string[] = [];
  const add = (name: string, size: number, ctx?: number) => loaded.set(name, { name, model: name, size, size_vram: size, ...(ctx ? { context_length: ctx } : {}) });
  const fetchFn = (async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push(`${path}${body.model ? ' ' + String(body.model) : ''}${body.keep_alive === 0 ? ' stop' : ''}`);
    const json = (x: unknown) => new Response(JSON.stringify(x), { status: 200, headers: { 'content-type': 'application/json' } });
    if (path === '/health') return json({ model: 'BAAI/bge-reranker-v2-m3', device: 'cuda' });
    if (path === '/api/ps') return json({ models: [...loaded.values()] });
    if (path === '/api/generate' && body.keep_alive === 0) {
      if (!o.stuck?.includes(String(body.model))) loaded.delete(String(body.model));
      return json({ done: true });
    }
    if (path === '/api/chat') {
      // Ollama goes on loading after the client gave up: the model appears late, whatever the signal says.
      const done = () => add('qwen3.8:27b', 17e9, 17408);
      if (o.lateMs) setTimeout(done, o.lateMs);
      await new Promise<void>((resolve, reject) => {
        const tm = setTimeout(() => (o.lateMs ? undefined : done(), resolve()), o.lateMs ? o.lateMs + 1000 : 5);
        init?.signal?.addEventListener('abort', () => (clearTimeout(tm), reject(init.signal?.reason)), { once: true });
      });
      return json({ done: true });
    }
    if (path === '/api/embed') {
      add('bge-m3:latest', 1.1e9);
      return json({ embeddings: [[0]] });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
  return { fetchFn, loaded, calls };
}

async function ollama() {
  const base = { baseUrl: 'http://box.test:11434', rerankUrl: 'http://box.test:11435', generator: 'qwen3.8:27b', numCtx: 17408, embedder: 'bge-m3', keepAlive: '60m', reranker: 'bge-reranker-v2-m3' };

  // A normal load and release through the real backend.
  const f = fakeOllama();
  const be = new OllamaModelBackend({ ...base, fetchFn: f.fetchFn, pollMs: 5, releaseWaitMs: 500 });
  const lines: string[] = [];
  const m = new Models({ backend: be, typicalMs: TYPICAL, switchOn: () => true, log: (x) => lines.push(x) });
  check('real backend: full load reaches ready', (await m.start('ready', direct)) === 'ready');
  check('real backend: generator loaded before bge-m3', f.calls.indexOf('/api/chat qwen3.8:27b') < f.calls.indexOf('/api/embed bge-m3'), f.calls.join());
  check('the log gives each stage time', lines.some((l) => /^models loaded to ready: generator [\d.]+ s, embedder [\d.]+ s, check [\d.]+ s$/.test(l)), lines.join(' | '));
  await m.unload('test');
  check('the log gives the release time', lines.some((l) => /^models released \(test\) in [\d.]+ s$/.test(l)), lines.join(' | '));
  check('real backend: release confirmed by /api/ps, generator stopped first', m.state() === 'idle' && f.loaded.size === 0 && f.calls.indexOf('/api/generate qwen3.8:27b stop') < f.calls.indexOf('/api/generate bge-m3:latest stop'), f.calls.join());

  // Abort during the generator stage; Ollama finishes the load a moment later; the release still clears it.
  let on = true;
  const late = fakeOllama({ lateMs: 120 });
  const bl = new OllamaModelBackend({ ...base, fetchFn: late.fetchFn, pollMs: 20, releaseWaitMs: 1000 });
  const ml = new Models({ backend: bl, typicalMs: TYPICAL, switchOn: () => on, lateLoadWatchMs: 300 });
  const loading = ml.start('ready', direct).catch((x: unknown) => x);
  await sleep(30);
  on = false;
  const ticking = ml.tick();
  const e = await loading;
  check('late model: the load was aborted', e instanceof LoadFailed && e.stage === 'generator', String(e));
  check('late model: still "unloading" while the release watches for a late model', ml.state() === 'unloading');
  await ticking;
  check('late model: released after it appeared, then off', (await settled(ml)) === 'off' && late.loaded.size === 0, JSON.stringify([...late.loaded.keys()]));
  check('late model: the release was sent again once the model showed up', late.calls.filter((c) => c === '/api/generate qwen3.8:27b stop').length >= 2, late.calls.join());

  // Models left loaded by a previous server are found at start-up and released (review of 18 Nov 2026).
  const left = fakeOllama();
  left.loaded.set('qwen3.8:27b', { name: 'qwen3.8:27b', model: 'qwen3.8:27b', size: 17e9, size_vram: 17e9, context_length: 17408 });
  left.loaded.set('bge-m3:latest', { name: 'bge-m3:latest', model: 'bge-m3:latest', size: 1.1e9, size_vram: 1.1e9 });
  const lb = new OllamaModelBackend({ ...base, fetchFn: left.fetchFn, pollMs: 5, releaseWaitMs: 500 });
  const lm = new Models({ backend: lb, typicalMs: TYPICAL, switchOn: () => true });
  const { leftoverModels } = await import('./residency');
  const found = await leftoverModels({ ...base, fetchFn: left.fetchFn });
  check('start-up: leftovers found', found.join() === 'qwen3.8:27b,bge-m3', found.join());
  const releasing = lm.releaseLeftovers(found);
  check('start-up: "unloading" while they are released, never "idle"', lm.state() === 'unloading');
  await releasing;
  check('start-up: released, then idle, /api/ps empty', lm.state() === 'idle' && left.loaded.size === 0);
  const none = new Models({ backend: lb, typicalMs: TYPICAL, switchOn: () => true });
  await none.releaseLeftovers([]);
  check('start-up: nothing found, nothing done', none.state() === 'idle');

  // A model that /api/ps keeps listing: the release is reported unconfirmed and the state stays "unloading".
  const stuck = fakeOllama({ stuck: ['qwen3.8:27b'] });
  const bs = new OllamaModelBackend({ ...base, fetchFn: stuck.fetchFn, pollMs: 5, releaseWaitMs: 60 });
  const msk = new Models({ backend: bs, typicalMs: TYPICAL, switchOn: () => true, releaseRetryMs: 60_000 });
  await msk.start('ready', direct);
  void msk.unload('test');
  await sleep(200);
  check('stuck model: still "unloading"', msk.state() === 'unloading');
  check('stuck model: the problem names it', msk.releaseStatus().problem?.includes('qwen3.8:27b') === true, JSON.stringify(msk.releaseStatus()));
}

async function http() {
  const deps: AskDeps = { retrieval: await fakeRetrieval(), generator: new DryRunGenerator(0), engine: FAKE_ENGINE, k: 10 };
  let on = true;
  const backend = new FakeModelBackend(30);
  const models = new Models({ backend, typicalMs: TYPICAL, switchOn: () => on });
  const log = new MemoryLog();
  const limiter = new RateLimiter({ perHour: 100, perDay: 100, globalPerDay: 1000 });
  const loadLimiter = new RateLimiter({ perHour: 2, perDay: 6, globalPerDay: 30 });
  const app = createApp(deps, {
    maxQuestionChars: 500,
    queue: new GpuQueue(5, 60_000),
    limiter,
    log,
    probe: { up: async () => true },
    trustProxy: 'none',
    paused: () => false,
    models,
    loadLimiter,
  });
  const srv = await new Promise<{ url: string; close: () => void }>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
  });
  const ask = () => fetch(`${srv.url}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'Why were wide ranges kept?' }) });
  const load = (accept = 'application/json', body = '{}') => fetch(`${srv.url}/api/models/load`, { method: 'POST', headers: { 'content-type': 'application/json', accept }, body });
  try {
    const h = (await (await fetch(`${srv.url}/api/health`)).json()) as { models: ModelsView };
    check('health carries the models view', h.models.state === 'idle');
    check('GET /api/models', ((await (await fetch(`${srv.url}/api/models`)).json()) as ModelsView).state === 'idle');

    const before = limiter.take(limiter.visitor('127.0.0.1'));
    const q = await ask();
    const qb = (await q.json()) as { error: string; message: string };
    check('a question before loading: 503 not-loaded', q.status === 503 && qb.error === 'not-loaded' && qb.message === MESSAGES['not-loaded']);
    const after = limiter.take(limiter.visitor('127.0.0.1'));
    check('the refused question is given back to the limit', before.ok && after.ok && before.remainingToday - 1 === after.remainingToday, JSON.stringify([before, after]));
    check('no GPU work for a refused question', backend.calls.length === 0);

    const bad = await load('application/json', '{"target":"everything"}');
    check('an unknown load target is refused with its own text', bad.status === 400 && !((await bad.json()) as { message: string }).message.includes('question'));

    // Streamed load: models events per stage, then the result.
    const s = await load('text/event-stream');
    const text = await s.text();
    check('load stream: one models event per stage change', (text.match(/event: models/g) ?? []).length >= 6, text.slice(0, 200));
    check('load stream ends with the result', /event: result\ndata: \{"models":\{"state":"ready"/.test(text), text.slice(-200));
    check('stages in order in the stream', text.indexOf('"name":"generator","status":"running"') < text.indexOf('"name":"embedder","status":"running"'));
    check('a question after loading is answered', (((await (await ask()).json()) as { outcome: string }).outcome) === 'answered');
    check('a load when ready costs nothing and says ready', (((await (await load()).json()) as { models: ModelsView }).models.state) === 'ready');
    check('the load is logged without a question', log.entries.some((e) => e.outcome === 'load-done' && e.question === undefined));

    // Limits: 2 started loads per visitor per hour (the streamed load above was the first); joining is free.
    await models.lost('test');
    const j1 = load();
    const j2 = load();
    const [r1, r2] = await Promise.all([j1, j2]);
    check('the second started load and a join both succeed', r1.ok && r2.ok);
    check('the join was not counted', log.entries.filter((e) => e.outcome === 'load-joined').length === 1);
    await models.lost('test');
    const fourth = await load();
    const fb = (await fourth.json()) as { error: string };
    check('the third started load in an hour is refused', fourth.status === 429 && fb.error === 'load-hour' && fourth.headers.get('retry-after') !== null);

    on = false;
    const offLoad = await load();
    check('switch off: load refused', offLoad.status === 503 && ((await offLoad.json()) as { error: string }).error === 'switch-off');
    const offAsk = await ask();
    check('switch off: question refused with the off text', offAsk.status === 503 && ((await offAsk.json()) as { error: string }).error === 'switch-off');
  } finally {
    srv.close();
  }
}

/** A failed load counts against the visitor, not the site (owner, 17 Nov 2026). */
async function failedLoadLimits() {
  const deps: AskDeps = { retrieval: await fakeRetrieval(), generator: new DryRunGenerator(0), engine: FAKE_ENGINE, k: 10 };
  const models = new Models({ backend: new FakeModelBackend(5, 'generator'), typicalMs: TYPICAL, switchOn: () => true, cooldownMs: 0 });
  const loadLimiter = new RateLimiter({ perHour: 2, perDay: 6, globalPerDay: 1 });
  const app = createApp(deps, { maxQuestionChars: 500, queue: new GpuQueue(5, 60_000), limiter: new RateLimiter({ perHour: 9, perDay: 9, globalPerDay: 9 }), log: new MemoryLog(), probe: { up: async () => true }, trustProxy: 'none', paused: () => false, models, loadLimiter });
  const srv = await new Promise<{ url: string; close: () => void }>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
  });
  const load = () => fetch(`${srv.url}/api/models/load`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  try {
    const a = await load();
    check('a failed load: 503 load-failed', a.status === 503 && ((await a.json()) as { error: string }).error === 'load-failed');
    await settled(models);
    const b = await load();
    check('the site total (1) is not used up by the failure', ((await b.json()) as { error: string }).error === 'load-failed');
    await settled(models);
    const c = await load();
    check('the visitor limit (2 an hour) still counts failures', c.status === 429 && ((await c.json()) as { error: string }).error === 'load-hour');
  } finally {
    srv.close();
  }
}

/** Step 4.10d: a load stopped by the switch tells the visitor the switch is off, and costs no load. */
async function abortedLoadMessage() {
  const deps: AskDeps = { retrieval: await fakeRetrieval(), generator: new DryRunGenerator(0), engine: FAKE_ENGINE, k: 10 };
  let on = true;
  const models = new Models({ backend: new FakeModelBackend(300), typicalMs: TYPICAL, switchOn: () => on, lateLoadWatchMs: 0 });
  const loadLimiter = new RateLimiter({ perHour: 1, perDay: 6, globalPerDay: 30 });
  const qLimiter = new RateLimiter({ perHour: 9, perDay: 9, globalPerDay: 9 });
  const app = createApp(deps, { maxQuestionChars: 500, queue: new GpuQueue(5, 60_000), limiter: qLimiter, log: new MemoryLog(), probe: { up: async () => true }, trustProxy: 'none', paused: () => false, models, loadLimiter });
  const srv = await new Promise<{ url: string; close: () => void }>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
  });
  try {
    const pending = fetch(`${srv.url}/api/models/load`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    await sleep(60);
    on = false;
    await models.tick();
    const r = await pending;
    check('a load stopped by the switch answers switch-off, not load-failed', r.status === 503 && ((await r.json()) as { error: string }).error === 'switch-off');
    await settled(models);
    on = true;
    check('and is given back to the visitor (limit 1 an hour still free)', loadLimiter.take(qLimiter.visitor('127.0.0.1')).ok);
  } finally {
    srv.close();
  }
}

async function main() {
  await abortedLoadMessage();
  await machine();
  await releases();
  await ollama();
  await failedLoadLimits();
  await http();
  console.log(`models: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
