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
(Wszystkie raporty CC-Win z 25.08 odebrane: księga wdrożona; automaty
w tle — hasło wpisał Rafał osobiście [słusznie odmówiona prośba o hasło
w czacie — wzorowo]; reboot-test zaliczony; bug backfillu RPC
zdiagnozowany → fix HyperSync poniżej, wpis u CC-Win.)
- [CC-Win→Fable, 25.08 11:xx] **HyperSync fix — RPC-błędy zniknęły, ALE
  0 zdarzeń dla #953427/#953465 to NIE bug w zapytaniu. Root cause:
  te pozycje są za stare dla backfill window.** Zdiagnozowane bezpośrednio
  na żywych danych (HyperSync + RPC, poza logami; skrypty testowe
  posprzątane, nic nie commitowane):
  (1) `#953427` (mainnet, manager `0xC36442…1FE88`) — jedyny Transfer
  tego tokenId w całej historii to MINT (0x0→watch) w bloku
  **22 117 148 = 2025-03-24**. To **519 dni** przed dziś (25.08.2026),
  a `BACKFILL_DAYS=400` (domyślne) daje okno startujące od bloku
  22 951 189 = **2025-07-19** — mint pozycji wypada ~4 miesiące PRZED
  oknem backfillu. Zgadza się z Twoim własnym opisem w CONTEXT.md:
  #953427/#953465 to "stare pozycje użytkownika" sprzed projektu, nie
  coś zmintowane w ostatnich dniach.
  (2) `ownerOf(953427)` na żywo = nadal `0xAa6Acd…52E1e` (watch address)
  — NFT NIE jest spalone. "Zamknięcie" 25.08 to tylko
  decreaseLiquidity(0%)+collect (empty pozycja, NFT zostaje) — to
  wynika z kodu apki, nie ledgera. Więc ten tokenId NIGDY nie wyemituje
  drugiego zdarzenia Transfer — jedyny ślad ownership to mint sprzed
  519 dni.
  (3) Konsekwencja architektoniczna: `updateLedger` odkrywa tokenIdy
  WYŁĄCZNIE przez zdarzenia Transfer w oknie backfillu (Faza A). Dla
  starych, nigdy-nie-przetransferowanych pozycji to okno NIGDY nie
  znajdzie tokenId, niezależnie jak długo poczeka — potrzebne jest
  jedno z: (a) wydłużenie `BACKFILL_DAYS` do >519 (i tak nie objąłoby
  przyszłych podobnych przypadków), (b) zasilenie `state.tokens` na
  starcie znanymi tokenIdami z istniejącego mechanizmu portfela (bot już
  gdzieś zna #953427/#953465 — kokpit je pokazuje), zamiast polegać
  wyłącznie na odkryciu przez Transfer. Rekomendacja (b) — bardziej
  odporne na przyszłość (nowe stare/importowane pozycje).
  ŚWIADOMIE NIE zmieniam kodu ledger.ts — to decyzja architektoniczna
  (jak seedować state.tokens), zostaje u Ciebie.
  (4) Do weryfikacji: czy backfill w ogóle POWINIEN widzieć #953427,
  czy plan zakładał tylko zdarzenia OD startu trackingu (wtedy 0 wyników
  dla starych pozycji jest poprawne, a problem jest tylko w oczekiwaniu
  z HANDOFF "ma pokazać #953427" — do korekty oczekiwań, nie kodu).


## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 25.08] **Commit fixu backfillu księgi**: `bot/ledger.ts`
  (backfill przez HyperSync zamiast RPC; RPC z własną rotacją tylko do
  końcówki) + `HANDOFF.md` + `CONTEXT.md` — commit "fix(bot): backfill
  księgi przez HyperSync (publiczne RPC tną getLogs)". Po pushu ping
  CC-Win.

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
