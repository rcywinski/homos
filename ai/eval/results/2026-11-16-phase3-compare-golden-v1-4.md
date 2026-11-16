# Phase 3: local models

Golden set v1.4, k=10, the step 1.9 Opus judge blind to the generator. Phase 3 runs at the default 420 W power limit (no cap since 13 Nov); steps 1.11 and 1.12 ran at 250 W.

## 3.1 Speed at full power

Same settings, same chunk lists; only the power limit differs. Single run at 420 W, not judged.

| measure | Qwen A1, 250 W (1.11) | Qwen A2, 250 W (1.11) | Qwen A, 420 W (3.1, single run) |
|---|---|---|---|
| valid structured outputs | 34/34 | 34/34 | 34/34 |
| answers that needed the retry | 0 | 0 | 0 |
| citations verified | 59/65 | 53/57 | 53/56 |
| quotes over 40 words | 1 | 1 | 0 |
| unanswerable labelled `none` | 3/3 | 3/3 | 3/3 |
| latency median / p95 (s) | 12.4 / 16.2 | 12.8 / 17.4 | 9.9 / 12.5 |
| decode tokens per second, median | 60.2 | 60.5 | 79.9 |
| generated tokens per answer, median | 277 | 242 | 234 |
| num_ctx | 16384 | 16384 | 16384 |
| system prompt | ANSWER_SYSTEM | ANSWER_SYSTEM | ANSWER_SYSTEM |

Generator per column:

- Qwen A1, 250 W (1.11): `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- Qwen A2, 250 W (1.11): `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- Qwen A, 420 W (3.1, single run): `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7,presence_penalty=1.5,prompt=ANSWER_SYSTEM,cite=quote)`

Box during the 420 W run (CC-Win per-second log, 2026-11-16T11:01:43Z to 2026-11-16T11:09:11Z UTC): peak power 410.8 W, average 308.5 W, max temperature 71.6 C, peak VRAM 20191 MiB; alerts: none (no gap over 3 s, no Kernel-Power 41 event).

## 3.2 Prompt P in the fully local pipeline

Variant B retrieval (meta-index plus rerank, no cloud step; the saved B lists of 1.11, identical in B1 and B2). B1 and B2 used the Sonnet prompt at 250 W; P1 and P2 used prompt P on the variant A lists at 250 W.

| measure | Qwen B1 (1.11) | Qwen B2 (1.11) | Qwen P1 on A (1.12) | Qwen P2 on A (1.12) | Qwen P on B, run 1 (3.2) | Qwen P on B, run 2 (3.2) |
|---|---|---|---|---|---|---|
| valid structured outputs | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 |
| answers that needed the retry | 0 | 0 | 0 | 0 | 0 | 0 |
| citations verified | 58/62 | 52/58 | 84/87 | 74/77 | 93/94 | 91/92 |
| quotes over 40 words | 0 | 0 | 0 | 0 | 0 | 0 |
| unanswerable labelled `none` | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| judge: correct / partially / incorrect | 17 / 12 / 5 | 17 / 10 / 7 | 16 / 13 / 5 | 16 / 11 / 7 | 16 / 15 / 3 | 18 / 11 / 5 |
| judge: supported / partly / unsupported | 3 / 30 / 1 | 2 / 31 / 1 | 1 / 32 / 1 | 6 / 25 / 3 | 3 / 31 / 0 | 6 / 27 / 1 |
| judge: premise handled (partial + no) | 7/8 | 7/8 | 7/8 | 7/8 | 6/8 | 7/8 |
| latency median / p95 (s) | 12.1 / 17.2 | 11.8 / 15.8 | 13.0 / 17.6 | 12.8 / 17.6 | 9.7 / 12.9 | 9.8 / 12.8 |
| decode tokens per second, median | 59.1 | 61.2 | 62.9 | 61.5 | 90.7 | 88.6 |
| generated tokens per answer, median | 247 | 250 | 276 | 252 | 276 | 254 |
| num_ctx | 16384 | 16384 | 17408 | 17408 | 17408 | 17408 |
| system prompt | ANSWER_SYSTEM | ANSWER_SYSTEM | LOCAL_QUOTE_SYSTEM | LOCAL_QUOTE_SYSTEM | LOCAL_QUOTE_SYSTEM | LOCAL_QUOTE_SYSTEM |

Generator per column:

- Qwen B1 (1.11): `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- Qwen B2 (1.11): `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- Qwen P1 on A (1.12): `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`
- Qwen P2 on A (1.12): `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`
- Qwen P on B, run 1 (3.2): `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`
- Qwen P on B, run 2 (3.2): `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`

### P on B against B1 and B2 (only the prompt differs)

- Unverified quotes 1/94 and 1/92 against 4/62 and 6/58; rate gap 0.054 vs spread 0.039, EXCEEDS the spread.
- Correct 16 and 18 against 17 and 17: gap 0 vs spread 2, within the spread. Incorrect 3 and 5 against 5 and 7: gap 0 vs spread 2, within the spread.
- Per question: spreads 7 and 10; changes between the pairs 9, 5, 9, 8 (19 up, 12 down over the four pairs).

### P on B against P1 and P2 (only the retrieval differs)

- Unverified quotes 1/94 and 1/92 against 3/87 and 3/77; rate gap 0.024 vs spread 0.004, EXCEEDS the spread.
- Correct 16 and 18 against 16 and 16: gap 0 vs spread 2, within the spread. Incorrect 3 and 5 against 5 and 7: gap 0 vs spread 2, within the spread.
- Per question: spreads 4 and 10; changes between the pairs 8, 13, 10, 11 (26 up, 16 down over the four pairs).

Box during local-pb1 (2026-11-16T11:10:01Z to 2026-11-16T11:16:05Z UTC): peak 417.6 W, average 369.7 W, max 72.1 C, peak VRAM 20259 MiB; alerts: none (no gap over 3 s, no Kernel-Power 41 event).
Box during local-pb2 (2026-11-16T11:16:16Z to 2026-11-16T11:22:20Z UTC): peak 418.6 W, average 369.6 W, max 72.7 C, peak VRAM 20259 MiB; alerts: none (no gap over 3 s, no Kernel-Power 41 event).
