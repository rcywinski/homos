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
  Address,
  TransactionRequest
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

// Define an interface for our custom position objects
interface PositionLike {
  pool: Pool;
  tickLower: number;
  tickUpper: number;
  liquidity: JSBI;
  amount0: CurrencyAmount<Token>;
  amount1: CurrencyAmount<Token>;
  mintAmounts: {
    amount0: JSBI;
    amount1: JSBI;
  };
  mintAmountsWithSlippage: (slippageTolerance: Percent) => {
    amount0: JSBI;
    amount1: JSBI;
  };
}

// Helper function to determine if an object is a PositionLike
function isPositionLike(position: Position | PositionLike): position is PositionLike {
  return 'amount0' in position && 'amount1' in position && 
         'mintAmounts' in position && 'mintAmountsWithSlippage' in position;
}

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
): Position | PositionLike => {
  try {
    // Add debug logging for the input parameters
    console.log('DEBUG - createPosition input params:', {
      poolDetails: {
        token0: {
          symbol: pool.token0.symbol,
          decimals: pool.token0.decimals,
          address: pool.token0.address
        },
        token1: {
          symbol: pool.token1.symbol,
          decimals: pool.token1.decimals,
          address: pool.token1.address
        },
        fee: pool.fee,
        tickCurrent: pool.tickCurrent,
        sqrtRatioX96: pool.sqrtRatioX96.toString()
      },
      lowerTick: lowerTick,
      upperTick: upperTick,
      tickDistance: upperTick - lowerTick,
      amount0: amount0,
      amount1: amount1
    });

    // Parse amounts, handling potential errors
    let parsedAmount0: bigint;
    let parsedAmount1: bigint;
    
    try {
      // Handle potential parsing errors with very small or very large values
      parsedAmount0 = parseUnits(amount0, pool.token0.decimals);
      parsedAmount1 = parseUnits(amount1, pool.token1.decimals);
      
      console.log('DEBUG - Parsed bigint values:', {
        parsedAmount0: parsedAmount0.toString(),
        parsedAmount1: parsedAmount1.toString(),
        parsedAmount0Hex: parsedAmount0.toString(16),
        parsedAmount1Hex: parsedAmount1.toString(16)
      });
    } catch (err) {
      console.error('Error parsing amounts:', err);
      throw new Error(`Invalid amounts: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Convert string amounts to CurrencyAmount
    try {
      // Create safe wrapper to convert to JSBI with better error handling
      const safeJSBIConvert = (value: bigint | string): JSBI => {
        try {
          const valueStr = value.toString();
          console.log('DEBUG - Converting to JSBI:', {
            value: valueStr,
            valueType: typeof value,
            valueConstructor: value.constructor?.name
          });
          return JSBI.BigInt(valueStr);
        } catch (err) {
          console.error('JSBI conversion failed for value:', {
            value,
            valueType: typeof value,
            valueConstructor: value.constructor?.name,
            error: err
          });
          throw new Error(`JSBI conversion failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      };
      
      const jsbiAmount0 = safeJSBIConvert(parsedAmount0);
      const jsbiAmount1 = safeJSBIConvert(parsedAmount1);
      
      console.log('DEBUG - JSBI values:', {
        jsbiAmount0: jsbiAmount0.toString(),
        jsbiAmount1: jsbiAmount1.toString(),
        jsbiAmount0Hex: jsbiAmount0.toString(16),
        jsbiAmount1Hex: jsbiAmount1.toString(16)
      });

      // Create CurrencyAmount objects using raw amounts
      console.log('DEBUG - Creating CurrencyAmount objects');
      const token0Amount = CurrencyAmount.fromRawAmount(
        pool.token0,
        Number(parsedAmount0)
      );
      const token1Amount = CurrencyAmount.fromRawAmount(
        pool.token1,
        Number(parsedAmount1)
      );

      console.log('DEBUG - CurrencyAmount objects created:', {
        token0Amount: token0Amount.toExact(),
        token1Amount: token1Amount.toExact(),
        token0Quotient: token0Amount.quotient.toString(),
        token1Quotient: token1Amount.quotient.toString()
      });

      // Calculate liquidity using the concentrated liquidity formula
      const lowerPrice = tickToPrice(lowerTick, pool.token0.decimals, pool.token1.decimals);
      const upperPrice = tickToPrice(upperTick, pool.token0.decimals, pool.token1.decimals);
      const sqrtLowerPrice = Math.sqrt(lowerPrice);
      const sqrtUpperPrice = Math.sqrt(upperPrice);
      
      console.log('DEBUG - Price calculations:', {
        lowerPrice,
        upperPrice,
        sqrtLowerPrice,
        sqrtUpperPrice,
        priceDiff: sqrtUpperPrice - sqrtLowerPrice
      });
      
      // L = amount1 / (sqrt(upperPrice) - sqrt(lowerPrice))
      const liquidityValue = Number(parsedAmount1) / (sqrtUpperPrice - sqrtLowerPrice);
      console.log('DEBUG - Liquidity calculation:', {
        parsedAmount1: parsedAmount1.toString(),
        liquidityValue,
        liquidityValueFloor: Math.floor(liquidityValue)
      });

      const liquidity = JSBI.BigInt(Math.floor(liquidityValue).toString());
      
      console.log('DEBUG - Final liquidity value:', {
        liquidity: liquidity.toString(),
        liquidityHex: liquidity.toString(16)
      });

      // Create a custom position object that has all the necessary properties
      const customPosition: PositionLike = {
        pool,
        tickLower: lowerTick,
        tickUpper: upperTick,
        liquidity,
        amount0: token0Amount,
        amount1: token1Amount,
        mintAmounts: {
          amount0: jsbiAmount0,
          amount1: jsbiAmount1
        },
        mintAmountsWithSlippage: (slippageTolerance: Percent) => {
          // Calculate slippage-adjusted amounts
          const slippageBips = JSBI.BigInt(slippageTolerance.numerator.toString());
          const base = JSBI.BigInt(10000);
          const slippageMultiplier = JSBI.subtract(base, slippageBips);
          
          // Apply slippage to amount0
          const amount0Min = JSBI.divide(
            JSBI.multiply(jsbiAmount0, slippageMultiplier),
            base
          );
          
          // Apply slippage to amount1
          const amount1Min = JSBI.divide(
            JSBI.multiply(jsbiAmount1, slippageMultiplier),
            base
          );
          
          return {
            amount0: amount0Min,
            amount1: amount1Min
          };
        }
      };

      console.log('DEBUG - Final position object:', {
        tickLower: lowerTick,
        tickUpper: upperTick,
        liquidity: liquidity.toString(),
        amount0: token0Amount.toExact(),
        amount1: token1Amount.toExact(),
        mintAmounts: {
          amount0: customPosition.mintAmounts.amount0.toString(),
          amount1: customPosition.mintAmounts.amount1.toString()
        }
      });

      return customPosition;
    } catch (conversionError) {
      console.error('JSBI Conversion Error:', {
        error: conversionError,
        errorMessage: conversionError instanceof Error ? conversionError.message : String(conversionError),
        errorStack: conversionError instanceof Error ? conversionError.stack : undefined
      });
      throw new Error(`JSBI conversion error: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    }
  } catch (error) {
    console.error('Error creating position:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to create position: ${error instanceof Error ? error.message : String(error)}`);
  }
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
export const POSITION_MANAGER_ADDRESSES: Record<1 | 11155111, string> = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  11155111: '0x1238536071E1c677A632429e3655c799b22cDA52'
};

/**
 * Prepares transaction data for adding liquidity
 * @param position The position to add liquidity to
 * @param slippageTolerance The allowed slippage in basis points (e.g., 50 for 0.5%)
 * @param deadline The transaction deadline in seconds
 * @param chainId The current chain ID
 * @param recipient The recipient address for the liquidity
 * @returns Transaction data to be sent
 */
export function prepareAddLiquidityTransaction(
  position: Position | PositionLike,
  slippageTolerance: number,
  deadline: number,
  chainId: number,
  recipient: Address
): TransactionRequest {
  // Log initial position details
  console.log('DEBUG - Position details:', {
    token0: {
      symbol: position.pool.token0.symbol,
      address: position.pool.token0.address,
      decimals: position.pool.token0.decimals
    },
    token1: {
      symbol: position.pool.token1.symbol,
      address: position.pool.token1.address,
      decimals: position.pool.token1.decimals
    },
    recipient,
    chainId
  });

  // Validate addresses
  if (!position.pool.token0.address || !position.pool.token1.address) {
    throw new Error('Token addresses are undefined');
  }

  // Format addresses
  const token0Address = position.pool.token0.address as Address;
  const token1Address = position.pool.token1.address as Address;
  const positionManagerAddress = POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address;

  // Log formatted addresses
  console.log('DEBUG - Formatted addresses:', {
    token0Address,
    token1Address,
    positionManagerAddress,
    recipient,
    chainId
  });

  // Validate all required addresses
  if (!token0Address || !token1Address || !positionManagerAddress || !recipient) {
    console.log('DEBUG - Address validation failed:', {
      token0Address,
      token1Address,
      positionManagerAddress,
      recipient
    });
    throw new Error('One or more required addresses are undefined');
  }

  // Calculate minimum amounts with slippage
  const currentPrice = tickToPrice(position.pool.tickCurrent, position.pool.token0.decimals, position.pool.token1.decimals);
  const lowerPrice = tickToPrice(position.tickLower, position.pool.token0.decimals, position.pool.token1.decimals);
  const upperPrice = tickToPrice(position.tickUpper, position.pool.token0.decimals, position.pool.token1.decimals);
  
  // Calculate how close the current price is to the edges of the range
  const priceRange = upperPrice - lowerPrice;
  const distanceFromLower = currentPrice - lowerPrice;
  const distanceFromUpper = upperPrice - currentPrice;
  const minDistance = Math.min(distanceFromLower, distanceFromUpper);
  const pricePosition = minDistance / priceRange;
  
  // Special handling for USDC/WETH pair - this pair requires much higher slippage
  const isUsdcWethPair = 
    (position.pool.token0.symbol?.includes('USDC') && position.pool.token1.symbol?.includes('ETH')) ||
    (position.pool.token1.symbol?.includes('USDC') && position.pool.token0.symbol?.includes('ETH'));
  
  // Set a VERY high base slippage for USDC/WETH pairs
  let dynamicSlippage;
  if (isUsdcWethPair) {
    // Start with a reasonable slippage for USDC/WETH
    // Calculate slippage based on position in range
    if (currentPrice < lowerPrice || currentPrice > upperPrice) {
      // Price is out of range, use higher slippage
      dynamicSlippage = Math.max(slippageTolerance, 2000); // 20% slippage if out of range
      console.log('USDC/WETH: Price out of range, using very high slippage (20%)');
    } else {
      // Price is in range, calculate proportional slippage
      const rangeWidth = (upperPrice - lowerPrice) / lowerPrice;
      const positionInRange = (currentPrice - lowerPrice) / (upperPrice - lowerPrice);
      
      // If near edge, use higher slippage
      if (positionInRange < 0.1 || positionInRange > 0.9) {
        dynamicSlippage = Math.max(slippageTolerance, 1000); // 10% near edges
        console.log('USDC/WETH: Near range edge, using high slippage (10%)');
      } else {
        // More centered in range, use moderate slippage
        dynamicSlippage = Math.max(slippageTolerance, 500); // At least 5% for in-range positions
        console.log('USDC/WETH: Well within range, using moderate slippage (5%)');
      }
      
      // For very wide ranges, increase slippage
      if (rangeWidth > 0.5) { // >50% price range
        dynamicSlippage = Math.max(dynamicSlippage, 800); // At least 8% for wide ranges
        console.log('USDC/WETH: Wide range detected, increasing slippage');
      }
    }
  } else {
    // For other pairs, start with the provided slippage or at least 0.5%
    dynamicSlippage = Math.max(slippageTolerance, 50); // At least 0.5% for others
  }

  // Calculate volatility factor based on pool characteristics
  let volatilityFactor = 1.0;

  // For USDC/WETH pair, use higher volatility factor
  if (isUsdcWethPair) {
    volatilityFactor = 2.0; // Double base volatility for USDC/WETH
    
    // For wide ranges on USDC/WETH, even higher slippage
    const rangeWidth = (upperPrice - lowerPrice) / lowerPrice;
    if (rangeWidth > 0.3) { // Range > 30% wide
      volatilityFactor = 2.5; // Even higher for wide ranges
    }
    
    // For positions near edges, add additional safety
    if (pricePosition < 0.2) { // Within 20% of either edge
      volatilityFactor += 0.5; // Add another 50% to volatility
    }
    
    // Extra safeguard for extremely volatile USDC/WETH pair
    // Apply a minimum volatility factor regardless of other conditions
    volatilityFactor = Math.max(volatilityFactor, 2.0);
  }
  
  // Apply volatility factor to the dynamic slippage
  dynamicSlippage = Math.floor(dynamicSlippage * volatilityFactor);
  
  // Ensure minimum slippage - 20% for USDC/WETH, 1% for others
  if (isUsdcWethPair) {
    dynamicSlippage = Math.max(dynamicSlippage, 2000); // Minimum 20% for USDC/WETH
  } else {
    dynamicSlippage = Math.max(dynamicSlippage, 100); // Minimum 1% for other pairs
  }
  
  // Cap maximum slippage at 25% as a safety measure
  dynamicSlippage = Math.min(dynamicSlippage, 2500);
  
  // Create Percent object for dynamic slippage tolerance
  const slippagePercent = new Percent(dynamicSlippage, 10000);

  // Log slippage calculation details
  console.log('DEBUG - Dynamic slippage calculation:', {
    isUsdcWethPair,
    pricePosition,
    rangeWidth: (upperPrice - lowerPrice) / lowerPrice,
    volatilityFactor,
    dynamicSlippage,
    slippagePercent: slippagePercent.toFixed(2),
    currentPrice,
    lowerPrice,
    upperPrice,
    distanceFromLower,
    distanceFromUpper
  });

  const { amount0: amount0Min, amount1: amount1Min } = position.mintAmountsWithSlippage(slippagePercent);

  // Log slippage amounts with more detail
  console.log('DEBUG - Slippage amounts calculated:', {
    amount0Min: amount0Min.toString(),
    amount1Min: amount1Min.toString(),
    originalAmount0: position.amount0.quotient.toString(),
    originalAmount1: position.amount1.quotient.toString(),
    dynamicSlippage,
    slippagePercent: slippagePercent.toFixed(2),
    priceRange: {
      lower: lowerPrice,
      upper: upperPrice,
      current: currentPrice
    }
  });

  // Log values before conversion with more detail
  console.log('DEBUG - Values before conversion:', {
    amount0: {
      raw: position.amount0.quotient.toString(),
      formatted: position.amount0.toExact(),
      decimals: position.pool.token0.decimals
    },
    amount1: {
      raw: position.amount1.quotient.toString(),
      formatted: position.amount1.toExact(),
      decimals: position.pool.token1.decimals
    },
    amount0Min: {
      raw: amount0Min.toString(),
      formatted: formatUnits(BigInt(amount0Min.toString()), position.pool.token0.decimals)
    },
    amount1Min: {
      raw: amount1Min.toString(),
      formatted: formatUnits(BigInt(amount1Min.toString()), position.pool.token1.decimals)
    },
    dynamicSlippage,
    slippagePercent: slippagePercent.toFixed(2),
    priceRange: {
      lower: lowerPrice,
      upper: upperPrice,
      current: currentPrice
    }
  });

  // Prepare mint parameters
  const mintParams = {
    token0: token0Address,
    token1: token1Address,
    fee: position.pool.fee,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    amount0Desired: position.amount0.quotient.toString(),
    amount1Desired: position.amount1.quotient.toString(),
    amount0Min: amount0Min.toString(),
    amount1Min: amount1Min.toString(),
    recipient,
    deadline: Math.floor(Date.now() / 1000) + deadline
  };

  // Log mint parameters
  console.log('DEBUG - Mint params constructed:', {
    ...mintParams,
    amount0Desired: position.amount0.quotient.toString(),
    amount1Desired: position.amount1.quotient.toString()
  });

  // Encode the transaction data
  const abi = [
    {
      name: 'mint',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        {
          name: 'params',
          type: 'tuple',
          components: [
            { name: 'token0', type: 'address' },
            { name: 'token1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickLower', type: 'int24' },
            { name: 'tickUpper', type: 'int24' },
            { name: 'amount0Desired', type: 'uint256' },
            { name: 'amount1Desired', type: 'uint256' },
            { name: 'amount0Min', type: 'uint256' },
            { name: 'amount1Min', type: 'uint256' },
            { name: 'recipient', type: 'address' },
            { name: 'deadline', type: 'uint256' }
          ]
        }
      ],
      outputs: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'liquidity', type: 'uint128' },
        { name: 'amount0', type: 'uint256' },
        { name: 'amount1', type: 'uint256' }
      ]
    }
  ];

  // Log ABI and function details
  console.log('DEBUG - ABI and function details:', {
    abi,
    functionName: 'mint',
    args: [mintParams]
  });

  // Encode the transaction data
  const data = encodeFunctionData({
    abi,
    functionName: 'mint',
    args: [mintParams]
  });

  // Log successful encoding
  console.log('DEBUG - Transaction encoded successfully');

  return {
    to: positionManagerAddress,
    data,
    value: BigInt(0)
  };
}

/**
 * Prepares transaction data for removing liquidity
 * @param tokenId The NFT token ID of the position
 * @param liquidity The amount of liquidity to remove
 * @param slippageTolerance The allowed slippage in basis points (e.g., 50 for 0.5%)
 * @param deadline The transaction deadline in seconds
 * @param chainId The current chain ID
 * @param positionDetails Optional position details to calculate min amounts
 * @returns Transaction data to be sent
 */
export const prepareRemoveLiquidityTransaction = async (
  tokenId: string,
  liquidity: string,
  slippageTolerance: number,
  deadline: number,
  chainId: number,
  // Optional position details to calculate slippage
  positionDetails?: {
    pool: Pool;
    tickLower: number;
    tickUpper: number;
  }
) => {
  // Create slippage tolerance percentage
  const slippagePercent = new Percent(slippageTolerance * 100, 10000);
  
  let amount0Min = BigInt(0);
  let amount1Min = BigInt(0);
  
  // If we have position details, calculate min amounts based on slippage
  if (positionDetails) {
    try {
      // Create a temporary Position object to calculate token amounts
      const position = new Position({
        pool: positionDetails.pool,
        tickLower: positionDetails.tickLower,
        tickUpper: positionDetails.tickUpper,
        liquidity: JSBI.BigInt(liquidity)
      });
      
      // Get expected amounts of tokens from liquidity
      const amount0 = position.amount0;
      const amount1 = position.amount1;
      
      // Apply slippage tolerance to get minimum amounts
      const slippageAdjustedAmount0 = amount0.multiply(
        new Fraction(10000 - slippageTolerance * 100, 10000)
      );
      
      const slippageAdjustedAmount1 = amount1.multiply(
        new Fraction(10000 - slippageTolerance * 100, 10000)
      );
      
      // Convert to BigInt
      amount0Min = BigInt(slippageAdjustedAmount0.quotient.toString());
      amount1Min = BigInt(slippageAdjustedAmount1.quotient.toString());
      
      console.log('DEBUG - Calculated min amounts for remove liquidity:', {
        tokenId,
        liquidity,
        slippageTolerance,
        amount0: amount0.toFixed(6),
        amount1: amount1.toFixed(6),
        amount0Min: amount0Min.toString(),
        amount1Min: amount1Min.toString()
      });
    } catch (e) {
      console.warn('Could not calculate min amounts, using 0:', e);
      // If calculation fails, fall back to 0 (unsafe but will not block transaction)
    }
  } else {
    // Special handling for USDC/WETH pairs (if we don't have position details)
    // Apply higher slippage for USDC/WETH pairs 
    console.log('No position details provided, using 0 for min amounts (potentially unsafe)');
  }
  
  // Construct decrease liquidity params
  const params = {
    tokenId: BigInt(tokenId),
    liquidity: BigInt(liquidity),
    amount0Min,
    amount1Min,
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

  // Calculate prices from ticks
  const lowerPrice = tickToPrice(lowerTick, pool.token0.decimals, pool.token1.decimals);
  const upperPrice = tickToPrice(upperTick, pool.token0.decimals, pool.token1.decimals);
  const sqrtLowerPrice = Math.sqrt(lowerPrice);
  const sqrtUpperPrice = Math.sqrt(upperPrice);
  
  // If only amount0 is provided, calculate amount1
  if (amount0 && !amount1) {
    const parsed0 = parseUnits(amount0, pool.token0.decimals);
    const amount0Value = Number(parsed0);
    
    // Calculate amount1 using the concentrated liquidity formula
    // amount1 = amount0 * (sqrt(upperPrice) - sqrt(lowerPrice))
    const amount1Value = amount0Value * (sqrtUpperPrice - sqrtLowerPrice);
    
    // Add safety checks to prevent extreme values
    const maxAmount1 = amount0Value * 2; // Cap at 2x the USDC amount
    const safeAmount1 = Math.min(amount1Value, maxAmount1);
    
    return {
      amount0,
      amount1: formatUnits(BigInt(Math.floor(safeAmount1)), pool.token1.decimals)
    };
  } 
  // If only amount1 is provided, calculate amount0
  else if (!amount0 && amount1) {
    const parsed1 = parseUnits(amount1, pool.token1.decimals);
    const amount1Value = Number(parsed1);
    
    // Calculate amount0 using the concentrated liquidity formula
    // amount0 = amount1 / (sqrt(upperPrice) - sqrt(lowerPrice))
    const amount0Value = amount1Value / (sqrtUpperPrice - sqrtLowerPrice);
    
    // Add safety checks to prevent extreme values
    const maxAmount0 = amount1Value * 2; // Cap at 2x the WETH amount
    const safeAmount0 = Math.min(amount0Value, maxAmount0);
    
    return {
      amount0: formatUnits(BigInt(Math.floor(safeAmount0)), pool.token0.decimals),
      amount1
    };
  }
  
  // If both amounts are provided, validate their ratio
  if (amount0 && amount1) {
    const parsed0 = parseUnits(amount0, pool.token0.decimals);
    const parsed1 = parseUnits(amount1, pool.token1.decimals);
    const amount0Value = Number(parsed0);
    const amount1Value = Number(parsed1);
    
    // Calculate the expected ratio based on the price range
    const expectedRatio = sqrtUpperPrice - sqrtLowerPrice;
    const actualRatio = amount1Value / amount0Value;
    
    // If the actual ratio is significantly different from expected, adjust amount1
    if (Math.abs(actualRatio - expectedRatio) > expectedRatio * 0.1) { // 10% tolerance
      const adjustedAmount1 = amount0Value * expectedRatio;
      return {
        amount0,
        amount1: formatUnits(BigInt(Math.floor(adjustedAmount1)), pool.token1.decimals)
      };
    }
  }
  
  // If both amounts are provided and their ratio is acceptable, return them as is
  return { amount0: amount0!, amount1: amount1! };
};

// Define TickMath constants
export const TickMath = {
  MIN_TICK: -887272,  // Min tick used by the Uniswap interface
  MAX_TICK: 887272    // Max tick used by the Uniswap interface
}; 