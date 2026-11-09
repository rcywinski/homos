# Retrieval evaluation: hybrid-stem-none

Date 2026-11-09. Golden set v1.2. Retriever `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=none),depth=100,c=60)`. 957 chunks, corpus hash `1e2a7136ccdb27e5`.
26 answerable questions of 34: one question = 3.8 pp.

## Metrics

| metric | full | journal-only |
|---|---|---|
| recall@5 | 38% (10/26) | 19% (5/26) |
| recall@10 | 46% (12/26) | 31% (8/26) |
| recall@30 | 65% (17/26) | 54% (14/26) |
| mrr@10 | 0.322 | 0.130 |

Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.

## By category

| category | recall@5 | recall@10 | recall@30 | mrr@10 | recall@10 journal-only |
|---|---|---|---|---|---|
| why | 56% (5/9) | 56% (5/9) | 78% (7/9) | 0.467 | 11% (1/9) |
| dated-fact | 10% (1/10) | 20% (2/10) | 50% (5/10) | 0.117 | 20% (2/10) |
| identifier | 57% (4/7) | 71% (5/7) | 71% (5/7) | 0.429 | 71% (5/7) |

Partial/no questions, related chunk in top 10 (informational): 63% (5/8).

## Per question: first hit and top 5

For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).

**why-01**, first hit: 1 (journal-only -)

- hit     0.032 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.031 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.029 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.029 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31
- miss    0.027 `docs/DECISION-LOG.md:9` 2026-08-10 Decision of 2026-08-10

**why-02**, first hit: 73 (journal-only 73)

- miss    0.032 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.030 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.028 `docs/DECISION-LOG.md:30` 2026-09-18 Decision of 2026-09-18
- miss    0.027 `docs/PAIRS.md:64`  D. Alt/ETH — high APR, high risk (not for now)
- miss    0.027 `journal/CONTEXT.md:116#p1` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS

**why-03**, first hit: 23 (journal-only 23)

- miss    0.032 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.031 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.031 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- miss    0.030 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.029 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31

**why-04**, first hit: 1 (journal-only 8)

- hit     0.033 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.032 `docs/AI-WORKFLOW.md:8`  The four roles
- miss    0.031 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.030 `docs/AI-WORKFLOW.md:1`  How the project was run with AI sessions
- miss    0.030 `docs/AI-WORKFLOW.md:93`  If you want to copy the pattern

**why-05**, first hit: 5 (journal-only 12)

- miss    0.032 `docs/INFRA.md:80`  6. Inference box (since Nov 2026)
- miss    0.031 `docs/INFRA.md:52`  3. Code flow: Mac (development) → Windows (server)
- miss    0.030 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.030 `docs/INFRA.md:38`  2. Network and security
- hit     0.030 `docs/INFRA.md:1`  INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN

**why-06**, first hit: 120 (journal-only 120)

- miss    0.031 `docs/UI-DESIGN.md:92`  4.3 Autopilot *(not implemented)*
- miss    0.028 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)
- miss    0.027 `docs/EMERGENCY.md:1`  _Historical runbook. The product was wound down in September 2026; kep
- miss    0.027 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.026 `docs/PLAN.md:95`  3.5. MEV and execution

**why-07**, answerable partial; first related: 1

- related 0.032 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    0.032 `docs/INFRA.md:1`  INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN
- miss    0.030 `docs/INFRA.md:38`  2. Network and security
- miss    0.030 `docs/INFRA.md:80`  6. Inference box (since Nov 2026)
- miss    0.030 `journal/CONTEXT.md:3140` 2026-08-10 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup

**why-08**, first hit: 22 (journal-only 22)

- miss    0.033 `docs/ALGORITHM.md:84` 2026-08-11 6. Portfolio (revision of 11 Aug; the original candidate list is in [`
- miss    0.029 `journal/reports/morning-2026-09-12.md:171` 2026-09-12 RANKING WIDE (pod produkt, top 10)
- miss    0.029 `journal/reports/morning-2026-09-15.md:112` 2026-09-15 RANKING WIDE (pod produkt, top 10)
- miss    0.029 `journal/reports/morning-2026-09-17.md:151` 2026-09-17 RANKING WIDE (pod produkt, top 10)
- miss    0.028 `journal/reports/morning-2026-09-21.md:170` 2026-09-21 RANKING WIDE (pod produkt, top 10)

**why-09**, first hit: 1 (journal-only 43)

- hit     0.033 `docs/CASE-STUDY.md:44`  3. What the backtests said
- hit     0.032 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- miss    0.031 `docs/DECISION-LOG.md:15` 2026-08-11 Decision of 2026-08-11
- miss    0.031 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31
- miss    0.031 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)

**why-10**, first hit: 1 (journal-only 73)

- hit     0.033 `docs/CASE-STUDY.md:5`  1. The question
- miss    0.031 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    0.030 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.030 `docs/PLAN.md:99`  3.6. The rebalance policy is richer than "went out of range → move it"
- miss    0.030 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11

**dated-01**, first hit: - (journal-only -)

- miss    0.032 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.029 `docs/CASE-STUDY.md:1`  HOMOS — case study
- miss    0.029 `docs/DB-SCHEMA.md:1`  DB-SCHEMA.md — HOMOS database design (SQLite)
- miss    0.025 `docs/DECISION-LOG.md:23` 2026-08-26 Decision of 2026-08-26
- miss    0.025 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)

**dated-02**, first hit: 126 (journal-only 126)

- miss    0.030 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.030 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)
- miss    0.029 `docs/PAIRS.md:69`  3. Portfolio sketch to be validated in the backtest (capital $5–25k)
- miss    0.027 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31
- miss    0.026 `docs/CASE-STUDY.md:44`  3. What the backtests said

**dated-03**, first hit: 95 (journal-only 95)

- miss    0.029 `journal/CONTEXT.md:246` 2026-09-16 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.2
- miss    0.029 `docs/UI-DESIGN.md:135`  7. Rotation policy: weakest position → better opportunity
- miss    0.026 `journal/CONTEXT.md:116#p2` 2026-09-21 2026-09-21 (pon.) 09:xx–19:30 PL — BRIEF + NEWSY + PEŁNE WYJŚCIE TRANS
- miss    0.026 `journal/CONTEXT.md:190#p1` 2026-09-18 2026-09-18 ~09:xx–16:30 PL — BRIEF + WYJŚCIE Z LP TRANSZY 1 (+$38) + d
- miss    0.025 `journal/reports/morning-2026-09-15.md:228` 2026-09-15 PAPER TRADING (start 2026-08-18, $10000/pula)

**dated-04**, first hit: 66 (journal-only 66)

- miss    0.031 `journal/HANDOFF.md:641#p12`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.030 `journal/reports/morning-2026-08-26.md:51` 2026-08-26 pipeline-task.log (tail)
- miss    0.030 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
- miss    0.029 `journal/reports/morning-2026-08-26.md:7#p2` 2026-08-26 pipeline.log (ostatni przebieg)
- miss    0.029 `journal/reports/morning-2026-09-16.md:51` 2026-09-16 pipeline-task.log (tail)

**dated-05**, first hit: 134 (journal-only 134)

- miss    0.028 `docs/PLAN.md:37`  2.2. A hand-written "PositionLike" instead of the SDK (`liquidityManag
- miss    0.027 `journal/CONTEXT.md:2713` 2026-08-10 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 
- miss    0.026 `docs/UI-DESIGN.md:135`  7. Rotation policy: weakest position → better opportunity
- miss    0.026 `journal/TASKS-UI.md:126#p2`  PARTIA 4 — Karty propozycji: Zatwierdź / Modyfikuj / Odrzuć (+2 fixy z
- miss    0.026 `docs/PLAN.md:99`  3.6. The rebalance policy is richer than "went out of range → move it"

**dated-06**, first hit: 13 (journal-only 13)

- miss    0.030 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.028 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.025 `journal/CONTEXT.md:4554#p4` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.022 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31
- miss    0.022 `journal/HANDOFF.md:641#p5`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)

**dated-07**, first hit: 24 (journal-only 24)

- miss    0.030 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    0.029 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.028 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.028 `docs/PLAN.md:177`  6. Main risks (summary)
- miss    0.028 `docs/CASE-STUDY.md:1`  HOMOS — case study

**dated-08**, first hit: 21 (journal-only 21)

- miss    0.031 `docs/DECISION-LOG.md:32` 2026-09-22 Decision of 2026-09-22
- miss    0.029 `docs/DECISION-LOG.md:17` 2026-08-18 Decision of 2026-08-18
- miss    0.028 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- miss    0.027 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)
- miss    0.027 `docs/PLAN.md:117`  3.8. Operational risks omitted entirely

**dated-09**, first hit: 1 (journal-only 4)

- hit     0.033 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- hit     0.032 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.031 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31
- hit     0.026 `journal/CONTEXT.md:1130#p1` 2026-08-31 2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECY
- miss    0.025 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1

**dated-10**, first hit: 6 (journal-only 6)

- miss    0.032 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.030 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    0.030 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm
- miss    0.028 `docs/UI-DESIGN.md:149`  8. Requirements added to the original brief
- miss    0.027 `journal/DECYZJE-2026-08-26.md:378`  10. Histereza: bot i backtest MIERZĄ JĄ INACZEJ (nowe, 21.08 — do rozs

**id-01**, first hit: 1 (journal-only 1)

- hit     0.033 `journal/TASKS-UI.md:1134`  PARTIA 16 — karty propozycji FLAT_NARROW / FLAT_WIDEN (produkt FlatWid
- miss    0.031 `journal/reports/morning-2026-09-23.md:101` 2026-09-23 propozycje OPEN (1)
- miss    0.031 `journal/reports/morning-2026-09-18.md:101` 2026-09-18 propozycje OPEN (3)
- hit     0.031 `docs/EMERGENCY.md:81`  5. What this document does not cover
- hit     0.030 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)

**id-02**, first hit: 6 (journal-only 6)

- miss    0.029 `docs/ALGORITHM.md:27`  2. Position range (advisor — src/utils/advisor.ts)
- miss    0.029 `docs/EMERGENCY.md:81`  5. What this document does not cover
- miss    0.026 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)
- miss    0.026 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)
- miss    0.026 `journal/reports/morning-2026-09-20.md:101` 2026-09-20 propozycje OPEN (3)

**id-03**, first hit: 70 (journal-only 70)

- miss    0.030 `journal/TASKS-UI.md:773`  Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): iko
- miss    0.028 `journal/reports/morning-2026-08-29.md:181` 2026-08-29 POZYCJE REALNE (produkt FlatWide)
- miss    0.023 `journal/HANDOFF.md:641#p4`  @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- miss    0.022 `docs/UI-DESIGN.md:135`  7. Rotation policy: weakest position → better opportunity
- miss    0.021 `journal/reports/morning-2026-09-18.md:270` 2026-09-18 POZYCJE REALNE (produkt FlatWide)

**id-04**, first hit: 36 (journal-only 36)

- miss    0.032 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    0.032 `docs/AI-WORKFLOW.md:1`  How the project was run with AI sessions
- miss    0.031 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.025 `journal/TASKS-LIFECYCLE.md:1`  TASKS-LIFECYCLE.md — pełny lifecycle puli (pomysł Rafała 25.08, spec 2
- miss    0.025 `docs/CASE-STUDY.md:44`  3. What the backtests said

**id-05**, first hit: 1 (journal-only 1)

- hit     0.032 `journal/HANDOFF.md:254#p1`  @Sonnet (sesja UI, Cowork)
- miss    0.016 `docs/PLAN.md:131`  4. Where the profit comes from — the objective function
- miss    0.016 `journal/TASKS-UI.md:317#p2`  PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zleco
- hit     0.016 `journal/CONTEXT.md:246` 2026-09-16 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.2
- miss    0.016 `journal/CONTEXT.md:4085#p1` 2026-08-21 2026-08-21 (Fable, po briefie) — FIX: zamrożony `latest` w fetch-swaps

**id-06**, first hit: 3 (journal-only 3)

- miss    0.033 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    0.032 `journal/CONTEXT.md:721` 2026-09-07 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + R
- hit     0.032 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- hit     0.031 `journal/CONTEXT.md:684` 2026-09-07 2026-09-07 ~późny wieczór — ODBIÓR E8.0–E8.2 (CC-Mac, ~1h od zlecenia)
- miss    0.030 `journal/CONTEXT.md:593` 2026-09-08 2026-09-08 ~rano — BRIEF (Fable + Rafał): odbiór E8.2c (CC-Mac) + E8.3

**id-07**, first hit: 2 (journal-only 3)

- related 0.033 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- hit     0.030 `docs/DB-SCHEMA.md:1`  DB-SCHEMA.md — HOMOS database design (SQLite)
- hit     0.029 `journal/CONTEXT.md:2989` 2026-08-10 2026-08-10 — Sesja 3: FAZA 1 START — pipeline danych + silnik backtest
- miss    0.028 `journal/RESEARCH-QUEUE.md:812`  G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne)
- miss    0.027 `docs/PLAN.md:108`  3.7. Backtest quality decides everything

**na-01**, answerable partial; first related: 25

- miss    0.030 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- miss    0.029 `docs/UI-DESIGN.md:78`  4.2 Positions
- miss    0.029 `docs/DECISION-LOG.md:13` 2026-08-10 Decision of 2026-08-10
- miss    0.028 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    0.027 `docs/UI-DESIGN.md:135`  7. Rotation policy: weakest position → better opportunity

**na-02**, answerable partial; first related: 5

- miss    0.030 `docs/PLAN.md:108`  3.7. Backtest quality decides everything
- miss    0.028 `docs/PAIRS.md:69`  3. Portfolio sketch to be validated in the backtest (capital $5–25k)
- miss    0.026 `journal/RESEARCH-QUEUE.md:812`  G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne)
- miss    0.026 `docs/INFRA.md:80`  6. Inference box (since Nov 2026)
- related 0.025 `journal/CONTEXT.md:548` 2026-09-09 2026-09-09 ~rano — BRIEF (Fable + Rafał): odbiór E8.2d (CC-Mac) — DRYF

**na-03**, answerable partial; first related: 5

- miss    0.032 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    0.030 `journal/TASKS-UI.md:700#p1`  PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po
- miss    0.028 `journal/CONTEXT.md:3503` 2026-08-18 2026-08-18 ~09:3x — F4-op: ODCZYT KOSZTÓW TESTOWEGO SHORTA GMX (po ~17
- miss    0.027 `journal/CONTEXT.md:2347#p2` 2026-08-20 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY 
- related 0.026 `journal/CONTEXT.md:3519` 2026-08-18 2026-08-18 ~10:0x — F4-op: TEST GMX DOMKNIĘTY (short zamknięty, pełny 

**na-04**, answerable no; first related: 33

- miss    0.029 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    0.029 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    0.027 `docs/AI-WORKFLOW.md:81`  What did not
- miss    0.025 `journal/CONTEXT.md:3081` 2026-08-10 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
- miss    0.024 `journal/CONTEXT.md:3427` 2026-08-18 2026-08-18 ~09:00 — Fable: PORANNA ANALIZA — diagnoza CC-Win + 2 bugi 

**na-05**, answerable no; first related: -

- miss    0.026 `journal/reports/morning-2026-09-03.md:7#p1` 2026-09-03 pipeline.log (ostatni przebieg)
- miss    0.025 `journal/reports/morning-2026-09-01.md:7#p1` 2026-09-01 pipeline.log (ostatni przebieg)
- miss    0.024 `journal/reports/morning-2026-09-02.md:7#p1` 2026-09-02 pipeline.log (ostatni przebieg)
- miss    0.024 `journal/reports/morning-2026-09-11.md:51` 2026-09-11 pipeline-task.log (tail)
- miss    0.023 `journal/reports/morning-2026-09-22.md:7#p1` 2026-09-22 pipeline.log (ostatni przebieg)

**na-06**, answerable no; first related: 10

- miss    0.028 `docs/AI-WORKFLOW.md:1`  How the project was run with AI sessions
- miss    0.027 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    0.027 `docs/PLAN.md:151`  5. Planned vs built
- miss    0.024 `journal/CONTEXT.md:4554#p4` 2026-08-25 2026-08-25 08:1x — Brief poranny (Fable) — on-ramp Kraken ZALICZONY E2
- miss    0.022 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)

**na-07**, answerable partial; first related: 2

- miss    0.033 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- related 0.033 `docs/DB-SCHEMA.md:1`  DB-SCHEMA.md — HOMOS database design (SQLite)
- miss    0.029 `docs/DB-SCHEMA.md:13`  1. Design principles (more important than the specific tables)
- miss    0.029 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)
- miss    0.026 `journal/reports/morning-2026-08-20.md:51` 2026-08-20 pipeline-task.log (tail)
