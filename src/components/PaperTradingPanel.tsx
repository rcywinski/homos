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
 * TASKS-UI.md Partia 7 (pomysł Rafała 20.08, zlecone przez Fable) — widoczność
 * ZAKRESU i momentów wypadnięcia: 19–20.08 ETH +18.7%, 3 pule ETH/stable
 * wypadły z zakresu górą, cbBTC poszła w EXIT_TREND, a na samym sparkline
 * equity-vs-HODL nie było WIDAĆ kiedy. Dodane: (a) cieniowanie stanów
 * (poza zakresem / cash) na sparkline equity-vs-HODL — działa na całej
 * historii, nawet sprzed 20.08 (inRange/status są od zawsze); (b) drugi
 * mini-wykres "cena vs pasmo zakresu bota" — TYLKO gdy pula ma ≥2 próbki
 * z polem `price` (dodane w bot/paper.ts 20.08; starsze próbki go nie mają —
 * feature-detect, nie zakładać obecności); (c) znaczniki zdarzeń
 * EXIT_TREND/REENTRY/REBALANCE na osi czasu obu wykresów.
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

// Pule quote-owane w WETH (np. cbBTC — cena to ~0.0296 WETH/cbBTC) potrzebują
// więcej cyfr znaczących niż pule USD-quote (Partia 7, uwaga ze zlecenia).
const fmtPrice = (poolId: string, v: number): string =>
  poolId.toLowerCase().includes('cbbtc') ? v.toPrecision(4) : v.toLocaleString('en-US', { maximumFractionDigits: 0 });

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
const PRICE_H = 54;

interface TsPoint extends PaperHistoryPoint {
  tsMs: number;
}

function toTsPoints(points: PaperHistoryPoint[]): TsPoint[] {
  return points
    .map((p) => ({ ...p, tsMs: Date.parse(p.ts) }))
    .filter((p) => isFinite(p.tsMs))
    .sort((a, b) => a.tsMs - b.tsMs);
}

function makeXScale(pts: TsPoint[], width: number, pad: number) {
  const tMin = pts[0].tsMs;
  const tMax = pts[pts.length - 1].tsMs;
  const tSpan = Math.max(1, tMax - tMin);
  return (t: number) => pad + ((t - tMin) / tSpan) * (width - 2 * pad);
}

/**
 * Pasy tła współdzielone przez oba wykresy (equity-vs-HODL i cena-vs-zakres):
 * żółtawy = poza zakresem (status open, !inRange), szary = cash (bezpiecznik
 * trendu zaparkował kapitał). Działa na CAŁEJ historii, nawet sprzed 20.08
 * (inRange/status były od zawsze — tylko price/lo/hi są nowe).
 */
function stateBands(pts: TsPoint[], x: (t: number) => number, rightEdge: number) {
  const bands: { x1: number; x2: number; cls: string }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const cls = p.status === 'cash' ? 'paper-range-band-cash' : p.status === 'open' && !p.inRange ? 'paper-range-band-out' : null;
    if (!cls) continue;
    const x1 = x(p.tsMs);
    const x2 = i + 1 < pts.length ? x(pts[i + 1].tsMs) : rightEdge;
    bands.push({ x1, x2, cls });
  }
  return bands;
}

// Znaczniki na wykresach (podzbiór EVENT_ICON — spec Partii 7 wymienia tylko te trzy).
const CHART_EVENT_ICON: Record<string, string> = {
  EXIT_TREND: '⛔',
  REENTRY: '▶',
  REBALANCE: '🔄',
};

const EventMarkers: FC<{ events: PaperEvent[]; x: (t: number) => number; tMin: number; tMax: number; height: number }> = ({
  events,
  x,
  tMin,
  tMax,
  height,
}) => (
  <>
    {events
      .filter((e) => CHART_EVENT_ICON[e.kind])
      .map((e, i) => {
        const ts = Date.parse(e.ts);
        if (!isFinite(ts) || ts < tMin || ts > tMax) return null;
        return (
          <line
            key={`${e.ts}-${i}`}
            x1={x(ts)}
            x2={x(ts)}
            y1={0}
            y2={height}
            className={`paper-range-event-marker paper-range-event-${e.kind.toLowerCase()}`}
          >
            <title>{`${CHART_EVENT_ICON[e.kind]} ${e.kind} · ${new Date(e.ts).toLocaleString('pl-PL')}`}</title>
          </line>
        );
      })}
  </>
);

const Sparkline: FC<{ points: PaperHistoryPoint[]; events: PaperEvent[] }> = ({ points, events }) => {
  const pts = toTsPoints(points);
  if (pts.length < 2) return null;

  const x = makeXScale(pts, SPARK_W, SPARK_PAD);
  const rightEdge = SPARK_W - SPARK_PAD;

  const vals = pts.flatMap((p) => [p.equityUsd, p.hodlUsd]).filter((v) => typeof v === 'number' && isFinite(v));
  if (vals.length === 0) return null;
  const yMin = Math.min(...vals);
  const yMax = Math.max(...vals);
  const ySpan = Math.max(1e-9, yMax - yMin);
  const y = (v: number) => SPARK_H - SPARK_PAD - ((v - yMin) / ySpan) * (SPARK_H - 2 * SPARK_PAD);

  const equityLine = pts.map((p) => `${x(p.tsMs).toFixed(1)},${y(p.equityUsd).toFixed(1)}`).join(' ');
  const hodlLine = pts.map((p) => `${x(p.tsMs).toFixed(1)},${y(p.hodlUsd).toFixed(1)}`).join(' ');
  const bands = stateBands(pts, x, rightEdge);

  return (
    <>
      <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="paper-sparkline" preserveAspectRatio="none">
        {bands.map((b, i) => (
          <rect key={i} x={b.x1} y={0} width={Math.max(0, b.x2 - b.x1)} height={SPARK_H} className={b.cls} />
        ))}
        <polyline className="paper-spark-hodl" points={hodlLine} fill="none" />
        <polyline className="paper-spark-equity" points={equityLine} fill="none" />
        <EventMarkers events={events} x={x} tMin={pts[0].tsMs} tMax={pts[pts.length - 1].tsMs} height={SPARK_H} />
      </svg>
      {bands.length > 0 && <div className="muted paper-range-legend">żółte tło = poza zakresem · szare tło = cash (bezpiecznik)</div>}
    </>
  );
};

/**
 * Mini-wykres "cena vs pasmo zakresu bota" — TYLKO gdy pula ma ≥2 próbki
 * z `price` (bot/paper.ts, od 20.08). Pasmo lo–hi rysowane per interwał
 * "od próbki do następnej" — daje efekt schodkowy przy rebalansie (granice
 * realnie się zmieniają skokowo, nie płynnie). Linia ceny dzielona na
 * ciągłe odcinki (przerwa tam, gdzie stare próbki sprzed 20.08 nie mają
 * pola `price` w ogóle — feature-detect, nie interpolować przez dziurę).
 */
const PriceRangeChart: FC<{ poolId: string; points: PaperHistoryPoint[]; events: PaperEvent[] }> = ({ poolId, points, events }) => {
  const pts = toTsPoints(points);
  const priceCount = pts.filter((p) => typeof p.price === 'number' && isFinite(p.price as number)).length;
  if (pts.length < 2 || priceCount < 2) return null;

  const x = makeXScale(pts, SPARK_W, SPARK_PAD);
  const rightEdge = SPARK_W - SPARK_PAD;

  const yVals = pts.flatMap((p) => [p.price, p.lo, p.hi]).filter((v): v is number => typeof v === 'number' && isFinite(v));
  const yMin0 = Math.min(...yVals);
  const yMax0 = Math.max(...yVals);
  const margin = Math.max(1e-9, (yMax0 - yMin0) * 0.06);
  const yMin = yMin0 - margin;
  const yMax = yMax0 + margin;
  const ySpan = Math.max(1e-9, yMax - yMin);
  const y = (v: number) => PRICE_H - SPARK_PAD - ((v - yMin) / ySpan) * (PRICE_H - 2 * SPARK_PAD);

  const bands = stateBands(pts, x, rightEdge);

  const rangeSegs: { x1: number; x2: number; yTop: number; yBottom: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.status !== 'open' || typeof p.lo !== 'number' || typeof p.hi !== 'number') continue;
    const x1 = x(p.tsMs);
    const x2 = i + 1 < pts.length ? x(pts[i + 1].tsMs) : rightEdge;
    rangeSegs.push({ x1, x2, yTop: y(p.hi), yBottom: y(p.lo) });
  }

  const priceSegs: string[] = [];
  let cur: string[] = [];
  for (const p of pts) {
    if (typeof p.price === 'number' && isFinite(p.price)) {
      cur.push(`${x(p.tsMs).toFixed(1)},${y(p.price).toFixed(1)}`);
    } else if (cur.length) {
      priceSegs.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) priceSegs.push(cur.join(' '));

  const last = [...pts].reverse().find((p) => typeof p.price === 'number' && isFinite(p.price as number));

  return (
    <div className="paper-range-chart-wrap">
      <svg viewBox={`0 0 ${SPARK_W} ${PRICE_H}`} className="paper-range-chart" preserveAspectRatio="none">
        {bands.map((b, i) => (
          <rect key={i} x={b.x1} y={0} width={Math.max(0, b.x2 - b.x1)} height={PRICE_H} className={b.cls} />
        ))}
        {rangeSegs.map((s, i) => (
          <rect key={i} x={s.x1} y={s.yTop} width={Math.max(0, s.x2 - s.x1)} height={Math.max(0, s.yBottom - s.yTop)} className="paper-range-band" />
        ))}
        {priceSegs.map((seg, i) => (
          <polyline key={i} className="paper-range-price-line" points={seg} fill="none" />
        ))}
        <EventMarkers events={events} x={x} tMin={pts[0].tsMs} tMax={pts[pts.length - 1].tsMs} height={PRICE_H} />
      </svg>
      {last && typeof last.price === 'number' && (
        <div className="muted paper-range-caption">
          cena: {fmtPrice(poolId, last.price)}
          {typeof last.lo === 'number' && typeof last.hi === 'number' && (
            <>
              {' '}
              · zakres: {fmtPrice(poolId, last.lo)}–{fmtPrice(poolId, last.hi)}
            </>
          )}
        </div>
      )}
    </div>
  );
};

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
        <>
          <Sparkline points={poolHistory} events={poolEvents} />
          <PriceRangeChart poolId={poolId} points={poolHistory} events={poolEvents} />
        </>
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
