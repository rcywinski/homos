/**
 * Visitor paths through the showcase in a real browser (phase 4, step 4.5). Fake models only: the chat server runs
 * with SERVE_ENGINE=fake (ai/serve/fake-engine.ts). Paths tagged @real also run against the real server on the LAN
 * in step 4.8 (E2E_BASE_URL); the others depend on the dry run's deterministic answers or on the test servers' limits.
 */
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

const PORTS = { main: 8801, tight: 8802, staticOnly: 8803, off: 8804, loadDesktop: 8805, loadPhone: 8806, loadFail: 8807, switching: 8808 };
const SWITCH_FILE = path.join(os.tmpdir(), 'homos-e2e-switching-SWITCH');
const MAIN = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORTS.main}`;
const TIGHT = `http://127.0.0.1:${PORTS.tight}`;
const STATIC_ONLY = `http://127.0.0.1:${PORTS.staticOnly}`;
/** True when the suite runs against the real server on the LAN (step 4.8): the dry-run-only paths are skipped. */
const againstReal = !!process.env.E2E_BASE_URL;

const TITLE = 'DeFi liquidity-provision trading system: research archive and AI assistant';
const INTERNAL_LABELS = [/k=10/, /local-pb\d/, /variant P/i, /Step 3\.2/i, /golden set/i];

/** A distinct client address per test, so the per-visitor limits of one test never touch another. */
let n = 0;
const visitorIp = (info: TestInfo) => `198.51.${100 + (info.project.name === 'phone' ? 1 : 0)}.${(++n % 250) + 1}`;

/**
 * Step 4.10a: the dry-run servers start with the models unloaded. Load them through the page, as a visitor would,
 * unless the test is about the loading itself. Against a server already "ready" this does nothing.
 */
async function ensureLoaded(page: Page) {
  const panel = page.getByTestId('models-panel');
  await expect(panel).toBeVisible();
  if ((await panel.getAttribute('data-state')) === 'ready') return;
  await page.getByRole('button', { name: 'Load the local model' }).click();
  await expect(panel).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
}

async function open(page: Page, url: string, info: TestInfo, opts: { load?: boolean } = {}) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setExtraHTTPHeaders({ 'cf-connecting-ip': visitorIp(info) });
  await page.goto(url);
  await expect(page.getByTestId('honesty-notice')).toBeVisible();
  if (opts.load !== false && url !== STATIC_ONLY) await ensureLoaded(page);
  return errors;
}

async function shot(page: Page, info: TestInfo, name: string) {
  const file = info.outputPath(`${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await info.attach(name, { path: file, contentType: 'image/png' });
  if (process.env.E2E_SHOTS_DIR) {
    mkdirSync(process.env.E2E_SHOTS_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.E2E_SHOTS_DIR, `${info.project.name}-${name}.png`), fullPage: true });
  }
}

async function ask(page: Page, question: string) {
  await page.getByLabel('Your question').fill(question);
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
}

test('page title, introduction and the honesty notice on every view @real', async ({ page }, info) => {
  const errors = await open(page, MAIN, info);
  await expect(page).toHaveTitle(TITLE);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
  await expect(page.getByTestId('about')).toContainText('code checks every quote against its source');
  await page.getByText('More about this project').click();
  await expect(page.getByTestId('about')).toBeVisible();
  // The internal name may appear in source material (quotes, report titles, paths), never in the page's own words.
  expect(await page.locator('.masthead').innerText()).not.toMatch(/\bHOMOS\b/);
  for (const tab of ['Cloud and local answers', 'Daily reports', 'Wallet', 'Ask the archive']) {
    if (tab === 'Wallet' && (await page.getByRole('button', { name: 'Wallet' }).count()) === 0) continue;
    await page.getByRole('button', { name: tab }).click();
    await expect(page.getByTestId('honesty-notice')).toContainText('did not reliably beat simply holding');
  }
  expect(errors, 'console errors (a CSP violation shows up here)').toEqual([]);
});

test('desktop only: the question box is on the first screen of a 1280 x 800 laptop @real', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'desktop only: a laptop viewport check, not a phone one');
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, MAIN, info);
  await expect(page.getByLabel('Your question')).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('honesty-notice')).toBeInViewport();
  await shot(page, info, 'first-screen-1280x800');
});

test('after a submit the result region is in view, focused and announced', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run answers only');
  await page.setViewportSize(info.project.name === 'phone' ? { width: 412, height: 839 } : { width: 1280, height: 800 });
  await open(page, MAIN, info);
  const result = page.getByTestId('chat-result');
  await expect(result).toHaveAttribute('aria-live', 'polite');
  // An example question submits at once.
  await page.locator('.examples .example').first().click();
  await expect(page.getByTestId('chat-answer')).toBeVisible();
  await expect(result).toBeFocused();
  await expect(page.getByTestId('chat-answer')).toBeInViewport();
  await expect(page.getByLabel('Your question')).not.toHaveValue('');
  await shot(page, info, 'after-submit');
});

test('comparison view: clear default question, two columns, plain labels @real', async ({ page }, info) => {
  const errors = await open(page, MAIN, info);
  await page.getByRole('button', { name: 'Cloud and local answers' }).click();
  await expect(page.locator('#question')).toHaveValue('dated-08');
  const columns = page.locator('.columns').first().locator('article.column');
  await expect(columns).toHaveCount(2);
  await expect(columns.nth(0)).toContainText('Cloud model: Claude Sonnet 5.5');
  await expect(columns.nth(1)).toContainText('used by the chat');
  await expect(columns.nth(0)).toContainText("Judge's grade of the whole answer");
  await expect(page.locator('.verdicts').first()).toContainText('20 correct, 12 partly, 2 wrong');
  const visible = await page.locator('main').innerText();
  for (const label of INTERNAL_LABELS) expect(visible, `internal label ${label} in the main view`).not.toMatch(label);
  await columns.nth(1).getByText('Exact settings').click();
  await expect(columns.nth(1).locator('.provenance')).toContainText('qwen3.8:27b');
  await shot(page, info, 'compare');
  expect(errors).toEqual([]);
});

test('in-scope question: answer with a verified quote, an unverified quote and number marks', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run answers only');
  const errors = await open(page, MAIN, info);
  await ask(page, 'Why did the project stay with wide ranges instead of re-centering?');
  const answer = page.getByTestId('chat-answer');
  await expect(answer).toHaveAttribute('data-outcome', 'answered');
  await expect(answer.locator('.quote-verified')).toContainText('Verified quote');
  const unverified = answer.locator('.quote-not-verified');
  await expect(unverified).toContainText('Not verified');
  await expect(unverified).toContainText('Not verified because the quote is not in the cited source');
  const figure = answer.locator('.answer-text .num', { hasText: '4242' });
  await expect(figure).toHaveAttribute('data-state', 'not-verified');
  await expect(figure.locator('.num-glyph')).toHaveText('?');
  await expect(answer.getByTestId('number-summary')).toContainText('not verified');
  await expect(answer).toContainText('Answered by dry run');
  await shot(page, info, 'answer');
  expect(errors).toEqual([]);
});

test('out-of-scope question: the fixed text says what the assistant covers', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run answers only');
  await open(page, MAIN, info);
  await ask(page, 'Write a poem about cats and dogs');
  const answer = page.getByTestId('chat-answer');
  await expect(answer).toHaveAttribute('data-outcome', 'not-in-data');
  await expect(answer.getByTestId('chat-fixed-text')).toContainText('This assistant answers questions about a DeFi liquidity-provision trading system');
  await shot(page, info, 'out-of-scope');
});

test('trading advice is refused without calling a model @real', async ({ page }, info) => {
  await open(page, MAIN, info);
  await ask(page, 'Should I buy ETH now?');
  const answer = page.getByTestId('chat-answer');
  await expect(answer).toHaveAttribute('data-outcome', 'out-of-scope');
  await expect(answer).toContainText('does not give advice on what to buy, sell or hold');
  await expect(answer).toContainText('did not reliably beat simply holding the tokens');
  await expect(answer.locator('.sources')).toHaveCount(0);
  await shot(page, info, 'advice');
});

test('a question with no answer in the data gets the fixed "not in the data" text', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run answers only');
  await open(page, MAIN, info);
  await ask(page, 'What is the recipe for pierogi?');
  const answer = page.getByTestId('chat-answer');
  await expect(answer).toHaveAttribute('data-outcome', 'not-in-data');
  await expect(answer.getByTestId('chat-fixed-text')).toContainText('The project data does not answer this question.');
  // The model's own explanation under the heading, labelled as not backed by a quote (owner, 17 Nov 2026).
  const ex = answer.getByTestId('chat-explanation');
  await expect(ex).toHaveAttribute('data-backed', 'no');
  await expect(ex).toContainText("The model's own explanation. It is not backed by a quote.");
  await expect(ex).toContainText('Dry run: the best source does not mention the question.');
  await expect(answer.locator('.sources summary')).toContainText('Sources searched (10)');
  await shot(page, info, 'not-in-data');
});

test('private LAN addresses are masked in quotes and answers', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run answers only');
  await open(page, MAIN, info);
  await ask(page, 'IP serwera w LAN port 8787 test z Maca');
  const answer = page.getByTestId('chat-answer');
  await expect(answer).toContainText('[private address]');
  expect(await answer.innerText()).not.toMatch(/192\.168\.|10\.8\.0\./);
  await expect(answer.locator('.quote-verified').first()).toContainText('Original, in Polish');
  await shot(page, info, 'masked');
});

test('the rate limit message', async ({ page }, info) => {
  test.skip(againstReal, 'needs the test server with a limit of one question an hour');
  await open(page, TIGHT, info);
  await ask(page, 'When did real capital first go into a position?');
  await expect(page.getByTestId('chat-answer')).toBeVisible({ timeout: 20_000 });
  await ask(page, 'Why were the ranges kept wide?');
  const error = page.getByTestId('chat-error');
  await expect(error).toHaveAttribute('data-error', 'hour');
  await expect(error).toContainText('most questions allowed in an hour');
  await expect(error).toContainText('You can ask again in about');
  await shot(page, info, 'rate-limit');
});

test('the busy message while another question holds the GPU', async ({ browser }, info) => {
  test.skip(againstReal, 'needs the test server with no waiting places');
  const first = await browser.newPage();
  const second = await browser.newPage();
  await open(first, TIGHT, info);
  await open(second, TIGHT, info);
  await ask(first, 'Why were the ranges kept wide?');
  await expect(first.getByTestId('chat-progress')).toBeVisible();
  await ask(second, 'When was the capital withdrawn?');
  const error = second.getByTestId('chat-error');
  await expect(error).toHaveAttribute('data-error', 'busy');
  await expect(error).toContainText('The local model is busy with other questions');
  await shot(second, info, 'busy');
  await expect(first.getByTestId('chat-answer')).toBeVisible({ timeout: 20_000 });
  await first.close();
  await second.close();
});

test('static views work with the chat server down', async ({ page }, info) => {
  test.skip(againstReal, 'needs the static-only test server');
  const errors = await open(page, STATIC_ONLY, info);
  await expect(page.getByTestId('chat-health')).toContainText('cannot be reached');
  await page.getByRole('button', { name: 'Cloud and local answers' }).click();
  await expect(page.locator('.columns').first().locator('article.column')).toHaveCount(2);
  await page.getByRole('button', { name: 'Daily reports' }).click();
  await expect(page.getByTestId('report')).toContainText('Tuesday, 15 September 2026');
  await shot(page, info, 'chat-down');
  // The failed health call is the only expected console error.
  expect(errors.filter((e) => !/502|Bad Gateway|Failed to load resource/.test(e))).toEqual([]);
});

test('daily reports: a live-capital day, Markdown rendered, logs folded @real', async ({ page }, info) => {
  await open(page, MAIN, info);
  await page.getByRole('button', { name: 'Daily reports' }).click();
  const report = page.getByTestId('report');
  await expect(report).toContainText('Tuesday, 15 September 2026');
  await expect(report.locator('.report-contents')).toContainText('What a report holds');
  // The money sections are open, the technical ones folded; the first open section is about money, not data freshness.
  const opened = report.locator('details.report-section[open]');
  await expect(opened.first().locator('.section-gloss')).toHaveText('Tranche balance: deposited, current value, result');
  await expect(report.locator('details.report-section', { hasText: 'Data freshness' })).not.toHaveAttribute('open', '');
  await expect(opened.locator('table').first()).toBeVisible();
  const folded = report.locator('details.md-code');
  expect(await folded.count()).toBeGreaterThan(0);
  for (const d of await folded.all()) expect(await d.getAttribute('open')).toBeNull();
  expect(await report.innerText()).not.toContain('**');
  await shot(page, info, 'reports');
});

test('daily reports: 18 Aug log lines re-decoded for display, with the note @real', async ({ page }, info) => {
  await open(page, MAIN, info);
  await page.getByRole('button', { name: 'Daily reports' }).click();
  await page.getByRole('button', { name: '18 Aug', exact: true }).click();
  const report = page.getByTestId('report');
  await expect(report).toContainText('Tuesday, 18 August 2026');
  await expect(report.getByTestId('report-note')).toContainText('re-decoded for display');
  for (const d of await report.locator('details').all()) await d.evaluate((el) => ((el as HTMLDetailsElement).open = true));
  const text = await report.innerText();
  expect(text).toContain('zbiegł');
  expect(text).not.toMatch(/Ä…|Ĺ‚|â€/);
  // Another day has no note.
  await page.getByRole('button', { name: '19 Aug', exact: true }).click();
  await expect(report.getByTestId('report-note')).toHaveCount(0);
});

test('wallet tab: the exclusion note, nothing that can sign, fixture data marked as such @real', async ({ page }, info) => {
  const errors = await open(page, MAIN, info);
  const tab = page.getByRole('button', { name: 'Wallet' });
  test.skip(againstReal && (await tab.count()) === 0, 'no wallet file on this server');
  await tab.click();
  await expect(page.getByRole('heading', { name: 'Wallet and paper trading' })).toBeVisible();
  await expect(page.locator('.wallet .lede')).toContainText('cannot connect a wallet or sign anything');
  await expect(page.getByTestId('wallet-excluded')).toContainText('Two manual positions opened before the project');
  await expect(page.getByTestId('paper-summary')).toContainText('worth less than simply holding');
  expect(await page.locator('.wallet').innerText()).not.toMatch(/953427|953465/);
  if (!againstReal) {
    // The test server serves the made-up fixture, and the page says so.
    await expect(page.getByTestId('wallet-fixture')).toContainText('made-up positions');
    await expect(page.getByTestId('wallet-positions').locator('article.position')).toHaveCount(2);
    // Fee-aware comparison, defined once, and totals.
    const card = page.getByTestId('wallet-positions').locator('article.position').first();
    await expect(card).toContainText('Against holding, before fees');
    await expect(card).toContainText('Against holding, with fees');
    await expect(page.getByTestId('wallet-totals')).toContainText('+$2.60');
    await expect(page.getByTestId('wallet-definitions')).toContainText('did not record dollar values for the WETH/cbBTC deposits');
    await expect(page.getByTestId('paper-definitions')).toContainText('50/50 split');
    // Repeated paper events read as one phrase with a count; one transaction is one row.
    await expect(page.locator('.paper-table').last()).toContainText('left on a down trend and came back, 3 times');
    await page.getByText('All 3 transactions').click();
    await expect(page.locator('td', { hasText: 'Withdrawn, fees included' })).toHaveCount(1);
  } else await expect(page.getByTestId('wallet-fixture')).toHaveCount(0);
  await shot(page, info, 'wallet');
  expect(errors).toEqual([]);
});

test('no wallet file: the Wallet tab is hidden, the page works', async ({ page }, info) => {
  test.skip(againstReal, 'needs the test servers');
  for (const url of [TIGHT, STATIC_ONLY]) {
    await open(page, url, info);
    await expect(page.getByRole('button', { name: 'Daily reports' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wallet' })).toHaveCount(0);
    expect((await page.request.get(new URL('data/wallet.json', url).toString())).status()).toBe(404);
  }
});

test('keyboard: switch sections and ask without a mouse @real', async ({ page }, info) => {
  await open(page, MAIN, info);
  await page.getByRole('button', { name: 'Daily reports' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('report')).toBeVisible();
  await page.getByRole('button', { name: 'Ask the archive' }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Your question').focus();
  await page.keyboard.type('Should I sell my tokens?');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('chat-answer')).toHaveAttribute('data-outcome', 'out-of-scope');
});

// --- Step 4.10a: models on demand ---

test('models on demand: load button, staged progress with typical times, then the question box unlocks', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run load only');
  const url = `http://127.0.0.1:${info.project.name === 'phone' ? PORTS.loadPhone : PORTS.loadDesktop}`;
  await open(page, url, info, { load: false });
  const panel = page.getByTestId('models-panel');
  await expect(panel).toHaveAttribute('data-state', 'idle');
  await expect(panel).toContainText('Loading usually takes about 25 s');
  await expect(panel).toContainText('released again after 15 minutes without questions');
  await page.getByLabel('Your question').fill('Why were the ranges kept wide?');
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
  await expect(page.locator('.examples .example').first()).toBeDisabled();
  await shot(page, info, 'models-idle');

  await page.getByRole('button', { name: 'Load the local model' }).click();
  await expect(panel).toHaveAttribute('data-state', 'loading');
  const stages = panel.locator('.stage');
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0)).toContainText('Language model');
  await expect(stages.nth(1)).toContainText('Search model');
  await expect(stages.nth(2)).toContainText('Checking both are ready');
  await expect(stages.nth(0)).toContainText('usually about 22 s');
  // Order: the language model first; the search model waits until it is done (step 3.5).
  await expect(stages.nth(0)).toHaveAttribute('data-status', 'running');
  await expect(stages.nth(1)).toHaveAttribute('data-status', 'pending');
  await shot(page, info, 'models-loading');
  await expect(stages.nth(0)).toHaveAttribute('data-status', 'done', { timeout: 5_000 });
  await expect(stages.nth(1)).toHaveAttribute('data-status', 'running');

  await expect(panel).toHaveAttribute('data-state', 'ready', { timeout: 10_000 });
  await expect(panel).toContainText('It is released after 15 minutes without questions.');
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByTestId('chat-answer')).toHaveAttribute('data-outcome', 'answered');
  await shot(page, info, 'models-ready-answer');
});

test('models on demand: the owner switch off shows the offline text and no load button', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run switch only');
  const errors = await open(page, `http://127.0.0.1:${PORTS.off}`, info, { load: false });
  await expect(page.getByTestId('chat-health')).toContainText('the owner has switched the local model off');
  await expect(page.getByTestId('models-panel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Load the local model' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
  // The saved views still work.
  await page.getByRole('button', { name: 'Daily reports' }).click();
  await expect(page.getByTestId('report')).toBeVisible();
  expect(errors).toEqual([]);
  await shot(page, info, 'models-switch-off');
});

test('models on demand: a failed load shows the fixed text, no retry, a short wait, then the button again', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run failure only');
  await open(page, `http://127.0.0.1:${PORTS.loadFail}`, info, { load: false });
  const button = page.getByRole('button', { name: 'Load the local model' });
  await expect(button).toBeEnabled({ timeout: 10_000 });
  await button.click();
  const error = page.getByTestId('chat-error');
  await expect(error).toHaveAttribute('data-error', 'load-failed', { timeout: 10_000 });
  await expect(error).toContainText('could not be loaded right now');
  await expect(error).not.toContainText('purpose');
  // Owner, 17 Nov 2026: after a failed load nobody starts another one for a while (3 s on this test server).
  await expect(page.getByTestId('models-cooldown')).toContainText('A new attempt is possible in about');
  await expect(button).toBeDisabled();
  await shot(page, info, 'models-load-failed');
  await expect(page.getByTestId('models-panel')).toHaveAttribute('data-state', 'idle');
  await expect(button).toBeEnabled({ timeout: 10_000 });
  await expect(page.getByTestId('models-cooldown')).toHaveCount(0);
});

test('models on demand: the owner switch turned off releases loaded models, then the page says offline', async ({ page }, info) => {
  test.skip(againstReal, 'dry-run switch only');
  writeFileSync(SWITCH_FILE, 'on\n');
  await open(page, `http://127.0.0.1:${PORTS.switching}`, info);
  const panel = page.getByTestId('models-panel');
  await expect(panel).toHaveAttribute('data-state', 'ready');
  writeFileSync(SWITCH_FILE, 'off\n');
  await page.getByLabel('Your question').fill('Why were the ranges kept wide?');
  // The page learns the state from the next refusal or poll; a question sent now is refused, not answered.
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByTestId('chat-error')).toHaveAttribute('data-error', /unloading|switch-off/, { timeout: 10_000 });
  await expect(page.getByTestId('chat-health')).toContainText('the owner has switched the local model off', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Load the local model' })).toHaveCount(0);
  await shot(page, info, 'models-switched-off');
});
