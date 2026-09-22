/**
 * e8-house.ts — E8.2 "THE HOUSE": does being the counterparty to traders
 * (HLP / GM pools) beat HODLing the basket and boring USDC — gated as always.
 *
 *   npx tsx backtest/e8-house.ts data/vaults/HLP.json usdc [W=30] [step=15]
 *   npx tsx backtest/e8-house.ts data/vaults/GM-ETH-USD.json eth50 90 30
 *   npx tsx backtest/e8-house.ts data/vaults/GM-BTC-USD.json btc50 90 30
 *   npx tsx backtest/e8-house.ts data/vaults/GLP.json mix 90 30
 *
 * Benchmark (2nd argument):
 *   usdc  — 100% USDC at BENCH_APR (HLP is ~market-neutral)
 *   eth50 — HODL 50% ETH / 50% USDC (backing of GM ETH/USD; USDC at BENCH_APR)
 *   btc50 — HODL 50% BTC / 50% USDC
 *   mix   — HODL 30% ETH / 20% BTC / 50% USDC (nominal GLP/JLP basket:
 *           stables ~50%, the rest ETH+BTC) — the only bench with a
 *           TWO-FACTOR regression (see below), because a single-factor one
 *           on ETH alone books BTC moves as fake alpha (lesson of 08.09: GLP
 *           "+7%/yr" on eth50 was entirely BTC beta leakage).
 * ETH/BTC prices: coins.llama (cache data/llama/prices, as in wide-daily).
 * ENV: BENCH_APR=4.5 (from E8.0), OFFLINE=1, SPAN_DAYS=1100 (coins.llama
 * price reach — for series older than 09.2023 set e.g. 1500), CUT_AFTER=YYYY-MM-DD
 * (drop points AFTER this date — e.g. the GLP hack 2025-07-09: "the class under
 * normal conditions" separately from "with the tail").
 * REGRESSION over windows: vault% = α + β·asset% → β = real exposure (for
 * mixed baskets like GLP a rigid 50/50 is not fair), α = beta-adjusted edge.
 * For `mix`: two-factor vault% = α + βETH·ETH% + βBTC·BTC% (normal equations,
 * Gaussian elimination), α computed so that at βETH+βBTC=1 it reduces to the
 * plain difference vs HODL.
 *
 * Per window [s, s+W): vault% = v(s+W)/v(s) − 1; bench% analogously
 * (basket rebalanced once, at window start — like HODL 50/50 in the engine);
 * edge% = vault% − bench%. Statistics: mean/med/%win/worst per year + regime
 * (asset price change in the window: up > +10%, down < −10%, flat) + recent180
 * + vault max drawdown (the "player broke the bank" tail).
 * CRITERION E8.2: %win ≥ 65 vs basket, worst edge > −5 (90d), positive
 * edge in ≥2 regimes, vault maxDD < basket maxDD. Written to:
 * backtest/results/e8-house-<name>-<W>d.json
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'results');
const PRICES = path.join(ROOT, 'data', 'llama', 'prices');
const DAY = 86400;
const BENCH_APR = process.env.BENCH_APR !== undefined ? Number(process.env.BENCH_APR) : 4.5;
const OFFLINE = process.env.OFFLINE === '1';
const SPAN_DAYS = Number(process.env.SPAN_DAYS || 1100);
const CUT_AFTER = process.env.CUT_AFTER ? Math.floor(Date.parse(process.env.CUT_AFTER) / 1000 / DAY) : null;
const pct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);
const dayOf = (tsSec: number) => Math.floor(tsSec / DAY);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, tries = 5): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (r.status === 429) { await sleep(5000 * 2 ** i); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (i === tries - 1) throw e; await sleep(2000 * (i + 1)); }
  }
}
async function loadPrices(key: string): Promise<Map<number, number>> {
  fs.mkdirSync(PRICES, { recursive: true });
  const f = path.join(PRICES, `${key.replace(':', '_')}.json`);
  const today = dayOf(Date.now() / 1000);
  let series: { t: number; p: number }[] | null = null;
  const cached = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  if (cached && (cached.day === today || OFFLINE)) series = cached.series;
  if (!series) {
    const SPAN = SPAN_DAYS, startAll = dayOf(Date.now() / 1000) * DAY + DAY / 2 - SPAN * DAY;
    const acc: { t: number; p: number }[] = [];
    for (let off = 0; off < SPAN; off += 500) {
      const j = await fetchJson(`https://coins.llama.fi/chart/${key}?start=${startAll + off * DAY}&span=${Math.min(500, SPAN - off)}&period=1d`);
      const v = j.coins?.[key] ?? j.coins?.[Object.keys(j.coins ?? {})[0]];
      for (const x of v?.prices ?? []) acc.push({ t: x.timestamp, p: x.price });
      await sleep(300);
    }
    series = acc;
    if (series.length) fs.writeFileSync(f, JSON.stringify({ day: today, key, series }));
  }
  const m = new Map<number, number>();
  for (const x of series!) if (x.p > 0) m.set(dayOf(x.t), x.p);
  return m;
}
function stat(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  return { mean: vals.reduce((a, b) => a + b, 0) / vals.length, med: s[s.length >> 1], winPct: (vals.filter((v) => v > 0).length / vals.length) * 100, worst: s[0], best: s[s.length - 1], windows: vals.length };
}
function maxDD(vals: number[]) { let peak = -Infinity, dd = 0; for (const v of vals) { if (v > peak) peak = v; dd = Math.max(dd, 1 - v / peak); } return dd * 100; }

(async () => {
  const file = process.argv[2];
  const bench = (process.argv[3] || 'usdc') as 'usdc' | 'eth50' | 'btc50' | 'mix' | 'mix3';
  const W = Number(process.argv[4] || 30);
  const step = Number(process.argv[5] || 15);
  if (!file) { console.error('usage: e8-house.ts <data/vaults/X.json> usdc|eth50|btc50|mix|mix3 [W] [step]'); process.exit(1); }
  const vault = JSON.parse(fs.readFileSync(file, 'utf8')) as { name: string; series: { t: number; v: number }[] };
  const vm = new Map<number, number>();
  for (const x of vault.series) { const d = dayOf(x.t / 1000); if (CUT_AFTER === null || d <= CUT_AFTER) vm.set(d, x.v); }
  const asset = bench === 'eth50' ? 'coingecko:ethereum' : bench === 'btc50' ? 'coingecko:bitcoin' : null;
  const pm = asset ? await loadPrices(asset) : null;
  const pmEth = bench === 'mix' || bench === 'mix3' ? await loadPrices('coingecko:ethereum') : null;
  const pmBtc = bench === 'mix' || bench === 'mix3' ? await loadPrices('coingecko:bitcoin') : null;
  const pmSol = bench === 'mix3' ? await loadPrices('coingecko:solana') : null;
  const hasPrices = pm !== null || bench === 'mix' || bench === 'mix3';
  const days = [...vm.keys()].sort((a, b) => a - b).filter((d) => (!pm || pm.has(d)) && (!pmEth || pmEth.has(d)) && (!pmBtc || pmBtc.has(d)) && (!pmSol || pmSol.has(d)));
  if (days.length < W + 1) { console.error(`not enough overlapping days (${days.length})`); process.exit(1); }
  const d0 = days[0], d1 = days[days.length - 1];
  console.log(`${vault.name}: ${days.length} days (${new Date(d0 * DAY * 1000).toISOString().slice(0, 10)} → ${new Date(d1 * DAY * 1000).toISOString().slice(0, 10)}) · bench ${bench} · BENCH_APR ${BENCH_APR}% · windows ${W}d every ${step}d${CUT_AFTER !== null ? ` · CUT_AFTER ${process.env.CUT_AFTER}` : ''}${hasPrices && days.length < vm.size * 0.9 ? ' · ⚠ prices cover only part of the vault series — increase SPAN_DAYS' : ''}\n`);

  const at = (m: Map<number, number>, d: number) => m.get(d) ?? m.get(d - 1) ?? m.get(d + 1);
  type Win = { start: number; year: number; regime: string; vaultPct: number; benchPct: number; edgePct: number; assetPct: number; asset2Pct: number; asset3Pct: number };
  const wins: Win[] = [];
  for (let s = d0; s + W <= d1; s += step) {
    const v0 = at(vm, s), v1 = at(vm, s + W);
    if (!v0 || !v1) continue;
    let assetPct = 0, asset2Pct = 0, asset3Pct = 0, benchPct = BENCH_APR * (W / 365);
    if (bench === 'mix3') {
      const pe0 = at(pmEth!, s), pe1 = at(pmEth!, s + W), pb0 = at(pmBtc!, s), pb1 = at(pmBtc!, s + W), ps0 = at(pmSol!, s), ps1 = at(pmSol!, s + W);
      if (!pe0 || !pe1 || !pb0 || !pb1 || !ps0 || !ps1) continue;
      assetPct = (pe1 / pe0 - 1) * 100;
      asset2Pct = (pb1 / pb0 - 1) * 100;
      asset3Pct = (ps1 / ps0 - 1) * 100;
      benchPct = 0.10 * assetPct + 0.11 * asset2Pct + 0.44 * asset3Pct + 0.35 * BENCH_APR * (W / 365);
    } else if (bench === 'mix') {
      const pe0 = at(pmEth!, s), pe1 = at(pmEth!, s + W), pb0 = at(pmBtc!, s), pb1 = at(pmBtc!, s + W);
      if (!pe0 || !pe1 || !pb0 || !pb1) continue;
      assetPct = (pe1 / pe0 - 1) * 100;
      asset2Pct = (pb1 / pb0 - 1) * 100;
      benchPct = 0.3 * assetPct + 0.2 * asset2Pct + 0.5 * BENCH_APR * (W / 365);
    } else if (pm) {
      const p0 = at(pm, s), p1 = at(pm, s + W);
      if (!p0 || !p1) continue;
      assetPct = (p1 / p0 - 1) * 100;
      benchPct = 0.5 * assetPct + 0.5 * BENCH_APR * (W / 365);
    }
    const vaultPct = (v1 / v0 - 1) * 100;
    const regimeAsset = bench === 'mix3' ? asset3Pct : assetPct;
    const regime = hasPrices ? (regimeAsset > 10 ? 'up' : regimeAsset < -10 ? 'down' : 'flat') : 'n/a';
    wins.push({ start: s * DAY, year: new Date(s * DAY * 1000).getUTCFullYear(), regime, vaultPct, benchPct, edgePct: vaultPct - benchPct, assetPct, asset2Pct, asset3Pct });
  }
  if (!wins.length) { console.error('no windows'); process.exit(1); }
  const hdr = 'set'.padEnd(18) + 'wins'.padStart(5) + 'mean'.padStart(8) + 'med.'.padStart(8) + '%win'.padStart(7) + 'worst'.padStart(8) + 'best'.padStart(8) + '  | vault mean  bench mean';
  console.log(`EDGE = vault − bench [% per ${W}d window]`);
  console.log(hdr);
  const line = (name: string, ws: Win[]) => {
    const s = stat(ws.map((w) => w.edgePct));
    const va = ws.reduce((a, w) => a + w.vaultPct, 0) / ws.length, ba = ws.reduce((a, w) => a + w.benchPct, 0) / ws.length;
    console.log(name.padEnd(18) + String(s.windows).padStart(5) + pct(s.mean).padStart(8) + pct(s.med).padStart(8) + s.winPct.toFixed(0).padStart(6) + '%' + pct(s.worst).padStart(8) + pct(s.best).padStart(8) + `  | ${pct(va).padStart(8)}  ${pct(ba).padStart(8)}`);
    return s;
  };
  const all = line('ALL', wins);
  const byYear: any = {}, byRegime: any = {};
  for (const y of [...new Set(wins.map((w) => w.year))].sort()) byYear[y] = line(`  ${y}`, wins.filter((w) => w.year === y));
  if (hasPrices) for (const r of ['up', 'down', 'flat']) { const ws = wins.filter((w) => w.regime === r); if (ws.length) byRegime[r] = line(`  regime ${r}`, ws); }
  const rec = wins.filter((w) => w.start >= (d1 - 180) * DAY);
  const recent180 = rec.length ? line('  recent180', rec) : null;

  const vSeries = days.map((d) => at(vm, d)!);
  const vaultDD = maxDD(vSeries);
  const benchDD = bench === 'mix3'
    ? maxDD(days.map((d) => 0.10 * (at(pmEth!, d)! / at(pmEth!, d0)!) + 0.11 * (at(pmBtc!, d)! / at(pmBtc!, d0)!) + 0.44 * (at(pmSol!, d)! / at(pmSol!, d0)!) + 0.35 * (1 + BENCH_APR / 100 * ((d - d0) / 365))))
    : bench === 'mix'
    ? maxDD(days.map((d) => 0.3 * (at(pmEth!, d)! / at(pmEth!, d0)!) + 0.2 * (at(pmBtc!, d)! / at(pmBtc!, d0)!) + 0.5 * (1 + BENCH_APR / 100 * ((d - d0) / 365))))
    : pm ? maxDD(days.map((d) => 0.5 * (at(pm, d)! / at(pm, d0)!) + 0.5 * (1 + BENCH_APR / 100 * ((d - d0) / 365)))) : 0;
  const totVault = (at(vm, d1)! / at(vm, d0)! - 1) * 100;
  const annVault = ((at(vm, d1)! / at(vm, d0)!) ** (365 / (d1 - d0)) - 1) * 100;
  // regression over windows: vault% = α + β·asset%  (β = real exposure; α = beta-adjusted edge)
  let reg: { beta: number; alphaPct: number; alphaAnnPct: number; winAdj: number } | { betaEth: number; betaBtc: number; alphaPct: number; alphaAnnPct: number; winAdj: number } | { betaEth: number; betaBtc: number; betaSol: number; alphaPct: number; alphaAnnPct: number; winAdj: number } | null = null;
  if (bench === 'mix3' && wins.length >= 10) {
    // three-factor OLS: vault% = a + b1·ETH% + b2·BTC% + b3·SOL% — 4x4 normal equations, Gaussian elimination with pivoting
    const x1 = wins.map((w) => w.assetPct), x2 = wins.map((w) => w.asset2Pct), x3 = wins.map((w) => w.asset3Pct), y = wins.map((w) => w.vaultPct);
    const n = x1.length;
    const sum = (a: number[]) => a.reduce((p, v) => p + v, 0);
    const dot = (a: number[], b: number[]) => a.reduce((p, v, i) => p + v * b[i], 0);
    const M = [
      [n, sum(x1), sum(x2), sum(x3), sum(y)],
      [sum(x1), dot(x1, x1), dot(x1, x2), dot(x1, x3), dot(x1, y)],
      [sum(x2), dot(x1, x2), dot(x2, x2), dot(x2, x3), dot(x2, y)],
      [sum(x3), dot(x1, x3), dot(x2, x3), dot(x3, x3), dot(x3, y)],
    ];
    for (let col = 0; col < 4; col++) {
      let piv = col;
      for (let r = col + 1; r < 4; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      [M[col], M[piv]] = [M[piv], M[col]];
      for (let r = 0; r < 4; r++) {
        if (r === col) continue;
        const f = M[r][col] / M[col][col];
        for (let c = col; c < 5; c++) M[r][c] -= f * M[col][c];
      }
    }
    const a = M[0][4] / M[0][0], b1 = M[1][4] / M[1][1], b2 = M[2][4] / M[2][2], b3 = M[3][4] / M[3][3];
    const alphaPct = a - (1 - b1 - b2 - b3) * BENCH_APR * (W / 365);
    const adj = wins.map((w) => w.vaultPct - b1 * w.assetPct - b2 * w.asset2Pct - b3 * w.asset3Pct - (1 - b1 - b2 - b3) * BENCH_APR * (W / 365));
    const winAdj = (adj.filter((v) => v > 0).length / adj.length) * 100;
    reg = { betaEth: b1, betaBtc: b2, betaSol: b3, alphaPct, alphaAnnPct: alphaPct * (365 / W), winAdj };
    console.log(`\n3-factor REGRESSION: βETH = ${b1.toFixed(2)} · βBTC = ${b2.toFixed(2)} · βSOL = ${b3.toFixed(2)} · α = ${pct(alphaPct)}%/window ≈ ${pct(reg.alphaAnnPct)}%/yr · beta-adjusted %win ${winAdj.toFixed(0)}%`);
  } else if (bench === 'mix' && wins.length >= 8) {
    // two-factor OLS: vault% = a + b1·ETH% + b2·BTC% — 3x3 normal equations, Gaussian elimination (no libraries)
    const x1 = wins.map((w) => w.assetPct), x2 = wins.map((w) => w.asset2Pct), y = wins.map((w) => w.vaultPct);
    const n = x1.length;
    const sum = (a: number[]) => a.reduce((p, v) => p + v, 0);
    const dot = (a: number[], b: number[]) => a.reduce((p, v, i) => p + v * b[i], 0);
    const M = [
      [n, sum(x1), sum(x2), sum(y)],
      [sum(x1), dot(x1, x1), dot(x1, x2), dot(x1, y)],
      [sum(x2), dot(x1, x2), dot(x2, x2), dot(x2, y)],
    ];
    for (let col = 0; col < 3; col++) {
      let piv = col;
      for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      [M[col], M[piv]] = [M[piv], M[col]];
      for (let r = 0; r < 3; r++) {
        if (r === col) continue;
        const f = M[r][col] / M[col][col];
        for (let c = col; c < 4; c++) M[r][c] -= f * M[col][c];
      }
    }
    const a = M[0][3] / M[0][0], b1 = M[1][3] / M[1][1], b2 = M[2][3] / M[2][2];
    const alphaPct = a - (1 - b1 - b2) * BENCH_APR * (W / 365);
    const adj = wins.map((w) => w.vaultPct - b1 * w.assetPct - b2 * w.asset2Pct - (1 - b1 - b2) * BENCH_APR * (W / 365));
    const winAdj = (adj.filter((v) => v > 0).length / adj.length) * 100;
    reg = { betaEth: b1, betaBtc: b2, alphaPct, alphaAnnPct: alphaPct * (365 / W), winAdj };
    console.log(`\n2-factor REGRESSION: βETH = ${b1.toFixed(2)} · βBTC = ${b2.toFixed(2)} · α = ${pct(alphaPct)}%/window ≈ ${pct(reg.alphaAnnPct)}%/yr · beta-adjusted %win ${winAdj.toFixed(0)}%`);
  } else if (pm && wins.length >= 8) {
    const xs = wins.map((w) => w.assetPct), ys = wins.map((w) => w.vaultPct);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const beta = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const adj = wins.map((w) => w.vaultPct - beta * w.assetPct - (1 - beta) * BENCH_APR * (W / 365));
    const alphaPct = adj.reduce((a, b) => a + b, 0) / adj.length;
    reg = { beta, alphaPct, alphaAnnPct: alphaPct * (365 / W), winAdj: (adj.filter((v) => v > 0).length / adj.length) * 100 };
    console.log(`\nREGRESSION over windows: β = ${beta.toFixed(2)} (bench assumes 0.50) · α = ${pct(alphaPct)}%/window ≈ ${pct(reg.alphaAnnPct)}%/yr above HODL with the same beta · beta-adjusted %win ${reg.winAdj.toFixed(0)}%`);
  }
  console.log(`\nWhole period: vault ${pct(totVault)}% (${pct(annVault)}%/yr) · vault maxDD ${vaultDD.toFixed(1)}% vs basket ${benchDD.toFixed(1)}%`);
  console.log(`CRITERION E8.2: %win ≥ 65, worst > −5 (90d), edge > 0 in ≥2 regimes, vault maxDD < basket maxDD.`);
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `e8-house-${vault.name}-${bench}-${W}d${CUT_AFTER !== null ? '-cut' : ''}.json`);
  fs.writeFileSync(out, JSON.stringify({ file, bench, W, step, BENCH_APR, SPAN_DAYS, CUT_AFTER: process.env.CUT_AFTER ?? null, reg, all, byYear, byRegime, recent180, totVault, annVault, vaultDD, benchDD, perWindow: wins }, null, 2));
  console.log(`→ ${out}`);
})();
