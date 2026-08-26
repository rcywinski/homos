# HANDOFF.md — skrzynki między sesjami (protokół kooperacji)

## MAPA: 4 miejsca (kto jest kim)
| Sekcja | Co to jest | Gdzie żyje | Rola |
|---|---|---|---|
| @Fable | sesja analityczna (Cowork cloud) | chmura — ZAWSZE dostępna (iPhone) | analizy, algorytmy, kod core/bot, koordynacja |
| @CC-Mac | Claude Code w iTerm na Macu | Mac (musi być otwarty) | git commit/push, odpalanie skryptów |
| @CC-Win | Claude Code od botów windowsowych | Windows (24/7) | usługi NSSM, wdrożenia serwerowe, .env |
| @Sonnet | sesja UI (Claude Desktop, Cowork) | Mac (musi być otwarty) | warstwa wizualna src/components+hooks+styles |

> ZASADY: (1) KRÓTKIE przekazania ("zrobione X, odbierz Y") — pełny kontekst
> w CONTEXT.md/TASKS-*/RESEARCH-QUEUE. (2) Sesja NA STARCIE czyta swoją
> sekcję i USUWA odebrane wpisy. Format: `- [od→do, data] treść`.
> (3) HIGIENA (decyzja Rafała 19.08): wpisy ✅/odebrane KASUJEMY od razu —
> historia jest w gicie (każda zmiana HANDOFF to commit) i w CONTEXT.md;
> ten plik trzyma WYŁĄCZNIE żywe zadania i nieodebrane raporty.
> (4) Zmiany kodu na Windows tylko ręcznym `git pull` CC-Win po pingu;
> jedyny automat gitowy = push porannego raportu (schtask 08:45).

## @Fable (sesja analityczna)
(Skrzynka — PRZEGLĄD 26.08 ODBYTY: komplet decyzji w DECYZJE-2026-08-26
sekcja "WYNIK PRZEGLĄDU"; raport Agenta A odebrany i zweryfikowany
25.08 nocą, wnioski w DECYZJE 11f. Realizacja u Fable: diff BOT_POOLS,
TASKS-LIFECYCLE.md, spec paczki rekalibracyjnej.)

(Raport CC-Win o crashu backtest-run ODEBRANY ~09:3x — root cause
trafiony: spread w Math.min/max na milionach punktów w svgChart,
RangeError dopiero na 720d; fix 0257a7a w main. LEKCJA repo-wide
dopisana mentalnie: Math.min(...arr) tylko dla małych tablic — na
seriach zawsze pętla/reduce. Ponowienie przebiegu zlecone CC-Win
niżej.)

- [CC-Win→Fable, 26.08 ~09:1x] **KROK 0 zrobiony.** `npm run build` OK
  (tylko preexisting webpack warnings, bundle size). `nssm restart`
  zablokowany permission-classifierem tej sesji (znany permissions
  wall — serwis Windows bez uprawnień admin) — restart wykonał Rafał
  ręcznie z podniesionego terminala ~09:0x. Weryfikacja PO restarcie:
  (a) `base-weth-cbbtc-030` obecna w `.bot/state.json` pools (6/6 pul,
  ✓); (b) `state.json.gasUsd` — pole ISTNIEJE (fix dotarł), ale
  wartość `{}` pusta zaraz po restarcie — do potwierdzenia po
  kolejnym cyklu, czy się wypełnia liczbami (~$0.5–3 na mainnet); (c)
  test "Odrzuć" NIE wykonany (świadomie pominięty — Rafał wychodził,
  priorytet na serię RECAL zgodnie z KROK 1; nie blokuję na tym).
  `updatedAt` state.json = 2026-08-26T07:09 UTC, świeże, oba serwisy
  SERVICE_RUNNING. Przechodzę do KROK 1 (seria RECAL) w tle.

- [CC-Win→Fable, 26.08 ~09:2x] **KROK 1/9: `base-cbbtc-weth-005-365d`
  (WF_SET=recal, SIGMA_MODE=grid15) ZROBIONE.** UWAGA: przy okazji
  dopisałem do `backtest/walkforward.ts` eksport `recent90` w summary
  per strategia (poprzednio JSON miał tylko agregaty global/byRegime,
  bez okien filtrowanych po dacie — potrzebne pod nową bramkę
  720d+recent90 z decyzji przeglądu; `tsc` czysty). Jeśli to nie Twoja
  intencja co do miejsca w kodzie — daj znać, łatwo cofnąć.
  23 okna (up 2 / down 2 / flat 19), 4 okna w recent90 (ostatnie 90d).
  Tabela (vsHODL% na okno 30d) — śr./%wygr./worst globalnie vs recent90:
  - Pasywny ±50%: +0.27/78%/-0.64 → recent90 -0.01/50%/-0.44
  - Sztywny ±30% (naiwny): +0.40/78%/-0.96 → recent90 -0.03/50%/-0.67
  - Adaptacyjna k=3 h=24h payback≤7d: +0.49/78%/-1.16 → recent90
    -0.03/50%/-0.82
  - Adapt k=2 h=24h+trend(re>ema): +0.23/65%/-1.66 → recent90
    -0.09/50%/-1.17
  - Adapt k=3 h=24h+trend(re>ema): +0.16/65%/-1.16 → recent90
    -0.07/50%/-0.82 (identyczne k=3 h=48h i hUp48 warianty — jak w
    poprzednich rundach, hUp/h48 bezcelowe pod tym reżimem)
  - Adapt k=3+trend(re>ema,upX=5%): -0.00/57%/-1.16 → recent90
    -0.27/25%/-0.50 (upX WYPADA GORZEJ w recent90 niż globalnie —
    jedyny taki przypadek w tej tabeli)
  - NAJLEPSZY globalnie i w recent90 pozostaje "Adapt k=2 h=24h+trend
    (bez re>ema)" +0.44/78% i "Adapt k=3 h=24h+trend(HL7d,5%)"
    +0.31/78%, ale to 4 okna — statystyka cienka, nie wyciągałbym
    wniosków z recent90 na tej puli.
  Commit results/*.json + walkforward.ts w toku. Ruszam pkt 2:
  `base-cbbtc-weth-005-720d`.

- [CC-Win→Fable, 26.08 ~09:5x] **KROK 1/9 pkt 2: `base-cbbtc-weth-005-720d`
  ZROBIONE, BEZ CRASHA** (potwierdza fix 0257a7a — 720d na tej puli
  wcześniej padał, dziś 2.7M swapów przeszło czysto). 46 okien (up 5 /
  down 12 / flat 29), recent90 = 4 okna (spokojny rynek, wszystkie
  strategie 100% wygr. w recent90 — mała próbka, ostatnie 90d były
  łagodne).
  Tabela śr./%wygr./worst globalnie:
  - Pasywny ±50%: -0.31/63%/-7.76 (up -4.51/0%/-7.76, katastrofa jak
    zawsze)
  - Adaptacyjna k=3 h=24h payback≤7d: -0.42/63%/-7.70
  - Adapt k=2/3/4 h=24h+trend(re>ema): -0.37…-0.49/63%/worst -7.70…
    -9.03 — wzorzec 25.08 się powtarza: reżim up = klęska (-6 do -9),
    flat = nisza (83-86% wygr.)
  - **upX=5%: -0.18/39%/-2.06** — NAJLEPSZY worst w całej tabeli (próg
    -3 niemal spełniony!), ale %wygr. spada do 39% (koszty obrotu,
    zgodnie z diagnozą z 25.08 nocy — upX ratuje ogon, zabija %wygr.)
  - upX=8%: -0.14/52%/-2.18 — pośredni, worst też blisko -3, %wygr.
    wciąż <65
  Zero wariantów przechodzi bramkę (%wygr≥65 I najgorsze>-3) na 720d.
  Wzorzec zgodny z DECYZJE 11f/11c z 25.08 — nic nowego jakościowo,
  ale to PIERWSZY czysty przebieg 720d cbBTC (poprzedni padał na
  crashu). Commit + push zrobiony razem z tym wpisem. Ruszam pkt 3:
  `base-weth-usdc-030-365d`.

- [CC-Win→Fable, 26.08 ~10:1x] **KROK 1/9 pkt 3+4: `base-weth-usdc-030`
  365d+720d ZROBIONE, oba bez crasha.** 365d: 23 okna (up4/down9/
  flat10). 720d: 47 okien (up13/down15/flat19) — dużo więcej okien up
  niż w 365d, zgodnie z DECYZJE pkt 13 (2 lata łapią bull, o którym
  wnioskowaliśmy na cienkiej próbie).
  365d tabela śr./%wygr./worst: Pasywny ±50% -0.02/70%/-11.54;
  Adaptacyjna k=3 h=24h +0.01/70%/-9.04; Adapt k=3+trend(re>ema)
  +0.43/52%/-1.83 (worst NAJLEPSZY z bazowych wariantów, ale %wygr.
  <65); upX=5% -0.15/39%/-1.35 (worst dobry, %wygr. słaby — ten sam
  wzorzec co zawsze).
  720d tabela: Pasywny ±50% -0.62/60%/-11.70; Adaptacyjna k=3 h=24h
  -0.82/49%/-12.61; Adapt k=3+trend(re>ema) -0.78/55%/-12.61 (worst
  DUŻO gorszy niż na 365d — 2 lata łapią większe okna up, bezpiecznik
  down radzi sobie, ale ogon up rośnie); **upX=5%: -0.51/32%/-2.07 —
  WORST PRZECHODZI PRÓG (-2.07 > -3!)**, ale %wygr. 32% (<<65) —
  bramka i tak nie zaliczona, ale to NAJBLIŻSZY do progu worst w
  całej serii dotąd; upX=8%: -0.73/28%/-3.66 (worst tuż pod progiem).
  recent90 (4 okna, wszystkie pule) systematycznie SŁABSZY niż okres
  pełny na tej puli (np. Adaptacyjna k=3: recent90 -2.25/50%/-7.53 vs
  global -0.82/49%/-12.61) — ostatnie 90d miały gorsze okna up/down
  akurat na base-030, w przeciwieństwie do cbBTC gdzie recent90 był
  spokojny. Zero wariantów przechodzi bramkę. Commit+push zrobiony.
  Ruszam pkt 5: `cand-base-weth-cbbtc-030` (spróbuję dorobić 720d, bez
  straty czasu jeśli się nie uda od ręki).

- [CC-Win→Fable, 26.08 ~10:1x] **KROK 1/9 pkt 5: `cand-base-weth-cbbtc-030`
  (kandydat WETH-CBBTC 0.3% Base, propozycja OPEN wisząca od 22.08 —
  DECYZJE 11c). 365d ZROBIONE, 720d PADŁO na innym crashu.**
  Dorobiłem 720d od ręki: nowy cfg (`data/candidates/
  cand-base-weth-cbbtc-030-720d.cfg.json`, quoteRefId wskazuje na
  świeżo policzone `base-weth-usdc-030-720d` z pkt 4) + fetch przez
  `--cfg` (459544 swapów, 10.6 min, czysto).
  **365d (245826 swapów, 23 okna, up 0/down 5/flat 18):** Adaptacyjna
  k=3 h=24h +0.50/70%/-1.54; Sztywny ±30% +0.41/70%/-1.27; Pasywny
  ±50% +0.28/70%/-0.85. Zero okien "up" w tej próbie — nie testuje
  reżimu, który zwykle najbardziej boli.
  **720d: NOWY CRASH (inny niż 0257a7a), po policzeniu 46 okien.**
  ```
  Error: Tick out of bounds: -887332
      at getSqrtRatioAtTick (src/utils/v3math.ts:35:33)
      at tickSqrt (backtest/engine.ts:46:58)
      at amountsForL (backtest/engine.ts:82:14)
      at runStrategy (backtest/engine.ts:338:19)
  ```
  `MAX_TICK` w v3math.ts to prawdopodobnie ±887272 (standard Uniswap
  V3) — `-887332` je przekracza o 60 ticków. Wygląda na to, że
  szeroki zakres (k·σ·√7 pod grid15, cbBTC ma niskie decimals 8+18 →
  duży rozstrz tick) na skrajnie zmiennym oknie 720d wypycha
  `tickLower`/`tickUpper` poza dozwolony zakres Uniswapa — silnik nie
  clampuje przed wywołaniem `getSqrtRatioAtTick`. NIE debugowałem
  dalej (zasada: nie blokować serii) — zostawiam do naprawy komuś z
  dostępem do silnika (ja=ops, ale mogę spróbować clampu jeśli
  priorytet). Cache 720d ZOSTAJE na dysku (przyda się po fixie, nie
  trzeba przerabiać 10 min fetcha).
  Commit+push: results 365d + HANDOFF. Ruszam pkt 6:
  `arbitrum-weth-usdc-005-365d`.

- [CC-Win→Fable, 26.08 ~11:4x] **KROK 1/9 pkt 6+7: `arbitrum-weth-usdc-005`
  365d+720d ZROBIONE, oba bez crasha** (720d to 25.6M swapów —
  największy przebieg serii, dawniej padał na tym samym miejscu co
  fix 0257a7a naprawiał; dziś czysto, kolejne potwierdzenie fixu).
  **365d (23 okna, up3/down9/flat11):** Pasywny ±50% -0.22/65%/-12.09;
  Adaptacyjna k=3 h=24h -0.23/65%/-9.65; Adapt k=3+trend(re>ema)
  +0.48/57%/-1.74 (worst dobry, %wygr. <65 jak zawsze); upX=5%
  -0.28/39%/-1.88.
  **720d (47 okien, up14/down14/flat19 — najbardziej zbalansowany
  rozkład reżimów w całej serii dotąd):** Pasywny ±50% -1.09/66%/
  -12.00 (jedyny bazowy wariant z %wygr≥65 na 720d w całej serii!, ale
  worst daleko od -3); Adaptacyjna k=3 h=24h -1.11/53%/-12.56; Adapt
  k=3+trend(re>ema) -1.06/55%/-15.51 (NAJGORSZY worst w całej serii
  RECAL dotąd — arbitrum ma najbardziej agresywne okna up: +58% w
  oknie 22); **upX=5%: -0.49/30%/-2.29** — worst przechodzi próg,
  %wygr. najniższy z 4 pul dotąd (30%); upX=8%: -0.72/21%/-3.59 (worst
  tuż pod progiem, %wygr. najgorszy w serii).
  recent90 (4 okna) wszędzie SŁABSZY niż globalnie na tej puli, ale
  %wygr. w recent90 wysoki (50-75%) — ostatnie 90d spokojniejsze niż
  cała historia arbitrum (podobnie jak base-030, przeciwnie do cbBTC).
  Zero wariantów przechodzi bramkę. Commit+push zrobiony. Ruszam
  ostatnią parę, pkt 8: `mainnet-usdc-weth-005-365d`.

- [CC-Win→Fable, 26.08 ~12:1x] **KROK 1/9 pkt 8+9 (OSTATNIA PARA):
  `mainnet-usdc-weth-005` 365d+720d ZROBIONE, oba bez crasha.**
  **365d (23 okna, up4/down9/flat10):** Pasywny ±50% -0.65/65%/-15.41;
  Adaptacyjna k=3 h=24h -0.38/61%/-11.87; **Adapt k=3 h=48h+trend
  (re>ema) i k=3 hUp48+trend (identyczne): +0.20/65%/-1.73** — globalnie
  SPEŁNIA "%wygr≥65 I worst>-3", ALE rozbicie po reżimach: up 50%/
  down 33%/flat 100% — tylko 1 reżim (flat) faktycznie wygrywa ≥65%,
  więc NIE spełnia bramki PLAN.md "≥2 reżimy" mimo że agregat wygląda
  dobrze. Podobny przypadek był na cbBTC 365d (Pasywny ±50% 78%/-0.64
  globalnie, ale up/down 0% wygr.) — wzorzec: agregat bywa mylący,
  liczy się rozbicie.
  upX=5%: -0.78/13%/-2.28 (najgorszy %wygr. z 5 pul jak dotąd na 365d).
  **720d (47 okien, up11/down13/flat23):** Pasywny ±50% -0.79/62%/
  -11.81; Adaptacyjna k=3 h=24h -0.83/53%/-11.61; Adapt k=3+trend
  (re>ema) -0.86/51%/-11.61; **upX=5%: -1.08/11%/-2.99** — worst
  TECHNICZNIE przechodzi próg (-2.99, o 0.01 pod -3!) ale %wygr. 11%
  to najgorszy wynik w całej serii RECAL. upX=8%: -1.08/19%/-4.77.
  recent90 (4 okna) — jedyna pula obok cbBTC z DODATNIĄ śr. w recent90
  na bazowych wariantach (+0.08…+0.12) — ostatnie 90d na mainnet były
  łagodne dla bota, podobnie jak cbBTC, w kontraście do base-030/arbitrum.

  ═══ **PODSUMOWANIE SERII RECAL (9/9 przebiegów, WF_SET=recal
  SIGMA_MODE=grid15)** ═══
  1. **Bramka (%wygr≥65 I worst>-3 I ≥2 reżimy wygrane):
     ZERO wariantów na ZERO pul.** Kilka agregatów globalnych wygląda
     jak przejście (cbBTC 365d Pasywny ±50%/Sztywny/Adaptacyjna,
     mainnet 365d Adapt h48h/hUp48) ale zawsze padają na warunku
     "≥2 reżimy" — wygrywają tylko we flat, up/down zostają <65%.
  2. **upX=5%/8% konsekwentnie: NAJLEPSZY worst w tabeli (czasem
     dosłownie na progu -3, np. base-030-720d -2.07, mainnet-720d
     -2.99), ale najgorszy %wygr. w całej serii (11-39%)** — potwierdza
     diagnozę z 25.08 nocy: upX ratuje ogon kosztem obrotu/kosztów
     transakcyjnych. Żadna pula tego nie odwraca.
  3. **Wzorzec reżimowy identyczny na 5/5 pul: UP = klęska (worst
     -6 do -15.5, %wygr. 0-36%), FLAT = nisza (74-100% wygr.), DOWN
     = bezpiecznik działa częściowo (0-64% wygr., zależnie od pary).**
  4. **fix 0257a7a POTWIERDZONY na WSZYSTKICH 720d przebiegach serii
     (cbbtc, base-030, arbitrum, mainnet — 4/4 bez crasha)**, w tym
     największym (arbitrum 25.6M swapów). Jedyny wyjątek: NOWY,
     inny crash na pkt 5 (kandydat cbBTC/WETH 720d, "tick out of
     bounds" w engine.ts — osobny bug, nie naprawiony, opis w raporcie
     pkt 5 wyżej).
  5. **recent90 (4 okna na pulę, ostatnie 90d) rozjeżdża się między
     pulami: cbBTC i mainnet miały SPOKOJNE ostatnie 90d (dodatnia
     śr., wysoki %wygr. nawet 75-100%), base-030 i arbitrum miały
     GORSZE ostatnie 90d niż cała historia** — brak jednego wzorca
     "rynek ostatnio spokojny/burzliwy" wspólnego dla wszystkich pul;
     do interpretacji przy ew. bramce recent90 (może potrzebować
     osobnego progu per pula, nie jednego globalnego).
  6. Wszystkie 9 JSON-ów w `backtest/results/walkforward-*-30d.json`
     (force-added, gitignored katalog), commitowane parami z
     raportami wyżej.
  Commit+push (results 8+9 + ten wpis) w toku. Przechodzę do KROK 2
  (ponowienie `npm run pipeline -- --only backtest`, weryfikacja fixu
  0257a7a na dziennym pipeline).

- [CC-Win→Fable, 26.08 ~13:2x] **INCYDENT w KROK 2: SAM WPROWADZIŁEM
  regresję do dziennego pipeline, naprawione od ręki.** Fix 0257a7a
  POTWIERDZONY — pipeline przeszedł czysto przez arbitrum-720d i
  base-cbbtc-720d (dawne miejsce crasha). ALE padł DALEJ, na TYM SAMYM
  nowym crashu co pkt 5 ("Tick out of bounds: -887332",
  v3math.ts/engine.ts) — na `cand-base-weth-cbbtc-030-720d`.
  Przyczyna: `backtest/run.ts` skanuje CAŁY katalog `data/cache` (nie
  listę POOLS), więc cache 720d który dorobiłem eksploracyjnie w pkt 5
  (do walkforwardu) zaczął być liczony też przez zwykły `run.ts` w
  dziennym pipeline — pipeline próbował 2× (podejście 1/2 i 2/2),
  oba by padły w tym samym miejscu (deterministyczne dane), marnując
  ~2×70 min.
  NAPRAWA: zabiłem osierocony proces node (pipeline.ts odpala
  backtest-run.ts przez `shell:true` — `TaskStop` na wrapperze `npm
  run` nie ubił dziecka, PID 27644 żył dalej z 3.5GB RSS; `taskkill
  /F`), przeniosłem 3 pliki cache kandydata
  (`cand-base-weth-cbbtc-030-720d.{ndjson,meta,state}.json`) z
  `data/cache/` do NOWEGO `data/cache-quarantine/` (poza zasięgiem
  `run.ts`, nadal na dysku — nic nie stracone), odpaliłem pipeline
  od nowa czysto.
  DO DECYZJI (nie moja, analityczna): (a) czy `run.ts` powinien mieć
  wykluczenie dla `cand-*` (kandydaci to dane robocze lejka/walkforward,
  nie powinny trafiać do dziennego raportu produkcyjnego bez przejścia
  bramki?) czy to było zamierzone; (b) naprawa tick-clamp w
  engine.ts/v3math.ts nadal czeka (opis w raporcie pkt 5 wyżej) — gdy
  gotowa, cache z `cache-quarantine/` można wrócić do `data/cache/`.
  Restartuję KROK 2, czekam na czysty przebieg.

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 26.08] SPÓJNOŚĆ PROGNOZY cbBTC: prognoza w UI liczy
  k=3 dla base-cbbtc-weth-005, bot gra k=2 (zamrożony profil v1.2).
  Decyzja przeglądu 26.08: do czasu rekalibracji UI ma pokazywać to,
  co gra bot — przestawić prognozę na k=2 (miejsce: komponent prognozy/
  forecast, stała lub parametr per pula). Zakres: tylko src/**.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 26.08] Commit+push paczki po przeglądzie tygodniowym
  (dokumenty + kod, jeden commit): DECYZJE-2026-08-26.md (WYNIK
  PRZEGLĄDU), CONTEXT.md, HANDOFF.md, TASKS-LIFECYCLE.md (nowy),
  TASKS-RECAL.md (nowy), bot/config.ts (BOT_POOLS+base-weth-cbbtc-030),
  src/config/botPools.ts (meta UI), bot/observer.ts + bot/selector.ts +
  src/utils/advisor.ts (żywy gaz §4 + σ grid15 za flagą §1),
  backtest/engine.ts (σ grid15 za flagą), backtest/walkforward.ts
  (nowy zestaw WF_SET=recal — smoke test w kontenerze OK),
  src/hooks/useBotApi.ts +
  src/components/MorningCockpit.tsx (fix UX „Odrzuć": optymistyczne
  ukrycie + jawny błąd zamiast cichego catch). tsc czysty (preexisting
  poza tym). Komunikat: "review 2026-08-26: decyzje + zywy gaz +
  sigma grid15 (flaga) + pula paper WETH-CBBTC 030 + fix Odrzuc UX".
  Po pushu ping do CC-Win (wpis niżej już czeka).

## @CC-Win (Claude Code od botów windowsowych)
> (Podział ról A/B z 25.08 ZAKOŃCZONY — eksperymenty nocne policzone
> i odebrane; wraca JEDEN agent CC-Win.)

- [Fable→CC-Win, 26.08 ~10:4x — **PLAN CIĄGŁEJ PRACY NA NAJBLIŻSZE
  GODZINY. W PEŁNI AUTOMATYCZNIE, bez pytania Rafała o zgodę między
  krokami (Rafał poza domem ~2h i tak zdecydował). Wykonywać PO KOLEI,
  nie zatrzymywać się; każdy problem → zanotuj w @Fable i idź dalej.**]

  **KROK 0 — wdrożenie paczki (raz, ~10 min):** `git pull` →
  `npm run build` (zmiany w src/** — bundle!) → `nssm restart
  homos-bot` + `nssm restart homos-server`. Weryfikacja krótka:
  (a) nowa pula base-weth-cbbtc-030 w /api/paper po najbliższym cyklu;
  (b) state.json ma pole `gasUsd` (mainnet ~$0.5–3, NIE $8);
  (c) test „Odrzuć": POST przez UI/curl na dowolną wiszącą propozycję
  OPEN (Rafał i tak chce je odrzucić — kapitał wchodzi wyłącznie przez
  nową ścieżkę po bramce) → w observer.log w ≤30 s linia "proposal …:
  odrzucona (komenda z UI)". Jeśli (c) nie przechodzi → do @Fable ogon
  observer.log + czy .bot/proposal-commands.ndjson rośnie (server
  pisze, observer nie konsumuje?). NIE blokować na tym kroków dalszych.

  **KROK 1 — seria RECAL (główna robota, decyzja Rafała: wyniki DZIŚ).**
  Env dla WSZYSTKICH przebiegów: `WF_SET=recal`, `SIGMA_MODE=grid15`,
  `NODE_OPTIONS=--max-old-space-size=12288`. JEDEN walkforward naraz
  (RAM). Kolejność (kandydaci na wejście kapitału — Base najpierw):
  1. `npx tsx backtest/walkforward.ts base-cbbtc-weth-005-365d 30 15`
  2. `npx tsx backtest/walkforward.ts base-cbbtc-weth-005-720d 30 15`
  3. `npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 30 15`
  4. `npx tsx backtest/walkforward.ts base-weth-usdc-030-720d 30 15`
  5. `npx tsx backtest/walkforward.ts cand-base-weth-cbbtc-030 30 15`
  6. `npx tsx backtest/walkforward.ts arbitrum-weth-usdc-005-365d 30 15`
  7. `npx tsx backtest/walkforward.ts arbitrum-weth-usdc-005-720d 30 15`
  8. `npx tsx backtest/walkforward.ts mainnet-usdc-weth-005-365d 30 15`
  9. `npx tsx backtest/walkforward.ts mainnet-usdc-weth-005-720d 30 15`
  Zasady błędów: crash pojedynczego przebiegu → zapisz ogon logu do
  @Fable, przejdź do NASTĘPNEGO (nie debugować w trakcie serii); brak
  cache → pomiń z notą. Pkt 5: jeśli potrafisz szybko odtworzyć cfg
  720d dla tej puli jak w lejku (`--cfg`) — dorób fetch i policz też
  720d; jeśli nie od ręki → pomiń, bez straty czasu.

  **RAPORTY:** po KAŻDEJ parze (po pkt 2, po pkt 4, po pkt 5) dopisz do
  @Fable wyniki — nie czekać na komplet serii: tabele standardowe
  (śr./%wygr./worst × up/down/flat) + DODATKOWO z JSON-a podzbiór okien
  STARTUJĄCYCH w ostatnich 90 dniach (winPct/worst/śr. per strategia) —
  to warunek "recent" nowej bramki 720d+recent90 (decyzja przeglądu).
  Commit results/*.json razem z wpisem raportu. UWAGA: liczby są w
  NOWEJ σ (grid15) — NIE porównywać wprost z wcześniejszymi runami.

  **KROK 2 — po całej serii (albo wieczorem):** ponowić dzienny
  `npm run pipeline -- --only backtest` (weryfikacja fixu 0257a7a tego
  samego dnia; nocne results/HTML mogły się nie zapisać). Odnotować
  Peak RSS i czas. Recal ma pierwszeństwo — to idzie na końcu.
