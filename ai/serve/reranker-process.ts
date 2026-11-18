/**
 * The site's reranker as a child process of the chat server (phase 4, step 4.10e; plan agreed with CC-Mac and
 * reviewed on 18 Nov 2026).
 *
 * The owner wants nothing of the project in VRAM while nobody uses the site, the reranker included, and nothing started
 * at boot. A model unloaded inside a live Python process leaves its CUDA context behind, so the reranker is a process
 * of its own that the server starts as the first load stage and ends on every release:
 *   - start: `python -m uvicorn app:app --host 127.0.0.1 --port 11436` in inference/reranker of the pinned clone, from a
 *     venv with CUDA torch; app.py loads the model at import, so /health answering means the model is in VRAM. The
 *     stage waits for /health with device "cuda" and cudaAvailable true, or fails loudly (no silent CPU reranking; an
 *     out-of-memory exit is reported with the last lines of its log);
 *   - stop: the whole process tree by pid, then confirmed by the pid leaving `nvidia-smi --query-compute-apps` (on
 *     Windows the memory column is often N/A under WDDM, the pid is not);
 *   - on Windows a venv's Scripts\python.exe is a launcher whose child holds the CUDA context (review of 18 Nov 2026),
 *     so once /health answers, the spawned pid's descendants are resolved and the whole set is tracked: the release is
 *     confirmed when none of them is alive or listed by nvidia-smi, and any of them counts as "ours";
 *   - a pid file (the set, root first) lets a restarted server end a leftover, after checking the command line;
 *   - the child gets a short allow-list of environment variables, not the server's whole environment; its log is
 *     capped at 5 MB (one older file kept).
 * It listens on 127.0.0.1 only, so no firewall rule is touched, and on 11436, apart from the evaluation instance on
 * 11435 (CC-Mac's, started for a run by the owner's word).
 */
import { execFile, spawn, type ChildProcess } from 'child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';

export interface RerankerProcessOptions {
  /** The program and arguments; by default the venv's python running uvicorn on 127.0.0.1:<port>. */
  command: string[];
  cwd: string;
  port: number;
  env: Record<string, string>;
  pidFile: string;
  logFile: string;
  /** Substrings that the command line of our reranker contains; a pid whose command line lacks them is not ours. */
  marker: string[];
  startTimeoutMs?: number;
  stopTimeoutMs?: number;
  /** Pids that hold the GPU now, or null when nvidia-smi cannot be run (then the process exit alone confirms). */
  gpuPids?: () => Promise<number[] | null>;
  /** The command line of a running pid, or null when there is no such process. */
  commandLineOf?: (pid: number) => Promise<string | null>;
  /** All descendants of a pid (children, grandchildren). */
  descendantsOf?: (pid: number) => Promise<number[]>;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
}

export function defaultRerankerCommand(python: string, port: number): string[] {
  return [python, '-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', String(port)];
}

const run = (file: string, args: string[]) =>
  new Promise<string | null>((resolve) => execFile(file, args, { timeout: 10_000, windowsHide: true }, (err, stdout) => resolve(err ? null : stdout)));

/** nvidia-smi's list of compute processes; null when it cannot be run. */
export async function nvidiaSmiPids(): Promise<number[] | null> {
  const out = await run('nvidia-smi', ['--query-compute-apps=pid', '--format=csv,noheader']);
  if (out === null) return null;
  return out
    .split(/\r?\n/)
    .map((l) => Number(l.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** nvidia-smi's compute processes with their executable path; null when it cannot be run. */
export async function nvidiaSmiApps(): Promise<{ pid: number; name: string }[] | null> {
  const out = await run('nvidia-smi', ['--query-compute-apps=pid,process_name', '--format=csv,noheader']);
  if (out === null) return null;
  return out
    .split(/\r?\n/)
    .map((l) => l.split(',').map((x) => x.trim()))
    .filter(([p]) => Number(p) > 0)
    .map(([p, name]) => ({ pid: Number(p), name: name ?? '' }));
}

/** Every descendant of a pid, from the process table (Win32_Process on Windows, ps elsewhere). */
export async function descendants(pid: number): Promise<number[]> {
  const out =
    process.platform === 'win32'
      ? await run('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId)" }'])
      : await run('ps', ['-A', '-o', 'pid=,ppid=']);
  if (!out) return [];
  const pairs = out
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/).map(Number))
    .filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b));
  const found: number[] = [];
  const queue = [pid];
  while (queue.length) {
    const p = queue.shift()!;
    for (const [c, parent] of pairs) {
      if (parent === p && c !== pid && !found.includes(c)) {
        found.push(c);
        queue.push(c);
      }
    }
  }
  return found;
}

/** Environment variables the reranker may see: what Windows, Python and CUDA need, nothing of the chat server. */
const ENV_ALLOW = /^(PATH|PATHEXT|SYSTEMROOT|SYSTEMDRIVE|WINDIR|COMSPEC|TEMP|TMP|HOME|USERPROFILE|LOCALAPPDATA|APPDATA|HOMEDRIVE|HOMEPATH|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|COMMONPROGRAMFILES|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|OS|LANG|LC_ALL|CUDA_PATH.*|CUDA_VISIBLE_DEVICES)$/i;

export function rerankerEnv(base: NodeJS.ProcessEnv, extra: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) if (v !== undefined && ENV_ALLOW.test(k)) env[k] = v;
  return { ...env, ...extra };
}

export async function commandLine(pid: number): Promise<string | null> {
  if (process.platform === 'win32') {
    const out = await run('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`]);
    return out && out.trim() ? out.trim() : null;
  }
  const out = await run('ps', ['-o', 'args=', '-p', String(pid)]);
  return out && out.trim() ? out.trim() : null;
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

async function killTree(pid: number): Promise<void> {
  if (process.platform === 'win32') await run('taskkill', ['/PID', String(pid), '/T', '/F']);
  else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // already gone
      }
    }
  }
}

export class RerankerProcess {
  private child: ChildProcess | null = null;
  private pid: number | null = null;
  /** The spawned pid and its descendants, resolved once /health answers (the launcher and the interpreter). */
  private pids: number[] = [];
  private exited: string | null = null;

  constructor(private readonly o: RerankerProcessOptions) {}

  private sleep(ms: number) {
    return (this.o.sleep ?? ((x: number) => new Promise<void>((r) => setTimeout(r, x))))(ms);
  }

  private log(line: string) {
    this.o.log?.(line);
  }

  get url() {
    return `http://127.0.0.1:${this.o.port}`;
  }

  /** The reranker's /health, or null when it does not answer. */
  async health(): Promise<{ device?: string; cudaAvailable?: boolean; model?: string } | null> {
    try {
      const r = await (this.o.fetchFn ?? fetch)(`${this.url}/health`, { signal: AbortSignal.timeout(2000) });
      return r.ok ? ((await r.json()) as { device?: string; cudaAvailable?: boolean }) : null;
    } catch {
      return null;
    }
  }

  /** The last lines of the reranker's log, for a failed start (torch's out-of-memory message lands here). */
  private tail(): string {
    try {
      return readFileSync(this.o.logFile, 'utf8').trim().split(/\r?\n/).slice(-3).join(' | ').slice(0, 400);
    } catch {
      return '';
    }
  }

  /** Starts the child and waits until /health says the model is on CUDA. Throws with the reason otherwise. */
  async start(signal: AbortSignal): Promise<void> {
    if (this.pid !== null && alive(this.pid)) {
      const h = await this.health();
      if (h?.device === 'cuda' && h.cudaAvailable !== false) return;
      // Running but not answering as it should: end it before starting a fresh one.
      const problem = await this.stop();
      if (problem) throw new Error(problem);
    }
    mkdirSync(path.dirname(this.o.logFile), { recursive: true });
    mkdirSync(path.dirname(this.o.pidFile), { recursive: true });
    try {
      if (statSync(this.o.logFile).size > 5 * 1024 * 1024) renameSync(this.o.logFile, `${this.o.logFile}.1`);
    } catch {
      // no log yet
    }
    const fd = openSync(this.o.logFile, 'a');
    this.exited = null;
    const [cmd, ...args] = this.o.command;
    const child = spawn(cmd, args, {
      cwd: this.o.cwd,
      env: rerankerEnv(process.env, this.o.env),
      stdio: ['ignore', fd, fd],
      windowsHide: true,
      // Its own process group on POSIX, so the whole tree can be ended at once; Windows uses taskkill /T.
      detached: process.platform !== 'win32',
    });
    closeSync(fd);
    this.child = child;
    this.pid = child.pid ?? null;
    this.pids = this.pid !== null ? [this.pid] : [];
    child.on('exit', (code, sig) => {
      this.exited = `exited with ${code ?? sig}`;
    });
    child.on('error', (e) => {
      this.exited = `could not start: ${e.message}`;
    });
    if (this.pid !== null) writeFileSync(this.o.pidFile, `${this.pid}\n`);
    const deadline = Date.now() + (this.o.startTimeoutMs ?? 90_000);
    for (;;) {
      if (signal.aborted) {
        await this.stop();
        throw signal.reason instanceof Error ? signal.reason : new Error('aborted');
      }
      if (this.exited) {
        const why = this.exited;
        this.forget();
        throw new Error(`reranker ${why}${this.tail() ? `: ${this.tail()}` : ''}`);
      }
      const h = await this.health();
      if (h) {
        if (h.device !== 'cuda' || h.cudaAvailable === false) {
          await this.stop();
          throw new Error(`reranker runs on ${h.device ?? 'an unknown device'}, not on the GPU (is the venv's torch a CUDA build?)`);
        }
        // The process that holds the CUDA context may be a child of the one we spawned (the venv launcher on Windows).
        if (this.pid !== null) {
          this.pids = [this.pid, ...(await (this.o.descendantsOf ?? descendants)(this.pid))];
          writeFileSync(this.o.pidFile, this.pids.join('\n') + '\n');
        }
        return;
      }
      if (Date.now() > deadline) {
        await this.stop();
        throw new Error(`reranker did not answer within ${Math.round((this.o.startTimeoutMs ?? 90_000) / 1000)} s${this.tail() ? `: ${this.tail()}` : ''}`);
      }
      await this.sleep(500);
    }
  }

  private forget() {
    this.child = null;
    this.pid = null;
    this.pids = [];
    rmSync(this.o.pidFile, { force: true });
  }

  /** Ends the child's whole tree and waits until it has left the GPU. Null when confirmed, else the problem. */
  async stop(): Promise<string | null> {
    if (this.pid === null && !this.pids.length) return null;
    const set = this.pids.length ? [...this.pids] : [this.pid!];
    // The tree from the root, then any member left (a descendant whose parent already died is no longer in the tree).
    await killTree(set[0]);
    for (const p of set.slice(1)) if (alive(p)) await killTree(p);
    const problem = await this.waitGone(set);
    if (!problem) this.forget();
    return problem;
  }

  private async waitGone(set: number[]): Promise<string | null> {
    const deadline = Date.now() + (this.o.stopTimeoutMs ?? 15_000);
    for (;;) {
      const gpu = this.o.gpuPids ? await this.o.gpuPids() : null;
      const running = set.filter(alive);
      const listed = set.filter((p) => (gpu ?? []).includes(p));
      if (!running.length && !listed.length) return null;
      if (Date.now() > deadline) {
        return `reranker ${running.length ? `pid ${running.join(', ')} still running` : `pid ${listed.join(', ')} still listed by nvidia-smi`} after ${Math.round((this.o.stopTimeoutMs ?? 15_000) / 1000)} s`;
      }
      await this.sleep(300);
    }
  }

  /**
   * At start-up: a reranker left by a previous server (its pid in the pid file) is ended, after checking that the pid
   * is still our reranker (a reused pid of another program is left alone). Returns what was done, for the log.
   */
  async endLeftover(): Promise<string | null> {
    if (!existsSync(this.o.pidFile)) return null;
    const set = readFileSync(this.o.pidFile, 'utf8')
      .split(/\s+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    const living = set.filter(alive);
    if (!living.length) {
      rmSync(this.o.pidFile, { force: true });
      return null;
    }
    // Ours only if a living member's command line is our reranker's (the launcher and the interpreter both carry it).
    let ours = false;
    for (const p of living) {
      const cmdline = await (this.o.commandLineOf ?? commandLine)(p);
      if (cmdline && this.o.marker.every((m) => cmdline.includes(m))) ours = true;
    }
    if (!ours) {
      rmSync(this.o.pidFile, { force: true });
      return `pid ${living.join(', ')} from the pid file is not our reranker; left alone`;
    }
    this.pid = living[0];
    this.pids = living;
    const problem = await this.stop();
    return problem ? `leftover reranker pid ${living.join(', ')}: ${problem}` : `leftover reranker pid ${living.join(', ')} ended`;
  }

  /** True while our child is running. */
  running(): boolean {
    return this.pid !== null && alive(this.pid);
  }

  ownPid(): number | null {
    return this.pid;
  }

  /** Every pid of our reranker (the launcher and the interpreter on Windows), for the admin page's "ours". */
  ownPids(): number[] {
    return [...this.pids];
  }
}
