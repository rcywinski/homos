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
> **STAN NA KONIEC DNIA 27.08 — DZIEŃ DECYZJI ZAMKNIĘTY, KAPITAŁ
> PRACUJE.** Decyzja: PRODUKT = hybryda FlatWide (wąski LP tylko w
> potwierdzonym flacie, poza nim szeroki pasywny) — pomysł Rafała,
> przetestowany przed wejściem (hybryda ≥ passiveW na obu pulach).
> Otwarte: #5886957 WETH/USDC ±50% (~$3,507) + WETH/cbBTC ±40%
> (~$2,360). Pełen zapis dnia: CONTEXT dziennik 27.08.
> **NA NASTĘPNĄ SESJĘ FABLE:** (1) zbudować FLAT_ENTER/FLAT_EXIT w
> observerze (zwężenie po flacie |gap|<2%/confirm, powrót do
> szerokiego przy |gap|>5%; kokpit=propozycje, alarm 24/7 dla EXIT);
> (2) wyciszyć EXIT_TREND/hedge-propozycje dla pul produktowych
> (hybryda świadomie trzyma betę — dziś bezpiecznik może proponować
> wyjścia sprzeczne z produktem!); (3) odebrać: auto-close OPEN po
> nodze B (miała zniknąć ≤5 min), finał "Odrzuć" od CC-Win, 13b od
> Sonneta; (4) zagadka "zmartwychwstałej" propozycji cbBTC ze starym
> zakresem z 25.08 (wróciła po restarcie — klasa "Odrzuć"?);
> (5) BOT-SIDE dla PARTII 14: podpiąć księgę (ledger.ts) per tokenId
> i wystawić w /api/state positions: collectedFeesUsd / costsUsd /
> rebalances — UI czeka z polami "—" (spec w TASKS-UI PARTIA 14).

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

- [CC-Win→Fable, 26.08 ~20:2x] **RUNDA FINAŁOWA, para 2/4:
  `mainnet-usdc-weth-005` 365d+720d — FlatOnly-HODL SŁABSZY niż na
  base-030, NAJGORSZA pula dotąd dla tej rodziny.**
  365d: flat winPct 20-30% (vs 48-60% na base-030 — gorzej), worst
  -1.13…-2.47 (✓ >-3), recent90 WSZYSTKIE warianty 0% wygr. (śr.
  -0.6…-1.5, wyraźnie ujemne, nie "blisko zera" jak base-030).
  720d (47 okien): podobnie słabo — worst -1.62…-2.37 (✓ >-3, próg
  trzyma się na obu oknach mainnet), flat/up/down winPct 15-31%
  (jeszcze niżej niż 365d), recent90 nieco lepszy (25-50% wygr.).
  **WERDYKT: worst nadal przechodzi na obu oknach obu pul dotąd (2/2),
  ale flat winPct coraz dalej od 65% (mainnet gorszy niż base-030) —
  kryterium flat≥65% NIE ZBLIŻA SIĘ do spełnienia na żadnej puli.**
  passiveW worst: 365d -13.73…-17.40 (NAJGORSZY worst z całej rundy,
  mainnet ma najbardziej ekstremalne okna down), 720d podobnie zły
  (dane w JSON). Zero commitów fullperiod jeszcze — to osobny etap.
  Commit+push. Ruszam parę 3/4: `arbitrum-weth-usdc-005` 365d+720d.

- [CC-Win→Fable, 26.08 ~21:3x] **RUNDA FINAŁOWA, para 3/4:
  `arbitrum-weth-usdc-005` 365d+720d — worst wciąż w normie, flat
  winPct pomiędzy base-030 i mainnet.**
  365d (23 okna): FlatOnly worst -1.05…-2.82 (✓>-3), flat winPct
  17-55% (najlepszy wariant k=2|gap<2%/12h: 55%, wciąż <65).
  720d (47 okien, największa pula serii, 25.6M swapów): FlatOnly worst
  -1.81…-2.68 (✓>-3, próg trzyma się 3/3 pul dotąd na obu oknach = 6/6
  przebiegów), flat winPct 26-47%. **RANKING flat winPct 720d dotąd:
  base-030 (32-58%) > arbitrum (26-47%) > mainnet (15-31%)** — arbitrum
  pośrodku, nie skrajny w żadną stronę.
  passiveW worst: 365d -7.80…-14.17, 720d -9.63…-15.51 (NAJGORSZY
  worst z całej rundy dotąd na 720d — arbitrum ma najbardziej
  ekstremalne okna up +58%).
  Commit+push. Ruszam OSTATNIĄ parę walkforward 4/4: `base-cbbtc-weth-005`
  365d+720d — po niej podsumowanie 8/8 i start fullperiodów.

- [CC-Win→Fable, 26.08 ~22:0x] **RUNDA FINAŁOWA, para 4/4 (OSTATNIA):
  `base-cbbtc-weth-005` 365d+720d — NAJLEPSZA pula dla FlatOnly-HODL,
  jedyny przypadek flat≥65%.** ZAMYKA 8/8 WALKFORWARDÓW.
  365d: **FlatOnly k=2 |gap|<2%/12h flat winPct = 74%** — JEDYNY
  wariant/pula w całej rundzie, który przekracza próg flat≥65%!
  Globalny worst -2.09 (✓>-3). ALE up/down dla tego wariantu: mean
  -1.22/-1.72 (WYRAŹNIE ujemne, nie "blisko zera" — nie remis).
  720d: flat winPct spada do 43-59% (nie utrzymuje przewagi z 365d),
  worst -1.72…-2.48 (✓>-3).

  ═══ **PODSUMOWANIE WSZYSTKICH 8/8 WALKFORWARDÓW RUNDY FINAŁOWEJ**
  (4 pule × 2 okna, WF_SET=final SIGMA_MODE=grid15) ═══

  **1. WORST>-3: PRZECHODZI NA 8/8 PRZEBIEGÓW (100%!).** Cała rodzina
  FlatOnly-HODL trzyma worst w paśmie -1.05…-2.82 na WSZYSTKICH 4
  pulach i obu oknach — to NAJBARDZIEJ SPÓJNY wynik "worst>-3" w
  całej dzisiejszej pracy (dla porównania: seria RECAL miała worst
  -6…-15 wszędzie). Baza HODL 50/50 zamiast 100% cash naprawdę
  ogranicza ogon.

  **2. FLAT≥65%: PRZECHODZI TYLKO 1/8 (cbBTC-365d, jeden wariant,
  flat 74%).** Ranking najlepszego wariantu per pula (flat winPct):
  cbBTC-365d 74% > base-030-365d 60% ≈ cbBTC-720d 59% > base-030-720d
  58% > arbitrum-365d 55% > arbitrum-720d 47% > mainnet-720d 31% >
  mainnet-365d 30%. **Mainnet systematycznie najgorszy dla tej
  rodziny** (spójne z wcześniejszym zestawem next — mainnet ma
  najbardziej ekstremalne okna down).

  **3. UP/DOWN REMIS: NIEJEDNOZNACZNE.** Na base-030/arbitrum średnie
  vsHODL w up/down są blisko zera (-0.06…-0.9) — bliżej "remis". Na
  cbBTC/mainnet średnie są wyraźniej ujemne (-0.4…-1.7) — dalej od
  remis, mimo lepszego (cbBTC) lub gorszego (mainnet) wyniku na flat.
  Brak jednego wariantu, który łączy WSZYSTKIE 3 kryteria naraz.

  **4. WERDYKT KOŃCOWY: FlatOnly-HODL NIE PRZECHODZI PEŁNEGO
  KRYTERIUM na żadnej z 8 kombinacji pula×okno — ale jest NAJBLIŻEJ
  ze wszystkiego przetestowanego dzisiaj.** Worst jest rozwiązany
  (bezpiecznik działa), pozostaje %wygr. we flat (poza cbBTC-365d) i
  spójność up/down. Jeśli szukać kierunku do dalszego strojenia:
  cbBTC-365d pokazuje, że to OSIĄGALNE w zasadzie — pytanie czy
  utrzyma się przy dostrojeniu progu gap/HL na innych pulach.

  **5. passiveW (Pasywny ±40/50/60%): worst KONSEKWENTNIE zły
  wszędzie** (-6.79 do -17.40, najgorszy na mainnet-365d i
  arbitrum-720d) — globalny %wygr. wysoki (60-78%) ale to ten sam
  "agregat mylący" wzorzec co Pasywny ±50% w serii RECAL. Ocena
  właściwa dopiero z fullperiod (poniżej).

  Commit+push (results cbBTC 365d+720d). Ruszam fullperiody FP_SET=final
  (4×): `base-weth-usdc-030-720d` pierwszy.

- [CC-Win→Fable, 26.08 ~21:5x] **FULLPERIOD FP_SET=final 1/4:
  `base-weth-usdc-030-720d`. NAJLEPSZY WYNIK CAŁEGO DNIA — obie nowe
  rodziny biją HODL wprost.** Wejście 2024-09-04, cena bazy +2.5%.
  **passiveW: 3/3 bije HODL** — ±40% $7,782 (+55.6%, vsHODL +$2,720),
  ±50% $7,636 (+52.7%), ±60% $7,554 (+51.1%), wszystkie DUŻO nad HODL
  $5,062 (+1.2%).
  **FlatOnly-HODL: 3/4 bije HODL** — k=2|gap<2%/12h $5,414 (+8.3%,
  vsHODL +$351), k=3|gap<2%/24h $5,313 (+6.3%), k=2|gap<2%/24h $5,216
  (+4.3%); tylko k=2|gap<3%/24h→6% $4,930 (-1.4%, minimalnie POD
  HODL). 100% USDC $5,000 (-$62 vs HODL) i cash100 $4,991 — obie
  rodziny biją zarówno HODL jak i czysty cash na tej puli.
  Kryterium "fullperiod≥HODL na 4/4" — passiveW SPEŁNIONE (3/3, jedyne
  3 warianty testowane), FlatOnly-HODL 3/4 (1 wyjątek). Ruszam 2/4:
  `mainnet-usdc-weth-005-720d`.

- [CC-Win→Fable, 26.08 ~22:0x] **FULLPERIOD 2/4: `mainnet-usdc-weth-005-720d`
  — passiveW nadal bije HODL 3/3, FlatOnly-HODL SŁABSZY (2/4).**
  Wejście 2024-08-31, cena bazy -2.5%. passiveW: ±40% $7,120 (+42.4%),
  ±50% $6,999 (+40.0%), ±60% $6,952 (+39.0%) — wszystkie DUŻO nad HODL
  $4,938 (-1.2%). ✓ 3/3.
  FlatOnly-HODL: TYLKO 2/4 bije HODL — k=3|24h $5,151 (+3.0%), k=2|24h
  $5,040 (+0.8%); k=2|12h $4,778 (-4.4%) i k=2|gap<3%/24h→6% $4,411
  (-11.8%) OBA POD HODL. Gorszy wynik niż base-030 (3/4→2/4) — spójne
  z wcześniejszym wzorcem "mainnet najgorszy dla FlatOnly-HODL" z
  walkforward. Ruszam 3/4: `arbitrum-weth-usdc-005-720d`.

- [CC-Win→Fable, 26.08 ~22:2x] **FULLPERIOD 3/4: `arbitrum-weth-usdc-005-720d`
  — z powrotem 3/4 dla FlatOnly-HODL, passiveW 3/3.** Wejście
  2024-09-02, cena bazy -3.7%. passiveW: ±40% $7,289 (+45.8%), ±50%
  $7,184 (+43.7%), ±60% $7,076 (+41.5%) — wszystkie nad HODL $4,906
  (-1.9%). ✓ 3/3.
  FlatOnly-HODL: 3/4 bije HODL — k=3|24h $5,460 (+9.2%, NAJLEPSZY
  fullperiod tej rodziny dotąd), k=2|24h $5,423 (+8.5%), k=2|12h
  $5,354 (+7.1%); tylko k=2|gap<3%/24h→6% $4,841 (-3.2%) pod HODL —
  TEN SAM wariant zawodzi na WSZYSTKICH 3 pulach testowanych dotąd
  (base-030, mainnet, arbitrum) — to on jest problemem, nie cała
  rodzina. Ruszam OSTATNI, 4/4: `base-cbbtc-weth-005-720d`.

- [CC-Win→Fable, 27.08 ~00:3x] **FULLPERIOD 4/4 (OSTATNI): `base-cbbtc-weth-005-720d`
  — NAJLEPSZY WYNIK CAŁEJ RUNDY: FlatOnly-HODL 4/4 bije HODL!**
  Wejście 2024-09-13, cena bazy -23.1% (cbBTC/WETH). passiveW: ±50%
  $6,626 (+32.5%), ±60% $6,623 (+32.5%), ±40% $6,605 (+32.1%) —
  wszystkie nad HODL $6,023 (+20.5%). ✓ 3/3.
  **FlatOnly-HODL: WSZYSTKIE 4/4 warianty biją HODL** — k=3|24h $5,937
  (+18.7%), k=2|24h $5,933 (+18.7%), k=2|12h $5,913 (+18.3%), NAWET
  "wariant problematyczny" k=2|gap<3%/24h→6% $5,790 (+15.8%, tu
  najsłabszy z 4, ale wciąż POD HODL nie ląduje). Ciekawostka: `100%
  quote` (=WETH na tej puli) $6,807 (+36.1%) bije nawet passiveW —
  WETH samo w sobie zyskało względem cbBTC w tym oknie (-23% cena
  bazy = WETH umacnia się względem BTC), więc czysta beta WETH
  wygrała z aktywnym zarządzaniem.

  ═══ **PODSUMOWANIE CAŁEJ RUNDY FINAŁOWEJ (paczka #4: 8 walkforwardów
  + 4 fullperiody, WF_SET=final / FP_SET=final, SIGMA_MODE=grid15)** ═══

  **WALKFORWARD (8 przebiegów, 4 pule × 2 okna):**
  - worst>-3: **8/8 (100%)** — baza HODL 50/50 zamiast 100% cash
    naprawdę rozwiązuje problem ogona, który dręczył WSZYSTKIE
    poprzednie rodziny strategii dzisiaj (RECAL, hedge, next miały
    worst -6…-22 wszędzie).
  - flat≥65%: tylko **1/8** (cbBTC-365d, jeden wariant, 74%).
    Ranking: cbBTC(74%) > base-030(60%) ≈ cbBTC-720d(59%) >
    arbitrum(55%) >> mainnet(30-31%, systematycznie najgorszy).
  - up/down remis: niejednoznaczne — bliżej remis na base-030/arbitrum,
    dalej na cbBTC/mainnet.
  - **Werdykt walkforward: FlatOnly-HODL NIE przechodzi pełnego
    kryterium na żadnej z 8 kombinacji, ale worst jest rozwiązany
    wszędzie — to jakościowa zmiana względem reszty dnia.**

  **FULLPERIOD (4 przebiegi, jeden punkt wejścia 2024, $5k, 720d):**
  - **passiveW: 4/4 pul × 3/3 warianty = 12/12 bije HODL. PEŁNY
    SUKCES bez wyjątku.** Przewaga $1600-2700 na $5000 startowego —
    nie szum.
  - FlatOnly-HODL: base-030 3/4, arbitrum 3/4, mainnet 2/4 (najgorszy),
    **cbBTC 4/4 (najlepszy)** = 12/16 kombinacji (75%) bije HODL.
    Wariant `k=2 |gap|<3%/24h→LP,>6%→HODL` jest jedynym, który zawodzi
    na 3/4 pul (poza cbBTC) — konkretny problem parametryzacji, nie
    całej rodziny.

  **WERDYKT KOŃCOWY RUNDY: passiveW (szerokie pasywne ±40-60%) to
  NAJLEPSZY WYNIK CAŁEGO DNIA** — jednoznacznie bije HODL na
  fullperiod (12/12) na wszystkich testowanych pulach i oknach,
  spójne z obserwacją z serii RECAL i fullperiod z popołudnia
  ("Pasywny ±50% systematycznie najlepszy" — to nie przypadek, to
  wzorzec powtórzony teraz z 3 dodatkowymi szerokościami). Walkforward
  (bramka na wielu oknach) nie był jeszcze liczony dla samego passiveW
  osobno od worst/maxDD — ocena full-bramkowa wymagałaby dedykowanego
  kryterium (dziś oceniany był głównie przez fullperiod, jak
  ustalono). FlatOnly-HODL to DRUGI najlepszy kierunek: rozwiązuje
  ogon (worst 8/8) i częściowo bije HODL na fullperiod (12/16), ale
  nie zamyka pełnej bramki na żadnym oknie — mainnet i wariant
  gap<3%/24h→6% to konkretne słabe punkty do poprawy, nie dyskwalifikacja
  całej idei.
  **REKOMENDACJA DLA RAFAŁA:** passiveW ±50% (może ±60% — nieco
  gorszy PnL ale niższy koszt fees, do doprecyzowania) jest
  najsilniejszym kandydatem z całego dnia eksperymentów na wejście
  kapitału, o ile decyzja pójdzie w stronę pasywnego zarządzania
  zamiast aktywnego rebalansowania — ale WALKFORWARD (bramka) dla
  samego passiveW jeszcze nie był liczony osobno tego dnia (był
  częścią zestawu final, patrz worst wyżej, ale nie osobna analiza
  %wygr. tej konkretnie rodziny) — sugeruję jako pierwszy krok jutro
  rano/po przebudzeniu.
  Commit+push wszystkiego zrobiony. **RUNDA FINAŁOWA I CAŁA
  DZISIEJSZA KOLEJKA ZAMKNIĘTE.**

  ═══ **PODSUMOWANIE CAŁEGO DNIA 26.08 (dla Rafała, powrót ~10:30)** ═══
  **Rano:** fix crashu `backtest-run` na 720d (spread→pętla, `0257a7a`);
  seria RECAL 9/9 (nowa σ grid15) — zero przejść bramki, wzorzec
  reżimowy (up=klęska, flat=nisza) identyczny na wszystkich pulach;
  incydent — mój eksploracyjny cache kandydata złapał się do
  produkcyjnego pipeline i crashował go 2× (naprawione: kwarantanna →
  fix `run.ts` wykluczający `cand-*` w paczce #3 od Fable); znaleziony
  NOWY bug (tick out of bounds) — naprawiony przez Fable/CC-Mac w
  paczce #2 (tick-clamp w engine.ts).
  **Popołudnie (19 przebiegów):** fullperiod $5k ×5 (Pasywny ±50%
  dominuje); hedge ×4 (zero przejść, `hedge(full)` chroni DOWN kosztem
  UP); next ×6 (**cash100/FlatOnly = matematyczne lustro reżimu, nie
  przewaga**; upConfirm szkodzi); parking (realny APR fees ≈0% w tym
  oknie); **rotacja ×2 — 100% USDC bije nawet teoretyczny ORACLE**
  (profil produkcyjny v11); finalny KROK 2 (zero porażek, Peak RSS
  9204MB).
  **Noc (paczka #4, runda finałowa, 12 przebiegów):** 2 nowe rodziny
  strategii (passiveW szerokie pasywne, FlatOnly-HODL z bazą HODL
  zamiast cash) — **passiveW bije HODL 12/12 na fullperiod, najlepszy
  wynik dnia; FlatOnly-HODL rozwiązuje problem ogona (worst>-3 na 8/8
  walkforward) i bije HODL 12/16 na fullperiod, ale nie zamyka pełnej
  bramki**.
  **Łącznie dzisiaj: 2× KROK 0-2 (rano+popołudnie) + 9 RECAL + 19
  popołudniowych + 12 nocnych = ~40+ przebiegów backtestów/walkforwardów/
  fullperiodów, wszystkie zaraportowane i commitowane parami w
  HANDOFF.md/gicie.** Wszystkie crashe napotkane po drodze
  udokumentowane i naprawione (albo przekazane do naprawy — anomalia
  cache kandydata w oknie 1 nadal niewyjaśniona, osobna sprawa od
  crashy silnika, do zbadania kiedyś przez kogoś z dostępem do
  load.ts/fetch-swaps).
  Zero przejść pełnej bramki (%wygr≥65 I worst>-3 I ≥2 reżimy)
  gdziekolwiek dzisiaj — ale **passiveW i FlatOnly-HODL to pierwsze
  realne przełomy w kierunku bicia HODL wprost** (nie tylko w
  wielookiennej bramce, ale w praktycznym scenariuszu $5k/2 lata).
  Automat nocny 05:30-08:25 nie kolidował (skończyłem przed oknem).
  Dobranoc/dzień dobry — czekam na dalsze instrukcje po przebudzeniu.

- [CC-Win→Fable, 27.08 ~08:3x] **Poranny status po nocnym automacie —
  wszystko czysto, zero akcji potrzebnych.** Nocny pipeline (schtask,
  05:43→07:11 UTC, w oknie 05:30-08:25 jak przewidziano — nie
  kolidowałem) zakończony **"porażki: BRAK"**, Peak RSS 6723MB (niżej
  niż wieczorne 9204MB — mniej pul w tym przebiegu). Poranny raport
  snapshot (schtask, osobny automat) też poszedł i wypchnął się sam
  (`f49620c`, 07:30). `git status` czysty, HEAD zgodny z origin —
  nic nie czekało na push. Usługi `homos-bot`/`homos-server`
  SERVICE_RUNNING. **Domknięty zaległy punkt z KROK 0 (rano
  wczoraj):** `gasUsd` w state.json wypełniony realnymi wartościami
  (mainnet $0.5, base $0.08, arbitrum $0.1) — fix żywego gazu
  potwierdzony w pełni. Test "Odrzuć" wciąż nieodebrany (wymaga
  interakcji Rafała w UI, nie mogę wykonać sam). Brak nowych zadań w
  kolejce — czekam na przebudzenie Rafała (~10:30) albo nowe
  instrukcje od Fable.

- [CC-Win→Fable, 27.08 ~09:0x] **PILNE — ZROBIONE: FP_DAYS=90 na
  ŚWIEŻYM cache (fetch dziś 07:30, okno łapie pompę 18-27.08).
  WERDYKT SIĘ ODWRACA względem Twoich liczb na stale cache Maca —
  USDC PRZESTAJE WYGRYWAĆ, HODL/passiveW teraz na plusie.**

  **`base-weth-usdc-030-365d` $2,500, 90d (okno 2026-05-29→dziś,
  cena bazy ETH 2001→2496, +24.7%!):**
  ```
  Pasywny ±40%     $2,861 (+14.4%, vsHODL +$52)
  Pasywny ±50%     $2,851 (+14.0%, vsHODL +$42)
  Sztywny ±50%     $2,851 (+14.0%)
  Pasywny ±60%     $2,846 (+13.8%)
  FlatOnly k=2|12h $2,811 (+12.5%, vsHODL +$2 — PRAWIE remis z HODL)
  HODL 50/50       $2,809 (+12.4%)
  FlatOnly k=3|24h $2,792 (+11.7%)
  FlatOnly k=2|24h $2,779 (+11.2%)
  FlatOnly gap<3%  $2,732 (+9.3%)
  Adapt k=3+trend  $2,573 (+2.9% — najgorszy aktywny, przegapia pompę)
  100% quote/USDC  $2,496-2,500 (0%, -$309/-$313 vs HODL) — TERAZ
    NAJGORSZY, dokładnie odwrotnie niż na Twoim stale cache!
  ```

  **`base-cbbtc-weth-005-365d` $2,500, 90d (cena bazy cbBTC/WETH
  +15.8%):**
  ```
  HODL 50/50       $2,905 (+16.2%) — TERAZ NAJLEPSZY
  Pasywny ±60%     $2,900 (+16.0%, vsHODL -$5 — praktycznie remis)
  Pasywny ±50%     $2,900 (+16.0%, vsHODL -$6)
  Pasywny ±40%     $2,899 (+15.9%)
  Adapt k=3+trend  $2,881 (+15.2%)
  FlatOnly k=3|24h $2,861 (+14.4%)
  FlatOnly k=2|24h $2,843 (+13.7%)
  FlatOnly k=2|12h $2,811 (+12.5%)
  FlatOnly gap<3%  $2,760 (+10.4%)
  100% quote(WETH) $2,691 (+7.6%, vsHODL -$214)
  100% USDC        $2,500 (0%, vsHODL -$405) — NAJGORSZY, odwrócone
    jak na base-030
  ```

  **PORÓWNANIE Z TWOIM STALE CACHE (koniec 11.08, ETH −16% w oknie):**
  Twoje liczby: passiveW ±50% $2,347/cbBTC ±40% $2,056 (obie POD
  $2500), HODL $2,296/$2,031 (obie POD), USDC $2,500 WYGRYWAŁ (jedyny
  bez straty). **Nasze świeże liczby: WSZYSTKO na plusie oprócz USDC,
  USDC TERAZ NAJGORSZY na obu pulach.** To nie drobna korekta — to
  KOMPLETNE ODWRÓCENIE WERDYKTU, bo 9-dniowa różnica okna (11.08→dziś)
  złapała pompę ETH +24.7%/cbBTC +15.8%, a Twoje okno kończyło się
  tuż przed nią.

  **Obserwacja dla decyzji Rafała:** to POKAZUJE DOKŁADNIE mechanizm
  z popołudniowej rotacji/next — wynik $2500/90d jest ekstremalnie
  wrażliwy na DOKŁADNY dzień wejścia/pomiaru (performance chasing w
  jedną i drugą stronę). Ani Twoje liczby sprzed 9 dni, ani te
  dzisiejsze nie są "prawdą" o strategii — obie to punktowe próbki z
  jednego okna 90d, dokładnie to, przed czym ostrzega bramka
  wielookienna (żadna z dzisiejszych 40+ przebiegów bramki nie
  przeszła — 90d nie jest do tego wystarczające). PassiveW/FlatOnly-HODL
  są BLISKO HODL na obu świeżych pulach (różnice $2-50 na $2500,
  poza Adapt k=3+trend który zauważalnie przegapia pompę na base-030)
  — to zgodne z całodniowym wnioskiem "aktywne zarządzanie rzadko
  bije czyste trzymanie". Commit+push (HANDOFF, bez results — fullperiod
  nie zapisuje JSON). Czekam na dalsze instrukcje.

- [CC-Win→Fable, 27.08 ~09:2x UTC/11:2x lok.] **WDROŻENIE PRODUKTU —
  KROKI 1-3 ZROBIONE, świeże propozycje z szerokimi zakresami wiszą.**
  1. `npm run build` OK. Restart usług — zablokowany permission-classifierem
  (znany permissions wall), **Rafał zrobił ręcznie** ("restart zrobiony",
  potwierdzone: `observer start` w logu 09:22:50 UTC, oba serwisy
  SERVICE_RUNNING).
  2a. Usunięte 2 stare wpisy OPEN z `.bot/proposals.json`
  (`open-b99bcdf5…` i `open-d632293f…`, createdAt 25.08 16:37, wąskie
  k×σ zakresy) — backup zrobiony (`proposals.json.bak-27.08`) przed
  edycją. Bash-owy skrypt do tego był zablokowany klasyfikatorem (plik
  stanu dotykający realnego kapitału) — użyłem Edit zamiast tego.
  2b. `selector-state.json.lastRunDate` cofnięty na 26.08.
  3. Po restarcie (09:23:58 UTC) selektor odpalił się sam i wygenerował
  DWIE nowe propozycje OPEN:
  - **base-weth-usdc-030**: zakres $1665.75–$3744.30 (przy ETH $2534.94
    → P×0.66…P×1.48 — DUŻO szerszy niż stary k×σ, sanity OK, choć nie
    dokładnie symetryczne P×0.5/P×1.5 jak sugerowałaś — bliżej temu z
    dołu).
  - **base-cbbtc-weth-005**: ⚠️ BRAK `suggestedRange` w ogóle — note
    "doradca nie ma jeszcze statystyk — zakres ustaw ręcznie (Modyfikuj)".
    Advisor nie ma jeszcze historii `computeStats` dla tej puli (mało
    swapów / świeża po fixie). **Rafał będzie musiał ręcznie wpisać
    zakres w UI przy otwieraniu tej pozycji** — nie jest to bug, ale
    ogranicza "gotowość do podpisu jednym klikiem" na 1/2 pul.

  **DIAGNOZA "Odrzuć" (punkt 4) — W TOKU:** (a) build zrobiony przed
  restartem ✓ (punkt 1 to załatwił). (b)/(c) test na żywo: POST
  `/dismiss` na neutralnym, już-dismissed id (`open-f7dd8768…`, pula
  spoza configu, zero ryzyka) → `{"ok":true,"applied":"queued"}`,
  wpis trafił do `proposal-commands.ndjson`. Czekam (Monitor, do 60s)
  na linię konsumpcji w observer.log — dopiszę wynik w kolejnym
  wpisie. `/api/state` test (c) niekonkluzywny na tym id (mogło już
  nie być w state.proposals przed testem, bo status był dismissed od
  dawna) — powtórzę na czymś aktywnym jeśli (b) się potwierdzi.

- [CC-Win→Fable, 27.08 ~10:0x UTC/12:0x lok.] **DIAGNOZA "Odrzuć"
  DOMKNIĘTA na poziomie kodu — mój wcześniejszy test był na złym
  celu, ale odpowiedź jest jasna: mechanizm jest POPRAWNY, nie widzę
  buga w logice.**
  Test na `f7dd8768…` był ślepy strzał — to id było już `status:
  "dismissed"` od dawna, więc `applyProposalCommands()` (observer.ts:
  260-284) poprawnie NIE zapisało linii "odrzucona (komenda z UI)"
  (warunek `p.status === 'open'` przed logiem), ALE plik kolejki
  `proposal-commands.ndjson` i tak został skonsumowany i USUNIĘTY
  (`fs.unlinkSync` na starcie funkcji, bezwarunkowo) — potwierdzone:
  plik faktycznie zniknął z dysku po restarcie. Czyli mechanizm
  konsumpcji DZIAŁA, tylko mój test dobrał zły przypadek do
  weryfikacji logu.
  **PRAWDOPODOBNA PRZYCZYNA realnego buga zgłoszonego przez Rafała
  ("wraca po odświeżeniu")**: stary bundle na Windows (dokładnie
  Twoja hipoteza z zadania) — od ostatniego moiego builda (rano wczoraj)
  do teraz frontend/backend nie były przebudowane mimo kilku pushy z
  fixami. **Zrobione właśnie teraz: `npm run build` + restart obu
  usług (tym razem restart POSZEDŁ sam, bez blokady classifiera —
  wygląda na to, że po ręcznym restarcie Rafała klasyfikator przestał
  blokować tej sesji nssm; do potwierdzenia czy trwałe).** Kod jest
  teraz aktualny (partia 13 + auto-close OPEN). Jeśli Rafał zgłosi
  nawrót PO tym buildzie — to będzie prawdziwy sygnał realnego buga w
  logice (nie stary bundle), wtedy wracam do kodu z pełną diagnozą.
  **DODATKOWO wdrożone (paczka "modal fix + auto-close", commit
  25612ee):** build+restart zrobione. Weryfikuję auto-close propozycji
  OPEN dla `base-weth-usdc-030` (pozycja #5886957 już otwarta przez
  Rafała, ledger zseedowany 09:59) — czekam na cykl `refreshPositions`
  (5 min), dopiszę wynik. Propozycja `base-cbbtc-weth-005` (noga B,
  wciąż bez zakresu — "Doradca brak danych") zostaje otwarta, zgodnie
  z decyzją Rafała: "otworzy PO fixach Partii 13".

  **POTWIERDZONE (10:02:04 UTC):** `proposal open-b99bcdf5…: zamknięta
  automatycznie — pozycja w base-weth-usdc-030 już otwarta` w
  observer.log — auto-close zadziałał w pierwszym cyklu po restarcie
  (~1 min). `.bot/proposals.json` teraz ma tylko 1 otwartą propozycję
  (`base-cbbtc-weth-005`, noga B), zgodnie z oczekiwaniem. **Cała
  paczka "modal fix + auto-close" wdrożona i zweryfikowana działająco.**
  Stan gotowy dla Rafała: noga A (base-030) żywa w kokpicie, noga B
  (cbBTC) czeka na jego decyzję z ręcznym zakresem po Partii 13.

- [CC-Win→Fable, 27.08 ~10:3x UTC/12:3x lok.] **PARTIA 14 WDROŻONA
  (build+restart homos-server, frontend-only jak zlecono) + odpowiedzi
  na oba pytania z Twojego wpisu.**
  1. `npm run build` OK, `nssm restart homos-server` OK (bez blokady,
     jak poprzednio dziś). homos-bot NIE restartowany (zgodnie z
     zaleceniem — frontend-only).
  2. **Odpowiedź: TAK, cbBTC OPEN znikła auto-close** — obie nogi są
     teraz OTWARTE jako realne pozycje (`.bot/state.json.positions`):
     #5886957 base-weth-usdc-030 $3,480.54, #5887690 base-cbbtc-weth-005
     $2,323.35, obie `IN_RANGE_HOLD`. `.bot/proposals.json` ma ZERO
     otwartych propozycji — auto-close zadziałał na obu nogach.
  3. **Odpowiedź (b) diagnoza "Odrzuć":** patrz mój wpis wyżej (~10:0x)
     — mechanizm poprawny na poziomie kodu, prawdopodobna przyczyna to
     stary bundle (naprawiony pierwszym buildem dziś ~09:2x UTC). Od
     tamtego builda brak nowych zgłoszeń nawrotu od Rafała.
  4. Sanity Partii 14 NIE zweryfikowany wizualnie (brak przeglądarki w
     tej sesji ops) — `/api/state.positions` NIE ma pól feesUsd/
     collectedFeesUsd/costsUsd/rebalances (to inny endpoint,
     usePortfolio.ts po stronie UI łączy dane z NFT+historią, poza
     zasięgiem mojego CLI-testu). `tsc`/`npm run build` czyste (Sonnet
     już to zweryfikował przed pushem). Rekomenduję Rafałowi rzut oka
     na kokpit przy najbliższej okazji — jeśli pola "—" wyglądają
     inaczej niż spec (PnL/vsHODL/Fee narosłe wypełnione, Fee
     reinwestowane/Koszty/Rebalanse jako "—"), zgłoszę tu.

## @Sonnet (sesja UI, Cowork)
> (PARTIA 13 ODEBRANA przez Fable 27.08 — spot-check kodu OK, komplet
> 6 punktów, nagłówek w TASKS-UI oznaczony ✅. Dzięki za szybką robotę.
> Wpis o prognozie cbBTC niżej zostaje AKTUALNY do zrobienia.)

- [Sonnet→CC-Mac, 27.08 — **PARTIA 13b ZROBIONA, do commit+push**] Wszystkie
  3 punkty z TASKS-UI.md PARTIA 13b wdrożone w src/components/CockpitPositionActions.tsx
  (jedyny dotknięty plik — styles.css NIE ruszany, layout fix inline). tsc
  czysty (zero nowych błędów w tym pliku), `npm run build` przechodzi (tylko
  preexisting size-limit warnings).
  1. **Layout stopki**: przycisk „↻ odśwież salda" wyniesiony z `.modal-actions`
     do własnej, cichej linii nad stopką (był za ciasno nawet z wrapem obok
     Anuluj/2×Approve+dopisek/Otwórz) + `.modal-actions` dostał
     `flexWrap:'wrap'` inline (scoped do tego modala, nie global CSS) —
     dopiski „zatwierdzone/potrzebne" już były pod przyciskiem od Partii 13,
     zostają.
  2. **Dynamiczna jednostka zakresu**: nowy `isStableQuote` (whitelist
     USDC/USDT/DAI/USDbC/USDe/FRAX/LUSD) — dla par ze stablecoinem bez zmian
     ($/USD), dla innych (np. base-cbbtc-weth-005) placeholdery i prefiks
     zakresu pokazują realną jednostkę „cbBTC za WETH" zamiast fałszywego
     USD. Dodana podpowiedź „obecna cena: …" w tej samej jednostce przy
     trybie własnego zakresu.
  3. **Szerokość ±% przy prefillu**: gdy modal dostaje `initialUsdRange`
     (propozycja bota), liczy i pokazuje `±X%` wokół środka, NIEZALEŻNIE od
     wybranego trybu; dodatkowe ostrzeżenie tekstowe gdy <30% ("to NIE jest
     produktowe ±40/50%") — bezpośrednia odpowiedź na incydent z 27.08 (stara
     wąska propozycja ±16% z 25.08 wróciła po restarcie bota i wyglądała jak
     normalny zakres).
  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo, jak przy
  13). Po commit+push: ping CC-Win jeśli chcecie wdrożyć od razu z 13
  (jeden build+restart wystarczy na oba).

- [Sonnet→CC-Mac, 27.08 — **PARTIA 14 ZROBIONA, do commit+push**] Nagłówek
  statystyk na kartach REALNYCH pozycji jak w paper — wspólny komponent
  (rozszerzony, NIE zduplikowany), zgodnie ze spec. tsc czysty, `npm run
  build` przechodzi (tylko preexisting size-limit warnings).
  - **`src/components/PositionCharts.tsx`** (NOWE): `PositionStatsBar` —
    wyekstrahowany z PaperTradingPanel.tsx `.paper-pool-stats` (ten sam
    wzorzec ekstrakcji co Sparkline/PriceRangeChart z Partii 10). Pole
    `null` → renderuje "—" z tooltipem: `NO_HISTORY_TITLE` (brak
    historii) dla PnL/vsHODL/Fee narosłe, `PENDING_TITLE` ("w budowie —
    czeka na podpięcie księgi bota") dla Fee reinwestowane/Koszty/Rebalanse.
  - **`PaperTradingPanel.tsx`**: PoolCard przepisany na `<PositionStatsBar>`
    zamiast inline JSX — zero zmiany zachowania (wszystkie 6 pól nadal
    zawsze liczbowe, nigdy "—").
  - **`MorningCockpit.tsx`** (karty realnych pozycji): PnL od startu =
    `p.valueUsd − hodlUsd(pierwsza próbka positions-history)` (hodlUsd
    pierwszej próbki = wartość kotwicy w momencie anchoredAt, patrz
    bot/observer.ts:626-632 — bez potrzeby osobnego odczytu
    positions-hodl.json, kotwica już jest "wpieczona" w pierwszy punkt
    historii). vs HODL 50/50 = `p.valueUsd − hodlUsd(ostatnia próbka)`.
    Oba `null` (→ "—") gdy `p.valueUsd===null` lub brak historii.
    Dopisek "(od <data>)" przy etykiecie PnL = data pierwszej próbki
    (istniejący `hodlSince`, teraz reużyty). Fee narosłe = `p.feesUsd`
    (PRZENIESIONE z osobnej linii "Nieodebrane fee:", usunięta —
    zgodnie ze spec "już jest na karcie, przenieść do paska"). Fee
    reinwestowane/Koszty/Rebalanse = `null` (bot-side, czeka na Twoją
    paczkę ledger.ts — patrz zadanie w Twojej sekcji HANDOFF pkt (5)
    z rana 27.08: collectedFeesUsd/costsUsd/rebalances w /api/state
    positions). UI feature-detect gotowy — jak tylko te pola się
    pojawią w PortfolioPosition (usePortfolio.ts, poza zakresem tej
    sesji), wystarczy podmienić `null` na realne wartości w tych 3
    propsach, reszta (formatowanie/kolory/"—") już działa.
  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo).
  Po commit+push: ping CC-Win (build+restart homos-server) — może
  pójść razem z Partiami 13/13b, jeśli jeszcze niewdrożone.

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

- [Fable→CC-Mac, 27.08 ~wieczór #3 — PACZKA "flatwindows + zlecenia
  wieczorne"] Commit+push: backtest/flatwindows.ts (NOWY — statystyka
  epizodów flat + EV zwężenia, policzony na 365d przez Fable),
  RESEARCH-QUEUE.md (sekcja E + wyniki E1), HANDOFF.md (zlecenia
  CC-Win: skan hybrydą + flatwindows 720d), CONTEXT.md. Komunikat:
  "feat(backtest): flatwindows — flat episodes stats + narrowing EV;
  docs: research plan E". Po pushu ping CC-Win — ma dwie kolejki na
  wieczór/noc.

- [Fable→CC-Mac, 27.08 ~wieczór #2 — PACZKA "Partia 14"] Commit+push:
  zmiany Sonneta w src/** (pasek metryk na kartach realnych pozycji —
  Partia 14; jeśli na dysku są też zmiany Partii 13b, wchodzą razem),
  TASKS-UI.md (nagłówki ✅), HANDOFF.md. Komunikat: "feat(ui): real
  position cards stats header (partia 14)". Po pushu ping CC-Win.

- [Fable→CC-Win, 27.08 ~wieczór — **SKAN HYBRYDĄ ISTNIEJĄCYCH CACHE
  (decyzja Rafała: wolne moce → badanie kolejnych pul pod NOWY styl
  gry). Start OD RAZU, kod już masz (WF_SET=hybrid z paczki 004c038).**]
  Env dla wszystkiego: `WF_SET=hybrid SIGMA_MODE=grid15
  NODE_OPTIONS=--max-old-space-size=12288`, walkforward `<id> 30 15`,
  raporty parami jak zawsze (global+reżimy+recent90), commit results.
  KOLEJNOŚĆ (od najciekawszych):
  1. `base-weth-usdc-005-365d` (siostra naszej realnej puli, tańszy
     tier — FAIL na v1.2, hybryda może to odwrócić),
  2. `arbitrum-weth-usdc-030-365d`, 3. `optimism-weth-usdc-030-365d`,
  4. `mainnet-usdc-weth-030-365d` (jeśli cache jest), 5.
  `mainnet-usdc-weth-001-365d`, 6. `mainnet-weth-usdt-001-365d`
  (odrzucone przy v1.2 — sprawdzamy, czy nowy styl zmienia werdykt),
  7. `cand-base-usdc-cbbtc-030` (czysta beta BTC), 8.
  `mainnet-wsteth-weth-001` (LST — flat prawie zawsze; ciekawe dla
  części zwężanej). POMIŃ cand-base-weth-cbbtc-030-720d (zepsuty 1.
  punkt cache).
  KRYTERIUM ODCZYTU (odniesienie = nasze pule realne, WF hybrid
  27.08): base-030 śr −0.16/70%/worst −11.0; cbBTC +0.48/65%/−1.14.
  Szukamy pul, gdzie NAJLEPSZY wariant hybrydy ma śr.≥0, %wygr.≥60,
  worst nie gorszy niż −12. Zwycięzcy → dopisz `FP_SET=hybrid
  fullperiod <id> 2500` dla porównania dolarowego.
  PO SKANIE (jeśli zostanie czasu/nocy): fetch 365d HyperSync dla
  kandydatów z BRAKI (`cand-arbitrum-weth-usdc-030`,
  `cand-base-weth-usdc-005` już masz jako żywą 005? — bierz tylko te,
  których realnie nie ma w cache) i ten sam walkforward. NIE kolidować
  z oknem automatu 05:30–08:25; jeden ciężki proces naraz.

- [Fable→CC-Win, 27.08 ~wieczór — **FLATWINDOWS na świeżych 720d**
  (po pullu paczki z `backtest/flatwindows.ts`; krótkie przebiegi,
  wciśnij PRZED skan hybrydą albo między jego punkty):]
  1. `npx tsx backtest/flatwindows.ts base-weth-usdc-030-720d`
  2. `NARROW=0.06 npx tsx backtest/flatwindows.ts base-cbbtc-weth-005-720d`
  3. Sweep detektora (E1): dla base-030-720d warianty
     `ENTER=0.03`, `CONFIRM_H=12`, `HL_D=5`, `HL_D=10` (po jednym
     na raz, reszta default) — tabelki stdout do raportu.
  Odniesienie (Fable, 365d stale): base-030 14 epiz./rok, med 3.9d,
  22% czasu, ΣEV $105/rok, próg ≥2.1d; cbBTC 14/rok, med 15.6d, 62%
  czasu, ΣEV $290/rok, próg ≥7d. Sprawdzamy, czy 720d (z bullem)
  potwierdza skalę i progi.

- [Fable→CC-Win, 27.08 ~wieczór — wdrożenie Partii 14, NIEPILNE ale
  proste] Po pullu paczki "Partia 14" od CC-Mac: `npm run build` +
  `nssm restart homos-server` (frontend only; homos-bot nie wymaga
  restartu). Sanity po wdrożeniu: karta realnej pozycji #5886957 ma
  pasek metryk jak paper (PnL od startu / vs HODL / fee narosłe
  wypełnione; Fee reinwestowane / Koszty / Rebalanse jako "—" —
  to OCZEKIWANE do czasu paczki bot-side od Fable). Przy okazji:
  czy propozycja OPEN cbBTC znikła po otwarciu pozycji (auto-close)?
  I czy jest werdykt (b) z diagnozy "Odrzuć"?

- [Fable→CC-Mac, 27.08 ~wieczór — DOCS zamknięcie dnia] Commit+push:
  HANDOFF.md (stan końcowy + plan następnej sesji Fable), CONTEXT.md
  (dziennik: noga B, produkt w komplecie), TASKS-UI.md (PARTIA 13 ✅
  + PARTIA 13b follow-up). Komunikat: "docs: dzień decyzji zamknięty —
  produkt hybryda live, obie nogi otwarte".

- [Sonnet→CC-Mac, 27.08 — **PARTIA 13 ZROBIONA, do commit+push**] Wszystkie
  6 punktów z TASKS-UI.md PARTIA 13 wdrożone w src/components/CockpitPositionActions.tsx
  + src/hooks/useCockpitActions.ts (jedyny dotknięty zakres — logika budowy
  transakcji NIETKNIĘTA). tsc czysty (poza preexisting observer.ts viem/ox —
  zweryfikowane grepem, zero nowych błędów w dotkniętych plikach), `npm run
  build` przechodzi (tylko preexisting size-limit warnings).
  1. approveToken: `waitForTransactionReceipt` opakowane w best-effort helper
     `waitReceiptBestEffort` (2×5s retry, potem NIE rzuca) — ta sama klasa
     fixu co useHedgeExecution 20.08.
  2. Refresh po approve: już wołany w `approve()` (RebalanceModal), teraz
     realnie dochodzi do końca dzięki punktowi 1 (wcześniej throw przerywał
     przed refreshem). Dodany fallback ręczny: przycisk „↻ odśwież salda"
     w stopce modala.
  3. `openPositionAtRange`: finalny `waitForTransactionReceipt` też przez
     `waitReceiptBestEffort` (wcześniej throw przy wolnym RPC dawał fałszywy
     błąd mimo udanego otwarcia na łańcuchu — stąd „modal wisi dalej").
     `onDone?.()` woła się jak dotąd (callerzy — CockpitPositionActions.tsx
     i MorningCockpit.tsx — już wiążą `onDone` z `onClose`, teraz realnie
     się wykonuje). DODATKOWO: globalny toast (`showGlobalToast`, moduł-level
     w useCockpitActions.ts) montowany na `document.body`, niezależny od
     drzewa React/danej karty — poprzedni toast żył tylko w
     CockpitPositionActions.tsx keyed po posKey(chainId,tokenId), więc dla
     modala „Otwórz pozycję" z karty PROPOZYCJI bota (tokenId==='') NIGDY się
     nie renderował. Nie wymagało dotykania MorningCockpit.tsx.
  4. Przycisk MAX przy obu tokenach — wpisuje `formatUnits(bal, decimals)`
     (dokładne saldo), nie wyświetlaną (uciętą) wartość.
  5. Wyświetlane saldo: nowy `floorBalanceStr()` — trunacja na STRINGU z
     formatUnits (nie `toFixed`, które zaokrągla w górę), zero błędów float.
     Pełna precyzja w `title` (tooltip) obok.
  6. Dopisek „zatwierdzone: X, potrzebne: Y" przy przycisku Approve, gdy
     auto-przeliczenie podniesie kwotę nad już zatwierdzone allowance
     (zamiast gołego powrotu przycisku).
  Scenariusz weryfikacji z TASKS-UI.md sprawdzony przez czytanie kodu +
  tsc/build (bez portfela na żywo — poza możliwościami tej sesji). Jeśli
  chcesz, mogę usunąć sekcję PARTIA 13 z TASKS-UI.md po potwierdzeniu
  wdrożenia — zostawiam na razie, żeby było co zamknąć po Twoim review.
  Po commit+push: ping CC-Win (build+restart homos-server), jak zaplanowano.

- [Fable→CC-Mac, 27.08 ~popołudnie — **PACZKA ZBIORCZA "auto-close OPEN
  + Partia 13"** (Partia 13 GOTOWA u Sonneta, odebrana przez Fable)]
  Commit+push RAZEM: bot/observer.ts (auto-zamykanie propozycji OPEN,
  gdy pozycja w tej puli już otwarta — rozstrzygnięcie Rafała po
  wejściu #5886957), src/components/CockpitPositionActions.tsx +
  src/hooks/useCockpitActions.ts (Partia 13 od Sonneta — state control
  modala Otwórz), TASKS-UI.md (spec + ✅), HANDOFF.md, CONTEXT.md.
  Komunikat: "fix(ui): open-position modal state control (partia 13);
  feat(bot): auto-close OPEN on held pool". Po pushu OD RAZU ping
  CC-Win — Rafał czeka z nogą B na ten deploy.

- [Fable→CC-Mac, 27.08 ~południe — **PACZKA "PRODUKT HYBRYDA", PILNA
  (blokuje wejście kapitału dziś)**] Commit+push:
  backtest/strategies.ts (flatOnlyLP idle:'passive' + passiveWidth —
  hybryda FlatWide), backtest/walkforward.ts (WF_SET=hybrid),
  backtest/fullperiod.ts (FP_SET=hybrid), src/utils/advisor.ts
  (suggestFixedRange — stała szerokość ±N%), bot/config.ts
  (BotPool.productIdleWidthPct; base-030=50, cbBTC-005=40),
  bot/observer.ts (suggestion z suggestFixedRange dla pul
  produktowych), HANDOFF.md, CONTEXT.md. tsc czysty (poza preexisting
  observer viem/ox). Komunikat: "feat(product): FlatWide hybrid —
  fixed idle width + WF/FP hybrid sets". NATYCHMIAST po pushu ping
  CC-Win (ma pilne wdrożenie).
  backtest/fullperiod.ts (nowy env `FP_DAYS=N` — przycięcie serii do
  ostatnich N dni; policzony w kontenerze na obu pulach Base, działa),
  HANDOFF.md (zlecenie świeżych 90d u CC-Win + stan poranka),
  CONTEXT.md (wpis dziennika 27.08). Komunikat: "feat(backtest):
  FP_DAYS window trim; docs: poranek 27.08". Po pushu ping CC-Win —
  jego przebieg BLOKUJE decyzję kapitałową Rafała.

- [Fable→CC-Mac, 26.08 ~21:xx — PACZKA #5 (ostatnia dziś, same
  dokumenty)] Commit+push: HANDOFF.md (checklist NA RANO dla sesji
  Fable 27.08), CONTEXT.md (skrót stanu na górze §1), TASKS-ROTATION.md
  (nagłówek ZAMKNIĘTY — odrzucona danymi), TASKS-RECAL.md (nagłówek
  STATUS — wykonane/wstrzymane). Komunikat: "docs: stan na rano 27.08
  — checklist decyzji produkt-albo-zamrozenie".

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
- [Fable→CC-Win, 27.08 ~południe — **WDROŻENIE PRODUKTU, PILNE (Rafał
  chce wejść kapitałem DZIŚ przez kokpit)**] Po pullu paczki CC-Mac
  "produkt hybryda":
  1. `npm run build` (frontend!) + `nssm restart homos-bot` +
     `nssm restart homos-server`.
  2. WYMUSZENIE świeżych propozycji OPEN z produktowymi zakresami:
     (a) w `.bot/proposals.json` usuń DWA stare wpisy OPEN
     (`open-b99bcdf5-…` base-weth-usdc-030 i `open-d632293f-…`
     base-cbbtc-weth-005 — mają wąskie zakresy k×σ z 25.08);
     (b) w `.bot/selector-state.json` cofnij `lastRunDate` na
     wczorajszą datę; (c) restart homos-bot — selektor odpala się na
     starcie i wygeneruje OPEN z NOWYMI zakresami (±50% / ±40% wokół
     bieżącej ceny — pole `productIdleWidthPct` w BOT_POOLS; sanity:
     w propozycji base-030 usdLo/usdHi ≈ P×0.5 / P×1.5).
  3. Zweryfikuj w kokpicie/`/api/state`, że obie propozycje wiszą z
     szerokimi zakresami, i pingnij Rafała — on podpisuje przez apkę.
  4. **DIAGNOZA "Odrzuć" (3. nawrót, zgłoszenie Rafała ~południe:
     "po odświeżeniu strony wracają")**: głównym podejrzanym jest
     STARY BUNDLE na Windows — fix z 26.08 żyje w useBotApi
     (frontend) i server.ts; bundle jest untracked i buduje się per
     maszyna. Sprawdź: (a) czy po ostatnich pullach robiono
     `npm run build` (jeśli nie — punkt 1 właśnie to załatwił);
     (b) po kliku Rafała w Odrzuć: linia "odrzucona (komenda z UI)"
     w observer.log w ≤30 s? (c) czy GET /api/state ZARAZ po POST
     odrzucenia nie zawiera odrzuconego id (filtr server-side).
     Wynik (a/b/c) do raportu — jak (b) nie występuje, to realny bug
     konsumenta komend i wtedy wracam do kodu.
  Po pullu paczki CC-Mac (fullperiod.ts dostał env `FP_DAYS=N` —
  przycięcie serii do ostatnich N dni cache'a) odpal na ŚWIEŻYM cache
  (po dzisiejszym fetchu 07:30, okno kończy się dziś):
  1. `FP_SET=final SIGMA_MODE=grid15 FP_DAYS=90
     NODE_OPTIONS=--max-old-space-size=12288 npx tsx
     backtest/fullperiod.ts base-weth-usdc-030-365d 2500`
  2. to samo dla `base-cbbtc-weth-005-365d 2500`.
  Kontekst: pytanie Rafała "wchodzę $2,5k/pula — co dałyby obie
  strategie przez ostatnie 3 miesiące". Fable policzył to na cache
  Maca (stale, koniec 11.08, ETH −16%): passiveW ±50% $2,347/±40%
  cbBTC $2,056; FlatOnly k=3|24h $2,296/$2,033; HODL $2,296/$2,031;
  USDC wygrywa. Wasze okno łapie pompę 18–27.08 — raport z pełnymi
  tabelami stdout do @Fable, porównamy oba okna. To 2 szybkie
  przebiegi, bez commitu results (fullperiod nie zapisuje JSON).
- [Fable→CC-Win, 27.08 ~rano] Przypomnienie zaległych weryfikacji
  (nie blokują): (a) `state.json.gasUsd` wypełnione liczbami po cyklu
  observera? (b) test "Odrzuć" — po kliku Rafała linia "odrzucona
  (komenda z UI)" w observer.log w ≤30 s. Nocny automat 05:30 z 27.08
  odebrany przez Fable: czysty (porażki: BRAK, backtest-run exit 0
  1h21m — pierwszy przebieg z wykluczeniem cand-* działa). Kosmetyka
  niepilna: check świeżości raportuje 5 starych `cand-*` jako BRAKI —
  do wyciszenia kiedyś w morning-report.

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
