/**
 * Generated chunk contexts (step 1.7) live in a committed JSONL file, one line per chunk:
 *   {"id": "<chunk id>", "context": "<one or two English sentences>"}
 * They cost money to generate, so they are kept in the repo and reused instead of regenerated.
 * The file is not corpus: the loader never reads ai/ (rule "Corpus stability" in CLAUDE.md).
 */
import { readFileSync } from 'fs';
import type { Chunk } from '../corpus/types';

export interface ContextLine {
  id: string;
  context: string;
}

export function readContexts(file: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const { id, context } = JSON.parse(line) as ContextLine;
    if (map.has(id)) throw new Error(`${file}: duplicate id ${id}`);
    map.set(id, context);
  }
  return map;
}

/** Every chunk must have a context; a missing one means the file belongs to another corpus or chunker. */
export function applyContexts(chunks: Chunk[], file: string): Chunk[] {
  const map = readContexts(file);
  const missing = chunks.filter((c) => !map.has(c.id)).map((c) => c.id);
  if (missing.length) throw new Error(`${file}: no context for ${missing.length} chunks (first: ${missing[0]})`);
  return chunks.map((c) => ({ ...c, context: map.get(c.id) }));
}
