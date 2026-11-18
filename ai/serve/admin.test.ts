/**
 * Tests for step 4.10c: the Cloudflare Access JWT check, the two-file owner switch and the admin routes.
 * Offline: an RSA key pair made here, a fake JWKS fetch, fake models.
 * Run: npx tsx ai/serve/admin.test.ts
 */
import { createSign, generateKeyPairSync } from 'crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { AccessConfigError, AccessVerifier, checkAccessConfig } from './access';
import { effectiveOn, OwnerSwitch } from './admin';
import { createApp } from './app';
import type { AskDeps } from './ask';
import { DryRunGenerator, FAKE_ENGINE, FakeModelBackend, fakeRetrieval } from './fake-engine';
import { MemoryLog } from './log';
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

const TEAM = 'testteam.cloudflareaccess.com';
const AUD = 'a'.repeat(64);
const EMAIL = 'owner@example.com';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(publicKey.export({ format: 'jwk' }) as object), kid: 'k1', kty: 'RSA', alg: 'RS256' };

function sign(claims: Record<string, unknown>, o: { kid?: string; alg?: string; key?: typeof privateKey } = {}) {
  const head = Buffer.from(JSON.stringify({ alg: o.alg ?? 'RS256', kid: o.kid ?? 'k1', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(o.key ?? privateKey).toString('base64url');
  return `${head}.${body}.${sig}`;
}
const now = () => Date.now();
const good = (extra: Record<string, unknown> = {}) => sign({ aud: [AUD], iss: `https://${TEAM}`, email: EMAIL, exp: Math.floor(now() / 1000) + 600, nbf: Math.floor(now() / 1000) - 10, ...extra });

function jwksFetch(state: { calls: number; fail?: boolean; keys?: unknown[] }) {
  return (async () => {
    state.calls++;
    if (state.fail) throw new Error('network');
    return new Response(JSON.stringify({ keys: state.keys ?? [jwk] }), { status: 200 });
  }) as unknown as typeof fetch;
}

async function verifier() {
  check('team domain must be *.cloudflareaccess.com', (() => {
    try {
      checkAccessConfig({ teamDomain: 'evil.example.com', aud: AUD, adminEmail: EMAIL });
      return false;
    } catch (e) {
      return e instanceof AccessConfigError;
    }
  })());
  const st = { calls: 0 };
  const v = new AccessVerifier({ teamDomain: TEAM, aud: AUD, adminEmail: EMAIL, fetchFn: jwksFetch(st) });
  const cases: [string, string | undefined, string][] = [
    ['missing', undefined, 'missing'],
    ['too long', 'a'.repeat(9000), 'too-long'],
    ['malformed', 'abc.def', 'malformed'],
    ['not base64 json', 'abc.def.ghi', 'malformed'],
    ['wrong algorithm', sign({ aud: [AUD] }, { alg: 'HS256' }), 'algorithm'],
    ['wrong signature', sign({ aud: [AUD], iss: `https://${TEAM}`, email: EMAIL, exp: Math.floor(now() / 1000) + 600 }, { key: other.privateKey }), 'signature'],
    ['expired', good({ exp: Math.floor(now() / 1000) - 120 }), 'expired'],
    ['not yet valid', good({ nbf: Math.floor(now() / 1000) + 300 }), 'not-yet-valid'],
    ['wrong audience', good({ aud: ['b'.repeat(64)] }), 'audience'],
    ['wrong issuer', good({ iss: 'https://other.cloudflareaccess.com' }), 'issuer'],
    ['no email (service token)', good({ email: undefined }), 'no-email'],
    ['someone else', good({ email: 'visitor@example.com' }), 'email'],
  ];
  for (const [name, token, reason] of cases) {
    const r = await v.verify(token);
    check(`jwt: ${name} -> ${reason}`, !r.ok && r.reason === reason, JSON.stringify(r));
  }
  check('jwt: valid', (await v.verify(good())).ok);
  check('jwt: e-mail compared trimmed and case-insensitively', (await v.verify(good({ email: ' Owner@Example.COM ' }))).ok);
  check('jwt: keys fetched once and cached', st.calls === 1, String(st.calls));
  const unknown = await v.verify(sign({ aud: [AUD] }, { kid: 'k2' }));
  check('jwt: an unknown kid does not refetch within 5 minutes', !unknown.ok && unknown.reason === 'unknown-key' && st.calls === 1);

  let t = Date.now();
  const st2 = { calls: 0, keys: [] as unknown[] };
  const v2 = new AccessVerifier({ teamDomain: TEAM, aud: AUD, adminEmail: EMAIL, fetchFn: jwksFetch(st2), now: () => t });
  const r0 = await v2.verify(good());
  check('jwt: no keys at all -> denied (fail closed)', !r0.ok && r0.reason === 'no-keys');
  st2.keys = [jwk];
  t += 6 * 60_000;
  check('jwt: keys fetched again after 5 minutes on an unknown kid', (await v2.verify(sign({ aud: [AUD], iss: `https://${TEAM}`, email: EMAIL, exp: Math.floor(t / 1000) + 600 }))).ok && st2.calls === 2);
  // Concurrent requests during the first fetch share it (review of 18 Nov 2026).
  const st4 = { calls: 0 };
  const v4 = new AccessVerifier({ teamDomain: TEAM, aud: AUD, adminEmail: EMAIL, fetchFn: jwksFetch(st4) });
  const both = await Promise.all([v4.verify(good()), v4.verify(good()), v4.verify(good())]);
  check('jwt: three concurrent first requests all pass, one fetch', both.every((r) => r.ok) && st4.calls === 1, JSON.stringify(both) + st4.calls);
  const st3 = { calls: 0, fail: true };
  const v3 = new AccessVerifier({ teamDomain: TEAM, aud: AUD, adminEmail: EMAIL, fetchFn: jwksFetch(st3) });
  const r3 = await v3.verify(good());
  check('jwt: a failing JWKS fetch -> denied', !r3.ok && r3.reason === 'no-keys');
}

function truthTable() {
  // Without the admin page: the master alone decides (today's behaviour).
  check('no page: master on -> on', effectiveOn('on', null, false) && effectiveOn('on', 'off', false));
  check('no page: master off -> off', !effectiveOn('off', 'on', false) && !effectiveOn(null, 'on', false));
  // With the admin page: both must say on; a missing page state is off (fail-safe).
  check('page: master on, page on -> on', effectiveOn('on', 'on', true));
  check('page: master on, page missing -> off (fail-safe)', !effectiveOn('on', null, true));
  check('page: master on, page off -> off', !effectiveOn('on', 'off', true));
  check('page: master off, page on -> off (the page cannot override the box)', !effectiveOn('off', 'on', true) && !effectiveOn(null, 'on', true));
  check('page: anything but "on" is off', !effectiveOn('ON ', 'yes', true) && !effectiveOn('1', 'on', true));
}

async function routes() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'homos-admin-'));
  const master = path.join(dir, 'SWITCH');
  const state = path.join(dir, 'state', 'admin-switch');
  const adminLog = path.join(dir, 'logs', 'admin.jsonl');
  writeFileSync(master, 'on\n');
  const sw = new OwnerSwitch(master, state, true, adminLog);
  check('switch: page unset at start, effective off', sw.page() === 'unset' && !sw.on());

  const deps: AskDeps = { retrieval: await fakeRetrieval(), generator: new DryRunGenerator(0), engine: FAKE_ENGINE, k: 10 };
  const backend = new FakeModelBackend(5);
  const models = new Models({ backend, typicalMs: { 'release-embedder': 1, generator: 1, embedder: 1, check: 1 }, switchOn: () => sw.on() });
  const log = new MemoryLog();
  const htmlFile = path.join(dir, 'admin.html');
  writeFileSync(htmlFile, '<!doctype html><title>admin</title>');
  const make = (withAdmin: boolean) =>
    createApp(deps, {
      maxQuestionChars: 500,
      queue: new GpuQueue(5, 60_000),
      limiter: new RateLimiter({ perHour: 100, perDay: 100, globalPerDay: 1000 }),
      log,
      probe: { up: async () => true },
      trustProxy: 'none',
      paused: () => false,
      models,
      ...(withAdmin
        ? {
            admin: {
              verifier: new AccessVerifier({ teamDomain: TEAM, aud: AUD, adminEmail: EMAIL, fetchFn: jwksFetch({ calls: 0 }) }),
              switch: sw,
              denyLimiter: new RateLimiter({ perHour: 5, perDay: 100, globalPerDay: 1000 }),
              htmlFile,
              cssFile: htmlFile,
              jsFile: htmlFile,
            },
          }
        : {}),
    });
  const listen = (a: ReturnType<typeof createApp>) =>
    new Promise<{ url: string; host: string; close: () => void }>((resolve) => {
      const s = a.listen(0, '127.0.0.1', () => {
        const port = (s.address() as AddressInfo).port;
        resolve({ url: `http://127.0.0.1:${port}`, host: `127.0.0.1:${port}`, close: () => s.close() });
      });
    });
  const plain = await listen(make(false));
  const srv = await listen(make(true));
  const jwt = { 'cf-access-jwt-assertion': good() };
  try {
    check('unconfigured: /admin is the plain 404', (await fetch(`${plain.url}/admin`, { headers: jwt })).status === 404);
    check('unconfigured: /api/admin/state is the JSON 404', (await fetch(`${plain.url}/api/admin/state`, { headers: jwt })).status === 404);

    const noJwt = await fetch(`${srv.url}/api/admin/state`);
    check('no JWT: 403 with a fixed text', noJwt.status === 403 && (await noJwt.text()) === 'Not allowed.');
    check('no JWT on /admin and its script: 403', (await fetch(`${srv.url}/admin`)).status === 403 && (await fetch(`${srv.url}/admin/admin.js`)).status === 403);
    const bad = await fetch(`${srv.url}/api/admin/state`, { headers: { 'cf-access-jwt-assertion': good({ email: 'x@example.com' }) } });
    check('wrong identity: 403', bad.status === 403);
    check('denials are logged with the reason, never the token', log.entries.some((e) => e.outcome === 'admin-denied' && e.detail === 'email') && !JSON.stringify(log.entries).includes('eyJ'));
    for (let i = 0; i < 3; i++) await fetch(`${srv.url}/api/admin/state`);
    check('a flood of denials is limited (429) and stops filling the log', (await fetch(`${srv.url}/api/admin/state`)).status === 429);

    const page = await fetch(`${srv.url}/admin`, { headers: jwt });
    check('valid JWT: the page, no-store and noindex', page.ok && page.headers.get('cache-control') === 'no-store' && page.headers.get('x-robots-tag') === 'noindex');
    check('the page carries the CSP header', (page.headers.get('content-security-policy') ?? '').includes("default-src 'none'"));
    const st = (await (await fetch(`${srv.url}/api/admin/state`, { headers: jwt })).json()) as { switch: { effective: boolean; master: string; page: string }; models: { state: string } };
    check('state: master on, page unset, effective off, models off', st.switch.master === 'on' && st.switch.page === 'unset' && !st.switch.effective && st.models.state === 'off', JSON.stringify(st));

    const post = (body: string, headers: Record<string, string>) => fetch(`${srv.url}/api/admin/switch`, { method: 'POST', headers: { ...jwt, ...headers }, body });
    const json = { 'content-type': 'application/json' };
    check('switch: no Origin -> 403', (await post('{"on":true}', json)).status === 403);
    check('switch: another origin -> 403', (await post('{"on":true}', { ...json, origin: 'https://evil.example.com' })).status === 403);
    check('switch: text/plain body (a cross-site form) -> 403', (await post('{"on":true}', { 'content-type': 'text/plain', origin: srv.url })).status === 403);
    check('switch: cross-site fetch metadata -> 403', (await post('{"on":true}', { ...json, origin: srv.url, 'sec-fetch-site': 'cross-site' })).status === 403);
    check('switch: bad body -> 400', (await post('{"on":"yes"}', { ...json, origin: srv.url })).status === 400);
    const on = await post('{"on":true}', { ...json, origin: srv.url });
    check('switch on: ok, effective on', on.ok && ((await on.json()) as { switch: { effective: boolean } }).switch.effective && sw.page() === 'on');
    check('switch on: models may load now', models.state() === 'idle');
    check('switch on: written to the state file', readFileSync(state, 'utf8').trim() === 'on');
    const logLines = readFileSync(adminLog, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, string>);
    check('admin log: from, to, "owner", no e-mail', logLines.length === 1 && logLines[0].from === 'unset' && logLines[0].to === 'on' && logLines[0].who === 'owner' && !readFileSync(adminLog, 'utf8').includes('@'));
    await models.start('ready', (w) => w(new AbortController().signal));
    check('models loaded', models.state() === 'ready');
    const off = await post('{"on":false}', { ...json, origin: srv.url });
    check('switch off: ok', off.ok && sw.page() === 'off');
    for (let i = 0; i < 100 && models.state() !== 'off'; i++) await new Promise((r) => setTimeout(r, 10));
    check('switch off: the models are released, state off', models.state() === 'off' && backend.calls.includes('release-all'), backend.calls.join());

    writeFileSync(master, 'off\n');
    const refused = await post('{"on":true}', { ...json, origin: srv.url });
    check('master off: the page cannot turn on (409)', refused.status === 409 && sw.page() === 'off');
    check('the master file is never written by the server', readFileSync(master, 'utf8') === 'off\n' && existsSync(master));
  } finally {
    plain.close();
    srv.close();
  }
}

async function main() {
  await verifier();
  truthTable();
  await routes();
  console.log(`admin: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
