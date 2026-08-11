/**
 * pools.ts — observed pools as CONFIGURATION, not code.
 * Selection rationale: PAIRS.md (fee APR, vol/TVL, diversification roles).
 * Add/remove entries here — PoolBrowser renders whatever is listed.
 */
import { FeeAmount } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { NETWORKS, NetworkConfig } from '../utils/uniswap';

export interface ObservedPair {
  /** wagmi chain id */
  chainId: number;
  chainName: string;
  networkConfig: NetworkConfig;
  token0: Token; // will be sorted by address before factory lookup
  token1: Token;
  name: string;
  /** which fee tiers to look up for this pair */
  feeTiers: FeeAmount[];
  /** portfolio role, shown as a badge (see PAIRS.md §3) */
  role?: 'core' | 'correlated' | 'stable' | 'legacy';
}

const t = (chainId: number, cfg: { address: string; decimals: number; symbol: string }) =>
  new Token(chainId, cfg.address, cfg.decimals, cfg.symbol);

const M = NETWORKS.MAINNET;
const B = NETWORKS.BASE;
const A = NETWORKS.ARBITRUM;

// Mainnet tokens
const mWETH = t(1, M.tokens.WETH);
const mUSDC = t(1, M.tokens.USDC);
const mUSDT = t(1, M.tokens.USDT);
const mWBTC = new Token(1, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8, 'WBTC');

// Base tokens
const bWETH = t(8453, B.tokens.WETH);
const bUSDC = t(8453, B.tokens.USDC);
const bCBBTC = t(8453, (B.tokens as any).cbBTC);

// Arbitrum tokens (dodane 2026-08-11, Fable→Sonnet HANDOFF — walk-forward pass,
// decyzja Rafała: sieć dodana do analizy; wzorzec dokładnie jak Base w sesji 2e)
const aWETH = t(42161, A.tokens.WETH);
const aUSDC = t(42161, A.tokens.USDC);

export const OBSERVED_PAIRS: ObservedPair[] = [
  // --- Base: current best venues (PAIRS.md) ---
  {
    chainId: 8453, chainName: 'Base', networkConfig: B,
    token0: bUSDC, token1: bWETH, name: 'USDC/WETH',
    feeTiers: [FeeAmount.LOW, FeeAmount.MEDIUM], role: 'core',
  },
  {
    chainId: 8453, chainName: 'Base', networkConfig: B,
    token0: bCBBTC, token1: bWETH, name: 'cbBTC/WETH',
    feeTiers: [FeeAmount.LOW, FeeAmount.MEDIUM], role: 'correlated',
  },
  {
    chainId: 8453, chainName: 'Base', networkConfig: B,
    token0: bCBBTC, token1: bUSDC, name: 'cbBTC/USDC',
    feeTiers: [FeeAmount.LOW], role: 'correlated',
  },
  // --- Mainnet ---
  {
    chainId: 1, chainName: 'Ethereum', networkConfig: M,
    token0: mUSDC, token1: mWETH, name: 'USDC/WETH',
    feeTiers: [FeeAmount.LOW, FeeAmount.MEDIUM], role: 'core',
  },
  {
    chainId: 1, chainName: 'Ethereum', networkConfig: M,
    token0: mUSDT, token1: mWETH, name: 'USDT/WETH',
    feeTiers: [FeeAmount.LOW, FeeAmount.MEDIUM], role: 'core',
  },
  {
    chainId: 1, chainName: 'Ethereum', networkConfig: M,
    token0: mWBTC, token1: mWETH, name: 'WBTC/WETH',
    feeTiers: [FeeAmount.LOW], role: 'correlated',
  },
  {
    chainId: 1, chainName: 'Ethereum', networkConfig: M,
    token0: mUSDC, token1: mUSDT, name: 'USDC/USDT',
    feeTiers: [FeeAmount.LOWEST], role: 'stable',
  },
  // --- Arbitrum (walk-forward pass, HANDOFF 2026-08-11) ---
  {
    chainId: 42161, chainName: 'Arbitrum', networkConfig: A,
    token0: aUSDC, token1: aWETH, name: 'USDC/WETH',
    feeTiers: [FeeAmount.LOW, FeeAmount.MEDIUM], role: 'core',
  },
];

export const ROLE_LABELS: Record<string, string> = {
  core: 'rdzeń',
  correlated: 'skorelowana',
  stable: 'stable',
  legacy: 'legacy',
};
