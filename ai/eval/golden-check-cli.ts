/**
 * npm run ai:golden:check [-- path/to/golden.jsonl]
 * Validates the golden question set against the current corpus: format, categories, evidence ranges
 * that resolve to chunks, the "why needs journal/ evidence" rule, and copied wording.
 * Exits with 1 on any error; warnings (including an incomplete category mix) do not fail.
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { corpusFiles, loadCorpus } from '../corpus/load';
import { answersHash, CATEGORIES, checkGolden, TARGET, type Evidence, type GoldenMeta } from './golden';

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

// golden.jsonl -> golden-meta.json; any other set -> its own <name>-meta.json.
const metaFile = file.replace(/\.jsonl$/, '-meta.json');
const meta = existsSync(metaFile) ? (JSON.parse(readFileSync(metaFile, 'utf8')) as GoldenMeta) : undefined;
const version = meta?.version ?? 'unknown';
// Stored answers and verdicts are tied to the question and reference text through this hash (see golden-meta rules).
const hash = answersHash(questions);
if (meta && meta.answersHash !== hash)
  issues.push({ level: 'error', line: 0, id: 'meta', message: `golden-meta answersHash ${meta.answersHash ?? '(none)'}, the file hashes to ${hash}: a question or reference changed; record a new version with its hash` });
if (meta && meta.changes.find((c) => c.version === meta.version)?.answersHash !== meta.answersHash)
  issues.push({ level: 'error', line: 0, id: 'meta', message: `the change entry of v${meta.version} does not carry the current answersHash` });
console.log(`\n${file} (golden v${version}, answers ${hash}): ${questions.length} questions\n`);
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
