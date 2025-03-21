import React from 'react';

interface GasEstimateDisplayProps {
  gasEstimate: string | null;
  gasPriceGwei: string | null;
}

const GasEstimateDisplay: React.FC<GasEstimateDisplayProps> = ({ 
  gasEstimate, 
  gasPriceGwei 
}) => {
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

export default GasEstimateDisplay; 