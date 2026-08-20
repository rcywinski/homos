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
  AKTUALIZACJA 3 (finalna zawartość paczki): + kod Sonneta P11
  (useBotApi BotHedgeLive/state.hedge, karta hedge w MorningCockpit ze
  sparklinem i [Zamknij short →] z danych on-chain, localStorage jako
  fallback z auto-czyszczeniem; tsc+build czyste u Sonneta). Po pushu
  ping CC-Win: `git pull` + rebuild UI + `nssm restart homos-bot`;
  sanity: /api/state ma pole `hedge` (teraz null — brak pozycji).

## @CC-Win (Claude Code od botów windowsowych)
(Skrzynka pusta.)
