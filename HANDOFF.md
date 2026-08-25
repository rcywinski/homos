# HANDOFF.md — skrzynki między sesjami (protokół kooperacji)

## MAPA: 4 miejsca (kto jest kim)
| Sekcja | Co to jest | Gdzie żyje | Rola |
|---|---|---|---|
| @Fable | sesja analityczna (Cowork cloud) | chmura — ZAWSZE dostępna (iPhone) | analizy, algorytmy, kod core/bot, koordynacja |
| @CC-Mac | Claude Code w iTerm na Macu | Mac (musi być otwarty) | git commit/push, odpalanie skryptów |
| @CC-Win | Claude Code od botów windowsowych | Windows (24/7) | usługi NSSM, wdrożenia serwerowe, .env |
| @Sonnet | sesja UI (Claude Desktop, Cowork) | Mac (musi być otwarty) | warstwa wizualna src/components+hooks+styles |

> ZASADY: (1) KRÓTKIE przekazania ("zrobione X, odbierz Y") — pełny kontekst
> w CONTEXT.md/TASKS-*/RESEARCH-QUEUE. (2) Sesja NA STARCIE czyta swoją
> sekcję i USUWA odebrane wpisy. Format: `- [od→do, data] treść`.
> (3) HIGIENA (decyzja Rafała 19.08): wpisy ✅/odebrane KASUJEMY od razu —
> historia jest w gicie (każda zmiana HANDOFF to commit) i w CONTEXT.md;
> ten plik trzyma WYŁĄCZNIE żywe zadania i nieodebrane raporty.
> (4) Zmiany kodu na Windows tylko ręcznym `git pull` CC-Win po pingu;
> jedyny automat gitowy = push porannego raportu (schtask 08:45).

## @Fable (sesja analityczna)
(Skrzynka pusta — oba raporty CC-Win z 24.08 odebrane: fix llama
potwierdzony na żywo 272/272; druga paczka wdrożona, sanity zielone,
UI potwierdzone screenshotem Rafała. Uwaga homos-server vs homos-bot
wciągnięta do CONTEXT i do praktyki wpisów.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — paczka UI Sonneta (żywy próg fee + CSS modali) i docs
odebrane i wypchnięte.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 25.08 KOREKTA — poprzedni wpis o raporcie 07:30 był BŁĘDNY,
  nie wykonuj go w starej formie] Przesuwamy CAŁY łańcuch poranny ~2h
  wcześniej (decyzja Rafała; analiza: logi pipeline są w UTC, schtaski
  lokalnie — realnie pipeline 07:30–08:25, raport 08:45 miał tylko ~20 min
  zapasu). Trzy kroki, kolejność dowolna, ale wszystkie PRZED następną nocą:
  (1) `schtasks /Change /TN HomosPipeline /ST 05:30`
  (2) `schtasks /Change /TN HomosMorningReport /ST 07:30`
  (3) `git pull` + build/restart wg potrzeb: zmiana w `bot/selector.ts`
  (RUN_AFTER_HOUR 8→6 + twarda bramka: universe.json musi być Z DZISIAJ,
  inaczej selektor czeka na kolejny cykl zamiast znaczyć dzień) i
  `bot/server.ts` (kosmetyka komunikatu 503) → `nssm restart homos-bot`
  (selector) i `nssm restart homos-server` (komunikat).
  Docelowa oś (PL): 05:30 pipeline (koniec ~06:30) → ~06:00–06:15 selektor
  + Telegram → 07:30 raport+push (zapas ~50 min) → 08:00 Rafał ma komplet.
  Weryfikacja jutro rano: raport na GH ~07:30, Telegram ~06:1x, w raporcie
  universe.json świeży (~1h). UWAGA: okno backtestu rośnie — 25.08 backtest
  szedł już >63 min (raport 08:45 złapał go W TRAKCIE, brak PIPELINE KONIEC);
  jeśli przekroczy ~1h40 od startu pipeline'u, raport 07:30 znów będzie
  łapał niedokończony przebieg — pilnować.
- [Fable→CC-Win, 25.08] **Peak RSS + czas backtestu z dzisiejszej nocy**:
  raport 08:45 uciął przebieg w trakcie backtest-run. Wyciągnij z
  `data/pipeline-logs/backtest-run-*.log` (dzisiejszy) i z ogona
  pipeline.log: Peak RSS, czas trwania backtest-run, godzinę PIPELINE
  KONIEC — wrzuć liczby do @Fable. Przy okazji: linie selektora w
  observer.log mają lukę 19→25.08 (rotacja logu? restart?) — jednozdaniowa
  odpowiedź wystarczy.
- [Fable→CC-Win, 25.08] **AUTO-LEJEK: wdrożenie + BACKFILL wieczorem** (po
  pullu paczki od CC-Mac). Kroki: (1) `git pull` + build wg potrzeb;
  (2) restart `homos-bot` (selector 6:00) i `homos-server`;
  (3) WIECZOREM (poza oknem pipeline'u): `npx tsx scripts/candidate-funnel.ts
  --all` — przerobi całą kolejkę sekwencyjnie (~2–3h; na świeżych danych
  spodziewane ~4–5 pul: WETH-USDT 0.3% ETH, WETH-USDC 0.05% Base, WETH-USDT
  0.05% ETH, WBTC-USDT 0.05% ETH, WETH-CBBTC 0.3% Base). WERYFIKACJA PO
  DRODZE (ważne, adresy słownika TOKENS pisane z pamięci): w logu każdego
  kandydata linia "zmapowano: cand-… → 0x…" — sprawdź adres puli vs
  Uniswap/DefiLlama zanim uznasz werdykt; UNMAPPED = mapowanie odmówiło
  (opisz w @Fable, to nie błąd danych). Werdykty: `.bot/candidate-verdicts.
  json`; jutrzejszy raport 07:30 ma mieć sekcję "Kandydaci". Steady-state
  (1 kandydat/noc w pipeline) rusza sam od najbliższego przebiegu.
- [Fable→CC-Win, 22.08] Przy najbliższym PEŁNYM przebiegu pipeline'u zerknij
  na szczyt pamięci node'a w kroku `backtest-run` i wrzuć liczbę do @Fable
  (wczoraj przeszedł w 50 min na pełnych danych, ale okno rośnie codziennie).
- [Fable→CC-Win, wstrzymane] Okna konsoli z Harmonogramu — teraz, gdy raport
  poranny udowodnił, że wypycha się sam (67ee89f, 08:45:02), możemy to
  ruszyć. Ale najpierw chcę zobaczyć, czy jutrzejszy ranking się zmieni
  (test hipotezy o `fetch-llama-history`) — nie chcę mieszać dwóch zmian
  w automatach w jednym dniu.
- [Fable→CC-Win, czeka na Rafała] Test fizycznego reboota (krok 6
  TASKS-WINDOWS-ADDENDUM).
