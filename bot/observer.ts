/**
 * bot/observer.ts — bot in OBSERVE mode (step C from UI-VISION.md).
 *   npm run bot          (target: pm2 start "npm run bot" --name homos-bot on Windows)
 *
 * Executes NO transactions. Loops:
 *  - every 60s: prices/ticks of watched pools,
 *  - every 15min: advisor statistics (volatility, fee-yield, suggested ranges),
 *  - every 5min: NFT positions of the watched wallet + recommendations,
 *  → state to .bot/state.json (read by the UI via bot/server.ts),
 *  → new proposals to .bot/proposals.json + log + (optionally) Telegram.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { createPublicClient, http, fallback, formatUnits, type PublicClient } from 'viem';

import { mainnet, base, arbitrum } from 'viem/chains';
import { BOT_POOLS, BotPool, RPC, NFT_MANAGER, WATCH_ADDRESS, INTERVALS, STATE_DIR, TREND, FLAT, TRANCHE } from './config';
import { ADVISOR_PARAMS } from '../src/utils/advisor';
import { fetchRecentSwaps, computeStats, assessPosition, suggestRange, suggestFixedRange, PoolStats } from '../src/utils/advisor';
import { getAmountsForLiquidity, sqrtPriceX96ToHumanPrice } from '../src/utils/v3math';
import { runSelectorIfDue, SelectorProposal } from './selector';
import { paperTick, LegPrices } from './paper';
import { updateLedger, readLedger, LedgerEntry } from './ledger';

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

// --- clients per chain (fallback across multiple RPCs) ---
const clients = {
  mainnet: createPublicClient({ chain: mainnet, transport: fallback(RPC.mainnet.map((u) => http(u))) }),
  base: createPublicClient({ chain: base, transport: fallback(RPC.base.map((u) => http(u))) }),
  arbitrum: createPublicClient({ chain: arbitrum, transport: fallback(RPC.arbitrum.map((u) => http(u))) }),
};

// --- live gas (review decision 26.08 — DECISIONS 6a / TASKS-RECAL §4) ---
// The $8 constant on mainnet penalised payback 4-8x at real gas of 0.3-1.4 Gwei
// (confirmed in the field 25.08: collect $0.27 against a threshold computed from the constant).
// Cycle cost = eth_gasPrice × GAS_UNITS_CYCLE × ETH rate; the floor protects
// against underestimation on L2 (the L1-data fee is invisible in execution gasPrice),
// the old constant remains ONLY as a fallback before the first read.
// Backtest/paper deliberately NOT touched — per-regime cost comes in the
// recalibration batch (recalibration = bump of algoVersion).
const GAS_UNITS_CYCLE = 800_000; // decrease+collect+swap+mint+approvals (~consistent with the measured $1-2 at 0.3-1.4 Gwei)
const GAS_FLOOR_USD: Record<string, number> = { mainnet: 0.5, base: 0.08, arbitrum: 0.1 };
const GAS_STATIC_USD: Record<string, number> = { mainnet: 8, base: 0.08, arbitrum: 0.1 };
const gasUsdLive: Record<string, number> = {};
const gasUsdFor = (chain: BotPool['chain']): number => gasUsdLive[chain] ?? GAS_STATIC_USD[chain] ?? 5;
async function refreshGas() {
  // ETH rate from the first live pool quoted in USD (no separate query)
  const ethUsd = BOT_POOLS
    .filter((p) => (p.quote ?? 'USD') === 'USD')
    .map((p) => live[p.id]?.ethUsd)
    .find((v): v is number => typeof v === 'number' && v > 0);
  if (!ethUsd) return; // before the first price read — we will try again in 5 min
  for (const chain of [...new Set(BOT_POOLS.map((p) => p.chain))]) {
    try {
      const wei = await clients[chain].getGasPrice();
      const usd = (Number(wei) / 1e18) * GAS_UNITS_CYCLE * ethUsd;
      gasUsdLive[chain] = Math.max(usd, GAS_FLOOR_USD[chain] ?? 0.05);
    } catch {
      /* last known value / static fallback stays — an RPC failure does not take the cycle down */
    }
  }
}

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
  // collect() ONLY for simulation (29.08): `tokensOwed0/1` from positions() is
  // ZERO until the first burn/collect, so a fresh position would show
  // "fee $0" despite accruing fees. The same "static collect" trick as
  // in the UI (src/hooks/usePortfolio.ts) — eth_call, we sign nothing.
  {
    name: 'collect', type: 'function', stateMutability: 'nonpayable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        { name: 'tokenId', type: 'uint256' }, { name: 'recipient', type: 'address' },
        { name: 'amount0Max', type: 'uint128' }, { name: 'amount1Max', type: 'uint128' },
      ],
    }],
    outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }],
  },
] as const;
const MAX_U128 = 2n ** 128n - 1n;

// --- in-memory state ---
interface PoolLive {
  id: string;
  ethUsd: number;
  tick: number;
  sqrtPriceX96: string;
  stats: PoolStats | null;
  suggestion: ReturnType<typeof suggestRange> | null;
  updatedAt: string;
  /** trend circuit breaker (v1.1): deviation of log-price from EMA7d in % and signal state */
  trendGapPct?: number;
  trendDown?: boolean;
  /** flat detector (FlatWide product, 28.08): since when |gap|<enterGap
   *  uninterrupted (ISO, null=clock not running) and whether flat is confirmed */
  flatSince?: string | null;
  flatConfirmed?: boolean;
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
  /** aggregates from the ledger (BATCH 14, 27.08): fees collected COLLECT−DECREASE
   *  in USD (null when the ledger cannot price it — e.g. the cbBTC leg in ledger v1
   *  or a backfill without a rate); rebalances = number of DECREASE. costsUsd
   *  deliberately null until gas is indexed (TASKS-LEDGER §3). */
  collectedFeesUsd: number | null;
  costsUsd: number | null;
  rebalances: number | null;
  /** ACCRUED fees, not yet collected (29.08, Rafal's brief: the report did not
   *  show the earning pace of the product legs). Simulated collect() —
   *  sum in USD at the rates of the same cycle; null when RPC refuses. */
  feesUsd: number | null;
  /** FlatWide product cycle (BATCH 17): 'wide' = idle posture
   *  (±productIdleWidthPct), 'narrow' = flat narrowing (k×σ);
   *  null = non-product pool (cycle does not apply) */
  posture: 'wide' | 'narrow' | null;
}
interface Proposal {
  id: string;
  createdAt: string;
  tokenId: string; // '' for OPEN proposals from the selector
  poolId: string; // '' when the pool is outside BOT_POOLS (selector → note)
  /** REBALANCE (advisor) | OPEN/ROTATE (selector) | EXIT_TREND / HEDGE
   *  (circuit breaker v1.2) | FLAT_NARROW / FLAT_WIDEN (FlatWide product 28.08:
   *  narrowing in a confirmed flat / return to wide after the flat) */
  kind?: 'REBALANCE' | 'OPEN' | 'ROTATE' | 'EXIT_TREND' | 'HEDGE' | 'FLAT_NARROW' | 'FLAT_WIDEN';
  /** for kind HEDGE: suggested short size (ETH excess above 50% of value) */
  hedgeSizeEth?: number;
  hedgeNotionalUsd?: number;
  action: string;
  suggestedRange?: { tickLower: number; tickUpper: number; usdLo: number; usdHi: number };
  costUsd?: number;
  paybackDays?: number | null;
  // selector fields (OPEN/ROTATE):
  llamaPool?: string;
  symbol?: string;
  chain?: string;
  apy7d?: number;
  heldApy7d?: number;
  breakEvenDays?: number;
  note?: string;
  /** EMERGENCY PROCEDURE (Rafal's decision 27.08, batch #2 28.08): a defence
   *  proposal on a PRODUCT pool — the hybrid deliberately holds beta, so
   *  EXIT/HEDGE on a DOWN signal are emergency options ("usually do NOT sign"),
   *  not recommendations. UI: red frame + reference to EMERGENCY.md. */
  emergency?: boolean;
  status: 'open' | 'dismissed';
}

const live: Record<string, PoolLive> = {};
let positions: WatchedPosition[] = [];
let proposals: Proposal[] = fs.existsSync(PROPOSALS_PATH) ? JSON.parse(fs.readFileSync(PROPOSALS_PATH, 'utf8')) : [];
// FIX 11.09 #2: cleanup of duplicates by id from the period before the dedup fix
// (the same card multiple times in the file; [Dismiss] hit only the first
// copy, so the others came back after a refresh). ONE copy per id remains;
// if any of them was dismissed — dismissed.
{
  const byId = new Map<string, Proposal>();
  for (const p of proposals) {
    const prev = byId.get(p.id);
    if (!prev) byId.set(p.id, p);
    else if (prev.status === 'open' && p.status === 'dismissed') byId.set(p.id, p);
  }
  if (byId.size !== proposals.length) {
    console.log(`proposals: removed ${proposals.length - byId.size} duplicates by id (startup)`);
    proposals = [...byId.values()];
  }
}

// --- tracking REAL positions like in paper (20.08, Rafal's decision):
// equity + HODL per tokenId, samples every refreshPositions cycle (5 min).
// HODL = token amounts FROZEN when the bot first notices the position
// (anchor in .bot/positions-hodl.json — a restart does not reset it);
// HONESTY NOTE: for positions older than the deployment the anchor = state as of
// today, not the real opening — the comparison runs "from now".
// UI charts (redesign of position cards after the paper pattern) read
// /api/positions-history. Sample format like paper-history (price/lo/hi
// human) — the UI reuses the same components.
const POS_HIST_PATH = path.join(DIR, 'positions-history.ndjson');
const POS_HODL_PATH = path.join(DIR, 'positions-hodl.json');

// --- tracking the REAL hedge on GMX (20.08, Rafal's note after the E2E test:
// the short existed only on app.gmx.io and in the localStorage of one browser —
// the bot did not see it, so it was absent from charts/report/iPhone and nobody
// would warn "signal is gone but the short is still hanging"). Read via GMX Reader
// (getAccountPositions) every refreshPositions cycle; state in state.json
// (field `hedge`), equity sample to positions-history under tokenId
// 'gmx-eth-short' (UI: card without a range band — a perp has no range).
// ABI NOTE: struct Position.Props per MAIN gmx-synthetics (10 fields in
// numbers, including pendingImpactAmount int256) — on a GMX upgrade
// verify the shape, a wrong decode shifts the fields; the sanity check below
// (market/scale) catches the mismatch and logs instead of reporting garbage.
const GMX = {
  reader: '0x470fbC46bcC0f16532691Df360A07d8Bf5ee0789',
  dataStore: '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8',
  ethUsdMarket: '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
} as const;
const GMX_READER_ABI = [
  {
    name: 'getAccountPositions', type: 'function', stateMutability: 'view',
    inputs: [
      { name: 'dataStore', type: 'address' },
      { name: 'account', type: 'address' },
      { name: 'start', type: 'uint256' },
      { name: 'end', type: 'uint256' },
    ],
    outputs: [{
      name: 'positions', type: 'tuple[]', components: [
        {
          name: 'addresses', type: 'tuple', components: [
            { name: 'account', type: 'address' },
            { name: 'market', type: 'address' },
            { name: 'collateralToken', type: 'address' },
          ],
        },
        {
          name: 'numbers', type: 'tuple', components: [
            { name: 'sizeInUsd', type: 'uint256' },
            { name: 'sizeInTokens', type: 'uint256' },
            { name: 'collateralAmount', type: 'uint256' },
            { name: 'pendingImpactAmount', type: 'int256' },
            { name: 'borrowingFactor', type: 'uint256' },
            { name: 'fundingFeeAmountPerSize', type: 'uint256' },
            { name: 'longTokenClaimableFundingAmountPerSize', type: 'uint256' },
            { name: 'shortTokenClaimableFundingAmountPerSize', type: 'uint256' },
            { name: 'increasedAtTime', type: 'uint256' },
            { name: 'decreasedAtTime', type: 'uint256' },
          ],
        },
        { name: 'flags', type: 'tuple', components: [{ name: 'isLong', type: 'bool' }] },
      ],
    }],
  },
] as const;
export interface HedgeLive {
  isLong: boolean;
  sizeUsd: number;
  sizeEth: number;
  collateralUsd: number;
  entryPriceUsd: number;
  pnlUsd: number; // vs current mark (ethUsd from telemetry)
  equityUsd: number; // collateral + pnl
  updatedAt: string;
}
let hedgeLive: HedgeLive | null = null;
let hedgeWasOpen = false; // for notifications on open/close transitions
interface PosHodlAnchor { a0: number; a1: number; poolId: string; anchoredAt: string }
const posHodl: Record<string, PosHodlAnchor> = fs.existsSync(POS_HODL_PATH)
  ? JSON.parse(fs.readFileSync(POS_HODL_PATH, 'utf8'))
  : {};
const savePosHodl = () => fs.writeFileSync(POS_HODL_PATH, JSON.stringify(posHodl, null, 2));

const bigintReplacer = (_key: string, value: unknown) => (typeof value === 'bigint' ? value.toString() : value);

const saveState = () => {
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      // flatParams: live flat-detector parameters for the UI (countdown to
      // confirmation, thresholds in descriptions) — single truth from bot/config.ts,
      // the UI does not hardcode 12h/2%/5% (BATCH 17; values may change
      // by the review decision of 1.09)
      { updatedAt: new Date().toISOString(), mode: 'OBSERVE', watch: WATCH_ADDRESS, flatParams: FLAT, tranche: trancheLive, pools: Object.values(live), positions, hedge: hedgeLive, gasUsd: gasUsdLive, proposals: proposals.filter((p) => p.status === 'open') },
      bigintReplacer, 2
    )
  );
};
const saveProposals = () => fs.writeFileSync(PROPOSALS_PATH, JSON.stringify(proposals, bigintReplacer, 2));

// Commands from the UI (the server only queues — dual-writer fix 25.08: previously
// the server wrote to proposals.json while the observer overwrote it from memory and
// dismissals were lost). Consumption: read → delete the file → apply.
const COMMANDS_PATH = path.join(DIR, 'proposal-commands.ndjson');
function applyProposalCommands() {
  try {
    if (!fs.existsSync(COMMANDS_PATH)) return;
    const raw = fs.readFileSync(COMMANDS_PATH, 'utf8');
    fs.unlinkSync(COMMANDS_PATH);
    let changed = false;
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const c = JSON.parse(line);
        if (c.action === 'dismiss') {
          // FIX 11.09 #2: dismiss ALL copies with this id (not only the first one)
          let n = 0;
          for (const p of proposals) if (p.id === c.id && p.status === 'open') { p.status = 'dismissed'; n++; }
          if (n) {
            changed = true;
            log(`proposal ${c.id}: dismissed (command from UI${n > 1 ? `, ${n} copies` : ''})`);
          }
        }
      } catch { /* corrupted line — skip */ }
    }
    if (changed) { saveProposals(); saveState(); }
  } catch (e) {
    log(`proposal-commands: ${String(e).slice(0, 100)}`);
  }
}

// TTL of selector proposals (added 17.08 after the OBSERVE analysis): OPEN/ROTATE
// rely on the daily ranking — after 48h the ranking is stale and a hanging
// proposal is misleading (we saw entries from 10.08 still alive on 17.08).
// REBALANCE/EXIT_TREND do not expire (they are based on position state, not the ranking).
const PROPOSAL_TTL_MS = 48 * 3600 * 1000;
function expireStaleProposals() {
  let changed = false;
  for (const p of proposals) {
    if (p.status !== 'open') continue;
    if ((p.kind === 'OPEN' || p.kind === 'ROTATE') && Date.now() - new Date(p.createdAt).getTime() > PROPOSAL_TTL_MS) {
      p.status = 'dismissed';
      p.note = `${p.note ? p.note + ' · ' : ''}[auto-expired after 48h — ranking stale]`;
      changed = true;
      log(`proposal ${p.id}: auto-expired (TTL 48h)`);
    }
  }
  if (changed) {
    saveProposals();
    saveState();
  }
}

// --- Telegram: 15 min BUFFER (Rafal's decision 18.08) ---
// Messages do NOT go out immediately: they collect in a queue and every 15 min go
// as ONE aggregated message. Reasons: (1) anti-spam — a series of events from one
// cycle is a single message; (2) Telegram limit ~1 msg/s per chat — a burst
// >1 got 429 without retry and was lost (18.08: of 5 paper STARTs, 1 arrived).
// Cost: delay up to 15 min — acceptable in OBSERVE mode (a human
// approves in Rabby anyway, nothing executes by itself).
const tgQueue: string[] = [];
const TG_FLUSH_MS = 15 * 60 * 1000;
const TG_CHUNK = 3900; // hard Telegram limit: 4096 chars/message

async function telegramSendNow(text: string) {
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

/** public interface (used everywhere) — only appends to the queue */
async function telegram(text: string) {
  tgQueue.push(text);
}

async function flushTelegram() {
  if (!tgQueue.length) return;
  const msgs = tgQueue.splice(0, tgQueue.length);
  // joining into batches ≤TG_CHUNK without cutting individual messages in half
  const batches: string[] = [];
  let cur = '';
  for (const m of msgs) {
    if (cur && cur.length + 2 + m.length > TG_CHUNK) { batches.push(cur); cur = m; }
    else cur = cur ? `${cur}\n\n${m}` : m;
  }
  if (cur) batches.push(cur);
  for (const b of batches) {
    await telegramSendNow(b);
    if (batches.length > 1) await new Promise((r) => setTimeout(r, 1500)); // limit 1 msg/s
  }
  log(`telegram: sent ${msgs.length} messages in ${batches.length} batch(es)`);
}

// --- price orientation per pool ---
// For quote:'USD' pools the ethUsd field = USD per ETH (as before). For quote:'WETH'
// (e.g. cbBTC/WETH) ethUsd = USD per BASE TOKEN (non-WETH), computed as
// (price of base in WETH) × (ETH/USD from the reference pool usdRefPoolId).
/** USD per WETH for a given pool (1 for the reference itself makes no sense — it is the rate) */
const refEthUsd = (p: BotPool): number | null => {
  if ((p.quote ?? 'USD') === 'USD') return null; // not applicable
  const ref = p.usdRefPoolId ? live[p.usdRefPoolId] : undefined;
  return ref && (BOT_POOLS.find((b) => b.id === p.usdRefPoolId)?.quote ?? 'USD') === 'USD' ? ref.ethUsd : null;
};
/** raw human price (token1/token0) → USD per the pool's base token */
const humanToBaseUsd = (p: BotPool, human: number): number | null => {
  if ((p.quote ?? 'USD') === 'USD') return p.ethIsToken0 ? human : 1 / human;
  const inWeth = p.ethIsToken0 ? 1 / human : human; // WETH per base token
  const ref = refEthUsd(p);
  return ref ? inWeth * ref : null;
};

// --- trend circuit breaker (ALGORITHM.md v1.1 §4) ---
// EMA of the pair's RELATIVE log-price (HL 7d), DOWN signal when gap < −5%.
// Re-entry: 'aboveEma' (default) — gap > 0; 'half' (cbBTC) — gap > −2.5%.
// State persisted (.bot/trend-state.json) — a service restart does not reset the EMA.
const TREND_STATE_PATH = path.join(DIR, 'trend-state.json');
interface TrendState { ema: number; lastTs: number; down: boolean }
const trend: Record<string, TrendState> = fs.existsSync(TREND_STATE_PATH)
  ? JSON.parse(fs.readFileSync(TREND_STATE_PATH, 'utf8'))
  : {};
let lastTrendSaveMs = 0;
const saveTrend = () => {
  fs.writeFileSync(TREND_STATE_PATH, JSON.stringify(trend, null, 2));
  lastTrendSaveMs = Date.now();
};
// Periodic save (15 min throttle) — without it the EMA lived only in memory
// (save exclusively on seed/flip), so every service restart rolled the
// anchor back to the last flip (detected 19.08: lastTs=12.08 despite 4 restarts).
const TREND_SAVE_MS = 15 * 60 * 1000;
const TREND_TAU_MS = (TREND.hlDays * 86400 * 1000) / Math.LN2;

/** relative price of the pair for trend detection: for quote USD = USD per base;
 *  for quote WETH = price of base IN WETH (without the ETH/USD rate noise) */
const trendPrice = (p: BotPool, human: number): number =>
  (p.quote ?? 'USD') === 'USD' ? (p.ethIsToken0 ? human : 1 / human) : (p.ethIsToken0 ? 1 / human : human);

/** EMA update + signal detection; returns the gap in % (log) */
function updateTrend(p: BotPool, price: number, nowMs: number): number {
  const logP = Math.log(price);
  const st = trend[p.id];
  if (!st) {
    trend[p.id] = { ema: logP, lastTs: nowMs, down: false };
    saveTrend();
    return 0;
  }
  const dt = Math.max(nowMs - st.lastTs, 1);
  const a = 1 - Math.exp(-dt / TREND_TAU_MS);
  st.ema = (1 - a) * st.ema + a * logP;
  st.lastTs = nowMs;
  if (nowMs - lastTrendSaveMs > TREND_SAVE_MS) saveTrend();
  const gap = logP - st.ema;
  const wasDown = st.down;
  if (!st.down && gap < -TREND.thresh) st.down = true;
  else if (st.down) {
    const backAt = (p.trendReentry ?? 'aboveEma') === 'aboveEma' ? 0 : -TREND.thresh / 2;
    if (gap > backAt) st.down = false;
  }
  if (st.down !== wasDown) {
    log(`trend ${p.id}: ${st.down ? '⛔ DOWN (gap ' + (gap * 100).toFixed(1) + '%)' : '✅ signal over (gap ' + (gap * 100).toFixed(1) + '%)'}`);
    saveTrend();
    if (st.down) proposeExitTrend(p, gap);
  }
  return gap * 100;
}

/** defence proposal for each of our positions in a pool with a DOWN signal.
 *  NON-product pools: as before — EXIT_TREND or HEDGE-excess per
 *  pool.trendAction (ALGORITHM v1.2 §4).
 *  PRODUCT pools (productIdleWidthPct — FlatWide hybrid): Rafal's decision
 *  27.08 evening — we do NOT mute the signal, but rebrand it as an
 *  EMERGENCY PROCEDURE: TWO proposals side by side, both emergency:true:
 *  (1) delta-neutral HEDGE (short of the FULL exposure of the volatile leg, LP
 *  stays — reversible), (2) EXIT_TREND ("the data says: usually do NOT
 *  sign" — backtests: exiting on a trend makes things worse on average). Order,
 *  criteria and costs: EMERGENCY.md. Nuance: the DOWN signal on cbBTC/WETH
 *  measures the RELATIVE price — the USD crash sensor for BOTH legs is the signal
 *  on WETH/USDC. */
function proposeExitTrend(pool: BotPool, gap: number) {
  const held = positions.filter((x) => x.poolId === pool.id);
  if (!held.length) return;
  const isProduct = !!pool.productIdleWidthPct;
  const gapTxt = `price ${(gap * 100).toFixed(1)}% below EMA${TREND.hlDays}d (threshold −${TREND.thresh * 100}%)`;
  const backTxt = (pool.trendReentry ?? 'aboveEma') === 'aboveEma' ? 'price returning ABOVE the EMA' : `gap > −${TREND.thresh * 50}%`;
  for (const pos of held) {
    const day = new Date().toISOString().slice(0, 10);
    const kinds: Array<'EXIT_TREND' | 'HEDGE'> = isProduct
      ? ['HEDGE', 'EXIT_TREND'] // hedge FIRST — the preferred (reversible) emergency option
      : [(pool.trendAction ?? 'exit') === 'hedge' ? 'HEDGE' : 'EXIT_TREND'];
    let announced = false;
    for (const kind of kinds) {
      // dedup PER KIND (the product emits two parallel options)
      const key = `trend-${kind === 'HEDGE' ? 'hedge-' : ''}${pool.id}-${pos.tokenId}-${day}`;
      // FIX 11.09: a dismissed card does NOT come back on the same day — dedup also by id
      // (so far only by status==='open', so every cycle after [Dismiss] created
      // it anew with THE SAME id and sent a Telegram; Rafal's observation 11.09)
      if (proposals.some((x) => x.id === key || (x.kind === kind && x.tokenId === pos.tokenId && x.status === 'open'))) continue;
      let prop: Proposal;
      if (kind === 'HEDGE') {
        const isRelative = (pool.quote ?? 'USD') === 'WETH'; // cbBTC/WETH: relative signal
        // sizing: product = delta-neutral (FULL exposure of the volatile leg);
        // non-product = excess (ETH surplus above 50% of value, v1.2)
        const P = live[pool.id]?.ethUsd ?? 0; // USD per the pool's BASE token
        let sizeTok: number; let tokSym: string; let market: string;
        if (!isRelative) {
          const ethAmt = pool.ethIsToken0 ? pos.amount0 : pos.amount1;
          sizeTok = isProduct ? ethAmt : P > 0 ? Math.max(0, ethAmt - pos.valueUsd / 2 / P) : 0;
          tokSym = 'ETH'; market = 'ETH/USD';
        } else {
          // signal = base token (cbBTC) weakening RELATIVE to WETH → neutralisation
          // by shorting the BASE leg on the BTC/USD market (manually on app.gmx.io —
          // the 1-signature builder handles only ETH/USD today)
          sizeTok = pool.ethIsToken0 ? pos.amount1 : pos.amount0; // cbBTC leg
          tokSym = pool.ethIsToken0 ? pool.sym1 : pool.sym0; market = 'BTC/USD';
        }
        const notional = sizeTok * P;
        prop = {
          id: key, createdAt: new Date().toISOString(), tokenId: pos.tokenId, poolId: pool.id,
          kind: 'HEDGE', action: 'HEDGE',
          symbol: `${pool.sym0}-${pool.sym1}`,
          hedgeSizeEth: tokSym === 'ETH' ? sizeTok : undefined, hedgeNotionalUsd: notional,
          emergency: isProduct || undefined,
          note: isProduct
            ? `EMERGENCY OPTION A (preferred — reversible): ${gapTxt}. SHORT ${sizeTok.toFixed(4)} ${tokSym} (~$${notional.toFixed(0)}, delta-neutral for the position) on GMX v2 ${market}${tokSym === 'ETH' ? ' — 1 signature in the cockpit' : ' — manually on app.gmx.io (the 1-signature builder handles only ETH/USD)'}; the LP STAYS and keeps collecting fees. Close the short once the signal is gone (${backTxt}). Cost ~$0.5-1 + funding (hist. avg +4.8%/yr for a short). When to sign and when NOT to: EMERGENCY.md.${isRelative ? ' NOTE: this signal measures the RELATIVE cbBTC/WETH price — a USD crash is detected by the signal on WETH/USDC.' : ''}`
            : `Circuit breaker v1.2 (hedge-excess): ${gapTxt}. Suggestion: SHORT ${sizeTok.toFixed(4)} ${tokSym} (~$${notional.toFixed(0)}) on GMX v2 (Arbitrum, app.gmx.io) — the LP position STAYS and keeps collecting fees. Close the short once the signal is gone (price above the EMA). Fallback without a perp account: close the position to cash 50/50 (exit).`,
          status: 'open',
        };
      } else {
        prop = {
          id: key, createdAt: new Date().toISOString(), tokenId: pos.tokenId, poolId: pool.id,
          kind: 'EXIT_TREND', action: 'EXIT_TREND',
          symbol: `${pool.sym0}-${pool.sym1}`,
          emergency: isProduct || undefined,
          note: isProduct
            ? `EMERGENCY OPTION B — the data says: usually do NOT SIGN. ${gapTxt}. The FlatWide hybrid DELIBERATELY holds beta (backtests 26-27.08, 40+ runs: exiting on a trend on average WORSENS the result vs holding; cash wins only in strong crashes, which you do not know ex-ante). Closing to cash 50/50 only under the hard criteria from EMERGENCY.md (systemic crash, depeg, loss of trust in the venue). Return after ${backTxt}. Preferred alternative: option A (hedge, reversible).`
            : `Trend circuit breaker (ALGORITHM v1.2 §4): ${gapTxt}. Suggestion: close the position to cash 50/50; return after ${backTxt}.`,
          status: 'open',
        };
      }
      proposals.push(prop);
      saveProposals();
      if (!isProduct) {
        const msg = kind === 'HEDGE'
          ? `🛡 HOMOS: HEDGE — ${pool.id}, position #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): ${gapTxt}. Proposal: short (details in the cockpit); LP stays. [OBSERVE mode — nothing executed]`
          : `⛔ HOMOS: TREND CIRCUIT BREAKER — ${pool.id}, position #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): ${gapTxt}. Proposal: exit to cash 50/50. [OBSERVE mode — nothing executed]`;
        log(msg);
        telegram(msg);
      } else if (!announced) {
        announced = true;
        const msg = `🚨 HOMOS: EMERGENCY PROCEDURE — DOWN signal on ${pool.id}, position #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): ${gapTxt}. Two options in the cockpit: (A) delta-neutral hedge [preferred, reversible] / (B) exit [usually do NOT sign]. See EMERGENCY.md. [OBSERVE mode — nothing executed]`;
        log(msg);
        telegram(msg);
      }
    }
  }
}

// --- FLAT_ENTER / FLAT_EXIT (FlatWide product — Rafal's decision 27-28.08) ---
// State machine per product pool: |gap|<enterGap uninterrupted for
// confirmH hours → flat CONFIRMED → proposal to narrow to k×σ
// (FLAT_NARROW). End of flat: |gap|>exitGap → proposal to return to
// wide ±productIdleWidthPct (FLAT_WIDEN, 24/7 alarm). The middle zone
// (enter..exit) does NOT end a confirmed flat (hysteresis as in
// backtest/flatwindows.ts). State persisted — a restart does not reset the
// confirm clock (the same class of fix as trend-state 19.08).
const FLAT_STATE_PATH = path.join(DIR, 'flat-state.json');
interface FlatPoolState { flatSince: number | null; confirmed: boolean }
const flat: Record<string, FlatPoolState> = fs.existsSync(FLAT_STATE_PATH)
  ? JSON.parse(fs.readFileSync(FLAT_STATE_PATH, 'utf8'))
  : {};
const saveFlat = () => fs.writeFileSync(FLAT_STATE_PATH, JSON.stringify(flat, null, 2));

/** half-width of the position in % (geometrically: √(hi/lo)−1) */
const posHalfWidthPct = (pos: { tickLower: number; tickUpper: number }): number =>
  (Math.sqrt(Math.pow(1.0001, pos.tickUpper - pos.tickLower)) - 1) * 100;
const isNarrowPos = (p: BotPool, pos: { tickLower: number; tickUpper: number }): boolean =>
  p.productIdleWidthPct ? posHalfWidthPct(pos) < FLAT.narrowFrac * p.productIdleWidthPct : false;

/** auto-close of open proposals of a given kind in a pool (stale = wrong) */
function dismissOpenByKind(kind: Proposal['kind'], poolId: string, why: string) {
  let changed = false;
  for (const pr of proposals) {
    if (pr.status === 'open' && pr.kind === kind && pr.poolId === poolId) {
      pr.status = 'dismissed';
      pr.note = `${pr.note ? pr.note + ' · ' : ''}[auto: ${why}]`;
      changed = true;
      log(`proposal ${pr.id}: closed automatically — ${why}`);
    }
  }
  if (changed) { saveProposals(); saveState(); }
}

/** flat detector update (called from refreshPrices, every 60 s) */
function updateFlat(p: BotPool, gapFrac: number, nowMs: number) {
  if (!p.productIdleWidthPct) return; // product pools only
  const vol = live[p.id]?.stats?.volDaily;
  if (vol != null && vol < FLAT.minVolDaily) {
    // LST/stable guard (wstETH/WETH lesson 27.08): with dead volatility
    // "flat" is the base state, not a signal — detector disabled, state reset
    if (flat[p.id]?.flatSince != null || flat[p.id]?.confirmed) {
      flat[p.id] = { flatSince: null, confirmed: false };
      saveFlat();
      log(`flat ${p.id}: vol ${(vol * 100).toFixed(2)}%/d < ${FLAT.minVolDaily * 100}%/d — detector disabled (LST/stable class)`);
    }
    return;
  }
  const st = (flat[p.id] ??= { flatSince: null, confirmed: false });
  const abs = Math.abs(gapFrac);
  if (st.confirmed) {
    if (abs > FLAT.exitGap) {
      st.confirmed = false;
      st.flatSince = null;
      saveFlat();
      const msg = `📉 HOMOS: FLAT ENDED — ${p.id}, |gap| ${(abs * 100).toFixed(1)}% > ${FLAT.exitGap * 100}%. If the position is narrow: return to wide ±${p.productIdleWidthPct}% (proposal in the cockpit). [OBSERVE mode — nothing executed]`;
      log(msg);
      telegram(msg);
      dismissOpenByKind('FLAT_NARROW', p.id, 'flat ended (|gap|>exitGap)');
      for (const pos of positions.filter((x) => x.poolId === p.id && isNarrowPos(p, x))) proposeFlatWiden(p, pos);
    }
    // enter..exit zone: a confirmed flat CONTINUES (hysteresis)
  } else if (abs < FLAT.enterGap) {
    if (st.flatSince == null) {
      st.flatSince = nowMs;
      saveFlat();
      log(`flat ${p.id}: confirm clock starts (gap ${(gapFrac * 100).toFixed(2)}%, threshold ${FLAT.confirmH}h)`);
    } else if (nowMs - st.flatSince >= FLAT.confirmH * 3600e3) {
      st.confirmed = true;
      saveFlat();
      const msg = `🎯 HOMOS: FLAT CONFIRMED — ${p.id} (|gap|<${FLAT.enterGap * 100}% uninterrupted ≥${FLAT.confirmH}h). FlatWide product: time to consider narrowing to k×σ — proposal in the cockpit at the next positions cycle (≤5 min). [OBSERVE mode — nothing executed]`;
      log(msg);
      telegram(msg);
    }
  } else if (st.flatSince != null) {
    log(`flat ${p.id}: clock reset after ${((nowMs - st.flatSince) / 3600e3).toFixed(1)}h (gap ${(gapFrac * 100).toFixed(2)}%)`);
    st.flatSince = null;
    saveFlat();
  }
}

/** FLAT_NARROW: proposal to narrow a wide position to k×σ in a confirmed flat */
function proposeFlatNarrow(pool: BotPool, pos: WatchedPosition) {
  const st = flat[pool.id];
  const lv = live[pool.id];
  if (!st?.confirmed || !lv?.stats) return;
  if (proposals.some((x) => x.kind === 'FLAT_NARROW' && x.tokenId === pos.tokenId && x.status === 'open')) return;
  // NARROWING WIDTH (change 29.08, Rafal's note): fixed product width
  // instead of k×σ×√7 from advisor v1.2. Reason: the 7-day horizon
  // comes from the strategy "the range should survive a week without a rebalance",
  // while in the hybrid the position is protected anyway by FLAT_WIDEN at |gap|>exitGap.
  // With k×σ (today ±16%) the exit signal fired after 32% of the way to the edge
  // of the band — two thirds of the liquidity would sit where the price never
  // gets. The k×σ fallback remains for pools without a configured width.
  const sug = pool.productNarrowWidthPct
    ? suggestFixedRange(lv.stats, pool.feeBps as any, pool.d0, pool.d1, pool.productNarrowWidthPct)
    : suggestRange(lv.stats, pool.feeBps as any, pool.d0, pool.d1, {
        ...ADVISOR_PARAMS, k: pool.advisorK ?? ADVISOR_PARAMS.k,
      });
  const zrodloSzerokosci = pool.productNarrowWidthPct
    ? `fixed product width ±${pool.productNarrowWidthPct}% (${(pool.productNarrowWidthPct / (FLAT.exitGap * 100)).toFixed(1)}× the exit threshold)`
    : `k×σ ±${sug.widthPct.toFixed(0)}% (k=${pool.advisorK ?? ADVISOR_PARAMS.k})`;
  const toUsd = (t: number) => tickToUsd(pool, t);
  const [usdLo, usdHi] = [toUsd(sug.tickLower), toUsd(sug.tickUpper)].sort((a, b) => a - b);
  // EV of narrowing: fee gain from the narrower band (scaling as in assessPosition)
  const spacing = TICK_SPACING[pool.feeBps];
  const ticksNarrow = Math.max(sug.tickUpper - sug.tickLower, 2 * spacing);
  const ticksCur = Math.max(pos.tickUpper - pos.tickLower, 2 * spacing);
  const extraDailyUsd = pos.valueUsd * lv.stats.feeYieldDaily * 2 * spacing * (1 / ticksNarrow - 1 / ticksCur);
  const costUsd = gasUsdFor(pool.chain) + pos.valueUsd * 0.5 * (pool.feeBps / 1_000_000 + ADVISOR_PARAMS.slippageBps / 10_000);
  const payback = extraDailyUsd > 0 ? costUsd / extraDailyUsd : null;
  const prop: Proposal = {
    id: `flat-narrow-${pos.tokenId}-${st.flatSince ?? Date.now()}`,
    createdAt: new Date().toISOString(), tokenId: pos.tokenId, poolId: pool.id,
    kind: 'FLAT_NARROW', action: 'FLAT_NARROW',
    symbol: `${pool.sym0}-${pool.sym1}`,
    suggestedRange: { tickLower: sug.tickLower, tickUpper: sug.tickUpper, usdLo, usdHi },
    costUsd, paybackDays: payback,
    note: `FlatWide product: flat CONFIRMED (|gap|<${FLAT.enterGap * 100}% ≥${FLAT.confirmH}h) — narrowing from ±${posHalfWidthPct(pos).toFixed(0)}% to ±${sug.widthPct.toFixed(0)}%: ${zrodloSzerokosci}. Extra fee ~$${extraDailyUsd.toFixed(2)}/d, cost ~$${costUsd.toFixed(2)}, payback ~${payback?.toFixed(1) ?? '—'}d. E1: the episode must last ≥~${pool.id.includes('cbbtc') ? '5' : '2'}d for the narrowing to pay off — the median episode on this pool is past the threshold. I will propose the return to wide at |gap|>${FLAT.exitGap * 100}%.`,
    status: 'open',
  };
  proposals.push(prop);
  saveProposals();
  const msg = `🎯 HOMOS: NARROWING proposal (flat) — ${pool.id} #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}) → range $${usdLo.toFixed(usdLo < 1 ? 4 : 0)}–$${usdHi.toFixed(usdHi < 1 ? 4 : 0)} (±${sug.widthPct.toFixed(0)}%), extra fee ~$${extraDailyUsd.toFixed(2)}/d, payback ~${payback?.toFixed(1) ?? '—'}d. [OBSERVE mode — nothing executed]`;
  log(msg);
  telegram(msg);
}

/** FLAT_WIDEN: proposal to return a narrow position to wide ±idle after the end of a flat */
function proposeFlatWiden(pool: BotPool, pos: WatchedPosition) {
  const lv = live[pool.id];
  if (!lv?.stats || !pool.productIdleWidthPct) return;
  if (proposals.some((x) => x.kind === 'FLAT_WIDEN' && x.tokenId === pos.tokenId && x.status === 'open')) return;
  const sug = suggestFixedRange(lv.stats, pool.feeBps as any, pool.d0, pool.d1, pool.productIdleWidthPct);
  const toUsd = (t: number) => tickToUsd(pool, t);
  const [usdLo, usdHi] = [toUsd(sug.tickLower), toUsd(sug.tickUpper)].sort((a, b) => a - b);
  const costUsd = gasUsdFor(pool.chain) + pos.valueUsd * 0.5 * (pool.feeBps / 1_000_000 + ADVISOR_PARAMS.slippageBps / 10_000);
  const gapNow = (lv.trendGapPct ?? 0).toFixed(1);
  const prop: Proposal = {
    id: `flat-widen-${pos.tokenId}-${new Date().toISOString().slice(0, 10)}`,
    createdAt: new Date().toISOString(), tokenId: pos.tokenId, poolId: pool.id,
    kind: 'FLAT_WIDEN', action: 'FLAT_WIDEN',
    symbol: `${pool.sym0}-${pool.sym1}`,
    suggestedRange: { tickLower: sug.tickLower, tickUpper: sug.tickUpper, usdLo, usdHi },
    costUsd, paybackDays: null,
    note: `FLAT_EXIT: |gap| ${gapNow}% > ${FLAT.exitGap * 100}% — flat over, a narrow position catches IL on a trend. Return to idle posture: wide ±${pool.productIdleWidthPct}%. Cost ~$${costUsd.toFixed(2)}. This is a PROTECTIVE proposal (24/7 alarm) — the longer narrow on a trend, the higher the cost.`,
    status: 'open',
  };
  proposals.push(prop);
  saveProposals();
  const msg = `⚠️ HOMOS: WIDENING proposal (end of flat) — ${pool.id} #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): gap ${gapNow}% > ${FLAT.exitGap * 100}%, return to ±${pool.productIdleWidthPct}% ($${usdLo.toFixed(usdLo < 1 ? 4 : 0)}–$${usdHi.toFixed(usdHi < 1 ? 4 : 0)}). [OBSERVE mode — nothing executed]`;
  log(msg);
  telegram(msg);
}

// --- price loop (60s) ---
async function refreshPrices() {
  // USD pools first — pools quoted in WETH need their rate as a reference
  const ordered = [...BOT_POOLS].sort((a, b) => ((a.quote ?? 'USD') === 'USD' ? 0 : 1) - ((b.quote ?? 'USD') === 'USD' ? 0 : 1));
  for (const p of ordered) {
    try {
      const s = (await clients[p.chain].readContract({ address: p.address, abi: SLOT0_ABI, functionName: 'slot0' })) as readonly [bigint, number, ...unknown[]];
      const human = sqrtPriceX96ToHumanPrice(s[0], p.d0, p.d1);
      const prev = live[p.id];
      const baseUsd = humanToBaseUsd(p, human);
      if (baseUsd === null) {
        log(`price ${p.id}: no reference rate ${p.usdRefPoolId} — skipping tick`);
        continue;
      }
      live[p.id] = {
        id: p.id,
        ethUsd: baseUsd,
        tick: s[1],
        sqrtPriceX96: s[0].toString(),
        stats: prev?.stats ?? null,
        suggestion: prev?.suggestion ?? null,
        updatedAt: new Date().toISOString(),
      };
      live[p.id].trendGapPct = updateTrend(p, trendPrice(p, human), Date.now());
      live[p.id].trendDown = trend[p.id]?.down ?? false;
      // flat detector (FlatWide product) — the same EMA/gap as the trend circuit breaker
      try {
        updateFlat(p, (live[p.id].trendGapPct ?? 0) / 100, Date.now());
      } catch (e) {
        log(`flat ${p.id}: ${String(e).slice(0, 100)}`);
      }
      live[p.id].flatSince = flat[p.id]?.flatSince != null ? new Date(flat[p.id].flatSince!).toISOString() : null;
      live[p.id].flatConfirmed = flat[p.id]?.confirmed ?? false;
    } catch (e) {
      log(`price ${p.id} failed: ${String(e).slice(0, 120)}`);
    }
  }
  saveState();
}

// --- statistics loop (15min) ---
const HISTORY_PATH = path.join(DIR, 'history.ndjson');

async function refreshStats() {
  for (const p of BOT_POOLS) {
    try {
      const swaps = await fetchRecentSwaps(clients[p.chain] as any, p.address, p.chainId, 24);
      const stats = computeStats(swaps, p.chainId, p.d0, p.d1, p.feeBps / 1_000_000, TICK_SPACING[p.feeBps]);
      if (live[p.id] && stats) {
        live[p.id].stats = stats;
        // PRODUCT 27.08 (FlatWide hybrid): a product pool gets a FIXED
        // width ±N% (idle posture); otherwise k per pool (ALGORITHM v1.1)
        live[p.id].suggestion = p.productIdleWidthPct
          ? suggestFixedRange(stats, p.feeBps as any, p.d0, p.d1, p.productIdleWidthPct)
          : suggestRange(stats, p.feeBps as any, p.d0, p.d1, {
              ...ADVISOR_PARAMS, k: p.advisorK ?? ADVISOR_PARAMS.k,
            });
        log(`stats ${p.id}: vol=${(stats.volDaily * 100).toFixed(2)}%/d feeYield=${(stats.feeYieldDaily * 100).toFixed(3)}%/d swaps=${stats.swapsAnalyzed}`);
      }
      // snapshot to history (the "Observation analysis" dashboard in the UI) — every 15min cycle
      const lv = live[p.id];
      if (lv) {
        const toUsd = (t: number) => tickToUsd(p, t);
        const [rangeLo, rangeHi] = lv.suggestion
          ? [toUsd(lv.suggestion.tickLower), toUsd(lv.suggestion.tickUpper)].sort((a, b) => a - b)
          : [null, null];
        fs.appendFileSync(
          HISTORY_PATH,
          JSON.stringify({
            ts: new Date().toISOString(), poolId: p.id, price: lv.ethUsd,
            volDaily: lv.stats?.volDaily ?? null, feeYieldDaily: lv.stats?.feeYieldDaily ?? null,
            rangeLo, rangeHi, emaGapPct: lv.trendGapPct ?? null, trendDown: lv.trendDown ?? false,
          }) + '\n'
        );
      }
    } catch (e) {
      log(`stats ${p.id} failed: ${String(e).slice(0, 120)}`);
    }
  }
  // paper trading: virtual portfolio per ALGORITHM v1.2 (after the statistics refresh)
  try {
    paperTick({
      log,
      telegram,
      getPool: (poolId: string) => {
        const p = BOT_POOLS.find((b) => b.id === poolId);
        const lv = p ? live[poolId] : undefined;
        if (!p || !lv) return null;
        // tick from slot0 (60 s, refreshPrices) SEPARATE from stats: fix 25.08 —
        // on an RPC failure stats froze and paper saw "out of range"
        // from the old lastTick despite a fresh in-range price
        return { stats: lv.stats, tick: typeof lv.tick === 'number' ? lv.tick : null, prices: legPrices(p), trendDown: lv.trendDown ?? false };
      },
    });
  } catch (e) {
    log(`paper tick crashed: ${String(e).slice(0, 160)}`);
  }
  saveState();
}

// --- GAS COSTS (29.08, Rafal's decision: gas is to be a cost of the POSITION, not
// merely an implied part of PnL). Source: transaction receipts from the ledger —
// `gasUsed × effectiveGasPrice`, exact to the wei, so the "Costs" column
// stops being empty. Cache in .bot/tx-costs.json: we fetch a receipt ONCE
// per transaction (they are immutable), so the backfill does not repeat every cycle.
// Pricing: we keep gas in ETH and convert to USD only on read —
// the rate at the moment of the event would need an extra block query,
// and on Base gas is cents (on mainnet the old dust is history anyway).
const TX_COSTS_PATH = path.join(DIR, 'tx-costs.json');
interface TxCost { chain: string; gasEth: number; block: number }
const txCosts: Record<string, TxCost> = fs.existsSync(TX_COSTS_PATH)
  ? JSON.parse(fs.readFileSync(TX_COSTS_PATH, 'utf8'))
  : {};
const saveTxCosts = () => fs.writeFileSync(TX_COSTS_PATH, JSON.stringify(txCosts, null, 2));

/** Fetches receipts for ledger transactions we have not priced yet.
 *  Limit per cycle — backfill of old dust must not eat the positions loop. */
async function refreshTxCosts(maxPerCycle = 25) {
  let added = 0;
  let failed = 0;
  // ORDER MATTERS (fix 29.08 after the CC-Win report: `costsUsd`
  // null despite a working backfill): the ledger is sorted from the
  // oldest, and the oldest is mainnet dust from ~519 days ago —
  // at 25 tx per cycle our two legs would get their receipts only
  // after many cycles. Transactions of LIVE positions therefore go first.
  const liveIds = new Set(positions.map((p) => p.tokenId));
  const all = readLedger();
  const queue = liveIds.size
    ? [...all.filter((e) => liveIds.has(e.tokenId)), ...all.filter((e) => !liveIds.has(e.tokenId))]
    : all;
  for (const e of queue) {
    if (added >= maxPerCycle) break;
    if (txCosts[e.txHash]) continue;
    const client = clients[e.chain as keyof typeof clients];
    if (!client) continue;
    try {
      const r = await client.getTransactionReceipt({ hash: e.txHash as `0x${string}` });
      const wei = BigInt(r.gasUsed ?? 0n) * BigInt(r.effectiveGasPrice ?? 0n);
      txCosts[e.txHash] = { chain: e.chain, gasEth: +formatUnits(wei, 18), block: Number(r.blockNumber) };
      added++;
    } catch {
      failed++; // no receipt on this RPC (pruning/limit) — we will try in the next cycle
    }
  }
  if (added) {
    saveTxCosts();
    log(`gas costs: +${added} transactions (total ${Object.keys(txCosts).length}${failed ? `, failed ${failed}` : ''})`);
  }
}

/** USD per native ETH — for gas pricing (the same rule as refreshGas:
 *  rate from the first live pool quoted in USD, without an extra query) */
const nativeEthUsd = (): number | null =>
  BOT_POOLS.filter((p) => (p.quote ?? 'USD') === 'USD')
    .map((p) => live[p.id]?.ethUsd)
    .find((v): v is number => typeof v === 'number' && v > 0) ?? null;

// --- TRANCHE BALANCE (29.08). The cockpit panel measures the quality of the STRATEGY (PnL from
// anchors, vs HODL) and is to stay that way — comparable with the walk-forward. This
// section measures something else: how much of the DEPOSITED USDC really exists today.
// The difference between them is the buffer in the wallet (outside positions) + one-off
// entry costs (swaps, slippage, mint gas) — until 29.08 nobody
// tracked this, hence the impression "the math does not add up".
interface TrancheState {
  label: string; depositedUsd: number; startedAt: string;
  lpUsd: number; walletUsd: number | null; totalUsd: number | null;
  diffUsd: number | null; diffPct: number | null;
  marketPnlUsd: number | null; residualUsd: number | null; gasUsd: number | null;
  /** breakdown of the "residual" (29.08, after the first measurement): entry costs are
   *  FIXED, the buffer's beta floats with price — without this split the residual would
   *  move with the market and stop being a test of accounting correctness. */
  entryCostUsd: number | null; bufferBetaUsd: number | null;
  /** wallet composition per token — so it is possible to AUDIT what the bot counted
   *  (the first measurement gave $226 instead of the estimated $150; without the breakdown
   *  you cannot tell whether it is the tranche buffer or old ETH for gas from outside it) */
  walletParts: Array<{ sym: string; amount: number; usd: number }> | null;
  updatedAt: string;
}
let trancheLive: TrancheState | null = null;
// buffer anchor: wallet amounts do not change without swaps, so the
// value from the first successful read lets us separate the buffer's beta from
// the one-off entry costs. HONESTY: the anchor is created TODAY, so
// the buffer's beta from 27–29.08 stays on the entryCostUsd side.
const TRANCHE_ANCHOR_PATH = path.join(DIR, 'tranche-anchor.json');
interface TrancheAnchor { anchoredAt: string; walletUsd: number }
let trancheAnchor: TrancheAnchor | null = fs.existsSync(TRANCHE_ANCHOR_PATH)
  ? JSON.parse(fs.readFileSync(TRANCHE_ANCHOR_PATH, 'utf8'))
  : null;
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

/** Value of the tranche's tokens sitting in the WALLET (outside LP positions) —
 *  without it the tranche balance would show the buffer as a loss. */
async function walletValueUsd(): Promise<{ usd: number; parts: Array<{ sym: string; amount: number; usd: number }> } | null> {
  const pools = BOT_POOLS.filter((p) => p.chain === TRANCHE.chain && p.productIdleWidthPct && live[p.id]);
  if (!pools.length) return null;
  const client = clients[TRANCHE.chain];
  // USD price per token ADDRESS — the same logic as position pricing
  const priceByAddr = new Map<string, number>();
  const decByAddr = new Map<string, number>();
  const symByAddr = new Map<string, string>();
  for (const p of pools) {
    const lv = live[p.id];
    const ref = refEthUsd(p);
    const usdQuote = (p.quote ?? 'USD') === 'USD';
    const px0 = usdQuote ? (p.ethIsToken0 ? lv.ethUsd : 1) : (p.ethIsToken0 ? ref : lv.ethUsd);
    const px1 = usdQuote ? (p.ethIsToken0 ? 1 : lv.ethUsd) : (p.ethIsToken0 ? lv.ethUsd : ref);
    if (p.t0 && typeof px0 === 'number' && px0 > 0) { priceByAddr.set(p.t0.toLowerCase(), px0); decByAddr.set(p.t0.toLowerCase(), p.d0); symByAddr.set(p.t0.toLowerCase(), p.sym0); }
    if (p.t1 && typeof px1 === 'number' && px1 > 0) { priceByAddr.set(p.t1.toLowerCase(), px1); decByAddr.set(p.t1.toLowerCase(), p.d1); symByAddr.set(p.t1.toLowerCase(), p.sym1); }
  }
  if (!priceByAddr.size) return null;
  try {
    let sum = 0;
    const parts: Array<{ sym: string; amount: number; usd: number }> = [];
    for (const [addr, px] of priceByAddr) {
      const bal = (await client.readContract({
        address: addr as `0x${string}`, abi: ERC20_ABI, functionName: 'balanceOf', args: [WATCH_ADDRESS as `0x${string}`],
      })) as bigint;
      const amount = parseFloat(formatUnits(bal, decByAddr.get(addr) ?? 18));
      const usd = amount * px;
      sum += usd;
      if (amount > 0) parts.push({ sym: symByAddr.get(addr) ?? addr.slice(0, 8), amount: +amount.toFixed(8), usd: +usd.toFixed(2) });
    }
    // native ETH for gas is also part of the tranche (bought with USDC)
    const eth = nativeEthUsd();
    if (eth) {
      const amount = parseFloat(formatUnits(await client.getBalance({ address: WATCH_ADDRESS as `0x${string}` }), 18));
      sum += amount * eth;
      if (amount > 0) parts.push({ sym: 'ETH (native)', amount: +amount.toFixed(8), usd: +(amount * eth).toFixed(2) });
    }
    return { usd: +sum.toFixed(2), parts: parts.sort((a, b) => b.usd - a.usd) };
  } catch (e) {
    log(`tranche wallet: ${String(e).slice(0, 120)}`);
    return null;
  }
}

// --- positions loop (5min) ---
/** Ledger aggregates per chain:tokenId for LIVE positions (BATCH 14).
 *  fees = COLLECT − DECREASE (both sides null-guarded: missing metadata
 *  or usd:null in any entry → null, we do not guess).
 *  rebalances = number of DECREASE events (narrowing/rebalance/partial close). */
function ledgerAggregates(): Map<string, { feesUsd: number | null; rebalances: number; gasEth: number | null }> {
  const map = new Map<string, { feesUsd: number | null; rebalances: number; gasEth: number | null }>();
  try {
    const byToken = new Map<string, LedgerEntry[]>();
    // txHash → how many DIFFERENT positions this transaction touched: gas is split
    // evenly, so that one tx serving two legs is not counted twice
    const tokensPerTx = new Map<string, Set<string>>();
    for (const e of readLedger()) {
      const k = `${e.chain}:${e.tokenId}`;
      (byToken.get(k) ?? byToken.set(k, []).get(k)!).push(e);
      (tokensPerTx.get(e.txHash) ?? tokensPerTx.set(e.txHash, new Set()).get(e.txHash)!).add(k);
    }
    for (const [k, evs] of byToken) {
      const sumUsd = (kind: string): number | null => {
        let s = 0;
        for (const e of evs) {
          if (e.kind !== kind) continue;
          if (e.usd === null) return null;
          s += e.usd;
        }
        return s;
      };
      const col = sumUsd('COLLECT');
      const dec = sumUsd('DECREASE');
      // gas: sum over UNIQUE txHash of this position, split when the tx
      // concerned several positions; null when no receipt fetched yet
      let gasEth: number | null = null;
      for (const h of new Set(evs.map((e) => e.txHash))) {
        const c = txCosts[h];
        if (!c) continue;
        gasEth = (gasEth ?? 0) + c.gasEth / (tokensPerTx.get(h)?.size || 1);
      }
      map.set(k, {
        feesUsd: col !== null && dec !== null ? +Math.max(0, col - dec).toFixed(2) : null,
        rebalances: evs.filter((e) => e.kind === 'DECREASE').length,
        gasEth,
      });
    }
  } catch (e) {
    log(`ledger aggregates: ${String(e).slice(0, 100)}`);
  }
  return map;
}

async function refreshPositions() {
  const found: WatchedPosition[] = [];
  await refreshTxCosts(); // receipts → gas per transaction (the "Costs" column)
  const ledgerAgg = ledgerAggregates();
  const ethUsdForGas = nativeEthUsd();
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
        // matching by token ADDRESSES when the pool has t0/t1 in the configuration
        // (unambiguous with multiple pairs on the same tier — e.g. cbBTC/WETH
        // 0.05% and USDC/WETH 0.05% on Base); fallback: chain+fee as before.
        const eq = (a: string, b?: string) => !!b && a.toLowerCase() === b.toLowerCase();
        const match =
          BOT_POOLS.find((p) => p.chainId === chainId && p.feeBps === Number(fee) && eq(t0, p.t0) && eq(t1, p.t1)) ??
          BOT_POOLS.find((p) => p.chainId === chainId && p.feeBps === Number(fee) && !p.t0);
        if (!match || !live[match.id]) continue;
        const lv = live[match.id];
        const { amount0, amount1 } = getAmountsForLiquidity(BigInt(lv.sqrtPriceX96), Number(lo), Number(hi), L);
        const a0 = parseFloat(formatUnits(amount0, match.d0));
        const a1 = parseFloat(formatUnits(amount1, match.d1));
        // USD pricing: ethUsd = USD per base token (for quote:'WETH' that is e.g. cbBTC);
        // the other leg: USD-stable = 1, WETH = rate from the reference pool.
        let px0: number, px1: number;
        if ((match.quote ?? 'USD') === 'USD') {
          px0 = match.ethIsToken0 ? lv.ethUsd : 1;
          px1 = match.ethIsToken0 ? 1 : lv.ethUsd;
        } else {
          const ref = refEthUsd(match) ?? 0;
          px0 = match.ethIsToken0 ? ref : lv.ethUsd;
          px1 = match.ethIsToken0 ? lv.ethUsd : ref;
        }
        const valueUsd = a0 * px0 + a1 * px1;
        let advice = 'BRAK_DANYCH'; // data contract — enum-like `advice` value written to .bot/state.json (= NO_DATA), kept unchanged
        let payback: number | null = null;
        if (lv.stats) {
          const a = assessPosition(
            { tickLower: Number(lo), tickUpper: Number(hi), valueUsd },
            lv.stats, chainId, match.feeBps as any, match.feeBps / 1_000_000, match.d0, match.d1,
            ADVISOR_PARAMS, gasUsdFor(match.chain) // live gas (26.08) instead of the $8 constant
          );
          advice = a.action;
          payback = a.paybackDays;
          if (a.action === 'REBALANCE') maybePropose(tokenId.toString(), match, a, valueUsd);
        }
        // accrued (uncollected) fees — static collect, best-effort: an RPC error
        // leaves null (the report will show "—"), does not crash the positions cycle.
        let feesUsd: number | null = null;
        try {
          const { result } = await client.simulateContract({
            address: pm, abi: PM_ABI, functionName: 'collect',
            args: [{ tokenId, recipient: WATCH_ADDRESS as `0x${string}`, amount0Max: MAX_U128, amount1Max: MAX_U128 }],
            account: WATCH_ADDRESS as `0x${string}`,
          });
          const [owed0, owed1] = result as unknown as [bigint, bigint];
          feesUsd = +(
            parseFloat(formatUnits(owed0, match.d0)) * px0 + parseFloat(formatUnits(owed1, match.d1)) * px1
          ).toFixed(2);
        } catch (e) {
          log(`fees #${tokenId}: ${String(e).slice(0, 100)}`);
        }

        const la = ledgerAgg.get(`${match.chain}:${tokenId.toString()}`);
        found.push({
          tokenId: tokenId.toString(), poolId: match.id,
          tickLower: Number(lo), tickUpper: Number(hi),
          amount0: a0, amount1: a1, valueUsd,
          inRange: lv.tick >= Number(lo) && lv.tick < Number(hi),
          advice, paybackDays: payback,
          collectedFeesUsd: la?.feesUsd ?? null,
          feesUsd,
          // COSTS = gas of this position's transactions (mint/increase/narrowing/
          // collect) from receipts. Entry swap costs deliberately do NOT go here
          // (Rafal's decision 29.08) — they belong to no leg,
          // the tranche balance counts them.
          costsUsd: la?.gasEth != null && ethUsdForGas ? +(la.gasEth * ethUsdForGas).toFixed(2) : null,
          rebalances: la ? la.rebalances : null,
          posture: match.productIdleWidthPct
            ? (isNarrowPos(match, { tickLower: Number(lo), tickUpper: Number(hi) }) ? 'narrow' : 'wide')
            : null,
        });

        // equity/HODL sample of the real position (paper-history pattern)
        try {
          const id = tokenId.toString();
          if (!posHodl[id]) {
            posHodl[id] = { a0, a1, poolId: match.id, anchoredAt: new Date().toISOString() };
            savePosHodl();
            log(`positions: HODL anchor for #${id} (${match.id}): ${a0.toFixed(6)} + ${a1.toFixed(6)}`);
          }
          const anchor = posHodl[id];
          const hodlUsd = anchor.a0 * px0 + anchor.a1 * px1;
          const tickHuman = (t: number) => Math.pow(1.0001, t) * Math.pow(10, match.d0 - match.d1);
          fs.appendFileSync(
            POS_HIST_PATH,
            JSON.stringify({
              ts: new Date().toISOString(), tokenId: id, poolId: match.id,
              valueUsd: +valueUsd.toFixed(2), hodlUsd: +hodlUsd.toFixed(2), feesUsd,
              inRange: lv.tick >= Number(lo) && lv.tick < Number(hi),
              price: +sqrtPriceX96ToHumanPrice(BigInt(lv.sqrtPriceX96), match.d0, match.d1).toPrecision(6),
              lo: +tickHuman(Number(lo)).toPrecision(6), hi: +tickHuman(Number(hi)).toPrecision(6),
            }) + '\n'
          );
        } catch (e) {
          log(`positions history #${tokenId}: ${String(e).slice(0, 100)}`);
        }
      }
    } catch (e) {
      log(`positions chain ${chainId} failed: ${String(e).slice(0, 140)}`);
    }
  }
  positions = found;

  // TRANCHE BALANCE (29.08) — a second, independent measure: how much of the deposited USDC
  // really exists today. Breakdown: difference = market move on the LP (PnL from anchors)
  // + RESIDUAL, where residual ≈ one-off entry costs (swaps/slippage/mint
  // gas) plus the buffer's beta in the wallet. The residual should be roughly
  // CONSTANT — its drift over time means something in the accounting is diverging.
  try {
    const prodPositions = found.filter((p) => p.posture !== null);
    const lpUsd = +prodPositions.reduce((s, p) => s + p.valueUsd, 0).toFixed(2);
    const wallet = await walletValueUsd();
    const walletUsd = wallet === null ? null : wallet.usd;
    const totalUsd = walletUsd === null ? null : +(lpUsd + walletUsd).toFixed(2);
    if (walletUsd !== null && !trancheAnchor) {
      trancheAnchor = { anchoredAt: new Date().toISOString(), walletUsd };
      fs.writeFileSync(TRANCHE_ANCHOR_PATH, JSON.stringify(trancheAnchor, null, 2));
      log(`tranche: buffer anchor saved ($${walletUsd.toFixed(2)})`);
    }
    // BEWARE of the trap (caught while writing): an anchor priced at TODAY'S
    // prices gives "vs HODL" (~$0), not the market move. Market move = value
    // today − value at the MOMENT of anchoring, i.e. hodlUsd of the FIRST
    // positions-history sample (the same convention as "PnL from anchor" in the report/UI).
    const firstAnchorUsd = new Map<string, number>();
    // FIX 01.09 (Fable, finding from the morning report): the rebalance
    // #5887690→#5908083 made "entry costs (fixed)" jump
    // −$8.58→−$76.02. Mechanism: marketPnl counted ONLY open positions,
    // so the realised market move of the CLOSED position (−$66 of beta of the old
    // cbBTC leg from 27–31.08) dropped out of the "market move" and landed in
    // the residual "entry costs". Fix: for closed product positions
    // we add (last sample − first anchor) from
    // positions-history. The hedge (poolId gmx-*) is filtered out by the set of
    // product pools. The round's swap/slippage cost STILL stays in
    // entry costs (that is a real cost, not a market move).
    const lastSample = new Map<string, { poolId: string; valueUsd: number }>();
    try {
      for (const lineRaw of fs.readFileSync(POS_HIST_PATH, 'utf8').trimEnd().split('\n')) {
        const r = JSON.parse(lineRaw);
        if (!firstAnchorUsd.has(r.tokenId) && typeof r.hodlUsd === 'number') firstAnchorUsd.set(r.tokenId, r.hodlUsd);
        if (typeof r.valueUsd === 'number') lastSample.set(r.tokenId, { poolId: r.poolId, valueUsd: r.valueUsd });
      }
    } catch { /* no history (fresh start) → marketPnl stays null */ }
    let marketPnl: number | null = null;
    for (const p of prodPositions) {
      const anchorUsd = firstAnchorUsd.get(p.tokenId);
      if (anchorUsd === undefined) continue;
      marketPnl = (marketPnl ?? 0) + (p.valueUsd - anchorUsd);
    }
    // closed product positions (realised market move)
    const productPoolIds = new Set(BOT_POOLS.filter((p) => p.productIdleWidthPct).map((p) => p.id));
    const openIds = new Set(prodPositions.map((p) => p.tokenId));
    for (const [id, rec] of Array.from(lastSample.entries())) {
      if (openIds.has(id) || !productPoolIds.has(rec.poolId)) continue;
      const anchorUsd = firstAnchorUsd.get(id);
      if (anchorUsd === undefined) continue;
      marketPnl = (marketPnl ?? 0) + (rec.valueUsd - anchorUsd);
    }
    const gasEthTotal = Object.values(txCosts).reduce((s, c) => s + c.gasEth, 0);
    const diffUsd = totalUsd === null ? null : +(totalUsd - TRANCHE.depositedUsd).toFixed(2);
    trancheLive = {
      label: TRANCHE.label, depositedUsd: TRANCHE.depositedUsd, startedAt: TRANCHE.startedAt,
      lpUsd, walletUsd, totalUsd,
      diffUsd,
      diffPct: diffUsd === null ? null : +((diffUsd / TRANCHE.depositedUsd) * 100).toFixed(2),
      marketPnlUsd: marketPnl === null ? null : +marketPnl.toFixed(2),
      residualUsd: diffUsd === null || marketPnl === null ? null : +(diffUsd - marketPnl).toFixed(2),
      gasUsd: ethUsdForGas ? +(gasEthTotal * ethUsdForGas).toFixed(2) : null,
      entryCostUsd: null, bufferBetaUsd: null, // filled in below, when there is an anchor
      walletParts: wallet?.parts ?? null,
      updatedAt: new Date().toISOString(),
    };
    // breakdown of the "residual": buffer beta (floats with price) vs entry costs (fixed)
    if (trancheLive.residualUsd !== null && walletUsd !== null && trancheAnchor) {
      trancheLive.bufferBetaUsd = +(walletUsd - trancheAnchor.walletUsd).toFixed(2);
      trancheLive.entryCostUsd = +(trancheLive.residualUsd - trancheLive.bufferBetaUsd).toFixed(2);
    }
  } catch (e) {
    log(`tranche balance: ${String(e).slice(0, 140)}`);
  }

  // PRODUCT 27.08 (Rafal's ruling after entering #5886957): the OPEN proposal
  // disappears automatically when we ALREADY have a position in this pool —
  // a hanging "open" after entry is an invitation to a double entry.
  // Another position in the same pool is proposed by the selector (a new proposal
  // the next day, if justified) or opened manually.
  try {
    const heldPools = new Set(found.map((x) => x.poolId).filter(Boolean));
    let autoClosed = 0;
    for (const pr of proposals) {
      if (pr.status === 'open' && pr.kind === 'OPEN' && pr.poolId && heldPools.has(pr.poolId)) {
        pr.status = 'dismissed';
        pr.note = `${pr.note ? pr.note + ' · ' : ''}closed automatically — position in this pool already open`;
        autoClosed++;
        log(`proposal ${pr.id}: closed automatically — position in ${pr.poolId} already open`);
      }
      // cleanup after v1.2 (29.08): an advisor REBALANCE on a PRODUCT pool
      // has no right to hang — width is governed by the FLAT_* cycle. The guard in
      // maybePropose alone blocks only NEW ones; those saved in proposals.json before
      // the fix would survive a restart (the incident class of 27.08).
      if (pr.status === 'open' && pr.kind === 'REBALANCE' && pr.poolId &&
          BOT_POOLS.find((b) => b.id === pr.poolId)?.productIdleWidthPct) {
        pr.status = 'dismissed';
        pr.note = `${pr.note ? pr.note + ' · ' : ''}closed automatically — product pool, narrowing is governed by the FLAT_NARROW/FLAT_WIDEN cycle`;
        autoClosed++;
        log(`proposal ${pr.id}: REBALANCE dismissed — ${pr.poolId} is a product pool (FlatWide hybrid)`);
      }
    }
    if (autoClosed) saveProposals();
  } catch (e) {
    log(`auto-close OPEN: ${String(e).slice(0, 100)}`);
  }

  // --- FlatWide product: narrowing/widening proposals per flat state ---
  // (transition-only in updateFlat would miss positions opened/detected AFTER
  // the transition and a restart mid-episode — this sweep closes both cases;
  // dedup in propose* guarantees no duplicates)
  try {
    for (const p of BOT_POOLS) {
      if (!p.productIdleWidthPct) continue;
      const st = flat[p.id];
      const held = found.filter((x) => x.poolId === p.id);
      if (!held.length) continue;
      for (const pos of held) {
        const narrow = isNarrowPos(p, pos);
        if (st?.confirmed && !narrow) proposeFlatNarrow(p, pos);
        if (!st?.confirmed && narrow && Math.abs((live[p.id]?.trendGapPct ?? 0) / 100) > FLAT.exitGap)
          proposeFlatWiden(p, pos);
      }
      // cleanup after a manual signature: proposal executed = close it
      if (held.some((pos) => isNarrowPos(p, pos))) dismissOpenByKind('FLAT_NARROW', p.id, 'position already narrow');
      if (held.some((pos) => !isNarrowPos(p, pos))) dismissOpenByKind('FLAT_WIDEN', p.id, 'position already wide');
    }
  } catch (e) {
    log(`flat sweep: ${String(e).slice(0, 100)}`);
  }

  // --- real hedge on GMX (Arbitrum) — read via the Reader, see the comment at GMX ---
  try {
    const arb = clients['arbitrum'];
    const ethUsdNow = Object.values(live).find((l) => typeof l.ethUsd === 'number' && l.ethUsd > 0)?.ethUsd ?? 0;
    if (arb && ethUsdNow > 0) {
      const raw = (await arb.readContract({
        address: GMX.reader as `0x${string}`, abi: GMX_READER_ABI, functionName: 'getAccountPositions',
        args: [GMX.dataStore as `0x${string}`, WATCH_ADDRESS, 0n, 20n],
      })) as ReadonlyArray<{ addresses: { market: string }; numbers: { sizeInUsd: bigint; sizeInTokens: bigint; collateralAmount: bigint }; flags: { isLong: boolean } }>;
      const p = raw.find((x) => x.addresses.market.toLowerCase() === GMX.ethUsdMarket.toLowerCase() && x.numbers.sizeInUsd > 0n);
      if (p) {
        const sizeUsd = Number(p.numbers.sizeInUsd) / 1e30;
        const sizeEth = Number(p.numbers.sizeInTokens) / 1e18;
        const collateralUsd = Number(p.numbers.collateralAmount) / 1e6; // USDC
        // sanity (a wrong decode after a GMX ABI upgrade → absurd scales)
        if (sizeUsd > 0.01 && sizeUsd < 1e7 && sizeEth > 0 && collateralUsd < 1e7) {
          const entry = sizeUsd / sizeEth;
          const pnl = (p.flags.isLong ? ethUsdNow - entry : entry - ethUsdNow) * sizeEth;
          hedgeLive = {
            isLong: p.flags.isLong, sizeUsd, sizeEth, collateralUsd,
            entryPriceUsd: entry, pnlUsd: pnl, equityUsd: collateralUsd + pnl,
            updatedAt: new Date().toISOString(),
          };
          fs.appendFileSync(
            POS_HIST_PATH,
            JSON.stringify({
              ts: new Date().toISOString(), tokenId: 'gmx-eth-short', poolId: 'gmx-eth-usd',
              valueUsd: +hedgeLive.equityUsd.toFixed(2), hodlUsd: +collateralUsd.toFixed(2), // benchmark: cash (collateral without the short)
              inRange: true, price: +ethUsdNow.toFixed(2),
            }) + '\n'
          );
          if (!hedgeWasOpen) {
            hedgeWasOpen = true;
            void telegram(`🛡 HOMOS: detected ${p.flags.isLong ? 'LONG' : 'SHORT'} on GMX ETH/USD — $${sizeUsd.toFixed(0)} @ $${entry.toFixed(0)}, collateral $${collateralUsd.toFixed(0)} (on-chain read, observing every cycle)`);
          }
          // orphan warning: the short is hanging while NO pool has a DOWN signal
          const anyDown = Object.values(trend).some((t) => t.down);
          if (!p.flags.isLong && !anyDown && Math.random() < 0.017) {
            // ~once a day at a 5 min cycle (288 cycles * 0.017 ≈ 5; rare enough, zero extra state)
            void telegram(`⚠️ HOMOS: GMX short $${sizeUsd.toFixed(0)} open, but the trend signal is NOT DOWN on any pool — check whether to keep/close it (PnL $${pnl.toFixed(2)})`);
          }
        } else {
          log(`gmx hedge: read out of scale (sizeUsd=${sizeUsd}, sizeEth=${sizeEth}) — possible Reader ABI change, skipping`);
          hedgeLive = null;
        }
      } else {
        if (hedgeWasOpen) {
          hedgeWasOpen = false;
          void telegram('🛡 HOMOS: hedge position on GMX CLOSED (the Reader no longer sees the position)');
        }
        hedgeLive = null;
      }
    }
  } catch (e) {
    log(`gmx hedge read failed: ${String(e).slice(0, 140)}`);
  }

  // a position opened/detected DURING an ongoing DOWN signal also gets
  // a proposal (transition-only would miss it; dedup in proposeExitTrend)
  for (const p of BOT_POOLS) {
    if (trend[p.id]?.down && positions.some((x) => x.poolId === p.id)) {
      const gap = (live[p.id]?.trendGapPct ?? 0) / 100;
      proposeExitTrend(p, gap);
    }
  }
  saveState();
}

/** USD prices of both legs of the pool + human price — for paper trading (the same pricing
 *  logic as refreshPositions; respects quote:'WETH') */
function legPrices(p: BotPool): LegPrices | null {
  const lv = live[p.id];
  if (!lv) return null;
  const human = sqrtPriceX96ToHumanPrice(BigInt(lv.sqrtPriceX96), p.d0, p.d1);
  let px0: number, px1: number;
  if ((p.quote ?? 'USD') === 'USD') {
    px0 = p.ethIsToken0 ? lv.ethUsd : 1;
    px1 = p.ethIsToken0 ? 1 : lv.ethUsd;
  } else {
    const ref = refEthUsd(p);
    if (ref == null) return null;
    px0 = p.ethIsToken0 ? ref : lv.ethUsd;
    px1 = p.ethIsToken0 ? lv.ethUsd : ref;
  }
  return { px0, px1, human };
}

/** tick → USD price of the pool's base token (respects quote:'WETH' via the reference rate) */
function tickToUsd(pool: BotPool, t: number): number {
  const raw = Math.pow(1.0001, t) * Math.pow(10, pool.d0 - pool.d1);
  if ((pool.quote ?? 'USD') === 'USD') return pool.ethIsToken0 ? raw : 1 / raw;
  const inWeth = pool.ethIsToken0 ? 1 / raw : raw;
  return inWeth * (refEthUsd(pool) ?? 0);
}

function maybePropose(tokenId: string, pool: BotPool, a: ReturnType<typeof assessPosition>, valueUsd: number) {
  // PRODUCT POOLS DO NOT GET AN ADVISOR REBALANCE (fix 29.08, found
  // while reviewing the UI section). The FlatWide hybrid has ONE body deciding
  // on width: the FLAT_NARROW/FLAT_WIDEN cycle (|gap| 2%/5% + confirm).
  // The k×σ advisor is v1.2 logic — without this exception the bot could issue
  // a narrowing proposal OUTSIDE the cycle, i.e. exactly the incident class
  // of 27.08 (an old narrow ±16% proposal looking like a normal one).
  // The `advice` from assessPosition itself stays in state (telemetry/diagnostics),
  // but no longer turns into a proposal to sign.
  if (pool.productIdleWidthPct) return;
  const key = `${tokenId}-${a.suggestion.tickLower}-${a.suggestion.tickUpper}`;
  if (proposals.some((p) => p.id === key && p.status === 'open')) return;
  const toUsd = (t: number) => tickToUsd(pool, t);
  const [usdLo, usdHi] = [toUsd(a.suggestion.tickLower), toUsd(a.suggestion.tickUpper)].sort((x, y) => x - y);
  const prop: Proposal = {
    id: key, createdAt: new Date().toISOString(), tokenId, poolId: pool.id,
    kind: 'REBALANCE', action: 'REBALANCE',
    suggestedRange: { tickLower: a.suggestion.tickLower, tickUpper: a.suggestion.tickUpper, usdLo, usdHi },
    costUsd: a.costUsd, paybackDays: a.paybackDays, status: 'open',
  };
  proposals.push(prop);
  saveProposals();
  const msg = `🤖 HOMOS: REBALANCE proposal for position #${tokenId} (${pool.id}, $${valueUsd.toFixed(0)}) → range $${usdLo.toFixed(0)}–$${usdHi.toFixed(0)}, cost ~$${a.costUsd.toFixed(2)}, payback ~${a.paybackDays?.toFixed(1)}d. [OBSERVE mode — nothing executed]`;
  log(msg);
  telegram(msg);
}

// --- pool selector (once a day after 8:00, after the 07:30 pipeline) ---
function runSelector() {
  try {
    runSelectorIfDue({
      log,
      telegram,
      getProposals: () => proposals,
      addProposal: (p: SelectorProposal) => {
        proposals.push(p as Proposal);
        saveProposals();
        saveState();
      },
      getPositions: () => positions.map((p) => ({ tokenId: p.tokenId, poolId: p.poolId, valueUsd: p.valueUsd })),
      getSuggestion: (poolId: string) => {
        const lv = live[poolId];
        const pool = BOT_POOLS.find((b) => b.id === poolId);
        if (!lv?.suggestion || !pool) return null;
        const toUsd = (t: number) => tickToUsd(pool, t);
        const [usdLo, usdHi] = [toUsd(lv.suggestion.tickLower), toUsd(lv.suggestion.tickUpper)].sort((x, y) => x - y);
        return { tickLower: lv.suggestion.tickLower, tickUpper: lv.suggestion.tickUpper, usdLo, usdHi };
      },
      getGasUsd: (chain: string) => gasUsdLive[chain] ?? null, // live gas (26.08)
    });
  } catch (e) {
    log(`selector crashed: ${String(e).slice(0, 160)}`);
  }
}

// --- transaction ledger (TASKS-LEDGER.md; ndjson in .bot/, resumable backfill) ---
let ledgerBusy = false;
async function runLedger() {
  if (ledgerBusy) return; // backfill may stretch beyond a cycle — no overlapping
  ledgerBusy = true;
  try {
    await updateLedger(clients as unknown as Record<string, any>, {
      log,
      // ETH rate from live prices of pools quoted in USD (see the header of ledger.ts:
      // pricing as of indexing time — for the backfill updateLedger will give usd:null)
      ethUsd: () => {
        for (const p of BOT_POOLS) {
          if ((p.quote ?? 'USD') !== 'USD') continue;
          const lv = live[p.id];
          if (lv?.ethUsd) return lv.ethUsd;
        }
        return null;
      },
    });
  } catch (e) {
    log(`ledger crashed: ${String(e).slice(0, 160)}`); // never takes the cycle down
  } finally {
    ledgerBusy = false;
  }
}

// --- start ---
(async () => {
  log(`observer start — watch=${WATCH_ADDRESS}, pools=${BOT_POOLS.map((p) => p.id).join(', ')}, mode=OBSERVE`);
  await refreshPrices();
  await refreshStats();
  await refreshGas(); // live gas BEFORE the first position assessment (payback)
  await refreshPositions();
  runSelector();
  setInterval(refreshPrices, INTERVALS.priceSec * 1000);
  setInterval(refreshGas, 5 * 60 * 1000); // live gas every 5 min (positions cadence)
  setInterval(refreshStats, INTERVALS.statsSec * 1000);
  setInterval(refreshPositions, INTERVALS.positionsSec * 1000);
  runLedger();
  setInterval(runLedger, INTERVALS.positionsSec * 1000); // ledger: the same cadence as positions
  setInterval(runSelector, 60 * 60 * 1000); // checks every hour whether it already ran today
  expireStaleProposals();
  setInterval(expireStaleProposals, 60 * 60 * 1000);
  applyProposalCommands();
  setInterval(applyProposalCommands, 30 * 1000); // commands from the UI (dismissals) within ≤30 s
  setInterval(flushTelegram, TG_FLUSH_MS); // aggregated TG message every 15 min
  log('loops started (60s prices / 15min statistics / 5min positions / selector 1x daily after 8:00)');
})();
