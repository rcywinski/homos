# Would the 2.4 agent conversations fit a local context? (step 3.5 plan)

Replay of the logged conversations of Sonnet runs A1 and A2 (36 tasks), counted with the Qwen3.8 tokenizer. System prompt, tool definitions and answer schema: 1485 tokens. A task fits when its largest prompt plus 4096 tokens for the answer is within num_ctx. Sonnet's own trajectory is kept, so these are size estimates.

| option | median largest prompt | max | fits 16384 | fits 24576 | fits 32768 | fits 40960 |
|---|---|---|---|---|---|---|
| as-is | 37108 | 72104 | 4/36 | 13/36 | 15/36 | 18/36 |
| small | 19617 | 36975 | 10/36 | 19/36 | 27/36 | 35/36 |
| compact | 14173 | 17594 | 15/36 | 36/36 | 36/36 | 36/36 |
| small+compact | 8292 | 9895 | 36/36 | 36/36 | 36/36 | 36/36 |

Options: small = search_journal k=5 and 18 000 characters, other results 6 000; compact = a result becomes a one-line stub once the model has taken one more turn after it; small+compact = both.

