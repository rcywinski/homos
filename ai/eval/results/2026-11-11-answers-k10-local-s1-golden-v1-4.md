# Answers with citations: k = 10

Date 2026-11-11. Golden set v1.4. Generator `answer:ollama:qwen3.8:27b(think=false,num_ctx=16384,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=ANSWER_SYSTEM,cite=quote)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "The next review is planned for 24.09 (September 24, 2026)."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 68 | 65 | 3 | 0 | 0 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 65% (17/26) | 85% (17/20) | 0% (0/6) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 1 | 2 | 2 | 0 |
| yes / evidence given | 17 | 3 | 0 | 0 |
| yes / evidence not given | 2 | 3 | 1 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 334968, output 8992 tokens; $0; generation median 13095 ms, p95 17069 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

They did not actively re-center because backtests showed frequent narrowing realized more IL than it earned in fees. On 720d data, passive wide ranges beat narrow re-centering strategies across all regimes, including flat markets. Narrow ranges earned 4x more fees (e.g., $2169 vs $541 on cbBTC) but ended lower because IL from re-centering consumed ~$1.9k–$2.9k more than the fee gains. The project concluded that a narrow band acts like short gamma: every re-centering realizes divergence. Consequently, they stayed wide, as this posture survived all tests while narrowing variants failed.

- journal/CONTEXT.md:1702-1703 "zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło NIŻEJ."
- journal/CONTEXT.md:1705-1706 "Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję."
- journal/CONTEXT.md:1854 "Przetrwała postura, którą już mamy: szeroki pasywny LP bez zwężania."

### why-02 (answerable yes, evidence no, coverage partial)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The project kept capital commitment small because the Uniswap v3 strategy was designed as a research experiment, not a primary yield source. The 2026-09-01 analysis concluded that in a rising market, the LP strategy earns less than simply holding (HODL) because the liquidity pool sells the rising asset, capping upside with a band limit. The core value was defined as "measurement + research machine + knowledge" rather than alpha generation. Consequently, the team treated it as a "nervous insurance sale" with a small tranche (starting ~$5,765) to limit downside risk (potential $500–$1,100 loss in a crash) while testing the mechanics.

- journal/CONTEXT.md:999-1000 "przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma)"
- journal/CONTEXT.md:1000-1001 "wartość trwała = pomiar + maszyna badawcza + wiedza"

### why-03 (answerable yes, evidence no, coverage partial)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The 720-day backtests were limited to a few pools because the validation gate was applied to specific candidate pools (e.g., base-030, cbBTC, mainnet) during recalibration and strategy testing, not a broad scan. These particular pools were selected as the primary test cases for the algorithm (e.g., ETH/stable and BTC pegged pairs) to verify if the strategy beat HODL under the new 720-day + 90-day recent condition. The 720-day window was chosen because the 365-day window had flattered the strategy, and 0 of 21 configurations passed on the longer history, revealing that range-bound strategies were not robust across regimes.

- docs/DECISION-LOG.md:22 "The 365-day year (sideways-to-down) flattered the strategy; on 720 d 0 of 21 configurations passed."
- journal/RESEARCH-QUEUE.md:997-998 "Walkforward `WF_SET=product` + fullperiod 720d na OBU pulach: Pasywny szeroki bije FlatOnly ±5% wszędzie"
- docs/CASE-STUDY.md:56-57 "Extending the window to 720 days killed the strategy. On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate."

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The sessions coordinated via repo files because they ran in separate applications (e.g., Cowork cloud, iTerm, Windows) and could not reach each other via direct messaging. The project empirically verified that Sonnet, CC, and Windows sessions were not accessible as direct messaging peers. Consequently, they used the repository as the communication bus, with `CONTEXT.md` as the shared journal and `HANDOFF.md` as per-agent inboxes. Direct pings were only added later when a specific "Remote Control" channel became available and visible via `ListAgents`.

- journal/CONTEXT.md:3278-3279 "sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej sesji (osobne aplikacje)"
- docs/AI-WORKFLOW.md:27 "Sessions cannot see each other. They coordinated through the repository"
- journal/HANDOFF.md  [NOT-FOUND] "gdy obie sesje mają Remote Control połączone (`ListAgents` widzi drugą stronę jako peera), "ping" po pushu/wdrożeniu idzie przez `SendMessage` bezpośrednio"

### why-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The bot and API server ran on the Windows machine because it served as the 24/7 server, whereas the Mac was used for development. The documentation explicitly states that "a closed laptop means a dead autopilot" and that the bot must be a separate process on a server. The vision suggested a VPS, but a home Windows machine running 24/7 took that role. The Mac was reserved for development tasks (e.g., `npm start`, `npm run bot`), while the Windows machine handled the persistent bot daemon and API server.

- docs/UI-DESIGN.md:45-46 "the browser cannot be the automation engine — a closed laptop means a dead autopilot. The bot is a separate process."
- docs/UI-DESIGN.md:47-48 "in the end a home Windows machine running 24/7 took that role."
- docs/INFRA.md:52 "Code flow: Mac (development) → Windows (server)"

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot was designed as a read-only observer that never executed transactions on its own. The UI explicitly displayed the status: "OBSERWUJ — bot niczego nie wykonuje" (OBSERVE — the bot executes nothing). While the project implemented "semi-automatic execution" where the bot generated ready-to-sign transactions (PROPOSE mode) for the user to approve in a browser wallet, the "full-auto" mode (AUTO) was never built or enabled. Consequently, opening, closing, or re-ranging positions always required manual user action via the cockpit UI, even though the underlying logic for automated signals existed.

- docs/PLAN.md:168 "AUTO mode was never enabled"
- journal/TASKS-UI.md:114 "OBSERWUJ — bot niczego nie wykonuje"
- docs/UI-DESIGN.md:58 "PROPOSE: a proposal for approval; AUTO (not built): execution within limits"

### why-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The project initially suggested a small VPS (~$5/month), but ultimately used a home Windows machine because the owner's existing hardware was sufficient and avoiding a VPS saved costs. The journal notes that Docker/WSL2 on Windows adds 1–2 GB of RAM overhead, which was deemed an unnecessary cost for the current hardware, implying a preference for lightweight, low-cost local infrastructure over renting a cloud server.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."
- journal/RESEARCH-QUEUE.md:745-746 "Docker Desktop/WSL2 = 1–2 GB RAM narzutu, zbędny koszt na obecnym sprzęcie"

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

A crypto/crypto pair like cbBTC/WETH is riskier because both legs carry full crypto beta, meaning the position has no stable-coin cushion. In a down market, the pair falls with the entire crypto market, leading to high absolute drawdowns (e.g., HODL -51.5% APR and maxDD 61.5% over 365d). In contrast, a crypto/stable pair benefits from the stable leg acting as a hedge against crypto price declines, reducing overall portfolio volatility and drawdown.

- journal/CONTEXT.md:3818-3819 "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable"
- journal/RESEARCH-QUEUE.md:47-48 "ABSOLUTNIE rok fatalny (−46…−51%, maxDD ~60%) — obie nogi crypto = pełna beta, zero poduszki stable"
- docs/ALGORITHM.md:87-88 "the pair is 100% crypto beta (HODL −51%/yr in 2025/26)"

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day window covered a sideways-to-down year that flattered range-bound strategies, making them appear profitable. The 720-day window included a strong uptrend (bull market), which exposed that these strategies underperformed in rising markets. In the longer test, 0 of 21 configurations passed the gate because the strategies failed specifically in 'up' regimes, where they suffered significant losses, while performing better in flat or down regimes. The 365-day results were misleading because they lacked the bull-market conditions present in the 720-day data.

- docs/CASE-STUDY.md:57-58 "The 365-day year had flattered range-bound strategies."
- docs/CASE-STUDY.md:56-57 "On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate."
- journal/DECYZJE-2026-08-26.md:558-559 "Interpretacja: 365d schlebiało strategii (rok bez bulla); wąski LP ETH/stable nie bije HODL przez pełny cykl"

### why-10 (answerable yes, evidence yes, coverage full)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

The LP earned less in fees during an uptrend than in a flat market because the strategy is effectively a short-gamma position: it sells into rallies and buys into drawdowns. In a trending market, this convexity cost (impermanent loss and re-centering costs) exceeds the fee income generated. The journal notes that while narrowing the range earned significantly more fees (e.g., $2169 vs $541 on cbBTC), it ended with lower net returns because IL and re-centering consumed the gains. In contrast, flat markets allow the LP to remain in-range longer without the directional losses that occur when the price moves out of the concentrated range during an uptrend.

- journal/CONTEXT.md  [NOT-FOUND] "zwężenie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło NIŻEJ."
- docs/CASE-STUDY.md:108-109 "you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn."

### dated-01 (answerable yes, evidence no, coverage partial)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

The chunks do not state the exact date the first real capital entered the application. They only indicate it was planned around late August 2026. The 26 Aug 2026 decision document discusses the "first real LP entry" as the main decision, recommending a $6k tranche with a second tranche after ~31 Aug. The case study confirms the project proceeded to verify the strategy "with real capital," but no specific timestamp for the first transaction is provided in the supplied text.

- journal/DECYZJE-2026-08-26.md:153 "KAPITAŁ — pierwsze realne wejście LP (główna decyzja)"
- docs/CASE-STUDY.md:63-64 "The rest of the project was about verifying it with real capital"

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance executed on real capital occurred on 31 August 2026. The journal entry for that date records the execution of the first live product transaction (a narrowing/rebalance on the cbBTC/WETH pool) after a hotfix, stating: "~13:0x — EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA." The case study confirms this was the start of the narrowing experiment that ran from 31 Aug to 11 Sep 2026.

- journal/CONTEXT.md:1228-1229 "~13:0x — EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA."
- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)."

### dated-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September 2026, two real FlatWide positions were open: #5886957 (base-weth-usdc-030, SZEROKI) and #5978579 (base-cbbtc-weth-005, SZEROKI). Their PnL from anchor (PnL od kotwicy) was -$39.98 and -$92.39, respectively. The total value was $5,733.13. Additionally, six paper-trading pools were open with a combined equity of $64,931 and total PnL of +$4,931.

- journal/reports/morning-2026-09-15.md:221 "#5886957 | base-weth-usdc-030 | SZEROKI | $3468 | $-1.28 | $-39.98 (od 2026-08-27)"
- journal/reports/morning-2026-09-15.md:222 "#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266 | $-1.91 | $-92.39 (od 2026-09-11)"
- journal/reports/morning-2026-09-15.md:232 "mainnet-usdc-weth-030 | open | $10680 | +$680"

### dated-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the last backtest finish?

The last backtest run finished on 2026-09-23 at 05:03:07.956Z. The pipeline log shows the `backtest-run` step exiting with code 0 at that timestamp, followed by the `backtest-selection` step starting immediately after.

- journal/reports/morning-2026-09-23.md:43 "2026-09-23T05:03:07.956Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1790135075646.log)"

### dated-05 (answerable yes, evidence no, coverage full)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

Yes. On 2026-09-11, the project executed a "FLAT_WIDEN" rebalance to protect a position that had gone flat (stuck out of range). The narrow position #5908083 (±5% range) was closed and converted into a wider position #5978579 (±11.09% range) on the cbBTC/WETH pool. The result was a net loss of $32.08 versus a HODL baseline, driven by impermanent loss (~-$45) and fees (~$12.6) outweighing any gains. The journal notes this was consistent with prior 720-day backtests showing that flat positions often end via the range edge, making widening a protective but costly move in that specific instance.

- journal/CONTEXT.md:412-452 "EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579)"
- journal/CONTEXT.md:447-448 "netto vs HODL wkładu po kursie dziś: −$32.08 (fee +$12.6 < IL ≈ −$45 przy ruchu 5% do krawędzi ±5%)"

### dated-06 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The first nightly run to complete fully without errors was on 2026-08-22 (reported 08:45 UTC), described as "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE" [journal/CONTEXT.md:4411#p1]. Errors did recur: on 2026-08-26, `backtest-run` failed twice with exit 1 (~35 min each), diagnosed as a crash in `svgChart` caused by `Math.min/max` over millions of points; the fix was to use a loop/reduce instead [journal/CONTEXT.md:2178#p4]. Subsequent runs (2026-08-29, 2026-09-01, 2026-09-05, 2026-09-06, 2026-09-17) all ended with "porażki: BRAK" (no failures).

- journal/CONTEXT.md:4411 "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE"
- journal/CONTEXT.md:2337-2338 "backtest-run 2× exit 1 (04:23 i 05:00Z, po ~35 min)"
- journal/CONTEXT.md:2332-2333 "spread Math.min/max na milionach punktów w svgChart — LEKCJA: na seriach zawsze pętla/reduce"

### dated-07 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

No specific infrastructure failures are recorded in the chunks. The only production change made while capital was invested was a volatility estimator switch on 29 Aug 2026. The team discovered the bot used the 'swap' estimator instead of 'grid15' (which justified the backtests). They set `SIGMA_MODE` to 'grid15' in the `homos-bot` NSSM service environment and restarted it at 10:15:53Z. This was done deliberately to ensure the first live range-narrowing used the same sigma as the backtests. The change was limited to the service environment to avoid affecting the nightly pipeline.

- journal/CONTEXT.md:1558-1559 "σ grid15 WDROŻONA (CC-Win: NSSM tylko dla homos-bot, restart 10:15:53Z, `volDaily` base-030 2.667→2.450%/d"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The capital was withdrawn in two stages. First, USDC was moved to Kraken on 18 September 2026 (~16:00 PL). Second, the remaining ETH and cbBTC were sold for EUR on 21 September 2026 (~19:00 PL), completing the full exit to fiat. The entire tranche was closed to EUR between 18–21 Sep 2026.

- docs/EMERGENCY.md:90-91 "the tranche was closed to EUR on 18–21 Sep 2026"
- journal/CONTEXT.md:227 "USDC → KRAKEN (~16:00 PL): całe USDC ze wszystkich sieci"
- journal/CONTEXT.md:101 "TRANSZA 1 ZAMKNIĘTA — pełne wyjście do EUR (decyzja Rafała ~14:00 PL „dziś z całością", wykonanie ~19:00 PL)"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat on the cbBTC/WETH leg starting 30 Aug 2026 (22:22Z), confirmed by the flat detector. The only live narrowing episode lasted 11 days, from 31 Aug to 11 Sep 2026.

- journal/CONTEXT.md:1135-1136 "Zegar flatu cbBTC tyka od 30.08 22:22Z (pierwsza noc BEZ resetu po trzech „tańcach na progu")"
- docs/DECISION-LOG.md:28 "Episode: 11 days in flat, ≈ $8.6 fees, −$32 vs HODL."

### dated-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

The paper-trading bot rebalanced 3 times. This occurred on 2026-08-21 (reported in the 08:45 morning report). The rebalances happened on three pools: ETH/USDC mainnet 0.30, ETH/USDC mainnet 0.05, and ETH/USDC base 0.30. This happened before real capital was deployed, which began on 27 Aug 2026.

- journal/CONTEXT.md:4175-4176 "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30)"
- docs/CASE-STUDY.md:69 "I deposited 6 092 USDC on Base"

### id-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a specific proposal/action type (a kind of position adjustment), not a generic range algorithm. It is the "narrowing" step of the FlatWide product: when the price is confirmed flat (|gap|<2% for ≥12h), the bot proposes narrowing the existing wide range (e.g., from ±40% to ±5%) to capture higher fees, with a fixed narrow width (±5% or ±6/8% depending on the pool). It is paired with FLAT_WIDEN (the widening/exit step).

- journal/reports/morning-2026-09-19.md:109-110 ""kind": "FLAT_NARROW", "action": "FLAT_NARROW""
- journal/CONTEXT.md:1137 "pierwsza w historii propozycja FLAT_NARROW ~10:22Z"
- journal/CONTEXT.md:1576-1577 "propozycja FLAT_NARROW niesie WŁASNY `paybackDays`"

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is a wide position (postura: SZEROKI). It is part of the FlatWide product on the base-cbbtc-weth-005 pool. The journal notes indicate a pending proposal to narrow it from ±40% to ±5% if the flat state is confirmed, but its current status remains wide.

- journal/reports/morning-2026-09-16.md:242 "| #5978579 | base-cbbtc-weth-005 | SZEROKI | $2202 |"
- journal/reports/morning-2026-09-17.md:139 ""note": "Produkt FlatWide: flat POTWIERDZONY (|gap|<2% ≥12h) — zwężenie z ±40% do ±5%""

### id-03 (answerable yes, evidence no, coverage none)

**Q:** Was the range of position #5886957 ever changed, and when?

Based on the provided chunks, there is no record of the range for position #5886957 being changed. In every daily report from 2026-08-29 to 2026-09-18, the position is consistently listed with the posture "SZEROKI" (Wide) and the status "w zakresie" (in range). The chunks do not contain any information about a range modification event or specific dates when such a change occurred.


### id-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package ("DETEKTOR→POMIAR") contained two tasks: (1) stopping the flat detector from emitting FLAT_NARROW/FLAT_WIDEN signals (leaving only episode measurement + logs), and (2) cosmetic fixes to three "k×σ" labels in observer.ts, the Telegram proposal template, and cycleLine.tsx. It was about project functionality (signal logic and UI labels), not tests. Deployment was blocked until episode #5908083 closed because removing FLAT_WIDEN would kill a needed signal.

- journal/RESEARCH-QUEUE.md:499-500 "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN (zostaje pomiar epizodów + logi)"
- journal/RESEARCH-QUEUE.md:501 "KOSMETYKA "k×σ" (3 kryjówki starej formułki)"
- journal/RESEARCH-QUEUE.md:506-507 "NIE wdrażać przed zamknięciem epizodu — pkt 1 zabiłby sygnał FLAT_WIDEN"

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

fetchFreshPool retrieves the latest on-chain pool state by calling factory.getPool to obtain the pool address, then reading slot0 and liquidity to construct a new Pool object. It is designed to be fail-open (i.e., it does not block execution if the fetch fails) and is wired into both rebalance hooks immediately before the buildMintStep function to ensure fresh data is used during live rebalancing.

- journal/HANDOFF.md:256-257 "fetchFreshPool poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open], wpięty w oba hooki przed buildMintStep"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2 was the project stage titled "DOM KASYNA" (casino house). It tested liquidity-provision classes without LVR (adverse selection from arbitrage), specifically evaluating GM v2 pools, HLP vaults, GLP (GMX v1), and JLP. The stage was ultimately closed on 09.09 with a verdict that the class has a real but diminishing edge (≈ +5–7%/r current pace) and was recommended for observation only, not for capital allocation in the first tranche.

- journal/RESEARCH-QUEUE.md:324 "E8.2 „DOM KASYNA" — ZAMKNIĘTE 09.09 (wieczór)."
- journal/CONTEXT.md:454 "E8.2 ZAMKNIĘTE — werdykt klasy „dom kasyna""

### id-07 (answerable yes, evidence yes, coverage partial)

**Q:** In which database were the backtest results stored?

The backtest results index was stored in a database, while the raw tick-level swap data (millions of rows per pool) was kept in files (data/cache/*.ndjson) rather than in the database to avoid bloat. The database specifically held the `backtest_run` table, which served as the results index.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The application did not calculate the exact tax amount. It was designed to support tax reporting by tracking every on-chain event (MINT, INCREASE, DECREASE, COLLECT, BURN) in a ledger with USD valuations and gas costs, and by exporting a CSV for Polish income-tax (PIT-38) reconciliation. The actual tax figure depends on the Polish tax rules applied to the realized gains, which the app does not compute. The journal notes that selling crypto for fiat is a taxable event in Poland and advises exporting the exchange ledger as CSV alongside the on-chain transaction history.

- journal/TASKS-LEDGER.md:3-4 "SQLite + CSV od pierwszej transakcji — podatki PL + audytowalność"
- docs/EMERGENCY.md:104-105 "Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax return, PIT-38)"
- journal/TASKS-LEDGER.md:34 "import do SQLite gdy dojdzie warstwa podatkowa PLN"

### na-02 (answerable partial, evidence no-evidence, coverage none)

**Q:** What were the backtest results for the Solana network?

The chunks contain no backtest results for the Solana network. The project's Uniswap v3 backtests covered Ethereum mainnet, Base, Arbitrum, and Optimism pools (e.g., "mainnet-usdc-weth", "base-weth-usdc", "arbitrum-weth-usdc"). Solana appears only in the JLP (Jupiter Liquidity Pool) analysis, which is a separate 3-factor regression/benchmark study, not a Uniswap v3 LP backtest. The JLP verdict was "unresolved, probably overestimated" due to a SOL beta artifact, and it was flagged as needing a 3-factor regression correction.

- journal/CONTEXT.md:570-571 "JLP (Jupiter, Solana, 2023-11→2026-09, 1019 dni, bez incydentów)"
- journal/CONTEXT.md:578-579 "WERDYKT: JLP = nierozstrzygnięte, prawdopodobnie zawyżone"

### na-03 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The chunks do not state how much the GMX positions earned at the moment of switching from crypto pairs to shorts. The sources describe GMX short tests (e.g., a $15 test short with entry $2274.43, collateral 14.99 USDC, and a separate ~$150 test short with PnL −$0.39) and backtest performance of GMX v2 GM positions (e.g., GM-ETH/USD avg +2.19/window vs HODL 50/50), but they do not record a specific earnings figure at a “switch” from crypto pairs to shorts.


### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The provided chunks do not state the monthly electricity cost for the Windows server. They mention the server ran 24/7 ("serwer 24/7 uruchomiony") and that the original vision suggested a small VPS (~$5/month), which was replaced by a home Windows machine ("The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role"). However, no specific electricity cost figure is given.


### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks do not contain results for October 2026. The project journal and reports only cover activity from August through mid-September 2026. The most recent data points are pipeline logs from September 16, 2026, and a paper-trading status report from September 1, 2026, showing a total equity of $64,255 and a PnL of +$4,255. There is no information regarding outcomes, trades, or reports from October 2026 in the source material.


### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided source chunks do not state how many tokens were consumed building the project.


### na-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** What was the structure of the SQL database holding the backtest data?

The SQLite database (`data/homos.db`) did not store raw backtest swap data; those remained in NDJSON files. Instead, it held a `backtest_run` table serving as a results index with columns: `id` (INTEGER PRIMARY KEY), `ts` (INTEGER), `kind` (TEXT: walkforward/sweep/run/pegged), `pool_id` (TEXT), `params` (JSON TEXT), `file` (TEXT path to results), and `git_commit` (TEXT for audit). This design kept the database lightweight while allowing cross-time queries and UI aggregations.

- docs/DB-SCHEMA.md  [NOT-FOUND] "CREATE TABLE backtest_run ( id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, kind TEXT NOT NULL, pool_id TEXT, params TEXT, file TEXT NOT NULL, git_commit TEXT"
- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."
- journal/RESEARCH-QUEUE.md:735 "import przyrostowy do `data/homos.db` (better-sqlite3)"

