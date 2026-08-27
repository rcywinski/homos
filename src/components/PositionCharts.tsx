/**
 * PositionCharts.tsx — wykresy współdzielone przez panel paper-tradingu
 * (PaperTradingPanel.tsx, Partia 5/7) i karty REALNYCH pozycji (MorningCockpit.tsx,
 * TASKS-UI.md Partia 10 — "redesign kart pozycji wg wzorca paper"). Wyekstrahowane
 * z PaperTradingPanel.tsx zamiast kopiowane, żeby fix raz zrobiony (np. bug z
 * orientacją ceny, P7 odbiór 20.08) działał w obu miejscach na zawsze.
 *
 * Generyczne nad kształtem punktu — `EquityChartPoint` wymaga tylko pól
 * faktycznie używanych przez wykresy (equityUsd/hodlUsd/inRange/status?/
 * price?/lo?/hi?). Realne pozycje (`PositionHistoryPoint` z useBotApi.ts) mają
 * `valueUsd` zamiast `equityUsd` i BRAK pola `status` (pozycja jest "otwarta"
 * dopóki bot ją widzi — nie ma stanu cash/pending jak w paper) — wywołujący
 * mapuje `{...p, equityUsd: p.valueUsd}` przed przekazaniem tutaj; `status`
 * pominięty wtedy w ogóle, co `stateBands()` interpretuje poprawnie jako
 * "nigdy cash, cieniuj tylko po !inRange" (patrz komentarz przy stateBands).
 *
 * Wykresy jako inline SVG polyline bez nowych zależności — wzorzec
 * ObservationAnalysis.tsx (PoolHistoryChart), tak jak w oryginalnym P5/P7.
 */
import React, { FC } from 'react';
import { BOT_POOL_META } from '../config/botPools';

export interface EquityChartPoint {
  ts: string;
  equityUsd: number;
  hodlUsd: number;
  inRange: boolean;
  /** obecne tylko dla paper (open/cash/pending); realne pozycje nie mają cash — pomiń pole. */
  status?: string;
  price?: number;
  lo?: number;
  hi?: number;
}

export interface ChartEvent {
  ts: string;
  kind: string;
}

// Pule quote-owane w WETH (np. cbBTC — cena to ~0.0296 WETH/cbBTC) potrzebują
// więcej cyfr znaczących niż pule USD-quote (Partia 7, uwaga ze zlecenia).
export const fmtPrice = (poolId: string, v: number): string =>
  poolId.toLowerCase().includes('cbbtc') ? v.toPrecision(4) : v.toLocaleString('en-US', { maximumFractionDigits: 0 });

// Orientacja ceny — POPRAWKA po odbiorze P7 (Fable→Sonnet 2026-08-20):
// `price`/`lo`/`hi` z bot/paper.ts (i analogicznie bot/observer.ts dla
// realnych pozycji) to "human" token1-per-token0 (konwencja Uniswap), NIE
// zawsze USD. Dla pul mainnet (sym0='USDC', sym1='WETH') to WETH-per-USDC
// ≈ 0.00044 — zaokrągla się do zera w UI. Wzorzec z reszty kokpitu
// (AddLiquidity.tsx/MyPositions.tsx/CockpitPositionActions.tsx):
// `ethIsToken0 ? raw : 1/raw`. cbBTC (sym0='WETH', quote cbBTC) ma
// ethIsToken0=true → BEZ zmian, zostaje czytelne 0.03183 (zgodnie ze
// zleceniem — tam nie ma nogi USD do której inwertować).
export const ethIsToken0 = (poolId: string): boolean => {
  const meta = BOT_POOL_META.find((m) => m.id === poolId);
  return meta ? meta.sym0.includes('ETH') : true;
};

// Transformuje pojedynczą surową wartość (price/lo/hi) do orientacji
// wyświetlanej. Stosowana WCZEŚNIE — przed liczeniem skali Y i punktów
// wykresu, nie tylko w etykietach — dzięki temu cała geometria (linia,
// pasmo, skala) jest w jednej, spójnej orientacji i "cena rośnie w USD =
// linia w górę" działa automatycznie, bez osobnego odwracania osi.
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
 * Pasy tła współdzielone przez oba wykresy (equity-vs-HODL i cena-vs-zakres):
 * żółtawy = poza zakresem, szary = cash (bezpiecznik trendu zaparkował
 * kapitał — TYLKO paper, `status==='cash'`; realne pozycje nie mają tego pola
 * więc nigdy nie dostają szarego tła, tylko żółte gdy `!inRange`). Działa na
 * CAŁEJ historii, nawet sprzed 20.08 (inRange/status były od zawsze — tylko
 * price/lo/hi są nowe).
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

// Znaczniki na wykresach (podzbiór EVENT_ICON — spec Partii 7 wymienia tylko te trzy).
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
      {bands.length > 0 && <div className="muted paper-range-legend">żółte tło = poza zakresem{pts.some((p) => p.status === 'cash') ? ' · szare tło = cash (bezpiecznik)' : ''}</div>}
    </>
  );
};

/**
 * Mini-wykres "cena vs pasmo zakresu bota" — TYLKO gdy pula/pozycja ma ≥2
 * próbki z `price`. Pasmo lo–hi rysowane per interwał "od próbki do
 * następnej" — daje efekt schodkowy przy rebalansie (granice realnie się
 * zmieniają skokowo, nie płynnie). Linia ceny dzielona na ciągłe odcinki
 * (przerwa tam, gdzie stare próbki nie mają pola `price` w ogóle —
 * feature-detect, nie interpolować przez dziurę).
 */
export const PriceRangeChart: FC<{ poolId: string; points: EquityChartPoint[]; events: ChartEvent[] }> = ({ poolId, points, events }) => {
  const pts = toTsPoints(points);
  const priceCount = pts.filter((p) => typeof p.price === 'number' && isFinite(p.price as number)).length;
  if (pts.length < 2 || priceCount < 2) return null;

  const x = makeXScale(pts, SPARK_W, SPARK_PAD);
  const rightEdge = SPARK_W - SPARK_PAD;
  const disp = (v: number) => toDisplay(poolId, v);

  // Wszystko poniżej pracuje na wartościach PO transformacji (disp) — cena/
  // lo/hi zamienione na orientację wyświetlaną raz, na wejściu, więc skala Y
  // i punkty wykresu są spójne bez osobnego odwracania osi (patrz komentarz
  // przy toDisplay wyżej).
  const yVals = pts.flatMap((p) => [p.price, p.lo, p.hi]).filter((v): v is number => typeof v === 'number' && isFinite(v)).map(disp);
  const yMin0 = Math.min(...yVals);
  const yMax0 = Math.max(...yVals);
  const margin = Math.max(1e-9, (yMax0 - yMin0) * 0.06);
  const yMin = yMin0 - margin;
  const yMax = yMax0 + margin;
  const ySpan = Math.max(1e-9, yMax - yMin);
  const y = (v: number) => PRICE_H - SPARK_PAD - ((v - yMin) / ySpan) * (PRICE_H - 2 * SPARK_PAD);

  const bands = stateBands(pts, x, rightEdge);

  // Segmenty pasma SKLEJANE po stałych lo/hi (fix "pasków" 20.08): rect per
  // próbka + obwódka z P7 dawały pionową kreskę na każdej granicy próbek.
  // Jeden rect obejmuje ciągły odcinek o niezmienionym zakresie; nowy rect
  // dopiero przy rebalansie (zmiana lo/hi) albo po przerwie (cash/pending).
  const rangeSegs: { x1: number; x2: number; yTop: number; yBottom: number; lo: number; hi: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    // Realne pozycje nie mają `status` (zawsze "otwarte") — warunek dopuszcza
    // brak pola, nie tylko dosłowne status==='open' (paper).
    if (p.status === 'cash' || p.status === 'pending' || typeof p.lo !== 'number' || typeof p.hi !== 'number') continue;
    // disp() może odwracać porządek (inwersja jest malejąca) — brać min/max
    // z dwóch przetransformowanych wartości, nie zakładać które jest górą.
    const dA = disp(p.lo);
    const dB = disp(p.hi);
    const dispLo = Math.min(dA, dB);
    const dispHi = Math.max(dA, dB);
    const x1 = x(p.tsMs);
    const x2 = i + 1 < pts.length ? x(pts[i + 1].tsMs) : rightEdge;
    const prev = rangeSegs[rangeSegs.length - 1];
    // sklej z poprzednim: ten sam zakres (surowe lo/hi — toPrecision(6) daje
    // identyczne wartości dopóki pozycja się nie zmieniła) i styk w osi X
    // (przerwa > 1.5px = była dziura cash/pending — nie sklejać przez nią)
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
      <div className="muted paper-range-legend">niebieskie pasmo = zakres bota · czarna linia = cena</div>
      {last && typeof last.price === 'number' && (
        <div className="muted paper-range-caption">
          cena: {fmtPrice(poolId, disp(last.price))}
          {lastLo !== null && lastHi !== null && (
            <>
              {' '}
              · zakres: {fmtPrice(poolId, lastLo)}–{fmtPrice(poolId, lastHi)}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// --- Partia 14: pasek metryk karty pozycji, wspólny dla paper i REALNYCH ---
// Wyekstrahowany z PaperTradingPanel.tsx (PoolCard, `.paper-pool-stats`) —
// ten sam wzorzec ekstrakcji co Sparkline/PriceRangeChart wyżej (P10):
// jeden komponent, dwa call site'y (paper ma wszystkie 6 pól zawsze
// dostępne; karty REALNYCH pozycji w MorningCockpit.tsx dziś tylko 3 z 6 —
// pozostałe trzy czekają na podpięcie bot/ledger.ts po stronie Fable,
// TASKS-UI.md Partia 14). `null` na polu = brak danych → myślnik "—" z
// tooltipem tłumaczącym DLACZEGO (rozróżnienie "w budowie" dla pól
// bot-side vs zwykły brak historii, żeby nie sugerować usterki tam, gdzie
// to po prostu jeszcze nie istnieje).
const statFmtUsd = (v: number) => (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const statFmtSigned = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + statFmtUsd(Math.abs(v));

export interface PositionStatsBarProps {
  /** PnL od startu = valueUsd(teraz) − wartość z kotwicy (pierwsza próbka
   *  historii tej pozycji). `null` gdy za mało historii do policzenia. */
  pnlUsd: number | null;
  /** Dopisek "od <data kotwicy>" przy etykiecie PnL (TASKS-UI Partia 14: "jak
   *  przy HODL") — opcjonalny, pomijany gdy data nieznana. */
  pnlSinceLabel?: string;
  /** vs HODL 50/50 = valueUsd(teraz) − hodlUsd (ostatnia próbka historii). */
  vsHodlUsd: number | null;
  /** `null` = pole bot-side jeszcze niepodłączone (Partia 14: "—" + tooltip "w budowie"). */
  feesReinvestedUsd: number | null;
  /** Fee narosłe (nieodebrane) — dostępne DZIŚ dla obu typów kart. */
  feesAccruedUsd: number | null;
  /** `null` = pole bot-side jeszcze niepodłączone. */
  costsUsd: number | null;
  /** `null` = pole bot-side jeszcze niepodłączone. */
  rebalances: number | null;
}

const StatDash: FC<{ title: string }> = ({ title }) => (
  <span className="muted" title={title}>
    —
  </span>
);

const PENDING_TITLE = 'w budowie — czeka na podpięcie księgi bota (bot/ledger.ts), zadanie po stronie sesji analitycznej (TASKS-UI.md Partia 14)';
const NO_HISTORY_TITLE = 'brak danych — za mało próbek historii tej pozycji jeszcze zebranych';

export const PositionStatsBar: FC<PositionStatsBarProps> = ({ pnlUsd, pnlSinceLabel, vsHodlUsd, feesReinvestedUsd, feesAccruedUsd, costsUsd, rebalances }) => (
  <div className="paper-pool-stats">
    <div className="paper-pool-stat">
      <span className="muted">PnL od startu{pnlSinceLabel ? ` (od ${pnlSinceLabel})` : ''}</span>
      {pnlUsd === null ? <StatDash title={NO_HISTORY_TITLE} /> : <span className={pnlUsd < 0 ? 'forecast-negative' : 'paper-positive'}>{statFmtSigned(pnlUsd)}</span>}
    </div>
    <div className="paper-pool-stat paper-pool-stat-hodl">
      <span className="muted">vs HODL 50/50</span>
      {vsHodlUsd === null ? <StatDash title={NO_HISTORY_TITLE} /> : <span className={vsHodlUsd < 0 ? 'forecast-negative' : 'paper-positive'}>{statFmtSigned(vsHodlUsd)}</span>}
    </div>
    <div className="paper-pool-stat">
      <span className="muted">Fee reinwestowane</span>
      {feesReinvestedUsd === null ? <StatDash title={PENDING_TITLE} /> : <span>{statFmtUsd(feesReinvestedUsd)}</span>}
    </div>
    <div className="paper-pool-stat">
      <span className="muted">Fee narosłe (do reinwestycji)</span>
      {feesAccruedUsd === null ? <StatDash title={NO_HISTORY_TITLE} /> : <span>{statFmtUsd(feesAccruedUsd)}</span>}
    </div>
    <div className="paper-pool-stat">
      <span className="muted">Koszty</span>
      {costsUsd === null ? <StatDash title={PENDING_TITLE} /> : <span>{statFmtUsd(costsUsd)}</span>}
    </div>
    <div className="paper-pool-stat">
      <span className="muted">Rebalanse</span>
      {rebalances === null ? <StatDash title={PENDING_TITLE} /> : <span>{rebalances}</span>}
    </div>
  </div>
);
