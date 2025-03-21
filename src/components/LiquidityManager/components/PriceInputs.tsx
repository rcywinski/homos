import React, { useState, useEffect } from 'react';
import { Pool } from '@uniswap/v3-sdk';
import { tickToPrice } from '../../../utils/liquidityManagement';
import { formatPrice, formatPercentage } from '../../../utils/formatters';

interface PriceInputsProps {
  minValue: number;
  maxValue: number;
  lowerValue: number;
  upperValue: number;
  onChangeLower: (value: number) => void;
  onChangeUpper: (value: number) => void;
  disabled: boolean;
  pool: Pool;
}

const PriceInputs: React.FC<PriceInputsProps> = ({ 
  minValue, 
  maxValue, 
  lowerValue, 
  upperValue, 
  onChangeLower, 
  onChangeUpper, 
  disabled,
  pool
}) => {
  // Add local state for input values
  const [lowerInputValue, setLowerInputValue] = useState(formatPrice(lowerValue));
  const [upperInputValue, setUpperInputValue] = useState(formatPrice(upperValue));
  
  // Update local state when prop values change
  useEffect(() => {
    setLowerInputValue(formatPrice(lowerValue));
    setUpperInputValue(formatPrice(upperValue));
  }, [lowerValue, upperValue]);
  
  // Get the current price for percentage calculation
  const currentPoolPrice = pool ? tickToPrice(pool.tickCurrent, pool.token0.decimals, pool.token1.decimals) : 0;

  // Calculate percentages with better precision for small values
  const calculatePercentage = (basePrice: number, newPrice: number): number => {
    return ((newPrice - basePrice) / basePrice) * 100;
  };

  const lowerPctFromCurrent = calculatePercentage(currentPoolPrice, lowerValue);
  const upperPctFromCurrent = calculatePercentage(currentPoolPrice, upperValue);

  // Format the percentage display more clearly
  const formatRangeDisplay = (): string => {
    // Handle edge cases like full range
    if (lowerValue === 0 || upperValue === Infinity) {
      return 'Full Range';
    }
    
    // For extreme price ranges, show more readable format
    if (Math.abs(lowerPctFromCurrent) > 1000 || Math.abs(upperPctFromCurrent) > 1000) {
      return 'Wide Range';
    }
    
    return `-${formatPercentage(Math.abs(lowerPctFromCurrent)).replace('%', '')}% / +${formatPercentage(Math.abs(upperPctFromCurrent)).replace('%', '')}%`;
  };
  
  return (
    <div className="price-inputs-container">
      <div className="price-inputs-row">
        <div className="price-input-column">
          <label className="price-input-label">Min Price</label>
          <input
            type="text"
            className="price-input"
            value={lowerInputValue}
            onChange={(e) => {
              // Just update the displayed value during typing
              setLowerInputValue(e.target.value);
            }}
            onBlur={(e) => {
              // Validate and save the value when focus is lost
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= minValue && value < upperValue) {
                onChangeLower(value);
              } else {
                // Reset to the previous valid value if invalid
                setLowerInputValue(formatPrice(lowerValue));
              }
            }}
            disabled={disabled}
          />
          <div className="price-conversion">
            1 {pool?.token0?.symbol || 'Token0'} = {formatPrice(lowerValue)} {pool?.token1?.symbol || 'Token1'}
          </div>
        </div>
        
        <div className="price-divider">
          <div className="price-percentage">
            {formatRangeDisplay()}
          </div>
          <div className="price-divider-line"></div>
          <div className="current-price">
            Current: {formatPrice(currentPoolPrice)}
          </div>
        </div>
        
        <div className="price-input-column">
          <label className="price-input-label">Max Price</label>
          <input
            type="text"
            className="price-input"
            value={upperInputValue}
            onChange={(e) => {
              // Just update the displayed value during typing
              setUpperInputValue(e.target.value);
            }}
            onBlur={(e) => {
              // Validate and save the value when focus is lost
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value > lowerValue && value <= maxValue) {
                onChangeUpper(value);
              } else {
                // Reset to the previous valid value if invalid
                setUpperInputValue(formatPrice(upperValue));
              }
            }}
            disabled={disabled}
          />
          <div className="price-conversion">
            1 {pool?.token0?.symbol || 'Token0'} = {formatPrice(upperValue)} {pool?.token1?.symbol || 'Token1'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceInputs; 