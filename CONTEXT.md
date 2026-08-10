# CONTEXT.md — żywy dziennik projektu HOMOS v2

> **Instrukcja dla każdej sesji AI/agenta:** przeczytaj ten plik PRZED jakąkolwiek pracą.
> Nie zwiedzaj repo od zera. Po zakończeniu sesji DOPISZ wpis do dziennika (sekcja 4).
> Pełny plan projektu: `PLAN.md`.

## 1. Stan projektu — skrót

- **Faza:** planowanie zakończone → następna: Faza 0 (fundament matematyczny)
- **Parametry:** kapitał $5k–$25k · sieć wybrana po backtestingu (kandydaci: Arbitrum, Base, mainnet) · hedging etapami (F4) · egzekucja pół-auto → full-auto
- **Stary kod:** katalog `src/` = legacy. NIE budować na nim. Powód: matematyka v3 liczona na float (utrata precyzji >2^53, złe wzory liquidity bez aktualnej ceny, mieszanie jednostek raw/human), maskowane slippage 20–25%. Szczegóły: PLAN.md sekcja 2.
- **Zasada:** cała matematyka na `bigint`, formuły z `@uniswap/v3-sdk`, testy referencyjne vs Uniswap UI co do 1 wei.

## 2. Decyzje podjęte (nie otwierać ponownie bez powodu)

| Data | Decyzja | Uzasadnienie |
|---|---|---|
| 2026-08-10 | Rewrite core zamiast naprawy legacy | Błędna matematyka we wszystkich warstwach; taniej napisać na czysto |
| 2026-08-10 | Bez własnego smart kontraktu/vaulta | Kapitał $5–25k nie uzasadnia ryzyka i kosztów; pozycje jako NFT na walletcie |
| 2026-08-10 | Backtesting przed jakimkolwiek wdrożeniem | Bramka: strategia musi bić HODL 50/50 na ≥2 reżimach rynku |
| 2026-08-10 | Monorepo TS: core / data / backtest / bot / ui | Jeden moduł matematyczny współdzielony przez wszystkie warstwy |
| 2026-08-10 | SQLite + CSV od pierwszej transakcji | Podatki PL + audytowalność |

## 3. Rzeczy do zweryfikowania na aktualnych danych (nie z pamięci AI)

- [ ] Płynność i wolumeny kandydujących pul WETH/USDC (Arbitrum/Base/mainnet, tiery 0.05/0.3, v3 vs v4)
- [ ] Aktualne endpointy subgraph / źródła danych historycznych swap-po-swapie
- [ ] Venue hedge: funding, opłaty, min size (Hyperliquid / GMX / CEX) — dopiero przy F4
- [ ] Integracja Rabby ↔ Claude jako kanał zatwierdzania transakcji (F3)
- [ ] Istniejące otwarte pozycje użytkownika w Uniswap (podpiąć w F2 jako pierwsze dane żywe)

## 4. Dziennik sesji

### 2026-08-10 — Sesja 2: Faza 0 — naprawa obliczeń
- **Nowy moduł `src/utils/v3math.ts`**: dokładny port TickMath + LiquidityAmounts na natywnym `bigint` (getSqrtRatioAtTick, getAmountsForLiquidity, getLiquidityForAmounts, ceny display z dokładnością 1 ulp).
- **Testy referencyjne `test/v3math.test.ts`**: **2925/2925 zgodnych bit-w-bit z @uniswap/v3-sdk** (2018 ticków + 600 pozycji + liquidity + ceny). Uruchamianie: `npx tsx test/v3math.test.ts`.
- **Przepisany `liquidityManagement.ts`**: createPosition → SDK `Position.fromAmounts`; calculateOptimalAmounts → `Position.fromAmount0/1`; usunięty hack slippage 20–25% (teraz clamp 0.05%–5%); poprawione ABI mint/decrease.
- **`uniswap.ts`**: calculatePoolPrice na bigint, usunięty hardkod $1900 dla Sepolii; naprawiona ścieżka createPool (brakujące getPoolState, chain/account).
- **`MyPositions.tsx`**: usunięte "calibrated scaling" (L/2.11e11), hardkody pozycji #953465/#953427, symulowane fees; kwoty pozycji liczone exact bigint z sqrtPriceX96; unclaimed fees przez static call `collect()` (metoda Uniswap UI); adres NFT managera per-chain; USD/ETH wyliczane z sqrtPrice puli.
- **`RemoveLiquidity.tsx`**: brakujący `await` na prepareRemoveLiquidityTransaction (runtime bug — tx nigdy nie mogła się udać).
- **Inne**: wagmi + mainnet (dla realnych pozycji), tsconfig target es2020 (bigint), connectkit przypięty do 1.8.2 (1.9.2 wnosi zbugowany @aave/account), webpack alias na opcjonalną zależność RN.
- App skompilowany i uruchomiony w kontenerze — renderuje się bez błędów JS. Weryfikacja na żywych danych: w przeglądarce użytkownika vs app.uniswap.org.
- **UWAGA: po pobraniu zmian wymagane `npm install`** (zmiana wersji connectkit).
- **Następny krok:** porównanie wartości pozycji z interfejsem Uniswap na żywo; potem Faza 1 (dane + backtesting).

### 2026-08-10 — Sesja 2b: WERYFIKACJA NA ŻYWYCH DANYCH MAINNET ✅
Dane on-chain pobrane przez przeglądarkę użytkownika (eth_call → publicnode), przeliczone naszym v3math i porównane z app.uniswap.org (blok 0x188820d, tick 200700, ETH=$1923.70 wg puli):

| Pozycja | Nasze wyliczenie | Uniswap UI | Werdykt |
|---|---|---|---|
| #953465 amounts | 31.61 USDC + 0.029257 WETH | 31.61 USDC + 0.029 WETH | ✅ |
| #953465 fees (static collect) | 1.810476 USDC + 0.001020 WETH | 1.81 USDC + ~0.001 WETH | ✅ |
| #953465 zakres | $1665.75–$2504.92 | $1665.75–$2504.92 (0.0₃3992–0.0₃6003 odwr.) | ✅ co do centa |
| #953427 amounts | 0.447 USDC + 0.000847 WETH = $2.08 | 0.447 USDC + <0.001 WETH = $2.08 | ✅ |
| #953427 fees | 0.324013 USDC + 0.000154 WETH | 0.324 USDC + <0.001 WETH | ✅ |

Różnica $87.89 vs $88.02 (0.15%) na total USD #953465 wynika wyłącznie z tego, że Uniswap wycenia WETH własnym feedem cenowym, a my ceną z puli — kwoty tokenów są identyczne.
Bonus: stary hardkod zakresu #953427 w legacy ("$1,740.43–$2,203.37") był PO PROSTU BŁĘDNY — poprawna wartość (nasza i dzisiejszego UI) to $1800.87–$2475.04.
Właściciel pozycji (wallet): 0xaa6acdc9900f3d3418d64360f85e220eca152e1e. Pula: USDC/WETH 0.3% (0x8ad599c3...e6D8).
**Bramka wyjścia Fazy 0 (zgodność z Uniswap UI) — ZALICZONA po stronie silnika.** Pozostało obejrzeć to samo w uruchomionej aplikacji użytkownika (npm install + npm run start).

### 2026-08-10 — Sesja 2c: FAZA 0 ZAMKNIĘTA ✅ (porównanie ekran-w-ekran)
Aplikacja uruchomiona u użytkownika (localhost:3000, wallet 0xAa6A…2E1e, Mainnet), porównana na żywo z app.uniswap.org przez Chrome:
- PoolBrowser: wszystkie 8 pul (USDC/WETH i USDT/WETH × 4 tiery) pokazuje realne ceny $1,918–$1,928 (koniec z hardkodem);
- Pool Info 0.3%: cena $1,923.70, tick 200700, sqrtPrice zgodny z on-chain co do cyfry;
- #953465: $87.98 | 31.61 USDC + 0.0293 WETH | zakres $1,665.75–$2,504.92 | fees $3.77 (1.810 + 0.001) — Uniswap: $88.02 / identyczne kwoty / identyczny zakres / $3.78;
- #953427: $2.08 | 0.45 + 0.000847 | $1,800.87–$2,475.04 | fees $0.62 — Uniswap: identycznie ($0.621);
- Poprawka w trakcie: stale `ethPrice` w wycenie USD fees (React state race) — naprawione przekazaniem `poolEthUsd` lokalnie.
Różnice końcowe wyłącznie w wycenie USD (±0.05–0.3%) — źródło: Uniswap używa własnego feeda ceny ETH, my ceny z puli. Kwoty tokenów: zgodność pełna.
Znane drobne TODO (kosmetyka, nie blokuje): procenty przy fees liczą się z lekko innej ceny niż suma (rozjazd ~0.1 p.p.).
**NASTĘPNY KROK: Faza 1 — pakiet danych (subgraph/eventy swap) + silnik backtestingu (PLAN.md §6).**

### 2026-08-10 — Sesja 2d: Analiza par i dywersyfikacji (PAIRS.md)
Zebrano żywe rankingi pul z app.uniswap.org (mainnet/Arbitrum/Base). Kluczowe wnioski:
- **Obecna pula użytkownika (mainnet ETH/USDC v3 0.3%) to słabe venue** — poza top20 TVL; ETH/USDC 0.05% mainnet daje 8.5% APR, ETH/USDC 0.3% na Base 14.9% APR.
- Najciekawsze odkrycie: **cbBTC/ETH 0.05% Base** — 13.1% APR przy vol/TVL 0.95 i mniejszym IL (para skorelowana).
- Arbitrum v3 wysechł (ETH/USDC 0.05% = 0.65% APR) — wolumen przeszedł na v4; Arbitrum niski priorytet, **Base wysoki**.
- Szkic portfela do walidacji: 40% ETH/USDC Base 0.3% + 25% cbBTC/ETH Base 0.05% + 20% ETH/USDT mainnet 0.3% + 15% stable/rezerwa. Uwaga: pule ETH/stable na różnych sieciach NIE dywersyfikują ryzyka cenowego — tylko fee i venue.
- Decyzje: konfiguracja pul jako dane (nie kod), wsparcie Base w aplikacji, v4 odłożone (osobna architektura), Pool Scanner jako część pakietu data w F1, backtest wielopulowy z allocatorem.
- Pełna lista pul do pobrania danych w F1: PAIRS.md §5.

### 2026-08-10 — Sesja 2e: Konfiguracja pul + Base + moduł Top Pools (zaimplementowane i zweryfikowane na żywo)
- **`src/config/pools.ts`** (nowy): obserwowane pule jako KONFIGURACJA (chainId, tokeny, tiery, rola portfelowa core/correlated/stable) — dodawanie pul = edycja jednego pliku.
- **`src/components/TopPools.tsx`** (nowy): ranking najzyskowniejszych pul na górze listy — DefiLlama yields API (publiczne, bez klucza, cache na sesję), filtr uniswap-v3/v4, ETH/Base/Arb, TVL≥$3M. To wersja pomostowa — F1 podmieni na własny ranking on-chain (fee/TVL-in-range).
- **PoolBrowser przepisany**: renderuje z konfiguracji, grupuje po sieci, per-chain publicClient (multichain bez przełączania portfela do odczytu), przy wyborze puli z innej sieci automatyczny switchChain w portfelu.
- **Base dodane**: wagmi chains + NETWORKS.BASE (factory 0x33128a8f..., WETH/USDC/cbBTC) + WBTC mainnet.
- **RPC**: dedykowane publicnode transporty (ethereum-rpc/base-rpc.publicnode.com) — domyślne RPC ucinały zapytania (brakujące pule).
- Zweryfikowane w przeglądarce: Base USDC/WETH 0.05+0.3, cbBTC/WETH 0.05+0.3, cbBTC/USDC ($65,195/cbBTC — spójne z ETH $1,924 × BTC/ETH 0.0295), mainnet komplet. Ranking: WETH-CBBTC Base 36.5%, WETH-USDC Base 0.3% 30.4% (DefiLlama liczy inaczej niż Uniswap explore — inne okno czasowe; oba źródła wskazują te same venue).
- **Decyzja v4**: NIE teraz. Matematyka identyczna (v3math działa dla v4), ale inna warstwa integracji (singleton PoolManager, inny position manager/SDK, hooki = ryzyko obcego kodu w puli). Dane: dla naszych par płynność wciąż na v3 (Base 0.3% v3 $120M vs v4 $3.6M). Warstwa danych F1 dostanie pole protocol: v3|v4, backtest pokaże kiedy migrować.
- Stare pozycje użytkownika (#953465/#953427, mainnet 0.3%) zostają do decyzji po backteście F1 (kapitał tam: ~$90).

### 2026-08-10 — Sesja 3: FAZA 1 START — pipeline danych + silnik backtestingu (kod gotowy, czeka na dane)
- **`scripts/fetch-swaps.ts`** (npm run fetch:swaps): pobiera eventy Swap v3 przez eth_getLogs (chunked, adaptive step, fallback RPC publicnode/llama, resume ze state.json) → `data/cache/<id>.ndjson` + meta z anchorami czasowymi (interpolacja block→ts). 5 pul × 90 dni: mainnet USDC/WETH 0.05+0.30, Base WETH/USDC 0.30+0.05, Base cbBTC/WETH 0.05 (adres przez factory lookup). **URUCHAMIA UŻYTKOWNIK (kontener nie ma sieci do RPC).**
- **`backtest/engine.ts`**: symulator swap-po-swapie — fee share = L/(L_pool+L), EWMA zmienności (HL 12h), trailing fee-yield puli (HL 1d), model kosztów (gas $8 mainnet / $0.08 Base za pełny cykl rebalansu, fee tier + 5 bps slippage na obrocie), equity sampling co 1h, maxDD. KONWENCJA: symulator na float (porównywanie strategii), geometria pozycji z v3math (1 ulp); znane przybliżenia opisane w nagłówku pliku.
- **`backtest/strategies.ts`**: HODL 50/50 (bramka), full-range, pasywny ±50%, sztywny ±5%/±15% naiwny, adaptacyjna (szerokość = k·σ_dzienna·√horyzont, histereza czasowa, warunek payback z trailing fee-yield) × 3 zestawy parametrów.
- **`backtest/validate.ts`** (npm run backtest:validate): **14/14** — HODL stały przy stałej cenie, final=start+fees bez ruchu ceny, IL full-range = 2√r/(1+r) co do 0.2%, amounts vs bigint v3math.
- **`backtest/run.ts`** (npm run backtest): ładuje cache, odpala wszystkie strategie, tabela w konsoli + `backtest/results/report.html` (krzywe equity SVG, tabela z vs-HODL/maxDD/fees/gas/rebalanse/in-range%).
- **NASTĘPNY KROK:** użytkownik odpala `npm run fetch:swaps` (może iść równolegle per pula; wznawialne). Po pobraniu: staging ndjson do kontenera → `npm run backtest` → analiza wyników względem bramki (bić HODL 50/50 na ≥2 reżimach).

### 2026-08-10 — Sesja 3b: Mostek agenta + panel doradcy + AddLiquidity v2
- **`scripts/agent-runner.ts`** (npm run agent): mostek automatyzacji — kolejka `.agent/queue/*.json`, BIAŁA LISTA skryptów (fetch:swaps/backtest/validate/test:math), logi `.agent/logs/`, heartbeat `.agent/status.json`. Claude wrzuca zadania i monitoruje przez pliki (device bridge) + budzik send_later. DZIAŁA — użytkownik uruchomił.
- **Fetch po awarii naprawiony**: publicnode odrzuca archiwalne zapytania (-32602) → nowa lista providerów (drpc/llama/1rpc/blastapi/publicnode) + env RPC_MAINNET/RPC_BASE + timeout 30s. Zadanie 002 w kolejce dociągnie mainnet; Base leciało poprawnie (94k swapów @11% w 3 min).
- **`src/utils/advisor.ts`**: mózg półautomatu — te same wzory co strategia adaptacyjna backtestu (EWMA vol z 24h swapów on-chain, trailing fee-yield pasma, sugerowany zakres k·σ·√7d, payback rebalansu). Parametry ADVISOR_PARAMS do kalibracji wynikami F1. getLogs chunk 1000 bloków (limity publicznych RPC).
- **`AddLiquidity.tsx` PRZEPISANY** (legacy 69KB → backup `legacy-AddLiquidity.tsx.bak`): zakresy Doradca/±5/±15/full/własny(USD), kwoty przez SDK, approvals na dokładne kwoty, symulacja eth_call przed mintem, slippage 0.1–1%.
- **MyPositions**: linia doradcy per pozycja (✅ trzymaj / 🔄 rebalans opłacalny / ⏳ czekaj) z sugerowanym zakresem i paybackiem.
- **Decyzja tokenowa**: cięższa praca UI → tańszy model (Sonnet) w osobnej sesji z tym CONTEXT.md jako handoffem; Fable do matematyki/strategii/analizy backtestów. Subagenty z tańszym modelem do mechanicznych edycji.

### 2026-08-10 — Sesja 3c: Wizja produktu + infrastruktura (dokumenty)
- **`UI-VISION.md`**: docelowy kształt = autopilot + poranny kokpit (użytkownik zagląda raz rano). Ekrany: poranny brief (finanse + kolejka decyzji + alerty + sugestie rotacji z kosztem przejścia), pozycje z osią czasu zdarzeń, ustawienia autopilota z kill-switchem, księga z eksportem CSV. Uzupełnienia poza wymaganiami: bot-daemon poza przeglądarką, alerty Telegram, benchmark vs HODL na górze, próg opłacalności rotacji, rezerwa 10–15%, księgowość podatkowa, ścieżka zaufania OBSERWUJ→PROPONUJ→AUTO, kalibracja parametrów z życia.
- **`INFRA.md`**: serwer bota = stacjonarny Windows użytkownika (24/7), Node+pm2 natywnie, SQLite+backup, API+statyczne UI z Express; dostęp Mac/iPhone po LAN + istniejący VPN domowy (ZERO ekspozycji publicznej), token dostępu, klucz operacyjny tylko na Windows (DPAPI), PWA na iPhone, alerty Telegram. Wdrożenia przez prywatny GitHub (Mac push → Windows pull). Opcja: Claude desktop na Windows = zdalne zarządzanie serwerem przez Cowork.
- **`TASKS-UI.md`** zaktualizowany: zadanie #0 = poranny kokpit read-only (krok A wizji) dla sesji Sonnet.
- Otwarta sesja UI (Sonnet 5 medium) — koordynacja przez CONTEXT.md/TASKS-UI.md (sesje nie widzą się bezpośrednio).

### 2026-08-10 — Sesja 3d: PIERWSZY BACKTEST (dane częściowe!) — Base WETH/USDC 0.3%, 545,724 swapy, 79.4 dnia
Okres SPADKOWY (HODL 50/50: −32% APR ann.) — jeden reżim, wyniki wstępne, bez ostatnich ~10 dni.

| Strategia | APR% | vs HODL% | maxDD% | fees$ | reb |
|---|---|---|---|---|---|
| HODL 50/50 (bramka) | −32.1 | 0 | 17.6 | 0 | 0 |
| **Pasywny ±50%** | **−25.2** | **+2.11** | 26.0 | 368 | 0 |
| Sztywny ±15% | −26.3 | +1.78 | 24.6 | 960 | 2 |
| Adaptacyjna k=2 h=6 pb7 | −28.6 | +1.08 | 25.7 | 1762 | 8 |
| Full-range | −30.9 | +0.38 | 19.2 | 68 | 0 |
| Adaptacyjna k=3 h=12 pb5 | −32.6 | −0.18 | 26.2 | 771 | 1 |
| Sztywny ±5% naiwny | −38.7 | −2.20 | 22.9 | 2752 | 24 |
| Adaptacyjna k=1.5 h=2 pb10 | −49.9 | **−6.43** | 24.4 | 5310 | 67 |

WNIOSKI WSTĘPNE:
1. **LP dodaje wartość vs HODL** przy umiarkowanych zakresach (±15–50%) — fees > IL nawet w spadkach; bramkę "bić HODL" przechodzą 4 strategie.
2. **Teza whipsaw POTWIERDZONA brutalnie**: wąskie+częste (±5% naiwny, adaptacyjna k=1.5/2h) zebrały NAJWIĘCEJ fees ($2.7–5.3k) i mają NAJGORSZY wynik (−2 do −6 vs HODL) — koszty rotacji + realizowany IL zjadają wszystko. Dokładnie pułapka z PLAN.md §1.
3. **Nasza adaptacyjna wymaga kalibracji**: przegrywa z głupim pasywnym ±50% — kandydaci: większe k, dłuższa histereza, asymetria; sweep parametrów po pełnych danych.
4. **maxDD LP (24–26%) > HODL (17.6%)** — koncentracja wzmacnia drawdown w spadkach; argument za hedge (F4).
5. Zastrzeżenia: jeden reżim (spadki), snapshot częściowy, gas Base $0.08 (na mainnecie wąskie strategie wyglądałyby DUŻO gorzej).
NASTĘPNE: pełne dane (fetch trwa) → sweep parametrów adaptacyjnej → pozostałe pule → werdykt bramki na ≥2 reżimach.

### 2026-08-10 — Sesja UI (Sonnet) — partia 1 (odnotowane przez Fable, sesja UI nie wpisała się sama!)
Zrobione (potwierdzone w kodzie): pasek zakresu na kartach pozycji, skeletony/spinnery PoolBrowser, etykieta "Active liquidity", integracja TransactionHistory (addTransaction w AddLiquidity/RemoveLiquidity). Typecheck czysty. NIE zrobione: #0 poranny brief. TASKS-UI.md zaktualizowany o partię 2 (#0, PWA, panel propozycji bota).

### 2026-08-10 — Sesja 3e: BOT-OBSERWATOR (krok C wizji) — szkielet gotowy
- **`bot/config.ts`**: pule obserwowane (3), RPC z fallbackiem, NFT managery per chain, WATCH_ADDRESS (env, domyślnie wallet użytkownika), interwały.
- **`bot/observer.ts`** (npm run bot): daemon OBSERWUJ — pętle 60s (ceny/ticki) / 15min (statystyki doradcy: vol, fee-yield, sugerowane zakresy) / 5min (pozycje NFT + rekomendacje). Stan → `.bot/state.json`; propozycje REBALANS (dedup) → `.bot/proposals.json` + log + opcjonalny Telegram (env TG_TOKEN/TG_CHAT). ZERO transakcji — tylko obserwacja. Reużywa advisor.ts i v3math (jedna logika wszędzie).
- **`bot/server.ts`** (npm run bot:server): API :8787 — GET /api/state, POST /api/proposals/:id/dismiss, /health (świeżość <5min), CORS, serwuje statyczny build z public/ (dodany skrypt npm run build).
- Uruchamianie docelowe: pm2 na Windows (INFRA.md); test lokalny na Macu: `npm run bot` + `npm run bot:server` w dwóch terminalach.
- UWAGA KOORDYNACYJNA: sesja UI modyfikowała te same pliki co Fable (AddLiquidity/MyPositions) — przed edycją ZAWSZE świeży odczyt z dysku; kopie w kontenerze Fable zsynchronizowane o 10:2x.

### 2026-08-10 — Sesja 3f: WARSTWA SELEKCJI PUL + SWEEP PARAMETRÓW (pełne 90 dni Base 0.3%)
- **Metodologia selekcji pul** (odpowiedź na "testujmy dzisiejszy top"): NIE testujemy dzisiejszych zwycięzców (lookahead/survivorship bias) — testujemy POLITYKĘ wyboru: każdego dnia D ranking tylko z danych ≤D, wynik mierzony forward. Narzędzia: `scripts/fetch-llama-history.ts` (npm run fetch:llama — historie APY/TVL ~300 pul z DefiLlama) + `backtest/selection.ts` (npm run backtest:selection — polityki: naiwny pościg 1d vs średnia 7d vs 7d+persystencja 3d vs tylko-majors, z kosztem rotacji; benchmark: stałe pule rdzeniowe). UWAGA: apyBase bez IL — porównanie polityk, nie PnL. Whitelist mostka rozszerzony (wymaga RESTARTU npm run agent).
- **SWEEP (32 warianty, 580,968 swapów, 90.0 dni, Base WETH/USDC 0.3%)**:
  - **ZWYCIĘZCA: Adaptacyjna k=2, histereza 24h → +3.77 vs HODL** (3 rebalanse, fees $1747, maxDD 27.3) — bije pasywny ±50% (+2.37).
  - k=2 h=6 (poprzednio) dawał +1.08 → wydłużenie histerezy 6h→24h potroiło przewagę.
  - Payback nie gryzie na Base (koszty za małe, by blokować) — będzie istotny na mainnecie.
  - **ANOMALIA DO ZBADANIA**: szerokie adaptacyjne (k=3 h=48, k=4) → −9 vs HODL przy 1-2 rebalansach i APR −52%: pojedynczy rebalans w złym punkcie (dołek) realizuje IL i odwraca ekspozycję przed odbiciem. Wniosek wstępny: histereza dłuższa ≠ bezpieczniejsza; sprawdzić ścieżki equity per strategia przed zaufaniem zwycięzcy.
  - Zastrzeżenie niezmienne: jeden reżim (spadkowy), jedna pula; werdykt bramki po pozostałych pulach i teście na podokresach (walk-forward).
- `backtest/sweep.ts` (npx tsx backtest/sweep.ts <pool-id>) dodany.
- **TASKS-INFRA.md** utworzony dla sesji Sonnet: .gitignore pod GitHub, deploy/ (ecosystem pm2, deploy.ps1, setup-windows.md), token dostępu w bot/server.ts, .env.example, README, backup.ps1.

### 2026-08-10 — Sesja 3g: META-BACKTEST WARSTWY SELEKCJI — 231 pul, 4.4 ROKU danych (2022-02→2026-08)
Dane: DefiLlama historie dzienne apyBase/TVL (240 pul pobrane przez fetch:llama). Polityka rankingowana każdego dnia D WYŁĄCZNIE z danych ≤D, wynik = forward apyBase D+1, koszt rotacji 0.3% (wyjście+wejście).

| Polityka | fee-APR% | rotacje/4.4y |
|---|---|---|
| Naiwny pościg: top5 wg WCZORAJSZEGO APR | 43.0 | 2476 |
| **Top5 wg średniej 7d** | **74.8** | 820 |
| Top5 7d + persystencja 3d | 68.3 | 761 |
| Top5 7d + persyst. + TYLKO majors | 50.7 | 561 |
| Top3 14d + persyst. 5d + majors | 60.8 | 256 |
| BENCHMARK: stały ETH/USDC | 32.9 | 0 |

WNIOSKI:
1. **Selekcja pul DZIAŁA i jest największą dźwignią**: top5-7d = 74.8% fee-APR vs 32.9% stały core (2.3×). Fee-APR ma persystencję w horyzoncie tygodniowym.
2. **Intuicja użytkownika potwierdzona**: średnia 7d MIAŻDŻY pościg za wczorajszym topem (74.8 vs 43.0, przy 3× mniej rotacji) — "gonienie DORY po jednym dniu" to najgorsza z aktywnych polityk.
3. Persystencja 3d: −6.5 p.p. fee, ale mniej rotacji — po doliczeniu IL może wygrywać.
4. **KLUCZOWE ZASTRZEŻENIE**: to fee-APR BEZ IL. Egzotyki (74.8%) vs majors-only (50.7%): przewaga egzotyków może zniknąć po IL (memcoiny −80% = LP zostaje z workiem). Następny krok: skorygować o il7d z DefiLlamy lub testować sleeve'y wg UI-VISION (majors rdzeń + mały sleeve egzotyczny).
5. Rekomendacja robocza dla bota (do potwierdzenia po korekcie IL): ranking 7d, persystencja ≥3d, rotacja max 1/dzień, sleeve egzotyczny ≤20% kapitału.
Wyniki: backtest/results/selection.json. Git przejęty przez sesję Claude Code (commit be26591 + c117ca3, historia repo CZYSTA — .env nigdy nie commitowany).

### 2026-08-10 — Sesja terminalowa (Claude Code): operator gita + fetch:llama + uszczelnienie .gitignore
Ta sesja prowadzi odtąd operacje git w repo (logiczne commity zmian od innych sesji; NIE commituje `data/`, `.agent/`, `.bot/`, `backtest/results/`).
- **Git**: usunięty stale `.git/index.lock`; `.env` nie-śledzony i nieobecny w historii. Pierwszy pełny commit `be26591` "HOMOS v2: math core, backtest, bot observer, deploy" → push na `origin/main` (`f9a41f0..be26591`). Wpis dziennika + `c117ca3`.
- **Audyt sekretów (24 commity, wszystkie branche) — CZYSTO**: `.env` nigdy w historii; klucz zawsze z `process.env.PRIVATE_KEY`; wszystkie `0x`+64hex to nie-sekrety (MAX_UINT256, Swap topic, stałe @noble). REKOMENDACJA (higiena, czeka na zgodę właściciela): `public/bundle.js` jest śledzony mimo .gitignore → `git rm --cached public/bundle.js` (sprawdzone: bundle bez wstrzykniętych env).
- **`npm run fetch:llama` — WYKONANE (exit 0, zero 429)**: uniwersum 240 pul, wszystkie historie już na dysku → resume pominął całość, `Gotowe → data/llama/`. Pokrycie 240/240.
- **Uszczelnienie `.gitignore`**: pod `data/` leżał NIE-ignorowany `data/llama-bundle.tgz` (ignorowane były tylko `data/cache/` i `data/llama/`) — reguła zmieniona na całe `data/`. Zweryfikowane: `git add -A` nie łapie już nic z `data/`.

### 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)
Wykonano `TASKS-WINDOWS.md` (kroki 1–10) na stacjonarnym Windows użytkownika,
repo w `C:\Projects\homos`. Szczegóły w TASKS-WINDOWS.md, skrót tutaj:

- **Środowisko**: Node v24.18.0 (nowszy niż wymagane v22.x — działa poprawnie,
  nie downgradowano), `npm ci`, `.env` utworzony (BOT_WATCH_ADDRESS z sekcji
  wyżej, BOT_API_PORT=8787, BOT_API_TOKEN losowy 32-znak, TG_TOKEN/PRIVATE_KEY
  puste — zero kluczy portfela na serwerze, zgodnie z trybem OBSERWUJ).
- **Test ręczny**: `.bot/state.json` — ceny 3 pul w normie (ETH ~$1905–1910),
  wykryte znane pozycje #953427/#953465 (in range, zgodne z Sesją 2b/2c).
- **3 bugi znalezione i naprawione podczas testu na żywym Windows** (nie
  wychodziły na Macu/kontenerze):
  1. `bot/observer.ts` `saveState()` crashował na pierwszym cyklu statystyk —
     `JSON.stringify` nie serializuje `BigInt` (`PoolStats.lastSqrtP`). Fix:
     replacer bigint→string.
  2. `deploy/ecosystem.config.js` (`script: 'npx'`) crashuje pod pm2 na
     Windows — `npx.cmd` uruchamiany przez interpreter node zamiast shell.
     Fix: script wskazuje bezpośrednio `node_modules/tsx/dist/cli.mjs`.
  3. `deploy/backup.ps1` i `deploy/deploy.ps1` zapisane UTF-8 bez BOM — Windows
     PowerShell 5.1 (nie pwsh) łamie się na polskich znakach bez BOM
     (`Missing string terminator`). Fix: przezapisane UTF-8 z BOM.
- **pm2**: `homos-bot` + `homos-server` online (0 restartów), `pm2 save` +
  `pm2-startup install` (autostart po reboocie).
- **Zasilanie**: powercfg standby/hibernate = 0 na AC. BIOS "Restore on AC
  Power" — POZA zasięgiem automatyzacji, do ustawienia ręcznie przez
  użytkownika przy najbliższym boocie.
- **Firewall — NIEDOKOŃCZONE, wymaga akcji użytkownika**: reguła
  (port 8787, LAN 192.168.1.0/24 + VPN 10.8.0.0/24) skonsultowana i
  zatwierdzona, ale sesja nie ma uprawnień administratora (New-NetFirewallRule
  → Odmowa dostępu). Do wykonania ręcznie jako Administrator — komenda w
  TASKS-WINDOWS.md krok 7. Dopóki reguła nie powstanie, dostęp spoza
  localhost może być zablokowany domyślną polityką Windows Firewall.
- **Backup**: zadanie Harmonogramu "HOMOS Daily Backup" (3:00 codziennie),
  przetestowane ręcznie i przez harmonogram — działa (`LastTaskResult 0`).
- **IP serwera w LAN**: `192.168.1.8`, port `8787` — test z Maca
  (`http://192.168.1.8:8787/health`) możliwy po ręcznym dokończeniu firewalla.
- **NASTĘPNY KROK**: użytkownik — (a) reguła firewalla jako Administrator,
  (b) "Restore on AC Power" w BIOS, (c) test `http://192.168.1.8:8787/health`
  z Maca/iPhone'a przez VPN.

### 2026-08-10 — Sesja 3h: TICK-LEVEL NA 4 PULACH (pełne 90 dni) + pipeline bulletproof
Wyniki vs HODL 50/50 (kapitał $10k, okres spadkowy):

| Pula | Najlepsza strategia | Adaptacyjna k=2 h=24 | Uwagi |
|---|---|---|---|
| base-weth-usdc-030 (581k swapów) | **adapt k2h24 +3.77** | +3.77 | aktywność się opłaca |
| base-weth-usdc-005 (1.86M swapów) | pasywny±50 +2.91 | +1.94 (1 reb) | k2h12: −6.36 (2 reb, jeden zły!) |
| base-cbbtc-weth-005 (323k) | sztywny±15 +2.71 | +2.59 (0 reb) | **jedyny DODATNI absolutny APR (+2.8%), maxDD 6%** — teza par skorelowanych potwierdzona |
| mainnet-usdc-weth-005 (464k) | pasywny±50 +1.69 | **−1.94** | gas $8 zabija aktywność: ±5% naiwny −21 p.p., $272 gazu |

WNIOSKI KLUCZOWE:
1. LP w umiarkowanej szerokości bije HODL na KAŻDEJ puli (bramka F1: zaliczona kierunkowo).
2. **Aktywne zarządzanie opłaca się TYLKO na tanim gazie (Base)**; mainnet przy $10k = pasywnie szeroko albo wcale.
3. **KRUCHOŚĆ: wynik 90 dni zdominowany przez 1-3 dyskretne decyzje rebalansu** (k2h12 vs k2h24 na base-005: różnica −8 p.p. przez JEDEN zły rebalans). Wymagane: dłuższe okna/walk-forward + mądrzejszy timing rebalansu (nie sama histereza; kandydat: rebalans warunkowany odwrotem EWMA momentum).
4. Portfel wg PAIRS.md broni się w danych: rdzeń Base 0.3% (aktywnie) + cbBTC/WETH (pasywnie ±15%) + mainnet tylko pasywnie.
- **`scripts/pipeline.ts`** (npm run pipeline; w whitelist mostka): lokalny orkiestrator BEZ AI — fetch swaps+llama (wznawialne, retry 3× z przerwami, walidacja świeżości) → backtesty+selection+sweep (retry 2×), logi data/pipeline-logs/, exit code = liczba porażek. Do podpięcia w Harmonogram zadań Windows po 8:00 (raz dziennie, przed porannym briefem).
- mainnet-usdc-weth-030 jeszcze się pobiera (ostatnia pula; publicnode-owe warningi w logu to działający fallback providerów, nie błąd).
- Commity kodu tej sesji przez operatora gita (Claude Code): `scripts/pipeline.ts` + package.json + agent-runner whitelist + strategie sweepu.

### 2026-08-10 — Sesja planistyczna
- Przeanalizowano legacy (`src/utils/liquidityManagement.ts`, `uniswap.ts`, README, docs) — zdiagnozowano przyczyny rozjazdu wyliczeń z Uniswap (float zamiast bigint, złe wzory, hardkody, brak testów).
- Ustalono parametry projektu z właścicielem (kapitał, sieć TBD, hedging etapami, pół-auto).
- Utworzono PLAN.md (analiza braków, funkcja celu, architektura, fazy 0–4, podział na agentów) i niniejszy CONTEXT.md.
- **Następny krok:** Faza 0 — setup monorepo, `core/math` na bigint, test referencyjny na realnej pozycji mainnet.
