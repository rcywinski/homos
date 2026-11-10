/**
 * npm run ai:latency -- --device cpu [--n 5] [--max-length 2048] [--doc meta|plain]
 * Latency sample of the reranker, not an evaluation: n golden questions spread over the file (every
 * floor(total/n)-th), the same 30 hybrid-stem-prefix6 candidates the evaluation reranks, timed per question.
 * Writes ai/eval/results/<date>-rerank-latency-<device>-<maxLength>-n<n>.json and prints a table.
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { loadCorpus } from '../corpus/load';
import { corpusHash, indexPath, readIndex } from '../embed/index-file';
import { LocalEmbedder } from '../embed/local';
import { LocalReranker } from '../rerank/local';
import { docText, type DocFormat } from '../rerank/retriever';
import { Bm25Index } from '../store/bm25';
import { HybridRetriever } from '../store/hybrid';
import { VectorStore } from '../store/vector';
import type { GoldenQuestion } from './golden';

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const device = (arg('--device') ?? 'cpu') as 'cpu' | 'cuda';
  const n = Number(arg('--n') ?? 5);
  const maxLength = Number(arg('--max-length') ?? 2048);
  const format = (arg('--doc') ?? 'meta') as DocFormat;
  const baseUrl = process.env.INFERENCE_URL;
  const rerankUrl = process.env.RERANK_URL;
  if (!baseUrl || !rerankUrl) throw new Error('INFERENCE_URL and RERANK_URL must be set');

  const root = process.cwd();
  const chunks = loadCorpus(root);
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const golden = readFileSync('ai/eval/golden.jsonl', 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenQuestion);
  const step = Math.floor(golden.length / n);
  const sample = Array.from({ length: n }, (_, i) => golden[i * step]);

  const embedder = new LocalEmbedder({ baseUrl });
  const index = readIndex(indexPath(embedder.name, root), chunks);
  const hybrid = new HybridRetriever([new VectorStore(index.ids, index.vectors, embedder), new Bm25Index(chunks, { stem: 'prefix6' })]);
  const candidates = await hybrid.search(sample.map((q) => q.question), 30);

  const reranker = new LocalReranker({ baseUrl: rerankUrl, timeoutMs: 600_000, retries: 1, maxLength, device });
  await reranker.rerank('warm-up', [{ id: 'w', text: 'warm-up' }]); // loads the CPU copy of the model if needed
  reranker.serverMs.length = 0;

  const rows: Array<{ id: string; pairs: number; serverS: number; wallS: number }> = [];
  for (let i = 0; i < sample.length; i++) {
    const docs = candidates[i].map((h) => ({ id: h.id, text: docText(byId.get(h.id)!, format) }));
    const t0 = Date.now();
    await reranker.rerank(sample[i].question, docs);
    const wallS = (Date.now() - t0) / 1000;
    rows.push({ id: sample[i].id, pairs: docs.length, serverS: reranker.serverMs[i] / 1000, wallS });
    console.log(`${sample[i].id}: ${docs.length} pairs, server ${(reranker.serverMs[i] / 1000).toFixed(1)} s, wall ${wallS.toFixed(1)} s`);
  }
  const server = rows.map((r) => r.serverS).sort((a, b) => a - b);
  const result = {
    kind: 'latency sample, not an evaluation',
    date: new Date().toISOString().slice(0, 10),
    device: reranker.lastDevice,
    maxLength: reranker.lastMaxLength,
    doc: format,
    n,
    corpusHash: corpusHash(chunks),
    perQuestion: rows,
    serverSecondsMedian: server[Math.floor(server.length / 2)],
    serverSecondsMin: server[0],
    serverSecondsMax: server[server.length - 1],
  };
  const dir = 'ai/eval/results';
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${result.date}-rerank-latency-${result.device}-${result.maxLength}-n${n}.json`);
  writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
  console.log(`median ${result.serverSecondsMedian.toFixed(1)} s, min ${result.serverSecondsMin.toFixed(1)} s, max ${result.serverSecondsMax.toFixed(1)} s per question (server). Wrote ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
