# Answers with citations: k = 10

Date 2026-11-11. Golden set v1.4. Generator `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=ANSWER_SYSTEM,cite=quote)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "The next review is planned for 24.09 (September 24, 2026)."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 67 | 60 | 7 | 0 | 0 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 65% (17/26) | 85% (17/20) | 0% (0/6) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 2 | 1 | 2 | 0 |
| yes / evidence given | 18 | 2 | 0 | 0 |
| yes / evidence not given | 2 | 3 | 1 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 334968, output 8756 tokens; $0; generation median 12555 ms, p95 16844 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

The project did not use frequent narrowing because backtests showed it underperformed passive wide ranges. Narrowing earned more fees (e.g., $2169 vs $541 on cbBTC) but incurred higher Impermanent Loss (IL) from re-centering swaps, which ate the gains. Walkforward analysis on 720 days showed passive wide ranges won 63% of windows versus 43% for narrowing, even in flat regimes where narrowing theoretically excels. The mechanism is described as "short gamma": every re-centering realizes divergence. Additionally, a "no-swap" variant was rejected as hidden trend-following that missed 100% of up-market windows.

- journal/CONTEXT.md  [NOT-FOUND] "zwężanie zarobiło DUŻO więcej fee... a skończyło NIŻEJ. Czyli IL i re-centering zjadły ~$1.9k"
- journal/CONTEXT.md:1705-1706 "Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję."
- journal/CONTEXT.md  [NOT-FOUND] "WARIANT BEZ SWAPU OBALONY NA 720d: to ukryty trend-following"

### why-02 (answerable yes, evidence no, coverage partial)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The chunks do not state that capital was kept small specifically because ETH and BTC were rising. Instead, the strategy was designed to underperform HODL during rising markets because the liquidity pool sells the rising asset (approx. 70% exposure), meaning the strategy earns less than holding during price increases. The decision to keep capital in crypto was driven by a bet on further potential growth, not a desire to limit size due to the rise itself.

- journal/CONTEXT.md:999-1000 "przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma)"
- journal/CONTEXT.md:220-221 "ETH/cbBTC NIE sprzedajemy — „zostawić w krypto, bo może jeszcze urośnie"

### why-03 (answerable yes, evidence no, coverage partial)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The 720-day backtests were limited to a small number of pools (specifically cbBTC and base-030, plus a few others in the 13-pool scan) because these were the primary candidates selected for detailed validation. The project focused on these specific pools to rigorously test the strategy against the 'strong uptrend' included in the 720-day window, which revealed that 0 of 21 configurations passed the gate, unlike the 365-day window that flattered range-bound strategies. The choice of these pools allowed for a clean comparison of passive wide ranges versus narrowing strategies under realistic market conditions, including the median flat-episode lengths observed.

- docs/CASE-STUDY.md:56-57 "Extending the window to 720 days killed the strategy. On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate."
- journal/RESEARCH-QUEUE.md:986-987 "Sweep: 365d (Fable) + 720d (CC-Win, 8 przebiegów). ΣEV zwężania na 720d — cbBTC (32 epiz., med 7.7d)"

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The Claude Code sessions could not see or message each other directly because they ran in separate applications (e.g., iTerm on Mac, Windows services, Cowork cloud). The journal notes that direct messaging was empirically tested and found impossible initially, so the team used repository files as the communication bus. Later, direct pings via `SendMessage` became possible when Remote Control was connected, but file-based hand-offs remained the primary coordination mechanism for reliability and history tracking.

- journal/CONTEXT.md:3278-3279 "sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej sesji (osobne aplikacje)"
- docs/AI-WORKFLOW.md:27 "Sessions cannot see each other. They coordinated through the repository"

### why-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The bot and API server ran on the Windows machine because it was available 24/7, whereas the Mac was a laptop that would sleep or shut down. The project documentation explicitly notes that "a closed laptop means a dead autopilot," making the Mac unsuitable for continuous operation. The Windows machine filled the role of a persistent server, allowing the bot to run constantly while the Mac was used for development and UI work.

- docs/UI-DESIGN.md:46 "a closed laptop means a dead autopilot. The bot is a separate process."
- docs/CASE-STUDY.md:36 "An observer bot running 24/7 on a Windows machine"

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot never executed positions autonomously because full-auto mode was never enabled or built. The project achieved "semi-automatic execution" where the bot generated signals and ready transactions, but a human had to sign them in the browser wallet (Rabby). The UI explicitly displayed "OBSERWUJ — bot niczego nie wykonuje" (OBSERVE — bot executes nothing), confirming the bot only monitored and proposed actions. While automatic execution was technically possible (designed as "AUTO" mode with limits), it was not implemented; only the "PROPOSE" workflow was active, requiring manual approval and signature for every open, close, or re-range action.

- docs/PLAN.md  [NOT-FOUND] "Phase 3 — semi-automatic execution (signal → ready transaction → signature in Rabby) | Done: rebalance, rotation and hedge sequences signed in the browser wallet."
- docs/PLAN.md  [NOT-FOUND] "Phase 4 — full-auto + delta-neutral hedge | Not built as planned. AUTO mode was never enabled"
- journal/TASKS-UI.md:114 "Stopka: "OBSERWUJ — bot niczego nie wykonuje" + przycisk JSON (patrz wyżej)."
- docs/UI-DESIGN.md:58 "on signal | open/rebalance/close a position | PROPOSE: a proposal for approval; AUTO (not built): execution within limits"

### why-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The project used a home Windows machine because it was already available and functional, whereas the VPS was only a suggested option. The documentation notes that while the vision suggested a small VPS (~$5/month), a home Windows machine running 24/7 ultimately took that role. The decision was made on August 10, 2026, to use the owner's Windows desktop as the 24/7 server, with clients accessing it over LAN or VPN. The home machine was chosen to avoid the overhead of Docker/WSL2 (1–2 GB RAM) and to leverage existing hardware and setup, with a future VPS deployment planned via Docker.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."
- docs/INFRA.md:3 "Decided 10 Aug 2026: the server is the owner's Windows desktop running 24/7"
- journal/RESEARCH-QUEUE.md:745-746 "Docker Desktop/WSL2 = 1–2 GB RAM narzutu, zbędny koszt na obecnym sprzęcie"

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

A crypto/crypto pair like cbBTC/WETH was considered riskier because both legs carry full crypto beta, offering no stable-asset cushion. In a down market, the entire position declines with the broader crypto market, leading to high absolute drawdowns (e.g., ~61.5% maxDD for a 50/50 HODL). In contrast, a crypto/stable pair includes a stable leg that acts as a buffer, reducing the overall exposure to crypto market beta. While the crypto/crypto pair can generate higher relative alpha (LP vs HODL) due to correlated price movements keeping the position in range, its absolute risk profile is higher because there is no diversification away from the crypto asset class.

- journal/CONTEXT.md:3818-3819 "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable"
- journal/RESEARCH-QUEUE.md:47-48 "obie nogi crypto = pełna beta, zero poduszki stable"
- docs/ALGORITHM.md:87 "the pair is 100% crypto beta"

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day window covered a "mostly sideways-to-down" year that "flattered range-bound strategies," while the 720-day window included a "strong uptrend" where range strategies underperformed. Specifically, the 365-day data masked the fact that passive wide ranges were essentially equivalent to HODL plus fees minus impermanent loss, and narrowing added variance without increasing expectancy. In the 720-day tests, which included bullish regimes, 0 of 21 configurations passed the gate because the strategies struggled in UP markets (0–25% win rates), whereas they performed better in flat or down markets. The longer period revealed that the apparent profitability in the shorter window was an artifact of the market regime, not a robust strategy edge.

- docs/CASE-STUDY.md:57-58 "The 365-day year had flattered range-bound strategies."
- journal/CONTEXT.md:4777 "365d wyglądało lepiej głównie dlatego, że okno było spadkowo-boczne."
- journal/DECYZJE-2026-08-26.md:558 "Interpretacja: 365d schlebiało strategii (rok bez bulla)"

### why-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

In an uptrend, a concentrated LP position exits the price range as the asset rises, forcing the strategy to sell the appreciating asset (ETH) to maintain the target ratio. This realizes a loss of upside (impermanent loss) that exceeds the fees earned, because the position effectively acts as a short gamma bet. The journal notes that in up-regime windows, the "noswap" variant had 0% wins and the swap variant lost significantly, confirming that the cost of rebalancing or missing the rally outweighs fee income.

- journal/CONTEXT.md:1825-1826 "up 0% wygranych, śr. −13.91, najgorsze −17.86"
- docs/CASE-STUDY.md:108-109 "you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn"

### dated-01 (answerable yes, evidence no, coverage partial)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

The chunks do not state the exact date the first real capital entered the application. They only note that the project moved to verifying conclusions "with real capital" after backtests (docs/CASE-STUDY.md:44) and that a capital recommendation for a $6k tranche was drafted on 26.08 (journal/DECYZJE-2026-08-26.md:153), but no entry date is given.

- docs/CASE-STUDY.md:63-64 "The rest of the project was about verifying it with real capital under real operational constraints"
- journal/DECYZJE-2026-08-26.md:153 "KAPITAŁ — pierwsze realne wejście LP (główna decyzja)"

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance executed on real capital occurred on 31 August 2026. The journal notes that the experimental narrowing episode started that day, and the first combat transaction (a rebalance/narrowing) was executed around 13:00 after a hotfix was deployed. The case study confirms this was part of the "narrowing experiment (31 Aug → 11 Sep)" where the flat detector fired and the user signed the narrowing.

- journal/CONTEXT.md:1228-1229 "~13:0x — **EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA.**"
- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)."

### dated-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September 2026, two real positions were open: #5886957 (base-weth-usdc-030, equity $3,468) and #5978579 (base-cbbtc-weth-005, equity $2,266). Their PnL from anchor was -$39.98 and -$92.39 respectively. Six paper trading pools were also open, with a combined PnL of +$4,931.

- journal/reports/morning-2026-09-15.md:219 "PnL od kotwicy | fee narosłe"
- journal/reports/morning-2026-09-15.md:238 "RAZEM | | $64931 | +$4931"

### dated-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the last backtest finish?

The last backtest run finished at 2026-09-23T05:03:07.956Z. This is recorded in the pipeline log for that date, where the step `backtest-run` exited with code 0 at that timestamp.

- journal/reports/morning-2026-09-23.md:43 "2026-09-23T05:03:07.956Z krok backtest-run: exit 0"

### dated-05 (answerable yes, evidence no, coverage full)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

Yes. On 2026-09-11, the narrow cbBTC position #5908083 was closed and converted into a wider position #5978579 (a FLAT_WIDEN rebalance). The result was a net loss of −$32.08 versus holding the initial deposit, because the position exited through the edge (100% in cbBTC) and impermanent loss (~−$45) exceeded the fees earned (~$12.6). The journal notes this was a single illustrative episode consistent with the 720-day falsification that flat positions end via the edge.

- journal/CONTEXT.md:412-452 "EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579)"
- journal/CONTEXT.md:447 "netto vs HODL wkładu po kursie dziś: −$32.08"

### dated-06 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The first nightly run to complete without errors was on 2026-08-22, described as "Pierwszy nocny przebieg po naprawach: wszystko zielone" (First nightly run after fixes: all green). Subsequent runs on 2026-08-29, 09-01, 09-05, 09-06, and 09-17 also completed with "porażki: BRAK" (failures: NONE). However, a backtest-run error occurred on 2026-08-26, exiting with code 1 twice. The cause was a crash diagnosed by CC-Win, specifically a "spread Math.min/max na milionach punktów w svgChart" (spread Math.min/max on millions of points in svgChart). The fix involved using a loop/reduce for series instead of the problematic operation, and the run was re-ordered.

- journal/CONTEXT.md:4411 "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE"
- journal/CONTEXT.md:2330-2332 "Crash nocnego backtest-run zdiagnozowany przez CC-Win samodzielnie (0257a7a: spread Math.min/max na milionach punktów w svgChart"
- journal/reports/morning-2026-09-01.md:64 "=== PIPELINE KONIEC — porażki: BRAK ==="

### dated-07 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

The chunks do not describe specific infrastructure failures or crashes. They only note that the bot ran on a Windows server with NSSM services and that a SQLite database was designed but never implemented. No changes were made to the production machine while capital was invested; the only configuration change was setting `SIGMA_MODE` to `grid15` on 29 Aug, which was before the 27 Aug–21 Sep live capital period ended, but the capital was deposited on 27 Aug, so this change occurred after the deposit. However, the question asks if anything was changed *while* capital was invested. The `SIGMA_MODE` change happened on 29 Aug, after the 27 Aug deposit. The journal states: "σ grid15 WDROŻONA... restart 10:15:53Z" on 29 Aug. The capital was deposited on 27 Aug. So yes, a change was made while capital was invested.

- docs/INFRA.md:31-32 "A SQLite database was designed ([`DB-SCHEMA.md`](DB-SCHEMA.md)) but never implemented."
- journal/CONTEXT.md:1558-1559 "σ grid15 WDROŻONA (CC-Win: NSSM tylko dla homos-bot, restart 10:15:53Z"
- docs/CASE-STUDY.md:69 "I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The capital was withdrawn on 21 September 2026. The tranche was fully closed to EUR on that day: 1,22014 ETH was sold for EUR at ~19:00 PL time, and the USDC portion (including 1,870.95 USDC moved earlier on 18 September) was also converted to EUR, totaling ~5,605 EUR (≈ $6,428).

- journal/CONTEXT.md:101 "TRANSZA 1 ZAMKNIĘTA — pełne wyjście do EUR (decyzja Rafała ~14:00 PL „dziś z całością", wykonanie ~19:00 PL)"
- docs/EMERGENCY.md:90-91 "the tranche was closed to EUR on 18–21 Sep 2026"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat on the cbBTC leg starting 30 Aug 22:22Z, with the first FLAT_NARROW proposal issued 31 Aug ~10:22Z. The only live narrowing episode (position #5908083) lasted 11 days, from 31 Aug to 11 Sep 2026.

- journal/CONTEXT.md:1135-1136 "Zegar flatu cbBTC tyka od 30.08 22:22Z"
- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)."
- journal/CONTEXT.md  [NOT-FOUND] "stara #5908083 (wąska ±5%, 31.08→11.09, 11 dni w flacie)"

### dated-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

The paper-trading bot rebalanced three times before real capital was deployed. These rebalances occurred on 21 August 2026, specifically reported in the 08:45 morning report that day. The pools involved were ETH/USDC on mainnet (0.30 range), ETH/USDC on mainnet (0.05 range), and ETH/USDC on Base (0.30 range). Real capital was not deployed until 27 August 2026.

- journal/CONTEXT.md:4175-4176 "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30)"
- docs/CASE-STUDY.md:69 "I deposited 6 092 USDC on Base"

### id-01 (answerable yes, evidence yes, coverage full)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a specific position action (proposal kind), not a generic range algorithm. It is a concrete proposal to narrow an existing Uniswap v3 position's range during a confirmed 'flat' price episode. The notes describe it as a 'Product FlatWide' action: 'zwężenie z ±40% do ±5%' (narrowing from ±40% to ±5%) with a fixed product width, triggered when the price gap is confirmed flat (|gap|<2% for ≥12h). It is paired with a FLAT_WIDEN action to widen back out if the gap exceeds the exit threshold.

- journal/reports/morning-2026-09-19.md  [NOT-FOUND] "kind: FLAT_NARROW, action: FLAT_NARROW, symbol: WETH-cbBTC, suggestedRange: { tickLower: -265130, tickUpper: -264150"
- journal/CONTEXT.md:1156-1157 "EKSPERYMENT ZWĘŻENIA (decyzja Rafała, przy świadomości ujemnego EV z bramki 720d): dzisiejsze FLAT_NARROW na cbBTC PODPISUJEMY"
- journal/CONTEXT.md:1576-1577 "propozycja FLAT_NARROW niesie WŁASNY paybackDays (liczony z realnego L i fee-yieldu puli)"

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is a wide position. In the daily reports, its "postura" (posture) is consistently listed as "SZEROKI" (Polish for WIDE). Additionally, the open proposals for this token describe a "FLAT_NARROW" action that would narrow the existing range from ±40% down to ±5%, confirming its current state is wide.

- journal/reports/morning-2026-09-16.md:242 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-17.md:139 "flat POTWIERDZONY (|gap|<2% ≥12h) — zwężenie z ±40% do ±5%"

### id-03 (answerable yes, evidence no, coverage none)

**Q:** Was the range of position #5886957 ever changed, and when?

The provided chunks do not contain information about whether the range of position #5886957 was changed or when. The reports consistently list the position's status as "w zakresie" (in range) and its postura as "SZEROKI" (wide), but they do not record any specific range adjustment events or dates.


### id-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package, titled "DETEKTOR→POMIAR" (Detector→Measurement), contained two tasks. First, the observer's flat detector should stop emitting FLAT_NARROW and FLAT_WIDEN signals, leaving only episode measurement and logs. Second, cosmetic updates to replace the "k×σ" formula in three places: observer.ts (Telegram alert), the Telegram proposal format (changing "$" to pool unit), and cycleLine.tsx (changing the label to "WĄSKI ±5% (flat)"). It was about project functionality (specifically observer logic and UI labels), not tests.

- journal/RESEARCH-QUEUE.md:499-500 "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN (zostaje pomiar epizodów + logi)"
- journal/RESEARCH-QUEUE.md:501 "KOSMETYKA "k×σ" (3 kryjówki starej formułki): observer.ts:631"

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

The function `fetchFreshPool` constructs a fresh Uniswap v3 `Pool` object by calling `factory.getPool` to get the pool address, then reading `slot0` and `liquidity` from the chain. It is designed with a fail-open behavior (likely returning null or a default if the fetch fails). It is wired into both hooks before the `buildMintStep` function is called.

- journal/HANDOFF.md:256-257 "fetchFreshPool poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open], wpięty w oba hooki przed buildMintStep"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2 was the “dom kasyna” (casino house) project stage, testing LP pools where the LP acts as the counterparty to leveraged traders (e.g., GMX v2, Jupiter Lend, GMX v1/GLP). It was closed on 09.09 with a verdict that the class has a real but declining edge (≈+5–7%/r currently) versus HODL, suitable for observation but not for capital deployment.

- journal/RESEARCH-QUEUE.md:324 "E8.2 „DOM KASYNA” — ZAMKNIĘTE 09.09 (wieczór). Na czystych danych (kotwica 12:00 UTC, 100% pokrycia)"
- journal/CONTEXT.md:482-484 "WERDYKT E8.2 (ZAMKNIĘTE): klasa „dom kasyna” (LP kontrpartner perp, wycena po oraklach, brak LVR) ma realny, powtarzalny edge nad HODL koszyka"

### id-07 (answerable yes, evidence yes, coverage full)

**Q:** In which database were the backtest results stored?

The backtest results were not stored in a database. According to the project documentation, raw tick-level swaps remained in NDJSON files, and the database only held the `backtest_run` table, which served as a results index.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The application did not calculate a tax amount. It recorded transaction data (including gas, fees, and USD values) to support Polish tax reporting, but the actual tax calculation was not implemented. The basis for potential tax reporting is the on-chain transaction history and exchange ledger exports, as required for Polish PIT-38 income tax returns.

- docs/EMERGENCY.md:104-106 "Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax return, PIT-38); export the exchange ledger as CSV and keep it with the on-chain transaction history from the exit day."
- journal/TASKS-LEDGER.md:34 "import do SQLite gdy dojdzie warstwa podatkowa PLN"

### na-02 (answerable partial, evidence no-evidence, coverage none)

**Q:** What were the backtest results for the Solana network?

The chunks do not contain backtest results for the Solana network. The backtests described cover Ethereum (mainnet), Base, Arbitrum, and Optimism pools (e.g., "mainnet-usdc-weth", "base-cbbtc-weth", "arbitrum-weth-usdc"). Solana is mentioned only in the context of the Jupiter Lending Protocol (JLP), which is a yield product benchmarked against the strategy, not a Uniswap v3 liquidity-provision backtest.

- journal/reports/morning-2026-09-05.md:35 "OK=[arbitrum-usdc-usdt-001, arbitrum-weth-usdc-005-365d, arbitrum-weth-usdc-005-720d, arbitrum-weth-usdc-030-365d, base-cbbtc-weth-005-365d"
- journal/CONTEXT.md:570-572 "JLP (Jupiter, Solana, 2023-11→2026-09, 1019 dni, bez incydentów): mix 90/30 śr +6.52%/okno, 72%"

### na-03 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The provided chunks do not state how much the GMX positions earned at the moment of switching from crypto pairs to shorts. The chunks describe test GMX shorts (e.g., a $15 test on 20.08 and a ~$150 test on 18.08) and a proposed $1,165 short hedge on 12.09, but they do not document a specific “switching” event or the earnings of GMX positions at that moment.


### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The provided chunks do not state the monthly electricity cost for the Windows server. The documentation mentions that the project originally envisioned a small VPS at ~$5/month, but ultimately used a home Windows machine running 24/7 (docs/UI-DESIGN.md:35). No figure for electricity costs is given.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."

### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks do not contain any results for October 2026. The project journal and documentation entries end in September 2026 (e.g., the latest paper-trading snapshot is dated 2026-09-01, and the final pipeline logs are from 2026-09-16). No data, reports, or outcomes for October 2026 are present in the source material.


### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided chunks do not state how many tokens were consumed building the project. They mention token addresses, token balances, and token order fixes (e.g., “BŁĄD KOLEJNOŚCI TOKENÓW cbBTC/WETH”), but not token consumption metrics.


### na-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** What was the structure of the SQL database holding the backtest data?

The database (homos.db, SQLite via better-sqlite3) does not store raw backtest data; it holds only the backtest_run table, which is a results index. backtest_run has columns: id (INTEGER PK), ts (INTEGER), kind (TEXT: walkforward|sweep|run|pegged), pool_id (TEXT), params (TEXT/JSON), file (TEXT, JSON path in backtest/results/), and git_commit (TEXT). Raw tick-level swaps remain in ndjson files (data/cache/*.ndjson) because the backtest reads them sequentially and the database would bloat by orders of magnitude.

- docs/DB-SCHEMA.md  [NOT-FOUND] "CREATE TABLE backtest_run ( id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, kind TEXT NOT NULL, pool_id TEXT, params TEXT, file TEXT NOT NULL, git_commit TEXT"
- docs/DB-SCHEMA.md:168-169 "The database holds only backtest_run (results index)."
- journal/RESEARCH-QUEUE.md:735 "import przyrostowy do data/homos.db (better-sqlite3)"

