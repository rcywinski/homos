/**
 * e8-carry.ts — E8.1 FUNDING CASH-AND-CARRY (delta-neutral).
 *
 * Position: long spot 1x + short perp 1x of the same size. Price exposure
 * cancels out; what remains is funding (r > 0 → the short RECEIVES) minus costs.
 * Gate question: over rolling windows of W days, does net funding beat the
 * "boring" USDC yield (BENCH_APR) — and what does the tail (negative funding) look like.
 *
 *   npx tsx backtest/e8-carry.ts data/funding/ETHUSDT.json [W=30] [step=15]
 *   npx tsx backtest/e8-carry.ts data/funding/HL-ETH.json 90 30
 *
 * ENV (defaults = conservative):
 *   BENCH_APR=4.5      %/yr of the alternative (USDC on Aave/Morpho) — from E8.0
 *   COST_RT=0.25       % round-trip: taker spot+perp open+close
 *                      (HL taker 0.035%x2 + spot 0.1%x2 ≈ 0.27; Binance
 *                      similar) + spread; NOT amortized — paid in EVERY
 *                      window (window = one entry/exit round)
 *   CAPITAL_SHARE=0.5  how much capital works as spot (the rest = short
 *                      margin, unremunerated; 0.5 = 1:1 margin, safe against
 *                      a +100% rally without liquidation). Funding accrues on
 *                      notional = CAPITAL_SHARE x capital.
 *   MARGIN_YIELD=0     %/yr on margin (HL/Binance do not pay; if the venue
 *                      pays for USDC held as margin — set it here)
 *
 * Model per window [s, s+W):
 *   funding% = Σ r_i x 100 (r as a fraction per period; sum over periods in the window)
 *   carry%   = CAPITAL_SHARE x funding% + (1−CAPITAL_SHARE) x MARGIN_YIELD x W/365
 *              − COST_RT
 *   bench%   = BENCH_APR x W/365
 *   edge%    = carry% − bench%
 * Output: mean/median/win rate/worst edge% per window + per calendar year
 * (regime: 2022 bear, 2024–25 bull, etc.) + the longest streak of negative
 * funding (in days) + distribution of annualized funding.
 * Written to: backtest/results/e8-carry-<file>-<W>d.json
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, 'results');
const DAY = 86400_000;
const env = (k: string, d: number) => (process.env[k] !== undefined ? Number(process.env[k]) : d);
const BENCH_APR = env('BENCH_APR', 4.5);
const COST_RT = env('COST_RT', 0.25);
const CAPITAL_SHARE = env('CAPITAL_SHARE', 0.5);
const MARGIN_YIELD = env('MARGIN_YIELD', 0);
const pct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);

type Row = { t: number; r: number };

function stat(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  return {
    mean: vals.reduce((a, b) => a + b, 0) / vals.length,
    med: s[Math.floor(s.length / 2)],
    winPct: (vals.filter((v) => v > 0).length / vals.length) * 100,
    worst: s[0],
    best: s[s.length - 1],
    windows: vals.length,
  };
}

(async () => {
  const file = process.argv[2] || 'data/funding/ETHUSDT.json';
  const W = Number(process.argv[3] || 30);
  const step = Number(process.argv[4] || 15);
  const rows: Row[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  rows.sort((a, b) => a.t - b.t);
  if (rows.length < 10) { console.error('not enough data'); process.exit(1); }
  const periodH = Math.round((rows[rows.length - 1].t - rows[0].t) / (rows.length - 1) / 3600_000 * 10) / 10;
  const t0 = rows[0].t, t1 = rows[rows.length - 1].t;
  const spanDays = (t1 - t0) / DAY;
  const tag = path.basename(file).replace(/\.json$/, '');
  console.log(`${tag}: ${rows.length} periods (~${periodH}h), ${spanDays.toFixed(0)} days (${new Date(t0).toISOString().slice(0, 10)} → ${new Date(t1).toISOString().slice(0, 10)})`);
  console.log(`windows ${W}d every ${step}d · BENCH_APR ${BENCH_APR}% · COST_RT ${COST_RT}% · CAPITAL_SHARE ${CAPITAL_SHARE} · MARGIN_YIELD ${MARGIN_YIELD}%\n`);

  // prefix sums for fast window lookups
  const pre: number[] = [0];
  for (const r of rows) pre.push(pre[pre.length - 1] + r.r);
  const idxAt = (t: number) => { // first index with t >= t
    let lo = 0, hi = rows.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (rows[m].t < t) lo = m + 1; else hi = m; }
    return lo;
  };

  const perWindow: Array<{ start: number; year: number; fundingPct: number; carryPct: number; edgePct: number }> = [];
  for (let s = t0; s + W * DAY <= t1; s += step * DAY) {
    const a = idxAt(s), b = idxAt(s + W * DAY);
    if (b - a < 3) continue;
    const fundingPct = (pre[b] - pre[a]) * 100;
    const carryPct = CAPITAL_SHARE * fundingPct + (1 - CAPITAL_SHARE) * MARGIN_YIELD * (W / 365) - COST_RT;
    const edgePct = carryPct - BENCH_APR * (W / 365);
    perWindow.push({ start: s, year: new Date(s).getUTCFullYear(), fundingPct, carryPct, edgePct });
  }
  if (!perWindow.length) { console.error('no complete windows'); process.exit(1); }

  const all = stat(perWindow.map((w) => w.edgePct));
  const hdr = 'set'.padEnd(16) + 'wins'.padStart(6) + 'mean'.padStart(8) + 'med.'.padStart(8) + '%win'.padStart(7) + 'worst'.padStart(8) + 'best'.padStart(8) + '  | funding mean %/window';
  console.log(`EDGE vs bench [% per ${W}d window]`);
  console.log(hdr);
  const line = (name: string, ws: typeof perWindow) => {
    const s = stat(ws.map((w) => w.edgePct));
    const f = ws.reduce((a, w) => a + w.fundingPct, 0) / ws.length;
    console.log(name.padEnd(16) + String(s.windows).padStart(6) + pct(s.mean).padStart(8) + pct(s.med).padStart(8) + s.winPct.toFixed(0).padStart(6) + '%' + pct(s.worst).padStart(8) + pct(s.best).padStart(8) + '  | ' + pct(f));
    return s;
  };
  line('ALL', perWindow);
  const byYear: Record<string, any> = {};
  for (const y of [...new Set(perWindow.map((w) => w.year))].sort()) byYear[y] = line(`  ${y}`, perWindow.filter((w) => w.year === y));
  const recent = perWindow.filter((w) => w.start >= t1 - 180 * DAY);
  const recent180 = recent.length ? line('  recent180', recent) : null;

  // tail: longest streak of negative funding (days) + annualized funding
  let run = 0, worstRun = 0, runStart = 0, worstRunStart = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].r < 0) { if (!run) runStart = rows[i].t; run++; if (run > worstRun) { worstRun = run; worstRunStart = runStart; } } else run = 0;
  }
  const worstRunDays = (worstRun * periodH) / 24;
  const annFunding = (pre[rows.length] / spanDays) * 365 * 100;
  const negShare = rows.filter((r) => r.r < 0).length / rows.length;
  console.log(`\nAnnualized funding (whole set): ${pct(annFunding)}%/yr · negative periods ${(negShare * 100).toFixed(0)}% · longest negative streak ${worstRunDays.toFixed(1)} days (from ${new Date(worstRunStart).toISOString().slice(0, 10)})`);
  const breakeven = (COST_RT + BENCH_APR * (W / 365)) / CAPITAL_SHARE;
  console.log(`Window breakeven: funding ≥ ${breakeven.toFixed(2)}% / ${W}d (= ${(breakeven * 365 / W).toFixed(1)}%/yr) — below that, holding USDC is better.`);
  console.log(`\nCRITERION E8.1: %win ≥ 65 on ALL and ≥ 50 in the worst year, worst > −(2xCOST_RT) — otherwise the class does NOT pass.`);

  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `e8-carry-${tag}-${W}d.json`);
  fs.writeFileSync(out, JSON.stringify({ file, W, step, periodH, spanDays, params: { BENCH_APR, COST_RT, CAPITAL_SHARE, MARGIN_YIELD }, all, byYear, recent180, annFunding, negShare, worstRunDays, worstRunStart, breakevenPct: breakeven, perWindow }, null, 2));
  console.log(`→ ${out}`);
})();
