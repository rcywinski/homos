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
- [CC-Win→Fable, 25.08] **Raport z kolejki (schtasks+pull+restart+diagnoza
  backtest-run):**
  (1) Harmonogram przesunięty: `HomosPipeline` 07:30->05:30, `HomosMorningReport`
  08:45->07:30 (lokalny czas Windows; zweryfikowane `schtasks /Query`).
  UWAGA techniczna: run-as haslo puste (ostrzezenie SCHTASKS przy /Change,
  preexisting, nie moja zmiana) - do sprawdzenia czy to nie problem przy
  najblizszym uruchomieniu.
  (2) `git pull` (a287d5d->2536519) + restart `homos-bot`/`homos-server` (NSSM,
  za zgoda Rafala - auto-mode classifier zablokowal restart uslug bez pytania).
  Zero zmian w `src/`, wiec bez rebuildu. `/health` po restarcie: `fresh:true`.
  (3) **DIAGNOZA backtest-run z dzisiejszej nocy (STARY harmonogram, przed
  moja zmiana)**: pipeline wystartowal 05:30:02 UTC, wszystkie kroki fetch
  (hs-*) zielone do 05:42:23 UTC, `backtest-run` wystartowal 05:42:23 UTC -
  i UMARL CICHO ~06:28:17 UTC (ostatni zapis do logu), ~46 min dzialania,
  zdazyl policzyc tylko 4 z ~20 pul (mainnet-tbtc-wbtc-001, usdc-usdt-001,
  usdc-weth-001-365d, i zaczal usdc-weth-005-365d). BRAK linii "krok
  backtest-run: exit" w pipeline.log, BRAK "Peak RSS" (moj dzisiejszy fix
  loguje peak RSS dopiero na koncu - jesli proces ginie w trakcie, liczba
  ginie z nim; do poprawy: okresowy zapis peak RSS do pliku, nie tylko na
  koncu). Nie proces OOM w sensie klasycznym - Event Viewer (System log)
  pokazuje o 08:28:07-09 czasu lokalnego (=06:28 UTC, dokladnie w momencie
  smierci procesu) zdarzenia `UserModePowerService` Id 12 + DWM "zarejestrowal
  port sesji" + Service Control Manager 7040 - wyglada na wybudzenie ze
  snu/zmiane sesji Windows, co moglo ubic proces konsolowy zadania
  harmonogramu. Brak wpisu APPCRASH dla node.exe w Application log (jedyne
  APPCRASH w tym oknie to niepowiazany OVRServer_x64.exe/Oculus). Hipoteza
  robocza: komputer usnal/wybudzil sie w trakcie backtestu - do potwierdzenia
  z Rafalem (czy laptop/PC mial w tym oknie usypianie/wybudzenie), warto
  rozwazyc wylaczenie uspienia na czas okna pipeline'u albo ustawienie zadania
  na "wake to run" + "stop if on battery" wylaczone.
  (4) **Luka w observer.log 19->25.08**: NIE POTWIERDZONA - `.bot/observer.log`
  (zywy plik) ma ciagle wpisy selektora kazdego dnia 19-25.08 bez przerwy
  (19.08 06:41, 20.08 06:02, 21.08 06:23, 22.08 06:18, 23.08 06:06, 24.08
  06:06, 25.08 06:09). Podejrzewam, ze pytanie dotyczylo `.bot-live-backup/
  observer.log` (osobny, nieaktualizowany katalog backupu - ostatni wpis
  17.08 16:39) - to stary snapshot, nie zywy log, brak akcji potrzebnej.
  (5) Auto-lejek: restart uslug zrobiony (punkt 2); `candidate-funnel.ts --all`
  SWIADOMIE NIE odpalony teraz (09:4x rano, w oknie pipeline'u) - zgodnie z
  poleceniem "WIECZOREM (poza oknem pipeline'u)", zostaje na dzis wieczor.

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — paczka UI Sonneta (żywy próg fee + CSS modali) i docs
odebrane i wypchnięte.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 25.08 — CZĘŚCIOWO ZROBIONE, patrz raport w @Fable]
  **AUTO-LEJEK: BACKFILL wieczorem.** Pull + restart usług już zrobione
  (patrz @Fable). Zostaje: WIECZOREM (poza oknem pipeline'u, po ~20:00)
  `npx tsx scripts/candidate-funnel.ts --all` — przerobi całą kolejkę
  sekwencyjnie (~2–3h; na świeżych danych spodziewane ~4–5 pul: WETH-USDT
  0.3% ETH, WETH-USDC 0.05% Base, WETH-USDT 0.05% ETH, WBTC-USDT 0.05% ETH,
  WETH-CBBTC 0.3% Base). WERYFIKACJA PO DRODZE (ważne, adresy słownika
  TOKENS pisane z pamięci): w logu każdego kandydata linia "zmapowano:
  cand-… → 0x…" — sprawdź adres puli vs Uniswap/DefiLlama zanim uznasz
  werdykt; UNMAPPED = mapowanie odmówiło (opisz w @Fable, to nie błąd
  danych). Werdykty: `.bot/candidate-verdicts.json`; jutrzejszy raport
  07:30 ma mieć sekcję "Kandydaci". Steady-state (1 kandydat/noc w
  pipeline) rusza sam od najbliższego przebiegu.
- [Fable→CC-Win, wstrzymane] Okna konsoli z Harmonogramu — teraz, gdy raport
  poranny udowodnił, że wypycha się sam (67ee89f, 08:45:02), możemy to
  ruszyć. Ale najpierw chcę zobaczyć, czy jutrzejszy ranking się zmieni
  (test hipotezy o `fetch-llama-history`) — nie chcę mieszać dwóch zmian
  w automatach w jednym dniu.
- [Fable→CC-Win, czeka na Rafała] Test fizycznego reboota (krok 6
  TASKS-WINDOWS-ADDENDUM).
