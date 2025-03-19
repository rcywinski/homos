import React, { FC, useEffect, useState } from 'react';
import { useAccount, useBalance, useBlockNumber, useChainId, useSwitchChain, useTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { mainnet, sepolia } from 'wagmi/chains';

interface Transaction {
  hash: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  chainId: number;
}

const STORAGE_KEY = 'wallet_transactions';

const getStoredTransactions = (address: string): Transaction[] => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${address}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const storeTransaction = (address: string, tx: Transaction) => {
  const transactions = getStoredTransactions(address);
  const updated = [tx, ...transactions].slice(0, 10); // Keep last 10 transactions
  localStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(updated));
  return updated;
};

const FAUCET_LINKS = {
  [sepolia.id]: [
    {
      name: 'Alchemy Faucet',
      url: 'https://sepoliafaucet.com/',
      description: 'Get 0.5 Sepolia ETH daily (requires sign in)'
    },
    {
      name: 'Infura Faucet',
      url: 'https://www.infura.io/faucet/sepolia',
      description: 'Get 0.5 Sepolia ETH daily (requires sign in)'
    },
    {
      name: 'QuickNode Faucet',
      url: 'https://faucet.quicknode.com/ethereum/sepolia',
      description: 'Get 0.1 Sepolia ETH daily'
    }
  ]
};

const WalletInfo: FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const { data: balance } = useBalance({
    address,
  });
  
  const { data: blockNumber } = useBlockNumber();

  useEffect(() => {
    if (address) {
      setTransactions(getStoredTransactions(address));
    }
  }, [address]);

  // Monitor pending transactions
  transactions.forEach(tx => {
    if (tx.status === 'pending') {
      const { data: transaction } = useTransaction({ hash: tx.hash as `0x${string}` });
      const { isSuccess, isError } = useWaitForTransactionReceipt({ hash: tx.hash as `0x${string}` });
      
      useEffect(() => {
        if (transaction && (isSuccess || isError) && address) {
          const updatedTx: Transaction = {
            ...tx,
            status: isSuccess ? 'confirmed' : 'failed'
          };
          const updated = storeTransaction(address, updatedTx);
          setTransactions(updated);
        }
      }, [transaction, isSuccess, isError]);
    }
  });

  if (!isConnected) return null;

  const isMainnet = chainId === mainnet.id;
  const isSepolia = chainId === sepolia.id;

  const handleFaucetClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="wallet-info-container">
      <div className="wallet-status">
        <h3>Wallet Status</h3>
        <div>Address: {address}</div>
        <div>Network: {chainId === mainnet.id ? 'Mainnet' : chainId === sepolia.id ? 'Sepolia' : 'Unknown'}</div>
        <div>Balance: {balance ? `${formatEther(balance.value)} ${balance.symbol}` : 'Loading...'}</div>
        {blockNumber !== undefined && <div>Block Number: {blockNumber.toString()}</div>}
      </div>

      <div className="transaction-history">
        <h3>Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="no-transactions">No transactions yet</p>
        ) : (
          <div className="transaction-list">
            {transactions.map((tx) => (
              <div key={tx.hash} className={`transaction-item ${tx.status}`}>
                <div className="transaction-main">
                  <span className="transaction-hash">
                    <a
                      href={`${tx.chainId === mainnet.id 
                        ? 'https://etherscan.io/tx/' 
                        : 'https://sepolia.etherscan.io/tx/'}${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                    </a>
                  </span>
                  <span className={`transaction-status ${tx.status}`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
                <div className="transaction-details">
                  <span className="transaction-date">{formatDate(tx.timestamp)}</span>
                  <span className="transaction-network">
                    {tx.chainId === mainnet.id ? 'Mainnet' : 'Sepolia'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="network-controls">
        <h3>Network Control</h3>
        <div className="network-info">
          <div className="network-description">
            <strong>Mainnet:</strong> Real Ethereum network with real ETH and actual transactions
          </div>
          <div className="network-description">
            <strong>Sepolia:</strong> Test network with free test ETH for development
          </div>
        </div>
        <div className="network-buttons">
          <button 
            onClick={() => switchChain?.({ chainId: mainnet.id })}
            className={isMainnet ? 'active' : ''}
            disabled={isMainnet}
          >
            Switch to Mainnet
          </button>
          <button 
            onClick={() => switchChain?.({ chainId: sepolia.id })}
            className={isSepolia ? 'active' : ''}
            disabled={isSepolia}
          >
            Switch to Sepolia
          </button>
        </div>
        
        {isSepolia && (
          <div className="faucet-section">
            <h4>Get Free Sepolia ETH</h4>
            <p className="faucet-info">
              Need test ETH? Use these faucets to get free Sepolia ETH for development:
            </p>
            <div className="faucet-buttons">
              {FAUCET_LINKS[sepolia.id].map((faucet) => (
                <div key={faucet.name} className="faucet-item">
                  <button onClick={() => handleFaucetClick(faucet.url)}>
                    {faucet.name}
                  </button>
                  <span className="faucet-description">{faucet.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="network-warning">
          {!isMainnet && !isSepolia && (
            <p className="warning">
              Please switch to Mainnet or Sepolia for Uniswap V3 interactions
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletInfo; 