/**
 * npm run ai:golden:check [-- path/to/golden.jsonl]
 * Validates the golden question set against the current corpus: format, categories, evidence ranges
 * that resolve to chunks, the "why needs journal/ evidence" rule, and copied wording.
 * Exits with 1 on any error; warnings (including an incomplete category mix) do not fail.
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { corpusFiles, loadCorpus } from '../corpus/load';
import { CATEGORIES, checkGolden, TARGET, type Evidence } from './golden';

const file = process.argv[2] ?? 'ai/eval/golden.jsonl';
if (!existsSync(file)) {
  console.log(`${file} does not exist yet.`);
  process.exit(1);
}

const root = process.cwd();
const chunks = loadCorpus(root);
const fileLines = new Map(
  corpusFiles(root).map((f) => [f, readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n').split('\n').length]),
);
const { questions, issues, hits, relatedHits, overlap } = checkGolden(readFileSync(file, 'utf8'), chunks, fileLines);

console.log(`\n${file}: ${questions.length} questions\n`);
questions.forEach((q, k) => {
  const fmt = (list: Evidence[], ids: string[][] | undefined, tag: string) =>
    list.map((e, i) => `${tag} ${e.file}:${e.lines?.[0]}-${e.lines?.[1]} -> ${(ids?.[i] ?? []).join(', ') || 'NO CHUNK'}`);
  const ranges = [...fmt(q.evidence, hits[k], 'hit'), ...fmt(q.related ?? [], relatedHits[k], 'rel')];
  console.log(`${q.id.padEnd(14)} ${q.category.padEnd(11)} ${String(q.answerable).padEnd(7)} overlap ${String(Math.round((overlap[k] ?? 0) * 100)).padStart(3)}%  ${q.question}`);
  ranges.forEach((r) => console.log(`${' '.repeat(16)}${r}`));
});

console.log('\nCategory mix (have / target)');
for (const c of CATEGORIES) {
  const n = questions.filter((q) => q.category === c).length;
  console.log(`  ${c.padEnd(11)} ${String(n).padStart(2)} / ${TARGET[c]}${n === TARGET[c] ? '' : '  (incomplete)'}`);
}

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
console.log(`\n${errors.length} errors, ${warnings.length} warnings`);
for (const i of [...errors, ...warnings]) console.log(`  ${i.level.toUpperCase().padEnd(7)} line ${i.line} ${i.id}: ${i.message}`);
if (errors.length) process.exit(1);
