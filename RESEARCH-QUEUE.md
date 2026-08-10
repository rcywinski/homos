# RESEARCH-QUEUE.md — kolejka danych i badań (żeby nic nie uleciało)

> Żywy plik. Każda sesja (AI albo Rafał w terminalu) odhacza wykonane pozycje
> i dopisuje wyniki/nowe pozycje. Analizy = skrypty lokalne (zero tokenów AI);
> sesja analityczna (Fable) tylko interpretuje wyniki. Stan projektu: CONTEXT.md.

## A. DANE DO POBRANIA (terminal Mac/Windows albo pipeline)

- [~] **Refetch mainnet-usdc-weth-030 (pełne 90d)** — W TOKU (Claude Code, w tle;
  stary stan skasowany, świeży start od bloku 25079057; warningi o archiwalnych
  RPC to działający fallback). UWAGA: przebieg 1 padł na ~30.9% (FAILED — publiczne
  RPC dławią archiwalne eth_getLogs na mainnecie), skrypt WYCHODZI Z KODEM 0 mimo
  błędu puli. Wznowienie (resumable ze state.json) grzeje dalej — mija 40%+.
  Prawdziwa naprawa: `RPC_MAINNET=<klucz Alchemy/Infura>` w .env (skrypt to obsługuje).
- [~] **base-weth-usdc-030-365d** — PEŁNY ROK tick-level najlepszej puli. W TOKU
  (Claude Code, w tle). Wpis w POOLS był. Fundament pod B1 (walk-forward).
  ⚠️ **WOLNO na darmowych RPC**: rok Base = ~15.77M bloków; głębokie archiwum
  dławione (publicnode wymaga tokena, drpc limit 10000 bl.) → ~150 bloków/s ⇒
  szacunkowo GODZINY, nie 30–60 min (to tempo zakłada porządny RPC). Leci dalej
  (wznawialne ze state.json), ale **prawdziwa naprawa: `RPC_BASE=<klucz Alchemy/Infura>`
  w .env** (skrypt to obsługuje — restart = natychmiastowy resume od nextBlock).
  RPC_URL w .env jest pusty, więc nie ma czego użyć. Interim dla B1: można puścić
  walk-forward na istniejących 90d (`base-weth-usdc-030`, ~2 okna przy 45/60d) —
  decyzja analityka.
- [ ] **base-cbbtc-weth-005-365d** — rok danych drugiej najlepszej puli
  (skorelowana). ✅ wpis w POOLS DOPISANY (kopia base-cbbtc-weth-005, days: 365,
  id `base-cbbtc-weth-005-365d`). Fetch ZAKOLEJKOWANY po base-030-365d (obie Base —
  unikam kontencji publicznych RPC Base przy dwóch rocznych fetchach naraz).
  ⚠️ Ten sam problem głębokiego archiwum co A2 — bez `RPC_BASE` też potrwa godziny.
- [~] **Egzotyki tick-level (werdykt majors vs egzotyki)** — CZĘŚCIOWO:
  - **DORY-USDC (Arbitrum 1%) to uniswap-V4** (universe.json: project=uniswap-v4,
    pool ae3c1ac2…, tokeny DORY 0x33b49f22…436ae / USDC natywny 0xaf88…5831).
    v4 = singleton PoolManager, inny Swap event, BRAK adresu przez v3 factory getPool
    → NIE do pobrania obecnym v3-skryptem (v4 świadomie odłożony, CONTEXT 2e). POMINIĘTE.
  - **Substytut v3 wybrany: WTAO-WETH mainnet 1%** (najwyższy v3 apyBase w universe:
    79.2%, TVL $2M). Zweryfikowane on-chain: pula 0x433a0081…1bbc, WTAO decimals=9,
    WETH=18, ethIsToken0=false. ✅ wpis w POOLS DOPISANY (`mainnet-wtao-weth-100`).
    Fetch ZAKOLEJKOWANY po resume mainnet-030 (obie mainnet — unikam kontencji
    archiwalnych RPC). Alternatywa gdyby analityk wolał Arbitrum: WETH-ARB 0.05% (31%).
  - **Infra Arbitrum DODANA** do fetch-swaps.ts (RPC list + RPC_ARBITRUM env,
    BLOCK_TIME=0.25s, FACTORY = ten sam v3 0x1F98…F984, chain union) — gotowe pod
    przyszłe v3 pule Arbitrum.
  - il7d z DefiLlamy pusty — tylko nasze tick-level rozstrzygnie, czy 60%+ fee-APR
    egzotyków przeżywa własny IL.
- [x] Historie DefiLlama 240 pul (4.4y dziennych apyBase/TVL) — pobrane.
- [x] Fix odświeżania: fetch-llama teraz odświeża pliki starsze niż 24h
  (wcześniej resume pomijał je na zawsze — codzienny pipeline byłby ślepy).
- [ ] **Weryfikacja jutro po 7:30**: czy HomosPipeline (Harmonogram zadań Windows)
  wykonał się i dociągnął świeże dane (data/pipeline.log + mtime cache).

## B. ANALIZY DO PUSZCZENIA (po danych z A; wszystko lokalne skrypty)

- [ ] **Walk-forward na 365d** (po A2): okna 45 i 60 dni co 15:
  `npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 45 15` oraz `60 15`.
  Kryterium algorytmu: %wygranych ≥65 i najgorsze okno > −3.
- [ ] **Podział na reżimy**: rozszerzyć walkforward.ts o tagowanie okien
  (trend up/down/flat wg zmiany ceny w oknie) i raport per reżim — strategia
  musi wygrywać w ≥2 reżimach (bramka z PLAN.md).
- [ ] **Warianty triggera rebalansu** (główny front — kruchość 1–3 decyzji):
  do strategies.ts dodać (a) bufor cenowy (rebalans po wyjściu o X% poza zakres,
  nie od razu), (b) odwrót momentum (rebalans dopiero gdy EWMA-trend wraca ku
  zakresowi), (c) powrót-do-zakresu (czekaj aż cena wróci; rebalans tylko po
  T dniach poza). Sweep na 365d.
- [ ] **Compounding w silniku**: akcja collect+reinwestycja przy fees > próg
  (50× gaz), zmierzyć wpływ na APR (oczekiwane +1–2 p.p.).
- [ ] **Egzotyki: pełny PnL tick-level** (po A4) vs cbBTC/majors — decyzja
  o sleeve egzotycznym (≤20% kapitału albo wcale).
- [ ] **Refetch mainnet-030 90d → run.ts** — domknięcie tabeli 5 pul (kosmetyka;
  werdykt "pula martwa" już pewny z 11 dni).

## C. PO ANALIZACH (sesja Fable — interpretacja)

- [ ] **ALGORITHM.md v1**: zamrożenie parametrów (selekcja: 7d+persyst.3d+majors;
  zakres: k·σ·√7d z wartością k z walk-forwardu; trigger: zwycięzca z B3;
  collect: próg 50× gazu; rotacja: przewaga pokrywa koszt przejścia ≤10 dni,
  utrzymana ≥3 dni, max 1/dzień) + wpisanie tych parametrów do ADVISOR_PARAMS
  i bot/config.ts (jedna prawda wszędzie).
- [ ] **Przegląd sygnałów bota z okresu OBSERWUJ** (po ~2 tyg. logów): trafność
  propozycji vs kryterium z ALGORITHM.md → decyzja o trybie PROPONUJ.
- [ ] Backfill: dzienne snapshoty rankingu Pool Scannera do SQLite (żeby za rok
  mieć własną, niezależną od DefiLlamy historię selekcji).

## D. OPERACYJNE PRZYPOMNIENIA

- [ ] Test fizycznego rebootu Windows (usługi NSSM mają wstać same).
- [ ] TG_TOKEN/TG_CHAT w .env na Windows → alerty Telegram z propozycji.
- [ ] Poranne zadanie 8:00 "newsy → postawa ryzyka dnia" (zaplanowane zadanie
  Claude; użytkownik da znać kiedy utworzyć).
- [ ] iPhone: wejść przez VPN na http://192.168.1.8:8787, Add to Home Screen (PWA).
