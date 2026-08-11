# ALGORITHM.md — v1.1 (zamrożone 2026-08-11; rewizja §4 tego samego dnia)

> Jedna prawda o parametrach strategii. Zmiany TYLKO przez wpis w CONTEXT.md
> (sekcja 2, decyzje) z uzasadnieniem na danych. Źródła empiryczne: meta-backtest
> selekcji (4.4y, 231 pul), tick-level 5 pul (90d) + 2 pule 365d (1.88M + 1.46M
> swapów), walk-forward z reżimami, cross-walidacja bezpiecznika (5 runów
> out-of-sample). Szczegóły: CONTEXT.md dziennik 2026-08-10/11, RESEARCH-QUEUE B.

## 1. Selekcja pul (warstwa selektora — bot/selector.ts)

- Ranking: **średnia 7d apyBase** (nie wczorajszy top — 74.8% vs 43.0% fee-APR
  w meta-backteście), **persystencja ≥3d** w strefie 2N.
- Filtr: **majors-only** (potwierdzone 3×: meta-backtest, tabela 5 pul,
  tick-level WTAO — beta egzotyka −70%/r miażdży alfę LP +7 p.p.),
  TVL ≥ $3M, uniswap-v3, chain mainnet/Base.
- Rotacja: max 1/dzień; tylko gdy przewaga pokrywa koszt przejścia 0.3%
  w ≤10 dni. OPEN: max 2/dzień, cooldown odrzuconych 7d.
- Sleeve egzotyczny: **0%** (decyzja 2026-08-10, potwierdzona po fixie jednostek).

## 2. Zakres pozycji (doradca — src/utils/advisor.ts)

- Szerokość: **w = k · σ_dzienna · √7d**, gdzie **k = 3** dla par ETH/stable
  (walk-forward 365d: k3 h24 jedyna dodatnia śr.+med. w obu oknach; bramka
  ≥2 reżimy zaliczona). Clamp: 1%–60%.
- **Wyjątek pary skorelowane (cbBTC/WETH): k = 2** (365d: k2h24 +11.4 vsHODL
  vs k3 +5.5 — węższa zmienność względna uzasadnia węższy zakres).
- Mainnet przy kapitale ≤$25k: preferuj pasywnie szeroko (±50%) albo wcale —
  gaz $8/cykl zjada aktywne zarządzanie (tabela 5 pul).

## 3. Trigger rebalansu

- Poza zakresem przez **≥24h** (histereza; h24 > h12 na 4/5 pul) ORAZ
- payback: koszt rebalansu (gaz + swap) musi zwracać się z trailing fee-yield
  w **≤7 dni**.

## 4. Bezpiecznik trendu spadkowego (NOWE w v1 — decyzja Rafała 2026-08-11)

- Profil (v1.1, ETH/stable): **exit(HL7d, 5%) + powrót nad EMA (re>EMA)**.
  Detektor: EMA log-ceny względnej pary, half-life 7d; sygnał DOWN gdy
  log(P/EMA) < −5%. Akcja: **zamknij pozycję do cash 50/50**; powrót do LP
  dopiero gdy cena WRÓCI PONAD EMA (potwierdzone odbicie).
- Wyjątek cbBTC/WETH: czysty exit (gaśnięcie przy −2.5%, bez warunku nad-EMA)
  — na parze skorelowanej szybszy powrót wygrywał (+0.88 vs +0.61).
- Historia decyzji: rano 11.08 wybrano czysty exit na podstawie 90d-owych
  runów (4 okna — za mała moc); po dociągnięciu 365d dla base-005 i
  mainnet-005 (po 22 okna) re>EMA wygrywa 4/5 pul średnią I ogonem
  (base-005: +1.20 / 68% wygr / worst −2.52 — **pierwsze pełne przejście
  bramki %wygr≥65 ∧ worst>−3 w projekcie**; mainnet-005: +0.73/59%/−1.74).
  Rewizja zatwierdzona przez Rafała ~14:30.
- Odrzucone: widen (bez efektu), block (szkodzi), dwupoziomowy vg+t2
  (overfit do base-030).
- Świadomy koszt: późniejszy powrót omija początek odbicia (kilka dziesiątych
  p.p. na niektórych pulach). Ogon NIE jest w pełni usunięty — hedge (F4)
  pozostaje otwartym frontem.

## 5. Odbiór fees (collect)

- Zbieraj gdy nieodebrane fees > **8× koszt gazu collect** (UI-próg; rachunek
  progowy — compounding daje ~1–2 p.p./r). Historycznie 50×, obniżone po
  praktyce (CONTEXT 2026-08-10).

## 6. Portfel (PAIRS.md, po rewizji 2026-08-11)

- Rdzeń: WETH/USDC 0.3% Base — aktywnie (k=3, h24, bezpiecznik exit).
- cbBTC/WETH 0.05% Base — aktywnie k=2; UWAGA: para = 100% beta krypto
  (HODL −51%/r w 2025/26), rozmiar sleeve'a = decyzja o ekspozycji, nie
  o jakości LP (alfa vsHODL +11.4 najlepsza ze wszystkich pul).
- Mainnet: tylko pasywnie ±50% albo wcale.
- Pary spięte (stable-stable/LST/BTC-BTC): werdykt po F.A/F.B (w toku).

## 7. Wdrożenie parametrów (jedna prawda)

- [x] backtest/strategies.ts — volAdaptive(k3,h24,pb7) + volAdaptiveTrend(exit).
- [ ] src/utils/advisor.ts ADVISOR_PARAMS: k 2→3 (per-pula k=2 dla cbBTC —
  wymaga pola w konfiguracji puli); bezpiecznik: TODO bot-side (observer
  potrzebuje stanu EMA per pula — osobne zadanie, sekcja E RESEARCH-QUEUE).
- [ ] bot/config.ts: te same wartości per pula.

## 8. Znane ograniczenia v1

- Bramka absolutna (%wygr ≥65 ∧ worst >−3 na oknach) nie przechodzi globalnie —
  przechodzi wewnątrz-reżimowo (flat/up). Ogon down zmniejszony ~2×, nie zero.
- base-005/mainnet-005 zwalidowane tylko na 4 oknach (90d) — powtórzyć po
  refetchu 365d (HyperSync, minuty).
- Okna 60d: redukcja ogona słabsza (długi trend mieści się w oknie) —
  bezpiecznik nie chroni przed wielomiesięcznym bear marketem; to rola F4.
