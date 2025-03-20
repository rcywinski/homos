import React from 'react';
import { useAccount, useBalance, useBlockNumber, useChainId, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { mainnet, sepolia } from 'wagmi/chains';

export const CompactWalletInfo: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { data: blockNumber } = useBlockNumber();
  const { switchChain } = useSwitchChain();

  if (!address) return null;

  const isMainnet = chainId === mainnet.id;
  const isSepolia = chainId === sepolia.id;

  const handleNetworkSwitch = () => {
    if (isMainnet) {
      switchChain({ chainId: sepolia.id });
    } else {
      switchChain({ chainId: mainnet.id });
    }
  };

  return (
    <div className="compact-wallet-info">
      <div className="network-switch">
        <span className="network-badge">{isMainnet ? 'Mainnet' : 'Sepolia'}</span>
        <button 
          onClick={handleNetworkSwitch}
          className="network-switch-button"
          title={`Switch to ${isMainnet ? 'Sepolia' : 'Mainnet'}`}
        >
          ⇄
        </button>
      </div>
      <span className="balance-info">
        {balance ? `${Number(formatEther(balance.value)).toFixed(6)} ${balance.symbol}` : '0 ETH'}
      </span>
      <span className="block-info">#{blockNumber?.toString()}</span>
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