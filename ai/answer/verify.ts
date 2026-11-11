/**
 * Mechanical citation check (step 1.8), no model involved.
 *   - the cited chunk must be one of the chunks given to the model ("unknown-chunk" otherwise);
 *   - the quote must occur in that chunk's text ("not-found" otherwise), compared after normalising what a verbatim
 *     copy may legitimately lose: runs of whitespace, Markdown emphasis and code marks, blockquote markers at the
 *     start of a line ("> "), and typographic quotes;
 *   - whitespace only (rule added in step 1.10): a line break in the source may match a single space or nothing in the
 *     quote, so a quote that drops the space where the source wraps a line (source "60%" + line break + "to samo",
 *     quote "60%to samo") still matches. Inside a line a missing space is still a mismatch; no fuzzy matching, no punctuation tolerance;
 *   - pieces joined with an ellipsis fail on their own (the joined string does not occur), while an ellipsis that is
 *     really in the source ("-$25…45") still matches;
 *   - when found, the quote is located in the source file inside the chunk's line range, so the citation points at the
 *     exact lines (a synthetic chunk such as a decision row keeps the chunk's range);
 *   - quotes over MAX_QUOTE_WORDS words are flagged as too long and counted separately (still verified).
 */
import { readFileSync } from 'fs';
import path from 'path';
import type { Chunk } from '../corpus/types';
import { MAX_QUOTE_WORDS } from './prompt';
import type { Citation } from './types';

export type CitationStatus = 'ok' | 'unknown-chunk' | 'not-found';

export interface VerifiedCitation extends Citation {
  status: CitationStatus;
  words: number;
  tooLong: boolean;
  file?: string;
  /** Exact lines of the quote in the file when it could be located there, else the chunk's range. */
  lines?: [number, number];
}

/**
 * Normalised text plus, for each kept character, the index of the source character it came from, and whether a
 * space stands for a whitespace run that contains a line break (such a space may be absent in a quote).
 */
function normalise(text: string): { s: string; at: number[]; brk: boolean[] } {
  let s = '';
  const at: number[] = [];
  const brk: boolean[] = [];
  let space = false;
  let lineStart = true;
  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    if (ch === '\n') lineStart = true;
    else if (lineStart && ch === '>') continue;
    else if (!/\s/.test(ch)) lineStart = false;
    if (ch === '*' || ch === '`') continue;
    if ('„”“"«»'.includes(ch)) ch = '"';
    if ('‘’'.includes(ch)) ch = "'";
    if (/\s/.test(ch)) {
      if (!space && s.length) {
        s += ' ';
        at.push(i);
        brk.push(false);
      }
      // The space just pushed (or already pushed for this run) stands for a run with a line break.
      if (ch === '\n' && s.endsWith(' ')) brk[brk.length - 1] = true;
      space = true;
      continue;
    }
    space = false;
    s += ch;
    at.push(i);
    brk.push(false);
  }
  return { s: s.trimEnd(), at, brk };
}

/**
 * First match of the normalised quote in the normalised source: [start, end] indexes into the source's normalised
 * string, or null. Characters must be equal, except that a line-break space in the source may be skipped.
 */
export function findQuote(src: { s: string; brk: boolean[] }, q: string): [number, number] | null {
  if (!q) return null;
  for (let start = 0; start < src.s.length; start++) {
    let i = start;
    let j = 0;
    while (j < q.length && i < src.s.length) {
      if (src.s[i] === q[j]) {
        i++;
        j++;
      } else if (src.s[i] === ' ' && src.brk[i] && j > 0) i++;
      else break;
    }
    if (j === q.length) return [start, i - 1];
  }
  return null;
}

const trimQuote = (q: string) => normalise(q).s.replace(/^[\s"'.,;:]+|[\s"'.,;:]+$/g, '');

const fileCache = new Map<string, string[]>();
function fileLines(file: string, root: string): string[] {
  if (!fileCache.has(file)) fileCache.set(file, readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').split('\n'));
  return fileCache.get(file)!;
}

/** Lines of the file (1-based, inclusive) that contain the normalised quote, searched within [from, to]. */
export function locateInFile(quote: string, file: string, from: number, to: number, root = process.cwd()): [number, number] | null {
  const lines = fileLines(file, root).slice(from - 1, to);
  const joined = lines.join('\n');
  const lineOf: number[] = [];
  lines.forEach((l, i) => {
    for (let k = 0; k <= l.length; k++) lineOf.push(from + i);
  });
  const src = normalise(joined);
  const m = findQuote(src, trimQuote(quote));
  if (!m) return null;
  return [lineOf[src.at[m[0]]], lineOf[src.at[m[1]]]];
}

export function verifyCitation(c: Citation, given: Map<string, Chunk>, root = process.cwd()): VerifiedCitation {
  const words = c.quote.trim().split(/\s+/).filter(Boolean).length;
  const base = { ...c, words, tooLong: words > MAX_QUOTE_WORDS };
  const chunk = given.get(c.chunkId);
  if (!chunk) return { ...base, status: 'unknown-chunk' };
  const q = trimQuote(c.quote);
  if (!findQuote(normalise(chunk.text), q)) return { ...base, status: 'not-found', file: chunk.file };
  const lines = locateInFile(c.quote, chunk.file, chunk.lineStart, chunk.lineEnd, root) ?? [chunk.lineStart, chunk.lineEnd];
  return { ...base, status: 'ok', file: chunk.file, lines };
}
