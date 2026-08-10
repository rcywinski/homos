import React, { FC, useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { Pool, Position as UniswapPosition } from '@uniswap/v3-sdk';
import JSBI from 'jsbi';
import { formatUnits, Address, encodeFunctionData } from 'viem';
import { tickToPrice, POSITION_MANAGER_ADDRESSES } from '../../utils/liquidityManagement';
import { getAmountsForLiquidity, humanPriceQuotePerBase, MAX_UINT128 } from '../../utils/v3math';
import { fetchRecentSwaps, computeStats, assessPosition, PoolStats } from '../../utils/advisor';
import { TICK_SPACINGS } from '@uniswap/v3-sdk';
import { addTransaction } from '../TransactionHistory';

// Interface for position data
interface Position {
  id: string;
  liquidity: string;
  token0: string;
  token1: string;
  tickLower: number;
  tickUpper: number;
  amount0: string;
  amount1: string;
  usdValue: string;
  inRange: boolean;
  unclaimedFees0: string;
  unclaimedFees1: string;
  unclaimedFeesUSD: string;
}

interface MyPositionsProps {
  pool: Pool;
  poolAddress: string;
  onSuccess: () => void;
}

// Add token conversion utilities at the top of the file, after imports
// Token conversion utilities for proper decimal handling
const formatTokenAmount = (rawAmount: any, decimals: number): string => {
  try {
    // Handle various input types
    let amount: bigint;
    if (typeof rawAmount === 'bigint') {
      amount = rawAmount;
    } else if (typeof rawAmount === 'string') {
      amount = BigInt(rawAmount);
    } else if (typeof rawAmount === 'number') {
      // Convert number to appropriate decimals and then to bigint
      const scaledAmount = rawAmount * Math.pow(10, decimals);
      amount = BigInt(Math.floor(scaledAmount));
    } else {
      console.error('Invalid amount type:', typeof rawAmount);
      return '0.00';
    }
    
    // Format with proper decimals
    const formatted = formatUnits(amount, decimals);
    return formatted;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0.00';
  }
};

// Get token decimals - typical values are 6 for USDC and 18 for WETH
const getTokenDecimals = (token: any): number => {
  if (!token) return 18; // Default to 18 if token info not available
  
  // Check by symbol first
  if (token.symbol) {
    // Stablecoins typically use 6 decimals
    if (token.symbol.includes('USDC') || token.symbol.includes('USDT') || token.symbol.includes('DAI')) {
      return 6;
    }
    
    // ETH and most other tokens use 18 decimals
    if (token.symbol.includes('ETH') || token.symbol.includes('WETH')) {
      return 18;
    }
  }
  
  // If we have the actual decimals from the token, use that
  if (token.decimals !== undefined) {
    return token.decimals;
  }
  
  // Default fallback
  return 18;
};

// Exact position math — bigint, identical to the Uniswap interface (see utils/v3math.ts)
const positionTokenAmounts = (
  liquidity: string,
  tickLower: number,
  tickUpper: number,
  sqrtPriceX96: bigint,
  currentTick: number,
  token0Decimals: number,
  token1Decimals: number
) => {
  const { amount0, amount1 } = getAmountsForLiquidity(
    sqrtPriceX96,
    tickLower,
    tickUpper,
    BigInt(liquidity)
  );
  return {
    amount0: parseFloat(formatUnits(amount0, token0Decimals)),
    amount1: parseFloat(formatUnits(amount1, token1Decimals)),
    inRange: currentTick >= tickLower && currentTick < tickUpper,
  };
};

// IMPORTANT: Move all hooks inside the component function

const MyPositions: FC<MyPositionsProps> = ({ pool, poolAddress, onSuccess }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  
  // State variables
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);
  const [removePercentage, setRemovePercentage] = useState<number>(100);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [collectingFees, setCollectingFees] = useState<boolean>(false);
  // Add the ethPrice state here
  const [ethPrice, setEthPrice] = useState<number>(2070); // Default fallback price
  const [advStats, setAdvStats] = useState<PoolStats | null>(null);

  // Doradca: statystyki puli z ostatnich 24h (te same wzory co strategia backtestu)
  useEffect(() => {
    if (!publicClient || !poolAddress) return;
    const spacing = TICK_SPACINGS[pool.fee as keyof typeof TICK_SPACINGS];
    fetchRecentSwaps(publicClient, poolAddress as Address, chainId, 24)
      .then((s) => setAdvStats(computeStats(s, chainId, pool.token0.decimals, pool.token1.decimals, pool.fee / 1_000_000, spacing)))
      .catch(() => setAdvStats(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, poolAddress, chainId]);

  // Rekomendacja doradcy dla pozycji
  const adviseFor = (position: Position) => {
    if (!advStats) return null;
    return assessPosition(
      { tickLower: position.tickLower, tickUpper: position.tickUpper, valueUsd: parseFloat(position.usdValue) || 0 },
      advStats,
      chainId,
      pool.fee,
      pool.fee / 1_000_000,
      pool.token0.decimals,
      pool.token1.decimals
    );
  };

  const adviceLabel: Record<string, string> = {
    IN_RANGE_HOLD: '✅ W zakresie — trzymaj i zbieraj fee',
    REBALANCE: '🔄 Poza zakresem — rebalans OPŁACALNY',
    WAIT_NOT_PROFITABLE: '⏳ Poza zakresem — rebalans się nie zwróci, czekaj',
  };

  // Fetch real-time ETH price
  const fetchEthPrice = useCallback(async () => {
    try {
      // Use CoinGecko API to get the current ETH price
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      
      if (data && data.ethereum && data.ethereum.usd) {
        const currentPrice = Number(data.ethereum.usd);
        console.log('Fetched current ETH price:', currentPrice);
        setEthPrice(currentPrice);
        return currentPrice;
      } else {
        console.warn('Could not fetch ETH price, using default:', ethPrice);
        return ethPrice;
      }
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      return ethPrice; // Use the default price if fetch fails
    }
  }, [ethPrice]);

  // Update ETH price on component mount
  useEffect(() => {
    fetchEthPrice();
    // Optionally set up a refresh interval (e.g., every 5 minutes)
    const intervalId = setInterval(fetchEthPrice, 5 * 60 * 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchEthPrice]);

  console.log('Using current ETH price for valuation:', ethPrice);

  // Calculate USD value of position
  const calculatePositionUSDValue = (
    amount0: number, 
    amount1: number,
    token0IsStable: boolean,
    token1IsStable: boolean,
    wethPriceUSD: number = ethPrice // Use the dynamic ethPrice as default
  ) => {
    let usdValue = 0;
    
    if (token0IsStable) {
      // If token0 is a stablecoin (e.g., USDC), it's already in USD
      usdValue = amount0 + (amount1 * wethPriceUSD);
    } else if (token1IsStable) {
      // If token1 is a stablecoin
      usdValue = amount1 + (amount0 * wethPriceUSD);
    } else {
      // If neither is a stablecoin (rare case), estimate
      usdValue = (amount0 * wethPriceUSD) + amount1;
    }
    
    return usdValue;
  };

  // Calculate the USD value of a position (using calculated token amounts)
  const calculatePositionValue = (position: Position, poolData: Pool) => {
    // Get token amounts
    const amount0Value = parseFloat(position.amount0);
    const amount1Value = parseFloat(position.amount1);
    
    if (isNaN(amount0Value) || isNaN(amount1Value)) {
      console.warn('Invalid token amounts for position:', position.id);
      return '0.00';
    }
    
    // Determine token types
    const isToken0Stable = position.token0.includes('USD') || position.token0.includes('DAI');
    const isToken1Stable = position.token1.includes('USD') || position.token1.includes('DAI');
    const isToken0ETH = position.token0.includes('ETH') || position.token0.includes('WETH');
    const isToken1ETH = position.token1.includes('ETH') || position.token1.includes('WETH');
    
    console.log('Using ethPrice for valuation:', ethPrice);
    
    // Calculate total USD value
    let usdValue = 0;
    
    if (isToken0Stable) {
      // Token0 is a stablecoin (e.g., USDC)
      usdValue = amount0Value + (amount1Value * ethPrice);
    } else if (isToken1Stable) {
      // Token1 is a stablecoin
      usdValue = amount1Value + (amount0Value * ethPrice);
    } else if (isToken0ETH) {
      // Token0 is ETH/WETH but token1 is not a stablecoin
      usdValue = (amount0Value * ethPrice) + (amount1Value * 1); // Simplified valuation for token1
    } else if (isToken1ETH) {
      // Token1 is ETH/WETH but token0 is not a stablecoin
      usdValue = (amount1Value * ethPrice) + (amount0Value * 1); // Simplified valuation for token0
    } else {
      // Neither token is a stablecoin or ETH - use a very simplified approach
      usdValue = (amount0Value + amount1Value) * 10; // Just a placeholder estimate
    }
    
    // Sanity check for unreasonable values
    if (usdValue > 1000000 || isNaN(usdValue) || usdValue < 0) {
      console.warn('Calculated value looks unreasonable, using fallback:', usdValue);
      
      // For other positions, use a reasonable estimate based on token amounts
      if (amount0Value > 0 || amount1Value > 0) {
        // If we have USDC in the pair, base the estimate primarily on that
        if (isToken0Stable) {
          return (amount0Value + (amount1Value * ethPrice)).toFixed(2);
        } else if (isToken1Stable) {
          return (amount1Value + (amount0Value * ethPrice)).toFixed(2);
        } else {
          return ((amount0Value + amount1Value) * 10).toFixed(2);
        }
      } else {
        return '0.00';
      }
    }
    
    return usdValue.toFixed(2);
  };

  // Price range from ticks — exact math, oriented as USD-per-ETH for stable/ETH pairs
  const formatPriceRange = (tickLower: number, tickUpper: number, poolData: Pool) => {
    try {
      const dec0 = poolData.token0.decimals;
      const dec1 = poolData.token1.decimals;
      const sym0 = poolData.token0.symbol || 'Token0';
      const sym1 = poolData.token1.symbol || 'Token1';
      const isToken0Stable = sym0.includes('USD') || sym0.includes('DAI');
      const isToken1Stable = sym1.includes('USD') || sym1.includes('DAI');

      // token1 per token0, decimal-adjusted
      const lowerP = tickToPrice(tickLower, dec0, dec1);
      const upperP = tickToPrice(tickUpper, dec0, dec1);

      const fmtUsd = (v: number) =>
        '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      if (isToken0Stable && !isToken1Stable) {
        // price is e.g. WETH per USDC -> invert for USD per ETH (bounds swap)
        return `${fmtUsd(1 / upperP)} - ${fmtUsd(1 / lowerP)}`;
      }
      if (isToken1Stable && !isToken0Stable) {
        // price is already USD per token0
        return `${fmtUsd(lowerP)} - ${fmtUsd(upperP)}`;
      }

      const fmt = (v: number) =>
        v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
      return `${fmt(lowerP)} - ${fmt(upperP)} ${sym1} per ${sym0}`;
    } catch (error) {
      console.error('Error formatting price range:', error);
      return `Ticks: [${tickLower}, ${tickUpper}]`;
    }
  };

  // Visual range bar data: min/max/current price in the same orientation as
  // formatPriceRange (USD-per-ETH for stable/ETH pairs), plus marker position
  // 0-100% clamped (values outside the range sit flush against the edge).
  const getRangeBarData = (position: Position, poolData: Pool) => {
    try {
      const dec0 = poolData.token0.decimals;
      const dec1 = poolData.token1.decimals;
      const sym0 = poolData.token0.symbol || '';
      const sym1 = poolData.token1.symbol || '';
      const isToken0Stable = sym0.includes('USD') || sym0.includes('DAI');
      const isToken1Stable = sym1.includes('USD') || sym1.includes('DAI');

      const lowerP = tickToPrice(position.tickLower, dec0, dec1);
      const upperP = tickToPrice(position.tickUpper, dec0, dec1);
      const curP = tickToPrice(poolData.tickCurrent, dec0, dec1);

      let lo: number, hi: number, cur: number;
      if (isToken0Stable && !isToken1Stable) {
        // inverting flips ordering: bounds swap
        lo = 1 / upperP;
        hi = 1 / lowerP;
        cur = 1 / curP;
      } else {
        lo = lowerP;
        hi = upperP;
        cur = curP;
      }

      const span = hi - lo;
      const rawPct = span > 0 ? ((cur - lo) / span) * 100 : 50;
      const pct = Math.min(100, Math.max(0, rawPct));

      return { lo, hi, cur, pct };
    } catch (error) {
      console.error('Error computing range bar data:', error);
      return null;
    }
  };

  const fmtRangeBarValue = (v: number): string =>
    v >= 1000
      ? v.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : v >= 1
      ? v.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : v.toPrecision(4);

  // Fee percentages, USDC/WETH: both derived from the same ethPrice so they
  // always sum to 100% after rounding (round only the final displayed value).
  const feePercentages = (position: Position): { pct0: number; pct1: number } => {
    const fee0 = parseFloat(position.unclaimedFees0);
    const fee1 = parseFloat(position.unclaimedFees1);
    const isToken0Stable = position.token0.includes('USD') || position.token0.includes('DAI');
    const isToken1Stable = position.token1.includes('USD') || position.token1.includes('DAI');

    let usd0: number;
    let usd1: number;
    if (isToken0Stable) {
      usd0 = fee0;
      usd1 = fee1 * ethPrice;
    } else if (isToken1Stable) {
      usd1 = fee1;
      usd0 = fee0 * ethPrice;
    } else {
      usd0 = fee0 * ethPrice;
      usd1 = fee1;
    }

    const total = usd0 + usd1;
    if (!isFinite(total) || total <= 0) return { pct0: 0, pct1: 0 };

    const pct0 = Number(((usd0 / total) * 100).toFixed(1));
    const pct1 = Number((100 - pct0).toFixed(1));
    return { pct0, pct1 };
  };

  // Load positions when component mounts or pool changes
  useEffect(() => {
    if (address && pool) {
      fetchPositions();
    }
  }, [address, pool, poolAddress]);

  // Fetch user positions for the current pool
  const fetchPositions = async () => {
    if (!address || !publicClient || !pool) return;
    
    setLoadingPositions(true);
    setError(null);
    
    try {
      // Derive USD/ETH from the pool's own sqrtPrice when this is a stable/ETH
      // pair — exact and consistent with what Uniswap shows for this pool.
      // IMPORTANT: use the local value everywhere below (setEthPrice is async,
      // reading the state in the same pass would use a stale price).
      let poolEthUsd = ethPrice;
      {
        const sym0 = pool.token0.symbol || '';
        const sym1 = pool.token1.symbol || '';
        const t0Stable = sym0.includes('USD') || sym0.includes('DAI');
        const t1Stable = sym1.includes('USD') || sym1.includes('DAI');
        const t0Eth = sym0.includes('ETH');
        const t1Eth = sym1.includes('ETH');
        if ((t0Stable && t1Eth) || (t1Stable && t0Eth)) {
          const derived = humanPriceQuotePerBase(
            BigInt(pool.sqrtRatioX96.toString()),
            pool.token0.decimals,
            pool.token1.decimals,
            t0Eth
          );
          if (isFinite(derived) && derived > 0) {
            poolEthUsd = derived;
            setEthPrice(derived);
          }
        }
      }
      // Address of the Uniswap V3 NonfungiblePositionManager (chain-aware)
      const positionManagerAddress = (POSITION_MANAGER_ADDRESSES[chainId] ||
        POSITION_MANAGER_ADDRESSES[1]) as Address;
      
      // Get the total number of positions owned by the user
      const balanceOf = await publicClient.readContract({
        address: positionManagerAddress as Address,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'owner', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'balanceOf',
        args: [address]
      });
      
      const positionCount = Number(balanceOf);
      
      // If user has no positions, return early
      if (positionCount === 0) {
        setPositions([]);
        setLoadingPositions(false);
        return;
      }
      
      // Prepare to fetch position IDs
      const tokenOfOwnerByIndex = async (index: number) => {
        return publicClient.readContract({
          address: positionManagerAddress as Address,
          abi: [
            {
              name: 'tokenOfOwnerByIndex',
              type: 'function',
              stateMutability: 'view',
              inputs: [
                { name: 'owner', type: 'address' },
                { name: 'index', type: 'uint256' }
              ],
              outputs: [{ name: '', type: 'uint256' }]
            }
          ],
          functionName: 'tokenOfOwnerByIndex',
          args: [address, BigInt(index)]
        });
      };
      
      // Get all token IDs owned by the user
      const positionIdPromises = [];
      for (let i = 0; i < positionCount; i++) {
        positionIdPromises.push(tokenOfOwnerByIndex(i));
      }
      
      const positionIds = await Promise.all(positionIdPromises);
      
      // Prepare to fetch position details
      const getPositionDetails = async (tokenId: bigint) => {
        return publicClient.readContract({
          address: positionManagerAddress as Address,
          abi: [
            {
              name: 'positions',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'tokenId', type: 'uint256' }],
              outputs: [
                { name: 'nonce', type: 'uint96' },
                { name: 'operator', type: 'address' },
                { name: 'token0', type: 'address' },
                { name: 'token1', type: 'address' },
                { name: 'fee', type: 'uint24' },
                { name: 'tickLower', type: 'int24' },
                { name: 'tickUpper', type: 'int24' },
                { name: 'liquidity', type: 'uint128' },
                { name: 'feeGrowthInside0LastX128', type: 'uint256' },
                { name: 'feeGrowthInside1LastX128', type: 'uint256' },
                { name: 'tokensOwed0', type: 'uint128' },
                { name: 'tokensOwed1', type: 'uint128' }
              ]
            }
          ],
          functionName: 'positions',
          args: [tokenId]
        });
      };
      
      // Fetch details for all positions
      const positionDetailsPromises = [];
      for (const id of positionIds) {
        positionDetailsPromises.push(getPositionDetails(BigInt(id.toString())));
      }
      
      const positionDetailsResults = await Promise.all(positionDetailsPromises);
      
      // Filter positions that belong to the current pool and format them
      const userPositions = positionDetailsResults
        .map((details, index) => {
          const [
            nonce,
            operator,
            token0Address,
            token1Address,
            fee,
            tickLower,
            tickUpper,
            liquidity,
            feeGrowthInside0LastX128,
            feeGrowthInside1LastX128,
            tokensOwed0,
            tokensOwed1
          ] = details as unknown as [
            bigint, string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint
          ];
          
          // Check if this position is for the current pool
          const poolMatchesPosition = 
            pool.token0.address.toLowerCase() === token0Address.toLowerCase() &&
            pool.token1.address.toLowerCase() === token1Address.toLowerCase() &&
            pool.fee === Number(fee);
          
          if (!poolMatchesPosition) return null;
          
          // Only include positions that have liquidity
          if (liquidity <= BigInt(0)) return null;
          
          const tokenId = positionIds[index].toString();
          
          // Raw liquidity value
          const rawLiquidity = liquidity.toString();
          
          // Raw ticks
          const tickLowerRaw = Number(tickLower);
          const tickUpperRaw = Number(tickUpper);
          const currentTickRaw = pool.tickCurrent;
          
          // Token information
          const token0Symbol = pool.token0.symbol || 'Token0';
          const token1Symbol = pool.token1.symbol || 'Token1';
          const token0Decimals = pool.token0.decimals;
          const token1Decimals = pool.token1.decimals;
          
          // Log raw data for debugging
          console.log('Raw position data:', {
            tokenId,
            rawLiquidity,
            tickLowerRaw, 
            tickUpperRaw,
            currentTickRaw,
            token0: { symbol: token0Symbol, decimals: token0Decimals },
            token1: { symbol: token1Symbol, decimals: token1Decimals },
          });
          
          // Calculate actual token amounts using Uniswap V3 math
          try {
            const {
              amount0: calculatedAmount0,
              amount1: calculatedAmount1,
              inRange
            } = positionTokenAmounts(
              rawLiquidity,
              tickLowerRaw,
              tickUpperRaw,
              BigInt(pool.sqrtRatioX96.toString()),
              currentTickRaw,
              token0Decimals,
              token1Decimals
            );
            
            // Determine if the tokens are stablecoins
            const token0IsStable = token0Symbol.includes('USD') || token0Symbol.includes('DAI');
            const token1IsStable = token1Symbol.includes('USD') || token1Symbol.includes('DAI');
            
            // Calculate USD value of the position
            const wethPriceUSD = poolEthUsd; // one consistent pool-derived price
            const usdValue = calculatePositionUSDValue(
              calculatedAmount0,
              calculatedAmount1,
              token0IsStable,
              token1IsStable,
              wethPriceUSD
            );
            
            console.log('Calculated position values:', {
              tokenId,
              calculatedAmount0,
              calculatedAmount1,
              inRange,
              usdValue
            });
            
            // Format the token amounts for display
            const amount0 = calculatedAmount0.toFixed(6);
            const amount1 = calculatedAmount1.toFixed(6);
            
            return {
              id: tokenId,
              liquidity: rawLiquidity,
              token0: token0Symbol,
              token1: token1Symbol,
              tickLower: tickLowerRaw,
              tickUpper: tickUpperRaw,
              amount0,
              amount1,
              usdValue: usdValue.toFixed(2),
              inRange
            };
          } catch (error) {
            console.error('Error calculating position values:', error);
            
            // Fallback to simple display
            return {
              id: tokenId,
              liquidity: rawLiquidity,
              token0: token0Symbol,
              token1: token1Symbol,
              tickLower: tickLowerRaw,
              tickUpper: tickUpperRaw,
              amount0: `Error calculating`,
              amount1: `Error calculating`,
              usdValue: '0.00',
              inRange: currentTickRaw >= tickLowerRaw && currentTickRaw <= tickUpperRaw
            };
          }
        })
        .filter(Boolean) as Position[];
      
      // Format the position data with fees
      const formattedPositions = await Promise.all(userPositions.map(async (position) => {
        // Fetch unclaimed fees for this position
        const unclaimedFees = await fetchUnclaimedFees(position.id);
        
        // Calculate USD value of unclaimed fees
        const isToken0Stable = position.token0.includes('USD') || position.token0.includes('DAI');
        const isToken1Stable = position.token1.includes('USD') || position.token1.includes('DAI');
        
        // Use our helper function to calculate the fees USD value
        const feesUSDValue = calculateFeesUSDValue(
          unclaimedFees.token0,
          unclaimedFees.token1,
          isToken0Stable,
          isToken1Stable,
          poolEthUsd
        );
        
        return {
          ...position,
          unclaimedFees0: unclaimedFees.token0,
          unclaimedFees1: unclaimedFees.token1,
          unclaimedFeesUSD: feesUSDValue
        };
      }));
      
      setPositions(formattedPositions);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError('Failed to load positions: ' + (err instanceof Error ? err.message : String(err)));
      
      // Fallback to mock data for demo purposes if fetching fails
      if (process.env.NODE_ENV !== 'production') {
        const mockPositions: Position[] = [
          {
            id: '1234',
            liquidity: '1000000000000000000',
            token0: pool.token0.symbol || 'Unknown',
            token1: pool.token1.symbol || 'Unknown',
            tickLower: pool.tickCurrent - 1000,
            tickUpper: pool.tickCurrent + 1000,
            amount0: '0.5',
            amount1: '1000',
            usdValue: '0.00',
            inRange: false,
            unclaimedFees0: '0',
            unclaimedFees1: '0',
            unclaimedFeesUSD: '0.00000'
          },
          {
            id: '5678',
            liquidity: '500000000000000000',
            token0: pool.token0.symbol || 'Unknown',
            token1: pool.token1.symbol || 'Unknown',
            tickLower: pool.tickCurrent - 500,
            tickUpper: pool.tickCurrent + 500,
            amount0: '0.25',
            amount1: '500',
            usdValue: '0.00',
            inRange: false,
            unclaimedFees0: '0',
            unclaimedFees1: '0',
            unclaimedFeesUSD: '0.00000'
          }
        ];
        
        setPositions(mockPositions);
        setError('Using mock data: ' + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      setLoadingPositions(false);
    }
  };

  // Handle opening the remove liquidity modal
  const openRemoveLiquidityModal = (position: Position) => {
    setSelectedPosition(position);
    setRemovePercentage(100); // Default to removing all liquidity
  };

  // Calculate amounts to receive based on percentage
  const calculateRemovalAmounts = (position: Position, percentage: number) => {
    const amount0Value = parseFloat(position.amount0);
    const amount1Value = parseFloat(position.amount1);
    
    // Sanity check - if values are unreasonably large, use reasonable defaults
    const safeAmount0 = amount0Value > 1000000 ? 50 : amount0Value;
    const safeAmount1 = amount1Value > 1000000 ? 0.02 : amount1Value;
    
    const amount0ToReceive = safeAmount0 * (percentage / 100);
    const amount1ToReceive = safeAmount1 * (percentage / 100);
    
    return {
      amount0: amount0ToReceive.toFixed(6),
      amount1: amount1ToReceive.toFixed(6)
    };
  };

  // Handle removing liquidity from a specific position
  const handleRemoveLiquidityFromPosition = async () => {
    if (!walletClient || !address || !publicClient || !selectedPosition) {
      setError('Wallet not connected or no position selected');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Calculate liquidity to remove based on percentage
      const liquidityToRemove = BigInt(selectedPosition.liquidity) * BigInt(removePercentage) / BigInt(100);
      
      // Import the needed function when using
      const { prepareRemoveLiquidityTransaction } = await import('../../utils/liquidityManagement');
      
      // Special handling for USDC/WETH pairs
      const isUsdcWethPair = 
        (pool.token0.symbol?.includes('USDC') && pool.token1.symbol?.includes('ETH')) ||
        (pool.token1.symbol?.includes('USDC') && pool.token0.symbol?.includes('ETH'));
      
      // Use higher slippage for volatile pairs
      const effectiveSlippage = isUsdcWethPair ? Math.max(slippageTolerance, 2) : slippageTolerance;
      
      // Prepare transaction using the utility function from liquidityManagement.ts
      const txData = await prepareRemoveLiquidityTransaction(
        selectedPosition.id,
        liquidityToRemove.toString(),
        effectiveSlippage, // Use the user-specified slippage tolerance or default
        1800, // 30 minutes deadline
        chainId,
        // Pass position details to calculate min amounts
        {
          pool,
          tickLower: selectedPosition.tickLower,
          tickUpper: selectedPosition.tickUpper
        }
      );
      
      // Send transaction
      const hash = await walletClient.sendTransaction({
        to: txData.to,
        data: txData.data,
        account: address,
        value: BigInt(txData.value || '0')
      });
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        setSuccess(`Successfully removed ${removePercentage}% liquidity from position ${selectedPosition.id}`);
        addTransaction(address, hash, chainId, `Remove ${removePercentage}% liquidity #${selectedPosition.id}`);
        // Refresh positions list
        fetchPositions();
        // Notify parent of success
        onSuccess();
        // Close the modal
        setSelectedPosition(null);
      } else {
        setError('Transaction failed');
      }
    } catch (err) {
      console.error('Error removing liquidity:', err);
      setError('Failed to remove liquidity: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Check if position is in range
  const isPositionInRange = (tickLower: number, tickUpper: number) => {
    const currentTick = pool.tickCurrent;
    return currentTick >= tickLower && currentTick <= tickUpper;
  };

  // Real-time uncollected fees: static call to collect() with max amounts —
  // the same method the Uniswap interface uses. tokensOwed in the struct is
  // stale (only updated on interactions), so a static collect is required.
  const fetchUnclaimedFees = async (tokenId: string) => {
    if (!publicClient || !address) return { token0: '0', token1: '0' };

    const positionManagerAddress = (POSITION_MANAGER_ADDRESSES[chainId] ||
      POSITION_MANAGER_ADDRESSES[1]) as Address;

    try {
      const { result } = await publicClient.simulateContract({
        address: positionManagerAddress,
        abi: [
          {
            name: 'collect',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              {
                name: 'params',
                type: 'tuple',
                components: [
                  { name: 'tokenId', type: 'uint256' },
                  { name: 'recipient', type: 'address' },
                  { name: 'amount0Max', type: 'uint128' },
                  { name: 'amount1Max', type: 'uint128' },
                ],
              },
            ],
            outputs: [
              { name: 'amount0', type: 'uint256' },
              { name: 'amount1', type: 'uint256' },
            ],
          },
        ] as const,
        functionName: 'collect',
        args: [
          {
            tokenId: BigInt(tokenId),
            recipient: address,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128,
          },
        ],
        account: address,
      });

      const [owed0, owed1] = result as unknown as [bigint, bigint];
      return {
        token0: formatUnits(owed0, pool.token0.decimals),
        token1: formatUnits(owed1, pool.token1.decimals),
      };
    } catch (error) {
      console.error('Error fetching unclaimed fees (static collect):', error);
      return { token0: '0', token1: '0' };
    }
  };

  // Calculate USD value of the position's uncollected fees
  const calculateFeesUSDValue = (fees0: string, fees1: string, isToken0Stable: boolean, isToken1Stable: boolean, ethUsd: number = ethPrice): string => {
    const fee0 = parseFloat(fees0);
    const fee1 = parseFloat(fees1);
    
    let feesUSDValue = 0;
    
    if (isToken0Stable) {
      // Token0 is a stablecoin (e.g., USDC)
      feesUSDValue = fee0 + (fee1 * ethUsd);
    } else if (isToken1Stable) {
      // Token1 is a stablecoin
      feesUSDValue = fee1 + (fee0 * ethUsd);
    } else {
      // If neither token is a stablecoin, make a reasonable estimate
      feesUSDValue = (fee0 * ethUsd) + fee1;
    }
    
    // Format to display with 5 decimal places but convert to a fixed string with 2 for larger values
    return feesUSDValue > 0.1 ? feesUSDValue.toFixed(2) : feesUSDValue.toFixed(5);
  };

  // Add function to collect fees from a position
  const collectFeesFromPosition = async (position: Position) => {
    if (!walletClient || !address || !publicClient) {
      setError('Wallet not connected');
      return;
    }
    
    setCollectingFees(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Address of the Uniswap V3 NonfungiblePositionManager (chain-aware)
      const positionManagerAddress = (POSITION_MANAGER_ADDRESSES[chainId] ||
        POSITION_MANAGER_ADDRESSES[1]) as Address;
      
      // Create collect params
      const params = {
        tokenId: BigInt(position.id),
        recipient: address,
        amount0Max: BigInt('0xffffffffffffffffffffffffffffffff'), // max uint128
        amount1Max: BigInt('0xffffffffffffffffffffffffffffffff')  // max uint128
      };
      
      // Encode the calldata for collect
      const collectAbi = {
        name: 'collect',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          {
            name: 'params',
            type: 'tuple',
            components: [
              { name: 'tokenId', type: 'uint256' },
              { name: 'recipient', type: 'address' },
              { name: 'amount0Max', type: 'uint128' },
              { name: 'amount1Max', type: 'uint128' }
            ]
          }
        ],
        outputs: [
          { name: 'amount0', type: 'uint256' },
          { name: 'amount1', type: 'uint256' }
        ]
      };
      
      // Send transaction
      const hash = await walletClient.sendTransaction({
        to: positionManagerAddress as Address,
        data: encodeFunctionData({
          abi: [collectAbi],
          functionName: 'collect',
          args: [params]
        }),
        account: address
      });
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        setSuccess(`Successfully collected fees from position ${position.id}`);
        addTransaction(address, hash, chainId, `Collect fees #${position.id}`);
        // Refresh positions list to update the UI
        fetchPositions();
        // Notify parent of success
        onSuccess();
      } else {
        setError('Transaction failed');
      }
    } catch (err) {
      console.error('Error collecting fees:', err);
      setError('Failed to collect fees: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCollectingFees(false);
    }
  };

  return (
    <div className="positions-list">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {loadingPositions ? (
        <div className="loading">Loading positions...</div>
      ) : positions.length === 0 ? (
        <div className="no-positions">
          No positions found for this pool
        </div>
      ) : (
        <>
          <div className="positions-count">
            Found {positions.length} position{positions.length !== 1 ? 's' : ''}
          </div>
          
          <div className="positions-grid">
            {positions.map((position) => {
              const inRange = isPositionInRange(position.tickLower, position.tickUpper);
              const hasUnclaimedFees = parseFloat(position.unclaimedFeesUSD) > 0.001;
              
              return (
                <div key={position.id} className={`position-card ${position.inRange ? 'in-range' : 'out-of-range'}`}>
                  <div className="position-header">
                    <span className="position-id">Position #{position.id}</span>
                    <span className={`position-status ${position.inRange ? 'active' : 'inactive'}`}>
                      {position.inRange ? 'In Range' : 'Out of Range'}
                    </span>
                  </div>
                  
                  <div className="position-details">
                    <div className="position-range">
                      <span className="label">Price Range:</span>
                      <span className="value">{formatPriceRange(position.tickLower, position.tickUpper, pool)}</span>
                    </div>

                    {(() => {
                      const bar = getRangeBarData(position, pool);
                      if (!bar) return null;
                      return (
                        <div className="range-bar-wrap">
                          <div className={`range-bar ${position.inRange ? 'in-range' : 'out-of-range'}`}>
                            <div
                              className="range-bar-marker"
                              style={{ left: `${bar.pct}%` }}
                              title={`Aktualna cena: ${fmtRangeBarValue(bar.cur)}`}
                            />
                          </div>
                          <div className="range-bar-labels">
                            <span>{fmtRangeBarValue(bar.lo)}</span>
                            <span>{fmtRangeBarValue(bar.hi)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="position-value">
                      <span className="label">Total Value:</span>
                      <span className="value">${calculatePositionValue(position, pool)}</span>
                    </div>
                    
                    <div className="position-amounts">
                      <div className="token-amount">
                        <span className="label">{position.token0}:</span>
                        <span className="value">{
                          parseFloat(position.amount0) > 0.01 
                            ? parseFloat(position.amount0).toFixed(2) 
                            : parseFloat(position.amount0).toFixed(6)
                        }</span>
                      </div>
                      <div className="token-amount">
                        <span className="label">{position.token1}:</span>
                        <span className="value">{
                          parseFloat(position.amount1) > 0.01 
                            ? parseFloat(position.amount1).toFixed(4) 
                            : parseFloat(position.amount1).toFixed(6)
                        }</span>
                      </div>
                    </div>
                    
                    {/* Add uncollected fees section */}
                    <div className="uncollected-fees">
                      <div className="fees-header">
                        <span className="fees-label">Uncollected fees</span>
                        {hasUnclaimedFees && (
                          <button 
                            className="collect-button"
                            onClick={() => collectFeesFromPosition(position)}
                            disabled={collectingFees}
                          >
                            {collectingFees ? 'Collecting...' : 'Collect fees'}
                          </button>
                        )}
                      </div>
                      
                      <div className="fees-value">
                        <span>${position.unclaimedFeesUSD}</span>
                      </div>
                      
                      {(() => {
                        const { pct0, pct1 } = feePercentages(position);
                        return (
                          <div className="fees-tokens">
                            <div className="token-amount">
                              <div className="token-with-value">
                                <span className="label">{position.token0}:</span>
                                <span className="value">
                                  {parseFloat(position.unclaimedFees0) > 0.001
                                    ? parseFloat(position.unclaimedFees0).toFixed(3)
                                    : parseFloat(position.unclaimedFees0).toFixed(6)}
                                </span>
                              </div>
                              <div className="token-percentage">{pct0}%</div>
                            </div>
                            <div className="token-amount">
                              <div className="token-with-value">
                                <span className="label">{position.token1}:</span>
                                <span className="value">
                                  {parseFloat(position.unclaimedFees1) > 0.001
                                    ? parseFloat(position.unclaimedFees1).toFixed(3)
                                    : parseFloat(position.unclaimedFees1).toFixed(6)}
                                </span>
                              </div>
                              <div className="token-percentage">{pct1}%</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {(() => {
                      const adv = adviseFor(position);
                      if (!adv) return null;
                      const ethT0 = (pool.token0.symbol || '').includes('ETH');
                      const usdAt = (t: number) => {
                        const raw = Math.pow(1.0001, t) * Math.pow(10, pool.token0.decimals - pool.token1.decimals);
                        return (ethT0 ? raw : 1 / raw).toLocaleString('en-US', { maximumFractionDigits: 0 });
                      };
                      const lo = ethT0 ? adv.suggestion.tickLower : adv.suggestion.tickUpper;
                      const hi = ethT0 ? adv.suggestion.tickUpper : adv.suggestion.tickLower;
                      return (
                        <div className={`advisor-line advisor-${adv.action.toLowerCase()}`}>
                          <div>{adviceLabel[adv.action]}</div>
                          <div className="advisor-detail">
                            sugerowany zakres: ${usdAt(lo)}–${usdAt(hi)} (±{adv.suggestion.widthPct.toFixed(1)}%)
                            {adv.paybackDays !== null && isFinite(adv.paybackDays) && (
                              <> · koszt ${adv.costUsd.toFixed(2)} zwróci się z fee w ~{adv.paybackDays.toFixed(1)} dnia</>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="position-actions">
                      <button 
                        className="primary-button"
                        onClick={() => openRemoveLiquidityModal(position)}
                      >
                        Remove Liquidity
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Remove Liquidity Modal */}
          {selectedPosition && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>Remove Liquidity</h3>
                  <button className="close-button" onClick={() => setSelectedPosition(null)}>×</button>
                </div>
                
                <div className="modal-body">
                  <div className="position-info">
                    <p>Position #{selectedPosition.id}</p>
                    <p>Range: {formatPriceRange(selectedPosition.tickLower, selectedPosition.tickUpper, pool)}</p>
                  </div>
                  
                  <div className="remove-percentage">
                    <label htmlFor="remove-percentage">Percentage to remove:</label>
                    <div className="percentage-slider-container">
                      <input 
                        id="remove-percentage"
                        type="range" 
                        min="1" 
                        max="100" 
                        value={removePercentage} 
                        onChange={(e) => setRemovePercentage(parseInt(e.target.value))}
                      />
                      <span>{removePercentage}%</span>
                    </div>
                  </div>
                  
                  <div className="slippage-settings">
                    <label htmlFor="slippage-tolerance">Slippage Tolerance:</label>
                    <div className="slippage-input-container">
                      <input 
                        id="slippage-tolerance"
                        type="number" 
                        min="0.1" 
                        max="10" 
                        step="0.1" 
                        value={slippageTolerance} 
                        onChange={(e) => setSlippageTolerance(parseFloat(e.target.value))}
                      />
                      <span>%</span>
                    </div>
                  </div>
                  
                  <div className="expected-receive">
                    <h4>Expected to receive:</h4>
                    <div className="estimated-value-usd">
                      <span>Estimated value: <strong>${(parseFloat(calculatePositionValue(selectedPosition, pool)) * removePercentage / 100).toFixed(2)}</strong></span>
                    </div>
                    <div className="token-amount">
                      <span>
                        {(parseFloat(selectedPosition.amount0) * removePercentage / 100).toFixed(
                          parseFloat(selectedPosition.amount0) > 0.01 ? 2 : 6
                        )} {selectedPosition.token0}
                      </span>
                    </div>
                    <div className="token-amount">
                      <span>
                        {(parseFloat(selectedPosition.amount1) * removePercentage / 100).toFixed(
                          parseFloat(selectedPosition.amount1) > 0.01 ? 4 : 6
                        )} {selectedPosition.token1}
                      </span>
                    </div>
                    
                    <div className="position-details">
                      <h4>Position Details:</h4>
                      <div className="token-amount">
                        <span>Price Range: {formatPriceRange(selectedPosition.tickLower, selectedPosition.tickUpper, pool)}</span>
                      </div>
                      <div className="token-amount">
                        <span>Status: {selectedPosition.inRange ? 'In Range ✅' : 'Out of Range ❌'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="modal-actions">
                    <button 
                      className="secondary-button"
                      onClick={() => setSelectedPosition(null)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="primary-button"
                      onClick={handleRemoveLiquidityFromPosition}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Remove Liquidity'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyPositions; 