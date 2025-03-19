import { createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';
import { createPublicClient, http as viem_http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const projectId = process.env.WALLET_CONNECT_PROJECT_ID || '';
const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';

// Create the wagmi config for the UI
export const config = createConfig(
  getDefaultConfig({
    // Required API Keys
    walletConnectProjectId: projectId,
    // Required
    appName: "HOMO$ DeFi",
    // Optional
    appDescription: "Market Making Bot for Uniswap V3",
    appUrl: "https://homos.finance", // your app's url
    appIcon: "https://homos.finance/logo.png", // your app's icon, no bigger than 1024x1024px (max. 1MB)
    chains: [mainnet, sepolia]
  }),
);

// Create a wallet client for programmatic interactions
export const createWallet = () => {
  if (!privateKey) {
    throw new Error('Private key not found in environment variables');
  }

  const account = privateKeyToAccount(`0x${privateKey}`);
  
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: viem_http(rpcUrl)
  });

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: viem_http(rpcUrl)
  });

  return {
    publicClient,
    walletClient,
    account
  };
}; 