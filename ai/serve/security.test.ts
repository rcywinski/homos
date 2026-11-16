/**
 * Tests for the step 4.7 security fixes (M1, M2, M3, L1, L2, L3, L5; L7 is in queue.test.ts). Offline.
 * Run: npx tsx ai/serve/security.test.ts
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { createApp, type AppOptions } from './app';
import type { AskDeps } from './ask';
import { ConfigError, loadServeConfig } from './config';
import { DryRunGenerator, FAKE_ENGINE, fakeRetrieval } from './fake-engine';
import { CSP_HEADER, CSP_META, SECURITY_HEADERS } from './headers';
import { FileLog, MemoryLog } from './log';
import { GpuQueue } from './queue';
import { RateLimiter, visitorKey } from './ratelimit';
import { cleanQuestion } from './scope';
import { loadWalletForServing } from './wallet-export';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const BOX = { INFERENCE_URL: 'http://box.invalid:11434', RERANK_URL: 'http://box.invalid:11435' };
const FIXTURE = path.join('showcase', 'e2e', 'fixtures', 'wallet.fixture.json');

async function main() {
  // --- M1: what the server agrees to serve as wallet data --------------------------------------------------------
  const tmp = path.join('data', `security-test-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  try {
    const refused = (file: string, needle: string, allowFixtures = false) => {
      const r = loadWalletForServing(file, { allowFixtures });
      return !r.ok && r.reason.includes(needle) ? '' : JSON.stringify(r).slice(0, 160);
    };
    check('package.json is not served', refused('package.json', 'not under data/') === '', refused('package.json', 'not under data/'));
    // The path is refused before the file is opened, whether or not a .env exists there.
    const env = loadWalletForServing('.env');
    check('.env at the repo root is not served', !env.ok && /not under data\/|does not exist/.test(env.reason), JSON.stringify(env));
    writeFileSync(path.join(tmp, '.env'), 'ANTHROPIC_API_KEY=sk-ant-test\n');
    check('a .env under data/ is not served', refused(path.join(tmp, '.env'), 'not a .json file') === '');
    symlinkSync(path.resolve('package.json'), path.join(tmp, 'link.json'));
    check('a symbolic link under data/ pointing outside is not served', refused(path.join(tmp, 'link.json'), 'not under data/') === '');
    writeFileSync(path.join(tmp, 'other.json'), JSON.stringify({ name: 'homos', version: '2.0.0' }));
    check('JSON of another shape is not served', refused(path.join(tmp, 'other.json'), 'shape') === '');
    const leaky = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    leaky.period.from = 'https://rpc.example/v2/KEY';
    writeFileSync(path.join(tmp, 'leaky.json'), JSON.stringify(leaky));
    check('a wallet file that fails the audit is not served', refused(path.join(tmp, 'leaky.json'), 'fails the export audit') === '');
    writeFileSync(path.join(tmp, 'broken.json'), '{"positions": [');
    check('broken JSON is not served', refused(path.join(tmp, 'broken.json'), 'not valid JSON') === '');
    check('a missing file is not served', refused(path.join(tmp, 'none.json'), 'does not exist') === '');
    copyFileSync(FIXTURE, path.join(tmp, 'wallet.json'));
    check('a valid wallet file under data/ is served', loadWalletForServing(path.join(tmp, 'wallet.json')).ok);
    check('the test fixture is refused outside the dry run', refused(FIXTURE, 'not under data/') === '');
    check('the test fixture is accepted in the dry run', loadWalletForServing(FIXTURE, { allowFixtures: true }).ok);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  // --- HTTP: headers, plain 404, wallet route, cleaned questions, mode warnings ---------------------------------
  const log = new MemoryLog();
  const deps: AskDeps = { retrieval: await fakeRetrieval(), generator: new DryRunGenerator(), engine: FAKE_ENGINE, k: 10 };
  const base: Omit<AppOptions, 'trustProxy'> = {
    maxQuestionChars: 500,
    queue: new GpuQueue(5, 60_000),
    limiter: new RateLimiter({ perHour: 100, perDay: 100, globalPerDay: 1000 }),
    log,
    probe: { up: async () => true },
    paused: () => false,
    staticDir: existsSync(path.join('showcase', 'public', 'index.html')) ? path.join('showcase', 'public') : undefined,
    walletJson: (() => {
      const r = loadWalletForServing('package.json');
      return r.ok ? r.json : undefined;
    })(),
  };
  const listen = (opts: AppOptions) =>
    new Promise<{ url: string; close: () => void }>((resolve) => {
      const s = createApp(deps, opts).listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
    });
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (m: string) => warnings.push(m);
  const local = await listen({ ...base, trustProxy: 'none' });
  try {
    const wallet = await fetch(`${local.url}/data/wallet.json`);
    const walletText = await wallet.text();
    check('pointing the wallet at package.json serves nothing', wallet.status === 404 && !walletText.includes('homos'), walletText.slice(0, 80));

    for (const [what, res] of [
      ['page', await fetch(`${local.url}/`)],
      ['health', await fetch(`${local.url}/api/health`)],
      ['unknown path', await fetch(`${local.url}/nope`)],
      ['api 404', await fetch(`${local.url}/api/nope`)],
      ['body too large', await fetch(`${local.url}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'x'.repeat(3000) }) })],
    ] as const) {
      const missing = Object.entries(SECURITY_HEADERS).filter(([k, v]) => res.headers.get(k) !== v).map(([k]) => k);
      check(`security headers on ${what}`, missing.length === 0, missing.join(', '));
    }
    const nf = await fetch(`${local.url}/nope-%3Cscript%3E`);
    const nfText = await nf.text();
    check('unknown path: plain "Not found", no framework page, no echoed path', nf.status === 404 && nfText === 'Not found' && (nf.headers.get('content-type') ?? '').startsWith('text/plain'), nfText);
    check('no x-powered-by', nf.headers.get('x-powered-by') === null);

    const sneaky = 'Why‮ sesnar ediw⁦ were the​ ranges\u0007 kept\n\nwide?‏';
    const r = await fetch(`${local.url}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: sneaky }) });
    check('a question with control characters is answered', r.status === 200);
    const logged = log.entries[log.entries.length - 1]?.question ?? '';
    // eslint-disable-next-line no-control-regex
    check('the logged question has no bidi, zero-width or control characters', !/[\p{Cf}\u0000-\u001f\u007f-\u009f]/u.test(logged) && logged === 'Why sesnar ediw were the ranges kept wide?', JSON.stringify(logged));

    await fetch(`${local.url}/api/health`, { headers: { 'cf-connecting-ip': '203.0.113.9' } });
    await fetch(`${local.url}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify({ question: 'Why wide ranges?' }) });
    await fetch(`${local.url}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify({ question: 'Why wide ranges?' }) });
    check('local mode warns once about a tunnel header', warnings.filter((w) => w.includes('SERVE_MODE is local')).length === 1, warnings.join(' | '));
  } finally {
    local.close();
  }
  const tunnel = await listen({ ...base, trustProxy: 'cloudflare' });
  try {
    await fetch(`${tunnel.url}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'Why wide ranges?' }) });
    check('tunnel mode warns once about a request without the header', warnings.some((w) => w.includes('without CF-Connecting-IP')));
  } finally {
    tunnel.close();
    console.warn = origWarn;
  }

  // --- M2: the meta tag and the header carry the same policy ----------------------------------------------------
  const html = readFileSync(path.join('showcase', 'public', 'index.html'), 'utf8');
  const meta = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
  check('index.html meta CSP equals the server policy', meta === CSP_META, meta);
  check('the header adds frame-ancestors none', CSP_HEADER === `${CSP_META}; frame-ancestors 'none'`);

  // --- L5: cleaning ---------------------------------------------------------------------------------------------
  check('bidi overrides removed', cleanQuestion('a‮b⁦c⁩d‎e؜f') === 'abcdef');
  check('zero-width and BOM removed', cleanQuestion('﻿a​b‌c‍d') === 'abcd');
  check('control characters removed, line breaks become spaces', cleanQuestion(' one\u0000\ttwo\r\nthree\u0085 ') === 'one two three');
  check('Polish letters kept', cleanQuestion('Dlaczego zamknięto projekt? Źródło, łódź') === 'Dlaczego zamknięto projekt? Źródło, łódź');

  // --- L1: IPv6 by /64 ------------------------------------------------------------------------------------------
  check('IPv6 counted by /64', visitorKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd') === '2001:db8:1:2::/64');
  check('compressed IPv6', visitorKey('2001:db8::1') === '2001:db8:0:0::/64');
  check('leading zeros and case', visitorKey('2001:0DB8:0001:0002::5') === '2001:db8:1:2::/64');
  check('IPv4-mapped IPv6 is the IPv4 address', visitorKey('::ffff:203.0.113.7') === '203.0.113.7');
  check('IPv4 unchanged', visitorKey('203.0.113.7') === '203.0.113.7');
  const lim = new RateLimiter({ perHour: 1, perDay: 10, globalPerDay: 100 });
  lim.take(lim.visitor('2001:db8:1:2::1'));
  const second = lim.take(lim.visitor('2001:db8:1:2:ffff::9'));
  check('two addresses in one /64 share the limit', !second.ok && second.reason === 'hour');
  check('another /64 has its own limit', lim.take(lim.visitor('2001:db8:1:3::1')).ok);

  // --- M3: tunnel mode ------------------------------------------------------------------------------------------
  const cfgErr = (env: Record<string, string>, needle: string) => {
    try {
      loadServeConfig({ ...BOX, ...env });
      return false;
    } catch (e) {
      return e instanceof ConfigError && e.message.includes(needle);
    }
  };
  check('local mode by default, socket address', loadServeConfig({ ...BOX }).mode === 'local' && loadServeConfig({ ...BOX }).trustProxy === 'none');
  check('tunnel mode trusts CF-Connecting-IP', loadServeConfig({ ...BOX, SERVE_MODE: 'tunnel' }).trustProxy === 'cloudflare');
  check('tunnel mode refuses localhost', cfgErr({ SERVE_MODE: 'tunnel', SERVE_HOST: 'localhost' }, '127.0.0.1 only'));
  check('tunnel mode refuses ::1', cfgErr({ SERVE_MODE: 'tunnel', SERVE_HOST: '::1' }, '127.0.0.1 only'));
  check('an unknown mode is refused', cfgErr({ SERVE_MODE: 'proxy' }, 'local or tunnel'));
  check('the old SERVE_TRUST_PROXY is refused, not ignored', cfgErr({ SERVE_TRUST_PROXY: 'cloudflare' }, 'SERVE_MODE'));

  // --- L2: daily pruning ----------------------------------------------------------------------------------------
  const dir = path.join(os.tmpdir(), `homos-log-${process.pid}`);
  try {
    let now = Date.UTC(2026, 10, 1, 12);
    const flog = new FileLog(dir, () => now);
    flog.write({ visitor: 'a', outcome: 'answered', ms: 1 });
    now = Date.UTC(2026, 11, 5, 12);
    flog.write({ visitor: 'b', outcome: 'answered', ms: 1 });
    check('a file older than 30 days goes on the first write of a new day, without a restart', readdirSync(dir).join() === '2026-12-05.jsonl', readdirSync(dir).join());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  console.log(`security: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
