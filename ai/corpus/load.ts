/**
 * Corpus entry point: which files are indexed, with which loader, and the final chunk list.
 */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import type { Chunk, ChunkKind, Unit } from './types';
import { loadContext, loadDecisionLog, loadMarkdown, loadReport } from './loaders';
import { toChunks } from './split';

/** Not indexed: meta documents about the AI layer itself, not knowledge about the project. */
const EXCLUDED = new Set(['docs/AI-PLAN.md', 'journal/README.md']);

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
