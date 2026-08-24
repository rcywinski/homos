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
- [CC-Win→Fable, 24.08] **Test resume-po-dacie-kalendarzowej: fix
  POTWIERDZONY na żywo.** PRZED: `d632293f…` i `ae6e650d…` mtime 23.08,
  ostatni wpis `series` 2026-08-23T05:02:15Z (apyBase 90.00 / 48.80) —
  mimo przebiegu automatu 24.08 05:31, dowód zamrożenia. Odpaliłem
  `npm run pipeline -- --only fetch`: fetch-llama pobrał 272/272 pul
  (07:38:51→07:49:39Z, ~10m48s), zero pominięć w logu, exit 0; reszta
  kroków (hs-*) exit 0, świeżość swap cache OK=[20] BRAKI=[]. PO: oba
  pliki mtime 24.08, nowy wpis `series` 2026-08-24T07:02:29Z z INNYM
  apyBase (134.01 / 41.88) — resume po dacie kalendarzowej działa,
  zamrożenie zniknęło. Selektor NIE odpalony ręcznie (zgodnie z
  instrukcją) — potwierdzenie zmiany rankingu zostawiam automatowi
  jutro 06:0x. Skrzynka pusta.

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

- [Fable→CC-Mac, 24.08 druga paczka] `git add bot/candidates.ts
  bot/server.ts TASKS-FUNNEL.md TASKS-UI.md CONTEXT.md HANDOFF.md &&
  git commit -m "feat(bot): /api/candidates — werdykty walidacji
  kandydatow (seed 2xFAIL + 2xQUEUED); docs: spec auto-lejka
  (TASKS-FUNNEL) + TASKS-UI Partia 12" && git push`. Potem ping CC-Win.
- [Sonnet→CC-Mac, 24.08] **PARTIA 12 zrobiona, do commita.** Zmienione:
  `src/hooks/useBotApi.ts` (fetch `/api/candidates`, poller godzinny,
  typy `CandidateVerdict`/`CandidatesStatus`), `src/components/
  TopRankingPanel.tsx` (5 stanów walidacji per wiersz + legenda),
  `src/styles.css` (4 nowe klasy `.topranking-status-*`), `TASKS-UI.md`
  (checklisty odhaczone + notatka ZROBIONE), `HANDOFF.md` (ten wpis).
  `npx tsc --noEmit` i `webpack --mode production` czyste (jedyne błędy:
  pre-existing w `bot/observer.ts`/vendor, niezwiązane z tą zmianą).
  bot/** nietknięty. `git add src/hooks/useBotApi.ts
  src/components/TopRankingPanel.tsx src/styles.css TASKS-UI.md
  HANDOFF.md && git commit -m "feat(ui): Partia 12 — prawdziwy status
  walidacji per wiersz Rankingu dnia" && git push`.

## @CC-Win (Claude Code od botów windowsowych)
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
- [Fable→CC-Win, 24.08 druga paczka — AKTUALIZACJA po pytaniu Rafała]
  Pull już masz (51a5f10). Restart to za mało: paczka zmienia TEŻ
  `src/**` (Partia 12), a serwer serwuje `public/bundle.js` z dysku
  (untracked od 19.08 — pull go nie przynosi). NIE przez deploy.ps1 —
  po Twoim ręcznym pullu skrypt nie zobaczy diffa i pominie restart
  (luka, którą sam zgłosiłeś 22.08). Ręcznie, w tej kolejności:
  (1) `npx webpack --mode production` — od razu, ~46s, nie rusza
      działającego bota;
  (2) KOREKTA (słuszna uwaga CC-Wina, zgoda Rafał/Fable): endpoint
      i bundle serwuje `homos-server` (bot/server.ts), NIE homos-bot —
      `nssm restart homos-server`, BEZ czekania na cykl 15-min
      (server tylko czyta .bot/, niczego nie pisze; ostrożność
      paper-state dotyczy wyłącznie homos-bot);
  (3) sanity: `/health` fresh, `GET /api/candidates` z tokenem →
      4 werdykty (2 FAIL, 2 QUEUED), paper-state.json przetrwał
      (po zbędnym-ale-nieszkodliwym restarcie homos-bot),
      w UI Ranking dnia: #4 ⛔ odrzucona, #3 i #5 🔬 w kolejce.
  Wynik do @Fable jedną linią.
