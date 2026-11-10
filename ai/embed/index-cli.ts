/**
 * npm run ai:index [-- --doc meta [--contexts ai/context/contexts-<model>.jsonl]]
 * Embeds every chunk with the LocalEmbedder (bge-m3 on the inference box) and writes ai/index/<name>.json:
 *   ollama-bge-m3.json            the chunk text (steps 1.3 to 1.6)
 *   ollama-bge-m3.meta.json       metadata header + text (control row meta-index, step 1.7)
 *   ollama-bge-m3.ctx-<tag>.json  metadata header + generated context + text (contextual rows, step 1.7)
 * Then runs the step 1.3 smoke check: a Polish question and its English translation must return the same top chunk.
 */
import 'dotenv/config';
import { loadCorpus, withFileDates } from '../corpus/load';
import { LocalEmbedder } from './local';
import { corpusHash, indexPath, writeIndex } from './index-file';
import { indexView } from './index-view';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const SMOKE: Array<[string, string]> = [
  ['Dlaczego zakres cbBTC zawężono 31 sierpnia?', 'Why was the cbBTC range narrowed on 31 August?'],
  ['Kiedy kapitał został wycofany z pozycji LP?', 'When was the capital withdrawn from the LP positions?'],
];

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

async function main() {
  const baseUrl = process.env.INFERENCE_URL;
  if (!baseUrl) throw new Error('INFERENCE_URL is not set (see .env.example)');

  const fileDates = process.argv.includes('--file-dates');
  const corpus = fileDates ? withFileDates(loadCorpus()) : loadCorpus();
  const view = indexView(corpus, arg('--doc'), arg('--contexts'), fileDates);
  const chunks = view.chunks;
  const embedder = new LocalEmbedder({
    baseUrl,
    keepAlive: '30m',
    onBatch: (done, total) => process.stdout.write(`\r  embedded ${done}/${total}`),
  });

  console.log(`Embedding ${chunks.length} chunks with ${embedder.name} at ${baseUrl}`);
  const t0 = Date.now();
  const vectors = await embedder.embed(
    chunks.map((c) => c.text),
    'document',
  );
  const wallTimeMs = Date.now() - t0;
  process.stdout.write('\n');

  const file = indexPath(embedder.name + view.suffix);
  writeIndex(file, {
    embedder: embedder.name,
    dims: embedder.dims,
    createdAt: new Date().toISOString(),
    wallTimeMs,
    chunkCount: chunks.length,
    corpusHash: corpusHash(chunks),
    ids: chunks.map((c) => c.id),
    vectors,
  });
  console.log(`Wrote ${file}: ${vectors.length} vectors for ${chunks.length} chunks, wall time ${(wallTimeMs / 1000).toFixed(1)} s`);
  if (vectors.length !== chunks.length) process.exit(1);

  console.log('\nSmoke check: Polish and English question, same top chunk?');
  const queryEmbedder = new LocalEmbedder({ baseUrl });
  let ok = true;
  for (const [pl, en] of SMOKE) {
    const [qpl, qen] = await queryEmbedder.embed([pl, en], 'query');
    const top = (q: number[]) => {
      let best = 0;
      for (let i = 1; i < vectors.length; i++) if (dot(q, vectors[i]) > dot(q, vectors[best])) best = i;
      return { id: chunks[best].id, score: dot(q, vectors[best]) };
    };
    const a = top(qpl);
    const b = top(qen);
    const same = a.id === b.id;
    ok &&= same;
    console.log(`  PL ${a.id} (${a.score.toFixed(3)})\n  EN ${b.id} (${b.score.toFixed(3)})  ${same ? 'SAME' : 'DIFFERENT'}`);
  }
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
