/**
 * bot/live-guard.ts — the start refusal shared by both Live processes (bot/live.ts and bot/server-public.ts): no key,
 * wallet or token in the environment, and a state folder that is given, absolute and outside the repo.
 */
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

