/**
 * selection.ts — meta-backtest WARSTWY SELEKCJI PUL (bez lookahead bias).
 *   npx tsx backtest/selection.ts
 *
 * Pytanie: czy polityka "codziennie trzymaj top-N pul wg rankingu fee-APR"
 * zarabia więcej niż trzymanie stałych pul rdzeniowych — PO kosztach rotacji?
 * Każdego dnia D ranking budowany WYŁĄCZNIE z danych ≤ D (trailing okno),
 * a wynik mierzony fee-APR z dnia D+1 (forward). To testuje trwałość APR.
 *
 * OGRANICZENIE (świadome): apyBase DefiLlama to yield z fee — NIE zawiera IL.
 * Wyniki czytać jako "porównanie strumieni fee między politykami"; pełny PnL
 * z IL testuje silnik tick-level (run.ts) na pulach wybranych przez selekcję.
 * Dla ostrożności: filtr stablecoin/ilRisk raportowany osobno.
 */
import * as fs from 'fs';
import * as path from 'path';

const HIST = path.join(__dirname, '..', 'data', 'llama', 'history');
const OUT = path.join(__dirname, 'results');

interface DayRow {
  date: string;
  apyBase: number | null;
  tvlUsd: number;
}
interface PoolHist {
  meta: { pool: string; symbol: string; chain: string; poolMeta: string | null; stablecoin: boolean; ilRisk: string };
  byDate: Map<string, DayRow>;
  dates: string[];
}

const SWITCH_COST_PCT = 0.15; // koszt wymiany puli jako % kapitału (swap 2x fee+slippage+gas, konserwatywnie)
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
        byDate.set(date, { date, apyBase: r.apyBase ?? null, tvlUsd: r.tvlUsd ?? 0 });
        dateSet.add(date);
      }
      if (byDate.size >= 30) pools.push({ meta: j.meta, byDate, dates: [...byDate.keys()].sort() });
    } catch {}
  }
  return { pools, allDates: [...dateSet].sort() };
}

/** średni trailing apyBase z okna W dni kończącego się na dacie d (null gdy braki > 30%) */
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
  window: number; // trailing okno rankingu (dni)
  persistDays: number; // pula musi być w topie przez X kolejnych dni zanim wejdziemy
  excludeExotic: boolean; // tylko pary z majors (ETH/BTC/stable w symbolu)
}

const MAJORS = /ETH|BTC|USDC|USDT|DAI|USDS/;
const isExotic = (sym: string) => {
  const parts = sym.split('-');
  return !parts.every((t) => MAJORS.test(t));
};

function simulate(pools: PoolHist[], allDates: string[], pol: Policy) {
  const start = 30; // rozbieg na trailing
  let capital = 1.0;
  let held: string[] = [];
  let switches = 0;
  const topStreak = new Map<string, number>();
  const daily: number[] = [];

  for (let di = start; di < allDates.length - 1; di++) {
    const d = allDates[di];
    const dNext = allDates[di + 1];

    // ranking na dzień d (tylko dane ≤ d)
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

    const topIds = scored.slice(0, pol.topN * 2).map((x) => x.p.meta.pool); // strefa topu (2N na streak)
    for (const id of topIds) topStreak.set(id, (topStreak.get(id) || 0) + 1);
    for (const id of [...topStreak.keys()]) if (!topIds.includes(id)) topStreak.set(id, 0);

    const eligible = scored
      .filter((x) => (topStreak.get(x.p.meta.pool) || 0) >= pol.persistDays)
      .slice(0, pol.topN)
      .map((x) => x.p.meta.pool);

    // rotacja: ile pozycji się zmienia
    const target = eligible.length ? eligible : held; // brak kandydatów → trzymaj
    const changed = target.filter((id) => !held.includes(id)).length;
    if (held.length) {
      switches += changed;
      capital *= 1 - (changed / Math.max(pol.topN, 1)) * (SWITCH_COST_PCT / 100) * 2; // wyjście+wejście
    }
    held = target;

    // wynik: forward apyBase z dnia D+1 (equal weight)
    if (held.length) {
      let dayApy = 0, n = 0;
      for (const id of held) {
        const p = pools.find((x) => x.meta.pool === id)!;
        const row = p.byDate.get(dNext);
        if (row?.apyBase !== null && row?.apyBase !== undefined) {
          dayApy += row.apyBase!;
          n++;
        }
      }
      if (n) {
        const r = dayApy / n / 100 / 365;
        capital *= 1 + r;
        daily.push(r);
      }
    }
  }

  const days = daily.length;
  const feeAprPct = days ? (Math.pow(capital, 365 / days) - 1) * 100 : 0;
  return { name: pol.name, feeAprPct, switches, days, finalCapital: capital };
}

(async () => {
  const { pools, allDates } = load();
  if (!pools.length) {
    console.error('Brak danych w data/llama/history — odpal najpierw: npm run fetch:llama');
    process.exit(1);
  }
  console.log(`Uniwersum: ${pools.length} pul z historią ≥30 dni, zakres dat ${allDates[0]} → ${allDates[allDates.length - 1]}\n`);

  const policies: Policy[] = [
    { name: 'NAIWNY pościg: top5 wg wczorajszego APR', topN: 5, window: 1, persistDays: 0, excludeExotic: false },
    { name: 'Top5 wg średniej 7d', topN: 5, window: 7, persistDays: 0, excludeExotic: false },
    { name: 'Top5 7d + persystencja 3d', topN: 5, window: 7, persistDays: 3, excludeExotic: false },
    { name: 'Top5 7d + persyst. 3d + TYLKO majors', topN: 5, window: 7, persistDays: 3, excludeExotic: true },
    { name: 'Top3 14d + persyst. 5d + majors', topN: 3, window: 14, persistDays: 5, excludeExotic: true },
  ];

  // benchmark: stałe pule rdzeniowe (jeśli są w uniwersum)
  const CORE = ['WETH-USDC', 'USDC-WETH'];
  const corePools = pools.filter((p) => CORE.includes(p.meta.symbol) && !isExotic(p.meta.symbol)).slice(0, 3);

  const results = policies.map((pol) => simulate(pools, allDates, pol));

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
    results.push({ name: `BENCHMARK: stałe ${corePools.map((p) => p.meta.symbol + '@' + p.meta.chain).join(', ')}`, feeAprPct: n ? (Math.pow(capital, 365 / n) - 1) * 100 : 0, switches: 0, days: n, finalCapital: capital });
  }

  console.log('polityka'.padEnd(52) + 'fee-APR%'.padStart(10) + 'rotacje'.padStart(9) + 'dni'.padStart(6));
  for (const r of results) {
    console.log(r.name.padEnd(52) + r.feeAprPct.toFixed(2).padStart(10) + String(r.switches).padStart(9) + String(r.days).padStart(6));
  }
  console.log('\nUWAGA: fee-APR bez IL — porównuj polityki między sobą, nie traktuj jako PnL.');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'selection.json'), JSON.stringify(results, null, 2));
})();
