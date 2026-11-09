/**
 * Evidence lookup for writing the golden set.
 *
 *   npm run ai:find -- "FLAT_NARROW"                    lines matching a case-insensitive regex, with chunk ids
 *   npm run ai:find -- "zwęż" --file CONTEXT --limit 40  only files whose path contains "CONTEXT"
 *   npm run ai:find -- --show journal/CONTEXT.md:1564-1616   print a line range and the chunks it overlaps
 */
import { readFileSync } from 'fs';
import path from 'path';
import { corpusFiles, loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { estimateTokens } from '../corpus/tokens';

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const show = opt('--show');
const fileFilter = opt('--file');
const limit = Number(opt('--limit') ?? 30);
const query = args.join(' ');

const root = process.cwd();
const chunks = loadCorpus(root);
const read = (f: string) => readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n').split('\n');
const covering = (file: string, a: number, b: number): Chunk[] =>
  chunks.filter((c) => c.file === file && c.lineStart <= b && c.lineEnd >= a);
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

if (show) {
  const m = /^(.+):(\d+)-(\d+)$/.exec(show);
  if (!m) {
    console.error('usage: --show <file>:<start>-<end>');
    process.exit(1);
  }
  const [file, a, b] = [m[1], Number(m[2]), Number(m[3])];
  const lines = read(file);
  for (let n = a; n <= Math.min(b, lines.length); n++) console.log(`${String(n).padStart(5)}  ${lines[n - 1]}`);
  console.log('\nChunks overlapping this range:');
  for (const c of covering(file, a, b))
    console.log(`  ${c.id}  lines ${c.lineStart}-${c.lineEnd}  ${estimateTokens(c.text)} tok  ${c.date ?? ''}  ${cut(c.title, 60)}`);
  process.exit(0);
}

if (!query) {
  console.error('usage: npm run ai:find -- "<regex>" [--file <path part>] [--limit N] | --show <file>:<a>-<b>');
  process.exit(1);
}

const re = new RegExp(query, 'iu');
let shown = 0;
let total = 0;
for (const file of corpusFiles(root)) {
  if (fileFilter && !file.includes(fileFilter)) continue;
  read(file).forEach((line, i) => {
    if (!re.test(line)) return;
    total++;
    if (shown >= limit) return;
    shown++;
    const ids = covering(file, i + 1, i + 1).map((c) => c.id);
    const at = line.search(re);
    const snippet = line.slice(Math.max(0, at - 50), at + 90).trim();
    console.log(`${file}:${i + 1}  [${ids.join(', ') || 'no chunk'}]\n    ${cut(snippet, 140)}`);
  });
}
console.log(`\n${total} matching lines${total > shown ? `, showing ${shown} (use --limit or --file)` : ''}`);
