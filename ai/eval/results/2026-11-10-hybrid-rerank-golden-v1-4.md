# Retrieval evaluation: hybrid-rerank-golden-v1-4

Date 2026-11-10. Golden set v1.4. Retriever `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30)`. 957 chunks, corpus hash `8d7f9a3437b43594`.
26 answerable questions of 34: one question = 3.8 pp.

Reranker: device cuda, max_length 2048, 34 requests, server time median 359.5 ms, p95 472.5 ms.
Truncated pairs 0/1020. Tied scores: 24/1020 candidates, 5 of them in a top 10, 11 queries with a tie.

## Metrics

| metric | full | journal-only |
|---|---|---|
| recall@5 | 62% (16/26) | 42% (11/26) |
| recall@10 | 65% (17/26) | 54% (14/26) |
| recall@30 | 77% (20/26) | 65% (17/26) |
| mrr@10 | 0.441 | 0.255 |

Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.

## By category

| category | recall@5 | recall@10 | recall@30 | mrr@10 | recall@10 journal-only |
|---|---|---|---|---|---|
| why | 78% (7/9) | 78% (7/9) | 89% (8/9) | 0.509 | 67% (6/9) |
| dated-fact | 60% (6/10) | 60% (6/10) | 70% (7/10) | 0.475 | 40% (4/10) |
| identifier | 43% (3/7) | 57% (4/7) | 71% (5/7) | 0.304 | 57% (4/7) |

Partial/no questions, related chunk in top 10 (informational): 38% (3/8).

## Per question: first hit and top 5

For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).

**why-01**, first hit: 3 (journal-only 8)

- miss    0.450 `journal/CONTEXT.md:1362#p7` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.319 `journal/RESEARCH-QUEUE.md:926#p2`  E4. PRZEGLĄDY (kalendarz)
- hit     0.296 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.170 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.129 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1

**why-02**, first hit: - (journal-only -)

- miss    0.204 `journal/CONTEXT.md:4240#p1` 2026-08-21 2026-08-21 11:xx — Trzy pytania Rafała o paper trading: odpowiedzi + d
- miss    0.192 `journal/CONTEXT.md:969` 2026-09-01 2026-09-01 ~popołudnie — ANALIZA PRAWDOPODOBIEŃSTW + MONTE CARLO STRAT
- miss    0.158 `journal/reports/morning-2026-09-09.md:127` 2026-09-09 RANKING WIDE (pod produkt, top 10)
- miss    0.155 `journal/reports/morning-2026-09-14.md:171` 2026-09-14 RANKING WIDE (pod produkt, top 10)
- miss    0.153 `journal/RESEARCH-QUEUE.md:597#p1` 2026-08-10 F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-1

**why-03**, first hit: 2 (journal-only 2)

- miss    0.491 `docs/CASE-STUDY.md:44`  3. What the backtests said
- hit     0.431 `journal/CONTEXT.md:4554#p5` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.328 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.224 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- miss    0.221 `journal/CONTEXT.md:2178#p2` 2026-08-26 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komple

**why-04**, first hit: 1 (journal-only 4)

- hit     0.978 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.904 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.810 `docs/PLAN.md:151`  5. Planned vs built
- hit     0.585 `journal/HANDOFF.md:3`  MAPA: 4 miejsca (kto jest kim)
- miss    0.275 `docs/AI-WORKFLOW.md:8`  The four roles

**why-05**, first hit: 4 (journal-only 4)

- miss    0.557 `journal/TASKS-INFRA.md:9`  Zadania
- miss    0.454 `journal/CONTEXT.md:2347#p1` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.413 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)
- hit     0.351 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.281 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup

**why-06**, first hit: 28 (journal-only -)

- miss    0.302 `docs/UI-DESIGN.md:50`  3. Automation loops (requirement → mechanism)
- miss    0.234 `docs/EMERGENCY.md:1`  _Historical runbook. The product was wound down in September 2026; kep
- miss    0.233 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.231 `journal/CONTEXT.md:2713` 2026-08-10 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 
- miss    0.223 `journal/TASKS-UI.md:700#p1`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po

**why-07**, answerable partial; first related: 1

- related 0.486 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- related 0.135 `journal/RESEARCH-QUEUE.md:684#p2`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.073 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)
- miss    0.043 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.039 `docs/AI-WORKFLOW.md:8`  The four roles

**why-08**, first hit: 1 (journal-only 2)

- hit     0.851 `docs/PAIRS.md:41`  B. Correlated BTC/ETH pairs (lower IL — correlation ~0.7–0.9)
- hit     0.833 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- miss    0.780 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.647 `journal/reports/morning-2026-09-08.md:112` 2026-09-08 RANKING WIDE (pod produkt, top 10)
- miss    0.643 `journal/reports/morning-2026-09-05.md:114` 2026-09-05 RANKING WIDE (pod produkt, top 10)

**why-09**, first hit: 1 (journal-only -)

- hit     0.977 `docs/CASE-STUDY.md:44`  3. What the backtests said
- hit     0.901 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.877 `journal/CONTEXT.md:4554#p5` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.847 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- miss    0.832 `journal/HANDOFF.md:641#p5`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)

**why-10**, first hit: 2 (journal-only 2)

- miss    0.303 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- hit     0.297 `journal/DECYZJE-2026-08-26.md:546`  11f. (Nowe, 25.08 noc) ANALIZA 720d — GŁÓWNY PUNKT PRZEGLĄDU
- miss    0.238 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.220 `journal/DECYZJE-2026-08-26.md:90#p2`  ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
- miss    0.215 `journal/RESEARCH-QUEUE.md:529#p2`  E. WDROŻENIA KODU (dla Claude Code / terminala)

**dated-01**, first hit: - (journal-only -)

- miss    0.282 `journal/HANDOFF.md:641#p3`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.247 `journal/DECYZJE-2026-08-26.md:153`  1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
- miss    0.188 `journal/CONTEXT.md:4554#p3` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.145 `docs/DB-SCHEMA.md:13`  1. Design principles (more important than the specific tables)
- miss    0.123 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)

**dated-02**, first hit: 2 (journal-only -)

- miss    0.445 `docs/CASE-STUDY.md:44`  3. What the backtests said
- hit     0.069 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.065 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs
- miss    0.049 `journal/HANDOFF.md:641#p3`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.036 `journal/RESEARCH-QUEUE.md:95#p2`  B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)

**dated-03**, first hit: 1 (journal-only 1)

- hit     0.570 `journal/CONTEXT.md:246` 2026-09-16 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.2
- miss    0.061 `journal/CONTEXT.md:277#p2` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.061 `journal/reports/morning-2026-09-15.md:112` 2026-09-15 RANKING WIDE (pod produkt, top 10)
- miss    0.042 `journal/CONTEXT.md:7#p1`  1. Stan projektu — skrót
- miss    0.041 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d

**dated-04**, first hit: - (journal-only -)

- miss    0.483 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.430 `journal/reports/morning-2026-08-20.md:7#p2` 2026-08-20 pipeline.log (ostatni przebieg)
- miss    0.412 `journal/reports/morning-2026-08-21.md:7#p2` 2026-08-21 pipeline.log (ostatni przebieg)
- miss    0.405 `journal/reports/morning-2026-08-26.md:7#p2` 2026-08-26 pipeline.log (ostatni przebieg)
- miss    0.401 `journal/reports/morning-2026-08-22.md:7#p2` 2026-08-22 pipeline.log (ostatni przebieg)

**dated-05**, first hit: - (journal-only -)

- miss    0.014 `journal/TASKS-UI.md:592#p2`  PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana 
- miss    0.008 `journal/TASKS-UI.md:592#p1`  PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana 
- miss    0.006 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.004 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.003 `journal/TASKS-UI.md:773`  Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): iko

**dated-06**, first hit: 1 (journal-only 1)

- hit     0.326 `journal/CONTEXT.md:4411#p1` 2026-08-22 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko ziel
- miss    0.123 `journal/HANDOFF.md:641#p1`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.042 `journal/CONTEXT.md:3971` 2026-08-12 2026-08-12 07:50 — Sesja Fable-desktop (poranny brief): INTERPRETACJA 
- miss    0.038 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.030 `docs/AI-WORKFLOW.md:25`  The two coordination files

**dated-07**, first hit: 15 (journal-only 15)

- miss    0.012 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.003 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.003 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.002 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.002 `docs/CASE-STUDY.md:44`  3. What the backtests said

**dated-08**, first hit: 1 (journal-only 8)

- hit     0.074 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- hit     0.018 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.009 `docs/DECISION-LOG.md:32` 2026-09-22 Decision of 2026-09-22
- miss    0.007 `journal/DECYZJE-2026-08-26.md:153`  1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
- miss    0.007 `journal/DECYZJE-2026-08-26.md:218`  5a. (stare brzmienie punktu, do kontekstu)

**dated-09**, first hit: 1 (journal-only 13)

- hit     0.634 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.350 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.312 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.101 `journal/RESEARCH-QUEUE.md:926#p1`  E4. PRZEGLĄDY (kalendarz)
- miss    0.090 `journal/HANDOFF.md:641#p4`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)

**dated-10**, first hit: 4 (journal-only 4)

- miss    0.855 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.804 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs
- miss    0.683 `journal/CONTEXT.md:2623` 2026-08-18 2026-08-18 — Sesja UI (Sonnet) — Partia 5: wizualizacja paper-tradingu
- hit     0.669 `journal/CONTEXT.md:4165` 2026-08-21 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE
- miss    0.658 `journal/CONTEXT.md:2347#p1` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 

**id-01**, first hit: 2 (journal-only 2)

- miss    0.683 `journal/HANDOFF.md:254#p4`  @Sonnet (sesja UI, Cowork)
- hit     0.677 `journal/HANDOFF.md:641#p4`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- hit     0.591 `journal/TASKS-UI.md:1134`  PARTIA 16 — karty propozycji FLAT_NARROW / FLAT_WIDEN (produkt FlatWid
- miss    0.585 `journal/HANDOFF.md:29#p4`  @Fable (sesja analityczna)
- miss    0.568 `journal/CONTEXT.md:1362#p5` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R

**id-02**, first hit: 8 (journal-only 8)

- miss    0.886 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)
- miss    0.877 `journal/reports/morning-2026-09-23.md:101` 2026-09-23 propozycje OPEN (1)
- miss    0.869 `journal/reports/morning-2026-09-18.md:101` 2026-09-18 propozycje OPEN (3)
- miss    0.845 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)
- miss    0.835 `journal/reports/morning-2026-09-21.md:101` 2026-09-21 propozycje OPEN (3)

**id-03**, first hit: - (journal-only -)

- miss    0.632 `journal/reports/morning-2026-08-29.md:181` 2026-08-29 POZYCJE REALNE (produkt FlatWide)
- miss    0.576 `journal/reports/morning-2026-09-04.md:239` 2026-09-04 POZYCJE REALNE (produkt FlatWide)
- miss    0.569 `journal/reports/morning-2026-09-13.md:276` 2026-09-13 POZYCJE REALNE (produkt FlatWide)
- miss    0.558 `journal/reports/morning-2026-09-09.md:232` 2026-09-09 POZYCJE REALNE (produkt FlatWide)
- miss    0.552 `journal/reports/morning-2026-08-30.md:204` 2026-08-30 POZYCJE REALNE (produkt FlatWide)

**id-04**, first hit: - (journal-only -)

- miss    0.004 `journal/RESEARCH-QUEUE.md:509`  D. OPERACYJNE PRZYPOMNIENIA
- miss    0.003 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- miss    0.003 `journal/HANDOFF.md:641#p2`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.003 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.003 `docs/AI-WORKFLOW.md:25`  The two coordination files

**id-05**, first hit: 1 (journal-only 1)

- hit     0.605 `journal/CONTEXT.md:277#p2` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- hit     0.549 `journal/HANDOFF.md:254#p1`  @Sonnet (sesja UI, Cowork)
- hit     0.405 `journal/CONTEXT.md:246` 2026-09-16 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.2
- miss    0.077 `journal/RESEARCH-QUEUE.md:529#p2`  E. WDROŻENIA KODU (dla Claude Code / terminala)
- miss    0.059 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana

**id-06**, first hit: 2 (journal-only 2)

- miss    0.736 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- hit     0.724 `journal/RESEARCH-QUEUE.md:294#p1`  E8. KLASY BEZ LVR + TIMING — kolejka po 24.09 (decyzja Rafała 07.09: „
- hit     0.679 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- hit     0.656 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- hit     0.651 `journal/CONTEXT.md:721` 2026-09-07 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + R

**id-07**, first hit: 13 (journal-only 13)

- related 0.657 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    0.294 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.290 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.218 `journal/reports/morning-2026-08-31.md:51` 2026-08-31 pipeline-task.log (tail)
- miss    0.217 `journal/reports/morning-2026-08-22.md:51` 2026-08-22 pipeline-task.log (tail)

**na-01**, answerable partial; first related: 21

- miss    0.109 `journal/TASKS-LEDGER.md:36`  3. API + UI (lane Sonnet, po warstwie danych)
- miss    0.043 `docs/UI-DESIGN.md:13`  1. As built vs planned
- miss    0.011 `journal/CONTEXT.md:2931` 2026-08-10 2026-08-10 — Sesja 2: Faza 0 — naprawa obliczeń
- miss    0.009 `journal/CONTEXT.md:277#p4` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.008 `docs/EMERGENCY.md:88`  6. Off-ramp lessons

**na-02**, answerable partial; first related: 3

- miss    0.061 `journal/RESEARCH-QUEUE.md:597#p1` 2026-08-10 F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-1
- miss    0.032 `journal/reports/morning-2026-08-26.md:7#p2` 2026-08-26 pipeline.log (ostatni przebieg)
- related 0.030 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- related 0.027 `journal/CONTEXT.md:548` 2026-09-09 2026-09-09 ~rano — BRIEF (Fable + Rafał): odbiór E8.2d (CC-Mac) — DRYF
- miss    0.025 `journal/reports/morning-2026-08-20.md:7#p2` 2026-08-20 pipeline.log (ostatni przebieg)

**na-03**, answerable partial; first related: 6

- miss    0.700 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.639 `docs/ALGORITHM.md:43` 2026-08-11 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug
- miss    0.613 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.572 `journal/TASKS-UI.md:700#p1`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po
- miss    0.469 `journal/CONTEXT.md:3375` 2026-08-17 2026-08-17 (~14:40) — F4-op: WYBÓR VENUE PERP DLA HEDGE (research, dec

**na-04**, answerable no; first related: -

- miss    0.020 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.015 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    0.014 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.006 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.004 `journal/TASKS-INFRA.md:9`  Zadania

**na-05**, answerable no; first related: -

- miss    0.160 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    0.092 `journal/reports/morning-2026-09-10.md:51` 2026-09-10 pipeline-task.log (tail)
- miss    0.075 `journal/reports/morning-2026-08-24.md:7#p2` 2026-08-24 pipeline.log (ostatni przebieg)
- miss    0.067 `journal/reports/morning-2026-08-23.md:7#p2` 2026-08-23 pipeline.log (ostatni przebieg)
- miss    0.057 `journal/reports/morning-2026-09-10.md:7#p1` 2026-09-10 pipeline.log (ostatni przebieg)

**na-06**, answerable no; first related: 28

- miss    0.008 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.008 `journal/CONTEXT.md:4554#p4` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.006 `docs/ALGORITHM.md:43` 2026-08-11 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug
- miss    0.006 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    0.006 `docs/PLAN.md:151`  5. Planned vs built

**na-07**, answerable partial; first related: 23

- miss    0.512 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    0.155 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.133 `journal/reports/morning-2026-08-26.md:7#p2` 2026-08-26 pipeline.log (ostatni przebieg)
- miss    0.107 `journal/reports/morning-2026-08-20.md:7#p2` 2026-08-20 pipeline.log (ostatni przebieg)
- miss    0.079 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
