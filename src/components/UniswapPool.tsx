import React, { FC, useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import {
  WETH,
  USDC,
  FEE_TIERS,
  getOrCreatePool,
  formatPrice,
  calculatePoolPrice,
  NETWORKS
} from '../utils/uniswap';
import { Pool } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import JSBI from 'jsbi';
import MarketVolatility from './MarketVolatility';
import '../styles/marketVolatility.css';
import LiquidityManager from './LiquidityManager';
import '../styles/liquidityManager.css';
import '../styles/uniswapPool.css';

interface UniswapPoolProps {
  initialPool?: Pool;
  initialAddress?: string;
}

const UniswapPool: FC<UniswapPoolProps> = ({ initialPool, initialAddress }) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [pool, setPool] = useState<Pool | null>(initialPool || null);
  const [poolAddress, setPoolAddress] = useState<string>(initialAddress || '');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCreatingPool, setIsCreatingPool] = useState(false);

  // Raw pool liquidity (L) is not a token amount — it isn't denominated in
  // ETH, USD, or anything a user recognizes, so show it as a plain scientific
  // number instead of the misleading "X ETH" the legacy code printed.
  const formatLiquidityScientific = (value: bigint): string => {
    const negative = value < 0n;
    const digits = (negative ? -value : value).toString();
    if (digits === '0') return '0';
    const exponent = digits.length - 1;
    const mantissa = digits.length > 1 ? `${digits[0]}.${digits.slice(1, 3)}` : digits;
    return `${negative ? '-' : ''}${mantissa}e${exponent}`;
  };

  const calculatePrice = (pool: Pool): number | null => {
    try {
      const chainId = publicClient?.chain?.id || 11155111; // Default to Sepolia if undefined
      return calculatePoolPrice(
        BigInt(pool.sqrtRatioX96.toString()),
        pool.token0.decimals,
        pool.token1.decimals,
        pool.token0.symbol === 'WETH',
        chainId
      );
    } catch (error) {
      console.error('Error calculating price:', error);
      return null;
    }
  };

  const initializePool = async () => {
    if (!publicClient || !walletClient) {
      setError('Please connect your wallet to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get network config based on chain ID
      const chainId = publicClient.chain?.id || 11155111; // Default to Sepolia if undefined
      const networkConfig = chainId === 1 ? NETWORKS.MAINNET : NETWORKS.SEPOLIA;
      
      // Get appropriate tokens for the current network
      const networkWETH = new Token(
        networkConfig.chainId,
        networkConfig.tokens.WETH.address,
        networkConfig.tokens.WETH.decimals,
        networkConfig.tokens.WETH.symbol
      );
      
      const networkUSDC = new Token(
        networkConfig.chainId,
        networkConfig.tokens.USDC.address,
        networkConfig.tokens.USDC.decimals,
        networkConfig.tokens.USDC.symbol
      );
      
      const { pool: poolInstance, address: addr, isNew } = await getOrCreatePool(
        publicClient,
        walletClient,
        networkWETH,
        networkUSDC,
        FEE_TIERS.MEDIUM
      );

      setPool(poolInstance);
      setPoolAddress(addr);
      setIsCreatingPool(false);
      
      const price = calculatePrice(poolInstance);
      setCurrentPrice(price !== null ? formatPrice(price) : 'Price calculation error');

      if (isNew) {
        setError('Pool created successfully! You can now add liquidity.');
      }
    } catch (err) {
      console.error('Failed to initialize pool:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize pool';
      setError(errorMessage);
      
      if (errorMessage.includes('Failed to get pool')) {
        setIsCreatingPool(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPool && initialAddress) {
      setPool(initialPool);
      setPoolAddress(initialAddress);
      const price = calculatePrice(initialPool);
      setCurrentPrice(price !== null ? formatPrice(price) : 'Price calculation error');
    } else if (isConnected && walletClient) {
      initializePool();
    }
  }, [isConnected, publicClient, walletClient, initialPool, initialAddress]);

  // Add specific effect to handle network changes
  useEffect(() => {
    // Re-initialize when the chain changes
    if (isConnected && publicClient?.chain?.id) {
      if (initialPool && initialAddress) {
        // Recalculate price with new chainId for initialPool
        const price = calculatePrice(initialPool);
        setCurrentPrice(price !== null ? formatPrice(price) : 'Price calculation error');
      } else {
        // Reload the pool data for the new network
        initializePool();
      }
    }
  }, [publicClient?.chain?.id]);

  if (!isConnected) {
    return (
      <div className="pool-info-container">
        <h3>Uniswap V3 Pool Info</h3>
        <div className="message error">
          Please connect your wallet to view pool information
        </div>
      </div>
    );
  }

  return (
    <div className="pool-info-container">
      <h3>Uniswap V3 Pool Info</h3>
      
      {loading ? (
        <div className="loading">
          {isCreatingPool ? 'Creating new pool...' : 'Loading pool data...'}
        </div>
      ) : error ? (
        <div className={`message ${error.includes('successfully') ? 'success' : 'error'}`}>
          {error}
          {!error.includes('successfully') && !error.includes('connect your wallet') && (
            <button 
              onClick={initializePool}
              className="retry-button"
            >
              Retry
            </button>
          )}
        </div>
      ) : pool ? (
        <>
          <div className="pool-details">
            <div className="pool-pair">
              <span className="token">{pool.token0.symbol}</span>
              <span className="separator">/</span>
              <span className="token">{pool.token1.symbol}</span>
            </div>
            
            <div className="pool-price">
              <span className="label">Current Price:</span>
              <span className="value">{currentPrice}</span>
            </div>

            <div className="pool-address">
              <span className="label">Pool Address:</span>
              <span className="value">{poolAddress}</span>
            </div>

            <div className="pool-fee">
              <span className="label">Fee Tier:</span>
              <span className="value">{pool.fee / 10000}%</span>
            </div>

            <div className="pool-liquidity">
              <span className="label">Active liquidity (L):</span>
              <span className="value">
                {formatLiquidityScientific(BigInt(pool.liquidity.toString()))}
              </span>
            </div>

            <div className="pool-tick">
              <span className="label">Current Tick:</span>
              <span className="value">{pool.tickCurrent}</span>
            </div>

            <div className="pool-sqrt-price">
              <span className="label">Sqrt Price:</span>
              <span className="value">{pool.sqrtRatioX96.toString()}</span>
            </div>

            <div className="pool-token0-price">
              <span className="label">
                {pool.token0.symbol === 'WETH' 
                  ? `1 ${pool.token0.symbol}:` 
                  : `1 ${pool.token1.symbol}:`}
              </span>
              <span className="value">
                {(() => {
                  const price = calculatePrice(pool);
                  if (price === null) return 'Price calculation error';
                  
                  if (pool.token0.symbol === 'WETH') {
                    // If WETH is token0, show "1 WETH = X USDC/USDT"
                    return formatPrice(1 / price) + ` ${pool.token1.symbol}`;
                  } else {
                    // If WETH is token1, show "1 WETH = X USDC/USDT"
                    return formatPrice(price) + ` ${pool.token0.symbol}`;
                  }
                })()}
              </span>
            </div>

            <div className="pool-token1-price">
              <span className="label">
                {pool.token0.symbol !== 'WETH' 
                  ? `1 ${pool.token0.symbol} =` 
                  : `1 ${pool.token1.symbol} =`}
              </span>
              <span className="value">
                {(() => {
                  const price = calculatePrice(pool);
                  if (price === null) return 'Price calculation error';
                  
                  if (pool.token1.symbol === 'WETH') {
                    // If WETH is token1, show "1 USDC/USDT = X WETH"
                    return price.toFixed(8) + ` ${pool.token1.symbol}`;
                  } else {
                    // If WETH is token0, show "1 USDC/USDT = X WETH"
                    return (1 / price).toFixed(8) + ` ${pool.token0.symbol}`;
                  }
                })()}
              </span>
            </div>
          </div>
          
          {/* Add Market Volatility Component */}
          <MarketVolatility 
            token0Symbol={pool.token0.symbol || 'Unknown'} 
            token1Symbol={pool.token1.symbol || 'Unknown'} 
            poolAddress={poolAddress}
          />
          
          {/* Add Liquidity Manager Component */}
          <LiquidityManager
            pool={pool}
            poolAddress={poolAddress}
          />
        </>
      ) : null}
    </div>
  );
};

export default UniswapPool; 