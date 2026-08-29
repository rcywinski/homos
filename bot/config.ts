/**
 * bot/config.ts — konfiguracja bota-obserwatora (standalone, bez zależności UI).
 * Env:
 *   BOT_WATCH_ADDRESS  — adres portfela do obserwacji pozycji (wymagany sensownie)
 *   RPC_MAINNET / RPC_BASE — opcjonalne własne RPC
 *   TG_TOKEN / TG_CHAT — opcjonalny Telegram na alerty
 */
export interface BotPool {
  id: string;
  chainId: number;
  chain: 'mainnet' | 'base' | 'arbitrum';
  address: `0x${string}`;
  feeBps: number;
  ethIsToken0: boolean;
  d0: number;
  d1: number;
  sym0: string;
  sym1: string;
  /** adresy tokenów puli — do JEDNOZNACZNEGO dopasowania pozycji NFT
   *  (dopasowanie po chain+fee przestało wystarczać przy >1 parze na tier) */
  t0?: `0x${string}`;
  t1?: `0x${string}`;
  /** waluta kwotowania ceny puli: 'USD' (domyślnie; ethUsd = USD za ETH)
   *  albo 'WETH' (pary typu cbBTC/WETH; ethUsd = USD za token bazowy,
   *  liczony przez kurs z puli referencyjnej usdRefPoolId) */
  quote?: 'USD' | 'WETH';
  usdRefPoolId?: string;
  /** override mnożnika k doradcy dla tej puli (ALGORITHM v1.1: ETH/stable k=3
   *  [domyślne z ADVISOR_PARAMS], pary skorelowane k=2) */
  advisorK?: number;
  /** tryb powrotu bezpiecznika trendu (ALGORITHM v1.1 §4): 'aboveEma'
   *  [domyślny, ETH/stable] — sygnał gaśnie dopiero gdy cena NAD EMA;
   *  'half' [cbBTC] — gaśnie przy gap > −thresh/2 (czysty exit) */
  trendReentry?: 'aboveEma' | 'half';
  /** akcja obronna na sygnale DOWN (ALGORITHM v1.2 §4): 'exit' [domyślna] —
   *  propozycja wyjścia do cash 50/50; 'hedge' [base-030] — propozycja
   *  shorta perp (GMX) na nadwyżkę ETH ponad 50% wartości, LP zostaje */
  trendAction?: 'exit' | 'hedge';
  /** PRODUKT 27.08 — hybryda FlatWide (decyzja Rafała, dziennik CONTEXT
   *  27.08): postura idle = SZEROKI pasywny LP o stałej szerokości
   *  ±N% (zamiast k×σ doradcy). Gdy ustawione: sugestie zakresu
   *  (OPEN w kokpicie, wykresy) liczą się z tej szerokości. Zwężanie
   *  do k×σ następuje TYLKO w potwierdzonym flat (|gap|<2% przez
   *  confirmH godzin — propozycja FLAT_ENTER, osobna logika). */
  productIdleWidthPct?: number;
}

/** Bezpiecznik trendu spadkowego (ALGORITHM.md v1.1 §4) — jedna prawda. */
export const TREND = {
  hlDays: 7, // half-life EMA log-ceny względnej pary
  thresh: 0.05, // sygnał DOWN gdy log(P/EMA) < −5%
};

/** PRODUKT FlatWide — detektor flatu FLAT_ENTER/FLAT_EXIT (28.08).
 *  Zwężenie LP do k×σ TYLKO w potwierdzonym flacie; poza flatem szeroki
 *  pasywny ±productIdleWidthPct. Parametry z E1/flatwindows (365d Fable
 *  + 720d i cross-check CC-Win, 2 pule): confirm 12h zamiast 24h ~2×
 *  więcej złapanych epizodów bez utraty jakości (base-030 ΣEV +223%,
 *  cbBTC +13%). EMA: TA SAMA co bezpiecznik trendu (HL 7d, trend-state)
 *  — HL_D=5 (najlepszy na cbBTC, +18%) ODROCZONE do przeglądu 1.09
 *  (kombinacja 12h+5d nietestowana, wymagałaby drugiej EMA).
 *  Detektor działa WYŁĄCZNIE na pulach produktowych (productIdleWidthPct)
 *  — lekcja mainnet-wsteth-weth-001 (skan 27.08): na parach o
 *  strukturalnie niskiej zmienności (LST, stable/stable) detektor łapie
 *  szum mikrostruktury i generuje czyste koszty; dodatkowo twardy próg
 *  minVolDaily. Tryb PROPONUJ — nic nie wykonuje się samo. */
export const FLAT = {
  enterGap: 0.02, // |log-gap| < 2% → kandydat flat (zegar confirm startuje)
  exitGap: 0.05, // |log-gap| > 5% → koniec flatu (propozycja powrotu do szerokiego, alarm 24/7)
  confirmH: 12, // potwierdzenie: nieprzerwanie w progu przez N godzin
  minVolDaily: 0.005, // poniżej 0.5%/d flat NIE jest sygnałem (klasa LST/stable)
  narrowFrac: 0.6, // pozycja "wąska", gdy połówkowa szerokość < 0.6 × productIdleWidthPct
};

/** TRANSZA KAPITAŁU (29.08, pytanie Rafała „matematyka się nie zgadza"):
 *  panel kokpitu liczy PnL od KOTWIC pozycji, więc nie widać, ile z
 *  wpłaconych USDC realnie wróciło. Bilans transzy pilnuje tej drugiej
 *  liczby: wpłacone → dziś (LP + portfel), a różnicę rozbija na ruch
 *  rynku i „resztę" (koszty wejścia: swapy, poślizg, gaz mintów).
 *  depositedUsd = kwota wpłacona do gry, NIE suma mintów. */
export const TRANCHE = {
  id: 'transza-1',
  label: 'Transza 1',
  depositedUsd: 6092,
  startedAt: '2026-08-27',
  /** sieć, na której transza pracuje — portfel liczymy tylko tam
   *  (mainnet/arbitrum mają tylko stare pyłki, nie należą do transzy) */
  chain: 'base' as const,
};

export const BOT_POOLS: BotPool[] = [
  {
    id: 'mainnet-usdc-weth-030',
    chainId: 1, chain: 'mainnet',
    address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
    feeBps: 3000, ethIsToken0: false, d0: 6, d1: 18, sym0: 'USDC', sym1: 'WETH',
    t0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', t1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  {
    id: 'mainnet-usdc-weth-005',
    chainId: 1, chain: 'mainnet',
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    feeBps: 500, ethIsToken0: false, d0: 6, d1: 18, sym0: 'USDC', sym1: 'WETH',
    t0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', t1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  {
    id: 'base-weth-usdc-030',
    chainId: 8453, chain: 'base',
    address: '0x6c561B446416E1A00E8E93E221854d6eA4171372',
    feeBps: 3000, ethIsToken0: true, d0: 18, d1: 6, sym0: 'WETH', sym1: 'USDC',
    t0: '0x4200000000000000000000000000000000000006', t1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    trendAction: 'hedge', // ALGORITHM v1.2: hedge-excess (bramka 73%/−2.88 i 81%/−2.74)
    productIdleWidthPct: 50, // PRODUKT 27.08: hybryda FlatWide, idle ±50%
  },
  {
    // para skorelowana (PAIRS.md: sleeve pasywny ±15%); cena kwotowana w WETH,
    // USD przez kurs ETH z base-weth-usdc-030.
    // UWAGA kolejność tokenów ZWERYFIKOWANA on-chain przez tick na żywo
    // (-265575 ⇒ token0=WETH: 0x4200… < 0xcbB7… w sortowaniu adresów Uniswapa).
    // Konfiguracja w scripts/fetch-swaps.ts ma ją ODWROTNIE (token0Decimals: 8)
    // — błąd zgłoszony do kolejki, dane cbBTC z 90d wymagają refetch/reinterpretacji.
    id: 'base-cbbtc-weth-005',
    chainId: 8453, chain: 'base',
    address: '0x7AeA2E8A3843516afa07293a10Ac8E49906dabD1',
    feeBps: 500, ethIsToken0: true, d0: 18, d1: 8, sym0: 'WETH', sym1: 'cbBTC',
    t0: '0x4200000000000000000000000000000000000006', t1: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    quote: 'WETH', usdRefPoolId: 'base-weth-usdc-030',
    advisorK: 2, trendReentry: 'half',
    productIdleWidthPct: 40, // PRODUKT 27.08: hybryda FlatWide, idle ±40%
  },
  {
    // WETH/cbBTC 0.3% Base — dodane 2026-08-26 decyzją przeglądu (DECYZJE
    // 11c): PIERWSZY PASS auto-lejka (65.2% wygr., worst −2.7; 23 okna
    // 30/15, profil "Adapt k=2 h=24h + trend(exit,HL7d,5%)"). PAPER ONLY —
    // PASS ≠ kapitał; werdykt odnowi się po rekalibracji σ/k. Adres CREATE2
    // zweryfikowany 2×: on-chain przez CC-Win (25.08) i deterministycznie
    // przez Fable (26.08). Profil jak base-cbbtc-weth-005 (para skorelowana).
    id: 'base-weth-cbbtc-030',
    chainId: 8453, chain: 'base',
    address: '0x8c7080564B5A792A33Ef2FD473fbA6364d5495e5',
    feeBps: 3000, ethIsToken0: true, d0: 18, d1: 8, sym0: 'WETH', sym1: 'cbBTC',
    t0: '0x4200000000000000000000000000000000000006', t1: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    quote: 'WETH', usdRefPoolId: 'base-weth-usdc-030',
    advisorK: 2, trendReentry: 'half',
  },
  {
    // Arbitrum — dodane 2026-08-11 po zaliczonym walk-forwardzie 365d
    // (re>EMA 73% wygr — rekord projektu; CONTEXT ~16:15). Kolejność tokenów:
    // WETH 0x82aF… < USDC 0xaf88… ⇒ token0=WETH (zgodne z meta fetcha 365d).
    id: 'arbitrum-weth-usdc-005',
    chainId: 42161, chain: 'arbitrum',
    address: '0xC6962004f452bE9203591991D15f6b388e09E8D0',
    feeBps: 500, ethIsToken0: true, d0: 18, d1: 6, sym0: 'WETH', sym1: 'USDC',
    t0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', t1: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
];

export const RPC: Record<string, string[]> = {
  mainnet: [
    ...(process.env.RPC_MAINNET ? [process.env.RPC_MAINNET] : []),
    'https://eth.drpc.org',
    'https://ethereum-rpc.publicnode.com',
    'https://eth.llamarpc.com',
  ],
  base: [
    ...(process.env.RPC_BASE ? [process.env.RPC_BASE] : []),
    'https://base.drpc.org',
    'https://base-rpc.publicnode.com',
    'https://base.llamarpc.com',
  ],
  arbitrum: [
    ...(process.env.RPC_ARBITRUM ? [process.env.RPC_ARBITRUM] : []),
    'https://arbitrum.drpc.org',
    'https://arbitrum-one-rpc.publicnode.com',
    'https://1rpc.io/arb',
  ],
};

export const NFT_MANAGER: Record<number, `0x${string}`> = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  8453: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  42161: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // kanoniczny deploy = adres mainnetowy
};

export const WATCH_ADDRESS = (process.env.BOT_WATCH_ADDRESS ||
  '0xaa6acdc9900f3d3418d64360f85e220eca152e1e') as `0x${string}`;

export const INTERVALS = {
  priceSec: 60, // slot0 wszystkich pul
  statsSec: 15 * 60, // pełne statystyki doradcy (24h swapów)
  positionsSec: 5 * 60, // odczyt pozycji NFT
};

export const STATE_DIR = '.bot';
