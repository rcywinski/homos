# Retrieval evaluation: contextual-haiku-run2-query-pl-hybrid-rerank-golden-v1-3

Date 2026-11-10. Golden set v1.3. Retriever `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku-run2`. 957 chunks, corpus hash `8d7f9a3437b43594`.
26 answerable questions of 34: one question = 3.8 pp.

Reranker: device cuda, max_length 2048, 34 requests, server time median 448.4 ms, p95 541.7 ms.
Truncated pairs 0/1020. Tied scores: 18/1020 candidates, 9 of them in a top 10, 8 queries with a tie.

## Metrics

| metric | full | journal-only |
|---|---|---|
| recall@5 | 62% (16/26) | 62% (16/26) |
| recall@10 | 77% (20/26) | 73% (19/26) |
| recall@30 | 77% (20/26) | 73% (19/26) |
| mrr@10 | 0.468 | 0.346 |

Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.

## By category

| category | recall@5 | recall@10 | recall@30 | mrr@10 | recall@10 journal-only |
|---|---|---|---|---|---|
| why | 56% (5/9) | 67% (6/9) | 67% (6/9) | 0.463 | 56% (5/9) |
| dated-fact | 50% (5/10) | 70% (7/10) | 70% (7/10) | 0.253 | 70% (7/10) |
| identifier | 86% (6/7) | 100% (7/7) | 100% (7/7) | 0.782 | 100% (7/7) |

Partial/no questions, related chunk in top 10 (informational): 38% (3/8).

## Per question: first hit and top 5

For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).

**why-01**, first hit: 6 (journal-only -)

- miss    0.628 `journal/CONTEXT.md:1362#p7` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.525 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.409 `journal/RESEARCH-QUEUE.md:926#p2`  E4. PRZEGLĄDY (kalendarz)
- miss    0.398 `journal/CONTEXT.md:3011` 2026-08-10 2026-08-10 — Sesja 3d: PIERWSZY BACKTEST (dane częściowe!) — Base WETH
- miss    0.397 `journal/CONTEXT.md:1362#p8` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R

**why-02**, first hit: - (journal-only -)

- miss    0.486 `journal/CONTEXT.md:190#p2` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.404 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- miss    0.298 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- miss    0.294 `journal/CONTEXT.md:4240#p1` 2026-08-21 2026-08-21 11:xx — Trzy pytania Rafała o paper trading: odpowiedzi + d
- miss    0.245 `journal/CONTEXT.md:101` 2026-09-21 Decyzja z 2026-09-21

**why-03**, first hit: - (journal-only -)

- miss    0.691 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.547 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.311 `journal/TASKS-RECAL.md:89`  §6 Przebiegi i odbiór
- miss    0.306 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- miss    0.275 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)

**why-04**, first hit: 1 (journal-only 3)

- hit     0.991 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.905 `docs/CASE-STUDY.md:105`  5. Conclusions
- hit     0.870 `journal/HANDOFF.md:3`  MAPA: 4 miejsca (kto jest kim)
- miss    0.752 `docs/PLAN.md:151`  5. Planned vs built
- hit     0.743 `journal/CONTEXT.md:3276` 2026-08-10 2026-08-10 — Sesja Fable: protokół kooperacji agentów (HANDOFF.md)

**why-05**, first hit: 2 (journal-only 2)

- miss    0.807 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- hit     0.569 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.520 `journal/CONTEXT.md:3036` 2026-08-10 2026-08-10 — Sesja 3e: BOT-OBSERWATOR (krok C wizji) — szkielet gotowy
- hit     0.472 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    0.452 `journal/TASKS-INFRA.md:9`  Zadania

**why-06**, first hit: - (journal-only -)

- miss    0.456 `journal/HANDOFF.md:254#p5`  @Sonnet (sesja UI, Cowork)
- miss    0.391 `journal/TASKS-UI.md:522#p2`  PARTIA 9 — [Zatwierdź hedge] na GMX (karta propozycji HEDGE) ✅ wykonan
- miss    0.364 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.331 `docs/UI-DESIGN.md:50`  3. Automation loops (requirement → mechanism)
- miss    0.317 `journal/TASKS-UI.md:69#p2`  PARTIA 3 — Telemetria + akcje na kokpicie ✅ wykonana

**why-07**, answerable partial; first related: 1

- related 0.679 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- related 0.214 `journal/RESEARCH-QUEUE.md:684#p2`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.123 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.072 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
- miss    0.064 `journal/HANDOFF.md:1264#p2`  @CC-Win (Claude Code od botów windowsowych)

**why-08**, first hit: 1 (journal-only 1)

- hit     0.930 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- miss    0.789 `journal/RESEARCH-QUEUE.md:7#p1`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.757 `journal/reports/morning-2026-09-05.md:114` 2026-09-05 RANKING WIDE (pod produkt, top 10)
- hit     0.731 `docs/PAIRS.md:41`  B. Correlated BTC/ETH pairs (lower IL — correlation ~0.7–0.9)
- miss    0.711 `journal/reports/morning-2026-09-16.md:132` 2026-09-16 RANKING WIDE (pod produkt, top 10)

**why-09**, first hit: 1 (journal-only 4)

- hit     0.992 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.969 `journal/CONTEXT.md:4554#p5` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- hit     0.950 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- hit     0.936 `journal/CONTEXT.md:96` 2026-08-26 Decyzja z 2026-08-26
- miss    0.883 `journal/RESEARCH-QUEUE.md:95#p1`  B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)

**why-10**, first hit: 2 (journal-only 2)

- miss    0.324 `journal/DECYZJE-2026-08-26.md:90#p2`  ⚖️ WIECZORNY WERDYKT ~19:xx — PRÓG PORZUCENIA: WARUNKI SPEŁNIONE
- hit     0.303 `journal/CONTEXT.md:1362#p9` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- hit     0.226 `journal/DECYZJE-2026-08-26.md:546`  11f. (Nowe, 25.08 noc) ANALIZA 720d — GŁÓWNY PUNKT PRZEGLĄDU
- miss    0.189 `journal/CONTEXT.md:1362#p7` 2026-08-29 2026-08-29 ~rano — BRIEF DZIEŃ 2 + PACZKA „RAPORT/TELEGRAM" (Fable + R
- miss    0.173 `journal/CONTEXT.md:4472#p1` 2026-08-24 2026-08-24 — Poranny brief po weekendzie (Fable) — ranking ZAMROŻONY p

**dated-01**, first hit: - (journal-only -)

- miss    0.507 `journal/CONTEXT.md:4554#p3` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.400 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.308 `journal/RESEARCH-QUEUE.md:684#p1`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.224 `docs/DB-SCHEMA.md:40#p1`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.178 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)

**dated-02**, first hit: 5 (journal-only 5)

- miss    0.208 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.133 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm
- miss    0.091 `journal/TASKS-UI.md:1042`  PARTIA 13 — PILNA: state control modala „Otwórz pozycję" ✅ wykonana (S
- miss    0.083 `journal/KAPITAL-REKOMENDACJA.md:1`  KAPITAL-REKOMENDACJA.md — pierwsze wejście LP wg ALGORITHM v1.2
- hit     0.060 `journal/CONTEXT.md:1130#p3` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY

**dated-03**, first hit: 3 (journal-only 3)

- miss    0.224 `journal/reports/morning-2026-09-18.md:270` 2026-09-18 POZYCJE REALNE (produkt FlatWide)
- miss    0.198 `journal/reports/morning-2026-09-15.md:228` 2026-09-15 PAPER TRADING (start 2026-08-18, $10000/pula)
- hit     0.148 `journal/reports/morning-2026-09-15.md:217` 2026-09-15 POZYCJE REALNE (produkt FlatWide)
- miss    0.059 `journal/reports/morning-2026-09-05.md:230` 2026-09-05 PAPER TRADING (start 2026-08-18, $10000/pula)
- miss    0.057 `journal/reports/morning-2026-09-20.md:256` 2026-09-20 PAPER TRADING (start 2026-08-18, $10000/pula)

**dated-04**, first hit: - (journal-only -)

- miss    0.686 `journal/reports/morning-2026-09-05.md:7#p2` 2026-09-05 pipeline.log (ostatni przebieg)
- miss    0.646 `journal/reports/morning-2026-08-25.md:7#p2` 2026-08-25 pipeline.log (ostatni przebieg)
- miss    0.522 `journal/reports/morning-2026-08-24.md:7#p1` 2026-08-24 pipeline.log (ostatni przebieg)
- miss    0.515 `journal/reports/morning-2026-09-15.md:7#p2` 2026-09-15 pipeline.log (ostatni przebieg)
- miss    0.455 `journal/reports/morning-2026-08-22.md:7#p2` 2026-08-22 pipeline.log (ostatni przebieg)

**dated-05**, first hit: - (journal-only -)

- miss    0.023 `journal/CONTEXT.md:277#p4` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.011 `journal/TASKS-UI.md:1000`  FIX (25.08 wieczór): UX sekwencji [⏹ Zamknij] + toast na złej karcie
- miss    0.010 `journal/CONTEXT.md:277#p3` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.009 `journal/TASKS-UI.md:592#p2`  PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana 
- miss    0.009 `journal/CONTEXT.md:116#p2` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS

**dated-06**, first hit: 8 (journal-only 8)

- miss    0.779 `journal/reports/morning-2026-08-30.md:51` 2026-08-30 pipeline-task.log (tail)
- miss    0.638 `journal/reports/morning-2026-08-29.md:51` 2026-08-29 pipeline-task.log (tail)
- miss    0.630 `journal/reports/morning-2026-08-21.md:51` 2026-08-21 pipeline-task.log (tail)
- miss    0.567 `journal/reports/morning-2026-08-31.md:51` 2026-08-31 pipeline-task.log (tail)
- miss    0.499 `journal/reports/morning-2026-08-24.md:51` 2026-08-24 pipeline-task.log (tail)

**dated-07**, first hit: 8 (journal-only 8)

- miss    0.017 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.004 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.003 `docs/AI-WORKFLOW.md:93`  If you want to copy the pattern
- miss    0.003 `journal/CONTEXT.md:7#p2`  1. Stan projektu — skrót
- miss    0.003 `journal/CONTEXT.md:2347#p3` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 

**dated-08**, first hit: 2 (journal-only 2)

- miss    0.168 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- hit     0.080 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- hit     0.055 `journal/CONTEXT.md:7#p1`  1. Stan projektu — skrót
- hit     0.024 `journal/CONTEXT.md:190#p2` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.020 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 

**dated-09**, first hit: 1 (journal-only 5)

- hit     0.606 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.369 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.330 `journal/CONTEXT.md:277#p4` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.302 `journal/CONTEXT.md:1130#p3` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY
- hit     0.204 `journal/CONTEXT.md:1130#p1` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY

**dated-10**, first hit: 4 (journal-only 4)

- miss    0.872 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs
- miss    0.806 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.771 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm
- hit     0.722 `journal/CONTEXT.md:4165` 2026-08-21 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE
- miss    0.667 `journal/CONTEXT.md:7#p1`  1. Stan projektu — skrót

**id-01**, first hit: 7 (journal-only 7)

- miss    0.820 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)
- miss    0.795 `journal/reports/morning-2026-09-19.md:101` 2026-09-19 propozycje OPEN (4)
- miss    0.795 `journal/reports/morning-2026-09-22.md:101` 2026-09-22 propozycje OPEN (3)
- miss    0.795 `journal/reports/morning-2026-09-20.md:101` 2026-09-20 propozycje OPEN (3)
- miss    0.777 `journal/CONTEXT.md:1130#p1` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY

**id-02**, first hit: 1 (journal-only 1)

- hit     0.986 `journal/CONTEXT.md:277#p1` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi
- miss    0.986 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)
- miss    0.980 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)
- hit     0.979 `journal/reports/morning-2026-09-16.md:237` 2026-09-16 POZYCJE REALNE (produkt FlatWide)
- hit     0.973 `journal/reports/morning-2026-09-13.md:276` 2026-09-13 POZYCJE REALNE (produkt FlatWide)

**id-03**, first hit: 1 (journal-only 1)

- hit     0.854 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)
- miss    0.789 `journal/reports/morning-2026-08-31.md:219` 2026-08-31 POZYCJE REALNE (produkt FlatWide)
- miss    0.789 `journal/reports/morning-2026-09-06.md:219` 2026-09-06 POZYCJE REALNE (produkt FlatWide)
- miss    0.757 `journal/reports/morning-2026-09-12.md:276` 2026-09-12 POZYCJE REALNE (produkt FlatWide)
- miss    0.757 `journal/reports/morning-2026-08-29.md:181` 2026-08-29 POZYCJE REALNE (produkt FlatWide)

**id-04**, first hit: 1 (journal-only 1)

- hit     0.033 `journal/RESEARCH-QUEUE.md:498`  D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epiz
- miss    0.005 `journal/HANDOFF.md:641#p2`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.004 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.003 `journal/reports/morning-2026-09-03.md:51` 2026-09-03 pipeline-task.log (tail)
- miss    0.003 `journal/CONTEXT.md:4300#p2` 2026-08-21 2026-08-21 ~16:0x — Wdrożenie UI OK, ale cofnęliśmy migrację NSSM→pm2 

**id-05**, first hit: 1 (journal-only 1)

- hit     0.760 `journal/HANDOFF.md:254#p1`  @Sonnet (sesja UI, Cowork)
- miss    0.088 `journal/RESEARCH-QUEUE.md:7#p2`  A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)
- miss    0.080 `journal/CONTEXT.md:4195` 2026-08-21 2026-08-21 10:4x — Odbiór raportów CC-Win: fix swap-cache DZIAŁA na pr
- miss    0.079 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.057 `journal/TASKS-UI.md:317#p1`  PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zleco

**id-06**, first hit: 3 (journal-only 3)

- miss    0.860 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    0.783 `journal/HANDOFF.md:29#p1`  @Fable (sesja analityczna)
- hit     0.761 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- miss    0.755 `journal/CONTEXT.md:721` 2026-09-07 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + R
- hit     0.657 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 

**id-07**, first hit: 1 (journal-only 5)

- hit     0.777 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- related 0.764 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    0.327 `journal/RESEARCH-QUEUE.md:597#p1` 2026-08-10 F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-1
- miss    0.298 `journal/RESEARCH-QUEUE.md:95#p3`  B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)
- hit     0.283 `journal/CONTEXT.md:2989` 2026-08-10 2026-08-10 — Sesja 3: FAZA 1 START — pipeline danych + silnik backtest

**na-01**, answerable partial; first related: 18

- miss    0.131 `journal/TASKS-LEDGER.md:36`  3. API + UI (lane Sonnet, po warstwie danych)
- miss    0.056 `journal/TASKS-LEDGER.md:1`  TASKS-LEDGER.md — księga transakcji + zamknięte pozycje + CSV (spec, 2
- miss    0.029 `journal/HANDOFF.md:641#p3`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.028 `journal/HANDOFF.md:254#p2`  @Sonnet (sesja UI, Cowork)
- miss    0.018 `journal/DECYZJE-2026-08-26.md:226`  6. Pyłki mainnet #953465 (~$95) i #953427 (~$2)

**na-02**, answerable partial; first related: 29

- miss    0.072 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.043 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.015 `journal/reports/morning-2026-08-27.md:51` 2026-08-27 pipeline-task.log (tail)
- miss    0.015 `journal/CONTEXT.md:3054` 2026-08-10 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 R
- miss    0.013 `journal/reports/morning-2026-09-16.md:7#p2` 2026-09-16 pipeline.log (ostatni przebieg)

**na-03**, answerable partial; first related: 5

- miss    0.721 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- miss    0.679 `journal/RESEARCH-QUEUE.md:684#p3`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
- miss    0.612 `journal/TASKS-UI.md:700#p1`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po
- miss    0.591 `journal/reports/morning-2026-09-14.md:101` 2026-09-14 propozycje OPEN (4)
- related 0.581 `journal/CONTEXT.md:3519` 2026-08-18 2026-08-18 ~10:0x — F4-op: TEST GMX DOMKNIĘTY (short zamknięty, pełny 

**na-04**, answerable no; first related: -

- miss    0.027 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.015 `journal/TASKS-WINDOWS.md:16`  Kroki
- miss    0.010 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.006 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    0.005 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup

**na-05**, answerable no; first related: -

- miss    0.128 `journal/reports/morning-2026-09-14.md:287` 2026-09-14 PAPER TRADING (start 2026-08-18, $10000/pula)
- miss    0.072 `journal/CONTEXT.md:3054` 2026-08-10 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 R
- miss    0.047 `journal/reports/morning-2026-08-22.md:7#p2` 2026-08-22 pipeline.log (ostatni przebieg)
- miss    0.029 `journal/CONTEXT.md:2032#p2` 2026-08-27 2026-08-27 ~rano — SESJA DECYZYJNA (Fable + Rafał) — w toku
- miss    0.029 `journal/reports/morning-2026-09-20.md:7#p1` 2026-09-20 pipeline.log (ostatni przebieg)

**na-06**, answerable no; first related: -

- miss    0.015 `journal/TASKS-UI.md:183`  PARTIA 4b — wpięcie buildera pod [Zatwierdź] (PO skończeniu Partii 4)
- miss    0.014 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    0.010 `journal/CONTEXT.md:4554#p2` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.010 `journal/CONTEXT.md:4554#p4` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.009 `journal/CONTEXT.md:2347#p1` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 

**na-07**, answerable partial; first related: 2

- miss    0.300 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- related 0.122 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    0.092 `journal/reports/morning-2026-08-29.md:7#p2` 2026-08-29 pipeline.log (ostatni przebieg)
- related 0.081 `journal/CONTEXT.md:2989` 2026-08-10 2026-08-10 — Sesja 3: FAZA 1 START — pipeline danych + silnik backtest
- miss    0.078 `journal/RESEARCH-QUEUE.md:684#p2`  H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)
