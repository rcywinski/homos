/**
 * The visitor's Anthropic key, guest-key mode (phase 4, step 4.6b; plan in ai/APP-PLAN.md section 9).
 *
 * The key lives in one module-level variable of this module and nowhere else: not in React state, not in any browser
 * storage, cookie, URL or history entry. It is used in one place, the request to api.anthropic.com, in the x-api-key
 * header. Requests to this site's server are built in showcase/guest-api.ts, which cannot reach the variable (this
 * module exports no getter). A reload forgets the key; forgetKey() forgets it at once.
 */

let key: string | null = null;

/** Stores the key for this page view. Returns false (and stores nothing) for an empty value or one with spaces. */
export function setKey(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  key = v;
  return true;
}

export function hasKey(): boolean {
  return key !== null;
}

export function forgetKey(): void {
  key = null;
}

/** The result of one call to the Messages API, already sorted into what the page can show. */
export type ModelCall =
  | { ok: true; answer: unknown }
  /** The API answered with an error the page can read (for example 401 invalid key, 429, 529). */
  | { ok: false; kind: 'api-error'; status: number; message: string }
  /** The call failed without a readable response (network, CORS, an extension blocking it). */
  | { ok: false; kind: 'unreadable' }
  /** The answer cannot be checked: cut at the length limit, declined, or not the expected JSON. */
  | { ok: false; kind: 'max_tokens' | 'refusal' | 'invalid' };

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * One call, no retry: a second call would spend the visitor's money again. The body is the one /api/guest/retrieve
 * built; this function adds only the headers.
 */
export async function callModel(body: unknown, fetchFn: typeof fetch = fetch): Promise<ModelCall> {
  if (key === null) return { ok: false, kind: 'api-error', status: 0, message: 'No key is set.' };
  let res: Response;
  try {
    res = await fetchFn(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      // No credentials, no referrer: the request carries the key and the body, nothing about this site's visitor.
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    return { ok: false, kind: 'unreadable' };
  }
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return res.ok ? { ok: false, kind: 'invalid' } : { ok: false, kind: 'unreadable' };
  }
  if (!res.ok) {
    const err = data.error as { message?: unknown } | undefined;
    return { ok: false, kind: 'api-error', status: res.status, message: typeof err?.message === 'string' ? err.message.slice(0, 300) : `HTTP ${res.status}` };
  }
  if (data.stop_reason === 'max_tokens') return { ok: false, kind: 'max_tokens' };
  if (data.stop_reason === 'refusal') return { ok: false, kind: 'refusal' };
  const blocks = Array.isArray(data.content) ? (data.content as { type?: unknown; text?: unknown }[]) : [];
  const text = blocks.find((b) => b.type === 'text' && typeof b.text === 'string')?.text as string | undefined;
  if (text === undefined) return { ok: false, kind: 'invalid' };
  try {
    return { ok: true, answer: JSON.parse(text) };
  } catch {
    return { ok: false, kind: 'invalid' };
  }
}
