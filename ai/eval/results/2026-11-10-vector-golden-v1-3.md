# Retrieval evaluation: vector-golden-v1-3

Date 2026-11-10. Golden set v1.3. Retriever `vector:ollama-bge-m3`. 957 chunks, corpus hash `8d7f9a3437b43594`.
26 answerable questions of 34: one question = 3.8 pp.

## Metrics

| metric | full | journal-only |
|---|---|---|
| recall@5 | 50% (13/26) | 27% (7/26) |
| recall@10 | 58% (15/26) | 46% (12/26) |
| recall@30 | 58% (15/26) | 54% (14/26) |
| mrr@10 | 0.378 | 0.203 |

Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.

## By category

| category | recall@5 | recall@10 | recall@30 | mrr@10 | recall@10 journal-only |
|---|---|---|---|---|---|
| why | 67% (6/9) | 67% (6/9) | 67% (6/9) | 0.500 | 33% (3/9) |
| dated-fact | 30% (3/10) | 40% (4/10) | 40% (4/10) | 0.244 | 40% (4/10) |
| identifier | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.413 | 71% (5/7) |

Partial/no questions, related chunk in top 10 (informational): 50% (4/8).

## Per question: first hit and top 5

For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).

**why-01**, first hit: 2 (journal-only 129)

- miss    0.569 `docs/PLAN.md:99`  3.6. The rebalance policy is richer than "went out of range → move it"
- hit     0.560 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.535 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.530 `journal/RESEARCH-QUEUE.md:1073#p2`  nie kosztują, róbmy ich więcej") — uporządkowana wg DECYZJI, nie cieka
- miss    0.524 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs

**why-02**, first hit: 35 (journal-only 35)

- miss    0.570 `docs/DECISION-LOG.md:31` 2026-09-21 Decision of 2026-09-21
- miss    0.555 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.552 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.542 `journal/CONTEXT.md:116#p1` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- miss    0.535 `journal/DECYZJE-2026-08-26.md:153`  1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)

**why-03**, first hit: 45 (journal-only 45)

- miss    0.567 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.564 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.520 `docs/PAIRS.md:1`  Pair and pool analysis — LP portfolio diversification
- miss    0.489 `docs/DECISION-LOG.md:23` 2026-08-26 Decision of 2026-08-26
- miss    0.485 `docs/DECISION-LOG.md:21` 2026-08-26 Decision of 2026-08-26

**why-04**, first hit: 1 (journal-only 2)

- hit     0.709 `docs/AI-WORKFLOW.md:25`  The two coordination files
- hit     0.566 `journal/HANDOFF.md:3`  MAPA: 4 miejsca (kto jest kim)
- miss    0.565 `docs/AI-WORKFLOW.md:1`  How the project was run with AI sessions
- miss    0.558 `docs/AI-WORKFLOW.md:8`  The four roles
- hit     0.528 `journal/CONTEXT.md:3276` 2026-08-10 2026-08-10 — Sesja Fable: protokół kooperacji agentów (HANDOFF.md)

**why-05**, first hit: 2 (journal-only 7)

- miss    0.629 `docs/INFRA.md:52`  3. Code flow: Mac (development) → Windows (server)
- hit     0.615 `docs/INFRA.md:1`  INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN
- miss    0.588 `docs/INFRA.md:38`  2. Network and security
- miss    0.581 `docs/INFRA.md:73`  5. Rollout (planned vs actual)
- miss    0.581 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup

**why-06**, first hit: 71 (journal-only 71)

- miss    0.485 `docs/EMERGENCY.md:1`  _Historical runbook. The product was wound down in September 2026; kep
- miss    0.477 `journal/CONTEXT.md:2347#p1` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.470 `journal/TASKS-UI.md:465#p2`  PARTIA 8 — ROTATE: automatyczne [Zatwierdź] (cross-pool) ✅ wykonana — 
- miss    0.470 `docs/UI-DESIGN.md:92`  4.3 Autopilot *(not implemented)*
- miss    0.462 `docs/PLAN.md:95`  3.5. MEV and execution

**why-07**, answerable partial; first related: 3

- miss    0.562 `docs/INFRA.md:73`  5. Rollout (planned vs actual)
- miss    0.552 `docs/INFRA.md:1`  INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN
- related 0.544 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    0.540 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- miss    0.540 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)

**why-08**, first hit: 2 (journal-only 7)

- miss    0.611 `docs/ALGORITHM.md:84` 2026-08-11 6. Portfolio (revision of 11 Aug; the original candidate list is in [`
- hit     0.601 `docs/PAIRS.md:41`  B. Correlated BTC/ETH pairs (lower IL — correlation ~0.7–0.9)
- miss    0.572 `journal/CONTEXT.md:4240#p1` 2026-08-21 2026-08-21 11:xx — Trzy pytania Rafała o paper trading: odpowiedzi + d
- miss    0.564 `journal/reports/morning-2026-09-21.md:170` 2026-09-21 RANKING WIDE (pod produkt, top 10)
- miss    0.563 `journal/reports/morning-2026-09-20.md:170` 2026-09-20 RANKING WIDE (pod produkt, top 10)

**why-09**, first hit: 1 (journal-only 19)

- hit     0.651 `docs/CASE-STUDY.md:44`  3. What the backtests said
- hit     0.625 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.599 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31
- miss    0.549 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.546 `docs/DECISION-LOG.md:15` 2026-08-11 Decision of 2026-08-11

**why-10**, first hit: 1 (journal-only 27)

- hit     0.584 `docs/CASE-STUDY.md:5`  1. The question
- miss    0.537 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.530 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    0.530 `docs/PLAN.md:91`  3.4. Funding rate is not only a cost — it can be income
- miss    0.530 `docs/EMERGENCY.md:21`  1. Default reaction: sign nothing

**dated-01**, first hit: 160 (journal-only 160)

- miss    0.537 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.516 `journal/DECYZJE-2026-08-26.md:153`  1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
- miss    0.511 `docs/AI-WORKFLOW.md:1`  How the project was run with AI sessions
- miss    0.508 `docs/CASE-STUDY.md:1`  HOMOS — case study
- miss    0.506 `journal/TASKS-FUNNEL.md:10`  1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30)

**dated-02**, first hit: 74 (journal-only 74)

- miss    0.516 `journal/PYTANIE-SZEROKOSC-I-SIGMA.md:137`  7. Ograniczenia praktyczne (dla realistycznych odpowiedzi)
- miss    0.484 `journal/DECYZJE-2026-08-26.md:9#p1`  ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fab
- miss    0.483 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.480 `journal/DECYZJE-2026-08-26.md:153`  1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)
- miss    0.477 `journal/CONTEXT.md:4165` 2026-08-21 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE

**dated-03**, first hit: 251 (journal-only 251)

- miss    0.426 `journal/CONTEXT.md:246` 2026-09-16 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.2
- miss    0.425 `journal/CONTEXT.md:7#p1`  1. Stan projektu — skrót
- miss    0.423 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.421 `journal/DECYZJE-2026-08-26.md:490`  11b. (Nowe, 25.08 wieczór) Księga transakcji PRZED kapitałem
- miss    0.420 `journal/CONTEXT.md:116#p2` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS

**dated-04**, first hit: 80 (journal-only 80)

- miss    0.529 `journal/HANDOFF.md:641#p12`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.515 `journal/reports/morning-2026-08-26.md:7#p2` 2026-08-26 pipeline.log (ostatni przebieg)
- miss    0.514 `journal/reports/morning-2026-08-26.md:51` 2026-08-26 pipeline-task.log (tail)
- miss    0.512 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.511 `journal/reports/morning-2026-08-20.md:7#p2` 2026-08-20 pipeline.log (ostatni przebieg)

**dated-05**, first hit: 71 (journal-only 71)

- miss    0.441 `docs/AI-WORKFLOW.md:71`  What worked
- miss    0.440 `journal/TASKS-UI.md:773`  Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): iko
- miss    0.435 `docs/UI-DESIGN.md:135`  7. Rotation policy: weakest position → better opportunity
- miss    0.430 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.428 `docs/EMERGENCY.md:81`  5. What this document does not cover

**dated-06**, first hit: 1 (journal-only 1)

- hit     0.529 `journal/CONTEXT.md:2347#p1` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- hit     0.516 `journal/CONTEXT.md:4411#p1` 2026-08-22 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko ziel
- hit     0.484 `journal/CONTEXT.md:2514#p1` 2026-08-19 2026-08-19 — Sesja analityczna (Fable) — odbiór nocy: root cause pipel
- miss    0.476 `journal/CONTEXT.md:4300#p2` 2026-08-21 2026-08-21 ~16:0x — Wdrożenie UI OK, ale cofnęliśmy migrację NSSM→pm2 
- miss    0.475 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 

**dated-07**, first hit: 46 (journal-only 46)

- miss    0.479 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.468 `docs/DECISION-LOG.md:23` 2026-08-26 Decision of 2026-08-26
- miss    0.466 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)
- miss    0.456 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)
- miss    0.449 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)

**dated-08**, first hit: 9 (journal-only 9)

- miss    0.455 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- miss    0.439 `docs/DECISION-LOG.md:29` 2026-09-16 Decision of 2026-09-16
- miss    0.430 `docs/DECISION-LOG.md:32` 2026-09-22 Decision of 2026-09-22
- miss    0.424 `journal/DECYZJE-2026-08-26.md:218`  5a. (stare brzmienie punktu, do kontekstu)
- miss    0.416 `journal/DECYZJE-2026-08-26.md:153`  1. KAPITAŁ — pierwsze realne wejście LP (główna decyzja)

**dated-09**, first hit: 1 (journal-only 6)

- hit     0.519 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.483 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.453 `journal/CONTEXT.md:1362#p6` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.445 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31
- miss    0.443 `journal/RESEARCH-QUEUE.md:843`  E1. ZAMKNIĘTY 31.08 (przegląd): COMPARE_HL_D odebrany — kotwica bez zm

**dated-10**, first hit: 3 (journal-only 3)

- miss    0.619 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm
- miss    0.619 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- hit     0.602 `journal/CONTEXT.md:4165` 2026-08-21 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE
- miss    0.599 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.588 `journal/PYTANIE-SZEROKOSC-I-SIGMA.md:137`  7. Ograniczenia praktyczne (dla realistycznych odpowiedzi)

**id-01**, first hit: 1 (journal-only 1)

- hit     0.583 `journal/HANDOFF.md:641#p4`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- hit     0.580 `journal/TASKS-UI.md:1134`  PARTIA 16 — karty propozycji FLAT_NARROW / FLAT_WIDEN (produkt FlatWid
- miss    0.575 `journal/reports/morning-2026-09-23.md:101` 2026-09-23 propozycje OPEN (1)
- miss    0.573 `journal/reports/morning-2026-09-20.md:101` 2026-09-20 propozycje OPEN (3)
- miss    0.572 `journal/reports/morning-2026-09-21.md:101` 2026-09-21 propozycje OPEN (3)

**id-02**, first hit: 4 (journal-only 4)

- miss    0.485 `journal/reports/morning-2026-08-29.md:181` 2026-08-29 POZYCJE REALNE (produkt FlatWide)
- miss    0.467 `journal/reports/morning-2026-09-09.md:127` 2026-09-09 RANKING WIDE (pod produkt, top 10)
- miss    0.466 `docs/ALGORITHM.md:27`  2. Position range (advisor — src/utils/advisor.ts)
- hit     0.464 `journal/reports/morning-2026-09-18.md:270` 2026-09-18 POZYCJE REALNE (produkt FlatWide)
- miss    0.464 `journal/reports/morning-2026-08-31.md:219` 2026-08-31 POZYCJE REALNE (produkt FlatWide)

**id-03**, first hit: 109 (journal-only 109)

- miss    0.453 `journal/TASKS-UI.md:1190`  PARTIA 17 — panel zbiorczy REALNYCH pozycji + linia CYKLU FlatWide ✅ w
- miss    0.448 `journal/TASKS-UI.md:773`  Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): iko
- miss    0.445 `journal/reports/morning-2026-08-29.md:181` 2026-08-29 POZYCJE REALNE (produkt FlatWide)
- miss    0.442 `journal/RESEARCH-QUEUE.md:1155`  E6b. KSZTAŁT SZEROKIEJ NOGI (02.09, brief „świeże spojrzenie" — decyzj
- miss    0.440 `journal/HANDOFF.md:641#p4`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)

**id-04**, first hit: 193 (journal-only 193)

- miss    0.443 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.431 `docs/AI-WORKFLOW.md:8`  The four roles
- miss    0.428 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.417 `docs/AI-WORKFLOW.md:1`  How the project was run with AI sessions
- miss    0.417 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)

**id-05**, first hit: 1 (journal-only 1)

- hit     0.583 `journal/HANDOFF.md:254#p1`  @Sonnet (sesja UI, Cowork)
- miss    0.539 `journal/TASKS-UI.md:317#p2`  PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zleco
- miss    0.537 `journal/CONTEXT.md:4085#p1` 2026-08-21 2026-08-21 (Fable, po briefie) — FIX: zamrożony `latest` w fetch-swaps
- miss    0.523 `journal/TASKS-UI.md:317#p1`  PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zleco
- miss    0.509 `journal/CONTEXT.md:2979` 2026-08-10 2026-08-10 — Sesja 2e: Konfiguracja pul + Base + moduł Top Pools (zaim

**id-06**, first hit: 2 (journal-only 2)

- miss    0.527 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- hit     0.503 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- hit     0.499 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- miss    0.479 `journal/CONTEXT.md:721` 2026-09-07 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + R
- hit     0.466 `journal/RESEARCH-QUEUE.md:294#p1`  E8. KLASY BEZ LVR + TIMING — kolejka po 24.09 (decyzja Rafała 07.09: „

**id-07**, first hit: 7 (journal-only 7)

- related 0.586 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    0.493 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.491 `docs/PAIRS.md:1`  Pair and pool analysis — LP portfolio diversification
- miss    0.490 `journal/TASKS-ROTATION.md:1`  TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierun
- miss    0.490 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)

**na-01**, answerable partial; first related: 71

- miss    0.512 `journal/KAPITAL-REKOMENDACJA.md:74`  5. Pyłki mainnet (#953465 ~$88, #953427 ~$2)
- miss    0.510 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    0.501 `docs/DECISION-LOG.md:13` 2026-08-10 Decision of 2026-08-10
- miss    0.501 `journal/TASKS-LEDGER.md:1`  TASKS-LEDGER.md — księga transakcji + zamknięte pozycje + CSV (spec, 2
- miss    0.497 `docs/UI-DESIGN.md:78`  4.2 Positions

**na-02**, answerable partial; first related: 10

- miss    0.432 `journal/DECYZJE-2026-08-26.md:656`  13. Pomysł Rafała (25.08): backtest 730d (2 lata) — dwa duże reżimy
- miss    0.428 `journal/TASKS-ROTATION.md:1`  TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierun
- miss    0.428 `journal/CONTEXT.md:1045` 2026-09-01 2026-09-01 ~10:xx — E7 KROK 1 WYKONANY (Fable): inwentaryzacja v4 — wy
- miss    0.427 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.426 `journal/CONTEXT.md:4554#p3` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2

**na-03**, answerable partial; first related: 1

- related 0.613 `journal/CONTEXT.md:3519` 2026-08-18 2026-08-18 ~10:0x — F4-op: TEST GMX DOMKNIĘTY (short zamknięty, pełny 
- miss    0.609 `journal/CONTEXT.md:3503` 2026-08-18 2026-08-18 ~09:3x — F4-op: ODCZYT KOSZTÓW TESTOWEGO SHORTA GMX (po ~17
- miss    0.601 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.595 `docs/EMERGENCY.md:33`  2. Option A — delta-neutral hedge (preferred: reversible, the LP stays
- miss    0.548 `journal/TASKS-UI.md:700#p1`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po

**na-04**, answerable no; first related: 82

- miss    0.512 `journal/CONTEXT.md:3159` 2026-08-10 2026-08-10 — Sesja 3i: domknięcie danych + weryfikacja IL w warstwie s
- miss    0.507 `journal/CONTEXT.md:1362#p3` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.497 `journal/TASKS-RECAL.md:63`  §4 Gaz — koniec stałej $8 na mainnet
- miss    0.495 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.493 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)

**na-05**, answerable no; first related: 287

- miss    0.514 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    0.503 `journal/reports/morning-2026-09-03.md:7#p1` 2026-09-03 pipeline.log (ostatni przebieg)
- miss    0.502 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- miss    0.501 `journal/reports/morning-2026-08-23.md:7#p2` 2026-08-23 pipeline.log (ostatni przebieg)
- miss    0.501 `journal/reports/morning-2026-09-01.md:7#p1` 2026-09-01 pipeline.log (ostatni przebieg)

**na-06**, answerable no; first related: 498

- miss    0.504 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.502 `journal/CONTEXT.md:7#p1`  1. Stan projektu — skrót
- miss    0.498 `journal/CONTEXT.md:7#p2`  1. Stan projektu — skrót
- miss    0.491 `journal/CONTEXT.md:116#p1` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- miss    0.490 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA

**na-07**, answerable partial; first related: 2

- miss    0.589 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- related 0.535 `docs/DB-SCHEMA.md:1`  DB-SCHEMA.md — HOMOS database design (SQLite)
- miss    0.530 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.510 `journal/TASKS-ROTATION.md:1`  TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierun
- miss    0.490 `journal/CONTEXT.md:4554#p3` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
