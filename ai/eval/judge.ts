/**
 * npm run ai:judge -- --max-usd <cap> [--concurrency 4]
 * Step 1.9: the Opus 5.5 judge grades every answer of the three generation runs (k5-run1, k5-run2, k10) on golden
 * v1.4. Each answer is one blind call (see ai/judge/items.ts). Verdicts are appended to a JSONL file as they arrive,
 * so an interrupted run resumes without paying twice. Writes the judgments file and a JSON with every item; the
 * report with tables is written only after the owner's blind grading (npm run ai:blind -- score).
 */
import 'dotenv/config';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import type { AnswerRecord } from '../answer/measures';
import { MODELS } from '../context/pricing';
import { ClaudeJudge } from '../judge/claude';
import { byHash, judgeInput, type JudgedItem } from '../judge/items';
import type { JudgeResult } from '../judge/types';
import type { GoldenQuestion } from './golden';

export const RESULTS = 'ai/eval/results';
export const RUNS = [
  { run: 'k5-run1', file: `${RESULTS}/2026-11-10-answers-k5-golden-v1-4.json` },
  { run: 'k5-run2', file: `${RESULTS}/2026-11-10-answers-k5-run2-golden-v1-4.json` },
  { run: 'k10', file: `${RESULTS}/2026-11-10-answers-k10-golden-v1-4.json` },
];
export const JUDGMENTS = `${RESULTS}/2026-11-10-judgments-golden-v1-4.jsonl`;
export const JUDGED = `${RESULTS}/2026-11-10-judged-golden-v1-4.json`;

const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);

export function loadGolden(): GoldenQuestion[] {
  return readFileSync('ai/eval/golden.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as GoldenQuestion);
}

/** Every answer of every run as a judge item, with any verdict already in the JSONL file attached. */
export function loadItems(): JudgedItem[] {
  const golden = new Map(loadGolden().map((q) => [q.id, q]));
  const done = new Map<string, JudgeResult>();
  if (existsSync(JUDGMENTS))
    for (const l of readFileSync(JUDGMENTS, 'utf8').split('\n').filter((x) => x.trim())) {
      const j = JSON.parse(l) as { run: string; id: string; result: JudgeResult };
      if (j.result.verdict) done.set(`${j.run}|${j.id}`, j.result);
    }
  const items: JudgedItem[] = [];
  for (const { run, file } of RUNS) {
    const r = JSON.parse(readFileSync(file, 'utf8')) as { goldenVersion: string; perQuestion: AnswerRecord[] };
    if (r.goldenVersion !== '1.4') throw new Error(`${file}: golden v${r.goldenVersion}, expected 1.4`);
    for (const rec of r.perQuestion) {
      const q = golden.get(rec.id)!;
      const result = done.get(`${run}|${rec.id}`);
      items.push({ run, id: rec.id, answerable: q.answerable, input: judgeInput(rec, q), ...(result ? { result } : {}) });
    }
  }
  return items;
}

async function main() {
  const maxUsd = Number(arg('--max-usd'));
  if (!(maxUsd > 0)) throw new Error('--max-usd <cap in USD> is required');
  const concurrency = Number(arg('--concurrency') ?? 4);
  const items = byHash(loadItems());
  const todo = items.filter((x) => !x.result);
  const judge = new ClaudeJudge();
  // Worst case of one call: the prompt (about 3 characters per token) plus the whole 8000-token output budget.
  const worst = (x: JudgedItem) => ((JSON.stringify(x.input).length / 3 + 2000) * MODELS.opus.price.input + 8000 * MODELS.opus.price.output) / 1e6;
  let spent = 0;
  let reserved = 0;
  let stopped = false;
  let errors = 0;
  console.log(`${items.length} answers, ${items.length - todo.length} already judged, ${todo.length} to judge; ${judge.name}; cap $${maxUsd}`);

  let next = 0;
  const worker = async () => {
    while (next < todo.length && !stopped) {
      const x = todo[next++];
      const w = worst(x);
      if (spent + reserved + w > maxUsd) {
        stopped = true;
        break;
      }
      reserved += w;
      let r: JudgeResult;
      try {
        r = await judge.judge(x.input);
        if (!r.verdict) r = await judge.judge(x.input);
      } finally {
        reserved -= w;
      }
      spent += r.costUsd;
      if (!r.verdict) errors++;
      x.result = r;
      appendFileSync(JUDGMENTS, JSON.stringify({ run: x.run, id: x.id, result: r }) + '\n');
      process.stdout.write(r.verdict ? '.' : 'x');
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  process.stdout.write('\n');

  const all = loadItems();
  writeFileSync(JUDGED, JSON.stringify({ date: '2026-11-10', goldenVersion: '1.4', judge: judge.name, runs: RUNS, items: all }, null, 2) + '\n');
  const missing = all.filter((x) => !x.result).length;
  console.log(`spent $${spent.toFixed(4)} this run (cap $${maxUsd})${stopped ? ', STOPPED BY CAP' : ''}; failed calls ${errors}; answers without a verdict ${missing}. Wrote ${JUDGED}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
