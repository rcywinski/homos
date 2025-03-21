import React, { FC, useState } from 'react';
import { useAccount } from 'wagmi';
import { Pool } from '@uniswap/v3-sdk';
import '../../styles/liquidityManager.css';

// Import the new components
import AddLiquidity from './AddLiquidity';
import RemoveLiquidity from './RemoveLiquidity';
import MyPositions from './MyPositions';

interface LiquidityManagerProps {
  pool: Pool;
  poolAddress: string;
}

const LiquidityManager: FC<LiquidityManagerProps> = ({ pool, poolAddress }) => {
  const { isConnected } = useAccount();
  
  // State variables
  const [activeTab, setActiveTab] = useState<'add' | 'remove' | 'positions'>('add');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Handle successful operations to refresh data as needed
  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!isConnected) {
    return (
      <div className="liquidity-manager">
        <h3>Liquidity Manager</h3>
        <div className="message error">
          Please connect your wallet to manage liquidity
        </div>
      </div>
    );
  }
  
  return (
    <div className="liquidity-manager">
      <h3>Liquidity Manager</h3>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`} 
          onClick={() => setActiveTab('add')}
        >
          Add Liquidity
        </button>
        <button 
          className={`tab ${activeTab === 'remove' ? 'active' : ''}`} 
          onClick={() => setActiveTab('remove')}
        >
          Remove Liquidity
        </button>
        <button 
          className={`tab ${activeTab === 'positions' ? 'active' : ''}`} 
          onClick={() => setActiveTab('positions')}
        >
          My Positions
        </button>
      </div>
      
      {/* Render the appropriate component based on the active tab */}
      {activeTab === 'add' && <AddLiquidity pool={pool} onSuccess={handleSuccess} />}
      
      {activeTab === 'remove' && <RemoveLiquidity pool={pool} onSuccess={handleSuccess} />}
      
      {activeTab === 'positions' && (
        <MyPositions 
          pool={pool} 
          poolAddress={poolAddress} 
          onSuccess={handleSuccess} 
          key={`positions-${refreshTrigger}`} // Force refresh when needed
        />
      )}
    </div>
  );
};

export default LiquidityManager;