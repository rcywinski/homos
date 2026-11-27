# Retrieval at k = 10, step 6.12 (question set v1.0)

Produced by `npx tsx ai/eval/retrieval-diag.ts lists` from the cache filled by `fetch`. Corpus `8d7f9a3437b43594`, 30 questions (22 answerable). The lists file `ai/eval/results/2026-11-27-chunk-lists-k10-6-12-heldout-v1-0.json` holds S and N; "N without B2" is the check of 6.8, reported only.

| configuration | recall@5 | recall@10 | MRR@10 | facts covered | required spans covered | all spans covered |
|---|---|---|---|---|---|---|
| S served (local index, rerank top 30) | 68% (15/22) | 82% (18/22) | 0.441 | 71% (60/85) | 53% (39/74) | 46% (49/106) |
| N context index, no reranker, with B2 | 77% (17/22) | 91% (20/22) | 0.597 | 69% (59/85) | 51% (38/74) | 46% (49/106) |
| N without B2 (check of 6.8, not run) | 73% (16/22) | 91% (20/22) | 0.578 | 69% (59/85) | 49% (36/74) | 44% (47/106) |

B2 changes the top 10 of 4 questions: ho-id-01, ho-why-04, ho-id-02, ho-id-06.
