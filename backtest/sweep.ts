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

const OUT = path.join(__dirname, 'results');

import { loadPool } from './load'; // wspólny loader (obsługuje też pary quote:'WETH')

(async () => {
  const id = process.argv[2] || 'base-weth-usdc-030';
  const loaded = await loadPool(id);
  if (!loaded) { console.error(`Brak cache dla ${id}`); process.exit(1); }
  const { swaps, spec } = loaded;
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
