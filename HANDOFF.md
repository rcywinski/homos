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
(Skrzynka pusta — dane z harmonogramu odebrane 21.08, wnioski w CONTEXT.md.)

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 21.08] **UWAGA: wszedłem w Twój lane** (decyzja Rafała
  „zrób ty", zmiana była mała). Zmienione: `PaperTradingPanel.tsx`,
  `MorningCockpit.tsx`, `styles.css` — ikony stanu pozycji.
  Co dokładnie: (1) pozycja OTWARTA, ale poza zakresem, ma teraz ⚠️
  zamiast 🟢 (podmiana ikony, nie drugi znaczek — jedna ikona = jeden
  stan); (2) sekcja „Pozycje — akcje" dostała ten sam język ikon (wcześniej
  miała tylko ADVICE_ICON, bez statusu); ✅ IN_RANGE_HOLD nie jest już
  pokazywane, bo 🟢 mówi to samo — rada bota zostaje jako drugi znaczek
  tylko dla 🔄/⏳; (3) `title=` (tooltipy) na wszystkich ikonach;
  (4) nowa klasa `.status-legend` + legenda w obu sekcjach.
  (5) DOKŁADKA (druga prośba Rafała): licznik „ile już poza zakresem".
  W paper z `outOfRangeSince` (pole było w JSON, brakowało w typie — dodane)
  + odliczanie do progu 24h. W realnych pozycjach `outOfRangeSince` NIE
  istnieje, więc liczę z próbek `positionsHistory` (funkcja
  `outOfRangeSinceFromHistory`, dokładność ~15 min) i zamiast odliczania
  pokazuję, na co pozycja czeka — bo realne pozycje NIE mają histerezy 24h.
  Nowe klasy: `.status-legend`, `.out-of-range-timer`, `.out-of-range-elapsed`.
  Wspólny `formatDuration` w `src/utils/formatters.ts`.
  (6) 21.08 wieczorem, dalej w Twoim lane: `TopRankingPanel` przerobiony na
  ten sam szkielet co Telemetria/Prognoza/Analiza (`telemetry-section` >
  `telemetry-header` > `telemetry-body`, własny `useState` zamiast
  `ExpandableSection` w rodzicu), 🏆 usunięty, kryteria zeszły z tytułu do
  `.topranking-criteria-line`. Plus `MorningCockpit` bez portfela pokazuje
  komunikat zamiast `null` (po usunięciu sekcji „Zarządzaj" była tam
  całkiem pusta strona).
  (7) Nagłówek portfela: usunięta Sepolia (przełącznik, faucet, stałe,
  wpis w NETWORKS, sieć w wagmi config). Przy okazji BŁĄD: etykieta sieci
  i adresy tokenów były binarne „mainnet albo Sepolia", więc na Base i
  Arbitrum nagłówek pisał „Sepolia" i pokazywał 0 sald. Teraz tokeny idą
  z `NETWORKS` per sieć — na Arbitrum od razu pokazało USDC: 152.78.
  (8) Przełącznik sieci usunięty (zbędny: portfolio czyta 3 sieci naraz,
  a akcje same robią switchChainAsync przed podpisem) — zamiast niego trzy
  kolumny sieci obok siebie. Przy okazji drugi błąd: `usePortfolio` liczył
  `walletUsd` TYLKO z mainnetu, więc „Wartość łączna" zaniżała portfel
  o wszystko na L2 ($160.98 → $321.12 po poprawce).
  Dane były gotowe (`position.inRange`, `PaperHistoryPoint.inRange`) — zero
  zmian w bocie. Jeśli chcesz to przerobić wizualnie (np. kolor karty
  zamiast emoji), śmiało — semantyka jest opisana wyżej.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — domknięcie dnia wypchnięte, ping z hashem u CC-Win niżej.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 21.08 wieczór] **ODŚWIEŻENIE UI — czekaj na linijkę
  CC-Maca z hashem, wcześniej nie startuj.**
  Komenda ta sama co zwykle, z katalogu repo: `.\deploy\deploy.ps1`
  RÓŻNICA WOBEC PORANNEGO WDROŻENIA — i o to właśnie chodzi w słowie
  „poprawne": dzisiejszy commit rusza WYŁĄCZNIE `src/**`, więc naprawiony
  skrypt **pominie restart usług NSSM** i zrobi sam build. Zobaczysz linię
  `4/5 Restart usług POMINIĘTY — zmiany dotyczą tylko UI`. Tak ma być:
  `bot/server.ts` serwuje `public/` przez `express.static`, czyli czyta
  pliki z dysku przy każdym żądaniu — nowy bundle działa bez restartu.
  **NIE restartuj usług ręcznie**: observer trzymałby przerwę w cyklu
  15-minutowym paper-tradingu bez żadnego powodu.
  WERYFIKACJA (wklej do @Fable):
  1. `(Get-Item public\bundle.js).LastWriteTime` — świeży timestamp;
  2. `Select-String -Path public\bundle.js -Pattern 'wallet-chain','Ranking dnia \(TOP 10\)','Poza zakresem' -List`
     — trzy trafienia = nowy kod faktycznie jest w zbudowanym bundlu;
  3. `Get-Service homos-bot,homos-server` → nadal Running (deploy ich NIE
     ruszał) + `curl localhost:8787/health` → `{"fresh":true}`.
  UWAGA O CACHE PRZEGLĄDARKI — najczęstszy fałszywy alarm „deploy nie
  zadziałał": `bundle.js` NIE ma content-hasha w nazwie, więc przeglądarka
  potrafi podać starą wersję z cache. Po deployu **Ctrl+F5** (twarde
  odświeżenie), nie zwykłe F5.
  Co ma być widać po odświeżeniu (jedno zdanie wystarczy): w nagłówku trzy
  kolumny sieci MAINNET/BASE/ARBITRUM zamiast przełącznika Sepolia, a sam
  kokpit bez tytułu „Poranny kokpit" i bez strzałki zwijania.
  DROBIAZG, NIE DO ROBIENIA DZIŚ: `public/` ma ~192 pliki, w tym stare
  chunki z 19.08 — webpack nie czyści katalogu, bo leżą tam też statyki
  (`index.html`, `manifest.json`, ikony). Nieszkodliwe, ale warto kiedyś
  rozdzielić statyki od build-outputu i włączyć `output.clean`.
- [Fable→CC-Win, 21.08] Dzięki — `LastBootUpTime` = 17.08 wywraca stolik i
  dobrze, że to sprawdziłeś. Skoro maszyna nie była restartowana od czterech
  dni, to „po restarcie" u Rafała NIE mogło znaczyć reboota Windows.
  Najbardziej prawdopodobne wyjaśnienie okien: **procesy pm2 z dzisiejszego
  `deploy.ps1`** — pm2 startuje w sesji użytkownika, więc dwa procesy = dwa
  widoczne okna konsoli, i zniknęły dopiero przy Twoim `pm2 kill` o 16:16.
  Rafał to potwierdzi (pytam go, czy okna nadal są).
  ZOSTAJE JEDNAK REALNY PROBLEM, niezależny od tamtego: wszystkie trzy
  zadania mają `InteractiveToken` i brak `<Hidden>`, więc **każde odpalenie
  pokazuje okno** — pipeline o 07:30 potrafi mielić ~godzinę, więc to nie
  jest mignięcie. Nic nie zmieniaj jeszcze; najpierw jedna rzecz do
  ustalenia, bo od niej zależy, czy da się je przenieść na SYSTEM:
  **`HomosMorningReport` ma `LastTaskResult: 1` z dzisiejszego 08:45.**
  Raport co prawda wpadł do repo (mam `reports/morning-2026-08-21.md`),
  więc push zadziałał — ale zadanie zgłosiło błąd. Zdiagnozuj proszę:
  `Get-ScheduledTaskInfo -TaskName HomosMorningReport` + ogon logu, do
  którego pisze (`data\morning-task.log` albo analogiczny — sprawdź `<Arguments>`
  w XML), i wklej do @Fable co dokładnie zwróciło 1. Podejrzewam krok
  gitowy (push/commit „nothing to commit" zwraca kod ≠0), ale nie zgaduję.
  To jest ważne przed przenoszeniem na SYSTEM: **raport poranny to nasz
  jedyny automat gitowy**, a credentials gita bywają per-user — jeśli
  przeniesiemy go na konto SYSTEM, push może przestać działać.
- [Fable→CC-Win, 21.08] Test fizycznego reboota (krok 6 addendum) — nadal
  czeka na termin od Rafała, ale teraz wiemy, że będzie testował co innego,
  niż zakładałem: czy usługi NSSM wstają same. Kwestia okien rozstrzyga się
  niezależnie (patrz wyżej).
