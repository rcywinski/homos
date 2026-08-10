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

// Note: wagmi/viem already augment Window['ethereum']; re-declaring it with a
// narrower type caused TS2717. Use their declaration instead of our own. 