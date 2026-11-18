/**
 * One-GPU job queue for the public chat (phase 4, step 4.4).
 *
 * - One job runs at a time: retrieval (embedding, rerank) and generation all use the same GPU.
 * - At most `maxWaiting` jobs wait; more are refused at once ("busy").
 * - One job per visitor at a time, running or waiting.
 * - Each job has a deadline from the moment it starts. A job past its deadline is reported to its visitor as timed
 *   out, but the slot is released only when the underlying work really settles: the next job never starts while the
 *   GPU is still busy with an abandoned one.
 * - The work gets an AbortSignal (step 4.7, L7): it fires when the job passes its deadline or when the visitor leaves
 *   (the hooks' signal), so the model call is cancelled and the GPU and the slot are freed at once.
 * - Waiting jobs are told their position whenever it changes.
 */

export type QueueRefusal = 'busy' | 'visitor-pending';

export class QueueRefused extends Error {
  constructor(readonly reason: QueueRefusal) {
    super(reason);
  }
}

export class JobCancelled extends Error {
  constructor() {
    super('cancelled');
    this.name = 'JobCancelled';
  }
}

export class JobTimeout extends Error {
  constructor() {
    super('timeout');
    this.name = 'JobTimeout';
  }
}

export interface JobHooks {
  /** 1-based position among waiting jobs; called when the job is queued and whenever it moves up. */
  onPosition?: (position: number, waiting: number) => void;
  onStart?: () => void;
  /** The visitor left: a waiting job is removed from the queue, a running one is aborted through its work's signal. */
  signal?: AbortSignal;
}

interface Waiting {
  visitor: string;
  run: () => void;
  hooks: JobHooks;
}

export class GpuQueue {
  private running: string | null = null;
  private readonly waiting: Waiting[] = [];
  /** Visitors with a running or waiting job. */
  private readonly pending = new Set<string>();

  constructor(
    readonly maxWaiting: number,
    readonly deadlineMs: number,
  ) {}

  state() {
    return { running: this.running !== null, waiting: this.waiting.length, maxWaiting: this.maxWaiting };
  }

  /**
   * Runs `work` when the GPU is free. Rejects with QueueRefused at once when the queue is full or the visitor already
   * has a job, and with JobTimeout when the job runs past its deadline.
   */
  run<T>(visitor: string, work: (signal: AbortSignal) => Promise<T>, hooks: JobHooks = {}): Promise<T> {
    if (this.pending.has(visitor)) return Promise.reject(new QueueRefused('visitor-pending'));
    if (this.running !== null && this.waiting.length >= this.maxWaiting) return Promise.reject(new QueueRefused('busy'));
    this.pending.add(visitor);
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        this.running = visitor;
        hooks.onStart?.();
        let settled = false;
        const stop = new AbortController();
        const left = () => stop.abort(new JobCancelled());
        hooks.signal?.addEventListener('abort', left, { once: true });
        const timer = setTimeout(() => {
          stop.abort(new JobTimeout());
          if (settled) return;
          settled = true;
          reject(new JobTimeout());
        }, this.deadlineMs);
        if (hooks.signal?.aborted) left();
        work(stop.signal).then(
          (v) => {
            if (!settled) {
              settled = true;
              resolve(v);
            }
          },
          (e: unknown) => {
            if (!settled) {
              settled = true;
              reject(e);
            }
          },
        ).finally(() => {
          clearTimeout(timer);
          hooks.signal?.removeEventListener('abort', left);
          this.pending.delete(visitor);
          this.running = null;
          this.next();
        });
      };
      if (this.running === null) start();
      else {
        const entry: Waiting = { visitor, run: start, hooks };
        this.waiting.push(entry);
        hooks.onPosition?.(this.waiting.length, this.waiting.length);
        hooks.signal?.addEventListener(
          'abort',
          () => {
            const i = this.waiting.indexOf(entry);
            if (i < 0) return;
            this.waiting.splice(i, 1);
            this.pending.delete(visitor);
            this.waiting.forEach((w, j) => w.hooks.onPosition?.(j + 1, this.waiting.length));
            reject(new JobCancelled());
          },
          { once: true },
        );
      }
    });
  }

  private next() {
    const job = this.waiting.shift();
    this.waiting.forEach((w, i) => w.hooks.onPosition?.(i + 1, this.waiting.length));
    job?.run();
  }
}
