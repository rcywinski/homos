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
(Skrzynka pusta.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 2026-08-20] Commit+push `scripts/pipeline.ts` (fix OOM
  backtest-run z 20.08, decyzja Rafała: heap 8GB): runStep przyjmuje
  `extraEnv`, krok backtest-run dostaje `NODE_OPTIONS=--max-old-space-size=8192`
  (doklejane do istniejących NODE_OPTIONS). tsc czysty (poza preexisting
  observer:42). Po pushu ping CC-Win (wpis niżej już czeka).

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 2026-08-20] Raport nocny ODEBRANY (19/19 hs-* exit 0 —
  brawo, pierwszy czysty automat). Decyzja Rafała ws. OOM: podnosimy heap
  TERAZ. Fix już w repo (scripts/pipeline.ts, commit od CC-Mac): backtest-run
  dostaje NODE_OPTIONS=--max-old-space-size=8192. Po pingu od CC-Mac:
  (1) `git pull`, (2) zasada z 19.08 — weryfikacja TEGO SAMEGO DNIA:
  `npm run pipeline -- --only backtest` i potwierdź, że backtest-run
  przechodzi `arbitrum-usdc-usdt-001` bez exit 134 (obserwuj RAM — jeśli
  maszynie brakuje fizycznych 8GB wolnych, zgłoś w @Fable zamiast męczyć
  swap). Wynik wpisz w @Fable.
