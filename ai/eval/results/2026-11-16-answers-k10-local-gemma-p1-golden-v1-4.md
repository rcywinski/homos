# Answers with citations: k = 10

Date 2026-11-16. Golden set v1.4. Generator `answer:ollama:gemma4:26b(think=false,num_ctx=17408,num_predict=2048,temperature=1,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "The next review is planned for 24.09."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 87 | 76 | 11 | 0 | 2 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 62% (16/26) | 80% (16/20) | 0% (0/6) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 2 | 2 | 1 | 0 |
| yes / evidence given | 20 | 0 | 0 | 0 |
| yes / evidence not given | 2 | 2 | 2 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 352105, output 10557 tokens; $0; generation median 3727 ms, p95 6425 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

Active re-centering (narrowing) was rejected because it failed to deliver higher net returns, despite generating significantly more fees. Backtests using a 720-day window showed that narrowing was outperformed by a passive wide range in all regimes, including the flat regime where narrowing was theoretically expected to win {"chunkId": "journal/CONTEXT.md:1362#p7", "quote": "Zwężanie przegrywa nawet tam, gdzie miało wygrywać"}. 

Specifically, the mechanism of re-centering caused Impermanent Loss (IL) and rebalancing costs to consume all additional fee revenue. On cbBTC, IL and re-centering cost approximately $1.9k above the fee gains, while on base-030, it cost approximately $2.9k {"chunkId": "journal/CONTEXT.md:1362#p7", "quote": "IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030) ponad to, co dołożyły fee"}. Furthermore, the project identified that narrow bands act as "short gamma," where every posture shift realizes divergence {"chunkId": "journal/CONTEXT.md:1362#p7", "quote": "Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję"}.

- journal/CONTEXT.md:1701 "Zwężanie przegrywa nawet tam, gdzie miało wygrywać"
- journal/CONTEXT.md:1704-1705 "IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030) ponad to, co dołożyły fee"
- journal/CONTEXT.md:1705-1706 "Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję"

### why-02 (answerable yes, evidence no, coverage partial)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The provided documents do not explicitly state why capital commitment was kept small during the rise of ETH and BTC. However, they note that during market uptrends, the strategy earns less than holding the assets (HODL) because the liquidity pool sells the rising asset, resulting in approximately 70% exposure and a 'band ceiling' (sufit pasma).

- journal/CONTEXT.md:999-1000 "przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma)"

### why-03 (answerable yes, evidence no, coverage partial)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The 720-day backtests covered only a few pools because the 720-day window was used as a validation gate, which revealed that 0 of 21 configurations passed on longer history containing a strong uptrend ({

- docs/CASE-STUDY.md:56-57 "Extending the window to 720 days killed the strategy. On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate."

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

Claude Code sessions coordinated through repository files because they could not see each other, as they ran on separate applications. Specifically, sessions like Sonnet, CC, and Windows were not reachable through direct messaging from the Fable session. The team decided to use repository files as a "communication bus," utilizing `HANDOFF.md` as lightweight per-agent inboxes to reduce the owner's role as a router. While direct pings between Claude Code sessions became possible later when both had Remote Control connected, they fell back to the hand-off files if that channel was down.

- docs/AI-WORKFLOW.md:27 "Sessions cannot see each other. They coordinated through the repository:"
- journal/CONTEXT.md:3278-3279 "sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej sesji (osobne aplikacje)."
- journal/CONTEXT.md:3279-3280 "Decyzja: zostajemy przy plikach repo jako szynie komunikacji"
- journal/CONTEXT.md:3280-3282 "dodając HANDOFF.md jako lekką skrzynkę per agent ("zrobione, odbierz") — redukuje rolę Rafała jako routera."
- journal/HANDOFF.md:22-24 "Jeśli `ListAgents` nie widzi drugiej strony (Remote Control akurat rozłączony), wróć do starego trybu: napisz w HANDOFF + poproś Rafała o przekazanie."

### why-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The bot and API server were run on a home Windows machine because a browser cannot serve as the automation engine; a closed laptop would result in a "dead autopilot" {"chunkId": "docs/UI-DESIGN.md:35", "quote": "the browser cannot be the automation engine — a closed laptop means a dead autopilot"}. The project vision originally suggested a small VPS, but ultimately, a "home Windows machine running 24/7 took that role" {"chunkId": "docs/UI-DESIGN.md:35", "quote": "a home Windows machine running 24/7 took that role"}. This setup allowed the bot to run as a separate 24/7 Node daemon {"chunkId": "docs/UI-DESIGN.md:35", "quote": "The bot is a separate process"}.

- docs/UI-DESIGN.md:45-46 "the browser cannot be the automation engine — a closed laptop means a dead autopilot"
- docs/UI-DESIGN.md:47-48 "a home Windows machine running 24/7 took that role"
- docs/UI-DESIGN.md:46 "The bot is a separate process"

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot never executed actions on its own because the full-automation phase (Phase 4) was not built as planned; the "AUTO mode was never enabled" {"chunkId": "docs/PLAN.md:151", "quote": "AUTO mode was never enabled"}. Instead, the system implemented semi-automatic execution (Phase 3), where signals result in a "ready transaction" that requires a "signature in Rabby" {"chunkId": "docs/PLAN.md:151", "quote": "semi-automatic execution (signal \u2192 ready transaction \u2192 signature in Rabby)"}. Regarding specific actions, the "on signal" mechanism was designed to "PROPOSE: a proposal for approval" rather than providing direct execution {"chunkId": "docs/UI-DESIGN.md:50", "quote": "PROPOSE: a proposal for approval"}. Furthermore, automatic execution for "ROTATE" actions was not supported because the existing rebalance builder only handled single-pool scenarios {"chunkId": "journal/CONTEXT.md:2673", "quote": "planRebalance() bierze jeden Pool na wejściu (zakłada, że stara i nowa pozycja są w TEJ SAMEJ puli)"}.

- docs/PLAN.md:168 "AUTO mode was never enabled"
- docs/PLAN.md:167 "semi-automatic execution (signal → ready transaction → signature in Rabby)"
- docs/UI-DESIGN.md:58 "PROPOSE: a proposal for approval"
- journal/CONTEXT.md:2698-2699 "planRebalance() bierze jeden Pool na wejściu (zakłada, że stara i nowa pozycja są w TEJ SAMEJ puli)"

### why-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

While a small VPS (~$5/month) was suggested in the project vision, a home Windows machine running 24/7 was used instead

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

A crypto/crypto pair like cbBTC/WETH was considered riskier because it carries "pełna beta krypto" (full crypto beta), meaning there is "ŻADNEJ poduszki stable" (no stable cushion) to offset volatility {"chunkId": "journal/CONTEXT.md:3806", "quote": "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable"}. In contrast, a crypto/stable pair such as WETH/USDC provides a "poduszka" (cushion) where the stable leg mitigates downside risk {"chunkId": "journal/KAPITAL-REKOMENDACJA.md:33", "quote": "stable = poduszka"}. Consequently, during a bearish regime, the cbBTC/WETH pair can face extreme drawdowns (e.g., maxDD of 61.5%) because it lacks the protection offered by a stablecoin leg {"chunkId": "journal/CONTEXT.md:3806", "quote": "maxDD 61.5%!"}.

- journal/CONTEXT.md:3818-3819 "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable"
- journal/KAPITAL-REKOMENDACJA.md:37 "stable = poduszka"
- journal/CONTEXT.md:3818 "maxDD 61.5%!"

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day backtests suggested profitability because that period was a "mostly sideways-to-down year" (a "rok spadkowo-boczny") which "flattered the strategy" (docs/CASE-STUDY.md:44, docs/DECISION-LOG.md:22). In contrast, extending the window to 720 days included a "strong uptrend" or "bull" (docs/CASE-STUDY.md:44). On this longer history, the "UP" regime was a failure for the strategies; specifically, "0 of 21 configurations passed the gate" (docs/CASE-STUDY.md:44, docs/DECISION-LOG.md:22).

- docs/CASE-STUDY.md:46 "The first calibration (365 days of data, a mostly sideways-to-down year)"
- docs/CASE-STUDY.md:56-57 "On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate"
- docs/DECISION-LOG.md:22 "The 365-day year (sideways-to-down) flattered the strategy; on 720 d 0 of 21 configurations passed"
- journal/CONTEXT.md:4772-4773 "na oknie 2-letnim z bullem ŻADNA strategia nie przechodzi bramki"
- journal/CONTEXT.md  [NOT-FOUND] "365d wyglądało lepiej głównie dlatego, że okno było spadkowo-boczny"

### why-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

In an uptrend, concentrated liquidity provides fee income that is offset by the cost of its convexity. Because LPs "sell into rallies and buy into drawdowns," a trending year can result in costs that "cost more than fees earn" {"chunkId": "docs/CASE-STUDY.md:105", "quote": "you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn"}. Additionally, strategies like the "no-swap" variant fail in rising markets because, after losing the upper boundary, the position remains in USDC and "in a rising market misses the move" {"chunkId": "journal/CONTEXT.md:1362#p9", "quote": "w rynku rosnącym przegapi ruch tak samo skutecznie"}. In some cases, the loss of value from impermanent loss and re-centering can significantly exceed the fees collected {"chunkId": "journal/CONTEXT.md:1362#p7", "quote": "IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030) ponad to, co dołożyły fee"}.

- docs/CASE-STUDY.md:108-109 "you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn"
- journal/CONTEXT.md:1796 "w rynku rosnącym przegapi ruch tak samo skutecznie"
- journal/CONTEXT.md:1704-1705 "IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030) ponad to, co dołożyły fee"

### dated-01 (answerable yes, evidence no, coverage full)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

The first real capital entry for LP (liquidity provision) was based on a recommendation from August 19, 2026, which outlined a plan for tranche 1 ($6k Base) and tranche 2 (up to $12–15k).

- journal/DECYZJE-2026-08-26.md:155-156 "Rekomendacja Fable z 19.08 w **KAPITAL-REKOMENDACJA.md**: transza 1 $6k Base (005 $2.5k + cbBTC $1.5k + $2k rezerwa), transza 2 do $12–15k"

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance executed on real capital occurred during the narrowing experiment on August 31, 2026. Although an earlier attempt to execute a rebalance sequence failed three times due to a "Rabby+publicnode 'Invalid parameters'" error, the sequence successfully completed after a hotfix was deployed. This "first bojowa transakcja produktu" (first combat product transaction) involved a series of steps including approvals, a multicall decrease+collect, a swap, and the minting of position #5908083.

- journal/CONTEXT.md:1202-1204 "~12:3x–13:xx — INCYDENT WYKONANIA (znalezisko #2 eksperymentu) + HOTFIX. Sekwencja [Zatwierdź] rebalansu przerywała się 3× z rzędu: błąd Rabby+publicnode "Invalid parameters""
- journal/CONTEXT.md:1228-1229 "~13:0x — EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA."
- journal/CONTEXT.md:1229-1233  [TOO LONG (41 words)] "Po wdrożeniu hotfixu (CC-Win: build+restart) sekwencja przeszła na czysto za jednym [Zatwierdź]: approve 0.0119 cbBTC → multicall decrease+collect (+0.4696 WETH +0.0144 cbBTC do portfela) → exactInputSingle 0.0026 cbBTC→0.0825 WETH → approve 0.5522 WETH + approve 0.0119 cbBTC (dociągnięcie) → mint #5908083"

### dated-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September 2026, the following positions were open:

**Real Positions (FlatWide product):**
* **#5886957** (base-weth-usdc-030): value $3468, vs HODL $-1.28 {"chunkId": "journal/reports/morning-2026-09-15.md:217", "quote": "#5886957 | base-weth-usdc-030 | SZEROKI | $3468 | $-1.28"}
* **#5978579** (base-cbbtc-weth-005): value $2266, vs HODL $-1.91 {"chunkId": "journal/reports/morning-2026-09-15.md:217", "quote": "#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266 | $-1.91"}

**Paper Trading positions:**
* **mainnet-usdc-weth-030**: PnL +$680 {"chunkId": "journal/reports/morning-2026-09-15.md:228", "quote": "mainnet-usdc-weth-030 | open | $10680 | +$680"}
* **mainnet-usdc-weth-005**: PnL +$659 {"chunkId": "journal/reports/morning-2026-09-15.md:228", "quote": "mainnet-usdc-weth-005 | open | $10659 | +$659"}
* **base-weth-usdc-030**: PnL +$623 {"chunkId": "journal/reports/morning-2026-09-15.md:228", "quote": "base-weth-usdc-030 | open | $10623 | +$623"}
* **base-cbbtc-weth-005**: PnL +$1936 {"chunkId": "journal/reports/morning-2026-09-15.md:228", "quote": "base-cbbtc-weth-005 | open | $11936 | +$1936"}
* **arbitrum-weth-usdc-005**: PnL +$707 {"chunkId": "journal/reports/morning-2026-09-15.md:228", "quote": "arbitrum-weth-usdc-005 | open | $10707 | +$707"}
* **base-weth-cbbtc-030**: PnL +$325 {"chunkId": "journal/reports/morning-2026-09-15.md:228", "quote": "base-weth-cbbtc-030 | open | $10325 | +$325"}

- journal/reports/morning-2026-09-15.md:221 "#5886957 | base-weth-usdc-030 | SZEROKI | $3468 | $-1.28"
- journal/reports/morning-2026-09-15.md:222 "#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266 | $-1.91"
- journal/reports/morning-2026-09-15.md:232 "mainnet-usdc-weth-030 | open | $10680 | +$680"
- journal/reports/morning-2026-09-15.md:233 "mainnet-usdc-weth-005 | open | $10659 | +$659"
- journal/reports/morning-2026-09-15.md:234 "base-weth-usdc-030 | open | $10623 | +$623"
- journal/reports/morning-2026-09-15.md:235 "base-cbbtc-weth-005 | open | $11936 | +$1936"
- journal/reports/morning-2026-09-15.md:236 "arbitrum-weth-usdc-005 | open | $10707 | +$707"
- journal/reports/morning-2026-09-15.md:237 "base-weth-cbbtc-030 | open | $10325 | +$325"

### dated-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the last backtest finish?

The last recorded backtest-run finished on 2026-09-23 at 05:03:07.956Z.

- journal/reports/morning-2026-09-23.md:43 "2026-09-23T05:03:07.956Z krok backtest-run: exit 0"

### dated-05 (answerable yes, evidence no, coverage none)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

No, the provided chunks do not contain any record of an attempt to protect a position by converting it into a different kind of position. While the documents discuss various strategies (such as "up\u21925050" for catching beta during an upward trend) and rebalancing actions (such as closing a narrow position and opening a wide one), they do not describe a conversion of one position kind into another for protection purposes.


### dated-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The first nightly run completed successfully (all "green") on 2026-08-22 at approximately 09:1x, following repairs. This run was described as "wszystko zielone i tym razem PRAWDZIWIE" (everything green and this time TRULY) {"chunkId": "journal/CONTEXT.md:4411#p1", "quote": "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE"}. 

Errors did occur later; for example, a "backtest-run 2x exit 1" failure was recorded during the night of 2026-08-26 {"chunkId": "journal/CONTEXT.md:2178#p4", "quote": "JEDYNA USTERKA: **backtest-run 2\u00d7 exit 1**"}. This specific error was diagnosed by CC-Win and was not an OOM issue, as the heap had been increased {"chunkId": "journal/CONTEXT.md:2178#p4", "quote": "pierwsza porażka PO podniesieniu heapu do 12288, więc raczej nie OOM z 20.08"}.

- journal/CONTEXT.md:4411 "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE"
- journal/CONTEXT.md  [NOT-FOUND] "JEDYNA USTERKA: **backtest-run 2\u00d7 exit 1**"
- journal/CONTEXT.md:2338-2339 "pierwsza porażka PO podniesieniu heapu do 12288, więc raczej nie OOM z 20.08"

### dated-07 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

Infrastructure problems included a volatility estimator that measured pool microstructure rather than the asset, resulting in "broken units" for calibration (docs/CASE-STUDY.md:44). Additionally, a UI error caused a rebalance attempt to revert due to a stale pool state (docs/CASE-STUDY.md:67), and a sampling gap caused a $35 drift in the tranche balance (docs/CASE-STUDY.md:67). 

While capital was invested (starting 27 Aug), a significant change occurred on 29 August. The production `SIGMA_MODE` was changed from `swap` to `grid15` because `SIGMA_MODE` had not been set anywhere, causing the live bot to use the wrong estimator (journal/CONTEXT.md:1362#p4). This change was implemented via a service restart at 10:15:53Z to ensure subsequent narrowing used the correct sigma (journal/CONTEXT.md:1362#p4).

- docs/CASE-STUDY.md:52 "The volatility estimator was measuring pool microstructure, not the asset."
- docs/CASE-STUDY.md:53-54 "Every k calibrated in those units was calibrated in broken units."
- docs/CASE-STUDY.md:86 "the UI had priced the mint from a stale pool state"
- docs/CASE-STUDY.md:89-90 "diagnosed a $35 drift caused by a ten-minute sampling gap"
- journal/CONTEXT.md:1527-1530 "produkcyjny default to `SIGMA_MODE='swap'`, a rekalibracja i wyniki E1/E4 liczone są `grid15` — jeśli usługa nie ma tej zmiennej w env, pierwsze zwężenie pójdzie inną σ niż backtest, który je uzasadnił"
- journal/CONTEXT.md  [NOT-FOUND] "Decyzja Rafała: ustawiamy grid15 teraz, żeby pierwsze FLAT_NARROW posło tą samą σ, która to zwężenie uzasadniła."
- journal/CONTEXT.md:1559 "restart 10:15:53Z"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The capital exit occurred in two main stages. First, the liquidity provider (LP) positions for Tranche 1 were unwound on 18 September 2026, with the decision to keep the capital in crypto as a spot bet (USDC moved to Kraken) {"chunkId": "journal/CONTEXT.md:190#p1", "quote": "2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto"}. Second, the full exit of Tranche 1 into EUR was completed on 21 September 2026, following a decision to "sell everything today" {"chunkId": "journal/CONTEXT.md:101", "quote": "TRANSZA 1 ZAMKNIĘTA — pełne wyjście do EUR"}. This final exit involved selling ETH and cbBTC (converted to USDC) for EUR on Kraken, resulting in approximately 5,605 EUR {"chunkId": "journal/CONTEXT.md:101", "quote": "razem z 18.09 (1 871 USDC → ≈ 1 628 EUR netto) transza ≈ 5 605 EUR"}.

- journal/CONTEXT.md:190 "2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto"
- journal/CONTEXT.md:101 "TRANSZA 1 ZAMKNIĘTA — pełne wyjście do EUR"
- journal/CONTEXT.md  [NOT-FOUND] "razem z 18.09 (1 871 USDC → ≈ 1 628 EUR netto) transza ≈ 5 605 EUR"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat for the cbBTC leg starting from 22:22Z on 30 August 2026, when the flat detector began ticking. The only live narrowing episode, conducted as an operational experiment ($n=1$), lasted 11 days, running from 31 August to 11 September 2026.

- journal/CONTEXT.md:1135-1136 "Zegar flatu cbBTC tyka od 30.08 22:22Z"
- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)."
- journal/CONTEXT.md:294-295 "11 dni w flacie"

### dated-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

The paper-trading bot performed three rebalances before real capital was deployed. These occurred on three ETH/USDC pools (mainnet 0.30, mainnet 0.05, and base 0.30) following a 24h out-of-range hysteresis and a payback period of ≤7d. The specific dates of these rebalances are not explicitly provided, but they were reported in the morning digest on 2026-08-21.

- journal/CONTEXT.md:4175-4176 "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30)"
- journal/CONTEXT.md:4175-4177 "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30): histereza 24h poza zakresem dobiegła i payback wyszedł ≤7d."
- journal/CONTEXT.md:4165 "PIERWSZE 3 REBALANSE w paper tradingu"
- journal/PYTANIE-SZEROKOSC-I-SIGMA.md:20 "Realny kapitał jeszcze nie wszedł (planowana transza $6k, decyzja 26.08)."

### id-01 (answerable yes, evidence yes, coverage full)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a type of proposal (kind) related to a product called FlatWide, rather than a single specific position or a general algorithm. It represents a 

- journal/HANDOFF.md:402-403 "Karty propozycji FLAT_NARROW/FLAT_WIDEN (produkt FlatWide)"
- journal/reports/morning-2026-09-19.md  [NOT-FOUND] "id": "flat-narrow-5978579-1789441387109", "kind": "FLAT_NARROW""
- journal/CONTEXT.md  [NOT-FOUND] "zwężenie z ±40% do ±5%: stała szerokość produktu ±5%"

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is classified as a wide position (postura SZEROKI) in the real positions reports dated September 13, 16, 17, and 18, 2026.

- journal/reports/morning-2026-09-13.md:281 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-16.md:242 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-17.md:261 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-18.md:275 "#5978579 | base-cbbtc-weth-005 | SZEROKI"

### id-03 (answerable yes, evidence no, coverage none)

**Q:** Was the range of position #5886957 ever changed, and when?

The provided documents do not contain information regarding whether the range of position #5886957 was ever changed.


### id-04 (answerable yes, evidence yes, coverage full)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package, titled "DETEKTOR→POMIAR" (Detector $\rightarrow$ Measurement), was a waiting list of tasks to be implemented after the closing of episode #5908083 {

- journal/RESEARCH-QUEUE.md  [NOT-FOUND] "## D0. PACZKA “DETEKTOR→POMIAR" — poczekalnia (wdrożżc po zamknieciu epizodu #5908083)"

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

The `fetchFreshPool` function is described as being correct and performing a specific sequence of actions: it uses `factory.getPool` to retrieve a pool, followed by `slot0+liquidity` to create a new Pool, operating in a "fail-open" manner.

- journal/HANDOFF.md:256-257 "`fetchFreshPool` poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open]"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2, titled "HOUSE" (or "DOM KASYNA"), is a project stage focused on evaluating liquidity provider (LP) strategies in protocols like GMX (GM v2), Hyperliquid (HLP), and Jupiter (JLP). It is part of a sequential research process (E8.0 → E8.1 → E8.2) conducted by CC-Mac. The stage involves running specific npm scripts such as `e8:vault` and `e8:house` to analyze indices like ΔPnL/accountValue and verify GM token addresses on Arbitrum. The research aims to identify if these "casino house" LPs have a repeatable edge over a HODL basket. While HLP was deemed uninterpretable due to low sample size and GLP showed no edge, GM v2 and JLP were identified as potential candidates, though GM v2 was noted as having a 3-year sample without a bear market.

- journal/RESEARCH-QUEUE.md:372 "E8.0 → E8.1 → E8.2"
- journal/RESEARCH-QUEUE.md:397 "E8.2 HOUSE (CC-Mac, ~15 min)"
- journal/RESEARCH-QUEUE.md:397-398 "E8.2 HOUSE (CC-Mac, ~15 min): 1. `npm run e8:vault -- hlp`"
- journal/CONTEXT.md:454 "E8.2 ZAMKNIĘTE — werdykt klasy “dom kasyna""
- journal/CONTEXT.md  [NOT-FOUND] "GM v2 (GMX, Arbitrum)"
- journal/CONTEXT.md:478 "JLP mix3"
- journal/CONTEXT.md  [NOT-FOUND] "HLP — Hyperliquid daje ~98 punktów za 3 lata — n=2–5 okien, NIEINTERPRETOWALNY"
- journal/HANDOFF.md  [NOT-FOUND] "GM v2 = jedyny kandydat z dodatnim edge, ale próbka 3 lata BEZ BESSY"

### id-07 (answerable yes, evidence yes, coverage full)

**Q:** In which database were the backtest results stored?

The database does not store raw tick-level swaps, which remain in files; instead, it holds the `backtest_run` (results index). Backtest results from specific runs are stored as JSON files in the `backtest/results/` directory.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."
- journal/RESEARCH-QUEUE.md:623 "wyniki w backtest/results/pegged-*.json"

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The application does not calculate the specific amount of tax you should pay. It only notes that selling crypto for fiat is a "taxable event in Poland" and should be reported in the "PIT-38" return.

- docs/EMERGENCY.md:104-105 "Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax return, PIT-38)"

### na-02 (answerable partial, evidence no-evidence, coverage partial)

**Q:** What were the backtest results for the Solana network?

The provided chunks do not contain backtest results for the Solana network. They do, however, report findings for the JLP pool (Jupiter, Solana, 2023-11 → 2026-09, 1019 days), noting that a mix of 90/30 yielded an average of +6.52%/window, 72%, and an α of +20.6%/r, though the authors considered these results "nierozstrzygnięte, prawdopodobnie zawyżone" (undecided, probably inflated) due to the SOL rally escaping to α.

- journal/CONTEXT.md  [NOT-FOUND] "JLP (Jupiter, Solana, 2023-11→2026-09, 1019 dni, bez incydentów): mix 90/30 śdr +6.52%/okno, 72%, worst −10.17 (2025), βETH 0.17, βBTC 0.48, α +20.6%/r, 66% po korekcie"
- journal/CONTEXT.md:578-579 "WERDYKT: JLP = nierozstrzygnięte, prawdopodobnie zawyżone"

### na-03 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The provided chunks do not contain information regarding how much GMX positions earned at the specific moment of switching from crypto pairs to shorts. The documents mention testing a GMX short of approximately $15 (which resulted in +14.96 USDC and +0.0006 ETH upon closing) and a test GMX short with a margin of $149.92 that had a PnL of -$0.39, but these are described as separate test executions rather than a transition from crypto pairs to shorts.


### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The provided documents do not state the monthly electricity cost for the Windows server. While they confirm that a home Windows machine running 24/7 took the role of the automation engine instead of a small VPS {


### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks do not contain any information regarding the results for October 2026. The documentation and journal entries only cover data and activities from August 2026 through September 2026.


### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided source chunks do not contain information regarding the total number of tokens consumed to build the project.


### na-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** What was the structure of the SQL database holding the backtest data?

The SQL database does not hold the raw backtest data, such as tick-level swaps, which are stored in files because they would "bloat by orders of magnitude" {"chunkId": "docs/DB-SCHEMA.md:164", "quote": "the database adds\n  nothing here and would bloat by orders of magnitude"}. Instead, the database holds a results index in the `backtest_run` table {"chunkId": "docs/DB-SCHEMA.md:164", "quote": "The database holds only\n  `backtest_run` (results index)"}. 

The `backtest_run` table structure includes: 
- `id` (INTEGER PRIMARY KEY)
- `ts` (INTEGER)
- `kind` (TEXT: walkforward, sweep, run, or pegged)
- `pool_id` (TEXT)
- `params` (TEXT: JSON containing window, step, or WF_SET)
- `file` (TEXT: JSON path in `backtest/results/`)
- `git_commit` (TEXT)

{"chunkId": "docs/DB-SCHEMA.md:40#p2", "quote": "CREATE TABLE backtest_run (
  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL,
  kind TEXT NOT NULL,                     -- walkforward|sweep|run|pegged
  pool_id TEXT, params TEXT,              -- JSON: window/step/WF_SET
  file TEXT NOT NULL,                     -- JSON path in backtest/results/
  git_commit TEXT                         -- engine version (audit: what was computed with what)
);"}

- docs/DB-SCHEMA.md:167-168 "the database adds
  nothing here and would bloat by orders of magnitude"
- docs/DB-SCHEMA.md:168-169 "The database holds only
  `backtest_run` (results index)"
- docs/DB-SCHEMA.md:141-147  [TOO LONG (46 words)] "CREATE TABLE backtest_run (
  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL,
  kind TEXT NOT NULL,                     -- walkforward|sweep|run|pegged
  pool_id TEXT, params TEXT,              -- JSON: window/step/WF_SET
  file TEXT NOT NULL,                     -- JSON path in backtest/results/
  git_commit TEXT                         -- engine version (audit: what was computed with what)
);"

