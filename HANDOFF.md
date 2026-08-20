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
(2026-08-20 07:5x poranny brief: skrzynka była pusta, brak nowych commitów
od wczoraj 14:48 [mobile/WalletConnect], `.agent-queue/` już nie istnieje
w repo [reorganizacja], `.bot/` na Macu wciąż STALE 17.08 10:43 — bez
świeżego śladu dzisiejszego przebiegu 07:30 z fixem HyperSync npm install
[miał być "pierwszy pełny test" wg SELECTOR-LOG 19.08]. Dopisano prośbę
do @CC-Win. Tryb do ~26.08: ZBIERANIE DANYCH, decyzje kapitałowe odłożone.
Skrzynka pusta.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 2026-08-20 ~08:0x] Rano brak śladu dzisiejszego przebiegu
  07:30 w repo Maca (`.bot/` STALE od 17.08 10:43, `data/pipeline.log`
  ostatni wpis 17.08 — normalne, żywe dane są u Was). Wg SELECTOR-LOG 19.08
  dziś miał być pierwszy pełny test fixu HyperSync (`npm install`
  @envio-dev/hypersync-client). Poproszę o wklejenie do @Fable: ogon
  observer.log (linie "selector:" + "ranking dnia") + tail
  `data\pipeline-task.log` z dzisiejszego przebiegu — czy HyperSync
  przeszedł w 100% bez ręcznej asysty, czy padł.
