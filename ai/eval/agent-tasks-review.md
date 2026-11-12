# Agent evaluation task set (step 2.4), for review

18 tasks, 3 per category. Reference answers and required sources come from the files: journal and decision log text, saved result files, and for the job tasks the reference runs in `ai/eval/agent-refs/`. "Required sources" is checked mechanically after each run; the reference answer is what the blind judge compares against. Tasks marked "jobs on" run with `--jobs --yes-jobs`; the others run exactly as in 2.2. Development questions from 2.2 and 2.3 are excluded (`ai/eval/agent-tasks-dev.json`).

| id | category | jobs | question |
|---|---|---|---|
| j-01 | Journal only | off | Why was the funding cash-and-carry idea (experiment E8.1) closed? |
| j-02 | Journal only | off | Why was providing liquidity on Aerodrome rejected for the wide cbBTC/WETH position (experiment E8.4)? |
| j-03 | Journal only | off | What happened in the .bot and pipeline incident of 17 August, and how was it resolved? |
| d-01 | Decision log | off | Why was @envio-dev/hypersync-client pinned to exactly version 1.0.0? |
| d-02 | Decision log | off | What exit rule for the tranche was set on 2 September, and how did the revision of 16 September change it? |
| d-03 | Decision log | off | What did ALGORITHM v1, frozen on 11 August, specify, and what evidence was it based on? |
| b-01 | Saved backtest numbers | off | In the saved funding carry result for Hyperliquid ETH with 90-day windows, what were the mean edge per window against USDC lending, the win rate, and the longest run of negative funding? |
| b-02 | Saved backtest numbers | off | In the saved pegged-pair backtest of USDC/USDT 0.01% on mainnet with the conservative fee model, which strategy had the highest APR, and what were its APR, its result against HODL and its maximum drawdown? |
| b-03 | Saved backtest numbers | off | What did the saved HLP vault result against USDC with 90-day windows show about the house edge? |
| x-01 | Journal plus backtest | off | Revision v1.1 of 11 August reports the first full gate pass on base-005 with a 68% win rate and a worst window of -2.52%. Which saved result supports these numbers, and how did that strategy do in each market regime? |
| x-02 | Journal plus backtest | off | On 26 August the validation gate moved to a 720-day window because no configuration passed on 720 days. In the saved 720-day walk-forward results for Base WETH/USDC 0.30%, Base cbBTC/WETH 0.05%, mainnet USDC/WETH 0.05% and Arbitrum WETH/USDC 0.05%, did passive ±50% meet the soundness criterion (win rate at least 65% and worst window above -3%) or the two-regime gate on any of them? |
| x-03 | Journal plus backtest | off | In experiment E8.2 the journal reports that GM-BTC/USD passed all four house-edge criteria. What numbers did the journal report, and do the numbers in the saved result file match them? |
| t-01 | Needs a job | on | What does passive ±50% look like on Base cbBTC/WETH 0.05% with 40-day walk-forward windows every 10 days: mean against HODL, win rate, worst window, and win rate in each regime? |
| t-02 | Needs a job | on | Run a walk-forward on Arbitrum WETH/USDC 0.30% with 35-day windows every 7 days. Which strategy in the default set had the highest mean against HODL, and did any strategy have a worst window above -3%? |
| t-03 | Needs a job | on | With USDC lending at 3.8% a year as the benchmark, how does funding carry on Hyperliquid BTC do over 60-day windows every 15 days: mean edge per window, win rate and worst window? |
| p-01 | False premise or unanswerable | on | Run a 30-day walk-forward on Base WETH/USDC 0.05% with a 10-day step and report how passive ±50% did. |
| p-02 | False premise or unanswerable | on | Run a 720-day walk-forward for Base cbBTC/WETH 0.05% with 30-day windows and tell me how passive ±50% did. |
| p-03 | False premise or unanswerable | off | In the canonical 45-day walk-forward for Base WETH/USDC 0.30%, how did the passive ±20% strategy do? |

## j-01: Journal only

**Question.** Why was the funding cash-and-carry idea (experiment E8.1) closed?

**Jobs.** off

**Reference answer.** All 8 runs failed (Binance ETH and BTC 2019 to 2026 and Hyperliquid 900 days, 30- and 90-day windows). Annualized funding was 10.8 to 13.9% a year, but the break-even was 9.6 to 13.7% because of round-trip costs, the idle 50% margin and the USDC benchmark, so win rates were only 17 to 56% and the last 180 days were negative everywhere. It worked only in 2020 and 2021; 2022 had 0% winning windows. The class was closed: not to be revisited without new data, at most as a signal if funding stays above 20% a year for weeks.

**Required sources.**

- cite one of: `journal/CONTEXT.md:684`

**Expected tools.** search_journal

## j-02: Journal only

**Question.** Why was providing liquidity on Aerodrome rejected for the wide cbBTC/WETH position (experiment E8.4)?

**Jobs.** off

**Reference answer.** A position staked in an Aerodrome gauge earns only AERO emissions and no fees, and the displayed emission APR is computed on liquidity in the active tick plus or minus one tick (about a 0.3% band). A ±40% position has about 6.5 units of liquidity per dollar against about 1 300 for the narrow band, so it would get about 0.5% of the emissions, roughly 4 to 6% a year in AERO (an inflating token), against roughly 5 to 11% a year in fees on Uniswap. The Aerodrome advantage exists only for ultra-narrow, actively managed positions, the class already falsified in late August. Verdict: no, Uniswap stays the venue for the wide position; closed for good.

**Required sources.**

- cite one of: `journal/CONTEXT.md:639`

**Expected tools.** search_journal

## j-03: Journal only

**Question.** What happened in the .bot and pipeline incident of 17 August, and how was it resolved?

**Jobs.** off

**Reference answer.** The bot state directory .bot was tracked in git while the Windows auto-pull runner did a git reset --hard every 3 minutes, which would overwrite live data. CC-Win backed up the data (robocopy) and stopped the runner, then found that the HomosPipeline task ran as SYSTEM and failed with spawn npx ENOENT, and moved it to the user account; CC-Mac untracked .bot (commit f18f50e) only after the backup was confirmed; CC-Win pulled, restored the backup and restarted the runner and the bot. No data was lost. (The next day the auto-pull runner was withdrawn altogether.)

**Required sources.**

- cite one of: `journal/CONTEXT.md:3618`

**Expected tools.** search_journal

## d-01: Decision log

**Question.** Why was @envio-dev/hypersync-client pinned to exactly version 1.0.0?

**Jobs.** off

**Reference answer.** On 19 Aug: Envio ships no Windows (win32) binary after 1.0.0. The caret range resolved, on Windows, to a wrapper without the native module, while it worked on macOS. The API used is identical in 1.0.0, so the dependency was pinned to exactly 1.0.0 across the repository.

**Required sources.**

- cite one of: `docs/DECISION-LOG.md`, `docs/DECISION-LOG.md:20`, `journal/CONTEXT.md:94`

**Expected tools.** read_decision_log or search_journal

## d-02: Decision log

**Question.** What exit rule for the tranche was set on 2 September, and how did the revision of 16 September change it?

**Jobs.** off

**Reference answer.** 2 Sep: exit the LP on 24 Sep regardless of price, earlier if the tranche balance reaches +5%; manual daily monitoring, deliberately no automation (the product beat HODL in none of five measurements). 16 Sep, the day after a 4% drop: exit the LP when the tranche balance is at or above the deposit (0%); the hard 24 Sep exit and the +5% trigger are dropped; 24 Sep becomes a review; a balance at or below -10% forces a new decision; the bet is reviewed on 24 Oct; still no narrowing. The loss was market beta (about -$12 against HODL) and the owner kept a conscious bet on an ETH/BTC recovery.

**Required sources.**

- cite one of: `docs/DECISION-LOG.md`, `docs/DECISION-LOG.md:27`, `journal/CONTEXT.md:100`
- cite one of: `docs/DECISION-LOG.md`, `docs/DECISION-LOG.md:29`, `journal/CONTEXT.md:103`

**Expected tools.** read_decision_log or search_journal

## d-03: Decision log

**Question.** What did ALGORITHM v1, frozen on 11 August, specify, and what evidence was it based on?

**Jobs.** off

**Reference answer.** k = 3 for ETH/stable pairs and k = 2 for cbBTC, a 24-hour hysteresis, a payback limit of 7 days, and a trend breaker that simply exits on a 5% break below the 7-day EMA. Evidence: a 365-day walk-forward plus 5 out-of-sample cross-validation runs; the exit profile was the best outside the tuning pool and had the fewest parameters.

**Required sources.**

- cite one of: `docs/DECISION-LOG.md`, `docs/DECISION-LOG.md:14`, `journal/CONTEXT.md:88`

**Expected tools.** read_decision_log or search_journal

## b-01: Saved backtest numbers

**Question.** In the saved funding carry result for Hyperliquid ETH with 90-day windows, what were the mean edge per window against USDC lending, the win rate, and the longest run of negative funding?

**Jobs.** off

**Reference answer.** File e8-carry-HL-ETH-90d (90-day windows every 30 days, 27 windows, benchmark USDC at 3.8% a year): mean edge +0.12% per window (median -0.15%), win rate 37.0%, worst window -0.92%; the longest run of negative funding was about 2.7 days. Annualized funding 10.8% a year; break-even funding 2.37% per window.

**Required sources.**

- dataRefs into `e8-carry-HL-ETH-90d` at `["all","mean"]`, `["all","winPct"]`, `["worstRunDays"]`

**Expected tools.** list_backtest_configs, read_backtest_results

## b-02: Saved backtest numbers

**Question.** In the saved pegged-pair backtest of USDC/USDT 0.01% on mainnet with the conservative fee model, which strategy had the highest APR, and what were its APR, its result against HODL and its maximum drawdown?

**Jobs.** off

**Reference answer.** File pegged-mainnet-usdc-usdt-001-maxL (conservative maxL fee model, about 367 days): "Sztywny ±0.10% h=6h" (fixed ±0.10% range, 6-hour hysteresis) had the highest APR, 1.39% a year, +1.45% against HODL 50/50, maximum drawdown 2.70%, 5 rebalances, in range 99.1% of the time.

**Required sources.**

- dataRefs into `pegged-mainnet-usdc-usdt-001-maxL` at `["results","7","aprPct"]`, `["results","7","vsHodlPct"]`, `["results","7","maxDrawdownPct"]`

**Expected tools.** list_backtest_configs, read_backtest_results

## b-03: Saved backtest numbers

**Question.** What did the saved HLP vault result against USDC with 90-day windows show about the house edge?

**Jobs.** off

**Reference answer.** File e8-house-HLP-usdc-90d: mean edge +34.3% per 90-day window, win rate 100%, worst window +7.2%, vault maximum drawdown 5.8%, but from only 2 windows, so it cannot be interpreted as evidence of an edge (the journal calls HLP uninterpretable for lack of data). Annualized vault return over the period 58.1%.

**Required sources.**

- dataRefs into `e8-house-HLP-usdc-90d` at `["all","mean"]`, `["all","windows"]`

**Expected tools.** list_backtest_configs, read_backtest_results

## x-01: Journal plus backtest

**Question.** Revision v1.1 of 11 August reports the first full gate pass on base-005 with a 68% win rate and a worst window of -2.52%. Which saved result supports these numbers, and how did that strategy do in each market regime?

**Jobs.** off

**Reference answer.** The canonical 45-day walk-forward on Base WETH/USDC 0.05% (walkforward-base-weth-usdc-005-365d-45d-kanon, 45-day windows every 15 days, 22 windows), strategy "Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)": win rate 68.2%, worst window -2.52%, mean +1.20% against HODL. By regime it beat HODL on average in all three: up +1.08% (50% of windows won), down +0.66% (70%), flat +1.94% (75%).

**Required sources.**

- cite one of: `docs/DECISION-LOG.md`, `docs/DECISION-LOG.md:15`, `journal/CONTEXT.md:89`
- dataRefs into `walkforward-base-weth-usdc-005-365d-45d-kanon` at `["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","winPct"]`, `["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","worst"]`

**Expected tools.** read_decision_log or search_journal, list_backtest_configs, read_backtest_results

## x-02: Journal plus backtest

**Question.** On 26 August the validation gate moved to a 720-day window because no configuration passed on 720 days. In the saved 720-day walk-forward results for Base WETH/USDC 0.30%, Base cbBTC/WETH 0.05%, mainnet USDC/WETH 0.05% and Arbitrum WETH/USDC 0.05%, did passive ±50% meet the soundness criterion (win rate at least 65% and worst window above -3%) or the two-regime gate on any of them?

**Jobs.** off

**Reference answer.** No. With 30-day windows every 15 days (47 or 48 windows): Base WETH/USDC 0.30% win rate 59.6%, worst -11.7%; Base cbBTC/WETH 0.05% 63.8%, worst -7.76%; mainnet USDC/WETH 0.05% 60.4%, worst -11.8%; Arbitrum WETH/USDC 0.05% 66.0%, worst -12.0% (the win rate passes, the worst window fails). On every pool the mean against HODL is positive only in the flat regime (up and down are negative), so the two-regime gate fails too. The decision log records 0 of 21 configurations passing on 720 days.

**Required sources.**

- cite one of: `docs/DECISION-LOG.md`, `docs/DECISION-LOG.md:22`, `journal/CONTEXT.md:96`
- dataRefs into `walkforward-base-weth-usdc-030-720d-30d` at `["summary","Pasywny ±50%","winPct"]`, `["summary","Pasywny ±50%","worst"]`
- dataRefs into `walkforward-base-cbbtc-weth-005-720d-30d` at `["summary","Pasywny ±50%","winPct"]`, `["summary","Pasywny ±50%","worst"]`
- dataRefs into `walkforward-mainnet-usdc-weth-005-720d-30d` at `["summary","Pasywny ±50%","winPct"]`, `["summary","Pasywny ±50%","worst"]`
- dataRefs into `walkforward-arbitrum-weth-usdc-005-720d-30d` at `["summary","Pasywny ±50%","winPct"]`, `["summary","Pasywny ±50%","worst"]`

**Expected tools.** read_decision_log or search_journal, list_backtest_configs, read_backtest_results

**Note.** Needs at least 4 result reads plus a source for the gate; a stress test of the step limit.

## x-03: Journal plus backtest

**Question.** In experiment E8.2 the journal reports that GM-BTC/USD passed all four house-edge criteria. What numbers did the journal report, and do the numbers in the saved result file match them?

**Jobs.** off

**Reference answer.** Journal, 7 Sep (GM v2, Sep 2023 to Sep 2026, 90-day windows every 30 days, n = 33, against HODL 50% BTC / 50% USDC): mean +2.30% per window, win rate 91%, worst -1.65%, positive edge in 3 of 3 regimes, max drawdown 26.1% against 41.8% for the basket, so 4 of 4 criteria. Saved file e8-house-GM-BTC-USD-btc50-90d: mean +2.35%, win rate 93.9%, worst -1.68%, positive in all three regimes (up +2.19, down +1.58, flat +3.33), drawdown 25.9% against 41.6%. Close but not identical; the journal records later fixes of the price data (E8.2e, E8.2f on 9 Sep) that moved the numbers slightly. The verdict, 4 of 4, is the same.

**Required sources.**

- cite one of: `journal/CONTEXT.md:684`
- dataRefs into `e8-house-GM-BTC-USD-btc50-90d` at `["all","mean"]`, `["all","winPct"]`, `["all","worst"]`

**Expected tools.** search_journal, list_backtest_configs, read_backtest_results

**Note.** The four criteria themselves are listed in the legend (from vault-house-edge.ts), not in the journal entry.

## t-01: Needs a job

**Question.** What does passive ±50% look like on Base cbBTC/WETH 0.05% with 40-day walk-forward windows every 10 days: mean against HODL, win rate, worst window, and win rate in each regime?

**Jobs.** on (`--jobs --yes-jobs`)

**Reference answer.** No saved result has these settings, so a job is needed (reference run: 33 windows of 40 days every 10 days; 4 up, 8 down, 21 flat). Passive ±50% against HODL 50/50: mean +0.33% per window (median +0.45%), win rate 72.7%, worst window -1.04%, best +1.44%. By regime: up mean -0.11% (25% of windows won), down -0.44% (25%), flat +0.72% (100%). So it meets the script's soundness criterion (win rate at least 65%, worst above -3%) but wins only in the flat regime, so not the two-regime gate.

**Required sources.**

- dataRefs into the job's result (`run-<jobId>-walkforward-base-cbbtc-weth-005-365d-40d`) at `["summary","Pasywny ±50%","mean"]`, `["summary","Pasywny ±50%","winPct"]`, `["summary","Pasywny ±50%","worst"]`
- a run_backtest call with `{"job":"walkforward","pool":"base-cbbtc-weth-005-365d","windowDays":40,"stepDays":10}`

**Expected tools.** list_backtest_configs, run_backtest, read_backtest_results

## t-02: Needs a job

**Question.** Run a walk-forward on Arbitrum WETH/USDC 0.30% with 35-day windows every 7 days. Which strategy in the default set had the highest mean against HODL, and did any strategy have a worst window above -3%?

**Jobs.** on (`--jobs --yes-jobs`)

**Reference answer.** Reference run: 48 windows of 35 days every 7 days (7 up, 20 down, 21 flat). The highest mean against HODL is "Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)": +0.78% per window, win rate 62.5%, worst -7.71%. No strategy had a worst window above -3%: the mildest worst window is -7.71% (that same strategy); passive ±50% has a win rate of 68.8% but a worst window of -15.04%.

**Required sources.**

- dataRefs into the job's result (`run-<jobId>-walkforward-arbitrum-weth-usdc-030-365d-35d`) at `["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","mean"]`, `["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","worst"]`
- a run_backtest call with `{"job":"walkforward","pool":"arbitrum-weth-usdc-030-365d","windowDays":35,"stepDays":7}`

**Expected tools.** list_backtest_configs, run_backtest, read_backtest_results

## t-03: Needs a job

**Question.** With USDC lending at 3.8% a year as the benchmark, how does funding carry on Hyperliquid BTC do over 60-day windows every 15 days: mean edge per window, win rate and worst window?

**Jobs.** on (`--jobs --yes-jobs`)

**Reference answer.** Reference run (Hyperliquid BTC funding, 60-day windows every 15 days, 56 windows, USDC benchmark 3.8% a year, round trip 0.25%, half the capital as margin): mean edge +0.06% per window (median +0.03%), win rate 55.4%, worst window -0.87%, best +1.62%. Annualized funding 11.8% a year; the break-even is 1.75% of funding per window.

**Required sources.**

- dataRefs into the job's result (`run-<jobId>-funding-carry-HL-BTC-60d`) at `["all","mean"]`, `["all","winPct"]`, `["all","worst"]`
- a run_backtest call with `{"job":"funding_carry","series":"HL-BTC","windowDays":60,"stepDays":15,"benchApr":3.8}`

**Expected tools.** list_backtest_configs, run_backtest, read_backtest_results

## p-01: False premise or unanswerable

**Question.** Run a 30-day walk-forward on Base WETH/USDC 0.05% with a 10-day step and report how passive ±50% did.

**Jobs.** on (`--jobs --yes-jobs`)

**Reference answer.** This job cannot run: Base WETH/USDC 0.05% is not on the allowlist (its walk-forward took 915 s at a milder window/step ratio, beyond the 15-minute limit). The nearest saved results are different settings and must be labelled as such: walkforward-base-weth-usdc-005-365d-30d (30-day windows every 15 days, 23 windows) has no passive ±50% row, only passive ±40% (mean -0.20%, win rate 73.9%, worst -13.9%) and FlatOnly variants; the canonical 45-day file walkforward-base-weth-usdc-005-365d-45d-kanon has passive ±50% (mean -0.27%, win rate 72.7%, worst -10.69%, 22 windows).

**Required sources.**

- no job may run (any run_backtest call must be rejected)

**Expected tools.** list_backtest_configs, run_backtest (rejected) or none, read_backtest_results (optional)

**Note.** Correct: says the job is not possible and does not present a different saved run as the requested one.

## p-02: False premise or unanswerable

**Question.** Run a 720-day walk-forward for Base cbBTC/WETH 0.05% with 30-day windows and tell me how passive ±50% did.

**Jobs.** on (`--jobs --yes-jobs`)

**Reference answer.** A 720-day job cannot run here: no 720-day pool is on the allowlist (the 720-day swap caches are gone). But a saved 720-day result exists from the earlier experiments: walkforward-base-cbbtc-weth-005-720d-30d (30-day windows every 15 days, 47 windows): passive ±50% mean -0.30% against HODL, win rate 63.8%, worst -7.76%; by regime up -4.51% (0% won), down -0.47% (33.3%), flat +0.47% (86.7%).

**Required sources.**

- dataRefs into `walkforward-base-cbbtc-weth-005-720d-30d` at `["summary","Pasywny ±50%","mean"]`, `["summary","Pasywny ±50%","winPct"]`, `["summary","Pasywny ±50%","worst"]`
- no job may run (any run_backtest call must be rejected)

**Expected tools.** list_backtest_configs, read_backtest_results, run_backtest (rejected) or none

## p-03: False premise or unanswerable

**Question.** In the canonical 45-day walk-forward for Base WETH/USDC 0.30%, how did the passive ±20% strategy do?

**Jobs.** off

**Reference answer.** There is no passive ±20% strategy in that result, nor in any saved result. The canonical file walkforward-base-weth-usdc-030-365d-45d-kanon holds passive ±50% and five adaptive variants. Passive ±50% there: mean -0.71% against HODL, win rate 63.6%, worst -11.63%, 22 windows.

**Required sources.**

- a read of `walkforward-base-weth-usdc-030-365d-45d-kanon`

**Expected tools.** list_backtest_configs, read_backtest_results

**Note.** Correct: says the strategy does not exist; giving passive ±50% is fine only if labelled as a different strategy.
