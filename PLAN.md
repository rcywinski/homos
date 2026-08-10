# HOMOS v2 — Plan projektu: Automated Liquidity Manager (ALM)

> Data utworzenia: 2026-08-10
> Status: PLAN — zatwierdzony kierunek, przed rozpoczęciem implementacji
> Parametry ustalone z właścicielem: kapitał $5k–$25k · sieć: do wyboru po backtestingu · hedging: etapami · wykonanie: pół-auto → full-auto

---

## 1. Cel projektu

Aplikacja do automatycznego zarządzania płynnością w parach typu WETH/USDC na Uniswap (v3/v4), używana prywatnie, generująca zysk z opłat LP poprzez:

1. Algorytmiczne ustawianie zakresów cenowych (szerokość zależna od zmienności),
2. Rebalansowanie tylko wtedy, gdy jest to matematycznie opłacalne,
3. Automatyczne zbieranie i reinwestowanie nagród (compounding),
4. (Faza późniejsza) hedging delta-neutral ograniczający ekspozycję na spadki ETH.

**Zasada nadrzędna: najpierw backtesting, potem kod produkcyjny.** Strategia, która nie bije benchmarku HODL 50/50 na danych historycznych, nie trafia na mainnet.

---

## 2. Sekcja krytyczna: dlaczego stara aplikacja liczyła źle

Analiza kodu w `src/utils/` wykazała, że rozjazd wartości z interfejsem Uniswap **nie był kwestią "pluginów BigInt"**, tylko systematycznego liczenia matematyki Uniswap v3 na liczbach zmiennoprzecinkowych (float) zamiast na liczbach całkowitych. Konkretne błędy:

### 2.1. Przepełnienie przy konwersji sqrtPriceX96 (README, UniswapPool)

```ts
const sqrtPriceX96 = JSBI.toNumber(pool.sqrtRatioX96); // BŁĄD
```

`sqrtPriceX96` to liczba do 160 bitów. JavaScript `Number` bezpiecznie przechowuje tylko 53 bity (`Number.MAX_SAFE_INTEGER ≈ 9×10^15`). Dla pary WETH/USDC sqrtPriceX96 ma rząd `10^27`–`10^33` — konwersja `toNumber` traci precyzję lub przekłamuje wartość całkowicie. Do tego wzór w README **w ogóle nie uwzględnia korekty na decimals** (USDC ma 6, WETH ma 18 — różnica 10^12!), więc wynik był bez sensu niezależnie od precyzji.

### 2.2. Ręcznie napisany "PositionLike" zamiast SDK (`liquidityManagement.ts:createPosition`)

Największy problem. Kod tworzy własny obiekt pozycji i liczy liquidity wzorem:

```ts
const liquidityValue = Number(parsedAmount1) / (sqrtUpperPrice - sqrtLowerPrice); // BŁĄD x4
```

Cztery błędy w jednej linii:
- `Number(parsedAmount1)` — konwersja wei (18 decimals) na float traci precyzję powyżej 2^53,
- wzór jest **niekompletny**: poprawna formuła v3 zależy od tego, gdzie jest aktualna cena względem zakresu — gdy cena jest w zakresie, `L = min(L₀, L₁)` gdzie `L₀ = amount0·(√P·√Pᵤ)/(√Pᵤ−√P)` i `L₁ = amount1/(√P−√Pₗ)`. Kod ignoruje aktualną cenę całkowicie,
- miesza **surowe jednostki** (wei, 6-decimal USDC) z **cenami ludzkimi** po korekcie decimals — jednostki się nie zgadzają,
- `CurrencyAmount.fromRawAmount(pool.token0, Number(parsedAmount0))` — znowu float.

Efekt: `mintAmounts` niezgodne z tym, co policzyłby kontrakt → transakcje się wywalały → i stąd…

### 2.3. "Łatka" 20–25% slippage (dowód, że kwoty były złe)

`prepareAddLiquidityTransaction` zawiera specjalną ścieżkę dla USDC/WETH z **minimalnym slippage 20%** ("USDC/WETH pair requires much higher slippage"). To klasyczny symptom: kwoty mint były policzone źle, więc jedynym sposobem, by kontrakt przyjął transakcję, było praktycznie wyłączenie ochrony przed poślizgiem. Prawdziwa para USDC/WETH ma najgłębszą płynność na świecie — poprawnie policzona transakcja przechodzi ze slippage 0.1–0.5%.

### 2.4. `calculateOptimalAmounts` — zły wzór proporcji

`amount1 = amount0 · (√Pᵤ − √Pₗ)` — brakuje aktualnej ceny √P we wzorze (poprawnie: proporcja zależy od `(√P−√Pₗ)` i `(1/√P − 1/√Pᵤ)`), do tego mnożone są surowe jednostki o różnych decimals i "przycinane" arbitralnym capem 2x. Dlatego auto-uzupełnianie drugiego tokena pokazywało inne wartości niż Uniswap.

### 2.5. Hardkodowana cena i brak testów

- `calculatePoolPrice` dla Sepolii zwraca na sztywno `1900`,
- `package.json`: `"test": "echo \"Error: no test specified\""` — zero testów przy kodzie finansowym.

### 2.6. Wnioski do v2

1. **Cała matematyka wyłącznie na `bigint`** (natywny w ES2020; JSBI niepotrzebny). Float dozwolony tylko w warstwie wyświetlania.
2. **Nie reimplementować formuł v3.** Używać `@uniswap/v3-sdk`: `Position.fromAmounts()`, `Position.fromAmount0()`, `pool.token0Price` — SDK liczy identycznie jak kontrakt i jak interfejs Uniswap. Własne wzory tylko w symulatorze backtestingu — i tam testowane 1:1 względem SDK.
3. **Testy jednostkowe z wartościami referencyjnymi**: dla znanych on-chain pozycji (tokenId → amounts) wynik naszego kodu musi być równy co do 1 wei temu, co pokazuje Uniswap. To jest definicja "działa".
4. Warstwa UI/UX starej aplikacji koncepcyjnie do zachowania (zakresy, gas estimate, pozycje), ale kod komponentów jest spleciony z błędną matematyką — taniej napisać na nowo na czystym core.

---

## 3. Czego zabrakło w sugestiach od poprzedniego AI

Sugestie (delta-neutral, koszt rebalansu > IL+gas, L2, backtesting) są poprawne, ale niekompletne. Braki uporządkowane od najważniejszych:

### 3.1. LVR — właściwe nazwanie wroga

Główny przeciwnik LP to nie "IL" ogólnie, tylko **LVR (Loss-Versus-Rebalancing)**: strata do arbitrażystów, którzy handlują z Twoją pozycją po nieaktualnej cenie przy każdym ruchu rynku. Badania pokazują, że większość LP w parach ETH/stablecoin **przegrywa z prostym HODL**, bo opłaty nie pokrywają LVR. Praktyczny wniosek: opłacalność zależy od **jakości flow w konkretnej puli** (stosunek wolumenu "organicznego" do arbitrażowego), a nie tylko od APR wyświetlanego w interfejsie. Selekcja puli = pierwsza decyzja algorytmiczna, przed jakimkolwiek zakresem.

### 3.2. Wybór fee tier i puli to osobny problem optymalizacyjny

WETH/USDC istnieje w tierach 0.05% i 0.3% (i na v4 w wariantach z hookami). Metryka do porównania: **fees generowane dziennie / TVL w aktywnym zakresie** (nie całkowite TVL). Tier 0.05% ma zwykle wielokrotnie większy wolumen — często wygrywa mimo niższej stawki. To musi policzyć backtest, nie intuicja.

### 3.3. Uniswap v4 i konkurencyjne DEX-y

Sugestie mówiły tylko o v3. W 2026 działa **Uniswap v4** (architektura singleton — tańszy gas przy rebalansach, hooki, natywny ETH bez wrappowania). Do rozważenia też Aerodrome (Base) czy PancakeSwap v3. Decyzja v3 vs v4 wejdzie do backtestu; API SDK są podobne. *(Stan płynności w poszczególnych pulach do zweryfikowania na żywych danych w Fazie 1.)*

### 3.4. Funding rate to nie tylko koszt — bywa przychodem

W strategii delta-neutral short na perpach **otrzymuje** funding, gdy rynek jest byczy (funding dodatni — a historycznie jest dodatni przez większość czasu). Dobrze zaprojektowany hedge bywa drugim źródłem przychodu, nie kosztem. Ale AI pominęło ryzyka hedge: **likwidacja pozycji short** przy pumpie (zarządzanie marginem!), basis risk, ryzyko venue. Przy kapitale $5k–25k sensowny wybór venue: Hyperliquid / GMX / CEX — do porównania pod kątem funding, opłat i minimalnych rozmiarów *(weryfikacja w Fazie 4)*.

### 3.5. MEV i egzekucja

Rebalans = swap → bot będzie regularnie sandwichowany, jeśli będzie wysyłał transakcje przez publiczny mempool. Wymagane: prywatny RPC / protected transactions, limity slippage liczone z aktualnej głębokości puli, deadline'y. Na L2 problem mniejszy niż na mainnecie, ale niezerowy.

### 3.6. Polityka rebalansu jest bogatsza niż "wyszło poza zakres → przestaw"

Braki w zaproponowanym warunku opłacalności:
- **Histereza / strefy buforowe**: rebalans dopiero gdy cena przekroczy zakres o X% lub utrzyma się poza nim przez T minut (ochrona przed whipsaw),
- **Filtr reżimu rynku**: w silnym trendzie lepiej *poczekać* poza zakresem (pozycja w 100% w jednym tokenie nie płaci fee, ale też nie realizuje dalszego IL przy powrocie), w trendzie bocznym rebalansować szybciej,
- **Asymetria zakresów**: zakres nie musi być symetryczny wokół ceny — może być przesunięty zgodnie z przewidywanym dryfem,
- **Szerokość ∝ zmienność**: szerokość zakresu skalowana realizowaną zmiennością (np. EWMA/ATR), nie sztywne ±5%,
- **Częstotliwość compoundingu**: zbieranie fee też kosztuje gas — optymalny interwał zależy od wielkości pozycji (dla $10k na L2 prawdopodobnie co kilka dni, do policzenia).

### 3.7. Jakość backtestingu decyduje o wszystkim

Największa pułapka: **backtest na świecach (OHLC) systematycznie zawyża zyski LP**, bo nie widzi ścieżki ceny wewnątrz świecy ani rzeczywistej dystrybucji wolumenu po tickach. Wymagania:
- symulacja na danych **swap po swapie** (eventy `Swap` z puli — dostępne przez subgraph/RPC/publiczne datasety) przynajmniej dla finalnej walidacji; świece dopuszczalne do wstępnej selekcji strategii,
- modelowanie własnego wpływu: nasze fee = udział naszej liquidity w aktywnym ticku (przy $5–25k w głębokiej puli pomijalne, ale trzeba to wiedzieć, nie zakładać),
- koszty w symulacji: gas (realne ceny L2), swap fee przy rebalansie, slippage, (w F4) funding,
- **walk-forward, nie curve-fitting**: parametry strojone na okresie A, walidowane na B; test na różnych reżimach (hossa 2024, spadki, boczniak),
- benchmarki obowiązkowe: HODL 50/50, HODL 100% ETH, pasywny full-range, pasywny szeroki ±50%, oraz publiczne wyniki ALM-ów (Arrakis/Gamma/Charm) jako "czy w ogóle warto było to budować".

### 3.8. Ryzyka operacyjne pominięte całkowicie

- awaria RPC / bot ślepy → redundancja providerów + watchdog + alerty (Telegram/push),
- **kill-switch**: globalny stop + tryb "wyjdź do stablecoina",
- ryzyko depegu USDC (marzec 2023!) — monitoring ceny stablecoina jako warunek stop,
- bezpieczeństwo kluczy: dedykowany hot wallet z kapitałem operacyjnym, minimalne approvals (permit2 / approvals na dokładne kwoty), reszta kapitału na osobnym walletcie,
- podatki PL: każda transakcja swap/rebalans to zdarzenie podatkowe — bot musi logować wszystko do CSV (kurs, data, fee) od pierwszego dnia.

### 3.9. Realistyczne oczekiwania

Przy $5k–25k w WETH/USDC na L2, dobrze zarządzana skoncentrowana pozycja to realnie **kilkanaście–30% APR brutto z fee** w dobrych warunkach; netto po LVR/kosztach wyraźnie mniej. Delta-neutral z dodatnim fundingiem może to poprawić. Liczby zweryfikuje backtest — ale nie planujemy pod "100% APR", bo to prowadzi do przesadnej koncentracji i przegranej z whipsaw.

---

## 4. Skąd bierze się zysk — funkcja celu

```
Zysk netto = Fee LP
           + Funding z hedge (może być ±)
           − LVR / zrealizowany IL
           − Gas (rebalans, collect, compound)
           − Slippage swapów rebalansujących
           − Koszty venue hedge
```

Dźwignie maksymalizacji, w kolejności wpływu:
1. **Selekcja puli/tieru** (fee-per-TVL-in-range, jakość flow) — największa dźwignia, zero kosztu,
2. **Koncentracja** (wąski zakres = mnożnik fee, ale mnożnik IL i częstsze rebalanse) — optimum wyznacza backtest per reżim zmienności,
3. **Polityka rebalansu** (histereza + warunek opłacalności + filtr trendu) — chroni przed oddaniem fee z powrotem,
4. **Compounding** w optymalnym interwale,
5. **Hedge** — zmniejsza wariancję wyniku (i drawdowny), z szansą na dodatni funding.

---

## 5. Architektura docelowa

Monorepo (pnpm workspaces), TypeScript wszędzie — jeden język, współdzielone typy i **jeden moduł matematyczny** używany przez backtest, bota i UI (koniec z rozjazdami między warstwami):

```
homos/
├── CONTEXT.md               ← żywy dziennik projektu (sekcja 8)
├── PLAN.md                  ← ten dokument
├── packages/
│   ├── core/                ← F0: matematyka v3/v4, TYLKO bigint, zero zależności od UI
│   │   ├── src/math/        (tick↔price, liquidity, amounts, fee growth)
│   │   ├── src/strategy/    (szerokość zakresu, warunki rebalansu, sizing hedge)
│   │   └── test/            (testy vs wartości referencyjne SDK i on-chain)
│   ├── data/                ← F1: pobieranie danych (subgraph, RPC, ceny, gas, funding)
│   │   └── cache/           (lokalny cache — nie pobieramy tego samego 2x)
│   ├── backtest/            ← F1: symulator swap-po-swapie + raporty HTML
│   ├── bot/                 ← F2/F3: keeper 24/7 (monitor → decyzja → propozycja/egzekucja)
│   └── ui/                  ← F2: dashboard (pozycje, PnL vs benchmarki, propozycje bota)
└── docs/
```

**Decyzje architektoniczne:**
- **Bez własnego smart kontraktu / vaulta** przy tym kapitale. Pozycje jako standardowe NFT Uniswap na własnym walletcie. Własny vault = koszty audytu i ryzyko nieproporcjonalne do $5–25k. Rewizja dopiero, gdyby strategia wymagała atomowości (rebalans+hedge w jednej tx).
- **Egzekucja pół-auto (F3):** bot buduje gotową transakcję → powiadomienie → podpis w Rabby (WalletConnect). Integrację Rabby↔Claude sprawdzimy jako kanał zatwierdzania — jeśli działa, skróci pętlę.
- **Full-auto (F4):** dedykowany hot wallet (klucz w env na maszynie bota), limity kwotowe na transakcję i na dzień, kill-switch, minimalne approvals.
- Backend bota: Node/TS jako prosty daemon (pm2/systemd) na dowolnym VPS lub domowej maszynie; baza: SQLite (wystarczy).

---

## 6. Fazy realizacji

### Faza 0 — Fundament matematyczny (bez ryzyka, bez środków)
**Cel: core, któremu ufamy co do 1 wei.**
- [ ] Setup monorepo, przeniesienie starego kodu do `legacy/` (referencja, nie podstawa),
- [ ] `packages/core/math`: tick↔price (bigint), liquidity↔amounts (pełne formuły v3 z aktualną ceną), fee growth, wartość pozycji w USD,
- [ ] Testy: zgodność 1:1 z `@uniswap/v3-sdk` + weryfikacja na realnych pozycjach mainnet (odczyt on-chain → porównanie z interfejsem Uniswap),
- [ ] **Bramka wyjścia: wartości identyczne z app.uniswap.org dla Twoich istniejących pozycji.**

### Faza 1 — Dane + backtesting (najważniejsza faza projektu)
**Cel: dowód (lub obalenie) opłacalności strategii przed wydaniem 1 centa na gas.**
- [ ] `packages/data`: pobieranie historii swapów i fee dla kandydujących pul (Arbitrum, Base, mainnet; tiery 0.05/0.3; v3 i v4) — subgraph + RPC eventy + cache lokalny,
- [ ] Symulator: pozycja wirtualna przechodzi przez historię swapów; nalicza fee, IL, gas, slippage,
- [ ] Strategie do porównania: (a) pasywne benchmarki, (b) sztywne ±X% z prostym rebalansem, (c) szerokość ∝ zmienność + histereza + warunek opłacalności, (d) wariant z filtrem trendu i asymetrią,
- [ ] Walk-forward + raport: APR netto, max drawdown, liczba rebalansów, wrażliwość na parametry,
- [ ] **Bramka wyjścia: wybrana sieć+pula+strategia z wynikiem lepszym od HODL 50/50 na ≥2 reżimach rynku.** Jeśli nic nie bije benchmarku — zatrzymujemy się i myślimy, zamiast wdrażać.

### Faza 2 — Dashboard + monitoring na żywo (read-only)
- [ ] UI: Twoje realne pozycje (masz już otwarte poole — podepniemy je od razu), PnL vs benchmarki, wykres zakresu vs cena, health hedge (później),
- [ ] Bot w trybie **obserwatora**: liczy sygnały na żywo i loguje "co by zrobił" (paper trading) — porównanie z backtestem,
- [ ] Alerty Telegram: cena przy krawędzi zakresu, sygnał rebalansu, anomalie.

### Faza 3 — Egzekucja pół-automatyczna
- [ ] Builder transakcji (mint/increase/decrease/collect/swap) + symulacja `eth_call` przed wysłaniem,
- [ ] Przepływ: sygnał → gotowa tx z uzasadnieniem i liczbami → zatwierdzenie w Rabby → tracking,
- [ ] Księgowość: każdy ruch do SQLite + eksport CSV (podatki),
- [ ] Po 2–4 tygodniach zgodności paper-tradingu z rzeczywistością → F4.

### Faza 4 — Full-auto + hedging delta-neutral
- [ ] Dedykowany hot wallet, limity, kill-switch, watchdog, redundancja RPC,
- [ ] Moduł hedge: wybór venue (Hyperliquid vs GMX vs CEX — porównanie funding/fees/min size na aktualnych danych), dynamiczne dopasowanie delty z pasmem tolerancji (rehedge dopiero przy odchyleniu > próg — koszt vs dokładność), zarządzanie marginem z buforem anty-likwidacyjnym,
- [ ] Backtest strategii łączonej (LP + hedge + funding) przed uruchomieniem,
- [ ] Stopniowe zwiększanie kapitału: start ~$2k, skalowanie po miesiącu czystych wyników.

---

## 7. Podział pracy na agentów (i dyscyplina tokenowa)

Struktura zgodna z pakietami — każdy agent ma wąski zakres i własny plik kontekstu:

| Agent | Zakres | Pliki kontekstu |
|---|---|---|
| **Core/Math** | `packages/core` — formuły, testy referencyjne | `CONTEXT.md` + `packages/core/NOTES.md` |
| **Data/Backtest** | `packages/data`, `packages/backtest` — dane, symulator, raporty | `packages/backtest/NOTES.md` |
| **Bot/Execution** | `packages/bot` — keeper, tx builder, alerty, hedge | `packages/bot/NOTES.md` |
| **UI** | `packages/ui` — dashboard | `packages/ui/NOTES.md` |
| **Reviewer** | przeglądy krzyżowe: poprawność matematyki, bezpieczeństwo tx, testy | — |

Zasady oszczędzania tokenów:
1. **CONTEXT.md jest jedynym źródłem prawdy o stanie projektu** — każda sesja zaczyna od jego przeczytania (nie od ponownego zwiedzania repo) i kończy wpisem: co zrobiono, co się popsuło, następny krok,
2. Sesje robocze = jedno zadanie z jednej fazy; bez "przy okazji poprawię UI",
3. Agent czyta tylko swój pakiet + `core` (interfejsy),
4. Reviewer uruchamiany punktowo (przed bramkami faz), nie stale,
5. Duże pobrania danych → raz, do `packages/data/cache/`, nigdy ponownie.

---

## 8. Ryzyka główne (skrót)

| Ryzyko | Mitygacja |
|---|---|
| Strategia nie bije HODL | Bramka po F1 — nie wdrażamy; koszt = czas, nie kapitał |
| Whipsaw zjada kapitał rebalansami | Histereza + warunek opłacalności + limity dzienne rebalansów |
| Likwidacja hedge przy pumpie | Bufor marginu, auto-deleverage, alerty; hedge dopiero w F4 |
| Depeg stablecoina | Monitoring + kill-switch do wyjścia |
| Wyciek klucza hot wallet | Kapitał operacyjny ograniczony, limity, osobny wallet na resztę |
| Overfitting backtestu | Walk-forward, ≥2 reżimy rynku, parametry "okrągłe" nie dostrajane do 4. miejsca po przecinku |
| Awaria bota/RPC | Watchdog, redundancja, pozycja bezpieczna też bez bota (szerszy zakres w F2/F3) |

---

## 9. Pierwsze kroki (następna sesja robocza)

1. Setup monorepo + przeniesienie legacy,
2. `core/math`: tick↔price + liquidity↔amounts na bigint,
3. Test referencyjny na Twojej realnej pozycji z mainnet (adres pozycji NFT → nasze liczby == Uniswap UI),
4. Wpis do CONTEXT.md.
