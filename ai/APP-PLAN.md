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
- [x] **4.10** On-demand models with an owner switch (done 18 Nov 2026, all parts ticked by the owner) (section 10), design accepted 17 Nov 2026 with variant (a)
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
  **4.10c done (18 Nov 2026, owner's OK):** the admin page behind Cloudflare Access (application
  "showcase admin", paths `admin`, `admin/*`, `api/admin/*`, the owner's e-mail only, made in his dashboard).
  `ai/serve/access.ts` checks Cf-Access-Jwt-Assertion on every admin request with Node's crypto (8 KB cap, RS256, kid
  in the team JWKS fetched with timeout and size cap and refreshed at most every 5 min, fail closed without keys;
  signature, aud, iss, exp and nbf with 60 s leeway; e-mail trimmed and case-insensitive; no e-mail denied; team
  domain must be `*.cloudflareaccess.com`). `ai/serve/admin.ts`: the owner's switch file stays the read-only master;
  the page writes its own state file; models allowed only when both say on, and with the page configured a missing
  state file is off (fail-safe). One action, POST `/api/admin/switch` with JSON and a same-origin check; off releases
  the models at once; `admin.jsonl` records "owner", never the address; denials limited per visitor. The page is a
  second bundle in `showcase/admin-dist/` (gitignored), served under `/admin/` only after the check; no new package,
  the allow-list and CSP unchanged, `app.js` byte for byte unchanged. Unconfigured, `/admin` and `/api/admin` answer
  404. Tests: admin 52; Playwright adds 3 tests x 2 with a stand-in key endpoint that makes its key at start.
  After the review (18 Nov 2026): concurrent first JWKS fetch shared. Display fix asked by the owner the same day: the
  18 Aug report's 11 log lines stored as UTF-8 read as Windows-1250 ("majÄ…") are re-decoded in the showcase data only
  (`ai/serve/encoding.ts`; a line is changed only when it round-trips cleanly), with a note on that report; the corpus
  file keeps its bytes, and the other 36 reports are byte for byte unchanged (test).
  Admin page wording after the owner's first use: "Visitors may load the models: yes / no", "Allowed on the box",
  "Allowed from this page", a line that turning on only allows loading, and a clearly disabled button (683684d).
  Updating the serving clone (from 18 Nov 2026): clone and build in `C:\HomosServe\homos-next` at the pin, copy the
  gitignored `.env`, `data\showcase\wallet.json` and `ai\index\` (the served index and the tokenizer; missing from
  the first list, found by CC-Win), then stop the server task, swap the folders, start it; the page is
  down only for the swap, and the previous folder stays for a rollback.
  Supervisor for a node exit (owner, 18 Nov 2026): `ai/serve/supervise-cli.ts` runs the server as a child and starts it
  again after an exit, waiting 5 s, 15 s, 60 s, then 300 s (reset after 10 minutes of running), at most 10 restarts in
  any hour; one log line per exit; stopping it stops the server (signals forwarded; on the box the task's job object
  as well). The "HOMOS showcase server" task runs the supervisor instead of the server. Measured on the Mac: a killed
  server answers again after 6 s.
  Gap found on the first swap (CC-Win, 18 Nov 2026): a restart left Qwen and bge-m3 loaded in Ollama for up to an hour
  while the new server showed "idle". Since 149f492 the server releases, at start-up, any served model `/api/ps`
  lists, through the 4.10b release path ("unloading" until confirmed).
  Deployed at 149f492 by CC-Win (18 Nov 2026): a killed server answered again after 6.4 s, killed again after 16.3 s
  (the 15 s wait); killed with the models loaded, it released them at start-up and `ollama ps` was empty 7.5 s after
  the kill. Swap procedure: retry the folder rename a few times 2 s apart (a transient file handle failed the first
  rename once), and keep a rollback that does not depend on the task action. CI's showcase job now also runs the
  tests added in 4.6 and 4.10 (they were in `test:ai`, which CI does not run).
- [x] **4.6** Guest-key mode (done 18 Nov 2026, all five parts ticked by the owner). Details in section 9. M, in five parts:
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
  **4.6c done (18 Nov 2026, owner's OK):** `connect-src 'self' https://api.anthropic.com` in the header
  and the meta tag (the sync test checks the directive in both, no third-party host in any other directive, no
  wildcard); the build guard is an allow-list (react, react-dom, scheduler and our code; checked against the build:
  exactly these three packages), the wallet list kept to name the reason. From the 4.6b review: only a value that
  starts with "sk-ant-" is accepted as a key (a plain message otherwise, nothing stored or sent), and a 401 forgets the
  key at once and shows the field again.
  **4.6d done (18 Nov 2026, owner's OK):** `showcase/e2e/guest.spec.ts`, 8 tests on desktop and phone,
  api.anthropic.com mocked with `page.route` (no call leaves the machine): a full guest question answered and checked
  on our server (verified quote, unverified figure, "not measured" label); the key only in `x-api-key` of the one call
  to Anthropic and in no request to our origin (URL, headers, body); nothing in localStorage, sessionStorage, cookies
  or IndexedDB; the key gone after a reload and after "Forget my key"; only an "sk-ant-" value accepted; a refused
  question makes no Anthropic call; a 401 shows the API message, forgets the key and makes no verify call; a call
  without a readable answer shows the likely causes; an answer cut at max_tokens is not sent to verify; the CSP in
  header and meta allows exactly `'self' https://api.anthropic.com` and the browser blocks any other host. This
  commit is the one to pin for the public site.
  **4.6e prepared (18 Nov 2026):** `ai/serve/tools/guest-batch.mts`, self-contained (Node built-ins only) so CC-Mac
  runs it from the main checkout where the key is: one "Load search", then for each golden question
  `/api/guest/retrieve`, one Messages API call with the owner's key, `/api/guest/verify`, through the public address
  (`GUEST_BASE`, given by the owner in CC-Mac's conversation, never written down); no retry; stops on the first
  transport or API error; a model answer that cannot be checked is recorded as "failed". Output has no hostname and no
  key; `to-judge-input.mts --engine guest` converts it with the real usage and cost. Dry run against a mocked API:
  34 rows, 1.02 USD at 13 000 input and 400 output tokens a question.
  **4.6e done (18 Nov 2026, owner's tick):** run by CC-Mac through the public address, 34 of 34, 30 answered, 4 not in the data, 98
  quotes all verified, 1.0049 USD, median 5.3 s; judged 18 / 11 / 5 (0.5479 USD). The page labels the guest engine with
  this result. `ai/eval/results/2026-11-18-guest-run-4.6e.md`.
- [x] **4.9** Tunnel and private link (done 18 Nov 2026, owner's tick), after a separate OK from the owner (precondition: the server runs as `homos-web`
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
  **4.9 live (18 Nov 2026), ticked by the owner.** Public at the pin `a15762b` through a Cloudflare Tunnel
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
  Same day: SSE through the tunnel checked with the switch on for one load (pin `a15762b`): load events at +0.1 s,
  +21.8 s and +24.4 s, then the result; a question's retrieving at +0.0 s, generating at +1.6 s, result at +11.4 s;
  so Cloudflare does not buffer the stream. Switch back off, models released in 0.9 s. "Always Use HTTPS" turned on
  by the owner: http answers 301, the page hash unchanged.

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

## 10c. Step 4.10e: the reranker on demand (done 18 Nov 2026)

Owner's requirement of 18 Nov: nothing of the project in VRAM while nobody uses the site, the reranker included, and
nothing started at boot. Plan agreed with CC-Mac and reviewed by the analysis session. Built:
`ai/serve/reranker-process.ts`: with `SERVE_RERANKER=child` the chat server starts the reranker as a child process
(`python -m uvicorn app:app --host 127.0.0.1 --port 11436` in `inference/reranker` of the pinned clone, a venv with CUDA
torch, HF offline) as the FIRST stage of any load from idle (the VRAM order every measurement used: reranker resident
before the generator); the stage waits for `/health` with device cuda, or fails loudly (CPU torch, an out-of-memory exit
with its log line, no answer in 90 s). Every release ends the whole process tree by pid and is confirmed by the pid
leaving `nvidia-smi --query-compute-apps`; a pid file lets a restarted server end a leftover after checking the
command line is ours. The start-up check asks only for the reranker's files; the box probe stops asking a reranker; the
admin page shows, read only, when another Python process holds the GPU (the evaluation instance on 11435, whose boot
trigger goes in the same deploy; CC-Mac's Mac pre-flight, 21c7f07 on ai-layer, catches a run started while it is off).
`ai/serve/tools/rerank-time.mts` measures one rerank call on the GPU and on the CPU (option c). Default stays
`external`, so the box is unchanged until its `serve.env` says `child`. After the review (18 Nov 2026): on Windows the
venv's `Scripts\python.exe` is a launcher whose child holds the CUDA context, so the server tracks the spawned pid and
its descendants (the pid file holds the set), confirms a release only when none of them is alive or listed by
nvidia-smi, and counts any of them as ours on the admin page; the child gets an allow-list of environment variables;
its log is capped at 5 MB. **Deployed and measured (18 Nov 2026, `e3f6e80`), ticked by the owner:** idle VRAM 1 218 MiB (was
4 177 with the boot-time reranker), equal after a release; full load 23 972 MiB with both models 100% GPU; reranker
16.0 s cold, 11.2 s warm; the interpreter (a child of the venv launcher) holds the CUDA context and is in the tracked
set; CPU reranking 41 s a question (rejected). `ai/eval/results/2026-11-18-reranker-on-demand-4.10e.md`.

## 10b. Merge of app-chat into main (merged 18 Nov 2026)

**Merged** on the owner's word: `7846549` on `main` (from `a845c64`, app-chat up to `8c8c7f1`), the same tree as the
dry run whose pull request #1 (draft, closed without merging) passed CI run 44298471773; CI on `main` after the merge:
run 44299150330, success. The preparation below is kept as the record.

Dry run on the scratch branch `merge-dry-run` (worktree `HOMOS-merge-dry`, from `origin/main` at `a845c64`), merged
with `app-chat` up to `52503a8`. Four conflicts, resolved as follows; the real merge repeats them:

| File | Resolution |
|---|---|
| `ai/eval/results/2026-11-16-judged-phase3-golden-v1-4.json` and the `.jsonl` beside it | main's version: a superset (272 items, runs pb1, pb2 and the step 3.4 runs); the 68 pb1 and pb2 items are identical on both sides, and the comparison export reads only those two runs |
| `package.json` | `test:ai` is the union (main's list plus the 14 app-chat tests; `ai/agent/model-ollama.test.ts` from main kept); scripts: main's `ai:agent:*` plus app-chat's `showcase:*` and `serve:chat` |
| `ai/DECISIONS.md` | the two tails kept whole, phase 3 entries first, then phase 4; no shared heading |

`ai/answer/local.ts` merged automatically: the `signal` parameter of step 4.7 is still on `Generator.generate`,
`answerWithChecks`, `LocalGenerator.generate` and `chat` (8 uses, as on app-chat), next to phase 3's new options
(think levels, template overhead, overcount tolerance, stripped trailing tokens).

Checks on the merge result, run locally with the CI steps: lint, typecheck, `test:math` (2925), `backtest:validate`,
build, `test:ai` (all suites), `showcase:build`, Playwright 63 passed and 1 skipped. Against main: 103 files changed,
22 352 lines added, 11 removed.

What main will contain after the merge, beyond phase 3: the chat server `ai/serve/` (local engine with models on
demand and the supervisor, guest-key mode, the admin page behind Cloudflare Access, rate limits, request log, security
headers), the showcase front end `showcase/` (Ask with local and guest modes, Compare, Daily reports, Wallet, the
admin page bundle), their tests and the Playwright suite, the CI job "showcase", `ai/APP-PLAN.md` and the phase 4
results in `ai/eval/results/`. Not in main: `ai-layer`'s 10 commits after the phase 3 merge (they go with the next
ai-layer merge), anything gitignored (the index, the wallet export, `data/`).

Open before the real merge: CI on GitHub for the merge result (the workflow runs on pushes to main and app-chat and on
pull requests; a draft pull request from `merge-dry-run` would run it without merging; it is public, so the owner's
word first), and the owner's yes at the moment of the merge.

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
- *Visitors' questions on the admin page* (owner, 18 Nov 2026, later, no design yet): a read-only view of the most
  recent questions from the existing request log (30 days, masked, no IP), with outcome and engine, behind the same
  Access check; no visitor hash shown, no download, and the page's text about logging stays true.
- Still no design and no code.

The owner's goal beyond this phase: the original application as the main page, with a mock wallet and no signing; a
shared live paper-trading simulation on live prices (virtual 10 000 USD positions, wide and narrow ranges,
rebalances, fees, conversion losses); the chat as a linked subpage; later a chat that reads the live simulation state;
later a per-visitor virtual wallet kept in the browser. First step when this is picked up: reconnaissance of how deeply
the wallet libraries (wagmi, ConnectKit, viem and the signing hooks) are tied into the old UI in `src/`.

## 12. Phase 5: the hosted paper-trading copy, inventory and plan (written 25 Nov 2026, no code)

**Change of direction (owner, 25 Nov 2026).** The demo stays faithful to the interface of the original application;
the default is the original screens with the wallet parts removed or replaced by fixed or simulated data, not a new
thin page (section 11 and `ai/PAPER-HOST-RECON.md` had recommended the thin page). The inventory below lists every
screen, panel, chart, table and control of the original app as it stands in `src/` (36 files, the whole UI is one
page, `MorningCockpit.tsx`), plus the screens removed in August and the ones planned but never built, so the owner sees
the full list and picks.

Verdicts: **A** works as is without a wallet; **B** works with fixed or simulated data (which is said); **C** needs a
wallet or signing, left out or shown disabled; **D** not worth showing (why is said). Size: S under a day, M a few
days, L a week or more. **18 Nov** marks what the decisions of 18 Nov already include (section 11).

### 12.1 Inventory

**Header (App.tsx)**

| Item | What it shows, where | Data | Verdict | Size | 18 Nov |
|---|---|---|---|---|---|
| Title "HOMOS / Uniswap v3 liquidity cockpit" | top left | none | B: the neutral title of the showcase, never "HOMOS" | S | |
| Bot status dot | top right, also in the cockpit | the observer's heartbeat (`/api/state` age) | A: the paper observer's freshness | S | |
| Compact wallet balances per network | top right | the connected wallet (`useBalance` on three chains) | C: replaced by a "paper mode, no wallet" badge | S | |
| Connect wallet button (ConnectKit) | top right | wallet | C: left out | S | |
| Bot connection settings (⚙: API address, token) | cockpit header | browser storage | D: operator setting; the public page talks to its own server only | S | |

**Financial summary (top of the cockpit)**

| Item | What it shows, where | Data | Verdict | Size | 18 Nov |
|---|---|---|---|---|---|
| Total value (whole wallet, all chains) | first stat | wallet balances and positions | B: total of the virtual portfolio (6 x 10 000 USD start) | S | |
| Positions in range X/Y | second stat | wallet positions | B: paper positions in range | S | |
| Fees to collect | third stat | wallet positions | B: paper fees accrued, labelled as an estimate | S | |
| Hedge-open note (from this browser) | under the stats | browser storage | D: a fallback for a real GMX short; no real hedge in the demo | S | |

**Proposals and emergency procedure**

| Item | What it shows, where | Data | Verdict | Size | 18 Nov |
|---|---|---|---|---|---|
| Emergency procedure (A hedge / B exit side by side) | above the proposals | observer proposals for real positions in a downtrend | B: only if the demo derives proposals for paper pools (new code); otherwise D | M | |
| Proposal card REBALANCE (new range, cost, payback days) | "Bot proposals" | observer (advisor) for real positions | B: content read-only from the paper decision log (new code); buttons C | M | |
| Proposal card OPEN (from the daily ranking) | same | selector | A for the text when the selector runs; button C | S | |
| Proposal card ROTATE (break-even days of the switch) | same | selector, from a real position to a better pool | B: only with proposals derived for paper pools (new code); without a wallet the selector has no position to rotate; buttons C | M | |
| Proposal card EXIT_TREND (trend safety switch) | same | observer, real positions | B as REBALANCE; button C | M | |
| Proposal card HEDGE (size of the GMX short) | same | observer, real positions | B as REBALANCE; button C | M | |
| Proposal cards FLAT_NARROW and FLAT_WIDEN (FlatWide cycle) | same | observer, product pools | B as REBALANCE; buttons C | M | |
| Approve, Modify, Open, Close, Approve hedge buttons | on every card | signing hooks | C: left out (or shown disabled with "the demo signs nothing") | S | |
| Dismiss proposal | on every card | `POST /api/proposals/:id/dismiss` (the only write route) | D: guests read only; not routed | S | |
| "Bot offline", "data stale" notes | under the title | observer status | A | S | |

**Real capital (tranche and wallet positions)**

| Item | What it shows, where | Data | Verdict | Size | 18 Nov |
|---|---|---|---|---|---|
| Tranche balance bar (deposited, total today, difference; split into market move and entry costs) | "Positions, actions" | observer, the real tranche | D for "Live": real capital belongs to "Archive" (the Wallet tab shows it sanitized) | S | |
| Real positions summary (total equity, PnL since start, vs HODL 50/50) | above the cards | wallet positions and their history | D for "Live": duplicate of the paper header; Archive has the real figures | S | |
| Status legend (in range, out of range, rebalance due, not worth it) | above the cards | none | A | S | |
| Real LP position card: status and advice icons, value, cycle line, out-of-range badge and timer, range bar, stats bar, equity vs HODL sparkline, price vs band chart | position cards | wallet NFTs, `/api/positions-history` | D for "Live" (the same visuals exist per paper pool, below); real cards in Archive | M | |
| GMX short card (size, entry, collateral, PnL, sparkline, "Close short") | position cards | observer GMX read | D: real hedge only; C for its button | S | |
| Position menu ⋮: Collect fees, Close, Manual rebalance | each real card | signing hooks | C | S | |
| Close modal (percentage slider, slippage, amounts), Rebalance modal (custom range, token approvals) | modals | signing hooks | C | M | |
| Rebalance, Rotate and Hedge sequence modals (multi-step signing) | modals | signing hooks | C | M | |
| Closed positions panel with CSV export (tax) | bottom section | `/api/closed-positions`, `/api/ledger.csv` (the real wallet's ledger) | D for "Live": personal ledger; Archive covers the period | S | |
| Transaction history (not mounted) | none | browser storage | D: retired in August | S | |

**Paper trading panel (PaperTradingPanel.tsx, PositionCharts.tsx)**

| Item | What it shows, where | Data | Verdict | Size | 18 Nov |
|---|---|---|---|---|---|
| Paper total header: total equity, PnL since start, vs HODL 50/50 | top of the panel | `/api/paper` (paper ledger) | A | S | yes |
| Status legend | under the header | none | A | S | yes |
| Per-pool card: status icon, pool, trend-down badge (price below EMA) | one card per pool | paper state, observer | A | S | yes |
| Out-of-range timer with the 24 h hysteresis and the payback condition | per-pool card | paper state | A | S | yes |
| Stats bar: PnL since start, vs HODL, fees reinvested, fees accrued, costs, rebalances | per-pool card | paper ledger | A; fees labelled as an estimate (paper rescales pool fee yield, no per-swap replay) | S | yes |
| Hedge line (short size, entry, funding, PnL) | per-pool card, when the paper strategy hedges | paper ledger | A | S | yes |
| Equity vs HODL sparkline with events | per-pool card | paper history | A | S | yes |
| Price vs band chart with rebalance and exit events | per-pool card | paper history | A | S | yes |
| Recent events (opens, rebalances, exits, with costs) | bottom of the panel | paper events | A: the rebalance history and its estimated cost | S | yes |
| Start date per pool | not shown today | paper state | B: added (18 Nov decision: start dates shown) | S | yes |

**Bot telemetry and observation analysis (collapsed sections)**

| Item | What it shows, where | Data | Verdict | Size | 18 Nov |
|---|---|---|---|---|---|
| Pools table: USD price, tick, volatility %/d, fee yield %/d, suggested range, data age, advisor and cycle column | "Bot telemetry" | observer state | A | S | |
| Positions watched by the bot | same | observer, real positions | D: empty without a watch address | S | |
| Raw state.json modal | same | observer state | D: debugging view | S | |
| Flat badge and clock per pool (flat confirmed after 12 h) | "Observation analysis" | `/api/history` | A | S | yes |
| 72 h history per pool (price, volatility, fee yield, range, EMA gap) | same | `/api/history` | A | S | yes |
| "Algorithm vs fresh data (hybrid walk-forward, 720 d)": mean, win rate, worst per strategy | same | `/api/results/:name` (backtest result files) | B: the result files of the period, fixed, with their date | S | yes |

**Pair ranking (TopRankingPanel.tsx, two variants)**

| Item | What it shows, where | Data | Verdict | Size | 18 Nov |
|---|---|---|---|---|---|
| Daily ranking TOP 10: rank, pair, APY 7 d, streak, TVL, eligible rows highlighted, criteria line | "Daily ranking" | `bot/selector.ts` daily from `data/llama/` (DefiLlama history) | A if the daily DefiLlama fetch and the selector run; B with the period's last ranking, dated | M | yes |
| Wide ranking: class, score %/yr, fee wide, drag, σ/yr, streak, TVL | second ranking | nightly `scripts/wide-score.ts` | same as above | M | yes |
| Wide-band daily model 365 d and 720 d vs HODL, flat share | columns of both rankings | nightly `scripts/wide-daily.ts` | same as above | M | yes |
| "Full run" column: the backtest engine's verdict per pool (the gate) | columns of both rankings | `scripts/wide-collect.ts` (swap history fetch plus walk-forward, heavy) | B: the period's results, fixed and dated; a live run is L | S (fixed) / L (live) | yes |
| Candidate status PASS / FAIL / QUEUED (the selection gate) | status column | `bot/candidates.ts` seed plus nightly verdicts | A with the seed and the period's verdicts | S | yes |

**Removed in August 2026 or planned and never built (from `docs/UI-DESIGN.md`)**

| Item | Status | Verdict | Size |
|---|---|---|---|
| Pool browser, manual Add Liquidity, My Positions, Top Pools | removed 21 Aug, replaced by the cockpit | D: superseded; the ranking shows the pools | M |
| Profit forecast panel (v1.2 strategies) | removed; described strategies the product no longer played | D: would mislead | M |
| Autopilot settings: OBSERVE / PROPOSE / AUTO per pool, limits, kill-switch | planned, never built | D: never existed; at most a note in "Archive" | L |
| 08:00 news and risk-posture task | planned, never built | D | M |
| SQLite ledger with PLN conversion for tax | planned, never built | D: personal tax data | M |
| Telegram alerts (depeg, bot failure, price move, failed transaction) | built, bot side, no UI | D: personal channel; B only as an "alerts the bot would have sent" list (new) | M |
| 07:30 morning report | built, bot side; the 37 reports are in "Archive" | B: a daily demo report from the paper state (new) | M |
| Wide against narrow strategies on one pair | not built (paper runs one strategy) | later (owner, 18 Nov) | L |

### 12.2 Plan: first version of "Live"

**Fixed decisions.** Two sections: "Archive" (the real-capital measurements and the chat, where the conclusion is
stated) and "Live" (a demonstration only, labelled so, drawing no conclusion of its own). Live: the six paper pools,
10 000 USD of virtual capital each, one strategy per pool (the existing `bot/paper.ts`), start dates shown, the pair
ranking shown as the reason for the choice. Later, not in the first version: two strategies side by side, automatic
entry from the ranking under the project's own profitability rule, the visitors' questions view. The page makes
visible that holding beat the strategy (the "vs HODL 50/50" figure at the top of the paper panel, and in Archive the
stated result) and gives no investment advice.

**Proposed first version.** The original cockpit's layout and look, in its original order: header with the status dot
and a "paper mode" badge; the financial summary from the paper portfolio (B); the paper trading panel (A); the
status legend; bot telemetry (A, without the watched positions and the raw JSON); observation analysis (A, the
walk-forward table from the period's result files); both rankings with the gate columns (A for the daily DefiLlama
ranking, B for the full-run column). Left out: everything C, the real-capital items (in Archive), the proposal cards
(later, step 5.7). No original component that imports a signing hook is part of the build.

**How it is built.** A second entry of the showcase build (like the admin page) that mounts the original wallet-free
components from `src/` (`PaperTradingPanel`, `PositionCharts`, `BotTelemetry`, `ObservationAnalysis`,
`TopRankingPanel`, `CycleLine`, `BotStatusDot`, `ExpandableSection`) inside a new cockpit shell that copies
`MorningCockpit`'s layout and CSS without its signing imports. The build guard stays an allow-list: `viem` is not
allowed, so the three files that use `formatUnits` and viem types get a local helper and type-only imports.
`useBotApi` gets a read-only variant (no dismiss, no ledger, no settings, same origin).

**Where the "no wallet library" line runs** (review of 25 Nov 2026; an explicit choice for the owner, question 9). The
browser bundle keeps the allow-list of step 4.6c: no `viem`, no wallet or signing package. The server-side observer
needs a chain-read library to read `slot0` and `Swap` logs, so it runs with `viem`'s public client only: no account,
no private key, no wallet client. A test of the Live process's code path fails if `createWalletClient`,
`privateKeyToAccount`, `mnemonicToAccount` or a wallet module is reachable from the observer's entry, and the process
refuses to start if its environment holds a key-like variable (`PRIVATE_KEY`, `MNEMONIC`, `BOT_WATCH_ADDRESS`, a
`TG_TOKEN`, `HYPERSYNC_BEARER_TOKEN`, `ENVIO_API_TOKEN`), the same way the chat server refuses `ANTHROPIC_API_KEY`.

**The bot server in read-only mode** (review of 25 Nov 2026). Today `bot/server.ts` sends `Access-Control-Allow-Origin:
*` with GET and POST, serves `public/` with `express.static`, and passes `.bot/state.json` through as it is. In the
read-only mode for "Live": no static folder, no CORS header at all (the chat server is the only client, on
127.0.0.1), only GET is routed and every other method and path answers 404 before any handler. Responses are built
from an allow-list of fields, not the files: `/api/state` without RPC addresses (a paid key would sit in the URL),
without a watch address, local paths or proposals (unless step 5.7 is chosen); the same for `/api/paper` and
`/api/history`; `/api/results/:name` accepts only names from a fixed list, with no path characters. A test asserts that
no public response contains "http", a 40-hex-character `0x` address other than the listed pool and token contracts,
or a drive or home path.

**Outbound hosts** (review of 25 Nov 2026; a fixed list the owner approves at CC-Win). From `bot/config.ts`,
`src/utils/advisor.ts` and the DefiLlama fetch: the public RPCs `eth.drpc.org`, `base.drpc.org`, `arbitrum.drpc.org`,
`ethereum-rpc.publicnode.com`, `base-rpc.publicnode.com`, `arbitrum-one-rpc.publicnode.com`, `eth.llamarpc.com`,
`base.llamarpc.com`, `1rpc.io`, `yields.llama.fi` for the daily ranking, and `coins.llama.fi` (token prices for the
WIDE ranking and the daily model; found in 5.5, 25 Nov). Nothing else (no Telegram, no HyperSync,
no wallet relay). When a host fails, the observer keeps the last value, marks its data age (the telemetry table's
"Data age" column and the status dot), tries the next fallback RPC on the next cycle, and never retries in a tight
loop (the next attempt is the next 60 s or 15 min cycle); the page shows stale data as stale.

**Steps** (each small enough to review alone; box steps need the owner's word at CC-Win):

- [x] **5.0** Owner's choices on the open questions below (25 Nov 2026, "zgoda na rekomendacje", relayed by the
  analysis session): fresh start at go-live with the fixed notice, the warm start (replay) as its own step after
  go-live, the old files rejected; the server-side read library as recommended (question 9); proposal cards (5.7) and
  the daily demo report after go-live; public RPCs first; the daily ranking live and the full-run column fixed and
  dated; real-capital panels only in Archive; hosting on the box beside the chat server; the original cockpit CSS
  scoped to Live. Not yet approved, asked at CC-Win when step 5.6 comes: the outbound host list and everything on the
  box.
- [ ] NEXT **5.1** Paper observer on the Mac, read only: `bot/observer.ts` with no watch address, state in a folder outside the
  repo, public RPCs; one day of running to measure the RPC load and the gaps; `bot/server.ts` in a public read-only
  mode (an allow-list of GET routes, no CORS wildcard, bound to 127.0.0.1, no dismiss, ledger or positions routes),
  with tests. S to M.
  Review notes of 25 Nov (analysis session), done in 5.1: the DefiLlama history follows the state folder in Live
  mode (`BOT_LLAMA_DIR`, default `<state>/llama`; default outside Live unchanged: `data/llama`), so a redeploy of the
  clone does not delete it; the two ranking routes build rows from a field allow-list (the page keys rows by rank and
  symbol, no address field is used). Live writes nothing else inside the clone: every file the observer, the paper
  step and the selector write is under the state folder (checked by grep of the write calls).
  The measurement run on the Mac (owner, 25 Nov): the Mac does not stay on for a day, so the run counts for whatever
  length it reaches; the report separates gaps from sleep from gaps from hosts. A few hours answer 5.1's questions
  (calls per host and hour, failure share per host, which pools open, whether Arbitrum 0.05% opens on public hosts).
  The full-day and multi-day measurement moves to 5.6 on the box. The paper positions opened on the Mac are
  throwaway; the fresh start is at go-live.
- [ ] **5.2** (built and reviewed by the analysis session; owner's tick pending) The chat server forwards `/live/api/*` to the bot server on 127.0.0.1 (the allow-list again, timeouts, no
  write method), so the page stays same-origin and the CSP unchanged. S.
  From the 5.1 review: a short response cache in front of the bot API (30 s per route and `hours` value, a few allowed
  `hours` values instead of any number), a response size cap, and the chat server's rate limit on `/live/api/*`; the
  5.2 report gives the worst-case response size (today `readNdjson` reads the whole file on every request).
  Built 25 Nov (`ai/serve/live-proxy.ts`, `SERVE_LIVE_BOT_URL`): routes and GET only, `hours` 24, 72 or 168 (anything
  else becomes 72), cache 30 s per key with one upstream fetch per key, cap 4 MB, timeout 8 s, fixed 502/503 bodies,
  its own rate limiter (600 per visitor per hour, 5 000 per day, 200 000 site-wide), the bot URL loopback only.
  Worst-case responses at 168 h, estimated from the row formats: paper 1.04 MB (4 032 history rows and 500 events),
  history 0.69 MB; both under the cap, the bot API's own limit (30 days, 20 000 rows) is never reached through it.
- [ ] **5.3** (built and reviewed by the analysis session; owner's tick pending) The "Live" page: the second entry, the cockpit shell, the paper summary (B), the paper panel with start
  dates, the legend, the "Archive / Live" switch on both pages, the demonstration notice; guard and viem helper;
  Playwright with a fixture bot API. M.
  First cut 25 Nov (`showcase/live/`, served at `/live/`): the cockpit shell, the summary turned to the virtual
  portfolio, the original `PaperTradingPanel` unchanged, the demonstration notice and, with `SHOWCASE_LIVE_PREVIEW=1`,
  a throwaway-preview notice; the original CSS copied at build time to `/live/cockpit.css`. Guard: the bundle holds
  react, react-dom and scheduler only; `src/utils/formatters` (viem) is swapped for `showcase/live/formatters.ts`; the
  guard test allows `showcase/live/` exactly two src modules plus `useBotApi` for types, and pins what those import.
  Completed 25 Nov: the Archive/Live switch on the archive page; `showcase/e2e/live.spec.ts` (desktop and phone)
  against a stand-in bot (`showcase/e2e/live-fixture-bot.ts`, fresh timestamps, bait values) behind the real
  read-only API and the real forward: notice, summary 3/6 and fees, six cards, events, no address, URL or local path
  on the page, no form, only same-origin GETs, no horizontal scroll, the switch both ways, the bot API down, writes
  and unknown routes refused. Review fix to 5.2: result names from a fixed list (pinned to the bot API's list by a
  test), so the cache keys are finite; errors cached 5 s instead of 30 s.
  Review of 4db0255: the Live build also pins our own modules (`LIVE_OWN_SOURCES` in showcase/guard.js, enforced by
  NoWalletPlugin; a value import of `src/hooks/useBotApi` fails the build); the archive page shows the Live link only
  when /api/health says `live: true`, and without SERVE_LIVE_BOT_URL `/live`, its page and its API are the plain 404,
  so an archive deploy before 5.6 looks as it did. Both cases are in live.spec.ts.
- [ ] **5.4** (built and reviewed by the analysis session; owner's tick pending) Telemetry and observation analysis on the page, read only; the walk-forward table from the period's result
  files, dated. S.
  Built 25 Nov: the original `BotTelemetry` and `ObservationAnalysis` on the Live page, read only (base `/live`, no
  token); a fixed caption dates the walk-forward tables (research period, 720 days, 30-day steps, computed 22.09.2026).
  Correction: the page asks for `walkforward-<pool>-720d-30d.json` (WALKFORWARD_NAME_SUFFIX), not `365d-45d` as the
  comment in bot/server.ts says; RESULT_NAMES and the forward's list are fixed and pinned to the page's constant. Five
  of six exist (main checkout, backtest/results, 22 Sep 2026); WETH/cbBTC 0.30% on Base exists only as the candidate run
  `walkforward-cand-base-weth-cbbtc-030-720d-30d.json`, so the caption says so instead of "no results".
  Display items from the analysis session (owner's answers of 25 Nov): network on cards and events, start date per card,
  value range under the equity chart (optional props of PaperTradingPanel and Sparkline; without them the original
  renders as before, proven by `showcase/live/panel.test.tsx` against a snapshot taken before the change); in the
  original too: the pending pool's own text and en-US for the two amounts that used the browser's locale.
- [ ] **5.5** (built and reviewed by the analysis session; owner's tick pending) Both rankings with the gate columns: the daily ranking live (DefiLlama fetch plus the selector, daily), the
  wide ranking and daily model nightly (light steps of the pipeline), the full-run column and candidate verdicts fixed
  from the period and dated. M.
  Built 25 Nov: both `TopRankingPanel` variants on the Live page, unchanged in src/, fed read-only from
  `/live/api/{ranking,wide-ranking,wide-daily,wide-backtests,candidates}` (30-minute poll). Nightly steps in
  `bot/live-nightly.ts`, run by `bot/live.ts` once a day after 05:00 local: fetch-llama-history, wide-score, wide-daily,
  as child processes with the checked environment, outcome in `<state>/nightly-state.json`; on a cold start the
  DefiLlama fetch runs before the observer, because the selector skips the whole day without it. The scripts gained
  `BOT_DATA_DIR` and `BOT_LLAMA_DIR` (defaults unchanged) and `path.resolve` for an absolute state folder. Measured on
  the Mac: wide-score 4 s, wide-daily 22 s, fetch 512 s. Fixed and dated on the page: candidate verdicts (seed list,
  17 and 19 Aug 2026); the full-run file (`wide-backtests.json`, written by wide-collect) was not found on the Mac,
  so the column stays empty. Open for 5.6: whether the old box still holds it. Each Live section now renders inside
  an error boundary, so one malformed data file fails only its own section (tested).
  Review follow-ups (25 Nov): at most 3 nightly attempts a day, at least an hour apart (`nightlyDue`, tested); after
  that the previous day's data stays, and the ranking shows its own day. Each explanation now sits inside the section
  it explains (optional `footer` prop on BotTelemetry, ObservationAnalysis and TopRankingPanel), left-aligned. The
  365d/720d legend says what the three numbers are (wide band as LP / HODL 50/50 / difference, percent of the
  starting capital over the window ending today, from scripts/wide-daily.ts). The empty "full run" column is left out
  on Live (`hideFullRun`) until its file exists; whether to fetch it from the old box is the owner's decision.
- **5.6** On the box: the observer and the bot server as tasks under `homos-web` with the supervisor, state folder,
  RPC settings, the daily and nightly steps; measured; then public on the owner's word. M.
  From the 5.1 review: if a paid RPC key arrives through `RPC_MAINNET`, `RPC_BASE` or `RPC_ARBITRUM`, no log line may
  carry the URL. Checked on the Mac: the observer's `log()` and the advisor's warning printed no URL in the smoke run
  and in the first hours of the one-day run, but a viem error that ends a fallback (all hosts failed) can carry
  "URL: ..." in its message; 5.6 adds a URL scrub to `log()` in Live mode and a test, and states it in the box notes.
  The full-day and multi-day measurement of RPC load and gaps runs here, on the box (moved from 5.1, 25 Nov).
  Walk-forward files for the box: copy the five `-720d-30d` files from the owner's Mac (main checkout,
  backtest/results; not in git by the owner's choice of step 2.1) to the box's results folder outside the clone
  (`BOT_RESULTS_DIR`), keeping their dates (`cp -p` or equivalent).
- **5.7** (optional, after 5.6) Read-only proposal cards derived from the paper decision log (REBALANCE, EXIT_TREND,
  FLAT_*), no buttons. M.
- Later: wide against narrow on one pair (new paper strategies, L), automatic entry from the ranking under the
  rotation rule (edge covers 0.3 % of capital within 10 days), the visitors' questions view, a daily demo report.

**What runs on the box for "Live".**

| Process | How often | Reads from outside | State | After a restart |
|---|---|---|---|---|
| Paper observer (`bot/observer.ts`, no watch address) | prices every 60 s, statistics and the paper step every 15 min | `slot0` and 24 h of `Swap` logs per pool on mainnet, Base, Arbitrum (public RPCs, or a paid key kept server side) | `C:\HomosServe\live-state\` (paper state, events, history; outside the clone; `homos-web` Modify) | resumes from the state files; paper positions and their start dates persist |
| Bot server (`bot/server.ts`, read-only mode) | on request | none | reads the state folder | stateless |
| Selector (inside the observer, daily) | once a day after 08:00 | `data/llama/` | the ranking file in the state folder | the last ranking stays until the next run |
| Daily DefiLlama fetch and the light nightly steps (wide-score, wide-daily) | daily | DefiLlama HTTP | `data/llama/` and the state folder | resumable (the pipeline already is) |

They sit beside the chat server under `homos-web`, CPU only (no GPU, no model), each under the supervisor of step 4.10,
listening on 127.0.0.1 only; the chat server is the only public entry. The owner switch of the models does not touch
them. Nothing of the wallet era is copied: a new state folder and a new env file with only the RPC settings.

### 12.2a Known model limits (found 25 Nov 2026 while labelling the Live page; docs only, no code changed)

The advisor's calculations are the research code the archived results were produced with, so they stay as they are.
What follows is recorded so that the Live page and the case study do not overstate what the numbers mean.

- **The fee-yield scaling appears to be two times too high.** `computeStats` (src/utils/advisor.ts, lines 165 to 172)
  measures the fees earned per day by the liquidity in a band one tick spacing wide: from half a spacing below the
  price to half a spacing above it. `assessPosition` (line 253) turns that into a position's yield with the factor
  2 × spacing / width, which assumes the measured band is two spacings wide. If the measured band is one spacing, the
  factor should be spacing / width, and every estimate built on it is about twice the model's own measurement.
  - **Paper trading uses the same scaling.** `bot/paper.ts` line 214 accrues fees as value × feeYieldDaily ×
    (2 × spacing / width) × days. So the paper "fees", in the August and September run and on the Live page, are about
    twice what the measurement implies. Their costs and price effects are not affected.
  - **The backtest does not use it.** `backtest/engine.ts` (lines 384 to 393) replays every swap and credits the
    position its share of the swap fee, L / (L_pool + L). The archived walk-forward and backtest results, and so the
    conclusion that holding beat the strategies, do not depend on this factor.
  - **Direction.** If the factor is too high, paper trading and the advisor's payback estimates look better than they
    were. The finding cannot weaken the conclusion "holding won"; it can only make the paper numbers look rosier
    than they should.
- **The paper step and the telemetry suggestion follow different rules.** Paper trading plays ALGORITHM v1.2 (k×σ
  ranges from `suggestRange`) on all six pools, at open and at rebalance. This is unchanged since its first commit
  (2416759, 18 Aug 2026), so the Live page is faithful to the research run. The observer's published suggestion for
  the two product pools is the FlatWide hybrid's wide posture (`suggestFixedRange` at ±productIdleWidthPct). The
  walk-forward tables (720d-30d) also describe the hybrid. The Live page says which rule each section shows.
  Playing the hybrid in the paper step is not part of 5.x: it belongs to the later "two strategies on the same pool"
  item.
- **The real-capital figures are outside both findings.** The Archive page's real-capital numbers (positions,
  fees, gas, the tranche) are measured from the chain through the ledger, not modelled, so neither the fee scaling
  nor the paper rule touches them.

### 12.3 Open questions for the owner

1. **Start fresh, warm start, or continue?** Three options:
   - *Fresh start* on the go-live day (6 x 10 000 USD, dates shown). Simple, but the charts are flat for days, and
     over a short window the strategy can sit ahead of holding, which reads against the project's conclusion.
   - *Warm start* (review of 25 Nov 2026): the paper positions are replayed from a fixed past date (60 or 90 days back)
     with the existing paper engine on historical data, labelled "replayed" up to the go-live day and "live" after it,
     with the boundary drawn on every chart. The existing code cannot do it as it is: `paperTick` reads its state from
     a file and takes the time from the clock, and its inputs (advisor statistics from 24 h of swaps, leg prices, the
     trend signal) come from the live observer. Needed: a replay driver that steps in 15-minute intervals, an
     injectable clock and state path in `paper.ts` (no change to the strategy), and the advisor statistics computed
     from historical `Swap` logs of the six pools on three chains for the window plus 24 h. Data: the swap history
     for the window (the pipeline's resumable `fetch-swaps` over public RPCs, about 60 to 90 days of logs for six
     pools; heavy on free endpoints, so fetched once on the Mac or the box, not on every start), prices from the same
     swaps. Size L (M if the pipeline's swap cache already covers the window; the wallet-era cache is not copied).
   - *Continue* the old `.bot/` paper files: rejected, it would mix wallet-era state into the demo.

   Recommendation: the warm start if the owner accepts an L step before go-live, otherwise the fresh start with the
   fixed notice below from the first day. Either way the August and September paper results stay in Archive.
2. **Public RPCs or a paid key?** Recommendation: start on public RPCs in step 5.1 and measure the gaps; a paid key,
   server side only, if the 24 h `Swap` log reads fail too often.
3. **Rankings live or fixed in the first version?** Recommendation: the daily DefiLlama ranking live, the heavy full-run
   column fixed from the period and dated.
4. **Proposal cards in the first version?** Recommendation: not in the first version (step 5.7 after go-live); the
   paper panel already shows every rebalance and its cost.
5. **Real-capital panels in "Live"?** Recommendation: no; they stay in Archive, sanitized, so "Live" never shows
   personal data.
6. **Where "Live" runs?** Recommendation: on the box beside the chat server (CPU only, measured in 5.6); a separate
   always-on host only if the box's uptime is not enough.
7. **The original look:** Recommendation: the original cockpit CSS for "Live", scoped to that page, and the showcase
   look for "Archive", with the same switch on both.
8. **Fixed notice for "Live"** when the strategy is ahead of holding on the day (shown under the "vs HODL 50/50"
   figure whenever it is positive): "This is a demonstration of how the project measured its strategy, on a virtual
   portfolio. Over a few days or weeks the strategy can be ahead of holding. Over the measured period with real
   capital (August to September 2026) it did not reliably beat simply holding the tokens: see Archive. Nothing here is
   investment advice."
9. **The chain-read library on the server side** (touches the standing rule "no wallet or signing libraries"):
   Recommendation: allow `viem`'s public client in the server-side observer only, with the guards described in 12.2
   (no account, no key, no wallet client, a code-path test, a refusing start on key-like variables); the browser
   bundle stays without `viem`.
10. **Items the owner may have forgotten and might want back:** the out-of-range timer with its 24 h rule and payback
   condition, the flat clock of the FlatWide cycle, the walk-forward check against fresh data, the candidate gate,
   the morning report. All but the morning report are in the proposed first version.

