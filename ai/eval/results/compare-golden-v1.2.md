# Retrieval runs on golden v1.2

Full = any evidence range counts; journal-only = only evidence in `journal/` counts.

| run | retriever | R@5 | R@10 | R@30 | MRR@10 | R@5 journal | R@10 journal | MRR@10 journal |
|---|---|---|---|---|---|---|---|---|
| baseline-vector-golden-v1-2 | `vector:ollama-bge-m3` | 50% (13/26) | 58% (15/26) | 58% (15/26) | 0.378 | 27% (7/26) | 46% (12/26) | 0.203 |
| bm25-stem-none | `bm25(stem=none)` | 35% (9/26) | 38% (10/26) | 50% (13/26) | 0.252 | 12% (3/26) | 15% (4/26) | 0.071 |
| bm25-stem-prefix6 | `bm25(stem=prefix6)` | 31% (8/26) | 35% (9/26) | 62% (16/26) | 0.220 | 12% (3/26) | 12% (3/26) | 0.048 |
| hybrid-stem-none | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=none),depth=100,c=60)` | 38% (10/26) | 46% (12/26) | 65% (17/26) | 0.322 | 19% (5/26) | 31% (8/26) | 0.130 |
| hybrid-stem-prefix6 | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)` | 42% (11/26) | 46% (12/26) | 65% (17/26) | 0.308 | 23% (6/26) | 31% (8/26) | 0.135 |
| hybrid-stem-prefix6-drop-nie | `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6,drop-nie),depth=100,c=60)` | 42% (11/26) | 46% (12/26) | 65% (17/26) | 0.308 | 23% (6/26) | 31% (8/26) | 0.135 |

## why

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| baseline-vector-golden-v1-2 | 67% (6/9) | 67% (6/9) | 67% (6/9) | 0.500 | 33% (3/9) |
| bm25-stem-none | 44% (4/9) | 56% (5/9) | 56% (5/9) | 0.384 | 0% (0/9) |
| bm25-stem-prefix6 | 33% (3/9) | 44% (4/9) | 56% (5/9) | 0.347 | 0% (0/9) |
| hybrid-stem-none | 56% (5/9) | 56% (5/9) | 78% (7/9) | 0.467 | 11% (1/9) |
| hybrid-stem-prefix6 | 56% (5/9) | 56% (5/9) | 78% (7/9) | 0.411 | 11% (1/9) |
| hybrid-stem-prefix6-drop-nie | 56% (5/9) | 56% (5/9) | 78% (7/9) | 0.411 | 11% (1/9) |

## dated-fact

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| baseline-vector-golden-v1-2 | 30% (3/10) | 40% (4/10) | 40% (4/10) | 0.244 | 40% (4/10) |
| bm25-stem-none | 10% (1/10) | 10% (1/10) | 10% (1/10) | 0.100 | 0% (0/10) |
| bm25-stem-prefix6 | 10% (1/10) | 10% (1/10) | 40% (4/10) | 0.100 | 0% (0/10) |
| hybrid-stem-none | 10% (1/10) | 20% (2/10) | 50% (5/10) | 0.117 | 20% (2/10) |
| hybrid-stem-prefix6 | 20% (2/10) | 20% (2/10) | 50% (5/10) | 0.133 | 20% (2/10) |
| hybrid-stem-prefix6-drop-nie | 20% (2/10) | 20% (2/10) | 50% (5/10) | 0.133 | 20% (2/10) |

## identifier

| run | R@5 | R@10 | R@30 | MRR@10 | R@10 journal |
|---|---|---|---|---|---|
| baseline-vector-golden-v1-2 | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.413 | 71% (5/7) |
| bm25-stem-none | 57% (4/7) | 57% (4/7) | 100% (7/7) | 0.298 | 57% (4/7) |
| bm25-stem-prefix6 | 57% (4/7) | 57% (4/7) | 100% (7/7) | 0.226 | 43% (3/7) |
| hybrid-stem-none | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.429 | 71% (5/7) |
| hybrid-stem-prefix6 | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.425 | 71% (5/7) |
| hybrid-stem-prefix6-drop-nie | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.425 | 71% (5/7) |
