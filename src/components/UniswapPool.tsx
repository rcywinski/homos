import React, { FC, useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatEther } from 'viem';
import {
  WETH,
  USDC,
  FEE_TIERS,
  getOrCreatePool,
  formatPrice,
} from '../utils/uniswap';
import { Pool } from '@uniswap/v3-sdk';
import JSBI from 'jsbi';

const UniswapPool: FC = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [pool, setPool] = useState<Pool | null>(null);
  const [poolAddress, setPoolAddress] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCreatingPool, setIsCreatingPool] = useState(false);

  const calculatePrice = (pool: Pool): number | null => {
    try {
      const sqrtPriceX96 = JSBI.toNumber(pool.sqrtRatioX96);
      const Q96 = Math.pow(2, 96);
      return (sqrtPriceX96 / Q96) * (sqrtPriceX96 / Q96);
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
      const { pool: poolInstance, address: addr, isNew } = await getOrCreatePool(
        publicClient,
        walletClient,
        WETH,
        USDC,
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
    if (isConnected && walletClient) {
      initializePool();
    }
  }, [isConnected, publicClient, walletClient]);

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
            <span className="label">Liquidity:</span>
            <span className="value">
              {formatEther(BigInt(JSBI.toNumber(pool.liquidity)))} ETH
            </span>
          </div>

          <div className="pool-tick">
            <span className="label">Current Tick:</span>
            <span className="value">{pool.tickCurrent}</span>
          </div>

          <div className="pool-sqrt-price">
            <span className="label">Sqrt Price:</span>
            <span className="value">{JSBI.toNumber(pool.sqrtRatioX96)}</span>
          </div>

          <div className="pool-token0-price">
            <span className="label">{pool.token0.symbol} Price:</span>
            <span className="value">
              {(() => {
                const price = calculatePrice(pool);
                return price !== null ? formatPrice(price) : 'Price calculation error';
              })()}
            </span>
          </div>

          <div className="pool-token1-price">
            <span className="label">{pool.token1.symbol} Price:</span>
            <span className="value">
              {(() => {
                const price = calculatePrice(pool);
                return price !== null ? formatPrice(1 / price) : 'Price calculation error';
              })()}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UniswapPool; 