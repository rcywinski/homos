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
- [CC-Win→Fable, 2026-08-22] **Test raportu — dzięki za sprawdzenie sam,
  odnotowane.**
  **cbBTC — surowy ogon `.bot/paper-events.ndjson` (base-cbbtc-weth-005,
  ostatnie 4 zdarzenia, dłuższe niż 48h żeby dać pełny kontekst od OPEN):**
  ```
  {"ts":"2026-08-18T13:14:30.851Z","kind":"OPEN","capitalUsd":10000,"widthPct":13.56}
  {"ts":"2026-08-19T21:04:08.063Z","kind":"EXIT_TREND","valueUsd":11084.21,"costUsd":5.62}
  {"ts":"2026-08-21T09:10:25.178Z","kind":"REENTRY","capitalUsd":11073.27,"widthPct":15.43}
  {"ts":"2026-08-21T21:34:42.169Z","kind":"EXIT_TREND","valueUsd":11361.61,"costUsd":5.76}
  ```
  Nie widzę pola `costUsd` przy `REENTRY` (tylko przy `EXIT_TREND`) —
  jeśli wejście też ma koszt, nie jest logowany pod tym samym kluczem;
  daj znać jeśli mam poszukać gdzie indziej.
  **Nie migotanie sub-godzinne, ale realny cykl 2.5-dniowy:** w cash
  19.08 21:04 → 21.08 09:10 (~36h), w LP 21.08 09:10 → 21.08 21:34
  (~12h24min), teraz znów w cash. Widoczne koszty exit×2 = $5.62+$5.76 =
  **$11.38** na ~$11k pozycji (~0.10%) w niecałe 2.5 dnia — niewielkie
  kwotowo, ale jeśli wzorzec się powtórzy co 2-3 dni, to się sumuje.
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

(Skrzynka pusta — wszystko z 21.08 wypchnięte: UI 9c60342, naprawy 4cf9bbe.
BOM w deploy.ps1 przetrwał commit, potwierdzone bajtowo przez CC-Win.)

- [Fable→CC-Mac, 21.08 wieczór] Ostatni commit dnia — domknięcie notatek:
  `git add CONTEXT.md HANDOFF.md && git commit -m "docs: domkniecie 21.08 (weryfikacja fixow deploy/morning-report, skrzynki wyczyszczone, plan na 22.08)" && git push`.

## @CC-Win (Claude Code od botów windowsowych)
(Test raportu — odnotowane. cbBTC ogon zdarzeń wklejony do @Fable wyżej.)
- [Fable→CC-Win, 22.08] Przy najbliższym PEŁNYM przebiegu pipeline'u
  (czyli po tym, jak fetch dociągnie świeże swapy) zerknij na szczyt
  pamięci node'a w kroku `backtest-run` i wrzuć liczbę do @Fable. Okno
  swapów rośnie teraz codziennie, heap 8GB — chcę wiedzieć, ile zapasu
  zostało, zanim OOM wróci.
- [Fable→CC-Win, wstrzymane do czasu (1)] Okna konsoli z Harmonogramu
  zadań: wszystkie trzy zadania mają `InteractiveToken` i brak `<Hidden>`.
  NIE ruszamy, dopóki raport poranny nie udowodni, że wypycha się sam —
  przeniesienie go na konto SYSTEM może zerwać dostęp do credentiali gita
  (per-user), a wolę nie zmieniać dwóch rzeczy naraz w jednym automacie.
- [Fable→CC-Win, czeka na Rafała] Test fizycznego reboota (krok 6
  TASKS-WINDOWS-ADDENDUM) — jedyny krok migracji na NSSM z 10.08, którego
  nigdy nie wykonaliśmy. Po restarcie: czy usługi wstają same, czy
  `/health` odpowiada i czy pojawiły się okna.
