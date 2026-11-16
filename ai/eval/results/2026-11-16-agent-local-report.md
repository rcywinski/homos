# Local agent, step 3.5: report

Sonnet A1 and A2 from step 2.4 (prompt A, effort medium; cost at the corrected price). QA-cl and QA-c: qwen3.8:27b through Ollama, prompt A, thinking off, compaction on demand with restore on a repeated call; QA-cl searches with fully local retrieval, QA-c with the Sonnet setup (contexts plus Sonnet query translation). Local judge spend $1.3237.

| measure | Sonnet A1 (2.4) | Sonnet A2 (2.4) | QA-cl1 | QA-cl2 | QA-c1 | QA-c2 |
|---|---|---|---|---|---|---|
| correct / partially / incorrect | 17 / 1 / 0 | 16 / 2 / 0 | 11 / 4 / 3 | 14 / 2 / 2 | 14 / 3 / 1 | 15 / 1 / 2 |
| supported / partly / unsupported | 1 / 17 / 0 | 1 / 17 / 0 | 0 / 17 / 1 | 0 / 16 / 2 | 0 / 17 / 1 | 0 / 16 / 2 |
| premise handled (p-01..p-03) | 3/3 | 3/3 | 1/3 | 1/3 | 3/3 | 2/3 |
| required sources ok (after the 2.4 review) | 18/18 | 17/18 | 13/18 | 14/18 | 11/18 | 14/18 |
| answered / repeated / step limit / spend guard / no answer | 6 / 1 / 5 / 6 / 0 | 7 / 4 / 1 / 6 / 0 | 6 / 5 / 7 / 0 / 0 | 4 / 5 / 8 / 0 / 1 | 3 / 8 / 7 / 0 / 0 | 3 / 4 / 11 / 0 / 0 |
| redundant calls (repeat / reread / no new chunks) | 25 (4 / 17 / 4) | 17 (10 / 6 / 1) | 44 (15 / 27 / 2) | 37 (15 / 16 / 6) | 72 (32 / 36 / 4) | 48 (19 / 29 / 0) |
| rereads later used in a dataRef | 16 | 6 | 15 | 7 | 29 | 21 |
| unneeded jobs | 2 | 0 | 1 | 1 | 0 | 2 |
| legend citations | 0 | 0 | 0 | 0 | 0 | 0 |
| citations verified | 41/41 | 44/44 | 31/37 | 31/36 | 40/44 | 36/43 |
| dataRefs verified | 123/125 | 123/127 | 85/103 | 82/104 | 76/120 | 99/116 |
| turns, sum / tool calls | 137 / 135 | 117 / 117 | 137 / 163 | 153 / 165 | 143 / 183 | 153 / 178 |
| invalid tool calls (rejected by the validator) | n/a | n/a | 0 | 0 | 2 | 1 |
| final answers that did not parse | n/a | n/a | 0 | 0 | 0 | 0 |
| tasks stopped on the context limit | n/a | n/a | 0 | 0 | 0 | 0 |
| tool turns answered in text | n/a | n/a | 5 | 3 | 2 | 3 |
| results compacted / tasks with compaction | n/a | n/a | 87 / 14 | 74 / 13 | 82 / 15 | 82 / 15 |
| repeats after compaction: restored / refused; plain repeats | n/a | n/a | 12 / 0; 3 | 11 / 0; 4 | 15 / 0; 17 | 11 / 0; 8 |
| largest server prompt (tokens) | n/a | n/a | 19455 | 19399 | 19502 | 19361 |
| cost $ (cloud only) | 2.7974 | 2.5092 | 0 | 0 | 0.0825 | 0.0911 |
| time s total / median without jobs | 1138 / 32.5 | 902 / 25.5 | 1738 / 70.1 | 1733 / 79.9 | 1626 / 74.1 | 1983 / 86.7 |

## Spread and what exceeds it

A variant differs when the difference of its two-run mean from the other's is larger than both run-to-run spreads.

### QA-cl against Sonnet A

- correct: QA-cl1, QA-cl2 minus A1, A2 = -4 (spreads 1 and 3): EXCEEDS.
- incorrect: QA-cl1, QA-cl2 minus A1, A2 = 2.5 (spreads 0 and 1): EXCEEDS.
- required ok: QA-cl1, QA-cl2 minus A1, A2 = -4 (spreads 1 and 1): EXCEEDS.
- answered: QA-cl1, QA-cl2 minus A1, A2 = -1.5 (spreads 1 and 2): within.
- redundant calls: QA-cl1, QA-cl2 minus A1, A2 = 19.5 (spreads 8 and 7): EXCEEDS.
- turns: QA-cl1, QA-cl2 minus A1, A2 = 18 (spreads 20 and 16): within.
- median s without jobs: QA-cl1, QA-cl2 minus A1, A2 = 46 (spreads 7 and 9.8): EXCEEDS.

### QA-c against Sonnet A

- correct: QA-c1, QA-c2 minus A1, A2 = -2 (spreads 1 and 1): EXCEEDS.
- incorrect: QA-c1, QA-c2 minus A1, A2 = 1.5 (spreads 0 and 1): EXCEEDS.
- required ok: QA-c1, QA-c2 minus A1, A2 = -5 (spreads 1 and 3): EXCEEDS.
- answered: QA-c1, QA-c2 minus A1, A2 = -3.5 (spreads 1 and 0): EXCEEDS.
- redundant calls: QA-c1, QA-c2 minus A1, A2 = 39 (spreads 8 and 24): EXCEEDS.
- turns: QA-c1, QA-c2 minus A1, A2 = 21 (spreads 20 and 10): EXCEEDS.
- median s without jobs: QA-c1, QA-c2 minus A1, A2 = 51.4 (spreads 7 and 12.6): EXCEEDS.

### QA-c against QA-cl (retrieval only)

- correct: QA-c1, QA-c2 minus QA-cl1, QA-cl2 = 2 (spreads 3 and 1): within.
- incorrect: QA-c1, QA-c2 minus QA-cl1, QA-cl2 = -1 (spreads 1 and 1): within.
- required ok: QA-c1, QA-c2 minus QA-cl1, QA-cl2 = -1 (spreads 1 and 3): within.
- answered: QA-c1, QA-c2 minus QA-cl1, QA-cl2 = -2 (spreads 2 and 0): within.
- redundant calls: QA-c1, QA-c2 minus QA-cl1, QA-cl2 = 19.5 (spreads 7 and 24): within.
- turns: QA-c1, QA-c2 minus QA-cl1, QA-cl2 = 3 (spreads 16 and 10): within.
- median s without jobs: QA-c1, QA-c2 minus QA-cl1, QA-cl2 = 5.4 (spreads 9.8 and 12.6): within.

## Compaction per task

| task | QA-cl1 | QA-cl2 | QA-c1 | QA-c2 |
|---|---|---|---|---|
| j-01 | 5 compacted, 1 restored, 0 refused | 3 compacted, 0 restored, 0 refused | 7 compacted, 1 restored, 0 refused | 5 compacted, 1 restored, 0 refused |
| j-02 | 6 compacted, 2 restored, 0 refused | 6 compacted, 2 restored, 0 refused | 6 compacted, 3 restored, 0 refused | 6 compacted, 2 restored, 0 refused |
| j-03 | 7 compacted, 2 restored, 0 refused | 8 compacted, 0 restored, 0 refused | 5 compacted, 3 restored, 0 refused | 2 compacted, 0 restored, 0 refused |
| d-01 | 0 compacted, 0 restored, 0 refused | 8 compacted, 2 restored, 0 refused | 4 compacted, 1 restored, 0 refused | 7 compacted, 2 restored, 0 refused |
| d-02 | 6 compacted, 2 restored, 0 refused | 0 compacted, 0 restored, 0 refused | 0 compacted, 0 restored, 0 refused | 1 compacted, 0 restored, 0 refused |
| d-03 | 8 compacted, 0 restored, 0 refused | 8 compacted, 0 restored, 0 refused | 8 compacted, 1 restored, 0 refused | 0 compacted, 0 restored, 0 refused |
| b-01 | 8 compacted, 0 restored, 0 refused | 1 compacted, 0 restored, 0 refused | 1 compacted, 0 restored, 0 refused | 2 compacted, 0 restored, 0 refused |
| b-02 | 2 compacted, 0 restored, 0 refused | 2 compacted, 0 restored, 0 refused | 3 compacted, 0 restored, 0 refused | 5 compacted, 1 restored, 0 refused |
| b-03 | 5 compacted, 1 restored, 0 refused | 7 compacted, 2 restored, 0 refused | 4 compacted, 1 restored, 0 refused | 7 compacted, 2 restored, 0 refused |
| x-01 | 1 compacted, 0 restored, 0 refused | 8 compacted, 3 restored, 0 refused | 3 compacted, 0 restored, 0 refused | 5 compacted, 1 restored, 0 refused |
| x-02 | 8 compacted, 0 restored, 0 refused | 0 compacted, 0 restored, 0 refused | 10 compacted, 0 restored, 0 refused | 13 compacted, 0 restored, 0 refused |
| x-03 | 6 compacted, 2 restored, 0 refused | 4 compacted, 0 restored, 0 refused | 6 compacted, 2 restored, 0 refused | 6 compacted, 2 restored, 0 refused |
| t-01 | 0 compacted, 0 restored, 0 refused | 0 compacted, 0 restored, 0 refused | 0 compacted, 0 restored, 0 refused | 0 compacted, 0 restored, 0 refused |
| t-02 | 15 compacted, 1 restored, 0 refused | 0 compacted, 0 restored, 0 refused | 4 compacted, 0 restored, 0 refused | 3 compacted, 0 restored, 0 refused |
| t-03 | 2 compacted, 0 restored, 0 refused | 6 compacted, 1 restored, 0 refused | 0 compacted, 0 restored, 0 refused | 4 compacted, 0 restored, 0 refused |
| p-01 | 0 compacted, 0 restored, 0 refused | 0 compacted, 0 restored, 0 refused | 8 compacted, 0 restored, 0 refused | 0 compacted, 0 restored, 0 refused |
| p-02 | 0 compacted, 0 restored, 0 refused | 5 compacted, 1 restored, 0 refused | 5 compacted, 3 restored, 0 refused | 8 compacted, 0 restored, 0 refused |
| p-03 | 8 compacted, 1 restored, 0 refused | 8 compacted, 0 restored, 0 refused | 8 compacted, 0 restored, 0 refused | 8 compacted, 0 restored, 0 refused |
