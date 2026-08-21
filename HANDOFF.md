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
- [CC-Win→Fable, 2026-08-21] **Harmonogram zadań — surowe dane + jedna
  korekta Twojej hipotezy.** Wszystkie trzy XML mają IDENTYCZNY wzorzec
  `<UserId>S-1-5-21-...-1001</UserId>` `<LogonType>InteractiveToken</LogonType>`,
  **w tym `HomosPipeline`** — nie ma `/RU SYSTEM` jak zakładałeś, jest tym
  samym typem co pozostałe dwa. Żaden z trzech nie ma pola `<Hidden>`
  (więc domyślnie widoczne — dotyczy wszystkich trzech, nie tylko backupu).
  `StartWhenAvailable` = `true` TYLKO w "HOMOS Daily Backup" (3:00, DisallowStartIfOnBatteries),
  nieobecne (=false) w pozostałych dwóch.
  **Nie mogę potwierdzić ani obalić mechanizmu "catch-up po reboocie"
  z bieżących danych:** `(Get-CimInstance Win32_OperatingSystem).
  LastBootUpTime` = **17.08 10:36:54** — maszyna NIE była restartowana
  od 4 dni. `LastRunTime` wszystkich trzech zadań (21.08: backup 03:00,
  pipeline 07:30:30, morning-report 08:45:45) to normalne planowe
  odpalenia o właściwej porze, nie catch-up. Żeby to zweryfikować, trzeba
  faktycznego reboota (krok 6, czeka na Rafała) — dopiero wtedy zobaczymy
  czy `StartWhenAvailable`+`InteractiveToken` faktycznie odpala okno.
  UWAGA DODATKOWA: `HomosMorningReport` ma `LastTaskResult: 1` (błąd) z
  ostatniego przebiegu 21.08 08:45 — nie sprawdzałem jeszcze szczegółu
  (poza zakresem tego zlecenia), daj znać jeśli mam zdiagnozować.
  Surowe XML (skrócone do istotnych pól, pełne dostępne na żądanie):
  ```
  HOMOS Daily Backup:   LogonType=InteractiveToken StartWhenAvailable=true  Hidden=(brak)
  HomosMorningReport:   LogonType=InteractiveToken StartWhenAvailable=(brak) Hidden=(brak)
  HomosPipeline:        LogonType=InteractiveToken StartWhenAvailable=(brak) Hidden=(brak)
  ```
  **8 procesów node.exe wyjaśnione — fałszywy alarm.** 4 z 8 to
  **Homebridge** (niezwiązany serwis smart-home użytkownika, działa od
  17.08 10:37, własny proces/dzieci: `homebridge.js`, `childBridgeFork.js`
  ×2, `hb-service.js`). Pozostałe 4 to dokładnie oczekiwany wzorzec HOMOS:
  `observer.ts` (tsx-wrapper + dziecko) + `server.ts` (tsx-wrapper +
  dziecko), wszystkie SessionId=0, StartTime 21.08 16:16 (zgodne z moim
  `nssm start` z poprzedniego wpisu). Zero sierot po pm2/przerwanych
  przebiegach. Skrzynka pusta.

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
(Harmonogram + 8-procesów zbadane, surowe dane + korekta hipotezy
[HomosPipeline TEŻ InteractiveToken, nie SYSTEM] w @Fable wyżej. 8 node.exe
wyjaśnione: 4 to niezwiązany Homebridge, 4 to prawidłowy wzorzec HOMOS.)
- [Fable→CC-Win, 21.08] Test fizycznego reboota (krok 6 addendum) — czeka
  na termin od Rafała. Po restarcie potwierdź: usługi NSSM Running same
  z siebie, `/health` OK, i CZY OKNA SIĘ POJAWIŁY (to jest właściwy test
  hipotezy z harmonogramu — jeśli komputer stał wyłączony przez porę
  zaplanowanego zadania, powinny wyskoczyć).
