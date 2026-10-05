/**
 * PaperTradingPanel.tsx — paper-trading visualization. The bot runs a virtual
 * portfolio of $10k/pool (bot/paper.ts) per ALGORITHM v1.2 on live data — zero
 * transactions, pure simulation. The panel shows how much the algorithm
 * virtually earns/loses per pool and in total, especially vs HODL 50/50.
 *
 * Data: `bot.paper` / `bot.paperStatus` from useBotApi.ts (GET /api/paper?hours=168,
 * a separate slower poller than /api/state — see the comment in useBotApi.ts).
 * Response shape:
 *   state.positions[poolId]: {status, capitalUsd, feesUsd, costsUsd,
 *     rebalances, hedge, hedgePnlRealizedUsd, ...}
 *   history[]: {ts, poolId, equityUsd, hodlUsd, feesUsd, costsUsd, inRange,
 *     trendDown, rebalances} — snapshots every ~15 min, used here for (a) "now"
 *     equity/hodl (last point per pool — more accurate than capitalUsd from
 *     state, because it also carries hodlUsd needed for "vs HODL") and (b) the sparkline.
 *   events[]: {ts, poolId, kind} — list of recent events.
 *
 * Range visibility — the equity-vs-HODL sparkline alone does not show WHEN a
 * pool fell out of range or exited on trend. Hence: (a) state shading
 * (out of range / cash) on the sparkline — works on the whole history
 * (inRange/status have always been recorded); (b) a second mini-chart
 * "price vs bot range band" — ONLY when the pool has ≥2 samples with the
 * `price` field (older samples lack it — feature-detect, do not assume
 * presence); (c) event markers
 * EXIT_TREND/REENTRY/REBALANCE on the time axis of both charts.
 *
 * Read-only: the panel uses exclusively what useBotApi.ts already brings. No action buttons
 * (it is a simulation, nothing to approve), no second /api/state poller.
 * Chart as inline SVG polyline without new dependencies — the
 * ObservationAnalysis.tsx pattern (PoolHistoryChart).
 *
 * Chart logic (Sparkline/PriceRangeChart/EventMarkers/stateBands/price
 * orientation) lives in PositionCharts.tsx, shared with the REAL position cards
 * in MorningCockpit.tsx. Only the import + the
 * PaperHistoryPoint→EquityChartPoint mapping stays here (structural
 * typing — PaperHistoryPoint has equityUsd, so it fits without changes).
 */
import React, { FC } from 'react';
import { UseBotApi, PaperHistoryPoint, PaperEvent, PaperPosition } from '../hooks/useBotApi';
import { BOT_POOL_META } from '../config/botPools';
import { Sparkline, PriceRangeChart, PositionStatsBar } from './PositionCharts';
import { formatDuration } from '../utils/formatters';

const fmtUsd = (v: number) =>
  (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtSigned = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtUsd(Math.abs(v));

const poolLabel = (poolId: string): string => {
  const meta = BOT_POOL_META.find((m) => m.id === poolId);
  return meta ? `${meta.sym0}/${meta.sym1} · ${(meta.feeBps / 10_000).toFixed(2)}%` : poolId;
};

const STATUS_ICON: Record<string, string> = {
  open: '🟢',
  cash: '💤',
  pending: '⏳',
};

/** Position state icon. A position that is OPEN but out of range earns no fees,
 *  so it must not share the green dot with a healthy one. Out-of-range REPLACES
 *  the icon (one icon = one state) instead of adding a second mark next to it. */
const statusIcon = (status: string, inRange: boolean | undefined): string =>
  status === 'open' && inRange === false ? '⚠️' : (STATUS_ICON[status] ?? '·');

/** Rebalance hysteresis in paper trading: 24h CONTINUOUSLY out of range
 *  (bot/paper.ts HYSTERESIS_MS). We keep a copy of the constant here, because the UI
 *  does not import bot code — if it changes there, it must be fixed here too. */
const HYSTERESIS_MS = 24 * 3600 * 1000;

const statusTitle = (status: string, inRange: boolean | undefined): string => {
  if (status === 'open') return inRange === false ? 'OUT of range — the position accrues no fees' : 'In range — the position is earning';
  if (status === 'cash') return 'In cash after the trend safety switch — waiting for re-entry';
  if (status === 'pending') return 'Before the first open';
  return status;
};

const EVENT_ICON: Record<string, string> = {
  OPEN: '🔓',
  REBALANCE: '🔄',
  EXIT_TREND: '⛔',
  REENTRY: '🔁',
  HEDGE_OPEN: '🛡',
  HEDGE_CLOSE: '🛡',
};

/** Last history point of a given pool (ts ascending or descending — we sort here so as not to assume the endpoint's order). */
function latestFor(history: PaperHistoryPoint[], poolId: string): PaperHistoryPoint | null {
  const pts = history.filter((h) => h.poolId === poolId);
  if (pts.length === 0) return null;
  return pts.reduce((a, b) => (Date.parse(b.ts) > Date.parse(a.ts) ? b : a));
}

const PoolCard: FC<{ poolId: string; position: PaperPosition; history: PaperHistoryPoint[]; events: PaperEvent[]; capitalPerPoolUsd: number }> = ({
  poolId,
  position,
  history,
  events,
  capitalPerPoolUsd,
}) => {
  const last = latestFor(history, poolId);
  const equity = last?.equityUsd ?? position.capitalUsd ?? capitalPerPoolUsd;
  const hodl = last?.hodlUsd ?? capitalPerPoolUsd;
  const pnl = equity - capitalPerPoolUsd;
  const vsHodl = equity - hodl;
  const trendDown = last?.trendDown ?? false;
  const poolHistory = history.filter((h) => h.poolId === poolId);
  const poolEvents = events.filter((e) => e.poolId === poolId);

  return (
    <div className="paper-pool-card">
      <div className="paper-pool-header">
        <span>
          <span title={statusTitle(position.status, last?.inRange)}>{statusIcon(position.status, last?.inRange)}</span> {poolLabel(poolId)}
          {trendDown && (
            <span className="paper-badge-trend-down" title="Trend safety-switch signal (price below EMA)">
              {' '}
              ⛔
            </span>
          )}
        </span>
        <span className="paper-pool-equity">{fmtUsd(equity)}</span>
      </div>

      {/* Out-of-range timer. Shown ONLY when the
          position is open and out of range. `outOfRangeSince` resets
          on every return to range — it is a CONTINUOUS out-of-range timer. */}
      {position.status === 'open' && last?.inRange === false && (
        <div className="out-of-range-timer">
          {position.outOfRangeSince ? (
            (() => {
              const elapsed = Date.now() - position.outOfRangeSince;
              const left = HYSTERESIS_MS - elapsed;
              return (
                <>
                  <span className="out-of-range-elapsed">Out of range: {formatDuration(elapsed)}</span>
                  {left > 0 ? (
                    <span className="muted" title="After 24h the bot will additionally check whether the rebalance cost pays back from fees within ≤7 days. Returning to range resets the timer.">
                      {' '}
                      · rebalance threshold in {formatDuration(left)}
                    </span>
                  ) : (
                    <span className="muted" title="24h threshold passed — the rebalance now only waits for the profitability condition (payback ≤7 days).">
                      {' '}
                      · 24h threshold passed, waiting for profitability
                    </span>
                  )}
                </>
              );
            })()
          ) : (
            <span className="out-of-range-elapsed" title="The bot has not yet recorded the moment of falling out (the timer is set in the next 15-minute cycle).">
              Out of range (timer starts in the next cycle)
            </span>
          )}
        </div>
      )}

      {/* Metrics bar shared with the REAL position cards (PositionStatsBar in
          PositionCharts.tsx). Paper always has all 6 fields, so no field
          renders "—" here. */}
      <PositionStatsBar
        pnlUsd={pnl}
        vsHodlUsd={vsHodl}
        feesReinvestedUsd={Math.max(0, position.feesUsd - (position.feesSinceRebalanceUsd ?? 0))}
        feesAccruedUsd={position.feesSinceRebalanceUsd ?? 0}
        costsUsd={position.costsUsd}
        rebalances={position.rebalances}
      />

      {position.hedge && (
        <div className="paper-hedge-line muted">
          🛡 short {position.hedge.sizeBase.toFixed(3)} @ {fmtUsd(position.hedge.entryUsd)} (funding {fmtSigned(position.hedge.fundingUsd)})
        </div>
      )}

      {poolHistory.length >= 2 ? (
        <>
          <Sparkline points={poolHistory} events={poolEvents} />
          <PriceRangeChart poolId={poolId} points={poolHistory} events={poolEvents} />
        </>
      ) : (
        <div className="morning-note muted">too few history points collected yet for this pool.</div>
      )}
    </div>
  );
};

interface Props {
  bot: UseBotApi;
}

const PaperTradingPanel: FC<Props> = ({ bot }) => {
  const { paper, paperStatus } = bot;

  if (paperStatus === 'not-started') {
    return <div className="morning-note">Paper trading will start after the next bot restart.</div>;
  }
  if (paperStatus === 'error') {
    return <div className="morning-note muted">Paper trading unavailable (network or server error).</div>;
  }
  if (paperStatus === 'loading' || !paper) {
    return <div className="morning-note muted">loading paper trading…</div>;
  }

  const { state, history, events } = paper;
  const poolIds = Object.keys(state.positions ?? {}).sort((a, b) => {
    const ia = BOT_POOL_META.findIndex((m) => m.id === a);
    const ib = BOT_POOL_META.findIndex((m) => m.id === b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  let totalEquity = 0;
  let totalHodl = 0;
  let totalStart = 0;
  for (const poolId of poolIds) {
    const position = state.positions[poolId];
    const last = latestFor(history, poolId);
    totalEquity += last?.equityUsd ?? position.capitalUsd ?? state.capitalPerPoolUsd;
    totalHodl += last?.hodlUsd ?? state.capitalPerPoolUsd;
    totalStart += state.capitalPerPoolUsd;
  }
  const totalPnl = totalEquity - totalStart;
  const totalPnlPct = totalStart > 0 ? (totalPnl / totalStart) * 100 : 0;
  const totalVsHodl = totalEquity - totalHodl;

  const recentEvents = [...(events ?? [])]
    .filter((e) => isFinite(Date.parse(e.ts)))
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
    .slice(0, 10);

  return (
    <div className="paper-panel">
      <div className="paper-total-header">
        <div className="paper-total-stat">
          <span className="paper-total-value">{fmtUsd(totalEquity)}</span>
          <span className="muted">Total equity</span>
        </div>
        <div className="paper-total-stat">
          <span className={`paper-total-value ${totalPnl < 0 ? 'forecast-negative' : 'paper-positive'}`}>
            {fmtSigned(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}
            {totalPnlPct.toFixed(1)}%)
          </span>
          <span className="muted">PnL since start</span>
        </div>
        <div className="paper-total-stat">
          <span className={`paper-total-value ${totalVsHodl < 0 ? 'forecast-negative' : 'paper-positive'}`}>{fmtSigned(totalVsHodl)}</span>
          <span className="muted">vs HODL 50/50</span>
        </div>
      </div>
      <div className="muted paper-subtitle">
        simulation ${state.capitalPerPoolUsd.toLocaleString()}/pool, started {new Date(state.startedAt).toLocaleDateString('pl-PL')}
      </div>
      <div className="muted status-legend">
        🟢 in range · ⚠️ out of range (not earning) · 💤 in cash · ⏳ before start · ⛔ trend signal
      </div>

      {poolIds.length === 0 ? (
        <div className="morning-note muted">no pools in paper trading.</div>
      ) : (
        <div className="paper-pool-grid">
          {poolIds.map((poolId) => (
            <PoolCard
              key={poolId}
              poolId={poolId}
              position={state.positions[poolId]}
              history={history}
              events={events ?? []}
              capitalPerPoolUsd={state.capitalPerPoolUsd}
            />
          ))}
        </div>
      )}

      <div className="morning-section-title paper-events-title">Recent events</div>
      {recentEvents.length === 0 ? (
        <div className="morning-note muted">no events yet.</div>
      ) : (
        <div className="paper-events-list">
          {recentEvents.map((e, i) => (
            <div key={`${e.ts}-${e.poolId}-${i}`} className="paper-event-row">
              <span className="paper-event-icon">{EVENT_ICON[e.kind] ?? '•'}</span>
              <span className="muted paper-event-date">{new Date(e.ts).toLocaleString('pl-PL')}</span>
              <span className="paper-event-pool">{poolLabel(e.poolId)}</span>
              <span className="paper-event-kind muted">{e.kind}</span>
            </div>
          ))}
        </div>
      )}

      <div className="muted paper-disclaimer">
        Simulation on live market data. Fees are computed from the band's trailing fee yield (advisor model), not per swap. This is not real money nor
        a guarantee of results.
      </div>
    </div>
  );
};

export default PaperTradingPanel;
