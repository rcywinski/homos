/**
 * morning-report.ts — AUTOMAT: poranny snapshot stanu bota z Windows do repo.
 *
 * Problem, który rozwiązuje: sesja analityczna (Fable) na Macu widzi tylko
 * repo — Windows sam z siebie nic nie pushował, więc poranna analiza była
 * ślepa (stare snapshoty .bot/*). Ten skrypt zbiera logi/ranking/propozycje
 * do reports/morning-YYYY-MM-DD.md i commituje+pushuje na main.
 *
 * Uruchamianie (Windows, schtask na koncie elo, ~08:45 — PO pipeline 07:30
 * i PO selektorze ~08:24):  npm run report:morning
 * Test ręczny na dowolnej maszynie: REPORT_PUSH=0 npm run report:morning
 *
 * Zasady bezpieczeństwa (lekcje z CONTEXT 17.08):
 *  - NIE dotyka żywych plików .bot/* w gicie — tylko CZYTA i kopiuje treść
 *    do osobnego pliku w reports/ (katalog śledzony).
 *  - commit+push natychmiast po zapisie; push z retry pull --rebase
 *    (odporność na równoległe pushe innych sesji). Uwaga historyczna:
 *    runner auto-pull (reset --hard co 3 min) WYCOFANY decyzją Rafała
 *    18.08 — ten skrypt jest odtąd JEDYNYM automatem gitowym na Windows.
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const BOT = path.join(ROOT, '.bot');
const DATA = path.join(ROOT, 'data');
const REPORTS = path.join(ROOT, 'reports');
fs.mkdirSync(REPORTS, { recursive: true });

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const OUT = path.join(REPORTS, `morning-${localDate}.md`);

const readSafe = (p: string): string | null => {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
};
const tail = (s: string, n: number) => s.trimEnd().split('\n').slice(-n).join('\n');
const ageH = (p: string): string => {
  const st = fs.statSync(p, { throwIfNoEntry: false });
  return st ? ((Date.now() - st.mtimeMs) / 3600e3).toFixed(1) + 'h' : 'BRAK PLIKU';
};

const sections: string[] = [];
sections.push(`# Poranny raport HOMOS — ${localDate} ${pad(now.getHours())}:${pad(now.getMinutes())} (auto, Windows)`);

// --- świeżość danych ---
const newestCache = (() => {
  const dir = path.join(DATA, 'cache');
  if (!fs.existsSync(dir)) return 'BRAK';
  const ages = fs.readdirSync(dir).filter((f) => f.endsWith('.ndjson'))
    .map((f) => (Date.now() - fs.statSync(path.join(dir, f)).mtimeMs) / 3600e3);
  return ages.length ? Math.min(...ages).toFixed(1) + 'h (najświeższy)' : 'PUSTO';
})();
sections.push(`## Świeżość danych\n- universe.json: ${ageH(path.join(DATA, 'llama', 'universe.json'))}\n- swap cache: ${newestCache}`);

// --- pipeline: ostatni przebieg ---
const plog = readSafe(path.join(DATA, 'pipeline.log'));
if (plog) {
  const lastStart = plog.lastIndexOf('PIPELINE START');
  sections.push('## pipeline.log (ostatni przebieg)\n```\n' + tail(lastStart >= 0 ? plog.slice(lastStart) : plog, 40) + '\n```');
} else sections.push('## pipeline.log\nBRAK PLIKU');
const ptask = readSafe(path.join(DATA, 'pipeline-task.log'));
if (ptask) sections.push('## pipeline-task.log (tail)\n```\n' + tail(ptask, 12) + '\n```');

// --- selektor: linie z ostatnich 2 dni ---
// observer-tail.log na Windows bywa podwójnie zakodowany (UTF-8 przepuszczone
// przez cp1250 przy przekierowaniu konsoli) — mapa najczęstszych sekwencji
// mojibake dla polskich znaków (zgłoszone przez CC-Win 18.08, kosmetyka).
const MOJIBAKE: Array<[RegExp, string]> = [
  [/Ä…/g, 'ą'], [/Ä‡/g, 'ć'], [/Ä™/g, 'ę'], [/Ĺ‚/g, 'ł'], [/Ĺ„/g, 'ń'],
  [/Ăł/g, 'ó'], [/Ĺ›/g, 'ś'], [/Ĺş/g, 'ź'], [/Ĺź/g, 'ż'], [/Ĺ»/g, 'Ż'],
  [/Ĺš/g, 'Ś'], [/Ĺ /g, 'Ł '], [/â€”/g, '—'], [/â€“/g, '–'], [/â‰Ą/g, '≥'],
  [/â‰¤/g, '≤'], [/â†’/g, '→'],
];
const demojibake = (s: string) => MOJIBAKE.reduce((acc, [re, ch]) => acc.replace(re, ch), s);
const olog = readSafe(path.join(BOT, 'observer-tail.log'));
if (olog) {
  const sel = olog.split('\n').filter((l) => /selector:|ranking dnia/i.test(l)).map(demojibake);
  sections.push('## selektor (linie z observer-tail.log, ostatnie 30)\n```\n' + sel.slice(-30).join('\n') + '\n```');
} else sections.push('## selektor\nBRAK .bot/observer-tail.log');

// --- propozycje open ---
const props = readSafe(path.join(BOT, 'proposals.json'));
if (props) {
  try {
    const open = (JSON.parse(props) as Array<{ status: string }>).filter((p) => p.status === 'open');
    sections.push('## propozycje OPEN (' + open.length + ')\n```json\n' + JSON.stringify(open, null, 2) + '\n```');
  } catch { sections.push('## propozycje\nproposals.json NIEPARSOWALNY'); }
} else sections.push('## propozycje\nBRAK .bot/proposals.json');

// --- stany ---
for (const f of ['selector-state.json', 'trend-state.json']) {
  const s = readSafe(path.join(BOT, f));
  if (s) sections.push(`## ${f}\n\`\`\`json\n${s.trim()}\n\`\`\``);
}

// --- PAPER TRADING: podsumowanie dnia (stan + PnL vs HODL per pula) ---
let tgPaperDigest: string | null = null;
const paperRaw = readSafe(path.join(BOT, 'paper-state.json'));
if (paperRaw) {
  try {
    const ps = JSON.parse(paperRaw);
    // ostatnia próbka equity per pula z paper-history.ndjson
    const lastRow: Record<string, any> = {};
    const ph = readSafe(path.join(BOT, 'paper-history.ndjson'));
    if (ph) for (const line of ph.trimEnd().split('\n')) {
      try { const r = JSON.parse(line); lastRow[r.poolId] = r; } catch { /* pomiń */ }
    }
    const cap = ps.capitalPerPoolUsd ?? 10_000;
    const rows: string[] = ['| pula | status | equity | PnL | vs HODL | fees | reb |', '|---|---|---|---|---|---|---|'];
    const tg: string[] = [];
    let totalEq = 0, totalHodl = 0, n = 0;
    for (const [poolId, posRaw] of Object.entries<any>(ps.positions ?? {})) {
      const r = lastRow[poolId];
      if (!r) continue;
      const pnl = r.equityUsd - cap;
      const vsHodl = r.equityUsd - r.hodlUsd;
      totalEq += r.equityUsd; totalHodl += r.hodlUsd; n++;
      rows.push(`| ${poolId} | ${posRaw.status}${r.trendDown ? ' ⛔' : ''} | $${r.equityUsd.toFixed(0)} | ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)} | ${vsHodl >= 0 ? '+' : ''}$${vsHodl.toFixed(0)} | $${r.feesUsd.toFixed(2)} | ${r.rebalances} |`);
      tg.push(`${poolId}: $${r.equityUsd.toFixed(0)} (${vsHodl >= 0 ? '+' : ''}$${vsHodl.toFixed(0)} vs HODL)`);
    }
    if (n > 0) {
      rows.push(`| **RAZEM** | | **$${totalEq.toFixed(0)}** | ${totalEq - n * cap >= 0 ? '+' : ''}$${(totalEq - n * cap).toFixed(0)} | ${totalEq - totalHodl >= 0 ? '+' : ''}$${(totalEq - totalHodl).toFixed(0)} | | |`);
      sections.push(`## PAPER TRADING (start ${(ps.startedAt || '').slice(0, 10)}, $${cap}/pula)\n\n${rows.join('\n')}`);
      tgPaperDigest = `📊 PAPER dziś: razem $${totalEq.toFixed(0)} (${totalEq - totalHodl >= 0 ? '+' : ''}$${(totalEq - totalHodl).toFixed(0)} vs HODL)\n${tg.join('\n')}`;
    }
  } catch { sections.push('## PAPER TRADING\npaper-state.json nieparsowalny'); }
}

fs.writeFileSync(OUT, sections.join('\n\n') + '\n');
console.log(`zapisano ${path.relative(ROOT, OUT)}`);

// --- Telegram: dzienny digest paper-tradingu (decyzja Rafała 18.08) ---
if (tgPaperDigest && process.env.TG_TOKEN && process.env.TG_CHAT) {
  fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TG_CHAT, text: tgPaperDigest }),
  }).catch((e) => console.log(`telegram digest error: ${e}`));
}

// --- commit + push (szybko, z retry) ---
if (process.env.REPORT_PUSH === '0') { console.log('REPORT_PUSH=0 — bez gita'); process.exit(0); }
const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: ROOT, stdio: 'pipe' }).toString();
try {
  git(`add ${JSON.stringify(path.relative(ROOT, OUT))}`);
  try { git(`commit -m "report: poranny snapshot ${localDate} (auto, Windows)"`); }
  catch { console.log('nic do commitowania (raport bez zmian)'); process.exit(0); }
  let pushed = false;
  for (let i = 1; i <= 3 && !pushed; i++) {
    try { git('pull --rebase origin main'); git('push origin main'); pushed = true; }
    catch (e) { console.log(`push podejście ${i}/3 nieudane: ${String(e).slice(0, 200)}`); }
  }
  if (!pushed) { console.error('PUSH NIEUDANY po 3 podejściach'); process.exit(1); }
  console.log('raport wypchnięty na main');
} catch (e) {
  console.error(`git błąd: ${String(e).slice(0, 300)}`);
  process.exit(1);
}
