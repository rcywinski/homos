/**
 * The admin page in a real browser (phase 4, step 4.10c). Cloudflare Access is stood in for by showcase/e2e/fake-access.ts
 * (a JWKS endpoint with a key made at start); the test signs Cf-Access-Jwt-Assertion itself and sends it as a header,
 * as Access does in front of the real server.
 */
import { expect, test, type Page } from '@playwright/test';
import { createPrivateKey, createSign } from 'crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

const ADMIN = 'http://127.0.0.1:8810';
const MASTER = path.join(os.tmpdir(), 'homos-e2e-admin-SWITCH');
const STATE = path.join(os.tmpdir(), 'homos-e2e-admin-state', 'admin-switch');

function token(email = 'owner@example.com') {
  const key = createPrivateKey(readFileSync(path.join(os.tmpdir(), 'homos-e2e-access-key.pem')));
  const head = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'e2e', typ: 'JWT' })).toString('base64url');
  const t = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ aud: ['e'.repeat(64)], iss: 'https://e2e.cloudflareaccess.com', email, exp: t + 600, nbf: t - 10 })).toString('base64url');
  return `${head}.${body}.${createSign('RSA-SHA256').update(`${head}.${body}`).sign(key).toString('base64url')}`;
}

async function asOwner(page: Page) {
  await page.setExtraHTTPHeaders({ 'cf-access-jwt-assertion': token() });
}

test.beforeEach(() => {
  writeFileSync(MASTER, 'on\n');
  rmSync(path.dirname(STATE), { recursive: true, force: true });
  mkdirSync(path.dirname(STATE), { recursive: true });
});

test('admin: without a valid Access token nothing about the page is served', async ({ page }) => {
  for (const p of ['/admin', '/admin/admin.js', '/admin/admin.css', '/api/admin/state']) {
    const r = await page.request.get(ADMIN + p);
    expect(r.status(), p).toBe(403);
  }
  const other = await page.request.get(ADMIN + '/api/admin/state', { headers: { 'cf-access-jwt-assertion': token('someone@example.com') } });
  expect(other.status()).toBe(403);
  // The public page is not affected and does not link the admin page.
  const html = await (await page.request.get(ADMIN + '/')).text();
  expect(html).not.toContain('admin');
});

test('admin: the owner turns the models on and off; the page state is fail-safe off at first', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await asOwner(page);
  await page.goto(ADMIN + '/admin');
  await expect(page.getByTestId('admin')).toBeVisible();
  await expect(page.getByTestId('admin-effective')).toHaveText('Models off');
  await expect(page.getByTestId('admin-page')).toHaveText('not set yet (off)');
  await expect(page.getByTestId('admin-master')).toHaveText('on');
  await page.getByRole('button', { name: 'Turn on' }).click();
  await expect(page.getByTestId('admin-effective')).toHaveText('Models allowed');
  expect(readFileSync(STATE, 'utf8').trim()).toBe('on');
  await page.screenshot({ path: info.outputPath('admin-on.png'), fullPage: true });
  // The public page now offers the load button.
  const pub = await page.request.get(ADMIN + '/api/models');
  expect(((await pub.json()) as { state: string }).state).toBe('idle');
  await page.getByRole('button', { name: 'Turn off' }).click();
  await expect(page.getByTestId('admin-effective')).toHaveText('Models off');
  expect(readFileSync(STATE, 'utf8').trim()).toBe('off');
  expect(errors).toEqual([]);
});

test('admin: with the switch on the box off, the page cannot turn the models on', async ({ page }, info) => {
  writeFileSync(MASTER, 'off\n');
  await asOwner(page);
  await page.goto(ADMIN + '/admin');
  await expect(page.getByTestId('admin-master-off')).toContainText('The switch on the box is off');
  await expect(page.getByRole('button', { name: 'Turn on' })).toBeDisabled();
  // Even a direct request is refused.
  const r = await page.request.post(ADMIN + '/api/admin/switch', { headers: { 'content-type': 'application/json', origin: ADMIN, 'cf-access-jwt-assertion': token() }, data: { on: true } });
  expect(r.status()).toBe(409);
  await page.screenshot({ path: info.outputPath('admin-master-off.png'), fullPage: true });
});
