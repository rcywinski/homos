# TASKS-UI.md — zadania dla sesji UI (Sonnet)

> Instrukcja startowa dla sesji: przeczytaj najpierw `CONTEXT.md` (stan projektu
> i konwencje — NIE zwiedzaj repo od zera), potem wykonuj zadania z tej listy.
> Po każdym zadaniu: odhacz je tutaj i dopisz linijkę do dziennika w CONTEXT.md.
> ZAKRES TWARDY: wyłącznie warstwa wizualna/UX. NIE dotykaj: `src/utils/v3math.ts`,
> `src/utils/liquidityManagement.ts`, `src/utils/advisor.ts`, `backtest/**`,
> `scripts/**` — logika liczbowa i transakcyjna jest poza zakresem tej sesji.
> Aplikacja działa na localhost:3000 (webpack hot-reload po zapisie plików).

> AKTUALIZACJA: powstał `UI-VISION.md` (docelowy kształt: autopilot + poranny
> kokpit). Zadanie #0 poniżej realizuje krok A z tej wizji i jest NAJWAŻNIEJSZE.

## Zadania (kolejność = priorytet)

- [ ] **#0 PORANNY BRIEF (nowy ekran startowy)** — sekcja nad "Uniswap V3 Pools":
  wartość portfela łącznie (pozycje + salda), PnL i fees (na razie od załadowania
  strony / z danych pozycji), liczba pozycji in-range/out-of-range, skrót
  rekomendacji doradcy per pozycja (dane już są w MyPositions/advisor.ts —
  wyciągnij współdzielony hook, nie duplikuj logiki). Układ wg UI-VISION.md §3.1
  (bez kolejki decyzji — ta wymaga bota; zostaw placeholder "Brak propozycji").

- [x] **Wizualny pasek zakresu na karcie pozycji** (MyPositions): pozioma belka
  min–max z markerem aktualnej ceny; zielony gdy cena w zakresie, czerwony poza.
  Dane już są w komponencie (tickLower/tickUpper/pool.tickCurrent + ceny USD).
- [ ] **Spójność procentów przy fees** (MyPositions): procenty USDC/WETH przy
  "Uncollected fees" mają sumować się do 100% — licz oba z tej samej ceny
  (`ethPrice` state), zaokrąglaj na końcu.
- [x] **Czytelniejsza "Liquidity" w Pool Info** (UniswapPool.tsx): zamiast surowego
  `formatEther(liquidity) + ' ETH'` (mylące — L nie jest w ETH) pokaż po prostu
  wartość skróconą naukowo (np. "5.87e14") z etykietą "Active liquidity (L)".
- [x] **Stany ładowania**: spinner/skeleton dla PoolBrowser (ładowanie pul trwa
  kilka sekund) i dla panelu doradcy w AddLiquidity.
- [ ] **Responsywność nowych sekcji**: advisor-box, range-options (5 opcji),
  token-inputs — sprawdź <480px, zawijanie zamiast ścisku.
- [x] **Transaction History**: jeśli komponent pokazuje mock/nic — ukryj sekcję
  albo podłącz realne eventy z ostatnich transakcji użytkownika (opcjonalne).
- [ ] **Drobne**: tytuł zakładki "HOMO$ — Liquidity Manager", favicon, usunięcie
  sekcji Faucet (sepolia-owa pozostałość) z widoku gdy chainId != sepolia.

## Partia 2 (po weryfikacji partii 1)

- [ ] **#0 PORANNY BRIEF** — wciąż najważniejsze (nie znaleziono komponentu — jeśli
  zrobione inaczej, odhacz i wskaż plik).
- [ ] **PWA**: manifest.json + meta theme-color + ikony (przygotowanie pod iPhone
  wg INFRA.md §5). Bez service workera na razie (dev server).
- [ ] **Panel "Propozycje bota"** (placeholder): sekcja czytająca
  `http://localhost:8787/api/state` (nowy bot-obserwator, patrz CONTEXT sesja 3e)
  — jeśli endpoint nie odpowiada, pokaż "Bot offline". Lista propozycji z
  .proposals + przycisk "Odrzuć" (POST /api/proposals/:id/dismiss).
- [ ] PRZYPOMNIENIE KONWENCJI: odhaczaj zadania TUTAJ i dopisuj się do dziennika
  w CONTEXT.md — inaczej sesje nie wiedzą, co zrobiłeś.

## Konwencje

- Style: dopisuj do `src/styles.css` (jedyny importowany plik stylów) — sekcja
  z komentarzem `/* --- UI session --- */`.
- Nie dodawaj bibliotek UI; czysty CSS + istniejące klasy.
- Typecheck przed końcem: `npx tsc --noEmit -p tsconfig.json` (0 błędów w src/).
- Commit wpisu do CONTEXT.md: sekcja "Dziennik sesji" → "Sesja UI (Sonnet)".
