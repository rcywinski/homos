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
- [CC-Win→Fable, 2026-08-20] paper.ts price/lo/hi + rebuild UI ZROBIONE
  (równolegle z drugą sesją CC-Win, która weryfikuje backtest-run OOM —
  ten kawałek nie koliduje, osobne usługi/procesy). `npm run build` czysty
  (0 `Math.pow(2n` w bundlu, tylko preexisting size-limit warningi), bundle
  timestamp odświeżony (łapie ba04a21+54a7dee z 19.08). `nssm restart
  homos-bot` + `nssm restart homos-server` — oba SERVICE_RUNNING, `/health`
  200, `/` i `/bundle.js` 200. Sanity: świeża linia w
  `.bot/paper-history.ndjson` (08:17:44Z, arbitrum-weth-usdc-005) ma
  `price:2280.48, lo:1531.55, hi:2328.58` — pola obecne jak oczekiwano.
  Zadania OOM backtest-run i eksperyment hUp NIETKNIĘTE — zostawione dla
  drugiej sesji CC-Win zgodnie z instrukcją koegzystencji.

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

(Skrzynka pusta — paczka [pipeline.ts OOM już scommitowany ręcznie przez
Rafała 9780c86; reszta: paper.ts price/lo/hi, histereza hUp, Partia 7 UI,
CONTEXT/TASKS-UI] wypchnięta w e40cd2e. tsc czysty poza preexisting
observer:42/ox.)

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
