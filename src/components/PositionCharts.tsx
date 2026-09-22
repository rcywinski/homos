/**
 * PositionCharts.tsx — charts shared by the paper-trading panel
 * (PaperTradingPanel.tsx, Batch 5/7) and the REAL position cards (MorningCockpit.tsx,
 * TASKS-UI.md Batch 10 — "position card redesign after the paper pattern"). Extracted
 * from PaperTradingPanel.tsx instead of copied, so a fix made once (e.g. the price
 * orientation bug, P7 review 20.08) works in both places forever.
 *
 * Generic over the point shape — `EquityChartPoint` requires only the fields
 * actually used by the charts (equityUsd/hodlUsd/inRange/status?/
 * price?/lo?/hi?). Real positions (`PositionHistoryPoint` from useBotApi.ts) have
 * `valueUsd` instead of `equityUsd` and NO `status` field (a position is "open"
 * as long as the bot sees it — there is no cash/pending state as in paper) — the caller
 * maps `{...p, equityUsd: p.valueUsd}` before passing here; `status`
 * is then omitted entirely, which `stateBands()` correctly interprets as
 * "never cash, shade only on !inRange" (see the comment at stateBands).
 *
 * Charts as inline SVG polyline without new dependencies — the
 * ObservationAnalysis.tsx pattern (PoolHistoryChart), as in the original P5/P7.
 */
import React, { FC } from 'react';
import { BOT_POOL_META } from '../config/botPools';

export interface EquityChartPoint {
  ts: string;
  equityUsd: number;
  hodlUsd: number;
  inRange: boolean;
  /** present only for paper (open/cash/pending); real positions have no cash — omit the field. */
  status?: string;
  price?: number;
  lo?: number;
  hi?: number;
}

export interface ChartEvent {
  ts: string;
  kind: string;
}

// Pools quoted in WETH (e.g. cbBTC — price is ~0.0296 WETH/cbBTC) need
// more significant digits than USD-quoted pools (Batch 7, note from the brief).
export const fmtPrice = (poolId: string, v: number): string =>
  poolId.toLowerCase().includes('cbbtc') ? v.toPrecision(4) : v.toLocaleString('en-US', { maximumFractionDigits: 0 });

// Price orientation — FIX after the P7 review (Fable→Sonnet 2026-08-20):
// `price`/`lo`/`hi` from bot/paper.ts (and analogously bot/observer.ts for
// real positions) are "human" token1-per-token0 (Uniswap convention), NOT
// always USD. For mainnet pools (sym0='USDC', sym1='WETH') it is WETH-per-USDC
// ≈ 0.00044 — rounds to zero in the UI. Pattern from the rest of the cockpit
// (AddLiquidity.tsx/MyPositions.tsx/CockpitPositionActions.tsx):
// `ethIsToken0 ? raw : 1/raw`. cbBTC (sym0='WETH', quote cbBTC) has
// ethIsToken0=true → NO change, stays the readable 0.03183 (per the
// brief — there is no USD leg to invert to).
export const ethIsToken0 = (poolId: string): boolean => {
  const meta = BOT_POOL_META.find((m) => m.id === poolId);
  return meta ? meta.sym0.includes('ETH') : true;
};

// Batch 16 (FLAT_NARROW/FLAT_WIDEN proposal cards): whitelist duplicated
// from isStableQuote in CockpitPositionActions.tsx (RebalanceModal) — computed there
// from full token objects (PortfolioPosition/RebalanceTarget), here from
// the poolId alone (BOT_POOL_META), because proposal cards only have `p.poolId`,
// not full token data. Keep in sync manually should the list change
// (the same duplication convention as the rest of this file/BOT_POOL_META).
const STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'USDBC', 'USDE', 'FRAX', 'LUSD']);

/** Formats the `suggestedRange.usdLo/usdHi` value of a bot proposal.
 *  FIX 11.09 (HANDOFF Fable→Sonnet, FLAT_EXIT/WIDENING card + Telegram
 *  text): for pairs WITHOUT a stablecoin leg (today: cbBTC/WETH) this function
 *  so far treated `value` as the raw pool ratio (cbBTC-per-WETH) and
 *  appended the unit "otherSide/ethSide" — wrong. The bot (tickToUsd in
 *  bot/observer.ts, `quote: 'WETH'`) for these pools ALREADY converts the tick to
 *  real USD via the reference rate (refEthUsd, usdRefPoolId ⇒ see the
 *  botPools.ts comment at base-cbbtc-weth-005) — `usdLo`/`usdHi` are
 *  USD PER 1 UNIT of otherSide (e.g. $56,793 per 1 cbBTC), not the
 *  cbBTC/WETH ratio (~34). The label now says so outright: "$/cbBTC". Fallback to
 *  a bare "$" when poolId is unknown or the pair has a stablecoin leg. */
export function fmtQuoteForPool(poolId: string, value: number): string {
  const meta = BOT_POOL_META.find((m) => m.id === poolId);
  const usd = `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (!meta) return usd;
  const otherSide = meta.sym0.includes('ETH') ? meta.sym1 : meta.sym0;
  if (STABLE_SYMBOLS.has(otherSide.toUpperCase())) return usd;
  return `${usd}/${otherSide}`;
}

// Transforms a single raw value (price/lo/hi) to the displayed orientation.
// Applied EARLY — before computing the Y scale and chart points, not only in
// labels — so the whole geometry (line, band, scale) is in one consistent
// orientation and "price rises in USD = line goes up" works automatically,
// without separately flipping the axis.
export const toDisplay = (poolId: string, raw: number): number => (ethIsToken0(poolId) ? raw : 1 / raw);

const SPARK_W = 260;
const SPARK_H = 46;
const SPARK_PAD = 3;
const PRICE_H = 54;

interface TsPoint extends EquityChartPoint {
  tsMs: number;
}

function toTsPoints(points: EquityChartPoint[]): TsPoint[] {
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
 * Background bands shared by both charts (equity-vs-HODL and price-vs-range):
 * yellowish = out of range, grey = cash (the trend safety switch parked the
 * capital — paper ONLY, `status==='cash'`; real positions do not have this field
 * so they never get a grey background, only yellow when `!inRange`). Works on the
 * WHOLE history, even from before 20.08 (inRange/status have always been there — only
 * price/lo/hi are new).
 */
function stateBands(pts: TsPoint[], x: (t: number) => number, rightEdge: number) {
  const bands: { x1: number; x2: number; cls: string }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const cls = p.status === 'cash' ? 'paper-range-band-cash' : p.status !== 'pending' && !p.inRange ? 'paper-range-band-out' : null;
    if (!cls) continue;
    const x1 = x(p.tsMs);
    const x2 = i + 1 < pts.length ? x(pts[i + 1].tsMs) : rightEdge;
    bands.push({ x1, x2, cls });
  }
  return bands;
}

// Markers on the charts (a subset of EVENT_ICON — the Batch 7 spec lists only these three).
const CHART_EVENT_ICON: Record<string, string> = {
  EXIT_TREND: '⛔',
  REENTRY: '▶',
  REBALANCE: '🔄',
};

const EventMarkers: FC<{ events: ChartEvent[]; x: (t: number) => number; tMin: number; tMax: number; height: number }> = ({
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

export const Sparkline: FC<{ points: EquityChartPoint[]; events: ChartEvent[] }> = ({ points, events }) => {
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
      {bands.length > 0 && <div className="muted paper-range-legend">yellow background = out of range{pts.some((p) => p.status === 'cash') ? ' · grey background = cash (safety switch)' : ''}</div>}
    </>
  );
};

/**
 * Mini-chart "price vs bot range band" — ONLY when the pool/position has ≥2
 * samples with `price`. The lo–hi band is drawn per interval "from sample to
 * the next" — gives a step effect on rebalance (the bounds really do
 * change in jumps, not smoothly). The price line is split into continuous segments
 * (a gap where old samples lack the `price` field entirely —
 * feature-detect, do not interpolate across the hole).
 */
export const PriceRangeChart: FC<{ poolId: string; points: EquityChartPoint[]; events: ChartEvent[] }> = ({ poolId, points, events }) => {
  const pts = toTsPoints(points);
  const priceCount = pts.filter((p) => typeof p.price === 'number' && isFinite(p.price as number)).length;
  if (pts.length < 2 || priceCount < 2) return null;

  const x = makeXScale(pts, SPARK_W, SPARK_PAD);
  const rightEdge = SPARK_W - SPARK_PAD;
  const disp = (v: number) => toDisplay(poolId, v);

  // Everything below works on values AFTER the transform (disp) — price/
  // lo/hi converted to the display orientation once, on input, so the Y scale
  // and chart points are consistent without separately flipping the axis (see the comment
  // at toDisplay above).
  const yVals = pts.flatMap((p) => [p.price, p.lo, p.hi]).filter((v): v is number => typeof v === 'number' && isFinite(v)).map(disp);
  const yMin0 = Math.min(...yVals);
  const yMax0 = Math.max(...yVals);
  const margin = Math.max(1e-9, (yMax0 - yMin0) * 0.06);
  const yMin = yMin0 - margin;
  const yMax = yMax0 + margin;
  const ySpan = Math.max(1e-9, yMax - yMin);
  const y = (v: number) => PRICE_H - SPARK_PAD - ((v - yMin) / ySpan) * (PRICE_H - 2 * SPARK_PAD);

  const bands = stateBands(pts, x, rightEdge);

  // Band segments MERGED over constant lo/hi ("stripes" fix 20.08): a rect per
  // sample + the outline from P7 produced a vertical line at every sample boundary.
  // One rect covers a continuous stretch with an unchanged range; a new rect
  // only on rebalance (lo/hi change) or after a gap (cash/pending).
  const rangeSegs: { x1: number; x2: number; yTop: number; yBottom: number; lo: number; hi: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    // Real positions have no `status` (always "open") — the condition allows
    // a missing field, not only a literal status==='open' (paper).
    if (p.status === 'cash' || p.status === 'pending' || typeof p.lo !== 'number' || typeof p.hi !== 'number') continue;
    // disp() may reverse the order (inversion is decreasing) — take min/max
    // of the two transformed values, do not assume which is the top.
    const dA = disp(p.lo);
    const dB = disp(p.hi);
    const dispLo = Math.min(dA, dB);
    const dispHi = Math.max(dA, dB);
    const x1 = x(p.tsMs);
    const x2 = i + 1 < pts.length ? x(pts[i + 1].tsMs) : rightEdge;
    const prev = rangeSegs[rangeSegs.length - 1];
    // merge with the previous: same range (raw lo/hi — toPrecision(6) gives
    // identical values as long as the position has not changed) and contiguous on the X axis
    // (gap > 1.5px = there was a cash/pending hole — do not merge across it)
    if (prev && prev.lo === p.lo && prev.hi === p.hi && Math.abs(prev.x2 - x1) < 1.5) {
      prev.x2 = x2;
    } else {
      rangeSegs.push({ x1, x2, yTop: y(dispHi), yBottom: y(dispLo), lo: p.lo, hi: p.hi });
    }
  }

  const priceSegs: string[] = [];
  let cur: string[] = [];
  for (const p of pts) {
    if (typeof p.price === 'number' && isFinite(p.price)) {
      cur.push(`${x(p.tsMs).toFixed(1)},${y(disp(p.price)).toFixed(1)}`);
    } else if (cur.length) {
      priceSegs.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) priceSegs.push(cur.join(' '));

  const last = [...pts].reverse().find((p) => typeof p.price === 'number' && isFinite(p.price as number));
  const lastLo = last && typeof last.lo === 'number' && typeof last.hi === 'number' ? Math.min(disp(last.lo), disp(last.hi)) : null;
  const lastHi = last && typeof last.lo === 'number' && typeof last.hi === 'number' ? Math.max(disp(last.lo), disp(last.hi)) : null;

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
      <div className="muted paper-range-legend">blue band = bot range · black line = price</div>
      {last && typeof last.price === 'number' && (
        <div className="muted paper-range-caption">
          price: {fmtPrice(poolId, disp(last.price))}
          {lastLo !== null && lastHi !== null && (
            <>
              {' '}
              · range: {fmtPrice(poolId, lastLo)}–{fmtPrice(poolId, lastHi)}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// --- Batch 14: position card metrics bar, shared by paper and REAL ---
// Extracted from PaperTradingPanel.tsx (PoolCard, `.paper-pool-stats`) —
// the same extraction pattern as Sparkline/PriceRangeChart above (P10):
// one component, two call sites (paper has all 6 fields always
// available; the REAL position cards in MorningCockpit.tsx today only 3 of 6 —
// the other three wait for bot/ledger.ts to be wired up on Fable's side,
// TASKS-UI.md Batch 14). `null` on a field = no data → dash "—" with a
// tooltip explaining WHY (distinguishing "under construction" for bot-side
// fields vs a plain lack of history, so as not to suggest a defect where
// it simply does not exist yet).
// Batch 19 item 2: rounding to whole dollars ate small amounts on the
// Base scale (accrued fees $0.41, gas in cents → both came out as "$0",
// useless exactly where they were supposed to say something). For |v| < 10 two
// decimal places, above that whole dollars as before (PnL/vsHODL in
// paper trading, where amounts are large, look identical to before).
const statFmtUsd = (v: number) => {
  const abs = Math.abs(v);
  const digits = abs < 10 ? 2 : 0;
  return (v < 0 ? '−$' : '$') + abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};
const statFmtSigned = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + statFmtUsd(Math.abs(v));

export interface PositionStatsBarProps {
  /** PnL since start = valueUsd(now) − value at the anchor (first sample
   *  of this position's history). `null` when there is too little history to compute. */
  pnlUsd: number | null;
  /** Suffix "since <anchor date>" next to the PnL label (TASKS-UI Batch 14: "like
   *  for HODL") — optional, omitted when the date is unknown. */
  pnlSinceLabel?: string;
  /** vs HODL 50/50 = valueUsd(now) − hodlUsd (last history sample). */
  vsHodlUsd: number | null;
  /** `null` = bot-side field not wired up yet (Batch 14: "—" + tooltip "under construction"). */
  feesReinvestedUsd: number | null;
  /** Accrued (uncollected) fees — available TODAY for both card types. */
  feesAccruedUsd: number | null;
  /** `null` = bot-side field not wired up yet. */
  costsUsd: number | null;
  /** `null` = bot-side field not wired up yet. */
  rebalances: number | null;
}

const StatDash: FC<{ title: string }> = ({ title }) => (
  <span className="muted" title={title}>
    —
  </span>
);

const PENDING_TITLE = 'under construction — waiting for the bot ledger (bot/ledger.ts) to be wired up, a task for the analytics session (TASKS-UI.md Batch 14)';
const NO_HISTORY_TITLE = 'no data — too few history samples of this position collected yet';

export const PositionStatsBar: FC<PositionStatsBarProps> = ({ pnlUsd, pnlSinceLabel, vsHodlUsd, feesReinvestedUsd, feesAccruedUsd, costsUsd, rebalances }) => (
  <div className="paper-pool-stats">
    <div className="paper-pool-stat">
      <span className="muted">PnL since start{pnlSinceLabel ? ` (since ${pnlSinceLabel})` : ''}</span>
      {pnlUsd === null ? <StatDash title={NO_HISTORY_TITLE} /> : <span className={pnlUsd < 0 ? 'forecast-negative' : 'paper-positive'}>{statFmtSigned(pnlUsd)}</span>}
    </div>
    <div className="paper-pool-stat paper-pool-stat-hodl">
      <span className="muted">vs HODL 50/50</span>
      {vsHodlUsd === null ? <StatDash title={NO_HISTORY_TITLE} /> : <span className={vsHodlUsd < 0 ? 'forecast-negative' : 'paper-positive'}>{statFmtSigned(vsHodlUsd)}</span>}
    </div>
    <div className="paper-pool-stat">
      <span className="muted">Fees reinvested</span>
      {feesReinvestedUsd === null ? <StatDash title={PENDING_TITLE} /> : <span>{statFmtUsd(feesReinvestedUsd)}</span>}
    </div>
    <div className="paper-pool-stat">
      <span className="muted">Accrued fees (to reinvest)</span>
      {feesAccruedUsd === null ? <StatDash title={NO_HISTORY_TITLE} /> : <span>{statFmtUsd(feesAccruedUsd)}</span>}
    </div>
    <div className="paper-pool-stat">
      <span className="muted">Costs</span>
      {costsUsd === null ? <StatDash title={PENDING_TITLE} /> : <span>{statFmtUsd(costsUsd)}</span>}
    </div>
    <div className="paper-pool-stat">
      <span className="muted">Rebalances</span>
      {rebalances === null ? <StatDash title={PENDING_TITLE} /> : <span>{rebalances}</span>}
    </div>
  </div>
);
