# Retrieval evaluation: contextual-sonnet-query-pl-hybrid-rerank-golden-v1-3

Date 2026-11-10. Golden set v1.3. Retriever `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-sonnet`. 957 chunks, corpus hash `8d7f9a3437b43594`.
26 answerable questions of 34: one question = 3.8 pp.

Reranker: device cuda, max_length 2048, 34 requests, server time median 435.9 ms, p95 542.7 ms.
Truncated pairs 0/1020. Tied scores: 8/1020 candidates, 2 of them in a top 10, 3 queries with a tie.

## Metrics

| metric | full | journal-only |
|---|---|---|
| recall@5 | 62% (16/26) | 58% (15/26) |
| recall@10 | 69% (18/26) | 65% (17/26) |
| recall@30 | 77% (20/26) | 73% (19/26) |
| mrr@10 | 0.448 | 0.342 |

Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.

## By category

| category | recall@5 | recall@10 | recall@30 | mrr@10 | recall@10 journal-only |
|---|---|---|---|---|---|
| why | 56% (5/9) | 67% (6/9) | 78% (7/9) | 0.519 | 56% (5/9) |
| dated-fact | 60% (6/10) | 60% (6/10) | 70% (7/10) | 0.303 | 60% (6/10) |
| identifier | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.565 | 86% (6/7) |

Partial/no questions, related chunk in top 10 (informational): 63% (5/8).

## Per question: first hit and top 5

For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).

**why-01**, first hit: 6 (journal-only -)

- miss    0.510 `journal/RESEARCH-QUEUE.md:926#p2`  E4. PRZEGLĄDY (kalendarz)
- miss    0.502 `journal/CONTEXT.md:1362#p7` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.494 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.438 `journal/CONTEXT.md:1362#p8` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.371 `journal/CONTEXT.md:1362#p10` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R

**why-02**, first hit: - (journal-only -)

- miss    0.427 `journal/CONTEXT.md:190#p2` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.381 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- miss    0.322 `journal/CONTEXT.md:4240#p1` 2026-08-21 2026-08-21 11:xx — Trzy pytania Rafała o paper trading: odpowiedzi + d
- miss    0.281 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- miss    0.226 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d

**why-03**, first hit: - (journal-only -)

- miss    0.697 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.574 `journal/DECYZJE-2026-08-26.md:656`  13. Pomysł Rafała (25.08): backtest 730d (2 lata) — dwa duże reżimy
- miss    0.427 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.360 `journal/TASKS-ROTATION.md:20`  Uczciwa rama (zapisać w raporcie z wyników)
- miss    0.347 `journal/TASKS-RECAL.md:89`  §6 Przebiegi i odbiór

**why-04**, first hit: 1 (journal-only 2)

- hit     0.989 `docs/AI-WORKFLOW.md:25`  The two coordination files
- hit     0.927 `journal/CONTEXT.md:3276` 2026-08-10 2026-08-10 — Sesja Fable: protokół kooperacji agentów (HANDOFF.md)
- miss    0.889 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.854 `docs/PLAN.md:151`  5. Planned vs built
- hit     0.751 `journal/HANDOFF.md:3`  MAPA: 4 miejsca (kto jest kim)

**why-05**, first hit: 2 (journal-only 2)

- miss    0.762 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- hit     0.620 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.571 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.476 `journal/TASKS-INFRA.md:9`  Zadania
- hit     0.441 `journal/CONTEXT.md:3005` 2026-08-10 2026-08-10 — Sesja 3c: Wizja produktu + infrastruktura (dokumenty)

**why-06**, first hit: 20 (journal-only 20)

- miss    0.538 `docs/EMERGENCY.md:1`  _Historical runbook. The product was wound down in September 2026; kep
- miss    0.294 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.276 `docs/UI-DESIGN.md:50`  3. Automation loops (requirement → mechanism)
- miss    0.258 `journal/CONTEXT.md:2713` 2026-08-10 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 
- miss    0.254 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 

**why-07**, answerable partial; first related: 1

- related 0.736 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- related 0.261 `journal/RESEARCH-QUEUE.md:684#p2`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.128 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.080 `docs/PLAN.md:151`  5. Planned vs built
- related 0.068 `journal/CONTEXT.md:3005` 2026-08-10 2026-08-10 — Sesja 3c: Wizja produktu + infrastruktura (dokumenty)

**why-08**, first hit: 1 (journal-only 2)

- hit     0.885 `docs/PAIRS.md:41`  B. Correlated BTC/ETH pairs (lower IL — correlation ~0.7–0.9)
- hit     0.871 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- miss    0.803 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.761 `journal/CONTEXT.md:1130#p4` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY
- miss    0.732 `journal/reports/morning-2026-09-05.md:114` 2026-09-05 RANKING WIDE (pod produkt, top 10)

**why-09**, first hit: 1 (journal-only 4)

- hit     0.983 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.981 `journal/CONTEXT.md:4554#p5` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- hit     0.979 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- hit     0.936 `journal/CONTEXT.md:96` 2026-08-26 Decyzja z 2026-08-26
- hit     0.906 `journal/DECYZJE-2026-08-26.md:546`  11f. (Nowe, 25.08 noc) ANALIZA 720d — GŁÓWNY PUNKT PRZEGLĄDU

**why-10**, first hit: 1 (journal-only 1)

- hit     0.589 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- hit     0.471 `journal/DECYZJE-2026-08-26.md:546`  11f. (Nowe, 25.08 noc) ANALIZA 720d — GŁÓWNY PUNKT PRZEGLĄDU
- miss    0.323 `journal/DECYZJE-2026-08-26.md:90#p2`  ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
- miss    0.164 `journal/CONTEXT.md:798#p1` 2026-09-02 2026-09-02 ~przedpołudnie — Brief + ŚWIEŻE SPOJRZENIE NA ZYSKI (Fable 
- miss    0.164 `journal/DECYZJE-2026-08-26.md:635`  12. Pomysł Rafała (25.08): fallback → HODL przy silnym trendzie UP

**dated-01**, first hit: - (journal-only -)

- miss    0.416 `journal/HANDOFF.md:641#p3`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.397 `journal/DECYZJE-2026-08-26.md:153`  1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
- miss    0.339 `journal/TASKS-UI.md:1042`  PARTIA 13 — PILNA: state control modala „Otwórz pozycję" ✅ wykonana (S
- miss    0.163 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.121 `journal/CONTEXT.md:3074` 2026-08-10 2026-08-10 — Sesja terminalowa (Claude Code): operator gita + fetch:ll

**dated-02**, first hit: - (journal-only -)

- miss    0.196 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.169 `journal/CONTEXT.md:1130#p2` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY
- miss    0.114 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm
- miss    0.073 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.068 `journal/KAPITAL-REKOMENDACJA.md:1`  KAPITAL-REKOMENDACJA.md — pierwsze wejście LP wg ALGORITHM v1.2

**dated-03**, first hit: 3 (journal-only 3)

- miss    0.453 `journal/reports/morning-2026-09-15.md:67#p2` 2026-09-15 selektor (linie z observer.log, ostatnie 30)
- miss    0.416 `journal/reports/morning-2026-09-15.md:228` 2026-09-15 PAPER TRADING (start 2026-08-18, $10000/pula)
- hit     0.153 `journal/reports/morning-2026-09-15.md:217` 2026-09-15 POZYCJE REALNE (produkt FlatWide)
- miss    0.144 `journal/reports/morning-2026-09-18.md:270` 2026-09-18 POZYCJE REALNE (produkt FlatWide)
- miss    0.073 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d

**dated-04**, first hit: - (journal-only -)

- miss    0.639 `journal/reports/morning-2026-08-21.md:7#p2` 2026-08-21 pipeline.log (ostatni przebieg)
- miss    0.595 `journal/reports/morning-2026-08-22.md:51` 2026-08-22 pipeline-task.log (tail)
- miss    0.593 `journal/reports/morning-2026-08-29.md:51` 2026-08-29 pipeline-task.log (tail)
- miss    0.572 `journal/reports/morning-2026-09-16.md:51` 2026-09-16 pipeline-task.log (tail)
- miss    0.535 `journal/reports/morning-2026-08-23.md:51` 2026-08-23 pipeline-task.log (tail)

**dated-05**, first hit: 2 (journal-only 2)

- miss    0.013 `journal/CONTEXT.md:116#p2` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- hit     0.012 `journal/CONTEXT.md:277#p1` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.011 `journal/TASKS-UI.md:592#p2`  PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana 
- miss    0.008 `journal/TASKS-UI.md:773`  Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): iko
- miss    0.006 `journal/TASKS-UI.md:1000`  FIX (25.08 wieczór): UX sekwencji [⏹ Zamknij] + toast na złej karcie

**dated-06**, first hit: 5 (journal-only 5)

- miss    0.595 `journal/reports/morning-2026-09-01.md:51` 2026-09-01 pipeline-task.log (tail)
- miss    0.517 `journal/reports/morning-2026-08-28.md:51` 2026-08-28 pipeline-task.log (tail)
- miss    0.489 `journal/reports/morning-2026-09-20.md:7#p2` 2026-09-20 pipeline.log (ostatni przebieg)
- miss    0.450 `journal/reports/morning-2026-08-29.md:7#p1` 2026-08-29 pipeline.log (ostatni przebieg)
- hit     0.433 `journal/CONTEXT.md:4411#p1` 2026-08-22 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko ziel

**dated-07**, first hit: 11 (journal-only 11)

- miss    0.020 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.009 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.008 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- miss    0.004 `journal/CONTEXT.md:2347#p3` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.004 `docs/PLAN.md:151`  5. Planned vs built

**dated-08**, first hit: 2 (journal-only 2)

- miss    0.141 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- hit     0.044 `journal/CONTEXT.md:190#p2` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.037 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.020 `journal/DECYZJE-2026-08-26.md:9#p1`  ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fab
- hit     0.020 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d

**dated-09**, first hit: 1 (journal-only 7)

- hit     0.628 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.500 `journal/CONTEXT.md:277#p4` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.207 `journal/reports/morning-2026-09-19.md:101` 2026-09-19 propozycje OPEN (4)
- hit     0.203 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.188 `journal/reports/morning-2026-09-11.md:251` 2026-09-11 POZYCJE REALNE (produkt FlatWide)

**dated-10**, first hit: 2 (journal-only 2)

- miss    0.872 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs
- hit     0.817 `journal/CONTEXT.md:4165` 2026-08-21 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE
- miss    0.795 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.792 `journal/DECYZJE-2026-08-26.md:9#p1`  ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fab
- miss    0.785 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm

**id-01**, first hit: 8 (journal-only 8)

- miss    0.861 `journal/reports/morning-2026-09-19.md:101` 2026-09-19 propozycje OPEN (4)
- miss    0.822 `journal/reports/morning-2026-09-20.md:101` 2026-09-20 propozycje OPEN (3)
- miss    0.821 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)
- miss    0.808 `journal/reports/morning-2026-09-22.md:101` 2026-09-22 propozycje OPEN (3)
- miss    0.784 `journal/reports/morning-2026-09-18.md:101` 2026-09-18 propozycje OPEN (3)

**id-02**, first hit: 1 (journal-only 1)

- hit     0.994 `journal/reports/morning-2026-09-14.md:276` 2026-09-14 POZYCJE REALNE (produkt FlatWide)
- hit     0.991 `journal/reports/morning-2026-09-17.md:256` 2026-09-17 POZYCJE REALNE (produkt FlatWide)
- hit     0.984 `journal/reports/morning-2026-09-16.md:237` 2026-09-16 POZYCJE REALNE (produkt FlatWide)
- hit     0.984 `journal/reports/morning-2026-09-12.md:276` 2026-09-12 POZYCJE REALNE (produkt FlatWide)
- hit     0.983 `journal/reports/morning-2026-09-15.md:217` 2026-09-15 POZYCJE REALNE (produkt FlatWide)

**id-03**, first hit: - (journal-only -)

- miss    0.864 `journal/reports/morning-2026-09-14.md:276` 2026-09-14 POZYCJE REALNE (produkt FlatWide)
- miss    0.846 `journal/reports/morning-2026-09-04.md:239` 2026-09-04 POZYCJE REALNE (produkt FlatWide)
- miss    0.828 `journal/reports/morning-2026-09-17.md:256` 2026-09-17 POZYCJE REALNE (produkt FlatWide)
- miss    0.804 `journal/reports/morning-2026-09-18.md:270` 2026-09-18 POZYCJE REALNE (produkt FlatWide)
- miss    0.799 `journal/reports/morning-2026-09-02.md:219` 2026-09-02 POZYCJE REALNE (produkt FlatWide)

**id-04**, first hit: 1 (journal-only 1)

- hit     0.077 `journal/RESEARCH-QUEUE.md:498`  D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epiz
- miss    0.012 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.004 `journal/RESEARCH-QUEUE.md:509`  D. OPERACYJNE PRZYPOMNIENIA
- miss    0.004 `journal/CONTEXT.md:7#p2`  1. Stan projektu — skrót
- miss    0.004 `journal/HANDOFF.md:641#p2`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)

**id-05**, first hit: 1 (journal-only 1)

- hit     0.627 `journal/HANDOFF.md:254#p1`  @Sonnet (sesja UI, Cowork)
- miss    0.278 `journal/RESEARCH-QUEUE.md:7#p2`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.108 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.091 `journal/CONTEXT.md:4195` 2026-08-21 2026-08-21 10:4x — Odbiór raportów CC-Win: fix swap-cache DZIAŁA na pr
- miss    0.077 `journal/TASKS-UI.md:317#p1`  PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zleco

**id-06**, first hit: 2 (journal-only 2)

- miss    0.772 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- hit     0.760 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- hit     0.676 `journal/RESEARCH-QUEUE.md:294#p1`  E8. KLASY BEZ LVR + TIMING — kolejka po 24.09 (decyzja Rafała 07.09: „
- hit     0.669 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- miss    0.651 `journal/CONTEXT.md:721` 2026-09-07 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + R

**id-07**, first hit: 3 (journal-only 3)

- related 0.908 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    0.348 `journal/RESEARCH-QUEUE.md:597#p1` 2026-08-10 F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-1
- hit     0.291 `journal/CONTEXT.md:2989` 2026-08-10 2026-08-10 — Sesja 3: FAZA 1 START — pipeline danych + silnik backtest
- miss    0.283 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.262 `journal/HANDOFF.md:1264#p2`  @CC-Win (Claude Code od botów windowsowych)

**na-01**, answerable partial; first related: 2

- miss    0.155 `journal/TASKS-LEDGER.md:36`  3. API + UI (lane Sonnet, po warstwie danych)
- related 0.092 `journal/TASKS-LEDGER.md:21`  2. Warstwa danych (bot — lane Fable)
- miss    0.023 `docs/UI-DESIGN.md:100`  4.4 Ledger
- miss    0.022 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- miss    0.021 `journal/TASKS-LEDGER.md:1`  TASKS-LEDGER.md — księga transakcji + zamknięte pozycje + CSV (spec, 2

**na-02**, answerable partial; first related: 3

- miss    0.070 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.044 `journal/RESEARCH-QUEUE.md:95#p3`  B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)
- related 0.037 `journal/CONTEXT.md:548` 2026-09-09 2026-09-09 ~rano — BRIEF (Fable + Rafał): odbiór E8.2d (CC-Mac) — DRYF
- miss    0.035 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.033 `journal/reports/morning-2026-08-29.md:7#p2` 2026-08-29 pipeline.log (ostatni przebieg)

**na-03**, answerable partial; first related: 4

- miss    0.717 `journal/TASKS-UI.md:700#p1`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po
- miss    0.713 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.693 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- related 0.627 `journal/CONTEXT.md:3519` 2026-08-18 2026-08-18 ~10:0x — F4-op: TEST GMX DOMKNIĘTY (short zamknięty, pełny 
- miss    0.585 `journal/CONTEXT.md:3503` 2026-08-18 2026-08-18 ~09:3x — F4-op: ODCZYT KOSZTÓW TESTOWEGO SHORTA GMX (po ~17

**na-04**, answerable no; first related: -

- miss    0.056 `journal/TASKS-WINDOWS.md:16`  Kroki
- miss    0.029 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.022 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.006 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- miss    0.004 `journal/CONTEXT.md:3427` 2026-08-18 2026-08-18 ~09:00 — Fable: PORANNA ANALIZA — diagnoza CC-Win + 2 bugi 

**na-05**, answerable no; first related: -

- miss    0.190 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    0.029 `journal/reports/morning-2026-09-10.md:7#p2` 2026-09-10 pipeline.log (ostatni przebieg)
- miss    0.027 `journal/CONTEXT.md:2032#p2` 2026-08-27 2026-08-27 ~rano — SESJA DECYZYJNA (Fable + Rafał) — w toku
- miss    0.024 `journal/CONTEXT.md:2347#p3` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.024 `journal/reports/morning-2026-09-05.md:7#p2` 2026-09-05 pipeline.log (ostatni przebieg)

**na-06**, answerable no; first related: -

- miss    0.022 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.018 `journal/CONTEXT.md:7#p1`  1. Stan projektu — skrót
- miss    0.017 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    0.015 `journal/TASKS-INFRA.md:9`  Zadania
- miss    0.010 `journal/CONTEXT.md:4554#p4` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2

**na-07**, answerable partial; first related: 2

- miss    0.428 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- related 0.415 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.236 `journal/RESEARCH-QUEUE.md:684#p2`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.166 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.092 `journal/reports/morning-2026-08-26.md:7#p2` 2026-08-26 pipeline.log (ostatni przebieg)
