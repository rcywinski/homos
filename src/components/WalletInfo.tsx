import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther, formatUnits, isAddress } from 'viem';
import { NETWORKS } from '../utils/uniswap';

/**
 * Wallet balances per supported network (Mainnet/Base/Arbitrum), side by side.
 * Network and token addresses are never inferred from a mainnet/testnet flag:
 * the token list comes from `NETWORKS` (utils/uniswap.ts) —
 * i.e. exactly the ones the bot operates with on a given network (Base has cbBTC,
 * mainnet USDT etc.), plus native ETH. Zero hard-coded addresses.
 *
 * WHY NOT "all tokens in the wallet": ERC-20 balances cannot be listed
 * without an indexer (Alchemy/Covalent/Moralis) — RPC only answers the
 * question "how much of THIS token do I have". On top of that come junk tokens
 * nobody wants to see in the header. If we ever want a full wallet view,
 * an indexer key has to be added — this list then becomes the fallback.
 */

const SUPPORTED = [NETWORKS.MAINNET, NETWORKS.BASE, NETWORKS.ARBITRUM];

/** Tokens worth showing on a given network — the ones the bot holds positions in. */
const tokensForChain = (chainId: number) => {
  const net = SUPPORTED.find((n) => n.chainId === chainId);
  if (!net) return [];
  return Object.values(net.tokens as Record<string, { address: `0x${string}`; decimals: number; symbol: string }>);
};

/** Balances: short, but without misleading rounding to zero for small amounts. */
const fmtAmount = (value: bigint, decimals: number): string => {
  const n = parseFloat(formatUnits(value, decimals));
  if (n === 0) return '0';
  if (n < 0.0001) return '<0.0001';
  if (n < 1) return n.toFixed(4);
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
};

const TokenBalance: React.FC<{
  address?: `0x${string}`;
  token: { address: `0x${string}`; decimals: number; symbol: string };
  chainId: number;
}> = ({ address, token, chainId }) => {
  const { data } = useBalance({ address, token: token.address, chainId });
  if (!data) return null;
  return (
    <div className="balance-item">
      {token.symbol}: {fmtAmount(data.value, token.decimals)}
    </div>
  );
};

/** One network's column: native ETH + the tokens the bot operates with on it. */
const ChainColumn: React.FC<{ address: `0x${string}`; net: (typeof SUPPORTED)[number] }> = ({ address, net }) => {
  const { data: native } = useBalance({ address, chainId: net.chainId });
  return (
    <div className="wallet-chain">
      <div className="wallet-chain-name">{net.name}</div>
      <div className="balance-item">ETH: {native ? fmtAmount(native.value, 18) : '0'}</div>
      {tokensForChain(net.chainId).map((t) => (
        <TokenBalance key={`${net.chainId}-${t.address}`} address={address} token={t} chainId={net.chainId} />
      ))}
    </div>
  );
};

export const CompactWalletInfo: React.FC = () => {
  const { address } = useAccount();
  if (!address) return null;

  // Deliberately no network switch:
  //  • for VIEWING it added nothing: `usePortfolio` reads positions from
  //    all three networks at once anyway (`usePublicClient({chainId: 1/8453/42161})`),
  //    and balances can also be read cross-chain (`useBalance({chainId})`);
  //  • for ACTING it is redundant, because every action switches the network
  //    itself before signing (`switchChainAsync` in useCockpitActions / useRebalanceExecution
  //    / useRotateExecution / useHedgeExecution).
  // A manual switch could therefore only mislead ("I'm on the wrong
  // network, that's probably why I don't see my funds").
  return (
    <div className="wallet-container">
      <div className="wallet-chains">
        {SUPPORTED.map((net) => (
          <ChainColumn key={net.chainId} address={address} net={net} />
        ))}
      </div>
    </div>
  );
};

export default CompactWalletInfo;
