/**
 * morning-report.ts — AUTOMATION: morning snapshot of the bot's state from Windows into the repo.
 *
 * Problem it solves: the analytical session (Fable) on the Mac sees only the
 * repo — Windows never pushed anything on its own, so the morning analysis was
 * blind (stale .bot/* snapshots). This script collects logs/ranking/proposals
 * into reports/morning-YYYY-MM-DD.md and commits+pushes to main.
 *
 * Running (Windows, schtask under the elo account, ~08:45 — AFTER the 07:30 pipeline
 * and AFTER the selector ~08:24):  npm run report:morning
 * Manual test on any machine: REPORT_PUSH=0 npm run report:morning
 *
 * Safety rules (lessons from CONTEXT 17.08):
 *  - does NOT touch the live .bot/* files in git — only READS and copies the content
 *    into a separate file in reports/ (a tracked directory).
 *  - commit+push immediately after writing; push with a pull --rebase retry
 *    (resilience against parallel pushes from other sessions). Historical note:
 *    the runner's auto-pull (reset --hard every 3 min) was WITHDRAWN by Rafal's decision
 *    on 18.08 — since then this script is the ONLY git automation on Windows.
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
  return st ? ((Date.now() - st.mtimeMs) / 3600e3).toFixed(1) + 'h' : 'FILE MISSING';
};

const sections: string[] = [];
sections.push(`# HOMOS morning report — ${localDate} ${pad(now.getHours())}:${pad(now.getMinutes())} (auto, Windows)`);

// --- data freshness ---
const newestCache = (() => {
  const dir = path.join(DATA, 'cache');
  if (!fs.existsSync(dir)) return 'MISSING';
  const ages = fs.readdirSync(dir).filter((f) => f.endsWith('.ndjson'))
    .map((f) => (Date.now() - fs.statSync(path.join(dir, f)).mtimeMs) / 3600e3);
  return ages.length ? Math.min(...ages).toFixed(1) + 'h (newest)' : 'EMPTY';
})();
sections.push(`## Data freshness\n- universe.json: ${ageH(path.join(DATA, 'llama', 'universe.json'))}\n- swap cache: ${newestCache}`);

// --- pipeline: last run ---
// data/pipeline.log (written internally via fs.appendFileSync in pipeline.ts) and
// data/pipeline-task.log (stdout redirect `>>` from the schtask on Windows) can
// drift apart — observed 19.08: pipeline-task.log had a fresh run at
// 06:06 while pipeline.log was stuck on 17.08 despite the same invocation. Take
// the fresher of the two (by the timestamp of the "PIPELINE START" line), not pipeline.log blindly.
// log contract with scripts/pipeline.ts: it writes `=== PIPELINE START (only=...) ===`
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
  sections.push('## pipeline.log (last run)\n```\n' + tail(newest.block, 40) + '\n```');
} else sections.push('## pipeline.log\nFILE MISSING (neither pipeline.log nor pipeline-task.log)');
if (ptask) sections.push('## pipeline-task.log (tail)\n```\n' + tail(ptask, 12) + '\n```');

// --- selector: lines from the last 2 days ---
// observer-tail.log on Windows is sometimes double-encoded (UTF-8 passed
// through cp1250 on console redirect) — a map of the most common mojibake
// sequences for Polish characters (reported by CC-Win 18.08, cosmetic).
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
  // log contract with bot/observer.ts (observer.log lines emitted by bot/selector.ts):
  // 'ranking dnia' (= "daily ranking") is the literal the selector still writes — kept unchanged
  const sel = olog.split('\n').filter((l) => /selector:|ranking dnia/i.test(l)).map(demojibake);
  sections.push(`## selector (lines from ${ologSrc}, last 30)\n\`\`\`\n` + sel.slice(-30).join('\n') + '\n```');
} else sections.push('## selector\nMISSING .bot/observer.log and .bot/observer-tail.log');

// --- open proposals ---
const props = readSafe(path.join(BOT, 'proposals.json'));
if (props) {
  try {
    const open = (JSON.parse(props) as Array<{ status: string }>).filter((p) => p.status === 'open');
    sections.push('## OPEN proposals (' + open.length + ')\n```json\n' + JSON.stringify(open, null, 2) + '\n```');
  } catch { sections.push('## proposals\nproposals.json UNPARSEABLE'); }
} else sections.push('## proposals\nMISSING .bot/proposals.json');

// --- candidates: auto-funnel verdicts (last 7 days) + today's queue ---
try {
  const verd = readSafe(path.join(BOT, 'candidate-verdicts.json'));
  const queue = readSafe(path.join(BOT, 'candidate-queue.json'));
  const lines: string[] = [];
  if (verd) {
    const cutoff = Date.now() - 7 * 24 * 3600e3;
    const recent = (JSON.parse(verd) as any[]).filter((v) => v.testedAt && Date.parse(v.testedAt) > cutoff);
    if (recent.length) {
      lines.push('| verdict | pool | win % | worst | date | note |', '|---|---|---|---|---|---|');
      for (const v of recent) {
        const icon = v.verdict === 'PASS' ? '✅ PASS' : v.verdict === 'FAIL' ? '⛔ FAIL' : v.verdict;
        lines.push(`| ${icon} | ${v.symbol} ${v.feeTier} @ ${v.chain} | ${v.winPct ?? '—'} | ${v.worst ?? '—'} | ${v.testedAt} | ${(v.note || '').slice(0, 90)} |`);
      }
    } else lines.push('no verdicts in the last 7 days');
  } else lines.push('MISSING .bot/candidate-verdicts.json (funnel has not run yet)');
  if (queue) {
    const q = JSON.parse(queue);
    const items = (q.queue ?? []).map((i: any) => `${i.symbol} ${i.feeTier} @ ${i.chain} (streak ${i.streak})`).join(' · ') || 'empty';
    lines.push(`\nqueue (${(q.generatedAt || '').slice(0, 16)}): ${items}`);
    const def = (q.deferred ?? []).map((i: any) => `${i.symbol} ${i.feeTier} @ ${i.chain}`).join(' · ');
    if (def) lines.push(`deferred (<180d of history): ${def}`);
  }
  sections.push('## Candidates (auto-funnel)\n\n' + lines.join('\n'));
} catch { sections.push('## Candidates (auto-funnel)\nfunnel files unparseable'); }

// --- WIDE ranking (funnel v2 floor 1; next to the selector's APY ranking) ---
try {
  const wr = readSafe(path.join(BOT, 'wide-ranking.json'));
  if (wr) {
    const r = JSON.parse(wr);
    const daily = (() => { try { return JSON.parse(readSafe(path.join(BOT, 'wide-daily.json')) || '{}').pools ?? {}; } catch { return {}; } })();
    const dcol = (uuid: string) => {
      const d = daily[uuid];
      if (!d || d.error) return '— | — | —';
      const w3 = d.windows?.w365, w7 = d.windows?.w720;
      const f = (x: any) => (x === null || x === undefined ? '—' : (x > 0 ? '+' : '') + x);
      return `${w3 ? `${f(w3.latest.lpPct)}/${f(w3.latest.hodlPct)}/${f(w3.latest.deltaPct)} (med Δ ${f(w3.medDeltaPct)}, n${w3.n})` : '—'} | ${w7 ? `${f(w7.latest.deltaPct)} (med ${f(w7.medDeltaPct)})` : '—'} | ${d.flatPct365 ?? '—'}%`;
    };
    const lines = [
      `day ${r.day} · ${r.criteria?.window ?? ''}`,
      '',
      '| # | pool | class | score %/yr | fee wide | drag | σ/yr | streak | TVL | in bot | 365d LP/HODL/Δ | 720d Δ | flat |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ];
    for (const row of r.rows ?? [])
      lines.push(
        `| ${row.rank} | ${row.symbol} ${row.poolMeta} @ ${row.chain} | ${row.cls ?? ''} | ${row.apy7d} | ${row.feeAprWide ?? '—'} | ${row.dragPct ?? '—'} | ${row.sigmaAnnPct ?? '—'}${row.driftFlag ? ' ⚠' : ''} | ${row.streak}d | $${(row.tvlUsd / 1e6).toFixed(1)}M | ${row.botPoolId ?? '—'} | ${dcol(row.llamaUuid)} |`
      );
    lines.push('', '_score = wide-range fee − volatility cost (drag); in %/yr; observational ranking, the entry decision is manual (TASKS-FUNNEL §2)._',
      '_365d/720d = DAILY MODEL of the class wide range (wide-daily): LP % / HODL 50/50 % / Δ pp "from today backwards", med Δ = median of rolling windows every 30d; flat = % of days with |gap|<2% (365d). ±a few pp — for comparisons, not for bookkeeping._');
    sections.push('## WIDE RANKING (for the product, top 10)\n\n' + lines.join('\n'));
  } else sections.push('## WIDE RANKING\nMISSING .bot/wide-ranking.json (wide-score step has not run yet)');
} catch { sections.push('## WIDE RANKING\nwide-ranking.json unparseable'); }

// --- states ---
for (const f of ['selector-state.json', 'trend-state.json']) {
  const s = readSafe(path.join(BOT, f));
  if (s) sections.push(`## ${f}\n\`\`\`json\n${s.trim()}\n\`\`\``);
}

// --- REAL POSITIONS (FlatWide product, 28.08) — equity vs HODL + flat state ---
// Gap from the 28.08 brief: the report had no real-positions section, Fable
// had to pull /api/state through the browser. Reads state.json (live
// values from the observer) + positions-history.ndjson (HODL anchor =
// first sample per tokenId).
// Telegram digest (29.08, Rafal's decision): the morning message concerns
// ONLY real positions — paper stopped mattering once capital went in,
// and the daily paper digest drowned out what needs a decision.
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
      try { const r = JSON.parse(line); if (!first[r.tokenId]) first[r.tokenId] = r; last[r.tokenId] = r; } catch { /* skip */ }
    }
    const fmtUsd = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`);
    // flat detector parameters from the state root (single source of truth in bot/config.ts,
    // BATCH 17) — the report does NOT hardcode 2%/12h, because a review may change them
    const fp = st.flatParams ?? {};
    const enterPct = (typeof fp.enterGap === 'number' ? fp.enterGap : 0.02) * 100;
    const exitPct = (typeof fp.exitGap === 'number' ? fp.exitGap : 0.05) * 100;
    const confirmH = typeof fp.confirmH === 'number' ? fp.confirmH : 12;
    const nowMs = Date.now();
    // the phone digest counts ONLY product positions (posture set) —
    // the old dust #953427 ($2, legacy mainnet) has no cycle or stabilization
    // and would clutter the message; it goes as a single line at the end.
    const tgPositions: string[] = [];
    const tgOther: string[] = [];
    let tgVal = 0, tgPnl = 0, tgAnchor = 0;
    const rows = [
      '| position | pool | posture | value | vs HODL | PnL since anchor | accrued fees | pace $/d | range | EMA gap | flat |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
    ];
    for (const pos of st.positions ?? []) {
      const f = first[pos.tokenId];
      const l = last[pos.tokenId];
      const vsHodl = l ? pos.valueUsd - l.hodlUsd : null;
      const pnl = f ? pos.valueUsd - f.hodlUsd : null; // anchor: hodlUsd of the 1st sample = value at the moment of anchoring
      const pl = poolsById[pos.poolId];
      // FEE PACE (29.08, Rafal's brief): fees since open = accrued (uncollected)
      // + already collected from the ledger; divided by days since the anchor. After the first
      // COLLECT, `feesUsd` alone would drop to zero and the pace would lie downwards.
      // when accrued is unknown (RPC refused) → "—", NOT "$0.00": a zero from missing
      // data would look like "the pool earns nothing" and mislead during the brief
      const feesTotal =
        typeof pos.feesUsd === 'number' ? pos.feesUsd + (pos.collectedFeesUsd ?? 0) : null;
      const days = f ? (nowMs - Date.parse(f.ts)) / 86_400e3 : null;
      const pace = feesTotal !== null && days !== null && days > 0.5 ? feesTotal / days : null;
      const postureTxt = pos.posture === 'narrow' ? 'NARROW' : pos.posture === 'wide' ? 'WIDE' : '—';
      // FLAT CLOCK with a countdown — without it the report only said "—" and
      // one could not tell "gap beyond threshold" from "clock ticking, close to the end".
      let flatTxt: string;
      if (pl?.flatConfirmed) {
        flatTxt = `✅ CONFIRMED (since ${String(pl.flatSince ?? '').slice(5, 16)}Z)`;
      } else if (pl?.flatSince) {
        const leftH = confirmH - (nowMs - Date.parse(String(pl.flatSince))) / 3600e3;
        flatTxt = `⏳ clock since ${String(pl.flatSince).slice(5, 16)}Z — ${leftH > 0 ? `confirmation in ${leftH.toFixed(1)}h` : 'confirmation in the next cycle'}`;
      } else if (pos.posture !== null && pos.posture !== undefined) {
        // NOTE: no vertical bars in the cell content (it would break the table)
        flatTxt = `— beyond threshold (needs < ${enterPct.toFixed(1)}%)`;
      } else {
        flatTxt = '—';
      }
      // telegram line (29.08): the same truth as the table, but in phone
      // language — "stabilization" instead of "flat", time to NARROWING stated directly
      const tgFlat = pos.posture === 'narrow'
        // in the narrow range what matters is no longer the entry but the exit from flat
        ? `✅ narrow range working — widening at gap > ${exitPct.toFixed(1)}%`
        : pl?.flatConfirmed
        ? '✅ stabilization confirmed — narrowing in proposals'
        : pl?.flatSince
          ? (() => {
              const leftH = confirmH - (nowMs - Date.parse(String(pl.flatSince))) / 3600e3;
              return leftH > 0
                ? `⏳ stabilization since ${String(pl.flatSince).slice(11, 16)}Z — ${leftH.toFixed(1)}h to narrowing`
                : '⏳ stabilization complete — narrowing in the next cycle';
            })()
          : `no stabilization (gap ${typeof pl?.trendGapPct === 'number' ? pl.trendGapPct.toFixed(1) : '?'}%, needs < ${enterPct.toFixed(1)}%)`;
      if (!pos.posture) {
        tgOther.push(`#${pos.tokenId} ${pos.poolId}: $${pos.valueUsd.toFixed(2)} (outside the product)`);
      } else {
        tgVal += pos.valueUsd;
        tgPnl += pnl ?? 0;
        tgAnchor += f?.hodlUsd ?? 0;
        tgPositions.push(
          `#${pos.tokenId} ${pos.poolId}${pos.inRange ? '' : ' ⚠️ OUT OF RANGE'}\n` +
          `  $${pos.valueUsd.toFixed(2)} · PnL since start ${fmtUsd(pnl)}\n` +
          `  accrued fees ${typeof pos.feesUsd === 'number' ? `$${pos.feesUsd.toFixed(2)}` : '—'} · reinvested ${typeof pos.collectedFeesUsd === 'number' ? `$${pos.collectedFeesUsd.toFixed(2)}` : '—'}\n` +
          `  cycle: ${postureTxt} · ${tgFlat}`
        );
      }
      rows.push(
        `| #${pos.tokenId} | ${pos.poolId} | ${postureTxt} | $${pos.valueUsd.toFixed(0)} | ${fmtUsd(vsHodl)} | ${fmtUsd(pnl)}${f ? ` (since ${String(f.ts).slice(0, 10)})` : ''} | ${feesTotal === null ? '—' : `$${feesTotal.toFixed(2)}`} | ${pace === null ? '—' : `$${pace.toFixed(2)}`} | ${pos.inRange ? 'in range' : '⚠️ OUT'} | ${typeof pl?.trendGapPct === 'number' ? pl.trendGapPct.toFixed(1) + '%' : '—'} | ${flatTxt} |`
      );
    }
    if ((st.positions ?? []).length) {
      const sumVal = (st.positions ?? []).reduce((s: number, p: any) => s + (p.valueUsd ?? 0), 0);
      const sumVsHodl = (st.positions ?? []).reduce(
        (s: number, p: any) => s + (last[p.tokenId] ? p.valueUsd - last[p.tokenId].hodlUsd : 0), 0);
      rows.push(`| **TOTAL** | | | **$${sumVal.toFixed(2)}** | ${fmtUsd(sumVsHodl)} | | | | | | |`);
      // PnL since start = value today − anchor (hodlUsd of the 1st sample). Interpretation
      // NOTE for the reader: this includes the MARKET MOVE (beta), so a
      // negative PnL with vs HODL ≈ 0 means "the market fell", not "the strategy is losing".
      const trHeader = st.tranche && typeof st.tranche.depositedUsd === 'number' && st.tranche.totalUsd !== null
        ? `\n${st.tranche.label ?? 'Tranche'}: $${st.tranche.depositedUsd.toFixed(0)} deposited → $${st.tranche.totalUsd.toFixed(2)} today (${fmtUsd(st.tranche.diffUsd)}${st.tranche.diffPct === null ? '' : `, ${st.tranche.diffPct.toFixed(2)}%`})`
        : '';
      if (tgPositions.length) {
        tgRealDigest =
          `📈 HOMOS ${localDate} — real positions\n` +
          `Total equity: $${tgVal.toFixed(2)} · PnL since start: ${fmtUsd(tgPnl)}` +
          `${tgAnchor > 0 ? ` (${((tgPnl / tgAnchor) * 100).toFixed(2)}%)` : ''}` +
          `${trHeader}\n\n` +
          tgPositions.join('\n\n') +
          (tgOther.length ? `\n\n${tgOther.join('\n')}` : '');
      }
      // TRANCHE BALANCE (29.08) — a second measure next to the strategy metrics: how much
      // of the DEPOSITED USDC is really there today (LP + wallet), and what ate
      // the difference. The bot computes, the report only displays.
      const tr = st.tranche;
      if (tr && typeof tr.depositedUsd === 'number') {
        const line = (k: string, v: string) => `| ${k} | ${v} |`;
        const trRows = [
          '| balance item | amount |', '|---|---|',
          line(`deposited (${tr.startedAt})`, `$${tr.depositedUsd.toFixed(2)}`),
          line('today in LP positions', `$${(tr.lpUsd ?? 0).toFixed(2)}`),
          line('today in wallet (buffer + gas)', tr.walletUsd === null ? '— (balance read failed)' : `$${tr.walletUsd.toFixed(2)}`),
          line('**total today**', tr.totalUsd === null ? '—' : `**$${tr.totalUsd.toFixed(2)}**`),
          line('**difference vs deposited**', tr.diffUsd === null ? '—' : `**${fmtUsd(tr.diffUsd)}${tr.diffPct === null ? '' : ` (${tr.diffPct.toFixed(2)}%)`}**`),
          line('— of which market move on LP', tr.marketPnlUsd === null ? '—' : fmtUsd(tr.marketPnlUsd)),
          line('— of which residual (entry costs + buffer beta)', tr.residualUsd === null ? '—' : fmtUsd(tr.residualUsd)),
          ...(tr.entryCostUsd === null && tr.bufferBetaUsd === null ? [] : [
            line('&nbsp;&nbsp;• entry costs (fixed)', tr.entryCostUsd === null ? '—' : fmtUsd(tr.entryCostUsd)),
            line('&nbsp;&nbsp;• buffer beta (since the buffer anchor)', tr.bufferBetaUsd === null ? '—' : fmtUsd(tr.bufferBetaUsd)),
          ]),
          line('(informational) indexed gas', tr.gasUsd === null ? '—' : `$${tr.gasUsd.toFixed(2)}`),
        ];
        // wallet composition — auditability: the first measurement gave $226 instead of
        // the estimated $150, so it must be visible WHAT the bot counted in
        const parts = Array.isArray(tr.walletParts) && tr.walletParts.length
          ? `\n\n_Wallet: ${tr.walletParts.map((w: any) => `${w.sym} ${w.amount} ($${w.usd.toFixed(2)})`).join(' · ')}_`
          : '';
        sections.push(
          `## TRANCHE BALANCE — ${tr.label ?? 'tranche 1'}\n\n` + trRows.join('\n') + parts +
          '\n\n_"Residual" is the one-off entry costs (swaps, slippage, mint gas) plus the beta of the buffer in the wallet._' +
          '\n_Entry costs should be FIXED — their drift means something in the bookkeeping is diverging._' +
          '\n_NOTE: the buffer anchor was created on 29.08, so the buffer beta from 27–29.08 sits in the entry costs._' +
          '\n_Gas is already included in the "residual" — informational line, do not subtract it twice._'
        );
      }
      sections.push(
        '## REAL POSITIONS (FlatWide product)\n\n' + rows.join('\n') +
        `\n\n_accrued fees = uncollected + collected from the ledger; pace = fees / days since anchor._` +
        `\n_Flat detector thresholds from the live state: entry gap < ${enterPct.toFixed(1)}%, confirmation ${confirmH}h._`
      );
    } else {
      sections.push('## REAL POSITIONS (FlatWide product)\nno live positions in state.json');
      // silence would be ambiguous (bot down? positions closed?) — we send an alarm
      tgRealDigest = `⚠️ HOMOS ${localDate}: no live positions in state.json — check the observer`;
    }
  }
} catch { sections.push('## REAL POSITIONS\nstate.json/positions-history unparseable'); }

// --- PAPER TRADING: daily summary (state + PnL vs HODL per pool) ---
// Stays in the REPORT (the product vs paper A/B makes sense until the 24.09 review),
// but NO LONGER goes to Telegram — since 29.08 the morning message is the real positions.
const paperRaw = readSafe(path.join(BOT, 'paper-state.json'));
if (paperRaw) {
  try {
    const ps = JSON.parse(paperRaw);
    // last equity sample per pool from paper-history.ndjson
    const lastRow: Record<string, any> = {};
    const ph = readSafe(path.join(BOT, 'paper-history.ndjson'));
    if (ph) for (const line of ph.trimEnd().split('\n')) {
      try { const r = JSON.parse(line); lastRow[r.poolId] = r; } catch { /* skip */ }
    }
    const cap = ps.capitalPerPoolUsd ?? 10_000;
    const rows: string[] = ['| pool | status | equity | PnL | vs HODL | fees | reb |', '|---|---|---|---|---|---|---|'];
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
      rows.push(`| **TOTAL** | | **$${totalEq.toFixed(0)}** | ${totalEq - n * cap >= 0 ? '+' : ''}$${(totalEq - n * cap).toFixed(0)} | ${totalEq - totalHodl >= 0 ? '+' : ''}$${(totalEq - totalHodl).toFixed(0)} | | |`);
      sections.push(`## PAPER TRADING (start ${(ps.startedAt || '').slice(0, 10)}, $${cap}/pool)\n\n${rows.join('\n')}`);
    }
  } catch { sections.push('## PAPER TRADING\npaper-state.json unparseable'); }
}

fs.writeFileSync(OUT, sections.join('\n\n') + '\n');
console.log(`written ${path.relative(ROOT, OUT)}`);

// --- Telegram: morning digest of REAL POSITIONS (Rafal's decision 29.08;
// replaces the paper-trading digest from 18.08 — paper is still in the report,
// but the phone message is supposed to be about the money that is really working) ---
if (tgRealDigest && process.env.TG_TOKEN && process.env.TG_CHAT) {
  fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TG_CHAT, text: tgRealDigest }),
  }).catch((e) => console.log(`telegram digest error: ${e}`));
}

// --- commit + push (fast, with retry) ---
if (process.env.REPORT_PUSH === '0') { console.log('REPORT_PUSH=0 — skipping git'); process.exit(0); }
const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: ROOT, stdio: 'pipe' }).toString();
try {
  git(`add ${JSON.stringify(path.relative(ROOT, OUT))}`);
  try { git(`commit -m "report: morning snapshot ${localDate} (auto, Windows)"`); }
  catch { console.log('nothing to commit (report unchanged)'); process.exit(0); }
  let pushed = false;
  for (let i = 1; i <= 3 && !pushed; i++) {
    // --autostash (FIX 21.08): without it `pull --rebase` aborted with
    // "cannot pull with rebase: You have unstaged changes" and the report did NOT
    // push itself — diagnosed by CC-Win, it happened EVERY DAY
    // for at least 3 days. The culprit was `data/pipeline.log` (appended
    // at 07:30 by the pipeline, tracked by git despite the `data/` entry in
    // .gitignore — .gitignore has no effect on files already indexed).
    // The log itself gets untracked separately (`git rm --cached`), but autostash stays
    // as resilience against ANY dirty file: tomorrow it will be a different one, and this
    // automation has to work unattended.
    try { git('pull --rebase --autostash origin main'); git('push origin main'); pushed = true; }
    catch (e) { console.log(`push attempt ${i}/3 failed: ${String(e).slice(0, 200)}`); }
  }
  if (!pushed) { console.error('PUSH FAILED after 3 attempts'); process.exit(1); }
  console.log('report pushed to main');
} catch (e) {
  console.error(`git error: ${String(e).slice(0, 300)}`);
  process.exit(1);
}
