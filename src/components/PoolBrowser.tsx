import React, { FC, useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { useChainId } from 'wagmi';
import { Pool } from '@uniswap/v3-sdk';
import { FeeAmount } from '@uniswap/v3-sdk';
import { 
  WETH, 
  USDC, 
  USDT, 
  getExistingPool, 
  NETWORKS, 
  NetworkConfig, 
  fetchPoolPriceFromGraph,
  calculatePoolPrice 
} from '../utils/uniswap';
import { formatPrice } from '../utils/uniswap';
import { Token } from '@uniswap/sdk-core';
import JSBI from 'jsbi';
import ExpandableSection from './ExpandableSection';
import UniswapPool from './UniswapPool';

interface PoolInfo {
  pool: Pool;
  address: string;
  feeTier: number;
  liquidity: string;
  price: string;
  token0Symbol: string;
  token1Symbol: string;
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
  const chainId = useChainId();

  const getNetworkConfig = (): NetworkConfig => {
    return chainId === 1 ? NETWORKS.MAINNET : NETWORKS.SEPOLIA;
  };

  const getTokensForNetwork = () => {
    const config = getNetworkConfig();
    const networkTokens = {
      WETH: new Token(
        config.chainId,
        config.tokens.WETH.address,
        config.tokens.WETH.decimals,
        config.tokens.WETH.symbol
      ),
      USDC: new Token(
        config.chainId,
        config.tokens.USDC.address,
        config.tokens.USDC.decimals,
        config.tokens.USDC.symbol
      ),
      USDT: new Token(
        config.chainId,
        config.tokens.USDT.address,
        config.tokens.USDT.decimals,
        config.tokens.USDT.symbol
      )
    };

    return [
      { token0: networkTokens.USDC, token1: networkTokens.WETH, name: 'USDC/WETH' },
      { token0: networkTokens.USDT, token1: networkTokens.WETH, name: 'USDT/WETH' }
    ] as const;
  };

  const calculatePrice = async (pool: Pool, address: string): Promise<string> => {
    try {
      // Calculate price locally
      const price = calculatePoolPrice(
        BigInt(pool.sqrtRatioX96.toString()),
        pool.token0.decimals,
        pool.token1.decimals,
        pool.token0.symbol === 'WETH',
        chainId
      );

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
    if (!publicClient) {
      setError('Wallet connection required');
      return;
    }

    setLoading(true);
    setError('');
    const foundPools: PoolInfo[] = [];
    const networkConfig = getNetworkConfig();
    const tokenPairs = getTokensForNetwork();

    try {
      for (const { token0, token1, name } of tokenPairs) {
        for (const { fee, label } of FEE_TIERS) {
          try {
            const result = await getExistingPool(
              publicClient,
              token0,
              token1,
              fee,
              networkConfig
            );

            if (result) {
              const { pool, address } = result;
              const price = await calculatePrice(pool, address);
              
              foundPools.push({
                pool,
                address,
                feeTier: fee,
                liquidity: pool.liquidity.toString(),
                price,
                token0Symbol: token0.symbol || 'Unknown',
                token1Symbol: token1.symbol || 'Unknown'
              });
            }
          } catch (err) {
            console.error(`Error checking pool for ${name} with fee tier ${label}:`, err);
          }
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

  const groupPoolsByPair = (pools: PoolInfo[]) => {
    const tokenPairs = getTokensForNetwork();
    return tokenPairs.map(pair => ({
      pairName: pair.name,
      pools: pools.filter(p => 
        p.token0Symbol === pair.token0.symbol && 
        p.token1Symbol === pair.token1.symbol
      ).sort((a, b) => a.feeTier - b.feeTier)
    }));
  };

  useEffect(() => {
    if (publicClient && chainId) {
      fetchPools();
    }
  }, [publicClient, chainId]);

  // Add a specific effect to handle network changes
  useEffect(() => {
    // This will ensure prices are recalculated when the chainId changes
    if (pools.length > 0 && chainId) {
      // Force refresh pool data when network changes
      fetchPools();
    }
  }, [chainId]);

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
                <div className="pairs-container">
                  {groupPoolsByPair(pools).map(({ pairName, pools }) => (
                    <div key={pairName} className="pair-section">
                      <div className="pair-header">
                        <h4>{pairName}</h4>
                      </div>
                      <div className="pools-grid">
                        {pools.map((poolInfo) => (
                          <div 
                            key={poolInfo.address} 
                            className="pool-card"
                            onClick={() => handlePoolSelect(poolInfo.pool, poolInfo.address)}
                          >
                            <div className="pool-card-header">
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
                    </div>
                  ))}
                  {pools.length === 0 && (
                    <div className="no-pools">
                      No pools found. Create one by selecting a fee tier.
                    </div>
                  )}
                </div>
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