/**
 * e8-timing.ts — E8.3 LP TIMING BY VOLATILITY (LP = short gamma).
 *
 * Thesis: an LP earns fees (which rise in a storm) and loses ~σ²_realized/8.
 * If, after a volatility spike, the market calms down faster than fees fall,
 * then windows starting "after the storm" may be the only ones where LP > HODL.
 *
 * Nothing is recomputed: it takes `perWindow` from walkforward-*.json
 * (requires a walkforward.ts run from after 07.09 — the perWindow field) and
 * tags each window with the STATE AT ENTRY:
 *   RV7, RV30  — realized volatility (annualized %, from daily coins.llama
 *                prices: ETH/USD for ETH-stable, ETH/BTC for cbBTC)
 *   DVOL       — Deribit implied vol (data/dvol/ETH.json or BTC.json;
 *                for ETH/BTC we use ETH DVOL as a proxy — labelled as such)
 *   VRP        — DVOL − RV30 (volatility risk premium: > 0 = the market pays
 *                more for insurance than it realizes)
 *   SHOCK      — RV7 / RV30 (> 1.3 = "fresh after a storm", < 0.8 = calm)
 * and computes vsHODL statistics per BUCKET (DVOL terciles; VRP>0 / ≤0;
 * SHOCK>1.3 / 0.8–1.3 / <0.8) per strategy, per pool and AGGREGATED.
 *
 *   npx tsx backtest/e8-timing.ts base-weth-usdc-030-720d base-cbbtc-weth-005-720d mainnet-usdc-weth-005-720d arbitrum-weth-usdc-005-720d
 *   (arguments = walkforward ids as in the file name results/walkforward-<id>-30d.json)
 * ENV: WF_DAYS=30 (window), STRATS="Pasywny ±50%,Pasywny ±40%" (filter on
 * strategy names as stored in the file; default: all from the file), OFFLINE=1 (price cache only).
 *
 * CRITERION E8.3: there exists a bucket in which, AGGREGATED (≥3/4 pools, ≥10
 * windows per pool), mean vsHODL > 0 and %win ≥ 65 — and that same bucket is
 * NOT the worst by worst. Then it is a candidate entry filter; otherwise close.
 * Written to: backtest/results/e8-timing-<WF_DAYS>d.json
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'results');
const PRICES = path.join(ROOT, 'data', 'llama', 'prices');
const DVOL_DIR = path.join(ROOT, 'data', 'dvol');
const DAY = 86400;
const WF_DAYS = Number(process.env.WF_DAYS || 30);
const SPAN_DAYS = 1100;
const OFFLINE = process.env.OFFLINE === '1';
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
/** daily USD prices (coins.llama, coingecko:* key), cached as in wide-daily (500 pts/request) */
async function loadPrices(key: string): Promise<Map<number, number>> {
  fs.mkdirSync(PRICES, { recursive: true });
  const f = path.join(PRICES, `${key.replace(':', '_')}.json`);
  const today = dayOf(Date.now() / 1000);
  let series: { t: number; p: number }[] | null = null;
  const cached = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  if (cached && (cached.day === today || OFFLINE)) series = cached.series;
  if (!series) {
    const startAll = dayOf(Date.now() / 1000) * DAY + DAY / 2 - SPAN_DAYS * DAY;
    const acc: { t: number; p: number }[] = [];
    for (let off = 0; off < SPAN_DAYS; off += 500) {
      const span = Math.min(500, SPAN_DAYS - off);
      const j = await fetchJson(`https://coins.llama.fi/chart/${key}?start=${startAll + off * DAY}&span=${span}&period=1d`);
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
/** annualized realized vol % from N daily log-returns ending on day d (exclusive) */
function rv(prices: Map<number, number>, d: number, n: number): number | null {
  const rets: number[] = [];
  for (let i = d - n; i < d; i++) {
    const a = prices.get(i - 1), b = prices.get(i);
    if (a && b) rets.push(Math.log(b / a));
  }
  if (rets.length < Math.max(3, n * 0.7)) return null;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const v = rets.reduce((s, x) => s + (x - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(v) * Math.sqrt(365) * 100;
}
function loadDvol(ccy: string): Map<number, number> {
  const f = path.join(DVOL_DIR, `${ccy}.json`);
  const m = new Map<number, number>();
  if (!fs.existsSync(f)) return m;
  for (const r of JSON.parse(fs.readFileSync(f, 'utf8')) as { t: number; c: number }[]) m.set(dayOf(r.t / 1000), r.c);
  return m;
}
function stat(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  return { mean: vals.reduce((a, b) => a + b, 0) / vals.length, med: s[s.length >> 1], winPct: (vals.filter((v) => v > 0).length / vals.length) * 100, worst: s[0], best: s[s.length - 1], windows: vals.length };
}
/** pair → price series for RV + DVOL currency */
function assetFor(id: string): { keys: [string, string | null]; dvol: string; label: string } {
  const isBtcPair = /cbbtc|wbtc|tbtc/.test(id);
  const isEth = /weth|eth/.test(id);
  if (isBtcPair && isEth) return { keys: ['coingecko:ethereum', 'coingecko:bitcoin'], dvol: 'ETH', label: 'ETH/BTC (DVOL ETH = proxy)' };
  if (isBtcPair) return { keys: ['coingecko:bitcoin', null], dvol: 'BTC', label: 'BTC/USD' };
  return { keys: ['coingecko:ethereum', null], dvol: 'ETH', label: 'ETH/USD' };
}

type Tagged = { pool: string; strat: string; v: number; regime: string; start: number; rv7: number; rv30: number; dvol: number | null; vrp: number | null; shock: number };

(async () => {
  const ids = process.argv.slice(2);
  if (!ids.length) { console.error('pass walkforward ids (e.g. base-weth-usdc-030-720d)'); process.exit(1); }
  const stratFilter = process.env.STRATS ? process.env.STRATS.split(',').map((s) => s.trim()) : null;
  const priceCache = new Map<string, Map<number, number>>();
  const getP = async (k: string) => { if (!priceCache.has(k)) priceCache.set(k, await loadPrices(k)); return priceCache.get(k)!; };
  const tagged: Tagged[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const f = path.join(OUT, `walkforward-${id}-${WF_DAYS}d.json`);
    if (!fs.existsSync(f)) { missing.push(`${id}: missing file ${path.basename(f)}`); continue; }
    const wf = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!wf.perWindow) { missing.push(`${id}: file without perWindow — rerun walkforward.ts (version ≥ 07.09)`); continue; }
    const a = assetFor(id);
    const p0 = await getP(a.keys[0]);
    const p1 = a.keys[1] ? await getP(a.keys[1]) : null;
    const series = new Map<number, number>();
    for (const [d, p] of p0) { if (!p1) series.set(d, p); else { const q = p1.get(d); if (q) series.set(d, p / q); } }
    const dv = loadDvol(a.dvol);
    let nTag = 0, nSkip = 0;
    for (const [strat, entries] of Object.entries(wf.perWindow as Record<string, Array<{ v: number; regime: string; start: number }>>)) {
      if (stratFilter && !stratFilter.includes(strat)) continue;
      for (const e of entries) {
        const d = dayOf(e.start);
        const rv7 = rv(series, d, 7), rv30 = rv(series, d, 30);
        if (rv7 === null || rv30 === null) { nSkip++; continue; }
        const dvol = dv.get(d) ?? dv.get(d - 1) ?? null;
        tagged.push({ pool: id, strat, v: e.v, regime: e.regime, start: e.start, rv7, rv30, dvol, vrp: dvol === null ? null : dvol - rv30, shock: rv7 / rv30 });
        nTag++;
      }
    }
    console.log(`${id}: ${a.label} · tagged ${nTag}, skipped (no prices) ${nSkip}, DVOL days ${dv.size}`);
  }
  for (const m of missing) console.log(`⚠ ${m}`);
  if (!tagged.length) { console.error('nothing to compute'); process.exit(1); }

  // buckets
  const dvols = tagged.filter((t) => t.dvol !== null).map((t) => t.dvol!).sort((a, b) => a - b);
  const q = (p: number) => dvols[Math.min(Math.floor(p * dvols.length), dvols.length - 1)];
  const dvT1 = dvols.length ? q(1 / 3) : NaN, dvT2 = dvols.length ? q(2 / 3) : NaN;
  const buckets: Array<{ name: string; test: (t: Tagged) => boolean }> = [
    { name: 'ALL', test: () => true },
    { name: 'DVOL low (T1)', test: (t) => t.dvol !== null && t.dvol <= dvT1 },
    { name: 'DVOL mid (T2)', test: (t) => t.dvol !== null && t.dvol > dvT1 && t.dvol <= dvT2 },
    { name: 'DVOL high (T3)', test: (t) => t.dvol !== null && t.dvol > dvT2 },
    { name: 'VRP > 0 (IV>RV30)', test: (t) => t.vrp !== null && t.vrp > 0 },
    { name: 'VRP ≤ 0', test: (t) => t.vrp !== null && t.vrp <= 0 },
    { name: 'VRP > +10pp', test: (t) => t.vrp !== null && t.vrp > 10 },
    { name: 'SHOCK after storm (RV7/RV30>1.3)', test: (t) => t.shock > 1.3 },
    { name: 'SHOCK neutral (0.8–1.3)', test: (t) => t.shock >= 0.8 && t.shock <= 1.3 },
    { name: 'SHOCK calm (<0.8)', test: (t) => t.shock < 0.8 },
    { name: 'RV30 low (<50%)', test: (t) => t.rv30 < 50 },
    { name: 'RV30 high (≥70%)', test: (t) => t.rv30 >= 70 },
  ];
  console.log(`\nDVOL terciles: ≤${dvT1?.toFixed(1)} / ≤${dvT2?.toFixed(1)} · windows ${WF_DAYS}d · vsHODL % per window\n`);

  const strats = [...new Set(tagged.map((t) => t.strat))];
  const pools = [...new Set(tagged.map((t) => t.pool))];
  const result: any = { WF_DAYS, ids, dvT1, dvT2, byStrat: {} };
  const hdr = 'bucket'.padEnd(32) + 'wins'.padStart(5) + 'pools'.padStart(5) + 'mean'.padStart(8) + 'med.'.padStart(8) + '%win'.padStart(7) + 'worst'.padStart(8) + 'best'.padStart(8) + '  pools w/ mean>0';
  for (const strat of strats) {
    console.log(`━━ ${strat}`);
    console.log(hdr);
    result.byStrat[strat] = {};
    for (const b of buckets) {
      const es = tagged.filter((t) => t.strat === strat && b.test(t));
      if (es.length < 5) continue;
      const s = stat(es.map((e) => e.v));
      const perPool = pools.map((p) => { const x = es.filter((e) => e.pool === p); return x.length >= 5 ? { pool: p, ...stat(x.map((e) => e.v)) } : null; }).filter(Boolean) as any[];
      const posPools = perPool.filter((p) => p.mean > 0).length;
      const flag = s.mean > 0 && s.winPct >= 65 && posPools >= Math.min(3, pools.length) ? ' ◀ CANDIDATE' : '';
      console.log(b.name.padEnd(32) + String(s.windows).padStart(5) + String(perPool.length).padStart(5) + pct(s.mean).padStart(8) + pct(s.med).padStart(8) + s.winPct.toFixed(0).padStart(6) + '%' + pct(s.worst).padStart(8) + pct(s.best).padStart(8) + `  ${posPools}/${perPool.length}` + flag);
      result.byStrat[strat][b.name] = { ...s, perPool, posPools };
    }
    console.log('');
  }
  // simple correlation: vsHODL vs VRP and vs SHOCK (aggregated, for the "Pasywny ±50%" strategy key if present)
  const corr = (xs: number[], ys: number[]) => { const n = xs.length; const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
  const ref = strats.find((s) => /Pasywny ±50%/.test(s)) ?? strats[0]; // strategy-name key (data contract, kept as-is)
  const es = tagged.filter((t) => t.strat === ref && t.vrp !== null);
  if (es.length > 10) console.log(`Correlation (${ref}, n=${es.length}): vsHODL~VRP ${corr(es.map((e) => e.vrp!), es.map((e) => e.v)).toFixed(2)} · vsHODL~SHOCK ${corr(es.map((e) => e.shock), es.map((e) => e.v)).toFixed(2)} · vsHODL~DVOL ${corr(es.map((e) => e.dvol!), es.map((e) => e.v)).toFixed(2)}`);
  console.log('\nCRITERION E8.3: a bucket ◀ CANDIDATE on ≥3/4 pools, %win ≥ 65, and not the worst by worst — otherwise close.');
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `e8-timing-${WF_DAYS}d.json`);
  fs.writeFileSync(out, JSON.stringify({ ...result, tagged }, null, 2));
  console.log(`→ ${out}`);
})();
