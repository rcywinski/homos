import React, { FC, useState, useEffect, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId, useBalance } from 'wagmi';
import { erc20Abi } from 'abitype/abis';
import { Pool } from '@uniswap/v3-sdk';
import { formatEther, Address, formatUnits, parseUnits, getContract, encodeFunctionData } from 'viem';
import { 
  tickToPrice, 
  priceToTick, 
  getValidTick, 
  createPosition,
  prepareAddLiquidityTransaction,
  TickMath,
  POSITION_MANAGER_ADDRESSES
} from '../../utils/liquidityManagement';
import { NETWORKS } from '../../utils/uniswap';
import '../../styles/liquidityManager.css';
import PriceInputs from './components/PriceInputs';
import GasEstimateDisplay from './components/GasEstimateDisplay';
import TokenInputs from './components/TokenInputs';
import { formatBalance, formatTokenAmount } from '../../utils/formatters';

interface AddLiquidityProps {
  pool: Pool;
  onSuccess: () => void;
}

const AddLiquidity: FC<AddLiquidityProps> = ({ pool, onSuccess }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  
  // Get native ETH balance
  const { data: ethBalance } = useBalance({
    address,
  });
  
  // Get token balances
  const { data: token0Balance } = useBalance({
    address,
    token: pool?.token0?.address as Address,
  });
  
  const { data: token1Balance } = useBalance({
    address,
    token: pool?.token1?.address as Address,
  });
  
  // State variables
  const [amount0, setAmount0] = useState<string>('');
  const [amount1, setAmount1] = useState<string>('');
  const [lowerTick, setLowerTick] = useState<number | null>(null);
  const [upperTick, setUpperTick] = useState<number | null>(null);
  const [lowerPrice, setLowerPrice] = useState<string>('');
  const [upperPrice, setUpperPrice] = useState<string>('');
  const [priceRange, setPriceRange] = useState<string>('custom'); // 'full', 'narrow', 'custom'
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Gas estimation state
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [gasPriceGwei, setGasPriceGwei] = useState<string | null>(null);

  // Debugging state
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

  // Track if inputs are actively being changed
  const [isChangingInput, setIsChangingInput] = useState<boolean>(false);
  const inputDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Add new state variables for token approvals
  const [needsApproval, setNeedsApproval] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [token0NeedsApproval, setToken0NeedsApproval] = useState<boolean>(false);
  const [token1NeedsApproval, setToken1NeedsApproval] = useState<boolean>(false);

  // Initialize price range based on current pool price
  useEffect(() => {
    if (pool) {
      // Log pool details for debugging
      console.log('Pool initialization:', {
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
        tickSpacing: pool.tickSpacing,
        sqrtPriceX96: pool.sqrtRatioX96.toString()
      });
      
      const currentTick = pool.tickCurrent;
      const tickSpacing = pool.tickSpacing;
      
      // Calculate the current price from the current tick
      const currentPrice = tickToPrice(
        currentTick, 
        pool.token0.decimals, 
        pool.token1.decimals
      );
      
      // Initialize based on selected price range (default is 'custom')
      if (priceRange === 'custom') {
        // Custom range uses ±30% by default
        const lowerPriceVal = currentPrice * 0.7; // 30% lower
        const upperPriceVal = currentPrice * 1.3; // 30% higher
        
        // Convert prices to ticks
        let lowerTickVal = Math.floor(priceToTick(
          lowerPriceVal,
          pool.token0.decimals,
          pool.token1.decimals
        ));
        
        let upperTickVal = Math.ceil(priceToTick(
          upperPriceVal,
          pool.token0.decimals,
          pool.token1.decimals
        ));
        
        // Ensure ticks are valid for the pool's tick spacing
        lowerTickVal = getValidTick(lowerTickVal, tickSpacing);
        upperTickVal = getValidTick(upperTickVal, tickSpacing);
        
        setLowerTick(lowerTickVal);
        setUpperTick(upperTickVal);
        
        // Format prices for display
        setLowerPrice(lowerPriceVal.toFixed(6));
        setUpperPrice(upperPriceVal.toFixed(6));
      } else if (priceRange === 'narrow') {
        // Narrow range uses ±5%
        const lowerPriceVal = currentPrice * 0.95; // 5% lower
        const upperPriceVal = currentPrice * 1.05; // 5% higher
        
        // Convert prices to ticks
        let lowerTickVal = Math.floor(priceToTick(
          lowerPriceVal,
          pool.token0.decimals,
          pool.token1.decimals
        ));
        
        let upperTickVal = Math.ceil(priceToTick(
          upperPriceVal,
          pool.token0.decimals,
          pool.token1.decimals
        ));
        
        // Ensure ticks are valid for the pool's tick spacing
        lowerTickVal = getValidTick(lowerTickVal, tickSpacing);
        upperTickVal = getValidTick(upperTickVal, tickSpacing);
        
        setLowerTick(lowerTickVal);
        setUpperTick(upperTickVal);
        
        // Format prices for display
        setLowerPrice(lowerPriceVal.toFixed(6));
        setUpperPrice(upperPriceVal.toFixed(6));
      } else if (priceRange === 'full') {
        // Full range uses the min and max tick values for the pool
        setLowerTick(getValidTick(TickMath.MIN_TICK, pool.tickSpacing));
        setUpperTick(getValidTick(TickMath.MAX_TICK, pool.tickSpacing));
        
        // Set price display values
        setLowerPrice('0');
        setUpperPrice('∞');
      }
    }
  }, [pool, priceRange]);

  // Handle price range selection
  const handlePriceRangeChange = (range: 'full' | 'narrow' | 'custom') => {
    setPriceRange(range);
    
    if (!pool) return;
    
    if (range === 'full') {
      // Full range uses the min and max tick values for the pool
      setLowerTick(getValidTick(TickMath.MIN_TICK, pool.tickSpacing));
      setUpperTick(getValidTick(TickMath.MAX_TICK, pool.tickSpacing));
      
      // Set price display values
      setLowerPrice('0');
      setUpperPrice('∞');
    } else if (range === 'narrow') {
      // Calculate the current price from the current tick
      const currentPrice = tickToPrice(pool.tickCurrent, pool.token0.decimals, pool.token1.decimals);
      
      // Calculate price range of ±5% around current price
      const lowerPrice = currentPrice * 0.95; // 5% lower
      const upperPrice = currentPrice * 1.05; // 5% higher
      
      // Convert prices back to ticks
      const lowerPriceTick = priceToTick(lowerPrice, pool.token0.decimals, pool.token1.decimals);
      const upperPriceTick = priceToTick(upperPrice, pool.token0.decimals, pool.token1.decimals);
      
      // Ensure ticks are valid for the pool's tick spacing
      const validLowerTick = getValidTick(Math.floor(lowerPriceTick), pool.tickSpacing);
      const validUpperTick = getValidTick(Math.ceil(upperPriceTick), pool.tickSpacing);
      
      // Set the valid ticks
      setLowerTick(validLowerTick);
      setUpperTick(validUpperTick);
      
      // Update price display values
      setLowerPrice(lowerPrice.toFixed(6));
      setUpperPrice(upperPrice.toFixed(6));
    } else if (range === 'custom') {
      // Calculate the current price from the current tick
      const currentPrice = tickToPrice(pool.tickCurrent, pool.token0.decimals, pool.token1.decimals);
      
      // Calculate price range of ±30% around current price
      const lowerPrice = currentPrice * 0.7; // 30% lower
      const upperPrice = currentPrice * 1.3; // 30% higher
      
      // Convert prices back to ticks
      const lowerPriceTick = priceToTick(lowerPrice, pool.token0.decimals, pool.token1.decimals);
      const upperPriceTick = priceToTick(upperPrice, pool.token0.decimals, pool.token1.decimals);
      
      // Ensure ticks are valid for the pool's tick spacing
      const validLowerTick = getValidTick(Math.floor(lowerPriceTick), pool.tickSpacing);
      const validUpperTick = getValidTick(Math.ceil(upperPriceTick), pool.tickSpacing);
      
      // Set the valid ticks
      setLowerTick(validLowerTick);
      setUpperTick(validUpperTick);
      
      // Update price display values
      setLowerPrice(lowerPrice.toFixed(6));
      setUpperPrice(upperPrice.toFixed(6));
    }
  };

  // Enhanced handlePriceChange function to support slider inputs
  const handlePriceChange = (field: 'lower' | 'upper', value: string | number) => {
    if (!pool) return;
    
    try {
      // Set flag that we're changing inputs to pause gas estimation
      setIsChangingInput(true);
      
      // Clear any existing debounce timer
      if (inputDebounceRef.current) {
        clearTimeout(inputDebounceRef.current);
      }
      
      // Convert value to string if it's a number (from slider)
      const valueStr = typeof value === 'number' ? value.toString() : value;
      
      // Always update the displayed value in the input field
      if (field === 'lower') {
        setLowerPrice(valueStr);
      } else {
        setUpperPrice(valueStr);
      }
      
      // Check if we have a valid number
      if (valueStr && !isNaN(parseFloat(valueStr)) && parseFloat(valueStr) > 0) {
        // Convert price to tick
        const parsedPrice = parseFloat(valueStr);
        
        // Get tick value but handle edge cases that could cause integer overflow
        let rawTick;
        try {
          rawTick = priceToTick(
            parsedPrice,
            pool.token0.decimals,
            pool.token1.decimals
          );
        } catch (err) {
          console.error('Error converting price to tick:', err);
          return;
        }
        
        // Ensure the tick is within valid Uniswap V3 range
        if (rawTick < TickMath.MIN_TICK) {
          setError('Price is too low for Uniswap V3. Please increase your price.');
          return;
        }
        
        if (rawTick > TickMath.MAX_TICK) {
          setError('Price is too high for Uniswap V3. Please decrease your price.');
          return;
        }
        
        // Round the tick to the nearest valid tick based on spacing
        let validTick;
        try {
          const roundedTick = field === 'lower' ? Math.floor(rawTick) : Math.ceil(rawTick);
          validTick = getValidTick(roundedTick, pool.tickSpacing);
        } catch (err) {
          console.error('Error getting valid tick:', err);
          setError('Invalid price. Please use a different value.');
          return;
        }
        
        // Update the state with the valid tick
        if (field === 'lower') {
          setLowerTick(validTick);
        } else {
          setUpperTick(validTick);
        }

        // Calculate new token amounts based on price range only if needed
        if (amount0 && amount1) {
          const currentPrice = tickToPrice(pool.tickCurrent, pool.token0.decimals, pool.token1.decimals);
          let lowerPriceVal = field === 'lower' ? parsedPrice : (lowerTick ? tickToPrice(lowerTick, pool.token0.decimals, pool.token1.decimals) : parseFloat(lowerPrice));
          let upperPriceVal = field === 'upper' ? parsedPrice : (upperTick ? tickToPrice(upperTick, pool.token0.decimals, pool.token1.decimals) : parseFloat(upperPrice));
          
          // Safety check - ensure we have valid prices
          if (isNaN(lowerPriceVal) || lowerPriceVal <= 0) return;
          if (isNaN(upperPriceVal) || upperPriceVal <= 0) return;
          if (lowerPriceVal >= upperPriceVal) return;
          
          // Detect which token is likely ETH/WETH and which is stable
          const token0IsEth = pool.token0.symbol?.includes('ETH') || false;
          const token1IsEth = pool.token1.symbol?.includes('ETH') || false;
          const token0IsStable = pool.token0.symbol?.includes('USD') || false;
          const token1IsStable = pool.token1.symbol?.includes('USD') || false;
          
          // Only recalculate amounts if the price range changes significantly
          if (Math.abs((field === 'lower' ? parsedPrice : parseFloat(lowerPrice)) - currentPrice) / currentPrice > 0.5 ||
              Math.abs((field === 'upper' ? parsedPrice : parseFloat(upperPrice)) - currentPrice) / currentPrice > 0.5) {
            
            // When price range changes significantly, limit the recalculation impact
            if (token0IsStable || token1IsStable) {
              // Preserve the stable token amount and recalculate the non-stable amount
              const stableAmount = token0IsStable ? parseFloat(amount0) : parseFloat(amount1);
              
              try {
                // Calculate liquidity and new amount
                const sqrtLowerPrice = Math.sqrt(lowerPriceVal);
                const sqrtUpperPrice = Math.sqrt(upperPriceVal);
                const sqrtCurrentPrice = Math.sqrt(currentPrice);
                
                // Determine if we're in, above, or below the range
                const inRange = currentPrice >= lowerPriceVal && currentPrice <= upperPriceVal;
                const belowRange = currentPrice < lowerPriceVal;
                const aboveRange = currentPrice > upperPriceVal;
                
                let newAmount;
                
                if (token0IsStable) {
                  // If token0 is stable (USDC), calculate token1 (WETH)
                  if (inRange) {
                    // In range: both tokens needed
                    const liquidity = stableAmount / (sqrtUpperPrice - sqrtCurrentPrice);
                    newAmount = liquidity * (1/sqrtLowerPrice - 1/sqrtCurrentPrice);
                  } else if (belowRange) {
                    // Below range: only token0 needed
                    const liquidity = stableAmount / (sqrtUpperPrice - sqrtLowerPrice);
                    newAmount = 0; // Simplified
                  } else {
                    // Above range: only token1 needed
                    const liquidity = stableAmount / (sqrtLowerPrice - sqrtCurrentPrice);
                    newAmount = liquidity * (1/sqrtLowerPrice - 1/sqrtUpperPrice);
                  }
                  
                  // Apply maximum cap to prevent absurd values
                  const maxAmountScaling = 2.0; // Max 2x the equivalent current value
                  const equivalentAmount = stableAmount / currentPrice;
                  const cappedAmount = Math.min(newAmount, equivalentAmount * maxAmountScaling);
                  
                  // Update amount1 (WETH)
                  if (!isNaN(cappedAmount) && isFinite(cappedAmount) && cappedAmount > 0) {
                    setAmount1(cappedAmount.toFixed(6));
                  }
                } else {
                  // If token1 is stable (USDC), calculate token0 (WETH)
                  if (inRange) {
                    // In range: both tokens needed
                    const liquidity = stableAmount / (sqrtCurrentPrice - sqrtLowerPrice);
                    newAmount = liquidity * (sqrtUpperPrice - sqrtCurrentPrice);
                  } else if (belowRange) {
                    // Below range: only token0 needed
                    const liquidity = stableAmount / (sqrtUpperPrice - sqrtLowerPrice);
                    newAmount = liquidity * (sqrtUpperPrice - sqrtLowerPrice);
                  } else {
                    // Above range: only token1 needed
                    const liquidity = stableAmount / (sqrtUpperPrice - sqrtCurrentPrice);
                    newAmount = 0; // Simplified
                  }
                  
                  // Apply maximum cap to prevent absurd values
                  const maxAmountScaling = 2.0; // Max 2x the equivalent current value
                  const equivalentAmount = stableAmount * currentPrice;
                  const cappedAmount = Math.min(newAmount, equivalentAmount * maxAmountScaling);
                  
                  // Update amount0 (WETH)
                  if (!isNaN(cappedAmount) && isFinite(cappedAmount) && cappedAmount > 0) {
                    setAmount0(cappedAmount.toFixed(6));
                  }
                }
              } catch (err) {
                console.error('Error recalculating amounts:', err);
                // Keep existing amounts on calculation error
              }
            }
          }
        }
        
        // Clear any error
        setError(null);
      }
      
      // When manually changing prices, set to custom range
      if (priceRange !== 'custom') {
        setPriceRange('custom');
      }
      
      // Set a longer debounce timer for gas estimation after price changes
      // This gives time for all state updates to complete
      inputDebounceRef.current = setTimeout(() => {
        setIsChangingInput(false);
      }, 1200); // 1.2s debounce - longer than regular input changes
      
    } catch (error) {
      console.error('Error handling price change:', error);
      setError('Error updating price range. Please try a different value.');
      // Ensure we clear the changing flag even on error
      setTimeout(() => setIsChangingInput(false), 500);
    }
  };

  // Handle token amount changes and calculate the other token amount
  const handleAmountChange = (token: 'token0' | 'token1', value: string) => {
    if (!pool) return;
    
    // Set flag that we're changing inputs to pause gas estimation
    setIsChangingInput(true);
    
    // Clear any existing debounce timer
    if (inputDebounceRef.current) {
      clearTimeout(inputDebounceRef.current);
    }
    
    // Set a new debounce timer to indicate input has stopped changing
    inputDebounceRef.current = setTimeout(() => {
      setIsChangingInput(false);
    }, 800); // 800ms debounce
    
    try {
      // Always update the changed value immediately
      if (token === 'token0') {
        setAmount0(value);
      } else {
        setAmount1(value);
      }
      
      // Only calculate the other value if the input is valid and positive
      if (value && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
        // For WETH/USDC pairs, we need to understand which token is which
        // WETH is typically token0 and USDC is token1
        
        // Check which token is WETH (or ETH)
        const token0IsEth = pool.token0.symbol?.includes('ETH') || false;
        const token1IsEth = pool.token1.symbol?.includes('ETH') || false;
        
        // Check which token is a stablecoin (USDC, USDT, etc.)
        const token0IsStable = pool.token0.symbol?.includes('USD') || false;
        const token1IsStable = pool.token1.symbol?.includes('USD') || false;
        
        console.log(`Token0: ${pool.token0.symbol}, isEth: ${token0IsEth}, isStable: ${token0IsStable}`);
        console.log(`Token1: ${pool.token1.symbol}, isEth: ${token1IsEth}, isStable: ${token1IsStable}`);
        
        // Get the raw price from tickToPrice (this will be token1 per token0)
        const rawPrice = tickToPrice(
          pool.tickCurrent,
          pool.token0.decimals,
          pool.token1.decimals
        );
        
        console.log(`Raw price from pool: ${rawPrice} ${pool.token1.symbol} per ${pool.token0.symbol}`);
        
        // For WETH/USDC, we need to ensure we handle conversions correctly
        // The expected real-world price should be around 1970 USDC per WETH
        if (token === 'token0') {
          // Converting from token0 to token1
          const amount1Value = parseFloat(value) * rawPrice;
          setAmount1(amount1Value.toFixed(6));
          console.log(`${value} ${pool.token0.symbol} = ${amount1Value.toFixed(6)} ${pool.token1.symbol}`);
        } else {
          // Converting from token1 to token0
          const amount0Value = parseFloat(value) / rawPrice;
          setAmount0(amount0Value.toFixed(6));
          console.log(`${value} ${pool.token1.symbol} = ${amount0Value.toFixed(6)} ${pool.token0.symbol}`);
        }
      }
    } catch (err) {
      console.error('Error calculating amounts:', err);
      
      // Fallback to hardcoded price 
      if (value && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
        // Detect which token is likely ETH and which is stablecoin
        const token0IsEth = pool.token0.symbol?.includes('ETH') || false;
        const token1IsStable = pool.token1.symbol?.includes('USD') || false;
        
        // Set price based on token configuration
        const ethPrice = 1970; // Approximate ETH price in USD
        
        if (token === 'token0') {
          if (token0IsEth && token1IsStable) {
            // If token0 is ETH and token1 is stablecoin, multiply by ETH price
            const amount1Value = parseFloat(value) * ethPrice;
            setAmount1(amount1Value.toFixed(6));
          } else if (!token0IsEth && !token1IsStable) {
            // If token0 is stablecoin and token1 is ETH, divide by ETH price
            const amount1Value = parseFloat(value) / ethPrice;
            setAmount1(amount1Value.toFixed(6));
          } else {
            // For other token combos, use the raw price or a reasonable fallback
            setAmount1((parseFloat(value) * 1).toFixed(6));
          }
        } else {
          if (token0IsEth && token1IsStable) {
            // If token0 is ETH and token1 is stablecoin, divide by ETH price
            const amount0Value = parseFloat(value) / ethPrice;
            setAmount0(amount0Value.toFixed(6));
          } else if (!token0IsEth && !token1IsStable) {
            // If token0 is stablecoin and token1 is ETH, multiply by ETH price
            const amount0Value = parseFloat(value) * ethPrice;
            setAmount0(amount0Value.toFixed(6));
          } else {
            // For other token combos, use the raw price or a reasonable fallback
            setAmount0((parseFloat(value) * 1).toFixed(6));
          }
        }
      }
    }
  };

  // Check if user has sufficient balance for both tokens
  const checkBalances = (): { hasEnough: boolean; message: string | null } => {
    if (!amount0 || !amount1) {
      return { hasEnough: false, message: 'Please enter token amounts' };
    }
    
    try {
      // Convert user input to the same format as balance
      let amount0BigInt: bigint;
      let amount1BigInt: bigint;
      
      // Special handling for ETH/WETH
      const token0IsEth = pool.token0.symbol?.includes('ETH') || false;
      const token1IsEth = pool.token1.symbol?.includes('ETH') || false;
      
      if (token0IsEth) {
        amount0BigInt = parseUnits(amount0, 18); // ETH always has 18 decimals
        // For ETH/WETH, check against native ETH balance if it's WETH
        const actualToken0Balance = token0Balance?.value || BigInt(0);
        const nativeEthBalance = ethBalance?.value || BigInt(0);
        
        // Compare with actual balances - use the larger of WETH balance or ETH balance
        const hasEnoughToken0 = amount0BigInt <= (token0Balance?.symbol === 'WETH' ? 
          (actualToken0Balance > nativeEthBalance ? actualToken0Balance : nativeEthBalance) : 
          actualToken0Balance);
        
        if (!hasEnoughToken0) {
          // Show both ETH and WETH balances
          const formattedWethBalance = token0Balance ? 
            Number(formatUnits(token0Balance.value, 18)).toFixed(8) : 
            '0.00000000';
          const formattedEthBalance = ethBalance ? 
            Number(formatEther(ethBalance.value)).toFixed(8) : 
            '0.00000000';
            
          return { 
            hasEnough: false, 
            message: `Insufficient ${pool.token0.symbol} balance. You have ${formattedWethBalance} ${pool.token0.symbol} and ${formattedEthBalance} ETH` 
          };
        }
      } else {
        amount0BigInt = parseUnits(amount0, pool.token0.decimals);
        // Check if sufficient token0 balance
        if (token0Balance && amount0BigInt > token0Balance.value) {
          const formattedBalance = formatUnits(token0Balance.value, pool.token0.decimals);
          return { 
            hasEnough: false, 
            message: `Insufficient ${pool.token0.symbol} balance. You have ${formattedBalance} ${pool.token0.symbol}` 
          };
        }
      }
      
      if (token1IsEth) {
        amount1BigInt = parseUnits(amount1, 18); // ETH always has 18 decimals
        // For ETH/WETH, check against native ETH balance if it's WETH
        const actualToken1Balance = token1Balance?.value || BigInt(0);
        const nativeEthBalance = ethBalance?.value || BigInt(0);
        
        // Compare with actual balances - use the larger of WETH balance or ETH balance
        const hasEnoughToken1 = amount1BigInt <= (token1Balance?.symbol === 'WETH' ? 
          (actualToken1Balance > nativeEthBalance ? actualToken1Balance : nativeEthBalance) : 
          actualToken1Balance);
        
        if (!hasEnoughToken1) {
          // Show both ETH and WETH balances
          const formattedWethBalance = token1Balance ? 
            Number(formatUnits(token1Balance.value, 18)).toFixed(8) : 
            '0.00000000';
          const formattedEthBalance = ethBalance ? 
            Number(formatEther(ethBalance.value)).toFixed(8) : 
            '0.00000000';
            
          return { 
            hasEnough: false, 
            message: `Insufficient ${pool.token1.symbol} balance. You have ${formattedWethBalance} ${pool.token1.symbol} and ${formattedEthBalance} ETH` 
          };
        }
      } else {
        amount1BigInt = parseUnits(amount1, pool.token1.decimals);
        // Check if sufficient token1 balance
        if (token1Balance && amount1BigInt > token1Balance.value) {
          const formattedBalance = formatUnits(token1Balance.value, pool.token1.decimals);
          return { 
            hasEnough: false, 
            message: `Insufficient ${pool.token1.symbol} balance. You have ${formattedBalance} ${pool.token1.symbol}` 
          };
        }
      }
      
      return { hasEnough: true, message: null };
    } catch (err) {
      console.error("Error checking balances:", err);
      return { hasEnough: false, message: "Error validating balances" };
    }
  };

  // Add constant for Uniswap position manager
  const POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';

  // Add a new function to check transaction status after a timeout
  const checkTransactionStatus = async (txHash: `0x${string}`) => {
    if (!publicClient) return null;
    
    try {
      console.log(`Checking status for transaction: ${txHash}`);
      // Try to get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash,
      });
      
      return receipt;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return null;
    }
  };

  // Handle adding liquidity
  const handleAddLiquidity = async () => {
    if (!pool || !walletClient || !address || !lowerTick || !upperTick || !publicClient) {
      setError('Missing required parameters');
      return;
    }
    
    // Allow very small amounts like 0.000001 for testing
    // Check if the values are greater than 0, even if very small
    const amount0Value = parseFloat(amount0);
    const amount1Value = parseFloat(amount1);
    
    // Calculate appropriate slippage tolerance based on price range
    const tickDistance = upperTick - lowerTick;
    let adjustedSlippageTolerance = 0.5; // Default base slippage of 0.5%

    // Check if this is a USDC/WETH pair which needs special handling
    const isUsdcWethPair = 
      (pool.token0.symbol?.includes('USDC') && pool.token1.symbol?.includes('ETH')) ||
      (pool.token1.symbol?.includes('USDC') && pool.token0.symbol?.includes('ETH'));

    if (isUsdcWethPair) {
      // Get the current price from the pool
      const currentPrice = tickToPrice(pool.tickCurrent, pool.token0.decimals, pool.token1.decimals);
      const lowerPrice = tickToPrice(lowerTick, pool.token0.decimals, pool.token1.decimals);
      const upperPrice = tickToPrice(upperTick, pool.token0.decimals, pool.token1.decimals);
      
      // Calculate position in range
      if (currentPrice < lowerPrice || currentPrice > upperPrice) {
        // Price is out of range, use higher slippage
        adjustedSlippageTolerance = 10.0; // 10% slippage if out of range for component
        console.log('USDC/WETH: Price out of range, using high slippage in component (10%)');
      } else {
        // Price is in range, calculate proportional slippage
        const positionInRange = (currentPrice - lowerPrice) / (upperPrice - lowerPrice);
        
        // If near edge, use higher slippage
        if (positionInRange < 0.1 || positionInRange > 0.9) {
          adjustedSlippageTolerance = 5.0; // 5% near edges
          console.log('USDC/WETH: Near range edge, using moderate slippage in component (5%)');
        } else {
          // More centered in range, use moderate slippage
          adjustedSlippageTolerance = 2.0; // 2% for in-range positions
          console.log('USDC/WETH: Well within range, using standard slippage in component (2%)');
        }
      }
    } else {
      // For other pairs, use the standard slippage calculations
      // For narrow ranges, use higher slippage tolerance
      if (tickDistance < 2000) {
        adjustedSlippageTolerance = 2.0; // At least 2% for narrow ranges
      }
      
      // For very narrow ranges, use even higher slippage
      if (tickDistance < 1000) {
        adjustedSlippageTolerance = 3.0; // At least 3% for very narrow ranges
      }

      // For extremely narrow ranges, use even higher slippage
      if (tickDistance < 500) {
        adjustedSlippageTolerance = 4.0; // At least 4% for extremely narrow ranges
      }
    }
  
    // Log the slippage adjustment for debugging
    console.log('Slippage tolerance adjustment:', {
      originalSlippage: 0.5, // Base slippage
      adjustedSlippage: adjustedSlippageTolerance,
      tickDistance,
      priceRange
    });
    
    // Create detailed debug info
    const debugData = {
      pool: {
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
        tickSpacing: pool.tickSpacing,
        sqrtRatioX96: pool.sqrtRatioX96.toString()
      },
      inputValues: {
        amount0: amount0,
        amount1: amount1,
        lowerTick: lowerTick,
        upperTick: upperTick,
        priceRange: priceRange,
        slippageTolerance: adjustedSlippageTolerance
      },
      tickCalculations: {
        lowerPrice: lowerPrice,
        upperPrice: upperPrice,
        tickDistance: upperTick ? upperTick - lowerTick : null
      }
    };
    
    // Save debug info for display
    setDebugInfo(debugData);
    
    console.log('DEBUG - Add Liquidity Params:', debugData);
    
    if (!amount0 || !amount1 || isNaN(amount0Value) || isNaN(amount1Value) || amount0Value <= 0 || amount1Value <= 0) {
      setError('Please enter valid token amounts');
      return;
    }
    
    // Check for excessively large values that might cause JSBI conversion errors
    if (amount0Value > 1000000 || amount1Value > 1000000) {
      setError('Amount too large. Please enter a smaller value (less than 1,000,000)');
      return;
    }
    
    // For full range positions, ensure the amounts aren't too extreme
    if (priceRange === 'full' && (amount0Value > 100 || amount1Value > 100)) {
      setError('For full range positions, please use smaller amounts (less than 100)');
      return;
    }
    
    // For narrow range positions, if one token is USDC or similar stablecoin,
    // ensure the amount isn't too small relative to the range
    if (priceRange === 'narrow') {
      // Calculate tick range
      const tickRange = upperTick - lowerTick;
      
      // Check if one token is a stablecoin (USDC, USDT, etc.)
      const token0IsStable = pool.token0.symbol?.includes('USD') || false;
      const token1IsStable = pool.token1.symbol?.includes('USD') || false;
      
      if (token0IsStable && amount0Value < 50) {
        setError('For narrow ranges with stablecoins, try using at least 50 USDC to avoid conversion errors');
        return;
      }
      
      if (token1IsStable && amount1Value < 50) {
        setError('For narrow ranges with stablecoins, try using at least 50 USDC to avoid conversion errors');
        return;
      }
      
      // If both tokens are non-stablecoins (like ETH/WBTC pairs), check different minimums
      if (!token0IsStable && !token1IsStable) {
        // For crypto-crypto pairs, recommend higher minimums
        if (amount0Value < 0.025 || amount1Value < 0.025) {
          setError('For narrow ranges with non-stablecoin pairs, try using at least 0.025 of each token');
          return;
        }
      }
      
      // Additional validation - combined value should be reasonable
      const token0IsEth = pool.token0.symbol?.includes('ETH') || false;
      const token1IsEth = pool.token1.symbol?.includes('ETH') || false;
      
      if ((token0IsEth && token1IsStable) || (token1IsEth && token0IsStable)) {
        // For ETH/USDC pairs
        const ethValue = token0IsEth ? amount0Value : amount1Value;
        const usdcValue = token0IsStable ? amount0Value : amount1Value;
        
        if (ethValue < 0.025 && usdcValue < 50) {
          setError('For ETH/USDC pairs in narrow range, try at least 0.025 ETH and 50 USDC');
          return;
        }
      }
    }
    
    // Validate price range
    if (lowerTick >= upperTick) {
      setError('Lower price must be less than upper price');
      return;
    }
    
    // For custom ranges, check that the range isn't too narrow or too wide
    if (priceRange === 'custom') {
      const tickRange = upperTick - lowerTick;
      if (tickRange < 10) {
        setError('Price range too narrow. Please widen your price range');
        return;
      }
      if (tickRange > 100000) {
        setError('Price range too wide. Please narrow your price range');
        return;
      }
    }
    
    // Check wallet balances before proceeding
    const { hasEnough, message } = checkBalances();
    if (!hasEnough) {
      setError(message || 'Insufficient balance');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Create position
      const position = createPosition(
        pool,
        lowerTick,
        upperTick,
        amount0,
        amount1
      );

      console.log('Position created:', {
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        amount0: position.amount0.toString(),
        amount1: position.amount1.toString()
      });

      // Check token approvals
      const [token0Allowance, token1Allowance] = await Promise.all([
        publicClient.readContract({
          address: pool.token0.address as Address,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address as Address, POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address]
        }),
        publicClient.readContract({
          address: pool.token1.address as Address,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address as Address, POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address]
        })
      ]);

      const token0Required = position.amount0.quotient.toString();
      const token1Required = position.amount1.quotient.toString();

      console.log('Token approvals for transaction:', {
        token0: pool.token0.symbol,
        token0Approved: BigInt(token0Allowance) >= BigInt(token0Required),
        token0Allowance: token0Allowance.toString(),
        token0Required,
        token1: pool.token1.symbol,
        token1Approved: BigInt(token1Allowance) >= BigInt(token1Required),
        token1Allowance: token1Allowance.toString(),
        token1Required
      });

      // If either token needs approval, show approval modal
      if (BigInt(token0Allowance) < BigInt(token0Required) || BigInt(token1Allowance) < BigInt(token1Required)) {
        setNeedsApproval(true);
        setToken0NeedsApproval(BigInt(token0Allowance) < BigInt(token0Required));
        setToken1NeedsApproval(BigInt(token1Allowance) < BigInt(token1Required));
        setLoading(false);
        return;
      }

      // Ensure address is properly typed as Address
      const recipientAddress = address as Address;
      console.log('DEBUG - Using recipient address:', recipientAddress);

      // Convert slippage tolerance to basis points (1% = 100 basis points)
      const slippageBasisPoints = Math.floor(adjustedSlippageTolerance * 100);
      console.log('DEBUG - Final slippage settings:', {
        slippageTolerance: adjustedSlippageTolerance,
        slippageBasisPoints,
        tickDistance,
        priceRange
      });

      // Prepare transaction data with adjusted slippage
      const transactionData = prepareAddLiquidityTransaction(
        position,
        slippageBasisPoints,
        1800, // 30 minutes deadline
        chainId,
        recipientAddress
      );
      
      if (!transactionData || !transactionData.to || !transactionData.data) {
        throw new Error('Invalid transaction data generated');
      }
      
      // Show feedback immediately
      setSuccess("Transaction is being submitted to the network...");
      
      // Start transaction process
      console.log("Sending transaction with data:", {
        to: POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address,
        data: transactionData.data.substring(0, 100) + "...", // Just log a snippet of the data
        value: BigInt(transactionData.value || '0'),
      });
      
      let hash: `0x${string}`;
      
      try {
        hash = await walletClient.sendTransaction({
          to: POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address,
          data: transactionData.data,
          value: BigInt(transactionData.value || '0'),
        });
        
        // Update UI immediately after we get the hash
        console.log(`Transaction submitted with hash: ${hash}`);
        setSuccess(`Transaction submitted! View on Etherscan: ${hash}`);
        
        // Update UI with link instead of JSX
        const networkPrefix = chainId === 1 ? '' : 
          (NETWORKS.MAINNET.chainId === chainId ? '' : 
           NETWORKS.SEPOLIA.chainId === chainId ? 'sepolia.' : '');
        const etherscanLink = `https://${networkPrefix}etherscan.io/tx/${hash}`;
        
        // Update UI with link as a string template
        setSuccess(`Transaction submitted! View on Etherscan: ${etherscanLink} (Hash: ${hash})`);
        
        // Separate try/catch for waiting, so we always get the hash even if waiting fails
        try {
          // Increase timeout to 3 minutes (180000ms)
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            timeout: 180000, // 3 minutes
          });
          
          if (receipt.status === 'success') {
            setSuccess(`Transaction confirmed! Successfully added liquidity. View on Etherscan: ${etherscanLink} (Hash: ${hash})`);
            setAmount0('');
            setAmount1('');
            // Notify the parent component about success
            onSuccess();
          } else {
            setError(`Transaction failed! View on Etherscan: ${etherscanLink} (Hash: ${hash})`);
          }
        } catch (waitErrorObj) {
          console.error('Transaction wait error:', waitErrorObj);
          
          // Type assertion for the error object
          const waitError = waitErrorObj as { message?: string, name?: string };
          
          // Handle timeout errors
          if (waitError.name === 'WaitForTransactionReceiptTimeoutError' || 
              (typeof waitError.message === 'string' && waitError.message.includes('timeout'))) {
            
            setSuccess(`Transaction submitted but confirmation timed out. Your transaction may still be processed. View on Etherscan: ${etherscanLink} (Hash: ${hash}). Try refreshing Etherscan in a few minutes to see if your transaction was confirmed.`);
            
            // Schedule a single check after 2 minutes instead of polling
            setTimeout(async () => {
              try {
                const latestReceipt = await checkTransactionStatus(hash);
                
                if (latestReceipt) {
                  if (latestReceipt.status === 'success') {
                    setSuccess(`Transaction confirmed! Successfully added liquidity. View on Etherscan: ${etherscanLink} (Hash: ${hash})`);
                    setAmount0('');
                    setAmount1('');
                    // Notify the parent component about success
                    onSuccess();
                  } else {
                    setError(`Transaction failed after timeout. View on Etherscan: ${etherscanLink} (Hash: ${hash})`);
                  }
                }
              } catch (checkError) {
                console.error('Failed to check transaction status:', checkError);
              }
            }, 120000); // Check after 2 minutes
          } else {
            // For other errors, still provide the hash
            setError(`Error monitoring transaction: ${waitError.message || 'Unknown error'}. View on Etherscan: ${etherscanLink} (Hash: ${hash})`);
          }
        }
      } catch (txError) {
        // Handle error during transaction submission
        console.error('Error sending transaction:', txError);
        setError(`Error submitting transaction: ${(txError as any)?.message || 'Unknown error'}`);
      }
    } catch (errorObj) {
      console.error('Error in add liquidity process:', errorObj);
      // Type assertion for the error object
      const error = errorObj as { message?: string };
      setError(`Error adding liquidity: ${error.message || JSON.stringify(errorObj)}`);
    } finally {
      // We keep loading state true until we get definitive confirmation
      // This ensures the UI indicates that something is still processing
      // But we allow the user to see the transaction hash and status
      setTimeout(() => {
        setLoading(false);
        setApproving(false);
      }, 2000); // Short delay to ensure UI updates
    }
  };

  // Function to handle token approvals
  const handleApproveToken = async (tokenIndex: number) => {
    if (!pool || !walletClient || !address || !publicClient) {
      setError('Missing required parameters for approval');
      return;
    }
    
    try {
      setApproving(true);
      setError(null);
      
      // Get token details
      const token = tokenIndex === 0 ? pool.token0 : pool.token1;
      const amount = tokenIndex === 0 ? amount0 : amount1;
      
      // Calculate the amount to approve (with some buffer to avoid frequent approvals)
      const parsedAmount = parseUnits(amount, token.decimals);
      const approvalAmount = parsedAmount * BigInt(2); // Approve 2x the amount needed
      
      // Position manager address
      const positionManagerAddress = POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address;
      
      // Create approval transaction
      const hash = await walletClient.writeContract({
        address: token.address as Address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [positionManagerAddress, approvalAmount]
      });
      
      console.log(`Approval transaction sent: ${hash}`);
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        console.log(`Approval successful for ${token.symbol}`);
        
        // Update approval state
        if (tokenIndex === 0) {
          setToken0NeedsApproval(false);
        } else {
          setToken1NeedsApproval(false);
        }
        
        // Check if both tokens are approved
        if ((tokenIndex === 0 && !token1NeedsApproval) || (tokenIndex === 1 && !token0NeedsApproval)) {
          setNeedsApproval(false);
        }
      } else {
        setError(`Approval failed for ${token.symbol}`);
      }
    } catch (error) {
      console.error('Error approving token:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve token');
    } finally {
      setApproving(false);
    }
  };

  // Update gas estimation
  useEffect(() => {
    const estimateGas = async () => {
      try {
        // Skip estimation if we're currently typing or changing prices
        if (isChangingInput) {
          console.log('Skipping gas estimation while inputs are changing');
          return;
        }
        
        if (!walletClient || !address || !publicClient || !pool || !lowerTick || !upperTick || !amount0 || !amount1) {
          return;
        }
        
        // Make sure lower tick is actually lower than upper tick
        if (lowerTick >= upperTick) {
          console.log('Invalid tick range for gas estimation', { lowerTick, upperTick });
          return;
        }
        
        // Parse amounts for validation
        const amount0Value = parseFloat(amount0);
        const amount1Value = parseFloat(amount1);
        
        // Skip if amounts are too small or zero
        if (amount0Value <= 0 || amount1Value <= 0) {
          return;
        }
        
        const gasPrice = await publicClient.getGasPrice();
        setGasPriceGwei(formatEther(gasPrice * BigInt(1000000000)));
        
        // Skip estimation for USDC/WETH pair entirely as it's known to be problematic
        const isUsdcWethPair = 
          (pool.token0.symbol?.includes('USDC') && pool.token1.symbol?.includes('ETH')) ||
          (pool.token1.symbol?.includes('USDC') && pool.token0.symbol?.includes('ETH'));

        if (isUsdcWethPair) {
          console.log('USDC/WETH pair detected - using fixed gas estimate to avoid slippage errors');
          // Use a conservative fixed gas estimate based on historical data
          const typicalGasUsed = 450000; // Higher value for USDC/WETH
          const approximateGasCost = typicalGasUsed * Number(formatEther(gasPrice));
          setGasEstimate(approximateGasCost.toFixed(8));
          return;
        }
        
        // Skip estimation for very small amounts that might cause JSBI errors
        const token0IsStable = pool.token0.symbol?.includes('USD') || false;
        const token1IsStable = pool.token1.symbol?.includes('USD') || false;
        
        // Skip actual estimation for cases that are likely to cause JSBI errors
        if (
          // Skip for too small stable amounts
          (token0IsStable && amount0Value < 10) || 
          (token1IsStable && amount1Value < 10) ||
          // Skip for narrow ranges with small amounts
          ((upperTick - lowerTick < 2000) && (amount0Value < 10 || amount1Value < 0.005))
        ) {
          // Instead of estimating, use a reasonable default value
          // This avoids the JSBI error during typing
          const typicalGasUsed = 300000; // Typical gas for add liquidity
          const approximateGasCost = typicalGasUsed * Number(formatEther(gasPrice));
          setGasEstimate(approximateGasCost.toFixed(8));
          return;
        }
        
        // For valid amounts, proceed with actual estimation
        try {
          // Check for token allowances first
          const positionManagerAddress = POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address;
          
          // Check token0 allowance
          const token0Allowance = await publicClient.readContract({
            address: pool.token0.address as Address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address as Address, positionManagerAddress]
          });
          
          // Check token1 allowance
          const token1Allowance = await publicClient.readContract({
            address: pool.token1.address as Address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address as Address, positionManagerAddress]
          });
          
          // Get parsed token amounts
          const amount0Big = parseUnits(amount0, pool.token0.decimals);
          const amount1Big = parseUnits(amount1, pool.token1.decimals);

          // Update approval states - but don't log every time
          const token0NeedsApproval = token0Allowance < amount0Big;
          const token1NeedsApproval = token1Allowance < amount1Big;
          setToken0NeedsApproval(token0NeedsApproval);
          setToken1NeedsApproval(token1NeedsApproval);
          setNeedsApproval(token0NeedsApproval || token1NeedsApproval);
          
          // Check if allowances are sufficient
          if (token0NeedsApproval || token1NeedsApproval) {
            // Use an approximate gas value instead of actual estimation
            const typicalGasUsed = 300000; // Typical gas for add liquidity
            const approximateGasCost = typicalGasUsed * Number(formatEther(gasPrice));
            setGasEstimate(approximateGasCost.toFixed(8));
            return;
          }
          
          // Skip gas estimation if we've had a recent slippage error
          // to avoid overwhelming the user with errors
          if (error && error.includes('slippage')) {
            console.log('Skipping gas estimation due to recent slippage error');
            const typicalGasUsed = 300000; // Typical gas for add liquidity
            const approximateGasCost = typicalGasUsed * Number(formatEther(gasPrice));
            setGasEstimate(approximateGasCost.toFixed(8));
            return;
          }
          
          // For gas estimation, use extremely high slippage to ensure it passes
          // This is just for estimation, not the actual transaction
          const estimationOnlySlippage = 1500; // 15% slippage just for estimation
          
          // Create position with a try/catch to handle potential errors
          let position;
          try {
            position = createPosition(pool, lowerTick, upperTick, amount0, amount1);
          } catch (positionError) {
            console.error('Error creating position for gas estimation:', positionError);
            // Use default gas estimate
            const typicalGasUsed = 300000;
            const approximateGasCost = typicalGasUsed * Number(formatEther(gasPrice));
            setGasEstimate(approximateGasCost.toFixed(8));
            return;
          }
          
          // Ensure address is properly typed as Address for gas estimation
          const recipientAddress = address as Address;
          
          // Create special position for gas estimation with higher slippage
          let estimationTxData;
          try {
            estimationTxData = prepareAddLiquidityTransaction(
              position, 
              estimationOnlySlippage, // Use much higher slippage for estimation only
              1800, // 30 minutes deadline
              chainId,
              recipientAddress
            );
          } catch (prepError) {
            console.warn('Using fallback gas estimates due to tx preparation error:', prepError);
            setGasEstimate(formatEther(gasPrice * BigInt(300000))); // Use default 300k gas
            return;
          }
          
          // Use a longer timeout and better error handling
          try {
            console.log('Attempting gas estimation with higher slippage tolerance');
            
            // First try estimation with a 10-second timeout
            const gasEstimate = await Promise.race([
              publicClient.estimateGas({
                account: address,
                to: estimationTxData.to as Address,
                data: estimationTxData.data,
                value: BigInt(estimationTxData.value || '0'),
              }),
              new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Gas estimation timeout')), 10000); // 10s timeout
              })
            ]);
            
            // If we get here, estimation succeeded
            // Calculate total gas cost in ETH
            const gasCostEth = (gasEstimate as bigint) * gasPrice;
            setGasEstimate(formatEther(gasCostEth));
            console.log('Gas estimation successful:', formatEther(gasCostEth));
            
          } catch (estimationErr) {
            // If estimation fails, use default values but don't show error to user
            console.warn('Gas estimation failed, using approximate value:', estimationErr);
            
            if (String(estimationErr).includes('slippage') || 
                String(estimationErr).includes('exceed')) {
              console.log('Slippage error during gas estimation - using default gas estimate');
            }
            
            // Try estimating only the approval transaction since it's simpler
            try {
              // Use a simple approval transaction as a baseline
              const approvalGas = await publicClient.estimateGas({
                account: address,
                to: pool.token0.address as Address,
                data: encodeFunctionData({
                  abi: erc20Abi,
                  functionName: 'approve',
                  args: [POSITION_MANAGER_ADDRESSES[chainId as 1 | 11155111] as Address, BigInt('1000000000000000000')]
                }),
                value: BigInt(0),
              });
              
              // Use approval gas × 8 as a conservative approximation for liquidity addition
              // We use a higher multiplier to ensure we don't underestimate gas costs
              const approximateGas = approvalGas * BigInt(8);
              const approximateGasCost = approximateGas * gasPrice;
              setGasEstimate(formatEther(approximateGasCost));
              console.log('Using approval-based gas estimate:', formatEther(approximateGasCost));
              
            } catch (approvalErr) {
              // If even approval estimation fails, use a highly conservative default
              console.warn('Approval gas estimation failed, using fixed default:', approvalErr);
              // Increase the default estimation to be more conservative
              const typicalGasUsed = 400000; // More conservative gas estimate for add liquidity
              const approximateGasCost = typicalGasUsed * Number(formatEther(gasPrice));
              setGasEstimate(approximateGasCost.toFixed(8));
            }
          }
        } catch (err) {
          // Final fallback
          console.error('Error in entire gas estimation process:', err);
          const typicalGasUsed = 400000; // Very conservative estimate
          const approximateGasCost = typicalGasUsed * Number(formatEther(gasPrice));
          setGasEstimate(approximateGasCost.toFixed(8));
        }
      } catch (err) {
        console.error('Error in gas price fetch:', err);
      }
    };
    
    // Only run if we have all the necessary data and aren't currently changing inputs
    if (amount0 && amount1 && lowerTick !== null && upperTick !== null) {
      void estimateGas();
    }
  }, [amount0, amount1, lowerTick, upperTick, pool, address, walletClient, publicClient, isChangingInput, error]);

  // Function to calculate price range values for sliders
  const calculatePriceRangeValues = () => {
    if (!pool) return { min: 0, max: 0, current: 0, step: 0 };
    
    // Get current price
    const currentPrice = tickToPrice(pool.tickCurrent, pool.token0.decimals, pool.token1.decimals);
    
    // Calculate price range based on token types
    const token0IsStable = pool.token0.symbol?.includes('USD') || false;
    const token1IsStable = pool.token1.symbol?.includes('USD') || false;
    const token0IsEth = pool.token0.symbol?.includes('ETH') || false;
    const token1IsEth = pool.token1.symbol?.includes('ETH') || false;
    
    let minPrice, maxPrice, step;
    
    // For ETH/USDC like pairs
    if ((token0IsEth && token1IsStable) || (token0IsStable && token1IsEth)) {
      // For ETH/USDC, reasonable range is roughly 70% - 500% of current price
      minPrice = currentPrice * 0.3;
      maxPrice = currentPrice * 3;
      step = currentPrice * 0.01; // 1% steps
    } else {
      // For other pairs, use a more moderate range
      minPrice = currentPrice * 0.5;
      maxPrice = currentPrice * 2;
      step = currentPrice * 0.01;
    }
    
    return {
      min: minPrice,
      max: maxPrice,
      current: currentPrice,
      step: step
    };
  };

  // Simplified renderPriceRangeOptions function
  const renderPriceRangeOptions = () => {
    if (!pool) return null;
    
    const priceRangeValues = calculatePriceRangeValues();
    const currentPrice = priceRangeValues.current;
    
    // Get token symbols with fallbacks to avoid undefined errors
    const token0Symbol = pool?.token0?.symbol || 'Token0';
    const token1Symbol = pool?.token1?.symbol || 'Token1';
    
    return (
      <div className="price-range-section">
        <div className="range-options-wrapper">
          <div 
            className={`range-option ${priceRange === 'full' ? 'selected' : ''}`}
            onClick={() => handlePriceRangeChange('full')}
          >
            <div className="range-option-radio"></div>
            <div className="range-option-label">Full Range (Min/Max)</div>
          </div>
          <div 
            className={`range-option ${priceRange === 'narrow' ? 'selected' : ''}`}
            onClick={() => handlePriceRangeChange('narrow')}
          >
            <div className="range-option-radio"></div>
            <div className="range-option-label">Narrow Range (±5%)</div>
          </div>
          <div 
            className={`range-option ${priceRange === 'custom' ? 'selected' : ''}`}
            onClick={() => handlePriceRangeChange('custom')}
          >
            <div className="range-option-radio"></div>
            <div className="range-option-label">Custom Range</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="add-liquidity-form">
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <div>Processing transaction... This may take a moment.</div>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <div className="error-title">Error</div>
          <div className="error-content">{error}</div>
          <div className="error-help">
            {error.includes('Insufficient') ? (
              <div>Please check your wallet has enough of both tokens before adding liquidity.</div>
            ) : error.includes('Position creation failed') || error.includes('JSBI') || error.includes('conversion') ? (
              <ul>
                <li><strong>For narrow ranges (±5%) with USDC</strong>: Use at least 50-100 USDC and corresponding ETH amount</li>
                <li><strong>For full range positions</strong>: Use at least 0.01 ETH and 20 USDC</li>
                <li><strong>For custom ranges</strong>: The narrower your range, the more tokens you need to provide. 
                For ranges less than ±2%, you may need 100+ USDC.</li>
                <li>Consider using a wider range if you want to add smaller amounts.</li>
              </ul>
            ) : error.includes('price') ? (
              <div>Ensure your lower price is less than your upper price, and both are valid numbers.</div>
            ) : error.includes('slippage') ? (
              <div>The price has moved significantly since you started the transaction. Try again.</div>
            ) : null}
          </div>
          <div className="debug-controls">
            <button 
              onClick={() => setShowDebugInfo(!showDebugInfo)} 
              className="toggle-debug-btn"
            >
              {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
            </button>
          </div>
        </div>
      )}
      
      {showDebugInfo && debugInfo && (
        <div className="debug-info">
          <h4>Debug Information</h4>
          <div className="debug-section">
            <h5>Pool Details</h5>
            <div className="debug-item">
              <span>Token0:</span> {debugInfo.pool.token0.symbol} ({debugInfo.pool.token0.decimals} decimals)
            </div>
            <div className="debug-item">
              <span>Token1:</span> {debugInfo.pool.token1.symbol} ({debugInfo.pool.token1.decimals} decimals)
            </div>
            <div className="debug-item">
              <span>Current Tick:</span> {debugInfo.pool.tickCurrent}
            </div>
            <div className="debug-item">
              <span>Tick Spacing:</span> {debugInfo.pool.tickSpacing}
            </div>
          </div>
          <div className="debug-section">
            <h5>Input Values</h5>
            <div className="debug-item">
              <span>Amount0:</span> {debugInfo.inputValues.amount0} {debugInfo.pool.token0.symbol}
            </div>
            <div className="debug-item">
              <span>Amount1:</span> {debugInfo.inputValues.amount1} {debugInfo.pool.token1.symbol}
            </div>
            <div className="debug-item">
              <span>Lower Tick:</span> {debugInfo.inputValues.lowerTick}
            </div>
            <div className="debug-item">
              <span>Upper Tick:</span> {debugInfo.inputValues.upperTick}
            </div>
            <div className="debug-item">
              <span>Price Range:</span> {debugInfo.inputValues.priceRange}
            </div>
            <div className="debug-item">
              <span>Tick Distance:</span> {debugInfo.tickCalculations.tickDistance}
            </div>
            <div className="debug-item">
              <span>Lower Price:</span> {debugInfo.tickCalculations.lowerPrice}
            </div>
            <div className="debug-item">
              <span>Upper Price:</span> {debugInfo.tickCalculations.upperPrice}
            </div>
          </div>
        </div>
      )}
      
      {success && <div className="success-message">{success}</div>}
      
      {renderPriceRangeOptions()}
      
      {/* Current price display */}
      <div className="price-info">
        <strong>Current Price:</strong> 1 {pool?.token0.symbol} = {tickToPrice(pool?.tickCurrent || 0, pool?.token0.decimals || 0, pool?.token1.decimals || 0).toFixed(6)} {pool?.token1.symbol}
        {priceRange === 'narrow' && (
          <p className="range-note">±5% range requires sufficient token amounts. For USDC, use at least 50-100 USDC. For ETH, use at least 0.025-0.05 ETH.</p>
        )}
      </div>
      
      {/* Custom Range Price Inputs */}
      {priceRange === 'custom' && (
        <PriceInputs
          minValue={tickToPrice(getValidTick(TickMath.MIN_TICK, pool?.tickSpacing || 60), pool?.token0.decimals || 0, pool?.token1.decimals || 0)}
          maxValue={tickToPrice(getValidTick(TickMath.MAX_TICK, pool?.tickSpacing || 60), pool?.token0.decimals || 0, pool?.token1.decimals || 0)}
          lowerValue={parseFloat(lowerPrice)}
          upperValue={parseFloat(upperPrice)}
          onChangeLower={(value) => handlePriceChange('lower', value.toString())}
          onChangeUpper={(value) => handlePriceChange('upper', value.toString())}
          disabled={false}
          pool={pool}
        />
      )}

      {/* Narrow Range Price Inputs */}
      {priceRange === 'narrow' && (
        <PriceInputs
          minValue={tickToPrice(pool?.tickCurrent || 0, pool?.token0.decimals || 0, pool?.token1.decimals || 0) * 0.9}
          maxValue={tickToPrice(pool?.tickCurrent || 0, pool?.token0.decimals || 0, pool?.token1.decimals || 0) * 1.1}
          lowerValue={parseFloat(lowerPrice)}
          upperValue={parseFloat(upperPrice)}
          onChangeLower={() => {}} // No-op since this is read-only
          onChangeUpper={() => {}} // No-op since this is read-only
          disabled={true}
          pool={pool}
        />
      )}
      
      {priceRange === 'full' && (
        <div className="price-range-info">
          <strong>Note:</strong> Full range positions earn fees across all price points, but earn fewer fees per deposited token.
          Recommended for very stable pairs or when unsure about price direction.
        </div>
      )}

      {/* Display current balances to help users */}
      <div className="wallet-balances">
        <div className="balance-title">Your Wallet Balances</div>
        <div className="balance-row">
          <span>{pool?.token0.symbol}: </span>
          <strong>
            {formatBalance(token0Balance, pool?.token0)}
          </strong>
          {pool?.token0.symbol?.includes('ETH') && (
            <div className="native-eth-balance">
              <span>(Native ETH: {ethBalance ? formatTokenAmount(formatEther(ethBalance.value)) : '...'})</span>
            </div>
          )}
        </div>
        <div className="balance-row">
          <span>{pool?.token1.symbol}: </span>
          <strong>
            {formatBalance(token1Balance, pool?.token1)}
          </strong>
          {pool?.token1.symbol?.includes('ETH') && (
            <div className="native-eth-balance">
              <span>(Native ETH: {ethBalance ? formatTokenAmount(formatEther(ethBalance.value)) : '...'})</span>
            </div>
          )}
        </div>
      </div>

      <TokenInputs 
        pool={pool}
        amount0={amount0}
        amount1={amount1}
        onAmountChange={handleAmountChange}
        disabled={approving || loading}
      />
      
      <div className="slippage-info">
        <p>Slippage tolerance is automatically adjusted based on your price range and market conditions.</p>
      </div>

      {/* Display Token Approval Status */}
      <div className="approval-status-section">
        <h4>Token Approval Status</h4>
        <div className="approval-status-row">
          <span>{pool?.token0.symbol}: </span>
          <strong className={token0NeedsApproval ? "status-needed" : "status-approved"}>
            {token0NeedsApproval ? "Approval Needed" : "Already Approved"}
          </strong>
        </div>
        <div className="approval-status-row">
          <span>{pool?.token1.symbol}: </span>
          <strong className={token1NeedsApproval ? "status-needed" : "status-approved"}>
            {token1NeedsApproval ? "Approval Needed" : "Already Approved"}
          </strong>
        </div>
        <p className="approval-info">
          Token approvals allow the Uniswap V3 contract to use your tokens. This is a one-time approval per token that persists until you revoke it.
        </p>
      </div>

      {/* Add the approval section */}
      {needsApproval && (
        <div className="approval-section warning-box">
          <h3>Token Approval Required</h3>
          <p>Before adding liquidity, you need to approve the Uniswap v3 Position Manager to use your tokens:</p>
          
          {token0NeedsApproval && (
            <button 
              onClick={() => handleApproveToken(0)} 
              disabled={approving}
              className="approve-button"
            >
              {approving ? 'Approving...' : `Approve ${pool?.token0.symbol}`}
            </button>
          )}
          
          {token1NeedsApproval && (
            <button 
              onClick={() => handleApproveToken(1)} 
              disabled={approving}
              className="approve-button"
            >
              {approving ? 'Approving...' : `Approve ${pool?.token1.symbol}`}
            </button>
          )}
          
          <p className="note">Note: Approvals require separate transactions and gas fees.</p>
        </div>
      )}

      <button 
        onClick={handleAddLiquidity} 
        disabled={loading || !!error || needsApproval} 
        className="add-liquidity-btn"
      >
        {loading ? 'Adding...' : 'Add Liquidity'}
      </button>
      
      <GasEstimateDisplay 
        gasEstimate={gasEstimate}
        gasPriceGwei={gasPriceGwei}
      />
    </div>
  );
};

export default AddLiquidity;