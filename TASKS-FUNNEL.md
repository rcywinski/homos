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

## 2. Guardrale

- **Max 1 kandydat/noc** (FIFO wg persystencji, potem TVL). Fetch 365d +
  walkforward jednej puli to ~20–40 min; pipeline musi zdążyć przed 08:45.
- **Twardy timeout kroku 60 min** — lejek NIGDY nie blokuje reszty
  pipeline'u (withRetry 1 podejście, porażka = wpis w raporcie, nie fail).
- **Werdykt jest trwały** — nie retestujemy odrzuconych automatycznie.
  Retest tylko ręcznie (usunięcie wpisu z verdicts.json). USDC-WETH 0.01%
  i WETH-USDT 0.01% mainnet dostają wpisy FAIL od razu przy wdrożeniu
  (seed z wyników 17/19.08), żeby lejek ich nie liczył od nowa.
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
3. CC-Mac: commit/push. CC-Win: pull + restart homos-bot (nowy endpoint)
   + ręczny test tego samego dnia: `npm run pipeline -- --only candidates`
   na WETH-CBBTC 0.3% @ Base (#5 rankingu, jedyny żywy kandydat z ≥3d).
4. Pierwszy pełny automat: werdykt WETH-CBBTC w briefie następnego ranka.

## 5. Poza zakresem (świadomie)

Auto-edycja BOT_POOLS, auto-OPEN, retest cykliczny, pule spoza
ETH/BTC/stable, drugi harmonogram. Wszystko przez decyzję człowieka.
