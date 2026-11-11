/**
 * Step 1.9 measures over judged items, pure functions (tested in judge.test.ts):
 *   - per run: correctness, faithfulness and premise counts;
 *   - run-to-run spread: how many questions changed verdict between two runs with the same settings;
 *   - per question differences between two runs (used for k=5 vs k=10).
 */
import { CORRECTNESS, FAITHFULNESS, type Correctness, type Faithfulness } from './types';
import type { JudgedItem } from './items';

type Count<K extends string> = Record<K | 'error', number>;

export function runSummary(items: JudgedItem[]) {
  const correctness = Object.fromEntries([...CORRECTNESS, 'error'].map((k) => [k, 0])) as Count<Correctness>;
  const faithfulness = Object.fromEntries([...FAITHFULNESS, 'error'].map((k) => [k, 0])) as Count<Faithfulness>;
  const answerableYes = Object.fromEntries([...CORRECTNESS, 'error'].map((k) => [k, 0])) as Count<Correctness>;
  const premise = { handled: 0, notHandled: 0, n: 0 };
  let costUsd = 0;
  for (const it of items) {
    const v = it.result?.verdict;
    costUsd += it.result?.costUsd ?? 0;
    correctness[v?.correctness ?? 'error']++;
    faithfulness[v?.faithfulness ?? 'error']++;
    if (it.answerable === 'yes') answerableYes[v?.correctness ?? 'error']++;
    else {
      premise.n++;
      if (v?.premise === 'handled') premise.handled++;
      else premise.notHandled++;
    }
  }
  return { n: items.length, correctness, answerableYes, faithfulness, premise, judgeCostUsd: Number(costUsd.toFixed(4)) };
}

export interface VerdictChange {
  id: string;
  a: { correctness?: Correctness; faithfulness?: Faithfulness };
  b: { correctness?: Correctness; faithfulness?: Faithfulness };
}

/** Questions whose verdict differs between run a and run b (matched by question id). */
export function changes(a: JudgedItem[], b: JudgedItem[]) {
  const bById = new Map(b.map((x) => [x.id, x]));
  const correctness: VerdictChange[] = [];
  const faithfulness: VerdictChange[] = [];
  let n = 0;
  for (const x of a) {
    const y = bById.get(x.id);
    if (!y) continue;
    n++;
    const va = x.result?.verdict;
    const vb = y.result?.verdict;
    const ch: VerdictChange = { id: x.id, a: { correctness: va?.correctness, faithfulness: va?.faithfulness }, b: { correctness: vb?.correctness, faithfulness: vb?.faithfulness } };
    if (va?.correctness !== vb?.correctness) correctness.push(ch);
    if (va?.faithfulness !== vb?.faithfulness) faithfulness.push(ch);
  }
  return { n, correctness, faithfulness };
}
