/**
 * useRotateExecution.ts — wykonuje `RotatePlan` z utils/rebalanceBuilder.ts
 * (TASKS-UI.md Partia 8: [Zatwierdź] na kartach propozycji ROTATE, cross-pool
 * w TEJ SAMEJ sieci). Kopia wzorca useRebalanceExecution.ts 1:1 (freshWalletClient
 * po ewentualnym przełączeniu sieci, client.call przed sendTransaction,
 * addTransaction do historii, resume po awarii) — jedyna różnica: krok 'mint'
 * jest przebudowywany z faktycznych sald NOWEJ puli (nie starej — po krokach
 * swap portfel trzyma tokeny nowej pary), więc `execute()` przyjmuje `newPool`
 * zamiast pojedynczego `pool`. `oldPool` nie jest execute() w ogóle potrzebny —
 * krok 1 (decrease+collect) jest już w pełni zakodowany w `plan.steps[0].tx`.
 *
 * Postęp (localStorage) trzymany pod OSOBNYM prefiksem `homos_rotate_progress_`
 * (nie przez saveProgress/loadProgress z rebalanceBuilder.ts, które piszą pod
 * `homos_rebalance_${chainId}_${tokenId}`) — żeby nie kolidować z progresem
 * zwykłego REBALANCE na tym samym tokenId, gdyby user kiedyś odpalił oba typy
 * sekwencji na tej samej pozycji. rebalanceBuilder.ts NIE jest tu edytowany
 * (poza zakresem tej partii) — progres lokalny żyje w tym pliku.
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
// HOTFIX 31.08: receipt best-effort (ta sama klasa co useRebalanceExecution —
// patrz komentarz tam; błąd Rabby+publicnode 'Invalid parameters').
import { waitReceiptBestEffort } from './useCockpitActions';

export interface RotateExecStatus {
  phase: 'idle' | 'approving' | 'step' | 'done' | 'error';
  stepIndex: number;
  totalSteps: number;
  message: string;
}

const IDLE: RotateExecStatus = { phase: 'idle', stepIndex: 0, totalSteps: 0, message: '' };

// --- progres sekwencji ROTATE, prefiks osobny od rebalanceBuilder.ts (patrz nagłówek) ---
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
        if (!wc || !client) throw new Error('Brak połączenia z siecią pozycji');

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

        // --- approvals z planu (approve tylko gdy allowance nie wystarcza) ---
        setStatus({ phase: 'approving', stepIndex: 0, totalSteps: total, message: 'Sprawdzanie approvals…' });
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

        // --- kroki 1..N (resume: pomiń już potwierdzone) ---
        for (const step of plan.steps) {
          if (progress.completed.includes(step.index)) continue;

          let tx = step.tx;
          if (step.kind === 'mint') {
            // Przebuduj mint z FAKTYCZNYCH sald NOWEJ puli (po krokach swap
            // portfel trzyma tokeny nowej pary, nie starej) — patrz nagłówek.
            // FIX 11.09 (HANDOFF @Sonnet, ten sam bug co useRebalanceExecution):
            // `newPool` jest zamrożony z momentu otwarcia modala — dociągamy
            // świeży slot0+liquidity tuż przed przebudową kroku, żeby uniknąć
            // "Price slippage check" przy ruchu ceny > ok. 0.5%.
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
              setStatus({ phase: 'approving', stepIndex: step.index, totalSteps: total, message: `Approve ${sym} (realne saldo różni się od estymaty) przed mintem…` });
              const approveData = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [manager, amt] });
              const hash = await wc.sendTransaction({ to: tok, data: approveData, value: 0n, account: address, chain: wc.chain });
              await waitReceiptBestEffort(client, hash);
              addTransaction(address, hash, plan.chainId, `Approve ${sym} dla NFT managera (mint, dociągnięcie)`);
            }
          }

          setStatus({ phase: 'step', stepIndex: step.index, totalSteps: total, message: `${step.label} — symulacja…` });
          await client.call({ to: tx.to, data: tx.data, account: address });
          setStatus({ phase: 'step', stepIndex: step.index, totalSteps: total, message: `${step.label} — podpis w Rabby…` });
          const hash = await wc.sendTransaction({ to: tx.to, data: tx.data, value: tx.value, account: address, chain: wc.chain });
          setStatus({ phase: 'step', stepIndex: step.index, totalSteps: total, message: `${step.label} — potwierdzanie…` });
          await waitReceiptBestEffort(client, hash);
          addTransaction(address, hash, plan.chainId, step.label);

          progress.completed = [...progress.completed, step.index];
          progress.txHashes = { ...progress.txHashes, [step.index]: hash };
          progress.updatedAt = new Date().toISOString();
          saveRotateProgress(progress);
        }

        clearRotateProgress(plan.chainId, plan.tokenId);
        setStatus({ phase: 'done', stepIndex: total, totalSteps: total, message: 'Rotacja zakończona ✓' });
        onDone?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message.slice(0, 220) : String(e);
        setError(`Sekwencja przerwana — środki bezpieczne (żaden krok nie zostawia funduszy w locie), dokończ pozostałe kroki ponownym [Zatwierdź]: ${msg}`);
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
