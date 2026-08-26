# TASKS-ROTATION.md — backtest DYNAMICZNEJ rotacji między pulami (kierunek Rafała 26.08)

> Dyrektywa Rafała (26.08 ~13:xx): "trading powinien być bardziej
> dynamiczny — nie zakładamy trzymania pary 2 lata; cały czas
> przeglądamy rynek, wchodzimy/wychodzimy; para po dużym zysku /
> w jałowości / w stracie → zamykamy i przenosimy się na inny zestaw
> par. Podejść globalnie, nie stroić jednego algorytmu długoterminowo."
> Selektor NA ŻYWO już to robi (ranking dnia + propozycje OPEN/ROTATE);
> brakuje DOWODU z danych, że rotacja dodaje wartość — stąd ten backtest.

## Uczciwa rama (zapisać w raporcie z wyników)

Rotacja między parami ETH/BTC-owymi NIE ucieka od bety rynku — zmienia
tylko silnik fees. Wnioski 720d (UP=klęska bo short gamma, DOWN=strata
z betą) dotyczą KAŻDEJ pary w uniwersum. Rotacja adresuje "jałowość"
(degradację fee-yield) — kierunek rynku adresują bezpieczniki/cash,
nie przeskok na inną parę. Backtest ma to rozdzielić: ile dokłada
wybór puli, a ile decyduje reżim.

## v1 — zakres (buduje Fable, liczy CC-Win)

- **Silnik multi-pool:** wspólna oś czasu na istniejących cache'ach
  (20+ pul, 365d; rdzeń też 720d). Kapitał siedzi w JEDNEJ puli naraz
  (LP pasywny ±30% albo profil v1.1 — dwa warianty), reszta w cash.
- **Sygnał rotacji:** trailing fee-yield 7d puli (z jej swapów — ta
  sama wielkość, którą liczy selektor na żywo) + trailing vsHODL puli.
  Reguły do przetestowania:
  (a) "top1": bądź w puli z najwyższym trailing yield, przełącz gdy
      inna przewyższa o >X p.p. przez ≥N dni (X=5/10, N=2/3);
  (b) "jałowość": wyjdź gdy trailing yield < Y%/r przez N dni →
      cash → wejdź w aktualny top;
  (c) "take-profit": zamknij po zysku >Z% od wejścia, wróć do topu
      (test intuicji "para po dużym zysku wchodzi w jałowość").
- **Koszty przeskoku:** jak selektor na żywo: 0.3% kapitału
  (SWITCH_COST_PCT) + gaz cyklu per sieć; cross-chain = 2× gaz + most
  (stała $2). Payback-guard ≤10d jak w selektorze.
- **Benchmarki:** najlepsza pojedyncza pula trzymana cały okres /
  HODL 50/50 / 100% USDC / "oracle" (zawsze w najlepszej puli
  następnego okresu — górna granica, nieosiągalna).
- **Wyjścia:** tabela pełnookresowa ($5k jak fullperiod.ts) + okna 30d
  (czy rotacja poprawia %wygr./worst vs single-pool).
- **σ:** SIGMA_MODE=grid15 (spójnie z paczką rekalibracyjną).

## Związki

- pkt 11g (lifecycle) = ta sama filozofia na żywo; backtest v1 daje
  liczby pod parametry lifecycle'u (progi degradacji, cooldowny).
- SELECTOR-LOG: reguły (a)/(b) mają być zgodne z tym, co selektor
  proponuje na żywo — bot i backtest mają grać w tę samą grę.
- Werdykt fullperiod 365d (26.08, stary cache): wszystkie warianty
  single-pool ≈ HODL pary; USDC wygrywa w spadkowym roku — rotacja
  fees nie odwróci bety, może najwyżej dołożyć kilka p.p. fees.
