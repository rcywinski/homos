# Step 6.2 (b): class C span roles, first draft (superseded)

The first draft of 26 Nov (commit fe5c549) is replaced by a machine-readable roles file and a review file generated
from it, so that each span is read as text against its facts rather than as a line number against a description:

- roles, reviewed and applied: `ai/eval/review/roles-v1-6.json`
- review file (first and last line of every span beside its fact letters): `ai/eval/review/roles-v1-6.md`
- tool: `npx tsx ai/eval/roles.ts review|apply`

Changes from the first draft, after the analysis session's review and the generated review file:

- dated-06 and dated-07: the facts that had no span are filled (21.08 fix `CONTEXT.md:4085`, 24.08 ranking freeze
  `CONTEXT.md:4479-4484`, 20.09 funnel `morning-2026-09-20.md:40`; deployments of 01.09 `CONTEXT.md:1023`, 02.09
  `CONTEXT.md:863-864`, 03.09 `HANDOFF.md:131-134`). A fact with no span would drop out of the denominator.
- dated-10: fact d (cbBTC never rebalanced) moves to the last report before the capital, `morning-2026-08-27.md:222-226`
  (added). The rebalance count is cumulative, so the 21.08 to 23.08 rows would count it too early.
- why-03: `DECYZJE-2026-08-26.md:662-678` becomes required (fact a). Its last lines name the four `*-720d` pools built
  on 25.08; the draft's reason "does not name the four pools" was wrong, caught by the generated review file.
- why-10: the absence "no live measurement during an uptrend" is listed as a fact with no span and counted apart.
