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
- [Sonnet→Fable, 2026-08-20] PARTIA 7 ZROBIONA (kod niescommitowany — commit
  CC-Mac). `useBotApi.ts`: `PaperHistoryPoint.price?/lo?/hi?`. W
  `PaperTradingPanel.tsx`: cieniowanie stanów (żółte=poza zakresem,
  szare=cash) na sparkline equity-vs-HODL, nowy `PriceRangeChart` (pasmo
  lo–hi schodkowe per rebalans, linia ceny w ciągłych odcinkach — przerwa
  tylko tam gdzie stare próbki nie mają `price`), znaczniki
  EXIT_TREND/REENTRY/REBALANCE na obu wykresach. Brak `price` → wykres się
  nie renderuje (cicho, bez notki). CSS `paper-range-*`. Odhaczone w
  TASKS-UI.md. `npx tsc --noEmit` czysty. Skrzynka pusta.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 2026-08-20] Commit+push PACZKI (razem, jeden ping CC-Win):
  (1) `scripts/pipeline.ts` — fix OOM backtest-run (decyzja Rafała: heap
  8GB): runStep przyjmuje `extraEnv`, backtest-run dostaje
  `NODE_OPTIONS=--max-old-space-size=8192` (doklejane do istniejących);
  (2) `bot/paper.ts` — próbki history dostają `price` + `lo`/`hi` (human,
  lo/hi tylko przy status='open') pod Partię 7 UI; (3) `backtest/
  strategies.ts` + `backtest/walkforward.ts` — eksperyment ASYMETRYCZNEJ
  histerezy (`hysteresisUpSec`, zestaw `WF_SET=hup`; zlecenie Rafała 20.08,
  smoke test 3 okna przeszedł u Fable); (4) `TASKS-UI.md` (Partia 7) +
  `HANDOFF.md` + `CONTEXT.md`. tsc czysty (poza preexisting observer:42).
  Po pushu ping CC-Win (wpisy niżej już czekają).

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
- [Fable→CC-Win, 2026-08-20] W TEJ SAMEJ paczce jest zmiana `bot/paper.ts`
  (próbki history dostają price/lo/hi pod wykresy zakresu w UI) → po pullu
  z pkt wyżej dodatkowo `nssm restart homos-bot` i sanity: świeża linia w
  `.bot/paper-history.ndjson` ma pola `price` (+`lo`/`hi` dla pul open).
  Przy okazji łapiesz zaległy rebuild UI (ba04a21+54a7dee z 19.08).
- [Fable→CC-Win, 2026-08-20] ZADANIE NASTĘPNE W KOLEJCE (Rafał: NIE
  równolegle — zacznij dopiero PO domknięciu weryfikacji heapu backtest-run
  i restarcie homos-bot z wpisów wyżej; oba zadania są RAM/CPU-ciężkie):
  EKSPERYMENT hUp (asymetryczna histereza; zlecenie Rafała, kod w tej samej
  paczce, smoke test OK). Na TWOIM świeżym cache (obejmuje pompę 19–20.08 —
  to ważne, cache Maca kończy się 11.08), poza oknami pipeline'u,
  5 przebiegów (PowerShell: `$env:WF_SET='hup'`):
  `npx tsx backtest/walkforward.ts <id> 30 15` dla: mainnet-usdc-weth-030-365d,
  mainnet-usdc-weth-005-365d, base-weth-usdc-030-365d,
  base-cbbtc-weth-005-365d, arbitrum-weth-usdc-005-365d.
  Wyniki: commit `backtest/results/walkforward-*-30d.json` + wklej do
  @Fable per pula TYLKO wiersze zbiorcze (bez per-reżim) — analiza i
  werdykt u Fable/Rafała. NIE zmieniać nic w bot/config.ts — v1.2 zostaje
  zamrożony do decyzji.
