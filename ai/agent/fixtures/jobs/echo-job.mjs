/* global process, console, setTimeout */
// Harmless job for the runner tests (step 2.3). Plain Node, no dependencies.
// argv[2] is the mode: echo (print argv and whether an API key reached the environment, write a result file),
// sleep (write pid.txt, wait 30 s), flood (print about 6 MB), touch-canonical (write a file into CANON_DIR).
import fs from 'fs';
import path from 'path';
const mode = process.argv[2];
if (mode === 'echo') {
  console.log(JSON.stringify({ argv: process.argv.slice(2), apiKeyPresent: 'ANTHROPIC_API_KEY' in process.env, envKeys: Object.keys(process.env).sort() }));
  fs.writeFileSync(path.join(process.env.HOMOS_RESULTS_DIR, 'walkforward-test-pool-20d.json'), JSON.stringify({ id: 'test-pool', windowDays: 20, summary: { 'Pasywny ±50%': { mean: 1.25, winPct: 60, windows: 5 } } }));
  console.error('a line on stderr');
} else if (mode === 'sleep') {
  // The pid file lets the tests check that the job process is gone after a timeout or an interruption.
  fs.writeFileSync(path.join(process.env.HOMOS_RESULTS_DIR, 'pid.txt'), String(process.pid));
  setTimeout(() => console.log('woke up'), 30_000);
} else if (mode === 'flood') {
  const line = 'x'.repeat(1000) + '\n';
  for (let i = 0; i < 6200; i++) process.stdout.write(line);
  process.stdout.write('LAST LINE\n');
} else if (mode === 'touch-canonical') {
  fs.writeFileSync(path.join(process.env.CANON_DIR, 'walkforward-intruder.json'), '{}');
}
