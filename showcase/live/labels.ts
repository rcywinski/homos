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
