/**
 * Shape of the static showcase data (phase 4, step 4.1). Written by `ai/serve/export.ts`, read by the front end in
 * `showcase/` (type-only import). Every field a visitor sees is already masked (`ai/serve/mask.ts`).
 */

export type QuoteStatus = 'verified' | 'not-verified';
export type Correctness = 'correct' | 'partially_correct' | 'incorrect';
export type Faithfulness = 'supported' | 'partly_supported' | 'unsupported';
export type Premise = 'handled' | 'not_handled' | 'n/a';

export interface ShowcaseQuestion {
  id: string;
  category: string;
  question: string;
  /** Golden key: does the corpus answer it (yes, partial, no). */
  answerable: 'yes' | 'partial' | 'no';
  /** The human-written reference answer from the golden set. */
  reference: string;
}

export interface ShowcaseCitation {
  chunkId: string;
  file: string;
  lines: [number, number] | null;
  quote: string;
  /** Checked mechanically against the chunk text when the answer was generated (step 1.8 verifier). */
  status: QuoteStatus;
  /** Why it is not verified: the quote is not in the chunk, or the chunk id is not one the model was given. */
  reason?: 'not-in-chunk' | 'unknown-chunk';
  /** Over the 40-word quoting rule; shown as a note, does not change the status. */
  tooLong: boolean;
}

export interface ShowcaseVerdict {
  correctness: Correctness;
  correctnessReason: string;
  faithfulness: Faithfulness;
  faithfulnessReason: string;
  premise: Premise;
  premiseReason: string;
}

export interface ShowcaseNumber {
  text: string;
  start: number;
  end: number;
  status: 'verified' | 'in-source' | 'not-verified';
  transformation?: 'date-written-out' | 'year-added' | 'rounded';
  from?: string;
}

export interface ShowcaseAnswer {
  /** `failed` when the generator gave no valid structured output; the UI shows a plain failure message. */
  outcome: 'answered' | 'failed';
  coverage: 'full' | 'partial' | 'none' | null;
  answer: string;
  citations: ShowcaseCitation[];
  /** Every number in `answer`, with its state (ai/serve/numbers.ts), offsets into the masked answer. */
  numbers: ShowcaseNumber[];
  /** Blind judge verdict (Opus 5.5); null when this run was not judged for this question. */
  verdict: ShowcaseVerdict | null;
  ms: number;
  costUsd: number;
}

export interface ShowcaseRun {
  run: string;
  date: string;
  /** Generator and retrieval descriptions exactly as recorded in the result file. */
  generator: string;
  retrieval: string;
  judge: string;
  sourceFile: string;
  summary: { correct: number; partiallyCorrect: number; incorrect: number; quotes: number; quotesNotVerified: number; failed: number };
  answers: Record<string, ShowcaseAnswer>;
}

export interface ShowcaseConfig {
  id: string;
  label: string;
  description: string;
  /** `main` configurations are the two default columns; `more` go into the collapsed section. */
  group: 'main' | 'more';
  /** The configuration the live chat serves. */
  served: boolean;
  engine: 'cloud' | 'local';
  /** True when the configuration has one measured run: labelled "single run" in the UI. */
  single: boolean;
  runs: ShowcaseRun[];
}

export interface ComparisonData {
  goldenVersion: string;
  questions: ShowcaseQuestion[];
  configs: ShowcaseConfig[];
  sources: { file: string; sha256: string }[];
}

export interface ShowcaseReport {
  date: string;
  file: string;
  title: string;
  /** Full report text, masked. Polish, as written by the report generator. */
  text: string;
}

export interface ReportsData {
  reports: ShowcaseReport[];
  sources: { file: string; sha256: string }[];
}
