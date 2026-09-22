/**
 * useCockpitActions.ts — write-transactions for the morning cockpit's
 * per-position actions (TASKS-UI.md Batch 3, UX-COCKPIT.md §1.A.3):
 * [💰 Collect fees] / [⏹ Close] / [🔄 Manual rebalance].
 *
 * Deliberately reuses the same building blocks MyPositions.tsx / AddLiquidity.tsx
 * already use (prepareRemoveLiquidityTransaction, createPosition,
 * prepareAddLiquidityTransaction — all from utils/liquidityManagement.ts, which
 * this UI session must not edit but is free to import from). No position math is
 * reimplemented here — only wired up to cross-chain positions coming from
 * usePortfolio.ts, which already carries the SDK `Pool` object each position
 * needs (built once there from data already fetched, no extra RPC round trip).
 *
 * "Close position" is two on-chain calls, not one: NonfungiblePositionManager's
 * decreaseLiquidity only moves the withdrawn amounts into the position's
 * tokensOwed bucket — a separate collect() is required to actually receive them
 * (it also picks up any already-accrued fees in the same call, via
 * amount0Max/amount1Max = MAX_UINT128, same as the "Collect fees" action and
 * MyPositions.tsx's fetchUnclaimedFees trick). The two are sent sequentially:
 * if the wallet confirms step 1 but rejects step 2, funds simply sit as
 * tokensOwed on the position — recoverable any time via "Collect fees" — so a
 * partial failure never puts funds at risk, it just needs a retry.
 *
 * Cross-chain note: a position's chain may differ from the wallet's currently
 * connected chain (portfolio spans mainnet + Base). Every action switches the
 * wallet first (ensureChain) and then asks wagmi for a FRESH wallet client for
 * that chain (getWalletClient) rather than trusting the `useWalletClient()`
 * hook value captured at click time — that hook only updates on the next
 * render, which would otherwise risk signing against the pre-switch chain.
 */
import { useCallback, useEffect, useState } from 'react';
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
 * unchanged. Batch 4 adds a second producer: resolveBotPool(), for bot
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

const CHAIN_LABEL: Record<number, string> = { 1: 'Ethereum', 8453: 'Base', 42161: 'Arbitrum' };

// Key consistent with `busyKey` (without the action suffix) — ties CockpitMessage/
// CloseStepStatus to a specific position, so card X never shows the result
// of an action from card Y (FIX 25.08, owner's report: the close toast for
// #953427 rendered on card #953465 after the closed card disappeared —
// `message` was a single global value shared by ALL cards, without
// checking which position it belonged to).
const posKey = (chainId: number, tokenId: string): string => `${chainId}-${tokenId}`;

// --- Global toast (Batch 13, item 3) ---
// `message` (state below) is rendered today ONLY inside
// CockpitPositionActions.tsx, keyed by posKey(chainId, tokenId) — it works for
// actions on a HELD position (a card with that tokenId exists in the tree). But
// the "Open position" modal invoked from a bot PROPOSAL card (MorningCockpit.tsx,
// `proposalModal?.type==='open'`, RebalanceModal with initialUsdRange) concerns
// a pool in which the user does NOT yet have a position — tokenId==='', so no
// position card ever matches the key and the toast never renders. On top of that
// the modal disappears immediately after success anyway (onDone→onClose), so even
// if some toast lived inside it, it would vanish together with the modal before the
// user could read it — hence the report "the modal closes, no idea whether it
// succeeded". The scope of this session is only this file + CockpitPositionActions.tsx
// (not MorningCockpit.tsx), so instead of threading a new render target through
// the React tree, the toast mounts as a small, standalone element on
// document.body — it lives as long as the card, regardless of which modal
// invoked it and whether it has already unmounted. Uses the same CSS classes as
// the existing `.message` (styles.css, outside this session's scope) — inline only
// positioning/z-index, so as not to touch the CSS.
let globalToastEl: HTMLDivElement | null = null;
let globalToastHideTimer: ReturnType<typeof setTimeout> | null = null;

function showGlobalToast(kind: 'ok' | 'err', text: string) {
  if (typeof document === 'undefined') return;
  if (!globalToastEl) {
    globalToastEl = document.createElement('div');
    globalToastEl.setAttribute('role', 'status');
    globalToastEl.style.position = 'fixed';
    globalToastEl.style.bottom = '24px';
    globalToastEl.style.right = '24px';
    globalToastEl.style.zIndex = '9999';
    globalToastEl.style.maxWidth = '360px';
    globalToastEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
    globalToastEl.style.transition = 'opacity 0.2s ease';
    document.body.appendChild(globalToastEl);
  }
  globalToastEl.className = `message ${kind === 'ok' ? 'success' : 'error'}`;
  globalToastEl.style.opacity = '1';
  globalToastEl.style.display = 'block';
  globalToastEl.textContent = text;
  if (globalToastHideTimer) clearTimeout(globalToastHideTimer);
  // Same duration as the auto-hide of the per-card `message` (10s, FIX 25.08) —
  // consistent behaviour, one number to remember.
  globalToastHideTimer = setTimeout(() => {
    if (globalToastEl) globalToastEl.style.opacity = '0';
  }, 10_000);
}

// Best-effort read of the transaction confirmation (Batch 13, items 1+3): the hash
// IS already sent at the moment of the call — the transaction itself lives on
// chain regardless of whether `waitForTransactionReceipt` here manages to
// see it in time. Throwing at this point (as before) treated "RPC did not
// respond in time" identically to "the transaction failed" — which with
// real capital led to: (approve) the allowance stays old despite the
// signed approval, the button "comes back"; (position open) the position opens
// on chain, but the UI reports an error and the modal stays open, because `onDone()`
// is never called. The same class of fix as useHedgeExecution (20.08):
// 2 attempts 5s apart, and once exhausted we RETURN (do not throw) — the caller
// continues as if the transaction went through (the hash will land on chain sooner
// or later; the next balance/allowance read will show it correctly anyway).
// HOTFIX 31.08 (first live FLAT_NARROW): exported — also used by
// useRebalanceExecution/useRotateExecution (the [Confirm] sequences still had
// raw waitForTransactionReceipt and aborted on the same Rabby+publicnode
// "Invalid parameters" error as useHedgeExecution on 20.08). Additionally
// hash format validation as in useHedgeExecution — an unusual hash from the wallet
// skips the wait instead of blowing up the sequence.
export async function waitReceiptBestEffort(
  client: { waitForTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<unknown> },
  hash: `0x${string}`,
  retries = 2,
  delayMs = 5_000
): Promise<void> {
  if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    console.warn('waitReceiptBestEffort: unusual hash from the wallet — skipping receipt:', String(hash).slice(0, 80));
    return;
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await client.waitForTransactionReceipt({ hash });
      return;
    } catch (e) {
      if (attempt === retries) {
        console.warn('waitReceiptBestEffort: receipt not confirmed after retry, continuing (hash sent):', hash, e);
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// Block explorer link per network (Batch: visible CloseModal progress,
// 25.08) — TransactionHistory.tsx has a similar one, but binary mainnet/Sepolia
// (Sepolia removed 21.08, file outside this session's scope) — deliberately NOT
// reused, a separate small constant here instead of inheriting that debt.
const EXPLORER_TX_URL: Record<number, string> = {
  1: 'https://etherscan.io/tx/',
  8453: 'https://basescan.org/tx/',
  42161: 'https://arbiscan.io/tx/',
};
export const explorerTxUrl = (chainId: number, hash: string): string => `${EXPLORER_TX_URL[chainId] ?? EXPLORER_TX_URL[1]}${hash}`;

// Approximate gas cost in USD per network — duplicated from the private (non-exported)
// GAS_USD constant in utils/advisor.ts. That file is outside the hard scope of this
// UI session (must not be edited, not even to add an export), so the numbers are
// duplicated deliberately — keep in sync manually if the estimate changes.
// Arbitrum (42161): 0.10 — calibrated by the analytics session (Fable,
// HANDOFF 2026-08-11) based on backtest/load.ts (GAS_USD arbitrum: 0.1),
// to keep "one truth" with the backtests. Previously 0.15 (rough
// L2 estimate, advisor.ts still has no separate value for this chainId —
// the fallback there is `?? 5`).
// FIX 25.08 (HANDOFF Fable→Sonnet): these constants turned out to be falsely high
// on mainnet at low gas — real collect cost $0.27 (0.75 Gwei)
// vs the threshold computed from this constant: $64. From now on GAS_USD is EXCLUSIVELY a fallback,
// used when `getGasPrice()` fails or the ETH price is unknown (see
// `collectThresholdUsdLive` below) — the constant itself and the threshold based on it
// (`collectThresholdUsd`/`isCollectWorthwhile`) remain untouched, to
// keep a deterministic fallback.
const GAS_USD: Record<number, number> = { 1: 8, 8453: 0.08, 42161: 0.1 };
// UX-COCKPIT.md §1.A.3 spoke of a "50x gas" threshold (~$400 on mainnet, ~$4 on
// Base) — in practice almost never reachable for ordinary positions, so the
// button looked broken. Lowered to ~8x (mainnet: $64, Base: $0.64)
// — still protects against collecting pennies that cost more than the gas itself, but does not
// block realistic fee amounts. Reported by the user 2026-08-10.
export const COLLECT_THRESHOLD_MULT = 8;

// Fallback (constant) — used only inside `*Live` below, when the live read
// is not available. They remain exported in case of other call sites.
export const isCollectWorthwhile = (p: PortfolioPosition): boolean => {
  const gas = GAS_USD[p.chainId] ?? 5;
  return p.feesUsd > gas * COLLECT_THRESHOLD_MULT;
};

export const collectThresholdUsd = (chainId: number): number => (GAS_USD[chainId] ?? 5) * COLLECT_THRESHOLD_MULT;

// Gas consumed by a single collect() call (NonfungiblePositionManager) —
// rough, stable for this one call type (no loops/swaps).
const COLLECT_GAS_UNITS = 150_000n;
// Gas price changes quickly, but this is only a gate for the button (not a critical
// read before signing — the transaction itself pays the current gas in the wallet anyway),
// so refreshing every 2 min is enough and does not flood the RPC.
const GAS_PRICE_POLL_MS = 2 * 60_000;

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
 * surfaced a step earlier so the "Close" modal can show expected amounts
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
  /** posKey(chainId, tokenId) of the source position (FIX 25.08) — the consumer
   *  (CockpitPositionActions.tsx) renders the message ONLY on the card
   *  with the matching key, so it does not "jump" to another card when
   *  the source card disappears (e.g. position closed 100%). */
  key: string;
}

/** Progress of the [⏹ Close] sequence (2 transactions: decrease → collect) — separate
 *  from `message` (which is only the final ok/err summary), so that
 *  CloseModal can show STEP BY STEP what is happening instead of a single
 *  lost "Processing…" (owner's report after the 1st live close of
 *  #953427 on the evening of 25.08: 2 signatures in Rabby ~30s apart, the user
 *  did not know which step they were on). Kept in a Record per position
 *  (posKey) — just like `message` it may concern multiple cards at once in theory
 *  (though in practice there is one modal at a time), so the key prevents the
 *  same leak between cards as with `message`. */
export interface CloseStepStatus {
  step: 1 | 2; // current/last step in progress
  hash1?: string; // decrease — set immediately after sending, before confirmation
  hash2?: string; // collect
  done: boolean;
  error?: string;
}

export function useCockpitActions() {
  const { address } = useAccount();
  const walletChainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const clientMainnet = usePublicClient({ chainId: 1 });
  const clientBase = usePublicClient({ chainId: 8453 });
  const clientArbitrum = usePublicClient({ chainId: 42161 });
  const clients: Record<number, ReturnType<typeof usePublicClient>> = { 1: clientMainnet, 8453: clientBase, 42161: clientArbitrum };

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<CockpitMessage | null>(null);
  // CloseModal step per position (FIX 25.08) — see the CloseStepStatus docstring.
  const [closeStatus, setCloseStatus] = useState<Record<string, CloseStepStatus>>({});
  // Live gas price per network (FIX 25.08) — poll independent of `clients` (object
  // recreated every render), dep on the three specific references from wagmi.
  const [gasPriceWei, setGasPriceWei] = useState<Partial<Record<number, bigint>>>({});

  // Toast auto-hide after ~10s (FIX 25.08, owner's report) — regardless
  // of jumping between cards (see `posKey`/`CockpitMessage.key`),
  // an old message must never hang around forever.
  useEffect(() => {
    if (!message) return;
    // Item 3 (Batch 13): every `message` is also shown as a global
    // toast on document.body — see the comment at showGlobalToast above.
    // It does not replace the per-card render in CockpitPositionActions.tsx (that
    // stays for context next to the specific card), it only adds a version
    // that survives closing/unmounting of any modal.
    showGlobalToast(message.kind, message.text);
    const id = setTimeout(() => setMessage(null), 10_000);
    return () => clearTimeout(id);
  }, [message]);

  useEffect(() => {
    let cancelled = false;
    const fetchGasPrices = async () => {
      const chainClients: [number, typeof clientMainnet][] = [
        [1, clientMainnet],
        [8453, clientBase],
        [42161, clientArbitrum],
      ];
      const results = await Promise.all(
        chainClients.map(async ([chainId, client]) => {
          if (!client) return null;
          try {
            return [chainId, await client.getGasPrice()] as const;
          } catch {
            // read failed (RPC/network) — collectThresholdUsdLive falls back to GAS_USD
            return null;
          }
        })
      );
      if (cancelled) return;
      setGasPriceWei((prev) => {
        const next = { ...prev };
        for (const r of results) if (r) next[r[0]] = r[1];
        return next;
      });
    };
    fetchGasPrices();
    const id = setInterval(fetchGasPrices, GAS_PRICE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [clientMainnet, clientBase, clientArbitrum]);

  // Live cost of a single collect() in USD — null when the gas read OR the
  // ETH price is missing (ethUsd from usePortfolio.ts, derived from the user's
  // stable/ETH pool — may not exist when there is no such position).
  const liveGasCostUsd = useCallback(
    (chainId: number, ethUsd: number | null): number | null => {
      const priceWei = gasPriceWei[chainId];
      if (priceWei === undefined || ethUsd === null) return null;
      return (Number(priceWei * COLLECT_GAS_UNITS) / 1e18) * ethUsd;
    },
    [gasPriceWei]
  );

  // [Collect fees] threshold computed from live gas (FIX 25.08) — falls back to the
  // GAS_USD constant only when `liveGasCostUsd` returns null (read failed / no ETH
  // price). The multiplier stays the same (COLLECT_THRESHOLD_MULT=8), sensible
  // only with a realistic base.
  const collectThresholdUsdLive = useCallback(
    (chainId: number, ethUsd: number | null): number => {
      const live = liveGasCostUsd(chainId, ethUsd);
      return (live ?? GAS_USD[chainId] ?? 5) * COLLECT_THRESHOLD_MULT;
    },
    [liveGasCostUsd]
  );

  const isCollectWorthwhileLive = useCallback(
    (p: PortfolioPosition, ethUsd: number | null): boolean => p.feesUsd > collectThresholdUsdLive(p.chainId, ethUsd),
    [collectThresholdUsdLive]
  );

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
        if (!wc || !client) throw new Error('No connection to the position network');
        const data = encodeFunctionData({
          abi: COLLECT_ABI,
          functionName: 'collect',
          args: [{ tokenId: BigInt(p.tokenId), recipient: address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
        });
        const hash = await wc.sendTransaction({ to: p.positionManager, data, account: address, chain: wc.chain });
        await client.waitForTransactionReceipt({ hash });
        addTransaction(address, hash, p.chainId, `Collect fees #${p.tokenId} (cockpit)`);
        setMessage({ kind: 'ok', text: `Fees collected from position #${p.tokenId} ✓`, key: posKey(p.chainId, p.tokenId) });
      } catch (e) {
        setMessage({
          kind: 'err',
          text: `Fee collection failed: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`,
          key: posKey(p.chainId, p.tokenId),
        });
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
      const sKey = posKey(p.chainId, p.tokenId);
      setBusyKey(key);
      setMessage(null);
      setCloseStatus((prev) => ({ ...prev, [sKey]: { step: 1, done: false } }));
      try {
        const wc = await freshWalletClient(p.chainId);
        const client = clients[p.chainId];
        if (!wc || !client) throw new Error('No connection to the position network');

        const liquidityToRemove = (BigInt(p.liquidity) * BigInt(Math.round(percentage))) / 100n;
        if (liquidityToRemove <= 0n) throw new Error('Nothing to close');

        // Step 1/2: decreaseLiquidity — exactly the same function as
        // MyPositions.tsx (utils/liquidityManagement.ts), with the full Pool to
        // compute the post-slippage minimums. Progress now in `closeStatus` (FIX 25.08,
        // report after the 1st live close of #953427: a bare "Processing…"
        // for ~30s between 2 signatures in Rabby did not say where we stood) —
        // CloseModal reads this state and renders the step list with an explorer
        // link, `message` remains only for the final ok/err summary.
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
        setCloseStatus((prev) => ({ ...prev, [sKey]: { step: 1, hash1, done: false } }));
        await client.waitForTransactionReceipt({ hash: hash1 });
        addTransaction(address, hash1, p.chainId, `Close ${percentage}% #${p.tokenId} — step 1/2 (decrease)`);

        // Step 2/2: collect — receives the withdrawn capital AND the accrued fees in
        // one transaction (amount0Max/1Max = MAX_UINT128). Step 1 already has
        // its confirmation at this point — Rabby sometimes shows "Simulation
        // failed" on THIS signature (it simulates against state from just before
        // step 1 was confirmed), CloseModal explains this next to hash1.
        setCloseStatus((prev) => ({ ...prev, [sKey]: { ...prev[sKey], step: 2 } }));
        const collectData = encodeFunctionData({
          abi: COLLECT_ABI,
          functionName: 'collect',
          args: [{ tokenId: BigInt(p.tokenId), recipient: address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
        });
        const hash2 = await wc.sendTransaction({ to: p.positionManager, data: collectData, account: address, chain: wc.chain });
        setCloseStatus((prev) => ({ ...prev, [sKey]: { ...prev[sKey], step: 2, hash2 } }));
        await client.waitForTransactionReceipt({ hash: hash2 });
        addTransaction(address, hash2, p.chainId, `Close ${percentage}% #${p.tokenId} — step 2/2 (collect)`);

        setCloseStatus((prev) => ({ ...prev, [sKey]: { ...prev[sKey], step: 2, done: true } }));
        setMessage({ kind: 'ok', text: `Position #${p.tokenId} closed ${percentage}% ✓`, key: sKey });
        onDone?.();
      } catch (e) {
        const errText = e instanceof Error ? e.message.slice(0, 160) : String(e);
        // A failure mid-sequence does NOT mean loss of funds — decreaseLiquidity
        // (step 1, if confirmed) moves the withdrawal to tokensOwed on the position,
        // recoverable at any time via [💰 Collect fees]. `closeStatus`
        // stays at the step where it stopped (hash1/step still visible in the
        // modal — the user sees which signatures went through), we only append the error.
        setCloseStatus((prev) => ({ ...prev, [sKey]: { ...(prev[sKey] ?? { step: 1, done: false }), error: errText } }));
        setMessage({
          kind: 'err',
          text: `Close failed — funds are safe (try again or collect fees manually): ${errText}`,
          key: sKey,
        });
      } finally {
        setBusyKey(null);
      }
    },
    [address, freshWalletClient, clients]
  );

  // Manual rebalance: opens a NEW position in the same pool — by default in
  // the range suggested by the advisor (p.suggestion), but this is NOT
  // required: when the advisor has no stats (few swaps in 24h / pool outside
  // OBSERVED_PAIRS / transient RPC error — see CONTEXT.md on public RPC
  // limits), CockpitPositionActions.tsx allows entering the range
  // manually instead of blocking the button entirely (reported by the
  // user 2026-08-10 — "manual rebalance too" [inactive]). That is why
  // the ticks are an explicit argument, not read from p.suggestion here.
  // Reuses createPosition / prepareAddLiquidityTransaction, the same functions
  // as AddLiquidity.tsx. The target builder from UX-COCKPIT.md §3 (close+swap+
  // mint in one sequence) is a task for the analytics session — until then
  // it is: close the old position separately, open the new one here (§5 rollout order).
  const openPositionAtRange = useCallback(
    async (p: RebalanceTarget, tickLower: number, tickUpper: number, amount0: string, amount1: string, slippageBps: number, onDone?: () => void) => {
      if (!address || !p.pool) return;
      const key = `${p.chainId}-${p.tokenId}-rebalance`;
      setBusyKey(key);
      setMessage(null);
      try {
        const wc = await freshWalletClient(p.chainId);
        const client = clients[p.chainId];
        if (!wc || !client) throw new Error('No connection to the position network');
        const position = createPosition(p.pool, tickLower, tickUpper, amount0 || '0', amount1 || '0');
        const tx = prepareAddLiquidityTransaction(position, slippageBps, 1800, p.chainId, address);
        // simulation before sending — we catch a revert before you pay gas (like AddLiquidity.tsx)
        await client.call({ to: tx.to as Address, data: tx.data as `0x${string}`, account: address });
        const hash = await wc.sendTransaction({
          to: tx.to as Address,
          data: tx.data as `0x${string}`,
          value: 0n,
          account: address,
          chain: wc.chain,
        });
        // Item 3 (Batch 13): best-effort, do NOT throw — the send itself already passed
        // simulation (client.call above) and sent the hash; previously a hard throw
        // here (when the RPC did not deliver the receipt in time) landed in the catch below, even though
        // the position opened correctly on chain — the user saw an error, the modal
        // stayed open (onDone?.() never called), because the exception interrupted
        // execution before this line.
        await waitReceiptBestEffort(client, hash);
        addTransaction(address, hash, p.chainId, `Manual rebalance (new position) ${p.poolLabel}`);
        setMessage({ kind: 'ok', text: 'New position opened ✓', key: posKey(p.chainId, p.tokenId) });
        // The modal must CLOSE after success (item 3) — onDone passed by the
        // caller (RebalanceModal→CockpitPositionActions/MorningCockpit)
        // is always tied to onClose on its side; the toast survives thanks to
        // showGlobalToast in the useEffect above, regardless of the modal unmounting.
        onDone?.();
      } catch (e) {
        setMessage({
          kind: 'err',
          text: `Position open failed: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`,
          key: posKey(p.chainId, p.tokenId),
        });
      } finally {
        setBusyKey(null);
      }
    },
    [address, freshWalletClient, clients]
  );

  // Balance + allowance of a position token (for the rebalance modal — approve as in AddLiquidity.tsx).
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
      // Item 1 (Batch 13): best-effort, do NOT throw — see waitReceiptBestEffort.
      // The hash is already sent; the caller (RebalanceModal.approve()) always
      // refreshes balance+allowance right after returning from here, so even if this
      // read does not make it in time, the next refreshBalances() will show the truth anyway.
      await waitReceiptBestEffort(client, hash);
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
  // done on demand when the user clicks [Open →], not on every render.
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
    closeStatus,
    openPositionAtRange,
    readBalanceAndAllowance,
    approveToken,
    resolveBotPool,
    collectThresholdUsdLive,
    isCollectWorthwhileLive,
  };
}
