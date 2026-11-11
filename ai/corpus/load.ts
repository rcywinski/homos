/**
 * Corpus entry point: which files are indexed, with which loader, and the final chunk list.
 */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import type { Chunk, ChunkKind, Unit } from './types';
import { loadContext, loadDecisionLog, loadMarkdown, loadReport } from './loaders';
import { toChunks } from './split';

/**
 * Not indexed: documents about the AI layer itself, not knowledge about the project (rule in CLAUDE.md,
 * "Corpus stability"). docs/AI-RAG.md is listed before it exists so that writing it never changes the corpus.
 */
const EXCLUDED = new Set(['docs/AI-PLAN.md', 'docs/AI-RAG.md', 'journal/README.md']);

const NOTE_FILES = /^(DECYZJE-|KAPITAL-|PYTANIE-|SELECTOR-LOG)/;

function unitsFor(file: string, content: string): Unit[] {
  const base = path.basename(file);
  if (file === 'journal/CONTEXT.md') return loadContext(file, content);
  if (file.startsWith('journal/reports/')) return loadReport(file, content);
  if (file === 'docs/DECISION-LOG.md') return loadDecisionLog(file, content);
  const kind: ChunkKind = file.startsWith('docs/') ? 'doc-section' : NOTE_FILES.test(base) ? 'note-section' : 'queue-section';
  return loadMarkdown(file, content, kind);
}

export function corpusFiles(root: string): string[] {
  const md = (dir: string) =>
    readdirSync(path.join(root, dir))
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => `${dir}/${f}`);
  return [...md('journal'), ...md('journal/reports'), ...md('docs')].filter((f) => !EXCLUDED.has(f));
}

export function loadCorpus(root = process.cwd()): Chunk[] {
  const chunks: Chunk[] = [];
  for (const file of corpusFiles(root)) {
    const content = readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
    for (const unit of unitsFor(file, content)) chunks.push(...toChunks(unit));
  }
  return chunks;
}

/**
 * Step 1.7, measured as its own row (--file-dates): a chunk without a date whose file name carries one
 * (journal/DECYZJE-2026-08-26.md) gets that date as metadata, like the morning reports already do.
 * Off by default so earlier rows reproduce. Only metadata changes; the chunk text and the corpus hash do not.
 */
export function withFileDates(chunks: Chunk[]): Chunk[] {
  return chunks.map((c) => {
    if (c.date) return c;
    const m = path.basename(c.file).match(/(20\d\d-\d\d-\d\d)/);
    return m ? { ...c, date: m[1] } : c;
  });
}
