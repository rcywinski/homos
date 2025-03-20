import React, { FC, useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { Pool } from '@uniswap/v3-sdk';
import { FeeAmount } from '@uniswap/v3-sdk';
import { WETH, USDC, getOrCreatePool } from '../utils/uniswap';
import { formatPrice } from '../utils/uniswap';
import JSBI from 'jsbi';
import ExpandableSection from './ExpandableSection';
import UniswapPool from './UniswapPool';

interface PoolInfo {
  pool: Pool;
  address: string;
  feeTier: number;
  liquidity: string;
  price: string;
}

const FEE_TIERS = [
  { fee: FeeAmount.LOWEST, label: '0.01%' },
  { fee: FeeAmount.LOW, label: '0.05%' },
  { fee: FeeAmount.MEDIUM, label: '0.30%' },
  { fee: FeeAmount.HIGH, label: '1%' }
];

const PoolBrowser: FC = () => {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedPool, setSelectedPool] = useState<{ pool: Pool; address: string } | null>(null);
  
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const calculatePrice = (pool: Pool): string => {
    try {
      const sqrtPriceX96 = JSBI.toNumber(pool.sqrtRatioX96);
      const Q96 = Math.pow(2, 96);
      const price = (sqrtPriceX96 / Q96) * (sqrtPriceX96 / Q96);
      return formatPrice(price);
    } catch (error) {
      console.error('Error calculating price:', error);
      return 'Price calculation error';
    }
  };

  const handlePoolSelect = (pool: Pool, address: string) => {
    setSelectedPool({ pool, address });
  };

  const handleBackToList = () => {
    setSelectedPool(null);
  };

  const fetchPools = async () => {
    if (!publicClient || !walletClient) {
      setError('Please connect your wallet to continue');
      return;
    }

    setLoading(true);
    setError('');
    const foundPools: PoolInfo[] = [];

    try {
      // Try to fetch pools for each fee tier
      for (const { fee, label } of FEE_TIERS) {
        try {
          const { pool, address } = await getOrCreatePool(
            publicClient,
            walletClient,
            WETH,
            USDC,
            fee
          );

          foundPools.push({
            pool,
            address,
            feeTier: fee,
            liquidity: pool.liquidity.toString(),
            price: calculatePrice(pool)
          });
        } catch (err) {
          console.log(`No pool found for fee tier ${label}`);
        }
      }

      setPools(foundPools);
    } catch (err) {
      console.error('Error fetching pools:', err);
      setError('Failed to fetch pools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (publicClient && walletClient) {
      fetchPools();
    }
  }, [publicClient, walletClient]);

  return (
    <ExpandableSection title="Uniswap V3 Pools">
      <div className="pools-container">
        <div className="pool-browser">
          {loading ? (
            <div className="loading">Loading pools...</div>
          ) : error ? (
            <div className="error">
              {error}
              <button onClick={fetchPools} className="retry-button">
                Retry
              </button>
            </div>
          ) : (
            <>
              {!selectedPool ? (
                <>
                  <div className="pools-grid">
                    {pools.map((poolInfo) => (
                      <div 
                        key={poolInfo.address} 
                        className="pool-card"
                        onClick={() => handlePoolSelect(poolInfo.pool, poolInfo.address)}
                      >
                        <div className="pool-card-header">
                          <span className="token-pair">USDC/WETH</span>
                          <span className="fee-tier">{FEE_TIERS.find(ft => ft.fee === poolInfo.feeTier)?.label}</span>
                        </div>
                        <div className="pool-card-body">
                          <div className="pool-info-row">
                            <span className="label">Price:</span>
                            <span className="value">{poolInfo.price}</span>
                          </div>
                          <div className="pool-info-row">
                            <span className="label">Liquidity:</span>
                            <span className="value">{poolInfo.liquidity}</span>
                          </div>
                          <div className="pool-info-row">
                            <span className="label">Address:</span>
                            <span className="value address">{`${poolInfo.address.slice(0, 6)}...${poolInfo.address.slice(-4)}`}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pools.length === 0 && (
                    <div className="no-pools">
                      No pools found. Create one by selecting a fee tier.
                    </div>
                  )}
                </>
              ) : (
                <div className="selected-pool-container">
                  <button onClick={handleBackToList} className="back-button">
                    ← Back to Pools
                  </button>
                  <UniswapPool 
                    initialPool={selectedPool.pool}
                    initialAddress={selectedPool.address}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ExpandableSection>
  );
};

export default PoolBrowser; 