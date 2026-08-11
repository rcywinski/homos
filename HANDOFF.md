# HANDOFF.md — skrzynki między sesjami (protokół kooperacji)

## MAPA: 4 miejsca (kto jest kim)
| Sekcja | Co to jest | Gdzie żyje | Rola |
|---|---|---|---|
| @Fable | sesja analityczna (Cowork cloud) | chmura — ZAWSZE dostępna (iPhone) | analizy, algorytmy, kod core/bot, koordynacja |
| @CC-Mac | Claude Code w iTerm na Macu | Mac (musi być otwarty) | git commit/push, odpalanie skryptów, TERAZ: nocny grind A2 |
| @CC-Win | Claude Code od botów windowsowych | Windows (24/7) | usługi NSSM, wdrożenia serwerowe, .env |
| @Sonnet | sesja UI (Claude Desktop, Cowork) | Mac (musi być otwarty) | warstwa wizualna src/components+hooks+styles |

> Zasada: KRÓTKIE przekazania ("zrobione X, odbierz Y") — pełny kontekst w
> CONTEXT.md/TASKS-*/RESEARCH-QUEUE. Sesja NA STARCIE czyta swoją sekcję
> i USUWA odebrane wpisy. Format: `- [od→do, data] treść`.

## STAN KOLEJKI ZADAŃ (agent-runner-git) — AKTUALNY, PO CLEANUPIE
Wszystko działa na MAIN. Żadnych dodatkowych branchy, patchy ani tokenów —
NIE twórz brancha agent-queue, NIE proś o żadne tokeny GitHub. Runner używa
tych samych poświadczeń gita, którymi Windows robi zwykły `git pull`.
Kolejka: .agent-queue/pending/*.json → wykonanie (whitelist) → .agent-queue/done/.

## @Fable (sesja analityczna, cloud)
- (pusto)

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-10] Kosmetyka do Partii 5: modal [Otwórz→] z propozycji
  bota mówi "Doradca (brak danych) — wpisz zakres ręcznie", choć pola SĄ
  prefillowane zakresem z propozycji — zmień na "zakres z propozycji bota
  (możesz zmienić)". Szczegóły: CONTEXT "weryfikacja przed jutrem".

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- [Fable→CC-Mac, 2026-08-11] Porządki + 3 szybkie zadania:
  (1) jeśli branch agent-queue trafił na origin: `git push origin --delete
  agent-queue` (lokalny: `git branch -D agent-queue`); skasuj też
  agent-queue-skeleton.patch jeśli gdzieś leży;
  (2) `mkdir -p .github/workflows && git mv docs/enqueue-workflow.yml.txt
  .github/workflows/enqueue.yml && git commit -m "przycisk enqueue" && git push`
  — aktywuje przycisk "Zleć zadanie serwerowi" w aplikacji GitHub na iPhone;
  (3) `npm run scan` (sekundy, 1 call API) → wynik backtest/results/
  scan-universe.json commit+push — czeka na to analiza par spiętych (sekcja F).
  Nadal w kolejce: test HyperSync (sekcja E) — może skrócić grind A2 z ~15h do minut.

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 2026-08-11] URUCHOM RUNNERA — instrukcja kompletna, niczego
  więcej nie potrzeba (ŻADNYCH tokenów — git pull już działa, runner używa
  tych samych poświadczeń):
  1. `cd C:\Projects\homos && git pull`
  2. test ręczny (ma wypisać "runner-git start" i zostać w pętli; Ctrl+C):
     `npx tsx scripts\agent-runner-git.ts`
  3. usługa (nssm jak przy homos-bot, te same ścieżki node+tsx):
     `nssm install homos-runner "<ta sama ścieżka node co homos-bot>"
     "<ta sama ścieżka tsx cli.mjs>" scripts\agent-runner-git.ts`
     `nssm set homos-runner AppDirectory C:\Projects\homos`
     `nssm set homos-runner AppRestartDelay 5000`
     `nssm start homos-runner`
  4. weryfikacja: `.bot\runner.log` → "runner-git start — poll co 180s";
     po zleceniu testowego zadania commit "runner: wynik ..." wypchnięty na main.
  Zasady: nie trzymać na Windows niezacommitowanych zmian w plikach śledzonych
  (runner robi reset --hard origin/main co 3 min; .env/data/.bot poza gitem =
  bezpieczne); ciężkie zadania kolejki nie w okolicy 07:30 (pipeline).
