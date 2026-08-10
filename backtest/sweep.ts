/**
 * sweep.ts — przeszukiwanie parametrów strategii na jednej puli.
 *   npx tsx backtest/sweep.ts <pool-id>
 * Grid: adaptacyjna (k × histereza × payback) + pasywne/naiwne szerokości.
 * Wynik: tabela top-15 wg vsHODL + zapis backtest/results/sweep-<id>.json
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { SwapEv, PoolSpec, runStrategy, RunResult, Strategy } from './engine';
import { hodl5050, fixedNaive, passiveWide, volAdaptive } from './strategies';

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
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(CACHE, `${id}.ndjson`)) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    swaps.push({
      b: j.b, ts: tsFor(j.b),
      a0: Number(BigInt(j.a0)) / 10 ** spec.d0,
      a1: Number(BigInt(j.a1)) / 10 ** spec.d1,
      sqrtP: Number(BigInt(j.sp)) / 2 ** 96,
      L: Number(BigInt(j.L)),
      t: j.t,
    });
  }
  swaps.sort((a, b) => a.b - b.b);
  const seen = new Set<string>();
  return { swaps: swaps.filter((s) => { const k = `${s.b}-${s.a0}-${s.t}`; if (seen.has(k)) return false; seen.add(k); return true; }), spec };
}

(async () => {
  const id = process.argv[2] || 'base-weth-usdc-030';
  const { swaps, spec } = await loadPool(id);
  const days = (swaps[swaps.length - 1].ts - swaps[0].ts) / 86400;
  console.log(`${id}: ${swaps.length} swapów, ${days.toFixed(1)} dni — sweep startuje\n`);

  const strategies: Strategy[] = [hodl5050, passiveWide];
  for (const w of [0.1, 0.2, 0.3]) strategies.push(fixedNaive(w));
  for (const k of [2, 3, 4]) {
    for (const h of [12, 24, 48]) {
      for (const pb of [3, 7, 14]) {
        strategies.push(volAdaptive({ k, horizonDays: 7, hysteresisSec: h * 3600, maxPaybackDays: pb }));
      }
    }
  }

  const results: RunResult[] = [];
  for (const s of strategies) {
    const r = runStrategy(swaps, spec, s, 10_000);
    results.push(r);
    process.stdout.write(`\r${results.length}/${strategies.length}  `);
  }
  const hodl = results.find((r) => r.name === 'HODL 50/50')!;
  for (const r of results) r.vsHodlPct = ((r.finalUsd / hodl.finalUsd) - 1) * 100;

  const sorted = [...results].sort((a, b) => b.vsHodlPct - a.vsHodlPct);
  console.log('\n\nTOP 15 wg vsHODL:');
  console.log('strategia'.padEnd(46) + 'vsHODL%'.padStart(9) + 'APR%'.padStart(8) + 'maxDD%'.padStart(8) + 'fees$'.padStart(8) + 'reb'.padStart(5));
  for (const r of sorted.slice(0, 15)) {
    console.log(r.name.padEnd(46) + r.vsHodlPct.toFixed(2).padStart(9) + r.aprPct.toFixed(1).padStart(8) + r.maxDrawdownPct.toFixed(1).padStart(8) + r.feesUsd.toFixed(0).padStart(8) + String(r.rebalances).padStart(5));
  }
  console.log('\nDolne 5 (przestroga):');
  for (const r of sorted.slice(-5)) {
    console.log(r.name.padEnd(46) + r.vsHodlPct.toFixed(2).padStart(9) + r.aprPct.toFixed(1).padStart(8) + r.maxDrawdownPct.toFixed(1).padStart(8) + r.feesUsd.toFixed(0).padStart(8) + String(r.rebalances).padStart(5));
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `sweep-${id}.json`), JSON.stringify({ id, days, results: results.map(({ equity, ...r }) => r) }, null, 2));
})();
