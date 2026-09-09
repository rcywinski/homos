/**
 * e8-house.ts — E8.2 „DOM KASYNA": czy bycie kontrpartnerem traderów
 * (HLP / GM pools) bije HODL koszyka i nudny USDC — bramką jak zawsze.
 *
 *   npx tsx backtest/e8-house.ts data/vaults/HLP.json usdc [W=30] [step=15]
 *   npx tsx backtest/e8-house.ts data/vaults/GM-ETH-USD.json eth50 90 30
 *   npx tsx backtest/e8-house.ts data/vaults/GM-BTC-USD.json btc50 90 30
 *   npx tsx backtest/e8-house.ts data/vaults/GLP.json mix 90 30
 *
 * Benchmark (2. argument):
 *   usdc  — 100% USDC na BENCH_APR (HLP jest ~neutralny rynkowo)
 *   eth50 — HODL 50% ETH / 50% USDC (backing GM ETH/USD; USDC na BENCH_APR)
 *   btc50 — HODL 50% BTC / 50% USDC
 *   mix   — HODL 30% ETH / 20% BTC / 50% USDC (koszyk nominalny GLP/JLP:
 *           stable ~50%, reszta ETH+BTC) — jedyny bench z regresją
 *           DWUCZYNNIKOWĄ (patrz niżej), bo jednoczynnikowa na samym ETH
 *           zapisuje ruch BTC jako fałszywą alfę (lekcja 08.09: GLP
 *           „+7%/r" na eth50 był w całości przeciekiem bety BTC).
 * Ceny ETH/BTC: coins.llama (cache data/llama/prices, jak wide-daily).
 * ENV: BENCH_APR=4.5 (z E8.0), OFFLINE=1, SPAN_DAYS=1100 (zasięg cen
 * coins.llama — dla serii sprzed 09.2023 ustaw np. 1500), CUT_AFTER=YYYY-MM-DD
 * (odrzuć punkty PO tej dacie — np. hack GLP 2025-07-09: osobno "klasa w
 * normalnych warunkach", osobno "z ogonem").
 * REGRESJA po oknach: vault% = α + β·asset% → β = realna ekspozycja (dla
 * koszyków mieszanych jak GLP sztywne 50/50 nie jest uczciwe), α = edge
 * po korekcie bety. Dla `mix`: dwuczynnikowa vault% = α + βETH·ETH% +
 * βBTC·BTC% (równania normalne, eliminacja Gaussa), α liczone tak, żeby
 * przy βETH+βBTC=1 zredukować się do zwykłej różnicy vs HODL.
 *
 * Per okno [s, s+W): vault% = v(s+W)/v(s) − 1; bench% analogicznie
 * (koszyk rebalansowany raz, na starcie okna — jak HODL 50/50 w silniku);
 * edge% = vault% − bench%. Statystyki: śr/med/%wygr/worst per rok + reżim
 * (zmiana ceny aktywa w oknie: up > +10%, down < −10%, flat) + recent180
 * + max drawdown vaultu (ogon „gracz rozbił bank").
 * KRYTERIUM E8.2: %wygr ≥ 65 vs koszyk, worst edge > −5 (90d), dodatni
 * edge w ≥2 reżimach, maxDD vaultu < maxDD koszyka. Zapis:
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
    const SPAN = SPAN_DAYS, startAll = dayOf(Date.now() / 1000) * DAY - SPAN * DAY;
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
  const bench = (process.argv[3] || 'usdc') as 'usdc' | 'eth50' | 'btc50' | 'mix';
  const W = Number(process.argv[4] || 30);
  const step = Number(process.argv[5] || 15);
  if (!file) { console.error('użycie: e8-house.ts <data/vaults/X.json> usdc|eth50|btc50|mix [W] [step]'); process.exit(1); }
  const vault = JSON.parse(fs.readFileSync(file, 'utf8')) as { name: string; series: { t: number; v: number }[] };
  const vm = new Map<number, number>();
  for (const x of vault.series) { const d = dayOf(x.t / 1000); if (CUT_AFTER === null || d <= CUT_AFTER) vm.set(d, x.v); }
  const asset = bench === 'eth50' ? 'coingecko:ethereum' : bench === 'btc50' ? 'coingecko:bitcoin' : null;
  const pm = asset ? await loadPrices(asset) : null;
  const pmEth = bench === 'mix' ? await loadPrices('coingecko:ethereum') : null;
  const pmBtc = bench === 'mix' ? await loadPrices('coingecko:bitcoin') : null;
  const hasPrices = pm !== null || bench === 'mix';
  const days = [...vm.keys()].sort((a, b) => a - b).filter((d) => (!pm || pm.has(d)) && (!pmEth || pmEth.has(d)) && (!pmBtc || pmBtc.has(d)));
  if (days.length < W + 1) { console.error(`za mało dni wspólnych (${days.length})`); process.exit(1); }
  const d0 = days[0], d1 = days[days.length - 1];
  console.log(`${vault.name}: ${days.length} dni (${new Date(d0 * DAY * 1000).toISOString().slice(0, 10)} → ${new Date(d1 * DAY * 1000).toISOString().slice(0, 10)}) · bench ${bench} · BENCH_APR ${BENCH_APR}% · okna ${W}d co ${step}d${CUT_AFTER !== null ? ` · CUT_AFTER ${process.env.CUT_AFTER}` : ''}${hasPrices && days.length < vm.size * 0.9 ? ' · ⚠ ceny pokrywają tylko część serii vaultu — zwiększ SPAN_DAYS' : ''}\n`);

  const at = (m: Map<number, number>, d: number) => m.get(d) ?? m.get(d - 1) ?? m.get(d + 1);
  type Win = { start: number; year: number; regime: string; vaultPct: number; benchPct: number; edgePct: number; assetPct: number; asset2Pct: number };
  const wins: Win[] = [];
  for (let s = d0; s + W <= d1; s += step) {
    const v0 = at(vm, s), v1 = at(vm, s + W);
    if (!v0 || !v1) continue;
    let assetPct = 0, asset2Pct = 0, benchPct = BENCH_APR * (W / 365);
    if (bench === 'mix') {
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
    const regime = hasPrices ? (assetPct > 10 ? 'up' : assetPct < -10 ? 'down' : 'flat') : 'n/a';
    wins.push({ start: s * DAY, year: new Date(s * DAY * 1000).getUTCFullYear(), regime, vaultPct, benchPct, edgePct: vaultPct - benchPct, assetPct, asset2Pct });
  }
  if (!wins.length) { console.error('brak okien'); process.exit(1); }
  const hdr = 'zbiór'.padEnd(18) + 'okna'.padStart(5) + 'śr.'.padStart(8) + 'med.'.padStart(8) + '%wygr'.padStart(7) + 'worst'.padStart(8) + 'best'.padStart(8) + '  | vault śr.  bench śr.';
  console.log(`EDGE = vault − bench [% na okno ${W}d]`);
  console.log(hdr);
  const line = (name: string, ws: Win[]) => {
    const s = stat(ws.map((w) => w.edgePct));
    const va = ws.reduce((a, w) => a + w.vaultPct, 0) / ws.length, ba = ws.reduce((a, w) => a + w.benchPct, 0) / ws.length;
    console.log(name.padEnd(18) + String(s.windows).padStart(5) + pct(s.mean).padStart(8) + pct(s.med).padStart(8) + s.winPct.toFixed(0).padStart(6) + '%' + pct(s.worst).padStart(8) + pct(s.best).padStart(8) + `  | ${pct(va).padStart(8)}  ${pct(ba).padStart(8)}`);
    return s;
  };
  const all = line('WSZYSTKIE', wins);
  const byYear: any = {}, byRegime: any = {};
  for (const y of [...new Set(wins.map((w) => w.year))].sort()) byYear[y] = line(`  ${y}`, wins.filter((w) => w.year === y));
  if (hasPrices) for (const r of ['up', 'down', 'flat']) { const ws = wins.filter((w) => w.regime === r); if (ws.length) byRegime[r] = line(`  reżim ${r}`, ws); }
  const rec = wins.filter((w) => w.start >= (d1 - 180) * DAY);
  const recent180 = rec.length ? line('  recent180', rec) : null;

  const vSeries = days.map((d) => at(vm, d)!);
  const vaultDD = maxDD(vSeries);
  const benchDD = bench === 'mix'
    ? maxDD(days.map((d) => 0.3 * (at(pmEth!, d)! / at(pmEth!, d0)!) + 0.2 * (at(pmBtc!, d)! / at(pmBtc!, d0)!) + 0.5 * (1 + BENCH_APR / 100 * ((d - d0) / 365))))
    : pm ? maxDD(days.map((d) => 0.5 * (at(pm, d)! / at(pm, d0)!) + 0.5 * (1 + BENCH_APR / 100 * ((d - d0) / 365)))) : 0;
  const totVault = (at(vm, d1)! / at(vm, d0)! - 1) * 100;
  const annVault = ((at(vm, d1)! / at(vm, d0)!) ** (365 / (d1 - d0)) - 1) * 100;
  // regresja po oknach: vault% = α + β·asset%  (β = realna ekspozycja; α = edge po korekcie bety)
  let reg: { beta: number; alphaPct: number; alphaAnnPct: number; winAdj: number } | { betaEth: number; betaBtc: number; alphaPct: number; alphaAnnPct: number; winAdj: number } | null = null;
  if (bench === 'mix' && wins.length >= 8) {
    // OLS dwuczynnikowa: vault% = a + b1·ETH% + b2·BTC% — równania normalne 3×3, eliminacja Gaussa (bez bibliotek)
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
    console.log(`\nREGRESJA 2-czynnikowa: βETH = ${b1.toFixed(2)} · βBTC = ${b2.toFixed(2)} · α = ${pct(alphaPct)}%/okno ≈ ${pct(reg.alphaAnnPct)}%/r · %wygr po korekcie ${winAdj.toFixed(0)}%`);
  } else if (pm && wins.length >= 8) {
    const xs = wins.map((w) => w.assetPct), ys = wins.map((w) => w.vaultPct);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const beta = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const adj = wins.map((w) => w.vaultPct - beta * w.assetPct - (1 - beta) * BENCH_APR * (W / 365));
    const alphaPct = adj.reduce((a, b) => a + b, 0) / adj.length;
    reg = { beta, alphaPct, alphaAnnPct: alphaPct * (365 / W), winAdj: (adj.filter((v) => v > 0).length / adj.length) * 100 };
    console.log(`\nREGRESJA po oknach: β = ${beta.toFixed(2)} (bench zakłada 0.50) · α = ${pct(alphaPct)}%/okno ≈ ${pct(reg.alphaAnnPct)}%/r ponad HODL o tej samej becie · %wygr po korekcie ${reg.winAdj.toFixed(0)}%`);
  }
  console.log(`\nCały okres: vault ${pct(totVault)}% (${pct(annVault)}%/r) · maxDD vault ${vaultDD.toFixed(1)}% vs koszyk ${benchDD.toFixed(1)}%`);
  console.log(`KRYTERIUM E8.2: %wygr ≥ 65, worst > −5 (90d), edge > 0 w ≥2 reżimach, maxDD vault < maxDD koszyka.`);
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `e8-house-${vault.name}-${bench}-${W}d${CUT_AFTER !== null ? '-cut' : ''}.json`);
  fs.writeFileSync(out, JSON.stringify({ file, bench, W, step, BENCH_APR, SPAN_DAYS, CUT_AFTER: process.env.CUT_AFTER ?? null, reg, all, byYear, byRegime, recent180, totVault, annVault, vaultDD, benchDD, perWindow: wins }, null, 2));
  console.log(`→ ${out}`);
})();
