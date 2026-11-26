/**
 * bot/server-public.ts — the bot API in its public read-only mode, for the phase 5 "Live" demo (ai/APP-PLAN.md
 * section 12, step 5.1). The private `bot/server.ts` is unchanged.
 *
 *   BOT_STATE_DIR=<folder> [BOT_RESULTS_DIR=<folder>] [BOT_API_PORT=8788] node --import tsx bot/server-public.ts
 *
 * Differences from bot/server.ts, by design:
 *   - only GET, only the routes the Live page reads; every other method and path answers 404 before any handler;
 *   - no static folder, no CORS header (its only client is the chat server on 127.0.0.1), bound to 127.0.0.1;
 *   - no write route (no proposal dismissal), no ledger, no closed positions, no positions history, no token;
 *   - state, paper, history and the two rankings are built from allow-lists of fields: no RPC URLs (a paid key would
 *     sit in one), no watch address, no local paths, no proposals; the wide daily model, the full-run summaries and
 *     the candidate verdicts are public market and backtest data, passed through with the scrub below only;
 *   - /api/results/:name serves only the walk-forward files of the six paper pools, by a fixed list.
 * A last check scrubs any string that still looks like a URL, a local path or an unknown 40-hex address.
 */
import express, { type Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { BOT_POOLS } from './config';
import { readVerdicts } from './candidates';
import { liveStartProblem } from './live-guard';

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const bool = (v: unknown) => (typeof v === 'boolean' ? v : null);
const pick = <T extends object>(o: unknown, keys: (keyof T)[], conv: (k: keyof T, v: unknown) => unknown = (_k, v) => v): Partial<T> => {
  const out: Partial<T> = {};
  if (!o || typeof o !== 'object') return out;
  for (const k of keys) {
    const v = (o as Record<string, unknown>)[k as string];
    if (v !== undefined) (out as Record<string, unknown>)[k as string] = conv(k, v);
  }
  return out;
};

/** Contract addresses that may appear (the paper pools' pool and token contracts), lower-case. */
function allowedAddresses(): Set<string> {
  const set = new Set<string>();
  const add = (v: unknown) => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v) && set.add(v.toLowerCase());
  for (const p of BOT_POOLS as unknown as Record<string, unknown>[]) for (const v of Object.values(p)) add(v);
  return set;
}

const ALLOWED = allowedAddresses();
const LOCAL_PATH = /([A-Za-z]:\\|\\\\|\/Users\/|\/home\/|\/tmp\/|\/var\/|\/private\/)/;

/** Last line of defence: replaces any string that still looks like a URL, a local path or an unknown address. */
export function scrub(v: unknown): unknown {
  if (typeof v === 'string') {
    if (/https?:\/\//i.test(v) || LOCAL_PATH.test(v)) return '[removed]';
    return v.replace(/0x[0-9a-fA-F]{40}/g, (a) => (ALLOWED.has(a.toLowerCase()) ? a : '[address]'));
  }
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)]));
  return v;
}

const POOL_FIELDS = ['id', 'ethUsd', 'tick', 'sqrtPriceX96', 'stats', 'suggestion', 'updatedAt', 'flatSince', 'flatConfirmed', 'trendGapPct', 'statsAt', 'statsWindow'] as const;
const PAPER_POSITION_FIELDS = [
  'poolId', 'status', 'tickLower', 'tickUpper', 'capitalUsd', 'feesUsd', 'feesSinceRebalanceUsd', 'costsUsd', 'rebalances',
  'hedge', 'hedgePnlRealizedUsd', 'openedAt', 'startedAt', 'outOfRangeSince',
] as const;
const PAPER_HISTORY_FIELDS = ['ts', 'poolId', 'status', 'equityUsd', 'hodlUsd', 'feesUsd', 'costsUsd', 'inRange', 'trendDown', 'rebalances', 'price', 'lo', 'hi'] as const;
const HISTORY_FIELDS = ['ts', 'poolId', 'price', 'volDaily', 'feeYieldDaily', 'rangeLo', 'rangeHi', 'emaGapPct'] as const;
const RANKING_ROW_FIELDS = [
  'rank', 'symbol', 'chain', 'poolMeta', 'apy7d', 'streak', 'eligible', 'tvlUsd', 'botPoolId', 'llamaUuid',
  'cls', 'feeAprWide', 'dragPct', 'sigmaAnnPct', 'driftFlag', 'wOursPct',
] as const;

/**
 * The walk-forward files the observation analysis asks for, one per paper pool: the 720-day hybrid run with 30-day
 * steps (WALKFORWARD_NAME_SUFFIX in src/components/ObservationAnalysis.tsx; the comment in bot/server.ts that names
 * 365d-45d is out of date).
 */
export const WALKFORWARD_SUFFIX = '-720d-30d';
export const RESULT_NAMES = new Set(BOT_POOLS.map((p) => `walkforward-${p.id}${WALKFORWARD_SUFFIX}.json`));

export interface PublicApiOptions {
  stateDir: string;
  resultsDir: string;
}

export function createPublicBotApp(o: PublicApiOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  const readJson = (p: string): unknown => {
    try {
      return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
    } catch {
      return null;
    }
  };
  const readNdjson = (file: string, cutoff: number, limit: number) => {
    const p = path.join(o.stateDir, file);
    if (!fs.existsSync(p)) return [] as Record<string, unknown>[];
    const out: Record<string, unknown>[] = [];
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as Record<string, unknown>;
        if (new Date(String(row.ts)).getTime() >= cutoff) out.push(row);
      } catch {
        // a corrupted line is skipped
      }
    }
    return out.slice(-limit);
  };
  const hoursCutoff = (q: unknown, def: number, max: number) => Date.now() - Math.min(Math.max(Number(q) || def, 1), max) * 3600_000;
  const send = (res: express.Response, body: unknown) => res.set('cache-control', 'no-store').json(scrub(body));

  // Only GET; anything else is a 404 before any handler.
  app.use((req, res, next) => (req.method === 'GET' || req.method === 'HEAD' ? next() : res.status(404).json({ error: 'not-found' })));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/state', (_req, res) => {
    const st = readJson(path.join(o.stateDir, 'state.json')) as Record<string, unknown> | null;
    if (!st) return res.status(503).json({ error: 'state not available yet' });
    const flat = pick<{ enterGap: number; exitGap: number; confirmH: number }>(st.flatParams, ['enterGap', 'exitGap', 'confirmH'], (_k, v) => num(v));
    const pools = (Array.isArray(st.pools) ? st.pools : []).map((p) =>
      pick<Record<string, unknown>>(p, [...POOL_FIELDS], (k, v) =>
        k === 'statsWindow' ? pick<Record<string, unknown>>(v, ['at', 'chunks', 'failed', 'ok'], (x, y) => (x === 'at' ? str(y) : x === 'ok' ? bool(y) : num(y))) : v,
      ),
    );
    send(res, { updatedAt: str(st.updatedAt), mode: 'LIVE-DEMO', flatParams: flat, pools, positions: [], proposals: [] });
  });

  app.get('/api/paper', (req, res) => {
    const st = readJson(path.join(o.stateDir, 'paper-state.json')) as Record<string, unknown> | null;
    if (!st) return res.status(503).json({ error: 'paper trading not started yet' });
    const cutoff = hoursCutoff(req.query.hours, 72, 24 * 30);
    const positions: Record<string, unknown> = {};
    for (const [id, p] of Object.entries((st.positions as Record<string, unknown>) ?? {})) {
      positions[id] = pick<Record<string, unknown>>(p, [...PAPER_POSITION_FIELDS], (k, v) =>
        k === 'hedge' ? (v ? pick<Record<string, unknown>>(v, ['sizeBase', 'entryUsd', 'fundingUsd'], (_x, y) => num(y)) : null) : v,
      );
    }
    const history = readNdjson('paper-history.ndjson', cutoff, 20_000).map((r) => pick<Record<string, unknown>>(r, [...PAPER_HISTORY_FIELDS]));
    // Events keep their own fields (kind, prices, costs, reasons), primitives only; the scrub covers strings.
    const events = readNdjson('paper-events.ndjson', cutoff, 500).map((r) =>
      Object.fromEntries(Object.entries(r).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v))),
    );
    send(res, { state: { startedAt: str(st.startedAt), capitalPerPoolUsd: num(st.capitalPerPoolUsd), updatedAt: str(st.updatedAt), positions }, history, events });
  });

  app.get('/api/history', (req, res) => {
    const cutoff = hoursCutoff(req.query.hours, 72, 24 * 30);
    send(res, readNdjson('history.ndjson', cutoff, 20_000).map((r) => pick<Record<string, unknown>>(r, [...HISTORY_FIELDS])));
  });

  const rankingFile = (file: string, missing: string) => (_req: express.Request, res: express.Response) => {
    const r = readJson(path.join(o.stateDir, file)) as Record<string, unknown> | null;
    if (!r) return res.status(503).json({ error: missing });
    const rows = (Array.isArray(r.rows) ? r.rows : []).map((x) => pick<Record<string, unknown>>(x, [...RANKING_ROW_FIELDS]));
    const criteria = r.criteria && typeof r.criteria === 'object' ? Object.fromEntries(Object.entries(r.criteria).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))) : {};
    send(res, { day: str(r.day), generatedAt: str(r.generatedAt), criteria, rows });
  };
  app.get('/api/ranking', rankingFile('selector-ranking.json', 'ranking not generated yet'));
  app.get('/api/wide-ranking', rankingFile('wide-ranking.json', 'wide ranking not generated yet'));
  app.get('/api/wide-daily', (_req, res) => send(res, readJson(path.join(o.stateDir, 'wide-daily.json')) ?? { generatedAt: null, pools: {} }));
  app.get('/api/wide-backtests', (_req, res) => send(res, readJson(path.join(o.stateDir, 'wide-backtests.json')) ?? {}));
  app.get('/api/candidates', (_req, res) => send(res, readVerdicts(o.stateDir)));

  app.get('/api/results/:name', (req, res) => {
    const name = req.params.name;
    if (!RESULT_NAMES.has(name)) return res.status(404).json({ error: 'not-found' });
    const r = readJson(path.join(o.resultsDir, name));
    if (!r) return res.status(404).json({ error: 'not-found' });
    send(res, r);
  });

  app.use((_req, res) => res.status(404).json({ error: 'not-found' }));
  return app;
}

if (require.main === module) {
  // The same refusal as bot/live.ts: both Live processes read the same env file and behave the same.
  const problem = liveStartProblem(process.env, path.join(__dirname, '..'));
  if (problem) {
    console.error(`[bot-public] ${problem}`);
    process.exit(1);
  }
  const stateDir = process.env.BOT_STATE_DIR!;
  const resultsDir = process.env.BOT_RESULTS_DIR || path.join(stateDir, 'results');
  const port = Number(process.env.BOT_API_PORT || 8788);
  createPublicBotApp({ stateDir, resultsDir }).listen(port, '127.0.0.1', () => console.log(`[bot-public] read-only API on http://127.0.0.1:${port}, state ${stateDir}`));
}
