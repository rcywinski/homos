/**
 * Client for the chat API (ai/serve/app.ts). Same origin only. The answer arrives whole, after verification; while
 * waiting, the server streams status events (queued with position, retrieving, generating).
 */
import type { AskResponse } from '../ai/serve/ask';
import type { ModelsView } from '../ai/serve/models-state';

export type { ModelsView };

export type ChatStatus = { kind: 'queued'; position: number; waiting: number } | { kind: 'retrieving' } | { kind: 'generating' };

export interface ChatError {
  error: string;
  message: string;
  retryAfterSec?: number;
}

export type Health =
  | { status: 'up' | 'busy' | 'paused' | 'model-offline'; engine: { id: string; label: string }; models?: ModelsView; live?: boolean }
  | { status: 'unreachable' };

/** The state of the served models (step 4.10a); null when the server cannot be reached. */
export async function getModels(): Promise<ModelsView | null> {
  try {
    const r = await fetch('api/models', { cache: 'no-store' });
    return r.ok ? ((await r.json()) as ModelsView) : null;
  } catch {
    return null;
  }
}

/**
 * Starts the model load, or joins the one already running, and follows its stages over the event stream. Resolves
 * with the final view, or with the fixed error text the UI shows as it is.
 */
export async function loadModels(onView: (v: ModelsView) => void, target: 'ready' | 'search' = 'ready'): Promise<{ ok: true; models: ModelsView } | { ok: false; error: ChatError }> {
  let res: Response;
  try {
    res = await fetch('api/models/load', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'text/event-stream' }, body: JSON.stringify({ target }) });
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
  if (!(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    try {
      const body = (await res.json()) as { models: ModelsView } | ChatError;
      return 'models' in body ? { ok: true, models: body.models } : { ok: false, error: body };
    } catch {
      return { ok: false, error: UNREACHABLE };
    }
  }
  const out = await readEvents(res, (name, payload) => {
    if (name === 'models') onView(payload as unknown as ModelsView);
    else if (name === 'result') return { ok: true as const, models: (payload as unknown as { models: ModelsView }).models };
    else if (name === 'error') return { ok: false as const, error: payload as unknown as ChatError };
    return undefined;
  });
  return out ?? { ok: false, error: UNREACHABLE };
}

/** Reads a Server-Sent Events body; `onEvent` returns a value to stop with it. */
async function readEvents<T>(res: Response, onEvent: (name: string | undefined, payload: Record<string, unknown>) => T | undefined): Promise<T | undefined> {
  const reader = res.body?.getReader();
  if (!reader) return undefined;
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return undefined;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const name = block.match(/^event: (.+)$/m)?.[1];
      const data = block.match(/^data: (.*)$/m)?.[1] ?? '{}';
      const r = onEvent(name, JSON.parse(data) as Record<string, unknown>);
      if (r !== undefined) return r;
    }
  }
}

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
  const out = await readEvents<{ ok: true; answer: AskResponse } | { ok: false; error: ChatError }>(res, (name, payload) => {
    if (name === 'queued') onStatus({ kind: 'queued', position: Number(payload.position), waiting: Number(payload.waiting) });
    else if (name === 'retrieving' || name === 'generating') onStatus({ kind: name });
    else if (name === 'result') return { ok: true, answer: payload as unknown as AskResponse };
    else if (name === 'error') return { ok: false, error: payload as unknown as ChatError };
    return undefined;
  });
  return out ?? { ok: false, error: UNREACHABLE };
}
