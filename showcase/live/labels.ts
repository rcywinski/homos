/**
 * Display text for the Live page (phase 5, 5.4 follow-ups): English names for the walk-forward strategies (the result
 * files keep their original Polish names; an unknown word is shown as it is) and the fee-yield worked example.
 */
const STRATEGY_WORDS: [RegExp, string][] = [
  [/\bPasywny\b/g, 'Passive'],
  [/\bAdaptacyjna\b/g, 'Adaptive'],
  [/wąski/g, 'narrow'],
  [/\[bez swapu\]/g, '[no swap]'],
];

export const strategyLabel = (name: string): string => STRATEGY_WORDS.reduce((s, [re, to]) => s.replace(re, to), name);

const SPACING: Record<string, number> = { '001': 1, '005': 10, '030': 60, '100': 200 };

/** Tick spacing from a paper pool id's fee suffix (-005 = 0.05%, spacing 10), or null. */
export const spacingOf = (poolId: string): number | null => SPACING[poolId.slice(-3)] ?? null;

/**
 * The fee-yield rule worked out on one row: a position W ticks wide earns about yield × 2 × spacing / W (the scaling
 * the advisor and the paper step use). Null when the row has no statistics or suggestion.
 */
export function feeYieldExample(pool: { id: string; stats: { feeYieldDaily: number } | null; suggestion: { tickLower: number; tickUpper: number } | null }) {
  const spacing = spacingOf(pool.id);
  if (!pool.stats || !pool.suggestion || !spacing) return null;
  const width = pool.suggestion.tickUpper - pool.suggestion.tickLower;
  if (!(width > 0)) return null;
  const tickPct = pool.stats.feeYieldDaily * 100;
  return { tickPct, spacing, width, rangePct: tickPct * ((2 * spacing) / width) };
}

/** Statistics older than this (two 15-minute cycles) get a line on the pool's card. */
export const STATS_STALE_MS = 30 * 60_000;

interface StatsInfo {
  statsAt?: string;
  statsWindow?: { at: string; chunks: number; failed: number; ok: boolean };
}

const minutesAgo = (iso: string, now: number) => Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
const ago = (min: number) => (min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`);

/** The telemetry cell: the age of the last computed statistics, marked when the last 24 h read was incomplete. */
export function statsAgeCell(p: StatsInfo, now = Date.now()): string {
  if (!p.statsAt) return p.statsWindow ? 'never read' : '—';
  const w = p.statsWindow;
  return `${ago(minutesAgo(p.statsAt, now))}${w && w.failed > 0 ? ` (last read ${w.failed} of ${w.chunks} chunks failed)` : ''}`;
}

/** The line on a pool's card when its statistics are stale or the last read was incomplete; null otherwise. */
export function statsNote(p: StatsInfo | undefined, positionStatus: string, now = Date.now()): string | null {
  if (!p?.statsAt || positionStatus === 'pending') return null;
  const age = minutesAgo(p.statsAt, now);
  const w = p.statsWindow;
  const incomplete = !!w && w.failed > 0;
  if (age * 60_000 <= STATS_STALE_MS && !incomplete) return null;
  const parts = [`market statistics last read ${ago(age)}`];
  if (incomplete) parts.push(`the last 24 h read was incomplete (${w!.failed} of ${w!.chunks} chunks failed)`);
  return `${parts.join('; ')}; fees are accrued on the last known yield.`;
}
