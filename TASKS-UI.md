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

## PARTIA 6 — TOP 10 pul dnia (obserwowane do wejścia) ✅ wykonana — zlecone przez Fable 18.08 (pomysł Rafała)

KONTEKST: selektor codziennie (po 8:00) liczy ranking pul wg polityki
ALGORITHM (7d śr. apyBase, persystencja ≥3d, majors, TVL≥$3M, ETH/Base/Arb)
i od teraz zapisuje TOP 10 do `.bot/selector-ranking.json`; serwer wystawia
`GET {base}/api/ranking` (Bearer token; 503 dopóki selektor nie zapisał —
PIERWSZY plik pojawi się jutro po 8:00). Kształt:
```json
{ "day":"YYYY-MM-DD", "generatedAt":"ISO",
  "criteria": {"window":"7d śr. apyBase","persistDays":3,"minTvlUsd":3000000,"filter":"..."},
  "rows": [ {"rank":1,"symbol":"WETH-CBBTC","chain":"Base","poolMeta":"0.05%",
    "apy7d":25.2,"streak":5,"eligible":true,"tvlUsd":123456789,
    "botPoolId":"base-cbbtc-weth-005"|null,"llamaUuid":"..."}, ... ] }
```

ZAKRES (wyłącznie src/**):
1. `useBotApi.ts`: fetch `GET /api/ranking` odświeżany co 30 min (dane
   zmieniają się raz dziennie — nie częściej!), typy wg kształtu wyżej.
2. Nowa sekcja `TopRankingPanel.tsx` w kokpicie (zwijana, domyślnie
   ZWINIĘTA — to obserwacja, nie codzienna decyzja): tabela TOP 10 —
   kolumny: #, para (symbol + poolMeta + chain), APY 7d, streak (np.
   "5d w topie"), TVL (skrót $XXM), status. Status per wiersz:
   ✅ "w konfiguracji bota" gdy `botPoolId` (pula wykonywalna od ręki,
   przechodzi przez lejek walidacji), szary "poza konfiguracją" gdy null.
   Wiersze `eligible:true` wyróżnione (to z nich selektor proponuje OPEN).
   Nagłówek: "Ranking dnia <day>" + kryteria drobnym drukiem (z `criteria`).
3. Stany: 503 → "Ranking pojawi się po pierwszym przebiegu selektora
   (codziennie po 8:00)"; dane z wczoraj (day < dziś) → żółta notka
   "ranking z <day> — dzisiejszy przebieg jeszcze nie wygenerowany".
4. WAŻNE (uczciwość UI): pod tabelą jedno zdanie disclaimera — "Headline
   APY z rankingu ≠ osiągalny wynik LP; pule wchodzą do gry dopiero po
   walidacji tick-level (patrz WETH-USDT 0.01%: 11% w rankingu, odrzucona
   walidacją)." NIE dodawać przycisków akcji przy wierszach.
5. CSS `topranking-*`; UWAGA: istnieje stary `TopPools.tsx` (DefiLlama
   client-side, sekcja "Top pule" z sesji 2e) — NIE ruszać go w tej partii;
   decyzja o scaleniu/wycofaniu zapadnie osobno.

- [x] `useBotApi.ts`: `ranking`/`rankingStatus` (GET /api/ranking, poll co
      30 min — `RANKING_POLL_MS`, osobny od paper/state). Typy `RankingData`/
      `RankingRow`/`RankingCriteria`/`RankingStatus` wg kształtu ze zlecenia.
      503 → `'not-started'`, inne błędy/sieć → `'error'`.
- [x] `src/components/TopRankingPanel.tsx` (nowy): tabela TOP 10 (#, para+
      poolMeta+chain, APY 7d, streak "Nd w topie", TVL skrócone $X.XM/$Xk,
      status ✅ "w konfiguracji bota" / szare "poza konfiguracją"), wiersze
      `eligible:true` podświetlone (`.topranking-eligible`), nagłówek
      "Ranking dnia <day>" + kryteria drobnym drukiem, żółta notka gdy
      `day < dziś`, disclaimer o headline APY vs walidacji tick-level pod
      tabelą. Reużyty wzorzec `telemetry-table` (jak WalkforwardMiniTable).
- [x] Wpięty w `MorningCockpit.tsx` pod `<ExpandableSection title="🏆 Ranking
      dnia (TOP 10)" defaultExpanded={false}>` (jedyna sekcja domyślnie
      zwinięta wśród nowych paneli — to obserwacja, nie codzienna decyzja),
      na końcu kokpitu po ObservationAnalysis. `TopPools.tsx` nietknięty.
- [x] Stany brzegowe: `not-started` (503) → komunikat o pierwszym przebiegu
      selektora po 8:00; `error`/`loading` → notka wyciszona; ranking pusty
      (`rows.length === 0`) → notka.
- [x] CSS: sekcja `/* TopRankingPanel.tsx (Partia 6) */` w styles.css, klasy
      `topranking-*` + nowa `.morning-note-warn` (żółta notka nieaktualnego
      dnia, reużywalna gdzie indziej).

Typecheck (`npx tsc --noEmit -p tsconfig.json`): 0 błędów w `src/`.
Pozostałe błędy (bot/observer.ts, node_modules/ox) preexisting, poza
zakresem tej sesji — jak w poprzednich partiach.

## PARTIA 7 — Paper trading: widoczność zakresu i momentów wypadnięcia ✅ wykonana (pomysł Rafała 20.08, zlecone przez Fable)

KONTEKST (po co): 19–20.08 ETH +18.7% — 3 pule ETH/stable wypadły z zakresu
górą, cbBTC poszła w EXIT_TREND. Na sparkline'ach equity-vs-HODL NIE WIDAĆ
kiedy pozycja wypadła z zakresu ani kiedy siedzi w cash — a to klucz do
zrozumienia, czemu HODL wygrywa (LP poza zakresem = 100% w jednej nodze).
HODL nie ma zakresów (trzyma 50/50 zawsze) — wizualizujemy zakres BOTA na tle
ceny + stany na osi czasu.

DANE (co daje serwer): `history[]` z `/api/paper` ma od zawsze `inRange`
(bool), `trendDown` (bool), `status` ('open'|'cash'|'pending') per próbka
15 min; OD 20.08 (commit z tej paczki, po restarcie homos-bot) dochodzą:
`price` (human, number), `lo`/`hi` (human, granice zakresu — TYLKO gdy
status='open'; w cash brak pól). Starsze próbki tych pól NIE mają —
UI musi to przeżyć (feature-detect, nie wykres pusty).

ZAKRES TWARDY: tylko src/** (PaperTradingPanel.tsx, useBotApi.ts typy,
styles.css). bot/** nie ruszać (zmiana w paper.ts już zrobiona przez Fable).

1. **Typy** (`useBotApi.ts`): `PaperHistoryPoint` + `price?: number`,
   `lo?: number`, `hi?: number`.
2. **Cieniowanie stanów na istniejącym sparkline equity-vs-HODL** (działa
   na CAŁEJ historii, też sprzed 20.08): pod polyline'ami pionowe pasy tła
   per próbka — `!inRange && status==='open'` → żółtawy (poza zakresem),
   `status==='cash'` → szary (bezpiecznik, kapitał zaparkowany). Legenda
   jednolinijkowa pod wykresem. SVG inline, bez bibliotek (wzorzec P5).
3. **Drugi mini-wykres "cena vs zakres"** (tylko gdy ≥2 próbki mają
   `price`): linia ceny + pasmo `lo–hi` (rect/area między granicami; przy
   rebalansie granice się zmieniają schodkowo — rysować pasmo per segment
   próbek o tych samych lo/hi, nie jednym rectem). W odcinkach cash pasma
   nie ma (brak lo/hi) — zostaje sama linia ceny na szarym tle z pkt 2.
   Skala Y: min/max z (price, lo, hi) w oknie ±mały margines. UWAGA na
   pule quote WETH (cbBTC): price to ~0.0296 — formatować `toPrecision(4)`,
   nie `toFixed(0)`.
4. **Znaczniki zdarzeń**: pionowa kreska na obu wykresach w ts zdarzeń
   z `events[]` (EXIT_TREND ⛔, REENTRY ▶, REBALANCE 🔄) — events już są
   w odpowiedzi /api/paper, dopasować po poolId+ts.
5. **Stany brzegowe**: brak `price` we wszystkich próbkach → mini-wykres
   ceny się nie renderuje (bez notki-błędu, po prostu go nie ma); mieszane
   (stare+nowe) → cena rysowana od pierwszej próbki z `price`.

- [x] typy PaperHistoryPoint (`price?/lo?/hi?` w useBotApi.ts, feature-detect —
      starsze próbki sprzed 20.08 tych pól nie mają).
- [x] cieniowanie stanów na sparkline equity-vs-HODL + legenda — helper
      `stateBands()` współdzielony z mini-wykresem ceny (żółte tło = poza
      zakresem, szare = cash), działa na CAŁEJ historii (inRange/status są
      od zawsze).
- [x] mini-wykres cena vs pasmo zakresu (`PriceRangeChart`) — pasmo lo–hi
      rysowane per interwał "próbka→następna próbka" (efekt schodkowy przy
      rebalansie), linia ceny w ciągłych odcinkach (przerwa tam, gdzie stare
      próbki nie mają `price` w ogóle), cash bez pasma (samo szare tło +
      linia ceny, bo `price` jest pisane też w cash — tylko `lo/hi` są
      warunkowe na status='open'). Formatowanie: `toPrecision(4)` dla pul
      quote-owanych w WETH (cbBTC), inaczej liczba całkowita USD-podobna.
- [x] znaczniki zdarzeń EXIT_TREND/REENTRY/REBALANCE na osi czasu —
      `EventMarkers` (pionowa kreska + `<title>` tooltip), wspólny dla obu
      wykresów, dopasowany po poolId+ts (poolEvents filtrowane w PoolCard).
- [x] stany brzegowe: brak `price` we wszystkich próbkach → `PriceRangeChart`
      zwraca `null` (bez notki błędu, zgodnie ze zleceniem); mieszana
      historia (stare+nowe) → linia ceny zaczyna się od pierwszej próbki
      z `price`, nie interpoluje przez dziurę. CSS `paper-range-*` w
      styles.css (reużyte `paper-range-band-out/cash` w obu wykresach dla
      spójności wizualnej).
- [x] typecheck 0 błędów w src/ (`npx tsc --noEmit -p tsconfig.json`) —
      pozostałe błędy (bot/observer.ts, node_modules/ox) preexisting.

### Poprawki po odbiorze P7 (2026-08-20, zrobione)
- [x] **Orientacja USD** — `price`/`lo`/`hi` z bot/paper.ts to "human"
      token1-per-token0 (konwencja Uniswap), nie zawsze USD. Pule mainnet
      (sym0='USDC', sym1='WETH') dawały WETH-per-USDC ≈0.00044 → zaokrąglało
      się do "0" w UI. Fix: `toDisplay(poolId, raw)` = `ethIsToken0 ? raw :
      1/raw` (wzorzec z AddLiquidity.tsx/MyPositions.tsx/
      CockpitPositionActions.tsx, `ethIsToken0 = sym0.includes('ETH')`).
      Transformacja stosowana WCZEŚNIE — przed liczeniem skali Y i punktów
      wykresu (nie tylko w etykietach), więc cała geometria jest w jednej
      orientacji i "cena rośnie w USD = linia w górę" działa automatycznie.
      Pasmo lo/hi: `Math.min/max` z dwóch przetransformowanych wartości
      (inwersja jest malejąca, może zamienić kolejność). cbBTC (sym0='WETH')
      → `ethIsToken0=true` → bez zmian, zostaje czytelne ~0.03183.
- [x] **Czytelność pasma zakresu** — `.paper-range-band` z opacity 0.12 na
      0.28 + delikatna obwódka (myliło się z szarym tłem cash). Dodana
      legenda pod wykresem ceny: "niebieskie pasmo = zakres bota · czarna
      linia = cena".
- [x] typecheck czysty dla PaperTradingPanel.tsx.

## PARTIA 8 — ROTATE: automatyczne [Zatwierdź] (cross-pool) — zlecone przez Fable 20.08 (decyzja Rafała)

KONTEKST: domknięcie świadomego TODO z Partii 4b. `planRotate()` w
`src/utils/rebalanceBuilder.ts` JUŻ ISTNIEJE (Fable, tsc czysty) — obsługuje
starą i nową pozycję w RÓŻNYCH pulach TEJ SAMEJ sieci: ta sama para (zmiana
tieru) albo para z jednym wspólnym tokenem (np. WETH/USDC → cbBTC/WETH).
Sekwencja 3–4 kroków: zamknij starą → [swap unikalny→wspólny w starej puli]
→ [swap wyrównujący w nowej puli] → mint w nowej. Zwraca `RotatePlan`
(steps/approvals/preview — kształt analogiczny do RebalancePlan).

ZAKRES TWARDY: tylko src/** (hook + modal + karta ROTATE w MorningCockpit);
rebalanceBuilder.ts NIE ruszać (gotowy); bot/** nie dotykać.

1. **`useRotateExecution.ts`** (nowy hook, wzorzec useRebalanceExecution z
   P4b): buduje dwa `Pool` (stara pozycja: z `PortfolioPosition.pool`; nowa:
   `resolveBotPool(poolId)` z useCockpitActions — JUŻ istnieje), woła
   `planRotate`, wykonuje kroki sekwencyjnie przez Rabby (approvals wg
   allowance, symulacja client.call przed wysłaniem — jak w P4b), mint
   PRZEBUDOWANY przed wysłaniem z faktycznych sald (`buildMintStep` z
   pool=NOWA). Postęp w localStorage (saveProgress — klucz per stary
   tokenId; totalSteps zmienny 3/4). Failure w środku → komunikat "środki
   bezpieczne na walletcie, dokończ pozostałe kroki".
2. **Modal sekwencji** — reużyć `RebalanceSequenceModal` jeśli da się
   sparametryzować listą kroków (plan.steps ma już labele/detail); inaczej
   bliźniaczy `RotateSequenceModal`.
3. **Karta ROTATE w MorningCockpit**: przycisk [Zatwierdź →] obok
   istniejących ręcznych [1. Zamknij starą →]/[2. Otwórz nową →] (ręczne
   ZOSTAJĄ jako fallback). WARUNEK pokazania [Zatwierdź]: ta sama sieć
   (chainId starej pozycji == chainId puli z propozycji) — przy różnych
   sieciach pokaż notkę "rotacja cross-chain: użyj kroków ręcznych"
   (planRotate i tak rzuci — złapać i pokazać komunikat).
4. **Stany brzegowe**: brak pozycji do zamknięcia (OPEN-only) → karta bez
   zmian; pary rozłączne (throw z planRotate) → notka + kroki ręczne.

- [ ] useRotateExecution (plan → sekwencja z symulacją i resume)
- [ ] modal sekwencji (reuse/bliźniak)
- [ ] karta ROTATE: [Zatwierdź] + warunek samej sieci + fallback ręczny
- [ ] stany brzegowe + typecheck 0 błędów w src/

## PARTIA 9 — [Zatwierdź hedge] na GMX (karta propozycji HEDGE) — zlecone przez Fable 20.08 (decyzja Rafała)

KONTEKST: krok 2 planu automatyzacji hedge (F4-op). `src/utils/hedgeBuilder.ts`
JUŻ ISTNIEJE (Fable, tsc czysty): `planHedgeOpen({sizeEth, ethPriceUsd,
recipient, ...})` / `planHedgeClose(...)` → `{tx, approval, summary, preview}`.
Jeden multicall ExchangeRoutera GMX (value = executionFee w ETH!), approval
USDC→Router osobno. Adresy/ABI zweryfikowane 20.08 (komentarze w pliku).

ZAKRES TWARDY: tylko src/**; hedgeBuilder.ts NIE ruszać; bot/** nie dotykać.

1. **Karta propozycji HEDGE** (`MorningCockpit.tsx`): propozycje bota
   `kind==='HEDGE'` (base-030, v1.2) dostają przycisk [Zatwierdź hedge →]
   obok istniejącej notki ręcznej (notka ZOSTAJE jako fallback). `sizeEth`
   z propozycji (pole w note/propozycji — sprawdź realny kształt w
   bot/observer.ts proposeExitTrend, gałąź hedge), `ethPriceUsd` z
   `bot.state` tej puli.
2. **Hook `useHedgeExecution.ts`**: (a) switch sieci na Arbitrum (42161) —
   hedge jest ZAWSZE na Arbitrum, niezależnie od sieci puli LP (wzorzec
   cross-chain switch + świeży walletClient z useCockpitActions); (b) saldo
   +allowance USDC (natywne 0xaf88...5831) — gdy USDC za mało, pokaż ile
   brakuje i NIE buduj tx (bez auto-swapów w v1); (c) approve jeśli trzeba →
   (d) SYMULACJA eth_call multicalla (OBOWIĄZKOWA — weryfikuje też ABI o
   żywy kontrakt; revert → pokaż błąd, nie wysyłaj) → (e) wysyłka przez
   Rabby; value tx = executionFee (preview.executionFeeEth).
3. **Modal potwierdzenia**: summary + preview (rozmiar ETH/$, collateral,
   acceptable price, execution fee) + ostrzeżenie "zlecenie wykona keeper
   GMX po cenie oracle (max poślizg = acceptable); status pozycji sprawdź
   na app.gmx.io" + notka o pierwszym teście na małej kwocie.
4. **Zamknięcie**: przy zgaśnięciu sygnału bot NIE wysyła propozycji CLOSE
   (na razie) — w karcie pozycji hedge (jeśli user zapisał otwarcie —
   localStorage `homos_hedge_open` z {sizeUsd, collateralUsd, ts}) pokaż
   [Zamknij short →] przez planHedgeClose. Prosto: zapis stanu przy udanym
   otwarciu, czyszczenie przy zamknięciu.
5. **Stany brzegowe**: brak ETH na executionFee na Arbitrum → komunikat;
   sizeUsd < $11 (throw z buildera) → komunikat "za mała nadwyżka na hedge".

- [ ] karta HEDGE: [Zatwierdź hedge →] + fallback ręczny
- [ ] useHedgeExecution: switch→saldo/allowance→approve→SYMULACJA→wysyłka
- [ ] modal potwierdzenia z preview i ostrzeżeniami
- [ ] [Zamknij short →] + stan w localStorage
- [ ] stany brzegowe + typecheck 0 błędów w src/
