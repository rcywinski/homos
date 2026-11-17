# Step 4.8n: number marks, before and after (17 Nov 2026)

Offline, no GPU. Tool: `node --import tsx ai/serve/tools/number-rules.mts [--list]` (the rule before this step is kept
as `ai/serve/tools/numbers-before-4.8n.ts` for the comparison).

**Material.** Real answers: the step 3.2 runs pb1 and pb2, the configuration the chat serves (57 answered questions),
because they keep the full citations and the 10 searched chunk ids. The 4.8 batch file kept only the status and file
of each quote, so its marks cannot be recomputed; the batch tool now keeps everything. Seeded errors: 32 numbers in
those answers that were backed (verified or in the cited source), each changed to a value that none of the 10 searched
chunks contains: 5 amounts, 8 dates, 8 percentages, 8 counts, plus 3 aimed at proposal 1 (a wrong single digit or
0.x value with its unit: "8GB" to "6GB", "≤7 days" to "≤4 days", "+0.6%" to "+0.9%"; a fourth, "±5%" to "±7%",
was dropped because the sources do contain ±7%). A seed is caught when its mark is "not verified".

| Rule set | Numbers | Verified | In the cited source | Not verified (with the uncited reason) | Seeds caught |
|---|---|---|---|---|---|
| Before (the 4.5 rule) | 264 | 155 | 68 | 41 | 29 of 32 |
| Mechanical fixes (built, on) | 237 | 130 | 79 | 28 | 32 of 32 |
| + proposal 1, under two significant digits with the same unit | 237 | 130 | 87 | 20 | 32 of 32 |
| + proposal 2, rounding to one significant digit with a unit | 237 | 130 | 79 | 28 | 32 of 32 |
| + proposal 3, uncited-source reason | 237 | 130 | 79 | 28 (6) | 32 of 32 |
| + proposal 4, identifier parts unmarked | 235 | 130 | 79 | 26 | 32 of 32 |
| All four proposals | 235 | 130 | 87 | 18 (6) | 32 of 32 |

The rule before this step missed three seeded wrong dates: an ISO date (2026-09-09 changed to 2026-09-18, "verified"
because its parts 09 and 18 appear somewhere) and two written-out dates ("22 Aug" to "4 Aug", "21 Aug" to "3 Aug",
"verified" because a bare 4 or 3 is in a quote). The mechanical fixes catch all three. Fewer numbers in total after the
fixes, because an ISO date or a clock time is now one token and list numbers are not marked.

**Mechanical fixes (built, always on).** An ISO date (with or without a time) and a clock time are one token, checked
as a date or time against the quotes and cited chunks in any notation; list numbering "(1)", "1." gets no mark; a
pool fee tier written as a decimal next to "%" or pool words matches the pool id (-005, -030) or Uniswap fee units
(500, 3000); and the day of a written-out date ("4 Aug", "21 August", also Polish month names in the sources) is
checked as a date, never as a bare number.

**The 28 "not verified" marks left after the mechanical fixes**, by where the value actually is (checked with a
script against the cited chunks, the searched chunks and the whole corpus):

- 15 in a cited chunk, but as a single digit, 0.6, a multiplier, a date from the source's title or part of an
  identifier: false alarms or borderline. Proposal 1 removes 8, proposal 4 removes 2; "4x" stays, because a
  multiplier is never "in the source" by the owner's rule.
- 6 in a searched chunk the answer did not cite: the owner's default keeps them flagged, proposal 3 says why.
- 6 only elsewhere in the corpus, not in the searched chunks: four id-03 dates taken from report titles, $5,830.92
  (the next day's balance) and -$128 (a difference the model computed). Correct marks under the rule.
- 1 nowhere in the corpus: -$132.37, a sum the model computed. Correct mark.

**The 20 marks of 4.8**, expected effect (not recomputable, see above): list numbers in id-04 (2) disappear; the ISO
dates of id-03 (4 marks) become 2 date tokens, still "not verified" if, as in pb1 and pb2, the dates come from report
titles that are not in the searched text; the clock times in dated-04 and example-3 (2) become time tokens; the fee
tier in dated-10 (1) matches the pool id; single digits and +0.6 (6) depend on proposal 1; $6,092 (2) depends on
proposal 3; the three written-out dates of why-02 and dated-09 are now checked as dates.

**Proposals for the owner's decision (off until decided).**

1. A number with fewer than two significant digits (5, 8, 0.6) that appears only in a cited chunk counts as "in the
   cited source" when it appears there with the same unit or neighbouring word (±5%, 8GB and 8 GB, exit 0, +0.6%);
   otherwise it stays "not verified". Removes 8 false alarms; all 3 targeted seeds still caught.
2. Rounding to one significant digit when the number carries % or $ and a source value with the same unit rounds to it.
   No effect on this material (the +0.6% case is an exact match, handled by 1); worth keeping only if a case appears.
3. The owner's default: a number found only in a searched chunk the answer did not cite stays "not verified", with the
   reason "found in a searched source the answer did not cite" shown next to it. Changes no state, only the reason (6).
4. A number that is part of an identifier (`arbitrum-usdc-usdt-001`, `k2h24`) gets no mark. Removes 2 false alarms.

The page now says, in the legend and next to the chat, that a number mark shows where a number appears, not that it
answers the question; a date that is in a source but belongs to another event still gets a check mark (dated-04,
dated-06 in 4.8).

## Final rule, after the owner's decisions (17 Nov 2026)

Proposal 1 yes, proposal 2 no (removed), proposal 3 yes, proposal 4 replaced: an identifier
(`arbitrum-usdc-usdt-001`, `k2h24`, `bge-m3`) is one token, checked against the quotes, the cited chunks and the
searched chunks like a number, so an invented identifier is flagged. Two seeded invented identifiers were added
(`arbitrum-usdc-usdt-001` to `-007`, `base-weth-usdc-030` to `-050`; `k2h24` does not occur in the pb1 and pb2 answers).

| Rule | Numbers | Verified | In the cited source | Not verified (with the uncited reason) | Seeds caught |
|---|---|---|---|---|---|
| Before (the 4.5 rule) | 264 | 155 | 68 | 41 | 29 of 34 |
| Final (4.8n) | 237 | 129 | 90 | 18 (6) | 34 of 34 |

The rule before missed the three wrong dates of the first table and both invented identifiers, which it did not mark
at all (a number glued to letters was never a token). No identifier in the real answers is missing from the sources,
so identifiers add no false alarm here. The 18 left: 6 found only in an uncited searched source (shown with that
reason, among them "15 September", whose date is in a searched report the answer did not cite), 6 only outside the
searched sources (four id-03 dates from report titles, $5,830.92, and -$128, a difference the model computed), 1 sum
computed by the model (-$132.37), and 5 borderline single digits ("4x", which the multiplier rule keeps flagged;
"Phase 4" and "Phase 3"; the "5" of "±5%" in id-02, present in a searched source but too short for the uncited
reason; "Tranche 1", where the Polish source writes "Transza 1"). The page shows the uncited reason next to a mark.
