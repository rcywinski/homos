# TASKS-UI.md — zadania dla sesji UI (Sonnet)

> Przeczytaj najpierw CONTEXT.md (stan projektu — NIE zwiedzaj repo od zera)
> i UI-VISION.md §3.1 (układ porannego kokpitu). Po każdym zadaniu odhaczaj
> TUTAJ i dopisz linijkę do dziennika CONTEXT.md ("Sesja UI (Sonnet)") —
> poprzednio tego zabrakło i inne sesje nie wiedziały, co zrobiłeś.
> ZAKRES TWARDY: warstwa wizualna/UX. NIE dotykaj: src/utils/v3math.ts,
> src/utils/liquidityManagement.ts, src/utils/advisor.ts, backtest/**, bot/**
> (poza czytaniem), scripts/**. Style: dopisuj do src/styles.css.
> Dev: localhost:3000 (webpack hot reload). Typecheck na koniec: npx tsc --noEmit.

## PARTIA 1 — wykonana ✅
- [x] Pasek zakresu na kartach pozycji
- [x] Etykieta "Active liquidity"
- [x] Skeletony/spinnery PoolBrowser
- [x] Integracja TransactionHistory
- [x] Spójność procentów fees (suma 100%) — zweryfikowane w kodzie (`feePercentages()`
      w MyPositions.tsx, jedna wspólna `ethPrice`, zaokrąglenie na końcu)
- [x] Responsywność <480px (advisor-box, range-options, token-inputs) — zweryfikowane
      w styles.css (media query już obecna)
- [x] Drobne: tytuł zakładki, favicon, ukrycie Faucet poza sepolią — zweryfikowane
      (FaucetSection już poprawnie zwraca null poza Sepolią)

## PARTIA 2 — PORANNY KOKPIT + POŁĄCZENIE Z BOTEM ✅ wykonana

### #0 Poranny kokpit (nowy ekran startowy, nad "Uniswap V3 Pools") — zrobione
- `src/hooks/usePortfolio.ts` (nowy): agreguje pozycje NFT ze WSZYSTKICH pul/sieci
  (mainnet+Base, nie tylko aktualnie otwarta pula jak MyPositions), liczy wartość
  łączną, in-range/out, fees do zebrania, doradcę per pozycja. Reużywa v3math +
  advisor.ts (bez duplikowania formuł) — advisor stats liczone tylko dla pul, w
  których użytkownik faktycznie ma pozycję (nie dla całego OBSERVED_PAIRS, żeby
  nie mnożyć RPC).
  Uwaga o wycenie: pary bez nogi stable/ETH (np. cbBTC/WETH) NIE są wliczane do
  sumy USD (brak wiarygodnego feeda) — liczone są tylko w statystykach in/out-range;
  UI pokazuje gwiazdkę + dopisek gdy to zachodzi (`hasUnknownValue`).
- `src/components/MorningCockpit.tsx` (nowy): nagłówek finansowy, propozycje bota,
  skrót doradcy per pozycja. Zwijalny, klasy `morning-*`.
- Wpięty w `App.tsx` nad `PoolBrowser`.

### #1 Panel "Propozycje bota" — zrobione
- `src/hooks/useBotApi.ts` (nowy): `localStorage.homos_api_base` (default
  `http://localhost:8787`) + `homos_api_token` (Bearer), poll `GET /api/state`
  co 60s, `POST /api/proposals/:id/dismiss`. Świeżość <5min → status
  online/stale/offline. Cichy na offline (bez spamu w konsoli).
- Panel ustawień (ikonka ⚙ w nagłówku kokpitu) do wpisania adresu/tokena.
- Karty propozycji: "🔄 REBALANS #id → $lo–$hi · koszt $Z · payback ~N dni" +
  przycisk "Odrzuć". Zweryfikowane wobec realnego kształtu odpowiedzi
  `bot/observer.ts` (status 'open'/'dismissed', nie 'pending' jak w szkicu zadania).
- "Bot offline" gdy brak połączenia (szary box, bez błędów w konsoli).

### #2 PWA — zrobione
- `public/manifest.json` (name HOMO$, ikony 192/512 — wygenerowane PNG z prostym
  logo $ na niebieskim tle, theme-color #1a6ae0), `<link rel="manifest">` +
  `apple-touch-icon` + `apple-mobile-web-app-*` meta w `index.html`. Bez service
  workera (zgodnie z zadaniem).

### #3 Wskaźnik zdrowia systemu — zrobione
- `src/components/BotStatusDot.tsx` (nowy, reużywany): kropka w nagłówku
  aplikacji (App.tsx, obok CompactWalletInfo) ORAZ w nagłówku kokpitu — ten sam
  `useBotApi()` stan (jeden poll na sesję, nie dwa niezależne).

## Konwencje
- Nowe hooki: src/hooks/. Style: src/styles.css sekcja /* --- UI session --- */.
- Bez nowych bibliotek. Typecheck 0 błędów (src/) — zweryfikowane na maszynie
  użytkownika; pozostałe błędy (bot/observer.ts, node_modules/ox) są preexisting
  i poza zakresem tej sesji.
- Wpis do CONTEXT.md + odhacz tutaj.

## PARTIA 3 — Telemetria + akcje na kokpicie ✅ wykonana
> ROZSZERZONA o decyzje UX z **UX-COCKPIT.md** (przeczytaj!) — kokpit staje się
> centrum zarządzania; stare sekcje degradujemy (zwijamy), NIE kasujemy.

- [x] **Akcje na kartach pozycji w kokpicie** (UX-COCKPIT §1.A.3) — zrobione:
  `src/hooks/usePortfolio.ts` rozszerzony o surowe dane pozycji (ticki,
  liquidity, token0/1, SDK `Pool` zbudowany raz tam, sugestia doradcy) —
  zero dodatkowych zapytań RPC. `src/hooks/useCockpitActions.ts` (nowy):
  [💰 Zbierz fees] (aktywny gdy fees > próg — patrz poprawka niżej), [⏹ Zamknij]
  (modal w `CockpitPositionActions.tsx`: suwak 1–100% + presety 25/50/100,
  slippage, podgląd kwot z min-po-slippage — reużywa
  `prepareRemoveLiquidityTransaction` z liquidityManagement.ts jak
  MyPositions.tsx; UWAGA: decreaseLiquidity samo NIE przekazuje środków —
  dodany krok 2/2 `collect()` w tej samej akcji, sekwencyjnie, 2 podpisy w
  Rabby — bez tego "Zamknij" nie działałoby), [🔄 Rebalans ręczny] (modal
  otwiera NOWĄ pozycję, domyślnie w sugerowanym zakresie doradcy gdy dostępny
  — patrz poprawka niżej — reużywa createPosition/prepareAddLiquidityTransaction
  jak AddLiquidity.tsx; pełny builder zamknij+swap+mint w jednej sekwencji
  zostaje dla sesji analitycznej — UX-COCKPIT.md §3/§5).
  - **Poprawka (zgłoszona przez użytkownika 2026-08-10, ten sam dzień):**
    "przyciski zbierz fees sa nieaktywne pomimo nieodebrane fee" — próg
    opłacalności był dosłownie z UX-COCKPIT ("50× gaz" ≈ $400 na mainnecie,
    $4 na Base), w praktyce nieosiągalny dla typowych kwot. Obniżony do 8×
    gaz (`COLLECT_THRESHOLD_MULT` w useCockpitActions.ts, ~$64/$0.64).
    Osobno zgłoszenie "rebalans reczny tez" [nieaktywny] — przycisk wymagał
    `p.suggestion` (statystyk doradcy), które bywają niedostępne (mało
    swapów w 24h / pula spoza OBSERVED_PAIRS / błąd RPC). Zmieniono: przycisk
    wymaga teraz tylko `p.pool`, a modal ma tryb "Własny zakres" (ceny USD,
    jak w AddLiquidity.tsx) jako fallback, gdy `p.suggestion` jest `null` —
    `openSuggestedPosition` przemianowane na `openPositionAtRange(tickLower,
    tickUpper, ...)`, bierze ticki jawnie zamiast czytać je z p.suggestion.
- [x] **Sekcje "Zarządzaj"** — `App.tsx`: PoolBrowser + TransactionHistory
  zgrupowane pod `<ExpandableSection title="Zarządzaj (zaawansowane)"
  defaultExpanded={false}>` (nic skasowane, tylko schowane).
- [x] Poprawka z 401 — `BotTelemetry.tsx`: przycisk "Surowy JSON" otwiera modal
  z `JSON.stringify(bot.state)` (dane już w pamięci z useBotApi), zamiast linku
  do `{base}/api/state` który nie mógłby nieść nagłówka Authorization.

- [x] **Sekcja "Telemetria bota"** — `src/components/BotTelemetry.tsx` (nowy),
  zwijana w kokpicie, domyślnie zwinięta. Tabela z `state.pools`: pula | ETH/USD
  | tick | zmienność %/d | fee-yield %/d | sugerowany zakres $ | wiek danych.
  Orientacja sugerowanego zakresu (USD vs surowa token1/token0) wyliczona
  heurystyką log-odległości od `ethUsd` (PoolLive nie zapisuje sym0/ethIsToken0,
  więc nie da się tego odwrócić wprost jak w kokpicie — opisane w komentarzu w
  pliku). Lista pozycji z `state.positions` (advice + paybackDays) poniżej.
  Stopka: "OBSERWUJ — bot niczego nie wykonuje" + przycisk JSON (patrz wyżej).
  `useBotApi.ts` rozszerzony o typy `BotPoolLive`/`BotWatchedPosition`
  (powielone z bot/observer.ts, ten plik poza zakresem edycji).
- [x] Auto-odświeżanie razem z istniejącym pollingiem — zero nowych timerów,
  telemetria czyta ten sam `bot.state` co reszta kokpitu (jeden `useBotApi()`
  w App.tsx).

Typecheck (`npx tsc --noEmit -p tsconfig.json`, zweryfikowane na maszynie
użytkownika): 0 błędów w `src/`. Pozostałe błędy (bot/observer.ts, node_modules/ox)
są preexisting i poza zakresem tej sesji — jak w Partii 1/2.


## PARTIA 4 — Karty propozycji: Zatwierdź / Modyfikuj / Odrzuć (+2 fixy z odbioru P3)
> Kontekst: bot dostał WARSTWĘ SELEKCJI (`bot/selector.ts`, wpięta w observer) —
> raz dziennie po 8:00 (po pipeline 07:30) generuje propozycje `kind: 'OPEN'`
> (otwórz pozycję w puli z top rankingu 7d) i `kind: 'ROTATE'` (zamknij najsłabszą
> → otwórz kandydata; pole breakEvenDays). Dotychczasowe propozycje doradcy mają
> `kind: 'REBALANCE'`. Pełny schemat: interface Proposal w bot/observer.ts
> (nowe pola: kind, symbol, chain, apy7d, heldApy7d, breakEvenDays, note;
> suggestedRange/costUsd/paybackDays są teraz OPCJONALNE — obsłuż brak!).
> ZAKRES TWARDY bez zmian (bot/** tylko do czytania). Zaktualizuj typy w useBotApi.ts.

- [x] **Karty propozycji wg kind** (MorningCockpit) — zrobione:
  - REBALANCE — przycisk **[Modyfikuj →]**: `openModifyRebalance()` w
    MorningCockpit.tsx dopasowuje trzymaną `PortfolioPosition` po `p.tokenId`
    i otwiera (wyeksportowany od tej partii) `RebalanceModal` z
    CockpitPositionActions.tsx, prefillowany trybem "Własny zakres" wypełnionym
    z `suggestedRange` propozycji (USD, edytowalne przed Rabby).
  - OPEN — karta z opisem z `action` (apy7d/chain/streak już w tekście), `note`
    pokazany jako żółty box gdy jest; przycisk **[Otwórz →]** tylko gdy
    `poolId != ''` — wywołuje `resolveBotPool(poolId)` (nowe w
    useCockpitActions.ts: 2 odczyty RPC on-demand, slot0+liquidity, tokeny z
    OBSERVED_PAIRS) i otwiera ten sam `RebalanceModal` z wyliczonym
    `RebalanceTarget` (tokenId `''` — nowa pozycja, nie ma jeszcze NFT).
  - ROTATE — dwie linie (zamknij #tokenId held-APY → otwórz symbol candidate-APY
    + breakEvenDays); DWA przyciski: [1. Zamknij starą →] (reużywa wyeksportowany
    `CloseModal` na trzymanej pozycji) i [2. Otwórz nową →] (jak OPEN, przez
    `resolveBotPool`) — ponumerowane, bez auto-sekwencji.
  - [Odrzuć] wszędzie — bez zmian, działał już (endpoint dismiss).
  - [Zatwierdź] świadomie NIE zbudowany w tej partii — zostawione dla Partii 4b
    (rebalanceBuilder.ts, dopisanej w międzyczasie przez inną sesję).
  - Architektura: `RebalanceTarget` (nowy, węższy interfejs w
    useCockpitActions.ts) zamiast pełnego `PortfolioPosition` jako typ propsa
    `position` w `RebalanceModal`/`openPositionAtRange`/`readBalanceAndAllowance`/
    `approveToken` — `PortfolioPosition` spełnia go strukturalnie, więc
    dotychczasowe wywołania (karta pozycji) działają bez zmian; nowy producent
    to `resolveBotPool()` dla pul bez istniejącej pozycji.
- [x] **Fix (z odbioru P3): fallback sugestii bota w modalu rebalansu** — zrobione:
  `RebalanceModal` liczy `botPoolMeta` po `poolAddress` (nowy plik
  `src/config/botPools.ts`, metadane 3 pul bota zduplikowane z bot/config.ts —
  bot/** poza zakresem edycji) i gdy `position.suggestion == null`, a
  `bot.state.pools[]` ma świeżą sugestię dla tej samej puli, opcja "Doradca"
  pokazuje się jako "Doradca (z bota)" zamiast wyszarzonej — dane już w
  `bot.state` (nowy prop `bot?: UseBotApi` przekazany z MorningCockpit →
  CockpitPositionActions → RebalanceModal), zero nowych zapytań.
- [x] **Fix kosmetyczny (z odbioru P3):** `text-align: left` dodane do
  `.telemetry-json-pre` w styles.css (przyczyna: `.app { text-align: center }`
  kaskadowało w dół do `<pre>`).
- [x] Typy: `BotProposal` w useBotApi.ts rozszerzony o `kind?`, `poolId?`,
  `symbol?`, `chain?`, `apy7d?`, `heldApy7d?`, `breakEvenDays?`, `note?`,
  `llamaPool?`; `suggestedRange` rozszerzony o opcjonalne `tickLower?/tickUpper?`
  (zweryfikowane wobec `interface Proposal` w bot/observer.ts i
  `SelectorProposal` w bot/selector.ts, przeczytanych na świeżo przed
  implementacją — nie na podstawie streszczenia w CONTEXT.md).

Typecheck (`npx tsc --noEmit -p tsconfig.json`, zweryfikowane na maszynie
użytkownika): 0 błędów w `src/`. Pozostałe błędy (bot/observer.ts, node_modules/ox)
są preexisting i poza zakresem tej sesji.

## PARTIA 4b — wpięcie buildera pod [Zatwierdź] (PO skończeniu Partii 4)
> Builder GOTOWY: `src/utils/rebalanceBuilder.ts` (sesja analityczna, wolno
> importować). Przetestowany numerycznie (swap-skip przy zbalansowanej pozycji;
> pozycja 100% token0 → swap połowy z min-out po fee+slippage). API:
> `planRebalance({pool, chainId, tokenId, liquidity, tickLower/Upper,
> newTickLower/Upper, feesOwed0/1, recipient, slippageBps})` → `RebalancePlan`
> {steps[1..3], approvals[], swapSkipped, preview}. WAŻNE: krok mint w planie to
> ESTYMATA (podgląd) — przed wysłaniem ostatniego kroku zbuduj go ponownie przez
> `buildMintStep(...)` z FAKTYCZNYCH sald (readBalanceAndAllowance). Postęp:
> `saveProgress/loadProgress/clearProgress` (localStorage) → po odświeżeniu
> strony pokaż "dokończ krok 2/3" na karcie propozycji.

- [x] [Zatwierdź] na kartach REBALANCE — zrobione: nowy `src/hooks/useRebalanceExecution.ts`
  wykonuje `RebalancePlan` z rebalanceBuilder.ts (approvals filtrowane po
  faktycznym allowance — pomijane, gdy już spełnione; każdy krok: symulacja
  `client.call` → `sendTransaction` → `waitForTransactionReceipt` →
  `saveProgress` → `addTransaction`; krok mint PRZEBUDOWANY tuż przed wysłaniem
  z faktycznych sald przez `buildMintStep`, nie z estymaty w planie — a jeśli
  realne saldo przekracza wcześniej zaaprobowaną kwotę, dociąga approve przed
  mintem, żeby nie zrewertować). Po całości: `clearProgress` + status `done`.
  Failure w środku: komunikat "środki bezpieczne, dokończ pozostałe kroki" +
  `saveProgress` zostaje (stan po kroku 1 = cash na walletcie/tokensOwed).
  Nowy modal `src/components/RebalanceSequenceModal.tsx` — lista kroków z
  planu (label + detail), pasek statusu, wykrywa progres z localStorage i
  pokazuje "Dokończ (krok N/M)" zamiast "Wykonaj sekwencję" po powrocie na
  stronę. `usePortfolio.ts` rozszerzony o `feesOwed0Raw`/`feesOwed1Raw`
  (bigint jako string) — `planRebalance()` potrzebuje dokładnych, nie
  zaokrąglonych `Number()`, nieodebranych fee.
- [ ] **ROTATE — świadome TODO, nie zrobione:** builder (`planRebalance`) bierze
  jeden `Pool` na wejściu i zakłada, że stara i nowa pozycja są w TEJ SAMEJ
  puli — przy ROTATE zawsze są w RÓŻNYCH pulach (inny kandydat z rankingu).
  Żeby to obsłużyć: budowa `Pool` dla puli docelowej z on-chain slot0 (jak
  `resolveBotPool` w useCockpitActions.ts z Partii 4, ale też dla decrease ze
  starej puli — dwa Pool naraz) + swap między dwoma różnymi parami/fee-tierami
  zamiast "w tej samej puli co mint". Na razie ROTATE zostaje na krokach 1/2
  ręcznych z Partii 4 (`[1. Zamknij starą →]` / `[2. Otwórz nową →]`) — karta
  ROTATE w MorningCockpit.tsx ma notatkę wyjaśniającą to wprost.

Typecheck (`npx tsc --noEmit -p tsconfig.json`, zweryfikowane na maszynie
użytkownika): 0 błędów w `src/`. Pozostałe błędy (bot/observer.ts,
node_modules/ox) są preexisting i poza zakresem tej sesji.

## PARTIA 5 — PAPER TRADING: wizualizacja wirtualnego portfela ✅ wykonana (zlecone przez Fable 18.08, decyzja Rafała)

KONTEKST: bot prowadzi teraz PAPER TRADING (bot/paper.ts) — wirtualny portfel
$10k na każdą pulę z BOT_POOLS, prowadzony przez ALGORITHM v1.2 na żywych
danych (fees z trailing fee-yieldu, rebalanse z histerezą 24h+payback,
bezpiecznik exit/hedge). Zero transakcji — czysta symulacja. Rafał chce
WIDZIEĆ dziennie, ile algorytm wirtualnie zarabia/traci per pula i łącznie.

DANE: `GET {base}/api/paper?hours=N` (Bearer token jak reszta API; domyślnie
72h, max 720). Kształt odpowiedzi:
```json
{
  "state": {
    "startedAt": "ISO", "capitalPerPoolUsd": 10000, "updatedAt": "ISO",
    "positions": { "<poolId>": {
      "poolId": "...", "status": "open|cash|pending",
      "tickLower": 0, "tickUpper": 0, "capitalUsd": 0,
      "feesUsd": 0, "costsUsd": 0, "rebalances": 0,
      "hedge": {"sizeBase":0,"entryUsd":0,"fundingUsd":0} | null,
      "hedgePnlRealizedUsd": 0, "openedAt": "ISO", "startedAt": "ISO"
    } }
  },
  "history": [ {"ts":"ISO","poolId":"...","status":"open","equityUsd":0,
    "hodlUsd":0,"feesUsd":0,"costsUsd":0,"inRange":true,"trendDown":false,
    "rebalances":0}, ... ],
  "events": [ {"ts":"ISO","poolId":"...","kind":"OPEN|REBALANCE|EXIT_TREND|REENTRY|HEDGE_OPEN|HEDGE_CLOSE", ...}, ... ]
}
```

ZAKRES (wyłącznie src/**, bot/** tylko do czytania — jak zawsze):
1. **`useBotApi.ts`**: nowa funkcja/stan `paper` — fetch `GET /api/paper?hours=168`
   (7 dni) odświeżany co 5 min (osobny, wolniejszy timer niż state 60s —
   dane zmieniają się co 15 min). Typy wg kształtu wyżej.
2. **Nowa sekcja `PaperTradingPanel.tsx`** w kokpicie (zwijana,
   `ExpandableSection`, domyślnie ROZWINIĘTA — Rafał chce to widzieć
   codziennie):
   - NAGŁÓWEK ŁĄCZNY: suma equity wszystkich pul, PnL od startu ($ i %),
     vs HODL ($) — kolor zielony/czerwony; podpis "symulacja $10k/pula,
     start <data>".
   - KARTA PER PULA: nazwa puli, status (🟢 pozycja otwarta / 💤 cash po
     bezpieczniku / ⏳ czeka na dane; badge ⛔ gdy trendDown), equity teraz,
     PnL od startu, **vs HODL 50/50** (kluczowa liczba — wyróżnić), fees
     zebrane, koszty, liczba rebalansów; jeśli hedge otwarty — linia
     "🛡 short $X @ $Y (funding $Z)".
   - **SPARKLINE equity vs HODL** per pula (SVG inline, bez bibliotek — jak
     krzywe w report.html): 7 dni z `history`, dwie linie (equity kolor
     akcentu, hodl szary przerywany), oś ukryta, tooltip zbędny.
   - LISTA OSTATNICH ZDARZEŃ (z `events`, max 10, od najnowszych): ikona wg
     kind (🔓 OPEN / 🔄 REBALANCE / ⛔ EXIT_TREND / 🔁 REENTRY / 🛡 HEDGE_*),
     data, pula, 1 linia szczegółów.
   - DISCLAIMER na dole (szary, mały): "Symulacja na żywych danych rynkowych.
     Fees liczone z trailing fee-yieldu pasma (model doradcy), nie per-swap.
     To nie są prawdziwe pieniądze ani gwarancja wyników."
3. **Stany brzegowe**: 503 z /api/paper (paper jeszcze nie wystartował na
   serwerze) → sekcja pokazuje "Paper trading wystartuje po najbliższym
   restarcie bota"; brak history dla puli → karta bez sparkline'a.
4. CSS: klasy `paper-*` w styles.css, spójne z `morning-*`/`telemetry-*`.

NIE robić: żadnych przycisków akcji (to symulacja — nic do zatwierdzania),
żadnych zmian w bot/**, żadnego drugiego pollera /api/state.

- [x] `useBotApi.ts`: `paper`/`paperStatus` (GET /api/paper?hours=168, poll
      co 5 min — osobny, wolniejszy timer, `PAPER_POLL_MS`). Typy `PaperData`/
      `PaperStateShape`/`PaperPosition`/`PaperHistoryPoint`/`PaperEvent`/`PaperHedge`
      wg kształtu ze zlecenia. 503 → `paperStatus: 'not-started'` (bot świeżo
      zrestartowany, paper jeszcze nie ruszył), inne błędy/sieć → `'error'`.
- [x] `src/components/PaperTradingPanel.tsx` (nowy): nagłówek łączny (equity/
      PnL $+%/vs HODL), karta per pula (status ikoną, badge ⛔ trendDown,
      equity/PnL/vs HODL/fees/koszty/rebalanse, linia hedge gdy otwarty),
      sparkline SVG equity vs HODL (inline, bez bibliotek — polyline, wzorzec
      `PoolHistoryChart` z ObservationAnalysis.tsx), lista ostatnich 10 zdarzeń
      (ikona wg kind), disclaimer. "Teraz" equity/hodl per pula liczone z
      OSTATNIEGO punktu `history` dla tej puli (ma `hodlUsd`, którego
      `state.positions` nie niesie) z fallbackiem na `position.capitalUsd`,
      gdy historia jeszcze pusta (pula `pending`).
- [x] Wpięty w `MorningCockpit.tsx` pod `<ExpandableSection title="📊 Paper
      trading" defaultExpanded={true}>` (jedyna sekcja w kokpicie domyślnie
      rozwinięta poza samym kokpitem — zgodnie ze zleceniem "Rafał chce to
      widzieć codziennie"), nad `BotTelemetry`.
- [x] Stany brzegowe: `not-started` (503) → komunikat o restarcie bota;
      `error`/`loading` → notka wyciszona; pula bez ≥2 punktów historii →
      karta bez sparkline'a (tekst zamiast wykresu).
- [x] CSS: sekcja `/* PaperTradingPanel.tsx (Partia 5) */` w styles.css,
      klasy `paper-*`, spójne z `morning-*`/`telemetry-*`/`forecast-*`
      (reużyte `.forecast-negative` dla wartości ujemnych, nowa `.paper-positive`
      dla dodatnich).

Typecheck (`npx tsc --noEmit -p tsconfig.json`, w kontenerze): 0 błędów w
`src/`. Pozostałe błędy (bot/observer.ts — niezgodność typów viem w getBlock,
node_modules/ox) preexisting, poza zakresem tej sesji — jak w poprzednich
partiach.
