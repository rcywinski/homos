/**
 * npm run ai:compare [-- --golden 1.2]
 * One table of every result in ai/eval/results/ for one golden version (default: the current one),
 * full and journal-only, then per category. Writes ai/eval/results/compare-golden-v<version>.md.
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fmtRatio, type Ratio } from './metrics';

type Block = Record<string, Ratio | number>;
interface Result {
  label: string;
  date: string;
  goldenVersion: string;
  retriever: string;
  metrics: { full: Block; journalOnly: Block; byCategory: Record<string, { full: Block; journalOnly: Block }> };
}

const dir = 'ai/eval/results';
const i = process.argv.indexOf('--golden');
const version =
  i >= 0 ? process.argv[i + 1] : (JSON.parse(readFileSync('ai/eval/golden-meta.json', 'utf8')) as { version: string }).version;

const results = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Result)
  .filter((r) => r.goldenVersion === version)
  .sort((a, b) => (a.date + a.label).localeCompare(b.date + b.label));

const cell = (b: Block, k: string) => {
  const v = b[k];
  return typeof v === 'number' ? v.toFixed(3) : v ? fmtRatio(v) : 'n/a';
};
const out: string[] = [];
out.push(`# Retrieval runs on golden v${version}`, '');
out.push('Full = any evidence range counts; journal-only = only evidence in `journal/` counts.', '');
out.push('| run | retriever | R@5 | R@10 | R@30 | MRR@10 | R@5 journal | R@10 journal | MRR@10 journal |', '|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  const f = r.metrics.full;
  const j = r.metrics.journalOnly;
  out.push(
    `| ${r.label} | \`${r.retriever}\` | ${cell(f, 'recall@5')} | ${cell(f, 'recall@10')} | ${cell(f, 'recall@30')} | ${cell(f, 'mrr@10')} | ${cell(j, 'recall@5')} | ${cell(j, 'recall@10')} | ${cell(j, 'mrr@10')} |`,
  );
}
const cats = [...new Set(results.flatMap((r) => Object.keys(r.metrics.byCategory)))];
for (const c of cats) {
  out.push('', `## ${c}`, '', '| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |', '|---|---|---|---|---|---|');
  for (const r of results) {
    const b = r.metrics.byCategory[c];
    out.push(`| ${r.label} | ${cell(b.full, 'recall@5')} | ${cell(b.full, 'recall@10')} | ${cell(b.full, 'recall@30')} | ${cell(b.full, 'mrr@10')} | ${cell(b.journalOnly, 'recall@10')} |`);
  }
}
const md = out.join('\n') + '\n';
const file = path.join(dir, `compare-golden-v${version}.md`);
writeFileSync(file, md);
console.log(md);
console.log(`Wrote ${file}`);
