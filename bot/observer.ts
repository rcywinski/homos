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
  // collect() TYLKO do symulacji (29.08): `tokensOwed0/1` z positions() jest
  // ZEROWE do pierwszego burn/collect, więc świeża pozycja pokazywałaby
  // "fee $0" mimo narastających opłat. Ta sama sztuczka „static collect", co
  // w UI (src/hooks/usePortfolio.ts) — eth_call, nic nie podpisujemy.
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
  /** detektor flatu (produkt FlatWide, 28.08): od kiedy |gap|<enterGap
   *  nieprzerwanie (ISO, null=zegar nie biegnie) i czy flat potwierdzony */
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
  /** agregaty z księgi (PARTIA 14, 27.08): fees odebrane COLLECT−DECREASE
   *  w USD (null gdy księga nie umie wycenić — np. noga cbBTC w v1 księgi
   *  albo backfill bez kursu); rebalanse = liczba DECREASE. costsUsd
   *  celowo null do czasu indeksowania gazu (TASKS-LEDGER §3). */
  collectedFeesUsd: number | null;
  costsUsd: number | null;
  rebalances: number | null;
  /** fee NAROSŁE, jeszcze nieodebrane (29.08, brief Rafała: raport nie
   *  pokazywał tempa zarabiania nóg produktu). Symulacja collect() —
   *  suma w USD po kursach z tego samego cyklu; null gdy RPC odmówi. */
  feesUsd: number | null;
  /** cykl produktu FlatWide (PARTIA 17): 'wide' = postura idle
   *  (±productIdleWidthPct), 'narrow' = zwężenie flatowe (k×σ);
   *  null = pula nie-produktowa (cykl nie dotyczy) */
  posture: 'wide' | 'narrow' | null;
}
interface Proposal {
  id: string;
  createdAt: string;
  tokenId: string; // '' dla propozycji OPEN z selektora
  poolId: string; // '' gdy pula spoza BOT_POOLS (selektor → note)
  /** REBALANCE (doradca) | OPEN/ROTATE (selektor) | EXIT_TREND / HEDGE
   *  (bezpiecznik v1.2) | FLAT_NARROW / FLAT_WIDEN (produkt FlatWide 28.08:
   *  zwężenie w potwierdzonym flacie / powrót do szerokiego po flacie) */
  kind?: 'REBALANCE' | 'OPEN' | 'ROTATE' | 'EXIT_TREND' | 'HEDGE' | 'FLAT_NARROW' | 'FLAT_WIDEN';
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
  /** PROCEDURA AWARYJNA (decyzja Rafała 27.08, paczka #2 28.08): propozycja
   *  obrony na puli PRODUKTOWEJ — hybryda świadomie trzyma betę, więc
   *  EXIT/HEDGE przy sygnale DOWN to opcje awaryjne ("zwykle NIE podpisuj"),
   *  nie rekomendacje. UI: czerwona ramka + odesłanie do EMERGENCY.md. */
  emergency?: boolean;
  status: 'open' | 'dismissed';
}

const live: Record<string, PoolLive> = {};
let positions: WatchedPosition[] = [];
let proposals: Proposal[] = fs.existsSync(PROPOSALS_PATH) ? JSON.parse(fs.readFileSync(PROPOSALS_PATH, 'utf8')) : [];
// FIX 11.09 #2: sprzątanie duplikatów po id z okresu przed fixem dedup
// (ta sama karta wielokrotnie w pliku; [Odrzuć] trafiało tylko w pierwszą
// kopię, więc kolejne wracały po odświeżeniu). Zostaje JEDNA kopia per id;
// jeśli którakolwiek była odrzucona — odrzucona.
{
  const byId = new Map<string, Proposal>();
  for (const p of proposals) {
    const prev = byId.get(p.id);
    if (!prev) byId.set(p.id, p);
    else if (prev.status === 'open' && p.status === 'dismissed') byId.set(p.id, p);
  }
  if (byId.size !== proposals.length) {
    console.log(`proposals: usunięto ${proposals.length - byId.size} duplikatów po id (start)`);
    proposals = [...byId.values()];
  }
}

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
      // flatParams: żywe parametry detektora flatu dla UI (countdown do
      // potwierdzenia, progi w opisach) — jedna prawda z bot/config.ts,
      // UI nie hardkoduje 12h/2%/5% (PARTIA 17; wartości mogą się zmienić
      // decyzją przeglądu 1.09)
      { updatedAt: new Date().toISOString(), mode: 'OBSERVE', watch: WATCH_ADDRESS, flatParams: FLAT, tranche: trancheLive, pools: Object.values(live), positions, hedge: hedgeLive, gasUsd: gasUsdLive, proposals: proposals.filter((p) => p.status === 'open') },
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
          // FIX 11.09 #2: odrzuć WSZYSTKIE kopie o tym id (nie tylko pierwszą)
          let n = 0;
          for (const p of proposals) if (p.id === c.id && p.status === 'open') { p.status = 'dismissed'; n++; }
          if (n) {
            changed = true;
            log(`proposal ${c.id}: odrzucona (komenda z UI${n > 1 ? `, ${n} kopii` : ''})`);
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

/** propozycja obrony dla każdej naszej pozycji w puli z sygnałem DOWN.
 *  Pule NIE-produktowe: jak dotąd — EXIT_TREND lub HEDGE-excess wg
 *  pool.trendAction (ALGORITHM v1.2 §4).
 *  Pule PRODUKTOWE (productIdleWidthPct — hybryda FlatWide): decyzja
 *  Rafała 27.08 wieczór — sygnału NIE wyciszamy, ale przebrandowujemy na
 *  PROCEDURĘ AWARYJNĄ: DWIE propozycje obok siebie, obie emergency:true:
 *  (1) HEDGE delta-neutral (short PEŁNEJ ekspozycji nogi zmiennej, LP
 *  zostaje — odwracalny), (2) EXIT_TREND ("dane mówią: zwykle NIE
 *  podpisuj" — backtesty: exit na trendzie średnio pogarsza). Kolejność,
 *  kryteria i koszty: EMERGENCY.md. Niuans: sygnał DOWN na cbBTC/WETH
 *  mierzy cenę WZGLĘDNĄ — czujnikiem krachu USD dla OBU nóg jest sygnał
 *  na WETH/USDC. */
function proposeExitTrend(pool: BotPool, gap: number) {
  const held = positions.filter((x) => x.poolId === pool.id);
  if (!held.length) return;
  const isProduct = !!pool.productIdleWidthPct;
  const gapTxt = `cena ${(gap * 100).toFixed(1)}% pod EMA${TREND.hlDays}d (próg −${TREND.thresh * 100}%)`;
  const backTxt = (pool.trendReentry ?? 'aboveEma') === 'aboveEma' ? 'powrocie ceny NAD EMA' : `gap > −${TREND.thresh * 50}%`;
  for (const pos of held) {
    const day = new Date().toISOString().slice(0, 10);
    const kinds: Array<'EXIT_TREND' | 'HEDGE'> = isProduct
      ? ['HEDGE', 'EXIT_TREND'] // hedge PIERWSZY — preferowana (odwracalna) opcja awaryjna
      : [(pool.trendAction ?? 'exit') === 'hedge' ? 'HEDGE' : 'EXIT_TREND'];
    let announced = false;
    for (const kind of kinds) {
      // dedup PER KIND (produkt emituje dwie równoległe opcje)
      const key = `trend-${kind === 'HEDGE' ? 'hedge-' : ''}${pool.id}-${pos.tokenId}-${day}`;
      // FIX 11.09: odrzucona karta NIE wraca w tym samym dniu — dedup także po id
      // (dotąd tylko po status==='open', więc każdy cykl po [Odrzuć] tworzył
      // ją na nowo z TYM SAMYM id i słał Telegram; obserwacja Rafała 11.09)
      if (proposals.some((x) => x.id === key || (x.kind === kind && x.tokenId === pos.tokenId && x.status === 'open'))) continue;
      let prop: Proposal;
      if (kind === 'HEDGE') {
        const isRelative = (pool.quote ?? 'USD') === 'WETH'; // cbBTC/WETH: sygnał względny
        // sizing: produkt = delta-neutral (PEŁNA ekspozycja nogi zmiennej);
        // nie-produkt = excess (nadwyżka ETH ponad 50% wartości, v1.2)
        const P = live[pool.id]?.ethUsd ?? 0; // USD za token BAZOWY puli
        let sizeTok: number; let tokSym: string; let market: string;
        if (!isRelative) {
          const ethAmt = pool.ethIsToken0 ? pos.amount0 : pos.amount1;
          sizeTok = isProduct ? ethAmt : P > 0 ? Math.max(0, ethAmt - pos.valueUsd / 2 / P) : 0;
          tokSym = 'ETH'; market = 'ETH/USD';
        } else {
          // sygnał = token bazowy (cbBTC) słabnie WZGLĘDEM WETH → neutralizacja
          // przez short nogi BAZOWEJ na rynku BTC/USD (ręcznie na app.gmx.io —
          // 1-podpisowy builder obsługuje dziś tylko ETH/USD)
          sizeTok = pool.ethIsToken0 ? pos.amount1 : pos.amount0; // noga cbBTC
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
            ? `OPCJA AWARYJNA A (preferowana — odwracalna): ${gapTxt}. SHORT ${sizeTok.toFixed(4)} ${tokSym} (~$${notional.toFixed(0)}, delta-neutral pozycji) na GMX v2 ${market}${tokSym === 'ETH' ? ' — 1 podpis w kokpicie' : ' — ręcznie na app.gmx.io (builder 1-podpisowy obsługuje tylko ETH/USD)'}; LP ZOSTAJE i zbiera fees. Zamknij short po zgaśnięciu sygnału (${backTxt}). Koszt ~$0.5-1 + funding (hist. śr. +4.8%/r dla shorta). Kiedy podpisywać a kiedy NIE: EMERGENCY.md.${isRelative ? ' UWAGA: ten sygnał mierzy cenę WZGLĘDNĄ cbBTC/WETH — krach USD wykrywa sygnał na WETH/USDC.' : ''}`
            : `Bezpiecznik v1.2 (hedge-excess): ${gapTxt}. Sugestia: SHORT ${sizeTok.toFixed(4)} ${tokSym} (~$${notional.toFixed(0)}) na GMX v2 (Arbitrum, app.gmx.io) — pozycja LP ZOSTAJE i zbiera fees. Zamknij short po zgaśnięciu sygnału (cena nad EMA). Fallback bez konta perp: zamknij pozycję do cash 50/50 (exit).`,
          status: 'open',
        };
      } else {
        prop = {
          id: key, createdAt: new Date().toISOString(), tokenId: pos.tokenId, poolId: pool.id,
          kind: 'EXIT_TREND', action: 'EXIT_TREND',
          symbol: `${pool.sym0}-${pool.sym1}`,
          emergency: isProduct || undefined,
          note: isProduct
            ? `OPCJA AWARYJNA B — dane mówią: zwykle NIE PODPISUJ. ${gapTxt}. Hybryda FlatWide ŚWIADOMIE trzyma betę (backtesty 26-27.08, 40+ przebiegów: exit na trendzie średnio POGARSZA wynik vs trzymanie; cash wygrywa tylko w silnych crashach, których nie znasz ex-ante). Zamknięcie do cash 50/50 tylko przy twardych kryteriach z EMERGENCY.md (krach systemowy, depeg, utrata zaufania do venue). Powrót po ${backTxt}. Preferowana alternatywa: opcja A (hedge, odwracalna).`
            : `Bezpiecznik trendu (ALGORITHM v1.2 §4): ${gapTxt}. Sugestia: zamknij pozycję do cash 50/50; powrót po ${backTxt}.`,
          status: 'open',
        };
      }
      proposals.push(prop);
      saveProposals();
      if (!isProduct) {
        const msg = kind === 'HEDGE'
          ? `🛡 HOMOS: HEDGE — ${pool.id}, pozycja #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): ${gapTxt}. Propozycja: short (szczegóły w kokpicie); LP zostaje. [tryb OBSERWUJ — nic nie wykonano]`
          : `⛔ HOMOS: BEZPIECZNIK TRENDU — ${pool.id}, pozycja #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): ${gapTxt}. Propozycja: wyjdź do cash 50/50. [tryb OBSERWUJ — nic nie wykonano]`;
        log(msg);
        telegram(msg);
      } else if (!announced) {
        announced = true;
        const msg = `🚨 HOMOS: PROCEDURA AWARYJNA — sygnał DOWN na ${pool.id}, pozycja #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): ${gapTxt}. Dwie opcje w kokpicie: (A) hedge delta-neutral [preferowana, odwracalna] / (B) exit [zwykle NIE podpisuj]. Zajrzyj do EMERGENCY.md. [tryb OBSERWUJ — nic nie wykonano]`;
        log(msg);
        telegram(msg);
      }
    }
  }
}

// --- FLAT_ENTER / FLAT_EXIT (produkt FlatWide — decyzja Rafała 27-28.08) ---
// Maszyna stanów per pula produktowa: |gap|<enterGap nieprzerwanie przez
// confirmH godzin → flat POTWIERDZONY → propozycja zwężenia do k×σ
// (FLAT_NARROW). Koniec flatu: |gap|>exitGap → propozycja powrotu do
// szerokiego ±productIdleWidthPct (FLAT_WIDEN, alarm 24/7). Strefa środkowa
// (enter..exit) NIE kończy potwierdzonego flatu (histereza jak w
// backtest/flatwindows.ts). Stan persystowany — restart nie zeruje zegara
// confirm (ta sama klasa fixu co trend-state 19.08).
const FLAT_STATE_PATH = path.join(DIR, 'flat-state.json');
interface FlatPoolState { flatSince: number | null; confirmed: boolean }
const flat: Record<string, FlatPoolState> = fs.existsSync(FLAT_STATE_PATH)
  ? JSON.parse(fs.readFileSync(FLAT_STATE_PATH, 'utf8'))
  : {};
const saveFlat = () => fs.writeFileSync(FLAT_STATE_PATH, JSON.stringify(flat, null, 2));

/** połówkowa szerokość pozycji w % (geometrycznie: √(hi/lo)−1) */
const posHalfWidthPct = (pos: { tickLower: number; tickUpper: number }): number =>
  (Math.sqrt(Math.pow(1.0001, pos.tickUpper - pos.tickLower)) - 1) * 100;
const isNarrowPos = (p: BotPool, pos: { tickLower: number; tickUpper: number }): boolean =>
  p.productIdleWidthPct ? posHalfWidthPct(pos) < FLAT.narrowFrac * p.productIdleWidthPct : false;

/** auto-zamknięcie otwartych propozycji danego rodzaju w puli (stale = błędne) */
function dismissOpenByKind(kind: Proposal['kind'], poolId: string, why: string) {
  let changed = false;
  for (const pr of proposals) {
    if (pr.status === 'open' && pr.kind === kind && pr.poolId === poolId) {
      pr.status = 'dismissed';
      pr.note = `${pr.note ? pr.note + ' · ' : ''}[auto: ${why}]`;
      changed = true;
      log(`proposal ${pr.id}: zamknięta automatycznie — ${why}`);
    }
  }
  if (changed) { saveProposals(); saveState(); }
}

/** aktualizacja detektora flatu (wołana z refreshPrices, co 60 s) */
function updateFlat(p: BotPool, gapFrac: number, nowMs: number) {
  if (!p.productIdleWidthPct) return; // tylko pule produktowe
  const vol = live[p.id]?.stats?.volDaily;
  if (vol != null && vol < FLAT.minVolDaily) {
    // guard LST/stable (lekcja wstETH/WETH 27.08): przy martwej zmienności
    // "flat" to stan bazowy, nie sygnał — detektor wyłączony, stan zerowany
    if (flat[p.id]?.flatSince != null || flat[p.id]?.confirmed) {
      flat[p.id] = { flatSince: null, confirmed: false };
      saveFlat();
      log(`flat ${p.id}: vol ${(vol * 100).toFixed(2)}%/d < ${FLAT.minVolDaily * 100}%/d — detektor wyłączony (klasa LST/stable)`);
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
      const msg = `📉 HOMOS: FLAT ZAKOŃCZONY — ${p.id}, |gap| ${(abs * 100).toFixed(1)}% > ${FLAT.exitGap * 100}%. Jeśli pozycja jest wąska: wróć do szerokiego ±${p.productIdleWidthPct}% (propozycja w kokpicie). [tryb OBSERWUJ — nic nie wykonano]`;
      log(msg);
      telegram(msg);
      dismissOpenByKind('FLAT_NARROW', p.id, 'flat zakończony (|gap|>exitGap)');
      for (const pos of positions.filter((x) => x.poolId === p.id && isNarrowPos(p, x))) proposeFlatWiden(p, pos);
    }
    // strefa enter..exit: potwierdzony flat TRWA (histereza)
  } else if (abs < FLAT.enterGap) {
    if (st.flatSince == null) {
      st.flatSince = nowMs;
      saveFlat();
      log(`flat ${p.id}: zegar confirm startuje (gap ${(gapFrac * 100).toFixed(2)}%, próg ${FLAT.confirmH}h)`);
    } else if (nowMs - st.flatSince >= FLAT.confirmH * 3600e3) {
      st.confirmed = true;
      saveFlat();
      const msg = `🎯 HOMOS: FLAT POTWIERDZONY — ${p.id} (|gap|<${FLAT.enterGap * 100}% nieprzerwanie ≥${FLAT.confirmH}h). Produkt FlatWide: pora rozważyć zwężenie do k×σ — propozycja w kokpicie przy najbliższym cyklu pozycji (≤5 min). [tryb OBSERWUJ — nic nie wykonano]`;
      log(msg);
      telegram(msg);
    }
  } else if (st.flatSince != null) {
    log(`flat ${p.id}: zegar wyzerowany po ${((nowMs - st.flatSince) / 3600e3).toFixed(1)}h (gap ${(gapFrac * 100).toFixed(2)}%)`);
    st.flatSince = null;
    saveFlat();
  }
}

/** FLAT_NARROW: propozycja zwężenia szerokiej pozycji do k×σ w potwierdzonym flacie */
function proposeFlatNarrow(pool: BotPool, pos: WatchedPosition) {
  const st = flat[pool.id];
  const lv = live[pool.id];
  if (!st?.confirmed || !lv?.stats) return;
  if (proposals.some((x) => x.kind === 'FLAT_NARROW' && x.tokenId === pos.tokenId && x.status === 'open')) return;
  // SZEROKOŚĆ ZWĘŻENIA (zmiana 29.08, uwaga Rafała): stała szerokość
  // produktu zamiast k×σ×√7 z doradcy v1.2. Powód: horyzont 7 dni
  // pochodzi ze strategii „zakres ma przeżyć tydzień bez rebalansu",
  // a w hybrydzie pozycję i tak chroni FLAT_WIDEN przy |gap|>exitGap.
  // Przy k×σ (dziś ±16%) sygnał wyjścia padał po 32% drogi do krawędzi
  // pasma — dwie trzecie płynności leżałoby tam, gdzie cena nigdy nie
  // dojdzie. Fallback na k×σ zostaje dla pul bez ustawionej szerokości.
  const sug = pool.productNarrowWidthPct
    ? suggestFixedRange(lv.stats, pool.feeBps as any, pool.d0, pool.d1, pool.productNarrowWidthPct)
    : suggestRange(lv.stats, pool.feeBps as any, pool.d0, pool.d1, {
        ...ADVISOR_PARAMS, k: pool.advisorK ?? ADVISOR_PARAMS.k,
      });
  const zrodloSzerokosci = pool.productNarrowWidthPct
    ? `stała szerokość produktu ±${pool.productNarrowWidthPct}% (${(pool.productNarrowWidthPct / (FLAT.exitGap * 100)).toFixed(1)}× próg wyjścia)`
    : `k×σ ±${sug.widthPct.toFixed(0)}% (k=${pool.advisorK ?? ADVISOR_PARAMS.k})`;
  const toUsd = (t: number) => tickToUsd(pool, t);
  const [usdLo, usdHi] = [toUsd(sug.tickLower), toUsd(sug.tickUpper)].sort((a, b) => a - b);
  // EV zwężenia: przyrost fee z węższego pasma (skalowanie jak w assessPosition)
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
    note: `Produkt FlatWide: flat POTWIERDZONY (|gap|<${FLAT.enterGap * 100}% ≥${FLAT.confirmH}h) — zwężenie z ±${posHalfWidthPct(pos).toFixed(0)}% do ±${sug.widthPct.toFixed(0)}%: ${zrodloSzerokosci}. Dodatkowe fee ~$${extraDailyUsd.toFixed(2)}/d, koszt ~$${costUsd.toFixed(2)}, payback ~${payback?.toFixed(1) ?? '—'}d. E1: epizod musi potrwać ≥~${pool.id.includes('cbbtc') ? '5' : '2'}d, by zwężenie się opłaciło — mediana epizodów na tej puli za progiem. Powrót do szerokiego zaproponuję przy |gap|>${FLAT.exitGap * 100}%.`,
    status: 'open',
  };
  proposals.push(prop);
  saveProposals();
  const msg = `🎯 HOMOS: propozycja ZWĘŻENIA (flat) — ${pool.id} #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}) → zakres $${usdLo.toFixed(usdLo < 1 ? 4 : 0)}–$${usdHi.toFixed(usdHi < 1 ? 4 : 0)} (±${sug.widthPct.toFixed(0)}%), extra fee ~$${extraDailyUsd.toFixed(2)}/d, payback ~${payback?.toFixed(1) ?? '—'}d. [tryb OBSERWUJ — nic nie wykonano]`;
  log(msg);
  telegram(msg);
}

/** FLAT_WIDEN: propozycja powrotu wąskiej pozycji do szerokiego ±idle po końcu flatu */
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
    note: `FLAT_EXIT: |gap| ${gapNow}% > ${FLAT.exitGap * 100}% — flat skończony, wąska pozycja łapie IL na trendzie. Powrót do postury idle: szeroki ±${pool.productIdleWidthPct}%. Koszt ~$${costUsd.toFixed(2)}. To propozycja OCHRONNA (alarm 24/7) — im dłużej wąsko na trendzie, tym większy koszt.`,
    status: 'open',
  };
  proposals.push(prop);
  saveProposals();
  const msg = `⚠️ HOMOS: propozycja ROZSZERZENIA (koniec flatu) — ${pool.id} #${pos.tokenId} ($${pos.valueUsd.toFixed(0)}): gap ${gapNow}% > ${FLAT.exitGap * 100}%, wróć do ±${pool.productIdleWidthPct}% ($${usdLo.toFixed(usdLo < 1 ? 4 : 0)}–$${usdHi.toFixed(usdHi < 1 ? 4 : 0)}). [tryb OBSERWUJ — nic nie wykonano]`;
  log(msg);
  telegram(msg);
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
      // detektor flatu (produkt FlatWide) — ta sama EMA/gap co bezpiecznik trendu
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

// --- pętla statystyk (15min) ---
const HISTORY_PATH = path.join(DIR, 'history.ndjson');

async function refreshStats() {
  for (const p of BOT_POOLS) {
    try {
      const swaps = await fetchRecentSwaps(clients[p.chain] as any, p.address, p.chainId, 24);
      const stats = computeStats(swaps, p.chainId, p.d0, p.d1, p.feeBps / 1_000_000, TICK_SPACING[p.feeBps]);
      if (live[p.id] && stats) {
        live[p.id].stats = stats;
        // PRODUKT 27.08 (hybryda FlatWide): pula produktowa dostaje STAŁĄ
        // szerokość ±N% (postura idle); inaczej k per pula (ALGORITHM v1.1)
        live[p.id].suggestion = p.productIdleWidthPct
          ? suggestFixedRange(stats, p.feeBps as any, p.d0, p.d1, p.productIdleWidthPct)
          : suggestRange(stats, p.feeBps as any, p.d0, p.d1, {
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

// --- KOSZTY GAZU (29.08, decyzja Rafała: gaz ma być kosztem POZYCJI, nie
// tylko domniemaną częścią PnL). Źródło: receipty transakcji z księgi —
// `gasUsed × effectiveGasPrice`, dokładne co do wei, więc kolumna „Koszty"
// przestaje być pusta. Cache w .bot/tx-costs.json: receipt pobieramy RAZ
// na transakcję (są niezmienne), więc backfill nie powtarza się co cykl.
// Wycena: gaz trzymamy w ETH, na USD przeliczamy dopiero przy odczycie —
// kurs z chwili zdarzenia mielibyśmy tylko z dodatkowego zapytania o blok,
// a na Base gaz to centy (na mainnecie stare pyłki i tak są historią).
const TX_COSTS_PATH = path.join(DIR, 'tx-costs.json');
interface TxCost { chain: string; gasEth: number; block: number }
const txCosts: Record<string, TxCost> = fs.existsSync(TX_COSTS_PATH)
  ? JSON.parse(fs.readFileSync(TX_COSTS_PATH, 'utf8'))
  : {};
const saveTxCosts = () => fs.writeFileSync(TX_COSTS_PATH, JSON.stringify(txCosts, null, 2));

/** Dociąga receipty dla transakcji z księgi, których jeszcze nie wyceniliśmy.
 *  Limit na cykl — backfill starych pyłków nie może zjeść pętli pozycji. */
async function refreshTxCosts(maxPerCycle = 25) {
  let added = 0;
  let failed = 0;
  // KOLEJNOŚĆ MA ZNACZENIE (fix 29.08 po zgłoszeniu CC-Win: `costsUsd`
  // null mimo działającego backfillu): księga jest posortowana od
  // najstarszych, a najstarsze to pyłki z mainnetu sprzed ~519 dni —
  // przy 25 tx na cykl nasze dwie nogi doczekałyby się receiptów dopiero
  // po wielu cyklach. Transakcje ŻYWYCH pozycji idą więc pierwsze.
  const liveIds = new Set(positions.map((p) => p.tokenId));
  const all = readLedger();
  const queue = liveIds.size
    ? [...all.filter((e) => liveIds.has(e.tokenId)), ...all.filter((e) => !liveIds.has(e.tokenId))]
    : all;
  for (const e of queue) {
    if (added >= maxPerCycle) break;
    if (txCosts[e.txHash]) continue;
    const client = clients[e.chain];
    if (!client) continue;
    try {
      const r = await client.getTransactionReceipt({ hash: e.txHash as `0x${string}` });
      const wei = (r.gasUsed ?? 0n) * (r.effectiveGasPrice ?? 0n);
      txCosts[e.txHash] = { chain: e.chain, gasEth: +formatUnits(wei, 18), block: Number(r.blockNumber) };
      added++;
    } catch {
      failed++; // brak receiptu na tym RPC (pruning/limit) — spróbujemy w kolejnym cyklu
    }
  }
  if (added) {
    saveTxCosts();
    log(`koszty gazu: +${added} transakcji (razem ${Object.keys(txCosts).length}${failed ? `, nieudane ${failed}` : ''})`);
  }
}

/** USD za natywny ETH — do wyceny gazu (ta sama zasada co refreshGas:
 *  kurs z pierwszej żywej puli kwotowanej w USD, bez dodatkowego zapytania) */
const nativeEthUsd = (): number | null =>
  BOT_POOLS.filter((p) => (p.quote ?? 'USD') === 'USD')
    .map((p) => live[p.id]?.ethUsd)
    .find((v): v is number => typeof v === 'number' && v > 0) ?? null;

// --- BILANS TRANSZY (29.08). Panel kokpitu mierzy jakość STRATEGII (PnL od
// kotwic, vs HODL) i taki ma zostać — porównywalny z walkforwardem. Ta
// sekcja mierzy co innego: ile z WPŁACONYCH USDC realnie dziś jest.
// Różnica między nimi to bufor w portfelu (poza pozycjami) + jednorazowe
// koszty wejścia (swapy, poślizg, gaz mintów) — do 29.08 nikt tego nie
// pilnował, stąd wrażenie „matematyka się nie zgadza".
interface TrancheState {
  label: string; depositedUsd: number; startedAt: string;
  lpUsd: number; walletUsd: number | null; totalUsd: number | null;
  diffUsd: number | null; diffPct: number | null;
  marketPnlUsd: number | null; residualUsd: number | null; gasUsd: number | null;
  /** rozbicie „reszty" (29.08, po pierwszym pomiarze): koszty wejścia są
   *  STAŁE, beta bufora pływa z ceną — bez tego podziału reszta ruszałaby
   *  się z rynkiem i przestała być testem poprawności księgowania. */
  entryCostUsd: number | null; bufferBetaUsd: number | null;
  /** skład portfela per token — żeby dało się AUDYTOWAĆ, co bot wliczył
   *  (pierwszy pomiar dał $226 zamiast szacowanych $150; bez rozbicia nie
   *  wiadomo, czy to bufor transzy, czy stary ETH na gaz spoza niej) */
  walletParts: Array<{ sym: string; amount: number; usd: number }> | null;
  updatedAt: string;
}
let trancheLive: TrancheState | null = null;
// kotwica bufora: kwoty w portfelu nie zmieniają się bez swapów, więc
// wartość z pierwszego udanego odczytu pozwala oddzielić betę bufora od
// jednorazowych kosztów wejścia. UCZCIWOŚĆ: kotwica powstaje DZIŚ, więc
// beta bufora z 27–29.08 zostaje po stronie entryCostUsd.
const TRANCHE_ANCHOR_PATH = path.join(DIR, 'tranche-anchor.json');
interface TrancheAnchor { anchoredAt: string; walletUsd: number }
let trancheAnchor: TrancheAnchor | null = fs.existsSync(TRANCHE_ANCHOR_PATH)
  ? JSON.parse(fs.readFileSync(TRANCHE_ANCHOR_PATH, 'utf8'))
  : null;
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

/** Wartość tokenów transzy leżących w PORTFELU (poza pozycjami LP) —
 *  bez tego bilans transzy pokazywałby bufor jako stratę. */
async function walletValueUsd(): Promise<{ usd: number; parts: Array<{ sym: string; amount: number; usd: number }> } | null> {
  const pools = BOT_POOLS.filter((p) => p.chain === TRANCHE.chain && p.productIdleWidthPct && live[p.id]);
  if (!pools.length) return null;
  const client = clients[TRANCHE.chain];
  // cena USD per ADRES tokenu — ta sama logika co wycena pozycji
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
    // natywny ETH na gaz też jest częścią transzy (kupiony za USDC)
    const eth = nativeEthUsd();
    if (eth) {
      const amount = parseFloat(formatUnits(await client.getBalance({ address: WATCH_ADDRESS as `0x${string}` }), 18));
      sum += amount * eth;
      if (amount > 0) parts.push({ sym: 'ETH (natywny)', amount: +amount.toFixed(8), usd: +(amount * eth).toFixed(2) });
    }
    return { usd: +sum.toFixed(2), parts: parts.sort((a, b) => b.usd - a.usd) };
  } catch (e) {
    log(`portfel transzy: ${String(e).slice(0, 120)}`);
    return null;
  }
}

// --- pętla pozycji (5min) ---
/** Agregaty księgi per chain:tokenId dla ŻYWYCH pozycji (PARTIA 14).
 *  fees = COLLECT − DECREASE (obie strony null-guarded: brak metadanych
 *  albo usd:null w którymkolwiek wpisie → null, nie zgadujemy).
 *  rebalances = liczba zdarzeń DECREASE (zwężenie/rebalans/partial close). */
function ledgerAggregates(): Map<string, { feesUsd: number | null; rebalances: number; gasEth: number | null }> {
  const map = new Map<string, { feesUsd: number | null; rebalances: number; gasEth: number | null }>();
  try {
    const byToken = new Map<string, LedgerEntry[]>();
    // txHash → ile RÓŻNYCH pozycji dotknęła ta transakcja: gaz dzielimy po
    // równo, żeby jeden tx obsługujący dwie nogi nie policzył się podwójnie
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
      // gaz: suma po UNIKALNYCH txHash tej pozycji, z podziałem gdy tx
      // dotyczył kilku pozycji; null gdy żaden receipt jeszcze nie pobrany
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
  await refreshTxCosts(); // receipty → gaz per transakcja (kolumna „Koszty")
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
        // fee narosłe (nieodebrane) — static collect, best-effort: błąd RPC
        // zostawia null (raport pokaże "—"), nie wywala cyklu pozycji.
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
          // KOSZTY = gaz transakcji tej pozycji (mint/zwiększenie/zwężenie/
          // collect) z receiptów. Koszty swapów wejściowych NIE wchodzą tu
          // świadomie (decyzja Rafała 29.08) — nie należą do żadnej nogi,
          // liczy je bilans transzy.
          costsUsd: la?.gasEth != null && ethUsdForGas ? +(la.gasEth * ethUsdForGas).toFixed(2) : null,
          rebalances: la ? la.rebalances : null,
          posture: match.productIdleWidthPct
            ? (isNarrowPos(match, { tickLower: Number(lo), tickUpper: Number(hi) }) ? 'narrow' : 'wide')
            : null,
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

  // BILANS TRANSZY (29.08) — druga, niezależna miara: ile z wpłaconych USDC
  // realnie dziś jest. Rozbicie: różnica = ruch rynku na LP (PnL od kotwic)
  // + RESZTA, gdzie reszta ≈ jednorazowe koszty wejścia (swapy/poślizg/gaz
  // mintów) plus beta bufora w portfelu. Reszta powinna być mniej więcej
  // STAŁA — jej dryf w czasie oznacza, że coś w księgowaniu się rozjeżdża.
  try {
    const prodPositions = found.filter((p) => p.posture !== null);
    const lpUsd = +prodPositions.reduce((s, p) => s + p.valueUsd, 0).toFixed(2);
    const wallet = await walletValueUsd();
    const walletUsd = wallet === null ? null : wallet.usd;
    const totalUsd = walletUsd === null ? null : +(lpUsd + walletUsd).toFixed(2);
    if (walletUsd !== null && !trancheAnchor) {
      trancheAnchor = { anchoredAt: new Date().toISOString(), walletUsd };
      fs.writeFileSync(TRANCHE_ANCHOR_PATH, JSON.stringify(trancheAnchor, null, 2));
      log(`transza: kotwica bufora zapisana ($${walletUsd.toFixed(2)})`);
    }
    // UWAGA na pułapkę (złapana przy pisaniu): kotwica wyceniona DZISIEJSZYMI
    // cenami daje „vs HODL" (~$0), a nie ruch rynku. Ruch rynku = wartość
    // dziś − wartość w CHWILI zakotwiczenia, czyli hodlUsd PIERWSZEJ próbki
    // positions-history (ta sama konwencja co „PnL od kotwicy" w raporcie/UI).
    const firstAnchorUsd = new Map<string, number>();
    // FIX 01.09 (Fable, znalezisko z porannego raportu): rebalans
    // #5887690→#5908083 sprawił, że „koszty wejścia (stałe)" skoczyły
    // −$8.58→−$76.02. Mechanizm: marketPnl liczył TYLKO otwarte pozycje,
    // więc zrealizowany ruch rynku ZAMKNIĘTEJ pozycji (−$66 bety starej
    // nogi cbBTC z 27–31.08) wypadał z „ruchu rynku" i lądował w
    // resztowych „kosztach wejścia". Naprawa: dla zamkniętych pozycji
    // produktowych doliczamy (ostatnia próbka − pierwsza kotwica) z
    // positions-history. Hedge (poolId gmx-*) odfiltrowany przez zbiór
    // pul produktowych. Koszt swapa/poślizgu rundy NADAL zostaje w
    // kosztach wejścia (to prawdziwy koszt, nie ruch rynku).
    const lastSample = new Map<string, { poolId: string; valueUsd: number }>();
    try {
      for (const lineRaw of fs.readFileSync(POS_HIST_PATH, 'utf8').trimEnd().split('\n')) {
        const r = JSON.parse(lineRaw);
        if (!firstAnchorUsd.has(r.tokenId) && typeof r.hodlUsd === 'number') firstAnchorUsd.set(r.tokenId, r.hodlUsd);
        if (typeof r.valueUsd === 'number') lastSample.set(r.tokenId, { poolId: r.poolId, valueUsd: r.valueUsd });
      }
    } catch { /* brak historii (świeży start) → marketPnl zostanie null */ }
    let marketPnl: number | null = null;
    for (const p of prodPositions) {
      const anchorUsd = firstAnchorUsd.get(p.tokenId);
      if (anchorUsd === undefined) continue;
      marketPnl = (marketPnl ?? 0) + (p.valueUsd - anchorUsd);
    }
    // zamknięte pozycje produktowe (zrealizowany ruch rynku)
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
      entryCostUsd: null, bufferBetaUsd: null, // wypełniane niżej, gdy jest kotwica
      walletParts: wallet?.parts ?? null,
      updatedAt: new Date().toISOString(),
    };
    // rozbicie „reszty": beta bufora (pływa z ceną) vs koszty wejścia (stałe)
    if (trancheLive.residualUsd !== null && walletUsd !== null && trancheAnchor) {
      trancheLive.bufferBetaUsd = +(walletUsd - trancheAnchor.walletUsd).toFixed(2);
      trancheLive.entryCostUsd = +(trancheLive.residualUsd - trancheLive.bufferBetaUsd).toFixed(2);
    }
  } catch (e) {
    log(`bilans transzy: ${String(e).slice(0, 140)}`);
  }

  // PRODUKT 27.08 (rozstrzygnięcie Rafała po wejściu #5886957): propozycja
  // OPEN znika automatycznie, gdy w tej puli JEST już nasza pozycja —
  // wisząca "otwórz" po wejściu to zaproszenie do podwójnego wejścia.
  // Kolejną pozycję w tej samej puli proponuje selektor (nowa propozycja
  // następnego dnia, jeśli zasadna) albo otwiera się ręcznie.
  try {
    const heldPools = new Set(found.map((x) => x.poolId).filter(Boolean));
    let autoClosed = 0;
    for (const pr of proposals) {
      if (pr.status === 'open' && pr.kind === 'OPEN' && pr.poolId && heldPools.has(pr.poolId)) {
        pr.status = 'dismissed';
        pr.note = `${pr.note ? pr.note + ' · ' : ''}zamknięta automatycznie — pozycja w tej puli już otwarta`;
        autoClosed++;
        log(`proposal ${pr.id}: zamknięta automatycznie — pozycja w ${pr.poolId} już otwarta`);
      }
      // sprzątanie po v1.2 (29.08): REBALANCE z doradcy na puli PRODUKTOWEJ
      // nie ma prawa wisieć — szerokością rządzi cykl FLAT_*. Sam guard w
      // maybePropose blokuje tylko NOWE; te zapisane w proposals.json przed
      // fixem przeżyłyby restart (klasa incydentu z 27.08).
      if (pr.status === 'open' && pr.kind === 'REBALANCE' && pr.poolId &&
          BOT_POOLS.find((b) => b.id === pr.poolId)?.productIdleWidthPct) {
        pr.status = 'dismissed';
        pr.note = `${pr.note ? pr.note + ' · ' : ''}zamknięta automatycznie — pula produktowa, zwężaniem rządzi cykl FLAT_NARROW/FLAT_WIDEN`;
        autoClosed++;
        log(`proposal ${pr.id}: REBALANCE odrzucony — ${pr.poolId} jest pulą produktową (hybryda FlatWide)`);
      }
    }
    if (autoClosed) saveProposals();
  } catch (e) {
    log(`auto-close OPEN: ${String(e).slice(0, 100)}`);
  }

  // --- produkt FlatWide: propozycje zwężenia/rozszerzenia wg stanu flatu ---
  // (transition-only w updateFlat by ominął pozycje otwarte/wykryte PO
  // przejściu i restart w trakcie epizodu — ten sweep domyka oba przypadki;
  // dedup w propose* gwarantuje brak dubli)
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
      // sprzątanie po ręcznym podpisie: propozycja zrealizowana = zamknij
      if (held.some((pos) => isNarrowPos(p, pos))) dismissOpenByKind('FLAT_NARROW', p.id, 'pozycja już wąska');
      if (held.some((pos) => !isNarrowPos(p, pos))) dismissOpenByKind('FLAT_WIDEN', p.id, 'pozycja już szeroka');
    }
  } catch (e) {
    log(`flat sweep: ${String(e).slice(0, 100)}`);
  }

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
  // PULE PRODUKTOWE NIE DOSTAJĄ REBALANSU Z DORADCY (fix 29.08, znaleziony
  // przy przeglądzie sekcji UI). Hybryda FlatWide ma JEDEN organ decydujący
  // o szerokości: cykl FLAT_NARROW/FLAT_WIDEN (|gap| 2%/5% + confirm).
  // Doradca k×σ to logika v1.2 — bez tego wyjątku bot mógł wystawić
  // propozycję zwężenia POZA cyklem, czyli dokładnie klasę incydentu
  // z 27.08 (stara wąska propozycja ±16% wyglądająca jak normalna).
  // Sam `advice` z assessPosition zostaje w state (telemetria/diagnostyka),
  // ale nie zamienia się już w propozycję do podpisu.
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
