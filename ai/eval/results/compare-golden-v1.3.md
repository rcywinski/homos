# Retrieval runs on golden v1.3

Full = any evidence range counts; journal-only = only evidence in `journal/` counts.

All rows share corpus hash `8d7f9a3437b43594`.

| run | retriever | R@5 | R@10 | R@30 | MRR@10 | R@5 journal | R@10 journal | MRR@10 journal |
|---|---|---|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku` | 65% (17/26) | 77% (20/26) | 81% (21/26) | 0.473 | 62% (16/26) | 73% (19/26) | 0.365 |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku` | 62% (16/26) | 77% (20/26) | 85% (22/26) | 0.464 | 62% (16/26) | 73% (19/26) | 0.373 |
| contextual-haiku-run2-hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku-run2` | 62% (16/26) | 73% (19/26) | 77% (20/26) | 0.451 | 58% (15/26) | 65% (17/26) | 0.322 |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku-run2` | 62% (16/26) | 77% (20/26) | 77% (20/26) | 0.468 | 62% (16/26) | 73% (19/26) | 0.346 |
| contextual-sonnet-hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-sonnet` | 58% (15/26) | 69% (18/26) | 69% (18/26) | 0.433 | 54% (14/26) | 65% (17/26) | 0.314 |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-sonnet` | 62% (16/26) | 69% (18/26) | 77% (20/26) | 0.448 | 58% (15/26) | 65% (17/26) | 0.342 |
| hybrid-rerank-1024-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30)` | 50% (13/26) | 58% (15/26) | 65% (17/26) | 0.346 | 38% (10/26) | 50% (13/26) | 0.212 |
| hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30)` | 50% (13/26) | 58% (15/26) | 65% (17/26) | 0.349 | 38% (10/26) | 46% (12/26) | 0.212 |
| hybrid-rerank-meta-1024-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta)` | 54% (14/26) | 58% (15/26) | 65% (17/26) | 0.403 | 42% (11/26) | 50% (13/26) | 0.284 |
| hybrid-rerank-meta-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta)` | 54% (14/26) | 58% (15/26) | 65% (17/26) | 0.403 | 42% (11/26) | 50% (13/26) | 0.284 |
| hybrid-stem-prefix6-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)` | 42% (11/26) | 46% (12/26) | 65% (17/26) | 0.310 | 23% (6/26) | 31% (8/26) | 0.135 |
| meta-index-hybrid-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60) index=ollama-bge-m3.meta` | 42% (11/26) | 58% (15/26) | 69% (18/26) | 0.325 | 23% (6/26) | 42% (11/26) | 0.158 |
| meta-index-hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta` | 62% (16/26) | 65% (17/26) | 69% (18/26) | 0.416 | 50% (13/26) | 58% (15/26) | 0.297 |
| query-pl-hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta` | 62% (16/26) | 69% (18/26) | 77% (20/26) | 0.423 | 58% (15/26) | 65% (17/26) | 0.320 |
| vector-golden-v1-3 | `vector:ollama-bge-m3` | 50% (13/26) | 58% (15/26) | 58% (15/26) | 0.378 | 27% (7/26) | 46% (12/26) | 0.203 |

## Reranker runs

| run | corpus | device | max_length | server ms median | p95 | truncated pairs | tied in a top 10 |
|---|---|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 393.8 | 544.9 | 0/1020 | 7 |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 433.1 | 534.4 | 0/1020 | 7 |
| contextual-haiku-run2-hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 411.2 | 544.5 | 0/1020 | 1 |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 448.4 | 541.7 | 0/1020 | 9 |
| contextual-sonnet-hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 384.5 | 543.4 | 0/1020 | 6 |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 435.9 | 542.7 | 0/1020 | 2 |
| hybrid-rerank-1024-golden-v1-3 | `8d7f9a3437b43594` | cuda | 1024 | 299 | 385.6 | 236/1020 | 7 |
| hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 359.8 | 474.7 | 0/1020 | 5 |
| hybrid-rerank-meta-1024-golden-v1-3 | `8d7f9a3437b43594` | cuda | 1024 | 305.7 | 385 | 254/1020 | 3 |
| hybrid-rerank-meta-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 374.3 | 499.7 | 0/1020 | 3 |
| meta-index-hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 368.2 | 496.4 | 0/1020 | 4 |
| query-pl-hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 396.9 | 494.2 | 0/1020 | 2 |

## why

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-3 | 44% (4/9) | 67% (6/9) | 67% (6/9) | 0.481 | 56% (5/9) |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-3 | 56% (5/9) | 67% (6/9) | 78% (7/9) | 0.574 | 56% (5/9) |
| contextual-haiku-run2-hybrid-rerank-golden-v1-3 | 56% (5/9) | 67% (6/9) | 67% (6/9) | 0.427 | 44% (4/9) |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-3 | 56% (5/9) | 67% (6/9) | 67% (6/9) | 0.463 | 56% (5/9) |
| contextual-sonnet-hybrid-rerank-golden-v1-3 | 56% (5/9) | 67% (6/9) | 67% (6/9) | 0.519 | 56% (5/9) |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-3 | 56% (5/9) | 67% (6/9) | 78% (7/9) | 0.519 | 56% (5/9) |
| hybrid-rerank-1024-golden-v1-3 | 78% (7/9) | 78% (7/9) | 78% (7/9) | 0.491 | 56% (5/9) |
| hybrid-rerank-golden-v1-3 | 78% (7/9) | 78% (7/9) | 78% (7/9) | 0.509 | 56% (5/9) |
| hybrid-rerank-meta-1024-golden-v1-3 | 78% (7/9) | 78% (7/9) | 78% (7/9) | 0.578 | 56% (5/9) |
| hybrid-rerank-meta-golden-v1-3 | 78% (7/9) | 78% (7/9) | 78% (7/9) | 0.578 | 56% (5/9) |
| hybrid-stem-prefix6-golden-v1-3 | 56% (5/9) | 56% (5/9) | 78% (7/9) | 0.417 | 11% (1/9) |
| meta-index-hybrid-golden-v1-3 | 56% (5/9) | 56% (5/9) | 67% (6/9) | 0.411 | 11% (1/9) |
| meta-index-hybrid-rerank-golden-v1-3 | 67% (6/9) | 67% (6/9) | 67% (6/9) | 0.467 | 44% (4/9) |
| query-pl-hybrid-rerank-golden-v1-3 | 67% (6/9) | 67% (6/9) | 78% (7/9) | 0.463 | 56% (5/9) |
| vector-golden-v1-3 | 67% (6/9) | 67% (6/9) | 67% (6/9) | 0.500 | 33% (3/9) |

## dated-fact

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-3 | 60% (6/10) | 70% (7/10) | 80% (8/10) | 0.263 | 70% (7/10) |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-3 | 60% (6/10) | 80% (8/10) | 90% (9/10) | 0.291 | 80% (8/10) |
| contextual-haiku-run2-hybrid-rerank-golden-v1-3 | 50% (5/10) | 60% (6/10) | 70% (7/10) | 0.241 | 60% (6/10) |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-3 | 50% (5/10) | 70% (7/10) | 70% (7/10) | 0.253 | 70% (7/10) |
| contextual-sonnet-hybrid-rerank-golden-v1-3 | 50% (5/10) | 60% (6/10) | 60% (6/10) | 0.246 | 60% (6/10) |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-3 | 60% (6/10) | 60% (6/10) | 70% (7/10) | 0.303 | 60% (6/10) |
| hybrid-rerank-1024-golden-v1-3 | 30% (3/10) | 40% (4/10) | 50% (5/10) | 0.246 | 40% (4/10) |
| hybrid-rerank-golden-v1-3 | 30% (3/10) | 40% (4/10) | 50% (5/10) | 0.237 | 30% (3/10) |
| hybrid-rerank-meta-1024-golden-v1-3 | 30% (3/10) | 40% (4/10) | 50% (5/10) | 0.244 | 40% (4/10) |
| hybrid-rerank-meta-golden-v1-3 | 30% (3/10) | 40% (4/10) | 50% (5/10) | 0.244 | 40% (4/10) |
| hybrid-stem-prefix6-golden-v1-3 | 20% (2/10) | 20% (2/10) | 50% (5/10) | 0.133 | 20% (2/10) |
| meta-index-hybrid-golden-v1-3 | 20% (2/10) | 50% (5/10) | 60% (6/10) | 0.163 | 50% (5/10) |
| meta-index-hybrid-rerank-golden-v1-3 | 50% (5/10) | 60% (6/10) | 60% (6/10) | 0.329 | 60% (6/10) |
| query-pl-hybrid-rerank-golden-v1-3 | 50% (5/10) | 60% (6/10) | 70% (7/10) | 0.336 | 60% (6/10) |
| vector-golden-v1-3 | 30% (3/10) | 40% (4/10) | 40% (4/10) | 0.244 | 40% (4/10) |

## identifier

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| contextual-haiku-hybrid-rerank-golden-v1-3 | 100% (7/7) | 100% (7/7) | 100% (7/7) | 0.762 | 100% (7/7) |
| contextual-haiku-query-pl-hybrid-rerank-golden-v1-3 | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.571 | 86% (6/7) |
| contextual-haiku-run2-hybrid-rerank-golden-v1-3 | 86% (6/7) | 100% (7/7) | 100% (7/7) | 0.782 | 100% (7/7) |
| contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-3 | 86% (6/7) | 100% (7/7) | 100% (7/7) | 0.782 | 100% (7/7) |
| contextual-sonnet-hybrid-rerank-golden-v1-3 | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.589 | 86% (6/7) |
| contextual-sonnet-query-pl-hybrid-rerank-golden-v1-3 | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.565 | 86% (6/7) |
| hybrid-rerank-1024-golden-v1-3 | 43% (3/7) | 57% (4/7) | 71% (5/7) | 0.304 | 57% (4/7) |
| hybrid-rerank-golden-v1-3 | 43% (3/7) | 57% (4/7) | 71% (5/7) | 0.304 | 57% (4/7) |
| hybrid-rerank-meta-1024-golden-v1-3 | 57% (4/7) | 57% (4/7) | 71% (5/7) | 0.405 | 57% (4/7) |
| hybrid-rerank-meta-golden-v1-3 | 57% (4/7) | 57% (4/7) | 71% (5/7) | 0.405 | 57% (4/7) |
| hybrid-stem-prefix6-golden-v1-3 | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.425 | 71% (5/7) |
| meta-index-hybrid-golden-v1-3 | 57% (4/7) | 71% (5/7) | 86% (6/7) | 0.446 | 71% (5/7) |
| meta-index-hybrid-rerank-golden-v1-3 | 71% (5/7) | 71% (5/7) | 86% (6/7) | 0.476 | 71% (5/7) |
| query-pl-hybrid-rerank-golden-v1-3 | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.497 | 86% (6/7) |
| vector-golden-v1-3 | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.413 | 71% (5/7) |
