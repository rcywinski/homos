/**
 * Numbered units for citation by reference (step 1.12, variant L). A unit is one non-empty line of the chunk; a line
 * longer than 40 words is split at sentence boundaries (after . ! or ? followed by whitespace), so a single unit stays
 * quotable. A reference (chunk id, first unit, last unit) is turned into a quote by joining those units with a space.
 */
import type { Chunk } from '../corpus/types';
import { MAX_QUOTE_WORDS } from './prompt';

export interface Unit {
  text: string;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function chunkUnits(c: Chunk): Unit[] {
  const out: Unit[] = [];
  for (const raw of c.text.split('\n')) {
    // Blockquote markers at the start of a line are layout, not text (the verifier drops them too).
    const line = raw.replace(/^\s*(>\s?)+/, '').trim();
    if (!line) continue;
    if (words(line) <= MAX_QUOTE_WORDS) {
      out.push({ text: line });
      continue;
    }
    for (const s of line.split(/(?<=[.!?])\s+/)) if (s.trim()) out.push({ text: s.trim() });
  }
  return out;
}

export type RefProblem = 'outside' | 'invalid-range';

export interface Ref {
  chunkId: string;
  firstUnit: number;
  lastUnit: number;
}

/** The extracted quote, or why the reference cannot be used. */
export function extractRef(ref: Ref, given: Map<string, Chunk>): { quote: string; words: number } | { problem: RefProblem } {
  const chunk = given.get(ref.chunkId);
  if (!chunk) return { problem: 'outside' };
  const units = chunkUnits(chunk);
  const { firstUnit: a, lastUnit: b } = ref;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a || b > units.length) return { problem: 'invalid-range' };
  const quote = units
    .slice(a - 1, b)
    .map((u) => u.text)
    .join(' ');
  return { quote, words: words(quote) };
}
