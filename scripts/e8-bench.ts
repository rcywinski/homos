/**
 * e8-bench.ts — E8.0 BENCHMARK „NUDNY": realny HODL+yield bez IL, do
 * którego porównujemy WSZYSTKO (E8.1–E8.3 i decyzję o skali 24.09).
 * Jedno wywołanie do yields.llama.fi/pools (jak scan-universe), filtr
 * po projektach/symbolach, tabela apy / apyMean30d / TVL + rekomendacja
 * BENCH_APR (mediana apyMean30d topowych pul USDC na Aave/Morpho).
 *
 *   npx tsx scripts/e8-bench.ts
 * Wyjście: konsola + backtest/results/e8-bench-<YYYY-MM-DD>.json
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '..', 'backtest', 'results');
type Pool = { chain: string; project: string; symbol: string; tvlUsd: number; apy: number; apyBase: number | null; apyReward: number | null; apyMean30d: number | null; pool: string; poolMeta?: string | null };

const GROUPS: Array<{ name: string; test: (p: Pool) => boolean; minTvl: number }> = [
  { name: 'USDC lending (Aave v3)', test: (p) => p.project === 'aave-v3' && p.symbol === 'USDC', minTvl: 20e6 },
  { name: 'USDC lending (Morpho)', test: (p) => /^morpho/.test(p.project) && /^USDC$/.test(p.symbol), minTvl: 20e6 },
  { name: 'USDT/USDS lending (Aave v3 / Sky)', test: (p) => (p.project === 'aave-v3' && /^(USDT|USDS)$/.test(p.symbol)) || (/^sky|^maker/.test(p.project) && /USDS|DAI/.test(p.symbol)), minTvl: 20e6 },
  { name: 'ETH staking (Lido wstETH / Rocket / Coinbase)', test: (p) => /^(lido|rocket-pool|coinbase-wrapped-staked-eth)$/.test(p.project) && /ETH/.test(p.symbol), minTvl: 50e6 },
  { name: 'ETH lending (Aave v3 WETH/wstETH supply)', test: (p) => p.project === 'aave-v3' && /^(WETH|WSTETH)$/.test(p.symbol), minTvl: 20e6 },
  { name: 'Pendle PT (stały yield USDC/USDe/ETH)', test: (p) => p.project === 'pendle' && /USDC|USDE|SUSDE|ETH/.test(p.symbol) && !/-/.test(p.symbol.replace(/^PT-/, '')), minTvl: 10e6 },
  { name: 'Stable-stable LP (kontrola, wiemy że ~1–3%)', test: (p) => /^(curve-dex|uniswap-v3|aerodrome-slipstream)$/.test(p.project) && /^(USDC|USDT|DAI|USDS)-(USDC|USDT|DAI|USDS)$/.test(p.symbol), minTvl: 10e6 },
];
const CHAINS = new Set(['Ethereum', 'Base', 'Arbitrum']);

(async () => {
  const r = await fetch('https://yields.llama.fi/pools', { signal: AbortSignal.timeout(90_000) });
  if (!r.ok) { console.error(`HTTP ${r.status}`); process.exit(1); }
  const pools = ((await r.json()).data as Pool[]).filter((p) => CHAINS.has(p.chain));
  const day = new Date().toISOString().slice(0, 10);
  const out: any = { day, groups: {} };
  const f = (x: number | null | undefined, w = 6) => (x === null || x === undefined ? '—'.padStart(w) : x.toFixed(2).padStart(w));
  for (const g of GROUPS) {
    const rows = pools.filter((p) => g.test(p) && p.tvlUsd >= g.minTvl).sort((a, b) => (b.apyMean30d ?? b.apy) - (a.apyMean30d ?? a.apy)).slice(0, 8);
    console.log(`\n━━ ${g.name} (TVL ≥ $${(g.minTvl / 1e6).toFixed(0)}M, ${rows.length} pul)`);
    console.log('chain'.padEnd(9) + 'projekt'.padEnd(26) + 'symbol'.padEnd(22) + 'apy'.padStart(7) + 'base'.padStart(7) + 'rew'.padStart(7) + 'śr30d'.padStart(7) + '   TVL $M');
    for (const p of rows) console.log(p.chain.padEnd(9) + p.project.slice(0, 25).padEnd(26) + (p.symbol + (p.poolMeta ? ` (${p.poolMeta})` : '')).slice(0, 21).padEnd(22) + f(p.apy, 7) + f(p.apyBase, 7) + f(p.apyReward, 7) + f(p.apyMean30d, 7) + (p.tvlUsd / 1e6).toFixed(0).padStart(9));
    out.groups[g.name] = rows.map((p) => ({ chain: p.chain, project: p.project, symbol: p.symbol, meta: p.poolMeta ?? null, apy: p.apy, apyBase: p.apyBase, apyReward: p.apyReward, apyMean30d: p.apyMean30d, tvlUsd: p.tvlUsd, pool: p.pool }));
  }
  // BENCH_APR: mediana apyMean30d z USDC Aave+Morpho (bez nagród — apyBase, jeśli jest)
  const usdc = pools.filter((p) => (p.project === 'aave-v3' || /^morpho/.test(p.project)) && p.symbol === 'USDC' && p.tvlUsd >= 20e6).map((p) => p.apyMean30d ?? p.apyBase ?? p.apy).filter((x) => x > 0).sort((a, b) => a - b);
  const bench = usdc.length ? usdc[usdc.length >> 1] : null;
  const eth = pools.filter((p) => /^(lido)$/.test(p.project) && /STETH/.test(p.symbol)).map((p) => p.apyMean30d ?? p.apy)[0] ?? null;
  console.log(`\nREKOMENDACJA E8.0: BENCH_APR (USDC, mediana śr30d Aave/Morpho, n=${usdc.length}) = ${bench?.toFixed(2)}%/r · ETH staking (Lido) ≈ ${eth?.toFixed(2)}%/r`);
  console.log(`HODL+yield 50/50 ≈ ${bench !== null && eth !== null ? ((bench + eth) / 2).toFixed(2) : '?'}%/r ponad czysty HODL — to poprzeczka dla LP (E8.3) i dla skali. Użyj: BENCH_APR=${bench?.toFixed(1)} w e8-carry/e8-house.`);
  out.benchAprUsdc = bench; out.ethStakingApr = eth;
  fs.mkdirSync(OUT, { recursive: true });
  const outF = path.join(OUT, `e8-bench-${day}.json`);
  fs.writeFileSync(outF, JSON.stringify(out, null, 2));
  console.log(`→ ${outF}`);
})();
