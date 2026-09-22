/**
 * selection.ts — meta-backtest of the POOL SELECTION LAYER (no lookahead bias).
 *   npx tsx backtest/selection.ts
 *
 * Question: does the policy "every day hold the top-N pools by fee-APR ranking"
 * earn more than holding fixed core pools — AFTER rotation costs?
 * On each day D the ranking is built EXCLUSIVELY from data ≤ D (trailing
 * window), and the result is measured by the fee-APR of day D+1 (forward).
 * This tests APR persistence.
 *
 * LIMITATION (deliberate): DefiLlama apyBase is fee yield — it does NOT include IL.
 * Read the results as "a comparison of fee streams between policies"; full PnL
 * with IL is tested by the tick-level engine (run.ts) on pools picked by selection.
 * For caution: the stablecoin/ilRisk filter is reported separately.
 */
import * as fs from 'fs';
import * as path from 'path';

const HIST = path.join(__dirname, '..', 'data', 'llama', 'history');
const OUT = path.join(__dirname, 'results');

interface DayRow {
  date: string;
  apyBase: number | null;
  il7d: number | null; // IL over the trailing 7 days, % (DefiLlama)
  tvlUsd: number;
}
interface PoolHist {
  meta: { pool: string; symbol: string; chain: string; poolMeta: string | null; stablecoin: boolean; ilRisk: string };
  byDate: Map<string, DayRow>;
  dates: string[];
}

const SWITCH_COST_PCT = 0.15; // cost of swapping pools as % of capital (2x swap fee+slippage+gas, conservative)
const MIN_TVL = 3_000_000;

function load(): { pools: PoolHist[]; allDates: string[] } {
  const pools: PoolHist[] = [];
  const dateSet = new Set<string>();
  for (const f of fs.readdirSync(HIST)) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(fs.readFileSync(path.join(HIST, f), 'utf8'));
      const byDate = new Map<string, DayRow>();
      for (const r of j.series || []) {
        const date = String(r.timestamp).slice(0, 10);
        byDate.set(date, { date, apyBase: r.apyBase ?? null, il7d: r.il7d ?? null, tvlUsd: r.tvlUsd ?? 0 });
        dateSet.add(date);
      }
      if (byDate.size >= 30) pools.push({ meta: j.meta, byDate, dates: [...byDate.keys()].sort() });
    } catch {}
  }
  return { pools, allDates: [...dateSet].sort() };
}

/** mean trailing apyBase over a window of W days ending on date d (null when gaps > 30%) */
function trailing(p: PoolHist, d: string, w: number): number | null {
  const idx = p.dates.indexOf(d);
  if (idx < w - 1) return null;
  let sum = 0, n = 0;
  for (let i = idx - w + 1; i <= idx; i++) {
    const row = p.byDate.get(p.dates[i]);
    if (row?.apyBase !== null && row?.apyBase !== undefined) {
      sum += row.apyBase!;
      n++;
    }
  }
  return n >= w * 0.7 ? sum / n : null;
}

interface Policy {
  name: string;
  topN: number;
  window: number; // trailing ranking window (days)
  persistDays: number; // a pool must be in the top for X consecutive days before we enter
  excludeExotic: boolean; // only pairs of majors (ETH/BTC/stable in the symbol)
}

const MAJORS = /ETH|BTC|USDC|USDT|DAI|USDS/;
const isExotic = (sym: string) => {
  const parts = sym.split('-');
  return !parts.every((t) => MAJORS.test(t));
};

function simulate(pools: PoolHist[], allDates: string[], pol: Policy, ilAdjusted = false) {
  let ilCovered = 0, ilTotal = 0;
  const start = 30; // warm-up for trailing
  let capital = 1.0;
  let held: string[] = [];
  let switches = 0;
  const topStreak = new Map<string, number>();
  const daily: number[] = [];

  for (let di = start; di < allDates.length - 1; di++) {
    const d = allDates[di];
    const dNext = allDates[di + 1];

    // ranking for day d (data ≤ d only)
    const scored = pools
      .filter((p) => {
        const row = p.byDate.get(d);
        if (!row || row.tvlUsd < MIN_TVL) return false;
        if (pol.excludeExotic && isExotic(p.meta.symbol)) return false;
        return true;
      })
      .map((p) => ({ p, score: trailing(p, d, pol.window) }))
      .filter((x) => x.score !== null)
      .sort((a, b) => b.score! - a.score!);

    const topIds = scored.slice(0, pol.topN * 2).map((x) => x.p.meta.pool); // top zone (2N for the streak)
    for (const id of topIds) topStreak.set(id, (topStreak.get(id) || 0) + 1);
    for (const id of [...topStreak.keys()]) if (!topIds.includes(id)) topStreak.set(id, 0);

    const eligible = scored
      .filter((x) => (topStreak.get(x.p.meta.pool) || 0) >= pol.persistDays)
      .slice(0, pol.topN)
      .map((x) => x.p.meta.pool);

    // rotation: how many positions change
    const target = eligible.length ? eligible : held; // no candidates → keep holding
    const changed = target.filter((id) => !held.includes(id)).length;
    if (held.length) {
      switches += changed;
      capital *= 1 - (changed / Math.max(pol.topN, 1)) * (SWITCH_COST_PCT / 100) * 2; // exit+entry
    }
    held = target;

    // result: forward apyBase of day D+1 (equal weight), optionally minus IL
    if (held.length) {
      let dayRet = 0, n = 0;
      for (const id of held) {
        const p = pools.find((x) => x.meta.pool === id)!;
        const row = p.byDate.get(dNext);
        if (row?.apyBase !== null && row?.apyBase !== undefined) {
          let r = row.apyBase! / 100 / 365;
          if (ilAdjusted) {
            const il = row.il7d;
            if (il !== null && il > 0) r -= il / 100 / 7; // daily IL instalment from trailing 7d
            ilCovered += il !== null ? 1 : 0;
            ilTotal += 1;
          }
          dayRet += r;
          n++;
        }
      }
      if (n) {
        const r = dayRet / n;
        capital *= 1 + r;
        daily.push(r);
      }
    }
  }

  const days = daily.length;
  const feeAprPct = days ? (Math.pow(capital, 365 / days) - 1) * 100 : 0;
  const name = ilAdjusted ? pol.name + ' [minus IL]' : pol.name;
  const ilCov = ilTotal ? ` il-cov ${((ilCovered / ilTotal) * 100).toFixed(0)}%` : '';
  return { name: name + ilCov, feeAprPct, switches, days, finalCapital: capital };
}

(async () => {
  const { pools, allDates } = load();
  if (!pools.length) {
    console.error('No data in data/llama/history — run first: npm run fetch:llama');
    process.exit(1);
  }
  console.log(`Universe: ${pools.length} pools with ≥30 days of history, date range ${allDates[0]} → ${allDates[allDates.length - 1]}\n`);

  const policies: Policy[] = [
    { name: 'NAIVE chase: top5 by yesterday\'s APR', topN: 5, window: 1, persistDays: 0, excludeExotic: false },
    { name: 'Top5 by 7d mean', topN: 5, window: 7, persistDays: 0, excludeExotic: false },
    { name: 'Top5 7d + persistence 3d', topN: 5, window: 7, persistDays: 3, excludeExotic: false },
    { name: 'Top5 7d + persist. 3d + majors ONLY', topN: 5, window: 7, persistDays: 3, excludeExotic: true },
    { name: 'Top3 14d + persist. 5d + majors', topN: 3, window: 14, persistDays: 5, excludeExotic: true },
  ];

  // benchmark: fixed core pools (if present in the universe)
  const CORE = ['WETH-USDC', 'USDC-WETH'];
  const corePools = pools.filter((p) => CORE.includes(p.meta.symbol) && !isExotic(p.meta.symbol)).slice(0, 3);

  const results = policies.map((pol) => simulate(pools, allDates, pol));
  for (const pol of policies) results.push(simulate(pools, allDates, pol, true));

  if (corePools.length) {
    const ids = corePools.map((p) => p.meta.pool);
    let capital = 1, daily = 0, n = 0;
    for (let di = 30; di < allDates.length - 1; di++) {
      const dNext = allDates[di + 1];
      let s = 0, k = 0;
      for (const id of ids) {
        const row = pools.find((x) => x.meta.pool === id)!.byDate.get(dNext);
        if (row?.apyBase != null) { s += row.apyBase; k++; }
      }
      if (k) { capital *= 1 + s / k / 100 / 365; n++; }
    }
    results.push({ name: `BENCHMARK: fixed ${corePools.map((p) => p.meta.symbol + '@' + p.meta.chain).join(', ')}`, feeAprPct: n ? (Math.pow(capital, 365 / n) - 1) * 100 : 0, switches: 0, days: n, finalCapital: capital });
  }

  console.log('policy'.padEnd(52) + 'fee-APR%'.padStart(10) + 'rotations'.padStart(9) + 'days'.padStart(6));
  for (const r of results) {
    console.log(r.name.padEnd(52) + r.feeAprPct.toFixed(2).padStart(10) + String(r.switches).padStart(9) + String(r.days).padStart(6));
  }
  console.log('\nNOTE: fee-APR without IL — compare policies against each other, do not treat as PnL.');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'selection.json'), JSON.stringify(results, null, 2));
})();
