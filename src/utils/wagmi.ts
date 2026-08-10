import { createConfig, WagmiConfig } from 'wagmi';
import { getDefaultConfig } from 'connectkit';
import { mainnet, sepolia } from 'viem/chains';

export const config = createConfig(
  getDefaultConfig({
    walletConnectProjectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
    chains: [mainnet, sepolia],
    appName: "HOMOS DeFi",
  }),
); 