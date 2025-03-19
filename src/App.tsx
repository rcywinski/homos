import React, { FC } from 'react';
import { WagmiConfig } from 'wagmi';
import { ConnectKitProvider, ConnectKitButton } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wallet';
import WalletInfo from './components/WalletInfo';

// Create a client
const queryClient = new QueryClient();

const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <ConnectKitProvider>
          <div className="app">
            <h1>HOMO$</h1>
            <h3>get rich or die tryin'</h3>
            <ConnectKitButton />
            <div className="wallet-info">
              <WalletInfo />
            </div>
          </div>
        </ConnectKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
};

export default App; 