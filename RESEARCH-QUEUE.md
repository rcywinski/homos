# RESEARCH-QUEUE.md — kolejka danych i badań (żeby nic nie uleciało)

> Żywy plik. Każda sesja (AI albo Rafał w terminalu) odhacza wykonane pozycje
> i dopisuje wyniki/nowe pozycje. Analizy = skrypty lokalne (zero tokenów AI);
> sesja analityczna (Fable) tylko interpretuje wyniki. Stan projektu: CONTEXT.md.

## A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)

- [x] **Refetch mainnet-usdc-weth-030 (pełne 90d)** — ✅ DONE (Claude Code):
  100.0%, **49210 swapów, 90.3 dni**. Wymagało kilku wznowień (skrypt wychodzi 0
  mimo FAILED przy dławieniu archiwalnym publicznych RPC; resume ze state.json
  dograł resztę partiami). Uwaga na przyszłość: darmowe RPC dławią archiwum;
  keyed Alchemy dodany do .env, ale to **free tier = limit 10 bloków/getLogs** —
  do dużych zakresów potrzeba płatnego planu (patrz A2/A3).
- [x] **base-weth-usdc-030-365d** — ✅ DONE (HyperSync, 11.08 ~09:45):
  state nextBlock 49 791 594 > latest 49 791 593, pełny rok (1.88M swapów).
  Grind RPC (150 bl/s, godziny) zastąpiony HyperSynciem (~17k bl/s, minuty) —
  lekcja: darmowe RPC nie nadają się do rocznych fetchy. Fundament B1 wykorzystany
  (walk-forwardy 45/60d zrobione i zinterpretowane, sekcja B + CONTEXT 11.08).
- [x] **base-cbbtc-weth-005-365d** — ✅ DONE (Claude Code, **HyperSync ~20k bl/s,
  ~12 min**): **1 462 579 swapów**, pełny rok. ⚠️ **ORIENTACJA TOKENÓW POPRAWIONA**
  przed jakimkolwiek backtestem: cfg (POOLS + oba meta.json) miało odwrotnie
  (token0=cbBTC d8/ethIsToken0=false); on-chain token0=WETH d18, token1=cbBTC d8 →
  poprawione na token0Decimals:18, token1Decimals:8, ethIsToken0:true. Surowe dane
  ndjson były OK (event Swap jest w terminach token0/1 niezależnie od etykiet);
  błędna była tylko interpretacja skali/orientacji. Gotowe do backtestu.
  ~~BACKTEST cbBTC-365d (wersja poranna CC)~~ **UNIEWAŻNIONE (Fable, 11.08
  ~10:00)**: liczone silnikiem sprzed fixu wyceny — engine traktował nogę
  nie-ETH jako stable $1, więc dla pary WETH-owej equity było w jednostkach
  "cbBTC-dolarów", nie USD (stąd absurdalne fees $11-13). Werdykt "teza
  obalona" COFNIĘTY. POPRAWNY backtest (silnik z quote:'WETH', USD po blokach
  z base-030-365d; 1 461 600 swapów, 365 dni, $10k):
  | strategia | APR% | vsHODL% | maxDD% | fees$ | reb |
  |---|---|---|---|---|---|
  | HODL 50/50 | −51.5 | 0.00 | 61.5 | 0 | 0 |
  | Pasywny full-range | −50.9 | +1.09 | 61.4 | 108 | 0 |
  | Pasywny ±50% | −48.6 | +5.95 | 61.1 | 589 | 0 |
  | Sztywny ±5% (naiwny) | −49.4 | +4.32 | 59.8 | 4379 | 43 |
  | Sztywny ±15% (naiwny) | −48.4 | +6.26 | 59.2 | 1595 | 4 |
  | **Adapt k2 h24 pb7** | −45.9 | **+11.42** | 57.9 | 2126 | 5 |
  | Adapt k2 h12 pb7 | −48.6 | +6.00 | 59.8 | 1825 | 6 |
  | Adapt k3 h24 pb7 | −48.8 | +5.51 | 60.1 | 1198 | 3 |

  WERDYKT DWUSTRONNY (Fable): (a) **alfa LP-vs-HODL na parze skorelowanej
  DZIAŁA — najlepsza ze wszystkich pul** (+11.4 adapt k2h24, fees $2.1k ≈
  21%/r, gas Base pomijalny; uwaga: tu k2 > k3 — węższa zmienność względna);
  (b) ABSOLUTNIE rok fatalny (−46…−51%, maxDD ~60%) — obie nogi crypto =
  pełna beta, zero poduszki stable. Sleeve cbBTC 25% z PAIRS.md NIE jest
  "łagodnym reżimem" (to był artefakt) — jego sens zależy od decyzji
  o ekspozycji krypto i hedge (F4), nie od jakości LP.
- [x] **Egzotyki tick-level (werdykt majors vs egzotyki)** — DANE POBRANE (A4):
  - **DORY-USDC (Arbitrum 1%) to uniswap-V4** (universe.json: project=uniswap-v4,
    pool ae3c1ac2…, tokeny DORY 0x33b49f22…436ae / USDC natywny 0xaf88…5831).
    v4 = singleton PoolManager, inny Swap event, BRAK adresu przez v3 factory getPool
    → NIE do pobrania obecnym v3-skryptem (v4 świadomie odłożony, CONTEXT 2e). POMINIĘTE.
  - **Substytut v3 wybrany: WTAO-WETH mainnet 1%** (najwyższy v3 apyBase w universe:
    79.2%, TVL $2M). Zweryfikowane on-chain: pula 0x433a0081…1bbc, WTAO decimals=9,
    WETH=18, ethIsToken0=false. ✅ wpis w POOLS DOPISANY (`mainnet-wtao-weth-100`).
    ✅ **FETCH DONE** (100%, 10753 swapów, 90.3 dni). Alternatywa gdyby analityk
    wolał Arbitrum: WETH-ARB 0.05% (31%) — infra Arbitrum gotowa.
  - **Infra Arbitrum DODANA** do fetch-swaps.ts (RPC list + RPC_ARBITRUM env,
    BLOCK_TIME=0.25s, FACTORY = ten sam v3 0x1F98…F984, chain union) — gotowe pod
    przyszłe v3 pule Arbitrum.
  - il7d z DefiLlamy pusty — tylko nasze tick-level rozstrzygnie, czy 60%+ fee-APR
    egzotyków przeżywa własny IL.
  - **BACKTEST WTAO-WETH (10750 swapów, 90.3 dni) — dane dla B5. Reżim WZROSTOWY
    (jedyny w zestawie, HODL +74.9% APR!):**

    | strategia | APR% | vsHODL% | maxDD% | fees$ | gas$ | reb |
    |---|---|---|---|---|---|---|
    | HODL 50/50 | +74.9 | 0.00 | 16.9 | 0 | 0 | 0 |
    | Pasywny full-range | +77.5 | **+0.37** | 16.8 | 124 | 0 | 0 |
    | Pasywny ±50% | +75.1 | +0.01 | 16.8 | 486 | 0 | 0 |
    | Sztywny ±5% (naiwny) | −67.0 | −33.84 | 33.6 | 1,316 | 248 | 31 |
    | Sztywny ±15% (naiwny) | −10.7 | −15.35 | 22.9 | 857 | 48 | 6 |
    | Adapt k2 h24 pb7 | +8.1 | −11.24 | 17.4 | 889 | 48 | 6 |
    | Adapt k2 h12 pb7 | +26.7 | −7.69 | 17.4 | 917 | 48 | 6 |
    | Adapt k3 h24 pb7 | +62.8 | −1.77 | 17.0 | 826 | 8 | 1 |

    ⚠️ **TABELA UNIEWAŻNIONA (Fable, 11.08): jednostki błędne** — silnik
    traktował WTAO jako stable $1, equity było w WTAO-jednostkach; "reżim
    wzrostowy +74.9%" znaczył w rzeczywistości SPADEK WTAO (odwrotnie!).
    POPRAWNIE (silnik quote:'WETH', USD): HODL −70.5% APR, maxDD 38;
    vsHODL: k3h24 **+7.31**, k2h12 +5.64, pasywny±50 +2.65, ±15 −5.91.
    Zrewidowany wniosek: egzotyk zły nie przez "LP przegrywa w trendzie",
    tylko przez betę tokena (−70%/r) miażdżącą alfę LP (+7 p.p.). Filtr
    majors-only ZOSTAJE, uzasadnienie skorygowane. Szczegóły: CONTEXT 11.08.
- [x] Historie DefiLlama 240 pul (4.4y dziennych apyBase/TVL) — pobrane.
- [x] Fix odświeżania: fetch-llama teraz odświeża pliki starsze niż 24h
  (wcześniej resume pomijał je na zawsze — codzienny pipeline byłby ślepy).
- [~] **Weryfikacja pipeline 07:30** — saga domknięta fixem shell:true (18.08,
  CONTEXT); weryfikacja pierwszego czystego przebiegu 19.08 zlecona CC-Win
  (HANDOFF), raport przyjdzie automatem porannym (reports/).

## B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)

- [x] **Walk-forward na 365d** — ✅ DONE (Claude Code, dane 365d przez HyperSync:
  1 852 872 swapy). Kryterium: %wygr ≥65 i najgorsze okno > −3.
  **WERDYKT: ŻADNA strategia nie przechodzi bramki** (najgorsze okno wszędzie −7…−12).

  Okna **45d co 15d (22 okna)** — vsHODL% na okno:
  | strategia | śr. | med. | %wygr | najgorsze | najlepsze |
  |---|---|---|---|---|---|
  | Pasywny ±50% | −0.71 | +1.67 | **64%** | −11.63 | +3.53 |
  | Sztywny ±15% (naiwny) | +0.38 | +0.19 | 50% | **−7.01** | +10.15 |
  | Adapt k2 h24 pb7 | −1.05 | −0.09 | 45% | −10.18 | +7.58 |
  | Adapt k3 h24 pb7 | +0.55 | +2.66 | 55% | −12.33 | +6.41 |

  Okna **60d co 15d (21 okien)**:
  | strategia | śr. | med. | %wygr | najgorsze | najlepsze |
  |---|---|---|---|---|---|
  | Pasywny ±50% | −0.51 | +0.56 | 57% | −12.74 | +4.81 |
  | Sztywny ±15% (naiwny) | −0.24 | −0.33 | 48% | −7.78 | +10.98 |
  | Adapt k2 h24 pb7 | −1.02 | −2.38 | 48% | −10.95 | +9.50 |
  | Adapt k3 h24 pb7 | **+1.02** | +1.63 | **62%** | −11.16 | +8.60 |

  Fakty liczbowe (interpretacja → sesja analityczna): (1) najbliżej bramki
  **Adapt k=3 h=24** (55%/62% wygr, dodatnie śr+med w obu oknach); (2) wspólny
  zabójca to **najgorsze okno −7…−12** u KAŻDEJ strategii — twardo potwierdza
  kruchość 1-3 decyzji rebalansu (→ B3 warianty triggera = główny front);
  (3) sztywny ±15% ma najłagodniejsze najgorsze-okno (−7.0/−7.8), ale %wygr tylko
  50/48. Pliki: backtest/results/walkforward-base-weth-usdc-030-365d.json (gitignored).
- [x] **Podział na reżimy (B2)** — ✅ DONE (Fable-desktop, 11.08, w kontenerze):
  walkforward.ts taguje okna zmianą ceny względnej (±10% → up/down/flat),
  raport per reżim, wynik w walkforward-<id>-<okno>d.json (fix nadpisywania).
  **WYNIK (base-030-365d): hipoteza z B1 potwierdzona w 100% — wszystkie
  najgorsze okna (−7…−12) to okna DOWN.** FLAT: adapt k3h24 100%wygr,
  najgorsze +2.66 (45d) — pełne kryterium spełnione wewnątrz reżimu;
  pasywny±50 100%wygr w obu oknach. UP (60d): k3h24/k2h24 100%wygr.
  DOWN: 20–42%wygr, średnie ujemne wszędzie. **Bramka PLAN.md (≥2 reżimy):
  adapt k3h24 i pasywny±50 PRZECHODZĄ (up+flat).** Pełne liczby: CONTEXT
  wpis 11.08 "PRZEŁOMOWA" + backtest/results/walkforward-*-45d/60d.json.
- [~] **BEZPIECZNIK TRENDU SPADKOWEGO — NOWY GŁÓWNY FRONT (wniosek z B2)**.
  STAN 11.08 ~11:00 (Fable): zaimplementowane (volAdaptiveTrend w strategies.ts),
  sweep iteracji 1 zrobiony na base-030-365d/45d — widen i block ODRZUCONE,
  exit działa na ogon (−12→−2…−6 w down) kosztem flat; bramka vol naprawia
  flat, ślepa na grind; dwupoziomowy = kompromis. Szczegóły: CONTEXT 11.08.
  CROSS-WALIDACJA ✅ DONE (11.08 ~11:15, Fable; kod c64f8ba, runy 10fd366):
  bezpiecznik generalizuje jako reduktor ogona w 5/5 runów (down-mean i worst
  lepsze od czystej A3 wszędzie). Dwupoziomowy (vg+t2) NIE generalizuje —
  overfit do base-030, ODRZUCONY. Najlepsze: exit+re>EMA (najlepsza średnia
  cross-pool) i czysty exit (najlepszy down/worst) — rekomendacja: re>EMA
  domyślny, exit konserwatywny. Bramka PLAN.md nadal nie przechodzi globalnie
  (ogon ~2× mniejszy, nie zerowy) → hedge F4 pozostaje frontem. Liczby:
  CONTEXT wpis 11.08 "CROSS-WALIDACJA". DECYZJA PROFILU → Rafał przy
  zamrażaniu ALGORITHM.md.
  Oryginalny opis zadania:
  strojenie k/h wyczerpane; brakuje komponentu reżimowego. Do strategies.ts:
  detektor trendu (np. EWMA-trend / zmiana ceny X% w T dni / cena poniżej
  średniej kroczącej N-dniowej) + akcja obronna (wariant A: poszerz zakres
  ×2-3; wariant B: wyjdź do 100% stable do odwołania; wariant C: nie wchodź
  ponownie po rebalansie dopóki trend trwa). Test walk-forwardem z reżimami
  na 365d: cel = DOWN z 20-42% → ≥50%wygr i najgorsze okno > −5 przy
  zachowaniu wygranych up/flat. UWAGA: wariant B to de facto market-timing —
  porównać uczciwie z benchmarkiem "HODL z tym samym sygnałem".
- [x] **Walkforwardy 60/15 (4 pule) + arbitrum-030 45/60 (nocna partia
  db2e3e5)** — ✅ ZINTERPRETOWANE (Fable, 12.08 brief): mainnet-005-60d
  **PEŁNY PASS bramki** oboma profilami trendowymi (re>EMA +1.07/71%/−2.16);
  cbBTC-60d czysty exit pass (81%/−1.36); base-005-60d re>EMA +1.70/62%/−1.94
  (o włos); arb-005-60d NIE potwierdza 45d (exit 62%/−4.15); **arb-030 FAIL**
  → na Arbitrum tylko 005. Napięcie do v1.2: na cbBTC walk-forward mówi k3>k2
  (zamrożone k=2 z single-runu). Szczegóły: CONTEXT wpis 12.08.
- [~] **Warianty triggera rebalansu** (po B2 ZDEGRADOWANE do drugorzędnych —
  ogon robią okna DOWN, nie timing triggera; nadal warte sprawdzenia PO
  bezpieczniku trendu):
  do strategies.ts dodać (a) bufor cenowy (rebalans po wyjściu o X% poza zakres,
  nie od razu), (b) odwrót momentum (rebalans dopiero gdy EWMA-trend wraca ku
  zakresowi), (c) powrót-do-zakresu (czekaj aż cena wróci; rebalans tylko po
  T dniach poza). Sweep na 365d.
  → CZĘŚCIOWO ZROBIONE 20.08 (nowy wariant d): **ASYMETRYCZNA HISTEREZA
  hUp** (`hysteresisUpSec` w strategies.ts, zestaw `WF_SET=hup`) —
  POLICZONE W CAŁOŚCI (11 przebiegów, 5 pul, okna 30/45/60d): hUp=48h
  lepszy/równy v1.1 na 9/9 przebiegów z efektem, ogon poprawiony wszędzie;
  hUp 6/12h odrzucone; cbBTC bez zmian. DECYZJA o wdrożeniu (v1.3) →
  **DECYZJE-2026-08-26.md pkt 2** (Rafał, 26.08).
- [ ] **Compounding w silniku**: akcja collect+reinwestycja przy fees > próg
  (50× gaz), zmierzyć wpływ na APR (oczekiwane +1–2 p.p.).
- [x] **Egzotyki: pełny PnL tick-level** (po A4) vs cbBTC/majors — decyzja
  o sleeve egzotycznym (≤20% kapitału albo wcale).
- [x] **Refetch mainnet-030 90d → run.ts** — ✅ DONE (Claude Code). 49210 swapów,
  90.3 dni. Okres SPADKOWY (HODL 50/50: −31.5% APR). Tabela (kapitał $10k):

  | strategia | końcowa$ | APR% | vsHODL% | maxDD% | fees$ | gas$ | reb | inRng% |
  |---|---|---|---|---|---|---|---|---|
  | HODL 50/50 | 9,107 | −31.5 | 0.00 | 18.8 | 0 | 0 | 0 | 0 |
  | Pasywny full-range | 9,139 | −30.5 | +0.35 | 20.8 | 73 | 0 | 0 | 100 |
  | **Pasywny ±50%** | 9,264 | −26.6 | **+1.72** | 29.4 | 382 | 0 | 0 | 99 |
  | Sztywny ±5% (naiwny) | 7,780 | −63.7 | **−14.57** | 30.7 | 2,698 | 240 | 30 | 100 |
  | Sztywny ±15% (naiwny) | 8,297 | −53.0 | −8.90 | 28.3 | 979 | 40 | 5 | 100 |
  | Adaptacyjna k=2 h=24 pb7 | 8,573 | −46.3 | −5.86 | 30.6 | 1,185 | 32 | 4 | 86 |
  | Adaptacyjna k=2 h=12 pb7 | 9,122 | −31.0 | +0.17 | 27.5 | 694 | 16 | 2 | 98 |
  | Adaptacyjna k=3 h=24 pb7 | 8,870 | −38.4 | −2.61 | 28.0 | 502 | 8 | 1 | 98 |

  Fakt liczbowy (interpretacja → sesja analityczna): na mainnecie gaz $8/cykl masakruje
  aktywne wąskie (±5% naiwny −14.6 vs HODL przy $240 gazu / 30 rebalansów); tylko
  szerokie pasywne biją HODL (±50% +1.72). Spójne z wcześniejszym "werdyktem martwej puli".
  Raport SVG: backtest/results/report.html (gitignored).

  **DOMKNIĘTA TABELA 5 PUL (90d, kapitał $10k) — vs HODL % (dodatnie = bije HODL).**
  Wszystkie pule ~90.1–90.3 dni. Swapy: mn-005 464k · mn-030 49k · base-005 1.86M ·
  base-030 582k · cbbtc-005 323k. (run.ts per-pula, bo równolegle leciały fetche 365d/WTAO.)

  | Strategia (vs HODL %) | mn-usdc-005 | mn-usdc-030 | base-usdc-005 | base-usdc-030 | base-cbbtc-005 |
  |---|---|---|---|---|---|
  | _HODL APR % (reżim)_ | _−30.4_ | _−31.5_ | _−29.8_ | _−29.5_ | _−7.2_ |
  | Pasywny full-range | +0.33 | +0.35 | +0.51 | +0.40 | +0.19 |
  | **Pasywny ±50%** | **+1.69** | **+1.72** | **+2.75** | +2.20 | +1.01 |
  | Sztywny ±5% (naiwny) | −21.01 | −14.57 | −13.34 | −0.56 | −0.57 |
  | Sztywny ±15% (naiwny) | −8.25 | −8.90 | +1.60 | +2.44 | **+2.76** |
  | **Adapt k2 h24 pb7** | −1.94 | −5.86 | +1.94 | **+4.00** | +2.63 |
  | Adapt k2 h12 pb7 | −3.44 | +0.17 | −6.17 | −2.42 | +2.63 |
  | Adapt k3 h24 pb7 | −4.21 | −2.61 | −2.56 | +1.22 | +1.84 |

  Fakty liczbowe (interpretacja → sesja analityczna):
  - Najlepsza per pula: mn-005 → pasywny±50 (+1.69) · mn-030 → pasywny±50 (+1.72) ·
    base-005 → pasywny±50 (+2.75) · base-030 → **adapt k2h24 (+4.00)** · cbbtc → sztywny±15 (+2.76).
  - ⚠️ **KOLUMNA base-cbbtc-005 W TABELI WYŻEJ JEST BŁĘDNA** — była liczona na
    ODWRÓCONEJ orientacji tokenów (znany błąd sekcji F: cfg miało token0=cbBTC d8/
    ethIsToken0=false; on-chain token0=WETH d18, token1=cbBTC d8). Fix (POOLS +
    oba meta.json) zrobiony przez Claude Code; **poprawione cbBTC 90d (vsHODL%)**:
    | HODL APR | full-range | ±50% | ±5% naiwny | ±15% naiwny | adapt k2h24 | adapt k2h12 | adapt k3h24 |
    |---|---|---|---|---|---|---|---|
    | **+7.9** | +0.02 | −0.05 | −8.56 | −0.21 | −0.20 | −0.20 | −0.13 |
    Wnioski PO korekcie: cbBTC/WETH 0.05% to łagodny reżim WZROSTOWY (HODL +7.9%),
    ale **fees znikome** ($3-4/90d na $10k ≈ 0.16% APR z fee) → **LP ≈ HODL**
    (najlepszy full-range +0.02). Teza "para skorelowana = dobra do LP" NIE broni
    się tu — za mały wolumen/fee. (Stare fees $291-836 były artefaktem złej skali.)
  - Gaz decyduje: aktywne wąskie działają na Base (gas$≈0), na mainnecie giną
    (mn-005 ±5% naiwny −21.0 vs HODL, 34 reb / $272 gazu).
  - Adapt k2 **h24 > h12** wszędzie poza mn-030 — spójne z wcześniejszym wnioskiem o histerezie.
  Bramka F1 (bić HODL 50/50): przechodzi ≥1 strategia na KAŻDEJ z 5 pul (na cbBTC
  już tylko marginalnie: full-range +0.02 po korekcie orientacji).

## C0. DO KONSULTACJI ZEWNĘTRZNEJ (Rafał, tydzień 25–31.08)

- [ ] **Szerokość zakresu LP i pomiar zmienności** — brief samowystarczalny
  w `PYTANIE-SZEROKOSC-I-SIGMA.md` (21.08). Do wklejenia innym modelom;
  zawiera pomiar błędu σ na 4 pulach, listę hipotez JUŻ ODRZUCONYCH
  (żeby konsultacja ich nie powtarzała) i 6 ponumerowanych pytań.
  Wynik konsultacji → wejście do decyzji 26.08 pkt 11 (albo przesunięcie
  decyzji, jeśli odpowiedzi otworzą nowy wątek). NIE zmieniamy do tego
  czasu ani `k`, ani estymatora, ani histerezy.

## C. PO ANALIZACH (sesja Fable — interpretacja)

- [x] **ALGORITHM.md v1 — ZAMROŻONE 11.08** (Fable + decyzja Rafała): selekcja
  7d+persyst.3d+majors; zakres k=3·σ·√7d (cbBTC k=2); trigger h24+payback≤7d;
  bezpiecznik trendu czysty exit(HL7d,5%); collect 8×gaz; portfel po rewizji
  cbBTC. Plik: ALGORITHM.md (ograniczenia w §8).
- [x] **Wdrożenie parametrów v1 do żywego bota — ZROBIONE** (v1.1 wdrożone
  12.08 [3c09ade], v1.2 HEDGE 17.08 [8f803c9]; advisorK per pula, EXIT_TREND,
  history.ndjson + /api/history, ObservationAnalysis w UI — wszystko chodzi
  na Windows; audyt listy 18.08). Oryginalny opis (historyczny):
  (sesja Fable — kod bot/)
  (+dopisane 11.08 wieczorem, decyzja Rafała ws. dashboardu obserwacji:
  (4) observer: append snapshotu co cykl 15min do `.bot/history.ndjson`
  {ts,poolId,price,volDaily,feeYieldDaily,rangeLo,rangeHi,emaGapPct};
  (5) server: `GET /api/history?hours=N` (tail pliku) + serwowanie
  `backtest/results/*.json` — frontend "Analiza obserwacji" już zlecony
  Sonnetowi, buduje z fallbackiem):
  (1) ADVISOR_PARAMS k 2→3 + per-pula override k=2 dla base-cbbtc-weth-005
  (pole w BotPool/botPools.ts); (2) bezpiecznik w observerze: stan EMA
  log-ceny per pula (HL7d) + propozycja EXIT_TREND gdy gap<−5% (OBSERWUJ:
  tylko propozycja+Telegram, człowiek zatwierdza w Rabby); (3) UI: karta
  propozycji EXIT_TREND u Sonneta (TASKS-UI).
- [~] **DECYZJA KAPITAŁOWA (→ Rafał) — pierwsze wejście LP wg ALGORITHM v1.2**:
  REKOMENDACJA FABLE GOTOWA 19.08 → **KAPITAL-REKOMENDACJA.md** (transza 1
  $6k Base [005 $2.5k + cbBTC $1.5k + $2k rezerwa], transza 2 do $12–15k
  po OBSERWUJ ~31.08; k2→k3 dla cbBTC do rozstrzygnięcia PRZED wejściem;
  pyłki: #953465 zamknąć przy tanim gazie, #953427 zostawić). Czeka na
  decyzję Rafała. Oryginalny opis:
  technicznie wszystko gotowe (pule zwalidowane, kokpit z [Otwórz →],
  propozycje na Telegramie, prognoza per reżim w UI) — brakuje tylko decyzji
  ile i gdzie. Kandydaci wg stanu walidacji:
  (a) **WETH-CBBTC 0.05 Base** — bramka PASS oba okna (82%/−1.8), selektor
  proponuje od 2 dni; UWAGA: obie nogi crypto = pełna beta (prognoza:
  down −85%… / up +72% na $5k — patrz forecast), to sleeve "correlated",
  nie rdzeń; (b) **base-005 / mainnet-005** — bramka pass (45d/60d),
  ETH/stable = połowa w stable; (c) **base-030** — bramka tylko z
  hedge-excess; wykonawczo hedge ręczny na GMX (przetestowany 17–18.08)
  albo poczekać na builder [Zatwierdź hedge]. Do decyzji też: kwota startowa
  (plan $5–25k), podział (portfel szkicowy z PAIRS.md: 40/25/20/15) i los
  pyłków mainnet #953427/#953465 (~$90 — zamknąć przy okazji?).
  PRZY WEJŚCIU w cbBTC rozstrzygnąć napięcie k2/k3 (CONTEXT 12.08: ALGORITHM
  v1.1 zamroził k=2 z single-runu, pełny walk-forward mówi k3>k2; prognoza
  w UI liczona profilem k3 — bot gra k2). Rekomendację szczegółową
  przygotuje Fable na życzenie.
- [ ] **Przegląd sygnałów bota z okresu OBSERWUJ** (po ~2 tyg. logów): trafność
  propozycji vs kryterium z ALGORITHM.md → decyzja o trybie PROPONUJ.
  Pomiar trafności selektora RUSZYŁ 18.08 (SELECTOR-LOG.md).
- [ ] Backfill: dzienne snapshoty rankingu Pool Scannera do SQLite (żeby za rok
  mieć własną, niezależną od DefiLlamy historię selekcji).

## E7. UNISWAP v4 / HOOKI — po kroku 1 (01.09): PRIORYTET W DÓŁ, krok 3 zawężony do Angstroma
> **AKTUALIZACJA 01.09 (Fable, krok 1 WYKONANY — szczegóły CONTEXT
> 01.09 ~10:xx):** v4 TVL ~$1.03 mld (nie $3.4B), Unichain $17M —
> rubryka Unichain ZAMKNIĘTA. Hooki = 31 pul / ~$10M TVL (≈1% v4);
> pule dynamic-fee na naszych parach martwe; Bunni $0, EulerSwap $0;
> jedyny żywy „obronny" hook: **Angstrom $6M TVL / $70M vol 7d** —
> niszowy, bez publicznego APY dla LP. v4 vanilla bez przewagi nad
> bliźniakami v3 (Base v3 wyraźnie lepsze). JEDYNY KONKRET:
> WBTC-CBBTC 0.01% v4 mainnet, wolumen 5–8× bliźniaka v3 → do
> lejka v2 (klasa pegged-BTC). Krok 2 (ramy ryzyka) bezprzedmiotowy
> do czasu istnienia kandydata; krok 3 zawężony do Angstroma;
> krok 4 WSTRZYMANY. Przegląd tematu: 24.09.
> Kontekst decyzji: lista zadań obecnego trybu (pasywny wide na v3) się
> wyczerpuje — samo granie wide da się robić ręcznie przez Uniswap UI +
> alerty push. Wartość trwała po naszej stronie: warstwa pomiarowa
> (księga/bilans/podatki) i maszyna badawcza — obie przenośne na v4.
> Teza: hooki dynamicznych fee / redystrybucji MEV to jedyna znana
> strukturalna szansa odwrócenia wyniku „LP przegrywa z HODL"
> (falsyfikacje 26–31.08 dotyczą zwykłych AMM bez obrony).
REKONESANS 31.08 (Fable, web): ekosystem realny — v4 TVL ~$3.4B
(maj 2026), tysiące pul z hookami, marketplace hooków + program $500M
(kwiecień 2026); wolumen głównie mainnet + UNICHAIN (nas tam nie ma —
osobna rubryka). Teza obrony LP oficjalnie głównym motywem v4
(dynamic fees, aukcje MEV → LP: Angstrom/Sorella; literatura LVR).
⚠️ LEKCJA BUNNI: flagowy hook zyskowności LP (podobno ~90% wolumenu
v4, „100× volume/TVL vs pula bez hooka") — EXPLOIT $8.4M (09.2025),
ZAMKNIĘTY (10.2025), zabrakło na audyty relaunchu. Hook = dodatkowy
smart kontrakt między nami a pieniędzmi; złożoność zabija.
- [ ] **KROK 1 — INWENTARYZACJA (bez kodu, dane świeże):** żywe pule
  v4 na naszych parach (ETH/USDC, ETH/BTC, klasy pegged) per sieć
  (mainnet/Base/Arbitrum/Unichain): TVL, wolumen 7/30d, jaki hook
  (dynamic fee / MEV-aukcja / vanilla), od kiedy żyje, audyty.
  Porównanie: realne fees/TVL puli v4 vs bliźniak v3 ta sama para/sieć.
  Źródła: DefiLlama (per-pool), HookRank/marketplace, explorery.
- [ ] **KROK 2 — RAMY RYZYKA (przed jakimkolwiek kapitałem):** twarde
  progi wejścia: hook żyje ≥6–12 mies., TVL ≥ $10M, audyty publiczne,
  brak admin-keys mogących ruszyć płynność (albo timelock), limit
  ekspozycji na hook (np. ≤25% transzy). Lekcja Bunni wprost.
- [ ] **KROK 3 — POMIAR:** czy LP w puli z obronnym hookiem faktycznie
  wychodzi lepiej vs HODL (nasza bramka!) — najpierw z danych
  publicznych puli (fee/TVL minus drag σ² — piętro 1 lejka v2 umie to
  policzyć, klasa „v4-hooked" do słownika klas), potem ewentualnie
  pozycja sondażowa małą kwotą (jak dziś: eksperyment ≠ strategia).
- [ ] **KROK 4 — NARZĘDZIA (dopiero po pozytywnym kroku 3):** fetch
  danych v4 (singleton PoolManager, inne eventy niż v3) + adaptacja
  backtestu. NIE budować przed dowodem, że jest czego szukać (lekcja
  v1.2: najpierw dane, potem kod).
- [ ] Rubryka osobna: UNICHAIN — czy nasze wejście tam ma sens
  (mosty, gaz, ryzyko młodej sieci) — dopiero jeśli krok 1 pokaże,
  że najlepsze pule żyją właśnie tam.
(Wpis w H „inwentaryzacja v4" — zastąpiony tym wątkiem, tam zostaje
odnośnik.)

## D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epizodu #5908083)
- [ ] observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN
      (zostaje pomiar epizodów + logi) — decyzja przeglądu 31.08.
- [ ] KOSMETYKA „k×σ" (3 kryjówki starej formułki): observer.ts:631
      (alert Telegram „pora rozważyć zwężenie do k×σ"), formatka
      Telegrama propozycji (zakres z „$" zamiast jednostki puli),
      src/components/cycleLine.tsx (etykieta „WĄSKI k×σ (flat)" →
      „WĄSKI ±5% (flat)" z productNarrowWidthPct).
- UWAGA: NIE wdrażać przed zamknięciem epizodu — pkt 1 zabiłby sygnał
  FLAT_WIDEN, na który czekamy.

## D. OPERACYJNE PRZYPOMNIENIA

- [x] Test fizycznego rebootu Windows — ✅ POTWIERDZONE (Rafał, 20.08: kilka
  restartów, usługi NSSM wstają same). POZOSTAŁO (Rafał, ręcznie w BIOS):
  ustawić auto-power-on po awarii zasilania (AC Power Loss → Power On /
  Restore Last State) — 19.08 komputer nie wstał sam po zaniku prądu.
- [~] TG_TOKEN/TG_CHAT → alerty Telegram: bot Telegram ZAŁOŻONY i PRZETESTOWANY
  17.08 (Rafał; sendMessage dochodzi na telefon, TG_CHAT=8712401405, token
  u Rafała — NIE do repo). POZOSTAŁO: wpisać oba do `C:\Projects\homos\.env`
  na Windows + `nssm restart homos-bot` (Rafał ręcznie albo CC-Win — token
  trzeba przekazać poza gitem, np. wkleić bezpośrednio w terminalu Windows).
- [ ] Poranne zadanie 8:00 "newsy → postawa ryzyka dnia" (zaplanowane zadanie
  Claude; użytkownik da znać kiedy utworzyć).
- [x] iPhone: Add to Home Screen (PWA) — ZROBIONE 19.08 (Rafał): apka na home screen, Rabby przez WalletConnect + API bota podłączone. Wymagało 3 fixów buildu/UI (dziennik CONTEXT 19.08 ~15:5x).
- [ ] **GMX: claim +$0.06 positive funding fees** (zakładka Claims na
  app.gmx.io, Arbitrum) — zostało po zamkniętym teście shorta 18.08.
  Odebrać przy okazji NASTĘPNEGO testu/pozycji na GMX (nie warto gazu
  specjalnie); przy okazji odczytać bieżący "Borrow Fee/Day" rynku
  ETH/USD do kalibracji modelu kosztów hedge.

## E. WDROŻENIA KODU (dla Claude Code / terminala)
- [x] **Selektor pul w bocie (NOWE, 2026-08-10)**: `bot/selector.ts` + zmiany w
  `bot/observer.ts` — ✅ (1) commit+push ZROBIONE (Claude Code, commit `4242221`,
  razem z builderem). Kontrakty importów zweryfikowane (config→BOT_POOLS/STATE_DIR;
  selector→runSelectorIfDue/SelectorProposal); selector.ts czysty w tsc; jedyny błąd
  tsc w observer to preexisting duplikacja typów viem (poza zakresem).
  POZOSTAJE PO STRONIE WŁAŚCICIELA (Windows): (2) `git pull` + restart `homos-bot`
  (nssm restart homos-bot), (3) test — obserwować `.bot/observer.log` po 8:00
  ("selector: ranking dnia — eligible…"). Selektor czyta data/llama/ (pipeline 07:30
  musi zbiec przed 8:00). UWAGA: wymaga data/llama także NA WINDOWS (pipeline tam pisze).
- [x] Commit+push `src/utils/rebalanceBuilder.ts` — ✅ ZROBIONE (w commicie `4242221`).
- [x] **Konsumenci UI Partii 4 — SCOMMITOWANE** (git ls-files potwierdza
  wszystkie 4 pliki + ForecastPanel; src/ czysty — audyt 18.08).
- [ ] Jednolinijkowy fix fetch-swaps: exit code != 0 przy FAILED puli (zgłoszone przez CC).
- [x] **Wdrożenie selector v1.1 na Windows — ZROBIONE** (12.08, raport CC-Win;
  selektor emituje ranking dnia i propozycje — potwierdzone na żywo 18.08).
- [x] **Commit prac UI Sonneta (P3/P4/4b) — ZROBIONE** (src/ czysty w git
  status; audyt 18.08).
- [x] **cbBTC/WETH 0.05% Base w bocie — ZROBIONE** (audyt Fable 18.08: wpis
  z blokerem był nieaktualny — wdrożenie v1.1 z 11.08 wykonało całość:
  quote:'WETH'+usdRefPoolId, observer/selektor/UI kompletne; dowód na żywo:
  propozycja OPEN 18.08 bez noty "spoza konfiguracji", pula widoczna w
  Prognozie zysku). Reszta = kosmetyka BotTelemetry (ewent. partia Sonnet).
- [x] **Windows nie miał data/llama (zgłoszone przez sesję Windows)** — data/ jest
  w .gitignore, dane NIE wędrują przez git; każda maszyna buduje własny cache.
  Rozwiązanie: `npm run fetch:llama` (lekki, same API — NIE pełny pipeline, żeby
  nie bić w darmowe RPC równolegle z nocnym grindem 365d na Macu) + del
  .bot\selector-state.json + nssm restart homos-bot. Od jutra pipeline 07:30
  odświeża llamę na Windows codziennie — problem jednorazowy (zimny serwer).
- [x] ⚠️ B5: liczby i interpretacja PONIŻEJ UNIEWAŻNIONE 11.08 (bug jednostek
  par WETH-owych w silniku; poprawiona wersja: sekcja A4 wyżej + CONTEXT 11.08
  "PRZEŁOMOWA"). Zostawione dla historii:
  **B5 WYNIK (WTAO-WETH mainnet 1%, 90.3 dni, 10 750 swapów — sesja Fable,
  backtest w kontenerze na zsynchronizowanym cache)**: HODL 50/50 **+74.9% APR**
  (reżim silnie wzrostowy WTAO). Pasywny full-range +77.5 (vsHODL +0.37, fees
  $124); pasywny ±50% +75.1 (vsHODL +0.01, fees $486 ≈ 19.7%/r fee-yield).
  WSZYSTKIE aktywne PRZEGRYWAJĄ z HODL: ±5% naiwny −33.8 p.p. (trend+gas $248),
  ±15% −15.4, adapt k2h24 −11.2, k3h24 −1.8. WNIOSKI: (1) nagłówkowe 79% apyBase
  NIE jest osiągalne dla LP — realny fee-yield szerokiej pozycji ~5–20%/r,
  wąska zbiera więcej fees ($1,316) ale umiera na IL od trendu (klasyczny LVR);
  (2) cały zysk puli to beta tokena (HODL +75%), nie fees — to zakład o WTAO,
  nie strategia LP; (3) filtr majors-only w selektorze POTWIERDZONY empirycznie.
- [~] **HyperSync fetcher — PRZYGOTOWANE przez Fable-desktop 11.08, zostaje
  wykonanie (CC-Mac + token od Rafała)**. Zrobione: (a) API zweryfikowane
  z docs.envio.dev (2026): `new HypersyncClient({url, apiToken})`, fieldSelection
  PascalCase — skrypt poprawiony (obsługuje też starą fabrykę .new/bearerToken);
  (b) `export const POOLS`/`export interface PoolCfg` w fetch-swaps.ts + GUARD
  `require.main === module` (bez niego import POOLS odpalał fetch RPC wszystkich
  pul!); (c) wpis testowy `base-weth-usdc-030-hstest` (90d, ta sama pula co
  cache referencyjny z RPC) w POOLS; (d) `scripts/compare-caches.ts` — porównanie
  1:1 w części wspólnej zakresów (per blok, multizbiór linii; self-test na
  base-weth-usdc-030: 583 493 linii, 303 555 bloków, exit 0); (e) fix wznowienia:
  hypersync-skrypt REUŻYWA startBlock/latest z istniejącego meta.json (przejęcie
  A2 nie przesuwa okna) i pisze meta na starcie świeżego fetchu.
  KROKI WYKONAWCZE:
  (1) Rafał: konto https://envio.dev/app → API Tokens → do .env na Macu:
      `HYPERSYNC_BEARER_TOKEN=...` (skrypt akceptuje też ENVIO_API_TOKEN);
  (2) CC-Mac: `npm i @envio-dev/hypersync-client`;
  (3) CC-Mac: `npx tsx scripts/fetch-swaps-hypersync.ts base-weth-usdc-030-hstest`
      (przy problemach z kształtem odpowiedzi: --debug);
  (4) CC-Mac: `npx tsx scripts/compare-caches.ts base-weth-usdc-030
      base-weth-usdc-030-hstest` → werdykt w konsoli (exit 0 = zgodne);
  (5) jeśli ✅: STOP grindu RPC A2 → `npx tsx scripts/fetch-swaps-hypersync.ts
      base-weth-usdc-030-365d` (state.json kompatybilny, wznowi od nextBlock;
      rano 09:10 było 39 634 570 ≈ 36%) → potem A3 (cbBTC 365d) i ewentualnie
      pule sekcji F; sprzątnąć pliki -hstest z data/cache;
  (6) jeśli ❌: wkleić raport rozjazdów do HANDOFF @Fable, grind RPC mieli dalej.

## F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10)
> Kontekst: screen "Earned $6,912 / 5.6d / $281k" = 3.1%/tydz. — realne dla
> ultra-wąskiego LP na parach spiętych (LST-ETH, stable-stable): brak IL w
> normalnych warunkach, koncentracja ×dziesiątki. Ukryte ryzyko: depeg (wąska
> pozycja skupuje spadający token). Testujemy WŁASNYM silnikiem tick-level.
- [~] **A: dane — ADRESY SPIĘTE I ZWERYFIKOWANE ON-CHAIN (CC-Mac, 11.08 ~13:00;
  token0()/token1() eth_call, lekcja cbBTC)**. POOLS +7 pul wypchnięte (commit
  6a834cf), fetch HyperSynciem 365d W TOKU (sekwencyjnie). Po fetchu → F.B.
  1. **mainnet-dai-usdt-001** = `0x48da0965ab2d2cbf1c17c09cfb5cbe67ad5b1406`
     (t0 DAI d18, t1 USDT d6) — top stable z rankingu (mean30d 7.4%,
     v/tvl7d 16.3, TVL $1.3M). Mała pula — nasze $10k ≈ 0.8% TVL, silnik
     i tak modeluje dodanie L.
  2. **arbitrum-usdc-usdt-001** = `0xbe3ad6a5669dc0b8b12febc03608860c31e2eef6`
     (t0 USDC **natywny** 0xaf88… d6, t1 USDT d6 — pula natywna istnieje,
     nie USDC.e) — tani gaz + v/tvl 9.7, mean30d 4.3%, TVL $1.4M (pierwsza
     pula Arbitrum).
  3. **mainnet-usdc-usdt-001** = `0x3416cf6c708da44db2624d63ea0aaef7113527c6`
     (t0 USDC d6, t1 USDT d6) — KONTROLA: duża ($33M), słaba w rankingu
     (mean30d 1.0%, v/tvl 2.7) — baza porównawcza dużej vs małej puli stable.
  4. **mainnet-wsteth-weth-001** = `0x109830a1aaad605bbf02a9dfa7b0b92ec2fb7daa`
     (t0 wstETH d18, t1 WETH d18) — jedyna żywa LST na v3 (mean30d 1.75%,
     v/tvl 3.5, TVL $5.3M); teza LST do potwierdzenia/odrzucenia tą jedną pulą.
  5. **mainnet-tbtc-wbtc-001** = `0x73a38006d23517a1d383c88929b2014f8835b38b`
     (t0 TBTC d18, t1 WBTC d8) — niespodzianka skanu: v/tvl7d 10.52 (rekord
     koszyka BTC), mean30d 3.0%, TVL $2.5M.
- [x] **B: backtest — ZROBIONE 11.08 (pegged.ts, oba modele fee maxL/endL,
  wyniki w backtest/results/pegged-*.json; interpretacja: CONTEXT dziennik
  11.08 ~15:40)**. Skrót netto/rok przy $10k: arb-usdc-usdt ±0.10% h24
  **+1.5–2.2%** (najczystszy, modele zbieżne); mainnet-dai-usdt +2.6…+46%
  (rozrzut = niepewność silnika); mainnet-usdc-usdt +1.4…+12 (kontrola OK);
  wsteth-weth **−2…+11 vsHODL** (konserwatywnie ujemne + pełna beta ETH).
  Rebalanse natychmiastowe wszędzie ujemne (chasing); histereza obowiązkowa.
  ✅ tbtc-wbtc DOMKNIĘTE 20.08 (Fable): QUOTE_REF_EXT w load.ts (referencja
  USD-za-WBTC z wbtc-usdc-030, jawny `assetIsToken0` — cfg.ethIsToken0
  referencji mówi o ETH, nie o WBTC). Wynik pegged.ts (132k swapów, 367d,
  $10k): HODL −44.7% APR (rok spadkowy BTC — sleeve to pełna beta BTC, nie
  parking USD!); najlepsze ±0.10–0.20% h=24h ledwie +2.0–2.3 p.p. vsHODL
  (fees $239–345/rok przy gas $32–104); wąskie bez histerezy MASAKRA
  (±0.05%: $9.6k gazu, −100%). Rekordowe v/tvl 10.5 NIE zmienia obrazu:
  dywidenda koncentracji istnieje, ale przy $10k to ~$200/rok za pełną
  ekspozycję kierunkową BTC. "3%/tydz" na v3 pegged: potwierdzone NIE
  ISTNIEJE. → F.C: rekomendacja "świadome NIE dla sleeve pegged" STOI,
  teraz z kompletem danych (ostatni kandydat policzony).
- [ ] **C: decyzja (→ Rafał)** — rekomendacja Fable po F.B: **świadome NIE
  dla sleeve'u pegged na v3** ("3%/tydz nie istnieje"; konserwatywnie 1–3%/r).
  Jedyny sensowny kandydat: mała pozycja arb-usdc-usdt jako parking kapitału.
  Werdykt tbtc-wbtc może jeszcze zmienić obraz (v/tvl 10.5 — jedyna pula
  z prawdziwą dźwignią koncentracji w koszyku).
- [ ] **Pool Scanner 2.0 — globalny skan koszyków (NOWE, na dysku)**:
  `npx tsx backtest/scan-universe.ts` (1 call do /pools, sekundy — może iść od
  ręki, nie koliduje z niczym). Klasyfikuje CAŁY rynek ≥$1M na koszyki
  (stable-stable / eth-lst / btc-btc / major-volatile / exotic), top-10 per
  koszyk w widoku "wykonywalne u nas" i "cały rynek" + dominujące projekty
  (czy np. aerodrome-slipstream zjada Base). Wyniki → sesja analityczna:
  (1) zasilenie sekcji F (które pule spięte fetchować tick-level),
  (2) decyzja, czy poszerzyć universe fetch-llama (MAX_POOLS/projekty),
  (3) docelowo: koszyki do selektora (ranking per koszyk zamiast globalnego).
  ✅ **ANALIZA ZROBIONA (Fable, 11.08, pełny scan-universe.json od CC)**:
  - stable-stable (55 pul): na v3 żyją DAI-USDT 0.01% (7.4%, v/tvl 16.3),
    USDC-USDT 0.01% Arb (4.3%), DAI-USDC/USDE-USDC (~3%, v/tvl 7-8); wielka
    USDC-USDT mainnet $33M tylko 1.0%. → lista F.A wyżej.
  - eth-lst (36 pul): v3 niemal MARTWE poza wstETH-WETH 0.01% (1.75%);
    curve dominuje TVL ($188M), akcja pegged na Base żyje na
    aerodrome-slipstream (CBETH-WETH CL1 4.1%) — poza mandatem v3.
  - Wniosek strategiczny: „3.1%/tydz jak u znajomego" NIE istnieje na
    uniswap-v3 w koszykach spiętych — topowe APR pegged są na
    aerodrome/curve/CEX-chainach. Na v3 sleeve spięty to realistycznie
    ~3-7% headline + dźwignia koncentracji (v/tvl 10-16 = jest z czego
    zbierać) — werdykt da dopiero tick-level (F.B), zwłaszcza netto po
    gazie mainnet przy $5-25k.
  - Do rozważenia później (nie teraz): czy selektor/backtest powinny
    objąć uniswap-v4 (USDE-USDC 0.00% $1.1M, WBTC-CBBTC 0.01%) — v4 wciąż
    świadomie odłożony (CONTEXT 2e).
- [ ] **BŁĄD KOLEJNOŚCI TOKENÓW cbBTC/WETH (wykryty 2026-08-11 przez telemetrię
  bota — cena $0)**: w puli 0x7AeA2E8A…6dabD1 token0=WETH (0x4200… < 0xcbB7…),
  a `scripts/fetch-swaps.ts` POOLS ma odwrotnie (token0Decimals: 8,
  ethIsToken0: false) — dotyczy `base-cbbtc-weth-005` ORAZ kopii `-365d`.
  Dane ndjson są SUROWE (poprawne!), błędna jest tylko interpretacja w cfg.
  Zadania CC: (1) poprawić oba wpisy POOLS (ethIsToken0: true, token0Decimals: 18,
  token1Decimals: 8), (2) poprawić pole cfg w data/cache/base-cbbtc-weth-005.meta.json
  (bez refetchu!), (3) przeliczyć `npx tsx backtest/run.ts base-cbbtc-weth-005`
  → kolumna cbBTC w tabeli 5 pul (B6) DO WYMIANY; wcześniejsze wnioski o cbBTC
  ("jedyny dodatni") do ponownej weryfikacji na poprawionej orientacji.
  Bot i UI już poprawione (bot/config.ts, src/config/botPools.ts) — po push+pull
  runnera wymagany restart homos-bot; weryfikacja: telemetria pokaże cbBTC
  ~$60–70k zamiast $0.

## H. POMYSŁY NA PRZYSZŁE MODUŁY (backlog pomysłów — nie w budowie)

- [✓ zbadane 31.08 — NIE GRAMY] **tBTC/WBTC (pegged-BTC)**: edge
  potwierdzony (~0.5–0.8%/r w BTC; fullperiod+walkforward+apyBase
  zgodne), pojemność OK ($3.3M TVL), ALE: pełna beta BTC (okres testu
  HODL −34%) + ogon depegu tBTC (dyslokacje 6–7% w danych; permanentny
  depeg mostu = utrata większości przy ±1%). 0.7%/r nie płaci za ogon.
  Klasa pegged-BTC zostaje w lejku v2 — kandydat cbBTC/WBTC (custody
  zamiast mostu). Pełne tabele: HANDOFF/git 0dbdf72, CONTEXT 31.08.
- [ ] **SILNIK: in-range liczone po swapach, nie po czasie** (flaga
  CC-Win 31.08 przy tBTC): epizody o małej liczbie swapów (depeg,
  niska płynność) są niedoważone w metryce czasu-w-zakresie. Poprawka
  time-weighted przy najbliższej pracy w backtest/** — nie zmienia
  dotychczasowych werdyktów (tam decydowały średnie vsHODL).

- [ ] **GM POOLS (GMX v2) — KLASA „DOM KASYNA"** (pytanie Rafała 31.08).
  Struktura: LP = kontrpartner traderów z dźwignią; zarabia fee+borrow+
  straty traderów, traci gdy traderzy wygrywają; wycena po ORAKLACH →
  brak klasycznego LVR/arbitrażu (strukturalnie inna klasa niż AMM!),
  w zamian ryzyko ogona „gracz rozbija bank" + ~50% bety koszyka.
  BADAĆ TYLKO duże rynki (ETH/USD, BTC/USD GM; TVL ≥ $10M) — górne
  wiersze rankingów APY to pule-groszaki (108% na $1.8k TVL = szum).
  Kolumna uczciwa: annualized PERFORMANCE, nie FEE APY (GMX/USD:
  fee 18.2% vs perf. 2.3% — różnica = wygrane traderów + beta).
  TEST NASZĄ BRAMKĄ: realized performance GM minus beta koszyka vs
  HODL koszyka, możliwie długa historia (DefiLlama ma serie per pool).
  Bonus operacyjny: GMX już w stacku (venue hedge, EMERGENCY.md).

- [→E7] **UNISWAP v4 — INWENTARYZACJA HOOKÓW** — AWANSOWANE 31.08 po
  południu do aktywnego wątku E7 (decyzja Rafała: „jak najszybciej"). Kontekst: skan wide 31.08 pokazał, że na zwykłych pulach
  ETH/stable LP przegrywa z HODL wszędzie — mechanizm (adverse
  selection arbitrażu) siedzi w konstrukcji AMM, więc v4 z pulami
  vanilla NIC nie zmienia. JEDYNA strukturalna nadzieja: hooki
  **dynamicznych opłat** (fee rośnie przy zmienności → płacą
  arbitrażyści) i konstrukcje przechwytujące zysk arbitrażu dla LP.
  KROK 1 (tani, zanim dotkniemy kodu): inwentaryzacja — które pule
  v4 dla naszych par (ETH/USDC, cbBTC/WETH, klasy pegged) mają
  REALNY wolumen/TVL, jakie hooki, fee/TVL na tle naszych v3;
  świeże dane (DefiLlama/explorer), nie pamięć modelu. Zastrzeżenia:
  wyższe fee może wypychać wolumen; cały nasz warsztat
  (fetch/backtest/pozycje) jest v3-only — pełne badanie = duży koszt,
  więc najpierw dowód, że jest czego szukać. Łączy się ze scoringiem
  lejka (v4-z-hookami jako osobna klasa pul).

- [ ] **SQLITE DLA LOGÓW/PAPER (pomysł Rafała 18.08)** — SCHEMAT
  ZAPROJEKTOWANY: **DB-SCHEMA.md** (zasady rozszerzalności: migracje
  numerowane, raw-bigint jako TEXT, JSON1 na płynne ładunki, słowniki
  jako tabele; DDL v1: pool/venue/pool_snapshot/proposal/selector_ranking/
  paper_sample/paper_event/position/tx/backtest_run + widoki). Do
  implementacji wg §4 dokumentu. Reszta opisu: warstwa zapisu BEZ
  zmian (ndjson append-only, crash-safe), NOWY krok pipeline'u 07:30 —
  import przyrostowy do `data/homos.db` (better-sqlite3): history.ndjson,
  paper-history/events, proposals, SELECTOR-LOG. Zysk: zapytania w poprzek
  czasu (trafność selektora vs walidacje!), agregacje pod UI, retencja,
  fundament pod księgowość podatkową przy realnym kapitale (decyzja
  2026-08-10 „SQLite+CSV" — to jej realizacja). Backup łapie plik .db
  automatycznie. Wykonanie: Fable (schemat+skrypt) + CC-Mac (commit) +
  CC-Win (krok w pipeline).
- [ ] **DOCKERIZACJA JAKO ARTEFAKT (pomysł Rafała 18.08)**: Dockerfile +
  docker-compose (homos-bot, homos-server; wolumeny .bot/ i data/; .env
  przez env_file) W REPO, budowane/testowane na Macu — na Windowsie NADAL
  natywnie NSSM (Docker Desktop/WSL2 = 1–2 GB RAM narzutu, zbędny koszt
  na obecnym sprzęcie). Cel: przyszły deploy na VPS = docker compose up.
  PRZY przenosinach (nie teraz) do decyzji: model zaufania VPS —
  ekspozycja API (firewall/WireGuard), sekrety (BOT_API_TOKEN/TG/HyperSync
  poza obrazem), backup wolumenów.

- [ ] **ZATWIERDZANIE Z TELEFONU + PUSH (pomysł Rafała 17.08)**: pełna pętla
  "zagrożenie/okazja → push na telefon → podpis w Rabby mobile w minutę".
  NAJTAŃSZA ŚCIEŻKA (większość już istnieje — bot 24/7 to jest ten backend):
  1. [tani, od zaraz] AKTYWOWAĆ Telegram: wpisać TG_TOKEN/TG_CHAT w .env na
     Windows (kod alertów JUŻ jest w observerze — sekcja D kolejki!) —
     natychmiastowe pushe o każdej propozycji;
  2. [1 partia Sonnet] link w wiadomości TG → karta propozycji w PWA
     (deep-link {base}/?proposal=<id>; iPhone przez VPN — rozważyć WireGuard
     on-demand, żeby VPN wstawał sam);
  3. [1 partia Sonnet + config] WalletConnect w wagmi/connectkit obok
     injected — na telefonie [Zatwierdź] otwiera Rabby mobile do podpisu
     (te same buildery transakcji, zero zmian w logice);
  4. [opcjonalnie] web-push z PWA (iOS ≥16.4 wspiera dla zainstalowanych
     PWA) zamiast/obok Telegrama.
  Zasada bez zmian: człowiek podpisuje KAŻDĄ transakcję (to jest tryb
  PROPONUJ w wersji mobilnej, nie automat); backend niczego nie wykonuje sam.

- [ ] **PORTFEL SPRZĘTOWY (pytanie Rafała 17.08 — wykonalne bez zmian w kodzie)**:
  Ledger/Trezor podpinany PRZEZ Rabby (Add Hardware Wallet) — klucz zostaje
  na urządzeniu, każdy podpis = fizyczny guzik; aplikacja/bot bez żadnych
  zmian (wagmi→Rabby→Ledger; BOT_WATCH_ADDRESS to jedna zmienna). Docelowa
  architektura: kapitał LP na sprzętowym + osobny mały portfel operacyjny
  (hot) wyłącznie pod przyszły automat hedge'a. Przy wdrożeniu pamiętać:
  blind signing dla multicalli (kompensowane podglądem Rabby), migracja
  pozycji = transfer NFT albo zamknij-otwórz z nowego adresu.

- [~] **AUTOMATYZACJA HEDGE (plan 3-stopniowy, zaakceptowany kierunkowo 17.08)**:
  (1) TERAZ: propozycja + ręczny GMX (faza testów). (2) NASTĘPNY KROK
  BUDOWLANY — **builder ZROBIONY 20.08 (Fable) i PRZETESTOWANY E2E NA
  ŻYWO tego samego dnia (Rafał, $15)**: `src/utils/hedgeBuilder.ts` +
  Partia 9 UI — pełna pętla open→keeper→close→zwrot środków przeszła
  przez apkę bez błędu (szczegóły CONTEXT 20.08 ~wieczór; po drodze
  naprawiony receipt-wait w useHedgeExecution). Krok 2 planu = GOTOWY
  WYKONAWCZO; bezpiecznik hedge-excess base-030 przestaje zależeć od
  fallbacku EXIT_TREND. Następny etap (3, auto po okresie PROPONUJ) bez
  zmian — osobna decyzja. (3) AUTO po okresie PROPONUJ: preferencyjnie Hyperliquid
  agent-wallet (klucz może handlować, NIE może wypłacać — ograniczony promień
  rażenia) albo osobny portfel operacyjny GMX na Windows (DPAPI, tylko margin
  hedge'a); twarde limity w kodzie (max notional, max zleceń/dzień,
  kill-switch). Hedge = najlepszy kandydat na pierwszą automatyzację
  projektu: mała kwota, 1×, obiektywny sygnał, ograniczona strata,
  koszt spóźnienia realny.

- [ ] **MODUŁ SHORTÓW KIERUNKOWYCH (pomysł Rafała, 17.08)**: małe kwoty
  shortowane na samym krypto (ETH/BTC perp na GMX/Hyperliquid) na sygnale
  trendu — de facto handlowanie SAMYM sygnałem bezpiecznika (EMA7d, próg −5%,
  min. tygodniowa obserwacja), bez nogi LP. PRZESŁANKI ZA (z danych F4):
  hedge-full w oknach down +6…+10 p.p. przy 83–100% trafień; detektor już
  zwalidowany; funding historycznie sprzyja shortom (+2.9%/r). ZASTRZEŻENIA
  (uczciwie): (a) to inna klasa ryzyka niż LP — czysty zakład kierunkowy;
  w oknach up/flat sygnały fałszywe krwawią (hedge-full: up ujemny wszędzie,
  mainnet-seria pokazała podatność na whipsaw); (b) wynik całoroczny
  hedge-full był zawyżony spadkową próbką — moduł wymaga WŁASNEJ bramki
  (backtest: strategia short-na-sygnale vs cash, walk-forward per reżim —
  silnik ma już wszystkie klocki: detektor, funding, taker; tani do
  policzenia); (c) sizing: sleeve ≤5–10% kapitału, zawsze 1×, nigdy
  lewarowane; (d) wykonawczo: to samo venue co hedge (GMX), więc moduł
  naturalnie dziedziczy infrastrukturę F4-op. KROK PIERWSZY (gdy wrócimy):
  backtest czystego shorta-na-sygnale na naszych seriach 365d — werdykt
  liczbami zanim powstanie jakikolwiek kod produkcyjny.

## G. ULEPSZENIA INFRASTRUKTURY KOLEJKI (backlog, niepilne)
- [ ] Runner: opcjonalne załączanie wskazanych plików wyników do commita
  (backtest/results/ jest gitignored — dziś wraca tylko ogon konsoli w done/;
  pole "attach": ["backtest/results/scan-universe.json"] w zadaniu → runner
  kopiuje do .agent-queue/artifacts/<id>/ i commituje razem z done).
- [ ] Runner: auto-restart homos-bot gdy pull zmienił bot/** (wymaga nadania
  kontu usługi prawa do zarządzania usługą, np. sc sdset — inaczej ręcznie).
- [ ] Zadanie 8:00 "newsy → postawa ryzyka dnia" (sekcja D) — do utworzenia
  w NOWEJ sesji chmurowej (create_trigger), gdy przejmie koordynację.
- [x] Pool Scanner 2.0 przez kolejkę: manual-20260811-scan2 exit 0 — ogon
  z tabelami w .agent-queue/done/ (ANALIZA WYNIKÓW: sesja Fable, zasila F).
  ODBIÓR CZĘŚCIOWY (Fable-desktop 11.08): outputTail UCIĘTY — brakuje CAŁEGO
  koszyka stable-stable i większości eth-lst (dokładnie tych, których F
  potrzebuje). Pełne tabele: czeka na `npm run scan` u CC-Mac (w jego HANDOFF;
  sandbox Fable nie sięgnie do DefiLlamy — proxy 403). Z dostępnej części:
  (a) BTC-BTC: **TBTC-WBTC 0.01% mainnet — v/tvl7d 10.52** (rekordowa
  koncentracja wolumenu w koszyku, APR 3.0%, TVL $2.5M) — mocny kandydat
  do fetch tick-level w F.A obok wstETH-WETH i USDC-USDT; reszta koszyka
  martwa (v/tvl ≤1.85). (b) major-volatile potwierdza selektor: WETH-USDC
  0.3% Base 42.7% APR (v3, $113M) top wykonywalnych; USDC-WETH 0.01% mainnet
  v/tvl7d 37.27 — ciekawostka zbieżna z propozycją OPEN selektora z 11.08.
  (c) eth-lst (ogon): dominacja curve-dex $189M TVL — pule v3 do potwierdzenia
  w pełnym wyniku.

## E. PLAN BADAŃ PO WEJŚCIU PRODUKCYJNYM (Fable + Rafał, 27.08 wieczór)
> Rama: gramy hybrydą FlatWide (szeroki pasywny + zwężenie w potwierdzonym
> flacie) na 2 pulach Base. Z ~40 przebiegów 26-27.08 wiemy: beta dominuje,
> różnice strategii to ±2% kapitału, jedyna stabilna przewaga = fees przy
> szerokim zakresie + potencjalny uplift z flat-zwężenia (nigdy nie grany
> na żywo). Badania mają służyć TEMU podejściu, nie szukać nowego.

### E1. ZAMKNIĘTY 31.08 (przegląd): COMPARE_HL_D odebrany — kotwica bez zmian (HL7d); strojenie detektora pod zwężanie bezprzedmiotowe po falsyfikacji 720d. Kandydat HL5d-tylko-cbBTC w E5 na wypadek powrotu. Szczegóły: CONTEXT 31.08. (oryginalny tytuł: wycena FLAT_ENTER zanim pierwszy raz go podpiszemy)
- [x] **Analiza flat-okien historycznych** — skrypt `backtest/flatwindows.ts`
  (Fable 27.08 wieczór), policzony na 365d (stale cache Maca):
  base-030: 14 epizodów/rok, mediana 3.9d, 22% czasu we flat;
  cbBTC/WETH: 14/rok, mediana 15.6d, **62% czasu we flat**.
  720d + świeży cache → CC-Win (zlecone).
- [x] **Expected value zwężenia** — w tym samym skrypcie (koszt $6×2,
  share liczony z realnego L puli per swap): base-030 ΣEV $105/rok na
  $2.5k (+4.2%/r ekstra), EV>0 w 9/14 epizodów, PRÓG ≥2.1 dnia;
  cbBTC ΣEV **$290/rok** (+11.6%/r!), PRÓG ≥7 dni (mediana flatu 15.6d
  i tak wyższa). WNIOSEK OPERACYJNY: zwężanie na cbBTC = rdzeń wartości
  hybrydy; na base-030 podpisywać wybiórczo (połowa flatów za krótka).
  Weryfikacja na 720d u CC-Win.
- [x] **Sweep parametrów flat-detektora** — CC-Win 27.08 na
  base-030-720d (flatwindows, jeden parametr naraz): CONFIRM_H=12
  NAJLEPSZY (ΣEV $297 vs $92 baseline, 2× więcej epizodów, jakość
  bez zmian), ENTER=3% podobnie (+160%), HL_D=5 dobry (+150%),
  **HL_D=10 jedyny na minusie — odrzucony**. ZASTRZEŻENIE: jedna
  pula → cross-check CONFIRM_H=12 i HL_D=5 na cbBTC-720d zlecony;
  jeśli potwierdzi, CONFIRM_H=12 wchodzi do spec FLAT_ENTER
  (decyzja formalna: przegląd 1.09). Flatwindows 720d ogólnie:
  kierunek 365d potwierdzony, cbBTC ΣEV ~$205/rok vs base-030
  ~$46/rok (4-5×).

### E2. POMIAR ŻYWEGO PRODUKTU (od dziś, automatycznie)
- [ ] **Realized vs backtest**: dzienna linia w raporcie porannym per
  pozycja: fee yield zrealizowany (Δ nieodebranych) vs feeYieldDaily
  advisora vs założenie z backtestu (~15%/r base-030, ~4%/r cbBTC
  szeroko). Rozjazd >2× przez tydzień = sygnał do przeglądu.
- [ ] **Odliczanie do flat**: gap i prognoza dni-do-|gap|<2% (przy
  stałej cenie) w raporcie porannym dla obu pul produktowych.
- [ ] **Koszt zwłoki podpisów** (decyzja 26.08): mierzyć od 1. propozycji
  produktowej (FLAT_ENTER/EXIT) — różnica wyceny moment-propozycji vs
  moment-podpisu. Przegląd po 2 tyg.

### E3. TOP 10 / SELEKTOR — przestawić na metrykę produktu
- [ ] **HYBRID-SCORE zamiast headline APY (doprecyzowanie Rafała 27.08:
  "szukać pul o gorszym APY, które lepiej zarobią naszym stylem").**
  Ranking = iloczyn trzech składników, wszystkie liczalne nocnym
  pipeline'em z danych, które już mamy (Llama: fees/TVL/volume/ceny
  dzienne; swapy dopiero na etapie lejka):
  1. **wide-yield**: realny yield pasywnego ±50% = fees24h/TVL z
     korektą na rozkład płynności (nie headline apyBase topu, który
     premiuje wąskie koncentracje w zmiennych pulach);
  2. **flat-share**: % czasu w flacie wg definicji PRODUKTU (|gap
     ceny do EMA HL7d|<2%) na serii dziennej 365d — im więcej flatu,
     tym większy uplift ze zwężania;
  3. **range-survival**: czy cena została w ±50% przez ostatnie
     365/720d (binarnie/karnie) — część passiveW nie może wypadać;
  plus filtry twarde jak dziś: TVL≥min, persystencja wolumenu (kara
  za spike'i incentive-farmingu), sieć z tanim gazem.
  Wdrożenie: liczyć OBOK obecnego rankingu APY przez ~miesiąc
  (kolumna w selector-ranking + raporcie), porównać listy, potem
  decyzja Rafała o przepięciu eligible. Kandydat z hybrid-score →
  lejek (fetch swapów + WF_SET=hybrid) → paper hybrydą → dopiero
  propozycja realna.
- [ ] **Auto-lejek: bramka rodzinami produktowymi** — kandydat PASS/FAIL
  wg WF_SET=hybrid (FlatWide + passiveW + FlatOnly-HODL, kryteria z
  rundy finałowej), nie wg odrzuconego profilu v1.2 "Adapt k=3+trend".
  DOPRECYZOWANIE (Rafał 27.08 wieczór, słusznie: "top 10 trzeba
  odświeżyć, bo badania są pod stare algorytmy"): (a) werdykty
  dostają pole `algo` ('v1.2' | 'hybrid-v1'); (b) wszystkie
  istniejące FAIL-e v1.2 → status "stare kryteria, do rewalidacji"
  (NIE blokują topu do czasu przeliczenia); (c) nocny skan hybrydą
  27/28.08 zasila pierwsze werdykty hybrid-v1; (d) UI: badge przy
  statusie w rankingu pokazuje profil werdyktu (Sonnet, przy 13b/14).
  Implementacja bot-side (candidates.ts + funnel): Fable, następna
  sesja.
- [ ] **Paper trading hybrydą na kandydatach TOP10**: nowa pula przechodzi
  lejek → gra hybrydę w paper 2-4 tyg. zanim dostanie propozycję realną.
  Paper v1.2 na obecnych 6 pulach zostaje jako kontrola A/B.

### E3b. PROCEDURA AWARYJNA (decyzja Rafała 27.08 — "dopiszmy")
- [ ] **"Czerwony przycisk" w kokpicie + EMERGENCY.md**: przy sygnale
  DOWN dwie opcje obok siebie z aktualnymi kwotami: (a) hedge GMX
  1-podpisem (delta-neutral, LP zostaje — preferowany wg danych:
  hedge tylko-w-down chronił 66-87% okien down), (b) exit do USDC
  (oznaczony "dane mówią: zwykle nie podpisuj — exit na trendzie
  średnio pogarsza"). Doc: kiedy co, koszty, kolejność kroków,
  niuans czujnika (DOWN na cbBTC/WETH = cena względna; krach USD
  wykrywa sygnał WETH/USDC). Bot-side: Fable; UI: partia u Sonneta
  po spec.

### E4. PRZEGLĄDY (kalendarz)
- [ ] **24.09 — WYJŚCIE Z LP (decyzja Rafała 02.09, CONTEXT §2)**: obie
  pozycje produktowe → USDC → off-ramp (Kraken, procedura 25.08) → ETF.
  Niezależnie od kursu. WCZEŚNIEJ: bilans transzy ≥ +5% (≥ $6 397) →
  wyjście od razu (monitoring ręczny, dzienny). Przed 24.09 do
  rozstrzygnięcia tylko: czy pełne przebiegi (Piętro 2) / runda 2
  kształtu / Aerodrome cbBTC pokazują coś, co zmienia obraz — jeśli
  nie, zasada stoi. Agenda 24.09 = benchmark HODL+yield + decyzja, co
  dalej z maszyną badawczą (wartość = pomiar + wiedza).
- [ ] **31.08 (poniedziałek — termin ustalony przez Rafała 29.08;
  wcześniejsze „1.09" było pomyłką kalendarzową)**: przegląd PROPONUJ
  (zaplanowany 26.08) + pierwszy tydzień
  produktu (realized fees, gap-tracker, incydenty UI).
  **✅ PRZEGLĄD ODBYTY 31.08 rano — komplet decyzji w CONTEXT
  (dziennik 31.08): bramka=walkforward, detektor→pomiar (po epizodzie),
  E1 zamknięty, σ tylko bot, EKSPERYMENT zwężenia cbBTC (podpisujemy
  dzisiejsze FLAT_NARROW wg protokołu), lejek→przebudowa na metrykę
  wide (pilot u CC-Win), transza 2 = snapshot sald. Punkt zwężania
  domyka się po zamknięciu epizodu eksperymentalnego.**
  PACZKA DECYZYJNA parametrów FLAT_ENTER (komplet policzony 27-28.08,
  flatwindows 720d, ΣEV zwężania vs baseline ENTER=2%/24h/HL7d):
  | wariant | cbBTC-720d | base-030-720d | werdykt wstępny |
  |---|---|---|---|
  | baseline (2%/24h/7d) | $400 (25 ep., EV>0 68%) | $92 | zamrożone dziś w produkcie: 2%/12h/7d |
  | CONFIRM_H=12 solo | $452 (+13%) | $297 (+223%) | WDROŻONE 28.08 |
  | HL_D=5 solo | $473 (+18%) | $230 (+150%) | czeka |
  | **12h+5d razem** | **$558 (+39.5%)** | **$347** | KUMULUJE SIĘ — główny kandydat |
  | 12h+5d+ENTER=3% | $556 (≈0%, EV>0 spada 66→58%) | $413 (+19%) | NIE globalnie; ew. per-pula base-030 |
  Rekomendacja Fable na przegląd: przyjąć CONFIRM_H=12+HL_D=5 (HL_D
  wymaga drugiej EMA w observerze — osobna od EMA7d trendu), ENTER
  zostaje 2% globalnie (3% psuje jakość epizodów na cbBTC — a tam
  jest rdzeń wartości zwężania), opcjonalnie ENTER=3% per-pula na
  base-030 (+19%). Decyzja Rafała.
  DOSZŁO NA AGENDĘ 29.08 (poza parametrami flat):
  - **⚠️ NAJWAŻNIEJSZE: szerokość zwężenia w modelu ≠ w produkcie.**
    Cała wycena zwężania (E1, tabela E4, ΣEV $558 itd.) liczona jest
    `flatwindows.ts` z ustaloną szerokością wąskiego pasma:
    **±8% domyślnie, ±6% dla cbBTC** (`NARROW=0.06` w zleceniach).
    Produkt zwęża natomiast do `k × σ × √7` — a na żywych danych
    z 29.08 wieczór (już grid15) to: base-030 σ 2.450%/d → **±19.4%**,
    cbBTC σ 2.978%/d → **±15.8%**. Czyli 2.3–2.5× SZERZEJ niż model.
    Przyrost fee skaluje się ~1/szerokość, więc realne EV zwężania to
    ok. **40–43% tego, co pokazuje paczka decyzyjna E4**. Modelowe
    szerokości wymagałyby σ ~1.0–1.1%/d, czyli reżimu 2–3× spokojniej
    szego niż dzisiejszy. DO ROZSTRZYGNIĘCIA 31.08: (a) czy zwężamy
    stałą szerokością (jak w modelu) zamiast k×σ, (b) czy zostajemy
    przy k×σ i przeliczamy E1/E4 tą samą formułą (uczciwsze, ale to
    nowe przebiegi), (c) czy próg „epizod musi potrwać ≥5d/≥2d"
    trzeba podnieść proporcjonalnie. Do tego czasu: propozycja
    FLAT_NARROW niesie własny `paybackDays` liczony z realnego L
    i fee-yieldu — TO jest liczba do sprawdzenia przed podpisem,
    nie tabela z E4.
    **ROZSTRZYGNIĘTE CZĘŚCIOWO 29.08 wieczorem** (uwaga Rafała:
    „gap 2%, wyjście 5%, a zakres 11%+ — to się nie trzyma kupy").
    Produkt NIE używa już k×σ×√7 do zwężania: nowe pole
    `productNarrowWidthPct`, bo pasmo szersze niż próg wyjścia to
    płynność, do której cena nie dojdzie — FLAT_WIDEN pada wcześniej
    (przy ±16% już po 32% drogi do krawędzi).
    **SZEROKOŚĆ ROZSTRZYGNIĘTA EMPIRYCZNIE 29.08: ±5% NA OBU PULACH**
    (= FLAT.exitGap, czyli jedna reguła α=1.0 zamiast dwóch liczb
    z env). Sweep: 365d (Fable) + 720d (CC-Win, 8 przebiegów).
    ΣEV zwężania na 720d — cbBTC (32 epiz., med 7.7d): ±4% $827 /
    ±5% $623 / ±6% $452 / ±8% $223, in-range 92.8 / 97.7 / 98.8 /
    99.9%; base-030 (45 epiz., med 2.4d): ±4% $1123 / ±5% $847 /
    ±6% $620 / ±8% $297, in-range 92.5 / 97.6 / 99.4 / 100%.
    ΣEV rośnie MONOTONICZNIE w stronę węższych pasm (brak maksimum
    w 4–8%) — ogranicza nas wypadanie z zakresu, nie EV. Okno
    z bullem nie obala wyniku, wzmacnia: przewaga ±5% nad ±8%
    rośnie z 2.3–2.7× (365d) do 2.8–2.9× (720d). Próg opłacalności
    epizodu na cbBTC: 1.6 dnia przy medianie 7.7d.
    **⛔ OBALONE TEGO SAMEGO DNIA (29.08 ~15:xx) — bramka 720d.**
    Walkforward `WF_SET=product` + fullperiod 720d na OBU pulach:
    Pasywny szeroki bije FlatOnly ±5% wszędzie — %wygr. 63 vs 43
    (cbBTC) i 60 vs 45–47 (base-030), fullperiod $3280 vs $2983
    i $3881 vs $2759 — a w SAMYM reżimie flat, gdzie zwężanie ma
    grać: 86% vs 59% (cbBTC) i 19/19 vs 12/19 okien (base-030).
    MECHANIZM: zwężanie zarobiło 4× więcej fee ($2169 vs $541;
    $3147 vs $1354) i mimo to skończyło niżej — IL z re-centeringu
    (65 i 88 rebalansów) zjadł ~$1.9k i ~$2.9k ponad przyrost fee.
    DLACZEGO NIE WYSZŁO WCZEŚNIEJ: `flatwindows` liczy ΣEV zwężania
    z jawnym założeniem „IL we flat pominięty (symetryczny, mały)" —
    założenie FAŁSZYWE, i to ono napędzało cały sweep. 365d (sweep
    i fullperiod) schlebiał zwężaniu, 720d obalił — ten sam wzorzec
    co przy hedge'u 26.08.
    NA 31.08: (a) decyzja, czy zwężanie w ogóle zostaje w produkcie
    (kandydat do E5), (b) jeśli zostaje — `flatwindows` wymaga
    przepisania tak, żeby liczył IL, inaczej to narzędzie będzie
    dalej produkować mylące EV, (c) przy okazji: skoro Pasywny
    szeroki wygrywa także w flat, wraca pytanie, czy detektor flatu
    jest do czegokolwiek potrzebny poza procedurą awaryjną.
    **⚠️ ZNALEZIONE PRZY TEJ ZMIANIE — NAJWAŻNIEJSZE NA 31.08:
    dwa nasze narzędzia mierzyły DWA RÓŻNE produkty.**
    `walkforward` z `WF_SET=hybrid` (przebieg, na podstawie którego
    weszliśmy kapitałem: cbBTC śr. +0.48 / 65% / worst −1.14) używa
    `flatOnlyLP`, gdzie wąskie pasmo liczy się jako
    `k × σ × √horizonDays` z `horizonDays: 7` — czyli DOKŁADNIE
    tego k×σ×√7, które właśnie usunęliśmy z produktu.
    `flatwindows` (E1/E4, ΣEV zwężania) liczy pasmo STAŁE ±6/8%.
    Czyli: do 29.08 produkt zgadzał się z walkforwardem, a nie z E1;
    od 29.08 zgadza się z E1, a nie z walkforwardem. Żadna z wersji
    nie jest dziś potwierdzona OBOMA narzędziami.
    ZADANIE NA PONIEDZIAŁEK: dodać stałą szerokość wąskiej nogi do
    `flatOnlyLP` (nowa opcja, np. `narrowWidth`) i przepuścić
    `WF_SET=hybrid` z tą samą szerokością, którą gra produkt —
    dopiero wtedy bramka wielookienna i EV epizodów mówią o tym
    samym. Sweep NARROW z flatwindows daje kandydata na szerokość;
    walkforward mówi, czy ta szerokość nie psuje wyniku w skali
    całych okien (m.in. dlatego, że wąskie pasmo częściej wypada
    z zakresu i łapie IL na wyjściu z flatu).
  - **σ: zakres docelowy grid15**. 29.08 wieczorem ustawiliśmy
    `SIGMA_MODE=grid15` TYLKO dla usługi homos-bot (przed pierwszym
    zwężeniem). Do decyzji: czy grid15 obowiązuje też nocny pipeline
    i lejek (wtedy `.env`/machine-wide + podbicie `ALGO_VERSION`
    w `scripts/candidate-funnel.ts` i retest kandydatów), czy lejek
    w ogóle ma sens w świecie hybrydy — bo dziś bramkuje strategią
    v1.2, której nie gramy. Podbicie ALGO_VERSION świadomie
    odłożone z 29.08: wymusza retest strategią porzuconą.
  - **UI liczy własną σ w przeglądarce** (`process.env` tam nie
    istnieje), więc „Doradca ±X%" zostaje na estymatorze swap i po
    zmianie z 29.08 pokaże inną szerokość niż bot. Fix: UI czyta
    `pools[].suggestion` ze state zamiast liczyć samodzielnie —
    ta sama klasa co `advisorK` (naprawiony 28.08).
  - **UI po obaleniu v1.2**: (a) tabela walkforward w „Analizie
    obserwacji" czyta pliki `-365d-45d` ze strategią v1.2 — wymienić
    na przebiegi hybrydy (WF_SET=hybrid, 720d) czy wyciąć? (b) kolumna
    „Doradca" w Telemetrii mówi językiem v1.2 (IN_RANGE_HOLD/REBALANCE)
    — przestawić na posturę + stan flatu? („Prognoza zysku" już
    usunięta, guard REBALANCE na pulach produktowych wdrożony.)
  - **Bilans transzy — pierwszy pomiar**: koszty wejścia wyszły
    −$8.58 (nie ~$75 jak szacowałem: bufor to $226, nie $150).
    Do rozstrzygnięcia: czy natywny ETH $16.55 na Base był z transzy
    (wtedy −$8.58) czy sprzed niej (wtedy −$25.13). Wniosek na
    transzę 2: snapshot sald PRZED wejściem albo osobny adres —
    inaczej bufor zawsze będzie mieszał się z „tym, co już było".
  - **Pierwszy tydzień produktu**: fee narosłe vs tempo projektowe
    (~$0.4/d base-030, ~$0.06/d cbBTC), realne koszty gazu (grosze),
    liczba epizodów flat i czy któryś dożył do zwężenia.
  DO ODEBRANIA W PONIEDZIAŁEK 31.08 RANO (zlecone CC-Win):
  PORÓWNANIE KOTWIC HL7 vs HL5 na świeżych 720d (flatwindows
  COMPARE_HL_D — ile epizodów łapiemy szybciej i o ile godzin);
  smoke Fable 365d/cbBTC: HL5 wcześniej w 10/12 sparowanych,
  mediana +18.7h, ΣEV $290→$357 (+23%).
- [ ] ~24.09 (miesiąc od wejścia): produkt vs HODL vs USDC na żywo +
  paper A/B; decyzja o transzy 2 dopiero po ≥1 pełnym cyklu
  flat→trend→flat.

### E6. KOLEJKA BADAWCZA 29.08 wieczór (decyzja Rafała: „przebiegi nic
### nie kosztują, róbmy ich więcej") — uporządkowana wg DECYZJI, nie ciekawości

ZASADA, żeby to nie zamieniło się w łowienie zwycięzcy: kandydat wchodzi
do produktu dopiero, gdy przejdzie bramkę 720d w ≥2 reżimach ORAZ nie
psuje wyniku na oknie odłożonym (ostatnie 90 dni, `FP_DAYS=90` — nie
patrzymy na nie przy strojeniu). Każdy przebieg ma tu wpisane, co
rozstrzyga; jeśli nie rozstrzyga niczego, nie odpalamy.

1. **[ZAMKNIĘTE 29.08 — TREND-FOLLOWING, nie mechanika]** noswap na
   720d. Kryterium postawione z góry („wygrywa w down, przegrywa w up,
   remisuje we flat → trend-following") spełnione CO DO JOTY:
   cbBTC-720d, 46 okien — **up 0% wygr., śr. −13.91, najgorsze −17.86**;
   down 83%, +4.54; flat 72%, +0.53. Globalne 67% to artefakt próbki
   (12 okien down vs 5 up). Fullperiod cbBTC: $2869 (vsHODL −$104) vs
   $2983 ze swapem — odwrotnie niż na 365d, bo in-range spada do 66%.
   ZOSTAJE DO WYKORZYSTANIA: maxDD na base-030 −18.4% vs −47.0% przy
   lepszym wyniku (+$160 vs +$112) — realna własność ryzyka, ale
   pochodna tego samego mechanizmu. Jeśli kiedyś wrócimy do tematu
   ograniczania obsunięcia, to jest ślad; jako „lepsze zwężanie" —
   nie.
2. **Czy detektor flatu w ogóle coś wnosi.** Wariant „zwężaj zawsze,
   gdy pozycja w zakresie" (bez bramki |gap|<2%/12h) vs obecny.
   Rozstrzyga: czy płacimy za detektor, który nic nie daje — bo skoro
   pasywny wygrywa TAKŻE w oknach flat, sam sygnał może być bezwartościowy.
3. **[PIERWSZE WYNIKI 29.08, 365d, $2500, bez zwężania] Szerokość
   postury idle — OPTIMUM JEST RÓŻNE NA OBU PULACH, a nasze ustawienia
   leżą pośrodku.**
   · base-030 (ETH −54.8%): im SZERZEJ, tym lepiej — ±30% $1429 ·
     ±40% $1467 · ±50% $1486 [nasze] · ±80% $1513 · ±150% $1686 ·
     ±500% (≈full-range) $1743. In-range rośnie 20% → 100%.
     Wszystkie i tak poniżej HODL ($1815) i cash ($2496).
   · cbBTC (−16.5%): ODWROTNIE — im WĘŻEJ, tym lepiej: ±30% +$98 ·
     ±40% +$84 [nasze] · ±50% +$71 · ±80% +$51 · ±150% +$35 ·
     ±500% +$22 (vs HODL).
   INTERPRETACJA: para powracająca do średniej (cbBTC/WETH — cena
   względna dwóch kryptowalut) nagradza ciaśniejsze pasmo; para
   trendująca (ETH/USD w oknie −55%) karze każde pasmo, a najmniej
   full-range. Czyli „szerokość idle" nie jest jedną liczbą dla
   produktu, tylko funkcją charakteru pary. Do potwierdzenia bramką
   720d — okno spadkowe z natury schlebia szerokim.
   ZOSTAJE: przebieg na 720d + porównanie tierów (niżej).
   Wcześniejsza wersja pytania: ±40/±50 vs ±80 vs full-range. Powód:
   base-030 w oknie −55% miał in-range tylko 32% przy ±50% — pasmo
   przestało pracować dokładnie wtedy, gdy było potrzebne. Literatura
   (research 26.08) wskazuje full-range jako trudny do pobicia.
4. **Tier puli dla tej samej pary.** base-weth-usdc-030 (0.30%) vs
   base-weth-usdc-005 (0.05%), oba mamy w cache. Rozstrzyga realny
   wybór operacyjny: siedzimy w droższym tierze, a koszt przestawiania
   postury liczy się właśnie od tieru.
5. **Gdzie stawiać pasmo jednostronne** (tylko jeśli pkt 1 wyjdzie
   dobrze): przy cenie vs z odsunięciem. Rozstrzyga, czy „zlecenie
   z limitem" ma czekać blisko, czy dalej.
6. **Out-of-sample.** Najlepszy kandydat z 1–5 puszczony na oknie
   odłożonym, którego nie oglądaliśmy przy strojeniu.
7. **[POLICZONE 29.08 — WYNIK: BRAK STABILNEGO SYGNAŁU] „Kupuj dołki,
   sprzedawaj górki całymi pozycjami"** (pomysł Rafała). Nowa
   strategia `swingHold(thresh, hlDays)` w strategies.ts: ten sam
   log-gap do EMA, którego używa detektor flatu, ale użyty
   KIERUNKOWO — poniżej progu cały kapitał w aktywo, powyżej cały
   w quote. Bez LP, więc bez fee; koszt = swap przy każdym
   przełączeniu. Wyniki vsHODL (365d, $2500):
   | próg | base-030 | cbBTC |
   |---|---|---|
   | 3% | −$215 | −$86 |
   | 5% | −$251 | **+$212** |
   | 8% | **+$29** | +$136 |
   | 12% | −$350 | +$77 |
   | 20% | −$589 | $0 |
   DIAGNOZA: wynik zmienia ZNAK wraz z progiem i nie ma wspólnego
   optimum — najlepszy próg na base-030 (8%) jest na cbBTC drugim
   z kolei, a najlepszy na cbBTC (5%) daje na base-030 drugi
   NAJGORSZY wynik. To sygnatura szumu, nie przewagi: wybór progu
   po tej tabeli = klasyczne dopasowanie do historii. Do tego
   strategia oddaje jedyny strumień, w którym mamy realną przewagę
   (fee za dostarczanie płynności) w zamian za rzut monetą.
   Spójne z dwoma wcześniejszymi falsyfikacjami: ORACLE znający
   przyszłe 7 dni przegrywał z single-pool przez koszty (26.08),
   a opóźnianie sygnału (upConfirm) systematycznie szkodziło.
   DO POTWIERDZENIA: bramka 720d (zlecona) — ale poprzeczka jest
   wysoka: potrzebny byłby JEDEN próg wygrywający na OBU pulach
   i w ≥2 reżimach.

### E6b. KSZTAŁT SZEROKIEJ NOGI (02.09, brief „świeże spojrzenie" — decyzja Rafała: koniecznie)
- [ ] **Krzywy przedział**: produktowe „±50%" = −33/+50 w cenie (log-symetria
      w rangeAround i advisor.suggestFixedRange). Warianty −50/+50, −60/+35,
      −65/+30, −70/+25 (cbBTC: −40/+40, −50/+30, −55/+25) + hybrydy z idle
      asym. Kod: FP_SET/WF_SET=shape. Bramka: walkforward 720d u CC-Win.
      Smoke 365d w CONTEXT 02.09. Jeśli przejdzie → zmiana = jedna liczba
      w bot/config (productIdleWidthPct → para down/up) + advisor.
- [x] **Barbell — ZAMKNIĘTY 02.09** (CC-Win 4/4 na 720d): z recentrowaniem
      wyraźnie ujemny na obu pulach (−447/−458 base-030, −849…−1366
      cbBTC vs all-in), „nigdy-nie-dotykaj" ≈ neutralny (+72/−86) przy
      2 NFT per pula. Nie wracać bez nowych danych.
- [ ] **Krzywy przedział — RUNDA 2 (zlecone CC-Win 02.09)**: runda 1
      (base-030, cbBTC 720d): bramka nie przechodzi, ale −60/+35 i −65/+30
      poprawiają śr. vsHODL o ~0.3 pp/okno na OBU pulach (base-030
      −0.62→−0.31; cbBTC −0.31→+0.13) przy %wygr 64–65, kosztem worst
      w up (−8…−10 śr. w rajdzie). Test strukturalności: 4 pule (+mainnet
      -005, +arbitrum-005), warianty pośrednie −50/+40, −55/+40, −45/+35.
      Kryterium: 4/4 asym > sym na średniej przy %wygr ≥ sym → kandydat
      24.09 (zmiana = para down/up w bot/config + advisor); 2/4 → zamknąć.
- [ ] **Aerodrome Slipstream** (emisje AERO): WETH/USDC — NIE (Uni v3 0.3%
      bije, CONTEXT 02.09). cbBTC/WETH CL10 — nierozstrzygnięte (Llama
      apy 177 = 62 fee + 115 AERO, ale vol7=0 i ciasny spacing). Do
      sprawdzenia na danych Aerodrome (gauge APR dla ±40%) — ręcznie,
      bez kodu. Jeśli >2× naszego realized ~15%/r przy tej szerokości →
      osobna karta (NFT w gauge, sprzedaż AERO, nowy kontrakt, observer).
- [x] **Kolumny 365d/720d w rankingach (pomysł Rafała 02.09)** — model
      dzienny `wide-daily.ts` (wszystkie pule obu rankingów) + pełny
      przebieg z `wide-collect.ts` (Piętro 2) → Partia 22. Po miesiącu:
      porównać model dzienny z pełnym przebiegiem na pulach, które mają
      oba — kalibracja c_klasy i kosztu recentrowania.
- [ ] **Benchmark 24.09 = HODL 50/50 + pasywny yield** (wstETH ~3% + USDC
      Aave ~4–5% ≈ 3.5–4%/r bez IL) obok lokaty/ETF — dopisać do E4.
- [ ] FLAGA silnika: flatOnlyLP idle:'passive' nie recentruje szerokiej
      nogi po wyjściu z pasma (żywy bot proponuje REBALANCE) — backtest
      hybrydy pesymistyczny; do backlogu silnika obok „in-range po swapach".

### E5. ZAMKNIĘTE — NIE wracać bez nowych danych (falsyfikacje 26-27.08)
rotacja między pulami (przegrywa z single-pool i USDC, nawet ORACLE),
hedge ciągły full/excess (artefakt małej próby, 720d obala), upConfirm
/wolniejszy sygnał UP (systematycznie szkodzi), parking USDC/USDT LP
(fees $1/rok), pegged tBTC/WBTC (teza 3%/tydz. nie istnieje), krótsze
histerezy hUp 6/12h (szum). Jedyny warunkowy powrót: hedge WŁĄCZANY
tylko w reżimie down (obserwacja z 26.08, hedge(full) down 66-87% wygr.)
— ale dopiero gdyby produkt przeżył ≥1 pełną bessę i temat wrócił.
