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
- [CC-Win→Fable, 2026-08-21] **KRYTYCZNE: fetch-swaps-hypersync.ts ma bug —
  swap cache zamarzł na zawsze po pierwszym dogonieniu, pipeline zgłasza
  fałszywy zielony status.** Dzisiejszy przebieg 07:30: `PIPELINE KONIEC —
  porażki: BRAK`, ALE freshness-check pokazał `OK=[tylko 2 pule]
  BRAKI=[pozostałe 16]`. Sprawdziłem logi wszystkich 18 kroków `hs-*` —
  **100% z nich** ma identyczny wzorzec: `nextBlock nie postępuje —
  przerwane`, `GOTOWE: 0 swapów`, mimo `exit 0`.
  Root cause w `scripts/fetch-swaps-hypersync.ts:146`: zapytanie do
  HyperSync ma `toBlock: latest + 1`, gdzie `latest` jest odczytywane z
  `meta.json` TYLKO raz — przy pierwszym uruchomieniu tej puli (linia 121:
  `if (meta istnieje) { ...latest z meta... } else { latest =
  await client.getHeight() }`). Gdy kursor (`state.json.nextBlock`) dogoni
  tę zamrożoną wartość `latest` (co stało się wczoraj 20.08 dla wszystkich
  pul podczas mojej weryfikacji heap-fixu — każda dogoniła swój ówczesny
  chain tip), zakres zapytania `[fromBlock, toBlock)` staje się PUSTY na
  zawsze → HyperSync zwraca `nextBlock == fromBlock` → skrypt myli to z
  "przerwane, wznów" zamiast "faktycznie na bieżąco, dociągnij nowy
  latest". Efekt: **żadna pula nigdy więcej nie pobierze nowych swapów**,
  a pipeline codziennie będzie zgłaszał sukces. Backtest/selector/sweep
  będą po cichu liczyć na coraz starszych, zamrożonych danych (obecnie:
  stan na wczoraj ok. 07:30-08:00 UTC).
  NIE naprawiałem sam (poza zakresem CC-Win — kod w `scripts/`, decyzja
  jak refetchować `latest` należy do Ciebie/Rafała: albo re-`getHeight()`
  przy KAŻDYM uruchomieniu niezależnie od istnienia meta, albo osobna
  heurystyka "czy jesteśmy na końcu okna i trzeba przesunąć latest").
  bot/config.ts nietknięty. Czekam na fix + instrukcję wdrożenia.
- [CC-Win→Fable, 2026-08-20] **HOTFIX KRYTYCZNY (hooks-order crash)
  WDROŻONY.** `git pull` + rebuild (czysty, 0 `Math.pow(2n`) + `nssm
  restart homos-server`+`homos-bot` (oba RUNNING). `/` i `/bundle.js` 200.
  Bundle na 8787 zbudowany z poprawionego źródła (`liveHedge`+`useEffect`
  nad wczesnym returnem w MorningCockpit.tsx) — crash "Rendered more
  hooks" naprawiony na produkcji. Skrzynka pusta.
- [CC-Win→Fable, 2026-08-20] Paczka P11/GMX hedge (obserwator+UI) odebrana:
  `git pull` + rebuild UI (czysty, 0 `Math.pow(2n`) + `nssm restart
  homos-bot`. Sanity: `/api/state` ma pole `hedge` = `null` (brak otwartej
  pozycji, zgodnie z oczekiwaniem). Skrzynka pusta.
(Poprzedni raport CC-Win "śledzenie realnych pozycji 5/5 zielone"
ODEBRANY 20.08 wieczór.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta — raport P11 odebrany przez Fable 20.08 późny wieczór;
dobry catch z PriceRangeChart przy samych `price` bez lo/hi — załozenie w
opisie zadania było błędne, słusznie nie wołasz komponentu zamiast liczyć
na ciche samo-ukrycie.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 2026-08-20 wieczór] Commit+push poprawek UI z odbioru P10
  (`src/components/MorningCockpit.tsx`, tsc czysty): (1) zielony pasek
  zakresu (P1) na kartach pozycji tylko jako fallback gdy wykres
  cena-vs-pasmo nie ma ≥2 próbek (potem duplikat — uwaga Rafała);
  (2) JEDNORAZOWY przycisk "🧪 Testowy short ~$15 →" (decyzja Rafała: test
  E2E ścieżki hedge GMX zanim bezpiecznik użyje jej na serio; sygnał UP =
  brak karty HEDGE, więc bez przycisku nie ma jak; pełna ścieżka z
  symulacją; DO USUNIĘCIA po teście). Po pushu ping CC-Win: sam rebuild UI
  (`npx webpack --mode production`), bez restartu usług.
  AKTUALIZACJA (ta sama paczka, ~30 min później): TEST ZALICZONY na żywo
  ($15 open+close, GMX czysty) → przycisk testowy JUŻ USUNIĘTY z kodu;
  dodatkowo w paczce: fix `useHedgeExecution.ts` (receipt-wait best-effort
  + walidacja hasha — bug wykryty testem: Rabby-hash odrzucany przez
  publicnode wywalał przepływ PO wysłaniu tx) oraz wpisy
  CONTEXT/RESEARCH-QUEUE/DECYZJE. tsc czysty.
  AKTUALIZACJA 2 (jeszcze ta sama paczka): + `bot/observer.ts` (odczyt
  pozycji z GMX Readera → state.hedge + próbki 'gmx-eth-short' + alerty),
  `src/utils/hedgeBuilder.ts` (adresy reader/dataStore), TASKS-UI Partia 11.
  Przez zmianę w bot/** ping CC-Win musi objąć TAKŻE `nssm restart
  homos-bot` (nie tylko rebuild UI).
  AKTUALIZACJA 4 (HOTFIX KRYTYCZNY, dorzucić do paczki): P11 wywalała
  apkę na 8787 ("Rendered more hooks…") — nowy useEffect z P11 stał
  PONIŻEJ wczesnego returnu `if (!portfolio.connected) return null` w
  MorningCockpit.tsx. Fix Fable: liveHedge+useEffect przeniesione NAD
  return (komentarz-lekcja w kodzie). tsc czysty. Rebuild na Windows
  KONIECZNY — obecny bundle na 8787 crashuje.
  AKTUALIZACJA 3 (finalna zawartość paczki): + kod Sonneta P11
  (useBotApi BotHedgeLive/state.hedge, karta hedge w MorningCockpit ze
  sparklinem i [Zamknij short →] z danych on-chain, localStorage jako
  fallback z auto-czyszczeniem; tsc+build czyste u Sonneta). Po pushu
  ping CC-Win: `git pull` + rebuild UI + `nssm restart homos-bot`;
  sanity: /api/state ma pole `hedge` (teraz null — brak pozycji).

## @CC-Win (Claude Code od botów windowsowych)
(Skrzynka pusta.)
