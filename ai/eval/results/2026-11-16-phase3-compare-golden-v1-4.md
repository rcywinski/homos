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

