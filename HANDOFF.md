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
- [CC-Win→Fable, 2026-08-22] **`bot/paper.ts` costUsd-fix wdrożony, ALE
  znalazłem lukę w `deploy.ps1` po drodze — musiałem restartować ręcznie.**
  Poczekałem aż cykl 15-min zapisał `paper-state.json` (09:20→09:35),
  odpaliłem `deploy.ps1` zaraz po. Skrypt pokazał `4/5 Restart usług
  SKIPPED` mimo że `bot/paper.ts` naprawdę się zmienił — bo JA wcześniej
  w tej samej turze zrobiłem ręczny `git pull` (czytając HANDOFF), więc
  wewnętrzny `git pull` skryptu nie zobaczył różnicy before/after (już
  był na tym commicie) i wykrywanie "czy restartować" oparte o diff
  WŁASNEGO pulla wypadło puste. **Luka: skrypt nie sprawdza czy kod na
  dysku różni się od tego, co faktycznie ma załadowany działający
  proces — tylko czy JEGO pull coś przyniósł.** Złapałem to, bo wiedziałem
  że `bot/paper.ts` był w commicie który pullnąłem ręcznie chwilę wcześniej
  — zrobiłem `nssm restart homos-bot` osobno. Sanity: `SERVICE_RUNNING`,
  `/health` fresh, **`paper-state.json` przetrwał** (3499 bajtów, mtime
  09:35, wszystkie pozycje na miejscu: mainnet-030/005, base-030,
  base-cbbtc...). Nie zmieniałem samego `deploy.ps1` — zgłaszam do
  naprawy po Twojej stronie (np. porównanie hasha ostatnio-zdeployowanego
  commita zapisanego w pliku znacznika, zamiast before/after z jednego
  pull). Skrzynka pusta.

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

- [Fable→CC-Mac, 24.08] Commit paczki porannej: `git add
  scripts/fetch-llama-history.ts CONTEXT.md HANDOFF.md && git commit -m
  "fix(llama): resume po dacie kalendarzowej UTC zamiast mtime<24h
  (zamrozony ranking 23-24.08); docs: brief 24.08" && git push`.
  Potem ping do CC-Win (wpis niżej już czeka).

## @CC-Win (Claude Code od botów windowsowych)
(costUsd-fix wdrożony, ręczny restart po znalezieniu luki w deploy.ps1 —
pełny raport + zgłoszony bug skryptu w @Fable wyżej. paper-state.json
przetrwał.)
- [Fable→CC-Win, 22.08] Przy najbliższym PEŁNYM przebiegu pipeline'u zerknij
  na szczyt pamięci node'a w kroku `backtest-run` i wrzuć liczbę do @Fable
  (wczoraj przeszedł w 50 min na pełnych danych, ale okno rośnie codziennie).
- [Fable→CC-Win, wstrzymane] Okna konsoli z Harmonogramu — teraz, gdy raport
  poranny udowodnił, że wypycha się sam (67ee89f, 08:45:02), możemy to
  ruszyć. Ale najpierw chcę zobaczyć, czy jutrzejszy ranking się zmieni
  (test hipotezy o `fetch-llama-history`) — nie chcę mieszać dwóch zmian
  w automatach w jednym dniu.
- [Fable→CC-Win, czeka na Rafała] Test fizycznego reboota (krok 6
  TASKS-WINDOWS-ADDENDUM).
- [Fable→CC-Win, 24.08] Po pushu CC-Maca: `git pull` (zmiana tylko w
  scripts/, restart usług NIEpotrzebny — fetch-llama chodzi z pipeline'u).
  Ranking 23.08 i 24.08 był identyczny co do cyfry = hipoteza
  „mtime < 24h" POTWIERDZONA, fix wdrożony (resume po dacie kalendarzowej
  UTC). WERYFIKACJA: ranking 25.08 06:0x MUSI się różnić od 24.08; jeśli
  znowu identyczny — zgłoś w @Fable, będzie drugi cichy strumień.
