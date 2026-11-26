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
/**
 * The agreed visible changes in the original app, relative to the snapshot: [what, before, after]. The snapshot was
 * retaken on 25 Nov 2026 from the src/ of 4427528, which already holds the earlier agreed changes (the cbBTC units,
 * checked against the first snapshot in 04108dc); since then the components only gained optional props, so the list
 * is empty and the HTML must match exactly.
 */
export const AGREED: [string, RegExp, string][] = [];

const normalize = (html: string) =>
  html
    .replace(/(just now|\d+ min ago|\d+ h ago)/g, 'AGE') // the data-age column depends on the clock
    .replace(/\b20\d\d-\d\d-\d\d\b/g, 'DATE') // the fixture's ranking day is the day the suite runs
    .replace(/ style="[^"]*"/g, ''); // inline styles carry nothing the snapshot is about

test('original telemetry, observation analysis and both rankings render as before without the Live props', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one viewport is enough for an HTML comparison');
  await page.goto(`${BOT}/harness/`);
  await page.locator('.telemetry-title', { hasText: 'Bot telemetry' }).click();
  await page.locator('.telemetry-title', { hasText: 'Observation analysis' }).click();
  await page.locator('.telemetry-title', { hasText: 'Daily ranking (TOP 10)' }).click();
  await page.locator('.telemetry-title', { hasText: 'WIDE ranking' }).click();
  await expect(page.locator('.topranking-status-in')).toHaveCount(1);
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
