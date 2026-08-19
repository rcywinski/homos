# KAPITAL-REKOMENDACJA.md — pierwsze wejście LP wg ALGORITHM v1.2

> Przygotowane przez Fable 2026-08-19 na zlecenie Rafała (RESEARCH-QUEUE §C
> "DECYZJA KAPITAŁOWA"). To rekomendacja z liczbami — decyzja jest Rafała.
> Źródła: walk-forwardy 365d/22 okna (backtest/results/), forecast.json
> (17.08), SELECTOR-LOG, paper trading (dopiero 2 dni — pominięty w wagach).

## 0. Rekomendacja w jednym zdaniu

**Wejście ETAPOWE: transza 1 = $6 000 TERAZ (tylko Base, dwie zwalidowane
pule + rezerwa), transza 2 = skalowanie do $12–15k PO zakończeniu okresu
OBSERWUJ (~31.08), gdy SELECTOR-LOG i ≥2 tyg. paper tradingu potwierdzą
zachowanie systemu na żywo.**

## 1. Stan walidacji kandydatów (twarde liczby)

| pula | bramka (win% / worst) | strategia | uwaga |
|---|---|---|---|
| base-cbbtc-weth-005 | **82% / −1.8** ✅ najmocniejsza | adapt + exit-trend | ale: obie nogi crypto = pełna beta (down: −85% APR med.) |
| base-weth-usdc-005 | **68% / −2.6** ✅ | adapt k3 + exit-trend | ETH/stable — połowa w stable; tani gaz Base |
| base-weth-usdc-030 | **73% / −2.9** ✅ warunkowo | adapt k3 + **hedge-excess** | bramka TYLKO z hedge; hedge dziś ręczny (GMX) |
| arbitrum-weth-usdc-005 | 73% / −3.5 ❌ (worst < −3) | adapt k3 + exit-trend | blisko, ale bramka nie pass |
| mainnet-usdc-weth-005 | 59% / −1.8 ❌ (win < 65) | adapt k3 + exit-trend | drogi gaz; najsłabszy win% |
| mainnet 0.01% (×2) | ODRZUCONE (55% / −18) | — | lejek 2/2, SELECTOR-LOG |

## 2. Transza 1 — $6 000 (struktura)

| gdzie | kwota | uzasadnienie |
|---|---|---|
| **base-weth-usdc-005** | **$2 500** | Rdzeń ETH/stable: bramka pass, stable = poduszka (down med. −64% APR to głównie beta ETH połowy pozycji), gaz Base pomijalny, czysty exit-trend bez operacyjki hedge |
| **base-cbbtc-weth-005** | **$1 500** | Sleeve "correlated": najlepsza alfa LP w całym zestawie (+11.4 vsHODL/365d), ale ŚWIADOMIE mniejsza waga — w spadkowym reżimie to pełna beta krypto (żadna noga nie jest stable) |
| **rezerwa stable (portfel)** | **$2 000** | Na rebalanse, gaz i transzę 2; NIE w puli — zgodnie z PAIRS.md ~15% balastu |

Czego NIE ma w transzy 1 i dlaczego:
- **base-030 + hedge-excess** — bramka tylko z hedge'em, a hedge jest dziś
  ręczny (short na GMX, przetestowany 17–18.08 na małej kwocie). Ryzyko
  operacyjne (człowiek musi zareagować na sygnał DOWN o dowolnej porze)
  przewyższa premię vsHODL (+1.39 vs +1.16 na base-005). Wchodzi w T2,
  jeśli builder [Zatwierdź hedge] powstanie albo Rafał zaakceptuje tryb ręczny.
- **mainnet-005** — 59% win to nie bramka; dywersyfikacja venue może poczekać.
- **arbitrum-005** — worst −3.5 poniżej progu; obserwujemy w paper.

## 3. Transza 2 — ~31.08, warunki wejścia

Skalowanie do **$12–15k łącznie** (nadal dolna połowa widelca $5–25k), jeżeli:
1. SELECTOR-LOG po ~2 tyg.: brak fałszywych OPEN, które przeszłyby bramkę
   i straciły (dotąd 2/2 poprawne odrzucenia — dobry początek);
2. paper trading ≥14 dni: vs HODL ≥ 0 łącznie i zero anomalii silnika;
3. jutrzejszy+kolejne pipeline'y czyste (dziś pierwszy raz 18/18).
Wtedy: dosypanie do dwóch pul z T1 + ewentualnie base-030 z hedge
(decyzja osobna) + ewentualnie mainnet-005 dla dywersyfikacji venue.
Pełny widelec ($20–25k) dopiero po przejściu OBSERWUJ→PROPONUJ i
pierwszym miesiącu realnych pozycji.

## 4. Rozstrzygnięcie k2/k3 dla cbBTC (wymagane PRZED wejściem)

Napięcie (CONTEXT 12.08): ALGORITHM v1.1 zamroził **k=2** na podstawie
single-runu 365d (+11.4 vs +5.5 k3); pełny walk-forward 22 okna mówi
**k3 > k2**, a forecast w UI już liczy profil k3 (82%/−1.8).
**Rekomendacja: k=3** — metodologicznie 22 okna out-of-sample > jeden
przebieg in-sample; single-run nagradza strategie dopasowane do JEDNEJ
ścieżki roku. Wymaga: rewizja ALGORITHM v1.2→v1.3 (§ wyjątek cbBTC),
zmiana advisorK w bot/config.ts, commit CC-Mac, restart bota CC-Win.
Jeśli Rafał woli zostać przy k2 — wejście też możliwe, różnica dotyczy
szerokości zakresu (k2 = węższy = więcej fee i więcej rebalansów).

## 5. Pyłki mainnet (#953465 ~$88, #953427 ~$2)

- **#953465 ($88 + $3.77 fees)**: ZAMKNĄĆ przy niskim gazie (weekend,
  <10 gwei): decrease+collect ≈ $6–10 gazu ≈ 8–11% wartości — akceptowalne
  jednorazowo; środki (~$80) na Base jako część rezerwy T1.
- **#953427 ($2.08)**: zamknięcie kosztuje więcej niż pozycja. Ekonomicznie
  racjonalne = ZOSTAWIĆ (selektor już go ignoruje przez próg $25). Jeśli
  Rafał chce higieny portfela — zamknąć w TEJ SAMEJ sesji co #953465,
  akceptując ~−$6; nie robić osobnej wyprawy.

## 6. Ryzyka, których ta rekomendacja NIE usuwa

1. Rok kalibracji był głównie spadkowy (10/22 okien down) — strategia
   uczona bronić się, nie maksymalizować hossę; w up-reżimie oddaje
   HODL-owi (base-030 up: 127% vs HODL 146%).
2. Forecast to rozkład z przeszłości, nie prognoza (disclaimer w pliku).
3. Bezpiecznik trendu naprawiony DZIŚ (persystencja EMA) — realnego
   sygnału DOWN jeszcze nigdy nie odpalił na żywo.
4. cbBTC: IL między BTC a ETH + pełna beta obu nóg.
5. Paper trading ma 2 dni — dlatego transza 1 jest "czesnym", nie alokacją.

## 7. Co trzeba zrobić wykonawczo (po decyzji Rafała)

1. Decyzja k2/k3 (§4) → ewentualnie ALGORITHM v1.3 + config + restart.
2. Bridge kapitału na Base (rezerwa + obie pule).
3. Wejścia przez kokpit [Otwórz →] z zakresami doradcy (base-005,
   cbbtc-005) — pozycje jako NFT na walletcie, zero kontraktów własnych.
4. Wpis decyzji do CONTEXT §2 + start dziennika pozycji realnych
   (SQLite wg DB-SCHEMA — dobry moment na implementację przy T1).
5. Pyłki wg §5 przy okazji weekendowego gazu.
