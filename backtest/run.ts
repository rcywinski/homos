/**
 * run.ts — uruchamia wszystkie strategie na danych z data/cache i generuje raport.
 *   npx tsx backtest/run.ts                      # wszystkie pule z cache
 *   npx tsx backtest/run.ts mainnet-usdc-weth-005
 * Wyniki: backtest/results/<id>.json + backtest/results/report.html
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { SwapEv, PoolSpec, runStrategy, RunResult } from './engine';
import { ALL_STRATEGIES } from './strategies';

const CACHE = path.join(__dirname, '..', 'data', 'cache');
const OUT = path.join(__dirname, 'results');

const TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };
const GAS_USD: Record<string, number> = { mainnet: 8, base: 0.08 };

const START_CAPITAL_USD = 10_000;

async function loadPool(id: string): Promise<{ swaps: SwapEv[]; spec: PoolSpec } | null> {
  const metaPath = path.join(CACHE, `${id}.meta.json`);
  const dataPath = path.join(CACHE, `${id}.ndjson`);
  if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const cfg = meta.cfg;
  const anchors: Array<{ block: number; ts: number }> = meta.anchors;

  const tsForBlock = (b: number): number => {
    let i = 0;
    while (i < anchors.length - 2 && anchors[i + 1].block < b) i++;
    const a = anchors[i];
    const c = anchors[i + 1];
    return a.ts + ((b - a.block) / (c.block - a.block)) * (c.ts - a.ts);
  };

  const spec: PoolSpec = {
    id,
    feeRate: cfg.feeBps / 1_000_000,
    ethIsToken0: cfg.ethIsToken0,
    d0: cfg.token0Decimals,
    d1: cfg.token1Decimals,
    tickSpacing: TICK_SPACING[cfg.feeBps],
    gasUsdPerRebalance: GAS_USD[cfg.chain],
    slippageBps: 5,
  };

  const swaps: SwapEv[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(dataPath) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    swaps.push({
      b: j.b,
      ts: tsForBlock(j.b),
      a0: Number(BigInt(j.a0)) / 10 ** spec.d0,
      a1: Number(BigInt(j.a1)) / 10 ** spec.d1,
      sqrtP: Number(BigInt(j.sp)) / 2 ** 96,
      L: Number(BigInt(j.L)),
      t: j.t,
    });
  }
  swaps.sort((a, b) => a.b - b.b);
  // dedup (resume może zdublować ostatni chunk)
  const seen = new Set<string>();
  const dedup = swaps.filter((s) => {
    const k = `${s.b}-${s.a0}-${s.a1}-${s.t}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { swaps: dedup, spec };
}

const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

function svgChart(results: RunResult[], w = 900, h = 320): string {
  const all = results.flatMap((r) => r.equity);
  if (!all.length) return '';
  const t0 = Math.min(...all.map((e) => e.ts));
  const t1 = Math.max(...all.map((e) => e.ts));
  const v0 = Math.min(...all.map((e) => e.usd));
  const v1 = Math.max(...all.map((e) => e.usd));
  const colors = ['#888', '#1a6ae0', '#7c4dff', '#e05252', '#e0a01a', '#0a7d33', '#00acc1', '#c2185b'];
  const lines = results
    .map((r, i) => {
      const pts = r.equity
        .map((e) => `${(((e.ts - t0) / (t1 - t0)) * w).toFixed(1)},${(h - ((e.usd - v0) / (v1 - v0)) * h).toFixed(1)}`)
        .join(' ');
      return `<polyline fill="none" stroke="${colors[i % colors.length]}" stroke-width="1.5" points="${pts}"/>`;
    })
    .join('\n');
  const legend = results
    .map(
      (r, i) =>
        `<div style="display:inline-block;margin-right:16px"><span style="color:${colors[i % colors.length]}">■</span> ${r.name}</div>`
    )
    .join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;background:#fafafa;border:1px solid #eee">${lines}</svg><div style="font-size:12px">${legend}</div>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2];
  const ids = fs
    .readdirSync(CACHE)
    .filter((f) => f.endsWith('.meta.json'))
    .map((f) => f.replace('.meta.json', ''))
    .filter((id) => !only || id === only);

  let html = `<html><head><meta charset="utf-8"><title>HOMOS backtest</title>
  <style>body{font-family:system-ui;margin:24px;max-width:1000px}table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{padding:6px 10px;border-bottom:1px solid #eee;text-align:right}th{color:#666}td:first-child,th:first-child{text-align:left}
  .pos{color:#0a7d33}.neg{color:#c62828}h2{margin-top:40px}</style></head><body><h1>HOMOS — raport backtestu</h1>
  <p>Kapitał startowy: $${fmt(START_CAPITAL_USD, 0)} · wygenerowano: ${new Date().toISOString()}</p>`;

  for (const id of ids) {
    const loaded = await loadPool(id);
    if (!loaded || loaded.swaps.length < 100) {
      console.log(`[${id}] brak danych lub za mało swapów — pomijam`);
      continue;
    }
    const { swaps, spec } = loaded;
    const days = (swaps[swaps.length - 1].ts - swaps[0].ts) / 86400;
    console.log(`\n=== ${id} — ${swaps.length} swapów, ${days.toFixed(1)} dni ===`);

    const results: RunResult[] = [];
    for (const strat of ALL_STRATEGIES) {
      const r = runStrategy(swaps, spec, strat, START_CAPITAL_USD);
      results.push(r);
    }
    const hodl = results.find((r) => r.name === 'HODL 50/50')!;
    for (const r of results) r.vsHodlPct = ((r.finalUsd / hodl.finalUsd) - 1) * 100;

    console.log(
      'strategia'.padEnd(42) +
        'końcowa'.padStart(11) +
        'APR%'.padStart(9) +
        'vsHODL%'.padStart(9) +
        'maxDD%'.padStart(8) +
        'fees$'.padStart(9) +
        'gas$'.padStart(7) +
        'reb'.padStart(5) +
        'inRng%'.padStart(8)
    );
    for (const r of results) {
      console.log(
        r.name.padEnd(42) +
          fmt(r.finalUsd, 0).padStart(11) +
          fmt(r.aprPct, 1).padStart(9) +
          fmt(r.vsHodlPct, 2).padStart(9) +
          fmt(r.maxDrawdownPct, 1).padStart(8) +
          fmt(r.feesUsd, 0).padStart(9) +
          fmt(r.gasUsd, 0).padStart(7) +
          String(r.rebalances).padStart(5) +
          fmt(r.inRangePct, 0).padStart(8)
      );
    }

    fs.writeFileSync(
      path.join(OUT, `${id}.json`),
      JSON.stringify({ id, days, swapCount: swaps.length, results: results.map(({ equity, ...r }) => r) }, null, 2)
    );

    html += `<h2>${id}</h2><p>${swaps.length.toLocaleString()} swapów · ${days.toFixed(1)} dni · fee ${spec.feeRate * 100}% · gas/rebalans $${spec.gasUsdPerRebalance}</p>`;
    html += svgChart(results);
    html += `<table><tr><th>Strategia</th><th>Końcowa $</th><th>APR %</th><th>vs HODL %</th><th>maxDD %</th><th>Fees $</th><th>Gas $</th><th>Swap koszt $</th><th>Rebalanse</th><th>In-range %</th></tr>`;
    for (const r of results) {
      const cls = r.vsHodlPct >= 0 ? 'pos' : 'neg';
      html += `<tr><td>${r.name}</td><td>${fmt(r.finalUsd, 0)}</td><td>${fmt(r.aprPct, 1)}</td><td class="${cls}">${fmt(r.vsHodlPct, 2)}</td><td>${fmt(r.maxDrawdownPct, 1)}</td><td>${fmt(r.feesUsd, 0)}</td><td>${fmt(r.gasUsd, 2)}</td><td>${fmt(r.swapCostUsd, 2)}</td><td>${r.rebalances}</td><td>${fmt(r.inRangePct, 0)}</td></tr>`;
    }
    html += '</table>';
  }
  html += '</body></html>';
  fs.writeFileSync(path.join(OUT, 'report.html'), html);
  console.log(`\nRaport: backtest/results/report.html`);
})();
