/**
 * useHedgeExecution.ts — wykonuje `HedgePlan` z utils/hedgeBuilder.ts
 * (TASKS-UI.md Partia 9: [Zatwierdź hedge] na karcie propozycji HEDGE, GMX v2
 * na Arbitrum). Ten sam wzorzec co useRebalanceExecution.ts/useCockpitActions.ts
 * (freshWalletClient po ewentualnym przełączeniu sieci, OBOWIĄZKOWA symulacja
 * client.call przed sendTransaction — patrz nagłówek hedgeBuilder.ts,
 * addTransaction do historii), z dwiema różnicami specyficznymi dla hedge'a:
 *
 *  - Sieć jest ZAWSZE Arbitrum (GMX_ARBITRUM.chainId=42161), niezależnie od
 *    sieci puli LP, którą propozycja dotyczy (hedge to osobny rynek perp) —
 *    freshWalletClient tu nie przyjmuje chainId jako argument, jest zaszyty.
 *  - Saldo USDC sprawdzane PRZED budową jakiejkolwiek transakcji: gdy brakuje,
 *    hook rzuca czytelny błąd i NIE wysyła nic (bez auto-swapów w v1, zgodnie
 *    ze zleceniem) — inaczej niż w rebalansie, gdzie approve/mint są zawsze
 *    wykonywalne (środki już są na pozycji).
 *
 * Stan otwartego shorta (`homos_hedge_open`, klucz globalny — bot v1.2
 * proponuje hedge tylko dla jednej puli na raz, base-030) zapisywany po
 * udanym OTWARCIU (plan.preview.direction==='open-short'), czyszczony po
 * udanym ZAMKNIĘCIU — "prosto" zgodnie ze zleceniem, bez integracji z GMX
 * Readerem (przyszłe ulepszenie, TASKS-UI.md).
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

// --- stan otwartego shorta, localStorage jak reszta appki (homos_api_base itp.) ---
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

// Jako `number` (nie literał `42161` z `as const` w GMX_ARBITRUM) — inaczej
// getWalletClient(config, { chainId: <literal> }) łapie zbyt wąski overload
// wagmi i `wc.chain` w sendTransaction typuje się na `never` (TS2345).
// Ten sam wzorzec co w useRebalanceExecution.ts/useCockpitActions.ts, gdzie
// chainId zawsze przychodzi jako zwykły `number` parametr, nigdy literal.
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

  const execute = useCallback(
    async (plan: HedgePlan, onDone?: () => void) => {
      if (!address) return;
      setError(null);
      try {
        const wc = await freshWalletClient();
        if (!wc || !client) throw new Error('Brak połączenia z siecią Arbitrum');

        if (plan.approval) {
          setStatus({ phase: 'checking', message: 'Sprawdzanie salda i approval USDC…' });
          const [balance, allowance] = await Promise.all([
            client.readContract({ address: plan.approval.token, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
            client.readContract({ address: plan.approval.token, abi: erc20Abi, functionName: 'allowance', args: [address, plan.approval.spender] }) as Promise<bigint>,
          ]);
          if (balance < plan.approval.amount) {
            const haveUsd = Number(balance) / 1e6;
            const needUsd = Number(plan.approval.amount) / 1e6;
            throw new Error(`Za mało USDC na Arbitrum — masz $${haveUsd.toFixed(2)}, trzeba $${needUsd.toFixed(2)} (bez auto-swapów w v1, dokup ręcznie)`);
          }
          if (allowance < plan.approval.amount) {
            setStatus({ phase: 'approving', message: 'Approve USDC dla GMX Router…' });
            const hash = await wc.sendTransaction({ to: plan.approval.tx.to, data: plan.approval.tx.data, value: plan.approval.tx.value, account: address, chain: wc.chain });
            await client.waitForTransactionReceipt({ hash });
            addTransaction(address, hash, plan.chainId, 'Approve USDC dla GMX Router (hedge)');
          }
        }

        setStatus({ phase: 'sending', message: 'Symulacja…' });
        await client.call({ to: plan.tx.to, data: plan.tx.data, value: plan.tx.value, account: address });
        setStatus({ phase: 'sending', message: 'Podpis w Rabby…' });
        const hash = await wc.sendTransaction({ to: plan.tx.to, data: plan.tx.data, value: plan.tx.value, account: address, chain: wc.chain });
        setStatus({ phase: 'sending', message: 'Potwierdzanie…' });
        await client.waitForTransactionReceipt({ hash });
        addTransaction(address, hash, plan.chainId, plan.summary);

        if (plan.preview.direction === 'open-short') {
          saveHedgeOpen({ sizeUsd: plan.preview.sizeUsd, collateralUsd: plan.preview.collateralUsdc, ts: new Date().toISOString() });
        } else {
          clearHedgeOpen();
        }

        setStatus({ phase: 'done', message: 'Zlecenie wysłane — keeper GMX wykona w kolejnym bloku ✓' });
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
