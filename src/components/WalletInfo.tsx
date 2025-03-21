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
  const [totalUsdValue, setTotalUsdValue] = useState<string>('0.00');
  const [ethPrice, setEthPrice] = useState<number>(1972); // Default price
  
  // Format USDC balance with 8 decimal places
  const formattedUsdcBalance = usdcBalance ? 
    parseFloat(formatUnits(usdcBalance.value, 6)).toFixed(8) : 
    '0.00000000';
    
  // Format WETH balance with 8 decimal places
  const formattedWethBalance = wethBalance ? 
    parseFloat(formatUnits(wethBalance.value, 18)).toFixed(8) : 
    '0.00000000';
  
  // Handle Rabby address input
  const handleRabbyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (isAddress(value) && value.startsWith('0x'))) {
      setRabbyAddress(value as `0x${string}` | '');
    }
  };
  
  const toggleRabbyMode = () => {
    if (!isRabbyMode && !rabbyAddress) {
      setShowRabbyInput(true);
    } else {
      setIsRabbyMode(!isRabbyMode);
    }
  };
  
  const submitRabbyAddress = () => {
    if (rabbyAddress) {
      setIsRabbyMode(true);
      setShowRabbyInput(false);
    }
  };
  
  // Fetch ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        if (data && data.ethereum && data.ethereum.usd) {
          setEthPrice(data.ethereum.usd);
        }
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        // Keep using the default price
      }
    };
    
    fetchEthPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchEthPrice, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate total USD value
  useEffect(() => {
    if (balance || usdcBalance || wethBalance) {
      const ethValue = balance ? Number(formatEther(balance.value)) * ethPrice : 0;
      const wethValue = wethBalance ? Number(formatUnits(wethBalance.value, 18)) * ethPrice : 0;
      const usdcValue = usdcBalance ? Number(formatUnits(usdcBalance.value, 6)) : 0;
      const total = ethValue + wethValue + usdcValue;
      setTotalUsdValue(total.toFixed(2));
    }
  }, [balance, usdcBalance, wethBalance, ethPrice, chainId, usdcAddress, wethAddress, address]);

  if (!connectedAddress) return null;

  const isMainnet = chainId === mainnet.id;
  const isSepolia = chainId === sepolia.id;

  const handleNetworkSwitch = () => {
    if (isMainnet) {
      switchChain({ chainId: sepolia.id });
    } else {
      switchChain({ chainId: mainnet.id });
    }
  };

  // Format the address for display
  const displayAddress = address ? 
    `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 
    '';

  return (
    <div className="compact-wallet-info">
      <div className="wallet-header">
        <span className="network-badge">{isMainnet ? 'Mainnet' : 'Sepolia'}</span>
        <button 
          onClick={handleNetworkSwitch}
          className="network-switch-button"
          title={`Switch to ${isMainnet ? 'Sepolia' : 'Mainnet'}`}
        >
          ⇄
        </button>
        
        <span className="wallet-address" title={address}>
          {displayAddress}
        </span>
        <button 
          onClick={toggleRabbyMode} 
          className="wallet-toggle-button"
          title={isRabbyMode ? "Switch to connected wallet" : "Check another wallet"}
        >
          {isRabbyMode ? "👝" : "🔍"}
        </button>
        
        <span className="block-info">#{blockNumber?.toString()}</span>
      </div>
      
      {showRabbyInput && (
        <div className="rabby-input-container">
          <input 
            type="text" 
            placeholder="Enter wallet address" 
            value={rabbyAddress} 
            onChange={handleRabbyInputChange}
            className="rabby-address-input"
          />
          <button onClick={submitRabbyAddress} className="submit-rabby-button">
            Check
          </button>
          <button onClick={() => setShowRabbyInput(false)} className="cancel-rabby-button">
            ×
          </button>
        </div>
      )}
      
      <div className="balances-section">
        <div className="balance-row eth-row">
          <span className="token-symbol">ETH:</span>
          <span className="balance-info eth-balance">
            {balance ? `${Number(formatEther(balance.value)).toFixed(8)}` : '0.00000000'}
          </span>
        </div>
        <div className="balance-row weth-row">
          <span className="token-symbol">WETH:</span>
          <span className="balance-info weth-balance">
            {formattedWethBalance}
          </span>
        </div>
        <div className="balance-row usdc-row">
          <span className="token-symbol">USDC:</span>
          <span className="balance-info usdc-balance">
            {formattedUsdcBalance}
          </span>
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