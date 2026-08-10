import React, { FC, useState, useEffect } from 'react';
import { usePublicClient, useWalletClient, useChainId, useSwitchChain } from 'wagmi';
import { Pool, FeeAmount } from '@uniswap/v3-sdk';
import { getExistingPool } from '../utils/uniswap';
import { sqrtPriceX96ToHumanPrice } from '../utils/v3math';
import { OBSERVED_PAIRS, ROLE_LABELS, ObservedPair } from '../config/pools';
import ExpandableSection from './ExpandableSection';
import TopPools from './TopPools';
import UniswapPool from './UniswapPool';

interface PoolInfo {
  pool: Pool;
  address: string;
  feeTier: number;
  price: string;
  pairName: string;
  chainId: number;
  chainName: string;
  role?: string;
}

const TIER_LABELS: Record<number, string> = {
  [FeeAmount.LOWEST]: '0.01%',
  [FeeAmount.LOW]: '0.05%',
  [FeeAmount.MEDIUM]: '0.30%',
  [FeeAmount.HIGH]: '1%',
};

/**
 * Generic display price using exact math (see v3math.ts):
 * - stable in pair  -> "$X" per the other token
 * - otherwise       -> "1 <base> = X <quote>" (base = token1 by convention)
 */
const displayPrice = (pool: Pool): string => {
  const sqrt = BigInt(pool.sqrtRatioX96.toString());
  const p = sqrtPriceX96ToHumanPrice(sqrt, pool.token0.decimals, pool.token1.decimals); // token1 per token0
  const sym0 = pool.token0.symbol || '';
  const sym1 = pool.token1.symbol || '';
  const stable0 = sym0.includes('USD') || sym0.includes('DAI');
  const stable1 = sym1.includes('USD') || sym1.includes('DAI');

  const usd = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  if (stable0 && !stable1) return `${usd(1 / p)} / ${sym1}`; // token1 priced in stable token0
  if (stable1 && !stable0) return `${usd(p)} / ${sym0}`; // token0 priced in stable token1
  if (stable0 && stable1) return `${p.toFixed(5)} ${sym1}/${sym0}`;
  // no stable (e.g. cbBTC/WETH): price token1 in token0 or vice versa — show token1 per token0 inverted for readability
  return `1 ${sym1} = ${(1 / p).toFixed(4)} ${sym0}`;
};

const PoolBrowser: FC = () => {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedPool, setSelectedPool] = useState<{ pool: Pool; address: string } | null>(null);
  const [switching, setSwitching] = useState<boolean>(false);

  const walletChainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  // One read-only client per configured chain (independent of wallet's network)
  const clients: Record<number, ReturnType<typeof usePublicClient>> = {
    1: usePublicClient({ chainId: 1 }),
    8453: usePublicClient({ chainId: 8453 }),
  };

  const fetchPools = async () => {
    setLoading(true);
    setError('');
    const found: PoolInfo[] = [];

    for (const pair of OBSERVED_PAIRS) {
      const client = clients[pair.chainId];
      if (!client) continue;
      for (const fee of pair.feeTiers) {
        try {
          const result = await getExistingPool(client, pair.token0, pair.token1, fee, pair.networkConfig);
          if (result) {
            found.push({
              pool: result.pool,
              address: result.address,
              feeTier: fee,
              price: displayPrice(result.pool),
              pairName: pair.name,
              chainId: pair.chainId,
              chainName: pair.chainName,
              role: pair.role,
            });
          }
        } catch (err) {
          console.error(`Pool lookup failed: ${pair.chainName} ${pair.name} ${TIER_LABELS[fee]}`, err);
        }
      }
    }

    setPools(found);
    setLoading(false);
    if (found.length === 0) setError('Nie znaleziono żadnej puli z konfiguracji (sprawdź RPC).');
  };

  useEffect(() => {
    fetchPools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePoolSelect = async (info: PoolInfo) => {
    if (info.chainId !== walletChainId && walletClient) {
      // Liquidity operations need the wallet on the pool's chain
      try {
        setSwitching(true);
        await switchChainAsync({ chainId: info.chainId });
      } catch (e) {
        setError(`Przełącz sieć w portfelu na ${info.chainName}, aby zarządzać tą pulą.`);
        setSwitching(false);
        return;
      }
      setSwitching(false);
    }
    setSelectedPool({ pool: info.pool, address: info.address });
  };

  // group by chain, then pair
  const chains = Array.from(new Set(pools.map((p) => p.chainName)));

  return (
    <ExpandableSection title="Uniswap V3 Pools">
      <div className="pools-container">
        <TopPools />
        <div className="pool-browser">
          {loading || switching ? (
            <div className="pool-browser-loading">
              <div className="loading-inline">
                <span className="spinner" />
                {switching ? 'Przełączanie sieci…' : 'Loading pools...'}
              </div>
              {!switching && (
                <div className="pools-grid">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="pool-card pool-card-skeleton skeleton" />
                  ))}
                </div>
              )}
            </div>
          ) : error && pools.length === 0 ? (
            <div className="error">
              {error}
              <button onClick={fetchPools} className="retry-button">Retry</button>
            </div>
          ) : !selectedPool ? (
            <div className="pairs-container">
              {error && <div className="error">{error}</div>}
              {chains.map((chainName) => (
                <div key={chainName}>
                  <h3 className="chain-header">{chainName}</h3>
                  {Array.from(new Set(pools.filter((p) => p.chainName === chainName).map((p) => p.pairName))).map(
                    (pairName) => {
                      const pairPools = pools
                        .filter((p) => p.chainName === chainName && p.pairName === pairName)
                        .sort((a, b) => a.feeTier - b.feeTier);
                      return (
                        <div key={`${chainName}-${pairName}`} className="pair-section">
                          <div className="pair-header">
                            <h4>
                              {pairName}
                              {pairPools[0]?.role && (
                                <span className={`role-badge role-${pairPools[0].role}`}>
                                  {ROLE_LABELS[pairPools[0].role]}
                                </span>
                              )}
                            </h4>
                          </div>
                          <div className="pools-grid">
                            {pairPools.map((poolInfo) => (
                              <div
                                key={`${poolInfo.chainId}-${poolInfo.address}`}
                                className="pool-card"
                                onClick={() => handlePoolSelect(poolInfo)}
                              >
                                <div className="pool-card-header">
                                  <span className="fee-tier">{TIER_LABELS[poolInfo.feeTier]}</span>
                                </div>
                                <div className="pool-card-body">
                                  <div className="pool-info-row">
                                    <span className="label">Price:</span>
                                    <span className="value">{poolInfo.price}</span>
                                  </div>
                                  <div className="pool-info-row">
                                    <span className="label">Address:</span>
                                    <span className="value address">
                                      {`${poolInfo.address.slice(0, 6)}...${poolInfo.address.slice(-4)}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ))}
              {pools.length === 0 && <div className="no-pools">No pools found.</div>}
            </div>
          ) : (
            <div className="selected-pool-container">
              <button onClick={() => setSelectedPool(null)} className="back-button">
                ← Back to Pools
              </button>
              <UniswapPool initialPool={selectedPool.pool} initialAddress={selectedPool.address} />
            </div>
          )}
        </div>
      </div>
    </ExpandableSection>
  );
};

export default PoolBrowser;
