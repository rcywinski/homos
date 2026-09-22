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
// Default to the page ORIGIN — the UI is served from the same server as the
// API (homos-server :8787), so localhost as the default broke access from every
// device other than the server itself (Mac ~14:2x and iPhone ~15:4x on 19.08 —
// empty panels despite a saved token). localhost remains only for the
// dev server on :3000 (webpack-dev), where the origin has no API.
const DEFAULT_BASE =
  typeof window !== 'undefined' && window.location.origin.includes(':8787')
    ? window.location.origin
    : 'http://localhost:8787';
const POLL_MS = 60_000;
const STALE_MS = 5 * 60_000;
// Paper trading (bot/paper.ts, TASKS-UI.md Batch 5) — data changes every
// 15 min (observer.ts stats cycle), so a separate, SLOWER timer than
// /api/state (60s) — per the task: "no second /api/state poller".
const PAPER_POLL_MS = 5 * 60_000;
const PAPER_HOURS = 168; // 7 days
// Daily ranking (bot/selector.ts, TASKS-UI.md Batch 6) — file refreshed once
// a day (after 8:00) — INFREQUENT poll, clearly slower than paper/state.
const RANKING_POLL_MS = 30 * 60_000;
// History of REAL positions (bot/observer.ts refreshPositions, TASKS-UI.md
// Batch 10) — samples every ~5 min, same polling interval as paper.
const POSITIONS_HISTORY_POLL_MS = 5 * 60_000;
const POSITIONS_HISTORY_HOURS = 168; // 7 days, like paper
// Candidate validation verdicts (bot/candidates.ts, TASKS-UI.md Batch 12) —
// change once a day (nightly funnel) — INFREQUENT poll, separate state, we do
// NOT touch the existing pollers.
const CANDIDATES_POLL_MS = 60 * 60_000;
// Transaction ledger + closed positions (bot/ledger.ts, TASKS-LEDGER.md §3) —
// the observer pulls new events every cycle (~5 min), but from the user's
// perspective it changes rarely (next transaction / position close) —
// poll slower than paper/positions, faster than candidates (once a day),
// so a freshly closed position shows up without a manual page refresh.
const LEDGER_POLL_MS = 15 * 60_000;
const LEDGER_DAYS = 90;

export interface BotProposal {
  id: string;
  createdAt: string;
  tokenId: string; // '' for OPEN proposals from the selector (no existing position)
  poolId?: string; // BOT_POOLS id, '' when the pool is outside the bot's configuration
  /** REBALANCE (position advisor, as before) | OPEN/ROTATE (pool selection
   *  layer — bot/selector.ts, Batch 4) | EXIT_TREND (trend circuit breaker
   *  ALGORITHM.md §4 — "exit LP to cash 50/50" when price < EMA7d by 5%;
   *  HANDOFF Fable→Sonnet 2026-08-11). Missing field = treat as REBALANCE
   *  (backward compatibility with older entries in proposals.json). Cards in
   *  MorningCockpit.tsx render unknown `kind` values as a grey note instead
   *  of crashing, in case of further schema extensions.
   *  FLAT_NARROW/FLAT_WIDEN (Batch 16, FlatWide product): narrowing to k×σ in
   *  a CONFIRMED flat (`flatConfirmed` on state.pools[]) / return to the wide
   *  ±productIdleWidthPct after the flat ends — both concern a position
   *  already held (existing tokenId), same mechanism as REBALANCE
   *  (suggestedRange + the existing rebalance modal). */
  kind?: 'REBALANCE' | 'OPEN' | 'ROTATE' | 'EXIT_TREND' | 'HEDGE' | 'FLAT_NARROW' | 'FLAT_WIDEN';
  action: string;
  suggestedRange?: { tickLower?: number; tickUpper?: number; usdLo: number; usdHi: number };
  costUsd?: number;
  paybackDays?: number | null;
  // Batch 16b (emergency procedure, bot/observer.ts): DOWN on PRODUCT pools
  // emits TWO proposals at once (HEDGE = option A, preferred,
  // EXIT_TREND = option B "usually do NOT sign"), both flagged with this field.
  // Cards without `emergency` (or `false`/absent) render as before —
  // no visual changes. Procedure document: EMERGENCY.md.
  emergency?: boolean;
  // Selector fields (OPEN/ROTATE) — bot/selector.ts SelectorProposal:
  llamaPool?: string;
  symbol?: string;
  chain?: string; // label from DefiLlama ("Ethereum"/"Base"), not chainId
  apy7d?: number;
  heldApy7d?: number; // for ROTATE: 7d APY of the pool we are rotating out of
  breakEvenDays?: number; // for ROTATE: days to cover the transition cost
  // HEDGE (ALGORITHM.md v1.2 — hedge-excess for base-030, HANDOFF Fable→Sonnet
  // 2026-08-17 ~15:0x): the bot proposes a SHORT perp on Arbitrum/GMX instead of
  // exiting the LP. Manual execution (outside the app, via Rabby) — no auto-execute.
  hedgeSizeEth?: number;
  hedgeNotionalUsd?: number;
  note?: string;
  // bot/observer.ts uses 'open'/'dismissed'; state.json only ever contains
  // 'open' ones (server-side filtered) but we check defensively anyway.
  status: 'open' | 'dismissed' | string;
}

// Shape of state.pools / state.positions — duplicated from bot/observer.ts (PoolLive /
// WatchedPosition), that file is outside this UI session's edit scope. Used in
// MorningCockpit.tsx / BotTelemetry.tsx (TASKS-UI.md Batch 3, section "Bot telemetry").
export interface BotPoolLive {
  id: string;
  ethUsd: number;
  tick: number;
  sqrtPriceX96: string;
  stats: { volDaily: number; feeYieldDaily: number; swapsAnalyzed: number; hoursCovered: number } | null;
  suggestion: { tickLower: number; tickUpper: number; widthPct: number; priceLower: number; priceUpper: number } | null;
  updatedAt: string;
  // Flat detector (Batch 16, bot/observer.ts FLAT_ENTER/FLAT_EXIT) — only
  // product pools (BotPool.productIdleWidthPct set) have these fields
  // populated; the rest stay undefined (feature-detect, not a separate
  // "is this a product pool" list duplicated in the UI). `flatSince`: start of
  // the UNINTERRUPTED flat (ISO) or `null` when the pool is not in a flat now.
  // `flatConfirmed`: true only after the confirmation threshold (12h) — only
  // then does the bot actually propose FLAT_NARROW.
  flatSince?: string | null;
  flatConfirmed?: boolean;
  /** Batch 17: price gap vs EMA (%, signed value) — used for the CYCLE line
   *  on cards ("waiting for stabilization: |gap| X.X%" / "return to wide
   *  at |gap|>exitGap%, now X.X%"). Same number as emaGapPct in /api/history
   *  (ObservationAnalysis.tsx), here as "now", without needing a separate
   *  history fetch. Feature-detect like the rest of the flat detector fields. */
  trendGapPct?: number;
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
  /** bot ledger aggregates (BATCH 14 bot-side, 27.08): optional —
   *  older bot versions do not send them (feature-detect in the UI).
   *  0 = a valid zero for a fresh position; null = the ledger cannot value it. */
  collectedFeesUsd?: number | null;
  costsUsd?: number | null;
  rebalances?: number | null;
  /** FlatWide product cycle (Batch 17 bot-side): 'wide' = wide passive
   *  ±productIdleWidthPct% (idle), 'narrow' = narrowed k×σ (confirmed
   *  flat). `null`/absent = non-product pool (no cycle) —
   *  feature-detect, the card then does not render the CYCLE line at all. */
  posture?: 'wide' | 'narrow' | null;
}

// REAL hedge on GMX (Arbitrum) — read via the Reader every observer cycle,
// HANDOFF Fable→Sonnet 2026-08-20 late evening, TASKS-UI.md Batch 11
// (owner's note after the E2E test: the short existed only on app.gmx.io and in
// one browser's localStorage, it was not visible anywhere in the app).
// Shape verified directly against `interface HedgeLive` in bot/observer.ts.
// `null` = the bot confirms there is no position (Reader sees nothing) — distinct
// from `undefined`/absent field (older state.json from before this change, or
// state not yet loaded) — ONLY `null` is grounds for auto-clearing the
// localStorage fallback (see MorningCockpit.tsx).
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
  /** Batch 17: LIVE flat detector parameters (bot/config.ts FLAT, may change
   *  at the 1.09 review) — the UI MUST NOT hardcode 12h/2%/5%,
   *  read from here with feature-detect (fallback to those values ONLY when the
   *  field is entirely absent — old bot from before this batch). Units: enterGap/
   *  exitGap in percent (like trendGapPct), confirmH in hours. */
  flatParams?: { enterGap: number; exitGap: number; confirmH: number };
  /** Batch 18: TRANCHE balance (bot/observer.ts trancheLive, 29.08) — a second,
   *  independent measure next to the Batch 17 summary panel (that one measures
   *  strategy quality from position anchors; this one measures how much of the
   *  actually deposited USDC exists today, counting the wallet buffer and entry costs).
   *  EVERY field other than label/depositedUsd/startedAt may be `null` (failed
   *  balance read or missing price) — render "—", NEVER $0, and never compute
   *  sums in the UI yourself, the bot has already done that. */
  tranche?: {
    label: string;
    depositedUsd: number;
    startedAt: string;
    lpUsd: number;
    walletUsd: number | null;
    totalUsd: number | null;
    diffUsd: number | null;
    diffPct: number | null;
    marketPnlUsd: number | null;
    residualUsd: number | null;
    gasUsd: number | null;
    updatedAt: string;
  } | null;
}

export type BotStatus = 'loading' | 'online' | 'stale' | 'offline';

// Paper trading — GET /api/paper?hours=N (bot/paper.ts, HANDOFF Fable→CC-Mac
// 2026-08-18 ~11:3x, wired under TASKS-UI.md Batch 5). Virtual portfolio
// $10k/pool per ALGORITHM v1.2, zero real transactions.
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
  /** fees since the last collect/rebalance (bot/paper.ts:69) — reinvested
   *  at the next rebalance. Batch 10: `feesUsd - feesSinceRebalanceUsd`
   *  = already reinvested, `feesSinceRebalanceUsd` = accrued since then. */
  feesSinceRebalanceUsd: number;
  costsUsd: number;
  rebalances: number;
  hedge: PaperHedge | null;
  hedgePnlRealizedUsd: number;
  openedAt: string;
  startedAt: string;
  /** ms — the moment since which the position has been CONTINUOUSLY out of range
   *  (bot/paper.ts:72). Resets on every return into range, so the counter in
   *  the UI is a CONTINUOUS out-of-range counter, not a cumulative one. The field
   *  was always in the JSON from /api/paper (the server returns the whole
   *  paper-state.json), it was only missing from this type — added 21.08 for the UI counter. */
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
  // Since 20.08 (bot/paper.ts, TASKS-UI.md Batch 7) — price (human) and the
  // bot's range bounds (human), ONLY when status==='open' (no range in cash).
  // Older history samples (before 20.08) do NOT have these fields — the UI must
  // survive that (feature-detect via typeof, do not assume presence).
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

// 'not-started' == 503 from /api/paper (paper has not started on the server yet,
// e.g. a fresh bot restart before the first stats cycle) — distinct from
// 'error' (network/token/other error), so the panel shows the right message.
export type PaperStatus = 'loading' | 'ok' | 'not-started' | 'error';

// Daily ranking — GET /api/ranking (bot/selector.ts, HANDOFF Fable→Sonnet
// 2026-08-18, TASKS-UI.md Batch 6). TOP 10 pools per the ALGORITHM policy,
// written once a day to .bot/selector-ranking.json.
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
  // Additional fields of the WIDE ranking (GET /api/wide-ranking, Batch 21,
  // HANDOFF Fable→Sonnet 02.09) — absent in the old /api/ranking, hence
  // optional (feature-detect). NOTE: in the wide ranking `apy7d` (above)
  // carries SCORE %/yr, not 7d APY — the UI label must say so.
  cls?: string;
  feeAprWide?: number | null;
  dragPct?: number | null;
  sigmaAnnPct?: number | null;
  driftFlag?: boolean;
  wOursPct?: number;
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

// 'not-started' == 503 (the selector has not written the first ranking yet —
// expected until the first run after 8:00).
export type RankingStatus = 'loading' | 'ok' | 'not-started' | 'error';

// Wide-range daily model — GET /api/wide-daily (scripts/wide-daily.ts,
// HANDOFF Fable→Sonnet 02.09, TASKS-UI.md Batch 22). Key of the `pools` map =
// `RankingRow.llamaUuid`. `latest` = the window starting exactly N days
// ago ("from today backwards"); `med*`/`worstDeltaPct`/`winPct` = statistics from
// rolling windows every 30 days (n windows).
export interface WideDailyWindowLatest {
  lpPct: number;
  hodlPct: number;
  deltaPct: number;
  feesPct: number;
  inRangePct: number;
  recenters: number;
}

export interface WideDailyWindow {
  n: number;
  latest: WideDailyWindowLatest;
  medLpPct: number;
  medHodlPct: number;
  medDeltaPct: number;
  worstDeltaPct: number;
  winPct: number;
}

export interface WideDailyPool {
  symbol: string;
  chain: string;
  cls: string;
  widthPct: number;
  feeCapture: number;
  ageDays: number;
  error?: string;
  stale?: boolean;
  windows: { w365: WideDailyWindow | null; w720: WideDailyWindow | null };
  flatPct365: number;
  feeAprMean365: number;
}

export interface WideDailyData {
  generatedAt: string;
  params: Record<string, unknown>;
  pools: Record<string, WideDailyPool>;
}

// Full engine run (walkforward 720d, windows 30/15) — GET
// /api/wide-backtests (scripts/wide-collect.ts, funnel v2 tier 2). Only
// pools the collector has already fetched — a sparser map than wide-daily. Values
// in pp vs HODL per 30d window (as in Observation analysis/ObservationAnalysis).
export interface WideBacktestSummary {
  mean: number;
  med: number;
  winPct: number;
  worst: number;
  best: number;
  windows: number;
  recent90: { mean: number; windows?: number } | null;
  byRegime?: Record<string, unknown>;
}

export interface WideBacktestEntry {
  id: string;
  cls: string;
  widthPct: number;
  windows: number;
  passive: WideBacktestSummary | null;
  hybrid: WideBacktestSummary | null;
  computedAt: string;
}

export type WideBacktestsData = Record<string, WideBacktestEntry>;

// History of REAL positions — GET /api/positions-history?hours=N (bot/observer.ts
// refreshPositions, HANDOFF Fable→Sonnet 2026-08-20, TASKS-UI.md Batch 10:
// position card redesign after the paper pattern). Sample shape LIKE PaperHistoryPoint,
// but without `status` (a real position has no cash/pending state — it is "open"
// as long as the bot sees it) and with `tokenId` instead; price/lo/hi ALWAYS present
// (the observer writes them unconditionally, unlike paper, where lo/hi
// depend on status==='open'). The endpoint returns a plain JSON array (like
// /api/history), not {state,history,events} like /api/paper.
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

// 'not-started' is not expected here (the endpoint always returns [] when the file
// does not exist yet — 200, not 503) but kept for consistency with
// paper/ranking and in case of a future server change.
export type PositionsHistoryStatus = 'loading' | 'ok' | 'not-started' | 'error';

// Candidate validation verdicts — GET /api/candidates (bot/candidates.ts,
// HANDOFF Fable→Sonnet 24.08, TASKS-UI.md Batch 12). Shape 1:1 with
// `CandidateVerdict` in bot/candidates.ts (outside this UI session's edit scope).
// Matched to ranking rows by `llamaPool` (uuid) === `RankingRow.llamaUuid`.
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

// The endpoint always returns 200 + an array (seeded in code, never 503) — 'error'
// only on network/token. Verdicts are an enrichment of the ranking, not a critical
// dependency — missing data must NOT turn the table red.
export type CandidatesStatus = 'loading' | 'ok' | 'error';

// Transaction ledger + closed positions — GET /api/ledger?days=N and
// GET /api/closed-positions (bot/ledger.ts, TASKS-LEDGER.md §3, HANDOFF
// Fable→Sonnet 25.08). Shapes 1:1 with bot/ledger.ts (outside this UI session's
// edit scope, type read only) — EVERY numeric field may be `null`
// (missing metadata of a burned NFT or a leg not valued in USD) — render
// "—", NEVER 0 (0 is a real value, null is "we don't know").
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

// Both endpoints always return 200 (array, possibly empty — server.ts
// has no 503 for them like paper/ranking), so 'not-started' is not
// expected here, but kept for consistency (in case of a 404 before today's
// evening batch is deployed to the server — see HANDOFF: "graceful
// degradation, 404/error → a calm note, not an error").
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
  /** Message after an action on a proposal (e.g. a failed dismissal) — to be
   *  shown next to the proposal list; null when the last action was OK. */
  actionNotice: string | null;
  refresh: () => void;
  paper: PaperData | null;
  paperStatus: PaperStatus;
  ranking: RankingData | null;
  rankingStatus: RankingStatus;
  wideRanking: RankingData | null;
  wideRankingStatus: RankingStatus;
  wideDaily: WideDailyData | null;
  wideBacktests: WideBacktestsData | null;
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
  const [wideRanking, setWideRanking] = useState<RankingData | null>(null);
  const [wideRankingStatus, setWideRankingStatus] = useState<RankingStatus>('loading');
  // Wide-daily/wide-backtests (Batch 22) — an enrichment of the rankings, not a
  // critical dependency: missing/404/empty → null quietly, without a red
  // error (like candidates/verdicts).
  const [wideDaily, setWideDaily] = useState<WideDailyData | null>(null);
  const [wideBacktests, setWideBacktests] = useState<WideBacktestsData | null>(null);
  const [positionsHistory, setPositionsHistory] = useState<PositionHistoryPoint[] | null>(null);
  const [positionsHistoryStatus, setPositionsHistoryStatus] = useState<PositionsHistoryStatus>('loading');
  const [candidates, setCandidates] = useState<CandidateVerdict[] | null>(null);
  const [candidatesStatus, setCandidatesStatus] = useState<CandidatesStatus>('loading');
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[] | null>(null);
  const [closedPositionsStatus, setClosedPositionsStatus] = useState<LedgerStatus>('loading');
  const [ledger, setLedger] = useState<LedgerEntry[] | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus>('loading');
  // Dismissals applied optimistically on the UI side (fix 26.08: the server
  // only QUEUES the command, the observer applies it within ≤30 s, and the state
  // poll runs every 60 s — without this the proposal hung around for ~90 s after
  // the click and the button looked broken). The entry lives until the proposal
  // disappears from the fetched state (then reconciliation clears it).
  // Fix 26.08(2) — owner's report "they come back after refresh": the list is
  // additionally kept in localStorage with a 15 min TTL, so it survives a page
  // reload in the window before the observer applies the command (the server
  // also filters the /api/state view by the command queue — belt and braces).
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
      /* localStorage unavailable — the in-memory version remains */
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
        setError(res.status === 401 ? 'Invalid access token' : `HTTP ${res.status}`);
        return;
      }
      const data: BotStateShape = await res.json();
      setState(data);
      // reconciliation of optimistic dismissals: once the observer has applied
      // the command, the proposal disappears from the state — the local entry
      // is no longer needed (and does not grow without bound).
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
      setError('No connection to the bot server');
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
        // paper has not started on the server yet (fresh restart, before the first stats cycle)
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
      // network unavailable — as with /api/state, quietly (bot offline in dev is often the norm)
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
        // the selector has not written the first ranking yet (before the first run after 8:00)
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
      // network unavailable — as with /api/state/paper, quietly
      setRanking(null);
      setRankingStatus('error');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchRanking();
    const id = setInterval(fetchRanking, RANKING_POLL_MS);
    return () => clearInterval(id);
  }, [fetchRanking, tick]);

  // WIDE ranking — GET /api/wide-ranking (scripts/wide-score.ts, funnel v2
  // tier 1, HANDOFF Fable→Sonnet 02.09, TASKS-UI.md Batch 21). Same
  // shape as /api/ranking (RankingData) — poller and statuses 1:1.
  const fetchWideRanking = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/wide-ranking`, { headers });
      if (res.status === 503) {
        // wide-score has not written the first ranking yet (before the first nightly run after deploy)
        setWideRanking(null);
        setWideRankingStatus('not-started');
        return;
      }
      if (!res.ok) {
        setWideRanking(null);
        setWideRankingStatus('error');
        return;
      }
      const data: RankingData = await res.json();
      setWideRanking(data);
      setWideRankingStatus('ok');
    } catch {
      // network unavailable — as with the other pollers, quietly
      setWideRanking(null);
      setWideRankingStatus('error');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchWideRanking();
    const id = setInterval(fetchWideRanking, RANKING_POLL_MS);
    return () => clearInterval(id);
  }, [fetchWideRanking, tick]);

  // Daily model (wide-daily) + full run (wide-backtests) — Batch 22,
  // HANDOFF Fable→Sonnet 02.09. Same poller as the ranking (30 min); missing/404/
  // empty → null quietly (an enrichment of the ranking tables, not a dependency).
  const fetchWideDaily = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/wide-daily`, { headers });
      if (!res.ok) {
        setWideDaily(null);
        return;
      }
      const data: WideDailyData = await res.json();
      setWideDaily(data);
    } catch {
      setWideDaily(null);
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchWideDaily();
    const id = setInterval(fetchWideDaily, RANKING_POLL_MS);
    return () => clearInterval(id);
  }, [fetchWideDaily, tick]);

  const fetchWideBacktests = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/wide-backtests`, { headers });
      if (!res.ok) {
        setWideBacktests(null);
        return;
      }
      const data: WideBacktestsData = await res.json();
      setWideBacktests(data);
    } catch {
      setWideBacktests(null);
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchWideBacktests();
    const id = setInterval(fetchWideBacktests, RANKING_POLL_MS);
    return () => clearInterval(id);
  }, [fetchWideBacktests, tick]);

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
      // network unavailable — as with /api/state/paper, quietly
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
      // network unavailable — as with /api/state/paper, quietly (verdicts are
      // an enrichment, not a critical dependency — TopRankingPanel simply
      // will not show the badges)
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
        // server not yet running today's batch (TASKS-LEDGER.md) —
        // a calm state, not an error (HANDOFF: "graceful degradation")
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
          // Fix 26.08: until now the error was SWALLOWED (empty catch) and the button
          // "did nothing" without a trace. 401 = invalid token, 404 = the proposal no
          // longer exists on the bot side (e.g. expired) — we show it explicitly.
          setActionNotice(
            res.status === 401
              ? 'Dismissal rejected: invalid access token (API settings).'
              : res.status === 404
                ? 'This proposal no longer exists on the bot side — refreshing state.'
                : `Dismissal rejected: HTTP ${res.status}.`
          );
          refresh();
          return;
        }
        // Success = command QUEUED (the observer applies it within ≤30 s) —
        // we hide the proposal immediately so the button visibly works.
        setActionNotice(null);
        setLocallyDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
      } catch {
        setActionNotice('Dismissal did not reach the server (network/API address) — try again.');
      }
      refresh();
    },
    [apiBase, apiToken, refresh]
  );

  const setApiBase = useCallback((v: string) => {
    // Normalization: no trailing slashes (base+'/api/...' would give
    // '//api/...' → 404 in Express; iOS Safari likes to append '/'),
    // spaces out, no scheme → prepend http:// (LAN without TLS).
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

  // State visible to the UI: optimistically dismissed proposals are hidden
  // immediately (the observer removes them from the state within ≤30 s anyway — see dismissProposal).
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
    wideRanking,
    wideRankingStatus,
    wideDaily,
    wideBacktests,
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
