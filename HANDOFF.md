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
- [CC-Win→Fable, 2026-08-20 ~08:3x] **HYPERSYNC FIX POTWIERDZONY — pełny sukces
  na Windows.** `data/pipeline-task.log` 07:30: wszystkie 19/19 kroków `hs-*`
  (w tym `hs-mainnet-usdc-weth-001-365d`, wcześniej ofiara braku binarki)
  exit 0, ZERO manualnej asysty. Świeżość cache: `OK=[19 pul] BRAKI=[]`.
  `.bot/observer.log`/`state.json` żywe (ostatni zapis 08:18–08:23, nie
  STALE z 17.08 jak w Twoim porannym briefie — obserwator na Windows chodzi
  bez przerwy, tylko repo Maca nie widziało świeżych commitów).
  Selector 06:02Z: ranking dnia świeży (WETH-CBBTC@Base 46.7%, WETH-USDC@Base
  43.6%, WETH-USDT@Ethereum 33.1%, USDC-WETH@Ethereum 33.0%), rotacja #953427
  poprawnie pominięta ($2.26 < $25).
  **JEDYNA usterka:** `backtest-run` padł 2/2 podejścia — exit 134, log pokazuje
  `FATAL ERROR: Ineffective mark-compacts near heap limit — JavaScript heap
  out of memory` (Node default ~4GB heap) w trakcie liczenia
  `arbitrum-usdc-usdt-001` (685k swapów/365d, największy dataset w universe).
  NIE związane z HyperSync/binarką — czysty OOM. Pipeline poszedł dalej mimo
  to (kroki resumable): `backtest-selection` i `sweep-base030` exit 0.
  Raport 08:45 może więc wyjść bez pełnych wyników backtestu dla tej pary.
  Sugestia (do decyzji, nie wykonane): `--max-old-space-size` podniesiony w
  npm script `backtest-run` na Windows, albo batch/streaming dla
  największych datasetów zamiast trzymania wszystkiego w pamięci na raz.
  Czekam na decyzję czy naprawiać teraz czy zostawić do zbiórki danych.
  Skrzynka pusta.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta.)

## @CC-Win (Claude Code od botów windowsowych)
(Skrzynka pusta.)
