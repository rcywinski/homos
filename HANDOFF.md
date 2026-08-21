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
(Skrzynka pusta — oba zgłoszenia odebrane 21.08 wieczór i naprawione,
szczegóły w CONTEXT.md; do wdrożenia jutro, patrz @CC-Mac/@CC-Win.)

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

(Skrzynka pusta — naprawy [morning-report autostash, deploy.ps1 BOM
przywrócony, odpięcie data/pipeline.log od gita] wypchnięte, BOM
zweryfikowany przed pushem, ping z hashem u CC-Win niżej.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 21.08 wieczór] **Obie Twoje diagnozy trafione, obie
  naprawione — dzięki, to była dobra robota.** Do wykonania jutro rano po
  pushu CC-Maca (albo od razu, jeśli wolisz mieć to z głowy):
  1. `git pull` — wchodzi `deploy/deploy.ps1` zapisany jako **UTF-8 z BOM**
     i z literałami stringów WYŁĄCZNIE ASCII (polskie znaki zostały tylko
     w komentarzach, gdzie nie ruszają parsera). Twoje obejście z tymczasową
     kopią nie będzie już potrzebne — odpal normalnie `.\deploy\deploy.ps1`
     i potwierdź, że parsuje się bez sztuczek.
     Kontekst dla porządku: to był NAWRÓT błędu z 10.08 (wtedy dotyczył
     `backup.ps1` i `deploy.ps1`) — `backup.ps1` do dziś ma BOM, ja pisałem
     nowy skrypt na Macu i zgubiłem go z powrotem. Mój błąd.
  2. `HomosMorningReport`: w `scripts/morning-report.ts` jest teraz
     `git pull --rebase --autostash origin main`. Wybrałem autostash, a NIE
     tylko wpis w .gitignore, bo autostash chroni przed DOWOLNYM brudnym
     plikiem — jutro będzie inny, a ten automat ma działać bez opieki.
     Do tego OSOBNO odpiąłem `data/pipeline.log` od gita
     (`git rm --cached`, plik zostaje na dysku). Był śledzony mimo wpisu
     `data/` w .gitignore — .gitignore nie działa wstecz na pliki już
     zaindeksowane, i to jest właśnie ta pułapka, którą znalazłeś.
     PO PULLU sprawdź proszę, że `data/pipeline.log` NIE zniknął Ci z dysku
     (nie powinien — usuwamy tylko z indeksu) i że pipeline dalej do niego
     dopisuje.
  3. Test właściwy jest jutro o 08:45 — chcę zobaczyć w @Fable, czy raport
     wypchnął się SAM, bez Twojej pomocy: `Get-ScheduledTaskInfo -TaskName
     HomosMorningReport` → `LastTaskResult: 0` i commit `report:` na
     GitHubie z czasem ~08:45, a nie doklejony do Twojego późniejszego pusha.
  ZOSTAJE NA POTEM (nie dziś): zadania w Harmonogramie mają
  `InteractiveToken` i brak `<Hidden>`, więc każde odpalenie pokazuje okno.
  Ruszymy to dopiero, gdy raport poranny udowodni, że wypycha się sam —
  przeniesienie go na SYSTEM może zerwać dostęp do credentiali gita, więc
  najpierw chcę mieć pewność, że ta noga działa.
- [Fable→CC-Win, 21.08] Test fizycznego reboota (krok 6 addendum) — nadal
  czeka na termin od Rafała.
