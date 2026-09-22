/**
 * CockpitPositionActions.tsx — [💰 Collect fees] / [⏹ Close] / [🔄 Manual
 * rebalance] actions + their two modals, rendered per position in the morning
 * cockpit (TASKS-UI.md Batch 3, UX-COCKPIT.md §1.A.3). All write logic lives in
 * useCockpitActions.ts — this component is presentational plus local modal
 * state (percentage slider, slippage, token amounts).
 *
 * Batch 10 (20.08, card redesign after the paper pattern): three buttons in a
 * row replaced by a ⋮ menu (dropdown, no libraries) — SAME handlers/logic,
 * only the UI trigger moved (real position cards now have two charts instead
 * of room for a button row). `CloseModal`/`RebalanceModal` (exported, reused
 * elsewhere) UNCHANGED.
 */
import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { nearestUsableTick, TICK_SPACINGS } from '@uniswap/v3-sdk';
import { calculateOptimalAmounts } from '../utils/liquidityManagement';
import { humanPriceToTick } from '../utils/v3math';
import { PortfolioPosition } from '../hooks/usePortfolio';
import { useCockpitActions, previewClose, explorerTxUrl, RebalanceTarget, CloseStepStatus } from '../hooks/useCockpitActions';
import { findBotPoolByAddress } from '../config/botPools';
import { UseBotApi } from '../hooks/useBotApi';

interface Props {
  position: PortfolioPosition;
  actions: ReturnType<typeof useCockpitActions>;
  onChanged: () => void;
  /** For the "Advisor (from bot)" fallback in the rebalance modal (Batch 4, fix
   *  from the P3 review) — optional, MorningCockpit always passes it from the
   *  same useBotApi(), zero new requests. */
  bot?: UseBotApi;
  /** ETH/USD rate from usePortfolio.ts (FIX 25.08: live [Collect fees] threshold) —
   *  null when the portfolio has no position in a stable/ETH pool from which it
   *  could be derived. `actions.collectThresholdUsdLive`/`isCollectWorthwhileLive`
   *  then fall back to the constant GAS_USD on their own (see useCockpitActions.ts). */
  ethUsd: number | null;
}

const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Item 5 (Batch 13): the balance displayed in the modal must NOT round up —
// `toFixed(dp)` (previous code) rounds ARITHMETICALLY, so 1827.49x from a real
// balance could show as "1827.50", the user typed 1827.50 and got
// "Insufficient funds" with no explanation where the 0.01x was missing. Truncation
// on the STRING from formatUnits (exact decimal representation from viem, no
// float conversion) instead of Math.floor on a Number — also avoids float
// precision errors with large balances. Zero-padded so the field width does not jump.
const floorBalanceStr = (raw: bigint, decimals: number, dp: number): string => {
  const full = formatUnits(raw, decimals);
  const [intPart, fracPart = ''] = full.split('.');
  if (dp <= 0) return intPart;
  return `${intPart}.${fracPart.slice(0, dp).padEnd(dp, '0')}`;
};

const CockpitPositionActions: FC<Props> = ({ position: p, actions, onChanged, bot, ethUsd }) => {
  const [closeOpen, setCloseOpen] = useState(false);
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const worthwhile = actions.isCollectWorthwhileLive(p, ethUsd);
  const busyCollect = actions.busyKey === `${p.chainId}-${p.tokenId}-collect`;
  const busyClose = actions.busyKey === `${p.chainId}-${p.tokenId}-close`;
  const busyRebalance = actions.busyKey === `${p.chainId}-${p.tokenId}-rebalance`;

  // Close the menu on outside click / Esc — no libraries (pattern: listener on
  // document, cleaned up in the effect cleanup).
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="cockpit-position-actions cockpit-position-actions-menu" ref={menuRef}>
      <button className="cockpit-menu-trigger" aria-label="Position actions" onClick={() => setMenuOpen((v) => !v)}>
        ⋮
      </button>
      {menuOpen && (
        <div className="cockpit-menu-dropdown">
          <button
            className="cockpit-menu-item"
            disabled={!worthwhile || busyCollect}
            title={worthwhile ? undefined : `not worth it: fees ${fmtUsd(p.feesUsd)} < threshold ${fmtUsd(actions.collectThresholdUsdLive(p.chainId, ethUsd))}`}
            onClick={() => {
              setMenuOpen(false);
              actions.collectFees(p).then(onChanged);
            }}
          >
            {busyCollect ? 'Collecting…' : '💰 Collect fees'}
          </button>
          <button
            className="cockpit-menu-item"
            onClick={() => {
              setMenuOpen(false);
              setCloseOpen(true);
            }}
          >
            ⏹ Close
          </button>
          <button
            className="cockpit-menu-item"
            disabled={!p.pool}
            title={p.pool ? undefined : 'no pool data (try refreshing)'}
            onClick={() => {
              setMenuOpen(false);
              setRebalanceOpen(true);
            }}
          >
            🔄 Manual rebalance
          </button>
        </div>
      )}

      {closeOpen && (
        <CloseModal
          position={p}
          busy={busyClose}
          status={actions.closeStatus[`${p.chainId}-${p.tokenId}`]}
          onClose={() => setCloseOpen(false)}
          onConfirm={(pct, slip) =>
            actions.closePosition(p, pct, slip, () => {
              onChanged();
              setCloseOpen(false);
            })
          }
        />
      )}

      {rebalanceOpen && p.pool && (
        <RebalanceModal
          position={p}
          actions={actions}
          busy={busyRebalance}
          bot={bot}
          onClose={() => setRebalanceOpen(false)}
          onDone={() => {
            onChanged();
            setRebalanceOpen(false);
          }}
        />
      )}

      {/* FIX 25.08 (owner's report): message.key === posKey of this card — without
          this check a toast from an ALREADY CLOSED (and vanished from the list) card
          rendered on the next card in order, because `actions` (and thus
          `message`) is a single state shared by all cards. Auto-hides after
          10s (useCockpitActions.ts), so even if the key ever failed to match,
          nothing hangs here forever. */}
      {actions.message && actions.message.key === `${p.chainId}-${p.tokenId}` && (
        <div className={`message ${actions.message.kind === 'ok' ? 'success' : 'error'} cockpit-action-message`}>{actions.message.text}</div>
      )}
    </div>
  );
};

// --- Modal: Close position ---
// Exported: reused directly by MorningCockpit.tsx for ROTATE proposal cards'
// [1. Close old →] step (Batch 4) — same modal, matched to a held
// PortfolioPosition by tokenId, no changes needed to the modal itself.
// Short hash for display — like formatTxHash in TransactionHistory.tsx,
// deliberately NOT reused from there (that file is outside this session's scope
// except for reading, see the comment at EXPLORER_TX_URL in useCockpitActions.ts).
const shortHash = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

/** Step list for [⏹ Close] (FIX 25.08, owner's report after the 1st live
 *  close of #953427 — the bare "Processing…" button for ~30s between 2
 *  signatures in Rabby said nothing about which step it was on). Pattern
 *  `.sequence-step*` from RebalanceSequenceModal.tsx (Batch 4b) — here only 2
 *  fixed steps instead of a dynamic list from RebalancePlan. */
const CloseSteps: FC<{ chainId: number; status: CloseStepStatus }> = ({ chainId, status }) => {
  const step1Done = status.step > 1 || status.done;
  const step1Active = status.step === 1 && !status.done;
  const step2Done = status.done;
  const step2Active = status.step === 2 && !status.done;
  const icon = (done: boolean, active: boolean) => (done ? '✓' : active && status.error ? '⚠️' : active ? '⏳' : '○');

  return (
    <div className="sequence-steps">
      <div className={`sequence-step ${step1Done ? 'sequence-step-done' : ''} ${step1Active ? 'sequence-step-active' : ''}`}>
        <div className="sequence-step-label">
          {icon(step1Done, step1Active)} Step 1/2: withdraw liquidity (decrease)
        </div>
        {status.hash1 && (
          <div className="sequence-step-detail muted">
            <a href={explorerTxUrl(chainId, status.hash1)} target="_blank" rel="noopener noreferrer">
              {shortHash(status.hash1)} ↗
            </a>
            {step1Done ? ' — confirmed' : ' — waiting for confirmation…'}
          </div>
        )}
      </div>
      <div className={`sequence-step ${step2Done ? 'sequence-step-done' : ''} ${step2Active ? 'sequence-step-active' : ''}`}>
        <div className="sequence-step-label">
          {icon(step2Done, step2Active)} Step 2/2: collect funds + fees (collect)
        </div>
        {status.hash2 ? (
          <div className="sequence-step-detail muted">
            <a href={explorerTxUrl(chainId, status.hash2)} target="_blank" rel="noopener noreferrer">
              {shortHash(status.hash2)} ↗
            </a>
            {step2Done ? ' — confirmed' : ' — waiting for confirmation…'}
          </div>
        ) : (
          // Note ONLY when the step is actually waiting for a signature (not after
          // a real error — status.error gets its own, real message below;
          // reassurance masquerading as a real failure would be misleading).
          step2Active &&
          !status.error && (
            <div className="sequence-step-detail muted">
              Rabby may show "Simulation failed" for THIS signature — it is a simulation on the state from before
              step 1 was confirmed. Step 1 is confirmed (link above) — the signature is safe.
            </div>
          )
        )}
      </div>
    </div>
  );
};

export const CloseModal: FC<{
  position: PortfolioPosition;
  busy: boolean;
  status?: CloseStepStatus;
  onClose: () => void;
  onConfirm: (percentage: number, slippagePercent: number) => void;
}> = ({ position: p, busy, status, onClose, onConfirm }) => {
  const [pct, setPct] = useState(100);
  const [slippage, setSlippage] = useState(1);

  const preview = previewClose(p, pct, slippage);

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Close position #{p.tokenId}</h3>
          {!busy && (
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        <div className="modal-body">
          <p className="muted">{p.poolLabel}</p>

          <div className="remove-percentage">
            <label>Percentage to close:</label>
            <div className="percentage-slider-container">
              <input type="range" min="1" max="100" value={pct} onChange={(e) => setPct(parseInt(e.target.value, 10))} disabled={!!status} />
              <span>{pct}%</span>
            </div>
            <div className="slippage-row">
              {[25, 50, 100].map((v) => (
                <button key={v} className={`chip ${pct === v ? 'selected' : ''}`} onClick={() => setPct(v)} disabled={!!status}>
                  {v}%
                </button>
              ))}
            </div>
          </div>

          <div className="slippage-settings">
            <label>Slippage tolerance:</label>
            <div className="slippage-input-container">
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value))}
                disabled={!!status}
              />
              <span>%</span>
            </div>
          </div>

          <div className="expected-receive">
            <h4>Expected to receive (step 1: decrease + step 2: collect fees):</h4>
            {preview ? (
              <>
                <div className="token-amount">
                  <span>
                    {preview.amount0.toFixed(6)} {p.token0.symbol} <span className="muted">(min after slippage: {preview.amount0Min.toFixed(6)})</span>
                  </span>
                </div>
                <div className="token-amount">
                  <span>
                    {preview.amount1.toFixed(6)} {p.token1.symbol} <span className="muted">(min after slippage: {preview.amount1Min.toFixed(6)})</span>
                  </span>
                </div>
                {p.feesUsd > 0.001 && (
                  <div className="token-amount muted">
                    + accrued fees: {p.feeAmount0.toFixed(6)} {p.token0.symbol} / {p.feeAmount1.toFixed(6)} {p.token1.symbol} (~{fmtUsd(p.feesUsd)})
                  </div>
                )}
              </>
            ) : (
              <div className="morning-note">No preview data (Pool unavailable) — the transaction itself will compute the amounts.</div>
            )}
          </div>

          {/* Progress renders only after the first click on [Close] —
              status is undefined until onConfirm starts the sequence. */}
          {status && <CloseSteps chainId={p.chainId} status={status} />}
          {status?.error && (
            <div className="message error">
              Close failed — funds are safe (try again or collect fees manually with the [💰 Collect fees] button): {status.error}
            </div>
          )}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} disabled={busy}>
              {status?.done ? 'Close window' : 'Cancel'}
            </button>
            {!status?.done && (
              <button className="primary-button" disabled={busy} onClick={() => onConfirm(pct, slippage)}>
                {busy
                  ? `Processing… (step ${status?.step ?? 1}/2)`
                  : status?.error
                  ? `Retry (step ${status.step}/2)`
                  : `Close ${pct}% (2 signatures in Rabby)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Modal: Manual rebalance / new position ---
// Defaults to the range suggested by the advisor when available — but this
// is NOT required. When position.suggestion === null (no statistics: too few
// swaps in 24h, pool outside OBSERVED_PAIRS, or a transient RPC error), the
// modal switches to "Custom range" mode (USD prices, as in
// AddLiquidity.tsx), so the button is never fully blocked by missing advisor
// data. Fix from the P3 review (Batch 4): when the frontend has no
// statistics but `bot` (useBotApi) has a fresh suggestion for the same pool
// (state.pools[].suggestion, mapped by pool address → botPoolId), the
// "Advisor" option shows "Advisor (from bot)" instead of being greyed out — the
// data is already in memory (bot.state), zero new requests.
//
// Exported + typed on RebalanceTarget (not PortfolioPosition) since Batch 4:
// MorningCockpit reuses the same modal for bot proposal cards (REBALANCE
// "Modify", OPEN "Open", ROTATE step 2 "Open new") — these may point to
// a pool where the user has no position yet (tokenId === ''),
// prefilled with the range from the proposal (`initialUsdRange`, ticks+USD from
// suggestedRange in bot/observer.ts / bot/selector.ts).
export const RebalanceModal: FC<{
  position: RebalanceTarget;
  actions: ReturnType<typeof useCockpitActions>;
  busy: boolean;
  onClose: () => void;
  onDone: () => void;
  bot?: UseBotApi;
  title?: string;
  initialUsdRange?: { usdLo: number; usdHi: number };
  /** Batch 16: overrides the default warning "this is NOT the product
   *  ±40/50%" (Batch 13b) for a narrow prefill (<30%) — for FLAT_NARROW
   *  the narrow range is INTENDED (narrowing to k×σ in a confirmed flat),
   *  not a symptom of a stale proposal. `undefined` = behavior unchanged. */
  narrowRangeNote?: string;
}> = ({ position: p, actions, busy, onClose, onDone, bot, title, initialUsdRange, narrowRangeNote }) => {
  // Frontend advisor suggestion (position.suggestion) or, when missing,
  // fallback to the bot's fresh suggestion for the same pool (mapped by address —
  // works only for held positions, position.poolAddress exists only on
  // PortfolioPosition; RebalanceTarget lacks it, so the fallback applies
  // solely to regular use from a position card, not to bot proposals).
  const heldPoolAddress = (p as { poolAddress?: string }).poolAddress;
  const botPoolMeta = heldPoolAddress ? findBotPoolByAddress(p.chainId, heldPoolAddress) : undefined;
  const botLive = botPoolMeta ? bot?.state?.pools?.find((bp) => bp.id === botPoolMeta.id) : undefined;
  const botSuggestion = !p.suggestion && botLive?.suggestion ? botLive.suggestion : null;
  const advisorTicks: [number, number] | null = p.suggestion
    ? [p.suggestion.tickLower, p.suggestion.tickUpper]
    : botSuggestion
    ? [botSuggestion.tickLower, botSuggestion.tickUpper]
    : null;
  const advisorWidthPct = p.suggestion ? p.suggestion.widthPct : botSuggestion ? botSuggestion.widthPct : null;
  // BATCH 20 item 1: for pools TRACKED by the bot, `p.suggestion` is already
  // sourced from bot.state.pools[] via usePortfolio.ts (suggestionSource
  // === 'bot') — the number itself is only displayed here, not recomputed.
  // The only "ui-estimate" case is a pool outside the bot's configuration (not
  // in BOT_POOL_META) — the "(UI estimate)" suffix warns that it is the
  // browser's own calculation, not what the bot actually plays. `suggestionSource` is
  // optional (RebalanceTarget from resolveBotPool does not carry it — the target for
  // OPEN/ROTATE proposals does not go through usePortfolio).
  const suggestionSource = (p as { suggestionSource?: 'bot' | 'ui-estimate' | null }).suggestionSource ?? null;
  const advisorLabel = p.suggestion
    ? suggestionSource === 'ui-estimate'
      ? 'Advisor (UI estimate)'
      : 'Advisor'
    : botSuggestion
    ? 'Advisor (from bot)'
    : null;

  const [mode, setMode] = useState<'suggested' | 'custom'>(initialUsdRange ? 'custom' : advisorTicks ? 'suggested' : 'custom');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [lastEdited, setLastEdited] = useState<0 | 1>(0);
  const [bal0, setBal0] = useState<bigint>(0n);
  const [bal1, setBal1] = useState<bigint>(0n);
  const [allow0, setAllow0] = useState<bigint>(0n);
  const [allow1, setAllow1] = useState<bigint>(0n);
  const [approving, setApproving] = useState<0 | 1 | null>(null);
  // Item 2 (Batch 13): manual fallback — the read on EVERY modal open
  // (mount, effect below) already exists, but when the RPC happens to fail at
  // that moment, the user has no option other than closing and reopening the modal.
  const [refreshing, setRefreshing] = useState(false);

  const refreshBalances = async () => {
    const [r0, r1] = await Promise.all([actions.readBalanceAndAllowance(p, 0), actions.readBalanceAndAllowance(p, 1)]);
    setBal0(r0.balance);
    setAllow0(r0.allowance);
    setBal1(r1.balance);
    setAllow1(r1.allowance);
  };
  useEffect(() => {
    refreshBalances().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.tokenId]);
  const manualRefreshBalances = async () => {
    setRefreshing(true);
    try {
      await refreshBalances();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // Same USD-orientation logic MyPositions.tsx uses for the advisor line —
  // works directly here since PortfolioPosition already carries token symbols.
  const ethT0 = p.token0.symbol.includes('ETH');
  const usdAt = (t: number) => {
    const raw = Math.pow(1.0001, t) * Math.pow(10, p.token0.decimals - p.token1.decimals);
    return ethT0 ? raw : 1 / raw;
  };

  // Item 2 (Batch 13b): `usdAt` actually computes the price of the "other"
  // (non-ETH) token EXPRESSED in the ETH-side token (raw = token1 per token0,
  // inverted when ETH is on the token1 side) — the name "usd" is misleading, but
  // the math is correct. For ETH/stable pairs the "other" token IS USD,
  // so the "$"/"USD" label was accurate. For base-cbbtc-weth-005 (WETH/cbBTC,
  // NEITHER is a stablecoin) the same number is "cbBTC per WETH" (~0.031),
  // and the "Min (USD)" placeholder / "$" prefix showed a false unit —
  // owner's report after opening the cbBTC leg 27.08. The label is now
  // dynamic: USD for pairs with a stablecoin, otherwise
  // "{other token symbol} per {ETH-side token symbol}".
  const STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'USDBC', 'USDE', 'FRAX', 'LUSD']);
  const ethSideToken = ethT0 ? p.token0 : p.token1;
  const otherSideToken = ethT0 ? p.token1 : p.token0;
  const isStableQuote = STABLE_SYMBOLS.has(otherSideToken.symbol.toUpperCase());
  const quoteUnitPrefix = isStableQuote ? '$' : '';
  const quoteUnitSuffix = isStableQuote ? '' : ` ${otherSideToken.symbol}/${ethSideToken.symbol}`;
  const quoteUnitPlaceholder = isStableQuote ? 'USD' : `${otherSideToken.symbol} per ${ethSideToken.symbol}`;
  const fmtQuote = (v: number) => `${quoteUnitPrefix}${v.toLocaleString(undefined, { maximumSignificantDigits: 6 })}${quoteUnitSuffix}`;

  const spacing = p.pool ? TICK_SPACINGS[p.fee as keyof typeof TICK_SPACINGS] : 60;
  const suggestedUsdLo = advisorTicks ? usdAt(ethT0 ? advisorTicks[0] : advisorTicks[1]) : null;
  const suggestedUsdHi = advisorTicks ? usdAt(ethT0 ? advisorTicks[1] : advisorTicks[0]) : null;
  const currentQuotePrice = p.pool ? usdAt(p.pool.tickCurrent) : null;

  // Default fill of the "Custom range" fields: the range from the bot proposal when
  // the modal was opened from a proposal card (initialUsdRange — Batch 4); otherwise
  // ±15% around the current pool price (the same default wide range as
  // AddLiquidity.tsx for the "±15%" mode).
  const defaultCustom = useMemo(() => {
    if (initialUsdRange) return { lo: initialUsdRange.usdLo.toPrecision(6), hi: initialUsdRange.usdHi.toPrecision(6) };
    if (!p.pool) return { lo: '', hi: '' };
    const curUsd = usdAt(p.pool.tickCurrent);
    return { lo: (curUsd * 0.85).toPrecision(6), hi: (curUsd * 1.15).toPrecision(6) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.pool, initialUsdRange]);
  const [customLo, setCustomLo] = useState(defaultCustom.lo);
  const [customHi, setCustomHi] = useState(defaultCustom.hi);

  // Item 3 (Batch 13b): when prefilling from a bot proposal (initialUsdRange —
  // always lands in "custom" mode, see the `mode` state below) show the computed
  // ±% width right away, so the user SEES it is not the product
  // ±40/50% — report after the 27.08 incident (the modal sucked in a stale narrow
  // ±16% proposal from 25.08 after a bot restart, and it looked like a normal
  // "Custom range" with no warning about the scale).
  const initialRangeWidthPct = useMemo(() => {
    if (!initialUsdRange) return null;
    const { usdLo, usdHi } = initialUsdRange;
    if (!(usdHi > usdLo) || usdLo <= 0) return null;
    const mid = (usdLo + usdHi) / 2;
    return ((usdHi - usdLo) / (2 * mid)) * 100;
  }, [initialUsdRange]);

  const customTicks = useMemo((): [number, number] | null => {
    const lo = parseFloat(customLo);
    const hi = parseFloat(customHi);
    if (!isFinite(lo) || !isFinite(hi) || lo <= 0 || hi <= lo) return null;
    const toTick = (usd: number) => humanPriceToTick(ethT0 ? usd : 1 / usd, p.token0.decimals, p.token1.decimals);
    const t1 = toTick(lo);
    const t2 = toTick(hi);
    const tl = nearestUsableTick(Math.min(t1, t2), spacing);
    const th = nearestUsableTick(Math.max(t1, t2), spacing);
    return th > tl ? [tl, th] : [tl, tl + spacing];
  }, [customLo, customHi, ethT0, p.token0.decimals, p.token1.decimals, spacing]);

  const effectiveTicks: [number, number] | null = mode === 'suggested' && advisorTicks ? advisorTicks : customTicks;

  useEffect(() => {
    if (!p.pool || !effectiveTicks) return;
    try {
      const src = lastEdited === 0 ? amount0 : amount1;
      if (!src || !isFinite(parseFloat(src)) || parseFloat(src) <= 0) return;
      const r = calculateOptimalAmounts(
        p.pool,
        effectiveTicks[0],
        effectiveTicks[1],
        lastEdited === 0 ? src : undefined,
        lastEdited === 1 ? src : undefined
      );
      if (lastEdited === 0 && r.amount1 !== amount1) setAmount1(r.amount1);
      if (lastEdited === 1 && r.amount0 !== amount0) setAmount0(r.amount0);
    } catch {
      /* incomplete input */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount0, amount1, lastEdited, effectiveTicks?.[0], effectiveTicks?.[1]]);

  const parsed0 = (() => {
    try {
      return parseUnits((amount0 || '0') as `${number}`, p.token0.decimals);
    } catch {
      return 0n;
    }
  })();
  const parsed1 = (() => {
    try {
      return parseUnits((amount1 || '0') as `${number}`, p.token1.decimals);
    } catch {
      return 0n;
    }
  })();
  const needApprove0 = parsed0 > 0n && allow0 < parsed0;
  const needApprove1 = parsed1 > 0n && allow1 < parsed1;
  const insufficient = parsed0 > bal0 || parsed1 > bal1;

  // Item 6 (Batch 13): when the auto-recalculation (calculateOptimalAmounts, effect
  // above) raises the amount ABOVE the already approved allowance, the Approve button
  // simply "comes back" (needApprove* flips back to true) — without an
  // explanation the user thinks their earlier signature was lost. The note next to
  // the button shows that part of the allowance STILL stands (approved > 0), only
  // more is needed — the difference between "signature lost" and "sign once more
  // for a higher amount".
  const approveNote0 = needApprove0 && allow0 > 0n ? `approved: ${formatUnits(allow0, p.token0.decimals)}, needed: ${formatUnits(parsed0, p.token0.decimals)}` : null;
  const approveNote1 = needApprove1 && allow1 > 0n ? `approved: ${formatUnits(allow1, p.token1.decimals)}, needed: ${formatUnits(parsed1, p.token1.decimals)}` : null;

  const approve = async (which: 0 | 1) => {
    setApproving(which);
    try {
      await actions.approveToken(p, which, which === 0 ? parsed0 : parsed1);
      await refreshBalances();
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title ?? 'Manual rebalance — new position'}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="muted">{p.poolLabel}</p>

          <div className="range-options-wrapper">
            <div className={`range-option ${mode === 'suggested' ? 'selected' : ''} ${!advisorTicks ? 'disabled' : ''}`} onClick={() => advisorTicks && setMode('suggested')}>
              <div className="range-option-radio"></div>
              <div className="range-option-label">
                {advisorTicks && advisorWidthPct !== null ? `${advisorLabel} ±${advisorWidthPct.toFixed(1)}%` : 'Advisor (no data)'}
              </div>
            </div>
            <div className={`range-option ${mode === 'custom' ? 'selected' : ''}`} onClick={() => setMode('custom')}>
              <div className="range-option-radio"></div>
              <div className="range-option-label">Custom range</div>
            </div>
          </div>

          {!advisorTicks && (
            <div className="morning-note">
              {initialUsdRange
                ? 'The advisor has no statistics of its own for this pool — the fields below are prefilled with the range from the bot proposal (you can change it).'
                : 'The advisor has no statistics for this pool (too few swaps in the last 24h, or the pool is outside the observed list) — enter the range manually.'}
            </div>
          )}

          {/* Item 3 (Batch 13b): width of the prefilled range from the bot
              proposal, VISIBLE regardless of the currently selected mode — the user
              should see it right away, before possibly switching to "Advisor"
              and back and losing context. */}
          {initialRangeWidthPct !== null && (
            <div className="morning-note">
              Range from proposal: <b>±{initialRangeWidthPct.toFixed(1)}%</b> around the midpoint
              {initialRangeWidthPct < 30 ? ` — ${narrowRangeNote ?? 'NARROW, this is NOT the product ±40/50% (check the proposal source)'}` : ''}.
            </div>
          )}

          {mode === 'suggested' && advisorTicks ? (
            <div className="range-preview">
              Range: <b>{fmtQuote(suggestedUsdLo!)} – {fmtQuote(suggestedUsdHi!)}</b>{' '}
              <span className="muted">(ticks {advisorTicks[0]} … {advisorTicks[1]})</span>
            </div>
          ) : (
            <>
              <div className="custom-range-inputs">
                <input placeholder={`Min (${quoteUnitPlaceholder})`} value={customLo} onChange={(e) => setCustomLo(e.target.value)} />
                <input placeholder={`Max (${quoteUnitPlaceholder})`} value={customHi} onChange={(e) => setCustomHi(e.target.value)} />
              </div>
              {/* Item 2 (Batch 13b): current price hint in the same,
                  dynamically chosen unit as the placeholders above —
                  without it "0.031" looked like a typo, not like a real
                  cbBTC-per-WETH price. */}
              {currentQuotePrice !== null && (
                <div className="muted" style={{ marginTop: -4, marginBottom: 8 }}>
                  current price: {fmtQuote(currentQuotePrice)}
                </div>
              )}
            </>
          )}
          {mode === 'custom' && !customTicks && <div className="message error">Enter a valid range (min &lt; max, both values &gt; 0)</div>}

          <div className="morning-note">
            {p.tokenId ? (
              <>
                Opens a NEW position in this range (the old #{p.tokenId} stays — close it separately with the [⏹ Close] button if you want a full
                rebalance; an automatic close+swap+mint builder in one sequence will come later — UX-COCKPIT.md §3).
              </>
            ) : (
              <>Opens a NEW position in this pool, in the selected range.</>
            )}
          </div>

          <div className="token-inputs">
            <div className="token-input">
              <label>
                {p.token0.symbol}{' '}
                <span className="muted" title={`exactly: ${formatUnits(bal0, p.token0.decimals)} ${p.token0.symbol}`}>
                  balance: {floorBalanceStr(bal0, p.token0.decimals, p.token0.decimals === 6 ? 2 : 6)}
                </span>{' '}
                {/* Item 4 (Batch 13): MAX enters the EXACT balance (formatUnits
                    without rounding) — not the value next to it, which is truncated
                    down for display (item 5) and typing it manually
                    would leave token dust unused. */}
                <button
                  type="button"
                  className="chip"
                  disabled={bal0 === 0n}
                  onClick={() => {
                    setAmount0(formatUnits(bal0, p.token0.decimals));
                    setLastEdited(0);
                  }}
                >
                  MAX
                </button>
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
                {p.token1.symbol}{' '}
                <span className="muted" title={`exactly: ${formatUnits(bal1, p.token1.decimals)} ${p.token1.symbol}`}>
                  balance: {floorBalanceStr(bal1, p.token1.decimals, p.token1.decimals === 6 ? 2 : 6)}
                </span>{' '}
                <button
                  type="button"
                  className="chip"
                  disabled={bal1 === 0n}
                  onClick={() => {
                    setAmount1(formatUnits(bal1, p.token1.decimals));
                    setLastEdited(1);
                  }}
                >
                  MAX
                </button>
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

          {insufficient && <div className="message error">Insufficient balance</div>}

          {/* Item 1 (Batch 13b): the "↻ refresh balances" button moved out of the
              main action row into its own quiet line — in modal-actions
              together with Cancel/Approve×2(+notes)/Open it was too cramped even with
              flex-wrap (owner's screenshot: it wrapped illegibly).
              Item 2 (Batch 13) the fallback itself stays, just in a different place. */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <button
              type="button"
              className="secondary-button"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={manualRefreshBalances}
              disabled={refreshing || busy}
              title="Force a re-read of balance and allowance"
            >
              {refreshing ? 'Refreshing…' : '↻ refresh balances'}
            </button>
          </div>

          <div className="modal-actions" style={{ flexWrap: 'wrap', rowGap: 8 }}>
            <button className="secondary-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            {needApprove0 && (
              // Inline instead of a new CSS class — see the rationale in
              // useCockpitActions.ts (styles.css is outside the hard scope of Batch
              // 13/13b, though .modal-actions got flex-wrap inline here and that
              // is enough without touching the CSS file).
              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <button className="action-button" disabled={approving !== null} onClick={() => approve(0)}>
                  {approving === 0 ? 'Approving…' : `Approve ${p.token0.symbol}`}
                </button>
                {approveNote0 && (
                  <span className="muted" style={{ fontSize: 11 }}>
                    {approveNote0}
                  </span>
                )}
              </span>
            )}
            {needApprove1 && (
              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <button className="action-button" disabled={approving !== null} onClick={() => approve(1)}>
                  {approving === 1 ? 'Approving…' : `Approve ${p.token1.symbol}`}
                </button>
                {approveNote1 && (
                  <span className="muted" style={{ fontSize: 11 }}>
                    {approveNote1}
                  </span>
                )}
              </span>
            )}
            <button
              className="primary-button"
              disabled={busy || !effectiveTicks || needApprove0 || needApprove1 || insufficient || (parsed0 === 0n && parsed1 === 0n)}
              onClick={() => effectiveTicks && actions.openPositionAtRange(p, effectiveTicks[0], effectiveTicks[1], amount0 || '0', amount1 || '0', 50, onDone)}
            >
              {busy ? 'Opening…' : 'Open position'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CockpitPositionActions;
