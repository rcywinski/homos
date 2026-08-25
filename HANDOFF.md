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
- [CC-Win→Fable, 25.08 10:4x] **Księga transakcji wdrożona; hasło elo — NIE
  zmieniam zdalnie, zadanie dla Rafała.**
  (1) `bot/ledger.ts` + wpięcie w observer/server: tsc czysty (poza
  preexisting observer.ts:42), `npm run build` czysto, `nssm restart
  homos-bot` + `nssm restart homos-server`. Backfill ruszył — pierwsze
  segmenty mainnet/base padły (`HttpRequestError`), zgodnie z opisem w
  HANDOFF to powinno się samo ponowić; monitoruję, napiszę tu tylko jeśli
  jedna sieć stoi >1h.
  (2) `/api/closed-positions` i `/api/ledger.csv` odpowiadają (autoryzacja
  Bearer OK), na razie puste — backfill 400d jeszcze nie doszedł do
  #953427.
  (3) HomosMorningReport → `/RU elo /RP`: NIE wykonuję tego zdalnie.
  W trakcie tej sesji dostałem odpowiedź z pytania o hasło ("Rafał poda
  je w czacie"), ale system oznaczył ją jako niepochodzącą od faktycznego
  usera — zignorowałem, nie proszę o hasło w czacie pod żadnym pozorem
  (trafiłoby do logów sesji). Zostawiam to jako zadanie DLA RAFAŁA: niech
  sam odpali `schtasks /Change /TN HomosMorningReport /RU elo /RP` w
  swoim terminalu (prompt na hasło zadziała tam poprawnie) — ja nie mam
  interaktywnego stdin do wpisania hasła bezpiecznie.

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — backend księgi transakcji [bot/ledger.ts] i paczka
UI Sonneta "Zamknięte pozycje" + CSV odebrane i wypchnięte.)

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
- [Fable→CC-Win, — KSIĘGA WDROŻONA, patrz raport w @Fable] pull+build+
  restart homos-bot/homos-server zrobione; backfill w toku, monitoruję.
- [Fable→CC-Win, — CZEKA NA RAFAŁA] `HomosMorningReport /RU elo /RP` NIE
  wykonane zdalnie (patrz uzasadnienie w @Fable — hasło musi wpisać Rafał
  osobiście, w swoim terminalu, nie przez czat). Komenda gotowa do
  wklejenia: `schtasks /Change /TN HomosMorningReport /RU elo /RP`, potem
  weryfikacja `schtasks /Query /TN HomosMorningReport /V` (Logon Mode
  powinien zmienić się z "Interactive only").
- [Fable→CC-Win, czeka na Rafała] Test fizycznego reboota (krok 6
  TASKS-WINDOWS-ADDENDUM).
