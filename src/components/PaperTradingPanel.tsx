/**
 * PaperTradingPanel.tsx — wizualizacja paper-tradingu (TASKS-UI.md Partia 5,
 * zlecone przez Fable 18.08, decyzja Rafała). Bot prowadzi wirtualny portfel
 * $10k/pula (bot/paper.ts) wg ALGORITHM v1.2 na żywych danych — zero
 * transakcji, czysta symulacja. Rafał chce widzieć dziennie ile algorytm
 * wirtualnie zarabia/traci per pula i łącznie, zwłaszcza vs HODL 50/50.
 *
 * Dane: `bot.paper` / `bot.paperStatus` z useBotApi.ts (GET /api/paper?hours=168,
 * osobny wolniejszy poller niż /api/state — patrz komentarz w useBotApi.ts).
 * Kształt odpowiedzi (HANDOFF Fable→CC-Mac 2026-08-18 ~11:3x, wklejony też
 * do TASKS-UI.md Partia 5):
 *   state.positions[poolId]: {status, capitalUsd, feesUsd, costsUsd,
 *     rebalances, hedge, hedgePnlRealizedUsd, ...}
 *   history[]: {ts, poolId, equityUsd, hodlUsd, feesUsd, costsUsd, inRange,
 *     trendDown, rebalances} — snapshoty co ~15 min, użyte tu do (a) "teraz"
 *     equity/hodl (ostatni punkt per pula — dokładniejszy niż capitalUsd ze
 *     state, bo niesie też hodlUsd potrzebny do "vs HODL") i (b) sparkline.
 *   events[]: {ts, poolId, kind} — lista ostatnich zdarzeń.
 *
 * ZAKRES TWARDY: bot/** tylko do czytania (tu: nie dotknięty w ogóle — panel
 * czyta wyłącznie to, co już przynosi useBotApi.ts). Żadnych przycisków akcji
 * (to symulacja, nic do zatwierdzania), żadnego drugiego pollera /api/state.
 * Wykres jako inline SVG polyline bez nowych zależności — wzorzec
 * ObservationAnalysis.tsx (PoolHistoryChart).
 */
import React, { FC } from 'react';
import { UseBotApi, PaperHistoryPoint, PaperEvent, PaperPosition } from '../hooks/useBotApi';
import { BOT_POOL_META } from '../config/botPools';

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

const EVENT_ICON: Record<string, string> = {
  OPEN: '🔓',
  REBALANCE: '🔄',
  EXIT_TREND: '⛔',
  REENTRY: '🔁',
  HEDGE_OPEN: '🛡',
  HEDGE_CLOSE: '🛡',
};

/** Ostatni punkt historii danej puli (ts rosnąco lub malejąco — sortujemy tu, żeby nie zakładać porządku endpointu). */
function latestFor(history: PaperHistoryPoint[], poolId: string): PaperHistoryPoint | null {
  const pts = history.filter((h) => h.poolId === poolId);
  if (pts.length === 0) return null;
  return pts.reduce((a, b) => (Date.parse(b.ts) > Date.parse(a.ts) ? b : a));
}

const SPARK_W = 260;
const SPARK_H = 46;
const SPARK_PAD = 3;

const Sparkline: FC<{ points: PaperHistoryPoint[] }> = ({ points }) => {
  const pts = [...points]
    .map((p) => ({ ...p, tsMs: Date.parse(p.ts) }))
    .filter((p) => isFinite(p.tsMs))
    .sort((a, b) => a.tsMs - b.tsMs);
  if (pts.length < 2) return null;

  const tMin = pts[0].tsMs;
  const tMax = pts[pts.length - 1].tsMs;
  const tSpan = Math.max(1, tMax - tMin);
  const x = (t: number) => SPARK_PAD + ((t - tMin) / tSpan) * (SPARK_W - 2 * SPARK_PAD);

  const vals = pts.flatMap((p) => [p.equityUsd, p.hodlUsd]).filter((v) => typeof v === 'number' && isFinite(v));
  if (vals.length === 0) return null;
  const yMin = Math.min(...vals);
  const yMax = Math.max(...vals);
  const ySpan = Math.max(1e-9, yMax - yMin);
  const y = (v: number) => SPARK_H - SPARK_PAD - ((v - yMin) / ySpan) * (SPARK_H - 2 * SPARK_PAD);

  const equityLine = pts.map((p) => `${x(p.tsMs).toFixed(1)},${y(p.equityUsd).toFixed(1)}`).join(' ');
  const hodlLine = pts.map((p) => `${x(p.tsMs).toFixed(1)},${y(p.hodlUsd).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="paper-sparkline" preserveAspectRatio="none">
      <polyline className="paper-spark-hodl" points={hodlLine} fill="none" />
      <polyline className="paper-spark-equity" points={equityLine} fill="none" />
    </svg>
  );
};

const PoolCard: FC<{ poolId: string; position: PaperPosition; history: PaperHistoryPoint[]; capitalPerPoolUsd: number }> = ({
  poolId,
  position,
  history,
  capitalPerPoolUsd,
}) => {
  const last = latestFor(history, poolId);
  const equity = last?.equityUsd ?? position.capitalUsd ?? capitalPerPoolUsd;
  const hodl = last?.hodlUsd ?? capitalPerPoolUsd;
  const pnl = equity - capitalPerPoolUsd;
  const vsHodl = equity - hodl;
  const trendDown = last?.trendDown ?? false;
  const poolHistory = history.filter((h) => h.poolId === poolId);

  return (
    <div className="paper-pool-card">
      <div className="paper-pool-header">
        <span>
          {STATUS_ICON[position.status] ?? '·'} {poolLabel(poolId)}
          {trendDown && <span className="paper-badge-trend-down"> ⛔</span>}
        </span>
        <span className="paper-pool-equity">{fmtUsd(equity)}</span>
      </div>

      <div className="paper-pool-stats">
        <div className="paper-pool-stat">
          <span className="muted">PnL od startu</span>
          <span className={pnl < 0 ? 'forecast-negative' : 'paper-positive'}>{fmtSigned(pnl)}</span>
        </div>
        <div className="paper-pool-stat paper-pool-stat-hodl">
          <span className="muted">vs HODL 50/50</span>
          <span className={vsHodl < 0 ? 'forecast-negative' : 'paper-positive'}>{fmtSigned(vsHodl)}</span>
        </div>
        <div className="paper-pool-stat">
          <span className="muted">Fee zebrane</span>
          <span>{fmtUsd(position.feesUsd)}</span>
        </div>
        <div className="paper-pool-stat">
          <span className="muted">Koszty</span>
          <span>{fmtUsd(position.costsUsd)}</span>
        </div>
        <div className="paper-pool-stat">
          <span className="muted">Rebalanse</span>
          <span>{position.rebalances}</span>
        </div>
      </div>

      {position.hedge && (
        <div className="paper-hedge-line muted">
          🛡 short {position.hedge.sizeBase.toFixed(3)} @ {fmtUsd(position.hedge.entryUsd)} (funding {fmtSigned(position.hedge.fundingUsd)})
        </div>
      )}

      {poolHistory.length >= 2 ? (
        <Sparkline points={poolHistory} />
      ) : (
        <div className="morning-note muted">za mało punktów historii jeszcze zebranych dla tej puli.</div>
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
    return <div className="morning-note">Paper trading wystartuje po najbliższym restarcie bota.</div>;
  }
  if (paperStatus === 'error') {
    return <div className="morning-note muted">Paper trading niedostępny (błąd sieci lub serwera).</div>;
  }
  if (paperStatus === 'loading' || !paper) {
    return <div className="morning-note muted">wczytywanie paper-tradingu…</div>;
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
          <span className="muted">Equity łącznie</span>
        </div>
        <div className="paper-total-stat">
          <span className={`paper-total-value ${totalPnl < 0 ? 'forecast-negative' : 'paper-positive'}`}>
            {fmtSigned(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}
            {totalPnlPct.toFixed(1)}%)
          </span>
          <span className="muted">PnL od startu</span>
        </div>
        <div className="paper-total-stat">
          <span className={`paper-total-value ${totalVsHodl < 0 ? 'forecast-negative' : 'paper-positive'}`}>{fmtSigned(totalVsHodl)}</span>
          <span className="muted">vs HODL 50/50</span>
        </div>
      </div>
      <div className="muted paper-subtitle">
        symulacja ${state.capitalPerPoolUsd.toLocaleString()}/pula, start {new Date(state.startedAt).toLocaleDateString('pl-PL')}
      </div>

      {poolIds.length === 0 ? (
        <div className="morning-note muted">brak pul w paper-tradingu.</div>
      ) : (
        <div className="paper-pool-grid">
          {poolIds.map((poolId) => (
            <PoolCard key={poolId} poolId={poolId} position={state.positions[poolId]} history={history} capitalPerPoolUsd={state.capitalPerPoolUsd} />
          ))}
        </div>
      )}

      <div className="morning-section-title paper-events-title">Ostatnie zdarzenia</div>
      {recentEvents.length === 0 ? (
        <div className="morning-note muted">brak zdarzeń jeszcze.</div>
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
        Symulacja na żywych danych rynkowych. Fees liczone z trailing fee-yieldu pasma (model doradcy), nie per-swap. To nie są prawdziwe pieniądze ani
        gwarancja wyników.
      </div>
    </div>
  );
};

export default PaperTradingPanel;
