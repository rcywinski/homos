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
import { paperTick, LegPrices } from './paper';
import { updateLedger } from './ledger';

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

// --- żywy gaz (decyzja przeglądu 26.08 — DECYZJE 6a / TASKS-RECAL §4) ---
// Stała $8 na mainnet karała payback 4-8× przy realnym gazie 0.3-1.4 Gwei
// (potwierdzone bojowo 25.08: collect $0.27 przy progu liczonym ze stałej).
// Koszt cyklu = eth_gasPrice × GAS_UNITS_CYCLE × kurs ETH; podłoga chroni
// przed zaniżeniem na L2 (opłata L1-data niewidoczna w gasPrice egzekucji),
// stara stała zostaje WYŁĄCZNIE jako fallback przed pierwszym odczytem.
// Backtest/paper celowo NIE ruszane — koszt per-reżim wchodzi w paczce
// rekalibracyjnej (rekalibracja = podbicie algoVersion).
const GAS_UNITS_CYCLE = 800_000; // decrease+collect+swap+mint+approvals (~zgodne z pomiarem $1-2 przy 0.3-1.4 Gwei)
const GAS_FLOOR_USD: Record<string, number> = { mainnet: 0.5, base: 0.08, arbitrum: 0.1 };
const GAS_STATIC_USD: Record<string, number> = { mainnet: 8, base: 0.08, arbitrum: 0.1 };
const gasUsdLive: Record<string, number> = {};
const gasUsdFor = (chain: BotPool['chain']): number => gasUsdLive[chain] ?? GAS_STATIC_USD[chain] ?? 5;
async function refreshGas() {
  // kurs ETH z pierwszej żywej puli kwotowanej w USD (bez własnego zapytania)
  const ethUsd = BOT_POOLS
    .filter((p) => (p.quote ?? 'USD') === 'USD')
    .map((p) => live[p.id]?.ethUsd)
    .find((v): v is number => typeof v === 'number' && v > 0);
  if (!ethUsd) return; // przed pierwszym odczytem cen — spróbujemy za 5 min
  for (const chain of [...new Set(BOT_POOLS.map((p) => p.chain))]) {
    try {
      const wei = await clients[chain].getGasPrice();
      const usd = (Number(wei) / 1e18) * GAS_UNITS_CYCLE * ethUsd;
      gasUsdLive[chain] = Math.max(usd, GAS_FLOOR_USD[chain] ?? 0.05);
    } catch {
      /* zostaje ostatni znany / fallback statyczny — awaria RPC nie kładzie cyklu */
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
  /** REBALANCE (doradca) | OPEN/ROTATE (selektor) | EXIT_TREND / HEDGE (bezpiecznik v1.2) */
  kind?: 'REBALANCE' | 'OPEN' | 'ROTATE' | 'EXIT_TREND' | 'HEDGE';
  /** dla kind HEDGE: sugerowany rozmiar shorta (nadwyżka ETH ponad 50% wartości) */
  hedgeSizeEth?: number;
  hedgeNotionalUsd?: number;
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

// --- śledzenie REALNYCH pozycji jak w paper (20.08, decyzja Rafała):
// equity + HODL per tokenId, próbki co cykl refreshPositions (5 min).
// HODL = kwoty tokenów ZAMROŻONE przy pierwszym zauważeniu pozycji przez
// bota (kotwica w .bot/positions-hodl.json — restart jej nie zeruje);
// UWAGA uczciwości: dla pozycji starszych niż wdrożenie kotwica = stan z
// dziś, nie z prawdziwego otwarcia — porównanie biegnie "od teraz".
// Wykresy UI (redesign kart pozycji wg wzorca paper) czytają
// /api/positions-history. Format próbki jak paper-history (price/lo/hi
// human) — UI reużywa te same komponenty.
const POS_HIST_PATH = path.join(DIR, 'positions-history.ndjson');
const POS_HODL_PATH = path.join(DIR, 'positions-hodl.json');

// --- śledzenie REALNEGO hedge'a na GMX (20.08, uwaga Rafała po teście E2E:
// short istniał tylko na app.gmx.io i w localStorage jednej przeglądarki —
// bot go nie widział, więc nie było go na wykresach/raporcie/iPhone i nikt
// nie ostrzegłby "sygnał zgasł, a short wisi"). Odczyt przez GMX Reader
// (getAccountPositions) co cykl refreshPositions; stan w state.json
// (pole `hedge`), próbka equity do positions-history pod tokenId
// 'gmx-eth-short' (UI: karta bez pasma zakresu — perp nie ma zakresu).
// UWAGA ABI: struct Position.Props wg MAIN gmx-synthetics (10 pól w
// numbers, w tym pendingImpactAmount int256) — przy aktualizacji GMX
// zweryfikować kształt, zły decode przesuwa pola; sanity-check niżej
// (market/skala) łapie rozjazd i loguje zamiast podawać śmieci.
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
  pnlUsd: number; // vs bieżący mark (ethUsd z telemetrii)
  equityUsd: number; // collateral + pnl
  updatedAt: string;
}
let hedgeLive: HedgeLive | null = null;
let hedgeWasOpen = false; // do powiadomień na przejściach open/close
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
      { updatedAt: new Date().toISOString(), mode: 'OBSERVE', watch: WATCH_ADDRESS, pools: Object.values(live), positions, hedge: hedgeLive, gasUsd: gasUsdLive, proposals: proposals.filter((p) => p.status === 'open') },
      bigintReplacer, 2
    )
  );
};
const saveProposals = () => fs.writeFileSync(PROPOSALS_PATH, JSON.stringify(proposals, bigintReplacer, 2));

// Komendy z UI (server tylko kolejkuje — fix dual-writer 25.08: wcześniej
// server pisał do proposals.json, a observer nadpisywał go z pamięci i
// odrzucenia ginęły). Konsumpcja: przeczytaj → skasuj plik → zastosuj.
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
          const p = proposals.find((x) => x.id === c.id);
          if (p && p.status === 'open') {
            p.status = 'dismissed';
            changed = true;
            log(`proposal ${c.id}: odrzucona (komenda z UI)`);
          }
        }
      } catch { /* uszkodzona linia — pomiń */ }
    }
    if (changed) { saveProposals(); saveState(); }
  } catch (e) {
    log(`proposal-commands: ${String(e).slice(0, 100)}`);
  }
}

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

// --- Telegram: BUFOR 15 min (decyzja Rafała 18.08) ---
// Wiadomości NIE wychodzą od razu: zbierają się w kolejce i co 15 min lecą
// JEDNĄ zbiorczą wiadomością. Powody: (1) anty-spam — seria zdarzeń z jednego
// cyklu to jeden komunikat; (2) limit Telegrama ~1 msg/s per czat — burst
// >1 dostawał 429 bez retry i przepadał (18.08: z 5 STARTów paper doszedł 1).
// Koszt: opóźnienie do 15 min — akceptowalne w trybie OBSERWUJ (człowiek
// i tak zatwierdza w Rabby, nic nie wykonuje się samo).
const tgQueue: string[] = [];
const TG_FLUSH_MS = 15 * 60 * 1000;
const TG_CHUNK = 3900; // twardy limit Telegrama: 4096 znaków/wiadomość

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

/** publiczny interfejs (używany wszędzie) — tylko dokłada do kolejki */
async function telegram(text: string) {
  tgQueue.push(text);
}

async function flushTelegram() {
  if (!tgQueue.length) return;
  const msgs = tgQueue.splice(0, tgQueue.length);
  // sklejanie w paczki ≤TG_CHUNK bez cięcia pojedynczych wiadomości w pół
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
  log(`telegram: wysłano ${msgs.length} wiadomości w ${batches.length} paczce/paczkach`);
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
let lastTrendSaveMs = 0;
const saveTrend = () => {
  fs.writeFileSync(TREND_STATE_PATH, JSON.stringify(trend, null, 2));
  lastTrendSaveMs = Date.now();
};
// Zapis okresowy (dławik 15 min) — bez niego EMA żyła tylko w pamięci
// (zapis wyłącznie przy seedzie/flipie), więc każdy restart usługi cofał
// kotwicę do ostatniego flipa (wykryte 19.08: lastTs=12.08 mimo 4 restartów).
const TREND_SAVE_MS = 15 * 60 * 1000;
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
  if (nowMs - lastTrendSaveMs > TREND_SAVE_MS) saveTrend();
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

/** propozycja obrony (EXIT_TREND lub HEDGE wg pool.trendAction — ALGORITHM
 *  v1.2 §4) dla każdej naszej pozycji w puli z sygnałem DOWN */
function proposeExitTrend(pool: BotPool, gap: number) {
  const held = positions.filter((x) => x.poolId === pool.id);
  if (!held.length) return;
  const action = pool.trendAction ?? 'exit';
  const kind = action === 'hedge' ? 'HEDGE' : 'EXIT_TREND';
  for (const pos of held) {
    const key = `trend-${pool.id}-${pos.tokenId}-${new Date().toISOString().slice(0, 10)}`;
    // dedup: jedna OTWARTA propozycja obrony per pozycja (niezależnie od dnia)
    if (proposals.some((x) => (x.kind === 'EXIT_TREND' || x.kind === 'HEDGE') && x.tokenId === pos.tokenId && x.status === 'open')) continue;
    const gapTxt = `cena ${(gap * 100).toFixed(1)}% pod EMA${TREND.hlDays}d (próg −${TREND.thresh * 100}%)`;
    let prop: Proposal;
    let msg: string;
    if (kind === 'HEDGE') {
      // sizing excess: short = nadwyżka ETH ponad 50% wartości pozycji
      const P = live[pool.id]?.ethUsd ?? 0;
      const ethAmt = pool.ethIsToken0 ? pos.amount0 : pos.amount1;
      const sizeEth = P > 0 ? Math.max(0, ethAmt - pos.valueUsd / 2 / P) : 0;
      const notional = sizeEth * P;
      prop = {
        id: key, createdAt: new Date().toISOString(), tokenId: pos.tokenId, poolId: pool.id,
        kind: 'HEDGE', action: 'HEDGE',
        symbol: `${pool.sym0}-${pool.sym1}`,
        hedgeSizeEth: sizeEth, hedgeNotionalUsd: notional,
        note: `Bezpiecznik v1.2 (hedge-excess): ${gapTxt}. Sugestia: SHORT ${sizeEth.toFixed(4)} ETH (~$${notional.toFixed(0)}) na GMX v2 (Arbitrum, app.gmx.io) — pozycja LP ZOSTAJE i zbiera fees. Zamknij short po zgaśnięciu sygnału (cena nad EMA). Fallback bez konta perp: zamknij pozycję do cash 50/50 (exit).`,
        status: 'open',
      };
      msg = `🛡 HOMOS: HEDGE — ${pool.id}, pozycja #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): ${gapTxt}. Propozycja: short ${sizeEth.toFixed(4)} ETH (~$${notional.toFixed(0)}) na GMX; LP zostaje. [tryb OBSERWUJ — nic nie wykonano]`;
    } else {
      prop = {
        id: key, createdAt: new Date().toISOString(), tokenId: pos.tokenId, poolId: pool.id,
        kind: 'EXIT_TREND', action: 'EXIT_TREND',
        symbol: `${pool.sym0}-${pool.sym1}`,
        note: `Bezpiecznik trendu (ALGORITHM v1.2 §4): ${gapTxt}. Sugestia: zamknij pozycję do cash 50/50; powrót po ${(pool.trendReentry ?? 'aboveEma') === 'aboveEma' ? 'powrocie ceny NAD EMA' : 'gap > −' + (TREND.thresh * 50) + '%'}.`,
        status: 'open',
      };
      msg = `⛔ HOMOS: BEZPIECZNIK TRENDU — ${pool.id}, pozycja #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): ${gapTxt}. Propozycja: wyjdź do cash 50/50. [tryb OBSERWUJ — nic nie wykonano]`;
    }
    proposals.push(prop);
    saveProposals();
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
  // paper trading: wirtualny portfel wg ALGORITHM v1.2 (po odświeżeniu statystyk)
  try {
    paperTick({
      log,
      telegram,
      getPool: (poolId: string) => {
        const p = BOT_POOLS.find((b) => b.id === poolId);
        const lv = p ? live[poolId] : undefined;
        if (!p || !lv) return null;
        // tick ze slot0 (60 s, refreshPrices) OSOBNO od stats: fix 25.08 —
        // przy awarii RPC stats zamarzały i paper widział "poza zakresem"
        // ze starego lastTick, mimo świeżej ceny w zakresie
        return { stats: lv.stats, tick: typeof lv.tick === 'number' ? lv.tick : null, prices: legPrices(p), trendDown: lv.trendDown ?? false };
      },
    });
  } catch (e) {
    log(`paper tick crashed: ${String(e).slice(0, 160)}`);
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
            lv.stats, chainId, match.feeBps as any, match.feeBps / 1_000_000, match.d0, match.d1,
            ADVISOR_PARAMS, gasUsdFor(match.chain) // żywy gaz (26.08) zamiast stałej $8
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

        // próbka equity/HODL realnej pozycji (wzorzec paper-history)
        try {
          const id = tokenId.toString();
          if (!posHodl[id]) {
            posHodl[id] = { a0, a1, poolId: match.id, anchoredAt: new Date().toISOString() };
            savePosHodl();
            log(`positions: kotwica HODL dla #${id} (${match.id}): ${a0.toFixed(6)} + ${a1.toFixed(6)}`);
          }
          const anchor = posHodl[id];
          const hodlUsd = anchor.a0 * px0 + anchor.a1 * px1;
          const tickHuman = (t: number) => Math.pow(1.0001, t) * Math.pow(10, match.d0 - match.d1);
          fs.appendFileSync(
            POS_HIST_PATH,
            JSON.stringify({
              ts: new Date().toISOString(), tokenId: id, poolId: match.id,
              valueUsd: +valueUsd.toFixed(2), hodlUsd: +hodlUsd.toFixed(2),
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

  // --- realny hedge na GMX (Arbitrum) — odczyt Readerem, patrz komentarz przy GMX ---
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
        // sanity (zły decode po aktualizacji ABI GMX → absurdalne skale)
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
              valueUsd: +hedgeLive.equityUsd.toFixed(2), hodlUsd: +collateralUsd.toFixed(2), // benchmark: cash (collateral bez shorta)
              inRange: true, price: +ethUsdNow.toFixed(2),
            }) + '\n'
          );
          if (!hedgeWasOpen) {
            hedgeWasOpen = true;
            void telegram(`🛡 HOMOS: wykryto ${p.flags.isLong ? 'LONG' : 'SHORT'} na GMX ETH/USD — $${sizeUsd.toFixed(0)} @ $${entry.toFixed(0)}, collateral $${collateralUsd.toFixed(0)} (odczyt on-chain, obserwuję co cykl)`);
          }
          // ostrzeżenie o sierocie: short wisi, a ŻADNA pula nie ma sygnału DOWN
          const anyDown = Object.values(trend).some((t) => t.down);
          if (!p.flags.isLong && !anyDown && Math.random() < 0.017) {
            // ~raz na dobę przy cyklu 5 min (288 cykli * 0.017 ≈ 5; wystarczająco rzadko, zero dodatkowego stanu)
            void telegram(`⚠️ HOMOS: short GMX $${sizeUsd.toFixed(0)} otwarty, a sygnał trendu NIE jest DOWN na żadnej puli — sprawdź, czy nie zostawić/zamknąć (PnL $${pnl.toFixed(2)})`);
          }
        } else {
          log(`gmx hedge: odczyt poza skalą (sizeUsd=${sizeUsd}, sizeEth=${sizeEth}) — możliwa zmiana ABI Readera, pomijam`);
          hedgeLive = null;
        }
      } else {
        if (hedgeWasOpen) {
          hedgeWasOpen = false;
          void telegram('🛡 HOMOS: pozycja hedge na GMX ZAMKNIĘTA (Reader nie widzi już pozycji)');
        }
        hedgeLive = null;
      }
    }
  } catch (e) {
    log(`gmx hedge read failed: ${String(e).slice(0, 140)}`);
  }

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

/** ceny USD obu nóg puli + cena human — dla paper-tradingu (ta sama logika
 *  wyceny co refreshPositions; respektuje quote:'WETH') */
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
      getGasUsd: (chain: string) => gasUsdLive[chain] ?? null, // żywy gaz (26.08)
    });
  } catch (e) {
    log(`selector crashed: ${String(e).slice(0, 160)}`);
  }
}

// --- księga transakcji (TASKS-LEDGER.md; ndjson w .bot/, wznawialny backfill) ---
let ledgerBusy = false;
async function runLedger() {
  if (ledgerBusy) return; // backfill może przeciągnąć cykl — bez nakładania
  ledgerBusy = true;
  try {
    await updateLedger(clients as unknown as Record<string, any>, {
      log,
      // kurs ETH z żywych cen pul kwotowanych w USD (patrz nagłówek ledger.ts:
      // wycena z chwili indeksowania — dla backfillu updateLedger da usd:null)
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
    log(`ledger crashed: ${String(e).slice(0, 160)}`); // nigdy nie kładzie cyklu
  } finally {
    ledgerBusy = false;
  }
}

// --- start ---
(async () => {
  log(`observer start — watch=${WATCH_ADDRESS}, pools=${BOT_POOLS.map((p) => p.id).join(', ')}, tryb=OBSERWUJ`);
  await refreshPrices();
  await refreshStats();
  await refreshGas(); // żywy gaz PRZED pierwszą oceną pozycji (payback)
  await refreshPositions();
  runSelector();
  setInterval(refreshPrices, INTERVALS.priceSec * 1000);
  setInterval(refreshGas, 5 * 60 * 1000); // żywy gaz co 5 min (takt pozycji)
  setInterval(refreshStats, INTERVALS.statsSec * 1000);
  setInterval(refreshPositions, INTERVALS.positionsSec * 1000);
  runLedger();
  setInterval(runLedger, INTERVALS.positionsSec * 1000); // księga: ten sam takt co pozycje
  setInterval(runSelector, 60 * 60 * 1000); // co godzinę sprawdza, czy dziś już był
  expireStaleProposals();
  setInterval(expireStaleProposals, 60 * 60 * 1000);
  applyProposalCommands();
  setInterval(applyProposalCommands, 30 * 1000); // komendy z UI (odrzucenia) w ≤30 s
  setInterval(flushTelegram, TG_FLUSH_MS); // zbiorcza wiadomość TG co 15 min
  log('pętle uruchomione (60s ceny / 15min statystyki / 5min pozycje / selektor 1×dziennie po 8:00)');
})();
