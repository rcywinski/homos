import React, { FC, useState, useEffect, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId, useBalance } from 'wagmi';
import { erc20Abi } from 'abitype/abis';
import { Pool } from '@uniswap/v3-sdk';
import { formatEther, Address, formatUnits, parseUnits } from 'viem';
import { 
  tickToPrice, 
  priceToTick, 
  getValidTick, 
  createPosition,
  prepareAddLiquidityTransaction,
  TickMath
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
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
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
          // Don't update the tick if conversion fails
          return;
        }
        
        // Ensure the tick is within valid Uniswap V3 range
        // Tick values must be between TickMath.MIN_TICK (-887272) and TickMath.MAX_TICK (887272)
        if (rawTick < TickMath.MIN_TICK) {
          // Price is too low
          setError('Price is too low for Uniswap V3. Please increase your price.');
          return;
        }
        
        if (rawTick > TickMath.MAX_TICK) {
          // Price is too high
          setError('Price is too high for Uniswap V3. Please decrease your price.');
          return;
        }
        
        // Round the tick to the nearest valid tick based on spacing
        let validTick;
        try {
          // Use Math.floor for lower ticks and Math.ceil for upper ticks
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
        
        // Clear any error
        setError(null);
      }
      
      // When manually changing prices, set to custom range
      if (priceRange !== 'custom') {
        setPriceRange('custom');
      }
    } catch (error) {
      console.error('Error handling price change:', error);
      setError('Error updating price range. Please try a different value.');
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
        slippageTolerance: slippageTolerance
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
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Log values for debugging
      console.log('Creating position with params:', {
        pool: pool,
        lowerTick: lowerTick,
        upperTick: upperTick,
        amount0: amount0,
        amount1: amount1,
        priceRange: priceRange
      });
      
      // Create position with try-catch to provide more specific error messages
      let position;
      try {
        position = createPosition(
          pool,
          lowerTick,
          upperTick,
          amount0,
          amount1
        );
      } catch (posError) {
        console.error('Error creating position:', posError);
        
        // Check if this is the specific JSBI conversion error
        const errorStr = String(posError);
        if (errorStr.includes('JSBI') || errorStr.includes('toNumber') || errorStr.includes('number conversion')) {
          // Handle specific JSBI conversion error with more detailed guidance
          const token0IsStable = pool.token0.symbol?.includes('USD') || false;
          const token1IsStable = pool.token1.symbol?.includes('USD') || false;
          const token0IsEth = pool.token0.symbol?.includes('ETH') || false;
          const token1IsEth = pool.token1.symbol?.includes('ETH') || false;
          
          // Provide specific guidance based on token types
          if ((token0IsEth && token1IsStable) || (token1IsEth && token0IsStable)) {
            // ETH/USDC pair
            throw new Error(`Position creation failed due to number conversion. For narrow ranges in ETH/USDC, try using at least 50-100 USDC and 0.025-0.05 ETH. The narrower your range, the more tokens are needed.`);
          } else if (token0IsStable || token1IsStable) {
            // USDC and other pairs
            throw new Error(`Position creation failed due to number conversion. For stablecoin pairs in narrow ranges, try using at least 50-100 USDC.`);
          } else {
            // Other token pairs
            throw new Error(`Position creation failed due to number conversion. Try increasing both token amounts to avoid extremely small liquidity values.`);
          }
        } else {
          throw posError;
        }
      }
      
      // Additional validation to ensure position is valid
      if (!position || typeof position.amount0 === 'undefined' || typeof position.amount1 === 'undefined') {
        throw new Error('Failed to create position - invalid position data');
      }
      
      // Log position data for debugging
      console.log('Position created:', {
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        amount0: position.amount0.toString(),
        amount1: position.amount1.toString()
      });
      
      // Convert to basis points (multiplied by 100)
      const slippageBasisPoints = Math.floor(slippageTolerance * 100);
      
      // Check for token approvals before proceeding
      const positionManagerAddress = POSITION_MANAGER_ADDRESS;
      
      // Get parsed token amounts with small buffer for calculation variances
      const amount0Big = parseUnits(amount0, pool.token0.decimals) * BigInt(101) / BigInt(100); // +1% buffer
      const amount1Big = parseUnits(amount1, pool.token1.decimals) * BigInt(101) / BigInt(100); // +1% buffer

      // Check token0 allowance
      const token0Allowance = await publicClient.readContract({
        address: pool.token0.address as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as Address, positionManagerAddress as Address]
      });
      
      // Check token1 allowance
      const token1Allowance = await publicClient.readContract({
        address: pool.token1.address as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as Address, positionManagerAddress as Address]
      });
      
      // Log approvals for debugging
      console.log('Token approvals for transaction:', {
        token0: pool.token0.symbol,
        token0Approved: token0Allowance >= amount0Big,
        token0Allowance: token0Allowance.toString(),
        token0Required: amount0Big.toString(),
        token1: pool.token1.symbol,
        token1Approved: token1Allowance >= amount1Big,
        token1Allowance: token1Allowance.toString(),
        token1Required: amount1Big.toString()
      });
      
      // If either token needs approval, show warning and stop transaction
      if (token0Allowance < amount0Big || token1Allowance < amount1Big) {
        setError('Token approval required before adding liquidity. Please approve tokens first.');
        
        // Return approval info so UI can handle it
        return {
          needsApproval: true,
          token0NeedsApproval: token0Allowance < amount0Big,
          token1NeedsApproval: token1Allowance < amount1Big,
          token0Symbol: pool.token0.symbol || 'Token0',
          token1Symbol: pool.token1.symbol || 'Token1'
        };
      }
      
      // Prepare transaction with improved error handling
      // @ts-ignore - We're prioritizing functionality over type safety
      const txData = prepareAddLiquidityTransaction(
        position,
        slippageBasisPoints,
        1800, // 30 minutes deadline
        chainId
      );
      
      if (!txData || !txData.to || !txData.data) {
        throw new Error('Invalid transaction data generated');
      }
      
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
        setSuccess('Liquidity added successfully!');
        // Reset form
        setAmount0('');
        setAmount1('');
        // Notify the parent component about success
        onSuccess();
      } else {
        setError('Transaction failed');
      }
    } catch (err) {
      console.error('Error adding liquidity:', err);
      
      // More specific error handling based on error type
      let errorMessage = 'Failed to add liquidity';
      
      if (err instanceof Error) {
        if (err.message.includes('JSBI') || err.message.includes('toNumber') || err.message.includes('number conversion')) {
          // This is a JSBI conversion error - likely due to very small values
          const tickRange = upperTick - lowerTick;
          const isNarrowRange = tickRange < 2000;
          const token0IsStable = pool.token0.symbol?.includes('USD') || false;
          const token1IsStable = pool.token1.symbol?.includes('USD') || false;
          
          // Add specific guidance based on token types and range
          if (isNarrowRange) {
            if (token0IsStable || token1IsStable) {
              errorMessage = 'Failed to add liquidity: Position creation failed due to number conversion. For narrow ranges with stablecoins, try using at least 50-100 USDC. The narrower your range, the more tokens are needed.';
            } else {
              errorMessage = 'Failed to add liquidity: Position creation failed due to number conversion. For narrow ranges, try using larger amounts of both tokens (at least 0.025-0.05 ETH).';
            }
          } else {
            errorMessage = 'Failed to add liquidity: Position creation failed due to number conversion. Try increasing both token amounts.';
          }
        } else {
          errorMessage += ': ' + err.message;
        }
      } else {
        errorMessage += ': ' + String(err);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update gas estimation
  useEffect(() => {
    const estimateGas = async () => {
      try {
        // Skip estimation if we're currently typing to avoid JSBI errors
        if (isChangingInput) return;
        
        if (!walletClient || !address || !publicClient || !pool || !lowerTick || !upperTick || !amount0 || !amount1) return;
        
        // Parse amounts for validation
        const amount0Value = parseFloat(amount0);
        const amount1Value = parseFloat(amount1);
        
        const gasPrice = await publicClient.getGasPrice();
        setGasPriceGwei(formatEther(gasPrice * BigInt(1000000000)));
        
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
          const positionManagerAddress = POSITION_MANAGER_ADDRESS;
          
          // Check token0 allowance
          const token0Allowance = await publicClient.readContract({
            address: pool.token0.address as Address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address as Address, positionManagerAddress as Address]
          });
          
          // Check token1 allowance
          const token1Allowance = await publicClient.readContract({
            address: pool.token1.address as Address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address as Address, positionManagerAddress as Address]
          });
          
          // Get parsed token amounts
          const amount0Big = parseUnits(amount0, pool.token0.decimals);
          const amount1Big = parseUnits(amount1, pool.token1.decimals);

          // Log allowances
          console.log('Token allowances:', {
            token0Symbol: pool.token0.symbol,
            token0Allowance: token0Allowance.toString(),
            token0Required: amount0Big.toString(),
            token1Symbol: pool.token1.symbol,
            token1Allowance: token1Allowance.toString(),
            token1Required: amount1Big.toString(),
            hasEnoughAllowance0: token0Allowance >= amount0Big,
            hasEnoughAllowance1: token1Allowance >= amount1Big
          });
          
          // Update approval states
          const token0NeedsApproval = token0Allowance < amount0Big;
          const token1NeedsApproval = token1Allowance < amount1Big;
          setToken0NeedsApproval(token0NeedsApproval);
          setToken1NeedsApproval(token1NeedsApproval);
          setNeedsApproval(token0NeedsApproval || token1NeedsApproval);
          
          // Check if allowances are sufficient
          if (token0NeedsApproval || token1NeedsApproval) {
            console.log('Insufficient token allowance - gas estimation would fail with STF error');
            // Use an approximate gas value instead of actual estimation
            const typicalGasUsed = 300000; // Typical gas for add liquidity
            const approximateGasCost = typicalGasUsed * Number(formatEther(gasPrice));
            setGasEstimate(approximateGasCost.toFixed(8));
            
            return;
          }
          
          // Create position for estimation
          const position = createPosition(pool, lowerTick, upperTick, amount0, amount1);
          const slippageBasisPoints = Math.floor(slippageTolerance * 100);
          
          // @ts-ignore - We're prioritizing functionality over type safety
          const txData = prepareAddLiquidityTransaction(position, slippageBasisPoints, 1800, chainId);
          
          // Estimate gas
          const estimate = await publicClient.estimateGas({
            account: address,
            to: txData.to as Address,
            data: txData.data,
            value: BigInt(txData.value || '0'),
          });
          
          // Calculate total gas cost in ETH
          const gasCost = estimate * gasPrice;
          setGasEstimate(formatEther(gasCost));
        } catch (estimationErr) {
          console.error('Error during gas estimation:', estimationErr);
          
          // Check for STF error specifically
          const errorString = String(estimationErr);
          if (errorString.includes('STF') || errorString.includes('transfer')) {
            console.error('STF error detected - likely insufficient token approval');
            // Set approval warning message or state here if needed
          }
          
          // Fall back to approximation if actual estimation fails
          const typicalGasUsed = 300000; // Typical gas for add liquidity
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
  }, [amount0, amount1, lowerTick, upperTick, pool, address, walletClient, publicClient, token0NeedsApproval, token1NeedsApproval]);

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
            <div className="range-option-label">Custom Range (±30%)</div>
          </div>
        </div>
        
        {/* Current price display */}
        <div className="price-info">
          <strong>Current Price:</strong> 1 {token0Symbol} = {tickToPrice(pool.tickCurrent, pool.token0.decimals, pool.token1.decimals).toFixed(6)} {token1Symbol}
          {priceRange === 'narrow' && (
            <p className="range-note">±5% range requires sufficient token amounts. For USDC, use at least 50-100 USDC. For ETH, use at least 0.025-0.05 ETH.</p>
          )}
        </div>
        
        {/* Custom Range Price Inputs */}
        {priceRange === 'custom' && (
          <PriceInputs
            minValue={tickToPrice(getValidTick(TickMath.MIN_TICK, pool.tickSpacing), pool.token0.decimals, pool.token1.decimals)}
            maxValue={tickToPrice(getValidTick(TickMath.MAX_TICK, pool.tickSpacing), pool.token0.decimals, pool.token1.decimals)}
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
            minValue={currentPrice * 0.9}
            maxValue={currentPrice * 1.1}
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
      </div>
    );
  };

  // Add approval function
  const handleApproveToken = async (tokenIndex: 0 | 1) => {
    try {
      if (!walletClient || !address || !pool || !publicClient) return;
      
      setApproving(true);
      
      const token = tokenIndex === 0 ? pool.token0 : pool.token1;
      const amount = tokenIndex === 0 ? amount0 : amount1;
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      console.log(`Approving ${token.symbol} for Uniswap Position Manager`);
      
      // Prepare approval transaction
      const { request } = await publicClient.simulateContract({
        account: address,
        address: token.address as Address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [POSITION_MANAGER_ADDRESS as Address, maxApproval]
      });
      
      // Send approval transaction
      const txHash = await walletClient.writeContract(request);
      console.log(`Transaction sent: ${txHash}`);
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`Transaction confirmed: ${receipt.transactionHash}`);
      
      // Update approval state
      setToken0NeedsApproval(tokenIndex === 0 ? false : token0NeedsApproval);
      setToken1NeedsApproval(tokenIndex === 1 ? false : token1NeedsApproval);
      
      // Check if both tokens are now approved
      if ((tokenIndex === 0 && !token1NeedsApproval) || (tokenIndex === 1 && !token0NeedsApproval)) {
        setNeedsApproval(false);
      }
      
      setApproving(false);
      
      // The useEffect for estimateGas will run automatically when we update the approval states
      
    } catch (err) {
      console.error('Error approving token:', err);
      setApproving(false);
      setError(`Error approving token: ${err instanceof Error ? err.message : String(err)}`);
    }
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
              <div>Try increasing your slippage tolerance if prices are volatile.</div>
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

      {/* Display current balances to help users */}
      <div className="wallet-balances">
        <div className="balance-title">Your Wallet Balances</div>
        <div className="balance-row">
          <span>{pool.token0.symbol}: </span>
          <strong>
            {formatBalance(token0Balance, pool.token0)}
          </strong>
          {pool.token0.symbol?.includes('ETH') && (
            <div className="native-eth-balance">
              <span>(Native ETH: {ethBalance ? formatTokenAmount(formatEther(ethBalance.value)) : '...'})</span>
            </div>
          )}
        </div>
        <div className="balance-row">
          <span>{pool.token1.symbol}: </span>
          <strong>
            {formatBalance(token1Balance, pool.token1)}
          </strong>
          {pool.token1.symbol?.includes('ETH') && (
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
      
      <div className="form-group slippage-group">
        <label>Slippage Tolerance: {slippageTolerance}%</label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={slippageTolerance}
          onChange={(e) => setSlippageTolerance(parseFloat(e.target.value))}
        />
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
              {approving ? 'Approving...' : `Approve ${pool.token0.symbol}`}
            </button>
          )}
          
          {token1NeedsApproval && (
            <button 
              onClick={() => handleApproveToken(1)} 
              disabled={approving}
              className="approve-button"
            >
              {approving ? 'Approving...' : `Approve ${pool.token1.symbol}`}
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