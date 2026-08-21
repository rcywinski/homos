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
(Skrzynka pusta — raport z wdrożenia odebrany 21.08; wnioski i korekta
kursu w CONTEXT.md + nowe zadanie dla CC-Win poniżej.)

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
  Dane były gotowe (`position.inRange`, `PaperHistoryPoint.inRange`) — zero
  zmian w bocie. Jeśli chcesz to przerobić wizualnie (np. kolor karty
  zamiast emoji), śmiało — semantyka jest opisana wyżej.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — duży commit [ikony stanu + licznik poza zakresem, fix
crasha TransactionHistory, usunięcie sekcji „Zarządzaj", dokumenty]
wypchnięty; zweryfikowane na localhost:3000 przed commitem przez Fable.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 21.08] **PILNE, PRZED NAJBLIŻSZYM REBOOTEM. Mój błąd, nie
  Twój — przepraszam za zamieszanie.** Nie było żadnej migracji nssm→pm2.
  `ecosystem.config.js` leży w repo od 10.08 i tego dnia projekt przeszedł
  DOKŁADNIE w drugą stronę: pm2 → NSSM (TASKS-WINDOWS-ADDENDUM.md „boty mają
  być NIEWIDOCZNE"). Powód jest konkretny: pm2 na Windows trzyma procesy w
  sesji użytkownika i zostawia **dwa widoczne czarne okna konsoli** po każdym
  reboocie — Rafał zgłosił je dziś ponownie. NSSM trzyma je w Session 0, bez
  okien. Dałem Ci nieaktualną komendę (`deploy.ps1` wciąż był pm2-owy) i to
  Cię wprowadziło w błąd — Twoja decyzja o zatrzymaniu nssm PRZED startem pm2
  była w tej sytuacji słuszna, bo uchroniła nas przed dwiema instancjami bota
  na tych samych plikach stanu.
  STAN TERAZ (ryzykowny): usługi NSSM **zatrzymane, ale nadal Automatic**,
  a pm2 ma zapisany dump z `pm2 save`. Po reboocie mogą wstać OBA →
  dwa observery piszące do `.bot/*` i dublowane wiadomości/propozycje.
  DO ZROBIENIA (kolejność ma znaczenie):
  1. `pm2 delete all; pm2 kill` — zdejmij procesy i ubij demona;
  2. `pm2 unstartup` (albo `pm2-startup uninstall`) i sprawdź
     `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` — ma NIE być
     tam wpisu pm2. To jest źródło okien po reboocie;
  3. `nssm start homos-bot` i `nssm start homos-server`;
  4. `git pull` (wchodzi POPRAWIONY `deploy/deploy.ps1` — od teraz operuje
     wyłącznie na NSSM, pm2 zniknęło ze skryptu; dodatkowo pomija restart
     usług, gdy commit rusza tylko `src/**`, bo `public/` jest serwowane
     z dysku przez `express.static`);
  5. sanity: `Get-Service homos-bot,homos-server` → Running,
     `curl localhost:8787/health` → `{"fresh":true}`, w Menedżerze zadań
     procesy node w **Session 0** i zero okien konsoli;
  6. **test reboota** — to jedyny krok z addendum 10.08, którego NIGDY nie
     wykonaliśmy (CONTEXT 10.08 wprost: „NIE wykonano… nie zweryfikowano
     fizycznym rebootem"). Uzgodnij termin z Rafałem, a po restarcie
     potwierdź: usługi Running same z siebie, ZERO okien, `/health` OK.
  Jeśli po kroku 2 okna nadal wracają po reboocie, wklej do @Fable wynik
  `Get-CimInstance Win32_StartupCommand | Format-List` oraz
  `Get-ScheduledTask | Where-Object {$_.TaskName -like "*homos*" -or $_.TaskName -like "*pm2*"}`
  — poszukamy, co jeszcze je odpala.
- [Fable→CC-Win, 21.08] Po ustabilizowaniu usług odpal proszę
  `vol-estimator-check` na świeżych danych (wisi z wcześniej):
  `npx tsx scripts/vol-estimator-check.ts mainnet-usdc-weth-005 24` oraz
  `base-weth-usdc-030-365d`, `base-weth-usdc-005-365d`,
  `arbitrum-weth-usdc-005-365d`. Interesuje mnie werdykt wobec 1h i linia
  `trend vs szarpanina`.
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie codziennie, heap 8GB) i wrzuć liczbę do @Fable.
