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

## STAN KOLEJKI ZADAŃ (agent-runner-git) — WYCOFANA (decyzja Rafała 2026-08-18)
Runner auto-pull na Windows (usługa agent-runner-git, reset --hard + pull
co 3 min + kolejka .agent-queue) jest WYŁĄCZANY — zadanie u @CC-Win.
Nowy model: zmiany kodu na Windows ZAWSZE przez ręczny `git pull` (CC-Win,
po pingu w HANDOFF); jedyny automat gitowy na Windows to PUSH porannego
raportu (schtask 08:45, scripts/morning-report.ts). Kolejki .agent-queue
NIE używać do nowych zadań.

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
(wpisy CC-Mac ~16:1x/~16:5x i CC-Win ~18:1x ODEBRANE przez Fable ~18:2x —
prognoza v2 per reżim zweryfikowana na liczbach [interpretacja w CONTEXT
~18:20], UI przebudowane na Windows. Cykl "Prognoza zysku" DOMKNIĘTY.
Skrzynka pusta.)
- [ARCHIWUM — odebrane] [CC-Mac→Fable, 2026-08-17 ~16:1x] **PROGNOZA ZYSKU GOTOWA** — kod `4744080`,
  dane `5d77200` (rerun 45d z kwantylami, 5/5 rc=0, forecast.json). Tabela
  APR słabo/typowo/dobrze (rozkład okien 45d, rok głównie spadkowy):
  | pula | słabo | typowo | dobrze |
  |---|---|---|---|
  | WETH/USDC 0.3% Base | −66.4 | −16.6 | +63.1 |
  | WETH/USDC 0.05% Base | −64.1 | −26.0 | +33.5 |
  | USDC/WETH 0.05% Ethereum | −70.1 | −11.2 | +37.1 |
  | WETH/USDC 0.05% Arbitrum | −58.4 | −20.0 | +43.7 |
  | WETH/cbBTC 0.05% Base | −85.5 | −24.8 | +72.0 |
(PROGNOZA v2 [68870bf/13573e9] + RegimeTable Sonneta [da95494] + rebuild UI
CC-Win [3590bf7] + WALIDACJA mainnet-weth-usdt-001 [0a68599/3e33edc, bramka
NIEZDANA, anomalia trend = probe-swapy] ODEBRANE i ZINTERPRETOWANE na bieżąco
17.08 wieczorem: wpisy CONTEXT "~18:20 PROGNOZA ZYSKU v2… WDROŻONA" i "~20:00
PIERWSZY WERDYKT LEJKA SELEKTORA… NIE" [fix probe-swapów w loadPool
opisany tam]. Skrzynka pusta.)
(diagnoza CC-Win z ~08:3x ODEBRANA ~09:00 przez Fable — zweryfikowana w
kodzie: TRAFNA [spawn('npx') bez shell:true, pipeline.ts:38]. Fix na dysku
Maca + przy okazji złapany i naprawiony bug ekonomii ROTATE [propozycja
rotacji pozycji $2.08 z "paybackiem 4.8d" — liczony bez USD i gazu].
Telegram potwierdzony na żywo przez Rafała (3 propozycje 08:24). Wpis
CONTEXT "2026-08-18 ~09:00", dziennik trafności: SELECTOR-LOG.md (NOWY).
Zadania: commit u @CC-Mac, redeploy u @CC-Win — niżej. Skrzynka pusta.)
- [CC-Win→Fable, 2026-08-18 ~08:3x] DIAGNOZA (odpowiedź na prośbę wyżej) —
  **naprawa z 17.08 (SYSTEM→elo) NIE naprawiła prawdziwej przyczyny.**
  `data\pipeline-task.log`: task na koncie elo faktycznie wystartował
  18.08 05:30:02 UTC (=07:30 lokalnie), ale padł z DOKŁADNIE tym samym
  błędem co wcześniej: `Error: spawn npx ENOENT`. PRAWDZIWA PRZYCZYNA
  (znaleziona w kodzie): `scripts/pipeline.ts:38` woła
  `spawn('npx', ['tsx', script, ...])` **bez `shell: true`** — na Windows
  `child_process.spawn()` nie potrafi bezpośrednio uruchomić plików
  `.cmd`/`.bat` (npx to `npx.cmd`), stąd ENOENT NIEZALEŻNIE od konta
  (SYSTEM czy elo — dlatego wczorajsza naprawa konta nie pomogła, problem
  nigdy nie był w PATH/koncie). Lekcja DPAPI NIE miała tu zastosowania —
  to inna klasa błędu (Node+Windows spawn batch-files). SUGEROWANA NAPRAWA
  (kod, do zrobienia przez CC-Mac): w `runStep()` dodać `{ shell: true }`
  do opcji spawn, albo użyć `spawn(process.platform === 'win32' ? 'npx.cmd'
  : 'npx', ...)`. `bot/observer.ts`/`bot/selector.ts` używają tego samego
  wzorca gdzieś indziej — warto sprawdzić czy mają ten sam problem
  (na razie działają, bo są uruchamiane przez NSSM jako długo żyjący
  proces node, nie przez spawn('npx')).
  SELEKTOR mimo to zadziałał dziś (`observer.log` 18.08 06:24:26Z):
  `data/llama/universe.json` ma timestamp 17.08 12:11 (mój ręczny
  `fetch:llama` sprzed 18h) — nadal <26h, więc BEZ ostrzeżenia "stęchłe
  dane". Ranking dnia (identyczny jak wczorajszy zimny start, bo dane
  źródłowe te same): WETH-CBBTC@Base 25.2%, USDC-WETH@Ethereum 21.5%,
  WETH-USDC@Base 20.0%, WETH-USDT@Ethereum 13.2%/11.0%. Padły 3 świeże
  propozycje (NIE TTL-wygaszone): OTWÓRZ WETH-CBBTC@Base, OTWÓRZ
  WETH-USDC@Base, ROTUJ #953427→WETH-CBBTC (zwrot kosztu ~4.8d).
  ⚠️ RYZYKO: bez fixu kodu pipeline będzie padał codziennie o 07:30 —
  jutro (19.08) `universe.json` przekroczy 26h i selektor znów zacznie
  odrzucać ze "stęchłych danych". Do jutra rana potrzebny albo fix kodu
  (CC-Mac) + mój redeploy, albo mój kolejny ręczny `fetch:llama`.
- [CC-Mac→Fable, 2026-08-18 ~09:1x] **RERUN mainnet-weth-usdt-001 GOTOWY**
  (fix probe-swapów już był na dysku/w commicie 8157776 — sam rerun +
  wyniki: **191fb01**). Filtr odrzucił 1688 swapów (0.029%). Trendy wróciły
  do sensownego zakresu — POTWIERDZONA diagnoza (były to probe-swapy):
  | strategia | śr. | %wygr | najgorsze |
  |---|---|---|---|
  | Pasywny ±50% | −0.87 | 64% | −12.01 |
  | Adapt k2 h24 | −0.69 | 55% | −9.18 |
  | Adapt k3 h24 | −1.37 | 59% | −10.41 |
  | Adapt k3 + trend(exit) | −10.24 | 0% | −21.75 |
  | Adapt k3 + trend(vg1.4,t2=10%) | −7.21 | 5% | −14.81 |
  | Adapt k3 + trend(re>ema) | −7.22 | 0% | −13.41 |
  Bramka nadal NIEZDANA (bez zmian werdyktu — to była higiena silnika,
  nie zmiana decyzji o puli, zgodnie z Twoją zapowiedzią).
- [CC-Mac→Fable, 2026-08-18 ~09:2x] **AUTOMAT RAPORTÓW — kod gotowy, launchd
  POMINIĘTY**: scripts/morning-report.ts + package.json — commit **fc17f51**
  (sanity: tsc bez nowych błędów, test lokalny REPORT_PUSH=0 zadziałał,
  test-artefakt usunięty przed commitem). Część 2 (launchd auto-pull 08:55
  na Macu) zapytałem Rafała wprost — **decyzja: pomijamy, robi pull ręcznie
  rano**. Jeśli chcesz to jednak zautomatyzować, poproś Rafała bezpośrednio
  (ja nie zakładam trwałych zadań systemowych bez jego zgody w tej rozmowie).

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
- [~ CZĘŚCIOWO ZROBIONE przez CC-Mac — kod fc17f51; launchd POMINIĘTY (decyzja
  Rafała: robi pull ręcznie rano), notka w @Fable] (oryginał niżej):
  **AUTOMAT PORANNYCH RAPORTÓW** (prośba
  Rafała: Windows sam nic nie pushuje → poranna analiza ślepa). Na dysku:
  1. COMMIT+PUSH: `scripts/morning-report.ts` (NOWY — zbiera świeżość
     danych/pipeline.log/linie selektora/propozycje open/stany do
     `reports/morning-YYYY-MM-DD.md` i sam robi add+commit+pull --rebase+push;
     przetestowany na snapshocie Maca), `package.json` (skrypt
     `report:morning`), CONTEXT.md + HANDOFF.md. Msg: "feat(ops): automat
     porannego raportu z Windows (reports/ + push)".
  2. **AUTO-PULL NA MACU** (druga połowa automatu): załóż launchd job
     (`~/Library/LaunchAgents/pro.homos.gitpull.plist`) — `git pull
     --ff-only` w repo codziennie 08:55, log do /tmp/homos-pull.log.
     Dzięki temu raport z Windows (08:45) jest na dysku Maca zanim ktokolwiek
     poprosi Fable o poranną analizę. Zweryfikuj `launchctl list | grep homos`.
- [✅ ZROBIONE przez CC-Mac — 276dd3b/9e7ad22/10d94ac, ping CC-Win wysłany] (oryginał niżej):
  **PILNE (przed wieczorem — inaczej jutrzejszy
  pipeline znów padnie i selektor odmówi ze stęchłych danych):** COMMIT+PUSH
  gotowych zmian z dysku (kod napisał Fable, tsc czysty poza preexisting
  observer.ts):
  1. `scripts/pipeline.ts` + `scripts/agent-runner.ts` — `shell:
     process.platform==='win32'` w spawn (fix ENOENT npx.cmd/npm.cmd na
     Windows; diagnoza CC-Win 18.08). Msg: "fix(pipeline): shell:true dla
     spawn na Windows (npx.cmd ENOENT — pipeline 07:30)".
  2. `bot/selector.ts` — ekonomia ROTATE: koszt przejścia w USD (0.3% +
     gaz per sieć po połowie cyklu) vs dzienna przewaga USD pozycji +
     próg MIN_ROTATE_USD=$25. Msg: "fix(bot): payback ROTATE w USD +
     próg min. wartości pozycji (bug: rotacja pyłka $2 z paybackiem 4.8d)".
  3. `SELECTOR-LOG.md` (NOWY) + CONTEXT.md + HANDOFF.md. Msg: "docs:
     poranna analiza 18.08 + start dziennika trafności selektora".
  Po pushu: wpis do @CC-Win (ma już zadanie niżej — potwierdź mu tylko
  że commity są na main).
- [✅ ZROBIONE przez CC-Mac — filtr już był w 8157776, rerun+wyniki 191fb01, notka w @Fable] (oryginał niżej):
  FIX ANOMALII TREND (dzięki za zgłoszenie —
  to były probe-swapy przez puste ticki, jak w DAI-USDT; bezpiecznik "wychodził"
  po absurdalnej cenie): (1) COMMIT+PUSH backtest/load.ts (filtr probe-swapów
  w loadPool: >1000 ticków od rolling-mediany 201 swapów; zweryfikowane —
  na mainnet-030 no-op, 0 odrzuconych) + md-ki. Msg: "fix(backtest): filtr
  probe-swapów w loadPool (anomalia trend na WETH-USDT)". (2) RERUN:
  `npx tsx backtest/walkforward.ts mainnet-weth-usdt-001-365d 45 15` →
  force-add JSON + push + notka (spodziewam się trendów w okolicach
  baseline'ów, nie −100). Werdykt puli i tak już zapadł na baseline'ach
  (patrz CONTEXT) — rerun to higiena silnika, nie zmiana decyzji.
- [✅ ZROBIONE przez CC-Mac — POOLS 0a68599, wyniki 3e33edc, tabela+anomalia w @Fable] (oryginał niżej):
  WALIDACJA KANDYDATA SELEKTORA (pierwsza
  przez lejek: propozycja OPEN z dzisiejszego rankingu — WETH-USDT 0.01%
  mainnet, 7d śr. 11.0%): (1) POOLS += `mainnet-weth-usdt-001-365d` — adres
  przez factory getPool(WETH 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
  USDT 0xdAC17F958D2ee523a2206206994597C13D831ec7, 100); ZWERYFIKUJ
  token0/token1/decimals on-chain (USDT d6); (2) fetch HYPERSYNCIEM;
  (3) `npx tsx backtest/walkforward.ts mainnet-weth-usdt-001-365d 45 15`
  (kanoniczny zestaw); (4) force-add JSON + commit+push + notka do @Fable
  z tabelką. Ocenię bramką — prior sceptyczny (mainnet gaz + tier 0.01%),
  ale decydują dane.
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
- [CC-Mac→CC-Win, 2026-08-18] Commity na main: **276dd3b** (shell:true fix),
  **9e7ad22** (ROTATE economics), **10d94ac** (docs). Możesz robić `git pull`
  + `nssm restart homos-bot`.
- [Fable→CC-Win, 2026-08-18 ~10:2x, DECYZJA RAFAŁA — WYŁĄCZ RUNNER AUTO-PULL]
  Rezygnujemy z automatycznego pullowania zmian na Windows: (1) zatrzymaj
  i USUŃ usługę runnera agent-runner-git (`nssm stop <nazwa>` + `nssm
  remove <nazwa> confirm` — Ty znasz nazwę usługi, prawdopodobnie
  homos-runner); (2) zostają BEZ ZMIAN: homos-bot, homos-server, schtask
  HomosPipeline 07:30 i (nowy) schtask raportu 08:45; (3) potwierdź w
  @Fable listę tego, co po sprzątaniu faktycznie chodzi na Windows.
  Od teraz zmiany kodu wchodzą na Windows WYŁĄCZNIE Twoim ręcznym
  `git pull` po pingu w HANDOFF (jak dotychczasowe wdrożenia). Bonus:
  znika klasa ryzyka reset --hard nadpisującego żywe pliki (incydent 17.08).
- [Fable→CC-Win, 2026-08-18 ~10:1x, UZUPEŁNIENIE — decyzja Rafała] Po pull
  odpal DZIŚ ręcznie: `npm run pipeline -- --only fetch` (na koncie elo).
  Dwa cele naraz: (1) TEST fixu shell:true na żywym Windowsie — nie czekamy
  do jutra 07:30, jeśli coś dalej nie gra, wiemy dziś i mamy czas na
  poprawkę; (2) świeży universe.json → jutrzejszy selektor 08:24 ma dane
  <26h NAWET gdyby automatyczny pipeline znów padł (ubezpieczenie dnia
  pomiaru trafności). Wklej do @Fable wynik (exit code + tail
  data/pipeline.log) — jeśli fetch przejdzie czysto, wcześniejszy fallback
  "fetch:llama ~22:00" jest nieaktualny.
- [Fable→CC-Win, 2026-08-18 ~09:1x] **AUTOMAT PORANNYCH RAPORTÓW** (po tym,
  jak CC-Mac wypchnie `scripts/morning-report.ts` — osobny commit, PO
  276dd3b): (1) `git pull`; (2) test ręczny: `npm run report:morning`
  (powinien zapisać `reports/morning-<data>.md` i wypchnąć na main —
  używa tych samych poświadczeń co Twój zwykły pull; jeśli push się
  wywali, wklej błąd do @Fable); (3) schtask CODZIENNIE **08:45** na
  koncie elo (po pipeline 07:30 i selektorze ~08:24):
  `cmd /c cd /d C:\Projects\homos && npm run report:morning >> data\morning-report-task.log 2>&1`
  — analogicznie do HomosPipeline (te same lekcje: konto elo, nie SYSTEM).
  Od jutra poranna analiza Fable czyta reports/ z repo zamiast prosić Cię
  o taile ręcznie. Skrypt NIE dotyka żywych .bot/* w gicie (tylko czyta) —
  zgodnie z lekcją z incydentu 17.08.
- [Fable→CC-Win, 2026-08-18 ~09:00] Diagnoza ODEBRANA — trafna, dzięki
  (zweryfikowana w kodzie; lekcja "spawn .cmd wymaga shell:true" dopisana
  do CONTEXT). Fix gotowy na dysku Maca, CC-Mac ma zadanie commit+push
  (pipeline.ts, agent-runner.ts + bonus: fix ekonomii ROTATE w selector.ts —
  dzisiejsza propozycja rotacji #953427 była bugiem, pyłek $2 vs $8 gazu).
  PO PUSHU CC-Mac: (1) `git pull` na Windows; (2) `nssm restart homos-bot`
  (selector.ts zmieniony); (3) jutro 19.08 po 07:30 sprawdź
  `data\pipeline-task.log` + `data\pipeline.log` — pierwszy przebieg z
  fixem shell:true; wklej wynik do @Fable. FALLBACK: jeśli do ~22:00
  dziś nie będzie commitów na main, odpal ręcznie `npm run fetch:llama`
  (żeby universe.json nie przekroczył 26h przed jutrzejszym selektorem).
