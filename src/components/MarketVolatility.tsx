import React, { FC, useEffect, useState } from 'react';
import { useChainId } from 'wagmi';
import { fetchHistoricalDataAndCalculateVolatility } from '../utils/marketVolatility';
import ExpandableSection from './ExpandableSection';

interface MarketVolatilityProps {
  token0Symbol: string;
  token1Symbol: string;
  poolAddress: string;
}

const MarketVolatility: FC<MarketVolatilityProps> = ({ token0Symbol, token1Symbol, poolAddress }) => {
  const chainId = useChainId();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [volatilityData, setVolatilityData] = useState<{
    atr: number[];
    bollingerBands: { upper: number[]; middle: number[]; lower: number[] };
    volatilityPercentage: number;
  } | null>(null);

  useEffect(() => {
    const loadVolatilityData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchHistoricalDataAndCalculateVolatility(
          token0Symbol,
          token1Symbol,
          poolAddress,
          30,
          chainId
        );
        
        setVolatilityData({
          atr: data.atr,
          bollingerBands: data.bollingerBands,
          volatilityPercentage: data.volatilityPercentage
        });
      } catch (err) {
        console.error('Failed to load volatility data:', err);
        setError('Failed to load market volatility data');
      } finally {
        setLoading(false);
      }
    };
    
    loadVolatilityData();
  }, [token0Symbol, token1Symbol, poolAddress, chainId]);

  const formatValue = (value: number): string => {
    return value.toFixed(2);
  };

  const getVolatilityCategory = (): string => {
    if (!volatilityData) return '';
    
    if (volatilityData.volatilityPercentage < 2) {
      return 'low-volatility';
    } else if (volatilityData.volatilityPercentage < 5) {
      return 'medium-volatility';
    } else {
      return 'high-volatility';
    }
  };

  const getVolatilityDescription = (): string => {
    if (!volatilityData) return '';
    
    if (volatilityData.volatilityPercentage < 2) {
      return 'Low market volatility. The market is currently stable with minimal price fluctuations.';
    } else if (volatilityData.volatilityPercentage < 5) {
      return 'Medium market volatility. The market is showing some price movement but remains relatively stable.';
    } else {
      return 'High market volatility. The market is experiencing significant price fluctuations.';
    }
  };

  return (
    <ExpandableSection title="Market Volatility Analysis">
      <div className="volatility-container">
        {loading ? (
          <div className="loading">Loading volatility data...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : volatilityData ? (
          <div className="volatility-metrics">
            <div className="metric-row">
              <span className="metric-label">Market Volatility:</span>
              <span className="metric-value">
                {formatValue(volatilityData.volatilityPercentage)}%
              </span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Current ATR (14):</span>
              <span className="metric-value">
                {volatilityData.atr.length > 0
                  ? formatValue(volatilityData.atr[volatilityData.atr.length - 1])
                  : 'N/A'}
              </span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Bollinger Bands Width:</span>
              <span className="metric-value">
                {volatilityData.bollingerBands.upper.length > 0
                  ? `${formatValue(
                      volatilityData.bollingerBands.upper[
                        volatilityData.bollingerBands.upper.length - 1
                      ] -
                        volatilityData.bollingerBands.lower[
                          volatilityData.bollingerBands.lower.length - 1
                        ]
                    )}`
                  : 'N/A'}
              </span>
            </div>
            
            <div className="volatility-interpretation">
              <p className={getVolatilityCategory()}>
                {getVolatilityDescription()}
              </p>
            </div>

            <div className="data-source-info">
              <small>
                {chainId === 1 
                  ? "Data source: Uniswap V3 Graph Protocol" 
                  : "Data source: Generated (Sepolia testnet)"
                }
              </small>
            </div>
          </div>
        ) : null}
      </div>
    </ExpandableSection>
  );
};

export default MarketVolatility; 