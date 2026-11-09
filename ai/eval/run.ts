/**
 * npm run ai:eval -- --label <label>
 * Runs every golden question through a retriever and writes ai/eval/results/<date>-<label>.{json,md}
 * (committed: part of the case study). Every result records the golden version it used.
 *
 * Metrics are over the answerable questions (answerable: "yes"); partial/no questions only get an
 * informational related@10. The markdown lists, per question, the top-5 chunks that are not evidence
 * hits: for human review only. The retriever never adds evidence (golden-meta.json rules).
 */
import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { LocalEmbedder } from '../embed/local';
import { corpusHash, indexPath, readIndex } from '../embed/index-file';
import { VectorStore } from '../store/vector';
import { Bm25Index } from '../store/bm25';
import { HybridRetriever } from '../store/hybrid';
import type { Stem } from '../store/tokenize';
import type { Retriever } from '../store/types';
import { CATEGORIES, overlaps, type GoldenQuestion } from './golden';
import { firstHitRank, fmtRatio, journalOnly, mrrAt, recallAt } from './metrics';

const KS = [5, 10, 30] as const;
const MRR_K = 10;
const TOP_SAVED = 10;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  const label = arg('--label');
  if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error('usage: npm run ai:eval -- --label <lowercase-label>');
  const baseUrl = process.env.INFERENCE_URL;
  if (!baseUrl) throw new Error('INFERENCE_URL is not set');

  const root = process.cwd();
  const chunks = loadCorpus(root);
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const golden = readFileSync('ai/eval/golden.jsonl', 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenQuestion);
  const goldenVersion = (JSON.parse(readFileSync('ai/eval/golden-meta.json', 'utf8')) as { version: string }).version;

  const embedder = new LocalEmbedder({ baseUrl });
  const index = readIndex(indexPath(embedder.name, root), chunks);
  const kind = arg('--retriever') ?? 'vector';
  const stem = (arg('--stem') ?? 'none') as Stem;
  if (!['none', 'prefix6'].includes(stem)) throw new Error('--stem must be none or prefix6');
  const vector = new VectorStore(index.ids, index.vectors, embedder);
  const bm25 = () => new Bm25Index(chunks, { stem, dropNie: process.argv.includes('--drop-nie') });
  const retriever: Retriever =
    kind === 'vector' ? vector : kind === 'bm25' ? bm25() : kind === 'hybrid' ? new HybridRetriever([vector, bm25()]) : (() => {
      throw new Error('--retriever must be vector, bm25 or hybrid');
    })();

  const t0 = Date.now();
  const rankings = await retriever.search(
    golden.map((q) => q.question),
    chunks.length,
  );
  const searchMs = Date.now() - t0;

  const perQuestion = golden.map((q, i) => {
    const ranked = rankings[i].map((h) => byId.get(h.id) as Chunk);
    // BM25 and hybrid return only chunks that scored; a question with no scored chunk has an empty ranking.
    const answerable = q.answerable === 'yes';
    const relatedRank = q.related?.length ? firstHitRank(ranked, q.related) : null;
    const top5 = rankings[i].slice(0, 5).map((h, k) => {
      const c = ranked[k];
      const tag = q.evidence.some((r) => overlaps(c, r)) ? 'hit' : (q.related ?? []).some((r) => overlaps(c, r)) ? 'related' : 'miss';
      return { id: h.id, score: Number(h.score.toFixed(4)), tag, date: c.date ?? null, title: c.title };
    });
    return {
      id: q.id,
      category: q.category,
      answerable: q.answerable,
      question: q.question,
      rank: answerable ? firstHitRank(ranked, q.evidence) : null,
      rankJournal: answerable ? firstHitRank(ranked, journalOnly(q.evidence)) : null,
      relatedRank,
      top: rankings[i].slice(0, TOP_SAVED).map((h) => ({ id: h.id, score: Number(h.score.toFixed(4)) })),
      top5,
    };
  });

  const answerableQs = perQuestion.filter((q) => q.answerable === 'yes');
  const block = (qs: typeof perQuestion, key: 'rank' | 'rankJournal') => {
    const ranks = qs.map((q) => q[key]);
    return {
      ...Object.fromEntries(KS.map((k) => [`recall@${k}`, recallAt(ranks, k)])),
      [`mrr@${MRR_K}`]: Number(mrrAt(ranks, MRR_K).toFixed(3)),
    } as Record<string, { hits: number; n: number } | number>;
  };
  const metrics = {
    full: block(answerableQs, 'rank'),
    journalOnly: block(answerableQs, 'rankJournal'),
    byCategory: Object.fromEntries(
      CATEGORIES.filter((c) => c !== 'no-answer').map((c) => {
        const qs = answerableQs.filter((q) => q.category === c);
        return [c, { full: block(qs, 'rank'), journalOnly: block(qs, 'rankJournal') }];
      }),
    ),
    relatedAt10: recallAt(
      perQuestion.filter((q) => q.answerable !== 'yes' && golden.find((g) => g.id === q.id)?.related?.length).map((q) => q.relatedRank),
      10,
    ),
  };

  const result = {
    label,
    date: localDate(),
    goldenVersion,
    retriever: retriever.name,
    embedder: embedder.name,
    corpusHash: corpusHash(chunks),
    chunkCount: chunks.length,
    questions: { total: golden.length, answerable: answerableQs.length },
    searchMs,
    metrics,
    perQuestion: perQuestion.map(({ top5: _top5, ...rest }) => rest),
  };

  const dir = 'ai/eval/results';
  mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `${result.date}-${label}`);
  if (existsSync(`${base}.json`) && !process.argv.includes('--force'))
    throw new Error(`${base}.json exists; use another label or --force`);
  writeFileSync(`${base}.json`, JSON.stringify(result, null, 2) + '\n');
  const md = renderMarkdown(result, perQuestion);
  writeFileSync(`${base}.md`, md);
  console.log(md);
  console.log(`\nWrote ${base}.json and ${base}.md (search ${searchMs} ms)`);
}

type Block = Record<string, { hits: number; n: number } | number>;
const cell = (b: Block, key: string) => {
  const v = b[key];
  return typeof v === 'number' ? v.toFixed(3) : fmtRatio(v);
};

function renderMarkdown(
  r: { label: string; date: string; goldenVersion: string; retriever: string; corpusHash: string; chunkCount: number; questions: { total: number; answerable: number }; metrics: { full: Block; journalOnly: Block; byCategory: Record<string, { full: Block; journalOnly: Block }>; relatedAt10: { hits: number; n: number } } },
  perQuestion: Array<{ id: string; answerable: string; rank: number | null; rankJournal: number | null; relatedRank: number | null; top5: Array<{ id: string; score: number; tag: string; date: string | null; title: string }> }>,
): string {
  const keys = [...KS.map((k) => `recall@${k}`), `mrr@${MRR_K}`];
  const out: string[] = [];
  out.push(`# Retrieval evaluation: ${r.label}`, '');
  out.push(`Date ${r.date}. Golden set v${r.goldenVersion}. Retriever \`${r.retriever}\`. ${r.chunkCount} chunks, corpus hash \`${r.corpusHash}\`.`);
  out.push(`${r.questions.answerable} answerable questions of ${r.questions.total}: one question = ${(100 / r.questions.answerable).toFixed(1)} pp.`, '');
  out.push('## Metrics', '', `| metric | full | journal-only |`, `|---|---|---|`);
  for (const k of keys) out.push(`| ${k} | ${cell(r.metrics.full, k)} | ${cell(r.metrics.journalOnly, k)} |`);
  out.push('', 'Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.', '');
  out.push('## By category', '', `| category | ${keys.join(' | ')} | recall@10 journal-only |`, `|---|${keys.map(() => '---').join('|')}|---|`);
  for (const [c, b] of Object.entries(r.metrics.byCategory))
    out.push(`| ${c} | ${keys.map((k) => cell(b.full, k)).join(' | ')} | ${cell(b.journalOnly, 'recall@10')} |`);
  out.push('', `Partial/no questions, related chunk in top 10 (informational): ${fmtRatio(r.metrics.relatedAt10)}.`, '');
  out.push('## Per question: first hit and top 5', '', 'For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).', '');
  for (const q of perQuestion) {
    const head = q.answerable === 'yes' ? `first hit: ${q.rank ?? '-'} (journal-only ${q.rankJournal ?? '-'})` : `answerable ${q.answerable}; first related: ${q.relatedRank ?? '-'}`;
    out.push(`**${q.id}**, ${head}`, '');
    for (const t of q.top5) out.push(`- ${t.tag.padEnd(7)} ${t.score.toFixed(3)} \`${t.id}\` ${t.date ?? ''} ${t.title.slice(0, 70)}`);
    out.push('');
  }
  return out.join('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
