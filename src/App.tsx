import React from 'react';
import { WagmiConfig } from 'wagmi';
import { ConnectKitProvider, ConnectKitButton } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wallet';
import { CompactWalletInfo } from './components/WalletInfo';
import PoolBrowser from './components/PoolBrowser';
import TransactionHistory from './components/TransactionHistory';
import FaucetSection from './components/FaucetSection';
import './styles.css';

// Create a client
const queryClient = new QueryClient();

function App() {
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
              <FaucetSection />
              <div className="main-content">
                <PoolBrowser />
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