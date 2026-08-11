/**
 * agent-runner-git.ts — zdalny wykonawca zadań przez GIT (dla serwera Windows).
 *
 * PO CO: Rafał z iPhone'a ma tylko sesję chmurową (Fable) — bez Maca i bez
 * terminala. Ta usługa zamyka pętlę: sesja chmurowa commituje zadanie do
 * brancha `agent-queue` → Windows (ta usługa, NSSM, niewidzialna) co POLL_SEC
 * robi pull, wykonuje zadanie Z BIAŁEJ LISTY i odsyła wynik commitem → sesja
 * chmurowa czyta wynik i raportuje na telefon.
 *
 * BEZPIECZEŃSTWO:
 *  - wykonuje WYŁĄCZNIE skrypty z WHITELIST (te same co scripts/agent-runner.ts
 *    na Macu — trzymać ręcznie w zgodzie); żadnego arbitralnego shella,
 *  - działa na osobnym branchu `agent-queue` (main zostaje czysty),
 *  - sekrety (.env) NIGDY nie wchodzą do repo; PAT po stronie chmury jest
 *    fine-grained (tylko to repo, tylko contents RW).
 *
 * KOLEJKA (branch agent-queue):
 *  .agent-queue/pending/<id>.json  → {"id","task","args":[]}   (zleca chmura)
 *  .agent-queue/done/<id>.json     → {...,"exitCode","outputTail"} (odsyła runner)
 *  .agent-queue/runner-status.json → heartbeat (timestamp, aktualne zadanie)
 *
 * INSTALACJA (Windows, sesja serwerowa — patrz TASKS-WINDOWS-ADDENDUM):
 *  git fetch && git checkout agent-queue (branch tworzy chmura/CC)
 *  nssm install homos-runner "<node>" "<tsx cli.mjs>" scripts/agent-runner-git.ts
 *  (AppDirectory=C:\Projects\homos, jak homos-bot/homos-server)
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, execFileSync } from 'child_process';

const ROOT = path.join(__dirname, '..');
const QUEUE = path.join(ROOT, '.agent-queue');
const PENDING = path.join(QUEUE, 'pending');
const DONE = path.join(QUEUE, 'done');
const STATUS = path.join(QUEUE, 'runner-status.json');
const LOG = path.join(ROOT, '.bot', 'runner.log');
const POLL_SEC = 180;
const BRANCH = 'main';

// lustro WHITELIST z scripts/agent-runner.ts — trzymać w zgodzie ręcznie
const WHITELIST: Record<string, string> = {
  'fetch:swaps': 'fetch:swaps',
  'fetch:llama': 'fetch:llama',
  backtest: 'backtest',
  'backtest:validate': 'backtest:validate',
  'backtest:selection': 'backtest:selection',
  'test:math': 'test:math',
  pipeline: 'pipeline',
  scan: 'scan', // npm run scan → tsx backtest/scan-universe.ts (dopisać w package.json)
};

const log = (m: string) => {
  const line = `${new Date().toISOString()} ${m}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch { /* pre-mkdir race */ }
};

const git = (...args: string[]): string => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 120_000 }).trim();
  } catch (e: any) {
    throw new Error(`git ${args[0]}: ${String(e.stderr || e.message).slice(0, 200)}`);
  }
};

function heartbeat(current: string | null) {
  fs.mkdirSync(QUEUE, { recursive: true });
  fs.writeFileSync(STATUS, JSON.stringify({ updatedAt: new Date().toISOString(), current, host: 'windows' }, null, 2));
}

function runTask(task: { id: string; task: string; args?: string[] }): Promise<{ exitCode: number; outputTail: string }> {
  return new Promise((resolve) => {
    const script = WHITELIST[task.task];
    const tail: string[] = [];
    const push = (b: Buffer) => {
      for (const l of b.toString().split('\n')) if (l.trim()) { tail.push(l.slice(0, 300)); if (tail.length > 80) tail.shift(); }
    };
    const child = spawn('npm', ['run', script, '--', ...(task.args ?? [])], { cwd: ROOT, shell: process.platform === 'win32' });
    child.stdout.on('data', push);
    child.stderr.on('data', push);
    child.on('close', (code) => resolve({ exitCode: code ?? -1, outputTail: tail.join('\n') }));
    child.on('error', (e) => resolve({ exitCode: -1, outputTail: `spawn error: ${e}` }));
  });
}

let busy = false;

async function tick() {
  if (busy) return; // długie zadanie w toku — pull dopiero po nim
  try {
    git('fetch', 'origin', BRANCH);
    git('reset', '--hard', `origin/${BRANCH}`); // runner niczego lokalnie nie tworzy poza done/ — bezpieczne
  } catch (e) {
    log(`pull failed: ${e}`);
    return;
  }
  heartbeat(null);
  fs.mkdirSync(PENDING, { recursive: true });
  fs.mkdirSync(DONE, { recursive: true });

  const pending = fs.readdirSync(PENDING).filter((f) => f.endsWith('.json'))
    .filter((f) => !fs.existsSync(path.join(DONE, f)));
  if (!pending.length) return;

  busy = true;
  try {
    for (const f of pending.sort()) {
      let job: { id: string; task: string; args?: string[] };
      try { job = JSON.parse(fs.readFileSync(path.join(PENDING, f), 'utf8')); }
      catch { log(`zepsuty json ${f} — pomijam`); continue; }

      if (!WHITELIST[job.task]) {
        fs.writeFileSync(path.join(DONE, f), JSON.stringify({ ...job, exitCode: -1, outputTail: `ODRZUCONE: "${job.task}" spoza białej listy (${Object.keys(WHITELIST).join(', ')})`, finishedAt: new Date().toISOString() }, null, 2));
      } else {
        log(`▶ ${job.id}: npm run ${job.task} ${(job.args ?? []).join(' ')}`);
        heartbeat(job.id);
        const startedAt = new Date().toISOString();
        const res = await runTask(job);
        fs.writeFileSync(path.join(DONE, f), JSON.stringify({ ...job, startedAt, finishedAt: new Date().toISOString(), ...res }, null, 2));
        log(`■ ${job.id}: exit ${res.exitCode}`);
      }
      heartbeat(null);
      try {
        git('add', '.agent-queue');
        git('commit', '-m', `runner: wynik ${f}`);
        git('push', 'origin', BRANCH);
      } catch (e) {
        log(`push wyniku failed (spróbuję przy następnym ticku): ${e}`);
      }
    }
  } finally {
    busy = false;
  }
}

(async () => {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== BRANCH) {
    log(`BŁĄD: runner musi działać na branchu ${BRANCH} (jest: ${branch}). git checkout ${BRANCH} i restart.`);
    process.exit(1);
  }
  log(`runner-git start — poll co ${POLL_SEC}s, whitelist: ${Object.keys(WHITELIST).join(', ')}`);
  await tick();
  setInterval(tick, POLL_SEC * 1000);
})();
