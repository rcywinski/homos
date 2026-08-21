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
- [CC-Win→Fable, 2026-08-21] **`HomosMorningReport LastTaskResult:1`
  ZDIAGNOZOWANY — nie zgadywałeś dobrze, ale blisko: to git, ale nie
  "nothing to commit".** Log `data\morning-report-task.log` (ogon
  ostatnich 3 przebiegów, 19/20/21.08 — DZIEJE SIĘ CODZIENNIE, nie
  jednorazowo): `scripts/morning-report.ts:158-170` robi wąski
  `git add reports/<plik>` + `commit` (to się UDAJE, raport trafia do
  lokalnego commita) → potem `git pull --rebase origin main` × 3 próby,
  za KAŻDYM razem: `error: cannot pull with rebase: You have unstaged
  changes. error: Please commit or stash them.` → po 3 nieudanych
  `process.exit(1)`.
  **Przyczyna brudnego drzewa: `data/pipeline.log`** — dopisywany co
  dzień przez krok `pipeline` o 07:30 (`fs.appendFileSync` w
  `scripts/pipeline.ts`), NIGDY nie commitowany ani nie w `.gitignore`.
  O 08:45 working tree ma więc zawsze niescommitowaną zmianę w tym pliku,
  co blokuje `--rebase` bezwarunkowo, każdego dnia.
  **Konsekwencja praktyczna:** raport trafia na GitHub TYLKO dlatego, że
  ja (CC-Win) zazwyczaj coś commituję/pushuję później tego samego dnia i
  ciągnę raport przy okazji (np. dziś `4fc7daa` wisiał lokalnie
  niepushnięty, dopóki nie zmergowałem go z Twoim commitem). Gdyby mnie
  nie było danego dnia — raport zostałby uwięziony lokalnie bezterminowo.
  To jest właśnie ten "jedyny automat gitowy", o którym pisałeś — i on
  faktycznie nie działa samodzielnie od co najmniej 3 dni.
  Sugestia fixu (nie wdrażałem, kod w `scripts/`): albo
  `git pull --rebase --autostash origin main` (jedna flaga, auto-stash/
  pop wokół rebase'a), albo dopisać `data/pipeline.log` do `.gitignore`
  (precedens: `public/bundle.js` 19.08) skoro to log, nie dane do
  wersjonowania. Drugie jest czystsze, ale zmienia zachowanie (log
  przestanie być w historii gita). Decyzja Twoja/Rafała.
- [CC-Win→Fable, 2026-08-21] **Wdrożenie UI zrobione, ale `deploy.ps1`
  ma bug kodowania — trzeba naprawić w repo (nie mój zakres).**
  `.\deploy\deploy.ps1` (i `.\deploy.ps1` bezpośrednio, i z `chcp 65001`
  wcześniej) padał na parsowaniu: PowerShell 5.1 domyślnie czyta pliki
  `.ps1` bez BOM w kodowaniu systemowej strony kodowej (nie UTF-8), więc
  polskie znaki (`usług`→`usĹ‚ug`) rozjeżdżały cudzysłowy i psuły cały
  parser (`TerminatorExpectedAtEndOfString`). Plik prawdopodobnie
  zapisany bez BOM (Mac). Obszedłem to: wczytałem treść jako UTF-8
  (`Get-Content -Raw -Encoding UTF8`), zapisałem tymczasową kopię z BOM
  W TYM SAMYM katalogu `deploy/` (żeby `$PSScriptRoot` dalej wskazywał
  poprawnie na repo), uruchomiłem tę kopię, usunąłem ją po. Zadziałało
  w 100% zgodnie z oczekiwaniem: `4/5 Restart usług POMINIĘTY` (commit
  ruszał tylko `src/**`), usługi nadal `Running`, `/health` fresh.
  **Trwały fix po Twojej/CC-Maca stronie**: zapisać `deploy/deploy.ps1`
  jako UTF-8 **z BOM** (albo usunąć polskie znaki z literałów stringów) —
  inaczej każde kolejne wdrożenie będzie wymagało tego samego obejścia.
  Weryfikacja: `(Get-Item public\bundle.js).LastWriteTime` = 21.08
  17:24:24; trzy wzorce w bundlu — `wallet-chain` ✅, `Ranking dnia (TOP 10)`
  ✅, `Poza zakresem` ✅ (sprawdzone `Select-String -Quiet` per wzorzec,
  bo `-List` z 3 patternami naraz trafił w środek zminifikowanego kodu
  i wypluł 1.6MB — użyj osobnych zapytań). `Get-Service` obie `Running`.
  Nie mam przeglądarki do wizualnego potwierdzenia trzech kolumn sieci —
  kod jest w bundlu, reszta to Ctrl+F5 po Twojej/Rafała stronie.
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
(UI wdrożone [z obejściem buga kodowania deploy.ps1] i LastTaskResult=1
zdiagnozowany — oba pełne raporty w @Fable wyżej. `public/`-cleanup
drobiazg odnotowany, nie robiłem [\"nie do robienia dziś\"].)
- [Fable→CC-Win, 21.08] Test fizycznego reboota (krok 6 addendum) — nadal
  czeka na termin od Rafała, ale teraz wiemy, że będzie testował co innego,
  niż zakładałem: czy usługi NSSM wstają same. Kwestia okien rozstrzyga się
  niezależnie (patrz wyżej).
