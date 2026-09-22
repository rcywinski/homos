/**
 * rotation.ts — backtest of DYNAMIC rotation between pools (TASKS-ROTATION v1,
 * Rafal's directive 26.08: "we keep reviewing the market; idleness/loss →
 * we close and move").
 *
 * CONSTRUCTION (honest): ETH/stable pools = the same beta, so the test isolates
 * the question "does POOL CHOICE (the fee engine) add value" — rotation does
 * not escape market direction. For each pool we compute the in-pool strategy
 * equity with the engine (hourly samples), and the rotation portfolio CHAINS
 * the hourly returns of the active pool + pays hop costs (SWITCH_COST_PCT + gas;
 * cross-chain +$2 bridge). Approximation: on a hop we inherit the current range
 * state of the target pool (small bias for quickly re-centred strategies; the
 * same for all rules, so the COMPARISON of rules is fair).
 *
 * Usage: [SIGMA_MODE=grid15] npx tsx backtest/rotation.ts [startUsd=5000] [id...]
 *   default: 5 ETH/stable pools *-365d.
 */
import { runStrategy, Strategy, PoolSpec } from './engine';
import { fixedNaive, volAdaptiveTrend } from './strategies';
import { loadPool } from './load';

const argv = process.argv.slice(2);
const startUsd = Number(argv[0] && !isNaN(Number(argv[0])) ? argv[0] : 5000);
const ids = (argv.filter((a) => isNaN(Number(a))).length
  ? argv.filter((a) => isNaN(Number(a)))
  : [
      'mainnet-usdc-weth-005-365d',
      'mainnet-usdc-weth-030-365d',
      'base-weth-usdc-030-365d',
      'base-weth-usdc-005-365d',
      'arbitrum-weth-usdc-005-365d',
    ]);

const HOUR = 3600;
const SWITCH_COST_PCT = 0.3; // % of capital (exit+entry) — as in the selector
const BRIDGE_USD = 2; // cross-chain: CCTP bridge etc.
const chainOf = (id: string) => id.split('-')[0];

// "idleness/attractiveness" signal: EMA of the instantaneous fee yield of the active band
// (the same quantity as engine §2), half-life 3.5d ≈ trailing ~7d
const YIELD_HL_SEC = 3.5 * 86400;

interface PoolSeries {
  id: string;
  chain: string;
  gasUsd: number;
  t0: number;
  t1: number;
  // hourly (index = (ts - t0) / 3600)
  logRet: Map<number, number>; // log-return of the in-pool strategy equity in this hour
  yieldDaily: Map<number, number>; // trailing fee yield (daily) at end of hour
}

const trendBase = { k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, trendHLDays: 7, trendThresh: 0.05 } as const;
const IN_POOL: Record<string, () => Strategy> = {
  'naive30': () => fixedNaive(0.3),
  'v11': () => volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }),
};

(async () => {
  // ROT_SET=naive30|v11 narrows the in-pool variants (default: both)
  const variants = process.env.ROT_SET ? [process.env.ROT_SET] : Object.keys(IN_POOL);
  if (variants.some((v) => !IN_POOL[v])) { console.error(`Unknown ROT_SET (allowed: ${Object.keys(IN_POOL).join(', ')})`); process.exit(1); }
  // series per pool per in-pool strategy variant
  const series: Record<string, PoolSeries[]> = Object.fromEntries(variants.map((v) => [v, []]));

  for (const id of ids) {
    const loaded = await loadPool(id);
    if (!loaded) {
      console.error(`No cache for ${id} — skipping`);
      continue;
    }
    const { swaps, spec } = loaded as { swaps: any[]; spec: PoolSpec };
    // signal: pass over the swaps → hourly trailing yield (engine §2 formula)
    const yieldDaily = new Map<number, number>();
    {
      let y = 0;
      let lastTs = swaps[0].ts;
      let lastHour = Math.floor(swaps[0].ts / HOUR);
      for (const ev of swaps) {
        const dt = Math.max(ev.ts - lastTs, 1);
        const sp = Number(ev.sqrtP) / 2 ** 96;
        const spLo = sp * Math.pow(1.0001, -spec.tickSpacing / 2);
        const spHi = sp * Math.pow(1.0001, spec.tickSpacing / 2);
        const L = Number(ev.L);
        if (L > 0 && sp > 0) {
          const raw0 = L * ((spHi - sp) / (sp * spHi));
          const raw1 = L * (sp - spLo);
          const bandTok0 = (raw0 + raw1 / (sp * sp)) / 10 ** spec.d0;
          const feeTok0 = (ev.a0 > 0 ? ev.a0 : ev.a1 / (sp * sp) * 10 ** (spec.d1 - spec.d0) ) ;
          // fee in token0 human: are a0/a1 already human in SwapEv? — see load.ts;
          // we compute USD-agnostically: instYield = fee/band (units cancel out)
          const fee0 = (ev.a0 > 0 ? ev.a0 : Math.abs(ev.a1) / ((sp * sp) * 10 ** (spec.d0 - spec.d1))) * spec.feeRate;
          if (bandTok0 > 0 && fee0 >= 0) {
            const inst = (fee0 / bandTok0) * (86400 / dt);
            const a = 1 - Math.exp(-dt / (YIELD_HL_SEC / Math.LN2));
            y = (1 - a) * y + a * inst;
          }
          void feeTok0;
        }
        const h = Math.floor(ev.ts / HOUR);
        if (h !== lastHour) {
          yieldDaily.set(lastHour, y);
          lastHour = h;
        }
        lastTs = ev.ts;
      }
      yieldDaily.set(lastHour, y);
    }
    for (const v of variants) {
      const r = runStrategy(swaps, spec, IN_POOL[v](), startUsd);
      const logRet = new Map<number, number>();
      for (let i = 1; i < r.equity.length; i++) {
        const h = Math.floor(r.equity[i].ts / HOUR);
        const prev = r.equity[i - 1].usd;
        if (prev > 0 && r.equity[i].usd > 0) logRet.set(h, Math.log(r.equity[i].usd / prev));
      }
      series[v].push({
        id, chain: chainOf(id), gasUsd: spec.gasUsdPerRebalance,
        t0: swaps[0].ts, t1: swaps[swaps.length - 1].ts, logRet, yieldDaily,
      });
    }
    console.error(`  prepared: ${id} (${swaps.length} swaps)`);
    // swaps goes out of scope — GC reclaims it before the next pool
  }

  for (const v of variants) {
    const pools = series[v];
    if (pools.length < 2) { console.error('Too few pools.'); process.exit(1); }
    const T0 = Math.max(...pools.map((p) => p.t0));
    const T1 = Math.min(...pools.map((p) => p.t1));
    const h0 = Math.ceil(T0 / HOUR), h1 = Math.floor(T1 / HOUR);
    const ff = (m: Map<number, number>, h: number, memo: { last: number }) => {
      const x = m.get(h);
      if (x !== undefined) memo.last = x;
      return memo.last;
    };

    // prefix sums of log-returns (oracle + single-pool)
    const cum: number[][] = pools.map(() => new Array(h1 - h0 + 2).fill(0));
    pools.forEach((p, i) => {
      for (let h = h0; h <= h1; h++) cum[i][h - h0 + 1] = cum[i][h - h0] + (p.logRet.get(h) ?? 0);
    });

    const switchCost = (usd: number, a: PoolSeries, b: PoolSeries) =>
      usd * (SWITCH_COST_PCT / 100) + a.gasUsd / 2 + b.gasUsd / 2 + (a.chain !== b.chain ? BRIDGE_USD : 0);

    type Res = { name: string; final: number; hops: number; costs: number; daysInCash: number };
    const results: Res[] = [];

    // single-pool benchmarks
    pools.forEach((p, i) => {
      results.push({ name: `single: ${p.id}`, final: startUsd * Math.exp(cum[i][h1 - h0 + 1]), hops: 0, costs: 0, daysInCash: 0 });
    });
    results.push({ name: '100% USDC', final: startUsd, hops: 0, costs: 0, daysInCash: (h1 - h0) / 24 });

    // rule (a) top-yield: hop when another pool has a yield higher by >X p.p. APR for N hours
    for (const [X, Nh] of [[5, 48], [10, 48], [10, 72]] as const) {
      let usd = startUsd, active = 0, hops = 0, costs = 0, betterSince: number | null = null, betterIdx = -1;
      const memoY = pools.map(() => ({ last: 0 }));
      for (let h = h0; h <= h1; h++) {
        usd *= Math.exp(pools[active].logRet.get(h) ?? 0);
        const yields = pools.map((p, i) => ff(p.yieldDaily, h, memoY[i]) * 365 * 100); // APR %
        let best = 0; for (let i = 1; i < pools.length; i++) if (yields[i] > yields[best]) best = i;
        if (best !== active && yields[best] - yields[active] > X) {
          if (betterIdx !== best) { betterIdx = best; betterSince = h; }
          if (betterSince !== null && (h - betterSince) * 1 >= Nh) {
            const c = switchCost(usd, pools[active], pools[best]);
            usd -= c; costs += c; hops++; active = best; betterSince = null; betterIdx = -1;
          }
        } else { betterSince = null; betterIdx = -1; }
      }
      results.push({ name: `rotate: Δ>${X}p.p. for ${Nh}h`, final: usd, hops, costs, daysInCash: 0 });
    }

    // rule (b) idleness: active pool < Ymin% APR for 48h → cash; return when top > Yre%
    for (const [Ymin, Yre] of [[5, 10], [10, 15]] as const) {
      let usd = startUsd, active: number | null = 0, hops = 0, costs = 0, lowSince: number | null = null, cashH = 0;
      const memoY = pools.map(() => ({ last: 0 }));
      for (let h = h0; h <= h1; h++) {
        const yields = pools.map((p, i) => ff(p.yieldDaily, h, memoY[i]) * 365 * 100);
        if (active !== null) {
          usd *= Math.exp(pools[active].logRet.get(h) ?? 0);
          if (yields[active] < Ymin) { lowSince ??= h; if (h - lowSince >= 48) { const c = pools[active].gasUsd / 2 + usd * (SWITCH_COST_PCT / 200); usd -= c; costs += c; active = null; lowSince = null; } }
          else lowSince = null;
        } else {
          cashH++;
          let best = 0; for (let i = 1; i < pools.length; i++) if (yields[i] > yields[best]) best = i;
          if (yields[best] > Yre) { const c = pools[best].gasUsd / 2 + usd * (SWITCH_COST_PCT / 200); usd -= c; costs += c; active = best; hops++; }
        }
      }
      results.push({ name: `idle→cash: <${Ymin}% APR 48h, return >${Yre}%`, final: usd, hops, costs, daysInCash: cashH / 24 });
    }

    // oracle: every week picks the pool with the best return over the NEXT 7 days (upper bound)
    {
      let usd = startUsd, active = 0, hops = 0, costs = 0;
      for (let h = h0; h <= h1; h++) {
        if ((h - h0) % (24 * 7) === 0) {
          const end = Math.min(h + 24 * 7, h1 + 1);
          let best = 0, bestR = -Infinity;
          pools.forEach((_, i) => { const r = cum[i][end - h0] - cum[i][h - h0]; if (r > bestR) { bestR = r; best = i; } });
          if (best !== active) { const c = switchCost(usd, pools[active], pools[best]); usd -= c; costs += c; hops++; active = best; }
        }
        usd *= Math.exp(pools[active].logRet.get(h) ?? 0);
      }
      results.push({ name: 'ORACLE (knows the next 7d — upper bound)', final: usd, hops, costs, daysInCash: 0 });
    }

    const days = (h1 - h0) / 24;
    console.log(`\n═══ in-pool variant: ${v} · ${pools.length} pools · common window ${days.toFixed(0)} days · start $${startUsd} · SIGMA_MODE=${process.env.SIGMA_MODE ?? 'swap'} ═══`);
    const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }).padStart(8);
    console.log('rule'.padEnd(46) + 'final$'.padStart(8) + 'PnL%'.padStart(8) + 'hops'.padStart(8) + 'costs$'.padStart(8) + 'days-cash'.padStart(9));
    for (const r of [...results].sort((a, b) => b.final - a.final)) {
      console.log(r.name.padEnd(46) + fmt(r.final) + `${(((r.final - startUsd) / startUsd) * 100).toFixed(1)}%`.padStart(8) + String(r.hops).padStart(8) + fmt(r.costs) + r.daysInCash.toFixed(0).padStart(9));
    }
  }
  console.log('\nNOTE: ETH/stable pools = the same beta — the table measures ONLY the value of pool choice (the fee engine) and hop costs, not market direction.');
})();
