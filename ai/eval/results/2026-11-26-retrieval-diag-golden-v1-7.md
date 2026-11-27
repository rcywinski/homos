# Retrieval diagnostic, development set (golden v1.7)

Produced by `npx tsx ai/eval/retrieval-diag.ts report` from the cache filled in one box window (`fetch`); no API call.
Corpus `8d7f9a3437b43594`, 957 chunks, 34 questions (26 answerable). Step 6.3.

Recall counts a question as found when a chunk overlapping one of its required spans is in the top k. Spans and
facts covered count every required span (or fact) with an overlapping chunk in the top k. Rerank rows rerank the
first stage's top N with cached scores, ties kept in first-stage order; top 30 uses the served call's scores, the
deeper pools one call of 100 documents. Rows marked "for 6.5" are data for that step, not a decision.

## Check against the stored lists (served setting, rerank top 30, k = 10)

Headline: recall@5, recall@10, MRR@10 (required) and facts covered. The run refuses to write anything if these
differ. A top 10 that differs with the same headline is listed with the chunks that moved.

| variant | stored 11 Nov | now | |
|---|---|---|---|
| local | 65% (17/26), 77% (20/26), 0.471, 38% (49/130), 5 with no span | 65% (17/26), 77% (20/26), 0.471, 38% (49/130), 5 with no span | same |
| chosen | 62% (16/26), 77% (20/26), 0.490, 41% (53/130), 5 with no span | 62% (16/26), 77% (20/26), 0.490, 41% (53/130), 5 with no span | same |

## Coverage by stage

### local

Retriever (as in its baseline run): `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta`. Reranker device cuda, max length 2048.

| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |
|---|---|---|---|---|---|
| first stage, k=5 | 54% (14/26) | - | 17% (29/173) | 27% (35/130), 5 with no span | 18% (35/198) |
| first stage, k=10 | 69% (18/26) | - | 31% (53/173) | 38% (49/130), 5 with no span | 31% (61/198) |
| first stage, k=15 | 81% (21/26) | - | 37% (64/173) | 44% (57/130), 5 with no span | 37% (73/198) |
| first stage, k=20 | 81% (21/26) | - | 38% (65/173) | 44% (57/130), 5 with no span | 38% (76/198) |
| first stage, k=30 | 85% (22/26) | - | 42% (72/173) | 46% (60/130), 5 with no span | 43% (86/198) |
| first stage, k=50 | 92% (24/26) | - | 48% (83/173) | 52% (68/130), 5 with no span | 49% (98/198) |
| first stage, k=100 | 96% (25/26) | - | 63% (109/173) | 63% (82/130), 5 with no span | 65% (129/198) |
| rerank top 30 (served), k=5 | 65% (17/26) | - | 20% (34/173) | 33% (43/130), 5 with no span | 21% (41/198) |
| rerank top 30 (served), k=10 | 77% (20/26) | 0.471 | 27% (46/173) | 38% (49/130), 5 with no span | 28% (55/198) |
| rerank top 30 (served), k=15 | 81% (21/26) | - | 35% (61/173) | 40% (52/130), 5 with no span | 36% (72/198) |
| rerank top 30 (served), k=20 | 81% (21/26) | - | 39% (67/173) | 42% (54/130), 5 with no span | 40% (79/198) |
| rerank top 50 (for 6.5), k=5 | 65% (17/26) | - | 21% (36/173) | 34% (44/130), 5 with no span | 21% (41/198) |
| rerank top 50 (for 6.5), k=10 | 69% (18/26) | 0.476 | 25% (43/173) | 36% (47/130), 5 with no span | 26% (51/198) |
| rerank top 50 (for 6.5), k=15 | 77% (20/26) | - | 36% (62/173) | 41% (53/130), 5 with no span | 36% (71/198) |
| rerank top 50 (for 6.5), k=20 | 77% (20/26) | - | 39% (67/173) | 42% (55/130), 5 with no span | 39% (77/198) |
| rerank top 60 (for 6.5), k=5 | 69% (18/26) | - | 23% (39/173) | 35% (46/130), 5 with no span | 22% (44/198) |
| rerank top 60 (for 6.5), k=10 | 73% (19/26) | 0.528 | 27% (47/173) | 38% (50/130), 5 with no span | 28% (55/198) |
| rerank top 60 (for 6.5), k=15 | 81% (21/26) | - | 38% (65/173) | 42% (55/130), 5 with no span | 37% (74/198) |
| rerank top 60 (for 6.5), k=20 | 81% (21/26) | - | 41% (71/173) | 45% (59/130), 5 with no span | 41% (81/198) |
| rerank top 100 (for 6.5), k=5 | 73% (19/26) | - | 25% (43/173) | 39% (51/130), 5 with no span | 23% (46/198) |
| rerank top 100 (for 6.5), k=10 | 77% (20/26) | 0.558 | 30% (52/173) | 42% (55/130), 5 with no span | 30% (60/198) |
| rerank top 100 (for 6.5), k=15 | 81% (21/26) | - | 37% (64/173) | 43% (56/130), 5 with no span | 37% (73/198) |
| rerank top 100 (for 6.5), k=20 | 85% (22/26) | - | 45% (77/173) | 48% (62/130), 5 with no span | 45% (89/198) |

### chosen

Retriever (as in its baseline run): `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku`. Reranker device cuda, max length 2048.

| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |
|---|---|---|---|---|---|
| first stage, k=5 | 73% (19/26) | - | 25% (44/173) | 36% (47/130), 5 with no span | 26% (52/198) |
| first stage, k=10 | 85% (22/26) | - | 35% (61/173) | 43% (56/130), 5 with no span | 35% (70/198) |
| first stage, k=15 | 88% (23/26) | - | 39% (68/173) | 47% (61/130), 5 with no span | 40% (80/198) |
| first stage, k=20 | 92% (24/26) | - | 44% (76/173) | 52% (67/130), 5 with no span | 45% (90/198) |
| first stage, k=30 | 92% (24/26) | - | 49% (84/173) | 54% (70/130), 5 with no span | 50% (99/198) |
| first stage, k=50 | 96% (25/26) | - | 56% (97/173) | 60% (78/130), 5 with no span | 57% (112/198) |
| first stage, k=100 | 100% (26/26) | - | 69% (119/173) | 73% (95/130), 5 with no span | 69% (136/198) |
| rerank top 30 (served), k=5 | 62% (16/26) | - | 22% (38/173) | 34% (44/130), 5 with no span | 22% (44/198) |
| rerank top 30 (served), k=10 | 77% (20/26) | 0.490 | 34% (58/173) | 41% (53/130), 5 with no span | 33% (66/198) |
| rerank top 30 (served), k=15 | 81% (21/26) | - | 39% (68/173) | 43% (56/130), 5 with no span | 40% (80/198) |
| rerank top 30 (served), k=20 | 85% (22/26) | - | 43% (74/173) | 45% (59/130), 5 with no span | 44% (87/198) |
| rerank top 50 (for 6.5), k=5 | 58% (15/26) | - | 22% (38/173) | 32% (42/130), 5 with no span | 22% (43/198) |
| rerank top 50 (for 6.5), k=10 | 77% (20/26) | 0.488 | 34% (59/173) | 42% (55/130), 5 with no span | 34% (67/198) |
| rerank top 50 (for 6.5), k=15 | 77% (20/26) | - | 39% (67/173) | 42% (55/130), 5 with no span | 38% (76/198) |
| rerank top 50 (for 6.5), k=20 | 85% (22/26) | - | 44% (76/173) | 46% (60/130), 5 with no span | 44% (88/198) |
| rerank top 60 (for 6.5), k=5 | 58% (15/26) | - | 22% (38/173) | 32% (42/130), 5 with no span | 22% (44/198) |
| rerank top 60 (for 6.5), k=10 | 77% (20/26) | 0.488 | 34% (58/173) | 42% (54/130), 5 with no span | 33% (66/198) |
| rerank top 60 (for 6.5), k=15 | 77% (20/26) | - | 39% (67/173) | 43% (56/130), 5 with no span | 38% (76/198) |
| rerank top 60 (for 6.5), k=20 | 77% (20/26) | - | 42% (72/173) | 45% (58/130), 5 with no span | 43% (85/198) |
| rerank top 100 (for 6.5), k=5 | 58% (15/26) | - | 21% (37/173) | 32% (42/130), 5 with no span | 22% (43/198) |
| rerank top 100 (for 6.5), k=10 | 81% (21/26) | 0.503 | 33% (57/173) | 43% (56/130), 5 with no span | 33% (65/198) |
| rerank top 100 (for 6.5), k=15 | 85% (22/26) | - | 41% (71/173) | 46% (60/130), 5 with no span | 40% (80/198) |
| rerank top 100 (for 6.5), k=20 | 85% (22/26) | - | 44% (76/173) | 47% (61/130), 5 with no span | 43% (86/198) |

### ctx-plain

Retriever (step 6.10, not served): `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku, reranker sees the contexts`. Reranker device cuda, max length 2048.

| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |
|---|---|---|---|---|---|
| first stage, k=5 | 73% (19/26) | - | 20% (35/173) | 34% (44/130), 5 with no span | 21% (42/198) |
| first stage, k=10 | 77% (20/26) | - | 34% (59/173) | 43% (56/130), 5 with no span | 35% (69/198) |
| first stage, k=15 | 77% (20/26) | - | 39% (67/173) | 46% (60/130), 5 with no span | 40% (79/198) |
| first stage, k=20 | 85% (22/26) | - | 43% (75/173) | 50% (65/130), 5 with no span | 45% (89/198) |
| first stage, k=30 | 85% (22/26) | - | 46% (79/173) | 51% (66/130), 5 with no span | 48% (96/198) |
| first stage, k=50 | 88% (23/26) | - | 54% (93/173) | 56% (73/130), 5 with no span | 56% (110/198) |
| first stage, k=100 | 100% (26/26) | - | 65% (113/173) | 68% (89/130), 5 with no span | 66% (130/198) |
| rerank top 30 (served), k=5 | 62% (16/26) | - | 23% (40/173) | 35% (46/130), 5 with no span | 24% (47/198) |
| rerank top 30 (served), k=10 | 69% (18/26) | 0.479 | 33% (57/173) | 40% (52/130), 5 with no span | 34% (68/198) |
| rerank top 30 (served), k=15 | 73% (19/26) | - | 37% (64/173) | 42% (54/130), 5 with no span | 38% (76/198) |
| rerank top 30 (served), k=20 | 81% (21/26) | - | 42% (72/173) | 45% (58/130), 5 with no span | 43% (86/198) |
| rerank top 50 (for 6.5), k=5 | 54% (14/26) | - | 22% (38/173) | 35% (45/130), 5 with no span | 23% (45/198) |
| rerank top 50 (for 6.5), k=10 | 73% (19/26) | 0.479 | 34% (58/173) | 42% (55/130), 5 with no span | 35% (69/198) |
| rerank top 50 (for 6.5), k=15 | 77% (20/26) | - | 39% (68/173) | 43% (56/130), 5 with no span | 40% (80/198) |
| rerank top 50 (for 6.5), k=20 | 81% (21/26) | - | 43% (74/173) | 45% (59/130), 5 with no span | 44% (87/198) |
| rerank top 60 (for 6.5), k=5 | 62% (16/26) | - | 24% (41/173) | 37% (48/130), 5 with no span | 24% (48/198) |
| rerank top 60 (for 6.5), k=10 | 81% (21/26) | 0.558 | 34% (58/173) | 43% (56/130), 5 with no span | 33% (66/198) |
| rerank top 60 (for 6.5), k=15 | 85% (22/26) | - | 41% (71/173) | 46% (60/130), 5 with no span | 42% (83/198) |
| rerank top 60 (for 6.5), k=20 | 88% (23/26) | - | 45% (78/173) | 48% (63/130), 5 with no span | 46% (91/198) |
| rerank top 100 (for 6.5), k=5 | 65% (17/26) | - | 24% (41/173) | 36% (47/130), 5 with no span | 23% (46/198) |
| rerank top 100 (for 6.5), k=10 | 85% (22/26) | 0.575 | 35% (60/173) | 46% (60/130), 5 with no span | 34% (68/198) |
| rerank top 100 (for 6.5), k=15 | 85% (22/26) | - | 42% (73/173) | 48% (62/130), 5 with no span | 41% (82/198) |
| rerank top 100 (for 6.5), k=20 | 88% (23/26) | - | 45% (78/173) | 48% (63/130), 5 with no span | 44% (88/198) |

## Upper bound for 6.9: local index, Polish query for BM25, first stage only

Not a served setting. The local index (`ollama-bge-m3.meta`, no generated context) with the cached Sonnet Polish
rendering (`ai/context/queries-pl-sonnet.jsonl`) given to BM25 as "chosen" does, vectors from the cached query vectors, RRF as served.
Compare with the first-stage rows of "local" (same index, plain question to BM25) and "chosen" (contexts in the index).

| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |
|---|---|---|---|---|---|
| first stage, k=5 | 65% (17/26) | - | 23% (39/173) | 30% (39/130), 5 with no span | 22% (43/198) |
| first stage, k=10 | 73% (19/26) | - | 33% (57/173) | 39% (51/130), 5 with no span | 33% (65/198) |
| first stage, k=15 | 81% (21/26) | - | 39% (67/173) | 45% (59/130), 5 with no span | 39% (77/198) |
| first stage, k=20 | 81% (21/26) | - | 40% (69/173) | 46% (60/130), 5 with no span | 41% (81/198) |
| first stage, k=30 | 81% (21/26) | - | 44% (76/173) | 49% (64/130), 5 with no span | 45% (90/198) |
| first stage, k=50 | 92% (24/26) | - | 55% (95/173) | 57% (74/130), 5 with no span | 56% (110/198) |
| first stage, k=100 | 96% (25/26) | - | 63% (109/173) | 64% (83/130), 5 with no span | 64% (126/198) |

## First stage of 6.10: contexts in the index, plain question

Not a served setting. The index with the committed Haiku contexts (`ollama-bge-m3.ctx-haiku`, the one "chosen" uses),
BM25 over the same text (chunk, metadata header and context), the plain English question to both, no translation.
No reranker row: the cached scores are for other pools. Compare with "local" (no context) and "chosen" (contexts
plus the Polish query).

| stage | **recall, required** | MRR@10, required | required spans covered | **facts covered** | all spans covered |
|---|---|---|---|---|---|
| first stage, k=5 | 73% (19/26) | - | 20% (35/173) | 34% (44/130), 5 with no span | 21% (42/198) |
| first stage, k=10 | 77% (20/26) | - | 34% (59/173) | 43% (56/130), 5 with no span | 35% (69/198) |
| first stage, k=15 | 77% (20/26) | - | 39% (67/173) | 46% (60/130), 5 with no span | 40% (79/198) |
| first stage, k=20 | 85% (22/26) | - | 43% (75/173) | 50% (65/130), 5 with no span | 45% (89/198) |
| first stage, k=30 | 85% (22/26) | - | 46% (79/173) | 51% (66/130), 5 with no span | 48% (96/198) |
| first stage, k=50 | 88% (23/26) | - | 54% (93/173) | 56% (73/130), 5 with no span | 56% (110/198) |
| first stage, k=100 | 100% (26/26) | - | 65% (113/173) | 68% (89/130), 5 with no span | 66% (130/198) |

## 6.10 against local, served setting (rerank top 30, k = 10)

Both reranked by the cached served call (30 documents). Facts are per question; questions with the same count
are not listed. A candidate, not a result: the decision is a judged two-run comparison on the development set.

| | recall@5 | recall@10 | MRR@10 | facts covered |
|---|---|---|---|---|
| local (served) | 65% (17/26) | 77% (20/26) | 0.471 | 38% (49/130), 5 with no span |
| 6.10 (ctx-plain) | 62% (16/26) | 69% (18/26) | 0.479 | 40% (52/130), 5 with no span |

Facts: local 49, 6.10 52; 7 questions gain, 4 lose.

| id | facts with a span | local | 6.10 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-10 | 2 | 1 | 0 | -1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-07 | 6 | 0 | 2 | +2 |

## 6.5 candidates against served local (rerank top N, k = 10)

The list was named by the owner before this section was computed: rerank top 50, 60 and 100 on the local index
and on the context index of 6.10 (plain question). The deeper pools use the scores of one 100-document call (at
most 0.0017 from the served call on the same documents, see score stability). Facts per question against the
served local row; questions with the same count are not listed. Candidates, not results: fact coverage chooses
what goes to the judged runs of 6.11, which decide. Reranker time per question at these pools is measured on the
box in the window before 6.11.

| | recall@5 | recall@10 | MRR@10 | facts covered | questions gaining | losing |
|---|---|---|---|---|---|---|
| local (served, top 30) | 65% (17/26) | 77% (20/26) | 0.471 | 38% (49/130), 5 with no span | - | - |
| local top 50 | 65% (17/26) | 69% (18/26) | 0.476 | 36% (47/130), 5 with no span | 2 | 3 |
| local top 60 | 69% (18/26) | 73% (19/26) | 0.528 | 38% (50/130), 5 with no span | 5 | 3 |
| local top 100 | 73% (19/26) | 77% (20/26) | 0.558 | 42% (55/130), 5 with no span | 8 | 3 |
| 6.10 top 50 | 54% (14/26) | 73% (19/26) | 0.479 | 42% (55/130), 5 with no span | 8 | 3 |
| 6.10 top 60 | 62% (16/26) | 81% (21/26) | 0.558 | 43% (56/130), 5 with no span | 10 | 3 |
| 6.10 top 100 | 65% (17/26) | 85% (22/26) | 0.575 | 46% (60/130), 5 with no span | 12 | 2 |

### local top 50

Facts: local 49, local top 50 47; 2 questions gain, 3 lose.

| id | facts with a span | local | local top 50 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-06 | 13 | 3 | 1 | -2 |
| dated-08 | 5 | 4 | 5 | +1 |
| id-02 | 4 | 1 | 2 | +1 |

### local top 60

Facts: local 49, local top 60 50; 5 questions gain, 3 lose.

| id | facts with a span | local | local top 60 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-08 | 5 | 2 | 3 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-06 | 13 | 3 | 1 | -2 |
| dated-08 | 5 | 4 | 5 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-03 | 4 | 0 | 1 | +1 |
| id-04 | 5 | 4 | 5 | +1 |

### local top 100

Facts: local 49, local top 100 55; 8 questions gain, 3 lose.

| id | facts with a span | local | local top 100 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 2 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 2 | +1 |
| dated-06 | 13 | 3 | 1 | -2 |
| dated-07 | 12 | 1 | 0 | -1 |
| dated-08 | 5 | 4 | 5 | +1 |
| id-02 | 4 | 1 | 3 | +2 |
| id-03 | 4 | 0 | 2 | +2 |
| id-04 | 5 | 4 | 5 | +1 |
| id-07 | 6 | 0 | 1 | +1 |

### 6.10 top 50

Facts: local 49, 6.10 top 50 55; 8 questions gain, 3 lose.

| id | facts with a span | local | 6.10 top 50 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-07 | 6 | 0 | 3 | +3 |

### 6.10 top 60

Facts: local 49, 6.10 top 60 56; 10 questions gain, 3 lose.

| id | facts with a span | local | 6.10 top 60 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| why-10 | 2 | 1 | 2 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-05 | 6 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-03 | 4 | 0 | 1 | +1 |
| id-07 | 6 | 0 | 2 | +2 |

### 6.10 top 100

Facts: local 49, 6.10 top 100 60; 12 questions gain, 2 lose.

| id | facts with a span | local | 6.10 top 100 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 2 | +1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| why-10 | 2 | 1 | 2 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 4 | +3 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-05 | 6 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-03 | 4 | 0 | 1 | +1 |
| id-04 | 5 | 4 | 5 | +1 |
| id-07 | 6 | 0 | 2 | +2 |

## 6.6 candidates: no reranker, and the reranker fused with the first stage (k = 10)

Named before this section was computed (owner, 27 Nov; rule in ai/DECISIONS.md): the first stage alone on the
local index and on the context index of 6.10, and a weighted RRF of the reranker order and the first-stage order,
`w/(60 + reranker rank) + (1 - w)/(60 + first-stage rank)`, ties broken by first-stage rank, on rerank pools 30
(served call scores) and 100 (100-document call), on both indexes, at w = 0.5, 0.7 and 0.9. Every grid point is
reported. Facts per question against the served local row; questions with the same count are not listed.

### Check: the fusion at its two ends

On the real data, before any table: w = 0 must give the no-reranker top 10 and w = 1 the reranked top 10 of the
same pool (the served rows at pool 30, the 6.5 rows at pool 100), question by question. The run writes nothing
otherwise.

| index | pool | w = 0 against no reranker | w = 1 against the reranked pool |
|---|---|---|---|
| local | 30 | 34 of 34 same | 34 of 34 same |
| local | 100 | 34 of 34 same | 34 of 34 same |
| 6.10 | 30 | 34 of 34 same | 34 of 34 same |
| 6.10 | 100 | 34 of 34 same | 34 of 34 same |

### Summary

| | reranker documents per question | recall@5 | recall@10 | MRR@10 | facts covered | facts against served | questions gaining | losing |
|---|---|---|---|---|---|---|---|---|
| local (served, top 30) | 30 | 65% (17/26) | 77% (20/26) | 0.471 | 38% (49/130), 5 with no span | - | - | - |
| local, no reranker | 0 | 54% (14/26) | 69% (18/26) | 0.355 | 38% (49/130), 5 with no span | 0 | 5 | 4 |
| 6.10, no reranker | 0 | 73% (19/26) | 77% (20/26) | 0.437 | 43% (56/130), 5 with no span | +7 | 7 | 4 |
| local top 30, fused w=0.5 | 30 | 62% (16/26) | 77% (20/26) | 0.387 | 38% (49/130), 5 with no span | 0 | 3 | 2 |
| local top 30, fused w=0.7 | 30 | 62% (16/26) | 77% (20/26) | 0.422 | 39% (51/130), 5 with no span | +2 | 3 | 1 |
| local top 30, fused w=0.9 | 30 | 65% (17/26) | 77% (20/26) | 0.471 | 38% (49/130), 5 with no span | 0 | 0 | 0 |
| local top 100, fused w=0.5 | 100 | 65% (17/26) | 77% (20/26) | 0.402 | 38% (49/130), 5 with no span | 0 | 3 | 2 |
| local top 100, fused w=0.7 | 100 | 73% (19/26) | 85% (22/26) | 0.504 | 41% (53/130), 5 with no span | +4 | 6 | 1 |
| local top 100, fused w=0.9 | 100 | 73% (19/26) | 77% (20/26) | 0.529 | 42% (55/130), 5 with no span | +6 | 8 | 3 |
| 6.10 top 30, fused w=0.5 | 30 | 69% (18/26) | 77% (20/26) | 0.476 | 42% (54/130), 5 with no span | +5 | 8 | 4 |
| 6.10 top 30, fused w=0.7 | 30 | 62% (16/26) | 69% (18/26) | 0.444 | 41% (53/130), 5 with no span | +4 | 8 | 4 |
| 6.10 top 30, fused w=0.9 | 30 | 62% (16/26) | 69% (18/26) | 0.479 | 41% (53/130), 5 with no span | +4 | 8 | 4 |
| 6.10 top 100, fused w=0.5 | 100 | 65% (17/26) | 69% (18/26) | 0.458 | 42% (54/130), 5 with no span | +5 | 8 | 4 |
| 6.10 top 100, fused w=0.7 | 100 | 62% (16/26) | 81% (21/26) | 0.478 | 46% (60/130), 5 with no span | +11 | 12 | 2 |
| 6.10 top 100, fused w=0.9 | 100 | 62% (16/26) | 85% (22/26) | 0.523 | 47% (61/130), 5 with no span | +12 | 13 | 2 |

### Rule for the fusion rows

A fusion setting goes forward to 6.11 only if it covers more facts than the served row (49) at 2 or more of
the three weights on the same pool and index; a single peak does not.

| index | pool | weights with a gain | |
|---|---|---|---|
| local | 30 | 0.7 | does not |
| local | 100 | 0.7, 0.9 | **goes forward** |
| 6.10 | 30 | 0.5, 0.7, 0.9 | **goes forward** |
| 6.10 | 100 | 0.5, 0.7, 0.9 | **goes forward** |

### Reranker time per question

Only the 30-document time is known (0.585 s per call, step 4.10e); the others are measured on the box in the
window before 6.11. The fusion itself is arithmetic on two lists: no extra call, no measurable time.

| setting | reranker calls | documents scored | reranker time |
|---|---|---|---|
| local (served, top 30) | 1 | 30 | 0.585 s |
| 6.10, no reranker | 0 | 0 | 0 s |
| 6.10 top 100 (6.5) | 1 | 100 | to be measured |

### dated-06, read by hand

Served local carries its 3 facts at reranked ranks 1, 8 and 9 (CONTEXT.md 4411-4441, 2514-2547, 2347-2389; first
stage 15, 26 and 14). With the local pool at 100 the first stays at 1, the other two fall to 21 and 23: the
reranker lifts five HANDOFF.md inbox sections from first-stage ranks 41 to 100 and the next part of the first
entry (CONTEXT.md 4442-4470, first stage 36) into the top 10. On the context index the top 10 is already lost at
pool 30: nine of the ten are the same "pipeline-task.log (tail)" section of morning reports of other dates (lines
51-65), and at pool 100 their "pipeline.log (last run)" sections (lines 31-49) from first-stage ranks 47 to 94
join them, while the required report lines (20 Aug line 48 and others) are not among them. So near-identical
morning reports explain the context index; on the local index it is the coordination inboxes, both from deep in
the first stage.

### local, no reranker

Facts: local 49, local, no reranker 49; 5 questions gain, 4 lose.

| id | facts with a span | local | local, no reranker | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-06 | 4 | 0 | 1 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-09 | 5 | 2 | 4 | +2 |
| id-04 | 5 | 4 | 0 | -4 |
| id-07 | 6 | 0 | 4 | +4 |

### 6.10, no reranker

Facts: local 49, 6.10, no reranker 56; 7 questions gain, 4 lose.

| id | facts with a span | local | 6.10, no reranker | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-06 | 4 | 0 | 1 | +1 |
| why-10 | 2 | 1 | 0 | -1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 1 | -2 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-07 | 6 | 0 | 5 | +5 |

### local top 30, fused w=0.5

Facts: local 49, local top 30, fused w=0.5 49; 3 questions gain, 2 lose.

| id | facts with a span | local | local top 30, fused w=0.5 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| dated-06 | 13 | 3 | 1 | -2 |
| id-07 | 6 | 0 | 1 | +1 |

### local top 30, fused w=0.7

Facts: local 49, local top 30, fused w=0.7 51; 3 questions gain, 1 lose.

| id | facts with a span | local | local top 30, fused w=0.7 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| id-07 | 6 | 0 | 1 | +1 |

### local top 30, fused w=0.9

Facts: local 49, local top 30, fused w=0.9 49; 0 questions gain, 0 lose.

| id | facts with a span | local | local top 30, fused w=0.9 | change |
|---|---|---|---|---|

### local top 100, fused w=0.5

Facts: local 49, local top 100, fused w=0.5 49; 3 questions gain, 2 lose.

| id | facts with a span | local | local top 100, fused w=0.5 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| dated-06 | 13 | 3 | 1 | -2 |
| id-07 | 6 | 0 | 1 | +1 |

### local top 100, fused w=0.7

Facts: local 49, local top 100, fused w=0.7 53; 6 questions gain, 1 lose.

| id | facts with a span | local | local top 100, fused w=0.7 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 2 | +1 |
| dated-06 | 13 | 3 | 1 | -2 |
| dated-08 | 5 | 4 | 5 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-03 | 4 | 0 | 1 | +1 |
| id-04 | 5 | 4 | 5 | +1 |
| id-07 | 6 | 0 | 1 | +1 |

### local top 100, fused w=0.9

Facts: local 49, local top 100, fused w=0.9 55; 8 questions gain, 3 lose.

| id | facts with a span | local | local top 100, fused w=0.9 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 2 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 2 | +1 |
| dated-06 | 13 | 3 | 1 | -2 |
| dated-07 | 12 | 1 | 0 | -1 |
| dated-08 | 5 | 4 | 5 | +1 |
| id-02 | 4 | 1 | 3 | +2 |
| id-03 | 4 | 0 | 2 | +2 |
| id-04 | 5 | 4 | 5 | +1 |
| id-07 | 6 | 0 | 1 | +1 |

### 6.10 top 30, fused w=0.5

Facts: local 49, 6.10 top 30, fused w=0.5 54; 8 questions gain, 4 lose.

| id | facts with a span | local | 6.10 top 30, fused w=0.5 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-06 | 4 | 0 | 1 | +1 |
| why-10 | 2 | 1 | 0 | -1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 1 | -2 |
| dated-07 | 12 | 1 | 2 | +1 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-07 | 6 | 0 | 2 | +2 |

### 6.10 top 30, fused w=0.7

Facts: local 49, 6.10 top 30, fused w=0.7 53; 8 questions gain, 4 lose.

| id | facts with a span | local | 6.10 top 30, fused w=0.7 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-10 | 2 | 1 | 0 | -1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-07 | 12 | 1 | 2 | +1 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-07 | 6 | 0 | 2 | +2 |

### 6.10 top 30, fused w=0.9

Facts: local 49, 6.10 top 30, fused w=0.9 53; 8 questions gain, 4 lose.

| id | facts with a span | local | 6.10 top 30, fused w=0.9 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-10 | 2 | 1 | 0 | -1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-07 | 12 | 1 | 2 | +1 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-07 | 6 | 0 | 2 | +2 |

### 6.10 top 100, fused w=0.5

Facts: local 49, 6.10 top 100, fused w=0.5 54; 8 questions gain, 4 lose.

| id | facts with a span | local | 6.10 top 100, fused w=0.5 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-10 | 2 | 1 | 0 | -1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-07 | 12 | 1 | 2 | +1 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-07 | 6 | 0 | 3 | +3 |

### 6.10 top 100, fused w=0.7

Facts: local 49, 6.10 top 100, fused w=0.7 60; 12 questions gain, 2 lose.

| id | facts with a span | local | 6.10 top 100, fused w=0.7 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 2 | +1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| why-10 | 2 | 1 | 2 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 3 | +2 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-03 | 4 | 0 | 1 | +1 |
| id-04 | 5 | 4 | 5 | +1 |
| id-07 | 6 | 0 | 3 | +3 |

### 6.10 top 100, fused w=0.9

Facts: local 49, 6.10 top 100, fused w=0.9 61; 13 questions gain, 2 lose.

| id | facts with a span | local | 6.10 top 100, fused w=0.9 | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 2 | +1 |
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| why-10 | 2 | 1 | 2 | +1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-02 | 4 | 1 | 4 | +3 |
| dated-04 | 4 | 0 | 1 | +1 |
| dated-05 | 6 | 0 | 1 | +1 |
| dated-06 | 13 | 3 | 0 | -3 |
| dated-09 | 5 | 2 | 3 | +1 |
| id-02 | 4 | 1 | 2 | +1 |
| id-03 | 4 | 0 | 1 | +1 |
| id-04 | 5 | 4 | 5 | +1 |
| id-07 | 6 | 0 | 2 | +2 |

## 6.7 candidates: more context per answer

Named before this section was computed (ai/DECISIONS.md, 27 Nov): k = 15 and 20; (b) the top 5 hits each followed
by the next chunk of the same file, 10 chunks (the remaining slots take the next hits); (c) the top 10 each followed
by the next chunk, up to 20. Each on three bases, compared with the same base at k = 10.

### Bound for the neighbour rows

At k = 10, required spans and facts not covered, and how many of them sit in the chunk before or after a top 10 hit
in the same file (line order).

| base | missed spans | in previous | in next | either | missed facts | in previous | in next | either |
|---|---|---|---|---|---|---|---|---|
| local (served, top 30) | 127 | 5 | 2 | 6 | 81 | 4 | 3 | 5 |
| 6.10, no reranker | 114 | 5 | 2 | 5 | 74 | 4 | 3 | 4 |
| 6.10 top 100 | 113 | 7 | 7 | 13 | 70 | 4 | 5 | 7 |

### Rows

Prompt tokens are counted, not estimated: the served system prompt and `answerUserPrompt` through the Qwen
tokenizer of the served preset (`qwen-p-local`), plus 64 tokens of template overhead. Fits: prompt plus
`num_predict` 2048 within `num_ctx` 17408, as the server checks before each call. Added tokens: mean per
question over the same base at k = 10. Guest Sonnet input is an estimate only: the 4.6e median (13 117 at the
served k = 10) scaled by the ratio of Qwen median prompt tokens. Gain: facts over the same base at k = 10 (questions
gaining / losing). Thresholds: k = 15 at least 6, k = 20 and (c) at least 10, (b) more than 2.

| row | chunks (mean) | facts | gain | Qwen prompt tokens, median | max | added tokens | facts per 1000 added | fits | guest input, estimate | |
|---|---|---|---|---|---|---|---|---|---|---|
| local (served, top 30), k=10 | 10.0 | 49 | - | 9818.5 | 14580 | - | - | 34 of 34 | 13117 | base |
| local (served, top 30), k=15 | 15.0 | 52 | +3 (3/0) | 13633.5 | 21480 | 3940 | 0.76 | 24 of 34 | 18214 | does not fit |
| local (served, top 30), k=20 | 20.0 | 54 | +5 (4/0) | 16429 | 27149 | 7291 | 0.69 | 13 of 34 | 21948 | does not fit |
| local (served, top 30), top 5 + next, 10 chunks | 10.0 | 47 | -2 (2/4) | 8399.5 | 12991 | -856 | - | 34 of 34 | 11221 | no (needs 3) |
| local (served, top 30), top 10 + next, up to 20 | 18.6 | 52 | +3 (2/0) | 17313 | 24665 | 6632 | 0.45 | 14 of 34 | 23129 | does not fit |
| 6.10, no reranker, k=10 | 10.0 | 56 | - | 6775 | 15063 | - | - | 34 of 34 | 9051 | base |
| 6.10, no reranker, k=15 | 15.0 | 60 | +4 (3/0) | 10267 | 21040 | 3352 | 1.19 | 29 of 34 | 13716 | does not fit |
| 6.10, no reranker, k=20 | 20.0 | 65 | +9 (7/0) | 13433 | 26123 | 6860 | 1.31 | 21 of 34 | 17946 | does not fit |
| 6.10, no reranker, top 5 + next, 10 chunks | 10.0 | 50 | -6 (2/7) | 5444 | 14666 | -994 | - | 34 of 34 | 7273 | no (needs 3) |
| 6.10, no reranker, top 10 + next, up to 20 | 18.6 | 59 | +3 (2/0) | 11373 | 28983 | 5114 | 0.59 | 25 of 34 | 15194 | does not fit |
| 6.10 top 100, k=10 | 10.0 | 60 | - | 10796.5 | 14511 | - | - | 34 of 34 | 14424 | base |
| 6.10 top 100, k=15 | 15.0 | 62 | +2 (2/0) | 16327 | 20848 | 5353 | 0.37 | 11 of 34 | 21812 | does not fit |
| 6.10 top 100, k=20 | 20.0 | 63 | +3 (3/0) | 21346 | 27762 | 10337 | 0.29 | 3 of 34 | 28517 | does not fit |
| 6.10 top 100, top 5 + next, 10 chunks | 10.0 | 55 | -5 (2/7) | 10134 | 13318 | -1223 | - | 34 of 34 | 13538 | no (needs 3) |
| 6.10 top 100, top 10 + next, up to 20 | 18.4 | 65 | +5 (4/0) | 17580.5 | 22758 | 6518 | 0.77 | 11 of 34 | 23487 | does not fit |

### Choice

No 6.7 row passes: none goes to 6.11.

### Watched questions: where new facts arrive

Facts at k = 10, added at ranks 11 to 15 and 16 to 20, and the facts of the (b) and (c) lists.

| base | id | facts with a span | k = 10 | ranks 11-15 | ranks 16-20 | (b) | (c) |
|---|---|---|---|---|---|---|---|
| local (served, top 30) | dated-04 | 4 | 0 | +0 | +0 | 0 | 0 |
| local (served, top 30) | dated-05 | 6 | 0 | +0 | +0 | 0 | 0 |
| local (served, top 30) | id-07 | 6 | 0 | +1 | +0 | 0 | 0 |
| local (served, top 30) | dated-06 | 13 | 3 | +0 | +0 | 1 | 3 |
| 6.10, no reranker | dated-04 | 4 | 1 | +0 | +0 | 0 | 1 |
| 6.10, no reranker | dated-05 | 6 | 0 | +0 | +0 | 0 | 0 |
| 6.10, no reranker | id-07 | 6 | 5 | +0 | +0 | 4 | 5 |
| 6.10, no reranker | dated-06 | 13 | 1 | +1 | +0 | 1 | 1 |
| 6.10 top 100 | dated-04 | 4 | 1 | +0 | +0 | 0 | 1 |
| 6.10 top 100 | dated-05 | 6 | 1 | +0 | +0 | 0 | 1 |
| 6.10 top 100 | id-07 | 6 | 2 | +0 | +0 | 1 | 2 |
| 6.10 top 100 | dated-06 | 13 | 0 | +0 | +1 | 1 | 1 |

dated-06 on the context index:

- 6.10, no reranker: of ranks 11 to 20, 6 are pipeline log sections of morning reports of other dates, 1 is from its own reports or evidence (2 of 13 facts at k = 20).
- 6.10 top 100: of ranks 11 to 20, 9 are pipeline log sections of morning reports of other dates, 1 is from its own reports or evidence (1 of 13 facts at k = 20).

### local (served, top 30), k=15 against its k = 10

Facts: k = 10 49, local (served, top 30), k=15 52; 3 questions gain, 0 lose.

| id | facts with a span | k = 10 | local (served, top 30), k=15 | change |
|---|---|---|---|---|
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| id-07 | 6 | 0 | 1 | +1 |

### local (served, top 30), k=20 against its k = 10

Facts: k = 10 49, local (served, top 30), k=20 54; 4 questions gain, 0 lose.

| id | facts with a span | k = 10 | local (served, top 30), k=20 | change |
|---|---|---|---|---|
| why-04 | 4 | 3 | 4 | +1 |
| why-05 | 3 | 2 | 3 | +1 |
| dated-09 | 5 | 2 | 4 | +2 |
| id-07 | 6 | 0 | 1 | +1 |

### local (served, top 30), top 5 + next, 10 chunks against its k = 10

Facts: k = 10 49, local (served, top 30), top 5 + next, 10 chunks 47; 2 questions gain, 4 lose.

| id | facts with a span | k = 10 | local (served, top 30), top 5 + next, 10 chunks | change |
|---|---|---|---|---|
| why-03 | 3 | 1 | 0 | -1 |
| dated-01 | 5 | 1 | 0 | -1 |
| dated-06 | 13 | 3 | 1 | -2 |
| dated-07 | 12 | 1 | 0 | -1 |
| dated-10 | 5 | 1 | 2 | +1 |
| id-05 | 5 | 3 | 5 | +2 |

### local (served, top 30), top 10 + next, up to 20 against its k = 10

Facts: k = 10 49, local (served, top 30), top 10 + next, up to 20 52; 2 questions gain, 0 lose.

| id | facts with a span | k = 10 | local (served, top 30), top 10 + next, up to 20 | change |
|---|---|---|---|---|
| dated-10 | 5 | 1 | 2 | +1 |
| id-05 | 5 | 3 | 5 | +2 |

### 6.10, no reranker, k=15 against its k = 10

Facts: k = 10 56, 6.10, no reranker, k=15 60; 3 questions gain, 0 lose.

| id | facts with a span | k = 10 | 6.10, no reranker, k=15 | change |
|---|---|---|---|---|
| why-08 | 5 | 2 | 3 | +1 |
| dated-06 | 13 | 1 | 2 | +1 |
| dated-10 | 5 | 1 | 3 | +2 |

### 6.10, no reranker, k=20 against its k = 10

Facts: k = 10 56, 6.10, no reranker, k=20 65; 7 questions gain, 0 lose.

| id | facts with a span | k = 10 | 6.10, no reranker, k=20 | change |
|---|---|---|---|---|
| why-02 | 5 | 0 | 1 | +1 |
| why-08 | 5 | 2 | 3 | +1 |
| dated-01 | 5 | 0 | 1 | +1 |
| dated-06 | 13 | 1 | 2 | +1 |
| dated-07 | 12 | 1 | 2 | +1 |
| dated-09 | 5 | 3 | 5 | +2 |
| dated-10 | 5 | 1 | 3 | +2 |

### 6.10, no reranker, top 5 + next, 10 chunks against its k = 10

Facts: k = 10 56, 6.10, no reranker, top 5 + next, 10 chunks 50; 2 questions gain, 7 lose.

| id | facts with a span | k = 10 | 6.10, no reranker, top 5 + next, 10 chunks | change |
|---|---|---|---|---|
| dated-02 | 4 | 3 | 1 | -2 |
| dated-03 | 3 | 3 | 2 | -1 |
| dated-04 | 4 | 1 | 0 | -1 |
| dated-08 | 5 | 4 | 3 | -1 |
| dated-09 | 5 | 3 | 1 | -2 |
| dated-10 | 5 | 1 | 2 | +1 |
| id-05 | 5 | 3 | 5 | +2 |
| id-06 | 6 | 6 | 5 | -1 |
| id-07 | 6 | 5 | 4 | -1 |

### 6.10, no reranker, top 10 + next, up to 20 against its k = 10

Facts: k = 10 56, 6.10, no reranker, top 10 + next, up to 20 59; 2 questions gain, 0 lose.

| id | facts with a span | k = 10 | 6.10, no reranker, top 10 + next, up to 20 | change |
|---|---|---|---|---|
| dated-10 | 5 | 1 | 2 | +1 |
| id-05 | 5 | 3 | 5 | +2 |

### 6.10 top 100, k=15 against its k = 10

Facts: k = 10 60, 6.10 top 100, k=15 62; 2 questions gain, 0 lose.

| id | facts with a span | k = 10 | 6.10 top 100, k=15 | change |
|---|---|---|---|---|
| why-05 | 3 | 2 | 3 | +1 |
| id-02 | 4 | 2 | 3 | +1 |

### 6.10 top 100, k=20 against its k = 10

Facts: k = 10 60, 6.10 top 100, k=20 63; 3 questions gain, 0 lose.

| id | facts with a span | k = 10 | 6.10 top 100, k=20 | change |
|---|---|---|---|---|
| why-05 | 3 | 2 | 3 | +1 |
| dated-06 | 13 | 0 | 1 | +1 |
| id-02 | 4 | 2 | 3 | +1 |

### 6.10 top 100, top 5 + next, 10 chunks against its k = 10

Facts: k = 10 60, 6.10 top 100, top 5 + next, 10 chunks 55; 2 questions gain, 7 lose.

| id | facts with a span | k = 10 | 6.10 top 100, top 5 + next, 10 chunks | change |
|---|---|---|---|---|
| why-10 | 2 | 2 | 1 | -1 |
| dated-04 | 4 | 1 | 0 | -1 |
| dated-05 | 6 | 1 | 0 | -1 |
| dated-06 | 13 | 0 | 1 | +1 |
| dated-07 | 12 | 1 | 0 | -1 |
| dated-09 | 5 | 3 | 1 | -2 |
| dated-10 | 5 | 1 | 0 | -1 |
| id-05 | 5 | 3 | 5 | +2 |
| id-07 | 6 | 2 | 1 | -1 |

### 6.10 top 100, top 10 + next, up to 20 against its k = 10

Facts: k = 10 60, 6.10 top 100, top 10 + next, up to 20 65; 4 questions gain, 0 lose.

| id | facts with a span | k = 10 | 6.10 top 100, top 10 + next, up to 20 | change |
|---|---|---|---|---|
| dated-06 | 13 | 0 | 1 | +1 |
| dated-08 | 5 | 4 | 5 | +1 |
| dated-10 | 5 | 1 | 2 | +1 |
| id-05 | 5 | 3 | 5 | +2 |

## Where required spans are lost in the first stage

Required spans not in the fused top 100, and how many of those have no BM25 rank at all (BM25 shares no term with
the chunk). The last column counts every required span with no BM25 rank.

| first stage | required spans | beyond fused rank 100 | of those, no BM25 rank | no BM25 rank, all |
|---|---|---|---|---|
| local | 173 | 64 | 35 | 39 |
| chosen | 173 | 54 | 4 | 4 |
| local + Polish query for BM25 (6.9) | 173 | 64 | 5 | 5 |
| contexts in the index, plain question (6.10) | 173 | 60 | 21 | 22 |

## Reranker score stability

Largest difference between the served call (30 documents) and the 100-document call on the same 30 documents,
and questions whose top 10 of the served pool changes when ordered by the 100-document scores.

| variant | max score difference | top 10 changed |
|---|---|---|
| local | 0.0012 | 2 of 34 |
| chosen | 0.0017 | 1 of 34 |
| ctx-plain | 0.0016 | 1 of 34 |

## Rank of every required span

First stage: the fused rank as served (RRF of the vector and BM25 top 100 each; "-" when neither list has it), and
the rank in the full vector and BM25 lists (BM25 returns only chunks sharing a term). Rerank: rank after reranking
the top 30 (served) and the top 100. Facts: how many facts of the reference the span states.

| variant | id | required span | facts | fused | vector | BM25 | rerank 30 | rerank 100 |
|---|---|---|---|---|---|---|---|---|
| local | why-01 | CONTEXT.md:96-96 | 1 | - | 380 | - | - | - |
| local | why-01 | CONTEXT.md:103-103 | 1 | - | 207 | 203 | - | - |
| local | why-01 | CONTEXT.md:255-264 | 2 | 85 | 196 | 46 | - | 45 |
| local | why-01 | CONTEXT.md:442-449 | 1 | - | 203 | - | - | - |
| local | why-01 | DECISION-LOG.md:22-22 | 1 | 75 | 436 | 38 | - | 84 |
| local | why-01 | DECISION-LOG.md:28-28 | 1 | 78 | 41 | 103 | - | 64 |
| local | why-01 | CASE-STUDY.md:81-84 | 1 | 2 | 2 | 12 | 2 | 3 |
| local | why-01 | CASE-STUDY.md:56-61 | 1 | 5 | 22 | 7 | 4 | 6 |
| local | why-02 | CONTEXT.md:97-97 | 1 | 127 | 73 | - | - | - |
| local | why-02 | CONTEXT.md:104-104 | 2 | - | 285 | - | - | - |
| local | why-02 | CONTEXT.md:71-73 | 1 | 145 | 85 | 246 | - | - |
| local | why-02 | CONTEXT.md:100-100 | 1 | - | 382 | - | - | - |
| local | why-02 | KAPITAL-REKOMENDACJA.md:17-19 | 1 | - | 378 | - | - | - |
| local | why-02 | DECYZJE-2026-08-26.md:53-55 | 1 | - | 364 | 291 | - | - |
| local | why-02 | DECYZJE-2026-08-26.md:155-157 | 1 | 36 | 7 | 231 | - | 57 |
| local | why-03 | CONTEXT.md:4762-4768 | 2 | 91 | 170 | 51 | - | 2 |
| local | why-03 | CONTEXT.md:1171-1176 | 1 | - | 308 | 338 | - | - |
| local | why-03 | DECYZJE-2026-08-26.md:662-678 | 1 | 30 | 7 | 263 | 9 | 17 |
| local | why-04 | CONTEXT.md:3277-3282 | 1 | 9 | 6 | 20 | 14 | 18 |
| local | why-04 | HANDOFF.md:15-16 | 2 | 13 | 3 | 28 | 4 | 4 |
| local | why-04 | HANDOFF.md:19-24 | 2 | 13 | 3 | 28 | 4 | 4 |
| local | why-04 | AI-WORKFLOW.md:53-55 | 2 | 1 | 1 | 1 | 1 | 1 |
| local | why-05 | CONTEXT.md:3007-3007 | 2 | 27 | 60 | 23 | 16 | 25 |
| local | why-05 | CONTEXT.md:3081-3082 | 2 | 11 | 9 | 24 | 2 | 2 |
| local | why-05 | INFRA.md:3-5 | 2 | 5 | 2 | 12 | 17 | 28 |
| local | why-05 | UI-DESIGN.md:45-48 | 2 | 9 | 12 | 9 | 12 | 19 |
| local | why-06 | DECYZJE-2026-08-26.md:531-543 | 3 | - | 543 | 352 | - | - |
| local | why-06 | CONTEXT.md:99-99 | 2 | - | 748 | - | - | - |
| local | why-06 | CONTEXT.md:3086-3088 | 1 | 36 | 58 | 96 | - | 44 |
| local | why-06 | TASKS-WINDOWS.md:24-24 | 1 | - | 107 | 107 | - | - |
| local | why-06 | CONTEXT.md:3006-3006 | 1 | - | 561 | 422 | - | - |
| local | why-06 | RESEARCH-QUEUE.md:765-766 | 1 | 127 | 673 | 75 | - | - |
| local | why-06 | UI-DESIGN.md:92-93 | 1 | 5 | 1 | 31 | 29 | 71 |
| local | why-08 | CONTEXT.md:3817-3828 | 2 | 26 | 31 | 33 | 1 | 1 |
| local | why-08 | CONTEXT.md:281-284 | 1 | 51 | 5 | 280 | - | 5 |
| local | why-08 | CONTEXT.md:2074-2077 | 1 | - | 177 | 510 | - | - |
| local | why-08 | DECYZJE-2026-08-26.md:549-555 | 1 | 103 | 169 | 71 | - | - |
| local | why-08 | ALGORITHM.md:87-89 | 2 | 1 | 2 | 1 | 23 | 34 |
| local | why-08 | KAPITAL-REKOMENDACJA.md:37-38 | 2 | 32 | 42 | 46 | - | 55 |
| local | why-08 | DECISION-LOG.md:28-28 | 1 | 5 | 22 | 3 | 29 | 72 |
| local | why-09 | CONTEXT.md:96-96 | 3 | - | 121 | 162 | - | - |
| local | why-09 | CONTEXT.md:95-95 | 1 | - | 259 | - | - | - |
| local | why-09 | DECYZJE-2026-08-26.md:549-556 | 1 | 46 | 22 | 138 | - | 5 |
| local | why-09 | DECYZJE-2026-08-26.md:466-482 | 1 | - | 517 | - | - | - |
| local | why-09 | CASE-STUDY.md:52-58 | 3 | 1 | 1 | 1 | 1 | 1 |
| local | why-09 | DECISION-LOG.md:22-22 | 3 | 2 | 2 | 2 | 2 | 2 |
| local | why-10 | CONTEXT.md:1813-1815 | 1 | 131 | 71 | 348 | - | - |
| local | why-10 | CONTEXT.md:4263-4265 | 1 | 99 | 47 | 320 | - | 45 |
| local | why-10 | DECYZJE-2026-08-26.md:546-560 | 1 | 21 | 56 | 39 | 5 | 6 |
| local | why-10 | DECYZJE-2026-08-26.md:637-639 | 1 | 9 | 10 | 38 | 12 | 34 |
| local | dated-01 | DECYZJE-2026-08-26.md:335-348 | 1 | - | 633 | - | - | - |
| local | dated-01 | CONTEXT.md:97-97 | 1 | - | 197 | - | - | - |
| local | dated-01 | CONTEXT.md:2092-2097 | 2 | - | 623 | 136 | - | - |
| local | dated-01 | CONTEXT.md:2156-2167 | 3 | - | 493 | 114 | - | - |
| local | dated-01 | morning-2026-08-29.md:184-186 | 1 | - | 502 | - | - | - |
| local | dated-01 | TASKS-UI.md:1042-1045 | 1 | 52 | 18 | - | - | 19 |
| local | dated-01 | CASE-STUDY.md:145-145 | 1 | 92 | 44 | 139 | - | 55 |
| local | dated-01 | HANDOFF.md:1166-1170 | 1 | 14 | 26 | 100 | 7 | 16 |
| local | dated-02 | CONTEXT.md:1228-1235 | 3 | - | 131 | - | - | - |
| local | dated-02 | CONTEXT.md:294-296 | 1 | 94 | 364 | 47 | - | 5 |
| local | dated-02 | CASE-STUDY.md:81-84 | 1 | 3 | 12 | 11 | 2 | 4 |
| local | dated-02 | DECISION-LOG.md:26-26 | 1 | 7 | 40 | 5 | 14 | 40 |
| local | dated-03 | morning-2026-09-15.md:199-205 | 1 | 9 | 48 | 28 | 10 | 13 |
| local | dated-03 | morning-2026-09-15.md:221-223 | 2 | 6 | 33 | 27 | 3 | 3 |
| local | dated-03 | CONTEXT.md:251-251 | 1 | 4 | 14 | 32 | 1 | 1 |
| local | dated-04 | morning-2026-09-23.md:42-48 | 1 | 48 | 47 | 91 | - | 44 |
| local | dated-04 | CONTEXT.md:177-179 | 1 | - | 672 | 214 | - | - |
| local | dated-04 | CONTEXT.md:19-20 | 1 | - | 385 | - | - | - |
| local | dated-04 | CONTEXT.md:621-622 | 1 | 124 | 82 | 244 | - | - |
| local | dated-04 | CONTEXT.md:774-778 | 1 | - | 214 | 148 | - | - |
| local | dated-05 | CONTEXT.md:91-91 | 1 | 169 | 94 | - | - | - |
| local | dated-05 | CONTEXT.md:3585-3586 | 1 | - | 775 | - | - | - |
| local | dated-05 | CONTEXT.md:3533-3534 | 1 | - | 706 | - | - | - |
| local | dated-05 | CONTEXT.md:3542-3543 | 1 | - | 706 | - | - | - |
| local | dated-05 | CONTEXT.md:2410-2415 | 1 | - | 500 | 137 | - | - |
| local | dated-05 | CONTEXT.md:281-282 | 1 | - | 152 | - | - | - |
| local | dated-06 | CONTEXT.md:4417-4420 | 1 | 15 | 2 | 167 | 1 | 1 |
| local | dated-06 | morning-2026-08-20.md:48-48 | 1 | 110 | 147 | 54 | - | - |
| local | dated-06 | CONTEXT.md:2353-2357 | 1 | 14 | 1 | 145 | 9 | 23 |
| local | dated-06 | CONTEXT.md:4093-4096 | 1 | 156 | 80 | - | - | - |
| local | dated-06 | morning-2026-08-19.md:26-26 | 1 | 163 | 176 | 86 | - | - |
| local | dated-06 | CONTEXT.md:2540-2544 | 1 | 26 | 7 | - | 8 | 21 |
| local | dated-06 | morning-2026-08-26.md:48-48 | 1 | 112 | 107 | 55 | - | - |
| local | dated-06 | CONTEXT.md:2331-2339 | 1 | 97 | 47 | 144 | - | 19 |
| local | dated-06 | CONTEXT.md:757-761 | 1 | 149 | 76 | 136 | - | - |
| local | dated-06 | morning-2026-09-19.md:40-40 | 1 | 130 | 66 | 111 | - | - |
| local | dated-06 | CONTEXT.md:4085-4085 | 1 | 156 | 80 | - | - | - |
| local | dated-06 | CONTEXT.md:4479-4484 | 1 | - | 414 | 186 | - | - |
| local | dated-06 | morning-2026-09-20.md:40-40 | 1 | 161 | 85 | 131 | - | - |
| local | dated-07 | CONTEXT.md:3618-3620 | 1 | - | 412 | - | - | - |
| local | dated-07 | CONTEXT.md:90-90 | 1 | - | 869 | - | - | - |
| local | dated-07 | CONTEXT.md:4300-4302 | 1 | 10 | 31 | 12 | 8 | 13 |
| local | dated-07 | CONTEXT.md:1927-1929 | 1 | - | 225 | 106 | - | - |
| local | dated-07 | CONTEXT.md:1558-1559 | 1 | 39 | 89 | 81 | - | 17 |
| local | dated-07 | CONTEXT.md:1228-1229 | 1 | - | 280 | - | - | - |
| local | dated-07 | CONTEXT.md:883-885 | 1 | 130 | 76 | - | - | - |
| local | dated-07 | CONTEXT.md:321-323 | 1 | - | 221 | - | - | - |
| local | dated-07 | CONTEXT.md:344-346 | 1 | - | 221 | - | - | - |
| local | dated-07 | CONTEXT.md:1023-1023 | 1 | - | 134 | - | - | - |
| local | dated-07 | CONTEXT.md:863-864 | 1 | - | 237 | - | - | - |
| local | dated-07 | HANDOFF.md:131-134 | 1 | - | 314 | - | - | - |
| local | dated-08 | CONTEXT.md:102-102 | 3 | 32 | 15 | - | - | 6 |
| local | dated-08 | CONTEXT.md:216-217 | 1 | 9 | 12 | 27 | 2 | 2 |
| local | dated-08 | CONTEXT.md:101-101 | 2 | 22 | 7 | - | 14 | 20 |
| local | dated-08 | CONTEXT.md:10-16 | 2 | - | 119 | - | - | - |
| local | dated-08 | CASE-STUDY.md:94-98 | 3 | 6 | 8 | 26 | 3 | 3 |
| local | dated-08 | CASE-STUDY.md:145-149 | 1 | 10 | 30 | 24 | 7 | 12 |
| local | dated-09 | CONTEXT.md:294-295 | 1 | 77 | 37 | 131 | - | 18 |
| local | dated-09 | CONTEXT.md:1135-1136 | 1 | 4 | 8 | 18 | 7 | 8 |
| local | dated-09 | CONTEXT.md:255-255 | 1 | 36 | 67 | 44 | - | 30 |
| local | dated-09 | morning-2026-09-17.md:120-120 | 1 | 10 | 23 | 25 | 18 | 26 |
| local | dated-09 | morning-2026-09-17.md:139-139 | 1 | 10 | 23 | 25 | 18 | 26 |
| local | dated-09 | CASE-STUDY.md:81-84 | 1 | 1 | 1 | 1 | 1 | 1 |
| local | dated-09 | DECISION-LOG.md:28-28 | 1 | 2 | 2 | 4 | 4 | 5 |
| local | dated-10 | CONTEXT.md:4165-4165 | 1 | 4 | 3 | 13 | 3 | 4 |
| local | dated-10 | CONTEXT.md:4221-4222 | 1 | - | 204 | 126 | - | - |
| local | dated-10 | morning-2026-08-21.md:191-200 | 1 | 89 | 175 | 51 | - | 76 |
| local | dated-10 | morning-2026-08-22.md:170-176 | 1 | 91 | 128 | 52 | - | 74 |
| local | dated-10 | morning-2026-08-23.md:174-179 | 1 | 93 | 237 | 53 | - | 81 |
| local | dated-10 | morning-2026-08-27.md:222-226 | 1 | 99 | 189 | 58 | - | 79 |
| local | id-01 | TASKS-UI.md:1136-1139 | 2 | 1 | 2 | 1 | 4 | 4 |
| local | id-01 | CONTEXT.md:1907-1911 | 2 | 65 | 113 | 34 | - | 5 |
| local | id-01 | HANDOFF.md:855-857 | 1 | 6 | 1 | 18 | 1 | 1 |
| local | id-01 | CONTEXT.md:1192-1194 | 2 | 40 | 85 | 65 | - | 16 |
| local | id-01 | morning-2026-09-17.md:120-120 | 3 | 4 | 10 | 3 | 13 | 15 |
| local | id-01 | CONTEXT.md:259-259 | 1 | 23 | 52 | 21 | 21 | 29 |
| local | id-01 | morning-2026-09-16.md:104-120 | 4 | 2 | 4 | 6 | 18 | 26 |
| local | id-01 | morning-2026-09-17.md:104-120 | 4 | 4 | 10 | 3 | 13 | 15 |
| local | id-01 | morning-2026-09-18.md:104-120 | 4 | 9 | 25 | 4 | 11 | 13 |
| local | id-01 | morning-2026-09-19.md:104-120 | 4 | 11 | 14 | 13 | 5 | 6 |
| local | id-01 | morning-2026-09-20.md:104-120 | 4 | 7 | 11 | 10 | 8 | 10 |
| local | id-01 | morning-2026-09-21.md:104-120 | 4 | 10 | 16 | 11 | 7 | 9 |
| local | id-01 | morning-2026-09-22.md:104-120 | 4 | 8 | 12 | 12 | 6 | 8 |
| local | id-01 | morning-2026-09-23.md:104-120 | 4 | 3 | 5 | 7 | 20 | 28 |
| local | id-01 | morning-2026-09-17.md:123-139 | 4 | 4 | 10 | 3 | 13 | 15 |
| local | id-01 | morning-2026-09-18.md:123-139 | 4 | 9 | 25 | 4 | 11 | 13 |
| local | id-02 | CONTEXT.md:277-277 | 1 | 71 | 186 | 31 | - | 1 |
| local | id-02 | CONTEXT.md:294-296 | 1 | 71 | 186 | 31 | - | 1 |
| local | id-02 | CONTEXT.md:255-258 | 1 | 42 | 723 | 12 | - | 2 |
| local | id-02 | morning-2026-09-12.md:281-281 | 1 | 12 | 9 | 48 | 14 | 16 |
| local | id-02 | morning-2026-09-13.md:281-281 | 1 | 9 | 6 | 50 | 11 | 13 |
| local | id-02 | morning-2026-09-14.md:281-281 | 1 | 13 | 10 | 49 | 13 | 15 |
| local | id-02 | morning-2026-09-15.md:222-222 | 1 | 18 | 19 | 52 | 12 | 14 |
| local | id-02 | morning-2026-09-16.md:242-242 | 1 | 14 | 14 | 51 | 10 | 12 |
| local | id-02 | morning-2026-09-17.md:261-261 | 1 | 8 | 7 | 45 | 4 | 6 |
| local | id-02 | morning-2026-09-18.md:275-275 | 1 | 10 | 8 | 46 | 3 | 5 |
| local | id-02 | CONTEXT.md:211-213 | 1 | 44 | 604 | 13 | - | 23 |
| local | id-02 | CONTEXT.md:419-420 | 2 | 51 | 216 | 18 | - | 18 |
| local | id-03 | CONTEXT.md:2096-2097 | 1 | 134 | 276 | 76 | - | - |
| local | id-03 | CONTEXT.md:257-258 | 1 | - | 613 | - | - | - |
| local | id-03 | CONTEXT.md:211-212 | 1 | 52 | 538 | 15 | - | 1 |
| local | id-03 | CONTEXT.md:419-420 | 1 | 79 | 453 | 30 | - | 4 |
| local | id-04 | RESEARCH-QUEUE.md:498-507 | 4 | 14 | 100 | 11 | 2 | 5 |
| local | id-04 | CONTEXT.md:262-263 | 1 | 53 | 500 | 22 | - | 1 |
| local | id-04 | CONTEXT.md:273-274 | 1 | 53 | 500 | 22 | - | 1 |
| local | id-04 | CONTEXT.md:1245-1245 | 1 | - | 233 | - | - | - |
| local | id-05 | CONTEXT.md:288-291 | 2 | - | 258 | - | - | - |
| local | id-05 | CONTEXT.md:350-355 | 2 | 9 | 272 | 5 | 1 | 1 |
| local | id-05 | HANDOFF.md:256-257 | 2 | 1 | 1 | 3 | 2 | 2 |
| local | id-05 | CONTEXT.md:264-265 | 1 | 5 | 240 | 2 | 3 | 3 |
| local | id-06 | RESEARCH-QUEUE.md:294-301 | 1 | 10 | 9 | 16 | 2 | 2 |
| local | id-06 | RESEARCH-QUEUE.md:324-324 | 3 | 10 | 9 | 16 | 2 | 2 |
| local | id-06 | CONTEXT.md:482-485 | 1 | 4 | 3 | 4 | 5 | 5 |
| local | id-06 | CONTEXT.md:495-496 | 2 | 4 | 3 | 4 | 5 | 5 |
| local | id-06 | CONTEXT.md:684-694 | 1 | 2 | 2 | 5 | 3 | 3 |
| local | id-06 | CONTEXT.md:461-461 | 1 | 4 | 3 | 4 | 5 | 5 |
| local | id-07 | CONTEXT.md:2994-2994 | 1 | 2 | 2 | 12 | 14 | 37 |
| local | id-07 | DECYZJE-2026-08-26.md:548-548 | 1 | 103 | 573 | 39 | - | - |
| local | id-07 | RESEARCH-QUEUE.md:122-122 | 1 | 73 | 179 | 18 | - | 19 |
| local | id-07 | DB-SCHEMA.md:3-4 | 3 | 3 | 17 | 2 | 29 | 82 |
| local | id-07 | DB-SCHEMA.md:139-145 | 1 | 64 | 277 | 11 | - | 2 |
| local | id-07 | INFRA.md:31-32 | 3 | 66 | 267 | 13 | - | 78 |
| local | id-07 | RESEARCH-QUEUE.md:728-733 | 1 | - | 125 | - | - | - |
| chosen | why-01 | CONTEXT.md:96-96 | 1 | - | 588 | 592 | - | - |
| chosen | why-01 | CONTEXT.md:103-103 | 1 | - | 345 | 245 | - | - |
| chosen | why-01 | CONTEXT.md:255-264 | 2 | 72 | 123 | 32 | - | 29 |
| chosen | why-01 | CONTEXT.md:442-449 | 1 | 79 | 140 | 38 | - | 26 |
| chosen | why-01 | DECISION-LOG.md:22-22 | 1 | - | 368 | 203 | - | - |
| chosen | why-01 | DECISION-LOG.md:28-28 | 1 | 63 | 25 | 391 | - | 80 |
| chosen | why-01 | CASE-STUDY.md:81-84 | 1 | 18 | 4 | 74 | 6 | 6 |
| chosen | why-01 | CASE-STUDY.md:56-61 | 1 | 7 | 9 | 24 | 7 | 7 |
| chosen | why-02 | CONTEXT.md:97-97 | 1 | 90 | 102 | 49 | - | 85 |
| chosen | why-02 | CONTEXT.md:104-104 | 2 | 40 | 207 | 13 | - | 80 |
| chosen | why-02 | CONTEXT.md:71-73 | 1 | - | 122 | 129 | - | - |
| chosen | why-02 | CONTEXT.md:100-100 | 1 | - | 472 | 340 | - | - |
| chosen | why-02 | KAPITAL-REKOMENDACJA.md:17-19 | 1 | - | 203 | 108 | - | - |
| chosen | why-02 | DECYZJE-2026-08-26.md:53-55 | 1 | - | 436 | 161 | - | - |
| chosen | why-02 | DECYZJE-2026-08-26.md:155-157 | 1 | 13 | 18 | 55 | 24 | 65 |
| chosen | why-03 | CONTEXT.md:4762-4768 | 2 | 105 | 157 | 59 | - | - |
| chosen | why-03 | CONTEXT.md:1171-1176 | 1 | - | 360 | 516 | - | - |
| chosen | why-03 | DECYZJE-2026-08-26.md:662-678 | 1 | 50 | 19 | 643 | - | 41 |
| chosen | why-04 | CONTEXT.md:3277-3282 | 1 | 2 | 2 | 2 | 3 | 3 |
| chosen | why-04 | HANDOFF.md:15-16 | 2 | 3 | 3 | 5 | 5 | 5 |
| chosen | why-04 | HANDOFF.md:19-24 | 2 | 3 | 3 | 5 | 5 | 5 |
| chosen | why-04 | AI-WORKFLOW.md:53-55 | 2 | 1 | 1 | 1 | 1 | 1 |
| chosen | why-05 | CONTEXT.md:3007-3007 | 2 | 20 | 64 | 5 | 21 | 35 |
| chosen | why-05 | CONTEXT.md:3081-3082 | 2 | 3 | 11 | 1 | 1 | 1 |
| chosen | why-05 | INFRA.md:3-5 | 2 | 12 | 2 | 52 | 13 | 18 |
| chosen | why-05 | UI-DESIGN.md:45-48 | 2 | 9 | 9 | 25 | 8 | 13 |
| chosen | why-06 | DECYZJE-2026-08-26.md:531-543 | 3 | - | 628 | 232 | - | - |
| chosen | why-06 | CONTEXT.md:99-99 | 2 | - | 724 | 476 | - | - |
| chosen | why-06 | CONTEXT.md:3086-3088 | 1 | 17 | 31 | 42 | 20 | 48 |
| chosen | why-06 | TASKS-WINDOWS.md:24-24 | 1 | 126 | 75 | 180 | - | - |
| chosen | why-06 | CONTEXT.md:3006-3006 | 1 | - | 574 | 549 | - | - |
| chosen | why-06 | RESEARCH-QUEUE.md:765-766 | 1 | 45 | 598 | 14 | - | 51 |
| chosen | why-06 | UI-DESIGN.md:92-93 | 1 | 6 | 1 | 66 | 23 | 55 |
| chosen | why-08 | CONTEXT.md:3817-3828 | 2 | 6 | 4 | 39 | 1 | 1 |
| chosen | why-08 | CONTEXT.md:281-284 | 1 | 41 | 3 | 383 | - | 4 |
| chosen | why-08 | CONTEXT.md:2074-2077 | 1 | - | 206 | 164 | - | - |
| chosen | why-08 | DECYZJE-2026-08-26.md:549-555 | 1 | 101 | 168 | 62 | - | - |
| chosen | why-08 | ALGORITHM.md:87-89 | 2 | 2 | 2 | 8 | 8 | 13 |
| chosen | why-08 | KAPITAL-REKOMENDACJA.md:37-38 | 2 | 3 | 7 | 6 | 6 | 8 |
| chosen | why-08 | DECISION-LOG.md:28-28 | 1 | 20 | 55 | 21 | 27 | 79 |
| chosen | why-09 | CONTEXT.md:96-96 | 3 | 4 | 4 | 5 | 5 | 6 |
| chosen | why-09 | CONTEXT.md:95-95 | 1 | 134 | 219 | 80 | - | - |
| chosen | why-09 | DECYZJE-2026-08-26.md:549-556 | 1 | 28 | 36 | 68 | 9 | 11 |
| chosen | why-09 | DECYZJE-2026-08-26.md:466-482 | 1 | - | 555 | 155 | - | - |
| chosen | why-09 | CASE-STUDY.md:52-58 | 3 | 1 | 1 | 2 | 1 | 1 |
| chosen | why-09 | DECISION-LOG.md:22-22 | 3 | 2 | 2 | 3 | 3 | 3 |
| chosen | why-10 | CONTEXT.md:1813-1815 | 1 | 3 | 25 | 5 | 1 | 2 |
| chosen | why-10 | CONTEXT.md:4263-4265 | 1 | 34 | 140 | 1 | - | 67 |
| chosen | why-10 | DECYZJE-2026-08-26.md:546-560 | 1 | 10 | 89 | 4 | 4 | 7 |
| chosen | why-10 | DECYZJE-2026-08-26.md:637-639 | 1 | 2 | 9 | 10 | 16 | 35 |
| chosen | dated-01 | DECYZJE-2026-08-26.md:335-348 | 1 | 32 | 780 | 9 | - | 80 |
| chosen | dated-01 | CONTEXT.md:97-97 | 1 | - | 567 | 307 | - | - |
| chosen | dated-01 | CONTEXT.md:2092-2097 | 2 | 76 | 814 | 37 | - | 82 |
| chosen | dated-01 | CONTEXT.md:2156-2167 | 3 | - | 721 | 176 | - | - |
| chosen | dated-01 | morning-2026-08-29.md:184-186 | 1 | - | 862 | 461 | - | - |
| chosen | dated-01 | TASKS-UI.md:1042-1045 | 1 | 3 | 39 | 6 | 11 | 38 |
| chosen | dated-01 | CASE-STUDY.md:145-145 | 1 | - | 106 | 475 | - | - |
| chosen | dated-01 | HANDOFF.md:1166-1170 | 1 | - | 222 | 148 | - | - |
| chosen | dated-02 | CONTEXT.md:1228-1235 | 3 | 4 | 10 | 12 | 5 | 9 |
| chosen | dated-02 | CONTEXT.md:294-296 | 1 | 55 | 143 | 28 | - | 6 |
| chosen | dated-02 | CASE-STUDY.md:81-84 | 1 | 7 | 8 | 17 | 8 | 12 |
| chosen | dated-02 | DECISION-LOG.md:26-26 | 1 | 23 | 94 | 13 | 20 | 73 |
| chosen | dated-03 | morning-2026-09-15.md:199-205 | 1 | 25 | 82 | 60 | 9 | 10 |
| chosen | dated-03 | morning-2026-09-15.md:221-223 | 2 | 2 | 4 | 5 | 2 | 2 |
| chosen | dated-03 | CONTEXT.md:251-251 | 1 | 139 | 76 | 129 | - | - |
| chosen | dated-04 | morning-2026-09-23.md:42-48 | 1 | 4 | 24 | 4 | 7 | 8 |
| chosen | dated-04 | CONTEXT.md:177-179 | 1 | 71 | 586 | 30 | - | 66 |
| chosen | dated-04 | CONTEXT.md:19-20 | 1 | - | 442 | - | - | - |
| chosen | dated-04 | CONTEXT.md:621-622 | 1 | - | 131 | 436 | - | - |
| chosen | dated-04 | CONTEXT.md:774-778 | 1 | 45 | 197 | 11 | - | 65 |
| chosen | dated-05 | CONTEXT.md:91-91 | 1 | 17 | 27 | 80 | 28 | 90 |
| chosen | dated-05 | CONTEXT.md:3585-3586 | 1 | - | 857 | 457 | - | - |
| chosen | dated-05 | CONTEXT.md:3533-3534 | 1 | 111 | 793 | 58 | - | - |
| chosen | dated-05 | CONTEXT.md:3542-3543 | 1 | 111 | 793 | 58 | - | - |
| chosen | dated-05 | CONTEXT.md:2410-2415 | 1 | - | 527 | 318 | - | - |
| chosen | dated-05 | CONTEXT.md:281-282 | 1 | 72 | 31 | 184 | - | 8 |
| chosen | dated-06 | CONTEXT.md:4417-4420 | 1 | 1 | 2 | 9 | 5 | 15 |
| chosen | dated-06 | morning-2026-08-20.md:48-48 | 1 | 142 | 77 | 439 | - | - |
| chosen | dated-06 | CONTEXT.md:2353-2357 | 1 | 6 | 7 | 76 | 13 | 42 |
| chosen | dated-06 | CONTEXT.md:4093-4096 | 1 | 84 | 186 | 41 | - | 66 |
| chosen | dated-06 | morning-2026-08-19.md:26-26 | 1 | 158 | 87 | 296 | - | - |
| chosen | dated-06 | CONTEXT.md:2540-2544 | 1 | 2 | 9 | 15 | 11 | 38 |
| chosen | dated-06 | morning-2026-08-26.md:48-48 | 1 | 178 | 98 | 280 | - | - |
| chosen | dated-06 | CONTEXT.md:2331-2339 | 1 | 10 | 99 | 21 | 9 | 36 |
| chosen | dated-06 | CONTEXT.md:757-761 | 1 | 120 | 241 | 63 | - | - |
| chosen | dated-06 | morning-2026-09-19.md:40-40 | 1 | 37 | 14 | 468 | - | 35 |
| chosen | dated-06 | CONTEXT.md:4085-4085 | 1 | 84 | 186 | 41 | - | 66 |
| chosen | dated-06 | CONTEXT.md:4479-4484 | 1 | 94 | 301 | 47 | - | 73 |
| chosen | dated-06 | morning-2026-09-20.md:40-40 | 1 | 65 | 29 | 215 | - | 31 |
| chosen | dated-07 | CONTEXT.md:3618-3620 | 1 | - | 122 | - | - | - |
| chosen | dated-07 | CONTEXT.md:90-90 | 1 | - | 762 | - | - | - |
| chosen | dated-07 | CONTEXT.md:4300-4302 | 1 | 3 | 34 | 2 | 16 | 37 |
| chosen | dated-07 | CONTEXT.md:1927-1929 | 1 | 166 | 310 | 92 | - | - |
| chosen | dated-07 | CONTEXT.md:1558-1559 | 1 | 5 | 32 | 8 | 6 | 7 |
| chosen | dated-07 | CONTEXT.md:1228-1229 | 1 | - | 247 | 439 | - | - |
| chosen | dated-07 | CONTEXT.md:883-885 | 1 | 115 | 65 | 419 | - | - |
| chosen | dated-07 | CONTEXT.md:321-323 | 1 | - | 328 | 315 | - | - |
| chosen | dated-07 | CONTEXT.md:344-346 | 1 | - | 328 | 457 | - | - |
| chosen | dated-07 | CONTEXT.md:1023-1023 | 1 | 107 | 60 | 190 | - | - |
| chosen | dated-07 | CONTEXT.md:863-864 | 1 | - | 143 | 419 | - | - |
| chosen | dated-07 | HANDOFF.md:131-134 | 1 | - | 292 | 462 | - | - |
| chosen | dated-08 | CONTEXT.md:102-102 | 3 | 88 | 130 | 49 | - | 13 |
| chosen | dated-08 | CONTEXT.md:216-217 | 1 | 4 | 18 | 8 | 2 | 2 |
| chosen | dated-08 | CONTEXT.md:101-101 | 2 | 12 | 9 | 58 | 9 | 10 |
| chosen | dated-08 | CONTEXT.md:10-16 | 2 | 23 | 86 | 24 | 3 | 3 |
| chosen | dated-08 | CASE-STUDY.md:94-98 | 3 | 29 | 3 | 146 | 4 | 4 |
| chosen | dated-08 | CASE-STUDY.md:145-149 | 1 | 83 | 46 | 171 | - | 12 |
| chosen | dated-09 | CONTEXT.md:294-295 | 1 | 3 | 8 | 10 | 7 | 11 |
| chosen | dated-09 | CONTEXT.md:1135-1136 | 1 | 8 | 17 | 15 | 4 | 7 |
| chosen | dated-09 | CONTEXT.md:255-255 | 1 | 6 | 32 | 4 | 6 | 10 |
| chosen | dated-09 | morning-2026-09-17.md:120-120 | 1 | 14 | 36 | 16 | 22 | 37 |
| chosen | dated-09 | morning-2026-09-17.md:139-139 | 1 | 14 | 36 | 16 | 22 | 37 |
| chosen | dated-09 | CASE-STUDY.md:81-84 | 1 | 1 | 1 | 3 | 1 | 1 |
| chosen | dated-09 | DECISION-LOG.md:28-28 | 1 | 2 | 2 | 2 | 5 | 8 |
| chosen | dated-10 | CONTEXT.md:4165-4165 | 1 | 5 | 1 | 31 | 5 | 7 |
| chosen | dated-10 | CONTEXT.md:4221-4222 | 1 | 78 | 458 | 26 | - | 30 |
| chosen | dated-10 | morning-2026-08-21.md:191-200 | 1 | 9 | 7 | 38 | 17 | 37 |
| chosen | dated-10 | morning-2026-08-22.md:170-176 | 1 | 17 | 13 | 57 | 29 | 81 |
| chosen | dated-10 | morning-2026-08-23.md:174-179 | 1 | 18 | 14 | 63 | 28 | 80 |
| chosen | dated-10 | morning-2026-08-27.md:222-226 | 1 | 58 | 61 | 82 | - | 52 |
| chosen | id-01 | TASKS-UI.md:1136-1139 | 2 | 2 | 5 | 1 | 13 | 14 |
| chosen | id-01 | CONTEXT.md:1907-1911 | 2 | 57 | 82 | 60 | - | 25 |
| chosen | id-01 | HANDOFF.md:855-857 | 1 | 15 | 14 | 23 | 12 | 12 |
| chosen | id-01 | CONTEXT.md:1192-1194 | 2 | 59 | 94 | 75 | - | 24 |
| chosen | id-01 | morning-2026-09-17.md:120-120 | 3 | 4 | 4 | 7 | 3 | 3 |
| chosen | id-01 | CONTEXT.md:259-259 | 1 | 66 | 128 | 32 | - | 26 |
| chosen | id-01 | morning-2026-09-16.md:104-120 | 4 | 1 | 1 | 4 | 2 | 2 |
| chosen | id-01 | morning-2026-09-17.md:104-120 | 4 | 4 | 4 | 7 | 3 | 3 |
| chosen | id-01 | morning-2026-09-18.md:104-120 | 4 | 3 | 6 | 3 | 6 | 6 |
| chosen | id-01 | morning-2026-09-19.md:104-120 | 4 | 6 | 7 | 6 | 1 | 1 |
| chosen | id-01 | morning-2026-09-20.md:104-120 | 4 | 7 | 2 | 12 | 4 | 4 |
| chosen | id-01 | morning-2026-09-21.md:104-120 | 4 | 8 | 8 | 14 | 7 | 7 |
| chosen | id-01 | morning-2026-09-22.md:104-120 | 4 | 10 | 9 | 13 | 5 | 5 |
| chosen | id-01 | morning-2026-09-23.md:104-120 | 4 | 5 | 3 | 10 | 14 | 15 |
| chosen | id-01 | morning-2026-09-17.md:123-139 | 4 | 4 | 4 | 7 | 3 | 3 |
| chosen | id-01 | morning-2026-09-18.md:123-139 | 4 | 3 | 6 | 3 | 6 | 6 |
| chosen | id-02 | CONTEXT.md:277-277 | 1 | 33 | 98 | 10 | - | 12 |
| chosen | id-02 | CONTEXT.md:294-296 | 1 | 33 | 98 | 10 | - | 12 |
| chosen | id-02 | CONTEXT.md:255-258 | 1 | 91 | 485 | 57 | - | 14 |
| chosen | id-02 | morning-2026-09-12.md:281-281 | 1 | 22 | 26 | 22 | 13 | 20 |
| chosen | id-02 | morning-2026-09-13.md:281-281 | 1 | 26 | 33 | 20 | 9 | 16 |
| chosen | id-02 | morning-2026-09-14.md:281-281 | 1 | 13 | 8 | 21 | 12 | 19 |
| chosen | id-02 | morning-2026-09-15.md:222-222 | 1 | 17 | 20 | 16 | 15 | 22 |
| chosen | id-02 | morning-2026-09-16.md:242-242 | 1 | 2 | 7 | 1 | 1 | 1 |
| chosen | id-02 | morning-2026-09-17.md:261-261 | 1 | 7 | 16 | 8 | 6 | 10 |
| chosen | id-02 | morning-2026-09-18.md:275-275 | 1 | 4 | 14 | 2 | 2 | 2 |
| chosen | id-02 | CONTEXT.md:211-213 | 1 | 107 | 531 | 74 | - | - |
| chosen | id-02 | CONTEXT.md:419-420 | 2 | 38 | 94 | 18 | - | 3 |
| chosen | id-03 | CONTEXT.md:2096-2097 | 1 | 161 | 422 | 96 | - | - |
| chosen | id-03 | CONTEXT.md:257-258 | 1 | - | 314 | 179 | - | - |
| chosen | id-03 | CONTEXT.md:211-212 | 1 | 75 | 434 | 46 | - | 1 |
| chosen | id-03 | CONTEXT.md:419-420 | 1 | 67 | 359 | 39 | - | 4 |
| chosen | id-04 | RESEARCH-QUEUE.md:498-507 | 4 | 1 | 16 | 12 | 1 | 1 |
| chosen | id-04 | CONTEXT.md:262-263 | 1 | 171 | 605 | 93 | - | - |
| chosen | id-04 | CONTEXT.md:273-274 | 1 | 171 | 605 | 93 | - | - |
| chosen | id-04 | CONTEXT.md:1245-1245 | 1 | - | 323 | 458 | - | - |
| chosen | id-05 | CONTEXT.md:288-291 | 2 | - | 617 | 125 | - | - |
| chosen | id-05 | CONTEXT.md:350-355 | 2 | 40 | 538 | 13 | - | 1 |
| chosen | id-05 | HANDOFF.md:256-257 | 2 | 8 | 4 | 43 | 1 | 2 |
| chosen | id-05 | CONTEXT.md:264-265 | 1 | 164 | 664 | 96 | - | - |
| chosen | id-06 | RESEARCH-QUEUE.md:294-301 | 1 | 4 | 6 | 9 | 4 | 4 |
| chosen | id-06 | RESEARCH-QUEUE.md:324-324 | 3 | 4 | 6 | 9 | 4 | 4 |
| chosen | id-06 | CONTEXT.md:482-485 | 1 | 3 | 5 | 8 | 3 | 3 |
| chosen | id-06 | CONTEXT.md:495-496 | 2 | 3 | 5 | 8 | 3 | 3 |
| chosen | id-06 | CONTEXT.md:684-694 | 1 | 2 | 2 | 4 | 2 | 2 |
| chosen | id-06 | CONTEXT.md:461-461 | 1 | 3 | 5 | 8 | 3 | 3 |
| chosen | id-07 | CONTEXT.md:2994-2994 | 1 | 2 | 25 | 10 | 6 | 20 |
| chosen | id-07 | DECYZJE-2026-08-26.md:548-548 | 1 | 24 | 639 | 11 | 16 | 48 |
| chosen | id-07 | RESEARCH-QUEUE.md:122-122 | 1 | 31 | 277 | 14 | - | 5 |
| chosen | id-07 | DB-SCHEMA.md:3-4 | 3 | 5 | 80 | 24 | 26 | 87 |
| chosen | id-07 | DB-SCHEMA.md:139-145 | 1 | 148 | 76 | 111 | - | - |
| chosen | id-07 | INFRA.md:31-32 | 3 | 168 | 599 | 87 | - | - |
| chosen | id-07 | RESEARCH-QUEUE.md:728-733 | 1 | - | 146 | - | - | - |
| ctx-plain | why-01 | CONTEXT.md:96-96 | 1 | - | 588 | - | - | - |
| ctx-plain | why-01 | CONTEXT.md:103-103 | 1 | - | 345 | 176 | - | - |
| ctx-plain | why-01 | CONTEXT.md:255-264 | 2 | 55 | 123 | 22 | - | 26 |
| ctx-plain | why-01 | CONTEXT.md:442-449 | 1 | - | 140 | 144 | - | - |
| ctx-plain | why-01 | DECISION-LOG.md:22-22 | 1 | 129 | 368 | 74 | - | - |
| ctx-plain | why-01 | DECISION-LOG.md:28-28 | 1 | 59 | 25 | 150 | - | 71 |
| ctx-plain | why-01 | CASE-STUDY.md:81-84 | 1 | 6 | 4 | 20 | 6 | 6 |
| ctx-plain | why-01 | CASE-STUDY.md:56-61 | 1 | 4 | 9 | 7 | 7 | 7 |
| ctx-plain | why-02 | CONTEXT.md:97-97 | 1 | 101 | 102 | 54 | - | - |
| ctx-plain | why-02 | CONTEXT.md:104-104 | 2 | 52 | 207 | 13 | - | 80 |
| ctx-plain | why-02 | CONTEXT.md:71-73 | 1 | - | 122 | 297 | - | - |
| ctx-plain | why-02 | CONTEXT.md:100-100 | 1 | - | 472 | - | - | - |
| ctx-plain | why-02 | KAPITAL-REKOMENDACJA.md:17-19 | 1 | - | 203 | 178 | - | - |
| ctx-plain | why-02 | DECYZJE-2026-08-26.md:53-55 | 1 | - | 436 | 333 | - | - |
| ctx-plain | why-02 | DECYZJE-2026-08-26.md:155-157 | 1 | 19 | 18 | 89 | 26 | 67 |
| ctx-plain | why-03 | CONTEXT.md:4762-4768 | 2 | 69 | 157 | 35 | - | 1 |
| ctx-plain | why-03 | CONTEXT.md:1171-1176 | 1 | - | 360 | 614 | - | - |
| ctx-plain | why-03 | DECYZJE-2026-08-26.md:662-678 | 1 | 52 | 19 | 385 | - | 44 |
| ctx-plain | why-04 | CONTEXT.md:3277-3282 | 1 | 2 | 2 | 2 | 3 | 3 |
| ctx-plain | why-04 | HANDOFF.md:15-16 | 2 | 6 | 3 | 19 | 5 | 5 |
| ctx-plain | why-04 | HANDOFF.md:19-24 | 2 | 6 | 3 | 19 | 5 | 5 |
| ctx-plain | why-04 | AI-WORKFLOW.md:53-55 | 2 | 1 | 1 | 1 | 1 | 1 |
| ctx-plain | why-05 | CONTEXT.md:3007-3007 | 2 | 18 | 64 | 9 | 18 | 33 |
| ctx-plain | why-05 | CONTEXT.md:3081-3082 | 2 | 9 | 11 | 15 | 1 | 1 |
| ctx-plain | why-05 | INFRA.md:3-5 | 2 | 6 | 2 | 17 | 10 | 17 |
| ctx-plain | why-05 | UI-DESIGN.md:45-48 | 2 | 5 | 9 | 5 | 6 | 12 |
| ctx-plain | why-06 | DECYZJE-2026-08-26.md:531-543 | 3 | - | 628 | 578 | - | - |
| ctx-plain | why-06 | CONTEXT.md:99-99 | 2 | - | 724 | - | - | - |
| ctx-plain | why-06 | CONTEXT.md:3086-3088 | 1 | 67 | 31 | 210 | - | 39 |
| ctx-plain | why-06 | TASKS-WINDOWS.md:24-24 | 1 | 125 | 75 | 231 | - | - |
| ctx-plain | why-06 | CONTEXT.md:3006-3006 | 1 | - | 574 | 692 | - | - |
| ctx-plain | why-06 | RESEARCH-QUEUE.md:765-766 | 1 | - | 598 | 192 | - | - |
| ctx-plain | why-06 | UI-DESIGN.md:92-93 | 1 | 2 | 1 | 21 | 20 | 44 |
| ctx-plain | why-08 | CONTEXT.md:3817-3828 | 2 | 8 | 4 | 36 | 1 | 1 |
| ctx-plain | why-08 | CONTEXT.md:281-284 | 1 | 46 | 3 | 286 | - | 4 |
| ctx-plain | why-08 | CONTEXT.md:2074-2077 | 1 | - | 206 | 540 | - | - |
| ctx-plain | why-08 | DECYZJE-2026-08-26.md:549-555 | 1 | 147 | 168 | 97 | - | - |
| ctx-plain | why-08 | ALGORITHM.md:87-89 | 2 | 1 | 2 | 2 | 7 | 13 |
| ctx-plain | why-08 | KAPITAL-REKOMENDACJA.md:37-38 | 2 | 12 | 7 | 45 | 5 | 8 |
| ctx-plain | why-08 | DECISION-LOG.md:28-28 | 1 | 14 | 55 | 5 | 29 | 77 |
| ctx-plain | why-09 | CONTEXT.md:96-96 | 3 | 3 | 4 | 3 | 5 | 6 |
| ctx-plain | why-09 | CONTEXT.md:95-95 | 1 | 66 | 219 | 35 | - | 50 |
| ctx-plain | why-09 | DECYZJE-2026-08-26.md:549-556 | 1 | 67 | 36 | 265 | - | 11 |
| ctx-plain | why-09 | DECYZJE-2026-08-26.md:466-482 | 1 | - | 555 | - | - | - |
| ctx-plain | why-09 | CASE-STUDY.md:52-58 | 3 | 1 | 1 | 1 | 1 | 1 |
| ctx-plain | why-09 | DECISION-LOG.md:22-22 | 3 | 2 | 2 | 2 | 3 | 3 |
| ctx-plain | why-10 | CONTEXT.md:1813-1815 | 1 | 60 | 25 | 364 | - | 2 |
| ctx-plain | why-10 | CONTEXT.md:4263-4265 | 1 | - | 140 | 418 | - | - |
| ctx-plain | why-10 | DECYZJE-2026-08-26.md:546-560 | 1 | 52 | 89 | 100 | - | 7 |
| ctx-plain | why-10 | DECYZJE-2026-08-26.md:637-639 | 1 | 42 | 9 | 113 | - | 27 |
| ctx-plain | dated-01 | DECYZJE-2026-08-26.md:335-348 | 1 | 131 | 780 | 73 | - | - |
| ctx-plain | dated-01 | CONTEXT.md:97-97 | 1 | - | 567 | 272 | - | - |
| ctx-plain | dated-01 | CONTEXT.md:2092-2097 | 2 | - | 814 | 147 | - | - |
| ctx-plain | dated-01 | CONTEXT.md:2156-2167 | 3 | 178 | 721 | 100 | - | - |
| ctx-plain | dated-01 | morning-2026-08-29.md:184-186 | 1 | - | 862 | 445 | - | - |
| ctx-plain | dated-01 | TASKS-UI.md:1042-1045 | 1 | 19 | 39 | 95 | 11 | 31 |
| ctx-plain | dated-01 | CASE-STUDY.md:145-145 | 1 | - | 106 | 220 | - | - |
| ctx-plain | dated-01 | HANDOFF.md:1166-1170 | 1 | - | 222 | 185 | - | - |
| ctx-plain | dated-02 | CONTEXT.md:1228-1235 | 3 | 8 | 10 | 33 | 5 | 8 |
| ctx-plain | dated-02 | CONTEXT.md:294-296 | 1 | 90 | 143 | 50 | - | 5 |
| ctx-plain | dated-02 | CASE-STUDY.md:81-84 | 1 | 2 | 8 | 17 | 8 | 12 |
| ctx-plain | dated-02 | DECISION-LOG.md:26-26 | 1 | 19 | 94 | 12 | 21 | 70 |
| ctx-plain | dated-03 | morning-2026-09-15.md:199-205 | 1 | 16 | 82 | 26 | 10 | 13 |
| ctx-plain | dated-03 | morning-2026-09-15.md:221-223 | 2 | 2 | 4 | 11 | 3 | 3 |
| ctx-plain | dated-03 | CONTEXT.md:251-251 | 1 | 10 | 76 | 19 | 1 | 1 |
| ctx-plain | dated-04 | morning-2026-09-23.md:42-48 | 1 | 6 | 24 | 11 | 7 | 7 |
| ctx-plain | dated-04 | CONTEXT.md:177-179 | 1 | - | 586 | 313 | - | - |
| ctx-plain | dated-04 | CONTEXT.md:19-20 | 1 | - | 442 | - | - | - |
| ctx-plain | dated-04 | CONTEXT.md:621-622 | 1 | - | 131 | 361 | - | - |
| ctx-plain | dated-04 | CONTEXT.md:774-778 | 1 | - | 197 | 207 | - | - |
| ctx-plain | dated-05 | CONTEXT.md:91-91 | 1 | 53 | 27 | 240 | - | 83 |
| ctx-plain | dated-05 | CONTEXT.md:3585-3586 | 1 | - | 857 | - | - | - |
| ctx-plain | dated-05 | CONTEXT.md:3533-3534 | 1 | - | 793 | 333 | - | - |
| ctx-plain | dated-05 | CONTEXT.md:3542-3543 | 1 | - | 793 | 333 | - | - |
| ctx-plain | dated-05 | CONTEXT.md:2410-2415 | 1 | - | 527 | 309 | - | - |
| ctx-plain | dated-05 | CONTEXT.md:281-282 | 1 | 60 | 31 | 358 | - | 7 |
| ctx-plain | dated-06 | CONTEXT.md:4417-4420 | 1 | 33 | 2 | 141 | - | 17 |
| ctx-plain | dated-06 | morning-2026-08-20.md:48-48 | 1 | 127 | 77 | 210 | - | - |
| ctx-plain | dated-06 | CONTEXT.md:2353-2357 | 1 | 4 | 7 | 30 | 22 | 45 |
| ctx-plain | dated-06 | CONTEXT.md:4093-4096 | 1 | - | 186 | - | - | - |
| ctx-plain | dated-06 | morning-2026-08-19.md:26-26 | 1 | 48 | 87 | 82 | - | 25 |
| ctx-plain | dated-06 | CONTEXT.md:2540-2544 | 1 | 42 | 9 | 131 | - | 41 |
| ctx-plain | dated-06 | morning-2026-08-26.md:48-48 | 1 | 46 | 98 | 70 | - | 57 |
| ctx-plain | dated-06 | CONTEXT.md:2331-2339 | 1 | 161 | 99 | 250 | - | - |
| ctx-plain | dated-06 | CONTEXT.md:757-761 | 1 | - | 241 | 277 | - | - |
| ctx-plain | dated-06 | morning-2026-09-19.md:40-40 | 1 | 51 | 14 | 231 | - | 40 |
| ctx-plain | dated-06 | CONTEXT.md:4085-4085 | 1 | - | 186 | - | - | - |
| ctx-plain | dated-06 | CONTEXT.md:4479-4484 | 1 | - | 301 | 364 | - | - |
| ctx-plain | dated-06 | morning-2026-09-20.md:40-40 | 1 | 13 | 29 | 29 | 19 | 35 |
| ctx-plain | dated-07 | CONTEXT.md:3618-3620 | 1 | - | 122 | - | - | - |
| ctx-plain | dated-07 | CONTEXT.md:90-90 | 1 | - | 762 | - | - | - |
| ctx-plain | dated-07 | CONTEXT.md:4300-4302 | 1 | 4 | 34 | 8 | 11 | 28 |
| ctx-plain | dated-07 | CONTEXT.md:1927-1929 | 1 | - | 310 | 196 | - | - |
| ctx-plain | dated-07 | CONTEXT.md:1558-1559 | 1 | 18 | 32 | 44 | 4 | 6 |
| ctx-plain | dated-07 | CONTEXT.md:1228-1229 | 1 | - | 247 | - | - | - |
| ctx-plain | dated-07 | CONTEXT.md:883-885 | 1 | 119 | 65 | - | - | - |
| ctx-plain | dated-07 | CONTEXT.md:321-323 | 1 | - | 328 | - | - | - |
| ctx-plain | dated-07 | CONTEXT.md:344-346 | 1 | - | 328 | - | - | - |
| ctx-plain | dated-07 | CONTEXT.md:1023-1023 | 1 | 109 | 60 | 198 | - | - |
| ctx-plain | dated-07 | CONTEXT.md:863-864 | 1 | - | 143 | - | - | - |
| ctx-plain | dated-07 | HANDOFF.md:131-134 | 1 | - | 292 | - | - | - |
| ctx-plain | dated-08 | CONTEXT.md:102-102 | 3 | - | 130 | - | - | - |
| ctx-plain | dated-08 | CONTEXT.md:216-217 | 1 | 9 | 18 | 20 | 2 | 2 |
| ctx-plain | dated-08 | CONTEXT.md:101-101 | 2 | 38 | 9 | - | - | 9 |
| ctx-plain | dated-08 | CONTEXT.md:10-16 | 2 | 141 | 86 | - | - | - |
| ctx-plain | dated-08 | CASE-STUDY.md:94-98 | 3 | 4 | 3 | 40 | 3 | 3 |
| ctx-plain | dated-08 | CASE-STUDY.md:145-149 | 1 | 24 | 46 | 59 | 9 | 11 |
| ctx-plain | dated-09 | CONTEXT.md:294-295 | 1 | 4 | 8 | 39 | 8 | 11 |
| ctx-plain | dated-09 | CONTEXT.md:1135-1136 | 1 | 8 | 17 | 28 | 5 | 7 |
| ctx-plain | dated-09 | CONTEXT.md:255-255 | 1 | 7 | 32 | 14 | 7 | 10 |
| ctx-plain | dated-09 | morning-2026-09-17.md:120-120 | 1 | 18 | 36 | 35 | 19 | 36 |
| ctx-plain | dated-09 | morning-2026-09-17.md:139-139 | 1 | 18 | 36 | 35 | 19 | 36 |
| ctx-plain | dated-09 | CASE-STUDY.md:81-84 | 1 | 1 | 1 | 2 | 1 | 1 |
| ctx-plain | dated-09 | DECISION-LOG.md:28-28 | 1 | 2 | 2 | 1 | 6 | 8 |
| ctx-plain | dated-10 | CONTEXT.md:4165-4165 | 1 | 3 | 1 | 13 | 5 | 7 |
| ctx-plain | dated-10 | CONTEXT.md:4221-4222 | 1 | - | 458 | 150 | - | - |
| ctx-plain | dated-10 | morning-2026-08-21.md:191-200 | 1 | 6 | 7 | 18 | 14 | 37 |
| ctx-plain | dated-10 | morning-2026-08-22.md:170-176 | 1 | 11 | 13 | 34 | 28 | 79 |
| ctx-plain | dated-10 | morning-2026-08-23.md:174-179 | 1 | 14 | 14 | 40 | 27 | 78 |
| ctx-plain | dated-10 | morning-2026-08-27.md:222-226 | 1 | 50 | 61 | 58 | - | 51 |
| ctx-plain | id-01 | TASKS-UI.md:1136-1139 | 2 | 2 | 5 | 1 | 13 | 14 |
| ctx-plain | id-01 | CONTEXT.md:1907-1911 | 2 | 40 | 82 | 30 | - | 25 |
| ctx-plain | id-01 | HANDOFF.md:855-857 | 1 | 12 | 14 | 19 | 12 | 12 |
| ctx-plain | id-01 | CONTEXT.md:1192-1194 | 2 | 48 | 94 | 47 | - | 24 |
| ctx-plain | id-01 | morning-2026-09-17.md:120-120 | 3 | 3 | 4 | 3 | 3 | 3 |
| ctx-plain | id-01 | CONTEXT.md:259-259 | 1 | 56 | 128 | 17 | - | 26 |
| ctx-plain | id-01 | morning-2026-09-16.md:104-120 | 4 | 1 | 1 | 2 | 2 | 2 |
| ctx-plain | id-01 | morning-2026-09-17.md:104-120 | 4 | 3 | 4 | 3 | 3 | 3 |
| ctx-plain | id-01 | morning-2026-09-18.md:104-120 | 4 | 6 | 6 | 5 | 6 | 6 |
| ctx-plain | id-01 | morning-2026-09-19.md:104-120 | 4 | 7 | 7 | 10 | 1 | 1 |
| ctx-plain | id-01 | morning-2026-09-20.md:104-120 | 4 | 4 | 2 | 7 | 4 | 4 |
| ctx-plain | id-01 | morning-2026-09-21.md:104-120 | 4 | 8 | 8 | 9 | 7 | 7 |
| ctx-plain | id-01 | morning-2026-09-22.md:104-120 | 4 | 9 | 9 | 8 | 5 | 5 |
| ctx-plain | id-01 | morning-2026-09-23.md:104-120 | 4 | 5 | 3 | 6 | 14 | 15 |
| ctx-plain | id-01 | morning-2026-09-17.md:123-139 | 4 | 3 | 4 | 3 | 3 | 3 |
| ctx-plain | id-01 | morning-2026-09-18.md:123-139 | 4 | 6 | 6 | 5 | 6 | 6 |
| ctx-plain | id-02 | CONTEXT.md:277-277 | 1 | 35 | 98 | 18 | - | 12 |
| ctx-plain | id-02 | CONTEXT.md:294-296 | 1 | 35 | 98 | 18 | - | 12 |
| ctx-plain | id-02 | CONTEXT.md:255-258 | 1 | 56 | 485 | 11 | - | 14 |
| ctx-plain | id-02 | morning-2026-09-12.md:281-281 | 1 | 26 | 26 | 32 | 18 | 20 |
| ctx-plain | id-02 | morning-2026-09-13.md:281-281 | 1 | 22 | 33 | 15 | 14 | 16 |
| ctx-plain | id-02 | morning-2026-09-14.md:281-281 | 1 | 15 | 8 | 31 | 17 | 19 |
| ctx-plain | id-02 | morning-2026-09-15.md:222-222 | 1 | 7 | 20 | 6 | 20 | 22 |
| ctx-plain | id-02 | morning-2026-09-16.md:242-242 | 1 | 3 | 7 | 1 | 1 | 1 |
| ctx-plain | id-02 | morning-2026-09-17.md:261-261 | 1 | 11 | 16 | 13 | 10 | 10 |
| ctx-plain | id-02 | morning-2026-09-18.md:275-275 | 1 | 9 | 14 | 14 | 2 | 2 |
| ctx-plain | id-02 | CONTEXT.md:211-213 | 1 | 59 | 531 | 22 | - | 33 |
| ctx-plain | id-02 | CONTEXT.md:419-420 | 2 | 28 | 94 | 5 | 3 | 3 |
| ctx-plain | id-03 | CONTEXT.md:2096-2097 | 1 | 151 | 422 | 90 | - | - |
| ctx-plain | id-03 | CONTEXT.md:257-258 | 1 | - | 314 | 323 | - | - |
| ctx-plain | id-03 | CONTEXT.md:211-212 | 1 | 56 | 434 | 30 | - | 1 |
| ctx-plain | id-03 | CONTEXT.md:419-420 | 1 | 103 | 359 | 62 | - | - |
| ctx-plain | id-04 | RESEARCH-QUEUE.md:498-507 | 4 | 1 | 16 | 9 | 1 | 2 |
| ctx-plain | id-04 | CONTEXT.md:262-263 | 1 | 68 | 605 | 31 | - | 1 |
| ctx-plain | id-04 | CONTEXT.md:273-274 | 1 | 68 | 605 | 31 | - | 1 |
| ctx-plain | id-04 | CONTEXT.md:1245-1245 | 1 | - | 323 | - | - | - |
| ctx-plain | id-05 | CONTEXT.md:288-291 | 2 | - | 617 | - | - | - |
| ctx-plain | id-05 | CONTEXT.md:350-355 | 2 | 9 | 538 | 5 | 1 | 1 |
| ctx-plain | id-05 | HANDOFF.md:256-257 | 2 | 1 | 4 | 3 | 2 | 2 |
| ctx-plain | id-05 | CONTEXT.md:264-265 | 1 | 5 | 664 | 2 | 3 | 3 |
| ctx-plain | id-06 | RESEARCH-QUEUE.md:294-301 | 1 | 10 | 6 | 14 | 4 | 4 |
| ctx-plain | id-06 | RESEARCH-QUEUE.md:324-324 | 3 | 10 | 6 | 14 | 4 | 4 |
| ctx-plain | id-06 | CONTEXT.md:482-485 | 1 | 4 | 5 | 5 | 3 | 3 |
| ctx-plain | id-06 | CONTEXT.md:495-496 | 2 | 4 | 5 | 5 | 3 | 3 |
| ctx-plain | id-06 | CONTEXT.md:684-694 | 1 | 3 | 2 | 6 | 2 | 2 |
| ctx-plain | id-06 | CONTEXT.md:461-461 | 1 | 4 | 5 | 5 | 3 | 3 |
| ctx-plain | id-07 | CONTEXT.md:2994-2994 | 1 | 2 | 25 | 16 | 7 | 22 |
| ctx-plain | id-07 | DECYZJE-2026-08-26.md:548-548 | 1 | 150 | 639 | 76 | - | - |
| ctx-plain | id-07 | RESEARCH-QUEUE.md:122-122 | 1 | 40 | 277 | 14 | - | 8 |
| ctx-plain | id-07 | DB-SCHEMA.md:3-4 | 3 | 4 | 80 | 2 | 28 | 95 |
| ctx-plain | id-07 | DB-SCHEMA.md:139-145 | 1 | 10 | 76 | 17 | 2 | 2 |
| ctx-plain | id-07 | INFRA.md:31-32 | 3 | 32 | 599 | 10 | - | 87 |
| ctx-plain | id-07 | RESEARCH-QUEUE.md:728-733 | 1 | - | 146 | - | - | - |
