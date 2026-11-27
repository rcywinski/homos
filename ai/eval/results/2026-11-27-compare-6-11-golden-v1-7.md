# Step 6.11: judged comparison on the development set (golden v1.7)

Three configurations, two runs each, Qwen with the served preset (checked field by field in every run file) on
the committed k = 10 lists, run from the Mac against the box in one window (27 Nov, 17:10 to 17:46 UTC, order
S N H S N H, no guest request during the window). Judged with the step 3.2 judge and prompt, `--no-retry`,
concurrency 1. The decision rule was committed before the first run (ai/DECISIONS.md, commit 6be01c5) and is
applied here in code. Produced by `npx tsx ai/eval/compare-611.ts`.

| configuration | run | correct | partly | incorrect | unsupported | no verdict | median time per answer |
|---|---|---|---|---|---|---|---|
| S served (local, rerank top 30) | s611r1 | 16 | 13 | 5 | 0 | 0 | 9.8 s |
| S served (local, rerank top 30) | s611r2 | 19 | 9 | 6 | 0 | 0 | 9.8 s |
| N 6.10 without the reranker, with B2 | n611r1 | 16 | 13 | 5 | 1 | 0 | 7.8 s |
| N 6.10 without the reranker, with B2 | n611r2 | 17 | 13 | 4 | 0 | 0 | 7.8 s |
| H 6.10 rerank top 100 | h611r1 | 17 | 13 | 4 | 0 | 0 | 10.8 s |
| H 6.10 rerank top 100 | h611r2 | 16 | 14 | 4 | 3 | 0 | 10.9 s |

## Means of two runs

| configuration | correct | partly | incorrect | unsupported |
|---|---|---|---|---|
| S served (local, rerank top 30) | 17.5 | 11 | 5.5 | 0 |
| N 6.10 without the reranker, with B2 | 16.5 | 13 | 4.5 | 0.5 |
| H 6.10 rerank top 100 | 16.5 | 13.5 | 4 | 1.5 |

## The rule

Sanity of the path: S runs 16 and 19 correct against the served range 15 to 19 (clearly outside: both at 12 or below, or both at 22 or above): **passes**.

Guard against S (correct not lower by more than 3, incorrect and unsupported not higher by more than 2; it catches a clear regression only):

- N: **passes**
- H: **passes**

Choice: **N 6.10 without the reranker, with B2**: both pass; H's mean correct exceeds N's by 0, under 3, so the cheaper N (facts level, 59 against 60).

Reranker time per question, measured in the window from the Mac (median): 364.5 ms for the served 30 documents, 1093 ms for H's 100 documents with contexts, 24.5 ms for 1 document (network floor). N calls no reranker.

## Watched questions (C correct, P partly, I incorrect)

| id | s611r1 | s611r2 | n611r1 | n611r2 | h611r1 | h611r2 |
|---|---|---|---|---|---|---|
| dated-04 | I | I | P | P | P | P |
| dated-05 | I | I | P | P | I | I |
| dated-06 | I | I | I | I | P | I |
| id-07 | I | I | I | C | I | I |

## Verdict per question

| id | s611r1 | s611r2 | n611r1 | n611r2 | h611r1 | h611r2 |
|---|---|---|---|---|---|---|
| why-01 | P | P | P | P | P | P |
| why-02 | P | I | P | P | I | P |
| why-03 | P | P | P | I | C | P |
| why-04 | P | C | C | C | C | C |
| why-05 | C | P | C | C | C | C |
| why-06 | C | C | C | C | C | C |
| why-07 | P | C | P | C | P | C |
| why-08 | C | P | P | P | P | P |
| why-09 | P | P | P | P | P | P |
| why-10 | P | P | P | P | P | P |
| dated-01 | C | C | I | I | I | I |
| dated-02 | C | C | C | P | C | C |
| dated-03 | C | C | C | C | C | C |
| dated-04 | I | I | P | P | P | P |
| dated-05 | I | I | P | P | I | I |
| dated-06 | I | I | I | I | P | I |
| dated-07 | P | P | I | I | P | P |
| dated-08 | C | C | C | C | C | C |
| dated-09 | P | P | P | P | P | P |
| dated-10 | P | P | P | P | P | P |
| id-01 | C | C | C | C | C | C |
| id-02 | C | C | C | C | C | C |
| id-03 | C | C | C | C | C | C |
| id-04 | C | C | C | C | C | C |
| id-05 | P | C | C | C | C | C |
| id-06 | P | C | C | C | C | C |
| id-07 | I | I | I | C | I | I |
| na-01 | C | C | C | C | C | C |
| na-02 | C | C | P | P | C | P |
| na-03 | P | C | I | P | P | P |
| na-04 | C | C | C | C | C | C |
| na-05 | C | C | C | C | P | P |
| na-06 | C | C | C | C | C | C |
| na-07 | I | I | P | P | P | P |
