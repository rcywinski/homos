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
