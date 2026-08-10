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
}

export const BOT_POOLS: BotPool[] = [
  {
    id: 'mainnet-usdc-weth-030',
    chainId: 1, chain: 'mainnet',
    address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
    feeBps: 3000, ethIsToken0: false, d0: 6, d1: 18, sym0: 'USDC', sym1: 'WETH',
  },
  {
    id: 'mainnet-usdc-weth-005',
    chainId: 1, chain: 'mainnet',
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    feeBps: 500, ethIsToken0: false, d0: 6, d1: 18, sym0: 'USDC', sym1: 'WETH',
  },
  {
    id: 'base-weth-usdc-030',
    chainId: 8453, chain: 'base',
    address: '0x6c561B446416E1A00E8E93E221854d6eA4171372',
    feeBps: 3000, ethIsToken0: true, d0: 18, d1: 6, sym0: 'WETH', sym1: 'USDC',
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
