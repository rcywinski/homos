/**
 * Tests for the phase 5 "Live" demo, step 5.1: the entry refuses key-like variables, no signing API is reachable from
 * it, and the public read-only bot API leaks nothing (no URL, no local path, no unknown address, no write route).
 * Offline: fixture state files, no network.
 * Run: npx tsx bot/live.test.ts
 */
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { BOT_POOLS } from './config';
import { liveStartProblem, rotateLog } from './live';
import { countCalls, rpcErrorOf } from './live-count';
import { NIGHTLY_AFTER_HOUR, NIGHTLY_MAX_ATTEMPTS, NIGHTLY_STEPS, nightlyDue, stepsLeft } from './live-nightly';
import { installConsoleScrub, scrubUrls } from './live-scrub';
import { createPublicBotApp, RESULT_NAMES } from './server-public';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const ROOT = path.resolve(__dirname, '..');
const OUT = mkdtempSync(path.join(os.tmpdir(), 'homos-live-'));

function startChecks() {
  check('no state folder: refused', liveStartProblem({}, ROOT)?.includes('BOT_STATE_DIR') === true);
  check('relative state folder: refused', liveStartProblem({ BOT_STATE_DIR: 'live-state' }, ROOT)?.includes('absolute') === true);
  check('a state folder inside the repo: refused', liveStartProblem({ BOT_STATE_DIR: path.join(ROOT, '.bot') }, ROOT)?.includes('outside the repo') === true);
  check('a state folder outside the repo: accepted', liveStartProblem({ BOT_STATE_DIR: OUT }, ROOT) === null);
  for (const k of ['PRIVATE_KEY', 'BOT_PRIVATE_KEY', 'MNEMONIC', 'BOT_WATCH_ADDRESS', 'TG_TOKEN', 'TG_CHAT', 'HYPERSYNC_BEARER_TOKEN', 'ENVIO_API_TOKEN', 'ANTHROPIC_API_KEY', 'WALLET_CONNECT_PROJECT_ID', 'BOT_API_TOKEN']) {
    check(`${k} in the environment: refused`, liveStartProblem({ BOT_STATE_DIR: OUT, [k]: 'x' }, ROOT)?.includes(k) === true);
  }
  check('RPC variables are allowed', liveStartProblem({ BOT_STATE_DIR: OUT, RPC_BASE: 'https://example.invalid' }, ROOT) === null);
  // The real entry refuses before loading the observer (no network is touched).
  const r = spawnSync(process.execPath, ['--import', 'tsx', 'bot/live.ts'], { cwd: ROOT, env: { PATH: process.env.PATH, BOT_STATE_DIR: OUT, PRIVATE_KEY: 'x' }, encoding: 'utf8', timeout: 30_000 });
  check('the entry exits 1 with a key in the environment', r.status === 1 && /refusing to start.*PRIVATE_KEY/.test(r.stderr), r.stderr);
  // The read-only API reads the same env file and refuses the same way.
  const api = spawnSync(process.execPath, ['--import', 'tsx', 'bot/server-public.ts'], { cwd: ROOT, env: { PATH: process.env.PATH, BOT_STATE_DIR: OUT, TG_TOKEN: 'x' }, encoding: 'utf8', timeout: 30_000 });
  check('the read-only API exits 1 with a token in the environment', api.status === 1 && /refusing to start.*TG_TOKEN/.test(api.stderr), api.stderr);
  const apiIn = spawnSync(process.execPath, ['--import', 'tsx', 'bot/server-public.ts'], { cwd: ROOT, env: { PATH: process.env.PATH, BOT_STATE_DIR: path.join(ROOT, '.bot') }, encoding: 'utf8', timeout: 30_000 });
  check('the read-only API refuses a state folder inside the repo', apiIn.status === 1 && /outside the repo/.test(apiIn.stderr), apiIn.stderr);
  // RPC lists: Live mode uses the measured hosts; the default lists are unchanged.
  const rpcOf = (env: Record<string, string>) =>
    JSON.parse(spawnSync(process.execPath, ['--import', 'tsx', '-e', `import(${JSON.stringify(path.join(ROOT, 'bot', 'config.ts'))}).then((c) => console.log(JSON.stringify(c.RPC ?? c.default.RPC)))`], { cwd: ROOT, env: { PATH: process.env.PATH!, ...env }, encoding: 'utf8', timeout: 30_000 }).stdout.trim().split('\n').pop()!);
  const live = rpcOf({ BOT_MODE: 'live' });
  check('Live RPC: arbitrum logs host first', live.arbitrum[0] === 'https://arb1.arbitrum.io/rpc' && live.arbitrum.length === 2, JSON.stringify(live.arbitrum));
  check('Live RPC: no host that failed every call', !JSON.stringify(live).match(/llamarpc|arbitrum-one-rpc\.publicnode|1rpc\.io/));
  check('Live RPC: an RPC_ARBITRUM override goes first', rpcOf({ BOT_MODE: 'live', RPC_ARBITRUM: 'https://paid.example/arb' }).arbitrum[0] === 'https://paid.example/arb');
  const def = rpcOf({});
  check('default RPC lists unchanged', def.mainnet.includes('https://eth.llamarpc.com') && def.arbitrum.includes('https://1rpc.io/arb') && def.base[0] === 'https://base.drpc.org');
}

/** Every repo file reachable from bot/live.ts through static and dynamic relative imports. */
function reachable(entry: string): { files: string[]; external: Set<string> } {
  const files: string[] = [];
  const external = new Set<string>();
  const visit = (f: string) => {
    if (files.includes(f)) return;
    files.push(f);
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:^\s*import\s+(?:type\s+)?[^;]*?from\s+|import\(\s*|^\s*import\s+)'([^']+)'/gm)) {
      if (/^\s*import\s+type\s/.test(m[0])) continue;
      const spec = m[1];
      if (!spec.startsWith('.')) {
        external.add(spec);
        continue;
      }
      const base = path.resolve(path.dirname(f), spec);
      const hit = ['.ts', '.tsx', '/index.ts'].map((x) => base + x).find((x) => existsSync(x));
      if (hit) visit(hit);
    }
  };
  visit(entry);
  return { files, external };
}

function noSigning() {
  // The entry, plus the nightly steps it runs as child processes (bot/live-nightly.ts NIGHTLY_STEPS).
  const { files, external } = reachable(path.join(ROOT, 'bot', 'live.ts'));
  for (const step of NIGHTLY_STEPS) {
    const r = reachable(path.join(ROOT, 'scripts', `${step}.ts`));
    for (const f of r.files) if (!files.includes(f)) files.push(f);
    for (const x of r.external) external.add(x);
  }
  check('the nightly steps are scanned', files.some((f) => f.endsWith(path.join('scripts', 'wide-daily.ts'))));
  check('the observer is reachable from the entry', files.some((f) => f.endsWith(path.join('bot', 'observer.ts'))) && files.some((f) => f.endsWith(path.join('bot', 'paper.ts'))));
  const forbidden = /\b(createWalletClient|privateKeyToAccount|mnemonicToAccount|hdKeyToAccount|signTransaction|sendTransaction|writeContract|signMessage|signTypedData)\b/;
  const hits = files.filter((f) => forbidden.test(readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
  check('no signing API in any file reachable from the Live entry', hits.length === 0, hits.join(', '));
  const badExt = [...external].filter((x) => /^(wagmi|@wagmi|connectkit|ethers|web3|@walletconnect|@metamask|@coinbase|viem\/accounts)/.test(x));
  check('no wallet package imported (viem only as the public client)', badExt.length === 0, badExt.join(', '));
}

async function publicApi() {
  const state = path.join(OUT, 'state');
  const results = path.join(OUT, 'results');
  mkdirSync(state, { recursive: true });
  mkdirSync(results, { recursive: true });
  const pool = BOT_POOLS[0];
  const OWNER = '0x1111111111111111111111111111111111111111';
  // Fixture files carrying what must never leave: the owner's address, RPC URLs with a key, local paths, proposals.
  writeFileSync(path.join(state, 'state.json'), JSON.stringify({
    updatedAt: '2026-11-25T10:00:00Z', mode: 'OBSERVE', watch: OWNER, rpc: 'https://base.example/v2/SECRETKEY',
    flatParams: { enterGap: 2, exitGap: 5, confirmH: 12 },
    pools: [{ id: pool.id, ethUsd: 3000, tick: 1, sqrtPriceX96: '1', stats: null, suggestion: null, updatedAt: 'x', rpcUrl: 'https://x.example/key', localPath: '/Users/owner/HOMOS/.bot',
      statsAt: '2026-11-25T09:45:00Z', statsWindow: { at: '2026-11-25T10:00:00Z', chunks: 35, failed: 2, ok: true, host: 'https://rpc.example/key' } }],
    positions: [{ tokenId: '1', owner: OWNER }], proposals: [{ id: 'p1' }], tranche: { depositedUsd: 6000 },
  }));
  writeFileSync(path.join(state, 'paper-state.json'), JSON.stringify({
    startedAt: '2026-11-25T10:00:00Z', capitalPerPoolUsd: 10000, updatedAt: 'x', secret: 'C:\\HomosServe\\.env',
    positions: { [pool.id]: { poolId: pool.id, status: 'open', capitalUsd: 10000, feesUsd: 1, hedge: { sizeBase: 1, entryUsd: 2, fundingUsd: 0, account: OWNER }, wallet: OWNER } },
  }));
  const now = new Date().toISOString();
  writeFileSync(path.join(state, 'paper-history.ndjson'), JSON.stringify({ ts: now, poolId: pool.id, equityUsd: 10000, hodlUsd: 10000, inRange: true, note: 'https://rpc.example' }) + '\n');
  writeFileSync(path.join(state, 'paper-events.ndjson'), JSON.stringify({ ts: now, poolId: pool.id, kind: 'OPEN', why: 'opened via https://rpc.example', who: OWNER, nested: { x: 1 } }) + '\n');
  writeFileSync(path.join(state, 'history.ndjson'), JSON.stringify({ ts: now, poolId: pool.id, price: 1, extra: '/home/owner' }) + '\n');
  writeFileSync(path.join(state, 'selector-ranking.json'), JSON.stringify({ day: 'x', rows: [{ symbol: 'WETH-USDC', link: 'https://defillama.example/pool', addr: OWNER, pool: pool.address }] }));
  const name = [...RESULT_NAMES][0];
  writeFileSync(path.join(results, name), JSON.stringify({ mean: 1, source: '/Users/owner/backtest/results' }));
  writeFileSync(path.join(results, 'other.json'), JSON.stringify({ secret: true }));

  const app = createPublicBotApp({ stateDir: state, resultsDir: results });
  const srv = await new Promise<{ url: string; close: () => void }>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
  });
  const allowed = new Set((BOT_POOLS as unknown as Record<string, unknown>[]).flatMap((p) => Object.values(p)).filter((v): v is string => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v)).map((v) => v.toLowerCase()));
  try {
    for (const route of ['/api/state', '/api/paper?hours=24', '/api/history', '/api/ranking', '/api/wide-ranking', '/api/wide-daily', '/api/wide-backtests', '/api/candidates', `/api/results/${name}`, '/health']) {
      const r = await fetch(srv.url + route);
      const text = await r.text();
      check(`${route}: answers`, r.status === 200 || r.status === 503, String(r.status));
      check(`${route}: no URL`, !/https?:\/\//i.test(text), text.slice(0, 200));
      check(`${route}: no local path`, !/(\/Users\/|\/home\/|[A-Za-z]:\\\\)/.test(text), text.slice(0, 200));
      const addrs = [...text.matchAll(/0x[0-9a-fA-F]{40}/g)].map((m) => m[0].toLowerCase());
      check(`${route}: no address other than the pools' contracts`, addrs.every((a) => allowed.has(a)), addrs.join(','));
      check(`${route}: no CORS header`, r.headers.get('access-control-allow-origin') === null);
    }
    const st = (await (await fetch(srv.url + '/api/state')).json()) as Record<string, unknown>;
    check('state: no watch, no tranche, positions and proposals empty', !('watch' in st) && !('tranche' in st) && Array.isArray(st.positions) && (st.positions as unknown[]).length === 0 && (st.proposals as unknown[]).length === 0);
    const sp = (st.pools as Record<string, unknown>[])[0];
    check('state: statsAt and statsWindow pass, with listed subfields only', sp.statsAt === '2026-11-25T09:45:00Z' && JSON.stringify(sp.statsWindow) === JSON.stringify({ at: '2026-11-25T10:00:00Z', chunks: 35, failed: 2, ok: true }));
    check('state: pools keep only listed fields', JSON.stringify(st.pools).includes(pool.id) && !JSON.stringify(st.pools).includes('rpcUrl'));
    const paper = (await (await fetch(srv.url + '/api/paper?hours=24')).json()) as { state: { positions: Record<string, Record<string, unknown>> }; events: Record<string, unknown>[] };
    check('paper: the position keeps its numbers, not the wallet field', paper.state.positions[pool.id].capitalUsd === 10000 && !('wallet' in paper.state.positions[pool.id]));
    check('paper: the hedge keeps only size, entry, funding', JSON.stringify(paper.state.positions[pool.id].hedge) === JSON.stringify({ sizeBase: 1, entryUsd: 2, fundingUsd: 0 }));
    const rk = (await (await fetch(srv.url + '/api/ranking')).json()) as { rows: Record<string, unknown>[] };
    check('ranking: rows keep only listed fields', rk.rows.length === 1 && rk.rows[0].symbol === 'WETH-USDC' && !('link' in rk.rows[0]) && !('addr' in rk.rows[0]) && !('pool' in rk.rows[0]));
    check('paper: events keep primitives only', paper.events.length === 1 && !('nested' in paper.events[0]) && paper.events[0].kind === 'OPEN');
    for (const [m, route] of [['POST', '/api/state'], ['POST', '/api/proposals/p1/dismiss'], ['PUT', '/api/paper'], ['DELETE', '/api/state'], ['OPTIONS', '/api/state']] as const) {
      check(`${m} ${route}: 404`, (await fetch(srv.url + route, { method: m })).status === 404);
    }
    for (const route of ['/api/ledger', '/api/ledger.csv', '/api/closed-positions', '/api/positions-history', '/index.html', '/', '/api/results/other.json', '/api/results/..%2Fstate.json']) {
      check(`GET ${route}: 404`, (await fetch(srv.url + route)).status === 404);
    }
  } finally {
    srv.close();
  }
}

function nightly() {
  const at = (h: number) => new Date(2026, 10, 25, h, 30);
  const today = '2026-11-25';
  check('nightly not due before the hour', !nightlyDue({}, at(NIGHTLY_AFTER_HOUR - 1)));
  check('nightly due after the hour with no run today', nightlyDue({ lastOkDay: '2026-11-24' }, at(NIGHTLY_AFTER_HOUR)));
  check('nightly not due after a complete run today', !nightlyDue({ lastOkDay: today }, at(23)));
  const failedAt = (h: number, count: number) => ({ lastOkDay: '2026-11-24', attempts: { day: today, count, lastAt: at(h).toISOString(), lastFailed: true } });
  const okPartial = { lastOkDay: '2026-11-24', attempts: { day: today, count: 1, lastAt: at(6).toISOString(), lastFailed: false }, okSteps: { day: today, steps: ['fetch-llama-history' as const] } };
  check('after a successful partial run (cold start): due again at once', nightlyDue(okPartial, new Date(at(6).getTime() + 3 * 60_000)));
  check('after a cold start only the remaining steps run', stepsLeft(okPartial, at(6)).join() === 'wide-score,wide-daily');
  check('a new day runs every step', stepsLeft(okPartial, new Date(2026, 10, 26, 6)).join() === NIGHTLY_STEPS.join());
  check('after a failed attempt: not due within the hour', !nightlyDue(failedAt(6, 1), new Date(at(6).getTime() + 59 * 60_000)));
  check('after a failed attempt: due again after an hour', nightlyDue(failedAt(6, 1), new Date(at(6).getTime() + 60 * 60_000)));
  check(`at most ${NIGHTLY_MAX_ATTEMPTS} attempts a day`, !nightlyDue(failedAt(6, NIGHTLY_MAX_ATTEMPTS), at(23)));
  check('the attempt count starts over the next day', nightlyDue({ lastOkDay: '2026-11-24', attempts: { day: '2026-11-24', count: 3, lastAt: at(23).toISOString() } }, at(NIGHTLY_AFTER_HOUR)));
}

function scrub() {
  const key = 'https://base-mainnet.g.alchemy.com/v2/SECRETKEY123';
  const viemLike = `HTTP request failed.\n\nStatus: 429\nURL: ${key}\nRequest body: {"method":"eth_getLogs"}`;
  check('a keyed RPC URL is removed', !scrubUrls(viemLike).includes('SECRETKEY123') && scrubUrls(viemLike).includes('URL: [url]'));
  check('a bare host keeps its name', scrubUrls('failed: https://eth.drpc.org') === 'failed: [url eth.drpc.org]');
  check('credentials and queries are removed', !/secret|k=1/.test(scrubUrls('wss://user:secret@rpc.example/ws https://x.example/?k=1')));
  check('text without a URL is unchanged', scrubUrls('stats base-weth-usdc-030 failed: timeout') === 'stats base-weth-usdc-030 failed: timeout');
  const seen: string[] = [];
  const fake = { log: (...a: unknown[]) => seen.push(a.join(' ')), info: (...a: unknown[]) => seen.push(a.join(' ')), warn: (...a: unknown[]) => seen.push(a.join(' ')), error: (...a: unknown[]) => seen.push(a.join(' ')) };
  installConsoleScrub(fake);
  fake.warn('advisor getLogs chunk failed:', viemLike);
  fake.error(new Error(`boom at ${key}`));
  check('the console wrapper scrubs strings and errors', seen.length === 2 && seen.every((l) => !l.includes('SECRETKEY123')), seen.join(' | '));
  const obs = readFileSync(path.join(ROOT, 'bot', 'observer.ts'), 'utf8');
  check('statistics age is recorded in Live mode only', /if \(LIVE_MODE && read && live\[p\.id\]\)/.test(obs) && /const read = LIVE_MODE \?/.test(obs));
  check('the observer log() scrubs in Live mode', /LIVE_MODE \? scrubUrls\(msg\) : msg/.test(obs));
}

function rotation() {
  const f = path.join(OUT, 'rot.log');
  writeFileSync(f, 'x'.repeat(100));
  check('a small log is kept', rotateLog(f, 1000) === false && existsSync(f));
  writeFileSync(f, 'y'.repeat(2000));
  check('a large log is moved to .1', rotateLog(f, 1000) === true && !existsSync(f) && readFileSync(`${f}.1`, 'utf8').startsWith('y'));
  check('a missing log is not an error', rotateLog(path.join(OUT, 'none.log'), 1000) === false);
}

async function counting() {
  check('rpc error in a single body', rpcErrorOf('{"jsonrpc":"2.0","id":1,"error":{"code":-32001,"message":"You\'ve reached the usage limit, see https://x.example/plans"}}')?.startsWith('-32001: ') === true);
  check('rpc error text has no URL', !rpcErrorOf('{"error":{"code":1,"message":"see https://x.example/a?key=1"}}')!.includes('http'));
  check('rpc error in a batch', rpcErrorOf('[{"result":"0x1"},{"error":{"code":35,"message":"ranges over 100 blocks"}}]') === '35: ranges over 100 blocks');
  check('no rpc error in a result', rpcErrorOf('{"jsonrpc":"2.0","id":1,"result":"0x10"}') === null && rpcErrorOf('not json') === null);
  // The counter over a stub fetch: 200 with a result, 200 with an RPC error, 400, and a network error.
  const realFetch = globalThis.fetch;
  const replies: (() => Response)[] = [
    () => new Response('{"result":"0x1"}', { status: 200, headers: { 'content-type': 'application/json' } }),
    () => new Response('{"error":{"code":-32001,"message":"usage limit"}}', { status: 200, headers: { 'content-type': 'application/json' } }),
    () => new Response('{"error":{"code":35,"message":"range"}}', { status: 400, headers: { 'content-type': 'application/json' } }),
    () => { throw new TypeError('fetch failed https://rpc.example/key'); },
  ];
  let n = 0;
  globalThis.fetch = (async () => replies[n++]()) as unknown as typeof fetch;
  const file = path.join(OUT, 'net-stats-test.json');
  const c = countCalls(file);
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://rpc.example/v2/KEY', { method: 'POST', body: '{}' });
      if (i === 0) check('the caller still reads the body', (await r.json()).result === '0x1');
    } catch {
      // the network error is rethrown, as without the counter
    }
  }
  globalThis.fetch = realFetch;
  c.flush();
  const h = (JSON.parse(readFileSync(file, 'utf8')) as { hosts: Record<string, { calls: number; httpFailures: number; rpcErrors: number; byHour: Record<string, { calls: number }>; lastHttpFailure?: string }> }).hosts['rpc.example'];
  check('counts: 4 calls, 2 HTTP failures, 1 RPC error', h.calls === 4 && h.httpFailures === 2 && h.rpcErrors === 1, JSON.stringify(h));
  check('counts per hour add up', Object.values(h.byHour).reduce((a, b) => a + b.calls, 0) === 4);
  check('no URL or key in the stored failure', !JSON.stringify(h).includes('KEY') && !JSON.stringify(h).includes('rpc.example/'));
}

async function main() {
  await counting();
  rotation();
  scrub();
  nightly();
  startChecks();
  noSigning();
  await publicApi();
  console.log(`live: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
