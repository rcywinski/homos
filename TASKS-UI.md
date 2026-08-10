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
- [ ] Spójność procentów fees (suma 100%) — dokończ, jeśli nie zrobione
- [ ] Responsywność <480px (advisor-box, range-options, token-inputs)
- [ ] Drobne: tytuł zakładki, favicon, ukrycie Faucet poza sepolią

## PARTIA 2 — PORANNY KOKPIT + POŁĄCZENIE Z BOTEM (priorytet)

### #0 Poranny kokpit (nowy ekran startowy, nad "Uniswap V3 Pools")
Układ wg UI-VISION.md §3.1, dane w kolejności dostępności:
1. **Nagłówek finansowy**: wartość łączna (pozycje + salda z WalletInfo), liczba
   pozycji in-range/out, fees do zebrania (dane są w MyPositions — wyciągnij
   współdzielony hook np. `usePortfolio()` do src/hooks/, nie duplikuj logiki).
2. **Kolekcja "Propozycje bota"** — patrz #1 niżej (jeśli bot offline: szary
   box "Bot offline — uruchom usługę homos-bot na serwerze").
3. **Skrót rekomendacji doradcy** per pozycja (✅/🔄/⏳ — logika już jest
   w MyPositions/adviseFor; przenieś do wspólnego hooka).
Sekcja ma być pierwszą rzeczą widoczną po wejściu; zwijana; zwarty layout
(radzimy sobie bez frameworków — czysty CSS, klasy morning-*).

### #1 Panel "Propozycje bota" (łączy UI z serwerem Windows)
- Konfiguracja API: `localStorage.homos_api_base` (default `http://localhost:8787`)
  + `localStorage.homos_api_token` (Bearer). Mały panel ustawień (ikonka ⚙ przy
  nagłówku kokpitu) do wpisania obu wartości — bez tego użytkownik z Maca nie
  połączy się z serwerem Windows (adres typu http://192.168.x.x:8787).
- `GET {base}/api/state` co 60s (nagłówek `Authorization: Bearer {token}` jeśli
  token ustawiony). Odpowiedź: `{ updatedAt, mode, pools: [{id, ethUsd, tick,
  stats, suggestion, updatedAt}], positions: [{tokenId, poolId, valueUsd,
  inRange, advice, paybackDays, ...}], proposals: [{id, createdAt, tokenId,
  action, suggestedRange:{usdLo,usdHi}, costUsd, paybackDays, status}] }`.
- Render propozycji jako karty: "🔄 REBALANS #953465 → $X–$Y · koszt $Z ·
  payback ~N dni" + przycisk "Odrzuć" → `POST {base}/api/proposals/{id}/dismiss`.
- Świeżość: jeśli updatedAt starsze niż 5 min → badge "dane nieaktualne".
- Stan błędu = "Bot offline" (nie sypać konsolą).

### #2 PWA (przygotowanie pod iPhone przez VPN)
- public/manifest.json (name HOMO$, ikony 192/512 — wygeneruj proste SVG→PNG,
  theme-color), <link rel="manifest"> i meta w index.html. Bez service workera.

### #3 Wskaźnik zdrowia systemu (mała rzecz, duża wartość)
- W nagłówku aplikacji kropka statusu bota: zielona (state świeży) / żółta
  (>5 min) / szara (offline) — dane z tego samego fetchu co #1.

## Konwencje
- Nowe hooki: src/hooks/. Style: src/styles.css sekcja /* --- UI session --- */.
- Bez nowych bibliotek. Typecheck 0 błędów. Wpis do CONTEXT.md + odhacz tutaj.
