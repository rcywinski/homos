# HANDOFF.md — skrzynki między sesjami (protokół kooperacji)

## MAPA: 4 miejsca (kto jest kim)
| Sekcja | Co to jest | Gdzie żyje | Rola |
|---|---|---|---|
| @Fable | sesja analityczna (Cowork cloud) | chmura — ZAWSZE dostępna (iPhone) | analizy, algorytmy, kod core/bot, koordynacja |
| @CC-Mac | Claude Code w iTerm na Macu | Mac (musi być otwarty) | git commit/push, odpalanie skryptów, TERAZ: nocny grind A2 |
| @CC-Win | Claude Code od botów windowsowych | Windows (24/7) | usługi NSSM, wdrożenia serwerowe, .env |
| @Sonnet | sesja UI (Claude Desktop, Cowork) | Mac (musi być otwarty) | warstwa wizualna src/components+hooks+styles |

Tylko @Fable jest zawsze osiągalna; dlatego zdalny wykonawca (agent-runner-git,
usługa na Windows 24/7) domyka pętlę iPhone→chmura→Windows bez Maca.

> Zasada: KRÓTKIE przekazania ("zrobione X, odbierz Y"), nie raporty — pełny
> kontekst i tak żyje w CONTEXT.md/TASKS-*/RESEARCH-QUEUE. Każda sesja NA
> STARCIE czyta swoją sekcję i USUWA odebrane wpisy (skrzynka, nie archiwum).
> Format wpisu: `- [od→do, data] treść`. Rafał nie musi już być routerem —
> zostawiasz wpis tutaj + commit (jeśli masz gita) i piszesz dalej swoje.

## @Fable (sesja analityczna, cloud)
- (pusto)

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-10] Kosmetyka do Partii 5 przy okazji: modal [Otwórz→]
  z propozycji bota mówi "Doradca (brak danych) — wpisz zakres ręcznie", choć
  pola SĄ prefillowane zakresem z propozycji — zmień komunikat na "zakres
  z propozycji bota (możesz zmienić)". Szczegóły: CONTEXT wpis "weryfikacja
  przed jutrem".

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- [Fable→CC-Mac, 2026-08-10, UPROSZCZONE] ZDALNY WYKONAWCA: gotowy commit
  brancha leży w repo jako `agent-queue-skeleton.patch` (szkielet .agent-queue/
  + scripts/agent-runner-git.ts + package.json scan/runner:git). Wykonaj:
  `git checkout -b agent-queue && git am agent-queue-skeleton.patch &&
  git push -u origin agent-queue && git checkout main && rm agent-queue-skeleton.patch`.
  Potem na main: commit+push scripts/agent-runner-git.ts + backtest/scan-universe.ts
  + scripts/fetch-swaps-hypersync.ts + HANDOFF.md + docs (są na dysku).
  Uzasadnienie patcha: sesja chmurowa może czytać repo, ale proxy blokuje jej
  push dopóki repo nie będzie w źródłach sesji (Rafał doda przy starcie
  następnej sesji chmurowej).
- [Fable→CC, 2026-08-10] Trzy skrypty czekają w kolejce (sekcje E/F RESEARCH-QUEUE):
  (1) scan-universe.ts — odpal od ręki, sekundy; (2) test HyperSync → może
  skrócić grind A2/A3 z ~40h do minut; (3) commit+push nowych plików
  (selector v1.1, rebalanceBuilder, hypersync, scan-universe, HANDOFF.md).

- [Fable→CC-Mac, 2026-08-10] PRZYCISK iPHONE: docs/enqueue-workflow.yml.txt →
  przenieś do .github/workflows/enqueue.yml (zdalne narzędzia nie mogą pisać
  do workflows — ochrona) i commit+push na main. Po tym Rafał zleca zadania
  z aplikacji GitHub na telefonie: Actions → "Zleć zadanie serwerowi" → Run.

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→Windows, 2026-08-10] Po tym jak CC wypchnie branch `agent-queue`:
  git fetch && git checkout agent-queue, potem trzecia usługa NSSM
  `homos-runner` (analogicznie do homos-bot: ten sam node+tsx cli.mjs,
  argument scripts/agent-runner-git.ts, AppDirectory=C:\Projects\homos,
  AppRestartDelay=5000). Test: w .bot\runner.log wpis "runner-git start",
  w .agent-queue/runner-status.json świeży heartbeat po pushu z chmury.
  UWAGA: git na Windows musi umieć push bez pytania o hasło (credential
  manager już skonfigurowany przy pierwszym pull — zweryfikować push).
