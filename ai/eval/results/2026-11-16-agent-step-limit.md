# Step-limit tasks: what used up the steps

From saved logs only (step 3.5 follow-up). Classes per tool call: (a) repeat or near-repeat of a result that was compacted in the prompt the model saw, (b) repeat or near-repeat of a result still visible, (c) new, different call. A task gets the class with the most calls. Compaction state per turn is recomputed by replaying each local task through OllamaConversation; every replay matched the recorded compaction stats. Sonnet runs had no compaction.

| run | step-limit tasks | class a / b / c | calls a / b / c | tool turns only a / only b |
|---|---|---|---|---|
| A1 | 5 | 0 / 2 / 3 | 0 / 23 / 26 | 0 / 21 |
| A2 | 1 | 0 / 1 / 0 | 0 / 8 / 3 | 0 / 6 |
| QA-cl1 | 7 | 0 / 3 / 4 | 19 / 35 / 46 | 9 / 11 |
| QA-cl2 | 8 | 0 / 2 / 6 | 8 / 29 / 46 | 8 / 20 |
| QA-c1 | 7 | 1 / 2 / 4 | 25 / 47 / 42 | 15 / 13 |
| QA-c2 | 11 | 1 / 1 / 9 | 34 / 28 / 75 | 23 / 13 |

## Per task

| run | task | calls | a | b | c | class | redundant calls (step, tool, kind, class) |
|---|---|---|---|---|---|---|---|
| A1 | b-02 | 10 | 0 | 3 | 7 | c | 5 read_backtest_results reread b; 7 read_backtest_results reread b; 9 read_backtest_results reread b |
| A1 | x-03 | 10 | 0 | 4 | 6 | c | 3 read_backtest_results reread b; 4 read_backtest_results reread b; 5 read_backtest_results reread b; 9 read_backtest_results reread b |
| A1 | t-01 | 9 | 0 | 5 | 4 | b | 4 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 8 read_backtest_results reread b; 9 read_backtest_results reread b |
| A1 | t-02 | 11 | 0 | 7 | 4 | b | 4 read_backtest_results reread b; 5 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 8 read_backtest_results reread b |
| A1 | p-02 | 9 | 0 | 4 | 5 | c | 3 read_backtest_results reread b; 4 read_backtest_results reread b; 7 read_backtest_results reread b; 8 run_backtest repeat b |
| A2 | t-02 | 11 | 0 | 8 | 3 | b | 4 read_backtest_results reread b; 5 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 8 run_backtest repeat b; 9 read_backtest_results reread b |
| QA-cl1 | j-01 | 11 | 4 | 1 | 6 | c | 4 read_backtest_results reread b; 6 read_decision_log repeat a; 7 read_backtest_results reread a; 8 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-cl1 | d-03 | 10 | 0 | 0 | 10 | c |  |
| QA-cl1 | b-01 | 9 | 1 | 0 | 8 | c | 9 search_journal no-new-chunks a |
| QA-cl1 | b-02 | 9 | 0 | 5 | 4 | b | 5 read_backtest_results reread b; 6 search_journal repeat b; 7 read_backtest_results repeat b; 8 read_backtest_results reread b; 9 read_backtest_results reread b |
| QA-cl1 | x-02 | 29 | 8 | 15 | 6 | b | 3 read_backtest_results reread b; 3 read_backtest_results reread b; 3 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 8 read_backtest_results reread b; 8 read_backtest_results reread b; 8 read_backtest_results reread b; 8 read_backtest_results reread b; 8 read_backtest_results reread b; 8 read_backtest_results reread b; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-cl1 | t-02 | 23 | 5 | 14 | 4 | b | 3 read_backtest_results reread b; 3 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 6 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread a; 7 read_backtest_results reread a; 7 read_backtest_results reread a; 7 read_backtest_results reread a; 9 read_backtest_results repeat a |
| QA-cl1 | p-03 | 9 | 1 | 0 | 8 | c | 7 list_backtest_configs repeat a |
| QA-cl2 | j-03 | 9 | 1 | 1 | 7 | c | 6 search_journal no-new-chunks a; 7 search_journal no-new-chunks b |
| QA-cl2 | d-03 | 11 | 0 | 2 | 9 | c | 2 read_decision_log repeat b; 9 read_backtest_results reread b |
| QA-cl2 | b-02 | 10 | 1 | 4 | 5 | c | 5 read_backtest_results reread a; 6 read_backtest_results reread b; 7 read_backtest_results repeat b; 8 read_backtest_results reread b; 9 read_backtest_results reread b |
| QA-cl2 | t-02 | 17 | 0 | 15 | 2 | b | 3 read_backtest_results reread b; 3 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 5 read_backtest_results reread b; 5 read_backtest_results reread b; 5 read_backtest_results reread b; 5 read_backtest_results reread b; 6 read_backtest_results reread b; 6 read_backtest_results reread b; 6 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 8 read_backtest_results reread b; 9 read_backtest_results reread b |
| QA-cl2 | t-03 | 9 | 2 | 0 | 7 | c | 6 read_backtest_results repeat a; 9 read_backtest_results reread a |
| QA-cl2 | p-01 | 9 | 0 | 6 | 3 | b | 4 read_backtest_results reread b; 5 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 8 read_backtest_results reread b; 9 read_backtest_results reread b |
| QA-cl2 | p-02 | 9 | 2 | 1 | 6 | c | 3 read_backtest_results reread b; 7 read_backtest_results repeat a; 9 read_backtest_results reread a |
| QA-cl2 | p-03 | 9 | 2 | 0 | 7 | c | 7 read_backtest_results reread a; 9 search_journal no-new-chunks a |
| QA-c1 | j-01 | 13 | 6 | 0 | 7 | c | 6 search_journal no-new-chunks a; 7 read_backtest_results repeat a; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-c1 | d-03 | 10 | 2 | 1 | 7 | c | 2 search_journal no-new-chunks b; 8 search_journal repeat a; 9 search_journal no-new-chunks a |
| QA-c1 | b-02 | 10 | 5 | 1 | 4 | a | 4 read_backtest_results reread b; 5 read_backtest_results reread a; 6 read_backtest_results reread a; 7 read_backtest_results reread a; 8 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-c1 | x-02 | 39 | 0 | 32 | 7 | b | 3 read_backtest_results reread b; 3 read_backtest_results reread b; 3 read_backtest_results reread b; 3 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 8 read_backtest_results repeat b; 8 read_backtest_results repeat b; 8 read_backtest_results repeat b; 8 read_backtest_results repeat b; 9 read_backtest_results repeat b; 9 read_backtest_results repeat b; 9 read_backtest_results repeat b; 9 read_backtest_results repeat b |
| QA-c1 | t-02 | 24 | 10 | 12 | 2 | b | 3 read_backtest_results reread b; 4 read_backtest_results reread b; 5 read_backtest_results reread b; 5 read_backtest_results reread b; 6 read_backtest_results reread b; 6 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-c1 | p-01 | 9 | 1 | 1 | 7 | c | 6 run_backtest repeat a; 7 read_backtest_results reread b |
| QA-c1 | p-03 | 9 | 1 | 0 | 8 | c | 6 read_backtest_results reread a |
| QA-c2 | j-01 | 13 | 5 | 2 | 6 | c | 5 read_decision_log repeat a; 6 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread a; 8 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-c2 | d-01 | 9 | 2 | 0 | 7 | c | 6 search_journal repeat a; 7 read_decision_log repeat a |
| QA-c2 | b-01 | 9 | 5 | 1 | 3 | a | 4 read_backtest_results reread b; 5 read_backtest_results reread a; 6 read_backtest_results reread a; 7 read_backtest_results reread a; 8 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-c2 | b-02 | 12 | 2 | 4 | 6 | c | 5 read_backtest_results repeat a; 6 read_backtest_results reread a; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 7 read_backtest_results reread b; 9 search_journal repeat b |
| QA-c2 | b-03 | 10 | 2 | 0 | 8 | c | 7 read_backtest_results repeat a; 8 read_decision_log repeat a |
| QA-c2 | x-01 | 10 | 2 | 0 | 8 | c | 8 read_backtest_results reread a; 9 read_backtest_results repeat a |
| QA-c2 | x-02 | 29 | 12 | 4 | 13 | c | 3 read_backtest_results reread b; 3 read_backtest_results reread b; 3 read_backtest_results reread b; 3 read_backtest_results reread b; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 8 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-c2 | t-02 | 18 | 0 | 14 | 4 | b | 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 4 read_backtest_results reread b; 5 read_backtest_results reread b; 5 read_backtest_results reread b; 5 read_backtest_results reread b; 5 read_backtest_results reread b; 5 read_backtest_results reread b; 6 read_backtest_results reread b; 6 read_backtest_results reread b; 7 read_backtest_results reread b; 9 read_backtest_results repeat b |
| QA-c2 | t-03 | 9 | 3 | 0 | 6 | c | 7 read_backtest_results reread a; 8 read_backtest_results reread a; 9 read_backtest_results reread a |
| QA-c2 | p-02 | 9 | 0 | 3 | 6 | c | 4 read_backtest_results reread b; 6 read_backtest_results reread b; 7 run_backtest repeat b |
| QA-c2 | p-03 | 9 | 1 | 0 | 8 | c | 7 read_backtest_results reread a |
