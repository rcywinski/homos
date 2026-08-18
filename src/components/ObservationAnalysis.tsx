/**
 * ObservationAnalysis.tsx — "Analiza obserwacji" (HANDOFF Fable→Sonnet
 * 2026-08-11 ~19:4x). Zwijana sekcja w kokpicie (wzorzec BotTelemetry.tsx),
 * docelowo zostaje na produkcji jako podgląd "czy zamrożone parametry
 * (walk-forward) nadal wygrywają" na świeżych danych.
 *
 * Dwa endpointy, których JESZCZE NIE MA na serwerze bota (Fable dodaje je
 * "jutro" w bot/server.ts) — cały fetch jest defensywny, 404/błąd sieci ==
 * po prostu pokazujemy fallback tekst, zero crashy:
 *  1. GET {base}/api/history?hours=72 — snapshoty co 15 min per pula
 *     ({ts, poolId, price, volDaily, feeYieldDaily, rangeLo, rangeHi,
 *     emaGapPct}). Kształt odpowiedzi jest niepewny (JSON array vs NDJSON) —
 *     parseHistoryResponse próbuje oba.
 *  2. GET {base}/api/results/<nazwa>.json — pliki z backtest/results/
 *     (Windows). Nazwa pliku nie jest jednoznacznie ustalona w HANDOFF —
 *     przyjęta konwencja to `walkforward-<botPoolId>-365d-45d` (dopasowane
 *     do plików faktycznie widocznych w backtest/results/, np.
 *     walkforward-base-weth-usdc-030-365d-45d.json). Jeśli Fable wystawi
 *     endpoint pod inną nazwą, wystarczy poprawić WALKFORWARD_NAME_SUFFIX
 *     poniżej — reszta komponentu się nie zmienia.
 *
 * Znaczniki propozycji na osi czasu: state.proposals (już w useBotApi, zero
 * nowych fetchy) — pionowa kreska na wykresie właściwej puli.
 *
 * Tabela trafności propozycji (co było N dni po sygnale) świadomie NIE jest
 * tu budowana — wymaga logiki po stronie bota (HANDOFF, decyzja Fable).
 *
 * ZAKRES TWARDY (TASKS-UI.md): tylko warstwa wizualna, wykresy jako inline
 * SVG polyline bez nowych zależności — jak krzywe w backtest/report.html.
 */
import React, { FC, useEffect, useState } from 'react';
import { UseBotApi, BotProposal } from '../hooks/useBotApi';
import { BOT_POOL_META } from '../config/botPools';

interface HistoryPoint {
  // BUG-CHECK 2026-08-17 (HANDOFF Fable→Sonnet): observer.ts pisze
  // `ts: new Date().toISOString()` (string), NIE liczbę sekund jak zakładał
  // ten komentarz. Realny endpoint zwraca więc ISO string. Trzymamy typ
  // szeroki i normalizujemy przez tsSeconds() poniżej — to był powód
  // pustych wykresów (a.ts - b.ts na stringach = NaN, cała krzywa NaN).
  ts: number | string;
  poolId: string;
  price: number;
  volDaily?: number;
  feeYieldDaily?: number;
  rangeLo?: number;
  rangeHi?: number;
  emaGapPct?: number;
}

interface WalkforwardSummaryRow {
  mean: number;
  med?: number;
  winPct: number;
  worst: number;
  best?: number;
  windows?: number;
}

interface WalkforwardFile {
  id?: string;
  summary?: Record<string, WalkforwardSummaryRow>;
}

const EMA_GAP_DANGER_PCT = -5; // ALGORITHM.md §4 — próg bezpiecznika trendu
const WALKFORWARD_NAME_SUFFIX = '-365d-45d';

/** Normalizuje HistoryPoint.ts (ISO string z observer.ts, ale defensywnie też liczby s/ms) do epoch-sekund. */
function tsSeconds(v: number | string): number {
  if (typeof v === 'number') return v > 1e12 ? v / 1000 : v; // ms vs s heurystyka
  const ms = Date.parse(v);
  return isFinite(ms) ? ms / 1000 : NaN;
}

interface Props {
  bot: UseBotApi;
}

/** Obsługuje zarówno JSON-array, jak i NDJSON (jedna linia = jeden obiekt) — kształt endpointu nie jest jeszcze ustalony. */
function parseHistoryResponse(text: string): HistoryPoint[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed as HistoryPoint[];
  } catch {
    // nie jest to pojedynczy JSON — spróbuj NDJSON
  }
  const out: HistoryPoint[] = [];
  for (const line of trimmed.split('\n')) {
    const l = line.trim();
    if (!l) continue;
    try {
      out.push(JSON.parse(l) as HistoryPoint);
    } catch {
      // pomiń pojedynczą uszkodzoną linię — endpoint dopiero powstaje
    }
  }
  return out;
}

function useHistory(apiBase: string, apiToken: string, hours: number) {
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
        const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/history?hours=${hours}`, { headers });
        if (!res.ok) throw new Error(String(res.status));
        const text = await res.text();
        const parsed = parseHistoryResponse(text);
        if (!cancelled) {
          setPoints(parsed);
          setFailed(parsed.length === 0);
        }
      } catch {
        if (!cancelled) {
          setPoints(null);
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, apiToken, hours]);

  return { points, failed };
}

function useWalkforward(apiBase: string, apiToken: string, name: string) {
  const [result, setResult] = useState<WalkforwardFile | null>(null);
  const [fileDate, setFileDate] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
        const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/results/${name}.json`, { headers });
        if (!res.ok) throw new Error(String(res.status));
        const lastMod = res.headers.get('Last-Modified');
        const data = (await res.json()) as WalkforwardFile;
        if (!cancelled) {
          setResult(data);
          setFileDate(lastMod);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setResult(null);
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, apiToken, name]);

  return { result, fileDate, failed };
}

const CHART_W = 640;
const CHART_H = 150;
const CHART_PAD = 20;
const EMA_H = 36;

const KIND_LABEL: Record<string, string> = {
  REBALANCE: 'REBALANCE',
  OPEN: 'OPEN',
  ROTATE: 'ROTATE',
  EXIT_TREND: 'EXIT_TREND',
  HEDGE: 'HEDGE',
};

const PoolHistoryChart: FC<{ points: HistoryPoint[]; proposals: BotProposal[] }> = ({ points, proposals }) => {
  const pts = [...points]
    .map((p) => ({ ...p, tsSec: tsSeconds(p.ts) }))
    .filter((p) => isFinite(p.tsSec))
    .sort((a, b) => a.tsSec - b.tsSec);
  if (pts.length < 2) {
    return <div className="morning-note muted">za mało punktów historii jeszcze zebranych dla tej puli.</div>;
  }

  const tMin = pts[0].tsSec;
  const tMax = pts[pts.length - 1].tsSec;
  const tSpan = Math.max(1, tMax - tMin);
  const x = (t: number) => CHART_PAD + ((t - tMin) / tSpan) * (CHART_W - 2 * CHART_PAD);

  const prices = pts.map((p) => p.price).filter((v) => typeof v === 'number' && isFinite(v));
  const ranges = pts.flatMap((p) => [p.rangeLo, p.rangeHi]).filter((v): v is number => typeof v === 'number' && isFinite(v));
  const allY = [...prices, ...ranges];
  const yMin = allY.length ? Math.min(...allY) : 0;
  const yMax = allY.length ? Math.max(...allY) : 1;
  const ySpan = Math.max(1e-9, yMax - yMin);
  const y = (v: number) => CHART_H - CHART_PAD - ((v - yMin) / ySpan) * (CHART_H - 2 * CHART_PAD);

  const priceLine = pts
    .filter((p) => typeof p.price === 'number' && isFinite(p.price))
    .map((p) => `${x(p.tsSec).toFixed(1)},${y(p.price).toFixed(1)}`)
    .join(' ');

  const hasRange = pts.some((p) => typeof p.rangeLo === 'number' && typeof p.rangeHi === 'number');
  const loPts = pts.filter((p) => typeof p.rangeLo === 'number');
  const hiPts = pts.filter((p) => typeof p.rangeHi === 'number');
  const rangeBand = hasRange
    ? [...loPts.map((p) => `${x(p.tsSec).toFixed(1)},${y(p.rangeLo as number).toFixed(1)}`), ...hiPts.map((p) => `${x(p.tsSec).toFixed(1)},${y(p.rangeHi as number).toFixed(1)}`).reverse()].join(' ')
    : '';

  const emaPts = pts.filter((p) => typeof p.emaGapPct === 'number');
  const hasEma = emaPts.length > 0;
  const emaVals = emaPts.map((p) => p.emaGapPct as number);
  const emaMin = Math.min(EMA_GAP_DANGER_PCT, ...(emaVals.length ? emaVals : [0]));
  const emaMax = Math.max(0, ...(emaVals.length ? emaVals : [0]));
  const emaSpan = Math.max(1e-9, emaMax - emaMin);
  const yEma = (v: number) => EMA_H - ((v - emaMin) / emaSpan) * EMA_H;
  const emaLine = emaPts.map((p) => `${x(p.tsSec).toFixed(1)},${yEma(p.emaGapPct as number).toFixed(1)}`).join(' ');
  const dangerY = yEma(EMA_GAP_DANGER_PCT);

  return (
    <div className="observation-chart-wrap">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="observation-chart" preserveAspectRatio="none">
        {hasRange && rangeBand && <polygon className="observation-range-band" points={rangeBand} />}
        <polyline className="observation-price-line" points={priceLine} fill="none" />
        {proposals.map((p) => {
          const ts = new Date(p.createdAt).getTime() / 1000;
          if (!isFinite(ts) || ts < tMin || ts > tMax) return null;
          const kind = p.kind ?? 'REBALANCE';
          return (
            <line
              key={p.id}
              x1={x(ts)}
              x2={x(ts)}
              y1={CHART_PAD}
              y2={CHART_H - CHART_PAD}
              className={`observation-proposal-marker observation-marker-${kind.toLowerCase()}`}
            >
              <title>{`${KIND_LABEL[kind] ?? kind} · ${new Date(p.createdAt).toLocaleString('pl-PL')}`}</title>
            </line>
          );
        })}
      </svg>
      {hasEma && (
        <svg viewBox={`0 0 ${CHART_W} ${EMA_H}`} className="observation-ema-chart" preserveAspectRatio="none">
          <rect x={0} y={Math.max(0, dangerY)} width={CHART_W} height={Math.max(0, EMA_H - Math.max(0, dangerY))} className="observation-ema-danger-zone" />
          <line x1={0} x2={CHART_W} y1={dangerY} y2={dangerY} className="observation-ema-threshold" />
          <polyline className="observation-ema-line" points={emaLine} fill="none" />
        </svg>
      )}
      <div className="observation-chart-legend muted">
        cena{hasRange ? ' · pasmo zakresu bota' : ''}
        {hasEma ? ` · emaGapPct (czerwone tło = pod progiem bezpiecznika ${EMA_GAP_DANGER_PCT}%)` : ''}
        {proposals.length > 0 ? ' · pionowe kreski = propozycje bota' : ''}
      </div>
    </div>
  );
};

const WalkforwardMiniTable: FC<{ botPoolId: string; apiBase: string; apiToken: string }> = ({ botPoolId, apiBase, apiToken }) => {
  const { result, fileDate, failed } = useWalkforward(apiBase, apiToken, `walkforward-${botPoolId}${WALKFORWARD_NAME_SUFFIX}`);

  if (failed || !result?.summary) {
    return <div className="morning-note muted">ostatni walk-forward: niedostępny (bot sprzed aktualizacji, albo brak wyniku dla tej puli).</div>;
  }
  const rows = Object.entries(result.summary);
  if (rows.length === 0) return null;

  return (
    <div className="observation-walkforward-wrap">
      <div className="telemetry-table-wrap">
        <table className="telemetry-table observation-walkforward-table">
          <thead>
            <tr>
              <th>Strategia</th>
              <th>mean %</th>
              <th>winPct</th>
              <th>worst %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, r]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{r.mean.toFixed(2)}</td>
                <td>{r.winPct.toFixed(0)}%</td>
                <td>{r.worst.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fileDate && <div className="muted observation-walkforward-date">plik z: {fileDate}</div>}
    </div>
  );
};

const ObservationAnalysis: FC<Props> = ({ bot }) => {
  const [expanded, setExpanded] = useState(false);
  const { points, failed: historyFailed } = useHistory(bot.apiBase, bot.apiToken, 72);
  const proposals = bot.state?.proposals ?? [];

  const historyUnavailable = !points || points.length === 0 || historyFailed;

  return (
    <div className="telemetry-section">
      <div className="telemetry-header" onClick={() => setExpanded((e) => !e)}>
        <span className="morning-section-title telemetry-title">Analiza obserwacji</span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {historyUnavailable ? (
            <div className="morning-note">historia niedostępna (bot sprzed aktualizacji)</div>
          ) : (
            BOT_POOL_META.map((meta) => {
              const poolPoints = (points as HistoryPoint[]).filter((p) => p.poolId === meta.id);
              if (poolPoints.length === 0) return null;
              const poolProposals = proposals.filter((p) => p.poolId === meta.id);
              return (
                <div key={meta.id} className="observation-pool-block">
                  <div className="morning-section-title observation-pool-title">
                    {meta.sym0}/{meta.sym1} · {(meta.feeBps / 10_000).toFixed(2)}%
                  </div>
                  <PoolHistoryChart points={poolPoints} proposals={poolProposals} />
                </div>
              );
            })
          )}

          <div className="morning-section-title observation-section-title">Algorytm vs świeże dane (ostatni walk-forward)</div>
          {BOT_POOL_META.map((meta) => (
            <div key={meta.id} className="observation-pool-block">
              <div className="observation-pool-title muted">
                {meta.sym0}/{meta.sym1} · {meta.id}
              </div>
              <WalkforwardMiniTable botPoolId={meta.id} apiBase={bot.apiBase} apiToken={bot.apiToken} />
            </div>
          ))}

          <div className="morning-note muted observation-footer-note">
            Tabela trafności propozycji (co było N dni po sygnale) — poza zakresem tej sekcji, wymaga logiki po stronie bota.
          </div>
        </div>
      )}
    </div>
  );
};

export default ObservationAnalysis;
