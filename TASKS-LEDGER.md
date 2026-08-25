# TASKS-LEDGER.md — księga transakcji + zamknięte pozycje + CSV (spec, 25.08)

> Realizacja decyzji z 10.08 (§2 CONTEXT): "SQLite + CSV od pierwszej
> transakcji — podatki PL + audytowalność". Trigger: Rafał zamknął #953427
> przez apkę i pozycja ZNIKŁA bez śladu — zero historii, zero podsumowania
> (ile wyszło, ile fees, wynik). Pierwsze realne transakcje już są (hedge
> $15 z 20.08, collecty fees, zamknięcie #953427) — księga ma być GOTOWA
> zanim wejdzie kapitał transzy 1.

## 1. Źródło prawdy: łańcuch, nie UI

Zdarzenia NonfungiblePositionManager dla tokenIdów WATCH_ADDRESS:
`IncreaseLiquidity` / `DecreaseLiquidity` / `Collect` (+ `Transfer` na
NFT dla mint/burn). NIE polegamy na tym, że UI "wie", co wysłał — księga
ma się zgadzać z Etherscanem co do sztuki, także dla transakcji zrobionych
poza naszą apką (Rabby/Uniswap UI — dziś takie były: collecty fees).
Fetch: observer co cykl dociąga logi od ostatniego widzianego bloku
(3 sieci, wąskie okno = tanie); backfill historyczny jednorazowo od
bloku pierwszej pozycji (HyperSync albo RPC — wolumen śladowy).

## 2. Warstwa danych (bot — lane Fable)

- `.bot/tx-ledger.ndjson` (append-only): {ts, chain, txHash, tokenId,
  kind: MINT|INCREASE|DECREASE|COLLECT|BURN, amount0/1 (raw string +
  human), usdAtTs (wycena z ceny puli w chwili zdarzenia), gasUsd
  (z paragonu tx × cena ETH)}. Zapis idempotentny (klucz txHash+logIndex).
- `.bot/closed-positions.json`: gdy liquidity spada do 0 → podsumowanie
  {tokenId, pula, openedAt/closedAt, wpłacone (z MINT/INCREASE),
  wypłacone (DECREASE+COLLECT rozdzielone principal/fees), fees łącznie,
  koszty gazu, realized PnL USD, vs HODL (kotwica z positions-hodl.json,
  z zastrzeżeniem "od daty kotwicy")}.
- SQLite (decyzja 10.08) — DB-SCHEMA.md ma szkic; na start wystarczy
  ndjson+json (ta sama architektura co paper/candidates: seed w kodzie,
  runtime w .bot/), import do SQLite gdy dojdzie warstwa podatkowa PLN.

## 3. API + UI (lane Sonnet, po warstwie danych)

- `GET /api/ledger?days=N` i `GET /api/closed-positions` (server czyta .bot/).
- Sekcja "Zamknięte pozycje" w kokpicie: karta per pozycja (wynik, fees,
  gaz, okres życia, link do tx) — dokładnie to, o co Rafał zapytał 25.08.
- `GET /api/ledger.csv` — eksport: 1 wiersz = 1 zdarzenie on-chain,
  kolumny pod rozliczenie (data UTC+lokalna, sieć, tx, rodzaj, tokeny,
  kwoty, USD). Kolumna PLN (kurs NBP D-1) = OSOBNA iteracja — wymaga
  tabeli kursów; nie blokować nią pierwszej wersji.

## 4. Backfill (jednorazowo, po wdrożeniu)

Odtworzyć z łańcucha: #953427 (mint→zamknięcie 25.08), #953465 (żywa),
pyłkowe collecty z Rabby 25.08, hedge GMX $15 open/close 20.08 (osobny
kontrakt — GMX poza NFT managerem; w pierwszej wersji ręczny wpis z
hashy z CONTEXT, automatyczny indeks GMX dopiero przy realnym hedge).

## 5. Poza zakresem pierwszej wersji

Wycena PLN/NBP, klasyfikacja podatkowa zdarzeń (interpretacje), auto-import
do SQLite, pozycje historyczne sprzed WATCH_ADDRESS. Kolejność wdrożenia:
warstwa danych (Fable) → endpointy (Fable) → UI+CSV (Sonnet, jedna partia).
