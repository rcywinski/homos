# CLAUDE.md

Working rules for AI sessions in this repository. Read this file and `docs/AI-PLAN.md` before doing anything.

## What this repo is

HOMOS is a closed (Sept 2026) Uniswap v3 liquidity-provision research stack, published as an engineering case study.
Since Nov 2026 it is being extended with an AI layer (`ai/`): a retrieval system over the project journal and a
tool-using Claude agent. The plan, step by step, is in `docs/AI-PLAN.md`. Work only on the step marked `[ ] NEXT`.

## Working mode: the owner is learning while we build

The owner wants to understand every piece, not just get the code. For every step in `docs/AI-PLAN.md`:

1. Before writing code, explain in Polish, in 3 to 5 numbered points: what we are about to build, why this way, which files will be touched.
2. Build the step. Keep each step small enough to read in one sitting.
3. After the step, list the files created or changed and point to the 2 or 3 places worth reading in them.
4. Run the step's verification command and show the output.
5. Ask the owner whether he wants to go on, change something or get a deeper explanation. Do not start the next step without an OK.
6. Only then tick the step in `docs/AI-PLAN.md` (`[x]`), move `NEXT` to the following step and commit with a short message.

When the owner asks "why", answer with a concrete example from this project's data (a journal entry, a decision-log row, a report), not with a generic definition.

## Sessions and coordination

Three sessions work on this layer. Keep it that simple; do not recreate the four-session inbox protocol from `docs/AI-WORKFLOW.md`.

- **CC-Mac** (Claude Code on the Mac): all code in `ai/` and `inference/`, git, evaluation runs, write-up. Owns every plan step unless marked otherwise.
- **CC-Win** (Claude Code on the Windows GPU box, `192.168.1.8`): only what must happen on that machine, steps marked `[CC-Win]` in the plan:
  Ollama install and LAN exposure (0.3), running the reranker service as a Windows service (1.6), pulling models for the local comparison (phase 3).
  CC-Win does not write application code; it does `git pull` and operates. If a change is needed in `inference/`, it asks CC-Mac.
- **Analysis chat** (the owner's chat session): plan changes, explanations, interpretation of evaluation results. Not a code session.

Source of truth for state is `docs/AI-PLAN.md` (checkboxes) plus `inference/README.md` (what runs on the GPU box, how to start and check it).
Mac-side expectations of the GPU box (port, model, endpoint shape) are written in `inference/README.md` by CC-Mac before CC-Win acts on them.
Direct session-to-session messages are for live synchronisation only (first LAN test in 0.3, first reranker call in 1.6). No journal file for this layer:
history lives in commits, decisions and results live in `docs/AI-RAG.md`.

## Code rules

- TypeScript strict, same style as the rest of the repo (`npm run lint`, `npm run typecheck` must pass).
- New code lives under `ai/`. Do not touch `src/utils/v3math.ts`, `backtest/` or `bot/` unless the plan says so.
- Secrets and endpoints only via `.env` (`ANTHROPIC_API_KEY`, `INFERENCE_URL`). Add new variable names to `.env.example` with a comment, never values.
- Every external call (Anthropic API, the local inference box) goes through a small interface (`Embedder`, `Reranker`, `Generator`) so it can be swapped or mocked in tests.
- Generated indexes go to `ai/index/` (gitignored). Evaluation results go to `ai/eval/results/` and ARE committed, they are part of the case study.
- Text written for the repo (docs, README, comments) is English. The journal in `journal/` stays in Polish on purpose, see `journal/README.md`.
- Do not use em dashes or en dashes in any new text. Use a comma, a colon, a period or a plain hyphen.
- Commits: one step = one commit, conventional prefix (`feat(ai): ...`, `docs(ai): ...`), no co-author trailers.

## Git rules

- Branch `ai-layer` off `main`; merge to `main` only when a whole phase (see plan) is done and the owner agrees.
- Never rewrite history on `main`. Never force-push.
- `git status` before every commit; `journal/` is public now and intended, `ai/index/` and `.env` must never appear in a commit.

## Corpus facts you can rely on

- `journal/` (after step 1.1) holds ~1.3 MB of Polish text: `CONTEXT.md` (journal, 359 KB, dated entries), `HANDOFF.md` (inboxes), `reports/` (37 morning reports, 18 Aug to 23 Sep 2026, near-identical structure; the last 5 were generated automatically after the project closed on 22 Sep), `TASKS-*.md`, `RESEARCH-QUEUE.md`, decision notes.
- `docs/` holds ~80 KB of English documentation, including `DECISION-LOG.md` (translated decision table) and `CASE-STUDY.md`.
- The whole corpus is roughly 350k tokens, so it does not fit in one context window. That is the reason this layer exists.
