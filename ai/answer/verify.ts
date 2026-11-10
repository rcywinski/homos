/**
 * Mechanical citation check (step 1.8), no model involved.
 *   - the cited chunk must be one of the chunks given to the model ("unknown-chunk" otherwise);
 *   - the quote must occur in that chunk's text ("not-found" otherwise), compared after normalising what a verbatim
 *     copy may legitimately lose: runs of whitespace, Markdown emphasis and code marks, blockquote markers at the
 *     start of a line ("> "), and typographic quotes;
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

/** Normalised text plus, for each kept character, the index of the source character it came from. */
function normalise(text: string): { s: string; at: number[] } {
  let s = '';
  const at: number[] = [];
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
      }
      space = true;
      continue;
    }
    space = false;
    s += ch;
    at.push(i);
  }
  return { s: s.trimEnd(), at };
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
  const { s, at } = normalise(joined);
  const q = trimQuote(quote);
  const pos = q ? s.indexOf(q) : -1;
  if (pos < 0) return null;
  return [lineOf[at[pos]], lineOf[at[pos + q.length - 1]]];
}

export function verifyCitation(c: Citation, given: Map<string, Chunk>, root = process.cwd()): VerifiedCitation {
  const words = c.quote.trim().split(/\s+/).filter(Boolean).length;
  const base = { ...c, words, tooLong: words > MAX_QUOTE_WORDS };
  const chunk = given.get(c.chunkId);
  if (!chunk) return { ...base, status: 'unknown-chunk' };
  const q = trimQuote(c.quote);
  if (!q || !normalise(chunk.text).s.includes(q)) return { ...base, status: 'not-found', file: chunk.file };
  const lines = locateInFile(c.quote, chunk.file, chunk.lineStart, chunk.lineEnd, root) ?? [chunk.lineStart, chunk.lineEnd];
  return { ...base, status: 'ok', file: chunk.file, lines };
}
