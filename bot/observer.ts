/**
 * bot/observer.ts — bot w trybie OBSERWUJ (krok C z UI-VISION.md).
 *   npm run bot          (docelowo: pm2 start "npm run bot" --name homos-bot na Windows)
 *
 * NIE wykonuje żadnych transakcji. Pętle:
 *  - co 60s: ceny/ticki obserwowanych pul,
 *  - co 15min: statystyki doradcy (zmienność, fee-yield, sugerowane zakresy),
 *  - co 5min: pozycje NFT obserwowanego portfela + rekomendacje,
 *  → stan do .bot/state.json (czyta go UI przez bot/server.ts),
 *  → nowe propozycje do .bot/proposals.json + log + (opcjonalnie) Telegram.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createPublicClient, http, fallback, PublicClient, formatUnits } from 'viem';
import { mainnet, base } from 'viem/chains';
import { BOT_POOLS, BotPool, RPC, NFT_MANAGER, WATCH_ADDRESS, INTERVALS, STATE_DIR } from './config';
import { fetchRecentSwaps, computeStats, assessPosition, suggestRange, PoolStats } from '../src/utils/advisor';
import { getAmountsForLiquidity, sqrtPriceX96ToHumanPrice } from '../src/utils/v3math';

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, STATE_DIR);
fs.mkdirSync(DIR, { recursive: true });
const STATE_PATH = path.join(DIR, 'state.json');
const PROPOSALS_PATH = path.join(DIR, 'proposals.json');
const LOG_PATH = path.join(DIR, 'observer.log');

const log = (msg: string) => {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_PATH, line + '\n');
};

const TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };

// --- klienci per chain (fallback wielu RPC) ---
const clients: Record<string, PublicClient> = {
  mainnet: createPublicClient({ chain: mainnet, transport: fallback(RPC.mainnet.map((u) => http(u))) }),
  base: createPublicClient({ chain: base, transport: fallback(RPC.base.map((u) => http(u))) }),
};

const SLOT0_ABI = [
  {
    inputs: [], name: 'slot0', stateMutability: 'view', type: 'function',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' }, { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' }, { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
] as const;

const PM_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'tokenOfOwnerByIndex', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  {
    name: 'positions', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'nonce', type: 'uint96' }, { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' }, { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' }, { name: 'tickLower', type: 'int24' }, { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' }, { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' }, { name: 'tokensOwed1', type: 'uint128' },
    ],
  },
] as const;

// --- stan w pamięci ---
interface PoolLive {
  id: string;
  ethUsd: number;
  tick: number;
  sqrtPriceX96: string;
  stats: PoolStats | null;
  suggestion: ReturnType<typeof suggestRange> | null;
  updatedAt: string;
}
interface WatchedPosition {
  tokenId: string;
  poolId: string;
  tickLower: number;
  tickUpper: number;
  amount0: number;
  amount1: number;
  valueUsd: number;
  inRange: boolean;
  advice: string;
  paybackDays: number | null;
}
interface Proposal {
  id: string;
  createdAt: string;
  tokenId: string;
  poolId: string;
  action: string;
  suggestedRange: { tickLower: number; tickUpper: number; usdLo: number; usdHi: number };
  costUsd: number;
  paybackDays: number | null;
  status: 'open' | 'dismissed';
}

const live: Record<string, PoolLive> = {};
let positions: WatchedPosition[] = [];
let proposals: Proposal[] = fs.existsSync(PROPOSALS_PATH) ? JSON.parse(fs.readFileSync(PROPOSALS_PATH, 'utf8')) : [];

const saveState = () => {
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      { updatedAt: new Date().toISOString(), mode: 'OBSERVE', watch: WATCH_ADDRESS, pools: Object.values(live), positions, proposals: proposals.filter((p) => p.status === 'open') },
      null, 2
    )
  );
};
const saveProposals = () => fs.writeFileSync(PROPOSALS_PATH, JSON.stringify(proposals, null, 2));

async function telegram(text: string) {
  const t = process.env.TG_TOKEN, c = process.env.TG_CHAT;
  if (!t || !c) return;
  try {
    await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: c, text }),
    });
  } catch (e) {
    log(`telegram error: ${e}`);
  }
}

// --- pętla cen (60s) ---
async function refreshPrices() {
  for (const p of BOT_POOLS) {
    try {
      const s = (await clients[p.chain].readContract({ address: p.address, abi: SLOT0_ABI, functionName: 'slot0' })) as readonly [bigint, number, ...unknown[]];
      const human = sqrtPriceX96ToHumanPrice(s[0], p.d0, p.d1);
      const prev = live[p.id];
      live[p.id] = {
        id: p.id,
        ethUsd: p.ethIsToken0 ? human : 1 / human,
        tick: s[1],
        sqrtPriceX96: s[0].toString(),
        stats: prev?.stats ?? null,
        suggestion: prev?.suggestion ?? null,
        updatedAt: new Date().toISOString(),
      };
    } catch (e) {
      log(`price ${p.id} failed: ${String(e).slice(0, 120)}`);
    }
  }
  saveState();
}

// --- pętla statystyk (15min) ---
async function refreshStats() {
  for (const p of BOT_POOLS) {
    try {
      const swaps = await fetchRecentSwaps(clients[p.chain] as any, p.address, p.chainId, 24);
      const stats = computeStats(swaps, p.chainId, p.d0, p.d1, p.feeBps / 1_000_000, TICK_SPACING[p.feeBps]);
      if (live[p.id] && stats) {
        live[p.id].stats = stats;
        live[p.id].suggestion = suggestRange(stats, p.feeBps as any, p.d0, p.d1);
        log(`stats ${p.id}: vol=${(stats.volDaily * 100).toFixed(2)}%/d feeYield=${(stats.feeYieldDaily * 100).toFixed(3)}%/d swaps=${stats.swapsAnalyzed}`);
      }
    } catch (e) {
      log(`stats ${p.id} failed: ${String(e).slice(0, 120)}`);
    }
  }
  saveState();
}

// --- pętla pozycji (5min) ---
async function refreshPositions() {
  const found: WatchedPosition[] = [];
  for (const chainId of [...new Set(BOT_POOLS.map((p) => p.chainId))]) {
    const chain = BOT_POOLS.find((p) => p.chainId === chainId)!.chain;
    const pm = NFT_MANAGER[chainId];
    try {
      const client = clients[chain];
      const n = Number(await client.readContract({ address: pm, abi: PM_ABI, functionName: 'balanceOf', args: [WATCH_ADDRESS] }));
      for (let i = 0; i < n; i++) {
        const tokenId = (await client.readContract({ address: pm, abi: PM_ABI, functionName: 'tokenOfOwnerByIndex', args: [WATCH_ADDRESS, BigInt(i)] })) as bigint;
        const pos = (await client.readContract({ address: pm, abi: PM_ABI, functionName: 'positions', args: [tokenId] })) as readonly [bigint, string, string, string, number, number, number, bigint, bigint, bigint, bigint, bigint];
        const [, , t0, t1, fee, lo, hi, L] = pos;
        if (L === 0n) continue;
        // dopasowanie puli po chain+fee (nasza lista ma po jednej parze na tier);
        // t0/t1 zachowane do przyszłej walidacji wielu par na tym samym tierze
        void t0; void t1;
        const match = BOT_POOLS.find((p) => p.chainId === chainId && p.feeBps === Number(fee));
        if (!match || !live[match.id]) continue;
        const lv = live[match.id];
        const { amount0, amount1 } = getAmountsForLiquidity(BigInt(lv.sqrtPriceX96), Number(lo), Number(hi), L);
        const a0 = parseFloat(formatUnits(amount0, match.d0));
        const a1 = parseFloat(formatUnits(amount1, match.d1));
        const px0 = match.ethIsToken0 ? lv.ethUsd : 1;
        const px1 = match.ethIsToken0 ? 1 : lv.ethUsd;
        const valueUsd = a0 * px0 + a1 * px1;
        let advice = 'BRAK_DANYCH';
        let payback: number | null = null;
        if (lv.stats) {
          const a = assessPosition(
            { tickLower: Number(lo), tickUpper: Number(hi), valueUsd },
            lv.stats, chainId, match.feeBps as any, match.feeBps / 1_000_000, match.d0, match.d1
          );
          advice = a.action;
          payback = a.paybackDays;
          if (a.action === 'REBALANCE') maybePropose(tokenId.toString(), match, a, valueUsd);
        }
        found.push({
          tokenId: tokenId.toString(), poolId: match.id,
          tickLower: Number(lo), tickUpper: Number(hi),
          amount0: a0, amount1: a1, valueUsd,
          inRange: lv.tick >= Number(lo) && lv.tick < Number(hi),
          advice, paybackDays: payback,
        });
      }
    } catch (e) {
      log(`positions chain ${chainId} failed: ${String(e).slice(0, 140)}`);
    }
  }
  positions = found;
  saveState();
}

function maybePropose(tokenId: string, pool: BotPool, a: ReturnType<typeof assessPosition>, valueUsd: number) {
  const key = `${tokenId}-${a.suggestion.tickLower}-${a.suggestion.tickUpper}`;
  if (proposals.some((p) => p.id === key && p.status === 'open')) return;
  const toUsd = (t: number) => {
    const raw = Math.pow(1.0001, t) * Math.pow(10, pool.d0 - pool.d1);
    return pool.ethIsToken0 ? raw : 1 / raw;
  };
  const [usdLo, usdHi] = [toUsd(a.suggestion.tickLower), toUsd(a.suggestion.tickUpper)].sort((x, y) => x - y);
  const prop: Proposal = {
    id: key, createdAt: new Date().toISOString(), tokenId, poolId: pool.id,
    action: 'REBALANCE',
    suggestedRange: { tickLower: a.suggestion.tickLower, tickUpper: a.suggestion.tickUpper, usdLo, usdHi },
    costUsd: a.costUsd, paybackDays: a.paybackDays, status: 'open',
  };
  proposals.push(prop);
  saveProposals();
  const msg = `🤖 HOMOS: propozycja REBALANS pozycji #${tokenId} (${pool.id}, $${valueUsd.toFixed(0)}) → zakres $${usdLo.toFixed(0)}–$${usdHi.toFixed(0)}, koszt ~$${a.costUsd.toFixed(2)}, payback ~${a.paybackDays?.toFixed(1)}d. [tryb OBSERWUJ — nic nie wykonano]`;
  log(msg);
  telegram(msg);
}

// --- start ---
(async () => {
  log(`observer start — watch=${WATCH_ADDRESS}, pools=${BOT_POOLS.map((p) => p.id).join(', ')}, tryb=OBSERWUJ`);
  await refreshPrices();
  await refreshStats();
  await refreshPositions();
  setInterval(refreshPrices, INTERVALS.priceSec * 1000);
  setInterval(refreshStats, INTERVALS.statsSec * 1000);
  setInterval(refreshPositions, INTERVALS.positionsSec * 1000);
  log('pętle uruchomione (60s ceny / 15min statystyki / 5min pozycje)');
})();
