/**
 * Guest-key mode, server side (phase 4, step 4.6a; plan in ai/APP-PLAN.md section 9).
 *
 * A visitor with an Anthropic API key gets the answer from the cloud model, called from their own browser with their
 * own key. Our server never sees the key. It does the two halves it already does for the local chat:
 *   - retrieve: the same local retrieval, then the ready Messages API request body (the measured Sonnet prompt and
 *     answer schema, the 10 chunks with private addresses masked) and a signed ticket;
 *   - verify: the model's answer JSON is checked against the chunks named in the ticket, with the same quote check,
 *     number marks and fixed texts as the local chat, and returned in the same shape as /api/ask.
 * This module imports no Anthropic SDK: the request is built as plain JSON, and a unit test checks that its answer
 * schema equals what the SDK sent in the measured step 1.8 runs.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { CheckedAnswer } from '../answer/answer';
import { ANSWER_SYSTEM, answerUserPrompt } from '../answer/prompt';
import type { Coverage, GeneratedAnswer } from '../answer/types';
import { verifyCitation } from '../answer/verify';
import type { Chunk } from '../corpus/types';
import { maskNetwork } from './mask';

/** The cloud model and effort measured in step 1.8 (ai/answer/claude.ts). */
export const GUEST_MODEL = 'claude-sonnet-5-5';
export const GUEST_EFFORT = 'medium';
/**
 * Output cap on the visitor's account. The largest measured Sonnet answer is 629 output tokens (dated-06 in the
 * 2026-11-10 k=10 golden run; mean 396 over 102 answers), so 2,048 leaves more than three times that.
 */
export const GUEST_MAX_TOKENS = 2048;

/**
 * The answer schema exactly as the SDK sent it in the measured runs: `jsonSchemaOutputFormat(ANSWER_SCHEMA)` moves
 * the coverage enum into a description. Kept as data here so the server does not import the SDK; guest.test.ts
 * checks it against the SDK's transform.
 */
export const MEASURED_ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    coverage: { type: 'string', description: '{enum: ["full","partial","none"]}' },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { chunkId: { type: 'string' }, quote: { type: 'string' } },
        additionalProperties: false,
        required: ['chunkId', 'quote'],
      },
    },
  },
  additionalProperties: false,
  required: ['answer', 'coverage', 'citations'],
} as const;

export const GUEST_ENGINE = { id: 'guest-key', label: 'Claude Sonnet 5.5 with your own key' };

/** Chunks as the guest's model sees them: private network addresses masked, also in titles. */
export function maskChunk(c: Chunk): Chunk {
  return { ...c, text: maskNetwork(c.text), title: maskNetwork(c.title) };
}

/** The Messages API request body the browser sends with the visitor's key, built here so it cannot drift. */
export function guestRequestBody(question: string, chunks: Chunk[]) {
  return {
    model: GUEST_MODEL,
    max_tokens: GUEST_MAX_TOKENS,
    output_config: { effort: GUEST_EFFORT, format: { type: 'json_schema', schema: MEASURED_ANSWER_SCHEMA } },
    system: ANSWER_SYSTEM,
    messages: [{ role: 'user', content: answerUserPrompt(question, chunks) }],
  };
}

// --- Tickets ---

export interface TicketPayload {
  /** SHA-256 of the cleaned question. */
  q: string;
  /** The chunk ids handed out, in order. */
  ids: string[];
  /** Corpus hash of the served index: a ticket from before a rebuild is refused. */
  corpus: string;
  /** Expiry, ms since epoch. */
  exp: number;
}

export type TicketProblem = 'malformed' | 'signature' | 'expired' | 'corpus' | 'question';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');
export const questionHash = (q: string) => createHash('sha256').update(q, 'utf8').digest('hex');

/**
 * Signs and checks tickets with a secret drawn at start and kept in memory only: a restart makes every older ticket
 * invalid, which the visitor sees as "please ask again".
 */
export class Tickets {
  private readonly secret: Buffer;
  constructor(
    private readonly corpusHash: string,
    private readonly ttlMs = 10 * 60_000,
    private readonly now: () => number = Date.now,
    secret?: Buffer,
  ) {
    this.secret = secret ?? randomBytes(32);
  }

  private sign(body: string): Buffer {
    return createHmac('sha256', this.secret).update(body, 'utf8').digest();
  }

  issue(question: string, ids: string[]): string {
    const payload: TicketPayload = { q: questionHash(question), ids, corpus: this.corpusHash, exp: this.now() + this.ttlMs };
    const body = b64(JSON.stringify(payload));
    return `${body}.${this.sign(body).toString('base64url')}`;
  }

  /** The chunk ids of a valid ticket for this question, or why it is refused. */
  check(ticket: unknown, question: string): { ok: true; ids: string[] } | { ok: false; problem: TicketProblem } {
    if (typeof ticket !== 'string' || ticket.length > 4096) return { ok: false, problem: 'malformed' };
    const [body, sig, extra] = ticket.split('.');
    if (!body || !sig || extra !== undefined) return { ok: false, problem: 'malformed' };
    const given = Buffer.from(sig, 'base64url');
    // One spelling per signature: base64url decoding ignores unused trailing bits, so require the canonical form.
    if (given.toString('base64url') !== sig) return { ok: false, problem: 'malformed' };
    const expected = this.sign(body);
    // Constant-time compare; lengths differ only for a malformed signature, which reveals nothing about the secret.
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, problem: 'signature' };
    let p: TicketPayload;
    try {
      p = JSON.parse(unb64(body)) as TicketPayload;
    } catch {
      return { ok: false, problem: 'malformed' };
    }
    if (!Array.isArray(p.ids) || p.ids.some((x) => typeof x !== 'string') || typeof p.exp !== 'number') return { ok: false, problem: 'malformed' };
    if (this.now() > p.exp) return { ok: false, problem: 'expired' };
    if (p.corpus !== this.corpusHash) return { ok: false, problem: 'corpus' };
    const qh = Buffer.from(questionHash(question), 'hex');
    const ph = Buffer.from(typeof p.q === 'string' ? p.q : '', 'hex');
    if (qh.length !== ph.length || !timingSafeEqual(qh, ph)) return { ok: false, problem: 'question' };
    return { ok: true, ids: p.ids };
  }
}

// --- The posted answer ---

const COVERAGES: Coverage[] = ['full', 'partial', 'none'];

/**
 * The model's answer as the browser posts it: the parsed JSON object of the Messages API text block. Anything else
 * (extra keys, wrong types, more than 20 citations) is treated as invalid output, as for the local model.
 */
export function parseGuestAnswer(x: unknown): GeneratedAnswer | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const a = x as Record<string, unknown>;
  if (Object.keys(a).some((k) => !['answer', 'coverage', 'citations'].includes(k))) return null;
  if (typeof a.answer !== 'string' || !COVERAGES.includes(a.coverage as Coverage) || !Array.isArray(a.citations)) return null;
  if (a.citations.length > 20) return null;
  const citations = [];
  for (const c of a.citations as unknown[]) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
    const r = c as Record<string, unknown>;
    if (Object.keys(r).some((k) => !['chunkId', 'quote'].includes(k)) || typeof r.chunkId !== 'string' || typeof r.quote !== 'string') return null;
    citations.push({ chunkId: r.chunkId, quote: r.quote });
  }
  return { answer: a.answer, coverage: a.coverage as Coverage, citations };
}

/**
 * Verifies a guest answer against the masked chunks the model was given, in the shape the local chat produces
 * (CheckedAnswer), so ask.ts's present() renders both the same way. `output: null` means invalid output.
 */
export function checkGuestAnswer(answer: unknown, chunks: Chunk[], root = process.cwd()): CheckedAnswer {
  const out = parseGuestAnswer(answer);
  const given = new Map(chunks.map((c) => [c.id, c]));
  const base = { usage: { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }, costUsd: 0, ms: 0 };
  if (!out) return { ...base, output: null, error: 'invalid guest answer', citations: [] };
  return { ...base, output: out, citations: out.citations.map((c) => verifyCitation(c, given, root)) };
}

/** True when the text holds something that looks like an Anthropic API key. */
export const looksLikeKey = (s: string) => /sk-ant-/i.test(s);
