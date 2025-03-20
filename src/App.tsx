import React, { useState } from 'react';
import { WagmiConfig } from 'wagmi';
import { ConnectKitProvider, ConnectKitButton } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wallet';
import { Pool } from '@uniswap/v3-sdk';
import WalletInfo, { CompactWalletInfo } from './components/WalletInfo';
import UniswapPool from './components/UniswapPool';
import TransactionHistory from './components/TransactionHistory';
import PoolBrowser from './components/PoolBrowser';
import './styles.css';

// Create a client
const queryClient = new QueryClient();

function App() {
  const [selectedPool, setSelectedPool] = useState<{ pool: Pool; address: string } | null>(null);

  const handlePoolSelect = (pool: Pool, address: string) => {
    setSelectedPool({ pool, address });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <ConnectKitProvider>
          <div className="app">
            <div className="app-header">
              <div className="title-section">
                <h1>HOMO$</h1>
                <h3>get rich or die tryin'</h3>
              </div>
              <div className="wallet-section">
                <CompactWalletInfo />
                <ConnectKitButton />
              </div>
            </div>
            
            <div className="app-content">
              <div className="main-content">
                <PoolBrowser onPoolSelect={handlePoolSelect} />
                {selectedPool && (
                  <UniswapPool 
                    initialPool={selectedPool.pool}
                    initialAddress={selectedPool.address}
                  />
                )}
                <div className="transaction-section">
                  <TransactionHistory />
                </div>
              </div>
            </div>
          </div>
        </ConnectKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}

export default App; 