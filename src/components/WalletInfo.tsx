import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useBlockNumber, useChainId, useSwitchChain } from 'wagmi';
import { formatEther, formatUnits, isAddress } from 'viem';
import { mainnet, sepolia } from 'wagmi/chains';
import { USDC_ADDRESS } from '../utils/uniswap';

// Mainnet USDC address
const MAINNET_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
// Mainnet and Sepolia WETH addresses
const MAINNET_WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const SEPOLIA_WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

export const CompactWalletInfo: React.FC = () => {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const [isRabbyMode, setIsRabbyMode] = useState(false);
  const [rabbyAddress, setRabbyAddress] = useState<`0x${string}` | ''>('');
  const [showRabbyInput, setShowRabbyInput] = useState(false);
  
  // Determine which address to use
  const address = isRabbyMode && rabbyAddress ? rabbyAddress : connectedAddress;
  
  // Use the determined address for balance checks
  const { data: balance } = useBalance({ 
    address,
  });
  
  // Use the appropriate USDC address based on the network
  const usdcAddress = chainId === mainnet.id ? MAINNET_USDC_ADDRESS : USDC_ADDRESS;
  // Use the appropriate WETH address based on the network
  const wethAddress = chainId === mainnet.id ? MAINNET_WETH_ADDRESS : SEPOLIA_WETH_ADDRESS;
  
  const { data: usdcBalance } = useBalance({ 
    address,
    token: usdcAddress as `0x${string}`,
  });
  
  const { data: wethBalance } = useBalance({
    address,
    token: wethAddress as `0x${string}`,
  });
  
  const { data: blockNumber } = useBlockNumber();
  const { switchChain } = useSwitchChain();
  
  // Format balances
  const ethFormattedBalance = balance ? 
    parseFloat(formatEther(balance.value)).toFixed(8) : 
    '0.00000000';
    
  const wethFormattedBalance = wethBalance ? 
    parseFloat(formatUnits(wethBalance.value, 18)).toFixed(8) : 
    '0.00000000';
    
  const usdcFormattedBalance = usdcBalance ? 
    parseFloat(formatUnits(usdcBalance.value, 6)).toFixed(8) : 
    '0.00000000';

  if (!connectedAddress) return null;

  const isMainnet = chainId === mainnet.id;
  
  const handleNetworkSwitch = () => {
    if (isMainnet) {
      switchChain({ chainId: sepolia.id });
    } else {
      switchChain({ chainId: mainnet.id });
    }
  };

  return (
    <div className="wallet-container">
      <div className="wallet-content">
        <div className="network-info">
          <span>{isMainnet ? 'Mainnet' : 'Sepolia'}</span>
          <button onClick={handleNetworkSwitch}>⇄</button>
        </div>
        
        <div className="wallet-balances">
          <div className="balance-item">ETH: {ethFormattedBalance}</div>
          <div className="balance-item">WETH: {wethFormattedBalance}</div>
          <div className="balance-item">USDC: {usdcFormattedBalance}</div>
        </div>
      </div>
    </div>
  );
};

const WalletInfo: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  if (!address) return null;

  const isMainnet = chainId === mainnet.id;
  const isSepolia = chainId === sepolia.id;

  return (
    <div className="wallet-info-detailed">
      <div className="network-controls">
        <h3>Network Controls</h3>
        <div className="network-buttons">
          <button className={isMainnet ? 'active' : ''}>
            Switch to Mainnet
          </button>
          <button className={isSepolia ? 'active' : ''}>
            Switch to Sepolia
          </button>
        </div>
      </div>

      <div className="faucet-section">
        <h3>Get Free Sepolia ETH</h3>
        <p>You'll need some test ETH to interact with Uniswap on Sepolia. Choose a faucet below to get started:</p>
        <div className="faucet-options">
          <div className="faucet-option">
            <button onClick={() => window.open('https://sepoliafaucet.com/', '_blank')}>
              Alchemy Faucet
            </button>
            <span>Get 0.5 Sepolia ETH daily (requires sign in)</span>
          </div>
          <div className="faucet-option">
            <button onClick={() => window.open('https://www.infura.io/faucet/sepolia', '_blank')}>
              Infura Faucet
            </button>
            <span>Get 0.5 Sepolia ETH daily (requires sign in)</span>
          </div>
          <div className="faucet-option">
            <button onClick={() => window.open('https://quicknode.com/faucet/eth/sepolia', '_blank')}>
              QuickNode Faucet
            </button>
            <span>Get 0.1 Sepolia ETH daily</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletInfo; 