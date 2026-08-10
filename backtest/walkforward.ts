/**
 * walkforward.ts — test odporności strategii na przesuwanych oknach.
 *   npx tsx backtest/walkforward.ts <pool-id> [windowDays=30] [stepDays=15]
 *
 * Zamiast jednego przebiegu 90 dni (wynik zdominowany przez 1-3 decyzje
 * rebalansu) tniemy historię na nakładające się okna i mierzymy rozkład:
 * średnia/mediana vsHODL, % okien wygranych, najgorsze okno. Strategia jest
 * "prawidłowa" dopiero gdy wygrywa w WIĘKSZOŚCI okien, nie w jednym przebiegu.
 * Gotowe na dane 365d (po refetchu base-030 z days=365).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { SwapEv, PoolSpec, runStrategy, Strategy } from './engine';
import { hodl5050, passiveWide, fixedNaive, volAdaptive } from './strategies';

const CACHE = path.join(__dirname, '..', 'data', 'cache');
const OUT = path.join(__dirname, 'results');
const TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };
const GAS_USD: Record<string, number> = { mainnet: 8, base: 0.08 };

async function loadPool(id: string) {
  const meta = JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.meta.json`), 'utf8'));
  const cfg = meta.cfg;
  const anchors: Array<{ block: number; ts: number }> = meta.anchors;
  const tsFor = (b: number) => {
    let i = 0;
    while (i < anchors.length - 2 && anchors[i + 1].block < b) i++;
    const a = anchors[i], c = anchors[i + 1];
    return a.ts + ((b - a.block) / (c.block - a.block)) * (c.ts - a.ts);
  };
  const spec: PoolSpec = {
    id, feeRate: cfg.feeBps / 1_000_000, ethIsToken0: cfg.ethIsToken0,
    d0: cfg.token0Decimals, d1: cfg.token1Decimals,
    tickSpacing: TICK_SPACING[cfg.feeBps], gasUsdPerRebalance: GAS_USD[cfg.chain], slippageBps: 5,
  };
  const swaps: SwapEv[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(CACHE, `${id}.ndjson`)) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    swaps.push({
      b: j.b, ts: tsFor(j.b),
      a0: Number(BigInt(j.a0)) / 10 ** spec.d0,
      a1: Number(BigInt(j.a1)) / 10 ** spec.d1,
      sqrtP: Number(BigInt(j.sp)) / 2 ** 96,
      L: Number(BigInt(j.L)), t: j.t,
    });
  }
  swaps.sort((a, b) => a.b - b.b);
  const seen = new Set<string>();
  return { swaps: swaps.filter((s) => { const k = `${s.b}-${s.a0}-${s.t}`; if (seen.has(k)) return false; seen.add(k); return true; }), spec };
}

const pct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);

(async () => {
  const id = process.argv[2] || 'base-weth-usdc-030';
  const windowDays = Number(process.argv[3] || 30);
  const stepDays = Number(process.argv[4] || 15);
  const { swaps, spec } = await loadPool(id);
  const t0 = swaps[0].ts, t1 = swaps[swaps.length - 1].ts;
  const totalDays = (t1 - t0) / 86400;
  console.log(`${id}: ${swaps.length} swapów, ${totalDays.toFixed(1)} dni · okna ${windowDays}d co ${stepDays}d\n`);

  const mkStrategies = (): Strategy[] => [
    hodl5050, passiveWide, fixedNaive(0.15),
    volAdaptive({ k: 2, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
    volAdaptive({ k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7 }),
  ];

  // per strategia: lista vsHODL z każdego okna
  const dist: Record<string, number[]> = {};
  let windows = 0;

  for (let start = t0; start + windowDays * 86400 <= t1; start += stepDays * 86400) {
    const end = start + windowDays * 86400;
    const slice = swaps.filter((s) => s.ts >= start && s.ts < end);
    if (slice.length < 500) continue;
    windows++;
    const strategies = mkStrategies(); // świeże instancje (stan wewn.)
    const res = strategies.map((s) => runStrategy(slice, spec, s, 10_000));
    const hodl = res.find((r) => r.name === 'HODL 50/50')!;
    for (const r of res) {
      if (r.name === 'HODL 50/50') continue;
      (dist[r.name] ??= []).push(((r.finalUsd / hodl.finalUsd) - 1) * 100);
    }
    process.stdout.write(`\rokno ${windows}…  `);
  }

  console.log(`\n\n${windows} okien · vsHODL% na okno ${windowDays}d:`);
  console.log('strategia'.padEnd(44) + 'śr.'.padStart(8) + 'med.'.padStart(8) + '%wygr.'.padStart(8) + 'najgorsze'.padStart(11) + 'najlepsze'.padStart(11));
  const summary: any = {};
  for (const [name, vals] of Object.entries(dist)) {
    const sorted = [...vals].sort((a, b) => a - b);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const med = sorted[Math.floor(sorted.length / 2)];
    const winPct = (vals.filter((v) => v > 0).length / vals.length) * 100;
    summary[name] = { mean, med, winPct, worst: sorted[0], best: sorted[sorted.length - 1], windows: vals.length };
    console.log(
      name.padEnd(44) + pct(mean).padStart(8) + pct(med).padStart(8) +
      winPct.toFixed(0).padStart(7) + '%' + pct(sorted[0]).padStart(11) + pct(sorted[sorted.length - 1]).padStart(11)
    );
  }
  console.log('\nKRYTERIUM "prawidłowego" algorytmu: %wygr. ≥ 65 i najgorsze okno > -3.');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `walkforward-${id}.json`), JSON.stringify({ id, windowDays, stepDays, windows, summary }, null, 2));
})();
