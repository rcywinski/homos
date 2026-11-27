/**
 * Step 6.10, for the box window before 6.11: reranker time per question with the real documents of the two settings
 * that rerank. Run from the Mac against the box's reranker service (RERANK_URL), the same path as the 6.3 fetch:
 *
 *   npx tsx ai/eval/rerank-time-611.ts [--questions 34]
 *
 * Per question, in this order: one call with 1 document (the floor: network, HTTP and tokenizer overhead), one with the
 * served top 30 of the local index (meta header, no context), one with the top 100 of the context index (meta header
 * plus the Haiku context, as "6.10 rerank top 100" sends them). The lists come from the retrieval-diag cache, so no
 * embedding call is made. GPU only, as served. Writes ai/eval/results/2026-11-27-rerank-time-6-11.json and prints the
 * medians. Stops at the first error; no retry.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { loadCorpus } from '../corpus/load';
import { checkReranker, LocalReranker } from '../rerank/local';
import { docText } from '../rerank/retriever';
import { RERANK_FORMAT } from '../answer/retrieval';
import { CACHE, entryId, FixedEmbedder, setup, type Cache } from './retrieval-diag';
import type { GoldenQuestion } from './golden';

const OUT = 'ai/eval/results/2026-11-27-rerank-time-6-11.json';

export function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
}

async function main() {
  const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);
  const rerankUrl = process.env.RERANK_URL;
  if (!rerankUrl) throw new Error('RERANK_URL must be set (see .env.example)');
  const golden = readFileSync('ai/eval/golden.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as GoldenQuestion);
  const n = Number(arg('--questions') ?? golden.length);
  const chunks = loadCorpus();
  const cache = JSON.parse(readFileSync(CACHE, 'utf8')) as Cache;
  const embedder = new FixedEmbedder(new Map());
  const localCtx = setup('local', embedder, chunks).fs.withContext;
  const ctxCtx = setup('ctx-plain', embedder, chunks).fs.withContext;

  await checkReranker(rerankUrl);
  const reranker = new LocalReranker({ baseUrl: rerankUrl, timeoutMs: 120_000, retries: 1 }); // retries counts attempts: one attempt, no retry
  const timed = async (q: string, docs: { id: string; text: string }[]) => {
    const t0 = performance.now();
    await reranker.rerank(q, docs);
    return Math.round(performance.now() - t0);
  };
  const rows: { id: string; ms1: number; ms30: number; ms100: number; srv30: number | null; srv100: number | null; chars30: number; chars100: number }[] = [];
  for (const q of golden.slice(0, n)) {
    const local = cache.entries[entryId('local', q.id)];
    const ctx = cache.entries[entryId('ctx-plain', q.id)];
    if (!local || !ctx) throw new Error(`${q.id}: not in the cache`);
    const d30 = local.top.slice(0, 30).map((id) => ({ id, text: docText(localCtx.get(id)!, RERANK_FORMAT) }));
    const d100 = ctx.top.slice(0, 100).map((id) => ({ id, text: docText(ctxCtx.get(id)!, RERANK_FORMAT) }));
    const ms1 = await timed(q.question, d30.slice(0, 1));
    const ms30 = await timed(q.question, d30);
    const srv30 = reranker.serverMs.at(-1) ?? null;
    const ms100 = await timed(q.question, d100);
    const srv100 = reranker.serverMs.at(-1) ?? null;
    rows.push({ id: q.id, ms1, ms30, ms100, srv30, srv100, chars30: d30.reduce((a, d) => a + d.text.length, 0), chars100: d100.reduce((a, d) => a + d.text.length, 0) });
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  const summary = {
    questions: rows.length,
    device: reranker.lastDevice,
    maxLength: reranker.lastMaxLength,
    median1Ms: median(rows.map((r) => r.ms1)),
    median30Ms: median(rows.map((r) => r.ms30)),
    median100Ms: median(rows.map((r) => r.ms100)),
    medianServer30Ms: median(rows.flatMap((r) => (r.srv30 === null ? [] : [r.srv30]))),
    medianServer100Ms: median(rows.flatMap((r) => (r.srv100 === null ? [] : [r.srv100]))),
    medianChars30: median(rows.map((r) => r.chars30)),
    medianChars100: median(rows.map((r) => r.chars100)),
  };
  writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), rerankUrl: 'RERANK_URL (LAN)', note: 'Times from the Mac over the LAN; the 1-document call is the floor of network and HTTP overhead.', summary, rows }, null, 1) + '\n');
  console.log(JSON.stringify(summary));
  console.log(`wrote ${OUT}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
