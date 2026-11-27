# Answers with citations: k = 10

Date 2026-11-27. Golden set v1.7. Generator `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta (served, rerank top 30) (saved lists, ai/eval/results/2026-11-27-chunk-lists-k10-6-11-golden-v1-7.json, sha256 2fca459de5be666864e70e72c8402ad094c2a326709e590876b385eeba3b8ff2)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "According to the inbox note, the next review is planned for 24.09 (September 24)."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 96 | 96 | 0 | 0 | 0 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 77% (20/26) | 95% (20/21) | 0% (0/5) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 0 | 4 | 1 | 0 |
| yes / evidence given | 20 | 1 | 0 | 0 |
| yes / evidence not given | 5 | 0 | 0 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 334409, output 9264 tokens; $0; generation median 9825 ms, p95 12884 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

The project did not actively re-center/narrow because 720-day backtests and walkforward gates showed passive wide ranges outperformed narrow re-centering strategies. The core issue was that frequent re-centering incurred high impermanent loss (IL) and swap costs that wiped out the extra fees earned. As noted, "zwężanie zarobiło DUŻO więcej fee ... a skończyło NIŻEJ" (narrowing earned much more fees but ended lower) because "IL i re-centering zjadły ~$1.9k ... ponad to, co dołożyły fee" (IL and re-centering ate ~$1.9k more than fees added).

- journal/CONTEXT.md:1702-1703 "zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541"
- journal/CONTEXT.md:1704-1705 "IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030) ponad to, co dołożyły fee"
- docs/CASE-STUDY.md:60-61 "passive wide range ≈ HODL + fees − a little IL, and narrowing added variance without adding expectancy"
- journal/RESEARCH-QUEUE.md:998 "Pasywny szeroki bije FlatOnly ±5% wszędzie"

### why-02 (answerable yes, evidence no, coverage full)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The project kept capital small because the strategy's edge is only a few percent per year from fees, and it underperforms HODL when prices rise. The analysis noted that "przy wzroście zarabiamy MNIEJ niż HODL" because the pool sells the rising asset, creating a cap on gains. The core value was identified as the research infrastructure and measurement ("wartość trwała = pomiar + maszyna badawcza + wiedza"), not high returns. Therefore, a large commitment was unnecessary for a product that yields 8–12% per year in flat markets and loses to spot in bull markets.

- journal/CONTEXT.md:999 "przy wzroście zarabiamy MNIEJ niż HODL"
- journal/CONTEXT.md:1000-1001 "wartość trwała = pomiar + maszyna badawcza + wiedza"
- journal/CONTEXT.md:998-999 "przy płaskim rynku realistycznie 8–12%/r z prowizji"

### why-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The 720-day backtests were run on only a few pools because fetching two years of swap-level data for every candidate was computationally expensive and constrained by free-tier RPC limits (e.g., "limit 10 bloków/getLogs" and ~54 min RAM/time per 365d run). The specific pools chosen—base-030, mainnet-005, arb-005, and cbBTC-005—were the core "rdzeń" pools where sufficient historical data existed; cbBTC/Base was explicitly noted as "młodsza niż 730d" (younger than 730 days), meaning it lacked the full two-year history required for a valid 720-day window.

- journal/DECYZJE-2026-08-26.md:671-672 "jednorazowy eksperyment na 2–3 pulach rdzenia (base-030, mainnet-005, arb-005)"
- journal/DECYZJE-2026-08-26.md:666-667 "część pul młodsza niż 730d (cbBTC/Base)"
- journal/RESEARCH-QUEUE.md:13 "free tier = limit 10 bloków/getLogs"
- journal/DECYZJE-2026-08-26.md:664 "dziś ~54 min przy 8GB heap na 365d"

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The sessions coordinated through repo files because they could not see each other. The documentation states explicitly: "Sessions cannot see each other. They coordinated through the repository." Direct messaging was only added later; rule 6 notes that "Later in the project the two Claude Code sessions could message each other directly" and that they used the inbox as a fallback when that channel was down.

- docs/AI-WORKFLOW.md:27 "Sessions cannot see each other. They coordinated through the repository:"
- docs/AI-WORKFLOW.md:53-54 "Later in the project the two Claude Code sessions could message each other directly"

### why-05 (answerable yes, evidence yes, coverage full)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The bot and API server ran on the Windows machine because it was the 24/7 server, while the Mac was used only for development and browser access. The architecture explicitly places the runtime on Windows: "WINDOWS (server, 24/7)" with "NSSM service homos-bot" and "NSSM service homos-server". The Mac's role was limited to the browser and signing: "Mac (browser) + Rabby for signing". The Mac was used for development ("dev na Macu: npm start / npm run bot") but the production deployment targeted Windows ("serwer Windows: deploy/setup-windows.md").

- docs/INFRA.md:11 "WINDOWS (server, 24/7)"
- docs/INFRA.md:12 "NSSM service homos-bot      bot/observer.ts — prices, signals, proposals"
- docs/INFRA.md:13 "NSSM service homos-server   bot/server.ts — REST API + static UI (public/)"
- docs/INFRA.md:19 "Mac (browser)           iPhone (Safari)              Telegram (push alerts)"
- journal/TASKS-INFRA.md:32-33 "dev na Macu: npm start / npm run bot; serwer Windows: deploy/setup-windows.md"

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot never opened, closed, or re-ranged positions automatically because it was explicitly designed to run in PROPOSE mode only. The emergency runbook states, "Everything runs in PROPOSE mode: the bot executes nothing on its own." Similarly, the automation loop documentation notes that while an AUTO mode for execution within limits was a requirement, it was "not built." The project plan confirms this outcome, stating that for the full-auto phase, "AUTO mode was never enabled." Instead, the system generated ready transactions that required manual signature approval via a browser wallet (Rabby), ensuring all actions were human-initiated.

- docs/EMERGENCY.md:9 "Everything runs in PROPOSE mode: the bot executes nothing on its own."
- docs/UI-DESIGN.md:58 "AUTO (not built): execution within limits"
- docs/PLAN.md:168 "AUTO mode was never enabled"

### why-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The project's design document noted that a VPS (~$5/month) was originally suggested, but the final decision was to use a home Windows machine running 24/7. The chunks do not provide a specific justification or reason for choosing the home machine over a cloud server or VPS, other than noting that the VPS idea was part of the initial vision but not the final implementation.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

The project identified the cbBTC/WETH pair as riskier because both legs are crypto assets, creating "full beta" exposure. Unlike crypto/stable pairs, there is no stablecoin cushion to offset market downturns. The journal notes: "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable" (both legs crypto = full beta, NO stable cushion). Consequently, the pair's performance dropped with the entire crypto market, leading to severe absolute losses (e.g., HODL −51.5% APR, maxDD 61.5%) even when relative LP alpha was positive.

- journal/CONTEXT.md:3818-3819 "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable"
- journal/CONTEXT.md:3818 "para spadła z całym kryptem"
- journal/RESEARCH-QUEUE.md:47-48 "obie nogi crypto = pełna beta, zero poduszki stable"

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day window covered a 'sideways-to-down' year that 'flattered range-bound strategies,' while the 720-day window included a 'strong uptrend' where '0 of 21 configurations passed the gate.' The longer history revealed that narrowing ranges added variance without adding expectancy, and the shorter window had simply missed the regime where passive wide ranges outperformed.

- docs/CASE-STUDY.md:57-58 "The 365-day year had flattered range-bound strategies."
- docs/CASE-STUDY.md:56-57 "On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate."
- docs/DECISION-LOG.md:22 "The 365-day year (sideways-to-down) flattered the strategy; on 720 d 0 of 21 configurations passed."
- journal/CONTEXT.md:4777 "365d wyglądało lepiej głównie dlatego, że okno było spadkowo-boczne."

### why-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

In an uptrend, the LP loses to HODL because LVR (Loss-Versus-Rebalancing) exceeds fees. Arbitrageurs trade against the position at stale prices, realizing the loss. The journal notes that "okna UP = klęska" (up windows are a defeat) and that "wąska zbiera więcej fees ... ale umiera na IL od trendu" (narrow ranges collect more fees but die from trend IL). The strategy only beats HODL in flat markets, where relative volatility is low and fees exceed the LVR cost.

- docs/PLAN.md:81 "LVR (Loss-Versus-Rebalancing): the loss to arbitrageurs who trade against the position at a stale price on every market move"
- journal/DECYZJE-2026-08-26.md:551 "okna UP = klęska"
- journal/RESEARCH-QUEUE.md:568 "wąska zbiera więcej fees ($1,316) ale umiera na IL od trendu"
- journal/DECYZJE-2026-08-26.md:553 "FLAT = nasza nisza (58–100% wygranych)"

### dated-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

The first real capital entered through the application on 27.08 (27 August 2026). The journal records that on that evening the hybrid product went live with both legs opened, and the UI sanity check confirmed a real position (#5886957) card with live metrics. This followed the 26.08 decision to deploy the first tranche ($6k Base).

- journal/HANDOFF.md:1169-1170 "docs: dzień decyzji zamknięty — produkt hybryda live, obie nogi otwarte"
- journal/HANDOFF.md:1159-1160 "karta realnej pozycji #5886957 ma pasek metryk jak paper"
- journal/DECYZJE-2026-08-26.md:153 "KAPITAŁ — pierwsze realne wejście LP (główna decyzja)"

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance on real capital was executed on 31 August 2026 (31.08). It was part of the "narrowing experiment" (31 Aug → 11 Sep) where the flat detector fired on the cbBTC leg, and the user signed the narrowing as an explicit operational experiment. The rebalance involved a two-transaction sequence whose first attempt reverted on a slippage check due to a stale pool state, which was fixed the same day.

- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)"
- docs/CASE-STUDY.md:81-82 "I signed the narrowing as an explicit n = 1 operational experiment"
- docs/CASE-STUDY.md:85 "including a two-transaction rebalance whose first attempt reverted on a slippage check"
- journal/CONTEXT.md:1008-1009 "Rebalans eksperymentu 31.08 (#5887690 → #5908083)"

### dated-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September, two real LP positions were open: #5886957 (base-weth-usdc-030, SZEROKI, $3,468, PnL od kotwicy −$39.98, fee narosłe $20.31) and #5978579 (base-cbbtc-weth-005, SZEROKI, $2,266, PnL od kotwicy −$92.39, fee narosłe $0.89). Combined value $5,733.13. The transza balance that day was $5,966.88 (−2.05% vs the $6,092 deposited), with market movement on LP of −$160.19.

- journal/reports/morning-2026-09-15.md:221 "#5886957 | base-weth-usdc-030 | SZEROKI | $3468"
- journal/reports/morning-2026-09-15.md:222 "#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266"
- journal/reports/morning-2026-09-15.md:202 "razem dziś | **$5966.88**"
- journal/reports/morning-2026-09-15.md:203 "różnica vs wpłacone | **$-125.12 (-2.05%)**"

### dated-04 (answerable yes, evidence no, coverage full)

**Q:** When did the last backtest finish?

The last backtest finished at 2026-09-09T04:53:01.139Z.

- journal/reports/morning-2026-09-09.md:43 "2026-09-09T04:53:01.139Z krok backtest-run: exit 0"

### dated-05 (answerable yes, evidence no, coverage full)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

Yes. On 18 Sep 2026, when break-even was hit and the LP position was unwound at +0.6 %, the exit rule was revised to “keep the tokens as a spot bet with a −5 % floor and a 24 Oct review,” converting the liquidity-provision position into a plain spot-hold position. On 21 Sep, during a short-squeeze rally, the decision was changed again to “sell everything today,” and the tranche closed at +5.5 % in 25 days, with the strategy itself contributing +0.6 % and three days of unhedged beta accounting for the rest. The author notes the outcome was good but the process “was not a method.”

- docs/CASE-STUDY.md:95-96 "keep the tokens as a spot bet with a −5 % floor and a 24 Oct review"
- docs/CASE-STUDY.md:97 "sell everything today"
- docs/CASE-STUDY.md:97-98 "The tranche closed at +5.5 % in 25 days"
- docs/CASE-STUDY.md:98 "the strategy contributed +0.6 % and three days of unhedged beta the rest"

### dated-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The nightly pipeline first completed without errors on 20 August 2026 ("pierwszy w pełni czysty przebieg automatu w historii projektu"), with 19/19 steps exiting 0. However, a backtest-run step still failed with exit 134 (OOM) on a large pool. The cause was insufficient Node heap memory (~4 GB default) for 685k swaps. The fix was raising the heap limit to 8 GB via NODE_OPTIONS in pipeline.ts, verified the same day. Earlier, on 19 August, a missing win32 binary for hypersync-client@^1.4.0 had caused all fetch steps to fail; pinning to 1.0.0 resolved that.

- journal/CONTEXT.md:2349-2350 "pierwszy w pełni czysty przebieg automatu w historii projektu"
- journal/CONTEXT.md:2353 "backtest-run exit 134 (OOM, Node ~4GB heap)"
- journal/CONTEXT.md:2357 "NODE_OPTIONS=--max-old-space-size=8192"
- journal/CONTEXT.md:2539-2540 "@envio-dev/hypersync-client@^1.4.0 nie ma binarki win32"

### dated-07 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

Yes, a production-machine change occurred after capital was invested. On 21 Aug 2026 (before the 27 Aug live start), a stale deploy script still ended with `pm2 startOrReload` + `pm2 save`, while production had run on NSSM since 10 Aug. The script was rewritten to use NSSM, and the journal notes that every prior deployment had silently restored pm2 alongside NSSM, causing recurring “two empty terminals” issues. The fix removed pm2 from the deploy script and added a `/health` sanity check. The journal also records a two-transaction rebalance on 31 Aug–11 Sep whose first attempt reverted on a slippage check because the UI had priced the mint from a stale pool state; this was fixed the same day.

- journal/CONTEXT.md:4308-4309 "pochodził sprzed migracji z 10.08 i wciąż kończył się `pm2 startOrReload` + `pm2 save`"
- journal/CONTEXT.md:4320-4321 "NAPRAWIONE: `deploy/deploy.ps1` przepisany na NSSM (pm2 usunięte ze skryptu)"
- docs/CASE-STUDY.md:86 "the UI had priced the mint from a stale pool state — found, fixed, and documented the same day"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The capital was withdrawn on 21 Sep 2026. The LP positions were unwound on 18 Sep 2026, and the final sale of the remaining tokens occurred on 21 Sep 2026, closing the tranche at +5.5%.

- docs/EMERGENCY.md:90-91 "the tranche was closed to EUR on 18–21 Sep 2026"
- docs/CASE-STUDY.md:96-97 "on 21 Sep, in a short-squeeze rally with BTC at a widely flagged resistance, "sell everything today". I sold."
- docs/CASE-STUDY.md:149 "Final (21 Sep, in EUR on exchange) | ≈ +5.5 % (+$336), 25 days"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat on the cbBTC leg starting 30 Aug 2026 (22:22Z). The only live narrowing episode lasted 11 days (31 Aug → 11 Sep 2026), earning ≈ $8.6 in fees before the trend breaker closed it at −$32 versus HODL.

- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)"
- docs/CASE-STUDY.md:83 "It sat in range for 11 days"
- docs/CASE-STUDY.md:83-84 "earned ≈ $8.6 in fees, then the trend breaker closed it at −$32 versus HODL"
- journal/CONTEXT.md:1135-1136 "Zegar flatu cbBTC tyka od 30.08 22:22Z"

### dated-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

The paper-trading bot rebalanced 3 times before real capital was deployed. This occurred on 2026-08-21 (reported in the 08:45 morning report of 2026-08-21). The rebalances happened on three pools: ETH/USDC mainnet 0.30, mainnet 0.05, and base 0.30.

- journal/CONTEXT.md:4165 "PIERWSZE 3 REBALANSE w paper tradingu"
- journal/CONTEXT.md:4165 "2026-08-21 09:1x"
- journal/CONTEXT.md:4175 "reb 0→1 na trzech pulach ETH/USDC"
- journal/DECYZJE-2026-08-26.md:396-397 "trzy rebalanse na k=3/h=24h"

### id-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a proposal type (an action), not a range algorithm. It is one of the bot's proposal kinds, defined alongside FLAT_WIDEN, and represents a specific action: narrowing the position's range during a confirmed flat. The range width itself is determined by a separate parameter (productNarrowWidthPct, e.g., ±5%), not by an algorithm within FLAT_NARROW. The UI renders it as a proposal card with buttons to approve, modify, or reject, similar to a REBALANCE action.

- journal/TASKS-UI.md:1137-1138 "nowe rodzaje propozycji `kind: 'FLAT_NARROW'` (zwężenie do k×σ w POTWIERDZONYM flacie)"
- journal/HANDOFF.md:402-403 "Karty propozycji FLAT_NARROW/FLAT_WIDEN (produkt FlatWide)"
- journal/HANDOFF.md:861-862 "bot wystawi pierwszą w historii propozycję FLAT_NARROW"

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is a wide position. The journal's real-position tables list its postura as "SZEROKI" (wide) on the base-cbbtc-weth-005 pool. The FLAT_NARROW proposals referencing this token are only open suggestions to narrow it from ±40% to ±5%, not its current state.

- journal/reports/morning-2026-09-18.md:275 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-17.md:261 "#5978579 | base-cbbtc-weth-005 | SZEROKI"

### id-03 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** Was the range of position #5886957 ever changed, and when?

No, the range of position #5886957 was never changed. In every available report (from 2026-08-29 to 2026-09-18), the "zakres" (range) column consistently shows "w zakresie" (in range), indicating the position remained within its initial range boundaries throughout the project period.

- journal/reports/morning-2026-08-29.md:185 "#5886957 | base-weth-usdc-030 | $3435 | $-4.09 | $-72.82 (od 2026-08-27) | w zakresie"
- journal/reports/morning-2026-09-18.md:274 "#5886957 | base-weth-usdc-030 | SZEROKI | $3466 | $-1.38 | $-41.50 (od 2026-08-27) | $26.09 | $1.20 | w zakresie"

### id-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package ("DETEKTOR→POMIAR") contained two tasks: (1) modifying the observer so the flat detector stops emitting FLAT_NARROW/FLAT_WIDEN signals, leaving only episode measurement and logs; and (2) a cosmetic rename of the "k×σ" label in three places (observer.ts alert, Telegram proposal format, and cycleLine.tsx UI label) to "±5%". This was about project functionality (changing bot behavior and UI labels), not about tests.

- journal/RESEARCH-QUEUE.md:498 "D0. PACZKA „DETEKTOR→POMIAR""
- journal/RESEARCH-QUEUE.md:499-500 "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN (zostaje pomiar epizodów + logi)"
- journal/RESEARCH-QUEUE.md:501 "KOSMETYKA „k×σ" (3 kryjówki starej formułki)"

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

fetchFreshPool (in src/utils/uniswap.ts) refreshes a Uniswap v3 pool's on-chain state before a mint step. It calls factory.getPool to get the pool address, then reads slot0 (current tick/price) and liquidity from the chain, and constructs a new Pool object with the same tokens and fee tier. It is fail-open: if the factory or RPC call fails, it returns the old pool object instead of throwing. It is wired into useRebalanceExecution and useRotateExecution immediately before buildMintStep, so the mint amounts are computed from fresh price/liquidity data rather than a stale pool snapshot. A known caveat: the range ticks still come from the original plan (calculated at the old price), so after a price move the range is slightly off-center.

- journal/CONTEXT.md:351-352 "fetchFreshPool (src/utils/uniswap.ts): factory.getPool → slot0 + liquidity → nowy Pool z tymi samymi tokenami/fee"
- journal/CONTEXT.md:352-353 "fail-open (zwraca stary pool, gdy fabryka/RPC zawiedzie)"
- journal/CONTEXT.md:353-354 "wpięty w useRebalanceExecution i useRotateExecution tuż przed buildMintStep"
- journal/HANDOFF.md:256-257 "fetchFreshPool poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open], wpięty w oba hooki przed buildMintStep"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2 was the “dom kasyna” (casino house) stage, testing whether perpetual-liquidity-provider protocols (GMX v2 ETH/BTC, Jupiter JLP, and GLP) earn a positive edge over a HODL basket. It was closed on 09.09 with a conditional positive verdict: GM v2 and JLP showed real, repeatable alpha, while GLP did not. The class was deemed suitable for observation but not for capital deployment at the $6k tranche level.

- journal/RESEARCH-QUEUE.md:324 "E8.2 „DOM KASYNA" — ZAMKNIĘTE 09.09"
- journal/CONTEXT.md:454 "E8.2 ZAMKNIĘTE — werdykt klasy „dom kasyna""

### id-07 (answerable yes, evidence no, coverage full)

**Q:** In which database were the backtest results stored?

The backtest results were stored in a SQLite database. The documentation states that the database holds only the `backtest_run` table, which serves as the results index.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."
- docs/PLAN.md:167 "The ledger shipped as ndjson + CSV export rather than SQLite"

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The application does not calculate a tax amount. It only provides a **CSV export for the Polish income-tax return (PIT-38)**, built as the closed-positions panel plus `/api/ledger.csv`, with columns for reconciliation (date, network, tx, tokens, amounts, USD). The basis is the on-chain transaction ledger (`bot/ledger.ts`, ndjson) with rates at execution time. Selling crypto for fiat is a taxable event in Poland, reported on PIT-38; the export should be kept with the on-chain transaction history. The actual tax computation is left to the user/tax authority — the app supplies the data, not the tax figure.

- docs/UI-DESIGN.md:101-102 "CSV export for the Polish income-tax return (PIT-38)"
- docs/EMERGENCY.md:104-105 "Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax return, PIT-38)"
- journal/TASKS-LEDGER.md:42-43 "kolumny pod rozliczenie (data UTC+lokalna, sieć, tx, rodzaj, tokeny, kwoty, USD)"

### na-02 (answerable partial, evidence no-evidence, coverage none)

**Q:** What were the backtest results for the Solana network?

The chunks contain no backtest results for the Solana network. All backtest data shown is for Uniswap v3 pools on Ethereum mainnet, Arbitrum, Base, and Optimism. The only Solana reference is a benchmark analysis of the JLP (Jupiter Lending Pool) index, which is a market-data benchmark, not a Uniswap liquidity-provision backtest, and the team judged its alpha as "prawdopodobnie zawyżone" (probably inflated) due to unaccounted SOL beta.

- journal/CONTEXT.md:578-579 "JLP = nierozstrzygnięte, prawdopodobnie zawyżone"
- journal/RESEARCH-QUEUE.md:601 "Testujemy WŁASNYM silnikiem tick-level"

### na-03 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The chunks do not describe a single moment of switching from crypto pairs to shorts. They document test GMX shorts (e.g., $15 on 20 Aug and ~$150 on 18 Aug) used to validate the hedge-excess venue, not a transition from holding crypto pairs to shorting. The 18 Aug test closed with a net round-trip cost of ~$1.08 and a price PnL of −$0.31; the 20 Aug test returned +14.96 USDC and +0.0006 ETH on a $15.00 short, with a cost of ~$0.40.

- journal/CONTEXT.md:2413-2414 "executeOrder zwrócił +14.96 USDC i +0.0006 ETH"
- journal/CONTEXT.md:2415 "Koszt testu ~$0.40"
- journal/CONTEXT.md:3534 "RAZEM koszty round-trip bez ceny: ~$1.08 (~72 bps @ $150)"
- journal/CONTEXT.md:3533 "PnL cenowy −$0.31 (ETH lekko w górę)"

### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The chunks do not state the monthly electricity cost for the Windows server. They only mention that a home Windows machine running 24/7 was chosen instead of a VPS, and that power settings (sleep disabled, power-on after loss) were configured, but no electricity bill or per-month cost figure is given.


### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks do not contain any information about results for October 2026. The project's documented activity and results are limited to August and September 2026, with the final outcome recorded on 21 September 2026.


### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided chunks do not state how many tokens (AI inference tokens) were consumed in building the project. They describe the project's architecture, live trading results, data-fetching tasks, and coordination workflow, but contain no metric of token usage or cost.


### na-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** What was the structure of the SQL database holding the backtest data?

The provided chunks do not describe the specific tables, columns, or schema of the SQL database. They only state that the database holds a `backtest_run` table (described as a results index) and explicitly excludes raw tick-level swap data, secrets, and journal files. The raw data is stored in NDJSON files, and the ledger was shipped as ndjson + CSV rather than SQLite.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)"
- docs/PLAN.md:167 "The ledger shipped as ndjson + CSV export rather than SQLite"

