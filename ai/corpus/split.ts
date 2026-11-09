/**
 * Size control: a unit above the cap is split at sentence boundaries into parts that inherit
 * the unit's metadata and get its title prepended (rule 2 agreed with the owner).
 * Small units are kept as they are (rule 3: merging is decided later, by evaluation).
 */
import type { Chunk, Unit } from './types';
import { MAX_CHUNK_TOKENS, CHARS_PER_TOKEN } from './tokens';

/**
 * Offsets where a new piece of text may start:
 * - after a sentence end (. ! ? or ellipsis, optional closing quote or bracket) followed by whitespace;
 * - at the start of a line that opens a list item, table row, header, quote, or follows a blank line.
 */
export function boundaries(text: string): number[] {
  const out = new Set<number>();
  const sentence = /[.!?…]["”')\]*]*\s+/g;
  for (let m = sentence.exec(text); m; m = sentence.exec(text)) out.add(m.index + m[0].length);
  const line = /\n(?=[ \t]*(?:[-*+] |\d+[.)] |\||#|>|\n|$))/g;
  for (let m = line.exec(text); m; m = line.exec(text)) out.add(m.index + 1);
  return [...out].filter((b) => b > 0 && b < text.length).sort((a, b) => a - b);
}

/** Cut a run with no usable boundary: at the last whitespace in the second half of the window. */
function hardCut(text: string, start: number, maxChars: number): number {
  const end = start + maxChars;
  const ws = text.slice(start, end).search(/\s\S*$/);
  return ws > maxChars / 2 ? start + ws + 1 : end;
}

/** Split `text` into [start, end) ranges of at most `maxChars`, preferring boundaries. */
export function splitText(text: string, maxChars: number): Array<[number, number]> {
  const parts: Array<[number, number]> = [];
  let start = 0;
  let last = -1;
  for (const b of [...boundaries(text), text.length]) {
    if (b - start <= maxChars) {
      last = b;
      continue;
    }
    if (last > start) {
      parts.push([start, last]);
      start = last;
    }
    while (b - start > maxChars) {
      const cut = hardCut(text, start, maxChars);
      parts.push([start, cut]);
      start = cut;
    }
    last = b;
  }
  if (start < text.length) parts.push([start, text.length]);
  return parts;
}

/**
 * Greedy packing fills every part to the cap and leaves a small tail (e.g. 9 full parts + 120 tokens).
 * Retry with an even target size and keep it when it needs no more parts than the greedy split.
 */
export function balancedSplit(text: string, maxChars: number): Array<[number, number]> {
  const greedy = splitText(text, maxChars);
  if (greedy.length < 2) return greedy;
  // Boundaries rarely fall exactly on the even size, so allow a little slack, smallest first.
  for (const slack of [1.0, 1.02, 1.05, 1.1, 1.2]) {
    const even = splitText(text, Math.min(maxChars, Math.ceil((text.length / greedy.length) * slack)));
    if (even.length <= greedy.length) return even;
  }
  return greedy;
}

function lineAt(text: string, offset: number, lineStart: number): number {
  let n = lineStart;
  for (let i = 0; i < offset && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** Turn a unit into one chunk, or into titled parts when it is above the cap. */
export function toChunks(unit: Unit, maxTokens = MAX_CHUNK_TOKENS): Chunk[] {
  const id = `${unit.file}:${unit.lineStart}`;
  const base = {
    file: unit.file,
    kind: unit.kind,
    title: unit.title,
    ...(unit.date ? { date: unit.date } : {}),
    ...(unit.session ? { session: unit.session } : {}),
  };
  const maxChars = Math.floor(maxTokens * CHARS_PER_TOKEN);
  const whole = unit.text.trimEnd();
  if (whole.length <= maxChars) {
    return [{ id, ...base, lineStart: unit.lineStart, lineEnd: unit.lineEnd, text: whole }];
  }

  const header = unit.title + '\n\n';
  const body = unit.text.slice(unit.bodyStart);
  const ranges = balancedSplit(body, maxChars - header.length).filter(([s, e]) => body.slice(s, e).trim() !== '');
  return ranges.map(([s, e], i) => {
    // Skip leading whitespace so the line number points at the first real character.
    const lead = body.slice(s, e).length - body.slice(s, e).trimStart().length;
    // The first part also covers the header line: its text starts with the title, and a citation of the
    // header line (e.g. a journal entry title) must resolve to a chunk.
    const lineStart =
      unit.raw && i > 0 ? lineAt(unit.text, unit.bodyStart + s + lead, unit.lineStart) : unit.lineStart;
    const lineEnd = unit.raw ? lineAt(unit.text, unit.bodyStart + e - 1, unit.lineStart) : unit.lineEnd;
    return {
      id: `${id}#p${i + 1}`,
      ...base,
      lineStart,
      lineEnd: Math.max(lineStart, lineEnd),
      text: header + body.slice(s, e).trim(),
      part: { index: i + 1, of: ranges.length },
    };
  });
}
