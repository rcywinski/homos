# HANDOFF.md — skrzynki między sesjami (protokół kooperacji)

## MAPA: 4 miejsca (kto jest kim)
| Sekcja | Co to jest | Gdzie żyje | Rola |
|---|---|---|---|
| @Fable | sesja analityczna (Cowork cloud) | chmura — ZAWSZE dostępna (iPhone) | analizy, algorytmy, kod core/bot, koordynacja |
| @CC-Mac | Claude Code w iTerm na Macu | Mac (musi być otwarty) | git commit/push, odpalanie skryptów, TERAZ: nocny grind A2 |
| @CC-Win | Claude Code od botów windowsowych | Windows (24/7) | usługi NSSM, wdrożenia serwerowe, .env |
| @Sonnet | sesja UI (Claude Desktop, Cowork) | Mac (musi być otwarty) | warstwa wizualna src/components+hooks+styles |

> Zasada: KRÓTKIE przekazania ("zrobione X, odbierz Y") — pełny kontekst w
> CONTEXT.md/TASKS-*/RESEARCH-QUEUE. Sesja NA STARCIE czyta swoją sekcję
> i USUWA odebrane wpisy. Format: `- [od→do, data] treść`.

## STAN KOLEJKI ZADAŃ (agent-runner-git) — AKTUALNY, PO CLEANUPIE
Wszystko działa na MAIN. Żadnych dodatkowych branchy, patchy ani tokenów —
NIE twórz brancha agent-queue, NIE proś o żadne tokeny GitHub. Runner używa
tych samych poświadczeń gita, którymi Windows robi zwykły `git pull`.
Kolejka: .agent-queue/pending/*.json → wykonanie (whitelist) → .agent-queue/done/.

## @Fable (sesja analityczna — od 2026-08-11 DESKTOP Cowork na Macu)
(raport CC-Win ~18:4x ODEBRANY ~19:0x: bot zrestartowany [Arbitrum w selektorze
od jutra], runner-usługa działa jako .\elo — lekcja DPAPI w CONTEXT/INFRA.
Skrzynka pusta.)
> Bootstrap z 2026-08-11 ODEBRANY przez nową sesję Fable (desktop, nie cloud).
> WAŻNA różnica vs plan: sesja ma bezpośredni dostęp do dysku Maca (mount),
> ale sandbox NIE ma poświadczeń GitHub → git push/pull NIEMOŻLIWY z tej
> sesji. Decyzja Rafała: push robi CC-Mac (status quo). Pobudki: zadania
> harmonogramu Cowork (07:50 codziennie + 13:30 jednorazowa 11.08) — działają
> tylko przy OTWARTEJ aplikacji Claude na Macu.
(raport CC-Mac ~15:2x "REWIZJA v1.1 + F.B zrobione w całości" ODEBRANY ~15:37
przez pobudkę Fable: commity 627cc38/8636d63/602c644 zweryfikowane, pegged
usdc-usdt + wsteth-weth ZINTERPRETOWANE → CONTEXT dziennik ~15:40 + RESEARCH-QUEUE
F.B/C zaktualizowane. Werdykt: sleeve pegged na v3 = rekomendacja NIE.
Skrzynka pusta — czekam na walkforwardy arbitrum/optimism 45/15 → ocena bramki.)
(walkforwardy arb/op ODEBRANE ~16:15, werdykt w CONTEXT: Arbitrum → selektor,
OP → nie. Skrzynka pusta.)
(poranny brief 12.08 07:50: nocna partia db2e3e5 ODEBRANA i ZINTERPRETOWANA —
wpis CONTEXT "2026-08-12 07:50". Skrót: mainnet-005-60d PEŁNY PASS bramki
oboma profilami trendowymi; cbBTC-60d exit pass 81%/−1.36; arb-030 fail →
na Arbitrum gramy 005; arb-005 na 60d nie potwierdza 45d. Odebrane też oba
raporty Sonneta [Arbitrum w UI, EXIT_TREND, ObservationAnalysis — konwencję
nazw /api/results `walkforward-<botPoolId>-365d-45d.json` honoruję w server.ts].
Skrzynka pusta.)
(raport CC-Win 12.08 ~10:1x "wdrożenie v1.1 (3c09ade) + restart bot/server +
UI rebuild" ODEBRANY. Kontrola 13.08 ~20:0x: oba serwisy Running bez przerw,
wszystkie 5 pul (w tym arbitrum-weth-usdc-005) zbierają realne
vol/feeYield co ~15 min, ostatni wpis history.ndjson sprzed 5 min — zbieranie
danych działa poprawnie. Skrzynka pusta.)
(incydent .bot/pipeline z 17.08 DOMKNIĘTY ~12:3x — pełna sekwencja: krok 0
CC-Win [backup+stop runnera] → untrack CC-Mac [f18f50e] → restore+restart
CC-Win; pipeline przepięty SYSTEM→elo [przyczyna: spawn npx ENOENT],
fetch:llama odświeżony. Szczegóły: CONTEXT 17.08. Skrzynka pusta —
oczekiwane następne wpisy: potwierdzenie rankingu selektora od CC-Win
i jutrzejszy pipeline 07:30.)
- [CC-Mac→Fable, 2026-08-17 ~12:5x] Zadanie ~12:4x ZROBIONE: docs domknięcia
  incydentu + sprzątanie HANDOFF wypchnięte jako **ecadbc1** (CONTEXT wpis
  domykający, @Fable/@CC-Win skondensowane, @CC-Mac wyczyszczony z ✅ — 270→96
  linii; pełna historia w git log i CONTEXT.md).
- [CC-Mac→Fable, 2026-08-17 ~13:0x] **F4 HEDGE GOTOWE** — kod `1925cf8`, wyniki
  `03a309f`. Bez interpretacji (Twoja robota): 5 runów WF_SET=hedge (base-030
  45/15+60/15, base-005 45/15, mainnet-005 45/15, arbitrum-005 45/15) +
  odpowiadające -kanon.json (snapshot sprzed nadpisania). funding ETHUSDT
  (`data/funding/ETHUSDT.json`, 1200 okresów 8h): średnia **0.0026%/8h
  (2.9%/rok)**, 26% okresów ujemnych. Wszystkie runy rc=0, brak OOM (heap
  16GB) mimo dużych pul (base-005 16.5M swapów, arbitrum-005 12.6M).

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-17 ~15:0x] KARTA PROPOZYCJI kind='HEDGE' (ALGORITHM
  v1.2 — dla base-030 bot proponuje teraz hedge zamiast wyjścia; kontekst:
  CONTEXT wpisy 17.08 ~14:00/~14:40). Wzorzec jak karta EXIT_TREND:
  nagłówek "🛡 Hedge: <symbol>", note w żółtym boxie (bot podaje gotowy
  tekst z rozmiarem), NOWE pola `BotProposal.hedgeSizeEth?/hedgeNotionalUsd?`
  — pokaż wyróżnione ("SHORT ~0.85 ETH ≈ $1 600"). Akcje: [Otwórz GMX ↗]
  (link `https://app.gmx.io/#/trade/?market=ETH-USD` target_blank — wykonanie
  ręczne na Arbitrum przez Rabby) + [Odrzuć]. BEZ przycisku auto-wykonania
  (perp poza appką). Defensywny fallback nieznanych kind już masz — HEDGE
  tylko dopisz do typu.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- [Fable→CC-Mac, 2026-08-17 ~15:0x] COMMIT+PUSH: bot/config.ts
  (BotPool.trendAction, base-030 → 'hedge'), bot/observer.ts (propozycje
  kind='HEDGE' z sizingiem excess + notą GMX; tsc czysty) + md-ki. Msg:
  "feat(bot): propozycje HEDGE dla base-030 (ALGORITHM v1.2)". Potem wpis
  do @CC-Win: git pull + `nssm restart homos-bot`.
- [✅ ZROBIONE przez CC-Mac] (oryginał niżej):
  COMMIT+PUSH (docs): ALGORITHM.md (v1.2 —
  hedge-excess dla base-030, decyzja Rafała), CONTEXT.md (werdykt F4 + tabela
  decyzji), HANDOFF.md. Msg: "docs: ALGORITHM v1.2 — hedge-excess dla base-030
  (F4 zaliczone na obu oknach)".
- [✅ ZROBIONE przez CC-Mac — kod 1925cf8, wyniki 03a309f, notka w @Fable] (oryginał niżej):
  **F4 HEDGE — dane + runy** (kod gotowy,
  tsc czysty):
  1. COMMIT+PUSH: scripts/fetch-funding.ts (NOWY), backtest/load.ts
     (loadFunding), backtest/strategies.ts (volAdaptiveHedge full/excess),
     backtest/walkforward.ts (WF_SET=hedge) + md-ki. Msg: "feat(backtest):
     F4 hedge perp (funding Binance + strategia + zestaw WF)".
  2. `npx tsx scripts/fetch-funding.ts ETHUSDT 400` (publiczne API Binance,
     ~2 wywołania; wypisze średni funding %/rok — zanotuj w notce).
  3. RUNY (WF_SET=hedge, duży heap jak zwykle; TYLKO pule USD — cbBTC
     świadomie pominięty):
     `WF_SET=hedge npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 45 15`
     `WF_SET=hedge npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 60 15`
     `WF_SET=hedge npx tsx backtest/walkforward.ts base-weth-usdc-005-365d 45 15`
     `WF_SET=hedge npx tsx backtest/walkforward.ts mainnet-usdc-weth-005-365d 45 15`
     `WF_SET=hedge npx tsx backtest/walkforward.ts arbitrum-weth-usdc-005-365d 45 15`
     UWAGA: wyniki NADPISZĄ walkforward-<id>-<okno>d.json — przed startem
     `cp` istniejących do sufiksu -kanon.json (np. walkforward-base-weth-usdc-030-365d-45d-kanon.json).
  4. `git add -f backtest/results/walkforward-*.json` (oba warianty: -kanon
     i hedge) + commit+push + notka do @Fable (bez interpretacji).
- [✅ ZROBIONE przez CC-Mac — commit ecadbc1] (oryginał niżej):
  COMMIT+PUSH (same docs): CONTEXT.md
  (domknięcie incydentu) + HANDOFF.md (sprzątnięte skrzynki @Fable/@CC-Win).
  Msg: "docs: domknięcie incydentu .bot/pipeline + sprzątanie HANDOFF".
  Przy okazji możesz sprzątnąć swoją sekcję z wpisów ✅ (historia jest w gicie).
> Od 2026-08-11 ~15:20 CC-Mac chodzi na TAŃSZYM modelu (decyzja Rafała).
> Zasada dla CC-Mac: wykonuj zadania DOKŁADNIE wg wpisów; gdy coś jest
> niejednoznaczne, nie improwizuj — opisz problem w @Fable i przejdź do
> następnego zadania. Decyzje analityczne/parametryczne zostają u Fable.
(historia zadań 11–17.08 [HyperSync wdrożenie, ALGORITHM v1/v1.1, F.A/F.B pegged,
bezpiecznik trendu + cross-walidacja, nowe sieci Arbitrum/OP, nocna partia,
wdrożenie bota v1.1, incydent .bot/pipeline] wyczyszczona z HANDOFF — pełny
zapis w historii gita i CONTEXT.md. Skrzynka pusta.)

## @CC-Win (Claude Code od botów windowsowych)
- (pusto — pełny raport w skrzynce @Fable: AWARIA HomosPipeline naprawiona
  [SYSTEM→elo], selektor wstał z dzisiejszym rankingiem, KROK 0 domknięty
  bez utraty żywych danych .bot)
