/**
 * Guest-key mode in a real browser (phase 4, step 4.6d; plan in ai/APP-PLAN.md section 9). api.anthropic.com is
 * mocked with page.route, so no call leaves the machine and nothing is spent. The chat server runs with fake models
 * (the main test server of playwright.config.ts). Every request the page makes is recorded, to check that the key
 * goes only to api.anthropic.com and never to this site, and that nothing is stored in the browser.
 */
import { expect, test, type Page, type Request, type Route, type TestInfo } from '@playwright/test';

const MAIN = 'http://127.0.0.1:8801';
const KEY = 'sk-ant-api03-e2e-test-not-a-real-key';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';

let n = 0;
const visitorIp = (info: TestInfo) => `203.0.${113 + (info.project.name === 'phone' ? 1 : 0)}.${(++n % 250) + 1}`;

type Mock = { status: number; body: unknown } | 'abort';

/** Mocks the Messages API: answers the CORS preflight, records each call, replies with what `reply` returns. */
async function mockAnthropic(page: Page, reply: (body: { messages: { content: string }[] }) => Mock) {
  const calls: { headers: Record<string, string>; body: string }[] = [];
  await page.route(ANTHROPIC, async (route: Route) => {
    const req = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    calls.push({ headers: req.headers(), body: req.postData() ?? '' });
    const r = reply(JSON.parse(req.postData() ?? '{}'));
    if (r === 'abort') return route.abort('failed');
    return route.fulfill({ status: r.status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(r.body) });
  });
  return calls;
}

/** A valid model answer quoting ten words of the first chunk the request carries, with one made-up figure. */
function goodAnswer(body: { messages: { content: string }[] }) {
  const prompt = body.messages[0].content;
  const m = prompt.match(/<chunk id="([^"]+)"[^>]*>\n([\s\S]*?)\n<\/chunk>/);
  const words = (m?.[2] ?? '').split(/\s+/).filter(Boolean);
  const quote = words.slice(2, 12).join(' ');
  const answer = { answer: 'Mocked cloud answer: the ranges stayed wide for 9999 days.', coverage: 'partial', citations: [{ chunkId: m?.[1] ?? 'x', quote }] };
  return { status: 200, body: { id: 'msg_mock', type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(answer) }], usage: { input_tokens: 1, output_tokens: 1 } } };
}

/** Every request the page sends, to any origin. */
function recordRequests(page: Page) {
  const all: Request[] = [];
  page.on('request', (r) => all.push(r));
  return all;
}

async function openGuest(page: Page, info: TestInfo) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setExtraHTTPHeaders({ 'cf-connecting-ip': visitorIp(info) });
  await page.goto(MAIN);
  await page.getByText('Claude, with your own Anthropic key').click();
  await expect(page.getByTestId('key-panel')).toBeVisible();
  return errors;
}

async function enterKey(page: Page, value = KEY) {
  await page.getByLabel('Your Anthropic API key').fill(value);
  await page.getByRole('button', { name: 'Use this key' }).click();
}

async function ensureSearch(page: Page) {
  const panel = page.getByTestId('models-panel');
  await expect(panel).toBeVisible();
  const state = await panel.getAttribute('data-state');
  if (state !== 'search' && state !== 'ready') {
    await page.getByRole('button', { name: 'Load search' }).click();
    await expect(panel).toHaveAttribute('data-state', /search|ready/, { timeout: 15_000 });
  }
}

async function ask(page: Page, question: string) {
  await page.getByLabel('Your question').fill(question);
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
}

/** No request to this site carries the key, in its URL, headers or body. */
function keyNeverSentHome(all: Request[]) {
  return all.filter((r) => r.url().startsWith(MAIN)).every((r) => !r.url().includes('sk-ant') && !JSON.stringify(r.headers()).includes('sk-ant') && !(r.postData() ?? '').includes('sk-ant'));
}

async function browserStorageIsEmpty(page: Page) {
  const store = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookie: document.cookie,
    idb: 'databases' in indexedDB ? (await indexedDB.databases()).length : 0,
  }));
  const cookies = await page.context().cookies();
  return store.local === 0 && store.session === 0 && store.cookie === '' && store.idb === 0 && cookies.length === 0;
}

test('guest key: a full question through the mocked API, checked on this site, key only in x-api-key to Anthropic', async ({ page }, info) => {
  const all = recordRequests(page);
  const calls = await mockAnthropic(page, goodAnswer);
  const errors = await openGuest(page, info);
  await enterKey(page);
  await expect(page.getByTestId('key-state')).toContainText('A key is set for this page view only');
  await expect(page.getByLabel('Your Anthropic API key')).toHaveCount(0);
  await ensureSearch(page);
  await ask(page, 'Why were the ranges kept wide?');
  const answer = page.getByTestId('chat-answer');
  await expect(answer).toHaveAttribute('data-outcome', 'answered', { timeout: 20_000 });
  await expect(answer).toContainText('Mocked cloud answer');
  // Verified on our server: the real quote is verified, the made-up figure is not.
  await expect(answer.locator('.quote-verified')).toContainText('Verified quote');
  const figure = answer.locator('.answer-text .num', { hasText: '9999' });
  await expect(figure).toHaveAttribute('data-state', 'not-verified');
  await expect(answer).toContainText('Claude Sonnet 5.5 with your own key');
  await expect(answer).toContainText('has not been measured yet');

  expect(calls).toHaveLength(1);
  expect(calls[0].headers['x-api-key']).toBe(KEY);
  expect(calls[0].headers['anthropic-dangerous-direct-browser-access']).toBe('true');
  expect(calls[0].body).not.toContain('sk-ant');
  expect(JSON.parse(calls[0].body).model).toBe('claude-sonnet-5-5');
  expect(keyNeverSentHome(all), 'no request to this site carries the key').toBe(true);
  expect(all.filter((r) => r.url().startsWith(MAIN + '/api/guest/')).map((r) => new URL(r.url()).pathname)).toEqual(['/api/guest/retrieve', '/api/guest/verify']);
  expect(await browserStorageIsEmpty(page), 'nothing in localStorage, sessionStorage, cookies or IndexedDB').toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath('guest-answer.png'), fullPage: true });

  // Gone after a reload.
  await page.reload();
  await page.getByText('Claude, with your own Anthropic key').click();
  await expect(page.getByLabel('Your Anthropic API key')).toBeVisible();
  await expect(page.getByTestId('key-state')).toHaveCount(0);
});

test('guest key: "Forget my key" forgets it at once', async ({ page }, info) => {
  await openGuest(page, info);
  await enterKey(page);
  await page.getByRole('button', { name: 'Forget my key' }).click();
  await expect(page.getByLabel('Your Anthropic API key')).toBeVisible();
  await ensureSearch(page);
  await page.getByLabel('Your question').fill('Why were the ranges kept wide?');
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
});

test('guest key: only an Anthropic key is accepted', async ({ page }, info) => {
  const all = recordRequests(page);
  await openGuest(page, info);
  await enterKey(page, 'hunter2-not-a-key');
  await expect(page.getByTestId('key-not-anthropic')).toContainText('does not look like an Anthropic API key');
  await expect(page.getByTestId('key-state')).toHaveCount(0);
  await expect(page.getByLabel('Your Anthropic API key')).toHaveValue('');
  expect(all.some((r) => (r.postData() ?? '').includes('hunter2'))).toBe(false);
});

test('guest key: a refused question (advice) is answered without calling Anthropic', async ({ page }, info) => {
  const calls = await mockAnthropic(page, goodAnswer);
  await openGuest(page, info);
  await enterKey(page);
  await ensureSearch(page);
  await ask(page, 'Should I buy ETH now?');
  await expect(page.getByTestId('chat-answer')).toHaveAttribute('data-outcome', 'out-of-scope', { timeout: 15_000 });
  expect(calls).toHaveLength(0);
});

test('guest key: a 401 shows the API message, forgets the key and shows the field again', async ({ page }, info) => {
  const all = recordRequests(page);
  const calls = await mockAnthropic(page, () => ({ status: 401, body: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } }));
  await openGuest(page, info);
  await enterKey(page);
  await ensureSearch(page);
  await ask(page, 'Why were the ranges kept wide?');
  const error = page.getByTestId('chat-error');
  await expect(error).toHaveAttribute('data-error', 'guest-key-rejected', { timeout: 15_000 });
  await expect(error).toContainText('invalid x-api-key');
  await expect(page.getByLabel('Your Anthropic API key')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
  expect(calls).toHaveLength(1);
  // No verify call after a failed model call; one click is one call.
  expect(all.some((r) => r.url().endsWith('/api/guest/verify'))).toBe(false);
  await page.screenshot({ path: info.outputPath('guest-401.png'), fullPage: true });
});

test('guest key: a call that fails without a readable answer shows the likely causes', async ({ page }, info) => {
  await mockAnthropic(page, () => 'abort');
  await openGuest(page, info);
  await enterKey(page);
  await ensureSearch(page);
  await ask(page, 'Why were the ranges kept wide?');
  const error = page.getByTestId('chat-error');
  await expect(error).toHaveAttribute('data-error', 'guest-unreadable', { timeout: 15_000 });
  await expect(error).toContainText('does not allow API calls from a browser');
  // A network failure says nothing about the key: it stays set.
  await expect(page.getByTestId('key-state')).toBeVisible();
});

test('guest key: an answer cut at the length limit is not sent for checking', async ({ page }, info) => {
  const all = recordRequests(page);
  await mockAnthropic(page, () => ({ status: 200, body: { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"answer":"half' }] } }));
  await openGuest(page, info);
  await enterKey(page);
  await ensureSearch(page);
  await ask(page, 'Why were the ranges kept wide?');
  await expect(page.getByTestId('chat-error')).toHaveAttribute('data-error', 'guest-max-tokens', { timeout: 15_000 });
  expect(all.some((r) => r.url().endsWith('/api/guest/verify'))).toBe(false);
});

test('guest key: the page CSP allows exactly this site and api.anthropic.com', async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'cf-connecting-ip': visitorIp(info) });
  const res = await page.goto(MAIN);
  const header = res?.headers()['content-security-policy'] ?? '';
  const meta = (await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')) ?? '';
  for (const policy of [header, meta]) {
    const connect = policy.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src '));
    expect(connect).toBe("connect-src 'self' https://api.anthropic.com");
  }
  // Any other host is blocked by the browser.
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/');
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
});
