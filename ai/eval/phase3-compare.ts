/**
 * npm run ai:phase3-compare
 * Phase 3 report (local models, owner 16 Nov 2026), from the result files only:
 *   3.1 speed at full power: Qwen A at 420 W (one run) next to Qwen A1 and A2 of step 1.11 at 250 W;
 *   3.2 prompt P on the saved variant B lists (two runs) against B1, B2 (1.11) and P1, P2 (1.12);
 *   3.3 Gemma 4 26B-A4B with prompt P on variant A (two runs) against its single 1.11 run.
 * Box figures (power, temperature, VRAM) come from CC-Win's per-second log on the box, copied per run into
 * ai/eval/results/2026-11-16-box-log-phase3.json. A section is written only when its files exist.
 * Writes ai/eval/results/2026-11-16-phase3-compare-golden-v1-4.{json,md}.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { citationCounts, costAndLatency, localStats, type AnswerRecord } from '../answer/measures';
import type { JudgedItem } from '../judge/items';
import { changes, runSummary } from '../judge/measures';
import { LOCAL_RUNS, PHASE3_RUNS, RESULTS, SETS, TUNING_RUNS } from './judge';

const OUT = `${RESULTS}/2026-11-16-phase3-compare-golden-v1-4`;
export const BOX_LOG = `${RESULTS}/2026-11-16-box-log-phase3.json`;
const SPEED_FILE = `${RESULTS}/2026-11-16-answers-k10-local-a-420w-golden-v1-4.json`;

interface Answers {
  generator: string;
  generatorSettings?: { numCtx?: number; sampling?: Record<string, number>; systemName?: string };
  injectionProbe?: { obeyed: boolean };
  perQuestion: AnswerRecord[];
}
interface Col {
  run: string;
  label: string;
  answers: Answers;
  judged: JudgedItem[] | null;
}
interface BoxRun {
  run: string;
  startUtc: string;
  endUtc: string;
  peakPowerW: number;
  avgPowerW: number;
  maxTempC: number;
  peakVramMiB: number;
  alerts: string;
}

const load = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const judgedOf = (file: string, run: string): JudgedItem[] | null => (existsSync(file) ? (load(file) as { items: JudgedItem[] }).items.filter((x) => x.run === run) : null);
const fileOf = (run: string) => [...LOCAL_RUNS, ...TUNING_RUNS, ...PHASE3_RUNS].find((r) => r.run === run)!.file;

/** Distance between two value ranges (0 when they overlap) against the wider of their own widths (step 1.12 rule). */
export function beyond(a: number[], b: number[]) {
  const gap = Math.max(0, Math.min(...b) - Math.max(...a), Math.min(...a) - Math.max(...b));
  const width = Math.max(Math.max(...a) - Math.min(...a), Math.max(...b) - Math.min(...b));
  return { gap, width, exceeds: gap > width };
}

const tps = (c: Col) => localStats(c.answers.perQuestion)?.tokensPerSecondMedian ?? 0;
const lat = (c: Col) => costAndLatency(c.answers.perQuestion);
const unverified = (c: Col) => {
  const k = citationCounts(c.answers.perQuestion);
  return k.notFound + k.unknownChunk;
};
const rate = (c: Col) => unverified(c) / Math.max(1, citationCounts(c.answers.perQuestion).total);
const correct = (c: Col) => runSummary(c.judged!).correctness.correct;
const incorrect = (c: Col) => runSummary(c.judged!).correctness.incorrect;

const ROWS: Array<[string, (c: Col) => string]> = [
  ['valid structured outputs', (c) => `${c.answers.perQuestion.filter((r) => r.coverage !== 'error').length}/${c.answers.perQuestion.length}`],
  ['answers that needed the retry', (c) => String(localStats(c.answers.perQuestion)?.answersRetried ?? 'n/a')],
  ['citations verified', (c) => `${citationCounts(c.answers.perQuestion).ok}/${citationCounts(c.answers.perQuestion).total}`],
  ['quotes over 40 words', (c) => String(citationCounts(c.answers.perQuestion).tooLong)],
  ['unanswerable labelled `none`', (c) => { const no = c.answers.perQuestion.filter((r) => r.answerable === 'no'); return `${no.filter((r) => r.coverage === 'none').length}/${no.length}`; }],
  ['judge: correct / partially / incorrect', (c) => { if (!c.judged) return 'not judged'; const s = runSummary(c.judged).correctness; return `${s.correct} / ${s.partially_correct} / ${s.incorrect}`; }],
  ['judge: supported / partly / unsupported', (c) => { if (!c.judged) return 'not judged'; const s = runSummary(c.judged).faithfulness; return `${s.supported} / ${s.partly_supported} / ${s.unsupported}`; }],
  ['judge: premise handled (partial + no)', (c) => { if (!c.judged) return 'not judged'; const p = runSummary(c.judged).premise; return `${p.handled}/${p.n}`; }],
  ['latency median / p95 (s)', (c) => `${((lat(c).msMedian ?? 0) / 1000).toFixed(1)} / ${((lat(c).msP95 ?? 0) / 1000).toFixed(1)}`],
  ['decode tokens per second, median', (c) => String(tps(c))],
  ['generated tokens per answer, median', (c) => { const o = c.answers.perQuestion.map((r) => r.usage.output).sort((x, y) => x - y); return String(o[Math.floor(o.length / 2)]); }],
  ['num_ctx', (c) => String(c.answers.generatorSettings?.numCtx ?? 'n/a')],
  ['system prompt', (c) => c.answers.generatorSettings?.systemName?.split(' ')[0] ?? 'ANSWER_SYSTEM'],
];

function table(out: string[], cols: Col[], rows = ROWS) {
  out.push(`| measure | ${cols.map((c) => c.label).join(' | ')} |`, `|---|${cols.map(() => '---').join('|')}|`);
  for (const [n, f] of rows) out.push(`| ${n} | ${cols.map(f).join(' | ')} |`);
  out.push('', 'Generator per column:', '', ...cols.map((c) => `- ${c.label}: \`${c.answers.generator}\``), '');
}

/** Two runs against two runs: citations and judged correctness, each against the wider spread (step 1.12 rule). */
function pairCompare(a: Col[], b: Col[]) {
  const cross = a.flatMap((x) => b.map((y) => changes(x.judged!, y.judged!).correctness));
  const rank = (c?: string) => (c === 'correct' ? 2 : c === 'partially_correct' ? 1 : 0);
  return {
    unverified: { a: a.map((c) => `${unverified(c)}/${citationCounts(c.answers.perQuestion).total}`), b: b.map((c) => `${unverified(c)}/${citationCounts(c.answers.perQuestion).total}`), rate: beyond(a.map(rate), b.map(rate)) },
    correct: { a: a.map(correct), b: b.map(correct), range: beyond(a.map(correct), b.map(correct)) },
    incorrect: { a: a.map(incorrect), b: b.map(incorrect), range: beyond(a.map(incorrect), b.map(incorrect)) },
    perQuestion: {
      spreadA: changes(a[0].judged!, a[1].judged!).correctness.length,
      spreadB: changes(b[0].judged!, b[1].judged!).correctness.length,
      cross: cross.map((c) => c.length),
      up: cross.reduce((s, ch) => s + ch.filter((x) => rank(x.b.correctness) > rank(x.a.correctness)).length, 0),
      down: cross.reduce((s, ch) => s + ch.filter((x) => rank(x.b.correctness) < rank(x.a.correctness)).length, 0),
    },
  };
}

function pairLines(out: string[], name: string, r: ReturnType<typeof pairCompare>) {
  const ex = (x: { gap: number; width: number; exceeds: boolean }, d = 0) => `gap ${x.gap.toFixed(d)} vs spread ${x.width.toFixed(d)}, ${x.exceeds ? 'EXCEEDS the spread' : 'within the spread'}`;
  out.push(`### ${name}`, '');
  out.push(`- Unverified quotes ${r.unverified.b.join(' and ')} against ${r.unverified.a.join(' and ')}; rate ${ex(r.unverified.rate, 3)}.`);
  out.push(`- Correct ${r.correct.b.join(' and ')} against ${r.correct.a.join(' and ')}: ${ex(r.correct.range)}. Incorrect ${r.incorrect.b.join(' and ')} against ${r.incorrect.a.join(' and ')}: ${ex(r.incorrect.range)}.`);
  out.push(`- Per question: spreads ${r.perQuestion.spreadA} and ${r.perQuestion.spreadB}; changes between the pairs ${r.perQuestion.cross.join(', ')} (${r.perQuestion.up} up, ${r.perQuestion.down} down over the four pairs).`, '');
}

function main() {
  const jLocal = SETS.local.judged;
  const jTune = SETS.tuning.judged;
  const jP3 = SETS.phase3.judged;
  const col = (run: string, label: string, judgedFile: string | null): Col | null => {
    const f = fileOf(run);
    if (!existsSync(f)) return null;
    return { run, label, answers: load(f), judged: judgedFile ? judgedOf(judgedFile, run) : null };
  };
  const box: BoxRun[] = existsSync(BOX_LOG) ? (load(BOX_LOG) as { runs: BoxRun[] }).runs : [];
  const out = ['# Phase 3: local models', '', 'Golden set v1.4, k=10, the step 1.9 Opus judge blind to the generator. Phase 3 runs at the default 420 W power limit (no cap since 13 Nov); steps 1.11 and 1.12 ran at 250 W.', ''];
  const json: Record<string, unknown> = { date: '2026-11-16', goldenVersion: '1.4', box };

  // 3.1
  if (existsSync(SPEED_FILE)) {
    const cols: Col[] = [col('local-a1', 'Qwen A1, 250 W (1.11)', null)!, col('local-a2', 'Qwen A2, 250 W (1.11)', null)!, { run: 'local-a-420w', label: 'Qwen A, 420 W (3.1, single run)', answers: load(SPEED_FILE), judged: null }];
    out.push('## 3.1 Speed at full power', '', 'Same settings, same chunk lists; only the power limit differs. Single run at 420 W, not judged.', '');
    table(out, cols, ROWS.filter(([n]) => !n.startsWith('judge')));
    const b = box.find((x) => x.run === 'local-a-420w');
    if (b) out.push(`Box during the 420 W run (CC-Win per-second log, ${b.startUtc} to ${b.endUtc} UTC): peak power ${b.peakPowerW} W, average ${b.avgPowerW} W, max temperature ${b.maxTempC} C, peak VRAM ${b.peakVramMiB} MiB; alerts: ${b.alerts}.`, '');
    json.speed = cols.map((c) => ({ run: c.run, tokensPerSecondMedian: tps(c), msMedian: lat(c).msMedian, msP95: lat(c).msP95, local: localStats(c.answers.perQuestion) }));
  }

  // 3.2
  const pb = ['local-pb1', 'local-pb2'].map((r, i) => col(r, `Qwen P on B, run ${i + 1} (3.2)`, jP3));
  if (pb.every((c) => c && c.judged?.length === c.answers.perQuestion.length)) {
    const b = [col('local-b', 'Qwen B1 (1.11)', jLocal)!, col('local-b2', 'Qwen B2 (1.11)', jLocal)!];
    const p = [col('local-p1', 'Qwen P1 on A (1.12)', jTune)!, col('local-p2', 'Qwen P2 on A (1.12)', jTune)!];
    const runs = pb as Col[];
    out.push('## 3.2 Prompt P in the fully local pipeline', '', 'Variant B retrieval (meta-index plus rerank, no cloud step; the saved B lists of 1.11, identical in B1 and B2). B1 and B2 used the Sonnet prompt at 250 W; P1 and P2 used prompt P on the variant A lists at 250 W.', '');
    table(out, [...b, ...p, ...runs]);
    const vsB = pairCompare(b, runs);
    const vsP = pairCompare(p, runs);
    pairLines(out, 'P on B against B1 and B2 (only the prompt differs)', vsB);
    pairLines(out, 'P on B against P1 and P2 (only the retrieval differs)', vsP);
    json.step32 = { vsB, vsP };
  }

  // 3.3
  const gp = ['local-gemma-p1', 'local-gemma-p2'].map((r, i) => col(r, `Gemma P, run ${i + 1} (3.3)`, jP3));
  if (gp.every((c) => c && c.judged?.length === c.answers.perQuestion.length)) {
    const ga = col('local-gemma-a', 'Gemma A, single run (1.11)', jLocal)!;
    const runs = gp as Col[];
    out.push('## 3.3 Gemma 4 26B-A4B with prompt P', '', 'Variant A chunk lists. Gemma A (1.11) used the Sonnet prompt at 250 W and is a single run, so it has no spread of its own.', '');
    table(out, [ga, ...runs]);
    const spread = changes(runs[0].judged!, runs[1].judged!).correctness.length;
    const vsA = runs.map((r) => changes(ga.judged!, r.judged!).correctness.length);
    const inRange = (v: number, xs: number[]) => v >= Math.min(...xs) && v <= Math.max(...xs);
    out.push(`- Correct: Gemma A ${correct(ga)}; Gemma P ${runs.map(correct).join(' and ')} (P's own range ${Math.min(...runs.map(correct))} to ${Math.max(...runs.map(correct))}; Gemma A ${inRange(correct(ga), runs.map(correct)) ? 'inside' : 'outside'} it).`);
    out.push(`- Unverified quotes: Gemma A ${unverified(ga)}/${citationCounts(ga.answers.perQuestion).total}; Gemma P ${runs.map((r) => `${unverified(r)}/${citationCounts(r.answers.perQuestion).total}`).join(' and ')}.`);
    out.push(`- Per question: Gemma P run-to-run spread ${spread}; Gemma A against each P run ${vsA.join(' and ')} changes.`, '');
    json.step33 = { gemmaA: { correct: correct(ga), incorrect: incorrect(ga), unverified: unverified(ga) }, gemmaP: runs.map((r) => ({ correct: correct(r), incorrect: incorrect(r), unverified: unverified(r) })), spread, vsA };
  }

  for (const b of box) if (b.run !== 'local-a-420w') out.push(`Box during ${b.run} (${b.startUtc} to ${b.endUtc} UTC): peak ${b.peakPowerW} W, average ${b.avgPowerW} W, max ${b.maxTempC} C, peak VRAM ${b.peakVramMiB} MiB; alerts: ${b.alerts}.`);
  writeFileSync(`${OUT}.json`, JSON.stringify(json, null, 2) + '\n');
  writeFileSync(`${OUT}.md`, out.join('\n') + '\n');
  console.log(`Wrote ${OUT}.{json,md}`);
}

if (require.main === module) main();
