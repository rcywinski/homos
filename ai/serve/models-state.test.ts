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
import { LoadFailed, Models, plan, type ModelState, type ModelsView } from './models-state';
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
  check('switch off wins over ready', m.state() === 'off' && !m.serves('ready'));
  on = true;
  m.lost('generator evicted');
  check('a lost model drops to idle, no reload by itself', m.state() === 'idle' && backend.calls.length === 3);

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
    const mf = new Models({ backend: bf, typicalMs: TYPICAL, switchOn: () => true, logFailure: (x) => logged.push(x) });
    const e = await mf.start('ready', direct).catch((x: unknown) => x);
    check(`failure at ${at}: LoadFailed for that stage`, e instanceof LoadFailed && e.stage === at, String(e));
    check(`failure at ${at}: back to idle`, mf.state() === 'idle');
    check(`failure at ${at}: not retried`, bf.calls.filter((c) => c === at).length === 1, bf.calls.join());
    check(`failure at ${at}: logged`, logged.length === 1);
    check(`failure at ${at}: the view carries no reason`, !JSON.stringify(mf.view()).includes('purpose'));
  }
  const mi = new Models({ backend: new FakeModelBackend(0), typicalMs: TYPICAL, switchOn: () => true, initial: 'ready' });
  check('the real engine before 4.10b starts ready', mi.state() === 'ready');
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

    check('a search load has no public control yet', (await load('application/json', '{"target":"search"}')).status === 400);

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
    models.lost('test');
    const j1 = load();
    const j2 = load();
    const [r1, r2] = await Promise.all([j1, j2]);
    check('the second started load and a join both succeed', r1.ok && r2.ok);
    check('the join was not counted', log.entries.filter((e) => e.outcome === 'load-joined').length === 1);
    models.lost('test');
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

async function main() {
  await machine();
  await http();
  console.log(`models: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
