/**
 * npm run ai:answers:reverify -- <answers result .json>...
 * Re-runs the citation check of a stored answer run with the current verifier, without any API call, and rewrites
 * the measures. Used when the verifier, not the model, was wrong (10 Nov 2026: blockquote markers).
 */
import { readFileSync, writeFileSync } from 'fs';
import { loadCorpus } from '../corpus/load';
import { citationCounts, citesEvidence, confusion, costAndLatency } from './measures';
import { overlaps, type GoldenQuestion } from '../eval/golden';
import { verifyCitation } from './verify';
import { renderMarkdown, type Rendered } from '../eval/answers';

const chunks = new Map(loadCorpus().map((c) => [c.id, c]));
const golden = new Map(
  readFileSync('ai/eval/golden.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => {
    const q = JSON.parse(l) as GoldenQuestion;
    return [q.id, q] as const;
  }),
);
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(file, 'utf8')) as Rendered & { reverified?: string[] };
  let changed = 0;
  for (const p of r.perQuestion) {
    const given = new Map(p.citations.filter((c) => chunks.has(c.chunkId)).map((c) => [c.chunkId, chunks.get(c.chunkId)!]));
    p.citations = p.citations.map((c) => {
      const v = c.status === 'unknown-chunk' ? c : verifyCitation({ chunkId: c.chunkId, quote: c.quote }, given);
      if (v.status !== c.status) changed++;
      return v;
    });
    const q = golden.get(p.id)!;
    p.citesEvidence = p.citations.some((c) => c.status === 'ok' && q.evidence.some((e) => overlaps(chunks.get(c.chunkId)!, e)));
  }
  r.measures = { citations: citationCounts(r.perQuestion), citesEvidence: citesEvidence(r.perQuestion), confusion: confusion(r.perQuestion), cost: costAndLatency(r.perQuestion) };
  r.reverified = [...(r.reverified ?? []), `${new Date().toISOString()}: ${changed} citation statuses changed`];
  writeFileSync(file, JSON.stringify(r, null, 2) + '\n');
  writeFileSync(file.replace(/\.json$/, '.md'), renderMarkdown(r, [...golden.values()]));
  console.log(`${file}: ${changed} citation statuses changed`);
}
