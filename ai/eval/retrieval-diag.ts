/**
 * Step 6.3: retrieval diagnostic on the development set (golden.jsonl only), in two separate runs.
 *
 *   npx tsx ai/eval/retrieval-diag.ts fetch [--variant local|chosen|ctx-plain]  (box window: INFERENCE_URL and RERANK_URL)
 *   npx tsx ai/eval/retrieval-diag.ts report [--date YYYY-MM-DD]                (Mac only, no box, no API)
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
 *
 * The report also has one first-stage-only row that is not a served setting: the local index with the cached Sonnet
 * Polish rendering given to BM25 (as "chosen" does), from the cached query vectors. It is the upper bound of what a
 * Polish query alone can add to the local path before any reranking (input for step 6.9). A second such row is the
 * first stage of step 6.10: the index with the committed Haiku contexts (the one "chosen" uses) and BM25 over the
 * same text, with the plain question and no translation.
 *
 * Variant "ctx-plain" (step 6.10, not served): that first stage, with the reranker seeing the chunks with their
 * contexts as "chosen" does. fetch caches its scores like the two served variants; report adds its coverage table and
 * a per-question comparison with local in the served setting when its entries are in the cache. It has no stored
 * lists, so its check is only that the first stage matches the cached one.
 */
import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { CONTEXTS_FILE, firstStage, QUERIES_FILE, RERANK_FORMAT, type FirstStage, type RetrievalVariant } from '../answer/retrieval';
import { expandedQuery, readQueries } from '../context/query';
import type { Chunk } from '../corpus/types';
import { loadCorpus } from '../corpus/load';
import { corpusHash } from '../embed/index-file';
import { LocalEmbedder } from '../embed/local';
import type { EmbedKind, Embedder } from '../embed/types';
import { checkReranker, LocalReranker } from '../rerank/local';
import { docText } from '../rerank/retriever';
import { HybridRetriever, rrf } from '../store/hybrid';
import { MappedRetriever } from '../store/mapped';
import { Bm25Index } from '../store/bm25';
import { indexView } from '../embed/index-view';
import type { Retriever } from '../store/types';
import type { SearchHit } from '../store/types';
import { factSpans, overlaps, requiredOnly, type Evidence, type GoldenQuestion } from './golden';
import { score, type Score } from './span-score';
import { loadTokenCounter } from '../answer/local';
import { answerUserPrompt } from '../answer/prompt';
import { DEFAULT_PRESET, PRESETS } from '../serve/config';
import { fold, normaliseDates } from '../store/tokenize';

/** Both paths can be pointed elsewhere for a dry run with a synthetic cache (never for a real result). */
export const CACHE = process.env.RETRIEVAL_DIAG_CACHE ?? 'ai/index/retrieval-diag-cache.json';
const STORED = process.env.RETRIEVAL_DIAG_STORED ?? 'ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json';
const EMBEDDER = 'ollama-bge-m3';
const RERANKER = 'rerank:bge-reranker-v2-m3';
const DEPTH = 100;
const SERVED_N = 30;
/** The two served variants, checked against the stored 11 Nov lists. */
export const VARIANTS: RetrievalVariant[] = ['local', 'chosen'];
/** Plus the 6.10 candidate: contexts in the index, plain question to BM25, reranker sees the contexts. */
export type DiagVariant = RetrievalVariant | 'ctx-plain';
export const ALL_VARIANTS: DiagVariant[] = [...VARIANTS, 'ctx-plain'];

/** Step 6.5 candidates, named by the owner before they were computed: index and rerank pool, k = 10. */
export const CANDIDATES_65: [DiagVariant, number][] = [
  ['local', 50],
  ['local', 60],
  ['local', 100],
  ['ctx-plain', 50],
  ['ctx-plain', 60],
  ['ctx-plain', 100],
];

/**
 * Step 6.6 candidates, named before the section was computed (owner, 27 Nov): first stage only (no reranker) on both
 * indexes, and the weighted fusion of the reranker order with the first-stage order on pools 30 and 100.
 */
export const NO_RERANK_66: DiagVariant[] = ['local', 'ctx-plain'];
export const FUSION_POOLS_66 = [30, 100];
export const FUSION_WEIGHTS_66 = [0.5, 0.7, 0.9];
/** A fusion setting goes forward to 6.11 only if it gains facts at this many of the three weights (owner, 27 Nov). */
export const FUSION_MIN_WEIGHTS_66 = 2;

/**
 * Weighted RRF of two orders of the same pool: w / (c + reranker rank) + (1 - w) / (c + first-stage rank), ranks
 * 1-based, ties broken by first-stage rank. w = 1 gives the reranker order, w = 0 the first-stage order.
 */
export function fuseOrders(first: string[], reranked: string[], w: number, c = 60): string[] {
  const rr = new Map(reranked.map((id, i) => [id, i + 1]));
  return first
    .map((id, i) => {
      const r = rr.get(id);
      if (r === undefined) throw new Error(`fuseOrders: ${id} is not in the reranked pool`);
      return { id, fr: i + 1, s: w / (c + r) + (1 - w) / (c + i + 1) };
    })
    .sort((a, b) => b.s - a.s || a.fr - b.fr)
    .map((x) => x.id);
}

/**
 * Step 6.7 candidates and thresholds, fixed before the section was computed (analysis session under the owner's
 * delegation, 27 Nov; ai/DECISIONS.md). Bases: served local, the context index without the reranker, and the context
 * index reranked over the top 100.
 */
export const K_ROWS_67 = [15, 20];
/** Facts a k row must gain over its own k = 10 base to go forward, per k; (c) uses the k = 20 threshold. */
export const K_MIN_GAIN_67: Record<number, number> = { 15: 6, 20: 10 };
/** A (b) row, same chunk count, must gain more than this. */
export const NEXT5_MIN_GAIN_67 = 2;
/** Chat-template overhead the server accepts at calibration (ai/answer/local.ts). */
export const TEMPLATE_OVERHEAD = 64;

/** The previous and next chunk of every chunk in the same file, by line order. */
export function fileNeighbours(chunks: Chunk[]): { prev: Map<string, string>; next: Map<string, string> } {
  const byFile = new Map<string, Chunk[]>();
  for (const c of chunks) byFile.set(c.file, [...(byFile.get(c.file) ?? []), c]);
  const prev = new Map<string, string>();
  const next = new Map<string, string>();
  for (const list of byFile.values()) {
    const sorted = [...list].sort((a, b) => a.lineStart - b.lineStart);
    for (let i = 0; i + 1 < sorted.length; i++) {
      next.set(sorted[i].id, sorted[i + 1].id);
      prev.set(sorted[i + 1].id, sorted[i].id);
    }
  }
  return { prev, next };
}

/**
 * The first `heads` hits, each followed by its next chunk when that is not already in the list, up to `cap`; with
 * `fill`, the remaining slots up to `cap` take the following hits in rank order.
 */
export function withNext(ranked: string[], next: Map<string, string>, heads: number, cap: number, fill: boolean): string[] {
  const out: string[] = [];
  const add = (id: string | undefined) => {
    if (id !== undefined && out.length < cap && !out.includes(id)) out.push(id);
  };
  for (const id of ranked.slice(0, heads)) {
    add(id);
    add(next.get(id));
  }
  if (fill) for (const id of ranked.slice(heads)) add(id);
  return out;
}

/**
 * Step 6.8 detectors and reorderings, fixed before the section was computed (ai/DECISIONS.md, 27 Nov). General
 * patterns, written while knowing the development questions; the frozen test set (6.12) checks whether they generalise.
 */
export const TEMPORAL_POOL_68 = 30;
export const DATE_WEIGHTS_68 = [0.3, 0.5];
export const ID_CORPUS_MAX_68 = 5;
export const TITLE_MAX_68 = 2;
export const MIN_GAIN_68 = 3;

/** Date order asked by a temporal word: the first whole word found decides. */
export function detectTemporal(question: string): 'asc' | 'desc' | null {
  const m = /\b(first|earliest|last|latest|final)\b/i.exec(question);
  if (!m) return null;
  return /^(first|earliest)$/i.test(m[1]) ? 'asc' : 'desc';
}

/** ISO dates named in the question, by the BM25 tokenizer's own date normalisation (year 2026 when missing). */
export function detectDates(question: string): string[] {
  const out = (normaliseDates(fold(question)).match(/\bd20\d{6}\b/g) ?? []).map((t) => `${t.slice(1, 5)}-${t.slice(5, 7)}-${t.slice(7, 9)}`);
  return [...new Set(out)];
}

/** Identifiers in the question, as matched in chunk text: a `#` number by its digits. */
export function detectIds(question: string): string[] {
  const re = /#(\d+)|\b([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b|\b([a-z]+[A-Z][A-Za-z0-9]*)\b|\b([A-Z]\d+(?:\.\d+)?)\b/g;
  const out: string[] = [];
  for (const m of question.matchAll(re)) out.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
  return [...new Set(out)];
}

/**
 * A: within the first `pool` ids, chunks of a named date go first (base order); then the dated chunks are reordered
 * among the slots they hold by the fusion of their base order with the date order (ties by base rank). Chunks without
 * a date keep their slots. Ids after the pool are unchanged.
 */
export function temporalReorder(ranked: string[], dateOf: (id: string) => string | undefined, dir: 'asc' | 'desc' | null, dates: string[], w: number, pool = TEMPORAL_POOL_68): string[] {
  let head = ranked.slice(0, pool);
  if (dates.length) head = [...head.filter((id) => dates.includes(dateOf(id) ?? '')), ...head.filter((id) => !dates.includes(dateOf(id) ?? ''))];
  if (dir) {
    const slots = head.map((id, i) => (dateOf(id) ? i : -1)).filter((i) => i >= 0);
    const dated = slots.map((i) => head[i]);
    const byDate = dated
      .map((id, i) => ({ id, i, d: dateOf(id)! }))
      .sort((a, b) => (dir === 'asc' ? a.d.localeCompare(b.d) : b.d.localeCompare(a.d)) || a.i - b.i)
      .map((x) => x.id);
    const fused = fuseOrders(dated, byDate, w);
    head = [...head];
    slots.forEach((slot, j) => (head[slot] = fused[j]));
  }
  return [...head, ...ranked.slice(pool)];
}

/** B1: ids among the first `n` that match go to the front, in base order. */
export function matchFront(ranked: string[], matches: (id: string) => boolean, n = 100): string[] {
  const head = ranked.slice(0, n);
  return [...head.filter(matches), ...head.filter((id) => !matches(id)), ...ranked.slice(n)];
}

/** B2: up to `max` given ids first (already ordered), then the base order without them. */
export function putFirst(ranked: string[], first: string[], max = ID_CORPUS_MAX_68): string[] {
  const f = first.slice(0, max);
  return [...f, ...ranked.filter((id) => !f.includes(id))];
}

/** C: at most `max` ids with the same title among the first `k`, the rest filled in base order. */
export function capTitles(ranked: string[], titleOf: (id: string) => string, k = 10, max = TITLE_MAX_68): string[] {
  const seen = new Map<string, number>();
  const picked: string[] = [];
  for (const id of ranked) {
    if (picked.length === k) break;
    const t = titleOf(id);
    if ((seen.get(t) ?? 0) >= max) continue;
    seen.set(t, (seen.get(t) ?? 0) + 1);
    picked.push(id);
  }
  return [...picked, ...ranked.filter((id) => !picked.includes(id))];
}

export interface FactChange {
  base: number;
  cand: number;
  gain: number;
  loss: number;
  /** Questions whose count differs, in the given order. */
  rows: { id: string; base: number; cand: number }[];
}

/** Facts per question of a candidate against a base: totals, questions gaining and losing, the ones that differ. */
export function factChange(ids: string[], base: Record<string, number>, cand: Record<string, number>): FactChange {
  const c: FactChange = { base: 0, cand: 0, gain: 0, loss: 0, rows: [] };
  for (const id of ids) {
    const x = base[id];
    const y = cand[id];
    c.base += x;
    c.cand += y;
    if (y > x) c.gain++;
    if (y < x) c.loss++;
    if (x !== y) c.rows.push({ id, base: x, cand: y });
  }
  return c;
}

/** What BM25 is given: the Polish rendering only for "chosen", the plain question otherwise. */
export function bm25QueryFor(variant: DiagVariant, question: string, pl: { question: string; polish: string; keywords: string[] } | undefined): string {
  if (variant !== 'chosen') return question;
  return pl ? `${pl.question} ${pl.polish} ${pl.keywords.join(' ')}` : '(missing)';
}

/** The contexts file a variant uses (index, BM25 text and reranker documents), none for "local". */
export const contextsFor = (variant: DiagVariant): string | null => (variant === 'local' ? null : CONTEXTS_FILE);

/** Everything a cached entry depends on; an entry whose key differs from the current one is refused. */
export interface EntryKey {
  variant: DiagVariant;
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

export function setup(variant: DiagVariant, embedder: Embedder, chunks: Chunk[]): Setup {
  const base: RetrievalVariant = variant === 'local' ? 'local' : 'chosen';
  const queries = base === 'local' ? new Map() : readQueries(QUERIES_FILE);
  let fs = firstStage(process.cwd(), base, embedder, queries);
  if (variant === 'ctx-plain') {
    // Same index and reranker documents as "chosen", BM25 over the same text but with the plain question.
    const bm25 = new Bm25Index(indexView(chunks, 'meta', CONTEXTS_FILE).chunks, { stem: 'prefix6' });
    fs = { ...fs, bm25, hybrid: new HybridRetriever([fs.vector, bm25]) };
  }
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
        contexts: contextsFor(variant),
        bm25Query: bm25QueryFor(variant, q.question, pl),
      };
    },
  };
}

async function fetchRun(only?: DiagVariant) {
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
  for (const variant of only ? [only] : ALL_VARIANTS) {
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

  // The 6.10 variant is reported only once fetched; a partial fetch is refused below like any missing entry.
  const ctxFetched = golden.some((q) => cache.entries[entryId('ctx-plain', q.id)]);
  const present: DiagVariant[] = ctxFetched ? ALL_VARIANTS : VARIANTS;
  const setups = new Map<DiagVariant, Setup>();
  const problems: string[] = [];
  const views = new Map<DiagVariant, Map<string, QView>>();
  for (const variant of present) {
    const s = setup(variant, embedder, chunks);
    setups.set(variant, s);
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
  const lists = (variant: DiagVariant, f: (v: QView) => string[]) =>
    Object.fromEntries([...views.get(variant)!].map(([id, v]) => [id, f(v)]));
  const servedLists = (variant: DiagVariant) => lists(variant, (v) => rerankOrder(v.entry.top, v.entry.served, SERVED_N));
  const poolLists = (variant: DiagVariant, n: number) => lists(variant, (v) => rerankOrder(v.entry.top, v.entry.scores, n));

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
  for (const variant of present) {
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
      `${variant === 'ctx-plain' ? 'Retriever (step 6.10, not served)' : 'Retriever (as in its baseline run)'}: \`${variant === 'ctx-plain' ? `${setups.get(variant)!.fs.hybrid.name}>${RERANKER}(top${SERVED_N},doc=${RERANK_FORMAT}) index=${setups.get(variant)!.fs.indexName}, reranker sees the contexts` : stored.variants[variant].retrieval}\`. Reranker device ${[...views.get(variant)!.values()][0].entry.device ?? '?'}, max length ${[...views.get(variant)!.values()][0].entry.maxLength ?? '?'}.`,
      '',
      '| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |',
      '|---|---|---|---|---|---|',
      ...rows,
      '',
    );
  }

  // First-stage-only rows that are not served settings: 6.9 (local index, Polish query for BM25) and 6.10 (contexts
  // in the index, plain question). Same RRF of the two top 100 lists as served.
  const queriesPl = readQueries(QUERIES_FILE);
  const localFs = setup('local', embedder, chunks).fs;
  const ctxFs = setup('ctx-plain', embedder, chunks).fs;
  const bm25Pl = new MappedRetriever(
    localFs.bm25,
    (q) => {
      const pl = queriesPl.get(q);
      if (!pl) throw new Error(`no Polish rendering for: ${q}`);
      return expandedQuery(pl);
    },
    'query-pl',
  );
  const firstOnly = async (vector: Retriever, bm25: Retriever) => {
    const fused: Record<string, string[]> = {};
    const bm25Full: Record<string, string[]> = {};
    for (const q of golden) {
      const [vec] = await vector.search([q.question], DEPTH);
      const [bm] = await bm25.search([q.question], DEPTH);
      fused[q.id] = rrf([vec, bm]).map((h: SearchHit) => h.id);
      const [bf] = await bm25.search([q.question], chunks.length);
      bm25Full[q.id] = bf.map((h) => h.id);
    }
    return { fused, bm25Full };
  };
  const firstRows = (name: string, fused: Record<string, string[]>) => {
    const rows: string[] = [];
    const j: Record<string, unknown> = {};
    for (const k of K_FIRST) {
      const s = score(golden, at(fused, k), byId);
      rows.push(row(`first stage, k=${k}`, recallAtK(answerable, at(fused, k), byId), s, false));
      j[`first@${k}`] = { recall: recallAtK(answerable, at(fused, k), byId), req: s.req, facts: s.facts, all: s.all };
    }
    json[name] = j;
    return rows;
  };
  const pl = await firstOnly(localFs.vector, bm25Pl);
  const plRows = firstRows('local+query-pl', pl.fused);
  const ctx = await firstOnly(ctxFs.vector, ctxFs.bm25);
  const ctxRows = firstRows('ctx-haiku+plain-question', ctx.fused);

  // Where required spans are lost: beyond fused rank 100, and of those how many have no BM25 rank at all.
  const lossRows: string[] = [];
  const lossOf = (label: string, fused: (id: string) => string[], bm25Full: (id: string) => string[]) => {
    let n = 0;
    let far = 0;
    let farNoBm25 = 0;
    let noBm25 = 0;
    for (const q of answerable)
      for (const e of requiredOnly(q.evidence)) {
        n++;
        const fr = spanRank(fused(q.id).slice(0, DEPTH), byId, e);
        const br = spanRank(bm25Full(q.id), byId, e);
        if (br === null) noBm25++;
        if (fr === null) {
          far++;
          if (br === null) farNoBm25++;
        }
      }
    lossRows.push(`| ${label} | ${n} | ${far} | ${farNoBm25} | ${noBm25} |`);
  };
  for (const variant of VARIANTS)
    lossOf(
      variant,
      (id) => views.get(variant)!.get(id)!.fused,
      (id) => views.get(variant)!.get(id)!.bm25Full,
    );
  lossOf(
    'local + Polish query for BM25 (6.9)',
    (id) => pl.fused[id],
    (id) => pl.bm25Full[id],
  );
  lossOf(
    'contexts in the index, plain question (6.10)',
    (id) => ctx.fused[id],
    (id) => ctx.bm25Full[id],
  );

  // Per span ranks.
  const spanRows: string[] = [];
  const spanJson: unknown[] = [];
  for (const variant of present) {
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
  for (const variant of present) {
    let max = 0;
    let orderChanged = 0;
    for (const v of views.get(variant)!.values()) {
      v.entry.served.forEach((s, i) => (max = Math.max(max, Math.abs(s - v.entry.scores[i]))));
      if (rerankOrder(v.entry.top, v.entry.served, SERVED_N).slice(0, 10).join() !== rerankOrder(v.entry.top, v.entry.scores, SERVED_N).slice(0, 10).join()) orderChanged++;
    }
    drift.push(`| ${variant} | ${max.toFixed(4)} | ${orderChanged} of ${golden.length} |`);
  }

  // Candidates against local in the served setting (rerank top 30, k = 10), per question, in facts.
  const factsIn = (q: GoldenQuestion, ids: string[]) => factSpans(q).spans.filter((sp) => ids.some((id) => sp.some((e) => overlaps(byId.get(id)!, e)))).length;
  const served10 = at(servedLists('local'), 10);
  const factsOf = (l: Record<string, string[]>) => Object.fromEntries(answerable.map((q) => [q.id, factsIn(q, l[q.id])]));
  const withSpans = Object.fromEntries(answerable.map((q) => [q.id, factSpans(q).spans.length]));
  const baseFacts = factsOf(served10);
  const sl = score(golden, served10, byId);
  const headRow = (label: string, sc: Score) => `| ${label} | ${sc.r5} | ${sc.r10} | ${sc.mrr} | ${sc.facts} |`;
  const changeTable = (label: string, c: FactChange, baseLabel = 'local') => [
    `Facts: ${baseLabel} ${c.base}, ${label} ${c.cand}; ${c.gain} questions gain, ${c.loss} lose.`,
    '',
    `| id | facts with a span | ${baseLabel} | ${label} | change |`,
    '|---|---|---|---|---|',
    ...c.rows.map((r) => `| ${r.id} | ${withSpans[r.id]} | ${r.base} | ${r.cand} | ${r.cand > r.base ? '+' : ''}${r.cand - r.base} |`),
    '',
  ];
  const cmp: string[] = [];
  if (ctxFetched) {
    const cand = at(servedLists('ctx-plain'), 10);
    const c = factChange(answerable.map((q) => q.id), baseFacts, factsOf(cand));
    cmp.push(
      '## 6.10 against local, served setting (rerank top 30, k = 10)',
      '',
      'Both reranked by the cached served call (30 documents). Facts are per question; questions with the same count',
      'are not listed. A candidate, not a result: the decision is a judged two-run comparison on the development set.',
      '',
      '| | recall@5 | recall@10 | MRR@10 | facts covered |',
      '|---|---|---|---|---|',
      headRow('local (served)', sl),
      headRow('6.10 (ctx-plain)', score(golden, cand, byId)),
      '',
      ...changeTable('6.10', c),
    );
    json['ctx-plain-vs-local'] = { local: c.base, ctxPlain: c.cand, gain: c.gain, loss: c.loss };
  } else {
    cmp.push('## 6.10 against local, served setting', '', 'Not fetched yet: run `fetch --variant ctx-plain` in a box window.', '');
  }

  // Step 6.5: the named candidates (owner, 27 Nov, fixed before this section was computed), deeper rerank pools.
  const cand65: string[] = [];
  if (ctxFetched) {
    const named: { label: string; variant: DiagVariant; pool: number }[] = CANDIDATES_65.map(([variant, pool]) => ({ label: `${variant === 'local' ? 'local' : '6.10'} top ${pool}`, variant, pool }));
    const heads: string[] = [];
    const details: string[] = [];
    const j: Record<string, unknown> = {};
    for (const n of named) {
      const l = at(poolLists(n.variant, n.pool), 10);
      const sc = score(golden, l, byId);
      const c = factChange(answerable.map((q) => q.id), baseFacts, factsOf(l));
      heads.push(`| ${n.label} | ${sc.r5} | ${sc.r10} | ${sc.mrr} | ${sc.facts} | ${c.gain} | ${c.loss} |`);
      details.push(`### ${n.label}`, '', ...changeTable(n.label, c));
      j[`${n.variant}@${n.pool}`] = { r10: sc.r10, mrr: sc.mrr, facts: c.cand, gain: c.gain, loss: c.loss };
    }
    json['candidates-6.5'] = j;
    cand65.push(
      '## 6.5 candidates against served local (rerank top N, k = 10)',
      '',
      'The list was named by the owner before this section was computed: rerank top 50, 60 and 100 on the local index',
      'and on the context index of 6.10 (plain question). The deeper pools use the scores of one 100-document call (at',
      'most 0.0017 from the served call on the same documents, see score stability). Facts per question against the',
      'served local row; questions with the same count are not listed. Candidates, not results: fact coverage chooses',
      'what goes to the judged runs of 6.11, which decide. Reranker time per question at these pools is measured on the',
      'box in the window before 6.11.',
      '',
      '| | recall@5 | recall@10 | MRR@10 | facts covered | questions gaining | losing |',
      '|---|---|---|---|---|---|---|',
      `| local (served, top 30) | ${sl.r5} | ${sl.r10} | ${sl.mrr} | ${sl.facts} | - | - |`,
      ...heads,
      '',
      ...details,
    );
  } else {
    cand65.push('## 6.5 candidates against served local', '', 'Not fetched yet: the context-index candidates need `fetch --variant ctx-plain`.', '');
  }

  // Step 6.6: no reranker, and the reranker order fused with the first-stage order. Candidates, weights and the rule
  // were fixed before this section was computed (ai/DECISIONS.md, 27 Nov). The pool's first-stage order is the
  // cached top N; pool 30 is reranked with the served call's scores, pool 100 with the 100-document call's.
  const cand66: string[] = [];
  if (ctxFetched) {
    const ids = answerable.map((q) => q.id);
    const label = (v: DiagVariant) => (v === 'local' ? 'local' : '6.10');
    const firstLists = (v: DiagVariant) => lists(v, (x) => x.fused);
    const rerankedPool = (v: DiagVariant, n: number) => (n === SERVED_N ? servedLists(v) : poolLists(v, n));
    const fused = (v: DiagVariant, n: number, w: number) =>
      Object.fromEntries(Object.entries(rerankedPool(v, n)).map(([id, r]) => [id, fuseOrders(views.get(v)!.get(id)!.fused.slice(0, n), r, w)]));
    const same = (a: Record<string, string[]>, b: Record<string, string[]>) => golden.filter((q) => a[q.id].slice(0, 10).join() !== b[q.id].slice(0, 10).join()).map((q) => q.id);

    // Identity check on the real data: w = 0 is the no-reranker row, w = 1 the reranked row of the same pool.
    const identity: string[] = [];
    const identityBad: string[] = [];
    for (const v of NO_RERANK_66)
      for (const n of FUSION_POOLS_66) {
        const d0 = same(fused(v, n, 0), firstLists(v));
        const d1 = same(fused(v, n, 1), rerankedPool(v, n));
        identity.push(`| ${label(v)} | ${n} | ${d0.length ? `**${d0.length} differ**` : `${golden.length} of ${golden.length} same`} | ${d1.length ? `**${d1.length} differ**` : `${golden.length} of ${golden.length} same`} |`);
        if (d0.length || d1.length) identityBad.push(`${v} pool ${n}: w=0 ${d0.join(',') || 'ok'}, w=1 ${d1.join(',') || 'ok'}`);
      }
    if (identityBad.length) {
      console.error(`fusion identity check failed, nothing written:\n  ${identityBad.join('\n  ')}`);
      process.exit(1);
    }

    const heads: string[] = [];
    const details: string[] = [];
    const rule: string[] = [];
    const j: Record<string, unknown> = {};
    const add = (name: string, key: string, l: Record<string, string[]>, docs: number) => {
      const top = at(l, 10);
      const sc = score(golden, top, byId);
      const c = factChange(ids, baseFacts, factsOf(top));
      heads.push(`| ${name} | ${docs} | ${sc.r5} | ${sc.r10} | ${sc.mrr} | ${sc.facts} | ${c.cand - c.base > 0 ? '+' : ''}${c.cand - c.base} | ${c.gain} | ${c.loss} |`);
      details.push(`### ${name}`, '', ...changeTable(name, c));
      j[key] = { rerankDocs: docs, r10: sc.r10, mrr: sc.mrr, facts: c.cand, gain: c.gain, loss: c.loss };
      return c;
    };
    for (const v of NO_RERANK_66) add(`${label(v)}, no reranker`, `${v}@first`, firstLists(v), 0);
    for (const v of NO_RERANK_66)
      for (const n of FUSION_POOLS_66) {
        const gaining = FUSION_WEIGHTS_66.filter((w) => {
          const c = add(`${label(v)} top ${n}, fused w=${w}`, `${v}@${n}w${w}`, fused(v, n, w), n);
          return c.cand > c.base;
        });
        const passes = gaining.length >= FUSION_MIN_WEIGHTS_66;
        rule.push(`| ${label(v)} | ${n} | ${gaining.length ? gaining.join(', ') : 'none'} | ${passes ? '**goes forward**' : 'does not'} |`);
        j[`${v}@${n}-rule`] = { gainingWeights: gaining, passes };
      }
    json['candidates-6.6'] = j;

    cand66.push(
      '## 6.6 candidates: no reranker, and the reranker fused with the first stage (k = 10)',
      '',
      'Named before this section was computed (owner, 27 Nov; rule in ai/DECISIONS.md): the first stage alone on the',
      'local index and on the context index of 6.10, and a weighted RRF of the reranker order and the first-stage order,',
      '`w/(60 + reranker rank) + (1 - w)/(60 + first-stage rank)`, ties broken by first-stage rank, on rerank pools 30',
      '(served call scores) and 100 (100-document call), on both indexes, at w = 0.5, 0.7 and 0.9. Every grid point is',
      'reported. Facts per question against the served local row; questions with the same count are not listed.',
      '',
      '### Check: the fusion at its two ends',
      '',
      'On the real data, before any table: w = 0 must give the no-reranker top 10 and w = 1 the reranked top 10 of the',
      'same pool (the served rows at pool 30, the 6.5 rows at pool 100), question by question. The run writes nothing',
      'otherwise.',
      '',
      '| index | pool | w = 0 against no reranker | w = 1 against the reranked pool |',
      '|---|---|---|---|',
      ...identity,
      '',
      '### Summary',
      '',
      '| | reranker documents per question | recall@5 | recall@10 | MRR@10 | facts covered | facts against served | questions gaining | losing |',
      '|---|---|---|---|---|---|---|---|---|',
      `| local (served, top 30) | ${SERVED_N} | ${sl.r5} | ${sl.r10} | ${sl.mrr} | ${sl.facts} | - | - | - |`,
      ...heads,
      '',
      '### Rule for the fusion rows',
      '',
      `A fusion setting goes forward to 6.11 only if it covers more facts than the served row (${Object.values(baseFacts).reduce((a, b) => a + b, 0)}) at ${FUSION_MIN_WEIGHTS_66} or more of`,
      'the three weights on the same pool and index; a single peak does not.',
      '',
      '| index | pool | weights with a gain | |',
      '|---|---|---|---|',
      ...rule,
      '',
      '### Reranker time per question',
      '',
      'Only the 30-document time is known (0.585 s per call, step 4.10e); the others are measured on the box in the',
      'window before 6.11. The fusion itself is arithmetic on two lists: no extra call, no measurable time.',
      '',
      '| setting | reranker calls | documents scored | reranker time |',
      '|---|---|---|---|',
      `| local (served, top 30) | 1 | ${SERVED_N} | 0.585 s |`,
      '| 6.10, no reranker | 0 | 0 | 0 s |',
      '| 6.10 top 100 (6.5) | 1 | 100 | to be measured |',
      '',
      '### dated-06, read by hand',
      '',
      'Served local carries its 3 facts at reranked ranks 1, 8 and 9 (CONTEXT.md 4411-4441, 2514-2547, 2347-2389; first',
      'stage 15, 26 and 14). With the local pool at 100 the first stays at 1, the other two fall to 21 and 23: the',
      'reranker lifts five HANDOFF.md inbox sections from first-stage ranks 41 to 100 and the next part of the first',
      'entry (CONTEXT.md 4442-4470, first stage 36) into the top 10. On the context index the top 10 is already lost at',
      'pool 30: nine of the ten are the same "pipeline-task.log (tail)" section of morning reports of other dates (lines',
      '51-65), and at pool 100 their "pipeline.log (last run)" sections (lines 31-49) from first-stage ranks 47 to 94',
      'join them, while the required report lines (20 Aug line 48 and others) are not among them. So near-identical',
      'morning reports explain the context index; on the local index it is the coordination inboxes, both from deep in',
      'the first stage.',
      '',
      ...details,
    );
  } else {
    cand66.push('## 6.6 candidates', '', 'Not fetched yet: the context-index candidates need `fetch --variant ctx-plain`.', '');
  }

  // Step 6.7: more context per answer. Candidates, thresholds and the choice among passing rows were fixed before this
  // section was computed (ai/DECISIONS.md, 27 Nov). Prompt tokens are counted with the served tokenizer and prompt.
  const cand67: string[] = [];
  if (ctxFetched) {
    const preset = PRESETS[DEFAULT_PRESET].generator;
    if (!preset.system || !preset.tokenizerDir) throw new Error('served preset without a system prompt or tokenizer');
    const count = loadTokenCounter(preset.tokenizerDir);
    const sysTok = count(preset.system);
    const tokCache = new Map<string, number>();
    const promptTok = (q: GoldenQuestion, ids: string[]) => {
      const key = `${q.id}|${ids.join()}`;
      if (!tokCache.has(key)) tokCache.set(key, sysTok + count(answerUserPrompt(q.question, ids.map((id) => byId.get(id)!))) + TEMPLATE_OVERHEAD);
      return tokCache.get(key)!;
    };
    const { prev, next } = fileNeighbours(chunks);
    const median = (xs: number[]) => {
      const a = [...xs].sort((x, y) => x - y);
      return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    };
    const total = (f: Record<string, number>) => Object.values(f).reduce((a, b) => a + b, 0);
    const bases67: { name: string; key: string; ranked: Record<string, string[]> }[] = [
      { name: 'local (served, top 30)', key: 'local', ranked: servedLists('local') },
      { name: '6.10, no reranker', key: 'ctx-first', ranked: lists('ctx-plain', (v) => v.fused) },
      { name: '6.10 top 100', key: 'ctx-100', ranked: poolLists('ctx-plain', 100) },
    ];

    // Bound: missed required spans and facts at k = 10 in the chunk before or after a top 10 hit, same file.
    const boundRows: string[] = [];
    for (const b of bases67) {
      let spans = 0, sPrev = 0, sNext = 0, sEither = 0, facts = 0, fPrev = 0, fNext = 0, fEither = 0;
      for (const q of answerable) {
        const top = b.ranked[q.id].slice(0, 10);
        const hit = (e: Evidence, ids: string[]) => ids.some((id) => overlaps(byId.get(id)!, e));
        const pIds = top.map((id) => prev.get(id)).filter((x): x is string => !!x);
        const nIds = top.map((id) => next.get(id)).filter((x): x is string => !!x);
        for (const e of requiredOnly(q.evidence)) {
          if (hit(e, top)) continue;
          spans++;
          const p = hit(e, pIds), n = hit(e, nIds);
          if (p) sPrev++;
          if (n) sNext++;
          if (p || n) sEither++;
        }
        for (const sp of factSpans(q).spans) {
          if (sp.some((e) => hit(e, top))) continue;
          facts++;
          const p = sp.some((e) => hit(e, pIds)), n = sp.some((e) => hit(e, nIds));
          if (p) fPrev++;
          if (n) fNext++;
          if (p || n) fEither++;
        }
      }
      boundRows.push(`| ${b.name} | ${spans} | ${sPrev} | ${sNext} | ${sEither} | ${facts} | ${fPrev} | ${fNext} | ${fEither} |`);
    }

    // Rows per base: k = 10 (the base), k = 15, k = 20, (b) top 5 with next capped at 10, (c) top 10 with next up to 20.
    type Kind = 'base' | 'k' | 'b' | 'c';
    const heads: string[] = [];
    const details: string[] = [];
    const passing: { name: string; kind: Kind; gain: number; per1000: number }[] = [];
    const j: Record<string, unknown> = {};
    const servedTok = median(golden.map((q) => promptTok(q, servedLists('local')[q.id].slice(0, 10))));
    const watchedIds = ['dated-04', 'dated-05', 'id-07', 'dated-06'];
    const watched: string[] = [];
    for (const b of bases67) {
      const rows: { name: string; kind: Kind; k: number; l: Record<string, string[]> }[] = [
        { name: `${b.name}, k=10`, kind: 'base', k: 10, l: at(b.ranked, 10) },
        ...K_ROWS_67.map((k) => ({ name: `${b.name}, k=${k}`, kind: 'k' as Kind, k, l: at(b.ranked, k) })),
        { name: `${b.name}, top 5 + next, 10 chunks`, kind: 'b', k: 10, l: Object.fromEntries(Object.entries(b.ranked).map(([id, r]) => [id, withNext(r, next, 5, 10, true)])) },
        { name: `${b.name}, top 10 + next, up to 20`, kind: 'c', k: 20, l: Object.fromEntries(Object.entries(b.ranked).map(([id, r]) => [id, withNext(r, next, 10, 20, false)])) },
      ];
      const baseFacts67 = factsOf(rows[0].l);
      const baseTok = golden.map((q) => promptTok(q, rows[0].l[q.id]));
      for (const r of rows) {
        const f = factsOf(r.l);
        const c = factChange(answerable.map((q) => q.id), baseFacts67, f);
        const tok = golden.map((q) => promptTok(q, r.l[q.id]));
        const fits = tok.filter((t) => t + preset.numPredict <= preset.numCtx).length;
        const added = tok.reduce((a, t, i) => a + t - baseTok[i], 0) / golden.length;
        const chunksMean = golden.reduce((a, q) => a + r.l[q.id].length, 0) / golden.length;
        const gain = c.cand - c.base;
        const per1000 = added > 0 ? gain / (added / 1000) : NaN;
        const threshold = r.kind === 'k' ? K_MIN_GAIN_67[r.k] : r.kind === 'c' ? K_MIN_GAIN_67[20] : NEXT5_MIN_GAIN_67 + 1;
        const passes = r.kind !== 'base' && fits === golden.length && gain >= threshold;
        if (passes) passing.push({ name: r.name, kind: r.kind, gain, per1000 });
        const verdict = r.kind === 'base' ? 'base' : passes ? '**passes**' : fits < golden.length ? 'does not fit' : `no (needs ${threshold})`;
        heads.push(
          `| ${r.name} | ${chunksMean.toFixed(1)} | ${total(f)} | ${r.kind === 'base' ? '-' : `${gain > 0 ? '+' : ''}${gain} (${c.gain}/${c.loss})`} | ${median(tok)} | ${Math.max(...tok)} | ${r.kind === 'base' ? '-' : Math.round(added)} | ${Number.isNaN(per1000) ? '-' : per1000.toFixed(2)} | ${fits} of ${golden.length} | ${Math.round((13117 * median(tok)) / servedTok)} | ${verdict} |`,
        );
        if (r.kind !== 'base') details.push(`### ${r.name} against its k = 10`, '', ...changeTable(r.name, c, 'k = 10'));
        j[`${b.key}:${r.name.slice(b.name.length + 2)}`] = { facts: total(f), gain, gaining: c.gain, losing: c.loss, tokMedian: median(tok), tokMax: Math.max(...tok), addedMean: Math.round(added), per1000: Number.isNaN(per1000) ? null : +per1000.toFixed(3), fits, passes };
      }
      // Watched questions: where the new facts arrive.
      for (const id of watchedIds) {
        const q = answerable.find((x) => x.id === id)!;
        const f10 = factsIn(q, b.ranked[id].slice(0, 10));
        const f15 = factsIn(q, b.ranked[id].slice(0, 15));
        const f20 = factsIn(q, b.ranked[id].slice(0, 20));
        const fb = factsIn(q, rows[3].l[id]);
        const fc = factsIn(q, rows[4].l[id]);
        watched.push(`| ${b.name} | ${id} | ${factSpans(q).spans.length} | ${f10} | +${f15 - f10} | +${f20 - f15} | ${fb} | ${fc} |`);
      }
    }
    // dated-06 on the context index: what ranks 11 to 20 add.
    const d06 = answerable.find((q) => q.id === 'dated-06')!;
    const ownReports = new Set(d06.evidence.map((e) => e.file).filter((f) => f.includes('reports/')));
    const d06Lines = bases67.slice(1).map((b) => {
      const extra = b.ranked['dated-06'].slice(10, 20).map((id) => byId.get(id)!);
      const otherLogs = extra.filter((c) => c.file.includes('reports/morning-') && !ownReports.has(c.file) && /pipeline/i.test(c.title)).length;
      const own = extra.filter((c) => ownReports.has(c.file) || d06.evidence.some((e) => overlaps(c, e))).length;
      return `- ${b.name}: of ranks 11 to 20, ${otherLogs} ${otherLogs === 1 ? 'is a pipeline log section' : 'are pipeline log sections'} of morning reports of other dates, ${own} ${own === 1 ? 'is' : 'are'} from its own reports or evidence (${factsIn(d06, b.ranked['dated-06'].slice(0, 20))} of ${factSpans(d06).spans.length} facts at k = 20).`;
    });

    // Choice among passing rows, as fixed in advance.
    const tokenRows = passing.filter((p) => p.kind !== 'b');
    const bRows = passing.filter((p) => p.kind === 'b');
    let choice: string;
    if (!passing.length) choice = 'No 6.7 row passes: none goes to 6.11.';
    else if (passing.length === 1) choice = `One row passes and goes to 6.11 as the fourth configuration: **${passing[0].name}**.`;
    else if (!bRows.length) {
      const best = [...tokenRows].sort((a, b) => b.per1000 - a.per1000)[0];
      choice = `${passing.length} rows pass; by facts per 1000 added tokens, **${best.name}** goes to 6.11 (${best.per1000.toFixed(2)}).`;
    } else if (!tokenRows.length) {
      const best = [...bRows].sort((a, b) => b.gain - a.gain)[0];
      choice = `${passing.length} neighbour rows pass; by facts gained, **${best.name}** goes to 6.11 (+${best.gain}).`;
    } else choice = `${passing.length} rows pass, of both kinds (${passing.map((p) => p.name).join('; ')}): the rule fixed in advance does not rank a row that adds tokens against one that does not, so the choice goes to the analysis session.`;
    json['candidates-6.7'] = { rows: j, passing, choice };

    cand67.push(
      '## 6.7 candidates: more context per answer',
      '',
      'Named before this section was computed (ai/DECISIONS.md, 27 Nov): k = 15 and 20; (b) the top 5 hits each followed',
      'by the next chunk of the same file, 10 chunks (the remaining slots take the next hits); (c) the top 10 each followed',
      'by the next chunk, up to 20. Each on three bases, compared with the same base at k = 10.',
      '',
      '### Bound for the neighbour rows',
      '',
      'At k = 10, required spans and facts not covered, and how many of them sit in the chunk before or after a top 10 hit',
      'in the same file (line order).',
      '',
      '| base | missed spans | in previous | in next | either | missed facts | in previous | in next | either |',
      '|---|---|---|---|---|---|---|---|---|',
      ...boundRows,
      '',
      '### Rows',
      '',
      `Prompt tokens are counted, not estimated: the served system prompt and \`answerUserPrompt\` through the Qwen`,
      `tokenizer of the served preset (\`${DEFAULT_PRESET}\`), plus ${TEMPLATE_OVERHEAD} tokens of template overhead. Fits: prompt plus`,
      `\`num_predict\` ${preset.numPredict} within \`num_ctx\` ${preset.numCtx}, as the server checks before each call. Added tokens: mean per`,
      'question over the same base at k = 10. Guest Sonnet input is an estimate only: the 4.6e median (13 117 at the',
      'served k = 10) scaled by the ratio of Qwen median prompt tokens. Gain: facts over the same base at k = 10 (questions',
      'gaining / losing). Thresholds: k = 15 at least 6, k = 20 and (c) at least 10, (b) more than 2.',
      '',
      '| row | chunks (mean) | facts | gain | Qwen prompt tokens, median | max | added tokens | facts per 1000 added | fits | guest input, estimate | |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
      ...heads,
      '',
      '### Choice',
      '',
      choice,
      '',
      '### Watched questions: where new facts arrive',
      '',
      'Facts at k = 10, added at ranks 11 to 15 and 16 to 20, and the facts of the (b) and (c) lists.',
      '',
      '| base | id | facts with a span | k = 10 | ranks 11-15 | ranks 16-20 | (b) | (c) |',
      '|---|---|---|---|---|---|---|---|',
      ...watched,
      '',
      'dated-06 on the context index:',
      '',
      ...d06Lines,
      '',
      ...details,
    );
  } else {
    cand67.push('## 6.7 candidates', '', 'Not fetched yet: the context-index bases need `fetch --variant ctx-plain`.', '');
  }

  // Step 6.8: dates and identifiers in the question, and repeated section titles. Detectors, candidates and the rule
  // were fixed before this section was computed (ai/DECISIONS.md, 27 Nov).
  const cand68: string[] = [];
  if (ctxFetched) {
    const dateOf = (id: string) => byId.get(id)!.date;
    const titleOf = (id: string) => byId.get(id)!.title;
    const fullText = (id: string) => `${byId.get(id)!.title}\n${byId.get(id)!.text}`;
    const qById = new Map(golden.map((q) => [q.id, q]));
    const det = new Map(golden.map((q) => [q.id, { dir: detectTemporal(q.question), dates: detectDates(q.question), ids: detectIds(q.question) }]));
    const hasId = (qid: string, cid: string) => det.get(qid)!.ids.some((x) => fullText(cid).includes(x));
    const bm25Order = (qid: string) => views.get('ctx-plain')!.get(qid)!.bm25Full;
    const corpusMatches = (qid: string) => {
      const ids = det.get(qid)!.ids;
      if (!ids.length) return [];
      const all = chunks.filter((c) => hasId(qid, c.id)).map((c) => c.id);
      const rank = new Map(bm25Order(qid).map((id, i) => [id, i]));
      return all.map((id, i) => ({ id, i, r: rank.get(id) ?? Infinity })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.id);
    };
    const bases68: { name: string; key: string; ranked: Record<string, string[]> }[] = [
      { name: '6.10, no reranker', key: 'ctx-first', ranked: lists('ctx-plain', (v) => v.fused) },
      { name: '6.10 top 100', key: 'ctx-100', ranked: poolLists('ctx-plain', 100) },
    ];
    const targetOf = { A: 'dated-', B: 'id-', C: '' } as const;
    type Fam = keyof typeof targetOf;
    const watchedIds = ['dated-04', 'dated-05', 'dated-06', 'id-07'];

    // Detections per question.
    const detRows = golden
      .filter((q) => { const d = det.get(q.id)!; return d.dir || d.dates.length || d.ids.length; })
      .map((q) => { const d = det.get(q.id)!; return `| ${q.id} | ${d.dir ?? '-'} | ${d.dates.join(', ') || '-'} | ${d.ids.join(', ') || '-'} |`; });

    // Bounds.
    const missed = (q: GoldenQuestion, top: string[]) => factSpans(q).spans.filter((sp) => !sp.some((e) => top.some((id) => overlaps(byId.get(id)!, e))));
    const inAny = (sp: Evidence[], ids: string[]) => sp.some((e) => ids.some((id) => overlaps(byId.get(id)!, e)));
    const boundRows: string[] = [];
    const bound: Record<string, Record<Fam | 'B2', number>> = {};
    for (const b of bases68) {
      let aMiss = 0, aIn = 0, bMiss = 0, b1 = 0, b2 = 0;
      for (const q of answerable) {
        const d = det.get(q.id)!;
        const r = b.ranked[q.id];
        const m = missed(q, r.slice(0, 10));
        if (d.dir || d.dates.length) {
          aMiss += m.length;
          const lift = r.slice(10, TEMPORAL_POOL_68).filter((id) => dateOf(id));
          aIn += m.filter((sp) => inAny(sp, lift)).length;
        }
        if (d.ids.length) {
          bMiss += m.length;
          b1 += m.filter((sp) => inAny(sp, r.slice(0, 100).filter((id) => hasId(q.id, id)))).length;
          b2 += m.filter((sp) => inAny(sp, corpusMatches(q.id))).length;
        }
      }
      bound[b.key] = { A: aIn, B: b1, B2: b2, C: Infinity };
      boundRows.push(`| ${b.name} | ${aMiss} | ${aIn} | ${bMiss} | ${b1} | ${b2} |`);
    }

    // Rows.
    interface Row68 { fam: Fam; name: string; key: string; tf: (qid: string, r: string[]) => string[] }
    const rowsDef: Row68[] = [
      ...DATE_WEIGHTS_68.map((w) => ({ fam: 'A' as Fam, name: `A temporal, w_date=${w}`, key: `A${w}`, tf: (qid: string, r: string[]) => temporalReorder(r, dateOf, det.get(qid)!.dir, det.get(qid)!.dates, w) })),
      { fam: 'B', name: 'B1 identifier in top 100', key: 'B1', tf: (qid, r) => (det.get(qid)!.ids.length ? matchFront(r, (id) => hasId(qid, id)) : r) },
      { fam: 'B', name: 'B2 identifier in corpus, 5 first', key: 'B2', tf: (qid, r) => (det.get(qid)!.ids.length ? putFirst(r, corpusMatches(qid)) : r) },
      { fam: 'C', name: `C at most ${TITLE_MAX_68} per section title`, key: 'C', tf: (_qid, r) => capTitles(r, titleOf) },
    ];
    const heads: string[] = [];
    const details: string[] = [];
    const watched: string[] = [];
    const j: Record<string, unknown> = {};
    const result = new Map<string, { gain: number; ok: boolean }>();
    const apply = (b: (typeof bases68)[number], tf: Row68['tf']) => Object.fromEntries(Object.entries(b.ranked).map(([qid, r]) => [qid, tf(qid, r)]));
    const evalRow = (b: (typeof bases68)[number], fam: Fam | 'combined', name: string, l: Record<string, string[]>) => {
      const top = at(l, 10);
      const baseF = factsOf(at(b.ranked, 10));
      const f = factsOf(top);
      const c = factChange(answerable.map((q) => q.id), baseF, f);
      const touched = golden.filter((q) => top[q.id].join() !== b.ranked[q.id].slice(0, 10).join()).length;
      const losers = c.rows.filter((r) => r.cand < r.base);
      const outside = fam === 'A' || fam === 'B' ? losers.filter((r) => !r.id.startsWith(targetOf[fam])) : [];
      const condLoss = fam === 'C' || fam === 'combined' ? losers.length <= 1 && losers.every((r) => r.base - r.cand <= 1) : outside.length === 0;
      const gain = c.cand - c.base;
      return { c, gain, touched, losers, outside, condLoss, ok: gain >= MIN_GAIN_68 && condLoss, f };
    };
    for (const b of bases68) {
      for (const r of rowsDef) {
        const e = evalRow(b, r.fam, r.name, apply(b, r.tf));
        result.set(`${b.key}|${r.key}`, { gain: e.gain, ok: e.ok });
        heads.push(`| ${b.name} | ${r.name} | ${e.touched} | ${e.c.cand} | ${e.gain > 0 ? '+' : ''}${e.gain} (${e.c.gain}/${e.c.loss}) | ${e.outside.map((x) => x.id).join(', ') || (r.fam === 'C' ? `${e.losers.length} losing` : '-')} | ${e.ok ? 'gain met' : e.gain < MIN_GAIN_68 ? 'gain below 3' : 'loss condition'} |`);
        details.push(`### ${b.name}, ${r.name}`, '', ...changeTable(r.name, e.c, 'base'));
        watched.push(`| ${b.name} | ${r.name} | ${watchedIds.map((id) => `${e.f[id]}`).join(' | ')} |`);
        j[`${b.key}|${r.key}`] = { facts: e.c.cand, gain: e.gain, gaining: e.c.gain, losing: e.c.loss, touched: e.touched, outsideLosers: e.outside.map((x) => x.id), ok: e.ok };
      }
    }
    // A must hold at both weights; a family passes on a base if its rule holds.
    const passing: { fam: Fam; base: string; key: string; name: string; gain: number }[] = [];
    for (const b of bases68) {
      const aOk = DATE_WEIGHTS_68.every((w) => result.get(`${b.key}|A${w}`)!.ok);
      for (const r of rowsDef) {
        const ok = r.fam === 'A' ? aOk : result.get(`${b.key}|${r.key}`)!.ok;
        if (ok) passing.push({ fam: r.fam, base: b.key, key: r.key, name: `${b.name}, ${r.name}`, gain: result.get(`${b.key}|${r.key}`)!.gain });
      }
    }
    const famsPassing = [...new Set(passing.map((p) => p.fam))];
    const pathLine: Record<Fam, string> = {
      A: 'A changes retrieval only: after ranking, the top 30 is reordered by chunk metadata dates when the question has a temporal word or a date; no model, no box change apart from deployment.',
      B: 'B changes retrieval only: a verbatim identifier match in the top 100 (B1) or a scan of the corpus text on the server (B2); no model, no box change apart from deployment.',
      C: 'C changes retrieval only: a cap on repeated section titles in the top 10; no model, no box change apart from deployment.',
    };
    const choice: string[] = [];
    if (!passing.length) choice.push('No 6.8 row passes: none goes to 6.11.');
    else {
      for (const fam of famsPassing) {
        const best = passing.filter((p) => p.fam === fam).sort((a, b) => b.gain - a.gain)[0];
        choice.push(`Family ${fam} passes; best row **${best.name}** (+${best.gain}). ${pathLine[fam]}`);
      }
      if (famsPassing.length >= 2) {
        // Combination of the best row of each passing family, on each base, as one extra row.
        for (const b of bases68) {
          const tfs = famsPassing.map((fam) => {
            const best = passing.filter((p) => p.fam === fam).sort((x, y) => y.gain - x.gain)[0];
            return rowsDef.find((r) => r.key === best.key)!.tf;
          });
          const e = evalRow(b, 'combined', 'combined', apply(b, (qid, r) => tfs.reduce((acc, tf) => tf(qid, acc), r)));
          choice.push(`Combination of ${famsPassing.join(' + ')} on ${b.name}: ${e.c.cand} facts, ${e.gain > 0 ? '+' : ''}${e.gain} (${e.c.gain}/${e.c.loss}).`);
          j[`${b.key}|combined`] = { facts: e.c.cand, gain: e.gain, gaining: e.c.gain, losing: e.c.loss };
        }
      } else if (passing.length) {
        const best = [...passing].sort((a, b) => b.gain - a.gain)[0];
        choice.push(`Fourth configuration for 6.11 by the rule: **${best.name}**.`);
      }
    }
    json['candidates-6.8'] = { rows: j, bounds: bound, passing };

    cand68.push(
      '## 6.8 candidates: dates and identifiers in the question, repeated sections (k = 10)',
      '',
      'Named before this section was computed (ai/DECISIONS.md, 27 Nov). Bases: the two 6.11 candidates; served local',
      'is the reference (49 facts). Detectors are general patterns written while knowing the development questions; the',
      'frozen test set (6.12) checks whether they generalise.',
      '',
      '### Detections',
      '',
      'Questions with a temporal word (asc: first, earliest; desc: last, latest, final), a date, or an identifier. Every',
      'other question is unchanged by A and B by construction (dated-05 and id-07 among them).',
      '',
      '| id | temporal | dates | identifiers |',
      '|---|---|---|---|',
      ...detRows,
      '',
      '### Bounds',
      '',
      `Facts missed at k = 10 on the questions each family acts on, and how many it can reach: for A, in a dated chunk at`,
      `ranks 11 to ${TEMPORAL_POOL_68}; for B, in a chunk containing the identifier (top 100 for B1, the corpus for B2). A family below`,
      `${MIN_GAIN_68} cannot pass.`,
      '',
      '| base | A: missed facts | A: reachable | B: missed facts | B1: reachable | B2: reachable |',
      '|---|---|---|---|---|---|',
      ...boundRows,
      '',
      '### Rows',
      '',
      'Touched: questions whose top 10 changes. Gain: facts over the base (questions gaining / losing). Losing outside',
      'the target: for A, questions not dated-*; for B, not id-*; for C the number of losing questions (at most one, by',
      'one fact). A must meet its gain at both weights.',
      '',
      '| base | row | touched | facts | gain | losing outside the target | |',
      '|---|---|---|---|---|---|---|',
      ...heads,
      '',
      '### Choice',
      '',
      ...choice,
      '',
      '### Watched questions (facts at k = 10)',
      '',
      `| base | row | ${watchedIds.join(' | ')} |`,
      `|---|---|${watchedIds.map(() => '---').join('|')}|`,
      ...bases68.map((b) => `| ${b.name} | base | ${watchedIds.map((id) => factsIn(qById.get(id)!, b.ranked[id].slice(0, 10))).join(' | ')} |`),
      ...watched,
      '',
      ...details,
    );
  } else {
    cand68.push('## 6.8 candidates', '', 'Not fetched yet: the context-index bases need `fetch --variant ctx-plain`.', '');
  }

  // Step 6.10: the k = 10 lists of the three 6.11 configurations, for the answer runner (--chunks-file). Written only
  // with --lists-6-11, so a plain report run leaves the committed file alone.
  if (ctxFetched && process.argv.includes('--lists-6-11')) {
    const ids = golden.map((q) => q.id);
    const det = new Map(golden.map((q) => [q.id, detectIds(q.question)]));
    const fullText = (id: string) => `${byId.get(id)!.title}\n${byId.get(id)!.text}`;
    const b2 = (qid: string, r: string[]) => {
      const idents = det.get(qid)!;
      if (!idents.length) return r;
      const rank = new Map(views.get('ctx-plain')!.get(qid)!.bm25Full.map((id, i) => [id, i]));
      const all = chunks.filter((c) => idents.some((x) => fullText(c.id).includes(x))).map((c, i) => ({ id: c.id, i, r: rank.get(c.id) ?? Infinity }));
      return putFirst(r, all.sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.id));
    };
    const ctxFirst = lists('ctx-plain', (v) => v.fused);
    const ctx100 = poolLists('ctx-plain', 100);
    const ctxName = `${setups.get('ctx-plain')!.fs.hybrid.name} index=${setups.get('ctx-plain')!.fs.indexName}`;
    const variants: Record<string, { retrieval: string; facts: number; lists: Record<string, string[]> }> = {};
    const put = (name: string, retrieval: string, l: Record<string, string[]>) => {
      const top = Object.fromEntries(ids.map((id) => [id, l[id].slice(0, 10)]));
      variants[name] = { retrieval, facts: Object.values(factsOf(top)).reduce((a, b) => a + b, 0), lists: top };
    };
    put('served', `${stored.variants.local.retrieval} (served, rerank top 30)`, servedLists('local'));
    put('ctx-first-b2', `${ctxName}, no reranker, exact identifier match over the corpus (6.8 B2, at most ${ID_CORPUS_MAX_68} first)`, Object.fromEntries(ids.map((id) => [id, b2(id, ctxFirst[id])])));
    put('ctx-100', `${ctxName}>${RERANKER}(top100,doc=${RERANK_FORMAT}), reranker sees the contexts`, ctx100);
    const out = `ai/eval/results/2026-11-27-chunk-lists-k10-6-11-golden-v${meta.version.replace('.', '-')}.json`;
    writeFileSync(out, JSON.stringify({ date: '2026-11-27', goldenVersion: meta.version, corpusHash: corpusHash(chunks), k: 10, step: '6.10, lists for the judged runs of 6.11', variants }, null, 1) + '\n');
    console.log(`wrote ${out}: ${Object.entries(variants).map(([n, v]) => `${n} ${v.facts} facts`).join(', ')}`);
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
    '## Upper bound for 6.9: local index, Polish query for BM25, first stage only',
    '',
    'Not a served setting. The local index (`ollama-bge-m3.meta`, no generated context) with the cached Sonnet Polish',
    `rendering (\`${QUERIES_FILE}\`) given to BM25 as "chosen" does, vectors from the cached query vectors, RRF as served.`,
    'Compare with the first-stage rows of "local" (same index, plain question to BM25) and "chosen" (contexts in the index).',
    '',
    '| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |',
    '|---|---|---|---|---|---|',
    ...plRows,
    '',
    '## First stage of 6.10: contexts in the index, plain question',
    '',
    `Not a served setting. The index with the committed Haiku contexts (\`${ctxFs.indexName}\`, the one "chosen" uses),`,
    'BM25 over the same text (chunk, metadata header and context), the plain English question to both, no translation.',
    'No reranker row: the cached scores are for other pools. Compare with "local" (no context) and "chosen" (contexts',
    'plus the Polish query).',
    '',
    '| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |',
    '|---|---|---|---|---|---|',
    ...ctxRows,
    '',
    ...cmp,
    ...cand65,
    ...cand66,
    ...cand67,
    ...cand68,
    '## Where required spans are lost in the first stage',
    '',
    'Required spans not in the fused top 100, and how many of those have no BM25 rank at all (BM25 shares no term with',
    'the chunk). The last column counts every required span with no BM25 rank.',
    '',
    '| first stage | required spans | beyond fused rank 100 | of those, no BM25 rank | no BM25 rank, all |',
    '|---|---|---|---|---|',
    ...lossRows,
    '',
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
      ? fetchRun(arg('--variant') as DiagVariant | undefined)
      : cmd === 'report'
        ? report(arg('--date') ?? new Date().toISOString().slice(0, 10))
        : Promise.reject(new Error('usage: retrieval-diag.ts fetch [--variant local|chosen|ctx-plain] | report [--date YYYY-MM-DD]'));
  run.catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
