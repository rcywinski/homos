# Stored k=10 lists re-scored on golden v1.4 and v1.5

Produced by `npx tsx ai/eval/rescore.ts`: no API call, no box. Lists: `2026-11-11-chunk-lists-k10-golden-v1-4.json` (made on golden
v1.4). Old golden from git `666b16a`, new from the working tree. Corpus `8d7f9a3437b43594`, 957 chunks.
Answerable questions only. Recall and MRR count any evidence span (required or supporting) as a hit; span coverage
is the share of evidence spans that the 10 chunks cover, for all spans and for required spans (unmarked = required).

| variant | golden | recall@5 | recall@10 | MRR@10 | spans covered, all | spans covered, required |
|---|---|---|---|---|---|---|
| chosen | v1.4 | 65% (17/26) | 77% (20/26) | 0.513 | 34% (64/186) | 34% (64/186) |
| chosen | v1.5 | 69% (18/26) | 81% (21/26) | 0.551 | 35% (66/191) | 34% (62/185) |
| local | v1.4 | 65% (17/26) | 73% (19/26) | 0.485 | 27% (50/186) | 27% (50/186) |
| local | v1.5 | 69% (18/26) | 81% (21/26) | 0.529 | 29% (55/191) | 27% (50/185) |

Retrievers:

- chosen: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku`
- local: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta`

## Questions whose numbers changed

| variant | id | first hit v1.4 | first hit v1.5 | all spans v1.4 | all spans v1.5 | required v1.4 | required v1.5 |
|---|---|---|---|---|---|---|---|
| chosen | dated-01 | - | - | 0/7 | 0/9 | 0/7 | 0/8 |
| chosen | dated-09 | 1 | 1 | 6/9 | 6/9 | 6/9 | 4/7 |
| chosen | id-03 | - | 1 | 0/5 | 2/8 | 0/5 | 0/5 |
| local | dated-01 | - | 7 | 0/7 | 2/9 | 0/7 | 1/8 |
| local | dated-09 | 1 | 1 | 3/9 | 3/9 | 3/9 | 2/7 |
| local | id-03 | - | 1 | 0/5 | 3/8 | 0/5 | 0/5 |
