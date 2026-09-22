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
        <div className="main-content">
          <MorningCockpit bot={bot} />
          {/* REMOVED 21.08 (owner's decision): the "Manage (advanced)" section
              — PoolBrowser/UniswapPool/LiquidityManager/MyPositions/TopPools/
              MarketVolatility. Manual liquidity management was replaced by the
              cockpit (openPositionAtRange / rebalance / rotation / hedge), and
              the pool ranking comes from the bot, not from DefiLlama in the browser.
              `TransactionHistory` did NOT go away — it is the WRITE module for
              cockpit actions (`addTransaction` in use*Execution/useCockpitActions).
              Its view is deliberately unmounted here: it is localStorage, the last
              10 entries, no export — to be replaced by the bot-side ledger
              (UI-VISION.md: SQLite + CSV for tax accounting). */}
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
