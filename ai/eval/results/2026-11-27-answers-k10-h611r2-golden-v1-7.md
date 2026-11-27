# Answers with citations: k = 10

Date 2026-11-27. Golden set v1.7. Generator `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60) index=ollama-bge-m3.ctx-haiku>rerank:bge-reranker-v2-m3(top100,doc=meta), reranker sees the contexts (saved lists, ai/eval/results/2026-11-27-chunk-lists-k10-6-11-golden-v1-7.json, sha256 2fca459de5be666864e70e72c8402ad094c2a326709e590876b385eeba3b8ff2)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "The next review is planned for 24.09 (September 24, 2026)."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 103 | 103 | 0 | 0 | 0 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 77% (20/26) | 91% (20/22) | 0% (0/4) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 1 | 3 | 1 | 0 |
| yes / evidence given | 22 | 0 | 0 | 0 |
| yes / evidence not given | 1 | 3 | 0 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 365160, output 10211 tokens; $0; generation median 10857 ms, p95 14832 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

The project did not re-center frequently because backtests showed the costs of re-centering (impermanent loss and swap fees) exceeded the extra fees earned. A 720-day walkforward found that while narrowing earned ~4x more fees, the IL from re-centering consumed ~$1.9k–$2.9k more, resulting in lower net returns than passive wide ranges. The journal states that a narrow band acts like a "short gamma," where every re-centering "REALIZUJE dywergencję" (realizes divergence). Consequently, they stayed wide, noting that "Albo wąsko naprawdę, albo wcale" (either truly narrow or not at all), and that the passive wide strategy won even in flat regimes.

- journal/CONTEXT.md:1702-1703 "zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło NIŻEJ"
- journal/CONTEXT.md:1705-1706 "Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję"
- journal/CONTEXT.md:1817-1818 "Albo wąsko naprawdę, albo wcale"
- journal/CONTEXT.md:1701 "Zwężanie przegrywa nawet tam, gdzie miało wygrywać"

### why-02 (answerable yes, evidence no, coverage partial)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The journal does not explicitly state that capital was kept small *because* ETH and BTC were rising. Instead, it notes that the LP strategy underperforms HODL during rallies: "przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma)" (with growth, we earn less than HODL because the pool sells the rising asset). The project also maintained a rule of "zero new capital" until the 24.09 review to focus on research and measurement rather than scaling up during a potentially overvalued or volatile market phase.

- journal/CONTEXT.md:999-1000 "przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma)"
- journal/CONTEXT.md:581 "Zero kapitału i kodu produkcyjnego do 24.09"

### why-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The 720-day backtests covered only four pools (base-030, mainnet-005, arb-005, cbBTC-005) because they were copies of the existing -365d pool addresses, with days set to 720. These specific pools were chosen because they were the ones already tracked in the pipeline (the daily/365d set), allowing the team to quickly extend the window to 720 days to test if the strategy held up over a longer period that included a strong uptrend, which the 365-day window had missed.

- journal/CONTEXT.md:4762-4764 "4 pule `*-720d` w fetch-swaps.ts (base-030/mainnet-005/arb-005/cbBTC-005; kopie adresów -365d, days:720"
- docs/CASE-STUDY.md:56-57 "Extending the window to 720 days killed the strategy. On the longer history, which included a strong uptrend"

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The sessions could not message each other directly because they ran in separate applications that were not reachable via direct messaging. The project empirically verified this limitation (using ListAgents) and confirmed that Sonnet, Claude Code, and Windows sessions were not accessible through direct messaging from a given session. Consequently, they defaulted to repository files (specifically HANDOFF.md and CONTEXT.md) as the communication bus to avoid collisions and reduce the need for a human router. Later in the project, direct pings via SendMessage became possible when the Remote Control channel was connected, but the file-based system remained the primary fallback when that channel was down or when ListAgents could not see the other session as a peer.

- journal/CONTEXT.md:3278-3279 "sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej sesji (osobne aplikacje)"
- docs/AI-WORKFLOW.md:53-55 "Later in the project the two Claude Code sessions could message each other directly after a push or a deployment; when that channel was down they fell back to the inbox"
- journal/HANDOFF.md:22-24 "Jeśli `ListAgents` nie widzi drugiej strony (Remote Control akurat rozłączony), wróć do starego trybu: napisz w HANDOFF"

### why-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The Windows machine was chosen because it could run as a 24/7 always-on server, whereas the Mac was used for development. The journal notes that the bot and API server were deployed on the user's stationary Windows machine to provide continuous operation ("serwer 24/7 uruchomiony"), with services registered via NSSM for autostart and no console windows. The Mac served as the development environment where code was written and tested locally ("dev na Macu: npm start / npm run bot"), but the production deployment required a machine that stays powered on and accessible over LAN/VPN, which the Windows machine provided.

- journal/CONTEXT.md:3081 "Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)"
- journal/CONTEXT.md:3082 "Wykonano `TASKS-WINDOWS.md` (kroki 1–10) na stacjonarnym Windows użytkownika"
- journal/TASKS-INFRA.md:32-33 "dev na Macu: npm start / npm run bot; serwer Windows: deploy/setup-windows.md"
- journal/CONTEXT.md:3151 "EKOSYSTEM KOMPLETNY: bot-usługi niewidoczne 24/7 + API po LAN/VPN + pipeline codziennie 7:30 + aplikacja na Macu"

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot operated exclusively in PROPOSE mode, meaning it generated recommendations but never executed trades independently. The documentation explicitly states that "the bot executes nothing on its own" and that the UI displayed the status "OBSERWUJ — bot niczego nie wykonuje" (Observe — the bot does nothing). While a full-automatic execution mode (AUTO) was planned for Phase 4, it was "not built as planned" and "never enabled." Instead, all actions—such as opening, closing, or rebalancing positions—required manual approval and signature via a browser wallet (Rabby), functioning as a semi-automatic workflow where the bot prepared the transaction for human sign-off.

- docs/EMERGENCY.md:9 "Everything runs in PROPOSE mode: the bot executes nothing on its own."
- journal/TASKS-UI.md:114 "Stopka: "OBSERWUJ — bot niczego nie wykonuje""
- docs/PLAN.md:168 "AUTO mode was never enabled"
- docs/UI-DESIGN.md:58 "PROPOSE: a proposal for approval; AUTO (not built): execution within limits"

### why-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The source does not state an explicit reason for rejecting a cloud VPS in favor of the home Windows machine. It only notes that while the original vision suggested a small VPS (~$5/month), the home Windows machine ultimately took that role. A VPS deployment is listed as a future goal (docker compose up), not a past decision with stated rationale.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."
- journal/RESEARCH-QUEUE.md:746 "Cel: przyszły deploy na VPS = docker compose up."

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

A crypto/crypto pair like cbBTC/WETH was considered riskier because both legs are exposed to the same crypto market beta, offering no diversification cushion. In a down market, the pair suffers "full beta" losses with no stable leg to offset the decline, unlike crypto/stable pairs where one leg acts as a hedge. The journal notes that for cbBTC/WETH, "both legs crypto = full beta, no stable cushion," leading to high maximum drawdowns (e.g., 61.5% in one backtest) and negative absolute returns, whereas crypto/stable pairs benefit from the stable asset's lower volatility and inverse correlation during crypto downturns.

- journal/CONTEXT.md:3818-3819 "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable"
- journal/RESEARCH-QUEUE.md:47-48 "obie nogi crypto = pełna beta, zero poduszki stable"
- journal/KAPITAL-REKOMENDACJA.md:38 "w spadkowym reżimie to pełna beta krypto (żadna noga nie jest stable)"

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day window covered a "mostly sideways-to-down year," which "flattered range-bound strategies" and made them appear profitable. The 720-day window included a "strong uptrend" where range-bound strategies underperformed; on that longer history, "0 of 21 configurations passed the gate." The project explicitly noted that the shorter window lacked the bull market conditions necessary to test robustness, creating "false optimism."

- docs/CASE-STUDY.md:46 "mostly sideways-to-down year"
- docs/CASE-STUDY.md:58 "flattered range-bound strategies"
- docs/CASE-STUDY.md:57 "0 of 21 configurations passed the gate"
- journal/CONTEXT.md:2204-2205 "365d bez bulla dawało fałszywy optymizm"

### why-10 (answerable yes, evidence yes, coverage full)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

The LP earned less in fees during an uptrend because the strategy operated with a narrow range that was frequently out of position. In an uptrend, the price moved away from the LP's concentrated liquidity, causing the position to become one-sided (e.g., holding only the depreciating asset relative to the rising one). This resulted in high Impermanent Loss (IL) and 're-centering' costs that outweighed the fees collected. As noted in the source, a narrow band acts as a 'short gamma' position where every rebalancing realizes the divergence between the LP's holdings and the market price, meaning the LP loses value to the trend while trying to collect trading fees. Consequently, the net PnL was lower than in flat markets where the price stayed within the range, allowing fees to accumulate without the drag of directional loss.

- journal/CONTEXT.md:1702-1703 "zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło NIŻEJ."
- journal/CONTEXT.md:1705-1706 "Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję."
- journal/CONTEXT.md:4500-4501 "strategia na reżimie pompy PRZEGRAŁA z niereobieniem niczego o $4.5k."
- journal/CONTEXT.md:1704-1705 "Czyli IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030) ponad to, co dołożyły fee"

### dated-01 (answerable yes, evidence no, coverage partial)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

The chunks do not state the exact date the first real LP capital entered through the application. They only show that the capital decision was prepared for 26.08 (a $6k tranche 1 recommendation) and that by 28.08 the UI was already displaying real positions (#5886957/#5887690) with fee/rebalance stats, so the first real LP entry occurred on or before 28.08, but the precise entry date is not given in these chunks.

- journal/DECYZJE-2026-08-26.md:153 "KAPITAŁ — pierwsze realne wejście LP (główna decyzja)"
- journal/HANDOFF.md:1085-1086 "karty #5886957/#5887690 mają "Fee reinwestowane $0""

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance on real capital was executed on 31 August 2026. The journal marks this as "~13:0x — EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA" (the episode started: first combat product transaction executed). It involved closing old position #5887690 and minting new position #5908083 (cbBTC/WETH 0.05%) after a hotfix was deployed.

- journal/CONTEXT.md:1228-1229 "~13:0x — **EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA.**"
- journal/CONTEXT.md:1235 "Stara pozycja #5887690 zamknięta."
- journal/CONTEXT.md:1233-1234 "**mint #5908083** (cbBTC/WETH 0.05%"

### dated-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September 2026, the project had two real FlatWide LP positions open: #5886957 (base-weth-usdc-030, SZEROKI, value $3,468) and #5978579 (base-cbbtc-weth-005, SZEROKI, value $2,266), totaling $5,733.13. Cumulative PnL from anchor was −$39.98 and −$92.39 respectively. Additionally, six paper-trading pools were open (e.g., mainnet-usdc-weth-030 +$680, base-cbbtc-weth-005 +$1,936), totaling +$4,931 PnL. The 16 September report shows the real portfolio dropped to $5,605.26 (−4.29%), attributing the daily loss to market movement on LPs.

- journal/reports/morning-2026-09-15.md:221 "#5886957 | base-weth-usdc-030 | SZEROKI | $3468"
- journal/reports/morning-2026-09-15.md:222 "#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266"
- journal/reports/morning-2026-09-15.md:232 "mainnet-usdc-weth-030 | open | $10680 | +$680"
- journal/CONTEXT.md:251 "16.09 $5 830.92 (−4.29%)"

### dated-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the last backtest finish?

The last backtest finished on 2026-09-23 at 05:03:07.956Z, when the backtest-run step exited with code 0. This is the most recent completed backtest in the provided logs.

- journal/reports/morning-2026-09-23.md:43 "2026-09-23T05:03:07.956Z krok backtest-run: exit 0"

### dated-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

Yes. On 11 Sep 2026, the narrow (±5%) cbBTC/WETH position #5908083 was closed and converted into a wide (±40%) position #5978579 via a three-step rebalance (burn+collect, swap, mint). This was the "FLAT_WIDEN" action after the flat period ended. The first mint attempt failed with a "Price slippage check" error due to stale pool state, but funds were safe and a retry succeeded. The narrow position had earned ~$8.6 in fees over 11 days; the rebalance cost ~$0.6–0.7 total.

- journal/CONTEXT.md:294-295 "stara #5908083 (wąska ±5%, 31.08→11.09, **11 dni w flacie**, fee ~$8.6 wg 09.09) zamknięta"
- journal/CONTEXT.md:295-296 "nowa #5978579 WETH/cbBTC 0.05% Base, SZEROKA ±40%, $2 341.81, in-range pośrodku"
- journal/CONTEXT.md:288-289 "przy pierwszym podejściu krok 3 (mint) padł na symulacji — „Execution reverted: Price slippage check""
- journal/CONTEXT.md:394-395 "koszt całkowity (gaz + fee swapu + impact) ≈ **$0.6–0.7 vs plan $1.23**"

### dated-06 (answerable yes, evidence no, coverage partial)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The first nightly run to complete without errors was on 2026-08-22, described as "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE". Subsequent runs on 2026-08-23, 2026-08-24, 2026-08-29, 2026-09-01, 2026-09-11, 2026-09-13, and 2026-09-23 all finished with "PIPELINE KONIEC — porażki: BRAK", indicating no further errors occurred. The chunks do not specify what caused the earlier errors or how they were fixed, other than noting the 08-22 run was "po naprawach" (after fixes).

- journal/CONTEXT.md:4442-4470 "Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE"
- journal/reports/morning-2026-08-23.md:48 "=== PIPELINE KONIEC — porażki: BRAK ==="
- journal/reports/morning-2026-08-24.md:48 "=== PIPELINE KONIEC — porażki: BRAK ==="
- journal/reports/morning-2026-09-23.md:48 "=== PIPELINE KONIEC — porażki: BRAK ==="

### dated-07 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

The main infrastructure problem was a configuration mismatch: the production bot calculated volatility (σ) using the 'swap' estimator, while backtests justified parameters using 'grid15'. This was discovered and fixed on 29 August 2026, after capital was invested on 27 August. The fix involved setting `SIGMA_MODE` to 'grid15' in the service environment and restarting the bot. Additionally, a stale pool state in the UI caused a transaction to revert on a slippage check, which was fixed the same day it occurred.

- journal/CONTEXT.md:1536-1538 "żywy bot liczył σ estymatorem swap, mimo że kalibracja k, progi flatu i EV zwężania z E1/E4 pochodzą z grid15"
- journal/CONTEXT.md:1558-1559 "σ grid15 WDROŻONA (CC-Win: NSSM tylko dla homos-bot, restart 10:15:53Z"
- docs/CASE-STUDY.md:85-86 "first attempt reverted on a slippage check because the UI had priced the mint from a stale pool state"
- docs/CASE-STUDY.md:69 "I deposited 6 092 USDC on Base"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The capital was withdrawn in two stages. First, on 18 Sep 2026, the LP positions were closed and USDC was moved to Kraken ("USDC → Kraken (~16:00 PL)"). Second, on 21 Sep 2026, the remaining assets (ETH and cbBTC) were sold and converted to EUR ("pełne wyjście do EUR ... wykonanie ~19:00 PL"). The tranche was fully closed to EUR between 18–21 Sep 2026.

- journal/CONTEXT.md:227 "USDC → KRAKEN (~16:00 PL)"
- journal/CONTEXT.md:101 "pełne wyjście do EUR (decyzja Rafała ~14:00 PL „dziś z całością", wykonanie ~19:00 PL)"
- docs/EMERGENCY.md:90-91 "the tranche was closed to EUR on 18–21 Sep 2026"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat from 31 Aug to 11 Sep 2026 (11 days). This was the only live narrowing episode, which lasted 11 days in range before the trend breaker closed it.

- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)."
- docs/CASE-STUDY.md:83 "It sat in range for 11 days"

### dated-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

The paper-trading bot rebalanced 3 times. These occurred on 2026-08-21, as the first rebalances since the paper trading start on 18.08. This happened before real capital was deployed (which was decided on 2026-08-26).

- journal/CONTEXT.md:4165 "PIERWSZE 3 REBALANSE w paper tradingu"
- journal/CONTEXT.md:4165 "2026-08-21 09:1x"
- journal/DECYZJE-2026-08-26.md:36 "KAPITAŁ (pkt 1): CZEKA W USDC"

### id-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a specific position action (a proposal kind), not a standalone range algorithm. It is a product of the "FlatWide" logic that narrows a wide range to a fixed narrow width once flatness is confirmed. The chunks show it as a `kind`/`action` value in proposal objects, e.g., "kind": "FLAT_NARROW", with a `suggestedRange` computed by a helper (suggestFixedRange). The decision log confirms it: "pierwsza w historii propozycja FLAT_NARROW ~10:22Z" and "dzisiejsze FLAT_NARROW na cbBTC PODPISUJEMY." It is a one-off narrowing action triggered by the flat detector, with a corresponding FLAT_WIDEN to revert.

- journal/reports/morning-2026-09-16.md:109 ""kind": "FLAT_NARROW""
- journal/CONTEXT.md:1137 "pierwsza w historii propozycja FLAT_NARROW ~10:22Z"
- journal/CONTEXT.md:1157 "dzisiejsze FLAT_NARROW na cbBTC PODPISUJEMY"
- journal/CONTEXT.md:1576 "propozycja FLAT_NARROW niesie WŁASNY"

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is a wide position. The morning reports consistently list it with the postura (posture) "SZEROKI" (wide) on the base-cbbtc-weth-005 pool. It was opened on 2026-09-11 as a FLAT_WIDEN action, and although a FLAT_NARROW proposal (to narrow from ±40% to ±5%) has been open since mid-September, the position's recorded posture remains wide.

- journal/reports/morning-2026-09-16.md:242 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/CONTEXT.md:412-452 "FLAT_WIDEN podpisany (nowa pozycja #5978579)"

### id-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Was the range of position #5886957 ever changed, and when?

The range of position #5886957 was never changed. It remained a wide (±50%) position throughout its lifecycle from 27.08 to 18.09. The bot proposed narrowing it to ±5% on 16.09, but the user closed the position entirely on 18.09 instead of executing the change.

- journal/CONTEXT.md:25-26 "#5886957 WETH/USDC ±50%"
- journal/reports/morning-2026-09-17.md:107 ""tokenId": "5886957""
- journal/CONTEXT.md:212 "#5886957 → 0,6540 ETH + 1 870,45 USDC"

### id-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package was titled "DETEKTOR→POMIAR" (detector→measurement) and contained two tasks: (1) stopping the flat detector from emitting FLAT_NARROW/FLAT_WIDEN proposals, keeping only episode measurement and logs; and (2) cosmetic fixes to the old "k×σ" formula in three places (observer.ts:631, a Telegram format, and cycleLine.tsx). It was about project functionality (changing how the bot's flat detector behaved and its UI labels), not about tests. The journal also notes D0 was "jeszcze niewdrożona" (not yet implemented) as of 16.09.

- journal/RESEARCH-QUEUE.md:498 "D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia"
- journal/RESEARCH-QUEUE.md:499 "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN"
- journal/RESEARCH-QUEUE.md:501 "KOSMETYKA "k×σ" (3 kryjówki starej formułki)"
- journal/CONTEXT.md:262-263 "detektor→pomiar = paczka D0 jeszcze niewdrożona"

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

fetchFreshPool (in src/utils/uniswap.ts) refreshes a Uniswap v3 pool object by calling factory.getPool to get the pool address, then reading slot0 and liquidity to build a new Pool instance with the same tokens and fee tier. It is fail-open: if the factory or RPC call fails, it returns the old pool object instead of throwing. It is wired into useRebalanceExecution and useRotateExecution right before buildMintStep so that rebalance/rotate calculations use the current on-chain price rather than a stale one. A known caveat: the range tick bounds still come from the original plan (computed at the old price), so after a price move the range is slightly off-center.

- journal/CONTEXT.md:351-352 "fetchFreshPool (src/utils/uniswap.ts): factory.getPool → slot0 + liquidity → nowy Pool z tymi samymi tokenami/fee"
- journal/CONTEXT.md:352-353 "fail-open (zwraca stary pool, gdy fabryka/RPC zawiedzie)"
- journal/CONTEXT.md:353-354 "wpięty w useRebalanceExecution i useRotateExecution tuż przed buildMintStep"
- journal/HANDOFF.md:256-257 "fetchFreshPool poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open], wpięty w oba hooki przed buildMintStep"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2 was the "casino house" ("DOM KASYNA") research stage. It tested whether LP protocols that act as the counterparty to leveraged perp traders (pricing via oracles, no LVR) generate a real edge over a same-beta HODL basket. Protocols tested: GM v2 (ETH/BTC), JLP (Jupiter), GLP (GMX v1). Verdict (closed 09.09): the class has a real, repeatable edge of ~+5–7%/r currently (historically +9–22%/r), but it is declining year-over-year; recommendation was observation only, not capital deployment, with a ≤25% per-protocol cap if scaled.

- journal/RESEARCH-QUEUE.md:324 "E8.2 „DOM KASYNA" — ZAMKNIĘTE 09.09 (wieczór)"
- journal/RESEARCH-QUEUE.md:325-326 "LP = kontrpartner traderów z dźwignią; wycena po oraklach → brak LVR"
- journal/CONTEXT.md:454 "E8.2 ZAMKNIĘTE — werdykt klasy „dom kasyna""
- journal/CONTEXT.md:485-486 "Bieżące tempo **≈ +5–7%/r**"
- journal/CONTEXT.md:491-492 "do obserwacji TAK, do kapitału transzy 1 NIE"

### id-07 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** In which database were the backtest results stored?

The backtest results were stored in a SQLite database. The schema defines a `backtest_run` table that acts as an index of the results, while the raw numerical data remained in JSON files. The infrastructure tasks explicitly mention backing up a "future SQLite file" alongside the bot state.

- docs/DB-SCHEMA.md:141 "CREATE TABLE backtest_run ("
- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."
- journal/TASKS-INFRA.md:37 "przyszły plik SQLite do `%USERPROFILE%\HomosBackup\<data>\`"

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The chunks do not state a specific tax amount you should pay, nor do they indicate that the application calculated any tax. Tax reporting was only partially addressed: the bot ledger supports a "CSV export for the Polish income-tax return (PIT-38)," and the emergency notes confirm that selling crypto for fiat is a taxable event in Poland reported on PIT-38. However, the planned PLN conversion layer for tax reporting was "never built," and the SQLite ledger intended to store PLN rates was listed under "Planned, not built."

- docs/UI-DESIGN.md:101-102 "CSV export for the Polish income-tax return (PIT-38)"
- docs/EMERGENCY.md:104-105 "Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax return, PIT-38)"
- docs/DB-SCHEMA.md:189 "The PLN conversion layer was never built."
- docs/UI-DESIGN.md:32 "The SQLite ledger and the PLN conversion for tax reporting"

### na-02 (answerable partial, evidence no-evidence, coverage partial)

**Q:** What were the backtest results for the Solana network?

The chunks do not report backtest results for a Solana network. The only Solana-related backtest is for the JLP (Jupiter Lending Pool) protocol on Solana, which is part of the "casino house" class analysis, not a network-level backtest. The JLP results showed an alpha of approximately +22%/year after 3-factor correction, but with a max drawdown of 46.2% exceeding the basket's 60.9%, and the edge was noted to be decaying from 2024 to 2026. The project's main backtests focused on Ethereum mainnet, Arbitrum, Base, and Optimism networks.

- journal/CONTEXT.md:570-571 "JLP (Jupiter, Solana, 2023-11→2026-09, 1019 dni, bez incydentów)"
- journal/CONTEXT.md:572-573 "α +20.6%/r, 66% po korekcie"
- journal/CONTEXT.md:528 "maxDD 46.2 < koszyk 60.9"
- journal/CONTEXT.md:500 "EDGE GAŚNIE"

### na-03 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The chunks do not state the earnings of the GMX positions at the moment of switching from crypto pairs to shorts. They describe GMX test shorts (e.g., a $15 E2E test with PnL -0.39 and a $149.91 notional test with PnL -0.31) and hedge proposals, but no figure is given for 'the moment of switching' or the earnings of GMX positions at that specific transition.


### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The chunks do not state the monthly electricity cost of the Windows server. They only mention that a small VPS (~$5/month) was considered but a home Windows machine running 24/7 was used instead, and that sleep/hibernate were disabled on AC power.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."

### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks do not contain results for October 2026. The latest data available is from 19 September 2026, showing a total paper trading equity of $66,728 and a PnL of +$6,728 since the start on 18 August 2026. The project documentation notes that approximately 500 commits occurred in August–September 2026, but no October figures are present.

- journal/reports/morning-2026-09-19.md:280 "**RAZEM** | | **$66728** | +$6728"
- docs/CASE-STUDY.md:153 "~500 of them in Aug–Sep 2026"

### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided chunks do not state how many tokens were consumed building the project. They discuss token balances, token addresses, and token access tokens for the bot API, but none report an aggregate count of tokens used or consumed during development.


### na-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** What was the structure of the SQL database holding the backtest data?

The backtest data itself was not stored in the SQL database; raw tick-level swaps stayed in NDJSON files. The database held only a `backtest_run` table serving as a results index. This table contained: `id` (INTEGER PRIMARY KEY), `ts` (INTEGER NOT NULL), `kind` (TEXT NOT NULL, values: walkforward|sweep|run|pegged), `pool_id` (TEXT), `params` (TEXT, JSON with window/step/WF_SET), `file` (TEXT NOT NULL, JSON path in backtest/results/), and `git_commit` (TEXT, engine version for audit).

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)"
- docs/DB-SCHEMA.md:141 "CREATE TABLE backtest_run ("
- docs/DB-SCHEMA.md:143 "kind TEXT NOT NULL,                     -- walkforward|sweep|run|pegged"
- docs/DB-SCHEMA.md:145 "file TEXT NOT NULL,                     -- JSON path in backtest/results/"
- docs/DB-SCHEMA.md:146 "git_commit TEXT                         -- engine version (audit: what was computed with what)"

