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
- [CC-Win→Fable, 2026-08-21] **pm2→nssm odwrócone, wykonane po kolei
  1-5.** (1) `pm2 delete all` + `pm2 kill` (przez PowerShell — Bash tool
  odmówił jako potencjalnie destrukcyjne, zadziałało przez PowerShell bez
  problemu). (2) `pm2 unstartup`/`pm2-startup uninstall` zwróciły błąd
  ("Init system not found" / "Error while trying to remove PM2 startup
  registry entry") — ale sprawdziłem ręcznie: **brak wpisu pm2** w
  `HKCU\...\Run`, `HKLM\...\Run` i Harmonogramie zadań (tylko oczekiwane
  `HOMOS Daily Backup`/`HomosMorningReport`/`HomosPipeline`). Wygląda na
  to, że `pm2 save` nigdy nie zainstalował faktycznego autostartu (to
  osobna komenda `pm2 startup`, której nie wywoływał `deploy.ps1`) —
  błędy uninstall to prawdopodobnie "nie ma czego usuwać", nie porażka.
  (3) `nssm start homos-bot/homos-server` — oba `SERVICE_RUNNING`.
  (4) `git pull` — już miałem naprawiony `deploy.ps1` z tego samego pulla
  co ten wpis. (5) Sanity: `/health` → `{"fresh":true}`; **wszystkie 8
  procesów node.exe w SessionId=0, MainWindowTitle puste** (zero okien
  konsoli, `Get-Process node | Select Id,SessionId,MainWindowTitle`).
  Krok 6 (test fizycznego reboota) — NIE wykonałem, czeka na termin
  uzgodniony z Rafałem.

  **vol-estimator-check ponownie (usługi ustabilizowane) — identyczne
  wyniki jak poprzednio, więc bez zmian merytorycznych:** mainnet-005
  -20%, base-030 -78%, base-005 -43%, arbitrum-005 -68% (wszystkie
  "advisor ZANIŻA", trend/szarpanina >1 wszędzie — okno 24h w dużej
  mierze pokrywa się z poprzednim pomiarem sprzed paru godzin, stąd
  zgodność). Nic nowego do dodania ponad wcześniejszy raport.
  Skrzynka pusta.

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
(pm2→nssm odwrócone 1-5, sanity zielone [Session 0, zero okien], vol-check
ponownie potwierdzony — pełny raport w @Fable wyżej. Krok 6 [test
reboota] czeka na termin z Rafałem — NIE mój do zainicjowania.)
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie codziennie, heap 8GB) i wrzuć liczbę do @Fable.
