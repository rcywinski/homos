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
(Skrzynka pusta — raport CC-Win z 25.08 odebrany w całości: schtaski
przesunięte ✓, pull+restarty ✓, diagnoza śmierci backtest-run 08:28
lokalnie = zmiana sesji/wybudzenie, luka observer.log to fałszywy alarm
[.bot-live-backup], backfill lejka świadomie zostawiony na wieczór.
Podsumowanie i follow-upy w CONTEXT + skrzynka CC-Win. Drugi raport
też odebrany: paczka UI Sonneta wdrożona — build czysty, restart
homos-server, /health fresh:true; UI potwierdzone przez Rafała.)

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 25.08 wieczór] **UX sekwencji transakcji w CloseModal
  (wniosek z 1. bojowego zamknięcia #953427 przez apkę — SUKCES, ale
  na ślepo):** przez ~30 s między podpisami przycisk pokazywał tylko
  "Przetwarzanie…". Do zrobienia w `CloseModal` (wzorzec jest już w
  `RebalanceSequenceModal` — lista kroków ze statusami): (1) zamień
  guzik na widoczny postęp "krok 1/2: decrease — wysłany, czekam na
  potwierdzenie" / "krok 2/2: collect…" + hash tx jako link do
  etherscan/basescan po wysłaniu; (2) notka przy kroku 2: "Rabby może
  pokazać 'simulation failed' — symuluje stan sprzed potwierdzenia
  kroku 1; jeśli krok 1 ma potwierdzenie (link wyżej), podpis jest
  bezpieczny" — użytkownik NIE może być uczony podpisywania mimo
  czerwonego ostrzeżenia bez wyjaśnienia; (3) failure w środku
  sekwencji = komunikat "środki bezpieczne, dokończ collect" (analogia
  do resume z RebalanceSequenceModal). Lekcja repo-wide z 20.08
  obowiązuje: po sendTransaction dalsze kroki degradować łagodnie.
  (4) BUG (screen Rafała): toast "Pozycja #953427 zamknięta w 100% ✓"
  został i wyrenderował się NA KARCIE INNEJ pozycji (#953465) po
  zniknięciu zamkniętej karty — komunikat `actions.message` nie jest
  związany z tokenId. Fix: message niesie tokenId i renderuje się
  tylko na pasującej karcie (albo w nagłówku sekcji, poza kartami) +
  auto-znikanie po ~10 s; przy okazji sprawdź, czy lista kart ma
  `key={tokenId}` (nie index — przesuwanie stanu między kartami przy
  zmianie listy to dokładnie ten objaw).
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — paczka UI Sonneta (żywy próg fee + CSS modali) i docs
odebrane i wypchnięte.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 25.08 po odbiorze raportu] **Follow-upy po diagnozie
  śmierci backtest-run (zmiana sesji 08:28):**
  (a) ROOT CAUSE POTWIERDZONY PRZEZ RAFAŁA: zalogował się 08:28 i ZAMKNĄŁ
  czarne puste okno konsoli — to było okno schtaska z liczącym się
  backtestem. Zadania MUSZĄ chodzić bez okna (decyzja Rafała: "powinno
  chodzić w tle"). `schtasks /Query /V` dla obu zadań i przestaw:
  - **HomosPipeline** → `/RU SYSTEM` (jak rejestracja 10.08 — bez okna,
    odporny na sesje; nie potrzebuje gita, SYSTEM wystarczy);
  - **HomosMorningReport** → "Run whether user is logged on or not" na
    koncie elo (background, bez okna; potrzebuje gita/credentiali konta,
    więc NIE SYSTEM). UWAGA: ten tryb wymaga zapisanego hasła konta —
    ostrzeżenie "puste hasło" przy /Change sugeruje, że konto elo może
    nie mieć hasła (dlatego stało na interactive). Jeśli tak: ustalcie z
    Rafałem hasło dla elo i zapisz w zadaniu (/RP), ALBO przenieś push
    raportu na deploy-key/credential dostępny dla SYSTEM. Wybór opisz
    w @Fable. Po zmianie: test `schtasks /Run` obu zadań (raport z
    REPORT_PUSH=0 najpierw) — bez okna, exit 0.
  (b) Zasilanie: potwierdź, że maszyna nie usypia w oknie 05:00–08:00
  (powercfg); jeśli usypia — "wake to run" na HomosPipeline.
  (c) Peak RSS: Twój pomysł z okresowym zapisem — zrób: zrzut peak RSS
  co ~60s do data/backtest-peak-rss.txt (nadpisywany), żeby liczba
  przeżywała śmierć procesu.
  (d) WIECZOREM, kolejność: NAJPIERW `npm run pipeline -- --only backtest`
  (odrobienie dzisiejszej luki — selection + dzienny sweep do serii na
  26.08; przy okazji pierwszy pełny pomiar Peak RSS), POTEM backfill
  lejka wg wpisu niżej.
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
