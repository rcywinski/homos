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
  const props = readJson(PROPOSALS_PATH) || [];
  const p = props.find((x: any) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  p.status = 'dismissed';
  fs.writeFileSync(PROPOSALS_PATH, JSON.stringify(props, null, 2));
  res.json({ ok: true });
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

app.get('/health', (_req, res) => {
  const s = readJson(STATE_PATH);
  const fresh = s && Date.now() - new Date(s.updatedAt).getTime() < 5 * 60 * 1000;
  res.status(fresh ? 200 : 503).json({ fresh, updatedAt: s?.updatedAt ?? null });
});

// statyczny build UI (produkcja: webpack --mode production -> public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = Number(process.env.BOT_API_PORT || 8787);
app.listen(PORT, () => console.log(`[bot-api] listening on :${PORT}`));
