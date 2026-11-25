# Step 6.2 (a): five golden items flagged by the diagnosis, review cards (25 Nov 2026)

CC-Mac, for the owner's decision. Rule: an item changes only if it is defective as a test, never because the system
fails it. Three possible moves: clarify a question with several meanings, narrow a reference that asks for more than
the question, add evidence when a correct answer comes from a place the set does not list. "No change" is a valid
outcome. Verdicts are from the six judged runs of the served retrieval (C correct, P partly, I incorrect).

## dated-04 "When did the last backtest finish?" (IIIIII)

- Golden notes: ambiguous on purpose, full credit for naming the interpretations. Reference: nightly pipeline
  backtest-run last finished 23.09 05:03 UTC; last research backtest E8.3 (08.09).
- What the answers did: gave 09.09 04:53 UTC. That line is real (`morning-2026-09-09.md:43`), but it is not the last
  one: `morning-2026-09-23.md:43` has 05:03 on 23.09. The 37 reports have near-identical structure, and the system
  took an older one because nothing in retrieval knows which report is the latest.
- Defective as a test? No. The question is fair, and the failure is exactly the "last / latest" problem that step 6.8
  targets. Clarifying it now would only hide that.
- **Proposal: no change.**

## dated-05 "Was there any attempt to protect a position by converting it into a different kind of position...?" (IIIIII)

- Golden notes: the question avoids the words hedge, short, perp and GMX on purpose (a test of the wording gap).
  Reference: the GMX ETH short test of 17 to 18.08, the $15 test of 20.08, the BTC short rejected on 11.09.
- What the answers did: described the cbBTC range narrowing. Narrowing changes the width of the same kind of position
  (an LP range), so it is not "a different kind of position"; the diagnosis called this reading plausible, but on a
  closer look the question excludes it.
- Defective as a test? No. It measures what it was written to measure; the evidence is at first-stage rank 169.
- **Proposal: no change.** Correction to the diagnosis: drop the "question ambiguous" tag for dated-05.

## dated-09 "When was the market flat, and how long did the only live narrowing episode last?" (PPPPPP)

- Reference: flat starts and resets on 28 to 30.08, held from 30.08 22:22Z; the narrowing 31.08 to 11.09 (11 days,
  -$32 vs HODL); flat again on cbBTC from 15.09 03:03Z and on both legs on 17 to 18.09, cards not signed.
- What the answers did: gave 30.08 22:22Z and the 11-day episode, missed the later flat periods.
- Defective as a test? No. "When was the market flat" asks for every flat period, so 15.09 and 17 to 18.09 belong in
  the answer. The diagnosis tag "reference broader than the question" was wrong; drop it.
- **Proposal: reference unchanged; mark the spans** (step 6.2 b). Required: the hold from 30.08 22:22Z
  (`CONTEXT.md:294-295`), the episode 31.08 to 11.09 and its length (`CONTEXT.md:255`, `CASE-STUDY.md:81-84`,
  `DECISION-LOG.md:28`), flat again from 15.09 and on 17 to 18.09 (`CONTEXT.md:1309-1310`, `morning-2026-09-17.md:120`
  and `:139`). Supporting: the 28 to 30.08 starts and resets (`CONTEXT.md:1135-1136`), the -$32 (`CONTEXT.md:260`; not
  asked).

## id-03 "Was the range of position #5886957 ever changed, and when?" (CCICCC)

- Reference: no; leg A, minted 27.08 at ±50%, closed unchanged on 18.09; a narrowing card was not signed.
- What the answers did: answered "no" correctly in 5 of 6 runs, citing the daily report rows of the position, e.g.
  `morning-2026-08-29.md:185` (`#5886957 | base-weth-usdc-030 | ... (od 2026-08-27) | w zakresie`),
  `morning-2026-08-31.md:223` and `morning-2026-09-18.md:274` (posture `SZEROKI`, PnL anchor still 27.08). None of these
  is in the evidence list, so retrieval counts these answers as "evidence not given".
- Defective as a test? Yes, the evidence list is incomplete: these rows show the same position, same posture and same
  anchor from 29.08 to 18.09, which supports "never changed".
- **Proposal: add `morning-2026-08-29.md:185`, `morning-2026-08-31.md:223` and `morning-2026-09-18.md:274` as
  supporting evidence.** Question and reference unchanged.

## dated-01 "When did the first real capital enter through the application...?" (PCPCCI)

- Reference: USDC reached the wallet on 25.08; put into the product on 27.08, both FlatWide legs minted.
- What the answers did: the three correct ones said 27.08, citing `HANDOFF.md:1166-1170` (27.08 evening, "dzień
  decyzji zamknięty, produkt hybryda live, obie nogi otwarte") and `HANDOFF.md:1156-1160` (27.08, "karta realnej
  pozycji #5886957"). Neither is in the evidence list.
- Defective as a test? Yes, the same way as id-03: a correct, dated source for 27.08 is missing from the list.
- **Proposal: add `HANDOFF.md:1156-1160` and `HANDOFF.md:1166-1170` as evidence** (required for the 27.08 fact as an
  alternative to the listed spans). Question and reference unchanged.

## Summary

| Item | Proposal | Effect on judged counts | Effect on retrieval metrics |
|---|---|---|---|
| dated-04 | no change | none | none |
| dated-05 | no change (diagnosis tag corrected) | none | none |
| dated-09 | spans marked required or supporting | none | coverage of required spans becomes measurable |
| id-03 | 3 report rows added as supporting evidence | none | evidence found in the top 10 for id-03 |
| dated-01 | 2 HANDOFF spans added | none | evidence may be found in the top 10 for dated-01 |

The two evidence additions change retrieval metrics only, and only because the old list missed correct sources; the
v1.4 and v1.5 retrieval numbers are therefore not compared without re-scoring the stored lists on v1.5.
