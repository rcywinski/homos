/**
 * Chunk model shared by the whole AI layer.
 *
 * A chunk is the unit that gets embedded, retrieved and cited. Its id is the citation itself:
 * `<file>:<first line of the source unit>`, plus `#p<n>` when an oversized unit was split.
 * The journal is frozen, so these ids stay stable for the golden question set (step 1.2).
 */

export type ChunkKind =
  | 'journal-entry' // one dated session entry (### header) in CONTEXT.md section 4
  | 'journal-section' // CONTEXT.md sections 1 and 3 (state, things to verify) and the preamble
  | 'decision' // one row of a decision table (CONTEXT.md section 2 or docs/DECISION-LOG.md)
  | 'report-section' // one ## section of a morning report
  | 'queue-section' // HANDOFF.md, TASKS-*.md, RESEARCH-QUEUE.md
  | 'note-section' // decision notes and logs in journal/
  | 'doc-section'; // English documentation in docs/

export interface Chunk {
  id: string;
  /** Repo-relative path, e.g. `journal/CONTEXT.md`. */
  file: string;
  /** 1-based, inclusive. */
  lineStart: number;
  lineEnd: number;
  /** ISO date (YYYY-MM-DD) when the source unit has one. */
  date?: string;
  /** Session names found in a journal entry header (Fable, CC-Mac, CC-Win, Sonnet, Opus, Rafał). */
  session?: string;
  kind: ChunkKind;
  /** Header of the source unit, without the leading #'s. Prepended to every part of a split unit. */
  title: string;
  text: string;
  /** Present only when the source unit was split: 1-based index and total number of parts. */
  part?: { index: number; of: number };
}

/**
 * A source unit before size control: one journal entry, one report section, one table row...
 * `toChunks` (split.ts) turns it into one chunk, or several if it is above the cap.
 */
export interface Unit {
  file: string;
  lineStart: number;
  lineEnd: number;
  kind: ChunkKind;
  title: string;
  /** Full text of the unit, usually the verbatim file lines including the header line. */
  text: string;
  /** Offset in `text` where the content after the header starts (0 when the header is not in `text`). */
  bodyStart: number;
  /**
   * True when `text` is a verbatim slice of lines lineStart..lineEnd, so character offsets map to lines.
   * False for synthetic text (a table row rewritten as a sentence): all parts keep the unit's lines.
   */
  raw: boolean;
  date?: string;
  session?: string;
}
