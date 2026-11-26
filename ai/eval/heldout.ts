/**
 * Step 6.2 (c): the held-out test set, written in reviewed batches (ai/eval/review/heldout-batch-N.json).
 *   npx tsx ai/eval/heldout.ts review <batch.json> <out.md>   write the review file for the owner
 *   npx tsx ai/eval/heldout.ts apply <batch.json> [out.jsonl] write the batch into ai/eval/heldout.jsonl (or a scratch
 *                                                             copy, to run the golden check on a draft)
 *
 * Rules (owner, 26 Nov 2026): the questions and references are drafted from the corpus read directly, never from
 * retrieval output; nothing is run on them (no retrieval, no model) before the file is frozen, the first run is step
 * 6.12; no question reworks a development-set question or rests on the same sources, so every span and related range
 * that overlaps a range of ai/eval/golden.jsonl is refused; one or two questions per batch are the owner's own.
 *
 * Only this file, the golden check (given the path) and heldout.test.ts may name the held-out file; the test fails if
 * any other code under ai/ does, so no evaluation runner can read it by accident.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { answersHash, overlaps, requiredOnly, type Answerable, type Category, type Evidence, type GoldenQuestion, type Role } from './golden';
import { cell, ends, short } from './span-text';

export const HELDOUT = 'ai/eval/heldout.jsonl';
const DEV = 'ai/eval/golden.jsonl';

interface Span {
  file: string;
  lines: [number, number];
  role: Role;
  facts?: string[];
  reason: string;
}
interface BatchQuestion {
  id: string;
  category: Category;
  answerable: Answerable;
  author: 'CC-Mac' | 'owner';
  question: string;
  reference: string;
  facts?: Record<string, string>;
  spans: Span[];
  related?: { file: string; lines: [number, number]; reason: string }[];
  /** The nearest development question, named after reading the dev list ("none" allowed), with a short why. */
  closestDev: string;
  notes?: string;
}
interface Batch {
  batch: number;
  date: string;
  questions: BatchQuestion[];
  /** Items of earlier batches taken out of the held-out file by the owner's decision, with the reason. */
  withdraw?: { id: string; reason: string }[];
}

const parse = (text: string) =>
  text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenQuestion);

const label = (r: { file: string; lines: [number, number] }) => `${r.file}:${r.lines[0]}-${r.lines[1]}`;
const touches = (a: { file: string; lines: [number, number] }, b: Evidence) =>
  a.file === b.file && a.lines[0] <= b.lines[1] && b.lines[0] <= a.lines[1];

/** Ranges of the batch that overlap a development-set range, as "range overlaps dev-id range". */
export function devOverlaps(batch: Batch, dev: GoldenQuestion[]): string[] {
  const out: string[] = [];
  for (const q of batch.questions)
    for (const r of [...q.spans, ...(q.related ?? [])])
      for (const d of dev)
        for (const e of [...d.evidence, ...(d.related ?? [])])
          if (touches(r, e)) out.push(`${q.id} ${label(r)} overlaps ${d.id} ${label(e)}`);
  return out;
}

/** The source unit of a chunk (a dated journal entry, a report section, a doc section): its id without "#pN". */
const unit = (c: Chunk) => c.id.replace(/#p\d+$/, '');

/**
 * Chunk-level check against the development set (analysis session's review of batch 1). Errors: a required held-out
 * span in a chunk that holds a required dev span (line ranges can differ and still share a chunk, so retrieval tuned
 * on the dev question would lift the held-out one). Warnings: any held-out range in the same source unit (same
 * heading) as any dev range, to be read by hand. Reads the chunk boundaries only; runs no retrieval.
 */
export function chunkClashes(batch: Batch, dev: GoldenQuestion[], chunks: Chunk[]): { errors: string[]; warnings: Map<string, string[]> } {
  const inChunks = (r: { file: string; lines: [number, number] }) => chunks.filter((c) => overlaps(c, r as Evidence));
  const devReq = new Map<string, string[]>();
  const devUnit = new Map<string, Set<string>>();
  for (const d of dev) {
    for (const e of requiredOnly(d.evidence)) for (const c of inChunks(e)) devReq.set(c.id, [...(devReq.get(c.id) ?? []), d.id]);
    for (const e of [...d.evidence, ...(d.related ?? [])]) for (const c of inChunks(e)) devUnit.set(unit(c), (devUnit.get(unit(c)) ?? new Set()).add(d.id));
  }
  const errors: string[] = [];
  const warnings = new Map<string, string[]>();
  for (const q of batch.questions) {
    for (const s of q.spans.filter((x) => x.role === 'required'))
      for (const c of inChunks(s)) if (devReq.has(c.id)) errors.push(`${q.id} ${label(s)} is in chunk ${c.id}, which holds required evidence of ${[...new Set(devReq.get(c.id))].join(', ')}`);
    const w: string[] = [];
    for (const r of [...q.spans, ...(q.related ?? [])])
      for (const c of inChunks(r)) {
        const ids = devUnit.get(unit(c));
        if (ids) w.push(`${label(r)} is in section ${unit(c)} ("${c.title.slice(0, 60)}"), which also holds ranges of ${[...ids].join(', ')}`);
      }
    if (w.length) warnings.set(q.id, [...new Set(w)]);
  }
  return { errors, warnings };
}

function load(path: string): Batch & { warnings: Map<string, string[]> } {
  const batch = JSON.parse(readFileSync(path, 'utf8')) as Batch;
  const dev = parse(readFileSync(DEV, 'utf8'));
  const devIds = new Set(dev.map((q) => q.id));
  for (const q of batch.questions) {
    if (!q.id.startsWith('ho-')) throw new Error(`${q.id}: held-out ids start with "ho-"`);
    if (devIds.has(q.id)) throw new Error(`${q.id} is a development-set id`);
    for (const s of q.spans) for (const f of s.facts ?? []) if (!q.facts || !(f in q.facts)) throw new Error(`${q.id}: unknown fact ${f}`);
  }
  const clash = devOverlaps(batch, dev);
  if (clash.length) throw new Error(`ranges shared with the development set:\n  ${clash.join('\n  ')}`);
  const { errors, warnings } = chunkClashes(batch, dev, loadCorpus(process.cwd()));
  if (errors.length) throw new Error(`required spans in chunks with required development evidence:\n  ${errors.join('\n  ')}`);
  for (const q of batch.questions) if (!q.closestDev?.trim()) throw new Error(`${q.id}: closestDev missing (name the nearest dev question, or "none")`);
  return { ...batch, warnings };
}

function review(path: string, out: string) {
  const batch = load(path);
  const md: string[] = [
    `# Held-out batch ${batch.batch} (${batch.date}): questions, references and spans`,
    '',
    `Generated by \`npx tsx ai/eval/heldout.ts review ${path} ${out}\`; do not edit by hand. Drafted from the corpus read`,
    'directly, never from retrieval output; nothing has been run on these questions. Checked by the tool: no range',
    'overlaps a development-set range, and no required span shares a chunk with required development evidence; a range in',
    'the same section (heading) as a development range is listed under the question for a reading by hand. Each span',
    'shows its first and last line as they stand in the corpus: a span is required only if a reader could state its facts',
    'from it alone.',
    '',
  ];
  for (const q of batch.questions) {
    md.push(`## ${q.id} (${q.category}, answerable: ${q.answerable}, by ${q.author})`, '', `**Question.** ${q.question}`, '', `**Reference.** ${q.reference}`, '');
    if (q.notes) md.push(`**Notes.** ${q.notes}`, '');
    md.push(`**Closest dev question:** ${q.closestDev}`, '');
    const w = batch.warnings.get(q.id);
    if (w) md.push('**Same section as development ranges (read by hand):**', '', ...w.map((x) => `- ${x}`), '');
    for (const [f, text] of Object.entries(q.facts ?? {})) {
      const n = q.spans.filter((s) => s.facts?.includes(f)).length;
      md.push(`- **${f}**: ${text}${n ? ` (${n} span${n > 1 ? 's' : ''})` : ' (**no span**)'}`);
    }
    if (q.spans.length) {
      md.push('', '| span | role | facts | first line | last line | reason |', '|---|---|---|---|---|---|');
      for (const s of q.spans) {
        const [first, last] = ends(s.file, s.lines);
        md.push(`| ${short(s.file)}:${s.lines[0]}-${s.lines[1]} | ${s.role} | ${(s.facts ?? []).join(', ') || '-'} | ${cell(first)} | ${cell(last)} | ${cell(s.reason)} |`);
      }
    }
    if (q.related?.length) {
      md.push('', 'Related (should surface, does not answer):', '', '| range | first line | last line | reason |', '|---|---|---|---|');
      for (const r of q.related) {
        const [first, last] = ends(r.file, r.lines);
        md.push(`| ${short(r.file)}:${r.lines[0]}-${r.lines[1]} | ${cell(first)} | ${cell(last)} | ${cell(r.reason)} |`);
      }
    }
    md.push('');
  }
  if (batch.withdraw?.length) md.push('## Withdrawn from earlier batches', '', ...batch.withdraw.map((w) => `- **${w.id}**: ${w.reason}`), '');
  writeFileSync(out, md.join('\n'));
  console.log(`wrote ${out}: ${batch.questions.length} questions`);
}

function apply(path: string, target = HELDOUT) {
  const batch = load(path);
  const withdrawn = new Set((batch.withdraw ?? []).map((w) => w.id));
  const items = (existsSync(target) ? parse(readFileSync(target, 'utf8')) : []).filter((q) => !withdrawn.has(q.id));
  for (const q of batch.questions) {
    const item: GoldenQuestion = {
      id: q.id,
      category: q.category,
      question: q.question,
      answerable: q.answerable,
      evidence: q.spans.map((s): Evidence => ({ file: s.file, lines: s.lines, role: s.role, ...(s.facts ? { facts: s.facts } : {}) })),
      ...(q.related?.length ? { related: q.related.map((r) => ({ file: r.file, lines: r.lines })) } : {}),
      ...(q.facts ? { facts: q.facts } : {}),
      reference: q.reference,
      notes: `${q.notes ? `${q.notes} ` : ''}Held-out batch ${batch.batch} (${batch.date}), written by ${q.author}; review file ai/eval/review/heldout-batch-${batch.batch}.md.`,
    };
    const at = items.findIndex((x) => x.id === q.id);
    if (at >= 0) items[at] = item;
    else items.push(item);
  }
  writeFileSync(target, items.map((q) => JSON.stringify(q)).join('\n') + '\n');
  console.log(`${target}: ${items.length} questions, answers hash ${answersHash(items)}`);
}

const [cmd, path, out] = process.argv.slice(2);
if (require.main === module) {
  if (cmd === 'review' && path && out) review(path, out);
  else if (cmd === 'apply' && path) apply(path, out);
  else {
    console.error('usage: heldout.ts review <batch.json> <out.md> | apply <batch.json> [out.jsonl]');
    process.exit(1);
  }
}
