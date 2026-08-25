/**
 * MorningCockpit.tsx — GŁÓWNY WIDOK aplikacji (UI-VISION.md §3.1,
 * UX-COCKPIT.md §1, TASKS-UI.md Partie 2/3).
 *
 * 21.08: po usunięciu sekcji „Zarządzaj (zaawansowane)" kokpit nie jest już
 * jednym z modułów — JEST całą aplikacją. Dlatego przestał być zwijany
 * (nie ma tytułu ani strzałki, treść renderuje się zawsze). W nagłówku
 * modułu została kropka statusu bota + ⚙ (adres/token API) — kropka jest
 * wprawdzie duplikatem tej z App.tsx, ale to właśnie ona jest czytana jako
 * „połączenie z serwerem żyje", bo stoi obok ustawień połączenia.
 *
 * Zawartość: nagłówek finansowy (usePortfolio), propozycje bota (useBotApi),
 * karty pozycji z akcjami inline (CockpitPositionActions.tsx +
 * useCockpitActions.ts), paper trading i cztery sekcje zwijane na dole
 * (Telemetria / Prognoza / Analiza / Ranking). Plain CSS — patrz styles.css,
 * klasy z prefiksami morning-, cockpit- i telemetry-.
 */
import React, { FC, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Pool } from '@uniswap/v3-sdk';
import { usePortfolio, PortfolioPosition } from '../hooks/usePortfolio';
import { UseBotApi, BotProposal } from '../hooks/useBotApi';
import { useCockpitActions, RebalanceTarget } from '../hooks/useCockpitActions';
import { useRebalanceExecution } from '../hooks/useRebalanceExecution';
import { useRotateExecution } from '../hooks/useRotateExecution';
import { useHedgeExecution, loadHedgeOpen, clearHedgeOpen, HedgeOpenState } from '../hooks/useHedgeExecution';
import { planRebalance, RebalancePlan, planRotate, RotatePlan } from '../utils/rebalanceBuilder';
import { planHedgeOpen, planHedgeClose, HedgePlan } from '../utils/hedgeBuilder';
import { formatDuration } from '../utils/formatters';
import BotStatusDot from './BotStatusDot';
import BotTelemetry from './BotTelemetry';
import ObservationAnalysis from './ObservationAnalysis';
import ForecastPanel from './ForecastPanel';
import CockpitPositionActions, { CloseModal, RebalanceModal } from './CockpitPositionActions';
import { Sparkline, PriceRangeChart, EquityChartPoint } from './PositionCharts';
import RebalanceSequenceModal from './RebalanceSequenceModal';
import RotateSequenceModal from './RotateSequenceModal';
import HedgeConfirmModal from './HedgeConfirmModal';
import PaperTradingPanel from './PaperTradingPanel';
import TopRankingPanel from './TopRankingPanel';
import ClosedPositionsPanel from './ClosedPositionsPanel';
import ExpandableSection from './ExpandableSection';

const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSigned = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtUsd(Math.abs(v));

const ADVICE_ICON: Record<string, string> = {
  IN_RANGE_HOLD: '✅',
  REBALANCE: '🔄',
  WAIT_NOT_PROFITABLE: '⏳',
};

const ADVICE_TITLE: Record<string, string> = {
  REBALANCE: 'Bot proponuje rebalans (koszt zwróci się z opłat)',
  WAIT_NOT_PROFITABLE: 'Poza zakresem, ale rebalans na razie się nie opłaca — czekamy',
};

/** Ikona stanu REALNEJ pozycji — ten sam język co w paper-tradingu
 *  (prośba Rafała 21.08: w tej sekcji nie było statusu w ogóle, a pozycja
 *  poza zakresem wyglądała identycznie jak zdrowa).
 *  Realna pozycja nie ma stanu 'cash'/'pending' — bot widzi ją albo nie. */
const positionStatusIcon = (inRange: boolean): string => (inRange ? '🟢' : '⚠️');
const positionStatusTitle = (inRange: boolean): string =>
  inRange ? 'W zakresie — pozycja zarabia' : 'POZA zakresem — pozycja nie nalicza opłat';

/**
 * Od kiedy pozycja jest NIEPRZERWANIE poza zakresem — wyliczane z próbek
 * historii (co ~15 min), bo dla REALNYCH pozycji bot nie trzyma znacznika
 * `outOfRangeSince` (to pole istnieje tylko w paper-tradingu).
 * Idziemy od najnowszej próbki wstecz, dopóki `inRange === false`; zwracamy
 * ts pierwszej próbki tej serii. Wynik jest z natury przybliżony do 15 minut
 * i NIE wykryje wypadnięcia krótszego niż odstęp między próbkami.
 */
function outOfRangeSinceFromHistory(points: Array<{ ts: string; inRange: boolean }>): number | null {
  const sorted = [...points].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)); // najnowsze pierwsze
  if (!sorted.length || sorted[0].inRange) return null;
  let since = Date.parse(sorted[0].ts);
  for (const p of sorted) {
    if (p.inRange) break;
    since = Date.parse(p.ts);
  }
  return Number.isFinite(since) ? since : null;
}

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

// [Zatwierdź] ROTATE (Partia 8, domknięcie TODO z Partii 4b) — planRotate()
// wymaga DWÓCH pul (stara/nowa), stąd osobny stan modala od REBALANCE.
interface RotateSequenceModalState {
  plan: RotatePlan;
  newPool: Pool;
  newTickLower: number;
  newTickUpper: number;
  proposalId: string;
}

// [Zatwierdź hedge] / [Zamknij short] (Partia 9) — jeden modal, dwa kierunki
// (plan.preview.direction rozróżnia). proposalId=null dla zamknięcia (nie ma
// propozycji bota do odrzucenia — user zamyka z własnej inicjatywy).
interface HedgeModalState {
  plan: HedgePlan;
  proposalId: string | null;
}

const MorningCockpit: FC<Props> = ({ bot }) => {
  const { address } = useAccount();
  const portfolio = usePortfolio();
  const cockpitActions = useCockpitActions();
  const rebalanceExecution = useRebalanceExecution();
  const rotateExecution = useRotateExecution();
  const hedgeExecution = useHedgeExecution();
  const [showSettings, setShowSettings] = useState(false);
  const [baseInput, setBaseInput] = useState(bot.apiBase);
  const [tokenInput, setTokenInput] = useState(bot.apiToken);
  const [proposalModal, setProposalModal] = useState<ProposalModalState | null>(null);
  const [sequenceModal, setSequenceModal] = useState<SequenceModalState | null>(null);
  const [rotateModal, setRotateModal] = useState<RotateSequenceModalState | null>(null);
  const [hedgeModal, setHedgeModal] = useState<HedgeModalState | null>(null);
  const [hedgeOpen, setHedgeOpen] = useState<HedgeOpenState | null>(() => loadHedgeOpen());
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);

  // Partia 11 pkt 3 (FIX 20.08 — crash "Rendered more hooks": ten useEffect
  // stał PONIŻEJ wczesnego returnu `if (!portfolio.connected) return null`,
  // więc liczba hooków zmieniała się między renderami przy zmianie stanu
  // połączenia. ZASADA: WSZYSTKIE hooki nad KAŻDYM wczesnym returnem.)
  // localStorage to TYLKO fallback — gdy bot POTWIERDZA (state.hedge === null,
  // jawnie, nie undefined/state jeszcze niewczytany) brak pozycji, a fallback
  // jest ustawiony, czyścimy — bot mówi prawdę o stanie on-chain.
  const liveHedge = bot.state?.hedge;
  useEffect(() => {
    if (bot.state && bot.state.hedge === null && hedgeOpen) {
      clearHedgeOpen();
      setHedgeOpen(null);
    }
  }, [bot.state, hedgeOpen]);

  // Bez portfela kokpit nie ma czego pokazać (pozycje/salda czyta z łańcucha).
  // Do 21.08 zwracał tu `null` — a odkąd usunęliśmy sekcję „Zarządzaj",
  // oznaczało to CAŁKOWICIE pustą stronę, wyglądającą jak zepsuta aplikacja.
  if (!portfolio.connected) {
    return (
      <div className="morning-cockpit">
        <div className="morning-note">
          Podłącz portfel („Connect Wallet" u góry), żeby zobaczyć kokpit — pozycje, propozycje bota i paper trading.
        </div>
      </div>
    );
  }

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

  // ROTATE "Zatwierdź →" (Partia 8, domknięcie TODO z Partii 4b): stara i nowa
  // pozycja są w RÓŻNYCH pulach — buduje oba Pool (stara z portfela, nowa z
  // resolveBotPool, ten sam odczyt co "2. Otwórz nową →") i woła planRotate().
  // WARUNEK: ta sama sieć (planRotate rzuca inaczej — złapane niżej z
  // komunikatem "użyj kroków ręcznych"). Kroki 1/2 ręczne ZOSTAJĄ jako fallback.
  const openRotateApprove = async (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos || !pos.pool) {
      setProposalError(`Pozycja #${p.tokenId} nie znaleziona w portfelu albo brak danych puli (może już zamknięta) — odśwież.`);
      return;
    }
    if (!address) {
      setProposalError('Portfel niepołączony.');
      return;
    }
    if (!p.poolId) {
      setProposalError('Propozycja nie wskazuje puli docelowej — użyj kroków ręcznych poniżej.');
      return;
    }
    const newTickLower = p.suggestedRange?.tickLower;
    const newTickUpper = p.suggestedRange?.tickUpper;
    if (newTickLower === undefined || newTickUpper === undefined) {
      setProposalError(`Propozycja #${p.tokenId} nie ma pełnego zakresu (ticki) do automatycznej sekwencji — użyj kroków ręcznych poniżej.`);
      return;
    }
    setResolvingId(p.id);
    setProposalError(null);
    const target = await cockpitActions.resolveBotPool(p.poolId);
    setResolvingId(null);
    if (!target || !target.pool) {
      setProposalError('Nie udało się pobrać danych puli docelowej — spróbuj ponownie albo użyj kroków ręcznych.');
      return;
    }
    if (target.chainId !== pos.chainId) {
      setProposalError('Rotacja cross-chain: automatyczne zatwierdzenie niedostępne (różne sieci) — użyj kroków ręcznych poniżej.');
      return;
    }
    try {
      const plan = planRotate({
        oldPool: pos.pool,
        newPool: target.pool,
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
      rotateExecution.reset();
      setRotateModal({ plan, newPool: target.pool, newTickLower, newTickUpper, proposalId: p.id });
    } catch (e) {
      setProposalError(
        `Nie udało się zbudować planu rotacji: ${e instanceof Error ? e.message.slice(0, 200) : String(e)} — użyj kroków ręcznych poniżej.`
      );
    }
  };

  // HEDGE "Zatwierdź hedge →" (Partia 9): sizeEth z propozycji bota,
  // ethPriceUsd z telemetrii puli (state.pools[poolId].ethUsd — ta sama pula,
  // dla której bot wyliczył sizeEth). Link "Otwórz GMX ↗" zostaje jako fallback.
  const openHedgeApprove = (p: BotProposal) => {
    if (!address) {
      setProposalError('Portfel niepołączony.');
      return;
    }
    const sizeEth = p.hedgeSizeEth;
    if (typeof sizeEth !== 'number' || sizeEth <= 0) {
      setProposalError('Propozycja nie ma rozmiaru hedge (sizeEth) — użyj linku GMX ręcznie.');
      return;
    }
    const ethPriceUsd = bot.state?.pools?.find((pl) => pl.id === p.poolId)?.ethUsd;
    if (typeof ethPriceUsd !== 'number' || ethPriceUsd <= 0) {
      setProposalError('Brak aktualnej ceny ETH z telemetrii bota — użyj linku GMX ręcznie.');
      return;
    }
    setProposalError(null);
    try {
      const plan = planHedgeOpen({ sizeEth, ethPriceUsd, recipient: address });
      hedgeExecution.reset();
      setHedgeModal({ plan, proposalId: p.id });
    } catch (e) {
      setProposalError(`Nie udało się zbudować planu hedge: ${e instanceof Error ? e.message.slice(0, 200) : String(e)} — użyj linku GMX ręcznie.`);
    }
  };

  // 20.08: test E2E hedge ($15 short otwarty i zamknięty przez apkę —
  // szczegóły CONTEXT ~wieczór) wykonany przez TYMCZASOWY przycisk, usunięty
  // po zaliczeniu. Ścieżka produkcyjna = karta propozycji HEDGE poniżej.

  // [Zamknij short →] (Partia 9 pkt 4, Partia 11 pkt 2/3): sizeUsd/collateralUsd
  // brane PRZEDE WSZYSTKIM z `bot.state.hedge` (dane on-chain, odczyt Readerem
  // GMX co cykl — prawda), localStorage (homos_hedge_open) to TYLKO fallback
  // na czas gdy bot jest offline / state.hedge jeszcze niedostępne. Cena ETH
  // z DOWOLNEJ żywej puli w telemetrii (hedge to jeden rynek ETH/USD
  // niezależnie od tego, która pula LP go wywołała).
  // (`liveHedge` zdefiniowany wyżej, nad wczesnym returnem — patrz FIX.)
  const openHedgeCloseModal = () => {
    if (!address) return;
    const sizeUsd = liveHedge ? liveHedge.sizeUsd : hedgeOpen?.sizeUsd;
    const collateralUsd = liveHedge ? liveHedge.collateralUsd : hedgeOpen?.collateralUsd;
    if (typeof sizeUsd !== 'number' || typeof collateralUsd !== 'number') return;
    const ethPriceUsd = bot.state?.pools?.find((pl) => typeof pl.ethUsd === 'number' && pl.ethUsd > 0)?.ethUsd;
    if (typeof ethPriceUsd !== 'number' || ethPriceUsd <= 0) {
      setProposalError('Brak aktualnej ceny ETH z bota — nie można zbudować zamknięcia. Zamknij ręcznie na app.gmx.io.');
      return;
    }
    setProposalError(null);
    try {
      const plan = planHedgeClose({ sizeUsd, collateralUsd, ethPriceUsd, recipient: address });
      hedgeExecution.reset();
      setHedgeModal({ plan, proposalId: null });
    } catch (e) {
      setProposalError(`Nie udało się zbudować zamknięcia hedge: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
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
      {/* 21.08 (decyzja Rafała): po usunięciu sekcji „Zarządzaj" kokpit JEST
          całą aplikacją, więc przestał być zwijanym modułem — nie ma tytułu
          ani strzałki, treść renderuje się zawsze. Zostaje wyłącznie ⚙
          (ustawienia połączenia z botem); kropka statusu bota nie jest tu
          powtarzana, bo siedzi już w nagłówku aplikacji (App.tsx). */}
      <div className="morning-header morning-header-bare">
        <div className="morning-header-actions">
          {/* Kropka statusu bota: usunąłem ją 21.08 jako duplikat tej
              z nagłówka aplikacji, ale Rafał od razu zauważył brak — czyli
              to TA kropka jest czytana jako „połączenie z serwerem żyje",
              bo stoi przy ustawieniach połączenia. Zostaje. */}
          <BotStatusDot status={bot.status} />
          <button
            className="morning-settings-btn"
            title="Ustawienia połączenia z botem"
            onClick={() => setShowSettings((s) => !s)}
          >
            ⚙
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="morning-settings">
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

          {/* Partia 11: gdy bot POTWIERDZA hedge (state.hedge, on-chain) —
              karta w sekcji pozycji niżej przejmuje pokazywanie/[Zamknij
              short →], notka localStorage znika (jedno źródło prawdy na
              ekranie). Notka zostaje jako fallback TYLKO gdy bot offline/
              state.hedge jeszcze niedostępne, a fallback z ostatniego
              udanego otwarcia w tej przeglądarce wciąż jest ustawiony. */}
          {!liveHedge && hedgeOpen && (
            <div className="morning-note morning-proposal-note morning-hedge-open-note">
              🛡 Otwarty short (hedge, z ostatniego zapisu w tej przeglądarce — bot offline/dane jeszcze niedostępne): ~$
              {hedgeOpen.sizeUsd.toFixed(0)} (collateral ${hedgeOpen.collateralUsd.toFixed(0)}) od{' '}
              {new Date(hedgeOpen.ts).toLocaleDateString('pl-PL')}
              <div className="morning-proposal-actions">
                <button className="action-button" onClick={openHedgeCloseModal}>
                  Zamknij short →
                </button>
              </div>
            </div>
          )}

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
                        {/* Partia 8 (domknięcie TODO z Partii 4b): automatyczne [Zatwierdź]
                            wymaga planRotate() (stara+nowa pula, ta sama sieć) — gdy pary
                            rozłączne albo różne sieci, openRotateApprove pokaże błąd i
                            zostają kroki 1/2 ręczne poniżej jako fallback. */}
                        <div className="morning-note">
                          [Zatwierdź] wykona sekwencję automatycznie (tylko ta sama sieć) — kroki 1/2 poniżej zostają jako opcja ręczna.
                        </div>
                        <div className="morning-proposal-actions">
                          <button className="action-button primary" disabled={resolvingId === p.id} onClick={() => openRotateApprove(p)}>
                            {resolvingId === p.id ? 'Wczytywanie…' : 'Zatwierdź →'}
                          </button>
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
                        {/* Partia 9: [Zatwierdź hedge] wysyła zlecenie z tej appki (multicall
                            ExchangeRoutera GMX, 1 podpis) — link GMX zostaje jako fallback
                            ręczny (HANDOFF Fable→Sonnet 2026-08-17 ~15:0x, rozszerzone 20.08). */}
                        <div className="morning-proposal-actions">
                          <button className="action-button primary" onClick={() => openHedgeApprove(p)}>
                            Zatwierdź hedge →
                          </button>
                          <a className="action-button" href="https://app.gmx.io/#/trade/?market=ETH-USD" target="_blank" rel="noreferrer">
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
          <div className="muted status-legend">
            🟢 w zakresie · ⚠️ poza zakresem (nie zarabia) · 🔄 do rebalansu · ⏳ rebalans nieopłacalny
          </div>
          {portfolio.loading ? (
            <div className="morning-note">Ładowanie pozycji…</div>
          ) : portfolio.positions.length === 0 && !liveHedge ? (
            <div className="morning-note">Brak otwartych pozycji.</div>
          ) : (
            <div className="cockpit-position-cards">
              {liveHedge && (
                <div className="cockpit-position-card">
                  <div className="cockpit-position-card-header">
                    <span>
                      🛡 GMX ETH/USD · {liveHedge.isLong ? 'LONG ⚠️' : 'SHORT'} 1×
                    </span>
                    <span className="muted">{fmtUsd(liveHedge.equityUsd)}</span>
                  </div>
                  {liveHedge.isLong && (
                    <div className="morning-note morning-error">
                      ⚠️ Pozycja LONG na GMX — bot oczekuje SHORT (hedge przeciw spadkowi ceny LP). Sprawdź ręcznie na app.gmx.io.
                    </div>
                  )}
                  <div className="cockpit-position-fees muted">
                    {liveHedge.sizeEth.toFixed(4)} ETH (~{fmtUsd(liveHedge.sizeUsd)}) @ {fmtUsd(liveHedge.entryPriceUsd)} · collateral{' '}
                    {fmtUsd(liveHedge.collateralUsd)}
                  </div>
                  <div className={`cockpit-position-fees ${liveHedge.pnlUsd < 0 ? 'forecast-negative' : 'paper-positive'}`}>
                    PnL: {fmtSigned(liveHedge.pnlUsd)}
                  </div>
                  {(() => {
                    const hedgeHistory: EquityChartPoint[] = (bot.positionsHistory ?? [])
                      .filter((h) => h.tokenId === 'gmx-eth-short')
                      .map((h) => ({ ts: h.ts, equityUsd: h.valueUsd, hodlUsd: h.hodlUsd, inRange: h.inRange, price: h.price }));
                    // BEZ PriceRangeChart — perp nie ma zakresu (brak lo/hi w
                    // próbkach, patrz komentarz w bot/observer.ts); tylko equity
                    // vs collateral (benchmark "cash bez shorta").
                    return hedgeHistory.length >= 2 ? (
                      <Sparkline points={hedgeHistory} events={[]} />
                    ) : (
                      <div className="morning-note muted">za mało punktów historii hedge jeszcze zebranych.</div>
                    );
                  })()}
                  <div className="cockpit-position-actions" style={{ marginTop: 8 }}>
                    <button className="action-button" onClick={openHedgeCloseModal}>
                      Zamknij short →
                    </button>
                  </div>
                </div>
              )}
              {portfolio.positions.map((p) => {
                // Pasek zakresu uproszczony do ułamka ticków (bez orientacji
                // cenowej per para, jak w MyPositions.tsx) — wystarczające dla
                // zwięzłej karty listy; pełny pasek USD zostaje w MyPositions.
                const span = p.tickUpper - p.tickLower;
                const pct = span > 0 && p.pool ? Math.min(100, Math.max(0, ((p.pool.tickCurrent - p.tickLower) / span) * 100)) : 50;

                // Partia 10: dwa wykresy jak w PaperTradingPanel, z
                // positionsHistory (GET /api/positions-history, filtrowane po
                // tokenId — unikalny per pozycja, nie trzeba dopasowywać po
                // poolId). Mapowanie na EquityChartPoint: valueUsd→equityUsd
                // (PositionHistoryPoint nie ma `status` — Sparkline/
                // PriceRangeChart traktują wtedy każdą próbkę jak "otwartą",
                // cieniując tylko !inRange, nigdy cash — realne pozycje nie
                // mają stanu cash jak paper).
                const rawPosHistory = (bot.positionsHistory ?? []).filter((h) => h.tokenId === p.tokenId);
                // botPoolId (np. "arbitrum-weth-usdc-005") z samej próbki —
                // NIE mylić z p.poolAddress (adres kontraktu); PriceRangeChart
                // szuka po tym id w BOT_POOL_META (orientacja ceny/formatowanie).
                const botPoolId = rawPosHistory[0]?.poolId ?? '';
                const posHistory: EquityChartPoint[] = rawPosHistory.map((h) => ({
                  ts: h.ts,
                  equityUsd: h.valueUsd,
                  hodlUsd: h.hodlUsd,
                  inRange: h.inRange,
                  price: h.price,
                  lo: h.lo,
                  hi: h.hi,
                }));
                // Kotwica HODL = pierwsza (najstarsza) próbka bota dla tego
                // tokenId — pole anchoredAt nie przychodzi w odpowiedzi API
                // (patrz TASKS-UI.md Partia 10 pkt 4), więc bierzemy ts
                // pierwszego snapshotu jako uczciwy podpis "od kiedy liczymy".
                const hodlSince = posHistory.length > 0 ? [...posHistory].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))[0].ts : null;

                return (
                  <div key={`${p.chainId}-${p.tokenId}`} className="cockpit-position-card">
                    <CockpitPositionActions position={p} actions={cockpitActions} onChanged={portfolio.refresh} bot={bot} ethUsd={portfolio.ethUsd} />
                    <div className="cockpit-position-card-header">
                      <span>
                        {/* status pozycji NAJPIERW (zarabia / nie zarabia), rada bota
                            jako drugi znaczek. ✅ IN_RANGE_HOLD pomijamy — 🟢 już to mówi. */}
                        <span title={positionStatusTitle(p.inRange)}>{positionStatusIcon(p.inRange)}</span> {p.poolLabel} · #{p.tokenId}
                        {p.advice && p.advice !== 'IN_RANGE_HOLD' && ADVICE_ICON[p.advice] && (
                          <span title={ADVICE_TITLE[p.advice] ?? p.advice}> {ADVICE_ICON[p.advice]}</span>
                        )}
                      </span>
                      <span className="muted">{p.valueUsd !== null ? fmtUsd(p.valueUsd) : '— (bez wyceny)'}</span>
                    </div>
                    {/* Licznik wypadnięcia dla REALNEJ pozycji (prośba Rafała 21.08).
                        Różnica wobec paper: bot NIE czeka tu 24h — propozycję
                        rebalansu wystawia od razu, gdy doradca uzna ją za opłacalną
                        (bot/observer.ts:544). Dlatego zamiast odliczania pokazujemy,
                        na co pozycja faktycznie czeka. */}
                    {!p.inRange && (() => {
                      const since = outOfRangeSinceFromHistory(rawPosHistory);
                      const waiting =
                        p.advice === 'REBALANCE'
                          ? 'bot proponuje rebalans (patrz „Propozycje")'
                          : p.advice === 'WAIT_NOT_PROFITABLE'
                            ? `rebalans na razie nieopłacalny${p.paybackDays != null ? ` (zwrot kosztu ~${p.paybackDays.toFixed(1)} dnia, próg 7)` : ''}`
                            : 'brak danych doradcy dla tej puli';
                      return (
                        <div className="out-of-range-timer">
                          <span className="out-of-range-elapsed">
                            Poza zakresem: {since ? `~${formatDuration(Date.now() - since)}` : 'świeżo'}
                          </span>
                          <span
                            className="muted"
                            title="Realne pozycje nie mają histerezy 24h jak paper-trading — bot wystawia propozycję rebalansu od razu, gdy koszt zwróci się z opłat w ≤7 dni. Czas liczony z próbek co ~15 min."
                          >
                            {' '}
                            · {waiting}
                          </span>
                        </div>
                      );
                    })()}
                    {/* Stary pasek zakresu (P1) tylko jako FALLBACK, dopóki
                        wykres cena-vs-pasmo nie ma danych — potem duplikat
                        (uwaga Rafała z odbioru P10: "nie powinien być wywalony?") */}
                    {posHistory.length < 2 && (
                      <div className={`range-bar ${p.inRange ? 'in-range' : 'out-of-range'} cockpit-range-bar`}>
                        <div className="range-bar-marker" style={{ left: `${pct}%` }} />
                      </div>
                    )}
                    {p.feesUsd > 0.001 && <div className="cockpit-position-fees muted">Nieodebrane fee: {fmtUsd(p.feesUsd)}</div>}

                    {posHistory.length >= 2 ? (
                      <>
                        <Sparkline points={posHistory} events={[]} />
                        {hodlSince && (
                          <div className="muted paper-range-caption">HODL liczony od {new Date(hodlSince).toLocaleDateString('pl-PL')}</div>
                        )}
                        <PriceRangeChart poolId={botPoolId} points={posHistory} events={[]} />
                      </>
                    ) : (
                      <div className="morning-note muted">za mało punktów historii pozycji jeszcze zebranych.</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <ExpandableSection title="📊 Paper trading" defaultExpanded={true}>
            <PaperTradingPanel bot={bot} />
          </ExpandableSection>

          {/* Wszystkie cztery sekcje mają teraz ten sam szkielet (telemetry-section
              z własnym nagłówkiem) — Ranking był wcześniej opakowany w
              ExpandableSection i przez to dostawał dodatkową belkę/ramkę. */}
          <BotTelemetry bot={bot} />
          <ForecastPanel bot={bot} />
          <ObservationAnalysis bot={bot} />
          <TopRankingPanel bot={bot} />
          <ClosedPositionsPanel bot={bot} />
      </div>

      {proposalModal?.type === 'close' && (
        <CloseModal
          position={proposalModal.position}
          busy={cockpitActions.busyKey === `${proposalModal.position.chainId}-${proposalModal.position.tokenId}-close`}
          status={cockpitActions.closeStatus[`${proposalModal.position.chainId}-${proposalModal.position.tokenId}`]}
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
      {rotateModal && (
        <RotateSequenceModal
          plan={rotateModal.plan}
          newPool={rotateModal.newPool}
          newTickLower={rotateModal.newTickLower}
          newTickUpper={rotateModal.newTickUpper}
          execution={rotateExecution}
          onClose={() => setRotateModal(null)}
          onDone={() => {
            portfolio.refresh();
            bot.dismissProposal(rotateModal.proposalId);
            setRotateModal(null);
          }}
        />
      )}
      {hedgeModal && (
        <HedgeConfirmModal
          plan={hedgeModal.plan}
          execution={hedgeExecution}
          onClose={() => setHedgeModal(null)}
          onDone={() => {
            if (hedgeModal.proposalId) bot.dismissProposal(hedgeModal.proposalId);
            setHedgeOpen(loadHedgeOpen());
            setHedgeModal(null);
          }}
        />
      )}
    </div>
  );
};

export default MorningCockpit;
