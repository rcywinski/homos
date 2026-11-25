/**
 * Tests for `/live/api/*` (phase 5, step 5.2): allow-list, `hours` values, cache, one upstream fetch per key, size
 * cap, upstream failures, write methods, rate limit, the bot URL check, the Live page's CSP, and the formatter shim.
 * Offline: the bot API is a stub fetch.
 * Run: npx tsx ai/serve/live-proxy.test.ts
 */
import express from 'express';
import { readFileSync } from 'fs';
import type { AddressInfo } from 'net';
import { formatDuration as original } from '../../src/utils/formatters';
import { formatDuration as shim } from '../../showcase/live/formatters';
import { BOT_POOLS } from '../../bot/config';
import { RESULT_NAMES } from '../../bot/server-public';
import { checkBotUrl, liveRouter, LiveConfigError, LIVE_RESULT_NAMES } from './live-proxy';
import { RateLimiter } from './ratelimit';
import { CSP_META } from './headers';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

async function serve(opts: { body?: (url: string) => { status: number; text: string }; limits?: { perHour: number; perDay: number; globalPerDay: number }; maxBytes?: number; delayMs?: number }) {
  const calls: string[] = [];
  let t = 1_000_000;
  const fetchFn = (async (url: string) => {
    calls.push(url);
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    const b = opts.body ? opts.body(url) : { status: 200, text: JSON.stringify({ url }) };
    return new Response(b.text, { status: b.status });
  }) as unknown as typeof fetch;
  const app = express();
  const router = liveRouter({ botUrl: 'http://127.0.0.1:8788', limiter: new RateLimiter(opts.limits ?? { perHour: 1000, perDay: 1000, globalPerDay: 1000 }), trustProxy: 'none', fetchFn, now: () => t, maxBytes: opts.maxBytes });
  app.use('/live/api', router);
  const srv = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/live/api`;
  return { base, calls, cacheSize: router.cacheSize, tick: (ms: number) => (t += ms), close: () => srv.close() };
}

async function routes() {
  const s = await serve({});
  try {
    for (const r of ['state', 'paper', 'history', 'ranking', 'wide-ranking', 'wide-daily', 'wide-backtests', 'candidates', 'results/walkforward-base-weth-usdc-030-720d-30d.json']) {
      check(`GET ${r}: 200`, (await fetch(`${s.base}/${r}`)).status === 200);
    }
    for (const r of ['ledger', 'ledger.csv', 'closed-positions', 'positions-history', 'proposals', 'results/other.json', 'results/..%2Fstate.json', 'state/extra', '']) {
      check(`GET ${r || '(root)'}: 404`, (await fetch(`${s.base}/${r}`)).status === 404);
    }
    const keys = s.cacheSize();
    const calls = s.calls.length;
    for (let i = 0; i < 50; i++) await fetch(`${s.base}/results/walkforward-made-up-${i}-720d-30d.json`);
    check('unknown result names: no upstream call, cache size unchanged', s.calls.length === calls && s.cacheSize() === keys, `${s.calls.length - calls} calls, ${s.cacheSize() - keys} keys`);
    for (const name of LIVE_RESULT_NAMES) check(`GET results/${name}: 200`, (await fetch(`${s.base}/results/${name}`)).status === 200);
    check('cache keys stay within 8 routes + 6 results (+4 for the extra hours values)', s.cacheSize() <= 18, String(s.cacheSize()));
    for (const m of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) check(`${m} state: 404`, (await fetch(`${s.base}/state`, { method: m })).status === 404);
    const before = s.calls.length;
    await fetch(`${s.base}/ledger`);
    await fetch(`${s.base}/state`, { method: 'POST' });
    check('refused requests make no upstream call', s.calls.length === before);
    check('upstream paths are the bot API routes on the loopback base', s.calls.every((u) => u.startsWith('http://127.0.0.1:8788/api/')), s.calls.join(' '));
  } finally {
    s.close();
  }
}

async function hoursAndCache() {
  const s = await serve({});
  try {
    for (const [q, want] of [['24', 24], ['72', 72], ['168', 168], ['720', 72], ['abc', 72], ['', 72], ['24&x=1', 24]] as const) {
      s.tick(31_000);
      await fetch(`${s.base}/paper?hours=${q}`);
      check(`hours=${q} becomes ${want}`, s.calls.at(-1) === `http://127.0.0.1:8788/api/paper?hours=${want}`, s.calls.at(-1));
    }
    s.tick(31_000);
    const n = s.calls.length;
    await fetch(`${s.base}/state`);
    await fetch(`${s.base}/state`);
    check('a second request within 30 s is served from the cache', s.calls.length === n + 1);
    s.tick(31_000);
    await fetch(`${s.base}/state`);
    check('after 30 s the cache fetches again', s.calls.length === n + 2);
    s.tick(31_000);
    const m = s.calls.length;
    await fetch(`${s.base}/paper?hours=500`);
    await fetch(`${s.base}/paper?hours=999`);
    check('different unknown hours share one cache key', s.calls.length === m + 1);
    const r = await fetch(`${s.base}/state`);
    check('responses are not cached by the browser', r.headers.get('cache-control') === 'no-store');
    check('no CORS header', r.headers.get('access-control-allow-origin') === null);
  } finally {
    s.close();
  }
  const slow = await serve({ delayMs: 200 });
  try {
    await Promise.all(Array.from({ length: 10 }, () => fetch(`${slow.base}/history?hours=24`)));
    check('ten concurrent misses make one upstream call', slow.calls.length === 1, String(slow.calls.length));
  } finally {
    slow.close();
  }
}

async function failures() {
  const big = await serve({ maxBytes: 1000, body: () => ({ status: 200, text: JSON.stringify({ x: 'a'.repeat(2000) }) }) });
  try {
    const r = await fetch(`${big.base}/paper`);
    const text = await r.text();
    check('an oversized upstream body is a 502 without the body', r.status === 502 && !text.includes('aaaa'), `${r.status} ${text.slice(0, 50)}`);
  } finally {
    big.close();
  }
  const cases: [number, string, number][] = [
    [503, '{"error":"paper trading not started yet"}', 503],
    [500, 'Error at /Users/owner/HOMOS/bot/server-public.ts', 502],
    [404, '{"error":"not-found"}', 404],
    [200, 'not json /home/owner', 502],
  ];
  for (const [up, text, want] of cases) {
    const s = await serve({ body: () => ({ status: up, text }) });
    try {
      const r = await fetch(`${s.base}/paper`);
      const body = await r.text();
      check(`upstream ${up} gives ${want} with a fixed body`, r.status === want && !body.includes('/Users/') && !body.includes('/home/') && !body.includes('started'), `${r.status} ${body}`);
    } finally {
      s.close();
    }
  }
}

async function errorCache() {
  let status = 503;
  const s = await serve({ body: () => ({ status, text: status === 200 ? '{"ok":true}' : '{"error":"x"}' }) });
  try {
    check('503 at start', (await fetch(`${s.base}/state`)).status === 503);
    status = 200;
    s.tick(3_000);
    check('an error is still cached after 3 s', (await fetch(`${s.base}/state`)).status === 503);
    s.tick(3_000);
    check('an error is fetched again after 5 s', (await fetch(`${s.base}/state`)).status === 200);
    s.tick(20_000);
    status = 503;
    check('a good answer is kept for 30 s', (await fetch(`${s.base}/state`)).status === 200);
  } finally {
    s.close();
  }
}

async function limits() {
  const s = await serve({ limits: { perHour: 3, perDay: 100, globalPerDay: 100 } });
  try {
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await fetch(`${s.base}/state`)).status);
    check('the rate limit answers 429 after the hourly allowance', codes.join(',') === '200,200,200,429,429', codes.join(','));
    const r = await fetch(`${s.base}/state`);
    check('429 carries retry-after', Number(r.headers.get('retry-after')) > 0);
  } finally {
    s.close();
  }
}

function config() {
  check('loopback http with a port is accepted', checkBotUrl('http://127.0.0.1:8788') === 'http://127.0.0.1:8788');
  for (const bad of ['https://127.0.0.1:8788', 'http://192.168.1.8:8788', 'http://example.com:8788', 'http://127.0.0.1', 'http://u:p@127.0.0.1:8788', 'http://127.0.0.1:8788/api', 'http://127.0.0.1:8788?x=1', 'not a url']) {
    let threw = false;
    try {
      checkBotUrl(bad);
    } catch (e) {
      threw = e instanceof LiveConfigError;
    }
    check(`bot URL refused: ${bad}`, threw);
  }
  check('the result list equals the bot API list', [...LIVE_RESULT_NAMES].sort().join() === [...RESULT_NAMES].sort().join());
  check('the pool list equals BOT_POOLS', BOT_POOLS.length === LIVE_RESULT_NAMES.size);
  const suffix = readFileSync('src/components/ObservationAnalysis.tsx', 'utf8').match(/WALKFORWARD_NAME_SUFFIX = '([^']+)'/)?.[1];
  check('result names use the suffix the page asks for', !!suffix && [...LIVE_RESULT_NAMES].every((n) => n.endsWith(`${suffix}.json`)), suffix);
  const html = readFileSync('showcase/public/live/index.html', 'utf8');
  const meta = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
  check('the Live page has the same CSP as the archive page', meta === CSP_META, meta);
  check('the Live page loads only its own script and styles', [...html.matchAll(/(?:src|href)="([^"]+)"/g)].every((m) => m[1].startsWith('/live/')));
  for (const ms of [0, 59_000, 60_000, 3_599_000, 3_600_000, 86_399_000, 86_400_000, 1_000_000_000, -5]) check(`formatDuration(${ms}) matches src`, shim(ms) === original(ms));
}

async function main() {
  config();
  await routes();
  await hoursAndCache();
  await failures();
  await errorCache();
  await limits();
  console.log(`live-proxy: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
