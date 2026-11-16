/**
 * Request log of the public chat (phase 4, step 4.4). One JSONL file per UTC day, kept 30 days, never committed
 * (`ai/serve/logs/` is gitignored). A line holds the daily visitor hash, never the IP address. Questions are logged
 * masked, so the owner can see what visitors ask; the page says so.
 */
import { appendFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import path from 'path';
import { maskNetwork } from './mask';

export interface LogEntry {
  visitor: string;
  outcome: string;
  ms: number;
  question?: string;
  detail?: string;
}

export interface RequestLog {
  write(e: LogEntry): void;
}

export const RETENTION_DAYS = 30;

export class FileLog implements RequestLog {
  constructor(
    private readonly dir: string,
    private readonly now: () => number = Date.now,
  ) {
    mkdirSync(dir, { recursive: true });
    this.prune();
  }

  private prunedDay = '';

  write(e: LogEntry) {
    const t = new Date(this.now());
    // L2 (step 4.7): old files go on the first write of every UTC day, not only at start; the service may run for weeks.
    const today = t.toISOString().slice(0, 10);
    if (today !== this.prunedDay) {
      this.prunedDay = today;
      this.prune();
    }
    const line = { t: t.toISOString(), ...e, ...(e.question !== undefined ? { question: maskNetwork(e.question) } : {}) };
    appendFileSync(path.join(this.dir, `${t.toISOString().slice(0, 10)}.jsonl`), JSON.stringify(line) + '\n');
  }

  /** Deletes day files older than the retention period. Called at start and on the first write of every UTC day. */
  prune() {
    const cutoff = new Date(this.now() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
    for (const f of readdirSync(this.dir)) {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
      if (m && m[1] < cutoff) rmSync(path.join(this.dir, f));
    }
  }
}

export class MemoryLog implements RequestLog {
  readonly entries: LogEntry[] = [];
  write(e: LogEntry) {
    this.entries.push(e);
  }
}
