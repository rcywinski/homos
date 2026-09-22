/**
 * pegged.ts — battery F.B: ultra-narrow LP on pegged pairs
 * (stable-stable / LST-ETH). RESEARCH-QUEUE section F.
 *
 *   npx tsx backtest/pegged.ts <pool-id>
 *
 * Strategies: HODL 50/50, full-range, fixed ±0.05/±0.1/±0.2/±0.5/±2%
 * (rebalance immediately after exit) plus variants with 6h/24h hysteresis
 * (defence against depeg whipsaw: do not chase the peg right away).
 *
 * Metrics beyond the standard: worst-7d (worst equity week — depeg stress),
 * NET fees after gas. Mainnet gas $8/cycle at $10k is part of the research
 * question (a friend's setup works at $281k).
 */
import * as fs from 'fs';
import * as path from 'path';
import { runStrategy, RunResult, Strategy, Ctx } from './engine';
import { hodl5050, fullRange } from './strategies';
import { loadPool } from './load';

const OUT = path.join(__dirname, 'results');

const widthToTicks = (w: number) => Math.round(Math.log(1 + w) / Math.log(1.0001));
const rangeAround = (ctx: Ctx, w: number): [number, number] => {
  const dt = Math.max(widthToTicks(w), ctx.spec.tickSpacing);
  let lo = ctx.alignTick(ctx.ev.t - dt);
  let hi = ctx.alignTick(ctx.ev.t + dt);
  if (hi <= lo) hi = lo + ctx.spec.tickSpacing;
  return [lo, hi];
};

/** fixed ±w with optional time hysteresis */
const pegged = (w: number, hystHours = 0): Strategy => {
  let outSince: number | null = null;
  return {
    name: `Fixed ±${(w * 100).toFixed(2)}%${hystHours ? ` h=${hystHours}h` : ' (immediate)'}`,
    init: (ctx) => ctx.openPosition(...rangeAround(ctx, w)),
    onEvent: (ctx) => {
      const p = ctx.state.pos;
      if (!p) return;
      const out = ctx.ev.t < p.lo || ctx.ev.t >= p.hi;
      if (!out) {
        outSince = null;
        return;
      }
      if (outSince === null) outSince = ctx.ev.ts;
      if (ctx.ev.ts - outSince < hystHours * 3600) return;
      ctx.rebalance(...rangeAround(ctx, w));
      outSince = null;
    },
  };
};

/** worst 7-day equity drop (depeg stress) in % */
function worst7d(r: RunResult): number {
  const eq = r.equity;
  let worst = 0;
  let j = 0;
  for (let i = 0; i < eq.length; i++) {
    while (j < eq.length - 1 && eq[j + 1].ts <= eq[i].ts + 7 * 86400) j++;
    const drop = (eq[i].usd - Math.min(...eq.slice(i, j + 1).map((e) => e.usd))) / eq[i].usd;
    if (drop > worst) worst = drop;
  }
  return worst * 100;
}

(async () => {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: npx tsx backtest/pegged.ts <pool-id>');
    process.exit(1);
  }
  const loaded = await loadPool(id);
  if (!loaded) {
    console.error(`No cache for ${id}`);
    process.exit(1);
  }
  const { swaps: swapsRaw, spec } = loaded;

  // OUTLIER FILTER (crucial for pegged pairs): thin 0.01% pools have
  // probe swaps through empty ticks (DAI-USDT: 52 events at ±73…+643% from the
  // peg with 99.9% of the data within ±0.5%). Such a tick is not an executable
  // price for $10k — pricing/rebalancing at it = fiction. We drop events
  // deviating > OUTLIER_TICKS from the rolling median (window of 201 accepted swaps).
  const OUTLIER_TICKS = 300; // ~3%
  const W = 201;
  const win: number[] = [];
  const sorted: number[] = [];
  const insSorted = (v: number) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
    sorted.splice(lo, 0, v);
  };
  const delSorted = (v: number) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
    sorted.splice(lo, 1);
  };
  const swaps: typeof swapsRaw = [];
  let dropped = 0;
  for (const s of swapsRaw) {
    if (win.length >= 50) {
      const med = sorted[sorted.length >> 1];
      if (Math.abs(s.t - med) > OUTLIER_TICKS) { dropped++; continue; }
    }
    swaps.push(s);
    win.push(s.t);
    insSorted(s.t);
    if (win.length > W) delSorted(win.shift()!);
  }
  if (dropped) console.log(`outlier filter: dropped ${dropped} swaps (${((dropped / swapsRaw.length) * 100).toFixed(3)}%)`);

  const days = (swaps[swaps.length - 1].ts - swaps[0].ts) / 86400;
  console.log(`=== ${id} — ${swaps.length} swaps, ${days.toFixed(1)} days, gas $${spec.gasUsdPerRebalance}/cycle, capital $10k ===`);

  const strategies: Strategy[] = [
    hodl5050,
    fullRange,
    pegged(0.0005),
    pegged(0.001),
    pegged(0.002),
    pegged(0.005),
    pegged(0.02),
    pegged(0.001, 6),
    pegged(0.001, 24),
    pegged(0.002, 24),
  ];

  const results: RunResult[] = [];
  for (const s of strategies) {
    results.push(runStrategy(swaps, spec, s, 10_000));
    process.stdout.write(`\r${results.length}/${strategies.length}  `);
  }
  const hodl = results.find((r) => r.name === 'HODL 50/50')!;
  for (const r of results) r.vsHodlPct = ((r.finalUsd / hodl.finalUsd) - 1) * 100;

  console.log('\n' + 'strategy'.padEnd(30) + 'APR%'.padStart(8) + 'vsHODL%'.padStart(9) + 'maxDD%'.padStart(8) + 'w7d%'.padStart(7) + 'fees$'.padStart(8) + 'gas$'.padStart(8) + 'reb'.padStart(6) + 'inRng%'.padStart(8));
  for (const r of results) {
    console.log(
      r.name.padEnd(30) +
        r.aprPct.toFixed(2).padStart(8) +
        r.vsHodlPct.toFixed(2).padStart(9) +
        r.maxDrawdownPct.toFixed(1).padStart(8) +
        worst7d(r).toFixed(1).padStart(7) +
        r.feesUsd.toFixed(0).padStart(8) +
        r.gasUsd.toFixed(0).padStart(8) +
        String(r.rebalances).padStart(6) +
        r.inRangePct.toFixed(0).padStart(8)
    );
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT, `pegged-${id}.json`),
    JSON.stringify({ id, days, swapCount: swaps.length, results: results.map(({ equity, ...r }) => ({ ...r, worst7dPct: worst7d(results.find(x => x.name === r.name)!) })) }, null, 2)
  );
  console.log(`→ backtest/results/pegged-${id}.json`);
})();
