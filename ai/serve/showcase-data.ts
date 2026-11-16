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

/** Sanitized wallet and paper-trading data (step 4.1b, `ai/serve/wallet-export.ts`). Project period only. */
export interface WalletPosition {
  chain: string;
  tokenId: string;
  pair: string;
  feeTierPct: number | null;
  openedAt: string;
  closedAt: string;
  /** As recorded by the bot's ledger; null where the ledger did not price the deposit or withdrawal. */
  depositedUsd: number | null;
  withdrawnUsd: number | null;
  /** Last observed value, the value of simply holding the same deposit, and fees earned, before the close. */
  lastValueUsd: number | null;
  lastHodlUsd: number | null;
  lastFeesUsd: number | null;
  transactions: number;
  daily: { date: string; valueUsd: number; hodlUsd: number; inRange: boolean }[];
}

export interface WalletTx {
  ts: string;
  chain: string;
  tokenId: string;
  kind: string;
  amount0: number;
  amount1: number;
  sym0: string;
  sym1: string;
  usd: number | null;
  /** Public transaction hash, for the block explorer link. */
  txHash: string;
  gasEth: number | null;
}

export interface WalletPaperPool {
  poolId: string;
  capitalUsd: number;
  status: string;
  lastEquityUsd: number;
  lastHodlUsd: number;
  feesUsd: number;
  costsUsd: number;
  rebalances: number;
  lastSampleAt: string;
  events: { ts: string; kind: string }[];
  daily: { date: string; equityUsd: number; hodlUsd: number }[];
}

export interface WalletData {
  /** Present only in test fixtures: the page shows it as a banner, so made-up figures can never pass as real. */
  fixture?: string;
  period: { from: string; paperStartedAt: string };
  /** What was left out and why; the excluded positions themselves leave no trace (not even their numbers). */
  excluded: { note: string };
  tokens: { address: string; label: string }[];
  totals: { positions: number; transactions: number; gasEth: number; paperPools: number };
  positions: WalletPosition[];
  transactions: WalletTx[];
  paper: WalletPaperPool[];
}
