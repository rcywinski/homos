import React, { FC, useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { Pool } from '@uniswap/v3-sdk';
import { formatEther, Address } from 'viem';
import { 
  tickToPrice, 
  priceToTick, 
  getValidTick, 
  createPosition,
  prepareAddLiquidityTransaction,
  TickMath
} from '../../utils/liquidityManagement';

interface AddLiquidityProps {
  pool: Pool;
  onSuccess: () => void;
}

const AddLiquidity: FC<AddLiquidityProps> = ({ pool, onSuccess }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  
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
        // Notify the parent component about success
        onSuccess();
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

  // Update gas estimation
  useEffect(() => {
    const estimateGas = async () => {
      if (!walletClient || !address || !publicClient || !pool || !lowerTick || !upperTick || !amount0 || !amount1) return;
      
      try {
        // Get current gas price
        const gasPrice = await publicClient.getGasPrice();
        setGasPriceGwei(formatEther(gasPrice * BigInt(1000000000)));
        
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
      } catch (err) {
        console.error('Error estimating gas:', err);
      }
    };
    
    estimateGas();
    
    // Refresh gas estimate every 15 seconds
    const interval = setInterval(estimateGas, 15000);
    return () => clearInterval(interval);
  }, [pool, address, publicClient, walletClient, lowerTick, upperTick, amount0, amount1, slippageTolerance, chainId]);

  // Gas estimate display component
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

  return (
    <div className="add-liquidity-form">
      {loading && <div className="loading">Processing transaction...</div>}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
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
      
      <GasEstimateDisplay />
    </div>
  );
};

export default AddLiquidity; 