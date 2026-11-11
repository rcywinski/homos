# Retrieval evaluation: bm25-stem-prefix6

Date 2026-11-09. Golden set v1.2. Retriever `bm25(stem=prefix6)`. 957 chunks, corpus hash `1e2a7136ccdb27e5`.
26 answerable questions of 34: one question = 3.8 pp.

## Metrics

| metric | full | journal-only |
|---|---|---|
| recall@5 | 31% (8/26) | 12% (3/26) |
| recall@10 | 35% (9/26) | 12% (3/26) |
| recall@30 | 62% (16/26) | 54% (14/26) |
| mrr@10 | 0.220 | 0.048 |

Journal-only counts a hit only for evidence ranges in `journal/`; the gap to "full" is the share found only through the English `docs/`.

## By category

| category | recall@5 | recall@10 | recall@30 | mrr@10 | recall@10 journal-only |
|---|---|---|---|---|---|
| why | 33% (3/9) | 44% (4/9) | 56% (5/9) | 0.347 | 0% (0/9) |
| dated-fact | 10% (1/10) | 10% (1/10) | 40% (4/10) | 0.100 | 0% (0/10) |
| identifier | 57% (4/7) | 57% (4/7) | 100% (7/7) | 0.226 | 43% (3/7) |

Partial/no questions, related chunk in top 10 (informational): 38% (3/8).

## Per question: first hit and top 5

For human review. `miss` = not an evidence hit; a reviewer may decide it does answer the question (then: golden v1.x, never automatically).

**why-01**, first hit: 12 (journal-only 67)

- miss    16.333 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- miss    14.747 `docs/UI-DESIGN.md:50`  3. Automation loops (requirement → mechanism)
- miss    13.886 `docs/ALGORITHM.md:27`  2. Position range (advisor — src/utils/advisor.ts)
- miss    13.303 `docs/DECISION-LOG.md:25` 2026-08-27 Decision of 2026-08-27
- miss    12.204 `docs/PLAN.md:99`  3.6. The rebalance policy is richer than "went out of range → move it"

**why-02**, first hit: 265 (journal-only 265)

- miss    21.910 `docs/EMERGENCY.md:11`  0. First: which signal is firing?
- miss    15.734 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    15.606 `docs/DB-SCHEMA.md:13`  1. Design principles (more important than the specific tables)
- miss    15.411 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- miss    13.446 `docs/AI-WORKFLOW.md:71`  What worked

**why-03**, first hit: 52 (journal-only 52)

- miss    17.838 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- miss    14.918 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    13.316 `docs/UI-DESIGN.md:149`  8. Requirements added to the original brief
- miss    13.141 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    13.061 `docs/DB-SCHEMA.md:13`  1. Design principles (more important than the specific tables)

**why-04**, first hit: 1 (journal-only 18)

- hit     61.711 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    48.282 `docs/AI-WORKFLOW.md:8`  The four roles
- miss    43.748 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    34.028 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    33.319 `docs/PLAN.md:151`  5. Planned vs built

**why-05**, first hit: 8 (journal-only 23)

- miss    24.832 `docs/CASE-STUDY.md:16`  2. What I built (August 2026)
- miss    22.472 `docs/INFRA.md:80`  6. Inference box (since Nov 2026)
- miss    20.939 `docs/PLAN.md:151`  5. Planned vs built
- miss    20.053 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    18.923 `docs/INFRA.md:8`  1. Architecture (as built)

**why-06**, first hit: 78 (journal-only 78)

- miss    22.282 `docs/PLAN.md:151`  5. Planned vs built
- miss    19.402 `docs/UI-DESIGN.md:50`  3. Automation loops (requirement → mechanism)
- miss    17.958 `docs/EMERGENCY.md:33`  2. Option A — delta-neutral hedge (preferred: reversible, the LP stays
- miss    17.451 `docs/ALGORITHM.md:43` 2026-08-11 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug
- miss    17.182 `journal/TASKS-UI.md:522#p2`  PARTIA 9 — [Zatwierdź hedge] na GMX (karta propozycji HEDGE) ✅ wykonan

**why-07**, answerable partial; first related: 1

- related 32.504 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    19.424 `docs/INFRA.md:1`  INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN
- miss    17.523 `docs/AI-WORKFLOW.md:8`  The four roles
- miss    17.378 `docs/INFRA.md:38`  2. Network and security
- miss    14.993 `docs/INFRA.md:80`  6. Inference box (since Nov 2026)

**why-08**, first hit: 33 (journal-only 33)

- miss    16.247 `docs/ALGORITHM.md:84` 2026-08-11 6. Portfolio (revision of 11 Aug; the original candidate list is in [`
- miss    16.054 `docs/UI-DESIGN.md:64`  4.1 Cockpit (start screen — 30 seconds of reading)
- miss    13.903 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    11.778 `journal/TASKS-FUNNEL.md:144`  Piętro 1 — SCORING CAŁEGO UNIWERSUM (tani, bez swap-cache, codziennie)
- miss    11.079 `docs/ALGORITHM.md:27`  2. Position range (advisor — src/utils/advisor.ts)

**why-09**, first hit: 1 (journal-only 140)

- hit     37.241 `docs/DECISION-LOG.md:22` 2026-08-26 Decision of 2026-08-26
- hit     36.982 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    23.816 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    23.552 `docs/ALGORITHM.md:1`  ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1
- miss    22.701 `docs/DECISION-LOG.md:15` 2026-08-11 Decision of 2026-08-11

**why-10**, first hit: 1 (journal-only 25)

- hit     24.649 `docs/CASE-STUDY.md:5`  1. The question
- miss    17.037 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    13.168 `docs/PLAN.md:99`  3.6. The rebalance policy is richer than "went out of range → move it"
- miss    13.130 `journal/TASKS-UI.md:804#p1`  Partia 12 (21.08): usunięcie sekcji „Zarządzaj (zaawansowane)" + fix c
- miss    12.170 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)

**dated-01**, first hit: 114 (journal-only 114)

- miss    26.365 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    22.513 `docs/UI-DESIGN.md:13`  1. As built vs planned
- miss    20.841 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    20.227 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)
- miss    19.808 `docs/CASE-STUDY.md:105`  5. Conclusions

**dated-02**, first hit: 47 (journal-only 47)

- miss    15.882 `docs/DB-SCHEMA.md:1`  DB-SCHEMA.md — HOMOS database design (SQLite)
- miss    15.799 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    13.489 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)
- miss    13.307 `docs/PAIRS.md:69`  3. Portfolio sketch to be validated in the backtest (capital $5–25k)
- miss    11.911 `docs/DECISION-LOG.md:26` 2026-08-31 Decision of 2026-08-31

**dated-03**, first hit: 40 (journal-only 40)

- miss    17.461 `docs/PLAN.md:79`  3.1. LVR — naming the enemy properly
- miss    16.425 `docs/UI-DESIGN.md:50`  3. Automation loops (requirement → mechanism)
- miss    12.730 `docs/UI-DESIGN.md:108`  5. Inventory of user actions
- miss    12.612 `docs/EMERGENCY.md:51`  3. Option B — exit to cash 50/50 (last resort)
- miss    12.112 `docs/UI-DESIGN.md:78`  4.2 Positions

**dated-04**, first hit: 90 (journal-only 90)

- miss    8.863 `docs/UI-DESIGN.md:123`  6. Rebalance sequence
- miss    8.218 `docs/AI-WORKFLOW.md:93`  If you want to copy the pattern
- miss    6.572 `docs/AI-WORKFLOW.md:81`  What did not
- miss    6.188 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    6.076 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)

**dated-05**, first hit: 137 (journal-only 137)

- miss    18.611 `docs/PLAN.md:29`  2.1. Overflow when converting sqrtPriceX96 (README, UniswapPool)
- miss    13.758 `docs/PLAN.md:131`  4. Where the profit comes from — the objective function
- miss    11.603 `docs/DB-SCHEMA.md:40#p2`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    10.845 `docs/EMERGENCY.md:81`  5. What this document does not cover
- miss    10.446 `docs/PLAN.md:79`  3.1. LVR — naming the enemy properly

**dated-06**, first hit: 55 (journal-only 55)

- miss    18.073 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    16.807 `docs/INFRA.md:8`  1. Architecture (as built)
- miss    15.095 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    14.257 `docs/CASE-STUDY.md:44`  3. What the backtests said
- miss    11.255 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)

**dated-07**, first hit: 13 (journal-only 13)

- miss    21.370 `docs/AI-WORKFLOW.md:93`  If you want to copy the pattern
- miss    18.099 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    15.976 `docs/CASE-STUDY.md:5`  1. The question
- miss    15.240 `docs/CASE-STUDY.md:132`  6. What I would do differently
- miss    14.817 `docs/CASE-STUDY.md:44`  3. What the backtests said

**dated-08**, first hit: 26 (journal-only 26)

- miss    10.954 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- miss    7.055 `docs/DECISION-LOG.md:17` 2026-08-18 Decision of 2026-08-18
- miss    6.232 `docs/PLAN.md:177`  6. Main risks (summary)
- miss    5.902 `docs/PLAN.md:117`  3.8. Operational risks omitted entirely
- miss    5.836 `docs/EMERGENCY.md:51`  3. Option B — exit to cash 50/50 (last resort)

**dated-09**, first hit: 1 (journal-only 18)

- hit     22.837 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    22.247 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    21.785 `docs/AI-WORKFLOW.md:81`  What did not
- hit     19.784 `docs/DECISION-LOG.md:28` 2026-09-11 Decision of 2026-09-11
- miss    17.331 `docs/ALGORITHM.md:104`  8. Known limitations of v1

**dated-10**, first hit: 17 (journal-only 17)

- miss    16.183 `journal/TASKS-UI.md:225#p1`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana
- miss    15.216 `docs/DB-SCHEMA.md:40#p1`  2. Schema — DDL v1 (draft to be frozen at implementation)
- miss    15.199 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    14.876 `docs/UI-DESIGN.md:13`  1. As built vs planned
- miss    14.243 `journal/TASKS-UI.md:225#p2`  PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana

**id-01**, first hit: 2 (journal-only 2)

- miss    19.895 `journal/HANDOFF.md:254#p4`  @Sonnet (sesja UI, Cowork)
- hit     19.848 `journal/TASKS-UI.md:1134`  PARTIA 16 — karty propozycji FLAT_NARROW / FLAT_WIDEN (produkt FlatWid
- hit     18.577 `journal/reports/morning-2026-09-17.md:101` 2026-09-17 propozycje OPEN (2)
- miss    18.412 `docs/PLAN.md:79`  3.1. LVR — naming the enemy properly
- miss    18.236 `journal/reports/morning-2026-09-18.md:101` 2026-09-18 propozycje OPEN (3)

**id-02**, first hit: 12 (journal-only 12)

- miss    11.316 `docs/ALGORITHM.md:27`  2. Position range (advisor — src/utils/advisor.ts)
- miss    10.673 `journal/reports/morning-2026-09-16.md:101` 2026-09-16 propozycje OPEN (1)
- miss    10.673 `journal/reports/morning-2026-09-23.md:101` 2026-09-23 propozycje OPEN (1)
- miss    10.326 `docs/CASE-STUDY.md:132`  6. What I would do differently
- miss    10.233 `journal/TASKS-UI.md:1190`  PARTIA 17 — panel zbiorczy REALNYCH pozycji + linia CYKLU FlatWide ✅ w

**id-03**, first hit: 15 (journal-only 15)

- miss    13.223 `docs/CASE-STUDY.md:132`  6. What I would do differently
- miss    8.775 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    8.595 `docs/UI-DESIGN.md:78`  4.2 Positions
- miss    8.478 `docs/PLAN.md:99`  3.6. The rebalance policy is richer than "went out of range → move it"
- miss    7.994 `docs/UI-DESIGN.md:123`  6. Rebalance sequence

**id-04**, first hit: 14 (journal-only 14)

- miss    16.844 `docs/PLAN.md:61`  2.5. Hard-coded price and no tests
- miss    14.603 `docs/AI-WORKFLOW.md:1`  How the project was run with AI sessions
- miss    14.245 `journal/TASKS-WINDOWS-ADDENDUM.md:1`  TASKS-WINDOWS — ADDENDUM: boty mają być NIEWIDOCZNE
- miss    12.239 `docs/AI-WORKFLOW.md:25`  The two coordination files
- miss    11.096 `docs/CASE-STUDY.md:44`  3. What the backtests said

**id-05**, first hit: 2 (journal-only 2)

- miss    7.803 `docs/PLAN.md:131`  4. Where the profit comes from — the objective function
- hit     4.772 `journal/CONTEXT.md:246` 2026-09-16 2026-09-16 ~09:xx — BRIEF (Fable + Rafał): automat czysty, bilans −4.2
- hit     4.246 `journal/HANDOFF.md:254#p1`  @Sonnet (sesja UI, Cowork)
- miss    4.217 `journal/CONTEXT.md:3806` 2026-08-11 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU 
- hit     4.117 `journal/CONTEXT.md:277#p2` 2026-09-11 2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpi

**id-06**, first hit: 4 (journal-only 4)

- miss    8.570 `journal/RESEARCH-QUEUE.md:367#p1`  E8 — MECHANIKA TESTÓW + PODZIAŁ PRACY (Fable 07.09 wieczór; kod NAPISA
- miss    8.500 `journal/CONTEXT.md:721` 2026-09-07 2026-09-07 ~wieczór — PRZEGLĄD DZIENNIKA + KOLEJKA PO 24.09 (Fable + R
- miss    8.046 `journal/CONTEXT.md:593` 2026-09-08 2026-09-08 ~rano — BRIEF (Fable + Rafał): odbiór E8.2c (CC-Mac) + E8.3
- hit     7.949 `journal/CONTEXT.md:454` 2026-09-09 2026-09-09 ~wieczór — ODBIÓR E8.2f (CC-Win): kotwica 12:00 UTC DZIAŁA 
- miss    7.691 `journal/HANDOFF.md:29#p2`  @Fable (sesja analityczna)

**id-07**, first hit: 3 (journal-only 12)

- related 16.701 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    8.077 `docs/INFRA.md:38`  2. Network and security
- hit     7.257 `docs/DB-SCHEMA.md:1`  DB-SCHEMA.md — HOMOS database design (SQLite)
- miss    6.608 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    6.356 `journal/RESEARCH-QUEUE.md:812`  G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne)

**na-01**, answerable partial; first related: 59

- miss    15.627 `docs/CASE-STUDY.md:67` 2026-08-27 4. Live capital (27 Aug – 21 Sep 2026)
- miss    15.166 `docs/EMERGENCY.md:88`  6. Off-ramp lessons
- miss    14.895 `docs/UI-DESIGN.md:13`  1. As built vs planned
- miss    13.470 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    12.972 `docs/UI-DESIGN.md:149`  8. Requirements added to the original brief

**na-02**, answerable partial; first related: 42

- miss    9.468 `docs/PAIRS.md:69`  3. Portfolio sketch to be validated in the backtest (capital $5–25k)
- miss    9.442 `docs/PAIRS.md:83`  4. What this changes in the application and the plan
- miss    8.462 `docs/PLAN.md:1`  HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)
- miss    6.686 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    6.608 `docs/CASE-STUDY.md:141`  7. Numbers, for the record

**na-03**, answerable partial; first related: 33

- miss    17.455 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    11.712 `docs/UI-DESIGN.md:13`  1. As built vs planned
- miss    11.158 `docs/PAIRS.md:1`  Pair and pool analysis — LP portfolio diversification
- miss    11.107 `docs/ALGORITHM.md:84` 2026-08-11 6. Portfolio (revision of 11 Aug; the original candidate list is in [`
- miss    10.485 `docs/UI-DESIGN.md:135`  7. Rotation policy: weakest position → better opportunity

**na-04**, answerable no; first related: 91

- miss    15.265 `docs/UI-DESIGN.md:35`  2. Architecture: who does what
- miss    13.943 `docs/UI-DESIGN.md:149`  8. Requirements added to the original brief
- miss    12.240 `docs/ALGORITHM.md:104`  8. Known limitations of v1
- miss    11.673 `docs/CASE-STUDY.md:105`  5. Conclusions
- miss    10.092 `journal/CONTEXT.md:3473` 2026-08-18 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszm

**na-05**, answerable no; first related: -

- miss    6.056 `docs/CASE-STUDY.md:141`  7. Numbers, for the record
- miss    4.767 `docs/DECISION-LOG.md:23` 2026-08-26 Decision of 2026-08-26
- miss    4.686 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    4.634 `docs/UI-DESIGN.md:100`  4.4 Ledger
- miss    4.557 `docs/EMERGENCY.md:21`  1. Default reaction: sign nothing

**na-06**, answerable no; first related: 1

- related 8.984 `docs/AI-WORKFLOW.md:81`  What did not
- miss    7.789 `docs/PLAN.md:108`  3.7. Backtest quality decides everything
- miss    7.209 `docs/AI-WORKFLOW.md:1`  How the project was run with AI sessions
- miss    6.855 `journal/TASKS-WINDOWS-ADDENDUM.md:1`  TASKS-WINDOWS — ADDENDUM: boty mają być NIEWIDOCZNE
- miss    6.473 `docs/DECISION-LOG.md:30` 2026-09-18 Decision of 2026-09-18

**na-07**, answerable partial; first related: 1

- related 19.057 `docs/DB-SCHEMA.md:1`  DB-SCHEMA.md — HOMOS database design (SQLite)
- miss    14.697 `docs/DB-SCHEMA.md:164`  3. What is deliberately outside the database
- miss    12.867 `docs/DB-SCHEMA.md:174`  4. Planned rollout (not carried out)
- miss    12.791 `docs/DB-SCHEMA.md:13`  1. Design principles (more important than the specific tables)
- miss    9.981 `docs/EMERGENCY.md:21`  1. Default reaction: sign nothing
