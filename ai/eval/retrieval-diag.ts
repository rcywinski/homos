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

  // 6.10 against local in the served setting (rerank top 30, k = 10), per question, in facts.
  const cmp: string[] = [];
  if (ctxFetched) {
    const loc = at(servedLists('local'), 10);
    const cand = at(servedLists('ctx-plain'), 10);
    const factsIn = (q: GoldenQuestion, ids: string[]) => factSpans(q).spans.filter((sp) => ids.some((id) => sp.some((e) => overlaps(byId.get(id)!, e)))).length;
    let gain = 0;
    let loss = 0;
    let a = 0;
    let b = 0;
    const rows: string[] = [];
    for (const q of answerable) {
      const x = factsIn(q, loc[q.id]);
      const y = factsIn(q, cand[q.id]);
      a += x;
      b += y;
      if (y > x) gain++;
      if (y < x) loss++;
      if (x !== y) rows.push(`| ${q.id} | ${factSpans(q).spans.length} | ${x} | ${y} | ${y > x ? '+' : ''}${y - x} |`);
    }
    const sl = score(golden, loc, byId);
    const sc = score(golden, cand, byId);
    cmp.push(
      '## 6.10 against local, served setting (rerank top 30, k = 10)',
      '',
      'Both reranked by the cached served call (30 documents). Facts are per question; questions with the same count',
      'are not listed. A candidate, not a result: the decision is a judged two-run comparison on the development set.',
      '',
      '| | recall@5 | recall@10 | MRR@10 | facts covered |',
      '|---|---|---|---|---|',
      `| local (served) | ${sl.r5} | ${sl.r10} | ${sl.mrr} | ${sl.facts} |`,
      `| 6.10 (ctx-plain) | ${sc.r5} | ${sc.r10} | ${sc.mrr} | ${sc.facts} |`,
      '',
      `Facts: local ${a}, 6.10 ${b}; ${gain} questions gain, ${loss} lose.`,
      '',
      '| id | facts with a span | local | 6.10 | change |',
      '|---|---|---|---|---|',
      ...rows,
      '',
    );
    json['ctx-plain-vs-local'] = { local: a, ctxPlain: b, gain, loss };
  } else {
    cmp.push('## 6.10 against local, served setting', '', 'Not fetched yet: run `fetch --variant ctx-plain` in a box window.', '');
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
