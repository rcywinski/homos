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
// data/pipeline.log (zapis wewnętrzny przez fs.appendFileSync w pipeline.ts) i
// data/pipeline-task.log (redirect stdout `>>` ze schtaska na Windows) bywają
// rozjechane — zaobserwowane 19.08: pipeline-task.log miał świeży przebieg
// 06:06, a pipeline.log utknął na 17.08 mimo tego samego uruchomienia. Bierz
// świeższy z dwóch (po timestampie linii "PIPELINE START"), nie na sztywno pipeline.log.
const lastRunBlock = (content: string): { ts: string; block: string } | null => {
  const idx = content.lastIndexOf('PIPELINE START');
  if (idx < 0) return null;
  const lineStart = content.lastIndexOf('\n', idx) + 1;
  const block = content.slice(lineStart);
  return { ts: block.slice(0, block.indexOf(' ')), block };
};
const plog = readSafe(path.join(DATA, 'pipeline.log'));
const ptask = readSafe(path.join(DATA, 'pipeline-task.log'));
const runs = [plog && lastRunBlock(plog), ptask && lastRunBlock(ptask)].filter((r): r is { ts: string; block: string } => !!r);
if (runs.length) {
  const newest = runs.reduce((a, b) => (b.ts > a.ts ? b : a));
  sections.push('## pipeline.log (ostatni przebieg)\n```\n' + tail(newest.block, 40) + '\n```');
} else sections.push('## pipeline.log\nBRAK PLIKU (ani pipeline.log, ani pipeline-task.log)');
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
const ologSrc = readSafe(path.join(BOT, 'observer.log')) ? 'observer.log' : 'observer-tail.log';
const olog = readSafe(path.join(BOT, ologSrc));
if (olog) {
  const sel = olog.split('\n').filter((l) => /selector:|ranking dnia/i.test(l)).map(demojibake);
  sections.push(`## selektor (linie z ${ologSrc}, ostatnie 30)\n\`\`\`\n` + sel.slice(-30).join('\n') + '\n```');
} else sections.push('## selektor\nBRAK .bot/observer.log i .bot/observer-tail.log');

// --- propozycje open ---
const props = readSafe(path.join(BOT, 'proposals.json'));
if (props) {
  try {
    const open = (JSON.parse(props) as Array<{ status: string }>).filter((p) => p.status === 'open');
    sections.push('## propozycje OPEN (' + open.length + ')\n```json\n' + JSON.stringify(open, null, 2) + '\n```');
  } catch { sections.push('## propozycje\nproposals.json NIEPARSOWALNY'); }
} else sections.push('## propozycje\nBRAK .bot/proposals.json');

// --- kandydaci: werdykty auto-lejka (ostatnie 7 dni) + kolejka na dziś ---
try {
  const verd = readSafe(path.join(BOT, 'candidate-verdicts.json'));
  const queue = readSafe(path.join(BOT, 'candidate-queue.json'));
  const lines: string[] = [];
  if (verd) {
    const cutoff = Date.now() - 7 * 24 * 3600e3;
    const recent = (JSON.parse(verd) as any[]).filter((v) => v.testedAt && Date.parse(v.testedAt) > cutoff);
    if (recent.length) {
      lines.push('| werdykt | pula | wygr.% | worst | data | nota |', '|---|---|---|---|---|---|');
      for (const v of recent) {
        const icon = v.verdict === 'PASS' ? '✅ PASS' : v.verdict === 'FAIL' ? '⛔ FAIL' : v.verdict;
        lines.push(`| ${icon} | ${v.symbol} ${v.feeTier} @ ${v.chain} | ${v.winPct ?? '—'} | ${v.worst ?? '—'} | ${v.testedAt} | ${(v.note || '').slice(0, 90)} |`);
      }
    } else lines.push('brak werdyktów z ostatnich 7 dni');
  } else lines.push('BRAK .bot/candidate-verdicts.json (lejek jeszcze nie biegł)');
  if (queue) {
    const q = JSON.parse(queue);
    const items = (q.queue ?? []).map((i: any) => `${i.symbol} ${i.feeTier} @ ${i.chain} (streak ${i.streak})`).join(' · ') || 'pusta';
    lines.push(`\nkolejka (${(q.generatedAt || '').slice(0, 16)}): ${items}`);
    const def = (q.deferred ?? []).map((i: any) => `${i.symbol} ${i.feeTier} @ ${i.chain}`).join(' · ');
    if (def) lines.push(`odroczone (<180d historii): ${def}`);
  }
  sections.push('## Kandydaci (auto-lejek)\n\n' + lines.join('\n'));
} catch { sections.push('## Kandydaci (auto-lejek)\npliki lejka nieparsowalne'); }

// --- ranking WIDE (lejek v2 piętro 1; obok rankingu APY selektora) ---
try {
  const wr = readSafe(path.join(BOT, 'wide-ranking.json'));
  if (wr) {
    const r = JSON.parse(wr);
    const lines = [
      `dzień ${r.day} · ${r.criteria?.window ?? ''}`,
      '',
      '| # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie |',
      '|---|---|---|---|---|---|---|---|---|---|',
    ];
    for (const row of r.rows ?? [])
      lines.push(
        `| ${row.rank} | ${row.symbol} ${row.poolMeta} @ ${row.chain} | ${row.cls ?? ''} | ${row.apy7d} | ${row.feeAprWide ?? '—'} | ${row.dragPct ?? '—'} | ${row.sigmaAnnPct ?? '—'}${row.driftFlag ? ' ⚠' : ''} | ${row.streak}d | $${(row.tvlUsd / 1e6).toFixed(1)}M | ${row.botPoolId ?? '—'} |`
      );
    lines.push('', '_score = fee szerokiego pasma − koszt zmienności (drag); w %/r; ranking obserwacyjny, decyzja o wejściu ręczna (TASKS-FUNNEL §2)._');
    sections.push('## RANKING WIDE (pod produkt, top 10)\n\n' + lines.join('\n'));
  } else sections.push('## RANKING WIDE\nBRAK .bot/wide-ranking.json (krok wide-score jeszcze nie biegł)');
} catch { sections.push('## RANKING WIDE\nwide-ranking.json nieparsowalny'); }

// --- stany ---
for (const f of ['selector-state.json', 'trend-state.json']) {
  const s = readSafe(path.join(BOT, f));
  if (s) sections.push(`## ${f}\n\`\`\`json\n${s.trim()}\n\`\`\``);
}

// --- POZYCJE REALNE (produkt FlatWide, 28.08) — equity vs HODL + stan flatu ---
// Luka z briefu 28.08: raport nie miał sekcji realnych pozycji, Fable
// musiał ciągnąć /api/state przez przeglądarkę. Czyta state.json (żywe
// wartości z observera) + positions-history.ndjson (kotwica HODL =
// pierwsza próbka per tokenId).
// Digest na Telegram (29.08, decyzja Rafała): poranna wiadomość dotyczy
// WYŁĄCZNIE realnych pozycji — paper przestał być istotny po wejściu
// kapitału, a codzienny digest paper zagłuszał to, co wymaga decyzji.
let tgRealDigest: string | null = null;
try {
  const stRaw = readSafe(path.join(BOT, 'state.json'));
  if (stRaw) {
    const st = JSON.parse(stRaw);
    const poolsById: Record<string, any> = {};
    for (const pl of st.pools ?? []) poolsById[pl.id] = pl;
    const first: Record<string, any> = {};
    const last: Record<string, any> = {};
    const phRaw = readSafe(path.join(BOT, 'positions-history.ndjson'));
    if (phRaw) for (const line of phRaw.trimEnd().split('\n')) {
      try { const r = JSON.parse(line); if (!first[r.tokenId]) first[r.tokenId] = r; last[r.tokenId] = r; } catch { /* pomiń */ }
    }
    const fmtUsd = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`);
    // parametry detektora flatu z korzenia state (jedna prawda z bot/config.ts,
    // PARTIA 17) — raport NIE hardkoduje 2%/12h, bo przegląd może je zmienić
    const fp = st.flatParams ?? {};
    const enterPct = (typeof fp.enterGap === 'number' ? fp.enterGap : 0.02) * 100;
    const exitPct = (typeof fp.exitGap === 'number' ? fp.exitGap : 0.05) * 100;
    const confirmH = typeof fp.confirmH === 'number' ? fp.confirmH : 12;
    const nowMs = Date.now();
    // digest telefonowy liczy TYLKO pozycje produktowe (posture ustawione) —
    // stary dust #953427 ($2, legacy mainnet) nie ma cyklu ani stabilizacji
    // i zaśmiecałby wiadomość; leci jako jedna linijka na końcu.
    const tgPositions: string[] = [];
    const tgOther: string[] = [];
    let tgVal = 0, tgPnl = 0, tgAnchor = 0;
    const rows = [
      '| pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
    ];
    for (const pos of st.positions ?? []) {
      const f = first[pos.tokenId];
      const l = last[pos.tokenId];
      const vsHodl = l ? pos.valueUsd - l.hodlUsd : null;
      const pnl = f ? pos.valueUsd - f.hodlUsd : null; // kotwica: hodlUsd 1. próbki = wartość w chwili zakotwiczenia
      const pl = poolsById[pos.poolId];
      // TEMPO FEE (29.08, brief Rafała): fee od otwarcia = narosłe (nieodebrane)
      // + już odebrane z księgi; dzielone przez dni od kotwicy. Po pierwszym
      // COLLECT samo `feesUsd` spadłoby do zera i tempo kłamałoby w dół.
      // gdy narosłe nieznane (RPC odmówił) → "—", NIE "$0.00": zero z braku
      // danych wyglądałoby jak "pula nic nie zarabia" i myliłoby przy briefie
      const feesTotal =
        typeof pos.feesUsd === 'number' ? pos.feesUsd + (pos.collectedFeesUsd ?? 0) : null;
      const days = f ? (nowMs - Date.parse(f.ts)) / 86_400e3 : null;
      const pace = feesTotal !== null && days !== null && days > 0.5 ? feesTotal / days : null;
      const postureTxt = pos.posture === 'narrow' ? 'WĄSKI' : pos.posture === 'wide' ? 'SZEROKI' : '—';
      // ZEGAR FLATU z countdownem — bez tego raport mówił tylko "—" i nie
      // dawało się odróżnić "gap poza progiem" od "zegar tyka, blisko końca".
      let flatTxt: string;
      if (pl?.flatConfirmed) {
        flatTxt = `✅ POTWIERDZONY (od ${String(pl.flatSince ?? '').slice(5, 16)}Z)`;
      } else if (pl?.flatSince) {
        const leftH = confirmH - (nowMs - Date.parse(String(pl.flatSince))) / 3600e3;
        flatTxt = `⏳ zegar od ${String(pl.flatSince).slice(5, 16)}Z — ${leftH > 0 ? `potwierdzenie za ${leftH.toFixed(1)}h` : 'potwierdzenie w najbliższym cyklu'}`;
      } else if (pos.posture !== null && pos.posture !== undefined) {
        // UWAGA: żadnych pionowych kresek w treści komórki (rozwaliłoby tabelę)
        flatTxt = `— poza progiem (potrzeba < ${enterPct.toFixed(1)}%)`;
      } else {
        flatTxt = '—';
      }
      // wiersz telegramowy (29.08): ta sama prawda co tabela, ale językiem
      // telefonu — „stabilizacja" zamiast „flat", czas do ZWĘŻENIA wprost
      const tgFlat = pos.posture === 'narrow'
        // w wąskim zakresie liczy się już nie wejście, tylko wyjście z flatu
        ? `✅ wąski zakres pracuje — rozszerzenie przy gap > ${exitPct.toFixed(1)}%`
        : pl?.flatConfirmed
        ? '✅ stabilizacja potwierdzona — zwężenie w propozycjach'
        : pl?.flatSince
          ? (() => {
              const leftH = confirmH - (nowMs - Date.parse(String(pl.flatSince))) / 3600e3;
              return leftH > 0
                ? `⏳ stabilizacja od ${String(pl.flatSince).slice(11, 16)}Z — do zwężenia ${leftH.toFixed(1)}h`
                : '⏳ stabilizacja pełna — zwężenie w najbliższym cyklu';
            })()
          : `brak stabilizacji (gap ${typeof pl?.trendGapPct === 'number' ? pl.trendGapPct.toFixed(1) : '?'}%, potrzeba < ${enterPct.toFixed(1)}%)`;
      if (!pos.posture) {
        tgOther.push(`#${pos.tokenId} ${pos.poolId}: $${pos.valueUsd.toFixed(2)} (poza produktem)`);
      } else {
        tgVal += pos.valueUsd;
        tgPnl += pnl ?? 0;
        tgAnchor += f?.hodlUsd ?? 0;
        tgPositions.push(
          `#${pos.tokenId} ${pos.poolId}${pos.inRange ? '' : ' ⚠️ POZA ZAKRESEM'}\n` +
          `  $${pos.valueUsd.toFixed(2)} · PnL od startu ${fmtUsd(pnl)}\n` +
          `  fee narosłe ${typeof pos.feesUsd === 'number' ? `$${pos.feesUsd.toFixed(2)}` : '—'} · reinwestowane ${typeof pos.collectedFeesUsd === 'number' ? `$${pos.collectedFeesUsd.toFixed(2)}` : '—'}\n` +
          `  cykl: ${postureTxt} · ${tgFlat}`
        );
      }
      rows.push(
        `| #${pos.tokenId} | ${pos.poolId} | ${postureTxt} | $${pos.valueUsd.toFixed(0)} | ${fmtUsd(vsHodl)} | ${fmtUsd(pnl)}${f ? ` (od ${String(f.ts).slice(0, 10)})` : ''} | ${feesTotal === null ? '—' : `$${feesTotal.toFixed(2)}`} | ${pace === null ? '—' : `$${pace.toFixed(2)}`} | ${pos.inRange ? 'w zakresie' : '⚠️ POZA'} | ${typeof pl?.trendGapPct === 'number' ? pl.trendGapPct.toFixed(1) + '%' : '—'} | ${flatTxt} |`
      );
    }
    if ((st.positions ?? []).length) {
      const sumVal = (st.positions ?? []).reduce((s: number, p: any) => s + (p.valueUsd ?? 0), 0);
      const sumVsHodl = (st.positions ?? []).reduce(
        (s: number, p: any) => s + (last[p.tokenId] ? p.valueUsd - last[p.tokenId].hodlUsd : 0), 0);
      rows.push(`| **RAZEM** | | | **$${sumVal.toFixed(2)}** | ${fmtUsd(sumVsHodl)} | | | | | | |`);
      // PnL od startu = wartość dziś − kotwica (hodlUsd 1. próbki). UWAGA
      // interpretacyjna dla czytelnika: to zawiera RUCH RYNKU (betę), więc
      // ujemne PnL przy vs HODL ≈ 0 znaczy „rynek spadł", nie „strategia traci".
      const trHeader = st.tranche && typeof st.tranche.depositedUsd === 'number' && st.tranche.totalUsd !== null
        ? `\n${st.tranche.label ?? 'Transza'}: $${st.tranche.depositedUsd.toFixed(0)} wpłacone → $${st.tranche.totalUsd.toFixed(2)} dziś (${fmtUsd(st.tranche.diffUsd)}${st.tranche.diffPct === null ? '' : `, ${st.tranche.diffPct.toFixed(2)}%`})`
        : '';
      if (tgPositions.length) {
        tgRealDigest =
          `📈 HOMOS ${localDate} — pozycje realne\n` +
          `Equity łącznie: $${tgVal.toFixed(2)} · PnL od startu: ${fmtUsd(tgPnl)}` +
          `${tgAnchor > 0 ? ` (${((tgPnl / tgAnchor) * 100).toFixed(2)}%)` : ''}` +
          `${trHeader}\n\n` +
          tgPositions.join('\n\n') +
          (tgOther.length ? `\n\n${tgOther.join('\n')}` : '');
      }
      // BILANS TRANSZY (29.08) — druga miara obok metryk strategii: ile
      // z WPŁACONYCH USDC realnie dziś jest (LP + portfel), i co zjadło
      // różnicę. Bot liczy, raport tylko wyświetla.
      const tr = st.tranche;
      if (tr && typeof tr.depositedUsd === 'number') {
        const line = (k: string, v: string) => `| ${k} | ${v} |`;
        const trRows = [
          '| pozycja bilansu | kwota |', '|---|---|',
          line(`wpłacone (${tr.startedAt})`, `$${tr.depositedUsd.toFixed(2)}`),
          line('dziś w pozycjach LP', `$${(tr.lpUsd ?? 0).toFixed(2)}`),
          line('dziś w portfelu (bufor + gaz)', tr.walletUsd === null ? '— (odczyt sald nieudany)' : `$${tr.walletUsd.toFixed(2)}`),
          line('**razem dziś**', tr.totalUsd === null ? '—' : `**$${tr.totalUsd.toFixed(2)}**`),
          line('**różnica vs wpłacone**', tr.diffUsd === null ? '—' : `**${fmtUsd(tr.diffUsd)}${tr.diffPct === null ? '' : ` (${tr.diffPct.toFixed(2)}%)`}**`),
          line('— z tego ruch rynku na LP', tr.marketPnlUsd === null ? '—' : fmtUsd(tr.marketPnlUsd)),
          line('— z tego reszta (koszty wejścia + beta bufora)', tr.residualUsd === null ? '—' : fmtUsd(tr.residualUsd)),
          ...(tr.entryCostUsd === null && tr.bufferBetaUsd === null ? [] : [
            line('&nbsp;&nbsp;• koszty wejścia (stałe)', tr.entryCostUsd === null ? '—' : fmtUsd(tr.entryCostUsd)),
            line('&nbsp;&nbsp;• beta bufora (od kotwicy bufora)', tr.bufferBetaUsd === null ? '—' : fmtUsd(tr.bufferBetaUsd)),
          ]),
          line('(informacyjnie) gaz zaindeksowany', tr.gasUsd === null ? '—' : `$${tr.gasUsd.toFixed(2)}`),
        ];
        // skład portfela — audytowalność: pierwszy pomiar dał $226 zamiast
        // szacowanych $150, więc musi być widać, CO bot wliczył
        const parts = Array.isArray(tr.walletParts) && tr.walletParts.length
          ? `\n\n_Portfel: ${tr.walletParts.map((w: any) => `${w.sym} ${w.amount} ($${w.usd.toFixed(2)})`).join(' · ')}_`
          : '';
        sections.push(
          `## BILANS TRANSZY — ${tr.label ?? 'transza 1'}\n\n` + trRows.join('\n') + parts +
          '\n\n_„Reszta" to jednorazowe koszty wejścia (swapy, poślizg, gaz mintów) plus beta bufora w portfelu._' +
          '\n_Koszty wejścia powinny być STAŁE — ich dryf oznacza, że coś w księgowaniu się rozjeżdża._' +
          '\n_UWAGA: kotwica bufora powstała 29.08, więc beta bufora z 27–29.08 siedzi w kosztach wejścia._' +
          '\n_Gaz jest już zawarty w „reszcie" — linia informacyjna, nie odejmuj drugi raz._'
        );
      }
      sections.push(
        '## POZYCJE REALNE (produkt FlatWide)\n\n' + rows.join('\n') +
        `\n\n_fee narosłe = nieodebrane + odebrane z księgi; tempo = fee / dni od kotwicy._` +
        `\n_Progi detektora flatu z żywego state: wejście gap < ${enterPct.toFixed(1)}%, potwierdzenie ${confirmH}h._`
      );
    } else {
      sections.push('## POZYCJE REALNE (produkt FlatWide)\nbrak żywych pozycji w state.json');
      // cisza byłaby dwuznaczna (bot padł? pozycje zamknięte?) — wysyłamy alarm
      tgRealDigest = `⚠️ HOMOS ${localDate}: brak żywych pozycji w state.json — sprawdź observera`;
    }
  }
} catch { sections.push('## POZYCJE REALNE\nstate.json/positions-history nieparsowalne'); }

// --- PAPER TRADING: podsumowanie dnia (stan + PnL vs HODL per pula) ---
// Zostaje w RAPORCIE (A/B produktu vs paper ma sens do przeglądu 24.09),
// ale NIE idzie już na Telegram — od 29.08 poranna wiadomość to pozycje realne.
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
    }
  } catch { sections.push('## PAPER TRADING\npaper-state.json nieparsowalny'); }
}

fs.writeFileSync(OUT, sections.join('\n\n') + '\n');
console.log(`zapisano ${path.relative(ROOT, OUT)}`);

// --- Telegram: poranny digest POZYCJI REALNYCH (decyzja Rafała 29.08;
// zastępuje digest paper-tradingu z 18.08 — paper nadal jest w raporcie,
// ale wiadomość na telefon ma dotyczyć pieniędzy, które realnie pracują) ---
if (tgRealDigest && process.env.TG_TOKEN && process.env.TG_CHAT) {
  fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TG_CHAT, text: tgRealDigest }),
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
    // --autostash (FIX 21.08): bez tego `pull --rebase` przerywał z
    // "cannot pull with rebase: You have unstaged changes" i raport NIE
    // wypychał się sam — zdiagnozowane przez CC-Win, działo się CODZIENNIE
    // od co najmniej 3 dni. Winowajcą był `data/pipeline.log` (dopisywany
    // o 07:30 przez pipeline, śledzony przez gita mimo wpisu `data/` w
    // .gitignore — .gitignore nie działa na pliki już zaindeksowane).
    // Sam log odpinamy osobno (`git rm --cached`), ale autostash zostaje
    // jako odporność na DOWOLNY brudny plik: jutro będzie inny, a ten
    // automat ma działać bez opieki.
    try { git('pull --rebase --autostash origin main'); git('push origin main'); pushed = true; }
    catch (e) { console.log(`push podejście ${i}/3 nieudane: ${String(e).slice(0, 200)}`); }
  }
  if (!pushed) { console.error('PUSH NIEUDANY po 3 podejściach'); process.exit(1); }
  console.log('raport wypchnięty na main');
} catch (e) {
  console.error(`git błąd: ${String(e).slice(0, 300)}`);
  process.exit(1);
}
