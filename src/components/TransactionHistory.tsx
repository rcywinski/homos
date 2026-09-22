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

/**
 * FIX 21.08 (crash "Rendered more hooks than during the previous render",
 * reproduced on localhost when expanding the "Manage" section):
 * the previous version called `useTransaction`/`useWaitForTransactionReceipt`/
 * `useEffect` INSIDE `transactions.forEach(...)`. The number of hooks thus
 * depended on the number of transactions in the "pending" state and changed
 * between renders — the first rule of hooks broken, React tore down the whole tree.
 *
 * Fix: the watcher for ONE transaction as a separate component. Hooks are
 * at the top level of the component (constant count), and what varies is the
 * number of MOUNTED components — which is legal in React. Renders nothing.
 */
const PendingTxWatcher: FC<{
  tx: Transaction;
  address: string;
  onResolved: (updated: Transaction[]) => void;
}> = ({ tx, address, onResolved }) => {
  const { data: transaction } = useTransaction({ hash: tx.hash as `0x${string}` });
  const { isSuccess, isError } = useWaitForTransactionReceipt({ hash: tx.hash as `0x${string}` });

  useEffect(() => {
    if (transaction && (isSuccess || isError)) {
      onResolved(storeTransaction(address, { ...tx, status: isSuccess ? 'confirmed' : 'failed' }));
    }
    // `tx` deliberately tracked via `hash` — the object is recreated on every parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction, isSuccess, isError, address, tx.hash]);

  return null;
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

  if (!isConnected || !address) return null;

  const pending = transactions.filter((t) => t.status === 'pending');

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
      {/* in-flight transaction watchers — they render nothing, see comment above */}
      {pending.map((tx) => (
        <PendingTxWatcher key={`watch-${tx.hash}`} tx={tx} address={address} onResolved={setTransactions} />
      ))}
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