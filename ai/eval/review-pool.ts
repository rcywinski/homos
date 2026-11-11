/**
 * npm run ai:review:pool [-- --golden 1.3 --out ai/eval/review/pool-v1.4.md]
 * The pooled review list (rule from step 1.6: misses are reviewed once, after 1.7, from one list pooled across all
 * runs). Every chunk that is in the top 5 of at least one run on this golden version and is not an evidence hit,
 * deduplicated and grouped by question. Facts only: which runs and at which rank, whether the chunk is already
 * listed as "related". Nothing is marked or judged here; the owner decides.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { loadCorpus } from '../corpus/load';
import { overlaps, type GoldenQuestion } from './golden';

const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);
const goldenVersion = arg('--golden') ?? (JSON.parse(readFileSync('ai/eval/golden-meta.json', 'utf8')) as { version: string }).version;
const out = arg('--out') ?? 'ai/eval/review/pool-v1.4.md';
const TOP = 5;

interface Result {
  label: string;
  goldenVersion: string;
  corpusHash: string;
  perQuestion: Array<{ id: string; top: Array<{ id: string; score: number }> }>;
}

const chunks = new Map(loadCorpus().map((c) => [c.id, c]));
const golden = readFileSync('ai/eval/golden.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as GoldenQuestion);
const dir = 'ai/eval/results';
const runs = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Result)
  .filter((r) => r.goldenVersion === goldenVersion && r.perQuestion)
  .sort((a, b) => a.label.localeCompare(b.label));
const hashes = [...new Set(runs.map((r) => r.corpusHash))];
if (hashes.length !== 1) throw new Error(`runs come from ${hashes.length} corpus hashes; pool only one corpus`);

const lines: string[] = [
  `# Pooled miss review for golden v${goldenVersion} -> v1.4`,
  '',
  `Every chunk in the top ${TOP} of at least one of ${runs.length} runs (golden v${goldenVersion}, corpus \`${hashes[0]}\`) that is not an`,
  'evidence hit, grouped by question. Nothing here is marked: the reader decides, per chunk, whether it answers the question.',
  'Rule (golden-meta.json): a chunk is added to evidence only if a human reading it agrees it answers the question.',
  '',
  `Runs: ${runs.map((r) => `\`${r.label}\``).join(', ')}.`,
  '',
];
let total = 0;
for (const q of golden) {
  const pool = new Map<string, Array<{ run: string; rank: number }>>();
  for (const r of runs) {
    const pq = r.perQuestion.find((x) => x.id === q.id);
    pq?.top.slice(0, TOP).forEach((t, i) => {
      const c = chunks.get(t.id);
      if (!c || q.evidence.some((e) => overlaps(c, e))) return;
      pool.set(t.id, [...(pool.get(t.id) ?? []), { run: r.label.replace(/-golden-v1-3$/, ''), rank: i + 1 }]);
    });
  }
  lines.push(`## ${q.id} (${q.category}, answerable: ${q.answerable})`, '', `**Q:** ${q.question}`, '', `**Reference:** ${q.reference}`, '');
  lines.push(`Evidence now: ${q.evidence.map((e) => `\`${e.file}:${e.lines[0]}-${e.lines[1]}\``).join(', ') || 'none'}.`, '');
  if (!pool.size) {
    lines.push('No misses in any top 5.', '');
    continue;
  }
  const sorted = [...pool.entries()].sort((a, b) => b[1].length - a[1].length || Math.min(...a[1].map((x) => x.rank)) - Math.min(...b[1].map((x) => x.rank)));
  for (const [id, seen] of sorted) {
    total++;
    const c = chunks.get(id)!;
    const related = (q.related ?? []).some((e) => overlaps(c, e));
    lines.push(
      `### \`${id}\``,
      '',
      `${c.file}:${c.lineStart}-${c.lineEnd} | ${c.date ?? 'no date'} | ${c.title.slice(0, 120)}${related ? ' | already listed as related' : ''}`,
      `In top ${TOP} of ${seen.length} run(s): ${seen.map((s) => `${s.run} #${s.rank}`).join(', ')}`,
      '',
      '> ' + c.text.slice(0, 300).replace(/\s*\n\s*/g, ' ') + (c.text.length > 300 ? ' ...' : ''),
      '',
    );
  }
}
lines.splice(8, 0, `${total} chunk-question pairs in total.`, '');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n') + '\n');
console.log(`Wrote ${out}: ${total} chunk-question pairs from ${runs.length} runs`);
