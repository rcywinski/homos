/**
 * npm run ai:agent:refs
 * Reference runs for the job tasks of the step 2.4 agent evaluation (ai/eval/agent-tasks.jsonl, tasks with
 * sources.job). Each job runs twice through the real SpawnRunner, in a temporary runs directory of its own (never the
 * agent's ai/agent/runs/, and never touching backtest/results/), and the two outputs are compared byte for byte. The
 * first output is kept as the reference in ai/eval/agent-refs/<task id>.json; times and the determinism check go to
 * ai/eval/agent-refs/runs.json. The reference numbers in the task set are read from these files.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { planJob } from '../agent/jobs';
import { SpawnRunner } from '../agent/runner';

const OUT = 'ai/eval/agent-refs';

interface Task {
  id: string;
  sources: { job?: Record<string, unknown> };
}

async function main() {
  const root = process.cwd();
  const tasks = readFileSync('ai/eval/agent-tasks.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Task).filter((t) => t.sources.job);
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'homos-refs-'));
  const runner = new SpawnRunner(root, tmp, path.join(root, 'backtest/results'));
  const rows = [];
  try {
    for (const t of tasks) {
      const plan = planJob(t.sources.job);
      const outs = [];
      for (const n of [1, 2]) {
        const id = `j20261112T130000n${rows.length * 2 + n}`;
        const o = await runner.run(id, plan);
        if (o.exitCode !== 0 || !o.outputFile || o.canonicalChanged) throw new Error(`${t.id} run ${n} failed: ${JSON.stringify({ ...o, stdoutTail: o.stdoutTail.slice(-300) })}`);
        outs.push({ file: o.outputFile, seconds: Number((o.ms / 1000).toFixed(1)) });
        console.log(`${t.id} run ${n}: ${(o.ms / 1000).toFixed(1)} s`);
      }
      const identical = readFileSync(outs[0].file).equals(readFileSync(outs[1].file));
      copyFileSync(outs[0].file, path.join(OUT, `${t.id}.json`));
      rows.push({ task: t.id, args: plan.args, output: plan.output, seconds: outs.map((o) => o.seconds), identical });
      console.log(`${t.id}: identical ${identical}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  writeFileSync(path.join(OUT, 'runs.json'), JSON.stringify({ date: new Date().toISOString(), note: 'Each job run twice through SpawnRunner on the owner\'s Mac; the first output is the reference.', runs: rows }, null, 2) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
