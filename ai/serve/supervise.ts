/**
 * Supervisor for the public chat server on the box (phase 4, owner's request of 18 Nov 2026).
 *
 * Task Scheduler's "restart on failure" fires only when a task fails to launch, not when node exits later, so a crashed
 * server would stay down until the next boot. The "HOMOS showcase server" task runs this script instead; it starts the
 * server as a child process and starts it again when it exits:
 *   - waits 5 s, 15 s, 60 s, then 300 s before each further restart; the wait starts over once the child has run
 *     for 10 minutes;
 *   - at most 10 restarts in any rolling hour: after that it waits until the oldest of them is an hour old, so a crash
 *     loop (for example a config error that makes the server refuse to start) costs one start every few minutes at
 *     most, never a tight loop;
 *   - every exit and every restart is one line on its own output, which the task appends to server.log.
 * Stopping the task stops both: Task Scheduler runs the task in a job object and ends every process in it.
 *
 *   node --import tsx ai/serve/supervise-cli.ts -- <command> [args...]
 */
export interface SuperviseOptions {
  backoffMs: number[];
  /** A child that ran at least this long resets the backoff. */
  healthyMs: number;
  maxPerWindow: number;
  windowMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
}

export const DEFAULTS: SuperviseOptions = { backoffMs: [5_000, 15_000, 60_000, 300_000], healthyMs: 10 * 60_000, maxPerWindow: 10, windowMs: 60 * 60_000 };

/** The wait before the next start, given the restarts so far and the recent restart times. */
export function nextWait(o: SuperviseOptions, consecutive: number, recent: number[], now: number): number {
  const backoff = o.backoffMs[Math.min(consecutive, o.backoffMs.length - 1)];
  const inWindow = recent.filter((t) => now - t < o.windowMs);
  if (inWindow.length < o.maxPerWindow) return backoff;
  return Math.max(backoff, inWindow[0] + o.windowMs - now);
}

/** Runs `start` again and again; resolves only if `stopAfter` says so (tests). */
export async function supervise(start: () => Promise<number | null>, o: SuperviseOptions, stopAfter?: (starts: number) => boolean): Promise<number> {
  const now = o.now ?? Date.now;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = o.log ?? ((l: string) => console.log(l));
  const recent: number[] = [];
  let consecutive = 0;
  let starts = 0;
  for (;;) {
    const t0 = now();
    starts++;
    recent.push(t0);
    const code = await start();
    const ran = now() - t0;
    if (ran >= o.healthyMs) consecutive = 0;
    if (stopAfter?.(starts)) return starts;
    const wait = nextWait(o, consecutive, recent, now());
    log(`[supervise] ${new Date(now()).toISOString()} server exited with code ${code} after ${Math.round(ran / 1000)} s; starting again in ${Math.round(wait / 1000)} s`);
    consecutive++;
    await sleep(wait);
    while (recent.length && now() - recent[0] >= o.windowMs) recent.shift();
  }
}
