# Answers with citations: k = 10

Date 2026-11-11. Golden set v1.4. Generator `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "According to the inbox note, the next review is planned for 24.09 (September 24)."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 77 | 74 | 3 | 0 | 0 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 69% (18/26) | 90% (18/20) | 0% (0/6) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 1 | 2 | 2 | 0 |
| yes / evidence given | 18 | 2 | 0 | 0 |
| yes / evidence not given | 2 | 2 | 2 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 349044, output 8487 tokens; $0; generation median 12777 ms, p95 17572 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

The 720-day walkforward and full-period backtests showed that active re-centering (narrowing) consistently underperformed passive wide ranges, even in flat regimes where it theoretically had an advantage. The mechanism was that while narrowing earned significantly more fees, the realized impermanent loss (IL) and re-centering costs consumed those gains and then some. For example, on cbBTC, narrowing earned $2,169 in fees but incurred $2,097 in IL, resulting in only +$10 vs HODL, compared to +$307 for the passive strategy. The journal notes that 'zwężanie przegrywa nawet tam, gdzie miało wygrywać' (narrowing loses even where it was supposed to win) and that 'IL z re-centeringu... zjadł ~$1.9k... ponad przyrost fee' (IL from re-centering ate ~$1.9k... more than the fee increase). Therefore, the team stayed wide to avoid realizing IL without sufficient fee compensation.

- journal/CONTEXT.md  [NOT-FOUND] "zwężanie przegrywa nawet tam, gdzie miało wygrywać"
- journal/CONTEXT.md  [NOT-FOUND] "IL z re-centeringu (65 i 88 rebalansów) zjadł ~$1.9k i ~$2.9k ponad przyrost fee"
- journal/CONTEXT.md:1757 "cbBTC FlatOnly ±5% | $2169 | $62 | $2097 | **+$10**"
- journal/CONTEXT.md:1756 "cbBTC Pasywny ±50% | $541 | $0 | $234 | **+$307**"

### why-02 (answerable yes, evidence no, coverage partial)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The chunks do not state an explicit reason for keeping the capital commitment small despite ETH and BTC rising. They note that the strategy underperforms HODL in rising markets ("przegrany o $500–1,100" in crashes, but "zarabiamy MNIEJ niż HODL" in growth) and that the tranche was small (≈$6k), but no direct causal explanation for the size choice is given.

- journal/CONTEXT.md:999 "przy wzroście zarabiamy MNIEJ niż HODL"
- journal/CONTEXT.md:191 "bilans $5 966"

### why-03 (answerable yes, evidence no, coverage none)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The chunks do not state a specific reason why the 720-day backtests were limited to only a few pools. They confirm that 720-day tests were run on specific pools (e.g., cbBTC, base-030, and a 13-pool scan) and that the 720-day window was chosen because the 365-day window "flattered" the strategy, but the rationale for restricting the pool count is not provided.


### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The sessions could not see each other directly because they ran in separate applications that were not reachable via direct messaging. As documented on 2026-08-10, an empirical check (ListAgents) confirmed that "sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej sesji (osobne aplikacje)." Consequently, the team decided to keep repository files as the communication bus, using HANDOFF.md as a lightweight per-agent inbox to reduce the need for the human owner to manually relay messages. Direct pings via SendMessage were only added later (from 01.09) when Remote Control was connected, with file-based hand-offs serving as the fallback.

- journal/CONTEXT.md:3278-3279 "sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej sesji (osobne aplikacje)"
- journal/CONTEXT.md:3279-3280 "Decyzja: zostajemy przy plikach repo jako szynie komunikacji"
- journal/CONTEXT.md:3281-3282 "redukuje rolę Rafała jako routera"
- journal/HANDOFF.md:19 "PING CC-Mac↔CC-Win (od 01.09): gdy obie sesje mają Remote Control"

### why-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The bot and API server ran on the Windows machine because the browser (or a laptop) cannot serve as a reliable automation engine: "a closed laptop means a dead autopilot." The bot needed to be a separate, always-on process. The design originally envisioned a small VPS (~$5/month), but "in the end a home Windows machine running 24/7 took that role," serving as the 24/7 server while the Mac remained the development machine.

- docs/UI-DESIGN.md:46 "a closed laptop means a dead autopilot"
- docs/UI-DESIGN.md:47-48 "in the end a home Windows machine running 24/7 took that role"
- docs/CASE-STUDY.md:36 "An observer bot running 24/7 on a Windows machine"

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot was designed as a read-only observer; its footer explicitly stated "OBSERWUJ — bot niczego nie wykonuje" (OBSERVE — the bot executes nothing). Execution was intentionally semi-automatic: Phase 3 delivered "signal → ready transaction → signature in Rabby," meaning the bot prepared transactions but a human signed them in the browser wallet. Phase 4, which would have enabled "full-auto + delta-neutral hedge," was "Not built as planned. AUTO mode was never enabled." The UI design confirmed this: on-signal actions were "PROPOSE: a proposal for approval; AUTO (not built): execution within limits." Thus, the bot never opened, closed, or re-ranged positions autonomously because automatic execution was never implemented.

- journal/TASKS-UI.md:114 "OBSERWUJ — bot niczego nie wykonuje"
- docs/PLAN.md:167 "semi-automatic execution (signal → ready transaction → signature in Rabby)"
- docs/PLAN.md:168 "AUTO mode was never enabled"
- docs/UI-DESIGN.md:58 "PROPOSE: a proposal for approval; AUTO (not built): execution within limits"

### why-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The documentation states that the original vision suggested a small VPS (approximately $5/month), but in the end a home Windows machine running 24/7 took that role. The chunks do not provide a specific reason for rejecting the VPS in favor of the home machine, only noting that the home machine was the one actually deployed.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

A crypto/crypto pair like cbBTC/WETH carries full market beta because both legs are crypto assets, offering no stable-coin cushion. During downturns, the entire position moves with the broader crypto market, leading to high drawdowns (e.g., -51.5% APR and 61.5% max drawdown for cbBTC/WETH). In contrast, a crypto/stable pair provides diversification because the stable leg does not decline with crypto prices, effectively acting as a buffer or 'cushion' against market drops.

- journal/CONTEXT.md:3818-3819 "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable"
- journal/RESEARCH-QUEUE.md:47-48 "obie nogi crypto = pełna beta, zero poduszki stable"
- journal/KAPITAL-REKOMENDACJA.md:38 "w spadkowym reżimie to pełna beta krypto (żadna noga nie jest stable)"
- docs/ALGORITHM.md:87 "the pair is 100% crypto beta"

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day window covered a "mostly sideways-to-down year" that "flattered range-bound strategies," while the 720-day window included a "strong uptrend" where narrow LP strategies underperformed HODL. Five independent analyses agreed that a passive wide range was roughly equivalent to HODL plus fees minus some impermanent loss, and that narrowing added variance without adding expectancy at the observed flat-episode lengths (median 7.7 days).

- docs/CASE-STUDY.md:46 "mostly sideways-to-down year"
- docs/CASE-STUDY.md:57 "included a strong uptrend"
- docs/CASE-STUDY.md:58 "flattered range-bound strategies"
- docs/CASE-STUDY.md:60-61 "narrowing added variance without adding expectancy"

### why-10 (answerable yes, evidence yes, coverage full)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

The LP earned less in fees during an uptrend because concentrated liquidity acts as short gamma: the position sells into rallies, so as the price moves out of the narrow range, the LP is out-of-range and stops earning fees, while the realized impermanent loss (IL) from re-centering further reduces net returns. The journal notes that "w trendach remis z HODL zamiast przegranej" (in trends it's a tie with HODL instead of a loss) only after removing the main flaw, and that "beta dominuje, hybryda to 'HODL z yieldem'" (beta dominates; the hybrid is HODL with yield), meaning the fee income is insufficient to offset the opportunity cost of not holding the asset as it appreciates.

- journal/DECYZJE-2026-08-26.md:144 "w trendach remis z HODL zamiast przegranej"
- journal/CONTEXT.md:1689-1690 "Beta dominuje, hybryda to „HODL z yieldem""

### dated-01 (answerable yes, evidence no, coverage none)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

The chunks do not state when the first real capital entered through the application. The closest reference is the 26.08 decision to enter real LP capital (transza 1 $6k Base), but no chunk records the actual date of the first real-capital entry via the app. The DB schema note says the real-capital tables were 'empty until Phase 2/3', and the case study says the project was about 'verifying it with real capital', but neither gives a specific date for the first entry through the application.

- journal/DECYZJE-2026-08-26.md:153 "KAPITAŁ — pierwsze realne wejście LP (główna decyzja)"
- docs/DB-SCHEMA.md  [NOT-FOUND] "REAL CAPITAL (empty until Phase 2/3, but defined now because it is the foundation for taxes; raw amounts as TEXT)"
- docs/CASE-STUDY.md:64 "verifying it with real capital under real operational constraints"

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance executed on real capital occurred on 31 August 2026, around 13:00. The journal records that after a hotfix was deployed, the rebalance sequence completed successfully: "~13:0x — EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA" (the episode started: the first combat transaction of the product executed). This involved closing an old position and minting a new one (mint #5908083) in the cbBTC/WETH pool.

- journal/CONTEXT.md:1228-1229 "~13:0x — EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA"
- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)"

### dated-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September 2026, two real LP positions were open (FlatWide product): #5886957 (base-weth-usdc-030, SZEROKI, value $3468, PnL from anchor -$39.98) and #5978579 (base-cbbtc-weth-005, SZEROKI, value $2266, PnL from anchor -$92.39). Combined value was $5733.13. Six paper-trading pools were also open, totaling equity $64931 with cumulative PnL +$4931.

- journal/reports/morning-2026-09-15.md:221 "#5886957 | base-weth-usdc-030 | SZEROKI | $3468"
- journal/reports/morning-2026-09-15.md:222 "#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266"
- journal/reports/morning-2026-09-15.md:238 "**RAZEM** | | **$64931** | +$4931"

### dated-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the last backtest finish?

The last backtest finished on 2026-09-23 at 05:03:07.956Z.

- journal/reports/morning-2026-09-23.md:43 "2026-09-23T05:03:07.956Z krok backtest-run: exit 0"

### dated-05 (answerable yes, evidence no, coverage full)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

Yes. On 2026-09-11, the FLAT_WIDEN procedure closed a narrow cbBTC position (#5908083, 31.08 wide) and opened a wider one (#5978579, 11.09 wide). The narrow position exited "100% w cbBTC — wyjście przez krawędź" (100% in cbBTC — exit through the edge). The result was a net loss of −$32.08 versus holding the deposit, because IL (≈−$45) outweighed fees (+$12.6). The journal notes this was a single episode (n=1), consistent with the 720d falsification that "flat ends through the edge," and calls it an illustration, not a test.

- journal/CONTEXT.md:412-452 "EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579)"
- journal/CONTEXT.md:446 "100% w cbBTC — wyjście przez krawędź"
- journal/CONTEXT.md:447 "netto vs HODL wkładu po kursie dziś: −$32.08"
- journal/CONTEXT.md:449-450 "Zgodne z falsyfikacją 720d („flat kończy się przez krawędź"); jeden epizod = ilustracja, nie test."

### dated-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The first nightly run to complete without errors was on 2026-08-22, described as "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE". Errors did occur afterwards: on 2026-08-26, "backtest-run 2× exit 1" happened after the heap was raised to 12288. CC-Win diagnosed the crash as caused by "spread Math.min/max na milionach punktów w svgChart" and a retry was ordered. Subsequent logs (e.g., 2026-08-29, 2026-09-01) show "PIPELINE KONIEC — porażki: BRAK", indicating the fix held.

- journal/CONTEXT.md:4411 "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE"
- journal/CONTEXT.md:2337-2338 "backtest-run 2× exit 1"
- journal/CONTEXT.md:2332 "spread Math.min/max na milionach punktów w svgChart"
- journal/reports/morning-2026-08-29.md:48 "PIPELINE KONIEC — porażki: BRAK"

### dated-07 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

The chunks do not describe any infrastructure problems that occurred while the capital was already invested (27 Aug – 21 Sep 2026). The 29 Aug σ-mode fix (grid15 vs swap) was applied before the first narrowing and is noted as a pre-live correction. The 21 Sep entry states “BOT / INFRA: bez zmian dziś” and the case study reports the live system “worked exactly as designed,” with only a same-day UI slippage fix and an accounting drift diagnosis, not production-machine changes.

- journal/CONTEXT.md:1533-1534 "σ produkcyjna przechodzi na grid15 (przed pierwszym zwężeniem, nie na przeglądzie)"
- journal/CONTEXT.md:175 "BOT / INFRA: bez zmian dziś"
- docs/CASE-STUDY.md:84 "the live system worked exactly as designed"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

Capital was withdrawn in two stages. On 18 Sep 2026, the LP positions were closed and USDC was moved to Kraken (≈1,871 USDC from Base, plus funds from Arbitrum and mainnet). On 21 Sep 2026, the remaining ETH and cbBTC were sold for EUR on Kraken, completing the full exit to fiat (≈5,605 EUR total, SEPA transfer scheduled for 22 Sep).

- journal/CONTEXT.md:190 "WYJŚCIE Z LP TRANSZY 1 (+$38)"
- journal/CONTEXT.md:227 "USDC → KRAKEN (~16:00 PL)"
- journal/CONTEXT.md:101 "TRANSZA 1 ZAMKNIĘTA — pełne wyjście do EUR"
- docs/EMERGENCY.md:90-91 "the tranche was closed to EUR on 18–21 Sep 2026"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat on the cbBTC leg from 31 Aug to 11 Sep 2026. The only live narrowing episode lasted 11 days, earning ≈ $8.6 in fees before closing at −$32 versus HODL.

- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)"
- docs/CASE-STUDY.md:83 "It sat in range for 11 days and earned ≈ $8.6 in fees"

### dated-10 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

Before real capital entered (deposit 27 Aug), the paper-trading bot rebalanced exactly three times. The first rebalances were reported in the 21 Aug morning report: 'Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30)'. The same three rebalances are later cited as live-data evidence: 'trzy rebalanse na k=3/h=24h dały netto +$69/+$93/+$87'. No further rebalances are documented before the 27 Aug deposit.

- journal/CONTEXT.md:4175-4176 "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30)"
- journal/DECYZJE-2026-08-26.md:396-397 "trzy rebalanse na k=3/h=24h dały netto +$69/+$93/+$87"
- docs/CASE-STUDY.md:69 "I deposited 6 092 USDC on Base"

### id-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a proposal/action kind (a strategy step), not a single static position. It is emitted when the flat detector confirms a flat episode and triggers a narrowing of the existing range. The note describes it as “zwężenie z ±40% do ±5%: stała szerokość produktu ±5%” (narrowing from ±40% to ±5%: constant product width ±5%), computed via `suggestFixedRange` from a `productNarrowWidthPct` parameter. It is part of a FlatWide product cycle (FLAT_NARROW in, FLAT_WIDEN out) and is signed as an operational experiment, not a one-off position.

- journal/CONTEXT.md:1137 "pierwsza w historii propozycja FLAT_NARROW ~10:22Z"
- journal/reports/morning-2026-09-19.md:120 "zwężenie z ±40% do ±5%: stała szerokość produktu ±5%"
- journal/CONTEXT.md:1592-1593 "proposeFlatNarrow liczy zakres przez suggestFixedRange"

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is a wide position. In the daily position tables it is consistently listed with the postura (posture) "SZEROKI" (wide) on the base-cbbtc-weth-005 pool. For example, the 2026-09-16 table shows "#5978579 | base-cbbtc-weth-005 | SZEROKI". The FLAT_NARROW proposals for this token are merely open suggestions to narrow the range from ±40% to ±5%; the live position itself remains wide.

- journal/reports/morning-2026-09-16.md:242 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-17.md:139 "zwężenie z ±40% do ±5%"

### id-03 (answerable yes, evidence no, coverage partial)

**Q:** Was the range of position #5886957 ever changed, and when?

The provided chunks do not indicate that the range of position #5886957 was ever changed. In every report from 2026-08-29 to 2026-09-18, the position is listed with the postura "SZEROKI" (wide) and the status "w zakresie" (in range). No entry records a range adjustment or a change in postura for this specific position.

- journal/reports/morning-2026-09-18.md:274 "#5886957 | base-weth-usdc-030 | SZEROKI | $3466 | $-1.38 | $-41.50 (od 2026-08-27) | $26.09 | $1.20 | w zakresie"
- journal/reports/morning-2026-08-29.md:185 "#5886957 | base-weth-usdc-030 | $3435 | $-4.09 | $-72.82 (od 2026-08-27) | w zakresie"

### id-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package, titled "DETEKTOR→POMIAR", contained two tasks: (1) modifying the observer so the flat detector stops emitting FLAT_NARROW/FLAT_WIDEN signals, leaving only episode measurement and logs; and (2) cosmetic fixes to the "k×σ" formula in three places (observer.ts, Telegram message formatting, and a UI component label). It was about project functionality (changing signal emission and display), not about tests.

- journal/RESEARCH-QUEUE.md:499 "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN"
- journal/RESEARCH-QUEUE.md:501 "KOSMETYKA "k×σ" (3 kryjówki starej formułki)"

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

The chunks describe `fetchFreshPool` as a function that fetches current on-chain pool state: it calls `factory.getPool` to obtain the pool address, then reads `slot0` and `liquidity` to build a fresh `Pool` object. It is designed to fail-open (i.e., if the fetch fails, it does not block the flow). It is wired into both hooks before `buildMintStep` is called, ensuring the mint step uses up-to-date pool data.

- journal/HANDOFF.md:256-257 "fetchFreshPool poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open]"
- journal/HANDOFF.md:257 "wpięty w oba hooki przed buildMintStep"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2 was the research stage titled "DOM KASYNA" (casino house), testing the LP-as-counterparty class (GM pools, HLP, JLP, GLP) where LPs earn fees/borrow/trader losses without LVR. It was closed on 09.09 with the verdict that the class has a real, repeatable edge (≈ +5–7%/r current) over a HODL basket of the same beta, but was recommended for observation only, not capital deployment.

- journal/RESEARCH-QUEUE.md:324 "E8.2 „DOM KASYNA" — ZAMKNIĘTE 09.09 (wieczór)"
- journal/CONTEXT.md:454 "E8.2 ZAMKNIĘTE — werdykt klasy „dom kasyna""

### id-07 (answerable yes, evidence yes, coverage full)

**Q:** In which database were the backtest results stored?

The backtest results index was stored in the project's database, specifically in a table called `backtest_run`. The documentation notes that raw tick-level swap data stayed in NDJSON files to avoid bloating the database, so only the results index was persisted there.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The chunks do not state a specific tax amount, nor do they indicate that the application calculated it. They only note that selling crypto for fiat is a taxable event in Poland (reported on PIT-38) and that the project planned a future "tax layer" (warstwa podatkowa PLN) for SQLite/CSV exports, but this was not yet implemented.

- docs/EMERGENCY.md:104-105 "Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax return, PIT-38)"
- journal/TASKS-LEDGER.md:34 "import do SQLite gdy dojdzie warstwa podatkowa PLN"
- journal/TASKS-UI.md:823-824 "księga transakcji po stronie bota + eksport CSV pod podatki"

### na-02 (answerable partial, evidence no-evidence, coverage none)

**Q:** What were the backtest results for the Solana network?

The chunks do not contain any backtest results specifically for the Solana network. The project's backtests covered Ethereum mainnet, Base, Arbitrum, and Optimism pools. Solana appears only in the context of the JLP (Jupiter Liquidity Pool) index analysis, which is a benchmark comparison, not a Uniswap v3 liquidity-provision backtest. The JLP analysis noted "maxDD 46.0% > koszyk 42.9%" and a verdict of "JLP = nierozstrzygnięte, prawdopodobnie zawyżone" (undecided, likely overestimated), but this is not a backtest of the project's strategy on Solana.


### na-03 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The chunks do not state a specific earnings figure for GMX positions at the moment of switching from crypto pairs to shorts. They describe GMX test shorts and hedge proposals (e.g., "funding +$0.06 DLA NAS", "Koszt testu ~$0.40", "hedgeNotionalUsd": 1164.8876688279893), but do not report a total GMX position P&L at a switching event.


### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The provided chunks do not state the monthly electricity cost of the Windows server. They mention power settings (sleep disabled, power-on after power loss) and that a home Windows machine replaced a ~$5/month VPS, but no electricity bill or cost figure is given.


### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks do not contain any results for October 2026. The latest data in the sources are from September 2026 (e.g., morning reports dated 2026-09-16 and pipeline logs from that date). The project timeline in the chunks ends in September 2026.


### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided chunks do not contain any information about the number of tokens consumed (e.g., LLM token usage or API costs) in building the HOMOS project. They detail technical tasks, pool analysis, and deployment logs, but no token consumption metrics are reported.


### na-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** What was the structure of the SQL database holding the backtest data?

The SQLite database (data/homos.db) used better-sqlite3 and held a results index rather than raw data. Its DDL v1 schema included tables for pool, venue, pool_snapshot, proposal, selector_ranking, paper_sample, paper_event, position, tx, and backtest_run, plus views. Raw tick-level swaps stayed in ndjson files; the database stored only metadata (e.g., backtest_run as a "results index") and real-capital records (position, tx) for tax accounting. The ledger shipped as ndjson + CSV export rather than SQLite.

- journal/RESEARCH-QUEUE.md:731-732 "DDL v1: pool/venue/pool_snapshot/proposal/selector_ranking/ paper_sample/paper_event/position/tx/backtest_run + widoki"
- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)"
- docs/PLAN.md:167 "The ledger shipped as ndjson + CSV export rather than SQLite"

