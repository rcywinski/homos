/**
 * rotation.ts — backtest DYNAMICZNEJ rotacji między pulami (TASKS-ROTATION v1,
 * dyrektywa Rafała 26.08: "cały czas przeglądamy rynek; jałowość/strata →
 * zamykamy i przenosimy się").
 *
 * KONSTRUKCJA (uczciwie): pule ETH/stable = ta sama beta, więc test izoluje
 * pytanie "czy WYBÓR PULI (silnik fees) dodaje wartość" — rotacja nie ucieka
 * od kierunku rynku. Dla każdej puli liczymy engine'em equity strategii
 * in-pool (godzinowe próbki), a portfel rotacyjny SKŁADA godzinowe zwroty
 * aktywnej puli + płaci koszty przeskoku (SWITCH_COST_PCT + gaz; cross-chain
 * +$2 most). Przybliżenie: przy przeskoku dziedziczymy bieżący stan zakresu
 * puli docelowej (bias mały przy strategiach szybko re-centrowanych; ten sam
 * dla wszystkich reguł, więc PORÓWNANIE reguł jest fair).
 *
 * Użycie: [SIGMA_MODE=grid15] npx tsx backtest/rotation.ts [startUsd=5000] [id...]
 *   default: 5 pul ETH/stable *-365d.
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
const SWITCH_COST_PCT = 0.3; // % kapitału (wyjście+wejście) — jak selektor
const BRIDGE_USD = 2; // cross-chain: most CCTP itp.
const chainOf = (id: string) => id.split('-')[0];

// sygnał "jałowości/atrakcyjności": EMA chwilowego fee-yieldu aktywnego pasma
// (ta sama wielkość co engine §2), half-life 3.5d ≈ trailing ~7d
const YIELD_HL_SEC = 3.5 * 86400;

interface PoolSeries {
  id: string;
  chain: string;
  gasUsd: number;
  t0: number;
  t1: number;
  // godzinowe (indeks = (ts - t0) / 3600)
  logRet: Map<number, number>; // log-zwrot equity strategii in-pool w tej godzinie
  yieldDaily: Map<number, number>; // trailing fee-yield (dzienny) na koniec godziny
}

const trendBase = { k: 3, horizonDays: 7, hysteresisSec: 24 * 3600, maxPaybackDays: 7, trendHLDays: 7, trendThresh: 0.05 } as const;
const IN_POOL: Record<string, () => Strategy> = {
  'naive30': () => fixedNaive(0.3),
  'v11': () => volAdaptiveTrend({ ...trendBase, mode: 'exit', reentryAboveEma: true }),
};

(async () => {
  // ROT_SET=naive30|v11 zawęża warianty in-pool (domyślnie oba)
  const variants = process.env.ROT_SET ? [process.env.ROT_SET] : Object.keys(IN_POOL);
  if (variants.some((v) => !IN_POOL[v])) { console.error(`Nieznany ROT_SET (dozwolone: ${Object.keys(IN_POOL).join(', ')})`); process.exit(1); }
  // seria per pula per wariant strategii in-pool
  const series: Record<string, PoolSeries[]> = Object.fromEntries(variants.map((v) => [v, []]));

  for (const id of ids) {
    const loaded = await loadPool(id);
    if (!loaded) {
      console.error(`Brak cache dla ${id} — pomijam`);
      continue;
    }
    const { swaps, spec } = loaded as { swaps: any[]; spec: PoolSpec };
    // sygnał: przejście po swapach → godzinowy trailing yield (formuła engine §2)
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
          // fee w token0 human: a0/a1 są już human w SwapEv? — patrz load.ts;
          // liczymy w USD-agnostycznie: instYield = fee/band (jednostki się skracają)
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
    console.error(`  przygotowane: ${id} (${swaps.length} swapów)`);
    // swaps wypada z zakresu — GC odzyska przed kolejną pulą
  }

  for (const v of variants) {
    const pools = series[v];
    if (pools.length < 2) { console.error('Za mało pul.'); process.exit(1); }
    const T0 = Math.max(...pools.map((p) => p.t0));
    const T1 = Math.min(...pools.map((p) => p.t1));
    const h0 = Math.ceil(T0 / HOUR), h1 = Math.floor(T1 / HOUR);
    const ff = (m: Map<number, number>, h: number, memo: { last: number }) => {
      const x = m.get(h);
      if (x !== undefined) memo.last = x;
      return memo.last;
    };

    // prefiksowe sumy log-zwrotów (oracle + single-pool)
    const cum: number[][] = pools.map(() => new Array(h1 - h0 + 2).fill(0));
    pools.forEach((p, i) => {
      for (let h = h0; h <= h1; h++) cum[i][h - h0 + 1] = cum[i][h - h0] + (p.logRet.get(h) ?? 0);
    });

    const switchCost = (usd: number, a: PoolSeries, b: PoolSeries) =>
      usd * (SWITCH_COST_PCT / 100) + a.gasUsd / 2 + b.gasUsd / 2 + (a.chain !== b.chain ? BRIDGE_USD : 0);

    type Res = { name: string; final: number; hops: number; costs: number; daysInCash: number };
    const results: Res[] = [];

    // single-pool benchmarki
    pools.forEach((p, i) => {
      results.push({ name: `single: ${p.id}`, final: startUsd * Math.exp(cum[i][h1 - h0 + 1]), hops: 0, costs: 0, daysInCash: 0 });
    });
    results.push({ name: '100% USDC', final: startUsd, hops: 0, costs: 0, daysInCash: (h1 - h0) / 24 });

    // reguła (a) top-yield: przeskocz gdy inna pula ma yield wyższy o >X p.p. APR przez N godzin
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
      results.push({ name: `rotate: Δ>${X}p.p. przez ${Nh}h`, final: usd, hops, costs, daysInCash: 0 });
    }

    // reguła (b) jałowość: aktywna pula < Ymin% APR przez 48h → cash; powrót gdy top > Yre%
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
      results.push({ name: `idle→cash: <${Ymin}% APR 48h, powrót >${Yre}%`, final: usd, hops, costs, daysInCash: cashH / 24 });
    }

    // oracle: co tydzień wybiera pulę o najlepszym zwrocie NASTĘPNYCH 7 dni (górna granica)
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
      results.push({ name: 'ORACLE (zna przyszłe 7d — górna granica)', final: usd, hops, costs, daysInCash: 0 });
    }

    const days = (h1 - h0) / 24;
    console.log(`\n═══ wariant in-pool: ${v} · ${pools.length} pul · wspólne okno ${days.toFixed(0)} dni · start $${startUsd} · SIGMA_MODE=${process.env.SIGMA_MODE ?? 'swap'} ═══`);
    const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }).padStart(8);
    console.log('reguła'.padEnd(46) + 'koniec$'.padStart(8) + 'PnL%'.padStart(8) + 'przesk.'.padStart(8) + 'koszty$'.padStart(8) + 'dni-cash'.padStart(9));
    for (const r of [...results].sort((a, b) => b.final - a.final)) {
      console.log(r.name.padEnd(46) + fmt(r.final) + `${(((r.final - startUsd) / startUsd) * 100).toFixed(1)}%`.padStart(8) + String(r.hops).padStart(8) + fmt(r.costs) + r.daysInCash.toFixed(0).padStart(9));
    }
  }
  console.log('\nUWAGA: pule ETH/stable = ta sama beta — tabela mierzy WYŁĄCZNIE wartość wyboru puli (silnik fees) i koszty przeskoków, nie kierunek rynku.');
})();
