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
- [x] 2026-11-12 **2.2 Agentic loop.** `ai/agent/run.ts`: Anthropic SDK tool use, max 10 steps, every tool call and result logged to `ai/agent/logs/` (gitignored),
  final answer with citations reused from 1.8. `npm run agent:ask -- "Would FlatWide have passed the gate with a 3 percent narrowing?"`.
  Done: own loop behind an `AgentModel` interface ("a turn with tools" or "a final turn without tools"); everything
  Anthropic-specific (thinking blocks passed back unchanged, `tool_choice` none for the final turn, strict tool schemas,
  structured output, cache markers) is inside `AnthropicAgentModel`. Sonnet 5.5, effort medium; at most 10 turns, the
  last one final; a repeated identical call is not run, the third forces the final turn; $0.50 cap per question,
  including the query translation inside search_journal. Final answer: phase 1 citations through verifyCitation, plus
  `dataRefs` for backtest numbers, checked against the calls of the run. CLI is `npm run agent -- "question"`. Injection
  probe: 2/2 passed (`ai/eval/results/2026-11-12-agent-injection-probe.md`). Manual questions with traces and the phase 1
  comparison: `ai/eval/results/2026-11-12-agent-manual-questions.md`. Step spend $0.68 of the $3 cap.
  CLI renamed in 2.3 to `npm run agent:ask`: the 2.2 entry had shadowed the old `npm run agent` (scripts/agent-runner.ts).
- [x] 2026-11-12 **2.3 Whitelisted job execution.** `run_backtest(job, args)` runs one allowlisted job in-process (owner
  decision: not through the old `.agent/` queue of `scripts/agent-runner.ts`, which takes free arguments). The agent can
  only choose a job and validated values, never a command. Document this as the security boundary.
  Done: jobs `walkforward` (5 pools measured fast enough, windowDays 15 to 90, stepDays 5 to 30, ratio at most 6) and
  `funding_carry` (4 series, optional benchApr); spawn with an argument array, no shell, minimal environment, 15 and 2
  minute timeouts, one job at a time (lock file), 4 000-character tails as tool data, 5 MB log cap, output in
  `ai/agent/runs/<jobId>/` via `HOMOS_RESULTS_DIR` (default path unchanged when unset), saved results hashed before and
  after. Owner confirms each job at the terminal; `--yes-jobs` for unattended runs; `run_backtest` exists only with
  `--jobs`, so the 2.2 prompt and tools stay the 2.4 baseline. Job results list as `run-<jobId>-<name>` and verify like
  any other. Thinking summaries and reasoning-token counts logged from 2.3 on. Job injection probe 2/2
  (`ai/eval/results/2026-11-12-agent-jobs-probe.md`); manual run with a real job
  (`ai/eval/results/2026-11-12-agent-job-manual-run.md`). Step spend $0.37 of the $2 cap. `npm run agent` restored for
  the old runner; the agent CLI is `npm run agent:ask`.
- [x] 2026-11-16 **2.4 Agent evaluation and write-up.** 10 multi-step questions with expected tool sequences; measure whether the right tools were called and the
  answer cites the right evidence. Add a section to `docs/AI-RAG.md`, three transcripts, README update
  (mention `npm run ai:restore-results` in the README AI section, owner decision in 2.1). Merge to `main`.
  Done: 18 tasks in 6 categories (`ai/eval/agent-tasks.jsonl`); variants A (2.2 prompt, two runs), B (plus five
  sentences, two runs), C (effort high, one run); 1.9 Opus judge, blind; owner's blind grading of 6 answers
  (correctness 5/6 exact, 6/6 within one step). Correctness 16 to 17 of 18 in every run; B halves redundant calls and
  adds legend citations at about 20% more cost; only 6 to 8 of 18 tasks end without a limit. Owner: prompt A stays the
  default, no further revisions on this set. Report `ai/eval/results/2026-11-16-agent-eval-report.md`; write-up in
  `docs/AI-RAG.md` ("Agent with tools"). Billing check found Sonnet cache reads priced at twice the real rate; fixed,
  figures corrected. Step spend $16.05 of the $25 cap (corrected price). Merged to `main` on 16 Nov.

## Phase 3: local models

Owner, 16 Nov 2026. Spend cap for the whole phase: $10 (judge calls and any cloud call inside tools; local generation
costs nothing). Common rules for every step:
- Variant A uses the saved k=10 chunk lists (`ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json`); the same
  verifier and the same blind Opus 5.5 judge as 1.11 and 1.12.
- Two runs for anything that is compared; a single run is marked as such and is not used for a comparison claim.
- The 250 W cap is gone since 13 Nov. `[CC-Win]` logs power and temperature every second during every run and alerts
  at 85 C or on a missing sample; the run stops on an alert.
- No retries on a network error. Every model is unloaded after every run. Nothing is deleted from the box without
  asking the owner.
- Prompt P (1.12) and prompt A (2.2) are not revised in this phase; a model that needs another prompt gets it as a
  separate, later variant.
- Report after each step and wait for the owner's OK.

- [x] 2026-11-16 **3.1 Speed at full power.** `qwen3.8:27b` with the exact settings of 1.11 run A (thinking off, `num_ctx`
  16384, `num_predict` 2048, model-card sampling with presence penalty 1.5), saved variant A chunk lists, one full run
  of 34 questions, no judge. Report tokens per second and latency next to the 250 W figures of 1.11 A1 and A2, plus
  peak power and temperature from the box log. Single run.
  Done: same settings, lists and prompt token counts as A1. Decode median 79.9 tokens/s against 60.2 and 60.5 at 250 W
  (+32%); latency median / p95 9.9 / 12.5 s against 12.4 / 16.2 and 12.8 / 17.4. Box (CC-Win log): peak 410.8 W,
  average 392.0 W while busy, max 71.6 C, peak VRAM 20 191 MiB with the reranker, no alert. 34/34 valid, probe passed.
  Report `ai/eval/results/2026-11-16-phase3-compare-golden-v1-4.md`.
- [x] 2026-11-16 **3.2 Local prompt in the fully local pipeline.** Qwen, variant B retrieval (meta-index plus rerank, no cloud
  step; the saved B lists, identical in 1.11 B1 and B2) with prompt P from 1.12, two runs, judged. Compare with B1 and
  B2 (1.11, Sonnet prompt on B) and with P1 and P2 (1.12, prompt P on A).
  Done: unverified quotes 1/94 and 1/92, fewer than B (4/62, 6/58) and than P on A (3/87, 3/77), beyond the spread both
  times; correct 16 and 18 against 17 and 17 (B) and 16 and 16 (P on A), within the spread; incorrect 3 and 5. Both
  remaining bad quotes are real (a phrase dropped from inside a quote; a paraphrase). Judge $1.08.
- [x] 2026-11-16 **3.3 Gemma 4 26B-A4B with prompt P**, variant A, two runs, judged. Compare with its single 1.11 run and state
  what that single run allows us to conclude.
  Done: unverified quotes 11/87 and 11/88 against 18/67 in the single 1.11 run; quotes over 40 words 2 and 0 against 7;
  `none` on 3/3 against 2/3; correct 10 and 12 against 14. The single run has no spread, so neither the correctness
  drop nor the quote gain is shown under the two-run rule (details in the report). Against Qwen P on A (16, 16)
  Gemma P is weaker beyond the spread; it is about 2.6 times faster than Qwen at 420 W (median 3.7 s against 9.7 s). Judge $0.99.
- [x] 2026-11-16 **3.4 New models.** Check the current Ollama library and propose candidates that fit fully on the card with the
  reranker stopped during generation (variant A needs no reranker, the chunk lists are saved), including Muse Glimmer
  30B and Gemma 4 31B if they fit, with size, licence and source for each. The owner approves the list before any
  pull `[CC-Win pulls]`. One run each with prompt P, a second run for the best one; judged.
  Done, on Ollama 0.40.15 (no update needed; Muse Glimmer requires 0.32.8): Gemma 4 31B 7 / 18 / 9 correct /
  partially / incorrect, 56/66 quotes verified; gpt-oss 20B (think "low") 6 / 14 / 14, 33/75; Muse Glimmer 30B, the
  best of the three, 10 / 17 / 7 twice, 94/99 and 74/80. Muse is below Qwen P on A (16 and 16) beyond the spread, so
  the showcase stays Qwen with P on fully local retrieval. Model-specific runtime fixes, recorded in the result files:
  the harmony template bound for gpt-oss (75 tokens), and for Muse a trailing `<|eot|>` removed before parsing (35 of
  35 calls) and a server token overcount of up to 4 allowed. Judge $1.96; phase spend $4.03 of $10.
- [x] 2026-11-16 **3.5 Local agent.** `AgentModel` for Ollama tool calling, without changing the loop or the tools. Before the
  plan: what the Ollama documentation says about tools with structured output and with thinking, and what does not
  map onto the interface. Then the 18 tasks of 2.4 with prompt A, two runs, jobs with `--yes-jobs`, judged; the same
  measures as 2.4 next to Sonnet A1 and A2, plus invalid tool calls and schema failures.
  Approved plan (owner, 16 Nov): variants QA-cl (fully local search) and QA-c (search as for Sonnet), two runs each,
  QA-cl first; thinking off; `num_ctx` 24576; compaction on demand with restore on a repeated call, counted per task.
  Built: `ai/agent/model-ollama.ts` (19 offline tests), local runs in `ai/eval/agent-run.ts`, `--local` probes and
  `--format-check` in `ai/agent/probe.ts`, judge `--local`, report `ai/eval/agent-local-score.ts`.
  Done, after a fixed 48 GB pagefile on the box and the load order Qwen then bge-m3: 4 of 4 local probes passed;
  correct 11 and 14 (QA-cl), 14 and 15 (QA-c) against 17 and 16 (Sonnet A), below Sonnet beyond the spread, QA-c and
  QA-cl within the spread of each other; x-03 wrong in all four local runs, p-01 in three. No context-limit stop, no
  schema failure, 3 invalid tool calls in 72 tasks. Step-limit follow-up from the saved logs: 23 of 33 step-limit tasks
  are mostly new calls, 8 mostly repeats of visible results, 2 mostly repeats of compacted results. GPU board energy
  about 7.4 to 7.9 Wh per task. Judge $1.32; phase spend $5.53 of $10. Reports
  `ai/eval/results/2026-11-16-agent-local-report.md` and `2026-11-16-agent-step-limit.md`.

## Phase 6: retrieval improvement

Owner, 25 Nov 2026: the DeFi side of the showcase is closed at the lowest cost, and the remaining effort and API
budget go into the RAG. Written by CC-Mac at the analysis session's request; nothing in it is spent or run on the box
before the owner's word. (Phase 4 and 5 are the showcase and the paper-trading page in `ai/APP-PLAN.md`.)

Target: the retrieval the public site serves, the fully local variant (meta index, plain BM25, hybrid RRF to depth
100, reranker on the top 30, k = 10). The phase 1 cloud variant (generated contexts, Polish query translation) is not
the target; its parts appear below only where they could run locally.

Common rules for every step:
- The corpus does not change in this phase (hash `8d7f9a3437b43594`); every compared row states it.
- **Free first.** Each candidate is first measured on retrieval alone, with no API call: evidence span coverage in the
  top k (186 spans over 26 answerable questions in v1.4) and the rank of every evidence chunk at both stages. These
  numbers are deterministic, so they need no second run. Only candidates that improve them go to a judged run.
- **Judged runs** follow the two-run rule. Generator: Qwen with prompt P, as served on the box (free, needs the box);
  the judge is the same Opus 5.5 with the same prompt as step 3.2, `--no-retry`, with a cap per run.
- **No tuning on the test.** The held-out questions of step 6.2 are written and frozen before any candidate is
  measured and are used once, in step 6.12.
- Anything that loads a model or uses the GPU on the box is `[CC-Win]` and waits for the owner's go in CC-Win's
  session; a deployment to the live server also needs his go.
- Each step ends with the usual explanation in Polish, with an example from the project's data, and waits for his OK.

- [x] 2026-11-25 **6.1 Diagnosis, from stored files only.** For every question not judged correct in all six judged runs of
  the served retrieval (3.2 pb1 and pb2, 4.8j lan48, lan48b, lan48c, 4.6e guest46e): first-stage and reranked rank of
  the first evidence chunk, evidence spans in the top 10, and a failure class.
  Delivered and approved by the owner on 25 Nov: `ai/eval/diagnose.ts` and `ai/eval/results/2026-11-25-diagnosis-golden-v1-4.md`.
  Of the 20 questions wrong in 3 or more of 6 runs: A not retrieved 4 (why-02, dated-01, dated-04, dated-05),
  B cut by the reranker 2 (why-06, id-07), C the answer needs several chunks 9 (mostly "partly"), D split across chunks
  0 (4 of 186 spans cross a boundary), E reference arguable 1, F not retrieval 4. 0 USD.
- [ ] NEXT **6.2 Golden set v1.5 and a held-out test set.** v1.5 is a change to the test, so: every changed item gets a
  one-line reason in the file's change notes, the old wording stays in the git history, and v1.4 numbers are never
  compared with v1.5 numbers unless the stored answers are re-scored on v1.5 where that is possible.
  (a) The owner reviews five items the diagnosis flags, before any tuning: dated-04 and dated-05 (ambiguous questions),
  dated-09 (reference broader than the question), and the evidence lists of id-03 and dated-01 (answered correctly
  without any listed evidence).
  Done 25 Nov, golden v1.5: two evidence lists changed (id-03, dated-01), dated-09 spans marked, the other two
  unchanged; stored lists re-scored on both versions (`ai/eval/results/2026-11-25-rescore-k10-lists-golden-v1-5.md`).
  (b) Required and supporting spans. For each of the nine class C questions, and then for every question, each
  evidence span is marked `required` (a correct verdict needs its fact) or `supporting`. This separates "the answer
  really needs these spans" from "the reference lists more than the question asks", so a larger k is not rewarded for
  covering spans nobody needs.
  Batch 1 done 26 Nov, golden v1.6: the nine class C questions, with facts per required span (coverage counts facts),
  gaps filled, and the dated-09 correction (`ai/eval/review/roles-v1-6.md`).
  Batch 2 done 26 Nov, golden v1.7: the other 17 answerable questions, with the report-row rule
  (`ai/eval/review/roles-v1-7.md`). (b) is done; the phase 6 baseline is in `ai/DECISIONS.md` (26 Nov, batch 2).
  (c) Held-out questions: about 30, in the same five categories. Batch 1 done 26 Nov (`ai/eval/heldout.jsonl` v0.1,
  five questions; the owner's three follow). CC-Mac drafts them and their references from the
  corpus itself (journal and docs read directly), never from retrieval output, in batches of five to eight; each
  batch is read with the owner in a session, with the reasoning behind each reference, before the next. Then the file
  is frozen with its hash in `ai/DECISIONS.md`. v1.4's 34 questions become the development set, the new ones the
  test set. 0 USD.
- [ ] **6.3 Retrieval measure and baseline, free.** `ai/eval/retrieval-diag.ts`: per question, the rank of every
  evidence chunk after the first stage (to depth 100) and after the reranker, span coverage at k = 5, 10, 15 and 20,
  reported twice: for the required spans of 6.2 and for all spans.
  Needs the query vectors (bge-m3) and the evaluation reranker `[CC-Win, owner's go]`: one short box window, the
  vectors are then cached in `ai/index/` so later candidates that keep the first stage need no box. Baseline numbers
  for the development set. 0 USD.
- [ ] **6.4 Judged baseline on v1.5.** The served configuration, Qwen, development and test sets (64 questions), two
  runs. Gives the spread every later step is compared against. About 2.1 USD (judge only).
- [ ] **6.5 Candidate: deeper rerank pool** (class A). Rerank the top 50 or 60 instead of 30. Three of the four class
  A questions have their first evidence chunk at first-stage rank 36 to 52. Measured with 6.3, free. Cost on the
  served system, measured in this step: reranker time per question at 30, 50 and 60 chunks (0.585 s for 30 on the
  box in 4.10e, so about 1.0 to 1.2 s for 50 to 60, to be confirmed); no index rebuild, no VRAM change.
- [ ] **6.6 Candidate: fuse the reranker score with the first-stage rank** (class B). A weighted RRF of the two orders
  instead of the reranker order alone; why-06 drops from first-stage 5 to 29 and id-07 from 2 to 14 today. The weight
  is set on the development set only. Free. Live server: no rebuild, no latency.
- [ ] **6.7 Candidate: more context per answer** (class C, the largest). k = 15 and 20, and adding the neighbouring
  chunk of the same journal entry or report to each of the top hits. Measured as span coverage (required and all),
  free. Cost on the served system, given before and after in this step: prompt tokens per answer for Qwen and for the
  guest's Sonnet call (at k = 10 in 4.6e: median 13 117 input and 441 output tokens, 0.030 USD per guest answer on the
  visitor's own key, 5.3 s per question end to end), Qwen latency on the box (prompt processing grows with the
  prompt; 20 chunks of median 1 050 characters fit well inside `num_ctx` 24576), and the cost per guest answer. A
  longer context can also lower answer quality, so a k that gains on coverage still has to hold its judged counts
  under the two-run rule on the development set (6.11). No rebuild.
- [ ] **6.8 Candidate: dates and ids in the question** (secondary tag of dated-01, dated-04, dated-07). Detect a date,
  a range or "first", "last" in the question and boost chunks by their entry or report date, and boost exact matches
  of decision ids and position numbers in BM25. Supersedes "Temporal filters" under "Later". Free. Live server: no
  rebuild, no latency.
- [ ] **6.9 Candidate, only if 6.5 to 6.8 leave class A: the local model rewrites the question.** A Polish rendering
  for BM25 by Qwen (the phase 1 variant did this with Sonnet), or a split into sub-questions. Targets why-02 and
  dated-05. Live server: Qwen must be loaded before retrieval, which the guest-key "search" state (bge-m3 and the
  reranker only) does not allow; several seconds more per question. Measured free, but a deployment decision for the
  owner.
- [ ] **6.10 Candidate, cheap: the committed contexts in the local index.** The Haiku contexts of step 1.7 are in
  `ai/context/` already, so no API call: an index of chunk text plus context, used without query translation. In
  1.7 they gave recall@10 20 and 19 of 26 in two runs against 19 for the meta index, within the spread, so this goes
  to a judged run only if 6.3 shows a coverage gain. Live server: index rebuild on the box `[CC-Win]`, no latency.
- [ ] **6.11 Judged comparison on the development set.** The candidates that gained on retrieval, then their best
  combination, Qwen, two runs each. Up to four configurations, about 4.4 USD.
- [ ] **6.12 Held-out test and the guest path.** The final configuration against the 6.4 baseline on the frozen test
  set (Qwen, two runs, about 1 USD), and Sonnet on the guest path, baseline and final, two runs each on all 64
  questions (about 11.7 USD with the judge). The guest request body was measured at k = 10 (4.6e); a new k or pool
  changes it, so this is where the guest path is measured again: tokens, cost per guest answer and time. The owner
  decides from these numbers whether the live server changes.
- [ ] **6.13 Deployment** `[CC-App, CC-Win]`, on the owner's word: retrieval code on `app-chat`, new pin on the box,
  index rebuild if 6.10 is in, the measured times on the page updated.

Dropped after the diagnosis: chunk size and overlap changes (4 of 186 spans cross a boundary), de-duplication or MMR
of the top 10 (0.5 same-entry chunks per list on average).

Is 34 enough? Not for judged counts: across five comparable judged runs of the served retrieval (lan48, with the fixed refusal text and 12 correct, left out) the correct count ranged from
16 to 18, and the judge alone changes 2 of 29 verdicts on identical answers, so a gain of 2 or 3 correct cannot be
told from noise. The plan therefore decides on the free span coverage (186 spans, deterministic), keeps the two-run
rule for judged counts, and adds about 30 held-out questions so the final claim is made on questions nobody tuned on.

Budget proposal (for the owner; nothing above the standing limits of 2 USD per run and 5 USD in total, 3.1032 used,
is spent before he sets new ones in CC-Mac's conversation). Per run: up to 4 USD (a Sonnet run on 64 questions with
the judge is about 2.9 USD). For the phase: 20 USD, about 19 planned: 6.4 2.1, 6.11 4.4, 6.12 12.7. A smaller variant
without the Sonnet guest-path check in 6.12 costs about 7.5 USD. Of the roughly 50 USD on the account, about 30 stay
in reserve.

Timeline against the key. The key in `.env` expires about 10 Dec 2026. Steps 6.1 to 6.3 need no key; 6.4, 6.11 and
6.12 do. For them to fit, 6.2 must be frozen by **3 Dec 2026**: 6.3 (box window) and 6.4 on 4 Dec, the free
candidate measurements 5 to 7 Dec, 6.11 on 8 Dec, 6.12 on 9 Dec. If 6.2 is not frozen by 3 Dec, or the owner prefers
no deadline, the fallback is a new API key from him before the first paid step after 10 Dec; deciding that early
lets the batches of 6.2 take the time they need.

## Later, optional (not scheduled)

- [ ] **Agent prompt for Qwen with a stopping rule** (owner, 16 Nov 2026, possible, not planned). A separately named
  prompt variant for the local agent with an explicit rule for when to stop searching and answer: in step 3.5, 23 of
  the 33 local step-limit tasks were mostly new calls, not repeats (`ai/eval/results/2026-11-16-agent-step-limit.md`).
  It would be tuned on the 18 tasks, so it needs either new tasks or a stated limitation.
- [ ] `/ask` endpoint in `bot/server.ts` and a panel in the cockpit UI.
- [ ] **Local contexts.** The local generator comparison moved to step 1.11. Remaining here: re-run 1.7 with the local model writing the chunk
  contexts and compare recall against the Claude-written contexts. Write up as "cloud vs local" in `docs/AI-RAG.md`: quality, latency, cost.
  This answers the question clients actually ask: can this run without sending data to a cloud model, and what does it cost in quality.
- [ ] `VoyageEmbedder` as a cloud embedding alternative, if 1.4 to 1.6 showed retrieval misses that look like embedding quality.
- [ ] Temporal filters in retrieval (restrict to a date range parsed from the question). Moved into step 6.8.

## Out of scope, deliberately

- No vector database. The corpus is a few thousand chunks; a JSON file and cosine similarity in memory is the right tool. Revisit above ~100k chunks.
- No fine-tuning. Retrieval over documents is the problem, not model behaviour.
- No orchestration framework. One session builds this, step by step, with the owner reading along.
