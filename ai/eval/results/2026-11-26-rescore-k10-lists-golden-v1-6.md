# Stored k=10 lists re-scored on golden v1.5 and v1.6

Produced by `npx tsx ai/eval/rescore.ts`: no API call, no box. Lists: `2026-11-11-chunk-lists-k10-golden-v1-4.json` (made on golden
v1.4). Old golden from git `c6104b0`, new from the working tree. Corpus `8d7f9a3437b43594`, 957 chunks.
Answerable questions only. **Headline columns** (used for phase 6 decisions): recall and MRR on required spans only
(unmarked = required), so a supporting span added to an item cannot raise them, and **facts covered**: the facts of
the reference with at least one of their spans in the top 10 (a question not yet marked counts each required span
as one fact; facts no span states are counted apart). Other columns: required spans covered (the v1.5 measure)
and the any-span versions (the v1.4 definition), kept for comparison with earlier results.

| variant | golden | **recall@5, required** | **recall@10, required** | **MRR@10, required** | **facts covered** | spans covered, required | recall@10, any | MRR@10, any | spans covered, all |
|---|---|---|---|---|---|---|---|---|---|
| chosen | v1.5 | 65% (17/26) | 77% (20/26) | 0.513 | 34% (62/185) | 34% (62/185) | 81% (21/26) | 0.551 | 35% (66/191) |
| chosen | v1.6 | 62% (16/26) | 77% (20/26) | 0.509 | 34% (57/169), 1 with no span | 33% (60/183) | 81% (21/26) | 0.551 | 33% (66/198) |
| local | v1.5 | 65% (17/26) | 77% (20/26) | 0.490 | 27% (50/185) | 27% (50/185) | 81% (21/26) | 0.529 | 29% (55/191) |
| local | v1.6 | 65% (17/26) | 77% (20/26) | 0.490 | 30% (50/169), 1 with no span | 26% (48/183) | 81% (21/26) | 0.529 | 28% (55/198) |

Retrievers:

- chosen: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku`
- local: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta`

## Questions whose numbers changed

Facts "x/y+z": x of y facts covered, z facts with no span.

| variant | id | first required hit v1.5 | first required hit v1.6 | facts v1.5 | facts v1.6 | required spans v1.5 | required spans v1.6 | all spans v1.5 | all spans v1.6 |
|---|---|---|---|---|---|---|---|---|---|
| chosen | why-01 | 4 | 6 | 4/11 | 2/3 | 4/11 | 2/8 | 4/11 | 4/11 |
| chosen | why-03 | - | - | 0/4 | 0/3 | 0/4 | 0/3 | 0/4 | 0/4 |
| chosen | why-08 | 1 | 1 | 4/9 | 2/5 | 4/9 | 3/7 | 4/9 | 4/9 |
| chosen | why-09 | 1 | 1 | 4/6 | 4/4 | 4/6 | 4/6 | 4/6 | 4/6 |
| chosen | why-10 | 1 | 1 | 2/6 | 2/2+1 | 2/6 | 2/4 | 2/6 | 2/6 |
| chosen | dated-06 | 5 | 5 | 2/10 | 2/13 | 2/10 | 2/13 | 2/10 | 2/13 |
| chosen | dated-07 | 6 | 6 | 1/10 | 1/12 | 1/10 | 1/12 | 1/10 | 1/13 |
| chosen | dated-09 | 1 | 1 | 4/7 | 3/5 | 4/7 | 5/7 | 6/9 | 6/9 |
| chosen | dated-10 | 5 | 5 | 1/5 | 1/5 | 1/5 | 1/6 | 1/5 | 1/6 |
| local | why-01 | 2 | 2 | 4/11 | 2/3 | 4/11 | 2/8 | 4/11 | 4/11 |
| local | why-03 | 9 | 9 | 1/4 | 1/3 | 1/4 | 1/3 | 1/4 | 1/4 |
| local | why-08 | 1 | 1 | 2/9 | 2/5 | 2/9 | 1/7 | 2/9 | 2/9 |
| local | why-09 | 1 | 1 | 2/6 | 4/4 | 2/6 | 2/6 | 2/6 | 2/6 |
| local | why-10 | 5 | 5 | 1/6 | 1/2+1 | 1/6 | 1/4 | 1/6 | 1/6 |
| local | dated-06 | 1 | 1 | 3/10 | 3/13 | 3/10 | 3/13 | 3/10 | 3/13 |
| local | dated-07 | 8 | 8 | 1/10 | 1/12 | 1/10 | 1/12 | 1/10 | 1/13 |
| local | dated-09 | 1 | 1 | 2/7 | 2/5 | 2/7 | 3/7 | 3/9 | 3/9 |
| local | dated-10 | 3 | 3 | 1/5 | 1/5 | 1/5 | 1/6 | 1/5 | 1/6 |
