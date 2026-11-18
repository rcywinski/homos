/**
 * Cloudflare Access JWT check for the admin page (phase 4, step 4.10c; design in ai/APP-PLAN.md section 10, review of
 * 18 Nov 2026).
 *
 * Access in front of /admin keeps unauthenticated visitors away, but the server does not trust the edge alone: every
 * admin request must carry Cf-Access-Jwt-Assertion, verified here with Node's crypto (no extra package):
 *   - header at most 8 KB, three base64url parts, RS256 only, a known kid;
 *   - the signature against the team's published keys (JWKS), fetched with a timeout and a size cap, cached, and
 *     fetched again at most every 5 minutes when a kid is unknown; no keys at all means "denied" (fail closed);
 *   - aud contains the application's audience tag, iss is the team domain, exp and nbf with 60 s leeway;
 *   - the email claim, trimmed and compared case-insensitively, equals the owner's address; no email (a service
 *     token) is denied.
 * The reason for a denial goes to the server log only; the token itself is never logged.
 */
import { createPublicKey, createVerify, type JsonWebKey, type KeyObject } from 'crypto';

export interface AccessConfig {
  /** For example "<team>.cloudflareaccess.com"; anything else is refused at start. */
  teamDomain: string;
  /** The Application Audience (AUD) tag of the Access application. */
  aud: string;
  /** The only identity allowed in. */
  adminEmail: string;
  /** Where the keys come from; the team's certs URL unless a dry-run test overrides it. */
  certsUrl?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
}

export type AccessDenial =
  | 'missing'
  | 'too-long'
  | 'malformed'
  | 'algorithm'
  | 'unknown-key'
  | 'no-keys'
  | 'signature'
  | 'expired'
  | 'not-yet-valid'
  | 'audience'
  | 'issuer'
  | 'no-email'
  | 'email';

export const MAX_JWT_BYTES = 8 * 1024;
const LEEWAY_S = 60;
const REFETCH_MS = 5 * 60_000;
const JWKS_MAX_BYTES = 64 * 1024;

export class AccessConfigError extends Error {}

/** Checks the three values at start; the server refuses to start on a bad team domain. */
export function checkAccessConfig(c: Pick<AccessConfig, 'teamDomain' | 'aud' | 'adminEmail'>): void {
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(c.teamDomain)) throw new AccessConfigError('SERVE_ACCESS_TEAM_DOMAIN must be <team>.cloudflareaccess.com');
  if (!/^[a-f0-9]{32,128}$/i.test(c.aud)) throw new AccessConfigError('SERVE_ACCESS_AUD must be the Application Audience tag (hex)');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.adminEmail.trim())) throw new AccessConfigError('SERVE_ADMIN_EMAIL must be an e-mail address');
}

const b64json = (s: string): Record<string, unknown> | null => {
  try {
    const v = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

export class AccessVerifier {
  private keys = new Map<string, KeyObject>();
  private lastFetch = 0;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly certsUrl: string;

  constructor(private readonly c: AccessConfig) {
    checkAccessConfig(c);
    this.fetchFn = c.fetchFn ?? fetch;
    this.now = c.now ?? Date.now;
    this.certsUrl = c.certsUrl ?? `https://${c.teamDomain}/cdn-cgi/access/certs`;
  }

  /** Fetches the team's keys (timeout, size cap); keeps the old ones when the fetch fails. */
  private async refresh(): Promise<void> {
    this.lastFetch = this.now();
    try {
      const res = await this.fetchFn(this.certsUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const text = await res.text();
      if (text.length > JWKS_MAX_BYTES) return;
      const body = JSON.parse(text) as { keys?: (JsonWebKey & { kid?: string; kty?: string })[] };
      const next = new Map<string, KeyObject>();
      for (const k of body.keys ?? []) {
        if (k.kty !== 'RSA' || typeof k.kid !== 'string') continue;
        try {
          next.set(k.kid, createPublicKey({ key: k, format: 'jwk' }));
        } catch {
          // a key that does not parse is skipped
        }
      }
      if (next.size) this.keys = next;
    } catch {
      // network error, timeout, invalid JSON: keep what we have; no keys at all means every request is denied
    }
  }

  private async keyFor(kid: string): Promise<KeyObject | 'no-keys' | null> {
    if (!this.keys.has(kid) && this.now() - this.lastFetch >= REFETCH_MS) await this.refresh();
    if (!this.keys.size) return 'no-keys';
    return this.keys.get(kid) ?? null;
  }

  async verify(header: string | string[] | undefined): Promise<{ ok: true } | { ok: false; reason: AccessDenial }> {
    if (typeof header !== 'string' || !header) return { ok: false, reason: 'missing' };
    if (Buffer.byteLength(header) > MAX_JWT_BYTES) return { ok: false, reason: 'too-long' };
    const parts = header.split('.');
    if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) return { ok: false, reason: 'malformed' };
    const head = b64json(parts[0]);
    const claims = b64json(parts[1]);
    if (!head || !claims) return { ok: false, reason: 'malformed' };
    if (head.alg !== 'RS256') return { ok: false, reason: 'algorithm' };
    if (typeof head.kid !== 'string') return { ok: false, reason: 'unknown-key' };
    const key = await this.keyFor(head.kid);
    if (key === 'no-keys') return { ok: false, reason: 'no-keys' };
    if (!key) return { ok: false, reason: 'unknown-key' };
    const ok = createVerify('RSA-SHA256').update(`${parts[0]}.${parts[1]}`).verify(key, Buffer.from(parts[2], 'base64url'));
    if (!ok) return { ok: false, reason: 'signature' };
    const t = this.now() / 1000;
    if (typeof claims.exp !== 'number' || claims.exp + LEEWAY_S < t) return { ok: false, reason: 'expired' };
    if (typeof claims.nbf === 'number' && claims.nbf - LEEWAY_S > t) return { ok: false, reason: 'not-yet-valid' };
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(this.c.aud)) return { ok: false, reason: 'audience' };
    if (claims.iss !== `https://${this.c.teamDomain}`) return { ok: false, reason: 'issuer' };
    if (typeof claims.email !== 'string' || !claims.email.trim()) return { ok: false, reason: 'no-email' };
    if (claims.email.trim().toLowerCase() !== this.c.adminEmail.trim().toLowerCase()) return { ok: false, reason: 'email' };
    return { ok: true };
  }
}
