import React, { FC, useState } from 'react';
import { ethers } from 'ethers';
import { WalletData } from '../types';

const WalletConnect: FC = () => {
  const [walletData, setWalletData] = useState<WalletData>({
    address: '',
    blockNumber: '',
    balance: ''
  });
  const [error, setError] = useState<string>('');

  const connectWallet = async (): Promise<void> => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const address = await signer.getAddress();
        const blockNumber = await provider.getBlockNumber();
        const balance = await provider.getBalance(address);
        
        setWalletData({
          address: `Address: ${address}`,
          blockNumber: `Block Number: ${blockNumber}`,
          balance: `Balance: ${ethers.formatEther(balance)} ETH`
        });
        
        console.log('Address', address);
        
      } catch (error) {
        console.error('User rejected the request or other error:', error);
        setError('Failed to connect wallet. Please try again.');
      }
    } else {
      setError('MetaMask not installed');
      console.log('MetaMask not installed');
    }
  };

  return (
    <div className="wallet-connect">
      <h1>HOMO$</h1>
      <h3>get rich or die tryin'</h3>
      <button onClick={connectWallet}>Connect MetaMask</button>
      
      {error && <div className="error">{error}</div>}
      
      {walletData.address && (
        <div className="wallet-info">
          <div>{walletData.address}</div>
          <div>{walletData.blockNumber}</div>
          <div>{walletData.balance}</div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 