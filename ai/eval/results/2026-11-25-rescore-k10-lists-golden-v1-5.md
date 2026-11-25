# Stored k=10 lists re-scored on golden v1.4 and v1.5

Produced by `npx tsx ai/eval/rescore.ts`: no API call, no box. Lists: `2026-11-11-chunk-lists-k10-golden-v1-4.json` (made on golden
v1.4). Old golden from git `666b16a`, new from the working tree. Corpus `8d7f9a3437b43594`, 957 chunks.
Answerable questions only. **Headline columns** (used for phase 6 decisions): recall, MRR and span coverage on
required spans only (unmarked = required), so a supporting span added to an item cannot raise them. Second columns:
the same on any span (required or supporting), the v1.4 definition, kept for comparison with earlier results.

| variant | golden | **recall@5, required** | **recall@10, required** | **MRR@10, required** | **spans covered, required** | recall@10, any | MRR@10, any | spans covered, all |
|---|---|---|---|---|---|---|---|---|
| chosen | v1.4 | 65% (17/26) | 77% (20/26) | 0.513 | 34% (64/186) | 77% (20/26) | 0.513 | 34% (64/186) |
| chosen | v1.5 | 65% (17/26) | 77% (20/26) | 0.513 | 34% (62/185) | 81% (21/26) | 0.551 | 35% (66/191) |
| local | v1.4 | 65% (17/26) | 73% (19/26) | 0.485 | 27% (50/186) | 73% (19/26) | 0.485 | 27% (50/186) |
| local | v1.5 | 65% (17/26) | 77% (20/26) | 0.490 | 27% (50/185) | 81% (21/26) | 0.529 | 29% (55/191) |

Retrievers:

- chosen: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku`
- local: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta`

## Questions whose numbers changed

| variant | id | first required hit v1.4 | first required hit v1.5 | all spans v1.4 | all spans v1.5 | required v1.4 | required v1.5 |
|---|---|---|---|---|---|---|---|
| chosen | dated-01 | - | - | 0/7 | 0/9 | 0/7 | 0/8 |
| chosen | dated-09 | 1 | 1 | 6/9 | 6/9 | 6/9 | 4/7 |
| chosen | id-03 | - | - | 0/5 | 2/8 | 0/5 | 0/5 |
| local | dated-01 | - | 7 | 0/7 | 2/9 | 0/7 | 1/8 |
| local | dated-09 | 1 | 1 | 3/9 | 3/9 | 3/9 | 2/7 |
| local | id-03 | - | - | 0/5 | 3/8 | 0/5 | 0/5 |
