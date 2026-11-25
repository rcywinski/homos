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

test('Live: networks, start dates, value ranges, telemetry, observation analysis, walk-forward caption', async ({ page }) => {
  await page.goto(`${LIVE}/live/`);
  await expect(page.locator('.paper-pool-card')).toHaveCount(6);
  const headers = page.locator('.paper-pool-header');
  await expect(headers.nth(0)).toContainText('USDC/WETH · 0.30% · Ethereum');
  await expect(page.locator('.paper-pool-card', { hasText: 'Arbitrum' })).toContainText('waiting for market data from the network; no position opened yet.');
  await expect(page.locator('.paper-pool-start')).toHaveCount(6);
  await expect(page.locator('.paper-pool-start', { hasText: /^started / })).toHaveCount(5);
  await expect(page.locator('.paper-pool-start', { hasText: 'not started yet' })).toHaveCount(1);
  await expect(page.locator('.paper-range-caption', { hasText: 'value shown:' })).toHaveCount(5);
  await expect(page.locator('.paper-event-pool').first()).toContainText(/· (Ethereum|Base|Arbitrum)$/);
  await page.locator('.telemetry-title', { hasText: 'Bot telemetry' }).click();
  await expect(page.locator('.telemetry-table').first()).toBeVisible();
  await page.locator('.telemetry-title', { hasText: 'Observation analysis' }).click();
  await expect(page.locator('.observation-pool-block svg').first()).toBeVisible();
  await expect(page.locator('.observation-walkforward-table')).toHaveCount(2);
  await expect(page.locator('.live-walkforward-note')).toContainText('computed on 22.09.2026 and fixed');
  // 5.4 review follow-ups: no raw state button, no watched positions, units on the cbBTC rows, the rule notes, the
  // fee-yield example, networks in the analysis titles, English strategy names, scale captions.
  await expect(page.getByRole('button', { name: 'Raw JSON' })).toHaveCount(0);
  await expect(page.getByText('Positions watched by the bot')).toHaveCount(0);
  await expect(page.locator('.telemetry-table th', { hasText: 'Fee yield of the active tick, %/day' })).toHaveCount(1);
  await expect(page.locator('.telemetry-table td', { hasText: 'WETH per cbBTC' })).toHaveCount(2);
  await expect(page.locator('.telemetry-table td', { hasText: '$100,000/cbBTC' })).toHaveCount(2);
  await expect(page.locator('.live-rule-note')).toContainText('plays ALGORITHM v1.2 on all six pools');
  await expect(page.locator('.live-telemetry-note')).toContainText('FlatWide hybrid');
  await expect(page.locator('.live-telemetry-note')).toContainText('Example, mainnet-usdc-weth-030 · Ethereum: 2.560%/day × 2 × 60 / 3,000 ticks = 0.102%/day');
  await expect(page.locator('.observation-pool-title', { hasText: 'USDC/WETH · 0.30% · Ethereum' })).toHaveCount(2);
  await expect(page.locator('.observation-walkforward-table td', { hasText: 'Passive ±50%' })).toHaveCount(1);
  await expect(page.locator('.observation-walkforward-table td', { hasText: 'Pasywny' })).toHaveCount(0);
  await expect(page.locator('.observation-chart-scale').first()).toContainText(/price scale shown: [\d,.]+ to [\d,.]+ · EMA gap scale shown: -5\.0% to [-\d.]+% \(safety-switch threshold -5%\)/);
  await expect(page.locator('.live-notice').first()).not.toContainText('the same algorithm');
  // 5.5: both rankings, read-only, with the dated note.
  await page.locator('.telemetry-title', { hasText: 'Daily ranking (TOP 10)' }).click();
  await page.locator('.telemetry-title', { hasText: 'WIDE ranking' }).click();
  await expect(page.locator('.topranking-status-in')).toHaveCount(1); // the simulation's pool
  await expect(page.getByText('WETH-USDT').first()).toBeVisible();
  await expect(page.getByText('TBTC-WBTC').first()).toBeVisible();
  await expect(page.locator('.live-ranking-note')).toHaveCount(2); // inside each ranking section
  await expect(page.locator('.live-ranking-note').first()).toContainText('fixed results of the research period');
  await expect(page.locator('.live-ranking-note').first()).toContainText('LP position / holding the two tokens 50/50 / the difference');
  await expect(page.locator('.telemetry-table th', { hasText: 'full run' })).toHaveCount(0);
  // Each note sits inside the section it explains.
  for (const cls of ['live-telemetry-note', 'live-walkforward-note', 'live-ranking-note']) {
    expect(await page.locator(`.telemetry-section .${cls}`).count(), cls).toBeGreaterThan(0);
  }
  await expect(page.locator('.live-ranking-note').first()).toContainText('17.08.2026 and 19.08.2026');
  const rankingText = await page.locator('body').innerText();
  expect(rankingText).not.toMatch(/https?:\/\//);
  expect(rankingText).not.toMatch(/0x[0-9a-fA-F]{40}/);
  await expect(page.locator('button', { hasText: /open|enter|add/i })).toHaveCount(0);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/https?:\/\//);
  expect(text).not.toContain('/Users/');
  expect(text).not.toMatch(/0x[0-9a-fA-F]{40}/);
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
  expect((await request.get(`${LIVE}/live/api/results/walkforward-x-720d-30d.json`)).status()).toBe(404);
  const r = await request.get(`${LIVE}/live/api/state`);
  expect(r.status()).toBe(200);
  const body = await r.text();
  expect(body).not.toContain('0x1111111111111111111111111111111111111111');
  expect(body).not.toContain('SECRETKEY');
});

test('Live: one malformed data file fails only its own section', async ({ page }) => {
  // A daily-model file of the wrong shape (as a broken nightly step could write) is served to the page.
  await page.route('**/live/api/wide-daily', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ generatedAt: 'x', params: {}, pools: { 'u-3': { windows: { w365: {} } } } }) }),
  );
  await page.goto(`${LIVE}/live/`);
  await expect(page.locator('.paper-pool-card')).toHaveCount(6);
  await page.locator('.telemetry-title', { hasText: 'WIDE ranking' }).click();
  await expect(page.locator('.live-section-failed')).toContainText('WIDE ranking: this section could not be shown.');
  await expect(page.locator('.paper-pool-card')).toHaveCount(6);
  await expect(page.locator('.telemetry-title', { hasText: 'Observation analysis' })).toBeVisible();
});
