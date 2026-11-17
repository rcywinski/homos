/**
 * Tests for step 4.4: GPU queue, rate limits with daily-salted visitor hashes, request log, SSE, pause, offline and
 * the dry-run server started as a child process. Offline: fake models only, no call to the box.
 * Run: npx tsx ai/serve/queue.test.ts
 */
import { spawn } from 'child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import type { Generator, GeneratorResult } from '../answer/types';
import { createApp, MESSAGES, type AppOptions } from './app';
import type { AskDeps } from './ask';
import { DryRunGenerator, FAKE_ENGINE, fakeRetrieval } from './fake-engine';
import { FileLog, MemoryLog } from './log';
import { MASK } from './mask';
import { GpuQueue, JobCancelled, JobTimeout, QueueRefused } from './queue';
import { clientIp, RateLimiter } from './ratelimit';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deferred = () => {
  let resolve!: (v: string) => void;
  const p = new Promise<string>((r) => (resolve = r));
  return { p, resolve };
};

async function queueTests() {
  const q = new GpuQueue(2, 10_000);
  const a = deferred();
  const b = deferred();
  const order: string[] = [];
  const positions: string[] = [];
  const ja = q.run('A', () => (order.push('A'), a.p));
  const jb = q.run('B', () => (order.push('B'), b.p), { onPosition: (p, w) => positions.push(`B${p}/${w}`) });
  const jc = q.run('C', () => (order.push('C'), Promise.resolve('c')), { onPosition: (p, w) => positions.push(`C${p}/${w}`) });
  check('one job at a time', order.join() === 'A', order.join());
  check('state counts the waiting jobs', q.state().running && q.state().waiting === 2);
  const full = await q.run('D', async () => 'd').catch((e) => e);
  check('queue full is refused at once', full instanceof QueueRefused && full.reason === 'busy');
  const again = await q.run('A', async () => 'a2').catch((e) => e);
  check('one job per visitor', again instanceof QueueRefused && again.reason === 'visitor-pending');
  a.resolve('a');
  check('first result', (await ja) === 'a');
  await sleep(0);
  check('next job starts after the first settles', order.join() === 'A,B', order.join());
  check('waiting positions reported and moved up', positions.join() === 'B1/1,C2/2,C1/1', positions.join());
  b.resolve('b');
  check('fifo', (await jb) === 'b' && (await jc) === 'c' && order.join() === 'A,B,C');
  await sleep(0);
  check('queue empty afterwards', !q.state().running && q.state().waiting === 0);

  // Deadline: the visitor gets a timeout, but the next job waits until the abandoned work really ends.
  const t = new GpuQueue(2, 30);
  const slow = deferred();
  const started: string[] = [];
  const js = t.run('S', () => (started.push('S'), slow.p));
  const jn = t.run('N', async () => (started.push('N'), 'n'));
  const timedOut = await js.catch((e) => e);
  check('job past its deadline times out', timedOut instanceof JobTimeout);
  await sleep(20);
  check('the next job does not start while the GPU is still busy', started.join() === 'S', started.join());
  slow.resolve('late');
  check('the next job starts when the abandoned work ends', (await jn) === 'n' && started.join() === 'S,N');

  // A visitor who leaves while waiting is removed from the queue.
  const c = new GpuQueue(3, 10_000);
  const hold = deferred();
  const ran: string[] = [];
  const j1 = c.run('1', () => hold.p);
  const ctl = new AbortController();
  const j2 = c.run('2', async () => (ran.push('2'), 'x'), { signal: ctl.signal });
  const pos3: number[] = [];
  const j3 = c.run('3', async () => (ran.push('3'), 'y'), { onPosition: (p) => pos3.push(p) });
  ctl.abort();
  check('leaving while waiting cancels the job', (await j2.catch((e) => e)) instanceof JobCancelled);
  check('the others move up', pos3.join() === '2,1', pos3.join());
  hold.resolve('h');
  await j1;
  check('a cancelled job never runs', (await j3) === 'y' && ran.join() === '3');
}

function limiterTests() {
  let now = Date.UTC(2026, 10, 16, 10, 0, 0);
  const l = new RateLimiter({ perHour: 2, perDay: 3, globalPerDay: 4 }, () => now);
  const v1 = l.visitor('203.0.113.7');
  check('visitor hash is 16 hex characters', /^[0-9a-f]{16}$/.test(v1));
  check('the hash does not contain the address', !v1.includes('203'));
  check('same address, same day, same hash', l.visitor('203.0.113.7') === v1);
  check('different address, different hash', l.visitor('203.0.113.8') !== v1);
  check('first question allowed', l.take(v1).ok);
  check('second question allowed', l.take(v1).ok);
  const third = l.take(v1);
  check('hour limit', !third.ok && third.reason === 'hour' && third.retryAfterSec > 0 && third.retryAfterSec <= 3600, JSON.stringify(third));
  now += 3_600_001;
  check('allowed again after an hour', l.take(v1).ok);
  now += 3_600_001;
  const fourth = l.take(v1);
  check('day limit', !fourth.ok && fourth.reason === 'day', JSON.stringify(fourth));
  const v2 = l.visitor('198.51.100.1');
  check('other visitor still allowed', l.take(v2).ok);
  const v3 = l.visitor('198.51.100.2');
  const g = l.take(v3);
  check('global daily cap', !g.ok && g.reason === 'global', JSON.stringify(g));
  l.refund(v2);
  check('a refund gives the global slot back', l.take(v3).ok);
  now = Date.UTC(2026, 10, 17, 0, 0, 1);
  check('a new UTC day draws a new salt: hashes cannot be linked across days', l.visitor('203.0.113.7') !== v1);
  check('a new day resets the counters', l.take(l.visitor('203.0.113.7')).ok);

  check('socket address used by default', clientIp({ 'cf-connecting-ip': '1.2.3.4' }, '127.0.0.1', 'none') === '127.0.0.1');
  check('tunnel header used only when trusted', clientIp({ 'cf-connecting-ip': '1.2.3.4' }, '127.0.0.1', 'cloudflare') === '1.2.3.4');
  check('a malformed tunnel header is ignored', clientIp({ 'cf-connecting-ip': '1.2.3.4<script>' }, '127.0.0.1', 'cloudflare') === '127.0.0.1');
}

function logTests() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'homos-serve-log-'));
  try {
    writeFileSync(path.join(dir, '2026-09-01.jsonl'), '{}\n');
    writeFileSync(path.join(dir, '2026-11-01.jsonl'), '{}\n');
    writeFileSync(path.join(dir, 'notes.txt'), 'keep');
    const log = new FileLog(dir, () => Date.UTC(2026, 10, 16, 12));
    check('files older than 30 days are deleted at start', readdirSync(dir).sort().join() === '2026-11-01.jsonl,notes.txt', readdirSync(dir).join());
    log.write({ visitor: 'abcdef0123456789', outcome: 'answered', ms: 12, question: 'Where is 192.168.1.8?' });
    const line = readFileSync(path.join(dir, '2026-11-16.jsonl'), 'utf8');
    check('a log line holds the visitor hash', line.includes('abcdef0123456789'));
    check('questions are logged masked', line.includes(MASK) && !line.includes('192.168'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

class SlowGenerator implements Generator {
  readonly name = 'answer:slow';
  private readonly inner = new DryRunGenerator();
  constructor(private readonly gate: Promise<string>) {}
  async generate(q: string, chunks: Parameters<Generator['generate']>[1]): Promise<GeneratorResult> {
    await this.gate;
    return this.inner.generate(q, chunks);
  }
}

async function appTests() {
  const retrieval = await fakeRetrieval();
  const gate = deferred();
  const deps: AskDeps = { retrieval, generator: new SlowGenerator(gate.p), engine: FAKE_ENGINE, k: 10 };
  let paused = false;
  let up = true;
  const log = new MemoryLog();
  const opts: AppOptions = {
    maxQuestionChars: 500,
    queue: new GpuQueue(1, 60_000),
    limiter: new RateLimiter({ perHour: 3, perDay: 10, globalPerDay: 100 }),
    log,
    probe: { up: async () => up },
    trustProxy: 'cloudflare',
    paused: () => paused,
  };
  const app = createApp(deps, opts);
  const srv = await new Promise<{ url: string; close: () => void }>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
  });
  const ask = (question: string, ip: string, sse = false) =>
    fetch(`${srv.url}/api/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(sse ? { accept: 'text/event-stream' } : {}) },
      body: JSON.stringify({ question }),
    });
  try {
    // SSE: the first visitor runs, the second waits and sees its position, the third finds the queue full.
    const r1 = ask('Why did the project stay with wide ranges?', '203.0.113.1', true);
    await sleep(50);
    const r2 = ask('What happened on 27.08?', '203.0.113.2', true);
    await sleep(50);
    const h = (await (await fetch(`${srv.url}/api/health`)).json()) as { status: string; queue: { waiting: number } };
    check('health says busy when the queue is full', h.status === 'busy' && h.queue.waiting === 1, JSON.stringify(h));
    const r3 = await ask('When was the first position opened?', '203.0.113.3');
    const r3j = (await r3.json()) as { error: string; message: string };
    check('third visitor gets the busy message', r3.status === 503 && r3j.error === 'busy' && r3j.message === MESSAGES.busy, JSON.stringify(r3j));
    gate.resolve('go');
    const s1 = await (await r1).text();
    const s2 = await (await r2).text();
    check('stream has retrieving, generating and one result', /event: retrieving/.test(s1) && /event: generating/.test(s1) && (s1.match(/event: result/g) ?? []).length === 1, s1.slice(0, 300));
    check('waiting visitor saw its position', /event: queued\ndata: \{"position":1,"waiting":1\}/.test(s2), s2.slice(0, 200));
    const result = JSON.parse(s2.split('event: result\ndata: ')[1]) as { outcome: string; engine: { id: string }; citations: { status: string }[] };
    check('streamed result is the full verified answer', result.outcome === 'answered' && result.engine.id === 'fake' && result.citations[0]?.status === 'verified', JSON.stringify(result).slice(0, 200));
    check('no token stream: answer text appears only in the result event', !s1.split('event: result')[0].includes('Dry run'));

    // The refused third visitor got the question back.
    for (let i = 0; i < 3; i++) await ask('Why wide ranges?', '203.0.113.3');
    const limited = await ask('Why wide ranges?', '203.0.113.3');
    const lj = (await limited.json()) as { error: string; retryAfterSec: number };
    check('rate limit after 3 answered questions (the refused one was refunded)', limited.status === 429 && lj.error === 'hour' && lj.retryAfterSec > 0, JSON.stringify(lj));
    check('retry-after header', limited.headers.get('retry-after') !== null);

    // Advice is refused without queueing and without the probe.
    up = false;
    const adv = (await (await ask('Should I buy ETH now?', '203.0.113.4')).json()) as { outcome: string };
    check('advice refused even with the box down', adv.outcome === 'out-of-scope');
    const off = await ask('Why wide ranges?', '203.0.113.4');
    check('box down gives the offline message', off.status === 503 && ((await off.json()) as { error: string }).error === 'offline');
    check('health says model-offline', ((await (await fetch(`${srv.url}/api/health`)).json()) as { status: string }).status === 'model-offline');
    up = true;
    paused = true;
    const p = await ask('Why wide ranges?', '203.0.113.5');
    check('paused gives the paused message', p.status === 503 && ((await p.json()) as { error: string }).error === 'paused');
    check('health says paused', ((await (await fetch(`${srv.url}/api/health`)).json()) as { status: string }).status === 'paused');
    paused = false;

    // Logs: visitor hashes, never addresses.
    const logged = JSON.stringify(log.entries);
    check('log has entries', log.entries.length >= 8, String(log.entries.length));
    check('log never holds a client address', !logged.includes('203.0.113'), logged.slice(0, 200));
    check('log holds outcomes', logged.includes('"refused-busy"') && logged.includes('"limited-hour"') && logged.includes('"offline"') && logged.includes('"paused"'));
  } finally {
    srv.close();
  }
}

/** L7 (step 4.7): a visitor who leaves mid-answer cancels the generation and frees the slot at once. */
async function disconnectTests() {
  const retrieval = await fakeRetrieval();
  const generator = new DryRunGenerator(5000);
  const deps: AskDeps = { retrieval, generator, engine: FAKE_ENGINE, k: 10 };
  const log = new MemoryLog();
  const queue = new GpuQueue(0, 60_000);
  const app = createApp(deps, {
    maxQuestionChars: 500,
    queue,
    limiter: new RateLimiter({ perHour: 100, perDay: 100, globalPerDay: 1000 }),
    log,
    probe: { up: async () => true },
    trustProxy: 'cloudflare',
    paused: () => false,
  });
  const srv = await new Promise<{ url: string; close: () => void }>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
  });
  try {
    const leaving = new AbortController();
    const first = fetch(`${srv.url}/api/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream', 'cf-connecting-ip': '203.0.113.50' },
      body: JSON.stringify({ question: 'Why were the ranges kept wide?' }),
      signal: leaving.signal,
    }).catch(() => null);
    await sleep(300);
    check('the first question holds the GPU', queue.state().running);
    const t0 = Date.now();
    leaving.abort();
    await first;
    for (let i = 0; i < 50 && queue.state().running; i++) await sleep(20);
    check('leaving mid-answer frees the slot at once, not after the 5 s answer', !queue.state().running && Date.now() - t0 < 1500, `${Date.now() - t0} ms`);
    check('the generation was cancelled', generator.aborted === 1, String(generator.aborted));
    check('the cancellation is logged as such', log.entries.some((e) => e.outcome === 'cancelled'));
    // With no waiting places, the next visitor is served at once instead of hearing "busy".
    const next = await fetch(`${srv.url}/api/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.51' },
      body: JSON.stringify({ question: 'Should I buy ETH now?' }),
    });
    check('the next visitor is not told "busy"', next.status === 200, String(next.status));
    // The deadline cancels the generation too.
    const short = new GpuQueue(1, 100);
    const gen2 = new DryRunGenerator(5000);
    const timedOut = await short.run('v', (signal) => gen2.generate('q', [], signal)).catch((e) => e);
    await sleep(50);
    check('a job past its deadline is cancelled, and the slot freed', timedOut instanceof JobTimeout && gen2.aborted === 1 && !short.state().running);
  } finally {
    srv.close();
  }
}

/** The dry run exactly as CC-Win starts it: plain node with tsx, an env file, port 0, then one question. */
async function dryRunProcess() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'homos-serve-dry-'));
  const envFile = path.join(dir, 'serve.env');
  writeFileSync(envFile, `SERVE_ENGINE=fake\nSERVE_PORT=0\nSERVE_LOG_DIR=${path.join(dir, 'logs').replace(/\\/g, '/')}\nSERVE_PAUSE_FILE=${path.join(dir, 'PAUSED').replace(/\\/g, '/')}\nSERVE_SWITCH_FILE=${path.join(dir, 'SWITCH').replace(/\\/g, '/')}\nSERVE_FAKE_LOAD_MS=10\n`);
  // Step 4.10a: the dry run starts unloaded and loads only when the owner switch is on.
  writeFileSync(path.join(dir, 'SWITCH'), 'on\n');
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.INFERENCE_URL;
  delete env.RERANK_URL;
  const child = spawn(process.execPath, [`--env-file=${envFile}`, '--import', 'tsx', path.join('ai', 'serve', 'server-cli.ts')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  try {
    const url = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no ready line: ${out}`)), 60_000);
      const tick = setInterval(() => {
        const m = out.match(/ready on (http:\/\/127\.0\.0\.1:\d+)/);
        if (m) {
          clearTimeout(timer);
          clearInterval(tick);
          resolve(m[1]);
        }
      }, 100);
      child.on('exit', (code) => reject(new Error(`exited ${code}: ${out}`)));
    });
    check('dry run starts on loopback', url.startsWith('http://127.0.0.1:'));
    const loaded = (await (await fetch(`${url}/api/models/load`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()) as { models: { state: string } };
    check('dry run loads its fake models on request', loaded.models.state === 'ready', JSON.stringify(loaded));
    const r = (await (await fetch(`${url}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'Why wide ranges?' }) })).json()) as { outcome: string; engine: { label: string } };
    check('dry run answers, labelled as a dry run', r.outcome === 'answered' && r.engine.label.includes('dry run'), JSON.stringify(r).slice(0, 200));
    writeFileSync(path.join(dir, 'PAUSED'), '');
    const h = (await (await fetch(`${url}/api/health`)).json()) as { status: string };
    check('the pause file pauses the running server', h.status === 'paused');
    const page = await fetch(`${url}/`);
    const html = await page.text();
    check('the same server serves the built showcase (or says it is API only)', (page.status === 200 && html.includes('app.js')) || /API only/.test(out), `${page.status} ${out}`);
    check('dry run reports on the index', /dry run: .* (matches the corpus|not present)/.test(out), out);
  } finally {
    child.kill();
    await sleep(100);
    rmSync(dir, { recursive: true, force: true });
  }

  // With the real engine and a key in the environment the server refuses to start.
  const withKey = spawn(process.execPath, ['--import', 'tsx', path.join('ai', 'serve', 'server-cli.ts')], {
    env: { ...process.env, ANTHROPIC_API_KEY: 'sk-ant-test', INFERENCE_URL: 'http://box.invalid', RERANK_URL: 'http://box.invalid' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let err = '';
  withKey.stderr.on('data', (d) => (err += d));
  const code = await new Promise<number | null>((r) => withKey.on('exit', r));
  check('real server refuses to start with a key', code === 1 && err.includes('refusing to start') && err.includes('ANTHROPIC_API_KEY'), err);
}

async function main() {
  await queueTests();
  limiterTests();
  logTests();
  await appTests();
  await disconnectTests();
  await dryRunProcess();
  console.log(`queue: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
