/**
 * The "Live" page in a real browser (phase 5, step 5.3): the page, the summary, the original paper panel, the
 * notice, the Archive/Live switch, nothing leaks and nothing is sent. The chat server forwards /live/api to the
 * stand-in bot (showcase/e2e/live-fixture-bot.ts); the "main" server has no Live forward, for the "bot down" path.
 */
import { expect, test } from '@playwright/test';

const LIVE = 'http://127.0.0.1:8812';
const MAIN = 'http://127.0.0.1:8801';
const LIVE_DOWN = 'http://127.0.0.1:8813';

test('Live: notice, summary, six pool cards, events; only same-origin GETs', async ({ page }) => {
  const requests: { method: string; url: string }[] = [];
  page.on('request', (r) => requests.push({ method: r.method(), url: r.url() }));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${LIVE}/live/`);
  await expect(page.locator('.live-notice').first()).toContainText('No wallet is connected and no transaction is ever sent');
  await expect(page.locator('.live-preview')).toHaveCount(0); // the preview notice exists only in a preview build
  await expect(page.locator('.paper-pool-card')).toHaveCount(6);
  const stats = page.locator('.morning-summary .morning-stat-value');
  // Four open, one of them out of range at its latest sample: 3 of 6 in range.
  await expect(stats.nth(1)).toHaveText('3/6');
  await expect(stats.nth(0)).toHaveText(/^\$60,\d{3}\.\d{2}$/);
  await expect(stats.nth(2)).toHaveText('$60.00'); // 10+11+12+13+14 (the pending pool has none)
  await expect(page.getByText('Recent events')).toBeVisible();
  await expect(page.locator('.paper-event-row')).toHaveCount(3);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/0x[0-9a-fA-F]{40}/);
  expect(text).not.toMatch(/https?:\/\//);
  expect(text).not.toContain('/Users/');
  await expect(page.locator('form, input, textarea, select')).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(requests.every((r) => r.method === 'GET' && r.url.startsWith(LIVE))).toBe(true);
  expect(requests.some((r) => r.url.startsWith(`${LIVE}/live/api/paper?hours=168`))).toBe(true);
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Live: the Archive/Live switch works both ways', async ({ page }) => {
  await page.goto(`${LIVE}/`);
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Live' }).click();
  await expect(page).toHaveURL(`${LIVE}/live/`);
  await expect(page.getByRole('heading', { name: /Live: paper trading/ })).toBeVisible();
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Archive' }).click();
  await expect(page).toHaveURL(`${LIVE}/`);
});

test('Live not configured: no Live link on the archive page, /live/ is the plain 404', async ({ page, request }) => {
  await page.goto(`${MAIN}/`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('navigation', { name: 'Pages' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Live' })).toHaveCount(0);
  for (const p of ['/live', '/live/', '/live/live.js', '/live/api/state']) {
    const r = await request.get(`${MAIN}${p}`);
    expect(r.status(), p).toBe(404);
    expect(await r.text(), p).toBe('Not found');
  }
});

test('Live configured but the bot API down: the panel says it is unavailable', async ({ page }) => {
  await page.goto(`${LIVE_DOWN}/live/`);
  await expect(page.getByText('Paper trading unavailable')).toBeVisible();
  await expect(page.locator('.live-notice').first()).toBeVisible();
});

test('Live: the forward refuses writes and unknown routes', async ({ request }) => {
  expect((await request.post(`${LIVE}/live/api/state`)).status()).toBe(404);
  expect((await request.get(`${LIVE}/live/api/ledger`)).status()).toBe(404);
  expect((await request.get(`${LIVE}/live/api/results/walkforward-x-365d-45d.json`)).status()).toBe(404);
  const r = await request.get(`${LIVE}/live/api/state`);
  expect(r.status()).toBe(200);
  const body = await r.text();
  expect(body).not.toContain('0x1111111111111111111111111111111111111111');
  expect(body).not.toContain('SECRETKEY');
});
