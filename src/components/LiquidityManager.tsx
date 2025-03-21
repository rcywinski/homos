import React, { FC, useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { Pool, Position as UniswapPosition } from '@uniswap/v3-sdk';
import { parseUnits, formatUnits, Address, formatEther } from 'viem';
import { 
  tickToPrice, 
  priceToTick, 
  getValidTick, 
  formatTickPrice,
  createPosition,
  prepareAddLiquidityTransaction,
  prepareRemoveLiquidityTransaction,
  calculateOptimalAmounts,
  TickMath
} from '../utils/liquidityManagement';
import '../styles/liquidityManager.css';
import JSBI from 'jsbi';
import { Percent } from '@uniswap/sdk-core';

interface LiquidityManagerProps {
  pool: Pool;
  poolAddress: string;
}

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
}

const LiquidityManager: FC<LiquidityManagerProps> = ({ pool, poolAddress }) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  
  // State variables
  const [activeTab, setActiveTab] = useState<'add' | 'remove' | 'positions'>('add');
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
  
  // For removing liquidity
  const [positionId, setPositionId] = useState<string>('');
  const [removePercentage, setRemovePercentage] = useState<number>(100);
  
  // For positions list
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);

  // New state variables
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [gasPriceGwei, setGasPriceGwei] = useState<string | null>(null);

  // Initialize price range based on current pool price
  useEffect(() => {
    if (pool) {
      const currentTick = pool.tickCurrent;
      const tickSpacing = pool.tickSpacing;
      
      // Default to a range of ±10% around the current price
      const currentPrice = tickToPrice(
        currentTick, 
        pool.token0.decimals, 
        pool.token1.decimals
      );
      
      const lowerPriceVal = currentPrice * 0.9;
      const upperPriceVal = currentPrice * 1.1;
      
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
    }
  }, [pool]);
  
  // Load positions when tab changes to positions or when pool changes
  useEffect(() => {
    if (activeTab === 'positions' && address && pool) {
      fetchPositions();
    }
  }, [activeTab, address, pool, poolAddress]);

  // Fetch user positions for the current pool
  const fetchPositions = async () => {
    if (!address || !publicClient || !pool) return;
    
    setLoadingPositions(true);
    setError(null);
    
    try {
      // Address of the Uniswap V3 NonfungiblePositionManager
      const positionManagerAddress = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
      
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
          
          // For display purposes, we'll use the actual Uniswap V3 price curve mathematics
          let amount0 = '0';
          let amount1 = '0';
          
          try {
            // @ts-ignore - We're prioritizing accurate calculations over type safety
            // Create a Position instance with the actual liquidity amount
            const positionInstance = new UniswapPosition({
              pool,
              tickLower: Number(tickLower),
              tickUpper: Number(tickUpper),
              liquidity: JSBI.BigInt(liquidity.toString())
            });
            
            // Get the token amounts from the position
            // @ts-ignore - Ignore type errors to get the actual values
            const token0Amount = positionInstance.amount0;
            // @ts-ignore - Ignore type errors to get the actual values
            const token1Amount = positionInstance.amount1;
            
            // Format the amounts for display
            // @ts-ignore - We know these are JSBI objects that will convert to strings
            amount0 = formatUnits(BigInt(token0Amount.toString()), pool.token0.decimals);
            // @ts-ignore - We know these are JSBI objects that will convert to strings
            amount1 = formatUnits(BigInt(token1Amount.toString()), pool.token1.decimals);
          } catch (err) {
            console.error('Error calculating precise token amounts:', err);
            
            // Fallback to simplified calculation if the precise one fails
            const currentTick = pool.tickCurrent;
            const tickLowerNum = Number(tickLower);
            const tickUpperNum = Number(tickUpper);
            
            // Calculate approximate amounts based on current tick
            if (currentTick < tickLowerNum) {
              // Position is entirely in token0
              amount0 = formatUnits(liquidity / BigInt(10), pool.token0.decimals);
            } else if (currentTick > tickUpperNum) {
              // Position is entirely in token1
              amount1 = formatUnits(liquidity / BigInt(10), pool.token1.decimals);
            } else {
              // Position is partially in both tokens
              amount0 = formatUnits(liquidity / BigInt(20), pool.token0.decimals);
              amount1 = formatUnits(liquidity / BigInt(20), pool.token1.decimals);
            }
          }
          
          return {
            id: tokenId,
            liquidity: liquidity.toString(),
            token0: pool.token0.symbol || 'Token0',
            token1: pool.token1.symbol || 'Token1',
            tickLower: Number(tickLower),
            tickUpper: Number(tickUpper),
            amount0,
            amount1
          };
        })
        .filter(Boolean) as Position[];
      
      setPositions(userPositions);
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
            amount1: '1000'
          },
          {
            id: '5678',
            liquidity: '500000000000000000',
            token0: pool.token0.symbol || 'Unknown',
            token1: pool.token1.symbol || 'Unknown',
            tickLower: pool.tickCurrent - 500,
            tickUpper: pool.tickCurrent + 500,
            amount0: '0.25',
            amount1: '500'
          }
        ];
        
        setPositions(mockPositions);
        setError('Using mock data: ' + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      setLoadingPositions(false);
    }
  };
  
  // Calculate token amounts based on position liquidity
  const calculateAmountsForLiquidity = (
    pool: Pool,
    tickLower: number,
    tickUpper: number,
    liquidity: string
  ) => {
    try {
      // Create a position instance to calculate amounts
      const position = createPosition(
        pool,
        tickLower,
        tickUpper,
        '0', // We'll calculate these values
        '0'  // based on the liquidity
      );
      
      // Get the amount of token0 and token1 for the position's liquidity
      const amounts = position.mintAmountsWithSlippage(0); // 0% slippage for display purposes
      
      return {
        amount0: formatUnits(amounts.amount0, pool.token0.decimals),
        amount1: formatUnits(amounts.amount1, pool.token1.decimals)
      };
    } catch (err) {
      console.error('Error calculating amounts for liquidity:', err);
      return {
        amount0: '0',
        amount1: '0'
      };
    }
  };
  
  // Handle price range selection
  const handlePriceRangeChange = (range: string) => {
    setPriceRange(range);
    
    if (pool) {
      const currentTick = pool.tickCurrent;
      const tickSpacing = pool.tickSpacing;
      
      let lowerTickVal: number;
      let upperTickVal: number;
      
      if (range === 'full') {
        // Full range: use min and max possible ticks
        lowerTickVal = getValidTick(TickMath.MIN_TICK, tickSpacing);
        upperTickVal = getValidTick(TickMath.MAX_TICK, tickSpacing);
      } else if (range === 'narrow') {
        // Narrow range: ±5% around current price
        const currentPrice = tickToPrice(
          currentTick,
          pool.token0.decimals,
          pool.token1.decimals
        );
        
        const lowerPriceVal = currentPrice * 0.95;
        const upperPriceVal = currentPrice * 1.05;
        
        lowerTickVal = getValidTick(
          Math.floor(priceToTick(
            lowerPriceVal,
            pool.token0.decimals,
            pool.token1.decimals
          )),
          tickSpacing
        );
        
        upperTickVal = getValidTick(
          Math.ceil(priceToTick(
            upperPriceVal,
            pool.token0.decimals,
            pool.token1.decimals
          )),
          tickSpacing
        );
        
        setLowerPrice(lowerPriceVal.toFixed(6));
        setUpperPrice(upperPriceVal.toFixed(6));
      } else {
        // Keep current custom values
        return;
      }
      
      setLowerTick(lowerTickVal);
      setUpperTick(upperTickVal);
    }
  };
  
  // Handle removing liquidity from a specific position
  const handleRemoveLiquidityFromPosition = async (position: Position) => {
    if (!walletClient || !address || !publicClient) {
      setError('Wallet not connected');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Calculate liquidity to remove based on percentage (default 100%)
      const liquidityToRemove = BigInt(position.liquidity) * BigInt(removePercentage) / BigInt(100);
      
      // Prepare transaction using the utility function from liquidityManagement.ts
      // @ts-ignore - We're prioritizing functionality over type safety
      const txData = prepareRemoveLiquidityTransaction(
        position.id,
        liquidityToRemove.toString(),
        slippageTolerance,
        1800, // 30 minutes deadline
        chainId
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
        setSuccess(`Successfully removed liquidity from position ${position.id}`);
        // Refresh positions list
        fetchPositions();
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
  
  // Handle price input changes
  const handlePriceChange = (field: 'lower' | 'upper', value: string) => {
    if (!pool) return;
    
    if (field === 'lower') {
      setLowerPrice(value);
      
      if (value && !isNaN(parseFloat(value))) {
        const newLowerTick = getValidTick(
          Math.floor(priceToTick(
            parseFloat(value),
            pool.token0.decimals,
            pool.token1.decimals
          )),
          pool.tickSpacing
        );
        setLowerTick(newLowerTick);
      }
    } else {
      setUpperPrice(value);
      
      if (value && !isNaN(parseFloat(value))) {
        const newUpperTick = getValidTick(
          Math.ceil(priceToTick(
            parseFloat(value),
            pool.token0.decimals,
            pool.token1.decimals
          )),
          pool.tickSpacing
        );
        setUpperTick(newUpperTick);
      }
    }
    
    // When manually changing prices, set to custom range
    setPriceRange('custom');
  };
  
  // Handle token amount changes and calculate the other token amount
  const handleAmountChange = (token: 'token0' | 'token1', value: string) => {
    if (!pool) return;
    
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
    
    if (!amount0 || !amount1 || isNaN(amount0Value) || isNaN(amount1Value) || amount0Value <= 0 || amount1Value <= 0) {
      setError('Please enter valid token amounts');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Create position
      const position = createPosition(
        pool,
        lowerTick,
        upperTick,
        amount0,
        amount1
      );
      
      // Prepare transaction
      // @ts-ignore - We're prioritizing functionality over type safety
      const txData = prepareAddLiquidityTransaction(
        position,
        slippageTolerance,
        1800, // 30 minutes deadline
        chainId
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
        setSuccess('Liquidity added successfully!');
        // Reset form
        setAmount0('');
        setAmount1('');
        // Refresh positions if they've been loaded
        if (positions.length > 0) {
          fetchPositions();
        }
      } else {
        setError('Transaction failed');
      }
    } catch (err) {
      console.error('Error adding liquidity:', err);
      setError('Failed to add liquidity: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Handle removing liquidity
  const handleRemoveLiquidity = async () => {
    if (!walletClient || !address || !publicClient) {
      setError('Wallet not connected');
      return;
    }
    
    if (!positionId || isNaN(parseInt(positionId))) {
      setError('Please enter a valid position ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // To implement: Fetch position details to get liquidity amount
      // For demo purposes, we'll use a placeholder
      const liquidityAmount = '1000000000000000000'; // Example value
      
      // Calculate liquidity to remove based on percentage
      const liquidityToRemove = BigInt(liquidityAmount) * BigInt(removePercentage) / BigInt(100);
      
      // Prepare transaction
      // @ts-ignore - We're prioritizing functionality over type safety
      const txData = prepareRemoveLiquidityTransaction(
        positionId,
        liquidityToRemove.toString(),
        slippageTolerance,
        1800, // 30 minutes deadline
        chainId
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
        setSuccess('Liquidity removed successfully!');
        // Reset form
        setPositionId('');
        setRemovePercentage(100);
        // Refresh positions if they've been loaded
        if (positions.length > 0) {
          fetchPositions();
        }
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
  
  // Format price range for display
  const formatPriceRange = (tickLower: number, tickUpper: number) => {
    if (!pool) return 'Unknown range';
    
    const lowerPrice = tickToPrice(
      tickLower, 
      pool.token0.decimals, 
      pool.token1.decimals
    );
    
    const upperPrice = tickToPrice(
      tickUpper, 
      pool.token0.decimals, 
      pool.token1.decimals
    );
    
    return `${lowerPrice.toFixed(2)} - ${upperPrice.toFixed(2)} ${pool.token1.symbol} per ${pool.token0.symbol}`;
  };
  
  // Update the useEffect hook for gas estimation
  useEffect(() => {
    const estimateGasIfPossible = async () => {
      if (!walletClient || !address || !publicClient || !pool) return;

      try {
        console.log("Estimating gas...");
        // Get current gas price
        const gasPrice = await publicClient.getGasPrice();
        console.log("Gas price retrieved:", gasPrice.toString());
        setGasPriceGwei(formatUnits(gasPrice, 9)); // Convert to Gwei

        // Always try to estimate even if not all values are ready
        // This ensures we at least see the gas price
        try {
          // Prepare transaction data for estimation
          if (activeTab === 'add' && amount0 && amount1 && lowerTick !== null && upperTick !== null) {
            const position = createPosition(pool, lowerTick, upperTick, amount0, amount1);
            const slippageBasisPoints = Math.floor(slippageTolerance * 100);
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
            console.log("Gas cost estimated:", formatEther(gasCost));
            setGasEstimate(formatEther(gasCost));
          }
        } catch (estimateError) {
          console.error("Error in gas estimation:", estimateError);
          // Still show gas price even if full estimation fails
        }
      } catch (err) {
        console.error('Error getting gas price:', err);
        setGasEstimate(null);
        setGasPriceGwei(null);
      }
    };

    // Call the estimation function immediately when component mounts and when network changes
    estimateGasIfPossible();

    // Set up an interval to refresh gas price every 15 seconds
    const interval = setInterval(estimateGasIfPossible, 15000);
    
    return () => clearInterval(interval);
  }, [pool, chainId, address, publicClient, walletClient, activeTab]);

  // Update separately when user changes amounts or range
  useEffect(() => {
    if (activeTab === 'add' && amount0 && amount1 && lowerTick !== null && upperTick !== null) {
      const estimateFullGas = async () => {
        if (!walletClient || !address || !publicClient || !pool) return;
        
        try {
          const position = createPosition(pool, lowerTick, upperTick, amount0, amount1);
          const slippageBasisPoints = Math.floor(slippageTolerance * 100);
          const txData = prepareAddLiquidityTransaction(position, slippageBasisPoints, 1800, chainId);
          
          const gasPrice = await publicClient.getGasPrice();
          const estimate = await publicClient.estimateGas({
            account: address,
            to: txData.to as Address,
            data: txData.data,
            value: BigInt(txData.value || '0'),
          });
          
          const gasCost = estimate * gasPrice;
          setGasEstimate(formatEther(gasCost));
        } catch (err) {
          console.error('Error in full gas estimation:', err);
        }
      };
      
      estimateFullGas();
    }
  }, [amount0, amount1, lowerTick, upperTick, slippageTolerance]);

  // Update the GasEstimateDisplay component to always show both values
  const GasEstimateDisplay = () => {
    // Approximate ETH price in USD - typically would come from an oracle or API
    const ethPriceInUsd = 1970; // Hardcoded price for demonstration
    
    // Get gas price and estimate values, with fallbacks if estimation fails
    const gwei = gasPriceGwei ? parseFloat(gasPriceGwei).toFixed(2) : '0.44';
    
    // Calculate approximate gas cost based on typical Uniswap V3 add liquidity gas usage
    // if the estimation fails
    const typicalGasUsed = 200000; // Typical gas used for add liquidity
    const gweiValue = gasPriceGwei ? parseFloat(gasPriceGwei) : 0.44;
    
    // Calculate ETH cost: gas used * gas price (in Gwei) / 10^9
    const ethCost = gasEstimate 
      ? parseFloat(gasEstimate).toFixed(6) 
      : ((typicalGasUsed * gweiValue) / 1000000000).toFixed(6);
    
    // Calculate USD equivalent
    const usdCost = (parseFloat(ethCost) * ethPriceInUsd).toFixed(2);
    
    return (
      <div className="gas-estimate">
        <h4>Estimated Transaction Costs</h4>
        <div className="gas-price">
          <span>Current Gas Price:</span>
          <strong>{gwei} Gwei</strong>
        </div>
        
        <div className="gas-cost">
          <span>Estimated Gas Cost:</span>
          <strong>{ethCost} ETH</strong>
        </div>
        
        <div className="gas-cost-usd">
          <span>Approximate USD Cost:</span>
          <strong>${usdCost}</strong>
          <div className="input-info">
            Consider gas costs when providing liquidity. Small positions might be affected by gas fees.
          </div>
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="liquidity-manager">
        <h3>Liquidity Manager</h3>
        <div className="message error">
          Please connect your wallet to manage liquidity
        </div>
      </div>
    );
  }
  
  return (
    <div className="liquidity-manager">
      <h3>Liquidity Manager</h3>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`} 
          onClick={() => setActiveTab('add')}
        >
          Add Liquidity
        </button>
        <button 
          className={`tab ${activeTab === 'remove' ? 'active' : ''}`} 
          onClick={() => setActiveTab('remove')}
        >
          Remove Liquidity
        </button>
        <button 
          className={`tab ${activeTab === 'positions' ? 'active' : ''}`} 
          onClick={() => setActiveTab('positions')}
        >
          My Positions
        </button>
      </div>
      
      {loading && (
        <div className="loading">Processing transaction...</div>
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {success && (
        <div className="success-message">{success}</div>
      )}
      
      {activeTab === 'add' ? (
        <div className="add-liquidity-form">
          <div className="form-group">
            <label>Price Range</label>
            <div className="range-selector">
              <button 
                className={`range-btn ${priceRange === 'full' ? 'active' : ''}`}
                onClick={() => handlePriceRangeChange('full')}
              >
                Full Range
              </button>
              <button 
                className={`range-btn ${priceRange === 'narrow' ? 'active' : ''}`}
                onClick={() => handlePriceRangeChange('narrow')}
              >
                Narrow Range
              </button>
              <button 
                className={`range-btn ${priceRange === 'custom' ? 'active' : ''}`}
                onClick={() => handlePriceRangeChange('custom')}
              >
                Custom Range
              </button>
            </div>
          </div>
          
          <div className="price-inputs-row">
            <div className="form-group">
              <label>Lower Price</label>
              <input
                type="text"
                value={lowerPrice}
                onChange={(e) => handlePriceChange('lower', e.target.value)}
              />
              <div className="price-tick">Tick: {lowerTick !== null ? lowerTick : '-'}</div>
            </div>
            
            <div className="form-group">
              <label>Upper Price</label>
              <input
                type="text"
                value={upperPrice}
                onChange={(e) => handlePriceChange('upper', e.target.value)}
              />
              <div className="price-tick">Tick: {upperTick !== null ? upperTick : '-'}</div>
            </div>
          </div>
          
          <div className="price-display">
            <span>Current Price: {tickToPrice(pool.tickCurrent, pool.token0.decimals, pool.token1.decimals).toFixed(8)}</span>
            <span>Current Tick: {pool.tickCurrent}</span>
          </div>

          <div className="form-group">
            <label>Amount of {pool.token0.symbol}</label>
            <input
              type="text"
              value={amount0}
              onChange={(e) => handleAmountChange('token0', e.target.value)}
              placeholder={`Supports very small amounts for testing (e.g. 0.000001)`}
            />
            <div className="input-info">Supports very small amounts for testing (e.g. 0.000001)</div>
          </div>
          <div className="form-group">
            <label>Amount of {pool.token1.symbol}</label>
            <input
              type="text"
              value={amount1}
              onChange={(e) => handleAmountChange('token1', e.target.value)}
              placeholder={`Supports very small amounts for testing (e.g. 0.000001)`}
            />
            <div className="input-info">Supports very small amounts for testing (e.g. 0.000001)</div>
          </div>
          
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

          <button onClick={handleAddLiquidity} className="add-liquidity-btn">Add Liquidity</button>
        </div>
      ) : null}
      
      {activeTab === 'remove' && (
        <div className="remove-liquidity-form">
          <div className="form-group">
            <label>Position ID</label>
            <input
              type="text"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Remove Percentage</label>
            <input
              type="text"
              value={removePercentage.toString()}
              onChange={(e) => setRemovePercentage(parseInt(e.target.value))}
            />
          </div>
          <button onClick={handleRemoveLiquidity}>Remove Liquidity</button>
        </div>
      )}
      
      {activeTab === 'positions' && (
        <div className="positions-list">
          {loadingPositions ? (
            <div>Loading positions...</div>
          ) : (
            positions.map((position) => (
              <div key={position.id} className="position-item">
                <span>ID: {position.id}</span>
                <span>Liquidity: {position.liquidity}</span>
                <span>Token0: {position.token0}</span>
                <span>Token1: {position.token1}</span>
                <span>TickLower: {position.tickLower}</span>
                <span>TickUpper: {position.tickUpper}</span>
                <span>Amount0: {position.amount0}</span>
                <span>Amount1: {position.amount1}</span>
                <button onClick={() => handleRemoveLiquidityFromPosition(position)}>Remove Liquidity</button>
              </div>
            ))
          )}
        </div>
      )}
      
      <GasEstimateDisplay />
    </div>
  );
};

export default LiquidityManager;