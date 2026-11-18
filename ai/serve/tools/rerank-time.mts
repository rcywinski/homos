/**
 * Step 4.10e measurement: the time of one rerank call (30 corpus chunks against a golden question, as in a question's
 * retrieval) on the GPU and on the CPU, for option (c) of the plan. Run on the box against the site's child reranker
 * while it is loaded:
 *   node --import tsx ai/serve/tools/rerank-time.mts [--url http://127.0.0.1:11436] [--questions 5]
 * The CPU copy of the model is loaded on the first CPU call (CPU memory, not VRAM); that first call is reported apart.
 */
import { readFileSync } from 'fs';
import { loadCorpus } from '../../corpus/load';

const args = process.argv.slice(2);
const opt = (n: string, f: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const url = opt('--url', 'http://127.0.0.1:11436').replace(/\/$/, '');
const n = Number(opt('--questions', '5'));

const chunks = loadCorpus();
const golden = readFileSync('ai/eval/golden.jsonl', 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as { id: string; question: string })
  .slice(0, n);

async function rerank(query: string, documents: string[], device: string) {
  const t0 = Date.now();
  const r = await fetch(`${url}/rerank`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, documents, device }) });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${device}`);
  await r.json();
  return Date.now() - t0;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const times: Record<string, number[]> = { cuda: [], cpu: [] };
let firstCpu = 0;
for (let i = 0; i < golden.length; i++) {
  // 30 chunks spread over the corpus, the size of the served top 30.
  const docs = Array.from({ length: 30 }, (_, k) => chunks[(i * 97 + k * 31) % chunks.length].text);
  times.cuda.push(await rerank(golden[i].question, docs, 'cuda'));
  const cpu = await rerank(golden[i].question, docs, 'cpu');
  if (i === 0) firstCpu = cpu;
  else times.cpu.push(cpu);
}
console.log(JSON.stringify({ questions: golden.length, cudaMedianMs: median(times.cuda), cpuMedianMs: median(times.cpu), cpuFirstCallMs: firstCpu, cuda: times.cuda, cpu: times.cpu }));
