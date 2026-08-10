/**
 * useCockpitActions.ts — write-transactions for the morning cockpit's
 * per-position actions (TASKS-UI.md Partia 3, UX-COCKPIT.md §1.A.3):
 * [💰 Zbierz fees] / [⏹ Zamknij] / [🔄 Rebalans ręczny].
 *
 * Deliberately reuses the same building blocks MyPositions.tsx / AddLiquidity.tsx
 * already use (prepareRemoveLiquidityTransaction, createPosition,
 * prepareAddLiquidityTransaction — all from utils/liquidityManagement.ts, which
 * this UI session must not edit but is free to import from). No position math is
 * reimplemented here — only wired up to cross-chain positions coming from
 * usePortfolio.ts, which already carries the SDK `Pool` object each position
 * needs (built once there from data already fetched, no extra RPC round trip).
 *
 * "Zamknij pozycję" is two on-chain calls, not one: NonfungiblePositionManager's
 * decreaseLiquidity only moves the withdrawn amounts into the position's
 * tokensOwed bucket — a separate collect() is required to actually receive them
 * (it also picks up any already-accrued fees in the same call, via
 * amount0Max/amount1Max = MAX_UINT128, same as the "Zbierz fees" action and
 * MyPositions.tsx's fetchUnclaimedFees trick). The two are sent sequentially:
 * if the wallet confirms step 1 but rejects step 2, funds simply sit as
 * tokensOwed on the position — recoverable any time via "Zbierz fees" — so a
 * partial failure never puts funds at risk, it just needs a retry.
 *
 * Cross-chain note: a position's chain may differ from the wallet's currently
 * connected chain (portfolio spans mainnet + Base). Every action switches the
 * wallet first (ensureChain) and then asks wagmi for a FRESH wallet client for
 * that chain (getWalletClient) rather than trusting the `useWalletClient()`
 * hook value captured at click time — that hook only updates on the next
 * render, which would otherwise risk signing against the pre-switch chain.
 */
import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId, useSwitchChain } from 'wagmi';
import { getWalletClient } from 'wagmi/actions';
import { Pool, Position } from '@uniswap/v3-sdk';
import { Fraction } from '@uniswap/sdk-core';
import { Address, encodeFunctionData, erc20Abi } from 'viem';
import {
  createPosition,
  prepareAddLiquidityTransaction,
  prepareRemoveLiquidityTransaction,
  POSITION_MANAGER_ADDRESSES,
} from '../utils/liquidityManagement';
import { MAX_UINT128 } from '../utils/v3math';
import { RangeSuggestion } from '../utils/advisor';
import { POOL_ABI } from '../utils/uniswap';
import { OBSERVED_PAIRS } from '../config/pools';
import { findBotPoolById } from '../config/botPools';
import { addTransaction } from '../components/TransactionHistory';
import { config } from '../config/wallet';
import { PortfolioPosition } from './usePortfolio';

/**
 * RebalanceTarget — the subset of PortfolioPosition that "open a new position
 * in range [lo, hi]" actually needs (openPositionAtRange / the rebalance
 * modal / balance+allowance helpers below). PortfolioPosition satisfies this
 * structurally, so every existing call site (a held position) keeps working
 * unchanged. Partia 4 adds a second producer: resolveBotPool(), for bot
 * proposals (OPEN / ROTATE step 2) that target a pool the user doesn't hold
 * a position in yet — tokenId is '' in that case.
 */
export interface RebalanceTarget {
  tokenId: string;
  chainId: number;
  poolLabel: string;
  fee: number;
  token0: { address: Address; symbol: string; decimals: number };
  token1: { address: Address; symbol: string; decimals: number };
  pool: Pool | null;
  suggestion: RangeSuggestion | null;
}

const CHAIN_LABEL: Record<number, string> = { 1: 'Ethereum', 8453: 'Base' };

// Przybliżony koszt gazu w USD per sieć — powielone z prywatnej (nieeksportowanej)
// stałej GAS_USD w utils/advisor.ts. Ten plik jest poza twardym zakresem tej
// sesji UI (nie wolno go edytować, nawet żeby dodać export), więc liczby są
// zduplikowane świadomie — trzymać w zgodzie ręcznie, jeśli szacunek się zmieni.
const GAS_USD: Record<number, number> = { 1: 8, 8453: 0.08 };
// UX-COCKPIT.md §1.A.3 mówił o progu "50x gaz" (~$400 na mainnecie, ~$4 na
// Base) — w praktyce prawie nigdy nieosiągalne dla zwykłych pozycji, więc
// przycisk wyglądał na zepsuty. Obniżone do ~8x (mainnet: $64, Base: $0.64)
// — nadal chroni przed zbieraniem groszy droższych niż sam gas, ale nie
// blokuje realistycznych kwot fee. Zgłoszone przez użytkownika 2026-08-10.
export const COLLECT_THRESHOLD_MULT = 8;

export const isCollectWorthwhile = (p: PortfolioPosition): boolean => {
  const gas = GAS_USD[p.chainId] ?? 5;
  return p.feesUsd > gas * COLLECT_THRESHOLD_MULT;
};

export const collectThresholdUsd = (chainId: number): number => (GAS_USD[chainId] ?? 5) * COLLECT_THRESHOLD_MULT;

const COLLECT_ABI = [
  {
    name: 'collect',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'amount0Max', type: 'uint128' },
          { name: 'amount1Max', type: 'uint128' },
        ],
      },
    ],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

export interface CloseAmounts {
  liquidityToRemove: bigint;
  amount0: number;
  amount1: number;
  amount0Min: number;
  amount1Min: number;
}

/**
 * Pure preview helper (no RPC calls) — same formula prepareRemoveLiquidityTransaction
 * uses internally (Position.amount0/1 reduced by the slippage fraction), just
 * surfaced a step earlier so the "Zamknij" modal can show expected amounts
 * before the user confirms. The actual transaction is still built by calling
 * prepareRemoveLiquidityTransaction itself (see closePosition below) — this
 * function never produces calldata, only a display preview.
 */
export const previewClose = (p: PortfolioPosition, percentage: number, slippagePercent: number): CloseAmounts | null => {
  if (!p.pool) return null;
  try {
    const liquidityToRemove = (BigInt(p.liquidity) * BigInt(Math.round(percentage))) / 100n;
    if (liquidityToRemove <= 0n) return null;
    const position = new Position({ pool: p.pool, tickLower: p.tickLower, tickUpper: p.tickUpper, liquidity: liquidityToRemove.toString() });
    const bips = Math.min(Math.max(Math.round(slippagePercent * 100), 5), 500);
    const keep = new Fraction(10_000 - bips, 10_000);
    const min0 = position.amount0.multiply(keep).quotient;
    const min1 = position.amount1.multiply(keep).quotient;
    return {
      liquidityToRemove,
      amount0: Number(position.amount0.toSignificant(8)),
      amount1: Number(position.amount1.toSignificant(8)),
      amount0Min: Number(min0.toString()) / 10 ** p.token0.decimals,
      amount1Min: Number(min1.toString()) / 10 ** p.token1.decimals,
    };
  } catch (e) {
    console.warn('previewClose failed', e);
    return null;
  }
};

export interface CockpitMessage {
  kind: 'ok' | 'err';
  text: string;
}

export function useCockpitActions() {
  const { address } = useAccount();
  const walletChainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const clientMainnet = usePublicClient({ chainId: 1 });
  const clientBase = usePublicClient({ chainId: 8453 });
  const clients: Record<number, ReturnType<typeof usePublicClient>> = { 1: clientMainnet, 8453: clientBase };

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<CockpitMessage | null>(null);

  // Switches the wallet's active chain if needed, then returns a FRESH wallet
  // client for that chain — see module docstring for why this beats reusing
  // the useWalletClient() hook value after a same-call chain switch.
  const freshWalletClient = useCallback(
    async (chainId: number) => {
      if (walletChainId !== chainId) {
        await switchChainAsync({ chainId });
      }
      return getWalletClient(config, { chainId });
    },
    [walletChainId, switchChainAsync]
  );

  const collectFees = useCallback(
    async (p: PortfolioPosition) => {
      if (!address) return;
      const key = `${p.chainId}-${p.tokenId}-collect`;
      setBusyKey(key);
      setMessage(null);
      try {
        const wc = await freshWalletClient(p.chainId);
        const client = clients[p.chainId];
        if (!wc || !client) throw new Error('Brak połączenia z siecią pozycji');
        const data = encodeFunctionData({
          abi: COLLECT_ABI,
          functionName: 'collect',
          args: [{ tokenId: BigInt(p.tokenId), recipient: address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
        });
        const hash = await wc.sendTransaction({ to: p.positionManager, data, account: address, chain: wc.chain });
        await client.waitForTransactionReceipt({ hash });
        addTransaction(address, hash, p.chainId, `Zbierz fee #${p.tokenId} (kokpit)`);
        setMessage({ kind: 'ok', text: `Fee zebrane z pozycji #${p.tokenId} ✓` });
      } catch (e) {
        setMessage({ kind: 'err', text: `Zbieranie fee nieudane: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}` });
      } finally {
        setBusyKey(null);
      }
    },
    [address, freshWalletClient, clients]
  );

  const closePosition = useCallback(
    async (p: PortfolioPosition, percentage: number, slippagePercent: number, onDone?: () => void) => {
      if (!address || !p.pool) return;
      const key = `${p.chainId}-${p.tokenId}-close`;
      setBusyKey(key);
      setMessage(null);
      try {
        const wc = await freshWalletClient(p.chainId);
        const client = clients[p.chainId];
        if (!wc || !client) throw new Error('Brak połączenia z siecią pozycji');

        const liquidityToRemove = (BigInt(p.liquidity) * BigInt(Math.round(percentage))) / 100n;
        if (liquidityToRemove <= 0n) throw new Error('Nic do zamknięcia');

        // Krok 1/2: decreaseLiquidity — dokładnie ta sama funkcja co
        // MyPositions.tsx (utils/liquidityManagement.ts), z pełnym Pool do
        // wyliczenia min-po-slippage.
        setMessage({ kind: 'ok', text: 'Krok 1/2: wycofywanie płynności…' });
        const decreaseTx = await prepareRemoveLiquidityTransaction(
          p.tokenId,
          liquidityToRemove.toString(),
          slippagePercent,
          1800,
          p.chainId,
          { pool: p.pool, tickLower: p.tickLower, tickUpper: p.tickUpper }
        );
        const hash1 = await wc.sendTransaction({
          to: decreaseTx.to,
          data: decreaseTx.data,
          account: address,
          value: BigInt(decreaseTx.value || '0'),
          chain: wc.chain,
        });
        await client.waitForTransactionReceipt({ hash: hash1 });
        addTransaction(address, hash1, p.chainId, `Zamknij ${percentage}% #${p.tokenId} — krok 1/2 (decrease)`);

        // Krok 2/2: collect — odbiera wycofany kapitał ORAZ narosłe fee w
        // jednej transakcji (amount0Max/1Max = MAX_UINT128).
        setMessage({ kind: 'ok', text: 'Krok 2/2: odbieranie środków…' });
        const collectData = encodeFunctionData({
          abi: COLLECT_ABI,
          functionName: 'collect',
          args: [{ tokenId: BigInt(p.tokenId), recipient: address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
        });
        const hash2 = await wc.sendTransaction({ to: p.positionManager, data: collectData, account: address, chain: wc.chain });
        await client.waitForTransactionReceipt({ hash: hash2 });
        addTransaction(address, hash2, p.chainId, `Zamknij ${percentage}% #${p.tokenId} — krok 2/2 (collect)`);

        setMessage({ kind: 'ok', text: `Pozycja #${p.tokenId} zamknięta w ${percentage}% ✓` });
        onDone?.();
      } catch (e) {
        setMessage({
          kind: 'err',
          text: `Zamykanie nieudane — środki bezpieczne (spróbuj ponownie albo zbierz fee ręcznie): ${
            e instanceof Error ? e.message.slice(0, 160) : String(e)
          }`,
        });
      } finally {
        setBusyKey(null);
      }
    },
    [address, freshWalletClient, clients]
  );

  // Rebalans ręczny: otwiera NOWĄ pozycję w tej samej puli — domyślnie w
  // zakresie sugerowanym przez doradcę (p.suggestion), ale to NIE jest
  // wymagane: gdy doradca nie ma statystyk (mało swapów w 24h / pula spoza
  // OBSERVED_PAIRS / chwilowy błąd RPC — patrz CONTEXT.md o limitach
  // publicznych RPC), CockpitPositionActions.tsx pozwala wpisać zakres
  // ręcznie zamiast całkowicie blokować przycisk (zgłoszone przez
  // użytkownika 2026-08-10 — "rebalans ręczny też" [nieaktywny]). Dlatego
  // ticki są jawnym argumentem, nie czytane z p.suggestion tutaj.
  // Reużywa createPosition / prepareAddLiquidityTransaction, te same funkcje
  // co AddLiquidity.tsx. Docelowy builder z UX-COCKPIT.md §3 (zamknij+swap+
  // mint w jednej sekwencji) to zadanie sesji analitycznej — do tego czasu
  // jest to zamknij starą pozycję osobno, otwórz nową tutaj (§5 kolejności wdrożenia).
  const openPositionAtRange = useCallback(
    async (p: RebalanceTarget, tickLower: number, tickUpper: number, amount0: string, amount1: string, slippageBps: number, onDone?: () => void) => {
      if (!address || !p.pool) return;
      const key = `${p.chainId}-${p.tokenId}-rebalance`;
      setBusyKey(key);
      setMessage(null);
      try {
        const wc = await freshWalletClient(p.chainId);
        const client = clients[p.chainId];
        if (!wc || !client) throw new Error('Brak połączenia z siecią pozycji');
        const position = createPosition(p.pool, tickLower, tickUpper, amount0 || '0', amount1 || '0');
        const tx = prepareAddLiquidityTransaction(position, slippageBps, 1800, p.chainId, address);
        // symulacja przed wysłaniem — rewert łapiemy zanim zapłacisz gas (jak AddLiquidity.tsx)
        await client.call({ to: tx.to as Address, data: tx.data as `0x${string}`, account: address });
        const hash = await wc.sendTransaction({
          to: tx.to as Address,
          data: tx.data as `0x${string}`,
          value: 0n,
          account: address,
          chain: wc.chain,
        });
        await client.waitForTransactionReceipt({ hash });
        addTransaction(address, hash, p.chainId, `Rebalans ręczny (nowa pozycja) ${p.poolLabel}`);
        setMessage({ kind: 'ok', text: 'Nowa pozycja otwarta ✓' });
        onDone?.();
      } catch (e) {
        setMessage({ kind: 'err', text: `Otwarcie pozycji nieudane: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}` });
      } finally {
        setBusyKey(null);
      }
    },
    [address, freshWalletClient, clients]
  );

  // Saldo + allowance tokenu pozycji (do modala rebalansu — approve jak w AddLiquidity.tsx).
  const readBalanceAndAllowance = useCallback(
    async (p: RebalanceTarget, which: 0 | 1): Promise<{ balance: bigint; allowance: bigint }> => {
      const client = clients[p.chainId];
      const manager = POSITION_MANAGER_ADDRESSES[p.chainId] as Address | undefined;
      if (!client || !manager || !address) return { balance: 0n, allowance: 0n };
      const token = which === 0 ? p.token0.address : p.token1.address;
      const [balance, allowance] = await Promise.all([
        client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
        client.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [address, manager] }) as Promise<bigint>,
      ]);
      return { balance, allowance };
    },
    [clients, address]
  );

  const approveToken = useCallback(
    async (p: RebalanceTarget, which: 0 | 1, amount: bigint) => {
      if (!address) return;
      const wc = await freshWalletClient(p.chainId);
      const client = clients[p.chainId];
      const manager = POSITION_MANAGER_ADDRESSES[p.chainId] as Address | undefined;
      if (!wc || !client || !manager) return;
      const token = which === 0 ? p.token0.address : p.token1.address;
      const hash = await wc.writeContract({ address: token, abi: erc20Abi, functionName: 'approve', args: [manager, amount], account: address, chain: wc.chain });
      await client.waitForTransactionReceipt({ hash });
    },
    [address, freshWalletClient, clients]
  );

  // Resolves an on-chain Pool + token pair for one of the bot's configured
  // pools (BOT_POOLS, duplicated in config/botPools.ts) by id, for bot
  // proposals (kind OPEN / ROTATE step 2) that target a pool the user has no
  // existing position in — so there's no PortfolioPosition to reuse. Token
  // instances (address/decimals) come from OBSERVED_PAIRS, which already has
  // the same USDC/WETH pairs the bot watches (both are "core" role) — no new
  // token metadata to maintain. Only 2 extra RPC reads (slot0 + liquidity),
  // done on demand when the user clicks [Otwórz →], not on every render.
  const resolveBotPool = useCallback(
    async (botPoolId: string): Promise<RebalanceTarget | null> => {
      const meta = findBotPoolById(botPoolId);
      if (!meta) return null;
      const client = clients[meta.chainId];
      if (!client) return null;
      const pair = OBSERVED_PAIRS.find(
        (o) =>
          o.chainId === meta.chainId &&
          o.feeTiers.includes(meta.feeBps) &&
          new Set([o.token0.symbol, o.token1.symbol]).has(meta.sym0) &&
          new Set([o.token0.symbol, o.token1.symbol]).has(meta.sym1)
      );
      if (!pair) return null;
      const [tA, tB] =
        pair.token0.address.toLowerCase() < pair.token1.address.toLowerCase() ? [pair.token0, pair.token1] : [pair.token1, pair.token0];
      try {
        const [slot0, liquidity] = await Promise.all([
          client.readContract({ address: meta.address, abi: POOL_ABI, functionName: 'slot0' }) as Promise<
            readonly [bigint, number, number, number, number, number, boolean]
          >,
          client.readContract({ address: meta.address, abi: POOL_ABI, functionName: 'liquidity' }) as Promise<bigint>,
        ]);
        const pool = new Pool(tA, tB, meta.feeBps, slot0[0].toString(), liquidity.toString(), slot0[1]);
        return {
          tokenId: '',
          chainId: meta.chainId,
          poolLabel: `${tA.symbol}/${tB.symbol} ${(meta.feeBps / 10_000).toFixed(2)}% · ${CHAIN_LABEL[meta.chainId] ?? meta.chainId}`,
          fee: meta.feeBps,
          token0: { address: tA.address as Address, symbol: tA.symbol || '?', decimals: tA.decimals },
          token1: { address: tB.address as Address, symbol: tB.symbol || '?', decimals: tB.decimals },
          pool,
          suggestion: null,
        };
      } catch (e) {
        console.warn('resolveBotPool failed', botPoolId, e);
        return null;
      }
    },
    [clients]
  );

  return {
    busyKey,
    message,
    setMessage,
    collectFees,
    closePosition,
    openPositionAtRange,
    readBalanceAndAllowance,
    approveToken,
    resolveBotPool,
  };
}
