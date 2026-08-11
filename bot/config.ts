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
  chain: 'mainnet' | 'base';
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
}

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
};

export const NFT_MANAGER: Record<number, `0x${string}`> = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  8453: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
};

export const WATCH_ADDRESS = (process.env.BOT_WATCH_ADDRESS ||
  '0xaa6acdc9900f3d3418d64360f85e220eca152e1e') as `0x${string}`;

export const INTERVALS = {
  priceSec: 60, // slot0 wszystkich pul
  statsSec: 15 * 60, // pełne statystyki doradcy (24h swapów)
  positionsSec: 5 * 60, // odczyt pozycji NFT
};

export const STATE_DIR = '.bot';
