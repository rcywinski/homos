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

Required spans not in the fused top 100, and how many of those have no BM25 rank at all (BM25 shares no term with
the chunk). The last column counts every required span with no BM25 rank.

| first stage | required spans | beyond fused rank 100 | of those, no BM25 rank | no BM25 rank, all |
|---|---|---|---|---|
| local | 173 | 64 | 35 | 39 |
| chosen | 173 | 54 | 4 | 4 |
| local + Polish query for BM25 | 173 | 64 | 5 | 5 |

## Reranker score stability

Largest difference between the served call (30 documents) and the 100-document call on the same 30 documents,
and questions whose top 10 of the served pool changes when ordered by the 100-document scores.

| variant | max score difference | top 10 changed |
|---|---|---|
| local | 0.0012 | 2 of 34 |
| chosen | 0.0017 | 1 of 34 |

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
