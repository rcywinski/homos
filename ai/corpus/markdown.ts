/**
 * Markdown helpers shared by the loaders: heading-based sections (ignoring headings inside code fences)
 * and decision-table rows.
 */
import type { ChunkKind, Unit } from './types';

export interface Section {
  /** 0-based index of the first line (the heading line, or 0 for the preamble). */
  start: number;
  /** 0-based, exclusive. */
  end: number;
  /** Heading text without the #'s, or null for text before the first heading. */
  heading: string | null;
  level: number;
}

/** Split lines at headings of the given levels (e.g. [2, 3] for ## and ###). */
export function sections(lines: string[], levels: number[], from = 0, to = lines.length): Section[] {
  const out: Section[] = [];
  let fence = false;
  let cur: Section = { start: from, end: to, heading: null, level: 0 };
  for (let i = from; i < to; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m && levels.includes(m[1].length)) {
      cur.end = i;
      out.push(cur);
      cur = { start: i, end: to, heading: m[2].trim(), level: m[1].length };
    }
  }
  out.push(cur);
  return out.filter((s) => s.end > s.start);
}

/** True when the section has content beyond its heading line. */
export function hasBody(lines: string[], s: Section): boolean {
  const first = s.heading === null ? s.start : s.start + 1;
  return lines.slice(first, s.end).some((l) => l.trim() !== '' && !/^#{1,6}\s/.test(l));
}

/** A unit whose text is the verbatim lines of a section. */
export function sectionUnit(
  file: string,
  lines: string[],
  s: Section,
  kind: ChunkKind,
  extra: Partial<Unit> = {},
): Unit {
  const text = lines.slice(s.start, s.end).join('\n');
  const title = s.heading ?? lines.slice(s.start, s.end).find((l) => l.trim() !== '')?.replace(/^#+\s*/, '').trim() ?? file;
  return {
    file,
    lineStart: s.start + 1,
    lineEnd: lastContentLine(lines, s) + 1,
    kind,
    title,
    text,
    bodyStart: s.heading === null ? 0 : lines[s.start].length + 1,
    raw: true,
    ...extra,
  };
}

function lastContentLine(lines: string[], s: Section): number {
  let i = s.end - 1;
  while (i > s.start && lines[i].trim() === '') i--;
  return i;
}

/** Cells of a markdown table row; null for non-rows, the header separator and empty rows. */
export function tableCells(line: string): string[] | null {
  if (!/^\s*\|/.test(line)) return null;
  const cells = line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  if (cells.every((c) => /^:?-{3,}:?$/.test(c) || c === '')) return null;
  return cells;
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

/** `2026-08-10` stays as is; `10 Aug` becomes `2026-08-10` (the project ran in 2026 only). */
export function isoDate(raw: string): string | undefined {
  const iso = /\b(20\d\d-\d\d-\d\d)\b/.exec(raw);
  if (iso) return iso[1];
  const dm = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.exec(raw);
  if (dm) return `2026-${MONTHS[dm[2]]}-${dm[1].padStart(2, '0')}`;
  return undefined;
}
