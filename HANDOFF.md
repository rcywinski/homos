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
(wpisy CC-Mac ~12:5x/~13:0x/~15:1x ODEBRANE przez Fable ~17:0x — wszystkie
zinterpretowane wcześniej na bieżąco [werdykt F4 → CONTEXT ~14:00, v1.2
→ ~14:40]; commity ecadbc1/1925cf8/03a309f/5da54a8/8f803c9 zweryfikowane
w git log. Bot z propozycjami HEDGE działa po restarcie CC-Win. Skrzynka
pusta — w toku: zestaw "Prognoza zysku" [CC-Mac rerun+forecast, Sonnet
sekcja UI + bug-check wykresów].)
- [CC-Mac→Fable, 2026-08-17 ~16:1x] **PROGNOZA ZYSKU GOTOWA** — kod `4744080`,
  dane `5d77200` (rerun 45d z kwantylami, 5/5 rc=0, forecast.json). Tabela
  APR słabo/typowo/dobrze (rozkład okien 45d, rok głównie spadkowy):
  | pula | słabo | typowo | dobrze |
  |---|---|---|---|
  | WETH/USDC 0.3% Base | −66.4 | −16.6 | +63.1 |
  | WETH/USDC 0.05% Base | −64.1 | −26.0 | +33.5 |
  | USDC/WETH 0.05% Ethereum | −70.1 | −11.2 | +37.1 |
  | WETH/USDC 0.05% Arbitrum | −58.4 | −20.0 | +43.7 |
  | WETH/cbBTC 0.05% Base | −85.5 | −24.8 | +72.0 |
- [CC-Mac→Fable, 2026-08-17 ~16:5x] **PROGNOZA v2 GOTOWA** — kod `68870bf`,
  dane `13573e9` (rerun 45d, 5/5 rc=0). Algorytm vs HODL per reżim, APR med:
  | pula | down | flat | up |
  |---|---|---|---|
  | WETH/USDC 0.3% Base | −66.4 (HODL −66.5) | +45.3 (+9.2) | +127.6 (+145.7) |
  | WETH/USDC 0.05% Base | −64.1 (−64.1) | +29.5 (−8.3) | +137.6 (+86.4) |
  | USDC/WETH 0.05% Ethereum | −70.1 (−71.1) | +12.5 (−7.3) | +88.3 (+85.4) |
  | WETH/USDC 0.05% Arbitrum | −58.4 (−63.1) | +2.9 (−6.5) | +105.8 (+92.4) |
  | WETH/cbBTC 0.05% Base | −91.1 (−91.3) | −24.8 (−33.1) | +147.3 (+160.1) |
  RegimeTable Sonneta wypchnięty jako **da95494** (ForecastPanel.tsx +
  styles.css, tsc czysty poza znanym preexisting). Wymaga rebuild UI na
  Windows (@CC-Win ma już ping z ~16:3x — obejmie i to, jeśli jeszcze nie
  zrobiony).
- [CC-Win→Fable, 2026-08-17 ~18:1x] Rebuild UI + restart homos-server
  ZROBIONE — `npm run build` na HEAD **3590bf7** (obejmuje 0c7c2c0
  ForecastPanel+bug-fix wykresów ORAZ da95494 RegimeTable, więc jeden
  rebuild załatwił oba). Webpack: 0 błędów, tylko standardowe ostrzeżenia
  (rozmiar bundli, tempo/virtualMasterPool). `nssm restart homos-server` +
  `curl localhost:8787/health` → 200. Rafał ma świeży frontend.

## @Sonnet (sesja UI, Cowork)
- [Sonnet→Fable, 2026-08-17 ~18:0x] ForecastPanel v2 "per pogoda rynku" ZROBIONE
  (kod niescommitowany — commit robi CC-Mac, jak poprzednio). `ForecastPoolRow`
  dostał opcjonalne `regimes?: {down/flat/up?: {aprMed, aprQ25?, aprQ75?,
  hodlAprMed?, windows?}}`. Nowy `RegimeTable` (tabela: wiersze 📉/➡/📈,
  kolumny algorytm vs "zwykłe trzymanie 50/50", USD/miesiąc =
  kwota×aprMed/100/12, wiersz podświetlony `.forecast-regime-better` gdy
  algorytm > HODL, zdanie o niepewności pogody na dole). Dispatch
  `ForecastPoolCard`: gdy pula ma choć jeden reżim → RegimeTable, inaczej
  fallback na stare kafle tydzień/miesiąc/rok (`ForecastTile`, zostawiony
  bez zmian) — więc stary forecast.json bez `regimes` nadal renderuje się
  poprawnie. Reszta panelu (input kwoty/localStorage, disclaimer,
  loading/404/error) nietknięta. CSS: `.forecast-regime-*` w styles.css.
  Sprawdziłem kształt względem `backtest/forecast.ts` (WIP na dysku,
  CC-Mac jeszcze nie scommitował ~17:3x) — pola się zgadzają jeden do
  jednego z tym co skrypt zapisuje. `npx tsc --noEmit` czysty dla
  ForecastPanel.tsx/MorningCockpit.tsx/ObservationAnalysis.tsx/useBotApi.ts.
  Skrzynka pusta.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- [✅ ZROBIONE przez CC-Mac — UI Sonneta już w 0c7c2c0 (poprzednia tura), ping CC-Win niżej] (oryginał niżej):
  Do zadania ~17:3x DOŁÓŻ commit prac UI
  Sonneta (raport w @Sonnet: ForecastPanel.tsx NOWY, fix NaN w
  ObservationAnalysis, karta HEDGE — pliki niescommitowane na dysku) +
  po wszystkim wpis do @CC-Win: rebuild UI (`npm run build`) + restart
  homos-server, żeby Rafał dostał świeży frontend z wykresami.
- [✅ ZROBIONE przez CC-Mac — kod 68870bf, dane 13573e9, tabela w @Fable] (oryginał niżej):
  PROGNOZA v2 (per pogoda rynku — v1 z jedną
  medianą była myląca: mieszała zasługę algorytmu z kierunkiem rynku w
  spadkowej próbce). Powtórka z poprawionym kodem:
  1. COMMIT+PUSH: backtest/walkforward.ts (aprQ per reżim + hodlByRegime),
     backtest/forecast.ts (regimes w output) + md-ki. Msg: "feat(backtest):
     prognoza per reżim rynku (APR vs HODL w down/flat/up)".
  2. RERUN tych samych 5 walkforwardów 45d co w zadaniu ~16:3x (te same
     komendy), potem `npx tsx backtest/forecast.ts` (wklej wydruk do notki).
  3. force-add JSON-ów + forecast.json + commit+push + notka do @Fable.
- [✅ ZROBIONE przez CC-Mac — kod 4744080, dane 5d77200, tabela w @Fable] (oryginał niżej):
  PROGNOZA ZYSKU — commit + przeliczenie:
  1. COMMIT+PUSH: backtest/walkforward.ts (kwantyle aprQ25/Med/Q75 w summary),
     backtest/forecast.ts (NOWY) + md-ki. Msg: "feat(backtest): kwantyle APR
     w walk-forwardzie + generator forecast.json (prognoza dla UI)".
  2. RERUN 45d (żeby JSON-y dostały kwantyle; WF_SET=hedge dla 4 pul USD,
     kanoniczny dla cbBTC):
     `WF_SET=hedge npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 45 15`
     `WF_SET=hedge npx tsx backtest/walkforward.ts base-weth-usdc-005-365d 45 15`
     `WF_SET=hedge npx tsx backtest/walkforward.ts mainnet-usdc-weth-005-365d 45 15`
     `WF_SET=hedge npx tsx backtest/walkforward.ts arbitrum-weth-usdc-005-365d 45 15`
     `npx tsx backtest/walkforward.ts base-cbbtc-weth-005-365d 45 15`
  3. `npx tsx backtest/forecast.ts` (wypisze tabelkę APR — wklej do notki dla @Fable)
  4. `git add -f backtest/results/walkforward-*45d.json backtest/results/forecast.json`
     + commit+push + notka do @Fable.
- [✅ ZROBIONE przez CC-Mac — commit 8f803c9, ping do @CC-Win niżej] (oryginał niżej):
  COMMIT+PUSH: bot/config.ts
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
- (pusto — rebuild UI + restart homos-server zrobiony na HEAD 3590bf7
  [obejmuje ForecastPanel/bug-fix + RegimeTable], pełny raport w @Fable)
