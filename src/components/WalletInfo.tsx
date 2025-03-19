import React, { FC } from 'react';
import { useAccount, useBalance, useBlockNumber, useChainId, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { mainnet, sepolia } from 'wagmi/chains';

const FAUCET_LINKS = [
  {
    name: "Alchemy Faucet",
    url: "https://sepoliafaucet.com/",
    description: "Get 0.5 Sepolia ETH daily (requires sign in)"
  },
  {
    name: "Infura Faucet",
    url: "https://www.infura.io/faucet/sepolia",
    description: "Get 0.5 Sepolia ETH daily (requires sign in)"
  },
  {
    name: "QuickNode Faucet",
    url: "https://faucet.quicknode.com/ethereum/sepolia",
    description: "Get 0.1 Sepolia ETH daily"
  }
];

const WalletInfo: FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const { data: balance } = useBalance({
    address,
  });
  
  const { data: blockNumber } = useBlockNumber();

  if (!isConnected) return null;

  const isMainnet = chainId === mainnet.id;
  const isSepolia = chainId === sepolia.id;

  const handleFaucetClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="wallet-info-container">
      <div className="wallet-status">
        <h3>Network Status</h3>
        <div className="network-info">
          <div>Current Network: <strong>{isMainnet ? 'Mainnet' : isSepolia ? 'Sepolia' : 'Unknown'}</strong></div>
          {blockNumber !== undefined && <div>Block: <strong>{blockNumber.toString()}</strong></div>}
          <div>Balance: <strong>{balance ? `${formatEther(balance.value)} ${balance.symbol}` : '0.0 ETH'}</strong></div>
        </div>

        <div className="network-description">
          {isMainnet ? (
            <strong>Connected to Ethereum Mainnet - Real transactions with real value.</strong>
          ) : isSepolia ? (
            <strong>Connected to Sepolia Testnet - Perfect for testing with free test ETH.</strong>
          ) : (
            <div className="warning">Please connect to either Mainnet or Sepolia for Uniswap V3 interactions.</div>
          )}
        </div>
      </div>

      <div className="network-controls">
        <h3>Network Controls</h3>
        <div className="network-buttons">
          <button
            onClick={() => switchChain({ chainId: mainnet.id })}
            disabled={isMainnet}
            className={isMainnet ? 'active' : ''}
          >
            Switch to Mainnet
          </button>
          <button
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSepolia}
            className={isSepolia ? 'active' : ''}
          >
            Switch to Sepolia
          </button>
        </div>
      </div>

      {isSepolia && (
        <div className="faucet-section">
          <h4>Get Free Sepolia ETH</h4>
          <p className="faucet-info">
            You'll need some test ETH to interact with Uniswap on Sepolia. 
            Choose a faucet below to get started:
          </p>
          <div className="faucet-buttons">
            {FAUCET_LINKS.map((faucet) => (
              <div key={faucet.url} className="faucet-item">
                <button onClick={() => handleFaucetClick(faucet.url)}>
                  {faucet.name}
                </button>
                <span className="faucet-description">{faucet.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletInfo; 