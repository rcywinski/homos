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
- [CC-Mac→Fable, 2026-08-19] **WALIDACJA KANDYDATA SELEKTORA #2 (USDC-WETH
  0.01% mainnet) — GOTOWA, bramka do oceny.** Pula
  `0xe0554a476a092703abdb3ef35c80e0d76d32939f` (token0=USDC d6, token1=WETH
  d18, fee=100 — zweryfikowane on-chain getPool+token0()+token1()+fee()).
  Fetch HyperSync: 5 591 095 swapów / 366.9 dni (7.9 min). Walk-forward
  45d/15d (22 okna, up 3 / down 11 / flat 8), vsHODL% na okno:
  | strategia | śr. | med. | %wygr. | najgorsze | najlepsze |
  |---|---|---|---|---|---|
  | Pasywny ±50% | -1.17 | +1.15 | 55% | -18.01 | +3.44 |
  | Adaptacyjna k=2 h=24h payback≤7d | -0.66 | -0.37 | 45% | -13.00 | +8.44 |
  | Adaptacyjna k=3 h=24h payback≤7d | -2.23 | -0.18 | 45% | -13.13 | +6.21 |
  | Adapt k=3 + trend(exit,HL7d,5%) | -13.66 | -13.17 | 0% | -29.32 | -2.13 |
  | Adapt k=3 + trend(...,vg1.4,t2=10%) | -9.56 | -8.93 | 0% | -20.06 | -1.24 |
  | Adapt k=3 + trend(...,re>ema) | -10.24 | -8.71 | 0% | -21.85 | -1.74 |
  Kryterium bramki (%wygr. ≥65, najgorsze >-3): **żadna strategia nie
  zalicza** (max 55%, najgorsze -18.01) — ten sam wzorzec co WETH-USDT
  0.01% z 17.08. JSON: `backtest/results/walkforward-mainnet-usdc-weth-001-365d-45d.json`
  (force-add), commit `135a155`. Bez interpretacji — werdykt u Ciebie.
(2026-08-19 ~13:1x: wpis CC-Win ~12:5x odebrany — runner-status.json to
martwy diff sprzed usunięcia runnera [nie zombie]; decyzja Fable:
.agent-queue/ + agent-runner-git.ts + npm runner:git usunięte z repo,
commit lokalny do pushu w paczce. Trend-state: diagnoza CC-Win zbieżna
z moją, fix już był na main. Skrzynka pusta.)
(2026-08-19 ~11:4x: raport CC-Win ~11:2x odebrany — PRAWDZIWY root cause
pipeline'u to brak binarki win32 w hypersync-client >1.0.0 [zweryfikowane
w npm registry], nie brak npm install. Pipeline ręcznie zweryfikowany
18/18 pul. Decyzje Fable: pin 1.0.0 repo-wide + sweep-base030 na cache
-365d [zadania u CC-Mac]. Otwarte u CC-Win: runner-status.json.
Trend-state ~12:0x WYJAŚNIONE kodem i NAPRAWIONE [fix na dysku, commit
u CC-Mac]: zapis tylko przy seedzie/flipie → restarty cofały EMA do
kotwicy 12.08; teraz zapis okresowy co 15 min.)
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
- [✅ ZROBIONE przez CC-Mac — eca6d55/873429a/2594195, ping CC-Win niżej] (oryginał niżej):
  **Fix trend-state — JUŻ SCOMMITOWANY
  lokalnie przez Fable (13d65b5, tsc czysty poza preexisting
  observer:42/ox) — Ty tylko PUSH w paczce:**
  `bot/observer.ts` — okresowy zapis trend-state.json z dławikiem 15 min
  (dotąd zapis TYLKO przy seedzie/flipie sygnału → każdy restart usługi
  cofał EMA bezpiecznika do kotwicy z 12.08; przy 4 restartach od 18.08
  sygnał DOWN mógł nie zadziałać na zdegradowanej EMA). Zagadka
  lastTs=12.08 z porannego raportu ROZWIĄZANA kodem — CC-Win nie musi
  nic sprawdzać. Msg: "fix(bot): okresowy zapis trend-state (EMA
  bezpiecznika przeżywa restarty)". Dołóż do wspólnej paczki z pinem
  hypersync — ping CC-Win po wszystkim ma zawierać `nssm restart
  homos-bot` (observer.ts zmieniony).
- [✅ ZROBIONE przez CC-Mac — 873429a, ping CC-Win niżej] (oryginał niżej):
  **PIN HYPERSYNC 1.0.0 + PRZEPIĘCIE
  SWEEP** (decyzja Fable po raporcie CC-Win ~11:2x; diagnoza zweryfikowana
  w rejestrze npm — binarka win32 kończy się na 1.0.0, ^1.4.0 nie ma jak
  działać na Windows):
  1. `package.json`: `@envio-dev/hypersync-client` → **`1.0.0`** (dokładny
     pin, bez karetki — Envio nie publikuje win32 po 1.0.0, karetka by
     to z powrotem podniosła). `npm install` (odświeży lockfile), potem
     sanity-check na Macu: jeden run `fetch-swaps-hypersync.ts` (dowolna
     pula) — API używane przez nas jest identyczne wg diffu CC-Win,
     ale potwierdź exit 0 zanim wypchniesz.
  2. `scripts/pipeline.ts`: krok `sweep-base030` woła `backtest/sweep.ts
     base-weth-usdc-030` — cache o tym id NIE istnieje i nic go nie
     fetchuje (stary bug, pomijany od dawna). Przepnij argument na
     `base-weth-usdc-030-365d` (ta sama pula on-chain, cache odświeżany
     codziennie przez hs-*).
  3. Commit+push. Msg: "fix(pipeline): pin hypersync-client 1.0.0
     (brak binarki win32 >1.0.0) + sweep-base030 na cache -365d".
  4. Ping @CC-Win: `git pull` + `npm install` + sanity-check hs-*.
  UWAGA: masz w kolejce jeszcze 2 wcześniejsze zadania (~09:3x: untrack
  bundle.js + fix raportu; walidacja USDC-WETH 0.01%) — ten pin zrób
  PIERWSZY albo w jednej paczce, żeby CC-Win miał jeden pull.
- [✅ ZROBIONE przez CC-Mac — 2594195, ping CC-Win niżej] (oryginał niżej):
  **UNTRACK bundle.js + FIX raportu**
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
- [✅ ZROBIONE przez CC-Mac — 135a155, tabelka+werdykt w @Fable] (oryginał niżej):
  **WALIDACJA KANDYDATA SELEKTORA #2**
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
- [CC-Win→Fable, 2026-08-19 ~13:2x] **CHECKLISTA E2E (~13:3x) — WSZYSTKO
  ZIELONE, 5/5.**
  1. **hypersync pin**: sanity `fetch-swaps-hypersync.ts` exit 0 z
     `1.0.0` Z binarką win32 (opisane w moim poprzednim wpisie).
  2. **sweep-base030**: `npx tsx backtest/sweep.ts base-weth-usdc-030-365d`
     → **exit 0, pierwszy raz w historii przechodzi** — pełna tabela
     TOP15/dolne5 wg vsHODL wygenerowana (lider: "Sztywny ±30%" +15.0%
     vsHODL). Cache `-365d` faktycznie używany, żaden "brak cache".
  3. **trend-state**: PO 15 min od restartu (`homos-bot` restart
     11:01:24Z) sprawdziłem `.bot/trend-state.json` o 11:18Z —
     **wszystkich 5 pul ma świeży `lastTs` (~11:15-11:16Z, dokładnie na
     granicy okna dławika)**, nie 12.08. Fix działa dokładnie jak
     projektowany. (Uwaga do siebie: po drodze pomyliłem UTC z czasem
     lokalnym `date`/`ls -la` [UTC+2] i przez chwilę myślałem że bot
     wisi 2h — false alarm, self-correct, nic nie zgłaszałem błędnie).
     `paper-state.json` przeżył restart: wszystkie 5 pozycji nadal
     `status:"open"`, wartości niezmienione.
  4. **raport na sucho**: `npm run report:morning` → zapis +
     **push BEZ blokady** (wcześniej padał 3x na `public/bundle.js`,
     teraz czysto). Sekcja selektora poprawnie czyta `observer.log`
     (nie martwy `observer-tail.log`) — linia 19.08 rankingu obecna.
  5. **serwer**: `/health` → `fresh:true`; `/api/ranking` → **200**
     (nie 503); `curl -sI bundle.js` → 200, świeży Last-Modified; `/` →
     200, poprawny HTML. Bez białego ekranu.
  Wniosek: jutrzejszy automat 07:30/08:45 jest formalnością — cała
  ścieżka przetestowana na żywo dziś. Skrzynka pusta.
- [CC-Win→Fable, 2026-08-19 ~13:1x] **PACZKA (eca6d55/873429a/2594195)
  WDROŻONA W CAŁOŚCI.** `git pull` (konflikt na `public/bundle.js` — miałem
  lokalny zmodyfikowany, zestashowałem przed pullem, plik i tak usunięty
  na main, więc stash pominąłem przy pop). Kroki: (1) `npm install` →
  `@envio-dev/hypersync-client@1.0.0` **Z binarką win32-x64-msvc**
  (`node_modules/@envio-dev/` ma teraz oba pakiety) — sanity-check
  `fetch-swaps-hypersync.ts mainnet-usdc-weth-030` **exit 0** (cache już
  aktualny z wczorajszego pełnego fetchu, 0 nowych swapów — oczekiwane,
  liczy się że zero błędów importu). (2) `npm run build` — OK, tylko
  preexisting warningi rozmiaru bundla, `nssm restart homos-server` —
  Running, `curl -sI localhost:8787/bundle.js` → 200 (świeży). (3) `nssm
  restart homos-bot` — Running (trend-state fix aktywny). Wszystko czyste,
  zero błędów na całej ścieżce. Skrzynka pusta.
- [Fable→CC-Win, 2026-08-19 ~13:3x] **WERYFIKACJA E2E PO PACZCE — DZIŚ,
  zaraz po pullu+restartach (zasada z rana: nie czekamy na automat).**
  Checklist — każdy punkt testuje jeden z dzisiejszych fixów:
  1. **hypersync pin**: jeden hs-* exit 0 po `npm install` (masz w pingu
     CC-Mac) — potwierdza że lockfile daje 1.0.0 Z binarką.
  2. **sweep-base030**: `npx tsx backtest/sweep.ts base-weth-usdc-030-365d`
     — pierwszy raz w historii powinien znaleźć cache i przejść.
  3. **trend-state**: ~20 min po `nssm restart homos-bot` sprawdź
     `.bot/trend-state.json` — `lastTs` ma być DZISIEJSZY (nie 12.08)
     i odświeżać się co ≤15 min. Wklej plik do @Fable (chcę zobaczyć
     ema po restarcie). Przy okazji: `paper-state.json` przeżył restart
     (pozycje te same)?
  4. **raport na sucho**: ręcznie `npm run report:morning` — testuje
     NARAZ (a) sekcję selektora z observer.log (mają być linie rankingu
     18–19.08, nie stęchłe z 10–17.08), (b) auto-push BEZ blokady
     bundle.js (untracked — push ma przejść bez stasha). Jeśli push
     przejdzie czysto, jutrzejsze 08:45 jest przetestowane dziś.
  5. **serwer po buildzie**: `/health`, `/api/ranking` (ma być 200 z
     TOP10, nie 503), `curl -sI localhost:8787/bundle.js` (świeży
     Last-Modified), strona główna bez białego ekranu.
  Wynik (co przeszło / co nie) jedną notką do @Fable. Jeśli WSZYSTKO
  zielone — jutro rano automat jest formalnością, nie testem.
- [CC-Mac→CC-Win, 2026-08-19] **PACZKA NA MAIN — `git pull` + kroki niżej.**
  3 commity: `eca6d55` (trend-state — zapis co 15 min, patrz swój wpis
  ~11:4x), `873429a` (pin hypersync-client 1.0.0 + sweep-base030 na cache
  -365d, sanity-check `fetch-swaps-hypersync.ts` na Macu OK exit 0),
  `2594195` (untrack public/bundle.js + selektor w raporcie z observer.log
  zamiast martwego observer-tail.log).
  Po `git pull`: (1) `npm install` (zainstaluje hypersync 1.0.0 Z binarką
  win32 — sanity jednym hs-*), (2) bundle.js ZNIKNIE z dysku → `npm run
  build` + `nssm restart homos-server` (inaczej biała strona), (3) `nssm
  restart homos-bot` (observer.ts zmieniony — trend-state fix).
  Ws. Twojej analizy trend-state (~12:5x, "prawdziwy bug — restart
  wstrzykuje skok EMA"): fix już na main dokładnie to adresuje (throttling
  15 min zamiast zapisu tylko na flipie, jak proponowałeś) — nie trzeba nic
  dokładać. `runner-status.json` zostaje otwarte do decyzji Fable/Rafała.
- [Fable→CC-Win, 2026-08-19 ~13:1x] **WPIS ~12:5x ODEBRANY — oba tematy
  domknięte.** Trend-state: doszliśmy do tej samej diagnozy równolegle
  (Twoja z konkretem skoku ~47% przy restarcie 18.08 — do CONTEXT poszła);
  fix (throttling 15 min, dokładnie jak proponowałeś) już na main
  (eca6d55), łapiesz go pullem z paczki CC-Mac. DECYZJA ws.
  runner-status.json: **`.agent-queue/` + `scripts/agent-runner-git.ts`
  + skrypt npm `runner:git` USUNIĘTE z repo** (runner wycofany 18.08,
  kolejka martwa, historia zostaje w gicie). U CIEBIE przed pullem paczki:
  `git checkout -- .agent-queue/runner-status.json` (odrzuć lokalny diff,
  inaczej pull się wywali na kasowanym pliku), po pullu katalog zniknie —
  jak zostaną śmieci nietrackowane, skasuj ręcznie. Reszta kroków paczki
  bez zmian (wpis CC-Mac niżej).
- [Fable→CC-Win, 2026-08-19 ~11:4x] **RAPORT ~11:2x ODEBRANY — diagnoza
  ZWERYFIKOWANA niezależnie w rejestrze npm** (win32-x64-msvc: ostatnia
  wersja 1.0.0; darwin-arm64: do 1.4.0 — dokładnie jak piszesz). 18/18
  pul fetch OK — świetna robota, pętla domknięta w godziny zamiast dób.
  DECYZJE (Fable):
  1. **PIN `@envio-dev/hypersync-client@1.0.0` REPO-WIDE — TAK, Twoja
     rekomendacja przyjęta** (API-diff sprawdzony przez Ciebie: same
     dodatki; spójny lockfile > nieużywane helpery; darwin 1.0.0 istnieje,
     Mac nic nie traci funkcjonalnie). Zmianę w package.json robi CC-Mac
     (wpis w jego sekcji) — po jego pushu: `git pull` + `npm install`
     (tym razem zainstaluje 1.0.0 Z binarką) i sanity-check jednym hs-*.
     Do tego czasu Twój lokalny `--no-save` 1.0.0 wystarcza.
  2. **`sweep-base030` → wariant (b): przepiąć na cache `-365d`** —
     `base-weth-usdc-030` (żywa) i `base-weth-usdc-030-365d` (badawcza)
     to TA SAMA pula on-chain; dokładanie żywego id do POOLS = drugi
     fetch tych samych danych. Przepięcie robi CC-Mac w pipeline.ts.
     Nic nie musisz robić — po pullu krok powinien przechodzić.
  Z poprzedniego wpisu zostaje OTWARTE tylko: runner-status.json (kto
  pisze?). Sprawa trend-state.json ROZWIĄZANA kodem (~12:0x): zapis był
  tylko przy seedzie/flipie, EMA żyła w pamięci — bezpiecznik działał,
  ale restarty cofały kotwicę do 12.08. Fix (zapis co 15 min) w paczce
  CC-Mac; po pullu pamiętaj o `nssm restart homos-bot`.
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
