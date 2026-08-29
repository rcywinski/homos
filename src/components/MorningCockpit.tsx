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
import { UseBotApi, BotProposal, BotPoolLive } from '../hooks/useBotApi';
import { findBotPoolByAddress } from '../config/botPools';
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
import CockpitPositionActions, { CloseModal, RebalanceModal } from './CockpitPositionActions';
import { Sparkline, PriceRangeChart, EquityChartPoint, PositionStatsBar, fmtQuoteForPool } from './PositionCharts';
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

// Partia 17: fallback gdy state bota nie ma jeszcze `flatParams` (stary bot
// sprzed paczki bot-side "cykl w state", 28.08 wieczór) — te same wartości co
// bot/config.ts FLAT na dziś. Feature-detect: użyte TYLKO gdy pole całkiem
// nieobecne, nigdy nie nadpisuje żywych danych z /api/state.
// UWAGA jednostki: enterGap/exitGap to UŁAMKI (0.02 = 2%), tak jak surowe
// bot/config.ts FLAT — zweryfikowane wprost w bot/observer.ts (saveState:
// `flatParams: FLAT`, bez przeliczenia). confirmH w godzinach.
const DEFAULT_FLAT_PARAMS = { enterGap: 0.02, exitGap: 0.05, confirmH: 12 };

/**
 * Linia CYKLU (Partia 17, TASKS-UI.md) na karcie pozycji produktowej —
 * `posture` przychodzi z bot.state.positions[].posture (feature-detect:
 * `null`/nieobecne = pula nie-produktowa, funkcja wtedy nic nie renderuje).
 */
function renderCycleLine(
  posture: 'wide' | 'narrow' | null | undefined,
  poolLive: BotPoolLive | undefined,
  widthPct: number | undefined,
  flatParams: { enterGap: number; exitGap: number; confirmH: number },
  now: number
): React.ReactNode {
  if (posture !== 'wide' && posture !== 'narrow') return null;
  const enterPct = flatParams.enterGap * 100;
  const exitPct = flatParams.exitGap * 100;
  const gapAbs = typeof poolLive?.trendGapPct === 'number' ? Math.abs(poolLive.trendGapPct) : null;
  const gapLabel = gapAbs !== null ? gapAbs.toFixed(1) : '—';

  if (posture === 'narrow') {
    return (
      <div className="cockpit-cycle-line muted">
        Cykl: WĄSKI k×σ (flat) · powrót do szerokiego przy |gap|&gt;{exitPct.toFixed(0)}% (teraz {gapLabel}%)
      </div>
    );
  }

  // posture === 'wide'
  const widthLabel = typeof widthPct === 'number' ? `±${widthPct}%` : '';
  let statusNode: React.ReactNode;
  if (poolLive?.flatConfirmed) {
    statusNode = <span className="cockpit-cycle-confirmed">✅ flat potwierdzony — propozycja zwężenia w kokpicie</span>;
  } else if (poolLive?.flatSince) {
    const flatSinceMs = Date.parse(poolLive.flatSince);
    const remainingMs = flatParams.confirmH * 3600e3 - (now - flatSinceMs);
    const sinceLabel = isFinite(flatSinceMs) ? new Date(flatSinceMs).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—';
    statusNode = (
      <span>
        stabilizacja od {sinceLabel} — do propozycji zwężenia ~{remainingMs > 0 ? formatDuration(remainingMs) : 'lada moment'} (przy utrzymaniu |gap|&lt;{enterPct.toFixed(0)}%)
      </span>
    );
  } else {
    statusNode = (
      <span>
        czekam na stabilizację: |gap| {gapLabel}% (próg {enterPct.toFixed(0)}%)
      </span>
    );
  }
  return (
    <div className="cockpit-cycle-line muted">
      Cykl: SZEROKI {widthLabel} (idle) · {statusNode}
    </div>
  );
}

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
  | {
      type: 'open';
      target: RebalanceTarget;
      title: string;
      initialUsdRange?: { usdLo: number; usdHi: number };
      /** Partia 16: nadpisuje domyślne ostrzeżenie "to NIE jest produktowe
       *  ±40/50%" (Partia 13b, CockpitPositionActions.tsx) tekstem neutralnym
       *  dla FLAT_NARROW — wąski prefill tam jest ZAMIERZONY (zwężenie do
       *  k×σ w potwierdzonym flacie), nie objawem starej/zepsutej propozycji. */
      narrowRangeNote?: string;
    };

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
  // Partia 17: countdown "do propozycji zwężenia" na linii CYKLU musi się
  // odświeżać bez odczytu z serwera (odliczanie czasu, nie danych) — osobny
  // mały tick co minutę, nie ruszając pollerów bota. Hook nad wczesnym
  // returnem (patrz FIX 20.08 wyżej — Rendered more hooks).
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  // REBALANCE/FLAT_NARROW/FLAT_WIDEN "Modyfikuj →": prefill z pozycji już
  // trzymanej przez usera — ten sam mechanizm (istniejąca pozycja + zakres z
  // propozycji), różni się tylko tytułem modala i (dla NARROW) ostrzeżeniem
  // o wąskim zakresie (Partia 16 pkt 2).
  const openModifyRebalance = (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos) {
      setProposalError(`Pozycja #${p.tokenId} nie znaleziona w portfelu (może już zamknięta) — odśwież.`);
      return;
    }
    setProposalError(null);
    const title =
      p.kind === 'FLAT_NARROW'
        ? `Zwężenie (flat) #${p.tokenId}`
        : p.kind === 'FLAT_WIDEN'
          ? `Rozszerzenie (koniec flatu) #${p.tokenId}`
          : `Modyfikuj rebalans #${p.tokenId}`;
    setProposalModal({
      type: 'open',
      target: pos,
      title,
      initialUsdRange: p.suggestedRange,
      narrowRangeNote: p.kind === 'FLAT_NARROW' ? 'zwężenie produktowe (flat)' : undefined,
    });
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

  // Partia 16b: DOWN na pulach produktowych emituje DWIE propozycje naraz
  // (HEDGE = opcja A preferowana, EXIT_TREND = opcja B "zwykle NIE
  // podpisuj"), obie oznaczone `emergency: true` — wyciągnięte z listy
  // zwykłych propozycji do osobnej sekcji "Procedura awaryjna", grupowane
  // per tokenId (ta sama pozycja produktowa), A zawsze przed B w grupie.
  const emergencyProposals = pendingProposals.filter((p) => p.emergency);
  const nonEmergencyProposals = pendingProposals.filter((p) => !p.emergency);
  const emergencyGroups: BotProposal[][] = (() => {
    const byKey = new Map<string, BotProposal[]>();
    for (const p of emergencyProposals) {
      const key = p.tokenId || p.id; // tokenId puste tylko w teorii (emergency dotyczy zawsze trzymanej pozycji)
      const arr = byKey.get(key) ?? [];
      arr.push(p);
      byKey.set(key, arr);
    }
    return Array.from(byKey.values()).map((arr) => [...arr].sort((a, b) => (a.kind === 'HEDGE' ? 0 : 1) - (b.kind === 'HEDGE' ? 0 : 1)));
  })();

  // Partia 15 (punkty 1+3): usePortfolio nie umie wycenić par bez nogi
  // stable/ETH (np. cbBTC/WETH — patrz "Valuation note" w usePortfolio.ts,
  // świadomie NIE ruszana w tej sesji, logika liczenia zostaje). Bot LICZY tę
  // wycenę przez kurs referencyjny (BOT_POOLS.usdRefPoolId) i wystawia ją w
  // /api/state.positions[].valueUsd — już wczytane w useBotApi.ts, zero
  // nowych requestów. Mapa tokenId→valueUsd bota, reużywana niżej zarówno w
  // nagłówku sumy jak i na kartach pozycji (fallback tylko gdy usePortfolio
  // ma `null` — bot NIGDY nie nadpisuje realnej wyceny usePortfolio, gdy ta
  // istnieje).
  const botValueByTokenId = new Map<string, number>((bot.state?.positions ?? []).map((bp) => [bp.tokenId, bp.valueUsd]));
  const botFallbackUsd = portfolio.positions.reduce((sum, p) => {
    if (p.valueUsd !== null) return sum;
    const v = botValueByTokenId.get(p.tokenId);
    return typeof v === 'number' ? sum + v : sum;
  }, 0);
  const adjustedTotalUsd = portfolio.totalUsd + botFallbackUsd;
  // Punkt 3: nota "*" (i pominięcie z sumy) zostaje TYLKO dla pozycji, których
  // nie ma ani w wycenie usePortfolio, ani w state bota — nie dla każdej
  // pozycji bez nogi stable/ETH jak dotąd (cbBTC/WETH ma teraz wycenę bota).
  const stillUnknownValue = portfolio.positions.some((p) => p.valueUsd === null && !botValueByTokenId.has(p.tokenId));

  // Partia 17 pkt 1: panel zbiorczy REALNYCH pozycji, lustrzany do nagłówka
  // "Paper trading" (.paper-total-header, PaperTradingPanel.tsx) — Σ po tych
  // samych źródłach co pasek metryk każdej karty (Partia 14/15, poniżej w
  // .map()): "teraz" = p.valueUsd ?? wycena bota ?? equityUsd ostatniej próbki
  // positions-history; kotwica PnL = hodlUsd PIERWSZEJ próbki per pozycja;
  // baza vs HODL = hodlUsd OSTATNIEJ próbki per pozycja. Tylko pozycje z
  // policzalną wartością i historią wchodzą do sum (spójne z "—" na
  // pojedynczej karcie, gdy brak danych — tu po prostu pomijane z sum, nie ma
  // jak zrobić "—" na sumie częściowej). Zero nowych requestów — te same
  // dane co bot.positionsHistory/bot.state.positions wczytane już wyżej.
  let totalEquityUsd = 0;
  let totalStartUsd = 0;
  let totalPnlUsd = 0;
  let totalVsHodlUsd = 0;
  let oldestAnchorTs: string | null = null;
  for (const pos of portfolio.positions) {
    const rawHist = (bot.positionsHistory ?? []).filter((h) => h.tokenId === pos.tokenId);
    if (rawHist.length === 0) continue;
    const sorted = [...rawHist].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const botLive = botValueByTokenId.get(pos.tokenId);
    const nowUsd = pos.valueUsd ?? botLive ?? last.valueUsd ?? null;
    if (nowUsd === null) continue;
    totalEquityUsd += nowUsd;
    totalStartUsd += first.hodlUsd;
    totalPnlUsd += nowUsd - first.hodlUsd;
    totalVsHodlUsd += nowUsd - last.hodlUsd;
    if (!oldestAnchorTs || Date.parse(first.ts) < Date.parse(oldestAnchorTs)) oldestAnchorTs = first.ts;
  }
  const totalPnlPct = totalStartUsd > 0 ? (totalPnlUsd / totalStartUsd) * 100 : 0;
  const hasRealPositionStats = portfolio.positions.length > 0 && oldestAnchorTs !== null;

  // Partia 16/16b: jedna karta propozycji, wyekstrahowana z inline JSX do
  // funkcji, żeby renderować TĘ SAMĄ logikę per-kind zarówno w zwykłej
  // liście "Propozycje bota", jak i w sekcji "Procedura awaryjna" (16b pkt 3
  // — grupowanie A/B obok siebie), bez duplikowania ~150 linii JSX. Domyka
  // się nad wszystkimi handlerami zdefiniowanymi wyżej w komponencie
  // (openApproveSequence itd.) — bez zmiany ich sygnatur.
  const renderProposalCard = (p: BotProposal) => {
    const kind = p.kind ?? 'REBALANCE';
    // Punkt 2 (Partia 16b): nagłówek "OPCJA AWARYJNA A/B" tylko na kartach z
    // emergency===true — rozróżnienie A(hedge)/B(exit) po kind. Karty bez
    // `emergency` (wszystkie pozostałe kind, i HEDGE/EXIT_TREND spoza
    // procedury awaryjnej) — bez zmian.
    const emergencyLabel = p.emergency ? (kind === 'HEDGE' ? 'A (hedge — preferowana)' : kind === 'EXIT_TREND' ? 'B (exit — zwykle NIE podpisuj)' : null) : null;
    return (
      <div key={p.id} className={`morning-proposal-card morning-proposal-card--stacked${p.emergency ? ' morning-proposal-card--emergency' : ''}`}>
        {emergencyLabel && (
          <>
            <div className="morning-proposal-line morning-emergency-heading">🚨 OPCJA AWARYJNA {emergencyLabel}</div>
            <div className="muted morning-emergency-note">Hybryda świadomie trzyma betę — zobacz EMERGENCY.md zanim podpiszesz.</div>
          </>
        )}
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
            <div className="morning-proposal-line">⛔ Bezpiecznik trendu: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}</div>
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
            <div className="morning-proposal-line">🛡 Hedge: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}</div>
            {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
            {(typeof p.hedgeSizeEth === 'number' || typeof p.hedgeNotionalUsd === 'number') && (
              <div className="morning-proposal-line morning-hedge-size">
                SHORT{typeof p.hedgeSizeEth === 'number' && <> ~{p.hedgeSizeEth.toFixed(2)} ETH</>}
                {typeof p.hedgeNotionalUsd === 'number' && <> ≈ ${p.hedgeNotionalUsd.toLocaleString()}</>}
              </div>
            )}
            {/* Partia 9: [Zatwierdź hedge] wysyła zlecenie z tej appki (multicall
                ExchangeRoutera GMX, 1 podpis) — link GMX zostaje jako fallback
                ręczny (HANDOFF Fable→Sonnet 2026-08-17 ~15:0x, rozszerzone 20.08).
                Punkt 4 (Partia 16b): brak `hedgeSizeEth` = noga cbBTC (rynek
                BTC/USD, nie ETH) — bot nie ma dla niej auto-execute (multicall
                w useHedgeExecution.ts liczy tylko ETH), więc ZAMIAST przycisku
                [Zatwierdź hedge] tylko link + nota "ręcznie". */}
            {typeof p.hedgeSizeEth === 'number' ? (
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
            ) : (
              <>
                <div className="morning-note">Brak automatycznego wykonania dla tej nogi (rynek BTC/USD, nie ETH) — otwórz i rozmiaruj ręcznie na GMX.</div>
                <div className="morning-proposal-actions">
                  <a className="action-button primary" href="https://app.gmx.io/#/trade/?market=BTC-USD" target="_blank" rel="noreferrer">
                    Otwórz GMX (BTC/USD) ↗
                  </a>
                  <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                    Odrzuć
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {kind === 'FLAT_NARROW' && (
          <>
            <div className="morning-proposal-line">
              🎯 FLAT — zwężenie: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}
              {p.suggestedRange && (
                <>
                  {' '}
                  → {fmtQuoteForPool(p.poolId ?? '', p.suggestedRange.usdLo)}–{fmtQuoteForPool(p.poolId ?? '', p.suggestedRange.usdHi)}
                </>
              )}
              {typeof p.costUsd === 'number' && <> · koszt ${p.costUsd.toFixed(2)}</>}
              {typeof p.paybackDays === 'number' && <> · payback ~{p.paybackDays.toFixed(1)} dni</>}
            </div>
            {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
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

        {kind === 'FLAT_WIDEN' && (
          <>
            <div className="morning-proposal-line">
              ⚠️ koniec flatu — rozszerzenie: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}
              {p.suggestedRange && (
                <>
                  {' '}
                  → {fmtQuoteForPool(p.poolId ?? '', p.suggestedRange.usdLo)}–{fmtQuoteForPool(p.poolId ?? '', p.suggestedRange.usdHi)}
                </>
              )}
              {typeof p.costUsd === 'number' && <> · koszt ${p.costUsd.toFixed(2)}</>}
            </div>
            {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
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

        {!['REBALANCE', 'OPEN', 'ROTATE', 'EXIT_TREND', 'HEDGE', 'FLAT_NARROW', 'FLAT_WIDEN'].includes(kind) && (
          <>
            {/* Nieznany kind (np. przyszłe rozszerzenie schematu bota) — pokaż
                jako szarą notę zamiast crashować albo renderować pustą kartę. */}
            <div className="morning-note">
              Nieznany typ propozycji ({kind}): {p.action}
            </div>
            <div className="morning-proposal-actions">
              <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                Odrzuć
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

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
              <span className="morning-stat-value">{portfolio.loading ? '…' : fmtUsd(adjustedTotalUsd)}</span>
              <span className="morning-stat-label">Wartość łączna{stillUnknownValue ? '*' : ''}</span>
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

          {stillUnknownValue && (
            <div className="morning-note">
              * pomija pozycje bez wyceny — ani nogi stabilnej/ETH (usePortfolio), ani danych bota (/api/state) — brak wiarygodnej wyceny USD
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

          {/* Partia 16b pkt 3: sekcja "Procedura awaryjna" NAD zwykłymi
              propozycjami — pary A(hedge)/B(exit) tej samej pozycji obok
              siebie, żeby Rafał widział obie opcje naraz zamiast przewijać
              wymieszaną listę. Puste (brak DOWN na pulach produktowych) —
              sekcja w ogóle się nie renderuje. */}
          {emergencyGroups.length > 0 && (
            <>
              <div className="morning-section-title">🚨 Procedura awaryjna</div>
              <div className="morning-emergency-groups">
                {emergencyGroups.map((group, i) => (
                  <div key={i} className="morning-emergency-group">
                    {group.map((p) => renderProposalCard(p))}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="morning-section-title">Propozycje bota</div>
          {bot.actionNotice && <div className="morning-bot-offline">⚠️ {bot.actionNotice}</div>}
          {bot.status === 'offline' ? (
            <div className="morning-bot-offline">
              Bot offline — uruchom usługę homos-bot na serwerze (⚙ żeby ustawić adres/token).
            </div>
          ) : nonEmergencyProposals.length > 0 ? (
            <div className="morning-proposals">{nonEmergencyProposals.map((p) => renderProposalCard(p))}</div>
          ) : (
            <div className="morning-note">Brak aktywnych propozycji.</div>
          )}
          {proposalError && <div className="morning-note morning-error">{proposalError}</div>}
          {bot.status === 'stale' && <div className="morning-note">⚠ dane bota nieaktualne (starsze niż 5 min)</div>}

          <div className="morning-section-title">Pozycje — akcje</div>

          {/* Partia 18: pasek BILANS TRANSZY, NAD panelem zbiorczym Partii 17
              (decyzja Rafała 29.08 — sekcja OSOBNA, panel Partii 17 zostaje
              BEZ ZMIAN poza dopiskiem/tooltipem niżej). Mierzy INNĄ rzecz niż
              panel Partii 17: ile z faktycznie wpłaconych USDC dziś jest
              (zawiera bufor w portfelu + jednorazowe koszty wejścia), a nie
              tylko jakość LP od kotwic pozycji. Bot-side już liczy wszystko —
              UI tylko wyświetla `bot.state.tranche`, zero własnej matematyki.
              `walletUsd`/`totalUsd`/`diffUsd`/`diffPct` bywają `null` (nieudany
              odczyt sald lub brak kursu) — wtedy „—", NIGDY $0. */}
          {bot.state?.tranche && (
            <>
              <div className="tranche-bar">
                <div className="tranche-bar-stat">
                  <span className="tranche-bar-value">{fmtUsd(bot.state.tranche.depositedUsd)}</span>
                  <span className="muted">
                    Wpłacone ({new Date(bot.state.tranche.startedAt).toLocaleDateString('pl-PL')})
                  </span>
                </div>
                <div className="tranche-bar-stat">
                  <span className="tranche-bar-value">{bot.state.tranche.totalUsd === null ? '—' : fmtUsd(bot.state.tranche.totalUsd)}</span>
                  <span className="muted">Dziś łącznie</span>
                </div>
                <div className="tranche-bar-stat">
                  <span
                    className={`tranche-bar-value ${
                      bot.state.tranche.diffUsd === null ? '' : bot.state.tranche.diffUsd < 0 ? 'forecast-negative' : 'paper-positive'
                    }`}
                  >
                    {bot.state.tranche.diffUsd === null || bot.state.tranche.diffPct === null
                      ? '—'
                      : `${fmtSigned(bot.state.tranche.diffUsd)} (${bot.state.tranche.diffPct >= 0 ? '+' : ''}${bot.state.tranche.diffPct.toFixed(1)}%)`}
                  </span>
                  <span className="muted">Różnica</span>
                </div>
              </div>
              <div className="muted tranche-breakdown">
                w pozycjach {fmtUsd(bot.state.tranche.lpUsd)} + w portfelu {bot.state.tranche.walletUsd === null ? '—' : fmtUsd(bot.state.tranche.walletUsd)}
                {bot.state.tranche.marketPnlUsd !== null && bot.state.tranche.residualUsd !== null && (
                  <>
                    {' '}
                    · z tego ruch rynku {fmtSigned(bot.state.tranche.marketPnlUsd)} · reszta (koszty wejścia + beta bufora){' '}
                    <span
                      title="jednorazowe koszty wejścia — swapy, poślizg, gaz mintów — plus zmiana wartości bufora w portfelu. Powinna być mniej więcej stała; jeśli rośnie, zgłoś to Fable."
                    >
                      {fmtSigned(bot.state.tranche.residualUsd)}
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {/* Partia 17 pkt 1: panel zbiorczy nad kartami — lustrzany do
              .paper-total-header (PaperTradingPanel.tsx), te same klasy CSS.
              Tylko gdy jest przynajmniej jedna pozycja z policzalną historią
              (inaczej sumy byłyby myląco puste — "brak pozycji" komunikat
              niżej to już mówi). */}
          {hasRealPositionStats && (
            <div className="paper-total-header">
              <div className="paper-total-stat">
                <span className="paper-total-value">{fmtUsd(totalEquityUsd)}</span>
                <span className="muted">Equity łącznie</span>
              </div>
              <div className="paper-total-stat">
                <span
                  className={`paper-total-value ${totalPnlUsd < 0 ? 'forecast-negative' : 'paper-positive'}`}
                  title="Liczone od kotwic pozycji, bez bufora i kosztów wejścia — pełny rachunek transzy jest w pasku wyżej."
                >
                  {fmtSigned(totalPnlUsd)} ({totalPnlPct >= 0 ? '+' : ''}
                  {totalPnlPct.toFixed(1)}%)
                </span>
                <span
                  className="muted"
                  title="Liczone od kotwic pozycji, bez bufora i kosztów wejścia — pełny rachunek transzy jest w pasku wyżej."
                >
                  PnL od startu{oldestAnchorTs ? ` (od ${new Date(oldestAnchorTs).toLocaleDateString('pl-PL')})` : ''}
                </span>
              </div>
              <div className="paper-total-stat">
                <span className={`paper-total-value ${totalVsHodlUsd < 0 ? 'forecast-negative' : 'paper-positive'}`}>{fmtSigned(totalVsHodlUsd)}</span>
                <span className="muted">vs HODL 50/50</span>
              </div>
            </div>
          )}

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
                const posHistorySorted = posHistory.length > 0 ? [...posHistory].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)) : [];
                const firstPosHistPoint = posHistorySorted[0] ?? null;
                const lastPosHistPoint = posHistorySorted.length > 0 ? posHistorySorted[posHistorySorted.length - 1] : null;
                const hodlSince = firstPosHistPoint?.ts ?? null;
                // Punkt 1 (Partia 15): fallback wyceny karty na dane bota, gdy
                // usePortfolio nie potrafi wycenić pozycji w USD (brak nogi
                // stable/ETH — np. cbBTC/WETH). Bot liczy USD przez kurs
                // referencyjny, niezależnie od tego ograniczenia UI.
                const botLivePos = botValueByTokenId.get(p.tokenId);
                const cardValueUsd = p.valueUsd ?? botLivePos ?? null;
                const isBotValuation = p.valueUsd === null && botLivePos !== undefined;
                // Partia 14/15 (punkt 2): PnL od startu = wartość teraz −
                // wartość z kotwicy (hodlUsd zapisany w PIERWSZEJ próbce — w
                // tamtym momencie anchor został DOPIERO co zamrożony, więc
                // hodlUsd tej próbki = a0*px0+a1*px1 policzone przy anchoredAt
                // = rzeczywista startowa wartość pozycji, patrz
                // bot/observer.ts:626-632). vs HODL 50/50 = wartość teraz −
                // hodlUsd ostatniej próbki (benchmark "gdybyś trzymał te same
                // tokeny bez LP"). "Wartość teraz" = p.valueUsd, a dla pozycji
                // bez wyceny usePortfolio (punkt 2, Partia 15) — equityUsd
                // OSTATNIEJ próbki positions-history (to samo pole co
                // bot.state.positions[].valueUsd, ta sama liczba z observera,
                // tylko z próbki zamiast z live state — obie już w USD, bez
                // dodatkowych requestów). Oba `null`, gdy naprawdę brak
                // jakiejkolwiek wyceny/historii — pasek renderuje wtedy "—".
                const nowValueUsdForStats = p.valueUsd ?? lastPosHistPoint?.equityUsd ?? null;
                const pnlSinceStartUsd = nowValueUsdForStats !== null && firstPosHistPoint ? nowValueUsdForStats - firstPosHistPoint.hodlUsd : null;
                const vsHodlUsd = nowValueUsdForStats !== null && lastPosHistPoint ? nowValueUsdForStats - lastPosHistPoint.hodlUsd : null;

                // Partia 17 pkt 2: linia CYKLU — posture z bot.state.positions
                // (feature-detect: null/nieobecne = pula nie-produktowa, karta
                // nic nie renderuje), reszta (flatSince/flatConfirmed/
                // trendGapPct) z bot.state.pools po id puli (dopasowanie przez
                // adres — botPoolId z historii bywa pusty dla świeżych pozycji
                // bez próbek jeszcze). flatParams z korzenia state (parametry
                // ŻYWE detektora — NIE hardkodować 12h/2%/5%, patrz DEFAULT_FLAT_PARAMS).
                const botMeta = findBotPoolByAddress(p.chainId, p.poolAddress);
                const bpForCycle = (bot.state?.positions ?? []).find((x) => x.tokenId === p.tokenId);
                const poolLiveForCycle = botMeta ? bot.state?.pools?.find((pl) => pl.id === botMeta.id) : undefined;
                const flatParams = bot.state?.flatParams ?? DEFAULT_FLAT_PARAMS;

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
                      <span className="muted">
                        {cardValueUsd !== null ? fmtUsd(cardValueUsd) : '— (bez wyceny)'}
                        {isBotValuation && (
                          <span
                            title="usePortfolio nie ma bezpośredniej ścieżki wyceny dla tej pary (brak nogi stabilnej/ETH) — liczba pochodzi z bota, który liczy USD przez kurs referencyjny (BOT_POOLS.usdRefPoolId). Odświeżanie ≤5 min."
                          >
                            {' '}
                            (wycena bota)
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Partia 17 pkt 2: linia CYKLU — TYLKO pozycje produktowe
                        (posture !== null). */}
                    {renderCycleLine(bpForCycle?.posture, poolLiveForCycle, botMeta?.productIdleWidthPct, flatParams, nowTick)}
                    {/* Partia 17 pkt 3: badge POZA ZAKRESEM — zdarzenie rzadkie i
                        ważne w produkcie FlatWide (postura SZEROKA to ±40/50%,
                        przebicie pasma jest realnym sygnałem), więc widoczne od
                        progu, osobno od licznika czasu poniżej. Kierunek z
                        porównania price vs lo/hi OSTATNIEJ próbki historii —
                        "poza pasmem" gdy tych pól jeszcze brak (świeża pozycja). */}
                    {!p.inRange && (
                      <div className="cockpit-outofrange-badge">
                        ⚠️ POZA ZAKRESEM — cena{' '}
                        {lastPosHistPoint && typeof lastPosHistPoint.price === 'number' && typeof lastPosHistPoint.lo === 'number' && typeof lastPosHistPoint.hi === 'number'
                          ? lastPosHistPoint.price < lastPosHistPoint.lo
                            ? 'poniżej pasma'
                            : lastPosHistPoint.price > lastPosHistPoint.hi
                              ? 'powyżej pasma'
                              : 'poza pasmem'
                          : 'poza pasmem'}
                      </div>
                    )}
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
                    {/* Partia 14: pasek metryk jak w paper (PositionStatsBar,
                        PositionCharts.tsx) — "Fee narosłe" tu ZASTĘPUJE starą
                        osobną linię "Nieodebrane fee" (przeniesione do paska,
                        zgodnie ze spec). Fee reinwestowane/Koszty/Rebalanse:
                        feature-detect z bot.state.positions (agregaty księgi,
                        bot-side Partii 14, 27.08 — Fable) — pole nieobecne
                        (stary bot) albo null (księga nie umie wycenić) = "—";
                        0 to POPRAWNE zero świeżej pozycji, nie "—". */}
                    {(() => {
                      const bp = bpForCycle; // Partia 17: reużyte wyszukanie (wyżej, ta sama pozycja)
                      return (
                        <PositionStatsBar
                          pnlUsd={pnlSinceStartUsd}
                          pnlSinceLabel={hodlSince ? new Date(hodlSince).toLocaleDateString('pl-PL') : undefined}
                          vsHodlUsd={vsHodlUsd}
                          feesReinvestedUsd={bp?.collectedFeesUsd ?? null}
                          feesAccruedUsd={p.feesUsd}
                          costsUsd={bp?.costsUsd ?? null}
                          rebalances={bp?.rebalances ?? null}
                        />
                      );
                    })()}

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

          {/* Sekcje mają ten sam szkielet (telemetry-section z własnym
              nagłówkiem) — Ranking był wcześniej opakowany w
              ExpandableSection i przez to dostawał dodatkową belkę/ramkę.
              „Prognoza zysku" (ForecastPanel) USUNIĘTA 29.08: forecast.json
              opisywał strategie v1.2 (k=3 + rebalans/exit), którymi po
              przejściu na hybrydę FlatWide nie gramy, liczone na σ swapowej
              odrzuconej 26.08 i nieodświeżane od 17.08 (generator nie był
              w pipelinie). Historia w gicie — wróci dopiero jako prognoza
              PRODUKTU (EV zwężania z flatwindows), jeśli przegląd tak
              zdecyduje. */}
          <BotTelemetry bot={bot} />
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
          narrowRangeNote={proposalModal.narrowRangeNote}
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
