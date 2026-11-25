/**
 * bot/live-count.ts — optional per-host count of outgoing HTTP calls for the Live demo's measurement (steps 5.1 and
 * 5.6, LIVE_COUNT_CALLS=1). It only observes fetch; the program behaves the same.
 *
 * In the main Live process bot/live.ts calls countCalls(<state>/net-stats.json). The nightly steps are child processes;
 * bot/live-nightly.ts starts them with `--import ./bot/live-count.ts` and LIVE_COUNT_FILE=<state>/net-stats-<step>.json,
 * so this module installs itself when that variable is set.
 */
import * as fs from 'fs';

type HostStats = Record<string, { calls: number; failures: number; lastFailure?: string }>;

export function countCalls(file: string): void {
  const stats: HostStats = {};
  const startedAt = new Date().toISOString();
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let host = 'unknown';
    try {
      host = new URL(url).host;
    } catch {
      // keep 'unknown'
    }
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
      // the error text may carry the URL; only its kind is kept
      s.lastFailure = `${new Date().toISOString()} ${e instanceof Error ? e.name : 'error'}`;
      throw e;
    }
  }) as typeof fetch;
  const flush = () => {
    try {
      fs.writeFileSync(file, JSON.stringify({ startedAt, now: new Date().toISOString(), hosts: stats }, null, 1));
    } catch {
      // the measurement must never take the program down
    }
  };
  setInterval(flush, 60_000).unref();
  process.on('exit', flush);
}

if (process.env.LIVE_COUNT_FILE) countCalls(process.env.LIVE_COUNT_FILE);
