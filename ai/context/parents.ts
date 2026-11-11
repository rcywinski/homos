/**
 * Parent units for contextualization (step 1.7). Instead of sending a whole file (CONTEXT.md is ~150k tokens,
 * read 177 times), each chunk is sent with its parent unit only:
 *   - a morning report chunk (one ## section): the whole report;
 *   - a chunk of a split unit (id ending in #pN): the whole unit, e.g. the whole journal entry;
 *   - any other chunk is its own unit: no parent block (the project brief still gives the big picture).
 * Chunks are grouped by parent so the first call of a group writes the parent to the cache and the rest read it.
 */
import { readFileSync } from 'fs';
import path from 'path';
import type { Chunk } from '../corpus/types';
import type { ContextRequest } from './types';

export interface Group {
  key: string;
  requests: ContextRequest[];
}

export function parentKey(c: Chunk): string {
  return c.file.startsWith('journal/reports/') ? c.file : c.id.replace(/#p\d+$/, '');
}

export function groupByParent(chunks: Chunk[], root = process.cwd()): Group[] {
  const byKey = new Map<string, Chunk[]>();
  for (const c of chunks) {
    const k = parentKey(c);
    byKey.set(k, [...(byKey.get(k) ?? []), c]);
  }
  const files = new Map<string, string[]>();
  const lines = (f: string) => {
    if (!files.has(f)) files.set(f, readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n').split('\n'));
    return files.get(f)!;
  };
  const groups: Group[] = [];
  for (const [key, members] of byKey) {
    const first = members[0];
    let parent: ContextRequest['parent'];
    if (first.file.startsWith('journal/reports/')) {
      parent = { label: first.file, text: lines(first.file).join('\n') };
    } else if (members.length > 1 || first.part) {
      const from = Math.min(...members.map((m) => m.lineStart));
      const to = Math.max(...members.map((m) => m.lineEnd));
      parent = { label: `${first.file}:${from}-${to}`, text: lines(first.file).slice(from - 1, to).join('\n') };
    }
    groups.push({ key, requests: members.map((chunk) => ({ chunk, parent })) });
  }
  return groups;
}
