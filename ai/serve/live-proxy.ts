/**
 * `/live/api/*`: the chat server forwards the "Live" page's reads to the read-only bot API on 127.0.0.1 (phase 5,
 * step 5.2, ai/APP-PLAN.md section 12). The page stays same-origin, so the CSP does not change.
 *
 * Between the visitor and the bot API:
 *   - an allow-list of routes and GET only; anything else is a 404 before any upstream call;
 *   - `hours` accepts only a few values (24, 72, 168); any other value becomes the default, so the cache has few keys;
 *   - a cache of 30 s per route and `hours` value: however many visitors, the bot API sees at most one request per
 *     key per 30 s, and one upstream request at a time per key (concurrent misses wait for the same fetch);
 *   - a response size cap (the bot API reads whole ndjson files; a cap keeps a grown file from becoming a large
 *     response), an upstream timeout, and a fixed 502 or 503 with no upstream details;
 *   - the chat server's own rate limiter, a separate instance with its own limits, counted per visitor.
 * The upstream body is passed as JSON text the bot API already built from field allow-lists (bot/server-public.ts).
 */
import express, { type Router } from 'express';
import { clientIp, type RateLimiter } from './ratelimit';

export interface LiveOptions {
  /** The bot API's base, for example http://127.0.0.1:8788; only a loopback address is accepted. */
  botUrl: string;
  limiter: RateLimiter;
  trustProxy: 'none' | 'cloudflare';
  fetchFn?: typeof fetch;
  now?: () => number;
  cacheMs?: number;
  maxBytes?: number;
  timeoutMs?: number;
}

/** Routes the page reads; `hours` is passed on only for the two history routes. */
export const LIVE_ROUTES = new Set(['state', 'paper', 'history', 'ranking', 'wide-ranking', 'wide-daily', 'wide-backtests', 'candidates']);
const HOURS_ROUTES = new Set(['paper', 'history']);
export const LIVE_HOURS = [24, 72, 168] as const;
const DEFAULT_HOURS = 72;
const RESULT_NAME = /^walkforward-[a-z0-9-]{3,60}-365d-45d\.json$/;
export const LIVE_MAX_BYTES = 4 * 1024 * 1024;

export class LiveConfigError extends Error {}

/** Accepts only http on a loopback host, with a port and no path, query or credentials. */
export function checkBotUrl(u: string): string {
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    throw new LiveConfigError('SERVE_LIVE_BOT_URL is not a URL');
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !url.port) {
    throw new LiveConfigError('SERVE_LIVE_BOT_URL must be http://127.0.0.1:<port>');
  }
  if (url.username || url.password || (url.pathname !== '/' && url.pathname !== '') || url.search) {
    throw new LiveConfigError('SERVE_LIVE_BOT_URL must have no path, query or credentials');
  }
  return `${url.protocol}//${url.host}`;
}

interface Entry {
  at: number;
  status: number;
  body: string;
}

export function liveRouter(o: LiveOptions): Router {
  const base = checkBotUrl(o.botUrl);
  const fetchFn = o.fetchFn ?? fetch;
  const now = o.now ?? Date.now;
  const cacheMs = o.cacheMs ?? 30_000;
  const maxBytes = o.maxBytes ?? LIVE_MAX_BYTES;
  const timeoutMs = o.timeoutMs ?? 8_000;
  const cache = new Map<string, Entry>();
  const inFlight = new Map<string, Promise<Entry>>();
  const router = express.Router();

  const upstream = async (pathAndQuery: string): Promise<Entry> => {
    try {
      const r = await fetchFn(base + pathAndQuery, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
      const text = await r.text();
      if (Buffer.byteLength(text) > maxBytes) return { at: now(), status: 502, body: JSON.stringify({ error: 'too-large' }) };
      if (r.status === 503) return { at: now(), status: 503, body: JSON.stringify({ error: 'not-ready' }) };
      if (!r.ok) return { at: now(), status: r.status === 404 ? 404 : 502, body: JSON.stringify({ error: r.status === 404 ? 'not-found' : 'upstream' }) };
      JSON.parse(text); // only JSON goes out
      return { at: now(), status: 200, body: text };
    } catch {
      return { at: now(), status: 502, body: JSON.stringify({ error: 'upstream' }) };
    }
  };

  const cached = async (key: string): Promise<Entry> => {
    const hit = cache.get(key);
    if (hit && now() - hit.at < cacheMs) return hit;
    let p = inFlight.get(key);
    if (!p) {
      p = upstream(key).then((e) => {
        cache.set(key, e);
        return e;
      });
      p.finally(() => inFlight.delete(key)).catch(() => undefined);
      inFlight.set(key, p);
    }
    return p;
  };

  router.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(404).json({ error: 'not-found' });
    const visitor = o.limiter.visitor(clientIp(req.headers, req.socket.remoteAddress, o.trustProxy));
    const limit = o.limiter.take(visitor);
    if (!limit.ok) return res.status(429).set('retry-after', String(limit.retryAfterSec)).json({ error: 'rate-limited' });
    next();
  });

  const send = (res: express.Response, e: Entry) =>
    res.status(e.status).set({ 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' }).send(e.body);

  router.get('/results/:name', async (req, res) => {
    if (!RESULT_NAME.test(req.params.name)) return res.status(404).json({ error: 'not-found' });
    send(res, await cached(`/api/results/${req.params.name}`));
  });

  router.get('/:route', async (req, res) => {
    const route = req.params.route;
    if (!LIVE_ROUTES.has(route)) return res.status(404).json({ error: 'not-found' });
    let key = `/api/${route}`;
    if (HOURS_ROUTES.has(route)) {
      const h = Number(req.query.hours);
      key += `?hours=${(LIVE_HOURS as readonly number[]).includes(h) ? h : DEFAULT_HOURS}`;
    }
    send(res, await cached(key));
  });

  router.use((_req, res) => res.status(404).json({ error: 'not-found' }));
  return router;
}
