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

- [ ] NEXT **1.7 Contextual retrieval (Claude).** Before embedding, ask Claude for a one or two sentence context for each chunk given its whole source document,
  using prompt caching so the document is paid for once per file, not once per chunk. Prepend the context to the chunk text for embedding and BM25.
  Record tokens and cost. Label `contextual-hybrid-rerank`.
  Second variant, measured separately: query translation/expansion. One Claude call per question returns a Polish rendering plus 3-5 Polish
  keywords the journal author would use; vectors get the original question, BM25 gets the original plus the Polish text. Label
  `query-pl-hybrid-rerank`. Rationale: the 1.5 result shows that BM25's weakness here is the question language, not the algorithm.
  Verify: table with the two variants as separate rows next to the earlier ones; `docs/AI-RAG.md` gets its first draft with the table and the cost line.

- [ ] **1.8 Answer with citations.** `ai/answer/`: `Generator` interface with `ClaudeGenerator` as the phase 1 implementation; prompt with the top chunks, each tagged with its id; Claude answers in a structured output
  `{ answer, citations: [{ chunkId, quote }], notEnoughContext: boolean }`. A verifier checks that every quoted string actually occurs in the cited chunk
  and resolves chunk id to file and lines. The 5 unanswerable golden questions must come back with `notEnoughContext: true`.
  Verify: `npm run ask -- "Why did the live product stay wide?"` prints an answer with `file:lineStart-lineEnd` citations.

- [ ] **1.9 Answer-quality evaluation.** For the 25 answerable questions: citation accuracy (cited chunk is a golden chunk) and an LLM-as-judge score
  against a short reference answer written by the owner. Add to the results table.

- [ ] **1.10 Write-up.** `docs/AI-RAG.md`: the question this layer answers, the corpus, each design decision with the alternative rejected
  (structure-based chunking vs fixed size, no vector database at this scale, hybrid, reranker, contextual retrieval), the evaluation table, costs,
  three example transcripts with citations, what did not work. README section "AI layer". A short GIF of the CLI.
  Merge `ai-layer` to `main`.

## Phase 2: tool-using agent

- [ ] **2.1 Tool definitions.** `ai/agent/tools.ts`: `search_journal(query)` (phase 1 retrieval), `read_decision_log()`, `read_backtest_results(name)`
  (JSON in `backtest/results/`, restored from `journal-final` for the e8 and walk-forward runs), `list_backtest_configs()`.
  Each tool has a JSON schema, a pure handler and a unit test.
- [ ] **2.2 Agentic loop.** `ai/agent/run.ts`: Anthropic SDK tool use, max 10 steps, every tool call and result logged to `ai/agent/logs/` (gitignored),
  final answer with citations reused from 1.8. `npm run agent:ask -- "Would FlatWide have passed the gate with a 3 percent narrowing?"`.
- [ ] **2.3 Whitelisted job execution.** `run_backtest(config)` drops a job file for `scripts/agent-runner.ts` and polls `.agent/status.json`.
  The agent can only choose a whitelisted script, never a command. Document this as the security boundary.
- [ ] **2.4 Agent evaluation and write-up.** 10 multi-step questions with expected tool sequences; measure whether the right tools were called and the
  answer cites the right evidence. Add a section to `docs/AI-RAG.md`, three transcripts, README update. Merge to `main`.

## Phase 3: optional, only if time allows

- [ ] `/ask` endpoint in `bot/server.ts` and a panel in the cockpit UI.
- [ ] **Local generator comparison.** `[CC-Win pulls the models]` `LocalGenerator` on Ollama (e.g. Qwen 2.5 14B or 32B, 4-bit, fits in 24 GB) behind the same `Generator`
  interface. Re-run 1.9 with the local model: same retrieval, same golden set, same judge. Also re-run 1.7 with the local model writing the chunk
  contexts and compare recall against the Claude-written contexts. Write up as "cloud vs local" in `docs/AI-RAG.md`: quality, latency, cost.
  This answers the question clients actually ask: can this run without sending data to a cloud model, and what does it cost in quality.
- [ ] `VoyageEmbedder` as a cloud embedding alternative, if 1.4 to 1.6 showed retrieval misses that look like embedding quality.
- [ ] Temporal filters in retrieval (restrict to a date range parsed from the question).

## Out of scope, deliberately

- No vector database. The corpus is a few thousand chunks; a JSON file and cosine similarity in memory is the right tool. Revisit above ~100k chunks.
- No fine-tuning. Retrieval over documents is the problem, not model behaviour.
- No orchestration framework. One session builds this, step by step, with the owner reading along.
