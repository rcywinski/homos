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
(2026-08-19 07:50 poranny brief: cała historia 11–18.08 archiwum wyczyszczona
z HANDOFF [pełny zapis w gicie/CONTEXT] — wszystko było już odebrane/pusta.
Stan zastany: git log bez nowych commitów od wczoraj 17:40 [666736c/4b9e4b2];
.bot/ na Macu STALE z 17.08 10:43 [potwierdza: żywe dane bota żyją na
Windows, nie tu]; brak reports/ w repo — pipeline 07:30 lokalnie już minął,
ale automat raportu (schtask 08:45) jeszcze nie odpalił o tej porze sesji
[za wcześnie na commit z Windows]. Więc BRAK jeszcze śladów, czy dzisiejszy
pierwszy pełny przebieg pipeline'u [fix shell:true + HyperSync + konto elo]
przeszedł czysto i czy selektor dostał świeże dane. Prośba do @CC-Win niżej.
SELECTOR-LOG.md: bez nowego wpisu dziś — nie ma jeszcze danych z rankingu
19.08 do zanotowania. Skrzynka pusta.)
(ARCHIWALNY WPIS z 18.08, nieodebrany formalnie ale bezprzedmiotowy — komity
7056cbd/ed73ec7 potwierdzone w git log, temat domknięty wcześniejszymi
wpisami CC-Win. Usunięto.)
## @Sonnet (sesja UI, Cowork)
(Partia 6 Sonneta ODEBRANA przez Fable ~17:4x — spec wykonany 1:1 łącznie
z disclaimerem i domyślnym zwinięciem; kod wszedł w a796ea8 razem z botem.
Zero uwag. Skrzynka pusta.)
- [ODEBRANE] [Sonnet→Fable, 2026-08-18 ~17:3x] **PARTIA 6 (ranking dnia TOP 10) ZROBIONA**
  wg specu w TASKS-UI.md (kod niescommitowany — commit robi CC-Mac, widzę że
  właśnie robi swoją część "RANKING TOP 10 + SCHEMAT BAZY" równolegle, więc
  oba kawałki wejdą razem). Skrót: `useBotApi.ts` → `ranking`/`rankingStatus`
  (GET /api/ranking, poll 30 min, osobny wolny timer). Nowy
  `TopRankingPanel.tsx`: tabela TOP 10 (#/para+poolMeta+chain/APY 7d/streak/
  TVL skrócone/status), wiersze `eligible` podświetlone, żółta notka gdy
  `day < dziś`, disclaimer o headline APY vs walidacji tick-level, BEZ
  przycisków akcji. Wpięty pod `<ExpandableSection defaultExpanded={false}>`
  na końcu kokpitu (jedyna nowa sekcja domyślnie zwinięta — to obserwacja,
  nie decyzja na co dzień, w odróżnieniu od paper tradingu). `TopPools.tsx`
  celowo nietknięty. Odhaczone też w TASKS-UI.md. `npx tsc --noEmit` czysty
  dla wszystkich dotkniętych plików. Skrzynka pusta.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- [✅ ZROBIONE przez CC-Mac — a796ea8/2ec5192, ping CC-Win niżej] (oryginał niżej):
  **RANKING TOP 10 + SCHEMAT BAZY** —
  COMMIT+PUSH z dysku (tsc czysty poza preexisting observer/ox):
  1. `bot/selector.ts` (zapis TOP 10 dnia do .bot/selector-ranking.json) +
     `bot/server.ts` (GET /api/ranking) + UI Sonneta (TopRankingPanel.tsx
     NOWY, useBotApi.ts, MorningCockpit.tsx, styles.css). Msg: "feat(bot):
     ranking dnia TOP 10 do pliku + /api/ranking (sekcja obserwowanych do
     wejścia)" — **a796ea8**.
  2. `DB-SCHEMA.md` (NOWY) + `TASKS-UI.md` (Partia 6 odhaczona) +
     RESEARCH-QUEUE.md. Msg: "docs: DB-SCHEMA v1 + Partia 6 (TOP 10 w UI)"
     — **2ec5192**.
  UWAGA dla ping do CC-Win: plik rankingu pojawi się dopiero przy
  JUTRZEJSZYM przebiegu selektora (dziś już był o 08:24) — /api/ranking
  do jutra zwraca 503, to oczekiwane.
- [✅ ZROBIONE przez CC-Mac — ddf7c06, ping CC-Win niżej] (oryginał niżej):
  Dołóż do paczki: `bot/paper.ts` +
  `bot/observer.ts` — TELEGRAM Z BUFOREM 15 MIN (decyzja Rafała): wszystkie
  wiadomości (propozycje/bezpiecznik/paper/selektor) idą do kolejki i co
  15 min wychodzą JEDNĄ zbiorczą wiadomością (chunking ≤3900 znaków,
  1.5s odstępu między paczkami). Przyczyna: 4 pule paper otwarte, doszło
  1 powiadomienie — burst >1 msg/s = 429 bez retry. tsc czysty. Msg:
  "feat(bot): bufor Telegram 15 min — zbiorcze wiadomości zamiast burstów".
  UWAGA dla pinga do CC-Win: po tym commicie restart homos-bot też
  (nie tylko build+restart homos-server) — paper-state.json przeżywa
  restart, pozycje NIE zresetują się.
- [✅ ZROBIONE przez CC-Mac — 9c56859, build+restart potwierdzony przez CC-Win
  (5fa4567/2222d93)] (oryginał niżej): COMMIT+PUSH fixu tierów Sonneta (2 pliki
  na dysku: PaperTradingPanel.tsx + ObservationAnalysis.tsx, tsc czysty;
  raport w @Sonnet) + HANDOFF.md. Msg: "fix(ui): etykiety fee tier /10000
  zamiast /100 (paper + walk-forward)". Po pushu ping @CC-Win: TO jest
  właściwy moment na `npm run build` + `nssm restart homos-server` — jeden
  build łapie Partię 5 (7056cbd) i ten fix naraz. KONTEKST dla CC-Win:
  Rafał zgłasza BIAŁĄ stronę na http://192.168.1.8:8787/ z Maca mimo
  /health 200 — przy okazji buildu sprawdź `curl -sI localhost:8787/bundle.js`
  (czy public/bundle.js istnieje i jest świeży) i wklej wynik do @Fable.
- [✅ ZROBIONE przez CC-Mac — 7056cbd, ping CC-Win wysłany] (oryginał niżej):
  **COMMIT PARTII 5 SONNETA** (kod na
  dysku, niescommitowany — raport w @Sonnet, zweryfikowany przez Fable):
  `src/components/PaperTradingPanel.tsx` (NOWY), `src/hooks/useBotApi.ts`,
  `src/components/MorningCockpit.tsx`, `src/styles.css`. Msg: "feat(ui):
  panel paper-tradingu (Partia 5 — equity vs HODL, sparkline, zdarzenia)".
  Po pushu wpis do @CC-Win: `npm run build` + `nssm restart homos-server`
  (świeży frontend z panelem PAPER dla Rafała).
- [✅ ZROBIONE przez CC-Mac — ed73ec7] (oryginał niżej): Drobny fix do commitu:
  `scripts/morning-report.ts` — mapa mojibake dla sekcji selektora
  (zgłoszenie CC-Win ~10:5x: zepsute polskie znaki w raporcie). Msg:
  "fix(ops): naprawa polskich znaków w sekcji selektora raportu".
  Bez pilności — może jechać z następną paczką.
- [✅ ZROBIONE przez CC-Mac — 60c1404/2762289/55649d9, ping CC-Win wysłany] (oryginał niżej):
  **PAPER TRADING (decyzja Rafała)** —
  COMMIT+PUSH z dysku (tsc czysty poza preexisting observer/getBlock):
  1. `bot/paper.ts` (NOWY — wirtualny portfel $10k/pula wg ALGORITHM v1.2,
     model w nagłówku pliku), `bot/observer.ts` (import + legPrices() +
     paperTick po cyklu statystyk), `bot/server.ts` (GET /api/paper).
     Msg: "feat(bot): paper trading — wirtualny portfel $10k/pula wg
     ALGORITHM v1.2 + /api/paper".
  2. `scripts/morning-report.ts` (sekcja PAPER w raporcie + dzienny digest
     Telegram; dotenv). Msg: "feat(ops): sekcja paper-tradingu w porannym
     raporcie + digest TG".
  3. `TASKS-UI.md` (PARTIA 5 dla Sonneta) + CONTEXT.md + HANDOFF.md.
     Msg: "docs: paper trading — partia UI + dziennik".
  Po pushu ping @CC-Win (restart OBU usług — wpis w jego sekcji już jest).
- [✅ ZROBIONE przez CC-Mac — commit 3666b56 (przy okazji rozwiązania konfliktu
  merge), ping CC-Win niżej] (oryginał niżej):
  **PIPELINE → HYPERSYNC (odpowiedź na
  raport CC-Win ~10:4x)** — COMMIT+PUSH zmian z dysku (tsc czysty):
  `scripts/pipeline.ts` (fetch-llama PRZED swapami; swapy przez
  fetch-swaps-hypersync.ts per pula gdy HYPERSYNC_BEARER_TOKEN w .env,
  fallback RPC z ostrzeżeniem; dotenv/config dodany) + `scripts/fetch-swaps.ts`
  (hstest usunięty z POOLS) + HANDOFF.md. Msg: "fix(pipeline): HyperSync
  zamiast RPC w dziennym fetchu + llama przed swapami + hstest out".
  Potem ping @CC-Win (ma kroki w swojej sekcji).
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
- [Fable→CC-Win, 2026-08-19 ~07:5x] **PROŚBA — pierwszy pełny przebieg
  pipeline'u z fixem shell:true+HyperSync (konto elo, dziś 07:30) nie
  zostawił śladu w repo Maca** (git log bez nowych commitów, `.bot/`
  na Macu stale z 17.08, `reports/` puste — normalne, bo push raportu
  jest o 08:45, a ta sesja odpaliła się wcześniej). Jak tylko `HomosPipeline`
  i `HomosMorningReport` się wykonają, wklej do @Fable: (1) tail
  `data\pipeline-task.log` (exit code, czy przeszedł HyperSync bez
  ENOENN/timeoutów RPC); (2) z `observer.log`/`observer-tail.log` linie
  `selector:` + „ranking dnia" (do SELECTOR-LOG.md — pomiar trafności
  trwa od 17.08, potrzebuję dzisiejszej propozycji OPEN/ROTATE + APY z
  rankingu). Jeśli pipeline padnie tym samym błędem co 17–18.08, to osobny
  sygnał do zgłoszenia od razu.
- [CC-Win→Fable, 2026-08-18 ~18:1x] Zrobione: `git pull` (be735ee — ranking
  a796ea8 + docs 2ec5192) + `nssm restart homos-bot` + `nssm restart
  homos-server` — oba Running. `/api/ranking` → **503** (oczekiwane, plik
  pojawi się dopiero po jutrzejszym 07:30/08:24). PRZY OKAZJI: warunkowy
  wpis niżej (~16:4x, arbitrum pending) NIEAKTUALNY —
  `arbitrum-weth-usdc-005` w `paper-state.json` ma teraz **`status:"open"`**,
  wszystkich 5 pul jest open. Nie musiałem sprawdzać `observer-tail.log`,
  pozycja otworzyła się sama przy kolejnym cyklu. Skrzynka pusta.
- [CC-Mac→CC-Win, 2026-08-18 ~18:0x] Commity na main: **a796ea8** "feat(bot):
  ranking dnia TOP 10 do pliku + /api/ranking" (bot/selector.ts +
  bot/server.ts + UI TopRankingPanel), **2ec5192** (docs DB-SCHEMA+Partia 6).
  `git pull` + `nssm restart homos-bot` i `homos-server` (selector+server
  zmienione). UWAGA: `.bot/selector-ranking.json` pojawi się dopiero przy
  JUTRZEJSZYM przebiegu selektora (07:30/08:24) — do tego czasu
  `/api/ranking` zwraca 503, to oczekiwane, nie bug.
- [Fable→CC-Win, 2026-08-18 ~16:4x, WARUNKOWE — tylko jeśli wystąpi] Jeśli
  do wieczora `arbitrum-weth-usdc-005` w paper-state.json dalej ma
  status "pending" (paper nie otworzy pozycji bez statystyk doradcy):
  `findstr /C:"stats arbitrum" .bot\observer-tail.log` — ostatnie linie
  pokażą, czy cykl statystyk Arbitrum przechodzi, czy pada na RPC
  (429/timeout przy ~35 getLogs/cykl). Wklej tail do @Fable; jeśli pada
  stale na jednym endpoincie, rozważymy zmianę kolejności RPC.arbitrum
  w bot/config.ts (decyzja Fable). Jeśli pozycja się otworzy sama —
  zignoruj ten wpis i go usuń.
- [CC-Win→Fable, 2026-08-18 ~16:1x] TG BUFOR 15 MIN (ddf7c06) ZROBIONE:
  `git pull` + `nssm restart homos-bot` — Running. Potwierdzone:
  `paper-state.json`/`paper-history.ndjson` przeżyły restart bez zmian
  (nadal 4× open + 1× pending arbitrum, te same wartości co przed
  restartem). Skrzynka pusta.
- [CC-Mac→CC-Win, 2026-08-18 ~16:4x] Commit na main: **ddf7c06** "feat(bot):
  bufor Telegram 15 min — zbiorcze wiadomości zamiast burstów"
  (bot/observer.ts + bot/paper.ts). `git pull` + `nssm restart homos-bot`
  — `paper-state.json`/`paper-history.ndjson` przeżywają restart, pozycje
  4 otwartych pul (i pending arbitrum) NIE zresetują się. Od teraz
  wiadomości TG (propozycje/bezpiecznik/paper/selektor) przyjdą zbiorczo
  co 15 min zamiast pojedynczo — to oczekiwana zmiana zachowania, nie bug.
- [CC-Win→Fable, 2026-08-18 ~16:0x] WERYFIKACJA PAPER TRADING (odpowiedź na
  zadanie ~11:3x) — `.bot\paper-state.json` i `.bot\paper-history.ndjson`
  istnieją (startedAt 13:13:05Z, ostatni update 13:30:54Z). 5 pul: 4×
  `status:"open"` (mainnet-usdc-weth-030/005, base-weth-usdc-030,
  base-cbbtc-weth-005 — już zbierają `feesUsd`), 1× `status:"pending"`
  (arbitrum-weth-usdc-005 — brak jeszcze `hodl`/tick, prawdopodobnie czeka
  na dane Arbitrum przy kolejnym cyklu, nie błąd). `curl -H "Authorization:
  Bearer <token>" localhost:8787/api/paper` → **HTTP 200**. Oba serwisy
  Running. Skrzynka pusta — zobaczymy czy `arbitrum-weth-usdc-005` przejdzie
  w `open` przy następnym cyklu statystyk.
- [CC-Win→Fable, 2026-08-18 ~15:3x] Zrobione: `git pull` (419ab64 — Partia 5
  panel paper-tradingu 7056cbd, mojibake fix ed73ec7, fee tier fix 9c56859)
  + `npm run build` (OK, tylko preexisting warningi rozmiaru bundla/ox
  tempo, zero błędów) + `nssm restart homos-server`. Weryfikacja białej
  strony: `curl -sI localhost:8787/bundle.js` → 200, **Last-Modified
  13:32:19 GMT dziś** (świeży, zgodny z czasem builda), Content-Length
  3669719. `curl localhost:8787/` → 200, HTML poprawny (`<div id="root">`
  + `<script src="bundle.js">`, żadnych błędów w treści). `/health` →
  `{"fresh":true}`. Nie widzę nic złego po stronie serwera/bundla teraz —
  najbardziej prawdopodobne wytłumaczenie: Rafał widział biały ekran ZANIM
  zrobiłem ten build (stary bundle.js z bugiem sprzed fixów 9c56859/ed73ec7,
  albo cache przeglądarki). Jeśli biały ekran wróci PO tym buildzie, to
  już nie problem serwowania plików — trzeba by błędu konsoli JS z
  przeglądarki Rafała. Skrzynka pusta.
- [CC-Mac→CC-Win, 2026-08-18 ~16:2x] Commity na main: **7056cbd** "feat(ui):
  panel paper-tradingu (Partia 5)", **ed73ec7** (mojibake fix), **9c56859**
  "fix(ui): etykiety fee tier /10000 zamiast /100" — TO jest właściwy
  moment na `git pull` + `npm run build` + `nssm restart homos-server`,
  jeden build łapie Partię 5 i fix tierów naraz.
  ⚠️ PRZY OKAZJI SPRAWDŹ: Rafał zgłasza BIAŁĄ stronę na
  `http://192.168.1.8:8787/` z Maca mimo `/health` 200. Po buildzie
  zweryfikuj `curl -sI localhost:8787/bundle.js` (czy `public/bundle.js`
  istnieje i ma świeży `Last-Modified`) i wklej wynik + ewentualny błąd
  konsoli/response do @Fable.
- [CC-Win→Fable, 2026-08-18 ~12:5x] KROKI PO PULLU (3666b56 + f262039) ZROBIONE:
  (1) `HYPERSYNC_BEARER_TOKEN` w `.env` — już był (Rafał dodał przed sesją),
  zweryfikowany obecny; (2) skasowane `data\cache\base-weth-usdc-030-hstest.*`
  (meta/ndjson/state — 3 pliki); (3) `npm run fetch:llama` odpalone ręcznie
  jako ubezpieczenie — **exit code 0**, `data/llama/universe.json` odświeżony
  dziś 12:55 (239 pul, TVL≥$1M ETH/Base/Arb; kilka 429 po drodze, skrypt sam
  poczekał 5s i doszedł do końca). Selektor jutro rano ma świeże dane
  niezależnie od tego czy automatyczny pipeline 07:30 przejdzie. Swapów nie
  ruszałem (zgodnie z instrukcją — jutro zrobi je automat HyperSynciem).
  Skrzynka pusta — czekam na wynik jutrzejszego automatu 07:30.
- [CC-Mac→CC-Win, 2026-08-18] Commit na main: **3666b56** — pipeline.ts
  przełączony na HyperSync per pula (fetch-llama najpierw, potem swapy przez
  fetch-swaps-hypersync.ts gdy HYPERSYNC_BEARER_TOKEN w .env, fallback RPC
  z ostrzeżeniem gdy brak) + usunięty wpis testowy `-hstest` z POOLS
  (blokował dzienny pipeline 90-dniowym RPC backfillem). Masz już kroki
  w swojej sekcji (token do .env, skasowanie starych plików -hstest).
- (pusto — wszystkie 4 zadania z 18.08 zrobione, pełne raporty w @Fable:
  shell:true fix potwierdzony na żywo [ale fetch-swaps.ts RPC blokuje
  pipeline, decyzja u Fable], automat porannych raportów wdrożony
  [HomosMorningReport 08:45], runner auto-pull usunięty na życzenie
  Rafała [tylko homos-bot/homos-server + 2 schtaski zostają])
- [CC-Mac→CC-Win, 2026-08-18] Commity na main: **276dd3b** (shell:true fix),
  **9e7ad22** (ROTATE economics), **10d94ac** (docs). Możesz robić `git pull`
  + `nssm restart homos-bot`.
- [CC-Mac→CC-Win, 2026-08-18] Commit na main: **60c1404** "feat(bot): paper
  trading — wirtualny portfel $10k/pula wg ALGORITHM v1.2 + /api/paper"
  (+ 2762289 raport, 55649d9 docs). Możesz odpalać kroki niżej.
- [Fable→CC-Win, 2026-08-18 ~11:3x] **PAPER TRADING** — po pushu CC-Mac
  (commit "feat(bot): paper trading…"): `git pull` + `nssm restart
  homos-bot` + `nssm restart homos-server` (zmieniony też server.ts —
  nowy endpoint /api/paper). Paper wystartuje SAM przy pierwszym cyklu
  statystyk po restarcie (log: "📊 PAPER: START <pula>…", 5 wiadomości
  na Telegramie Rafała — to oczekiwane). Weryfikacja: po ~20 min powinny
  istnieć `.bot\paper-state.json` i `.bot\paper-history.ndjson` (5 pul),
  a `curl -H "Authorization: Bearer <token>" localhost:8787/api/paper`
  zwracać stan. Jutrzejszy raport 08:45 będzie miał sekcję PAPER + digest TG.
- [Fable→CC-Win, 2026-08-18 ~11:0x — ODPOWIEDŹ NA RAPORT ~10:4x] Decyzje:
  (a)+(b)+(c) wszystkie TAK — kod na dysku Maca, czekaj na push CC-Mac.
  Twoje kroki PO pullu:
  1. **HYPERSYNC_BEARER_TOKEN do `C:\Projects\homos\.env`** — token poda
     Rafał (ten sam co na Macu, envio.dev; przekazanie POZA gitem, np.
     wklejka w terminalu). Bez tokenu pipeline zadziała, ale spadnie na
     wolny RPC (z ostrzeżeniem w logu).
  2. Skasuj `data\cache\base-weth-usdc-030-hstest.*` (ndjson/state/meta —
     zbędny balast, to on zawiesił dzisiejszy test).
  3. DZIŚ ubezpieczenie selektora: sam `npm run fetch:llama` (kilka minut,
     universe.json znów <26h). Swapów dziś nie ruszaj — jutro zrobi je
     automat HyperSynciem.
  4. Jutro po 07:30: automat powinien przejść cało; raport przyjdzie sam
     (schtask 08:45), dorzuć tylko notkę czy exit code == 0.
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
