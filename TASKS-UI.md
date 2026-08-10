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

## PARTIA 3 — Telemetria + akcje na kokpicie
> ROZSZERZONA o decyzje UX z **UX-COCKPIT.md** (przeczytaj!) — kokpit staje się
> centrum zarządzania; stare sekcje degradujemy (zwijamy), NIE kasujemy.

- [ ] **Akcje na kartach pozycji w kokpicie** (UX-COCKPIT §1.A.3): [💰 Zbierz fees]
  (aktywny gdy fees > 50× gaz, inaczej szary z tooltipem), [⏹ Zamknij] (modal:
  suwak 25/50/100%, podgląd kwot z min-po-slippage, potwierdzenie → Rabby;
  reużyj logiki Remove z MyPositions), [🔄 Rebalans ręczny] (prefill AddLiquidity
  zakresem doradcy).
- [ ] **Sekcje "Zarządzaj"**: obecne Uniswap V3 Pools + Add/Remove + Transaction
  History zgrupować pod jednym zwijalnym nagłówkiem "Zarządzaj (zaawansowane)",
  domyślnie zwiniętym — kokpit jest górą.
- [ ] Poprawka z 401: zamiast linku "surowy JSON" (nagłówek auth ≠ link) —
  przycisk otwierający modal z sformatowanym JSON-em pobranym przez useBotApi.

- [ ] **Sekcja "Telemetria bota"** w kokpicie (zwijana, domyślnie zwinięta):
  tabela z `state.pools` (dane już przychodzą w useBotApi, nic nowego nie
  fetchować): pula | cena ETH/USD | tick | zmienność %/d (stats.volDaily·100) |
  fee-yield %/d | sugerowany zakres $ (suggestion → ceny przez odwrócenie
  orientacji jak w kokpicie) | wiek danych (updatedAt). Poniżej: lista pozycji
  z `state.positions` (advice + paybackDays). Stopka: "OBSERWUJ — bot niczego
  nie wykonuje" + link "surowy JSON" otwierający {base}/api/state w nowej karcie.
- [ ] Auto-odświeżanie razem z istniejącym pollingiem (bez drugiego timera).

