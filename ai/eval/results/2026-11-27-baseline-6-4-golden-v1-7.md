# Step 6.4: judged baseline on the development set (golden v1.7)

The served local configuration (Qwen, live retrieval through the public chat server on the box, rerank top 30,
k = 10), two runs on the 34 development questions only; the test set is not used (its first run is step 6.12).
Judged on the Mac with the step 3.2 judge and prompt, `--no-retry`. Produced by `npx tsx ai/eval/baseline-64.ts`.

Comparability: the question, reference and answerable text is unchanged since golden v1.0 (answersHash
311917237fe235c7), so these verdicts compare with the earlier judged runs (rows marked context, same judge and
prompt, golden v1.4). Retrieval coverage numbers on v1.4 do not compare: evidence roles and facts changed.

| run | correct | partly | incorrect | supported | partly supported | unsupported | no verdict | quotes not verified (all citations) |
|---|---|---|---|---|---|---|---|---|
| **b64r1 (6.4)** | 15 | 12 | 7 | 7 | 26 | 1 | 0 | 2 of 90 |
| **b64r2 (6.4)** | 19 | 10 | 5 | 5 | 27 | 2 | 0 | 0 of 96 |
| lan48b (4.8j2, context) | 18 | 11 | 5 | 7 | 27 | 0 | 0 | 1 of 97 |
| lan48c (4.8j3, context) | 16 | 14 | 4 | 3 | 30 | 1 | 0 | 2 of 92 |

## Verdict per question (C correct, P partly, I incorrect)

10 of 34 questions get a different correctness verdict in the two runs.

| id | b64r1 | b64r2 | |
|---|---|---|---|
| why-01 | P | P |  |
| why-02 | P | P |  |
| why-03 | P | P |  |
| why-04 | C | C |  |
| why-05 | C | C |  |
| why-06 | C | P | differs |
| why-07 | C | C |  |
| why-08 | P | C | differs |
| why-09 | P | P |  |
| why-10 | P | P |  |
| dated-01 | I | C | differs |
| dated-02 | C | C |  |
| dated-03 | C | C |  |
| dated-04 | I | I |  |
| dated-05 | I | I |  |
| dated-06 | I | P | differs |
| dated-07 | P | P |  |
| dated-08 | C | C |  |
| dated-09 | P | P |  |
| dated-10 | P | I | differs |
| id-01 | C | C |  |
| id-02 | C | C |  |
| id-03 | I | C | differs |
| id-04 | C | C |  |
| id-05 | C | C |  |
| id-06 | C | C |  |
| id-07 | I | I |  |
| na-01 | P | C | differs |
| na-02 | P | C | differs |
| na-03 | I | P | differs |
| na-04 | C | C |  |
| na-05 | C | C |  |
| na-06 | C | C |  |
| na-07 | P | I | differs |

## Chunks given to the model against the stored local lists (rerank top 30, k = 10)

Every answer of both runs was given exactly the stored list, in the same order: the judged baseline and the 6.3 numbers describe the same system.
