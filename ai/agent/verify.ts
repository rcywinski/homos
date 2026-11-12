/**
 * Mechanical check of the agent's final answer (step 2.2), no model involved.
 *   - citations: verifyCitation from phase 1, against the chunks search_journal returned in this run, plus the
 *     decision log as one pseudo-chunk (id docs/DECISION-LOG.md) when read_decision_log was called in this run;
 *   - dataRefs: a number from a backtest file must come from a read_backtest_results call made in this run with the
 *     same name and a path that is a prefix of the reference's path; the value at the reference's path must be in the
 *     data that call returned (an overview with markers does not count); the written value must equal the stored one
 *     rounded to the written number of decimals; and the value must appear in the answer text;
 *   - a typographic minus (U+2212) in the answer counts as a minus sign;
 *   - unbacked numbers: numbers in the answer that appear neither in a verified quote nor in a verified dataRef.
 *     Reported, not failed: a date or a count can be legitimate without a reference.
 */
import type { Chunk } from '../corpus/types';
import { verifyCitation, type VerifiedCitation } from '../answer/verify';
import { resolvePath } from './handlers';
import type { AgentAnswer, DataRef } from './model';
import { DECISION_LOG } from './tools';

/** What the verifier needs from one executed tool call. */
export interface CallForCheck {
  name: string;
  args: unknown;
  isError: boolean;
  content: string;
  chunks?: Chunk[];
}

export type DataRefStatus = 'ok' | 'no-call' | 'not-in-result' | 'mismatch' | 'bad-value' | 'not-in-answer';

export interface VerifiedDataRef extends DataRef {
  status: DataRefStatus;
  /** The stored value when it was found. */
  stored?: unknown;
  detail?: string;
}

export interface AgentVerification {
  citations: VerifiedCitation[];
  dataRefs: VerifiedDataRef[];
  unbackedNumbers: string[];
}

/** Text of a tool result without the <tool_data> wrapper. */
export const unwrap = (content: string) => content.replace(/^<tool_data tool="[^"]+">\n/, '').replace(/\n<\/tool_data>$/, '');

export function citationPool(calls: CallForCheck[]): Map<string, Chunk> {
  const pool = new Map<string, Chunk>();
  for (const c of calls) {
    if (c.isError) continue;
    if (c.name === 'search_journal') for (const ch of c.chunks ?? []) pool.set(ch.id, ch);
    if (c.name === 'read_decision_log') {
      const text = unwrap(c.content);
      pool.set(DECISION_LOG, { id: DECISION_LOG, file: DECISION_LOG, lineStart: 1, lineEnd: text.split('\n').length, kind: 'doc-section', title: 'Decision log', text });
    }
  }
  return pool;
}

const NUMBER = /^[+-]?\d+(\.\d+)?$/;

/** The JSON data of a read_backtest_results result, or null when it is an overview (markers instead of values). */
export function resultData(content: string): unknown | null {
  const parts = unwrap(content).split('\n[data]\n');
  if (parts.length < 2) return null;
  const data = parts.slice(1).join('\n[data]\n');
  if (data.startsWith('[overview:')) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** The typographic minus (U+2212) means the same as the hyphen-minus in a number. */
export const plainMinus = (t: string) => t.replace(/\u2212/g, '-');

const isPrefix = (p: string[], of: string[]) => p.length <= of.length && p.every((k, i) => k === of[i]);

function inAnswer(value: string, answer: string): boolean {
  const v = value.replace(/^\+/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.])[+]?${v}(?!\\d|\\.\\d)`).test(plainMinus(answer));
}

export function verifyDataRef(ref: DataRef, calls: CallForCheck[], answer: string): VerifiedDataRef {
  const reads = calls.filter((c) => c.name === 'read_backtest_results' && !c.isError && (c.args as { name?: string }).name === ref.name);
  const covering = reads.filter((c) => isPrefix((c.args as { path?: string[] }).path ?? [], ref.path));
  if (covering.length === 0) return { ...ref, status: 'no-call', detail: reads.length ? 'the file was read, but no call covered this path' : 'no read of this file in this run' };
  let stored: unknown;
  let found = false;
  for (const c of covering) {
    const data = resultData(c.content);
    if (data === null) continue;
    try {
      stored = resolvePath(data, ref.path.slice(((c.args as { path?: string[] }).path ?? []).length));
      found = true;
      break;
    } catch {
      // try the next covering call
    }
  }
  if (!found) return { ...ref, status: 'not-in-result', detail: 'the value is not in the data a covering call returned (overview or wrong path)' };
  if (typeof stored === 'number') {
    if (!NUMBER.test(ref.value)) return { ...ref, status: 'bad-value', stored, detail: 'value must be digits with an optional sign and decimal point' };
    const decimals = ref.value.split('.')[1]?.length ?? 0;
    if (Number(stored.toFixed(decimals)) !== Number(ref.value)) return { ...ref, status: 'mismatch', stored, detail: `stored ${stored} rounds to ${stored.toFixed(decimals)}` };
  } else if (typeof stored === 'string') {
    if (stored !== ref.value) return { ...ref, status: 'mismatch', stored };
  } else {
    return { ...ref, status: 'mismatch', stored: Array.isArray(stored) ? '<array>' : typeof stored, detail: 'the path does not end at a number or a string' };
  }
  if (!inAnswer(ref.value, answer)) return { ...ref, status: 'not-in-answer', stored };
  return { ...ref, status: 'ok', stored };
}

export function unbackedNumbers(out: AgentAnswer, citations: VerifiedCitation[], refs: VerifiedDataRef[]): string[] {
  const quotes = citations.filter((c) => c.status === 'ok').map((c) => c.quote).join('\n');
  const values = refs.filter((r) => r.status === 'ok').map((r) => Number(r.value));
  const nums = plainMinus(out.answer).match(/(?<![\w.])[+-]?\d+(?:\.\d+)?/g) ?? [];
  return nums.filter((n) => !values.includes(Number(n)) && !quotes.includes(n.replace(/^[+-]/, '')));
}

export function verifyAgentAnswer(out: AgentAnswer, calls: CallForCheck[], root = process.cwd()): AgentVerification {
  const pool = citationPool(calls);
  const citations = out.citations.map((c) => verifyCitation(c, pool, root));
  const dataRefs = out.dataRefs.map((r) => verifyDataRef(r, calls, out.answer));
  return { citations, dataRefs, unbackedNumbers: unbackedNumbers(out, citations, dataRefs) };
}
