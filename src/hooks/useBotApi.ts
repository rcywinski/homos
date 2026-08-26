/**
 * useBotApi.ts — connects the UI to bot/server.ts (the observer API running
 * on the Windows server — see INFRA.md). Not on the same origin as the UI
 * dev server, so the address+token are user-configurable and persisted in
 * localStorage (`homos_api_base` / `homos_api_token`) — see TASKS-UI.md #1.
 *
 * Deliberately quiet on the common "bot offline" case (dev on Mac with no
 * server running, or server unreachable): failures land in `status`/`error`
 * for the UI to render, not in the console.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

const BASE_KEY = 'homos_api_base';
const TOKEN_KEY = 'homos_api_token';
// Domyślnie ORIGIN strony — UI jest serwowane z tego samego serwera co API
// (homos-server :8787), więc localhost jako default psuł dostęp z każdego
// urządzenia poza samym serwerem (Mac ~14:2x i iPhone ~15:4x 19.08 —
// puste panele mimo zapisanego tokena). localhost zostaje tylko dla
// dev-serwera na :3000 (webpack-dev), gdzie origin nie ma API.
const DEFAULT_BASE =
  typeof window !== 'undefined' && window.location.origin.includes(':8787')
    ? window.location.origin
    : 'http://localhost:8787';
const POLL_MS = 60_000;
const STALE_MS = 5 * 60_000;
// Paper trading (bot/paper.ts, TASKS-UI.md Partia 5) — dane zmieniają się co
// 15 min (cykl statystyk observer.ts), więc osobny, WOLNIEJSZY timer niż
// /api/state (60s) — zgodnie z zadaniem "żadnego drugiego pollera /api/state".
const PAPER_POLL_MS = 5 * 60_000;
const PAPER_HOURS = 168; // 7 dni
// Ranking dnia (bot/selector.ts, TASKS-UI.md Partia 6) — plik odświeżany raz
// dziennie (po 8:00) — poll RZADKI, wyraźnie wolniejszy niż paper/state.
const RANKING_POLL_MS = 30 * 60_000;
// Historia REALNYCH pozycji (bot/observer.ts refreshPositions, TASKS-UI.md
// Partia 10) — próbki co ~5 min, ten sam interwał pollingu co paper.
const POSITIONS_HISTORY_POLL_MS = 5 * 60_000;
const POSITIONS_HISTORY_HOURS = 168; // 7 dni, jak paper
// Werdykty walidacji kandydatów (bot/candidates.ts, TASKS-UI.md Partia 12) —
// zmieniają się raz na dobę (nocny lejek) — poll RZADKI, osobny stan, NIE
// ruszamy istniejących pollerów.
const CANDIDATES_POLL_MS = 60 * 60_000;
// Księga transakcji + zamknięte pozycje (bot/ledger.ts, TASKS-LEDGER.md §3) —
// observer dociąga nowe zdarzenia co cykl (~5 min), ale z perspektywy
// użytkownika zmienia się rzadko (kolejna transakcja/zamknięcie pozycji) —
// poll wolniejszy niż paper/positions, szybszy niż candidates (raz na dobę),
// żeby świeżo zamknięta pozycja pojawiła się bez ręcznego odświeżania strony.
const LEDGER_POLL_MS = 15 * 60_000;
const LEDGER_DAYS = 90;

export interface BotProposal {
  id: string;
  createdAt: string;
  tokenId: string; // '' dla propozycji OPEN z selektora (brak istniejącej pozycji)
  poolId?: string; // BOT_POOLS id, '' gdy pula spoza konfiguracji bota
  /** REBALANCE (doradca pozycji, jak dotychczas) | OPEN/ROTATE (warstwa
   *  selekcji pul — bot/selector.ts, Partia 4) | EXIT_TREND (bezpiecznik trendu
   *  ALGORITHM.md §4 — "wyjdź z LP do cash 50/50" gdy cena < EMA7d o 5%;
   *  HANDOFF Fable→Sonnet 2026-08-11). Brak pola = traktuj jak REBALANCE
   *  (kompatybilność wstecz ze starszymi wpisami w proposals.json). Karty w
   *  MorningCockpit.tsx renderują nieznane wartości `kind` jako szarą notę,
   *  zamiast crashować, na wypadek kolejnych rozszerzeń schematu. */
  kind?: 'REBALANCE' | 'OPEN' | 'ROTATE' | 'EXIT_TREND' | 'HEDGE';
  action: string;
  suggestedRange?: { tickLower?: number; tickUpper?: number; usdLo: number; usdHi: number };
  costUsd?: number;
  paybackDays?: number | null;
  // Pola selektora (OPEN/ROTATE) — bot/selector.ts SelectorProposal:
  llamaPool?: string;
  symbol?: string;
  chain?: string; // etykieta z DefiLlama ("Ethereum"/"Base"), nie chainId
  apy7d?: number;
  heldApy7d?: number; // przy ROTATE: 7d APY puli, którą rotujemy
  breakEvenDays?: number; // przy ROTATE: dni do pokrycia kosztu przejścia
  // HEDGE (ALGORITHM.md v1.2 — hedge-excess dla base-030, HANDOFF Fable→Sonnet
  // 2026-08-17 ~15:0x): bot proponuje SHORT perp na Arbitrum/GMX zamiast wyjścia
  // z LP. Wykonanie ręczne (poza appką, przez Rabby) — brak auto-execute.
  hedgeSizeEth?: number;
  hedgeNotionalUsd?: number;
  note?: string;
  // bot/observer.ts uses 'open'/'dismissed'; state.json only ever contains
  // 'open' ones (server-side filtered) but we check defensively anyway.
  status: 'open' | 'dismissed' | string;
}

// Kształt state.pools / state.positions — powielony z bot/observer.ts (PoolLive /
// WatchedPosition), ten plik jest poza zakresem edycji tej sesji UI. Używane w
// MorningCockpit.tsx / BotTelemetry.tsx (TASKS-UI.md Partia 3, sekcja "Telemetria bota").
export interface BotPoolLive {
  id: string;
  ethUsd: number;
  tick: number;
  sqrtPriceX96: string;
  stats: { volDaily: number; feeYieldDaily: number; swapsAnalyzed: number; hoursCovered: number } | null;
  suggestion: { tickLower: number; tickUpper: number; widthPct: number; priceLower: number; priceUpper: number } | null;
  updatedAt: string;
}

export interface BotWatchedPosition {
  tokenId: string;
  poolId: string;
  tickLower: number;
  tickUpper: number;
  amount0: number;
  amount1: number;
  valueUsd: number;
  inRange: boolean;
  advice: string;
  paybackDays: number | null;
}

// Hedge REALNY na GMX (Arbitrum) — odczyt Readerem co cykl observera,
// HANDOFF Fable→Sonnet 2026-08-20 późny wieczór, TASKS-UI.md Partia 11
// (uwaga Rafała po teście E2E: short istniał tylko na app.gmx.io i w
// localStorage jednej przeglądarki, nie było go widać nigdzie w apce).
// Kształt zweryfikowany wprost wobec `interface HedgeLive` w bot/observer.ts.
// `null` = bot potwierdza brak pozycji (Reader nie widzi nic) — odróżnione
// od `undefined`/pola nieobecnego (starszy state.json sprzed tej zmiany, albo
// jeszcze niewczytany stan) — TYLKO `null` jest podstawą do auto-czyszczenia
// fallbacku localStorage (patrz MorningCockpit.tsx).
export interface BotHedgeLive {
  isLong: boolean;
  sizeUsd: number;
  sizeEth: number;
  collateralUsd: number;
  entryPriceUsd: number;
  pnlUsd: number;
  equityUsd: number;
  updatedAt: string;
}

export interface BotStateShape {
  updatedAt: string;
  mode?: string;
  watch?: string;
  pools?: BotPoolLive[];
  positions?: BotWatchedPosition[];
  proposals?: BotProposal[];
  hedge?: BotHedgeLive | null;
}

export type BotStatus = 'loading' | 'online' | 'stale' | 'offline';

// Paper trading — GET /api/paper?hours=N (bot/paper.ts, HANDOFF Fable→CC-Mac
// 2026-08-18 ~11:3x, wpięte pod TASKS-UI.md Partia 5). Wirtualny portfel
// $10k/pula wg ALGORITHM v1.2, zero prawdziwych transakcji.
export interface PaperHedge {
  sizeBase: number;
  entryUsd: number;
  fundingUsd: number;
}

export interface PaperPosition {
  poolId: string;
  status: 'open' | 'cash' | 'pending' | string;
  tickLower: number;
  tickUpper: number;
  capitalUsd: number;
  feesUsd: number;
  /** fees od ostatniego collect/rebalansu (bot/paper.ts:69) — reinwestowane
   *  przy najbliższym rebalansie. Partia 10: `feesUsd - feesSinceRebalanceUsd`
   *  = już reinwestowane, `feesSinceRebalanceUsd` = narosłe od tamtej pory. */
  feesSinceRebalanceUsd: number;
  costsUsd: number;
  rebalances: number;
  hedge: PaperHedge | null;
  hedgePnlRealizedUsd: number;
  openedAt: string;
  startedAt: string;
  /** ms — moment, od którego pozycja jest NIEPRZERWANIE poza zakresem
   *  (bot/paper.ts:72). Zeruje się przy każdym powrocie do zakresu, więc
   *  licznik w UI jest licznikiem CIĄGŁEGO wypadnięcia, nie sumy. Pole było
   *  zawsze w JSON z /api/paper (serwer oddaje cały paper-state.json),
   *  brakowało go tylko w tym typie — dodane 21.08 pod licznik w UI. */
  outOfRangeSince?: number | null;
}

export interface PaperStateShape {
  startedAt: string;
  capitalPerPoolUsd: number;
  updatedAt: string;
  positions: Record<string, PaperPosition>;
}

export interface PaperHistoryPoint {
  ts: string;
  poolId: string;
  status: string;
  equityUsd: number;
  hodlUsd: number;
  feesUsd: number;
  costsUsd: number;
  inRange: boolean;
  trendDown: boolean;
  rebalances: number;
  // Od 20.08 (bot/paper.ts, TASKS-UI.md Partia 7) — cena (human) i granice
  // zakresu bota (human), TYLKO gdy status==='open' (w cash zakresu nie ma).
  // Starsze próbki z historii (sprzed 20.08) tych pól NIE mają — UI musi to
  // przeżyć (feature-detect po typeof, nie zakładać obecności).
  price?: number;
  lo?: number;
  hi?: number;
}

export interface PaperEvent {
  ts: string;
  poolId: string;
  kind: 'OPEN' | 'REBALANCE' | 'EXIT_TREND' | 'REENTRY' | 'HEDGE_OPEN' | 'HEDGE_CLOSE' | string;
  [key: string]: unknown;
}

export interface PaperData {
  state: PaperStateShape;
  history: PaperHistoryPoint[];
  events: PaperEvent[];
}

// 'not-started' == 503 z /api/paper (paper jeszcze nie ruszył na serwerze,
// np. świeży restart bota przed pierwszym cyklem statystyk) — odróżnione od
// 'error' (sieć/token/inny błąd), żeby panel pokazał właściwy komunikat.
export type PaperStatus = 'loading' | 'ok' | 'not-started' | 'error';

// Ranking dnia — GET /api/ranking (bot/selector.ts, HANDOFF Fable→Sonnet
// 2026-08-18, TASKS-UI.md Partia 6). TOP 10 pul wg polityki ALGORITHM,
// zapisywane raz dziennie do .bot/selector-ranking.json.
export interface RankingRow {
  rank: number;
  symbol: string;
  chain: string;
  poolMeta: string;
  apy7d: number;
  streak: number;
  eligible: boolean;
  tvlUsd: number;
  botPoolId: string | null;
  llamaUuid?: string;
}

export interface RankingCriteria {
  window?: string;
  persistDays?: number;
  minTvlUsd?: number;
  filter?: string;
  [key: string]: unknown;
}

export interface RankingData {
  day: string;
  generatedAt: string;
  criteria: RankingCriteria;
  rows: RankingRow[];
}

// 'not-started' == 503 (selektor jeszcze nie zapisał pierwszego rankingu —
// oczekiwane do pierwszego przebiegu po 8:00).
export type RankingStatus = 'loading' | 'ok' | 'not-started' | 'error';

// Historia REALNYCH pozycji — GET /api/positions-history?hours=N (bot/observer.ts
// refreshPositions, HANDOFF Fable→Sonnet 2026-08-20, TASKS-UI.md Partia 10:
// redesign kart pozycji wg wzorca paper). Kształt próbki JAK PaperHistoryPoint,
// ale bez `status` (realna pozycja nie ma stanu cash/pending — jest "otwarta"
// dopóki bot ją widzi) i z `tokenId` zamiast tego; price/lo/hi ZAWSZE obecne
// (obserwator pisze je bezwarunkowo, w odróżnieniu od paper, gdzie lo/hi
// zależą od status==='open'). Endpoint zwraca zwykłą tablicę JSON (jak
// /api/history), nie {state,history,events} jak /api/paper.
export interface PositionHistoryPoint {
  ts: string;
  tokenId: string;
  poolId: string;
  valueUsd: number;
  hodlUsd: number;
  inRange: boolean;
  price?: number;
  lo?: number;
  hi?: number;
}

// 'not-started' nie jest tu spodziewane (endpoint zawsze zwraca [] gdy plik
// jeszcze nie istnieje — 200, nie 503) ale trzymane dla spójności z
// paper/ranking i na wypadek przyszłej zmiany serwera.
export type PositionsHistoryStatus = 'loading' | 'ok' | 'not-started' | 'error';

// Werdykty walidacji kandydatów — GET /api/candidates (bot/candidates.ts,
// HANDOFF Fable→Sonnet 24.08, TASKS-UI.md Partia 12). Kształt 1:1 z
// `CandidateVerdict` w bot/candidates.ts (poza zakresem edycji tej sesji UI).
// Dopasowanie do wierszy rankingu po `llamaPool` (uuid) === `RankingRow.llamaUuid`.
export interface CandidateVerdict {
  llamaPool: string;
  chain: string;
  symbol: string;
  feeTier: string;
  verdict: 'PASS' | 'FAIL' | 'QUEUED' | 'UNMAPPED';
  winPct?: number;
  worst?: number;
  testedAt?: string;
  note?: string;
}

// Endpoint zawsze zwraca 200 + tablicę (seed w kodzie, nigdy 503) — 'error'
// tylko na sieć/token. Werdykty to wzbogacenie rankingu, nie zależność
// krytyczna — brak danych NIE ma prawa czerwienić tabeli.
export type CandidatesStatus = 'loading' | 'ok' | 'error';

// Księga transakcji + zamknięte pozycje — GET /api/ledger?days=N i
// GET /api/closed-positions (bot/ledger.ts, TASKS-LEDGER.md §3, HANDOFF
// Fable→Sonnet 25.08). Kształty 1:1 z bot/ledger.ts (poza zakresem edycji
// tej sesji UI, tylko odczyt typu) — KAŻDE pole liczbowe może być `null`
// (brak metadanych spalonego NFT albo noga niewyceniana w USD) — renderować
// "—", NIGDY 0 (0 to realna wartość, null to "nie wiemy").
export type LedgerKind = 'MINT' | 'INCREASE' | 'DECREASE' | 'COLLECT' | 'BURN' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface LedgerEntry {
  ts: string;
  chain: string;
  chainId: number;
  block: number;
  txHash: string;
  logIndex: number;
  tokenId: string;
  kind: LedgerKind;
  amount0: string;
  amount1: string;
  a0h: number | null;
  a1h: number | null;
  sym0: string;
  sym1: string;
  usd: number | null;
}

export interface ClosedPosition {
  chain: string;
  tokenId: string;
  sym0: string;
  sym1: string;
  openedAt: string | null;
  closedAt: string | null;
  in0: number | null;
  in1: number | null;
  out0: number | null;
  out1: number | null;
  fees0: number | null;
  fees1: number | null;
  inUsd: number | null;
  outUsd: number | null;
  feesUsdApprox: number | null;
  txCount: number;
}

// Oba endpointy zawsze zwracają 200 (array, ewentualnie pusty — server.ts
// nie ma dla nich 503 jak paper/ranking), więc 'not-started' nie jest tu
// spodziewane, ale trzymane dla spójności (na wypadek 404 przed wdrożeniem
// dzisiejszej wieczornej paczki na serwer — patrz HANDOFF: "degradacja
// łagodna, 404/błąd → spokojna notka, nie error").
export type LedgerStatus = 'loading' | 'ok' | 'not-started' | 'error';

export interface UseBotApi {
  state: BotStateShape | null;
  status: BotStatus;
  error: string | null;
  apiBase: string;
  apiToken: string;
  setApiBase: (v: string) => void;
  setApiToken: (v: string) => void;
  dismissProposal: (id: string) => Promise<void>;
  /** Komunikat po akcji na propozycji (np. nieudane odrzucenie) — do
   *  pokazania przy liście propozycji; null gdy ostatnia akcja OK. */
  actionNotice: string | null;
  refresh: () => void;
  paper: PaperData | null;
  paperStatus: PaperStatus;
  ranking: RankingData | null;
  rankingStatus: RankingStatus;
  positionsHistory: PositionHistoryPoint[] | null;
  positionsHistoryStatus: PositionsHistoryStatus;
  candidates: CandidateVerdict[] | null;
  candidatesStatus: CandidatesStatus;
  closedPositions: ClosedPosition[] | null;
  closedPositionsStatus: LedgerStatus;
  ledger: LedgerEntry[] | null;
  ledgerStatus: LedgerStatus;
}

const readLocal = (key: string, fallback: string): string => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export function useBotApi(): UseBotApi {
  const [apiBase, setApiBaseState] = useState(() => readLocal(BASE_KEY, DEFAULT_BASE));
  const [apiToken, setApiTokenState] = useState(() => readLocal(TOKEN_KEY, ''));
  const [state, setState] = useState<BotStateShape | null>(null);
  const [status, setStatus] = useState<BotStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [paperStatus, setPaperStatus] = useState<PaperStatus>('loading');
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [rankingStatus, setRankingStatus] = useState<RankingStatus>('loading');
  const [positionsHistory, setPositionsHistory] = useState<PositionHistoryPoint[] | null>(null);
  const [positionsHistoryStatus, setPositionsHistoryStatus] = useState<PositionsHistoryStatus>('loading');
  const [candidates, setCandidates] = useState<CandidateVerdict[] | null>(null);
  const [candidatesStatus, setCandidatesStatus] = useState<CandidatesStatus>('loading');
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[] | null>(null);
  const [closedPositionsStatus, setClosedPositionsStatus] = useState<LedgerStatus>('loading');
  const [ledger, setLedger] = useState<LedgerEntry[] | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus>('loading');
  // Odrzucenia zastosowane optymistycznie po stronie UI (fix 26.08: server
  // tylko KOLEJKUJE komendę, observer aplikuje ją w ≤30 s, a poll stanu idzie
  // co 60 s — bez tego propozycja wisiała do ~90 s po kliknięciu i przycisk
  // wyglądał na zepsuty). Wpis żyje, dopóki propozycja nie zniknie z
  // fetchowanego stanu (wtedy reconciliation ją czyści).
  // Fix 26.08(2) — zgłoszenie Rafała "po odświeżeniu wracają": lista jest
  // dodatkowo trzymana w localStorage z TTL 15 min, żeby przeżyła reload
  // strony w oknie zanim observer zastosuje komendę (server też filtruje
  // widok /api/state o kolejkę komend — to pas i szelki).
  const DISMISSED_LS_KEY = 'homos.dismissedProposals';
  const DISMISSED_TTL_MS = 15 * 60 * 1000;
  const [locallyDismissed, setLocallyDismissed] = useState<string[]>(() => {
    try {
      const raw: Array<{ id: string; ts: number }> = JSON.parse(localStorage.getItem(DISMISSED_LS_KEY) ?? '[]');
      return raw.filter((e) => Date.now() - e.ts < DISMISSED_TTL_MS).map((e) => e.id);
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_LS_KEY, JSON.stringify(locallyDismissed.map((id) => ({ id, ts: Date.now() }))));
    } catch {
      /* localStorage niedostępny — zostaje wersja in-memory */
    }
  }, [locallyDismissed]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const fetchState = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/state`, { headers });
      if (!res.ok) {
        setState(null);
        setStatus('offline');
        setError(res.status === 401 ? 'Zły token dostępu' : `HTTP ${res.status}`);
        return;
      }
      const data: BotStateShape = await res.json();
      setState(data);
      // reconciliation optymistycznych odrzuceń: gdy observer zastosował
      // komendę, propozycja znika ze stanu — wpis lokalny przestaje być
      // potrzebny (i nie rośnie w nieskończoność).
      setLocallyDismissed((prev) =>
        prev.length ? prev.filter((id) => (data.proposals ?? []).some((p) => p.id === id)) : prev
      );
      setError(null);
      const fresh = data.updatedAt && Date.now() - new Date(data.updatedAt).getTime() < STALE_MS;
      setStatus(fresh ? 'online' : 'stale');
    } catch {
      // network error (server down, wrong address, CORS) — expected in dev without a bot running
      setState(null);
      setStatus('offline');
      setError('Brak połączenia z serwerem bota');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, POLL_MS);
    return () => clearInterval(id);
  }, [fetchState, tick]);

  const fetchPaper = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/paper?hours=${PAPER_HOURS}`, { headers });
      if (res.status === 503) {
        // paper jeszcze nie ruszył na serwerze (świeży restart, przed pierwszym cyklem statystyk)
        setPaper(null);
        setPaperStatus('not-started');
        return;
      }
      if (!res.ok) {
        setPaper(null);
        setPaperStatus('error');
        return;
      }
      const data: PaperData = await res.json();
      setPaper(data);
      setPaperStatus('ok');
    } catch {
      // sieć niedostępna — jak przy /api/state, cicho (bot offline w dev bywa normą)
      setPaper(null);
      setPaperStatus('error');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchPaper();
    const id = setInterval(fetchPaper, PAPER_POLL_MS);
    return () => clearInterval(id);
  }, [fetchPaper, tick]);

  const fetchRanking = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/ranking`, { headers });
      if (res.status === 503) {
        // selektor jeszcze nie zapisał pierwszego rankingu (przed pierwszym przebiegiem po 8:00)
        setRanking(null);
        setRankingStatus('not-started');
        return;
      }
      if (!res.ok) {
        setRanking(null);
        setRankingStatus('error');
        return;
      }
      const data: RankingData = await res.json();
      setRanking(data);
      setRankingStatus('ok');
    } catch {
      // sieć niedostępna — jak przy /api/state/paper, cicho
      setRanking(null);
      setRankingStatus('error');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchRanking();
    const id = setInterval(fetchRanking, RANKING_POLL_MS);
    return () => clearInterval(id);
  }, [fetchRanking, tick]);

  const fetchPositionsHistory = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/positions-history?hours=${POSITIONS_HISTORY_HOURS}`, { headers });
      if (res.status === 503) {
        setPositionsHistory(null);
        setPositionsHistoryStatus('not-started');
        return;
      }
      if (!res.ok) {
        setPositionsHistory(null);
        setPositionsHistoryStatus('error');
        return;
      }
      const data: PositionHistoryPoint[] = await res.json();
      setPositionsHistory(data);
      setPositionsHistoryStatus('ok');
    } catch {
      // sieć niedostępna — jak przy /api/state/paper, cicho
      setPositionsHistory(null);
      setPositionsHistoryStatus('error');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchPositionsHistory();
    const id = setInterval(fetchPositionsHistory, POSITIONS_HISTORY_POLL_MS);
    return () => clearInterval(id);
  }, [fetchPositionsHistory, tick]);

  const fetchCandidates = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/candidates`, { headers });
      if (!res.ok) {
        setCandidates(null);
        setCandidatesStatus('error');
        return;
      }
      const data: CandidateVerdict[] = await res.json();
      setCandidates(data);
      setCandidatesStatus('ok');
    } catch {
      // sieć niedostępna — jak przy /api/state/paper, cicho (werdykty to
      // wzbogacenie, nie zależność krytyczna — TopRankingPanel po prostu
      // nie pokaże badge'y)
      setCandidates(null);
      setCandidatesStatus('error');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchCandidates();
    const id = setInterval(fetchCandidates, CANDIDATES_POLL_MS);
    return () => clearInterval(id);
  }, [fetchCandidates, tick]);

  const fetchClosedPositions = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/closed-positions`, { headers });
      if (res.status === 404) {
        // serwer jeszcze bez wdrożenia dzisiejszej paczki (TASKS-LEDGER.md) —
        // spokojny stan, nie error (HANDOFF: "degradacja łagodna")
        setClosedPositions(null);
        setClosedPositionsStatus('not-started');
        return;
      }
      if (!res.ok) {
        setClosedPositions(null);
        setClosedPositionsStatus('error');
        return;
      }
      const data: ClosedPosition[] = await res.json();
      setClosedPositions(data);
      setClosedPositionsStatus('ok');
    } catch {
      setClosedPositions(null);
      setClosedPositionsStatus('error');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchClosedPositions();
    const id = setInterval(fetchClosedPositions, LEDGER_POLL_MS);
    return () => clearInterval(id);
  }, [fetchClosedPositions, tick]);

  const fetchLedger = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/ledger?days=${LEDGER_DAYS}`, { headers });
      if (res.status === 404) {
        setLedger(null);
        setLedgerStatus('not-started');
        return;
      }
      if (!res.ok) {
        setLedger(null);
        setLedgerStatus('error');
        return;
      }
      const data: { days: number; count: number; entries: LedgerEntry[] } = await res.json();
      setLedger(data.entries);
      setLedgerStatus('ok');
    } catch {
      setLedger(null);
      setLedgerStatus('error');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchLedger();
    const id = setInterval(fetchLedger, LEDGER_POLL_MS);
    return () => clearInterval(id);
  }, [fetchLedger, tick]);

  const dismissProposal = useCallback(
    async (id: string) => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
        const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/proposals/${id}/dismiss`, {
          method: 'POST',
          headers,
        });
        if (!res.ok) {
          // Fix 26.08: dotąd błąd był POŁYKANY (catch bez treści) i przycisk
          // "nic nie robił" bez śladu. 401 = zły token, 404 = propozycja już
          // nie istnieje po stronie bota (np. wygasła) — pokazujemy wprost.
          setActionNotice(
            res.status === 401
              ? 'Odrzucenie nieprzyjęte: zły token dostępu (ustawienia API).'
              : res.status === 404
                ? 'Ta propozycja już nie istnieje po stronie bota — odświeżam stan.'
                : `Odrzucenie nieprzyjęte: HTTP ${res.status}.`
          );
          refresh();
          return;
        }
        // Sukces = komenda ZAKOLEJKOWANA (observer aplikuje w ≤30 s) —
        // ukrywamy propozycję od razu, żeby przycisk działał "na oko".
        setActionNotice(null);
        setLocallyDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
      } catch {
        setActionNotice('Odrzucenie nie doszło do serwera (sieć/adres API) — spróbuj ponownie.');
      }
      refresh();
    },
    [apiBase, apiToken, refresh]
  );

  const setApiBase = useCallback((v: string) => {
    // Normalizacja: bez końcowych ukośników (baza+'/api/...' dawałaby
    // '//api/...' → 404 w Expressie; iOS Safari lubi doklejać '/'),
    // spacje out, brak schematu → doklej http:// (LAN bez TLS).
    let norm = v.trim().replace(/\/+$/, '');
    if (norm && !/^https?:\/\//i.test(norm)) norm = `http://${norm}`;
    try {
      localStorage.setItem(BASE_KEY, norm);
    } catch {
      /* localStorage unavailable — keep in-memory only */
    }
    setApiBaseState(norm);
  }, []);

  const setApiToken = useCallback((v: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, v);
    } catch {
      /* localStorage unavailable — keep in-memory only */
    }
    setApiTokenState(v);
  }, []);

  // Stan widoczny dla UI: propozycje odrzucone optymistycznie są ukryte od
  // razu (observer i tak zdejmie je ze stanu w ≤30 s — patrz dismissProposal).
  const visibleState = useMemo<BotStateShape | null>(() => {
    if (!state || !locallyDismissed.length) return state;
    return { ...state, proposals: (state.proposals ?? []).filter((p) => !locallyDismissed.includes(p.id)) };
  }, [state, locallyDismissed]);

  return {
    state: visibleState,
    status,
    error,
    apiBase,
    apiToken,
    setApiBase,
    setApiToken,
    dismissProposal,
    actionNotice,
    refresh,
    paper,
    paperStatus,
    ranking,
    rankingStatus,
    positionsHistory,
    positionsHistoryStatus,
    candidates,
    candidatesStatus,
    closedPositions,
    closedPositionsStatus,
    ledger,
    ledgerStatus,
  };
}
