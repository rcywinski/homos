# Blind grading, step 2.4 (agent answers)

6 answers. Grade each one the way the judge was asked to, then fill in the two lines under it.

- **Correctness**, against the reference answer: `correct` (main claims agree with the reference, key point present, nothing contradicts it), `partially_correct` (part right, a key point missing, or a contradicting claim next to a correct core), `incorrect` (main claim contradicts or misses the reference, accepts a false premise, or answers where the reference says there is no answer).
- **Faithfulness**, against the cited quotes only, not the reference and not your memory: `supported` (every factual claim is in a quote; a translation counts), `partly_supported` (at least one specific number, date, identifier or cause is in no quote), `unsupported` (the main claim is not in the quotes).

Each item is a different question. Evidence lines starting with "result" are numbers the answer took from a backtest result file, shown with the value actually found at that path. Some items may answer the same question. Do not look up the judge results before finishing; they are not in this file.

## B01

**Question** (answerable: partial): Run a 720-day walk-forward for Base cbBTC/WETH 0.05% with 30-day windows and tell me how passive ±50% did.

**Reference answer:** A 720-day job cannot run here: no 720-day pool is on the allowlist (the 720-day swap caches are gone). But a saved 720-day result exists from the earlier experiments: walkforward-base-cbbtc-weth-005-720d-30d (30-day windows every 15 days, 47 windows): passive ±50% mean -0.30% against HODL, win rate 63.8%, worst -7.76%; by regime up -4.51% (0% won), down -0.47% (33.3%), flat +0.47% (86.7%).

**Key notes:** Correct: says a 720-day job cannot run and reports the saved 720-day result, labelled as the saved run it is.

**Answer under review:**

> I didn't need a new run for the 720-day request: a saved 720-day result already exists (30-day windows, 15-day step, 47 windows). Passive ±50% against HODL 50/50 per window: mean -0.30%, median +0.20%, beat HODL in 63.8% of windows, worst -7.76%, best +1.30%. That is just under the project's 65% win bar. By regime, it won in flat windows (30 windows: mean +0.47%, 86.7% wins) and lost in up windows (5 windows, 0% wins, mean -4.51%). In down windows (12) it won 33.3% of the time with a mean of -0.47%. In the last-90-days windows (4) it won 100%, mean +0.13%.
> 
> I also ran a fresh job. The job tool only offers the 365-day history, not 720 days, so it is a different dataset. Over 23 windows, passive ±50% averaged +0.28%, won 73.9% of windows, and its worst window was -0.53%. Those figures are not the same run as the 720-day ones.

**Cited quotes:**

- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","mean"]` "value in the result read: -0.29965399622375555"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","med"]` "value in the result read: 0.20128303312634266"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","winPct"]` "value in the result read: 63.829787234042556"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","worst"]` "value in the result read: -7.763658755473434"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","best"]` "value in the result read: 1.3034678745042605"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","byRegime","flat","mean"]` "value in the result read: 0.47072843339371495"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","byRegime","flat","winPct"]` "value in the result read: 86.66666666666667"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","byRegime","up","mean"]` "value in the result read: -4.511137432292595"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","byRegime","down","winPct"]` "value in the result read: 33.33333333333333"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","byRegime","down","mean"]` "value in the result read: -0.4708253052387479"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["summary","Pasywny ±50%","recent90","mean"]` "value in the result read: 0.13399254757187062"
- `result walkforward-base-cbbtc-weth-005-720d-30d, path ["windows"]` "value in the result read: 47"
- `result run-j20261112T112052n5-walkforward-base-cbbtc-weth-005-365d-30d, path ["summary","Pasywny ±50%","mean"]` "value in the result read: 0.27890286046905993"
- `result run-j20261112T112052n5-walkforward-base-cbbtc-weth-005-365d-30d, path ["summary","Pasywny ±50%","winPct"]` "value in the result read: 73.91304347826086"
- `result run-j20261112T112052n5-walkforward-base-cbbtc-weth-005-365d-30d, path ["summary","Pasywny ±50%","worst"]` "value in the result read: -0.5296348054175559"
- `result run-j20261112T112052n5-walkforward-base-cbbtc-weth-005-365d-30d, path ["windows"]` "value in the result read: 23"

Correctness (correct / partially_correct / incorrect):
Faithfulness (supported / partly_supported / unsupported):
Note (optional):

## B02

**Question** (answerable: yes): In the saved pegged-pair backtest of USDC/USDT 0.01% on mainnet with the conservative fee model, which strategy had the highest APR, and what were its APR, its result against HODL and its maximum drawdown?

**Reference answer:** File pegged-mainnet-usdc-usdt-001-maxL (conservative maxL fee model, about 367 days): "Sztywny ±0.10% h=6h" (fixed ±0.10% range, 6-hour hysteresis) had the highest APR, 1.39% a year, +1.45% against HODL 50/50, maximum drawdown 2.70%, 5 rebalances, in range 99.1% of the time.

**Answer under review:**

> In the conservative (maxL) run of mainnet USDC/USDT 0.01%, the highest-APR strategy was the narrow ±0.10% position with a 6-hour hysteresis ("Sztywny ±0.10% h=6h"). Its figures were:
> - APR: 1.39% (1.3925 before rounding).
> - Result against HODL 50/50: +1.45% (1.4479 before rounding).
> - Maximum drawdown: 2.70% (2.7027 before rounding).
> 
> The next best strategies were ±0.10% h=24h at 1.23% APR and ±0.20% h=24h at 1.15% APR. Every instant-rebalance variant lost heavily. The journal's 11 Aug interpretation reports the same best result, "+1.4% (maxL) … +12.4% (endL)", and describes maxL as the conservative model. In the endL (optimistic) run, the best strategy by APR was ±0.20% h=24h at 14.05%, not the strategy above.

**Cited quotes:**

- `journal/CONTEXT.md:3348-3349` "najlepsze warianty z histerezą — ±0.10% h6: **+1.4% (maxL) … +12.4% (endL)**"
- `result pegged-mainnet-usdc-usdt-001-maxL, path ["results","7","aprPct"]` "value in the result read: 1.3925012306861717"
- `result pegged-mainnet-usdc-usdt-001-maxL, path ["results","7","vsHodlPct"]` "value in the result read: 1.4478696629829146"
- `result pegged-mainnet-usdc-usdt-001-maxL, path ["results","7","maxDrawdownPct"]` "value in the result read: 2.702687050744695"
- `result pegged-mainnet-usdc-usdt-001-maxL, path ["results","8","aprPct"]` "value in the result read: 1.225381352546484"
- `result pegged-mainnet-usdc-usdt-001-maxL, path ["results","9","aprPct"]` "value in the result read: 1.1471080779789977"
- `result pegged-mainnet-usdc-usdt-001-endL, path ["results","9","aprPct"]` "value in the result read: 14.050249586722963"

Correctness (correct / partially_correct / incorrect):
Faithfulness (supported / partly_supported / unsupported):
Note (optional):

## B03

**Question** (answerable: yes): Why was the funding cash-and-carry idea (experiment E8.1) closed?

**Reference answer:** All 8 runs failed (Binance ETH and BTC 2019 to 2026 and Hyperliquid 900 days, 30- and 90-day windows). Annualized funding was 10.8 to 13.9% a year, but the break-even was 9.6 to 13.7% because of round-trip costs, the idle 50% margin and the USDC benchmark, so win rates were only 17 to 56% and the last 180 days were negative everywhere. It worked only in 2020 and 2021; 2022 had 0% winning windows. The class was closed: not to be revisited without new data, at most as a signal if funding stays above 20% a year for weeks.

**Answer under review:**

> E8.1 was closed on 7 Sep 2026 because all 8 test series failed (8/8 "NIE"). The test ran on Binance ETH and BTC from 2019 to 2026 and on Hyperliquid ETH and BTC over 900 days, with 30-day and 90-day rolling windows. Funding was 10.8–13.9%/yr annualised, but the breakeven was 9.6–13.7%. That breakeven covers round-trip costs, 50% of capital sitting idle as margin, and the 3.8%/yr USDC benchmark. Net of that, only 17–56% of windows beat USDC, and the latest 180 days were negative everywhere. The carry worked only in 2020–21, and 2022 had 0% winning windows. The saved Binance ETH 90-day file agrees: 42.5% winning windows, and 2022 had 0% winners (mean −1.01 per window). The journal says not to revisit the idea without new data. The only exception noted is a signal, not a strategy: funding above 20%/yr sustained for weeks.

**Cited quotes:**

- `journal/CONTEXT.md:689-691` "Funding ann. 10.8–13.9%/r, ale próg opłacalności 9.6–13.7% (koszty round-trip + margin 50% bezczynny + bench) → %wygr 17–56, recent180 ujemny wszędzie; działało tylko 2020–21, 2022 = 0% wygranych."
- `journal/CONTEXT.md:691-693` "KLASA ZAMKNIĘTA (bez nowych danych nie wracać; ew. warunkowo tylko przy fundingu >20%/r utrzymanym tygodniami — sygnał, nie strategia)."
- `journal/RESEARCH-QUEUE.md:307` "E8.1 CASH-AND-CARRY NA FUNDINGU — ZAMKNIĘTE 07.09: 8/8 serii NIE"
- `result e8-carry-ETHUSDT-90d, path ["all","winPct"]` "no such value in the results this answer read"
- `result e8-carry-ETHUSDT-90d, path ["byYear","2022","winPct"]` "value in the result read: 0"
- `result e8-carry-ETHUSDT-90d, path ["byYear","2022","mean"]` "value in the result read: -1.0083916347032347"

Correctness (correct / partially_correct / incorrect):
Faithfulness (supported / partly_supported / unsupported):
Note (optional):

## B04

**Question** (answerable: yes): Why was @envio-dev/hypersync-client pinned to exactly version 1.0.0?

**Reference answer:** On 19 Aug: Envio ships no Windows (win32) binary after 1.0.0. The caret range resolved, on Windows, to a wrapper without the native module, while it worked on macOS. The API used is identical in 1.0.0, so the dependency was pinned to exactly 1.0.0 across the repository.

**Answer under review:**

> It was pinned to exactly 1.0.0 because newer versions don't work on Windows. Envio publishes the win32 native binary only up to 1.0.0. The project had `^1.4.0`, and on Windows that resolved to a wrapper with no native module, which threw a hard error. macOS builds go up to 1.4.0, so the problem didn't show there. The API the project uses is identical in 1.0.0, and Fable verified the missing binary in the npm registry. After a local `--no-save` install of 1.0.0 on Windows, the full fetch ran clean: 18/18 pools exit 0. The decision was made on 2026-08-19. The journal also says a shared lockfile mattered more than the unused 1.x helpers.

**Cited quotes:**

- `docs/DECISION-LOG.md:20` "Envio ships no win32 binary after 1.0.0; the caret range resolved to a wrapper without the native module on Windows while working on macOS. The API used is identical in 1.0.0."
- `journal/CONTEXT.md:94` "Wspólny lockfile > nieużywane helpery 1.x"
- `journal/CONTEXT.md:2541-2542` "Po lokalnym `--no-save` 1.0.0 na Windows: pełny `--only fetch` **18/18 pul exit 0**"

Correctness (correct / partially_correct / incorrect):
Faithfulness (supported / partly_supported / unsupported):
Note (optional):

## B05

**Question** (answerable: yes): Revision v1.1 of 11 August reports the first full gate pass on base-005 with a 68% win rate and a worst window of -2.52%. Which saved result supports these numbers, and how did that strategy do in each market regime?

**Reference answer:** The canonical 45-day walk-forward on Base WETH/USDC 0.05% (walkforward-base-weth-usdc-005-365d-45d-kanon, 45-day windows every 15 days, 22 windows), strategy "Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)": win rate 68.2%, worst window -2.52%, mean +1.20% against HODL. By regime it beat HODL on average in all three: up +1.08% (50% of windows won), down +0.66% (70%), flat +1.94% (75%).

**Answer under review:**

> The numbers match the canonical rerun file walkforward-base-weth-usdc-005-365d-45d-kanon. It covers 22 windows of 45 days, stepped every 15 days. The strategy is "Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)". The file shows a 68.18% win rate, worst window -2.52 and mean +1.20. The decision log and ALGORITHM.md quote the same figures. The non-kanon 365d-45d file gives slightly different values (worst -2.58, mean +1.16). I did not read the journal's explanation of why the two files differ, so treat the kanon file as the match.
> 
> Results by regime (% vs HODL 50/50):
> - Up (4 windows): mean +1.08, 50% win, worst -2.52.
> - Down (10 windows): mean +0.66, 70% win, worst -1.79.
> - Flat (8 windows): mean +1.94, 75% win, worst -2.15.
> 
> So the strategy had a positive mean in every regime. Its weakest win rate was in up windows, which had only 4 samples.

**Cited quotes:**

- `docs/DECISION-LOG.md:15` "First full gate pass on base-005 (68 % win rate, worst window −2.52 %)."
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","winPct"]` "value in the result read: 68.18181818181817"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","worst"]` "value in the result read: -2.5183095694173097"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","mean"]` "value in the result read: 1.1999143252211257"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","up","mean"]` "value in the result read: 1.0847797679968738"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","up","winPct"]` "value in the result read: 50"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","up","worst"]` "value in the result read: -2.5183095694173097"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","down","mean"]` "value in the result read: 0.6569542613067314"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","down","winPct"]` "value in the result read: 70"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","down","worst"]` "value in the result read: -1.7935796542890015"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","flat","mean"]` "value in the result read: 1.9361816837262444"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","flat","winPct"]` "value in the result read: 75"
- `result walkforward-base-weth-usdc-005-365d-45d-kanon, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","flat","worst"]` "value in the result read: -2.1519864902774577"

Correctness (correct / partially_correct / incorrect):
Faithfulness (supported / partly_supported / unsupported):
Note (optional):

## B06

**Question** (answerable: yes): Run a walk-forward on Arbitrum WETH/USDC 0.30% with 35-day windows every 7 days. Which strategy in the default set had the highest mean against HODL, and did any strategy have a worst window above -3%?

**Reference answer:** Reference run: 48 windows of 35 days every 7 days (7 up, 20 down, 21 flat). The highest mean against HODL is "Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)": +0.78% per window, win rate 62.5%, worst -7.71%. No strategy had a worst window above -3%: the mildest worst window is -7.71% (that same strategy); passive ±50% has a win rate of 68.8% but a worst window of -15.04%.

**Answer under review:**

> I ran a new walk-forward, because no saved 35-day result existed. It covered Arbitrum WETH/USDC 0.30% with 48 windows of 35 days, stepped every 7 days. The highest mean against HODL was "Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)" at +0.78%. Its win rate was 62.5%, which is below the 65% bar. The next best mean was +0.09, for the vg1.4 variant. That figure comes from the run's printed table, not from a file read.
> 
> No strategy had a worst window above -3%. The best worst window was -7.71, for that same strategy. The values I read from the file were -15.04 for passive ±50%, -13.45 for adaptive k=3, and -8.08 for the plain exit variant. The run output also shows -15.68 (k=2), -8.02 (vg1.4 variant) and -7.71 (re>ema). So none meets the project's "sound" rule of win rate ≥65 and worst window > -3. The journal says the same pattern held for this pool earlier (45d and 60d windows: worst -5 to -8 for the trend profiles, up to -10.31 for passive).

**Cited quotes:**

- `journal/CONTEXT.md:3998-3999` "arbitrum-030 (nowa pula, 45d+60d): bramka NIE PRZECHODZI.** Najlepsze: 45d pasywny±50 73% wygr ale worst −10.31; profile trendowe worst −5…−8."
- `legend of run-j20261112T122409n2-walkforward-arbitrum-weth-usdc-030-365d-35d` "Criterion printed by the script: a strategy is sound with winPct >= 65 and worst > -3"
- `result run-j20261112T122409n2-walkforward-arbitrum-weth-usdc-030-365d-35d, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","mean"]` "value in the result read: 0.7833283311506444"
- `result run-j20261112T122409n2-walkforward-arbitrum-weth-usdc-030-365d-35d, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","winPct"]` "value in the result read: 62.5"
- `result run-j20261112T122409n2-walkforward-arbitrum-weth-usdc-030-365d-35d, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","worst"]` "value in the result read: -7.709103728971767"
- `result run-j20261112T122409n2-walkforward-arbitrum-weth-usdc-030-365d-35d, path ["summary","Pasywny ±50%","worst"]` "value in the result read: -15.044140374447746"
- `result run-j20261112T122409n2-walkforward-arbitrum-weth-usdc-030-365d-35d, path ["summary","Adaptacyjna k=3 h=24h payback≤7d","worst"]` "value in the result read: -13.447119103734783"
- `result run-j20261112T122409n2-walkforward-arbitrum-weth-usdc-030-365d-35d, path ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%)","worst"]` "value in the result read: -8.080139643798578"

Correctness (correct / partially_correct / incorrect):
Faithfulness (supported / partly_supported / unsupported):
Note (optional):

