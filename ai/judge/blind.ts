/**
 * Control 2 of step 1.9: answers the owner grades blind, to know how far to trust the judge.
 *
 * Sample rule, fixed before the judge ran (no hand-picking):
 *   1. pool = every judged answer with a verdict, except question dated-05 (its two answers are added separately);
 *   2. order the pool by sha256("blind-v1|<run>|<id>");
 *   3. take, in that order, the first 3 judged correct, 3 partially_correct and 2 incorrect; if a category has fewer,
 *      fill the remaining places with the next unused answers in the same order, whatever their verdict;
 *   4. add the dated-05 answers of runs k5-run1 and k10 as two extra items, outside the agreement sample;
 *   5. show all items in hash order, labelled B01..Bnn, with no verdict, run or k.
 * The owner sees what the judge saw: question, answerable label, reference (and key notes for partial/no), answer,
 * quotes with file:lines.
 */
import { CORRECTNESS, FAITHFULNESS, type Correctness, type Faithfulness } from './types';
import { byHash, type JudgedItem } from './items';

export const SAMPLE_QUOTA: Record<Correctness, number> = { correct: 3, partially_correct: 3, incorrect: 2 };
export const EXTRA_QUESTION = 'dated-05';
export const EXTRA_RUNS = ['k5-run1', 'k10'];

export interface BlindKeyEntry {
  label: string;
  run: string;
  id: string;
  inAgreementSample: boolean;
}

export function blindSample(items: JudgedItem[]): BlindKeyEntry[] {
  const pool = byHash(items.filter((x) => x.id !== EXTRA_QUESTION && x.result?.verdict));
  const left = { ...SAMPLE_QUOTA };
  const picked = new Set<JudgedItem>();
  for (const x of pool) {
    const c = x.result!.verdict!.correctness;
    if (left[c] > 0) {
      left[c]--;
      picked.add(x);
    }
  }
  const total = Object.values(SAMPLE_QUOTA).reduce((s, n) => s + n, 0);
  for (const x of pool) if (picked.size < total && !picked.has(x)) picked.add(x);
  const extras = items.filter((x) => x.id === EXTRA_QUESTION && EXTRA_RUNS.includes(x.run));
  const all = byHash([...[...picked].map((x) => ({ x, s: true })), ...extras.map((x) => ({ x, s: false }))].map((e) => ({ run: e.x.run, id: e.x.id, s: e.s })));
  return all.map((e, i) => ({ label: `B${String(i + 1).padStart(2, '0')}`, run: e.run, id: e.id, inAgreementSample: e.s }));
}

export const CORRECTNESS_LINE = `Correctness (${CORRECTNESS.join(' / ')}):`;
export const FAITHFULNESS_LINE = `Faithfulness (${FAITHFULNESS.join(' / ')}):`;

export function renderBlind(key: BlindKeyEntry[], items: JudgedItem[]): string {
  const find = (k: BlindKeyEntry) => items.find((x) => x.run === k.run && x.id === k.id)!;
  const out = [
    '# Blind grading, step 1.9',
    '',
    `${key.length} answers. Grade each one the way the judge was asked to, then fill in the two lines under it.`,
    '',
    '- **Correctness**, against the reference answer: `correct` (main claims agree with the reference, key point present, nothing contradicts it), `partially_correct` (part right, a key point missing, or a contradicting claim next to a correct core), `incorrect` (main claim contradicts or misses the reference, accepts a false premise, or answers where the reference says there is no answer).',
    '- **Faithfulness**, against the cited quotes only, not the reference and not your memory: `supported` (every factual claim is in a quote; a translation counts), `partly_supported` (at least one specific number, date, identifier or cause is in no quote), `unsupported` (the main claim is not in the quotes).',
    '',
    'Some items may answer the same question. Do not look up the judge results before finishing; they are not in this file.',
    '',
  ];
  for (const k of key) {
    const x = find(k).input;
    out.push(`## ${k.label}`, '', `**Question** (answerable: ${x.answerable}): ${x.question}`, '', `**Reference answer:** ${x.reference}`, '');
    if (x.keyNotes) out.push(`**Key notes:** ${x.keyNotes}`, '');
    out.push('**Answer under review:**', '', ...x.answer.split('\n').map((l) => `> ${l}`), '', '**Cited quotes:**', '');
    if (x.quotes.length === 0) out.push('(none)');
    for (const q of x.quotes) out.push(`- \`${q.where}\` "${q.quote.replace(/\s*\n\s*/g, ' ')}"`);
    out.push('', CORRECTNESS_LINE, FAITHFULNESS_LINE, 'Note (optional):', '');
  }
  return out.join('\n') + '\n';
}

export interface OwnerGrade {
  label: string;
  correctness?: Correctness;
  faithfulness?: Faithfulness;
  note?: string;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[`*]/g, '');

/** Reads the filled-in file; an unfilled or unrecognised value stays undefined. */
export function parseGrades(md: string): OwnerGrade[] {
  const out: OwnerGrade[] = [];
  let cur: OwnerGrade | null = null;
  for (const line of md.split('\n')) {
    const h = /^## (B\d+)\s*$/.exec(line);
    if (h) {
      cur = { label: h[1] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    if (line.startsWith(CORRECTNESS_LINE)) {
      const v = norm(line.slice(CORRECTNESS_LINE.length));
      if ((CORRECTNESS as readonly string[]).includes(v)) cur.correctness = v as Correctness;
    } else if (line.startsWith(FAITHFULNESS_LINE)) {
      const v = norm(line.slice(FAITHFULNESS_LINE.length));
      if ((FAITHFULNESS as readonly string[]).includes(v)) cur.faithfulness = v as Faithfulness;
    } else if (line.startsWith('Note (optional):')) {
      const v = line.slice('Note (optional):'.length).trim();
      if (v) cur.note = v;
    }
  }
  return out;
}

/** Exact agreement and agreement within one step of the three-level scale, over the agreement sample only. */
export function agreement(key: BlindKeyEntry[], grades: OwnerGrade[], items: JudgedItem[]) {
  const rows = key.map((k) => {
    const v = items.find((x) => x.run === k.run && x.id === k.id)?.result?.verdict;
    const g = grades.find((x) => x.label === k.label);
    return { ...k, owner: { correctness: g?.correctness, faithfulness: g?.faithfulness, note: g?.note }, judge: { correctness: v?.correctness, faithfulness: v?.faithfulness, correctnessReason: v?.correctnessReason, faithfulnessReason: v?.faithfulnessReason } };
  });
  const sample = rows.filter((r) => r.inAgreementSample);
  const score = <T extends string>(scale: readonly T[], get: (r: (typeof rows)[number], who: 'owner' | 'judge') => T | undefined) => {
    const graded = sample.filter((r) => get(r, 'owner') && get(r, 'judge'));
    const d = graded.map((r) => Math.abs(scale.indexOf(get(r, 'owner')!) - scale.indexOf(get(r, 'judge')!)));
    return { n: graded.length, exact: d.filter((x) => x === 0).length, withinOne: d.filter((x) => x <= 1).length };
  };
  return {
    correctness: score(CORRECTNESS, (r, w) => r[w].correctness),
    faithfulness: score(FAITHFULNESS, (r, w) => r[w].faithfulness),
    ungraded: sample.filter((r) => !r.owner.correctness || !r.owner.faithfulness).map((r) => r.label),
    rows,
  };
}
