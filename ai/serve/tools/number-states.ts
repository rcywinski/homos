/**
 * Before/after count of number states on saved answers (phase 4, step 4.5). Offline: saved answers and the corpus.
 * Run: npx tsx ai/serve/tools/number-states.ts [answers file ...]
 */
import { readFileSync } from 'fs';
import type { AnswerRecord } from '../../answer/measures';
import { loadCorpus } from '../../corpus/load';
import { maskNetwork } from '../mask';
import { markNumbers, markNumbersStrict } from '../numbers';

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['ai/eval/results/2026-11-16-answers-k10-local-pb1-golden-v1-4.json', 'ai/eval/results/2026-11-16-answers-k10-local-pb2-golden-v1-4.json'];
const corpus = new Map(loadCorpus().map((c) => [c.id, c]));

for (const file of files) {
  const a = JSON.parse(readFileSync(file, 'utf8')) as { label: string; perQuestion: AnswerRecord[] };
  const before = { verified: 0, notVerified: 0 };
  const after = { verified: 0, inSourceChunk: 0, inSourceTransformed: 0, notVerified: 0 };
  const moved: string[] = [];
  for (const q of a.perQuestion) {
    if (q.coverage === 'error' || q.coverage === 'none') continue;
    const text = maskNetwork(q.answer);
    const ok = q.citations.filter((c) => c.status === 'ok');
    const cited = [...new Set(ok.map((c) => c.chunkId))].map((id) => corpus.get(id)?.text ?? '');
    for (const m of markNumbersStrict(text, ok.map((c) => c.quote))) {
      if (m.status === 'verified') before.verified++;
      else before.notVerified++;
    }
    for (const m of markNumbers(text, ok.map((c) => c.quote), cited)) {
      if (m.status === 'verified') after.verified++;
      else if (m.status === 'not-verified') after.notVerified++;
      else if (m.transformation) {
        after.inSourceTransformed++;
        const ctx = text.slice(Math.max(0, m.start - 25), m.end + 20).replace(/\s+/g, ' ');
        moved.push(`  ${q.id.padEnd(10)} ${m.transformation.padEnd(17)} "${m.text}" from source "${m.from}"   ...${ctx}...`);
      } else after.inSourceChunk++;
    }
  }
  const total = before.verified + before.notVerified;
  console.log(`${a.label}: ${total} numbers in answered questions`);
  console.log(`  before (two states): verified ${before.verified}, not verified ${before.notVerified}`);
  console.log(`  after (three states): verified ${after.verified}, in the cited source ${after.inSourceChunk + after.inSourceTransformed} (as is in a cited chunk ${after.inSourceChunk}, by transformation ${after.inSourceTransformed}), not verified ${after.notVerified}`);
  console.log(`  moved by a transformation (${moved.length}):`);
  moved.forEach((l) => console.log(l));
}
