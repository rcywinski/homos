/**
 * End-to-end suite of the showcase (phase 4, step 4.5): a real browser walks the visitor paths against the built
 * showcase and the chat server with fake models. Needs `npm run showcase:build` first.
 *
 *   npx playwright test                       three local servers with fake models (no GPU, no network)
 *   E2E_BASE_URL=http://<box>:8790 npx playwright test --grep @real
 *                                             the same paths against the real server on the LAN (step 4.8)
 *
 * E2E_SHOTS_DIR, when set, receives one screenshot per path for the report to the owner.
 */
import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import path from 'path';

const server = (name: string, port: number, extra: Record<string, string>) => ({
  command: `node --import tsx ${path.join('ai', 'serve', 'server-cli.ts')}`,
  url: `http://127.0.0.1:${port}/api/health`,
  reuseExistingServer: false,
  timeout: 120_000,
  stdout: 'ignore' as const,
  stderr: 'pipe' as const,
  env: {
    ANTHROPIC_API_KEY: '',
    SERVE_ENGINE: 'fake',
    SERVE_PORT: String(port),
    SERVE_TRUST_PROXY: 'cloudflare',
    SERVE_LOG_DIR: path.join(os.tmpdir(), `homos-e2e-${name}-logs`),
    SERVE_PAUSE_FILE: path.join(os.tmpdir(), `homos-e2e-${name}-PAUSED`),
    ...extra,
  },
});

export const PORTS = { main: 8801, tight: 8802, staticOnly: 8803 };

export default defineConfig({
  testDir: path.join('showcase', 'e2e'),
  outputDir: path.join('showcase', 'e2e', 'results'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: { ...devices['Desktop Chrome'], screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        server('main', PORTS.main, { SERVE_LIMIT_HOUR: '1000', SERVE_LIMIT_DAY: '1000', SERVE_LIMIT_GLOBAL_DAY: '100000' }),
        server('tight', PORTS.tight, { SERVE_LIMIT_HOUR: '1', SERVE_QUEUE_MAX: '0', SERVE_FAKE_DELAY_MS: '3000' }),
        {
          command: `node --import tsx ${path.join('showcase', 'e2e', 'static-only.ts')} ${PORTS.staticOnly}`,
          url: `http://127.0.0.1:${PORTS.staticOnly}/`,
          reuseExistingServer: false,
          timeout: 60_000,
        },
      ],
});
