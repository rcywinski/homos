import { Token, Price } from '@uniswap/sdk-core';
import { Pool, FeeAmount, TickMath, TICK_SPACINGS } from '@uniswap/v3-sdk';
import { createPublicClient, http, createWalletClient, custom, PublicClient, WalletClient, Address, encodeFunctionData, decodeFunctionResult } from 'viem';
import { sepolia, mainnet } from 'wagmi/chains';
import JSBI from 'jsbi';
import { sqrtPriceX96ToHumanPrice } from './v3math';
import { ethers } from 'ethers';

// Token Addresses
export const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'; // Sepolia WETH
export const USDC_ADDRESS = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'; // Sepolia USDC
export const USDT_ADDRESS = '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'; // Sepolia USDT

// Uniswap V3 contract addresses
export const POOL_FACTORY_ADDRESS = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'; // Sepolia Factory
export const SWAP_ROUTER_ADDRESS = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'; // Sepolia Router
export const NFT_MANAGER_ADDRESS = '0x1238536071E1c677A632429e3655c799b22cDA52'; // Sepolia NFT Manager

// Token Instances
export const WETH = new Token(
  sepolia.id,
  WETH_ADDRESS,
  18,
  'WETH',
  'Wrapped Ether'
);

export const USDC = new Token(
  sepolia.id,
  USDC_ADDRESS,
  6,
  'USDC',
  'USD Coin'
);

export const USDT = new Token(
  sepolia.id,
  USDT_ADDRESS,
  6,
  'USDT',
  'Tether USD'
);

// Pool fee tiers
export const FEE_TIERS = {
  LOWEST: FeeAmount.LOWEST,
  LOW: FeeAmount.LOW,
  MEDIUM: FeeAmount.MEDIUM,
  HIGH: FeeAmount.HIGH,
};

// ABI fragments
export const POOL_FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' }
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' }
    ],
    name: 'createPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

export const POOL_ABI = [
  {
    inputs: [{ name: 'sqrtPriceX96', type: 'uint160' }],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * Gets the current price from a Uniswap V3 pool
 */
export const getPoolPrice = async (
  publicClient: PublicClient,
  poolAddress: Address
): Promise<{
  sqrtPriceX96: JSBI;
  tick: number;
  liquidity: JSBI;
}> => {
  try {
    const [slot0, liquidity] = await Promise.all([
      publicClient.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'slot0',
      }),
      publicClient.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'liquidity',
      })
    ]);

    return {
      sqrtPriceX96: JSBI.BigInt(slot0[0].toString()),
      tick: slot0[1],
      liquidity: JSBI.BigInt(liquidity.toString()),
    };
  } catch (error) {
    console.error('Error getting pool price:', error);
    throw new Error('Failed to get pool price');
  }
};

/**
 * Gets or creates a pool instance
 */
export const getOrCreatePool = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  token0: Token,
  token1: Token,
  fee: FeeAmount
): Promise<{ pool: Pool; address: string; isNew: boolean }> => {
  try {
    // Determine the network config based on the chain ID
    const networkConfig = token0.chainId === 1 ? NETWORKS.MAINNET : NETWORKS.SEPOLIA;
    
    // Check if pool exists
    const existingPool = await getExistingPool(
      publicClient,
      token0,
      token1,
      fee,
      networkConfig
    );

    if (existingPool) {
      return { ...existingPool, isNew: false };
    }

    // Pool doesn't exist, create it
    const factoryAddress = POOL_FACTORY_ADDRESS;
    const account = walletClient.account;
    if (!account) throw new Error('Wallet account not available');

    // Sort tokens in ascending order
    let sortedTokens: [Token, Token];
    if (token0.sortsBefore(token1)) {
      sortedTokens = [token0, token1];
    } else {
      sortedTokens = [token1, token0];
    }

    // Create pool via Uniswap V3 factory
    const hash = await walletClient.writeContract({
      chain: sepolia,
      account,
      abi: POOL_FACTORY_ABI,
      address: factoryAddress as `0x${string}`,
      functionName: 'createPool',
      args: [
        sortedTokens[0].address as `0x${string}`,
        sortedTokens[1].address as `0x${string}`,
        fee,
      ],
    });

    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Get the pool address
    const poolAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: POOL_FACTORY_ABI,
      functionName: 'getPool',
      args: [sortedTokens[0].address as Address, sortedTokens[1].address as Address, fee],
    }) as Address;

    // Initialize the pool with a price
    // For simplicity, we'll use a default price here
    // In a real app, you'd want to use a price oracle or let the user specify
    const sqrtPriceX96 = 792281625142643375935439503360n; // placeholder init price (test pool only)

    const initHash = await walletClient.writeContract({
      chain: sepolia,
      account: account.address,
      address: poolAddress,
      abi: POOL_ABI,
      functionName: 'initialize',
      args: [sqrtPriceX96],
    });

    await publicClient.waitForTransactionReceipt({ hash: initHash });

    // Create a new Pool instance
    const poolState = await getPoolPrice(publicClient, poolAddress);

    const createdPool = new Pool(
      token0,
      token1,
      fee,
      poolState.sqrtPriceX96.toString(),
      poolState.liquidity.toString(),
      poolState.tick
    );

    return { pool: createdPool, address: poolAddress, isNew: true };
  } catch (error) {
    console.error('Error creating pool:', error);
    throw error;
  }
};

/**
 * Gets the nearest valid tick for a given price in a pool
 */
export const getNearestValidTick = (
  price: number,
  fee: FeeAmount
): number => {
  const tick = Math.log(price) / Math.log(1.0001);
  const tickSpacing = TICK_SPACINGS[fee];
  return Math.round(tick / tickSpacing) * tickSpacing;
};

/**
 * Formats a price for display
 */
export const formatPrice = (price: number): string => {
  if (!isFinite(price) || isNaN(price) || price === 0) {
    return '$0.00';
  }

  // We need to check if the price is very small (like 0.0005)
  // In this case, we should invert it to show the USD price per ETH
  if (price < 0.01) {
    // If price is very small, it's likely the USDC/WETH or USDT/WETH ratio
    // Convert to WETH/USD by inverting
    const inverted = 1 / price;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(inverted);
  }
  
  // Otherwise, format the price directly
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

// Network-specific addresses
export const NETWORKS = {
  MAINNET: {
    chainId: 1,
    name: 'Mainnet',
    poolFactoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as Address,
    tokens: {
      WETH: {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
        decimals: 18,
        symbol: 'WETH'
      },
      USDC: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
        decimals: 6,
        symbol: 'USDC'
      },
      USDT: {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
        decimals: 6,
        symbol: 'USDT'
      }
    }
  },
  BASE: {
    chainId: 8453,
    name: 'Base',
    poolFactoryAddress: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD' as Address,
    tokens: {
      WETH: {
        address: '0x4200000000000000000000000000000000000006' as Address,
        decimals: 18,
        symbol: 'WETH'
      },
      USDC: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
        decimals: 6,
        symbol: 'USDC'
      },
      cbBTC: {
        address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as Address,
        decimals: 8,
        symbol: 'cbBTC'
      }
    }
  },
  ARBITRUM: {
    chainId: 42161,
    name: 'Arbitrum',
    poolFactoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as Address,
    tokens: {
      WETH: {
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address,
        decimals: 18,
        symbol: 'WETH'
      },
      USDC: {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address,
        decimals: 6,
        symbol: 'USDC'
      }
    }
  },
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    poolFactoryAddress: POOL_FACTORY_ADDRESS as Address,
    tokens: {
      WETH: {
        address: WETH_ADDRESS as Address,
        decimals: 18,
        symbol: 'WETH'
      },
      USDC: {
        address: USDC_ADDRESS as Address,
        decimals: 6,
        symbol: 'USDC'
      },
      USDT: {
        address: USDT_ADDRESS as Address,
        decimals: 6,
        symbol: 'USDT'
      }
    }
  }
};

export type NetworkConfig = { chainId: number; name: string; poolFactoryAddress: Address; tokens: Record<string, { address: Address; decimals: number; symbol: string }> };

// Update getExistingPool to accept networkConfig
export const getExistingPool = async (
  publicClient: PublicClient,
  token0: Token,
  token1: Token,
  fee: FeeAmount,
  networkConfig: NetworkConfig
): Promise<{ pool: Pool; address: string } | null> => {
  try {
    // Sort tokens by address to match Uniswap's internal ordering
    const [tokenA, tokenB] = token0.address.toLowerCase() < token1.address.toLowerCase()
      ? [token0, token1]
      : [token1, token0];

    // Get pool address from factory using network-specific factory address
    const poolAddress = await publicClient.readContract({
      address: networkConfig.poolFactoryAddress,
      abi: POOL_FACTORY_ABI,
      functionName: 'getPool',
      args: [tokenA.address as Address, tokenB.address as Address, fee],
    }) as Address;

    // If pool doesn't exist, return null
    if (poolAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    // Get pool data
    const slot0Data = await publicClient.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: 'slot0',
    }) as readonly [bigint, number, number, number, number, number, boolean];

    const liquidity = await publicClient.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: 'liquidity',
    }) as bigint;

    const pool = new Pool(
      tokenA,
      tokenB,
      fee,
      slot0Data[0].toString(),
      liquidity.toString(),
      slot0Data[1]
    );

    return { pool, address: poolAddress };
  } catch (error) {
    console.error('Error in getExistingPool:', error);
    return null;
  }
};

// The Graph API endpoints
export const GRAPH_API_ENDPOINTS = {
  MAINNET: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'
};

export interface PoolPriceData {
  token0Price: string;
  token1Price: string;
  feeTier: string;
  liquidity: string;
}

export const calculatePoolPrice = (
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number,
  isWethToken0: boolean,
  chainId: number = 1
): number => {
  try {
    // Exact-at-display-precision conversion (see v3math.ts).
    // No hardcoded prices, no chain special-casing: Sepolia pools now show
    // their REAL (test) price instead of a fake $1,900.
    const price = sqrtPriceX96ToHumanPrice(sqrtPriceX96, token0Decimals, token1Decimals);
    // Preserve the legacy return orientation (callers depend on it):
    // the function returns "WETH per quote token" (a small number, e.g.
    // 0.0003 WETH per USDC) regardless of token order.
    // price = token1 per token0 (human units).
    return isWethToken0 ? 1 / price : price;
  } catch (error) {
    console.error('Error calculating pool price:', error);
    return 0;
  }
};

export const fetchPoolPriceFromGraph = async (
  poolAddress: string,
  chainId: number
): Promise<PoolPriceData | null> => {
  // Only try to fetch from Graph if we're on mainnet
  if (chainId !== 1) {
    return null;
  }

  const query = `
    query getPool($poolAddress: String!) {
      pool(id: $poolAddress) {
        token0Price
        token1Price
        feeTier
        liquidity
      }
    }
  `;

  try {
    const response = await fetch(GRAPH_API_ENDPOINTS.MAINNET, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          poolAddress: poolAddress.toLowerCase(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { data } = await response.json();
    
    if (data?.pool) {
      return {
        token0Price: data.pool.token0Price,
        token1Price: data.pool.token1Price,
        feeTier: data.pool.feeTier,
        liquidity: data.pool.liquidity
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching pool price from The Graph:', error);
    return null;
  }
}; 