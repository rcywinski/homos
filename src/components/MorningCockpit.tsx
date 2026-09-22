/**
 * MorningCockpit.tsx — MAIN VIEW of the application (UI-VISION.md §3.1,
 * UX-COCKPIT.md §1, TASKS-UI.md Batches 2/3).
 *
 * 21.08: after removing the "Manage (advanced)" section the cockpit is no longer
 * one of the modules — it IS the whole application. That is why it stopped being
 * collapsible (no title or arrow, the content always renders). The module header
 * kept the bot status dot + ⚙ (API address/token) — the dot is
 * admittedly a duplicate of the one in App.tsx, but it is precisely this one that is read as
 * "the server connection is alive", because it sits next to the connection settings.
 *
 * Contents: financial header (usePortfolio), bot proposals (useBotApi),
 * position cards with inline actions (CockpitPositionActions.tsx +
 * useCockpitActions.ts), paper trading and four collapsible sections at the bottom
 * (Telemetry / Forecast / Analysis / Ranking). Plain CSS — see styles.css,
 * classes with the morning-, cockpit- and telemetry- prefixes.
 */
import React, { FC, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Pool } from '@uniswap/v3-sdk';
import { usePortfolio, PortfolioPosition } from '../hooks/usePortfolio';
import { UseBotApi, BotProposal } from '../hooks/useBotApi';
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
import { renderCycleLine, DEFAULT_FLAT_PARAMS } from './cycleLine';
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
  REBALANCE: 'The bot proposes a rebalance (the cost pays back from fees)',
  WAIT_NOT_PROFITABLE: 'Out of range, but a rebalance is not worth it for now — waiting',
};

/** State icon of a REAL position — the same language as in paper trading
 *  (owner's request 21.08: this section had no status at all, and a position
 *  out of range looked identical to a healthy one).
 *  A real position has no 'cash'/'pending' state — the bot either sees it or not. */
const positionStatusIcon = (inRange: boolean): string => (inRange ? '🟢' : '⚠️');
const positionStatusTitle = (inRange: boolean): string =>
  inRange ? 'In range — the position is earning' : 'OUT of range — the position accrues no fees';

// BATCH 20 item 2: renderCycleLine + DEFAULT_FLAT_PARAMS extracted to
// components/cycleLine.tsx (BotTelemetry.tsx needs the same logic for the
// "Advisor" column of product pools — zero duplication of flatParams units).

/**
 * Since when the position has been CONTINUOUSLY out of range — computed from
 * history samples (every ~15 min), because for REAL positions the bot keeps no
 * `outOfRangeSince` marker (that field exists only in paper trading).
 * We walk from the newest sample backwards as long as `inRange === false`; we return
 * the ts of the first sample of that run. The result is inherently approximate to 15 minutes
 * and will NOT detect a fall-out shorter than the interval between samples.
 */
function outOfRangeSinceFromHistory(points: Array<{ ts: string; inRange: boolean }>): number | null {
  const sorted = [...points].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)); // newest first
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

// Proposal cards from the bot (Batch 4) may open two different modals
// that have existed since Batch 3 (CockpitPositionActions.tsx), only prefilled
// with proposal data instead of position card data:
//  - 'close' — the "Close position" modal (ROTATE step 1, closes a held position)
//  - 'open'  — the "Manual rebalance / new position" modal (REBALANCE "Modify",
//    OPEN "Open", ROTATE step 2 "Open new") — the target is either an existing
//    PortfolioPosition (REBALANCE), or a RebalanceTarget computed on demand
//    by resolveBotPool() for a pool where the user has no position yet.
type ProposalModalState =
  | { type: 'close'; position: PortfolioPosition }
  | {
      type: 'open';
      target: RebalanceTarget;
      title: string;
      initialUsdRange?: { usdLo: number; usdHi: number };
      /** Batch 16: overrides the default warning "this is NOT the product
       *  ±40/50%" (Batch 13b, CockpitPositionActions.tsx) with neutral text
       *  for FLAT_NARROW — the narrow prefill there is INTENDED (narrowing to
       *  k×σ in a confirmed flat), not a symptom of a stale/broken proposal. */
      narrowRangeNote?: string;
    };

// [Approve] (Batch 4b) — plan of the full sequence (decrease+collect → swap →
// mint) from rebalanceBuilder.ts for REBALANCE cards. REBALANCE only: the old and
// new position are in THE SAME pool, so planRebalance() (one Pool on
// input) has everything it needs. ROTATE deliberately omitted here —
// the old/new position are in DIFFERENT pools, and the builder does not handle that (see
// TODO in TASKS-UI.md Batch 4b, item 2) — ROTATE stays on manual steps 1/2
// (already implemented in Batch 4).
interface SequenceModalState {
  plan: RebalancePlan;
  pool: Pool;
  newTickLower: number;
  newTickUpper: number;
  proposalId: string;
}

// [Approve] ROTATE (Batch 8, closing the TODO from Batch 4b) — planRotate()
// requires TWO pools (old/new), hence a separate modal state from REBALANCE.
interface RotateSequenceModalState {
  plan: RotatePlan;
  newPool: Pool;
  newTickLower: number;
  newTickUpper: number;
  proposalId: string;
}

// [Approve hedge] / [Close short] (Batch 9) — one modal, two directions
// (plan.preview.direction distinguishes). proposalId=null for close (there is no
// bot proposal to dismiss — the user closes on their own initiative).
interface HedgeModalState {
  plan: HedgePlan;
  proposalId: string | null;
}

const MorningCockpit: FC<Props> = ({ bot }) => {
  const { address } = useAccount();
  // BATCH 20 item 1: bot passed to usePortfolio, so positions in pools
  // TRACKED by the bot get a ready suggestion from bot.state.pools[]
  // instead of the UI's own sigma (feature-detect via findBotPoolByAddress, inside
  // usePortfolio.ts — zero new requests, the data is already in useBotApi).
  const portfolio = usePortfolio(bot);
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
  // Batch 17: the "until narrowing proposal" countdown on the CYCLE line must
  // refresh without a server read (it counts time, not data) — a separate
  // small tick every minute, without touching the bot pollers. Hook above the early
  // return (see FIX 20.08 above — Rendered more hooks).
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Batch 11 item 3 (FIX 20.08 — "Rendered more hooks" crash: this useEffect
  // sat BELOW the early return `if (!portfolio.connected) return null`,
  // so the number of hooks changed between renders when the connection
  // state changed. RULE: ALL hooks above EVERY early return.)
  // localStorage is ONLY a fallback — when the bot CONFIRMS (state.hedge === null,
  // explicitly, not undefined/state not loaded yet) there is no position, and the fallback
  // is set, we clear it — the bot tells the truth about the on-chain state.
  const liveHedge = bot.state?.hedge;
  useEffect(() => {
    if (bot.state && bot.state.hedge === null && hedgeOpen) {
      clearHedgeOpen();
      setHedgeOpen(null);
    }
  }, [bot.state, hedgeOpen]);

  // Without a wallet the cockpit has nothing to show (it reads positions/balances from the chain).
  // Until 21.08 it returned `null` here — and since we removed the "Manage" section,
  // that meant a COMPLETELY empty page, looking like a broken application.
  if (!portfolio.connected) {
    return (
      <div className="morning-cockpit">
        <div className="morning-note">
          Connect a wallet ("Connect Wallet" at the top) to see the cockpit — positions, bot proposals and paper trading.
        </div>
      </div>
    );
  }

  const findHeldPosition = (tokenId: string): PortfolioPosition | undefined => portfolio.positions.find((x) => x.tokenId === tokenId);

  // REBALANCE/FLAT_NARROW/FLAT_WIDEN "Modify →": prefill from a position already
  // held by the user — the same mechanism (existing position + range from
  // the proposal), differing only in the modal title and (for NARROW) the warning
  // about the narrow range (Batch 16 item 2).
  const openModifyRebalance = (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos) {
      setProposalError(`Position #${p.tokenId} not found in the wallet (maybe already closed) — refresh.`);
      return;
    }
    setProposalError(null);
    const title =
      p.kind === 'FLAT_NARROW'
        ? `Narrowing (flat) #${p.tokenId}`
        : p.kind === 'FLAT_WIDEN'
          ? `Widening (end of flat) #${p.tokenId}`
          : `Modify rebalance #${p.tokenId}`;
    setProposalModal({
      type: 'open',
      target: pos,
      title,
      initialUsdRange: p.suggestedRange,
      narrowRangeNote: p.kind === 'FLAT_NARROW' ? 'product narrowing (flat)' : undefined,
    });
  };

  // REBALANCE "Approve →" (Batch 4b): builds the full plan (decrease+collect →
  // swap → mint) and opens the sequence modal instead of opening a second, separate
  // position like [Modify →] — the user ends up with one position in the new range,
  // not two.
  const openApproveSequence = (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos || !pos.pool) {
      setProposalError(`Position #${p.tokenId} not found in the wallet or no pool data (maybe already closed) — refresh.`);
      return;
    }
    if (!address) {
      setProposalError('Wallet not connected.');
      return;
    }
    const newTickLower = p.suggestedRange?.tickLower;
    const newTickUpper = p.suggestedRange?.tickUpper;
    if (newTickLower === undefined || newTickUpper === undefined) {
      setProposalError(`Proposal #${p.tokenId} has no full range (ticks) for the automatic sequence — use [Modify →].`);
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
      setProposalError(`Failed to build the rebalance plan: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
    }
  };

  // ROTATE "Approve →" (Batch 8, closing the TODO from Batch 4b): the old and new
  // position are in DIFFERENT pools — builds both Pools (old from the portfolio, new from
  // resolveBotPool, the same read as "2. Open new →") and calls planRotate().
  // CONDITION: same chain (planRotate throws otherwise — caught below with
  // the message "use the manual steps"). Manual steps 1/2 STAY as a fallback.
  const openRotateApprove = async (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos || !pos.pool) {
      setProposalError(`Position #${p.tokenId} not found in the wallet or no pool data (maybe already closed) — refresh.`);
      return;
    }
    if (!address) {
      setProposalError('Wallet not connected.');
      return;
    }
    if (!p.poolId) {
      setProposalError('The proposal does not specify a target pool — use the manual steps below.');
      return;
    }
    const newTickLower = p.suggestedRange?.tickLower;
    const newTickUpper = p.suggestedRange?.tickUpper;
    if (newTickLower === undefined || newTickUpper === undefined) {
      setProposalError(`Proposal #${p.tokenId} has no full range (ticks) for the automatic sequence — use the manual steps below.`);
      return;
    }
    setResolvingId(p.id);
    setProposalError(null);
    const target = await cockpitActions.resolveBotPool(p.poolId);
    setResolvingId(null);
    if (!target || !target.pool) {
      setProposalError('Failed to fetch target pool data — try again or use the manual steps.');
      return;
    }
    if (target.chainId !== pos.chainId) {
      setProposalError('Cross-chain rotation: automatic approval unavailable (different chains) — use the manual steps below.');
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
        `Failed to build the rotation plan: ${e instanceof Error ? e.message.slice(0, 200) : String(e)} — use the manual steps below.`
      );
    }
  };

  // HEDGE "Approve hedge →" (Batch 9): sizeEth from the bot proposal,
  // ethPriceUsd from the pool telemetry (state.pools[poolId].ethUsd — the same pool
  // for which the bot computed sizeEth). The "Open GMX ↗" link stays as a fallback.
  const openHedgeApprove = (p: BotProposal) => {
    if (!address) {
      setProposalError('Wallet not connected.');
      return;
    }
    const sizeEth = p.hedgeSizeEth;
    if (typeof sizeEth !== 'number' || sizeEth <= 0) {
      setProposalError('The proposal has no hedge size (sizeEth) — use the GMX link manually.');
      return;
    }
    const ethPriceUsd = bot.state?.pools?.find((pl) => pl.id === p.poolId)?.ethUsd;
    if (typeof ethPriceUsd !== 'number' || ethPriceUsd <= 0) {
      setProposalError('No current ETH price from bot telemetry — use the GMX link manually.');
      return;
    }
    setProposalError(null);
    try {
      const plan = planHedgeOpen({ sizeEth, ethPriceUsd, recipient: address });
      hedgeExecution.reset();
      setHedgeModal({ plan, proposalId: p.id });
    } catch (e) {
      setProposalError(`Failed to build the hedge plan: ${e instanceof Error ? e.message.slice(0, 200) : String(e)} — use the GMX link manually.`);
    }
  };

  // 20.08: hedge E2E test ($15 short opened and closed through the app —
  // details in CONTEXT ~evening) performed via a TEMPORARY button, removed
  // after passing. The production path = the HEDGE proposal card below.

  // [Close short →] (Batch 9 item 4, Batch 11 items 2/3): sizeUsd/collateralUsd
  // taken FIRST AND FOREMOST from `bot.state.hedge` (on-chain data, read by the GMX
  // Reader every cycle — the truth), localStorage (homos_hedge_open) is ONLY a fallback
  // for when the bot is offline / state.hedge not yet available. ETH price
  // from ANY live pool in telemetry (the hedge is one ETH/USD market
  // regardless of which LP pool triggered it).
  // (`liveHedge` defined above, above the early return — see FIX.)
  const openHedgeCloseModal = () => {
    if (!address) return;
    const sizeUsd = liveHedge ? liveHedge.sizeUsd : hedgeOpen?.sizeUsd;
    const collateralUsd = liveHedge ? liveHedge.collateralUsd : hedgeOpen?.collateralUsd;
    if (typeof sizeUsd !== 'number' || typeof collateralUsd !== 'number') return;
    const ethPriceUsd = bot.state?.pools?.find((pl) => typeof pl.ethUsd === 'number' && pl.ethUsd > 0)?.ethUsd;
    if (typeof ethPriceUsd !== 'number' || ethPriceUsd <= 0) {
      setProposalError('No current ETH price from the bot — cannot build the close. Close manually on app.gmx.io.');
      return;
    }
    setProposalError(null);
    try {
      const plan = planHedgeClose({ sizeUsd, collateralUsd, ethPriceUsd, recipient: address });
      hedgeExecution.reset();
      setHedgeModal({ plan, proposalId: null });
    } catch (e) {
      setProposalError(`Failed to build the hedge close: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
    }
  };

  // OPEN "Open →" / ROTATE step 2 "Open new →": the pool from the proposal may
  // be one where the user has no position yet — it has to be computed
  // (2 additional RPC reads, on demand, not on every render).
  const openNewAtProposal = async (p: BotProposal, title: string) => {
    if (!p.poolId) return; // button hidden when poolId === '' (pool outside the bot's configuration)
    setResolvingId(p.id);
    setProposalError(null);
    const resolved = await cockpitActions.resolveBotPool(p.poolId);
    setResolvingId(null);
    if (!resolved) {
      setProposalError('Failed to fetch pool data — try again.');
      return;
    }
    setProposalModal({ type: 'open', target: resolved, title, initialUsdRange: p.suggestedRange });
  };

  // ROTATE step 1 "Close old →" / EXIT_TREND "Close →": the position to
  // close is always held by the user (the bot proposes a rotation or the
  // trend safety switch only for positions it actually sees in the wallet).
  const openCloseForProposal = (p: BotProposal) => {
    const pos = findHeldPosition(p.tokenId);
    if (!pos) {
      setProposalError(`Position #${p.tokenId} not found in the wallet (maybe already closed) — refresh.`);
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

  // Batch 16b: DOWN on product pools emits TWO proposals at once
  // (HEDGE = option A preferred, EXIT_TREND = option B "usually do NOT
  // sign"), both marked `emergency: true` — pulled out of the list of
  // regular proposals into a separate "Emergency procedure" section, grouped
  // per tokenId (the same product position), A always before B in the group.
  const emergencyProposals = pendingProposals.filter((p) => p.emergency);
  const nonEmergencyProposals = pendingProposals.filter((p) => !p.emergency);
  const emergencyGroups: BotProposal[][] = (() => {
    const byKey = new Map<string, BotProposal[]>();
    for (const p of emergencyProposals) {
      const key = p.tokenId || p.id; // tokenId empty only in theory (emergency always concerns a held position)
      const arr = byKey.get(key) ?? [];
      arr.push(p);
      byKey.set(key, arr);
    }
    return Array.from(byKey.values()).map((arr) => [...arr].sort((a, b) => (a.kind === 'HEDGE' ? 0 : 1) - (b.kind === 'HEDGE' ? 0 : 1)));
  })();

  // Batch 15 (items 1+3): usePortfolio cannot value pairs without a
  // stable/ETH leg (e.g. cbBTC/WETH — see "Valuation note" in usePortfolio.ts,
  // deliberately NOT touched in this session, the calculation logic stays). The bot COMPUTES this
  // valuation via the reference rate (BOT_POOLS.usdRefPoolId) and exposes it in
  // /api/state.positions[].valueUsd — already loaded in useBotApi.ts, zero
  // new requests. Map tokenId→bot valueUsd, reused below both in the
  // total header and on the position cards (fallback only when usePortfolio
  // has `null` — the bot NEVER overrides a real usePortfolio valuation when one
  // exists).
  const botValueByTokenId = new Map<string, number>((bot.state?.positions ?? []).map((bp) => [bp.tokenId, bp.valueUsd]));
  const botFallbackUsd = portfolio.positions.reduce((sum, p) => {
    if (p.valueUsd !== null) return sum;
    const v = botValueByTokenId.get(p.tokenId);
    return typeof v === 'number' ? sum + v : sum;
  }, 0);
  const adjustedTotalUsd = portfolio.totalUsd + botFallbackUsd;
  // Item 3: the "*" note (and omission from the total) stays ONLY for positions that
  // are neither in the usePortfolio valuation nor in the bot state — not for every
  // position without a stable/ETH leg as before (cbBTC/WETH now has a bot valuation).
  const stillUnknownValue = portfolio.positions.some((p) => p.valueUsd === null && !botValueByTokenId.has(p.tokenId));

  // Batch 17 item 1: summary panel of REAL positions, mirroring the
  // "Paper trading" header (.paper-total-header, PaperTradingPanel.tsx) — Σ over the
  // same sources as each card's metrics bar (Batch 14/15, below in
  // .map()): "now" = p.valueUsd ?? bot valuation ?? equityUsd of the last
  // positions-history sample; PnL anchor = hodlUsd of the FIRST sample per position;
  // vs HODL base = hodlUsd of the LAST sample per position. Only positions with a
  // computable value and history enter the sums (consistent with "—" on a
  // single card when data is missing — here simply omitted from the sums, there is
  // no way to do "—" on a partial sum). Zero new requests — the same
  // data as bot.positionsHistory/bot.state.positions already loaded above.
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

  // Batch 16/16b: one proposal card, extracted from inline JSX into a
  // function, to render THE SAME per-kind logic both in the regular
  // "Bot proposals" list and in the "Emergency procedure" section (16b item 3
  // — grouping A/B side by side), without duplicating ~150 lines of JSX. Closes
  // over all handlers defined above in the component
  // (openApproveSequence etc.) — without changing their signatures.
  const renderProposalCard = (p: BotProposal) => {
    const kind = p.kind ?? 'REBALANCE';
    // Item 2 (Batch 16b): the "EMERGENCY OPTION A/B" header only on cards with
    // emergency===true — A(hedge)/B(exit) distinguished by kind. Cards without
    // `emergency` (all other kinds, and HEDGE/EXIT_TREND outside the
    // emergency procedure) — unchanged.
    const emergencyLabel = p.emergency ? (kind === 'HEDGE' ? 'A (hedge — preferred)' : kind === 'EXIT_TREND' ? 'B (exit — usually do NOT sign)' : null) : null;
    return (
      <div key={p.id} className={`morning-proposal-card morning-proposal-card--stacked${p.emergency ? ' morning-proposal-card--emergency' : ''}`}>
        {emergencyLabel && (
          <>
            <div className="morning-proposal-line morning-emergency-heading">🚨 EMERGENCY OPTION {emergencyLabel}</div>
            <div className="muted morning-emergency-note">The hybrid deliberately holds beta — see EMERGENCY.md before you sign.</div>
          </>
        )}
        {kind === 'REBALANCE' && (
          <>
            <div className="morning-proposal-line">
              🔄 REBALANCE #{p.tokenId}
              {p.suggestedRange && (
                <>
                  {' '}
                  → ${p.suggestedRange.usdLo.toLocaleString()}–${p.suggestedRange.usdHi.toLocaleString()}
                </>
              )}
              {typeof p.costUsd === 'number' && <> · cost ${p.costUsd.toFixed(2)}</>}
              {typeof p.paybackDays === 'number' && <> · payback ~{p.paybackDays.toFixed(1)} days</>}
            </div>
            <div className="morning-proposal-actions">
              <button className="action-button primary" onClick={() => openApproveSequence(p)}>
                Approve →
              </button>
              <button className="action-button" onClick={() => openModifyRebalance(p)}>
                Modify →
              </button>
              <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                Dismiss
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
                <button className="action-button" disabled={resolvingId === p.id} onClick={() => openNewAtProposal(p, `Open — ${p.symbol ?? p.action}`)}>
                  {resolvingId === p.id ? 'Loading…' : 'Open →'}
                </button>
              )}
              <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                Dismiss
              </button>
            </div>
          </>
        )}

        {kind === 'ROTATE' && (
          <>
            <div className="morning-proposal-line">
              🔁 Close #{p.tokenId}
              {typeof p.heldApy7d === 'number' && <> (7d {p.heldApy7d.toFixed(1)}%)</>}
            </div>
            <div className="morning-proposal-line">
              → Open {p.symbol ?? ''}
              {typeof p.apy7d === 'number' && <> (7d {p.apy7d.toFixed(1)}%)</>}
              {typeof p.breakEvenDays === 'number' && <> · switching cost pays back in ~{p.breakEvenDays.toFixed(1)}d</>}
            </div>
            {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
            {/* Batch 8 (closing the TODO from Batch 4b): automatic [Approve]
                requires planRotate() (old+new pool, same chain) — when the pairs
                are disjoint or the chains differ, openRotateApprove shows an error and
                the manual steps 1/2 below remain as a fallback. */}
            <div className="morning-note">
              [Approve] runs the sequence automatically (same chain only) — steps 1/2 below remain as a manual option.
            </div>
            <div className="morning-proposal-actions">
              <button className="action-button primary" disabled={resolvingId === p.id} onClick={() => openRotateApprove(p)}>
                {resolvingId === p.id ? 'Loading…' : 'Approve →'}
              </button>
              <button className="action-button" onClick={() => openCloseForProposal(p)}>
                1. Close old →
              </button>
              {p.poolId && (
                <button className="action-button" disabled={resolvingId === p.id} onClick={() => openNewAtProposal(p, `Open new — ${p.symbol ?? ''}`)}>
                  {resolvingId === p.id ? 'Loading…' : '2. Open new →'}
                </button>
              )}
              <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                Dismiss
              </button>
            </div>
          </>
        )}

        {kind === 'EXIT_TREND' && (
          <>
            <div className="morning-proposal-line">⛔ Trend safety switch: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}</div>
            {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
            <div className="morning-proposal-actions">
              <button className="action-button primary" onClick={() => openCloseForProposal(p)}>
                Close →
              </button>
              <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                Dismiss
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
            {/* Batch 9: [Approve hedge] sends the order from this app (GMX
                ExchangeRouter multicall, 1 signature) — the GMX link stays as a manual
                fallback (HANDOFF Fable→Sonnet 2026-08-17 ~15:0x, extended 20.08).
                Item 4 (Batch 16b): missing `hedgeSizeEth` = cbBTC leg (BTC/USD
                market, not ETH) — the bot has no auto-execute for it (the multicall
                in useHedgeExecution.ts handles ETH only), so INSTEAD of the
                [Approve hedge] button only a link + a "manually" note. */}
            {typeof p.hedgeSizeEth === 'number' ? (
              <div className="morning-proposal-actions">
                <button className="action-button primary" onClick={() => openHedgeApprove(p)}>
                  Approve hedge →
                </button>
                <a className="action-button" href="https://app.gmx.io/#/trade/?market=ETH-USD" target="_blank" rel="noreferrer">
                  Open GMX ↗
                </a>
                <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                  Dismiss
                </button>
              </div>
            ) : (
              <>
                <div className="morning-note">No automatic execution for this leg (BTC/USD market, not ETH) — open and size it manually on GMX.</div>
                <div className="morning-proposal-actions">
                  <a className="action-button primary" href="https://app.gmx.io/#/trade/?market=BTC-USD" target="_blank" rel="noreferrer">
                    Open GMX (BTC/USD) ↗
                  </a>
                  <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                    Dismiss
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {kind === 'FLAT_NARROW' && (
          <>
            <div className="morning-proposal-line">
              🎯 FLAT — narrowing: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}
              {p.suggestedRange && (
                <>
                  {' '}
                  → {fmtQuoteForPool(p.poolId ?? '', p.suggestedRange.usdLo)}–{fmtQuoteForPool(p.poolId ?? '', p.suggestedRange.usdHi)}
                </>
              )}
              {typeof p.costUsd === 'number' && <> · cost ${p.costUsd.toFixed(2)}</>}
              {typeof p.paybackDays === 'number' && <> · payback ~{p.paybackDays.toFixed(1)} days</>}
            </div>
            {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
            <div className="morning-proposal-actions">
              <button className="action-button primary" onClick={() => openApproveSequence(p)}>
                Approve →
              </button>
              <button className="action-button" onClick={() => openModifyRebalance(p)}>
                Modify →
              </button>
              <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                Dismiss
              </button>
            </div>
          </>
        )}

        {kind === 'FLAT_WIDEN' && (
          <>
            <div className="morning-proposal-line">
              ⚠️ end of flat — widening: {p.symbol ?? p.poolId ?? `#${p.tokenId}`}
              {p.suggestedRange && (
                <>
                  {' '}
                  → {fmtQuoteForPool(p.poolId ?? '', p.suggestedRange.usdLo)}–{fmtQuoteForPool(p.poolId ?? '', p.suggestedRange.usdHi)}
                </>
              )}
              {typeof p.costUsd === 'number' && <> · cost ${p.costUsd.toFixed(2)}</>}
            </div>
            {p.note && <div className="morning-note morning-proposal-note">{p.note}</div>}
            <div className="morning-proposal-actions">
              <button className="action-button primary" onClick={() => openApproveSequence(p)}>
                Approve →
              </button>
              <button className="action-button" onClick={() => openModifyRebalance(p)}>
                Modify →
              </button>
              <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                Dismiss
              </button>
            </div>
          </>
        )}

        {!['REBALANCE', 'OPEN', 'ROTATE', 'EXIT_TREND', 'HEDGE', 'FLAT_NARROW', 'FLAT_WIDEN'].includes(kind) && (
          <>
            {/* Unknown kind (e.g. a future extension of the bot schema) — show
                as a grey note instead of crashing or rendering an empty card. */}
            <div className="morning-note">
              Unknown proposal type ({kind}): {p.action}
            </div>
            <div className="morning-proposal-actions">
              <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                Dismiss
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="morning-cockpit">
      {/* 21.08 (owner's decision): after removing the "Manage" section the cockpit IS
          the whole application, so it stopped being a collapsible module — no title
          or arrow, the content always renders. Only ⚙ remains
          (bot connection settings); the bot status dot is not
          repeated here, because it already sits in the app header (App.tsx). */}
      <div className="morning-header morning-header-bare">
        <div className="morning-header-actions">
          {/* Bot status dot: I removed it 21.08 as a duplicate of the one
              in the app header, but the owner immediately noticed it missing — i.e.
              it is THIS dot that is read as "the server connection is alive",
              because it sits next to the connection settings. It stays. */}
          <BotStatusDot status={bot.status} />
          <button
            className="morning-settings-btn"
            title="Bot connection settings"
            onClick={() => setShowSettings((s) => !s)}
          >
            ⚙
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="morning-settings">
          <label>
            Bot API address
            <input value={baseInput} onChange={(e) => setBaseInput(e.target.value)} placeholder="http://<bot-host>:8787" />
          </label>
          <label>
            Access token
            <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="BOT_API_TOKEN" type="password" />
          </label>
          <button className="action-button primary" onClick={saveSettings}>
            Save
          </button>
        </div>
      )}

      <div className="morning-body">
          <div className="morning-summary">
            <div className="morning-stat">
              <span className="morning-stat-value">{portfolio.loading ? '…' : fmtUsd(adjustedTotalUsd)}</span>
              <span
                className="morning-stat-label"
                title="includes funds outside tranche 1 — old gas and leftovers on mainnet/Arbitrum; cbBTC omitted (the UI has no BTC rate)"
              >
                Total value (whole wallet, all chains){stillUnknownValue ? '*' : ''}
              </span>
            </div>
            <div className="morning-stat">
              <span className="morning-stat-value">
                {portfolio.positionsInRange}/{portfolio.positionsInRange + portfolio.positionsOutOfRange}
              </span>
              <span className="morning-stat-label">Positions in range</span>
            </div>
            <div className="morning-stat">
              <span className="morning-stat-value">{portfolio.loading ? '…' : fmtUsd(portfolio.feesUsd)}</span>
              <span className="morning-stat-label">Fees to collect</span>
            </div>
          </div>

          {stillUnknownValue && (
            <div className="morning-note">
              * omits positions without a valuation — neither a stable/ETH leg (usePortfolio) nor bot data (/api/state) — no reliable USD valuation
            </div>
          )}
          {portfolio.error && <div className="morning-note morning-error">Portfolio error: {portfolio.error}</div>}

          {/* Batch 11: when the bot CONFIRMS the hedge (state.hedge, on-chain) —
              the card in the positions section below takes over showing it/[Close
              short →], the localStorage note disappears (one source of truth on
              screen). The note stays as a fallback ONLY when the bot is offline/
              state.hedge not yet available, and the fallback from the last
              successful open in this browser is still set. */}
          {!liveHedge && hedgeOpen && (
            <div className="morning-note morning-proposal-note morning-hedge-open-note">
              🛡 Open short (hedge, from the last record in this browser — bot offline/data not yet available): ~$
              {hedgeOpen.sizeUsd.toFixed(0)} (collateral ${hedgeOpen.collateralUsd.toFixed(0)}) since{' '}
              {new Date(hedgeOpen.ts).toLocaleDateString('pl-PL')}
              <div className="morning-proposal-actions">
                <button className="action-button" onClick={openHedgeCloseModal}>
                  Close short →
                </button>
              </div>
            </div>
          )}

          {/* Batch 16b item 3: the "Emergency procedure" section ABOVE the regular
              proposals — A(hedge)/B(exit) pairs of the same position side by
              side, so the owner sees both options at once instead of scrolling
              a mixed list. Empty (no DOWN on product pools) —
              the section does not render at all. */}
          {emergencyGroups.length > 0 && (
            <>
              <div className="morning-section-title">🚨 Emergency procedure</div>
              <div className="morning-emergency-groups">
                {emergencyGroups.map((group, i) => (
                  <div key={i} className="morning-emergency-group">
                    {group.map((p) => renderProposalCard(p))}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="morning-section-title">Bot proposals</div>
          {bot.actionNotice && <div className="morning-bot-offline">⚠️ {bot.actionNotice}</div>}
          {bot.status === 'offline' ? (
            <div className="morning-bot-offline">
              Bot offline — start the homos-bot service on the server (⚙ to set the address/token).
            </div>
          ) : nonEmergencyProposals.length > 0 ? (
            <div className="morning-proposals">{nonEmergencyProposals.map((p) => renderProposalCard(p))}</div>
          ) : (
            <div className="morning-note">No active proposals.</div>
          )}
          {proposalError && <div className="morning-note morning-error">{proposalError}</div>}
          {bot.status === 'stale' && <div className="morning-note">⚠ bot data stale (older than 5 min)</div>}

          <div className="morning-section-title">Positions — actions</div>

          {/* Batch 18: TRANCHE BALANCE bar, ABOVE the Batch 17 summary panel
              (owner's decision 29.08 — a SEPARATE section, the Batch 17 panel stays
              UNCHANGED apart from the note/tooltip below). It measures a DIFFERENT thing than
              the Batch 17 panel: how much of the actually deposited USDC there is today
              (including the buffer in the wallet + one-off entry costs), not
              only LP quality since the position anchors. The bot side already computes everything —
              the UI only displays `bot.state.tranche`, zero math of its own.
              `walletUsd`/`totalUsd`/`diffUsd`/`diffPct` may be `null` (failed
              balance read or missing rate) — then "—", NEVER $0. */}
          {bot.state?.tranche && (
            <>
              <div className="tranche-bar">
                <div className="tranche-bar-stat">
                  <span className="tranche-bar-value">{fmtUsd(bot.state.tranche.depositedUsd)}</span>
                  <span className="muted">
                    Deposited ({new Date(bot.state.tranche.startedAt).toLocaleDateString('pl-PL')})
                  </span>
                </div>
                <div className="tranche-bar-stat">
                  <span className="tranche-bar-value">{bot.state.tranche.totalUsd === null ? '—' : fmtUsd(bot.state.tranche.totalUsd)}</span>
                  <span className="muted" title="tranche 1 funds on Base only — product positions and wallet">
                    Total today (tranche 1, Base)
                  </span>
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
                  <span className="muted">Difference</span>
                </div>
              </div>
              <div className="muted tranche-breakdown">
                in positions {fmtUsd(bot.state.tranche.lpUsd)} + in wallet {bot.state.tranche.walletUsd === null ? '—' : fmtUsd(bot.state.tranche.walletUsd)}
                {bot.state.tranche.marketPnlUsd !== null && bot.state.tranche.residualUsd !== null && (
                  <>
                    {' '}
                    · of which market move {fmtSigned(bot.state.tranche.marketPnlUsd)} · residual (entry costs + buffer beta){' '}
                    <span
                      title="one-off entry costs — swaps, slippage, mint gas — plus the change in value of the buffer in the wallet. It should be roughly constant; if it grows, report it to Fable."
                    >
                      {fmtSigned(bot.state.tranche.residualUsd)}
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {/* Batch 17 item 1: summary panel above the cards — mirroring
              .paper-total-header (PaperTradingPanel.tsx), the same CSS classes.
              Only when there is at least one position with computable history
              (otherwise the sums would be misleadingly empty — the "no positions" message
              below already says that). */}
          {hasRealPositionStats && (
            <div className="paper-total-header">
              <div className="paper-total-stat">
                <span className="paper-total-value">{fmtUsd(totalEquityUsd)}</span>
                <span className="muted">Total equity</span>
              </div>
              <div className="paper-total-stat">
                <span
                  className={`paper-total-value ${totalPnlUsd < 0 ? 'forecast-negative' : 'paper-positive'}`}
                  title="Computed from the position anchors, excluding the buffer and entry costs — the full tranche account is in the bar above."
                >
                  {fmtSigned(totalPnlUsd)} ({totalPnlPct >= 0 ? '+' : ''}
                  {totalPnlPct.toFixed(1)}%)
                </span>
                <span
                  className="muted"
                  title="Computed from the position anchors, excluding the buffer and entry costs — the full tranche account is in the bar above."
                >
                  PnL since start{oldestAnchorTs ? ` (since ${new Date(oldestAnchorTs).toLocaleDateString('pl-PL')})` : ''}
                </span>
              </div>
              <div className="paper-total-stat">
                <span className={`paper-total-value ${totalVsHodlUsd < 0 ? 'forecast-negative' : 'paper-positive'}`}>{fmtSigned(totalVsHodlUsd)}</span>
                <span className="muted">vs HODL 50/50</span>
              </div>
            </div>
          )}

          <div className="muted status-legend">
            🟢 in range · ⚠️ out of range (not earning) · 🔄 rebalance due · ⏳ rebalance not worth it
          </div>
          {portfolio.loading ? (
            <div className="morning-note">Loading positions…</div>
          ) : portfolio.positions.length === 0 && !liveHedge ? (
            <div className="morning-note">No open positions.</div>
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
                      ⚠️ LONG position on GMX — the bot expects a SHORT (hedge against an LP price drop). Check manually on app.gmx.io.
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
                    // NO PriceRangeChart — a perp has no range (no lo/hi in
                    // the samples, see the comment in bot/observer.ts); only equity
                    // vs collateral (benchmark "cash without the short").
                    return hedgeHistory.length >= 2 ? (
                      <Sparkline points={hedgeHistory} events={[]} />
                    ) : (
                      <div className="morning-note muted">too few hedge history points collected yet.</div>
                    );
                  })()}
                  <div className="cockpit-position-actions" style={{ marginTop: 8 }}>
                    <button className="action-button" onClick={openHedgeCloseModal}>
                      Close short →
                    </button>
                  </div>
                </div>
              )}
              {portfolio.positions.map((p) => {
                // Range bar simplified to a tick fraction (without per-pair price
                // orientation, as in MyPositions.tsx) — sufficient for a
                // compact list card; the full USD bar stays in MyPositions.
                const span = p.tickUpper - p.tickLower;
                const pct = span > 0 && p.pool ? Math.min(100, Math.max(0, ((p.pool.tickCurrent - p.tickLower) / span) * 100)) : 50;

                // Batch 10: two charts as in PaperTradingPanel, from
                // positionsHistory (GET /api/positions-history, filtered by
                // tokenId — unique per position, no need to match by
                // poolId). Mapping to EquityChartPoint: valueUsd→equityUsd
                // (PositionHistoryPoint has no `status` — Sparkline/
                // PriceRangeChart then treat every sample as "open",
                // shading only !inRange, never cash — real positions do not
                // have a cash state like paper).
                const rawPosHistory = (bot.positionsHistory ?? []).filter((h) => h.tokenId === p.tokenId);
                // botPoolId (e.g. "arbitrum-weth-usdc-005") from the sample itself —
                // NOT to be confused with p.poolAddress (contract address); PriceRangeChart
                // looks this id up in BOT_POOL_META (price orientation/formatting).
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
                // HODL anchor = the first (oldest) bot sample for this
                // tokenId — the anchoredAt field does not come in the API response
                // (see TASKS-UI.md Batch 10 item 4), so we take the ts of the
                // first snapshot as an honest "since when we count" label.
                const posHistorySorted = posHistory.length > 0 ? [...posHistory].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)) : [];
                const firstPosHistPoint = posHistorySorted[0] ?? null;
                const lastPosHistPoint = posHistorySorted.length > 0 ? posHistorySorted[posHistorySorted.length - 1] : null;
                const hodlSince = firstPosHistPoint?.ts ?? null;
                // Item 1 (Batch 15): card valuation fallback to bot data when
                // usePortfolio cannot value the position in USD (no
                // stable/ETH leg — e.g. cbBTC/WETH). The bot computes USD via the
                // reference rate, independently of this UI limitation.
                const botLivePos = botValueByTokenId.get(p.tokenId);
                const cardValueUsd = p.valueUsd ?? botLivePos ?? null;
                const isBotValuation = p.valueUsd === null && botLivePos !== undefined;
                // Batch 14/15 (item 2): PnL since start = value now −
                // value at the anchor (hodlUsd stored in the FIRST sample — at
                // that moment the anchor had JUST been frozen, so the
                // hodlUsd of that sample = a0*px0+a1*px1 computed at anchoredAt
                // = the actual starting value of the position, see
                // bot/observer.ts:626-632). vs HODL 50/50 = value now −
                // hodlUsd of the last sample (benchmark "if you had held the same
                // tokens without LP"). "Value now" = p.valueUsd, and for positions
                // without a usePortfolio valuation (item 2, Batch 15) — equityUsd
                // of the LAST positions-history sample (the same field as
                // bot.state.positions[].valueUsd, the same number from the observer,
                // only from the sample instead of live state — both already in USD, no
                // additional requests). Both `null` when there truly is no
                // valuation/history whatsoever — the bar then renders "—".
                const nowValueUsdForStats = p.valueUsd ?? lastPosHistPoint?.equityUsd ?? null;
                const pnlSinceStartUsd = nowValueUsdForStats !== null && firstPosHistPoint ? nowValueUsdForStats - firstPosHistPoint.hodlUsd : null;
                const vsHodlUsd = nowValueUsdForStats !== null && lastPosHistPoint ? nowValueUsdForStats - lastPosHistPoint.hodlUsd : null;

                // Batch 17 item 2: CYCLE line — posture from bot.state.positions
                // (feature-detect: null/absent = non-product pool, the card
                // renders nothing), the rest (flatSince/flatConfirmed/
                // trendGapPct) from bot.state.pools by pool id (matched via
                // address — botPoolId from history may be empty for fresh positions
                // without samples yet). flatParams from the state root (LIVE
                // detector parameters — do NOT hard-code 12h/2%/5%, see DEFAULT_FLAT_PARAMS).
                const botMeta = findBotPoolByAddress(p.chainId, p.poolAddress);
                const bpForCycle = (bot.state?.positions ?? []).find((x) => x.tokenId === p.tokenId);
                const poolLiveForCycle = botMeta ? bot.state?.pools?.find((pl) => pl.id === botMeta.id) : undefined;
                const flatParams = bot.state?.flatParams ?? DEFAULT_FLAT_PARAMS;

                return (
                  <div key={`${p.chainId}-${p.tokenId}`} className="cockpit-position-card">
                    <CockpitPositionActions position={p} actions={cockpitActions} onChanged={portfolio.refresh} bot={bot} ethUsd={portfolio.ethUsd} />
                    <div className="cockpit-position-card-header">
                      <span>
                        {/* position status FIRST (earning / not earning), bot advice
                            as the second mark. ✅ IN_RANGE_HOLD is skipped — 🟢 already says it. */}
                        <span title={positionStatusTitle(p.inRange)}>{positionStatusIcon(p.inRange)}</span> {p.poolLabel} · #{p.tokenId}
                        {p.advice && p.advice !== 'IN_RANGE_HOLD' && ADVICE_ICON[p.advice] && (
                          <span title={ADVICE_TITLE[p.advice] ?? p.advice}> {ADVICE_ICON[p.advice]}</span>
                        )}
                      </span>
                      <span className="muted">
                        {cardValueUsd !== null ? fmtUsd(cardValueUsd) : '— (no valuation)'}
                        {isBotValuation && (
                          <span
                            title="usePortfolio has no direct valuation path for this pair (no stable/ETH leg) — the number comes from the bot, which computes USD via the reference rate (BOT_POOLS.usdRefPoolId). Refreshed every ≤5 min."
                          >
                            {' '}
                            (bot valuation)
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Batch 17 item 2: CYCLE line — ONLY product positions
                        (posture !== null). */}
                    {renderCycleLine(bpForCycle?.posture, poolLiveForCycle, botMeta?.productIdleWidthPct, flatParams, nowTick)}
                    {/* Batch 17 item 3: OUT OF RANGE badge — a rare and
                        important event in the FlatWide product (the WIDE posture is ±40/50%,
                        breaking the band is a real signal), so visible from the
                        threshold, separately from the timer below. Direction from
                        comparing price vs lo/hi of the LAST history sample —
                        "outside the band" when those fields are still missing (fresh position). */}
                    {!p.inRange && (
                      <div className="cockpit-outofrange-badge">
                        ⚠️ OUT OF RANGE — price{' '}
                        {lastPosHistPoint && typeof lastPosHistPoint.price === 'number' && typeof lastPosHistPoint.lo === 'number' && typeof lastPosHistPoint.hi === 'number'
                          ? lastPosHistPoint.price < lastPosHistPoint.lo
                            ? 'below the band'
                            : lastPosHistPoint.price > lastPosHistPoint.hi
                              ? 'above the band'
                              : 'outside the band'
                          : 'outside the band'}
                      </div>
                    )}
                    {/* Out-of-range timer for a REAL position (owner's request 21.08).
                        Difference vs paper: the bot does NOT wait 24h here — it issues the
                        rebalance proposal right away, once the advisor deems it worthwhile
                        (bot/observer.ts:544). So instead of a countdown we show
                        what the position is actually waiting for. */}
                    {!p.inRange && (() => {
                      const since = outOfRangeSinceFromHistory(rawPosHistory);
                      const waiting =
                        p.advice === 'REBALANCE'
                          ? 'the bot proposes a rebalance (see "Proposals")'
                          : p.advice === 'WAIT_NOT_PROFITABLE'
                            ? `rebalance not worth it for now${p.paybackDays != null ? ` (cost payback ~${p.paybackDays.toFixed(1)} days, threshold 7)` : ''}`
                            : 'no advisor data for this pool';
                      return (
                        <div className="out-of-range-timer">
                          <span className="out-of-range-elapsed">
                            Out of range: {since ? `~${formatDuration(Date.now() - since)}` : 'just now'}
                          </span>
                          <span
                            className="muted"
                            title="Real positions have no 24h hysteresis like paper trading — the bot issues a rebalance proposal as soon as the cost pays back from fees within ≤7 days. Time computed from samples every ~15 min."
                          >
                            {' '}
                            · {waiting}
                          </span>
                        </div>
                      );
                    })()}
                    {/* The old range bar (P1) only as a FALLBACK, as long as
                        the price-vs-band chart has no data — afterwards a duplicate
                        (owner's remark from the P10 review: "shouldn't it be thrown out?") */}
                    {posHistory.length < 2 && (
                      <div className={`range-bar ${p.inRange ? 'in-range' : 'out-of-range'} cockpit-range-bar`}>
                        <div className="range-bar-marker" style={{ left: `${pct}%` }} />
                      </div>
                    )}
                    {/* Batch 14: metrics bar as in paper (PositionStatsBar,
                        PositionCharts.tsx) — "Accrued fees" here REPLACES the old
                        separate "Uncollected fees" line (moved into the bar,
                        per the spec). Fees reinvested/Costs/Rebalances:
                        feature-detect from bot.state.positions (ledger aggregates,
                        bot-side Batch 14, 27.08 — Fable) — field absent
                        (old bot) or null (the ledger cannot value it) = "—";
                        0 is the CORRECT zero of a fresh position, not "—". */}
                    {(() => {
                      const bp = bpForCycle; // Batch 17: reused lookup (above, the same position)
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
                          <div className="muted paper-range-caption">HODL counted since {new Date(hodlSince).toLocaleDateString('pl-PL')}</div>
                        )}
                        <PriceRangeChart poolId={botPoolId} points={posHistory} events={[]} />
                      </>
                    ) : (
                      <div className="morning-note muted">too few position history points collected yet.</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <ExpandableSection title="📊 Paper trading" defaultExpanded={true}>
            <PaperTradingPanel bot={bot} />
          </ExpandableSection>

          {/* The sections share the same skeleton (telemetry-section with its own
              header) — the Ranking was previously wrapped in
              ExpandableSection and thus got an extra bar/frame.
              "Profit forecast" (ForecastPanel) REMOVED 29.08: forecast.json
              described v1.2 strategies (k=3 + rebalance/exit), which we no longer play
              after switching to the FlatWide hybrid, computed on the swap sigma
              rejected 26.08 and not refreshed since 17.08 (the generator was not
              in the pipeline). History in git — it will only return as a PRODUCT
              forecast (narrowing EV from flatwindows), if the review so
              decides. */}
          <BotTelemetry bot={bot} />
          <ObservationAnalysis bot={bot} />
          <TopRankingPanel bot={bot} />
          {/* Batch 21 (02.09, owner's decision "an exact copy of the ranking under
              the new guidelines, I want to observe"): a second ranking next to
              the first, the same component with variant="wide" — source
              /api/wide-ranking, apy7d carries the SCORE %/yr instead of APY. Both
              rankings live side by side for ~a month (observation). */}
          <TopRankingPanel bot={bot} variant="wide" />
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
