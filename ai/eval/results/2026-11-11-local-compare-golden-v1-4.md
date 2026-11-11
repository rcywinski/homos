# Local generator against Sonnet 5.5 (step 1.11)

Golden set v1.4, k=10 chunks. All answers judged by the step 1.9 Opus 5.5 judge, blind to the generator.

| measure | Sonnet 5.5, k=10 | local A, run 1 | local A, run 2 | local B, run 1 (fully local) | local A, thinking | local B, run 2 | Gemma 4 26B-A4B, A |
|---|---|---|---|---|---|---|---|
| valid structured outputs | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 |
| answers that needed the retry | n/a | 0 | 0 | 0 | 0 | 0 | 0 |
| citations verified | 97/97 | 59/65 | 53/57 | 58/62 | 74/79 | 52/58 | 49/67 |
| quotes over 40 words | 0 | 1 | 1 | 0 | 0 | 0 | 7 |
| unanswerable labelled `none` | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 2/3 |
| judge: correct / partially / incorrect | 20 / 12 / 2 | 13 / 16 / 5 | 12 / 15 / 7 | 17 / 12 / 5 | 14 / 16 / 4 | 17 / 10 / 7 | 14 / 13 / 7 |
| judge: supported / partly / unsupported | 6 / 28 / 0 | 3 / 30 / 1 | 2 / 29 / 3 | 3 / 30 / 1 | 3 / 28 / 3 | 2 / 31 / 1 | 6 / 24 / 4 |
| judge: premise handled (partial + no) | 8/8 | 7/8 | 6/8 | 7/8 | 7/8 | 7/8 | 6/8 |
| injection probe | passed | passed | passed | passed | passed | passed | passed |
| latency median / p95 (s) | 4.1 / 7.4 | 12.4 / 16.2 | 12.8 / 17.4 | 12.1 / 17.2 | 23.2 / 42.7 | 11.8 / 15.8 | 4.7 / 6.9 |
| decode tokens per second, median | n/a (not reported by the API) | 60.2 | 60.5 | 59.1 | 61.8 | 61.2 | 163 |
| generated tokens per answer, median | 435 | 277 | 242 | 247 | 949 | 250 | 348 |
| thinking tokens per answer, median / max | 0 | 0 | 0 | 0 | 618 / 2113 | 0 | 0 |
| API cost | $1.049 | $0 | $0 | $0 | $0 | $0 | $0 |
| GPU power limit | n/a (cloud) | 250 W | 250 W | 250 W | 250 W | 250 W | 250 W |

Retrieval per column:

- Sonnet 5.5, k=10: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku`
- local A, run 1: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`
- local A, run 2: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`
- local B, run 1 (fully local): `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`
- local A, thinking: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`
- local B, run 2: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`
- Gemma 4 26B-A4B, A: `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`

Generator per column:

- Sonnet 5.5, k=10: `answer:claude-sonnet-5-5(effort=medium)`
- local A, run 1: `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- local A, run 2: `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- local B, run 1 (fully local): `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- local A, thinking: `answer:ollama:qwen3.8:27b(think=true,num_ctx=24576,num_predict=8192,temperature=1)`
- local B, run 2: `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- Gemma 4 26B-A4B, A: `answer:ollama:gemma4:26b(think=false,num_ctx=17408,num_predict=2048,temperature=1)`

## Run-to-run spread (local A run 1 vs run 2, same chunks and settings)

Correctness changed on 7 of 34 questions, faithfulness on 3.

- why-02: correctness incorrect -> partially_correct
- why-03: correctness partially_correct -> incorrect
- why-04: correctness partially_correct -> correct
- why-07: correctness partially_correct -> incorrect
- dated-07: correctness partially_correct -> incorrect
- id-05: correctness correct -> partially_correct
- id-06: correctness correct -> partially_correct
- dated-04: faithfulness supported -> partly_supported
- id-03: faithfulness partly_supported -> unsupported
- id-06: faithfulness partly_supported -> unsupported

## Run-to-run spread (local B run 1 vs run 2, same chunks and settings)

Correctness changed on 7 of 34 questions, faithfulness on 5.

- why-06: correctness correct -> partially_correct
- dated-01: correctness correct -> incorrect
- dated-07: correctness partially_correct -> incorrect
- id-03: correctness partially_correct -> correct
- na-01: correctness partially_correct -> correct
- na-02: correctness partially_correct -> correct
- na-05: correctness correct -> partially_correct
- dated-01: faithfulness unsupported -> partly_supported
- id-02: faithfulness partly_supported -> supported
- id-07: faithfulness supported -> partly_supported
- na-02: faithfulness partly_supported -> unsupported
- na-05: faithfulness supported -> partly_supported

## k10 vs local-a1

Correctness changed on 9 of 34 questions, faithfulness on 6.

- why-02: correctness partially_correct -> incorrect
- why-04: correctness correct -> partially_correct
- why-07: correctness correct -> partially_correct
- why-08: correctness correct -> partially_correct
- id-07: correctness partially_correct -> incorrect
- na-02: correctness correct -> partially_correct
- na-03: correctness correct -> partially_correct
- na-05: correctness correct -> partially_correct
- na-07: correctness correct -> incorrect
- why-05: faithfulness supported -> partly_supported
- dated-10: faithfulness supported -> partly_supported
- id-03: faithfulness supported -> partly_supported
- id-05: faithfulness partly_supported -> supported
- id-07: faithfulness supported -> partly_supported
- na-03: faithfulness partly_supported -> unsupported

## k10 vs local-a2

Correctness changed on 11 of 34 questions, faithfulness on 8.

- why-03: correctness partially_correct -> incorrect
- why-07: correctness correct -> incorrect
- why-08: correctness correct -> partially_correct
- dated-07: correctness partially_correct -> incorrect
- id-05: correctness correct -> partially_correct
- id-06: correctness correct -> partially_correct
- id-07: correctness partially_correct -> incorrect
- na-02: correctness correct -> partially_correct
- na-03: correctness correct -> partially_correct
- na-05: correctness correct -> partially_correct
- na-07: correctness correct -> incorrect
- why-05: faithfulness supported -> partly_supported
- dated-04: faithfulness supported -> partly_supported
- dated-10: faithfulness supported -> partly_supported
- id-03: faithfulness supported -> unsupported
- id-05: faithfulness partly_supported -> supported
- id-06: faithfulness partly_supported -> unsupported
- id-07: faithfulness supported -> partly_supported
- na-03: faithfulness partly_supported -> unsupported

## local-a1 vs local-b

Correctness changed on 11 of 34 questions, faithfulness on 6.

- why-02: correctness incorrect -> partially_correct
- why-03: correctness partially_correct -> correct
- why-04: correctness partially_correct -> correct
- why-06: correctness partially_correct -> correct
- why-07: correctness partially_correct -> correct
- dated-01: correctness incorrect -> correct
- dated-04: correctness partially_correct -> incorrect
- dated-06: correctness partially_correct -> incorrect
- id-03: correctness correct -> partially_correct
- na-01: correctness correct -> partially_correct
- na-05: correctness partially_correct -> correct
- dated-01: faithfulness partly_supported -> unsupported
- dated-04: faithfulness supported -> partly_supported
- id-05: faithfulness supported -> partly_supported
- id-07: faithfulness partly_supported -> supported
- na-03: faithfulness unsupported -> partly_supported
- na-05: faithfulness partly_supported -> supported

## local-a2 vs local-b

Correctness changed on 12 of 34 questions, faithfulness on 7.

- why-03: correctness incorrect -> correct
- why-06: correctness partially_correct -> correct
- why-07: correctness incorrect -> correct
- dated-01: correctness incorrect -> correct
- dated-04: correctness partially_correct -> incorrect
- dated-06: correctness partially_correct -> incorrect
- dated-07: correctness incorrect -> partially_correct
- id-03: correctness correct -> partially_correct
- id-05: correctness partially_correct -> correct
- id-06: correctness partially_correct -> correct
- na-01: correctness correct -> partially_correct
- na-05: correctness partially_correct -> correct
- dated-01: faithfulness partly_supported -> unsupported
- id-03: faithfulness unsupported -> partly_supported
- id-05: faithfulness supported -> partly_supported
- id-06: faithfulness unsupported -> partly_supported
- id-07: faithfulness partly_supported -> supported
- na-03: faithfulness unsupported -> partly_supported
- na-05: faithfulness partly_supported -> supported

## local-a1 vs local-a-think

Correctness changed on 12 of 34 questions, faithfulness on 4.

- why-02: correctness incorrect -> partially_correct
- why-03: correctness partially_correct -> incorrect
- why-04: correctness partially_correct -> correct
- why-07: correctness partially_correct -> correct
- dated-02: correctness correct -> partially_correct
- dated-07: correctness partially_correct -> incorrect
- dated-08: correctness correct -> partially_correct
- id-03: correctness correct -> partially_correct
- id-07: correctness incorrect -> partially_correct
- na-02: correctness partially_correct -> correct
- na-03: correctness partially_correct -> correct
- na-07: correctness incorrect -> partially_correct
- why-01: faithfulness partly_supported -> unsupported
- why-10: faithfulness partly_supported -> unsupported
- dated-07: faithfulness partly_supported -> supported
- id-05: faithfulness supported -> partly_supported

## local-a2 vs local-a-think

Correctness changed on 10 of 34 questions, faithfulness on 7.

- why-07: correctness incorrect -> correct
- dated-02: correctness correct -> partially_correct
- dated-08: correctness correct -> partially_correct
- id-03: correctness correct -> partially_correct
- id-05: correctness partially_correct -> correct
- id-06: correctness partially_correct -> correct
- id-07: correctness incorrect -> partially_correct
- na-02: correctness partially_correct -> correct
- na-03: correctness partially_correct -> correct
- na-07: correctness incorrect -> partially_correct
- why-01: faithfulness partly_supported -> unsupported
- why-10: faithfulness partly_supported -> unsupported
- dated-04: faithfulness partly_supported -> supported
- dated-07: faithfulness partly_supported -> supported
- id-03: faithfulness unsupported -> partly_supported
- id-05: faithfulness supported -> partly_supported
- id-06: faithfulness unsupported -> partly_supported

## local-a1 vs local-b2

Correctness changed on 8 of 34 questions, faithfulness on 5.

- why-02: correctness incorrect -> partially_correct
- why-03: correctness partially_correct -> correct
- why-04: correctness partially_correct -> correct
- why-07: correctness partially_correct -> correct
- dated-04: correctness partially_correct -> incorrect
- dated-06: correctness partially_correct -> incorrect
- dated-07: correctness partially_correct -> incorrect
- na-02: correctness partially_correct -> correct
- dated-04: faithfulness supported -> partly_supported
- id-02: faithfulness partly_supported -> supported
- id-05: faithfulness supported -> partly_supported
- na-02: faithfulness partly_supported -> unsupported
- na-03: faithfulness unsupported -> partly_supported

## local-a2 vs local-b2

Correctness changed on 7 of 34 questions, faithfulness on 6.

- why-03: correctness incorrect -> correct
- why-07: correctness incorrect -> correct
- dated-04: correctness partially_correct -> incorrect
- dated-06: correctness partially_correct -> incorrect
- id-05: correctness partially_correct -> correct
- id-06: correctness partially_correct -> correct
- na-02: correctness partially_correct -> correct
- id-02: faithfulness partly_supported -> supported
- id-03: faithfulness unsupported -> partly_supported
- id-05: faithfulness supported -> partly_supported
- id-06: faithfulness unsupported -> partly_supported
- na-02: faithfulness partly_supported -> unsupported
- na-03: faithfulness unsupported -> partly_supported

## k10 vs local-gemma-a

Correctness changed on 9 of 34 questions, faithfulness on 11.

- why-02: correctness partially_correct -> incorrect
- why-03: correctness partially_correct -> incorrect
- why-07: correctness correct -> partially_correct
- why-08: correctness correct -> partially_correct
- why-10: correctness partially_correct -> incorrect
- id-03: correctness correct -> partially_correct
- id-05: correctness correct -> incorrect
- na-03: correctness correct -> partially_correct
- na-07: correctness correct -> incorrect
- why-05: faithfulness supported -> partly_supported
- why-09: faithfulness partly_supported -> supported
- why-10: faithfulness partly_supported -> unsupported
- dated-01: faithfulness partly_supported -> unsupported
- dated-10: faithfulness supported -> partly_supported
- id-03: faithfulness supported -> unsupported
- id-04: faithfulness partly_supported -> supported
- id-05: faithfulness partly_supported -> supported
- id-07: faithfulness supported -> partly_supported
- na-03: faithfulness partly_supported -> unsupported
- na-04: faithfulness partly_supported -> supported

## local-a1 vs local-gemma-a

Correctness changed on 8 of 34 questions, faithfulness on 6.

- why-03: correctness partially_correct -> incorrect
- why-04: correctness partially_correct -> correct
- why-10: correctness partially_correct -> incorrect
- id-03: correctness correct -> partially_correct
- id-05: correctness correct -> incorrect
- id-07: correctness incorrect -> partially_correct
- na-02: correctness partially_correct -> correct
- na-05: correctness partially_correct -> correct
- why-09: faithfulness partly_supported -> supported
- why-10: faithfulness partly_supported -> unsupported
- dated-01: faithfulness partly_supported -> unsupported
- id-03: faithfulness partly_supported -> unsupported
- id-04: faithfulness partly_supported -> supported
- na-04: faithfulness partly_supported -> supported

## local-a2 vs local-gemma-a

Correctness changed on 10 of 34 questions, faithfulness on 7.

- why-02: correctness partially_correct -> incorrect
- why-07: correctness incorrect -> partially_correct
- why-10: correctness partially_correct -> incorrect
- dated-07: correctness incorrect -> partially_correct
- id-03: correctness correct -> partially_correct
- id-05: correctness partially_correct -> incorrect
- id-06: correctness partially_correct -> correct
- id-07: correctness incorrect -> partially_correct
- na-02: correctness partially_correct -> correct
- na-05: correctness partially_correct -> correct
- why-09: faithfulness partly_supported -> supported
- why-10: faithfulness partly_supported -> unsupported
- dated-01: faithfulness partly_supported -> unsupported
- dated-04: faithfulness partly_supported -> supported
- id-04: faithfulness partly_supported -> supported
- id-06: faithfulness unsupported -> partly_supported
- na-04: faithfulness partly_supported -> supported
