/**
 * The four step 1.8 measures, as pure functions over per-question records (tested in answer.test.ts):
 *   (a) citation check: ok, not found, unknown chunk, and over-long quotes counted separately;
 *   (b) answerable questions whose answer cites at least one golden evidence chunk (verified citations only),
 *       split by whether evidence was among the k chunks given to the model;
 *   (c) coverage (full, partial, none) against the golden `answerable`, split the same way: "partial" on an
 *       answerable question is correct behaviour when retrieval missed the evidence;
 *   (d) tokens, cost, latency.
 */
import type { Answerable } from '../eval/golden';
import type { TokenUsage } from '../context/types';
import type { Coverage, LocalCallStats } from './types';
import type { VerifiedCitation } from './verify';

export interface AnswerRecord {
  id: string;
  category: string;
  answerable: Answerable;
  /** Golden evidence overlaps at least one of the k chunks given to the model; "no-evidence" when the key has none. */
  evidenceGiven: 'yes' | 'no' | 'no-evidence';
  coverage: Coverage | 'error';
  citations: VerifiedCitation[];
  /** At least one verified citation points at a chunk that overlaps golden evidence. */
  citesEvidence: boolean;
  usage: TokenUsage;
  costUsd: number;
  ms: number;
  answer: string;
  error?: string;
  /** The k chunk ids given to the generator, in rank order (stored from step 1.11 on). */
  chunkIds?: string[];
  /** Local generator details (step 1.11). */
  local?: LocalCallStats;
}

export function citationCounts(rs: AnswerRecord[]) {
  const all = rs.flatMap((r) => r.citations);
  return {
    total: all.length,
    ok: all.filter((c) => c.status === 'ok').length,
    notFound: all.filter((c) => c.status === 'not-found').length,
    unknownChunk: all.filter((c) => c.status === 'unknown-chunk').length,
    tooLong: all.filter((c) => c.tooLong).length,
    answersWithoutCitation: rs.filter((r) => r.coverage !== 'none' && r.coverage !== 'error' && r.citations.length === 0).length,
  };
}

export function citesEvidence(rs: AnswerRecord[]) {
  const yes = rs.filter((r) => r.answerable === 'yes');
  const part = (given: 'yes' | 'no') => {
    const g = yes.filter((r) => r.evidenceGiven === given);
    return { hits: g.filter((r) => r.citesEvidence).length, n: g.length };
  };
  return { all: { hits: yes.filter((r) => r.citesEvidence).length, n: yes.length }, evidenceGiven: part('yes'), evidenceNotGiven: part('no') };
}

export type Confusion = Record<string, Record<Coverage | 'error', number>>;

/** Rows: "<answerable> / evidence <given|not given|none in key>"; columns: the model's coverage. */
export function confusion(rs: AnswerRecord[]): Confusion {
  const out: Confusion = {};
  const label = (r: AnswerRecord) =>
    `${r.answerable} / ${r.evidenceGiven === 'yes' ? 'evidence given' : r.evidenceGiven === 'no' ? 'evidence not given' : 'no evidence in key'}`;
  for (const r of rs) {
    const row = (out[label(r)] ??= { full: 0, partial: 0, none: 0, error: 0 });
    row[r.coverage]++;
  }
  return out;
}

export function costAndLatency(rs: AnswerRecord[]) {
  const ms = rs.map((r) => r.ms).sort((a, b) => a - b);
  const sum = (k: keyof TokenUsage) => rs.reduce((s, r) => s + r.usage[k], 0);
  return {
    costUsd: Number(rs.reduce((s, r) => s + r.costUsd, 0).toFixed(4)),
    tokens: { input: sum('input'), cacheWrite: sum('cacheWrite'), cacheRead: sum('cacheRead'), output: sum('output') },
    msMedian: ms[Math.floor(ms.length / 2)] ?? null,
    msP95: ms[Math.min(ms.length - 1, Math.floor(0.95 * ms.length))] ?? null,
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

/** Local generator measures (step 1.11): structured-output validity, retries, decode speed, thinking tokens. */
export function localStats(rs: AnswerRecord[]) {
  const l = rs.map((r) => r.local).filter((x): x is LocalCallStats => !!x);
  if (!l.length) return null;
  return {
    validOutputs: rs.filter((r) => r.coverage !== 'error').length,
    answers: rs.length,
    invalidOutputs: l.reduce((s, x) => s + x.invalidOutputs, 0),
    answersRetried: l.filter((x) => x.retried).length,
    networkRetries: l.reduce((sum, x) => sum + (x.networkRetries ?? 0), 0),
    tokensPerSecondMedian: median(l.map((x) => x.tokensPerSecond)),
    evalTokensMedian: median(l.map((x) => x.evalTokens)),
    thinkingTokensMedian: median(l.map((x) => x.thinkingTokens)),
    thinkingTokensMax: Math.max(...l.map((x) => x.thinkingTokens)),
    promptTokensMax: Math.max(...l.map((x) => x.promptTokensServer)),
  };
}
