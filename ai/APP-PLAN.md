# Phase 4: public showcase app with chat

Plan for reviving the HOMOS app as a showcase: archival data, a mock wallet and a chat window over the project
history. Written on 16 Nov 2026 by the CC-App session (a second CC-Mac session working in the worktree
`../HOMOS-app` on branch `app-chat`) while phase 3 runs on the GPU box from the main checkout.

This file lives under `ai/`, not `docs/`, on purpose: `ai/corpus/load.ts` indexes every `docs/*.md` except
`AI-PLAN.md` and `AI-RAG.md`, so a file in `docs/` would change the corpus hash. Files under `ai/` are never loaded.

Step state uses the same markers as `docs/AI-PLAN.md`: `[ ]`, `[x]`, `NEXT`. Sizes: **S** fits in one sitting,
**M** two or three, **L** needs a split before it starts. **Fake** means the step can be built and tested with the
fake models (`ai/embed/fake.ts`, `ai/rerank/fake.ts`, `ai/answer/fake.ts`) while the box is busy.

---

## 1. Reconnaissance (16 Nov 2026)

### 1.1 The app today

- **UI** (`src/`): one screen, `src/App.tsx` wraps `MorningCockpit` in wagmi plus ConnectKit. Panels: positions,
  paper trading, rankings, closed positions, telemetry. Almost all content comes from the bot API
  (`src/hooks/useBotApi.ts`, default `http://localhost:8787`, base URL and Bearer token typed into a settings form and
  kept in localStorage). Without the bot API the shell renders but the cockpit is empty.
- **The UI signs real transactions** through the user's wallet: rebalance, rotate, GMX hedge, open and close
  (`src/hooks/useCockpitActions.ts`, `useRebalanceExecution.ts`, `useRotateExecution.ts`, `useHedgeExecution.ts`).
  None of this may reach a public build.
- **Build**: not checked in this step (no `node_modules` in the worktree; the main checkout is off limits while
  phase 3 runs). Commit `021d445` records a working production build. Checked in step 4.2.
- **Bot API** (`bot/server.ts`, Express, port 8787): read endpoints over `.bot/` files (state, history, ranking,
  paper, ledger, closed positions, results) plus one write endpoint (`POST /api/proposals/:id/dismiss`). CORS is `*`
  and auth is off when `BOT_API_TOKEN` is unset. **Not exposed in phase 4**; the showcase reads exported files instead.
- **Bot** (`bot/observer.ts`): propose-only, reads chain state with `eth_call`, holds no private key. Telegram is
  optional. Paper trading (`bot/paper.ts`) runs a virtual $10k per pool on live data against a 50/50 HODL benchmark.
- **Removed for the case study** (`021d445`, `886b0ab`, `f2db0d7`): root working notes (later restored under
  `journal/` in `570217c`), old docs, `server.js`, the agent queue workflow, morning reports (restored), committed
  backtest results, a hardcoded watch address, LAN and VPN addresses in docs, the old `WalletConnect.jsx`.

### 1.2 Archival data

| Data | Where | Period | Public? |
|---|---|---|---|
| Morning reports, 37 | `journal/reports/` (committed) | 18 Aug to 23 Sep, live capital | Yes, already public |
| Journal, decisions, tasks | `journal/`, `docs/` (committed) | whole project | Yes, already public |
| Backtest results, 72 files | tag `journal-final`, local `backtest/results/` | simulated | Yes (owner chose not to commit them, step 2.1) |
| Saved answers and judge verdicts for the 34 golden questions | `ai/eval/results/` (committed) | Nov 2026 | Yes |
| Observer snapshots, proposals | local `.bot/` in the main checkout (820 KB) | 10 to 25 Aug, before live capital | Yes, after review |
| Market data (swaps, prices, funding, vaults) | local `data/` (6.4 GB) | 365 days | Too large; aggregates only |
| **Live ledger** (`tx-ledger.ndjson`, `ledger-state.json`, `closed-positions.json`, `tx-costs.json`) | `.bot/` on the Windows box only | live period | Yes by owner decision (address, amounts) |
| **Paper trading** (`paper-state.json`, `paper-events.ndjson`, `paper-history.ndjson`) | `.bot/` on the Windows box only | paper period | Yes |

The structured live ledger and the paper ledger are **not on the Mac**. `deploy/backup.ps1` copies only `*.json`, so
the `.ndjson` files may exist only in the box's `.bot/`. `.gitignore` mentions `.bot-live-backup/`, but no such
directory exists in the main checkout. Recovering these files is step 4.1b (CC-Win, after phase 3).

**Sensitive content found**: no keys, mnemonics, tokens or emails in HEAD, the tag or the local folders. The only
leftover is internal network detail: the LAN address of the box and the VPN subnet appear in `journal/CONTEXT.md`,
`journal/TASKS-WINDOWS.md`, `inference/README.md`, `docs/AI-PLAN.md`, `.env.example`, `CLAUDE.md` and two `ai/` files.
They are private ranges and already public in the repo, but the chat can quote them from the journal. Options for
the owner: accept, or redact at display time only (a display filter, so the corpus hash does not change).

### 1.3 Retrieval facts that shape the design

- The retrieval chosen in phase 1 (`AnswerRetrieval`, variant `chosen`) translates every new question into Polish
  with a **live Sonnet call** (`ai/answer/retrieval.ts`, `ensureTranslated`). That would spend the owner's key on
  every guest question, so guests always get variant `local` (step 1.11, variant B): embedding plus BM25 plus
  rerank, no cloud step. Phase 1 measured it at about the same level as the chosen variant (one better run, not
  repeated).
- Both the embedder (`bge-m3` on Ollama, port 11434) and the reranker (port 11435) run on the box. **Without the box
  there is no dense retrieval**; only BM25 works without the GPU.
- The generator already returns structured output: `coverage` is an enum (`full`, `partial`, `none`) and every
  citation is `{ chunkId, quote }`, checked mechanically against the chunk text (`ai/answer/verify.ts`). The agent's
  `dataRefs` check (step 2.2) does the same for numbers.
- The indexes (`ai/index/`, 113 MB) are gitignored and exist only in the main checkout. The worktree gets a copy when
  the server needs them (step 4.8), never a rebuild while phase 3 runs.

## 2. Guest's own Anthropic key: what the documentation says

Checked on 16 Nov 2026 in the Claude API documentation (Authentication, "Browser-based applications", and the
TypeScript SDK, "Browser usage"):

- Direct calls from a browser are **supported**. The API accepts a cross-origin request only with the header
  `anthropic-dangerous-direct-browser-access: true`; the TypeScript SDK sends it when `dangerouslyAllowBrowser: true`.
- The documentation warns against it for the site owner's key, because anyone can read a key embedded in page code.
  That warning does not apply to a guest typing their own key into their own browser: the key never leaves the
  guest's machine except to `api.anthropic.com`.
- Organizations with zero data retention or the Compliance API enabled **cannot** call the API from a browser; the
  API answers 401 with a message starting `CORS requests are not allowed for this Organization`. The UI must show
  this case plainly.
- The documentation recommends short-lived keys: a key can be created with an expiry of 3 hours, 1 day, 7 days or 30
  days. The UI asks guests to use such a key.

**Design**: the browser asks our server for retrieval only (`POST /api/retrieve`: question in, chunk texts out; the
corpus is public anyway), then calls Anthropic itself with the guest's key, then runs the same citation verifier in
the browser (the verifier is pure TypeScript and is bundled). Our server never receives the key. Protections: the key
is kept in memory (optionally `sessionStorage` on request, never `localStorage`); a Content Security Policy with
`connect-src 'self' https://api.anthropic.com` and no third-party scripts, so injected script cannot send the key
anywhere else; a test asserts that no request to our origin carries an `x-api-key` or `Authorization` header.

**Fallback if browser calls ever stop working**: a pass-through on our server that forwards the key per request
without storing or logging it. Rejected as the default: the key would then reach our process, which is the thing to
avoid.

## 3. Architecture for stage A

```
 visitor browser
   |  static site: comparison, archive, mock wallet, chat UI (served by the same server)
   |  /api/* through the tunnel (only when the box is up)
   v
 Cloudflare Tunnel (outbound connection from the box, no open port on the router)
   v
 chat backend, Node + Express, on the box, bound to 127.0.0.1, unprivileged Windows user
   |-- queue (one GPU job at a time) -> Ollama 127.0.0.1:11434 (generator, embedder)
   |-- reranker 127.0.0.1:11435
   |-- read-only copies: corpus, ai/index, exported archive JSON
```

**Where the backend runs.** On the box: it is on 24/7, Ollama and the reranker are local to it, and the tunnel makes
only outbound connections. Alternatives: on the Mac (rejected: not on 24/7, and it would add a LAN hop for every
call); on a cloud server (rejected: it would need the box's model ports reachable from the internet). The backend
runs as its own non-admin Windows user, not `SYSTEM` like the inference tasks.

**Static part on the box too (owner, 16 Nov 2026).** The comparison of the 34 golden questions, the archive and the
mock wallet are static files built from committed data (`showcase/public`), served by the same server process on the
box, with the same security headers. They need no model, so they keep working while the model services are off,
paused or busy; they are down only when the server process or the tunnel is down. Hosting the static part elsewhere
(for example Cloudflare Pages) stays an option if the owner wants it available with the box off.

**No owner key on the public path.** The backend refuses to start if `ANTHROPIC_API_KEY` is present in its
environment, and the guest code path has no Anthropic client at all. Engines: `local` (the box) and `guest-key`
(browser).

**Queue.** One in-process FIFO in front of the GPU, concurrency 1, at most 5 waiting, at most one pending question
per visitor. Each job has a deadline (240 s from its start, generator timeout 180 s inside it, to be tuned from the
phase 3 speed measurements). A job past its deadline is reported as timed out, but the next job starts only when the
abandoned work really ends, so the GPU never runs two answers. A visitor who leaves while waiting is removed from
the queue. Retrieval for guest-key questions goes through the same queue, since embedding and rerank also use the
GPU, but it is short.

**Streaming.** Server-Sent Events with status only: `queued` (position and queue length), `retrieving`,
`generating`, then the final verified answer in one `result` event (or one `error` event). The answer text is not streamed token by
token: it is JSON that is verified after it is complete, and showing unverified text first would undo the
verification marks. A visible progress line covers the wait.

**Rate limits.** Visitor identity: a hash of the client IP with a salt drawn at random for each UTC day and kept only
in memory (no cookie: the hash is enough, and a cookie would be one more thing that tracks visitors). The IP is never
stored or logged; hashes from different days cannot be linked. The tunnel header `CF-Connecting-IP` is trusted only
with `SERVE_MODE=tunnel` (step 4.7). A question refused by the queue, by the pause switch or because the box is off is
given back to the visitor's limit. Limits to start: 5
questions per hour and 20 per day per visitor, 200 per day for the whole site, question length at most 500
characters, single-turn questions (no chat history sent to the model in stage A). A Cloudflare rate rule in front as
a second layer. All numbers in `.env`, documented in `.env.example`.

**What the visitor sees.**

| State | Shown |
|---|---|
| Box up, queue empty | Chat ready, engine label of the served preset |
| Box up, another question running | "Waiting, position n of m", then the status of its own question |
| Box up, queue full | "The local model is busy with other questions. Please try again in a few minutes." Comparison still available |
| Chat paused (pause file on the box) | "The chat is paused while the GPU is used for other work." Comparison and archive available |
| GPU busy with other work, or the model does not fit in memory | Retrieval or generation fails inside the job: "The local model could not answer right now: the GPU may be busy with other work, or the model may not fit in its memory at the moment." Nothing generated is shown |
| Answer past its deadline | "The answer took too long and was stopped." |
| Model services down (box on) | Static views work, chat shows "The local model is offline right now", health says `model-offline` |
| Chat server down, tunnel up | Cloudflare's error page for the whole site; restart on failure in the scheduled task keeps this short |
| Box off or tunnel down | The site is unreachable (Cloudflare's error page) |
| Visitor over limit | The limit message and the time until the next allowed question (`Retry-After`) |
| Site over its daily cap | "The chat has answered all the questions it can today." |
| Guest key rejected | The API's message, including the CORS-for-this-organization case |

**Hallucination control.**

- Structured output with enums for every closed set: `coverage`, engine, verdict labels, source kinds.
- `coverage: none` is rendered by the UI as a fixed "not in the data" text with the searched sources listed; the
  model's own wording is not shown in that case.
- Every quote is verified against its chunk; unverified quotes are shown struck through with a mark, never silently
  dropped (the phase 1 rule).
- Every number in the answer text is checked: it must appear, as a whole number, in a verified quote, otherwise it is
  marked "not verified" (step 4.3). A preview on the saved step 3.2 answers marks 54 of 134 numbers (pb1) and 55 of
  130 (pb2), many of them derived (dates rewritten, multiples, values from a chunk that was not quoted): see 4.8. For archive figures (positions, PnL) the model returns a reference
  (`{ source, id, field }`) and the UI fills the value from the exported data, as `dataRefs` do in step 2.2.
- Each answer shows its sources as links to the archive view of the chunk.

## 4. Security review of the public surface

**Exposed**: the static site; `GET /api/health` (up, busy, queue length only); `POST /api/ask` (local engine);
`POST /api/retrieve` (chunks of the public corpus); the SSE status stream.

**Not exposed**: Ollama and the reranker (stay on localhost and the LAN firewall rules); the bot API on 8787 (not
started); `run_backtest` and every agent tool (stage A has no tools at all); `.env` and any Anthropic key; real wallet
connection (the showcase bundle does not import wagmi, ConnectKit or any signing hook); the indexes as files; logs.

**Prompt injection.**

- The only untrusted input is the question. The corpus is fixed, written by the owner and already public; the
  injection probes of step 2.2 passed.
- No tools, no secrets and no other visitors' data in the model context, so a successful injection can only change
  the text shown to the person who wrote it.
- Answers are rendered as plain text through React (no HTML, no Markdown links or images), so model output cannot
  load anything or run script.
- No shareable answer links in stage A, so a crafted answer cannot be passed to someone else with the site's look.

**Abuse.** Limits above; request body capped at 2 KB; deadline per job; output tokens capped; a daily global cap that
closes the chat until the next day; questions logged locally with a hash of the visitor id (retention 30 days,
stated on the page). The link is shared privately and never written to the repo; optional Cloudflare Access in front
if the link leaks.

**The box.** It sits on the owner's home LAN. The tunnel maps one local port only; the backend has read access to its
own folder and write access to its log folder only; it does not run as `SYSTEM`; nothing on the public path can
start a process. A compromise of the backend still lands on a home machine, which is the main residual risk and the
reason for the separate user and the kill switch (stopping the tunnel service).

## 5. Owner decisions (16 Nov 2026, plan approved)

- **Layout**: chat backend in `ai/serve/`, showcase front end in `showcase/` at the repo root.
- **Network addresses**: a display-only filter masks LAN and VPN addresses in quotes and answers. The corpus and its
  hash do not change. The filter has its own tests.
- **Comparison view**: two columns by default, Sonnet k=10 and the configuration the chat actually serves (fully
  local retrieval with the local prompt, measured as step 3.2 on `ai-layer`; taken once committed). Every other
  measured variant goes into a collapsed "more" section. A configuration with one run is labelled "single run".
- **Served configuration**: model and prompt of the served engine are a configuration value, not code, because phase
  3 may still change which local model is best.
- **Verification marks**: a quote or number that fails verification is shown with a visible "not verified" mark,
  never dropped and never shown as verified. Invalid structured output gives the visitor a plain failure message.
- **Scope**: out-of-scope questions get a short refusal that says what the chat covers. No advice on what to buy or
  how to trade. The page says that the strategy did not reliably beat holding.
- **Wallet address in the bundle**: the read-only wallet panel shows the address from `SHOWCASE_WALLET_ADDRESS`,
  inlined at build time, so the built bundle contains it. Approved by the owner on 16 Nov 2026, following the earlier
  decision that the wallet address and amounts may be public. It stays out of the source code (removed in `021d445`).
- **Served preset confirmed**: the step 3.2 runs (pb1, pb2). A phase 3 winner comes in as a new preset only if it
  exceeds the run-to-run spread.
- **No wallet code**: the showcase front end imports no wallet or signing library; a test fails the build if one is
  imported.
- **Logs**: visitor IP addresses are never stored in clear; rate limiting uses a hash of the IP with a daily salt.
- **Order**: guest-key mode moves after the first LAN run.
- **Known limitation (accepted 16 Nov 2026)**: an out-of-scope question and a question the data does not answer get
  the same fixed text, which says what the assistant covers. Only trading advice is detected before the model; the
  served prompt (measured in step 3.2) cannot tell the other two apart, and it is not changed without a new
  measurement. The number-rule guards of step 4.5 (two significant digits for a chunk match, multipliers never in the
  source) are approved, and CI runs on pushes to `app-chat`.
- **Served preset after step 3.4**: unchanged. No candidate came near Qwen (16 and 16 correct against 10 and 10 for
  the best newcomer).

## 6. Hosting on the Windows box (owner reminder, 16 Nov 2026)

The showcase and the chat server run on the Windows GPU box, operated by CC-Win. CC-Win does not write code; it pulls,
installs, runs the tests and operates the services.

- **No shell scripts on the serving path.** The server starts with plain node and an env file outside the repo:
  `node --env-file=C:\HomosServe\serve.env --import tsx ai\serve\server-cli.ts`. Tests are npm scripts that chain
  `tsx` calls with `&&`, which `cmd.exe` runs as well. Paths go through `path.join`; the corpus loader, the verifier
  and the export normalise CRLF, so a Windows checkout gives the same corpus hash (tested).
- **Serving checkout.** A separate clone, for example `C:\HomosServe\homos`, owned by a local non-admin user
  (`homos-web`), on branch `app-chat` until phase 4 is merged, then `main`. Its `.env` does not exist; the env file
  `C:\HomosServe\serve.env` holds only `SERVE_*`, `INFERENCE_URL=http://127.0.0.1:11434` and
  `RERANK_URL=http://127.0.0.1:11435`. No Anthropic key on the box for this user (the server refuses to start with one).
- **How the index gets onto the box.** The served index is `ai/index/ollama-bge-m3.meta.json` (built on the Mac on
  10 Nov 2026, 957 vectors) plus the tokenizer folder `ai/index/tokenizers/qwen3.8-27b`. Two hashes, one corpus:
  `8d7f9a3437b43594` is the project-wide corpus hash, over the plain chunks (`corpusHash(loadCorpus())`, the value in
  `ai/DECISIONS.md` and in the plain index `ollama-bge-m3.json`); `cb41ca39fd344c6f` is the hash of the meta view of
  the same 957 chunks (each text with its `[file | date | title]` header, which is what the meta index embeds) and is
  the value stored in `ollama-bge-m3.meta.json`. Both recomputed on `app-chat` on 16 Nov 2026: they match, and no
  corpus file differs from `main`. The served preset records both; the server refuses to start unless the corpus on
  disk gives both and the index matches. The owner copies both from the Mac to the serving checkout over the LAN
  share (or a USB stick); CC-Win compares the SHA-256 of the copied files with the Mac's, then starts the dry run,
  which reports whether the index matches the corpus. The real engine refuses to start on a missing or mismatched
  index (`IndexMismatch`), so a corpus change without a new index cannot go live. Rebuilding the index on the box is
  not used: it would not be the index the measured runs used.
- **How updates are deployed.** CC-Win in the serving checkout: create the pause file, `git pull`, `npm ci`, the serve
  tests (`npx tsx ai/serve/serve.test.ts`, `npx tsx ai/serve/queue.test.ts`), `npm run showcase:build`, restart the
  server task, check `/api/health`, delete the pause file. Rollback: `git checkout <previous commit>` and the same steps.
  CC-Mac never deploys; it pushes and tells CC-Win the commit.
- **Start after a reboot, non-admin.** Two scheduled tasks, both "run whether the user is logged on or not" as
  `homos-web` (a standard user, not an administrator, not `SYSTEM`): `HOMOS chat` at startup with a 60 s delay (after
  the existing Ollama and reranker tasks), running the node command above in the serving checkout, restart on failure;
  `HOMOS tunnel` (step 4.9) at startup running `cloudflared tunnel run` with a token file readable only by
  `homos-web`. Until the model services answer, the chat reports `model-offline` and recovers by itself.
- **Model load order (step 3.5 finding, CC-Mac, 16 Nov 2026).** With Ollama 0.40.15 on Windows, loading the
  generator evicts a resident bge-m3, while bge-m3 loads next to a resident generator; with the owner's 48 GB
  pagefile all three models stay resident (23 980 of 24 576 MiB VRAM). Details in `inference/README.md` on
  `ai-layer`, "Pagefile (commit limit)". The real engine therefore starts with a fixed order
  (`ai/serve/residency.ts`): one short chat with the served num_ctx, then one embed with no num_ctx, both with a long
  keep_alive (`SERVE_KEEP_ALIVE`, default 24h; it does not shape the output, so the measured preset is unchanged);
  then `/api/ps` must list both and the generator must be fully in VRAM with the served num_ctx, or the server
  refuses to start. Before each question, inside the GPU queue, `/api/ps` is checked again and the same order is
  replayed if the generator was unloaded; if that fails, the visitor gets the "model unavailable" text. Step 3.5 and
  any other GPU work should still use the pause file, because their models compete for the same 24 GB. The reranker
  (port 11435) is part of the same check (owner, 16 Nov 2026): `GET /health` must report `bge-reranker-v2-m3` on
  `cuda`, or the server refuses to start; before each question a reranker that stopped answering gives the visitor
  the "model unavailable" text.
- **GPU busy or the model does not fit.** Before the owner or CC-Win uses the GPU for other work (evaluation runs,
  pulling or testing models), CC-Win creates `ai\serve\PAUSED` in the serving checkout; the chat then answers
  "paused" at once and does not touch the GPU, and deletes it afterwards. Without the pause file, a failure inside the
  job (Ollama evicting or failing to load the model, out of memory, a prompt over the context) gives the visitor the
  fixed "model could not answer right now" text; the request log records `model-unavailable` and the stage.

**Pinned commit on the box (rule since 18 Nov 2026).** Every instruction to CC-Win that starts the server begins with:
`git fetch`, `git checkout --detach <pinned commit>`, and `git rev-parse HEAD` reported before the server starts; the
cleanup step leaves the clone on that pinned commit, never on a local branch. Reason: after 4.10d a cleanup
`git checkout app-chat` put `C:\HomosServe\homos` on the stale local branch at `ac5a06a` (behind origin by 9), whose
code has neither models on demand nor the owner switch. Changing the clone is a box change: CC-Win takes the owner's
go in its own conversation.

## 7. Steps, stage A

Order: 4.1, 4.2, 4.3, 4.4, 4.4b, 4.5, 4.7, 4.8, 4.6, 4.9.

- [x] **4.0** Reconnaissance and this plan. S.
- [x] **4.1** Showcase data export: a script that builds static JSON from committed results only: the 34 golden
  questions with the Sonnet answers (k10) and the served local configuration (step 3.2 runs), their citations with
  the verified flag, the judge verdicts, the other measured variants for the "more" section, run counts; plus the
  morning report index. Display filter for network addresses with tests. Fake (no models). S.
- [x] **4.1b** [CC-Win, after phase 3] Copy the live ledger and paper files from the box's `.bot/` to the owner's
  Mac (not to the repo), list them, check for anything sensitive, then decide what is exported. S. Done 16 Nov 2026:
  eight files in `data/showcase-raw/` (gitignored by `data/`, never committed), SHA-256 sums checked against both
  the `SHA256SUMS` file and the list in CC-Win's message, all 8 OK. CC-Win's scan found no keys, URLs or seed
  material; the only addresses are five public token contracts, and neither the owner's wallet nor a pool contract
  appears. `ai/serve/wallet-export.ts` copies field by field only what the Wallet view needs (4 real positions with
  last value against holding and fees, 16 transactions with public hashes and gas, 6 paper pools with daily series
  and events), project period only (from 10 Aug 2026). Owner decision: the two manual positions opened in March 2025
  (#953427, #953465, 6 ledger entries plus their closing entries, 12 in all) are excluded from every list and total
  and leave no trace in the export, not even their numbers; the Wallet tab says so in one line. An audit runs before
  the file is written and refuses it on any URL, key parameter, private address, unknown 0x address (allowed: the
  five token contracts and the owner's wallet), 64-digit hex outside a `txHash` field, excluded position or date
  before the project; tested on a synthetic folder with traps and on the real files. Owner decision (16 Nov 2026):
  the sanitized export is not committed. It is written to `data/showcase/wallet.json` (gitignored, outside the page
  build), the chat server serves it at `/data/wallet.json` only when the file exists (`SERVE_WALLET_FILE`), and it
  is copied to the box apart from git. Without it the Wallet tab is hidden, never empty or failing. CI and the
  browser suite use `showcase/e2e/fixtures/wallet.fixture.json`: made-up positions, marked as test data on the page,
  checked by the same audit. The wallet address comes from `SHOWCASE_WALLET_ADDRESS` in the worktree `.env` (added by
  the owner), read only at page build time. Wallet review (owner, 16 Nov 2026): against holding is shown before and with fees (the bot's
  value excludes uncollected fees; the definition is stated once under the cards), totals over the four positions
  (fees $42.02, before fees -$40.11, with fees +$1.91), token amounts where the ledger has no dollar value, one row
  per transaction (mint plus deposit, decrease plus collect), repeated paper events counted. Paper figures checked
  against `paper-history.ndjson` (all six pools match to the cent); paper "holding instead" is a 50/50 dollar split
  frozen at the first open on 18 Aug, the real one is the position's own tokens at its first observation, which
  explains the different results for the same pool. Found while merging rows: gas was counted twice for the four
  withdrawals (decrease and collect share a transaction); the total is now 0.000047 ETH, not 0.000094 ETH. The
  excluded positions' opening entries are lines 1 and 3 of `tx-ledger.ndjson` (24 Mar 2025, mainnet blocks
  22117148 and 22117631).
- [x] **4.2** Showcase front end skeleton in `showcase/`: own webpack entry, comparison view (two columns, "more"
  section, verdicts, verification marks), archive view, mock wallet panel (read-only), the "did not reliably beat
  holding" notice, a test that fails on any wallet or signing import. Check that the existing UI still builds. Fake. M.
- [x] **4.3** Chat backend core in `ai/serve/`: `POST /api/ask` and `GET /api/health` through the existing
  `Embedder`, `Reranker` and `Generator` interfaces, variant `local` retrieval built without the module that holds the
  Sonnet translation, served preset from configuration (tested equal to the measured run's settings), verifier with
  number checks, response with enums, "not in the data", advice refusal, plain failure on invalid output, display
  filter, startup refusal when `ANTHROPIC_API_KEY` is set. `/api/retrieve` moved to 4.6, so retrieval is not exposed
  before guest-key mode needs it. Tests with fake models. M.
- [x] **4.4** Queue, SSE status stream, rate limits (IP hashed with a daily salt), request log without addresses,
  health with `up`, `busy`, `paused` and `model-offline`, the "model unavailable" message, pause file, dry-run engine
  (`SERVE_ENGINE=fake`), start-up refusal on a missing or mismatched index. Tests with a slow fake generator and the
  dry-run server started as a child process. Fake. M.
- [x] **4.4b** [CC-Win] Windows dry run with fake models, without touching the GPU: CC-Win clones `app-chat` into
  the serving checkout as `homos-web`, runs `npm ci`, the serve tests and `npm run showcase:build`, writes `serve.env`
  with `SERVE_ENGINE=fake`, starts the server with the node command of section 6 on 127.0.0.1, calls `/api/health`
  and asks one question with `curl.exe`, creates and deletes the pause file, and reports the outputs. Does not need
  the GPU, so it can run while phase 3 holds the box, if the owner allows CC-Win to work on the box. S.
  Result, 16 Nov 2026 (CC-Win, relayed by CC-Mac): passed on `dc2a85a`, nothing failed because of Windows. Separate
  clone `C:\Projects\homos-dryrun`, Node 24.19.0, no key anywhere, no user, task, tunnel or firewall rule created,
  GPU services untouched. Unit tests serve 77/0, queue 57/0, mask 89/0, export 95/0, guard 46/0; showcase build OK;
  server on 127.0.0.1:8790 reported the missing index as expected; health, static files, one question (JSON and
  SSE), pause file and request log (hash only, no IP) as designed. Notes: start from PowerShell or cmd, not Git Bash
  (Git Bash dropped the backslashes of the script path); static responses and `/api/health` carry no security
  headers yet, which is step 4.7. Re-check on `544e6da` (step 4.5 build with the font copy step): passed; unit tests
  mask 89, export 95, guard 80, serve 96, queue 57, all passing; fonts and licence served with correct types; corpus
  hash as measured. npm skipped the install scripts of `utf-8-validate` and `keccak` (both fall back to JavaScript).
- [x] **4.5** Chat panel, verification marks and design pass, plus the Playwright suite in CI. Numbers have three
  states (owner, 16 Nov 2026): "Verified" (in a verified quote), "In the cited source" (in a chunk the answer cites
  with a verified quote, with at least two significant digits, or obtained by one of three code-checked
  transformations: date written out, project year added, rounding to the printed decimals), "Not verified" (all
  else, including sums, ratios and multipliers). The states differ in shape (solid, dotted, wavy underline; check,
  approximately equal, question mark) and in words. Design pass with the frontend-design plugin: neutral title
  ("DeFi liquidity-provision trading system: research archive and AI assistant"), three-sentence introduction,
  honesty notice on every view, plain labels with exact settings behind a disclosure, the judge's grade and the
  quote check explained apart, Polish quotes labelled as originals, reports rendered from Markdown with logs
  folded, opening on 15 Sep 2026, wallet tab hidden until 4.1b, Recursive font (OFL-1.1) bundled, WCAG AA contrast
  in both colour schemes (lowest pair 5.22:1). Playwright: 12 visitor paths on desktop and phone width against three
  local servers with fake models, screenshot on failure, a CI job with the unit tests and the suite. Fake. M.
- [x] **4.5b** Layout and typography follow-up (owner, 16 Nov 2026). Done: compact header (title, one line, "More
  about this project" disclosure, the honesty notice beside the title on wide screens and on every view), the question
  box on the first screen at 1280 x 800 (tested), "How answers are checked" beside the chat on wide screens, wider
  comparison, example questions submit at once, the result region takes focus, scrolls into view and is an
  `aria-live` region (tested), daily reports with a line on what they hold and the technical sections folded so the
  money sections come first (the source is not changed; each section gets an English gloss next to its Polish
  heading). Typography: the owner chose variant C of three, Source Sans 3 with Source Code Pro (OFL-1.1, bundled);
  Inter, JetBrains Mono and IBM Plex were removed with their files. Title and headings at weight 600, the title
  about 13% smaller and on one line at 1280 px (22.7 px), bold only for short labels; tabs in three equal columns on
  a phone (one row at 360 and 390 px).
  `keccak` question answered: in the lockfile since `516f8ea` (19 Mar 2025, the old cockpit), pulled in by `wagmi`
  (Coinbase wallet SDK) and `@uniswap/v3-sdk` (hardhat), unchanged by phase 4; not in the showcase bundle (build guard,
  now listing `keccak` and `hardhat`) and not loaded by the chat server (a test over the modules Node actually loads).
- [x] **4.7** Security pass, offline (the box was busy with step 3.5). Reviewed request limits, input length and
  encoding, the wallet path, response headers and the CSP, the request log, error messages and the full queue, by
  reading the code and probing a dry-run server. Fixed (owner, 16 Nov 2026), tests in `ai/serve/security.test.ts`
  and `ai/serve/queue.test.ts`:
  M1 the wallet file is served only if its real path is under `data/` (test fixtures only in the dry run), it ends
  in `.json`, is under 2 MB, has the export's shape and passes the export audit; it is read once at start and held in
  memory, and the start-up log says why when it is not served (package.json, a `.env`, a symbolic link out of
  `data/`, other JSON, a leaky file: all refused, tested);
  M2 one middleware sets the CSP of `index.html` plus `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`
  `same-origin` and `X-Frame-Options: DENY` on every response; the meta tag stays (the page keeps a policy when served
  without this server) and a test keeps it equal to the header policy;
  M3 `SERVE_MODE=local|tunnel` replaces `SERVE_TRUST_PROXY` (refused if still set): tunnel mode takes the visitor from
  `CF-Connecting-IP` and refuses to start unless `SERVE_HOST` is exactly 127.0.0.1; the log warns once when the
  traffic does not match the mode;
  L1 IPv6 visitors are counted by their /64 prefix (IPv4-mapped addresses as IPv4);
  L2 old log files are deleted on the first write of every UTC day, not only at start;
  L3 unknown paths get a plain `Not found`, not the framework's page with the echoed path;
  L5 questions lose bidirectional controls, other format characters (zero-width, BOM) and control characters before
  they are answered or logged;
  L7 a visitor who leaves cancels the model call (Ollama stops generating when the client goes away) and frees the
  slot at once; the job deadline cancels it too (tested with the fake engine: the slot is free in under 1.5 s instead
  of after the 5 s answer).
  Left as documented: L4 the source map `app.js.map` stays public, because the repository is public and the map holds
  no local paths; L6 the one known advisory in the server's modules (`cookie`, low, via express) cannot be reached,
  because the server sets no cookies, and the other advisories in the repository are in the old cockpit's wallet and
  contract tooling, which neither the server nor the showcase bundle loads.
  Box note: the request log folder must be readable only by `homos-web` (Windows ACL on `ai\serve\logs`).

- [x] **4.8** (done 17 Nov 2026, accepted by the owner) Owner decision: this first test series runs as the desktop user `cywil`
  (the account `homos-web` does not exist yet; CC-Win stopped at step 0 and created nothing). The owner then set the
  paths in CC-Win's session: the serving clone `C:\HomosServe\homos` (created for this run, fallback
  `C:\Projects\homos-dryrun`), `C:\HomosServe\serve.env`, outputs in `C:\HomosServe\`. For 4.9 the clone and
  `serve.env` must then be owned by `homos-web`, readable by nobody else, since they are created by `cywil` now. Running under
  `homos-web` from `C:\HomosServe\homos` is a precondition of 4.9; the owner creates that account and its password
  himself. First real run on the LAN only (no tunnel): copy indexes, CC-Win sets up the backend service under its
  own user, owner tests from the Mac and a phone on the LAN. Needs the box. S. First real start checks the load order on the box: the
  `[serve] resident:` line, `/api/ps` with generator, bge-m3 and the reranker loaded, and one question after a forced
  generator unload (the log line "models reloaded in order before a question"). Includes a count of false "not
  verified" marks on numbers: run the 34 golden questions through the chat, list every number marked not verified,
  and classify each as unsupported (a correct mark) or derived (a converted date, a sum, a rounded or rescaled value,
  a count the model made from the sources: a false mark). If false marks are more than a few, propose a rule (for
  example a third state "derived, check the source" for values computable from verified quotes) before the tunnel.
  Then the same Playwright suite against the real server on the LAN (`E2E_BASE_URL=... E2E_SHOTS_DIR=...
  npx playwright test --grep @real`; the dry-run-only paths are skipped there), with a screenshot of each path
  reported to the owner.
  Result 17 Nov 2026 (review: `ai/eval/results/2026-11-17-lan-run-4.8-review.md`): no failure; 37 questions, median
  9.9 s per question (retrieval 0.44 s, generation and verification 9.5 s); quotes not verified 3 of 82; all 20
  "not verified" number marks were false alarms (rule changes proposed in the review); the disconnect test cancelled
  the generation on the real GPU; browser suite 13 passed, 1 skipped. VRAM 24 010 of 24 576 MiB after warm-up, commit
  memory 45.0 GB rising to 53.2 GB over the series: both are measured again under the design of section 10, which
  replaces the 24-hour residency. Findings: by-eye grades about 17 correct, 11 partly, 6 incorrect (dated-01, dated-04,
  dated-05, dated-07, id-07, why-03; dated-04, dated-05 and id-07 were judged incorrect in both 3.2 runs too); the
  eighth unanswerable question is why-07 (answerable "partial"), answered correctly with "the sources give no reason";
  na-03 and na-07 got the fixed text instead of a correction of their false premise; coverage differs from 3.2 on 9
  questions, within the run-to-run spread; quotes not verified 3.7% against 1.1% in 3.2, outside the 3.2 range by the
  spread rule but on counts of 3 against 1; about 4.2 GB of VRAM was in use before the models loaded (reranker and the
  desktop or RDP session), so the margin with the three models alone is larger than 520 MiB, to be measured per
  process in 4.10d. The 4.8 batch file kept quote status and file but not the quote text, chunk id or the searched
  chunk ids, so number marks cannot be recomputed on those answers offline; the batch tool now keeps the full
  response. Blind judge on the 34 answers: see step 4.8j.
- [x] **4.8n** Number marks (owner, 17 Nov 2026), before 4.10: mechanical fixes (ISO dates and times as one
  token, list numbering ignored, pool fee tier in both notations); a seeded-error test set of at least 20 truly
  unsupported numbers; proposals for single digits, rounding to one significant digit and numbers found only in an
  uncited source, decided by the owner; the page states that a number mark means the number appears in a source, not
  that it answers the question. Offline, no GPU. Built: the mechanical fixes and the page wording; seeded errors 32, caught 32 (29 by the rule
  before); "not verified" marks on the 57 real answers of 3.2 down from 41 to 28; four proposals measured and waiting
  for the owner (`ai/eval/results/2026-11-17-number-marks-4.8n.md`). Owner's decisions applied: proposals 1 and 3 on,
  2 rejected, identifiers checked as one token; final: 18 "not verified" (6 with the uncited reason) on the 57 real
  answers, 34 of 34 seeded errors caught, including two invented identifiers the old rule did not mark at all.
- [x] **4.8j** Blind judge (same judge and prompt as step 3.2) on two live runs of the 34 golden questions through the
  chat server (4.8j and 4.8j2), refusals judged with and without the model's explanation. Live retrieval gave the
  step 3.2 chunk lists on all 34 questions in both runs. With the explanation (the page as built), two runs (4.8j2 18 / 11 / 5,
  4.8j3 16 / 14 / 4): within the phase 3 spread on every count; with the fixed heading alone (two runs): incorrect
  beyond the spread. Live retrieval matched the saved chunk lists on 34 of 34 in all three runs. Judge cost
  $0.54 + $0.52 + $0.50 + $0.53. Result: `ai/eval/results/2026-11-17-judged-lan48-4.8j.md`.
- [ ] NEXT **4.10** On-demand models with an owner switch (section 10), design accepted 17 Nov 2026 with variant (a)
  Cloudflare Access and a 15-minute idle period; until the tunnel exists the switch is the file on the box. Starts
  after 4.8n. Follow-up: the master switch should eventually release the reranker too, so the whole GPU is free when
  the chat is off; this needs load and unload endpoints in `inference/`, coordinated with CC-Mac when we get there.
  **4.10a done (17 Nov 2026, owner's OK):** `ai/serve/models-state.ts` (states off, idle, loading,
  search, ready, unloading; the retrieval-only state "search" and the per-model plan the owner accepted on 17 Nov:
  full load generator, bge-m3, check; search to full releases bge-m3 first), `GET /api/models`,
  `POST /api/models/load` (single flight, own limits 2 per visitor per hour, 6 per day, 30 for the site, joining is
  free, no retry), questions refused with the state until "ready" and given back to the limit, the switch file
  (`SERVE_SWITCH_FILE`, missing = off, the pause file wins), the load panel with staged progress and typical times.
  The dry run uses it; the real engine keeps loading at start until 4.10b. Guest loads ("search") get their visitor
  control with 4.6, counted against the same load limits.
  **4.10b done (17 Nov 2026, owner's OK):** releases through Ollama the way `ollama stop` does
  (keep_alive 0, generator first, tagged names), confirmed by `/api/ps`; the switch turned off aborts a running load
  and releases both models, and the state says "unloading" until the release is confirmed; after an aborted or failed
  load the release watches `/api/ps` for 30 s and releases a model that appears late (Ollama may finish a load whose
  request was aborted); an unconfirmed release keeps "unloading", is logged and checked again every 30 s, and no load
  is accepted meanwhile; the idle release after 15 minutes without a question (not while one runs or waits);
  keep_alive 60m as the ceiling; start-up checks only Ollama, both models on disk and the reranker, and loads
  nothing; the per-question check releases what is left and drops to idle instead of reloading. Failed loads (owner,
  17 Nov 2026): counted per visitor, not against the site total, and 2 minutes before the next load
  (`SERVE_LOAD_COOLDOWN_MS`). On the box this needs `SERVE_SWITCH_FILE` in `serve.env`, pointing outside the clone
  (for example `C:\HomosServe\SWITCH`), or the models stay off.
  **4.10d done on the box (17 Nov 2026, owner's OK):** loads 21.7 and 15.6 s (generator) plus 2.6 s
  (bge-m3); idle releases in 1 s; a switch-off during a load aborted it in Ollama itself, no late model; the 8 GB
  commit rise is the generator's llama-server and is fully returned on release (21.9 GB again, stable for an hour);
  VRAM per process not readable under WDDM. `ai/eval/results/2026-11-17-models-on-demand-4.10d.md`.
- [ ] **4.6** Guest-key mode. Plan written 16 Nov 2026 (no code yet); details in section 9. M, in five parts:
  4.6a server endpoints `/api/guest/retrieve` and `/api/guest/verify` with tickets, fake models; 4.6b the browser
  call and the key field; 4.6c CSP, guard and bundle allow-list; 4.6d Playwright with a mocked Anthropic API;
  4.6e one measurement of the cloud generator on the fully local retrieval (owner's key, owner's OK first).
  **4.6a done (18 Nov 2026, owner's OK):** `ai/serve/guest.ts` and the routes `/api/guest/retrieve` and
  `/api/guest/verify` in `app.ts`; "Load search" opened in `/api/models/load`; `present()` shared with the chat.
  Departures from section 9 and the review: verify has its own per-visitor limiter with the question limits (one guest
  question costs one retrieval from the question limit and one verification); the request body keeps the SDK's
  transformed answer schema of the measured runs (enum moved into a description), checked by a test against the SDK;
  `max_tokens` is 2,048 against 8,000 in the measured runs (largest measured answer 629 output tokens); a ticket's
  signature must be in canonical base64url; the key refusal covers every `/api` route, not only the guest ones.
  **4.6b done (18 Nov 2026, owner's OK):** `showcase/guest-key.ts` (the key in one module variable, no
  getter, used only in the `x-api-key` header of the one call to api.anthropic.com, no credentials, no referrer, no
  retry; `stop_reason` max_tokens and refusal, a missing text block and invalid JSON sorted into plain outcomes and
  never posted to verify), `showcase/guest-api.ts` (retrieve and verify, no import of the key module; a refused
  question's final answer is shown without calling Anthropic), `KeyPanel` (outside the question form), a mode switch
  and "Load search" on the Ask view. The 401 check of section 9 was made with an invalid key on 18 Nov 2026: the API
  answers 401 with `access-control-allow-origin: *` and a readable message, and the preflight allows our headers, so
  the page shows the API's own message; the "unreadable" text stays for organisations whose policy blocks browser
  calls and for blocking extensions. The browser call works only after 4.6c adds `https://api.anthropic.com` to
  `connect-src`; 4.6d tests the whole path.
  **4.6c built (18 Nov 2026), awaiting the owner's OK:** `connect-src 'self' https://api.anthropic.com` in the header
  and the meta tag (the sync test checks the directive in both, no third-party host in any other directive, no
  wildcard); the build guard is an allow-list (react, react-dom, scheduler and our code; checked against the build:
  exactly these three packages), the wallet list kept to name the reason. From the 4.6b review: only a value that
  starts with "sk-ant-" is accepted as a key (a plain message otherwise, nothing stored or sent), and a 401 forgets the
  key at once and shows the field again.
  **4.6d built (18 Nov 2026), awaiting the owner's OK:** `showcase/e2e/guest.spec.ts`, 8 tests on desktop and phone,
  api.anthropic.com mocked with `page.route` (no call leaves the machine): a full guest question answered and checked
  on our server (verified quote, unverified figure, "not measured" label); the key only in `x-api-key` of the one call
  to Anthropic and in no request to our origin (URL, headers, body); nothing in localStorage, sessionStorage, cookies
  or IndexedDB; the key gone after a reload and after "Forget my key"; only an "sk-ant-" value accepted; a refused
  question makes no Anthropic call; a 401 shows the API message, forgets the key and makes no verify call; a call
  without a readable answer shows the likely causes; an answer cut at max_tokens is not sent to verify; the CSP in
  header and meta allows exactly `'self' https://api.anthropic.com` and the browser blocks any other host. This
  commit is the one to pin for the public site.
- [ ] **4.9** Tunnel and private link, after a separate OK from the owner (precondition: the server runs as `homos-web`
  from `C:\HomosServe\homos`, not as the desktop user): Cloudflare Tunnel, static hosting choice,
  optional Access, kill switch documented in `inference/README.md`. S. Checklist: `SERVE_MODE=tunnel` and
  `SERVE_HOST=127.0.0.1` in `serve.env` (the server refuses tunnel mode on any other address); the start-up log shows
  "mode tunnel"; no "CF-Connecting-IP" warning in the log after the first visits; the log folder ACL limited to
  `homos-web`; the response headers of section 4.7 present on the public URL. Rocket Loader, automatic Web Analytics
  and email obfuscation off for the hostname, and the HTML served through the tunnel byte for byte equal to the built
  `showcase/public/index.html` (review of 17 Nov 2026; required before guest-key mode goes public).
  Precondition wording agreed on 18 Nov 2026 (least privilege, replaces "runs as homos-web from the clone"):
  `homos-web` (a plain local user, SID-based ACLs because the box's Windows is Polish) gets read-and-execute on
  `C:\HomosServe\homos`, read on `serve.env` and the switch file, modify only on `C:\HomosServe\logs` (no other user
  there), owns none of them, and has an explicit deny on `C:\Projects\homos` (its `.env` may hold wallet-era keys; the
  reranker runs from it as SYSTEM, unaffected). `npm ci` and the build run as the owner's account, never as
  `homos-web`; nothing at run time writes inside the clone. The server and tunnel tasks run as `homos-web` at startup,
  whether or not anyone is signed in, created in the Task Scheduler window (which grants "log on as a batch job");
  the owner types the password there and nowhere else. Before the tunnel: read-only checks of
  LimitBlankPasswordUse, Remote Desktop exposure and the firewall rules for 8790, 11434 and 11435.
  Found by CC-Win before A1 ran (18 Nov 2026): the default ACL of `C:\` gives Authenticated Users Modify on every
  top-level folder, so `homos-web` could have rewritten the code, `serve.env` and the owner's switch. Fix: inheritance
  cut at `C:\HomosServe` with an explicit ACL (SYSTEM, Administrators and the owner's account full, `homos-web`
  read-and-execute), `C:\HomosServe\logs` the only place `homos-web` may write, and a test that `homos-web` cannot
  write the switch file. The clone's `.env` holds only `SHOWCASE_WALLET_ADDRESS` (a public address read by the build,
  not by the server); the precondition is "no other variable there".
  Limits on the public server: the code defaults (per visitor 5 questions an hour and 20 a day, 200 a day for the
  site; loads 2 an hour and 6 a day per visitor, 30 for the site). CC-Win found the raised batch limits of step 4.8
  (100, 200, 1000) still in `serve.env` before the tunnel started, 18 Nov 2026; removed. Rule since then: a batch that
  needs raised limits raises them for its run and restores them in the same instruction.
  **4.9 live (18 Nov 2026), awaiting the owner's tick.** Public at the pin `a15762b` through a Cloudflare Tunnel
  (hostname kept out of the repo). Checklist: LAN probe of 8790 from the Mac fails (11435 answers as a control);
  `index.html` (939 B) and `app.js` (191 554 B) byte for byte equal to the build through the tunnel, so nothing is
  injected (Rocket Loader, email obfuscation and Web Analytics off); CSP, nosniff, no-referrer, permissions policy,
  COOP and CORP same-origin, X-Frame-Options DENY present; `/api/tags` and `/api/generate` answer our JSON 404,
  `/health` and other paths our plain-text 404 (Ollama and the reranker unreachable); start-up log "mode tunnel",
  no CF-Connecting-IP warning, visitors counted by hash; kill switch tested (task stopped: Cloudflare 530/1033 for
  every path; started: page back, equal hash). Tasks run as `homos-web` at startup; the batch logon right was granted
  with secedit because the tasks were registered from PowerShell. Operations in `inference/README.md` (ai-layer).
  Open: SSE through the tunnel needs the switch on (owner's call); "Always Use HTTPS" in Cloudflare (owner's call;
  plain http answers 200 today); a node exit is not restarted by Task Scheduler (wrapper or watchdog, later).

Steps 4.1 to 4.5 can be built while phase 3 holds the box (4.4b needs CC-Win on the box but not the GPU). 4.7, 4.8,
4.6 and 4.9 wait until the owner says phase 3 is finished.

## 8. Stage B, later (outline only)

- Paper trading on live data with virtual funds: `bot/paper.ts` restarted in a sandbox, read-only chain access,
  no wallet.
- Chat with read-only tools over current positions (same tool rules as step 2.1: own schema, size caps, results as
  data).
- Live data changes the risk: rate limits on chain reads, and positions shown with their timestamp.

## 9. Step 4.6 plan: guest-key mode (written 16 Nov 2026, not built)

**Goal.** A visitor who has an Anthropic API key can have a question answered by the cloud model instead of the local
one. Retrieval stays on our server with the local models; only generation moves, and it runs in the visitor's
browser with the visitor's key. The owner's key is never involved.

**Flow.**

1. The visitor pastes a key into a password field on the Ask tab and picks "Answer with my own key". The key goes
   into a variable of the page script and nowhere else (see "The key" below).
2. The browser sends the question, without the key, to `POST /api/guest/retrieve`. The server cleans the question,
   counts it against the visitor's limits, runs the same local retrieval as the chat (embedder and reranker on the
   box, through the GPU queue) and returns:
   - the ready request body for the Anthropic Messages API: model `claude-sonnet-5-5`, effort medium, the measured
     answer prompt (`ANSWER_SYSTEM`) and the user prompt with the 10 chunks, the JSON schema of the answer, and a
     `max_tokens` cap; built by the same function the cloud generator uses, so the browser cannot drift from the
     measured prompt;
   - the 10 sources (chunk id, file, lines, title) for the "Sources searched" list;
   - a ticket: an HMAC over the question, the chunk ids and an expiry of 10 minutes, signed with a secret drawn at
     server start and kept in memory.
3. The browser sends that body to `https://api.anthropic.com/v1/messages` with the key in `x-api-key`, the API
   version header, and `anthropic-dangerous-direct-browser-access: true` (plain `fetch`, no SDK in the bundle).
4. The browser posts the model's JSON answer and the ticket, without the key, to `POST /api/guest/verify`. The server
   checks the ticket, rebuilds the 10 chunks from the corpus by id, and runs the same verification as for the local
   engine: every quote against its chunk, every number with the three states, the fixed texts for "not in the data"
   and invalid output, masking. It returns the same response shape as `/api/ask`, so the page renders it with the same
   marks. The UI never shows the raw model answer, only what verification returns.

**What leaves our server for the browser in this mode.** The question as cleaned, the answer prompt (already public in
the repository), and the text of the 10 retrieved chunks with their ids, files, lines and titles, private network
addresses masked. That is the same text the local engine reads; the corpus is public in the repository already. The
chunks are masked before they are sent, and verification runs against the masked text the model actually saw, so a
quote of a masked line still verifies.

**What reaches our server.** The question (twice: retrieve and verify) and the model's answer JSON. Never the key, and
not the Anthropic response headers. The request log stores what it stores today (daily visitor hash, outcome, masked
question), plus the engine `guest-key`; the answer text is not logged.

**Does verification still run on our side?** Yes: `/api/guest/verify` is the only way the page turns a model answer
into a displayed answer. A visitor can of course forge the JSON they post, but they only change what they themselves
see; nothing is stored or shown to anyone else. The ticket stops `/verify` being used on chunks the server did not
hand out, and expires.

**The key.**

- Held in one module-level variable of the page script (not React state that dev tools persist, not a context
  provider), set from the password field, which is cleared at once.
- Never in localStorage, sessionStorage, IndexedDB, cookies, the URL or the history state; gone on reload, and a
  "Forget my key" button clears it at once.
- Sent only in the `x-api-key` header of the request to `api.anthropic.com`. Requests to our server are built by a
  separate function that has no access to the variable.
- The server refuses (400, nothing logged beyond the outcome) any request whose body or headers contain `sk-ant-`, so a
  pasted key in the question box is not logged either.
- The field is `type="password"` with `autocomplete="new-password"`, `spellcheck="false"`, `data-1p-ignore` and
  `data-lpignore="true"`, and is not inside a `<form>` element (review of 17 Nov 2026: `autocomplete="off"` is often
  ignored on password fields). Some password managers may still offer to save it; listed under residual risks.

**Content security policy.** `connect-src 'self' https://api.anthropic.com`: exactly one extra target, in both the
header and the meta tag (the sync test stays). Nothing else changes: no third-party script, style, font, image or
frame source.

**What the page says** (next to the key field, before the first use):

- "Your key is used from your browser to call Anthropic directly. It is never sent to this site's server, never
  stored, and forgotten when you reload the page."
- "Each question costs roughly 3 US cents on your account (Claude Sonnet 5.5 reading about 13,000 tokens of sources;
  measured on 34 test questions: 1.5 to 4.3 cents)."
- "Use a key you create for this, with a low spend limit on its workspace and a short expiry (Anthropic offers 3
  hours or 1 day), and delete it afterwards."
- Organisations with zero data retention or the Compliance API cannot call the API from a browser. Two cases are
  handled: when the 401 response is readable (CORS headers present), the page shows the API's own message; when the
  call fails without a readable response (fetch throws a TypeError, as it does when the API omits CORS headers on the
  error), the page shows a fixed text listing the likely causes (organisation policy, an invalid or expired key, a
  browser extension blocking the call). Which case the API produces is checked once with a deliberately invalid key in
  4.6b, without spending anything.
- How to check it yourself: "Open your browser's developer tools, Network tab, and ask a question: the request
  carrying your key goes only to api.anthropic.com; the requests to this site carry the question and the answer, not
  the key."

**Cost bound.** One API call per question; `max_tokens` capped at 2,048 (measured answers average 404 output tokens;
the cap is checked against the largest measured answer before it is fixed), which bounds a question at about 5 cents
at current prices. The guest path has the same per-visitor and global limits as the local chat.

**Measured or not.** The comparison measured Sonnet on the phase 1 retrieval (with the Sonnet query translation). The
guest mode uses Sonnet on the fully local retrieval, which was not measured. Step 4.6e runs the 34 golden questions
through exactly this path once (owner's key, about $1 for the answers plus the judge, owner's OK first) and the page
labels the guest engine with that result, or as "not measured" until then.

**Risks and what limits them.**

| Risk | Limit |
|---|---|
| A compromised bundle (a dependency or a tampered build) reads the key | The build guard already refuses wallet and signing packages; 4.6c turns it into an allow-list (react, react-dom, scheduler and our own code), so any new package in the showcase bundle fails the build. The CSP allows network calls only to our origin and `api.anthropic.com`, and no other image, frame, font or form target. |
| The same script sends the key to our own origin | Our server refuses and does not log requests containing `sk-ant-`; it keeps no request bodies. |
| The script navigates away with the key in the URL (`location`, `window.open`), which `connect-src` does not cover | Not stopped by CSP; the allow-list guard and the no-inline-script policy are what prevent such code from running. Stated as residual risk. |
| Cross-site scripting in our page | No `innerHTML` anywhere (Markdown renderer builds React elements), React escaping, CSP without inline scripts or eval. |
| Another site frames the page to capture the key | `frame-ancestors 'none'` and `X-Frame-Options: DENY`. |
| Browser extensions read the page | Outside our control; the page recommends a dedicated, short-lived, low-limit key. |
| Spending the visitor's key beyond one call | One call per click, no retries on our side, `max_tokens` cap, limits per visitor. |
| Prompt injection from a source chunk | No tools in the call; the answer is verified and shown as plain text. |
| `/api/guest/verify` abused as a free verifier | Ticket with HMAC and 10 minute expiry; per-visitor limits; no GPU work in verify. |
| `/api/guest/verify` run against chunks of a rebuilt index | The ticket carries the corpus hash; verify refuses a ticket whose hash differs from the served one. |
| A password manager offers to save the key | `new-password`, no form element and the managers' ignore attributes reduce it; not fully preventable. Residual risk, and one more reason for a short-lived key. |
| The tunnel injects scripts into the HTML (Rocket Loader, automatic Web Analytics, email obfuscation) | All three off for the hostname; 4.9 checks that the HTML served through the tunnel is byte for byte the built file, so an injection also fails the CSP check. |

**Tests (4.6d).** Playwright with `api.anthropic.com` mocked by `page.route`: a full guest question renders with marks;
no request to our origin contains the test key (all requests recorded); localStorage, sessionStorage, cookies and
IndexedDB hold nothing after a question; the key is gone after reload and after "Forget my key"; the 401 CORS message
is shown when readable, and the fixed causes text when the mocked call fails without a readable response; the CSP
header and meta allow exactly `'self' https://api.anthropic.com` in `connect-src`. Server unit tests:
tickets (forged, expired, other chunk ids, another corpus hash), `sk-ant-` refusal without logging, verify returns
the same shape as `/api/ask`.

**Guest mode and models on demand** (review of 17 Nov 2026, decided with 4.10a). Guest retrieval needs bge-m3 and the
reranker, not the generator. Per state of section 10: `off`, refused like the chat; `idle`, the guest presses "Load
search", an explicit action counted against the same load limits, which loads bge-m3 only; `search`, served;
`loading` or `unloading`, the guest waits; `ready`, served. The idle unload applies to the search state too.

**Step 4.6e, who runs it and where the key is** (review of 17 Nov 2026). The owner's key stays in the `.env` of the
main checkout only: never in this worktree, on the box or in the chat server's environment. CC-Mac runs a script from
the main checkout that calls `/api/guest/retrieve` and `/api/guest/verify` on the box server and Anthropic directly,
the same path as the browser. The per-visitor limit is raised for that run in the box's `serve.env` (as for the 4.8
batch) and restored afterwards. It loads bge-m3 on the box, so it needs the owner's word in the session that acts,
and the spend goes into the shared ledger.

## 10. Step 4.10 design: models on demand, owner switch (written 17 Nov 2026, not built)

**Why.** The models must not stay loaded for 24 hours. In 4.8 they held 24 010 of 24 576 MiB of VRAM and the
machine's commit memory rose from 45.0 to 53.2 GB over one series. The GPU is the owner's, and it is idle most of
the day.

**States.** One state machine in the server, shown to visitors and to the owner:

| State | Meaning | Visitor sees | GPU |
|---|---|---|---|
| `off` | owner switch off (or the pause file present) | "The assistant is offline"; saved answers, reports, wallet | nothing loaded; no visitor action touches it |
| `idle` | switch on, models not loaded | a "Load the local model" button and the typical load time | nothing loaded |
| `loading` | a load is running | staged progress: generator, embeddings, check, each with its elapsed time and its typical time | loading |
| `ready` | residency check passed | the question box, unlocked; "unloads after 15 minutes without questions" | generator, bge-m3, reranker |
| `unloading` | idle timeout or switch turned off | as `idle` (or `off`) once done | releasing |

**Loading.** Any visitor can start it from `idle`, once: concurrent clicks join the same load (single flight) and
follow its progress over one Server-Sent Events stream. The load is a job in the GPU queue, so it never overlaps a
question. Order as today (section 6): generator first with the served num_ctx, then bge-m3, then the residency check
(`/api/ps` lists both, the generator fully in VRAM with the served num_ctx, the reranker on CUDA). Typical stage
times are measured on the box in 4.10d and shipped as configuration; the page shows them, not a percentage. A failed
check unloads what was loaded and returns to `idle` with the reason in the server log; no automatic retry.

**Unloading.** No public unload control. The server unloads after **15 minutes without a question** (a visitor who
reads an answer and asks a follow-up stays within it; a reload costs the next visitor one load), and at once when the
owner turns the switch off. Unloading is explicit (`keep_alive: 0` for both models, generator first, then a check that
`/api/ps` is empty), not left to Ollama's timers, because the two models must not drift apart: a generator reloaded
on its own evicts bge-m3. The loads carry `keep_alive: 60m` as a safety ceiling, so that if the server dies the models
still unload within an hour. The reranker is a separate Python service that keeps its model on the GPU; it stays
resident in this design (its VRAM is measured in 4.10d); unloading it too needs load and unload endpoints in
`inference/`, which is CC-Mac's area, and is a later option.

**Queue, limits, start-up.**

- Questions are accepted only in `ready`; in any other state `/api/ask` answers at once with the state (503, no GPU
  work, the question given back to the visitor's limit).
- The per-question residency check stays; if it fails (Ollama restarted, a model evicted), the state drops to `idle`
  and the visitor sees the load button again. It no longer replays the load on its own: loading is always a visible
  action.
- Loads have their own limits: 2 per visitor per hour and 30 per day for the site, configurable; a load does not
  count against the question limits.
- The start-up check no longer requires loaded models: the server starts in `off` (or in `idle` if the switch file
  says on) and checks only what does not need the GPU: configuration, the corpus and index hashes, the wallet file,
  the reranker's `/health` and Ollama's `/api/version` and `/api/tags` (both models present on disk). The residency
  check moves to the end of `loading`.
- The switch state is a small file outside the repo (`SERVE_SWITCH_FILE`), default `off` when missing, so a restart
  never loads anything by itself. The pause file of section 6 stays as the box-side override and wins over the switch.

**Owner switch: two designs.** In both, the admin page can only turn the switch on or off and show the state (the
state machine, the queue length, what `/api/ps` reports for the two models and the reranker's `/health`); it runs no
shell command and has no other function. Every switch is appended to an admin log outside the repo (time, from, to,
who: the Access identity or "password").

*(a) Cloudflare Access in front of `/admin`.* An Access application on the public hostname, path `/admin*`, policy:
the owner's identity only (one-time PIN to the owner's e-mail or a Google login, set in the Cloudflare dashboard, not
in the repo). The server also verifies the `Cf-Access-Jwt-Assertion` header on every `/admin` request: RS256
signature against the team's published keys, audience tag and expiry, so a request that reaches the server without
going through Access is refused. Pros: no password or session code of ours; brute force and MFA handled at the edge;
nothing secret on the box except the audience tag. Cons: needs the tunnel (4.9), so it does not exist on the LAN
before that; the JWT check is security code we must get right and test.

*(b) Our own password login.* A long random password set by the owner on the box; only its scrypt hash (Node's
built-in `crypto.scrypt`, salt and cost in the file) in a file outside the repo readable by `homos-web` only. Login at
`POST /admin/login`: constant-time comparison; 5 attempts per 15 minutes per address and a lockout after 20 failures
in a day that only removing a file on the box lifts. Session: a random token in memory on the server, sent as a
cookie with `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/admin` and no expiry date (it dies with the browser
session), valid 30 minutes; every state-changing request also needs a matching token in the request body and a
same-origin `Origin` header, against cross-site requests. Pros: works on the LAN and before the tunnel; no outside
dependency. Cons: we own all of it (hashing, lockout, session, CSRF), more code to review, and a password the owner
must keep.

**Recommendation: (a)**, because it keeps authentication out of our code, adds MFA and handles brute force before a
request reaches the box, and the admin page is only needed once the site is public. Until the tunnel exists, the
switch is the switch file on the box, operated by CC-Win on the owner's word. If the owner wants the page on the LAN
before 4.9, (b) can be built as well, with the defaults above.

**A release that cannot be confirmed** (4.10b, review of 17 Nov 2026). When Ollama does not answer, or `/api/ps` still
lists a model after the release and a bounded wait, the state stays "unloading": "off" or "idle" would be a false
statement about the GPU. Visitors see "The local model is being released" and cannot start a load. The admin page
(4.10c) shows, in this state: "Release not confirmed", the reason it started (switch off, idle, failed or aborted
load, lost model), the last problem (for example "still listed by /api/ps after 15 s: qwen3.8:27b" or "Ollama did not
answer /api/ps"), the time of the last check and the seconds to the next one (`Models.releaseStatus()`), and what
`/api/ps` lists now. It offers no other action: if it persists, the owner (or CC-Win on his word) runs `ollama stop`
on the box or restarts Ollama.

**Commit memory.** 4.10d measures it at fixed points: before any load, after a load, after 20 questions, after the
idle unload, and after an hour idle with the server running; the unload ends the llama-server processes, so their
commit should return. The 8 GB rise of 4.8 is attributed to a process with these numbers.

**Steps.** 4.10a state machine, load and model endpoints, the visitor UI with staged progress, all with the fake
engine (fake stages with delays) and Playwright; 4.10b explicit unload, the idle timer, the 60-minute ceiling, start-up
without loaded models, tests with a fake Ollama; 4.10c the admin page with the chosen design; 4.10d on the box:
typical load times, VRAM per process (`nvidia-smi --query-compute-apps`), commit memory at the points above.

## 11. Later (owner's direction, 17 Nov 2026; no design, no code)

**Owner's decision of 18 Nov 2026 (relayed by the analysis session): order of work and the hosted paper copy.**

- *Order.* Finish everything started first, including the tunnel: 4.6b to 4.6e, 4.9, 4.10c, the merge to `main`.
  Then the hosted paper-trading copy.
- *Two separate sections on the site.* (1) **Archive**: the measurements from the period with real capital, with the
  chat; the project's conclusion is stated here. (2) **Live**: a demonstration only of how those measurements were
  made, running on a fixed virtual portfolio started at 10 000 USD per pool, for the pools the paper trading ran from
  the beginning; it draws no conclusion of its own and is labelled as a demonstration.
- *First version (size M).* The existing single strategy per pool, as a new thin page built from the wallet-free
  panels, without the cockpit, no wallet, no signing; basis: CC-Mac's reconnaissance `ai/PAPER-HOST-RECON.md` on
  `ai-layer` (e3513f9). It keeps the pair ranking (the selection gate that ranked pools by recent yield and
  backtested candidates), so a visitor sees by what rule the pools were chosen; the ranking panel is wallet-free and
  the selector needs `data/llama/`.
- *Pools.* The step 4.1b export holds six paper pools of 10 000 USD each, two pairs across chains and fee tiers:
  `mainnet-usdc-weth-005`, `mainnet-usdc-weth-030`, `arbitrum-weth-usdc-005`, `base-weth-usdc-030`,
  `base-cbbtc-weth-005`, `base-weth-cbbtc-030` (checked against the local export on 18 Nov 2026). The first version
  can start with the same six; the owner said "4 or 5" and confirms the list at design time.
- *Start dates matter.* Five pools opened on 18 Aug 2026, `base-weth-cbbtc-030` on 26 Aug 2026; that is why the two
  cbBTC pools end with very different holding values (13 998 against 11 066 USD), not the token order. Any
  side-by-side display shows each pool's start date.
- *Later version.* Two strategies on the same pair side by side: fees collected, estimated cost of rebalances, and
  the difference between each strategy and holding, to show what the project found (frequent rebalancing in a narrow
  range did not beat holding). The page shows what the simulation measures on its period, estimated values labelled
  as estimates; it promises no outcome in advance, in line with the standing wording that the strategy did not
  reliably beat holding and that nothing is investment advice.
- *How the pools were chosen, and what the first version copies* (owner, 18 Nov 2026). The paper simulation ran on
  the fixed list `BOT_POOLS` in `bot/config.ts` (10 000 USD per pool); range suggestion, rebalances and the trend exit
  and re-entry were automatic; the selector only proposed OPEN and ROTATE to the owner and never added a pool by
  itself. The first version copies that: the fixed six pools, with the ranking shown beside them as the reason for
  the choice. Later, with the two-strategy comparison and no design yet: pools enter the simulation from the ranking
  automatically and possibly the less profitable ones are closed; that needs a stated rule for "less profitable" and
  the switch cost counted, as the selector's rotation rule already does (the edge must cover 0.3% of capital within
  10 days).
- Still no design and no code.

The owner's goal beyond this phase: the original application as the main page, with a mock wallet and no signing; a
shared live paper-trading simulation on live prices (virtual 10 000 USD positions, wide and narrow ranges,
rebalances, fees, conversion losses); the chat as a linked subpage; later a chat that reads the live simulation state;
later a per-visitor virtual wallet kept in the browser. First step when this is picked up: reconnaissance of how deeply
the wallet libraries (wagmi, ConnectKit, viem and the signing hooks) are tied into the old UI in `src/`.

