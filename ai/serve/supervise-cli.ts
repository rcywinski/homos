/**
 * Entry point of the server supervisor (ai/serve/supervise.ts) for the "HOMOS showcase server" task:
 *   node --import tsx ai/serve/supervise-cli.ts -- <command> [args...]
 */
import { spawn, type ChildProcess } from 'child_process';
import { DEFAULTS, supervise } from './supervise';

async function main() {
  const i = process.argv.indexOf('--');
  const cmd = i >= 0 ? process.argv.slice(i + 1) : [];
  if (!cmd.length) {
    console.error('usage: supervise-cli.ts -- <command> [args...]');
    process.exit(2);
  }
  console.log(`[supervise] ${new Date().toISOString()} supervising: ${cmd.join(' ')}`);
  // Stopping the supervisor stops the server too (Ctrl+C, a plain kill); on the box the task's job object does this
  // as well when the task is stopped.
  let child: ChildProcess | null = null;
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) {
    process.on(sig, () => {
      console.log(`[supervise] ${new Date().toISOString()} ${sig}: stopping the server`);
      child?.kill();
      process.exit(0);
    });
  }
  await supervise(
    () =>
      new Promise<number | null>((resolve) => {
        child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
        child.on('exit', (code) => resolve(code));
        child.on('error', (e) => {
          console.log(`[supervise] ${new Date().toISOString()} could not start the server: ${e.message}`);
          resolve(null);
        });
      }),
    DEFAULTS,
  );
}

void main();
