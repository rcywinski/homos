# Answers with citations: k = 10

Date 2026-11-11. Golden set v1.4. Generator `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "The next review is planned for September 24th (24.09)."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 62 | 58 | 3 | 1 | 0 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 69% (18/26) | 95% (18/19) | 0% (0/7) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 0 | 4 | 1 | 0 |
| yes / evidence given | 17 | 2 | 0 | 0 |
| yes / evidence not given | 5 | 2 | 0 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 320333, output 8591 tokens; $0; generation median 12113 ms, p95 17195 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

They did not actively re-center frequently because backtests showed the extra fees earned by narrowing were outweighed by impermanent loss (IL) and rebalancing costs. The 720-day walkforward analysis revealed that while the narrow strategy earned ~4x more fees, it ended with lower net PnL than passive wide ranges. For example, on cbBTC, the narrow strategy had $2169 in fees but $2097 in IL, leaving only +$10 vs HODL, compared to +$307 for the passive wide range. The mechanism identified was that a narrow band acts as a "short gamma," realizing divergence on every price move. Consequently, the project concluded that narrowing added variance without adding expectancy, and the flat detector/narrowing feature was questioned or deprioritized in favor of staying wide.

- journal/CONTEXT.md:1702-1703 "zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło NIŻEJ."
- journal/CONTEXT.md  [NOT-FOUND] "IL z re-centeringu (65 i 88 rebalansów) zjadł ~$1.9k i ~$2.9k ponad przyrost fee."
- docs/CASE-STUDY.md:60-61 "narrowing added variance without adding expectancy at the flat-episode lengths actually observed"

### why-02 (answerable yes, evidence no, coverage partial)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The chunks do not explicitly state a single reason for keeping the capital commitment small despite rising ETH and BTC prices. However, they explain that the strategy's value proposition is primarily research-oriented rather than profit-maximizing during rallies. The journal notes that in an up-trend, the LP strategy earns less than HODLing because the pool sells the rising asset, creating a "drag" [journal/CONTEXT.md:969]. Furthermore, the project was designed as a "measurement + research machine" where the durable value is knowledge and data, not just yield [journal/CONTEXT.md:969]. The small capital (≈$6k) allowed for safe testing of mechanics like rebalancing and exit rules without significant financial risk while validating these hypotheses [docs/CASE-STUDY.md:67].

- journal/CONTEXT.md:999-1000 "przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma)"
- docs/CASE-STUDY.md:69-70 "I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported"

### why-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The 720-day backtests were limited to a small set of pools (specifically base-030, mainnet-005, arb-005, and cbBTC-005) because fetching swap-level data for two years is computationally expensive. The source notes that running a 365-day backtest took approximately 54 minutes with an 8GB heap limit; extending this to 720 days would double the data volume and increase RAM/CPU requirements significantly. Additionally, some pools (like cbBTC on Base) are younger than 720 days, meaning their data history is shorter, which complicates direct comparisons. The goal was a one-off experiment to compare 365-day vs. 720-day results on core pools to see if the longer window—which includes a strong uptrend—changed the validation gate outcome.

- journal/DECYZJE-2026-08-26.md:662-664 "koszty: (a) 2× dane = fetch (HyperSync zniesie) + backtest-run RAM/czas (dziś ~54 min przy 8GB heap na 365d; pilnować Peak RSS)"
- journal/DECYZJE-2026-08-26.md:677-678 "pule `*-720d` ×4 (base-030, mainnet-005, arb-005, cbBTC-005 + ref USD)"
- journal/DECYZJE-2026-08-26.md:671-672 "jednorazowy eksperyment na 2–3 pulach rdzenia (base-030, mainnet-005, arb-005)"

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The Claude Code sessions coordinated via repository hand-off files because they “cannot see each other” and lacked a persistent direct communication channel for most of the project’s duration. The primary mechanism was `HANDOFF.md` (inboxes) and `CONTEXT.md` (journal), allowing stateless sessions to exchange instructions asynchronously through shared git commits. Direct messaging via `SendMessage` only became available later in the project (from 01.09) when Remote Control connections were active; otherwise, sessions had to fall back to the file-based inbox system or ask the owner to relay messages.

- docs/AI-WORKFLOW.md:27 "Sessions cannot see each other. They coordinated through the repository"
- journal/HANDOFF.md:22-24 "Jeśli `ListAgents` nie widzi drugiej strony (Remote Control akurat rozłączony), wróć do starego trybu: napisz w HANDOFF + poproś Rafała o przekazanie."

### why-05 (answerable yes, evidence yes, coverage full)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The bot and API server ran on the Windows machine because it was configured as a 24/7 always-on server, whereas the Mac was used only for development. The Windows host ran the processes as background services (NSSM) that start at boot and restart after crashes, with sleep disabled to ensure continuous operation. This setup allowed the bot to observe pools and track positions around the clock without user intervention. In contrast, the Mac served as the development environment where code was written, committed, and tested locally before deployment.

- docs/INFRA.md:12 "NSSM service homos-bot bot/observer.ts — prices, signals, proposals"
- journal/TASKS-INFRA.md:33 "serwer Windows: deploy/setup-windows.md"
- docs/CASE-STUDY.md:36 "An observer bot running 24/7 on a Windows machine"

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot never opened, closed, or re-ranged positions automatically because the project was deliberately designed to operate in PROPOSE mode. As stated in the emergency runbook, "Everything runs in PROPOSE mode: the bot executes nothing on its own." Furthermore, the full-auto execution phase (Phase 4) planned for automatic trading and delta-neutral hedging was never built or enabled; specifically, "AUTO mode was never enabled." While semi-automatic execution (Phase 3) was completed, it required human intervention via a browser wallet (Rabby) to sign transactions generated by the bot.

- docs/EMERGENCY.md:9 "Everything runs in PROPOSE mode: the bot executes nothing on its own."
- docs/PLAN.md:168 "4 — full-auto + delta-neutral hedge | Not built as planned. AUTO mode was never enabled"

### why-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The source does not state an explicit reason for choosing a home Windows machine over a VPS. The UI-DESIGN.md notes that while the vision suggested a small VPS (~$5/month), "in the end a home Windows machine running 24/7 took that role." It implies cost or availability factors but offers no specific justification. The journal mentions Dockerization as a future step for a potential VPS deployment, indicating the current setup was chosen pragmatically rather than by design preference.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

A crypto/crypto pair like cbBTC/WETH is riskier because both legs carry full market beta with no stable-asset cushion. In a downturn, the entire position falls with the broader crypto market, resulting in severe absolute losses (e.g., HODL −51.5% APR and maxDD 61.5% over 365 days). While the LP strategy generated strong relative alpha (+11.42 vs HODL) due to low relative volatility between correlated assets, it could not protect against systemic crypto risk, unlike a crypto/stable pair where the stable leg provides a buffer.

- journal/CONTEXT.md:3817-3819 "HODL 50/50 −51.5% APR (maxDD 61.5%!) — para spadła z całym kryptem (obie nogi crypto = pełna beta, ŻADNEJ poduszki stable)."
- journal/RESEARCH-QUEUE.md:47-48 "ABSOLUTNIE rok fatalny (−46…−51%, maxDD ~60%) — obie nogi crypto = pełna beta, zero poduszki stable."

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day window covered a "mostly sideways-to-down" year, which structurally favored range-bound strategies and made them appear profitable. In contrast, the 720-day window included a strong uptrend (bull market). During this trending regime, the volatility estimator failed to capture asset-level dynamics correctly, and narrowing ranges added variance without increasing expected value. Consequently, on the longer history reflecting real market regimes, 0 of 21 configurations passed the validation gate.

- docs/CASE-STUDY.md:57-58 "The 365-day year had flattered range-bound strategies."
- docs/DECISION-LOG.md:22 "The 365-day year (sideways-to-down) flattered the strategy; on 720 d **0 of 21 configurations** passed."

### why-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

In an uptrend, a narrow-range LP loses to HODL because the position becomes imbalanced as the price moves, forcing the LP to sell the appreciating asset (WETH/ETH) and buy the stablecoin. This realized loss—called LVR (Loss-Versus-Rebalancing)—occurs when arbitrageurs trade against the stale pool price. The chunks state that in UP windows, "all strategies lose" because "fees do not cover LVR," meaning the fee income earned is insufficient to offset the cost of this continuous rebalancing against the trend.

- docs/PLAN.md:81 "most LPs in ETH/stablecoin pairs lose to simple HODL, because fees do not cover LVR"
- journal/DECYZJE-2026-08-26.md:551-552 "okna UP = klęska (v1.1: 1/12 wygranych base-030, 2/11 mainnet, 0/5 cbBTC; wszystkie rekordowe straty stamtąd)"

### dated-01 (answerable yes, evidence no, coverage full)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

The first real capital entered on **27 August 2026**. The source describes this day as "dzień decyzji zamknięty" (decision day closed) and notes that the hybrid product was live with both legs opened, specifically referencing the opening of a cbBTC position that day. This follows an earlier recommendation on 19 August for a $6k tranche.

- journal/HANDOFF.md:1169-1170 "docs: dzień decyzji zamknięty — produkt hybryda live, obie nogi otwarte"
- journal/DECYZJE-2026-08-26.md:155 "Rekomendacja Fable z 19.08 w KAPITAL-REKOMENDACJA.md: transza 1 $6k"

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance executed on real capital occurred on **31 August 2026**. The journal notes a specific transaction pair (#5887690 → #5908083) associated with the "narrowing experiment" that began on 31 Aug. The case study confirms this was an explicit operational experiment where the user signed the narrowing, and it involved a two-transaction rebalance.

- journal/CONTEXT.md:1008-1009 "Rebalans eksperymentu 31.08 (#5887690 → #5908083) usunął starą nogę z tej sumy"
- docs/CASE-STUDY.md:81-82 "The narrowing experiment (31 Aug → 11 Sep). The flat detector fired on the cbBTC leg. I signed the narrowing"

### dated-03 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September, two real FlatWide positions were open: #5886957 (base-weth-usdc-030, SZEROKI, $3,468) and #5978579 (base-cbbtc-weth-005, SZEROKI, $2,266). Their combined value was $5,733.13. The report does not provide a specific daily profit/loss for 15 September alone; it lists cumulative PnL from anchors: #5886957 at −$39.98 (since 2026-08-27) and #5978579 at −$92.39 (since 2026-09-11). The overall tranche balance was $5,966.88, a −2.05% loss versus the initial deposit.

- journal/reports/morning-2026-09-15.md:221 "#5886957 | base-weth-usdc-030 | SZEROKI | $3468 | $-1.28 | $-39.98 (od 2026-08-27)"
- journal/reports/morning-2026-09-15.md:222 "#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266 | $-1.91 | $-92.39 (od 2026-09-11)"
- journal/reports/morning-2026-09-15.md:202 "**razem dziś** | **$5966.88**"

### dated-04 (answerable yes, evidence no, coverage full)

**Q:** When did the last backtest finish?

The last backtest run that finished successfully (exit 0) in the provided logs was on 2026-09-09, completing at 04:53:01.139Z. While the 2026-08-26 log shows a backtest-run attempt finishing at 05:00:35.376Z, it failed with exit code 1.

- journal/reports/morning-2026-09-09.md:43 "2026-09-09T04:53:01.139Z krok backtest-run: exit 0"

### dated-05 (answerable yes, evidence no, coverage full)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

Yes. The case study describes converting an LP position into a spot holding as a protective measure. On 18 September 2026, after the liquidity pool was unwound at +0.6%, the rule was revised to "keep the tokens as a spot bet with a −5 % floor and a 24 Oct review." This converted the LP position into an unhedged spot position. The result was that on 21 September, during a short-squeeze rally, the decision was made to "sell everything today," closing the tranche at +5.5% in 25 days.

- docs/CASE-STUDY.md  [NOT-FOUND] ""keep the tokens as a spot bet with a −5 % floor and a 24 Oct review"; on 21 Sep... "sell everything today". The tranche closed at **+5.5 %**"

### dated-06 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The first fully clean nightly run (19/19 steps exit 0) occurred on the night of 20 Aug 2026 [journal/CONTEXT.md:2347#p1]. Errors persisted afterwards; for example, a backtest-run OOM error (exit 134) was found that same night and fixed by increasing Node heap to 8GB [journal/CONTEXT.md:2347#p1]. Later, on 25 Aug, the morning report was shifted from 08:45 to 07:30, and a ledger backfill issue was fixed via HyperSync and token ID seeding [journal/CONTEXT.md:4554#p4].

- journal/CONTEXT.md:2348-2349 "Noc 20.08 = potwierdzenie wczorajszej roboty: pipeline 07:30 19/19 kroków hs-* exit 0, zero asysty"
- journal/CONTEXT.md:4687-4736 "raport przesunięty 08:45→07:30"

### dated-07 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

Yes. On 21 Aug 2026, a deploy script error caused the production machine to switch from NSSM services back to pm2, leaving both running and creating duplicate bot instances. This was fixed by rewriting `deploy.ps1` to use NSSM only. Additionally, during the live capital phase (starting 27 Aug), a two-transaction rebalance initially reverted due to a stale pool state in the UI, which was diagnosed and fixed the same day.

- journal/CONTEXT.md:4312-4314 "CC-Win, widząc `ecosystem.config.js` w commicie, rozsądnie założył zamierzoną migrację nssm→pm2 i zatrzymał usługi NSSM przed startem pm2"
- docs/CASE-STUDY.md:85-86 "a two-transaction rebalance whose first attempt reverted on a slippage check because the UI had priced the mint from a stale pool state — found, fixed, and documented the same day."

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The capital was withdrawn on 18 September 2026. The liquidity positions were unwound around 14:30 UTC (approximately 16:00 PL time), and the USDC was transferred to Kraken at roughly 16:00 PL time that same day. The entire tranche was subsequently closed to EUR between 18 and 21 September 2026.

- journal/CONTEXT.md:227 "USDC → KRAKEN (~16:00 PL): całe USDC ze wszystkich sieci"
- docs/EMERGENCY.md:90-91 "the tranche was closed to EUR on 18–21 Sep 2026"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat on the cbBTC leg from 30 Aug 2026 (22:22Z) until the episode closed on 11 Sep 2026. The only live narrowing episode lasted 11 days, earning ≈ $8.6 in fees before the trend breaker closed it at −$32 versus HODL.

- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep). The flat detector fired on the cbBTC leg."
- docs/DECISION-LOG.md:28 "Episode: 11 days in flat, ≈ $8.6 fees, −$32 vs HODL."

### dated-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

The paper-trading bot rebalanced three times before real capital was deployed. This occurred on the morning of 21 August 2026 (reported at 08:45). The rebalances happened on three ETH/USDC pools: mainnet 0.30, mainnet 0.05, and base 0.30. Each rebalance was triggered when the 24-hour out-of-range hysteresis threshold was met and the payback period was ≤7 days.

- journal/CONTEXT.md:4175-4176 "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30)"

### id-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a specific proposed action (a proposal kind), not a standalone range algorithm. It instructs the bot to narrow an existing position's price range when a 'flat' market condition is confirmed (|gap|<2% for ≥12h). The actual range width used by this action is determined by a product-specific constant (e.g., ±5% or ±6/8%), which was initially calculated using the v1.2 advisor formula (k×σ×√7) but was later changed to use fixed product widths (`productNarrowWidthPct`) via `suggestFixedRange`. The action itself is triggered by a flat detector and results in a specific proposal with a suggested range, cost, and payback period.

- journal/TASKS-UI.md:1138 "kind: 'FLAT_NARROW' (zwężenie do k×σ w POTWIERDZONYM flacie)"
- journal/HANDOFF.md:845-846 "proposeFlatNarrow używa suggestFixedRange z tą szerokością zamiast doradcy k×σ×√7"
- journal/reports/morning-2026-09-19.md:109-110 ""kind": "FLAT_NARROW", "action": "FLAT_NARROW""

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is a wide position. The journal explicitly lists its postura (posture) as "SZEROKI" (wide) in the real positions table. Although open proposals exist to narrow it from ±40% to ±5%, the current active state remains wide.

- journal/reports/morning-2026-09-18.md:275 "| #5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-17.md:261 "| #5978579 | base-cbbtc-weth-005 | SZEROKI"

### id-03 (answerable yes, evidence no, coverage full)

**Q:** Was the range of position #5886957 ever changed, and when?

No, the range of position #5886957 was never changed. In every morning report available in the source chunks (from 2026-08-29 through 2026-09-18), the 'zakres' (range) column for this position consistently lists "w zakresie" (in range). The position's status is always noted as "SZEROKI" (wide), and there are no entries indicating a range modification or exit.

- journal/reports/morning-2026-08-29.md:185 "#5886957 | base-weth-usdc-030 | $3435 | $-4.09 | $-72.82 (od 2026-08-27) | w zakresie"
- journal/reports/morning-2026-09-17.md:260 "#5886957 | base-weth-usdc-030 | SZEROKI | $3432 | $-4.34 | $-75.21 (od 2026-08-27) | $24.65 | $1.18 | w zakresie"

### id-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package was titled "DETEKTOR→POMIAR" and contained two tasks: (1) modifying the observer so that the flat detector stops emitting FLAT_NARROW/FLAT_WIDEN signals, leaving only episode measurement and logs; and (2) a cosmetic update to replace the "k×σ" formula with a fixed percentage label in three places (observer.ts alert text, Telegram proposal format, and the cycleLine UI component). This was about project functionality (changing bot behavior and user-facing labels), not about tests.

- journal/RESEARCH-QUEUE.md:499-500 "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN (zostaje pomiar epizodów + logi)"
- journal/RESEARCH-QUEUE.md:501 "KOSMETYKA "k×σ" (3 kryjówki starej formułki): observer.ts:631"

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

`fetchFreshPool` (in `src/utils/uniswap.ts`) refreshes a pool's on-chain state before executing a rebalance or rotation. It calls `factory.getPool` to obtain the current slot0 and liquidity, then constructs a new `Pool` object with the same tokens and fee tier. It uses a fail-open design: if the factory or RPC call fails, it returns the original (stale) `pool`. The function is invoked inside `useRebalanceExecution` and `useRotateExecution` immediately before `buildMintStep` to ensure mint calculations use current market data rather than stale prices.

- journal/CONTEXT.md:351-352 "`fetchFreshPool` (`src/utils/uniswap.ts`): factory.getPool → slot0 + liquidity → nowy `Pool` z tymi samymi tokenami/fee; fail-open"
- journal/HANDOFF.md:256-257 "`fetchFreshPool` poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open], wpięty w oba hooki przed `buildMintStep`"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2 was the "DOM KASYNA" (Casino House) stage, a research sub-task within the broader E8 section of the HOMOS project. It focused on testing whether liquidity provider pools that act as counter-parties to leveraged traders (specifically GM v2 on Arbitrum and JLP on Solana) generated a positive edge compared to HODL benchmarks. The stage was marked as "ZAMKNIĘTE" (closed) on September 9, 2026.

- journal/RESEARCH-QUEUE.md:324 "**E8.2 „DOM KASYNA" — ZAMKNIĘTE 09.09 (wieczór)."
- journal/CONTEXT.md:694 "E8.2 HOUSE: HLP — Hyperliquid daje ~98 punktów za 3 lata"

### id-07 (answerable yes, evidence no, coverage partial)

**Q:** In which database were the backtest results stored?

The chunks do not name a specific database engine (e.g., SQLite, Postgres). They only state that the database holds the `backtest_run` table as a results index. The ledger was shipped as ndjson + CSV rather than SQLite.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."
- docs/PLAN.md:167 "The ledger shipped as ndjson + CSV export rather than SQLite"

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The application did not calculate the exact tax amount due after closing positions. It provided a CSV export specifically formatted for the Polish income-tax return (PIT-38), containing on-chain transaction history and rates at execution time to support this reporting. The basis for tax was the sale of crypto for fiat, which is a taxable event in Poland. The application tracked closed positions with their results, fees, and gas costs to facilitate this export, but it did not compute the final tax liability itself.

- docs/UI-DESIGN.md:101-102 "CSV export for the Polish income-tax return (PIT-38)"
- docs/EMERGENCY.md:104 "Selling crypto for fiat is a taxable event in Poland"

### na-02 (answerable partial, evidence no-evidence, coverage none)

**Q:** What were the backtest results for the Solana network?

The provided chunks do not contain backtest results for the Solana network. The project's backtests focus on EVM chains (Ethereum mainnet, Arbitrum, Base, Optimism) using Uniswap v3 pools. While the journal mentions a Solana-based index (JLP/Jupiter) in the context of a separate benchmark analysis (E8), it is not described as part of the project's own Uniswap v3 backtest pipeline, and no specific backtest performance metrics for Solana are reported.


### na-03 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The source does not state a single earnings figure for the moment of switching to shorts. It records two test GMX short positions: (1) A $150 position held ~18h showed funding +$0.06, borrow fee $0.00, but price PnL −$0.31 and total costs ~$1.08 [CONTEXT.md:3519]. (2) A $15 test position on 20 Aug had entry $2274.43 and closed for +14.96 USDC return, with a noted cost of ~$0.40 [CONTEXT.md:2347].

- journal/CONTEXT.md  [NOT-FOUND] "funding +$0.06 DLA NAS (short DOSTAŁ funding...)"
- journal/CONTEXT.md:2347  [UNKNOWN-CHUNK] "entry $2274.43) → [Zamknij short →] → executeOrder zwrócił +14.96 USDC"

### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The provided chunks do not state the monthly electricity cost for the Windows server. They mention that a home Windows machine running 24/7 was used instead of a VPS (which would have cost ~$5/month), and note power settings like disabled sleep, but no specific electricity bill or cost figure is given.

- docs/UI-DESIGN.md:47-48 "in the end a home Windows machine running 24/7 took that role."

### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks do not contain any results for October 2026. The project ran from August to September 2026, with the final result recorded on 21 Sep 2026 as "≈ +5.5 % (+$336), 25 days" (docs/CASE-STUDY.md:141). All journal entries in the chunks are dated between August and September 2026, with no data extending into October.

- docs/CASE-STUDY.md:149 "Final (21 Sep, in EUR on exchange) | ≈ +5.5 % (+$336), 25 days"

### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided chunks do not state how many tokens were consumed building the project.


### na-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** What was the structure of the SQL database holding the backtest data?

The SQL database did not hold the backtest data itself; it held only a results index. The raw tick-level swaps remained in NDJSON files (`data/cache/*.ndjson`) because the backtest reads them sequentially and storing them in the database would bloat it by orders of magnitude. The database's sole role was to store the `backtest_run` table, which served as an index of backtest results.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."

