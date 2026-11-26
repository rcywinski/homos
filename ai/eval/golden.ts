/**
 * Golden question set: format, parsing and validation.
 *
 * Decisions agreed with the owner (step 1.2):
 *  - evidence is a file + line range, not a chunk id, so the set survives changes to the chunker;
 *    a retrieved chunk is a hit when it is in the same file and its lines overlap the range;
 *  - any one evidence range is enough for a hit; every "why" question has at least one range in journal/;
 *  - every question carries a one-sentence reference answer (used by the LLM judge in step 1.9);
 *  - `answerable` is yes | partial | no. "partial" means the topic is in the corpus but the premise is wrong or only
 *    part is answerable: no evidence hits, but `related` ranges that should surface and be classified, not used.
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import type { Chunk } from '../corpus/types';

export const CATEGORIES = ['why', 'dated-fact', 'identifier', 'no-answer'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Target mix agreed for draft v1 (docs/AI-PLAN.md had 10/10/5/5). Warning only. */
export const TARGET: Record<Category, number> = { why: 10, 'dated-fact': 10, identifier: 7, 'no-answer': 7 };

export const ANSWERABLE = ['yes', 'partial', 'no'] as const;
export type Answerable = (typeof ANSWERABLE)[number];

export const ROLES = ['required', 'supporting'] as const;
export type Role = (typeof ROLES)[number];

export interface Evidence {
  file: string;
  /** 1-based, inclusive [start, end]. */
  lines: [number, number];
  /**
   * Step 6.2 (golden v1.5). "required": a reader could state a fact the reference needs from this span alone.
   * "supporting": it only corroborates. Unmarked counts as required (the v1.4 meaning). Both count as a hit for
   * recall and MRR; span coverage is reported for required spans and for all spans.
   */
  role?: Role;
  /** Step 6.2 (golden v1.6): letters of the question's `facts` that this required span states alone. */
  facts?: string[];
}

/**
 * Facts for required coverage: the question's facts mapped to their spans, or, for a question not yet marked, each
 * required span as its own fact. `none` counts facts that no span states.
 */
export function factSpans(q: GoldenQuestion): { spans: Evidence[][]; none: number } {
  const req = requiredOnly(q.evidence);
  if (!q.facts) return { spans: req.map((e) => [e]), none: 0 };
  const spans = Object.keys(q.facts).map((f) => req.filter((e) => e.facts?.includes(f)));
  return { spans: spans.filter((s) => s.length), none: spans.filter((s) => !s.length).length };
}

/** Required spans of a question: marked "required" or unmarked. */
export function requiredOnly(ranges: Evidence[]): Evidence[] {
  return ranges.filter((r) => r.role !== 'supporting');
}

export interface GoldenQuestion {
  id: string;
  category: Category;
  question: string;
  answerable: Answerable;
  /** Ranges that answer the question; a retrieved chunk overlapping any of them is a hit. */
  evidence: Evidence[];
  /** Ranges that should surface for partial/no questions but do not count as hits. */
  related?: Evidence[];
  /**
   * Step 6.2 (golden v1.6): the facts of the reference, by letter. Required coverage counts facts with at least one
   * of their spans in the top k. A fact no span states (an absence in the corpus) stays listed and is reported apart.
   */
  facts?: Record<string, string>;
  reference: string;
  notes?: string;
}

/** True when the chunk is in the evidence file and its lines overlap the range. */
export function overlaps(chunk: Chunk, ev: Evidence): boolean {
  return chunk.file === ev.file && chunk.lineStart <= ev.lines[1] && chunk.lineEnd >= ev.lines[0];
}

export interface Issue {
  line: number;
  id: string;
  level: 'error' | 'warning';
  message: string;
}

/** Content words of the question that also occur in the evidence text: a hint of copied wording. */
export function wordOverlap(question: string, evidenceText: string): number {
  const words = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}_]{5,}/gu) ?? [])];
  if (!words.length) return 0;
  const hay = evidenceText.toLowerCase();
  return words.filter((w) => hay.includes(w)).length / words.length;
}

export interface CheckResult {
  questions: GoldenQuestion[];
  issues: Issue[];
  /** Aligned with `questions`: chunk ids hit by each evidence range. */
  hits: string[][][];
  /** Aligned with `questions`: chunk ids of each related range. */
  relatedHits: string[][][];
  /** Aligned with `questions`: share of the question's longer words found in the evidence. */
  overlap: number[];
}

/**
 * Parse and validate a golden.jsonl file against the corpus.
 * `fileLines` gives the number of lines of each corpus file (for range bounds).
 */
export function checkGolden(content: string, chunks: Chunk[], fileLines: Map<string, number>): CheckResult {
  const issues: Issue[] = [];
  const questions: GoldenQuestion[] = [];
  const hits: string[][][] = [];
  const relatedHits: string[][][] = [];
  const overlap: number[] = [];
  const seen = new Set<string>();

  content.split('\n').forEach((raw, i) => {
    const line = i + 1;
    if (raw.trim() === '') return;
    const err = (id: string, message: string) => issues.push({ line, id, level: 'error', message });
    const warn = (id: string, message: string) => issues.push({ line, id, level: 'warning', message });

    let q: GoldenQuestion;
    try {
      q = JSON.parse(raw) as GoldenQuestion;
    } catch (e) {
      err('?', `invalid JSON: ${(e as Error).message}`);
      return;
    }
    const id = typeof q.id === 'string' ? q.id : '?';
    if (!/^[a-z-]+-\d\d$/.test(id)) err(id, 'id must look like "why-01"');
    if (seen.has(id)) err(id, 'duplicate id');
    seen.add(id);
    if (!CATEGORIES.includes(q.category)) err(id, `category must be one of ${CATEGORIES.join(', ')}`);
    if (typeof q.question !== 'string' || q.question.trim().length < 10) err(id, 'question missing or too short');
    if (typeof q.reference !== 'string' || q.reference.trim() === '') err(id, 'reference answer missing');
    if (!Array.isArray(q.evidence)) {
      err(id, 'evidence must be an array');
      return;
    }
    if (q.related !== undefined && !Array.isArray(q.related)) {
      err(id, 'related must be an array');
      return;
    }
    const related = q.related ?? [];

    if (!ANSWERABLE.includes(q.answerable)) err(id, `answerable must be one of ${ANSWERABLE.join(', ')}`);
    if (q.answerable === 'yes' && !q.evidence.length) err(id, 'answerable "yes" needs at least one evidence range');
    if (q.answerable === 'no' && q.evidence.length) err(id, 'answerable "no" must have evidence []');
    if (q.answerable === 'partial' && q.evidence.length) err(id, 'answerable "partial" must have evidence [] (use related)');
    if (q.answerable === 'partial' && !related.length) err(id, 'answerable "partial" needs a non-empty related list');
    for (const e of q.evidence) if (e.role !== undefined && !ROLES.includes(e.role)) err(id, `evidence role must be one of ${ROLES.join(', ')}`);
    if (q.answerable === 'yes' && q.evidence.length && !requiredOnly(q.evidence).length) err(id, 'answerable "yes" needs at least one required evidence range');
    if (q.facts !== undefined) {
      for (const e of q.evidence) {
        const label = `${e.file}:${e.lines?.[0]}-${e.lines?.[1]}`;
        if (e.role === 'supporting' && e.facts?.length) err(id, `${label}: a supporting span carries no facts`);
        if (e.role !== 'supporting' && !e.facts?.length) err(id, `${label}: a required span needs its facts`);
        for (const f of e.facts ?? []) if (!(f in q.facts)) err(id, `${label}: fact "${f}" is not in the question's facts`);
      }
      const stated = new Set(q.evidence.flatMap((e) => e.facts ?? []));
      const none = Object.keys(q.facts).filter((f) => !stated.has(f));
      if (none.length) warn(id, `facts with no span: ${none.join(', ')}`);
    } else if (q.evidence.some((e) => e.facts?.length)) err(id, 'evidence facts given without the question\'s facts');
    if (q.category === 'no-answer' && q.answerable === 'yes') warn(id, 'no-answer category marked answerable "yes"');
    if (q.category !== 'no-answer' && q.answerable !== 'yes') warn(id, `${q.category} question marked answerable "${q.answerable}"`);
    if (q.category === 'why' && q.answerable === 'yes' && !q.evidence.some((e) => e.file?.startsWith('journal/')))
      err(id, '"why" questions need at least one evidence range in journal/');
    if (q.category === 'dated-fact' && !q.evidence.some((e) => e.file?.startsWith('journal/reports/')))
      warn(id, 'dated-fact without a morning report in evidence');

    const resolve = (ranges: Evidence[], what: string) => {
      const perRange: string[][] = [];
      let text = '';
      for (const ev of ranges) {
        const label = `${what} ${ev.file}:${ev.lines?.[0]}-${ev.lines?.[1]}`;
        const n = fileLines.get(ev.file);
        if (n === undefined) {
          err(id, `${what} ${ev.file} is not a corpus file`);
          perRange.push([]);
          continue;
        }
        const [a, b] = ev.lines ?? [];
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a || b > n) {
          err(id, `${label}: bad range (file has ${n} lines)`);
          perRange.push([]);
          continue;
        }
        const hit = chunks.filter((c) => overlaps(c, ev));
        if (!hit.length) err(id, `${label} does not overlap any chunk`);
        if (hit.length > 3) warn(id, `${label} spans ${hit.length} chunks; a narrower range makes the metric sharper`);
        perRange.push(hit.map((c) => c.id));
        text += hit.map((c) => c.text).join('\n');
      }
      return { perRange, text };
    };
    const ev = resolve(q.evidence, 'evidence');
    const rel = resolve(related, 'related');
    const ov = wordOverlap(q.question ?? '', ev.text);
    hits.push(ev.perRange);
    relatedHits.push(rel.perRange);
    overlap.push(ov);
    if (ov >= 0.6) warn(id, `${Math.round(ov * 100)}% of the question's longer words appear in the evidence (copied wording?)`);
    questions.push(q);
  });

  return { questions, issues, hits, relatedHits, overlap };
}

export function readGolden(file: string): string {
  return readFileSync(file, 'utf8');
}

/** golden-meta.json: the current version, its answers hash, the rules and the change log. */
export interface GoldenMeta {
  version: string;
  /** answersHash() of the current golden.jsonl; the golden check fails when it is stale. */
  answersHash?: string;
  rules: string[];
  changes: { version: string; date: string; answersHash?: string; summary: string }[];
}

/**
 * Hash over what stored answers and verdicts depend on: id, question, reference and answerable of every item, in id
 * order. Evidence, roles, facts and notes are left out, so marking spans does not invalidate a judged run, while an
 * edited question or reference does.
 */
export function answersHash(questions: Pick<GoldenQuestion, 'id' | 'question' | 'reference' | 'answerable'>[]): string {
  const rows = [...questions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((q) => [q.id, q.question, q.reference, q.answerable]);
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 16);
}

/**
 * Throws unless results made on golden `version` were judged on the same question and reference text as `current`
 * (the answersHash of the working golden). The version's hash comes from the meta change log.
 */
export function assertSameAnswers(meta: GoldenMeta, version: string, current: string, what: string): void {
  const entry = meta.changes.find((c) => c.version === version);
  if (!entry?.answersHash) throw new Error(`${what}: golden ${version} has no answersHash in golden-meta.json`);
  if (entry.answersHash !== current)
    throw new Error(`${what}: judged on golden ${version} (answers ${entry.answersHash}), the current golden text is ${current}; a question or reference changed since`);
}
