# AI layer plan: retrieval over the project journal and a tool-using agent

Status legend: `[ ]` to do, `[ ] NEXT` the step being worked on, `[x]` done (with date).
One step = one explanation, one build, one verification, one commit. See `CLAUDE.md` for the working mode.

## Why

The project produced ~1.3 MB of working notes in six weeks: a living journal, hand-off inboxes, 32 morning reports,
task queues and decision notes. They are the most informative part of the case study and the least readable one.
Nobody, including the author, will read 350k tokens to find out why the cbBTC range was narrowed on 31 August.

The AI layer answers such questions with citations to file and line, and later lets an agent combine the journal
with the backtesting engine. It is also a showcase of the standard building blocks of applied LLM engineering,
each with a documented decision and a measured result.

## Target layout

```
journal/              Polish working notes (HOMOS-private archive of 23 Sep 2026 = tag journal-final + 5 later reports), see journal/README.md
inference/            Python service for the GPU box (reranker; later anything Ollama cannot serve), see inference/README.md
ai/
  corpus/             loaders and chunkers: one chunk = one journal entry / report section / decision row, with metadata
  embed/              Embedder interface; LocalEmbedder (Ollama on the LAN GPU box) first, VoyageEmbedder optional
  store/              JSON vector store, cosine similarity, BM25 index, hybrid merge
  rerank/             Reranker interface; LocalReranker (own Python service on the GPU box), Voyage optional
  answer/             Generator interface; ClaudeGenerator (phase 1), LocalGenerator (phase 3 comparison); citations + verification
  agent/              phase 2: tool definitions, agentic loop, whitelist bridge to scripts/agent-runner.ts
  eval/               golden question set, metrics (recall@k, MRR, citation accuracy), results/ (committed)
  cli.ts              npm run ask -- "question"
  index/              generated embeddings and indexes (gitignored)
docs/AI-RAG.md        design decisions, evaluation table, costs, example transcripts
```

## Phase 0: preparation

- [x] 2026-11-09 **0.1 Branch and plumbing.** Create branch `ai-layer`. Add `ai/` to `tsconfig.json` include. Add `ai/index/` to `.gitignore`.
  Add `ANTHROPIC_API_KEY` and `INFERENCE_URL` (base URL of the local inference box, e.g. `http://192.168.1.8:11434`) to `.env.example` with comments. Install `@anthropic-ai/sdk`. No embedding vendor SDK: embeddings are served over HTTP from the local inference box (step 0.3).
  Verify: `npm run typecheck` passes, `git status` shows only the intended files.

- [x] 2026-11-09 **0.2 Restore the journal.** Two sources exist: tag `journal-final` in this repo (state of 22-23 Sep 2026) and the sibling clone
  `../HOMOS-private`, branch `private`, which may hold later entries. First compare them (`git -C ../HOMOS-private log --oneline private -5`,
  `diff` of `CONTEXT.md`); take the newer one. Files: `CONTEXT.md HANDOFF.md reports/ TASKS-*.md RESEARCH-QUEUE.md DECYZJE-2026-08-26.md
  KAPITAL-REKOMENDACJA.md PYTANIE-SZEROKOSC-I-SIGMA.md SELECTOR-LOG.md`, moved into `journal/` (reports to `journal/reports/`).
  Remove the `reports/` and `private-journal/` lines from `.gitignore`.
  Write `journal/README.md` in English: what these files are, that they are raw working notes in Polish kept on purpose,
  how the four AI sessions used them (link `docs/AI-WORKFLOW.md`), and a short map of the files. Add a note to the main README.
  A secret scan of the `journal-final` files was done on 9 Nov 2026 (no token values, no keys, only variable names and LAN addresses of a
  decommissioned server); repeat the scan on whatever is restored.
  After this step HOMOS-private is redundant; the owner decides whether to archive it.
  Verify: `du -sh journal/` is about 1.3 MB, `grep -rEn 'sk-ant-|[0-9]{8,10}:[A-Za-z0-9_-]{35}' journal/` finds nothing.

- [x] 2026-11-09 **0.3 Local inference box.** `[CC-Win]` (CC-Mac writes `inference/README.md` with the expected endpoint first, then tests from the Mac.) The former bot server (Windows, RTX 3090 24 GB, on 24/7, LAN `192.168.1.8`) becomes the inference server.
  Install Ollama, pull the multilingual embedding model `bge-m3`, expose Ollama on the LAN (bind address + firewall rule limited to the LAN and VPN
  subnets, same pattern as the old bot API). From the Mac: `curl $INFERENCE_URL/api/embed` with a Polish and an English sentence returns two vectors.
  Write `inference/README.md`: what runs where, how to start it, how to check it. Why: the corpus is small enough that embeddings do not need a GPU,
  but the reranker (1.6) and the local generator comparison (phase 3) do, and one interface with a cloud and a local implementation is the point.
  Verify: the curl above works from the Mac; `docs/INFRA.md` gets a short "inference box" note.

- [x] 2026-11-09 **0.4 Dependabot alerts.** Narrow scope: list the open alerts with `gh api repos/rcywinski/homos/dependabot/alerts`
  (package, severity, fixed version) and fix exactly those. `npm audit fix` without `--force` first; if an alert needs a major bump,
  a targeted `npm install pkg@version`, checking that nothing else moves. Check the critical entries of `npm audit` and report them
  before touching them if they are runtime deps (ethers, viem, wagmi). After fixing: `npm test`, `npm run lint`, `npm run build`.
  One commit on `main` (`chore(deps): fix Dependabot alerts`), push `main`, merge `main` into `ai-layer`.
  No `dependabot.yml`: the project is closed and weekly PRs would be noise; GitHub security updates work without it.
  Anything that cannot be fixed safely goes in one paragraph in `docs/INFRA.md` with the reason. Budget under an hour.

## Phase 1: retrieval with citations

- [x] 2026-11-09 **1.1 Corpus loader and chunker.** `ai/corpus/`. One loader per file type:
  journal entries in `CONTEXT.md` (split on dated session headers in section 4; sections 1 to 3 as their own chunks),
  morning reports (one chunk per `##` section, date from the file name), decision table rows (one row = one chunk, both the Polish table
  and `docs/DECISION-LOG.md`), task queues and research queue (split on `##`/`###`), `docs/*.md` (split on `##`).
  Every chunk carries `{ id, file, lineStart, lineEnd, date?, session?, kind, text }`. Oversized chunks are split at paragraph boundaries with a hard cap.
  Print a histogram of chunk sizes. Verify: `npm run ai:chunks` lists chunk count per file and the 5 largest chunks; no chunk above the cap.

- [x] 2026-11-09 **1.2 Golden question set, version 1.** `ai/eval/golden.jsonl`, 34 questions in English, written by the owner with the analysis
  session from memory (`ai/eval/golden-draft.md`, kept unchanged), then checked against the sources by CC-Mac; every correction is in the
  question's `notes`. Mix 10/10/7/7: "why", dated facts (right day, not a neighbouring one), identifiers, no-answer.
  Evidence is a file + line range (not a chunk id, so the set survives chunker changes); a retrieved chunk is a hit when its lines overlap
  any evidence range. `answerable`: yes | partial | no; partial/no questions have no evidence but `related` ranges that should surface
  and be classified, not used. Every "why" has evidence in `journal/`. Each question has a one-sentence reference answer (for 1.9).
  Tools: `npm run ai:find` (evidence lookup), `npm run ai:golden:check` (validator).
  Verify: `npm run ai:golden:check` reports 0 errors.

- [x] 2026-11-09 **1.3 Embedder interface and local implementation.** `ai/embed/`. Interface `Embedder { embed(texts, kind: 'document' | 'query'): Promise<number[][]>; readonly name: string; readonly dims: number }`.
  `LocalEmbedder` calls Ollama on the inference box (`bge-m3`, 1024 dimensions): batches of 32, `truncate: false`, no `options`,
  `keep_alive: 30m` only while indexing, 30 s timeout, 3 attempts with backoff, HTTP 413 never retried (a chunker bug).
  A `FakeEmbedder` for tests. `npm run ai:index` writes `ai/index/<embedder-name>.json` (ids, vectors, corpus hash; a stale index is refused).
  `VoyageEmbedder` (`voyage-4`) is optional and only added if evaluation in 1.4 to 1.6 suggests the local model is the bottleneck.
  Result (9 Nov 2026): 957 vectors in 21.2 s wall time, 12.3 MB of plain JSON. Kept as JSON, unrounded: parses in ~50 ms, readable,
  exact; switch to a JSON manifest + Float32 binary (3.9 MB) only with several indexes or a much larger corpus.
  Smoke check: Polish and English question return the same top chunk (both an English DECISION-LOG row: English summaries attract queries).

- [x] 2026-11-09 **1.4 Vector store and baseline evaluation.** `ai/store/vector.ts`: load the index, dot product (vectors are normalised), brute-force top-k
  behind a batch-first `Retriever` interface that 1.5 and 1.6 implement too. `ai/eval/run.ts`: question-level recall@5/10/30 (a question is found
  when any top-k chunk overlaps any evidence range; @30 is the ceiling for the 1.6 reranker) and MRR@10, by category, plus a journal-only variant
  (only evidence in `journal/` counts) to measure the pull of the English `docs/`. Writes `ai/eval/results/<date>-<label>.{json,md}` with the golden
  version, and a per-question top-5 with hit/related/miss tags for human review (the retriever never adds evidence).
  Baseline on golden v1.2 (26 answerable questions, 1 question = 3.8 pp): recall@5 50% (13/26), recall@10 58% (15/26), recall@30 58% (15/26),
  MRR@10 0.378; journal-only recall@10 46% (12/26), "why" 67% full vs 33% journal-only; dated-fact recall@5 30% (3/10).
  The v1.1 run is kept next to it: the owner's review of its top-5 misses produced golden v1.2.

- [x] 2026-11-09 **1.5 BM25 and hybrid search.** `ai/store/tokenize.ts` (lowercase, diacritics folded, dates in six forms to one token `d20260915`,
  identifiers kept whole, short PL+EN stopword list with "nie" kept, optional truncate-to-6 stemming), `ai/store/bm25.ts` (own implementation,
  k1 1.2, b 0.75; a chunk's metadata date is indexed as its date token: indexing existing metadata, not generated text), `ai/store/hybrid.ts`
  (reciprocal rank fusion, c = 60, depth 100, no weights to tune). `npm run ai:compare` puts all runs of one golden version side by side.
  Result on golden v1.2 (honest line): hybrid is worse than vectors at top 10 (recall@10 46% vs 58%, 12/26 vs 15/26) and better at top 30
  (65% vs 58%, 17/26 vs 15/26). BM25 alone: recall@10 38%, but 100% of identifiers at top 30. Causes: English questions share no words with
  the Polish journal (BM25 "why" journal-only recall@10 0/9; hybrid lowers it from 3/9 to 1/9), English words in questions hit unrelated
  Polish tokens ("open" vs "propozycje OPEN"), and equal-weight RRF drags good vector hits down. Stemming none vs prefix6 and dropping "nie":
  within one question, "nie" kept. Decision: `hybrid-stem-prefix6` is the candidate generator for 1.6 (its recall@30 is the reranker's ceiling).

- [x] 2026-11-10 **1.6 Reranker.** `[CC-Mac writes the service, CC-Win deploys it]` `inference/`: a small Python service (FastAPI + sentence-transformers on CUDA) on the GPU box with `POST /rerank`
  running `bge-reranker-v2-m3`; runs as a Windows service next to Ollama. `ai/rerank/`: `Reranker` interface plus `LocalReranker` client.
  Retrieve 30 with hybrid, rerank, keep 5. Label `hybrid-rerank`. Record latency per query with and without the GPU (CPU fallback flag in the service).
  Verify: table with three rows; latency numbers in `docs/AI-RAG.md`.
  Selection-bias note (for `docs/AI-RAG.md`): golden v1.3 added why-10 evidence found while the owner read the hybrid-rerank top 5.
  The human-reading rule held, but the list to read came from one retriever, so that retriever gains most (plain rerank recall@10
  would be 54%, not 58%, without it; vector is unaffected). Rule from now on: misses are reviewed once, after 1.7, from one list
  pooled across all runs; no evidence changes before that.
  Result on golden v1.3, corpus `8d7f9a34` (honest line): rerank matches vector at top 10; ceiling is candidate recall at 30 (17/26); 1.7 targets that.
  hybrid-rerank recall@10 58% (15/26) = vector 58%, MRR@10 0.349 vs 0.378; it repairs hybrid's top 10 (46% -> 58%). Variant
  hybrid-rerank-meta (one metadata header line per chunk: file, date, title; declared before measuring): recall@5 54% (14/26),
  MRR@10 0.403, journal-only recall@10 50% (13/26), the best row, by one question. GPU latency per question (30 pairs, server):
  median 360 ms, p95 475 ms at max_length 2048, 0/1020 pairs truncated. max_length 1024 measured and rejected: 60 ms faster,
  23% of pairs truncated, no metric change. CPU: latency sample, n=5 (meta, 2048): median 38.1 s per question (34.8 to 45.4 s),
  about 100x the GPU. fp16 ties: 3 to 5 candidates per run inside a top 10, none on an evidence chunk.
  Service: device and max_length are per-request parameters, scores are the sigmoid of the logit (smoke.py asserts >= 0.9 for the
  relevant document). Box restart without login verified on 10 Nov (inference/README.md). Default for 1.7: hybrid-rerank-meta, 2048.

- [x] 2026-11-10 **1.7 Contextual retrieval (Claude).** Before embedding, ask Claude for a one or two sentence context for each chunk given its whole source document,
  using prompt caching so the document is paid for once per file, not once per chunk. Prepend the context to the chunk text for embedding and BM25.
  Record tokens and cost. Label `contextual-hybrid-rerank`.
  Second variant, measured separately: query translation/expansion. One Claude call per question returns a Polish rendering plus 3-5 Polish
  keywords the journal author would use; vectors get the original question, BM25 gets the original plus the Polish text. Label
  `query-pl-hybrid-rerank`. Rationale: the 1.5 result shows that BM25's weakness here is the question language, not the algorithm.
  Verify: table with the two variants as separate rows next to the earlier ones; `docs/AI-RAG.md` gets its first draft with the table and the cost line.
  Done 2026-11-10. First draft of `docs/AI-RAG.md` written (tables for golden v1.3 and v1.4, costs, spread, review limits, mishaps).
  Design as built: control row `meta-index` first (metadata header in the index, no LLM), the row to beat; contexts from a cached project
  brief (CASE-STUDY + DECISION-LOG) plus the chunk's parent unit (whole journal entry or whole report) instead of the whole file; English
  contexts, format-validated (metadata date or "Undated:" first, no first person, no date absent from the sources), one retry, failures
  stored empty. Results on golden v1.3, corpus `8d7f9a34` (recall@10 / recall@30): meta-index 65% / 69%, query-pl 69% / 77%,
  contextual-sonnet 69% / 69%, contextual-haiku 77% / 81%, haiku + query-pl 77% / 85% (22/26). Cost: Sonnet contexts $8.29, Haiku $0.51,
  Polish queries $0.05. Known gaps found on the way (not fixed before the review): the BM25 date normaliser misses ISO timestamps and
  "31.08." and reads "APR" as April; `DECYZJE-*` files carry their date only in the file name, not in chunk metadata.
  Run-to-run spread (second full Haiku run, $0.42): contextual-haiku recall@10 77% -> 73%, recall@30 81% -> 77%; 10 of 26 questions
  change rank, 1 crosses the top-10 line. haiku + query-pl recall@30 85% -> 77% (4 questions cross the top-30 line). The spread of one
  generation run is as large as the Haiku vs Sonnet difference, so neither model is shown better. Pooled review list: ai/eval/review/pool-v1.4.md.
  Golden v1.4 (one pooled review, evidence is a floor): vector moved from 58% to 77% recall@10 with no retriever change, because most added
  evidence is English documentation; the variants differ in journal-only recall@10 (vector 58%, meta-index 65%, context and query-pl rows
  73 to 81%) and recall@30 (77%, 81%, 81 to 92%). BM25 date fix and file-name dates measured as their own rows, no gain; both stay switches,
  off by default. Variant for 1.8: Haiku contexts (run-1 file) plus Polish query translation, chosen for cost (about $0.5 to regenerate all
  contexts) and simplicity, not for a measured quality lead (the context rows are within their run-to-run spread). Run 1 is used because it
  was generated before any comparison, so it was not selected for its score.

- [x] 2026-11-10 **1.8 Answer with citations.** `ai/answer/`: `Generator` interface with `ClaudeGenerator` as the phase 1 implementation; prompt with the top chunks, each tagged with its id; Claude answers in a structured output
  `{ answer, citations: [{ chunkId, quote }], notEnoughContext: boolean }`. A verifier checks that every quoted string actually occurs in the cited chunk
  and resolves chunk id to file and lines. The 5 unanswerable golden questions must come back with `notEnoughContext: true`.
  Verify: `npm run ask -- "Why did the live product stay wide?"` prints an answer with `file:lineStart-lineEnd` citations.
  Note from 1.7: candidates reach 22/26 at top 30 but only 16/26 at top 5, so measure answer quality with 5 and with 10 chunks passed to Claude.
  Result (golden v1.4, Sonnet 5.5 generator, structured output with `coverage: full | partial | none` instead of a boolean):
  citations verified 91/91 at k=5 and 97/97 at k=10 (3 per run first failed on a verifier bug with blockquote markers, fixed and
  re-checked offline), none over 40 words; answerable questions citing golden evidence 62% (16/26) at k=5 and 73% (19/26) at k=10,
  about 95% when the evidence was among the chunks and 0 when it was not; all 3 unanswerable questions answered `none` at both k;
  $0.60 vs $1.05 per run, median 4.0 vs 4.1 s. Prompt-injection probe passed. The owner checked five questions of his own with
  `npm run ask` (one in Polish, one unanswerable): all five right.
  Recorded for later, not done now:
  - Prompt polish, after 1.9 and as a separately measured variant: answer in the language of the question; say "the sources",
    never "the chunks"; prefer quotes that carry the claim over schema lines such as `CREATE TABLE`.
  - Golden v1.5 evidence candidate, not to be added before the next pooled review: `journal/RESEARCH-QUEUE.md:1002-1004` for why-01.

- [x] 2026-11-11 **1.9 Answer-quality evaluation.** For the 25 answerable questions: citation accuracy (cited chunk is a golden chunk) and an LLM-as-judge score
  against a short reference answer written by the owner. Add to the results table.
  Result (golden v1.4, Opus 5.5 judge blind to k and run; citation accuracy was already measured in 1.8): correct /
  partially correct / incorrect 17/12/5 and 18/11/5 for two k=5 runs, 20/12/2 for k=10. Spread between the k=5 runs:
  3 of 34 correctness verdicts; k=10 changes 5 to 6, all improvements, the same four against both runs, so a small,
  consistent gain. Faithfulness is mostly "partly supported" (28 of 34 per run, under-citation against 40-word quotes),
  no k effect. Owner's blind grading of 8 sampled answers: exact agreement 5/8 on correctness and 5/8 on faithfulness,
  8/8 within one step; the judge is the stricter grader in every disagreement. The owner first read "faithfulness" as
  relevance and revised two grades after the rubric was re-read: rename it in the next rubric. Total cost $2.19.

- [x] 2026-11-11 **1.10 Write-up.** `docs/AI-RAG.md`: the question this layer answers, the corpus, each design decision with the alternative rejected
  (structure-based chunking vs fixed size, no vector database at this scale, hybrid, reranker, contextual retrieval), the evaluation table, costs,
  three example transcripts with citations, what did not work. README section "AI layer". A short GIF of the CLI.
  Merge `ai-layer` to `main`.
  Decision (owner, 11 Nov, after 1.9): k=10 is the default for `npm run ask` and for the write-up. Reason: against both k=5
  runs every correctness change favours k=10 and "incorrect" drops from 5 to 2, which is 2 to 3 questions above the
  run-to-run spread. Caveat: k=10 has a single run, so its own spread is unknown.
  Result: `docs/AI-RAG.md` rewritten as the phase 1 write-up (pipeline, decisions with rejected alternatives, v1.3 and v1.4
  tables, answers and judged quality, three k=10 answers, costs $13.49, lessons including wrong predictions, limitations).
  README section "AI layer" with the headline numbers and `docs/media/ask.gif` (recorded with VHS from `docs/media/ask.tape`,
  frames checked for secrets). Verifier loosened for whitespace only (a line break may match one space or none), all saved
  answers re-verified offline: 283/283 before and after. README free of long dashes. Merge to `main` waits for the owner.

- [x] 2026-11-11 **1.11 Local generator comparison** (moved forward from phase 3, 11 Nov). `[CC-Win pulls the model]` Question: how does a
  local model on the RTX 3090 compare with Sonnet 5.5 at writing the answer from the same retrieved chunks? `LocalGenerator` on Ollama
  behind the `Generator` interface; the model is chosen by the owner before anything is pulled (fits in about 20 GB of VRAM next to the
  embedder and reranker with room for 10 chunks, handles Polish source text, JSON-schema structured output, licence allows this use).
  Variant A, local generator only: the exact k=10 chunk lists of the Sonnet k=10 run, so only the generator differs; run twice for the
  spread. Variant B, fully local: meta-index plus rerank retrieval (no generated context, no query translation), then the local generator.
  Same system prompt, output schema and verifier as Sonnet, no prompt tuning for the local model. Context length set explicitly; every
  call checks the prompt token count and fails loudly on a mismatch. Invalid structured outputs counted separately, at most one retry.
  Injection probe first. All settings recorded. All new answers judged blind by the step 1.9 Opus judge, which never learns the generator.
  Model unloaded after the runs (short keep_alive). Spend cap $4. Report: one table, Sonnet k=10 against A run 1, A run 2 and B (valid
  outputs, citations verified, quotes over 40 words, unanswerable labelled none, judge correctness and faithfulness, premise handled,
  median and p95 latency, tokens per second, cost), the spread, and which differences exceed it.
  Model (owner, 11 Nov): `qwen3.8:27b` (Q4_K_M, 16.52 GB, Apache 2.0, 256K context, thinking switchable), pulled by CC-Win
  on 11 Nov. Rejected: Gemma 4 31B (too large for the context next to the reranker), Mistral Small 3.2 24B (older). Gemma 4
  26B-A4B (Apache 2.0 since 2 Apr 2026, 35+ languages) is a possible extra run after the Qwen results. Details in
  `inference/README.md`. Extra run (owner, 11 Nov): A with thinking on, same chunk lists, card sampling for thinking mode,
  larger num_predict, thinking text kept out of the verifier and the judge; run after A1, A2 and B.
  Result (golden v1.4, all local runs at a 250 W GPU limit, judged blind by the 1.9 Opus judge): Sonnet 20/12/2 correct /
  partially / incorrect; Qwen A 13/16/5 and 12/15/7; Qwen B 17/12/5 and 17/10/7; Qwen A with thinking 14/16/4; Gemma 4 26B-A4B
  14/13/7. Spread 7 of 34 questions for both A and B. Sonnet beats Qwen A beyond the spread (every changed verdict in
  Sonnet's favour); B and thinking do not differ from A beyond it. Quotes: Sonnet 0 of 283 unverified, Qwen 24 of 321, Gemma
  18 of 67, every one caught by the verifier. Qwen about 3x slower (median 12 s); Gemma 4.7 s. The box lost power four times
  before the 250 W limit; two of those after CC-Mac's retries reloaded the model (fixed). Judge cost $3.18 of the $4 cap.

- [x] 2026-11-11 **1.12 Local generator tuning** (owner, 11 Nov, approved in advance). Question: how much of the gap between
  qwen3.8:27b and Sonnet comes from settings, prompt and citation design rather than from the model? Variant A chunk lists,
  thinking off, num_ctx as in 1.11, 250 W with CC-Win logging, the same pre-run checks, no network retries, the same blind
  Opus judge. Two runs per variant; baseline Qwen A runs 1 and 2 of 1.11; the Sonnet prompt and results stay untouched.
  S: sampling only, every repetition penalty off (presence 0, frequency 0, repeat 1.0), temperature, top_p, top_k from the
  card. Hypothesis to test: the card's presence penalty 1.5 hurts verbatim quoting. P: S plus a separate prompt for local
  models with quoting rules (one contiguous span, no ellipsis, no joining, exact Polish diacritics, at most 40 words) and one
  worked example on an invented chunk, written once from the 1.11 failure types and not revised after results. L: S plus
  citation by reference: numbered units per chunk, the model returns chunk id and first and last unit, the code extracts
  the quote; references outside the chunks, invalid ranges and extracted quotes over 40 words counted separately; valid
  references reported instead of citations verified (not comparable). Order S1, S2, P1, P2, L1, L2, then the judge; model
  unloaded at the end. Spend cap $5. Report: one table (Sonnet k=10, Qwen A1 and A2, then the six runs), per variant whether
  citations and judged correctness differ from the baseline by more than the spread, what the unverified quotes look like
  in S and P. Tuned and measured on the same 34 questions: say so in the limitations.
  Result (judge correct / partially / incorrect; Sonnet 20/12/2, baseline Qwen 13/16/5 and 12/15/7): S 12/15/7 and 14/13/7,
  no difference, presence-penalty hypothesis not supported; P 16/13/5 and 16/11/7, unverified quotes 3.4% and 3.9% against
  9.2% and 7.0%, both beyond the spread; L 14/16/4 and 15/15/4, within the spread, 0 bad references but 23 to 28 extracted
  quotes over 40 words. About half the gap in correct answers closes with the local prompt; the rest is the model. num_ctx
  17408 (P) and 18432 (L). Judge $3.17 of the $5 cap. Not merged.

## Phase 2: tool-using agent

- [x] 2026-11-12 **2.1 Tool definitions.** `ai/agent/tools.ts`: `search_journal(query)` (phase 1 retrieval), `read_decision_log()`, `read_backtest_results(name)`
  (JSON in `backtest/results/`, restored from `journal-final` for the e8 and walk-forward runs), `list_backtest_configs()`.
  Each tool has a JSON schema, a pure handler and a unit test.
  Done: four read-only tools, own schema validator (anything outside the schema is rejected), `read_backtest_results`
  accepts only names listed by `list_backtest_configs` and an optional `path` (array of keys, own properties only).
  Caps: 12 000 characters for results and the decision log (a larger result comes back as an overview with a marker);
  `search_journal` 36 000, whole chunks only (measured: longest k=10 result on the golden set 30 918, largest chunk
  block 3 589, so k=10 is never cut). Errors return as tool results; results are wrapped in `<tool_data>` and are data,
  never instructions. Result files restored locally, not committed (owner decision): `npm run ai:restore-results`
  extracts the 72 JSON files from tag `journal-final` into the gitignored `backtest/results/`. Addition (owner): every
  `read_backtest_results` result starts with a legend of the file family's fields (meaning, unit, defining script, in
  `ai/agent/legend.ts`); fields not documented in the repository are marked as such. 95 offline tests.
- [ ] NEXT **2.2 Agentic loop.** `ai/agent/run.ts`: Anthropic SDK tool use, max 10 steps, every tool call and result logged to `ai/agent/logs/` (gitignored),
  final answer with citations reused from 1.8. `npm run agent:ask -- "Would FlatWide have passed the gate with a 3 percent narrowing?"`.
- [ ] **2.3 Whitelisted job execution.** `run_backtest(config)` drops a job file for `scripts/agent-runner.ts` and polls `.agent/status.json`.
  The agent can only choose a whitelisted script, never a command. Document this as the security boundary.
- [ ] **2.4 Agent evaluation and write-up.** 10 multi-step questions with expected tool sequences; measure whether the right tools were called and the
  answer cites the right evidence. Add a section to `docs/AI-RAG.md`, three transcripts, README update
  (mention `npm run ai:restore-results` in the README AI section, owner decision in 2.1). Merge to `main`.

## Phase 3: optional, only if time allows

- [ ] `/ask` endpoint in `bot/server.ts` and a panel in the cockpit UI.
- [ ] **Local contexts.** The local generator comparison moved to step 1.11. Remaining here: re-run 1.7 with the local model writing the chunk
  contexts and compare recall against the Claude-written contexts. Write up as "cloud vs local" in `docs/AI-RAG.md`: quality, latency, cost.
  This answers the question clients actually ask: can this run without sending data to a cloud model, and what does it cost in quality.
- [ ] `VoyageEmbedder` as a cloud embedding alternative, if 1.4 to 1.6 showed retrieval misses that look like embedding quality.
- [ ] Temporal filters in retrieval (restrict to a date range parsed from the question).

## Out of scope, deliberately

- No vector database. The corpus is a few thousand chunks; a JSON file and cosine similarity in memory is the right tool. Revisit above ~100k chunks.
- No fine-tuning. Retrieval over documents is the problem, not model behaviour.
- No orchestration framework. One session builds this, step by step, with the owner reading along.
