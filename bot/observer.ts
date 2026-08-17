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
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { createPublicClient, http, fallback, PublicClient, formatUnits } from 'viem';
import { mainnet, base, arbitrum } from 'viem/chains';
import { BOT_POOLS, BotPool, RPC, NFT_MANAGER, WATCH_ADDRESS, INTERVALS, STATE_DIR, TREND } from './config';
import { ADVISOR_PARAMS } from '../src/utils/advisor';
import { fetchRecentSwaps, computeStats, assessPosition, suggestRange, PoolStats } from '../src/utils/advisor';
import { getAmountsForLiquidity, sqrtPriceX96ToHumanPrice } from '../src/utils/v3math';
import { runSelectorIfDue, SelectorProposal } from './selector';

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
  arbitrum: createPublicClient({ chain: arbitrum, transport: fallback(RPC.arbitrum.map((u) => http(u))) }),
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
  /** bezpiecznik trendu (v1.1): odchylenie log-ceny od EMA7d w % i stan sygnału */
  trendGapPct?: number;
  trendDown?: boolean;
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
  tokenId: string; // '' dla propozycji OPEN z selektora
  poolId: string; // '' gdy pula spoza BOT_POOLS (selektor → note)
  /** REBALANCE (doradca pozycji) | OPEN / ROTATE (selektor) | EXIT_TREND (bezpiecznik v1.1) */
  kind?: 'REBALANCE' | 'OPEN' | 'ROTATE' | 'EXIT_TREND';
  action: string;
  suggestedRange?: { tickLower: number; tickUpper: number; usdLo: number; usdHi: number };
  costUsd?: number;
  paybackDays?: number | null;
  // pola selektora (OPEN/ROTATE):
  llamaPool?: string;
  symbol?: string;
  chain?: string;
  apy7d?: number;
  heldApy7d?: number;
  breakEvenDays?: number;
  note?: string;
  status: 'open' | 'dismissed';
}

const live: Record<string, PoolLive> = {};
let positions: WatchedPosition[] = [];
let proposals: Proposal[] = fs.existsSync(PROPOSALS_PATH) ? JSON.parse(fs.readFileSync(PROPOSALS_PATH, 'utf8')) : [];

const bigintReplacer = (_key: string, value: unknown) => (typeof value === 'bigint' ? value.toString() : value);

const saveState = () => {
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      { updatedAt: new Date().toISOString(), mode: 'OBSERVE', watch: WATCH_ADDRESS, pools: Object.values(live), positions, proposals: proposals.filter((p) => p.status === 'open') },
      bigintReplacer, 2
    )
  );
};
const saveProposals = () => fs.writeFileSync(PROPOSALS_PATH, JSON.stringify(proposals, bigintReplacer, 2));

// TTL propozycji selektora (dodane 17.08 po analizie OBSERWUJ): OPEN/ROTATE
// opierają się na dziennym rankingu — po 48h ranking jest nieaktualny i wisząca
// propozycja wprowadza w błąd (widzieliśmy wpisy z 10.08 żywe 17.08).
// REBALANCE/EXIT_TREND nie wygasają (bazują na stanie pozycji, nie rankingu).
const PROPOSAL_TTL_MS = 48 * 3600 * 1000;
function expireStaleProposals() {
  let changed = false;
  for (const p of proposals) {
    if (p.status !== 'open') continue;
    if ((p.kind === 'OPEN' || p.kind === 'ROTATE') && Date.now() - new Date(p.createdAt).getTime() > PROPOSAL_TTL_MS) {
      p.status = 'dismissed';
      p.note = `${p.note ? p.note + ' · ' : ''}[auto-wygaszona po 48h — ranking nieaktualny]`;
      changed = true;
      log(`proposal ${p.id}: auto-wygaszona (TTL 48h)`);
    }
  }
  if (changed) {
    saveProposals();
    saveState();
  }
}

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

// --- orientacja cen per pula ---
// Dla pul quote:'USD' pole ethUsd = USD za ETH (jak dotąd). Dla quote:'WETH'
// (np. cbBTC/WETH) ethUsd = USD za TOKEN BAZOWY (nie-WETH), liczony jako
// (cena bazowego w WETH) × (ETH/USD z puli referencyjnej usdRefPoolId).
/** USD za WETH dla danej puli (1 dla samej referencji nie ma sensu — to kurs) */
const refEthUsd = (p: BotPool): number | null => {
  if ((p.quote ?? 'USD') === 'USD') return null; // nie dotyczy
  const ref = p.usdRefPoolId ? live[p.usdRefPoolId] : undefined;
  return ref && (BOT_POOLS.find((b) => b.id === p.usdRefPoolId)?.quote ?? 'USD') === 'USD' ? ref.ethUsd : null;
};
/** surowa cena human (token1/token0) → USD za token bazowy puli */
const humanToBaseUsd = (p: BotPool, human: number): number | null => {
  if ((p.quote ?? 'USD') === 'USD') return p.ethIsToken0 ? human : 1 / human;
  const inWeth = p.ethIsToken0 ? 1 / human : human; // WETH za token bazowy
  const ref = refEthUsd(p);
  return ref ? inWeth * ref : null;
};

// --- bezpiecznik trendu (ALGORITHM.md v1.1 §4) ---
// EMA log-ceny WZGLĘDNEJ pary (HL 7d), sygnał DOWN gdy gap < −5%.
// Powrót: 'aboveEma' (domyślny) — gap > 0; 'half' (cbBTC) — gap > −2.5%.
// Stan persystowany (.bot/trend-state.json) — restart usługi nie zeruje EMA.
const TREND_STATE_PATH = path.join(DIR, 'trend-state.json');
interface TrendState { ema: number; lastTs: number; down: boolean }
const trend: Record<string, TrendState> = fs.existsSync(TREND_STATE_PATH)
  ? JSON.parse(fs.readFileSync(TREND_STATE_PATH, 'utf8'))
  : {};
const saveTrend = () => fs.writeFileSync(TREND_STATE_PATH, JSON.stringify(trend, null, 2));
const TREND_TAU_MS = (TREND.hlDays * 86400 * 1000) / Math.LN2;

/** cena względna pary do detekcji trendu: dla quote USD = USD za bazowy;
 *  dla quote WETH = cena bazowego W WETH (bez szumu kursu ETH/USD) */
const trendPrice = (p: BotPool, human: number): number =>
  (p.quote ?? 'USD') === 'USD' ? (p.ethIsToken0 ? human : 1 / human) : (p.ethIsToken0 ? 1 / human : human);

/** aktualizacja EMA + detekcja sygnału; zwraca gap w % (log) */
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
  const gap = logP - st.ema;
  const wasDown = st.down;
  if (!st.down && gap < -TREND.thresh) st.down = true;
  else if (st.down) {
    const backAt = (p.trendReentry ?? 'aboveEma') === 'aboveEma' ? 0 : -TREND.thresh / 2;
    if (gap > backAt) st.down = false;
  }
  if (st.down !== wasDown) {
    log(`trend ${p.id}: ${st.down ? '⛔ DOWN (gap ' + (gap * 100).toFixed(1) + '%)' : '✅ koniec sygnału (gap ' + (gap * 100).toFixed(1) + '%)'}`);
    saveTrend();
    if (st.down) proposeExitTrend(p, gap);
  }
  return gap * 100;
}

/** propozycja EXIT_TREND dla każdej naszej pozycji w puli z sygnałem DOWN */
function proposeExitTrend(pool: BotPool, gap: number) {
  const held = positions.filter((x) => x.poolId === pool.id);
  if (!held.length) return;
  for (const pos of held) {
    const key = `trend-${pool.id}-${pos.tokenId}-${new Date().toISOString().slice(0, 10)}`;
    // dedup: jedna OTWARTA propozycja EXIT_TREND per pozycja (niezależnie od dnia)
    if (proposals.some((x) => x.kind === 'EXIT_TREND' && x.tokenId === pos.tokenId && x.status === 'open')) continue;
    const prop: Proposal = {
      id: key, createdAt: new Date().toISOString(), tokenId: pos.tokenId, poolId: pool.id,
      kind: 'EXIT_TREND', action: 'EXIT_TREND',
      symbol: `${pool.sym0}-${pool.sym1}`,
      note: `Bezpiecznik trendu (ALGORITHM v1.1 §4): cena ${(gap * 100).toFixed(1)}% pod EMA${TREND.hlDays}d (próg −${TREND.thresh * 100}%). Sugestia: zamknij pozycję do cash 50/50; powrót po ${(pool.trendReentry ?? 'aboveEma') === 'aboveEma' ? 'powrocie ceny NAD EMA' : 'gap > −' + (TREND.thresh * 50) + '%'}.`,
      status: 'open',
    };
    proposals.push(prop);
    saveProposals();
    const msg = `⛔ HOMOS: BEZPIECZNIK TRENDU — ${pool.id}, pozycja #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): cena ${(gap * 100).toFixed(1)}% pod EMA7d. Propozycja: wyjdź do cash 50/50. [tryb OBSERWUJ — nic nie wykonano]`;
    log(msg);
    telegram(msg);
  }
}

// --- pętla cen (60s) ---
async function refreshPrices() {
  // pule USD najpierw — pule kwotowane w WETH potrzebują ich kursu jako referencji
  const ordered = [...BOT_POOLS].sort((a, b) => ((a.quote ?? 'USD') === 'USD' ? 0 : 1) - ((b.quote ?? 'USD') === 'USD' ? 0 : 1));
  for (const p of ordered) {
    try {
      const s = (await clients[p.chain].readContract({ address: p.address, abi: SLOT0_ABI, functionName: 'slot0' })) as readonly [bigint, number, ...unknown[]];
      const human = sqrtPriceX96ToHumanPrice(s[0], p.d0, p.d1);
      const prev = live[p.id];
      const baseUsd = humanToBaseUsd(p, human);
      if (baseUsd === null) {
        log(`price ${p.id}: brak kursu referencyjnego ${p.usdRefPoolId} — pomijam tick`);
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
    } catch (e) {
      log(`price ${p.id} failed: ${String(e).slice(0, 120)}`);
    }
  }
  saveState();
}

// --- pętla statystyk (15min) ---
const HISTORY_PATH = path.join(DIR, 'history.ndjson');

async function refreshStats() {
  for (const p of BOT_POOLS) {
    try {
      const swaps = await fetchRecentSwaps(clients[p.chain] as any, p.address, p.chainId, 24);
      const stats = computeStats(swaps, p.chainId, p.d0, p.d1, p.feeBps / 1_000_000, TICK_SPACING[p.feeBps]);
      if (live[p.id] && stats) {
        live[p.id].stats = stats;
        // k per pula (ALGORITHM v1.1: ETH/stable k=3 domyślne, cbBTC k=2)
        live[p.id].suggestion = suggestRange(stats, p.feeBps as any, p.d0, p.d1, {
          ...ADVISOR_PARAMS, k: p.advisorK ?? ADVISOR_PARAMS.k,
        });
        log(`stats ${p.id}: vol=${(stats.volDaily * 100).toFixed(2)}%/d feeYield=${(stats.feeYieldDaily * 100).toFixed(3)}%/d swaps=${stats.swapsAnalyzed}`);
      }
      // snapshot do historii (dashboard "Analiza obserwacji" w UI) — co cykl 15min
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
        // dopasowanie po ADRESACH tokenów gdy pula ma t0/t1 w konfiguracji
        // (jednoznaczne przy wielu parach na tym samym tierze — np. cbBTC/WETH
        // 0.05% i USDC/WETH 0.05% na Base); fallback: chain+fee jak dotąd.
        const eq = (a: string, b?: string) => !!b && a.toLowerCase() === b.toLowerCase();
        const match =
          BOT_POOLS.find((p) => p.chainId === chainId && p.feeBps === Number(fee) && eq(t0, p.t0) && eq(t1, p.t1)) ??
          BOT_POOLS.find((p) => p.chainId === chainId && p.feeBps === Number(fee) && !p.t0);
        if (!match || !live[match.id]) continue;
        const lv = live[match.id];
        const { amount0, amount1 } = getAmountsForLiquidity(BigInt(lv.sqrtPriceX96), Number(lo), Number(hi), L);
        const a0 = parseFloat(formatUnits(amount0, match.d0));
        const a1 = parseFloat(formatUnits(amount1, match.d1));
        // wycena USD: ethUsd = USD za token bazowy (dla quote:'WETH' to np. cbBTC);
        // druga noga: USD-stable = 1, WETH = kurs z puli referencyjnej.
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
  // pozycja otwarta/wykryta w TRAKCIE trwającego sygnału DOWN też dostaje
  // propozycję (transition-only by ją ominął; dedup w proposeExitTrend)
  for (const p of BOT_POOLS) {
    if (trend[p.id]?.down && positions.some((x) => x.poolId === p.id)) {
      const gap = (live[p.id]?.trendGapPct ?? 0) / 100;
      proposeExitTrend(p, gap);
    }
  }
  saveState();
}

/** tick → cena USD tokena bazowego puli (respektuje quote:'WETH' przez kurs referencyjny) */
function tickToUsd(pool: BotPool, t: number): number {
  const raw = Math.pow(1.0001, t) * Math.pow(10, pool.d0 - pool.d1);
  if ((pool.quote ?? 'USD') === 'USD') return pool.ethIsToken0 ? raw : 1 / raw;
  const inWeth = pool.ethIsToken0 ? 1 / raw : raw;
  return inWeth * (refEthUsd(pool) ?? 0);
}

function maybePropose(tokenId: string, pool: BotPool, a: ReturnType<typeof assessPosition>, valueUsd: number) {
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
  const msg = `🤖 HOMOS: propozycja REBALANS pozycji #${tokenId} (${pool.id}, $${valueUsd.toFixed(0)}) → zakres $${usdLo.toFixed(0)}–$${usdHi.toFixed(0)}, koszt ~$${a.costUsd.toFixed(2)}, payback ~${a.paybackDays?.toFixed(1)}d. [tryb OBSERWUJ — nic nie wykonano]`;
  log(msg);
  telegram(msg);
}

// --- selektor pul (raz dziennie po 8:00, po pipeline 07:30) ---
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
    });
  } catch (e) {
    log(`selector crashed: ${String(e).slice(0, 160)}`);
  }
}

// --- start ---
(async () => {
  log(`observer start — watch=${WATCH_ADDRESS}, pools=${BOT_POOLS.map((p) => p.id).join(', ')}, tryb=OBSERWUJ`);
  await refreshPrices();
  await refreshStats();
  await refreshPositions();
  runSelector();
  setInterval(refreshPrices, INTERVALS.priceSec * 1000);
  setInterval(refreshStats, INTERVALS.statsSec * 1000);
  setInterval(refreshPositions, INTERVALS.positionsSec * 1000);
  setInterval(runSelector, 60 * 60 * 1000); // co godzinę sprawdza, czy dziś już był
  expireStaleProposals();
  setInterval(expireStaleProposals, 60 * 60 * 1000);
  log('pętle uruchomione (60s ceny / 15min statystyki / 5min pozycje / selektor 1×dziennie po 8:00)');
})();
