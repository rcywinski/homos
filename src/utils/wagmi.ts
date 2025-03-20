import { createConfig, WagmiConfig } from 'wagmi';
import { getDefaultConfig } from 'connectkit';
import { sepolia } from 'viem/chains';

export const config = createConfig(
  getDefaultConfig({
    walletConnectProjectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
    chains: [sepolia],
    appName: "HOMOS DeFi",
  }),
); 