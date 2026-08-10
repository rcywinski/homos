import React from 'react';
import { WagmiConfig } from 'wagmi';
import { ConnectKitProvider, ConnectKitButton } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wallet';
import { CompactWalletInfo } from './components/WalletInfo';
import PoolBrowser from './components/PoolBrowser';
import TransactionHistory from './components/TransactionHistory';
import FaucetSection from './components/FaucetSection';
import MorningCockpit from './components/MorningCockpit';
import BotStatusDot from './components/BotStatusDot';
import { useBotApi } from './hooks/useBotApi';
import './styles.css';
import './styles/marketVolatility.css';
import './styles/liquidityManager.css';

// Create a client
const queryClient = new QueryClient();

function AppShell() {
  // Single poll loop shared by the header dot and the cockpit panel — avoids
  // two components independently hitting bot/server.ts every 60s.
  const bot = useBotApi();

  return (
    <div className="app">
      <div className="app-header">
        <div className="title-section">
          <h1>HOMO$</h1>
          <h3>get rich or die tryin'</h3>
        </div>
        <div className="header-right">
          <BotStatusDot status={bot.status} />
          <div className="wallet-section">
            <CompactWalletInfo />
          </div>
          <div className="connect-button-container">
            <ConnectKitButton />
          </div>
        </div>
      </div>

      <div className="app-content">
        <FaucetSection />
        <div className="main-content">
          <MorningCockpit bot={bot} />
          <PoolBrowser />
          <div className="transaction-section">
            <TransactionHistory />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <ConnectKitProvider>
          <AppShell />
        </ConnectKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}

export default App;
