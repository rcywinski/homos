/**
 * useHedgeExecution.ts — executes a `HedgePlan` from utils/hedgeBuilder.ts
 * (TASKS-UI.md Batch 9: [Confirm hedge] on the HEDGE proposal card, GMX v2
 * on Arbitrum). Same pattern as useRebalanceExecution.ts/useCockpitActions.ts
 * (freshWalletClient after an optional network switch, MANDATORY client.call
 * simulation before sendTransaction — see the hedgeBuilder.ts header,
 * addTransaction to the history), with two hedge-specific differences:
 *
 *  - The network is ALWAYS Arbitrum (GMX_ARBITRUM.chainId=42161), regardless of
 *    the network of the LP pool the proposal concerns (the hedge is a separate perp market) —
 *    freshWalletClient here does not take chainId as an argument, it is hardwired.
 *  - The USDC balance is checked BEFORE building any transaction: when it is short,
 *    the hook throws a readable error and sends NOTHING (no auto-swaps in v1, per
 *    the brief) — unlike the rebalance, where approve/mint are always
 *    executable (the funds are already on the position).
 *
 * The open short state (`homos_hedge_open`, a global key — bot v1.2
 * proposes a hedge for only one pool at a time, base-030) is saved after a
 * successful OPEN (plan.preview.direction==='open-short'), cleared after a
 * successful CLOSE — "simple" per the brief, without GMX Reader
 * integration (future improvement, TASKS-UI.md).
 */
import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { getWalletClient } from 'wagmi/actions';
import { erc20Abi } from 'viem';
import { HedgePlan, GMX_ARBITRUM } from '../utils/hedgeBuilder';
import { addTransaction } from '../components/TransactionHistory';
import { config } from '../config/wallet';

export interface HedgeExecStatus {
  phase: 'idle' | 'checking' | 'approving' | 'sending' | 'done' | 'error';
  message: string;
}
const IDLE: HedgeExecStatus = { phase: 'idle', message: '' };

// --- open short state, localStorage like the rest of the app (homos_api_base etc.) ---
const HEDGE_STATE_KEY = 'homos_hedge_open';
export interface HedgeOpenState {
  sizeUsd: number;
  collateralUsd: number;
  ts: string;
}
export const loadHedgeOpen = (): HedgeOpenState | null => {
  try {
    const v = localStorage.getItem(HEDGE_STATE_KEY);
    return v ? (JSON.parse(v) as HedgeOpenState) : null;
  } catch {
    return null;
  }
};
const saveHedgeOpen = (s: HedgeOpenState): void => {
  try {
    localStorage.setItem(HEDGE_STATE_KEY, JSON.stringify(s));
  } catch {
    /* in-memory only */
  }
};
export const clearHedgeOpen = (): void => {
  try {
    localStorage.removeItem(HEDGE_STATE_KEY);
  } catch {
    /* noop */
  }
};

// As `number` (not the `42161` literal from `as const` in GMX_ARBITRUM) — otherwise
// getWalletClient(config, { chainId: <literal> }) picks up an overly narrow wagmi
// overload and `wc.chain` in sendTransaction gets typed as `never` (TS2345).
// Same pattern as in useRebalanceExecution.ts/useCockpitActions.ts, where
// chainId always arrives as a plain `number` parameter, never a literal.
const HEDGE_CHAIN_ID: number = GMX_ARBITRUM.chainId;

export function useHedgeExecution() {
  const { address } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const client = usePublicClient({ chainId: HEDGE_CHAIN_ID });

  const [status, setStatus] = useState<HedgeExecStatus>(IDLE);
  const [error, setError] = useState<string | null>(null);

  const freshWalletClient = useCallback(async () => {
    if (walletChainId !== HEDGE_CHAIN_ID) await switchChainAsync({ chainId: HEDGE_CHAIN_ID });
    return getWalletClient(config, { chainId: HEDGE_CHAIN_ID });
  }, [walletChainId, switchChainAsync]);

  // FIX 20.08 (owner's ~$15 test): Rabby returned a hash that publicnode did not
  // accept in eth_getTransactionReceipt ("Invalid parameters") — the hook threw
  // AFTER a successful send and did NOT save the short state, even though the position
  // was live on-chain. Rule: after sendTransaction the tx IS sent — waiting for
  // the receipt is best-effort (hash format validation + try/catch), never
  // a reason for phase:'error'.
  const isTxHash = (h: unknown): h is `0x${string}` => typeof h === 'string' && /^0x[0-9a-fA-F]{64}$/.test(h);
  const waitBestEffort = useCallback(async (hash: unknown, label: string) => {
    if (!client) return;
    if (!isTxHash(hash)) {
      console.warn(`[hedge] ${label}: the wallet returned an unusual hash (${String(hash).slice(0, 80)}…) — skipping receipt`);
      return;
    }
    try {
      await client.waitForTransactionReceipt({ hash });
    } catch (e) {
      console.warn(`[hedge] ${label}: receipt-wait failed (${String(e).slice(0, 140)}) — tx already sent, continuing`);
    }
  }, [client]);

  const execute = useCallback(
    async (plan: HedgePlan, onDone?: () => void) => {
      if (!address) return;
      setError(null);
      try {
        const wc = await freshWalletClient();
        if (!wc || !client) throw new Error('No connection to the Arbitrum network');

        if (plan.approval) {
          setStatus({ phase: 'checking', message: 'Checking USDC balance and approval…' });
          const [balance, allowance] = await Promise.all([
            client.readContract({ address: plan.approval.token, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
            client.readContract({ address: plan.approval.token, abi: erc20Abi, functionName: 'allowance', args: [address, plan.approval.spender] }) as Promise<bigint>,
          ]);
          if (balance < plan.approval.amount) {
            const haveUsd = Number(balance) / 1e6;
            const needUsd = Number(plan.approval.amount) / 1e6;
            throw new Error(`Not enough USDC on Arbitrum — you have $${haveUsd.toFixed(2)}, need $${needUsd.toFixed(2)} (no auto-swaps in v1, top up manually)`);
          }
          if (allowance < plan.approval.amount) {
            setStatus({ phase: 'approving', message: 'Approving USDC for GMX Router…' });
            const hash = await wc.sendTransaction({ to: plan.approval.tx.to, data: plan.approval.tx.data, value: plan.approval.tx.value, account: address, chain: wc.chain });
            await waitBestEffort(hash, 'approve');
            if (isTxHash(hash)) addTransaction(address, hash, plan.chainId, 'Approve USDC for GMX Router (hedge)');
          }
        }

        setStatus({ phase: 'sending', message: 'Simulating…' });
        await client.call({ to: plan.tx.to, data: plan.tx.data, value: plan.tx.value, account: address });
        setStatus({ phase: 'sending', message: 'Sign in Rabby…' });
        const hash = await wc.sendTransaction({ to: plan.tx.to, data: plan.tx.data, value: plan.tx.value, account: address, chain: wc.chain });
        setStatus({ phase: 'sending', message: 'Confirming…' });
        await waitBestEffort(hash, 'order');
        if (isTxHash(hash)) addTransaction(address, hash, plan.chainId, plan.summary);

        if (plan.preview.direction === 'open-short') {
          saveHedgeOpen({ sizeUsd: plan.preview.sizeUsd, collateralUsd: plan.preview.collateralUsdc, ts: new Date().toISOString() });
        } else {
          clearHedgeOpen();
        }

        setStatus({ phase: 'done', message: 'Order sent — the GMX keeper will execute it in the next block ✓' });
        onDone?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message.slice(0, 220) : String(e);
        setError(msg);
        setStatus((s) => ({ ...s, phase: 'error', message: msg }));
      }
    },
    [address, client, freshWalletClient]
  );

  const reset = useCallback(() => {
    setStatus(IDLE);
    setError(null);
  }, []);

  return { status, error, execute, reset };
}
