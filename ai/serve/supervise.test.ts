/**
 * Tests for the server supervisor (owner's request of 18 Nov 2026): backoff, reset after a healthy run, the crash-loop
 * bound, and a real child process that exits and is started again. Offline.
 * Run: npx tsx ai/serve/supervise.test.ts
 */
import { spawn, spawnSync } from 'child_process';
import { DEFAULTS, nextWait, supervise } from './supervise';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

async function main() {
  check('backoff 5 s, 15 s, 60 s, then 300 s', [0, 1, 2, 3, 7].map((n) => nextWait(DEFAULTS, n, [], 0)).join() === '5000,15000,60000,300000,300000');
  const t = 10 * 3_600_000;
  const ten = Array.from({ length: 10 }, (_, i) => t - 50 * 60_000 + i * 60_000);
  check('the 11th restart in an hour waits until the oldest is an hour old', nextWait(DEFAULTS, 1, ten, t) === 10 * 60_000, String(nextWait(DEFAULTS, 1, ten, t)));

  // A crash loop with a fake clock: every start crashes at once. Over one simulated day it must start at most
  // 10 times in any hour.
  let clock = 0;
  const starts: number[] = [];
  const lines: string[] = [];
  await supervise(
    async () => {
      starts.push(clock);
      clock += 1000;
      return 1;
    },
    { ...DEFAULTS, now: () => clock, sleep: async (ms) => void (clock += ms), log: (l) => lines.push(l) },
    () => clock > 24 * 3_600_000,
  );
  const worstHour = Math.max(...starts.map((s) => starts.filter((x) => x >= s && x < s + 3_600_000).length));
  check('crash loop: at most 10 starts in any hour over a day', worstHour <= 10, String(worstHour));
  check('crash loop: still restarting all day (it never gives up for good)', starts.at(-1)! > 23 * 3_600_000);
  check('every exit is logged with the code and the wait', lines.length > 0 && /server exited with code 1 after \d+ s; starting again in \d+ s/.test(lines[0]), lines[0]);

  // A healthy run resets the backoff: crash, crash, run 11 minutes, crash -> waits 5, 15, then 5 again.
  clock = 0;
  const waits: number[] = [];
  const durations = [1000, 1000, 11 * 60_000, 1000];
  let k = 0;
  await supervise(
    async () => {
      clock += durations[k++];
      return 1;
    },
    { ...DEFAULTS, now: () => clock, sleep: async (ms) => void (waits.push(ms), (clock += ms)), log: () => undefined },
    (n) => n >= 4,
  );
  check('a run of 10 minutes or more resets the backoff', waits.join() === '5000,15000,5000', waits.join());

  // A real child process: node exits twice, the supervisor starts it again each time (short waits for the test).
  let n = 0;
  const lines2: string[] = [];
  await supervise(
    () =>
      new Promise<number | null>((res) => {
        const c = spawn(process.execPath, ['-e', 'process.exit(3)']);
        c.on('exit', (code) => {
          n++;
          res(code);
        });
      }),
    { ...DEFAULTS, backoffMs: [50, 50], log: (l) => lines2.push(l) },
    (s) => s >= 3,
  );
  check('a real child exiting is started again', n === 3 && lines2.filter((l) => l.includes('server exited with code 3')).length === 2, String(n) + lines2.join('|'));
  // The script refuses to run without a command.
  const cli = spawnSync(process.execPath, ['--import', 'tsx', 'ai/serve/supervise-cli.ts'], { encoding: 'utf8', timeout: 30_000 });
  check('the script needs a command after --', cli.status === 2 && cli.stderr.includes('usage'));

  console.log(`supervise: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
