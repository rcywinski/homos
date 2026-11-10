# Retrieval runs on golden v1.4

Full = any evidence range counts; journal-only = only evidence in `journal/` counts.

All rows share corpus hash `8d7f9a3437b43594`.

| run | retriever | R@5 | R@10 | R@30 | MRR@10 | R@5 journal | R@10 journal | MRR@10 journal |
|---|---|---|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku` | 69% (18/26) | 77% (20/26) | 92% (24/26) | 0.547 | 65% (17/26) | 77% (20/26) | 0.426 |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku` | 65% (17/26) | 77% (20/26) | 92% (24/26) | 0.513 | 65% (17/26) | 77% (20/26) | 0.408 |
| contextual-haiku-run2-hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku-run2` | 65% (17/26) | 73% (19/26) | 81% (21/26) | 0.505 | 65% (17/26) | 73% (19/26) | 0.368 |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku-run2` | 69% (18/26) | 81% (21/26) | 88% (23/26) | 0.526 | 69% (18/26) | 81% (21/26) | 0.391 |
| contextual-sonnet-hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-sonnet` | 77% (20/26) | 81% (21/26) | 88% (23/26) | 0.530 | 65% (17/26) | 73% (19/26) | 0.399 |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-sonnet` | 81% (21/26) | 81% (21/26) | 92% (24/26) | 0.546 | 73% (19/26) | 77% (20/26) | 0.417 |
| hybrid-rerank-1024-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30)` | 62% (16/26) | 65% (17/26) | 77% (20/26) | 0.438 | 46% (12/26) | 58% (15/26) | 0.258 |
| hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30)` | 62% (16/26) | 65% (17/26) | 77% (20/26) | 0.441 | 42% (11/26) | 54% (14/26) | 0.255 |
| hybrid-rerank-meta-1024-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta)` | 65% (17/26) | 69% (18/26) | 77% (20/26) | 0.499 | 50% (13/26) | 58% (15/26) | 0.331 |
| hybrid-rerank-meta-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta)` | 65% (17/26) | 69% (18/26) | 77% (20/26) | 0.499 | 50% (13/26) | 58% (15/26) | 0.331 |
| hybrid-stem-prefix6-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)` | 62% (16/26) | 65% (17/26) | 77% (20/26) | 0.454 | 27% (7/26) | 35% (9/26) | 0.180 |
| meta-index-hybrid-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60) index=ollama-bge-m3.meta` | 62% (16/26) | 69% (18/26) | 81% (21/26) | 0.421 | 27% (7/26) | 46% (12/26) | 0.166 |
| meta-index-hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta` | 65% (17/26) | 73% (19/26) | 81% (21/26) | 0.485 | 54% (14/26) | 65% (17/26) | 0.334 |
| query-pl-hybrid-rerank-golden-v1-4 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta` | 65% (17/26) | 77% (20/26) | 81% (21/26) | 0.466 | 58% (15/26) | 73% (19/26) | 0.329 |
| vector-golden-v1-4 | `vector:ollama-bge-m3` | 69% (18/26) | 77% (20/26) | 77% (20/26) | 0.505 | 35% (9/26) | 58% (15/26) | 0.254 |

## Reranker runs

| run | corpus | device | max_length | server ms median | p95 | truncated pairs | tied in a top 10 |
|---|---|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 393.9 | 546.9 | 0/1020 | 7 |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 435.4 | 538.1 | 0/1020 | 7 |
| contextual-haiku-run2-hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 413.2 | 546.2 | 0/1020 | 1 |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 450.7 | 537.8 | 0/1020 | 9 |
| contextual-sonnet-hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 385.2 | 544.6 | 0/1020 | 6 |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 436.8 | 540.8 | 0/1020 | 2 |
| hybrid-rerank-1024-golden-v1-4 | `8d7f9a3437b43594` | cuda | 1024 | 300.4 | 389.8 | 236/1020 | 7 |
| hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 359.5 | 472.5 | 0/1020 | 5 |
| hybrid-rerank-meta-1024-golden-v1-4 | `8d7f9a3437b43594` | cuda | 1024 | 307.3 | 387.7 | 254/1020 | 3 |
| hybrid-rerank-meta-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 376.4 | 502.9 | 0/1020 | 3 |
| meta-index-hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 361.1 | 497.3 | 0/1020 | 4 |
| query-pl-hybrid-rerank-golden-v1-4 | `8d7f9a3437b43594` | cuda | 2048 | 399.4 | 498.9 | 0/1020 | 2 |

## why

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-4 | 56% (5/9) | 67% (6/9) | 89% (8/9) | 0.491 | 67% (6/9) |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-4 | 67% (6/9) | 67% (6/9) | 89% (8/9) | 0.583 | 67% (6/9) |
| contextual-haiku-run2-hybrid-rerank-golden-v1-4 | 56% (5/9) | 67% (6/9) | 78% (7/9) | 0.433 | 67% (6/9) |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-4 | 67% (6/9) | 67% (6/9) | 89% (8/9) | 0.467 | 67% (6/9) |
| contextual-sonnet-hybrid-rerank-golden-v1-4 | 78% (7/9) | 78% (7/9) | 100% (9/9) | 0.550 | 78% (7/9) |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-4 | 78% (7/9) | 78% (7/9) | 100% (9/9) | 0.583 | 78% (7/9) |
| hybrid-rerank-1024-golden-v1-4 | 78% (7/9) | 78% (7/9) | 89% (8/9) | 0.491 | 67% (6/9) |
| hybrid-rerank-golden-v1-4 | 78% (7/9) | 78% (7/9) | 89% (8/9) | 0.509 | 67% (6/9) |
| hybrid-rerank-meta-1024-golden-v1-4 | 78% (7/9) | 78% (7/9) | 89% (8/9) | 0.578 | 67% (6/9) |
| hybrid-rerank-meta-golden-v1-4 | 78% (7/9) | 78% (7/9) | 89% (8/9) | 0.578 | 67% (6/9) |
| hybrid-stem-prefix6-golden-v1-4 | 78% (7/9) | 78% (7/9) | 89% (8/9) | 0.556 | 11% (1/9) |
| meta-index-hybrid-golden-v1-4 | 78% (7/9) | 78% (7/9) | 89% (8/9) | 0.544 | 22% (2/9) |
| meta-index-hybrid-rerank-golden-v1-4 | 67% (6/9) | 78% (7/9) | 89% (8/9) | 0.479 | 67% (6/9) |
| query-pl-hybrid-rerank-golden-v1-4 | 67% (6/9) | 67% (6/9) | 78% (7/9) | 0.463 | 67% (6/9) |
| vector-golden-v1-4 | 89% (8/9) | 100% (9/9) | 100% (9/9) | 0.619 | 56% (5/9) |

## dated-fact

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-4 | 60% (6/10) | 70% (7/10) | 90% (9/10) | 0.379 | 70% (7/10) |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-4 | 60% (6/10) | 80% (8/10) | 100% (10/10) | 0.341 | 80% (8/10) |
| contextual-haiku-run2-hybrid-rerank-golden-v1-4 | 50% (5/10) | 60% (6/10) | 70% (7/10) | 0.291 | 60% (6/10) |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-4 | 50% (5/10) | 80% (8/10) | 80% (8/10) | 0.314 | 80% (8/10) |
| contextual-sonnet-hybrid-rerank-golden-v1-4 | 70% (7/10) | 80% (8/10) | 80% (8/10) | 0.383 | 60% (6/10) |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-4 | 80% (8/10) | 80% (8/10) | 90% (9/10) | 0.412 | 70% (7/10) |
| hybrid-rerank-1024-golden-v1-4 | 60% (6/10) | 60% (6/10) | 70% (7/10) | 0.483 | 50% (5/10) |
| hybrid-rerank-golden-v1-4 | 60% (6/10) | 60% (6/10) | 70% (7/10) | 0.475 | 40% (4/10) |
| hybrid-rerank-meta-1024-golden-v1-4 | 60% (6/10) | 70% (7/10) | 70% (7/10) | 0.494 | 50% (5/10) |
| hybrid-rerank-meta-golden-v1-4 | 60% (6/10) | 70% (7/10) | 70% (7/10) | 0.494 | 50% (5/10) |
| hybrid-stem-prefix6-golden-v1-4 | 50% (5/10) | 50% (5/10) | 70% (7/10) | 0.367 | 30% (3/10) |
| meta-index-hybrid-golden-v1-4 | 50% (5/10) | 60% (6/10) | 70% (7/10) | 0.293 | 50% (5/10) |
| meta-index-hybrid-rerank-golden-v1-4 | 60% (6/10) | 70% (7/10) | 70% (7/10) | 0.496 | 60% (6/10) |
| query-pl-hybrid-rerank-golden-v1-4 | 60% (6/10) | 80% (8/10) | 80% (8/10) | 0.446 | 70% (7/10) |
| vector-golden-v1-4 | 60% (6/10) | 60% (6/10) | 60% (6/10) | 0.467 | 50% (5/10) |

## identifier

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-4 | 100% (7/7) | 100% (7/7) | 100% (7/7) | 0.857 | 100% (7/7) |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-4 | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.667 | 86% (6/7) |
| contextual-haiku-run2-hybrid-rerank-golden-v1-4 | 100% (7/7) | 100% (7/7) | 100% (7/7) | 0.905 | 100% (7/7) |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-4 | 100% (7/7) | 100% (7/7) | 100% (7/7) | 0.905 | 100% (7/7) |
| contextual-sonnet-hybrid-rerank-golden-v1-4 | 86% (6/7) | 86% (6/7) | 86% (6/7) | 0.714 | 86% (6/7) |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-4 | 86% (6/7) | 86% (6/7) | 86% (6/7) | 0.690 | 86% (6/7) |
| hybrid-rerank-1024-golden-v1-4 | 43% (3/7) | 57% (4/7) | 71% (5/7) | 0.304 | 57% (4/7) |
| hybrid-rerank-golden-v1-4 | 43% (3/7) | 57% (4/7) | 71% (5/7) | 0.304 | 57% (4/7) |
| hybrid-rerank-meta-1024-golden-v1-4 | 57% (4/7) | 57% (4/7) | 71% (5/7) | 0.405 | 57% (4/7) |
| hybrid-rerank-meta-golden-v1-4 | 57% (4/7) | 57% (4/7) | 71% (5/7) | 0.405 | 57% (4/7) |
| hybrid-stem-prefix6-golden-v1-4 | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.449 | 71% (5/7) |
| meta-index-hybrid-golden-v1-4 | 57% (4/7) | 71% (5/7) | 86% (6/7) | 0.446 | 71% (5/7) |
| meta-index-hybrid-rerank-golden-v1-4 | 71% (5/7) | 71% (5/7) | 86% (6/7) | 0.476 | 71% (5/7) |
| query-pl-hybrid-rerank-golden-v1-4 | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.497 | 86% (6/7) |
| vector-golden-v1-4 | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.413 | 71% (5/7) |
