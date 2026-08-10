/**
 * AddLiquidity v2 — kompaktowa, poprawna ścieżka otwierania pozycji.
 * Zastępuje 69KB legacy (ręczna matematyka float + hacki slippage 20%).
 *  - kwoty liczone przez SDK (calculateOptimalAmounts → Position.fromAmounts),
 *  - zakres: Doradca (zmienność on-chain) / ±5% / ±15% / full / własny,
 *  - approvals na dokładne kwoty, mint przez prepareAddLiquidityTransaction,
 *  - symulacja eth_call przed wysłaniem (rewert łapany przed zapłatą gazu),
 *  - slippage 0.1–1% (koniec z 20%).
 */
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { Pool, nearestUsableTick, TICK_SPACINGS } from '@uniswap/v3-sdk';
import { Address, erc20Abi, formatUnits, parseUnits } from 'viem';
import {
  createPosition,
  calculateOptimalAmounts,
  prepareAddLiquidityTransaction,
  POSITION_MANAGER_ADDRESSES,
} from '../../utils/liquidityManagement';
import { humanPriceToTick, tickToHumanPrice, MIN_TICK, MAX_TICK } from '../../utils/v3math';
import { fetchRecentSwaps, computeStats, suggestRange, PoolStats, ADVISOR_PARAMS } from '../../utils/advisor';
import { addTransaction } from '../TransactionHistory';

interface Props {
  pool: Pool;
  poolAddress?: string;
  onSuccess: () => void;
}

type RangeMode = 'advisor' | 'pm5' | 'pm15' | 'full' | 'custom';

const AddLiquidity: FC<Props> = ({ pool, poolAddress, onSuccess }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const spacing = TICK_SPACINGS[pool.fee as keyof typeof TICK_SPACINGS];
  const d0 = pool.token0.decimals;
  const d1 = pool.token1.decimals;
  const sym0 = pool.token0.symbol || 'T0';
  const sym1 = pool.token1.symbol || 'T1';

  const [mode, setMode] = useState<RangeMode>('pm15');
  const [customLo, setCustomLo] = useState('');
  const [customHi, setCustomHi] = useState('');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [lastEdited, setLastEdited] = useState<0 | 1>(0);
  const [slippageBps, setSlippageBps] = useState(50);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [bal0, setBal0] = useState<bigint>(0n);
  const [bal1, setBal1] = useState<bigint>(0n);
  const [allow0, setAllow0] = useState<bigint>(0n);
  const [allow1, setAllow1] = useState<bigint>(0n);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const manager = POSITION_MANAGER_ADDRESSES[chainId] as Address | undefined;

  // --- doradca: statystyki z ostatnich 24h swapów ---
  useEffect(() => {
    if (!publicClient || !poolAddress) return;
    setStatsLoading(true);
    fetchRecentSwaps(publicClient, poolAddress as Address, chainId, 24)
      .then((swaps) => setStats(computeStats(swaps, chainId, d0, d1, pool.fee / 1_000_000, spacing)))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, poolAddress, chainId]);

  // --- salda i allowance ---
  const refreshBalances = async () => {
    if (!publicClient || !address || !manager) return;
    const [b0, b1, a0, a1] = await Promise.all([
      publicClient.readContract({ address: pool.token0.address as Address, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
      publicClient.readContract({ address: pool.token1.address as Address, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
      publicClient.readContract({ address: pool.token0.address as Address, abi: erc20Abi, functionName: 'allowance', args: [address, manager] }),
      publicClient.readContract({ address: pool.token1.address as Address, abi: erc20Abi, functionName: 'allowance', args: [address, manager] }),
    ]);
    setBal0(b0 as bigint);
    setBal1(b1 as bigint);
    setAllow0(a0 as bigint);
    setAllow1(a1 as bigint);
  };
  useEffect(() => {
    refreshBalances().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, address, chainId, pool.token0.address]);

  // --- zakres wg trybu ---
  const ethIsToken0 = sym0.includes('ETH');
  const range = useMemo((): [number, number] => {
    const cur = pool.tickCurrent;
    const around = (w: number): [number, number] => {
      const dt = Math.round(Math.log(1 + w) / Math.log(1.0001));
      let lo = nearestUsableTick(cur - dt, spacing);
      let hi = nearestUsableTick(cur + dt, spacing);
      if (hi <= lo) hi = lo + spacing;
      return [lo, hi];
    };
    switch (mode) {
      case 'advisor': {
        if (!stats) return around(0.15);
        const s = suggestRange(stats, pool.fee, d0, d1);
        return [s.tickLower, s.tickUpper];
      }
      case 'pm5':
        return around(0.05);
      case 'pm15':
        return around(0.15);
      case 'full':
        return [nearestUsableTick(MIN_TICK + spacing, spacing), nearestUsableTick(MAX_TICK - spacing, spacing)];
      case 'custom': {
        const lo = parseFloat(customLo);
        const hi = parseFloat(customHi);
        if (!isFinite(lo) || !isFinite(hi) || lo <= 0 || hi <= lo) return around(0.15);
        // ceny wpisywane w orientacji USD-za-ETH (dla par ETH/stable)
        const toTick = (usdPerEth: number) => {
          const p = ethIsToken0 ? usdPerEth : 1 / usdPerEth; // token1 per token0
          return humanPriceToTick(p, d0, d1);
        };
        const t1 = toTick(lo);
        const t2 = toTick(hi);
        const tl = nearestUsableTick(Math.min(t1, t2), spacing);
        const th = nearestUsableTick(Math.max(t1, t2), spacing);
        return th > tl ? [tl, th] : [tl, tl + spacing];
      }
    }
  }, [mode, stats, pool.tickCurrent, customLo, customHi]);

  // --- auto-uzupełnianie drugiej kwoty (SDK, dokładnie jak Uniswap UI) ---
  useEffect(() => {
    try {
      const src = lastEdited === 0 ? amount0 : amount1;
      if (!src || !isFinite(parseFloat(src)) || parseFloat(src) <= 0) return;
      const r = calculateOptimalAmounts(
        pool,
        range[0],
        range[1],
        lastEdited === 0 ? src : undefined,
        lastEdited === 1 ? src : undefined
      );
      if (lastEdited === 0 && r.amount1 !== amount1) setAmount1(r.amount1);
      if (lastEdited === 1 && r.amount0 !== amount0) setAmount0(r.amount0);
    } catch {
      /* niepełny input */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount0, amount1, lastEdited, range[0], range[1]]);

  const parsed0 = useMemo(() => {
    try {
      return parseUnits((amount0 || '0') as `${number}`, d0);
    } catch {
      return 0n;
    }
  }, [amount0, d0]);
  const parsed1 = useMemo(() => {
    try {
      return parseUnits((amount1 || '0') as `${number}`, d1);
    } catch {
      return 0n;
    }
  }, [amount1, d1]);

  const needApprove0 = parsed0 > 0n && allow0 < parsed0;
  const needApprove1 = parsed1 > 0n && allow1 < parsed1;
  const insufficient = parsed0 > bal0 || parsed1 > bal1;

  const approve = async (which: 0 | 1) => {
    if (!walletClient || !publicClient || !manager || !address) return;
    setBusy(`approve${which}`);
    setMsg(null);
    try {
      const token = (which === 0 ? pool.token0.address : pool.token1.address) as Address;
      const amount = which === 0 ? parsed0 : parsed1;
      const hash = await walletClient.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [manager, amount],
        account: address,
        chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshBalances();
      setMsg({ kind: 'ok', text: `Approve ${which === 0 ? sym0 : sym1} potwierdzony` });
    } catch (e) {
      setMsg({ kind: 'err', text: `Approve nieudany: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}` });
    } finally {
      setBusy(null);
    }
  };

  const mint = async () => {
    if (!walletClient || !publicClient || !address) return;
    setBusy('mint');
    setMsg(null);
    try {
      const position = createPosition(pool, range[0], range[1], amount0 || '0', amount1 || '0');
      const tx = prepareAddLiquidityTransaction(position, slippageBps, 1800, chainId, address);
      // symulacja przed wysłaniem — rewert łapiemy zanim zapłacisz gas
      await publicClient.call({ to: tx.to as Address, data: tx.data as `0x${string}`, account: address });
      const hash = await walletClient.sendTransaction({
        to: tx.to as Address,
        data: tx.data as `0x${string}`,
        value: 0n,
        account: address,
        chain: walletClient.chain,
      });
      const rec = await publicClient.waitForTransactionReceipt({ hash });
      if (rec.status === 'success') {
        setMsg({ kind: 'ok', text: `Pozycja otwarta ✓ (tx ${hash.slice(0, 10)}…)` });
        if (address) addTransaction(address, hash, chainId, `Add liquidity ${sym0}/${sym1}`);
        setAmount0('');
        setAmount1('');
        await refreshBalances();
        onSuccess();
      } else {
        setMsg({ kind: 'err', text: 'Transakcja odrzucona przez sieć' });
      }
    } catch (e) {
      setMsg({ kind: 'err', text: `Mint nieudany: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}` });
    } finally {
      setBusy(null);
    }
  };

  // wyświetlanie zakresu w USD (dla par ETH/stable)
  const fmtUsdAtTick = (t: number) => {
    const p = tickToHumanPrice(t, d0, d1); // token1 per token0
    const usd = ethIsToken0 ? p : 1 / p;
    return usd.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };
  const usdLo = ethIsToken0 ? fmtUsdAtTick(range[0]) : fmtUsdAtTick(range[1]);
  const usdHi = ethIsToken0 ? fmtUsdAtTick(range[1]) : fmtUsdAtTick(range[0]);

  return (
    <div className="add-liquidity">
      <div className="advisor-box">
        {statsLoading ? (
          <span className="loading-inline">
            <span className="spinner" />
            🔎 Doradca: analizuję ostatnie 24h swapów…
          </span>
        ) : stats ? (
          <span>
            🔎 Doradca: zmienność <b>{(stats.volDaily * 100).toFixed(2)}%/d</b> · fee-yield pasma{' '}
            <b>{(stats.feeYieldDaily * 100).toFixed(2)}%/d</b> · sugerowany zakres{' '}
            <b>±{suggestRange(stats, pool.fee, d0, d1).widthPct.toFixed(1)}%</b> ({stats.swapsAnalyzed} swapów, k=
            {ADVISOR_PARAMS.k})
          </span>
        ) : (
          <span>🔎 Doradca: brak danych o swapach (RPC)</span>
        )}
      </div>

      <div className="range-options-wrapper">
        {(
          [
            ['advisor', stats ? `Doradca ±${suggestRange(stats, pool.fee, d0, d1).widthPct.toFixed(1)}%` : 'Doradca'],
            ['pm5', '±5%'],
            ['pm15', '±15%'],
            ['full', 'Full range'],
            ['custom', 'Własny'],
          ] as Array<[RangeMode, string]>
        ).map(([m, label]) => (
          <div key={m} className={`range-option ${mode === m ? 'selected' : ''}`} onClick={() => setMode(m)}>
            <div className="range-option-radio"></div>
            <div className="range-option-label">{label}</div>
          </div>
        ))}
      </div>

      {mode === 'custom' && (
        <div className="custom-range-inputs">
          <input placeholder="Min (USD)" value={customLo} onChange={(e) => setCustomLo(e.target.value)} />
          <input placeholder="Max (USD)" value={customHi} onChange={(e) => setCustomHi(e.target.value)} />
        </div>
      )}

      <div className="range-preview">
        Zakres: <b>${usdLo} – ${usdHi}</b> <span className="muted">(ticki {range[0]} … {range[1]})</span>
      </div>

      <div className="token-inputs">
        <div className="token-input">
          <label>
            {sym0} <span className="muted">saldo: {parseFloat(formatUnits(bal0, d0)).toFixed(d0 === 6 ? 2 : 6)}</span>
          </label>
          <input
            value={amount0}
            placeholder="0.0"
            onChange={(e) => {
              setAmount0(e.target.value);
              setLastEdited(0);
            }}
          />
        </div>
        <div className="token-input">
          <label>
            {sym1} <span className="muted">saldo: {parseFloat(formatUnits(bal1, d1)).toFixed(d1 === 6 ? 2 : 6)}</span>
          </label>
          <input
            value={amount1}
            placeholder="0.0"
            onChange={(e) => {
              setAmount1(e.target.value);
              setLastEdited(1);
            }}
          />
        </div>
      </div>

      <div className="slippage-row">
        Slippage:
        {[10, 50, 100].map((bps) => (
          <button key={bps} className={`chip ${slippageBps === bps ? 'selected' : ''}`} onClick={() => setSlippageBps(bps)}>
            {bps / 100}%
          </button>
        ))}
      </div>

      {msg && <div className={`message ${msg.kind === 'ok' ? 'success' : 'error'}`}>{msg.text}</div>}
      {insufficient && <div className="message error">Za mało środków na saldzie</div>}
      <div className="action-row">
        {needApprove0 && (
          <button disabled={!!busy} onClick={() => approve(0)} className="action-button">
            {busy === 'approve0' ? 'Approving…' : `Approve ${sym0}`}
          </button>
        )}
        {needApprove1 && (
          <button disabled={!!busy} onClick={() => approve(1)} className="action-button">
            {busy === 'approve1' ? 'Approving…' : `Approve ${sym1}`}
          </button>
        )}
        <button
          disabled={!!busy || needApprove0 || needApprove1 || insufficient || (parsed0 === 0n && parsed1 === 0n)}
          onClick={mint}
          className="action-button primary"
        >
          {busy === 'mint' ? 'Otwieranie pozycji…' : 'Add Liquidity'}
        </button>
      </div>
    </div>
  );
};

export default AddLiquidity;
