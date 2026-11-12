/**
 * Job execution for run_backtest (step 2.3). The runner gets a plan built from validated arguments (jobs.ts) and:
 *   - spawns node with the tsx CLI and the script, as an argument array, never through a shell;
 *   - gives the child a minimal environment: PATH, HOME, HOMOS_RESULTS_DIR (the job's own output directory) and the
 *     plan's variables; no API keys;
 *   - runs one job at a time: an in-process flag plus a lock file with the owner's PID (stale locks are removed);
 *   - kills the job at its timeout (SIGTERM, then SIGKILL after 5 s);
 *   - keeps the last 4 000 characters of stdout and stderr for the tool result and writes the full output to job.log
 *     in the job's directory, cut at 5 MB;
 *   - checks that the saved results in backtest/results/ are byte-identical before and after the job.
 */
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from 'fs';
import path from 'path';
import type { JobPlan } from './jobs';

export const RUNS_DIR = 'ai/agent/runs';
export const TAIL_CHARS = 4000;
export const LOG_CAP_BYTES = 5 * 1024 * 1024;

export interface JobOutcome {
  jobId: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  ms: number;
  stdoutTail: string;
  stderrTail: string;
  /** Path of the result file when the script wrote it. */
  outputFile: string | null;
  /** The saved results changed during the job (must never happen). */
  canonicalChanged: boolean;
}

export interface JobRunner {
  run(jobId: string, plan: JobPlan): Promise<JobOutcome>;
}

/** Hash of every file in a directory (names and contents); empty string when the directory is missing. */
export function dirHash(dir: string): string {
  if (!existsSync(dir)) return '';
  const h = createHash('sha256');
  for (const f of readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    h.update(f);
    try {
      h.update(readFileSync(p));
    } catch {
      h.update('<unreadable>');
    }
  }
  return h.digest('hex');
}

const pidAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export class SpawnRunner implements JobRunner {
  private busy = false;

  constructor(
    readonly root = process.cwd(),
    readonly runsDir = path.join(root, RUNS_DIR),
    readonly canonicalDir = path.join(root, 'backtest/results'),
    /** Command prefix: node and the tsx CLI. Tests pass node alone to run a plain .js fixture. */
    readonly command: { bin: string; pre: string[] } = { bin: process.execPath, pre: [path.join(root, 'node_modules/tsx/dist/cli.mjs')] },
  ) {}

  private lock(): string {
    mkdirSync(this.runsDir, { recursive: true });
    const lockFile = path.join(this.runsDir, '.lock');
    if (existsSync(lockFile)) {
      const pid = Number(readFileSync(lockFile, 'utf8'));
      if (pid && pidAlive(pid)) throw new Error(`another job is running (process ${pid})`);
      rmSync(lockFile, { force: true });
    }
    const fd = openSync(lockFile, 'wx');
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return lockFile;
  }

  async run(jobId: string, plan: JobPlan): Promise<JobOutcome> {
    if (this.busy) throw new Error('another job is running in this process');
    this.busy = true;
    let lockFile: string | null = null;
    try {
      lockFile = this.lock();
      const outDir = path.join(this.runsDir, jobId);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, 'job.json'), JSON.stringify({ jobId, ...plan, startedAt: new Date().toISOString() }, null, 2) + '\n');
      const before = dirHash(this.canonicalDir);
      const t0 = Date.now();
      const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', HOMOS_RESULTS_DIR: outDir, ...plan.env };
      const child = spawn(this.command.bin, [...this.command.pre, plan.script, ...plan.scriptArgs], { cwd: this.root, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
      const logFd = openSync(path.join(outDir, 'job.log'), 'w');
      let logged = 0;
      let logCut = false;
      let out = '';
      let err = '';
      const toLog = (d: Buffer) => {
        if (logCut) return;
        if (logged + d.length <= LOG_CAP_BYTES) {
          writeSync(logFd, d);
          logged += d.length;
        } else if (!logCut) {
          writeSync(logFd, `\n[log cut at ${LOG_CAP_BYTES} bytes]\n`);
          logCut = true;
        }
      };
      child.stdout.on('data', (d: Buffer) => {
        out = (out + d.toString('utf8')).slice(-TAIL_CHARS);
        toLog(d);
      });
      child.stderr.on('data', (d: Buffer) => {
        err = (err + d.toString('utf8')).slice(-TAIL_CHARS);
        toLog(d);
      });
      let timedOut = false;
      let killer: NodeJS.Timeout | null = null;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        killer = setTimeout(() => child.kill('SIGKILL'), 5000);
      }, plan.timeoutMs);
      const [exitCode, signal] = await new Promise<[number | null, string | null]>((resolve) => {
        child.on('close', (code, sig) => resolve([code, sig]));
        child.on('error', (e) => {
          err = (err + `\n${e.message}`).slice(-TAIL_CHARS);
          resolve([null, null]);
        });
      });
      clearTimeout(timer);
      if (killer) clearTimeout(killer);
      closeSync(logFd);
      const outputFile = path.join(outDir, plan.output);
      return {
        jobId,
        exitCode,
        signal,
        timedOut,
        ms: Date.now() - t0,
        stdoutTail: out,
        stderrTail: err,
        outputFile: existsSync(outputFile) ? outputFile : null,
        canonicalChanged: dirHash(this.canonicalDir) !== before,
      };
    } finally {
      if (lockFile) rmSync(lockFile, { force: true });
      this.busy = false;
    }
  }
}
