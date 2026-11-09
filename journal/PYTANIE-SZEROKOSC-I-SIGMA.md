# Szerokość zakresu LP i pomiar zmienności — brief do konsultacji zewnętrznej

> Przygotowane 21.08.2026 (sesja Fable) na prośbę Rafała: „zapiszmy do
> przemyślenia, skonsultuję z innymi modelami w przyszłym tygodniu".
> Dokument jest **samowystarczalny** — można go wkleić modelowi, który nie
> zna tego repo. Decyzje: przegląd 26.08 (patrz DECYZJE-2026-08-26.md pkt 11).

---

## 1. Czym jest system (minimum kontekstu)

Bot zarządza pozycjami LP w Uniswap v3 (płynność skoncentrowana) na parach
ETH/stablecoin i cbBTC/WETH, na sieciach Ethereum, Base, Arbitrum, Optimism.
W v3 dostawca płynności wybiera **zakres cenowy**; opłaty naliczają się
wyłącznie, gdy cena jest wewnątrz zakresu, a płynność rozkłada się na jego
szerokość — węższy zakres oznacza gęstszą płynność i **z grubsza odwrotnie
proporcjonalnie większy strumień opłat**, ale też większe ryzyko wypadnięcia.

Stan: tryb obserwacyjny + paper trading (start 18.08, $10k wirtualne na pulę).
Realny kapitał jeszcze nie wszedł (planowana transza $6k, decyzja 26.08).
Cykl bota: odświeżanie statystyk i decyzji **co 15 minut**.

## 2. Jak dziś ustawiamy zakres

```
w = clamp( k · σ_dzienna · √horizonDays , minWidth=1% , maxWidth=60% )
zakres = [tick(cena)/(1+w) , tick(cena)·(1+w)]  (symetrycznie w tickach)
```
- `k = 3` (dla cbBTC/WETH `k = 2`), `horizonDays = 7`
- Rebalans dopiero, gdy pozycja jest **24h nieprzerwanie poza zakresem**
  (jedno dotknięcie zakresu zeruje licznik) **i** koszt rebalansu zwróci się
  z opłat w ≤7 dni (`payback ≤ maxPaybackDays`).
- Osobny bezpiecznik trendu: EMA log-ceny (półtrwanie 7 dni); sygnał DOWN
  przy −5% pod EMA, wyjście do gotówki (lub hedge short na GMX dla jednej
  puli); powrót przy powrocie nad EMA (albo −2,5% dla cbBTC).
  Dla par skorelowanych (cbBTC/WETH) trend liczony jest na cenie **względnej**
  (cbBTC wyrażone w WETH), nie w USD.

## 3. Jak liczymy σ — i co z tym jest nie tak

`σ_dzienna` liczona jest jako EWMA (półtrwanie 12h) z kwadratów zmian ceny
**swap po swapie**, gdzie każda zmiana jest annualizowana przez czas między
swapami: `rate = r² · 86400 / dt`, `dt = max(Δblok · blockTime, blockTime)`.

**Problem:** taki estymator mierzy „szarpaninę" (chop), a nie realne
przemieszczenie ceny. Gdy rynek idzie w jedną stronę wieloma drobnymi
krokami, suma kwadratów kroków jest znacznie mniejsza niż kwadrat ruchu
łącznego.

Pomiar z 21.08 (te same 24h, narzędzie `scripts/vol-estimator-check.ts`,
porównanie estymatora produkcyjnego z realized vol z **siatki czasowej 1h**):

| pula (wszystkie śledzą ETH) | σ produkcyjna | σ z siatki 1h | błąd | zakres k=3 dziś | po korekcie |
|---|---|---|---|---|---|
| mainnet USDC/WETH 0.05% | 3,20%/d | 4,00%/d | −20% | ±25,4% | ±31,7% |
| base WETH/USDC 0.30% | 0,71%/d | 3,23%/d | −78% | **±5,6%** | ±25,6% |
| base WETH/USDC 0.05% | 1,94%/d | 3,40%/d | −43% | ±15,4% | ±27,0% |
| arbitrum WETH/USDC 0.05% | 0,91%/d | 2,84%/d | −68% | ±7,2% | ±22,6% |

**Kluczowa obserwacja:** to jest cztery razy to samo aktywo w tej samej
dobie. Rozrzut σ między pulami wynosi **4,5×** przy estymatorze
produkcyjnym i **1,4×** przy siatce czasowej. Estymator produkcyjny jest
więc funkcją mikrostruktury puli (fee tier, częstość transakcji), a nie
zmienności aktywa. σ = 0,71%/d dla ETH to ~13% w skali roku — nieprawda.

Diagnostyka pomocnicza `|ruch netto| / √Σr²` (≈1 = błądzenie losowe,
>1 = trend małymi krokami): 1,28 / 6,08 / 2,24 / 4,79 — wszystkie pule
zachowują się bardziej trendowo niż błądzenie losowe.

**Hipotezy JUŻ ODRZUCONE** (żeby ich nie powtarzać):
1. „swapy bez zmiany ceny rozcieńczają średnią" — takich swapów jest 0%;
2. „`dt = max(Δblok·blockTime, blockTime)` skleja swapy z jednego bloku" —
   efekt realny, ale drobny: na Base kolizje w bloku są rzadkie, a błąd
   jest tam największy.

**Uwaga na drugi koniec:** próbka 1–5 min bywa **zawyżona** przez odbicia
ceny w paśmie opłaty (bid-ask bounce). Na mainnet σ spada o 37% przy
przejściu z próbki 5-minutowej na godzinową. Dlatego odniesieniem jest
15 min / 1h, nie 5 min.

## 4. Dlaczego to blokuje decyzję o `k`

Szerokość `w = k·σ·√7` dziedziczy błąd σ, a błąd jest **różny dla każdej
puli** — więc jedno globalne `k` nie może być poprawne dla wszystkich naraz.
Co więcej, wszystkie nasze kalibracje `k` (walk-forward 365d, dzienne
sweepy) były liczone na tej samej, obciążonej σ. Przykład: sweep na puli
base 0.30% wskazał `k=4` jako najlepszy wariant (+17,7% vs HODL) — ale przy
σ=0,71%/d „k=4" oznacza realną szerokość **±7,5%**, a nie ±30%, jak
sugerowałaby intuicja. Wyniki są zatem wyrażone w jednostkach zepsutej miary.

Wniosek roboczy: naprawy pomiaru i rekalibracji `k` nie da się rozdzielić.

## 5. Kompromis, którego dotyczy decyzja

Dla σ ≈ 4%/d jedna sigma ruchu tygodniowego to 4%·√7 ≈ 10,6%.
Dla błądzenia losowego prawdopodobieństwo, że cena **dotknie** krawędzi
w ciągu tygodnia (a nie tylko skończy poza nią):
- ±1σ (±10,6%): wybicie w ~2 tygodniach na 3
- ±2σ (±21,2%): ~1 na 11
- ±3σ (±31,7%): rząd 0,5%

Strumień opłat skaluje się z grubsza jak 1/szerokość, więc ±10,6% zarabia
~3× szybciej niż ±31,7%, dopóki jest w zakresie. Grube ogony i
trendowość (patrz wyżej) działają na niekorzyść wąskich zakresów mocniej,
niż mówi model normalny.

## 6. Pytania do konsultacji

1. **Jaki estymator zmienności jest właściwy do ustawiania zakresu LP?**
   Czy siatka czasowa 15min/1h to dobry wybór, czy lepiej sięgnąć po
   estymatory odporne na mikrostrukturę (Garman–Klass, Rogers–Satchell,
   two-scale realized volatility, bipower variation)? Co jest sensowne przy
   danych ze swapów jednej puli, bez księgi zleceń?
2. **Czy miarą powinna być zmienność, czy oczekiwany zasięg ruchu?**
   Dla LP liczy się prawdopodobieństwo dotknięcia bariery w horyzoncie —
   czy nie właściwsze byłoby modelowanie wprost rozkładu maksimum
   (np. przez rozkład czasu pierwszego przejścia) niż mnożnik `k·σ`?
3. **Jak wybrać szerokość optymalnie, a nie heurystycznie?** Istnieje
   literatura o optymalnym zakresie w Uniswap v3 (opłaty vs strata z
   rebalansowania/LVR). Czy da się z niej wyprowadzić regułę zamkniętą,
   która uwzględnia: stawkę opłaty, koszt rebalansu (gaz + poślizg),
   zmienność i dryf ceny?
4. **Czy stała szerokość nie jest lepsza od adaptacyjnej?** W naszym sweepie
   „sztywny ±30%" wypadł tuż za najlepszym wariantem adaptacyjnym, a
   „sztywny ±10%" był najgorszy z całej stawki (−19% vs HODL).
5. **Histereza:** dziś „24h nieprzerwanie poza zakresem", gdzie jedno
   dotknięcie zeruje licznik, próbkowane co 15 min. To czyni regułę
   zależną od częstotliwości próbkowania (nasz backtest próbkuje na każdym
   swapie i przez to rebalansuje rzadziej niż produkcja). Czy lepsza jest
   reguła oparta na **udziale czasu** poza zakresem (np. >80% z 24h)?
6. **Bezpiecznik trendu na parach skorelowanych:** dla cbBTC/WETH sygnał
   liczony jest na cenie względnej, więc wychodzimy do gotówki, gdy ETH
   bije BTC — w rosnącym rynku kosztowało nas to ~$767 dziennie względem
   HODL. Czy dla par skorelowanych bezpiecznik trendu ma w ogóle sens, czy
   właściwą odpowiedzią jest hedge albo rezygnacja z niego?

## 7. Ograniczenia praktyczne (dla realistycznych odpowiedzi)

- Dane: wyłącznie zdarzenia Swap z łańcucha (mamy pełne roczne historie,
  do 12M swapów na pulę) + DefiLlama do rankingu pul. Brak księgi zleceń,
  brak płatnych źródeł danych.
- Bot działa w cyklu 15-minutowym na maszynie Windows 24/7; backtest w
  Node/TypeScript.
- Koszt rebalansu: gaz (Ethereum drogo, L2 grosze) + ~połowa wartości
  pozycji przechodzi przez swap (opłata puli + poślizg ~5 bps).
- Skala kapitału: pierwsza transza ~$6k, docelowo $12–15k. Przy takich
  kwotach koszt stały rebalansu na Ethereum jest istotny.
