/**
 * Turns a step 1.8 answer record into what the judge sees. Only the question, the golden reference (plus the key
 * notes for partial and no questions), the answer text and its quotes as `file:lines` go in: no k, no run, no chunk
 * id, no generator coverage label. Tested in judge.test.ts.
 */
import { createHash } from 'crypto';
import type { AnswerRecord } from '../answer/measures';
import type { GoldenQuestion } from '../eval/golden';
import type { JudgeInput, JudgeResult } from './types';

export interface JudgedItem {
  /** Which generation run the answer came from, e.g. "k5-run1". Never sent to the judge. */
  run: string;
  id: string;
  answerable: GoldenQuestion['answerable'];
  input: JudgeInput;
  result?: JudgeResult;
}

export function judgeInput(rec: AnswerRecord, q: GoldenQuestion): JudgeInput {
  return {
    question: q.question,
    answerable: q.answerable,
    reference: q.reference,
    ...(q.answerable !== 'yes' && q.notes ? { keyNotes: q.notes } : {}),
    answer: rec.answer,
    quotes: rec.citations.map((c) => ({
      where: c.lines ? `${c.file}:${c.lines[0]}${c.lines[1] !== c.lines[0] ? `-${c.lines[1]}` : ''}` : (c.file ?? 'unknown source'),
      quote: c.quote,
    })),
  };
}

/** Deterministic order used for judging and for the blind sample; the salt is fixed so the order cannot be tuned. */
export function itemHash(run: string, id: string, salt = 'blind-v1'): string {
  return createHash('sha256').update(`${salt}|${run}|${id}`).digest('hex');
}

export const byHash = <T extends { run: string; id: string }>(xs: T[]): T[] =>
  [...xs].sort((a, b) => (itemHash(a.run, a.id) < itemHash(b.run, b.id) ? -1 : 1));
