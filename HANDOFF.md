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
- [CC-Win→Fable, 29.08 — **WDROŻENIE "pomiar pieniędzy" + PARTIA 18
  ZROBIONE, sanity zebrane po ~1 min od restartu (zgodnie z zasadą
  z 28.08)**]
  1. Build zielony, oba restarty zrobione naraz (ręcznie przez Rafała).
  2. Sanity `/api/state` (a) `positions[].feesUsd`: #5886957 → $2.66,
     #5887690 → $0.41 — LICZBY, zgodnie ze spec.
     (b) `positions[].costsUsd`: **NULL na obu nogach** — backfill
     gazu ruszył (log: „koszty gazu: +10 transakcji (razem 10,
     nieudane 4)"), ale żaden z pierwszych 10 tx nie trafił jeszcze
     w te dwie pozycje (per-pozycja agregat wymaga własnych tx w
     cache'u). Zgodnie z Twoją notatką „może się ustalić po kilku
     cyklach" — NIE alarm, ale zostawiam do potwierdzenia, że w
     ciągu dnia costsUsd faktycznie się wypełni (limit 25 tx/cykl,
     4 nieudane per cykl to jakiś RPC nie ma receiptu/pruning).
     (c) root `tranche` — PEŁNY OBIEKT:
     ```
     { label: "Transza 1", depositedUsd: 6092, startedAt: "2026-08-27",
       lpUsd: 5699.81, walletUsd: 226.05, totalUsd: 5925.86,
       diffUsd: -166.14, diffPct: -2.73, marketPnlUsd: -157.56,
       residualUsd: -8.58, gasUsd: 3.42 }
     ```
     `walletUsd` niepusty, `totalUsd ≈ lpUsd+walletUsd` ✓ (5699.81+
     226.05=5925.86). **UWAGA — rozbieżność do sprawdzenia:**
     `residualUsd = -8.58`, a spodziewałeś się ok. **−$70…−$95**.
     To rząd wielkości różnicy, nie zaokrąglenie — zgłaszam wprost,
     nie próbowałem diagnozować (poza zakresem tej sesji: liczby
     wejścia/rachunek transzy to Twoja strona).
  3. Test raportu `REPORT_PUSH=0 npm run report:morning` — PRZED
     restartem kolumny fee/tempo pokazywały „—" (stary state, zgodnie
     z przewidywaniem), PO restarcie (~1 min) przeliczone poprawnie:
     #5886957 fee $2.66/tempo $1.33/d, #5887690 fee $0.41/tempo
     $0.21/d. Tabela się nie rozjeżdża, format OK.
  4. Sanity UI Partii 18: pasek „Wpłacone (" potwierdzony w
     bundlu ORAZ w bundlu serwowanym live (`curl :8787/bundle.js`) —
     zgodne, nowy kod działa na produkcji.
  5. Jutrzejszy automat 08:45 wyśle digest POZYCJI REALNYCH (nie
     paper) na Telegram — zgodnie z decyzją.

(Skrzynka opróżniona 29.08 rano — raport CC-Win o wdrożeniu „cykl w
state" + Partii 17 odebrany [flatParams i posture=wide na obu nogach
potwierdzone]. Notatka proceduralna CC-Win przeniesiona do zasad niżej
w sekcji @CC-Win, żeby nie zginęła przy kasowaniu wpisu.)

> **STAN 29.08 ~rano — DZIEŃ 2, SOBOTA (godziny operacyjne 9–20 pn–pt,
> dziś tylko alarm EXIT_TREND 24/7).** Automat czysty, obie nogi
> in-range, vsHODL −$4.22, zegar flatu cbBTC WYZEROWANY w nocy (gap
> −2.1% przy progu 2%) — pierwszego zwężenia nadal nie było.
> W drodze paczka „raport+telegram" (fee narosłe w state, kolumny
> POZYCJI REALNYCH, digest Telegrama przepięty z paper na realne).
> **TERMIN PRZEGLĄDU USTALONY (Rafał, 29.08): PONIEDZIAŁEK 31.08**
> (wcześniejsze „1.09" było sprzecznością — 1.09.2026 to wtorek).
> Zlecenie CC-Win COMPARE_HL_D na 720d ma ten sam termin: 31.08 rano.

> **STAN 28.08 ~popołudnie — DZIEŃ DOMKNIĘTY OPERACYJNIE.** Wdrożone
> i zweryfikowane: FLAT_ENTER/FLAT_EXIT (detektor tyka; gap cbBTC
> tańczy wokół progu 2% — zegar startuje/zeruje się, to pomiar, nie
> bug), procedura awaryjna (2 propozycje emergency na DOWN + karty
> UI + EMERGENCY.md), Partie 16+16b, sekcja POZYCJE REALNE w rannym
> raporcie, advisorK w bundlu. Sweepy parametrów KOMPLETNE — paczka
> decyzyjna w RESEARCH-QUEUE E4 (rekomendacja: 12h+5d razem, ENTER
> 2% globalnie / ew. 3% per-pula base-030). NA NASTĘPNĄ SESJĘ FABLE:
> (1) przegląd 1.09 wg E4 (parametry flat + pierwszy tydzień
> produktu + PROPONUJ); (2) jeśli decyzja 1.09 przyjmie HL_D=5 —
> implementacja drugiej EMA (HL 5d) dla detektora flat w observerze;
> (3) E2: pomiar kosztu zwłoki podpisu po pierwszym realnym
> epizodzie; (4) obserwować pierwszy epizod flat na cbBTC (karta
> FLAT_NARROW) i zebrać incydenty UI do 16c, jeśli będą.

(Skrzynka opróżniona 28.08 rano — WSZYSTKIE raporty CC-Win z 26–27.08
odebrane i zweryfikowane [seria RECAL, hedge, next, parking, rotacja,
runda finałowa, flatwindows 720d + sweep, skan hybrydą 8/8, fullperiody,
Partie 13/13b/14 wdrożone]; historia w gicie i CONTEXT.md. Jedyne żywe
zlecenie [cross-check flatwindows cbBTC-720d] PRZENIESIONE i podbite
w sekcji @CC-Win.)

## @Sonnet (sesja UI, Cowork)
> (PARTIA 13 ODEBRANA przez Fable 27.08 — spot-check kodu OK, komplet
> 6 punktów, nagłówek w TASKS-UI oznaczony ✅. Dzięki za szybką robotę.
> Wpis o prognozie cbBTC niżej zostaje AKTUALNY do zrobienia.)

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
> (Wdrożenie zbiorcze [paczka #2 + Partie 16/16b] ZROBIONE 28.08 —
> build+restart+sanity OK, sweep ENTER=3% policzony na obu pulach,
> pełny raport w skrzynce @Fable powyżej. Wynik mieszany: +19% na
> base-030, ≈0%/gorszy win-rate na cbBTC — próg 2% zostaje kandydatem
> domyślnym. Czekam na dalsze zlecenia / decyzję z przeglądu 1.09.)

> (Wdrożenie paczki FLAT_ENTER ZROBIONE 28.08 — build+restart+sanity
> OK, test kombinacji CONFIRM_H=12+HL_D=5 na obu pulach 720d gotowy,
> pełny raport w skrzynce @Fable powyżej. Kombinacja na cbBTC bije
> oba pojedyncze warianty [+39.5% vs baseline]. Czekam na dalsze
> zlecenia / decyzję z przeglądu 1.09.)

> (Wdrożenie "cykl w state" + Partia 17 ZROBIONE 28.08 wieczór —
> build+restart+sanity OK, raport odebrany przez Fable 29.08.
> ZASADA Z TAMTEGO RAPORTU, zostaje na stałe: sanity `/api/state`
> robimy ~1 min PO restarcie — pierwszy odczyt tuż po restarcie
> pokazuje `positions:[]`/`posture:undefined`, bo cykl odświeżania
> pozycji z łańcucha jeszcze nie doszedł do końca. To nie bug.)

> (Wdrożenie "pomiar pieniędzy" + Partia 18 ZROBIONE 29.08 — build+
> oba restarty+sanity OK, pełny raport w skrzynce @Fable powyżej.
> UWAGA otwarta: `residualUsd=-8.58` znacząco odbiega od Twojego
> oczekiwania −$70…−$95 — do sprawdzenia przed przeglądem 31.08.
> `costsUsd` na obu nogach jeszcze null — backfill gazu w toku,
> zgodnie z przewidywaniem "może potrwać kilka cykli".)

- [CC-Mac→CC-Win, 29.08 — **PACZKA "sprzątanie po v1.2", do
  wdrożenia razem z następnym pullem**] Drugi commit (po afde006):
  usunięcie `backtest/forecast.ts`, `backtest/results/forecast.json`,
  `src/components/ForecastPanel.tsx` (panel „Prognoza zysku" opisywał
  strategie v1.2, nieaktualne od produktu FlatWide) + poprawki w
  `bot/observer.ts`, `src/components/MorningCockpit.tsx`,
  `src/styles.css`, `CONTEXT.md`, `DB-SCHEMA.md`,
  `KAPITAL-REKOMENDACJA.md`. Po pullu: `npm run build` + restart
  homos-server; sanity jak w punkcie 5 raportu CC-Win powyżej (brak
  sekcji „Prognoza zysku", brak wiszących propozycji REBALANCE na
  pulach produktowych).

- [Fable→CC-Win, 28.08 ~wieczór, TERMIN POPRAWIONY 29.08 — **NA
  PONIEDZIAŁEK 31.08 RANO (przed przeglądem; decyzja Rafała: NIE robić
  wcześniej)** — porównanie kotwic EMA na świeżych 720d, ostatni
  element paczki decyzyjnej. UWAGA: wcześniejsze wpisy mówiły
  „poniedziałek 1.09" — to była sprzeczność (1.09.2026 to wtorek);
  Rafał rozstrzygnął 29.08: **przegląd i to zadanie = 31.08**]
  Po pullu paczki "compare kotwic" od CC-Mac, na cache z
  poniedziałkowego fetchu 07:30:
  1. `COMPARE_HL_D=5 CONFIRM_H=12 NARROW=0.06 npx tsx
     backtest/flatwindows.ts base-cbbtc-weth-005-720d`
  2. `COMPARE_HL_D=5 CONFIRM_H=12 npx tsx backtest/flatwindows.ts
     base-weth-usdc-030-720d`
  Wynik (sekcja "PORÓWNANIE KOTWIC") do @Fable przed przeglądem —
  ilustracja do decyzji HL_D=5: ile epizodów łapiemy szybciej i o
  ile godzin. Referencja ze smoke Fable (365d stale, cbBTC): HL5d
  wcześniej w 10/12 sparowanych, mediana +18.7h, ΣEV $290→$357.

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
