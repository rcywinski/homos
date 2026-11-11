# TASKS-FUNNEL.md — auto-lejek walidacji kandydatów (spec, 24.08)

> Decyzja Rafała 24.08: automatyzujemy LEJEK (fetch → walkforward → werdykt),
> NIE decyzję. Dopisanie puli do `BOT_POOLS` zostaje ręczne, po werdykcie.
> Motywacja: 2/2 kandydatów z topu headline APY odrzuciła bramka — top APY
> to pułapka; ale ręczna walidacja kandydata kosztuje ~dzień pracy.
> Cel: kandydat pojawia się w rankingu → następnego ranka w briefie 08:45
> jest gotowy werdykt bramki.

## 1. Przepływ (co noc, w ramach ISTNIEJĄCEGO pipeline'u 05:30)

Świadomie BEZ nowego automatu w Harmonogramie (lekcja 18.08: mniej
ruchomych części). Nowy krok `candidate-funnel` w `scripts/pipeline.ts`,
po hs-*/freshness, PRZED backtest-run (żeby OOM backtestu nie zabił lejka).

1. **Kwalifikacja** (z danych po fetch-llama, świeżych):
   pula wchodzi do kolejki gdy: (jest propozycją OPEN spoza `BOT_POOLS`)
   LUB (jest w top10 rankingu ≥3 dni persystencji) — ORAZ nie ma jeszcze
   werdyktu w `data/candidates/verdicts.json` — ORAZ TVL ≥ $3M.
2. **Mapowanie** llama-uuid → on-chain: chain + symbole + fee tier z
   universe.json; adres puli przez `factory.getPool(tokenA, tokenB, fee)`
   (RPC), adresy tokenów ze słownika znanych majors per sieć (WETH, USDC,
   USDT, cbBTC, WBTC, DAI, wstETH). Token spoza słownika → werdykt
   `UNMAPPED` (do ręcznego przejrzenia), NIE próbujemy zgadywać adresów.
3. **Fetch 365d** swapów kandydata (istniejący `fetch-swaps-hypersync.ts`,
   cache id `cand-<chain>-<sym0>-<sym1>-<fee>`; wznawialny jak reszta).
4. **Walkforward** zamrożonym v1.2 (profil ETH/stable k=3+trend re>EMA;
   dla par BTC/ETH profil cbBTC k=2 czysty exit), 22 okna 30/15 — TA SAMA
   procedura co przy zamrażaniu v1 i odrzutach 17/19.08. Heap 8GB
   (`extraEnv` jak backtest-run).
5. **Werdykt bramki**: PASS = %wygr ≥65 AND worst >−3; inaczej FAIL.
   Zapis do `.bot/candidate-verdicts.json` (typ `CandidateVerdict` w
   `bot/candidates.ts`). ARCHITEKTURA (zmiana vs pierwsza wersja specu,
   24.08): seed werdyktów ręcznych żyje W KODZIE (SEED_VERDICTS,
   trackowany), runtime w `.bot/` (nietrackowany) — NIE w trackowanym
   pliku dopisywanym runtime'owo, bo brudne drzewo na produkcji to klasa
   problemu, która blokowała auto-push raportu (21.08).
6. **Raport**: nowa sekcja "Kandydaci" w morning-report.ts — werdykty
   z ostatnich 7 dni + kolejka na dziś. Zero Telegrama (brief wystarczy).

## 2. Guardrale (rozszerzone 24.08 po pytaniach Rafała)

- **Steady-state: max 1 kandydat/noc** (FIFO wg persystencji, potem TVL).
  Fetch 365d + walkforward jednej puli to ~20–40 min; pipeline musi
  zdążyć przed 08:45. SEKWENCYJNIE, nigdy równolegle (walkforward bierze
  do 8GB heapu).
- **Tryb BACKFILL `--all`** (decyzja Rafała 24.08: „zbadać wszystkie
  niebadane"): przerabia CAŁĄ kolejkę sekwencyjnie, do uruchamiania
  RĘCZNEGO (CC-Win, poza oknem pipeline'u, np. wieczorem) — pierwszy
  raz 25.08 wieczór na zaległości (#3/#5/#6/#7 ≈ 2–3h), żeby werdykty
  były na przegląd 26.08. NIE dodajemy drugiego automatu w Harmonogramie
  (lekcja 18.08) — steady-state 1/noc w pipeline wystarcza przy ~0–1
  nowych kandydatach dziennie.
- **Twardy timeout 60 min/pula** — lejek NIGDY nie blokuje reszty
  pipeline'u (withRetry 1 podejście, porażka = wpis w raporcie, nie fail).
- **Werdykt trwały + `algoVersion`** (decyzja 24.08): BEZ retestu
  kalendarzowego (3/7 dni nowych danych to ~1–2% okna 365d — wynik się
  nie zmieni, odrzucenia 0.01% są strukturalne). Właściwy trigger
  retestu = zmiana algorytmu: każdy werdykt niesie `algoVersion`
  ('v1.2' dziś); po zmianie wersji (np. σ/k po 26.08) werdykty ze starą
  wersją są traktowane jako nieważne i kolejka przerabia się od nowa.
  Retest ręczny = usunięcie wpisu. Seed: USDC-WETH 0.01% i WETH-USDT
  0.01% mainnet FAIL z 17/19.08 (żeby nie liczyć ich od nowa).
- **Kwalifikacja poza APY** (decyzja 24.08): dodatkowo (a) wiek puli
  ≥180 dni danych — młodsza nie ma sensownego okna walkforward, test
  byłby fikcją → werdykt odroczony, nie FAIL; (b) ranking kwalifikacyjny
  po MEDIANIE 7d apyBase zamiast średniej (jednodniowy spike nie wciąga
  puli). Miara OPŁACALNOŚCI pozostaje jedna: bramka walkforward vsHODL
  po kosztach — APY tylko wybiera, kogo testujemy. Temat filtra majors
  (koszt ~23–31 pkt fee-APR) zostaje na agendzie 26.08, nie tu.
- **Wykluczenia**: pary bez ETH/BTC-nogi ani stable (egzotyka) → UNMAPPED;
  po ewentualnej decyzji 26.08 (agenda pkt 4) dojdzie filtr mainnet-001.
- **PASS ≠ auto-dodanie.** Werdykt PASS ląduje w briefie jako rekomendacja;
  `BOT_POOLS` edytuje człowiek (Fable pisze diff, Rafał zatwierdza).

## 3. UI — badge statusu w "Ranking dnia" (lane Sonneta, osobna partia)

TopRankingPanel czyta `/api/candidates` (nowy endpoint z verdicts.json +
BOT_POOLS) i per wiersz pokazuje JEDEN z czterech stanów:
- ✅ **gra w bocie** (jest w BOT_POOLS)
- ⛔ **odrzucona bramką** (verdict FAIL, tooltip: winPct/worst/data)
- 🔬 **w walidacji** (w kolejce lejka / fetch w toku)
- ∅ **niebadana** (cała reszta — dzisiejsze mylące "poza konfiguracją")
Semantyka wprost od Rafała 24.08: obecna etykieta sugerowała, że
"poza konfiguracją" = odrzucona, co jest nieprawdą dla większości pul.

## 4. Plan wdrożenia

1. ✅ ZROBIONE 24.08 (Fable): `bot/candidates.ts` (typ + SEED_VERDICTS:
   2×FAIL z 17/19.08, 2×QUEUED wiszące OPEN) + `/api/candidates` w
   bot/server.ts. tsc czysty. UI = TASKS-UI PARTIA 12 (Sonnet).
2. Fable (po potwierdzeniu fixu llama): `scripts/candidate-funnel.ts` +
   krok w pipeline.ts + sekcja "Kandydaci" w morning-report.ts.
3. CC-Mac: commit/push. CC-Win: pull; test tego samego dnia = BACKFILL
   `--all` wieczorem 25.08 (kolejka: #3 WETH-USDT 0.3% ETH, #5 WETH-CBBTC
   0.3% Base, #6 WETH-USDC 0.05% Base, #7 WETH-USDT 0.05% ETH; ~2–3h,
   sekwencyjnie) — werdykty gotowe na przegląd 26.08 rano.
4. Steady-state od nocy 26/27.08: krok w pipeline 05:30, 1 kandydat/noc.

## 5. Poza zakresem (świadomie)

Auto-edycja BOT_POOLS, auto-OPEN, retest cykliczny, pule spoza
ETH/BTC/stable, drugi harmonogram. Wszystko przez decyzję człowieka.

## 2. PRZEBUDOWA NA METRYKĘ WIDE — „LEJEK v2" (spec Fable, 31.08; decyzja Rafała na przeglądzie)

> Kontekst: pilot skanu wide 31.08 (13 pul, CC-Win) — klasa ETH/stable
> przegrywa z HODL na KAŻDEJ szerokości na 7 rynkach; jedyny realny
> sygnał: tBTC/WBTC (BTC-BTC pegged). Dzisiejszy lejek bramkuje
> strategią v1.2, której nie gramy, i wchodzi tylko z top10 APY —
> podwójnie ślepy. Cel v2: szeroki przegląd POD PRODUKT (pasywny wide /
> klasy pegged), nie pod headline APY. Decyzja o wejściu ZOSTAJE ręczna.
> WYZWALACZ WDROŻENIA: po odebraniu follow-upu tBTC/WBTC od CC-Win
> (pojemność/APR) — jego wynik może skorygować progi Piętra 1.

> **STATUS 01.09 (Fable): PIĘTRO 1 ZAIMPLEMENTOWANE I ZWALIDOWANE.**
> `scripts/wide-score.ts` (`npm run wide:score`) — standalone, bez
> kroku w pipeline i bez UI (świadomie: najpierw miesiąc obserwacji).
> Model i kalibracja w nagłówku skryptu; kluczowe wybory:
> (a) fee wejściowe = MIN z okien apy (7d/30d) — kara za epizodyczność
> (spike'i i dyslokacje nie pompują score); (b) drag = 0.6·(σ²/8)·g(w),
> σ RATIO pary z 90d coins.llama.fi; (c) flaga dryfu tylko klasy
> ciasne; (d) v4 zwolnione z filtra vol7d>0 (pole niestabilne u Llamy).
> WALIDACJA na klasach pilota 31.08 (przebieg 01.09, 48 pul):
> crypto-stable 0/32 dodatnich ✓ (pilot: FAIL 7/7), eth-btc 0/5 ✓,
> stable-stable +0.17 „trywialne" ✓, wstETH ujemny+⚠DRIFT ✓,
> tBTC/WBTC −6.75 — metryka SAMA odtwarza decyzję „nie gramy"
> (σ90d=6.7% łapie dyslokacje depegu, min-fee łapie epizodyczność).
> TOP RANKINGU: **WBTC-CBBTC 0.01% v4 mainnet (+0.21)** — zbieżne
> z niezależnym znaleziskiem E7 (wolumen 5–8× bliźniaka v3).
> Cały ranking ledwo muska zero od góry — spójne z tezą nadrzędną
> na 24.09 (produkt = HODL+yield−drag, nie alfa).
> **STATUS 02.09 (Fable, decyzja Rafała): WPIĘTE DO OBSERWACJI** —
> krok `wide-score` w nocnym pipeline (przed lejkiem), zapis
> `.bot/wide-ranking.json` (kształt = selector-ranking.json, `apy7d`
> = score), GET `/api/wide-ranking`, sekcja w porannym raporcie, UI =
> Partia 21 (kopia Rankingu dnia pod nowe wytyczne, OBOK starego).
> Miesiąc obserwacji obu list, potem decyzja o przepięciu eligible/lejka.
> NASTĘPNE (stare): przebieg produkcyjny u CC-Win (jednorazowo, potem decyzja
> o wpięciu do pipeline'u po przeglądzie), Piętro 2 dla kandydatów
> pegged (UWAGA: pule v4 bez naszego fetcha swapów — singleton, inne
> eventy; dla nich screen tylko z metryk DefiLlama do czasu E7 krok 4).

### Piętro 1 — SCORING CAŁEGO UNIWERSUM (tani, bez swap-cache, codziennie)
- Wejście: pełne universe.json (DefiLlama) + dzienne serie cen tokenów
  (istniejące źródła; dla par bez naszej serii — kurs z DefiLlama).
- Filtry higieny: nasze sieci (mainnet/Base/Arbitrum/Optimism),
  TVL ≥ $3M, wiek ≥ 90d, wolumen 7d > 0.
- KLASYFIKACJA PARY (kluczowa zmiana vs v1): `pegged-btc` (tBTC/WBTC,
  cbBTC/WBTC…), `pegged-eth/LST` (wstETH, weETH, cbETH…/WETH),
  `stable-stable`, `eth-btc` (WETH/cbBTC itp.), `crypto-stable`,
  `inne`. Słownik klas W KODZIE (jak SEED_VERDICTS — trackowany).
- WIDE EDGE SCORE = fee_yield_rozcieńczony − drag_wariancji:
  - fee_yield = fees7d/TVL (annualizowane) × wsp. rozcieńczenia
    szerokości (nasza gęstość vs skoncentrowana reszta puli — policzyć
    z matematyki v3 dla szerokości domyślnej klasy; KALIBRACJA: na
    naszych żywych pozycjach znamy realne $/d, współczynnik ma je
    odtwarzać ±30%);
  - drag ≈ σ²/8 rocznie (σ z dziennych zamknięć, 90d) — dla klas
    pegged/stable σ pary (ratio), nie aktywa!
  - szerokość domyślna per klasa: pegged ±1/±2, LST ±2/±5 (uwaga dryf),
    stable ±0.5/±1, eth-btc ±40, crypto-stable ±50.
- Wyjście: ranking WSZYSTKICH przefiltrowanych pul (nie top10) z klasą,
  score, składowymi — do data/, sekcja w morning-report (top 15 + pełny
  CSV). Klasy `crypto-stable`/`eth-btc` w rankingu ZOSTAJĄ (uczciwość),
  ale wiemy z pilota, że score wyjdzie im ujemny.
### Piętro 2 — FETCH + SCREEN dla top ~50 score (nocami, porcjami)
> **STATUS 02.09 (Fable, decyzja Rafała „niech się już powoli zbiera"):
> ZAIMPLEMENTOWANE — `scripts/wide-collect.ts` (`npm run wide:collect`).**
> Kolejka z najnowszego wide-score: top `--per-class 8` KAŻDEJ klasy
> (pegged/LST/stable nadreprezentowane z konstrukcji), tylko uniswap-v3
> na mainnet/base/arbitrum (v4 poza zasięgiem fetcha), pule bota pomijane
> (mają 720d z pipeline'u). Per pula: mapowanie z `underlyingTokens`
> (factory.getPool + sanity token0/1 + decimals on-chain) → fetch 720d
> HyperSync (wznawialny, timeout 180 min) → walkforward 30/15
> `WF_SET=wide` (szerokość klasy; hybryda ±5% tylko klasy szerokie) →
> `.bot/wide-backtests.json` {uuid → summary} → GET `/api/wide-backtests`
> → kolumny „pełny przebieg" w tabelach rankingowych (Partia 22).
> Referencje USD: quote WETH → USDC/WETH-720d sieci; quote BTC →
> `ref-<chain>-…-720d` kolejkowane jako pierwsze (BTC/USDC), z jawną
> orientacją `quoteRefAssetIsToken0` (load.ts). Współbieżność: własny
> lock + PAUZA gdy biegnie pipeline nocny. Uruchamia SUBAGENT CC-Win w tle
> (nie pipeline). Dysk: 720d Base ≈ 0.5 GB/pula — ~40 pul ≈ 20 GB, sprawdzić
> wolne miejsce przed startem. Screen (kryterium pilota) — czyta Fable
> z wide-backtests.json; PASS/FAIL nie jest jeszcze automatyczny.
- fetch 365d (istniejący fetch-swaps-hypersync, cache `cand-*`),
  NADREPREZENTACJA klas pegged (kwoty per klasa: pegged/LST/stable
  min. 60% listy — score po APY je zaniża, a to tam pilot znalazł
  jedyny sygnał).
- screen: walkforward passiveW z szerokościami klasy (jak pilot CC-Win
  31.08 — patrz HANDOFF/commity 3e95efe…6871e1f), kryterium pilota:
  śr. vsHODL > 0 ∧ %wygr ≥ 60 ∧ recent90 nie gorszy; dla stable-stable
  dodatkowo APR netto ≥ 2%/r (inaczej „trywialne — odrzuć").
### Piętro 3 — BRAMKA dla finalistów (ręcznie zlecane, jak dziś)
- fetch 720d + walkforward + recent90 + fullperiod (ilustracja $) —
  dokładnie procedura z pilota; werdykt na przegląd, wejście = decyzja
  Rafała. Uwaga mainnet: do werdyktu dołączać szacunek gazu operacji
  (mainnet $5–20/mint vs Base ~1.5 centa — zmierzone 31.08).
### Co WYPADA z v1
- Walkforward v1.2 (krok 4 specu §1) — strategia porzucona; werdykty
  historyczne w verdicts zostają z adnotacją algoVersion.
- Kwalifikacja „top10 APY ≥3d persystencji" — zastąpiona Piętrem 1
  (APY zostaje tylko wewnątrz fee_yield). Propozycje OPEN selektora
  spoza BOT_POOLS: nadal możliwe, ale werdykt bierze się z Piętra 2/3.
