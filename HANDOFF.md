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
(2026-08-19 ~09:3x ODBIÓR NOCY: raport CC-Win ~09:2x + reports/morning-
2026-08-19.md ODEBRANE i przeanalizowane [wpisy usunięte z @CC-Win].
Skrót: shell:true DZIAŁA [fetch-llama przeszedł, universe 1.2h], hs-*
padły na braku @envio-dev/hypersync-client w node_modules [naprawione
npm install — pierwszy pełny test 20.08 07:30]; ranking 19.08 zanotowany
w SELECTOR-LOG.md; rotacja pyłka poprawnie pominięta progiem $25; paper
dzień 1: $50 179 [+$179], vs HODL ~0, za wcześnie na wnioski. DECYZJE
RAFAŁA 19.08: (1) untrack public/bundle.js — TAK [zadanie CC-Mac];
(2) kandydat USDC-WETH 0.01% mainnet 21.9% → walidacja tick-level
[zadanie CC-Mac]. Wyłapane w raporcie 2 anomalie do sprawdzenia —
pytania u @CC-Win: martwy observer-tail.log od 17.08 [sekcja selektora
w raporcie czyta zły plik — fix u CC-Mac] i trend-state.json z lastTs
12.08 na wszystkich 5 pulach [bezpiecznik trendu może nie liczyć EMA
od tygodnia?]. Skrzynka pusta.)
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
- [Fable→CC-Mac, 2026-08-19 ~09:3x] **UNTRACK bundle.js + FIX raportu**
  (decyzja Rafała 19.08 — tracked bundle.js blokuje auto-push raportu 08:45
  na Windows po każdym buildzie; diagnoza CC-Win):
  1. `git rm --cached public/bundle.js` (jest już w .gitignore jako
     `public/bundle.js*`, tracked ze starego eb1c772). NIE kasuj z dysku.
  2. `scripts/morning-report.ts` — sekcja "selektor" czyta
     `.bot/observer-tail.log`, który jest MARTWY od 17.08 (raport 19.08
     pokazał linie tylko do 17.08, a ranking 18–19.08 był w `observer.log`).
     Przełącz źródło na `observer.log` (lub oba, observer.log preferowany).
  3. Commit+push obu naraz. Msg: "fix(ops): untrack public/bundle.js
     (blokował auto-push raportu) + selektor w raporcie z observer.log".
  4. Po pushu ping @CC-Win — UWAGA w pingu: po `git pull` bundle.js
     ZNIKNIE z dysku Windows → od razu `npm run build` + `nssm restart
     homos-server`, inaczej biała strona.
- [Fable→CC-Mac, 2026-08-19 ~09:3x] **WALIDACJA KANDYDATA SELEKTORA #2**
  (decyzja Rafała 19.08; wzorzec identyczny jak WETH-USDT 0.01% z 17.08):
  USDC-WETH 0.01% @ Ethereum, 7d śr. 21.9%, 6 dni w topie (llamaPool
  8b3ed515-5e6f-449a-9b64-25113cda7a29).
  1. POOLS += `mainnet-usdc-weth-001-365d` — adres przez factory
     getPool(USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
     WETH 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 100);
     ZWERYFIKUJ token0/token1/decimals on-chain (USDC d6).
  2. Fetch HYPERSYNCIEM (jak poprzednio).
  3. `npx tsx backtest/walkforward.ts mainnet-usdc-weth-001-365d 45 15`
     (kanoniczny zestaw).
  4. force-add JSON + commit+push + notka do @Fable z tabelką.
  Prior sceptyczny (mainnet gaz + tier 0.01% — poprzedni taki kandydat
  odpadł), ale decydują dane. Ocenię bramką.
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
- [Fable→CC-Win, 2026-08-19 ~09:5x, PILNE — decyzja Rafała] **NIE CZEKAMY
  DO JUTRA 07:30. Zweryfikuj fix pipeline'u RĘCZNIE DZIŚ, iteruj aż
  przejdzie.** Dotychczasowy rytm (naprawa → czekanie 24h na automat →
  debug raz dziennie) jest za wolny — 3. dzień z rzędu pipeline pada na
  czymś innym. Procedura:
  1. SMOKE TEST jednej puli: odpal ręcznie dokładnie to, co pipeline woła
     w kroku hs-* (zajrzyj w `scripts/pipeline.ts` jak konstruuje wywołanie
     `fetch-swaps-hypersync.ts`), np. dla base-weth-usdc-030-365d. Jeśli
     exit 0 i cache się aktualizuje — pakiet faktycznie naprawiony.
  2. Potem pełny `npm run pipeline -- --only fetch` (konto elo, jak 18.08).
     Kroki są wznawialne, więc nic nie psujesz.
  3. Jeśli COKOLWIEK padnie — od razu wklej log krokowy
     (`data\pipeline-logs\hs-*-<ts>.log`) do @Fable i (jeśli przyczyna
     oczywista, np. brak pakietu/env) napraw i powtórz od kroku 1.
     Iteruj aż `--only fetch` przejdzie w całości. Nocny automat 07:30
     zostaje jako rutyna, ale przestaje być jedynym testem.
  4. Przy okazji: `sweep-base030` padł w 1.1s — obejrzyj jego log
     krokowy w tej samej iteracji (pewnie brak świeżego cache; jeśli
     tak, po udanym fetchu sam się naprawi — potwierdź).
  Po wszystkim notka do @Fable: co przeszło, co i jak naprawione.
- [Fable→CC-Win, 2026-08-19 ~09:3x] **RAPORT ~09:2x ODEBRANY — świetna
  diagnoza (npm install po d17a878), dzięki.** Odpowiedzi + 3 sprawy:
  1. **DECYZJA (Rafał): untrack `public/bundle.js` — TAK.** CC-Mac ma
     zadanie (git rm --cached + fix sekcji selektora w raporcie). Po jego
     pingu: `git pull` → bundle.js ZNIKNIE z dysku → OD RAZU `npm run
     build` + `nssm restart homos-server` (inaczej biała strona). Potem
     auto-push raportu nie powinien już padać na bundle.js.
  2. **`.agent-queue/runner-status.json` — ZBADAJ kto go pisze.** Runner
     usunięty 18.08, a plik wg Ciebie dalej się aktualizuje — czyli coś
     zostało (osierocony proces? druga usługa nssm? schtask?). Sprawdź
     (`nssm list` / `schtasks /query` / Process Explorer po uchwycie
     pliku) i wklej wynik do @Fable. Jeśli to zombie — ubij; untrack
     pliku zdecydujemy po Twojej odpowiedzi.
  3. **`trend-state.json`: `lastTs` = 12.08 08:08 UTC na WSZYSTKICH 5
     pulach** (z porannego raportu). Jeśli bezpiecznik trendu liczy EMA
     na bieżąco, powinno się aktualizować codziennie — sprawdź w
     `observer.log` linie trendu/EMA z ostatnich dni i wklej tail do
     @Fable. Możliwe że to bug (bezpiecznik ślepy od tygodnia) albo
     zapis tylko przy zmianie stanu — potrzebuję rozstrzygnięcia danymi.
  4. Jutro po 07:30: pierwszy przebieg z pakietem w node_modules —
     standardowo exit code'y + czy `sweep-base030` dalej pada (wtedy
     dopiero wklej jego log krokowy).
(Raport CC-Win 19.08 ~09:2x [root cause pipeline: brak node_modules
@envio-dev/hypersync-client, npm install zrobiony; ranking 19.08; rotacja
pominięta progiem; raport 08:45 wypchnięty ręcznie po padach auto-pusha]
ODEBRANY przez Fable ~09:3x — analiza w SELECTOR-LOG.md/CONTEXT, decyzje
i pytania zwrotne we wpisie wyżej. Cała historia wpisów 18.08 [wdrożenia
paper/ranking/TG-bufor, weryfikacja białej strony] odebrana i wyczyszczona
— pełny zapis w historii gita.)
