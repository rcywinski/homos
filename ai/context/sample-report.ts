/**
 * npm run ai:context:sample-report -- <a.jsonl> <b.jsonl> [--out ai/context/sample-n20.md]
 * Side by side, for a human reader: each sampled chunk (header and start of the text) with the context written by
 * each model, plus a mechanical check: identifiers found in the chunk that the context does not mention.
 */
import { readFileSync, writeFileSync } from 'fs';
import { loadCorpus } from '../corpus/load';
import { readContexts } from './contexts-file';

const files = process.argv.slice(2).filter((a) => a.endsWith('.jsonl'));
const outIdx = process.argv.indexOf('--out');
const out = outIdx >= 0 ? process.argv[outIdx + 1] : 'ai/context/sample-n20.md';
const runs = files.map((f) => ({ name: f.replace(/^.*sample-/, '').replace(/-n\d+\.jsonl$/, ''), map: readContexts(f) }));
const usage = files.map((f) => {
  const u = JSON.parse(readFileSync(f.replace(/\.jsonl$/, '.usage.json'), 'utf8')) as { runs: Array<{ model: string; costUsd: number; usage: Record<string, number>; done: number; wallSeconds: number }> };
  return u.runs[u.runs.length - 1];
});

/** Position ids, pairs, UPPER_SNAKE names and code-like identifiers. */
export function identifiers(text: string): string[] {
  const found = new Set<string>();
  for (const re of [/#\d{5,}/g, /\b[A-Za-z0-9]{2,8}\/[A-Za-z0-9]{2,8}\b/g, /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, /\b[a-z]+[A-Z][A-Za-z0-9]+\b/g])
    for (const m of text.match(re) ?? []) found.add(m);
  return [...found];
}

const chunks = new Map(loadCorpus().map((c) => [c.id, c]));
const ids = [...runs[0].map.keys()];
const lines: string[] = ['# Context sample: ' + runs.map((r) => r.name).join(' vs ') + ` (${ids.length} chunks)`, ''];
lines.push('| model | chunks | cost USD | input | cache write | cache read | output | wall s |', '|---|---|---|---|---|---|---|---|');
for (const u of usage)
  lines.push(`| ${u.model} | ${u.done} | ${u.costUsd} | ${u.usage.input} | ${u.usage.cacheWrite} | ${u.usage.cacheRead} | ${u.usage.output} | ${u.wallSeconds} |`);
lines.push('', 'Identifier check is mechanical (regex): it lists ids, pairs and names found in the chunk but missing from the context.', '');
for (const id of ids) {
  const c = chunks.get(id)!;
  const ids_ = identifiers(c.text);
  lines.push(`## \`${id}\``, '', `${c.date ?? 'no date'} | ${c.kind} | ${c.title.slice(0, 100)}`, '');
  lines.push('> ' + c.text.slice(0, 400).replace(/\n+/g, ' ') + (c.text.length > 400 ? ' ...' : ''), '');
  for (const r of runs) {
    const ctx = r.map.get(id) ?? '(missing)';
    const missing = ids_.filter((x) => !ctx.toLowerCase().includes(x.toLowerCase()));
    lines.push(`- **${r.name}**: ${ctx}`, `  - identifiers missing: ${missing.length ? missing.join(', ') : 'none'}`);
  }
  lines.push('');
}
writeFileSync(out, lines.join('\n') + '\n');
console.log(`Wrote ${out}`);
