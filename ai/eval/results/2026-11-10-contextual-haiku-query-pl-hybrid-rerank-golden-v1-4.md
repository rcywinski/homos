# Retrieval evaluation: contextual-haiku-query-pl-hybrid-rerank-golden-v1-4

Date 2026-11-10. Golden set v1.4. Retriever `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku`. 957 chunks, corpus hash `8d7f9a3437b43594`.
26 answerable questions of 34: one question = 3.8 pp.

Reranker: device cuda, max_length 2048, 34 requests, server time median 435.4 ms, p95 538.1 ms.
Truncated pairs 0/1020. Tied scores: 18/1020 candidates, 7 of them in a top 10, 8 queries with a tie.

## Metrics

| metric | full | journal-only |
|---|---|---|
| recall@5 | 65% (17/26) | 65% (17/26) |
| recall@10 | 77% (20/26) | 77% (20/26) |
| recall@30 | 92% (24/26) | 92% (24/26) |
| mrr@10 | 0.513 | 0.408 |

Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.

## By category

| category | recall@5 | recall@10 | recall@30 | mrr@10 | recall@10 journal-only |
|---|---|---|---|---|---|
| why | 67% (6/9) | 67% (6/9) | 89% (8/9) | 0.583 | 67% (6/9) |
| dated-fact | 60% (6/10) | 80% (8/10) | 100% (10/10) | 0.341 | 80% (8/10) |
| identifier | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.667 | 86% (6/7) |

Partial/no questions, related chunk in top 10 (informational): 63% (5/8).

## Per question: first hit and top 5

For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).

**why-01**, first hit: 4 (journal-only 4)

- miss    0.690 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.521 `journal/CONTEXT.md:1362#p7` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.457 `journal/RESEARCH-QUEUE.md:926#p2`  E4. PRZEGLĄDY (kalendarz)
- hit     0.445 `journal/CONTEXT.md:1362#p8` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.382 `journal/CONTEXT.md:1362#p10` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R

**why-02**, first hit: 24 (journal-only 24)

- miss    0.568 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.382 `journal/CONTEXT.md:969` 2026-09-01 2026-09-01 ~popołudnie — ANALIZA PRAWDOPODOBIEŃSTW + MONTE CARLO STRAT
- miss    0.352 `journal/CONTEXT.md:190#p2` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.255 `journal/CONTEXT.md:116#p1` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- miss    0.233 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)

**why-03**, first hit: - (journal-only -)

- miss    0.706 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.590 `journal/CONTEXT.md:2178#p2` 2026-08-26 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komple
- miss    0.519 `journal/TASKS-FUNNEL.md:167`  Piętro 2 — FETCH + SCREEN dla top ~50 score (nocami, porcjami)
- miss    0.423 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.308 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1

**why-04**, first hit: 1 (journal-only 3)

- hit     0.990 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.892 `docs/CASE-STUDY.md:105`  5. Conclusions
- hit     0.888 `journal/CONTEXT.md:3276` 2026-08-10 2026-08-10 — Sesja Fable: protokół kooperacji agentów (HANDOFF.md)
- miss    0.818 `docs/PLAN.md:151`  5. Planned vs built
- hit     0.806 `journal/HANDOFF.md:3`  MAPA: 4 miejsca (kto jest kim)

**why-05**, first hit: 1 (journal-only 1)

- hit     0.698 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.543 `journal/TASKS-INFRA.md:9`  Zadania
- miss    0.516 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- miss    0.343 `journal/CONTEXT.md:2871#p2` 2026-08-10 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie
- miss    0.326 `docs/INFRA.md:52`  3. Code flow: Mac (development) → Windows (server)

**why-06**, first hit: 20 (journal-only 20)

- miss    0.533 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.429 `journal/TASKS-UI.md:69#p2`  PARTIA 3 — Telemetria + akcje na kokpicie ✅ wykonana
- miss    0.324 `docs/UI-DESIGN.md:50`  3. Automation loops (requirement → mechanism)
- miss    0.285 `journal/HANDOFF.md:641#p11`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.228 `journal/CONTEXT.md:2713` 2026-08-10 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 

**why-07**, answerable partial; first related: 1

- related 0.653 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- related 0.283 `journal/RESEARCH-QUEUE.md:684#p2`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.157 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.070 `journal/TASKS-INFRA.md:9`  Zadania
- miss    0.064 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup

**why-08**, first hit: 1 (journal-only 1)

- hit     0.895 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- miss    0.814 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.756 `journal/RESEARCH-QUEUE.md:1073#p1`  nie kosztują, róbmy ich więcej") — uporządkowana wg DECYZJI, nie cieka
- miss    0.740 `journal/reports/morning-2026-09-16.md:132` 2026-09-16 RANKING WIDE (pod produkt, top 10)
- hit     0.725 `docs/PAIRS.md:41`  B. Correlated BTC/ETH pairs (lower IL — correlation ~0.7–0.9)

**why-09**, first hit: 1 (journal-only 5)

- hit     0.990 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.989 `journal/CONTEXT.md:4554#p5` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- hit     0.960 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.902 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- hit     0.893 `journal/CONTEXT.md:96` 2026-08-26 Decyzja z 2026-08-26

**why-10**, first hit: 1 (journal-only 1)

- hit     0.352 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.331 `journal/DECYZJE-2026-08-26.md:90#p2`  ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
- miss    0.260 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.226 `journal/DECYZJE-2026-08-26.md:546`  11f. (Nowe, 25.08 noc) ANALIZA 720d — GŁÓWNY PUNKT PRZEGLĄDU
- miss    0.218 `journal/CONTEXT.md:1362#p7` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R

**dated-01**, first hit: 11 (journal-only 11)

- miss    0.416 `journal/HANDOFF.md:641#p3`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.412 `journal/DECYZJE-2026-08-26.md:153`  1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
- miss    0.386 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.202 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.135 `journal/CONTEXT.md:3074` 2026-08-10 2026-08-10 — Sesja terminalowa (Claude Code): operator gita + fetch:ll

**dated-02**, first hit: 5 (journal-only 5)

- miss    0.581 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.219 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.143 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm
- miss    0.103 `journal/CONTEXT.md:1130#p2` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY
- hit     0.083 `journal/CONTEXT.md:1130#p3` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY

**dated-03**, first hit: 2 (journal-only 2)

- miss    0.150 `journal/reports/morning-2026-09-15.md:228` 2026-09-15 PAPER TRADING (start 2026-08-18, $10000/pula)
- hit     0.120 `journal/reports/morning-2026-09-15.md:217` 2026-09-15 POZYCJE REALNE (produkt FlatWide)
- miss    0.062 `journal/reports/morning-2026-09-13.md:287` 2026-09-13 PAPER TRADING (start 2026-08-18, $10000/pula)
- miss    0.054 `journal/CONTEXT.md:116#p2` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- miss    0.049 `journal/reports/morning-2026-09-16.md:237` 2026-09-16 POZYCJE REALNE (produkt FlatWide)

**dated-04**, first hit: 7 (journal-only 7)

- miss    0.529 `journal/reports/morning-2026-08-25.md:51` 2026-08-25 pipeline-task.log (tail)
- miss    0.515 `journal/reports/morning-2026-09-16.md:7#p2` 2026-09-16 pipeline.log (ostatni przebieg)
- miss    0.490 `journal/reports/morning-2026-08-21.md:51` 2026-08-21 pipeline-task.log (tail)
- miss    0.488 `journal/reports/morning-2026-09-05.md:7#p2` 2026-09-05 pipeline.log (ostatni przebieg)
- miss    0.485 `journal/reports/morning-2026-09-21.md:7#p2` 2026-09-21 pipeline.log (ostatni przebieg)

**dated-05**, first hit: 28 (journal-only 28)

- miss    0.024 `journal/CONTEXT.md:277#p4` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.013 `journal/TASKS-UI.md:592#p2`  PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana 
- miss    0.011 `journal/CONTEXT.md:277#p2` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.010 `journal/CONTEXT.md:277#p3` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.006 `journal/HANDOFF.md:254#p3`  @Sonnet (sesja UI, Cowork)

**dated-06**, first hit: 5 (journal-only 5)

- miss    0.735 `journal/reports/morning-2026-08-24.md:51` 2026-08-24 pipeline-task.log (tail)
- miss    0.732 `journal/reports/morning-2026-09-01.md:51` 2026-09-01 pipeline-task.log (tail)
- miss    0.604 `journal/CONTEXT.md:4411#p2` 2026-08-22 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko ziel
- miss    0.521 `journal/reports/morning-2026-09-05.md:51` 2026-09-05 pipeline-task.log (tail)
- hit     0.434 `journal/CONTEXT.md:4411#p1` 2026-08-22 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko ziel

**dated-07**, first hit: 6 (journal-only 6)

- miss    0.020 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.005 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.004 `journal/DECYZJE-2026-08-26.md:90#p1`  ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
- miss    0.004 `journal/TASKS-FUNNEL.md:10`  1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30)
- miss    0.004 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)

**dated-08**, first hit: 1 (journal-only 2)

- hit     0.107 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- hit     0.106 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- hit     0.047 `journal/CONTEXT.md:7#p1`  1. Stan projektu — skrót
- hit     0.041 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.036 `journal/CONTEXT.md:190#p2` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d

**dated-09**, first hit: 1 (journal-only 4)

- hit     0.566 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.326 `journal/CONTEXT.md:277#p4` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.290 `journal/CONTEXT.md:1130#p3` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY
- hit     0.220 `journal/CONTEXT.md:1130#p1` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY
- hit     0.183 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11

**dated-10**, first hit: 5 (journal-only 5)

- miss    0.872 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs
- miss    0.827 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.804 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm
- miss    0.729 `journal/TASKS-UI.md:225#p2`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- hit     0.727 `journal/CONTEXT.md:4165` 2026-08-21 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE

**id-01**, first hit: 1 (journal-only 1)

- hit     0.818 `journal/reports/morning-2026-09-19.md:101` 2026-09-19 propozycje OPEN (4)
- hit     0.796 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)
- hit     0.789 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)
- hit     0.782 `journal/reports/morning-2026-09-20.md:101` 2026-09-20 propozycje OPEN (3)
- hit     0.779 `journal/reports/morning-2026-09-22.md:101` 2026-09-22 propozycje OPEN (3)

**id-02**, first hit: 1 (journal-only 1)

- hit     0.993 `journal/reports/morning-2026-09-16.md:237` 2026-09-16 POZYCJE REALNE (produkt FlatWide)
- hit     0.992 `journal/reports/morning-2026-09-18.md:270` 2026-09-18 POZYCJE REALNE (produkt FlatWide)
- miss    0.983 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)
- miss    0.980 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)
- miss    0.977 `journal/reports/morning-2026-09-20.md:101` 2026-09-20 propozycje OPEN (3)

**id-03**, first hit: - (journal-only -)

- miss    0.837 `journal/reports/morning-2026-09-18.md:270` 2026-09-18 POZYCJE REALNE (produkt FlatWide)
- miss    0.820 `journal/reports/morning-2026-09-16.md:237` 2026-09-16 POZYCJE REALNE (produkt FlatWide)
- miss    0.810 `journal/reports/morning-2026-08-30.md:204` 2026-08-30 POZYCJE REALNE (produkt FlatWide)
- miss    0.794 `journal/reports/morning-2026-09-12.md:276` 2026-09-12 POZYCJE REALNE (produkt FlatWide)
- miss    0.789 `journal/reports/morning-2026-09-14.md:276` 2026-09-14 POZYCJE REALNE (produkt FlatWide)

**id-04**, first hit: 1 (journal-only 1)

- hit     0.022 `journal/RESEARCH-QUEUE.md:498`  D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epiz
- miss    0.005 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.004 `journal/HANDOFF.md:641#p2`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.004 `journal/TASKS-WINDOWS-ADDENDUM.md:1`  TASKS-WINDOWS — ADDENDUM: boty mają być NIEWIDOCZNE
- miss    0.004 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)

**id-05**, first hit: 1 (journal-only 1)

- hit     0.688 `journal/HANDOFF.md:254#p1`  @Sonnet (sesja UI, Cowork)
- miss    0.228 `journal/TASKS-FUNNEL.md:10`  1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30)
- miss    0.091 `journal/CONTEXT.md:2871#p1` 2026-08-10 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie
- miss    0.091 `journal/RESEARCH-QUEUE.md:7#p2`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.082 `journal/TASKS-FUNNEL.md:167`  Piętro 2 — FETCH + SCREEN dla top ~50 score (nocami, porcjami)

**id-06**, first hit: 2 (journal-only 2)

- miss    0.791 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- hit     0.735 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- hit     0.674 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- hit     0.618 `journal/RESEARCH-QUEUE.md:294#p1`  E8. KLASY BEZ LVR + TIMING — kolejka po 24.09 (decyzja Rafała 07.09: „
- hit     0.612 `journal/CONTEXT.md:721` 2026-09-07 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + R

**id-07**, first hit: 6 (journal-only 6)

- related 0.869 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    0.431 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.360 `journal/RESEARCH-QUEUE.md:597#p1` 2026-08-10 F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-1
- miss    0.272 `journal/reports/morning-2026-08-30.md:7#p2` 2026-08-30 pipeline.log (ostatni przebieg)
- miss    0.228 `journal/HANDOFF.md:1264#p2`  @CC-Win (Claude Code od botów windowsowych)

**na-01**, answerable partial; first related: 2

- miss    0.093 `journal/TASKS-LEDGER.md:36`  3. API + UI (lane Sonnet, po warstwie danych)
- related 0.081 `journal/TASKS-LEDGER.md:21`  2. Warstwa danych (bot — lane Fable)
- miss    0.068 `journal/TASKS-LEDGER.md:1`  TASKS-LEDGER.md — księga transakcji + zamknięte pozycje + CSV (spec, 2
- miss    0.023 `journal/HANDOFF.md:254#p2`  @Sonnet (sesja UI, Cowork)
- miss    0.019 `docs/EMERGENCY.md:88`  6. Off-ramp lessons

**na-02**, answerable partial; first related: 2

- miss    0.124 `docs/CASE-STUDY.md:44`  3. What the backtests said
- related 0.051 `journal/CONTEXT.md:548` 2026-09-09 2026-09-09 ~rano — BRIEF (Fable + Rafał): odbiór E8.2d (CC-Mac) — DRYF
- miss    0.022 `journal/reports/morning-2026-09-05.md:7#p2` 2026-09-05 pipeline.log (ostatni przebieg)
- miss    0.015 `journal/CONTEXT.md:3054` 2026-08-10 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 R
- miss    0.014 `journal/RESEARCH-QUEUE.md:95#p2`  B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)

**na-03**, answerable partial; first related: 4

- miss    0.737 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.723 `journal/TASKS-UI.md:700#p1`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po
- miss    0.686 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- related 0.626 `journal/CONTEXT.md:3519` 2026-08-18 2026-08-18 ~10:0x — F4-op: TEST GMX DOMKNIĘTY (short zamknięty, pełny 
- miss    0.539 `journal/reports/morning-2026-09-14.md:101` 2026-09-14 propozycje OPEN (4)

**na-04**, answerable no; first related: -

- miss    0.021 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.018 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    0.014 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.013 `journal/TASKS-WINDOWS.md:16`  Kroki
- miss    0.007 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup

**na-05**, answerable no; first related: -

- miss    0.087 `journal/reports/morning-2026-09-01.md:211` 2026-09-01 PAPER TRADING (start 2026-08-18, $10000/pula)
- miss    0.078 `journal/CONTEXT.md:3054` 2026-08-10 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 R
- miss    0.041 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- miss    0.035 `journal/reports/morning-2026-09-10.md:7#p2` 2026-09-10 pipeline.log (ostatni przebieg)
- miss    0.025 `journal/CONTEXT.md:2347#p3` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 

**na-06**, answerable no; first related: -

- miss    0.024 `journal/RESEARCH-QUEUE.md:597#p2` 2026-08-10 F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-1
- miss    0.013 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    0.009 `journal/TASKS-UI.md:804#p2`  Partia 12 (21.08): usunięcie sekcji „Zarządzaj (zaawansowane)" + fix c
- miss    0.009 `journal/CONTEXT.md:2347#p1` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.009 `journal/CONTEXT.md:4554#p4` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2

**na-07**, answerable partial; first related: 2

- miss    0.548 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- related 0.146 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.098 `journal/reports/morning-2026-08-29.md:51` 2026-08-29 pipeline-task.log (tail)
- miss    0.092 `journal/reports/morning-2026-08-30.md:7#p2` 2026-08-30 pipeline.log (ostatni przebieg)
- miss    0.090 `docs/PLAN.md:151`  5. Planned vs built
