/**
 * useRebalanceExecution.ts — executes a `RebalancePlan` from utils/rebalanceBuilder.ts
 * (TASKS-UI.md Batch 4b: [Confirm] on REBALANCE proposal cards).
 *
 * rebalanceBuilder.ts is a pure module (no React, no RPC) — all
 * sending/simulation/reads live here, with the same pattern as
 * useCockpitActions.ts (freshWalletClient after an optional network switch,
 * client.call before sendTransaction, addTransaction to the history).
 *
 * Sequence: approvals from the plan (skipped when the allowance already suffices) →
 * step 1 (decrease+collect, exact) → step 2 (swap, skipped when
 * swapSkipped) → step 3 (mint) — REBUILT right before sending from the
 * ACTUAL wallet balances (buildMintStep), because step 2 is only an estimate with
 * post-slippage minimums; the real balance after the swap may differ slightly from
 * mint0/mint1 in the plan preview. If the real balance exceeds the amount
 * approved earlier (approvals in the plan are computed from the estimate), right before
 * the mint we top up the approve to the actual need — otherwise the mint could
 * revert even though steps 1–2 succeeded.
 *
 * Progress (saveProgress/loadProgress/clearProgress, localStorage per
 * chainId+tokenId) survives a page refresh — execute() skips steps already
 * confirmed (progress.completed), so clicking [Confirm] again after an
 * interrupted sequence "finishes" instead of starting over. A failure in the middle
 * = funds are safe (see the rebalanceBuilder.ts header) — the modal says
 * so explicitly in the error message.
 */
import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { getWalletClient } from 'wagmi/actions';
import { Pool } from '@uniswap/v3-sdk';
import { Address, encodeFunctionData, erc20Abi } from 'viem';
import { RebalancePlan, buildMintStep, saveProgress, loadProgress, clearProgress, RebalanceProgress } from '../utils/rebalanceBuilder';
import { fetchFreshPool } from '../utils/uniswap';
import { addTransaction } from '../components/TransactionHistory';
import { config } from '../config/wallet';
// HOTFIX 31.08 (first live FLAT_NARROW sequence, #5887690): raw
// waitForTransactionReceipt aborted the sequence on the Rabby+publicnode
// "Invalid parameters" error (the same class as useHedgeExecution FIX 20.08 and
// Batch 13) — every [Confirm] click sent one tx and failed on reading
// its confirmation, over and over from step 1. The receipt is best-effort: after
// sendTransaction the tx IS on chain; the pre-flight simulation (client.call) before
// each step protects against sending a step that would revert.
import { waitReceiptBestEffort } from './useCockpitActions';

export interface ExecStatus {
  phase: 'idle' | 'approving' | 'step' | 'done' | 'error';
  stepIndex: number; // 0 during the plan's approvals; then the number of the current step
  totalSteps: number;
  message: string;
}

const IDLE: ExecStatus = { phase: 'idle', stepIndex: 0, totalSteps: 0, message: '' };

export function useRebalanceExecution() {
  const { address } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const clientMainnet = usePublicClient({ chainId: 1 });
  const clientBase = usePublicClient({ chainId: 8453 });
  const clientArbitrum = usePublicClient({ chainId: 42161 });
  const clients: Record<number, ReturnType<typeof usePublicClient>> = { 1: clientMainnet, 8453: clientBase, 42161: clientArbitrum };

  const [status, setStatus] = useState<ExecStatus>(IDLE);
  const [error, setError] = useState<string | null>(null);

  const freshWalletClient = useCallback(
    async (chainId: number) => {
      if (walletChainId !== chainId) await switchChainAsync({ chainId });
      return getWalletClient(config, { chainId });
    },
    [walletChainId, switchChainAsync]
  );

  const execute = useCallback(
    async (pool: Pool, plan: RebalancePlan, newTickLower: number, newTickUpper: number, slippageBps: number, onDone?: () => void) => {
      if (!address) return;
      setError(null);
      const client = clients[plan.chainId];
      const total = plan.steps.length;
      try {
        const wc = await freshWalletClient(plan.chainId);
        if (!wc || !client) throw new Error('No connection to the position network');

        const progress: RebalanceProgress = loadProgress(plan.chainId, plan.tokenId) ?? {
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
            // Rebuild the mint from ACTUAL balances (not from the estimate in the plan) —
            // see the file header and rebalanceBuilder.ts. FIX 11.09 (HANDOFF
            // @Sonnet): `pool` here is the same object as passed to the modal
            // when it was opened — if the price has moved since then
            // (> approx. 0.5%), Position.fromAmounts computes from a stale price and
            // the mint simulation fails with "Price slippage check". We fetch
            // fresh slot0+liquidity right before rebuilding the step.
            const freshPool = await fetchFreshPool(client, pool, plan.chainId);
            const [bal0, bal1] = await Promise.all([
              client.readContract({ address: pool.token0.address as Address, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
              client.readContract({ address: pool.token1.address as Address, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
            ]);
            const rebuilt = buildMintStep({ pool: freshPool, chainId: plan.chainId, newTickLower, newTickUpper, amount0: bal0, amount1: bal1, recipient: address, slippageBps });
            tx = rebuilt.tx;
            const manager = tx.to;
            const wants: Array<[Address, bigint, string]> = [
              [pool.token0.address as Address, BigInt(rebuilt.position.mintAmounts.amount0.toString()), pool.token0.symbol || '?'],
              [pool.token1.address as Address, BigInt(rebuilt.position.mintAmounts.amount1.toString()), pool.token1.symbol || '?'],
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
          // HOTFIX 31.08: best-effort (no throw) + progress saved even
          // without a receipt — the tx is sent, and not saving progress caused
          // THE SAME step to be re-sent on the next [Confirm].
          await waitReceiptBestEffort(client, hash);
          addTransaction(address, hash, plan.chainId, step.label);

          progress.completed = [...progress.completed, step.index];
          progress.txHashes = { ...progress.txHashes, [step.index]: hash };
          progress.updatedAt = new Date().toISOString();
          saveProgress(progress);
        }

        clearProgress(plan.chainId, plan.tokenId);
        setStatus({ phase: 'done', stepIndex: total, totalSteps: total, message: 'Rebalance complete ✓' });
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
