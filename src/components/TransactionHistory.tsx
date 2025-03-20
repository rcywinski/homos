import React, { FC, useEffect, useState } from 'react';
import { useAccount, useTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import ExpandableSection from './ExpandableSection';

interface Transaction {
  hash: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  chainId: number;
  description?: string;
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

export const addTransaction = (
  address: string,
  hash: string,
  chainId: number,
  description?: string
) => {
  const tx: Transaction = {
    hash,
    timestamp: Date.now(),
    status: 'pending',
    chainId,
    description
  };
  return storeTransaction(address, tx);
};

const TransactionHistory: FC = () => {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load transactions from storage
  useEffect(() => {
    if (address) {
      setTransactions(getStoredTransactions(address));
    }
  }, [address]);

  // Monitor pending transactions
  transactions.forEach(tx => {
    if (tx.status === 'pending') {
      const { data: transaction } = useTransaction({ 
        hash: tx.hash as `0x${string}` 
      });
      
      const { isSuccess, isError } = useWaitForTransactionReceipt({ 
        hash: tx.hash as `0x${string}` 
      });

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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const handleClearHistory = () => {
    if (address) {
      localStorage.removeItem(`${STORAGE_KEY}_${address}`);
      setTransactions([]);
    }
  };

  return (
    <ExpandableSection title="Transaction History">
      <div className="transaction-history">
        <div className="transaction-header">
          <h3>Transaction History</h3>
          {transactions.length > 0 && (
            <button 
              onClick={handleClearHistory}
              className="clear-history-button"
              title="Clear transaction history"
            >
              Clear History
            </button>
          )}
        </div>
        
        {transactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions yet</p>
            <p className="no-transactions-sub">Your recent transactions will appear here</p>
          </div>
        ) : (
          <div className="transaction-list">
            {transactions.map((tx) => (
              <div key={tx.hash} className={`transaction-item ${tx.status}`}>
                <div className="transaction-main">
                  <div className="transaction-info">
                    <span className="transaction-hash">
                      <a
                        href={`${tx.chainId === mainnet.id 
                          ? 'https://etherscan.io/tx/' 
                          : 'https://sepolia.etherscan.io/tx/'}${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={tx.hash}
                      >
                        {formatTxHash(tx.hash)}
                      </a>
                    </span>
                    {tx.description && (
                      <span className="transaction-description">
                        {tx.description}
                      </span>
                    )}
                  </div>
                  <span className={`transaction-status ${tx.status}`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
                <div className="transaction-details">
                  <span className="transaction-date" title={new Date(tx.timestamp).toLocaleString()}>
                    {formatDate(tx.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ExpandableSection>
  );
};

export default TransactionHistory; 