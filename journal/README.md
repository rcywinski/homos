# journal/: the raw working notes of the project

These are the notes HOMOS was actually run on between 10 August and 22 September 2026: a living journal, the hand-off
inboxes between AI sessions, 37 daily morning reports, task queues, a research queue and decision notes.
They are in Polish and kept unedited on purpose. They were written fast, for the people and sessions doing the work,
not for readers, and that is exactly what makes them useful as evidence of how decisions were made.
The polished English story is in [`docs/CASE-STUDY.md`](../docs/CASE-STUDY.md) and the translated decision table in
[`docs/DECISION-LOG.md`](../docs/DECISION-LOG.md).

The files come from the private archive of 23 September 2026. It is identical to tag `journal-final` in this
repository, plus the five morning reports of 19 to 23 September generated automatically after the project closed.
Before publishing they were scanned for secrets (keys, tokens, passwords): none were found. The wallet address and
position numbers that appear are public on-chain anyway.

## How the AI sessions used them

Four Claude sessions (analysis, Mac terminal, Windows server, UI) worked in parallel and could not see each other.
They coordinated only through these files: every session read `CONTEXT.md` and its own inbox in `HANDOFF.md`
before doing anything and wrote an entry after. The protocol, and what worked and what did not, is described in
[`docs/AI-WORKFLOW.md`](../docs/AI-WORKFLOW.md).

Since November 2026 the AI layer in [`ai/`](../docs/AI-PLAN.md) indexes these notes so that questions such as
"why was the cbBTC range narrowed on 31 August" can be answered with citations to file and line.

## Map

| File | Size | What it is |
|---|---|---|
| `CONTEXT.md` | 352 KB | The living journal. Section 1: current state. Section 2: decisions taken (translated in `docs/DECISION-LOG.md`). Section 3: things to verify on live data. Section 4: dated log of every session. |
| `HANDOFF.md` | 88 KB | Inboxes, one section per session: short instructions between sessions. |
| `reports/morning-YYYY-MM-DD.md` | 668 KB in total | 37 automatic morning reports (18 Aug to 23 Sep 2026): data freshness, positions, signals, proposals. Near-identical structure. |
| `RESEARCH-QUEUE.md` | 84 KB | Queue of data and research questions, with outcomes. |
| `DECYZJE-2026-08-26.md` | 44 KB | Agenda and outcomes of the owner's weekly decision review of 26 Aug. |
| `KAPITAL-REKOMENDACJA.md` | 8 KB | Recommendation for the first LP entry under ALGORITHM v1.2. |
| `PYTANIE-SZEROKOSC-I-SIGMA.md` | 8 KB | Brief for an outside consultation on range width and volatility measurement. |
| `SELECTOR-LOG.md` | 4 KB | Hit-rate log of the pool selector. |
| `TASKS-UI.md` | 96 KB | Task queue for the UI session. |
| `TASKS-FUNNEL.md`, `TASKS-LEDGER.md`, `TASKS-LIFECYCLE.md`, `TASKS-RECAL.md`, `TASKS-ROTATION.md` | 4 to 16 KB each | Specs for the candidate funnel, transaction ledger, pool lifecycle, recalibration after the 26 Aug review and dynamic rotation backtest. |
| `TASKS-INFRA.md`, `TASKS-WINDOWS.md`, `TASKS-WINDOWS-ADDENDUM.md` | 4 to 8 KB each | Infrastructure tasks and the brief for the Windows server session. |
