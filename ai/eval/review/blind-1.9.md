# Blind grading, step 1.9

10 answers. Grade each one the way the judge was asked to, then fill in the two lines under it.

- **Correctness**, against the reference answer: `correct` (main claims agree with the reference, key point present, nothing contradicts it), `partially_correct` (part right, a key point missing, or a contradicting claim next to a correct core), `incorrect` (main claim contradicts or misses the reference, accepts a false premise, or answers where the reference says there is no answer).
- **Faithfulness**, against the cited quotes only, not the reference and not your memory: `supported` (every factual claim is in a quote; a translation counts), `partly_supported` (at least one specific number, date, identifier or cause is in no quote), `unsupported` (the main claim is not in the quotes).

Some items may answer the same question. Do not look up the judge results before finishing; they are not in this file.

## B01

**Question** (answerable: partial): What was the structure of the SQL database holding the backtest data?

**Reference answer:** There was no such database: backtest results were always JSON files in backtest/results/ (plus an HTML report); a SQLite design in DB-SCHEMA.md included a backtest_run table meant only to index those files, but the design was never implemented.

**Key notes:** Expected: say design vs implementation; describing the DB-SCHEMA tables as a running backtest database is an error despite a relevant-looking chunk. Draft memory error: 'the only SQL schema is the bot ledger' (the design also covered logs, paper trading, telemetry and a backtest_run index). Pairs with id-07.

**Answer under review:**

> The documented design (DB-SCHEMA.md, a draft DDL v1) is SQLite-style, but PLAN.md says the ledger shipped as ndjson + CSV export rather than SQLite, so it was apparently never built. For backtests, the planned schema held only one table, `backtest_run`, an index of results files (id, ts, kind, pool_id, params JSON, file path, git_commit). Raw tick-level swaps stayed in ndjson files, not the database. The wider schema also defined paper_event, position and tx tables plus views. The chunks do not show the full schema (e.g., the pool, venue, paper_sample, proposal tables).

**Cited quotes:**

- `docs/DB-SCHEMA.md:141-143` "CREATE TABLE backtest_run ( id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, kind TEXT NOT NULL,                     -- walkforward|sweep|run|pegged"
- `docs/DB-SCHEMA.md:167-168` "stay in files: the backtest reads them sequentially, the database adds nothing here and would bloat by orders of magnitude."
- `docs/PLAN.md:167` "The ledger shipped as ndjson + CSV export rather than SQLite"

Correctness (correct / partially_correct / incorrect): correct
Faithfulness (supported / partly_supported / unsupported): supported
Note (optional): cytat z PLAN.md dotyczy księgi transakcji, nie backtestów

## B02

**Question** (answerable: no): How many tokens were consumed building the project?

**Reference answer:** The corpus gives no token or usage numbers; the closest it comes is noting that the journal grew too long for sessions to read in full and that the analysis session was restarted ('succession') on 11.08.

**Key notes:** Confirmed 'no': no token counts, usage limits or costs of AI sessions anywhere. Context only, no number may be given.

**Answer under review:**

> The provided chunks do not say how many tokens (in the sense of AI/LLM token consumption) were used to build the project. They mention memory limits (Node heap raised to 8GB, then 12288 MB) and crypto tokens such as cbBTC, WETH and USDC, but no figure for tokens consumed.

**Cited quotes:**

(none)

Correctness (correct / partially_correct / incorrect): correct
Faithfulness (supported / partly_supported / unsupported): supported
Note (optional):

## B03

**Question** (answerable: yes): How many times, and when, did the paper-trading bot rebalance before real capital went in?

**Reference answer:** Four times: three rebalances on the morning of 21.08 (mainnet-030, mainnet-005, base-030, netting only +$69/+$93/+$87 after costs) and one on arbitrum-005 between the 22.08 and 23.08 reports; the cbBTC paper pool was never rebalanced (it went to cash on a trend exit and re-entered), and nothing changed up to 27.08.

**Answer under review:**

> The chunks show three rebalances in paper trading, all reported on 2026-08-21 (from the 08:45 report): the first rebalances since the 18.08 start, one each on three ETH/USDC pools (mainnet 0.30, mainnet 0.05, base 0.30), with `reb` going 0→1. However, the chunks do not say when real capital went in; the journal says the 21.08 mode was still OBSERVE with no capital entered, so the count after that date is not covered.

**Cited quotes:**

- `journal/CONTEXT.md:4175-4176` "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30)"
- `journal/CONTEXT.md:4174` "PAPER TRADING (start 18.08)"
- `journal/DECYZJE-2026-08-26.md:408-410` "Dziś to tylko szum propozycji (tryb OBSERWUJ, Rafał zatwierdza ręcznie), ale przy wejściu kapitału i trybie AUTO różnica robi się realna."

Correctness (correct / partially_correct / incorrect): correct
Faithfulness (supported / partly_supported / unsupported): partly_supported
Note (optional): daty 21.08 nie ma w cytatach; odpowiedź podaje 3 z 4 i zaznacza, że dalszy okres nie jest pokryty,

## B04

**Question** (answerable: yes): Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

**Reference answer:** Only tests: after hedge-excess (a perp short on the excess ETH) passed the backtest gate and became v1.2 on 17.08, a $150 1x ETH short was opened on GMX on 17.08 ~16:00 and closed 18.08 ~10:00 (round-trip cost ~$1.08, ~72 bps, protecting no real position), a $15 end-to-end test through the app followed on 20.08 (~$0.40), and on 11.09 a $1 824 BTC short on GMX was rejected as an emergency option.

**Answer under review:**

> Not exactly a conversion into a different kind of position. The closest is a FLAT_WIDEN rebalance on the cbBTC/WETH leg. A narrowed position (#5908083, opened 31.08) was replaced on 11.09 by a new wide position (#5978579). Burn was at 14:00:45Z and mint at 14:01:41Z. The narrow position exited fully into cbBTC through the edge and ended −$32.08 versus HODL (fee ~$12.6 < IL ~−$45). Rebalance cost was about $0.6–0.7 versus a $1.23 plan. The chunks do not describe protecting a position by converting it into another type, so coverage is partial.

**Cited quotes:**

- `journal/CONTEXT.md:447-448` "netto vs HODL wkładu po kursie dziś: −$32.08** (fee +$12.6 < IL ≈ −$45 przy ruchu 5% do krawędzi ±5%)"
- `journal/CONTEXT.md:426` "burn 14:00:45Z, mint 14:01:41Z"
- `journal/CONTEXT.md:394-395` "koszt całkowity (gaz + fee swapu + impact) ≈ **$0.6–0.7 vs plan $1.23**"

Correctness (correct / partially_correct / incorrect): incorrect
Faithfulness (supported / partly_supported / unsupported): supported
Note (optional): odpowiedź opisuje rozszerzenie zakresu, a nie zamianę na inny typ pozycji; pytanie jest pod tym względem precyzyjne ("different kind of position" to nie ta sama pula z innym zakresem). Nieprecyzyjne jest to, czy chodzi o realny kapitał, czy o paper trading. Odpowiedź jest nie na temat, ale to, co twierdzi, ma pokrycie w cytatach.

## B05

**Question** (answerable: yes): When did the last backtest finish?

**Reference answer:** It depends on the meaning: the nightly pipeline's backtest-run last finished on 23.09 at 05:03 UTC (a pause was ordered on 21.09 for 22.09, with no record that it was carried out), the last research backtest was E8.3 (720 days, four pools) received on 08.09, and the last 720-day runs on the product were the shape round of 03.09 and E8.3 of 08.09.

**Answer under review:**

> Among the provided chunks, the latest backtest-run completion is on 2026-09-23 at 05:03:07.956Z (exit 0), from the morning report of 2026-09-23. This is the latest in the supplied excerpts only; the chunks do not show whether any later backtest ran, and the 2026-09-07 chunk does not reach its backtest step.

**Cited quotes:**

- `journal/reports/morning-2026-09-23.md:43` "2026-09-23T05:03:07.956Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1790135075646.log)"

Correctness (correct / partially_correct / incorrect): correct
Faithfulness (supported / partly_supported / unsupported): supported
Note (optional):

## B06

**Question** (answerable: no): What were the results for October 2026?

**Reference answer:** There are no October results: the tranche was fully sold on 21.09, the project closed on 22-23.09 and the last report is from 23.09; the only October date is the planned 24.10 review of the spot bet, and that bet was itself closed early on 21.09.

**Key notes:** Expected: notEnoughContext; must distinguish a planned date (24.10 review) from results. The 24.10 review became moot when the spot bet was closed 21.09 (CONTEXT.md:101).

**Answer under review:**

> The chunks contain no results for October 2026. The project is described as running August to September 2026, and the latest chunks are dated mid-September 2026 (e.g. a pipeline log from 2026-09-16). The closest results available are the paper-trading snapshot from 2026-09-01, which shows a total equity of $64255 and PnL of +$4255 across six pools, but that is not October data.

**Cited quotes:**

- `journal/reports/morning-2026-09-01.md:221` "| **RAZEM** | | **$64255** | +$4255 | $-4477 | | |"

Correctness (correct / partially_correct / incorrect): correct
Faithfulness (supported / partly_supported / unsupported): partly_supported
Note (optional): skoro odpowiedź podaje log z 16.09 i okres trwania projektu (sierpień do września), te zdania też powinny mieć cytat; cytowany jest tylko wiersz z raportu z 1.09.

## B07

**Question** (answerable: yes): Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

**Reference answer:** The bot ran in PROPOSE mode with no wallet key on the server, so the owner signed every transaction; the only cost was signing delay (up to ~13 h at night, ~61 h over a weekend), measured from day one, and AUTO existed only as a later rung of the trust path OBSERVE-PROPOSE-AUTO that was deliberately not enabled at the start.

**Answer under review:**

> The sources show the bot only observed and proposed; execution was manual. The plan's full-auto phase was not built as planned, and AUTO mode was never enabled. Phase 3 delivered semi-automatic execution: signals became ready transactions that the owner signed in a browser wallet (Rabby). The automation table lists open/rebalance/close on signal as PROPOSE (a proposal for approval), with AUTO (execution within limits) not built. The cockpit telemetry footer says the bot executes nothing. So automatic execution was designed but never built or enabled. The chunks do not explain the underlying reason beyond this design choice.

**Cited quotes:**

- `docs/PLAN.md:168` "Not built as planned. AUTO mode was never enabled;"
- `docs/PLAN.md:167` "semi-automatic execution (signal → ready transaction → signature in Rabby)"
- `docs/UI-DESIGN.md:58` "PROPOSE: a proposal for approval; AUTO (not built): execution within limits"
- `journal/TASKS-UI.md:114` ""OBSERWUJ — bot niczego nie wykonuje""

Correctness (correct / partially_correct / incorrect): correct
Faithfulness (supported / partly_supported / unsupported): supported
Note (optional): dobrze dobrane cytaty, odpowiedź obszerna.

## B08

**Question** (answerable: yes): When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

**Reference answer:** The tranche-1 USDC (6 092.50 on Base) reached the owner's wallet on 25.08 and waited in USDC per the 26.08 decision; it was put into the product on 27.08, when both FlatWide legs were minted from the bot's OPEN proposals: #5886957 WETH/USDC ±50% (~$3 507) in the afternoon and WETH/cbBTC ±40% (#5887690, ~$2 360) later that day.

**Answer under review:**

> The chunks do not give a date for the first real capital entering through the application. They only show that the first real LP entry was still a pending decision on 26 August: a recommended tranche 1 of $6k on Base, with figures for the paper-trading results to be reviewed. They do not confirm the entry was executed or when.

**Cited quotes:**

- `journal/DECYZJE-2026-08-26.md:153` "KAPITAŁ — pierwsze realne wejście LP (główna decyzja)"

Correctness (correct / partially_correct / incorrect): incorrect
Faithfulness (supported / partly_supported / unsupported): partly_supported
Note (optional): odpowiedź nie podaje daty wejścia kapitału; cytat to tylko tytuł punktu agendy, a nie to, co się faktycznie stało i kiedy.

## B09

**Question** (answerable: yes): When did the last backtest finish?

**Reference answer:** It depends on the meaning: the nightly pipeline's backtest-run last finished on 23.09 at 05:03 UTC (a pause was ordered on 21.09 for 22.09, with no record that it was carried out), the last research backtest was E8.3 (720 days, four pools) received on 08.09, and the last 720-day runs on the product were the shape round of 03.09 and E8.3 of 08.09.

**Answer under review:**

> Among the provided chunks, the most recent backtest-run to finish was on 2026-09-21 at 05:06:46 UTC (exit 0), in the morning pipeline run. The chunks only cover selected days, so I cannot rule out a later backtest outside them.

**Cited quotes:**

- `journal/reports/morning-2026-09-21.md:43` "2026-09-21T05:06:46.726Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1789962300114.log)"

Correctness (correct / partially_correct / incorrect): incorrect
Faithfulness (supported / partly_supported / unsupported): supported
Note (optional): pytanie dotyczy konkretnie ostatniego backtestu, a odpowiedź podaje datę, która ostatnia nie jest; zastrzeżenie o możliwych późniejszych nie odpowiada na precyzyjne pytanie. Cytat potwierdza, że backtest 21.09 się odbył.

## B10

**Question** (answerable: yes): Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

**Reference answer:** Only tests: after hedge-excess (a perp short on the excess ETH) passed the backtest gate and became v1.2 on 17.08, a $150 1x ETH short was opened on GMX on 17.08 ~16:00 and closed 18.08 ~10:00 (round-trip cost ~$1.08, ~72 bps, protecting no real position), a $15 end-to-end test through the app followed on 20.08 (~$0.40), and on 11.09 a $1 824 BTC short on GMX was rejected as an emergency option.

**Answer under review:**

> Yes. The "narrowing experiment" converted the cbBTC leg from a wide range (±40%) into a narrow ±5% one (FLAT_NARROW, #5908083, signed around 31.08). It was an attempt to respond to a flat market, not a hedge as such. The result (11.09, n=1): the price moved ~5% to the edge, the position exited 100% in cbBTC, and net vs HODL was −$32.08 (fees ≈$12.6 < IL ≈ −$45). It was then replaced by a wide FLAT_WIDEN position (#5978579) on 11.09. Journal calls it one episode, an illustration rather than a test.

**Cited quotes:**

- `journal/CONTEXT.md:447-448` "netto vs HODL wkładu po kursie dziś: −$32.08** (fee +$12.6 < IL ≈ −$45 przy ruchu 5% do krawędzi ±5%)"
- `journal/CONTEXT.md:443` "WYNIK EKSPERYMENTU ZWĘŻENIA (31.08→11.09, n=1)"
- `journal/CONTEXT.md:446` "100% w cbBTC — wyjście przez krawędź"

Correctness (correct / partially_correct / incorrect): partially_correct
Faithfulness (supported / partly_supported / unsupported): supported
Note (optional): zmiana zakresu jest częściowo zabezpieczeniem, ale nie jest zmianą rodzaju pozycji: to nadal ta sama para w puli płynności, tylko w innym zakresie. W pytaniu chodziło o przejście na GMX.

