/**
 * bot/server.ts — mini API dla UI (czyta stan bota-obserwatora).
 *   npm run bot:server   (port 8787; docelowo pm2 na Windows, patrz INFRA.md)
 * Endpoints:
 *   GET  /api/state                     — pełny stan (pule, pozycje, propozycje)
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

app.get('/health', (_req, res) => {
  const s = readJson(STATE_PATH);
  const fresh = s && Date.now() - new Date(s.updatedAt).getTime() < 5 * 60 * 1000;
  res.status(fresh ? 200 : 503).json({ fresh, updatedAt: s?.updatedAt ?? null });
});

// statyczny build UI (produkcja: webpack --mode production -> public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = Number(process.env.BOT_API_PORT || 8787);
app.listen(PORT, () => console.log(`[bot-api] listening on :${PORT}`));
