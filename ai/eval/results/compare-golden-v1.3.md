# Retrieval runs on golden v1.3

Full = any evidence range counts; journal-only = only evidence in `journal/` counts.

All rows share corpus hash `8d7f9a3437b43594`.

| run | retriever | R@5 | R@10 | R@30 | MRR@10 | R@5 journal | R@10 journal | MRR@10 journal |
|---|---|---|---|---|---|---|---|---|
| hybrid-rerank-1024-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30)` | 50% (13/26) | 58% (15/26) | 65% (17/26) | 0.346 | 38% (10/26) | 50% (13/26) | 0.212 |
| hybrid-rerank-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30)` | 50% (13/26) | 58% (15/26) | 65% (17/26) | 0.349 | 38% (10/26) | 46% (12/26) | 0.212 |
| hybrid-rerank-meta-1024-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta)` | 54% (14/26) | 58% (15/26) | 65% (17/26) | 0.403 | 42% (11/26) | 50% (13/26) | 0.284 |
| hybrid-rerank-meta-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta)` | 54% (14/26) | 58% (15/26) | 65% (17/26) | 0.403 | 42% (11/26) | 50% (13/26) | 0.284 |
| hybrid-stem-prefix6-golden-v1-3 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)` | 42% (11/26) | 46% (12/26) | 65% (17/26) | 0.310 | 23% (6/26) | 31% (8/26) | 0.135 |
| vector-golden-v1-3 | `vector:ollama-bge-m3` | 50% (13/26) | 58% (15/26) | 58% (15/26) | 0.378 | 27% (7/26) | 46% (12/26) | 0.203 |

## Reranker runs

| run | corpus | device | max_length | server ms median | p95 | truncated pairs | tied in a top 10 |
|---|---|---|---|---|---|---|---|
| hybrid-rerank-1024-golden-v1-3 | `8d7f9a3437b43594` | cuda | 1024 | 299 | 385.6 | 236/1020 | 7 |
| hybrid-rerank-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 359.8 | 474.7 | 0/1020 | 5 |
| hybrid-rerank-meta-1024-golden-v1-3 | `8d7f9a3437b43594` | cuda | 1024 | 305.7 | 385 | 254/1020 | 3 |
| hybrid-rerank-meta-golden-v1-3 | `8d7f9a3437b43594` | cuda | 2048 | 374.3 | 499.7 | 0/1020 | 3 |

## why

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| hybrid-rerank-1024-golden-v1-3 | 78% (7/9) | 78% (7/9) | 78% (7/9) | 0.491 | 56% (5/9) |
| hybrid-rerank-golden-v1-3 | 78% (7/9) | 78% (7/9) | 78% (7/9) | 0.509 | 56% (5/9) |
| hybrid-rerank-meta-1024-golden-v1-3 | 78% (7/9) | 78% (7/9) | 78% (7/9) | 0.578 | 56% (5/9) |
| hybrid-rerank-meta-golden-v1-3 | 78% (7/9) | 78% (7/9) | 78% (7/9) | 0.578 | 56% (5/9) |
| hybrid-stem-prefix6-golden-v1-3 | 56% (5/9) | 56% (5/9) | 78% (7/9) | 0.417 | 11% (1/9) |
| vector-golden-v1-3 | 67% (6/9) | 67% (6/9) | 67% (6/9) | 0.500 | 33% (3/9) |

## dated-fact

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| hybrid-rerank-1024-golden-v1-3 | 30% (3/10) | 40% (4/10) | 50% (5/10) | 0.246 | 40% (4/10) |
| hybrid-rerank-golden-v1-3 | 30% (3/10) | 40% (4/10) | 50% (5/10) | 0.237 | 30% (3/10) |
| hybrid-rerank-meta-1024-golden-v1-3 | 30% (3/10) | 40% (4/10) | 50% (5/10) | 0.244 | 40% (4/10) |
| hybrid-rerank-meta-golden-v1-3 | 30% (3/10) | 40% (4/10) | 50% (5/10) | 0.244 | 40% (4/10) |
| hybrid-stem-prefix6-golden-v1-3 | 20% (2/10) | 20% (2/10) | 50% (5/10) | 0.133 | 20% (2/10) |
| vector-golden-v1-3 | 30% (3/10) | 40% (4/10) | 40% (4/10) | 0.244 | 40% (4/10) |

## identifier

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| hybrid-rerank-1024-golden-v1-3 | 43% (3/7) | 57% (4/7) | 71% (5/7) | 0.304 | 57% (4/7) |
| hybrid-rerank-golden-v1-3 | 43% (3/7) | 57% (4/7) | 71% (5/7) | 0.304 | 57% (4/7) |
| hybrid-rerank-meta-1024-golden-v1-3 | 57% (4/7) | 57% (4/7) | 71% (5/7) | 0.405 | 57% (4/7) |
| hybrid-rerank-meta-golden-v1-3 | 57% (4/7) | 57% (4/7) | 71% (5/7) | 0.405 | 57% (4/7) |
| hybrid-stem-prefix6-golden-v1-3 | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.425 | 71% (5/7) |
| vector-golden-v1-3 | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.413 | 71% (5/7) |
