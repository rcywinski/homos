# Retrieval evaluation: query-pl-hybrid-rerank-golden-v1-3

Date 2026-11-10. Golden set v1.3. Retriever `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta`. 957 chunks, corpus hash `8d7f9a3437b43594`.
26 answerable questions of 34: one question = 3.8 pp.

Reranker: device cuda, max_length 2048, 34 requests, server time median 396.9 ms, p95 494.2 ms.
Truncated pairs 0/1020. Tied scores: 8/1020 candidates, 2 of them in a top 10, 4 queries with a tie.

## Metrics

| metric | full | journal-only |
|---|---|---|
| recall@5 | 62% (16/26) | 58% (15/26) |
| recall@10 | 69% (18/26) | 65% (17/26) |
| recall@30 | 77% (20/26) | 73% (19/26) |
| mrr@10 | 0.423 | 0.320 |

Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.

## By category

| category | recall@5 | recall@10 | recall@30 | mrr@10 | recall@10 journal-only |
|---|---|---|---|---|---|
| why | 67% (6/9) | 67% (6/9) | 78% (7/9) | 0.463 | 56% (5/9) |
| dated-fact | 50% (5/10) | 60% (6/10) | 70% (7/10) | 0.336 | 60% (6/10) |
| identifier | 71% (5/7) | 86% (6/7) | 86% (6/7) | 0.497 | 86% (6/7) |

Partial/no questions, related chunk in top 10 (informational): 50% (4/8).

## Per question: first hit and top 5

For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).

**why-01**, first hit: 3 (journal-only -)

- miss    0.498 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.412 `journal/CONTEXT.md:1362#p7` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- hit     0.327 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.266 `journal/RESEARCH-QUEUE.md:926#p2`  E4. PRZEGLĄDY (kalendarz)
- miss    0.257 `journal/CONTEXT.md:1362#p5` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R

**why-02**, first hit: - (journal-only -)

- miss    0.307 `journal/CONTEXT.md:969` 2026-09-01 2026-09-01 ~popołudnie — ANALIZA PRAWDOPODOBIEŃSTW + MONTE CARLO STRAT
- miss    0.197 `journal/CONTEXT.md:116#p1` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- miss    0.189 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.181 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- miss    0.177 `journal/CONTEXT.md:7#p1`  1. Stan projektu — skrót

**why-03**, first hit: - (journal-only -)

- miss    0.401 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.388 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.307 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- miss    0.246 `journal/CONTEXT.md:2178#p1` 2026-08-26 2026-08-26 ~08:1x–09:0x — PRZEGLĄD TYGODNIOWY (Fable + Rafał) — komple
- miss    0.213 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)

**why-04**, first hit: 1 (journal-only 4)

- hit     0.984 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.924 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.732 `docs/PLAN.md:151`  5. Planned vs built
- hit     0.550 `journal/HANDOFF.md:3`  MAPA: 4 miejsca (kto jest kim)
- miss    0.426 `journal/HANDOFF.md:641#p2`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)

**why-05**, first hit: 2 (journal-only 2)

- miss    0.515 `journal/TASKS-INFRA.md:9`  Zadania
- hit     0.491 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.491 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)
- miss    0.458 `journal/CONTEXT.md:2347#p1` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.348 `journal/CONTEXT.md:2514#p3` 2026-08-19 2026-08-19 — Sesja analityczna (Fable) — odbiór nocy: root cause pipel

**why-06**, first hit: 22 (journal-only 22)

- miss    0.386 `docs/EMERGENCY.md:1`  _Historical runbook. The product was wound down in September 2026; kep
- miss    0.299 `docs/UI-DESIGN.md:50`  3. Automation loops (requirement → mechanism)
- miss    0.298 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.243 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.224 `journal/CONTEXT.md:2713` 2026-08-10 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 

**why-07**, answerable partial; first related: 1

- related 0.478 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- related 0.170 `journal/RESEARCH-QUEUE.md:684#p2`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.112 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)
- miss    0.061 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.043 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup

**why-08**, first hit: 1 (journal-only 1)

- hit     0.875 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- miss    0.783 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.620 `journal/reports/morning-2026-09-05.md:114` 2026-09-05 RANKING WIDE (pod produkt, top 10)
- miss    0.585 `journal/reports/morning-2026-09-10.md:146` 2026-09-10 RANKING WIDE (pod produkt, top 10)
- miss    0.580 `journal/reports/morning-2026-09-04.md:134` 2026-09-04 RANKING WIDE (pod produkt, top 10)

**why-09**, first hit: 1 (journal-only 5)

- hit     0.977 `docs/CASE-STUDY.md:44`  3. What the backtests said
- hit     0.905 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.902 `journal/CONTEXT.md:4554#p5` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.863 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- hit     0.834 `journal/DECYZJE-2026-08-26.md:546`  11f. (Nowe, 25.08 noc) ANALIZA 720d — GŁÓWNY PUNKT PRZEGLĄDU

**why-10**, first hit: 3 (journal-only 3)

- miss    0.457 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- miss    0.456 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.285 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.244 `journal/DECYZJE-2026-08-26.md:90#p2`  ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
- miss    0.242 `journal/RESEARCH-QUEUE.md:529#p2`  E. WDROŻENIA KODU (dla Claude Code / terminala)

**dated-01**, first hit: - (journal-only -)

- miss    0.290 `journal/HANDOFF.md:641#p3`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.191 `journal/CONTEXT.md:4554#p3` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.114 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.105 `journal/TASKS-WINDOWS.md:16`  Kroki
- miss    0.092 `journal/CONTEXT.md:4472#p2` 2026-08-24 2026-08-24 — Poranny brief po weekendzie (Fable) — ranking ZAMROŻONY p

**dated-02**, first hit: 17 (journal-only 17)

- miss    0.364 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.104 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.092 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs
- miss    0.070 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm
- miss    0.059 `journal/KAPITAL-REKOMENDACJA.md:1`  KAPITAL-REKOMENDACJA.md — pierwsze wejście LP wg ALGORITHM v1.2

**dated-03**, first hit: 2 (journal-only 2)

- miss    0.305 `journal/reports/morning-2026-09-15.md:228` 2026-09-15 PAPER TRADING (start 2026-08-18, $10000/pula)
- hit     0.103 `journal/reports/morning-2026-09-15.md:217` 2026-09-15 POZYCJE REALNE (produkt FlatWide)
- miss    0.058 `journal/reports/morning-2026-09-15.md:112` 2026-09-15 RANKING WIDE (pod produkt, top 10)
- miss    0.053 `journal/CONTEXT.md:277#p2` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.039 `journal/CONTEXT.md:116#p2` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS

**dated-04**, first hit: - (journal-only -)

- miss    0.443 `journal/reports/morning-2026-08-26.md:7#p2` 2026-08-26 pipeline.log (ostatni przebieg)
- miss    0.430 `journal/reports/morning-2026-08-20.md:7#p2` 2026-08-20 pipeline.log (ostatni przebieg)
- miss    0.388 `journal/reports/morning-2026-08-22.md:7#p2` 2026-08-22 pipeline.log (ostatni przebieg)
- miss    0.384 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.283 `journal/reports/morning-2026-08-23.md:7#p2` 2026-08-23 pipeline.log (ostatni przebieg)

**dated-05**, first hit: - (journal-only -)

- miss    0.011 `journal/TASKS-UI.md:592#p2`  PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana 
- miss    0.007 `journal/CONTEXT.md:116#p2` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- miss    0.007 `journal/HANDOFF.md:254#p3`  @Sonnet (sesja UI, Cowork)
- miss    0.007 `journal/TASKS-UI.md:592#p1`  PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana 
- miss    0.007 `journal/CONTEXT.md:277#p3` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi

**dated-06**, first hit: 1 (journal-only 1)

- hit     0.446 `journal/CONTEXT.md:4411#p1` 2026-08-22 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko ziel
- miss    0.065 `journal/CONTEXT.md:4411#p2` 2026-08-22 2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko ziel
- miss    0.031 `journal/TASKS-UI.md:700#p2`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po
- miss    0.030 `journal/RESEARCH-QUEUE.md:367#p2`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    0.026 `journal/HANDOFF.md:1264#p2`  @CC-Win (Claude Code od botów windowsowych)

**dated-07**, first hit: 9 (journal-only 9)

- miss    0.012 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.004 `docs/AI-WORKFLOW.md:93`  If you want to copy the pattern
- miss    0.004 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.004 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.002 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)

**dated-08**, first hit: 2 (journal-only 2)

- miss    0.073 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- hit     0.048 `journal/CONTEXT.md:190#p2` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.040 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.023 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.017 `docs/DECISION-LOG.md:32` 2026-09-22 Decision of 2026-09-22

**dated-09**, first hit: 1 (journal-only 5)

- hit     0.783 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.313 `docs/CASE-STUDY.md:105`  5. Conclusions
- hit     0.296 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.168 `journal/RESEARCH-QUEUE.md:926#p1`  E4. PRZEGLĄDY (kalendarz)
- hit     0.116 `journal/CONTEXT.md:1130#p1` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY

**dated-10**, first hit: 4 (journal-only 4)

- miss    0.872 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs
- miss    0.845 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.752 `journal/DECYZJE-2026-08-26.md:9#p1`  ✅ WYNIK PRZEGLĄDU — 26.08.2026 ~08:30–09:00 (decyzje Rafała, sesja Fab
- hit     0.741 `journal/CONTEXT.md:4165` 2026-08-21 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE
- miss    0.702 `journal/CONTEXT.md:2623` 2026-08-18 2026-08-18 — Sesja UI (Sonnet) — Partia 5: wizualizacja paper-tradingu

**id-01**, first hit: 1 (journal-only 1)

- hit     0.718 `journal/HANDOFF.md:641#p4`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.695 `journal/CONTEXT.md:1362#p5` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.657 `journal/HANDOFF.md:254#p4`  @Sonnet (sesja UI, Cowork)
- hit     0.654 `journal/TASKS-UI.md:1134`  PARTIA 16 — karty propozycji FLAT_NARROW / FLAT_WIDEN (produkt FlatWid
- miss    0.630 `journal/reports/morning-2026-09-19.md:101` 2026-09-19 propozycje OPEN (4)

**id-02**, first hit: 2 (journal-only 2)

- miss    0.890 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)
- hit     0.880 `journal/reports/morning-2026-09-18.md:270` 2026-09-18 POZYCJE REALNE (produkt FlatWide)
- hit     0.879 `journal/reports/morning-2026-09-17.md:256` 2026-09-17 POZYCJE REALNE (produkt FlatWide)
- miss    0.876 `journal/reports/morning-2026-09-23.md:101` 2026-09-23 propozycje OPEN (1)
- miss    0.873 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)

**id-03**, first hit: - (journal-only -)

- miss    0.748 `journal/CONTEXT.md:116#p2` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- miss    0.704 `journal/reports/morning-2026-08-29.md:181` 2026-08-29 POZYCJE REALNE (produkt FlatWide)
- miss    0.592 `journal/reports/morning-2026-09-12.md:276` 2026-09-12 POZYCJE REALNE (produkt FlatWide)
- miss    0.584 `journal/reports/morning-2026-08-31.md:219` 2026-08-31 POZYCJE REALNE (produkt FlatWide)
- miss    0.569 `journal/reports/morning-2026-09-17.md:256` 2026-09-17 POZYCJE REALNE (produkt FlatWide)

**id-04**, first hit: 3 (journal-only 3)

- miss    0.007 `journal/HANDOFF.md:641#p2`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.006 `journal/CONTEXT.md:3943` 2026-08-11 2026-08-11 ~13:30 — Sesja Fable-desktop (pobudka popołudniowa): checkl
- hit     0.006 `journal/RESEARCH-QUEUE.md:498`  D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epiz
- miss    0.004 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- miss    0.003 `journal/TASKS-INFRA.md:9`  Zadania

**id-05**, first hit: 1 (journal-only 1)

- hit     0.530 `journal/HANDOFF.md:254#p1`  @Sonnet (sesja UI, Cowork)
- miss    0.070 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.064 `journal/TASKS-UI.md:317#p1`  PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zleco
- miss    0.052 `journal/CONTEXT.md:4195` 2026-08-21 2026-08-21 10:4x — Odbiór raportów CC-Win: fix swap-cache DZIAŁA na pr
- miss    0.052 `journal/TASKS-FUNNEL.md:10`  1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30)

**id-06**, first hit: 2 (journal-only 2)

- miss    0.756 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- hit     0.739 `journal/RESEARCH-QUEUE.md:294#p1`  E8. KLASY BEZ LVR + TIMING — kolejka po 24.09 (decyzja Rafała 07.09: „
- hit     0.695 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- miss    0.678 `journal/CONTEXT.md:721` 2026-09-07 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + R
- hit     0.561 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 

**id-07**, first hit: 7 (journal-only 7)

- related 0.536 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    0.281 `journal/RESEARCH-QUEUE.md:597#p1` 2026-08-10 F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-1
- miss    0.263 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.261 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.226 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 

**na-01**, answerable partial; first related: -

- miss    0.137 `journal/TASKS-LEDGER.md:36`  3. API + UI (lane Sonnet, po warstwie danych)
- miss    0.054 `journal/CONTEXT.md:4554#p3` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.032 `docs/UI-DESIGN.md:13`  1. As built vs planned
- miss    0.016 `journal/TASKS-UI.md:592#p2`  PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana 
- miss    0.011 `journal/TASKS-UI.md:700#p2`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po

**na-02**, answerable partial; first related: 3

- miss    0.078 `journal/RESEARCH-QUEUE.md:597#p1` 2026-08-10 F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-1
- miss    0.035 `journal/CONTEXT.md:500` 2026-09-09 2026-09-09 ~popołudnie — ODBIÓR E8.2e (CC-Win): fix dryfu DZIAŁA, ale 
- related 0.026 `journal/CONTEXT.md:548` 2026-09-09 2026-09-09 ~rano — BRIEF (Fable + Rafał): odbiór E8.2d (CC-Mac) — DRYF
- miss    0.022 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.019 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 

**na-03**, answerable partial; first related: 5

- miss    0.697 `journal/TASKS-UI.md:700#p1`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po
- miss    0.683 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.652 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.583 `docs/ALGORITHM.md:43` 2026-08-11 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug
- related 0.574 `journal/CONTEXT.md:277#p1` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi

**na-04**, answerable no; first related: -

- miss    0.029 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.015 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    0.014 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.006 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- miss    0.004 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)

**na-05**, answerable no; first related: -

- miss    0.176 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    0.052 `journal/reports/morning-2026-09-10.md:51` 2026-09-10 pipeline-task.log (tail)
- miss    0.039 `journal/reports/morning-2026-08-24.md:7#p2` 2026-08-24 pipeline.log (ostatni przebieg)
- miss    0.030 `journal/reports/morning-2026-09-10.md:7#p2` 2026-09-10 pipeline.log (ostatni przebieg)
- miss    0.027 `journal/reports/morning-2026-09-04.md:7#p2` 2026-09-04 pipeline.log (ostatni przebieg)

**na-06**, answerable no; first related: -

- miss    0.012 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    0.007 `journal/CONTEXT.md:2347#p1` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.007 `journal/CONTEXT.md:4554#p4` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.007 `journal/TASKS-UI.md:804#p2`  Partia 12 (21.08): usunięcie sekcji „Zarządzaj (zaawansowane)" + fix c
- miss    0.006 `journal/CONTEXT.md:4554#p2` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2

**na-07**, answerable partial; first related: 2

- miss    0.357 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- related 0.281 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.105 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.088 `journal/RESEARCH-QUEUE.md:684#p2`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- related 0.064 `journal/CONTEXT.md:2989` 2026-08-10 2026-08-10 — Sesja 3: FAZA 1 START — pipeline danych + silnik backtest
