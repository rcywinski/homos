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
import { liveStartProblem } from './live';
import { NIGHTLY_AFTER_HOUR, NIGHTLY_STEPS, nightlyDue } from './live-nightly';
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
    pools: [{ id: pool.id, ethUsd: 3000, tick: 1, sqrtPriceX96: '1', stats: null, suggestion: null, updatedAt: 'x', rpcUrl: 'https://x.example/key', localPath: '/Users/owner/HOMOS/.bot' }],
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
}

async function main() {
  nightly();
  startChecks();
  noSigning();
  await publicApi();
  console.log(`live: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
