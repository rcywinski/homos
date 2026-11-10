# Context sample: haiku vs sonnet (20 chunks)

| model | chunks | cost USD | input | cache write | cache read | output | wall s |
|---|---|---|---|---|---|---|---|
| claude-haiku-5-5 | 20 | 0.019 | 17916 | 111218 | 133855 | 4016 | 9 |
| claude-sonnet-5-5 | 20 | 0.3702 | 17916 | 111218 | 133855 | 2956 | 12 |

Identifier check is mechanical (regex): it lists ids, pairs and names found in the chunk but missing from the context.

## `journal/CONTEXT.md:1`

no date | journal-section | CONTEXT.md — żywy dziennik projektu HOMOS v2

> # CONTEXT.md — żywy dziennik projektu HOMOS v2 > **Instrukcja dla każdej sesji AI/agenta:** przeczytaj ten plik PRZED jakąkolwiek pracą. > Nie zwiedzaj repo od zera. Po zakończeniu sesji DOPISZ wpis do dziennika (sekcja 4). > Pełny plan projektu: `PLAN.md`.

- **haiku**: 2026-08-01 is not in the chunk, so I cannot date it. The header and text carry no date. Undated: Working journal CONTEXT.md for HOMOS v2, a Uniswap v3 LP research project; instructs every AI session to read it before work, append an entry to section 4 afterwards, and see PLAN.md for the full plan.
  - identifiers missing: AI/agenta
- **sonnet**: Undated: opening header of journal/CONTEXT.md, the living working journal of HOMOS v2. It instructs every AI session or agent to read the file before any work, not to explore the repo from scratch, and to append a journal entry in section 4 after finishing. It points to PLAN.md for the full project plan.
  - identifiers missing: AI/agenta

## `journal/DECYZJE-2026-08-26.md:226`

no date | note-section | 6. Pyłki mainnet #953465 (~$95) i #953427 (~$2)

> ## 6. Pyłki mainnet #953465 (~$95) i #953427 (~$2) Rekomendacja z 19.08: #953465 zamknąć przy tanim gazie, #953427 zostawić (nie warty gazu). Od 20.08 wieczór obie pozycje mają śledzenie equity/HODL — 26.08 będzie tydzień danych do potwierdzenia, że fees (~$5.3 nieodebranych łącznie) nie uzasadniają utrzymywania. **25.08: TANI GAZ JEST TERAZ** — Rabby pokazał collect na mainnet za $0.27 przy 0.75 ...

- **haiku**: 2026-08-25 — Journal section on closing two dust Uniswap v3 mainnet positions, #953465 (~$95) and #953427 (~$2), recorded as closed via the app on 25 Aug after cheap gas (~$0.27 at 0.75 Gwei). Notes the first live CloseModal test on #953427 and an unobserved UX step flow; amounts pending the backfill fix in the ledger.
  - identifiers missing: equity/HODL, Kwoty/fees
- **sonnet**: 2026-08-26: Decision-journal section 6 on the two small mainnet dust positions #953465 (~$95) and #953427 (~$2). Both were closed through the app on 25 Aug, taking advantage of cheap gas (collect ~$0.27 at 0.75 Gwei). #953427 was the first live test of CloseModal. Only a formal tick-off remains; amounts will come from the ledger after the backfill fix.
  - identifiers missing: equity/HODL, Kwoty/fees

## `journal/CONTEXT.md:798#p2`

2026-09-02 | journal-entry | 2026-09-02 ~przedpołudnie — Brief + ŚWIEŻE SPOJRZENIE NA ZYSKI (Fable + Rafał): kształt szerokiej no

> 2026-09-02 ~przedpołudnie — Brief + ŚWIEŻE SPOJRZENIE NA ZYSKI (Fable + Rafał): kształt szerokiej nogi do bramki, Aerodrome sprawdzony, benchmark „HODL+yield" SMOKE (kontener, cache 365d do 11.08, grid15, $2500) — ILUSTRACJA, nie bramka: base-030 (rok −54.8% ETH): Pasywny ±50% vsHODL −$329 (inRange 32%!), −50/+50 −$151, −60/+35 +$123, −65/+30 +$209, −70/+25 +$271, hybryda z idle −65/+30 +$397; ba ...

- **haiku**: 2026-09-02 Polish journal entry on the afternoon brief and profit review: smoke results for asymmetric wide ranges (base-030, cbBTC), Aerodrome checked against Uniswap v3 (WETH/USDC not worth it, cbBTC/WETH unresolved), and the wide-ranking and wide-collect pipeline builds. Covers the 720-day walk-forward shape test ahead of the 24.09 exit decision.
  - identifiers missing: bot/wide, api/wide, 365d/720d, ETH/stable, krypto/krypto, LP/HODL, scripts/wide, BTC/USD, kolektor/runda, BOT_POOLS, WF_SET, vsHODL, inRange, flatOnlyLP, botPoolId, underlyingTokens, getPool, quoteRefAssetIsToken0
- **sonnet**: 2026-09-02: Journal entry on asymmetric wide-range shapes: SMOKE backtest on base-030 and cbBTC (asym −65/+30 hybrid best, year-down caveat, 720d walkforward decides), flatOnlyLP idle:'passive' engine flag, Ranking WIDE (wide-score.ts, /api/wide-ranking, UI batch 21), 365d/720d columns, wide-collect.ts Tier 2 funnel.
  - identifiers missing: bot/wide, ETH/stable, krypto/krypto, LP/HODL, scripts/wide, BTC/USD, kolektor/runda, BOT_POOLS, WF_SET, vsHODL, inRange, botPoolId, underlyingTokens, getPool, quoteRefAssetIsToken0

## `journal/CONTEXT.md:3682`

2026-08-12 | journal-entry | 2026-08-12 — Sesja Fable-desktop: ALGORITHM v1.1 WDROŻONY DO ŻYWEGO BOTA

> ### 2026-08-12 — Sesja Fable-desktop: ALGORITHM v1.1 WDROŻONY DO ŻYWEGO BOTA Zaplanowana sesja botowa wykonana w całości (typecheck: tylko znane preexisting; smoke-test serwera lokalnie OK, traversal zablokowany): 1. **Bezpiecznik EXIT_TREND w observerze**: EMA log-ceny WZGLĘDNEJ pary    (HL 7d, konfig TREND w bot/config.ts), aktualizacja w pętli cen 60s,    stan persystowany w `.bot/trend-state.j ...

- **haiku**: 2026-08-12 — Polish journal entry (Fable-desktop session) recording deployment of ALGORITHM v1.1 to the live bot: EXIT_TREND breaker in observer (7d EMA of log-price gap, state in .bot/trend-state.json, trendReentry aboveEma/half), .bot/history.ndjson snapshots and /api/history, Arbitrum arbitrum-weth-usdc-005 added to BOT_POOLS, and k per class (ADVISOR_PARAMS.k 2→3, advisorK=2 for cbBTC). Files: advisor.ts, bot/config.ts, src/config/botPools.ts.
  - identifiers missing: api/results, BLOCK_TIME, GAS_USD, trendGapPct, trendDown, poolId, volDaily, feeYieldDaily, rangeLo, rangeHi, emaGapPct, getLogs, suggestRange
- **sonnet**: 2026-08-12: Journal entry on deploying ALGORITHM v1.1 to the live observer bot (Fable-desktop session). Covers the EXIT_TREND breaker (EMA half-life 7d, `.bot/trend-state.json`, gap < −5%, trendReentry aboveEma/half), `.bot/history.ndjson` with `/api/history` and `/api/results/:name`, arbitrum-weth-usdc-005 in BOT_POOLS, and k=3 (advisorK=2 for cbBTC).
  - identifiers missing: bot/config, src/config, BLOCK_TIME, GAS_USD, ADVISOR_PARAMS, trendGapPct, trendDown, poolId, volDaily, feeYieldDaily, rangeLo, rangeHi, emaGapPct, botPools, getLogs, suggestRange

## `journal/CONTEXT.md:2796#p2`

2026-08-10 | journal-entry | 2026-08-10 — Sesja UI (Sonnet) — Partia 3: akcje na kartach kokpitu + telemetria bota ✅

> 2026-08-10 — Sesja UI (Sonnet) — Partia 3: akcje na kartach kokpitu + telemetria bota ✅ - **`src/components/CockpitPositionActions.tsx`** (nowy): przyciski [💰 Zbierz   fees] (szary+tooltip poniżej progu) / [⏹ Zamknij] (modal: suwak+presety   25/50/100%, slippage, podgląd kwot z min-po-slippage — `previewClose()`   liczy dokładnie tę samą formułę co `prepareRemoveLiquidityTransaction`) /   [🔄 Re ...

- **haiku**: 2026-08-10 — UI session (Sonnet), Batch 3 of the cockpit: position action cards (collect fees, close with 2 steps, manual rebalance) and bot telemetry section. Files: CockpitPositionActions.tsx, BotTelemetry.tsx, useCockpitActions.ts, useBotApi.ts, App.tsx, styles.css; bot/observer.ts, advisor.ts. Next: live test of "Zamknij" on a small position.
  - identifiers missing: 25/50, pula/ETH, USD/tick, api/state, src/hooks, src/App, src/styles, previewClose, prepareRemoveLiquidityTransaction, createPosition, prepareAddLiquidityTransaction, ethUsd, ethIsToken0, defaultExpanded, noEmit
- **sonnet**: 2026-08-10: UI session (Sonnet), Partia 3, cockpit work: new CockpitPositionActions.tsx (collect fees, close, manual rebalance as separate operations; full close+swap+mint builder left to the analytical session), BotTelemetry.tsx (fix for 401 via "Surowy JSON" modal), useBotApi.ts types, App.tsx, styles.css. Typecheck: 0 errors in src/. Next: live-test actions.
  - identifiers missing: 25/50, pula/ETH, USD/tick, bot/observer, api/state, src/hooks, src/App, src/styles, previewClose, prepareRemoveLiquidityTransaction, createPosition, prepareAddLiquidityTransaction, ethUsd, ethIsToken0, defaultExpanded, noEmit

## `journal/TASKS-WINDOWS.md:10`

no date | queue-section | Zasady bezpieczeństwa (nadrzędne)

> ## Zasady bezpieczeństwa (nadrzędne) - Tryb OBSERWUJ nie potrzebuje ŻADNYCH kluczy prywatnych — nie twórz, nie proś,   nie zapisuj żadnych sekretów portfela. Jedyne sekrety: opcjonalny TG_TOKEN   (Telegram) i BOT_API_TOKEN (wymyśl losowy) — wpisuje je użytkownik do .env. - Żadnego port-forwardingu na routerze; API tylko LAN+VPN (firewall wg instrukcji).

- **haiku**: Undated: Windows task journal, safety rules for the observer mode of the HOMOS bot: no private keys needed, only optional TG_TOKEN (Telegram) and BOT_API_TOKEN set by the user in .env, no router port forwarding, API reachable only over LAN and VPN with firewall setup per the instructions. Polish text, file journal/TASKS-WINDOWS.md.
  - identifiers missing: none
- **sonnet**: Undated: Overriding safety rules section of journal/TASKS-WINDOWS.md for the Windows observer bot (OBSERWUJ / observe mode): no private keys or wallet secrets are created or stored; only optional TG_TOKEN (Telegram) and a random BOT_API_TOKEN go in .env; no router port-forwarding, API on LAN+VPN only.
  - identifiers missing: none

## `journal/RESEARCH-QUEUE.md:1155`

no date | queue-section | E6b. KSZTAŁT SZEROKIEJ NOGI (02.09, brief „świeże spojrzenie" — decyzja Rafała: koniecznie)

> ### E6b. KSZTAŁT SZEROKIEJ NOGI (02.09, brief „świeże spojrzenie" — decyzja Rafała: koniecznie) - [ ] **Krzywy przedział**: produktowe „±50%" = −33/+50 w cenie (log-symetria       w rangeAround i advisor.suggestFixedRange). Warianty −50/+50, −60/+35,       −65/+30, −70/+25 (cbBTC: −40/+40, −50/+30, −55/+25) + hybrydy z idle       asym. Kod: FP_SET/WF_SET=shape. Bramka: walkforward 720d u CC-Win.   ...

- **haiku**: 2026-09-02 Journal research-queue item E6b on the wide-leg shape (Polish): tests of asymmetric versus symmetric price ranges for the ±50% WETH/USDC and ±40% cbBTC legs on 720-day walk-forward, pools base-030, mainnet-005, arbitrum-005. Barbell closed 02.09. Symmetric −50/+50 later beat the product ±50% on 4/4 pools (03.09). Mentions Aerodrome Slipstream, FLAT/WF_SET, bot config, flatOnlyLP.
  - identifiers missing: bot/config, down/up, pp/okno, cbBTC/WETH, 365d/720d, 50/50, lokaty/ETF, FP_SET, rangeAround, suggestFixedRange, productIdleWidthPct, vsHODL, wstETH
- **sonnet**: Undated (entries from 2026-09-02 and 2026-09-03): RESEARCH-QUEUE.md, item E6b on the wide-leg range shape. The skewed range closed on 03.09: symmetric −50/+50 beat the product's "±50%" (−33/+50) on 4/4 pools (base-030, cbBTC, mainnet-005, arbitrum-005), making it a "product v2" candidate only if the LP survives past 24.09. Barbell closed; Aerodrome and the flatOnlyLP flag remain open.
  - identifiers missing: bot/config, down/up, pp/okno, WETH/USDC, cbBTC/WETH, 365d/720d, 50/50, lokaty/ETF, FP_SET, WF_SET, rangeAround, suggestFixedRange, productIdleWidthPct, vsHODL, wstETH

## `journal/TASKS-UI.md:57`

no date | queue-section | #3 Wskaźnik zdrowia systemu — zrobione

> ### #3 Wskaźnik zdrowia systemu — zrobione - `src/components/BotStatusDot.tsx` (nowy, reużywany): kropka w nagłówku   aplikacji (App.tsx, obok CompactWalletInfo) ORAZ w nagłówku kokpitu — ten sam   `useBotApi()` stan (jeden poll na sesję, nie dwa niezależne).

- **haiku**: Undated: Journal task #3 (TASKS-UI.md), marked done: new reusable BotStatusDot.tsx component shows a system-health dot in both the App.tsx header (next to CompactWalletInfo) and the cockpit header, both reading one shared useBotApi() state with a single poll per session.
  - identifiers missing: none
- **sonnet**: Undated: journal/TASKS-UI.md, task #3 "system health indicator", marked done. Records the new reusable component `src/components/BotStatusDot.tsx`, a status dot shown in the app header (App.tsx, next to CompactWalletInfo) and in the cockpit header, both sharing one `useBotApi()` state (one poll per session).
  - identifiers missing: none

## `journal/reports/morning-2026-08-23.md:3`

2026-08-23 | report-section | Świeżość danych

> ## Świeżość danych - universe.json: 1.2h - swap cache: 1.1h (najświeższy)

- **haiku**: 2026-08-23 — Morning report (Windows, 08:45): data freshness check. universe.json is 1.2 h old, and the swap cache is 1.1 h old, the freshest. Relates to the pipeline run, selector and paper trading on pools such as WETH-USDC@Base and cbBTC/WETH.
  - identifiers missing: none
- **sonnet**: 2026-08-23: Data-freshness section of the automatic morning report (HOMOS, 08:45, Windows). It states that universe.json is 1.2 h old and the swap cache is 1.1 h old (the freshest), so both inputs are current for that day's pipeline and pool selector.
  - identifiers missing: none

## `journal/reports/morning-2026-08-27.md:51`

2026-08-27 | report-section | pipeline-task.log (tail)

> ## pipeline-task.log (tail) ``` 2026-08-27T03:43:25.042Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-08-27T03:43:28.523Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1787802205042.log) 2026-08-27T03:43:28.525Z świeżość swap cache: OK=[arbitrum-usdc-usdt-001, arbitrum-weth-usdc-005-365d, arbitrum-weth-usdc-005-720d, arbitrum-weth-usdc-030-365d ...

- **haiku**: 2026-08-27: Pipeline task log tail from the 07:30 morning report of HOMOS, Polish journal. Shows the nightly run finishing with no failures: backtests hs-base-cbbtc-weth-005-720d, candidate-funnel, backtest-run, backtest-selection and sweep-base030. Swap cache freshness lists OK and BRAKI pools, including cand-base-weth-cbbtc-030 and cand-base-weth-usdc-005.
  - identifiers missing: none
- **sonnet**: 2026-08-27: Tail of pipeline-task.log in the 07:30 morning report. The nightly pipeline's last steps all exited 0: hs-base-cbbtc-weth-005-720d, swap-cache freshness check (five cand-* pools missing, e.g. cand-base-weth-cbbtc-030), candidate-funnel, backtest-run, backtest-selection, sweep-base030. It ended with "PIPELINE KONIEC — porażki: BRAK" (no failures).
  - identifiers missing: none

## `journal/reports/morning-2026-08-31.md:7#p2`

2026-08-31 | report-section | pipeline.log (ostatni przebieg)

> pipeline.log (ostatni przebieg) (log: data\pipeline-logs\hs-base-weth-usdc-030-720d-1788147740065.log) 2026-08-31T03:42:24.250Z ▶ hs-mainnet-usdc-weth-005-720d (podejście 1/2) 2026-08-31T03:42:26.324Z krok hs-mainnet-usdc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-mainnet-usdc-weth-005-720d-1788147744250.log) 2026-08-31T03:42:26.324Z ▶ hs-arbitrum-weth-usdc-005-720d (podejście 1/2) 2026-08 ...

- **haiku**: 2026-08-31 Morning pipeline log (Windows 07:30 auto report): nightly run of HyperSync backtests (hs-* steps for mainnet, Arbitrum, Optimism and Base pools, 365d and 720d windows) finished with no failures. Lists swap-cache freshness, candidate-funnel, backtest-run, backtest-selection and sweep-base030 steps, plus the BRAKI cand-* entries and the 2026-08-31T05:13Z end marker.
  - identifiers missing: none
- **sonnet**: 2026-08-31: Tail of the morning report's pipeline.log: the final steps hs-base-weth-usdc-030-720d through hs-base-cbbtc-weth-005-720d, swap-cache freshness check (missing cand-* caches), candidate-funnel, backtest-run, backtest-selection and sweep-base030. All exited 0; the pipeline ended with no failures.
  - identifiers missing: none

## `journal/KAPITAL-REKOMENDACJA.md:33`

no date | note-section | 2. Transza 1 — $6 000 (struktura)

> ## 2. Transza 1 — $6 000 (struktura) | gdzie | kwota | uzasadnienie | |---|---|---| | **base-weth-usdc-005** | **$2 500** | Rdzeń ETH/stable: bramka pass, stable = poduszka (down med. −64% APR to głównie beta ETH połowy pozycji), gaz Base pomijalny, czysty exit-trend bez operacyjki hedge | | **base-cbbtc-weth-005** | **$1 500** | Sleeve "correlated": najlepsza alfa LP w całym zestawie (+11.4 vsHO ...

- **haiku**: Undated: Journal section on Transza 1 ($6,000) allocation: $2,500 to base-weth-usdc-005 (ETH/stable core), $1,500 to base-cbbtc-weth-005 (correlated sleeve), $2,000 stable reserve. Excluded for now: base-030 with hedge-excess (manual GMX short), mainnet-005, and arbitrum-005 (paper only).
  - identifiers missing: vsHODL/365d, vsHODL
- **sonnet**: Undated: journal file KAPITAL-REKOMENDACJA.md, section 2, Tranche 1 ($6,000) allocation: $2,500 in base-weth-usdc-005 (ETH/stable core), $1,500 in base-cbbtc-weth-005 (correlated sleeve, deliberately smaller), $2,000 stable reserve in wallet. Excluded: base-030 with hedge-excess (manual GMX short, operational risk), mainnet-005 (59% win), arbitrum-005 (worst −3.5).
  - identifiers missing: vsHODL/365d, vsHODL

## `journal/reports/morning-2026-09-03.md:181`

2026-09-03 | report-section | trend-state.json

> ## trend-state.json ```json {   "mainnet-usdc-weth-030": {     "ema": 7.741188020882854,     "lastTs": 1788413012407,     "down": false   },   "mainnet-usdc-weth-005": {     "ema": 7.74132734121015,     "lastTs": 1788412952063,     "down": false   },   "base-weth-usdc-030": {     "ema": 7.741224638315501,     "lastTs": 1788412952233,     "down": false   },   "arbitrum-weth-usdc-005": {     "ema":  ...

- **haiku**: 2026-09-03 trend-state.json from the morning report: EMA trend state for six pools (mainnet-usdc-weth-030/005, base-weth-usdc-030, arbitrum-weth-usdc-005, base-cbbtc-weth-005, base-weth-cbbtc-030), all with down=false. Used by the trend breaker, which exits on a 5% break below the 7-day EMA. Dziennik stanu EMA.
  - identifiers missing: lastTs
- **sonnet**: 2026-09-03: Morning report section showing trend-state.json, the trend-breaker EMA state for six pools (mainnet-usdc-weth-030, mainnet-usdc-weth-005, base-weth-usdc-030, arbitrum-weth-usdc-005, base-cbbtc-weth-005, base-weth-cbbtc-030). All have down: false, so no breaker was triggered.
  - identifiers missing: lastTs

## `journal/reports/morning-2026-09-10.md:101`

2026-09-10 | report-section | propozycje OPEN (2)

> ## propozycje OPEN (2) ```json [   {     "id": "open-49717ee2-9808-4288-b76d-e658195b7979",     "createdAt": "2026-09-09T04:35:54.627Z",     "kind": "OPEN",     "action": "OTWÓRZ USDC-WETH 0.3% @ Ethereum (7d śr. 18.0% APR, w topie 3d)",     "tokenId": "",     "poolId": "mainnet-usdc-weth-030",     "llamaPool": "49717ee2-9808-4288-b76d-e658195b7979",     "symbol": "USDC-WETH",     "chain": "Ethere ...

- **haiku**: 2026-09-10 Morning report, section "propozycje OPEN (2)": two pending bot proposals to open positions. USDC-WETH 0.3% on Ethereum (poolId mainnet-usdc-weth-030, 7d avg 18.0% APR, created 2026-09-09, no range set; manual range needed). WETH-USDC 0.05% on Arbitrum (poolId arbitrum-weth-usdc-005, 7d avg 18.6% APR, created 2026-09-10, suggested ticks -199850 to -196500).
  - identifiers missing: createdAt, tokenId, llamaPool, suggestedRange, tickLower, tickUpper, usdLo, usdHi
- **sonnet**: 2026-09-10: Morning report section "propozycje OPEN (2)" listing two open OPEN proposals. One is USDC-WETH 0.3% on Ethereum (mainnet-usdc-weth-030, 7d APR 18.0%, no advisor stats, range to be set manually). The other is WETH-USDC 0.05% on Arbitrum (arbitrum-weth-usdc-005, 18.6% APR, suggested ticks -199850 to -196500).
  - identifiers missing: createdAt, tokenId, poolId, llamaPool, suggestedRange, tickLower, tickUpper, usdLo, usdHi

## `journal/reports/morning-2026-09-07.md:7#p1`

2026-09-07 | report-section | pipeline.log (ostatni przebieg)

> pipeline.log (ostatni przebieg) ``` 2026-09-07T03:42:23.895Z ▶ hs-mainnet-wsteth-weth-001 (podejście 1/2) 2026-09-07T03:42:25.416Z krok hs-mainnet-wsteth-weth-001: exit 0 (log: data\pipeline-logs\hs-mainnet-wsteth-weth-001-1788752543895.log) 2026-09-07T03:42:25.416Z ▶ hs-mainnet-tbtc-wbtc-001 (podejście 1/2) 2026-09-07T03:42:27.844Z krok hs-mainnet-tbtc-wbtc-001: exit 0 (log: data\pipeline-logs\h ...

- **haiku**: 2026-09-07 Polish pipeline.log from the HOMOS morning report (auto, Windows), last run: hs-mainnet-wsteth-weth-001, hs-mainnet-tbtc-wbtc-001, hs-mainnet-wbtc-usdc-030, hs-arbitrum-weth-usdc-005-365d, hs-optimism-weth-usdc-030-365d, hs-arbitrum-weth-usdc-030-365d, hs-mainnet-weth-usdt-001-365d, hs-mainnet-usdc-weth-001-365d, hs-base-weth-usdc-030-720d, hs-mainnet-usdc-weth-005-720d, hs-mainnet-usdc-weth-030-720d, hs-arbitrum-weth-usdc-005-720d; all steps exit 0.
  - identifiers missing: none
- **sonnet**: 2026-09-07: Morning report excerpt, first part of the pipeline.log from the last run (03:42 UTC). It lists HyperSync data-fetch steps (hs-*) for pools such as wsteth-weth, tbtc-wbtc, wbtc-usdc, weth-usdc and usdc-weth on mainnet, Arbitrum, Optimism and Base, all at attempt 1/2 and all exit 0.
  - identifiers missing: none

## `journal/reports/morning-2026-09-13.md:254`

2026-09-13 | report-section | BILANS TRANSZY — Transza 1

> ## BILANS TRANSZY — Transza 1 | pozycja bilansu | kwota | |---|---| | wpłacone (2026-08-27) | $6092.00 | | dziś w pozycjach LP | $5772.63 | | dziś w portfelu (bufor + gaz) | $237.10 | | **razem dziś** | **$6009.73** | | **różnica vs wpłacone** | **$-82.27 (-1.35%)** | | — z tego ruch rynku na LP | $-120.69 | | — z tego reszta (koszty wejścia + beta bufora) | +$38.42 | | &nbsp;&nbsp;• koszty wejśc ...

- **haiku**: 2026-09-13 Morning report balance for Transza 1 (tranche 1) on the HOMOS project: deposited $6092 USDC on 2026-08-27, $6009.73 total today, a difference of -$82.27 (-1.35%). Breakdown: LP market move -$120.69, entry costs +$27.37, buffer beta +$11.05, gas $3.65 (informational). Wallet buffer and gas, Base.
  - identifiers missing: cbBTC
- **sonnet**: 2026-09-13: Morning report section "BILANS TRANSZY — Transza 1", the tranche balance reconciliation. Deposit $6092 (2026-08-27); today $6009.73 total ($5772.63 in LP positions, $237.10 wallet buffer), a difference of −$82.27 (−1.35%): LP market move −$120.69, entry costs +$27.37, buffer beta +$11.05.
  - identifiers missing: cbBTC

## `journal/reports/morning-2026-09-17.md:7#p2`

2026-09-17 | report-section | pipeline.log (ostatni przebieg)

> pipeline.log (ostatni przebieg) 2026-09-17T03:43:01.465Z krok hs-arbitrum-weth-usdc-005-720d: exit 0 (log: data\pipeline-logs\hs-arbitrum-weth-usdc-005-720d-1789616556310.log) 2026-09-17T03:43:01.465Z ▶ hs-base-cbbtc-weth-005-720d (podejście 1/2) 2026-09-17T03:43:04.823Z krok hs-base-cbbtc-weth-005-720d: exit 0 (log: data\pipeline-logs\hs-base-cbbtc-weth-005-720d-1789616581465.log) 2026-09-17T03: ...

- **haiku**: 2026-09-17: Morning pipeline log for HOMOS (Polish), final run ending 05:11 with no failures. It lists the swap-level backtest steps (hs-mainnet-wsteth-weth-001, hs-arbitrum-weth-usdc-005-365d, hs-base-cbbtc-weth-005-720d and others), the swap-cache freshness check with BRAKI candidates, and the wide-score, wide-daily, candidate-funnel, backtest-run, backtest-selection and sweep-base030 steps.
  - identifiers missing: none
- **sonnet**: 2026-09-17: Tail of the pipeline.log in the morning report. The hs-arbitrum-weth-usdc-005-720d and hs-base-cbbtc-weth-005-720d steps ran, then the swap cache freshness check (OK list, BRAKI list of missing cand-* caches), wide-score, wide-daily, candidate-funnel, backtest-run, backtest-selection and sweep-base030. All exited 0; the pipeline ended with no failures.
  - identifiers missing: none

## `docs/DECISION-LOG.md:28`

2026-09-11 | decision | Decision of 2026-09-11

> Decision of 2026-09-11: **Close the narrowing episode** (trend breaker fired on cbBTC): sign the widening; reject both emergency options (short on GMX, exit to cash). Product unchanged. Evidence / rationale: Signal only on the crypto/crypto leg; on such a pair LP and HODL share the same USD beta. Episode: 11 days in flat, ≈ $8.6 fees, −$32 vs HODL.

- **haiku**: 2026-09-11 DECISION-LOG entry closing the narrowing episode on the cbBTC leg of the HOMOS Uniswap v3 project: the trend breaker fired, the widening was signed, and the short-on-GMX and exit-to-cash options were rejected. Episode: 11 days in flat, about $8.6 fees, −$32 vs HODL. Product unchanged.
  - identifiers missing: crypto/crypto
- **sonnet**: 2026-09-11: Decision log entry closing the cbBTC narrowing episode on Base after the trend breaker fired. Sign the widening, reject the emergency options (short on GMX, exit to cash), product unchanged. The signal was only on the crypto/crypto leg; episode: 11 days in flat, ≈ $8.6 fees, −$32 vs HODL.
  - identifiers missing: none

## `journal/reports/morning-2026-09-20.md:170`

2026-09-20 | report-section | RANKING WIDE (pod produkt, top 10)

> ## RANKING WIDE (pod produkt, top 10) dzień 2026-09-20 · wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30) | # | pula | klasa | score %/r | fee wide | drag | σ/r | streak | TVL | w bocie | 365d LP/HODL/Δ | 720d Δ | flat | |---|---|---|---|---|---|---|---|---|---|---|---|---| | 1 | WBTC-CBBTC 0.01% v4 @ Ethereum | pegged-btc | 0.54 | 0.94 | 0.4 | 1.62 | 19d | $4.7M | — | — | — | 10 ...

- **haiku**: 2026-09-20 — Polish morning report "RANKING WIDE" (top 10 wide-passive pools, wide-score v1 = fee_wide − 0.6·σ²/8·g(w), 2026-09-20 run). Lists pools including WBTC-CBBTC 0.01% v4 @ Ethereum, USDC-CBBTC 0.06% v4 @ Base, WETH-CBBTC 0.05% @ Base (base-cbbtc-weth-005), WBTC-WETH 0.05% @ Arbitrum, with score, drag, σ, 365d/720d LP vs HODL deltas and flat %.
  - identifiers missing: LP/HODL, 50/50
- **sonnet**: 2026-09-20: Morning report section "RANKING WIDE" (wide-score v1, top 10 pools, observation only, entry decision manual). Top is WBTC-CBBTC 0.01% v4 @ Ethereum (score 0.54); WETH-CBBTC 0.05% @ Base (base-cbbtc-weth-005, the one in the bot) ranks 10th at -3.11, with 365d/720d wide-daily model Δ negative; WBTC-WETH @ Arbitrum is 8th.
  - identifiers missing: LP/HODL, 50/50

## `docs/AI-WORKFLOW.md:57`

no date | doc-section | A typical day

> ## A typical day - **03:30–05:30 (server)** — nightly pipeline: fetch swaps, refresh caches, run backtests and   selection, write logs. - **07:30 (server)** — the morning report script reads the logs, the bot state and the ledger,   writes `reports/morning-YYYY-MM-DD.md`, commits and pushes it, and sends a Telegram digest. - **08:00–09:00 (Fable + owner)** — the morning brief: the analysis sessio ...

- **haiku**: 2026-08-01 is not given; the chunk has no date header or dated text, so: Undated: This AI-WORKFLOW.md section describes a typical project day for the HOMOS Uniswap v3 liquidity research workflow. It covers the 03:30–05:30 nightly pipeline, the 07:30 morning report (reports/morning-YYYY-MM-DD.md, pushed to git and sent via Telegram), the 08:00–09:00 morning brief, and day and evening work with Fable, CC-Mac, CC-Win and Sonnet sessions.
  - identifiers missing: none
- **sonnet**: Undated: The "A typical day" section of docs/AI-WORKFLOW.md describes the daily schedule. The 03:30–05:30 nightly pipeline and the 07:30 morning report (reports/morning-YYYY-MM-DD.md, Telegram digest) run on the server. The 08:00–09:00 morning brief is with Fable. Day work is split among Fable, CC-Mac, CC-Win and Sonnet; Fable's inbox and journal close the evening.
  - identifiers missing: none

