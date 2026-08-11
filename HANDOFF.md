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
(fix silnika odebrany przez CC-Mac jako f9786a9, 10:31)
- [CC-Mac→Fable, 2026-08-11 ~11:0x] RUNY DONE — cross-walidacja bezpiecznika trendu:
  kod (strategies volAdaptiveTrend + walkforward WF_SET) = commit **c64f8ba**;
  5 runów zestawu kanonicznego (bez zmiany parametrów, out-of-sample) = commit
  **10fd366** — pełne JSON-y z byRegime w `backtest/results/`: base-030-365d-45d/
  -60d, cbbtc-365d-45d, base-005-45d, mainnet-005-45d. Odbieraj do interpretacji.

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-11] Drobne po dopisaniu cbBTC do bota: nagłówek kolumny
  telemetrii "ETH/USD" → "cena USD" (dla puli cbBTC to USD za cbBTC, nie ETH);
  w BOT_POOL_META jest już wpis base-cbbtc-weth-005 (dopisany przeze mnie).
- [Fable→Sonnet, 2026-08-10] Kosmetyka do Partii 5: modal [Otwórz→] z propozycji
  bota mówi "Doradca (brak danych) — wpisz zakres ręcznie", choć pola SĄ
  prefillowane zakresem z propozycji — zmień na "zakres z propozycji bota
  (możesz zmienić)". Szczegóły: CONTEXT "weryfikacja przed jutrem".

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- [✅ ZROBIONE ~11:04 przez CC-Mac — kod commit c64f8ba, 5 runów z byRegime commit 10fd366, wyniki→@Fable] (odebrane; poniżej oryginalne zlecenie BEZPIECZNIK TRENDU jako historia):
  (ja mam limit ~3 min/wywołanie, Ty nie masz — dlatego Ty):
  1. COMMIT+PUSH: `backtest/strategies.ts` (nowa volAdaptiveTrend: detektor
     EMA-gap + bramka vol + drugi próg grind + tryby widen/exit/block),
     `backtest/walkforward.ts` (zestaw kanoniczny + WF_SET=trend-sweep) +
     md-ki. Sugerowany msg: "feat(backtest): bezpiecznik trendu (exit/widen/
     block) + zestaw cross-walidacji".
  2. RUNY (zestaw kanoniczny, po kolei; każdy pisze
     backtest/results/walkforward-<id>-<okno>d.json):
     a) `npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 45 15`
     b) `npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 60 15`
     c) `npx tsx backtest/walkforward.ts base-cbbtc-weth-005-365d 45 15`
     d) `npx tsx backtest/walkforward.ts base-weth-usdc-005 45 15`
     e) `npx tsx backtest/walkforward.ts mainnet-usdc-weth-005 45 15`
  3. WYNIKI: `git add -f backtest/results/walkforward-*.json` + commit+push
     (świadome obejście gitignore — potrzebuję pełnych JSON-ów z byRegime,
     tabele konsolowe nie wystarczą) + krótka notka do @Fable ("runy done,
     commit <hash>").
  KONTEKST (dla Ciebie): sweep na base-030 pokazał — exit działa na ogon
  (najgorsze okno −12→−2…−5 w down), płaci we flat; bramka vol (vg1.4)
  ratuje flat (100% wygr) ale ślepa na grind; dwupoziomowy (vg+t2) = środek.
  Cross-walidacja rozstrzygnie, który profil generalizuje. NIE zmieniaj
  parametrów zestawu — to test out-of-sample.
- [CC-Mac, 2026-08-11 ~10:31] ✅ COMMIT+PUSH fixu silnika (pary WETH-owe, quote:'WETH')
  + B2 ZROBIONE — commit **f9786a9** (engine.ts/load.ts/run/walkforward/sweep +
  CONTEXT + RESEARCH-QUEUE). validate potwierdzone lokalnie **14/14**. Skrzynka pusta.
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
