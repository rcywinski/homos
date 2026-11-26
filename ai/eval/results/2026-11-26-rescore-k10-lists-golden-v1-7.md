# Stored k=10 lists re-scored on golden v1.6 and v1.7

Produced by `npx tsx ai/eval/rescore.ts`: no API call, no box. Lists: `2026-11-11-chunk-lists-k10-golden-v1-4.json` (made on golden
v1.4). Old golden from git `3447268`, new from the working tree. Corpus `8d7f9a3437b43594`, 957 chunks.
Answerable questions only. **Headline columns** (used for phase 6 decisions): recall and MRR on required spans only
(unmarked = required), so a supporting span added to an item cannot raise them, and **facts covered**: the facts of
the reference with at least one of their spans in the top 10 (a question not yet marked counts each required span
as one fact; facts no span states are counted apart). Other columns: required spans covered (the v1.5 measure)
and the any-span versions (the v1.4 definition), kept for comparison with earlier results.

| variant | golden | **recall@5, required** | **recall@10, required** | **MRR@10, required** | **facts covered** | spans covered, required | recall@10, any | MRR@10, any | spans covered, all |
|---|---|---|---|---|---|---|---|---|---|
| chosen | v1.6 | 62% (16/26) | 77% (20/26) | 0.509 | 34% (57/169), 1 with no span | 33% (60/183) | 81% (21/26) | 0.551 | 33% (66/198) |
| chosen | v1.7 | 62% (16/26) | 77% (20/26) | 0.490 | 41% (53/130), 5 with no span | 34% (58/173) | 81% (21/26) | 0.551 | 33% (66/198) |
| local | v1.6 | 65% (17/26) | 77% (20/26) | 0.490 | 30% (50/169), 1 with no span | 26% (48/183) | 81% (21/26) | 0.529 | 28% (55/198) |
| local | v1.7 | 65% (17/26) | 77% (20/26) | 0.471 | 38% (49/130), 5 with no span | 27% (46/173) | 81% (21/26) | 0.529 | 28% (55/198) |

Retrievers:

- chosen: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku`
- local: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta`

## Questions whose numbers changed

Facts "x/y+z": x of y facts covered, z facts with no span. A first required hit shows its rank and the required
span it overlaps, so a change in MRR can be traced to the span that became supporting or was added.

| variant | id | first required hit v1.6 | first required hit v1.7 | facts v1.6 | facts v1.7 | required spans v1.6 | required spans v1.7 | all spans v1.6 | all spans v1.7 |
|---|---|---|---|---|---|---|---|---|---|
| chosen | why-02 | - - | - - | 0/7 | 0/5+1 | 0/7 | 0/7 | 0/7 | 0/7 |
| chosen | why-04 | 1 AI-WORKFLOW.md:53-55 | 1 AI-WORKFLOW.md:53-55 | 4/5 | 4/4 | 4/5 | 4/4 | 4/5 | 4/5 |
| chosen | why-05 | 1 CONTEXT.md:3081-3082 | 1 CONTEXT.md:3081-3082 | 2/5 | 3/3 | 2/5 | 2/4 | 2/5 | 2/5 |
| chosen | why-06 | - - | - - | 0/7 | 0/4 | 0/7 | 0/7 | 0/7 | 0/7 |
| chosen | dated-01 | - - | - - | 0/8 | 0/5 | 0/8 | 0/8 | 0/9 | 0/9 |
| chosen | dated-02 | 5 CONTEXT.md:1228-1235 | 5 CONTEXT.md:1228-1235 | 2/6 | 3/4 | 2/6 | 2/4 | 2/6 | 2/6 |
| chosen | dated-03 | 2 morning-2026-09-15.md:221-223 | 2 morning-2026-09-15.md:221-223 | 2/3 | 3/3 | 2/3 | 2/3 | 2/3 | 2/3 |
| chosen | dated-04 | 7 morning-2026-09-23.md:42-48 | 7 morning-2026-09-23.md:42-48 | 1/5 | 1/4+1 | 1/5 | 1/5 | 1/5 | 1/5 |
| chosen | dated-08 | 1 EMERGENCY.md:90-91 | 2 CONTEXT.md:216-217 | 5/8 | 4/5 | 5/8 | 4/6 | 5/8 | 5/8 |
| chosen | id-01 | 1 morning-2026-09-19.md:104-120 | 1 morning-2026-09-19.md:104-120 | 10/17 | 4/5+1 | 10/17 | 10/16 | 10/17 | 10/17 |
| chosen | id-02 | 1 morning-2026-09-16.md:242-242 | 1 morning-2026-09-16.md:242-242 | 4/12 | 1/4 | 4/12 | 4/12 | 4/12 | 4/12 |
| chosen | id-03 | - - | - - | 0/5 | 0/4 | 0/5 | 0/4 | 2/8 | 2/8 |
| chosen | id-04 | 1 RESEARCH-QUEUE.md:498-507 | 1 RESEARCH-QUEUE.md:498-507 | 1/5 | 4/5+1 | 1/5 | 1/4 | 1/5 | 1/5 |
| chosen | id-05 | 1 HANDOFF.md:256-257 | 1 HANDOFF.md:256-257 | 1/4 | 2/5 | 1/4 | 1/4 | 1/4 | 1/4 |
| chosen | id-06 | 2 CONTEXT.md:684-694 | 2 CONTEXT.md:684-694 | 7/7 | 6/6 | 7/7 | 6/6 | 7/7 | 7/7 |
| chosen | id-07 | 6 CONTEXT.md:2994-2994 | 6 CONTEXT.md:2994-2994 | 1/7 | 1/6 | 1/7 | 1/7 | 1/7 | 1/7 |
| local | why-02 | - - | - - | 0/7 | 0/5+1 | 0/7 | 0/7 | 0/7 | 0/7 |
| local | why-04 | 1 AI-WORKFLOW.md:53-55 | 1 AI-WORKFLOW.md:53-55 | 3/5 | 3/4 | 3/5 | 3/4 | 3/5 | 3/5 |
| local | why-05 | 2 CONTEXT.md:3081-3082 | 2 CONTEXT.md:3081-3082 | 1/5 | 2/3 | 1/5 | 1/4 | 1/5 | 1/5 |
| local | why-06 | - - | - - | 0/7 | 0/4 | 0/7 | 0/7 | 0/7 | 0/7 |
| local | dated-01 | 7 HANDOFF.md:1166-1170 | 7 HANDOFF.md:1166-1170 | 1/8 | 1/5 | 1/8 | 1/8 | 2/9 | 2/9 |
| local | dated-02 | 2 CASE-STUDY.md:81-84 | 2 CASE-STUDY.md:81-84 | 1/6 | 1/4 | 1/6 | 1/4 | 1/6 | 1/6 |
| local | dated-04 | - - | - - | 0/5 | 0/4+1 | 0/5 | 0/5 | 0/5 | 0/5 |
| local | dated-08 | 1 EMERGENCY.md:90-91 | 2 CONTEXT.md:216-217 | 4/8 | 4/5 | 4/8 | 3/6 | 4/8 | 4/8 |
| local | id-01 | 1 HANDOFF.md:855-857 | 1 HANDOFF.md:855-857 | 6/17 | 4/5+1 | 6/17 | 6/16 | 6/17 | 6/17 |
| local | id-02 | 3 morning-2026-09-18.md:275-275 | 3 morning-2026-09-18.md:275-275 | 3/12 | 1/4 | 3/12 | 3/12 | 3/12 | 3/12 |
| local | id-03 | - - | - - | 0/5 | 0/4 | 0/5 | 0/4 | 3/8 | 3/8 |
| local | id-04 | 2 RESEARCH-QUEUE.md:498-507 | 2 RESEARCH-QUEUE.md:498-507 | 1/5 | 4/5+1 | 1/5 | 1/4 | 1/5 | 1/5 |
| local | id-05 | 1 CONTEXT.md:350-355 | 1 CONTEXT.md:350-355 | 3/4 | 3/5 | 3/4 | 3/4 | 3/4 | 3/4 |
| local | id-06 | 2 RESEARCH-QUEUE.md:294-301 | 2 RESEARCH-QUEUE.md:294-301 | 7/7 | 6/6 | 7/7 | 6/6 | 7/7 | 7/7 |
| local | id-07 | - - | - - | 0/7 | 0/6 | 0/7 | 0/7 | 0/7 | 0/7 |
