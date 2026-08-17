/**
 * MorningCockpit.tsx — poranny kokpit (UI-VISION.md §3.1, UX-COCKPIT.md §1,
 * TASKS-UI.md Partia 2 #0/#1 + Partia 3). First thing visible above the
 * "Zarządzaj (zaawansowane)" group: financial header (usePortfolio), bot
 * proposals (useBotApi), per-position cards with inline actions (Partia 3:
 * Zbierz fees / Zamknij / Rebalans ręczny — see CockpitPositionActions.tsx +
 * useCockpitActions.ts), and a collapsible bot telemetry table
 * (BotTelemetry.tsx). Collapsible, compact, plain CSS (see styles.css,
 * "UI session" sections, classes prefixed morning-, cockpit- and telemetry-).
 */
import React, { FC, useState } from 'react';
import { useAccount } from 'wagmi';
import { Pool } from '@uniswap/v3-sdk';
import { usePortfolio, PortfolioPosition } from '../hooks/usePortfolio';
import { UseBotApi, BotProposal } from '../hooks/useBotApi';
import { useCockpitActions, RebalanceTarget } from '../hooks/useCockpitActions';
import { useRebalanceExecution } from '../hooks/useRebalanceExecution';
import { planRebalance, RebalancePlan } from '../utils/rebalanceBuilder';
import BotStatusDot from './BotStatusDot';
import BotTelemetry from './BotTelemetry';
import ObservationAnalysis from './ObservationAnalysis';
import ForecastPanel from './ForecastPanel';
import CockpitPositionActions, { CloseModal, RebalanceModal } from './CockpitPositionActions';
import RebalanceSequenceModal from './RebalanceSequenceModal';

const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ADVICE_ICON: Record<string, string> = {
  IN_RANGE_HOLD: '✅',
  REBALANCE: '🔄',
  WAIT_NOT_PROFITABLE: '⏳',
};

interface Props {
  bot: UseBotApi;
}

// Karty propozycji z kart bota (Partia 4) mogą otwierać dwa różne modale
// istniejące od Partii 3 (CockpitPositionActions.tsx), tylko prefillowane
// danymi z propozycji zamiast z karty pozycji:
//  - 'close' — modal "Zamknij pozycję" (ROTATE krok 1, zamyka trzymaną pozycję)
//  - 'open'  — modal "Rebalans ręczny / nowa pozycja" (REBALANCE "Modyfikuj",
//    OPEN "Otwórz", ROTATE krok 2 "Otwórz nową") — target to albo istniejąca
//    PortfolioPosition (REBALANCE), albo RebalanceTarget wyliczony na żądanie
//    przez resolveBotPool() dla puli, w której user jeszcze nie ma pozycji.
type ProposalModalState =
  | { type: 'close'; position: PortfolioPosition }
  | { type: 'open'; target: RebalanceTarget; title: string; initialUsdRange?: { usdLo: number; usdHi: number } };

// [Zatwierdź] (Partia 4b) — plan pełnej sekwencji (decrease+collect → swap →
// mint) z rebalanceBuilder.ts dla kart REBALANCE. Tylko REBALANCE: stara i
// nowa pozycja są w TEJ SAMEJ puli, więc planRebalance() (jeden Pool na
// wejściu) ma wszystko czego potrzebuje. ROTATE celowo pominięty tutaj —
// stara/nowa pozycja są w RÓŻNYCH pulach, a builder tego nie obsługuje (zob.
// TODO w TASKS-UI.md Partia 4b, punkt 2) — ROTATE zostaje na krokach 1/2
// ręcznych (już zaimplementowanych w Partii 4).
interface SequenceModalState {
  plan: RebalancePlan;
  pool: Pool;
  newTickLower: number;
  newTickUpper: number;
  proposalId: string;
}

const MorningCockpit: FC<Props> = ({ bot }) => {
  const { address } = useAccount();
  const portfolio = usePortfolio();
  const cockpitActions = useCockpitActions();
  const rebalanceExecution = useRebalanceExecution();
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [baseInput, setBaseInput] = useState(bot.apiBase);
  const [tokenInput, setTokenInput] = useState(bot.apiToken);
  const [proposalModal, setProposalModal] = useState<ProposalModalState | null>(null);
  const [sequenceModal, setSequenceModal] = useState<SequenceModalState | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);

  if (!portfolio.connected) return null;

  const findHeldPosition = (tokenId: string): PortfolioPosition | undefined => portfolio.positions.find((x) => x.tokenId === tokenId);

  // REBALANCE "Modyfikuj →": prefill z pozycji już trzymanej przez usera.
  const openModifyRebalance = (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos) {
      setProposalError(`Pozycja #${p.tokenId} nie znaleziona w portfelu (może już zamknięta) — odśwież.`);
      return;
    }
    setProposalError(null);
    setProposalModal({ type: 'open', target: pos, title: `Modyfikuj rebalans #${p.tokenId}`, initialUsdRange: p.suggestedRange });
  };

  // REBALANCE "Zatwierdź →" (Partia 4b): buduje pełny plan (decrease+collect →
  // swap → mint) i otwiera modal sekwencji zamiast otwierać drugą, osobną
  // pozycję jak [Modyfikuj →] — user kończy z jedną pozycją w nowym zakresie,
  // nie dwiema.
  const openApproveSequence = (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos || !pos.pool) {
      setProposalError(`Pozycja #${p.tokenId} nie znaleziona w portfelu albo brak danych puli (może już zamknięta) — odśwież.`);
      return;
    }
    if (!address) {
      setProposalError('Portfel niepołączony.');
      return;
    }
    const newTickLower = p.suggestedRange?.tickLower;
    const newTickUpper = p.suggestedRange?.tickUpper;
    if (newTickLower === undefined || newTickUpper === undefined) {
      setProposalError(`Propozycja #${p.tokenId} nie ma pełnego zakresu (ticki) do automatycznej sekwencji — użyj [Modyfikuj →].`);
      return;
    }
    setProposalError(null);
    try {
      const plan = planRebalance({
        pool: pos.pool,
        chainId: pos.chainId,
        tokenId: pos.tokenId,
        liquidity: BigInt(pos.liquidity),
        tickLower: pos.tickLower,
        tickUpper: pos.tickUpper,
        newTickLower,
        newTickUpper,
        feesOwed0: BigInt(pos.feesOwed0Raw),
        feesOwed1: BigInt(pos.feesOwed1Raw),
        recipient: address,
        slippageBps: 50,
      });
      rebalanceExecution.reset();
      setSequenceModal({ plan, pool: pos.pool, newTickLower, newTickUpper, proposalId: p.id });
    } catch (e) {
      setProposalError(`Nie udało się zbudować planu rebalansu: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
    }
  };

  // OPEN "Otwórz →" / ROTATE krok 2 "Otwórz nową →": pula z propozycji może
  // być taka, w której user nie ma jeszcze pozycji — trzeba ją wyliczyć
  // (2 dodatkowe odczyty RPC, na żądanie, nie przy każdym renderze).
  const openNewAtProposal = async (p: BotProposal, title: string) => {
    if (!p.poolId) return; // przycisk ukryty, gdy poolId === '' (pula spoza konfiguracji bota)
    setResolvingId(p.id);
    setProposalError(null);
    const resolved = await cockpitActions.resolveBotPool(p.poolId);
    setResolvingId(null);
    if (!resolved) {
      setProposalError('Nie udało się pobrać danych puli — spróbuj ponownie.');
      return;
    }
    setProposalModal({ type: 'open', target: resolved, title, initialUsdRange: p.suggestedRange });
  };

  // ROTATE krok 1 "Zamknij starą →" / EXIT_TREND "Zamknij →": pozycja do
  // zamknięcia jest zawsze trzymana przez usera (bot proponuje rotację albo
  // bezpiecznik trendu tylko dla pozycji, które faktycznie widzi na walletcie).
  const openCloseForProposal = (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos) {
      setProposalError(`Pozycja #${p.tokenId} nie znaleziona w portfelu (może już zamknięta) — odśwież.`);
      return;
    }
    setProposalError(null);
    setProposalModal({ type: 'close', position: pos });
  };

  const saveSettings = () => {
    bot.setApiBase(baseInput.trim() || 'http://localhost:8787');
    bot.setApiToken(tokenInput.trim());
    bot.refresh();
    setShowSettings(false);
  };

  // state.json already only carries 'open' proposals (bot/observer.ts filters
  // on save) — filter defensively anyway in case that ever changes.
  const pendingProposals = (bot.state?.proposals ?? []).filter((p) => p.status === 'open');

  return (
    <div className="morning-cockpit">
      <div className="morning-header" onClick={() => setCollapsed((c) => !c)}>
        <h2>☀️ Poranny kokpit</h2>
        <div className="morning-header-actions">
          <BotStatusDot status={bot.status} />
          <button
            className="morning-settings-btn"
            title="Ustawienia połączenia z botem"
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings((s) => !s);
            }}
          >
            ⚙
          </button>
          <span className="morning-toggle">{collapsed ? '▶' : '▼'}</span>
        </div>
      </div>

      {showSettings && (
        <div className="morning-settings" onClick={(e) => e.stopPropagation()}>
          <label>
            Adres API bota
            <input value={baseInput} onChange={(e) => setBaseInput(e.target.value)} placeholder="http://192.168.1.8:8787" />
          </label>
          <label>
            Token dostępu
            <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="BOT_API_TOKEN" type="password" />
          </label>
          <button className="action-button primary" onClick={saveSettings}>
            Zapisz
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="morning-body">
          <div className="morning-summary">
            <div className="morning-stat">
              <span className="morning-stat-value">{portfolio.loading ? '…' : fmtUsd(portfolio.totalUsd)}</span>
              <span className="morning-stat-label">Wartość łączna{portfolio.hasUnknownValue ? '*' : ''}</span>
            </div>
            <div className="morning-stat">
              <span className="morning-stat-value">
                {portfolio.positionsInRange}/{portfolio.positionsInRange + portfolio.positionsOutOfRange}
              </span>
              <span className="morning-stat-label">Pozycje in-range</span>
            </div>
            <div className="morning-stat">
              <span className="morning-stat-value">{portfolio.loading ? '…' : fmtUsd(portfolio.feesUsd)}</span>
              <span className="morning-stat-label">Fee do zebrania</span>
            </div>
          </div>

          {portfolio.hasUnknownValue && (
            <div className="morning-note">
              * pomija pozycje bez stabilnej/ETH nogi (np. cbBTC/WETH) — brak wiarygodnej wyceny USD bez dodatkowego feeda
            </div>
          )}
          {portfolio.error && <div className="morning-note morning-error">Błąd portfela: {portfolio.error}</div>}

          <div className="morning-section-title">Propozycje bota</div>
          {bot.status === 'offline' ? (
            <div className="morning-bot-offline">
              Bot offline — uruchom usługę homos-bot na serwerze (⚙ żeby ustawić adres/token).
            </div>
          ) : pendingProposals.length > 0 ? (
            <div className="morning-proposals">
              {pendingProposals.map((p) => {
                const kind = p.kind ?? 'REBALANCE';
                return (
                  <div key={p.id} className="morning-proposal-card morning-proposal-card--stacked">
                    {kind === 'REBALANCE' && (
                      <>
                        <div className="morning-proposal-line">
                          🔄 REBALANS #{p.tokenId}
                          {p.suggestedRange && (
                            <>
                              {' '}
                              → ${p.suggestedRange.usdLo.toLocaleString()}–${p.suggestedRange.usdHi.toLocaleString()}
                            </>
                          )}
                          {typeof p.costUsd === 'number' && <> · koszt ${p.costUsd.toFixed(2)}</>}
                          {typeof p.paybackDays === 'number' && <> · payback ~{p.paybackDays.toFixed(1)} dni</>}
                        </div>
                        <div className="morning-proposal-actions">
                          <button className="action-button primary" onClick={() => openApproveSequence(p)}>
                            Zatwierdź →
                          </button>
                          <button className="action-button" onClick={() => openModifyRebalance(p)}>
                            Modyfikuj →
                          </button>
                          <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                            Odrzuć
                          </button>
                        </div>
                      </>
                    )}

                    {kind === 'OPEN' && (
                      <>
                        <div className="morning-proposal-line">🟢 {p.action}</div>
                        {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
                        <div className="morning-proposal-actions">
                          {p.poolId && (
                            <button className="action-button" disabled={resolvingId === p.id} onClick={() => openNewAtProposal(p, `Otwórz — ${p.symbol ?? p.action}`)}>
                              {resolvingId === p.id ? 'Wczytywanie…' : 'Otwórz →'}
                            </button>
                          )}
                          <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                            Odrzuć
                          </button>
                        </div>
                      </>
                    )}

                    {kind === 'ROTATE' && (
                      <>
                        <div className="morning-proposal-line">
                          🔁 Zamknij #{p.tokenId}
                          {typeof p.heldApy7d === 'number' && <> (7d {p.heldApy7d.toFixed(1)}%)</>}
                        </div>
                        <div className="morning-proposal-line">
                          → Otwórz {p.symbol ?? ''}
                          {typeof p.apy7d === 'number' && <> (7d {p.apy7d.toFixed(1)}%)</>}
                          {typeof p.breakEvenDays === 'number' && <> · koszt przejścia zwraca się w ~{p.breakEvenDays.toFixed(1)}d</>}
                        </div>
                        {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
                        {/* Partia 4b: brak automatycznego [Zatwierdź] dla ROTATE — stara i nowa
                            pozycja są w RÓŻNYCH pulach, a rebalanceBuilder.planRebalance()
                            zakłada jeden Pool na wejściu (patrz TODO w TASKS-UI.md Partia 4b,
                            punkt 2). Zostaje na krokach 1/2 ręcznych z Partii 4. */}
                        <div className="morning-note">Automatyczne [Zatwierdź] dla ROTATE: TODO (różne pule stara/nowa) — wykonaj kroki 1/2 poniżej ręcznie.</div>
                        <div className="morning-proposal-actions">
                          <button className="action-button" onClick={() => openCloseForProposal(p)}>
                            1. Zamknij starą →
                          </button>
                          {p.poolId && (
                            <button className="action-button" disabled={resolvingId === p.id} onClick={() => openNewAtProposal(p, `Otwórz nową — ${p.symbol ?? ''}`)}>
                              {resolvingId === p.id ? 'Wczytywanie…' : '2. Otwórz nową →'}
                            </button>
                          )}
                          <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                            Odrzuć
                          </button>
                        </div>
                      </>
                    )}

                    {kind === 'EXIT_TREND' && (
                      <>
                        <div className="morning-proposal-line">
                          ⛔ Bezpiecznik trendu: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}
                        </div>
                        {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
                        <div className="morning-proposal-actions">
                          <button className="action-button primary" onClick={() => openCloseForProposal(p)}>
                            Zamknij →
                          </button>
                          <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                            Odrzuć
                          </button>
                        </div>
                      </>
                    )}

                    {kind === 'HEDGE' && (
                      <>
                        <div className="morning-proposal-line">
                          🛡 Hedge: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}
                        </div>
                        {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
                        {(typeof p.hedgeSizeEth === 'number' || typeof p.hedgeNotionalUsd === 'number') && (
                          <div className="morning-proposal-line morning-hedge-size">
                            SHORT{typeof p.hedgeSizeEth === 'number' && <> ~{p.hedgeSizeEth.toFixed(2)} ETH</>}
                            {typeof p.hedgeNotionalUsd === 'number' && <> ≈ ${p.hedgeNotionalUsd.toLocaleString()}</>}
                          </div>
                        )}
                        {/* Perp poza appką (GMX na Arbitrum) — wykonanie ręczne przez Rabby,
                            brak przycisku auto-execute (HANDOFF Fable→Sonnet 2026-08-17 ~15:0x). */}
                        <div className="morning-proposal-actions">
                          <a
                            className="action-button primary"
                            href="https://app.gmx.io/#/trade/?market=ETH-USD"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Otwórz GMX ↗
                          </a>
                          <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                            Odrzuć
                          </button>
                        </div>
                      </>
                    )}

                    {!['REBALANCE', 'OPEN', 'ROTATE', 'EXIT_TREND', 'HEDGE'].includes(kind) && (
                      <>
                        {/* Nieznany kind (np. przyszłe rozszerzenie schematu bota) — pokaż
                            jako szarą notę zamiast crashować albo renderować pustą kartę. */}
                        <div className="morning-note">Nieznany typ propozycji ({kind}): {p.action}</div>
                        <div className="morning-proposal-actions">
                          <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                            Odrzuć
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="morning-note">Brak aktywnych propozycji.</div>
          )}
          {proposalError && <div className="morning-note morning-error">{proposalError}</div>}
          {bot.status === 'stale' && <div className="morning-note">⚠ dane bota nieaktualne (starsze niż 5 min)</div>}

          <div className="morning-section-title">Pozycje — akcje</div>
          {portfolio.loading ? (
            <div className="morning-note">Ładowanie pozycji…</div>
          ) : portfolio.positions.length === 0 ? (
            <div className="morning-note">Brak otwartych pozycji.</div>
          ) : (
            <div className="cockpit-position-cards">
              {portfolio.positions.map((p) => {
                // Pasek zakresu uproszczony do ułamka ticków (bez orientacji
                // cenowej per para, jak w MyPositions.tsx) — wystarczające dla
                // zwięzłej karty listy; pełny pasek USD zostaje w MyPositions.
                const span = p.tickUpper - p.tickLower;
                const pct = span > 0 && p.pool ? Math.min(100, Math.max(0, ((p.pool.tickCurrent - p.tickLower) / span) * 100)) : 50;
                return (
                  <div key={`${p.chainId}-${p.tokenId}`} className="cockpit-position-card">
                    <div className="cockpit-position-card-header">
                      <span>
                        {ADVICE_ICON[p.advice ?? ''] ?? '·'} #{p.tokenId} {p.poolLabel}
                      </span>
                      <span className="muted">{p.valueUsd !== null ? fmtUsd(p.valueUsd) : '— (bez wyceny)'}</span>
                    </div>
                    <div className={`range-bar ${p.inRange ? 'in-range' : 'out-of-range'} cockpit-range-bar`}>
                      <div className="range-bar-marker" style={{ left: `${pct}%` }} />
                    </div>
                    {p.feesUsd > 0.001 && <div className="cockpit-position-fees muted">Nieodebrane fee: {fmtUsd(p.feesUsd)}</div>}
                    <CockpitPositionActions position={p} actions={cockpitActions} onChanged={portfolio.refresh} bot={bot} />
                  </div>
                );
              })}
            </div>
          )}

          <BotTelemetry bot={bot} />
          <ForecastPanel bot={bot} />
          <ObservationAnalysis bot={bot} />
        </div>
      )}

      {proposalModal?.type === 'close' && (
        <CloseModal
          position={proposalModal.position}
          busy={cockpitActions.busyKey === `${proposalModal.position.chainId}-${proposalModal.position.tokenId}-close`}
          onClose={() => setProposalModal(null)}
          onConfirm={(pct, slip) =>
            cockpitActions.closePosition(proposalModal.position, pct, slip, () => {
              portfolio.refresh();
              setProposalModal(null);
            })
          }
        />
      )}
      {proposalModal?.type === 'open' && (
        <RebalanceModal
          position={proposalModal.target}
          actions={cockpitActions}
          busy={cockpitActions.busyKey === `${proposalModal.target.chainId}-${proposalModal.target.tokenId}-rebalance`}
          bot={bot}
          title={proposalModal.title}
          initialUsdRange={proposalModal.initialUsdRange}
          onClose={() => setProposalModal(null)}
          onDone={() => {
            portfolio.refresh();
            setProposalModal(null);
          }}
        />
      )}
      {sequenceModal && (
        <RebalanceSequenceModal
          plan={sequenceModal.plan}
          pool={sequenceModal.pool}
          newTickLower={sequenceModal.newTickLower}
          newTickUpper={sequenceModal.newTickUpper}
          execution={rebalanceExecution}
          onClose={() => setSequenceModal(null)}
          onDone={() => {
            portfolio.refresh();
            bot.dismissProposal(sequenceModal.proposalId);
            setSequenceModal(null);
          }}
        />
      )}
    </div>
  );
};

export default MorningCockpit;
