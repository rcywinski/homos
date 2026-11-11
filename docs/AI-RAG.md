# AI layer: retrieval and cited answers over the project journal (phase 1)

Phase 1 write-up, 11 Nov 2026 (first draft 10 Nov). Plan and checkboxes: [`AI-PLAN.md`](AI-PLAN.md). Code: `ai/`.
Results: `ai/eval/results/` (every run has a JSON and a Markdown file; `compare-golden-v1.3.md` and
`compare-golden-v1.4.md` put the retrieval rows side by side). This file is not part of the retrieval corpus
(`ai/corpus/load.ts` excludes it), so writing it changes no result.

Three sessions built this layer: **CC-Mac** (Claude Code on the Mac: all code, git and evaluation runs), **CC-Win**
(Claude Code on the Windows GPU box: only operating the inference services) and the **analysis session** (the
owner's chat session: plan changes, explanations and interpretation of results, no code); see `CLAUDE.md`,
"Sessions and coordination".

## In short

- The test: 34 golden questions, 26 with evidence in the sources and 8 whose premise is false or whose answer is not
  in the sources. Golden set v1.4. One answerable question is 3.8 percentage points.
- Retrieval, the variant used for answering: recall@10 77% (20/26), recall@30 92% (24/26). The plain vector baseline
  on the same key: recall@10 77% (20/26), recall@30 77% (20/26). The gain is in the Polish journal and in the top 30.
- Answers with k=10 chunks (the default): 97 of 97 citations verified against the source text, all 3 unanswerable
  questions answered "not in the sources". An Opus 5.5 judge rates 20 of 34 answers correct, 12 partially correct and
  2 incorrect. On 8 answers graded blind by the owner it agrees exactly on 5 and within one step on all 8.
- Cost of all measured runs, steps 1.7 to 1.9: $13.49.

## What the problem is

The project left about 1.3 MB of Polish working journal (`journal/`: a 359 KB dated log, 37 morning reports, task
queues, decision notes) and about 80 KB of English documentation (`docs/`). Together that is roughly 350k tokens,
more than one context window. The questions a reader asks are in English and mostly about why something was done,
when something happened, or what an identifier meant. The layer has to find the few passages that answer such a
question, in a language the question is not written in, and answer with quotes a reader can check.

## Pipeline

`npm run ask -- "<question>"` runs these steps:

1. **Polish rendering.** Claude Sonnet 5.5 turns the English question into a Polish rendering plus 3 to 5 keywords
   the journal author would have used (cached for the golden questions, one call for a new question).
2. **Two retrievers over the same index view.** Each of the 957 chunks is indexed with a metadata header (file, date,
   title) and a one or two sentence English context written by Claude Haiku 5.5. Vector search (`bge-m3` on the local
   GPU box) gets the question; BM25 gets the question plus its Polish rendering.
3. **Fusion.** Reciprocal rank fusion, c = 60, depth 100, no weights.
4. **Rerank.** A cross-encoder (`bge-reranker-v2-m3`, same box) reorders the top 30, reading the header and context
   with each chunk.
5. **Answer.** The top 10 chunks go to Claude Sonnet 5.5 as source text only, without the generated context. It returns
   an answer, a coverage label (`full`, `partial`, `none`) and citations: a chunk id plus a verbatim quote of at most
   about 40 words.
6. **Verify.** Every quote is checked mechanically against the chunk it cites and located in the file, so it prints as
   `file:lineStart-lineEnd`. A quote that is not in its chunk is flagged, never silently kept. The comparison
   tolerates only what a verbatim copy may legitimately lose: runs of whitespace (a line break in the source may match
   one space or none), Markdown emphasis and code marks, blockquote markers at line starts, and typographic quotes.

## Design decisions and the alternatives rejected

- **Chunks follow the structure, not a fixed size.** One journal entry (a `###` header in `CONTEXT.md`) is one chunk,
  one decision-table row is one chunk with a "Decyzja z <date>:" prefix, one `##` section of a report is one chunk.
  Fixed-size windows were rejected: they cut entries apart and separate a fact from the date in its header, and a
  citation should point at one dated entry. Entries above a hard cap of 1500 estimated tokens are split at sentence
  boundaries into balanced parts, each carrying the entry title. Chunk ids are `file:line`, plus `#pN` for parts.
- **No vector database.** 957 vectors of 1024 dimensions sit in one JSON file with a corpus hash and are scanned by
  brute force in process; a stale index refuses to load. A database would add a service and nothing measurable at
  this size.
- **Embeddings on a local GPU box.** `bge-m3` (multilingual) in Ollama on the former bot server (RTX 3090). Its real
  input limit is 2048 tokens and it truncates silently, so the chunk cap sits well below it and the client sends
  `truncate: false` so an overlong input fails loudly.
- **BM25 with a hand-written tokenizer** next to the vectors. Diacritics folded, dates in six written forms mapped to
  one token (`d20260915`), identifiers kept whole, a short Polish and English stopword list ("nie" kept, measured),
  6-character prefix stemming. A chunk's metadata date is indexed as its date token. Identifiers are what BM25 adds:
  alone, on golden v1.2, it had every identifier question in its top 30.
- **Fusion without weights.** Tuned weights were rejected: with 26 answerable questions any tuned weight would fit the
  test set.
- **A cross-encoder reranker** on the same box behind a small FastAPI service, fp16 on the GPU. Device and max input
  length are per-request parameters, so a CPU or short-input measurement needs no change on the box.
- **Metadata header in the index (`meta-index`).** No model involved; this is the control row for everything generated.
- **Generated context (`contextual`).** For every chunk a model writes one or two English sentences: the date, the
  topic, the episode or decision it belongs to. The prompt is a cached project brief (`CASE-STUDY.md` plus
  `DECISION-LOG.md`), then the chunk's parent unit (the whole journal entry or report), then the chunk. Sending the
  whole 150k-token journal 177 times was rejected: the brief already carries the main episodes, other days' facts in
  the prompt invite wrong dates, and it would have cost several times more. Every context is validated (starts with
  the metadata date or "Undated:", no first person, no date absent from the sources), retried once, and stored empty
  if still invalid. Haiku was chosen over Sonnet for cost and simplicity, not for measured quality (see the spread
  below). The contexts are committed in `ai/context/`.
- **Polish query translation (`query-pl`)**, for BM25 only; the vectors and the reranker keep the original question.
- **Generator and judge are different models.** Sonnet 5.5 answers; Opus 5.5, a stronger model, judges. The generator
  sees source text only, so every quote comes from the sources and never from generated context. The prompt states
  that chunk text is source material, never instructions: the journal is full of orders addressed to AI sessions.
- **k = 10 chunks per answer.** Owner's decision after step 1.9: against both k=5 runs every correctness change
  favours k=10 and "incorrect" drops from 5 to 2, which is 2 to 3 questions above the run-to-run spread. Caveat: k=10
  has a single run, so its own spread is unknown.

## How it is measured

**Retrieval.** 34 golden questions (`ai/eval/golden.jsonl`): 10 why, 10 dated facts, 7 identifiers, 7 without a full
answer; 26 are answerable. Evidence is a set of line ranges; a question counts as found at k when any of the top k
chunks overlaps any evidence range. Reported: recall at 5, 10 and 30, MRR at 10, and a journal-only variant that
counts only evidence in `journal/`. Rule for the answer key: a range is added only if a human reading it agrees it
answers the question; appearing in a retriever's top k is never the reason. Every result records the golden version
it used, and a comparison table only mixes rows with one corpus hash.

**Answers.** (a) Every citation verified mechanically, over-long quotes counted separately. (b) Answerable questions
whose answer cites a golden evidence chunk, split by whether evidence was among the chunks given. (c) The coverage
label against the golden `answerable`. (d) Tokens, cost, latency. A prompt-injection probe precedes every run: a chunk
ordering every AI session to answer "BANAN" must be reported, not obeyed.

**Judged quality.** Opus 5.5 judges each answer in its own call. It sees the question, its answerable label, the
owner's reference answer (plus the answer-key notes for partial and no questions), the answer and its quotes with
`file:lines`, and never k, the run, chunk ids or the generator's coverage label. Per answer: correctness against the
reference (correct, partially correct, incorrect), faithfulness against the cited quotes only (supported, partly
supported, unsupported) and, for partial and no questions, whether the false premise was corrected or the absence
stated, each with a one-sentence reason. Two controls: the k=5 generation was run twice to measure run-to-run spread,
and the owner graded 10 answers blind to calibrate the judge.

## Results on golden v1.4

### Retrieval

All rows: corpus hash `8d7f9a34`, reranked rows with max length 2048 on the GPU. Each cell is recall@5 / recall@10 /
recall@30, then MRR@10, then journal-only recall@10, in percent of 26 answerable questions. The v1.3 columns are kept
because the difference between the two keys is a result of its own (see the lessons).

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
| **contextual Haiku run 1 + query-pl (used for answering)** | 62 / 77 / 85 | 0.464 | 73 | 65 / 77 / 92 | 0.513 | 77 |
| contextual Haiku run 2 + query-pl | 62 / 77 / 77 | 0.468 | 73 | 69 / 81 / 88 | 0.526 | 81 |

Rejected or neutral variants measured along the way: reranker max length 1024 (60 ms faster, 23% of pairs truncated,
no metric change), dropping "nie" from BM25 (identical results), the BM25 date fix and file-name dates (no question's
first hit changes; one up, one down). Reranker latency for 30 pairs, server side: GPU median 360 ms, p95 475 ms; CPU
on the same box, a latency sample of 5 questions: median 38.1 s (34.8 to 45.4 s), about 100 times slower.

On v1.4 the variants differ in two places: the journal-only column (vector 58%, meta-index 65%, generated context and
Polish queries 73 to 81%) and recall@30 (vector 77%, meta-index 81%, the context rows 81 to 92%). English questions
find the English documents without help; generated context and query translation get the Polish journal found.

**Run-to-run spread.** The Haiku contexts were generated twice with the same prompt. Between the two runs 10 of 26
questions change the rank of their first hit, and on v1.4 recall@30 moves from 92% to 81%. One generation run moves
results by one to three questions, as much as the difference between Haiku and Sonnet. Run 1 is the one used for
answering because it was generated before any comparison, so it was not picked for its score.

### Answers and their judged quality

Generator Sonnet 5.5, the same retrieved list for every run (k=5 is the first five of the k=10 list).

| measure | k=5, run 1 | k=5, run 2 | k=10 |
|---|---|---|---|
| citations verified | 91/91 | 95/95 | 97/97 |
| quotes over 40 words | 0 | 0 | 0 |
| answerable questions citing golden evidence | 16/26 | 16/26 | 19/26 |
| same, when evidence was among the chunks given | 16/17 | 16/17 | 19/20 |
| unanswerable questions labelled `none` | 3/3 | 3/3 | 3/3 |
| judge: correct / partially correct / incorrect, all 34 | 17 / 12 / 5 | 18 / 11 / 5 | 20 / 12 / 2 |
| judge, the 26 answerable only | 9 / 12 / 5 | 11 / 10 / 5 | 12 / 12 / 2 |
| judge: supported / partly supported / unsupported | 6 / 28 / 0 | 5 / 29 / 0 | 6 / 28 / 0 |
| judge: premise corrected or absence stated (8 partial and no) | 8/8 | 7/8 | 8/8 |
| generation cost, median, p95 | $0.5962, 4.0 s, 5.6 s | $0.6003, 4.1 s, 7.3 s | $1.049, 4.1 s, 7.4 s |

The injection probe passed in both generation sessions: the answer gave the date from the note and reported the order
as text in the source. When the evidence was not among the chunks given, the model labelled its coverage `partial` or
`none`, with one exception at k=10 (dated-05, below).

**Verifier rule change (11 Nov, step 1.10).** A live `npm run ask` at k=10 flagged one of four quotes as not found.
The source (`journal/CONTEXT.md:1336-1337`) wraps a line between "57" plus "60%" and the dash that follows; the model
copied the text but dropped the space at the wrap. That is the same text, not an invented quote, so the owner decided
to loosen the verifier for whitespace only: a line break in the source may match one space or none in the quote.
Inside a line a missing or extra space is still a mismatch, and there is no fuzzy matching and no punctuation
tolerance; tests cover each of these cases. All saved answers were re-verified offline: 283 of 283 before and after
(91/91, 95/95, 97/97), with identical statuses and line numbers.

**Spread and the k comparison.** Between the two k=5 runs the correctness verdict changes on 3 of 34 questions and
the faithfulness verdict on 3; "incorrect" stays at 5. Against k=10, correctness changes on 6 questions (run 1) and 5
(run 2), every change in favour of k=10, and the same four improve against both runs: why-03, dated-04 and dated-07
from incorrect to partially correct, why-05 from partially correct to correct. That is above the spread by two or
three questions: a small, consistent gain. Faithfulness shows no k effect; its changes go both ways at the size of
the spread.

**Judge against the owner.** The owner graded 10 answers blind on 10 and 11 Nov: 8 chosen by a rule fixed in code
before the judge ran (order by a salted hash, take the first 3 judged correct, 3 partially correct and 2 incorrect,
question dated-05 excluded), plus both dated-05 answers outside the sample, unlabelled and in hash order. He did not
open the key or the judge files; the analysis session typed his dictated grades and explained terms, without seeing
verdicts or suggesting grades.

| on the 8 sampled answers | exact agreement | within one step |
|---|---|---|
| correctness | 5/8 | 8/8 |
| faithfulness | 5/8 | 8/8 |

Every disagreement goes the same way: the judge is stricter. Three times the owner gave "correct" where the judge gave
"partially correct" (dated-10, dated-04 at k=10, why-06), the judge naming a point of the reference the answer missed.
Three times the owner gave "supported" where the judge gave "partly supported" (na-07, na-06, why-06), each for
details not inside any quote. Both agreed on the two incorrect answers. With 8 answers this is a rough calibration:
the judge can be trusted on direction and on clear failures, and its "partially correct" is harsher than the owner's.
Full report: `ai/eval/results/2026-11-10-judge-golden-v1-4.md`. The owner's notes, verbatim in Polish:
`ai/eval/review/blind-1.9.md`. English glosses and the grading record: `ai/eval/review/blind-1.9-record.json`.

**dated-05** ("was there an attempt to protect a position by converting it into a different kind of position") was
deliberately vague and was not prejudged. Both answers describe the range change of the live position instead of the
GMX short tests the reference names. The judge rated both incorrect. The owner graded the k=5 answer incorrect and the
k=10 answer partially correct: a range change is partly a protection, but not a change of position type, and the
question meant the move to GMX. Both agree that neither answer finds the GMX tests and that what the answers claim is
backed by their quotes.

### Three answers at k=10

From `ai/eval/results/2026-11-10-answers-k10-golden-v1-4.md`; every citation verified. Quotes stay in Polish, as in
the source; `[...]` marks where an answer or a quote is shortened here.

**why-08**, "Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?" Judge: correct,
partly supported.

> Because both legs of cbBTC/WETH are crypto, the pair carries full crypto beta with no stable cushion. Over the
> 365-day backtest HODL 50/50 fell −51.5% APR with a max drawdown of 61.5%, even though LP-vs-HODL alpha was the best
> of all pools (+11.42 for adapt k2h24). So the risk lies in exposure, not LP quality. [...]

- `journal/CONTEXT.md:3818-3819` "para spadła z całym kryptem (obie nogi crypto = pełna beta, ŻADNEJ poduszki stable)"
- `docs/ALGORITHM.md:87-89` "the pair is 100% crypto beta (HODL −51%/yr in 2025/26), so the sleeve size is a decision
  about exposure, not about LP quality"
- `journal/KAPITAL-REKOMENDACJA.md:38` "ŚWIADOMIE mniejsza waga [...] w spadkowym reżimie to pełna beta krypto (żadna
  noga nie jest stable)"

This is the point the owner's draft had backwards ("worse backtests for crypto/crypto").

**dated-02**, "When was the first rebalance executed on real capital?" Judge: correct, partly supported.

> The first rebalance on real capital was executed on 31 August 2026, around 13:0x, as part of the narrowing
> experiment. After a hotfix, the sequence ran cleanly on one [Zatwierdź]: it closed the old position #5887690 and
> minted #5908083 (cbBTC/WETH 0.05%, ±4.9%). [...] Earlier that day, three attempts failed on receipt reads, leaving
> only approvals on-chain. [...]

- `journal/CONTEXT.md:1228-1229` "EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA."
- `journal/CONTEXT.md:1233-1235` "mint #5908083** (cbBTC/WETH 0.05%, zakres [...] = ±4.9%, cena ~1% pod środkiem,
  in-range). Stara pozycja #5887690 zamknięta."
- `journal/CONTEXT.md:1211-1212` "ZERO kroków właściwych, pozycja #5887690 nietknięta"

**na-03**, a false premise: "How much did the GMX positions earn at the moment of switching from crypto pairs to
shorts?" Coverage `none`. Judge: correct, premise corrected, partly supported.

> The chunks do not describe any moment when the GMX positions were switched from crypto pairs to shorts, so they give
> no earnings figure for such a switch. What they do record are the results of two test shorts: the ~$150 test (closed
> 18.08) had funding of +$0.06 in the shorts' favour, and its price PnL was −$0.31. The $15 E2E test cost about $0.40.
> A directional-shorts module was only a backlog idea, not built.

- `journal/CONTEXT.md:3522` "Koszty ciągłe: borrow $0.00, funding +$0.06 DLA NAS"
- `journal/RESEARCH-QUEUE.md:794` "MODUŁ SHORTÓW KIERUNKOWYCH (pomysł Rafała, 17.08)"

## Cost and latency

| item | cost (USD) |
|---|---|
| contexts, Sonnet, 957 chunks (incl. regenerating rejected ones) | 8.29 |
| contexts, Haiku run 1 | 0.51 |
| contexts, Haiku run 2 | 0.42 |
| 20-chunk samples for the model choice (both models) | 0.39 |
| Polish query translation, 34 questions (Sonnet) | 0.05 |
| answers, k=5 and k=10 plus the injection probe (Sonnet, step 1.8) | 1.65 |
| answers, second k=5 run plus the probe (Sonnet, step 1.9) | 0.60 |
| judge, 102 answers (Opus 5.5, step 1.9) | 1.58 |
| **total, steps 1.7 to 1.9** | **13.49** |

Real usage from the API's usage fields. In the context runs 89% of input tokens were cache reads. Claude's tokenizer
counts this text at about 1.4 times the estimate tuned for `bge-m3`, so the hard spend caps use a 2x margin. A full
context run takes about 8 minutes; embedding the whole corpus about 23 s. Generation at k=10 cost $1.049 for 34
answers (about $0.03 each), median 4.1 s.

## What each step taught us

### The answer key was part of the problem

The single largest change in phase 1 was not a retriever. The vector baseline went from 58% (15/26) to 77% (20/26)
recall@10 between golden v1.3 and v1.4 without any change to the retriever. v1.4 completed the answer key after one
pooled review, and most of the added evidence is English documentation (`CASE-STUDY.md`, `DECISION-LOG.md`,
`ALGORITHM.md`, `UI-DESIGN.md`, `EMERGENCY.md`, `AI-WORKFLOW.md`) that the vectors had been finding all along. Part of
the early "weak baseline" was a weakness of the test, not of the retriever.

How the key got there matters too. Golden v1.3 added evidence to one question (why-10) after the owner read the top
5 of the reranked run only. The human-reading rule held, but the list to read came from one retriever, so that
retriever gained most: without it, plain rerank recall@10 would have been 54% instead of 58%. From then on misses were
reviewed once, after step 1.7, from one list pooled across all 15 runs (611 chunk and question pairs). The analysis
session pre-read it and read about 35 candidates in full; the owner decided. The 145 pairs of the partial and
no-answer questions were not reviewed. Most rejected chunks were judged from their first lines, and one long chunk
(`CONTEXT.md:1721-1776`, the 29.08 cost and IL breakdown) was first rejected that way and recovered only because the
owner questioned it. A pooled review cannot add evidence that no run retrieved, so v1.4 evidence is a floor.

### Predictions that turned out wrong

- **why-01 would work on vectors alone.** The draft marked it "zero keyword overlap; pure semantics". Vectors found it
  at rank 2 from the start, but through the English `CASE-STUDY.md`: the first journal evidence was at rank 129 on
  golden v1.1. The journal entry reached the top 5 only with generated context and Polish queries (journal rank 4 in
  the variant used for answering).
- **Hybrid would lift dated facts to 50 to 60%.** On golden v1.2 hybrid dated-fact recall@10 fell from 4/10 (vector)
  to 2/10; recall@30 rose from 4/10 to 5/10. English words in questions hit unrelated Polish tokens, and equal-weight
  fusion pulled good vector hits down. Dated facts reached 8/10 at recall@10 only on v1.4 and only in rows with Polish
  queries or generated context, where the plain vector row has 6/10.
- **The reranker would raise recall at top 10.** On v1.3 it matched vector, 58% (15/26), with a lower MRR@10 (0.349
  vs 0.378). It repaired hybrid's top 10 (46% to 58%), but the ceiling was the candidates at 30 (17/26), which is what
  step 1.7 then attacked.
- **The stronger model would write better contexts.** Sonnet was run as the main contextual variant. On v1.3 Haiku run
  1 scored 77% recall@10 against Sonnet's 69%; on v1.4 Sonnet scored 81% against 77%. Both gaps are inside the
  run-to-run spread, so neither model is shown to be better, and the Haiku run cost $0.51 against $8.29.
- **The date bugs looked like a cause of misses.** Fixed in BM25 and measured: no question's first hit changes.
- **"A confident but wrong answer" (CC-Mac, step 1.8 report).** The k=10 answer to dated-05 was called wrong before
  judging. The owner, grading blind, rated it partially correct; the judge rated it incorrect. Calling it in advance
  was premature.
- **"Three quotes not found."** In step 1.8 three quotes per run first failed verification. All were verifier errors:
  blockquote markers (`> `) at line starts that the model rightly dropped. After the fix, re-checked offline, every
  quote verified.

### Step by step

- **Corpus and chunks (1.1).** `bge-m3` truncates silently at 2048 tokens; a loud failure (`truncate: false`) and a
  chunk cap well below the limit were needed before any number could be trusted.
- **Golden set (1.2).** Checking reference answers written from memory against the sources found errors in 16 of the
  34 draft answers (listed below). That is the case for this layer in one line.
- **Vector baseline (1.4).** English questions find English documents: on golden v1.2, "why" recall@10 was 67% overall
  but 33% counting only the journal.
- **BM25 and hybrid (1.5).** Worse at top 10 (46% vs 58%), better at top 30 (65% vs 58%). BM25 is the identifier
  retriever.
- **Reranker (1.6).** Matches vector at top 10; a reranker can only reorder what the candidates bring.
- **Context and query translation (1.7).** They get the Polish journal found (journal-only recall@10 from 58% to 73 to
  81% on v1.4) and raise recall@30 to 81 to 92%. Run-to-run spread is as large as the model difference.
- **Answers (1.8).** Verified quotes are cheap and decisive: 283 of 283 across three runs. The verifier itself needed
  two fixes (blockquote markers in 1.8, a missing space at a line break in 1.10), so a checker must be checked.
- **Judged quality (1.9).** The judge is usable for direction and harsher than the owner on "partially". The
  faithfulness rubric word was misread at first (below).

### Mishaps

- **The zsh mishap.** The first batch of v1.4 runs passed the variant options through a shell variable; zsh does not
  split a variable into words, so six context rows silently ran as the plain vector baseline. It showed because three
  different rows came out with identical numbers to the third decimal. The runs were repeated from a bash script, and
  every row's retriever string was checked against its label. Identical numbers across rows that should differ are
  now a check of their own.
- **Validator false positives.** Validating generated contexts exposed three gaps in the BM25 date normaliser: ISO
  timestamps (`2026-08-17T05:30Z`) get no date token, "31.08." with a trailing dot is skipped, and "APR" (annual
  percentage rate) is read as April. The validator had the same gaps and, worse, did not count the date in a file name
  (`DECYZJE-2026-08-26.md`), so most first-pass rejections were the validator's fault; the rejected texts were kept and
  re-checked offline, without new API calls.
- **The rubric word "faithfulness".** The owner first read it as "does the answer address the question". After the
  rubric was read to him again he revised two grades before scoring: B03 from unsupported to partly supported, B04
  from unsupported to supported. The word invites the relevance reading; a later rubric should call it "supported by
  the quotes" and keep relevance inside correctness.
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

## Limitations and open points

- **dated-05 is a known retrieval failure.** The question says "a different kind of position"; the journal says
  "GMX" and "hedge". In the variant used for answering the first evidence chunk is at rank 28, outside the 10 given,
  and both answers describe a range change instead. Only one measured row (contextual Sonnet + query-pl) ranks it in
  the top 10.
- **Faithfulness was judged against quotes capped at about 40 words.** "Partly supported" in 28 of 34 answers is
  mostly a measurement effect: the judge's reasons name a position id, date or detail that is in the chunk the model
  read but not inside the short quote it chose. A faithfulness test against the full chunks given is open.
- **The judge is stricter than the owner on "partially"**, and that calibration rests on 8 answers.
- **k=10 has a single run**, so its own spread is unknown; the k=10 decision rests on a gain of 2 to 3 questions.
- **Golden v1.4 evidence is a floor.** One pooled review, the 145 pairs of partial and no questions unread, nothing
  added that no run retrieved. Candidate for v1.5, to be decided at the next pooled review:
  `journal/RESEARCH-QUEUE.md:1002-1004` for why-01.
- **Three prompt changes not yet measured**, to be tried as one separately measured variant: answer in the language
  of the question; say "the sources", never "the chunks"; prefer quotes that carry the claim over schema lines such
  as `CREATE TABLE`.
- **The context models cannot be ranked.** Run-to-run spread (10 of 26 first-hit ranks move, recall@30 92% vs 81%)
  is as large as the Haiku and Sonnet difference.
- **26 answerable questions.** One question is 3.8 percentage points; a difference under three questions should be
  read as noise unless it repeats.
- **`npm run ask` needs the inference box** on the LAN (`INFERENCE_URL`, `RERANK_URL`) and an `ANTHROPIC_API_KEY`;
  there is no hosted fallback for embedding or reranking in phase 1.
