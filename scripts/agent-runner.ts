/**
 * agent-runner.ts — automation bridge between a Claude session and your machine.
 *
 * Run once in iTerm and leave it:
 *   npm run agent
 *
 * How it works:
 *  - watches for job files in .agent/queue/*.json  ({"script": "fetch:swaps", "args": []})
 *  - runs ONLY whitelisted scripts (never arbitrary shell commands)
 *  - job logs: .agent/logs/<job>.log (streamed live)
 *  - state: .agent/status.json (heartbeat every 3s, current job, exit codes)
 *  - completed jobs land in .agent/done/
 *
 * Claude drops job files through the session's file bridge and reads logs/status —
 * this lets it launch data fetches/backtests and monitor them, even though it has
 * no direct access to your terminal.
 * Stop: Ctrl+C.
 */
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const ROOT = path.join(__dirname, '..');
const AGENT = path.join(ROOT, '.agent');
const QUEUE = path.join(AGENT, 'queue');
const DONE = path.join(AGENT, 'done');
const LOGS = path.join(AGENT, 'logs');
const STATUS = path.join(AGENT, 'status.json');

/** Whitelist: job name -> npm script. Nothing outside the list gets executed. */
const WHITELIST: Record<string, string> = {
  'fetch:swaps': 'fetch:swaps',
  'backtest': 'backtest',
  'backtest:validate': 'backtest:validate',
  'test:math': 'test:math',
  'fetch:llama': 'fetch:llama',
  'backtest:selection': 'backtest:selection',
  'pipeline': 'pipeline',
};

for (const d of [AGENT, QUEUE, DONE, LOGS]) fs.mkdirSync(d, { recursive: true });

interface Status {
  startedAt: string;
  heartbeat: string;
  running: { job: string; script: string; pid: number; since: string } | null;
  history: Array<{ job: string; script: string; exitCode: number | null; finishedAt: string; durationSec: number }>;
}

const status: Status = {
  startedAt: new Date().toISOString(),
  heartbeat: new Date().toISOString(),
  running: null,
  history: [],
};

const saveStatus = () => {
  status.heartbeat = new Date().toISOString();
  fs.writeFileSync(STATUS, JSON.stringify(status, null, 2));
};

let busy = false;

async function runJob(jobFile: string) {
  busy = true;
  const jobName = path.basename(jobFile, '.json');
  let script = '';
  let args: string[] = [];
  try {
    const j = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
    script = j.script;
    args = Array.isArray(j.args) ? j.args.map(String) : [];
  } catch (e) {
    console.error(`[agent] bad job file ${jobName}:`, e);
    fs.renameSync(jobFile, path.join(DONE, `${jobName}.invalid.json`));
    busy = false;
    return;
  }

  if (!WHITELIST[script]) {
    console.error(`[agent] REJECTED job outside the whitelist: "${script}"`);
    fs.renameSync(jobFile, path.join(DONE, `${jobName}.rejected.json`));
    busy = false;
    return;
  }

  const logPath = path.join(LOGS, `${jobName}.log`);
  const log = fs.createWriteStream(logPath, { flags: 'a' });
  const t0 = Date.now();
  console.log(`[agent] ▶ ${jobName}: npm run ${script} ${args.join(' ')}`);
  log.write(`=== ${new Date().toISOString()} npm run ${script} ${args.join(' ')} ===\n`);

  const child = spawn('npm', ['run', WHITELIST[script], '--', ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Windows: spawn() does not launch npm.cmd without a shell (ENOENT) — same as in agent-runner-git.ts
    shell: process.platform === 'win32',
  });

  status.running = { job: jobName, script, pid: child.pid || -1, since: new Date().toISOString() };
  saveStatus();

  child.stdout.on('data', (d) => {
    process.stdout.write(d);
    log.write(d);
  });
  child.stderr.on('data', (d) => {
    process.stderr.write(d);
    log.write(d);
  });

  await new Promise<void>((resolve) => {
    child.on('close', (code) => {
      const dur = (Date.now() - t0) / 1000;
      log.write(`\n=== exit ${code} after ${dur.toFixed(0)}s ===\n`);
      log.end();
      status.running = null;
      status.history.push({
        job: jobName,
        script,
        exitCode: code,
        finishedAt: new Date().toISOString(),
        durationSec: Math.round(dur),
      });
      if (status.history.length > 50) status.history.shift();
      saveStatus();
      fs.renameSync(jobFile, path.join(DONE, `${jobName}.json`));
      console.log(`\n[agent] ■ ${jobName} finished (exit ${code}, ${dur.toFixed(0)}s)`);
      resolve();
    });
  });
  busy = false;
}

console.log('[agent] bridge started. Queue: .agent/queue/  Logs: .agent/logs/  Ctrl+C to stop.');
saveStatus();

setInterval(async () => {
  saveStatus();
  if (busy) return;
  const jobs = fs
    .readdirSync(QUEUE)
    .filter((f) => f.endsWith('.json'))
    .sort();
  if (jobs.length) await runJob(path.join(QUEUE, jobs[0]));
}, 3000);
