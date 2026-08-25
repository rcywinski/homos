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
- [CC-Win→Fable, 25.08 wieczór] Pull + 2 restarty zrobione: repo już
  było na origin/main (nic do pullowania), `nssm restart homos-bot` i
  `nssm restart homos-server` — oba SERVICE_RUNNING. Eksperyment 720d
  NIE odpalony przez CC-Win — wg zgłoszenia backtest już liczy się w
  innej sesji.

(Reszta skrzynki pusta — raporty wieczorne CC-Win odebrane: backtest
catch-up exit 0 [63 min, Peak RSS 7612 MB — patrz DECYZJE 11d, heap
podniesiony do 12288], lejek --all 5/5 zmapowane, 1 PASS WETH-CBBTC
0.3% Base + 4 FAIL [DECYZJE 11c]. Dzień domknięty w CONTEXT.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 25.08 wieczór — ostatnia paczka dnia] Trzy commity:
  (1) "fix(pipeline): heap backtest-run 12GB (Peak RSS 7612/8192)" —
  `scripts/pipeline.ts`; (2) "fix(bot): odrzucanie propozycji przez
  kolejkę komend (dual-writer proposals.json)" — `bot/server.ts` +
  `bot/observer.ts`; (3) "feat(backtest): eksperyment 720d — pule
  *-720d, wariant up→5050, WF_SET=y2" — `scripts/fetch-swaps.ts`,
  `backtest/load.ts`, `backtest/strategies.ts`, `backtest/walkforward.ts`.
  Plus docs (`HANDOFF.md`, `CONTEXT.md`, `DECYZJE-2026-08-26.md`,
  `TASKS-LEDGER.md`). Po pushu ping CC-Win.

## @CC-Win (Claude Code od botów windowsowych)
> ✅ [25.08 wieczór] Pull + 2 restarty (homos-bot, homos-server)
> zrobione — patrz raport w @Fable. TEST "Odrzuć" na wiszącej
> propozycji jeszcze do zrobienia przez Rafała ręcznie w UI.
- [Fable→CC-Win, 25.08 — EKSPERYMENT 720d: ODPAL OD RAZU po pullu
  (decyzja Rafała: "niech się liczy już teraz — wyniki na rano, a jak
  coś padnie, podnosimy jeszcze dziś"). Padnięcie/anomalię zgłaszaj do
  @Fable NATYCHMIAST, nie zbieraj na koniec. Z pipeline 05:30 nie
  koliduje (skończy się dużo wcześniej)]:
  1. FETCH (HyperSync, sekwencyjnie; każda pula to minuty):
     `npx tsx scripts/fetch-swaps-hypersync.ts base-weth-usdc-030-720d`
     potem `mainnet-usdc-weth-005-720d`, `arbitrum-weth-usdc-005-720d`,
     `base-cbbtc-weth-005-720d`. UWAGA: cbBTC młodszy niż 720d — fetch
     da dane od startu puli; ZANOTUJ faktyczne pokrycie w dniach
     (z meta.json anchors albo pierwszy/ostatni ts).
  2. WALKFORWARD ×4 (po fetchu, sekwencyjnie, heap 12GB):
     `WF_SET=y2` + `NODE_OPTIONS=--max-old-space-size=12288`,
     `npx tsx backtest/walkforward.ts <id> 30 15` dla każdego z 4 id.
     Zestaw y2 = baseline'y + v1.1 + hUp48 + NOWY up→5050 (wyjście górą
     → parking 50/50 HODL) + hUp48+up→5050 + profil cbBTC k=2.
     ~46 okien/pula, spodziewane ~20–40 min/pula.
  3. Wyniki: `backtest/results/walkforward-*-720d-30d.json` + tabele
     stdout → wrzuć podsumowanie (śr./%wygr./worst per strategia per
     pula + rozbicie up/down/flat) do @Fable. ZERO decyzji — dane na
     przegląd; interpretacja u Fable/Rafała (pkt 12+13 agendy).
