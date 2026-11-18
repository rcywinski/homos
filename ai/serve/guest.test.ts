/**
 * Tests for step 4.6a, guest-key mode on the server: the request body equals the measured one, tickets, the
 * verification of a posted answer, the key refusal, limits and size, and the "search" load from every state.
 * Offline: fake models only, no call to the box or to Anthropic.
 * Run: npx tsx ai/serve/guest.test.ts
 */
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { existsSync, readFileSync } from 'fs';
import type { AddressInfo } from 'net';
import path from 'path';
import { ANSWER_SCHEMA, ANSWER_SYSTEM, answerUserPrompt } from '../answer/prompt';
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { createApp, GUEST_VERIFY_MAX_BYTES } from './app';
import type { AskDeps, AskResponse } from './ask';
import { DryRunGenerator, FAKE_ENGINE, FakeModelBackend, fakeRetrieval } from './fake-engine';
import { GUEST_MAX_TOKENS, guestRequestBody, maskChunk, MEASURED_ANSWER_SCHEMA, parseGuestAnswer, Tickets } from './guest';
import { MemoryLog } from './log';
import { MASK } from './mask';
import { Models } from './models-state';
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
const TYPICAL = { 'release-embedder': 1000, generator: 21_000, embedder: 2600, check: 200 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const FAKE_KEY = 'sk-ant-api03-test-not-a-real-key';

function unit() {
  // The schema the SDK sent in the measured runs, without importing the SDK on the server.
  const sdk = jsonSchemaOutputFormat(ANSWER_SCHEMA as unknown as Parameters<typeof jsonSchemaOutputFormat>[0]);
  check('answer schema equals the SDK transform of the measured runs', JSON.stringify(sdk.schema) === JSON.stringify(MEASURED_ANSWER_SCHEMA), JSON.stringify(sdk.schema));

  const chunk: Chunk = { id: 'journal/CONTEXT.md:10', file: 'journal/CONTEXT.md', lineStart: 10, lineEnd: 12, kind: 'journal-entry', title: 'Serwer 192.168.1.8', text: 'Serwer w LAN pod 192.168.1.8:8787 działa.' } as Chunk;
  const masked = maskChunk(chunk);
  check('chunks are masked, also the title', !masked.text.includes('192.168') && masked.text.includes(MASK) && !masked.title.includes('192.168'));
  const body = guestRequestBody('Where did the server run?', [masked]);
  check('request: the measured model and effort', body.model === 'claude-sonnet-5-5' && body.output_config.effort === 'medium');
  check('request: the max_tokens cap', body.max_tokens === GUEST_MAX_TOKENS && GUEST_MAX_TOKENS === 2048);
  check('request: the measured system prompt', body.system === ANSWER_SYSTEM);
  check('request: the measured user prompt over the masked chunks', body.messages[0].content === answerUserPrompt('Where did the server run?', [masked]) && !JSON.stringify(body).includes('192.168'));
  check('request: no key and no header in the body', !JSON.stringify(body).includes('sk-ant') && !('headers' in body));

  // Tickets.
  let t = 1_000_000;
  const tickets = new Tickets('corpus-a', 600_000, () => t);
  const tk = tickets.issue('Why wide ranges?', ['a:1', 'b:2']);
  const ok = tickets.check(tk, 'Why wide ranges?');
  check('ticket: valid', ok.ok && ok.ids.join() === 'a:1,b:2');
  check('ticket: another question', !tickets.check(tk, 'Why narrow ranges?').ok);
  const [body64, sig] = tk.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body64, 'base64url').toString()), ids: ['c:3'] })).toString('base64url');
  const f = tickets.check(`${forged}.${sig}`, 'Why wide ranges?');
  check('ticket: other chunk ids with the old signature', !f.ok && f.problem === 'signature');
  const s2 = tickets.check(`${body64}.${sig.slice(0, -2)}AA`, 'Why wide ranges?');
  check('ticket: a changed signature', !s2.ok && s2.problem === 'signature');
  check('ticket: malformed', ['', 'x', 'a.b.c', 42, null].every((x) => !tickets.check(x, 'Why wide ranges?').ok));
  const restarted = new Tickets('corpus-a', 600_000, () => t);
  const r = restarted.check(tk, 'Why wide ranges?');
  check('ticket: after a restart (new secret) it fails', !r.ok && r.problem === 'signature');
  const other = new Tickets('corpus-b', 600_000, () => t, (tickets as unknown as { secret: Buffer }).secret);
  const oc = other.check(tk, 'Why wide ranges?');
  check('ticket: a rebuilt index (other corpus hash) refuses it', !oc.ok && oc.problem === 'corpus');
  t += 600_001;
  const ex = tickets.check(tk, 'Why wide ranges?');
  check('ticket: expired after 10 minutes', !ex.ok && ex.problem === 'expired');

  // The posted answer.
  check('answer: valid shape', parseGuestAnswer({ answer: 'x', coverage: 'partial', citations: [{ chunkId: 'a', quote: 'b' }] }) !== null);
  check('answer: invalid shapes refused', [null, [], 'x', { answer: 'x' }, { answer: 1, coverage: 'full', citations: [] }, { answer: 'x', coverage: 'most', citations: [] }, { answer: 'x', coverage: 'full', citations: [], extra: 1 }, { answer: 'x', coverage: 'full', citations: [{ chunkId: 'a', quote: 'b', note: 'c' }] }, { answer: 'x', coverage: 'full', citations: Array(21).fill({ chunkId: 'a', quote: 'b' }) }].every((x) => parseGuestAnswer(x) === null));
}

async function http() {
  const corpus = new Map(loadCorpus().map((c) => [c.id, c]));
  const deps: AskDeps = { retrieval: await fakeRetrieval(), generator: new DryRunGenerator(0), engine: FAKE_ENGINE, k: 10 };
  let on = true;
  let now = 10_000_000;
  const backend = new FakeModelBackend(5);
  const models = new Models({ backend, typicalMs: TYPICAL, switchOn: () => on, now: () => now });
  const log = new MemoryLog();
  const limiter = new RateLimiter({ perHour: 100, perDay: 100, globalPerDay: 1000 });
  const verifyLimiter = new RateLimiter({ perHour: 4, perDay: 100, globalPerDay: 1000 });
  const loadLimiter = new RateLimiter({ perHour: 10, perDay: 10, globalPerDay: 100 });
  const tickets = new Tickets('served-corpus');
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
    guest: { tickets, chunkById: (id) => corpus.get(id), verifyLimiter },
  });
  const srv = await new Promise<{ url: string; close: () => void }>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
  });
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${srv.url}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const Q = 'Why were the ranges kept wide?';
  try {
    // Before any load: retrieval needs the search state.
    const idle = await post('/api/guest/retrieve', { question: Q });
    check('retrieve before a load: 503 search-not-loaded', idle.status === 503 && ((await idle.json()) as { error: string }).error === 'search-not-loaded');

    // "Load search" from idle: bge-m3 only.
    const ls = (await (await post('/api/models/load', { target: 'search' })).json()) as { models: { state: string } };
    check('load search from idle reaches search, generator untouched', ls.models.state === 'search' && backend.calls.join() === 'embedder,check', backend.calls.join());
    const again = (await (await post('/api/models/load', { target: 'search' })).json()) as { models: { state: string } };
    check('load search from search is a no-op', again.models.state === 'search' && backend.calls.length === 2);

    // Retrieve.
    const t0 = now;
    now += 10 * 60_000;
    const rr = await post('/api/guest/retrieve', { question: Q });
    const rb = (await rr.json()) as { request: ReturnType<typeof guestRequestBody>; sources: { chunkId: string }[]; ticket: string; engine: { id: string } };
    check('retrieve: the request body, ten sources and a ticket', rr.ok && rb.request.model === 'claude-sonnet-5-5' && rb.sources.length === 10 && typeof rb.ticket === 'string' && rb.engine.id === 'guest-key');
    check('retrieve: the body is the measured request over the masked chunks', rb.request.messages[0].content === answerUserPrompt(Q, rb.sources.map((s) => maskChunk(corpus.get(s.chunkId)!))));
    check('retrieve: logged with the engine guest-key', log.entries.some((e) => e.outcome === 'guest-retrieved' && e.engine === 'guest-key' && e.question === Q));
    // A retrieval counts as use: 6 more minutes (16 since the load) must not release the models.
    now += 6 * 60_000;
    await models.tick();
    check('a guest retrieval resets the 15-minute idle timer', models.state() === 'search' && now - t0 > 15 * 60_000);

    // Verify: an answer quoting the first source word for word.
    const first = maskChunk(corpus.get(rb.sources[0].chunkId)!);
    const quote = first.text.split(/\s+/).slice(2, 12).join(' ');
    const answer = { answer: 'The ranges stayed wide for 720 days of tests.', coverage: 'partial', citations: [{ chunkId: first.id, quote }, { chunkId: first.id, quote: 'a sentence that is not in the source at all' }] };
    const vr = await post('/api/guest/verify', { question: Q, ticket: rb.ticket, answer });
    const v = (await vr.json()) as AskResponse;
    check('verify: answered, in the /api/ask shape', vr.ok && v.outcome === 'answered' && v.engine.id === 'guest-key' && v.sources.length === 10, JSON.stringify(v).slice(0, 200));
    check('verify: the real quote verified, the made-up one not', v.citations[0]?.status === 'verified' && v.citations[1]?.status === 'not-verified', JSON.stringify(v.citations));
    check('verify: numbers marked', v.numbers.some((n) => n.text === '720'));
    check('verify: the answer text is not logged', !log.entries.some((e) => JSON.stringify(e).includes('720 days')));

    const bad = (await (await post('/api/guest/verify', { question: Q, ticket: rb.ticket, answer: { answer: 'x' } })).json()) as AskResponse;
    check('verify: an invalid answer gives the fixed "failed" text', bad.outcome === 'failed');
    const none = (await (await post('/api/guest/verify', { question: Q, ticket: rb.ticket, answer: { answer: 'The sources do not cover it.', coverage: 'none', citations: [] } })).json()) as AskResponse;
    check('verify: "not in the data" with the explanation under it', none.outcome === 'not-in-data' && none.explanation?.text === 'The sources do not cover it.');

    // Verify limit: 4 an hour, three used above.
    const fourth = await post('/api/guest/verify', { question: Q, ticket: rb.ticket, answer });
    const fifth = await post('/api/guest/verify', { question: Q, ticket: rb.ticket, answer });
    check('verify: under its own per-visitor limit', fourth.ok && fifth.status === 429 && ((await fifth.json()) as { error: string }).error === 'hour');

    // Tickets that fail: another question, a forged ticket, a restart.
    const verify2 = new RateLimiter({ perHour: 100, perDay: 100, globalPerDay: 1000 });
    // Fresh limits for the rest: a second app shares the models and the ticket secret.
    const app2 = createApp(deps, { maxQuestionChars: 500, queue: new GpuQueue(5, 60_000), limiter, log, probe: { up: async () => true }, trustProxy: 'none', paused: () => false, models, loadLimiter, guest: { tickets, chunkById: (id) => corpus.get(id), verifyLimiter: verify2 } });
    const srv2 = await new Promise<{ url: string; close: () => void }>((resolve) => {
      const s = app2.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
    });
    const post2 = (path: string, body: unknown) => fetch(`${srv2.url}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
    try {
      const wrongQ = await post2('/api/guest/verify', { question: 'Another question?', ticket: rb.ticket, answer });
      const wq = (await wrongQ.json()) as { error: string; message: string };
      check('verify: a ticket for another question is refused with "ask again"', wrongQ.status === 400 && wq.error === 'ticket' && wq.message.includes('Please ask again'));
      const forged = await post2('/api/guest/verify', { question: Q, ticket: rb.ticket.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), answer });
      check('verify: a forged ticket is refused', forged.status === 400);
      const big = await post2('/api/guest/verify', { question: Q, ticket: rb.ticket, answer: { answer: 'x'.repeat(GUEST_VERIFY_MAX_BYTES), coverage: 'full', citations: [] } });
      check('verify: a body over 16 KB is refused (413)', big.status === 413);

      // Verify needs no model: after a release it still works; only the switch stops it.
      await models.unload('test');
      check('models released', models.state() === 'idle');
      const idleVerify = await post2('/api/guest/verify', { question: Q, ticket: rb.ticket, answer });
      check('verify works with no model loaded', idleVerify.ok && ((await idleVerify.json()) as AskResponse).outcome === 'answered');
      on = false;
      const offVerify = await post2('/api/guest/verify', { question: Q, ticket: rb.ticket, answer });
      check('verify is refused when the owner switch is off', offVerify.status === 503 && ((await offVerify.json()) as { error: string }).error === 'switch-off');
      on = true;
    } finally {
      srv2.close();
    }

    // "Load search" from ready is a no-op and keeps the generator; a chat load from search pays one load, in order.
    backend.calls.length = 0;
    await post('/api/models/load', { target: 'search' });
    // The server hashes the visitor with the question limiter's daily salt.
    const me = limiter.visitor('127.0.0.1');
    const before = loadLimiter.take(me);
    loadLimiter.refund(me);
    const full = (await (await post('/api/models/load', {})).json()) as { models: { state: string } };
    const afterFull = loadLimiter.take(me);
    loadLimiter.refund(me);
    check('chat load from search: release bge-m3 first, then the fixed order', full.models.state === 'ready' && backend.calls.join() === 'embedder,check,release-embedder,generator,embedder,check', backend.calls.join());
    check('chat load from search costs one load', before.ok && afterFull.ok && before.remainingToday - afterFull.remainingToday === 1, JSON.stringify([before, afterFull]));
    const n = backend.calls.length;
    const fromReady = (await (await post('/api/models/load', { target: 'search' })).json()) as { models: { state: string } };
    check('load search from ready is a no-op, the generator stays', fromReady.models.state === 'ready' && backend.calls.length === n);
    await sleep(1);

    // The key refusal: in the question, in a header, in the query string. Logged as the outcome only.
    const logBefore = log.entries.length;
    const inBody = await post('/api/guest/retrieve', { question: `my key is ${FAKE_KEY}` });
    const inHeader = await post('/api/ask', { question: Q }, { 'x-api-key': FAKE_KEY });
    const inQuery = await fetch(`${srv.url}/api/health?key=${FAKE_KEY}`);
    const inVerify = await post('/api/guest/verify', { question: Q, ticket: rb.ticket, answer: { answer: FAKE_KEY, coverage: 'full', citations: [] } });
    for (const [name, r] of [['question', inBody], ['header', inHeader], ['query string', inQuery], ['verify answer', inVerify]] as const) {
      const text = await r.text();
      check(`key in the ${name}: 400 key-refused`, r.status === 400 && JSON.parse(text).error === 'key-refused', text);
      check(`key in the ${name}: the response does not echo it`, !text.includes(FAKE_KEY));
    }
    const lines = log.entries.slice(logBefore);
    check('key refusals: four log lines, outcome only', lines.length === 4 && lines.every((e) => e.outcome === 'refused-key' && e.question === undefined && e.detail === undefined), JSON.stringify(lines));
    check('key refusals: the key is nowhere in the log', !JSON.stringify(log.entries).includes('sk-ant'));
  } finally {
    srv.close();
  }
}

/** The server's import graph, from server-cli.ts: no Anthropic SDK and no dotenv (the repo .env holds the owner's key). */
function importGraph() {
  const seen = new Set<string>();
  const external = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/^\s*import\s+(?:type\s+)?[^;]*?from\s+'([^']+)'/gm)) {
      if (/^\s*import\s+type\s/.test(m[0])) continue;
      const spec = m[1];
      if (!spec.startsWith('.')) {
        external.add(spec);
        continue;
      }
      const base = path.resolve(path.dirname(file), spec);
      const f = ['.ts', '.mts', '/index.ts'].map((x) => base + x).find((x) => existsSync(x));
      if (f) visit(f);
    }
  };
  visit(path.resolve('ai/serve/server-cli.ts'));
  check('server import graph reaches the guest module', [...seen].some((f) => f.endsWith(path.join('serve', 'guest.ts'))));
  check('server import graph has no Anthropic SDK', ![...external].some((x) => x.startsWith('@anthropic-ai/')), [...external].join());
  check('server import graph has no dotenv', !external.has('dotenv'), [...external].join());
}

async function main() {
  importGraph();
  unit();
  await http();
  console.log(`guest: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
