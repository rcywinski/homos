import { BrowserProvider } from 'ethers';

export interface WalletData {
  address: string;
  blockNumber: string;
  balance: string;
}

export interface Ethereum {
  request: (args: { method: string }) => Promise<string[]>;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: Ethereum;
  }
} 