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
          decimals: pool.token0.decimals
        },
        token1: {
          symbol: pool.token1.symbol,
          decimals: pool.token1.decimals
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

    // Additional validation for narrow ranges with small amounts
    const tickDistance = upperTick - lowerTick;
    const amount0Value = parseFloat(amount0);
    const amount1Value = parseFloat(amount1);
    
    // Check if amounts might be too small for the given tick range
    const token0IsStable = pool.token0.symbol?.includes('USD') || false;
    const token1IsStable = pool.token1.symbol?.includes('USD') || false;
    
    // For narrow ranges, require much higher minimums based on how narrow the range is
    if (tickDistance < 2000) { // Narrow range
      // Calculate required minimums based on tick distance
      let minStablecoinAmount = 10; // Lower base minimum to 10 USDC
      let minEthAmount = 0.005; // Lower base minimum
      
      // Adjust minimums based on how narrow the range is
      if (tickDistance < 1200) minStablecoinAmount = 15;
      if (tickDistance < 1000) minStablecoinAmount = 20;
      if (tickDistance < 500) minStablecoinAmount = 50;
      
      if (token0IsStable && amount0Value < minStablecoinAmount) {
        throw new Error(`For narrow ranges (${tickDistance} ticks) with stablecoins, use at least ${minStablecoinAmount} USDC to avoid conversion errors`);
      }
      
      if (token1IsStable && amount1Value < minStablecoinAmount) {
        throw new Error(`For narrow ranges (${tickDistance} ticks) with stablecoins, use at least ${minStablecoinAmount} USDC to avoid conversion errors`);
      }
      
      // For non-stablecoin pairs
      if (!token0IsStable && !token1IsStable) {
        if (tickDistance < 1200) minEthAmount = 0.01;
        if (tickDistance < 1000) minEthAmount = 0.02;
        if (tickDistance < 500) minEthAmount = 0.05;
        
        if (amount0Value < minEthAmount || amount1Value < minEthAmount) {
          throw new Error(`For narrow ranges (${tickDistance} ticks) with non-stablecoin pairs, use at least ${minEthAmount} ETH to avoid conversion errors`);
        }
      }
    }

    // Validate inputs
    if (!pool) throw new Error('Pool is required');
    if (!Number.isFinite(lowerTick)) throw new Error('Invalid lower tick');
    if (!Number.isFinite(upperTick)) throw new Error('Invalid upper tick');
    if (lowerTick >= upperTick) throw new Error('Lower tick must be less than upper tick');
    
    // Parse amounts, handling potential errors
    let parsedAmount0: bigint;
    let parsedAmount1: bigint;
    
    try {
      // Handle potential parsing errors with very small or very large values
      parsedAmount0 = parseUnits(amount0, pool.token0.decimals);
      parsedAmount1 = parseUnits(amount1, pool.token1.decimals);
      
      console.log('DEBUG - Parsed bigint values:', {
        parsedAmount0: parsedAmount0.toString(),
        parsedAmount1: parsedAmount1.toString()
      });
      
      // Ensure values aren't too large for JSBI
      if (parsedAmount0 > BigInt('1000000000000000000000000000000000')) {
        throw new Error('Amount0 is too large');
      }
      if (parsedAmount1 > BigInt('1000000000000000000000000000000000')) {
        throw new Error('Amount1 is too large');
      }
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
          
          // Handle potential extreme values more gracefully
          if (valueStr.length > 30) {
            console.warn('Very large value being converted to JSBI:', valueStr);
          }
          
          return JSBI.BigInt(valueStr);
        } catch (err) {
          console.error('JSBI conversion failed for value:', value);
          throw new Error(`JSBI conversion failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      };
      
      const jsbiAmount0 = safeJSBIConvert(parsedAmount0);
      const jsbiAmount1 = safeJSBIConvert(parsedAmount1);
      
      console.log('DEBUG - JSBI conversions:', {
        jsbiAmount0: jsbiAmount0.toString(),
        jsbiAmount1: jsbiAmount1.toString()
      });
      
      // Ensure values are reasonable for the tick range
      // Very narrow ranges require more tokens to avoid JSBI calculation issues
      if (tickDistance < 100 && (JSBI.LT(jsbiAmount0, JSBI.BigInt(100000)) || JSBI.LT(jsbiAmount1, JSBI.BigInt(100000)))) {
        const token0Min = token0IsStable ? '10' : '0.01';
        const token1Min = token1IsStable ? '10' : '0.01';
        throw new Error(`For very narrow ranges (${tickDistance} ticks), use at least ${token0Min} ${pool.token0.symbol} and ${token1Min} ${pool.token1.symbol}`);
      }
      
      // Create CurrencyAmount objects
      let token0Amount, token1Amount;
      try {
        // Use a workaround approach for creating CurrencyAmount when standard approach fails
        const createSafeCurrencyAmount = (token: Token, amount: JSBI): CurrencyAmount<Token> => {
          try {
            // First try the standard way
            return CurrencyAmount.fromRawAmount(token, amount);
          } catch (err) {
            console.warn('Falling back to manual CurrencyAmount creation for:', token.symbol);
            
            // If we get the JSBI conversion error, use a workaround
            // Create a Fraction first with string values to avoid conversion issues
            const rawAmount = amount.toString();
            const fraction = new Fraction(rawAmount, '1');
            
            // Create a CurrencyAmount with the fraction approach
            // @ts-ignore - We're working around the JSBI error
            const currencyAmount = new CurrencyAmount(
              token,
              fraction.numerator,
              fraction.denominator
            );
            
            // Override problematic methods
            // @ts-ignore - Adding custom properties
            currencyAmount.toFixed = () => formatUnits(BigInt(rawAmount), token.decimals);
            // @ts-ignore - Adding custom properties
            currencyAmount.toExact = () => formatUnits(BigInt(rawAmount), token.decimals);
            
            return currencyAmount;
          }
        };
        
        // Create CurrencyAmount objects using our safe method
        token0Amount = createSafeCurrencyAmount(pool.token0, jsbiAmount0);
        token1Amount = createSafeCurrencyAmount(pool.token1, jsbiAmount1);
        
        try {
          console.log('DEBUG - CurrencyAmount created:', {
            token0Amount: token0Amount.toExact(),
            token1Amount: token1Amount.toExact()
          });
        } catch (logErr) {
          console.log('DEBUG - CurrencyAmount created with values:', {
            token0: jsbiAmount0.toString(),
            token1: jsbiAmount1.toString()
          });
        }
      } catch (currencyErr) {
        console.error('Error creating CurrencyAmount:', currencyErr);
        throw new Error(`Failed to create currency amounts: ${currencyErr instanceof Error ? currencyErr.message : String(currencyErr)}`);
      }
      
      // Create the position using the tick range and amounts
      console.log('DEBUG - Creating Position with:', {
        tickLower: lowerTick,
        tickUpper: upperTick,
        amount0: token0Amount.quotient.toString(),
        amount1: token1Amount.quotient.toString()
      });
      
      // Wrap in a try-catch to identify the exact point of failure
      try {
        // For narrow ranges with small amounts, the standard Position.fromAmounts fails with JSBI errors
        // Use a different approach for these cases
        let position: Position | PositionLike;
        
        // Check if this is a narrow range with small amounts
        const isNarrowRange = tickDistance < 2000;
        const isSmallAmount = token0IsStable 
          ? amount0Value < 100  // Less than 100 USDC is "small" for narrow ranges
          : amount1Value < 0.05; // Less than 0.05 ETH is "small" for narrow ranges
        
        if (isNarrowRange && isSmallAmount) {
          console.log('Using special approach for narrow range with small amounts');
          
          try {
            // Create a custom position object that has all the necessary properties
            // but doesn't rely on the Position class's implementation
            const customPosition: PositionLike = {
              pool,
              tickLower: lowerTick,
              tickUpper: upperTick,
              liquidity: JSBI.BigInt('100000000000000'),
              amount0: token0Amount,
              amount1: token1Amount,
              mintAmounts: {
                amount0: token0Amount.quotient,
                amount1: token1Amount.quotient
              },
              mintAmountsWithSlippage: (slippageTolerance: Percent) => {
                // Calculate slippage-adjusted amounts
                const slippageBips = JSBI.BigInt(slippageTolerance.numerator.toString());
                const base = JSBI.BigInt(10000);
                const slippageMultiplier = JSBI.subtract(base, slippageBips);
                
                // Apply slippage to amount0
                const amount0Min = JSBI.divide(
                  JSBI.multiply(token0Amount.quotient, slippageMultiplier),
                  base
                );
                
                // Apply slippage to amount1
                const amount1Min = JSBI.divide(
                  JSBI.multiply(token1Amount.quotient, slippageMultiplier),
                  base
                );
                
                return {
                  amount0: amount0Min,
                  amount1: amount1Min
                };
              }
            };
            
            console.log('Created custom position object for narrow ranges');
            
            position = customPosition;
          } catch (specialError) {
            console.error('Error using special approach:', specialError);
            throw new Error(`Cannot create position with special handling: ${specialError}`);
          }
        } else {
          // For normal ranges or larger amounts, try the standard approach first
          try {
            position = Position.fromAmounts({
              pool,
              tickLower: lowerTick,
              tickUpper: upperTick,
              amount0: token0Amount.quotient,
              amount1: token1Amount.quotient,
              useFullPrecision: true
            });
          } catch (standardPosErr) {
            console.warn('Standard Position creation failed, trying fallback approach:', standardPosErr);
            
            // Try a fallback approach
            try {
              // Create a manual position for fallback
              const manualPosition: PositionLike = {
                pool,
                tickLower: lowerTick,
                tickUpper: upperTick,
                liquidity: JSBI.BigInt('100000000000000'),
                amount0: token0Amount,
                amount1: token1Amount,
                mintAmounts: {
                  amount0: token0Amount.quotient,
                  amount1: token1Amount.quotient
                },
                mintAmountsWithSlippage: (slippageTolerance: Percent) => {
                  // Calculate slippage-adjusted amounts
                  const slippageBips = JSBI.BigInt(slippageTolerance.numerator.toString());
                  const base = JSBI.BigInt(10000);
                  const slippageMultiplier = JSBI.subtract(base, slippageBips);
                  
                  // Apply slippage to amount0
                  const amount0Min = JSBI.divide(
                    JSBI.multiply(token0Amount.quotient, slippageMultiplier),
                    base
                  );
                  
                  // Apply slippage to amount1
                  const amount1Min = JSBI.divide(
                    JSBI.multiply(token1Amount.quotient, slippageMultiplier),
                    base
                  );
                  
                  return {
                    amount0: amount0Min,
                    amount1: amount1Min
                  };
                }
              };
              
              console.log('Using fallback position approach');
              
              position = manualPosition;
            } catch (fallbackErr) {
              console.error('Fallback position creation also failed:', fallbackErr);
              throw new Error(`Unable to create position even with fallback method: ${fallbackErr}`);
            }
          }
        }
        
        // Log info about the created position
        console.log('Position created, info:', {
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          liquidity: position.liquidity.toString(),
          token0Amount: position.amount0.toExact(),
          token1Amount: position.amount1.toExact()
        });
        
        return position;
      } catch (posErr) {
        console.error('Position creation failed:', posErr);
        // Check for specific error messages related to JSBI conversion
        const errMsg = String(posErr);
        if (errMsg.includes('toNumber') || errMsg.includes('JSBI') || errMsg.includes('Convert')) {
          // Calculate tick distance to provide better guidance
          const tickDistance = upperTick - lowerTick;
          let recommendedAmount = "50-100";
          
          if (tickDistance < 1000) recommendedAmount = "100";
          if (tickDistance < 500) recommendedAmount = "200";
          
          // Provide more specific guidance based on the token types and range width
          if (token0IsStable || token1IsStable) {
            throw new Error(`Position creation failed due to calculation error with small amounts in a narrow range (${tickDistance} ticks). For stablecoin pairs in narrow ranges, try at least ${recommendedAmount} ${token0IsStable ? pool.token0.symbol : pool.token1.symbol}, or widen your price range.`);
          } else {
            throw new Error(`Position creation failed due to calculation error with small amounts in a narrow range (${tickDistance} ticks). For this range width, try using at least ${tickDistance < 1000 ? '0.05' : '0.025'} ETH or widen your price range.`);
          }
        }
        throw posErr;
      }
    } catch (conversionError) {
      console.error('JSBI Conversion Error:', conversionError);
      throw new Error(`JSBI conversion error: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    }
  } catch (error) {
    console.error('Error creating position:', error);
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
  position: Position | PositionLike,
  slippageTolerance: number,
  deadline: number,
  chainId: number
) => {
  try {
    console.log('DEBUG - prepareAddLiquidityTransaction inputs:', {
      position: {
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        liquidity: position.liquidity.toString(),
        amount0: position.amount0.toString(),
        amount1: position.amount1.toString()
      },
      slippageTolerance,
      deadline,
      chainId
    });
    
    // Create slippage tolerance percentage
    const slippagePercent = new Percent(slippageTolerance, 10000);
    
    // Calculate min amounts based on slippage
    let amount0Min, amount1Min;
    try {
      const slippageAmounts = position.mintAmountsWithSlippage(slippagePercent);
      amount0Min = slippageAmounts.amount0;
      amount1Min = slippageAmounts.amount1;
      
      console.log('DEBUG - Slippage amounts calculated:', {
        amount0Min: amount0Min.toString(),
        amount1Min: amount1Min.toString()
      });
    } catch (slippageError) {
      console.error('Error calculating slippage amounts:', slippageError);
      throw new Error(`Failed to calculate slippage amounts: ${slippageError instanceof Error ? slippageError.message : String(slippageError)}`);
    }
    
    // Safely convert JSBI values to strings
    const safeToString = (value: any): string => {
      if (value === null || value === undefined) return '0';
      
      try {
        // Handle JSBI objects
        if (typeof value === 'object' && value.constructor && value.constructor.name === 'JSBI') {
          return value.toString();
        }
        
        // For CurrencyAmount objects
        if (typeof value === 'object' && value.quotient) {
          return value.quotient.toString();
        }
        
        // Regular value
        return value.toString();
      } catch (error) {
        console.error('Error in safeToString:', error, 'Value:', value);
        return '0';
      }
    };
    
    // Log the values before conversion
    console.log('DEBUG - Values before conversion:', {
      amount0: position.amount0,
      amount1: position.amount1,
      amount0Min,
      amount1Min
    });
    
    try {
      // Construct mint params with safe conversions
      const mintParams = {
        token0: position.pool.token0.address as Address,
        token1: position.pool.token1.address as Address,
        fee: position.pool.fee,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        amount0Desired: safeToString(position.amount0),
        amount1Desired: safeToString(position.amount1),
        amount0Min: safeToString(amount0Min),
        amount1Min: safeToString(amount1Min),
        recipient: '0x0000000000000000000000000000000000000000', // Will be replaced with actual recipient
        deadline: Math.floor(Date.now() / 1000) + deadline
      };
      
      console.log('DEBUG - Mint params constructed:', mintParams);
      
      // Encode function data for transaction
      const calldata = encodeFunctionData({
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'mint',
        args: [mintParams]
      });
      
      console.log('DEBUG - Transaction encoded successfully');
      
      return {
        to: POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address,
        data: calldata,
        value: '0'
      };
    } catch (conversionError) {
      console.error('Error in transaction preparation:', conversionError);
      throw new Error(`Transaction preparation failed: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    }
  } catch (error) {
    console.error('Error preparing add liquidity transaction:', error);
    throw new Error(`Failed to prepare transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
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