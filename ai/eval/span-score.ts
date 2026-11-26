/**
 * Span-level scores of ranked chunk lists against the golden set (step 6.2), shared by ai/eval/rescore.ts and the
 * retrieval diagnostic of step 6.3, so both report the same numbers by the same code.
 * Answerable questions only. Headline: recall@5, recall@10 and MRR@10 on required spans, and facts covered in the
 * top 10; also required and all spans covered, and the any-span recall@10 and MRR@10 of golden v1.4.
 */
import type { Chunk } from '../corpus/types';
import { factSpans, overlaps, requiredOnly, type Evidence, type GoldenQuestion } from './golden';
import { firstHitRank, fmtRatio, mrrAt, recallAt } from './metrics';

export interface Score {
  r5: string;
  r10: string;
  mrr: string;
  r10Any: string;
  mrrAny: string;
  all: string;
  req: string;
  facts: string;
  perQ: Map<string, { rank: number | null; span: string; all: string; req: string; facts: string }>;
}

export function coverage(given: Chunk[], spans: Evidence[]): [number, number] {
  return [spans.filter((e) => given.some((c) => overlaps(c, e))).length, spans.length];
}

export function score(golden: GoldenQuestion[], lists: Record<string, string[]>, byId: Map<string, Chunk>): Score {
  const ranks: Array<number | null> = [];
  const anyRanks: Array<number | null> = [];
  let [aHit, aN, rHit, rN, fHit, fN, fNone] = [0, 0, 0, 0, 0, 0, 0];
  const perQ = new Map<string, { rank: number | null; span: string; all: string; req: string; facts: string }>();
  for (const q of golden) {
    if (q.answerable !== 'yes') continue;
    const given = lists[q.id].map((id) => byId.get(id)!);
    const rank = firstHitRank(given, requiredOnly(q.evidence));
    ranks.push(rank);
    anyRanks.push(firstHitRank(given, q.evidence));
    const [ah, an] = coverage(given, q.evidence);
    const [rh, rn] = coverage(given, requiredOnly(q.evidence));
    aHit += ah;
    aN += an;
    rHit += rh;
    rN += rn;
    const fs = factSpans(q);
    fHit += fs.spans.filter((spans) => spans.some((e) => given.some((c) => overlaps(c, e)))).length;
    fN += fs.spans.length;
    fNone += fs.none;
    const qf = factSpans(q);
    const qfHit = qf.spans.filter((spans) => spans.some((e) => given.some((c) => overlaps(c, e)))).length;
    const hit = rank === null ? undefined : requiredOnly(q.evidence).find((e) => overlaps(given[rank - 1], e));
    const span = hit ? `${hit.file.replace(/^journal\/(reports\/)?|^docs\//, '')}:${hit.lines[0]}-${hit.lines[1]}` : '-';
    perQ.set(q.id, { rank, span, all: `${ah}/${an}`, req: `${rh}/${rn}`, facts: `${qfHit}/${qf.spans.length}${qf.none ? `+${qf.none}` : ''}` });
  }
  return {
    r5: fmtRatio(recallAt(ranks, 5)),
    r10: fmtRatio(recallAt(ranks, 10)),
    mrr: mrrAt(ranks, 10).toFixed(3),
    r10Any: fmtRatio(recallAt(anyRanks, 10)),
    mrrAny: mrrAt(anyRanks, 10).toFixed(3),
    all: fmtRatio({ hits: aHit, n: aN }),
    req: fmtRatio({ hits: rHit, n: rN }),
    facts: `${fmtRatio({ hits: fHit, n: fN })}${fNone ? `, ${fNone} with no span` : ''}`,
    perQ,
  };
}

