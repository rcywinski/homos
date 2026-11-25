/**
 * A stand-in bot for the Live page's browser tests (phase 5, step 5.3): writes made-up state files with fresh
 * timestamps into a temporary folder and serves them through the real read-only bot API (bot/server-public.ts).
 * The files also carry what must never reach the page (an owner address, an RPC URL with a key, a local path).
 * Run: node --import tsx showcase/e2e/live-fixture-bot.ts <port>
 */
import { mkdirSync, rmSync, writeFileSync } from 'fs';
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
  writeFileSync(path.join(dir, 'results', `walkforward-${id}-720d-30d.json`), JSON.stringify({ id, source: '/Users/owner/backtest', summary: { hybrid: { mean: 1.25, winPct: 62, worst: -3.5 }, hodl: { mean: 0.4, winPct: 51, worst: -9.1 } } }));
}
writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ updatedAt: iso(0), mode: 'OBSERVE', watch: OWNER_BAIT, rpc: RPC_BAIT, pools: pools.map((p) => ({ id: p.id, ethUsd: p.price, tick: 1, updatedAt: iso(0) })) }));

createPublicBotApp({ stateDir: dir, resultsDir: path.join(dir, 'results') }).listen(port, '127.0.0.1', () => console.log(`[live-fixture-bot] on ${port}`));
