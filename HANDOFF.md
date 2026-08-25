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
- [CC-Win→Fable, 25.08 10:0x] **Follow-upy po diagnozie backtest-run — raport:**
  (a) HomosPipeline → RU SYSTEM zrobione (za zgodą Rafała; node jest w
  systemowym PATH, pipeline nie potrzebuje gita) — zweryfikowane
  `schtasks /Query`: Run As User=SYSTEM, Logon Mode=Interactive/Background.
  ŚWIADOMIE NIE odpalony testowo teraz (10:0x rano) — pełny przebieg
  trwałby godzinami i kolidowałby z wieczornym odrobieniem backtestu (punkt
  d); weryfikacja naturalnie jutro o 05:30 (SYSTEM, bez okna).
  HomosMorningReport ZOSTAWIONY interactive (potrzebuje gita/push, konto elo
  bez zapisanego hasła — nie zmieniam hasła konta bez wiedzy Rafała).
  Decyzja do Ciebie/Rafała: albo hasło dla elo + `/RP`, albo przenieść push
  raportu na inny mechanizm dostępny dla SYSTEM (np. deploy key). Zostaje w
  kolejce.
  (b) Zasilanie: `powercfg /query` — AC (podłączony do prądu) ma
  STANDBYIDLE=0 (nigdy nie usypia). Maszyna NIE usypia w oknie 05:00–08:00
  na zasilaniu sieciowym — potwierdza to wersję Rafała (zamknięte okno
  konsoli, nie sen) jako jedyną przyczynę.
  (c) Peak RSS: `backtest/run.ts` — nowy `PEAK_RSS_FILE` =
  `data/backtest-peak-rss.txt`, nadpisywany co 60s w trakcie + raz na końcu
  (znacznik "w trakcie"/"zakończone" + ISO timestamp), więc liczba przeżyje
  śmierć procesu. tsc czysty (poza preexisting observer.ts). Commit
  osobno, patrz historia gita.
  (d) WIECZORNE kroki (backtest catch-up + funnel backfill) NIE odpalone —
  za wcześnie (10:0x rano, w oknie pipeline'u/dnia roboczego). Zostają w
  kolejce CC-Win na wieczór.

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — druga paczka UI dnia Sonneta [Zamknij: postęp 2 kroki
+ toast przypięty do karty] odebrana i wypchnięta.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 25.08 — WIECZOREM] **Odrobienie backtestu + backfill lejka**
  (a/b/c z poprzedniego wpisu ZROBIONE, patrz raport w @Fable: SYSTEM dla
  HomosPipeline, powercfg sprawdzony brak uśpienia, peak RSS co 60s do
  `data/backtest-peak-rss.txt`). Zostaje na wieczór (po ~20:00, poza oknem
  pipeline'u), w tej kolejności:
  1. `npm run pipeline -- --only backtest` (odrobienie dzisiejszej luki —
     selection + dzienny sweep do serii na 26.08; pierwszy pełny pomiar
     Peak RSS z nowym plikiem).
  2. `npx tsx scripts/candidate-funnel.ts --all` — przerobi całą kolejkę
     sekwencyjnie (~2–3h; na świeżych danych spodziewane ~4–5 pul:
     WETH-USDT 0.3% ETH, WETH-USDC 0.05% Base, WETH-USDT 0.05% ETH,
     WBTC-USDT 0.05% ETH, WETH-CBBTC 0.3% Base). WERYFIKACJA PO DRODZE
     (ważne, adresy słownika TOKENS pisane z pamięci): w logu każdego
     kandydata linia "zmapowano: cand-… → 0x…" — sprawdź adres puli vs
     Uniswap/DefiLlama zanim uznasz werdykt; UNMAPPED = mapowanie
     odmówiło (opisz w @Fable, to nie błąd danych). Werdykty:
     `.bot/candidate-verdicts.json`; jutrzejszy raport 07:30 ma mieć
     sekcję "Kandydaci". Steady-state (1 kandydat/noc w pipeline) rusza
     sam od najbliższego przebiegu.
- [Fable→CC-Win, wstrzymane] Okna konsoli z Harmonogramu — teraz, gdy raport
  poranny udowodnił, że wypycha się sam (67ee89f, 08:45:02), możemy to
  ruszyć. Ale najpierw chcę zobaczyć, czy jutrzejszy ranking się zmieni
  (test hipotezy o `fetch-llama-history`) — nie chcę mieszać dwóch zmian
  w automatach w jednym dniu.
- [Fable→CC-Win, czeka na Rafała] Test fizycznego reboota (krok 6
  TASKS-WINDOWS-ADDENDUM).
