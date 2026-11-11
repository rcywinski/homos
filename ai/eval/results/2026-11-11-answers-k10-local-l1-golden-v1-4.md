# Answers with citations: k = 10

Date 2026-11-11. Golden set v1.4. Generator `answer:ollama:qwen3.8:27b(think=false,num_ctx=18432,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_REF_SYSTEM (ai/answer/prompt-local.ts),cite=ref)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "The next review is planned for 24.09 (September 24)."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 76 | 76 | 0 | 0 | 28 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 69% (18/26) | 90% (18/20) | 0% (0/6) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 1 | 3 | 1 | 0 |
| yes / evidence given | 19 | 1 | 0 | 0 |
| yes / evidence not given | 4 | 2 | 0 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 373229, output 7602 tokens; $0; generation median 13348 ms, p95 17865 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

The project did not actively re-center to follow price because backtests showed the costs of frequent re-centering (realized IL and swap costs) exceeded the additional fees earned. Narrow ranges acted as a "short gamma" position, where every re-centering realized divergence. Data from 720-day windows and walkforward tests revealed that passive wide ranges outperformed narrowing strategies, even in flat regimes where narrowing theoretically had an advantage. The extra fees earned by narrow ranges (4x more) were wiped out by IL and rebalancing costs, making the wide passive approach superior.

- journal/CONTEXT.md:1702-1706  [TOO LONG (52 words)] "MECHANIZM (liczby mówią wprost): zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło NIŻEJ. Czyli IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030) ponad to, co dołożyły fee, przy 65 i 88 rebalansach. Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję."
- journal/CONTEXT.md:1695-1701  [TOO LONG (70 words)] "FULLPERIOD 720d ($2500): cbBTC — Pasywny ±50% $3280 vs FlatOnly ±5% $2983 (−$297); base-030 — Pasywny ±40% $3881 vs FlatOnly ±5%→±50% $2759 (−$1122). WALKFORWARD: cbBTC Pasywny 63% wygr. vs ±5% 43%; base-030 Pasywny 60% vs ±5% 45–47%. **I NAJWAŻNIEJSZE: w SAMYM REŻIMIE FLAT**, gdzie zwężanie ma teoretyczną przewagę — cbBTC Pasywny 86% wygr. vs ±5% 59%; base-030 Pasywny **19/19 okien** vs ±5% 12/19. Zwężanie przegrywa nawet tam, gdzie miało wygrywać."
- journal/RESEARCH-QUEUE.md:1002-1004 "MECHANIZM: zwężanie zarobiło 4× więcej fee ($2169 vs $541; $3147 vs $1354) i mimo to skończyło niżej — IL z re-centeringu (65 i 88 rebalansów) zjadł ~$1.9k i ~$2.9k ponad przyrost fee."

### why-02 (answerable yes, evidence no, coverage full)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The project kept capital small because the strategy had no alpha and underperformed HODL during rallies. Analysis showed that in a rising market, the LP pool sells the rising asset, capping gains at ~70% exposure with a range ceiling, meaning they earned less than simply holding ETH/BTC. The core value was measurement and research, not profit maximization, so the decision on scale was deferred to a review with a benchmark against deposits or ETFs.

- journal/CONTEXT.md:997-1002  [TOO LONG (53 words)] "Werdykt dnia (rozmowa z Rafałem, spisany wprost): alfy nie ma — produkt to HODL+yield−drag; przy płaskim rynku realistycznie 8–12%/r z prowizji; przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma); wartość trwała = pomiar + maszyna badawcza + wiedza. Decyzja o skali/sensie na przeglądzie 24.09 z benchmarkiem lokata/ETF."

### why-03 (answerable yes, evidence no, coverage partial)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The 720-day backtests covered only a few pools because the project’s validation gate (720-day window plus a recent ~90-day condition) was applied to a small set of candidate pools already in the pipeline, not to a broad scan. The particular pools chosen were those for which the team already had cached 720-day swap data from HyperSync and that represented the main asset classes they were testing: ETH/stable (e.g., base-030), BTC-pegged (cbBTC), and a few others (arb, mainnet). These pools were the ones used to recalibrate the volatility estimator and to check whether any configuration passed the gate; on 720 days, 0 of 21 configurations passed, so the strategy was rejected. The small number reflects the cost of fetching and processing 720 days of tick-level data (roughly 0.5 GB per pool) and the fact that the project’s early focus was on a handful of high-liquidity pools rather than a wide scan.

- docs/DECISION-LOG.md:22  [TOO LONG (47 words)] "Decision of 2026-08-26: **Validation gate = 720-day window + a recent ~90-day condition** (instead of 365 d). Evidence / rationale: The 365-day year (sideways-to-down) flattered the strategy; on 720 d **0 of 21 configurations** passed. The recent condition prevents old turbulence from disqualifying a pool for years."
- docs/CASE-STUDY.md:56-58  [TOO LONG (41 words)] "2. **Extending the window to 720 days killed the strategy.** On the longer history, which included a strong uptrend, **0 of 21 configurations passed the gate**. The 365-day year had flattered range-bound strategies. Five independent ways of measuring it (13-pool scan,"
- journal/TASKS-FUNNEL.md:183-184 "(nie pipeline). Dysk: 720d Base ≈ 0.5 GB/pula — ~40 pul ≈ 20 GB, sprawdzić wolne miejsce przed startem. Screen (kryterium pilota) — czyta Fable"
- journal/CONTEXT.md:2236-2237 "flat ≥65%; werdykty upX zgodne co do setnych: base-030-720d 32%/−2.07, mainnet-720d 11%/−2.99, arb 30%/−2.29, cbBTC 39%/−2.06). Modyfikacja"

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The sessions could not see or message each other directly because they ran in separate applications (Sonnet, Claude Code on Mac, Claude Code on Windows, and a Cowork cloud session), so direct messaging was not available. The team empirically verified this (via ListAgents) and decided to keep repository files as the communication bus, adding HANDOFF.md as a lightweight per-agent inbox to reduce the owner's role as a router. Later, when Remote Control connected both Claude Code sessions, they could ping each other directly via SendMessage after a push or deployment, falling back to the inbox and asking the owner to relay when that channel was down.

- journal/CONTEXT.md:3277-3280 "Pytanie użytkownika o "rozmawiające agenty": sprawdzono empirycznie (ListAgents) — sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej sesji (osobne aplikacje). Decyzja: zostajemy przy plikach repo jako szynie komunikacji (dziś: 4 sesje równolegle, zero kolizji), dodając HANDOFF.md jako"
- docs/AI-WORKFLOW.md:53-55  [TOO LONG (42 words)] "6. **Direct pings when possible.** Later in the project the two Claude Code sessions could message each other directly after a push or a deployment; when that channel was down they fell back to the inbox plus asking the owner to relay."
- journal/HANDOFF.md:19-24  [TOO LONG (58 words)] "(5) PING CC-Mac↔CC-Win (od 01.09): gdy obie sesje mają Remote Control połączony (`ListAgents` widzi drugą stronę jako peera), "ping" po pushu/wdrożeniu idzie przez `SendMessage` bezpośrednio do tamtej sesji — NIE proś Rafała o ręczne przekazanie. Jeśli `ListAgents` nie widzi drugiej strony (Remote Control akurat rozłączony), wróć do starego trybu: napisz w HANDOFF + poproś Rafała o przekazanie. Po"

### why-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The bot and API server ran on the Windows machine because it was available 24/7, whereas the Mac was a laptop that would sleep or be closed, which would stop the automation. The documentation explicitly notes that a browser or laptop cannot serve as the automation engine because a closed laptop means a dead autopilot. The home Windows machine effectively took the role of a small VPS to ensure continuous operation.

- docs/UI-DESIGN.md:45-48  [TOO LONG (47 words)] "**Key point (missing from the original requirements):** the browser cannot be the automation engine — a closed laptop means a dead autopilot. The bot is a separate process. The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."
- docs/CASE-STUDY.md:36 "- **An observer bot** running 24/7 on a Windows machine: prices, position tracking, a"

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot was designed as an observer that only proposed actions; it never executed trades autonomously because full automatic execution (Phase 4) was never built. The system operated in a "PROPOSE" mode where signals generated ready transactions, but these required manual signature in a browser wallet (Rabby) or approval via the UI. Automatic execution within limits ("AUTO" mode) was explicitly listed as "not built" and never enabled. Consequently, the bot never opened, closed, or re-ranged positions on its own; all actions were semi-automatic, relying on human intervention for final signing.

- docs/PLAN.md:167-168  [TOO LONG (73 words)] "| 3 — semi-automatic execution (signal → ready transaction → signature in Rabby) | Done: rebalance, rotation and hedge sequences signed in the browser wallet. The ledger shipped as ndjson + CSV export rather than SQLite ([`DB-SCHEMA.md`](DB-SCHEMA.md)). | | 4 — full-auto + delta-neutral hedge | Not built as planned. AUTO mode was never enabled; the hedge exists only as a propose-only short on GMX v2, signed in the cockpit (ETH/USD only). |"
- docs/UI-DESIGN.md:58 "| on signal | open/rebalance/close a position | PROPOSE: a proposal for approval; AUTO (not built): execution within limits |"
- journal/TASKS-UI.md:114 "Stopka: "OBSERWUJ — bot niczego nie wykonuje" + przycisk JSON (patrz wyżej)."

### why-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The bot ran on a home Windows machine because the project's vision suggested a small VPS (~$5/month) but the home machine ultimately took that role, likely due to cost or convenience, as the owner already had the hardware and setup. The documentation notes that a VPS was the initial suggestion but the home Windows machine was chosen instead, with no explicit reason given beyond the practicality of using existing infrastructure.

- docs/UI-DESIGN.md:46-47 "engine — a closed laptop means a dead autopilot. The bot is a separate process. The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that"

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

A crypto/crypto pair like cbBTC/WETH carries 100% crypto beta because both legs are volatile assets, offering no stable-asset cushion during market downturns. In contrast, a crypto/stable pair includes a stable leg that acts as a buffer, reducing overall portfolio volatility and downside risk. While the cbBTC/WETH pair may generate higher fees due to lower relative volatility between the two cryptos, its absolute risk is significantly higher as both assets can decline simultaneously, resulting in substantial drawdowns (e.g., -51.5% HODL APR vs. -61.5% max drawdown). The stable leg in a crypto/stable pair provides diversification benefits and a safety net, whereas the crypto/crypto pair exposes the investor to full market beta without any stabilizing component.

- journal/CONTEXT.md:3818 "−51.5% APR (maxDD 61.5%!) — para spadła z całym kryptem (obie nogi crypto ="
- journal/RESEARCH-QUEUE.md:47-48 "(b) ABSOLUTNIE rok fatalny (−46…−51%, maxDD ~60%) — obie nogi crypto = pełna beta, zero poduszki stable. Sleeve cbBTC 25% z PAIRS.md NIE jest"
- journal/KAPITAL-REKOMENDACJA.md:38 "| **base-cbbtc-weth-005** | **$1 500** | Sleeve "correlated": najlepsza alfa LP w całym zestawie (+11.4 vsHODL/365d), ale ŚWIADOMIE mniejsza waga — w spadkowym reżimie to pełna beta krypto (żadna noga nie jest stable) |"
- docs/ALGORITHM.md:87-88 "- cbBTC/WETH 0.05% Base — active k=2. Note: the pair is 100% crypto beta (HODL −51%/yr in 2025/26), so the sleeve size is a decision about exposure, not"

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day window covered a mostly sideways-to-down year, which flattered range-bound liquidity strategies by hiding losses in uptrends. When the window was extended to 720 days, it included a strong uptrend (bull market). In this regime, narrow-range strategies performed worst, suffering significant losses due to impermanent loss and missed upside. Consequently, 0 of 21 configurations passed the validation gate on the 720-day data, whereas the shorter window had produced false positives by excluding the adverse trend conditions.

- docs/CASE-STUDY.md:56-58  [TOO LONG (41 words)] "2. **Extending the window to 720 days killed the strategy.** On the longer history, which included a strong uptrend, **0 of 21 configurations passed the gate**. The 365-day year had flattered range-bound strategies. Five independent ways of measuring it (13-pool scan,"
- journal/DECYZJE-2026-08-26.md:558 "σ zaniżona). Interpretacja: 365d schlebiało strategii (rok bez bulla);"

### why-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

During an uptrend, a concentrated LP effectively sells the rising asset (ETH) into the rally to maintain the target ratio. This action realizes an opportunity cost (or implicit impermanent loss) equal to the price gain missed. While the LP earns trading fees, these fees are typically lower than the price appreciation of the underlying asset. In a flat market, there is no significant price appreciation to miss, so the fees earned represent a net positive gain relative to holding. The project's data confirms this: in 'up' regimes, LP strategies often lose to HODL (e.g., 0% win rate in one 720d test), whereas in 'flat' regimes, they can outperform or match HODL by capturing fees without the drag of trend-following losses.

- docs/CASE-STUDY.md:108-109 "HODL 50/50 out of sample. The fee income is real but it is paid for with convexity: you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn."
- journal/CONTEXT.md:1824-1829  [TOO LONG (60 words)] "trend-following, nie ulepszenie mechaniki.** Rozbicie reżimowe (cbBTC-720d, 46 okien) mówi wprost: **up 0% wygranych, śr. −13.91, najgorsze −17.86** · down 83%, śr. +4.54 · flat 72%, +0.53. Globalne 67% wygranych wygląda dobrze WYŁĄCZNIE dlatego, że próbka ma 12 okien down i tylko 5 up. Dla porównania wariant ZE swapem w up: −3.14 — też słabo, ale prawie 3× mniej boleśnie."

### dated-01 (answerable yes, evidence no, coverage partial)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

The chunks do not state the exact date the first real LP capital entered the application. They record a recommendation on 19.08 for a $6k tranche 1 (Base) and a decision meeting on 26.08 to evaluate entry, plus a $15 live hedge test on 20.08, but no entry date is given.

- journal/DECYZJE-2026-08-26.md:153-157  [TOO LONG (43 words)] "## 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja) Rekomendacja Fable z 19.08 w **KAPITAL-REKOMENDACJA.md**: transza 1 $6k Base (005 $2.5k + cbBTC $1.5k + $2k rezerwa), transza 2 do $12–15k po OBSERWUJ ~31.08. Do zestawienia 26.08: wyniki paper tradingu (8 dni),"
- journal/DECYZJE-2026-08-26.md:160-162 "AKTUALIZACJA 20.08 wieczór: hedge GMX przetestowany E2E na żywo ($15, open+close przez apkę) — jeśli transza miałaby objąć base-030, warunek wykonawczy hedge-excess jest już spełniony (nie tylko fallback exit)."

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance executed on real capital occurred on **31 August 2026**. This happened during the narrowing experiment (flat detector firing on the cbBTC leg), where the operator signed a narrowing to ±5% as an explicit operational experiment. The journal notes this was the "first combat transaction" ("pierwsza bojowa transakcja") executed on live funds, specifically a two-transaction rebalance sequence (decrease/collect, swap, mint) that completed successfully after a hotfix for a receipt-reading bug. This is described in the case study as the "narrowing experiment (31 Aug → 11 Sep)" and in the journal as the start of the "experimental episode" on 2026-08-31.

- docs/CASE-STUDY.md:81-86  [TOO LONG (102 words)] "- **The narrowing experiment (31 Aug → 11 Sep).** The flat detector fired on the cbBTC leg. I signed the narrowing as an explicit n = 1 operational experiment (the backtests said it should not pay). It sat in range for 11 days and earned ≈ $8.6 in fees, then the trend breaker closed it at −$32 versus HODL. The backtests were right; the live system worked exactly as designed, including a two-transaction rebalance whose first attempt reverted on a slippage check because the UI had priced the mint from a stale pool state — found, fixed, and documented the same day."
- journal/CONTEXT.md:1186-1191  [TOO LONG (50 words)] "~12:2x — **EPIZOD EKSPERYMENTALNY WYSTARTOWAŁ.** Flat cbBTC POTWIERDZONY 10:22Z (pierwszy w historii — po trzech nocnych resetach zegara). Telegram doszedł (treść alertu wciąż mówi „k×σ" — stale string z 28.08 w observer.ts:631, sama propozycja liczy nową ścieżką; kosmetyka, zniknie z paczką detektor→pomiar). PIERWSZA PROPOZYCJA FLAT_NARROW, liczby spisane PRZED podpisem (protokół):"
- journal/CONTEXT.md:1228-1235  [TOO LONG (65 words)] "~13:0x — **EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA.** Po wdrożeniu hotfixu (CC-Win: build+restart) sekwencja przeszła na czysto za jednym [Zatwierdź]: approve 0.0119 cbBTC → multicall decrease+collect (+0.4696 WETH +0.0144 cbBTC do portfela) → exactInputSingle 0.0026 cbBTC→0.0825 WETH → approve 0.5522 WETH + approve 0.0119 cbBTC (dociągnięcie) → **mint #5908083** (cbBTC/WETH 0.05%, zakres 0.029992–0.033080 = ±4.9%, cena ~1% pod środkiem, in-range). Stara pozycja #5887690 zamknięta."

### dated-03 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September 2026, two real FlatWide positions were open: #5886957 (base-weth-usdc-030) with equity $3,468 and PnL from anchor -$39.98, and #5978579 (base-cbbtc-weth-005) with equity $2,266 and PnL from anchor -$92.39. Combined equity was $5,733.13. In paper trading, six pools were open with a total equity of $64,931 and cumulative PnL of +$4,931.

- journal/reports/morning-2026-09-15.md:221-223  [TOO LONG (79 words)] "| #5886957 | base-weth-usdc-030 | SZEROKI | $3468 | $-1.28 | $-39.98 (od 2026-08-27) | $20.31 | $1.08 | w zakresie | 2.1% | — poza progiem (potrzeba < 2.0%) | | #5978579 | base-cbbtc-weth-005 | SZEROKI | $2266 | $-1.91 | $-92.39 (od 2026-09-11) | $0.89 | $0.24 | w zakresie | -1.7% | ⏳ zegar od 09-15T03:03Z — potwierdzenie za 9.5h | | **RAZEM** | | | **$5733.13** | $-3.19 | | | | | | |"
- journal/reports/morning-2026-09-15.md:232-238  [TOO LONG (102 words)] "| mainnet-usdc-weth-030 | open | $10680 | +$680 | $-868 | $108.14 | 1 | | mainnet-usdc-weth-005 | open | $10659 | +$659 | $-896 | $64.93 | 1 | | base-weth-usdc-030 | open | $10623 | +$623 | $-925 | $120.08 | 1 | | base-cbbtc-weth-005 | open | $11936 | +$1936 | $-646 | $9.40 | 0 | | arbitrum-weth-usdc-005 | open | $10707 | +$707 | $-839 | $48.81 | 1 | | base-weth-cbbtc-030 | open | $10325 | +$325 | +$379 | $5.57 | 0 | | **RAZEM** | | **$64931** | +$4931 | $-3795 | | |"

### dated-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the last backtest finish?

The last backtest finished on 2026-09-23 at 05:03:07.956Z. This is the most recent timestamp among all provided logs where the `backtest-run` step completed with `exit 0`.

- journal/reports/morning-2026-09-23.md:43 "2026-09-23T05:03:07.956Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1790135075646.log)"

### dated-05 (answerable yes, evidence no, coverage full)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

On 2026-09-11, the project executed a FLAT_WIDEN rebalance to protect a flat cbBTC position. It converted the narrow position #5908083 (±5% range) into a wider position #5978579 (±11% range). The result was a net loss of $32.08 versus holding the initial deposit, as impermanent loss (~$45) outweighed the fees earned (~$12.6).

- journal/CONTEXT.md:412-452 "2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu"
- journal/CONTEXT.md:443-450  [TOO LONG (87 words)] "WYNIK EKSPERYMENTU ZWĘŻENIA (31.08→11.09, n=1) z księgi ZAMKNIĘTE POZYCJE (#5908083 pojawiła się po jednym cyklu ledgera): wpłacone 0.552189 WETH + 0.011872 cbBTC, wypłacone 0.002356 WETH + 0.029696 cbBTC (100% w cbBTC — wyjście przez krawędź), fee 0.002356 WETH + 0.000081 cbBTC ≈ $12.6; **netto vs HODL wkładu po kursie dziś: −$32.08** (fee +$12.6 < IL ≈ −$45 przy ruchu 5% do krawędzi ±5%). PnL w USD +$40 (beta BTC), nie zasługa strategii. Zgodne z falsyfikacją 720d („flat kończy się przez krawędź"); jeden epizod = ilustracja, nie test."

### dated-06 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The first nightly run to complete without errors occurred on 2026-08-22, described as the "first nightly run after fixes" where everything was green and the swap cache had no missing pools [1][2]. Errors did happen afterwards: on 2026-08-26, the backtest-run failed twice (exit 1) at 04:23 and 05:00Z [3]. The cause was a crash diagnosed by CC-Win, specifically a spread calculation using Math.min/max on millions of points in svgChart, which was a performance issue rather than an OOM error [3]. The fix involved using a loop/reduce for series data, and the run was re-executed successfully [3].

- journal/CONTEXT.md:4411-4412 "2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE **Test raportu porannego ZDANY.** `67ee89f report: poranny snapshot"
- journal/CONTEXT.md:2331-2333 "backtest-run zdiagnozowany przez CC-Win samodzielnie (0257a7a: spread Math.min/max na milionach punktów w svgChart — LEKCJA: na seriach zawsze pętla/reduce); ponowienie przebiegu zlecone."
- journal/CONTEXT.md:2337-2339 "wcześniej przez Fable, zweryfikowany). JEDYNA USTERKA: **backtest-run 2× exit 1** (04:23 i 05:00Z, po ~35 min) — pierwsza porażka PO podniesieniu heapu do 12288, więc raczej nie OOM z 20.08; diagnoza zlecona CC-Win"

### dated-07 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

Yes, a production change was made after capital was invested. On 29 Aug 2026, the `SIGMA_MODE` environment variable for the `homos-bot` NSSM service was switched from the default 'swap' to 'grid15' to align live volatility calculations with backtest calibration, then the service was restarted. This occurred after the 6,092 USDC deposit on 27 Aug. No other infrastructure changes were made to the production machine during the live capital period; the 21 Sep entry notes the bot and infrastructure were unchanged that day.

- journal/CONTEXT.md:1533-1539  [TOO LONG (67 words)] "~wieczór #3 — DECYZJA: **σ produkcyjna przechodzi na grid15** (przed pierwszym zwężeniem, nie na przeglądzie). CC-Win potwierdził trzema niezależnymi sprawdzeniami (NSSM dump, `.env`, env systemowy), że `SIGMA_MODE` nie był ustawiony NIGDZIE — żywy bot liczył σ estymatorem `swap`, mimo że kalibracja k, progi flatu i EV zwężania z E1/E4 pochodzą z `grid15`. Decyzja Rafała: ustawiamy grid15 teraz, żeby pierwsze FLAT_NARROW poszło tą samą σ, która to zwężanie"
- journal/CONTEXT.md:1558-1561 "~wieczór #4 — σ grid15 WDROŻONA (CC-Win: NSSM tylko dla homos-bot, restart 10:15:53Z, `volDaily` base-030 2.667→2.450%/d, cbBTC ~2.84→2.978%/d, zegar flatu cbBTC NIENARUSZONY [flatSince 07:41:40Z] — mechanizm przeżycia restartu potwierdzony po raz drugi)."
- docs/CASE-STUDY.md:67-69 "## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the"
- journal/CONTEXT.md:175-179  [TOO LONG (45 words)] "BOT / INFRA: bez zmian dziś; od jutra zlecenie CC-Win (HANDOFF): (1) tylko odczyt: tx-ledger 18.09 dla #5886957/#5978579 + ostatnie próbki positions-history; (2) PAUZA schtask nocnego pipeline'u (backtest-run/sweep/wide-daily) — research bez odbiorcy; bot + serwer + raport 07:30 zostają do 24.09. Karty OPEN selektora —"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The capital was fully withdrawn on 21 September 2026. The tranche was closed to EUR on Kraken, with the sale executed around 19:00 PL time that day. This followed an earlier partial withdrawal of USDC to Kraken on 18 September 2026, but the final exit of all assets (ETH and cbBTC) to fiat occurred on the 21st.

- journal/CONTEXT.md:9-16  [TOO LONG (101 words)] "- **⚡ STAN NA 21.09 ~19:30 PL — TRANSZA 1 ZAMKNIĘTA W CAŁOŚCI DO EUR NA KRAKENIE. Wynik: ≈ +$336 (+5,5%) w 25 dni (27.08→21.09), z tego LP FlatWide +$38 (22 dni), zakład spot 18–21.09 ≈ +$300.** Sprzedane 21.09 ~19:00 PL: 1,22014 ETH @ 2 403,39 EUR (≈ $2 756) i 1 213,40 USDC (z cbBTC) @ 0,8719 — razem z piątkowymi 1 871 USDC ≈ 5 605 EUR ≈ $6 428 wobec wpłaty $6 092. Zero pozycji, zero krypto transzy w portfelu (Rabby: tylko pyłki). EUR czeka na zdjęcie blokady depozytowej Krakena (Base → finalność L1), SEPA do banku 22.09."
- journal/CONTEXT.md:101  [TOO LONG (127 words)] "Decyzja z 2026-09-21: **TRANSZA 1 ZAMKNIĘTA — pełne wyjście do EUR (decyzja Rafała ~14:00 PL „dziś z całością", wykonanie ~19:00 PL):** (1) 1,22014 ETH → Kraken (Base) → sprzedaż ETH/EUR @ 2 403,39 (2 932,49 EUR, opłata 11,73 = 0,40% taker); (2) 0,0141 cbBTC → USDC w Uniswap (1 213,40) → Kraken → USDC/EUR @ 0,8719 (1 057,97 EUR, opłata 2,12); (3) razem z 18.09 (1 870,95 USDC → ≈ 1 628 EUR netto) **transza ≈ 5 605 EUR ≈ $6 428 vs $6 092 → +$336 (+5,5%), 25 dni**; (4) zakład spot z 18.09 (dół −5% / 24.10) ZAMKNIĘTY przed czasem, na plusie ≈ +$300 w 3 dni; (5) reguła „5k w Rabby" rozważana rano — NIE weszła w życie (sprzedaż przy Rabby ≈ $4 660)"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat starting 30 Aug 2026 at 22:22Z, when the cbBTC flat clock began ticking without a reset. The only live narrowing episode (position #5908083) lasted 11 days, running from 31 Aug to 11 Sep 2026.

- journal/CONTEXT.md:1135-1137 "nieopłacalna (edge −32.7 p.p.), down:false 6/6. Zegar flatu cbBTC tyka od 30.08 22:22Z (pierwsza noc BEZ resetu po trzech „tańcach na progu") → pierwsza w historii propozycja FLAT_NARROW ~10:22Z. OPEN selektora"
- docs/CASE-STUDY.md:81-84  [TOO LONG (70 words)] "- **The narrowing experiment (31 Aug → 11 Sep).** The flat detector fired on the cbBTC leg. I signed the narrowing as an explicit n = 1 operational experiment (the backtests said it should not pay). It sat in range for 11 days and earned ≈ $8.6 in fees, then the trend breaker closed it at −$32 versus HODL. The backtests were right; the live system worked exactly as designed,"
- journal/CONTEXT.md:294-296 "przeszło. WYNIK: stara #5908083 (wąska ±5%, 31.08→11.09, **11 dni w flacie**, fee ~$8.6 wg 09.09) zamknięta; **nowa #5978579 WETH/cbBTC 0.05% Base, SZEROKA ±40%, $2 341.81, in-range pośrodku**; koszt planowany"

### dated-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

The paper-trading bot rebalanced three times, all on 21 Aug 2026 (reported in the 08:45 morning report of that day), on three ETH/USDC pools: mainnet 0.30, mainnet 0.05, and Base 0.30. These were the first rebalances since the paper-trading module started on 18 Aug 2026. Real capital did not enter until 27 Aug 2026, so all three rebalances occurred before real money went in. Each rebalance produced only +$69/+$93/+$87 net, with costs eating most of the gain.

- journal/CONTEXT.md:4175-4179  [TOO LONG (47 words)] "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30): histereza 24h poza zakresem dobiegła i payback wyszedł ≤7d. Fee-flow wyraźnie przyspieszył po re-centrowaniu (mainnet-030 $5.09→$8.76, base-030 $3.65→$8.57), ale equity per pula urosło tylko +$69/+$93/+$87 — koszt rebalansu zjadł resztę."
- journal/CONTEXT.md:3500-3501 "**URUCHOMIONY NA ŻYWO ~15:xx 18.08** — CC-Win pull+restart, Rafał potwierdza "📊 PAPER: START" na Telegramie. Licznik bije; t0 pomiaru = 18.08 po południu."
- docs/CASE-STUDY.md:67-69 "## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the"
- journal/DECYZJE-2026-08-26.md:396-398 "Materiał wspierający z żywych danych (21.08): trzy rebalanse na k=3/h=24h dały netto +$69/+$93/+$87 (koszt zjadł większość) — kierunek zgodny ze sweepem, który stawia h=48h nad h=24h."

### id-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a type of proposal (kind) generated by the bot's range algorithm, not a specific position. It is triggered when the flat detector confirms the price has been stable (|gap|<2% for ≥12h) and suggests narrowing the liquidity range from a wider band (e.g., ±40% or ±50%) to a fixed narrow band (±5% or ±6%) to increase fee yield. The proposal includes a suggested range, cost, and payback period, and is subject to human approval.

- journal/reports/morning-2026-09-19.md:109-110 ""kind": "FLAT_NARROW", "action": "FLAT_NARROW","
- journal/reports/morning-2026-09-19.md:120 ""note": "Produkt FlatWide: flat POTWIERDZONY (|gap|<2% ≥12h) — zwężenie z ±40% do ±5%: stała szerokość produktu ±5% (1.0× próg wyjścia)."
- journal/CONTEXT.md:1157 "EV z bramki 720d): dzisiejsze FLAT_NARROW na cbBTC PODPISUJEMY.**"

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is classified as a wide position (postura "SZEROKI") in the FlatWide product. This is consistent across all daily reports from 2026-09-09 through 2026-09-23. The position is in the base-cbbtc-weth-005 pool and has a wide range (±40%), with the system proposing a narrowing to ±5% only as an open action, not as the current state.

- journal/reports/morning-2026-09-16.md:242 "| #5978579 | base-cbbtc-weth-005 | SZEROKI | $2202 | $-3.84 | $-156.29 (od 2026-09-11) | $1.15 | $0.25 | w zakresie | -0.2% | ✅ POTWIERDZONY (od 09-15T03:03Z) |"
- journal/reports/morning-2026-09-17.md:139 ""note": "Produkt FlatWide: flat POTWIERDZONY (|gap|<2% ≥12h) — zwężenie z ±40% do ±5%: stała szerokość produktu ±5% (1.0× próg wyjścia)."
- journal/reports/morning-2026-09-18.md:275 "| #5978579 | base-cbbtc-weth-005 | SZEROKI | $2267 | $-2.24 | $-91.29 (od 2026-09-11) | $1.60 | $0.24 | w zakresie | -1.2% | ✅ POTWIERDZONY (od 09-15T03:03Z) |"
- journal/reports/morning-2026-09-17.md:261 "| #5978579 | base-cbbtc-weth-005 | SZEROKI | $2228 | $-2.62 | $-130.39 (od 2026-09-11) | $1.43 | $0.25 | w zakresie | -1.0% | ✅ POTWIERDZONY (od 09-15T03:03Z) |"
- journal/reports/morning-2026-09-13.md:281 "| #5978579 | base-cbbtc-weth-005 | SZEROKI | $2280 | $-0.49 | $-77.92 (od 2026-09-11) | $0.43 | $0.26 | w zakresie | -3.7% | — poza progiem (potrzeba < 2.0%) |"

### id-03 (answerable yes, evidence no, coverage full)

**Q:** Was the range of position #5886957 ever changed, and when?

No, the range of position #5886957 was never changed. Across all available daily reports from August 29 to September 18, 2026, the position consistently displays the posture "SZEROKI" (wide) and the status "w zakresie" (in range). The source chunks do not record any instance of a range adjustment or posture change for this specific position.

- journal/reports/morning-2026-09-18.md:274 "| #5886957 | base-weth-usdc-030 | SZEROKI | $3466 | $-1.38 | $-41.50 (od 2026-08-27) | $26.09 | $1.20 | w zakresie | 2.1% | ✅ POTWIERDZONY (od 09-15T18:53Z) |"
- journal/reports/morning-2026-08-29.md:185 "| #5886957 | base-weth-usdc-030 | $3435 | $-4.09 | $-72.82 (od 2026-08-27) | w zakresie | 9.5% | — |"

### id-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package ("DETEKTOR→POMIAR") contained two tasks: (1) modifying the observer so the flat detector stops emitting FLAT_NARROW/FLAT_WIDEN signals (leaving only episode measurement and logs), and (2) cosmetic fixes to three places using the old "k×σ" formula (observer.ts:631, Telegram proposal format, and cycleLine.tsx label). It was about project functionality, not tests.

- journal/RESEARCH-QUEUE.md:498-500 "## D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epizodu #5908083) - [ ] observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN (zostaje pomiar epizodów + logi) — decyzja przeglądu 31.08."
- journal/RESEARCH-QUEUE.md:501-505 "- [ ] KOSMETYKA „k×σ" (3 kryjówki starej formułki): observer.ts:631 (alert Telegram „pora rozważyć zwężenie do k×σ"), formatka Telegrama propozycji (zakres z „$" zamiast jednostki puli), src/components/cycleLine.tsx (etykieta „WĄSKI k×σ (flat)" → „WĄSKI ±5% (flat)" z productNarrowWidthPct)."

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

The function `fetchFreshPool` retrieves the current state of a Uniswap v3 pool. It calls `factory.getPool` to obtain the pool address, then reads `slot0` and `liquidity` to construct a fresh `Pool` object. It uses a fail-open strategy (returning a fallback if fetching fails) and is invoked in both hooks immediately before `buildMintStep`.

- journal/HANDOFF.md:256-257 "review OK, `fetchFreshPool` poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open], wpięty w oba hooki przed `buildMintStep`;"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2 was the project stage testing the "casino house" ("dom kasyna") class of liquidity provision. This class involved LPs acting as counterparty to leveraged traders on perpetual futures, with pricing based on oracles rather than an AMM, meaning no adverse selection (LVR). It included protocols like GMX v2 (GM pools), Hyperliquid HLP, and Jupiter Lend (JLP). The stage was ultimately closed on 09.09.2026 with a verdict that the class had a real, repeatable edge of roughly +5–7%/r above a HODL basket, but it was recommended for observation only, not for capital deployment in tranche 1.

- journal/RESEARCH-QUEUE.md:324-326  [TOO LONG (144 words)] "- [x] **E8.2 „DOM KASYNA" — ZAMKNIĘTE 09.09 (wieczór). Na czystych danych (kotwica 12:00 UTC, 100% pokrycia): GM v2 ETH α +9.7%/r (79%), BTC +9.4%/r (88%, 4/4 kryteria); JLP mix3 (ETH/BTC/SOL) α +22%/r (75%, 3/4 — pada worst); GLP (v1, pełny cykl 2022–25) brak edge'u ≈ −2.6%/r + hack −93% (dane E8.2e, wyjątek udokumentowany — Llama obcina chunk przy delistingu). **Bieżące tempo klasy ≈ +5–7%/r i MALEJE rok do roku** (2024 zawyża średnie). WERDYKT: klasa realna i powtarzalna (3 protokoły, 2 łańcuchy), do obserwacji TAK, do kapitału transzy 1 NIE (przy $6k ≈ $300–400/r); na skalę tylko z limitem ≤25%/protokół i ≥2 protokoły. Jedyna klasa z dodatnim edge'em w historii projektu → agenda 24.09. Backlog: ostrzeżenie „chunk < span" w paginacji Llamy (niepilne). CONTEXT 07–09.09.** LP = kontrpartner traderów z dźwignią; wycena po oraklach → brak LVR (strukturalnie inna klasa niż AMM). Zarabia fee+borrow+straty"
- journal/CONTEXT.md:482-484 "**WERDYKT E8.2 (ZAMKNIĘTE):** klasa „dom kasyna" (LP kontrpartner perp, wycena po oraklach, brak LVR) ma realny, powtarzalny edge nad HODL koszyka o tej samej becie — 3 protokoły (GM v2 ETH/BTC, JLP), 2"

### id-07 (answerable yes, evidence yes, coverage full)

**Q:** In which database were the backtest results stored?

The backtest results were stored in the `backtest_run` table (described as the results index) in the project's database, while raw tick-level swap data remained in NDJSON files. The database deliberately holds only this `backtest_run` index for backtest results.

- docs/DB-SCHEMA.md:168-169 "nothing here and would bloat by orders of magnitude. The database holds only `backtest_run` (results index)."

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The chunks do not state a specific tax amount to pay after closing the positions, nor that the application calculated it. They only note that selling crypto for fiat is a taxable event in Poland, reported on PIT-38, and recommend exporting the exchange ledger as CSV and keeping it with the on-chain transaction history. The project planned a PLN tax layer (SQLite + CSV, NBP rate D-1) but it was an “OSOBNA iteracja” not blocking the first version; the UI’s net figures are explicitly marked “bez gazu” (without gas) and are approximations, not tax computations.

- docs/EMERGENCY.md:104-106 "- Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax return, PIT-38); export the exchange ledger as CSV and keep it with the on-chain transaction history from the exit day."
- journal/TASKS-LEDGER.md:43-44 "kwoty, USD). Kolumna PLN (kurs NBP D-1) = OSOBNA iteracja — wymaga tabeli kursów; nie blokować nią pierwszej wersji."
- journal/TASKS-LEDGER.md:55-56 "przybliżone (outUsd−inUsd, TYLKO gdy obie strony wyceniane, jawnie oznaczone „bez gazu"), liczba tx, link do NFT pozycji na eksploratorze"

### na-02 (answerable partial, evidence no-evidence, coverage partial)

**Q:** What were the backtest results for the Solana network?

The project's backtests focused on Ethereum mainnet, Base, Arbitrum, and Optimism pools; there were no backtests run on the Solana network. The only Solana reference is a separate Jupiter LP (JLP) benchmark analyzed for the E8 house, not a HOMOS Uniswap v3 backtest. JLP showed a 90/30 mix averaging +6.52% per window over 1019 days, alpha +20.6%/yr, but max drawdown 46.0% exceeded the basket's 42.9%, and its alpha was likely inflated by SOL price movements rather than true edge; it was marked unresolved and probably overestimated, requiring a 3-factor regression with SOL.

- journal/CONTEXT.md:570-579  [TOO LONG (107 words)] "zestaw z tego samego dnia. ZNALEZISKO 2 — **JLP (Jupiter, Solana, 2023-11→2026-09, 1019 dni, bez incydentów):** mix 90/30 śr +6.52%/okno, 72%, worst −10.17 (2025), βETH 0.17, βBTC 0.48, **α +20.6%/r, 66% po korekcie**, dodatni w 3/3 reżimach; 30/15 spójne (+25%/r); cały okres +211% (+50%/r), **maxDD 46.0% > koszyk 42.9%** (jedyne kryterium konsekwentnie niespełnione). ALE suma β = 0.65 przy koszyku, który realnie jest ~44% SOL (wagi Jupitera: SOL 44 / ETH 10 / WBTC 11 / stable 35) — rajd SOL ucieka do α, ten sam artefakt co „+7%/r" GLP, tylko solowy i prawdopodobnie większy. WERDYKT: **JLP = nierozstrzygnięte, prawdopodobnie zawyżone** — wymaga regresji 3-czynnikowej z SOL."
- docs/CASE-STUDY.md:44-48  [TOO LONG (56 words)] "## 3. What the backtests said The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen `ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days, exit on a 5 % break below the 7-day EMA. It passed the gate on one pool."

### na-03 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The chunks do not state a specific earnings figure for the GMX positions at the moment of switching from crypto pairs to shorts. They describe test GMX short positions (e.g., a $15 E2E test and a $150 test) and their costs/PnL, but no record indicates a switch from crypto pairs to shorts or the earnings at that specific moment.


### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The provided chunks do not state the monthly electricity cost for the Windows server. They only mention that a small VPS was initially envisioned at ~$5/month, but a home Windows machine running 24/7 was used instead.

- docs/UI-DESIGN.md:47-48 "suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."

### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks do not contain results for October 2026. The most recent data available is from September 2026 (e.g., the paper trading snapshot from 2026-09-01 and pipeline logs from 2026-09-16).


### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided chunks do not contain any information about how many tokens were consumed in building the project. The documents discuss project tasks, bug fixes, and deployment steps, but they do not mention token usage, costs, or consumption metrics.


### na-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** What was the structure of the SQL database holding the backtest data?

The backtest data itself was not stored in the SQL database. Raw tick-level swaps stayed in NDJSON files because the backtest reads them sequentially and a database would bloat by orders of magnitude. The SQLite database (`data/homos.db`) held only a `backtest_run` table as a results index (metadata, not numbers), plus other tables (pool, venue, paper_sample, paper_event, position, tx, etc.) for logs, paper trading, and real-capital accounting. So the SQL structure relevant to backtest data was just the `backtest_run` index table; the actual backtest data remained in files.

- docs/DB-SCHEMA.md:166-169 "- **Raw tick-level swaps** (`data/cache/*.ndjson`, millions of rows per pool) — stay in files: the backtest reads them sequentially, the database adds nothing here and would bloat by orders of magnitude. The database holds only `backtest_run` (results index)."
- journal/RESEARCH-QUEUE.md:728-731 "- [ ] **SQLITE DLA LOGÓW/PAPER (pomysł Rafała 18.08)** — SCHEMAT ZAPROJEKTOWANY: **DB-SCHEMA.md** (zasady rozszerzalności: migracje numerowane, raw-bigint jako TEXT, JSON1 na płynne ładunki, słowniki jako tabele; DDL v1: pool/venue/pool_snapshot/proposal/selector_ranking/"
- docs/DB-SCHEMA.md:141-147  [TOO LONG (46 words)] "CREATE TABLE backtest_run ( id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, kind TEXT NOT NULL,                     -- walkforward|sweep|run|pegged pool_id TEXT, params TEXT,              -- JSON: window/step/WF_SET file TEXT NOT NULL,                     -- JSON path in backtest/results/ git_commit TEXT                         -- engine version (audit: what was computed with what) );"

