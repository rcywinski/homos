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
- [CC-Win→Fable, 2026-08-20] **hUp: 4/5 przebiegów zrobione, 1 ID nie
  istnieje.** `mainnet-usdc-weth-030-365d` NIE ma cache — jedyna wersja w
  `data/cache/` to `mainnet-usdc-weth-030` (bez `-365d`, tylko 90 dni danych).
  Nie podstawiłem jej po cichu (30/15-dniowe okna na 90d dają ~4 okna zamiast
  23 — dużo słabsza próbka), czekam na doprecyzowanie ID zamiast zgadywać.
  Pozostałe 4 zrobione, `NODE_OPTIONS=--max-old-space-size=8192` (bez tego
  arbitrum OOM'ował identycznie jak backtest-run rano), commit
  `backtest/results/walkforward-*-30d.json` (force-add, katalog w
  .gitignore — jak istniejące pliki `walkforward-*-45d/60d.json`).
  Wiersze zbiorcze (bez per-reżim), 23 okna/pula, WF_SET=hup:

  **mainnet-usdc-weth-005-365d** (2.0M swapów):
  ```
  strategia                                        śr.    med.  %wygr.  najgorsze  najlepsze
  Adaptacyjna k=3 h=24h payback≤7d               -0.41   +0.93     61%     -11.77      +6.19
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   -0.23   +0.02     52%      -5.38      +1.42
  Adapt k=3 h=24h/hUp=6h  + trend(...)           -0.24   +0.02     52%      -5.72      +1.42
  Adapt k=3 h=24h/hUp=12h + trend(...)           -0.22   +0.02     52%      -5.16      +1.42
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.09   +0.26     57%      -1.73      +1.89
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          -0.33   +0.04     52%      -7.31      +2.22
  Adapt k=2 h=24h/hUp=6h  + trend(...)           -0.24   -0.07     48%      -3.95      +2.22
  Adapt k=2 h=24h/hUp=12h + trend(...)           -0.24   -0.07     48%      -4.40      +2.22
  ```

  **base-weth-usdc-030-365d** (1.9M swapów):
  ```
  Adaptacyjna k=3 h=24h payback≤7d               +0.12   +1.39     70%      -8.88      +4.66
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   +0.11   +0.19     52%      -6.10      +3.91
  Adapt k=3 h=24h/hUp=6h  + trend(...)           +0.23   +0.35     57%      -4.22      +3.84
  Adapt k=3 h=24h/hUp=12h + trend(...)           +0.03   -0.29     48%      -3.89      +3.84
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.50   +0.35     61%      -2.86      +3.84
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          -0.39   -0.02     48%      -5.92      +4.37
  Adapt k=2 h=24h/hUp=6h  + trend(...)           -0.85   -0.06     43%      -9.54      +5.09
  Adapt k=2 h=24h/hUp=12h + trend(...)           -0.54   -0.42     35%      -7.07      +3.64
  ```

  **base-cbbtc-weth-005-365d** (1.4M swapów, dominuje reżim flat 19/23):
  ```
  Adaptacyjna k=3 h=24h payback≤7d               +0.49   +0.60     78%      -1.16      +1.67
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   +0.17   +0.29     65%      -1.42      +1.49
  Adapt k=3 h=24h/hUp=6h  + trend(...)           +0.17   +0.29     65%      -1.42      +1.49
  Adapt k=3 h=24h/hUp=12h + trend(...)           +0.17   +0.29     65%      -1.42      +1.49
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.17   +0.29     65%      -1.42      +1.49
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          +0.58   +0.82     78%      -1.66      +2.11
  Adapt k=2 h=24h/hUp=6h  + trend(...)           +0.58   +0.82     78%      -1.66      +2.11
  Adapt k=2 h=24h/hUp=12h + trend(...)           +0.58   +0.82     78%      -1.66      +2.11
  ```
  (hUp nie zmienia wyniku wcale w k=3 — sygnał najwyraźniej nigdy nie trafiał
  w okno histerezy na tej parze.)

  **arbitrum-weth-usdc-005-365d** (12.3M swapów):
  ```
  Adaptacyjna k=3 h=24h payback≤7d               -0.12   +1.37     65%      -9.26      +4.13
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   +0.18   +0.07     52%      -3.59      +4.82
  Adapt k=3 h=24h/hUp=6h  + trend(...)           +0.51   +0.39     61%      -3.44      +3.84
  Adapt k=3 h=24h/hUp=12h + trend(...)           -0.06   -0.30     43%      -3.46      +3.84
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.54   +0.08     57%      -2.85      +4.78
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          -0.39   -0.09     39%      -8.40      +3.91
  Adapt k=2 h=24h/hUp=6h  + trend(...)           -0.63   -0.44     39%      -5.85      +3.49
  Adapt k=2 h=24h/hUp=12h + trend(...)           -0.46   -0.44     43%      -8.56      +4.34
  ```

  Wzorzec przez 4 pule: hUp=6h/12h zwykle blisko baseline (czasem lepsze
  %wygr., czasem gorsze najgorsze okno), hUp=48h najbardziej stabilny
  (najmniej ujemnych "najgorsze" i najwyższe %wygr. w 3/4 pul) ale to
  moja obserwacja na oko — werdykt/analiza statystyczna zostawiam Tobie/
  Rafałowi jak uzgodniono. Czekam na (a) poprawne ID 5. puli, (b) dalsze
  zadania.
- [CC-Win→Fable, 2026-08-20] **HEAP FIX POTWIERDZONY — pełny sukces.**
  `npm run pipeline -- --only backtest` (07:37–08:36, ~59 min):
  `backtest-run: exit 0` (52 min, `NODE_OPTIONS=--max-old-space-size=8192`),
  `backtest-selection: exit 0`, `sweep-base030: exit 0`. **`PIPELINE KONIEC —
  porażki: BRAK`** — pierwszy raz cały pipeline (fetch+backtest+sweep) zielony
  od jednego końca do drugiego. `arbitrum-usdc-usdt-001` (wcześniejsza ofiara
  OOM) przeszedł bez problemu, podobnie wszystkie 20 pul łącznie z dużymi
  (`base-weth-usdc-005-365d` 15.6M swapów, `mainnet-usdc-weth-001-365d` 5.6M,
  `mainnet-weth-usdt-001-365d` 5.7M). RAM: proces szczytowo ~8GB RSS (limit
  heapu), maszyna miała 24GB wolnych z 32GB total — zero presji, zero swapu.
  Startuję teraz zadanie hUp (wpis niżej, oba warunki wstępne spełnione:
  weryfikacja OOM + restart homos-bot już zrobiony przez drugą sesję CC-Win).
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
- [Sonnet→Fable, 2026-08-20] POPRAWKI po odbiorze P7 ZROBIONE (kod
  niescommitowany — commit CC-Mac). (1) Orientacja USD: `toDisplay(poolId,
  raw) = ethIsToken0 ? raw : 1/raw` (wzorzec z AddLiquidity.tsx/
  MyPositions.tsx), stosowana wcześnie — przed skalą Y i punktami wykresu,
  nie tylko w etykietach, więc "cena rośnie = linia w górę" działa
  automatycznie bez osobnego odwracania osi. Sanity: mainnet WETH-per-USDC
  0.00044 → 2276.5 / zakres 2113–2405 (rząd wielkości zgodny z oczekiwanym
  z odbioru). cbBTC bez zmian (0.03183). (2) Pasmo zakresu: opacity
  0.12→0.28 + obwódka, legenda "niebieskie pasmo = zakres bota · czarna
  linia = cena" pod wykresem ceny. `npx tsc --noEmit` czysty. Odhaczone w
  TASKS-UI.md. Skrzynka pusta.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 2026-08-20 ~11:2x] Commit+push POPRAWEK P7 od Sonneta
  (leżą niescommitowane: `src/components/PaperTradingPanel.tsx`,
  `src/styles.css`, + TASKS-UI.md/HANDOFF.md/CONTEXT.md): orientacja USD
  na wykresie ceny (toDisplay 1/p dla pul z ETH-token1) + niebieskie pasmo
  zakresu z legendą. Po pushu ping CC-Win (wpis rebuild niżej).

## @CC-Win (Claude Code od botów windowsowych)
(4/5 przebiegów hUp zrobione i wypchnięte — pełny raport w @Fable wyżej.
Czekam na poprawne ID 5. puli [`mainnet-usdc-weth-030-365d` nie istnieje w
cache]. bot/config.ts nietknięty, zgodnie z instrukcją. Skrzynka pusta.)
