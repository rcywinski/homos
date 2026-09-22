/**
 * scan-universe.ts — GLOBAL scan of the pool market (Pool Scanner 2.0).
 *   npx tsx backtest/scan-universe.ts
 *
 * Idea (2026-08-10, after analyzing a friend's bot interface): do not limit the
 * search to our few pairs, but classify the WHOLE DefiLlama market into
 * BUCKETS with different IL profiles and rank within a bucket:
 *   - stable-stable  (USDC-USDT, FRAX-USDC…)   — no IL, risk: depeg
 *   - eth-lst        (wstETH-WETH, weETH-WETH…) — staking drift, risk: depeg
 *   - btc-btc        (WBTC-cbBTC…)              — as above
 *   - major-volatile (WETH-USDC, cbBTC-WETH…)   — our current core, full IL
 *   - exotic         (the rest)                 — token beta dominates (verdict B5)
 * Comparing APR ACROSS buckets is a category error (same APR = different IL);
 * ranking only makes sense WITHIN a bucket.
 *
 * For pegged pairs the key metric is volumeUsd7d/tvlUsd (fee throughput per $1
 * of TVL) — this is the raw material that xN concentration turns into a high
 * position APR (hence the friend's 100-378%: ultra-narrow range on a pegged pair).
 *
 * Report: top-10 per bucket in two views:
 *   (a) EXECUTABLE for us (uniswap-v3, Ethereum/Base/Arbitrum),
 *   (b) WHOLE MARKET (all projects/chains) — awareness of what we are missing
 *       (e.g. aerodrome-slipstream on Base is a v3 fork — a candidate for the future).
 * Output: backtest/results/scan-universe.json + tables on stdout.
 * One API call (/pools), zero AI tokens — suitable for the pipeline.
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, 'results');
fs.mkdirSync(OUT, { recursive: true });

const MIN_TVL = 1_000_000;
const EXEC_PROJECTS = new Set(['uniswap-v3']);
const EXEC_CHAINS = new Set(['Ethereum', 'Base', 'Arbitrum']);
const TOP_N = 10;

// --- token classification (symbols, uppercase) ---
const STABLE = new Set(['USDC', 'USDT', 'DAI', 'USDS', 'FRAX', 'LUSD', 'GHO', 'USDE', 'SUSDE', 'TUSD', 'USDBC', 'EURC', 'PYUSD', 'CRVUSD', 'FDUSD', 'USDP', 'DOLA', 'MIM', 'USD+', 'USDM', 'RLUSD', 'USD1', 'USDL']);
const ETH_FAM = new Set(['WETH', 'ETH', 'WSTETH', 'STETH', 'WEETH', 'EZETH', 'RETH', 'CBETH', 'RSETH', 'WRSETH', 'SWETH', 'ETHX', 'OETH', 'METH', 'FRXETH', 'SFRXETH', 'OSETH', 'ANKRETH', 'CMETH', 'PUFETH', 'STONE', 'WBETH']);
const BTC_FAM = new Set(['WBTC', 'CBBTC', 'TBTC', 'LBTC', 'EBTC', 'BTCB', 'FBTC', 'SOLVBTC', 'PUMPBTC', 'UNIBTC', 'MBTC', 'SBTC']);

type Bucket = 'stable-stable' | 'eth-lst' | 'btc-btc' | 'major-volatile' | 'exotic';

function classify(symbol: string): Bucket {
  const parts = symbol.toUpperCase().split('-').map((s) => s.trim());
  if (parts.length < 2) return 'exotic';
  const inSet = (t: string, s: Set<string>) => s.has(t);
  const allStable = parts.every((t) => inSet(t, STABLE));
  const allEth = parts.every((t) => inSet(t, ETH_FAM));
  const allBtc = parts.every((t) => inSet(t, BTC_FAM));
  if (allStable) return 'stable-stable';
  if (allEth) return 'eth-lst';
  if (allBtc) return 'btc-btc';
  const isMajor = (t: string) => inSet(t, STABLE) || inSet(t, ETH_FAM) || inSet(t, BTC_FAM);
  if (parts.every(isMajor)) return 'major-volatile';
  return 'exotic';
}

interface Row {
  project: string;
  chain: string;
  symbol: string;
  poolMeta: string | null;
  pool: string;
  tvlUsd: number;
  apyBase: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  volumeUsd7d: number | null;
  volTvl7d: number | null; // volumeUsd7d / tvlUsd — throughput per $1 TVL (weekly)
  bucket: Bucket;
  executable: boolean;
}

(async () => {
  console.log('Fetching the full /pools snapshot from DefiLlama…');
  const res = await fetch('https://yields.llama.fi/pools');
  if (!res.ok) throw new Error(`pools HTTP ${res.status}`);
  const all = (await res.json()).data as any[];
  console.log(`Pools in snapshot: ${all.length}`);

  const rows: Row[] = all
    .filter((p) => p.tvlUsd >= MIN_TVL && p.symbol && p.symbol.includes('-'))
    .map((p) => ({
      project: p.project,
      chain: p.chain,
      symbol: p.symbol,
      poolMeta: p.poolMeta ?? null,
      pool: p.pool,
      tvlUsd: p.tvlUsd,
      apyBase: p.apyBase ?? null,
      apyBase7d: p.apyBase7d ?? null,
      apyMean30d: p.apyMean30d ?? null,
      volumeUsd7d: p.volumeUsd7d ?? null,
      volTvl7d: p.volumeUsd7d && p.tvlUsd ? p.volumeUsd7d / p.tvlUsd : null,
      bucket: classify(p.symbol),
      executable: EXEC_PROJECTS.has(p.project) && EXEC_CHAINS.has(p.chain),
    }));

  // score: the most stable available measure (30d mean > 7d > current);
  // for pegged buckets we add vol/TVL throughput as an informational tiebreaker
  const score = (r: Row) => r.apyMean30d ?? r.apyBase7d ?? r.apyBase ?? -1;

  const buckets: Bucket[] = ['stable-stable', 'eth-lst', 'btc-btc', 'major-volatile', 'exotic'];
  const report: Record<string, unknown> = { generatedAt: null, minTvl: MIN_TVL, buckets: {} };

  const fmt = (r: Row) =>
    `${(r.symbol + ' ' + (r.poolMeta ?? '')).padEnd(28)} ${r.project.padEnd(22)} ${r.chain.padEnd(10)}` +
    `${('$' + (r.tvlUsd / 1e6).toFixed(1) + 'M').padStart(9)}` +
    `${(score(r) >= 0 ? score(r).toFixed(1) + '%' : 'n/a').padStart(8)}` +
    `${(r.volTvl7d !== null ? r.volTvl7d.toFixed(2) : 'n/a').padStart(8)}`;

  for (const b of buckets) {
    const inBucket = rows.filter((r) => r.bucket === b && score(r) > 0);
    const execTop = inBucket.filter((r) => r.executable).sort((a, z) => score(z) - score(a)).slice(0, TOP_N);
    const globalTop = inBucket.sort((a, z) => score(z) - score(a)).slice(0, TOP_N);
    // which projects dominate the bucket (strategically: what our stack cannot do)
    const byProject = new Map<string, number>();
    for (const r of inBucket) byProject.set(r.project, (byProject.get(r.project) || 0) + r.tvlUsd);
    const domProjects = [...byProject.entries()].sort((a, z) => z[1] - a[1]).slice(0, 5);

    console.log(`\n═══ ${b.toUpperCase()} — ${inBucket.length} pools ≥$1M ═══`);
    console.log('   ' + 'pair'.padEnd(28) + 'project'.padEnd(22) + 'chain'.padEnd(10) + 'TVL'.padStart(9) + 'APR*'.padStart(8) + 'v/tvl7d'.padStart(8));
    console.log(' EXECUTABLE (uniswap-v3, ETH/Base/Arb):');
    for (const r of execTop) console.log('   ' + fmt(r));
    if (!execTop.length) console.log('   (none)');
    console.log(' WHOLE MARKET:');
    for (const r of globalTop) console.log('   ' + fmt(r));
    console.log(' Dominant projects (bucket TVL): ' + domProjects.map(([p, t]) => `${p} $${(t / 1e6).toFixed(0)}M`).join(' · '));

    (report.buckets as any)[b] = {
      count: inBucket.length,
      executableTop: execTop,
      globalTop,
      dominantProjects: domProjects.map(([project, tvl]) => ({ project, tvl })),
    };
  }
  console.log('\n* APR = apyMean30d, fallback apyBase7d/apyBase. v/tvl7d = 7d volume per $1 TVL');
  console.log('  (raw material for concentration — key for pegged pairs). Compare ONLY within a bucket.');

  fs.writeFileSync(path.join(OUT, 'scan-universe.json'), JSON.stringify(report, null, 2));
  console.log(`\nSaved → backtest/results/scan-universe.json`);
})();
