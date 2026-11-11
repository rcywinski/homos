/**
 * npm run ai:tuning-compare
 * Step 1.12 report: Sonnet k=10, Qwen A runs 1 and 2 (the 1.11 baseline), then the tuning variants S (sampling),
 * P (quoting prompt) and L (citation by reference), two runs each, all judged by the same blind Opus judge.
 * For each variant: does it differ from the baseline by more than the spread, for citations and for judged
 * correctness separately. Numbers come only from the result files.
 * Writes ai/eval/results/2026-11-11-tuning-compare-golden-v1-4.{json,md}.
 */
import { readFileSync, writeFileSync } from 'fs';
import { citationCounts, costAndLatency, localStats, type AnswerRecord } from '../answer/measures';
import type { JudgedItem } from '../judge/items';
import { changes, runSummary } from '../judge/measures';
import { JUDGED, LOCAL_RUNS, RESULTS, SETS, TUNING_RUNS } from './judge';

const OUT = `${RESULTS}/2026-11-11-tuning-compare-golden-v1-4`;

interface Col {
  run: string;
  label: string;
  answers: { generator: string; generatorSettings?: { citeMode?: string; numCtx?: number; sampling?: Record<string, number> }; perQuestion: AnswerRecord[] };
  judged: JudgedItem[];
}

const load = (file: string) => JSON.parse(readFileSync(file, 'utf8'));

function main() {
  const j19 = (load(JUDGED) as { items: JudgedItem[] }).items;
  const jLocal = (load(SETS.local.judged) as { items: JudgedItem[] }).items;
  const jTune = (load(SETS.tuning.judged) as { items: JudgedItem[] }).items;
  const fileOf = (run: string) => [...LOCAL_RUNS, ...TUNING_RUNS].find((r) => r.run === run)!.file;
  const cols: Col[] = [
    { run: 'k10', label: 'Sonnet 5.5', answers: load(`${RESULTS}/2026-11-10-answers-k10-golden-v1-4.json`), judged: j19.filter((x) => x.run === 'k10') },
    ...['local-a1', 'local-a2'].map((run, i) => ({ run, label: `Qwen A${i + 1} (1.11)`, answers: load(fileOf(run)), judged: jLocal.filter((x) => x.run === run) })),
    ...TUNING_RUNS.map(({ run }) => ({ run, label: run.replace('local-', '').toUpperCase(), answers: load(fileOf(run)), judged: jTune.filter((x) => x.run === run) })),
  ];
  for (const c of cols) if (c.judged.length !== c.answers.perQuestion.length || c.judged.some((x) => !x.result?.verdict)) throw new Error(`${c.run}: not fully judged`);

  const isRef = (c: Col) => c.answers.generatorSettings?.citeMode === 'ref';
  const unverified = (c: Col) => { const k = citationCounts(c.answers.perQuestion); return k.notFound + k.unknownChunk; };
  const ref = (c: Col) => localStats(c.answers.perQuestion)?.refStats ?? null;
  const rows: Array<[string, (c: Col) => string]> = [
    ['valid structured outputs', (c) => `${c.answers.perQuestion.filter((r) => r.coverage !== 'error').length}/${c.answers.perQuestion.length}`],
    ['answers that needed the retry', (c) => String(localStats(c.answers.perQuestion)?.answersRetried ?? 'n/a')],
    ['citations verified', (c) => (isRef(c) ? 'n/a (by construction)' : `${citationCounts(c.answers.perQuestion).ok}/${citationCounts(c.answers.perQuestion).total}`)],
    ['valid references (L only)', (c) => { const r = ref(c); return r ? `${r.valid}/${r.refs}` : 'n/a'; }],
    ['references outside the given chunks / invalid ranges', (c) => { const r = ref(c); return r ? `${r.outside} / ${r.invalidRange}` : 'n/a'; }],
    ['quotes over 40 words', (c) => { const r = ref(c); return r ? `${r.overLong} (extracted)` : String(citationCounts(c.answers.perQuestion).tooLong); }],
    ['unanswerable labelled `none`', (c) => { const no = c.answers.perQuestion.filter((r) => r.answerable === 'no'); return `${no.filter((r) => r.coverage === 'none').length}/${no.length}`; }],
    ['judge: correct / partially / incorrect', (c) => { const s = runSummary(c.judged).correctness; return `${s.correct} / ${s.partially_correct} / ${s.incorrect}`; }],
    ['judge: supported / partly / unsupported', (c) => { const s = runSummary(c.judged).faithfulness; return `${s.supported} / ${s.partly_supported} / ${s.unsupported}`; }],
    ['judge: premise handled (partial + no)', (c) => { const p = runSummary(c.judged).premise; return `${p.handled}/${p.n}`; }],
    ['latency median / p95 (s)', (c) => { const k = costAndLatency(c.answers.perQuestion); return `${((k.msMedian ?? 0) / 1000).toFixed(1)} / ${((k.msP95 ?? 0) / 1000).toFixed(1)}`; }],
    ['decode tokens per second, median', (c) => String(localStats(c.answers.perQuestion)?.tokensPerSecondMedian ?? 'n/a')],
    ['generated tokens per answer, median', (c) => { const o = c.answers.perQuestion.map((r) => r.usage.output).sort((x, y) => x - y); return String(o[Math.floor(o.length / 2)]); }],
    ['num_ctx', (c) => String(c.answers.generatorSettings?.numCtx ?? 'n/a')],
    ['presence penalty', (c) => String(c.answers.generatorSettings?.sampling?.presence_penalty ?? 'n/a')],
    ['API cost', (c) => `$${costAndLatency(c.answers.perQuestion).costUsd}`],
  ];

  const by = new Map(cols.map((c) => [c.run, c]));
  const base = [by.get('local-a1')!, by.get('local-a2')!];
  const rate = (c: Col) => unverified(c) / Math.max(1, citationCounts(c.answers.perQuestion).total);
  const correct = (c: Col) => runSummary(c.judged).correctness.correct;
  const incorrect = (c: Col) => runSummary(c.judged).correctness.incorrect;
  /** Distance between two two-run ranges (0 when they overlap) against the larger of their own widths. */
  const beyond = (a: number[], b: number[]) => {
    const gap = Math.max(0, Math.min(...b) - Math.max(...a), Math.min(...a) - Math.max(...b));
    const width = Math.max(Math.max(...a) - Math.min(...a), Math.max(...b) - Math.min(...b));
    return { gap, width, exceeds: gap > width };
  };
  const variants = ['s', 'p', 'l'].map((v) => {
    const runs = [by.get(`local-${v}1`)!, by.get(`local-${v}2`)!];
    const within = changes(runs[0].judged, runs[1].judged).correctness.length;
    const cross = base.flatMap((b) => runs.map((r) => changes(b.judged, r.judged).correctness));
    const up = cross.reduce((s, ch) => s + ch.filter((x) => rank(x.b.correctness) > rank(x.a.correctness)).length, 0);
    const down = cross.reduce((s, ch) => s + ch.filter((x) => rank(x.b.correctness) < rank(x.a.correctness)).length, 0);
    return {
      variant: v.toUpperCase(),
      citations: isRef(runs[0])
        ? { note: 'citation by reference: verified by construction, not comparable', validRefs: runs.map((r) => ref(r)) }
        : { unverified: runs.map(unverified), totals: runs.map((r) => citationCounts(r.answers.perQuestion).total), baselineUnverified: base.map(unverified), baselineTotals: base.map((b) => citationCounts(b.answers.perQuestion).total), rate: beyond(base.map(rate), runs.map(rate)) },
      correctness: {
        correct: runs.map(correct), baselineCorrect: base.map(correct), correctRange: beyond(base.map(correct), runs.map(correct)),
        incorrect: runs.map(incorrect), baselineIncorrect: base.map(incorrect), incorrectRange: beyond(base.map(incorrect), runs.map(incorrect)),
        perQuestion: { baselineSpread: changes(base[0].judged, base[1].judged).correctness.length, variantSpread: within, crossChanges: cross.map((c) => c.length), crossUp: up, crossDown: down },
      },
    };
  });

  writeFileSync(`${OUT}.json`, JSON.stringify({ date: '2026-11-11', goldenVersion: '1.4', columns: cols.map((c) => ({ run: c.run, generator: c.answers.generator, settings: c.answers.generatorSettings ?? null, local: localStats(c.answers.perQuestion) })), variants }, null, 2) + '\n');
  const out = ['# Local generator tuning (step 1.12)', '', 'Golden set v1.4, variant A chunk lists (k=10), qwen3.8:27b, thinking off, 250 W. All answers judged by the step 1.9 Opus judge, blind to the generator.', ''];
  out.push(`| measure | ${cols.map((c) => c.label).join(' | ')} |`, `|---|${cols.map(() => '---').join('|')}|`);
  for (const [n, f] of rows) out.push(`| ${n} | ${cols.map(f).join(' | ')} |`);
  out.push('', 'Generator per column:', '', ...cols.map((c) => `- ${c.label}: \`${c.answers.generator}\``), '');
  out.push('## Against the 1.11 baseline (Qwen A runs 1 and 2)', '');
  out.push('A range "exceeds" when the gap between the baseline\'s two runs and the variant\'s two runs is larger than the wider of the two spreads.', '');
  for (const v of variants) {
    out.push(`### ${v.variant}`, '');
    const c = v.citations as { unverified?: number[]; totals?: number[]; baselineUnverified?: number[]; baselineTotals?: number[]; rate?: { gap: number; width: number; exceeds: boolean }; note?: string; validRefs?: unknown };
    if (c.note) out.push(`- Citations: ${c.note}; valid references ${JSON.stringify(c.validRefs)}.`);
    else out.push(`- Citations: unverified ${c.unverified![0]}/${c.totals![0]} and ${c.unverified![1]}/${c.totals![1]} against baseline ${c.baselineUnverified![0]}/${c.baselineTotals![0]} and ${c.baselineUnverified![1]}/${c.baselineTotals![1]}; unverified-rate gap ${c.rate!.gap.toFixed(3)} vs spread ${c.rate!.width.toFixed(3)}: ${c.rate!.exceeds ? 'EXCEEDS the spread' : 'within the spread'}.`);
    const k = v.correctness;
    out.push(`- Correct answers ${k.correct.join(' and ')} against ${k.baselineCorrect.join(' and ')}: gap ${k.correctRange.gap} vs spread ${k.correctRange.width}, ${k.correctRange.exceeds ? 'EXCEEDS' : 'within'}. Incorrect ${k.incorrect.join(' and ')} against ${k.baselineIncorrect.join(' and ')}: gap ${k.incorrectRange.gap} vs spread ${k.incorrectRange.width}, ${k.incorrectRange.exceeds ? 'EXCEEDS' : 'within'}.`);
    out.push(`- Per question: baseline spread ${k.perQuestion.baselineSpread}, variant spread ${k.perQuestion.variantSpread}, baseline-to-variant changes ${k.perQuestion.crossChanges.join(', ')} (${k.perQuestion.crossUp} up, ${k.perQuestion.crossDown} down over the four pairs).`, '');
  }
  writeFileSync(`${OUT}.md`, out.join('\n') + '\n');
  console.log(`Wrote ${OUT}.{json,md}`);
}

const rank = (c?: string) => (c === 'correct' ? 2 : c === 'partially_correct' ? 1 : 0);

main();
