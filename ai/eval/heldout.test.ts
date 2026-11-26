/**
 * Step 6.2 (c) guards: no evaluation code may read the held-out set before step 6.12, and a held-out range may not
 * overlap a development-set range. Run: npx tsx ai/eval/heldout.test.ts
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import type { GoldenQuestion } from './golden';
import { chunkClashes, devOverlaps } from './heldout';
import type { Chunk } from '../corpus/types';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

// Only these files may name the held-out set: the batch tool and this test.
const ALLOWED = new Set(['ai/eval/heldout.ts', 'ai/eval/heldout.test.ts']);
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return f === 'node_modules' || f === 'index' || f === 'results' || f === 'review' ? [] : walk(p);
    return /\.(ts|tsx|js|mjs)$/.test(f) ? [p] : [];
  });
}
const naming = [...walk('ai'), ...walk('showcase'), ...walk('inference')].filter((f) => !ALLOWED.has(f) && /heldout|held-out/i.test(readFileSync(f, 'utf8')));
check('no code outside the batch tool names the held-out set', naming.length === 0, naming.join(', '));

const dev = [
  { id: 'why-01', evidence: [{ file: 'journal/CONTEXT.md', lines: [100, 110] }], related: [{ file: 'docs/PLAN.md', lines: [5, 6] }] },
] as unknown as GoldenQuestion[];
const batch = (lines: [number, number], file = 'journal/CONTEXT.md') => ({
  batch: 1,
  date: '',
  questions: [{ id: 'ho-why-01', category: 'why', answerable: 'yes', author: 'CC-Mac', question: '', reference: '', spans: [{ file, lines, role: 'required', reason: '' }] }],
}) as unknown as Parameters<typeof devOverlaps>[0];
check('overlapping span refused', devOverlaps(batch([110, 120]), dev).length === 1);
check('adjacent span allowed', devOverlaps(batch([111, 120]), dev).length === 0);
check('same lines, other file allowed', devOverlaps(batch([100, 110], 'journal/HANDOFF.md'), dev).length === 0);
check('dev related ranges count too', devOverlaps(batch([6, 9], 'docs/PLAN.md'), dev).length === 1);

// Chunk level: a required span in a chunk with required dev evidence is refused; the same section only warns.
const chunk = (id: string, a: number, b: number) => ({ id, file: 'journal/CONTEXT.md', lineStart: a, lineEnd: b, title: 'entry', kind: 'journal-entry', text: '' }) as Chunk;
const chunks = [chunk('journal/CONTEXT.md:100', 100, 130), chunk('journal/CONTEXT.md:100#p2', 131, 160)];
const devReq = [{ id: 'why-01', evidence: [{ file: 'journal/CONTEXT.md', lines: [101, 102] }] }] as unknown as GoldenQuestion[];
const sameChunk = chunkClashes(batch([120, 125]), devReq, chunks);
check('required span sharing a chunk with required dev evidence is an error', sameChunk.errors.length === 1, sameChunk.errors.join('; '));
const sameUnit = chunkClashes(batch([140, 145]), devReq, chunks);
check('other part of the same entry only warns', sameUnit.errors.length === 0 && sameUnit.warnings.get('ho-why-01')?.length === 1);
const devSup = [{ id: 'why-01', evidence: [{ file: 'journal/CONTEXT.md', lines: [101, 102], role: 'supporting' }] }] as unknown as GoldenQuestion[];
check('a supporting dev span does not block the chunk', chunkClashes(batch([120, 125]), devSup, chunks).errors.length === 0);

console.log(`heldout: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
