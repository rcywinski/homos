import { createConfig, http } from 'wagmi';
import { mainnet, base, arbitrum } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';

// Injected at build time by webpack's DefinePlugin (see webpack.config.js).
const walletConnectProjectId = process.env.WALLET_CONNECT_PROJECT_ID || '';

// Browser-side wagmi config. The UI never holds a key: every transaction is
// signed in the user's own wallet (Rabby, MetaMask, WalletConnect).
export const config = createConfig(
  getDefaultConfig({
    walletConnectProjectId,
    appName: 'HOMOS',
    appDescription: 'Uniswap v3 LP cockpit',
    chains: [mainnet, base, arbitrum],
    transports: {
      [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
      [base.id]: http('https://base-rpc.publicnode.com'),
      [arbitrum.id]: http('https://arbitrum-one-rpc.publicnode.com'),
    },
  }),
);
