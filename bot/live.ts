/**
 * bot/live.ts — entry of the phase 5 "Live" demo: the paper observer with no wallet (ai/APP-PLAN.md section 12,
 * step 5.1).
 *
 *   BOT_STATE_DIR=<absolute folder outside the repo> node --import tsx bot/live.ts
 *
 * What it guarantees before the observer is loaded:
 *   - no environment file is read (the observer imports dotenv; it is pointed at a file that does not exist, so a
 *     repo .env, which in the wallet era held keys, never reaches this process);
 *   - it refuses to start when the environment holds anything key-like or wallet-like: a private key, a mnemonic, the
 *     owner's watch address, Telegram, HyperSync or Envio tokens, or an Anthropic key;
 *   - the state folder is given, absolute, and is not inside the repo;
 *   - BOT_MODE=live, so the observer runs only its wallet-free loops (prices, statistics, gas, the paper step, the
 *     selector).
 * The observer reads the chain through viem's public client only (no account, no key, no wallet client); a test
 * (bot/live.test.ts) checks that no signing API is reachable from this entry.
 */
import * as fs from 'fs';
import * as path from 'path';

/** Environment variables that must not be present in the Live process. */
export const FORBIDDEN_ENV = /^(PRIVATE_KEY|.*_PRIVATE_KEY|MNEMONIC|.*_MNEMONIC|SEED_PHRASE|BOT_WATCH_ADDRESS|TG_TOKEN|TG_CHAT|HYPERSYNC_BEARER_TOKEN|ENVIO_API_TOKEN|ANTHROPIC_API_KEY|WALLET_CONNECT_PROJECT_ID|BOT_API_TOKEN)$/i;

/** Why the Live process must not start, or null. */
export function liveStartProblem(env: NodeJS.ProcessEnv, repoRoot: string): string | null {
  const bad = Object.keys(env).filter((k) => FORBIDDEN_ENV.test(k) && env[k]);
  if (bad.length) return `refusing to start: the environment holds ${bad.join(', ')} (the Live demo uses no wallet, key or token)`;
  const dir = env.BOT_STATE_DIR;
  if (!dir) return 'refusing to start: set BOT_STATE_DIR to a folder outside the repo';
  if (!path.isAbsolute(dir)) return 'refusing to start: BOT_STATE_DIR must be an absolute path';
  const rel = path.relative(path.resolve(repoRoot), path.resolve(dir));
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) return 'refusing to start: BOT_STATE_DIR must be outside the repo';
  return null;
}

/**
 * Optional measurement for step 5.1 (LIVE_COUNT_CALLS=1): counts outgoing HTTP calls and failures per host and writes
 * the totals to <state>/net-stats.json every minute. It only observes fetch; the observer behaves the same.
 */
function countCalls(stateDir: string) {
  const stats: Record<string, { calls: number; failures: number; lastFailure?: string }> = {};
  const startedAt = new Date().toISOString();
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return 'unknown';
      }
    })();
    const s = (stats[host] ??= { calls: 0, failures: 0 });
    s.calls++;
    try {
      const r = await orig(input, init);
      if (!r.ok) {
        s.failures++;
        s.lastFailure = `${new Date().toISOString()} HTTP ${r.status}`;
      }
      return r;
    } catch (e) {
      s.failures++;
      s.lastFailure = `${new Date().toISOString()} ${String(e).slice(0, 80)}`;
      throw e;
    }
  }) as typeof fetch;
  setInterval(() => fs.writeFileSync(path.join(stateDir, 'net-stats.json'), JSON.stringify({ startedAt, now: new Date().toISOString(), hosts: stats }, null, 1)), 60_000).unref();
}

async function main() {
  const problem = liveStartProblem(process.env, path.join(__dirname, '..'));
  if (problem) {
    console.error(`[live] ${problem}`);
    process.exit(1);
  }
  process.env.BOT_MODE = 'live';
  // dotenv/config (imported by the observer) reads this path; it does not exist, so nothing is loaded.
  process.env.DOTENV_CONFIG_PATH = path.join(process.env.BOT_STATE_DIR!, '.no-env-file');
  if (process.env.LIVE_COUNT_CALLS === '1') countCalls(process.env.BOT_STATE_DIR!);
  await import('./observer');
}

if (require.main === module) void main();
