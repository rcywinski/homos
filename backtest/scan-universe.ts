/**
 * scan-universe.ts — GLOBALNY skan rynku pul (Pool Scanner 2.0).
 *   npx tsx backtest/scan-universe.ts
 *
 * Pomysł (2026-08-10, po analizie interfejsu bota znajomego): nie ograniczać
 * poszukiwań do naszych kilku par, tylko sklasyfikować CAŁY rynek z DefiLlamy
 * na KOSZYKI o różnych profilach IL i rankować wewnątrz koszyka:
 *   - stable-stable  (USDC-USDT, FRAX-USDC…)   — brak IL, ryzyko: depeg
 *   - eth-lst        (wstETH-WETH, weETH-WETH…) — dryf stakingowy, ryzyko: depeg
 *   - btc-btc        (WBTC-cbBTC…)              — jw.
 *   - major-volatile (WETH-USDC, cbBTC-WETH…)   — nasz obecny rdzeń, pełny IL
 *   - exotic         (reszta)                   — beta tokena dominuje (werdykt B5)
 * Porównywanie APR MIĘDZY koszykami to błąd kategorii (ten sam APR = inne IL);
 * ranking ma sens tylko WEWNĄTRZ koszyka.
 *
 * Dla par spiętych kluczowa metryka to volumeUsd7d/tvlUsd (przerób fee na $1
 * TVL) — to jest surowiec, który koncentracja ×N zamienia w wysokie APR pozycji
 * (dlatego u znajomego 100-378%: ultra-wąski zakres na spiętej parze).
 *
 * Raport: top-10 per koszyk w dwóch widokach:
 *   (a) WYKONYWALNE u nas (uniswap-v3, Ethereum/Base/Arbitrum),
 *   (b) CAŁY RYNEK (wszystkie projekty/chainy) — świadomość, co nas omija
 *       (np. aerodrome-slipstream na Base to fork v3 — kandydat na przyszłość).
 * Wyjście: backtest/results/scan-universe.json + tabele na stdout.
 * Jedno wywołanie API (/pools), zero tokenów AI — nadaje się do pipeline'u.
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, 'results');
fs.mkdirSync(OUT, { recursive: true });

const MIN_TVL = 1_000_000;
const EXEC_PROJECTS = new Set(['uniswap-v3']);
const EXEC_CHAINS = new Set(['Ethereum', 'Base', 'Arbitrum']);
const TOP_N = 10;

// --- klasyfikacja tokenów (symbole, uppercase) ---
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
  volTvl7d: number | null; // volumeUsd7d / tvlUsd — przerób na $1 TVL (tygodniowy)
  bucket: Bucket;
  executable: boolean;
}

(async () => {
  console.log('Pobieram pełny snapshot /pools z DefiLlamy…');
  const res = await fetch('https://yields.llama.fi/pools');
  if (!res.ok) throw new Error(`pools HTTP ${res.status}`);
  const all = (await res.json()).data as any[];
  console.log(`Pul w snapshocie: ${all.length}`);

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

  // score: stabilniejsza miara z dostępnych (30d śr. > 7d > bieżąca);
  // dla koszyków spiętych dokładamy przerób vol/TVL jako tiebreaker informacyjny
  const score = (r: Row) => r.apyMean30d ?? r.apyBase7d ?? r.apyBase ?? -1;

  const buckets: Bucket[] = ['stable-stable', 'eth-lst', 'btc-btc', 'major-volatile', 'exotic'];
  const report: Record<string, unknown> = { generatedAt: null, minTvl: MIN_TVL, buckets: {} };

  const fmt = (r: Row) =>
    `${(r.symbol + ' ' + (r.poolMeta ?? '')).padEnd(28)} ${r.project.padEnd(22)} ${r.chain.padEnd(10)}` +
    `${('$' + (r.tvlUsd / 1e6).toFixed(1) + 'M').padStart(9)}` +
    `${(score(r) >= 0 ? score(r).toFixed(1) + '%' : 'b.d.').padStart(8)}` +
    `${(r.volTvl7d !== null ? r.volTvl7d.toFixed(2) : 'b.d.').padStart(8)}`;

  for (const b of buckets) {
    const inBucket = rows.filter((r) => r.bucket === b && score(r) > 0);
    const execTop = inBucket.filter((r) => r.executable).sort((a, z) => score(z) - score(a)).slice(0, TOP_N);
    const globalTop = inBucket.sort((a, z) => score(z) - score(a)).slice(0, TOP_N);
    // które projekty dominują koszyk (strategicznie: czego nasz stack nie umie)
    const byProject = new Map<string, number>();
    for (const r of inBucket) byProject.set(r.project, (byProject.get(r.project) || 0) + r.tvlUsd);
    const domProjects = [...byProject.entries()].sort((a, z) => z[1] - a[1]).slice(0, 5);

    console.log(`\n═══ ${b.toUpperCase()} — ${inBucket.length} pul ≥$1M ═══`);
    console.log('   ' + 'para'.padEnd(28) + 'projekt'.padEnd(22) + 'chain'.padEnd(10) + 'TVL'.padStart(9) + 'APR*'.padStart(8) + 'v/tvl7d'.padStart(8));
    console.log(' WYKONYWALNE (uniswap-v3, ETH/Base/Arb):');
    for (const r of execTop) console.log('   ' + fmt(r));
    if (!execTop.length) console.log('   (brak)');
    console.log(' CAŁY RYNEK:');
    for (const r of globalTop) console.log('   ' + fmt(r));
    console.log(' Dominujące projekty (TVL koszyka): ' + domProjects.map(([p, t]) => `${p} $${(t / 1e6).toFixed(0)}M`).join(' · '));

    (report.buckets as any)[b] = {
      count: inBucket.length,
      executableTop: execTop,
      globalTop,
      dominantProjects: domProjects.map(([project, tvl]) => ({ project, tvl })),
    };
  }
  console.log('\n* APR = apyMean30d, fallback apyBase7d/apyBase. v/tvl7d = wolumen 7d na $1 TVL');
  console.log('  (surowiec koncentracji — klucz dla par spiętych). Porównuj TYLKO wewnątrz koszyka.');

  fs.writeFileSync(path.join(OUT, 'scan-universe.json'), JSON.stringify(report, null, 2));
  console.log(`\nZapisano → backtest/results/scan-universe.json`);
})();
