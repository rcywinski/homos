# Step 6.2 (b): required and supporting spans for the nine class C questions (26 Nov 2026)

CC-Mac, for the owner's decision. Every span was read in the corpus; nothing here comes from retrieval output.
Rule (golden-meta): a span is **required** only if a reader could state a fact the reference needs from that span
alone; anything that only corroborates or adds context is **supporting**.

## Proposal 1: name the facts, so required coverage counts facts, not spans

The reference of a class C question is a list of facts, and the corpus often states one fact in several places
(why-01: "0 of 21" is in CONTEXT.md:96, DECISION-LOG.md:22 and CASE-STUDY.md:56-61). Counting required spans would
ask the top 10 to hold all three copies, and a retriever that returns one copy of each fact would look incomplete.

Proposed: each required span gets `facts`, the letters of the reference facts it states (a span can state several).
Required coverage becomes "facts with at least one of their spans in the top k / facts of the question". Recall and
MRR on required spans are unchanged by this. The letters are defined per question below, in the reference's order.
Facts the corpus states nowhere as a span (an absence, or a gap in the evidence list) are listed and not counted.

## Correction to v1.5: dated-09 (my error in the 6.2 (a) card)

The card mapped three spans to the wrong facts; I wrote the mapping from memory and did not re-read the lines.
Read now, with the entry date of each:

| span | entry | what it says |
|---|---|---|
| CONTEXT.md:1135-1136 | 31.08 | flat clock on cbBTC running **from 30.08 22:22Z**, first night without a reset after three "dances on the threshold" |
| CONTEXT.md:1309-1310 | 30.08 | the clock reset again overnight, running from 02:59Z |
| CONTEXT.md:294-295 | 11.09 | old #5908083 (narrow ±5%, **31.08 to 11.09, 11 days in flat**) closed |
| CONTEXT.md:255 | 16.09 | flat on cbBTC **confirmed from 15.09 03:03Z** |
| CONTEXT.md:260 | 16.09 | episode 31.08 to 11.09: -$32 vs HODL |

So v1.5 marked the only source of "held from 30.08 22:22Z" (1135-1136) as supporting. Proposed: 1135-1136
**required**, 1309-1310 **supporting** (a reset is not a flat period; the reference's "started and reset on 28-30.08"
is context). The count of required spans stays 7.

## Per question

Format: span, role, facts, one-line reason. "-" = supporting.

### why-01: why we did not actively re-center ranges (11 spans)

Facts: a = on 720 days 0 of 21 configurations passed; b = the live narrowing 31.08 to 11.09 ended -$32 vs HODL;
c = on 16.09 narrowing rejected again, asymmetry about +$1 vs about -$30 per episode.

| span | role | facts | reason |
|---|---|---|---|
| CONTEXT.md:96 | required | a | decision table 26.08: 0/21 on 720d |
| CONTEXT.md:103 | required | c | decision table 16.09: narrowing still no, +$1 vs -$30 |
| CONTEXT.md:255-264 | required | b, c | 16.09 brief: neither card signed, asymmetry, episode -$32 |
| CONTEXT.md:442-449 | required | b | ledger result of the episode, -$32.08 vs HODL |
| DECISION-LOG.md:22 | required | a | English row of the 720d gate, 0 of 21 |
| DECISION-LOG.md:28 | required | b | episode closed, -$32 vs HODL |
| CASE-STUDY.md:81-84 | required | b | the narrowing experiment, -$32 vs HODL |
| CASE-STUDY.md:56-61 | required | a | 720 days, 0 of 21 |
| CASE-STUDY.md:107-112 | supporting | - | general conclusion (narrowing is negative expectancy), no fact of the reference |
| CONTEXT.md:1725-1727 | supporting | - | gas is negligible: explains, not in the reference |
| CONTEXT.md:1752-1762 | supporting | - | fee vs IL breakdown: explains why, not in the reference |

### why-03: why the 720-day backtests covered only a few pools (4 spans)

Facts: a = the first 720d run (25.08) reused the four 365d pools, cbBTC from the pool's start; b = each walk-forward
took 20 to 40 minutes per pool; c = the "finalists" restriction appears only later, in the funnel design of 31.08.

| span | role | facts | reason |
|---|---|---|---|
| CONTEXT.md:4762-4768 | required | a, b | four `*-720d` pools as copies of the -365d addresses, cbBTC from its start, ~20-40 min |
| CONTEXT.md:1171-1176 | required | c | the funnel: 720d gate for finalists |
| CONTEXT.md:3850-3851 | supporting | - | HyperSync fetches a year in 13 min: shows the fetch was not the bottleneck |
| DECYZJE-2026-08-26.md:662-678 | supporting | - | 2x data cost and the "from the pool's start" rule: context for a, does not name the four pools |

### why-08: why cbBTC/WETH was considered riskier (9 spans)

Facts: a = best LP-vs-HODL alpha (365d, k2h24 +11.42); b = on 27.08 closest to passing the gate; c = on 720d the only
pool with 65% winning windows; d = full crypto beta with no stable cushion (HODL -51.5% APR, max drawdown 61.5%);
e = LP and HODL lose together (same USD beta).

| span | role | facts | reason |
|---|---|---|---|
| CONTEXT.md:3817-3828 | required | a, d | the 365d result: +11.42, largest alpha; HODL -51.5%, maxDD 61.5%, no stable cushion |
| CONTEXT.md:281-283 | required | e | **range change proposed: 281-284.** The span stops at "LP i HODL mają"; the fact ("tę samą betę do USD") is on line 284 |
| CONTEXT.md:2074-2077 | required | b | hybrid on cbBTC +0.48/65%, "najbliżej pełnej bramki w historii projektu" |
| CONTEXT.md:3766-3769 | supporting | - | exit vs re>EMA on cbBTC: about the notes' k/exit point, not the reference |
| DECYZJE-2026-08-26.md:549-555 | required | c | "cbBTC/WETH jedyna z 65%" |
| PAIRS.md:41-52 | supporting | - | why correlated pairs have lower IL: background |
| ALGORITHM.md:87-89 | required | a, d | 100% crypto beta, HODL -51%/yr, +11.4 pp best of all pools |
| KAPITAL-REKOMENDACJA.md:37-38 | required | a, d | best LP alpha +11.4, full crypto beta, no stable leg |
| DECISION-LOG.md:28 | required | e | "LP and HODL share the same USD beta" |

### why-09: why 365 days looked profitable and 720 days passed nothing (6 spans)

Facts: a = the 365d year was sideways-to-down and flattered the strategy; b = 720 days included uptrend windows that
lost badly, 0 of 21 passed; c = the swap-based sigma measured pool microstructure, so k was calibrated in wrong units;
d = the gate became 720 days plus a recent ~90-day condition.

| span | role | facts | reason |
|---|---|---|---|
| CONTEXT.md:96 | required | a, b, d | the gate decision row states all three |
| CONTEXT.md:95 | required | c | sigma measures microstructure, k in broken units |
| DECYZJE-2026-08-26.md:549-556 | required | b | 0/21; up windows a disaster |
| DECYZJE-2026-08-26.md:466-482 | required | c | the same ETH, sigma spread 4.5x |
| CASE-STUDY.md:52-58 | required | a, b, c | both causes in English |
| DECISION-LOG.md:22 | required | a, b, d | English gate row |

### why-10: why the LP earned less in fees during an uptrend (6 spans)

Facts: a = fees accrue only in range and yield scales about with 1/width, so narrow earns much more in a flat market
and wide several times less; b = the backtest losses in up windows are attributed to IL and LVR, not to lower fees.
Not a span: "no live measurement of fees during an uptrend" is an absence.

| span | role | facts | reason |
|---|---|---|---|
| CONTEXT.md:1813-1815 | required | a | fee falls faster than IL as the range widens ($643 to $198) |
| CONTEXT.md:4263-4265 | required | a | "yield skaluje się ~1/szerokość", ~2.6x less fee |
| CONTEXT.md:59-62 | supporting | - | the FlatWide product: names the design, not the mechanism |
| CASE-STUDY.md:8 | supporting | - | a half-sentence ("share of fees while the price stays inside it"), too thin alone |
| DECYZJE-2026-08-26.md:546-560 | required | b | up windows a disaster, "cecha klasy strategii (IL/LVR)" |
| DECYZJE-2026-08-26.md:637-639 | required | b | fees lose to IL on the pump, LP = short gamma |

### dated-06: the nightly run, first clean night and later errors (10 spans)

Facts: a = first clean night 22.08; b1 = 19.08 failed; b2 = cause: no HyperSync binary for win32, pinned to 1.0.0;
c1 = 20.08 backtest-run failed; c2 = cause: out of memory, heap raised to 8 GB; d = 21.08 reported no failures while
the fetch was dead; f1 = 26.08 backtest-run failed; f2 = cause Math.min/max over millions of points, fixed in 0257a7a;
g = 03.09 ran long, cache filter fixed; h = 19-20.09 candidate-funnel failed.
Not a span (gaps in the v1.4 list, not proposed now): e = 24.08 the ranking froze (data-age heuristic); the 21.08 fix
in fetch-swaps-hypersync.ts; the 20.09 funnel failure.

| span | role | facts | reason |
|---|---|---|---|
| CONTEXT.md:4417-4420 | required | a | first full swap cache by the automation, backtest-run exit 0 |
| morning-2026-08-20.md:48 | required | c1 | "porażki: backtest-run" |
| CONTEXT.md:2353-2357 | required | c2 | exit 134 OOM, heap 8 GB |
| CONTEXT.md:4093-4096 | required | d | "zielony pipeline" false from 21.08 |
| morning-2026-08-19.md:26 | required | b1 | the failure list of 19.08 |
| CONTEXT.md:2540-2544 | required | b2 | win32 binary only to 1.0.0, pin |
| morning-2026-08-26.md:48 | required | f1 | "porażki: backtest-run" |
| CONTEXT.md:2331-2339 | required | f2 | 0257a7a, Math.min/max |
| CONTEXT.md:757-761 | required | g | backtest-run still running at 07:30, filter fix |
| morning-2026-09-19.md:40 | required | h | candidate-funnel exit 1 |

### dated-07: infrastructure problems and changes while capital was invested (10 spans)

Facts: a = 17.08 .bot/pipeline incident; b = 18.08 auto-pull runner withdrawn; c = 21.08 NSSM to pm2 rolled back;
d1 to d4 = four of the deployments with restarts while the capital was in (each span is a different one); e = disk
replacement on the night of 02/03.09; f = known ledger bugs left unfixed.
The reference lists seven deployment dates; the list has spans for four. Not proposed now.

| span | role | facts | reason |
|---|---|---|---|
| CONTEXT.md:3618-3620 | required | a | the incident entry |
| CONTEXT.md:90 | required | b | decision row 18.08 |
| CONTEXT.md:4300-4302 | required | c | the rollback entry |
| CONTEXT.md:1927-1929 | required | d1 | deploy #1 FLAT_ENTER, manual restart |
| CONTEXT.md:1558-1559 | required | d2 | sigma grid15 deployed, restart |
| CONTEXT.md:1228-1229 | required | d3 | hotfix, build and restart |
| CONTEXT.md:883-885 | required | e | Windows off for the disk swap, no pipeline or report |
| CONTEXT.md:757-760 | supporting | - | the long backtest-run of 03.09: a pipeline problem, not in the reference |
| CONTEXT.md:321-323 | required | d4 | dedup fix, CC-Win pull and restart |
| CONTEXT.md:344-346 | required | f | ledger bug, "do naprawy przed przeglądem 24.09 ... nie dziś" |

### dated-09: see the correction above (9 spans)

Facts: a = flat held from 30.08 22:22Z; b = the narrowing 31.08 to 11.09, 11 days; c = flat again on cbBTC from 15.09
03:03Z; d1, d2 = flat confirmed on each leg on 17.09.

| span | role | facts |
|---|---|---|
| CONTEXT.md:1135-1136 | required (was supporting) | a |
| CONTEXT.md:294-295 | required | b |
| CASE-STUDY.md:81-84 | required | b |
| DECISION-LOG.md:28 | required | b |
| CONTEXT.md:255 | required | c |
| morning-2026-09-17.md:120 | required | d1 |
| morning-2026-09-17.md:139 | required | d2 |
| CONTEXT.md:1309-1310 | supporting (was required) | - |
| CONTEXT.md:260 | supporting | - |

### dated-10: paper-bot rebalances before the capital (5 spans)

Facts: a = three rebalances on the morning of 21.08 (mainnet-030, mainnet-005, base-030); b = they netted +$69/+$93/
+$87; c1 = arbitrum-005 had 0 rebalances in the 22.08 report; c2 = and 1 in the 23.08 report; d = cbBTC never
rebalanced. c1 and c2 together date the fourth rebalance, which is why both are required.

| span | role | facts | reason |
|---|---|---|---|
| CONTEXT.md:4165 | required | a | "PIERWSZE 3 REBALANSE w paper tradingu" |
| CONTEXT.md:4221-4222 | required | b | +$69/+$93/+$87 |
| morning-2026-08-21.md:191-200 | required | a, d | reb = 1 on the three pools, 0 on cbBTC |
| morning-2026-08-22.md:170-176 | required | c1, d | arbitrum 0 |
| morning-2026-08-23.md:174-179 | required | c2, d | arbitrum 1 |

## Summary

| question | spans | required | supporting | facts |
|---|---|---|---|---|
| why-01 | 11 | 8 | 3 | 3 |
| why-03 | 4 | 2 | 2 | 3 |
| why-08 | 9 | 7 | 2 | 5 |
| why-09 | 6 | 6 | 0 | 4 |
| why-10 | 6 | 4 | 2 | 2 |
| dated-06 | 10 | 10 | 0 | 10 |
| dated-07 | 10 | 9 | 1 | 9 |
| dated-09 | 9 | 7 | 2 | 5 |
| dated-10 | 5 | 5 | 0 | 5 |

Changes beyond roles: one range widened (why-08, CONTEXT.md 281-283 to 281-284) and the dated-09 correction. No
question or reference text changes. Applied as golden v1.6 after the owner's decision, with the re-score repeated;
the other 17 answerable questions follow in the next batch.
