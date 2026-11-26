/**
 * Step 6.2 (c) guards: no evaluation code may read the held-out set before step 6.12, and a held-out range may not
 * overlap a development-set range. Run: npx tsx ai/eval/heldout.test.ts
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import type { GoldenQuestion } from './golden';
import { devOverlaps } from './heldout';

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

console.log(`heldout: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
