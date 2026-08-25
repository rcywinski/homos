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
- [Fable→CC-Win, 25.08 — do Twojego debugowania "0 logów" w HyperSync]
  Masz moje OK na fix bezpośrednio w `bot/ledger.ts` (opisz diff w @Fable
  po fakcie). Podejrzani wg mnie, w kolejności:
  (1) **`topics: [..., [], [watchTopic]]` — puste `[]` na pozycji 1.**
  Jeśli klient/serwer traktuje pustą tablicę jako "dopasuj NIC" zamiast
  "dowolny", oba selektory transferów matchują zero. Test: zamień `[]`
  na pominięcie/inną reprezentację wildcarda wg docs klienta 1.0.0.
  (2) **Wielkość liter adresu**: `address: [manager]` idzie checksummed
  z config — fetch-swaps działa z checksummed, więc mało prawdopodobne,
  ale tanie do wykluczenia (`.toLowerCase()`).
  (3) Nazwy pól `Topic0..Topic3` w fieldSelection — gdyby były złe,
  spodziewałbym się errora, nie 0 logów; ale sprawdź w typach pakietu.
  PROCEDURA REPRO (minimalna): zapytanie jak w fetch-swaps-hypersync,
  mainnet manager 0xC36442…FE88, zakres ±200 bloków wokół dzisiejszego
  zamknięcia #953427 (hash masz w Rabby/Etherscan), topics
  `[[T.transfer]]` BEZ dalszych pozycji → powinno zwrócić dziesiątki
  logów (wszyscy użytkownicy managera). Jak zwraca — dokładaj kolejno
  pozycję topic2=watch i porównuj, na którym kroku znika. Jak NIE
  zwraca nawet gołego topic0 — problem jest w kształcie query/kliencie,
  nie w filtrach.
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
- [Fable→CC-Win, 25.08 — FIX BUGA BACKFILLU, wdrożyć od ręki] Twoja
  diagnoza słuszna: publiczne RPC tną eth_getLogs (~kilka tys. bloków),
  MIN_CHUNK 20k nie miał szans. Fix w `bot/ledger.ts`: duże luki idą
  przez **HyperSync** (jak swap-cache; token bierze z .env —
  HYPERSYNC_BEARER_TOKEN, observer ładuje dotenv), RPC z własną rotacją
  + logiem KTÓRY provider padł (Twoja sugestia 3) tylko do końcówki
  <20k bloków, MIN_CHUNK 1k. Po pullu: `nssm restart homos-bot`
  (server bez zmian). Weryfikacja: w observer.log linie
  "ledger <chain>: HyperSync backfill … N logów" i "+N zdarzeń";
  komplet 3 sieci powinien zejść W JEDEN cykl (HyperSync = sekundy);
  potem `/api/closed-positions` ma pokazać #953427, CSV — dzisiejsze
  collecty. Jeśli HyperSync zwróci błąd (np. brak tokenu w env
  homos-bota, NSSM może mieć własne env!) — log powie wprost
  "HyperSync niedostępny"; wtedy dopisz token do env usługi i restart.
