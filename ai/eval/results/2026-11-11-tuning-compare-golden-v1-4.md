# Local generator tuning (step 1.12)

Golden set v1.4, variant A chunk lists (k=10), qwen3.8:27b, thinking off, 250 W. All answers judged by the step 1.9 Opus judge, blind to the generator.

| measure | Sonnet 5.5 | Qwen A1 (1.11) | Qwen A2 (1.11) | S1 | S2 | P1 | P2 | L1 | L2 |
|---|---|---|---|---|---|---|---|---|---|
| valid structured outputs | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 | 34/34 |
| answers that needed the retry | n/a | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| citations verified | 97/97 | 59/65 | 53/57 | 65/68 | 60/67 | 84/87 | 74/77 | n/a (by construction) | n/a (by construction) |
| valid references (L only) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 76/76 | 77/77 |
| references outside the given chunks / invalid ranges | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 0 / 0 | 0 / 0 |
| quotes over 40 words | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 28 (extracted) | 23 (extracted) |
| unanswerable labelled `none` | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| judge: correct / partially / incorrect | 20 / 12 / 2 | 13 / 16 / 5 | 12 / 15 / 7 | 12 / 15 / 7 | 14 / 13 / 7 | 16 / 13 / 5 | 16 / 11 / 7 | 14 / 16 / 4 | 15 / 15 / 4 |
| judge: supported / partly / unsupported | 6 / 28 / 0 | 3 / 30 / 1 | 2 / 29 / 3 | 2 / 30 / 2 | 4 / 28 / 2 | 1 / 32 / 1 | 6 / 25 / 3 | 11 / 21 / 1 | 9 / 25 / 0 |
| judge: premise handled (partial + no) | 8/8 | 7/8 | 6/8 | 6/8 | 6/8 | 7/8 | 7/8 | 6/8 | 7/8 |
| latency median / p95 (s) | 4.1 / 7.4 | 12.4 / 16.2 | 12.8 / 17.4 | 13.1 / 17.1 | 12.6 / 16.8 | 13.0 / 17.6 | 12.8 / 17.6 | 13.3 / 17.9 | 13.4 / 18.8 |
| decode tokens per second, median | n/a | 60.2 | 60.5 | 60.1 | 61.1 | 62.9 | 61.5 | 58.3 | 61.1 |
| generated tokens per answer, median | 435 | 277 | 242 | 281 | 258 | 276 | 252 | 225 | 213 |
| num_ctx | n/a | 16384 | 16384 | 16384 | 16384 | 17408 | 17408 | 18432 | 18432 |
| presence penalty | n/a | 1.5 | 1.5 | 0 | 0 | 0 | 0 | 0 | 0 |
| API cost | $1.049 | $0 | $0 | $0 | $0 | $0 | $0 | $0 | $0 |

Generator per column:

- Sonnet 5.5: `answer:claude-sonnet-5-5(effort=medium)`
- Qwen A1 (1.11): `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- Qwen A2 (1.11): `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`
- S1: `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=ANSWER_SYSTEM,cite=quote)`
- S2: `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=ANSWER_SYSTEM,cite=quote)`
- P1: `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`
- P2: `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`
- L1: `answer:ollama:qwen3.8:27b(think=false,num_ctx=18432,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_REF_SYSTEM (ai/answer/prompt-local.ts),cite=ref)`
- L2: `answer:ollama:qwen3.8:27b(think=false,num_ctx=18432,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_REF_SYSTEM (ai/answer/prompt-local.ts),cite=ref)`

## Against the 1.11 baseline (Qwen A runs 1 and 2)

A range "exceeds" when the gap between the baseline's two runs and the variant's two runs is larger than the wider of the two spreads.

### S

- Citations: unverified 3/68 and 7/67 against baseline 6/65 and 4/57; unverified-rate gap 0.000 vs spread 0.060: within the spread.
- Correct answers 12 and 14 against 13 and 12: gap 0 vs spread 2, within. Incorrect 7 and 7 against 5 and 7: gap 0 vs spread 2, within.
- Per question: baseline spread 7, variant spread 8, baseline-to-variant changes 7, 10, 2, 9 (14 up, 14 down over the four pairs).

### P

- Citations: unverified 3/87 and 3/77 against baseline 6/65 and 4/57; unverified-rate gap 0.031 vs spread 0.022: EXCEEDS the spread.
- Correct answers 16 and 16 against 13 and 12: gap 3 vs spread 1, EXCEEDS. Incorrect 5 and 7 against 5 and 7: gap 0 vs spread 2, within.
- Per question: baseline spread 7, variant spread 4, baseline-to-variant changes 7, 5, 6, 5 (18 up, 5 down over the four pairs).

### L

- Citations: citation by reference: verified by construction, not comparable; valid references [{"refs":76,"valid":76,"outside":0,"invalidRange":0,"overLong":28},{"refs":77,"valid":77,"outside":0,"invalidRange":0,"overLong":23}].
- Correct answers 14 and 15 against 13 and 12: gap 1 vs spread 1, within. Incorrect 4 and 4 against 5 and 7: gap 1 vs spread 2, within.
- Per question: baseline spread 7, variant spread 9, baseline-to-variant changes 8, 5, 7, 7 (21 up, 6 down over the four pairs).

