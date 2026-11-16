/**
 * Client for the chat API (ai/serve/app.ts). Same origin only. The answer arrives whole, after verification; while
 * waiting, the server streams status events (queued with position, retrieving, generating).
 */
import type { AskResponse } from '../ai/serve/ask';

export type ChatStatus = { kind: 'queued'; position: number; waiting: number } | { kind: 'retrieving' } | { kind: 'generating' };

export interface ChatError {
  error: string;
  message: string;
  retryAfterSec?: number;
}

export type Health = { status: 'up' | 'busy' | 'paused' | 'model-offline'; engine: { id: string; label: string } } | { status: 'unreachable' };

export async function health(): Promise<Health> {
  try {
    const r = await fetch('api/health', { cache: 'no-store' });
    if (!r.ok) return { status: 'unreachable' };
    return (await r.json()) as Health;
  } catch {
    return { status: 'unreachable' };
  }
}

const UNREACHABLE: ChatError = { error: 'unreachable', message: 'The chat server cannot be reached right now. The saved answers and the reports still work.' };

/** Posts a question and reads the event stream; resolves with the answer or an error the UI shows as it is. */
export async function askQuestion(question: string, onStatus: (s: ChatStatus) => void, signal?: AbortSignal): Promise<{ ok: true; answer: AskResponse } | { ok: false; error: ChatError }> {
  let res: Response;
  try {
    res = await fetch('api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('text/event-stream')) {
    try {
      const body = (await res.json()) as AskResponse | ChatError;
      return 'outcome' in body ? { ok: true, answer: body } : { ok: false, error: body };
    } catch {
      return { ok: false, error: UNREACHABLE };
    }
  }
  const reader = res.body?.getReader();
  if (!reader) return { ok: false, error: UNREACHABLE };
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const name = block.match(/^event: (.+)$/m)?.[1];
      const data = block.match(/^data: (.*)$/m)?.[1] ?? '{}';
      const payload = JSON.parse(data) as Record<string, unknown>;
      if (name === 'queued') onStatus({ kind: 'queued', position: Number(payload.position), waiting: Number(payload.waiting) });
      else if (name === 'retrieving' || name === 'generating') onStatus({ kind: name });
      else if (name === 'result') return { ok: true, answer: payload as unknown as AskResponse };
      else if (name === 'error') return { ok: false, error: payload as unknown as ChatError };
    }
  }
  return { ok: false, error: UNREACHABLE };
}
