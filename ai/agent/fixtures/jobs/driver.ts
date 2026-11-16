/**
 * Test driver for the runner's interruption handling (step 2.4 pre-check): runs the fixture job in sleep mode through
 * the real SpawnRunner with the tsx prefix, as the CLI does, so a test can kill this process and check that the job's
 * process group went with it. Usage: tsx driver.ts <runsDir>
 */
import path from 'path';
import { SpawnRunner } from '../../runner';

const root = path.join(__dirname, '..', '..', '..', '..');
const runsDir = process.argv[2];
const runner = new SpawnRunner(root, runsDir, path.join(runsDir, 'canon'));
console.log(`driver ${process.pid}`);
runner
  .run('j20261112T120000n1', { job: 'walkforward', args: {}, script: 'ai/agent/fixtures/jobs/echo-job.mjs', scriptArgs: ['sleep'], env: {}, output: 'x.json', timeoutMs: 120_000 })
  .then((o) => console.log(`done ${JSON.stringify(o)}`));
