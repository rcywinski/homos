/**
 * npm run ai:context -- --model haiku|sonnet --max-usd <cap> (--sample <n> | --all) [--out <file>] [--concurrency 4]
 *
 * Writes one JSONL line {id, context} per chunk (appended as each call finishes, so a stopped run resumes where it
 * stopped) and <out>.usage.json with real token usage and cost from the API's usage fields.
 *
 * Hard spend cap: a request is sent only if (spent so far + worst case of requests in flight + its own worst case)
 * stays under --max-usd. Cache order: the first request of the whole run, and the first request of each parent
 * unit, finish before any request that shares their prefix is sent.
 */
import 'dotenv/config';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { loadCorpus } from '../corpus/load';
import { ClaudeContextualizer, INSTRUCTIONS, projectBrief } from './claude';
import { readContexts } from './contexts-file';
import { groupByParent, type Group } from './parents';
import { MODELS, type ModelKey } from './pricing';
import { validateContext } from './validate';
import type { ContextRequest, Contextualizer, TokenUsage } from './types';

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

export interface RunStats {
  done: number;
  errors: Array<{ id: string; error: string }>;
  /** Contexts that failed validation once and were requested again. */
  retries: number;
  /** Still invalid after the retry: stored as an empty context (the chunk keeps its metadata header only). */
  invalid: Array<{ id: string; rule: string }>;
  usage: TokenUsage;
  spentUsd: number;
  stoppedByCap: boolean;
}

/** Runs the groups under the cap and the cache order rule. Exported for tests (with a fake contextualizer). */
export async function runGroups(
  ctx: Contextualizer,
  groups: Group[],
  opts: {
    maxUsd: number;
    concurrency: number;
    onResult: (id: string, context: string, invalid?: string, rejected?: string) => void;
    validate?: (context: string, req: ContextRequest) => string | null;
  },
): Promise<RunStats> {
  const stats: RunStats = { done: 0, errors: [], retries: 0, invalid: [], usage: { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }, spentUsd: 0, stoppedByCap: false };
  let inFlightUsd = 0;
  let slots = opts.concurrency;
  const waiting: Array<() => void> = [];
  const acquire = () => (slots > 0 ? (slots--, Promise.resolve()) : new Promise<void>((r) => waiting.push(r)));
  const release = () => (waiting.length ? waiting.shift()!() : slots++);

  const one = async (req: ContextRequest): Promise<void> => {
    if (stats.stoppedByCap) return;
    const worst = ctx.worstCaseUsd(req);
    if (stats.spentUsd + inFlightUsd + worst > opts.maxUsd) {
      stats.stoppedByCap = true;
      return;
    }
    inFlightUsd += worst;
    await acquire();
    let retryNote: string | null = null;
    try {
      const r = await ctx.contextualize(req);
      for (const k of Object.keys(stats.usage) as Array<keyof TokenUsage>) stats.usage[k] += r.usage[k];
      stats.spentUsd += ctx.costUsd(r.usage);
      const broken = r.error ? null : (opts.validate?.(r.context, req) ?? null);
      if (r.error) stats.errors.push({ id: r.id, error: r.error });
      else if (broken && !req.retryNote) retryNote = broken;
      else if (broken) {
        stats.invalid.push({ id: r.id, rule: broken });
        stats.done++;
        opts.onResult(r.id, '', broken, r.context);
      } else {
        stats.done++;
        opts.onResult(r.id, r.context);
      }
    } catch (e) {
      stats.errors.push({ id: req.chunk.id, error: String(e) });
    } finally {
      inFlightUsd -= worst;
      release();
    }
    if (retryNote) {
      stats.retries++;
      await one({ ...req, retryNote });
    }
  };

  const runGroup = async (g: Group) => {
    await one(g.requests[0]); // writes the parent unit to the cache
    await Promise.all(g.requests.slice(1).map(one));
  };

  if (!groups.length) return stats;
  // The very first request writes the shared system prefix (instructions + brief) to the cache.
  await one(groups[0].requests[0]);
  const rest: Group[] = [{ key: groups[0].key, requests: groups[0].requests.slice(1) }, ...groups.slice(1)].filter((g) => g.requests.length);
  let next = 0;
  const worker = async () => {
    while (next < rest.length && !stats.stoppedByCap) await runGroup(rest[next++]);
  };
  await Promise.all(Array.from({ length: opts.concurrency }, worker));
  return stats;
}

async function main() {
  const key = arg('--model') as ModelKey;
  if (!(key in MODELS)) throw new Error('--model must be haiku or sonnet');
  const maxUsd = Number(arg('--max-usd'));
  if (!(maxUsd > 0)) throw new Error('--max-usd <cap in USD> is required');
  const sample = arg('--sample') ? Number(arg('--sample')) : undefined;
  if (!sample && !process.argv.includes('--all')) throw new Error('give --sample <n> or --all');
  const concurrency = Number(arg('--concurrency') ?? 4);
  const out = arg('--out') ?? (sample ? `ai/context/sample-${key}-n${sample}.jsonl` : `ai/context/contexts-${key}.jsonl`);

  const chunks = loadCorpus();
  let ids: Set<string> | undefined;
  if (sample) {
    const step = Math.floor(chunks.length / sample);
    ids = new Set(Array.from({ length: sample }, (_, i) => chunks[i * step].id));
  }
  const already = existsSync(out) ? readContexts(out) : new Map<string, string>();
  const groups = groupByParent(chunks)
    .map((g) => ({ ...g, requests: g.requests.filter((r) => (!ids || ids.has(r.chunk.id)) && !already.has(r.chunk.id)) }))
    .filter((g) => g.requests.length);
  const todo = groups.reduce((n, g) => n + g.requests.length, 0);

  const brief = projectBrief();
  const ctx = new ClaudeContextualizer(key, brief);
  console.log(`${ctx.name}: ${todo} chunks to do (${already.size} already in ${out}), ${groups.length} parent groups, cap $${maxUsd}`);
  const t0 = Date.now();
  const stats = await runGroups(ctx, groups, {
    maxUsd,
    concurrency,
    validate: validateContext,
    onResult: (id, context, invalid, rejected) => {
      // An invalid context is stored empty (the index then uses the metadata header only); the rejected text is
      // kept next to it so the rule can be audited.
      appendFileSync(out, JSON.stringify(invalid ? { id, context, invalid, rejected } : { id, context }) + '\n');
      process.stdout.write(invalid ? 'x' : '.');
    },
  });
  process.stdout.write('\n');
  const wallS = (Date.now() - t0) / 1000;

  const usageFile = out.replace(/\.jsonl$/, '.usage.json');
  const prev = existsSync(usageFile) ? (JSON.parse(readFileSync(usageFile, 'utf8')) as { runs: unknown[] }).runs : [];
  const run = {
    date: new Date().toISOString(),
    model: MODELS[key].id,
    prices: MODELS[key].price,
    promptHash: createHash('sha256').update(INSTRUCTIONS).update(brief).digest('hex').slice(0, 16),
    requested: todo,
    done: stats.done,
    errors: stats.errors,
    retries: stats.retries,
    invalidAfterRetry: stats.invalid,
    usage: stats.usage,
    costUsd: Number(stats.spentUsd.toFixed(4)),
    capUsd: maxUsd,
    stoppedByCap: stats.stoppedByCap,
    wallSeconds: Math.round(wallS),
  };
  writeFileSync(usageFile, JSON.stringify({ runs: [...prev, run] }, null, 2) + '\n');
  const u = stats.usage;
  const cacheShare = (u.cacheRead / Math.max(1, u.input + u.cacheWrite + u.cacheRead)) * 100;
  console.log(
    `done ${stats.done}/${todo}, retries ${stats.retries}, invalid after retry ${stats.invalid.length}, errors ${stats.errors.length}${stats.stoppedByCap ? ', STOPPED BY CAP' : ''}; ` +
      `tokens in ${u.input}, cache write ${u.cacheWrite}, cache read ${u.cacheRead} (${cacheShare.toFixed(0)}% of input), out ${u.output}; ` +
      `cost $${stats.spentUsd.toFixed(4)}; ${wallS.toFixed(0)} s. Wrote ${out} and ${usageFile}`,
  );
  if (stats.errors.length) console.log('errors:', stats.errors);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
