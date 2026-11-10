/**
 * Query translation/expansion (step 1.7, variant query-pl): one Claude call per question returns a Polish rendering
 * and 3 to 5 Polish keywords the journal author would use. Vectors keep the original question; BM25 gets the
 * original plus the Polish text (the 1.5 result: BM25's weakness here is the question language).
 * Results are cached in a committed JSONL file, so evaluation runs never call the API again.
 *
 * npm run ai:queries -- --model sonnet --max-usd 0.5
 */
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { MODELS, usd, type ModelKey } from './pricing';
import type { TokenUsage } from './types';
import type { GoldenQuestion } from '../eval/golden';

export interface PolishQuery {
  question: string;
  polish: string;
  keywords: string[];
}

export interface QueryRewriter {
  readonly name: string;
  rewrite(question: string): Promise<{ result: PolishQuery | null; usage: TokenUsage; error?: string }>;
}

export const QUERY_INSTRUCTIONS = `You help search a Polish working journal of a Uniswap v3 liquidity-provision research project (August to September 2026). The author writes in Polish and keeps English technical terms and identifiers as they are (pool names, position ids, config names, "range", "rebalance", "backtest").

Given an English question, output exactly two lines:
PL: <the question in Polish, phrased as the journal author would write it>
KW: <3 to 5 Polish keywords or short phrases the author would likely use for this topic, comma-separated>

Keep dates, numbers and identifiers unchanged. Do not answer the question and do not add facts it does not contain.`;

export function parseRewrite(text: string, question: string): PolishQuery | null {
  const pl = text.match(/^PL:\s*(.+)$/m)?.[1]?.trim();
  const kw = text.match(/^KW:\s*(.+)$/m)?.[1]?.split(',').map((k) => k.trim()).filter(Boolean);
  if (!pl || !kw || kw.length < 3 || kw.length > 5) return null;
  return { question, polish: pl, keywords: kw };
}

/** BM25 query text for the query-pl variant. */
export const expandedQuery = (q: PolishQuery) => `${q.question} ${q.polish} ${q.keywords.join(' ')}`;

export class ClaudeQueryRewriter implements QueryRewriter {
  readonly name: string;
  private readonly client = new Anthropic({ maxRetries: 4 });
  constructor(private readonly key: ModelKey) {
    this.name = `query-pl:${MODELS[key].id}`;
  }
  async rewrite(question: string) {
    const res = await this.client.messages.create({
      model: MODELS[this.key].id,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system: QUERY_INSTRUCTIONS,
      messages: [{ role: 'user', content: question }],
    });
    const usage: TokenUsage = {
      input: res.usage.input_tokens,
      cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
      output: res.usage.output_tokens,
    };
    if (res.stop_reason === 'refusal') return { result: null, usage, error: 'refusal' };
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
    const result = parseRewrite(text, question);
    return result ? { result, usage } : { result: null, usage, error: `unparsable: ${text.slice(0, 120)}` };
  }
}

export function readQueries(file: string): Map<string, PolishQuery> {
  const map = new Map<string, PolishQuery>();
  for (const line of readFileSync(file, 'utf8').split('\n')) if (line.trim()) {
    const q = JSON.parse(line) as PolishQuery & { id: string };
    map.set(q.question, q);
  }
  return map;
}

async function main() {
  const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);
  const key = (arg('--model') ?? 'sonnet') as ModelKey;
  const maxUsd = Number(arg('--max-usd'));
  if (!(maxUsd > 0)) throw new Error('--max-usd <cap in USD> is required');
  const out = arg('--out') ?? `ai/context/queries-pl-${key}.jsonl`;
  const golden = readFileSync('ai/eval/golden.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as GoldenQuestion);
  const done = existsSync(out) ? readQueries(out) : new Map();
  const rw = new ClaudeQueryRewriter(key);
  const total: TokenUsage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
  let spent = 0;
  const errors: string[] = [];
  for (const q of golden) {
    if (done.has(q.question)) continue;
    // Worst case of one call: ~1k input tokens and the full output budget.
    if (spent + usd({ input: 1000, cacheWrite: 0, cacheRead: 0, output: 2000 }, MODELS[key].price) > maxUsd) {
      errors.push('stopped by cap');
      break;
    }
    let r = await rw.rewrite(q.question);
    if (!r.result) r = await rw.rewrite(q.question); // one retry on an unparsable answer
    for (const k of Object.keys(total) as Array<keyof TokenUsage>) total[k] += r.usage[k];
    spent = usd(total, MODELS[key].price);
    if (r.result) appendFileSync(out, JSON.stringify({ id: q.id, ...r.result }) + '\n');
    else errors.push(`${q.id}: ${r.error}`);
  }
  const usageFile = out.replace(/\.jsonl$/, '.usage.json');
  const prev = existsSync(usageFile) ? (JSON.parse(readFileSync(usageFile, 'utf8')) as { runs: unknown[] }).runs : [];
  const run = { date: new Date().toISOString(), model: MODELS[key].id, usage: total, costUsd: Number(spent.toFixed(4)), capUsd: maxUsd, errors };
  writeFileSync(usageFile, JSON.stringify({ runs: [...prev, run] }, null, 2) + '\n');
  console.log(`${rw.name}: cost $${spent.toFixed(4)}, tokens ${JSON.stringify(total)}, errors ${errors.length}. Wrote ${out}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
