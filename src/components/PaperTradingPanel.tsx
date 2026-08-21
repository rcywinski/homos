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
 *
 * Partia 10 (20.08): logika wykresów (Sparkline/PriceRangeChart/EventMarkers/
 * stateBands/orientacja ceny) wyekstrahowana do PositionCharts.tsx — używana
 * teraz też przez karty REALNYCH pozycji w MorningCockpit.tsx. Tu zostaje
 * tylko import + mapowanie PaperHistoryPoint→EquityChartPoint (structural
 * typing — PaperHistoryPoint ma equityUsd, więc pasuje bez zmian).
 */
import React, { FC } from 'react';
import { UseBotApi, PaperHistoryPoint, PaperEvent, PaperPosition } from '../hooks/useBotApi';
import { BOT_POOL_META } from '../config/botPools';
import { Sparkline, PriceRangeChart } from './PositionCharts';
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

/** Ikona stanu pozycji. WAŻNE (prośba Rafała 21.08): pozycja OTWARTA, ale poza
 *  zakresem, nie zarabia opłat — a do tej pory świeciła tą samą zieloną kropką
 *  co zdrowa. Dlatego out-of-range PODMIENIA ikonę (jedna ikona = jeden stan),
 *  zamiast dokładać drugi znaczek obok. */
const statusIcon = (status: string, inRange: boolean | undefined): string =>
  status === 'open' && inRange === false ? '⚠️' : (STATUS_ICON[status] ?? '·');

/** Histereza rebalansu w paper-tradingu: 24h NIEPRZERWANIE poza zakresem
 *  (bot/paper.ts HYSTERESIS_MS). Trzymamy tu kopię stałej, bo UI nie importuje
 *  kodu bota — gdyby zmieniła się tam, trzeba poprawić i tu. */
const HYSTERESIS_MS = 24 * 3600 * 1000;

const statusTitle = (status: string, inRange: boolean | undefined): string => {
  if (status === 'open') return inRange === false ? 'POZA zakresem — pozycja nie nalicza opłat' : 'W zakresie — pozycja zarabia';
  if (status === 'cash') return 'W gotówce po bezpieczniku trendu — czeka na powrót';
  if (status === 'pending') return 'Przed pierwszym otwarciem';
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

/** Ostatni punkt historii danej puli (ts rosnąco lub malejąco — sortujemy tu, żeby nie zakładać porządku endpointu). */
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
            <span className="paper-badge-trend-down" title="Sygnał bezpiecznika trendu (cena pod EMA)">
              {' '}
              ⛔
            </span>
          )}
        </span>
        <span className="paper-pool-equity">{fmtUsd(equity)}</span>
      </div>

      {/* Licznik wypadnięcia (prośba Rafała 21.08). Pokazujemy TYLKO gdy
          pozycja jest otwarta i poza zakresem. `outOfRangeSince` zeruje się
          przy każdym powrocie do zakresu — to licznik CIĄGŁEGO wypadnięcia. */}
      {position.status === 'open' && last?.inRange === false && (
        <div className="out-of-range-timer">
          {position.outOfRangeSince ? (
            (() => {
              const elapsed = Date.now() - position.outOfRangeSince;
              const left = HYSTERESIS_MS - elapsed;
              return (
                <>
                  <span className="out-of-range-elapsed">Poza zakresem: {formatDuration(elapsed)}</span>
                  {left > 0 ? (
                    <span className="muted" title="Po upływie 24h bot sprawdzi jeszcze, czy koszt rebalansu zwróci się z opłat w ≤7 dni. Powrót do zakresu zeruje licznik.">
                      {' '}
                      · próg rebalansu za {formatDuration(left)}
                    </span>
                  ) : (
                    <span className="muted" title="Próg 24h minięty — rebalans czeka już tylko na warunek opłacalności (payback ≤7 dni).">
                      {' '}
                      · próg 24h minięty, czeka na opłacalność
                    </span>
                  )}
                </>
              );
            })()
          ) : (
            <span className="out-of-range-elapsed" title="Bot jeszcze nie zapisał momentu wypadnięcia (licznik ustawia się w najbliższym cyklu 15-minutowym).">
              Poza zakresem (licznik startuje w najbliższym cyklu)
            </span>
          )}
        </div>
      )}

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
          <span className="muted">Fee reinwestowane</span>
          <span>{fmtUsd(Math.max(0, position.feesUsd - (position.feesSinceRebalanceUsd ?? 0)))}</span>
        </div>
        <div className="paper-pool-stat">
          <span className="muted">Fee narosłe (do reinwestycji)</span>
          <span>{fmtUsd(position.feesSinceRebalanceUsd ?? 0)}</span>
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
      <div className="muted status-legend">
        🟢 w zakresie · ⚠️ poza zakresem (nie zarabia) · 💤 w gotówce · ⏳ przed startem · ⛔ sygnał trendu
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
