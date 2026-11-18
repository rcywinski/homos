/**
 * Tests for step 4.6b: the visitor's key module. One call per question, the key only in the x-api-key header of the
 * request to api.anthropic.com, every unusable answer sorted into a plain outcome, no getter for the key, and the
 * server client unable to reach it. Offline: fetch is faked.
 * Run: npx tsx showcase/guest-key.test.ts
 */
import { readFileSync } from 'fs';
import * as keyModule from './guest-key';
import { ANTHROPIC_URL, callModel, forgetKey, hasKey, setKey } from './guest-key';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const KEY = 'sk-ant-api03-test-not-a-real-key';
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function main() {
  check('no key at start', !hasKey());
  check('an empty or spaced value is not stored', !setKey('  ') && !setKey('sk-ant abc') && !hasKey());
  const noKey = await callModel({});
  check('no call without a key', !noKey.ok && noKey.kind === 'api-error');
  check('a key is stored', setKey(`  ${KEY} `) && hasKey());
  check('the module exports no way to read the key', !Object.keys(keyModule).some((k) => /^(key|getKey|readKey)$/i.test(k)), Object.keys(keyModule).join());

  const calls: { url: string; init: RequestInit }[] = [];
  const fake = (res: Response | (() => never)) =>
    (async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      if (typeof res === 'function') return res();
      return res;
    }) as typeof fetch;
  const answer = { answer: 'Wide ranges.', coverage: 'partial', citations: [] };
  const ok = await callModel({ model: 'm' }, fake(json(200, { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(answer) }] })));
  check('a good answer is parsed', ok.ok && JSON.stringify(ok.answer) === JSON.stringify(answer));
  const c = calls[0];
  const h = c.init.headers as Record<string, string>;
  check('the call goes to api.anthropic.com only', calls.length === 1 && c.url === ANTHROPIC_URL && ANTHROPIC_URL.startsWith('https://api.anthropic.com/'));
  check('the key is in x-api-key, with the version and the browser header', h['x-api-key'] === KEY && h['anthropic-version'] === '2023-06-01' && h['anthropic-dangerous-direct-browser-access'] === 'true');
  check('the key is not in the body', !String(c.init.body).includes('sk-ant'));
  check('no credentials and no referrer', c.init.credentials === 'omit' && c.init.referrerPolicy === 'no-referrer');

  const r401 = await callModel({}, fake(json(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })));
  check('401 with a readable body: the API message', !r401.ok && r401.kind === 'api-error' && r401.status === 401 && r401.message === 'invalid x-api-key');
  const net = await callModel({}, fake(() => {
    throw new TypeError('Failed to fetch');
  }));
  check('a failed fetch without a response: unreadable', !net.ok && net.kind === 'unreadable');
  const cut = await callModel({}, fake(json(200, { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"answer":"half' }] })));
  check('cut at max_tokens: not posted, its own outcome', !cut.ok && cut.kind === 'max_tokens');
  const refusal = await callModel({}, fake(json(200, { stop_reason: 'refusal', content: [] })));
  check('a refusal: its own outcome', !refusal.ok && refusal.kind === 'refusal');
  const noText = await callModel({}, fake(json(200, { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'x' }] })));
  check('no text block: invalid', !noText.ok && noText.kind === 'invalid');
  const badJson = await callModel({}, fake(json(200, { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] })));
  check('text that is not JSON: invalid', !badJson.ok && badJson.kind === 'invalid');
  const before = calls.length;
  await callModel({}, fake(json(529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })));
  check('an overloaded API is not retried: one call', calls.length === before + 1);

  forgetKey();
  check('forget clears the key', !hasKey());
  const after = await callModel({}, fake(json(200, {})));
  check('no call after forgetting', !after.ok && calls.length === before + 1);

  // The client for this site's server cannot reach the key: it does not import the key module.
  const api = readFileSync('showcase/guest-api.ts', 'utf8') + readFileSync('showcase/api.ts', 'utf8');
  check('the server clients do not import the key module', !/from '\.\/guest-key'/.test(api));
  const keyPanel = readFileSync('showcase/components/KeyPanel.tsx', 'utf8');
  check('the key field: password, new-password, no spellcheck, manager ignore attributes', /type="password"/.test(keyPanel) && /autoComplete="new-password"/.test(keyPanel) && /spellCheck=\{false\}/.test(keyPanel) && /data-1p-ignore/.test(keyPanel) && /data-lpignore="true"/.test(keyPanel));
  const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const ask = code(readFileSync('showcase/components/Ask.tsx', 'utf8'));
  check('the key field renders no form', !/<form/.test(code(keyPanel)));
  check('the key panel sits before the question form, not in it', ask.indexOf('<KeyPanel') > 0 && ask.indexOf('<KeyPanel') < ask.indexOf('<form'));
  const all = ['showcase/guest-key.ts', 'showcase/components/KeyPanel.tsx', 'showcase/components/Ask.tsx'].map((f) => readFileSync(f, 'utf8')).join('\n');
  check('no browser storage, cookie or URL use in the key path', !/localStorage|sessionStorage|indexedDB|document\.cookie|history\.(push|replace)State|location\.(href|search|hash)\s*=/.test(all));

  console.log(`guest-key: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
