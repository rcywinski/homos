/**
 * One loader per file type. Each returns source units; size control happens later in toChunks().
 *
 * Rules agreed with the owner for CONTEXT.md:
 *  1. one journal entry (### header in section 4) = one unit; sections 1 and 3 are units of their own;
 *     in section 2 one table row = one unit, prefixed with "Decyzja z <date>:".
 *  2. units above the cap are split at sentence boundaries (split.ts).
 *  3. tiny units stay as they are.
 */
import type { ChunkKind, Unit } from './types';
import { hasBody, isoDate, sectionUnit, sections, tableCells } from './markdown';

const SESSIONS = ['Fable', 'CC-Mac', 'CC-Win', 'Sonnet', 'Opus', 'Rafał'];

function sessionsIn(title: string): string | undefined {
  const found = SESSIONS.filter((s) => title.includes(s));
  return found.length ? found.join(', ') : undefined;
}

/**
 * Rows of a decision table, rewritten as one sentence each so the date and the column names
 * travel with the text. Other lines of the range (intro text) become one plain unit if non-empty.
 */
function decisionRows(
  file: string,
  lines: string[],
  from: number,
  to: number,
  prefix: (date: string) => string,
  restKind: ChunkKind,
  restTitle: string,
): Unit[] {
  const units: Unit[] = [];
  let header: string[] | null = null;
  const rest: number[] = [];
  for (let i = from; i < to; i++) {
    const cells = tableCells(lines[i]);
    if (!cells) {
      if (!/^\s*\|/.test(lines[i])) rest.push(i);
      continue;
    }
    if (!header) {
      header = cells;
      continue;
    }
    const date = isoDate(cells[0]) ?? cells[0];
    const fields = cells.slice(1).map((c, k) => (k === 0 ? c : `${header?.[k + 1] ?? ''}: ${c}`));
    units.push({
      file,
      lineStart: i + 1,
      lineEnd: i + 1,
      kind: 'decision',
      title: `${prefix(date)}`.replace(/:$/, ''),
      text: `${prefix(date)} ${fields.join('\n')}`,
      bodyStart: 0,
      raw: false,
      ...(isoDate(cells[0]) ? { date: isoDate(cells[0]) } : {}),
    });
  }
  // Text around the table: one unit per contiguous run of lines, so its line range never covers table rows.
  const runs: number[][] = [];
  for (const i of rest) {
    const run = runs[runs.length - 1];
    if (run && run[run.length - 1] === i - 1) run.push(i);
    else runs.push([i]);
  }
  const around = runs
    .filter((run) => run.some((i) => lines[i].trim() !== '' && !/^#{1,6}\s/.test(lines[i])))
    .map((run) => {
      const unit = sectionUnit(file, lines, { start: run[0], end: run[run.length - 1] + 1, heading: null, level: 0 }, restKind);
      unit.title = restTitle;
      return unit;
    });
  return [...around, ...units].sort((a, b) => a.lineStart - b.lineStart);
}

export function loadContext(file: string, content: string): Unit[] {
  const lines = content.split('\n');
  const top = sections(lines, [2]);
  const units: Unit[] = [];
  for (const s of top) {
    const n = /^(\d)\./.exec(s.heading ?? '')?.[1];
    if (n === '2') {
      units.push(
        ...decisionRows(file, lines, s.start + 1, s.end, (d) => `Decyzja z ${d}:`, 'journal-section', s.heading ?? ''),
      );
    } else if (n === '4') {
      for (const e of sections(lines, [3], s.start + 1, s.end)) {
        if (e.heading === null || !hasBody(lines, e)) continue;
        const date = isoDate(e.heading);
        const session = sessionsIn(e.heading);
        units.push(
          sectionUnit(file, lines, e, 'journal-entry', { ...(date ? { date } : {}), ...(session ? { session } : {}) }),
        );
      }
    } else if (hasBody(lines, s) || s.heading === null) {
      if (lines.slice(s.start, s.end).some((l) => l.trim() !== '')) units.push(sectionUnit(file, lines, s, 'journal-section'));
    }
  }
  return units;
}

export function loadReport(file: string, content: string): Unit[] {
  const lines = content.split('\n');
  const date = isoDate(file);
  return sections(lines, [2])
    .filter((s) => s.heading !== null && hasBody(lines, s))
    .map((s) => sectionUnit(file, lines, s, 'report-section', date ? { date } : {}));
}

export function loadDecisionLog(file: string, content: string): Unit[] {
  const lines = content.split('\n');
  return decisionRows(file, lines, 0, lines.length, (d) => `Decision of ${d}:`, 'doc-section', 'Decision log');
}

/** Generic loader: one unit per ## or ### section, plus the preamble when it has content. */
export function loadMarkdown(file: string, content: string, kind: ChunkKind): Unit[] {
  const lines = content.split('\n');
  return sections(lines, [2, 3])
    .filter((s) => (s.heading === null ? lines.slice(s.start, s.end).some((l) => l.trim() !== '' && !/^#\s/.test(l)) : hasBody(lines, s)))
    .map((s) => {
      const date = isoDate(s.heading ?? '');
      return sectionUnit(file, lines, s, kind, date ? { date } : {});
    });
}
