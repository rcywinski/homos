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

## PARTIA 8 — ROTATE: automatyczne [Zatwierdź] (cross-pool) ✅ wykonana — zlecone przez Fable 20.08 (decyzja Rafała)

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

- [x] `useRotateExecution.ts` (nowy) — kopia wzorca useRebalanceExecution.ts
      (freshWalletClient, client.call symulacja przed wysyłką, addTransaction,
      resume po awarii); różnica: mint przebudowywany z sald NOWEJ puli
      (`newPool`), nie starej. Progres w localStorage pod OSOBNYM prefiksem
      `homos_rotate_progress_${chainId}_${tokenId}` (własne save/load/clear w
      tym pliku — rebalanceBuilder.ts nieruszany, żeby nie kolidować z
      progresem zwykłego REBALANCE na tym samym tokenId).
- [x] `RotateSequenceModal.tsx` (nowy, bliźniak RebalanceSequenceModal.tsx) —
      przyjmuje `newPool` zamiast `pool`, podgląd `preview.bridgeSwap`/
      `balanceSwap` zamiast `swapSkipped`, "dokończ krok N/M" z
      `loadRotateProgress`.
- [x] karta ROTATE (MorningCockpit.tsx): `openRotateApprove()` — buduje
      `oldPool` z trzymanej pozycji, `newPool` przez `resolveBotPool(poolId)`
      (ten sam odczyt co "2. Otwórz nową →"), sprawdza `newTickLower/Upper`
      z `p.suggestedRange` i `target.chainId === pos.chainId` PRZED wywołaniem
      `planRotate()` — przy różnych sieciach/braku ticków/rozłącznych parach
      pokazuje `proposalError` i zostają kroki 1/2 ręczne (nieusunięte,
      fallback). Przycisk `[Zatwierdź →]` primary, obok istniejących.
- [x] stany brzegowe: brak pozycji/pool → błąd; różne sieci → komunikat
      "rotacja cross-chain… użyj kroków ręcznych"; throw z `planRotate`
      (pary rozłączne) złapany → komunikat + fallback ręczny. typecheck 0
      błędów w src/ (`npx tsc --noEmit -p tsconfig.json`).

## PARTIA 9 — [Zatwierdź hedge] na GMX (karta propozycji HEDGE) ✅ wykonana — zlecone przez Fable 20.08 (decyzja Rafała)

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

- [x] karta HEDGE (MorningCockpit.tsx): `[Zatwierdź hedge →]` primary obok
      istniejącego linku "Otwórz GMX ↗" (fallback ręczny, zostaje).
      `openHedgeApprove()` — `sizeEth` z `p.hedgeSizeEth`, `ethPriceUsd` z
      `bot.state.pools[poolId].ethUsd` (ta sama pula, dla której bot policzył
      sizeEth); brak jednego z nich → `proposalError` + użyj linku ręcznie.
- [x] `useHedgeExecution.ts` (nowy) — sieć ZAWSZE Arbitrum (GMX_ARBITRUM.chainId,
      zaszyte, nie parametr — hedge to osobny rynek niż pula LP); PRZED
      budową jakiejkolwiek tx sprawdza saldo USDC vs `plan.approval.amount` —
      za mało → rzuca czytelny błąd i NIC nie wysyła (bez auto-swapów w v1);
      allowance → approve tylko gdy trzeba; OBOWIĄZKOWA `client.call`
      symulacja przed wysyłką (jak w rebalanceBuilder — weryfikuje ABI o żywy
      kontrakt); `addTransaction` z `plan.summary`. Uwaga implementacyjna:
      `GMX_ARBITRUM.chainId` z `as const` to literał `42161`, co łapało zbyt
      wąski overload wagmi (`wc.chain` typowało się na `never`, TS2345) —
      fix: `HEDGE_CHAIN_ID: number = GMX_ARBITRUM.chainId` (ten sam wzorzec co
      w reszcie kokpitu, gdzie chainId zawsze jest `number`, nie literałem).
- [x] `HedgeConfirmModal.tsx` (nowy, wspólny dla open/close wg
      `plan.preview.direction`) — summary + preview (sizeEth/sizeUsd,
      collateral, dźwignia, cena akceptowalna, execution fee), ostrzeżenie
      o wykonaniu przez keepera GMX po cenie oracle + link do app.gmx.io do
      sprawdzenia statusu, notka o pierwszym teście na małej kwocie (tylko
      przy otwarciu).
- [x] `[Zamknij short →]` — persystentny status `🛡 Otwarty short (hedge)`
      (niebieska notka, klasa `.morning-hedge-open-note`) nad sekcją
      "Propozycje bota", widoczny gdy `homos_hedge_open` w localStorage;
      `openHedgeCloseModal()` buduje `planHedgeClose` z zapisanego
      sizeUsd/collateralUsd + bieżącej `ethUsd` z dowolnej żywej puli w
      telemetrii. Zapis/czyszczenie stanu w `useHedgeExecution.ts` —
      automatyczne wg `plan.preview.direction` po udanej wysyłce.
- [x] stany brzegowe: brak `sizeEth`/`ethPriceUsd` w propozycji → komunikat +
      link ręczny; za mało USDC na Arbitrum → błąd z kwotą brakującą, zero
      auto-swapów; `sizeUsd < $11` (throw z `planHedgeOpen`) → złapane,
      komunikat. typecheck 0 błędów w src/.

## PARTIA 10 — Redesign kart REALNYCH pozycji wg wzorca paper ✅ wykonana (pomysł Rafała 20.08)

KONTEKST: karty pozycji w kokpicie mają wyglądać jak karty paper tradingu
(dwa wykresy: equity vs HODL + cena vs zakres), akcje przenoszą się do
hamburgera. Backend GOTOWY (Fable): observer zapisuje co 5 min próbki
realnych pozycji do `.bot/positions-history.ndjson` — kształt JAK
paper-history plus `tokenId`: {ts, tokenId, poolId, valueUsd, hodlUsd,
inRange, price, lo, hi}; endpoint `GET /api/positions-history?hours=N`
(tail, auth jak reszta /api). Kotwica HODL = stan pozycji przy PIERWSZYM
zauważeniu przez bota (dla starych pozycji #953465/#953427 = od wdrożenia,
nie od prawdziwego otwarcia — patrz punkt 4 o komunikacji tego w UI).

ZAKRES TWARDY: tylko src/**; bot/** gotowy, nie ruszać.

1. **Wykresy na kartach pozycji** (`MorningCockpit`/`CockpitPositionActions`):
   REUŻYĆ komponenty z PaperTradingPanel (sparkline equity-vs-HODL +
   PriceRangeChart + cieniowanie inRange) — wyekstrahować je do wspólnego
   pliku (np. `src/components/PositionCharts.tsx`) zamiast kopiować; dane
   z nowego stanu `positionsHistory` w `useBotApi.ts` (GET
   /api/positions-history?hours=168, poll co 5 min — wzorzec paper).
   Filtrowanie po tokenId. Stany brzegowe jak w P7 (brak próbek → bez
   wykresu, <2 punkty → tekst).
2. **Hamburger zamiast przycisków**: prawy górny róg karty pozycji — menu ⋮
   (dropdown, bez bibliotek) z akcjami [💰 Zbierz fees] / [⏹ Zamknij] /
   [🔄 Rebalans ręczny] (istniejące handlery z useCockpitActions — TYLKO
   przeniesienie wyzwalaczy, zero zmian w logice). Pozycje disabled z
   tooltipem jak dotychczasowe przyciski. Zamykanie menu: klik poza/Esc.
3. **Rozdział fees**: na kartach REALNYCH pozycji metryka "Nieodebrane fees"
   (dane już są w usePortfolio ze static collect) — wyraźnie, obok wartości
   pozycji ("zebrane od otwarcia" ŚWIADOMIE później — wymaga indeksowania
   eventów Collect, decyzja Rafała: nie teraz). W PAPER panelu rozbić
   dotychczasowe "Fee zebrane" na dwie liczby z pól, które JUŻ przychodzą
   w /api/paper: "reinwestowane" = feesUsd − feesSinceRebalanceUsd oraz
   "narosłe (do reinwestycji)" = feesSinceRebalanceUsd — nazwać po ludzku,
   np. "fees: $X (w tym $Y czeka na rebalans)".
4. **Uczciwość HODL**: przy wykresie equity-vs-HODL realnej pozycji dopisek
   drobnym drukiem "HODL liczony od <data kotwicy>" (pole anchoredAt NIE
   przychodzi w próbkach — wziąć ts PIERWSZEJ próbki danego tokenId).
5. **Spójność**: karta realnej pozycji wizualnie jak karta paper (te same
   klasy paper-*/wspólne style), nagłówek: para · tier · sieć · #tokenId.

- [x] **ekstrakcja wspólnych komponentów wykresów** — `src/components/PositionCharts.tsx`
      (nowy): `Sparkline`/`PriceRangeChart`/`EventMarkers`/`stateBands`/
      `toTsPoints`/`makeXScale`/`fmtPrice`/`ethIsToken0`/`toDisplay` wyekstrahowane
      z `PaperTradingPanel.tsx` bez zmiany logiki. Generyczne nad `EquityChartPoint`
      (wymaga tylko `ts/equityUsd/hodlUsd/inRange`, opcjonalnie `status/price/lo/hi`)
      — `PaperHistoryPoint` pasuje strukturalnie bez zmian, `PositionHistoryPoint`
      (realne pozycje, brak `status`) mapowany na wejściu w MorningCockpit.tsx.
      `stateBands()` uodporniona na brak `status` (realne pozycje: cieniowanie
      tylko po `!inRange`, nigdy "cash" — tego stanu tam nie ma).
      `PaperTradingPanel.tsx` zaktualizowany, żeby importować z nowego pliku
      (usunięta duplikacja ~200 linii).
- [x] **useBotApi: positionsHistory** — `POSITIONS_HISTORY_POLL_MS`/`_HOURS`,
      `PositionHistoryPoint`/`PositionsHistoryStatus`, `fetchPositionsHistory`
      (GET /api/positions-history?hours=168, poll co 5 min, wzorzec `fetchPaper`/
      `fetchRanking`; 503→`not-started`, błąd→`error`). Kształt zweryfikowany
      wprost wobec `git diff bot/server.ts`/`bot/observer.ts` (tablica JSON,
      `price/lo/hi` zawsze obecne, brak pola `status`).
- [x] **karty pozycji: dwa wykresy + nagłówek** — MorningCockpit.tsx: nagłówek
      zmieniony na `para · tier · sieć · #tokenId` (tokenId przeniesiony na
      koniec, `poolLabel` już niósł "para tier · sieć"); `positionsHistory`
      filtrowane po `tokenId` (unikalny per pozycja — bez potrzeby poolId),
      zmapowane na `EquityChartPoint[]`; `<Sparkline>`+`<PriceRangeChart
      poolId={botPoolId}>` (poolId z samej próbki historii — NIE poolAddress,
      bo `BOT_POOL_META`/orientacja ceny kluczują po botPoolId). <2 próbki →
      tekst "za mało punktów historii pozycji jeszcze zebranych.".
- [x] **hamburger ⋮** — `CockpitPositionActions.tsx`: rząd 3 przycisków
      zamieniony na `⋮` + dropdown (`cockpit-menu-*` w styles.css), ZERO zmian
      w handlerach/logice (te same `onClick`/`disabled`/`title`, tylko
      przeniesione do pozycji menu, zamykanych po kliknięciu). Zamykanie:
      klik poza (`mousedown` na `document`) i `Esc` — `useRef` + `useEffect`
      sprzątany w cleanupie. `CloseModal`/`RebalanceModal` nietknięte.
- [x] **fees** — realne pozycje: istniejąca linijka "Nieodebrane fee" (już
      była, zweryfikowana jako spełniająca wymóg — obok wartości pozycji w
      nagłówku karty). Paper: `PaperPosition.feesSinceRebalanceUsd` dodane do
      `useBotApi.ts` (zweryfikowane wprost w `bot/paper.ts` — pole zawsze
      serializowane w `state.positions[id]`, nie tylko wewnętrznie); "Fee
      zebrane" rozbite na "Fee reinwestowane" (`feesUsd − feesSinceRebalanceUsd`,
      z podłogą 0) i "Fee narosłe (do reinwestycji)" (`feesSinceRebalanceUsd`).
- [x] **dopisek "HODL od <data>"** — `hodlSince` = `ts` najstarszej próbki
      danego `tokenId` w `positionsHistory` (posortowane rosnąco po dacie —
      `anchoredAt` faktycznie nie przychodzi w odpowiedzi, zgodnie z
      zapowiedzią w KONTEKŚCIE), pokazany jako `.paper-range-caption` nad
      wykresem cena/zakres.
- [x] **stany brzegowe + typecheck** — jak w P7 (brak próbek → bez wykresów,
      <2 punkty → tekst zamiast wykresu, `PriceRangeChart` samo zwraca `null`
      gdy <2 próbki z `price`). `npx tsc --noEmit -p tsconfig.json`: 0 błędów
      w `src/` (pozostałe `bot/observer.ts`/`node_modules/ox` preexisting,
      jak w poprzednich partiach). `npm run build`: czysty (tylko warningi o
      rozmiarze bundle'a, preexisting).

### Hotfix przy okazji (20.08, zgłoszenie Rafała: "nie wstaje aplikacja lokalnie")
- [x] **`Cannot convert a BigInt value to a number` w runtime** —
      `src/utils/hedgeBuilder.ts` (`10n ** 30n`, `10n ** 12n`) i
      `src/utils/rebalanceBuilder.ts` (`10n ** 18n` ×2, dodane w P8/P9)
      używały `**` na BigIntach; babel (`transform-exponentiation-operator`)
      transpiluje `**` na `Math.pow()` BEZ rozróżniania typu operandów —
      `Math.pow(10n, 30n)` rzuca w runtime (tsc/build tego nie łapią, pada
      dopiero w przeglądarce). Ten sam bug był już raz naprawiony gdzie
      indziej (build CC-Win, wzmianka "0 Math.pow(2n" w HANDOFF) — wrócił,
      bo nowy kod (hedgeBuilder/rebalanceBuilder z P8/P9) go nie znał. Fix:
      literały (`1_000_000_000_000_000_000n` itd.) zamiast `**` we
      wszystkich czterech miejscach, z komentarzem ostrzegawczym przy każdym,
      żeby nie wróciło znowu. Zweryfikowane też na poziomie builda:
      `grep -oE "Math\.pow\([0-9]+n" public/*.bundle.js` — brak trafień.
      (Pozostałe `**` w repo są Number**Number — `2 ** 96` itp. — te są
      bezpieczne, `Math.pow(2,96)` działa normalnie.)

## PARTIA 11 — Hedge GMX widoczny w aplikacji ✅ wykonana (uwaga Rafała po teście E2E 20.08)

KONTEKST: testowy short $15 istniał tylko na app.gmx.io i w localStorage
jednej przeglądarki — nie było go na wykresach/telefonie/raporcie. Backend
GOTOWY (Fable): observer czyta pozycje z GMX Readera co cykl (5 min) →
(1) `state.hedge` w /api/state: {isLong, sizeUsd, sizeEth, collateralUsd,
entryPriceUsd, pnlUsd, equityUsd, updatedAt} | null; (2) próbki w
/api/positions-history pod tokenId 'gmx-eth-short' (poolId 'gmx-eth-usd',
valueUsd=equity, hodlUsd=collateral jako benchmark "cash bez shorta",
price=ETH USD, BEZ lo/hi — perp nie ma zakresu); (3) Telegram na
przejściach open/close + ostrzeżenie o sierocie.

ZAKRES TWARDY: tylko src/**; bot/** gotowy.

1. **Typy** (`useBotApi.ts`): `BotState.hedge?: BotHedgeLive | null` (kształt
   wyżej).
2. **Karta hedge w sekcji pozycji**: gdy `state.hedge` ≠ null — karta
   "🛡 GMX ETH/USD · SHORT 1×" (rozmiar/entry/PnL kolorowany/collateral) +
   sparkline equity-vs-collateral z positions-history ('gmx-eth-short');
   BEZ wykresu cena-vs-pasmo (brak lo/hi → PriceRangeChart i tak się nie
   wyrenderuje — zweryfikować, że cicho, nie z błędem). Przycisk
   [Zamknij short →] przeniesiony na tę kartę (istniejący handler
   openHedgeCloseModal; sizeUsd/collateralUsd brać z `state.hedge`, NIE z
   localStorage — dane on-chain są prawdą).
3. **localStorage `homos_hedge_open` = tylko fallback** na czas gdy bot
   offline / state.hedge niedostępne (stara notka zostaje wtedy); gdy
   state.hedge żyje, notka localStorage ukryta (jedno źródło prawdy na
   ekranie). Przy state.hedge===null a localStorage ustawionym → wyczyść
   localStorage (bot mówi: pozycji nie ma).
4. Stany brzegowe: hedge LONG (nie powinien istnieć, ale pokazać uczciwie
   z ⚠️); brak próbek historii → karta bez sparkline.

- [x] **typy `BotHedgeLive` + `state.hedge`** (`useBotApi.ts`) — kształt
      zweryfikowany wprost wobec `interface HedgeLive` w `bot/observer.ts`
      (isLong/sizeUsd/sizeEth/collateralUsd/entryPriceUsd/pnlUsd/equityUsd/
      updatedAt). `hedge?: BotHedgeLive | null` na `BotStateShape` — `null`
      jawne (bot potwierdza brak pozycji) odróżnione od pola nieobecnego
      (starszy state.json / stan jeszcze niewczytany), bo tylko `null` jest
      podstawą do auto-czyszczenia fallbacku localStorage.
- [x] **karta hedge w sekcji pozycji** (`MorningCockpit.tsx`) — renderowana
      jako pierwsza karta w `cockpit-position-cards` gdy `bot.state.hedge`
      istnieje (siatka kart pokazuje się też, gdy user nie ma ŻADNEJ pozycji
      LP, ale ma hedge — warunek pustej sekcji rozszerzony o `!liveHedge`).
      Nagłówek "🛡 GMX ETH/USD · SHORT 1×" (LONG → "LONG ⚠️" + żółty box
      ostrzeżenia, pkt 4), linia rozmiar/entry/collateral, PnL kolorowany
      (zielony/czerwony jak `paper-positive`/`forecast-negative`), sparkline
      equity-vs-collateral z `positionsHistory` filtrowanego po tokenId
      `'gmx-eth-short'` (mapowane `valueUsd→equityUsd`, `hodlUsd`=collateral
      benchmark — reużyty `<Sparkline>` z `PositionCharts.tsx`, ZERO zmian w
      komponencie). `<PriceRangeChart>` ŚWIADOMIE nieużyty — zweryfikowano, że
      przy samym `price` (bez `lo`/`hi`) komponent NIE zwróciłby `null`
      automatycznie (renderowałby samą linię ceny bez pasma) wbrew założeniu
      w opisie zadania — bezpieczniej i zgodnie z duchem "BEZ wykresu
      cena-vs-pasmo" po prostu go nie wołać na tej karcie, niż polegać na
      milczącym samo-ukryciu. `[Zamknij short →]` przeniesiony na kartę,
      reużywa istniejący `openHedgeCloseModal` (patrz niżej).
- [x] **localStorage jako fallback + auto-czyszczenie** — `openHedgeCloseModal`
      przebudowany: sizeUsd/collateralUsd biorą PIERWSZEŃSTWO z `bot.state.hedge`
      (on-chain, prawda), `homos_hedge_open` (localStorage) tylko gdy
      `state.hedge` niedostępny. Persystentna notka "🛡 Otwarty short" (dawniej
      zawsze widoczna przy `hedgeOpen`) teraz warunek `!liveHedge && hedgeOpen`
      — znika, gdy karta hedge (z danych on-chain) już to pokazuje, jedno
      źródło prawdy na ekranie; treść notki dopisana "z ostatniego zapisu w
      tej przeglądarce — bot offline/dane jeszcze niedostępne", żeby nie
      mylić z danymi live. Nowy `useEffect`: `state.hedge === null` (JAWNIE,
      nie `undefined`) + `hedgeOpen` ustawiony → `clearHedgeOpen()` +
      `setHedgeOpen(null)` (bot potwierdza brak pozycji — fallback nieaktualny).
- [x] **stany brzegowe + typecheck** — LONG pokazany uczciwie z ⚠️ (pkt 4);
      brak próbek historii hedge (<2) → tekst zamiast sparkline'a, zero
      błędu. `npx tsc --noEmit -p tsconfig.json`: 0 błędów w `src/`
      (pozostałe `bot/observer.ts`/`node_modules/ox` preexisting). `npm run
      build`: czysty (tylko warningi o rozmiarze bundle'a, preexisting).

## Partia 11 (21.08, Fable za zgodą Rafała — normalnie lane @Sonnet): ikony stanu pozycji

Zgłoszenie Rafała: „teraz jest cały czas zielona kropka nawet dla
wypadniętych" — pozycja poza zakresem nie zarabia opłat, a wyglądała
identycznie jak zdrowa.
- [x] `PaperTradingPanel.tsx`: `statusIcon(status, inRange)` — 🟢 w zakresie,
      **⚠️ poza zakresem**, 💤 w gotówce, ⏳ przed startem; ⛔ zostaje jako
      osobny badge sygnału trendu. Out-of-range PODMIENIA ikonę, nie dokłada
      drugiej (decyzja Rafała: jedna ikona = jeden stan).
- [x] `MorningCockpit.tsx`, sekcja „Pozycje — akcje": ten sam język ikon dla
      REALNYCH pozycji (wcześniej był tam tylko ADVICE_ICON, bez statusu).
      ✅ IN_RANGE_HOLD usunięte z widoku (duplikat 🟢); rada bota pokazywana
      jako drugi znaczek tylko dla 🔄 REBALANCE i ⏳ WAIT_NOT_PROFITABLE.
- [x] `title=` na każdej ikonie (tooltip po polsku) + `.status-legend`
      (legenda pod nagłówkiem obu sekcji), styl w `styles.css`.
- Dane: `position.inRange` (realne) i `PaperHistoryPoint.inRange` (paper) —
  były już w API, zero zmian po stronie bota. `npx tsc --noEmit` czysty.
- [x] **Licznik czasu poza zakresem** (druga prośba Rafała, ten sam dzień):
      paper — z `outOfRangeSince` (pole było w JSON z /api/paper, brakowało
      w typie `PaperPosition`; dodane) + odliczanie do progu 24h i osobny
      komunikat po jego minięciu („czeka na opłacalność"). Realne pozycje —
      `outOfRangeSince` tam NIE istnieje, więc czas liczony z próbek
      `positionsHistory` (`outOfRangeSinceFromHistory`, dokładność ~15 min,
      prefiks „~"); zamiast odliczania pokazujemy, na co pozycja czeka, bo
      realne pozycje nie mają histerezy 24h (patrz uwaga niżej).
- [ ] **DO ROZSTRZYGNIĘCIA (nie UI, zgłoszone przy okazji):** paper czeka 24h
      przed rebalansem, a dla REALNYCH pozycji `bot/observer.ts:544` wystawia
      propozycję NATYCHMIAST, gdy doradca powie REBALANCE — bez histerezy.
      Trzecia dziś znaleziona rozbieżność model/produkcja (por.
      DECYZJE-2026-08-26 pkt 10). Do decyzji na przeglądzie 26.08.

## Partia 12 (21.08): usunięcie sekcji „Zarządzaj (zaawansowane)" + fix crasha

- [x] **CRASH ZNALEZIONY I NAPRAWIONY** (odtworzony na localhost z podłączonym
      portfelem): `Rendered more hooks than during the previous render`,
      stack → `TransactionHistory.tsx:75-77`. Powód: `useTransaction`,
      `useWaitForTransactionReceipt` i `useEffect` wołane WEWNĄTRZ
      `transactions.forEach(...)` — liczba hooków zależała od liczby
      transakcji „pending" i zmieniała się między renderami. Poprawka:
      obserwator jednej transakcji jako osobny komponent `PendingTxWatcher`
      (hooki na najwyższym poziomie, zmienna jest liczba zamontowanych
      komponentów — to legalne). WAŻNE: crash NIE był w kasowanym kodzie,
      tylko w pliku, który zostaje — samo usunięcie sekcji by go nie
      naprawiło, jedynie ukryło.
- [x] Usunięte (10 plików + 3 CSS): `PoolBrowser`, `TopPools`, `UniswapPool`,
      `MarketVolatility`, `utils/marketVolatility`, cały `LiquidityManager`
      (z `components/`), `styles/{marketVolatility,liquidityManager,uniswapPool}.css`.
- [x] `TransactionHistory` ZOSTAJE — to moduł zapisu dla akcji kokpitu
      (`addTransaction` w use*Execution/useCockpitActions). Odpięty tylko
      jego widok.
- [ ] **NASTĘPNY KROK (nie UI):** księga transakcji po stronie bota +
      eksport CSV pod podatki. Obecny zapis to localStorage, ostatnie
      **10** wpisów, per adres, bez eksportu — pod rozliczenia bezużyteczny
      (UI-VISION.md: SQLite + CSV, „każda akcja = zdarzenie podatkowe").
- [x] **Ujednolicenie sekcji „Ranking dnia (TOP 10)"** (uwaga Rafała 21.08:
      „ma jakąś dodatkową belkę"): panel był opakowany w `ExpandableSection`
      w `MorningCockpit`, przez co dostawał ramkę karty i niebieski tytuł,
      inaczej niż Telemetria bota / Prognoza zysku / Analiza obserwacji.
      Teraz `TopRankingPanel` sam trzyma stan zwinięcia i używa tego samego
      szkieletu (`telemetry-section` > `telemetry-header` > `telemetry-body`).
      Ikona 🏆 usunięta. Data i kryteria zeszły z tytułu do linijki
      `.topranking-criteria-line` w ciele sekcji. Stany błędu/ładowania
      renderują się teraz WEWNĄTRZ sekcji (nagłówek widoczny zawsze) — przy
      okazji `useState` jest przed wszystkimi returnami, zgodnie z lekcją
      z dwóch crashy „Rendered more hooks…".
- [x] **Pusty ekran bez portfela**: `MorningCockpit` zwracał `null`, gdy
      portfel niepodłączony. Po usunięciu sekcji „Zarządzaj" oznaczało to
      CAŁKOWICIE pustą stronę wyglądającą jak zepsuta aplikacja. Teraz jest
      jednozdaniowy komunikat „Podłącz portfel…". Zauważone przy weryfikacji
      w przeglądarce, nie zgłoszone — ale to pierwsza rzecz, jaką zobaczy
      ktoś otwierający apkę bez portfela.
- [x] **Kokpit jako główny layout** (decyzja Rafała 21.08: „po usunięciu
      starego widoku kokpit to w zasadzie cała nasza aplikacja"): usunięty
      tytuł „☀️ Poranny kokpit", strzałka zwijania i cały stan `collapsed`
      — treść renderuje się zawsze. W nagłówku modułu zostało wyłącznie ⚙
      (adres/token API) + kropka statusu bota. Kropkę najpierw usunąłem jako
      duplikat tej z App.tsx — Rafał od razu zauważył brak, więc wróciła:
      to WŁAŚNIE ona jest czytana jako „połączenie z serwerem żyje", bo stoi
      obok ustawień połączenia. Lekcja: duplikat w UI nie zawsze jest zbędny,
      liczy się kontekst, w którym stoi. Nowa klasa
      `.morning-header-bare` (bez `cursor:pointer` i bez hovera, bo nagłówek
      nie jest już przełącznikiem).
- [x] **Nagłówek portfela: Sepolia usunięta + salda per sieć** (uwagi Rafała
      21.08). Przy okazji ZNALEZIONY BŁĄD, nie tylko sprzątanie:
      `CompactWalletInfo` miał logikę BINARNĄ — etykieta
      `isMainnet ? 'Mainnet' : 'Sepolia'` i adresy tokenów „mainnet albo
      Sepolia". Efekt: na Base i Arbitrum nagłówek pisał „Sepolia" i pytał
      o salda pod adresami SEPOLII, więc WETH/USDC zawsze pokazywały 0.
      Zweryfikowane na żywo: po poprawce nagłówek na Arbitrum pokazuje
      **USDC: 152.78**, wcześniej 0.00000000.
      Teraz: lista tokenów pochodzi z `NETWORKS` (utils/uniswap.ts) — czyli
      tych, którymi bot operuje na danej sieci (Base ma cbBTC, mainnet USDT)
      + natywny ETH; przełącznik ⇄ zastąpiony `<select>` z sieciami
      Mainnet/Base/Arbitrum; format sald czytelny (`<0.0001` zamiast
      ośmiu zer).
      DLACZEGO NIE „wszystkie tokeny z portfela": po ERC-20 nie da się
      wylistować sald bez indeksera (Alchemy/Covalent/Moralis) — RPC
      odpowiada tylko na „ile mam TEGO tokena", a do tego dochodzą
      tokeny-śmieci. Do rozważenia, jeśli kiedyś chcemy pełny widok portfela.
- [x] Usunięte razem z Sepolią: `FaucetSection.tsx` (renderował się tylko na
      Sepolii), `utils/wagmi.ts` (martwy, zero importerów), rozbudowany
      `WalletInfo` (panel testnetowy, nigdzie nieimportowany), stałe
      testnetowe i `getOrCreatePool` z `utils/uniswap.ts`, wpis SEPOLIA
      w `NETWORKS`, sieć `sepolia` w `config/wallet.ts`.
- [x] **Przełącznik sieci USUNIĘTY, trzy sieci obok siebie** (pytanie Rafała
      21.08). Przełącznik był zbędny w obie strony: do OGLĄDANIA, bo
      `usePortfolio` i tak czyta pozycje z mainnet+Base+Arbitrum naraz
      (`usePublicClient({chainId})`), a salda da się czytać cross-chain
      (`useBalance({chainId})`); do DZIAŁANIA, bo każda akcja przełącza sieć
      sama przed podpisem (`switchChainAsync` w useCockpitActions /
      useRebalanceExecution / useRotateExecution / useHedgeExecution).
      Mógł więc tylko mylić („jestem na złej sieci, dlatego nie widzę środków").
- [x] **DRUGI BŁĄD tej samej rodziny: „Wartość łączna" liczyła tylko mainnet.**
      `usePortfolio` pobierał salda ETH/WETH/USDC wyłącznie z `chainId: 1`
      (komentarz w kodzie: „Mirrors CompactWalletInfo's balance fetch"),
      choć pozycje czytał z trzech sieci. Efekt: nagłówek zaniżał stan
      portfela o wszystko na L2. Po poprawce **$160.98 → $321.12** (te same
      152 USDC na Arbitrum, które wcześniej ukrywał nagłówek portfela).
      Sumujemy ETH+WETH (jeden kurs) i USDC (1:1) przez trzy sieci.
      ŚWIADOMIE POMINIĘTE: cbBTC na Base — wymaga kursu BTC, którego UI nie ma
      (bot liczy go przez pulę referencyjną). Jeśli trafi tam realny kapitał,
      trzeba dociągnąć cenę, inaczej „Wartość łączna" znów zaniży.
      Hooki `useBalance` wypisane jawnie (3 sieci × 3 tokeny), nie w pętli —
      liczba hooków musi być stała, patrz dwa dzisiejsze crashe.

## PARTIA 12 — Ranking dnia: PRAWDZIWY status walidacji per pula (zlecone przez Fable 24.08, prośba Rafała)

**Problem (wprost od Rafała):** obecna etykieta „✅ w konfiguracji bota /
poza konfiguracją" sugeruje, że config = zwalidowana, a reszta = odrzucona.
NIEPRAWDA: „poza konfiguracją" to w większości pule NIEBADANE, dwie są
twardo ODRZUCONE bramką walkforward, a niektóre czekają w kolejce walidacji.

**Backend już jest (Fable, 24.08, w tej samej paczce):**
`GET /api/candidates` (bot/server.ts) → tablica `CandidateVerdict`
(typ w `bot/candidates.ts`): `{ llamaPool, chain, symbol, feeTier,
verdict: 'PASS'|'FAIL'|'QUEUED'|'UNMAPPED', winPct?, worst?, testedAt?,
note? }`. Dopasowanie do wierszy rankingu PO `llamaPool` (uuid — wiersze
/api/ranking go mają). Autoryzacja jak inne /api/* (Bearer token).

**Zakres (TopRankingPanel + useBotApi):**
- [x] `useBotApi`: pobranie `/api/candidates` (poll rzadki — raz na
      godzinę wystarczy, werdykty zmieniają się raz na dobę; osobny stan,
      NIE ruszać istniejących pollerów), typ `CandidateVerdict` 1:1 z
      bot/candidates.ts.
- [x] Wiersz rankingu pokazuje JEDEN z pięciu stanów (priorytet z góry):
      1. ✅ **gra w bocie** — pula w BOT_POOLS (obecna logika „w
         konfiguracji" zostaje jako ten stan, zmienia się tylko etykieta);
      2. ⛔ **odrzucona** — verdict FAIL; tooltip: `winPct`/`worst`/
         `testedAt`/`note` (np. „55% wygr., worst −18.0, 19.08”);
      3. 🔬 **w kolejce walidacji** — verdict QUEUED;
      4. ❔ **wymaga ręcznego mapowania** — verdict UNMAPPED (na razie
         nie wystąpi, lejek dopiero powstaje — obsłużyć, żeby nie
         wybuchło później);
      5. — **niebadana** — brak werdyktu i nie w BOT_POOLS (wyszarzona
         etykieta zamiast obecnego mylącego „poza konfiguracją").
      Werdykt PASS poza BOT_POOLS → osobny stan „✔ zwalidowana (nie gra)"
      — zielony tekst, nie pełne ✅, żeby odróżnić od grających.
- [x] Legenda stanów pod tabelą (wzorzec `.status-legend` z P-ikon 21.08).
- [x] Stany brzegowe: błąd/offline z /api/candidates → `candidates===null`,
      mapa werdyktów pusta, tabela działa jak dziś (wiersze spadają do
      „gra w bocie"/„niebadana"), ŻADNEGO czerwonego błędu.
- [x] ZAKRES TWARDY: tylko src/** (`useBotApi.ts`, `TopRankingPanel.tsx`,
      `styles.css`). bot/** nietknięty (tylko odczyt typu). Semantyka
      stanów NIE zmieniona względem specu.

**Kontekst:** TASKS-FUNNEL.md (auto-lejek — docelowo werdykty będzie
pisał nocny krok pipeline'u; do tego czasu endpoint serwuje seed z kodu:
2×FAIL z walidacji 17/19.08 + 2×QUEUED wiszące propozycje OPEN).

**ZROBIONE (Sonnet, 24.08):** `useBotApi.ts` — `CandidateVerdict`/
`CandidatesStatus`, `candidates`/`candidatesStatus`, poller godzinny
(`fetchCandidates`, `CANDIDATES_POLL_MS`). `TopRankingPanel.tsx` —
`candidateStatus()` dopasowuje werdykt po `llamaUuid`→`llamaPool`,
priorytet: botPoolId → FAIL → QUEUED → UNMAPPED → PASS(„zwalidowana,
nie gra") → niebadana; tooltip `title=` z winPct/worst/testedAt/note;
legenda `.status-legend` pod nagłówkiem tabeli. `styles.css` — 4 nowe
klasy `.topranking-status-{fail,queued,unmapped,validated}`.
`npx tsc --noEmit` czysty na tych plikach (2 błędy pre-existing w
`bot/observer.ts`/vendor, niezwiązane), `webpack --mode production`
kompiluje bez błędów.

## FIX (25.08): próg [Zbierz fees] z żywego gazu (zgłoszenie Fable/Rafał)

**Problem:** mainnet, realny koszt collectu $0.27 (0.75 Gwei), przycisk
zablokowany progiem $64 (`GAS_USD[1]=8 × COLLECT_THRESHOLD_MULT=8`, stała).

**ZROBIONE (Sonnet, 25.08):** `useCockpitActions.ts` — nowy poller
(`GAS_PRICE_POLL_MS=2min`, `getGasPrice()` przez 3 istniejące
`usePublicClient`, dep na referencjach klientów nie na `clients` żeby
uniknąć re-fetchu co render), `liveGasCostUsd(chainId, ethUsd)` =
gasPriceWei × `COLLECT_GAS_UNITS=150_000n` × kurs ETH,
`collectThresholdUsdLive`/`isCollectWorthwhileLive` — spadają na starą
stałą `GAS_USD` TYLKO gdy brak odczytu gazu lub `ethUsd===null` (stare
`isCollectWorthwhile`/`collectThresholdUsd` nietknięte, zostają jako ten
fallback). Kurs ETH: `usePortfolio.ts` dostał nowe pole `ethUsd` w
`PortfolioSummary` (już liczone wewnętrznie z puli stable/ETH
użytkownika — zero nowych odczytów RPC). `CockpitPositionActions.tsx` —
nowy prop `ethUsd`, użycie `actions.isCollectWorthwhileLive`/
`collectThresholdUsdLive` zamiast starych czystych funkcji; tooltip
pokazuje żywy próg. `MorningCockpit.tsx` — przekazuje `portfolio.ethUsd`.
Mnożnik `COLLECT_THRESHOLD_MULT=8` nietknięty. `advisor.ts` (koszt
rebalansu) NIE ruszany — lane analityczny. `npx tsc --noEmit` i
`webpack --mode production` czyste.

## FIX (25.08): brakujący CSS modali (bug produkcyjny, zgłoszenie Rafała)

**Problem:** klasy `modal-overlay`/`modal-content`/`modal-header`/
`modal-body`/`modal-actions` (używane przez 6 modali: CockpitPositionActions
×2, BotTelemetry, HedgeConfirmModal, RebalanceSequenceModal,
RotateSequenceModal) nie miały ŻADNYCH reguł w `styles.css` — modal
renderował się przezroczysty, bez tła, przycisk potwierdzenia poza
zasięgiem (`.app { text-align: center }` globalnie kaskadowało w głąb).

**ZROBIONE (Sonnet, 25.08):** dodane w `styles.css` (przed
`.telemetry-json-modal`, który je rozszerza): `.modal-overlay` (fixed,
inset 0, półprzezroczyste tło, `z-index: 1000` — dotychczasowe max w
pliku to 5 przy `.cockpit-menu-dropdown`), `.modal-content` (biała karta,
`border-radius: 12px`, `box-shadow`, `max-width: 480px`, `max-height: 85vh`
+ `overflow-y: auto`, `text-align: left` nadpisujące `.app`),
`.modal-header`/`.modal-body`/`.modal-actions` (layout nagłówka/treści/
rzędu przycisków). Przy okazji dodane też brakujące `.close-button`,
`.primary-button`/`.secondary-button`, `.message`/`.message.error`/
`.message.success` — też używane w tych modalach (i w
`CockpitPositionActions.tsx` poza modalem), też bez żadnego CSS.
Sprawdzone po jednym wystąpieniu w każdym z 6 modali (grep, nie tylko
screenshot). `webpack --mode production` czysty.

## FIX (25.08 wieczór): UX sekwencji [⏹ Zamknij] + toast na złej karcie
(zgłoszenie Rafała po 1. bojowym zamknięciu pozycji #953427 przez apkę —
SUKCES, ale "na ślepo")

**Problem 1:** `CloseModal` pokazywał tylko "Przetwarzanie…" przez ~30s
między 2 podpisami w Rabby (decrease → collect) — brak widoczności, na
którym kroku jesteśmy. **Problem 2 (bug, screen Rafała):** toast "Pozycja
#953427 zamknięta w 100% ✓" wyrenderował się NA KARCIE INNEJ pozycji
(#953465) po zniknięciu zamkniętej karty — `actions.message` to JEDEN
stan współdzielony przez wszystkie karty (jeden `useCockpitActions()` w
`MorningCockpit`, przekazywany jako prop), a warunek renderu sprawdzał
tylko `actions.message &&`, bez dopasowania do pozycji.

**ZROBIONE (Sonnet, 25.08):** `useCockpitActions.ts` — `CockpitMessage`
dostał pole `key` (=`posKey(chainId, tokenId)`), wszystkie 3 miejsca
wołające `setMessage` (collectFees/closePosition/openPositionAtRange) go
teraz ustawiają; auto-dismiss `message` po 10s (`useEffect`+`setTimeout`)
niezależnie od dopasowania klucza. Nowy stan `closeStatus: Record<string,
CloseStepStatus>` (per pozycja, `{step: 1|2, hash1?, hash2?, done,
error?}`) — `closePosition` aktualizuje go w 5 punktach sekwencji (start
kroku 1 → hash1 wysłany → krok 2 → hash2 wysłany → done/error), błąd w
środku NIE gubi już osiągniętego postępu (hash1 zostaje widoczny).
Nowa stała `EXPLORER_TX_URL`/`explorerTxUrl()` (1/8453/42161 →
etherscan/basescan/arbiscan) — świadomie NIE reużywa binarnego
mainnet/Sepolia helpera z `TransactionHistory.tsx` (ten plik poza
zakresem edycji, i tak ma nieaktualny dług sprzed usunięcia Sepolii 21.08).
`CockpitPositionActions.tsx` — nowy komponent `CloseSteps` (wzorzec
`.sequence-step*` z `RebalanceSequenceModal.tsx`, Partia 4b): 2 stałe
kroki ze statusem (○/⏳/✓/⚠️), link do eksploratora po wysłaniu hasha,
notka o „Simulation failed" w Rabby przy kroku 2 (TYLKO gdy krok faktycznie
czeka na podpis, nie przy realnym błędzie). `message` render dostał
warunek `actions.message.key === posKey tej karty` (fix bugu #2) — sam
komponent, sama linijka co dawniej, tylko z dopasowaniem. `CloseModal`
zablokowany (suwak/chipy/slippage) po starcie sekwencji, przycisk
"Ponów (krok N/2)" po błędzie, "Zamknij okno" po `done`. Oba call site'y
(`CockpitPositionActions.tsx` wewnętrzny + `MorningCockpit.tsx` modal
propozycji ROTATE) przekazują `status={actions.closeStatus[posKey]}`.
SPRAWDZONE przy okazji (prośba z wpisu): karty pozycji już mają
`key={`${chainId}-${tokenId}`}` w `MorningCockpit.tsx` — NIE index, więc
druga część zgłoszenia („przy okazji sprawdź") była już OK, zero zmian
tam potrzebnych. `npx tsc --noEmit` i `webpack --mode production` czyste.

## PARTIA 13 — PILNA: state control modala „Otwórz pozycję" ✅ wykonana (Sonnet 27.08; zgłoszenie Rafała przy wejściu REALNYM kapitałem)
Kontekst: pierwsze otwarcie pozycji produktowej przez kokpit wymagało
3× approve, 2× zamknięcia/otwarcia modala i ręcznego korygowania kwot.
Pozycja ostatecznie otwarta, ale każdy z poniższych punktów zaobserwowany
na żywo. Zakres: src/components/CockpitPositionActions.tsx +
src/hooks/useCockpitActions.ts. NIE zmieniać logiki budowy transakcji.

1. **approveToken: receipt-wait jako best-effort** (ta sama klasa i ten
   sam fix co useHedgeExecution 20.08): po `writeContract` hash JEST
   wysłany — `waitForTransactionReceipt` opakować w try/catch z krótkim
   retry (2×5 s), a po niepowodzeniu NIE rzucać, tylko kontynuować do
   `refreshBalances()`. Obecnie throw przed refreshem zostawia stale
   allowance i przyciski Approve „wracają" mimo podpisanych zgód.
2. **Odświeżanie allowance po approve niezawodnie**: po każdym approve
   (sukces lub timeout receiptu) ponowny odczyt balance+allowance;
   dodatkowo odczyt przy KAŻDYM otwarciu modala (mount) — jest — oraz
   przycisk ręczny „↻ odśwież salda" w stopce modala (fallback).
3. **Modal ma się ZAMKNĄĆ po sukcesie otwarcia pozycji**: onDone z
   openPositionAtRange ma wołać onClose (dziś pozycja się otwiera, a
   modal wisi dalej z aktywnymi polami — user nie wie, czy się udało).
   Toast „Nowa pozycja otwarta ✓" ma przeżyć zamknięcie modala (globalny
   message, nie wewnątrz modala).
4. **Przycisk MAX przy saldzie** obu tokenów: wpisuje DOKŁADNE saldo
   (formatUnits bez zaokrąglenia), nie wyświetlaną wartość.
5. **Wyświetlanie salda: NIE zaokrąglać w górę** — toFixed(2) na USDC
   pokazuje 1827.50 przy realnym 1827.49x i user wpisuje więcej niż ma
   („Za mało środków" bez wyjaśnienia skąd). Ucinać w dół (floor) i/lub
   pokazywać pełną precyzję w tooltipie.
6. **Kwoty po auto-przeliczeniu vs approve**: jeśli przeliczenie
   podniesie kwotę POWYŻEJ już zatwierdzonego allowance, pokazać
   dopisek przy przycisku Approve („zatwierdzone: X, potrzebne: Y")
   zamiast gołego powrotu przycisku — user myśli, że podpis przepadł.
Weryfikacja: tsc + build + test na sucho (modal na puli bez pozycji,
konto z małym saldem) — scenariusz: wpisz saldo z zaokrąglenia (błąd
widoczny z wyjaśnieniem), approve, zmień kwotę w dół (approve nie
wraca), otwórz (modal zamyka się, toast zostaje).

## PARTIA 13b — follow-up modala Otwórz (obserwacje z otwarcia nogi cbBTC 27.08)
1. **Layout stopki modala**: po dojściu dopisków „zatwierdzone/potrzebne"
   i przycisku „↻ odśwież salda" przyciski zawijają się i rozjeżdżają
   (screenshot Rafała) — stopka potrzebuje flex-wrap z sensownymi
   szerokościami / dopiski pod przyciskiem zamiast w nim.
2. **Etykieta jednostek zakresu**: placeholder „Min (USD)/Max (USD)"
   jest FAŁSZYWY dla pul kwotowanych w WETH (base-cbbtc-weth-005 —
   pola są w cbBTC-za-WETH, ratio ~0.031). Pokazywać dynamicznie
   jednostkę pary (np. „cbBTC za WETH") + podpowiedź bieżącej ceny.
3. **Prefill z propozycji**: modal zassał STARY wąski zakres (±16%,
   k×σ z 25.08) — do wyjaśnienia razem z botem, czemu stara propozycja
   wróciła po restarcie (klasa „Odrzuć"); UI-side: przy prefillu
   pokazywać szerokość ±% wyliczoną z zakresu, żeby użytkownik widział
   od razu, że to nie jest produktowe ±40/50%.

## PARTIA 14 — nagłówek statystyk na kartach REALNYCH pozycji jak w paper (prośba Rafała 27.08 wieczór)
Cel: karta realnej pozycji dostaje ten sam pasek metryk co karta paper:
PnL od startu · vs HODL 50/50 · Fee reinwestowane · Fee narosłe ·
Koszty · Rebalanse. Wzorzec wizualny 1:1 z PaperTradingPanel (wspólny
komponent z Partii 10 — rozszerzyć, nie duplikować).
DOSTĘPNE DZIŚ (z /api/state + positions-history + kotwic HODL):
- PnL od startu = valueUsd − wartość z kotwicy (positions-hodl.json;
  dopisek "od <data kotwicy>" jak przy HODL — dla pozycji sprzed
  wdrożenia kotwica ≠ otwarcie),
- vs HODL 50/50 = valueUsd − hodlUsd (ostatni punkt positions-history),
- Fee narosłe (nieodebrane) = już jest na karcie (przenieść do paska).
BRAK DANYCH BOT-SIDE (pokazywać "—" z tooltipem "w budowie" do czasu
paczki Fable; NIE liczyć w UI z niczego przybliżonego):
- Fee reinwestowane, Koszty (gaz+swapy), Rebalanse — wymagają
  podpięcia księgi (bot/ledger.ts) per tokenId; zadanie po stronie
  Fable (observer/server: pola collectedFeesUsd/costsUsd/rebalances
  w positions w /api/state). UI ma tylko wyrenderować pola, gdy się
  pojawią (feature-detect po obecności pola, nie po wersji).
Zakres: src/** (wspólny komponent karty + typy w useBotApi).

## PARTIA 15 — wycena USD pozycji bez nogi stable/ETH z danych BOTA (zgłoszenie Rafała 27.08, karta #5887690 "bez wyceny")
Problem: karta realnej pozycji WETH/cbBTC i nagłówek wartości łącznej
pomijają wycenę USD ("— (bez wyceny)", nota o braku feeda). Feed JEST:
observer liczy USD przez kurs referencyjny (BOT_POOLS.usdRefPoolId →
base-weth-usdc-030) i wystawia:
- `/api/state` → `positions[].valueUsd` (np. #5887690 = $2,323.35),
- `/api/positions-history` → próbki z `valueUsd` + `hodlUsd` (USD!).
Zadanie (src/** only):
1. Karta pozycji: gdy usePortfolio nie ma wyceny USD, a pozycja
   (tokenId) występuje w `/api/state.positions` → użyć `valueUsd`
   bota jako wyceny karty, z dopiskiem "wycena bota (kurs ref.,
   odświeżanie ≤5 min)".
2. Pasek metryk (Partia 14): PnL od startu i vs HODL dla takich
   pozycji liczyć z positions-history (valueUsd/hodlUsd — już w USD),
   zamiast "—".
3. Nagłówek wartości łącznej: pozycje z wyceną bota WLICZAĆ do sumy
   (koniec z pomijaniem cbBTC/WETH); nota o pomijaniu zostaje tylko
   dla pozycji, których NIE ma ani w portfolio-USD, ani w state bota.
4. Zero nowych requestów: oba źródła już są w useBotApi.

## PARTIA 16 — karty propozycji FLAT_NARROW / FLAT_WIDEN (produkt FlatWide; spec Fable 28.08)

Kontekst: observer dostał detektor flatu (FLAT_ENTER/FLAT_EXIT,
bot/config.ts `FLAT` + bot/observer.ts) — nowe rodzaje propozycji
`kind: 'FLAT_NARROW'` (zwężenie do k×σ w POTWIERDZONYM flacie) i
`kind: 'FLAT_WIDEN'` (powrót do szerokiego ±productIdleWidthPct po
końcu flatu). Obecnie UI renderuje nieznane kind jako szarą notę —
działa, ale bez akcji. Zakres: TYLKO src/** (typy + karty + modal
prefill). Stan flatu per pula jest w `state.pools[]`: `flatSince`
(ISO|null) i `flatConfirmed` (bool).

1. `src/hooks/useBotApi.ts`: rozszerzyć union `BotProposal.kind` o
   `'FLAT_NARROW' | 'FLAT_WIDEN'`; do typu puli (stan bota) dodać
   opcjonalne `flatSince?: string | null; flatConfirmed?: boolean`.
2. Karty propozycji w MorningCockpit: FLAT_NARROW = akcent „🎯 FLAT —
   zwężenie", FLAT_WIDEN = akcent ostrzegawczy „⚠️ koniec flatu —
   rozszerzenie" (klasa wizualna jak EXIT_TREND — to propozycja
   ochronna). Obie pokazują `suggestedRange` (uwaga: jednostka wg
   `isStableQuote` z Partii 13b — cbBTC/WETH NIE jest w USD),
   `costUsd`, `paybackDays` (tylko NARROW) i pełną `note`.
   Przycisk [Modyfikuj/Wykonaj] → istniejący modal rebalansu z
   prefillem zakresu z propozycji (jak REBALANCE; ostrzeżenie ±% z
   Partii 13b zadziała samo — NARROW celowo <30%, dopisać wyjątek:
   gdy kind==='FLAT_NARROW', ostrzeżenie „to NIE jest produktowe
   ±40/50%" ZAMIENIĆ na neutralne „zwężenie produktowe (flat)").
3. Badge stanu flatu na kartach pul produktowych (tam gdzie gap/EMA):
   `flatConfirmed` → „FLAT ✅"; `flatSince && !flatConfirmed` →
   „flat: zegar od <hh:mm> (potwierdzenie po 12h)"; inaczej nic.
4. Odrzucenie propozycji: istniejący przepływ Odrzuć działa bez zmian
   (dedup po stronie bota — odrzucona NARROW nie wróci w tym samym
   epizodzie flatu; WIDEN może wrócić następnego dnia, jeśli pozycja
   nadal wąska poza flatem — to celowe).
5. Zero nowych requestów; wszystko z /api/state.

## PARTIA 16b — oznaczenie OPCJI AWARYJNYCH na kartach EXIT_TREND/HEDGE (spec Fable 28.08, paczka #2)

Kontekst: na pulach PRODUKTOWYCH sygnał DOWN emituje teraz DWIE
propozycje naraz (HEDGE delta-neutral = opcja A, EXIT_TREND = opcja B),
obie z nowym polem `emergency: true` (bot/observer.ts). Dokument
procedury: EMERGENCY.md (root repo). Zakres: TYLKO src/**.

1. `useBotApi.ts`: `BotProposal.emergency?: boolean`.
2. Karty z `emergency===true`: czerwona ramka/akcent + nagłówek
   „🚨 OPCJA AWARYJNA A (hedge — preferowana)" / „🚨 OPCJA AWARYJNA B
   (exit — zwykle NIE podpisuj)" (rozróżnienie po kind). Pod nagłówkiem
   stała linia: „Hybryda świadomie trzyma betę — zobacz EMERGENCY.md
   zanim podpiszesz". Karty bez `emergency` — bez zmian.
3. Grupowanie: gdy obie opcje (A i B) dla tego samego tokenId są open,
   renderować OBOK SIEBIE w jednej sekcji „Procedura awaryjna" (nad
   zwykłymi propozycjami), A przed B.
4. Przycisk akcji: HEDGE z `hedgeSizeEth` → istniejący przepływ
   1-podpisowego shorta (Partia 9/11); HEDGE bez `hedgeSizeEth`
   (noga cbBTC — rynek BTC/USD) → bez przycisku wykonania, tylko nota
   (ręcznie na app.gmx.io). EXIT_TREND → jak dotychczas.
5. Zero nowych requestów.

## PARTIA 17 — panel zbiorczy REALNYCH pozycji + linia CYKLU FlatWide ✅ wykonana (Sonnet 28.08; prośba Rafała 28.08 wieczór, spec Fable)

Kontekst bot-side (już w paczce): `/api/state` ma teraz (1) root
`flatParams: { enterGap, exitGap, confirmH, ... }` (żywe parametry
detektora — NIE hardkodować 12h/2%/5% w UI, mogą się zmienić 1.09),
(2) `positions[].posture: 'wide' | 'narrow' | null` (cykl produktu;
null = pula nie-produktowa), (3) jak dotąd `pools[].flatSince/
flatConfirmed/trendGapPct`. Zakres: TYLKO src/**. Zero nowych requestów.

1. **Panel zbiorczy nad kartami realnych pozycji** — lustrzany do
   nagłówka "Paper trading": kafle **Equity łącznie** (Σ wartości
   pozycji, źródła jak Partia 15: p.valueUsd ?? wycena bota),
   **PnL od startu** kwotowo i procentowo (Σ[wartość − hodlUsd
   PIERWSZEJ próbki positions-history]; % względem Σ kotwic; dopisek
   "od <najstarsza data kotwicy>"), **vs HODL 50/50** (Σ[wartość −
   hodlUsd OSTATNIEJ próbki], kolor czerwony/zielony). Tooltip na
   PnL: "zawiera ruch rynku (beta) — czysta przewaga LP to kafel
   vs HODL". Dane: useBotApi (state + positions-history), te same
   źródła co pasek metryk kart (Partia 14/15).
2. **Linia CYKLU na karcie każdej pozycji produktowej** (posture !==
   null), pod nagłówkiem karty:
   - postura: `wide` → "Cykl: SZEROKI ±{productIdleWidthPct}% (idle)";
     `narrow` → "Cykl: WĄSKI k×σ (flat)". Szerokość z BOT_POOL_META
     (już zduplikowana w src/config/botPools.ts).
   - status detektora (z pools[] po poolId):
     a) `flatConfirmed` → "✅ flat potwierdzony — propozycja zwężenia
        w kokpicie" (jeśli postura wide);
     b) `flatSince && !flatConfirmed` → COUNTDOWN: "stabilizacja od
        <HH:MM> — do propozycji zwężenia ~<Xh Ym> (przy utrzymaniu
        |gap|<{enterGap%})"; pozostało = confirmH·3600e3 − (now −
        Date.parse(flatSince)); odświeżać co minutę (istniejący tick
        komponentu albo mały setInterval);
     c) inaczej → "czekam na stabilizację: |gap| {X.X}% (próg
        {enterGap%})" — gap z trendGapPct;
     d) dla postury `narrow` zamiast a-c: "powrót do szerokiego przy
        |gap|>{exitGap%} (teraz {X.X}%)".
   - fallback gdy state bez flatParams (stary bot): przyjmij
     2%/5%/12h, feature-detect.
3. **Badge POZA ZAKRESEM** na karcie realnej pozycji, gdy
   `inRange === false` (odpowiednik informacji o rebalansie z paper):
   wyraźny pomarańczowy badge "⚠️ POZA ZAKRESEM — cena poniżej/powyżej
   pasma" (kierunek z porównania price vs lo/hi ostatniej próbki).
   W produkcie FlatWide wypadnięcie z SZEROKIEGO zakresu to zdarzenie
   rzadkie i ważne (±50% przebite) — ma być widoczne od progu.
4. Etykieta kafla/paska "PnL od startu (od 27.08.2026)" na kartach:
   bez zmian logiki, ale ujednolicić z panelem (ta sama konwencja).

## PARTIA 18 — pasek BILANS TRANSZY + wypełniona kolumna Koszty ✅ wykonana (Sonnet 29.08; spec Fable, spot-check Fable OK: typy `tranche` 1:1 z bot-side, „—" zamiast $0 na nullach, panel Partii 17 nietknięty poza tooltipem, tsc czysty, build przechodzi)

Kontekst (decyzje Rafała 29.08): panel zbiorczy z Partii 17 mierzy jakość
STRATEGII — PnL od kotwic pozycji i vs HODL — i ma zostać dokładnie taki,
jaki jest (te liczby są porównywalne z backtestem). Brakuje DRUGIEJ miary:
ile z faktycznie wpłaconych 6 092 USDC dziś jest. Różnica bierze się stąd,
że panel sumuje wyłącznie pozycje LP, a poza nimi leży bufor w portfelu
(~$150 WETH) i jednorazowe koszty wejścia (4 swapy + poślizg + gaz).
Rafał wybrał: **osobna sekcja, obecne metryki bez zmian.**

Bot-side JEST już gotowe (paczka 29.08) — UI tylko wyświetla, nic nie liczy:
- `/api/state` root `tranche`: `{ label, depositedUsd, startedAt, lpUsd,
  walletUsd, totalUsd, diffUsd, diffPct, marketPnlUsd, residualUsd,
  gasUsd, updatedAt }`. Pola mogą być `null` (nieudany odczyt sald,
  brak kursu) — wtedy „—", nigdy $0.
- `positions[].costsUsd` przestało być `null`: to gaz transakcji tej
  pozycji z receiptów (mint/zwiększenie/zwężenie/collect). Pasek metryk
  Partii 14 ma już feature-detect, więc kolumna „Koszty" wypełni się sama
  — sprawdź tylko, czy nie została gdzieś zahardkodowana na `null`.

1. **Pasek „BILANS TRANSZY"** NAD panelem zbiorczym Partii 17 (osobna
   sekcja, wizualnie spokojniejsza — to miara miesięczna, nie dzienna):
   - kafle: „Wpłacone $6 092 (27.08)" · „Dziś łącznie $X" · „Różnica
     −$Y (−Z%)" (kolor jak w istniejących kaflach PnL).
   - linia rozbicia pod kaflami: „w pozycjach $A + w portfelu $B" oraz
     „z tego ruch rynku −$C · reszta (koszty wejścia + beta bufora) −$D".
   - tooltip przy „reszcie": „jednorazowe koszty wejścia — swapy,
     poślizg, gaz mintów — plus zmiana wartości bufora w portfelu.
     Powinna być mniej więcej stała; jeśli rośnie, zgłoś to Fable."
   - `walletUsd === null` → pokaż „portfel: —" i NIE licz „razem"
     samodzielnie (bot już to zrobił; totalUsd też będzie null).
2. **Rozróżnienie w opisach** (żeby nikt nie mylił dwóch miar): kafel
   „PnL od startu" w panelu Partii 17 dostaje dopisek/tooltip „liczone
   od kotwic pozycji, bez bufora i kosztów wejścia — pełny rachunek
   transzy jest w pasku wyżej".
3. Zero nowych requestów — wszystko z już wczytanego `/api/state`.

## PARTIA 19 — dwa rozjazdy widoczne na żywo po wdrożeniu 29.08 ✅ wykonana (Sonnet 29.08; spot-check Fable OK: etykiety+tooltipy bez zmiany liczb, `statFmtUsd` 2 miejsca dla |v|<10 i bez zmian dla dużych kwot, tsc czysty, build przechodzi)

Screenshot Rafała po restartach ujawnił dwie rzeczy. ŻADNA nie jest błędem
liczenia — obie to sposób prezentacji, który wprowadza w błąd.

1. **Dwie różne „sumy wszystkiego" obok siebie.** Górny kafel „Wartość
   łączna" pokazał $6 253.67, a pasek bilansu „Dziś łącznie" $5 925.83 —
   różnica $327.84. Powód (sprawdzony w kodzie, NIE do zgadywania):
   - `usePortfolio.totalUsd` = pozycje + portfel **ze WSZYSTKICH sieci**
     (ETH/WETH/USDC na mainnet + Base + Arbitrum), z pominięciem cbBTC
     (UI nie ma kursu BTC — komentarz w usePortfolio.ts ~465);
   - `state.tranche.totalUsd` = pozycje produktowe + portfel **tylko na
     Base**, za to Z cbBTC — bo transza 1 pracuje na Base.
   Te $327.84 to stary gaz/resztki na mainnecie i Arbitrum, spoza transzy.
   DO ZROBIENIA (bez zmiany liczb, tylko etykiety i tooltipy):
   - górny kafel: podpis „Wartość łączna (cały portfel, wszystkie sieci)"
     + tooltip „zawiera środki spoza transzy 1 — stary gaz i resztki na
     mainnet/Arbitrum; cbBTC pominięte (UI nie ma kursu BTC)";
   - kafel paska bilansu: „Dziś łącznie (transza 1, Base)" + tooltip
     „tylko środki transzy 1 na Base — pozycje produktowe i portfel".
   Bez tego dwie poprawne liczby obok siebie wyglądają jak błąd.

2. **Zaokrąglenie do pełnych dolarów zjada nowe kolumny.** `statFmtUsd`
   (PositionCharts.tsx:320) ma `maximumFractionDigits: 0`, więc na skali
   Base: fee narosłe $0.41 → „$0", koszty gazu (centy) → „$0", fee $2.66
   → „$3". Kolumny „Fee narosłe" i „Koszty" stają się bezużyteczne
   dokładnie tam, gdzie miały coś mówić.
   DO ZROBIENIA: w `statFmtUsd` dwa miejsca po przecinku dla |v| < 10
   (np. „$0.41", „$2.66"), pełne dolary powyżej — PnL i vs HODL zostają
   wtedy czytelne jak dziś, a drobne kwoty przestają znikać.
   Uwaga: ta sama funkcja obsługuje paper trading (tam kwoty są duże,
   więc zachowanie się nie zmieni).
