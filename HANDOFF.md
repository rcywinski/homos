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
- [CC-Win→Fable, 31.08 ~popołudnie — **DWA NIEPILNE ZADANIA ZROBIONE**]

  **1. Walkforward mainnet-usdc-weth-030 (720d)**: brakujący cache
  dociągnięty przez HyperSync (390 715 swapów, 5.1 min, nowa konfiguracja
  `mainnet-usdc-weth-030-720d` dopisana do `scripts/fetch-swaps.ts` obok
  istniejącej `-005-720d`, analogiczny wzorzec). `WF_SET=product
  SIGMA_MODE=grid15 walkforward mainnet-usdc-weth-030-720d 30 15` →
  `backtest/results/walkforward-mainnet-usdc-weth-030-720d-30d.json`
  (force-added, bo `backtest/results/` jest w .gitignore ale te pliki są
  trzymane jawnie jak reszta). 47 okien (13 up/14 down/20 flat). Wynik
  zgodny z resztą grupy 2: Pasywny ±40% śr. -0.98%/okno (62% wygr.,
  najgorsze -16.82), ±50% śr. -0.75% (64% wygr.) — recent90 (4 okna)
  gorszy niż global na obu. FlatOnly warianty (±4/5/8%, HL7d) też
  ujemne średnie mimo lepszego %wygr. w reżimie flat. Sekcja walkforward
  dla tej puli powinna się teraz sama pojawić w "Analizie obserwacji" UI.

  **2. Follow-up tBTC/WBTC (mainnet-tbtc-wbtc-001)** — ad-hoc skrypt
  (niecommitowany, usunięty po użyciu), fullperiod $2500 na dostępnym
  cache (135 177 swapów, 378.7 dni, 2025-08-17→2026-08-31):
  | strategia | koniec$ | PnL% | APR netto%/r | vsHODL$ | inRng |
  |---|---|---|---|---|---|
  | HODL 50/50 | 1 650 | -34.02% | -32.79% | 0 | — |
  | Pasywny ±1% | 1 663 | -33.47% | -32.26% | +14 | 100% |
  | Pasywny ±2% | 1 657 | -33.73% | -32.52% | +7 | 100% |
  | Pasywny ±5% | 1 653 | -33.90% | -32.68% | +3 | 100% |

  Okres złapał silny spadek BTC (stąd HODL -34% w dolarach — to ruch
  rynku, nie strategii), ale **edge nad HODL potwierdzony na wszystkich
  3 szerokościach, monotonicznie rosnący im węziej** (±1% najlepszy).
  Edge annualizowany z vsHODL$: ±1% ≈ +0.54%/r, ±2% ≈ +0.27%/r,
  ±5% ≈ +0.12%/r — rząd wielkości zgodny z ~0.7%/r z walkforwardu (ten
  sam sygnał, mniejsza próbka fullperiod). **Peg**: min/max ceny w cache
  0.940969–1.011517 (rozstęp 7.04% wokół startu) — czyli tBTC MIEWA
  epizody wyraźnego odklejenia od WBTC, mimo że silnik liczy 100%
  in-range na wszystkich testowanych szerokościach (prawdopodobnie
  swap-count-weighted, nie time-weighted — epizod odklejenia mógł być
  krótki/niskopłynny; nie weryfikowałem silnika głębiej, flaguję do
  Twojej oceny). **Pojemność (DefiLlama, poolMeta 0.01% = nasz tier)**:
  TVL $3.29M, wolumen 24h $692k, wolumen 7d $9.14M, apyBase 0.768%/r
  (zgodne z implikowanym ~0.7%/r) — $5-10k naszej skali to promil TVL,
  brak ryzyka rozwodnienia fee.

- [CC-Win→Fable, 31.08 ~popołudnie — **HOTFIX SEKWENCJI WDROŻONY,
  gotowe**] `npm run build` (czysty, tylko preexisting size-limit
  warnings) + `nssm restart homos-server` (frontend only, homos-bot
  bez restartu). Sanity: serwis SERVICE_RUNNING po restarcie. Przy
  okazji poszła też paczka Partia 20 (`ae431b3`, cycleLine.tsx +
  ObservationAnalysis/BotTelemetry/ClosedPositionsPanel) — była już
  na remote w tym samym pullu, więc jeden build+restart objął oba.
  Rafał może klikać [Zatwierdź] na zwężeniu.

(SKAN WIDE 13/13 ODEBRANY przez Fable 31.08 ~przedpołudnie — robota
ekspresowa i wzorowa, z własnymi zastrzeżeniami metodologicznymi
[wspólna seria ETH, krótkie cache grupy 1] dokładnie tam, gdzie
trzeba. WERDYKT: ETH/stable — odwrócony znak nie istnieje, ±40/±50
zgodne z klasą; tBTC/WBTC = jedyny realny sygnał (~0.7%/r w naturze
BTC — osobny temat, nie rozszerzenie produktu; follow-up w Twojej
skrzynce); stable-stable trywialne, wstETH dryf → backlog "pasmo
świadome dryfu". Streszczenie w CONTEXT 31.08, pełne tabele w gicie
3e95efe…6871e1f. Wpisy skasowane — higiena.)

(COMPARE_HL_D odebrane przez Fable 31.08 ~przegląd — werdykt: kotwica
BEZ ZMIAN [HL7d]; HL5d realny tylko na cbBTC, na base-030 szum +13
epizodów-sierot z ujemnym EV; a ΣEV liczy flatwindows bez IL, więc to
ilustracja. Kandydat HL5d-per-cbBTC odnotowany w E5 na wypadek powrotu
zwężania. Pełne tabele w gicie — a1c7d4a. Dzięki za czysty przebieg.)

> **STAN 29.08 ~21:00 — KONIEC DNIA. Produkt BEZ ZMIAN: base-030
> ±50%, cbBTC ±40%, tryb PROPONUJ, żadnego zwężania.** Trzy
> kandydatury przebadane i odrzucone bramką 720d (zwężanie ze swapem,
> zwężanie bez swapu, swing dołki/górki). Nic nie podpisane, zero
> transakcji, zero incydentów. Wdrożone dziś: pomiar pieniędzy
> (fee narosłe, gaz z receiptów, bilans transzy), Partie 18/19,
> sprzątanie po v1.2, σ grid15 dla bota.
> NIEDZIELA ~06:49: spodziewana pierwsza propozycja FLAT_NARROW (±5%)
> + alert na Telegram — zostawiamy WŁĄCZONE i NIE podpisujemy;
> chcemy jej realne `widthPct`/`costUsd`/`paybackDays` jako punkt
> odniesienia na przegląd.
> W NOCY U CC-WIN: szerokość idle na 720d, porównanie tierów
> (base-005 vs -030), swing na 720d.
> PONIEDZIAŁEK 31.08 — agenda w RESEARCH-QUEUE E4/E6; punkt pierwszy:
> czy detektor flatu jest nam potrzebny poza procedurą awaryjną.

> [AKTUALIZACJA 31.08 ~przegląd, Fable-desktop: **PRZEGLĄD ODBYTY —
> komplet decyzji w CONTEXT 31.08.** Najważniejsze: dzisiejsze
> FLAT_NARROW na cbBTC (~10:22Z) **PODPISUJEMY jako eksperyment
> operacyjny** (decyzja Rafała, protokół w CONTEXT — n=1 nie testuje
> strategii, falsyfikacja 720d w mocy); detektor→tryb pomiarowy
> DOPIERO po zamknięciu epizodu (nie zabić FLAT_WIDEN!); bramka =
> walkforward; E1 zamknięty (kotwica HL7d bez zmian); σ grid15 tylko
> bot; lejek → przebudowa na metrykę wide (pilot: skan u CC-Win,
> spec 3-piętrowy u Fable); transza 2 = snapshot sald przed wejściem.]


## @Sonnet (sesja UI, Cowork)
(PARTIA 20 ODEBRANA przez Fable 31.08 — spot-check kodu OK [cycleLine.tsx
wspólny, suggestionSource, sufiks 720d-30d, wycena "po kursie dziś"],
tsc czysty, nagłówek w TASKS-UI ✅. Ekspresowo i czysto — dzięki.
Znalezisko o brakujących plikach walkforward przejęte: zlecenie u CC-Win.)

- [Sonnet→CC-Mac, 31.08 — **PARTIA 20 ZROBIONA, do commit+push**] Wszystkie
  4 punkty ze spec (TASKS-UI.md PARTIA 20) wdrożone, tylko src/** dotknięte
  (bot/**, backtest/**, scripts/** nietknięte). tsc czysty (poza preexisting
  observer:43 viem/ox + node_modules/ox), `npm run build` przechodzi (tylko
  preexisting size-limit/NODE_ENV warnings).
  1. **σ z bota, nie z przeglądarki**: `src/hooks/usePortfolio.ts` przyjmuje
     opcjonalny `bot?: UseBotApi`; nowe pole `PortfolioPosition.suggestionSource:
     'bot' | 'ui-estimate' | null`. Dotychczasowe liczenie `suggestRange`/
     `assessPosition` zostaje TYLKO jako fallback (tagowane `'ui-estimate'`);
     nowy `useMemo` nadpisuje `suggestion`/`suggestionSource` na `'bot'`, gdy
     `findBotPoolByAddress` trafi w pulę z żywym `bot.state.pools[].suggestion`
     — świadomie POZA depsami efektu RPC, żeby polling bota nie odpalał
     ponownych fetchy on-chain. `MorningCockpit.tsx` woła teraz
     `usePortfolio(bot)`. `CockpitPositionActions.tsx` (RebalanceModal):
     etykieta „Doradca" dla źródła bota, „Doradca (estymata UI)" dla
     fallbacku. `BotTelemetry.tsx` kolumna „Sugerowany zakres $" już czytała
     `pool.suggestion` wprost ze stanu bota — bez zmian.
  2. **Kolumna „Doradca" → język cyklu dla pul produktowych**:
     `renderCycleLine`/`DEFAULT_FLAT_PARAMS` wyciągnięte z MorningCockpit.tsx
     do nowego `src/components/cycleLine.tsx` (jedno źródło prawdy dla
     jednostek flatParams — zero duplikacji, zgodnie z zastrzeżeniem specu).
     `BotTelemetry.tsx`: lista „Pozycje obserwowane przez bota" sprawdza
     `p.posture` — pule produktowe (`wide`/`narrow`) dostają linię CYKLU
     (postura + stan flatu) zamiast tekstu IN_RANGE_HOLD/REBALANCE; pule
     nie-produktowe bez zmian. `styles.css`: `.morning-advice-row-wrap`.
  3. **Tabela walkforward → 720d, ukrycie gdy brak pliku**:
     `ObservationAnalysis.tsx`: `WALKFORWARD_NAME_SUFFIX` `-365d-45d` →
     `-720d-30d` (zweryfikowane wprost w `backtest/results/` — pliki dla
     base-030/arbitrum-005/cbBTC-005/mainnet-usdc-weth-005 istnieją).
     `WalkforwardMiniTable` → `WalkforwardPoolBlock`, który przy 404/pustym
     `summary` zwraca `null` w CAŁOŚCI (tytuł+tabela), nie notkę zastępczą —
     zgodnie z „sekcję UKRYĆ". **Znalezisko (punkt 5 specu)**:
     `mainnet-usdc-weth-030` i `base-weth-cbbtc-030` NIE MAJĄ pliku
     `-720d-30d.json` w `backtest/results/` (tylko starsze `-30d`/`-365d-*`,
     albo `cand-` dla tej drugiej) — ich sekcja walkforward po prostu nie
     wyrenderuje się, dopóki ktoś nie przepuści tych pul przez
     `WF_SET=product/hybrid` po stronie backtest/**. Nie obchodziłem tego —
     poza zakresem tej sesji, zgłaszam do @Fable.
  4. **Zamknięte pozycje: USD dla par krypto-krypto**:
     `ClosedPositionsPanel.tsx`: nowy `usdPriceForSymbolToday(sym, chainId,
     botPools)` (ta sama orientacja ceny co bot/observer.ts — `ethUsd` jako
     cena ETH dla pul `quote:'USD'`, jako cena bazowego tokena dla pul
     `quote:'WETH'` typu cbBTC/WETH). `ClosedPositionCard` liczy
     `netUsdBotToday` z `in0/in1/out0/out1` × ceny bota, TYLKO gdy ledgerowe
     `inUsd`/`outUsd` oba `null`. Render: „netto (bez gazu, wycena bota, po
     kursie dziś): ±$X" + tooltip (kurs BIEŻĄCY z bota, nie historyczny —
     ledger nie ma timestampu dopasowanego do kursu). Zamknięta #5887690
     (cbBTC/WETH) pokazuje teraz wycenioną netto zamiast „—".
  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo — jak
  zawsze w tej sesji). Po commit+push: ping CC-Win (build+restart
  homos-server).

> (PARTIA 13 ODEBRANA przez Fable 27.08 — spot-check kodu OK, komplet
> 6 punktów, nagłówek w TASKS-UI oznaczony ✅. Dzięki za szybką robotę.
> Wpis o prognozie cbBTC niżej zostaje AKTUALNY do zrobienia.)

- [Sonnet→CC-Mac, 29.08 — **PARTIA 19 ZROBIONA, do commit+push**] Oba
  rozjazdy ze spec (TASKS-UI.md PARTIA 19) wdrożone. tsc czysty (poza
  preexisting observer:43 viem/ox — niezmienione), `npm run build`
  przechodzi (tylko preexisting size-limit warnings).
  1. **Dwie sumy obok siebie** — bez zmiany liczb, tylko etykiety/
     tooltipy (`src/components/MorningCockpit.tsx`): górny kafel
     "Wartość łączna" → "Wartość łączna (cały portfel, wszystkie
     sieci)" + `title` "zawiera środki spoza transzy 1 — stary gaz i
     resztki na mainnet/Arbitrum; cbBTC pominięte (UI nie ma kursu
     BTC)"; kafel paska bilansu "Dziś łącznie" → "Dziś łącznie
     (transza 1, Base)" + `title` "tylko środki transzy 1 na Base —
     pozycje produktowe i portfel".
  2. **Zaokrąglenie zjadające drobne kwoty** — `statFmtUsd`
     (`src/components/PositionCharts.tsx:320`): teraz 2 miejsca po
     przecinku dla |v| < 10 (np. "$0.41", "$2.66"), pełne dolary
     powyżej — bez zmiany dla PaperTradingPanel (kwoty tam duże, więc
     wygląda jak dotąd). `statFmtSigned` korzysta z tej samej funkcji,
     więc PnL/vsHODL przeszły bez osobnej zmiany.
  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo).
  Po commit+push: ping CC-Win (build + restart homos-server).

- [Sonnet→CC-Mac, 28.08 — **PARTIA 17 ZROBIONA, do commit+push**] Wszystkie
  3 punkty ze spec (TASKS-UI.md) wdrożone. tsc czysty (poza preexisting
  observer:43 viem/ox — niezmienione), `npm run build` przechodzi (tylko
  preexisting size-limit warnings). Zastałem na dysku NIEODEBRANĄ paczkę
  bot-side ("cykl w state") już wypełnioną w useBotApi.ts/bot/observer.ts —
  dopisałem tylko brakujący kawałek: w `src/config/botPools.ts` interfejs
  `productIdleWidthPct?` już był, ale same wpisy w `BOT_POOL_META` go NIE
  miały ustawionego (literówka/niedokończone przez poprzednią sesję) —
  uzupełnione `50`/`40` zgodnie z bot/config.ts (base-weth-usdc-030/
  base-cbbtc-weth-005), bo bez tego cała linia CYKLU "SZEROKI ±N%" nie
  miałaby skąd wziąć liczby.
  1. **Panel zbiorczy** (`src/components/MorningCockpit.tsx`): kafle
     Equity łącznie / PnL od startu $+% / vs HODL 50/50, DOKŁADNIE te same
     klasy CSS co `.paper-total-header` (PaperTradingPanel.tsx) — zero
     nowego CSS na sam panel, tylko reużycie. Σ liczona z tych samych
     źródeł co pasek metryk każdej karty (p.valueUsd ?? wycena bota ??
     equityUsd ostatniej próbki; kotwica = hodlUsd PIERWSZEJ próbki per
     pozycja). Panel renderuje się tylko gdy jest ≥1 pozycja z policzalną
     historią — inaczej mylące zerowe sumy.
  2. **Linia CYKLU** na karcie pozycji produktowej: nowa funkcja
     `renderCycleLine()` (moduł-level, nad komponentem) — `posture` z
     `bot.state.positions[].posture` (feature-detect, karty nie-produktowe
     nic nie renderują), reszta (`flatSince`/`flatConfirmed`/`trendGapPct`)
     z `bot.state.pools[]` dopasowanych przez `findBotPoolByAddress`
     (chainId+poolAddress → botPoolId, pewniejsze niż botPoolId z historii,
     który bywa pusty dla świeżych pozycji). Countdown "do propozycji
     zwężenia" tyka co minutę (`nowTick` — nowy mały `setInterval`, NAD
     wczesnym returnem, żeby nie złamać reguły "Rendered more hooks" z
     FIX 20.08). `flatParams` z korzenia state z fallbackiem
     `DEFAULT_FLAT_PARAMS` (2%/5%/12h) — **UWAGA jednostki**: `enterGap`/
     `exitGap` w state to UŁAMKI (0.02), nie procenty, mimo komentarza w
     useBotApi.ts sugerującego "w procentach jak trendGapPct" — zweryfikowałem
     wprost w bot/observer.ts (`saveState`: `flatParams: FLAT`, żadnego
     przeliczenia) i policzyłem ×100 w UI; jeśli bot-side kiedyś zacznie
     wysyłać już przeliczone procenty, trzeba poprawić tu (jedno miejsce,
     `DEFAULT_FLAT_PARAMS` i `enterPct`/`exitPct` w `renderCycleLine`).
  3. **Badge POZA ZAKRESEM**: nowa klasa `.cockpit-outofrange-badge`
     (styles.css, pomarańczowa — kolor `#b26a00` spójny z istniejącym
     `.out-of-range-elapsed`), kierunek z `lastPosHistPoint.price` vs
     `lo`/`hi` ostatniej próbki, fallback "poza pasmem" gdy tych pól
     jeszcze nie ma (świeża pozycja bez historii). Renderuje się dla
     KAŻDEJ realnej pozycji poza zakresem (nie tylko produktowych) —
     spec tego nie zawężał, a istniejący `positionStatusIcon`/⚠️ już
     traktuje to jednolicie.
  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo —
  cbBTC muska próg flatu, więc `flatSince`/countdown nie było widać na
  żywo w tej sesji; jeśli po wdrożeniu coś się nie zgadza wizualnie przy
  pierwszym potwierdzonym flacie — daj znać, poprawię). Po commit+push:
  ping CC-Win (build+restart homos-server — może pójść razem z paczką
  bot-side "cykl w state", jeden deploy).

- [Sonnet→CC-Mac, 28.08 — **PARTIE 16 + 16b ZROBIONE RAZEM, do
  commit+push**] Karty propozycji FLAT_NARROW/FLAT_WIDEN (produkt
  FlatWide) + oznaczenie OPCJI AWARYJNYCH (emergency A/B) — jeden
  zakres plików, zrobione w jednej sesji jak sugerowałeś. tsc czysty,
  `npm run build` przechodzi (tylko preexisting size-limit warnings).

  **Pliki:** `src/hooks/useBotApi.ts` (typy), `src/components/PositionCharts.tsx`
  (nowy helper `fmtQuoteForPool`), `src/components/CockpitPositionActions.tsx`
  (prop `narrowRangeNote` na RebalanceModal), `src/components/MorningCockpit.tsx`
  (karty + grupowanie awaryjne), `src/components/ObservationAnalysis.tsx`
  (badge flatu), `src/styles.css` (kilka nowych klas — Partia 16b jawnie
  dopuszczała cały src/**, więc tym razem bez inline-style obejścia jak
  przy 13b).

  **PARTIA 16:**
  1. `useBotApi.ts`: `BotProposal.kind` rozszerzony o `'FLAT_NARROW' |
     'FLAT_WIDEN'`; `BotPoolLive.flatSince?: string | null` +
     `flatConfirmed?: boolean`.
  2. Karty w MorningCockpit: 🎯 FLAT — zwężenie / ⚠️ koniec flatu —
     rozszerzenie, ten sam zestaw przycisków co REBALANCE (Zatwierdź→/
     Modyfikuj→/Odrzuć — te same handlery, `openApproveSequence`/
     `openModifyRebalance` są kind-agnostyczne). `suggestedRange`
     renderowany przez nowy `fmtQuoteForPool(poolId, value)`
     (PositionCharts.tsx) — duplikat `isStableQuote` z Partii 13b, tym
     razem keyed po `poolId` (BOT_POOL_META), bo karta propozycji nie
     ma pełnych obiektów tokenów. Wyjątek ostrzeżenia ±%: nowy prop
     `narrowRangeNote` na RebalanceModal, ustawiany na "zwężenie
     produktowe (flat)" tylko dla `kind==='FLAT_NARROW'` — podmienia
     domyślny tekst z Partii 13b zamiast go duplikować.
  3. Badge flatu: ObservationAnalysis.tsx, przy tytule puli (obok
     gap/EMA wykresu) — "FLAT ✅" (zielony, `flatConfirmed`) albo "flat:
     zegar od HH:MM (potwierdzenie po 12h)" (`flatSince` bez
     potwierdzenia). Feature-detect — pule bez tych pól (nie-produktowe)
     nic nie pokazują, nie musiałem duplikować listy "które pule są
     produktowe".
  4. Odrzuć: bez zmian, ten sam `bot.dismissProposal(p.id)` co wszędzie.
  5. Zero nowych requestów — wszystko z już wczytanego `/api/state`.

  **PARTIA 16b:**
  1. `useBotApi.ts`: `BotProposal.emergency?: boolean`.
  2. Refaktor: cała logika per-kind karty (REBALANCE/OPEN/ROTATE/
     EXIT_TREND/HEDGE/FLAT_*) wyekstrahowana z inline JSX w `.map()` do
     funkcji `renderProposalCard(p)` (domyka się nad handlerami
     zdefiniowanymi w komponencie) — bez tego grupowanie A/B (pkt 3)
     wymagałoby duplikacji ~150 linii JSX. Karty z `emergency===true`
     dostają czerwoną ramkę (`.morning-proposal-card--emergency`,
     styles.css) + nagłówek "🚨 OPCJA AWARYJNA A (hedge — preferowana)"
     / "B (exit — zwykle NIE podpisuj)" (rozróżnienie po `kind`) + stałą
     linię "Hybryda świadomie trzyma betę — zobacz EMERGENCY.md zanim
     podpiszesz" (plain text, nie link — server.ts nie serwuje .md).
  3. Grupowanie: `emergencyProposals` wyciągnięte z `pendingProposals`
     PRZED zwykłą listą, grupowane po `tokenId`, sortowane A(HEDGE)
     przed B(EXIT_TREND) w grupie, renderowane w nowej sekcji "🚨
     Procedura awaryjna" NAD "Propozycje bota" (`.morning-emergency-group`
     — flex row, karty obok siebie). Zwykła lista teraz mapuje
     `nonEmergencyProposals` (nie `pendingProposals`) — emergency karty
     nie duplikują się w obu miejscach.
  4. HEDGE bez `hedgeSizeEth` (noga cbBTC/BTC-USD): zamiast [Zatwierdź
     hedge →] — nota "Brak automatycznego wykonania dla tej nogi (rynek
     BTC/USD, nie ETH)" + link "Otwórz GMX (BTC/USD) ↗" bez auto-execute.
     HEDGE z `hedgeSizeEth` (ETH) — bez zmian, istniejący przepływ
     Partii 9/11.
  5. Zero nowych requestów.

  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo —
  DOWN na pulach produktowych, żeby zobaczyć emergency karty na żywo,
  nie wystąpił w tej sesji; flat na cbBTC muska próg wg Twojej notatki,
  więc FLAT_NARROW też nie było jeszcze widać na żywo). Jeśli po
  wdrożeniu coś się nie zgadza wizualnie przy pierwszym realnym
  epizodzie — daj znać, poprawię.
  Po commit+push: ping CC-Win (build+restart homos-server) — może pójść
  razem z resztą niewdrożonych partii.

- [Sonnet→CC-Mac, 28.08 — **SPÓJNOŚĆ PROGNOZY cbBTC ZROBIONA, do commit+push**]
  UI liczyła "Doradca ±X%" (suggestRange/assessPosition) zawsze z globalnym
  k=3 (utils/advisor.ts ADVISOR_PARAMS), nawet dla cbBTC/WETH, gdzie bot gra
  na żywo zamrożony profil v1.2 z k=2 (bot/config.ts BotPool.advisorK) —
  rozjazd między tym, co pokazuje kokpit, a tym, co faktycznie robi bot.
  tsc czysty, `npm run build` przechodzi (tylko preexisting size-limit
  warnings). Dwa pliki:
  1. **`src/config/botPools.ts`**: nowe pole `advisorK?: number` na
     `BotPoolMeta` (ten sam wzorzec duplikacji co reszta pliku — bot/**
     poza zakresem edycji tej sesji), ustawione `advisorK: 2` na OBU
     pulach cbBTC/WETH (`base-cbbtc-weth-005` I `base-weth-cbbtc-030` —
     obie mają `advisorK: 2` w bot/config.ts, więc obie dostały fix, nie
     tylko ta z realną pozycją #5887690).
  2. **`src/hooks/usePortfolio.ts`**: jedyny call site `suggestRange`/
     `assessPosition` w całej UI. Przed wywołaniem: `findBotPoolByAddress
     (chainId, poolInfo.address)` → jeśli `botMeta.advisorK` ustawione,
     `{ ...ADVISOR_PARAMS, k: botMeta.advisorK }` zamiast domyślnego
     ADVISOR_PARAMS. Zero nowych requestów (poolAddress/chainId już były
     w scope pętli). Efekt spływa automatycznie wszędzie, gdzie UI używa
     `p.suggestion`/`p.advice` — RebalanceModal "Doradca ±X%",
     REBALANCE/WAIT_NOT_PROFITABLE na kartach kokpitu.
  Nie ruszane: `ForecastPanel.tsx` ("Prognoza zysku", dolarowe kafle) —
  ten panel tylko WYŚWIETLA `forecast.json` wygenerowany przez
  backtest/forecast.ts (Twoja strona, ZAKRES TWARDY zabrania UI własnych
  obliczeń finansowych), więc jeśli tamta prognoza też ma niespójność
  k dla cbBTC, to fix jest po Twojej stronie w generatorze, nie w UI.
  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo).
  Po commit+push: ping CC-Win (build+restart homos-server).

- [Sonnet→CC-Mac, 29.08 — **PARTIA 18 ZROBIONA, do commit+push**] Oba
  punkty ze spec (TASKS-UI.md PARTIA 18) wdrożone. tsc czysty (poza
  preexisting observer:43 viem/ox — niezmienione), `npm run build`
  przechodzi (tylko preexisting size-limit warnings).
  1. **`src/hooks/useBotApi.ts`**: `BotStateShape.tranche?` — kształt
     1:1 z `TrancheState` w bot/observer.ts (label/depositedUsd/
     startedAt zawsze obecne, reszta `number|null`).
  2. **Pasek „BILANS TRANSZY"** (`src/components/MorningCockpit.tsx`),
     NAD panelem zbiorczym Partii 17 — nowe klasy `.tranche-bar`/
     `.tranche-bar-stat`/`.tranche-bar-value`/`.tranche-breakdown`
     (styles.css, celowo mniejsza czcionka niż `.paper-total-header` —
     "spokojniejsza" wg spec). Kafle Wpłacone/Dziś łącznie/Różnica +
     linia rozbicia "w pozycjach $A + w portfelu $B · z tego ruch
     rynku ±$C · reszta ±$D" (tooltip na "reszcie" z dokładnym tekstem
     ze spec). `walletUsd`/`totalUsd`/`diffUsd`/`diffPct` → „—" gdy
     `null`, zero własnego liczenia sumy. Cały pasek renderuje się
     tylko gdy `bot.state.tranche` istnieje (świeży/stary bot bez
     paczki 29.08 — nic nie pokazuje, nie psuje layoutu).
  3. **Rozróżnienie miar**: kafel "PnL od startu" w panelu Partii 17
     dostał `title` (na wartości i na etykiecie) — "Liczone od kotwic
     pozycji, bez bufora i kosztów wejścia — pełny rachunek transzy
     jest w pasku wyżej". Panel Partii 17 poza tym BEZ ZMIAN (jak
     zastrzegał spec).
  4. Kolumna Koszty: sprawdzone — `costsUsd={bp?.costsUsd ?? null}`
     w MorningCockpit.tsx już było feature-detectem, NIE hardkodowane
     na `null` (Partia 15/17 to zrobiły dobrze). Nic do zmiany.
  5. Zero nowych requestów — wszystko z już wczytanego `/api/state`.
  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo —
  `tranche` w state u mnie na dysku nie było jeszcze widoczne live w
  tej sesji). Po commit+push: ping CC-Win (build + restart homos-server).

- [Fable→Sonnet, 28.08 ~rano] ZAPOWIEDŹ Partii 16: karty propozycji
  zwężenia/rozszerzenia (FLAT_NARROW/FLAT_WIDEN) — spec dopiszę do
  TASKS-UI po zbudowaniu FLAT_ENTER w observerze (dziś). NIE zaczynać
  przed spec.

- [Sonnet→CC-Mac, 27.08 — **PARTIA 15 ZROBIONA, do commit+push**] Wycena USD
  pozycji bez nogi stable/ETH (cbBTC/WETH, karta #5887690) z danych bota,
  zero nowych requestów. tsc czysty, `npm run build` przechodzi (tylko
  preexisting size-limit warnings). `src/components/MorningCockpit.tsx`
  jedyny dotknięty plik — **usePortfolio.ts świadomie NIE ruszany**, jego
  `valueUsd`/`hasUnknownValue` zostają dokładnie takie jak są (docstring
  "Valuation note" nadal aktualny dla samego hooka); fallback dokładany
  jest na warstwie prezentacji w MorningCockpit, więc `usePortfolio.ts` może
  bez zmian wrócić do użycia w innych miejscach (MyPositions.tsx itd.),
  gdyby kiedyś było potrzebne.
  1. **Mapa `botValueByTokenId`** (`bot.state?.positions[].valueUsd`,
     `BotWatchedPosition` z useBotApi.ts) policzona raz przed returnem,
     reużyta w nagłówku sumy i na każdej karcie.
  2. **Karta pozycji**: `cardValueUsd = p.valueUsd ?? botLivePos ?? null` —
     bot NIGDY nie nadpisuje realnej wyceny usePortfolio, tylko wypełnia
     `null`. Gdy użyta wycena bota: dopisek " (wycena bota)" przy kwocie,
     title z pełnym wyjaśnieniem (kurs ref., odświeżanie ≤5 min).
  3. **Pasek metryk (Partia 14, `PositionStatsBar`)**: "wartość teraz" do
     PnL/vsHODL = `p.valueUsd ?? lastPosHistPoint.equityUsd` (ostatnia
     próbka positions-history, ta sama liczba co bot.state, tylko z próbki
     zamiast z live state — obie już w USD). Kotwica (pierwsza próbka)
     bez zmian od Partii 14 — działała już poprawnie dla cbBTC, bo
     hodlUsd jest liczony przez observer niezależnie od ograniczenia
     usePortfolio.
  4. **Nagłówek sumy**: `adjustedTotalUsd = portfolio.totalUsd +
     Σ(bot.valueUsd dla pozycji z p.valueUsd===null)`. Gwiazdka/nota
     "pomija pozycje bez wyceny" zostaje TYLKO dla pozycji bez wyceny w
     OBU źródłach (dziś: teoretyczne, każda para śledzona przez bota ma
     usdRefPoolId) — treść noty zaktualizowana (nie wspomina już
     cbBTC/WETH jako przykładu pomijanego, bo już nie jest).
  Weryfikacja przez czytanie kodu + tsc/build (bez portfela na żywo). Po
  commit+push: ping CC-Win (build+restart homos-server) — można razem z
  wcześniejszymi partiami, jeśli jeszcze niewdrożone.

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

- [Fable→CC-Mac, 31.08 ~13:xx — **HOTFIX SEKWENCJI, NAJPILNIEJSZE
  DZIŚ (Rafał stoi w środku eksperymentu zwężenia z podpisanymi
  approvals)** — commit+push NATYCHMIAST, może iść RAZEM z paczką
  DOCS niżej (jeden push)] Zmiany (Fable, tsc czysty poza preexisting
  observer:43, `npm run build` przechodzi — 3 preexisting warnings):
  - `src/hooks/useCockpitActions.ts` — `waitReceiptBestEffort`
    EKSPORTOWANY + walidacja formatu hasha (wzorzec useHedgeExecution
    20.08);
  - `src/hooks/useRebalanceExecution.ts` — 3× surowe
    `waitForTransactionReceipt` (approvals z planu, dociągnięcie
    approve przed mintem, kroki 1..N) → `waitReceiptBestEffort`;
  - `src/hooks/useRotateExecution.ts` — te same 3 podmiany.
  TŁO (incydent ~12:3x, pierwsza bojowa sekwencja FLAT_NARROW
  #5887690): błąd Rabby+publicnode "Invalid parameters" na
  `eth_getTransactionReceipt` wysadzał sekwencję po KAŻDEJ wysłanej
  tx — 3 kliknięcia = 3 approvals na łańcuchu (Success), ZERO kroków
  właściwych, pozycja nietknięta, strat brak (~$0.002 gazu). Ta sama
  klasa co FIX 20.08 i Partia 13 — sekwencje były trzecim,
  niezałatanym miejscem.
  Komunikat: "fix(ui): best-effort receipt wait in rebalance/rotate
  sequences (Rabby+publicnode invalid-params, third occurrence)".
  **NATYCHMIAST po pushu ping CC-Win (build+restart homos-server) —
  Rafał czeka z dokończeniem zwężenia.**

- [Fable→CC-Mac, 31.08 ~przegląd — DOCS PRZEGLĄDU, WYPCHNIJ OD RAZU]
  Commit+push: `HANDOFF.md` (zlecenia + stan po przeglądzie + higiena),
  `CONTEXT.md` (dziennik 31.08 — decyzje przeglądu, odbiór skanu 13/13,
  incydent+hotfix, START EPIZODU #5908083), `RESEARCH-QUEUE.md` (E1
  zamknięty, E4 przegląd odbyty, backlog v4-hooki), `TASKS-UI.md`
  (PARTIA 20 spec + ✅), `TASKS-FUNNEL.md` (§2 LEJEK v2 spec) —
  **ORAZ PARTIA 20 od Sonneta (odebrana przez Fable, spot-check OK):**
  `src/components/{BotTelemetry,ClosedPositionsPanel,
  CockpitPositionActions,MorningCockpit,ObservationAnalysis}.tsx`,
  `src/hooks/usePortfolio.ts`, `src/styles.css` + NOWY
  `src/components/cycleLine.tsx` — **commituj `git add -A`** (nowy
  plik!). Partia 20 jako OSOBNY commit w tym samym pushu, komunikat:
  "feat(ui): bot-sourced range suggestions + cycle language in telemetry
  + closed-position USD fallback (partia 20)". Po pushu ping CC-Win:
  build+restart homos-server (jednym deployem z resztą).
  Komunikat: "docs: przegląd 31.08 — eksperyment zwężenia cbBTC,
  bramka=walkforward, lejek → metryka wide (pilot CC-Win)".
  NATYCHMIAST po pushu ping CC-Win — czeka z wolnymi mocami na skan.

- [Fable→CC-Mac, 29.08 wieczór #2 — **PACZKA „SZEROKOŚĆ ZWĘŻENIA",
  PILNA (zegar cbBTC może potwierdzić flat dziś wieczorem)**]
  Commit+push: `bot/config.ts` (nowe pole `BotPool.productNarrowWidthPct`
  + wartości: base-030 = 8, cbBTC = 6), `bot/observer.ts`
  (`proposeFlatNarrow` używa `suggestFixedRange` z tą szerokością
  zamiast doradcy k×σ×√7; nota propozycji mówi, skąd wzięła się
  szerokość i ile to progów wyjścia; fallback na k×σ zostaje dla pul
  bez ustawionej wartości). tsc czysty (poza preexisting observer:43).
  **AKTUALIZACJA ~12:5x — szerokość to ±5% NA OBU PULACH** (nie 6/8):
  Rafał chce dziś wejść w wąski zakres, więc policzyłem sweep od razu
  (flatwindows, cache 365d, CONFIRM_H=12). ΣEV zwężania rośnie
  monotonicznie im wężej — cbBTC: ±8% $193 / ±6% $334 / ±5% $442 /
  ±4% $570 / ±3% $685; base-030: ±8% $195 / ±6% $388 / ±5% $525 /
  ±4% $672 — ale poniżej ±5% psuje się udział czasu w zakresie
  (cbBTC ±3%: 59–79% w kilku epizodach). ±5% = dokładnie próg
  wyjścia z flatu, więc krawędź pasma pokrywa się z sygnałem
  FLAT_WIDEN. Decyzja Rafała: ±5% na obu pulach.
  Komunikat: "fix(product): flat narrowing uses product width, not
  v1.2 advisor k×σ".
  **DEADLINE: 19:41Z (21:41 lokalnie)** — o tej godzinie mija 12h
  zegara flatu na cbBTC i bot wystawi pierwszą w historii propozycję
  FLAT_NARROW. Jeśli paczki tam nie będzie, przyjdzie ona ze starą
  formułą (±16% zamiast ±6%). NATYCHMIAST po pushu ping CC-Win —
  wdrożenie to sam `nssm restart homos-bot`, bez builda.

- [Fable→CC-Mac, 29.08 ~21:xx — DOCS, zamknięcie dnia] Commit+push:
  `CONTEXT.md` (obalenie wariantu bez swapu na obu pulach + recent90,
  falsyfikacja swingu, sweepy szerokości idle, zamknięcie dnia),
  `RESEARCH-QUEUE.md` (E6 pkt 1 zamknięty, pkt 3 z wynikami, pkt 7
  swing), `HANDOFF.md` (stan + higiena). Bez zmian w kodzie.
  Komunikat: "docs: dzień 2 zamknięty — trzy kandydatury odrzucone
  bramką 720d, produkt bez zmian". Ping CC-Win niepotrzebny (ma swoją
  kolejkę nocną), Sonnet nie ma dziś zadań.

- [Fable→CC-Mac, 29.08 ~17:xx — **PACZKA „REBALANS BEZ SWAPU", PILNA
  (CC-Win czeka z przebiegami 720d)**] Commit+push:
  `backtest/strategies.ts` (nowa opcja `recenter:'noswap'` w
  `flatOnlyLP` + helper `rangeNoSwap` — przesuwa zakres pod skład
  portfela zamiast dopłacać różnicę swapem; do zakresu jednostronnego
  włącznie), `backtest/fullperiod.ts` i `backtest/walkforward.ts`
  (po dwa wiersze `noswap` w zestawach `product`), `CONTEXT.md`,
  `HANDOFF.md`. tsc czysty. Smoke Fable na 365d obu pul: wariant bez
  swapu wychodzi najlepszym wierszem tabeli (cbBTC $1368 vs $1345;
  base-030 $2428 vs $1869, maxDD −18.2% zamiast −47.0%).
  Komunikat: "feat(backtest): no-swap posture change (inventory-fitted
  range) in flatOnlyLP". NATYCHMIAST po pushu ping CC-Win.

- [Fable→CC-Mac, 29.08 ~13:xx — **PACZKA „PRODUKT W BACKTEŚCIE"**]
  Commit+push: `backtest/strategies.ts` (nowa opcja `narrowWidth`
  w `flatOnlyLP` — stała szerokość wąskiej nogi zamiast k×σ×√7;
  nazwa strategii pokazuje szerokość), `backtest/fullperiod.ts`
  (`FP_SET=product` — 12 wariantów: hodl/cash/passiveW ±40/±50 +
  hybryda ±4/±5/±8% × idle ±40/±50 + k×σ jako referencja sprzed
  29.08), `backtest/walkforward.ts` (`WF_SET=product` — ten sam
  zestaw pod bramkę wielookienną), `CONTEXT.md`, `RESEARCH-QUEUE.md`,
  `HANDOFF.md`. tsc czysty (poza preexisting observer:43).
  Smoke Fable (kontener, transpilacja tsc→node, cache 365d,
  SIGMA_MODE=grid15, $2500): przebiegi przechodzą, wyniki w CONTEXT.
  Komunikat: "feat(backtest): fixed narrow width in flatOnlyLP +
  product sets (FP_SET/WF_SET=product)".
  **PILNE po pushu: ping CC-Win** — decyzja Rafała 29.08: pełen
  zestaw przebiegów (fullperiod 720d + bramka WF_SET=product) idzie
  DZIŚ/W NOCY, nie w poniedziałek. Bez tego pusha CC-Win nie ma
  `WF_SET=product` ani `narrowWidth`, więc to on jest wąskim gardłem.

> (TEST WRAŻLIWOŚCI FEE_SHARE_L=end ZROBIONY 29.08 ~16:xx — luka
> praktycznie się NIE zamyka na żadnej pulę [cbBTC ~5% z 18%
> potrzebnych, base-030 ~0.6% z 63%], wzmacnia werdykt "zwężanie nie
> działa". Pełny raport w skrzynce @Fable powyżej. WF_SET=product
> z tym flagiem jeszcze nieodpalony — czekam na sygnał, czy dziś czy
> poniedziałek.)

- [Fable→CC-Mac, 29.08 ~16:xx — DOCS, ZWROT PO BRAMCE 720d]
  Commit+push: `CONTEXT.md` (wyniki fullperiod+walkforward 720d,
  mechanizm „fee ↑4×, wynik ↓", falsyfikacja założenia o pomijalnym
  IL w flatwindows, rekomendacja: NIE podpisywać dzisiejszego
  zwężenia), `RESEARCH-QUEUE.md` (E4: zwężanie obalone bramką 720d,
  kandydat do E5; flatwindows do przepisania z IL), `HANDOFF.md`
  (higiena). Bez zmian w kodzie — parametry zostają jak są do
  decyzji przeglądu. Komunikat: "docs: 720d gate falsifies flat
  narrowing — wide passive wins, also inside flat regime".

- [Fable→CC-Mac, 29.08 wieczór — DOCS, zamknięcie dnia 2] Commit+push:
  `CONTEXT.md` (dziennik: 4 paczki wdrożone, pochodzenie bufora
  domknięte rachunkiem, korekta mojej estymaty kosztów wejścia,
  decyzja o σ grid15 dla bota + punkt cięcia serii paper),
  `RESEARCH-QUEUE.md` (agenda 31.08: decyzje UI, bilans transzy,
  pierwszy tydzień produktu, zakres docelowy grid15, σ w UI),
  `HANDOFF.md` (higiena — skrzynka @Fable opróżniona, zlecenie
  SIGMA_MODE dla CC-Win). Bez zmian w kodzie. Komunikat: "docs:
  dzień 2 produktu zamknięty — σ grid15 dla bota, agenda 31.08".
  **ZROBIONE po stronie CC-Win** (σ ustawiona, sanity zielone) —
  ping już niepotrzebny. Dodatkowo do tego commita: wpis o rozjeździe
  szerokości zwężenia model (±6/8%) vs produkt (k×σ ≈ ±16/19%),
  wpisany do CONTEXT i RESEARCH-QUEUE jako punkt nadrzędny agendy
  31.08. Komunikat: "docs: dzień 2 zamknięty — σ grid15 live +
  rozjazd szerokości zwężenia model vs produkt (agenda 31.08)".

- [Fable→CC-Mac, 29.08 ~popołudnie #2 — **PACZKA „REAKCJA NA PIERWSZY
  POMIAR"** (odpowiedź na raport CC-Win + screenshot Rafała; może pójść
  RAZEM ze „sprzątaniem po v1.2" niżej, jeśli tamto jeszcze nie poszło)]
  Commit+push: `bot/observer.ts` — (a) backfill gazu bierze NAJPIERW
  transakcje żywych pozycji (bez tego `costsUsd` czekał na przemielenie
  519-dniowych pyłków z mainnetu — zgłoszenie CC-Win), (b) `tranche`
  dostał `walletParts` (skład portfela per token — audytowalność) oraz
  rozbicie reszty na `entryCostUsd` (stałe) i `bufferBetaUsd` (pływa
  z ceną; kotwica bufora w `.bot/tranche-anchor.json`, zapisywana przy
  pierwszym udanym odczycie sald); `scripts/morning-report.ts` (te
  linie w sekcji BILANS TRANSZY + skład portfela); `TASKS-UI.md`
  (PARTIA 19 ✅), `CONTEXT.md`, `HANDOFF.md`.
  **PARTIA 19 od Sonneta WCHODZI DO TEJ SAMEJ PACZKI** (odebrana przez
  Fable, spot-check OK): `src/components/MorningCockpit.tsx` (etykiety
  „Wartość łączna (cały portfel, wszystkie sieci)" i „Dziś łącznie
  (transza 1, Base)" + tooltipy — liczby BEZ zmian, rozjazd $327.84
  był różnicą definicji, nie błędem) oraz
  `src/components/PositionCharts.tsx` (`statFmtUsd`: 2 miejsca po
  przecinku dla kwot < $10, więc fee $0.41 i gaz w centach przestają
  wyglądać jak „$0"; duże kwoty bez zmian).
  tsc czysty (poza preexisting observer:43), `npm run build` przechodzi.
  Komunikat: "feat(bot): wallet breakdown + entry-cost/buffer-beta
  split; fix(bot): prioritize live positions in gas backfill;
  feat(ui): tranche vs portfolio labels + cent-scale amounts (partia 19)".
  Po pushu ping CC-Win — to ostatnia paczka do wdrożenia zbiorczego.

- [Fable→CC-Mac, 29.08 ~popołudnie — **PACZKA „SPRZĄTANIE PO v1.2"
  (osobny commit — paczka zbiorcza jest już wypchnięta jako afde006)**]
  **UWAGA: są tu USUNIĘTE PLIKI — commituj przez `git add -A`**
  (samo `git add <ścieżki>` nie złapie kasowań).
  Usunięte: `src/components/ForecastPanel.tsx`, `backtest/forecast.ts`,
  `backtest/results/forecast.json` (decyzja Rafała 29.08: martwy kod
  usuwamy, nie chowamy — historia jest w gicie).
  Zmienione: `src/components/MorningCockpit.tsx` (import + `<ForecastPanel/>`
  wypięte), `src/styles.css` (−99 linii `.forecast-*`; **`.forecast-negative`
  ZOSTAJE** — reużywana w MorningCockpit/PaperTradingPanel/PositionCharts),
  `bot/observer.ts` (guard produktowy w `maybePropose` + auto-odrzucanie
  wiszących REBALANCE na pulach produktowych), `KAPITAL-REKOMENDACJA.md`
  i `DB-SCHEMA.md` (znaczniki historyczności), `CONTEXT.md`, `HANDOFF.md`.
  tsc czysty (poza preexisting observer:43), `npm run build` przechodzi.
  Komunikat: "chore(ui): remove forecast panel (v1.2 leftover);
  fix(bot): no advisor REBALANCE on product pools". Po pushu ping CC-Win —
  wdrożenie idzie RAZEM z afde006, jednym build+restartem.

- [Fable→CC-Mac, 29.08 — **PACZKA ZBIORCZA „POMIAR PIENIĘDZY" +
  PARTIA 18 — wszystko w JEDNYM commit+push**] ✅ ZROBIONE (afde006). Partia 18 od Sonneta
  ODEBRANA i sprawdzona przez Fable (typy `tranche` zgodne z bot-side
  co do pola, nulle renderowane jako „—", panel Partii 17 nietknięty
  poza tooltipem; tsc czysty, `npm run build` przechodzi — tylko
  preexisting size-limit warnings). Commit+push RAZEM:
  - `bot/config.ts` — stała `TRANCHE` (wpłacone 6 092 USDC, start
    27.08, sieć base);
  - `bot/observer.ts` — `feesUsd` (fee narosłe, symulacja `collect()`),
    `costsUsd` (gaz z RECEIPTÓW, cache `.bot/tx-costs.json`),
    `state.tranche` (bilans transzy z odczytem sald portfela);
  - `scripts/morning-report.ts` — sekcja BILANS TRANSZY, nowe kolumny
    POZYCJI REALNYCH, **digest Telegrama przepięty z paper-tradingu
    na pozycje realne**;
  - `src/components/MorningCockpit.tsx`, `src/hooks/useBotApi.ts`,
    `src/styles.css` — PARTIA 18 (pasek bilansu + tooltipy);
  - `TASKS-UI.md` (PARTIA 18 ✅), `RESEARCH-QUEUE.md` i `CONTEXT.md`
    (termin przeglądu 31.08 + dziennik), `HANDOFF.md`.
  Komunikat: "feat(bot): position gas costs + tranche balance;
  feat(ui): tranche balance bar (partia 18); feat(report): real-position
  columns + telegram digest on real positions".
  **NATYCHMIAST po pushu ping CC-Win** — wdrożenie zbiorcze czeka
  tylko na ten commit.

- [Fable→CC-Mac, 28.08 ~wieczór #3 — PACZKA "compare kotwic"]
  Commit+push: backtest/flatwindows.ts (detekcja wyciągnięta do
  funkcji detect(hlDays) + tryb COMPARE_HL_D — porównanie epizodów
  dwóch EMA: parowanie po nakładaniu, przewaga startu, epizody
  tylko-na-jednej-kotwicy; smoke Fable w kontenerze na cbBTC-365d:
  detekcja bazowa IDENTYCZNA z wynikiem 27.08, HL5d wcześniej w
  10/12, mediana +19h, ΣEV +23%), RESEARCH-QUEUE.md, HANDOFF.md,
  CONTEXT.md. tsc czysty. Komunikat: "feat(backtest): flatwindows
  COMPARE_HL_D — anchor comparison mode". Po pushu ping CC-Win
  (zadanie MA TERMIN poniedziałek — nie wykonywać wcześniej).

- [Fable→CC-Mac, 28.08 ~wieczór #2 — DOCS] Commit+push: CONTEXT.md
  (dziennik: Partia 17 wdrożona i zweryfikowana, zegar cbBTC od
  18:33), HANDOFF.md. Komunikat: "docs: partia 17 zweryfikowana —
  dzień 1 produktu zamknięty".

- [Fable→CC-Mac, 28.08 ~wieczór — PACZKA mini "cykl w state" + spec]
  Commit+push: bot/observer.ts (positions[].posture wide/narrow/null
  + flatParams w state.json root), TASKS-UI.md (PARTIA 17 spec),
  HANDOFF.md, CONTEXT.md. tsc czysty (poza preexisting observer:43).
  Komunikat: "feat(bot): posture + flatParams in state (partia 17
  bot-side)". Po pushu ping CC-Win.

- [Fable→CC-Mac, 28.08 ~popołudnie #2 — DOCS zamknięcie dnia]
  Commit+push: RESEARCH-QUEUE.md (paczka decyzyjna E4/1.09),
  HANDOFF.md (higiena + stan), CONTEXT.md (dziennik). Komunikat:
  "docs: dzień 1 produktu domknięty — paczka decyzyjna flat na 1.09".

- [Fable→CC-Mac, 28.08 ~popołudnie — **PACZKA ZBIORCZA (ZASTĘPUJE
  wpis "PACZKA #2" niżej — wszystko w JEDNYM commit+push)**] Partie
  16+16b Sonneta ODEBRANE przez Fable (spot-check kodu OK, tsc/build
  czyste). Commit+push RAZEM: bot/observer.ts (paczka #2 — procedura
  awaryjna), EMERGENCY.md (NOWY), src/hooks/useBotApi.ts,
  src/components/{MorningCockpit,CockpitPositionActions,
  PositionCharts,ObservationAnalysis}.tsx, src/styles.css (Partie
  16+16b), TASKS-UI.md (nagłówki 16/16b ✅), HANDOFF.md, CONTEXT.md.
  **UWAGA: katalog `.claude/` (untracked) NIE wchodzi do commita —
  dopisz `.claude/` do .gitignore w tym samym commicie.** Komunikat:
  "feat(product): emergency procedure + flat proposal cards (partie
  16/16b); docs: EMERGENCY.md". Po pushu OD RAZU ping CC-Win.

- [Fable→CC-Mac, 28.08 ~południe — **PACZKA #2 "PROCEDURA AWARYJNA"**]
  Commit+push: bot/observer.ts (proposeExitTrend: pule produktowe
  emitują DWIE propozycje emergency — HEDGE delta-neutral pełnej nogi
  zmiennej [cbBTC→rynek BTC/USD, ręcznie] + EXIT_TREND „zwykle NIE
  podpisuj"; dedup per kind; pole Proposal.emergency), EMERGENCY.md
  (NOWY — kiedy co, koszty, kolejność, niuans czujnika krachu USD),
  TASKS-UI.md (PARTIA 16b), HANDOFF.md, CONTEXT.md. tsc czysty (poza
  preexisting observer:43). Komunikat: "feat(bot): emergency procedure
  — dual defense proposals on product pools; docs: EMERGENCY.md".
  Po pushu ping CC-Win.

- [Fable→CC-Mac, 28.08 ~przedpołudnie — **PACZKA "FLAT_ENTER/
  FLAT_EXIT", PILNA (cbBTC muska próg flat — zegar musi ruszyć)**]
  Commit+push: bot/config.ts (stała FLAT — parametry detektora),
  bot/observer.ts (maszyna stanów flat per pula produktowa +
  propozycje FLAT_NARROW/FLAT_WIDEN + sprzątanie po podpisie +
  flat-state.json persystowany), scripts/morning-report.ts (NOWA
  sekcja POZYCJE REALNE: wartość/vsHODL/PnL od kotwicy/gap/flat),
  TASKS-UI.md (PARTIA 16 spec), HANDOFF.md, CONTEXT.md. tsc czysty
  (poza preexisting observer:43 viem/ox). Komunikat: "feat(bot):
  FLAT_ENTER/FLAT_EXIT — flat detector + narrow/widen proposals;
  report: real positions section". NATYCHMIAST po pushu ping CC-Win.

- [Fable→CC-Mac, 28.08 ~rano — DOCS brief dzień 1 + zlecenia]
  Commit+push: HANDOFF.md (higiena skrzynki @Fable + zlecenia
  CC-Win/Sonnet), CONTEXT.md (§1 + dziennik 28.08). Komunikat:
  "docs: brief dzień 1 — gap cbBTC muska próg flat; zlecenia pod
  FLAT_ENTER". Po pushu ping CC-Win (ma PILNY cross-check).

- [Fable→CC-Mac, 27.08 ~noc #2 — HOTFIX UI "dashe zamiast $0"
  (zgłoszenie Rafała po restarcie bota)] Commit+push:
  src/hooks/useBotApi.ts (BotWatchedPosition + opcjonalne pola
  agregatów księgi), src/components/MorningCockpit.tsx (pasek metryk
  czyta collectedFeesUsd/costsUsd/rebalances z bot.state.positions
  feature-detectem — było zahardkodowane null z Partii 14), CONTEXT.md,
  HANDOFF.md. tsc czysty. Komunikat: "fix(ui): wire ledger aggregates
  into position stats bar". Po pushu ping CC-Win: `npm run build` +
  `nssm restart homos-server`. Sanity: karty #5886957/#5887690 mają
  "Fee reinwestowane $0" i "Rebalanse 0" (Koszty zostaje "—").

- [Fable→CC-Mac, 27.08 ~noc — PACZKA "ledger→pozycje (bot-side
  Partii 14)"] Commit+push: bot/observer.ts (agregaty księgi per żywa
  pozycja: `collectedFeesUsd` [COLLECT−DECREASE, null gdy księga nie
  umie wycenić], `rebalances` [liczba DECREASE], `costsUsd` null do
  czasu indeksowania gazu — pola w state.positions, UI Partii 14
  podchwyci je feature-detectem), HANDOFF.md, TASKS-UI.md (PARTIA 15
  spec), RESEARCH-QUEUE.md (E3b). tsc czysty. Komunikat: "feat(bot):
  ledger aggregates on live positions (partia 14 bot-side)". Po pushu
  ping CC-Win: `nssm restart homos-bot` (bot-side, bez builda UI).
  Sanity: /api/state.positions[].collectedFeesUsd === 0 i rebalances
  === 0 dla obu świeżych pozycji (żadnych COLLECT/DECREASE jeszcze).

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
> (SKAN WIDE ZROBIONY 31.08 — WSZYSTKIE 13 pul, obie grupy — pełny
> raport w skrzynce @Fable powyżej. WNIOSEK: jedyna prawdziwa wygrana
> to mainnet-tbtc-wbtc-001 [BTC-BTC pegged]; cała grupa 2 (7 par ETH/
> stable) FAIL jednolicie; stable-stable formalnie przechodzi ale
> ekonomicznie nieistotne; wTAO nierozstrzygnięte [za mało danych].
> UWAGA proceduralna: użyty ad-hoc skrypt scratchpad NIE zapisywał
> do backtest/results/ [żeby nie nadpisać innych committed baseline'ów
> — jak przy idle-width 30.08], więc nie ma tam JSON-ów do skanu —
> pełne tabele tylko w HANDOFF/historii commitów, jeśli potrzebne
> jako pliki, dam znać i domknę osobno.)

> **ODEBRANE (Fable 30.08 ~11:xx): oba walkforwardy idle-width —
> robota ekspresowa i wzorowa, zwłaszcza zgłoszenie "obraz różni się
> od fullperiod" wprost, z kryterium przyłożonym tak, jak je podałem.
> WERDYKT: kryterium NIE spełnione rozstrzygająco (win-rate remisuje
> na obu pulach), maksimum z fullperiodu uznaję za artefakt jednej
> daty wejścia — produktowe ±40/±50 ZOSTAJĄ BEZ ZMIAN. Wnioski
> szersze (żadna szerokość bez dodatniej średniej vsHODL; fullperiod
> vs walkforward niezgodne co do znaku) przepisane do CONTEXT i na
> agendę przeglądu. Skrzynka wysprzątana (decyzja Rafała) — historia
> w gicie. NA DZIŚ BRAK DALSZYCH ZLECEŃ; zostaje jedno żywe zadanie
> na jutro rano (COMPARE_HL_D, wpis niżej). Dobrej nocy przed
> przeglądem.**

> (COMPARE_HL_D ZROBIONE 31.08 rano na świeżym cache — pełny raport
> w skrzynce @Fable powyżej. HL5d wygrywa ΣEV na obu pulach, ale
> efekt dużo silniejszy na cbBTC [13.1h mediana] niż base-030
> [1.4h — na granicy szumu]. To zamyka paczkę decyzyjną przed
> przeglądem 31.08.)
