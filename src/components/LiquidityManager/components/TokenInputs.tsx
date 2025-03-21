import React from 'react';
import { Pool } from '@uniswap/v3-sdk';
import { formatTokenAmount } from '../../../utils/formatters';

interface TokenInputsProps {
  pool: Pool;
  amount0: string;
  amount1: string;
  onAmountChange: (token: 'token0' | 'token1', value: string) => void;
  disabled?: boolean;
}

const TokenInputs: React.FC<TokenInputsProps> = ({
  pool,
  amount0,
  amount1,
  onAmountChange,
  disabled = false
}) => {
  // Get formatted placeholders based on token type
  const getPlaceholder = (symbol: string | undefined) => {
    if (!symbol) return 'Enter amount';
    
    if (symbol.includes('USD')) {
      return 'Min. 50 for narrow ranges';
    } else if (symbol.includes('ETH') || symbol.includes('BTC')) {
      return 'Min. 0.025 for narrow ranges';
    } else {
      return 'Enter amount';
    }
  };
  
  // Get helper text based on token type
  const getHelperText = (symbol: string | undefined) => {
    if (!symbol) return '';
    
    if (symbol.includes('USD')) {
      return `For ${symbol}, use at least 50 tokens for narrow ranges (more for very narrow ranges)`;
    } else if (symbol.includes('ETH') || symbol.includes('BTC')) {
      return `For ${symbol}, use at least 0.025 tokens for narrow ranges (more for very narrow ranges)`;
    } else {
      return `Minimum amounts depend on price range width - narrower ranges need more tokens`;
    }
  };

  return (
    <>
      <div className="form-group">
        <label>Amount of {pool.token0.symbol}</label>
        <div className="token-input-wrapper">
          <input
            type="text"
            value={amount0}
            onChange={(e) => onAmountChange('token0', e.target.value)}
            placeholder={getPlaceholder(pool.token0.symbol)}
            disabled={disabled}
          />
          <div className="token-symbol">{pool.token0.symbol}</div>
        </div>
        <div className="input-info">
          {getHelperText(pool.token0.symbol)}
        </div>
      </div>
      
      <div className="form-group">
        <label>Amount of {pool.token1.symbol}</label>
        <div className="token-input-wrapper">
          <input
            type="text"
            value={amount1}
            onChange={(e) => onAmountChange('token1', e.target.value)}
            placeholder={getPlaceholder(pool.token1.symbol)}
            disabled={disabled}
          />
          <div className="token-symbol">{pool.token1.symbol}</div>
        </div>
        <div className="input-info">
          {getHelperText(pool.token1.symbol)}
        </div>
      </div>
    </>
  );
};

export default TokenInputs; 