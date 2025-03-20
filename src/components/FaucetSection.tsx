import React from 'react';
import { useAccount, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import ExpandableSection from './ExpandableSection';

const FaucetSection: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const isSepolia = chainId === sepolia.id;

  if (!address || !isSepolia) return null;

  return (
    <ExpandableSection title="Get Free Sepolia ETH">
      <div className="faucet-container">
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
    </ExpandableSection>
  );
};

export default FaucetSection; 