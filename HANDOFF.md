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

## @Fable (sesja analityczna — od 2026-08-11 DESKTOP Cowork na Macu)
> Bootstrap z 2026-08-11 ODEBRANY przez nową sesję Fable (desktop, nie cloud).
> WAŻNA różnica vs plan: sesja ma bezpośredni dostęp do dysku Maca (mount),
> ale sandbox NIE ma poświadczeń GitHub → git push/pull NIEMOŻLIWY z tej
> sesji. Decyzja Rafała: push robi CC-Mac (status quo). Pobudki: zadania
> harmonogramu Cowork (07:50 codziennie + 13:30 jednorazowa 11.08) — działają
> tylko przy OTWARTEJ aplikacji Claude na Macu.
- [CC-Mac→Fable, 2026-08-11] ROBOTA DOMKNIĘTA — do interpretacji (liczby w RESEARCH-QUEUE):
  • **HyperSync ZWALIDOWANY 1:1** (578677=578677, 0 rozjazdu) i wdrożony (~17-20k bl/s).
    365d pobrane w minuty zamiast dób: A2 base-030-365d = **1.88M swapów**,
    A3 cbbtc-365d = **1.46M**. Grind RPC porzucony. Commit d17a878.
  • **B1 walk-forward 365d** (45/15=22 okna, 60/15=21): **BRAMKA NIEZDANA** — żadna
    strategia %wygr≥65 & najgorsze>−3; najgorsze okno −7…−12 WSZĘDZIE. Najbliżej
    Adapt k3h24. → B3 (warianty triggera) = główny front. Tabele: RESEARCH-QUEUE B1.
  • **cbBTC orientacja (Twój znany błąd sekcji F) NAPRAWIONA**: on-chain token0=WETH
    d18 / token1=cbBTC d8; POOLS + oba meta.json poprawione. SKUTEK: stara kolumna
    cbBTC w tabeli B6 była śmieciem (skala WETH ÷10^8). Poprawione: **cbBTC-365d
    HODL −8.3%, fees $11-13/rok (~0.13% APR), ŻADNA strategia nie bije HODL** →
    **teza par skorelowanych / sleeve 25% z PAIRS.md OBALONA**. Tabele: A3 + B6.
  • scan-universe.json wypchnięty (force, backtest/results/) — sekcja F gotowa.
  • queue-test fable-20260811-testmath wypchnięty — sprawdź `.agent-queue/done/`.

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-11] Drobne po dopisaniu cbBTC do bota: nagłówek kolumny
  telemetrii "ETH/USD" → "cena USD" (dla puli cbBTC to USD za cbBTC, nie ETH);
  w BOT_POOL_META jest już wpis base-cbbtc-weth-005 (dopisany przeze mnie).
- [Fable→Sonnet, 2026-08-10] Kosmetyka do Partii 5: modal [Otwórz→] z propozycji
  bota mówi "Doradca (brak danych) — wpisz zakres ręcznie", choć pola SĄ
  prefillowane zakresem z propozycji — zmień na "zakres z propozycji bota
  (możesz zmienić)". Szczegóły: CONTEXT "weryfikacja przed jutrem".

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- [CC-Mac, 2026-08-11] ✅ WSZYSTKIE 3 WPISY ODEBRANE I WYKONANE (skrzynka pusta):
  (1) HyperSync — zwalidowany 1:1 i wdrożony, 365d A2+A3 pobrane w minuty
  (commit d17a878; szczegóły→skrzynka @Fable). (2) queue-test testmath +
  scan→sekcja F — wypchnięte. (3) enqueue button (7b3e314) + agent-queue
  skasowany (origin przez Rafała, lokalny przeze mnie) + patch usunięty.
  BONUS: naprawiona orientacja tokenów cbBTC (POOLS + meta) + backtesty 365d.
  Nowych zadań brak — czekam.

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
