/**
 * Retrieval metrics, question-level (agreed in step 1.4): a question counts as found at k when at least one
 * of its top-k chunks overlaps any of its evidence ranges.
 *   recall@k = share of questions found at k
 *   MRR@k    = mean of 1/rank of the first hit, 0 when the first hit is below k
 */
import type { Chunk } from '../corpus/types';
import { overlaps, type Evidence } from './golden';

/** 1-based rank of the first chunk in `ranked` that overlaps any range, or null. */
export function firstHitRank(ranked: Chunk[], ranges: Evidence[]): number | null {
  const i = ranked.findIndex((c) => ranges.some((r) => overlaps(c, r)));
  return i < 0 ? null : i + 1;
}

export interface Ratio {
  hits: number;
  n: number;
}

export function recallAt(ranks: Array<number | null>, k: number): Ratio {
  return { hits: ranks.filter((r) => r !== null && r <= k).length, n: ranks.length };
}

export function mrrAt(ranks: Array<number | null>, k: number): number {
  if (!ranks.length) return 0;
  return ranks.reduce<number>((s, r) => s + (r !== null && r <= k ? 1 / r : 0), 0) / ranks.length;
}

/** "44% (12/27)": the count makes the weight of a single question visible. */
export function fmtRatio(r: Ratio): string {
  if (!r.n) return 'n/a';
  return `${Math.round((r.hits / r.n) * 100)}% (${r.hits}/${r.n})`;
}

/** Only evidence ranges in journal/: hits from the English docs/ do not count. */
export function journalOnly(ranges: Evidence[]): Evidence[] {
  return ranges.filter((r) => r.file.startsWith('journal/'));
}
