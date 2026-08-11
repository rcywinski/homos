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

    Fakty liczbowe (interpretacja → B5/sesja analityczna): w silnym trendzie WZROSTOWYM
    HODL bije KAŻDĄ aktywną strategię LP; nawet pasywny full-range tylko +0.37 vs HODL.
    **Headline 79% fee-APR egzotyka NIE przekłada się na przewagę LP — kierunkowość/IL
    dominuje** (im węższy/aktywniejszy zakres, tym gorzej: ±5% −33.8). Wstępny sygnał
    przeciw sleeve'owi egzotycznemu przy aktywnym LP — ale to JEDEN reżim (wzrost);
    pełny werdykt = B5 (potrzeba egzotyka też w reżimie spadkowym/flat).
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
  - **cbBTC/WETH to jedyny łagodny reżim** (HODL −7.2% vs ~−30% reszta) i jedyne
    DODATNIE bezwzględne APR (sztywny±15 +3.7%, adapt k2 +3.2%; maxDD ~6% vs ~26%).
  - Gaz decyduje: aktywne wąskie działają na Base (gas$≈0), na mainnecie giną
    (mn-005 ±5% naiwny −21.0 vs HODL, 34 reb / $272 gazu).
  - Adapt k2 **h24 > h12** wszędzie poza mn-030 — spójne z wcześniejszym wnioskiem o histerezie.
  Bramka F1 (bić HODL 50/50): przechodzi ≥1 strategia na KAŻDEJ z 5 pul.

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
- [ ] **Konsumenci UI Partii 4 — untracked na Macu, do commitu przez sesję UI**:
  `src/components/BotTelemetry.tsx`, `src/components/CockpitPositionActions.tsx`,
  `src/hooks/useCockpitActions.ts`, `src/config/botPools.ts` (karty
  [Zatwierdź]/[Modyfikuj]/[Odrzuć] + wywołanie rebalanceBuilder + podpisy Rabby).
- [ ] Jednolinijkowy fix fetch-swaps: exit code != 0 przy FAILED puli (zgłoszone przez CC).
- [ ] **Wdrożenie selector v1.1 (fix zimnego startu) na Windows**: commit+push
  `bot/selector.ts`, na Windows: `git pull`, USUNĄĆ `.bot\selector-state.json`
  (żeby zasiew streaków i dzisiejszy przebieg wykonały się od nowa),
  `nssm restart homos-bot`; w `.bot\observer.log` powinno pojawić się
  "zimny start — streaki zasiane" + "ranking dnia — eligible top5" + propozycje.
- [ ] **Commit prac UI Sonneta (P3/P4/4b)** — na dysku Maca jest ~13 nieskomitowanych
  plików src/** (git status); dla porządku i backupu (UI działa z working tree,
  więc nie blokuje jutra).
- [ ] **cbBTC/WETH 0.05% Base do BOT_POOLS — ŚWIADOMIE ODŁOŻONE**: adres puli
  zweryfikowany z cache fetchera: `0x7AeA2E8A3843516afa07293a10Ac8E49906dabD1`
  (feeBps 500, token0=cbBTC d8, token1=WETH d18, ethIsToken0=false). BLOKER
  projektowy: observer/telemetria/propozycje zakładają pary kwotowane w USD
  (pole ethUsd, konwersje toUsd) — dla cbBTC/WETH cena to WETH-za-cbBTC i
  wyświetlanie byłoby błędne. Wymaga: pola orientacji ceny per pula (np.
  quote: 'USD'|'WETH') w BotPool + poprawek w observer.ts (ethUsd/valueUsd),
  selector.ts (toUsd w getSuggestion), UI (BotTelemetry nagłówek, karty).
  Sesja analityczna (Fable) — nie hotfix. Do tego czasu propozycje OPEN na
  cbBTC pokazują się z notą "spoza konfiguracji" (uczciwe) a otwarcie ręcznie
  przez Zarządzaj → PoolBrowser (cbBTC/WETH tam JEST).
- [x] **Windows nie miał data/llama (zgłoszone przez sesję Windows)** — data/ jest
  w .gitignore, dane NIE wędrują przez git; każda maszyna buduje własny cache.
  Rozwiązanie: `npm run fetch:llama` (lekki, same API — NIE pełny pipeline, żeby
  nie bić w darmowe RPC równolegle z nocnym grindem 365d na Macu) + del
  .bot\selector-state.json + nssm restart homos-bot. Od jutra pipeline 07:30
  odświeża llamę na Windows codziennie — problem jednorazowy (zimny serwer).
- [x] **B5 WYNIK (WTAO-WETH mainnet 1%, 90.3 dni, 10 750 swapów — sesja Fable,
  backtest w kontenerze na zsynchronizowanym cache)**: HODL 50/50 **+74.9% APR**
  (reżim silnie wzrostowy WTAO). Pasywny full-range +77.5 (vsHODL +0.37, fees
  $124); pasywny ±50% +75.1 (vsHODL +0.01, fees $486 ≈ 19.7%/r fee-yield).
  WSZYSTKIE aktywne PRZEGRYWAJĄ z HODL: ±5% naiwny −33.8 p.p. (trend+gas $248),
  ±15% −15.4, adapt k2h24 −11.2, k3h24 −1.8. WNIOSKI: (1) nagłówkowe 79% apyBase
  NIE jest osiągalne dla LP — realny fee-yield szerokiej pozycji ~5–20%/r,
  wąska zbiera więcej fees ($1,316) ale umiera na IL od trendu (klasyczny LVR);
  (2) cały zysk puli to beta tokena (HODL +75%), nie fees — to zakład o WTAO,
  nie strategia LP; (3) filtr majors-only w selektorze POTWIERDZONY empirycznie.
- [ ] **HyperSync fetcher — TEST + ewentualne przejęcie grindu (dla CC, jutro)**:
  `scripts/fetch-swaps-hypersync.ts` NA DYSKU (sesja Fable; API klienta z pamięci
  — patrz nagłówek, może wymagać drobnych poprawek nazw pól, jest --debug).
  Kroki: (1) `npm i @envio-dev/hypersync-client`; (2) darmowy token z envio.dev
  → `HYPERSYNC_BEARER_TOKEN=` do .env (Rafał wkleja sam, NIE commitować);
  (3) w fetch-swaps.ts: `export const POOLS` + `export interface PoolCfg`
  (jednolinijkowe); (4) TEST POPRAWNOŚCI: pobrać base-weth-usdc-030 (90d, już
  mamy z RPC) pod świeżym id-testowym i porównać liczbę linii + skrajne wiersze;
  (5) jeśli zgodne: STOP nocnego grindu A2 i dokończenie HyperSyncem (state.json
  kompatybilny — wznowi od nextBlock!), potem A3 i od razu WIĘCEJ (pełne 365d
  mainnet-005? decyzja analityka po sukcesie). NIE blokować się, jeśli API
  wymaga poprawek — nocny grind i tak mieli w tle jako plan B.

## F. SLEEVE PAR SPIĘTYCH (pomysł z interfejsu bota znajomego — 2026-08-10)
> Kontekst: screen "Earned $6,912 / 5.6d / $281k" = 3.1%/tydz. — realne dla
> ultra-wąskiego LP na parach spiętych (LST-ETH, stable-stable): brak IL w
> normalnych warunkach, koncentracja ×dziesiątki. Ukryte ryzyko: depeg (wąska
> pozycja skupuje spadający token). Testujemy WŁASNYM silnikiem tick-level.
- [ ] **A: dane** — dopisać do POOLS w fetch-swaps.ts i pobrać (HyperSync jeśli
  przejdzie test, inaczej RPC): (1) wstETH-WETH mainnet 0.01% (największa pula
  LST), (2) USDC-USDT mainnet 0.01%; po 180–365d żeby złapać różne reżimy.
  Adresy przez factory lookup (skrypt umie sam).
- [ ] **B: backtest** — strategie ultra-wąskie (±1–5 ticków, rebalans przy
  wyjściu) vs pasywne; KONIECZNIE sprawdzić zachowanie w dniach stresu
  (odchylenia pegu w danych!); policzyć próg kapitału, przy którym gaz mainnet
  nie zjada przewagi (u znajomego $281k — u nas $5–25k, to może być deal-breaker
  → sprawdzić odpowiedniki na Base, jeśli istnieją pule v3 z wolumenem).
- [ ] **C: decyzja** — sleeve spięty w PAIRS.md (obok cbBTC) albo świadome NIE
  z liczbami. Uwaga metodologiczna: fees liczone NETTO po gazie/rebalansach,
  osobno wynik w tygodniach spokojnych vs tygodnie stresu pegu.
- [ ] **Pool Scanner 2.0 — globalny skan koszyków (NOWE, na dysku)**:
  `npx tsx backtest/scan-universe.ts` (1 call do /pools, sekundy — może iść od
  ręki, nie koliduje z niczym). Klasyfikuje CAŁY rynek ≥$1M na koszyki
  (stable-stable / eth-lst / btc-btc / major-volatile / exotic), top-10 per
  koszyk w widoku "wykonywalne u nas" i "cały rynek" + dominujące projekty
  (czy np. aerodrome-slipstream zjada Base). Wyniki → sesja analityczna:
  (1) zasilenie sekcji F (które pule spięte fetchować tick-level),
  (2) decyzja, czy poszerzyć universe fetch-llama (MAX_POOLS/projekty),
  (3) docelowo: koszyki do selektora (ranking per koszyk zamiast globalnego).
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
