/**
 * Step 4.8j: converts a golden run of the chat server (ai/serve/tools/lan-batch.mts output, full quotes and searched
 * chunk ids) into the answers format of step 3.2 (AnswerRecord per question), so the step 3.2 judge reads it with the
 * same prompt. Offline. Prints the SHA-256 of the output.
 *
 *   node --import tsx ai/serve/tools/to-judge-input.mts --in <lan-run-golden.json> --out <answers file> [--label lan48]
 *     [--refusal explained|fixed] [--engine local|guest]
 * --engine guest converts a guest-key run (ai/serve/tools/guest-batch.mts, step 4.6e): the generator is the measured
 * cloud generator of step 1.8, and each row's token usage and cost are kept.
 * --refusal fixed judges "not in the data" on the fixed heading alone (as in 4.8j), so a run with explanations can
 * be judged both ways and the effect of the explanation measured on the same answers. Default: explained.
 *
 * Differences from a step 3.2 file, stated in the output's `note`: answers come through the chat server (live
 * retrieval, not saved chunk lists); for "not in the data" the answer text is the fixed text the visitor sees, not the
 * model's own sentence, unless the run has the model's explanation (server after 17 Nov 2026), in which case the
 * answer is the heading plus that explanation, as the visitor sees it, with the explanation's quotes; token usage
 * and cost are not available (local model, no API cost).
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import type { AnswerRecord } from '../../answer/measures';
import { LocalGenerator } from '../../answer/local';
import { loadCorpus } from '../../corpus/load';
import type { Chunk } from '../../corpus/types';
import { overlaps, type GoldenQuestion } from '../../eval/golden';
import { PRESETS, DEFAULT_PRESET } from '../config';

const args = process.argv.slice(2);
const opt = (n: string, f?: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const inFile = opt('--in');
const outFile = opt('--out');
const label = opt('--label', 'lan48')!;
const refusal = opt('--refusal', 'explained');
const engine = opt('--engine', 'local');
if (engine !== 'local' && engine !== 'guest') {
  console.error('--engine must be local or guest');
  process.exit(2);
}
if (refusal !== 'explained' && refusal !== 'fixed') {
  console.error('--refusal must be explained or fixed');
  process.exit(2);
}
if (!inFile || !outFile) {
  console.error('usage: to-judge-input.mts --in <lan-run-golden.json> --out <answers file> [--label lan48]');
  process.exit(2);
}

interface Row {
  id: string;
  outcome: string;
  coverage: 'full' | 'partial' | null;
  text: string;
  quotes: { status: string; reason?: string; file: string; chunkId?: string; quote?: string; lines: [number, number] | null }[];
  sources: string[] | number;
  explanation?: { text: string; quotes: Row['quotes'] };
  timing: { totalMs: number };
  serverMs: number | null;
  usage?: { input: number; output: number; cacheWrite: number; cacheRead: number } | null;
  costUsd?: number;
}

const raw = readFileSync(inFile, 'utf8');
const run = JSON.parse(raw) as { summary: { when: string; base: string }; rows: Row[] };
const golden = readFileSync('ai/eval/golden.jsonl', 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as GoldenQuestion);
const corpus = new Map<string, Chunk>(loadCorpus().map((c) => [c.id, c]));

// Refuse a file from the old batch tool: without quote texts and searched ids the judge input would differ from 3.2.
const problems: string[] = [];
if (run.rows.length !== golden.length) problems.push(`${run.rows.length} rows, the golden set has ${golden.length}`);
for (const r of run.rows) {
  if (!Array.isArray(r.sources)) problems.push(`${r.id}: searched chunk ids missing (old batch tool)`);
  if (r.quotes.some((q) => typeof q.quote !== 'string' || !q.chunkId)) problems.push(`${r.id}: quote text or chunk id missing (old batch tool)`);
}
const ids = new Set(run.rows.map((r) => r.id));
for (const q of golden) if (!ids.has(q.id)) problems.push(`${q.id}: no answer`);
if (problems.length) {
  console.error(`refusing to convert:\n  ${problems.slice(0, 10).join('\n  ')}`);
  process.exit(1);
}

const byId = new Map(run.rows.map((r) => [r.id, r]));
const perQuestion: AnswerRecord[] = golden.map((q) => {
  const r = byId.get(q.id)!;
  const searched = (r.sources as string[]).map((id) => corpus.get(id)).filter((c): c is Chunk => !!c);
  const onEvidence = (c: Chunk | undefined) => !!c && q.evidence.some((e) => overlaps(c, e));
  const ex = r.outcome === 'not-in-data' && refusal === 'explained' ? r.explanation : undefined;
  const citations = (ex ? ex.quotes : r.quotes).map((c) => {
    const status = c.status === 'verified' ? 'ok' : c.reason === 'unknown-chunk' ? 'unknown-chunk' : 'not-found';
    const words = (c.quote ?? '').trim().split(/\s+/).filter(Boolean).length;
    return { chunkId: c.chunkId!, quote: c.quote!, words, tooLong: words > 40, status, file: c.file, ...(c.lines ? { lines: c.lines } : {}) };
  }) as AnswerRecord['citations'];
  const coverage = r.outcome === 'answered' ? (r.coverage ?? 'partial') : r.outcome === 'not-in-data' ? 'none' : 'error';
  return {
    id: q.id,
    category: q.category,
    answerable: q.answerable,
    evidenceGiven: q.evidence.length === 0 ? 'no-evidence' : searched.some(onEvidence) ? 'yes' : 'no',
    coverage,
    citations,
    citesEvidence: citations.some((c) => c.status === 'ok' && onEvidence(corpus.get(c.chunkId))),
    usage: r.usage ?? { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 },
    costUsd: r.costUsd ?? 0,
    // A guest answer's time is the whole path (retrieval, the cloud call, verification); a local one the server's.
    ms: engine === 'guest' ? r.timing.totalMs : (r.serverMs ?? r.timing.totalMs),
    answer: ex ? `${r.text}\n\nThe model's own explanation: ${ex.text}` : r.text,
    chunkIds: r.sources as string[],
    ...(coverage === 'error' ? { error: r.outcome } : {}),
  };
});

const preset = PRESETS[DEFAULT_PRESET];
// The guest engine's name is the cloud generator's of step 1.8 (ai/answer/claude.ts), without importing the SDK here.
const generator = engine === 'guest' ? 'answer:claude-sonnet-5-5(effort=medium)' : new LocalGenerator({ ...preset.generator, baseUrl: 'http://127.0.0.1:11434', countTokens: (s) => s.length }).name;
const out = {
  label: `answers-k10-${engine === 'guest' ? 'guest' : 'local'}-${label}`,
  date: run.summary.when.slice(0, 10),
  goldenVersion: '1.4',
  generator,
  retrieval: 'hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta (live, through the chat server on the box)',
  k: preset.k,
  note:
    engine === 'guest'
      ? 'Step 4.6e: guest-key mode through the public chat server (ai/serve): local retrieval on the box, Claude Sonnet 5.5 called with the owner key outside the browser, verification on the server; converted by ai/serve/tools/to-judge-input.mts. Usage and cost are the real API figures of each call.'
      : 'Step 4.8j: the served preset through the public chat server on the box (ai/serve), converted by ai/serve/tools/to-judge-input.mts. Live retrieval, not saved chunk lists. For "not in the data" the answer is the fixed text the visitor sees. No token usage or cost (local model).',
  source: { file: inFile.split(/[\\/]/).pop(), sha256: createHash('sha256').update(raw).digest('hex') },
  perQuestion,
};
const explained = refusal === 'explained' ? run.rows.filter((r) => r.outcome === 'not-in-data' && r.explanation).length : 0;
if (refusal === 'fixed') out.note += ' Judged with the fixed heading alone for "not in the data" (--refusal fixed), even where the run has the explanation.';
if (explained) out.note += ` ${explained} "not in the data" answers include the model's own explanation under the fixed heading, as the page shows it.`;
const body = JSON.stringify(out, null, 1) + '\n';
writeFileSync(outFile, body);
const counts = perQuestion.reduce<Record<string, number>>((m, r) => ((m[r.coverage] = (m[r.coverage] ?? 0) + 1), m), {});
console.log(`wrote ${outFile}: ${perQuestion.length} answers ${JSON.stringify(counts)}, ${perQuestion.reduce((s, r) => s + r.citations.length, 0)} quotes`);
console.log(`sha256 ${createHash('sha256').update(body).digest('hex')}`);
