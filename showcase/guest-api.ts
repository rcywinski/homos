/**
 * Guest-key mode: the two calls to this site's server (phase 4, step 4.6b). This module has no access to the
 * visitor's key (showcase/guest-key.ts exports no getter, and this module does not import it): what goes to our
 * server is the question, the ticket and the model's answer JSON, never the key.
 */
import type { AskResponse } from '../ai/serve/ask';
import type { ChatError } from './api';

export interface GuestRequest {
  request: unknown;
  sources: AskResponse['sources'];
  ticket: string;
  engine: { id: string; label: string };
}

const UNREACHABLE: ChatError = { error: 'unreachable', message: 'The chat server cannot be reached right now. The saved answers and the reports still work.' };

async function postJson(path: string, body: unknown): Promise<{ status: number; data: unknown } | null> {
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  } catch {
    return null;
  }
}

/**
 * Retrieval on our server. Two answers are possible: the request to send to Anthropic, or, for a question refused
 * before any work (advice), the final answer itself, in which case nothing is sent to Anthropic.
 */
export async function guestRetrieve(question: string): Promise<{ kind: 'request'; value: GuestRequest } | { kind: 'answer'; value: AskResponse } | { kind: 'error'; value: ChatError }> {
  const r = await postJson('api/guest/retrieve', { question });
  if (!r || !r.data || typeof r.data !== 'object') return { kind: 'error', value: UNREACHABLE };
  const d = r.data as Record<string, unknown>;
  if ('outcome' in d) return { kind: 'answer', value: d as unknown as AskResponse };
  if ('ticket' in d && 'request' in d) return { kind: 'request', value: d as unknown as GuestRequest };
  return { kind: 'error', value: 'message' in d ? (d as unknown as ChatError) : UNREACHABLE };
}

/** Verification on our server: the same checks as a local answer, the same response shape. Called once per answer. */
export async function guestVerify(question: string, ticket: string, answer: unknown): Promise<{ ok: true; value: AskResponse } | { ok: false; value: ChatError }> {
  const r = await postJson('api/guest/verify', { question, ticket, answer });
  if (!r || !r.data || typeof r.data !== 'object') return { ok: false, value: UNREACHABLE };
  const d = r.data as Record<string, unknown>;
  return 'outcome' in d ? { ok: true, value: d as unknown as AskResponse } : { ok: false, value: 'message' in d ? (d as unknown as ChatError) : UNREACHABLE };
}
