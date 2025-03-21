import { 
  Pool, 
  Position, 
  nearestUsableTick
} from '@uniswap/v3-sdk';
import { 
  Token, 
  CurrencyAmount, 
  Percent, 
  Fraction 
} from '@uniswap/sdk-core';
import JSBI from 'jsbi';
import { 
  parseEther, 
  parseUnits, 
  formatUnits,
  encodeFunctionData,
  Address
} from 'viem';
import { NETWORKS } from './uniswap';

/**
 * Calculates the price from a tick value
 * @param tick The tick value
 * @param token0Decimals Number of decimals for token0
 * @param token1Decimals Number of decimals for token1
 * @returns The price represented by the tick
 */
export const tickToPrice = (
  tick: number,
  token0Decimals: number,
  token1Decimals: number
): number => {
  // Price = 1.0001^tick
  const rawPrice = Math.pow(1.0001, tick);
  
  // Adjust for decimal differences between tokens
  const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
  return rawPrice * decimalAdjustment;
};

/**
 * Converts a price to the corresponding tick
 * @param price The price to convert
 * @param token0Decimals Number of decimals for token0
 * @param token1Decimals Number of decimals for token1
 * @returns The tick value for the price
 */
export const priceToTick = (
  price: number,
  token0Decimals: number,
  token1Decimals: number
): number => {
  // Adjust price for decimal differences
  const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
  const adjustedPrice = price / decimalAdjustment;
  
  // Tick = log base 1.0001 of price
  return Math.log(adjustedPrice) / Math.log(1.0001);
};

/**
 * Gets the nearest valid tick for a given tick spacing
 * @param tick The raw tick value
 * @param tickSpacing The tick spacing for the pool
 * @returns The nearest valid tick
 */
export const getValidTick = (tick: number, tickSpacing: number): number => {
  return nearestUsableTick(tick, tickSpacing);
};

/**
 * Formats a tick value to a readable price
 * @param tick The tick value
 * @param token0Symbol Symbol for token0
 * @param token1Symbol Symbol for token1
 * @param token0Decimals Number of decimals for token0
 * @param token1Decimals Number of decimals for token1
 * @returns Formatted price string
 */
export const formatTickPrice = (
  tick: number,
  token0Symbol: string,
  token1Symbol: string,
  token0Decimals: number,
  token1Decimals: number
): string => {
  const price = tickToPrice(tick, token0Decimals, token1Decimals);
  return `${price.toFixed(2)} ${token1Symbol} per ${token0Symbol}`;
};

/**
 * Creates a position for adding liquidity with custom tick range
 * @param pool The Uniswap V3 pool
 * @param lowerTick The lower tick of the position
 * @param upperTick The upper tick of the position
 * @param amount0 The amount of token0 to add
 * @param amount1 The amount of token1 to add
 * @returns The position instance
 */
export const createPosition = (
  pool: Pool,
  lowerTick: number,
  upperTick: number,
  amount0: string,
  amount1: string
): Position => {
  // Convert string amounts to CurrencyAmount
  const token0Amount = CurrencyAmount.fromRawAmount(
    pool.token0,
    JSBI.BigInt(parseUnits(amount0, pool.token0.decimals).toString())
  );
  
  const token1Amount = CurrencyAmount.fromRawAmount(
    pool.token1,
    JSBI.BigInt(parseUnits(amount1, pool.token1.decimals).toString())
  );
  
  // Create the position using the tick range and amounts
  return Position.fromAmounts({
    pool,
    tickLower: lowerTick,
    tickUpper: upperTick,
    amount0: token0Amount.quotient,
    amount1: token1Amount.quotient,
    useFullPrecision: true
  });
};

// Define NonfungiblePositionManager ABI subset needed for liquidity operations
const NONFUNGIBLE_POSITION_MANAGER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'token0', type: 'address' },
          { internalType: 'address', name: 'token1', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'int24', name: 'tickLower', type: 'int24' },
          { internalType: 'int24', name: 'tickUpper', type: 'int24' },
          { internalType: 'uint256', name: 'amount0Desired', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Desired', type: 'uint256' },
          { internalType: 'uint256', name: 'amount0Min', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Min', type: 'uint256' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        internalType: 'struct INonfungiblePositionManager.MintParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'mint',
    outputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
          { internalType: 'uint256', name: 'amount0Min', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Min', type: 'uint256' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        internalType: 'struct INonfungiblePositionManager.DecreaseLiquidityParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'decreaseLiquidity',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
];

// Define contract addresses for networks
const POSITION_MANAGER_ADDRESSES = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Mainnet
  11155111: '0x1238536071E1c677A632429e3655c799B22cDA52', // Sepolia (using a mock address)
};

/**
 * Prepares transaction data for adding liquidity
 * @param position The position to add liquidity to
 * @param slippageTolerance The allowed slippage in basis points (e.g., 50 for 0.5%)
 * @param deadline The transaction deadline in seconds
 * @param chainId The current chain ID
 * @returns Transaction data to be sent
 */
export const prepareAddLiquidityTransaction = (
  position: Position,
  slippageTolerance: number,
  deadline: number,
  chainId: number
) => {
  // Create slippage tolerance percentage
  const slippagePercent = new Percent(slippageTolerance, 10000);
  
  // Calculate min amounts based on slippage
  const { amount0: amount0Min, amount1: amount1Min } = position.mintAmountsWithSlippage(
    slippagePercent
  );
  
  // Construct mint params
  const mintParams = {
    token0: position.pool.token0.address as Address,
    token1: position.pool.token1.address as Address,
    fee: position.pool.fee,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    amount0Desired: position.amount0.toString(),
    amount1Desired: position.amount1.toString(),
    amount0Min: amount0Min.toString(),
    amount1Min: amount1Min.toString(),
    recipient: '0x0000000000000000000000000000000000000000', // Will be replaced with actual recipient
    deadline: Math.floor(Date.now() / 1000) + deadline
  };
  
  // Encode function data for transaction
  const calldata = encodeFunctionData({
    abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
    functionName: 'mint',
    args: [mintParams]
  });
  
  return {
    to: POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address,
    data: calldata,
    value: '0'
  };
};

/**
 * Prepares transaction data for removing liquidity
 * @param tokenId The NFT token ID of the position
 * @param liquidity The amount of liquidity to remove
 * @param slippageTolerance The allowed slippage in basis points (e.g., 50 for 0.5%)
 * @param deadline The transaction deadline in seconds
 * @param chainId The current chain ID
 * @returns Transaction data to be sent
 */
export const prepareRemoveLiquidityTransaction = (
  tokenId: string,
  liquidity: string,
  slippageTolerance: number,
  deadline: number,
  chainId: number
) => {
  // Create slippage tolerance percentage
  const slippagePercent = new Percent(slippageTolerance, 10000);
  
  // Construct decrease liquidity params
  const params = {
    tokenId: BigInt(tokenId),
    liquidity: BigInt(liquidity),
    amount0Min: BigInt(0), // TODO: Calculate min amounts based on slippage
    amount1Min: BigInt(0), // TODO: Calculate min amounts based on slippage
    deadline: BigInt(Math.floor(Date.now() / 1000) + deadline)
  };
  
  // Encode function data for transaction
  const calldata = encodeFunctionData({
    abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
    functionName: 'decreaseLiquidity',
    args: [params]
  });
  
  return {
    to: POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address,
    data: calldata,
    value: '0'
  };
};

/**
 * Calculate optimal amount ratio for adding liquidity
 * @param pool The Uniswap V3 pool
 * @param lowerTick The lower tick of the position
 * @param upperTick The upper tick of the position
 * @param amount0 The amount of token0 (optional)
 * @param amount1 The amount of token1 (optional)
 * @returns Optimal amounts for both tokens
 */
export const calculateOptimalAmounts = (
  pool: Pool,
  lowerTick: number,
  upperTick: number,
  amount0?: string,
  amount1?: string
): { amount0: string, amount1: string } => {
  if (!amount0 && !amount1) {
    throw new Error("At least one token amount must be provided");
  }
  
  // Create a position with 0 amounts to get the price range
  const emptyPosition = new Position({
    pool,
    liquidity: JSBI.BigInt(0),
    tickLower: lowerTick,
    tickUpper: upperTick
  });
  
  // If only one amount is provided, calculate the other
  if (amount0 && !amount1) {
    const parsed0 = parseUnits(amount0, pool.token0.decimals);
    const amount0CurrencyAmount = CurrencyAmount.fromRawAmount(
      pool.token0,
      JSBI.BigInt(parsed0.toString())
    );
    
    // Calculate token1 amount based on the position price range
    const amount1Raw = emptyPosition.mintAmounts.amount1.toString();
    const amount1Ratio = JSBI.divide(
      JSBI.multiply(
        JSBI.BigInt(parsed0.toString()),
        JSBI.BigInt(amount1Raw)
      ),
      emptyPosition.mintAmounts.amount0
    );
    
    return {
      amount0,
      amount1: formatUnits(BigInt(amount1Ratio.toString()), pool.token1.decimals)
    };
  } else if (!amount0 && amount1) {
    const parsed1 = parseUnits(amount1, pool.token1.decimals);
    const amount1CurrencyAmount = CurrencyAmount.fromRawAmount(
      pool.token1,
      JSBI.BigInt(parsed1.toString())
    );
    
    // Calculate token0 amount based on the position price range
    const amount0Raw = emptyPosition.mintAmounts.amount0.toString();
    const amount0Ratio = JSBI.divide(
      JSBI.multiply(
        JSBI.BigInt(parsed1.toString()),
        JSBI.BigInt(amount0Raw)
      ),
      emptyPosition.mintAmounts.amount1
    );
    
    return {
      amount0: formatUnits(BigInt(amount0Ratio.toString()), pool.token0.decimals),
      amount1
    };
  }
  
  // If both amounts are provided, return them as is
  return { amount0: amount0!, amount1: amount1! };
};

// Define TickMath constants
export const TickMath = {
  MIN_TICK: -887272,  // Min tick used by the Uniswap interface
  MAX_TICK: 887272    // Max tick used by the Uniswap interface
}; 