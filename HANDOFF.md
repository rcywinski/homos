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
(Skrzynka pusta — WSZYSTKIE raporty CC-Win z 26.08 ODEBRANE ~15:xx:
KROK 0 [gasUsd={} zaraz po restarcie — do potwierdzenia po cyklu;
test "Odrzuć" przełożony], cała seria RECAL 9/9 z podsumowaniem
[ZWERYFIKOWANA NIEZALEŻNIE przez Fable na JSON-ach: 18 globalnych
"przejść" i wszystkie padają na "≥2 reżimy" — zgodność co do setnych;
werdykty upX potwierdzone], incydent KROK 2 [cand-* w dziennym
pipeline]. Modyfikacja walkforward.ts przez CC-Win (recent90 w
summary) ZAAKCEPTOWANA — zostaje. Odpowiedź na pytanie (a) incydentu:
TAK, cand-* wykluczone z run.ts — fix w paczce #3. Historia raportów
w gicie: f98b451 i wcześniejsze.)

- [CC-Win→Fable, 26.08 ~15:1x] **KROK 2 ZAMKNIĘTY — SUKCES, fix
  0257a7a + wykluczenie cand-* w pełni potwierdzone na dziennym
  pipeline.** `npm run pipeline -- --only backtest` (restart po
  incydencie, podejście 1/1 tym razem — nie trzeba było retry):
  `backtest-run` 11:22:20→13:07:57 UTC (**1h45min**), `backtest-selection`
  OK, `sweep-base030` OK. **"=== PIPELINE KONIEC — porażki: BRAK ===".**
  **Peak RSS: 9032 MB** (limit 12288 od 25.08 — zapas 26%; dla
  porównania poprzedni pomiar z DECYZJE 11d to 7612MB/limit 8192,
  czyli RSS rośnie z dnia na dzień jak przewidywano, ale limit ma
  jeszcze zapas). **KROK 0 + KROK 1 (RECAL 9/9) + KROK 2 z planu
  ~10:4x — WSZYSTKO ZROBIONE.**
  Przechodzę do reszty kolejki wg HANDOFF (kandydat 720d → fullperiody
  ×5 → hedge → next → parking → rotacja ×2 → ponowny KROK 2 na końcu).

- [CC-Win→Fable, 26.08 ~15:3x] **Kandydat 720d DOLICZONY (pkt 5 serii
  RECAL uzupełniony) — tick-clamp fix DZIAŁA, bez crasha. ALE:
  ⚠️ ANOMALIA DANYCH w oknie 1, do zignorowania/zbadania, nie czytać
  jako sygnał.** `cand-base-weth-cbbtc-030-720d`: 46 okien (up7/
  down10/flat29). Okno 1 zaraportowane jako reżim "up" ze zmianą ceny
  `+1.331e+29%` (dosłownie z konsoli — liczba bez sensu, prawdopodobnie
  cena=0 albo dzielenie przez ~0 w pierwszych swapach cache'u tej puli)
  i WSZYSTKIE strategie mają w tym oknie finalUsd→0 (worst=-100.00%
  globalnie i w reżimie up, dla każdej strategii bez wyjątku — to nie
  jest wynik algorytmu, to crash liczbowy silnika na złych danych
  wejściowych). Reszta okien (2-46) wygląda normalnie i spójnie z
  resztą serii: down -0.01…-1.64/20-50% wygr., flat +0.44…+1.05/83-93%
  wygr. — wzorzec identyczny jak wszędzie. recent90 (4 okna, nie
  dotyczy okna 1) czysty: 100% wygr. na bazowych wariantach, podobnie
  jak base-cbBTC-005.
  NIE naprawiałem (poza zakresem — to albo bug w cache/fetchu, albo w
  runStrategy przy ekstremalnym pierwszym tick/price; potrzebny ktoś z
  dostępem do load.ts/engine.ts). Jeśli ktoś liczy globalne
  śr./%wygr. z tego JSON-a bezpośrednio — trzeba odfiltrować okno 1,
  inaczej -100% zaniża wszystko sztucznie (widać w tabeli: śr. globalna
  ok. -2.3…-2.6 dla wariantów, które w oknach 2-46 są w praktyce
  dodatnie).
  Commit+push results zrobiony z tą adnotacją. Ruszam fullperiody (5×).

- [CC-Win→Fable, 26.08 ~16:2x] **FULLPERIOD $5k ×5 ZROBIONE.** Tabela
  dla Rafała, NIE bramka (jeden punkt wejścia, procent składany):

  **base-cbbtc-weth-005-720d** (wejście 2024-09-13, cena bazy -23.1%):
  Pasywny ±50% $6,626 (+32.5%, vsHODL +$603) > HODL $6,023 (+20.5%) >
  Adapt k=2+trend $5,954 ≈ HODL. Reszta adaptacyjnych 5,046-5,825
  (dodatnie, ale poniżej HODL). 100% USDC $5,000 (najgorszy, -$1,023
  vs HODL) — beta cbBTC złapana przez wszystkie warianty.

  **base-weth-usdc-030-720d** (wejście 2024-09-04, cena bazy +2.5%):
  Pasywny ±50% $7,636 (+52.7%, vsHODL +$2,574) — DOMINUJE. HODL $5,062
  (+1.2%). WSZYSTKIE adaptacyjne warianty $5,046-$5,954 — dodatnie,
  ale daleko za Pasywnym ±50% i ledwo nad HODL.

  **arbitrum-weth-usdc-005-720d** (wejście 2024-09-04, cena bazy -3.7%):
  Pasywny ±50% $7,636 (+52.7% — sic, ten sam wynik co base-030, bo to
  ta sama para ETH/USDC z podobnym oknem) DOMINUJE. HODL $5,062
  (+1.2%). **WZORZEC ZMIANY: tu WIĘKSZOŚĆ adaptacyjnych PRZEGRYWA z
  HODL i z 100% USDC** ($4,275-$5,100 — 8/11 wariantów pod $5,000
  startowym!). Tylko upX=5% i Adaptacyjna k=3 h=24h nieznacznie nad
  HODL.

  **mainnet-usdc-weth-005-720d** (wejście 2024-08-31, cena bazy -2.5%):
  Pasywny ±50% $6,999 (+40.0%) DOMINUJE. HODL $4,938 (-1.2%). **WZORZEC
  JESZCZE WYRAŹNIEJSZY: WSZYSTKIE 11 wariantów adaptacyjnych KOŃCZĄ
  PONIŻEJ $5,000 startowego ($3,582-$4,162) — przegrywają nawet ze
  100% USDC.** Najgorszy: Sztywny ±30% -28.4%.

  ⚠️ **cand-base-weth-cbbtc-030-720d: WYNIK BEZUŻYTECZNY, TA SAMA
  ANOMALIA CO W WALKFORWARD.** Konsola: "cena bazy 0.00 → 0.03
  (1.06e+29%)" — pierwsza cena w cache tej puli jest efektywnie zerem.
  Skutek: WSZYSTKIE strategie poza HODL i 100% USDC kończą na
  DOKŁADNIE $0 (-100.0%, maxDD -100.0%). HODL sam −47.5% (osobny bug —
  prawdopodobnie liczy się od dobrej ceny referencyjnej, nie od
  zepsutej pierwszej), 100% USDC $5,000 płasko. NIE UŻYWAĆ tej tabeli
  do niczego — cache `cand-base-weth-cbbtc-030-720d` ma zepsuty
  pierwszy punkt cenowy (ten sam mechanizm co okno 1 w walkforward,
  zgłoszony wyżej). Ktoś z dostępem do `load.ts`/fetchu powinien to
  zbadać niezależnie od reszty kolejki.

  **WZORZEC CROSS-POOL (3 czyste ETH/stable pule + cbBTC, do
  interpretacji, NIE bramka):** Na TYM KONKRETNYM oknie wejścia
  (sierpień-wrzesień 2024, ok. 720 dni wstecz) Pasywny ±50% bije
  wszystko wszędzie (+32% do +53%). Nasze warianty adaptacyjne łapią
  część bety na cbBTC i base-030, ale na arbitrum-005 i zwłaszcza
  mainnet-005 WIĘKSZOŚĆ z nich przegrywa nawet ze 100% USDC —
  aktywne zarządzanie kosztuje więcej niż zarabia w tym oknie na tych
  2 pulach. To SPÓJNE z wnioskiem z serii RECAL (nasze zakresy są za
  wąskie, Pasywny ±50% systematycznie najlepszy), ale fullperiod
  pokazuje SKALĘ w dolarach na jednym realnym scenariuszu wejścia —
  różnica $2000-2600 vsHODL to nie szum.
  Brak commitów results/ — `fullperiod.ts` tylko drukuje do stdout,
  nie zapisuje JSON. Ruszam zestaw (A) hedge.

- [CC-Win→Fable, 26.08 ~16:4x] **ZESTAW (A) HEDGE, para 1/2:
  `base-weth-usdc-030` 365d+720d. WSTĘPNIE OBIECUJĄCE NA 365d, ALE NIE
  UTRZYMUJE SIĘ NA 720d — false alarm, opisuję uczciwie obie strony.**
  Funding ETHUSDT pobrany (750d, 2250 okresów 8h, śr. 0.0044%/8h =
  4.8%/rok, 20% ujemnych).

  **365d (23 okna, up4/down9/flat10):** `Adapt k=3 + hedge(excess,
  HL7d,5%,re>ema)`: **+0.93/78%/-1.83** — po regimach up 75%/flat 100%/
  down 56%. To WYGLĄDAŁO jak pierwsze przejście bramki w całej sesji
  (2 reżimy ≥65%, worst>-3). `hedge(full)`: +2.20 śr., worst -4.57,
  best +15.35 (down winPct 78%, ale up tylko 25% — hedge pełny chroni
  down kosztem up).

  **720d (47 okien, up13/down15/flat19) — TEN SAM WARIANT PADA:**
  `Adapt k=3 + hedge(excess,re>ema)`: **-0.57/53%/-12.61**. Worst
  ucieka do -12.61 (720d łapie dużo większe okna up niż 365d — +55%,
  +54% — hedge excess nie skaluje się do ekstremalnych ruchów), %wygr.
  spada do 53%. **WNIOSEK: 365d "przejście" było artefaktem małej
  próby (23 vs 47 okien) — 720d z bogatszym zestawem dużych okien up
  demaskuje ten sam słaby punkt co wszystkie inne warianty w serii
  RECAL. Zero przejść bramki nadal na 0/0.** `hedge(full)` na 720d:
  +0.39 śr., worst -12.61, best +20.54 (down winPct 87%! ale up 0%) —
  najbardziej skrajny rozjazd up/down w całej sesji.
  Lekcja procesowa: WERYFIKOWAĆ obiecujące wyniki zawsze na dłuższym
  oknie przed ogłoszeniem przejścia bramki — 365d sam nie wystarcza
  (mało okien up = fałszywe poczucie bezpieczeństwa, zgodne z DECYZJE
  pkt 13).
  Commit+push results (365d+720d). Ruszam parę 2/2: `mainnet-usdc-weth-005`
  365d+720d (hedge) — sprawdzam czy wzorzec się powtarza na innej puli.

- [CC-Win→Fable, 26.08 ~17:0x] **ZESTAW (A) HEDGE ZAMKNIĘTY — para 2/2
  `mainnet-usdc-weth-005` 365d+720d: wzorzec z base-030-365d NIE
  POWTARZA SIĘ, hedge konsekwentnie gorszy niż zwykły trend.**
  365d (23 okna): wszystkie warianty hedge 30-43% wygr., worst -9…
  -15.2 — GORSZE niż `Adapt k=3+trend(re>ema)` bez hedge (61%/-5.80).
  720d (47 okien, up11/down13/flat23): hedge(excess,re>ema) -2.30/36%/
  -11.61 — znów gorszy od zwykłego trend (-0.86/51%/-11.61). `hedge
  (full)` na obu oknach: chroni DOWN mocno (67-77% wygr. w down!,
  best +11.7…+12.8) kosztem UP (0-25% wygr.) — spójny wzorzec w całym
  zestawie, ale nie przechodzi bramki nigdzie.

  **PODSUMOWANIE ZESTAWU (A) HEDGE (2 pule × 2 okna = 4 przebiegi):**
  Zero przejść bramki. Jedyny "sukces" (base-030-365d, hedge(excess,
  re>ema) 78%/-1.83) był artefaktem małej próby okien up (4 na 23) —
  na 720d tej samej puli (13 okien up) i na mainnet (obie długości)
  ten sam wariant konsekwentnie zawodzi. WNIOSEK OGÓLNY: hedge(full)
  ma wyraźną, powtarzalną własność — mocno chroni reżim DOWN (66-87%
  wygr. w down na wszystkich 4 przebiegach) całkowicie kosztem UP
  (0-25% wygr.) — to mogłoby być użyteczne jako SELEKTYWNY hedge
  włączany tylko w reżimie spadkowym (dziś hedge działa cały czas),
  ale to już propozycja nowego eksperymentu, nie coś do wdrożenia z
  tych danych. `hedge(excess)` nie ma wyraźnej przewagi nad zwykłym
  trend-exit nigdzie poza jednym oknem z małą próbą.
  Commit+push zrobiony. Ruszam zestaw (B+C) `next`: 6 pul.

- [CC-Win→Fable, 26.08 ~17:1x] **ZESTAW (B+C) NEXT, para 1/3:
  `base-weth-usdc-030` 365d+720d. Wzorzec cash100/FlatOnly SPÓJNY na
  obu oknach — czyta się jak lustro reżimu, nie jak przewaga.**
  (Uwaga interpretacyjna z HANDOFF zastosowana: cash100 = benchmark
  "nic nie robię w quote", FlatOnly względem NIEGO, nie względem HODL.)
  365d: `100% quote` +3.32 śr./52%/-9.15 globalnie — ALE down 100%
  wygr. (+11.97 śr., best +22.19!) i up 0% wygr. (-6.47 śr.) — całość
  to czysta zamiana beta↔cash, żadna "przewaga". FlatOnly warianty
  (k=2/k=3, różne progi gap) leżą MIĘDZY cash100 a pełnym LP, jak
  oczekiwano z designu. `Adapt k=3+trend(re>ema)` normalny: 52%/-1.83
  — dużo lepszy worst niż cash100/FlatOnly (-9…-22!), ale niższe %wygr.
  720d (47 okien): TEN SAM wzorzec, silniejszy — cash100 down 100%
  wygr./+11.94 śr., up 0%/-13.04 śr., worst globalnie -21.91 (!).
  upConfirm (6h/12h potwierdzenia sygnału up) NIE POMAGA — upConf=6h/
  12h mają NIŻSZE %wygr. (23-26%) niż zwykły upX bez potwierdzenia z
  serii RECAL (39-57% na tej samej puli) — opóźnienie sygnału kosztuje
  więcej niż chroni, przeciwnie do intencji "next".
  Zero przejść bramki. Commit+push. Ruszam parę 2/3: `base-cbbtc-weth-005`
  365d+720d (UWAGA: na cbBTC "cash" = WETH nie USDC — beta ZOSTAJE,
  inna interpretacja niż ETH/stable).

- [CC-Win→Fable, 26.08 ~17:2x] **NEXT para 2/3: `base-cbbtc-weth-005`
  365d+720d. Wzorzec ŁAGODNIEJSZY niż ETH/stable (beta WETH nie
  znika w up, tylko cash100/FlatOnly jej NIE ŁAPIĄ dodatkowo).**
  365d (23 okna, up2/down2/flat19): cash100 +0.99/57%/-5.34 (down
  100% wygr./+6.68 śr., up 0%/-5.25 śr. — mimo że WETH samo w sobie
  rosło w tych 2 oknach up, cash100 tego nie łapie, bo "quote"=WETH
  ale strategia stoi w cash zamiast w LP+WETH). FlatOnly warianty
  MOCNO lepszy worst niż na ETH/stable: -2.2…-3.2 (nie -9…-22!) —
  cbBTC/WETH ma mniejszy rozjazd cena/zakres niż ETH/USDC.
  720d (46 okien, up5/down12/flat29): podobnie, cash100 -14.10 śr. w
  up (0% wygr.), +7.66 śr. w down (100% wygr.). **CIEKAWOSTKA:
  `FlatOnly k=2 |gap|<3%/24h→LP,>6%→cash` ma recent90 100% wygr.**
  (4/4 okna, śr. +0.41) — jedyny wariant next z pełnym recent90 na
  tej puli, ale próbka mała (4 okna), nie interpretować jako sygnał.
  upConfirm nadal nie pomaga (podobnie jak na base-030).
  Zero przejść bramki. Commit+push. Ruszam pojedyncze próby zamykające
  next 5/6 i 6/6: `mainnet-usdc-weth-005-720d`, potem
  `arbitrum-weth-usdc-005-720d`.

- [CC-Win→Fable, 26.08 ~18:0x] **ZESTAW (B+C) NEXT ZAMKNIĘTY —
  5/6 mainnet + 6/6 arbitrum (720d), oba wzorzec identyczny do reszty
  zestawu, zero niespodzianek. PODSUMOWANIE CAŁEGO ZESTAWU (6
  przebiegów, 3 pule × 2 okna):**
  mainnet-720d: cash100 down 100% wygr./+7.66 śr., up 0%/-14.10 śr.
  arbitrum-720d: cash100 down 100% wygr./+12.86 śr. (best +20.58!),
  up 0%/-12.90 śr. — najbardziej skrajny rozjazd (worst -22.67).

  **WNIOSKI OGÓLNE ZESTAWU NEXT:**
  1. **Zero przejść bramki na 6/6 przebiegów.**
  2. **cash100/FlatOnly = LUSTRO REŻIMU, nie przewaga algorytmiczna** —
     100% wygr. w down (śr. +7…+13!), 0% wygr. w up (śr. -5…-19),
     na WSZYSTKICH 3 pulach niezależnie od okna. To matematyczna
     konsekwencja definicji (stoisz w quote = zyskujesz gdy base
     spada, tracisz gdy rośnie), nie sygnał, że "FlatOnly działa" —
     tak samo działałoby zawsze stać w cash.
  3. **upConfirm (6h/12h potwierdzenia sygnału) NIE POMAGA NIGDZIE**
     (testowany na 4/6 przebiegów) — systematycznie OBNIŻA %wygr.
     względem zwykłego upX bez potwierdzenia (z serii RECAL) — 13-43%
     zamiast 39-61%. Opóźnienie sygnału trendu kosztuje więcej niż
     chroni na wszystkich testowanych pulach. WNIOSEK: kierunek
     "wolniejszy sygnał UP" z DECYZJE pkt 11f.d NIE POTWIERDZONY tymi
     danymi — przeciwnie, szybszy/prostszy sygnał (bez potwierdzenia)
     wypada lepiej.
  4. **cbBTC/WETH ma łagodniejszy profil niż ETH/stable** (worst
     -2…-3 zamiast -9…-22) — mniejszy rozjazd cena/zakres, spójne z
     obserwacją z serii RECAL i fullperiod.
  5. share=80% (histereza jako udział czasu zamiast "dotknięcie
     zeruje licznik" — pkt 2 DECYZJE z 21.08) daje wyniki PRAKTYCZNIE
     IDENTYCZNE ze zwykłym h=24h wszędzie — nie widać różnicy w tym
     zakresie parametrów; być może trzeba przetestować bardziej
     agresywny próg udziału (np. 50-60%) żeby zobaczyć efekt.
  Commit+push (results mainnet+arbitrum). Ruszam (D) parking:
  `arbitrum-usdc-usdt-001` fullperiod.

- [CC-Win→Fable, 26.08 ~18:1x] **(D) PARKING ZROBIONE:
  `arbitrum-usdc-usdt-001` fullperiod $5k/372d.** Cena bazy 1.00→1.00
  (-0.1%, stablecoin — jak oczekiwano). WSZYSTKIE strategie płasko
  $4,999-$5,000 (±$1), fees $1 CAŁKOWICIE na 372 dni — **realny APR z
  fees ≈ 0% w tym konkretnym oknie** (nie 3-5%/rok jak szacowano w
  DECYZJE pkt 5 dla parkingu na Aave — to inny produkt, ale i sama
  pula USDC/USDT ma dziś minimalny wolumen/fee w tym oknie). Zero
  rebalansów u nikogo (100% inRange cały czas — para 1:1 rzadko
  wychodzi z ciasnego zakresu). WNIOSEK: ta konkretna pula NIE jest
  źródłem realnego yieldu na fees w obecnym oknie — jeśli parking ma
  sens, to raczej przez Aave/inny produkt niż przez samą obecność w
  tej puli LP. Brak commitu JSON (fullperiod nie zapisuje plików).
  Ruszam rotację: przebieg 1/2 (domyślna piątka 365d).

- [CC-Win→Fable, 26.08 ~18:2x] **ROTACJA 1/2: domyślna piątka
  365d. WYNIK UDERZAJĄCY — 100% USDC BIJE WSZYSTKO, W TYM ORACLE.**
  5 pul (mainnet-005/030, base-030/005, arbitrum-005), wspólne okno
  372 dni, $5000 start. Dwa warianty silnika (naive30 = prosty exit,
  v11 = zamrożony profil produkcyjny):

  **naive30:** ORACLE (znająca przyszłość 7d z góry!) $5,352 (+7.0%,
  41 przeskoków, koszty $812) — jedyny wariant NA PLUSIE. `100% USDC`
  $5,000 (0%) — DRUGI najlepszy, bije WSZYSTKIE 4 warianty rotacji
  ORAZ wszystkie 5 pojedynczych pul (-9.3% do -33.7%)! Rotacja wg
  progów (Δ>10pp/72h itd.) $3,500-3,741 — GORSZA niż najlepsza
  pojedyncza pula (base-030 solo -9.3%) — koszty przeskoków ($48-131)
  + zły timing przeskoków więcej kosztują niż daje wybór lepszej puli.

  **v11 (profil produkcyjny) — JESZCZE GORZEJ: nawet ORACLE PRZEGRYWA
  ze 100% USDC.** ORACLE $3,840 (-23.2%, 48 przeskoków, koszty $837)
  — górna granica wartości rotacji jest UJEMNA względem cash! `100%
  USDC` $5,000 (0%) to NAJLEPSZY wynik w całej tabeli v11 — bije
  wszystko, dosłownie każdą strategię aktywną. Wszystkie single-pool
  i rotacyjne warianty -16% do -25%.

  **WNIOSEK KLUCZOWY (zgodny z DECYZJE 11f — "365d to rok bez bulla"):
  na tym oknie 365d żadna forma LP ETH/stable — pojedyncza pula,
  rotacja między pulami, nawet TEORETYCZNIE OPTYMALNA rotacja z
  wiedzą przyszłości — nie biła zwykłego trzymania USDC.** Wartość
  wyboru puli (silnik fees, oczyszczony z kierunku rynku — uwaga w
  konsoli: "ta sama beta") jest realna (ORACLE $5,352 vs najgorsza
  solo $3,313 w naive30 — $2000 różnicy), ale to wciąż strata
  bezwzględna, bo IL/koszty na tym oknie przebijają fees. Rotacja
  progowa (nie-oracle) jest GORSZA niż zostanie w jednej najlepszej
  puli — koszty przeskoków + realistyczne (nie przyszłościowe) sygnały
  nie nadążają za zmianami. Brak JSON output (rotation.ts nie zapisuje
  plików, tylko stdout). Ruszam przebieg 2/2: 3 pule 720d.

- [CC-Win→Fable, 26.08 ~18:3x] **ROTACJA 2/2: 3 pule 720d (base-030,
  mainnet-005, arbitrum-005). ZAMYKA CAŁĄ KOLEJKĘ oprócz finalnego
  KROK 2.** Wspólne okno 721 dni, $5000 start.

  **naive30 — RÓŻNICA vs 365d: ORACLE wychodzi NA PLUS** (+17.1%,
  $5,854, 84 przeskoki/$1890 kosztów) — 720d łapie bulla z 2024,
  teoretyczna górna granica rotacji jest dodatnia. ALE `100% USDC`
  wciąż DRUGI najlepszy (0%) i bije WSZYSTKIE realistyczne strategie —
  single-pool -3.6% do -26.5%, rotacja progowa -28…-30% (koszty
  przeskoków $317-424 + zły timing).

  **v11 (profil produkcyjny) — WZORZEC Z 365d SIĘ POWTARZA: 100%
  USDC znów NAJLEPSZY, bije nawet ORACLE.** `100% USDC` 0% > ORACLE
  -8.1% ($4,596, 85 przeskoków/$1681 kosztów — nawet ze znajomością
  przyszłości v11 traci na fees+koszty vs cash) > wszystkie
  single-pool (-6.5% do -21.4%) > rotacja progowa (-26…-28%).

  **WNIOSEK FINALNY ROTACJI (2 okna × 2 warianty = 4 tabele,
  spójny przekaz):** różnica między naive30 i v11 pokazuje, że to
  KONKRETNY SILNIK strategii (nie sam fakt bycia w LP) decyduje, czy
  jest szansa na plus — naive30 (prostszy, mniej kosztowny w
  rebalansach) łapie górę cyklu na 720d, v11 (nasz produkcyjny,
  droższy w koszty transakcyjne) nie łapie NIGDZIE, nawet z wiedzą
  przyszłości. **Rotacja progowa MIĘDZY pulami ETH/stable jest
  konsekwentnie NAJGORSZYM wyborem na obu oknach i obu silnikach** —
  koszty przeskoków ($317-1890) przebijają wartość wyboru lepszej
  puli. Praktyczna rekomendacja z tych danych: NIE budować
  automatycznej rotacji między pulami ETH/stable — to strata; wybór
  puli RAZ (nie dynamicznie) + silnik z niższymi kosztami transakcyjnymi
  ma większą szansę niż jakikolwiek mechanizm przeskoków.
  Ruszam finalny KROK 2 (`npm run pipeline -- --only backtest`) —
  ostatni punkt całej dzisiejszej kolejki.

- [CC-Win→Fable, 26.08 ~17:5x] **FINALNY KROK 2 ZAMKNIĘTY — SUKCES.
  ZAMYKA CAŁĄ POPOŁUDNIOWĄ KOLEJKĘ** (kandydat 720d + fullperiody ×5 +
  hedge ×4 + next ×6 + parking + rotacja ×2 + ten KROK 2 = 19
  przebiegów po porannym KROK 0+1+2). `backtest-run` 16:21:05→17:48:16
  UTC (**1h27min**, szybciej niż poranny 1h45min), `backtest-selection`
  OK, `sweep-base030` OK. **"porażki: BRAK".** Peak RSS: **9204 MB**
  (limit 12288, zapas 25% — stabilnie względem porannego pomiaru
  9032MB). Pełny cache przywrócony (kandydat z powrotem w data/cache/),
  wszystko liczy się poprawnie z pełnym zestawem pul.
  Pull paczki #4 odebrany w międzyczasie — RUNDA FINAŁOWA NA NOC
  (WF_SET=final + FP_SET=final, decyzja Rafała po wieczornej dyskusji,
  ostatnia runda przed decyzją o losie projektu). Rafał śpi do 10:30
  jutro, autoryzował pełną autonomię decyzyjną na noc. Ruszam.

- [CC-Win→Fable, 26.08 ~20:1x] **RUNDA FINAŁOWA (paczka #4), para 1/4:
  `base-weth-usdc-030` 365d+720d. Nowe strategie passiveW i
  FlatOnly-HODL ocenione wg kryteriów Fable.**

  **FlatOnly-HODL (kryterium: flat≥65% wygr., up/down REMIS, worst>-3):**
  365d: flat 48-60% (NIE osiąga 65%), worst -1.19…-2.73 (✓ >-3).
  720d: flat 32-58% (NIE osiąga 65%, gorzej niż 365d), worst -1.38…
  -2.53 (✓ >-3 na obu oknach). up/down: winPct niski (0-40%), ALE
  śr. vsHODL BLISKO ZERA (-0.14…-0.84 na 720d, -0.06…-0.77 na 365d)
  — jeśli "remis" czytać jako "śr. blisko 0" (małe realne odchylenie
  od czystego HODL), to KRYTERIUM SPEŁNIONE mimo słabego winPct
  (asymetria rozkładu: dużo małych ujemnych + rzadkie duże dodatnie
  wygrane). **WERDYKT: worst PRZECHODZI na obu oknach, flat NIE
  przechodzi (spada z 60%→32-58% na dłuższym oknie — kierunek zły),
  up/down REMIS spełniony po śr., nie po winPct.** Częściowe
  spełnienie kryteriów — nie pełne przejście.

  **passiveW (Pasywny ±40/50/60%)** — oceniany głównie fullperiodem
  (osobno), tu tylko worst/maxDD z walkforward: 365d worst -9.33…
  -13.74 (znacznie GORZEJ niż FlatOnly), 720d worst -9.74…-13.46 —
  szeroki pasywny ma dobry %wygr. globalny (60-70%) ale REKORDOWO
  zły worst w down (dziedziczy problem "za wąski zakres = ZA
  SZEROKI teraz w drugą stronę"? Nie — to nadal węższy niż idealny,
  ale i tak najgorszy worst z całej rundy dotąd). Kluczowa ocena
  będzie z fullperiod.
  Commit+push. Ruszam parę 2/4: `mainnet-usdc-weth-005` 365d+720d.

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

(Paczki #1 i #2 wypchnięte — b5a6131, de307c8. Dzięki za merge'e.)

- [Fable→CC-Mac, 26.08 ~20:xx — PACZKA #4 (runda finałowa)] Commit+push:
  backtest/strategies.ts (passiveW ±w%; flatOnlyLP z opcją idle:'hodl' —
  wariant Rafała "baza HODL 50/50, LP tylko we flat"),
  backtest/walkforward.ts (WF_SET=final — smoke OK),
  backtest/fullperiod.ts (FP_SET=final), HANDOFF.md, CONTEXT.md,
  DECYZJE-2026-08-26.md. Komunikat: "feat(backtest): final round —
  flatOnly-HODL + wide-passive family". Po pushu ping CC-Win.

- [Fable→CC-Mac, 26.08 ~15:xx — PACZKA #3] Commit+push:
  backtest/run.ts (wykluczenie `cand-*` z dziennego skanu cache —
  odpowiedź na incydent CC-Win z KROK 2; jawne `--only cand-...`
  nadal działa), backtest/rotation.ts (NOWY — backtest dynamicznej
  rotacji multi-pool wg TASKS-ROTATION; smoke na 90d w kontenerze OK),
  HANDOFF.md (higiena — odebrane raporty skasowane), CONTEXT.md.
  Komunikat: "fix(backtest): exclude cand-*; feat: rotation backtest".
  Po pushu ping do CC-Win.

## @CC-Win (Claude Code od botów windowsowych)
> (KROK 0 i KROK 1 [seria RECAL 9/9] ZROBIONE i odebrane przez Fable —
> dzięki, wzorowa robota, w tym samodzielny recent90 i dyscyplina
> "crash → notatka → dalej". KROK 2 w toku po incydencie cand-*.
> Wpis o incydencie odebrany; decyzja: cand-* wykluczone z run.ts
> (fix w paczce #3), Twoja kwarantanna była słuszna.)

- [Fable→CC-Win, 26.08 ~15:xx — po pullu paczki #3] DOLICZYĆ brakujący
  przebieg kandydata: (1) przenieś cache z `data/cache-quarantine/`
  z powrotem do `data/cache/` (fix tick-clamp w engine jest w main od
  paczki #2, a od paczki #3 run.ts ignoruje cand-* — kwarantanna
  zbędna, katalog można skasować); (2) `WF_SET=recal SIGMA_MODE=grid15
  NODE_OPTIONS=--max-old-space-size=12288 npx tsx
  backtest/walkforward.ts cand-base-weth-cbbtc-030-720d 30 15` +
  raport z recent90 jak przy pozostałych.
- [Fable→CC-Win, 26.08] Weryfikacje zaległe z KROK 0 przy okazji
  następnego wpisu: (a) `state.json.gasUsd` wypełnione liczbami
  (mainnet ~$0.5–3)? (b) test "Odrzuć" — po kliku Rafała w UI linia
  "proposal …: odrzucona (komenda z UI)" w observer.log w ≤30 s.
- [Fable→CC-Win, 26.08 ~20:xx — **RUNDA FINAŁOWA NA NOC** (po pullu
  paczki #4; decyzja Rafała po wieczornej dyskusji — to OSTATNIA runda
  eksperymentów przed decyzją o losie projektu; wszystko automatycznie,
  jeden proces naraz, NIE kolidować z oknem automatu 05:30–08:25):]
  Env: `WF_SET=final SIGMA_MODE=grid15
  NODE_OPTIONS=--max-old-space-size=12288`. Zestaw = wide-passive
  (±40/50/60 + naiwny ±50) + FlatOnly z bazą HODL 50/50 (4 warianty)
  + referencje hodl/v1.1.
  1–8. walkforward 30/15 dla: base-weth-usdc-030-{365d,720d},
     mainnet-usdc-weth-005-{365d,720d}, arbitrum-weth-usdc-005-{365d,
     720d}, base-cbbtc-weth-005-{365d,720d}.
  9–12. `FP_SET=final SIGMA_MODE=grid15 npx tsx backtest/fullperiod.ts
     <id> 5000` dla czterech pul *-720d.
  KRYTERIA ODCZYTU (do raportu): FlatOnly-HODL — we flat ≥65% wygr.
  vsHODL, w up/down REMIS (±1 p.p. traktować jako remis, nie
  przegraną!), worst > −3, fullperiod ≥ HODL. Wide-passive —
  fullperiod ≥ HODL na 4/4, w oknach worst > −3 vs HODL, maxDD ≈ HODL.
  Raporty parami jak dziś + recent90; commit results. To zamyka
  kolejkę — po tym tylko nocny automat.

- [Fable→CC-Win, 26.08 ~16:xx — ROTACJA (po pullu paczki #3), dopisać
  NA KONIEC kolejki, po (D)]: `backtest/rotation.ts` — rotacja między
  pulami ETH/stable (ta sama beta — test czystej wartości wyboru puli).
  Dwa przebiegi:
  1. 365d, oba warianty in-pool:
     `SIGMA_MODE=grid15 NODE_OPTIONS=--max-old-space-size=12288 npx tsx
     backtest/rotation.ts 5000` (defaultowa piątka *-365d);
  2. 720d (3 pule z cache):
     `... npx tsx backtest/rotation.ts 5000 base-weth-usdc-030-720d
     mainnet-usdc-weth-005-720d arbitrum-weth-usdc-005-720d`.
  Wyjście stdout do raportu @Fable. Smoke Fable (90d, 3 pule): nawet
  ORACLE przegrywa z single-pool przez koszty przeskoków ($163 przy
  8 hopach) — pełne okna zweryfikują, czy to się utrzymuje.

- [Fable→CC-Win, 26.08 ~13:xx] **SYMULACJE PEŁNOOKRESOWE $5k** (pytanie
  Rafała "co by się stało z $5k przez 2 lata") — nowy skrypt
  `backtest/fullperiod.ts` (w paczce #2): jedna pozycja od początku
  serii, procent składany; tabela koniec$/PnL/fees/koszty/rebalanse/
  vsHODL + odniesienie 100% USDC. Odpalić po serii recal (szybkie,
  ~połowa czasu walkforwardu), dla KAŻDEGO id:
  `SIGMA_MODE=grid15 NODE_OPTIONS=--max-old-space-size=12288 npx tsx
  backtest/fullperiod.ts <id> 5000` — ids: base-cbbtc-weth-005-720d,
  base-weth-usdc-030-720d, arbitrum-weth-usdc-005-720d,
  mainnet-usdc-weth-005-720d, cand-base-weth-cbbtc-030-720d (po fixie
  clampa). Wyjścia (stdout) wkleić do raportu w @Fable — tabela dla
  Rafała wprost, NIE do bramki. Smoke Fable na Macu (stary cache
  cbBTC-365d): HODL pary −51.5%, wszystkie warianty ≈ HODL ± $230,
  100% USDC wygrywa o $2.5k — działa i uczciwie pokazuje betę.

- [Fable→CC-Win, 26.08 ~14:xx — DECYZJA RAFAŁA "testujemy wszystkie 4
  kierunki". Po pullu paczki #2 dołożyć do kolejki, PO serii recal,
  w tej kolejności; wszystko automatycznie:]
  **(A) HEDGE / delta-neutral na grid15:**
  1. `npx tsx scripts/fetch-funding.ts ETHUSDT 750` (dane funding 720d)
  2. `WF_SET=hedge SIGMA_MODE=grid15 NODE_OPTIONS=--max-old-space-size=12288`
     → walkforward dla: base-weth-usdc-030-365d, base-weth-usdc-030-720d,
     mainnet-usdc-weth-005-365d, mainnet-usdc-weth-005-720d (tylko
     ETH/stable — hedge nie gra na cbBTC).
  **(B+C) Zestaw `next` (flat-only default-cash + histereza share +
  upConfirm; NOWY kod w paczce #2):**
  `WF_SET=next SIGMA_MODE=grid15 ...` → walkforward dla:
  base-weth-usdc-030-365d, base-weth-usdc-030-720d,
  base-cbbtc-weth-005-365d, base-cbbtc-weth-005-720d,
  mainnet-usdc-weth-005-720d, arbitrum-weth-usdc-005-720d.
  UWAGA interpretacyjna do raportu: rodzinę FlatOnly i cash100 czytać
  względem SIEBIE (cash100 = benchmark "nic nie robię w quote"), nie
  względem HODL; na pulach cbBTC "cash" = WETH (beta zostaje).
  **(D) Parking bez bety:** `SIGMA_MODE=grid15 npx tsx
  backtest/fullperiod.ts arbitrum-usdc-usdt-001 5000` (realny APR fees
  stable/stable — 1 przebieg, szybki).
  Raporty jak przy recal (tabele + recent90 dla walkforwardów) do
  @Fable, commit results parami. Kolejność ogólna: dokończ recal →
  fullperiody → (A) → (B+C) → (D) → KROK 2 (--only backtest). Nocny
  automat 05:30 i tak przeliczy swoje — nie kolidować (jeden proces
  ciężki naraz; jak przebiegi wejdą w okno 05:30-08:25, wstrzymać się
  do końca pipeline'u).
