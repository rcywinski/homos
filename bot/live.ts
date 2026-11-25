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
 *     selector);
 *   - the nightly data steps (bot/live-nightly.ts: DefiLlama history, WIDE ranking, daily model) run once a day after
 *     05:00 local, as child processes with this same checked environment; on a cold start (no DefiLlama universe in
 *     the state folder yet) the first fetch runs before the observer, so the selector has data on its first check.
 * The observer reads the chain through viem's public client only (no account, no key, no wallet client); a test
 * (bot/live.test.ts) checks that no signing API is reachable from this entry.
 */
import * as fs from 'fs';
import * as path from 'path';
import { nightlyDue, readNightly, runNightly, stepsLeft } from './live-nightly';
import { countCalls } from './live-count';
import { installConsoleScrub, scrubUrls } from './live-scrub';

export { FORBIDDEN_ENV, liveStartProblem } from './live-guard';
import { liveStartProblem } from './live-guard';

/** Keeps a log under `max` bytes: past it, the file becomes `<name>.1` (replacing an older one) and a new one starts. */
export function rotateLog(file: string, max = 5 * 1024 * 1024): boolean {
  try {
    if (fs.statSync(file).size <= max) return false;
    fs.renameSync(file, `${file}.1`);
    return true;
  } catch {
    return false; // missing file, or a rename that failed: try again next time
  }
}

async function main() {
  const problem = liveStartProblem(process.env, path.join(__dirname, '..'));
  if (problem) {
    console.error(`[live] ${problem}`);
    process.exit(1);
  }
  process.env.BOT_MODE = 'live';
  // No URL in any console line of this process (the advisor and viem print to the console).
  installConsoleScrub();
  // The DefiLlama history for the selector lives in the state folder too, not in the clone (a redeploy replaces it).
  process.env.BOT_LLAMA_DIR ??= path.join(process.env.BOT_STATE_DIR!, 'llama');
  // dotenv/config (imported by the observer) reads this path; it does not exist, so nothing is loaded.
  process.env.DOTENV_CONFIG_PATH = path.join(process.env.BOT_STATE_DIR!, '.no-env-file');
  // Every data folder of the demo lives in the state folder, none in the clone (a redeploy replaces the clone).
  process.env.BOT_DATA_DIR ??= path.join(process.env.BOT_STATE_DIR!, 'data');
  if (process.env.LIVE_COUNT_CALLS === '1') countCalls(path.join(process.env.BOT_STATE_DIR!, 'net-stats.json'));
  const stateDir = process.env.BOT_STATE_DIR!;
  const repoRoot = path.join(__dirname, '..');
  const log = (m: string) => {
    const line = `${new Date().toISOString()} ${scrubUrls(m)}`;
    console.log(line);
    fs.appendFileSync(path.join(stateDir, 'observer.log'), line + '\n');
  };
  fs.mkdirSync(stateDir, { recursive: true });
  // The observer appends to <state>/observer.log for as long as it runs; keep it bounded (checked hourly).
  const observerLog = path.join(stateDir, 'observer.log');
  rotateLog(observerLog);
  setInterval(() => rotateLog(observerLog), 60 * 60_000).unref();
  if (process.env.LIVE_NIGHTLY !== '0') {
    if (!fs.existsSync(path.join(process.env.BOT_LLAMA_DIR!, 'universe.json'))) {
      log('cold start: fetching the DefiLlama history before the observer (the selector needs it)');
      await runNightly(stateDir, repoRoot, log, ['fetch-llama-history']);
    }
    let running = false;
    // Runs only the steps that have not succeeded today: after a cold start that is the WIDE ranking and the daily model,
    // a few minutes later (after the selector's first ranking), without fetching the DefiLlama history again.
    const tick = () => {
      const st = readNightly(stateDir);
      if (running || !nightlyDue(st)) return;
      running = true;
      void runNightly(stateDir, repoRoot, log, stepsLeft(st)).finally(() => (running = false));
    };
    setInterval(tick, 10 * 60_000);
    setTimeout(tick, 3 * 60_000);
  }
  await import('./observer');
}

if (require.main === module) void main();
