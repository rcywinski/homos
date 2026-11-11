# Pooled miss review for golden v1.3 -> v1.4

Every chunk in the top 5 of at least one of 15 runs (golden v1.3, corpus `8d7f9a3437b43594`) that is not an
evidence hit, grouped by question. Nothing here is marked: the reader decides, per chunk, whether it answers the question.
Rule (golden-meta.json): a chunk is added to evidence only if a human reading it agrees it answers the question.

Runs: `contextual-haiku-hybrid-rerank-golden-v1-3`, `contextual-haiku-query-pl-hybrid-rerank-golden-v1-3`, `contextual-haiku-run2-hybrid-rerank-golden-v1-3`, `contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-3`, `contextual-sonnet-hybrid-rerank-golden-v1-3`, `contextual-sonnet-query-pl-hybrid-rerank-golden-v1-3`, `hybrid-rerank-1024-golden-v1-3`, `hybrid-rerank-golden-v1-3`, `hybrid-rerank-meta-1024-golden-v1-3`, `hybrid-rerank-meta-golden-v1-3`, `hybrid-stem-prefix6-golden-v1-3`, `meta-index-hybrid-golden-v1-3`, `meta-index-hybrid-rerank-golden-v1-3`, `query-pl-hybrid-rerank-golden-v1-3`, `vector-golden-v1-3`.

611 chunk-question pairs in total.

## why-01 (why, answerable: yes)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

**Reference:** On 720 days 0 of 21 narrow configurations passed the gate, and the one live narrowing (31.08 to 11.09) ended -$32 vs HODL, so on 16.09 narrowing was rejected again because the upside (about +$1 per episode) is far smaller than the loss when the price leaves a ±5% range (about -$30).

Evidence now: `journal/CONTEXT.md:96-96`, `journal/CONTEXT.md:103-103`, `journal/CONTEXT.md:255-264`, `journal/CONTEXT.md:442-449`, `docs/DECISION-LOG.md:22-22`, `docs/DECISION-LOG.md:28-28`, `docs/CASE-STUDY.md:81-84`.

### `journal/CONTEXT.md:1362#p7`

journal/CONTEXT.md:1668-1720 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #2

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) WYNIKI (365d, cache 11.08, $2500, SIGMA_MODE=grid15): · cbBTC (cena −16.5%): ±4% $1364 · **±5% $1345** · cash $1322 · ±8% $1302 · pasywny±40 $1297 · k×σ $1275 · HODL $1213 · USDC $2500 · base-030 (cena −54.8%, idle ±50):  ...

### `journal/RESEARCH-QUEUE.md:926#p2`

journal/RESEARCH-QUEUE.md:974-1025 | no date | E4. PRZEGLĄDY (kalendarz)
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #4

> E4. PRZEGLĄDY (kalendarz) Do tego czasu: propozycja FLAT_NARROW niesie własny `paybackDays` liczony z realnego L i fee-yieldu — TO jest liczba do sprawdzenia przed podpisem, nie tabela z E4. **ROZSTRZYGNIĘTE CZĘŚCIOWO 29.08 wieczorem** (uwaga Rafała: „gap 2%, wyjście 5%, a zakre ...

### `journal/CONTEXT.md:1362#p8`

journal/CONTEXT.md:1721-1776 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 10 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #5, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) ~16:xx — ZASTRZEŻENIE RAFAŁA DO WERDYKTU („rebalans tyle nie kosztuje, gaz jest ułamkowy; testy mogą mieć błędne założenia; rynek jest dynamiczny; nie wiem, jak model zakłada IL") — rozbite na trzy części, bo każda ma inny  ...

### `docs/CASE-STUDY.md:44`

docs/CASE-STUDY.md:44-65 | no date | 3. What the backtests said
In top 5 of 7 run(s): hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, hybrid-stem-prefix6 #4, meta-index-hybrid #5, meta-index-hybrid-rerank #4

> ## 3. What the backtests said The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen `ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days, exit on a 5 % break below the 7-day EMA. It passed the gate on one pool. The ...

### `journal/CONTEXT.md:1362#p9`

journal/CONTEXT.md:1777-1829 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, query-pl-hybrid-rerank #1

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) ~17:xx — **POMYSŁ RAFAŁA „a nie można dorzucić ETH?" → WARIANT BEZ SWAPU, PIERWSZE WYNIKI BARDZO DOBRE (ale z zastrzeżeniem).** Zamiast przestawiać posturę przez rynek (swap do 50/50 wokół ceny), przesuwamy ZAKRES tak, żeby ...

### `journal/CONTEXT.md:1362#p10`

journal/CONTEXT.md:1829-1878 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) Fullperiod potwierdza: na cbBTC 720d bez swapu $2869 (vsHODL −$104) vs ze swapem $2983 (+$9) — ODWROTNIE niż na moim 365d; przyczyna widoczna w in-range, które spada do 66% (pozycja jednostronna czeka poza ceną). To dokładn ...

### `docs/PLAN.md:99`

docs/PLAN.md:99-106 | no date | 3.6. The rebalance policy is richer than "went out of range → move it"
In top 5 of 3 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1, vector #1

> ### 3.6. The rebalance policy is richer than "went out of range → move it" Gaps in the proposed profitability condition: - **Hysteresis / buffer zones**: rebalance only when the price exceeds the range by X% or stays outside it for T minutes (protection against whipsaw), - **Market regime filter**: ...

### `docs/CASE-STUDY.md:105`

docs/CASE-STUDY.md:105-130 | no date | 5. Conclusions
In top 5 of 3 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3, vector #3

> ## 5. Conclusions **On the strategy.** For ETH/stable and ETH/BTC pairs, concentrated liquidity did not beat HODL 50/50 out of sample. The fee income is real but it is paid for with convexity: you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn. A wid ...

### `journal/CONTEXT.md:3011`

journal/CONTEXT.md:3011-3031 | 2026-08-10 | 2026-08-10 — Sesja 3d: PIERWSZY BACKTEST (dane częściowe!) — Base WETH/USDC 0.3%, 545,724 swapy, 79.4 dnia
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #4

> ### 2026-08-10 — Sesja 3d: PIERWSZY BACKTEST (dane częściowe!) — Base WETH/USDC 0.3%, 545,724 swapy, 79.4 dnia Okres SPADKOWY (HODL 50/50: −32% APR ann.) — jeden reżim, wyniki wstępne, bez ostatnich ~10 dni. | Strategia | APR% | vs HODL% | maxDD% | fees$ | reb | |---|---|---|---|---|---| | HODL 50/ ...

### `docs/ALGORITHM.md:27`

docs/ALGORITHM.md:27-35 | no date | 2. Position range (advisor — src/utils/advisor.ts)
In top 5 of 1 run(s): meta-index-hybrid #4

> ## 2. Position range (advisor — src/utils/advisor.ts) - Width: **w = k · σ_daily · √7d**, where **k = 3** for ETH/stable pairs (365d walk-forward: k3 h24 the only configuration with positive mean+median in both windows; gate ≥2 regimes passed). Clamp: 1%–60%. - **Correlated-pair exception (cbBT ...

### `journal/RESEARCH-QUEUE.md:1073#p2`

journal/RESEARCH-QUEUE.md:1113-1153 | no date | nie kosztują, róbmy ich więcej") — uporządkowana wg DECYZJI, nie ciekawości
In top 5 of 1 run(s): vector #4

> nie kosztują, róbmy ich więcej") — uporządkowana wg DECYZJI, nie ciekawości ZOSTAJE: przebieg na 720d + porównanie tierów (niżej). Wcześniejsza wersja pytania: ±40/±50 vs ±80 vs full-range. Powód: base-030 w oknie −55% miał in-range tylko 32% przy ±50% — pasmo przestało pracować dokładnie  ...

### `docs/ALGORITHM.md:1`

docs/ALGORITHM.md:1-14 | no date | ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1.2 17 Aug)
In top 5 of 1 run(s): hybrid-rerank #5

> # ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1.2 17 Aug) > The single source of truth for strategy parameters. Changes only via an entry > in the project decision log (see [`DECISION-LOG.md`](DECISION-LOG.md)) with a data-backed > justification. Empirical sources: selectio ...

### `docs/DECISION-LOG.md:26`

docs/DECISION-LOG.md:26-26 | 2026-08-31 | Decision of 2026-08-31
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> Decision of 2026-08-31: **Sign the first narrowing proposal (cbBTC leg) as an operational experiment**, n = 1, explicitly *not* a test of the strategy; the 720-day falsification stands. Evidence / rationale: We wanted real `widthPct` / `costUsd` / `paybackDays` and a full narrow→wide cycle measured  ...

### `journal/CONTEXT.md:1362#p5`

journal/CONTEXT.md:1564-1616 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) Tymczasem CAŁA wycena zwężania z E1/E4 (ΣEV $558, progi „epizod ≥5d/≥2d") liczona jest `flatwindows.ts` ze STAŁĄ szerokością wąskiego pasma: ±8% domyślnie, ±6% dla cbBTC. To 2.3–2.5× różnicy w parametrze, który NAJMOCNIEJ n ...

### `journal/DECYZJE-2026-08-26.md:378`

journal/DECYZJE-2026-08-26.md:378-411 | no date | 10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozstrzygnięcia)
In top 5 of 1 run(s): vector #5

> ## 10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozstrzygnięcia) Wyszło przy pytaniu Rafała, dlaczego arbitrum-weth-usdc-005 nie rebalansował. Reguła w obu miejscach jest ta sama („24h NIEPRZERWANIE poza zakresem"; jedno dotknięcie zakresu zeruje licznik — `paper.ts:261` `if (i ...

## why-02 (why, answerable: yes)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

**Reference:** Tranche 1 ($6 092) was planned as a first stage and run as an operational experiment on a calibration the team itself considered broken (720 d: 0/21), the entry after an ETH +25%/90d pump was recorded with an explicit FOMO note, and on 02.09 the product failed to beat HODL in all five measurements, so the planned scale-up never happened.

Evidence now: `journal/CONTEXT.md:97-97`, `journal/CONTEXT.md:104-104`, `journal/CONTEXT.md:71-73`, `journal/CONTEXT.md:100-100`, `journal/KAPITAL-REKOMENDACJA.md:17-19`, `journal/DECYZJE-2026-08-26.md:53-55`.

### `journal/CONTEXT.md:4240#p1`

journal/CONTEXT.md:4240-4268 | 2026-08-21 | 2026-08-21 11:xx — Trzy pytania Rafała o paper trading: odpowiedzi + dwie usterki estymatora zmienności
In top 5 of 9 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5

> 2026-08-21 11:xx — Trzy pytania Rafała o paper trading: odpowiedzi + dwie usterki estymatora zmienności 1. **cbBTC-WETH nie wraca z cash, bo sygnał trendu wciąż aktywny.** Trend liczony jest na cenie WZGLĘDNEJ (`quote:'WETH'`), czyli cbBTC wyrażonym w WETH (~33.3 z `trend-state.ema`), NIE w U ...

### `journal/CONTEXT.md:969`

journal/CONTEXT.md:969-1002 | 2026-09-01 | 2026-09-01 ~popołudnie — ANALIZA PRAWDOPODOBIEŃSTW + MONTE CARLO STRATEGII (Fable + Rafał) — materiał na przegląd 24.09
In top 5 of 8 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> ### 2026-09-01 ~popołudnie — ANALIZA PRAWDOPODOBIEŃSTW + MONTE CARLO STRATEGII (Fable + Rafał) — materiał na przegląd 24.09 Na prośbę Rafała („analizy jak profesjonalni maklerzy") — dwie analizy z 500d dziennych cen (coins.llama.fi, ETH i BTC, na żywo). A. TABELA SZANS (okna kroczące, bez prognozy k ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 8 run(s): hybrid-rerank-1024 #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #4, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3, vector #3

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `journal/CONTEXT.md:116#p1`

journal/CONTEXT.md:116-152 | 2026-09-21 | 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%)
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #4, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #3, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2, vector #4

> 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%) RANO: Rabby $4 582 (ETH $2 712 +5%, cbBTC $84,5k), część transzy $4 502 + $1 871 = $6 373 (+4,6%). Rafał: „trzeba opracować moment wyjścia", nie chce sztywnych barier %, chce „wyjść na górce". NEWSY (Fable,  ...

### `journal/CONTEXT.md:190#p2`

journal/CONTEXT.md:217-244 | 2026-09-18 | 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto (zakład spot z re
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1

> 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto (zakład spot z regułą), USDC → Kraken Saldo poza transzą (Arbitrum/mainnet ~$332) nie liczone. Fee zebrane łącznie ~$29 (obie nogi) + ~$8,6 z epizodu wąskiego 31.08→11.09 wg ledgera. **DECYZJA RAF ...

### `journal/CONTEXT.md:454`

journal/CONTEXT.md:454-498 | 2026-09-09 | 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA (100% pokrycia, 0 duplikatów), GM v2 i JLP potwier
In top 5 of 6 run(s): contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #2

> ### 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA (100% pokrycia, 0 duplikatów), GM v2 i JLP potwierdzone na czystych danych; GLP zostaje na danych E8.2e (wyjątek udokumentowany, 3. błąd = obcinanie Llamy przy delistingu); **E8.2 ZAMKNIĘTE — werdykt klasy „dom kasyna"** Odbió ...

### `journal/CONTEXT.md:684`

journal/CONTEXT.md:684-719 | 2026-09-07 | 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia): CARRY NIE, HLP n/a, **GM v2 PRZECHODZI (z zastrz
In top 5 of 6 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4

> ### 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia): CARRY NIE, HLP n/a, **GM v2 PRZECHODZI (z zastrzeżeniem: bez bessy)** E8.0 BENCH: BENCH_APR = 3.8%/r (USDC Aave, Morpho/Pendle puste w filtrze Llamy — nazwy projektów do poprawki, niepilne); Lido 2.2%; Sky USDS 6.1% (najleps ...

### `journal/CONTEXT.md:190#p1`

journal/CONTEXT.md:190-217 | 2026-09-18 | 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto (zakład spot z re
In top 5 of 3 run(s): contextual-haiku-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5

> 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto (zakład spot z regułą), USDC → Kraken BRIEF (raport 07:30): automat czysty, bilans $5 966 (−2,06%; 16.09 −4,29% → 17.09 −3,33%), vs HODL obu nóg −$3,6, flat potwierdzony na obu, FLAT_NARROW ×2 odn ...

### `docs/CASE-STUDY.md:105`

docs/CASE-STUDY.md:105-130 | no date | 5. Conclusions
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2, vector #2

> ## 5. Conclusions **On the strategy.** For ETH/stable and ETH/BTC pairs, concentrated liquidity did not beat HODL 50/50 out of sample. The fee income is real but it is paid for with convexity: you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn. A wid ...

### `journal/CONTEXT.md:101`

journal/CONTEXT.md:101-101 | 2026-09-21 | Decyzja z 2026-09-21
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #5

> Decyzja z 2026-09-21: **TRANSZA 1 ZAMKNIĘTA — pełne wyjście do EUR (decyzja Rafała ~14:00 PL „dziś z całością", wykonanie ~19:00 PL):** (1) 1,22014 ETH → Kraken (Base) → sprzedaż ETH/EUR @ 2 403,39 (2 932,49 EUR, opłata 11,73 = 0,40% taker); (2) 0,0141 cbBTC → USDC w Uniswap (1 213,40) → Kraken → US ...

### `journal/reports/morning-2026-09-09.md:127`

journal/reports/morning-2026-09-09.md:127-145 | 2026-09-09 | RANKING WIDE (pod produkt, top 10)
In top 5 of 2 run(s): hybrid-rerank-1024 #4, hybrid-rerank #3

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-09 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `docs/DECISION-LOG.md:30`

docs/DECISION-LOG.md:30-30 | 2026-09-18 | Decision of 2026-09-18
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #5

> Decision of 2026-09-18: **LP unwound at break-even** (+0.6 %, +$38, 22 days) when the rule triggered. **Tokens kept as a spot bet** (~70 % of the tranche in ETH/cbBTC), floor at −5 %, default sale on 24 Oct; USDC moved to the exchange. Evidence / rationale: Wide LP added nothing to the directional b ...

### `docs/PAIRS.md:64`

docs/PAIRS.md:64-67 | no date | D. Alt/ETH — high APR, high risk (not for now)
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #4

> ### D. Alt/ETH — high APR, high risk (not for now) LINK/ETH 0.3% mainnet (4.49%), ARB/ETH 0.05% Arbitrum (8.47%), VIRTUAL/TIBBIR Base (11.18%). Higher volatility, thinner books, toxic flow, risk of −80% on the token. To be considered only once the bot is mature, and only with a small % of the portfo ...

### `journal/RESEARCH-QUEUE.md:597#p1`

journal/RESEARCH-QUEUE.md:597-639 | 2026-08-10 | F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, hybrid-rerank #5

> F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10) > Kontekst: screen "Earned $6,912 / 5.6d / $281k" = 3.1%/tydz. — realne dla > ultra-wąskiego LP na parach spiętych (LST-ETH, stable-stable): brak IL w > normalnych warunkach, koncentracja ×dziesiątki. Ukryte ryzyko: depeg (wąs ...

### `docs/DECISION-LOG.md:31`

docs/DECISION-LOG.md:31-31 | 2026-09-21 | Decision of 2026-09-21
In top 5 of 1 run(s): vector #1

> Decision of 2026-09-21: **Everything sold to EUR** during a short-squeeze rally (BTC at the $85–86k ETF cost-basis / liquidation cluster, ETH at the $2 750–2 800 resistance analysts had named that morning). Tranche closed at **+5.5 %** (+$336) in 25 days. Evidence / rationale: Discretionary sale "in ...

### `docs/PAIRS.md:15`

docs/PAIRS.md:15-29 | no date | 1. Key finding: the original pool is a weak choice
In top 5 of 1 run(s): meta-index-hybrid #3

> ## 1. Key finding: the original pool is a weak choice Both existing positions sat in **mainnet ETH/USDC v3 0.3%** — a pool that no longer even makes the top 20 by TVL on Ethereum. Liquidity and volume have flowed to the 0.05% tier and to v4. Comparison (same pair, same moment): | Pool | TVL | Pool ...

### `journal/CONTEXT.md:593`

journal/CONTEXT.md:593-637 | 2026-09-08 | 2026-09-08 ~rano — BRIEF (Fable + Rafał): odbiór E8.2c (CC-Mac) + E8.3 (CC-Win); **GLP po regresji 2-czynnikowej = BRAK 
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #4

> ### 2026-09-08 ~rano — BRIEF (Fable + Rafał): odbiór E8.2c (CC-Mac) + E8.3 (CC-Win); **GLP po regresji 2-czynnikowej = BRAK EDGE'U**, E8.3 ZAMKNIĘTE BRIEF (raport 07:30): automat czysty (03:42→04:58, backtest-run 1h09, porażki BRAK), zero propozycji, kolejka pusta, down:false 6/6, selektor edge −20. ...

### `journal/reports/morning-2026-09-14.md:171`

journal/reports/morning-2026-09-14.md:171-189 | 2026-09-14 | RANKING WIDE (pod produkt, top 10)
In top 5 of 1 run(s): hybrid-rerank #4

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-14 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `docs/EMERGENCY.md:11`

docs/EMERGENCY.md:11-19 | no date | 0. First: which signal is firing?
In top 5 of 1 run(s): hybrid-rerank-1024 #5

> ## 0. First: which signal is firing? | Signal | What it measures | What it means | |---|---|---| | DOWN on **WETH/USDC** (base-030) | the ETH price in USD | **A USD crash that affects both legs.** WETH and cbBTC share a common beta to USD; this is the proper crash sensor for the whole tranche | | D ...

### `docs/DECISION-LOG.md:16`

docs/DECISION-LOG.md:16-16 | 2026-08-17 | Decision of 2026-08-17
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> Decision of 2026-08-17: **Revision v1.2**: on base-030 the breaker becomes *hedge-excess* (short the ETH above 50 % on a perp, keep the LP); until a perp venue is integrated, exit remains the fallback. Evidence / rationale: The only configuration that closed the gate on base-030 on both windows (73  ...

### `journal/CONTEXT.md:7#p1`

journal/CONTEXT.md:7-48 | no date | 1. Stan projektu — skrót
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> 1. Stan projektu — skrót - **⚡ STAN NA 21.09 ~19:30 PL — TRANSZA 1 ZAMKNIĘTA W CAŁOŚCI DO EUR NA KRAKENIE. Wynik: ≈ +$336 (+5,5%) w 25 dni (27.08→21.09), z tego LP FlatWide +$38 (22 dni), zakład spot 18–21.09 ≈ +$300.** Sprzedane 21.09 ~19:00 PL: 1,22014 ETH @ 2 403,39 EUR (≈ $2 756) i 1 213, ...

### `journal/DECYZJE-2026-08-26.md:153`

journal/DECYZJE-2026-08-26.md:153-162 | no date | 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
In top 5 of 1 run(s): vector #5

> ## 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja) Rekomendacja Fable z 19.08 w **KAPITAL-REKOMENDACJA.md**: transza 1 $6k Base (005 $2.5k + cbBTC $1.5k + $2k rezerwa), transza 2 do $12–15k po OBSERWUJ ~31.08. Do zestawienia 26.08: wyniki paper tradingu (8 dni), trafność selektora, stan tr ...

## why-03 (why, answerable: yes)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

**Reference:** The first 720-day run (25.08) simply reused the four pools that already had 365-day runs (base-030, mainnet-005, arb-005, cbBTC-005, the younger cbBTC pool from its start), because each walk-forward cost 20-40 minutes per pool; restricting the 720-day gate to 'finalists' of a cheap universe-wide screen appears only later, in the funnel design of 31.08.

Evidence now: `journal/CONTEXT.md:4762-4768`, `journal/CONTEXT.md:1171-1176`, `journal/CONTEXT.md:3850-3851`.

### `docs/CASE-STUDY.md:44`

docs/CASE-STUDY.md:44-65 | no date | 3. What the backtests said
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #1

> ## 3. What the backtests said The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen `ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days, exit on a 5 % break below the 7-day EMA. It passed the gate on one pool. The ...

### `docs/ALGORITHM.md:1`

docs/ALGORITHM.md:1-14 | no date | ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1.2 17 Aug)
In top 5 of 10 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, hybrid-stem-prefix6 #2, meta-index-hybrid #2, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> # ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1.2 17 Aug) > The single source of truth for strategy parameters. Changes only via an entry > in the project decision log (see [`DECISION-LOG.md`](DECISION-LOG.md)) with a data-backed > justification. Empirical sources: selectio ...

### `docs/DECISION-LOG.md:22`

docs/DECISION-LOG.md:22-22 | 2026-08-26 | Decision of 2026-08-26
In top 5 of 7 run(s): contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-stem-prefix6 #3, meta-index-hybrid #3, vector #2

> Decision of 2026-08-26: **Validation gate = 720-day window + a recent ~90-day condition** (instead of 365 d). Evidence / rationale: The 365-day year (sideways-to-down) flattered the strategy; on 720 d **0 of 21 configurations** passed. The recent condition prevents old turbulence from disqualifying  ...

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 6 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `journal/CONTEXT.md:2178#p2`

journal/CONTEXT.md:2216-2259 | 2026-08-26 | 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komplet decyzji z DECYZJE-2026-08-26
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #5, hybrid-rerank #5

> 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komplet decyzji z DECYZJE-2026-08-26 ~16:xx — SILNIK ROTACJI ZBUDOWANY (backtest/rotation.ts, TASKS-ROTATION v1; decyzja Rafała po uczciwym zastrzeżeniu Fable "rotacja to optymalizacja fees, nie ucieczka od bety — realny zysk testują A ...

### `journal/CONTEXT.md:2178#p1`

journal/CONTEXT.md:2178-2215 | 2026-08-26 | 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komplet decyzji z DECYZJE-2026-08-26
In top 5 of 4 run(s): hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4

> 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komplet decyzji z DECYZJE-2026-08-26 Brief poranny + pełny przegląd agendy, punkt po punkcie (AskUserQuestion), w kolejności 11a: σ → k → hUp → kapitał. WSZYSTKIE decyzje podjęte — komplet z uzasadnieniami w sekcji "WYNIK PRZEGLĄDU" na ...

### `journal/TASKS-FUNNEL.md:167`

journal/TASKS-FUNNEL.md:167-193 | no date | Piętro 2 — FETCH + SCREEN dla top ~50 score (nocami, porcjami)
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #4

> ### Piętro 2 — FETCH + SCREEN dla top ~50 score (nocami, porcjami) > **STATUS 02.09 (Fable, decyzja Rafała „niech się już powoli zbiera"): > ZAIMPLEMENTOWANE — `scripts/wide-collect.ts` (`npm run wide:collect`).** > Kolejka z najnowszego wide-score: top `--per-class 8` KAŻDEJ klasy > (pegged/LST/sta ...

### `docs/PAIRS.md:1`

docs/PAIRS.md:1-13 | no date | Pair and pool analysis — LP portfolio diversification
In top 5 of 3 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #4, vector #3

> # Pair and pool analysis — LP portfolio diversification > **Historical snapshot (10 Aug 2026).** This is the pre-backtest candidate list. The > portfolio that was actually adopted, and the evidence behind it, is in > [`ALGORITHM.md`](ALGORITHM.md) §6; the live tranche ran on two Base pools (WETH/US ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 3 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #5

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

### `journal/DECYZJE-2026-08-26.md:656`

journal/DECYZJE-2026-08-26.md:656-684 | no date | 13. Pomysł Rafała (25.08): backtest 730d (2 lata) — dwa duże reżimy
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #2

> ## 13. Pomysł Rafała (25.08): backtest 730d (2 lata) — dwa duże reżimy Obserwacja trafna: ostatnie 365d to głównie trend spadkowy/boczny; 2 lata wstecz łapią też duży bull. Walkforward tnie rok na okna i taguje up/down/flat, ale liczba okien "up" w spadkowym roku jest mała — wnioski o zachowaniu na ...

### `journal/reports/morning-2026-08-27.md:7#p2`

journal/reports/morning-2026-08-27.md:32-49 | 2026-08-27 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #3

> pipeline.log (ostatni przebieg) (log: data\pipeline-logs\hs-base-weth-usdc-030-720d-1787802185776.log) 2026-08-27T03:43:12.007Z ▶ hs-mainnet-usdc-weth-005-720d (podejście 1/2) 2026-08-27T03:43:21.198Z krok hs-mainnet-usdc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-005-720d- ...

### `journal/TASKS-RECAL.md:89`

journal/TASKS-RECAL.md:89-98 | no date | §6 Przebiegi i odbiór
In top 5 of 2 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #5

> ## §6 Przebiegi i odbiór - [ ] Okna: 365d ORAZ 720d (30/15; cross-walidacja 45/20+60/30 dla finalistów), wszystkie pule BOT_POOLS (6, w tym nowa base-weth-cbbtc-030) — CC-Win nocami, jeden naraz. - [ ] Raport zbiorczy tabel (śr./%wygr./worst × up/down/flat × okno) do @Fable → weryfikacja niez ...

### `journal/reports/morning-2026-09-03.md:7#p2`

journal/reports/morning-2026-09-03.md:35-49 | 2026-09-03 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #5

> pipeline.log (ostatni przebieg) (podejście 1/2) 2026-09-03T03:43:18.817Z krok hs-mainnet-usdc-weth-030-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-030-720d-1788406993128.log) 2026-09-03T03:43:18.817Z ▶ hs-arbitrum-weth-usdc-005-720d (podejście 1/2) 2026-09-03T03:43:23.671Z krok hs-ar ...

### `journal/reports/morning-2026-09-02.md:7#p2`

journal/reports/morning-2026-09-02.md:32-49 | 2026-09-02 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-haiku-run2-hybrid-rerank #1

> pipeline.log (ostatni przebieg) data\pipeline-logs\hs-mainnet-usdc-weth-005-720d-1788320544115.log) 2026-09-02T03:42:28.527Z ▶ hs-mainnet-usdc-weth-030-720d (podejście 1/2) 2026-09-02T03:42:30.146Z krok hs-mainnet-usdc-weth-030-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-030-720d-178 ...

### `journal/reports/morning-2026-09-16.md:7#p2`

journal/reports/morning-2026-09-16.md:32-49 | 2026-09-16 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #1

> pipeline.log (ostatni przebieg) 2026-09-16T03:42:43.821Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789530158846.log) 2026-09-16T03:42:43.822Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-16T03:42:46.705Z krok hs-base-cbbtc-weth-005 ...

### `journal/reports/morning-2026-09-21.md:7#p2`

journal/reports/morning-2026-09-21.md:31-49 | 2026-09-21 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #3

> pipeline.log (ostatni przebieg) (podejście 1/2) 2026-09-21T03:44:28.014Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789962261977.log) 2026-09-21T03:44:28.015Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-21T03:44:31.960Z krok hs-bas ...

### `journal/TASKS-ROTATION.md:20`

journal/TASKS-ROTATION.md:20-27 | no date | Uczciwa rama (zapisać w raporcie z wyników)
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #4

> ## Uczciwa rama (zapisać w raporcie z wyników) Rotacja między parami ETH/BTC-owymi NIE ucieka od bety rynku — zmienia tylko silnik fees. Wnioski 720d (UP=klęska bo short gamma, DOWN=strata z betą) dotyczą KAŻDEJ pary w uniwersum. Rotacja adresuje "jałowość" (degradację fee-yield) — kierunek rynku a ...

### `docs/DECISION-LOG.md:23`

docs/DECISION-LOG.md:23-23 | 2026-08-26 | Decision of 2026-08-26
In top 5 of 1 run(s): vector #4

> Decision of 2026-08-26: **Capital waits in USDC** until recalibration results; no Aave parking. Revised the same day to a *conditional entry*: enter if a pool passes the 720 d + recent-90 gate on the recalibrated runs. Evidence / rationale: Entering a narrow LP on a calibration we had just declared  ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `docs/DECISION-LOG.md:26`

docs/DECISION-LOG.md:26-26 | 2026-08-31 | Decision of 2026-08-31
In top 5 of 1 run(s): meta-index-hybrid #5

> Decision of 2026-08-31: **Sign the first narrowing proposal (cbBTC leg) as an operational experiment**, n = 1, explicitly *not* a test of the strategy; the 720-day falsification stands. Evidence / rationale: We wanted real `widthPct` / `costUsd` / `paybackDays` and a full narrow→wide cycle measured  ...

### `docs/DECISION-LOG.md:21`

docs/DECISION-LOG.md:21-21 | 2026-08-26 | Decision of 2026-08-26
In top 5 of 1 run(s): vector #5

> Decision of 2026-08-26: **Weekly review: σ on a 15-minute grid + full recalibration of k** on 365 d and 720 d. Evidence / rationale: The swap-based estimator measured pool microstructure, not the asset (σ spread 4.5× → 1.4× on the same ETH). Every k had been calibrated in broken units; the fix and t ...

## why-04 (why, answerable: yes)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

**Reference:** On 10.08 it was checked that the sessions could not reach each other (separate apps), so the repo files became the communication bus, with HANDOFF.md inboxes and history in git; from 01.09 CC-Mac and CC-Win also sent each other direct messages via Remote Control, while the files stayed the shared memory and task queue and the fallback when that channel was down.

Evidence now: `journal/CONTEXT.md:3277-3282`, `journal/HANDOFF.md:15-16`, `journal/HANDOFF.md:19-22`, `docs/AI-WORKFLOW.md:53-55`.

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 14 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, hybrid-stem-prefix6 #3, meta-index-hybrid #5, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `docs/CASE-STUDY.md:105`

docs/CASE-STUDY.md:105-130 | no date | 5. Conclusions
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> ## 5. Conclusions **On the strategy.** For ETH/stable and ETH/BTC pairs, concentrated liquidity did not beat HODL 50/50 out of sample. The fee income is real but it is paid for with convexity: you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn. A wid ...

### `docs/AI-WORKFLOW.md:8`

docs/AI-WORKFLOW.md:8-23 | no date | The four roles
In top 5 of 5 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-stem-prefix6 #2, meta-index-hybrid #2, vector #4

> ## The four roles | Session | Where it ran | Role | |---|---|---| | **Fable** (analysis) | cloud, always available (also from a phone) | research, strategy design, backtest interpretation, core/bot code, coordination, morning briefs, pushback on trade decisions | | **CC-Mac** (Claude Code) | termin ...

### `docs/AI-WORKFLOW.md:1`

docs/AI-WORKFLOW.md:1-6 | no date | How the project was run with AI sessions
In top 5 of 2 run(s): meta-index-hybrid #3, vector #3

> # How the project was run with AI sessions HOMOS was developed by one engineer between 10 August and 22 September 2026 with four specialised Claude sessions working in parallel. This document describes the protocol, because it is the part of the project most people ask about, and because the commit ...

### `journal/HANDOFF.md:1264#p2`

journal/HANDOFF.md:1320-1377 | no date | @CC-Win (Claude Code od botów windowsowych)
In top 5 of 2 run(s): hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5

> @CC-Win (Claude Code od botów windowsowych) Jedno techniczne odstępstwo od zlecenia: run arbitrum-weth-usdc-005-720d padł na OOM w domyślnym limicie heap Node [cache 3.4 GB ndjson], powtórzony z NODE_OPTIONS=--max-old-space-size=8192 — odnotowane w raporcie do Fable. Wpis skasowany — higiena.) (OD ...

### `journal/HANDOFF.md:641#p2`

journal/HANDOFF.md:699-751 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 2 run(s): meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #5

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) BEZ zmian w kodzie (bot/config, observer, useBotApi mają być identyczne z HEAD — jeśli `git status` pokazuje je jako zmienione, to artefakt mountu; `git diff` ma być pusty). Komunikat: "docs: wide-daily numbers sanity-checked, UI 21+22 de ...

### `docs/AI-WORKFLOW.md:93`

docs/AI-WORKFLOW.md:93-99 | no date | If you want to copy the pattern
In top 5 of 1 run(s): hybrid-stem-prefix6 #4

> ## If you want to copy the pattern Keep one journal and one inbox file in the repo. Make reading them the first instruction of every session and writing to them the last. Give each session a role and a list of paths it may not touch. Route all decisions that spend money or change parameters through ...

### `journal/CONTEXT.md:3074`

journal/CONTEXT.md:3074-3079 | 2026-08-10 | 2026-08-10 — Sesja terminalowa (Claude Code): operator gita + fetch:llama + uszczelnienie .gitignore
In top 5 of 1 run(s): meta-index-hybrid #4

> ### 2026-08-10 — Sesja terminalowa (Claude Code): operator gita + fetch:llama + uszczelnienie .gitignore Ta sesja prowadzi odtąd operacje git w repo (logiczne commity zmian od innych sesji; NIE commituje `data/`, `.agent/`, `.bot/`, `backtest/results/`). - **Git**: usunięty stale `.git/index.lock`;  ...

### `docs/AI-WORKFLOW.md:81`

docs/AI-WORKFLOW.md:81-91 | no date | What did not
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> ## What did not - The journal became too long to read in full; later sessions read the state section and the last few entries only, and occasionally missed something older. - Hand-offs through the owner were the slowest link. Direct session-to-session messaging helped once it was available. - E ...

## why-05 (why, answerable: yes)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

**Reference:** The bot had to run 24/7 (nightly pipeline, 07:30 report, Telegram alerts), so the owner's always-on Windows desktop became the server with the Mac and iPhone as clients over LAN and VPN; the docs add that a closed laptop would mean a dead autopilot.

Evidence now: `journal/CONTEXT.md:3007-3007`, `journal/CONTEXT.md:3081-3082`, `journal/TASKS-WINDOWS.md:4-4`, `docs/INFRA.md:3-5`, `docs/UI-DESIGN.md:45-48`.

### `journal/TASKS-INFRA.md:9`

journal/TASKS-INFRA.md:9-38 | no date | Zadania
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> ## Zadania - [x] **1. `.gitignore` porządny** (przygotowanie pod GitHub): node_modules, dist, data/cache/, data/llama/, .agent/, .bot/, .env*, legacy-*.bak, backtest/results/, public/bundle.js*. Sprawdź, że .env NIE jest w historii (jest w starym .gitignore?). - [x] **2. Pliki wdrożeniowe Windo ...

### `journal/CONTEXT.md:3140`

journal/CONTEXT.md:3140-3151 | 2026-08-10 | 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
In top 5 of 9 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #5, hybrid-rerank #5, vector #5

> ### 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup Wykonano TASKS-WINDOWS-ADDENDUM.md (boty niewidoczne, bez okien konsoli): - Usunięto autostart `pm2-windows-startup` (`pm2-startup uninstall`, wpis w `HKCU\...\Run` zniknął). - Zainstalowano NSSM (`winget install nssm`) — na t ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 8 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, hybrid-stem-prefix6 #5, meta-index-hybrid #2, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

### `journal/CONTEXT.md:2347#p1`

journal/CONTEXT.md:2347-2389 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 6 run(s): hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Noc 20.08 = potwierdzenie wczorajszej roboty: pipeline 07:30 **19/19 kroków hs-* exit 0, zero asysty** (pierwszy w pełni czysty przebieg automatu w historii projektu), cache OK=[19] BRAKI=[], observer/state żywe ...

### `docs/INFRA.md:52`

docs/INFRA.md:52-65 | no date | 3. Code flow: Mac (development) → Windows (server)
In top 5 of 5 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #5, hybrid-stem-prefix6 #1, meta-index-hybrid #1, vector #1

> ## 3. Code flow: Mac (development) → Windows (server) - Git is the deployment channel: the Mac pushes to GitHub, the server pulls. `deploy/deploy.ps1` runs `git pull`, `npm ci`, `npm run build`, restarts the NSSM services only when `bot/`, the dependencies or `deploy/` changed (the UI is served ...

### `docs/INFRA.md:8`

docs/INFRA.md:8-36 | no date | 1. Architecture (as built)
In top 5 of 5 run(s): contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-stem-prefix6 #2, meta-index-hybrid #3, meta-index-hybrid-rerank #5

> ## 1. Architecture (as built) ``` ┌────────────────────────── WINDOWS (server, 24/7) ──────────────────────────┐ │  NSSM service homos-bot      bot/observer.ts — prices, signals, proposals  │ │  NSSM service homos-server   bot/server.ts — REST API + static UI (public/)│ │  Task Scheduler            ...

### `docs/INFRA.md:38`

docs/INFRA.md:38-50 | no date | 2. Network and security
In top 5 of 3 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #4, vector #3

> ## 2. Network and security - The API listens on port 8787, and the Windows Firewall admits only the home LAN and VPN subnets. **There is no port forwarding on the router; remote access is only through the VPN.** - Despite the VPN, every `/api/*` route requires a bearer token (`BOT_API_TOKEN`),  ...

### `journal/CONTEXT.md:2514#p3`

journal/CONTEXT.md:2586-2621 | 2026-08-19 | 2026-08-19 — Sesja analityczna (Fable) — odbiór nocy: root cause pipeline'u, ranking dnia #2, decyzje
In top 5 of 3 run(s): hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, query-pl-hybrid-rerank #5

> 2026-08-19 — Sesja analityczna (Fable) — odbiór nocy: root cause pipeline'u, ranking dnia #2, decyzje ~15:0x — BIAŁA STRONA (zgłoszenie Rafała 18.08, wróciło 19.08) ROZWIĄZANA (Fable, diagnoza na żywo przez Chrome z Maca): bundle z Windows rzucał na starcie `TypeError: Cannot convert a BigInt value ...

### `journal/CONTEXT.md:3036`

journal/CONTEXT.md:3036-3041 | 2026-08-10 | 2026-08-10 — Sesja 3e: BOT-OBSERWATOR (krok C wizji) — szkielet gotowy
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3

> ### 2026-08-10 — Sesja 3e: BOT-OBSERWATOR (krok C wizji) — szkielet gotowy - **`bot/config.ts`**: pule obserwowane (3), RPC z fallbackiem, NFT managery per chain, WATCH_ADDRESS (env, domyślnie wallet użytkownika), interwały. - **`bot/observer.ts`** (npm run bot): daemon OBSERWUJ — pętle 60s (ceny/ti ...

### `journal/CONTEXT.md:2871#p2`

journal/CONTEXT.md:2900-2929 | 2026-08-10 | 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie z botem ✅
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #4

> 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie z botem ✅ Użyta W DWÓCH miejscach (nagłówek App.tsx obok CompactWalletInfo + w nagłówku kokpitu) na WSPÓLNYM stanie `useBotApi()` wywołanym raz w `App.tsx` — jeden poll 60s, nie dwa niezależne. - **PWA**: `public/manifest.js ...

### `docs/INFRA.md:73`

docs/INFRA.md:73-78 | no date | 5. Rollout (planned vs actual)
In top 5 of 1 run(s): vector #4

> ## 5. Rollout (planned vs actual) The planned order was: repository on GitHub → Node, clone and services on Windows → the bot in OBSERVE mode plus the API/UI server → firewall, token and an iPhone test over the VPN → PROPOSE → AUTO along the trust path. Everything up to PROPOSE was built; PROPOSE m ...

### `journal/CONTEXT.md:3473`

journal/CONTEXT.md:3473-3501 | 2026-08-18 | 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszmy i zbudujmy")
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #5

> ### 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszmy i zbudujmy") Nowy moduł `bot/paper.ts` — wirtualny portfel prowadzony przez ALGORITHM v1.2 na żywych danych, $10k na każdą pulę BOT_POOLS (PAPER_CAPITAL_USD env). Odpowiada na pytanie "jak algorytm zachowałby się na prawdziw ...

## why-06 (why, answerable: yes)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

**Reference:** The bot ran in PROPOSE mode with no wallet key on the server, so the owner signed every transaction; the only cost was signing delay (up to ~13 h at night, ~61 h over a weekend), measured from day one, and AUTO existed only as a later rung of the trust path OBSERVE-PROPOSE-AUTO that was deliberately not enabled at the start.

Evidence now: `journal/DECYZJE-2026-08-26.md:531-543`, `journal/CONTEXT.md:99-99`, `journal/CONTEXT.md:3086-3088`, `journal/TASKS-WINDOWS.md:24-24`, `journal/CONTEXT.md:3006-3006`, `journal/RESEARCH-QUEUE.md:765-766`.

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 14 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, hybrid-stem-prefix6 #5, meta-index-hybrid #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `docs/EMERGENCY.md:1`

docs/EMERGENCY.md:1-9 | no date | _Historical runbook. The product was wound down in September 2026; kept as documentation of the operating procedure._
In top 5 of 13 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #1, meta-index-hybrid #2, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #1

> _Historical runbook. The product was wound down in September 2026; kept as documentation of the operating procedure._ # EMERGENCY.md — emergency procedure for the FlatWide product ("red button") > Owner's decision, evening of 27 Aug 2026 (working journal of that day): > the DOWN signal on the prod ...

### `docs/UI-DESIGN.md:50`

docs/UI-DESIGN.md:50-60 | no date | 3. Automation loops (requirement → mechanism)
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> ## 3. Automation loops (requirement → mechanism) | Frequency | Task | Notes | |---|---|---| | every 1 min | monitor prices/ticks of the watched pools | cheap RPC reads; keeps ranges up to date | | every 15 min | recompute advisor signals (volatility, fee yield, ranges) | the same formulas as `advis ...

### `journal/CONTEXT.md:2347#p2`

journal/CONTEXT.md:2389-2432 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 8 run(s): contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, hybrid-stem-prefix6 #2, meta-index-hybrid #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Bilans dnia: pierwszy w historii pipeline zielony end-to-end (8GB heap), eksperyment hUp policzony+cross-walidacja (werdykt 48h czeka na 26.08), tbtc-wbtc domknięty (pegged: NIE), ROTATE cross-pool + hedge GMX z ...

### `journal/TASKS-UI.md:522#p2`

journal/TASKS-UI.md:560-590 | no date | PARTIA 9 — [Zatwierdź hedge] na GMX (karta propozycji HEDGE) ✅ wykonana — zlecone przez Fable 20.08 (decyzja Rafała)
In top 5 of 5 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #5, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4

> PARTIA 9 — [Zatwierdź hedge] na GMX (karta propozycji HEDGE) ✅ wykonana — zlecone przez Fable 20.08 (decyzja Rafała) `openHedgeApprove()` — `sizeEth` z `p.hedgeSizeEth`, `ethPriceUsd` z `bot.state.pools[poolId].ethUsd` (ta sama pula, dla której bot policzył sizeEth); brak jednego z nich ...

### `journal/CONTEXT.md:2713`

journal/CONTEXT.md:2713-2761 | 2026-08-10 | 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 2 fixy z odbioru P3
In top 5 of 4 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank #4, query-pl-hybrid-rerank #5

> ### 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 2 fixy z odbioru P3 Wykonana cała Partia 4 z TASKS-UI.md (4 pozycje, wszystkie odhaczone). Przed implementacją przeczytane na świeżo (nie na podstawie streszczenia w tym pliku): `bot/observer.ts` (rozszerzony `interface Propos ...

### `journal/TASKS-UI.md:69#p2`

journal/TASKS-UI.md:95-124 | no date | PARTIA 3 — Telemetria + akcje na kokpicie ✅ wykonana
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #5

> PARTIA 3 — Telemetria + akcje na kokpicie ✅ wykonana Zmieniono: przycisk wymaga teraz tylko `p.pool`, a modal ma tryb "Własny zakres" (ceny USD, jak w AddLiquidity.tsx) jako fallback, gdy `p.suggestion` jest `null` — `openSuggestedPosition` przemianowane na `openPositionAtRange(tickLowe ...

### `journal/TASKS-UI.md:700#p1`

journal/TASKS-UI.md:700-738 | no date | PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08)
In top 5 of 3 run(s): hybrid-rerank-1024 #4, hybrid-rerank #5, meta-index-hybrid-rerank #5

> PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08) KONTEKST: testowy short $15 istniał tylko na app.gmx.io i w localStorage jednej przeglądarki — nie było go na wykresach/telefonie/raporcie. Backend GOTOWY (Fable): observer czyta pozycje z GMX Readera co cykl ( ...

### `docs/UI-DESIGN.md:92`

docs/UI-DESIGN.md:92-98 | no date | 4.3 Autopilot *(not implemented)*
In top 5 of 3 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #5, vector #4

> ### 4.3 Autopilot *(not implemented)* - Mode per pool: OBSERVE / PROPOSE / AUTO, with separate limits. - Global limits: max USD per transaction, max transactions per day, max % of capital in one pool. - **Kill-switch**: a large red button "close everything to stable" with double confirmation, plus ...

### `journal/HANDOFF.md:254#p5`

journal/HANDOFF.md:451-502 | no date | @Sonnet (sesja UI, Cowork)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1

> @Sonnet (sesja UI, Cowork) Grupowanie: `emergencyProposals` wyciągnięte z `pendingProposals` PRZED zwykłą listą, grupowane po `tokenId`, sortowane A(HEDGE) przed B(EXIT_TREND) w grupie, renderowane w nowej sekcji "🚨 Procedura awaryjna" NAD "Propozycje bota" (`.morning-emergency-grou ...

### `journal/HANDOFF.md:641#p11`

journal/HANDOFF.md:1196-1252 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #4

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) Przycisk MAX przy obu tokenach — wpisuje `formatUnits(bal, decimals)` (dokładne saldo), nie wyświetlaną (uciętą) wartość. 5. Wyświetlane saldo: nowy `floorBalanceStr()` — trunacja na STRINGU z formatUnits (nie `toFixed`, które zaokrąg ...

### `docs/EMERGENCY.md:33`

docs/EMERGENCY.md:33-49 | no date | 2. Option A — delta-neutral hedge (preferred: reversible, the LP stays)
In top 5 of 1 run(s): meta-index-hybrid #1

> ## 2. Option A — delta-neutral hedge (preferred: reversible, the LP stays) Card "EMERGENCY OPTION A" in the cockpit (amounts computed from the live position). - **What:** a 1× short on GMX v2 (Arbitrum) for the full exposure of the position's volatile leg. WETH/USDC → short ETH/USD (**one signat ...

### `journal/CONTEXT.md:2347#p1`

journal/CONTEXT.md:2347-2389 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 1 run(s): vector #2

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Noc 20.08 = potwierdzenie wczorajszej roboty: pipeline 07:30 **19/19 kroków hs-* exit 0, zero asysty** (pierwszy w pełni czysty przebieg automatu w historii projektu), cache OK=[19] BRAKI=[], observer/state żywe ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 1 run(s): hybrid-stem-prefix6 #3

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

### `journal/TASKS-UI.md:465#p2`

journal/TASKS-UI.md:496-520 | no date | PARTIA 8 — ROTATE: automatyczne [Zatwierdź] (cross-pool) ✅ wykonana — zlecone przez Fable 20.08 (decyzja Rafała)
In top 5 of 1 run(s): vector #3

> PARTIA 8 — ROTATE: automatyczne [Zatwierdź] (cross-pool) ✅ wykonana — zlecone przez Fable 20.08 (decyzja Rafała) **Stany brzegowe**: brak pozycji do zamknięcia (OPEN-only) → karta bez zmian; pary rozłączne (throw z planRotate) → notka + kroki ręczne. - [x] `useRotateExecution.ts` (nowy) — kopia ...

### `journal/DECYZJE-2026-08-26.md:602`

journal/DECYZJE-2026-08-26.md:602-633 | no date | 11g. (Pomysł Rafała 25.08 noc — ZAPISANE, NIE WYKONYWAĆ) Pełny
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #5

> ## 11g. (Pomysł Rafała 25.08 noc — ZAPISANE, NIE WYKONYWAĆ) Pełny lifecycle puli: ranking → walidacja → paper → propozycje Propozycja Rafała: (1) para wchodzi do rankingu dnia (top ≥3 dni, TVL ≥$3M — jak dziś), (2) → auto-walidacja walkforwardem (lejek — jak dziś), (3) PASS → AUTOMATYCZNIE do paper ...

### `docs/PLAN.md:95`

docs/PLAN.md:95-97 | no date | 3.5. MEV and execution
In top 5 of 1 run(s): vector #5

> ### 3.5. MEV and execution Rebalance = swap → the bot will be sandwiched regularly if it sends transactions through the public mempool. Required: private RPC / protected transactions, slippage limits computed from the current pool depth, deadlines. On L2 the problem is smaller than on mainnet, but  ...

## why-07 (why, answerable: partial)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

**Reference:** The sources do not give a reason: the vision suggested a small VPS (~$5/month) and the home Windows machine simply took that role; the journal treats a VPS only as a possible future move with the trust model (API exposure, secrets) left undecided.

Evidence now: none.

### `docs/UI-DESIGN.md:35`

docs/UI-DESIGN.md:35-48 | no date | 2. Architecture: who does what | already listed as related
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #1, meta-index-hybrid #3, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #3

> ## 2. Architecture: who does what ``` ┌─────────────┐   writes state  ┌──────────────┐   reads state  ┌──────────────┐ │  BOT (24/7) │ ──────────────► │  state/logs  │ ◄────────────── │  UI (React)  │ │  Node daemon│                 └──────────────┘                │ view only    │ │  on a server│ ◄ ...

### `journal/RESEARCH-QUEUE.md:684#p2`

journal/RESEARCH-QUEUE.md:728-771 | no date | H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie) | already listed as related
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie) - [ ] **SQLITE DLA LOGÓW/PAPER (pomysł Rafała 18.08)** — SCHEMAT ZAPROJEKTOWANY: **DB-SCHEMA.md** (zasady rozszerzalności: migracje numerowane, raw-bigint jako TEXT, JSON1 na płynne ładunki, słowniki jako tabele; DDL v1: pool/ve ...

### `journal/CONTEXT.md:3140`

journal/CONTEXT.md:3140-3151 | 2026-08-10 | 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
In top 5 of 10 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, hybrid-stem-prefix6 #4, meta-index-hybrid #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #5, vector #4

> ### 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup Wykonano TASKS-WINDOWS-ADDENDUM.md (boty niewidoczne, bez okien konsoli): - Usunięto autostart `pm2-windows-startup` (`pm2-startup uninstall`, wpis w `HKCU\...\Run` zniknął). - Zainstalowano NSSM (`winget install nssm`) — na t ...

### `journal/CONTEXT.md:3081`

journal/CONTEXT.md:3081-3119 | 2026-08-10 | 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
In top 5 of 9 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #4, hybrid-rerank #4, vector #5

> ### 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ) Wykonano `TASKS-WINDOWS.md` (kroki 1–10) na stacjonarnym Windows użytkownika, repo w `C:\Projects\homos`. Szczegóły w TASKS-WINDOWS.md, skrót tutaj: - **Środowisko**: Node v24.18.0 (nowszy niż wymagane v22.x — działa poprawnie, ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 8 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 7 run(s): contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `docs/INFRA.md:1`

docs/INFRA.md:1-6 | no date | INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN/VPN
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #1, vector #2

> # INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN/VPN > Decided 10 Aug 2026: the server is the owner's Windows desktop running 24/7; the Mac and > the iPhone reach it over the LAN, and from outside the home only through the existing home > VPN. This document is the architectu ...

### `journal/TASKS-INFRA.md:9`

journal/TASKS-INFRA.md:9-38 | no date | Zadania
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #4, hybrid-stem-prefix6 #5

> ## Zadania - [x] **1. `.gitignore` porządny** (przygotowanie pod GitHub): node_modules, dist, data/cache/, data/llama/, .agent/, .bot/, .env*, legacy-*.bak, backtest/results/, public/bundle.js*. Sprawdź, że .env NIE jest w historii (jest w starym .gitignore?). - [x] **2. Pliki wdrożeniowe Windo ...

### `docs/INFRA.md:38`

docs/INFRA.md:38-50 | no date | 2. Network and security
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #2

> ## 2. Network and security - The API listens on port 8787, and the Windows Firewall admits only the home LAN and VPN subnets. **There is no port forwarding on the router; remote access is only through the VPN.** - Despite the VPN, every `/api/*` route requires a bearer token (`BOT_API_TOKEN`),  ...

### `journal/CONTEXT.md:3005`

journal/CONTEXT.md:3005-3009 | 2026-08-10 | 2026-08-10 — Sesja 3c: Wizja produktu + infrastruktura (dokumenty) | already listed as related
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5

> ### 2026-08-10 — Sesja 3c: Wizja produktu + infrastruktura (dokumenty) - **`UI-VISION.md`**: docelowy kształt = autopilot + poranny kokpit (użytkownik zagląda raz rano). Ekrany: poranny brief (finanse + kolejka decyzji + alerty + sugestie rotacji z kosztem przejścia), pozycje z osią czasu zdarzeń, u ...

### `docs/AI-WORKFLOW.md:8`

docs/AI-WORKFLOW.md:8-23 | no date | The four roles
In top 5 of 2 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5

> ## The four roles | Session | Where it ran | Role | |---|---|---| | **Fable** (analysis) | cloud, always available (also from a phone) | research, strategy design, backtest interpretation, core/bot code, coordination, morning briefs, pushback on trade decisions | | **CC-Mac** (Claude Code) | termin ...

### `docs/INFRA.md:73`

docs/INFRA.md:73-78 | no date | 5. Rollout (planned vs actual)
In top 5 of 1 run(s): vector #1

> ## 5. Rollout (planned vs actual) The planned order was: repository on GitHub → Node, clone and services on Windows → the bot in OBSERVE mode plus the API/UI server → firewall, token and an iPhone test over the VPN → PROPOSE → AUTO along the trust path. Everything up to PROPOSE was built; PROPOSE m ...

### `journal/HANDOFF.md:1264#p2`

journal/HANDOFF.md:1320-1377 | no date | @CC-Win (Claude Code od botów windowsowych)
In top 5 of 1 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5

> @CC-Win (Claude Code od botów windowsowych) Jedno techniczne odstępstwo od zlecenia: run arbitrum-weth-usdc-005-720d padł na OOM w domyślnym limicie heap Node [cache 3.4 GB ndjson], powtórzony z NODE_OPTIONS=--max-old-space-size=8192 — odnotowane w raporcie do Fable. Wpis skasowany — higiena.) (OD ...

## why-08 (why, answerable: yes)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

**Reference:** It was not riskier as an LP: against HODL cbBTC/WETH was the best pool (365 d: +11.42 for k2h24, the largest LP-vs-HODL alpha; 27.08 closest to passing the gate; on 720 d the only pool with 65% winning windows), but in USD it carries full crypto beta with no stable cushion (HODL -51.5% APR, max drawdown 61.5%), so LP and HODL lose together.

Evidence now: `journal/CONTEXT.md:3817-3828`, `journal/CONTEXT.md:281-283`, `journal/CONTEXT.md:2074-2077`, `journal/CONTEXT.md:3766-3769`, `journal/DECYZJE-2026-08-26.md:549-555`, `docs/PAIRS.md:41-52`.

### `journal/RESEARCH-QUEUE.md:7#p1`

journal/RESEARCH-QUEUE.md:7-50 | no date | A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
In top 5 of 11 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #2

> A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline) - [x] **Refetch mainnet-usdc-weth-030 (pełne 90d)** — ✅ DONE (Claude Code): 100.0%, **49210 swapów, 90.3 dni**. Wymagało kilku wznowień (skrypt wychodzi 0 mimo FAILED przy dławieniu archiwalnym publicznych RPC; resume ze state.json dogr ...

### `journal/reports/morning-2026-09-05.md:114`

journal/reports/morning-2026-09-05.md:114-132 | 2026-09-05 | RANKING WIDE (pod produkt, top 10)
In top 5 of 10 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #3

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-05 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `journal/reports/morning-2026-09-10.md:146`

journal/reports/morning-2026-09-10.md:146-164 | 2026-09-10 | RANKING WIDE (pod produkt, top 10)
In top 5 of 5 run(s): hybrid-rerank-1024 #4, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #4

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-10 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `journal/reports/morning-2026-09-16.md:132`

journal/reports/morning-2026-09-16.md:132-150 | 2026-09-16 | RANKING WIDE (pod produkt, top 10)
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #5

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-16 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | W ...

### `docs/ALGORITHM.md:84`

docs/ALGORITHM.md:84-92 | 2026-08-11 | 6. Portfolio (revision of 11 Aug; the original candidate list is in [`PAIRS.md`](PAIRS.md))
In top 5 of 3 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1, vector #1

> ## 6. Portfolio (revision of 11 Aug; the original candidate list is in [`PAIRS.md`](PAIRS.md)) - Core: WETH/USDC 0.3% Base — active (k=3, h24, trend breaker; hedge-excess from v1.2). - cbBTC/WETH 0.05% Base — active k=2. Note: the pair is 100% crypto beta (HODL −51%/yr in 2025/26), so the sleeve  ...

### `journal/reports/morning-2026-09-12.md:171`

journal/reports/morning-2026-09-12.md:171-189 | 2026-09-12 | RANKING WIDE (pod produkt, top 10)
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #4

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-12 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | W ...

### `journal/reports/morning-2026-09-08.md:112`

journal/reports/morning-2026-09-08.md:112-130 | 2026-09-08 | RANKING WIDE (pod produkt, top 10)
In top 5 of 2 run(s): hybrid-rerank-1024 #3, hybrid-rerank #4

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-08 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `journal/reports/morning-2026-09-15.md:112`

journal/reports/morning-2026-09-15.md:112-130 | 2026-09-15 | RANKING WIDE (pod produkt, top 10)
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-15 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | W ...

### `journal/reports/morning-2026-09-17.md:151`

journal/reports/morning-2026-09-17.md:151-169 | 2026-09-17 | RANKING WIDE (pod produkt, top 10)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, hybrid-stem-prefix6 #4

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-17 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `journal/reports/morning-2026-09-21.md:170`

journal/reports/morning-2026-09-21.md:170-188 | 2026-09-21 | RANKING WIDE (pod produkt, top 10)
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, vector #4

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-21 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | W ...

### `journal/reports/morning-2026-09-03.md:134`

journal/reports/morning-2026-09-03.md:134-152 | 2026-09-03 | RANKING WIDE (pod produkt, top 10)
In top 5 of 1 run(s): meta-index-hybrid #2

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-03 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | W ...

### `journal/RESEARCH-QUEUE.md:1073#p1`

journal/RESEARCH-QUEUE.md:1073-1113 | no date | nie kosztują, róbmy ich więcej") — uporządkowana wg DECYZJI, nie ciekawości
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #3

> nie kosztują, róbmy ich więcej") — uporządkowana wg DECYZJI, nie ciekawości ZASADA, żeby to nie zamieniło się w łowienie zwycięzcy: kandydat wchodzi do produktu dopiero, gdy przejdzie bramkę 720d w ≥2 reżimach ORAZ nie psuje wyniku na oknie odłożonym (ostatnie 90 dni, `FP_DAYS=90` — nie patrzymy na ...

### `journal/CONTEXT.md:4240#p1`

journal/CONTEXT.md:4240-4268 | 2026-08-21 | 2026-08-21 11:xx — Trzy pytania Rafała o paper trading: odpowiedzi + dwie usterki estymatora zmienności
In top 5 of 1 run(s): vector #3

> 2026-08-21 11:xx — Trzy pytania Rafała o paper trading: odpowiedzi + dwie usterki estymatora zmienności 1. **cbBTC-WETH nie wraca z cash, bo sygnał trendu wciąż aktywny.** Trend liczony jest na cenie WZGLĘDNEJ (`quote:'WETH'`), czyli cbBTC wyrażonym w WETH (~33.3 z `trend-state.ema`), NIE w U ...

### `journal/CONTEXT.md:1130#p4`

journal/CONTEXT.md:1259-1301 | 2026-08-31 | 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #4

> 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia (2) **tBTC/WBTC 0.01% mainnet — jedyny realny sygnał** (100% wygr., dodatnia średnia na wszystkich szerokościach, recent90 trzyma): +0.06%/okno ≈ ~0.7%/r przewagi nad HODL W NATURZE BTC. Zimna ocena: „lo ...

### `journal/KAPITAL-REKOMENDACJA.md:33`

journal/KAPITAL-REKOMENDACJA.md:33-48 | no date | 2. Transza 1 — $6 000 (struktura)
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #5

> ## 2. Transza 1 — $6 000 (struktura) | gdzie | kwota | uzasadnienie | |---|---|---| | **base-weth-usdc-005** | **$2 500** | Rdzeń ETH/stable: bramka pass, stable = poduszka (down med. −64% APR to głównie beta ETH połowy pozycji), gaz Base pomijalny, czysty exit-trend bez operacyjki hedge | | **base ...

### `journal/CONTEXT.md:1130#p3`

journal/CONTEXT.md:1214-1258 | 2026-08-31 | 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #5

> 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia HOTFIX (Fable, tsc czysty, build przechodzi): `waitReceiptBestEffort` wyeksportowany z useCockpitActions (+walidacja formatu hasha), podmienione 3+3 surowe waity w useRebalanceExecution i useRotateExecut ...

### `docs/DECISION-LOG.md:28`

docs/DECISION-LOG.md:28-28 | 2026-09-11 | Decision of 2026-09-11
In top 5 of 1 run(s): meta-index-hybrid #5

> Decision of 2026-09-11: **Close the narrowing episode** (trend breaker fired on cbBTC): sign the widening; reject both emergency options (short on GMX, exit to cash). Product unchanged. Evidence / rationale: Signal only on the crypto/crypto leg; on such a pair LP and HODL share the same USD beta. Ep ...

### `journal/reports/morning-2026-09-04.md:134`

journal/reports/morning-2026-09-04.md:134-152 | 2026-09-04 | RANKING WIDE (pod produkt, top 10)
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-04 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `journal/reports/morning-2026-09-20.md:170`

journal/reports/morning-2026-09-20.md:170-188 | 2026-09-20 | RANKING WIDE (pod produkt, top 10)
In top 5 of 1 run(s): vector #5

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-20 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | W ...

## why-09 (why, answerable: yes)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

**Reference:** The 365-day year was sideways-to-down and flattered the strategy, while 720 days included uptrend windows where it lost badly (0 of 21 configurations passed); separately the swap-based sigma estimator measured pool microstructure rather than the asset, so k had been calibrated in wrong units, and the gate became 720 days plus a recent ~90-day condition.

Evidence now: `journal/CONTEXT.md:96-96`, `journal/CONTEXT.md:95-95`, `journal/DECYZJE-2026-08-26.md:549-556`, `journal/DECYZJE-2026-08-26.md:466-482`, `docs/CASE-STUDY.md:52-58`, `docs/DECISION-LOG.md:22-22`.

### `journal/CONTEXT.md:4554#p5`

journal/CONTEXT.md:4736-4781 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #4, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 **PIERWSZY PASS w historii lejka: WETH-CBBTC 0.3% @ Base (65.2% wygr., worst −2.7)** — adres puli zweryfikowany niezależnie na chainie przez CC-Win; 4×FAIL (w tym dzisiejsza propozycja OPEN WETH- ...

### `docs/ALGORITHM.md:1`

docs/ALGORITHM.md:1-14 | no date | ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1.2 17 Aug)
In top 5 of 7 run(s): contextual-sonnet-hybrid-rerank #5, hybrid-rerank-1024 #3, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4

> # ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1.2 17 Aug) > The single source of truth for strategy parameters. Changes only via an entry > in the project decision log (see [`DECISION-LOG.md`](DECISION-LOG.md)) with a data-backed > justification. Empirical sources: selectio ...

### `docs/DECISION-LOG.md:26`

docs/DECISION-LOG.md:26-26 | 2026-08-31 | Decision of 2026-08-31
In top 5 of 3 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #4, vector #3

> Decision of 2026-08-31: **Sign the first narrowing proposal (cbBTC leg) as an operational experiment**, n = 1, explicitly *not* a test of the strategy; the 720-day falsification stands. Evidence / rationale: We wanted real `widthPct` / `costUsd` / `paybackDays` and a full narrow→wide cycle measured  ...

### `docs/DECISION-LOG.md:15`

docs/DECISION-LOG.md:15-15 | 2026-08-11 | Decision of 2026-08-11
In top 5 of 3 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #5, vector #5

> Decision of 2026-08-11: **Revision v1.1**: re-entry after a drop = price back above EMA (ETH/stable); cbBTC keeps plain exit. Evidence / rationale: Full 365-day runs on two pools (22 windows each) reversed the morning ranking, which had been based on 4-window 90-day runs. First full gate pass on bas ...

### `journal/HANDOFF.md:641#p5`

journal/HANDOFF.md:863-922 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 3 run(s): hybrid-rerank #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) NATYCHMIAST po pushu ping CC-Win — wdrożenie to sam `nssm restart homos-bot`, bez builda. - [Fable→CC-Mac, 29.08 ~21:xx — DOCS, zamknięcie dnia] Commit+push: `CONTEXT.md` (obalenie wariantu bez swapu na obu pulach + recent90, falsyfikacja  ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #3

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `journal/CONTEXT.md:1362#p9`

journal/CONTEXT.md:1777-1829 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) ~17:xx — **POMYSŁ RAFAŁA „a nie można dorzucić ETH?" → WARIANT BEZ SWAPU, PIERWSZE WYNIKI BARDZO DOBRE (ale z zastrzeżeniem).** Zamiast przestawiać posturę przez rynek (swap do 50/50 wokół ceny), przesuwamy ZAKRES tak, żeby ...

### `journal/RESEARCH-QUEUE.md:95#p1`

journal/RESEARCH-QUEUE.md:95-143 | no date | B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5

> B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty) - [x] **Walk-forward na 365d** — ✅ DONE (Claude Code, dane 365d przez HyperSync: 1 852 872 swapy). Kryterium: %wygr ≥65 i najgorsze okno > −3. **WERDYKT: ŻADNA strategia nie przechodzi bramki** (najgorsze okno wszędzie −7…−12).  ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 2 run(s): hybrid-rerank-1024 #5, hybrid-rerank-meta-1024 #5

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

### `journal/RESEARCH-QUEUE.md:7#p1`

journal/RESEARCH-QUEUE.md:7-50 | no date | A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
In top 5 of 1 run(s): vector #4

> A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline) - [x] **Refetch mainnet-usdc-weth-030 (pełne 90d)** — ✅ DONE (Claude Code): 100.0%, **49210 swapów, 90.3 dni**. Wymagało kilku wznowień (skrypt wychodzi 0 mimo FAILED przy dławieniu archiwalnym publicznych RPC; resume ze state.json dogr ...

## why-10 (why, answerable: yes)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

**Reference:** Fees accrue only while the price is inside the range and fee yield scales roughly with 1/width, so a narrow range earns much more in a flat market but is left behind in a trend, while a wide range stays in range but earns several times less; the journal states this mechanism (the basis of FlatWide) but has no live measurement of fees during an uptrend, and it attributes the backtest losses in up windows to impermanent loss and LVR rather than to lower fees.

Evidence now: `journal/CONTEXT.md:1813-1815`, `journal/CONTEXT.md:4263-4265`, `journal/CONTEXT.md:59-62`, `docs/CASE-STUDY.md:8-8`, `journal/DECYZJE-2026-08-26.md:546-560`.

### `journal/DECYZJE-2026-08-26.md:90#p2`

journal/DECYZJE-2026-08-26.md:123-151 | no date | ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #4

> ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE **JEDYNA praktyczna obserwacja, która przeżyła dzień:** szeroki pasywny LP ±50% ("HODL z yieldem") — bije HODL w pełnym okresie na 4/4 pulach przy ~zerowych kosztach; przegrywa z HODL w oknach up (stara bramka), ale to produkt ALOKACY ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 10 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #2, hybrid-rerank-1024 #2, hybrid-rerank #3, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #2, hybrid-stem-prefix6 #4, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `journal/CONTEXT.md:3806`

journal/CONTEXT.md:3806-3848 | 2026-08-11 | 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA
In top 5 of 6 run(s): hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> ### 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA **1. BUG KRYTYCZNY silnika backtestu naprawiony**: `unitPrices` zakładał parę ETH/stable (nie-ETH-owa noga = $1). Dla par kwotowanych w WETH (cbBTC/WETH, WTAO/WETH) WSZYSTKIE dotych ...

### `journal/RESEARCH-QUEUE.md:529#p2`

journal/RESEARCH-QUEUE.md:563-595 | no date | E. WDROŻENIA KODU (dla Claude Code / terminala)
In top 5 of 6 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #5

> E. WDROŻENIA KODU (dla Claude Code / terminala) Pasywny full-range +77.5 (vsHODL +0.37, fees $124); pasywny ±50% +75.1 (vsHODL +0.01, fees $486 ≈ 19.7%/r fee-yield). WSZYSTKIE aktywne PRZEGRYWAJĄ z HODL: ±5% naiwny −33.8 p.p. (trend+gas $248), ±15% −15.4, adapt k2h24 −11.2, k3h24 −1.8. WNIOSK ...

### `docs/CASE-STUDY.md:105`

docs/CASE-STUDY.md:105-130 | no date | 5. Conclusions
In top 5 of 5 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #5, hybrid-stem-prefix6 #2, meta-index-hybrid #2

> ## 5. Conclusions **On the strategy.** For ETH/stable and ETH/BTC pairs, concentrated liquidity did not beat HODL 50/50 out of sample. The fee income is real but it is paid for with convexity: you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn. A wid ...

### `docs/DECISION-LOG.md:28`

docs/DECISION-LOG.md:28-28 | 2026-09-11 | Decision of 2026-09-11
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, vector #2

> Decision of 2026-09-11: **Close the narrowing episode** (trend breaker fired on cbBTC): sign the widening; reject both emergency options (short on GMX, exit to cash). Product unchanged. Evidence / rationale: Signal only on the crypto/crypto leg; on such a pair LP and HODL share the same USD beta. Ep ...

### `journal/DECYZJE-2026-08-26.md:635`

journal/DECYZJE-2026-08-26.md:635-654 | no date | 12. Pomysł Rafała (25.08): fallback → HODL przy silnym trendzie UP
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #5

> ## 12. Pomysł Rafała (25.08): fallback → HODL przy silnym trendzie UP Obserwacja trafna: paper +7.6% w 6 dni, ale HODL 50/50 +16.6% — cały zysk bota to beta rynku, edge (fees) przegrywa z IL na pompie (LP = short gamma, to strukturalne). Idea: trzeci reżim w algorytmie — rosnący rynek → przestaw si ...

### `docs/PLAN.md:99`

docs/PLAN.md:99-106 | no date | 3.6. The rebalance policy is richer than "went out of range → move it"
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #4

> ### 3.6. The rebalance policy is richer than "went out of range → move it" Gaps in the proposed profitability condition: - **Hysteresis / buffer zones**: rebalance only when the price exceeds the range by X% or stays outside it for T minutes (protection against whipsaw), - **Market regime filter**: ...

### `docs/PLAN.md:91`

docs/PLAN.md:91-93 | no date | 3.4. Funding rate is not only a cost — it can be income
In top 5 of 2 run(s): meta-index-hybrid #3, vector #4

> ### 3.4. Funding rate is not only a cost — it can be income In a delta-neutral strategy a short on perps **receives** funding when the market is bullish (positive funding — and historically it is positive most of the time). A well-designed hedge can be a second source of income, not a cost. But the ...

### `docs/CASE-STUDY.md:141`

docs/CASE-STUDY.md:141-153 | no date | 7. Numbers, for the record
In top 5 of 2 run(s): meta-index-hybrid #5, vector #3

> ## 7. Numbers, for the record | Item | Value | |---|---| | Capital deployed | 6 092 USDC on Base, 27 Aug 2026 | | LP phase result (27 Aug – 18 Sep) | +0.6 % (+$38), ≈ $29 of it fees | | Narrowing experiment | 11 days, ≈ $8.6 fees, −$32 vs HODL at close | | Post-LP spot exposure (18 – 21 Sep) | ≈ +$ ...

### `journal/CONTEXT.md:1362#p7`

journal/CONTEXT.md:1668-1720 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 2 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) WYNIKI (365d, cache 11.08, $2500, SIGMA_MODE=grid15): · cbBTC (cena −16.5%): ±4% $1364 · **±5% $1345** · cash $1322 · ±8% $1302 · pasywny±40 $1297 · k×σ $1275 · HODL $1213 · USDC $2500 · base-030 (cena −54.8%, idle ±50):  ...

### `journal/CONTEXT.md:246`

journal/CONTEXT.md:246-275 | 2026-09-16 | 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.29% (cała beta), 2× FLAT_NARROW NIE; **REWIZJA ZASA
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #3

> ### 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.29% (cała beta), 2× FLAT_NARROW NIE; **REWIZJA ZASADY WYJŚCIA: exit przy bilansie ≥ 0 zamiast twardego 24.09** AUTOMAT (raporty 07:30 z 15 i 16.09): obie noce „porażki: BRAK", backtest-run ~1h18, swap-cache OK, lejek pusty, sel ...

### `journal/reports/morning-2026-09-08.md:112`

journal/reports/morning-2026-09-08.md:112-130 | 2026-09-08 | RANKING WIDE (pod produkt, top 10)
In top 5 of 1 run(s): contextual-haiku-run2-hybrid-rerank #3

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-08 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `journal/CONTEXT.md:3011`

journal/CONTEXT.md:3011-3031 | 2026-08-10 | 2026-08-10 — Sesja 3d: PIERWSZY BACKTEST (dane częściowe!) — Base WETH/USDC 0.3%, 545,724 swapy, 79.4 dnia
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #4

> ### 2026-08-10 — Sesja 3d: PIERWSZY BACKTEST (dane częściowe!) — Base WETH/USDC 0.3%, 545,724 swapy, 79.4 dnia Okres SPADKOWY (HODL 50/50: −32% APR ann.) — jeden reżim, wyniki wstępne, bez ostatnich ~10 dni. | Strategia | APR% | vs HODL% | maxDD% | fees$ | reb | |---|---|---|---|---|---| | HODL 50/ ...

### `journal/CONTEXT.md:798#p1`

journal/CONTEXT.md:798-840 | 2026-09-02 | 2026-09-02 ~przedpołudnie — Brief + ŚWIEŻE SPOJRZENIE NA ZYSKI (Fable + Rafał): kształt szerokiej nogi do bramki, Aerodr
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #4

> 2026-09-02 ~przedpołudnie — Brief + ŚWIEŻE SPOJRZENIE NA ZYSKI (Fable + Rafał): kształt szerokiej nogi do bramki, Aerodrome sprawdzony, benchmark „HODL+yield" BRIEF (raport 07:30): automat czysty, kolejka pusta, down:false 6/6. Bilans transzy −$200.86 (−3.30%): rynek −$190.70, reszta −$10.16 (koszt ...

### `journal/DECYZJE-2026-08-26.md:90#p1`

journal/DECYZJE-2026-08-26.md:90-122 | no date | ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #5

> ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE Kontekst: po serii recal Rafał zapytał wprost "czy projekt ma sens i kiedy go porzucić"; ustalono próg: jeśli rodziny A (delta-neutral) i B (flat-only) nie pokażą przewagi nad swoimi benchmarkami — kapitał nie wchodzi do żadnej strate ...

### `journal/reports/morning-2026-09-11.md:146`

journal/reports/morning-2026-09-11.md:146-164 | 2026-09-11 | RANKING WIDE (pod produkt, top 10)
In top 5 of 1 run(s): contextual-haiku-run2-hybrid-rerank #5

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-11 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | W ...

### `journal/CONTEXT.md:4472#p1`

journal/CONTEXT.md:4472-4511 | 2026-08-24 | 2026-08-24 — Poranny brief po weekendzie (Fable) — ranking ZAMROŻONY po raz drugi (hipoteza potwierdzona, fix wdrożony),
In top 5 of 1 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5

> 2026-08-24 — Poranny brief po weekendzie (Fable) — ranking ZAMROŻONY po raz drugi (hipoteza potwierdzona, fix wdrożony), FOMO-check paper tradingu Odbiór raportów 23–24.08 (nikt ich wcześniej nie analizował): PIPELINE: oba dni w pełni zielone (20/20 hs-*, BRAKI=[], backtest-run ~54 min exit 0, sele ...

### `docs/EMERGENCY.md:21`

docs/EMERGENCY.md:21-31 | no date | 1. Default reaction: sign nothing
In top 5 of 1 run(s): vector #5

> ## 1. Default reaction: sign nothing Data (26–27 Aug, 40+ walk-forward and full-period runs): - exiting on the trend signal on average **worsens** the result compared with holding the wide LP (late signal + costs + missed rebounds); - cash/exit wins only in strong, long crashes (−28 … −41 %), whi ...

## dated-01 (dated-fact, answerable: yes)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

**Reference:** The tranche-1 USDC (6 092.50 on Base) reached the owner's wallet on 25.08 and waited in USDC per the 26.08 decision; it was put into the product on 27.08, when both FlatWide legs were minted from the bot's OPEN proposals: #5886957 WETH/USDC ±50% (~$3 507) in the afternoon and WETH/cbBTC ±40% (#5887690, ~$2 360) later that day.

Evidence now: `journal/DECYZJE-2026-08-26.md:335-348`, `journal/CONTEXT.md:97-97`, `journal/CONTEXT.md:2092-2097`, `journal/CONTEXT.md:2156-2167`, `journal/reports/morning-2026-08-29.md:184-186`.

### `docs/PLAN.md:1`

docs/PLAN.md:1-10 | no date | HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3, vector #1

> # HOMOS v2 — Project plan: Automated Liquidity Manager (ALM) > **Historical: the plan as written on 10 Aug 2026, before implementation.** What was > actually built is in the [README](../README.md) and [`CASE-STUDY.md`](CASE-STUDY.md); > a short "planned vs built" summary is in §5. > > Parameters ag ...

### `journal/HANDOFF.md:641#p3`

journal/HANDOFF.md:751-808 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 11 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid #3, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) NATYCHMIAST po pushu ping CC-Win (SendMessage): przebiegi shape + deploy (wpisy w ich skrzynce). - [Fable→CC-Mac, 01.09 ~12:xx — PACZKA „BILANS: ruch rynku zamkniętych pozycji"] Commit+push: `bot/observer.ts` (fix: marketPnl bilansu transz ...

### `journal/CONTEXT.md:4554#p3`

journal/CONTEXT.md:4638-4687 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 7 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 Konsekwencje: (a) selection+sweep dziś nie policzone — wieczorem `--only backtest` PRZED backfillem lejka (seria sweep na 26.08 bez dziury); (b) Peak RSS wciąż nieznany — fix CC-Wina loguje na ko ...

### `journal/DECYZJE-2026-08-26.md:153`

journal/DECYZJE-2026-08-26.md:153-162 | no date | 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #2, hybrid-rerank #2, vector #2

> ## 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja) Rekomendacja Fable z 19.08 w **KAPITAL-REKOMENDACJA.md**: transza 1 $6k Base (005 $2.5k + cbBTC $1.5k + $2k rezerwa), transza 2 do $12–15k po OBSERWUJ ~31.08. Do zestawienia 26.08: wyniki paper tradingu (8 dni), trafność selektora, stan tr ...

### `docs/DB-SCHEMA.md:40#p2`

docs/DB-SCHEMA.md:107-162 | no date | 2. Schema — DDL v1 (draft to be frozen at implementation)
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #2

> 2. Schema — DDL v1 (draft to be frozen at implementation) CREATE TABLE paper_event ( ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id), kind TEXT NOT NULL,                     -- OPEN|REBALANCE|EXIT_TREND|REENTRY|HEDGE_OPEN|HEDGE_CLOSE payload TEXT NOT NULL,                  -- J ...

### `docs/DB-SCHEMA.md:13`

docs/DB-SCHEMA.md:13-38 | no date | 1. Design principles (more important than the specific tables)
In top 5 of 4 run(s): hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3

> ## 1. Design principles (more important than the specific tables) 1. **SQLite, file `data/homos.db`, WAL mode** (safe concurrent reads with a single writer; backup.ps1 picks the file up automatically). 2. **Numbered migrations from day 1**: `db/migrations/NNN_name.sql` + table `schema_migrati ...

### `docs/CASE-STUDY.md:1`

docs/CASE-STUDY.md:1-3 | no date | HOMOS — case study
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2, vector #4

> # HOMOS — case study *One engineer, six weeks, ~$6k of real capital, and a question that got a clear answer.*

### `journal/TASKS-WINDOWS.md:16`

journal/TASKS-WINDOWS.md:16-57 | no date | Kroki
In top 5 of 3 run(s): hybrid-rerank-meta-1024 #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #4

> ## Kroki - [x] **1. Kod na maszynie**: repo już podpięte do sesji w `C:\Projects\homos`. - [x] **2. Środowisko**: Node v24.18.0 (nowszy niż wymagane v22.x LTS — celowo nie zainstalowano równolegle v22, v24 działa poprawnie z tym repo), `npm ci` wykonane, `npx tsx --version` OK (tsx v4.23.12). - ...

### `docs/DB-SCHEMA.md:174`

docs/DB-SCHEMA.md:174-189 | no date | 4. Planned rollout (not carried out)
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #5, hybrid-stem-prefix6 #5

> ## 4. Planned rollout (not carried out) 1. `db/migrations/001_init.sql` (the DDL above once frozen) + `scripts/db-migrate.ts` + `scripts/db-import.ts` (idempotent ndjson→SQLite import, resume from the last ts per table). 2. A `db-import` step at the end of the 07:30 pipeline + seeding the `po ...

### `journal/RESEARCH-QUEUE.md:684#p1`

journal/RESEARCH-QUEUE.md:684-727 | no date | H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #3

> H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie) - [✓ zbadane 31.08 — NIE GRAMY] **tBTC/WBTC (pegged-BTC)**: edge potwierdzony (~0.5–0.8%/r w BTC; fullperiod+walkforward+apyBase zgodne), pojemność OK ($3.3M TVL), ALE: pełna beta BTC (okres testu HODL −34%) + ogon depegu tBTC ( ...

### `docs/DB-SCHEMA.md:40#p1`

docs/DB-SCHEMA.md:40-105 | no date | 2. Schema — DDL v1 (draft to be frozen at implementation)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #4

> 2. Schema — DDL v1 (draft to be frozen at implementation) ```sql -- ===== DICTIONARIES ===== CREATE TABLE pool ( id            TEXT PRIMARY KEY,        -- botPoolId, e.g. 'base-weth-usdc-030' protocol      TEXT NOT NULL DEFAULT 'uniswap-v3', chain         TEXT NOT NULL,           -- 'mainnet' ...

### `docs/DB-SCHEMA.md:1`

docs/DB-SCHEMA.md:1-11 | no date | DB-SCHEMA.md — HOMOS database design (SQLite)
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #4

> # DB-SCHEMA.md — HOMOS database design (SQLite) > **Design document — never implemented; the ledger shipped as ndjson/json > (`bot/ledger.ts`).** None of the files below (`db/migrations/`, > `scripts/db-migrate.ts`, `scripts/db-import.ts`) exist in the repository. The design is > kept because it re ...

### `journal/HANDOFF.md:1264#p1`

journal/HANDOFF.md:1264-1320 | no date | @CC-Win (Claude Code od botów windowsowych)
In top 5 of 2 run(s): hybrid-rerank-meta #5, meta-index-hybrid-rerank #4

> @CC-Win (Claude Code od botów windowsowych) - [Fable→CC-Win, 21.09 ~19:30 — **ZAMKNIĘCIE TRANSZY 1: weryfikacja ledgera + PAUZA nocnego pipeline'u**] Kontekst: obie pozycje LP zdjęte ręcznie w Uniswap 18.09 ~14:30 UTC, 21.09 całość sprzedana do EUR — bot nie ma już czego pilnować. (1) TYLKO O ...

### `docs/DECISION-LOG.md:23`

docs/DECISION-LOG.md:23-23 | 2026-08-26 | Decision of 2026-08-26
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #5

> Decision of 2026-08-26: **Capital waits in USDC** until recalibration results; no Aave parking. Revised the same day to a *conditional entry*: enter if a pool passes the 720 d + recent-90 gate on the recalibrated runs. Evidence / rationale: Entering a narrow LP on a calibration we had just declared  ...

### `journal/CONTEXT.md:3074`

journal/CONTEXT.md:3074-3079 | 2026-08-10 | 2026-08-10 — Sesja terminalowa (Claude Code): operator gita + fetch:llama + uszczelnienie .gitignore
In top 5 of 2 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5

> ### 2026-08-10 — Sesja terminalowa (Claude Code): operator gita + fetch:llama + uszczelnienie .gitignore Ta sesja prowadzi odtąd operacje git w repo (logiczne commity zmian od innych sesji; NIE commituje `data/`, `.agent/`, `.bot/`, `backtest/results/`). - **Git**: usunięty stale `.git/index.lock`;  ...

### `journal/TASKS-UI.md:1042`

journal/TASKS-UI.md:1042-1077 | no date | PARTIA 13 — PILNA: state control modala „Otwórz pozycję" ✅ wykonana (Sonnet 27.08; zgłoszenie Rafała przy wejściu REALNY
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #3

> ## PARTIA 13 — PILNA: state control modala „Otwórz pozycję" ✅ wykonana (Sonnet 27.08; zgłoszenie Rafała przy wejściu REALNYM kapitałem) Kontekst: pierwsze otwarcie pozycji produktowej przez kokpit wymagało 3× approve, 2× zamknięcia/otwarcia modala i ręcznego korygowania kwot. Pozycja ostatecznie otw ...

### `docs/AI-WORKFLOW.md:1`

docs/AI-WORKFLOW.md:1-6 | no date | How the project was run with AI sessions
In top 5 of 1 run(s): vector #3

> # How the project was run with AI sessions HOMOS was developed by one engineer between 10 August and 22 September 2026 with four specialised Claude sessions working in parallel. This document describes the protocol, because it is the part of the project most people ask about, and because the commit ...

### `journal/DECYZJE-2026-08-26.md:490`

journal/DECYZJE-2026-08-26.md:490-501 | no date | 11b. (Nowe, 25.08 wieczór) Księga transakcji PRZED kapitałem
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #4

> ## 11b. (Nowe, 25.08 wieczór) Księga transakcji PRZED kapitałem Zamknięcie #953427 przez apkę obnażyło lukę: pozycja znika bez śladu — zero historii, podsumowania wyniku, fees, CSV. Decyzja z 10.08 ("SQLite + CSV od pierwszej transakcji") stała się wymagalna — pierwsze realne transakcje JUŻ SĄ (hed ...

### `docs/CASE-STUDY.md:141`

docs/CASE-STUDY.md:141-153 | no date | 7. Numbers, for the record
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #5

> ## 7. Numbers, for the record | Item | Value | |---|---| | Capital deployed | 6 092 USDC on Base, 27 Aug 2026 | | LP phase result (27 Aug – 18 Sep) | +0.6 % (+$38), ≈ $29 of it fees | | Narrowing experiment | 11 days, ≈ $8.6 fees, −$32 vs HODL at close | | Post-LP spot exposure (18 – 21 Sep) | ≈ +$ ...

### `journal/CONTEXT.md:4472#p2`

journal/CONTEXT.md:4512-4552 | 2026-08-24 | 2026-08-24 — Poranny brief po weekendzie (Fable) — ranking ZAMROŻONY po raz drugi (hipoteza potwierdzona, fix wdrożony),
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> 2026-08-24 — Poranny brief po weekendzie (Fable) — ranking ZAMROŻONY po raz drugi (hipoteza potwierdzona, fix wdrożony), FOMO-check paper tradingu KRAKEN: test $200 wysłany przed weekendem, jeszcze nie zaksięgowany — zgodne z SLA SWIFT 1–5 dni rob. (wysłane pt → oczekiwać wt–czw). Po zaksięgowaniu: ...

### `journal/TASKS-FUNNEL.md:10`

journal/TASKS-FUNNEL.md:10-39 | no date | 1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30)
In top 5 of 1 run(s): vector #5

> ## 1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30) Świadomie BEZ nowego automatu w Harmonogramie (lekcja 18.08: mniej ruchomych części). Nowy krok `candidate-funnel` w `scripts/pipeline.ts`, po hs-*/freshness, PRZED backtest-run (żeby OOM backtestu nie zabił lejka). 1. **Kwalifikacja* ...

## dated-02 (dated-fact, answerable: yes)

**Q:** When was the first rebalance executed on real capital?

**Reference:** On 31.08 at about 13:00 Polish time, after a failed first attempt and a UI hotfix, the first FLAT_NARROW was executed on the cbBTC/WETH leg: #5887690 (±40%) was closed and narrow #5908083 (±4.9%) minted; the second rebalance was the widening on 11.09 into #5978579 (±40%).

Evidence now: `journal/CONTEXT.md:1136-1137`, `journal/CONTEXT.md:1228-1235`, `journal/reports/morning-2026-09-01.md:205-205`, `journal/CONTEXT.md:294-296`.

### `docs/CASE-STUDY.md:44`

docs/CASE-STUDY.md:44-65 | no date | 3. What the backtests said
In top 5 of 11 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid #4, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> ## 3. What the backtests said The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen `ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days, exit on a 5 % break below the 7-day EMA. It passed the gate on one pool. The ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 11 run(s): contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, hybrid-stem-prefix6 #3, meta-index-hybrid #3, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2, vector #3

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `docs/DB-SCHEMA.md:40#p2`

docs/DB-SCHEMA.md:107-162 | no date | 2. Schema — DDL v1 (draft to be frozen at implementation)
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #1

> 2. Schema — DDL v1 (draft to be frozen at implementation) CREATE TABLE paper_event ( ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id), kind TEXT NOT NULL,                     -- OPEN|REBALANCE|EXIT_TREND|REENTRY|HEDGE_OPEN|HEDGE_CLOSE payload TEXT NOT NULL,                  -- J ...

### `journal/DECYZJE-2026-08-26.md:378`

journal/DECYZJE-2026-08-26.md:378-411 | no date | 10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozstrzygnięcia)
In top 5 of 6 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #3

> ## 10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozstrzygnięcia) Wyszło przy pytaniu Rafała, dlaczego arbitrum-weth-usdc-005 nie rebalansował. Reguła w obu miejscach jest ta sama („24h NIEPRZERWANIE poza zakresem"; jedno dotknięcie zakresu zeruje licznik — `paper.ts:261` `if (i ...

### `journal/KAPITAL-REKOMENDACJA.md:1`

journal/KAPITAL-REKOMENDACJA.md:1-13 | no date | KAPITAL-REKOMENDACJA.md — pierwsze wejście LP wg ALGORITHM v1.2
In top 5 of 5 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5, query-pl-hybrid-rerank #5

> # KAPITAL-REKOMENDACJA.md — pierwsze wejście LP wg ALGORITHM v1.2 > ⚠️ **DOKUMENT HISTORYCZNY — NIE DZIAŁAĆ WG NIEGO (znacznik 29.08).** > Opisuje wejście algorytmem v1.2 (k=3, rebalans/exit), który 26.08 nie > przeszedł bramki 720d i został zastąpiony hybrydą FlatWide (CONTEXT > 27.08). Cytowany n ...

### `journal/RESEARCH-QUEUE.md:95#p2`

journal/RESEARCH-QUEUE.md:143-188 | no date | B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)
In top 5 of 5 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5

> B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty) Bramka PLAN.md nadal nie przechodzi globalnie (ogon ~2× mniejszy, nie zerowy) → hedge F4 pozostaje frontem. Liczby: CONTEXT wpis 11.08 "CROSS-WALIDACJA". DECYZJA PROFILU → Rafał przy zamrażaniu ALGORITHM.md. Oryginalny opis  ...

### `journal/CONTEXT.md:1130#p2`

journal/CONTEXT.md:1170-1214 | 2026-08-31 | 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #2

> 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia Architektura 3-piętrowa: scoring CAŁEGO uniwersum (wide edge score = fee yield po rozcieńczeniu szerokością − drag wariancji σ²; z DefiLlama + dziennych cen, bez swap-cache) → fetch 365d dla top ~50 (z N ...

### `journal/CONTEXT.md:3473`

journal/CONTEXT.md:3473-3501 | 2026-08-18 | 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszmy i zbudujmy")
In top 5 of 4 run(s): contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #3, query-pl-hybrid-rerank #4

> ### 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszmy i zbudujmy") Nowy moduł `bot/paper.ts` — wirtualny portfel prowadzony przez ALGORITHM v1.2 na żywych danych, $10k na każdą pulę BOT_POOLS (PAPER_CAPITAL_USD env). Odpowiada na pytanie "jak algorytm zachowałby się na prawdziw ...

### `journal/HANDOFF.md:641#p3`

journal/HANDOFF.md:751-808 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #4, hybrid-rerank #4, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) NATYCHMIAST po pushu ping CC-Win (SendMessage): przebiegi shape + deploy (wpisy w ich skrzynce). - [Fable→CC-Mac, 01.09 ~12:xx — PACZKA „BILANS: ruch rynku zamkniętych pozycji"] Commit+push: `bot/observer.ts` (fix: marketPnl bilansu transz ...

### `docs/PAIRS.md:69`

docs/PAIRS.md:69-81 | no date | 3. Portfolio sketch to be validated in the backtest (capital $5–25k)
In top 5 of 2 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1

> ## 3. Portfolio sketch to be validated in the backtest (capital $5–25k) | Sleeve | Pool (main candidate) | Weight | Role | |---|---|---|---| | ETH core | ETH/USDC v3 0.3% Base | ~40% | Main fee generator, cheap gas for rebalances | | Correlated | cbBTC/ETH v3 0.05% Base | ~25% | Fees at low IL, reg ...

### `docs/DB-SCHEMA.md:174`

docs/DB-SCHEMA.md:174-189 | no date | 4. Planned rollout (not carried out)
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #5

> ## 4. Planned rollout (not carried out) 1. `db/migrations/001_init.sql` (the DDL above once frozen) + `scripts/db-migrate.ts` + `scripts/db-import.ts` (idempotent ndjson→SQLite import, resume from the last ts per table). 2. A `db-import` step at the end of the 07:30 pipeline + seeding the `po ...

### `journal/TASKS-UI.md:1042`

journal/TASKS-UI.md:1042-1077 | no date | PARTIA 13 — PILNA: state control modala „Otwórz pozycję" ✅ wykonana (Sonnet 27.08; zgłoszenie Rafała przy wejściu REALNY
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3

> ## PARTIA 13 — PILNA: state control modala „Otwórz pozycję" ✅ wykonana (Sonnet 27.08; zgłoszenie Rafała przy wejściu REALNYM kapitałem) Kontekst: pierwsze otwarcie pozycji produktowej przez kokpit wymagało 3× approve, 2× zamknięcia/otwarcia modala i ręcznego korygowania kwot. Pozycja ostatecznie otw ...

### `journal/TASKS-UI.md:225#p1`

journal/TASKS-UI.md:225-276 | no date | PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała)
In top 5 of 2 run(s): hybrid-rerank-1024 #4, hybrid-rerank-meta-1024 #5

> PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała) KONTEKST: bot prowadzi teraz PAPER TRADING (bot/paper.ts) — wirtualny portfel $10k na każdą pulę z BOT_POOLS, prowadzony przez ALGORITHM v1.2 na żywych danych (fees z trailing fee-yiel ...

### `journal/PYTANIE-SZEROKOSC-I-SIGMA.md:137`

journal/PYTANIE-SZEROKOSC-I-SIGMA.md:137-147 | no date | 7. Ograniczenia praktyczne (dla realistycznych odpowiedzi)
In top 5 of 1 run(s): vector #1

> ## 7. Ograniczenia praktyczne (dla realistycznych odpowiedzi) - Dane: wyłącznie zdarzenia Swap z łańcucha (mamy pełne roczne historie, do 12M swapów na pulę) + DefiLlama do rankingu pul. Brak księgi zleceń, brak płatnych źródeł danych. - Bot działa w cyklu 15-minutowym na maszynie Windows 24/7; ...

### `docs/PLAN.md:95`

docs/PLAN.md:95-97 | no date | 3.5. MEV and execution
In top 5 of 1 run(s): meta-index-hybrid #2

> ### 3.5. MEV and execution Rebalance = swap → the bot will be sandwiched regularly if it sends transactions through the public mempool. Required: private RPC / protected transactions, slippage limits computed from the current pool depth, deadlines. On L2 the problem is smaller than on mainnet, but  ...

### `journal/DECYZJE-2026-08-26.md:9#p1`

journal/DECYZJE-2026-08-26.md:9-53 | no date | ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fable)
In top 5 of 1 run(s): vector #2

> ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fable) Przegląd odbyty w kolejności z pkt 11a (σ → k → hUp → kapitał). Decyzje: 1. **σ (pkt 11): SIATKA 15 MIN.** Pomiar zmienności z ceny próbkowanej co 15 min (spójne z cyklem statystyk bota); 1h zostaje jako referencja dia ...

### `docs/PLAN.md:1`

docs/PLAN.md:1-10 | no date | HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
In top 5 of 1 run(s): hybrid-stem-prefix6 #4

> # HOMOS v2 — Project plan: Automated Liquidity Manager (ALM) > **Historical: the plan as written on 10 Aug 2026, before implementation.** What was > actually built is in the [README](../README.md) and [`CASE-STUDY.md`](CASE-STUDY.md); > a short "planned vs built" summary is in §5. > > Parameters ag ...

### `journal/DECYZJE-2026-08-26.md:153`

journal/DECYZJE-2026-08-26.md:153-162 | no date | 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
In top 5 of 1 run(s): vector #4

> ## 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja) Rekomendacja Fable z 19.08 w **KAPITAL-REKOMENDACJA.md**: transza 1 $6k Base (005 $2.5k + cbBTC $1.5k + $2k rezerwa), transza 2 do $12–15k po OBSERWUJ ~31.08. Do zestawienia 26.08: wyniki paper tradingu (8 dni), trafność selektora, stan tr ...

### `docs/DECISION-LOG.md:26`

docs/DECISION-LOG.md:26-26 | 2026-08-31 | Decision of 2026-08-31
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> Decision of 2026-08-31: **Sign the first narrowing proposal (cbBTC leg) as an operational experiment**, n = 1, explicitly *not* a test of the strategy; the 720-day falsification stands. Evidence / rationale: We wanted real `widthPct` / `costUsd` / `paybackDays` and a full narrow→wide cycle measured  ...

### `journal/CONTEXT.md:4165`

journal/CONTEXT.md:4165-4193 | 2026-08-21 | 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE 3 REBALANSE w paper tradingu
In top 5 of 1 run(s): vector #5

> ### 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE 3 REBALANSE w paper tradingu Źródło: `reports/morning-2026-08-21.md` (push 08:45). Żywych danych bota nie ruszę z sesji Fable — bot siedzi na Windows za LAN/VPN bez port-forwardingu, a `.bot/` w repo na Macu jest z 17.08; rap ...

## dated-03 (dated-fact, answerable: yes)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

**Reference:** On the morning of 15.09 two wide positions were open: #5886957 WETH/USDC ($3 468, PnL -$39.98 since 27.08) and #5978579 cbBTC/WETH ($2 266, PnL -$92.39 since 11.09); the tranche as a whole stood at $5 966.88, -$125.12 (-2.05%) against the $6 092 deposited.

Evidence now: `journal/reports/morning-2026-09-15.md:199-205`, `journal/reports/morning-2026-09-15.md:221-223`.

### `journal/reports/morning-2026-09-15.md:228`

journal/reports/morning-2026-09-15.md:228-238 | 2026-09-15 | PAPER TRADING (start 2026-08-18, $10000/pula)
In top 5 of 11 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid #1, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #1

> ## PAPER TRADING (start 2026-08-18, $10000/pula) | pula | status | equity | PnL | vs HODL | fees | reb | |---|---|---|---|---|---|---| | mainnet-usdc-weth-030 | open | $10680 | +$680 | $-868 | $108.14 | 1 | | mainnet-usdc-weth-005 | open | $10659 | +$659 | $-896 | $64.93 | 1 | | base-weth-usdc-030  ...

### `journal/CONTEXT.md:246`

journal/CONTEXT.md:246-275 | 2026-09-16 | 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.29% (cała beta), 2× FLAT_NARROW NIE; **REWIZJA ZASA
In top 5 of 10 run(s): contextual-haiku-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #1, meta-index-hybrid #4, meta-index-hybrid-rerank #1, vector #1

> ### 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.29% (cała beta), 2× FLAT_NARROW NIE; **REWIZJA ZASADY WYJŚCIA: exit przy bilansie ≥ 0 zamiast twardego 24.09** AUTOMAT (raporty 07:30 z 15 i 16.09): obie noce „porażki: BRAK", backtest-run ~1h18, swap-cache OK, lejek pusty, sel ...

### `journal/reports/morning-2026-09-15.md:112`

journal/reports/morning-2026-09-15.md:112-130 | 2026-09-15 | RANKING WIDE (pod produkt, top 10)
In top 5 of 6 run(s): hybrid-rerank-1024 #5, hybrid-rerank #3, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #3, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #3

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-15 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | W ...

### `journal/CONTEXT.md:277#p2`

journal/CONTEXT.md:321-366 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 5 run(s): hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #4, query-pl-hybrid-rerank #4

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu FIX (Fable, 1 linia): dedup także po `id` — odrzucona karta nie wraca tego samego dnia. Paczka: CC-Mac commit+push+ping, CC-Win pul ...

### `journal/CONTEXT.md:116#p2`

journal/CONTEXT.md:153-188 | 2026-09-21 | 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%)
In top 5 of 5 run(s): contextual-haiku-query-pl-hybrid-rerank #4, hybrid-stem-prefix6 #4, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #5, vector #5

> 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%) Dekompozycja: LP FlatWide 27.08–18.09 +$38 (fee ~$29 + beta), zakład spot 18–21.09 ≈ +$300 (ETH $2 556 → $2 756, cbBTC $80,2k → $86k). Koszty łączne wyjścia (Uniswap + Kraken + gaz) ≈ $25. Poza transzą (nie  ...

### `journal/CONTEXT.md:190#p1`

journal/CONTEXT.md:190-217 | 2026-09-18 | 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto (zakład spot z re
In top 5 of 4 run(s): contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank-1024 #4, hybrid-rerank #5, vector #3

> 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto (zakład spot z regułą), USDC → Kraken BRIEF (raport 07:30): automat czysty, bilans $5 966 (−2,06%; 16.09 −4,29% → 17.09 −3,33%), vs HODL obu nóg −$3,6, flat potwierdzony na obu, FLAT_NARROW ×2 odn ...

### `journal/reports/morning-2026-09-18.md:270`

journal/reports/morning-2026-09-18.md:270-279 | 2026-09-18 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 3 run(s): contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #4

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3466 | $-1.38 | $-41.50 (od 2026-08-27) | $26.09 | $1 ...

### `journal/CONTEXT.md:7#p1`

journal/CONTEXT.md:7-48 | no date | 1. Stan projektu — skrót
In top 5 of 3 run(s): hybrid-rerank-1024 #3, hybrid-rerank #4, vector #2

> 1. Stan projektu — skrót - **⚡ STAN NA 21.09 ~19:30 PL — TRANSZA 1 ZAMKNIĘTA W CAŁOŚCI DO EUR NA KRAKENIE. Wynik: ≈ +$336 (+5,5%) w 25 dni (27.08→21.09), z tego LP FlatWide +$38 (22 dni), zakład spot 18–21.09 ≈ +$300.** Sprzedane 21.09 ~19:00 PL: 1,22014 ETH @ 2 403,39 EUR (≈ $2 756) i 1 213, ...

### `journal/reports/morning-2026-09-15.md:67#p2`

journal/reports/morning-2026-09-15.md:84-99 | 2026-09-15 | selektor (linie z observer.log, ostatnie 30)
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #1

> selektor (linie z observer.log, ostatnie 30) → zwrot kosztu w ∞d (limit 10d) 2026-09-09T04:35:54.627Z selector: ranking dnia — eligible top5 (persyst.≥3d): WETH-USDC@Base 52.1%, WETH-CBBTC@Base 36.8%, WETH-USDC@Arbitrum 19.3%, USDC-WETH@Ethereum 18.0% 2026-09-09T04:35:54.628Z selector: rotacja nieo ...

### `docs/UI-DESIGN.md:135`

docs/UI-DESIGN.md:135-147 | no date | 7. Rotation policy: weakest position → better opportunity
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #3

> ## 7. Rotation policy: weakest position → better opportunity Positions are ranked by **realised net APR** (fees − costs, since opening and trailing 7 days). The weakest position is a candidate for closing if there is a pool where `expected_APR_new − APR_current` covers the full switching cost (exit ...

### `journal/reports/morning-2026-09-13.md:287`

journal/reports/morning-2026-09-13.md:287-297 | 2026-09-13 | PAPER TRADING (start 2026-08-18, $10000/pula)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #3

> ## PAPER TRADING (start 2026-08-18, $10000/pula) | pula | status | equity | PnL | vs HODL | fees | reb | |---|---|---|---|---|---|---| | mainnet-usdc-weth-030 | open | $10724 | +$724 | $-919 | $104.26 | 1 | | mainnet-usdc-weth-005 | open | $10719 | +$719 | $-937 | $62.51 | 1 | | base-weth-usdc-030  ...

### `journal/reports/morning-2026-09-05.md:230`

journal/reports/morning-2026-09-05.md:230-240 | 2026-09-05 | PAPER TRADING (start 2026-08-18, $10000/pula)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4

> ## PAPER TRADING (start 2026-08-18, $10000/pula) | pula | status | equity | PnL | vs HODL | fees | reb | |---|---|---|---|---|---|---| | mainnet-usdc-weth-030 | open | $10611 | +$611 | $-845 | $90.86 | 1 | | mainnet-usdc-weth-005 | open | $10590 | +$590 | $-877 | $54.12 | 1 | | base-weth-usdc-030 | ...

### `journal/CONTEXT.md:277#p4`

journal/CONTEXT.md:412-452 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 2 run(s): hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #5

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu #5908083 w positions-history mogła być zapisana PO burnie z valueUsd ≈ 0?). Zlecenie diagnostyczne u CC-Win (tylko odczyt). AKTUAL ...

### `journal/reports/morning-2026-09-20.md:256`

journal/reports/morning-2026-09-20.md:256-266 | 2026-09-20 | PAPER TRADING (start 2026-08-18, $10000/pula)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5

> ## PAPER TRADING (start 2026-08-18, $10000/pula) | pula | status | equity | PnL | vs HODL | fees | reb | |---|---|---|---|---|---|---| | mainnet-usdc-weth-030 | open | $10813 | +$813 | $-988 | $127.13 | 1 | | mainnet-usdc-weth-005 | open | $10812 | +$812 | $-985 | $75.29 | 1 | | base-weth-usdc-030  ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #5

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `journal/reports/morning-2026-09-15.md:101`

journal/reports/morning-2026-09-15.md:101-104 | 2026-09-15 | propozycje OPEN (0)
In top 5 of 1 run(s): meta-index-hybrid #2

> ## propozycje OPEN (0) ```json [] ```

### `journal/CONTEXT.md:500`

journal/CONTEXT.md:500-546 | 2026-09-09 | 2026-09-09 ~popołudnie — ODBIÓR E8.2e (CC-Win): fix dryfu DZIAŁA, ale odsłonił drugi błąd (próbki na granicy dnia → ~20–
In top 5 of 1 run(s): hybrid-stem-prefix6 #3

> ### 2026-09-09 ~popołudnie — ODBIÓR E8.2e (CC-Win): fix dryfu DZIAŁA, ale odsłonił drugi błąd (próbki na granicy dnia → ~20–30% dni ginie); JLP po 3 czynnikach α ≈ +22%/r, ale EDGE GAŚNIE 2024→2026; werdykt klasy „dom kasyna" na 24.09 wstępnie sformułowany Odbiór raportu CC-Win (f254fb1 fix+dane, af ...

### `journal/DECYZJE-2026-08-26.md:490`

journal/DECYZJE-2026-08-26.md:490-501 | no date | 11b. (Nowe, 25.08 wieczór) Księga transakcji PRZED kapitałem
In top 5 of 1 run(s): vector #4

> ## 11b. (Nowe, 25.08 wieczór) Księga transakcji PRZED kapitałem Zamknięcie #953427 przez apkę obnażyło lukę: pozycja znika bez śladu — zero historii, podsumowania wyniku, fees, CSV. Decyzja z 10.08 ("SQLite + CSV od pierwszej transakcji") stała się wymagalna — pierwsze realne transakcje JUŻ SĄ (hed ...

### `journal/reports/morning-2026-09-11.md:101`

journal/reports/morning-2026-09-11.md:101-138 | 2026-09-11 | propozycje OPEN (2)
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #5

> ## propozycje OPEN (2) ```json [ { "id": "open-49717ee2-9808-4288-b76d-e658195b7979", "createdAt": "2026-09-09T04:35:54.627Z", "kind": "OPEN", "action": "OTWÓRZ USDC-WETH 0.3% @ Ethereum (7d śr. 18.0% APR, w topie 3d)", "tokenId": "", "poolId": "mainnet-usdc-weth-030",  ...

### `journal/reports/morning-2026-09-16.md:237`

journal/reports/morning-2026-09-16.md:237-246 | 2026-09-16 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #5

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3404 | $-8.02 | $-103.95 (od 2026-08-27) | $22.13 | $ ...

## dated-04 (dated-fact, answerable: yes)

**Q:** When did the last backtest finish?

**Reference:** It depends on the meaning: the nightly pipeline's backtest-run last finished on 23.09 at 05:03 UTC (a pause was ordered on 21.09 for 22.09, with no record that it was carried out), the last research backtest was E8.3 (720 days, four pools) received on 08.09, and the last 720-day runs on the product were the shape round of 03.09 and E8.3 of 08.09.

Evidence now: `journal/reports/morning-2026-09-23.md:42-48`, `journal/CONTEXT.md:177-179`, `journal/CONTEXT.md:19-20`, `journal/CONTEXT.md:621-622`, `journal/CONTEXT.md:774-778`.

### `journal/reports/morning-2026-08-20.md:51`

journal/reports/morning-2026-08-20.md:51-65 | 2026-08-20 | pipeline-task.log (tail)
In top 5 of 8 run(s): hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #4, hybrid-stem-prefix6 #3, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4, vector #4

> ## pipeline-task.log (tail) ``` 2026-08-20T05:49:03.979Z świeżość swap cache: OK=[arbitrum-usdc-usdt-001, arbitrum-weth-usdc-005-365d, arbitrum-weth-usdc-030-365d, base-cbbtc-weth-005-365d, base-weth-usdc-005-365d, base-weth-usdc-005, base-weth-usdc-030-365d, mainnet-dai-usdt-001, mainnet-tbtc-wbtc- ...

### `journal/reports/morning-2026-08-26.md:7#p2`

journal/reports/morning-2026-08-26.md:31-49 | 2026-08-26 | pipeline.log (ostatni przebieg)
In top 5 of 8 run(s): hybrid-rerank-1024 #5, hybrid-rerank #4, hybrid-rerank-meta #1, hybrid-stem-prefix6 #4, meta-index-hybrid #2, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #2

> pipeline.log (ostatni przebieg) (podejście 1/2) 2026-08-26T03:43:00.303Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1787715776129.log) 2026-08-26T03:43:00.303Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-26T03:43:03.335Z krok hs-bas ...

### `journal/reports/morning-2026-08-20.md:7#p2`

journal/reports/morning-2026-08-20.md:30-49 | 2026-08-20 | pipeline.log (ostatni przebieg)
In top 5 of 8 run(s): hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid #5, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2, vector #5

> pipeline.log (ostatni przebieg) data\pipeline-logs\hs-optimism-weth-usdc-030-365d-1787204457818.log) 2026-08-20T05:40:59.205Z ▶ hs-arbitrum-weth-usdc-030-365d (podejście 1/2) 2026-08-20T05:41:00.379Z krok hs-arbitrum-weth-usdc-030-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-030-365d ...

### `journal/reports/morning-2026-08-22.md:7#p2`

journal/reports/morning-2026-08-22.md:31-49 | 2026-08-22 | pipeline.log (ostatni przebieg)
In top 5 of 6 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> pipeline.log (ostatni przebieg) hs-arbitrum-weth-usdc-005-365d (podejście 1/2) 2026-08-22T05:31:59.301Z krok hs-arbitrum-weth-usdc-005-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-365d-1787376715748.log) 2026-08-22T05:31:59.302Z ▶ hs-optimism-weth-usdc-030-365d (podejście 1/2) 20 ...

### `journal/reports/morning-2026-09-05.md:7#p2`

journal/reports/morning-2026-09-05.md:32-49 | 2026-09-05 | pipeline.log (ostatni przebieg)
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1

> pipeline.log (ostatni przebieg) 2026-09-05T03:42:57.354Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1788579774629.log) 2026-09-05T03:42:57.355Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-05T03:43:00.490Z krok hs-base-cbbtc-weth-005 ...

### `journal/reports/morning-2026-08-21.md:7#p2`

journal/reports/morning-2026-08-21.md:31-49 | 2026-08-21 | pipeline.log (ostatni przebieg)
In top 5 of 3 run(s): contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank #3

> pipeline.log (ostatni przebieg) hs-arbitrum-weth-usdc-005-365d (podejście 1/2) 2026-08-21T05:30:36.984Z krok hs-arbitrum-weth-usdc-005-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-365d-1787290235729.log) 2026-08-21T05:30:36.984Z ▶ hs-optimism-weth-usdc-030-365d (podejście 1/2) 20 ...

### `journal/HANDOFF.md:641#p12`

journal/HANDOFF.md:1252-1262 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 3 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1, vector #1

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) Komunikat: "feat(backtest): final round — flatOnly-HODL + wide-passive family". Po pushu ping CC-Win. - [Fable→CC-Mac, 26.08 ~15:xx — PACZKA #3] Commit+push: backtest/run.ts (wykluczenie `cand-*` z dziennego skanu cache — odpowiedź na incy ...

### `journal/reports/morning-2026-08-26.md:51`

journal/reports/morning-2026-08-26.md:51-65 | 2026-08-26 | pipeline-task.log (tail)
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #3, vector #3

> ## pipeline-task.log (tail) ``` 2026-08-26T05:00:35.376Z krok backtest-run: exit 1 (log: data\pipeline-logs\backtest-run-1787718316808.log) 2026-08-26T05:00:35.376Z ✗✗ backtest-run nieudany po 2 podejściach — pomijam, lecę dalej 2026-08-26T05:00:35.376Z ▶ backtest-selection (podejście 1/2) 2026-08-2 ...

### `journal/reports/morning-2026-09-16.md:51`

journal/reports/morning-2026-09-16.md:51-65 | 2026-09-16 | pipeline-task.log (tail)
In top 5 of 3 run(s): contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-stem-prefix6 #5

> ## pipeline-task.log (tail) ``` 2026-09-16T03:43:14.484Z ▶ backtest-run (podejście 1/2) 2026-09-16T05:01:08.589Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1789530194484.log) 2026-09-16T05:01:08.590Z ▶ backtest-selection (podejście 1/2) 2026-09-16T05:01:13.556Z krok backtest-sel ...

### `journal/reports/morning-2026-08-31.md:51`

journal/reports/morning-2026-08-31.md:51-65 | 2026-08-31 | pipeline-task.log (tail)
In top 5 of 3 run(s): hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5

> ## pipeline-task.log (tail) ``` 2026-08-31T03:42:28.691Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-31T03:42:31.787Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1788147748691.log) 2026-08-31T03:42:31.790Z świeżość swap cache: OK=[arbitrum- ...

### `journal/reports/morning-2026-08-25.md:51`

journal/reports/morning-2026-08-25.md:51-65 | 2026-08-25 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1

> ## pipeline-task.log (tail) ``` 2026-08-25T05:42:12.410Z krok hs-arbitrum-weth-usdc-005-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-365d-1787636529290.log) 2026-08-25T05:42:12.410Z ▶ hs-optimism-weth-usdc-030-365d (podejście 1/2) 2026-08-25T05:42:14.403Z krok hs-optimism-weth-usd ...

### `journal/reports/morning-2026-09-16.md:7#p2`

journal/reports/morning-2026-09-16.md:32-49 | 2026-09-16 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2

> pipeline.log (ostatni przebieg) 2026-09-16T03:42:43.821Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789530158846.log) 2026-09-16T03:42:43.822Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-16T03:42:46.705Z krok hs-base-cbbtc-weth-005 ...

### `journal/reports/morning-2026-08-25.md:7#p2`

journal/reports/morning-2026-08-25.md:31-49 | 2026-08-25 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2

> pipeline.log (ostatni przebieg) hs-mainnet-wsteth-weth-001 (podejście 1/2) 2026-08-25T05:42:05.264Z krok hs-mainnet-wsteth-weth-001: exit 0 (log: data\pipeline-logs\hs-mainnet-wsteth-weth-001-1787636523286.log) 2026-08-25T05:42:05.265Z ▶ hs-mainnet-tbtc-wbtc-001 (podejście 1/2) 2026-08-25T05:42:07. ...

### `journal/reports/morning-2026-08-22.md:51`

journal/reports/morning-2026-08-22.md:51-65 | 2026-08-22 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2

> ## pipeline-task.log (tail) ``` 2026-08-22T05:32:04.313Z ▶ hs-mainnet-weth-usdt-001-365d (podejście 1/2) 2026-08-22T05:32:06.794Z krok hs-mainnet-weth-usdt-001-365d: exit 0 (log: data\pipeline-logs\hs-mainnet-weth-usdt-001-365d-1787376724313.log) 2026-08-22T05:32:06.794Z ▶ hs-mainnet-usdc-weth-001-3 ...

### `journal/reports/morning-2026-08-21.md:51`

journal/reports/morning-2026-08-21.md:51-65 | 2026-08-21 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #3

> ## pipeline-task.log (tail) ``` 2026-08-21T05:30:39.576Z ▶ hs-mainnet-weth-usdt-001-365d (podejście 1/2) 2026-08-21T05:30:40.856Z krok hs-mainnet-weth-usdt-001-365d: exit 0 (log: data\pipeline-logs\hs-mainnet-weth-usdt-001-365d-1787290239576.log) 2026-08-21T05:30:40.856Z ▶ hs-mainnet-usdc-weth-001-3 ...

### `journal/reports/morning-2026-08-24.md:7#p1`

journal/reports/morning-2026-08-24.md:7-31 | 2026-08-24 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3

> pipeline.log (ostatni przebieg) ``` 2026-08-24T05:30:32.545Z ▶ hs-base-cbbtc-weth-005-365d (podejście 1/2) 2026-08-24T05:30:35.896Z krok hs-base-cbbtc-weth-005-365d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-365d-1787549432545.log) 2026-08-24T05:30:35.896Z ▶ hs-mainnet-wtao-weth-100 (p ...

### `journal/reports/morning-2026-08-29.md:51`

journal/reports/morning-2026-08-29.md:51-65 | 2026-08-29 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3

> ## pipeline-task.log (tail) ``` 2026-08-29T03:42:47.622Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-29T03:42:54.415Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1787974967623.log) 2026-08-29T03:42:54.418Z świeżość swap cache: OK=[arbitrum- ...

### `journal/reports/morning-2026-09-15.md:7#p2`

journal/reports/morning-2026-09-15.md:32-49 | 2026-09-15 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4

> pipeline.log (ostatni przebieg) 2026-09-15T03:44:00.556Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789443815362.log) 2026-09-15T03:44:00.557Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-15T03:44:21.726Z krok hs-base-cbbtc-weth-005 ...

### `journal/reports/morning-2026-09-21.md:7#p2`

journal/reports/morning-2026-09-21.md:31-49 | 2026-09-21 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #5

> pipeline.log (ostatni przebieg) (podejście 1/2) 2026-09-21T03:44:28.014Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789962261977.log) 2026-09-21T03:44:28.015Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-21T03:44:31.960Z krok hs-bas ...

### `journal/reports/morning-2026-08-23.md:51`

journal/reports/morning-2026-08-23.md:51-65 | 2026-08-23 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5

> ## pipeline-task.log (tail) ``` 2026-08-23T05:41:53.531Z ▶ hs-mainnet-weth-usdt-001-365d (podejście 1/2) 2026-08-23T05:41:55.751Z krok hs-mainnet-weth-usdt-001-365d: exit 0 (log: data\pipeline-logs\hs-mainnet-weth-usdt-001-365d-1787463713531.log) 2026-08-23T05:41:55.751Z ▶ hs-mainnet-usdc-weth-001-3 ...

### `journal/reports/morning-2026-08-27.md:51`

journal/reports/morning-2026-08-27.md:51-65 | 2026-08-27 | pipeline-task.log (tail)
In top 5 of 1 run(s): hybrid-rerank-1024 #3

> ## pipeline-task.log (tail) ``` 2026-08-27T03:43:25.042Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-27T03:43:28.523Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1787802205042.log) 2026-08-27T03:43:28.525Z świeżość swap cache: OK=[arbitrum- ...

### `journal/reports/morning-2026-09-20.md:7#p2`

journal/reports/morning-2026-09-20.md:31-49 | 2026-09-20 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): hybrid-rerank-1024 #4

> pipeline.log (ostatni przebieg) data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789875749814.log) 2026-09-20T03:42:31.960Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-20T03:43:05.165Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-17898757 ...

### `journal/reports/morning-2026-09-19.md:7#p2`

journal/reports/morning-2026-09-19.md:31-49 | 2026-09-19 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): hybrid-rerank-meta-1024 #4

> pipeline.log (ostatni przebieg) data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789789348221.log) 2026-09-19T03:43:05.568Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-19T03:43:12.569Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-17897893 ...

### `journal/reports/morning-2026-09-02.md:51`

journal/reports/morning-2026-09-02.md:51-65 | 2026-09-02 | pipeline-task.log (tail)
In top 5 of 1 run(s): meta-index-hybrid #4

> ## pipeline-task.log (tail) ``` 2026-09-02T03:42:37.854Z ▶ backtest-run (podejście 1/2) 2026-09-02T05:11:35.986Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1788320557854.log) 2026-09-02T05:11:35.986Z ▶ backtest-selection (podejście 1/2) 2026-09-02T05:11:41.017Z krok backtest-sel ...

### `journal/reports/morning-2026-09-02.md:7#p2`

journal/reports/morning-2026-09-02.md:32-49 | 2026-09-02 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-haiku-run2-hybrid-rerank #5

> pipeline.log (ostatni przebieg) data\pipeline-logs\hs-mainnet-usdc-weth-005-720d-1788320544115.log) 2026-09-02T03:42:28.527Z ▶ hs-mainnet-usdc-weth-030-720d (podejście 1/2) 2026-09-02T03:42:30.146Z krok hs-mainnet-usdc-weth-030-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-030-720d-178 ...

### `journal/reports/morning-2026-08-23.md:7#p2`

journal/reports/morning-2026-08-23.md:31-49 | 2026-08-23 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> pipeline.log (ostatni przebieg) hs-arbitrum-weth-usdc-005-365d (podejście 1/2) 2026-08-23T05:41:49.611Z krok hs-arbitrum-weth-usdc-005-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-365d-1787463707128.log) 2026-08-23T05:41:49.612Z ▶ hs-optimism-weth-usdc-030-365d (podejście 1/2) 20 ...

## dated-05 (dated-fact, answerable: yes)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

**Reference:** Only tests: after hedge-excess (a perp short on the excess ETH) passed the backtest gate and became v1.2 on 17.08, a $150 1x ETH short was opened on GMX on 17.08 ~16:00 and closed 18.08 ~10:00 (round-trip cost ~$1.08, ~72 bps, protecting no real position), a $15 end-to-end test through the app followed on 20.08 (~$0.40), and on 11.09 a $1 824 BTC short on GMX was rejected as an emergency option.

Evidence now: `journal/CONTEXT.md:91-91`, `journal/CONTEXT.md:3585-3586`, `journal/CONTEXT.md:3533-3534`, `journal/CONTEXT.md:3542-3543`, `journal/CONTEXT.md:2410-2415`, `journal/CONTEXT.md:281-282`.

### `journal/TASKS-UI.md:592#p2`

journal/TASKS-UI.md:640-681 | no date | PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08)
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08) `stateBands()` uodporniona na brak `status` (realne pozycje: cieniowanie tylko po `!inRange`, nigdy "cash" — tego stanu tam nie ma). `PaperTradingPanel.tsx` zaktualizowany, żeby importować z nowe ...

### `journal/TASKS-UI.md:592#p1`

journal/TASKS-UI.md:592-640 | no date | PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08)
In top 5 of 9 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #3, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #4

> PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08) KONTEKST: karty pozycji w kokpicie mają wyglądać jak karty paper tradingu (dwa wykresy: equity vs HODL + cena vs zakres), akcje przenoszą się do hamburgera. Backend GOTOWY (Fable): observer zapisuje co 5 min ...

### `docs/DB-SCHEMA.md:40#p2`

docs/DB-SCHEMA.md:107-162 | no date | 2. Schema — DDL v1 (draft to be frozen at implementation)
In top 5 of 8 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #4, hybrid-rerank-1024 #5, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4

> 2. Schema — DDL v1 (draft to be frozen at implementation) CREATE TABLE paper_event ( ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id), kind TEXT NOT NULL,                     -- OPEN|REBALANCE|EXIT_TREND|REENTRY|HEDGE_OPEN|HEDGE_CLOSE payload TEXT NOT NULL,                  -- J ...

### `journal/CONTEXT.md:2713`

journal/CONTEXT.md:2713-2761 | 2026-08-10 | 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 2 fixy z odbioru P3
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #4, hybrid-rerank-1024 #4, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, hybrid-stem-prefix6 #4, meta-index-hybrid-rerank #5

> ### 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 2 fixy z odbioru P3 Wykonana cała Partia 4 z TASKS-UI.md (4 pozycje, wszystkie odhaczone). Przed implementacją przeczytane na świeżo (nie na podstawie streszczenia w tym pliku): `bot/observer.ts` (rozszerzony `interface Propos ...

### `journal/TASKS-UI.md:773`

journal/TASKS-UI.md:773-802 | no date | Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): ikony stanu pozycji
In top 5 of 5 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank #5, vector #2

> ## Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): ikony stanu pozycji Zgłoszenie Rafała: „teraz jest cały czas zielona kropka nawet dla wypadniętych" — pozycja poza zakresem nie zarabia opłat, a wyglądała identycznie jak zdrowa. - [x] `PaperTradingPanel.tsx`: `statusIcon(status, ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 5 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `journal/TASKS-UI.md:1000`

journal/TASKS-UI.md:1000-1040 | no date | FIX (25.08 wieczór): UX sekwencji [⏹ Zamknij] + toast na złej karcie
In top 5 of 3 run(s): contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #5

> ## FIX (25.08 wieczór): UX sekwencji [⏹ Zamknij] + toast na złej karcie (zgłoszenie Rafała po 1. bojowym zamknięciu pozycji #953427 przez apkę — SUKCES, ale "na ślepo") **Problem 1:** `CloseModal` pokazywał tylko "Przetwarzanie…" przez ~30s między 2 podpisami w Rabby (decrease → collect) — brak wid ...

### `journal/CONTEXT.md:116#p2`

journal/CONTEXT.md:153-188 | 2026-09-21 | 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%)
In top 5 of 3 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #1, query-pl-hybrid-rerank #2

> 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%) Dekompozycja: LP FlatWide 27.08–18.09 +$38 (fee ~$29 + beta), zakład spot 18–21.09 ≈ +$300 (ETH $2 556 → $2 756, cbBTC $80,2k → $86k). Koszty łączne wyjścia (Uniswap + Kraken + gaz) ≈ $25. Poza transzą (nie  ...

### `docs/EMERGENCY.md:81`

docs/EMERGENCY.md:81-86 | no date | 5. What this document does not cover
In top 5 of 3 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #2, vector #5

> ## 5. What this document does not cover FLAT_NARROW / FLAT_WIDEN (narrowing and widening within the product) are not emergency procedures; they are the normal FlatWide cycle. FLAT_WIDEN is protective (a narrow position in a trend accumulates IL), but it is signed through the normal proposal flow, n ...

### `journal/CONTEXT.md:277#p3`

journal/CONTEXT.md:366-411 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 3 run(s): contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #3, query-pl-hybrid-rerank #5

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu PRZYCZYNA: przed fixem 48df567 bot nabił w `proposals.json` kilka kopii tej samej karty pod jednym id; handler dismiss (`applyPropo ...

### `journal/CONTEXT.md:277#p4`

journal/CONTEXT.md:412-452 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 2 run(s): contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu #5908083 w positions-history mogła być zapisana PO burnie z valueUsd ≈ 0?). Zlecenie diagnostyczne u CC-Win (tylko odczyt). AKTUAL ...

### `docs/PLAN.md:99`

docs/PLAN.md:99-106 | no date | 3.6. The rebalance policy is richer than "went out of range → move it"
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #1

> ### 3.6. The rebalance policy is richer than "went out of range → move it" Gaps in the proposed profitability condition: - **Hysteresis / buffer zones**: rebalance only when the price exceeds the range by X% or stays outside it for T minutes (protection against whipsaw), - **Market regime filter**: ...

### `journal/CONTEXT.md:277#p2`

journal/CONTEXT.md:321-366 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #3

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu FIX (Fable, 1 linia): dedup także po `id` — odrzucona karta nie wraca tego samego dnia. Paczka: CC-Mac commit+push+ping, CC-Win pul ...

### `journal/HANDOFF.md:254#p3`

journal/HANDOFF.md:351-397 | no date | @Sonnet (sesja UI, Cowork)
In top 5 of 2 run(s): contextual-haiku-query-pl-hybrid-rerank #5, query-pl-hybrid-rerank #3

> @Sonnet (sesja UI, Cowork) tsc czysty (poza preexisting observer:43 viem/ox — niezmienione), `npm run build` przechodzi (tylko preexisting size-limit warnings). Zastałem na dysku NIEODEBRANĄ paczkę bot-side ("cykl w state") już wypełnioną w useBotApi.ts/bot/observer.ts — dopisałem tylko bra ...

### `docs/PLAN.md:37`

docs/PLAN.md:37-51 | no date | 2.2. A hand-written "PositionLike" instead of the SDK (`liquidityManagement.ts:createPosition`)
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3

> ### 2.2. A hand-written "PositionLike" instead of the SDK (`liquidityManagement.ts:createPosition`) The biggest problem. The code creates its own position object and computes liquidity with the formula: ```ts const liquidityValue = Number(parsedAmount1) / (sqrtUpperPrice - sqrtLowerPrice); // BUG  ...

### `docs/UI-DESIGN.md:135`

docs/UI-DESIGN.md:135-147 | no date | 7. Rotation policy: weakest position → better opportunity
In top 5 of 2 run(s): meta-index-hybrid #5, vector #3

> ## 7. Rotation policy: weakest position → better opportunity Positions are ranked by **realised net APR** (fees − costs, since opening and trailing 7 days). The weakest position is a candidate for closing if there is a pool where `expected_APR_new − APR_current` covers the full switching cost (exit ...

### `journal/TASKS-UI.md:126#p2`

journal/TASKS-UI.md:155-181 | no date | PARTIA 4 — Karty propozycji: Zatwierdź / Modyfikuj / Odrzuć (+2 fixy z odbioru P3)
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #4

> PARTIA 4 — Karty propozycji: Zatwierdź / Modyfikuj / Odrzuć (+2 fixy z odbioru P3) - Architektura: `RebalanceTarget` (nowy, węższy interfejs w useCockpitActions.ts) zamiast pełnego `PortfolioPosition` jako typ propsa `position` w `RebalanceModal`/`openPositionAtRange`/`readBalanceAndAllowan ...

### `docs/AI-WORKFLOW.md:71`

docs/AI-WORKFLOW.md:71-79 | no date | What worked
In top 5 of 1 run(s): vector #1

> ## What worked - Narrow roles with explicit file ownership. The UI session never touched `bot/`; the server session never made parameter decisions. - A journal that a fresh session could read from the top and be productive in minutes. - Written pushback. The analysis session recorded its disagree ...

### `docs/DECISION-LOG.md:22`

docs/DECISION-LOG.md:22-22 | 2026-08-26 | Decision of 2026-08-26
In top 5 of 1 run(s): vector #4

> Decision of 2026-08-26: **Validation gate = 720-day window + a recent ~90-day condition** (instead of 365 d). Evidence / rationale: The 365-day year (sideways-to-down) flattered the strategy; on 720 d **0 of 21 configurations** passed. The recent condition prevents old turbulence from disqualifying  ...

### `journal/reports/morning-2026-09-10.md:251`

journal/reports/morning-2026-09-10.md:251-260 | 2026-09-10 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #5

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3459 | $-1.86 | $-48.43 (od 2026-08-27) | $13.95 | $1 ...

## dated-06 (dated-fact, answerable: yes)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

**Reference:** The first genuinely clean night was 22.08 (all 20 pools fetched by the automation, backtest-run exit 0); before it 19.08 failed on a missing HyperSync binary for Windows (pinned to 1.0.0), 20.08 had clean fetches but backtest-run ran out of memory (heap raised to 8 GB), and 21.08 reported no failures while the swap fetch was silently dead (frozen 'latest', fixed in fetch-swaps-hypersync.ts); later the ranking froze on 24.08 (data-age heuristic fixed), backtest-run failed on 26.08 (Math.min/max over millions of points, fixed in 0257a7a), ran long on 03.09 (cache filter fixed) and candidate-funnel failed on 19-20.09 with no recorded cause.

Evidence now: `journal/CONTEXT.md:4417-4420`, `journal/reports/morning-2026-08-20.md:48-48`, `journal/CONTEXT.md:2353-2357`, `journal/CONTEXT.md:4093-4096`, `journal/reports/morning-2026-08-19.md:26-26`, `journal/CONTEXT.md:2540-2544`, `journal/reports/morning-2026-08-26.md:48-48`, `journal/CONTEXT.md:2331-2339`, `journal/CONTEXT.md:757-761`, `journal/reports/morning-2026-09-19.md:40-40`.

### `journal/reports/morning-2026-09-01.md:51`

journal/reports/morning-2026-09-01.md:51-65 | 2026-09-01 | pipeline-task.log (tail)
In top 5 of 5 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1

> ## pipeline-task.log (tail) ``` 2026-09-01T03:42:47.724Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-01T03:42:53.545Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1788234167724.log) 2026-09-01T03:42:53.547Z świeżość swap cache: OK=[arbitrum- ...

### `docs/INFRA.md:8`

docs/INFRA.md:8-36 | no date | 1. Architecture (as built)
In top 5 of 5 run(s): hybrid-rerank-1024 #3, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #3

> ## 1. Architecture (as built) ``` ┌────────────────────────── WINDOWS (server, 24/7) ──────────────────────────┐ │  NSSM service homos-bot      bot/observer.ts — prices, signals, proposals  │ │  NSSM service homos-server   bot/server.ts — REST API + static UI (public/)│ │  Task Scheduler            ...

### `docs/AI-WORKFLOW.md:25`

docs/AI-WORKFLOW.md:25-55 | no date | The two coordination files
In top 5 of 5 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #4

> ## The two coordination files Sessions cannot see each other. They coordinated through the repository: - **`CONTEXT.md` — the living journal.** Section 1: the current state, newest first. Section 2: the decision table (translated in `DECISION-LOG.md`). Section 4: a dated log of every session —  ...

### `journal/HANDOFF.md:641#p1`

journal/HANDOFF.md:641-699 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 4 run(s): hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) > Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów; > gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź > dalej. Decyzje analityczne/parametryczne zostają u Fable. (Paczki #1 i #2 wypchnięte — b5a6131, d ...

### `journal/reports/morning-2026-08-24.md:51`

journal/reports/morning-2026-08-24.md:51-65 | 2026-08-24 | pipeline-task.log (tail)
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #5

> ## pipeline-task.log (tail) ``` 2026-08-24T05:31:06.377Z ▶ hs-mainnet-weth-usdt-001-365d (podejście 1/2) 2026-08-24T05:31:09.854Z krok hs-mainnet-weth-usdt-001-365d: exit 0 (log: data\pipeline-logs\hs-mainnet-weth-usdt-001-365d-1787549466377.log) 2026-08-24T05:31:09.855Z ▶ hs-mainnet-usdc-weth-001-3 ...

### `journal/reports/morning-2026-08-29.md:51`

journal/reports/morning-2026-08-29.md:51-65 | 2026-08-29 | pipeline-task.log (tail)
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2

> ## pipeline-task.log (tail) ``` 2026-08-29T03:42:47.622Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-29T03:42:54.415Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1787974967623.log) 2026-08-29T03:42:54.418Z świeżość swap cache: OK=[arbitrum- ...

### `journal/CONTEXT.md:4411#p2`

journal/CONTEXT.md:4442-4470 | 2026-08-22 | 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #3, query-pl-hybrid-rerank #2

> 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE **NOWA OBSERWACJA do sprawdzenia:** cbBTC ma dziś status `cash ⛔`, ale equity urosło $11 079 → $11 357 — a w cash equity powinno stać w miejscu. Wczoraj ~11:10 było `REENTRY`. Wygląda na MIGOTANIE bezpi ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 3 run(s): hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #2

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

### `journal/reports/morning-2026-08-30.md:51`

journal/reports/morning-2026-08-30.md:51-65 | 2026-08-30 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1

> ## pipeline-task.log (tail) ``` 2026-08-30T03:42:41.863Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-30T03:42:44.669Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1788061361863.log) 2026-08-30T03:42:44.672Z świeżość swap cache: OK=[arbitrum- ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 2 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `docs/CASE-STUDY.md:44`

docs/CASE-STUDY.md:44-65 | no date | 3. What the backtests said
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2

> ## 3. What the backtests said The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen `ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days, exit on a 5 % break below the 7-day EMA. It passed the gate on one pool. The ...

### `journal/reports/morning-2026-08-21.md:51`

journal/reports/morning-2026-08-21.md:51-65 | 2026-08-21 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3

> ## pipeline-task.log (tail) ``` 2026-08-21T05:30:39.576Z ▶ hs-mainnet-weth-usdt-001-365d (podejście 1/2) 2026-08-21T05:30:40.856Z krok hs-mainnet-weth-usdt-001-365d: exit 0 (log: data\pipeline-logs\hs-mainnet-weth-usdt-001-365d-1787290239576.log) 2026-08-21T05:30:40.856Z ▶ hs-mainnet-usdc-weth-001-3 ...

### `journal/CONTEXT.md:3971`

journal/CONTEXT.md:3971-4011 | 2026-08-12 | 2026-08-12 07:50 — Sesja Fable-desktop (poranny brief): INTERPRETACJA NOCNEJ PARTII db2e3e5 (walkforwardy 60/15 + arbitr
In top 5 of 2 run(s): hybrid-rerank-1024 #4, hybrid-rerank #3

> ### 2026-08-12 07:50 — Sesja Fable-desktop (poranny brief): INTERPRETACJA NOCNEJ PARTII db2e3e5 (walkforwardy 60/15 + arbitrum-030) Rutyna: health 192.168.1.8:8787 nieosiągalny z sandboksa (brak trasy do LAN — to NIE jest diagnoza serwera); brak nowych commitów runnera i plików w done/ po 11.08 wiec ...

### `journal/CONTEXT.md:4554#p4`

journal/CONTEXT.md:4687-4736 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 FIX (Fable, tsc czysty): backfill dużych luk przez **HyperSync** (ta sama infra i token co swap-cache; 2 fazy — transfery/odkrycie tokenIdów, potem zdarzenia płynności; timestampy bloków od ręki) ...

### `journal/reports/morning-2026-08-31.md:51`

journal/reports/morning-2026-08-31.md:51-65 | 2026-08-31 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4

> ## pipeline-task.log (tail) ``` 2026-08-31T03:42:28.691Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-31T03:42:31.787Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1788147748691.log) 2026-08-31T03:42:31.790Z świeżość swap cache: OK=[arbitrum- ...

### `docs/DECISION-LOG.md:26`

docs/DECISION-LOG.md:26-26 | 2026-08-31 | Decision of 2026-08-31
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #4

> Decision of 2026-08-31: **Sign the first narrowing proposal (cbBTC leg) as an operational experiment**, n = 1, explicitly *not* a test of the strategy; the 720-day falsification stands. Evidence / rationale: We wanted real `widthPct` / `costUsd` / `paybackDays` and a full narrow→wide cycle measured  ...

### `journal/RESEARCH-QUEUE.md:367#p2`

journal/RESEARCH-QUEUE.md:405-443 | no date | E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISANY, tsc czysty, arytmetyka przetestowana na syntet
In top 5 of 2 run(s): meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #4

> E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISANY, tsc czysty, arytmetyka przetestowana na syntetyku w sandboxie; fetch'e sieciowe NIE testowane — sandbox bez sieci, pierwszy run u CC-Mac jest testem) Potem `npm run e8:vault -- gm arbitrum:<addr> GM-ETH-USD` (i BTC). Jeśli ...

### `journal/reports/morning-2026-08-24.md:7#p1`

journal/reports/morning-2026-08-24.md:7-31 | 2026-08-24 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #2

> pipeline.log (ostatni przebieg) ``` 2026-08-24T05:30:32.545Z ▶ hs-base-cbbtc-weth-005-365d (podejście 1/2) 2026-08-24T05:30:35.896Z krok hs-base-cbbtc-weth-005-365d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-365d-1787549432545.log) 2026-08-24T05:30:35.896Z ▶ hs-mainnet-wtao-weth-100 (p ...

### `journal/reports/morning-2026-08-28.md:51`

journal/reports/morning-2026-08-28.md:51-65 | 2026-08-28 | pipeline-task.log (tail)
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #2

> ## pipeline-task.log (tail) ``` 2026-08-28T03:46:49.417Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-28T03:46:57.687Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1787888809417.log) 2026-08-28T03:46:57.690Z świeżość swap cache: OK=[arbitrum- ...

### `journal/reports/morning-2026-09-02.md:7#p1`

journal/reports/morning-2026-09-02.md:7-32 | 2026-09-02 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #3

> pipeline.log (ostatni przebieg) ``` 2026-09-02T03:41:57.990Z ▶ hs-arbitrum-usdc-usdt-001 (podejście 1/2) 2026-09-02T03:41:59.656Z krok hs-arbitrum-usdc-usdt-001: exit 0 (log: data\pipeline-logs\hs-arbitrum-usdc-usdt-001-1788320517990.log) 2026-09-02T03:41:59.656Z ▶ hs-mainnet-usdc-usdt-001 (podejśc ...

### `journal/reports/morning-2026-09-20.md:7#p2`

journal/reports/morning-2026-09-20.md:31-49 | 2026-09-20 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #3

> pipeline.log (ostatni przebieg) data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789875749814.log) 2026-09-20T03:42:31.960Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-20T03:43:05.165Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-17898757 ...

### `journal/TASKS-UI.md:700#p2`

journal/TASKS-UI.md:739-771 | no date | PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08)
In top 5 of 1 run(s): query-pl-hybrid-rerank #3

> PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08) - [x] **karta hedge w sekcji pozycji** (`MorningCockpit.tsx`) — renderowana jako pierwsza karta w `cockpit-position-cards` gdy `bot.state.hedge` istnieje (siatka kart pokazuje się też, gdy user nie  ...

### `journal/reports/morning-2026-09-13.md:51`

journal/reports/morning-2026-09-13.md:51-65 | 2026-09-13 | pipeline-task.log (tail)
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #4

> ## pipeline-task.log (tail) ``` 2026-09-13T03:42:55.541Z krok wide-score: exit 0 (log: data\pipeline-logs\wide-score-1789270971349.log) 2026-09-13T03:42:55.541Z ▶ wide-daily (podejście 1/1) 2026-09-13T03:43:17.514Z krok wide-daily: exit 0 (log: data\pipeline-logs\wide-daily-1789270975541.log) 2026-0 ...

### `journal/reports/morning-2026-09-05.md:51`

journal/reports/morning-2026-09-05.md:51-65 | 2026-09-05 | pipeline-task.log (tail)
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #4

> ## pipeline-task.log (tail) ``` 2026-09-05T03:43:04.617Z krok wide-score: exit 0 (log: data\pipeline-logs\wide-score-1788579780497.log) 2026-09-05T03:43:04.617Z ▶ wide-daily (podejście 1/1) 2026-09-05T03:43:26.250Z krok wide-daily: exit 0 (log: data\pipeline-logs\wide-daily-1788579784617.log) 2026-0 ...

### `journal/reports/morning-2026-08-29.md:7#p1`

journal/reports/morning-2026-08-29.md:7-32 | 2026-08-29 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #4

> pipeline.log (ostatni przebieg) ``` 2026-08-29T03:42:09.160Z ▶ hs-mainnet-dai-usdt-001 (podejście 1/2) 2026-08-29T03:42:10.585Z krok hs-mainnet-dai-usdt-001: exit 0 (log: data\pipeline-logs\hs-mainnet-dai-usdt-001-1787974929160.log) 2026-08-29T03:42:10.586Z ▶ hs-arbitrum-usdc-usdt-001 (podejście 1/ ...

### `journal/CONTEXT.md:4300#p2`

journal/CONTEXT.md:4329-4359 | 2026-08-21 | 2026-08-21 ~16:0x — Wdrożenie UI OK, ale cofnęliśmy migrację NSSM→pm2 (mój błąd instrukcji)
In top 5 of 1 run(s): vector #4

> 2026-08-21 ~16:0x — Wdrożenie UI OK, ale cofnęliśmy migrację NSSM→pm2 (mój błąd instrukcji) Kolejność: `pm2 delete all` + `pm2 kill` → `pm2 unstartup` + kontrola klucza Run w rejestrze → `nssm start` obu usług → pull poprawionego deployu → sanity. Przy okazji domykamy krok 6 addendum z 10.08 (test  ...

### `journal/reports/morning-2026-08-30.md:7#p1`

journal/reports/morning-2026-08-30.md:7-32 | 2026-08-30 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #5

> pipeline.log (ostatni przebieg) ``` 2026-08-30T03:42:10.149Z ▶ hs-mainnet-dai-usdt-001 (podejście 1/2) 2026-08-30T03:42:11.788Z krok hs-mainnet-dai-usdt-001: exit 0 (log: data\pipeline-logs\hs-mainnet-dai-usdt-001-1788061330149.log) 2026-08-30T03:42:11.788Z ▶ hs-arbitrum-usdc-usdt-001 (podejście 1/ ...

### `journal/HANDOFF.md:641#p5`

journal/HANDOFF.md:863-922 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) NATYCHMIAST po pushu ping CC-Win — wdrożenie to sam `nssm restart homos-bot`, bez builda. - [Fable→CC-Mac, 29.08 ~21:xx — DOCS, zamknięcie dnia] Commit+push: `CONTEXT.md` (obalenie wariantu bez swapu na obu pulach + recent90, falsyfikacja  ...

### `journal/CONTEXT.md:93`

journal/CONTEXT.md:93-93 | 2026-08-19 | Decyzja z 2026-08-19
In top 5 of 1 run(s): meta-index-hybrid #5

> Decyzja z 2026-08-19: Po KAŻDEJ naprawie pipeline'u: ręczna weryfikacja TEGO SAMEGO DNIA (`npm run pipeline -- --only fetch` na Windows, iterować aż przejdzie) — automat 07:30 to rutyna, nie jedyny test Uzasadnienie: 3 dni z rzędu pipeline padał na czymś innym (ENOENT → shell:true → brak node_module ...

### `journal/HANDOFF.md:1264#p2`

journal/HANDOFF.md:1320-1377 | no date | @CC-Win (Claude Code od botów windowsowych)
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> @CC-Win (Claude Code od botów windowsowych) Jedno techniczne odstępstwo od zlecenia: run arbitrum-weth-usdc-005-720d padł na OOM w domyślnym limicie heap Node [cache 3.4 GB ndjson], powtórzony z NODE_OPTIONS=--max-old-space-size=8192 — odnotowane w raporcie do Fable. Wpis skasowany — higiena.) (OD ...

### `journal/CONTEXT.md:2347#p2`

journal/CONTEXT.md:2389-2432 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 1 run(s): vector #5

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Bilans dnia: pierwszy w historii pipeline zielony end-to-end (8GB heap), eksperyment hUp policzony+cross-walidacja (werdykt 48h czeka na 26.08), tbtc-wbtc domknięty (pegged: NIE), ROTATE cross-pool + hedge GMX z ...

## dated-07 (dated-fact, answerable: yes)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

**Reference:** Before the capital (27.08) there was the .bot/pipeline overwrite incident (17.08), the auto-pull runner withdrawn (18.08) and the NSSM to pm2 migration rolled back (21.08); while the capital was in the LP (27.08 to 18.09) the Windows machine was changed repeatedly: bot and UI deployments with restarts on 28.08, 29.08 (including sigma on the 15-minute grid), 31.08, 01.09, 02.09, 03.09 and 11.09, plus a disk replacement on the night of 02/03.09 that stopped the pipeline, report and observer; known ledger bugs (anchor chain, cost after the 11.09 rebalance) were left unfixed.

Evidence now: `journal/CONTEXT.md:3618-3620`, `journal/CONTEXT.md:90-90`, `journal/CONTEXT.md:4300-4302`, `journal/CONTEXT.md:1927-1929`, `journal/CONTEXT.md:1558-1559`, `journal/CONTEXT.md:1228-1229`, `journal/CONTEXT.md:883-885`, `journal/CONTEXT.md:757-760`, `journal/CONTEXT.md:321-323`, `journal/CONTEXT.md:344-346`.

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 14 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #5, hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #4, hybrid-stem-prefix6 #2, meta-index-hybrid #2, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #5, vector #5

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `docs/AI-WORKFLOW.md:25`

docs/AI-WORKFLOW.md:25-55 | no date | The two coordination files
In top 5 of 10 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #3

> ## The two coordination files Sessions cannot see each other. They coordinated through the repository: - **`CONTEXT.md` — the living journal.** Section 1: the current state, newest first. Section 2: the decision table (translated in `DECISION-LOG.md`). Section 4: a dated log of every session —  ...

### `journal/RESEARCH-QUEUE.md:684#p3`

journal/RESEARCH-QUEUE.md:771-810 | no date | H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
In top 5 of 10 run(s): contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie) Docelowa architektura: kapitał LP na sprzętowym + osobny mały portfel operacyjny (hot) wyłącznie pod przyszły automat hedge'a. Przy wdrożeniu pamiętać: blind signing dla multicalli (kompensowane podglądem Rabby), migracja pozy ...

### `docs/PLAN.md:1`

docs/PLAN.md:1-10 | no date | HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
In top 5 of 8 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid #5, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #4, vector #1

> # HOMOS v2 — Project plan: Automated Liquidity Manager (ALM) > **Historical: the plan as written on 10 Aug 2026, before implementation.** What was > actually built is in the [README](../README.md) and [`CASE-STUDY.md`](CASE-STUDY.md); > a short "planned vs built" summary is in §5. > > Parameters ag ...

### `docs/CASE-STUDY.md:44`

docs/CASE-STUDY.md:44-65 | no date | 3. What the backtests said
In top 5 of 4 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-stem-prefix6 #1, meta-index-hybrid #1

> ## 3. What the backtests said The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen `ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days, exit on a 5 % break below the 7-day EMA. It passed the gate on one pool. The ...

### `docs/INFRA.md:8`

docs/INFRA.md:8-36 | no date | 1. Architecture (as built)
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #3

> ## 1. Architecture (as built) ``` ┌────────────────────────── WINDOWS (server, 24/7) ──────────────────────────┐ │  NSSM service homos-bot      bot/observer.ts — prices, signals, proposals  │ │  NSSM service homos-server   bot/server.ts — REST API + static UI (public/)│ │  Task Scheduler            ...

### `docs/AI-WORKFLOW.md:93`

docs/AI-WORKFLOW.md:93-99 | no date | If you want to copy the pattern
In top 5 of 3 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #3, query-pl-hybrid-rerank #2

> ## If you want to copy the pattern Keep one journal and one inbox file in the repo. Make reading them the first instruction of every session and writing to them the last. Give each session a role and a list of paths it may not touch. Route all decisions that spend money or change parameters through ...

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #5

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `docs/UI-DESIGN.md:1`

docs/UI-DESIGN.md:1-11 | no date | UI-DESIGN.md — autopilot and the morning cockpit
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3

> # UI-DESIGN.md — autopilot and the morning cockpit > Merges the original product vision (10 Aug 2026) and the cockpit information architecture > (v1, mid-August). §1 summarises what was built; the rest is the design as written, with > unbuilt items marked. > > Overriding principle: the owner looks  ...

### `journal/CONTEXT.md:7#p2`

journal/CONTEXT.md:48-77 | no date | 1. Stan projektu — skrót
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4

> 1. Stan projektu — skrót ROZLICZENIE TRANSZY (pytanie Rafała): kokpit pokazuje PnL od KOTWIC pozycji ($5,857), nie od 6 092 USDC — różnica to bufor ~$150 WETH w portfelu (poza panelem) + ~$75 jednorazowych kosztów wejścia (4 swapy + gaz), a nie strata. Do zbudowania: „bilans transzy" liczon ...

### `journal/CONTEXT.md:2347#p3`

journal/CONTEXT.md:2432-2475 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 2 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #4

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Powstał `DECYZJE-2026-08-26.md`: 8 punktów agendy (kapitał, v1.3/hUp48, cbBTC k2/k3, wykluczenie mainnet-001, parking cash, pyłki, seria sweep, obserwacja PROPONUJ) + jakie dane zbierają się do tego czasu. Sesje ...

### `docs/CASE-STUDY.md:141`

docs/CASE-STUDY.md:141-153 | no date | 7. Numbers, for the record
In top 5 of 2 run(s): hybrid-rerank-meta #5, meta-index-hybrid-rerank #5

> ## 7. Numbers, for the record | Item | Value | |---|---| | Capital deployed | 6 092 USDC on Base, 27 Aug 2026 | | LP phase result (27 Aug – 18 Sep) | +0.6 % (+$38), ≈ $29 of it fees | | Narrowing experiment | 11 days, ≈ $8.6 fees, −$32 vs HODL at close | | Post-LP spot exposure (18 – 21 Sep) | ≈ +$ ...

### `docs/DECISION-LOG.md:23`

docs/DECISION-LOG.md:23-23 | 2026-08-26 | Decision of 2026-08-26
In top 5 of 1 run(s): vector #2

> Decision of 2026-08-26: **Capital waits in USDC** until recalibration results; no Aave parking. Revised the same day to a *conditional entry*: enter if a pool passes the 720 d + recent-90 gate on the recalibrated runs. Evidence / rationale: Entering a narrow LP on a calibration we had just declared  ...

### `journal/DECYZJE-2026-08-26.md:90#p1`

journal/DECYZJE-2026-08-26.md:90-122 | no date | ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #3

> ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE Kontekst: po serii recal Rafał zapytał wprost "czy projekt ma sens i kiedy go porzucić"; ustalono próg: jeśli rodziny A (delta-neutral) i B (flat-only) nie pokażą przewagi nad swoimi benchmarkami — kapitał nie wchodzi do żadnej strate ...

### `journal/CONTEXT.md:454`

journal/CONTEXT.md:454-498 | 2026-09-09 | 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA (100% pokrycia, 0 duplikatów), GM v2 i JLP potwier
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #3

> ### 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA (100% pokrycia, 0 duplikatów), GM v2 i JLP potwierdzone na czystych danych; GLP zostaje na danych E8.2e (wyjątek udokumentowany, 3. błąd = obcinanie Llamy przy delistingu); **E8.2 ZAMKNIĘTE — werdykt klasy „dom kasyna"** Odbió ...

### `docs/DB-SCHEMA.md:174`

docs/DB-SCHEMA.md:174-189 | no date | 4. Planned rollout (not carried out)
In top 5 of 1 run(s): vector #3

> ## 4. Planned rollout (not carried out) 1. `db/migrations/001_init.sql` (the DDL above once frozen) + `scripts/db-migrate.ts` + `scripts/db-import.ts` (idempotent ndjson→SQLite import, resume from the last ts per table). 2. A `db-import` step at the end of the 07:30 pipeline + seeding the `po ...

### `journal/TASKS-FUNNEL.md:10`

journal/TASKS-FUNNEL.md:10-39 | no date | 1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30)
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #4

> ## 1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30) Świadomie BEZ nowego automatu w Harmonogramie (lekcja 18.08: mniej ruchomych części). Nowy krok `candidate-funnel` w `scripts/pipeline.ts`, po hs-*/freshness, PRZED backtest-run (żeby OOM backtestu nie zabił lejka). 1. **Kwalifikacja* ...

### `journal/CONTEXT.md:3005`

journal/CONTEXT.md:3005-3009 | 2026-08-10 | 2026-08-10 — Sesja 3c: Wizja produktu + infrastruktura (dokumenty)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #4

> ### 2026-08-10 — Sesja 3c: Wizja produktu + infrastruktura (dokumenty) - **`UI-VISION.md`**: docelowy kształt = autopilot + poranny kokpit (użytkownik zagląda raz rano). Ekrany: poranny brief (finanse + kolejka decyzji + alerty + sugestie rotacji z kosztem przejścia), pozycje z osią czasu zdarzeń, u ...

### `journal/CONTEXT.md:4554#p3`

journal/CONTEXT.md:4638-4687 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 1 run(s): hybrid-rerank-meta-1024 #4

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 Konsekwencje: (a) selection+sweep dziś nie policzone — wieczorem `--only backtest` PRZED backfillem lejka (seria sweep na 26.08 bez dziury); (b) Peak RSS wciąż nieznany — fix CC-Wina loguje na ko ...

### `docs/DECISION-LOG.md:32`

docs/DECISION-LOG.md:32-32 | 2026-09-22 | Decision of 2026-09-22
In top 5 of 1 run(s): hybrid-stem-prefix6 #4

> Decision of 2026-09-22: **Project closed.** Repository converted into a public case study; private journal retained in history and in a private clone. Evidence / rationale: The question was answered; further capital would be a bet on beta, not on the product.

### `docs/PLAN.md:177`

docs/PLAN.md:177-187 | no date | 6. Main risks (summary)
In top 5 of 1 run(s): meta-index-hybrid #4

> ## 6. Main risks (summary) | Risk | Mitigation | |---|---| | Strategy does not beat HODL | Gate after Phase 1 — we do not deploy; cost = time, not capital | | Whipsaw eats capital through rebalances | Hysteresis + profitability condition + daily rebalance limits | | Hedge liquidation on a pump | Ma ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 1 run(s): vector #4

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

### `docs/CASE-STUDY.md:132`

docs/CASE-STUDY.md:132-139 | no date | 6. What I would do differently
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> ## 6. What I would do differently - Start with 720 days of data and the gate, before writing a single strategy. - Build the tranche reconciliation on day one, from the deposit down. - Write the exit rule with a date **and** a floor **and** a ceiling before deploying capital, and make changing it  ...

## dated-08 (dated-fact, answerable: yes)

**Q:** When was the capital withdrawn?

**Reference:** In two stages: on 18.09 both LP positions were closed at $6 130.02 against $6 092 deposited (+$38.02, +0.62%, 22 days), with ~1.22 ETH and 0.0141 cbBTC kept as a spot bet and the USDC sent to Kraken; on 21.09 around 19:00 Polish time the rest was sold, the tranche ending at about 5 605 EUR (~$6 428, +$336, +5.5% over 25 days).

Evidence now: `journal/CONTEXT.md:102-102`, `journal/CONTEXT.md:216-217`, `journal/CONTEXT.md:101-101`, `journal/CONTEXT.md:10-16`, `journal/reports/morning-2026-09-19.md:267-268`.

### `docs/EMERGENCY.md:88`

docs/EMERGENCY.md:88-106 | no date | 6. Off-ramp lessons
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #1

> ## 6. Off-ramp lessons Not an emergency, but recorded here because they apply to every capital exit (the tranche was closed to EUR on 18–21 Sep 2026): - **Closing the LP** with "Remove liquidity" (100 %) in the Uniswap UI runs `decreaseLiquidity` + `collect` in one multicall, so fees come out wi ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 11 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `docs/DECISION-LOG.md:32`

docs/DECISION-LOG.md:32-32 | 2026-09-22 | Decision of 2026-09-22
In top 5 of 9 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, hybrid-stem-prefix6 #2, meta-index-hybrid #2, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #5, vector #3

> Decision of 2026-09-22: **Project closed.** Repository converted into a public case study; private journal retained in history and in a private clone. Evidence / rationale: The question was answered; further capital would be a bet on beta, not on the product.

### `journal/DECYZJE-2026-08-26.md:153`

journal/DECYZJE-2026-08-26.md:153-162 | no date | 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
In top 5 of 5 run(s): hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, vector #5

> ## 1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja) Rekomendacja Fable z 19.08 w **KAPITAL-REKOMENDACJA.md**: transza 1 $6k Base (005 $2.5k + cbBTC $1.5k + $2k rezerwa), transza 2 do $12–15k po OBSERWUJ ~31.08. Do zestawienia 26.08: wyniki paper tradingu (8 dni), trafność selektora, stan tr ...

### `journal/DECYZJE-2026-08-26.md:218`

journal/DECYZJE-2026-08-26.md:218-224 | no date | 5a. (stare brzmienie punktu, do kontekstu)
In top 5 of 3 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5, vector #4

> ### 5a. (stare brzmienie punktu, do kontekstu) Obserwacja z 20.08 (cbBTC w cash od 23:04 19.08): kapitał po EXIT_TREND leży bezczynnie. Opcje: zostawić (prostota), USDC na Aave/komp. (yield ~3–5% ale nowe ryzyko protokołu + gaz), stablecoin LP (arb-usdc-usdt — pula policzona, parking-grade). Dane d ...

### `docs/DECISION-LOG.md:17`

docs/DECISION-LOG.md:17-17 | 2026-08-18 | Decision of 2026-08-18
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3

> Decision of 2026-08-18: **Auto-pull runner on Windows withdrawn**; code reaches the server only by a manual `git pull`; the only automated git action is the morning-report push. Evidence / rationale: Queue unused for a week; a `reset --hard` every 3 minutes is the risk class behind an incident on 17 ...

### `docs/DECISION-LOG.md:23`

docs/DECISION-LOG.md:23-23 | 2026-08-26 | Decision of 2026-08-26
In top 5 of 2 run(s): hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4

> Decision of 2026-08-26: **Capital waits in USDC** until recalibration results; no Aave parking. Revised the same day to a *conditional entry*: enter if a pool passes the 720 d + recent-90 gate on the recalibrated runs. Evidence / rationale: Entering a narrow LP on a calibration we had just declared  ...

### `docs/PLAN.md:117`

docs/PLAN.md:117-123 | no date | 3.8. Operational risks omitted entirely
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #4

> ### 3.8. Operational risks omitted entirely - RPC failure / blind bot → provider redundancy + watchdog + alerts (Telegram/push), - **kill-switch**: global stop + "exit to stablecoin" mode, - USDC depeg risk (March 2023!) — monitoring the stablecoin price as a stop condition, - key security: dedicat ...

### `journal/CONTEXT.md:454`

journal/CONTEXT.md:454-498 | 2026-09-09 | 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA (100% pokrycia, 0 duplikatów), GM v2 i JLP potwier
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5

> ### 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA (100% pokrycia, 0 duplikatów), GM v2 i JLP potwierdzone na czystych danych; GLP zostaje na danych E8.2e (wyjątek udokumentowany, 3. błąd = obcinanie Llamy przy delistingu); **E8.2 ZAMKNIĘTE — werdykt klasy „dom kasyna"** Odbió ...

### `journal/reports/morning-2026-08-27.md:158`

journal/reports/morning-2026-08-27.md:158-180 | 2026-08-27 | selector-state.json
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #1

> ## selector-state.json ```json { "lastRunDate": "2026-08-27", "lastRotateDate": "2026-08-18", "streaks": { "d632293f-ebd7-4316-850e-9b5dd4d992f3": 15, "b99bcdf5-1350-4269-981e-0e9b5cccb007": 15, "8b3ed515-5e6f-449a-9b64-25113cda7a29": 15, "3a2f2faf-6423-4569-ad93-821c54cbe702": ...

### `docs/DECISION-LOG.md:29`

docs/DECISION-LOG.md:29-29 | 2026-09-16 | Decision of 2026-09-16
In top 5 of 1 run(s): vector #2

> Decision of 2026-09-16: **Exit rule revised** (day after a −4 % move): exit the LP when the tranche balance ≥ deposit (0 %); the hard 24 Sep exit and the +5 % trigger are dropped; 24 Sep becomes a review; a balance ≤ −10 % forces a new decision; bet review on 24 Oct; still no narrowing. Evidence / r ...

### `journal/DECYZJE-2026-08-26.md:9#p1`

journal/DECYZJE-2026-08-26.md:9-53 | no date | ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fable)
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #4

> ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fable) Przegląd odbyty w kolejności z pkt 11a (σ → k → hUp → kapitał). Decyzje: 1. **σ (pkt 11): SIATKA 15 MIN.** Pomiar zmienności z ceny próbkowanej co 15 min (spójne z cyklem statystyk bota); 1h zostaje jako referencja dia ...

### `journal/CONTEXT.md:2178#p1`

journal/CONTEXT.md:2178-2215 | 2026-08-26 | 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komplet decyzji z DECYZJE-2026-08-26
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #5

> 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komplet decyzji z DECYZJE-2026-08-26 Brief poranny + pełny przegląd agendy, punkt po punkcie (AskUserQuestion), w kolejności 11a: σ → k → hUp → kapitał. WSZYSTKIE decyzje podjęte — komplet z uzasadnieniami w sekcji "WYNIK PRZEGLĄDU" na ...

### `docs/CASE-STUDY.md:141`

docs/CASE-STUDY.md:141-153 | no date | 7. Numbers, for the record
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #5

> ## 7. Numbers, for the record | Item | Value | |---|---| | Capital deployed | 6 092 USDC on Base, 27 Aug 2026 | | LP phase result (27 Aug – 18 Sep) | +0.6 % (+$38), ≈ $29 of it fees | | Narrowing experiment | 11 days, ≈ $8.6 fees, −$32 vs HODL at close | | Post-LP spot exposure (18 – 21 Sep) | ≈ +$ ...

### `docs/DB-SCHEMA.md:174`

docs/DB-SCHEMA.md:174-189 | no date | 4. Planned rollout (not carried out)
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> ## 4. Planned rollout (not carried out) 1. `db/migrations/001_init.sql` (the DDL above once frozen) + `scripts/db-migrate.ts` + `scripts/db-import.ts` (idempotent ndjson→SQLite import, resume from the last ts per table). 2. A `db-import` step at the end of the 07:30 pipeline + seeding the `po ...

### `docs/DECISION-LOG.md:10`

docs/DECISION-LOG.md:10-10 | 2026-08-10 | Decision of 2026-08-10
In top 5 of 1 run(s): meta-index-hybrid #5

> Decision of 2026-08-10: **No own smart contract / vault.** Positions stay as NFTs in the owner's wallet. Evidence / rationale: $5–25k of capital does not justify contract risk and audit cost.

## dated-09 (dated-fact, answerable: yes)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

**Reference:** The flat detector repeatedly started and reset on cbBTC/WETH on 28-30.08 and held from 30.08 22:22Z, which led to the only live narrowing, 31.08 to 11.09 (11 days in flat, -$32 vs HODL), ended by a DOWN signal on cbBTC and the signed widening; flat was confirmed again on cbBTC from 15.09 03:03Z and on both legs on 17-18.09, but those cards were deliberately not signed.

Evidence now: `journal/CONTEXT.md:294-295`, `journal/CONTEXT.md:260-260`, `journal/CONTEXT.md:1135-1136`, `journal/CONTEXT.md:1309-1310`, `journal/CONTEXT.md:255-255`, `journal/reports/morning-2026-09-17.md:120-120`, `journal/reports/morning-2026-09-17.md:139-139`, `docs/CASE-STUDY.md:81-84`, `docs/DECISION-LOG.md:28-28`.

### `docs/CASE-STUDY.md:44`

docs/CASE-STUDY.md:44-65 | no date | 3. What the backtests said
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2

> ## 3. What the backtests said The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen `ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days, exit on a 5 % break below the 7-day EMA. It passed the gate on one pool. The ...

### `journal/CONTEXT.md:277#p4`

journal/CONTEXT.md:412-452 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu #5908083 w positions-history mogła być zapisana PO burnie z valueUsd ≈ 0?). Zlecenie diagnostyczne u CC-Win (tylko odczyt). AKTUAL ...

### `journal/RESEARCH-QUEUE.md:926#p1`

journal/RESEARCH-QUEUE.md:926-974 | no date | E4. PRZEGLĄDY (kalendarz)
In top 5 of 6 run(s): hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #4

> E4. PRZEGLĄDY (kalendarz) - [ ] **24.09 — WYJŚCIE Z LP (decyzja Rafała 02.09, CONTEXT §2)**: obie pozycje produktowe → USDC → off-ramp (Kraken, procedura 25.08) → ETF. Niezależnie od kursu. WCZEŚNIEJ: bilans transzy ≥ +5% (≥ $6 397) → wyjście od razu (monitoring ręczny, dzienny). Przed 24.09  ...

### `journal/CONTEXT.md:1130#p3`

journal/CONTEXT.md:1214-1258 | 2026-08-31 | 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #4

> 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia HOTFIX (Fable, tsc czysty, build przechodzi): `waitReceiptBestEffort` wyeksportowany z useCockpitActions (+walidacja formatu hasha), podmienione 3+3 surowe waity w useRebalanceExecution i useRotateExecut ...

### `docs/DECISION-LOG.md:26`

docs/DECISION-LOG.md:26-26 | 2026-08-31 | Decision of 2026-08-31
In top 5 of 3 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3, vector #4

> Decision of 2026-08-31: **Sign the first narrowing proposal (cbBTC leg) as an operational experiment**, n = 1, explicitly *not* a test of the strategy; the 720-day falsification stands. Evidence / rationale: We wanted real `widthPct` / `costUsd` / `paybackDays` and a full narrow→wide cycle measured  ...

### `docs/CASE-STUDY.md:105`

docs/CASE-STUDY.md:105-130 | no date | 5. Conclusions
In top 5 of 2 run(s): meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #2

> ## 5. Conclusions **On the strategy.** For ETH/stable and ETH/BTC pairs, concentrated liquidity did not beat HODL 50/50 out of sample. The fee income is real but it is paid for with convexity: you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn. A wid ...

### `journal/reports/morning-2026-09-19.md:101`

journal/reports/morning-2026-09-19.md:101-176 | 2026-09-19 | propozycje OPEN (4)
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3

> ## propozycje OPEN (4) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/reports/morning-2026-09-11.md:251`

journal/reports/morning-2026-09-11.md:251-260 | 2026-09-11 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3446 | $-2.94 | $-61.31 (od 2026-08-27) | $14.82 | $1 ...

### `journal/CONTEXT.md:190#p1`

journal/CONTEXT.md:190-217 | 2026-09-18 | 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto (zakład spot z re
In top 5 of 2 run(s): hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5

> 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + decyzja: kapitał zostaje w krypto (zakład spot z regułą), USDC → Kraken BRIEF (raport 07:30): automat czysty, bilans $5 966 (−2,06%; 16.09 −4,29% → 17.09 −3,33%), vs HODL obu nóg −$3,6, flat potwierdzony na obu, FLAT_NARROW ×2 odn ...

### `journal/reports/morning-2026-09-16.md:101`

journal/reports/morning-2026-09-16.md:101-124 | 2026-09-16 | propozycje OPEN (1)
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #5

> ## propozycje OPEN (1) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-15T15:04:47.365Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/CONTEXT.md:1362#p6`

journal/CONTEXT.md:1617-1667 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 1 run(s): vector #3

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) | pasmo | cbBTC | base-030 | |---|---|---| | ±3% | $685 (in-range 59–98%) | — | | ±4% | $570 (80–100%) | $672 | | **±5%** | **$442 (85–100%)** | **$525** | | ±6% | $334 | $388 | | ±8% | $193, próg 8.1d | $195 | | ±12% | $47 ...

### `journal/CONTEXT.md:1880#p2`

journal/CONTEXT.md:1931-1981 | 2026-08-28 | 2026-08-28 ~rano — BRIEF DZIEŃ 1 + ŻYWY POMIAR (Fable + Rafał)
In top 5 of 1 run(s): hybrid-rerank-1024 #5

> 2026-08-28 ~rano — BRIEF DZIEŃ 1 + ŻYWY POMIAR (Fable + Rafał) (2) TEST KOMBINACJI 12h+5d: EFEKTY SIĘ KUMULUJĄ — cbBTC-720d ΣEV $558.41 (+39.5% vs baseline, +18% vs najlepszego solo), base-030-720d $347.45 (vs $297 solo CONFIRM_12 z wczorajszego sweepu, +17%) → kandydat na przegląd 1.09: CONFIRM_H= ...

### `journal/HANDOFF.md:641#p4`

journal/HANDOFF.md:809-863 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 1 run(s): hybrid-rerank #5

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) - `src/hooks/useRotateExecution.ts` — te same 3 podmiany. TŁO (incydent ~12:3x, pierwsza bojowa sekwencja FLAT_NARROW #5887690): błąd Rabby+publicnode "Invalid parameters" na `eth_getTransactionReceipt` wysadzał sekwencję po KAŻDEJ wysłanej ...

### `journal/RESEARCH-QUEUE.md:843`

journal/RESEARCH-QUEUE.md:843-865 | no date | E1. ZAMKNIĘTY 31.08 (przegląd): COMPARE_HL_D odebrany — kotwica bez zmian (HL7d); strojenie detektora pod zwężanie bezpr
In top 5 of 1 run(s): vector #5

> ### E1. ZAMKNIĘTY 31.08 (przegląd): COMPARE_HL_D odebrany — kotwica bez zmian (HL7d); strojenie detektora pod zwężanie bezprzedmiotowe po falsyfikacji 720d. Kandydat HL5d-tylko-cbBTC w E5 na wypadek powrotu. Szczegóły: CONTEXT 31.08. (oryginalny tytuł: wycena FLAT_ENTER zanim pierwszy raz go podpisz ...

## dated-10 (dated-fact, answerable: yes)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

**Reference:** Four times: three rebalances on the morning of 21.08 (mainnet-030, mainnet-005, base-030, netting only +$69/+$93/+$87 after costs) and one on arbitrum-005 between the 22.08 and 23.08 reports; the cbBTC paper pool was never rebalanced (it went to cash on a trend exit and re-entered), and nothing changed up to 27.08.

Evidence now: `journal/CONTEXT.md:4165-4165`, `journal/CONTEXT.md:4221-4222`, `journal/reports/morning-2026-08-21.md:191-200`, `journal/reports/morning-2026-08-22.md:170-176`, `journal/reports/morning-2026-08-23.md:174-179`.

### `journal/TASKS-UI.md:225#p1`

journal/TASKS-UI.md:225-276 | no date | PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała)
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2, vector #2

> PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała) KONTEKST: bot prowadzi teraz PAPER TRADING (bot/paper.ts) — wirtualny portfel $10k na każdą pulę z BOT_POOLS, prowadzony przez ALGORITHM v1.2 na żywych danych (fees z trailing fee-yiel ...

### `journal/DECYZJE-2026-08-26.md:378`

journal/DECYZJE-2026-08-26.md:378-411 | no date | 10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozstrzygnięcia)
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> ## 10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozstrzygnięcia) Wyszło przy pytaniu Rafała, dlaczego arbitrum-weth-usdc-005 nie rebalansował. Reguła w obu miejscach jest ta sama („24h NIEPRZERWANIE poza zakresem"; jedno dotknięcie zakresu zeruje licznik — `paper.ts:261` `if (i ...

### `journal/CONTEXT.md:3473`

journal/CONTEXT.md:3473-3501 | 2026-08-18 | 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszmy i zbudujmy")
In top 5 of 9 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-stem-prefix6 #4, meta-index-hybrid #3, vector #1

> ### 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszmy i zbudujmy") Nowy moduł `bot/paper.ts` — wirtualny portfel prowadzony przez ALGORITHM v1.2 na żywych danych, $10k na każdą pulę BOT_POOLS (PAPER_CAPITAL_USD env). Odpowiada na pytanie "jak algorytm zachowałby się na prawdziw ...

### `journal/CONTEXT.md:2623`

journal/CONTEXT.md:2623-2671 | 2026-08-18 | 2026-08-18 — Sesja UI (Sonnet) — Partia 5: wizualizacja paper-tradingu ✅
In top 5 of 8 run(s): contextual-sonnet-hybrid-rerank #5, hybrid-rerank-1024 #4, hybrid-rerank #3, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid #5, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #5

> ### 2026-08-18 — Sesja UI (Sonnet) — Partia 5: wizualizacja paper-tradingu ✅ Wykonana cała Partia 5 z TASKS-UI.md (zlecona przez Fable ~11:3x, kod bot/paper.ts + /api/paper wpięte przez CC-Mac/CC-Win równolegle). Zakres: wyłącznie src/**, bot/** nietknięty (nawet nie czytany poza kształtem odpowiedz ...

### `journal/TASKS-UI.md:225#p2`

journal/TASKS-UI.md:276-315 | no date | PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała)
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, hybrid-stem-prefix6 #5, meta-index-hybrid-rerank #5

> PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała) Fees liczone z trailing fee-yieldu pasma (model doradcy), nie per-swap. To nie są prawdziwe pieniądze ani gwarancja wyników." 3. **Stany brzegowe**: 503 z /api/paper (paper jeszcz ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2, vector #4

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `journal/DECYZJE-2026-08-26.md:9#p1`

journal/DECYZJE-2026-08-26.md:9-53 | no date | ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fable)
In top 5 of 2 run(s): contextual-sonnet-query-pl-hybrid-rerank #4, query-pl-hybrid-rerank #3

> ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fable) Przegląd odbyty w kolejności z pkt 11a (σ → k → hUp → kapitał). Decyzje: 1. **σ (pkt 11): SIATKA 15 MIN.** Pomiar zmienności z ceny próbkowanej co 15 min (spójne z cyklem statystyk bota); 1h zostaje jako referencja dia ...

### `journal/CONTEXT.md:7#p1`

journal/CONTEXT.md:7-48 | no date | 1. Stan projektu — skrót
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5

> 1. Stan projektu — skrót - **⚡ STAN NA 21.09 ~19:30 PL — TRANSZA 1 ZAMKNIĘTA W CAŁOŚCI DO EUR NA KRAKENIE. Wynik: ≈ +$336 (+5,5%) w 25 dni (27.08→21.09), z tego LP FlatWide +$38 (22 dni), zakład spot 18–21.09 ≈ +$300.** Sprzedane 21.09 ~19:00 PL: 1,22014 ETH @ 2 403,39 EUR (≈ $2 756) i 1 213, ...

### `journal/CONTEXT.md:2347#p1`

journal/CONTEXT.md:2347-2389 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 2 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Noc 20.08 = potwierdzenie wczorajszej roboty: pipeline 07:30 **19/19 kroków hs-* exit 0, zero asysty** (pierwszy w pełni czysty przebieg automatu w historii projektu), cache OK=[19] BRAKI=[], observer/state żywe ...

### `journal/PYTANIE-SZEROKOSC-I-SIGMA.md:137`

journal/PYTANIE-SZEROKOSC-I-SIGMA.md:137-147 | no date | 7. Ograniczenia praktyczne (dla realistycznych odpowiedzi)
In top 5 of 1 run(s): vector #5

> ## 7. Ograniczenia praktyczne (dla realistycznych odpowiedzi) - Dane: wyłącznie zdarzenia Swap z łańcucha (mamy pełne roczne historie, do 12M swapów na pulę) + DefiLlama do rankingu pul. Brak księgi zleceń, brak płatnych źródeł danych. - Bot działa w cyklu 15-minutowym na maszynie Windows 24/7; ...

## id-01 (identifier, answerable: yes)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

**Reference:** Neither: it is a proposal type (kind) emitted by the bot's flat detector when the flat regime is confirmed (|gap to the EMA| < 2% for at least 12 h), proposing to narrow an existing wide position to a fixed ±5%, with FLAT_WIDEN as the opposite card when |gap| > 5%; unsigned cards expire on a TTL and come back.

Evidence now: `journal/TASKS-UI.md:1136-1139`, `journal/CONTEXT.md:1907-1911`, `journal/HANDOFF.md:855-857`, `journal/CONTEXT.md:1192-1194`, `journal/reports/morning-2026-09-17.md:120-120`, `journal/CONTEXT.md:259-259`, `docs/EMERGENCY.md:83-84`.

### `journal/reports/morning-2026-09-19.md:101`

journal/reports/morning-2026-09-19.md:101-176 | 2026-09-19 | propozycje OPEN (4)
In top 5 of 10 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #5

> ## propozycje OPEN (4) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/reports/morning-2026-09-20.md:101`

journal/reports/morning-2026-09-20.md:101-162 | 2026-09-20 | propozycje OPEN (3)
In top 5 of 8 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-stem-prefix6 #4, vector #4

> ## propozycje OPEN (3) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/reports/morning-2026-09-16.md:101`

journal/reports/morning-2026-09-16.md:101-124 | 2026-09-16 | propozycje OPEN (1)
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, meta-index-hybrid #2

> ## propozycje OPEN (1) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-15T15:04:47.365Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/HANDOFF.md:254#p4`

journal/HANDOFF.md:397-451 | no date | @Sonnet (sesja UI, Cowork)
In top 5 of 6 run(s): hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> @Sonnet (sesja UI, Cowork) Po commit+push: ping CC-Win (build+restart homos-server — może pójść razem z paczką bot-side "cykl w state", jeden deploy). - [Sonnet→CC-Mac, 28.08 — **PARTIE 16 + 16b ZROBIONE RAZEM, do commit+push**] Karty propozycji FLAT_NARROW/FLAT_WIDEN (produkt FlatWide) +  ...

### `journal/CONTEXT.md:1362#p5`

journal/CONTEXT.md:1564-1616 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 6 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) Tymczasem CAŁA wycena zwężania z E1/E4 (ΣEV $558, progi „epizod ≥5d/≥2d") liczona jest `flatwindows.ts` ze STAŁĄ szerokością wąskiego pasma: ±8% domyślnie, ±6% dla cbBTC. To 2.3–2.5× różnicy w parametrze, który NAJMOCNIEJ n ...

### `journal/reports/morning-2026-09-22.md:101`

journal/reports/morning-2026-09-22.md:101-162 | 2026-09-22 | propozycje OPEN (3)
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4

> ## propozycje OPEN (3) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/reports/morning-2026-09-18.md:101`

journal/reports/morning-2026-09-18.md:101-157 | 2026-09-18 | propozycje OPEN (3)
In top 5 of 4 run(s): contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank-1024 #4, hybrid-stem-prefix6 #5

> ## propozycje OPEN (3) ```json [ { "id": "flat-narrow-5886957-1789498394117", "createdAt": "2026-09-17T17:29:50.320Z", "tokenId": "5886957", "poolId": "base-weth-usdc-030", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-USDC", "suggestedRange": {  ...

### `journal/reports/morning-2026-09-23.md:101`

journal/reports/morning-2026-09-23.md:101-124 | 2026-09-23 | propozycje OPEN (1)
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #3, vector #3

> ## propozycje OPEN (1) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/CONTEXT.md:1130#p1`

journal/CONTEXT.md:1130-1170 | 2026-08-31 | 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5

> 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia BRIEF: automat czysty (porażki BRAK), obie nogi in-range, $5,698.99 / vsHODL −$4.98; bilans transzy $5,924.73 vs 6 092 → −$167.27 (−2.75%; beta −$158.38, koszty wejścia stałe −$8.58 — bez dryfu); tempo f ...

### `journal/HANDOFF.md:29#p4`

journal/HANDOFF.md:194-252 | no date | @Fable (sesja analityczna)
In top 5 of 1 run(s): hybrid-rerank #4

> @Fable (sesja analityczna) korekty po miesiącu obserwacji, nie teraz. Wyniki w gicie (0df4df1) + data/wide-score/. Wpisy skasowane — higiena.) (DWA NIEPILNE + HOTFIX-DEPLOY ODEBRANE przez Fable 31.08 ~wieczór — dzięki za komplet, dzień po Twojej stronie wzorowy. WERDYKTY: mainnet-030 720d zgodny z ...

### `journal/reports/morning-2026-09-21.md:101`

journal/reports/morning-2026-09-21.md:101-162 | 2026-09-21 | propozycje OPEN (3)
In top 5 of 1 run(s): vector #5

> ## propozycje OPEN (3) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

## id-02 (identifier, answerable: yes)

**Q:** Is position #5978579 a wide or a narrow position?

**Reference:** Wide: #5978579 is the cbBTC/WETH 0.05% Base position minted ±40% on 11.09 by the signed FLAT_WIDEN; a FLAT_NARROW card for it (15.09) was deliberately not signed, so it stayed wide until it was closed by hand in Uniswap on 18.09.

Evidence now: `journal/CONTEXT.md:277-277`, `journal/CONTEXT.md:294-296`, `journal/reports/morning-2026-09-12.md:281-281`, `journal/CONTEXT.md:255-258`, `journal/CONTEXT.md:211-213`, `journal/reports/morning-2026-09-13.md:281-281`, `journal/reports/morning-2026-09-14.md:281-281`, `journal/reports/morning-2026-09-15.md:222-222`, `journal/reports/morning-2026-09-16.md:242-242`, `journal/reports/morning-2026-09-17.md:261-261`, `journal/reports/morning-2026-09-18.md:275-275`.

### `journal/reports/morning-2026-09-17.md:101`

journal/reports/morning-2026-09-17.md:101-143 | 2026-09-17 | propozycje OPEN (2)
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #5, meta-index-hybrid #4, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> ## propozycje OPEN (2) ```json [ { "id": "flat-narrow-5886957-1789498394117", "createdAt": "2026-09-16T07:24:48.695Z", "tokenId": "5886957", "poolId": "base-weth-usdc-030", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-USDC", "suggestedRange": {  ...

### `journal/reports/morning-2026-09-16.md:101`

journal/reports/morning-2026-09-16.md:101-124 | 2026-09-16 | propozycje OPEN (1)
In top 5 of 8 run(s): contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-stem-prefix6 #3, meta-index-hybrid #3, query-pl-hybrid-rerank #5

> ## propozycje OPEN (1) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-15T15:04:47.365Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/reports/morning-2026-09-23.md:101`

journal/reports/morning-2026-09-23.md:101-124 | 2026-09-23 | propozycje OPEN (1)
In top 5 of 6 run(s): hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #4

> ## propozycje OPEN (1) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/reports/morning-2026-09-18.md:101`

journal/reports/morning-2026-09-18.md:101-157 | 2026-09-18 | propozycje OPEN (3)
In top 5 of 5 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2

> ## propozycje OPEN (3) ```json [ { "id": "flat-narrow-5886957-1789498394117", "createdAt": "2026-09-17T17:29:50.320Z", "tokenId": "5886957", "poolId": "base-weth-usdc-030", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-USDC", "suggestedRange": {  ...

### `docs/ALGORITHM.md:27`

docs/ALGORITHM.md:27-35 | no date | 2. Position range (advisor — src/utils/advisor.ts)
In top 5 of 3 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1, vector #3

> ## 2. Position range (advisor — src/utils/advisor.ts) - Width: **w = k · σ_daily · √7d**, where **k = 3** for ETH/stable pairs (365d walk-forward: k3 h24 the only configuration with positive mean+median in both windows; gate ≥2 regimes passed). Clamp: 1%–60%. - **Correlated-pair exception (cbBT ...

### `docs/EMERGENCY.md:81`

docs/EMERGENCY.md:81-86 | no date | 5. What this document does not cover
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #5

> ## 5. What this document does not cover FLAT_NARROW / FLAT_WIDEN (narrowing and widening within the product) are not emergency procedures; they are the normal FlatWide cycle. FLAT_WIDEN is protective (a narrow position in a trend accumulates IL), but it is signed through the normal proposal flow, n ...

### `journal/TASKS-UI.md:1190`

journal/TASKS-UI.md:1190-1235 | no date | PARTIA 17 — panel zbiorczy REALNYCH pozycji + linia CYKLU FlatWide ✅ wykonana (Sonnet 28.08; prośba Rafała 28.08 wieczór
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #2

> ## PARTIA 17 — panel zbiorczy REALNYCH pozycji + linia CYKLU FlatWide ✅ wykonana (Sonnet 28.08; prośba Rafała 28.08 wieczór, spec Fable) Kontekst bot-side (już w paczce): `/api/state` ma teraz (1) root `flatParams: { enterGap, exitGap, confirmH, ... }` (żywe parametry detektora — NIE hardkodować 12 ...

### `journal/reports/morning-2026-09-21.md:101`

journal/reports/morning-2026-09-21.md:101-162 | 2026-09-21 | propozycje OPEN (3)
In top 5 of 2 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5

> ## propozycje OPEN (3) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/reports/morning-2026-08-29.md:181`

journal/reports/morning-2026-08-29.md:181-186 | 2026-08-29 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 1 run(s): vector #1

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | wartość | vs HODL | PnL od kotwicy | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | $3435 | $-4.09 | $-72.82 (od 2026-08-27) | w zakresie | 9.5% | — | | #5887690 | base-cbbtc-weth-005 | $2268 | $- ...

### `journal/reports/morning-2026-09-09.md:127`

journal/reports/morning-2026-09-09.md:127-145 | 2026-09-09 | RANKING WIDE (pod produkt, top 10)
In top 5 of 1 run(s): vector #2

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-09 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | U ...

### `journal/CONTEXT.md:277#p4`

journal/CONTEXT.md:412-452 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #3

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu #5908083 w positions-history mogła być zapisana PO burnie z valueUsd ≈ 0?). Zlecenie diagnostyczne u CC-Win (tylko odczyt). AKTUAL ...

### `journal/CONTEXT.md:277#p2`

journal/CONTEXT.md:321-366 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #5

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu FIX (Fable, 1 linia): dedup także po `id` — odrzucona karta nie wraca tego samego dnia. Paczka: CC-Mac commit+push+ping, CC-Win pul ...

### `journal/reports/morning-2026-09-20.md:101`

journal/reports/morning-2026-09-20.md:101-162 | 2026-09-20 | propozycje OPEN (3)
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #5

> ## propozycje OPEN (3) ```json [ { "id": "flat-narrow-5978579-1789441387109", "createdAt": "2026-09-17T17:29:50.321Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "FLAT_NARROW", "action": "FLAT_NARROW", "symbol": "WETH-cbBTC", "suggestedRange": {  ...

### `journal/reports/morning-2026-08-31.md:219`

journal/reports/morning-2026-08-31.md:219-228 | 2026-08-31 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 1 run(s): vector #5

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3430 | $-4.60 | $-77.48 (od 2026-08-27) | $4.39 | $1. ...

## id-03 (identifier, answerable: yes)

**Q:** Was the range of position #5886957 ever changed, and when?

**Reference:** No: #5886957 is leg A, WETH/USDC 0.30% on Base, minted on 27.08 with a $1 665.75-3 744.30 range (±50%) and closed unchanged on 18.09; a narrowing card for it (expected 16.09, listed in the 17-18.09 reports) was not signed, and a range change would in any case have meant closing it and minting a new position, as happened on the cbBTC leg (#5887690 to #5908083 to #5978579).

Evidence now: `journal/CONTEXT.md:2096-2097`, `journal/CONTEXT.md:257-258`, `journal/reports/morning-2026-09-17.md:105-105`, `journal/CONTEXT.md:211-212`, `journal/CONTEXT.md:419-420`.

### `journal/reports/morning-2026-08-29.md:181`

journal/reports/morning-2026-08-29.md:181-186 | 2026-08-29 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 11 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #2, meta-index-hybrid #2, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #2, vector #3

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | wartość | vs HODL | PnL od kotwicy | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | $3435 | $-4.09 | $-72.82 (od 2026-08-27) | w zakresie | 9.5% | — | | #5887690 | base-cbbtc-weth-005 | $2268 | $- ...

### `journal/reports/morning-2026-08-30.md:204`

journal/reports/morning-2026-08-30.md:204-213 | 2026-08-30 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3448 | $-2.75 | $-59.19 (od 2026-08-27) | $2.80 | $0. ...

### `journal/reports/morning-2026-08-31.md:219`

journal/reports/morning-2026-08-31.md:219-228 | 2026-08-31 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 6 run(s): contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #4

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3430 | $-4.60 | $-77.48 (od 2026-08-27) | $4.39 | $1. ...

### `journal/reports/morning-2026-09-17.md:256`

journal/reports/morning-2026-09-17.md:256-265 | 2026-09-17 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 6 run(s): contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #5

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3432 | $-4.34 | $-75.21 (od 2026-08-27) | $24.65 | $1 ...

### `journal/reports/morning-2026-09-14.md:276`

journal/reports/morning-2026-09-14.md:276-285 | 2026-09-14 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 5 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3485 | $-0.41 | $-22.22 (od 2026-08-27) | $18.74 | $1 ...

### `journal/reports/morning-2026-09-12.md:276`

journal/reports/morning-2026-09-12.md:276-285 | 2026-09-12 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 5 run(s): contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #3

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3488 | $-0.33 | $-19.98 (od 2026-08-27) | $17.64 | $1 ...

### `journal/reports/morning-2026-09-18.md:270`

journal/reports/morning-2026-09-18.md:270-279 | 2026-09-18 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #4

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3466 | $-1.38 | $-41.50 (od 2026-08-27) | $26.09 | $1 ...

### `journal/reports/morning-2026-09-04.md:239`

journal/reports/morning-2026-09-04.md:239-248 | 2026-09-04 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 4 run(s): contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #2, hybrid-rerank #2

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3487 | $-0.35 | $-20.50 (od 2026-08-27) | $9.07 | $1. ...

### `journal/TASKS-UI.md:773`

journal/TASKS-UI.md:773-802 | no date | Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): ikony stanu pozycji
In top 5 of 3 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1, vector #2

> ## Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): ikony stanu pozycji Zgłoszenie Rafała: „teraz jest cały czas zielona kropka nawet dla wypadniętych" — pozycja poza zakresem nie zarabia opłat, a wyglądała identycznie jak zdrowa. - [x] `PaperTradingPanel.tsx`: `statusIcon(status, ...

### `journal/CONTEXT.md:755`

journal/CONTEXT.md:755-795 | 2026-09-03 | 2026-09-03 ~rano — Brief (Fable) + WERDYKT RUNDY 2 KSZTAŁTU: pasmo symetryczne w cenie bije produkt 4/4 + fix cache kole
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #1

> ### 2026-09-03 ~rano — Brief (Fable) + WERDYKT RUNDY 2 KSZTAŁTU: pasmo symetryczne w cenie bije produkt 4/4 + fix cache kolektora BRIEF (raport 07:30, PC po wymianie dysku — 195 GB wolne, noc przebiegła): fetch/wide-score/wide-daily/lejek OK, ale **backtest-run w toku od 03:43 jeszcze o 07:30** — pr ...

### `journal/reports/morning-2026-09-16.md:237`

journal/reports/morning-2026-09-16.md:237-246 | 2026-09-16 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #2

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3404 | $-8.02 | $-103.95 (od 2026-08-27) | $22.13 | $ ...

### `journal/reports/morning-2026-09-06.md:219`

journal/reports/morning-2026-09-06.md:219-228 | 2026-09-06 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3482 | $-0.54 | $-25.76 (od 2026-08-27) | $10.35 | $1 ...

### `journal/reports/morning-2026-09-13.md:276`

journal/reports/morning-2026-09-13.md:276-285 | 2026-09-13 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 2 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3493 | $-0.19 | $-14.96 (od 2026-08-27) | $17.87 | $1 ...

### `journal/HANDOFF.md:641#p5`

journal/HANDOFF.md:863-922 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #4

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) NATYCHMIAST po pushu ping CC-Win — wdrożenie to sam `nssm restart homos-bot`, bez builda. - [Fable→CC-Mac, 29.08 ~21:xx — DOCS, zamknięcie dnia] Commit+push: `CONTEXT.md` (obalenie wariantu bez swapu na obu pulach + recent90, falsyfikacja  ...

### `docs/UI-DESIGN.md:135`

docs/UI-DESIGN.md:135-147 | no date | 7. Rotation policy: weakest position → better opportunity
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #3

> ## 7. Rotation policy: weakest position → better opportunity Positions are ranked by **realised net APR** (fees − costs, since opening and trailing 7 days). The weakest position is a candidate for closing if there is a pool where `expected_APR_new − APR_current` covers the full switching cost (exit ...

### `journal/reports/morning-2026-09-09.md:232`

journal/reports/morning-2026-09-09.md:232-241 | 2026-09-09 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 2 run(s): hybrid-rerank-1024 #4, hybrid-rerank #4

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3481 | $-0.55 | $-26.13 (od 2026-08-27) | $12.88 | $1 ...

### `journal/CONTEXT.md:116#p2`

journal/CONTEXT.md:153-188 | 2026-09-21 | 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%)
In top 5 of 1 run(s): query-pl-hybrid-rerank #1

> 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%) Dekompozycja: LP FlatWide 27.08–18.09 +$38 (fee ~$29 + beta), zakład spot 18–21.09 ≈ +$300 (ETH $2 556 → $2 756, cbBTC $80,2k → $86k). Koszty łączne wyjścia (Uniswap + Kraken + gaz) ≈ $25. Poza transzą (nie  ...

### `journal/TASKS-UI.md:1190`

journal/TASKS-UI.md:1190-1235 | no date | PARTIA 17 — panel zbiorczy REALNYCH pozycji + linia CYKLU FlatWide ✅ wykonana (Sonnet 28.08; prośba Rafała 28.08 wieczór
In top 5 of 1 run(s): vector #1

> ## PARTIA 17 — panel zbiorczy REALNYCH pozycji + linia CYKLU FlatWide ✅ wykonana (Sonnet 28.08; prośba Rafała 28.08 wieczór, spec Fable) Kontekst bot-side (już w paczce): `/api/state` ma teraz (1) root `flatParams: { enterGap, exitGap, confirmH, ... }` (żywe parametry detektora — NIE hardkodować 12 ...

### `journal/RESEARCH-QUEUE.md:1155`

journal/RESEARCH-QUEUE.md:1155-1195 | no date | E6b. KSZTAŁT SZEROKIEJ NOGI (02.09, brief „świeże spojrzenie" — decyzja Rafała: koniecznie)
In top 5 of 1 run(s): vector #4

> ### E6b. KSZTAŁT SZEROKIEJ NOGI (02.09, brief „świeże spojrzenie" — decyzja Rafała: koniecznie) - [ ] **Krzywy przedział**: produktowe „±50%" = −33/+50 w cenie (log-symetria w rangeAround i advisor.suggestFixedRange). Warianty −50/+50, −60/+35, −65/+30, −70/+25 (cbBTC: −40/+40, −50/+30,  ...

### `journal/reports/morning-2026-09-02.md:219`

journal/reports/morning-2026-09-02.md:219-228 | 2026-09-02 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #5

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3415 | $-6.49 | $-92.87 (od 2026-08-27) | $6.20 | $1. ...

### `journal/TASKS-UI.md:592#p2`

journal/TASKS-UI.md:640-681 | no date | PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08)
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08) `stateBands()` uodporniona na brak `status` (realne pozycje: cieniowanie tylko po `!inRange`, nigdy "cash" — tego stanu tam nie ma). `PaperTradingPanel.tsx` zaktualizowany, żeby importować z nowe ...

### `docs/PLAN.md:99`

docs/PLAN.md:99-106 | no date | 3.6. The rebalance policy is richer than "went out of range → move it"
In top 5 of 1 run(s): meta-index-hybrid #5

> ### 3.6. The rebalance policy is richer than "went out of range → move it" Gaps in the proposed profitability condition: - **Hysteresis / buffer zones**: rebalance only when the price exceeds the range by X% or stays outside it for T minutes (protection against whipsaw), - **Market regime filter**: ...

### `journal/reports/morning-2026-09-05.md:219`

journal/reports/morning-2026-09-05.md:219-228 | 2026-09-05 | POZYCJE REALNE (produkt FlatWide)
In top 5 of 1 run(s): meta-index-hybrid-rerank #5

> ## POZYCJE REALNE (produkt FlatWide) | pozycja | pula | postura | wartość | vs HODL | PnL od kotwicy | fee narosłe | tempo $/d | zakres | gap EMA | flat | |---|---|---|---|---|---|---|---|---|---|---| | #5886957 | base-weth-usdc-030 | SZEROKI | $3443 | $-3.25 | $-64.57 (od 2026-08-27) | $9.92 | $1. ...

### `journal/HANDOFF.md:641#p4`

journal/HANDOFF.md:809-863 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 1 run(s): vector #5

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) - `src/hooks/useRotateExecution.ts` — te same 3 podmiany. TŁO (incydent ~12:3x, pierwsza bojowa sekwencja FLAT_NARROW #5887690): błąd Rabby+publicnode "Invalid parameters" na `eth_getTransactionReceipt` wysadzał sekwencję po KAŻDEJ wysłanej ...

## id-04 (identifier, answerable: yes)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

**Reference:** Functionality, not tests: D0 'detektor→pomiar', decided at the 31.08 review, had two tasks, stop the flat detector from emitting FLAT_NARROW/FLAT_WIDEN cards while keeping episode measurement and logs, and clean up three leftover 'k×σ' labels; it was to be deployed only after the narrowing episode closed, was still pending on 16.09 and was never deployed.

Evidence now: `journal/RESEARCH-QUEUE.md:498-507`, `journal/CONTEXT.md:262-263`, `journal/CONTEXT.md:273-274`, `journal/CONTEXT.md:1245-1245`, `journal/CONTEXT.md:239-240`.

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 14 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #3, hybrid-rerank #4, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #3, hybrid-stem-prefix6 #3, meta-index-hybrid #3, meta-index-hybrid-rerank #5, vector #3

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `journal/HANDOFF.md:641#p2`

journal/HANDOFF.md:699-751 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #1, meta-index-hybrid #4, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) BEZ zmian w kodzie (bot/config, observer, useBotApi mają być identyczne z HEAD — jeśli `git status` pokazuje je jako zmienione, to artefakt mountu; `git diff` ma być pusty). Komunikat: "docs: wide-daily numbers sanity-checked, UI 21+22 de ...

### `docs/AI-WORKFLOW.md:25`

docs/AI-WORKFLOW.md:25-55 | no date | The two coordination files
In top 5 of 7 run(s): hybrid-rerank-1024 #4, hybrid-rerank #5, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, hybrid-stem-prefix6 #1, meta-index-hybrid #1, vector #1

> ## The two coordination files Sessions cannot see each other. They coordinated through the repository: - **`CONTEXT.md` — the living journal.** Section 1: the current state, newest first. Section 2: the decision table (translated in `DECISION-LOG.md`). Section 4: a dated log of every session —  ...

### `journal/RESEARCH-QUEUE.md:509`

journal/RESEARCH-QUEUE.md:509-527 | no date | D. OPERACYJNE PRZYPOMNIENIA
In top 5 of 6 run(s): contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4

> ## D. OPERACYJNE PRZYPOMNIENIA - [x] Test fizycznego rebootu Windows — ✅ POTWIERDZONE (Rafał, 20.08: kilka restartów, usługi NSSM wstają same). POZOSTAŁO (Rafał, ręcznie w BIOS): ustawić auto-power-on po awarii zasilania (AC Power Loss → Power On / Restore Last State) — 19.08 komputer nie wst ...

### `journal/CONTEXT.md:3140`

journal/CONTEXT.md:3140-3151 | 2026-08-10 | 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
In top 5 of 6 run(s): hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #2, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #4

> ### 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup Wykonano TASKS-WINDOWS-ADDENDUM.md (boty niewidoczne, bez okien konsoli): - Usunięto autostart `pm2-windows-startup` (`pm2-startup uninstall`, wpis w `HKCU\...\Run` zniknął). - Zainstalowano NSSM (`winget install nssm`) — na t ...

### `journal/TASKS-WINDOWS-ADDENDUM.md:1`

journal/TASKS-WINDOWS-ADDENDUM.md:1-20 | no date | TASKS-WINDOWS — ADDENDUM: boty mają być NIEWIDOCZNE
In top 5 of 4 run(s): contextual-haiku-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #5, hybrid-stem-prefix6 #4, meta-index-hybrid #5

> # TASKS-WINDOWS — ADDENDUM: boty mają być NIEWIDOCZNE > Kontekst: użytkownik zabił procesy — pm2 wystartowany przez pm2-windows-startup > otwiera widoczne czarne okna konsoli. Docelowo: usługi systemowe bez żadnych okien. - [x] 1. (10.08) Usunięto autostart pm2-windows-startup (`pm2-startup uninst ...

### `docs/AI-WORKFLOW.md:1`

docs/AI-WORKFLOW.md:1-6 | no date | How the project was run with AI sessions
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2, vector #4

> # How the project was run with AI sessions HOMOS was developed by one engineer between 10 August and 22 September 2026 with four specialised Claude sessions working in parallel. This document describes the protocol, because it is the part of the project most people ask about, and because the commit ...

### `journal/HANDOFF.md:641#p8`

journal/HANDOFF.md:1030-1087 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #4

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) - [Fable→CC-Mac, 28.08 ~popołudnie #2 — DOCS zamknięcie dnia] Commit+push: RESEARCH-QUEUE.md (paczka decyzyjna E4/1.09), HANDOFF.md (higiena + stan), CONTEXT.md (dziennik). Komunikat: "docs: dzień 1 produktu domknięty — paczka decyzyjna fla ...

### `journal/reports/morning-2026-09-03.md:51`

journal/reports/morning-2026-09-03.md:51-65 | 2026-09-03 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4

> ## pipeline-task.log (tail) ``` 2026-09-03T03:43:18.817Z ▶ hs-arbitrum-weth-usdc-005-720d (podejście 1/2) 2026-09-03T03:43:23.671Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1788406998817.log) 2026-09-03T03:43:23.671Z ▶ hs-base-cbbtc-weth-005- ...

### `docs/DB-SCHEMA.md:40#p2`

docs/DB-SCHEMA.md:107-162 | no date | 2. Schema — DDL v1 (draft to be frozen at implementation)
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #2

> 2. Schema — DDL v1 (draft to be frozen at implementation) CREATE TABLE paper_event ( ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id), kind TEXT NOT NULL,                     -- OPEN|REBALANCE|EXIT_TREND|REENTRY|HEDGE_OPEN|HEDGE_CLOSE payload TEXT NOT NULL,                  -- J ...

### `journal/CONTEXT.md:3943`

journal/CONTEXT.md:3943-3969 | 2026-08-11 | 2026-08-11 ~13:30 — Sesja Fable-desktop (pobudka popołudniowa): checklista odhaczona
In top 5 of 1 run(s): query-pl-hybrid-rerank #2

> ### 2026-08-11 ~13:30 — Sesja Fable-desktop (pobudka popołudniowa): checklista odhaczona - **A2 base-030-365d: FETCH ZAKOŃCZONY** (state nextBlock 49 791 594 > cel 49 791 593; ndjson zamknięty 09:45). Walk-forwardy 45/15 i 60/15 na tej puli JUŻ zrobione (runy 10fd366) i ZINTERPRETOWANE w ramach  ...

### `docs/AI-WORKFLOW.md:8`

docs/AI-WORKFLOW.md:8-23 | no date | The four roles
In top 5 of 1 run(s): vector #2

> ## The four roles | Session | Where it ran | Role | |---|---|---| | **Fable** (analysis) | cloud, always available (also from a phone) | research, strategy design, backtest interpretation, core/bot code, coordination, morning briefs, pushback on trade decisions | | **CC-Mac** (Claude Code) | termin ...

### `journal/CONTEXT.md:7#p2`

journal/CONTEXT.md:48-77 | no date | 1. Stan projektu — skrót
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #4

> 1. Stan projektu — skrót ROZLICZENIE TRANSZY (pytanie Rafała): kokpit pokazuje PnL od KOTWIC pozycji ($5,857), nie od 6 092 USDC — różnica to bufor ~$150 WETH w portfelu (poza panelem) + ~$75 jednorazowych kosztów wejścia (4 swapy + gaz), a nie strata. Do zbudowania: „bilans transzy" liczon ...

### `journal/CONTEXT.md:3081`

journal/CONTEXT.md:3081-3119 | 2026-08-10 | 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
In top 5 of 1 run(s): meta-index-hybrid-rerank #4

> ### 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ) Wykonano `TASKS-WINDOWS.md` (kroki 1–10) na stacjonarnym Windows użytkownika, repo w `C:\Projects\homos`. Szczegóły w TASKS-WINDOWS.md, skrót tutaj: - **Środowisko**: Node v24.18.0 (nowszy niż wymagane v22.x — działa poprawnie, ...

### `journal/RESEARCH-QUEUE.md:684#p3`

journal/RESEARCH-QUEUE.md:771-810 | no date | H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #5

> H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie) Docelowa architektura: kapitał LP na sprzętowym + osobny mały portfel operacyjny (hot) wyłącznie pod przyszły automat hedge'a. Przy wdrożeniu pamiętać: blind signing dla multicalli (kompensowane podglądem Rabby), migracja pozy ...

### `journal/CONTEXT.md:4300#p2`

journal/CONTEXT.md:4329-4359 | 2026-08-21 | 2026-08-21 ~16:0x — Wdrożenie UI OK, ale cofnęliśmy migrację NSSM→pm2 (mój błąd instrukcji)
In top 5 of 1 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5

> 2026-08-21 ~16:0x — Wdrożenie UI OK, ale cofnęliśmy migrację NSSM→pm2 (mój błąd instrukcji) Kolejność: `pm2 delete all` + `pm2 kill` → `pm2 unstartup` + kontrola klucza Run w rejestrze → `nssm start` obu usług → pull poprawionego deployu → sanity. Przy okazji domykamy krok 6 addendum z 10.08 (test  ...

### `journal/HANDOFF.md:641#p3`

journal/HANDOFF.md:751-808 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #5

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) NATYCHMIAST po pushu ping CC-Win (SendMessage): przebiegi shape + deploy (wpisy w ich skrzynce). - [Fable→CC-Mac, 01.09 ~12:xx — PACZKA „BILANS: ruch rynku zamkniętych pozycji"] Commit+push: `bot/observer.ts` (fix: marketPnl bilansu transz ...

### `journal/TASKS-LIFECYCLE.md:1`

journal/TASKS-LIFECYCLE.md:1-6 | no date | TASKS-LIFECYCLE.md — pełny lifecycle puli (pomysł Rafała 25.08, spec 26.08)
In top 5 of 1 run(s): hybrid-stem-prefix6 #5

> # TASKS-LIFECYCLE.md — pełny lifecycle puli (pomysł Rafała 25.08, spec 26.08) > Decyzja przeglądu 26.08: SPEC teraz, BUDOWA dopiero PO wdrożeniu paczki > rekalibracyjnej (TASKS-RECAL.md) — lifecycle ma działać na nowej σ, > bramce 720d+recent90 i ujednoliconej histerezie, nie na starych. > Dotyka:  ...

### `journal/TASKS-INFRA.md:9`

journal/TASKS-INFRA.md:9-38 | no date | Zadania
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> ## Zadania - [x] **1. `.gitignore` porządny** (przygotowanie pod GitHub): node_modules, dist, data/cache/, data/llama/, .agent/, .bot/, .env*, legacy-*.bak, backtest/results/, public/bundle.js*. Sprawdź, że .env NIE jest w historii (jest w starym .gitignore?). - [x] **2. Pliki wdrożeniowe Windo ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 1 run(s): vector #5

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

## id-05 (identifier, answerable: yes)

**Q:** What does the function fetchFreshPool do?

**Reference:** It re-reads the pool state on-chain (factory.getPool, then slot0 and liquidity) right before the mint step of a rebalance or rotation, so the new position is built from the current price instead of the price captured when the modal opened, and falls back to the old pool if the lookup fails; it was added after the 11.09 widening failed once on 'Price slippage check' and was never exercised live, since the only later chance (a FLAT_NARROW card on 16.09) was not signed and the positions were closed by hand in Uniswap.

Evidence now: `journal/CONTEXT.md:288-291`, `journal/CONTEXT.md:350-355`, `journal/HANDOFF.md:256-257`, `journal/CONTEXT.md:264-265`.

### `journal/TASKS-UI.md:225#p1`

journal/TASKS-UI.md:225-276 | no date | PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała)
In top 5 of 7 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #2

> PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała) KONTEKST: bot prowadzi teraz PAPER TRADING (bot/paper.ts) — wirtualny portfel $10k na każdą pulę z BOT_POOLS, prowadzony przez ALGORITHM v1.2 na żywych danych (fees z trailing fee-yiel ...

### `journal/TASKS-FUNNEL.md:10`

journal/TASKS-FUNNEL.md:10-39 | no date | 1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30)
In top 5 of 5 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #4, query-pl-hybrid-rerank #5

> ## 1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30) Świadomie BEZ nowego automatu w Harmonogramie (lekcja 18.08: mniej ruchomych części). Nowy krok `candidate-funnel` w `scripts/pipeline.ts`, po hs-*/freshness, PRZED backtest-run (żeby OOM backtestu nie zabił lejka). 1. **Kwalifikacja* ...

### `journal/RESEARCH-QUEUE.md:7#p2`

journal/RESEARCH-QUEUE.md:51-93 | no date | A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
In top 5 of 5 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2

> A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline) - [x] **Egzotyki tick-level (werdykt majors vs egzotyki)** — DANE POBRANE (A4): - **DORY-USDC (Arbitrum 1%) to uniswap-V4** (universe.json: project=uniswap-v4, pool ae3c1ac2…, tokeny DORY 0x33b49f22…436ae / USDC natywny 0xaf88…5831).  ...

### `journal/TASKS-UI.md:317#p1`

journal/TASKS-UI.md:317-350 | no date | PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zlecone przez Fable 18.08 (pomysł Rafała)
In top 5 of 5 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank-meta-1024 #5, query-pl-hybrid-rerank #3, vector #4

> PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zlecone przez Fable 18.08 (pomysł Rafała) KONTEKST: selektor codziennie (po 8:00) liczy ranking pul wg polityki ALGORITHM (7d śr. apyBase, persystencja ≥3d, majors, TVL≥$3M, ETH/Base/Arb) i od teraz zapisuje TOP 10 do `.bot/selector-r ...

### `journal/RESEARCH-QUEUE.md:529#p2`

journal/RESEARCH-QUEUE.md:563-595 | no date | E. WDROŻENIA KODU (dla Claude Code / terminala)
In top 5 of 5 run(s): hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4

> E. WDROŻENIA KODU (dla Claude Code / terminala) Pasywny full-range +77.5 (vsHODL +0.37, fees $124); pasywny ±50% +75.1 (vsHODL +0.01, fees $486 ≈ 19.7%/r fee-yield). WSZYSTKIE aktywne PRZEGRYWAJĄ z HODL: ±5% naiwny −33.8 p.p. (trend+gas $248), ±15% −15.4, adapt k2h24 −11.2, k3h24 −1.8. WNIOSK ...

### `journal/CONTEXT.md:4195`

journal/CONTEXT.md:4195-4238 | 2026-08-21 | 2026-08-21 10:4x — Odbiór raportów CC-Win: fix swap-cache DZIAŁA na produkcji + pierwszy przelicz na świeżych danych
In top 5 of 4 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #4, query-pl-hybrid-rerank #4

> ### 2026-08-21 10:4x — Odbiór raportów CC-Win: fix swap-cache DZIAŁA na produkcji + pierwszy przelicz na świeżych danych KROK 1 (fix HyperSync) ZWERYFIKOWANY NA ŻYWO. `--dry-run` zachował się dokładnie jak w moim teście offline (`latest odświeżony: 50167847 → 50253445 (+85598 bl)`, 38712 swapów, nic ...

### `journal/CONTEXT.md:4085#p1`

journal/CONTEXT.md:4085-4123 | 2026-08-21 | 2026-08-21 (Fable, po briefie) — FIX: zamrożony `latest` w fetch-swaps-hypersync.ts (cichy stop całego swap-cache)
In top 5 of 3 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #4, vector #3

> 2026-08-21 (Fable, po briefie) — FIX: zamrożony `latest` w fetch-swaps-hypersync.ts (cichy stop całego swap-cache) Zgłoszenie CC-Win potwierdzone co do joty: 18/18 pul miało w meta.json `latest` zamrożony, a `state.json.nextBlock == latest+1` (sprawdzone na plikach w data/cache — np. arbitrum-usdc- ...

### `docs/PLAN.md:131`

docs/PLAN.md:131-149 | no date | 4. Where the profit comes from — the objective function
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #3

> ## 4. Where the profit comes from — the objective function ``` Net profit = LP fees + Funding from the hedge (may be ±) − LVR / realised IL − Gas (rebalance, collect, compound) − Slippage of rebalancing swaps − Hedge venue costs ``` Levers of  ...

### `journal/TASKS-UI.md:317#p2`

journal/TASKS-UI.md:350-378 | no date | PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zlecone przez Fable 18.08 (pomysł Rafała)
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, vector #2

> PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zlecone przez Fable 18.08 (pomysł Rafała) CSS `topranking-*`; UWAGA: istnieje stary `TopPools.tsx` (DefiLlama client-side, sekcja "Top pule" z sesji 2e) — NIE ruszać go w tej partii; decyzja o scaleniu/wycofaniu zapadnie osobno. ...

### `journal/CONTEXT.md:3806`

journal/CONTEXT.md:3806-3848 | 2026-08-11 | 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA
In top 5 of 1 run(s): meta-index-hybrid #2

> ### 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA **1. BUG KRYTYCZNY silnika backtestu naprawiony**: `unitPrices` zakładał parę ETH/stable (nie-ETH-owa noga = $1). Dla par kwotowanych w WETH (cbBTC/WETH, WTAO/WETH) WSZYSTKIE dotych ...

### `journal/CONTEXT.md:2871#p1`

journal/CONTEXT.md:2871-2900 | 2026-08-10 | 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie z botem ✅
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #3

> 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie z botem ✅ Wykonane wszystkie 4 zadania z TASKS-UI.md Partia 2 (plus dokończone/zweryfikowane zaległości z Partii 1 — patrz TASKS-UI.md, były już zaimplementowane w kodzie, tylko nieodhaczone). Zakres: wyłącznie UI, nie dotknięto ...

### `journal/TASKS-FUNNEL.md:167`

journal/TASKS-FUNNEL.md:167-193 | no date | Piętro 2 — FETCH + SCREEN dla top ~50 score (nocami, porcjami)
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #5

> ### Piętro 2 — FETCH + SCREEN dla top ~50 score (nocami, porcjami) > **STATUS 02.09 (Fable, decyzja Rafała „niech się już powoli zbiera"): > ZAIMPLEMENTOWANE — `scripts/wide-collect.ts` (`npm run wide:collect`).** > Kolejka z najnowszego wide-score: top `--per-class 8` KAŻDEJ klasy > (pegged/LST/sta ...

### `journal/CONTEXT.md:2979`

journal/CONTEXT.md:2979-2987 | 2026-08-10 | 2026-08-10 — Sesja 2e: Konfiguracja pul + Base + moduł Top Pools (zaimplementowane i zweryfikowane na żywo)
In top 5 of 1 run(s): vector #5

> ### 2026-08-10 — Sesja 2e: Konfiguracja pul + Base + moduł Top Pools (zaimplementowane i zweryfikowane na żywo) - **`src/config/pools.ts`** (nowy): obserwowane pule jako KONFIGURACJA (chainId, tokeny, tiery, rola portfelowa core/correlated/stable) — dodawanie pul = edycja jednego pliku. - **`src/com ...

## id-06 (identifier, answerable: yes)

**Q:** What project stage was E8.2?

**Reference:** E8.2 'dom kasyna' was the research experiment in the E8 queue (classes without LVR, alternatives to LP) testing whether LPs of perp vaults (GM v2, JLP, GLP; HLP had too little data) earn a house edge over HODL of the same beta; after iterations E8.2b-f and three data bugs it closed on 09.09 evening as conditionally yes: worth watching, not for tranche-1 capital.

Evidence now: `journal/RESEARCH-QUEUE.md:294-301`, `journal/RESEARCH-QUEUE.md:324-324`, `journal/CONTEXT.md:482-485`, `journal/CONTEXT.md:495-496`, `journal/CONTEXT.md:684-694`, `journal/CONTEXT.md:461-461`.

### `journal/RESEARCH-QUEUE.md:367#p1`

journal/RESEARCH-QUEUE.md:367-405 | no date | E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISANY, tsc czysty, arytmetyka przetestowana na syntet
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #1

> E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISANY, tsc czysty, arytmetyka przetestowana na syntetyku w sandboxie; fetch'e sieciowe NIE testowane — sandbox bez sieci, pierwszy run u CC-Mac jest testem) > Skrypty (npm): `e8:bench`, `e8:funding:hl`, `e8:dvol`, `e8:vault`, > `e8: ...

### `journal/CONTEXT.md:721`

journal/CONTEXT.md:721-723 | 2026-09-07 | 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + Rafał): sekcja E8 w RESEARCH-QUEUE
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank-1024 #4, hybrid-rerank #5, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, hybrid-stem-prefix6 #2, meta-index-hybrid #3, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4, vector #4

> ### 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + Rafał): sekcja E8 w RESEARCH-QUEUE Rafał poprosił o świeże spojrzenie na CONTEXT/RESEARCH-QUEUE: co jeszcze warte badania i jak sprawdzić, czy praca może być dochodowa. Wniosek Fable: klasa AMM v3 na parach zmiennych zamknięta  ...

### `journal/HANDOFF.md:29#p1`

journal/HANDOFF.md:29-83 | no date | @Fable (sesja analityczna)
In top 5 of 3 run(s): contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #5

> @Fable (sesja analityczna) > **STAN 21.09 ~19:30 PL — TRANSZA 1 ZAMKNIĘTA W CAŁOŚCI DO EUR > (Kraken): ≈ +$336 (+5,5%) w 25 dni; LP FlatWide +$38, zakład spot > 18–21.09 ≈ +$300. Zero pozycji, zero krypto transzy. Bot/serwer/raport > 07:30 zostają do 24.09; nocny pipeline do PAUZY (zlecenie CC-Win  ...

### `journal/CONTEXT.md:593`

journal/CONTEXT.md:593-637 | 2026-09-08 | 2026-09-08 ~rano — BRIEF (Fable + Rafał): odbiór E8.2c (CC-Mac) + E8.3 (CC-Win); **GLP po regresji 2-czynnikowej = BRAK 
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #5

> ### 2026-09-08 ~rano — BRIEF (Fable + Rafał): odbiór E8.2c (CC-Mac) + E8.3 (CC-Win); **GLP po regresji 2-czynnikowej = BRAK EDGE'U**, E8.3 ZAMKNIĘTE BRIEF (raport 07:30): automat czysty (03:42→04:58, backtest-run 1h09, porażki BRAK), zero propozycji, kolejka pusta, down:false 6/6, selektor edge −20. ...

### `journal/HANDOFF.md:29#p2`

journal/HANDOFF.md:83-138 | no date | @Fable (sesja analityczna)
In top 5 of 1 run(s): hybrid-rerank-meta-1024 #5

> @Fable (sesja analityczna) ORGANIZACYJNIE (decyzja Rafała 09.09): dalsze zlecenia E8 idą do CC-Win (24/7) — Twoja skrzynka jest pusta, żadnych przerw. Szczegóły CONTEXT 09.09. Wpis skasowany — higiena.) (E8.2c GLP PRZEZ BESSĘ ODEBRANE przez Fable 08.09 ~rano — dzięki za komplet 4 przebiegów i za h ...

## id-07 (identifier, answerable: yes)

**Q:** In which database were the backtest results stored?

**Reference:** In none: backtest results were JSON files in backtest/results/ (for example walkforward-*-720d-30d.json) plus an HTML report; a SQLite database was designed in DB-SCHEMA.md, including a backtest_run table meant only to index those files, but it was never implemented, and the bot ledger shipped as ndjson with CSV export.

Evidence now: `journal/CONTEXT.md:2994-2994`, `journal/DECYZJE-2026-08-26.md:548-548`, `journal/RESEARCH-QUEUE.md:122-122`, `docs/DB-SCHEMA.md:3-4`, `docs/DB-SCHEMA.md:139-145`, `docs/INFRA.md:31-32`.

### `docs/DB-SCHEMA.md:164`

docs/DB-SCHEMA.md:164-172 | no date | 3. What is deliberately outside the database | already listed as related
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #1

> ## 3. What is deliberately outside the database - **Raw tick-level swaps** (`data/cache/*.ndjson`, millions of rows per pool) — stay in files: the backtest reads them sequentially, the database adds nothing here and would bloat by orders of magnitude. The database holds only `backtest_run` (r ...

### `journal/reports/morning-2026-08-20.md:51`

journal/reports/morning-2026-08-20.md:51-65 | 2026-08-20 | pipeline-task.log (tail)
In top 5 of 11 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #4, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4, vector #5

> ## pipeline-task.log (tail) ``` 2026-08-20T05:49:03.979Z świeżość swap cache: OK=[arbitrum-usdc-usdt-001, arbitrum-weth-usdc-005-365d, arbitrum-weth-usdc-030-365d, base-cbbtc-weth-005-365d, base-weth-usdc-005-365d, base-weth-usdc-005, base-weth-usdc-030-365d, mainnet-dai-usdt-001, mainnet-tbtc-wbtc- ...

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 7 run(s): hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3, vector #2

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `journal/RESEARCH-QUEUE.md:597#p1`

journal/RESEARCH-QUEUE.md:597-639 | 2026-08-10 | F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10)
In top 5 of 4 run(s): contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #2, query-pl-hybrid-rerank #2

> F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10) > Kontekst: screen "Earned $6,912 / 5.6d / $281k" = 3.1%/tydz. — realne dla > ultra-wąskiego LP na parach spiętych (LST-ETH, stable-stable): brak IL w > normalnych warunkach, koncentracja ×dziesiątki. Ukryte ryzyko: depeg (wąs ...

### `journal/HANDOFF.md:1264#p2`

journal/HANDOFF.md:1320-1377 | no date | @CC-Win (Claude Code od botów windowsowych)
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5

> @CC-Win (Claude Code od botów windowsowych) Jedno techniczne odstępstwo od zlecenia: run arbitrum-weth-usdc-005-720d padł na OOM w domyślnym limicie heap Node [cache 3.4 GB ndjson], powtórzony z NODE_OPTIONS=--max-old-space-size=8192 — odnotowane w raporcie do Fable. Wpis skasowany — higiena.) (OD ...

### `journal/reports/morning-2026-09-01.md:51`

journal/reports/morning-2026-09-01.md:51-65 | 2026-09-01 | pipeline-task.log (tail)
In top 5 of 3 run(s): hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5

> ## pipeline-task.log (tail) ``` 2026-09-01T03:42:47.724Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-01T03:42:53.545Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1788234167724.log) 2026-09-01T03:42:53.547Z świeżość swap cache: OK=[arbitrum- ...

### `journal/CONTEXT.md:4554#p7`

journal/CONTEXT.md:4827-4857 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 2 run(s): hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 Jutro 07:30: pierwszy raport w pełnym nowym reżimie (sekcja Kandydaci, Peak RSS z nowym limitem); 08:00 Rafał siada do przeglądu DECYZJE-2026-08-26. Fałszywy alarm: "luka observer.log 19→25.08" — ...

### `journal/reports/morning-2026-08-30.md:7#p2`

journal/reports/morning-2026-08-30.md:32-49 | 2026-08-30 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4

> pipeline.log (ostatni przebieg) (log: data\pipeline-logs\hs-base-weth-usdc-030-720d-1788061350224.log) 2026-08-30T03:42:36.551Z ▶ hs-mainnet-usdc-weth-005-720d (podejście 1/2) 2026-08-30T03:42:39.305Z krok hs-mainnet-usdc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-005-720d- ...

### `journal/reports/morning-2026-08-31.md:51`

journal/reports/morning-2026-08-31.md:51-65 | 2026-08-31 | pipeline-task.log (tail)
In top 5 of 2 run(s): hybrid-rerank-1024 #5, hybrid-rerank #4

> ## pipeline-task.log (tail) ``` 2026-08-31T03:42:28.691Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-31T03:42:31.787Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1788147748691.log) 2026-08-31T03:42:31.790Z świeżość swap cache: OK=[arbitrum- ...

### `journal/RESEARCH-QUEUE.md:812`

journal/RESEARCH-QUEUE.md:812-834 | no date | G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne)
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #5

> ## G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne) - [ ] Runner: opcjonalne załączanie wskazanych plików wyników do commita (backtest/results/ jest gitignored — dziś wraca tylko ogon konsoli w done/; pole "attach": ["backtest/results/scan-universe.json"] w zadaniu → runner kopiuje do  ...

### `docs/PLAN.md:108`

docs/PLAN.md:108-115 | no date | 3.7. Backtest quality decides everything
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #4

> ### 3.7. Backtest quality decides everything The biggest trap: **a backtest on candles (OHLC) systematically overstates LP profits**, because it does not see the price path inside the candle nor the actual volume distribution across ticks. Requirements: - simulation on **swap-by-swap** data (`Swap` ...

### `journal/reports/morning-2026-08-23.md:51`

journal/reports/morning-2026-08-23.md:51-65 | 2026-08-23 | pipeline-task.log (tail)
In top 5 of 1 run(s): meta-index-hybrid-rerank #2

> ## pipeline-task.log (tail) ``` 2026-08-23T05:41:53.531Z ▶ hs-mainnet-weth-usdt-001-365d (podejście 1/2) 2026-08-23T05:41:55.751Z krok hs-mainnet-weth-usdt-001-365d: exit 0 (log: data\pipeline-logs\hs-mainnet-weth-usdt-001-365d-1787463713531.log) 2026-08-23T05:41:55.751Z ▶ hs-mainnet-usdc-weth-001-3 ...

### `journal/reports/morning-2026-09-20.md:7#p1`

journal/reports/morning-2026-09-20.md:7-31 | 2026-09-20 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-haiku-run2-hybrid-rerank #3

> pipeline.log (ostatni przebieg) ``` 2026-09-20T03:42:07.550Z krok hs-mainnet-wsteth-weth-001: exit 0 (log: data\pipeline-logs\hs-mainnet-wsteth-weth-001-1789875725975.log) 2026-09-20T03:42:07.550Z ▶ hs-mainnet-tbtc-wbtc-001 (podejście 1/2) 2026-09-20T03:42:09.135Z krok hs-mainnet-tbtc-wbtc-001: exi ...

### `journal/RESEARCH-QUEUE.md:684#p2`

journal/RESEARCH-QUEUE.md:728-771 | no date | H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #3

> H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie) - [ ] **SQLITE DLA LOGÓW/PAPER (pomysł Rafała 18.08)** — SCHEMAT ZAPROJEKTOWANY: **DB-SCHEMA.md** (zasady rozszerzalności: migracje numerowane, raw-bigint jako TEXT, JSON1 na płynne ładunki, słowniki jako tabele; DDL v1: pool/ve ...

### `docs/PAIRS.md:1`

docs/PAIRS.md:1-13 | no date | Pair and pool analysis — LP portfolio diversification
In top 5 of 1 run(s): vector #3

> # Pair and pool analysis — LP portfolio diversification > **Historical snapshot (10 Aug 2026).** This is the pre-backtest candidate list. The > portfolio that was actually adopted, and the evidence behind it, is in > [`ALGORITHM.md`](ALGORITHM.md) §6; the live tranche ran on two Base pools (WETH/US ...

### `journal/RESEARCH-QUEUE.md:95#p3`

journal/RESEARCH-QUEUE.md:189-232 | no date | B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)
In top 5 of 1 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #4

> B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty) | Sztywny ±15% (naiwny) | 8,297 | −53.0 | −8.90 | 28.3 | 979 | 40 | 5 | 100 | | Adaptacyjna k=2 h=24 pb7 | 8,573 | −46.3 | −5.86 | 30.6 | 1,185 | 32 | 4 | 86 | | Adaptacyjna k=2 h=12 pb7 | 9,122 | −31.0 | +0.17 | 27.5 | 694 | 16 ...

### `journal/RESEARCH-QUEUE.md:7#p1`

journal/RESEARCH-QUEUE.md:7-50 | no date | A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #4

> A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline) - [x] **Refetch mainnet-usdc-weth-030 (pełne 90d)** — ✅ DONE (Claude Code): 100.0%, **49210 swapów, 90.3 dni**. Wymagało kilku wznowień (skrypt wychodzi 0 mimo FAILED przy dławieniu archiwalnym publicznych RPC; resume ze state.json dogr ...

### `journal/reports/morning-2026-08-26.md:7#p2`

journal/reports/morning-2026-08-26.md:31-49 | 2026-08-26 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): hybrid-rerank-1024 #4

> pipeline.log (ostatni przebieg) (podejście 1/2) 2026-08-26T03:43:00.303Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1787715776129.log) 2026-08-26T03:43:00.303Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-26T03:43:03.335Z krok hs-bas ...

### `journal/TASKS-ROTATION.md:1`

journal/TASKS-ROTATION.md:1-18 | no date | TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierunek Rafała 26.08)
In top 5 of 1 run(s): vector #4

> # TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierunek Rafała 26.08) > ## ⛔ ZAMKNIĘTY 26.08 wieczór — ROTACJA ODRZUCONA DANYMI. > Backtest zbudowany (backtest/rotation.ts) i policzony TEGO SAMEGO dnia > (CC-Win: 2 okna × 2 silniki, raporty w gicie 4c54c74/339d3f2). Werdykt: > na ...

### `journal/reports/morning-2026-08-22.md:51`

journal/reports/morning-2026-08-22.md:51-65 | 2026-08-22 | pipeline-task.log (tail)
In top 5 of 1 run(s): hybrid-rerank #5

> ## pipeline-task.log (tail) ``` 2026-08-22T05:32:04.313Z ▶ hs-mainnet-weth-usdt-001-365d (podejście 1/2) 2026-08-22T05:32:06.794Z krok hs-mainnet-weth-usdt-001-365d: exit 0 (log: data\pipeline-logs\hs-mainnet-weth-usdt-001-365d-1787376724313.log) 2026-08-22T05:32:06.794Z ▶ hs-mainnet-usdc-weth-001-3 ...

### `journal/CONTEXT.md:3806`

journal/CONTEXT.md:3806-3848 | 2026-08-11 | 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> ### 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA **1. BUG KRYTYCZNY silnika backtestu naprawiony**: `unitPrices` zakładał parę ETH/stable (nie-ETH-owa noga = $1). Dla par kwotowanych w WETH (cbBTC/WETH, WTAO/WETH) WSZYSTKIE dotych ...

## na-01 (no-answer, answerable: partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

**Reference:** The corpus gives no tax amount and the application never calculated tax; it only kept a transaction ledger (designed as SQLite + CSV 'for Polish taxes', shipped as ndjson with CSV export), and the journal notes that the PIT-38 cost basis needs an older Kraken export covering the 24-25.08 on-ramp and that moving USDC to Kraken was an own transfer, not a taxable event.

Evidence now: none.

### `docs/EMERGENCY.md:88`

docs/EMERGENCY.md:88-106 | no date | 6. Off-ramp lessons
In top 5 of 10 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #5, hybrid-stem-prefix6 #1, meta-index-hybrid #1

> ## 6. Off-ramp lessons Not an emergency, but recorded here because they apply to every capital exit (the tranche was closed to EUR on 18–21 Sep 2026): - **Closing the LP** with "Remove liquidity" (100 %) in the Uniswap UI runs `decreaseLiquidity` + `collect` in one multicall, so fees come out wi ...

### `journal/TASKS-LEDGER.md:36`

journal/TASKS-LEDGER.md:36-62 | no date | 3. API + UI (lane Sonnet, po warstwie danych)
In top 5 of 9 run(s): contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> ## 3. API + UI (lane Sonnet, po warstwie danych) - `GET /api/ledger?days=N` i `GET /api/closed-positions` (server czyta .bot/). - Sekcja "Zamknięte pozycje" w kokpicie: karta per pozycja (wynik, fees, gaz, okres życia, link do tx) — dokładnie to, o co Rafał zapytał 25.08. - `GET /api/ledger.csv`  ...

### `docs/UI-DESIGN.md:13`

docs/UI-DESIGN.md:13-33 | no date | 1. As built vs planned
In top 5 of 9 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #2, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #3

> ## 1. As built vs planned **Built** - A single-page **cockpit** (`MorningCockpit.tsx`) that is the whole application. The older "Manage" section (pool browser, manual Add Liquidity, My Positions, Top Pools) was removed on 21 Aug, once the cockpit covered opening, rebalancing, rotation and hedgi ...

### `journal/CONTEXT.md:2931`

journal/CONTEXT.md:2931-2941 | 2026-08-10 | 2026-08-10 — Sesja 2: Faza 0 — naprawa obliczeń
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #4, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3

> ### 2026-08-10 — Sesja 2: Faza 0 — naprawa obliczeń - **Nowy moduł `src/utils/v3math.ts`**: dokładny port TickMath + LiquidityAmounts na natywnym `bigint` (getSqrtRatioAtTick, getAmountsForLiquidity, getLiquidityForAmounts, ceny display z dokładnością 1 ulp). - **Testy referencyjne `test/v3math.test ...

### `journal/TASKS-LEDGER.md:1`

journal/TASKS-LEDGER.md:1-8 | no date | TASKS-LEDGER.md — księga transakcji + zamknięte pozycje + CSV (spec, 25.08)
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #5, vector #4

> # TASKS-LEDGER.md — księga transakcji + zamknięte pozycje + CSV (spec, 25.08) > Realizacja decyzji z 10.08 (§2 CONTEXT): "SQLite + CSV od pierwszej > transakcji — podatki PL + audytowalność". Trigger: Rafał zamknął #953427 > przez apkę i pozycja ZNIKŁA bez śladu — zero historii, zero podsumowania > ...

### `journal/TASKS-LEDGER.md:21`

journal/TASKS-LEDGER.md:21-34 | no date | 2. Warstwa danych (bot — lane Fable) | already listed as related
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #2

> ## 2. Warstwa danych (bot — lane Fable) - `.bot/tx-ledger.ndjson` (append-only): {ts, chain, txHash, tokenId, kind: MINT|INCREASE|DECREASE|COLLECT|BURN, amount0/1 (raw string + human), usdAtTs (wycena z ceny puli w chwili zdarzenia), gasUsd (z paragonu tx × cena ETH)}. Zapis idempotentny (klu ...

### `journal/CONTEXT.md:277#p4`

journal/CONTEXT.md:412-452 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce
In top 5 of 4 run(s): hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu #5908083 w positions-history mogła być zapisana PO burnie z valueUsd ≈ 0?). Zlecenie diagnostyczne u CC-Win (tylko odczyt). AKTUAL ...

### `docs/UI-DESIGN.md:100`

docs/UI-DESIGN.md:100-106 | no date | 4.4 Ledger
In top 5 of 3 run(s): contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, meta-index-hybrid-rerank #5

> ### 4.4 Ledger - Full transaction history with rates at execution time, filters, and a **CSV export for the Polish income-tax return (PIT-38)**. Built as the closed-positions panel plus `/api/ledger.csv`; the localStorage-based Transaction History view was retired. - Strategy statistics: proposa ...

### `docs/UI-DESIGN.md:78`

docs/UI-DESIGN.md:78-90 | no date | 4.2 Positions
In top 5 of 3 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #4, vector #5

> ### 4.2 Positions - Position cards: pair/network, value, range as a bar with a price marker, in-range status, accrued fees, the advisor's recommendation, equity and range charts. - Inline actions per card: - **Collect fees** — enabled when fees exceed the profitability threshold (multiple of the ...

### `journal/HANDOFF.md:641#p3`

journal/HANDOFF.md:751-808 | no date | @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #3

> @CC-Mac (Claude Code, iTerm na Macu — git i skrypty) NATYCHMIAST po pushu ping CC-Win (SendMessage): przebiegi shape + deploy (wpisy w ich skrzynce). - [Fable→CC-Mac, 01.09 ~12:xx — PACZKA „BILANS: ruch rynku zamkniętych pozycji"] Commit+push: `bot/observer.ts` (fix: marketPnl bilansu transz ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `docs/DECISION-LOG.md:13`

docs/DECISION-LOG.md:13-13 | 2026-08-10 | Decision of 2026-08-10
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, vector #3

> Decision of 2026-08-10: **SQLite + CSV ledger from the first transaction.** Evidence / rationale: Tax reporting and auditability.

### `docs/UI-DESIGN.md:135`

docs/UI-DESIGN.md:135-147 | no date | 7. Rotation policy: weakest position → better opportunity
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #3

> ## 7. Rotation policy: weakest position → better opportunity Positions are ranked by **realised net APR** (fees − costs, since opening and trailing 7 days). The weakest position is a candidate for closing if there is a pool where `expected_APR_new − APR_current` covers the full switching cost (exit ...

### `journal/HANDOFF.md:254#p2`

journal/HANDOFF.md:302-351 | no date | @Sonnet (sesja UI, Cowork)
In top 5 of 2 run(s): contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4

> @Sonnet (sesja UI, Cowork) `WalkforwardMiniTable` → `WalkforwardPoolBlock`, który przy 404/pustym `summary` zwraca `null` w CAŁOŚCI (tytuł+tabela), nie notkę zastępczą — zgodnie z „sekcję UKRYĆ". **Znalezisko (punkt 5 specu)**: `mainnet-usdc-weth-030` i `base-weth-cbbtc-030` NIE MAJĄ ...

### `journal/DECYZJE-2026-08-26.md:226`

journal/DECYZJE-2026-08-26.md:226-240 | no date | 6. Pyłki mainnet #953465 (~$95) i #953427 (~$2)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #5

> ## 6. Pyłki mainnet #953465 (~$95) i #953427 (~$2) Rekomendacja z 19.08: #953465 zamknąć przy tanim gazie, #953427 zostawić (nie warty gazu). Od 20.08 wieczór obie pozycje mają śledzenie equity/HODL — 26.08 będzie tydzień danych do potwierdzenia, że fees (~$5.3 nieodebranych łącznie) nie uzasadniaj ...

### `journal/TASKS-UI.md:592#p2`

journal/TASKS-UI.md:640-681 | no date | PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08)
In top 5 of 2 run(s): meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4

> PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08) `stateBands()` uodporniona na brak `status` (realne pozycje: cieniowanie tylko po `!inRange`, nigdy "cash" — tego stanu tam nie ma). `PaperTradingPanel.tsx` zaktualizowany, żeby importować z nowe ...

### `journal/KAPITAL-REKOMENDACJA.md:74`

journal/KAPITAL-REKOMENDACJA.md:74-82 | no date | 5. Pyłki mainnet (#953465 ~$88, #953427 ~$2)
In top 5 of 1 run(s): vector #1

> ## 5. Pyłki mainnet (#953465 ~$88, #953427 ~$2) - **#953465 ($88 + $3.77 fees)**: ZAMKNĄĆ przy niskim gazie (weekend, <10 gwei): decrease+collect ≈ $6–10 gazu ≈ 8–11% wartości — akceptowalne jednorazowo; środki (~$80) na Base jako część rezerwy T1. - **#953427 ($2.08)**: zamknięcie kosztuje wię ...

### `journal/CONTEXT.md:4554#p3`

journal/CONTEXT.md:4638-4687 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 1 run(s): query-pl-hybrid-rerank #2

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 Konsekwencje: (a) selection+sweep dziś nie policzone — wieczorem `--only backtest` PRZED backfillem lejka (seria sweep na 26.08 bez dziury); (b) Peak RSS wciąż nieznany — fix CC-Wina loguje na ko ...

### `docs/CASE-STUDY.md:141`

docs/CASE-STUDY.md:141-153 | no date | 7. Numbers, for the record
In top 5 of 1 run(s): vector #2

> ## 7. Numbers, for the record | Item | Value | |---|---| | Capital deployed | 6 092 USDC on Base, 27 Aug 2026 | | LP phase result (27 Aug – 18 Sep) | +0.6 % (+$38), ≈ $29 of it fees | | Narrowing experiment | 11 days, ≈ $8.6 fees, −$32 vs HODL at close | | Post-LP spot exposure (18 – 21 Sep) | ≈ +$ ...

### `journal/CONTEXT.md:1362#p1`

journal/CONTEXT.md:1362-1411 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 1 run(s): hybrid-rerank-meta #5

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) BRIEF z plików (raport 07:30 + HANDOFF; bez ciągnięcia /api/state przez przeglądarkę — sekcja POZYCJE REALNE z 28.08 zadziałała). STAN: automat czysty (porażki BRAK, backtest-run exit 0, sweep OK), obie nogi in-range, razem ...

### `docs/DECISION-LOG.md:31`

docs/DECISION-LOG.md:31-31 | 2026-09-21 | Decision of 2026-09-21
In top 5 of 1 run(s): meta-index-hybrid #5

> Decision of 2026-09-21: **Everything sold to EUR** during a short-squeeze rally (BTC at the $85–86k ETF cost-basis / liquidation cluster, ETH at the $2 750–2 800 resistance analysts had named that morning). Tranche closed at **+5.5 %** (+$336) in 25 days. Evidence / rationale: Discretionary sale "in ...

### `journal/TASKS-UI.md:700#p2`

journal/TASKS-UI.md:739-771 | no date | PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08)
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08) - [x] **karta hedge w sekcji pozycji** (`MorningCockpit.tsx`) — renderowana jako pierwsza karta w `cockpit-position-cards` gdy `bot.state.hedge` istnieje (siatka kart pokazuje się też, gdy user nie  ...

## na-02 (no-answer, answerable: partial)

**Q:** What were the backtest results for the Solana network?

**Reference:** There were no LP backtests on Solana: the strategy was tested only on Uniswap v3 pools on mainnet, Base and Arbitrum (Optimism rejected on 11.08); the only Solana item is the JLP vault (Jupiter) in the E8.2 house-edge study, roughly +20-22% a year of alpha with a fading edge and losses in SOL rallies, which is not an LP backtest.

Evidence now: none.

### `journal/RESEARCH-QUEUE.md:597#p1`

journal/RESEARCH-QUEUE.md:597-639 | 2026-08-10 | F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10)
In top 5 of 8 run(s): contextual-sonnet-hybrid-rerank #5, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid #5, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10) > Kontekst: screen "Earned $6,912 / 5.6d / $281k" = 3.1%/tydz. — realne dla > ultra-wąskiego LP na parach spiętych (LST-ETH, stable-stable): brak IL w > normalnych warunkach, koncentracja ×dziesiątki. Ukryte ryzyko: depeg (wąs ...

### `docs/CASE-STUDY.md:44`

docs/CASE-STUDY.md:44-65 | no date | 3. What the backtests said
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, vector #4

> ## 3. What the backtests said The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen `ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days, exit on a 5 % break below the 7-day EMA. It passed the gate on one pool. The ...

### `journal/CONTEXT.md:548`

journal/CONTEXT.md:548-591 | 2026-09-09 | 2026-09-09 ~rano — BRIEF (Fable + Rafał): odbiór E8.2d (CC-Mac) — DRYF CACHE CEN (precyzja α ±2–3 pp/r), JLP „najmocniej | already listed as related
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #3, hybrid-rerank #4, hybrid-stem-prefix6 #5, query-pl-hybrid-rerank #3

> ### 2026-09-09 ~rano — BRIEF (Fable + Rafał): odbiór E8.2d (CC-Mac) — DRYF CACHE CEN (precyzja α ±2–3 pp/r), JLP „najmocniejszy" ale z przeciekiem SOL; DECYZJA: zlecenia E8 idą do CC-Win BRIEF (raport 07:30): automat czysty (koniec 04:59, porażki BRAK), down:false 6/6, selektor edge −17.5. Obie nogi ...

### `journal/reports/morning-2026-08-20.md:51`

journal/reports/morning-2026-08-20.md:51-65 | 2026-08-20 | pipeline-task.log (tail)
In top 5 of 7 run(s): contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #4, meta-index-hybrid-rerank #3

> ## pipeline-task.log (tail) ``` 2026-08-20T05:49:03.979Z świeżość swap cache: OK=[arbitrum-usdc-usdt-001, arbitrum-weth-usdc-005-365d, arbitrum-weth-usdc-030-365d, base-cbbtc-weth-005-365d, base-weth-usdc-005-365d, base-weth-usdc-005, base-weth-usdc-030-365d, mainnet-dai-usdt-001, mainnet-tbtc-wbtc- ...

### `journal/reports/morning-2026-08-26.md:7#p2`

journal/reports/morning-2026-08-26.md:31-49 | 2026-08-26 | pipeline.log (ostatni przebieg)
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #4, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2

> pipeline.log (ostatni przebieg) (podejście 1/2) 2026-08-26T03:43:00.303Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1787715776129.log) 2026-08-26T03:43:00.303Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-26T03:43:03.335Z krok hs-bas ...

### `journal/reports/morning-2026-08-20.md:7#p2`

journal/reports/morning-2026-08-20.md:30-49 | 2026-08-20 | pipeline.log (ostatni przebieg)
In top 5 of 5 run(s): hybrid-rerank-1024 #4, hybrid-rerank #5, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #5, meta-index-hybrid-rerank #4

> pipeline.log (ostatni przebieg) data\pipeline-logs\hs-optimism-weth-usdc-030-365d-1787204457818.log) 2026-08-20T05:40:59.205Z ▶ hs-arbitrum-weth-usdc-030-365d (podejście 1/2) 2026-08-20T05:41:00.379Z krok hs-arbitrum-weth-usdc-030-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-030-365d ...

### `journal/reports/morning-2026-09-01.md:51`

journal/reports/morning-2026-09-01.md:51-65 | 2026-09-01 | pipeline-task.log (tail)
In top 5 of 3 run(s): hybrid-rerank-1024 #5, hybrid-rerank-meta-1024 #3, meta-index-hybrid-rerank #5

> ## pipeline-task.log (tail) ``` 2026-09-01T03:42:47.724Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-01T03:42:53.545Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1788234167724.log) 2026-09-01T03:42:53.547Z świeżość swap cache: OK=[arbitrum- ...

### `journal/CONTEXT.md:3054`

journal/CONTEXT.md:3054-3072 | 2026-08-10 | 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 ROKU danych (2022-02→2026-08)
In top 5 of 3 run(s): contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4

> ### 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 ROKU danych (2022-02→2026-08) Dane: DefiLlama historie dzienne apyBase/TVL (240 pul pobrane przez fetch:llama). Polityka rankingowana każdego dnia D WYŁĄCZNIE z danych ≤D, wynik = forward apyBase D+1, koszt rotacji 0.3% (wyjści ...

### `docs/PLAN.md:108`

docs/PLAN.md:108-115 | no date | 3.7. Backtest quality decides everything
In top 5 of 2 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1

> ### 3.7. Backtest quality decides everything The biggest trap: **a backtest on candles (OHLC) systematically overstates LP profits**, because it does not see the price path inside the candle nor the actual volume distribution across ticks. Requirements: - simulation on **swap-by-swap** data (`Swap` ...

### `journal/RESEARCH-QUEUE.md:95#p3`

journal/RESEARCH-QUEUE.md:189-232 | no date | B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2

> B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty) | Sztywny ±15% (naiwny) | 8,297 | −53.0 | −8.90 | 28.3 | 979 | 40 | 5 | 100 | | Adaptacyjna k=2 h=24 pb7 | 8,573 | −46.3 | −5.86 | 30.6 | 1,185 | 32 | 4 | 86 | | Adaptacyjna k=2 h=12 pb7 | 9,122 | −31.0 | +0.17 | 27.5 | 694 | 16 ...

### `docs/PAIRS.md:69`

docs/PAIRS.md:69-81 | no date | 3. Portfolio sketch to be validated in the backtest (capital $5–25k)
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2

> ## 3. Portfolio sketch to be validated in the backtest (capital $5–25k) | Sleeve | Pool (main candidate) | Weight | Role | |---|---|---|---| | ETH core | ETH/USDC v3 0.3% Base | ~40% | Main fee generator, cheap gas for rebalances | | Correlated | cbBTC/ETH v3 0.05% Base | ~25% | Fees at low IL, reg ...

### `journal/reports/morning-2026-09-05.md:7#p2`

journal/reports/morning-2026-09-05.md:32-49 | 2026-09-05 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #3

> pipeline.log (ostatni przebieg) 2026-09-05T03:42:57.354Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1788579774629.log) 2026-09-05T03:42:57.355Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-05T03:43:00.490Z krok hs-base-cbbtc-weth-005 ...

### `journal/reports/morning-2026-08-27.md:51`

journal/reports/morning-2026-08-27.md:51-65 | 2026-08-27 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #3

> ## pipeline-task.log (tail) ``` 2026-08-27T03:43:25.042Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-27T03:43:28.523Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1787802205042.log) 2026-08-27T03:43:28.525Z świeżość swap cache: OK=[arbitrum- ...

### `journal/CONTEXT.md:454`

journal/CONTEXT.md:454-498 | 2026-09-09 | 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA (100% pokrycia, 0 duplikatów), GM v2 i JLP potwier | already listed as related
In top 5 of 2 run(s): hybrid-rerank #3, hybrid-rerank-meta #3

> ### 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA (100% pokrycia, 0 duplikatów), GM v2 i JLP potwierdzone na czystych danych; GLP zostaje na danych E8.2e (wyjątek udokumentowany, 3. błąd = obcinanie Llamy przy delistingu); **E8.2 ZAMKNIĘTE — werdykt klasy „dom kasyna"** Odbió ...

### `journal/RESEARCH-QUEUE.md:812`

journal/RESEARCH-QUEUE.md:812-834 | no date | G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne)
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3

> ## G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne) - [ ] Runner: opcjonalne załączanie wskazanych plików wyników do commita (backtest/results/ jest gitignored — dziś wraca tylko ogon konsoli w done/; pole "attach": ["backtest/results/scan-universe.json"] w zadaniu → runner kopiuje do  ...

### `journal/reports/morning-2026-08-29.md:7#p2`

journal/reports/morning-2026-08-29.md:32-49 | 2026-08-29 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #5

> pipeline.log (ostatni przebieg) (log: data\pipeline-logs\hs-base-weth-usdc-030-720d-1787974952356.log) 2026-08-29T03:42:41.888Z ▶ hs-mainnet-usdc-weth-005-720d (podejście 1/2) 2026-08-29T03:42:44.902Z krok hs-mainnet-usdc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-005-720d- ...

### `journal/DECYZJE-2026-08-26.md:656`

journal/DECYZJE-2026-08-26.md:656-684 | no date | 13. Pomysł Rafała (25.08): backtest 730d (2 lata) — dwa duże reżimy
In top 5 of 1 run(s): vector #1

> ## 13. Pomysł Rafała (25.08): backtest 730d (2 lata) — dwa duże reżimy Obserwacja trafna: ostatnie 365d to głównie trend spadkowy/boczny; 2 lata wstecz łapią też duży bull. Walkforward tnie rok na okna i taguje up/down/flat, ale liczba okien "up" w spadkowym roku jest mała — wnioski o zachowaniu na ...

### `journal/CONTEXT.md:500`

journal/CONTEXT.md:500-546 | 2026-09-09 | 2026-09-09 ~popołudnie — ODBIÓR E8.2e (CC-Win): fix dryfu DZIAŁA, ale odsłonił drugi błąd (próbki na granicy dnia → ~20–
In top 5 of 1 run(s): query-pl-hybrid-rerank #2

> ### 2026-09-09 ~popołudnie — ODBIÓR E8.2e (CC-Win): fix dryfu DZIAŁA, ale odsłonił drugi błąd (próbki na granicy dnia → ~20–30% dni ginie); JLP po 3 czynnikach α ≈ +22%/r, ale EDGE GAŚNIE 2024→2026; werdykt klasy „dom kasyna" na 24.09 wstępnie sformułowany Odbiór raportu CC-Win (f254fb1 fix+dane, af ...

### `journal/TASKS-ROTATION.md:1`

journal/TASKS-ROTATION.md:1-18 | no date | TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierunek Rafała 26.08)
In top 5 of 1 run(s): vector #2

> # TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierunek Rafała 26.08) > ## ⛔ ZAMKNIĘTY 26.08 wieczór — ROTACJA ODRZUCONA DANYMI. > Backtest zbudowany (backtest/rotation.ts) i policzony TEGO SAMEGO dnia > (CC-Win: 2 okna × 2 silniki, raporty w gicie 4c54c74/339d3f2). Werdykt: > na ...

### `journal/RESEARCH-QUEUE.md:1155`

journal/RESEARCH-QUEUE.md:1155-1195 | no date | E6b. KSZTAŁT SZEROKIEJ NOGI (02.09, brief „świeże spojrzenie" — decyzja Rafała: koniecznie)
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #3

> ### E6b. KSZTAŁT SZEROKIEJ NOGI (02.09, brief „świeże spojrzenie" — decyzja Rafała: koniecznie) - [ ] **Krzywy przedział**: produktowe „±50%" = −33/+50 w cenie (log-symetria w rangeAround i advisor.suggestFixedRange). Warianty −50/+50, −60/+35, −65/+30, −70/+25 (cbBTC: −40/+40, −50/+30,  ...

### `journal/CONTEXT.md:663`

journal/CONTEXT.md:663-682 | 2026-09-07 | 2026-09-07 ~noc — E8.2b GLP (CC-Mac): hack v1 jako ogon Z LICZBĄ; klasa przed hackiem potwierdza kierunek GM; bessa 2022
In top 5 of 1 run(s): contextual-haiku-run2-hybrid-rerank #3

> ### 2026-09-07 ~noc — E8.2b GLP (CC-Mac): hack v1 jako ogon Z LICZBĄ; klasa przed hackiem potwierdza kierunek GM; bessa 2022 jeszcze nie policzona GLP (GMX v1, Arbitrum) z coins.llama: seria 2022-09-03 → 2025-07-10, urywa się w dniu hacku (0.913 → 0.067, **−93% w jeden dzień**; Llama przestaje śledz ...

### `journal/CONTEXT.md:1045`

journal/CONTEXT.md:1045-1078 | 2026-09-01 | 2026-09-01 ~10:xx — E7 KROK 1 WYKONANY (Fable): inwentaryzacja v4 — wynik NEGATYWNY dla tezy hooków, jeden konkret do le
In top 5 of 1 run(s): vector #3

> ### 2026-09-01 ~10:xx — E7 KROK 1 WYKONANY (Fable): inwentaryzacja v4 — wynik NEGATYWNY dla tezy hooków, jeden konkret do lejka Dane: DefiLlama (yields API + protocol + dexs), na żywo w przeglądarce; HookRank nie doładował danych (do ew. powrotu). USTALENIA: (1) **SKALA: v4 TVL ~$1.03 mld** (Ethereu ...

### `journal/TASKS-UI.md:804#p2`

journal/TASKS-UI.md:851-896 | no date | Partia 12 (21.08): usunięcie sekcji „Zarządzaj (zaawansowane)" + fix crasha
In top 5 of 1 run(s): hybrid-stem-prefix6 #4

> Partia 12 (21.08): usunięcie sekcji „Zarządzaj (zaawansowane)" + fix crasha Lekcja: duplikat w UI nie zawsze jest zbędny, liczy się kontekst, w którym stoi. Nowa klasa `.morning-header-bare` (bez `cursor:pointer` i bez hovera, bo nagłówek nie jest już przełącznikiem). - [x] **Nagł ...

### `journal/HANDOFF.md:254#p2`

journal/HANDOFF.md:302-351 | no date | @Sonnet (sesja UI, Cowork)
In top 5 of 1 run(s): meta-index-hybrid #4

> @Sonnet (sesja UI, Cowork) `WalkforwardMiniTable` → `WalkforwardPoolBlock`, który przy 404/pustym `summary` zwraca `null` w CAŁOŚCI (tytuł+tabela), nie notkę zastępczą — zgodnie z „sekcję UKRYĆ". **Znalezisko (punkt 5 specu)**: `mainnet-usdc-weth-030` i `base-weth-cbbtc-030` NIE MAJĄ ...

### `journal/RESEARCH-QUEUE.md:7#p1`

journal/RESEARCH-QUEUE.md:7-50 | no date | A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
In top 5 of 1 run(s): query-pl-hybrid-rerank #4

> A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline) - [x] **Refetch mainnet-usdc-weth-030 (pełne 90d)** — ✅ DONE (Claude Code): 100.0%, **49210 swapów, 90.3 dni**. Wymagało kilku wznowień (skrypt wychodzi 0 mimo FAILED przy dławieniu archiwalnym publicznych RPC; resume ze state.json dogr ...

### `journal/RESEARCH-QUEUE.md:95#p2`

journal/RESEARCH-QUEUE.md:143-188 | no date | B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #5

> B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty) Bramka PLAN.md nadal nie przechodzi globalnie (ogon ~2× mniejszy, nie zerowy) → hedge F4 pozostaje frontem. Liczby: CONTEXT wpis 11.08 "CROSS-WALIDACJA". DECYZJA PROFILU → Rafał przy zamrażaniu ALGORITHM.md. Oryginalny opis  ...

### `journal/reports/morning-2026-09-16.md:7#p2`

journal/reports/morning-2026-09-16.md:32-49 | 2026-09-16 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5

> pipeline.log (ostatni przebieg) 2026-09-16T03:42:43.821Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789530158846.log) 2026-09-16T03:42:43.822Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-16T03:42:46.705Z krok hs-base-cbbtc-weth-005 ...

### `journal/CONTEXT.md:3806`

journal/CONTEXT.md:3806-3848 | 2026-08-11 | 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> ### 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA **1. BUG KRYTYCZNY silnika backtestu naprawiony**: `unitPrices` zakładał parę ETH/stable (nie-ETH-owa noga = $1). Dla par kwotowanych w WETH (cbBTC/WETH, WTAO/WETH) WSZYSTKIE dotych ...

### `journal/CONTEXT.md:4554#p3`

journal/CONTEXT.md:4638-4687 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 1 run(s): vector #5

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 Konsekwencje: (a) selection+sweep dziś nie policzone — wieczorem `--only backtest` PRZED backfillem lejka (seria sweep na 26.08 bez dziury); (b) Peak RSS wciąż nieznany — fix CC-Wina loguje na ko ...

## na-03 (no-answer, answerable: partial)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

**Reference:** The premise is wrong: there was never a switch from LP pairs to shorts; the only GMX positions were a $150 test short on 17-18.08 (round-trip cost ~$1.08, protecting nothing) and a $15 end-to-end test on 20.08, both before capital entered, and on 11.09 a GMX short was rejected as an emergency option.

Evidence now: none.

### `journal/TASKS-UI.md:700#p1`

journal/TASKS-UI.md:700-738 | no date | PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08)
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #2, meta-index-hybrid #2, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #5

> PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08) KONTEKST: testowy short $15 istniał tylko na app.gmx.io i w localStorage jednej przeglądarki — nie było go na wykresach/telefonie/raporcie. Backend GOTOWY (Fable): observer czyta pozycje z GMX Readera co cykl ( ...

### `journal/CONTEXT.md:2347#p2`

journal/CONTEXT.md:2389-2432 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 14 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, hybrid-stem-prefix6 #5, meta-index-hybrid #5, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Bilans dnia: pierwszy w historii pipeline zielony end-to-end (8GB heap), eksperyment hUp policzony+cross-walidacja (werdykt 48h czeka na 26.08), tbtc-wbtc domknięty (pegged: NIE), ROTATE cross-pool + hedge GMX z ...

### `journal/RESEARCH-QUEUE.md:684#p3`

journal/RESEARCH-QUEUE.md:771-810 | no date | H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie) Docelowa architektura: kapitał LP na sprzętowym + osobny mały portfel operacyjny (hot) wyłącznie pod przyszły automat hedge'a. Przy wdrożeniu pamiętać: blind signing dla multicalli (kompensowane podglądem Rabby), migracja pozy ...

### `journal/CONTEXT.md:3519`

journal/CONTEXT.md:3519-3543 | 2026-08-18 | 2026-08-18 ~10:0x — F4-op: TEST GMX DOMKNIĘTY (short zamknięty, pełny bilans round-trip) | already listed as related
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4, vector #1

> ### 2026-08-18 ~10:0x — F4-op: TEST GMX DOMKNIĘTY (short zamknięty, pełny bilans round-trip) Rafał zamknął testowy short (100% market, received 149.35 USDC z marginu 149.92). PEŁNY BILANS CYKLU ($149.91 notional, ~18h): - **Koszty ciągłe: borrow $0.00, funding +$0.06 DLA NAS** (short DOSTAŁ fundin ...

### `docs/ALGORITHM.md:43`

docs/ALGORITHM.md:43-76 | 2026-08-11 | 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug)
In top 5 of 6 run(s): hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #4

> ## 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug) - Profile (v1.1, ETH/stable): **exit(HL7d, 5%) + return above EMA (re>EMA)**. Detector: EMA of the pair's relative log-price, half-life 7d; DOWN signal when log(P/EMA) < −5%. Action: **close the position to cash 50/50**; ...

### `journal/reports/morning-2026-09-14.md:101`

journal/reports/morning-2026-09-14.md:101-163 | 2026-09-14 | propozycje OPEN (4)
In top 5 of 4 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4

> ## propozycje OPEN (4) ```json [ { "id": "trend-hedge-base-cbbtc-weth-005-5978579-2026-09-12", "createdAt": "2026-09-12T00:04:19.143Z", "tokenId": "5978579", "poolId": "base-cbbtc-weth-005", "kind": "HEDGE", "action": "HEDGE", "symbol": "WETH-cbBTC", "hedgeNotionalU ...

### `journal/CONTEXT.md:277#p1`

journal/CONTEXT.md:277-321 | 2026-09-11 | 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm proce | already listed as related
In top 5 of 4 run(s): hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #5

> 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu ALARM (Telegram ~13:xx UTC): DOWN na base-cbbtc-weth-005 (cena −5.1% pod EMA7d) + FLAT ZAKOŃCZONY + propozycja ROZSZERZENIA. Odczyt ...

### `docs/DECISION-LOG.md:28`

docs/DECISION-LOG.md:28-28 | 2026-09-11 | Decision of 2026-09-11
In top 5 of 3 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1, vector #3

> Decision of 2026-09-11: **Close the narrowing episode** (trend breaker fired on cbBTC): sign the widening; reject both emergency options (short on GMX, exit to cash). Product unchanged. Evidence / rationale: Signal only on the crypto/crypto leg; on such a pair LP and HODL share the same USD beta. Ep ...

### `journal/CONTEXT.md:3503`

journal/CONTEXT.md:3503-3517 | 2026-08-18 | 2026-08-18 ~09:3x — F4-op: ODCZYT KOSZTÓW TESTOWEGO SHORTA GMX (po ~17h)
In top 5 of 3 run(s): contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #5, vector #2

> ### 2026-08-18 ~09:3x — F4-op: ODCZYT KOSZTÓW TESTOWEGO SHORTA GMX (po ~17h) Zrzut z GMX (Rafał): margin $149.92, **borrow fee $0.00, negative funding fee $0.00** po ~17h utrzymania; PnL −$0.39 (−0.25% = ruch ceny ETH, nie koszt). ODCZYT: koszty CIĄGŁE utrzymania shorta na tym rynku/w tym oknie ≈ ze ...

### `docs/EMERGENCY.md:33`

docs/EMERGENCY.md:33-49 | no date | 2. Option A — delta-neutral hedge (preferred: reversible, the LP stays)
In top 5 of 3 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3, vector #4

> ## 2. Option A — delta-neutral hedge (preferred: reversible, the LP stays) Card "EMERGENCY OPTION A" in the cockpit (amounts computed from the live position). - **What:** a 1× short on GMX v2 (Arbitrum) for the full exposure of the position's volatile leg. WETH/USDC → short ETH/USD (**one signat ...

### `journal/TASKS-UI.md:700#p2`

journal/TASKS-UI.md:739-771 | no date | PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08)
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #4

> PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08) - [x] **karta hedge w sekcji pozycji** (`MorningCockpit.tsx`) — renderowana jako pierwsza karta w `cockpit-position-cards` gdy `bot.state.hedge` istnieje (siatka kart pokazuje się też, gdy user nie  ...

### `journal/CONTEXT.md:3375`

journal/CONTEXT.md:3375-3397 | 2026-08-17 | 2026-08-17 (~14:40) — F4-op: WYBÓR VENUE PERP DLA HEDGE (research, decyzja dwuetapowa)
In top 5 of 2 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5

> ### 2026-08-17 (~14:40) — F4-op: WYBÓR VENUE PERP DLA HEDGE (research, decyzja dwuetapowa) Kandydaci zbadani pod nasz tryb (pół-auto, hedge $1–5k notional): - **GMX v2 (Arbitrum)**: open/close 4–6 bps (oracle pricing, bez orderbooku), ale UWAGA: **borrowing fee** (ciągły koszt, rośnie z utylizacją ...

## na-04 (no-answer, answerable: no)

**Q:** How much did the electricity for the Windows server cost per month?

**Reference:** The corpus does not say: electricity cost of the Windows server is never mentioned (the only power-related note is enabling auto power-on in the BIOS after a power outage).

Evidence now: none.

### `docs/INFRA.md:8`

docs/INFRA.md:8-36 | no date | 1. Architecture (as built)
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-query-pl-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #2, hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, hybrid-stem-prefix6 #2, meta-index-hybrid #1, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #3, vector #4

> ## 1. Architecture (as built) ``` ┌────────────────────────── WINDOWS (server, 24/7) ──────────────────────────┐ │  NSSM service homos-bot      bot/observer.ts — prices, signals, proposals  │ │  NSSM service homos-server   bot/server.ts — REST API + static UI (public/)│ │  Task Scheduler            ...

### `journal/CONTEXT.md:3081`

journal/CONTEXT.md:3081-3119 | 2026-08-10 | 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
In top 5 of 14 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #4, meta-index-hybrid #4, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1

> ### 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ) Wykonano `TASKS-WINDOWS.md` (kroki 1–10) na stacjonarnym Windows użytkownika, repo w `C:\Projects\homos`. Szczegóły w TASKS-WINDOWS.md, skrót tutaj: - **Środowisko**: Node v24.18.0 (nowszy niż wymagane v22.x — działa poprawnie, ...

### `docs/UI-DESIGN.md:35`

docs/UI-DESIGN.md:35-48 | no date | 2. Architecture: who does what
In top 5 of 12 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #4, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, hybrid-stem-prefix6 #1, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> ## 2. Architecture: who does what ``` ┌─────────────┐   writes state  ┌──────────────┐   reads state  ┌──────────────┐ │  BOT (24/7) │ ──────────────► │  state/logs  │ ◄────────────── │  UI (React)  │ │  Node daemon│                 └──────────────┘                │ view only    │ │  on a server│ ◄ ...

### `docs/CASE-STUDY.md:105`

docs/CASE-STUDY.md:105-130 | no date | 5. Conclusions
In top 5 of 7 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-run2-hybrid-rerank #2, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3

> ## 5. Conclusions **On the strategy.** For ETH/stable and ETH/BTC pairs, concentrated liquidity did not beat HODL 50/50 out of sample. The fee income is real but it is paid for with convexity: you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn. A wid ...

### `journal/CONTEXT.md:3140`

journal/CONTEXT.md:3140-3151 | 2026-08-10 | 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
In top 5 of 7 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5, query-pl-hybrid-rerank #4

> ### 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup Wykonano TASKS-WINDOWS-ADDENDUM.md (boty niewidoczne, bez okien konsoli): - Usunięto autostart `pm2-windows-startup` (`pm2-startup uninstall`, wpis w `HKCU\...\Run` zniknął). - Zainstalowano NSSM (`winget install nssm`) — na t ...

### `journal/TASKS-WINDOWS.md:16`

journal/TASKS-WINDOWS.md:16-57 | no date | Kroki
In top 5 of 6 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1

> ## Kroki - [x] **1. Kod na maszynie**: repo już podpięte do sesji w `C:\Projects\homos`. - [x] **2. Środowisko**: Node v24.18.0 (nowszy niż wymagane v22.x LTS — celowo nie zainstalowano równolegle v22, v24 działa poprawnie z tym repo), `npm ci` wykonane, `npx tsx --version` OK (tsx v4.23.12). - ...

### `docs/AI-WORKFLOW.md:81`

docs/AI-WORKFLOW.md:81-91 | no date | What did not
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #2

> ## What did not - The journal became too long to read in full; later sessions read the state section and the last few entries only, and occasionally missed something older. - Hand-offs through the owner were the slowest link. Direct session-to-session messaging helped once it was available. - E ...

### `journal/CONTEXT.md:3427`

journal/CONTEXT.md:3427-3471 | 2026-08-18 | 2026-08-18 ~09:00 — Fable: PORANNA ANALIZA — diagnoza CC-Win + 2 bugi naprawione + start dziennika trafności
In top 5 of 2 run(s): contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-stem-prefix6 #5

> ### 2026-08-18 ~09:00 — Fable: PORANNA ANALIZA — diagnoza CC-Win + 2 bugi naprawione + start dziennika trafności Odpowiedź CC-Win odebrana (HANDOFF, commit 29a7991), Telegram potwierdzony na żywo (Rafał: 3 propozycje na telefonie 08:24). USTALENIA I DZIAŁANIA: 1. **Pipeline 07:30 NADAL pada — ale z  ...

### `journal/TASKS-INFRA.md:9`

journal/TASKS-INFRA.md:9-38 | no date | Zadania
In top 5 of 2 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5

> ## Zadania - [x] **1. `.gitignore` porządny** (przygotowanie pod GitHub): node_modules, dist, data/cache/, data/llama/, .agent/, .bot/, .env*, legacy-*.bak, backtest/results/, public/bundle.js*. Sprawdź, że .env NIE jest w historii (jest w starym .gitignore?). - [x] **2. Pliki wdrożeniowe Windo ...

### `docs/CASE-STUDY.md:16`

docs/CASE-STUDY.md:16-42 | no date | 2. What I built (August 2026)
In top 5 of 2 run(s): meta-index-hybrid #5, vector #5

> ## 2. What I built (August 2026) The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August 2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript floats (precision lost above 2^53), liquidity formulas that ignored where the  ...

### `journal/CONTEXT.md:3159`

journal/CONTEXT.md:3159-3163 | 2026-08-10 | 2026-08-10 — Sesja 3i: domknięcie danych + weryfikacja IL w warstwie selekcji
In top 5 of 1 run(s): vector #1

> ### 2026-08-10 — Sesja 3i: domknięcie danych + weryfikacja IL w warstwie selekcji - **mainnet-usdc-weth-030 (pula użytkownika): pobrane tylko 11 dni** (resztka stanu po porannej awarii providerów — state.json wskazał zły punkt startu). Nawet w 11 dniach werdykt jasny: pula MARTWA (3608 swapów, fees  ...

### `journal/CONTEXT.md:798#p3`

journal/CONTEXT.md:883-925 | 2026-09-02 | 2026-09-02 ~przedpołudnie — Brief + ŚWIEŻE SPOJRZENIE NA ZYSKI (Fable + Rafał): kształt szerokiej nogi do bramki, Aerodr
In top 5 of 1 run(s): contextual-sonnet-hybrid-rerank #2

> 2026-09-02 ~przedpołudnie — Brief + ŚWIEŻE SPOJRZENIE NA ZYSKI (Fable + Rafał): kształt szerokiej nogi do bramki, Aerodrome sprawdzony, benchmark „HODL+yield" NOC 02/03.09: Windows wyłączony — wymiana dysku (41 GB wolne blokowało Piętro 2; po wymianie 200–300 GB — pełna kolejka `--per-class 8`, ~40 ...

### `journal/CONTEXT.md:1362#p3`

journal/CONTEXT.md:1460-1512 | 2026-08-29 | 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał)
In top 5 of 1 run(s): vector #2

> 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + Rafał) EXIT_TREND został 27.08 świadomie przebrandowany na procedurę awaryjną, REBALANCE po prostu przeoczono. Teraz: guard w `maybePropose` (nowe nie powstają) + sweep w refreshPositions (istniejące, zapisane w proposals.json prz ...

### `docs/UI-DESIGN.md:64`

docs/UI-DESIGN.md:64-76 | no date | 4.1 Cockpit (start screen — 30 seconds of reading)
In top 5 of 1 run(s): meta-index-hybrid #3

> ### 4.1 Cockpit (start screen — 30 seconds of reading) - **Financial header**: total value · PnL 24h/7d/since start · **vs HODL 50/50** (without it there is no way to tell whether the automation makes sense) · fees collected · costs (gas + slippage) · bot health dot. - **Decision queue**: propos ...

### `journal/TASKS-RECAL.md:63`

journal/TASKS-RECAL.md:63-74 | no date | §4 Gaz — koniec stałej $8 na mainnet
In top 5 of 1 run(s): vector #3

> ## §4 Gaz — koniec stałej $8 na mainnet - [x] **ZROBIONE 26.08 (Fable):** observer liczy żywy koszt cyklu: `eth_gasPrice × 800k gazu × kurs ETH` co 5 min per sieć (`refreshGas` w observer.ts), podłogi mainnet $0.5 / base $0.08 / arb $0.1 (L1-data na L2), stara stała tylko jako fallback przed  ...

### `journal/RESEARCH-QUEUE.md:7#p1`

journal/RESEARCH-QUEUE.md:7-50 | no date | A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline) - [x] **Refetch mainnet-usdc-weth-030 (pełne 90d)** — ✅ DONE (Claude Code): 100.0%, **49210 swapów, 90.3 dni**. Wymagało kilku wznowień (skrypt wychodzi 0 mimo FAILED przy dławieniu archiwalnym publicznych RPC; resume ze state.json dogr ...

## na-05 (no-answer, answerable: no)

**Q:** What were the results for October 2026?

**Reference:** There are no October results: the tranche was fully sold on 21.09, the project closed on 22-23.09 and the last report is from 23.09; the only October date is the planned 24.10 review of the spot bet, and that bet was itself closed early on 21.09.

Evidence now: none.

### `docs/CASE-STUDY.md:141`

docs/CASE-STUDY.md:141-153 | no date | 7. Numbers, for the record
In top 5 of 13 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #1

> ## 7. Numbers, for the record | Item | Value | |---|---| | Capital deployed | 6 092 USDC on Base, 27 Aug 2026 | | LP phase result (27 Aug – 18 Sep) | +0.6 % (+$38), ≈ $29 of it fees | | Narrowing experiment | 11 days, ≈ $8.6 fees, −$32 vs HODL at close | | Post-LP spot exposure (18 – 21 Sep) | ≈ +$ ...

### `journal/reports/morning-2026-09-10.md:51`

journal/reports/morning-2026-09-10.md:51-65 | 2026-09-10 | pipeline-task.log (tail)
In top 5 of 8 run(s): contextual-sonnet-hybrid-rerank #5, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #2

> ## pipeline-task.log (tail) ``` 2026-09-10T03:42:29.939Z krok wide-score: exit 0 (log: data\pipeline-logs\wide-score-1789011746035.log) 2026-09-10T03:42:29.939Z ▶ wide-daily (podejście 1/1) 2026-09-10T03:42:51.627Z krok wide-daily: exit 0 (log: data\pipeline-logs\wide-daily-1789011749940.log) 2026-0 ...

### `journal/reports/morning-2026-09-10.md:7#p1`

journal/reports/morning-2026-09-10.md:7-31 | 2026-09-10 | pipeline.log (ostatni przebieg)
In top 5 of 7 run(s): contextual-sonnet-hybrid-rerank #4, hybrid-rerank-1024 #3, hybrid-rerank #5, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #4, meta-index-hybrid #5, meta-index-hybrid-rerank #4

> pipeline.log (ostatni przebieg) ``` 2026-09-10T03:41:53.338Z ▶ hs-mainnet-wsteth-weth-001 (podejście 1/2) 2026-09-10T03:41:54.717Z krok hs-mainnet-wsteth-weth-001: exit 0 (log: data\pipeline-logs\hs-mainnet-wsteth-weth-001-1789011713338.log) 2026-09-10T03:41:54.717Z ▶ hs-mainnet-tbtc-wbtc-001 (pode ...

### `journal/reports/morning-2026-09-10.md:7#p2`

journal/reports/morning-2026-09-10.md:32-49 | 2026-09-10 | pipeline.log (ostatni przebieg)
In top 5 of 5 run(s): contextual-haiku-hybrid-rerank #5, contextual-haiku-query-pl-hybrid-rerank #4, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #2, query-pl-hybrid-rerank #4

> pipeline.log (ostatni przebieg) 2026-09-10T03:42:23.193Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789011740943.log) 2026-09-10T03:42:23.193Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-10T03:42:26.024Z krok hs-base-cbbtc-weth-005 ...

### `journal/reports/morning-2026-08-24.md:7#p2`

journal/reports/morning-2026-08-24.md:31-49 | 2026-08-24 | pipeline.log (ostatni przebieg)
In top 5 of 5 run(s): hybrid-rerank-1024 #4, hybrid-rerank #3, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> pipeline.log (ostatni przebieg) hs-arbitrum-weth-usdc-005-365d (podejście 1/2) 2026-08-24T05:31:02.418Z krok hs-arbitrum-weth-usdc-005-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-365d-1787549459790.log) 2026-08-24T05:31:02.418Z ▶ hs-optimism-weth-usdc-030-365d (podejście 1/2) 20 ...

### `journal/reports/morning-2026-09-21.md:51`

journal/reports/morning-2026-09-21.md:51-65 | 2026-09-21 | pipeline-task.log (tail)
In top 5 of 4 run(s): hybrid-rerank-1024 #5, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, meta-index-hybrid-rerank #5

> ## pipeline-task.log (tail) ``` 2026-09-21T03:44:36.116Z krok wide-score: exit 0 (log: data\pipeline-logs\wide-score-1789962271972.log) 2026-09-21T03:44:36.116Z ▶ wide-daily (podejście 1/1) 2026-09-21T03:44:58.757Z krok wide-daily: exit 0 (log: data\pipeline-logs\wide-daily-1789962276116.log) 2026-0 ...

### `journal/CONTEXT.md:684`

journal/CONTEXT.md:684-719 | 2026-09-07 | 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia): CARRY NIE, HLP n/a, **GM v2 PRZECHODZI (z zastrz
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #2, vector #3

> ### 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia): CARRY NIE, HLP n/a, **GM v2 PRZECHODZI (z zastrzeżeniem: bez bessy)** E8.0 BENCH: BENCH_APR = 3.8%/r (USDC Aave, Morpho/Pendle puste w filtrze Llamy — nazwy projektów do poprawki, niepilne); Lido 2.2%; Sky USDS 6.1% (najleps ...

### `journal/reports/morning-2026-09-03.md:7#p1`

journal/reports/morning-2026-09-03.md:7-35 | 2026-09-03 | pipeline.log (ostatni przebieg)
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #3, vector #2

> pipeline.log (ostatni przebieg) ``` 2026-09-03T03:42:07.687Z ▶ hs-mainnet-dai-usdt-001 (podejście 1/2) 2026-09-03T03:42:11.096Z krok hs-mainnet-dai-usdt-001: exit 0 (log: data\pipeline-logs\hs-mainnet-dai-usdt-001-1788406927687.log) 2026-09-03T03:42:11.096Z ▶ hs-arbitrum-usdc-usdt-001 (podejście 1/ ...

### `journal/reports/morning-2026-09-01.md:211`

journal/reports/morning-2026-09-01.md:211-221 | 2026-09-01 | PAPER TRADING (start 2026-08-18, $10000/pula)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #1

> ## PAPER TRADING (start 2026-08-18, $10000/pula) | pula | status | equity | PnL | vs HODL | fees | reb | |---|---|---|---|---|---|---| | mainnet-usdc-weth-030 | open | $10618 | +$618 | $-877 | $74.86 | 1 | | mainnet-usdc-weth-005 | open | $10618 | +$618 | $-905 | $44.50 | 1 | | base-weth-usdc-030 | ...

### `journal/reports/morning-2026-09-14.md:287`

journal/reports/morning-2026-09-14.md:287-297 | 2026-09-14 | PAPER TRADING (start 2026-08-18, $10000/pula)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #1

> ## PAPER TRADING (start 2026-08-18, $10000/pula) | pula | status | equity | PnL | vs HODL | fees | reb | |---|---|---|---|---|---|---| | mainnet-usdc-weth-030 | open | $10712 | +$712 | $-903 | $105.33 | 1 | | mainnet-usdc-weth-005 | open | $10702 | +$702 | $-924 | $63.27 | 1 | | base-weth-usdc-030  ...

### `journal/CONTEXT.md:3054`

journal/CONTEXT.md:3054-3072 | 2026-08-10 | 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 ROKU danych (2022-02→2026-08)
In top 5 of 2 run(s): contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2

> ### 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 ROKU danych (2022-02→2026-08) Dane: DefiLlama historie dzienne apyBase/TVL (240 pul pobrane przez fetch:llama). Polityka rankingowana każdego dnia D WYŁĄCZNIE z danych ≤D, wynik = forward apyBase D+1, koszt rotacji 0.3% (wyjści ...

### `journal/reports/morning-2026-08-22.md:7#p2`

journal/reports/morning-2026-08-22.md:31-49 | 2026-08-22 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #3, contextual-haiku-run2-query-pl-hybrid-rerank #3

> pipeline.log (ostatni przebieg) hs-arbitrum-weth-usdc-005-365d (podejście 1/2) 2026-08-22T05:31:59.301Z krok hs-arbitrum-weth-usdc-005-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-365d-1787376715748.log) 2026-08-22T05:31:59.302Z ▶ hs-optimism-weth-usdc-030-365d (podejście 1/2) 20 ...

### `journal/CONTEXT.md:2032#p2`

journal/CONTEXT.md:2079-2127 | 2026-08-27 | 2026-08-27 ~rano — SESJA DECYZYJNA (Fable + Rafał) — w toku
In top 5 of 2 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #3

> 2026-08-27 ~rano — SESJA DECYZYJNA (Fable + Rafał) — w toku Kod produktu MVP (Fable, tsc czysty): suggestFixedRange w advisorze + BotPool.productIdleWidthPct (50/40) + observer używa stałej szerokości dla pul produktowych → propozycje OPEN w kokpicie dostają zakresy ±50%/±40%. Paczka u CC-Mac, wdro ...

### `journal/reports/morning-2026-09-01.md:7#p1`

journal/reports/morning-2026-09-01.md:7-32 | 2026-09-01 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, vector #5

> pipeline.log (ostatni przebieg) ``` 2026-09-01T03:42:12.290Z ▶ hs-arbitrum-usdc-usdt-001 (podejście 1/2) 2026-09-01T03:42:13.956Z krok hs-arbitrum-usdc-usdt-001: exit 0 (log: data\pipeline-logs\hs-arbitrum-usdc-usdt-001-1788234132290.log) 2026-09-01T03:42:13.956Z ▶ hs-mainnet-usdc-usdt-001 (podejśc ...

### `journal/CONTEXT.md:2347#p3`

journal/CONTEXT.md:2432-2475 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 2 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-sonnet-query-pl-hybrid-rerank #4

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Powstał `DECYZJE-2026-08-26.md`: 8 punktów agendy (kapitał, v1.3/hUp48, cbBTC k2/k3, wykluczenie mainnet-001, parking cash, pyłki, seria sweep, obserwacja PROPONUJ) + jakie dane zbierają się do tego czasu. Sesje ...

### `journal/reports/morning-2026-09-20.md:7#p1`

journal/reports/morning-2026-09-20.md:7-31 | 2026-09-20 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #5

> pipeline.log (ostatni przebieg) ``` 2026-09-20T03:42:07.550Z krok hs-mainnet-wsteth-weth-001: exit 0 (log: data\pipeline-logs\hs-mainnet-wsteth-weth-001-1789875725975.log) 2026-09-20T03:42:07.550Z ▶ hs-mainnet-tbtc-wbtc-001 (podejście 1/2) 2026-09-20T03:42:09.135Z krok hs-mainnet-tbtc-wbtc-001: exi ...

### `journal/reports/morning-2026-08-23.md:7#p2`

journal/reports/morning-2026-08-23.md:31-49 | 2026-08-23 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): hybrid-rerank #4, vector #4

> pipeline.log (ostatni przebieg) hs-arbitrum-weth-usdc-005-365d (podejście 1/2) 2026-08-23T05:41:49.611Z krok hs-arbitrum-weth-usdc-005-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-365d-1787463707128.log) 2026-08-23T05:41:49.612Z ▶ hs-optimism-weth-usdc-030-365d (podejście 1/2) 20 ...

### `journal/reports/morning-2026-09-22.md:7#p1`

journal/reports/morning-2026-09-22.md:7-31 | 2026-09-22 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): hybrid-rerank-meta-1024 #4, hybrid-stem-prefix6 #5

> pipeline.log (ostatni przebieg) ``` 2026-09-22T03:43:09.177Z ▶ hs-mainnet-wsteth-weth-001 (podejście 1/2) 2026-09-22T03:43:10.973Z krok hs-mainnet-wsteth-weth-001: exit 0 (log: data\pipeline-logs\hs-mainnet-wsteth-weth-001-1790048589178.log) 2026-09-22T03:43:10.973Z ▶ hs-mainnet-tbtc-wbtc-001 (pode ...

### `journal/CONTEXT.md:3806`

journal/CONTEXT.md:3806-3848 | 2026-08-11 | 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #3

> ### 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA **1. BUG KRYTYCZNY silnika backtestu naprawiony**: `unitPrices` zakładał parę ETH/stable (nie-ETH-owa noga = $1). Dla par kwotowanych w WETH (cbBTC/WETH, WTAO/WETH) WSZYSTKIE dotych ...

### `journal/RESEARCH-QUEUE.md:812`

journal/RESEARCH-QUEUE.md:812-834 | no date | G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne)
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #4

> ## G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne) - [ ] Runner: opcjonalne załączanie wskazanych plików wyników do commita (backtest/results/ jest gitignored — dziś wraca tylko ogon konsoli w done/; pole "attach": ["backtest/results/scan-universe.json"] w zadaniu → runner kopiuje do  ...

### `journal/reports/morning-2026-09-02.md:7#p1`

journal/reports/morning-2026-09-02.md:7-32 | 2026-09-02 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): hybrid-stem-prefix6 #4

> pipeline.log (ostatni przebieg) ``` 2026-09-02T03:41:57.990Z ▶ hs-arbitrum-usdc-usdt-001 (podejście 1/2) 2026-09-02T03:41:59.656Z krok hs-arbitrum-usdc-usdt-001: exit 0 (log: data\pipeline-logs\hs-arbitrum-usdc-usdt-001-1788320517990.log) 2026-09-02T03:41:59.656Z ▶ hs-mainnet-usdc-usdt-001 (podejśc ...

### `journal/reports/morning-2026-09-11.md:51`

journal/reports/morning-2026-09-11.md:51-65 | 2026-09-11 | pipeline-task.log (tail)
In top 5 of 1 run(s): meta-index-hybrid #4

> ## pipeline-task.log (tail) ``` 2026-09-11T03:43:24.411Z krok wide-score: exit 0 (log: data\pipeline-logs\wide-score-1789098200298.log) 2026-09-11T03:43:24.411Z ▶ wide-daily (podejście 1/1) 2026-09-11T03:43:47.226Z krok wide-daily: exit 0 (log: data\pipeline-logs\wide-daily-1789098204411.log) 2026-0 ...

### `journal/reports/morning-2026-08-24.md:7#p1`

journal/reports/morning-2026-08-24.md:7-31 | 2026-08-24 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-haiku-run2-hybrid-rerank #5

> pipeline.log (ostatni przebieg) ``` 2026-08-24T05:30:32.545Z ▶ hs-base-cbbtc-weth-005-365d (podejście 1/2) 2026-08-24T05:30:35.896Z krok hs-base-cbbtc-weth-005-365d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-365d-1787549432545.log) 2026-08-24T05:30:35.896Z ▶ hs-mainnet-wtao-weth-100 (p ...

### `journal/reports/morning-2026-09-05.md:7#p2`

journal/reports/morning-2026-09-05.md:32-49 | 2026-09-05 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-sonnet-query-pl-hybrid-rerank #5

> pipeline.log (ostatni przebieg) 2026-09-05T03:42:57.354Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1788579774629.log) 2026-09-05T03:42:57.355Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-05T03:43:00.490Z krok hs-base-cbbtc-weth-005 ...

### `journal/reports/morning-2026-09-04.md:7#p2`

journal/reports/morning-2026-09-04.md:32-49 | 2026-09-04 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): query-pl-hybrid-rerank #5

> pipeline.log (ostatni przebieg) 2026-09-04T03:42:55.025Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1788493372244.log) 2026-09-04T03:42:55.026Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-04T03:42:58.456Z krok hs-base-cbbtc-weth-005 ...

## na-06 (no-answer, answerable: no)

**Q:** How many tokens were consumed building the project?

**Reference:** The corpus gives no token or usage numbers; the closest it comes is noting that the journal grew too long for sessions to read in full and that the analysis session was restarted ('succession') on 11.08.

Evidence now: none.

### `journal/RESEARCH-QUEUE.md:367#p1`

journal/RESEARCH-QUEUE.md:367-405 | no date | E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISANY, tsc czysty, arytmetyka przetestowana na syntet
In top 5 of 13 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #3, hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2, query-pl-hybrid-rerank #1, vector #5

> E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISANY, tsc czysty, arytmetyka przetestowana na syntetyku w sandboxie; fetch'e sieciowe NIE testowane — sandbox bez sieci, pierwszy run u CC-Mac jest testem) > Skrypty (npm): `e8:bench`, `e8:funding:hl`, `e8:dvol`, `e8:vault`, > `e8: ...

### `journal/CONTEXT.md:4554#p4`

journal/CONTEXT.md:4687-4736 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 10 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-haiku-run2-hybrid-rerank #5, contextual-haiku-run2-query-pl-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta #3, hybrid-stem-prefix6 #4, meta-index-hybrid-rerank #3, query-pl-hybrid-rerank #3

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 FIX (Fable, tsc czysty): backfill dużych luk przez **HyperSync** (ta sama infra i token co swap-cache; 2 fazy — transfery/odkrycie tokenIdów, potem zdarzenia płynności; timestampy bloków od ręki) ...

### `docs/CASE-STUDY.md:67`

docs/CASE-STUDY.md:67-103 | 2026-08-27 | 4. Live capital (27 Aug – 21 Sep 2026)
In top 5 of 9 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #3, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, meta-index-hybrid-rerank #1

> ## 4. Live capital (27 Aug – 21 Sep 2026) I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that narrow to ±5 % only in a confirmed flat. Rules I set before entering a ...

### `journal/CONTEXT.md:4554#p2`

journal/CONTEXT.md:4600-4638 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 6 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #3, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #5

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 ~10:xx — AUTO-LEJEK KANDYDATÓW ZBUDOWANY (Fable, wg TASKS-FUNNEL.md; tsc czysty poza preexisting, smoke test --dry-run w kontenerze OK). Nowe: `scripts/candidate-funnel.ts` (kwalifikacja: top10 p ...

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 6 run(s): contextual-sonnet-hybrid-rerank #5, hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #5, hybrid-stem-prefix6 #3, meta-index-hybrid #3

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `docs/ALGORITHM.md:43`

docs/ALGORITHM.md:43-76 | 2026-08-11 | 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug)
In top 5 of 4 run(s): hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #5

> ## 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug) - Profile (v1.1, ETH/stable): **exit(HL7d, 5%) + return above EMA (re>EMA)**. Detector: EMA of the pair's relative log-price, half-life 7d; DOWN signal when log(P/EMA) < −5%. Action: **close the position to cash 50/50**; ...

### `journal/TASKS-UI.md:183`

journal/TASKS-UI.md:183-223 | no date | PARTIA 4b — wpięcie buildera pod [Zatwierdź] (PO skończeniu Partii 4)
In top 5 of 3 run(s): contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, meta-index-hybrid #4

> ## PARTIA 4b — wpięcie buildera pod [Zatwierdź] (PO skończeniu Partii 4) > Builder GOTOWY: `src/utils/rebalanceBuilder.ts` (sesja analityczna, wolno > importować). Przetestowany numerycznie (swap-skip przy zbalansowanej pozycji; > pozycja 100% token0 → swap połowy z min-out po fee+slippage). API: >  ...

### `journal/CONTEXT.md:2347#p1`

journal/CONTEXT.md:2347-2389 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 3 run(s): contextual-haiku-query-pl-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #5, query-pl-hybrid-rerank #2

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Noc 20.08 = potwierdzenie wczorajszej roboty: pipeline 07:30 **19/19 kroków hs-* exit 0, zero asysty** (pierwszy w pełni czysty przebieg automatu w historii projektu), cache OK=[19] BRAKI=[], observer/state żywe ...

### `journal/CONTEXT.md:7#p1`

journal/CONTEXT.md:7-48 | no date | 1. Stan projektu — skrót
In top 5 of 3 run(s): contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, vector #2

> 1. Stan projektu — skrót - **⚡ STAN NA 21.09 ~19:30 PL — TRANSZA 1 ZAMKNIĘTA W CAŁOŚCI DO EUR NA KRAKENIE. Wynik: ≈ +$336 (+5,5%) w 25 dni (27.08→21.09), z tego LP FlatWide +$38 (22 dni), zakład spot 18–21.09 ≈ +$300.** Sprzedane 21.09 ~19:00 PL: 1,22014 ETH @ 2 403,39 EUR (≈ $2 756) i 1 213, ...

### `docs/AI-WORKFLOW.md:1`

docs/AI-WORKFLOW.md:1-6 | no date | How the project was run with AI sessions
In top 5 of 2 run(s): hybrid-stem-prefix6 #1, meta-index-hybrid #1

> # How the project was run with AI sessions HOMOS was developed by one engineer between 10 August and 22 September 2026 with four specialised Claude sessions working in parallel. This document describes the protocol, because it is the part of the project most people ask about, and because the commit ...

### `docs/PLAN.md:1`

docs/PLAN.md:1-10 | no date | HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
In top 5 of 2 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2

> # HOMOS v2 — Project plan: Automated Liquidity Manager (ALM) > **Historical: the plan as written on 10 Aug 2026, before implementation.** What was > actually built is in the [README](../README.md) and [`CASE-STUDY.md`](CASE-STUDY.md); > a short "planned vs built" summary is in §5. > > Parameters ag ...

### `journal/TASKS-UI.md:804#p2`

journal/TASKS-UI.md:851-896 | no date | Partia 12 (21.08): usunięcie sekcji „Zarządzaj (zaawansowane)" + fix crasha
In top 5 of 2 run(s): contextual-haiku-query-pl-hybrid-rerank #3, query-pl-hybrid-rerank #4

> Partia 12 (21.08): usunięcie sekcji „Zarządzaj (zaawansowane)" + fix crasha Lekcja: duplikat w UI nie zawsze jest zbędny, liczy się kontekst, w którym stoi. Nowa klasa `.morning-header-bare` (bez `cursor:pointer` i bez hovera, bo nagłówek nie jest już przełącznikiem). - [x] **Nagł ...

### `journal/TASKS-INFRA.md:9`

journal/TASKS-INFRA.md:9-38 | no date | Zadania
In top 5 of 2 run(s): contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #4

> ## Zadania - [x] **1. `.gitignore` porządny** (przygotowanie pod GitHub): node_modules, dist, data/cache/, data/llama/, .agent/, .bot/, .env*, legacy-*.bak, backtest/results/, public/bundle.js*. Sprawdź, że .env NIE jest w historii (jest w starym .gitignore?). - [x] **2. Pliki wdrożeniowe Windo ...

### `journal/CONTEXT.md:2796#p1`

journal/CONTEXT.md:2796-2832 | 2026-08-10 | 2026-08-10 — Sesja UI (Sonnet) — Partia 3: akcje na kartach kokpitu + telemetria bota ✅
In top 5 of 2 run(s): hybrid-stem-prefix6 #5, meta-index-hybrid #5

> 2026-08-10 — Sesja UI (Sonnet) — Partia 3: akcje na kartach kokpitu + telemetria bota ✅ Wykonane wszystkie zadania z TASKS-UI.md Partia 3 (rozszerzona o UX-COCKPIT.md, przeczytane przed pracą). Zakres: wyłącznie UI, nie dotknięto v3math/ liquidityManagement/advisor/backtest/bot (poza odczytem, jak  ...

### `journal/CONTEXT.md:2871#p1`

journal/CONTEXT.md:2871-2900 | 2026-08-10 | 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie z botem ✅
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #1

> 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie z botem ✅ Wykonane wszystkie 4 zadania z TASKS-UI.md Partia 2 (plus dokończone/zweryfikowane zaległości z Partii 1 — patrz TASKS-UI.md, były już zaimplementowane w kodzie, tylko nieodhaczone). Zakres: wyłącznie UI, nie dotknięto ...

### `journal/RESEARCH-QUEUE.md:597#p2`

journal/RESEARCH-QUEUE.md:640-682 | 2026-08-10 | F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10)
In top 5 of 1 run(s): contextual-haiku-query-pl-hybrid-rerank #1

> F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10) - [ ] **C: decyzja (→ Rafał)** — rekomendacja Fable po F.B: **świadome NIE dla sleeve'u pegged na v3** ("3%/tydz nie istnieje"; konserwatywnie 1–3%/r). Jedyny sensowny kandydat: mała pozycja arb-usdc-usdt jako parking kapi ...

### `journal/CONTEXT.md:2347#p2`

journal/CONTEXT.md:2389-2432 | 2026-08-20 | 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
In top 5 of 1 run(s): vector #1

> 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM Bilans dnia: pierwszy w historii pipeline zielony end-to-end (8GB heap), eksperyment hUp policzony+cross-walidacja (werdykt 48h czeka na 26.08), tbtc-wbtc domknięty (pegged: NIE), ROTATE cross-pool + hedge GMX z ...

### `journal/CONTEXT.md:7#p2`

journal/CONTEXT.md:48-77 | no date | 1. Stan projektu — skrót
In top 5 of 1 run(s): vector #3

> 1. Stan projektu — skrót ROZLICZENIE TRANSZY (pytanie Rafała): kokpit pokazuje PnL od KOTWIC pozycji ($5,857), nie od 6 092 USDC — różnica to bufor ~$150 WETH w portfelu (poza panelem) + ~$75 jednorazowych kosztów wejścia (4 swapy + gaz), a nie strata. Do zbudowania: „bilans transzy" liczon ...

### `journal/reports/morning-2026-08-21.md:7#p1`

journal/reports/morning-2026-08-21.md:7-31 | 2026-08-21 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #4

> pipeline.log (ostatni przebieg) ``` 2026-08-21T05:30:21.908Z ▶ hs-base-cbbtc-weth-005-365d (podejście 1/2) 2026-08-21T05:30:23.128Z krok hs-base-cbbtc-weth-005-365d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-365d-1787290221908.log) 2026-08-21T05:30:23.128Z ▶ hs-mainnet-wtao-weth-100 (p ...

### `journal/CONTEXT.md:116#p1`

journal/CONTEXT.md:116-152 | 2026-09-21 | 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%)
In top 5 of 1 run(s): vector #4

> 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANSZY 1 DO EUR (≈ +5,5%) RANO: Rabby $4 582 (ETH $2 712 +5%, cbBTC $84,5k), część transzy $4 502 + $1 871 = $6 373 (+4,6%). Rafał: „trzeba opracować moment wyjścia", nie chce sztywnych barier %, chce „wyjść na górce". NEWSY (Fable,  ...

### `journal/reports/morning-2026-08-31.md:7#p1`

journal/reports/morning-2026-08-31.md:7-32 | 2026-08-31 | pipeline.log (ostatni przebieg)
In top 5 of 1 run(s): contextual-haiku-hybrid-rerank #5

> pipeline.log (ostatni przebieg) ``` 2026-08-31T03:41:54.686Z ▶ hs-mainnet-dai-usdt-001 (podejście 1/2) 2026-08-31T03:41:56.093Z krok hs-mainnet-dai-usdt-001: exit 0 (log: data\pipeline-logs\hs-mainnet-dai-usdt-001-1788147714686.log) 2026-08-31T03:41:56.094Z ▶ hs-arbitrum-usdc-usdt-001 (podejście 1/ ...

### `journal/RESEARCH-QUEUE.md:7#p1`

journal/RESEARCH-QUEUE.md:7-50 | no date | A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
In top 5 of 1 run(s): meta-index-hybrid-rerank #5

> A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline) - [x] **Refetch mainnet-usdc-weth-030 (pełne 90d)** — ✅ DONE (Claude Code): 100.0%, **49210 swapów, 90.3 dni**. Wymagało kilku wznowień (skrypt wychodzi 0 mimo FAILED przy dławieniu archiwalnym publicznych RPC; resume ze state.json dogr ...

## na-07 (no-answer, answerable: partial)

**Q:** What was the structure of the SQL database holding the backtest data?

**Reference:** There was no such database: backtest results were always JSON files in backtest/results/ (plus an HTML report); a SQLite design in DB-SCHEMA.md included a backtest_run table meant only to index those files, but the design was never implemented.

Evidence now: none.

### `docs/DB-SCHEMA.md:164`

docs/DB-SCHEMA.md:164-172 | no date | 3. What is deliberately outside the database
In top 5 of 15 run(s): contextual-haiku-hybrid-rerank #1, contextual-haiku-query-pl-hybrid-rerank #1, contextual-haiku-run2-hybrid-rerank #1, contextual-haiku-run2-query-pl-hybrid-rerank #1, contextual-sonnet-hybrid-rerank #1, contextual-sonnet-query-pl-hybrid-rerank #1, hybrid-rerank-1024 #1, hybrid-rerank #1, hybrid-rerank-meta-1024 #1, hybrid-rerank-meta #1, hybrid-stem-prefix6 #1, meta-index-hybrid #1, meta-index-hybrid-rerank #1, query-pl-hybrid-rerank #1, vector #1

> ## 3. What is deliberately outside the database - **Raw tick-level swaps** (`data/cache/*.ndjson`, millions of rows per pool) — stay in files: the backtest reads them sequentially, the database adds nothing here and would bloat by orders of magnitude. The database holds only `backtest_run` (r ...

### `docs/PLAN.md:151`

docs/PLAN.md:151-175 | no date | 5. Planned vs built
In top 5 of 10 run(s): contextual-haiku-query-pl-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #3, contextual-sonnet-query-pl-hybrid-rerank #4, hybrid-rerank-1024 #2, hybrid-rerank #2, hybrid-rerank-meta-1024 #4, hybrid-rerank-meta #4, meta-index-hybrid-rerank #4, query-pl-hybrid-rerank #3, vector #3

> ## 5. Planned vs built **Architecture.** The plan called for a pnpm monorepo (`packages/core`, `data`, `backtest`, `bot`, `ui`). It was never split up: the project stayed a single package (`src/utils/v3math.ts`, `backtest/`, `bot/`, `scripts/`, `src/`), which still achieved the key goal of **one ma ...

### `journal/reports/morning-2026-08-26.md:7#p2`

journal/reports/morning-2026-08-26.md:31-49 | 2026-08-26 | pipeline.log (ostatni przebieg)
In top 5 of 8 run(s): contextual-haiku-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #4, contextual-sonnet-query-pl-hybrid-rerank #5, hybrid-rerank-1024 #3, hybrid-rerank #3, hybrid-rerank-meta-1024 #3, hybrid-rerank-meta #2, meta-index-hybrid-rerank #2

> pipeline.log (ostatni przebieg) (podejście 1/2) 2026-08-26T03:43:00.303Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1787715776129.log) 2026-08-26T03:43:00.303Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-26T03:43:03.335Z krok hs-bas ...

### `journal/reports/morning-2026-08-20.md:51`

journal/reports/morning-2026-08-20.md:51-65 | 2026-08-20 | pipeline-task.log (tail)
In top 5 of 6 run(s): hybrid-rerank-1024 #5, hybrid-rerank #5, hybrid-rerank-meta-1024 #5, hybrid-rerank-meta #5, hybrid-stem-prefix6 #5, meta-index-hybrid-rerank #5

> ## pipeline-task.log (tail) ``` 2026-08-20T05:49:03.979Z świeżość swap cache: OK=[arbitrum-usdc-usdt-001, arbitrum-weth-usdc-005-365d, arbitrum-weth-usdc-030-365d, base-cbbtc-weth-005-365d, base-weth-usdc-005-365d, base-weth-usdc-005, base-weth-usdc-030-365d, mainnet-dai-usdt-001, mainnet-tbtc-wbtc- ...

### `docs/DB-SCHEMA.md:40#p2`

docs/DB-SCHEMA.md:107-162 | no date | 2. Schema — DDL v1 (draft to be frozen at implementation) | already listed as related
In top 5 of 5 run(s): contextual-haiku-query-pl-hybrid-rerank #2, contextual-haiku-run2-hybrid-rerank #2, contextual-haiku-run2-query-pl-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #2, query-pl-hybrid-rerank #2

> 2. Schema — DDL v1 (draft to be frozen at implementation) CREATE TABLE paper_event ( ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id), kind TEXT NOT NULL,                     -- OPEN|REBALANCE|EXIT_TREND|REENTRY|HEDGE_OPEN|HEDGE_CLOSE payload TEXT NOT NULL,                  -- J ...

### `journal/reports/morning-2026-08-20.md:7#p2`

journal/reports/morning-2026-08-20.md:30-49 | 2026-08-20 | pipeline.log (ostatni przebieg)
In top 5 of 5 run(s): hybrid-rerank-1024 #4, hybrid-rerank #4, hybrid-rerank-meta-1024 #2, hybrid-rerank-meta #3, meta-index-hybrid-rerank #3

> pipeline.log (ostatni przebieg) data\pipeline-logs\hs-optimism-weth-usdc-030-365d-1787204457818.log) 2026-08-20T05:40:59.205Z ▶ hs-arbitrum-weth-usdc-030-365d (podejście 1/2) 2026-08-20T05:41:00.379Z krok hs-arbitrum-weth-usdc-030-365d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-030-365d ...

### `journal/RESEARCH-QUEUE.md:684#p2`

journal/RESEARCH-QUEUE.md:728-771 | no date | H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
In top 5 of 4 run(s): contextual-haiku-run2-query-pl-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #2, contextual-sonnet-query-pl-hybrid-rerank #3, query-pl-hybrid-rerank #4

> H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie) - [ ] **SQLITE DLA LOGÓW/PAPER (pomysł Rafała 18.08)** — SCHEMAT ZAPROJEKTOWANY: **DB-SCHEMA.md** (zasady rozszerzalności: migracje numerowane, raw-bigint jako TEXT, JSON1 na płynne ładunki, słowniki jako tabele; DDL v1: pool/ve ...

### `docs/DB-SCHEMA.md:1`

docs/DB-SCHEMA.md:1-11 | no date | DB-SCHEMA.md — HOMOS database design (SQLite) | already listed as related
In top 5 of 3 run(s): hybrid-stem-prefix6 #2, meta-index-hybrid #2, vector #2

> # DB-SCHEMA.md — HOMOS database design (SQLite) > **Design document — never implemented; the ledger shipped as ndjson/json > (`bot/ledger.ts`).** None of the files below (`db/migrations/`, > `scripts/db-migrate.ts`, `scripts/db-import.ts`) exist in the repository. The design is > kept because it re ...

### `journal/CONTEXT.md:2989`

journal/CONTEXT.md:2989-2995 | 2026-08-10 | 2026-08-10 — Sesja 3: FAZA 1 START — pipeline danych + silnik backtestingu (kod gotowy, czeka na dane) | already listed as related
In top 5 of 3 run(s): contextual-haiku-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #4, query-pl-hybrid-rerank #5

> ### 2026-08-10 — Sesja 3: FAZA 1 START — pipeline danych + silnik backtestingu (kod gotowy, czeka na dane) - **`scripts/fetch-swaps.ts`** (npm run fetch:swaps): pobiera eventy Swap v3 przez eth_getLogs (chunked, adaptive step, fallback RPC publicnode/llama, resume ze state.json) → `data/cache/<id>.n ...

### `journal/reports/morning-2026-08-29.md:51`

journal/reports/morning-2026-08-29.md:51-65 | 2026-08-29 | pipeline-task.log (tail)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #2, contextual-haiku-query-pl-hybrid-rerank #3

> ## pipeline-task.log (tail) ``` 2026-08-29T03:42:47.622Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-29T03:42:54.415Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1787974967623.log) 2026-08-29T03:42:54.418Z świeżość swap cache: OK=[arbitrum- ...

### `journal/reports/morning-2026-08-30.md:7#p2`

journal/reports/morning-2026-08-30.md:32-49 | 2026-08-30 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-hybrid-rerank #3, contextual-haiku-query-pl-hybrid-rerank #4

> pipeline.log (ostatni przebieg) (log: data\pipeline-logs\hs-base-weth-usdc-030-720d-1788061350224.log) 2026-08-30T03:42:36.551Z ▶ hs-mainnet-usdc-weth-005-720d (podejście 1/2) 2026-08-30T03:42:39.305Z krok hs-mainnet-usdc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-005-720d- ...

### `journal/reports/morning-2026-08-29.md:7#p2`

journal/reports/morning-2026-08-29.md:32-49 | 2026-08-29 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #4, contextual-haiku-run2-query-pl-hybrid-rerank #3

> pipeline.log (ostatni przebieg) (log: data\pipeline-logs\hs-base-weth-usdc-030-720d-1787974952356.log) 2026-08-29T03:42:41.888Z ▶ hs-mainnet-usdc-weth-005-720d (podejście 1/2) 2026-08-29T03:42:44.902Z krok hs-mainnet-usdc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-005-720d- ...

### `docs/DB-SCHEMA.md:13`

docs/DB-SCHEMA.md:13-38 | no date | 1. Design principles (more important than the specific tables)
In top 5 of 2 run(s): hybrid-stem-prefix6 #3, meta-index-hybrid #3

> ## 1. Design principles (more important than the specific tables) 1. **SQLite, file `data/homos.db`, WAL mode** (safe concurrent reads with a single writer; backup.ps1 picks the file up automatically). 2. **Numbered migrations from day 1**: `db/migrations/NNN_name.sql` + table `schema_migrati ...

### `docs/DB-SCHEMA.md:174`

docs/DB-SCHEMA.md:174-189 | no date | 4. Planned rollout (not carried out)
In top 5 of 2 run(s): hybrid-stem-prefix6 #4, meta-index-hybrid #4

> ## 4. Planned rollout (not carried out) 1. `db/migrations/001_init.sql` (the DDL above once frozen) + `scripts/db-migrate.ts` + `scripts/db-import.ts` (idempotent ndjson→SQLite import, resume from the last ts per table). 2. A `db-import` step at the end of the 07:30 pipeline + seeding the `po ...

### `journal/reports/morning-2026-08-27.md:7#p2`

journal/reports/morning-2026-08-27.md:32-49 | 2026-08-27 | pipeline.log (ostatni przebieg)
In top 5 of 2 run(s): contextual-haiku-run2-hybrid-rerank #5, contextual-sonnet-hybrid-rerank #5

> pipeline.log (ostatni przebieg) (log: data\pipeline-logs\hs-base-weth-usdc-030-720d-1787802185776.log) 2026-08-27T03:43:12.007Z ▶ hs-mainnet-usdc-weth-005-720d (podejście 1/2) 2026-08-27T03:43:21.198Z krok hs-mainnet-usdc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-005-720d- ...

### `journal/reports/morning-2026-08-28.md:51`

journal/reports/morning-2026-08-28.md:51-65 | 2026-08-28 | pipeline-task.log (tail)
In top 5 of 1 run(s): contextual-haiku-run2-hybrid-rerank #3

> ## pipeline-task.log (tail) ``` 2026-08-28T03:46:49.417Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-28T03:46:57.687Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1787888809417.log) 2026-08-28T03:46:57.690Z świeżość swap cache: OK=[arbitrum- ...

### `journal/TASKS-ROTATION.md:1`

journal/TASKS-ROTATION.md:1-18 | no date | TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierunek Rafała 26.08)
In top 5 of 1 run(s): vector #4

> # TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierunek Rafała 26.08) > ## ⛔ ZAMKNIĘTY 26.08 wieczór — ROTACJA ODRZUCONA DANYMI. > Backtest zbudowany (backtest/rotation.ts) i policzony TEGO SAMEGO dnia > (CC-Win: 2 okna × 2 silniki, raporty w gicie 4c54c74/339d3f2). Werdykt: > na ...

### `journal/reports/morning-2026-09-23.md:51`

journal/reports/morning-2026-09-23.md:51-65 | 2026-09-23 | pipeline-task.log (tail)
In top 5 of 1 run(s): meta-index-hybrid #5

> ## pipeline-task.log (tail) ``` 2026-09-23T03:44:35.646Z ▶ backtest-run (podejście 1/2) 2026-09-23T05:03:07.956Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1790135075646.log) 2026-09-23T05:03:07.957Z ▶ backtest-selection (podejście 1/2) 2026-09-23T05:03:12.838Z krok backtest-sel ...

### `journal/CONTEXT.md:4554#p3`

journal/CONTEXT.md:4638-4687 | 2026-08-25 | 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30
In top 5 of 1 run(s): vector #5

> 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2E; raport przesunięty 08:45→07:30 Konsekwencje: (a) selection+sweep dziś nie policzone — wieczorem `--only backtest` PRZED backfillem lejka (seria sweep na 26.08 bez dziury); (b) Peak RSS wciąż nieznany — fix CC-Wina loguje na ko ...

