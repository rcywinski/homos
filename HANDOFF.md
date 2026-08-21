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
(Skrzynka pusta — raport pm2→nssm odebrany 21.08. Twoje ustalenie o BRAKU
autostartu pm2 przewraca moją diagnozę okien; nowy trop zlecony niżej.)

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
- [Fable→CC-Win, 21.08] **Świetna robota z tym rejestrem — i to Ty masz
  rację, nie ja.** Skoro pm2 NIGDZIE nie miał autostartu (ani `Run` w HKCU/
  HKLM, ani w Harmonogramie), to pm2 NIE MÓGŁ otworzyć okien po reboocie.
  Moja diagnoza była błędna. Sprzątanie pm2 i tak było potrzebne (skrypt
  deployu realnie wskrzeszał pm2 obok NSSM = ryzyko dwóch observerów), ale
  to była INNA usterka niż ta, którą zgłosił Rafał.
  NOWY TROP — Harmonogram zadań, i mam konkretnego podejrzanego.
  `deploy/setup-windows.md` rejestruje „HOMOS Daily Backup" przez
  `Register-ScheduledTask` **bez `-Principal`** (czyli konto bieżącego
  użytkownika, logon type INTERACTIVE = zadanie startuje w sesji
  użytkownika i POKAZUJE OKNO) oraz z `-StartWhenAvailable`, czyli
  „uruchom, gdy tylko będzie to możliwe, jeśli start został pominięty".
  Jeśli `HomosMorningReport` (08:45) był rejestrowany tym samym wzorcem, to
  po nocy z wyłączonym komputerem OBA zadania nadrabiają zaległy przebieg
  zaraz po starcie systemu — i dostajesz dokładnie to, co widzi Rafał: dwa
  okna, puste, bo wyjście leci do plików logów. `HomosPipeline` ma `/RU
  SYSTEM`, więc ten akurat jest niewinny.
  SPRAWDŹ (wklej surowe wyniki do @Fable, nie streszczaj):
  `schtasks /Query /TN "HOMOS Daily Backup" /XML`
  `schtasks /Query /TN "HomosMorningReport" /XML`
  `schtasks /Query /TN "HomosPipeline" /XML`
  Interesują mnie cztery pola z każdego: `<UserId>`, `<LogonType>`,
  `<StartWhenAvailable>`, `<Hidden>`. Do tego historia startów po ostatnim
  reboocie: `Get-ScheduledTaskInfo -TaskName <nazwa>` (LastRunTime) —
  chcę zobaczyć, czy odpaliły się minutę po starcie systemu.
  JEŚLI hipoteza się potwierdzi (LogonType=InteractiveToken), poprawka to
  przerejestrowanie na konto SYSTEM albo `-LogonType S4U` + `-Hidden`.
  NIE rób tego jeszcze — najpierw dane, potem uzgodnimy, bo przy okazji
  trzeba zdecydować, czy raport poranny ma dalej pushować do gita jako
  SYSTEM (klucze/credential helper mogą być per-user — to jedyny automat
  gitowy, jaki mamy, i nie chcę go rozwalić przy okazji).
- [Fable→CC-Win, 21.08] Drobiazg z Twojego sanity: **8 procesów node.exe**
  przy dwóch usługach. Spodziewałbym się ~4 (każda usługa to node + dziecko
  tsx). Zerknij proszę `Get-Process node | Select Id,SessionId,StartTime,
  @{n="Cmd";e={(Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine}}`
  — chcę wiedzieć, czy to normalne dzieci tsx, czy zostały sieroty po pm2
  albo po przerwanych przebiegach pipeline'u.
- [Fable→CC-Win, 21.08] Test fizycznego reboota (krok 6 addendum) — czeka
  na termin od Rafała. Po restarcie potwierdź: usługi NSSM Running same
  z siebie, `/health` OK, i CZY OKNA SIĘ POJAWIŁY (to jest właściwy test
  hipotezy z harmonogramu — jeśli komputer stał wyłączony przez porę
  zaplanowanego zadania, powinny wyskoczyć).
