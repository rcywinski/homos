/**
 * bot/server.ts — mini API dla UI (czyta stan bota-obserwatora).
 *   npm run bot:server   (port 8787; docelowo pm2 na Windows, patrz INFRA.md)
 * Endpoints:
 *   GET  /api/state                     — pełny stan (pule, pozycje, propozycje)
 *   GET  /api/paper?hours=N             — paper trading: stan + equity + księga
 *   POST /api/proposals/:id/dismiss     — odrzuć propozycję
 *   GET  /health                        — 200 gdy stan świeży (<5 min), BEZ tokena
 *
 * Autoryzacja: jeśli env BOT_API_TOKEN jest ustawiony, wszystkie /api/* wymagają
 * nagłówka `Authorization: Bearer <token>` (inaczej 401). Bez BOT_API_TOKEN w env
 * autoryzacja jest wyłączona (wygodne do dev na Macu) — na serwerze produkcyjnym
 * (Windows, patrz INFRA.md/setup-windows.md) token jest WYMAGANY, bo LAN domowy
 * to nie granica zaufania (goście na Wi-Fi). UI trzyma token w localStorage pod
 * kluczem `homos_api_token` i dokłada go do fetchy przeciwko temu API.
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
// CORS dla UI (dev na :3000, docelowo ten sam origin po buildzie)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Token dostępu dla /api/* — /health zostaje otwarty (monitoring, pm2, curl bez tokena).
// Bez BOT_API_TOKEN w env sprawdzenie jest pominięte (dev lokalnie na Macu).
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
  res.json(s);
});

app.post('/api/proposals/:id/dismiss', (req, res) => {
  // NIE piszemy do proposals.json (bug 25.08: dual-writer — observer trzyma
  // propozycje w pamięci i nadpisywał plik, wskrzeszając odrzucone; jedynym
  // writerem pliku jest observer). Komenda idzie kolejką append-only,
  // observer aplikuje ją w ≤30 s i wtedy znika też z /api/state.
  const props = readJson(PROPOSALS_PATH) || [];
  if (!props.find((x: any) => x.id === req.params.id)) return res.status(404).json({ error: 'not found' });
  fs.appendFileSync(
    path.join(DIR, 'proposal-commands.ndjson'),
    JSON.stringify({ id: req.params.id, action: 'dismiss', ts: new Date().toISOString() }) + '\n'
  );
  res.json({ ok: true, applied: 'queued' });
});

// Historia snapshotów bota (dashboard "Analiza obserwacji" w UI).
// Plik: .bot/history.ndjson — linie JSON co 15 min per pula (pisze observer).
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
    } catch { /* niepełna linia w trakcie zapisu — pomiń */ }
  }
  res.json(out);
});

// Historia equity/HODL REALNYCH pozycji (redesign kart pozycji wg wzorca
// paper, 20.08). Plik: .bot/positions-history.ndjson — pisze observer co
// cykl refreshPositions (5 min); kształt próbki jak paper-history + tokenId.
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
    } catch { /* niepełna linia w trakcie zapisu — pomiń */ }
  }
  res.json(out);
});

// Ranking dnia selektora (TOP 10 pul "obserwowanych do wejścia") —
// pisze bot/selector.ts raz dziennie po 8:00.
app.get('/api/ranking', (_req, res) => {
  const r = readJson(path.join(DIR, 'selector-ranking.json'));
  if (!r) return res.status(503).json({ error: 'ranking not generated yet (selector runs daily after 6:00)' });
  res.json(r);
});

// Werdykty walidacji kandydatów (TASKS-FUNNEL.md): seed w kodzie +
// runtime .bot/candidate-verdicts.json (pisze nocny lejek). UI dopasowuje
// po llamaPool do wierszy rankingu → badge PASS/FAIL/QUEUED.
app.get('/api/candidates', (_req, res) => {
  res.json(readVerdicts(DIR));
});

// Paper trading (bot/paper.ts): stan wirtualnego portfela + próbki equity
// + księga decyzji. Query: ?hours=N (historia, domyślnie 72h, max 30 dni).
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
      } catch { /* pomiń uszkodzoną linię */ }
    }
    return out.slice(-limit);
  };
  res.json({ state: st, history: readNdjson('paper-history.ndjson', 20_000), events: readNdjson('paper-events.ndjson', 500) });
});

// Wyniki backtestów/walk-forwardów liczone przez pipeline (backtest/results/*.json).
// UI (ObservationAnalysis) pyta o walkforward-<poolId>-365d-45d.json.
app.get('/api/results/:name', (req, res) => {
  const name = req.params.name;
  if (!/^[\w.-]+\.json$/.test(name) || name.includes('..')) return res.status(400).json({ error: 'bad name' });
  const p = path.join(__dirname, '..', 'backtest', 'results', name);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'not found' });
  res.setHeader('Last-Modified', fs.statSync(p).mtime.toUTCString());
  res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
});

// --- księga transakcji on-chain (TASKS-LEDGER.md §3) ---
app.get('/api/ledger', (req, res) => {
  const days = Math.max(1, Math.min(3650, Number(req.query.days) || 90));
  const cutoff = Date.now() - days * 24 * 3600e3;
  const entries = readLedger().filter((e) => Date.parse(e.ts) > cutoff);
  res.json({ days, count: entries.length, entries });
});

app.get('/api/closed-positions', (_req, res) => {
  res.json(readJson(path.join(DIR, 'closed-positions.json')) ?? []);
});

// CSV: 1 wiersz = 1 zdarzenie on-chain (pod rozliczenia; PLN/NBP = iteracja 2)
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

// statyczny build UI (produkcja: webpack --mode production -> public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = Number(process.env.BOT_API_PORT || 8787);
app.listen(PORT, () => console.log(`[bot-api] listening on :${PORT}`));
