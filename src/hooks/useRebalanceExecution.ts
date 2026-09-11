/**
 * useRebalanceExecution.ts — wykonuje `RebalancePlan` z utils/rebalanceBuilder.ts
 * (TASKS-UI.md Partia 4b: [Zatwierdź] na kartach propozycji REBALANCE).
 *
 * rebalanceBuilder.ts jest czystym modułem (bez Reacta, bez RPC) — cała
 * wysyłka/symulacja/odczyty żyją tutaj, tym samym wzorcem co
 * useCockpitActions.ts (freshWalletClient po ewentualnym przełączeniu sieci,
 * client.call przed sendTransaction, addTransaction do historii).
 *
 * Sekwencja: approvals z planu (pomijane, gdy allowance już wystarcza) →
 * krok 1 (decrease+collect, dokładny) → krok 2 (swap, pomijany gdy
 * swapSkipped) → krok 3 (mint) — PRZEBUDOWANY tuż przed wysłaniem z
 * FAKTYCZNYCH sald portfela (buildMintStep), bo krok 2 to tylko estymata z
 * min-po-slippage; realny balans po swapie może się nieznacznie różnić od
 * mint0/mint1 w podglądzie planu. Jeśli realne saldo przekracza kwotę
 * wcześniej zaaprobowaną (approvals w planie liczone od estymaty), tuż przed
 * mintem dociągamy approve do faktycznej potrzeby — inaczej mint mógłby
 * zrewertować mimo że krok 1–2 się powiodły.
 *
 * Postęp (saveProgress/loadProgress/clearProgress, localStorage per
 * chainId+tokenId) przeżywa odświeżenie strony — execute() pomija kroki już
 * potwierdzone (progress.completed), więc ponowne kliknięcie [Zatwierdź] po
 * przerwanej sekwencji "dokończa" zamiast zaczynać od nowa. Failure w środku
 * = środki bezpieczne (patrz nagłówek rebalanceBuilder.ts) — modal pokazuje
 * to explicite w komunikacie błędu.
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
// HOTFIX 31.08 (pierwsza bojowa sekwencja FLAT_NARROW, #5887690): surowe
// waitForTransactionReceipt przerywało sekwencję na błędzie Rabby+publicnode
// "Invalid parameters" (ta sama klasa co useHedgeExecution FIX 20.08 i
// Partia 13) — każdy klik [Zatwierdź] wysyłał jedną tx i padał na odczycie
// jej potwierdzenia, w kółko od kroku 1. Receipt to best-effort: tx po
// sendTransaction JEST na łańcuchu; pre-flight symulacja (client.call) przed
// każdym krokiem chroni przed wysłaniem kroku, który by zrewertował.
import { waitReceiptBestEffort } from './useCockpitActions';

export interface ExecStatus {
  phase: 'idle' | 'approving' | 'step' | 'done' | 'error';
  stepIndex: number; // 0 podczas approvals z planu; potem numer bieżącego kroku
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
        if (!wc || !client) throw new Error('Brak połączenia z siecią pozycji');

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
            // Przebuduj mint z FAKTYCZNYCH sald (nie z estymaty w planie) —
            // patrz nagłówek pliku i rebalanceBuilder.ts. FIX 11.09 (HANDOFF
            // @Sonnet): `pool` tu jest ten sam obiekt co przekazany do modala
            // przy jego otwarciu — jeśli cena ruszyła się od tamtej chwili
            // (> ok. 0.5%), Position.fromAmounts liczy z nieaktualnej ceny i
            // symulacja mintu pada na "Price slippage check". Dociągamy
            // świeży slot0+liquidity tuż przed przebudową kroku.
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
          // HOTFIX 31.08: best-effort (nie throw) + progress zapisywany także
          // bez receiptu — tx jest wysłana, a brak zapisu postępu powodował
          // ponowne wysyłanie TEGO SAMEGO kroku przy kolejnym [Zatwierdź].
          await waitReceiptBestEffort(client, hash);
          addTransaction(address, hash, plan.chainId, step.label);

          progress.completed = [...progress.completed, step.index];
          progress.txHashes = { ...progress.txHashes, [step.index]: hash };
          progress.updatedAt = new Date().toISOString();
          saveProgress(progress);
        }

        clearProgress(plan.chainId, plan.tokenId);
        setStatus({ phase: 'done', stepIndex: total, totalSteps: total, message: 'Rebalans zakończony ✓' });
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
