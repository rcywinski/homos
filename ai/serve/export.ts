/**
 * Showcase data export (phase 4, step 4.1): static JSON for the comparison and archive views, built only from
 * committed files. No model and no network call. Output goes to `showcase/public/data/` (generated, gitignored).
 *
 * CLI: `ai/serve/export-cli.ts` (npm run showcase:data).
 */
import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import type { AnswerRecord } from '../answer/measures';
import type { GoldenQuestion } from '../eval/golden';
import type { JudgedItem } from '../judge/items';
import type { Verdict } from '../judge/types';
import { COMPARISON, type ConfigSource } from './comparison';
import { maskNetwork } from './mask';
import { markNumbers } from './numbers';
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import type {
  ComparisonData,
  ReportsData,
  ShowcaseAnswer,
  ShowcaseCitation,
  ShowcaseConfig,
  ShowcaseQuestion,
  ShowcaseRun,
  ShowcaseVerdict,
} from './showcase-data';

export const GOLDEN_FILE = 'ai/eval/golden.jsonl';
export const GOLDEN_META = 'ai/eval/golden-meta.json';
export const REPORTS_DIR = 'journal/reports';
export const OUT_DIR = 'showcase/public/data';

interface AnswersFile {
  label: string;
  date: string;
  goldenVersion: string;
  generator: string;
  retrieval: string;
  perQuestion: AnswerRecord[];
}

interface JudgedFile {
  goldenVersion: string;
  judge: string;
  runs: { run: string; file: string }[];
  items: JudgedItem[];
}

/** Reads files relative to a root and remembers their hashes, so the output says exactly what it was built from. */
class Reader {
  readonly hashes = new Map<string, string>();
  constructor(private readonly root: string) {}
  text(file: string): string {
    // CRLF normalised first, so a Windows checkout gives the same hashes and the same text as the Mac.
    const content = readFileSync(path.join(this.root, file), 'utf8').replace(/\r\n/g, '\n');
    this.hashes.set(file, createHash('sha256').update(content).digest('hex').slice(0, 16));
    return content;
  }
  json<T>(file: string): T {
    return JSON.parse(this.text(file)) as T;
  }
  sources() {
    return [...this.hashes].sort(([a], [b]) => a.localeCompare(b)).map(([file, sha256]) => ({ file, sha256 }));
  }
}

function citation(c: AnswerRecord['citations'][number]): ShowcaseCitation {
  const verified = c.status === 'ok';
  return {
    chunkId: c.chunkId,
    file: c.file ?? c.chunkId.split(':')[0],
    lines: c.lines ?? null,
    quote: maskNetwork(c.quote),
    status: verified ? 'verified' : 'not-verified',
    ...(verified ? {} : { reason: c.status === 'unknown-chunk' ? ('unknown-chunk' as const) : ('not-in-chunk' as const) }),
    tooLong: c.tooLong,
  };
}

function verdict(v: Verdict): ShowcaseVerdict {
  return {
    correctness: v.correctness,
    correctnessReason: maskNetwork(v.correctnessReason),
    faithfulness: v.faithfulness,
    faithfulnessReason: maskNetwork(v.faithfulnessReason),
    premise: v.premise,
    premiseReason: maskNetwork(v.premiseReason),
  };
}

function answer(rec: AnswerRecord, judged: JudgedItem | undefined, corpus: Map<string, Chunk>): ShowcaseAnswer {
  const coverage = rec.coverage === 'error' ? null : rec.coverage;
  const failed = coverage === null;
  const text = failed ? '' : maskNetwork(rec.answer);
  const ok = rec.citations.filter((c) => c.status === 'ok');
  const cited = [...new Set(ok.map((c) => c.chunkId))].map((id) => corpus.get(id)?.text ?? '');
  return {
    outcome: failed ? 'failed' : 'answered',
    coverage,
    answer: text,
    citations: failed ? [] : rec.citations.map(citation),
    numbers: failed ? [] : markNumbers(text, ok.map((c) => c.quote), cited),
    verdict: judged?.result?.verdict ? verdict(judged.result.verdict) : null,
    ms: rec.ms,
    costUsd: rec.costUsd,
  };
}

function buildRun(read: Reader, src: ConfigSource['runs'][number], goldenVersion: string, ids: string[], corpus: Map<string, Chunk>): ShowcaseRun {
  const a = read.json<AnswersFile>(src.answersFile);
  const j = read.json<JudgedFile>(src.judgedFile);
  if (a.goldenVersion !== goldenVersion) throw new Error(`${src.answersFile}: golden ${a.goldenVersion}, expected ${goldenVersion}`);
  if (j.goldenVersion !== goldenVersion) throw new Error(`${src.judgedFile}: golden ${j.goldenVersion}, expected ${goldenVersion}`);
  const listed = j.runs.find((r) => r.run === src.run);
  if (!listed) throw new Error(`${src.judgedFile} has no run ${src.run}`);
  if (listed.file !== src.answersFile) throw new Error(`${src.judgedFile}: run ${src.run} is ${listed.file}, not ${src.answersFile}`);
  const judged = new Map(j.items.filter((i) => i.run === src.run).map((i) => [i.id, i]));
  const byId = new Map(a.perQuestion.map((r) => [r.id, r]));
  const answers: Record<string, ShowcaseAnswer> = {};
  const summary = { correct: 0, partiallyCorrect: 0, incorrect: 0, quotes: 0, quotesNotVerified: 0, failed: 0 };
  for (const id of ids) {
    const rec = byId.get(id);
    if (!rec) throw new Error(`${src.answersFile}: no answer for ${id}`);
    const ans = answer(rec, judged.get(id), corpus);
    answers[id] = ans;
    if (ans.outcome === 'failed') summary.failed++;
    summary.quotes += ans.citations.length;
    summary.quotesNotVerified += ans.citations.filter((c) => c.status !== 'verified').length;
    const c = ans.verdict?.correctness;
    if (c === 'correct') summary.correct++;
    else if (c === 'partially_correct') summary.partiallyCorrect++;
    else if (c === 'incorrect') summary.incorrect++;
  }
  return {
    run: src.run,
    date: a.date,
    generator: a.generator,
    retrieval: a.retrieval,
    judge: j.judge,
    sourceFile: src.answersFile,
    summary,
    answers,
  };
}

export function buildComparison(root = process.cwd(), configs: ConfigSource[] = COMPARISON): ComparisonData {
  const read = new Reader(root);
  const goldenVersion = read.json<{ version: string }>(GOLDEN_META).version;
  const golden = read
    .text(GOLDEN_FILE)
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenQuestion);
  const questions: ShowcaseQuestion[] = golden.map((q) => ({
    id: q.id,
    category: q.category,
    question: maskNetwork(q.question),
    answerable: q.answerable,
    reference: maskNetwork(q.reference),
  }));
  const ids = questions.map((q) => q.id);
  const corpus = new Map(loadCorpus(root).map((c) => [c.id, c]));
  const out: ShowcaseConfig[] = configs.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    group: c.group,
    served: c.served,
    engine: c.engine,
    single: c.runs.length === 1,
    runs: c.runs.map((r) => buildRun(read, r, goldenVersion, ids, corpus)),
  }));
  return { goldenVersion, questions, configs: out, sources: read.sources() };
}

export function buildReports(root = process.cwd()): ReportsData {
  const read = new Reader(root);
  const files = readdirSync(path.join(root, REPORTS_DIR))
    .filter((f) => /^morning-\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort();
  const reports = files.map((f) => {
    const file = `${REPORTS_DIR}/${f}`;
    const text = read.text(file).replace(/\r\n/g, '\n');
    const title = (text.match(/^# (.+)$/m)?.[1] ?? f).trim();
    return { date: f.slice('morning-'.length, -'.md'.length), file, title: maskNetwork(title), text: maskNetwork(text) };
  });
  return { reports, sources: read.sources() };
}
