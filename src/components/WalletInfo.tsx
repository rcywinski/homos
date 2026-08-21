import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther, formatUnits, isAddress } from 'viem';
import { NETWORKS } from '../utils/uniswap';

/**
 * PRZEBUDOWA 21.08 (uwagi Rafała: „przełącznik Sepolia do usunięcia",
 * „może powinny być wyświetlane wszystkie waluty, a nie tylko wybrane 3").
 *
 * Co było źle — nie tylko kosmetycznie:
 *  1. Etykieta sieci była BINARNA (`isMainnet ? 'Mainnet' : 'Sepolia'`), więc
 *     na Base i Arbitrum nagłówek pokazywał „Sepolia". Kłamał o tym, na jakiej
 *     sieci jesteś, a bot pracuje właśnie na Base/Arbitrum.
 *  2. Adresy WETH/USDC też były binarne: poza mainnetem brane były adresy
 *     SEPOLII, więc na Base/Arbitrum salda ZAWSZE pokazywały 0, nawet gdy
 *     tokeny tam były.
 *  3. Przycisk ⇄ przełączał wyłącznie mainnet↔Sepolia.
 *
 * Jak jest teraz: lista tokenów pochodzi z `NETWORKS` (utils/uniswap.ts) —
 * czyli dokładnie z tych, którymi operuje bot na danej sieci (Base ma cbBTC,
 * mainnet USDT itd.), plus natywny ETH. Zero adresów wpisanych na sztywno.
 *
 * DLACZEGO NIE „wszystkie tokeny z portfela": po ERC-20 nie da się
 * wylistować sald bez indeksera (Alchemy/Covalent/Moralis) — RPC odpowiada
 * tylko na pytanie „ile mam TEGO tokena". Do tego dochodzą tokeny-śmieci,
 * których nikt nie chce oglądać w nagłówku. Jeśli kiedyś chcemy pełny widok
 * portfela, trzeba dołożyć klucz do indeksera — wtedy ta lista staje się
 * fallbackiem.
 */

const SUPPORTED = [NETWORKS.MAINNET, NETWORKS.BASE, NETWORKS.ARBITRUM];

/** Tokeny warte pokazania na danej sieci — te, w których bot trzyma pozycje. */
const tokensForChain = (chainId: number) => {
  const net = SUPPORTED.find((n) => n.chainId === chainId);
  if (!net) return [];
  return Object.values(net.tokens as Record<string, { address: `0x${string}`; decimals: number; symbol: string }>);
};

/** Salda: krótko, ale bez mylącego zaokrąglenia do zera przy małych kwotach. */
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

/** Kolumna jednej sieci: natywny ETH + tokeny, którymi bot na niej operuje. */
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

  // BEZ przełącznika sieci (pytanie Rafała 21.08: „czy trzeba mieć ten
  // przełącznik?"). Nie trzeba — i to nie jest kwestia gustu:
  //  • do OGLĄDANIA nic nie wnosił: `usePortfolio` i tak czyta pozycje ze
  //    wszystkich trzech sieci naraz (`usePublicClient({chainId: 1/8453/42161})`),
  //    a salda też da się czytać cross-chain (`useBalance({chainId})`);
  //  • do DZIAŁANIA jest zbędny, bo każda akcja przełącza sieć sama przed
  //    podpisem (`switchChainAsync` w useCockpitActions / useRebalanceExecution
  //    / useRotateExecution / useHedgeExecution).
  // Ręczny przełącznik mógł więc tylko wprowadzać w błąd („jestem na złej
  // sieci, to pewnie dlatego nie widzę środków").
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

/**
 * Stary, rozbudowany widok portfela — był wyłącznie panelem testnetowym
 * (przełączniki Mainnet/Sepolia + linki do faucetów Sepolii). Nigdzie nie
 * importowany (App używa `CompactWalletInfo`), a po decyzji o usunięciu
 * Sepolii nie ma czego pokazywać. Usunięty 21.08 razem z `FaucetSection`.
 */
export default CompactWalletInfo;
