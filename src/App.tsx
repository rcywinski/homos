import React from 'react';
import { WagmiConfig } from 'wagmi';
import { ConnectKitProvider, ConnectKitButton } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wallet';
import { CompactWalletInfo } from './components/WalletInfo';
import MorningCockpit from './components/MorningCockpit';
import BotStatusDot from './components/BotStatusDot';
import { useBotApi } from './hooks/useBotApi';
import './styles.css';

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
          <h3>Uniswap v3 liquidity cockpit</h3>
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
        <div className="main-content">
          <MorningCockpit bot={bot} />
          {/* Liquidity management lives in the cockpit (openPositionAtRange /
              rebalance / rotation / hedge); the pool ranking comes from the bot.
              `TransactionHistory` is still the write module for cockpit actions
              (`addTransaction`), but its view is deliberately not mounted — the
              bot-side ledger is the record of transactions. */}
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
