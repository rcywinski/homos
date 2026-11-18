/**
 * Tests for step 4.10e: the site's reranker as a child process. A Node stand-in plays the service; nvidia-smi is faked.
 * Offline. Run: npx tsx ai/serve/reranker-process.test.ts
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { plan } from './models-state';
import { descendants, RerankerProcess, rerankerEnv } from './reranker-process';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const FAKE = path.resolve('ai/serve/test-fixtures/fake-reranker.mjs');
const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
let port = 18_600;

function make(mode = 'cuda', extra: { gpu?: number[]; startTimeoutMs?: number } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'homos-rr-'));
  const p = ++port;
  const gpu = extra.gpu ?? [];
  const r = new RerankerProcess({
    command: [process.execPath, FAKE, 'app:app', '--port', String(p), mode],
    cwd: dir,
    port: p,
    env: {},
    pidFile: path.join(dir, 'reranker.pid'),
    logFile: path.join(dir, 'reranker.log'),
    marker: ['app:app', `--port ${p}`],
    startTimeoutMs: extra.startTimeoutMs ?? 10_000,
    stopTimeoutMs: 5_000,
    gpuPids: async () => gpu.filter((x) => alive(x)),
  });
  return { r, dir, gpu, p };
}

async function main() {
  check('plan with the reranker: first in a full load', plan('idle', 'ready', true).join() === 'reranker,generator,embedder,check');
  check('plan with the reranker: first in a search load', plan('idle', 'search', true).join() === 'reranker,embedder,check');
  check('plan with the reranker: from search it is already up', plan('search', 'ready', true).join() === 'release-embedder,generator,embedder,check');
  check('plan without the reranker: unchanged', plan('idle', 'ready').join() === 'generator,embedder,check');

  // Start: waits for /health on CUDA; writes the pid file.
  const a = make('slow');
  await a.r.start(new AbortController().signal);
  const pid = a.r.ownPid()!;
  check('start waits until /health answers on cuda', a.r.running() && (await a.r.health())?.device === 'cuda');
  check('the pid file holds the child pid', readFileSync(path.join(a.dir, 'reranker.pid'), 'utf8').trim() === String(pid));
  a.gpu.push(pid);
  check('a second start while healthy does nothing', (await a.r.start(new AbortController().signal), a.r.ownPid() === pid));
  const stopped = await a.r.stop();
  check('stop: the process is gone and has left the GPU list', stopped === null && !alive(pid), String(stopped));
  check('stop: the pid file is removed', !existsSync(path.join(a.dir, 'reranker.pid')));
  check('stop when nothing runs: nothing to do', (await a.r.stop()) === null);

  // A process tree, as the venv launcher on Windows: the grandchild holds "the GPU". It is found, counted as ours, and
  // the release is confirmed only when it has gone too (review of 18 Nov 2026).
  const t = make('child');
  await t.r.start(new AbortController().signal);
  const tp = t.r.ownPid()!;
  await new Promise((r) => setTimeout(r, 300));
  const kids = await descendants(tp);
  check('descendants of the spawned pid are found', kids.length >= 1, JSON.stringify(kids));
  const t2 = make('child');
  await t2.r.start(new AbortController().signal);
  const own = t2.r.ownPids();
  check('the tracked set holds the spawned pid and its child', own.length >= 2 && own[0] === t2.r.ownPid(), JSON.stringify(own));
  check('the pid file holds the whole set', readFileSync(path.join(t2.dir, 'reranker.pid'), 'utf8').trim().split('\n').length === own.length);
  t2.gpu.push(own[own.length - 1]);
  const r2 = await t2.r.stop();
  check('stop ends the whole tree and waits for the GPU holder', r2 === null && own.every((p) => !alive(p)), String(r2));
  await t.r.stop();
  check('stop ends the whole tree', !alive(tp) && kids.every((p) => !alive(p)));

  // The child sees a short allow-list of the environment, not the server's.
  const env = rerankerEnv({ PATH: '/bin', SystemRoot: 'C:\\Windows', SERVE_ADMIN_EMAIL: 'owner@example.com', SERVE_ACCESS_AUD: 'x', INFERENCE_URL: 'y', TEMP: '/tmp' }, { HF_HUB_OFFLINE: '1' });
  check('environment allow-list', env.PATH === '/bin' && env.SystemRoot === 'C:\\Windows' && env.TEMP === '/tmp' && env.HF_HUB_OFFLINE === '1' && !('SERVE_ADMIN_EMAIL' in env) && !('SERVE_ACCESS_AUD' in env) && !('INFERENCE_URL' in env), JSON.stringify(env));

  // Loud failures: CPU torch, a crash with out of memory, no answer in time.
  const c = make('cpu');
  const e1 = await c.r.start(new AbortController().signal).catch((e: Error) => e.message);
  check('a CPU reranker is refused and stopped', typeof e1 === 'string' && e1.includes('not on the GPU') && !c.r.running(), String(e1));
  const o = make('crash');
  const e2 = await o.r.start(new AbortController().signal).catch((e: Error) => e.message);
  check('an out-of-memory exit is reported with its log line', typeof e2 === 'string' && /exited with 1/.test(e2) && /out of memory/i.test(e2), String(e2));
  const s = make('slow', { startTimeoutMs: 500 });
  const e3 = await s.r.start(new AbortController().signal).catch((e: Error) => e.message);
  check('no answer in time: refused and stopped', typeof e3 === 'string' && e3.includes('did not answer') && !s.r.running(), String(e3));

  // Abort during the start (switch off while loading): the child is ended.
  const b = make('slow');
  const ctrl = new AbortController();
  const starting = b.r.start(ctrl.signal).catch((e: Error) => e.message);
  await new Promise((r) => setTimeout(r, 300));
  const bp = b.r.ownPid()!;
  ctrl.abort(new Error('switch off'));
  const e4 = await starting;
  check('an aborted start ends the child', e4 === 'switch off' && !alive(bp), String(e4));

  // A release not confirmed: the pid stays in the nvidia-smi list.
  const g = make('cuda');
  await g.r.start(new AbortController().signal);
  const gp = g.r.ownPid()!;
  const stuck = new RerankerProcess({ ...((g.r as unknown as { o: object }).o as ConstructorParameters<typeof RerankerProcess>[0]), gpuPids: async () => [gp], stopTimeoutMs: 600 });
  (stuck as unknown as { pid: number }).pid = gp;
  const e5 = await stuck.stop();
  check('a pid still listed by nvidia-smi is a problem, not a release', typeof e5 === 'string' && e5.includes('listed by nvidia-smi'), String(e5));
  await g.r.stop();

  // Leftovers at start-up: ours is ended, a reused pid is left alone.
  const l = make('cuda');
  await l.r.start(new AbortController().signal);
  const lp = l.r.ownPid()!;
  const fresh = new RerankerProcess({ ...((l.r as unknown as { o: object }).o as ConstructorParameters<typeof RerankerProcess>[0]) });
  const left = await fresh.endLeftover();
  check('a leftover reranker from the pid file is ended', left === `leftover reranker pid ${lp} ended` && !alive(lp), String(left));
  const other = make('cuda');
  writeFileSync(path.join(other.dir, 'reranker.pid'), `${process.pid}\n`);
  const notOurs = await other.r.endLeftover();
  check('a pid that is not our reranker is left alone', typeof notOurs === 'string' && notOurs.includes('not our reranker') && alive(process.pid), String(notOurs));
  check('nothing to do without a pid file', (await make('cuda').r.endLeftover()) === null);

  console.log(`reranker: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
