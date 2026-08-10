# Analiza par i pul — dywersyfikacja portfela LP

> Data: 2026-08-10 · Dane: app.uniswap.org/explore (snapshot na żywo, blok ~0x188820d)
> Status: wejście do Fazy 1 — kandydaci do backtestingu, NIE decyzje inwestycyjne.
> Uwaga metodologiczna: "Pool APR" z Uniswap = fees/TVL całej puli w ujęciu rocznym na
> bazie 1D — to średnia dla pasywnego full-range. Skoncentrowana pozycja może mieć
> kilkukrotność tego APR, ale snapshot 1-dniowy bywa mylący. Trwałość tych APR
> zweryfikuje dopiero backtest na danych 30-90 dni.

## 1. Kluczowe odkrycie: Twoja obecna pula to słaby wybór

Obie Twoje pozycje siedzą w **mainnet ETH/USDC v3 0.3%** — puli, która nie mieści się
już nawet w top 20 TVL na Ethereum. Płynność i wolumen odpłynęły do tieru 0.05% i v4.
Porównanie (ta sama para, ten sam moment):

| Pula | TVL | Pool APR | 1D vol/TVL |
|---|---|---|---|
| **ETH/USDC v3 0.3% mainnet (Twoja)** | poza top20 | ~2-3% | niski |
| ETH/USDC v3 0.05% mainnet | $98.0M | **8.53%** | 0.62 |
| ETH/USDC v3 0.3% **Base** | $120.8M | **14.92%** | 0.16 |
| ETH/USDC v3 0.05% Base | $10.6M | 4.32% | 0.32 |
| ETH/USDC v4 0.3% mainnet | $28.6M | 2.70% | 0.02 |

Wniosek nr 1: sama zmiana puli (bez żadnego algorytmu!) może zwielokrotnić fee APR.

## 2. Snapshot rynku — najlepsi kandydaci wg kategorii

### A. ETH/stable (rdzeń strategii)
| Pula | TVL | APR | vol/TVL | Komentarz |
|---|---|---|---|---|
| ETH/USDC v3 0.3% **Base** | $120.8M | **14.92%** | 0.16 | Najmocniejsza pula ETH/stable w ekosystemie; tani gas |
| ETH/USDT v3 0.3% mainnet | $81.1M | **10.50%** | 0.12 | Dywersyfikacja stablecoina (USDT zamiast USDC) |
| ETH/USDC v3 0.05% mainnet | $98.0M | 8.53% | 0.62 | Największy wolumen absolutny ($61M/dzień) |
| ETH/USDC v4 0.05% Arbitrum | $4.0M | 5.45% | 0.30 | v3 na Arbitrum wysechł (0.65%!), wolumen przeszedł na v4 |

### B. Pary skorelowane BTC/ETH (mniejszy IL — korelacja ~0.7–0.9)
| Pula | TVL | APR | vol/TVL | Komentarz |
|---|---|---|---|---|
| **cbBTC/ETH v3 0.05% Base** | $5.5M | **13.06%** | **0.95** | Najlepszy stosunek wolumenu do TVL w całym zestawieniu |
| cbBTC/ETH v4 0.05% Base | $2.5M | 5.51% | 0.30 | |
| WBTC/ETH v3 0.05% mainnet | $43.6M | 2.39% | 0.17 | Głęboka, ale rozwodniona |
| WBTC/ETH v3 0.05% Arbitrum | $33.8M | 1.74% | 0.13 | |

Dlaczego to ważne: gdy BTC i ETH ruszają się razem, cena względna BTC/ETH stoi w
miejscu → pozycja zostaje w zakresie i zbiera fee bez realizowania IL. To strukturalnie
inne ryzyko niż ETH/stable — prawdziwa dywersyfikacja, nie kopia tej samej ekspozycji.

### C. Stable/stable (balast niskiego ryzyka)
| Pula | TVL | APR | vol/TVL | Komentarz |
|---|---|---|---|---|
| USDC/USDT v4 0.0008% Arbitrum | $1.9M | 0.87% | **2.99** | Ogromny obrót względem TVL, mikro-fee |
| USDC/USDT v3 0.01% mainnet | $33.1M | 0.47% | 0.17 | Nudne i bezpieczne |

IL bliski zeru (zakres ±0.01–0.05%), ale APR niski. Sensowne jako "parking" części
kapitału, nie jako silnik zysku. Uwaga na ryzyko depegu — to jedyne realne ryzyko tutaj.

### D. Alt/ETH — wysokie APR, wysokie ryzyko (na razie NIE)
LINK/ETH 0.3% mainnet (4.49%), ARB/ETH 0.05% Arbitrum (8.47%), VIRTUAL/TIBBIR Base
(11.18%). Wyższa zmienność, płytsze książki, toksyczny flow, ryzyko -80% na tokenie.
Do rozważenia dopiero, gdy bot będzie dojrzały i tylko małym % portfela.

## 3. Szkic portfela do walidacji w backteście (kapitał $5–25k)

| Sleeve | Pula (kandydat główny) | Waga | Rola |
|---|---|---|---|
| Rdzeń ETH | ETH/USDC v3 0.3% Base | ~40% | Główny generator fee, tani gas do rebalansów |
| Skorelowana | cbBTC/ETH v3 0.05% Base | ~25% | Fee przy niskim IL, dywersyfikacja reżimu |
| Rdzeń #2 | ETH/USDT v3 0.3% mainnet LUB ETH/USDC 0.05% mainnet | ~20% | Dywersyfikacja sieci + stablecoina |
| Balast | USDC/USDT (mainnet 0.01% / arb v4) lub rezerwa gotówkowa | ~15% | Niska wariancja, kapitał na rebalanse |

Uczciwa uwaga o dywersyfikacji: dwie pule ETH/USDC na różnych sieciach to NIE jest
dywersyfikacja ryzyka cenowego (ta sama ekspozycja na ETH) — dywersyfikują tylko
strumienie fee i ryzyko sieci/venue. Prawdziwą dywersyfikację ryzyka dają: pary
skorelowane (B), stable (C) i docelowo hedge (Faza 4).

## 4. Co to zmienia w aplikacji i planie

1. **Konfiguracja pul jako dane, nie kod** — lista par/tierów/sieci w jednym pliku
   konfiguracyjnym; PoolBrowser renderuje z konfiguracji (dziś: 2 pary × 4 tiery
   zahardkodowane, tylko mainnet/sepolia).
2. **Wsparcie Base** w wagmi + adresy tokenów (cbBTC, USDC natywne) i kontraktów
   Uniswap per sieć. Arbitrum opcjonalnie (v3 tam wysechł — niski priorytet).
3. **v4 na później** — osobna architektura (singleton, brak osobnych pul jako
   kontraktów); MVP zostaje na v3. Odnotować w planie jako Fazę 5.
4. **Pool Scanner** (część pakietu data z Fazy 1): dzienny ranking fee/TVL-in-range
   dla obserwowanych pul — czyli dokładnie ta tabela wyżej, ale liczona z danych
   on-chain, automatycznie i z historią zamiast snapshotu 1D.
5. **Backtest wielopulowy**: symulacje niezależnie per pula + allocator portfelowy
   (wagi, korelacje, koszty gazu per sieć w modelu).

## 5. Lista pul do pobrania danych w Fazie 1 (finalna)

- mainnet: ETH/USDC 0.05%, ETH/USDC 0.3% (baseline — Twoja obecna), ETH/USDT 0.3%,
  WBTC/ETH 0.05%, USDC/USDT 0.01%
- Base: ETH/USDC 0.3%, ETH/USDC 0.05%, cbBTC/ETH 0.05%, cbBTC/USDC 0.05%
- Arbitrum (porównawczo): ETH/USDC v3 0.05%
