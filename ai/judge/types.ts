/**
 * Answer-quality judging (step 1.9). Every model call goes through `Judge`, so it can be faked in tests.
 * The judge is blind to how an answer was produced: it never receives k, the run, chunk ids or the generator's own
 * coverage label, only what `JudgeInput` carries.
 */
import type { Answerable } from '../eval/golden';
import type { TokenUsage } from '../context/types';

export const CORRECTNESS = ['correct', 'partially_correct', 'incorrect'] as const;
export const FAITHFULNESS = ['supported', 'partly_supported', 'unsupported'] as const;
export const PREMISE = ['handled', 'not_handled', 'n/a'] as const;
export type Correctness = (typeof CORRECTNESS)[number];
export type Faithfulness = (typeof FAITHFULNESS)[number];
export type Premise = (typeof PREMISE)[number];

export interface JudgeQuote {
  /** `file:lines`, as shown to the reader of the answer. */
  where: string;
  quote: string;
}

/** Everything the judge sees about one answer. */
export interface JudgeInput {
  question: string;
  answerable: Answerable;
  reference: string;
  /** Golden notes, given only for partial and no questions: they describe the false premise or the absence. */
  keyNotes?: string;
  answer: string;
  quotes: JudgeQuote[];
}

export interface Verdict {
  correctness: Correctness;
  correctnessReason: string;
  faithfulness: Faithfulness;
  faithfulnessReason: string;
  premise: Premise;
  premiseReason: string;
}

export interface JudgeResult {
  verdict: Verdict | null;
  usage: TokenUsage;
  costUsd: number;
  ms: number;
  error?: string;
}

export interface Judge {
  readonly name: string;
  judge(input: JudgeInput): Promise<JudgeResult>;
}
