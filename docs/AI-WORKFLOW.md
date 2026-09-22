# How the project was run with AI sessions

HOMOS was developed by one engineer between 10 August and 22 September 2026 with four
specialised Claude sessions working in parallel. This document describes the protocol, because
it is the part of the project most people ask about, and because the commit history only makes
sense with it.

## The four roles

| Session | Where it ran | Role |
|---|---|---|
| **Fable** (analysis) | cloud, always available (also from a phone) | research, strategy design, backtest interpretation, core/bot code, coordination, morning briefs, pushback on trade decisions |
| **CC-Mac** (Claude Code) | terminal on the Mac | git commits and pushes, running scripts, applying patches prepared by other sessions |
| **CC-Win** (Claude Code) | the 24/7 Windows server | services (NSSM), scheduled tasks, deployments, `.env`, long-running data jobs, read-only diagnostics of the bot's state |
| **Sonnet** (UI) | desktop | the React cockpit — components, hooks, styles only |

The owner signed transactions, made every capital decision, and acted as the router between
sessions when a direct channel was not available.

## The two coordination files

Sessions cannot see each other. They coordinated through the repository:

- **`CONTEXT.md` — the living journal.** Section 1: the current state, newest first. Section 2:
  the decision table (translated in `DECISION-LOG.md`). Section 4: a dated log of every session —
  what was observed, what was decided, what was handed off. **Every session had to read it before
  doing anything and append an entry after.** It grew to 360 KB in six weeks.
- **`HANDOFF.md` — the inboxes.** One section per session. Entries were short
  (`[from→to, date] do X, then ping Y`), the full context lived in `CONTEXT.md` or a `TASKS-*.md`
  queue. A session started by reading its section and *deleting* what it had picked up — the
  file held only live work, history was in git.

Rules that turned out to matter:

1. **Read before acting, write after.** The few incidents in the project trace back to a session
   skipping one of these (a stale assumption about the server, a fix applied twice).
2. **Short hand-offs, long journal.** Inbox entries were instructions; reasoning went in the
   journal. This kept the inboxes readable from a phone.
3. **The cheaper session executes literally.** CC-Mac and CC-Win were told: do exactly what the
   entry says; if anything is ambiguous, write the problem to Fable's inbox and move on. Analytical
   and parameter decisions stayed with one session.
4. **Same-day verification after every infrastructure fix.** The nightly automation was routine,
   not a test. Three consecutive days of "the pipeline fails on something new every morning"
   produced this rule.
5. **Code reaches the server only by a manual `git pull`.** An auto-pull runner with
   `reset --hard` was built, used once, and withdrawn after an incident. The only automated git
   action was the morning report committing itself.
6. **Direct pings when possible.** Later in the project the two Claude Code sessions could message
   each other directly after a push or a deployment; when that channel was down they fell back to
   the inbox plus asking the owner to relay.

## A typical day

- **03:30–05:30 (server)** — nightly pipeline: fetch swaps, refresh caches, run backtests and
  selection, write logs.
- **07:30 (server)** — the morning report script reads the logs, the bot state and the ledger,
  writes `reports/morning-YYYY-MM-DD.md`, commits and pushes it, and sends a Telegram digest.
- **08:00–09:00 (Fable + owner)** — the morning brief: the analysis session reads the report,
  `CONTEXT.md` and `HANDOFF.md`, summarises, flags anything anomalous, and argues against any
  trade decision it thinks is being made for the wrong reason. Decisions go into the journal.
- **Day** — work packages: Fable prepares a patch or a spec, CC-Mac commits it, CC-Win deploys
  and reports back, Sonnet ships UI batches against a written spec and a "do not touch" list.
- **Evening** — receipts and diagnostics land in Fable's inbox; verdicts and follow-ups go back
  out; the journal gets its closing entry.

## What worked

- Narrow roles with explicit file ownership. The UI session never touched `bot/`; the server
  session never made parameter decisions.
- A journal that a fresh session could read from the top and be productive in minutes.
- Written pushback. The analysis session recorded its disagreement with capital decisions in the
  journal at the time, including the bias it thought the decision was being made under. That
  record is why the case study can be honest about the exit rule.
- Treating the morning report as the single source of truth for "what happened overnight".

## What did not

- The journal became too long to read in full; later sessions read the state section and the last
  few entries only, and occasionally missed something older.
- Hand-offs through the owner were the slowest link. Direct session-to-session messaging helped
  once it was available.
- Every session had a different view of time and of what was deployed; "is this fix live?"
  needed an explicit receipt from the server session every time.
- The volume of writing is visible in the commit history: many commits are documentation.
  That was the cost of keeping four sessions consistent, and I would pay it again, but it is a
  real cost.

## If you want to copy the pattern

Keep one journal and one inbox file in the repo. Make reading them the first instruction of every
session and writing to them the last. Give each session a role and a list of paths it may not
touch. Route all decisions that spend money or change parameters through one session and require
evidence in writing. Verify infrastructure changes the same day, by hand. And keep a human
signature as the last step of anything irreversible.
