# TASKS-RECAL.md — paczka rekalibracyjna po przeglądzie 26.08

> Źródło decyzji: DECYZJE-2026-08-26.md sekcja "WYNIK PRZEGLĄDU".
> Zasada nadrzędna: v1.2 w produkcie ZAMROŻONY do wyników tej paczki;
> paczka produkuje DANE + kandydata algoVersion **v2.0-rc**, decyzje o
> wdrożeniu podejmuje Rafał na kolejnym przeglądzie. Kod: Fable.
> Liczenie: CC-Win (nocami, jeden walkforward naraz, heap 12288).

## §1 σ — siatka 15 min (fundament; wszystko poniżej liczy się na niej)

- [x] **ZROBIONE 26.08 (Fable):** pomiar σ z zamknięć kubełków 15-min za
  flagą `SIGMA_MODE=swap|grid15` w OBU miejscach naraz:
  - `backtest/engine.ts` — zwrot między zamknięciami kubełków (ev.ts),
    EMA bez zmian (HL 12h);
  - `src/utils/advisor.ts` `computeStats` (bot+UI) — to samo, czas z
    delty bloków; guard `typeof process` (plik idzie do bundla).
  - **DEFAULT = 'swap'** (produkcja/paper BEZ zmian — v1.2 zamrożony);
    przebiegi rekalibracyjne odpalać z `SIGMA_MODE=grid15` w env;
    przełączenie defaultu = decyzja po paczce + podbicie algoVersion.
  - Test syntetyczny (kontener): GBM σ=3%/d → swap 3.02% / grid15 2.88%
    (zgodne); czysty chop ±0.1%/swap bez ruchu netto → swap **8.18%**
    (fantom) / grid15 1.52% (sam zanikający prior) — siatka usuwa
    dokładnie tę wadę, którą mierzy DECYZJE 11.
- [ ] `scripts/vol-estimator-check.ts` — siatka 1h jako stała referencja
  diagnostyczna (narzędzie już liczy siatki; ew. dopisać kolumnę grid15
  przy pierwszym użyciu w paczce).
- [ ] Półtrwanie σ (pkt 11b agendy, wątek "otwieramy najszersze zakresy
  po wystrzale"): policzyć wariant HL 6h vs 12h na siatce 15-min —
  tylko jako kolumna w wynikach, bez zmiany domyślnej.

## §2 Histereza — udział czasu w oknie (3 miejsca naraz)

- [ ] Zamiast "24h NIEPRZERWANIE poza zakresem, dotknięcie zeruje":
  warunek **udział czasu poza zakresem > P% ostatnich h godzin**
  (default P=80, h bez zmian per profil). Odporny na próbkowanie.
- [ ] Wdrożyć IDENTYCZNIE w: `backtest/strategies.ts`,
  `bot/paper.ts`, `bot/observer.ts` (realne pozycje — dziś BEZ
  histerezy, propozycja natychmiast po REBALANCE z assessPosition;
  dostają tę samą regułę przed wystawieniem propozycji).
- [ ] hUp (wyjście górą) w tej samej semantyce: udział czasu, okno hUp.

## §3 Bramka — 720d + warunek recent ~90d

- [ ] Werdykt = (pełne okno 720d: %wygr.≥65 AND worst>−3) AND (podokno
  recent 90d: worst>−3 AND śr. vsHODL ≥ 0). Progi recent do zatwierdzenia
  przez Rafała przy pierwszych wynikach — zapisane jako parametry.
- [ ] Lejek (`candidate-funnel.ts`) przechodzi na cache `*-720d`
  (koszt: dłuższy fetch pierwszorazowy; HyperSync zniesie) + raportuje
  faktyczne pokrycie w dniach dla pul młodszych niż okno.
- [ ] Werdykty istniejące: unieważnienie przez podbicie algoVersion
  (mechanizm już jest); re-walidacja wszystkich BOT_POOLS + PASS/FAIL
  z lejka na nowej bramce.

## §4 Gaz — koniec stałej $8 na mainnet

- [x] **ZROBIONE 26.08 (Fable):** observer liczy żywy koszt cyklu:
  `eth_gasPrice × 800k gazu × kurs ETH` co 5 min per sieć
  (`refreshGas` w observer.ts), podłogi mainnet $0.5 / base $0.08 /
  arb $0.1 (L1-data na L2), stara stała tylko jako fallback przed
  pierwszym odczytem; awaria RPC → zostaje ostatni znany. Wpięte w
  `assessPosition` (payback propozycji REBALANCE), w selektor
  (`ctx.getGasUsd` — koszt ROTATE) i wystawione w state.json jako
  `gasUsd` (UI może pokazać). Wymaga restartu homos-bot u CC-Win.
- [ ] Backtest: stała per-reżim (up/down/flat) albo percentyl
  historyczny gazu — jedna liczba $8 znika; kalibracja przy przebiegach.

## §5 Zestaw strategii paczki (WF_SET=recal)

Baseline'y: HODL 50/50, Pasywny ±50%, Pasywny ±30%.
Kandydaci: v1.1, v1.2 (profil per pula), hUp48 (semantyka §2),
sweep k×h na nowej σ (k=1.5–4 × h=24/48 + hUp48/96),
cbBTC k=2 vs k=3 (rozstrzygnięcie pkt 3 agendy),
**LP-only-flat** (nowy mode: domyślnie HODL 50/50, wejście do LP gdy
detektor mówi "bocznie", wyjście na trend w OBIE strony — odwrócenie
logiki bezpiecznika; detektor z istniejących mechanizmów:
volGateRatio/trendThresh2/EMA-gap), **łagodny sygnał UP** (wyższy próg
/ potwierdzenie czasowe / bramka vol — cel: ogon jak upX bez śmierci
od tysiąca cięć w %wygr.).

## §6 Przebiegi i odbiór

- [ ] Okna: 365d ORAZ 720d (30/15; cross-walidacja 45/20+60/30 dla
  finalistów), wszystkie pule BOT_POOLS (6, w tym nowa
  base-weth-cbbtc-030) — CC-Win nocami, jeden naraz.
- [ ] Raport zbiorczy tabel (śr./%wygr./worst × up/down/flat × okno)
  do @Fable → weryfikacja niezależna → przegląd z Rafałem.
- [ ] NIC z paczki nie wchodzi do produktu bez decyzji Rafała;
  wyjątek: §4 observer (żywy gaz) — zatwierdzony 26.08 do wdrożenia
  od ręki.
