/**
 * useRotateExecution.ts — executes a `RotatePlan` from utils/rebalanceBuilder.ts
 * (TASKS-UI.md Batch 8: [Confirm] on ROTATE proposal cards, cross-pool
 * within the SAME network). A 1:1 copy of the useRebalanceExecution.ts pattern (freshWalletClient
 * after an optional network switch, client.call before sendTransaction,
 * addTransaction to the history, resume after a failure) — the only difference: the 'mint' step
 * is rebuilt from the actual balances of the NEW pool (not the old one — after the
 * swap steps the wallet holds tokens of the new pair), so `execute()` takes `newPool`
 * instead of a single `pool`. `oldPool` is not needed by execute() at all —
 * step 1 (decrease+collect) is already fully encoded in `plan.steps[0].tx`.
 *
 * Progress (localStorage) is kept under a SEPARATE prefix `homos_rotate_progress_`
 * (not via saveProgress/loadProgress from rebalanceBuilder.ts, which write under
 * `homos_rebalance_${chainId}_${tokenId}`) — so as not to collide with the progress
 * of a regular REBALANCE on the same tokenId, should the user ever run both types
 * of sequence on the same position. rebalanceBuilder.ts is NOT edited here
 * (outside this batch's scope) — the local progress lives in this file.
 */
import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { getWalletClient } from 'wagmi/actions';
import { Pool } from '@uniswap/v3-sdk';
import { Address, encodeFunctionData, erc20Abi } from 'viem';
import { RotatePlan, buildMintStep } from '../utils/rebalanceBuilder';
import { fetchFreshPool } from '../utils/uniswap';
import { addTransaction } from '../components/TransactionHistory';
import { config } from '../config/wallet';
// HOTFIX 31.08: best-effort receipt (the same class as useRebalanceExecution —
// see the comment there; Rabby+publicnode 'Invalid parameters' error).
import { waitReceiptBestEffort } from './useCockpitActions';

export interface RotateExecStatus {
  phase: 'idle' | 'approving' | 'step' | 'done' | 'error';
  stepIndex: number;
  totalSteps: number;
  message: string;
}

const IDLE: RotateExecStatus = { phase: 'idle', stepIndex: 0, totalSteps: 0, message: '' };

// --- ROTATE sequence progress, prefix separate from rebalanceBuilder.ts (see header) ---
export interface RotateProgress {
  tokenId: string;
  chainId: number;
  newTickLower: number;
  newTickUpper: number;
  totalSteps: number;
  completed: number[];
  txHashes: Record<number, string>;
  updatedAt: string;
}
const rotateProgressKey = (chainId: number, tokenId: string) => `homos_rotate_progress_${chainId}_${tokenId}`;
export const saveRotateProgress = (p: RotateProgress): void => {
  try {
    localStorage.setItem(rotateProgressKey(p.chainId, p.tokenId), JSON.stringify(p));
  } catch {
    /* in-memory only */
  }
};
export const loadRotateProgress = (chainId: number, tokenId: string): RotateProgress | null => {
  try {
    const v = localStorage.getItem(rotateProgressKey(chainId, tokenId));
    return v ? (JSON.parse(v) as RotateProgress) : null;
  } catch {
    return null;
  }
};
export const clearRotateProgress = (chainId: number, tokenId: string): void => {
  try {
    localStorage.removeItem(rotateProgressKey(chainId, tokenId));
  } catch {
    /* noop */
  }
};

export function useRotateExecution() {
  const { address } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const clientMainnet = usePublicClient({ chainId: 1 });
  const clientBase = usePublicClient({ chainId: 8453 });
  const clientArbitrum = usePublicClient({ chainId: 42161 });
  const clients: Record<number, ReturnType<typeof usePublicClient>> = { 1: clientMainnet, 8453: clientBase, 42161: clientArbitrum };

  const [status, setStatus] = useState<RotateExecStatus>(IDLE);
  const [error, setError] = useState<string | null>(null);

  const freshWalletClient = useCallback(
    async (chainId: number) => {
      if (walletChainId !== chainId) await switchChainAsync({ chainId });
      return getWalletClient(config, { chainId });
    },
    [walletChainId, switchChainAsync]
  );

  const execute = useCallback(
    async (newPool: Pool, plan: RotatePlan, newTickLower: number, newTickUpper: number, slippageBps: number, onDone?: () => void) => {
      if (!address) return;
      setError(null);
      const client = clients[plan.chainId];
      const total = plan.steps.length;
      try {
        const wc = await freshWalletClient(plan.chainId);
        if (!wc || !client) throw new Error('No connection to the position network');

        const progress: RotateProgress = loadRotateProgress(plan.chainId, plan.tokenId) ?? {
          tokenId: plan.tokenId,
          chainId: plan.chainId,
          newTickLower,
          newTickUpper,
          totalSteps: total,
          completed: [],
          txHashes: {},
          updatedAt: new Date().toISOString(),
        };

        // --- approvals from the plan (approve only when the allowance is insufficient) ---
        setStatus({ phase: 'approving', stepIndex: 0, totalSteps: total, message: 'Checking approvals…' });
        for (const appr of plan.approvals) {
          const allowance = (await client.readContract({
            address: appr.token,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address, appr.spender],
          })) as bigint;
          if (allowance >= appr.amount) continue;
          setStatus({ phase: 'approving', stepIndex: 0, totalSteps: total, message: `Approve: ${appr.label}` });
          const hash = await wc.sendTransaction({ to: appr.tx.to, data: appr.tx.data, value: appr.tx.value, account: address, chain: wc.chain });
          await waitReceiptBestEffort(client, hash);
          addTransaction(address, hash, plan.chainId, appr.label);
        }

        // --- steps 1..N (resume: skip the ones already confirmed) ---
        for (const step of plan.steps) {
          if (progress.completed.includes(step.index)) continue;

          let tx = step.tx;
          if (step.kind === 'mint') {
            // Rebuild the mint from the ACTUAL balances of the NEW pool (after the swap
            // steps the wallet holds tokens of the new pair, not the old one) — see header.
            // FIX 11.09 (HANDOFF @Sonnet, the same bug as useRebalanceExecution):
            // `newPool` is frozen from the moment the modal was opened — we fetch
            // fresh slot0+liquidity right before rebuilding the step, to avoid
            // "Price slippage check" on a price move > approx. 0.5%.
            const freshPool = await fetchFreshPool(client, newPool, plan.chainId);
            const [bal0, bal1] = await Promise.all([
              client.readContract({ address: newPool.token0.address as Address, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
              client.readContract({ address: newPool.token1.address as Address, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
            ]);
            const rebuilt = buildMintStep({ pool: freshPool, chainId: plan.chainId, newTickLower, newTickUpper, amount0: bal0, amount1: bal1, recipient: address, slippageBps });
            tx = rebuilt.tx;
            const manager = tx.to;
            const wants: Array<[Address, bigint, string]> = [
              [newPool.token0.address as Address, BigInt(rebuilt.position.mintAmounts.amount0.toString()), newPool.token0.symbol || '?'],
              [newPool.token1.address as Address, BigInt(rebuilt.position.mintAmounts.amount1.toString()), newPool.token1.symbol || '?'],
            ];
            for (const [tok, amt, sym] of wants) {
              if (amt <= 0n) continue;
              const allowance = (await client.readContract({ address: tok, abi: erc20Abi, functionName: 'allowance', args: [address, manager] })) as bigint;
              if (allowance >= amt) continue;
              setStatus({ phase: 'approving', stepIndex: step.index, totalSteps: total, message: `Approve ${sym} (real balance differs from the estimate) before the mint…` });
              const approveData = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [manager, amt] });
              const hash = await wc.sendTransaction({ to: tok, data: approveData, value: 0n, account: address, chain: wc.chain });
              await waitReceiptBestEffort(client, hash);
              addTransaction(address, hash, plan.chainId, `Approve ${sym} for the NFT manager (mint, top-up)`);
            }
          }

          setStatus({ phase: 'step', stepIndex: step.index, totalSteps: total, message: `${step.label} — simulating…` });
          await client.call({ to: tx.to, data: tx.data, account: address });
          setStatus({ phase: 'step', stepIndex: step.index, totalSteps: total, message: `${step.label} — sign in Rabby…` });
          const hash = await wc.sendTransaction({ to: tx.to, data: tx.data, value: tx.value, account: address, chain: wc.chain });
          setStatus({ phase: 'step', stepIndex: step.index, totalSteps: total, message: `${step.label} — confirming…` });
          await waitReceiptBestEffort(client, hash);
          addTransaction(address, hash, plan.chainId, step.label);

          progress.completed = [...progress.completed, step.index];
          progress.txHashes = { ...progress.txHashes, [step.index]: hash };
          progress.updatedAt = new Date().toISOString();
          saveRotateProgress(progress);
        }

        clearRotateProgress(plan.chainId, plan.tokenId);
        setStatus({ phase: 'done', stepIndex: total, totalSteps: total, message: 'Rotation complete ✓' });
        onDone?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message.slice(0, 220) : String(e);
        setError(`Sequence interrupted — funds are safe (no step leaves funds in flight), finish the remaining steps by clicking [Confirm] again: ${msg}`);
        setStatus((s) => ({ ...s, phase: 'error', message: msg }));
      }
    },
    [address, clients, freshWalletClient]
  );

  const reset = useCallback(() => {
    setStatus(IDLE);
    setError(null);
  }, []);

  return { status, error, execute, reset };
}
