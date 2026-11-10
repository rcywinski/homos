# AI layer: retrieval over the project journal (phase 1, steps 1.1 to 1.7)

First draft, 10 Nov 2026. Plan and checkboxes: [`AI-PLAN.md`](AI-PLAN.md). Code: `ai/`. Results: `ai/eval/results/`
(every row has a JSON and a Markdown file; `compare-golden-v1.3.md` and `compare-golden-v1.4.md` put them side by side).
This file is not part of the retrieval corpus (`ai/corpus/load.ts` excludes it), so writing it changes no result.

## What the problem is

The project left about 1.3 MB of Polish working journal (`journal/`: a 359 KB dated log, 37 morning reports, task
queues, decision notes) and about 80 KB of English documentation (`docs/`). Together that is roughly 350k tokens,
more than one context window. The questions a reader asks are in English and mostly about why something was done,
when something happened, or what an identifier meant. The retrieval layer has to find the few passages that answer
such a question, in a language the question is not written in.

## How it is built

- **Chunking by structure, not by size.** One journal entry (a `###` header in `CONTEXT.md`) is one chunk, one table
  row of the decision tables is one chunk with a "Decyzja z <date>:" prefix, one `##` section of a report is one
  chunk. Entries above a hard cap of 1500 estimated tokens are split at sentence boundaries into balanced parts, each
  carrying the entry title. 957 chunks. Chunk ids are citations: `file:line`, plus `#pN` for parts.
- **Embeddings on a local GPU box.** `bge-m3` (multilingual, 1024 dimensions) in Ollama on the former bot server
  (RTX 3090). Its real input limit is 2048 tokens and it truncates silently, so the chunk cap is set well below it;
  the client sends `truncate: false` so an overlong input fails loudly. The index is a plain JSON file with a corpus
  hash; a stale index refuses to load.
- **BM25 with a hand-written tokenizer.** Diacritics folded, dates in six written forms mapped to one token
  (`d20260915`), identifiers kept whole, a short Polish and English stopword list ("nie" kept, measured), optional
  6-character prefix stemming. A chunk's metadata date is indexed as its date token.
- **Hybrid by reciprocal rank fusion**, c = 60, no weights (with 26 questions any tuned weight would fit the test set).
- **Cross-encoder reranker on the same box.** `bge-reranker-v2-m3` behind a small FastAPI service, fp16 on the GPU,
  reorders the top 30 hybrid candidates. Device and max length are per-request parameters, so a CPU or short-input
  measurement needs no change on the box.
- **Metadata header in the index (`meta-index`).** File, date and title prepended to the chunk text for embedding,
  BM25 and the reranker. No model involved; this is the control row for everything generated.
- **Generated context (`contextual`).** For every chunk a model writes one or two English sentences: the date, the
  topic, the episode or decision it belongs to. The prompt is a cached project brief (`CASE-STUDY.md` plus
  `DECISION-LOG.md`), then the chunk's parent unit (the whole journal entry or the whole morning report), then the
  chunk. Sending the whole 150k-token journal 177 times was considered and rejected: the brief already carries the main
  episodes, other days' facts in the prompt invite wrong dates, and it would have cost several times more. Every
  context is validated (starts with the metadata date or "Undated:", no first person, no date absent from the
  sources), retried once, and stored empty if still invalid. The contexts are committed in `ai/context/`.
- **Polish query translation (`query-pl`).** One call per question returns a Polish rendering and 3 to 5 keywords the
  journal author would use. BM25 gets the question plus that text; the vectors and the reranker keep the original.

## How it is measured

34 golden questions (`ai/eval/golden.jsonl`): 10 why, 10 dated facts, 7 identifiers, 7 without a full answer. 26 are
answerable; one question is 3.8 percentage points. Evidence is a set of line ranges; a question counts as found at k
when any of the top k chunks overlaps any evidence range. Reported: recall at 5, 10 and 30, MRR at 10, and a
journal-only variant that counts only evidence in `journal/`. Rule for the answer key: a range is added only if a
human reading it agrees it answers the question; appearing in a retriever's top k is never the reason. Every result
records the golden version it used, and a comparison table only mixes rows with one corpus hash.

## Results

All rows below: corpus hash `8d7f9a34`, reranked rows with max length 2048 on the GPU. Each cell is
recall@5 / recall@10 / recall@30, then MRR@10, then journal-only recall@10. Haiku and Sonnet are Claude Haiku 5.5 and
Claude Sonnet 5.5.

| run | golden v1.3 | | | golden v1.4 | | |
|---|---|---|---|---|---|---|
| | R@5 / R@10 / R@30 | MRR | journal R@10 | R@5 / R@10 / R@30 | MRR | journal R@10 |
| vector | 50 / 58 / 58 | 0.378 | 46 | 69 / 77 / 77 | 0.505 | 58 |
| hybrid (BM25 prefix6 + vector) | 42 / 46 / 65 | 0.310 | 31 | 62 / 65 / 77 | 0.454 | 35 |
| hybrid + rerank | 50 / 58 / 65 | 0.349 | 46 | 62 / 65 / 77 | 0.441 | 54 |
| hybrid + rerank, meta header to the reranker | 54 / 58 / 65 | 0.403 | 50 | 65 / 69 / 77 | 0.499 | 58 |
| meta-index + rerank (the row to beat) | 62 / 65 / 69 | 0.416 | 58 | 65 / 73 / 81 | 0.485 | 65 |
| query-pl | 62 / 69 / 77 | 0.423 | 65 | 65 / 77 / 81 | 0.466 | 73 |
| contextual, Sonnet | 58 / 69 / 69 | 0.433 | 65 | 77 / 81 / 88 | 0.530 | 73 |
| contextual, Haiku run 1 | 65 / 77 / 81 | 0.473 | 73 | 69 / 77 / 92 | 0.547 | 77 |
| contextual, Haiku run 2 | 62 / 73 / 77 | 0.451 | 65 | 65 / 73 / 81 | 0.505 | 73 |
| contextual Sonnet + query-pl | 62 / 69 / 77 | 0.448 | 65 | 81 / 81 / 92 | 0.546 | 77 |
| contextual Haiku run 1 + query-pl | 62 / 77 / 85 | 0.464 | 73 | 65 / 77 / 92 | 0.513 | 77 |
| contextual Haiku run 2 + query-pl | 62 / 77 / 77 | 0.468 | 73 | 69 / 81 / 88 | 0.526 | 81 |

Percentages of 26 answerable questions. Rejected or neutral variants measured along the way: reranker max length 1024
(60 ms faster, 23% of pairs truncated, no metric change), dropping "nie" from BM25 (identical results), the BM25
date fix and file-name dates (below).

### The answer key moved the baseline

The vector baseline went from 58% to 77% recall@10 between v1.3 and v1.4 without any change to the retriever. v1.4
completed the answer key after one pooled review, and most of the added evidence is English documentation
(`CASE-STUDY.md`, `DECISION-LOG.md`, `ALGORITHM.md`, `UI-DESIGN.md`, `EMERGENCY.md`, `AI-WORKFLOW.md`) that the vectors
had been finding all along. So part of the early "weak baseline" was the key, not the retriever. On v1.4 the variants
differ in two places: the journal-only column (vector 58%, meta-index 65%, generated context and Polish queries 73 to
81%) and recall@30 (vector 77%, meta-index 81%, the context rows 81 to 92%). That is the honest summary of phase 1
retrieval: generated context and query translation get the Polish journal found; English questions find the English
documents without help.

### Run-to-run spread

The Haiku contexts were generated twice with the same prompt. Between the two runs 10 of 26 questions change the
rank of their first hit. On v1.3 contextual Haiku moved from 77% to 73% recall@10 and from 81% to 77% recall@30; on v1.4
recall@30 moved from 92% to 81%. One generation run therefore moves results by one to three questions, as much as
the difference between Haiku and Sonnet. Neither model is shown to be better.

### Chosen variant for step 1.8

Haiku contexts plus Polish query translation, using the run-1 contexts file. It is chosen for cost and simplicity, not
for a measured quality lead: the context rows are within their own spread of each other. Run 1 is used because it was
generated before any comparison was made, so it was not picked for its score.

## Cost and latency

| item | cost (USD) |
|---|---|
| contexts, Sonnet, 957 chunks (incl. regenerating rejected ones) | 8.29 |
| contexts, Haiku run 1 | 0.51 |
| contexts, Haiku run 2 | 0.42 |
| 20-chunk samples for the model choice (both models) | 0.39 |
| Polish query translation, 34 questions (Sonnet) | 0.05 |
| **total, step 1.7** | **9.66** |

Real usage from the API's usage fields. 89% of input tokens were cache reads. Claude's tokenizer counts this text at
about 1.4 times the estimate tuned for `bge-m3`, so the hard spend cap uses a 2x margin. A full context run takes about
8 minutes.

Reranker latency for 30 candidate pairs per question, server side: GPU median 360 ms, p95 475 ms (max length 2048);
CPU on the same box, a latency sample of 5 questions: median 38.1 s (34.8 to 45.4 s), about 100 times slower. Embedding
the whole corpus takes about 23 s.

## What went wrong, and what it taught

- **Selection bias in the answer key.** Golden v1.3 added evidence to one question after reading the top 5 of the
  reranked run only. The human-reading rule held, but the list to read came from one retriever, so that retriever
  gained most (without it, plain rerank recall@10 would have been 54% instead of 58%). From then on misses were
  reviewed once, after step 1.7, from one list pooled across all 15 runs.
- **Limits of that review.** The pool had 611 chunk and question pairs. The analysis session pre-read it and read about
  35 candidates in full; the owner decided. The 145 pairs of the partial and no-answer questions were not reviewed.
  Most rejected chunks were judged from their first lines, and one long chunk (`CONTEXT.md:1721-1776`, the 29.08 cost
  and IL breakdown) was first rejected that way and recovered only because the owner questioned it. A pooled review
  also cannot add evidence that no run ever retrieved. v1.4 evidence is a floor, not a complete set.
- **Date bugs.** Validating generated contexts exposed three gaps in the BM25 date normaliser: ISO timestamps
  (`2026-08-17T05:30Z`) get no date token, "31.08." with a trailing dot is skipped, and "APR" (annual percentage rate)
  is read as April ("top-5 APR" became 5 April). The validator had the same gaps and, worse, did not count the date
  in a file name (`DECYZJE-2026-08-26.md`), so most first-pass rejections were the validator's fault; the rejected
  texts were kept and re-checked offline, without new API calls. Fixed in BM25 behind a switch and measured: no
  question's first hit changes. Giving the 28 chunks of that file the date from its name, also measured: one question
  up, one down. Both stay off by default.
- **The zsh mishap.** The first batch of v1.4 runs passed the variant options through a shell variable; zsh does not
  split a variable into words, so six context rows silently ran as the plain vector baseline. It showed because three
  different rows came out with identical numbers to the third decimal. The runs were repeated from a bash script, and
  every row's retriever string was checked against its label. Identical numbers across rows that should differ are
  now a check of their own.
- **A clean-looking test that was not.** The first "starts without login" check of the inference box passed while an
  RDP session had reconnected 6 s before the service started. The repeat on 10 Nov, with boot, task start and first
  logon times read from the box's logs, is the one on record (`inference/README.md`).

## Memory errors found while writing the answer key

The golden questions started from a draft written from memory by the owner and the analysis session. Checking every
reference answer against the sources found these errors; they are a reason this layer exists.

- **why-03:** remembered a 13-pool funnel with TVL, volume and fee filters and a mid-2024 age cutoff choosing the
  720-day pools. The sources show the 365-day set reused, no age cutoff, and the walk-forward, not the data fetch, as
  the bottleneck.
- **why-04:** implied that direct session-to-session messaging never existed. It was tried on 10.08 (unavailable) and
  used between CC-Mac and CC-Win from 01.09.
- **why-06:** "never enabled at this capital scale" is not a reason in the sources; capital scale is the reason for
  having no own smart contract. The empty private key belongs to observe mode; the modes are a trust ladder.
- **why-08 (owner):** "worse backtests for crypto/crypto" is the opposite of the sources, which show that pair with the
  best LP versus HODL result. The risk was beta, not LP quality.
- **why-09:** the draft implied the volatility fix explained 0 of 21 configurations failing; 0 of 21 was measured
  before the fix, and the recalibrated run still failed the gate.
- **dated-01:** "deposited 27.08". The USDC arrived on 25.08; 27.08 is when it went into the pools.
- **dated-04:** two analyses remembered as LP backtests were not, the 29.08 run was not the last, and the pause was
  ordered on 21.09, not 22.09.
- **dated-06:** the remembered sequence of three failed nights is wrong, and the 20.08 journal title "first clean
  automatic run" is contradicted by that night's own report. The automatic report wins over the human summary.
- **dated-07:** the fixes remembered as made "during the investment" were never deployed or were ordered after the
  LP exit.
- **id-04, id-06, id-01, id-03:** smaller corrections (what a task actually computed, review windows, which names are
  regime transitions, a mechanic that is inferred rather than stated).
- **id-07 and na-07:** "the SQLite schema is the bot ledger, not backtests". The design also had a backtest-run index
  table, and it was a design, never a running database.
- **na-01:** "DAC8" appears nowhere in the corpus.

## Open points carried into step 1.8

- With candidates in the top 30 for 22 to 24 of 26 questions but in the top 5 for 16 to 21, answer quality is to be
  measured with 5 and with 10 chunks given to the model.
- The 145 unreviewed pairs of the partial and no-answer questions matter for 1.8: those questions test whether the
  answer says there is not enough context.
