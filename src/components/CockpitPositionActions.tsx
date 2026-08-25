/**
 * CockpitPositionActions.tsx — [💰 Zbierz fees] / [⏹ Zamknij] / [🔄 Rebalans
 * ręczny] akcje + ich dwa modale, renderowane per pozycja w porannym kokpicie
 * (TASKS-UI.md Partia 3, UX-COCKPIT.md §1.A.3). Cała logika zapisu żyje w
 * useCockpitActions.ts — ten komponent jest prezentacyjny plus lokalny stan
 * modali (suwak procentu, slippage, kwoty tokenów).
 *
 * Partia 10 (20.08, redesign kart wg wzorca paper): trzy przyciski w rzędzie
 * zamienione na menu ⋮ (dropdown, bez bibliotek) — SAME handlery/logika,
 * tylko przeniesiony trigger UI (karty realnych pozycji mają teraz dwa
 * wykresy zamiast miejsca na rząd przycisków). `CloseModal`/`RebalanceModal`
 * (eksportowane, reużywane gdzie indziej) BEZ zmian.
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
  /** Do fallbacku "Doradca (z bota)" w modalu rebalansu (Partia 4, fix z odbioru
   *  P3) — opcjonalne, MorningCockpit zawsze je przekazuje z tego samego
   *  useBotApi(), zero nowych zapytań. */
  bot?: UseBotApi;
  /** Kurs ETH/USD z usePortfolio.ts (FIX 25.08: żywy próg [Zbierz fees]) —
   *  null, gdy portfel nie ma pozycji w puli stable/ETH, z której dałoby się
   *  go wyprowadzić. `actions.collectThresholdUsdLive`/`isCollectWorthwhileLive`
   *  wtedy same spadają na stałą GAS_USD (patrz useCockpitActions.ts). */
  ethUsd: number | null;
}

const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CockpitPositionActions: FC<Props> = ({ position: p, actions, onChanged, bot, ethUsd }) => {
  const [closeOpen, setCloseOpen] = useState(false);
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const worthwhile = actions.isCollectWorthwhileLive(p, ethUsd);
  const busyCollect = actions.busyKey === `${p.chainId}-${p.tokenId}-collect`;
  const busyClose = actions.busyKey === `${p.chainId}-${p.tokenId}-close`;
  const busyRebalance = actions.busyKey === `${p.chainId}-${p.tokenId}-rebalance`;

  // Zamykanie menu klikiem poza / Esc — bez bibliotek (wzorzec: nasłuch na
  // document, sprzątany w cleanupie efektu).
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
      <button className="cockpit-menu-trigger" aria-label="Akcje pozycji" onClick={() => setMenuOpen((v) => !v)}>
        ⋮
      </button>
      {menuOpen && (
        <div className="cockpit-menu-dropdown">
          <button
            className="cockpit-menu-item"
            disabled={!worthwhile || busyCollect}
            title={worthwhile ? undefined : `nieopłacalne: fee ${fmtUsd(p.feesUsd)} < próg ${fmtUsd(actions.collectThresholdUsdLive(p.chainId, ethUsd))}`}
            onClick={() => {
              setMenuOpen(false);
              actions.collectFees(p).then(onChanged);
            }}
          >
            {busyCollect ? 'Zbieranie…' : '💰 Zbierz fees'}
          </button>
          <button
            className="cockpit-menu-item"
            onClick={() => {
              setMenuOpen(false);
              setCloseOpen(true);
            }}
          >
            ⏹ Zamknij
          </button>
          <button
            className="cockpit-menu-item"
            disabled={!p.pool}
            title={p.pool ? undefined : 'brak danych puli (spróbuj odświeżyć)'}
            onClick={() => {
              setMenuOpen(false);
              setRebalanceOpen(true);
            }}
          >
            🔄 Rebalans ręczny
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

      {/* FIX 25.08 (zgłoszenie Rafała): message.key === posKey tej karty — bez
          tego sprawdzenia toast z JUŻ ZAMKNIĘTEJ (i zniknietej z listy) karty
          renderował się na następnej karcie w kolejności, bo `actions` (a
          więc i `message`) jest jednym stanem współdzielonym przez wszystkie
          karty. Auto-znika po 10s (useCockpitActions.ts), więc nawet gdyby
          klucz się kiedyś nie zgodził, nic nie wisi tu bez końca. */}
      {actions.message && actions.message.key === `${p.chainId}-${p.tokenId}` && (
        <div className={`message ${actions.message.kind === 'ok' ? 'success' : 'error'} cockpit-action-message`}>{actions.message.text}</div>
      )}
    </div>
  );
};

// --- Modal: Zamknij pozycję ---
// Exported: reused directly by MorningCockpit.tsx for ROTATE proposal cards'
// [1. Zamknij starą →] step (Partia 4) — same modal, matched to a held
// PortfolioPosition by tokenId, no changes needed to the modal itself.
// Skrót hasha do wyświetlenia — jak formatTxHash w TransactionHistory.tsx,
// świadomie NIE reużywany stamtąd (ten plik poza zakresem tej sesji poza
// odczytem, patrz komentarz przy EXPLORER_TX_URL w useCockpitActions.ts).
const shortHash = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

/** Lista kroków [⏹ Zamknij] (FIX 25.08, zgłoszenie Rafała po 1. bojowym
 *  zamknięciu #953427 — sam guzik "Przetwarzanie…" przez ~30s między 2
 *  podpisami w Rabby nie mówił nic o tym, na którym jest kroku). Wzorzec
 *  `.sequence-step*` z RebalanceSequenceModal.tsx (Partia 4b) — tu tylko 2
 *  stałe kroki zamiast dynamicznej listy z RebalancePlan. */
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
          {icon(step1Done, step1Active)} Krok 1/2: wycofanie płynności (decrease)
        </div>
        {status.hash1 && (
          <div className="sequence-step-detail muted">
            <a href={explorerTxUrl(chainId, status.hash1)} target="_blank" rel="noopener noreferrer">
              {shortHash(status.hash1)} ↗
            </a>
            {step1Done ? ' — potwierdzona' : ' — czekam na potwierdzenie…'}
          </div>
        )}
      </div>
      <div className={`sequence-step ${step2Done ? 'sequence-step-done' : ''} ${step2Active ? 'sequence-step-active' : ''}`}>
        <div className="sequence-step-label">
          {icon(step2Done, step2Active)} Krok 2/2: odbiór środków + fee (collect)
        </div>
        {status.hash2 ? (
          <div className="sequence-step-detail muted">
            <a href={explorerTxUrl(chainId, status.hash2)} target="_blank" rel="noopener noreferrer">
              {shortHash(status.hash2)} ↗
            </a>
            {step2Done ? ' — potwierdzona' : ' — czekam na potwierdzenie…'}
          </div>
        ) : (
          // Notka TYLKO gdy krok faktycznie czeka na podpis (nie po realnym
          // błędzie — status.error dostaje własny, prawdziwy komunikat niżej,
          // podszywanie się reassurance pod prawdziwą awarię byłoby mylące).
          step2Active &&
          !status.error && (
            <div className="sequence-step-detail muted">
              Rabby może pokazać „Simulation failed" przy TYM podpisie — to symulacja na stanie sprzed
              potwierdzenia kroku 1. Krok 1 ma potwierdzenie (link wyżej) — podpis jest bezpieczny.
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
          <h3>Zamknij pozycję #{p.tokenId}</h3>
          {!busy && (
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        <div className="modal-body">
          <p className="muted">{p.poolLabel}</p>

          <div className="remove-percentage">
            <label>Procent do zamknięcia:</label>
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
            <h4>Oczekiwane do otrzymania (krok 1: decrease + krok 2: collect fee):</h4>
            {preview ? (
              <>
                <div className="token-amount">
                  <span>
                    {preview.amount0.toFixed(6)} {p.token0.symbol} <span className="muted">(min po slippage: {preview.amount0Min.toFixed(6)})</span>
                  </span>
                </div>
                <div className="token-amount">
                  <span>
                    {preview.amount1.toFixed(6)} {p.token1.symbol} <span className="muted">(min po slippage: {preview.amount1Min.toFixed(6)})</span>
                  </span>
                </div>
                {p.feesUsd > 0.001 && (
                  <div className="token-amount muted">
                    + narosłe fee: {p.feeAmount0.toFixed(6)} {p.token0.symbol} / {p.feeAmount1.toFixed(6)} {p.token1.symbol} (~{fmtUsd(p.feesUsd)})
                  </div>
                )}
              </>
            ) : (
              <div className="morning-note">Brak danych do podglądu (Pool niedostępny) — kwoty wyliczy sama transakcja.</div>
            )}
          </div>

          {/* Postęp renderuje się dopiero po pierwszym kliknięciu [Zamknij] —
              status jest undefined, dopóki onConfirm nie ruszy sekwencję. */}
          {status && <CloseSteps chainId={p.chainId} status={status} />}
          {status?.error && (
            <div className="message error">
              Zamykanie nieudane — środki bezpieczne (spróbuj ponownie albo zbierz fee ręcznie przyciskiem [💰 Zbierz fees]): {status.error}
            </div>
          )}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} disabled={busy}>
              {status?.done ? 'Zamknij okno' : 'Anuluj'}
            </button>
            {!status?.done && (
              <button className="primary-button" disabled={busy} onClick={() => onConfirm(pct, slippage)}>
                {busy
                  ? `Przetwarzanie… (krok ${status?.step ?? 1}/2)`
                  : status?.error
                  ? `Ponów (krok ${status.step}/2)`
                  : `Zamknij ${pct}% (2 podpisy w Rabby)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Modal: Rebalans ręczny / nowa pozycja ---
// Domyślnie w zakresie sugerowanym przez doradcę, gdy jest dostępny — ale
// NIE jest to wymagane. Gdy position.suggestion === null (brak statystyk:
// mało swapów w 24h, pula spoza OBSERVED_PAIRS, albo chwilowy błąd RPC),
// modal przełącza się na tryb "Własny zakres" (ceny USD, jak w
// AddLiquidity.tsx), żeby przycisk nigdy nie był całkowicie zablokowany
// brakiem danych doradcy. Fix z odbioru P3 (Partia 4): gdy front nie ma
// statystyk, ale `bot` (useBotApi) ma świeżą sugestię dla tej samej puli
// (state.pools[].suggestion, mapowanie po adresie puli → botPoolId), opcja
// "Doradca" pokazuje "Doradca (z bota)" zamiast być wyszarzona — dane już są
// w pamięci (bot.state), zero nowych zapytań.
//
// Exported + typowany na RebalanceTarget (nie PortfolioPosition) od Partii 4:
// MorningCockpit reużywa ten sam modal dla kart propozycji bota (REBALANCE
// "Modyfikuj", OPEN "Otwórz", ROTATE krok 2 "Otwórz nową") — te mogą wskazywać
// na pulę, w której użytkownik jeszcze nie ma pozycji (tokenId === ''),
// prefillowane zakresem z propozycji (`initialUsdRange`, ticki+USD z
// suggestedRange w bot/observer.ts / bot/selector.ts).
export const RebalanceModal: FC<{
  position: RebalanceTarget;
  actions: ReturnType<typeof useCockpitActions>;
  busy: boolean;
  onClose: () => void;
  onDone: () => void;
  bot?: UseBotApi;
  title?: string;
  initialUsdRange?: { usdLo: number; usdHi: number };
}> = ({ position: p, actions, busy, onClose, onDone, bot, title, initialUsdRange }) => {
  // Sugestia frontendowego doradcy (position.suggestion) albo, gdy jej brak,
  // fallback na świeżą sugestię bota dla tej samej puli (mapowanie po adresie —
  // działa tylko dla pozycji trzymanych, position.poolAddress istnieje tylko
  // na PortfolioPosition; RebalanceTarget go nie ma, więc fallback dotyczy
  // wyłącznie zwykłego użycia z karty pozycji, nie propozycji bota).
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
  const advisorLabel = p.suggestion ? 'Doradca' : botSuggestion ? 'Doradca (z bota)' : null;

  const [mode, setMode] = useState<'suggested' | 'custom'>(initialUsdRange ? 'custom' : advisorTicks ? 'suggested' : 'custom');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [lastEdited, setLastEdited] = useState<0 | 1>(0);
  const [bal0, setBal0] = useState<bigint>(0n);
  const [bal1, setBal1] = useState<bigint>(0n);
  const [allow0, setAllow0] = useState<bigint>(0n);
  const [allow1, setAllow1] = useState<bigint>(0n);
  const [approving, setApproving] = useState<0 | 1 | null>(null);

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

  // Same USD-orientation logic MyPositions.tsx uses for the advisor line —
  // works directly here since PortfolioPosition already carries token symbols.
  const ethT0 = p.token0.symbol.includes('ETH');
  const usdAt = (t: number) => {
    const raw = Math.pow(1.0001, t) * Math.pow(10, p.token0.decimals - p.token1.decimals);
    return ethT0 ? raw : 1 / raw;
  };

  const spacing = p.pool ? TICK_SPACINGS[p.fee as keyof typeof TICK_SPACINGS] : 60;
  const suggestedUsdLo = advisorTicks ? usdAt(ethT0 ? advisorTicks[0] : advisorTicks[1]) : null;
  const suggestedUsdHi = advisorTicks ? usdAt(ethT0 ? advisorTicks[1] : advisorTicks[0]) : null;

  // Domyślne wypełnienie pól "Własny zakres": zakres z propozycji bota, gdy
  // modal otwarto z karty propozycji (initialUsdRange — Partia 4); inaczej
  // ±15% wokół aktualnej ceny puli (ten sam domyślny szeroki zakres co
  // AddLiquidity.tsx dla trybu "±15%").
  const defaultCustom = useMemo(() => {
    if (initialUsdRange) return { lo: initialUsdRange.usdLo.toPrecision(6), hi: initialUsdRange.usdHi.toPrecision(6) };
    if (!p.pool) return { lo: '', hi: '' };
    const curUsd = usdAt(p.pool.tickCurrent);
    return { lo: (curUsd * 0.85).toPrecision(6), hi: (curUsd * 1.15).toPrecision(6) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.pool, initialUsdRange]);
  const [customLo, setCustomLo] = useState(defaultCustom.lo);
  const [customHi, setCustomHi] = useState(defaultCustom.hi);

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
      /* niepełny input */
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
          <h3>{title ?? 'Rebalans ręczny — nowa pozycja'}</h3>
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
                {advisorTicks && advisorWidthPct !== null ? `${advisorLabel} ±${advisorWidthPct.toFixed(1)}%` : 'Doradca (brak danych)'}
              </div>
            </div>
            <div className={`range-option ${mode === 'custom' ? 'selected' : ''}`} onClick={() => setMode('custom')}>
              <div className="range-option-radio"></div>
              <div className="range-option-label">Własny zakres</div>
            </div>
          </div>

          {!advisorTicks && (
            <div className="morning-note">
              {initialUsdRange
                ? 'Doradca nie ma własnych statystyk dla tej puli — pola niżej wypełnione zakresem z propozycji bota (możesz zmienić).'
                : 'Doradca nie ma statystyk dla tej puli (za mało swapów w ostatnich 24h, albo pula spoza obserwowanej listy) — wpisz zakres ręcznie.'}
            </div>
          )}

          {mode === 'suggested' && advisorTicks ? (
            <div className="range-preview">
              Zakres: <b>${suggestedUsdLo!.toLocaleString()} – ${suggestedUsdHi!.toLocaleString()}</b>{' '}
              <span className="muted">(ticki {advisorTicks[0]} … {advisorTicks[1]})</span>
            </div>
          ) : (
            <div className="custom-range-inputs">
              <input placeholder="Min (USD)" value={customLo} onChange={(e) => setCustomLo(e.target.value)} />
              <input placeholder="Max (USD)" value={customHi} onChange={(e) => setCustomHi(e.target.value)} />
            </div>
          )}
          {mode === 'custom' && !customTicks && <div className="message error">Podaj poprawny zakres (min &lt; max, obie wartości &gt; 0)</div>}

          <div className="morning-note">
            {p.tokenId ? (
              <>
                Otwiera NOWĄ pozycję w tym zakresie (stara #{p.tokenId} zostaje — zamknij ją osobno przyciskiem [⏹ Zamknij], jeśli chcesz w pełni
                zrebalansować; automatyczny builder zamknij+swap+mint w jednej sekwencji przyjdzie później — UX-COCKPIT.md §3).
              </>
            ) : (
              <>Otwiera NOWĄ pozycję w tej puli, w wybranym zakresie.</>
            )}
          </div>

          <div className="token-inputs">
            <div className="token-input">
              <label>
                {p.token0.symbol}{' '}
                <span className="muted">saldo: {parseFloat(formatUnits(bal0, p.token0.decimals)).toFixed(p.token0.decimals === 6 ? 2 : 6)}</span>
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
                <span className="muted">saldo: {parseFloat(formatUnits(bal1, p.token1.decimals)).toFixed(p.token1.decimals === 6 ? 2 : 6)}</span>
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

          {insufficient && <div className="message error">Za mało środków na saldzie</div>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} disabled={busy}>
              Anuluj
            </button>
            {needApprove0 && (
              <button className="action-button" disabled={approving !== null} onClick={() => approve(0)}>
                {approving === 0 ? 'Approving…' : `Approve ${p.token0.symbol}`}
              </button>
            )}
            {needApprove1 && (
              <button className="action-button" disabled={approving !== null} onClick={() => approve(1)}>
                {approving === 1 ? 'Approving…' : `Approve ${p.token1.symbol}`}
              </button>
            )}
            <button
              className="primary-button"
              disabled={busy || !effectiveTicks || needApprove0 || needApprove1 || insufficient || (parsed0 === 0n && parsed1 === 0n)}
              onClick={() => effectiveTicks && actions.openPositionAtRange(p, effectiveTicks[0], effectiveTicks[1], amount0 || '0', amount1 || '0', 50, onDone)}
            >
              {busy ? 'Otwieranie…' : 'Otwórz pozycję'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CockpitPositionActions;
