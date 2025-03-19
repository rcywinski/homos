import { Token } from '@uniswap/sdk-core';
import { Pool, FeeAmount, TickMath, TICK_SPACINGS } from '@uniswap/v3-sdk';
import { createPublicClient, http, createWalletClient, custom, PublicClient, WalletClient, Address, encodeFunctionData, decodeFunctionResult } from 'viem';
import { sepolia } from 'viem/chains';
import JSBI from 'jsbi';

// Sepolia addresses
export const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'; // Sepolia WETH
export const USDC_ADDRESS = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'; // Sepolia USDC

// Uniswap V3 contract addresses
export const POOL_FACTORY_ADDRESS = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'; // Sepolia Factory
export const SWAP_ROUTER_ADDRESS = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'; // Sepolia Router
export const NFT_MANAGER_ADDRESS = '0x1238536071E1c677A632429e3655c799b22cDA52'; // Sepolia NFT Manager

// Token definitions
export const WETH = new Token(
  11155111, // Sepolia chain ID
  WETH_ADDRESS,
  18,
  'WETH',
  'Wrapped Ether'
);

export const USDC = new Token(
  11155111,
  USDC_ADDRESS,
  6,
  'USDC',
  'USD Coin'
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
  tokenA: Token,
  tokenB: Token,
  fee: FeeAmount,
): Promise<{ pool: Pool; address: Address; isNew: boolean }> => {
  try {
    if (!walletClient.account) {
      throw new Error('No wallet account connected');
    }

    // Sort tokens by address to match Uniswap's internal ordering
    const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];

    // Try to get existing pool
    const poolAddress = await publicClient.readContract({
      address: POOL_FACTORY_ADDRESS,
      abi: POOL_FACTORY_ABI,
      functionName: 'getPool',
      args: [token0.address as Address, token1.address as Address, fee],
    }) as Address;

    let isNew = false;

    // If pool doesn't exist, create it
    if (poolAddress === '0x0000000000000000000000000000000000000000') {
      console.log('Pool does not exist, creating new pool...');
      
      const hash = await walletClient.writeContract({
        chain: sepolia,
        account: walletClient.account.address,
        address: POOL_FACTORY_ADDRESS,
        abi: POOL_FACTORY_ABI,
        functionName: 'createPool',
        args: [token0.address as Address, token1.address as Address, fee],
      });

      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Get the new pool address
      const newPoolAddress = await publicClient.readContract({
        address: POOL_FACTORY_ADDRESS,
        abi: POOL_FACTORY_ABI,
        functionName: 'getPool',
        args: [token0.address as Address, token1.address as Address, fee],
      }) as Address;

      if (newPoolAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Failed to create pool');
      }

      // Initialize the pool with a price of ~1500 USDC per ETH
      const initialPriceX96 = JSBI.BigInt('792281625142643375935439503360'); // sqrt(1500) * 2^96
      await walletClient.writeContract({
        chain: sepolia,
        account: walletClient.account.address,
        address: newPoolAddress,
        abi: POOL_ABI,
        functionName: 'initialize',
        args: [BigInt(initialPriceX96.toString())],
      });

      isNew = true;
      
      // Get pool data and create Pool instance
      const { sqrtPriceX96, tick, liquidity } = await getPoolPrice(publicClient, newPoolAddress);

      const pool = new Pool(
        token0,
        token1,
        fee,
        sqrtPriceX96,
        liquidity,
        tick
      );

      return { pool, address: newPoolAddress, isNew };
    }

    // Get pool data for existing pool
    const { sqrtPriceX96, tick, liquidity } = await getPoolPrice(publicClient, poolAddress);

    const pool = new Pool(
      token0,
      token1,
      fee,
      sqrtPriceX96,
      liquidity,
      tick
    );

    return { pool, address: poolAddress, isNew };
  } catch (error) {
    console.error('Error getting or creating pool:', error);
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(price);
}; 