/**
 * bot/server.ts — mini API for the UI (reads the observer bot's state).
 *   npm run bot:server   (port 8787; eventually pm2 on Windows, see INFRA.md)
 * Endpoints:
 *   GET  /api/state                     — full state (pools, positions, proposals)
 *   GET  /api/paper?hours=N             — paper trading: state + equity + ledger
 *   POST /api/proposals/:id/dismiss     — dismiss a proposal
 *   GET  /health                        — 200 when the state is fresh (<5 min), WITHOUT token
 *
 * Authorization: if the env BOT_API_TOKEN is set, all /api/* require the
 * header `Authorization: Bearer <token>` (otherwise 401). Without BOT_API_TOKEN in env
 * authorization is disabled (convenient for dev on the Mac) — on the production server
 * (Windows, see INFRA.md/setup-windows.md) the token is REQUIRED, because the home LAN
 * is not a trust boundary (guests on Wi-Fi). The UI keeps the token in localStorage under
 * the key `homos_api_token` and attaches it to fetches against this API.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { STATE_DIR } from './config';
import { readVerdicts } from './candidates';
import { readLedger } from './ledger';

const DIR = path.join(__dirname, '..', STATE_DIR);
const STATE_PATH = path.join(DIR, 'state.json');
const PROPOSALS_PATH = path.join(DIR, 'proposals.json');

const API_TOKEN = process.env.BOT_API_TOKEN || '';

const app = express();
app.use(express.json());
// CORS for the UI (dev on :3000, eventually the same origin after the build)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Access token for /api/* — /health stays open (monitoring, pm2, curl without token).
// Without BOT_API_TOKEN in env the check is skipped (local dev on the Mac).
app.use('/api', (req, res, next) => {
  if (!API_TOKEN) return next();
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (provided !== API_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
});

const readJson = (p: string) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);

app.get('/api/state', (_req, res) => {
  const s = readJson(STATE_PATH);
  if (!s) return res.status(503).json({ error: 'bot not running (no state file)' });
  // Fix 26.08 (Rafal's report: "they come back after refreshing the page"): a dismissal
  // waits in the command queue for up to 30 s before the observer applies it and rewrites
  // state.json — in that window a freshly loaded page saw the proposal
  // again. The server STILL does not write to proposals.json (the only writer =
  // observer, dual-writer lesson 25.08) — it only filters the VIEW of the state
  // by the ids from its own queue. Once the observer consumes the file, the filter disappears by itself.
  try {
    const cmdPath = path.join(DIR, 'proposal-commands.ndjson');
    if (fs.existsSync(cmdPath) && Array.isArray(s.proposals)) {
      const pending = new Set(
        fs.readFileSync(cmdPath, 'utf8').split('\n').filter((l) => l.trim()).map((l) => {
          try { const c = JSON.parse(l); return c.action === 'dismiss' ? c.id : null; } catch { return null; }
        }).filter((x): x is string => !!x)
      );
      if (pending.size) s.proposals = s.proposals.filter((p: { id: string }) => !pending.has(p.id));
    }
  } catch { /* the filter is view cosmetics — its failure must not take the endpoint down */ }
  res.json(s);
});

app.post('/api/proposals/:id/dismiss', (req, res) => {
  // We do NOT write to proposals.json (bug 25.08: dual-writer — the observer keeps
  // proposals in memory and overwrote the file, resurrecting dismissed ones; the only
  // writer of the file is the observer). The command goes through an append-only queue,
  // the observer applies it within 30 s and then it also disappears from /api/state.
  const props = readJson(PROPOSALS_PATH) || [];
  if (!props.find((x: any) => x.id === req.params.id)) return res.status(404).json({ error: 'not found' });
  fs.appendFileSync(
    path.join(DIR, 'proposal-commands.ndjson'),
    JSON.stringify({ id: req.params.id, action: 'dismiss', ts: new Date().toISOString() }) + '\n'
  );
  res.json({ ok: true, applied: 'queued' });
});

// History of bot snapshots (dashboard "Observation analysis" in the UI).
// File: .bot/history.ndjson — JSON lines every 15 min per pool (written by the observer).
app.get('/api/history', (req, res) => {
  const HISTORY_PATH = path.join(DIR, 'history.ndjson');
  if (!fs.existsSync(HISTORY_PATH)) return res.json([]);
  const hours = Math.min(Math.max(Number(req.query.hours) || 72, 1), 24 * 30);
  const cutoff = Date.now() - hours * 3600 * 1000;
  const out: unknown[] = [];
  for (const line of fs.readFileSync(HISTORY_PATH, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const j = JSON.parse(line);
      if (new Date(j.ts).getTime() >= cutoff) out.push(j);
    } catch { /* incomplete line mid-write — skip */ }
  }
  res.json(out);
});

// Equity/HODL history of REAL positions (position card redesign following the
// paper pattern, 20.08). File: .bot/positions-history.ndjson — written by the observer every
// refreshPositions cycle (5 min); sample shape like paper-history + tokenId.
app.get('/api/positions-history', (req, res) => {
  const P = path.join(DIR, 'positions-history.ndjson');
  if (!fs.existsSync(P)) return res.json([]);
  const hours = Math.min(Math.max(Number(req.query.hours) || 72, 1), 24 * 30);
  const cutoff = Date.now() - hours * 3600 * 1000;
  const out: unknown[] = [];
  for (const line of fs.readFileSync(P, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const j = JSON.parse(line);
      if (new Date(j.ts).getTime() >= cutoff) out.push(j);
    } catch { /* incomplete line mid-write — skip */ }
  }
  res.json(out);
});

// Selector's daily ranking (TOP 10 pools "watched for entry") —
// written by bot/selector.ts once a day after 8:00.
app.get('/api/ranking', (_req, res) => {
  const r = readJson(path.join(DIR, 'selector-ranking.json'));
  if (!r) return res.status(503).json({ error: 'ranking not generated yet (selector runs daily after 6:00)' });
  res.json(r);
});

// WIDE ranking (funnel v2 tier 1, scripts/wide-score.ts — a step of the nightly
// pipeline since 02.09). Same shape as /api/ranking; `apy7d` = score [%/yr].
app.get('/api/wide-ranking', (_req, res) => {
  const r = readJson(path.join(DIR, 'wide-ranking.json'));
  if (!r) return res.status(503).json({ error: 'wide ranking not generated yet (pipeline step wide-score, nightly)' });
  res.json(r);
});

// Daily model 365/720d (scripts/wide-daily.ts, pipeline step after
// wide-score): {pools: {llamaUuid → LP/HODL/Δ, window medians, flat%}}.
app.get('/api/wide-daily', (_req, res) => {
  res.json(readJson(path.join(DIR, 'wide-daily.json')) ?? { generatedAt: null, pools: {} });
});

// Full runs (walkforward 720d, WF_SET=wide) for pools from the rankings —
// written by scripts/wide-collect.ts (funnel Tier 2, CC-Win subagent in the background).
// Object {llamaUuid → summary}; the UI adds columns by llamaUuid (Batch 22).
app.get('/api/wide-backtests', (_req, res) => {
  res.json(readJson(path.join(DIR, 'wide-backtests.json')) ?? {});
});

// Candidate validation verdicts (TASKS-FUNNEL.md): seed in code +
// runtime .bot/candidate-verdicts.json (written by the nightly funnel). The UI matches
// by llamaPool to ranking rows → PASS/FAIL/QUEUED badge.
app.get('/api/candidates', (_req, res) => {
  res.json(readVerdicts(DIR));
});

// Paper trading (bot/paper.ts): virtual portfolio state + equity samples
// + decision ledger. Query: ?hours=N (history, default 72h, max 30 days).
app.get('/api/paper', (req, res) => {
  const st = readJson(path.join(DIR, 'paper-state.json'));
  if (!st) return res.status(503).json({ error: 'paper trading not started yet' });
  const hours = Math.min(Math.max(Number(req.query.hours) || 72, 1), 24 * 30);
  const cutoff = Date.now() - hours * 3600 * 1000;
  const readNdjson = (file: string, limit: number) => {
    const p = path.join(DIR, file);
    if (!fs.existsSync(p)) return [];
    const out: unknown[] = [];
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (new Date(row.ts).getTime() >= cutoff) out.push(row);
      } catch { /* skip a corrupted line */ }
    }
    return out.slice(-limit);
  };
  res.json({ state: st, history: readNdjson('paper-history.ndjson', 20_000), events: readNdjson('paper-events.ndjson', 500) });
});

// Backtest/walk-forward results computed by the pipeline (backtest/results/*.json).
// The UI (ObservationAnalysis) asks for walkforward-<poolId>-365d-45d.json.
app.get('/api/results/:name', (req, res) => {
  const name = req.params.name;
  if (!/^[\w.-]+\.json$/.test(name) || name.includes('..')) return res.status(400).json({ error: 'bad name' });
  const p = path.join(__dirname, '..', 'backtest', 'results', name);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'not found' });
  res.setHeader('Last-Modified', fs.statSync(p).mtime.toUTCString());
  res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
});

// --- on-chain transaction ledger (TASKS-LEDGER.md §3) ---
app.get('/api/ledger', (req, res) => {
  const days = Math.max(1, Math.min(3650, Number(req.query.days) || 90));
  const cutoff = Date.now() - days * 24 * 3600e3;
  const entries = readLedger().filter((e) => Date.parse(e.ts) > cutoff);
  res.json({ days, count: entries.length, entries });
});

app.get('/api/closed-positions', (_req, res) => {
  res.json(readJson(path.join(DIR, 'closed-positions.json')) ?? []);
});

// CSV: 1 row = 1 on-chain event (for settlements; PLN/NBP = iteration 2)
app.get('/api/ledger.csv', (_req, res) => {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const cols = ['ts', 'chain', 'chainId', 'block', 'txHash', 'logIndex', 'tokenId', 'kind', 'sym0', 'amount0', 'a0h', 'sym1', 'amount1', 'a1h', 'usd'] as const;
  const rows = [cols.join(',')];
  for (const e of readLedger()) rows.push(cols.map((c) => esc((e as any)[c])).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="homos-ledger.csv"');
  res.send(rows.join('\n') + '\n');
});

app.get('/health', (_req, res) => {
  const s = readJson(STATE_PATH);
  const fresh = s && Date.now() - new Date(s.updatedAt).getTime() < 5 * 60 * 1000;
  res.status(fresh ? 200 : 503).json({ fresh, updatedAt: s?.updatedAt ?? null });
});

// static UI build (production: webpack --mode production -> public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = Number(process.env.BOT_API_PORT || 8787);
app.listen(PORT, () => console.log(`[bot-api] listening on :${PORT}`));
