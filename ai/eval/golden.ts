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
import { readFileSync } from 'fs';
import type { Chunk } from '../corpus/types';

export const CATEGORIES = ['why', 'dated-fact', 'identifier', 'no-answer'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Target mix agreed for draft v1 (docs/AI-PLAN.md had 10/10/5/5). Warning only. */
export const TARGET: Record<Category, number> = { why: 10, 'dated-fact': 10, identifier: 7, 'no-answer': 7 };

export const ANSWERABLE = ['yes', 'partial', 'no'] as const;
export type Answerable = (typeof ANSWERABLE)[number];

export interface Evidence {
  file: string;
  /** 1-based, inclusive [start, end]. */
  lines: [number, number];
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
