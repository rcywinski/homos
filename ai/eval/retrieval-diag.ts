/**
 * Step 6.3: retrieval diagnostic on the development set (golden.jsonl only), in two separate runs.
 *
 *   npx tsx ai/eval/retrieval-diag.ts fetch [--variant local|chosen]   (box window: INFERENCE_URL and RERANK_URL)
 *   npx tsx ai/eval/retrieval-diag.ts report [--date YYYY-MM-DD]        (Mac only, no box, no API)
 *
 * fetch fills a cache in ai/index/ (gitignored) and nothing else: one query vector per question (bge-m3), then per
 * variant and question the reranker scores of the first stage's top 100 (one call) and of its top 30 (the served
 * call, kept apart because fp16 scores can depend on the batch). The cache is written after every question, the run
 * stops at the first error and keeps what it has, entries already cached under the same key are skipped.
 *
 * report reads only the cache and the index files. The first stage is rebuilt exactly as served (vectors plus BM25,
 * top 100 each, RRF) and every evidence chunk also gets its rank in each retriever's full list, so a chunk the fusion
 * never sees still has a rank. Reranked orders come from the cached scores, ties broken by first-stage rank (as
 * the served stable sort does). Check before anything is written: the served setting (rerank top 30, k = 10) must
 * give the same headline numbers as the stored 11 Nov lists, or the run exits non-zero; per question, a top 10 that
 * differs from the stored list is reported with the chunks that moved.
 */
import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { CONTEXTS_FILE, firstStage, QUERIES_FILE, RERANK_FORMAT, type FirstStage, type RetrievalVariant } from '../answer/retrieval';
import { readQueries } from '../context/query';
import type { Chunk } from '../corpus/types';
import { loadCorpus } from '../corpus/load';
import { corpusHash } from '../embed/index-file';
import { LocalEmbedder } from '../embed/local';
import type { EmbedKind, Embedder } from '../embed/types';
import { checkReranker, LocalReranker } from '../rerank/local';
import { docText } from '../rerank/retriever';
import { rrf } from '../store/hybrid';
import type { SearchHit } from '../store/types';
import { factSpans, overlaps, requiredOnly, type Evidence, type GoldenQuestion } from './golden';
import { score, type Score } from './span-score';

/** Both paths can be pointed elsewhere for a dry run with a synthetic cache (never for a real result). */
export const CACHE = process.env.RETRIEVAL_DIAG_CACHE ?? 'ai/index/retrieval-diag-cache.json';
const STORED = process.env.RETRIEVAL_DIAG_STORED ?? 'ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json';
const EMBEDDER = 'ollama-bge-m3';
const RERANKER = 'rerank:bge-reranker-v2-m3';
const DEPTH = 100;
const SERVED_N = 30;
export const VARIANTS: RetrievalVariant[] = ['local', 'chosen'];

/** Everything a cached entry depends on; an entry whose key differs from the current one is refused. */
export interface EntryKey {
  variant: RetrievalVariant;
  question: string;
  corpusHash: string;
  index: string;
  indexCreatedAt: string;
  indexCorpusHash: string;
  embedder: string;
  reranker: string;
  rerankFormat: string;
  contexts: string | null;
  bm25Query: string;
}

export interface Entry {
  key: EntryKey;
  /** First-stage top 100, best first. */
  top: string[];
  /** Reranker scores of `top` from one call of 100 documents, aligned with `top`. */
  scores: number[];
  truncated: boolean[];
  /** Scores of the served call (the first 30 of `top` in one call), aligned with `top.slice(0, 30)`. */
  served: number[];
  device: string | null;
  maxLength: number | null;
}

export interface Cache {
  vectors: Record<string, { embedder: string; vector: number[] }>;
  entries: Record<string, Entry>;
}

export const entryId = (variant: string, id: string) => `${variant}|${id}`;

export function keyDiff(a: EntryKey, b: EntryKey): string[] {
  return (Object.keys(a) as Array<keyof EntryKey>).filter((k) => a[k] !== b[k]).map((k) => `${k}: cached ${String(a[k])}, now ${String(b[k])}`);
}

/** Reranked order of the first `n` ids: score descending, ties kept in first-stage order. */
export function rerankOrder(top: string[], scores: number[], n: number): string[] {
  return top
    .slice(0, n)
    .map((id, i) => ({ id, i, s: scores[i] }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.id);
}

/** 1-based rank of the first chunk in `ids` overlapping the span, or null. */
export function spanRank(ids: string[], byId: Map<string, Chunk>, span: Evidence): number | null {
  const i = ids.findIndex((id) => overlaps(byId.get(id)!, span));
  return i < 0 ? null : i + 1;
}

/** How two top-k lists differ: the ids only in one of them, or "order" when the sets agree. */
export function listDiff(stored: string[], fresh: string[]): string | null {
  if (stored.join() === fresh.join()) return null;
  const gone = stored.filter((id) => !fresh.includes(id));
  const added = fresh.filter((id) => !stored.includes(id));
  if (!gone.length && !added.length) {
    const at = stored.findIndex((id, i) => fresh[i] !== id);
    return `order from rank ${at + 1}: stored ${stored[at]}, now ${fresh[at]}`;
  }
  return `stored only ${gone.join(', ')}; now only ${added.join(', ')}`;
}

export class FixedEmbedder implements Embedder {
  readonly name = EMBEDDER;
  readonly dims = 1024;
  constructor(private readonly vectors: Map<string, number[]>) {}
  async embed(texts: string[], _kind: EmbedKind): Promise<number[][]> {
    return texts.map((t) => {
      const v = this.vectors.get(t);
      if (!v) throw new Error(`no cached query vector for: ${t}`);
      return v;
    });
  }
}

function readCache(): Cache {
  return existsSync(CACHE) ? (JSON.parse(readFileSync(CACHE, 'utf8')) as Cache) : { vectors: {}, entries: {} };
}
const writeCache = (c: Cache) => writeFileSync(CACHE, JSON.stringify(c));

function readGolden(): GoldenQuestion[] {
  return readFileSync('ai/eval/golden.jsonl', 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenQuestion);
}

interface Setup {
  fs: FirstStage;
  key: (q: GoldenQuestion) => EntryKey;
}

export function setup(variant: RetrievalVariant, embedder: Embedder, chunks: Chunk[]): Setup {
  const queries = variant === 'local' ? new Map() : readQueries(QUERIES_FILE);
  const fs = firstStage(process.cwd(), variant, embedder, queries);
  const hash = corpusHash(chunks);
  return {
    fs,
    key: (q) => {
      const pl = queries.get(q.question);
      return {
        variant,
        question: q.question,
        corpusHash: hash,
        index: fs.indexName,
        indexCreatedAt: fs.index.createdAt,
        indexCorpusHash: fs.index.corpusHash,
        embedder: embedder.name,
        reranker: RERANKER,
        rerankFormat: RERANK_FORMAT,
        contexts: variant === 'local' ? null : CONTEXTS_FILE,
        bm25Query: variant === 'local' ? q.question : pl ? `${pl.question} ${pl.polish} ${pl.keywords.join(' ')}` : '(missing)',
      };
    },
  };
}

async function fetchRun(only?: RetrievalVariant) {
  const inferenceUrl = process.env.INFERENCE_URL;
  const rerankUrl = process.env.RERANK_URL;
  if (!inferenceUrl || !rerankUrl) throw new Error('INFERENCE_URL and RERANK_URL must be set (see .env.example)');
  const golden = readGolden();
  const chunks = loadCorpus();
  const cache = readCache();

  const missing = golden.map((q) => q.question).filter((t) => cache.vectors[t]?.embedder !== EMBEDDER);
  if (missing.length) {
    const live = new LocalEmbedder({ baseUrl: inferenceUrl, retries: 1 });
    const vecs = await live.embed(missing, 'query');
    missing.forEach((t, i) => (cache.vectors[t] = { embedder: live.name, vector: vecs[i] }));
    writeCache(cache);
  }
  console.log(`query vectors: ${missing.length} embedded, ${golden.length - missing.length} cached`);
  const embedder = new FixedEmbedder(new Map(Object.entries(cache.vectors).map(([t, v]) => [t, v.vector])));

  await checkReranker(rerankUrl);
  const reranker = new LocalReranker({ baseUrl: rerankUrl, timeoutMs: 120_000, retries: 1 });
  for (const variant of only ? [only] : VARIANTS) {
    const s = setup(variant, embedder, chunks);
    let done = 0;
    for (const q of golden) {
      const key = s.key(q);
      const old = cache.entries[entryId(variant, q.id)];
      if (old && !keyDiff(old.key, key).length) continue;
      const [top] = await s.fs.hybrid.search([q.question], DEPTH);
      const docs = top.map((h) => ({ id: h.id, text: docText(s.fs.withContext.get(h.id)!, RERANK_FORMAT) }));
      const all = await reranker.rerank(q.question, docs);
      const byDoc = new Map(all.map((r) => [r.id, r]));
      const served = await reranker.rerank(q.question, docs.slice(0, SERVED_N));
      const servedBy = new Map(served.map((r) => [r.id, r.score]));
      cache.entries[entryId(variant, q.id)] = {
        key,
        top: top.map((h) => h.id),
        scores: top.map((h) => byDoc.get(h.id)!.score),
        truncated: top.map((h) => byDoc.get(h.id)!.truncated),
        served: top.slice(0, SERVED_N).map((h) => servedBy.get(h.id)!),
        device: reranker.lastDevice,
        maxLength: reranker.lastMaxLength,
      };
      writeCache(cache);
      done++;
    }
    console.log(`${variant}: ${done} questions reranked, ${golden.length - done} already cached`);
  }
  console.log(`cache: ${CACHE}`);
}

/** Per question and variant, rebuilt offline from the cache. */
interface QView {
  fused: string[];
  vectorFull: string[];
  bm25Full: string[];
  entry: Entry;
}

const K_FIRST = [5, 10, 15, 20, 30, 50, 100];
const K_RERANK = [5, 10, 15, 20];
const POOLS = [30, 50, 60, 100];

function at(lists: Record<string, string[]>, k: number): Record<string, string[]> {
  return Object.fromEntries(Object.entries(lists).map(([id, l]) => [id, l.slice(0, k)]));
}

const short = (e: Evidence) => `${e.file.replace(/^journal\/(reports\/)?|^docs\//, '')}:${e.lines[0]}-${e.lines[1]}`;

async function report(date: string) {
  const golden = readGolden();
  const chunks = loadCorpus();
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const cache = readCache();
  const embedder = new FixedEmbedder(new Map(Object.entries(cache.vectors).filter(([, v]) => v.embedder === EMBEDDER).map(([t, v]) => [t, v.vector])));
  const stored = JSON.parse(readFileSync(STORED, 'utf8')) as { variants: Record<string, { retrieval: string; lists: Record<string, string[]> }> };
  const meta = JSON.parse(readFileSync('ai/eval/golden-meta.json', 'utf8')) as { version: string };
  const answerable = golden.filter((q) => q.answerable === 'yes');

  const problems: string[] = [];
  const views = new Map<RetrievalVariant, Map<string, QView>>();
  for (const variant of VARIANTS) {
    const s = setup(variant, embedder, chunks);
    const m = new Map<string, QView>();
    for (const q of golden) {
      const entry = cache.entries[entryId(variant, q.id)];
      if (!entry) {
        problems.push(`${variant} ${q.id}: not in the cache (run fetch)`);
        continue;
      }
      const diff = keyDiff(entry.key, s.key(q));
      if (diff.length) {
        problems.push(`${variant} ${q.id}: cache key differs (${diff.join('; ')})`);
        continue;
      }
      const [vec] = await s.fs.vector.search([q.question], DEPTH);
      const [bm] = await s.fs.bm25.search([q.question], DEPTH);
      const fused = rrf([vec, bm]).map((h: SearchHit) => h.id);
      if (fused.slice(0, DEPTH).join() !== entry.top.join()) problems.push(`${variant} ${q.id}: first stage differs from the cached one`);
      const [vf] = await s.fs.vector.search([q.question], chunks.length);
      const [bf] = await s.fs.bm25.search([q.question], chunks.length);
      m.set(q.id, { fused, vectorFull: vf.map((h) => h.id), bm25Full: bf.map((h) => h.id), entry });
    }
    views.set(variant, m);
  }
  if (problems.length) {
    console.error(`refused, nothing written:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }

  // Lists per variant and setting.
  const lists = (variant: RetrievalVariant, f: (v: QView) => string[]) =>
    Object.fromEntries([...views.get(variant)!].map(([id, v]) => [id, f(v)]));
  const servedLists = (variant: RetrievalVariant) => lists(variant, (v) => rerankOrder(v.entry.top, v.entry.served, SERVED_N));
  const poolLists = (variant: RetrievalVariant, n: number) => lists(variant, (v) => rerankOrder(v.entry.top, v.entry.scores, n));

  // Reproduction check against the stored 11 Nov lists.
  const check: string[] = [];
  let headlineOk = true;
  for (const variant of VARIANTS) {
    const fresh = at(servedLists(variant), 10);
    const old = stored.variants[variant].lists;
    const a = score(golden, old, byId);
    const b = score(golden, fresh, byId);
    const same = a.r5 === b.r5 && a.r10 === b.r10 && a.mrr === b.mrr && a.facts === b.facts;
    if (!same) headlineOk = false;
    check.push(`| ${variant} | ${a.r5}, ${a.r10}, ${a.mrr}, ${a.facts} | ${b.r5}, ${b.r10}, ${b.mrr}, ${b.facts} | ${same ? 'same' : '**differs**'} |`);
    for (const q of golden) {
      const d = listDiff(old[q.id], fresh[q.id]);
      if (d) check.push(`| ${variant} ${q.id} | top 10 differs | ${d} | |`);
    }
  }
  if (!headlineOk) {
    console.error(`headline numbers differ from the stored lists, nothing written:\n${check.join('\n')}`);
    process.exit(1);
  }

  // Coverage tables.
  const row = (label: string, recall: string, s: Score, mrr: boolean) => `| ${label} | ${recall} | ${mrr ? s.mrr : '-'} | ${s.req} | ${s.facts} | ${s.all} |`;
  const tables: string[] = [];
  const json: Record<string, unknown> = {};
  for (const variant of VARIANTS) {
    const first = lists(variant, (v) => v.fused);
    const rows: string[] = [];
    const j: Record<string, unknown> = {};
    for (const k of K_FIRST) {
      const s = score(golden, at(first, k), byId);
      rows.push(row(`first stage, k=${k}`, recallAtK(answerable, at(first, k), byId), s, false));
      j[`first@${k}`] = { recall: recallAtK(answerable, at(first, k), byId), req: s.req, facts: s.facts, all: s.all };
    }
    for (const n of POOLS) {
      const l = n === SERVED_N ? servedLists(variant) : poolLists(variant, n);
      for (const k of K_RERANK) {
        const s = score(golden, at(l, k), byId);
        rows.push(row(`rerank top ${n}${n === SERVED_N ? ' (served)' : ' (for 6.5)'}, k=${k}`, recallAtK(answerable, at(l, k), byId), s, k === 10));
        j[`rerank${n}@${k}`] = { recall: recallAtK(answerable, at(l, k), byId), mrr10: k === 10 ? s.mrr : undefined, req: s.req, facts: s.facts, all: s.all };
      }
    }
    json[variant] = j;
    tables.push(
      `### ${variant}`,
      '',
      `Retriever (as in its baseline run): \`${stored.variants[variant].retrieval}\`. Reranker device ${[...views.get(variant)!.values()][0].entry.device ?? '?'}, max length ${[...views.get(variant)!.values()][0].entry.maxLength ?? '?'}.`,
      '',
      '| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |',
      '|---|---|---|---|---|---|',
      ...rows,
      '',
    );
  }

  // Per span ranks.
  const spanRows: string[] = [];
  const spanJson: unknown[] = [];
  for (const variant of VARIANTS) {
    const served = servedLists(variant);
    const p100 = poolLists(variant, 100);
    for (const q of answerable) {
      const v = views.get(variant)!.get(q.id)!;
      const facts = factSpans(q);
      for (const e of requiredOnly(q.evidence)) {
        const fr = spanRank(v.fused, byId, e);
        const vr = spanRank(v.vectorFull, byId, e);
        const br = spanRank(v.bm25Full, byId, e);
        const r30 = spanRank(served[q.id], byId, e);
        const r100 = spanRank(p100[q.id], byId, e);
        const nFacts = facts.spans.filter((spans) => spans.includes(e)).length;
        spanRows.push(`| ${variant} | ${q.id} | ${short(e)} | ${nFacts} | ${fr ?? '-'} | ${vr ?? '-'} | ${br ?? '-'} | ${r30 ?? '-'} | ${r100 ?? '-'} |`);
        spanJson.push({ variant, id: q.id, span: short(e), facts: nFacts, fused: fr, vector: vr, bm25: br, rerank30: r30, rerank100: r100 });
      }
    }
  }

  // Score stability: the served call against the 100-document call on the same 30 documents.
  const drift: string[] = [];
  for (const variant of VARIANTS) {
    let max = 0;
    let orderChanged = 0;
    for (const v of views.get(variant)!.values()) {
      v.entry.served.forEach((s, i) => (max = Math.max(max, Math.abs(s - v.entry.scores[i]))));
      if (rerankOrder(v.entry.top, v.entry.served, SERVED_N).slice(0, 10).join() !== rerankOrder(v.entry.top, v.entry.scores, SERVED_N).slice(0, 10).join()) orderChanged++;
    }
    drift.push(`| ${variant} | ${max.toFixed(4)} | ${orderChanged} of ${golden.length} |`);
  }

  const base = `ai/eval/results/${date}-retrieval-diag-golden-v${meta.version.replace('.', '-')}`;
  const md = [
    `# Retrieval diagnostic, development set (golden v${meta.version})`,
    '',
    `Produced by \`npx tsx ai/eval/retrieval-diag.ts report\` from the cache filled in one box window (\`fetch\`); no API call.`,
    `Corpus \`${corpusHash(chunks)}\`, ${chunks.length} chunks, ${golden.length} questions (${answerable.length} answerable). Step 6.3.`,
    '',
    'Recall counts a question as found when a chunk overlapping one of its required spans is in the top k. Spans and',
    'facts covered count every required span (or fact) with an overlapping chunk in the top k. Rerank rows rerank the',
    "first stage's top N with cached scores, ties kept in first-stage order; top 30 uses the served call's scores, the",
    'deeper pools one call of 100 documents. Rows marked "for 6.5" are data for that step, not a decision.',
    '',
    '## Check against the stored lists (served setting, rerank top 30, k = 10)',
    '',
    'Headline: recall@5, recall@10, MRR@10 (required) and facts covered. The run refuses to write anything if these',
    'differ. A top 10 that differs with the same headline is listed with the chunks that moved.',
    '',
    '| variant | stored 11 Nov | now | |',
    '|---|---|---|---|',
    ...check,
    '',
    '## Coverage by stage',
    '',
    ...tables,
    '## Reranker score stability',
    '',
    'Largest difference between the served call (30 documents) and the 100-document call on the same 30 documents,',
    'and questions whose top 10 of the served pool changes when ordered by the 100-document scores.',
    '',
    '| variant | max score difference | top 10 changed |',
    '|---|---|---|',
    ...drift,
    '',
    '## Rank of every required span',
    '',
    'First stage: the fused rank as served (RRF of the vector and BM25 top 100 each; "-" when neither list has it), and',
    'the rank in the full vector and BM25 lists (BM25 returns only chunks sharing a term). Rerank: rank after reranking',
    'the top 30 (served) and the top 100. Facts: how many facts of the reference the span states.',
    '',
    '| variant | id | required span | facts | fused | vector | BM25 | rerank 30 | rerank 100 |',
    '|---|---|---|---|---|---|---|---|---|',
    ...spanRows,
    '',
  ].join('\n');
  writeFileSync(`${base}.md`, md);
  writeFileSync(`${base}.json`, JSON.stringify({ date, goldenVersion: meta.version, corpusHash: corpusHash(chunks), coverage: json, spans: spanJson }, null, 1) + '\n');
  console.log(`wrote ${base}.md and .json`);
}

function recallAtK(answerable: GoldenQuestion[], lists: Record<string, string[]>, byId: Map<string, Chunk>): string {
  const hits = answerable.filter((q) => lists[q.id].some((id) => requiredOnly(q.evidence).some((e) => overlaps(byId.get(id)!, e)))).length;
  return `${Math.round((hits / answerable.length) * 100)}% (${hits}/${answerable.length})`;
}

if (require.main === module) {
  const [cmd] = process.argv.slice(2);
  const arg = (n: string) => {
    const i = process.argv.indexOf(n);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const run =
    cmd === 'fetch'
      ? fetchRun(arg('--variant') as RetrievalVariant | undefined)
      : cmd === 'report'
        ? report(arg('--date') ?? new Date().toISOString().slice(0, 10))
        : Promise.reject(new Error('usage: retrieval-diag.ts fetch [--variant local|chosen] | report [--date YYYY-MM-DD]'));
  run.catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
