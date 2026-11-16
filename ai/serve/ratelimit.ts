/**
 * Visitor identity and rate limits for the public chat (phase 4, step 4.4).
 *
 * A visitor is a hash of the client IP with a salt drawn at random for each UTC day and kept only in memory. The IP is
 * never stored or logged; the hash cannot be turned back into the IP without the salt, and hashes from different days
 * cannot be linked, because yesterday's salt is gone. A restart draws a new salt, which only resets the counters.
 *
 * Limits: per visitor per rolling hour and per UTC day, and one global cap per UTC day that closes the chat until the
 * next day. Counters live in memory and are dropped with the salt at the day boundary.
 */
import { createHash, randomBytes } from 'crypto';

export interface Limits {
  perHour: number;
  perDay: number;
  globalPerDay: number;
}

export type LimitResult =
  | { ok: true; remainingToday: number }
  | { ok: false; reason: 'hour' | 'day' | 'global'; retryAfterSec: number };

const HOUR = 3_600_000;
const utcDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const msToNextUtcDay = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - t;
};

export class RateLimiter {
  private day = '';
  private salt = Buffer.alloc(0);
  /** Visitor hash -> times of accepted questions today. */
  private readonly times = new Map<string, number[]>();
  private globalCount = 0;

  constructor(
    private readonly limits: Limits,
    private readonly now: () => number = Date.now,
  ) {}

  private roll() {
    const today = utcDay(this.now());
    if (today === this.day) return;
    this.day = today;
    this.salt = randomBytes(32);
    this.times.clear();
    this.globalCount = 0;
  }

  /** Daily-salted hash of the client address; 16 hex characters are enough to tell visitors apart for one day. */
  visitor(ip: string): string {
    this.roll();
    return createHash('sha256').update(this.salt).update(ip).digest('hex').slice(0, 16);
  }

  /** Checks the limits and, when allowed, counts the question. */
  take(visitor: string): LimitResult {
    this.roll();
    const t = this.now();
    if (this.globalCount >= this.limits.globalPerDay) return { ok: false, reason: 'global', retryAfterSec: Math.ceil(msToNextUtcDay(t) / 1000) };
    const list = this.times.get(visitor) ?? [];
    if (list.length >= this.limits.perDay) return { ok: false, reason: 'day', retryAfterSec: Math.ceil(msToNextUtcDay(t) / 1000) };
    const lastHour = list.filter((x) => t - x < HOUR);
    if (lastHour.length >= this.limits.perHour) return { ok: false, reason: 'hour', retryAfterSec: Math.ceil((lastHour[0] + HOUR - t) / 1000) };
    list.push(t);
    this.times.set(visitor, list);
    this.globalCount++;
    return { ok: true, remainingToday: this.limits.perDay - list.length };
  }

  /** Gives a question back (refused by the queue before it ran), so a busy queue does not cost the visitor a turn. */
  refund(visitor: string) {
    const list = this.times.get(visitor);
    if (list && list.length > 0) {
      list.pop();
      this.globalCount = Math.max(0, this.globalCount - 1);
    }
  }
}

/**
 * Client address. Behind the tunnel (step 4.9) the real address is in `CF-Connecting-IP`; that header is trusted only
 * when the configuration says the tunnel is in front, because anyone can send it directly otherwise.
 */
export function clientIp(headers: Record<string, string | string[] | undefined>, socketAddress: string | undefined, trustProxy: 'none' | 'cloudflare'): string {
  if (trustProxy === 'cloudflare') {
    const h = headers['cf-connecting-ip'];
    const v = Array.isArray(h) ? h[0] : h;
    if (v && /^[0-9a-fA-F:.]{2,45}$/.test(v)) return v;
  }
  return socketAddress ?? 'unknown';
}
