/**
 * npm run ai:local-compare
 * Step 1.11 report: Sonnet 5.5 at k=10 (step 1.8 answers, step 1.9 verdicts) against the local runs (A run 1, A run 2,
 * B, A with thinking), all judged by the same blind Opus judge. Numbers come only from the result files.
 * Writes ai/eval/results/2026-11-11-local-compare-golden-v1-4.{json,md}.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { citationCounts, costAndLatency, localStats, type AnswerRecord } from '../answer/measures';
import type { JudgedItem } from '../judge/items';
import { changes, runSummary } from '../judge/measures';
import { JUDGED, LOCAL_RUNS, RESULTS, SETS } from './judge';

const OUT = `${RESULTS}/2026-11-11-local-compare-golden-v1-4`;

interface Column {
  run: string;
  label: string;
  answers: { generator: string; retrieval: string; generatorSettings?: unknown; box?: { gpuPowerLimitW: number }; vram?: unknown; templateOverhead?: number; injectionProbe: { obeyed: boolean }; perQuestion: AnswerRecord[] };
  judged: JudgedItem[];
}

function main() {
  const judged19 = (JSON.parse(readFileSync(JUDGED, 'utf8')) as { items: JudgedItem[] }).items;
  const judgedLocal = (JSON.parse(readFileSync(SETS.local.judged, 'utf8')) as { items: JudgedItem[] }).items;
  const cols: Column[] = [
    { run: 'k10', label: 'Sonnet 5.5, k=10', answers: JSON.parse(readFileSync(`${RESULTS}/2026-11-10-answers-k10-golden-v1-4.json`, 'utf8')), judged: judged19.filter((x) => x.run === 'k10') },
  ];
  const labels: Record<string, string> = { 'local-a1': 'local A, run 1', 'local-a2': 'local A, run 2', 'local-b': 'local B, run 1 (fully local)', 'local-a-think': 'local A, thinking', 'local-b2': 'local B, run 2', 'local-gemma-a': 'Gemma 4 26B-A4B, A' };
  for (const { run, file } of LOCAL_RUNS)
    if (existsSync(file)) cols.push({ run, label: labels[run], answers: JSON.parse(readFileSync(file, 'utf8')), judged: judgedLocal.filter((x) => x.run === run) });
  for (const c of cols) {
    const missing = c.judged.filter((x) => !x.result?.verdict).length;
    if (c.judged.length !== c.answers.perQuestion.length || missing) throw new Error(`${c.run}: ${c.judged.length} judged of ${c.answers.perQuestion.length}, ${missing} without verdict`);
  }

  const rows: Array<[string, (c: Column) => string]> = [
    ['valid structured outputs', (c) => `${c.answers.perQuestion.filter((r) => r.coverage !== 'error').length}/${c.answers.perQuestion.length}`],
    ['answers that needed the retry', (c) => (localStats(c.answers.perQuestion) ? String(localStats(c.answers.perQuestion)!.answersRetried) : 'n/a')],
    ['citations verified', (c) => `${citationCounts(c.answers.perQuestion).ok}/${citationCounts(c.answers.perQuestion).total}`],
    ['quotes over 40 words', (c) => String(citationCounts(c.answers.perQuestion).tooLong)],
    ['unanswerable labelled `none`', (c) => { const no = c.answers.perQuestion.filter((r) => r.answerable === 'no'); return `${no.filter((r) => r.coverage === 'none').length}/${no.length}`; }],
    ['judge: correct / partially / incorrect', (c) => { const s = runSummary(c.judged).correctness; return `${s.correct} / ${s.partially_correct} / ${s.incorrect}`; }],
    ['judge: supported / partly / unsupported', (c) => { const s = runSummary(c.judged).faithfulness; return `${s.supported} / ${s.partly_supported} / ${s.unsupported}`; }],
    ['judge: premise handled (partial + no)', (c) => { const p = runSummary(c.judged).premise; return `${p.handled}/${p.n}`; }],
    ['injection probe', (c) => (c.answers.injectionProbe.obeyed ? 'FAILED' : 'passed')],
    ['latency median / p95 (s)', (c) => { const k = costAndLatency(c.answers.perQuestion); return `${((k.msMedian ?? 0) / 1000).toFixed(1)} / ${((k.msP95 ?? 0) / 1000).toFixed(1)}`; }],
    ['decode tokens per second, median', (c) => String(localStats(c.answers.perQuestion)?.tokensPerSecondMedian ?? 'n/a (not reported by the API)')],
    ['generated tokens per answer, median', (c) => { const o = c.answers.perQuestion.map((r) => r.usage.output).sort((x, y) => x - y); return String(o[Math.floor(o.length / 2)]); }],
    ['thinking tokens per answer, median / max', (c) => { const l = localStats(c.answers.perQuestion); return l && l.thinkingTokensMax > 0 ? `${l.thinkingTokensMedian} / ${l.thinkingTokensMax}` : '0'; }],
    ['API cost', (c) => `$${costAndLatency(c.answers.perQuestion).costUsd}`],
    ['GPU power limit', (c) => (c.answers.box ? `${c.answers.box.gpuPowerLimitW} W` : 'n/a (cloud)')],
  ];

  const byRun = new Map(cols.map((c) => [c.run, c]));
  const pair = (a: string, b: string) => (byRun.has(a) && byRun.has(b) ? changes(byRun.get(a)!.judged, byRun.get(b)!.judged) : null);
  const spread = pair('local-a1', 'local-a2');
  const spreadB = pair('local-b', 'local-b2');
  const comparisons = Object.fromEntries(
    [
      ['k10', 'local-a1'],
      ['k10', 'local-a2'],
      ['local-a1', 'local-b'],
      ['local-a2', 'local-b'],
      ['local-a1', 'local-a-think'],
      ['local-a2', 'local-a-think'],
      ['local-a1', 'local-b2'],
      ['local-a2', 'local-b2'],
      ['k10', 'local-gemma-a'],
      ['local-a1', 'local-gemma-a'],
      ['local-a2', 'local-gemma-a'],
    ]
      .map(([a, b]) => [`${a} vs ${b}`, pair(a, b)] as const)
      .filter(([, v]) => v),
  );
  const counts = Object.fromEntries(cols.map((c) => [c.run, runSummary(c.judged)]));

  writeFileSync(`${OUT}.json`, JSON.stringify({ date: '2026-11-11', goldenVersion: '1.4', columns: cols.map((c) => ({ run: c.run, label: c.label, generator: c.answers.generator, retrieval: c.answers.retrieval, generatorSettings: c.answers.generatorSettings ?? null, box: c.answers.box ?? null, vram: c.answers.vram ?? null, templateOverhead: c.answers.templateOverhead ?? null, local: localStats(c.answers.perQuestion) })), counts, spread, spreadB, comparisons }, null, 2) + '\n');

  const out = ['# Local generator against Sonnet 5.5 (step 1.11)', '', 'Golden set v1.4, k=10 chunks. All answers judged by the step 1.9 Opus 5.5 judge, blind to the generator.', ''];
  out.push(`| measure | ${cols.map((c) => c.label).join(' | ')} |`, `|---|${cols.map(() => '---').join('|')}|`);
  for (const [name, f] of rows) out.push(`| ${name} | ${cols.map(f).join(' | ')} |`);
  out.push('', 'Retrieval per column:', '', ...cols.map((c) => `- ${c.label}: \`${c.answers.retrieval}\``), '');
  out.push('Generator per column:', '', ...cols.map((c) => `- ${c.label}: \`${c.answers.generator}\``), '');
  if (spread) {
    out.push('## Run-to-run spread (local A run 1 vs run 2, same chunks and settings)', '', `Correctness changed on ${spread.correctness.length} of ${spread.n} questions, faithfulness on ${spread.faithfulness.length}.`, '');
    for (const x of spread.correctness) out.push(`- ${x.id}: correctness ${x.a.correctness} -> ${x.b.correctness}`);
    for (const x of spread.faithfulness) out.push(`- ${x.id}: faithfulness ${x.a.faithfulness} -> ${x.b.faithfulness}`);
  }
  if (spreadB) {
    out.push('', '## Run-to-run spread (local B run 1 vs run 2, same chunks and settings)', '', `Correctness changed on ${spreadB.correctness.length} of ${spreadB.n} questions, faithfulness on ${spreadB.faithfulness.length}.`, '');
    for (const x of spreadB.correctness) out.push(`- ${x.id}: correctness ${x.a.correctness} -> ${x.b.correctness}`);
    for (const x of spreadB.faithfulness) out.push(`- ${x.id}: faithfulness ${x.a.faithfulness} -> ${x.b.faithfulness}`);
  }
  for (const [name, c] of Object.entries(comparisons)) {
    if (!c) continue;
    out.push('', `## ${name}`, '', `Correctness changed on ${c.correctness.length} of ${c.n} questions, faithfulness on ${c.faithfulness.length}.`, '');
    for (const x of c.correctness) out.push(`- ${x.id}: correctness ${x.a.correctness} -> ${x.b.correctness}`);
    for (const x of c.faithfulness) out.push(`- ${x.id}: faithfulness ${x.a.faithfulness} -> ${x.b.faithfulness}`);
  }
  writeFileSync(`${OUT}.md`, out.join('\n') + '\n');
  console.log(`Wrote ${OUT}.{json,md}`);
}

main();
