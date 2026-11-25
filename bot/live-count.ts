/**
 * bot/live-count.ts — optional per-host count of outgoing HTTP calls for the Live demo's measurement (steps 5.1 and
 * 5.6, LIVE_COUNT_CALLS=1). It only observes fetch; the program behaves the same.
 *
 * Per host: calls, HTTP failures (a status other than 2xx, or no response), and JSON-RPC errors (an HTTP 200 whose
 * JSON body carries `error`, such as a provider's usage limit or a range refusal), in total and per UTC hour.
 *
 * In the main Live process bot/live.ts calls countCalls(<state>/net-stats.json). The nightly steps are child processes;
 * bot/live-nightly.ts starts them with `--import ./bot/live-count.ts` and LIVE_COUNT_FILE=<state>/net-stats-<step>.json,
 * so this module installs itself when that variable is set.
 */
import * as fs from 'fs';

export interface Counts {
  calls: number;
  httpFailures: number;
  rpcErrors: number;
}
export interface HostCounts extends Counts {
  /** HTTP 429 answers (rate limited), also counted in httpFailures. */
  http429?: number;
  lastHttpFailure?: string;
  lastRpcError?: string;
  /** UTC hour "YYYY-MM-DDTHH" -> counts in that hour. */
  byHour: Record<string, Counts>;
}

/** The JSON-RPC error of a response body (single or batch), as "code: message", or null. */
export function rpcErrorOf(body: string): string | null {
  let j: unknown;
  try {
    j = JSON.parse(body);
  } catch {
    return null;
  }
  for (const item of Array.isArray(j) ? j : [j]) {
    const e = item && typeof item === 'object' ? (item as { error?: { code?: unknown; message?: unknown } }).error : undefined;
    // the message is cut short and stripped of URLs (some providers put a sign-up link in it)
    if (e) return `${String(e.code ?? '?')}: ${String(e.message ?? '').replace(/https?:\/\/\S+/g, '[url]').slice(0, 80)}`;
  }
  return null;
}

export function countCalls(file: string): { flush: () => void; stats: Record<string, HostCounts> } {
  const stats: Record<string, HostCounts> = {};
  const startedAt = new Date().toISOString();
  const orig = globalThis.fetch;
  const bump = (host: string, k: keyof Counts) => {
    const s = (stats[host] ??= { calls: 0, httpFailures: 0, rpcErrors: 0, byHour: {} });
    const h = (s.byHour[new Date().toISOString().slice(0, 13)] ??= { calls: 0, httpFailures: 0, rpcErrors: 0 });
    s[k]++;
    h[k]++;
    return s;
  };
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let host = 'unknown';
    try {
      host = new URL(url).host;
    } catch {
      // keep 'unknown'
    }
    bump(host, 'calls');
    try {
      const r = await orig(input, init);
      if (!r.ok) {
        const s = bump(host, 'httpFailures');
        s.lastHttpFailure = `${new Date().toISOString()} HTTP ${r.status}`;
        if (r.status === 429) s.http429 = (s.http429 ?? 0) + 1;
      } else if ((r.headers.get('content-type') ?? '').includes('json') && (init?.method ?? 'GET').toUpperCase() === 'POST') {
        // JSON-RPC calls are POSTs; read a copy of the body so the caller still gets the original stream
        const err = rpcErrorOf(await r.clone().text());
        if (err) bump(host, 'rpcErrors').lastRpcError = `${new Date().toISOString()} ${err}`;
      }
      return r;
    } catch (e) {
      // the error text may carry the URL; only its kind is kept
      bump(host, 'httpFailures').lastHttpFailure = `${new Date().toISOString()} ${e instanceof Error ? e.name : 'error'}`;
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
  return { flush, stats };
}

if (process.env.LIVE_COUNT_FILE) countCalls(process.env.LIVE_COUNT_FILE);
