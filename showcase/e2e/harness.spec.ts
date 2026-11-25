/**
 * "Renders as before" for the original BotTelemetry and ObservationAnalysis (phase 5, 5.4 follow-ups): both sections
 * opened in the test-only harness, WITHOUT the Live props, compared with a snapshot taken from the unchanged src/.
 * Allowed differences are exactly the agreed visible changes, applied to the snapshot below and listed one by one.
 * UPDATE_HARNESS_SNAPSHOT=1 writes the snapshot instead (done once, before the src/ change).
 */
import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const BOT = 'http://127.0.0.1:8811';
const SNAPSHOT = path.join('showcase', 'e2e', 'fixtures', 'harness.before.html');

/** The agreed visible changes in the original app (owner, 25 Nov 2026): [what, before, after]. */
export const AGREED: [string, RegExp, string][] = [
  // Item b of the 5.4 review: pools without a stablecoin leg show their price per cbBTC and the range in WETH per cbBTC.
  ['cbBTC 0.05% price per cbBTC', /(base-cbbtc-weth-005<\/td><td>)\$100,000(<\/td>)/, '$1$$100,000/cbBTC$2'],
  ['cbBTC 0.05% range in WETH per cbBTC', /(base-cbbtc-weth-005<\/td>(?:<td>[^<]*<\/td>){4}<td>)\$26 – \$50(<\/td>)/, '$125.6 – 50.3 WETH per cbBTC$2'],
  ['cbBTC 0.30% price per cbBTC', /(base-weth-cbbtc-030<\/td><td>)\$100,000(<\/td>)/, '$1$$100,000/cbBTC$2'],
  ['cbBTC 0.30% range in WETH per cbBTC', /(base-weth-cbbtc-030<\/td>(?:<td>[^<]*<\/td>){4}<td>)\$32 – \$40(<\/td>)/, '$132.3 – 39.8 WETH per cbBTC$2'],
];

const normalize = (html: string) =>
  html
    .replace(/(just now|\d+ min ago|\d+ h ago)/g, 'AGE') // the data-age column depends on the clock
    .replace(/ style="[^"]*"/g, ''); // inline styles carry nothing the snapshot is about

test('original telemetry and observation analysis render as before without the Live props', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one viewport is enough for an HTML comparison');
  await page.goto(`${BOT}/harness/`);
  await page.locator('.telemetry-title', { hasText: 'Bot telemetry' }).click();
  await page.locator('.telemetry-title', { hasText: 'Observation analysis' }).click();
  await expect(page.locator('.observation-walkforward-table')).toHaveCount(2);
  await expect(page.locator('.observation-pool-block svg').first()).toBeVisible();
  const html = normalize(await page.locator('#sections').innerHTML());
  if (process.env.UPDATE_HARNESS_SNAPSHOT === '1') {
    writeFileSync(SNAPSHOT, html + '\n');
    return;
  }
  let expected = readFileSync(SNAPSHOT, 'utf8').trimEnd();
  for (const [what, from, to] of AGREED) {
    const next = expected.replace(from, to);
    expect(next, `agreed change not found in the snapshot: ${what}`).not.toBe(expected);
    expected = next;
  }
  expect(html).toBe(expected);
});
