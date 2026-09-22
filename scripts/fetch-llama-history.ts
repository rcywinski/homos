/**
 * fetch-llama-history.ts — fetches HISTORICAL APY/TVL series from DefiLlama
 * for the Uniswap pool universe. Data for the meta-backtest of the SELECTION
 * LAYER (does the "buy the top of the ranking" policy work — without lookahead bias).
 *
 *   npm run fetch:llama     (lightweight — a few minutes, API calls only)
 * Output: data/llama/universe.json + data/llama/history/<poolId>.json
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '..', 'data', 'llama');
const HIST = path.join(OUT, 'history');
fs.mkdirSync(HIST, { recursive: true });

const CHAINS = new Set(['Ethereum', 'Base', 'Arbitrum']);
const MIN_TVL = 1_000_000;
const MAX_POOLS = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('Fetching pool list…');
  const res = await fetch('https://yields.llama.fi/pools');
  if (!res.ok) throw new Error(`pools HTTP ${res.status}`);
  const all = (await res.json()).data as any[];

  const universe = all
    .filter(
      (p) =>
        (p.project === 'uniswap-v3' || p.project === 'uniswap-v4') &&
        CHAINS.has(p.chain) &&
        p.tvlUsd >= MIN_TVL
    )
    .sort((a, b) => b.tvlUsd - a.tvlUsd)
    .slice(0, MAX_POOLS)
    .map((p) => ({
      pool: p.pool, // DefiLlama uuid
      symbol: p.symbol,
      chain: p.chain,
      project: p.project,
      poolMeta: p.poolMeta,
      tvlUsd: p.tvlUsd,
      apyBase: p.apyBase,
      ilRisk: p.ilRisk,
      stablecoin: p.stablecoin,
      underlyingTokens: p.underlyingTokens,
    }));

  fs.writeFileSync(path.join(OUT, 'universe.json'), JSON.stringify(universe, null, 2));
  console.log(`Universe: ${universe.length} pools (TVL≥$1M, ETH/Base/Arb). Fetching histories…`);

  let done = 0;
  for (const p of universe) {
    const f = path.join(HIST, `${p.pool}.json`);
    // resume: skip only files refreshed TODAY (UTC calendar date, as in swap-cache).
    // The "mtime < 24h" heuristic FAILED: the cron runs at intervals close to 24h, so once
    // the mtimes of the whole universe got synchronized they permanently fell inside the
    // window and the history stopped refreshing (proof: rankings of 23.08 and 24.08 identical to the digit).
    const st = fs.statSync(f, { throwIfNoEntry: false });
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (st && new Date(st.mtimeMs).toISOString().slice(0, 10) === todayUtc) {
      done++;
      continue;
    }
    let ok = false;
    for (let attempt = 0; attempt < 6 && !ok; attempt++) {
      try {
        const r = await fetch(`https://yields.llama.fi/chart/${p.pool}`);
        if (r.status === 429) {
          const ra = Number(r.headers.get('retry-after')) || 0;
          const wait = Math.max(ra * 1000, 5000 * 2 ** attempt); // 5s,10s,20s,40s,80s
          process.stdout.write(`\r429 — waiting ${(wait / 1000).toFixed(0)}s (${p.symbol})   `);
          await sleep(wait);
          continue;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        // format: {data:[{timestamp, tvlUsd, apy, apyBase, apyReward}]}
        fs.writeFileSync(f, JSON.stringify({ meta: p, series: j.data }, null, 0));
        ok = true;
      } catch (e) {
        if (attempt === 5) console.warn(`\n${p.symbol} (${p.pool}): ${e}`);
        else await sleep(3000);
      }
    }
    done++;
    process.stdout.write(`\r${done}/${universe.length}  `);
    await sleep(1500); // respect the API (limit ~40-60/min on /chart)
  }
  console.log('\nDone → data/llama/');
})();
