/**
 * A stand-in bot for the Live page's browser tests (phase 5, step 5.3): writes made-up state files with fresh
 * timestamps into a temporary folder and serves them through the real read-only bot API (bot/server-public.ts).
 * The files also carry what must never reach the page (an owner address, an RPC URL with a key, a local path).
 * Run: node --import tsx showcase/e2e/live-fixture-bot.ts <port>
 */
import express from 'express';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { createPublicBotApp } from '../../bot/server-public';

export const OWNER_BAIT = '0x1111111111111111111111111111111111111111';
export const RPC_BAIT = 'https://base.example/v2/SECRETKEY';

const port = Number(process.argv[2] || 8811);
const dir = path.join(os.tmpdir(), 'homos-e2e-live-state');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const H = 3_600_000;

// Six pools: four open (one of them out of range at the latest sample), one in cash after a trend exit, one pending.
const pools: { id: string; status: string; price: number; lo: number; hi: number; outLast?: boolean }[] = [
  { id: 'mainnet-usdc-weth-030', status: 'open', price: 3000, lo: 2600, hi: 3400 },
  { id: 'mainnet-usdc-weth-005', status: 'open', price: 3000, lo: 2300, hi: 3700 },
  { id: 'base-weth-usdc-030', status: 'open', price: 3000, lo: 2700, hi: 3300, outLast: true },
  { id: 'base-cbbtc-weth-005', status: 'open', price: 0.033, lo: 0.031, hi: 0.035 },
  { id: 'base-weth-cbbtc-030', status: 'cash', price: 30, lo: 27, hi: 33 },
  { id: 'arbitrum-weth-usdc-005', status: 'pending', price: 3000, lo: 0, hi: 0 },
];
const positions: Record<string, unknown> = {};
const history: string[] = [];
for (const [i, p] of pools.entries()) {
  positions[p.id] = {
    poolId: p.id, status: p.status, tickLower: -200000, tickUpper: -190000, capitalUsd: 10_000, feesUsd: p.status === 'pending' ? 0 : 10 + i,
    feesSinceRebalanceUsd: 2, costsUsd: 1.5, rebalances: i % 2, hedge: null, hedgePnlRealizedUsd: 0, openedAt: iso(6 * H), startedAt: iso(6 * H),
    outOfRangeSince: p.outLast ? now - 0.5 * H : null, wallet: OWNER_BAIT,
  };
  if (p.status === 'pending') continue;
  for (let k = 24; k >= 0; k--) {
    const last = k === 0;
    history.push(JSON.stringify({
      ts: iso(k * 0.25 * H), poolId: p.id, status: p.status, equityUsd: 10_000 + (24 - k) * (i + 1), hodlUsd: 10_000 + (24 - k) * i,
      feesUsd: (24 - k) * 0.5, costsUsd: 1.5, inRange: !(p.outLast && last), trendDown: p.status === 'cash', rebalances: i % 2,
      price: p.price * (1 + 0.002 * Math.sin(k)), ...(p.status === 'open' ? { lo: p.lo, hi: p.hi } : {}),
    }));
  }
}
writeFileSync(path.join(dir, 'paper-state.json'), JSON.stringify({ startedAt: iso(6 * H), capitalPerPoolUsd: 10_000, updatedAt: iso(0), positions, secret: '/Users/owner/HOMOS/.env' }));
writeFileSync(path.join(dir, 'paper-history.ndjson'), history.join('\n') + '\n');
writeFileSync(path.join(dir, 'paper-events.ndjson'), [
  { ts: iso(6 * H), poolId: 'mainnet-usdc-weth-030', kind: 'OPEN', note: RPC_BAIT },
  { ts: iso(3 * H), poolId: 'base-weth-cbbtc-030', kind: 'EXIT_TREND', who: OWNER_BAIT },
  { ts: iso(1 * H), poolId: 'mainnet-usdc-weth-005', kind: 'REBALANCE' },
].map((e) => JSON.stringify(e)).join('\n') + '\n');
// Observation history (every 15 min) and two walk-forward result files, the names the page asks for.
const obs: string[] = [];
for (const p of pools) for (let k = 24; k >= 0; k--) obs.push(JSON.stringify({ ts: iso(k * 0.25 * H), poolId: p.id, price: p.price * (1 + 0.003 * Math.cos(k)), volDaily: 0.03, feeYieldDaily: 0.001, rangeLo: p.lo || null, rangeHi: p.hi || null, emaGapPct: -1 + k * 0.05, extra: RPC_BAIT }));
writeFileSync(path.join(dir, 'history.ndjson'), obs.join('\n') + '\n');
mkdirSync(path.join(dir, 'results'), { recursive: true });
for (const id of ['mainnet-usdc-weth-030', 'base-weth-usdc-030']) {
  writeFileSync(path.join(dir, 'results', `walkforward-${id}-720d-30d.json`), JSON.stringify({ id, source: '/Users/owner/backtest', summary: { hybrid: { mean: 1.25, winPct: 62, worst: -3.5 }, hodl: { mean: 0.4, winPct: 51, worst: -9.1 }, ...(id === 'base-weth-usdc-030' ? { 'Pasywny ±50%': { mean: 0.1, winPct: 50, worst: -11.7 } } : {}) } }));
}
// Both rankings and the daily model, as the selector and the nightly steps write them (rows carry bait fields).
const rankRow = (rank: number, symbol: string, chain: string, botPoolId: string | null, uuid: string) => ({
  rank, symbol, chain, poolMeta: '0.05%', apy7d: 40 - rank, streak: 4, eligible: true, tvlUsd: 5_000_000, botPoolId, llamaUuid: uuid,
  link: 'https://defillama.example/pool', addr: OWNER_BAIT,
});
const day = iso(0).slice(0, 10);
writeFileSync(path.join(dir, 'selector-ranking.json'), JSON.stringify({ day, generatedAt: iso(0), criteria: { window: '7d', persistDays: 3, minTvlUsd: 1_000_000, source: RPC_BAIT },
  rows: [rankRow(1, 'WETH-USDC', 'Base', 'base-weth-usdc-030', 'u-1'), rankRow(2, 'WETH-USDT', 'Ethereum', null, '3a2f2faf-6423-4569-ad93-821c54cbe702')] }));
writeFileSync(path.join(dir, 'wide-ranking.json'), JSON.stringify({ day, generatedAt: iso(0), criteria: { window: '30d' },
  rows: [{ ...rankRow(1, 'TBTC-WBTC', 'Ethereum', null, 'u-3'), cls: 'pegged-btc', feeAprWide: 3.1, dragPct: 0.4, sigmaAnnPct: 2, driftFlag: false, wOursPct: 5 }] }));
writeFileSync(path.join(dir, 'wide-daily.json'), JSON.stringify({ generatedAt: iso(0), params: {}, pools: {
  'u-3': { symbol: 'TBTC-WBTC', chain: 'Ethereum', cls: 'pegged-btc', widthPct: 5, feeCapture: 0.5, ageDays: 900, windows: { w365: { n: 13, latest: { lpPct: -28.24, hodlPct: -29.73, deltaPct: 1.49, feesPct: 3, inRangePct: 100, recenters: 0 }, medLpPct: -20, medHodlPct: -21, medDeltaPct: 1.99, worstDeltaPct: -1, winPct: 70 }, w720: null }, flatPct365: 100, feeAprMean365: 3 },
} }));

// Pool state as the observer publishes it: for the cbBTC pools "ethUsd" is the price of cbBTC (as on the box), and
// the suggestion is in the pool's raw orientation (token1 per token0).
const statePools = [
  { id: 'mainnet-usdc-weth-030', ethUsd: 3000, stats: { volDaily: 0.031, feeYieldDaily: 0.0256, swapsAnalyzed: 900, hoursCovered: 24 }, suggestion: { tickLower: 195000, tickUpper: 198000, widthPct: 16.7, priceLower: 0.000294, priceUpper: 0.000400 } },
  { id: 'mainnet-usdc-weth-005', ethUsd: 3000, stats: { volDaily: 0.03, feeYieldDaily: 0.1534, swapsAnalyzed: 2500, hoursCovered: 24 }, suggestion: { tickLower: 194000, tickUpper: 199000, widthPct: 30.2, priceLower: 0.000256, priceUpper: 0.000434 } },
  { id: 'base-weth-usdc-030', ethUsd: 3000, stats: { volDaily: 0.03, feeYieldDaily: 0.0022, swapsAnalyzed: 700, hoursCovered: 24 }, suggestion: { tickLower: -205000, tickUpper: -197000, widthPct: 50, priceLower: 2000, priceUpper: 4500 } },
  { id: 'base-cbbtc-weth-005', ethUsd: 100000, stats: { volDaily: 0.012, feeYieldDaily: 0.002, swapsAnalyzed: 300, hoursCovered: 24 }, suggestion: { tickLower: -39000, tickUpper: -32000, widthPct: 40, priceLower: 0.0199, priceUpper: 0.039 } },
  { id: 'base-weth-cbbtc-030', ethUsd: 100000, stats: { volDaily: 0.012, feeYieldDaily: 0.00035, swapsAnalyzed: 120, hoursCovered: 24 }, suggestion: { tickLower: -36900, tickUpper: -34800, widthPct: 11, priceLower: 0.0251, priceUpper: 0.031 } },
  { id: 'arbitrum-weth-usdc-005', ethUsd: 3000, stats: null, suggestion: null },
].map((p) => ({
  ...p, tick: 1, sqrtPriceX96: '1', updatedAt: iso(0), trendGapPct: -1.2,
  // Statistics age (Live only): mainnet 0.05% is stale with an incomplete last read; the others are fresh.
  ...(p.stats ? { statsAt: iso(p.id === 'mainnet-usdc-weth-005' ? 0.8 * H : 0.1 * H), statsWindow: { at: iso(0.05 * H), chunks: 8, failed: p.id === 'mainnet-usdc-weth-005' ? 8 : 0, ok: p.id !== 'mainnet-usdc-weth-005' } } : {}),
  // the three card states: arbitrum pending after a complete but quiet read; base-weth-usdc-030 open, stale and quiet
  ...(p.id === 'arbitrum-weth-usdc-005' ? { statsWindow: { at: iso(0.05 * H), chunks: 35, failed: 0, ok: false } } : {}),
  ...(p.id === 'base-weth-usdc-030' ? { statsAt: iso(1.5 * H), statsWindow: { at: iso(0.05 * H), chunks: 44, failed: 0, ok: false } } : {}),
}));
writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ updatedAt: iso(0), mode: 'OBSERVE', watch: OWNER_BAIT, rpc: RPC_BAIT, flatParams: { enterGap: 2, exitGap: 5, confirmH: 12 }, pools: statePools }));

// The test-only harness page (showcase/e2e/harness), same origin as the API, when it has been built.
const app = express();
const harnessDist = path.join(__dirname, 'harness-dist');
if (existsSync(harnessDist)) {
  app.get('/harness/', (_req, res) => res.sendFile(path.join(__dirname, 'harness', 'index.html')));
  app.use('/harness', express.static(harnessDist));
}
app.use(createPublicBotApp({ stateDir: dir, resultsDir: path.join(dir, 'results') }));
app.listen(port, '127.0.0.1', () => console.log(`[live-fixture-bot] on ${port}`));
