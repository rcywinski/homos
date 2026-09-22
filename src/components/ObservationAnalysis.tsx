/**
 * ObservationAnalysis.tsx — "Observation analysis" (HANDOFF Fable→Sonnet
 * 2026-08-11 ~19:4x). Collapsible section in the cockpit (BotTelemetry.tsx pattern),
 * intended to stay in production as a view of "do the frozen parameters
 * (walk-forward) still win" on fresh data.
 *
 * Two endpoints that DO NOT EXIST YET on the bot server (Fable adds them
 * "tomorrow" in bot/server.ts) — the whole fetch is defensive, 404/network error ==
 * we simply show fallback text, zero crashes:
 *  1. GET {base}/api/history?hours=72 — snapshots every 15 min per pool
 *     ({ts, poolId, price, volDaily, feeYieldDaily, rangeLo, rangeHi,
 *     emaGapPct}). The response shape is uncertain (JSON array vs NDJSON) —
 *     parseHistoryResponse tries both.
 *  2. GET {base}/api/results/<name>.json — files from backtest/results/
 *     (Windows). The file name is not unambiguously fixed in HANDOFF —
 *     the adopted convention is `walkforward-<botPoolId>-365d-45d` (matched
 *     to the files actually visible in backtest/results/, e.g.
 *     walkforward-base-weth-usdc-030-365d-45d.json). If Fable exposes the
 *     endpoint under a different name, it is enough to fix WALKFORWARD_NAME_SUFFIX
 *     below — the rest of the component does not change.
 *
 * Proposal markers on the time axis: state.proposals (already in useBotApi, zero
 * new fetches) — a vertical line on the chart of the relevant pool.
 *
 * The proposal hit-rate table (what happened N days after the signal) is deliberately NOT
 * built here — it requires bot-side logic (HANDOFF, Fable's decision).
 *
 * HARD SCOPE (TASKS-UI.md): visual layer only, charts as inline
 * SVG polyline without new dependencies — like the curves in backtest/report.html.
 */
import React, { FC, useEffect, useState } from 'react';
import { UseBotApi, BotProposal } from '../hooks/useBotApi';
import { BOT_POOL_META } from '../config/botPools';

interface HistoryPoint {
  // BUG-CHECK 2026-08-17 (HANDOFF Fable→Sonnet): observer.ts writes
  // `ts: new Date().toISOString()` (string), NOT a number of seconds as this
  // comment assumed. So the real endpoint returns an ISO string. We keep the type
  // wide and normalize via tsSeconds() below — this was the cause of
  // empty charts (a.ts - b.ts on strings = NaN, the whole curve NaN).
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

const EMA_GAP_DANGER_PCT = -5; // ALGORITHM.md §4 — trend safety-switch threshold
// BATCH 20 item 3 (review 31.08): the table read `-365d-45d` files —
// walk-forward of the ALGORITHM v1.2 strategy (advisor's k×σ), which the bot NO
// LONGER PLAYS (the product since 27–29.08 is the FlatWide hybrid with a fixed
// narrow-leg width, see backtest/walkforward.ts mkHybrid/mkProduct, WF_SET=hybrid|
// product). Instead we read the latest runs on 720-day history
// (`walkforward-<botPoolId>-720d-30d.json`, backtest/walkforward.ts:373 —
// the file name carries the data window from the run ID, not the WF_SET env, so
// matching is by the file name SUFFIX, not by content; `summary`
// renders generically as before, whatever strategies are in it).
// Feature-detect: when the file for a given pool is missing (404), WalkforwardPoolBlock
// does not render at all (no verdicts of the abandoned v1.2 strategy) —
// without hard-coding a pool list, simply by what the API actually answers.
const WALKFORWARD_NAME_SUFFIX = '-720d-30d';

/** Normalizes HistoryPoint.ts (ISO string from observer.ts, but defensively also s/ms numbers) to epoch seconds. */
function tsSeconds(v: number | string): number {
  if (typeof v === 'number') return v > 1e12 ? v / 1000 : v; // ms vs s heuristic
  const ms = Date.parse(v);
  return isFinite(ms) ? ms / 1000 : NaN;
}

interface Props {
  bot: UseBotApi;
}

/** Handles both a JSON array and NDJSON (one line = one object) — the endpoint shape is not fixed yet. */
function parseHistoryResponse(text: string): HistoryPoint[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed as HistoryPoint[];
  } catch {
    // not a single JSON — try NDJSON
  }
  const out: HistoryPoint[] = [];
  for (const line of trimmed.split('\n')) {
    const l = line.trim();
    if (!l) continue;
    try {
      out.push(JSON.parse(l) as HistoryPoint);
    } catch {
      // skip a single corrupted line — the endpoint is still being built
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
    return <div className="morning-note muted">too few history points collected yet for this pool.</div>;
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
        price{hasRange ? ' · bot range band' : ''}
        {hasEma ? ` · emaGapPct (red background = below the safety-switch threshold ${EMA_GAP_DANGER_PCT}%)` : ''}
        {proposals.length > 0 ? ' · vertical lines = bot proposals' : ''}
      </div>
    </div>
  );
};

// BATCH 20 item 3: the whole block (title + table) for a given pool — NOT only
// the table as before (WalkforwardMiniTable) — because the review decision is
// "HIDE the section", i.e. together with the "pair · botPoolId" header, not just
// replace the table content with a note. Returns null when the 720d-30d file for this
// pool is missing (404/network error) or `summary` is empty — no verdicts of a
// strategy we abandoned, nor empty headers without content.
const WalkforwardPoolBlock: FC<{ meta: { id: string; sym0: string; sym1: string }; apiBase: string; apiToken: string }> = ({ meta, apiBase, apiToken }) => {
  const { result, fileDate, failed } = useWalkforward(apiBase, apiToken, `walkforward-${meta.id}${WALKFORWARD_NAME_SUFFIX}`);

  if (failed || !result?.summary) return null;
  const rows = Object.entries(result.summary);
  if (rows.length === 0) return null;

  return (
    <div className="observation-pool-block">
      <div className="observation-pool-title muted">
        {meta.sym0}/{meta.sym1} · {meta.id}
      </div>
      <div className="observation-walkforward-wrap">
        <div className="telemetry-table-wrap">
          <table className="telemetry-table observation-walkforward-table">
            <thead>
              <tr>
                <th>Strategy</th>
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
        {fileDate && <div className="muted observation-walkforward-date">file from: {fileDate}</div>}
      </div>
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
        <span className="morning-section-title telemetry-title">Observation analysis</span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {historyUnavailable ? (
            <div className="morning-note">history unavailable (bot predates the update)</div>
          ) : (
            BOT_POOL_META.map((meta) => {
              const poolPoints = (points as HistoryPoint[]).filter((p) => p.poolId === meta.id);
              if (poolPoints.length === 0) return null;
              const poolProposals = proposals.filter((p) => p.poolId === meta.id);
              // Batch 16 item 3: flat state badge — ONLY product pools have
              // these fields populated (feature-detect, see useBotApi.ts
              // BotPoolLive.flatSince/flatConfirmed); the rest show nothing.
              const poolLive = bot.state?.pools?.find((pl) => pl.id === meta.id);
              const flatBadge = poolLive?.flatConfirmed ? (
                <span className="observation-flat-badge observation-flat-badge--confirmed" title="Flat confirmed (≥12h uninterrupted) — narrowing proposal (FLAT_NARROW) active or possible">
                  {' '}
                  FLAT ✅
                </span>
              ) : poolLive?.flatSince ? (
                <span
                  className="observation-flat-badge muted"
                  title="The clock counts the time of uninterrupted flat (|gap|<threshold) — confirmation (and the FLAT_NARROW proposal) only after 12h uninterrupted"
                >
                  {' '}
                  flat: clock since {new Date(poolLive.flatSince).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} (confirmation after 12h)
                </span>
              ) : null;
              return (
                <div key={meta.id} className="observation-pool-block">
                  <div className="morning-section-title observation-pool-title">
                    {meta.sym0}/{meta.sym1} · {(meta.feeBps / 10_000).toFixed(2)}%
                    {flatBadge}
                  </div>
                  <PoolHistoryChart points={poolPoints} proposals={poolProposals} />
                </div>
              );
            })
          )}

          {/* BATCH 20 item 3: header updated — `-365d-45d` files
              (ALGORITHM v1.2, advisor's k×σ) replaced by the 720d hybrid
              runs (WF_SET=product/hybrid, backtest/walkforward.ts), which the
              bot actually plays since 27–29.08. Pools without a 720d-30d result on
              the server simply do not render the block (WalkforwardPoolBlock
              returns null) — we do not show verdicts of the abandoned strategy. */}
          <div className="morning-section-title observation-section-title">Algorithm vs fresh data (hybrid walk-forward, 720d)</div>
          {BOT_POOL_META.map((meta) => (
            <WalkforwardPoolBlock key={meta.id} meta={meta} apiBase={bot.apiBase} apiToken={bot.apiToken} />
          ))}

          <div className="morning-note muted observation-footer-note">
            Proposal hit-rate table (what happened N days after the signal) — outside the scope of this section, requires bot-side logic.
          </div>
        </div>
      )}
    </div>
  );
};

export default ObservationAnalysis;
