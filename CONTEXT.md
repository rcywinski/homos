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

### 2026-08-10 — Sesja UI (Sonnet) — Partia 4b (częściowo): [Zatwierdź] dla REBALANCE
Wykonana Partia 4b dla REBALANCE (punkt 1 checklisty); ROTATE świadomie
zostawiony jako TODO (punkt 2) — builder tego nie obsługuje, patrz niżej.

1. **[Zatwierdź] dla REBALANCE**: nowy `src/hooks/useRebalanceExecution.ts`
   wykonuje `RebalancePlan` z `src/utils/rebalanceBuilder.ts` (sesja
   analityczna, tylko import — plik nietknięty). Sekwencja: approvals z planu
   (approve tylko gdy allowance nie starcza) → krok 1 decrease+collect
   (dokładny) → krok 2 swap (jeśli nie `swapSkipped`) → krok 3 mint —
   PRZEBUDOWANY tuż przed wysłaniem z faktycznych sald (`buildMintStep`), bo
   krok w planie to tylko estymata z podglądu. Jeśli realne saldo po swapie
   przekracza wcześniej zaaprobowaną (estymowaną) kwotę, przed mintem
   dociągany jest dodatkowy approve — inaczej mint mógłby zrewertować mimo
   udanych kroków 1–2. Postęp (`saveProgress`/`loadProgress`, localStorage per
   chainId+tokenId) przeżywa odświeżenie strony — ponowne [Zatwierdź] pomija
   kroki już potwierdzone (resume). Failure w środku = komunikat "środki
   bezpieczne, dokończ pozostałe kroki", stan zapisany.
2. **Nowy modal** `src/components/RebalanceSequenceModal.tsx` — lista kroków
   planu (label+detail z buildera), status wykonania, przycisk zmienia się na
   "Dokończ (krok N/M)" gdy wykryje niedokończony progress w localStorage.
3. **`usePortfolio.ts` rozszerzony** (w zakresie edycji tej sesji, nie bot/**):
   `PortfolioPosition.feesOwed0Raw`/`feesOwed1Raw` (bigint jako string, z tej
   samej symulacji static-collect co dotychczasowe `feeAmount0/1`) —
   `planRebalance()` chce dokładnych nieodebranych fee, nie zaokrąglonych
   przez `Number()`.
4. **ROTATE — świadome TODO**: `planRebalance()` bierze jeden `Pool` na
   wejściu (zakłada, że stara i nowa pozycja są w TEJ SAMEJ puli) — przy
   ROTATE zawsze są w różnych pulach (inny kandydat z rankingu selektora).
   Karta ROTATE w `MorningCockpit.tsx` ma notatkę wprost tłumaczącą, że
   automatyczne [Zatwierdź] tu nie działa, i zostaje na krokach 1/2 ręcznych z
   Partii 4 ([1. Zamknij starą →] / [2. Otwórz nową →], już działających).
   Żeby to domknąć, kolejna sesja potrzebuje: budowy dwóch `Pool` (stara+nowa,
   jak `resolveBotPool` w useCockpitActions.ts) i rozszerzenia
   rebalanceBuilder.ts (poza zakresem tej sesji UI — bot/**/utils poza
   edycją poza już-gotowym rebalanceBuilder.ts) o wariant cross-pool.

Typecheck (`npx tsc --noEmit -p tsconfig.json`, maszyna użytkownika): 0
błędów w `src/`. Pozostałe błędy (bot/observer.ts, node_modules/ox)
preexisting, poza zakresem tej sesji.

### 2026-08-10 — Sesja UI (Sonnet) — Partia 4: karty propozycji wg kind + 2 fixy z odbioru P3
Wykonana cała Partia 4 z TASKS-UI.md (4 pozycje, wszystkie odhaczone). Przed
implementacją przeczytane na świeżo (nie na podstawie streszczenia w tym pliku):
`bot/observer.ts` (rozszerzony `interface Proposal`: `kind?`, `poolId`, `symbol?`,
`chain?`, `apy7d?`, `heldApy7d?`, `breakEvenDays?`, `note?`;
`suggestedRange`/`costUsd`/`paybackDays` opcjonalne) i `bot/selector.ts`
(`SelectorProposal`, polityka OPEN/ROTATE — tylko do czytania, zero zmian).

1. **Karty propozycji wg kind** (`MorningCockpit.tsx`): REBALANCE →
   [Modyfikuj →], OPEN → [Otwórz →] (ukryty gdy `poolId === ''`, wtedy tylko
   żółty `note`), ROTATE → dwie linie + [1. Zamknij starą →] / [2. Otwórz nową →].
   [Odrzuć] wszędzie (bez zmian, już działało). [Zatwierdź] świadomie NIE
   zbudowany (zostawione dla nowo dopisanej Partii 4b — rebalanceBuilder.ts).
2. **Architektura reużycia modali** (główna decyzja tej sesji): modal "Rebalans
   ręczny / nowa pozycja" (`RebalanceModal`, teraz eksportowany z
   `CockpitPositionActions.tsx`) i `openPositionAtRange`/`readBalanceAndAllowance`/
   `approveToken` (`useCockpitActions.ts`) przetypowane z `PortfolioPosition` na
   nowy, węższy interfejs `RebalanceTarget` (tokenId, chainId, poolLabel, fee,
   token0/1, pool, suggestion). `PortfolioPosition` spełnia go strukturalnie —
   karta pozycji działa bez zmian. Drugi producent: `resolveBotPool(poolId)`
   (nowe w useCockpitActions.ts) — wylicza `RebalanceTarget` dla puli bota, w
   której user NIE ma jeszcze pozycji (OPEN / ROTATE krok 2), 2 odczyty RPC
   on-demand (slot0+liquidity), tokeny z `OBSERVED_PAIRS` (te same pary
   USDC/WETH, zero nowych metadanych tokenów). Nowy plik
   `src/config/botPools.ts` — metadane 3 pul bota (id/chainId/address/feeBps/
   symbole) zduplikowane z `bot/config.ts` (bot/** poza zakresem edycji, ta sama
   konwencja co GAS_USD).
3. **Fix z odbioru P3 — fallback sugestii bota**: `RebalanceModal` mapuje
   `position.poolAddress` → botPoolId (`findBotPoolByAddress`) i gdy frontendowy
   `p.suggestion == null`, a `bot.state.pools[]` ma świeżą sugestię dla tej
   samej puli, opcja "Doradca" pokazuje się jako "Doradca (z bota)" zamiast
   wyszarzonej. Wymagało przekazania `bot: UseBotApi` w dół (MorningCockpit →
   CockpitPositionActions → RebalanceModal) — zero nowych zapytań, dane już w
   `bot.state`.
4. **Fix kosmetyczny**: `text-align: left` dla `.telemetry-json-pre` w
   styles.css (przyczyna: globalne `.app { text-align: center }` kaskadowało).
5. **Typy**: `BotProposal` w `useBotApi.ts` rozszerzony o pola selektora
   (zob. wyżej) + `suggestedRange.tickLower?/tickUpper?`.

Typecheck (`npx tsc --noEmit -p tsconfig.json`, maszyna użytkownika): 0 błędów
w `src/`. Pozostałe błędy (bot/observer.ts — niezgodność typów viem w
`getBlock`, node_modules/ox) preexisting, poza zakresem tej sesji.

Nietknięte (świadomie, zgodnie z ZAKRES TWARDY): `bot/**` tylko czytane
(observer.ts, selector.ts, config.ts), `src/utils/{v3math,liquidityManagement,
advisor}.ts` nietknięte. Partia 4b (dopisana przez inną sesję w międzyczasie —
wpięcie `src/utils/rebalanceBuilder.ts` pod przycisk [Zatwierdź]) zostawiona
nietknięta na następną sesję UI — builder istnieje, ale wpięcie modalu sekwencji
tx to osobne zadanie.

### 2026-08-10 — Sesja UI (Sonnet) — poprawka po Partii 3: progi/dostępność akcji kokpitu
Użytkownik zgłosił na żywo (po Partii 3): "przyciski zbierz fees sa nieaktywne
pomimo nieodebrane fee" i "rebalans reczny tez". Dwie osobne przyczyny, obie
naprawione w `src/hooks/useCockpitActions.ts` / `CockpitPositionActions.tsx`:

1. **Zbierz fees** — próg "opłacalności" był dosłowną interpretacją
   UX-COCKPIT.md §1.A.3 ("50× gaz"): ~$400 na mainnecie, ~$4 na Base. W
   praktyce prawie żadna pozycja hobbystyczna nie osiąga takiej kwoty
   nieodebranych fee, więc przycisk wyglądał na trwale zepsuty. Zapytałem
   użytkownika (AskUserQuestion) o preferowane rozwiązanie — wybrał obniżenie
   progu. Zmieniono `COLLECT_THRESHOLD_MULT` z 50 na 8 (mainnet ~$64, Base
   ~$0.64) — nadal chroni przed płaceniem więcej za gas niż warte jest fee,
   ale nie blokuje realistycznych kwot.
2. **Rebalans ręczny** — przycisk wymagał `p.suggestion` (statystyk doradcy:
   min. 10 swapów w ostatnich 24h + pula musi pasować do wpisu w
   `config/pools.ts` OBSERVED_PAIRS), które nierzadko są niedostępne (niski
   wolumen, chwilowy błąd RPC — patrz sekcja 3 tego pliku o limitach
   publicznych RPC). Zamiast blokować przycisk brakiem danych, modal ma teraz
   dwa tryby: "Doradca" (gdy `p.suggestion` dostępne) i "Własny zakres" (ceny
   USD wpisywane ręcznie, domyślnie ±15% wokół aktualnej ceny puli — ten sam
   wzorzec co tryb "Własny" w AddLiquidity.tsx). `openSuggestedPosition`
   przemianowane na `openPositionAtRange(tickLower, tickUpper, ...)` — bierze
   ticki jawnie, nie czyta ich z `p.suggestion` wewnątrz. Przycisk w
   `CockpitPositionActions.tsx` wymaga teraz tylko `p.pool` (nie `p.suggestion`).

Typecheck (na maszynie użytkownika): 0 błędów w `src/`, jak poprzednio.
TASKS-UI.md Partia 3 zaktualizowana o tę poprawkę (pod istniejącym punktem
"Akcje na kartach pozycji", nie jako osobna partia — to fix, nie nowa funkcja).

**Do zweryfikowania na żywo:** czy próg 8× gaz jest teraz sensowny w
praktyce, czy dalej za wysoki/za niski — łatwo zmienić jedną stałą
(`COLLECT_THRESHOLD_MULT`) jeśli user da znać.

### 2026-08-10 — Sesja UI (Sonnet) — Partia 3: akcje na kartach kokpitu + telemetria bota ✅
Wykonane wszystkie zadania z TASKS-UI.md Partia 3 (rozszerzona o UX-COCKPIT.md,
przeczytane przed pracą). Zakres: wyłącznie UI, nie dotknięto v3math/
liquidityManagement/advisor/backtest/bot (poza odczytem, jak wcześniej).
Uwaga proceduralna: użytkownik napisał "doszła nowa partia 3 UI" zanim treść
faktycznie pojawiła się na dysku — dwukrotnie sprawdziłem TASKS-UI.md/repo root
i była niezmieniona od mojej Partii 2; po jego odpowiedzi ("wszystko zapisane
w repo") ponowny listing pokazał świeże `TASKS-UI.md` i nowy `UX-COCKPIT.md` —
najwyraźniej user właśnie kończył zapisywać plik w tym samym momencie. Nauka
dla innych sesji: jeśli TASKS-UI.md wygląda na nieaktualne względem tego, co
user mówi, warto zapytać / sprawdzić ponownie za chwilę, zamiast zakładać błąd.

- **`src/hooks/usePortfolio.ts`** (rozszerzony, nie przepisany): `PortfolioPosition`
  ma teraz surowe dane potrzebne do akcji zapisu — ticki, `liquidity` (bigint
  jako string), `token0`/`token1` (adres+symbol+decimals), `positionManager`,
  `poolAddress`, i SDK `Pool` zbudowany RAZ w tej samej pętli z danych już
  odczytanych (dodatkowo doczytywana tylko `liquidity()` całej puli — reszta
  była już fetchowana). Zero dodatkowych zapytań RPC względem Partii 2. Doliczona
  też `suggestion` (RangeSuggestion z advisor.ts) liczona zawsze gdy są staty,
  niezależnie od tego czy pozycja ma wycenę USD (rebalans ręczny ma sens nawet
  dla par bez stable/ETH nogi, po prostu bez oceny opłacalności).
- **`src/hooks/useCockpitActions.ts`** (nowy): logika zapisu dla trzech akcji
  na kartach kokpitu. WAŻNE odkrycie przy budowie "Zamknij": `decreaseLiquidity`
  na NonfungiblePositionManager NIE przekazuje środków — tylko przenosi je do
  `tokensOwed` na pozycji; trzeba osobno wywołać `collect()`. Istniejący kod w
  MyPositions.tsx/RemoveLiquidity.tsx tego nie robił (tylko decreaseLiquidity) —
  to preexisting luka, nie ruszona (poza moim zakresem), ale w NOWEJ akcji
  "Zamknij" na kokpicie zaimplementowałem to poprawnie: 2 kroki sekwencyjne
  (decrease → collect, oba przez Rabby), z komunikatem "krok 1/2"/"krok 2/2".
  Przy błędzie między krokami środki są bezpieczne (siedzą jako tokensOwed,
  odzyskiwalne przez "Zbierz fees"). Cross-chain: każda akcja najpierw przełącza
  sieć portfela (jeśli trzeba) i bierze ŚWIEŻY walletClient przez
  `getWalletClient` z `wagmi/actions` zamiast polegać na wartości z hooka
  `useWalletClient()` z chwili kliknięcia (ta odświeża się dopiero przy
  kolejnym renderze — ryzyko podpisania w złej sieci tuż po switchu).
  Próg opłacalności zbierania fee (50× gaz) duplikuje wewnętrzną stałą GAS_USD
  z advisor.ts (ten plik poza zakresem edycji tej sesji — nie da się wyeksportować).
- **`src/components/CockpitPositionActions.tsx`** (nowy): przyciski [💰 Zbierz
  fees] (szary+tooltip poniżej progu) / [⏹ Zamknij] (modal: suwak+presety
  25/50/100%, slippage, podgląd kwot z min-po-slippage — `previewClose()`
  liczy dokładnie tę samą formułę co `prepareRemoveLiquidityTransaction`) /
  [🔄 Rebalans ręczny] (modal: otwiera NOWĄ pozycję w sugerowanym zakresie
  doradcy, reużywa `createPosition`/`prepareAddLiquidityTransaction` jak
  AddLiquidity.tsx, z approve flow). Pełny builder "zamknij+swap+mint w jednej
  sekwencji" (UX-COCKPIT.md §3) zostaje dla sesji analitycznej — do tego czasu
  to dwie osobne operacje, zgodnie z §5 kolejności wdrożenia.
- **`src/components/BotTelemetry.tsx`** (nowy): zwijana sekcja (domyślnie
  zwinięta) w kokpicie z tabelą `state.pools` (pula/ETH-USD/tick/zmienność/
  fee-yield/sugerowany zakres $/wiek danych) i listą `state.positions`. Nic
  nowego nie fetchuje — czyta ten sam `bot.state` co reszta kokpitu (jeden
  `useBotApi()` w App.tsx, bez drugiego timera). Orientacja sugerowanego
  zakresu (USD vs surowa cena) wyliczona heurystyką odległości logarytmicznej
  od `ethUsd` — `state.pools` (bot/observer.ts) nie zapisuje sym0/ethIsToken0,
  więc nie da się tego odwrócić wprost jak w kokpicie (tam mam symbole tokenów).
  Poprawka z 401: przycisk "Surowy JSON" pokazuje `bot.state` już w pamięci
  w modalu, zamiast linku do `{base}/api/state` (link nie mógłby nieść nagłówka
  Authorization → 401 na chronionym API).
- **`src/hooks/useBotApi.ts`**: dodane typy `BotPoolLive`/`BotWatchedPosition`
  (powielone z `PoolLive`/`WatchedPosition` w bot/observer.ts — ten plik poza
  zakresem edycji tej sesji, ale wolno z niego czytać i kopiować kształt).
- **`src/App.tsx`**: PoolBrowser + TransactionHistory zgrupowane pod
  `<ExpandableSection title="Zarządzaj (zaawansowane)" defaultExpanded={false}>`
  — nic skasowane, tylko zwinięte pod jednym nagłówkiem (kokpit jest teraz górą).
- **`src/styles.css`**: dopisana sekcja "UI session (Partia 3)" —
  `.cockpit-position-card*`, `.telemetry-*`.
- Typecheck (`npx tsc --noEmit -p tsconfig.json`, na maszynie użytkownika):
  0 błędów w `src/`. Pozostałe błędy (bot/observer.ts, node_modules/ox)
  preexisting, poza zakresem — jak w Partii 1/2.

**Następny krok:** przetestować akcje kokpitu na żywo (zwłaszcza "Zamknij" —
2 podpisy w Rabby, i cross-chain switch przy pozycji na innym łańcuchu niż
aktualnie podłączony portfel) — najlepiej na małej pozycji testowej najpierw.
Builder pełnego rebalansu (zamknij+swap+mint w jednej sekwencji, UX-COCKPIT.md
§3) czeka na sesję analityczną (Fable) — patrz UX-COCKPIT.md §5 pkt 2.

### 2026-08-10 — Sesja UI (Sonnet) — Partia 2: poranny kokpit + połączenie z botem ✅
Wykonane wszystkie 4 zadania z TASKS-UI.md Partia 2 (plus dokończone/zweryfikowane
zaległości z Partii 1 — patrz TASKS-UI.md, były już zaimplementowane w kodzie,
tylko nieodhaczone). Zakres: wyłącznie UI, nie dotknięto v3math/liquidityManagement/
advisor/backtest/bot (poza odczytem).
- **`src/hooks/usePortfolio.ts`** (nowy): jedyne miejsce, które liczy portfel
  PRZEKROJOWO przez wszystkie pule/sieci (mainnet+Base) — nie tylko aktualnie
  otwartą pulę jak `MyPositions.tsx`. Idzie po NFT position managerze każdego
  chaina, dociąga `getPool`+`slot0` per unikalna pula (cache w obrębie
  odświeżenia), liczy kwoty przez `getAmountsForLiquidity` (v3math), fees przez
  static `collect()` (ta sama sztuczka co MyPositions), doradcę przez
  `assessPosition`/`computeStats` z advisor.ts — **tylko dla pul, w których
  użytkownik faktycznie ma pozycję** (nie dla całego `OBSERVED_PAIRS` — inaczej
  mnożyłoby to obciążenie RPC bez potrzeby na tym ekranie). Wycena USD wymaga
  nogi stable lub ETH+stable-referencja — pary czysto skorelowane (cbBTC/WETH)
  są liczone w statystykach in/out-range, ale POMIJANE w sumie USD (brak
  wiarygodnego feeda); `hasUnknownValue` sygnalizuje to w UI gwiazdką.
- **`src/hooks/useBotApi.ts`** (nowy): `localStorage.homos_api_base` (domyślnie
  `http://localhost:8787`) + `homos_api_token` (Bearer), poll `GET /api/state`
  co 60s, `POST /api/proposals/:id/dismiss`. Status online/stale(>5min)/offline.
  Zweryfikowany wobec REALNEGO kształtu `bot/observer.ts`/`bot/server.ts`
  (nie szkicu z TASKS-UI.md) — `Proposal.status` to `'open'`/`'dismissed'`, NIE
  `'pending'` jak sugerował opis zadania; `state.json` i tak już filtruje do
  samych `'open'` po stronie bota, UI filtruje defensywnie tak samo.
- **`src/components/MorningCockpit.tsx`** (nowy): nagłówek finansowy (wartość
  łączna/in-range/fees), panel ustawień API (ikonka ⚙), lista propozycji bota
  z przyciskiem "Odrzuć", skrót doradcy per pozycja. Zwijalny, klasy `morning-*`.
  Wpięty w `App.tsx` nad `PoolBrowser`. Renderuje się tylko gdy wallet connected.
- **`src/components/BotStatusDot.tsx`** (nowy, reużywalny): kropka zielona/żółta/
  szara. Użyta W DWÓCH miejscach (nagłówek App.tsx obok CompactWalletInfo + w
  nagłówku kokpitu) na WSPÓLNYM stanie `useBotApi()` wywołanym raz w `App.tsx`
  — jeden poll 60s, nie dwa niezależne.
- **PWA**: `public/manifest.json` + ikony `icon-192.png`/`icon-512.png`
  (wygenerowane w kontenerze Pillow — proste "$" na niebieskim tle #1a6ae0, bez
  zewnętrznych zależności w repo), `<link rel="manifest">` + `apple-touch-icon` +
  `apple-mobile-web-app-*` w `index.html`. Bez service workera (zgodnie z zadaniem).
- **Weryfikacja Partii 1** (TASKS-UI.md miało 3 pozycje odznaczone jako niezrobione):
  sprawdzone bezpośrednio w kodzie na dysku — `feePercentages()` w MyPositions.tsx,
  media query <480px w styles.css i tytuł/favicon/Faucet-hide w index.html/
  FaucetSection.tsx JUŻ tam były (z wcześniejszej sesji w tej samej rozmowie) —
  tylko odhaczone, bez ponownej pracy.
- **Typecheck**: `npx tsc --noEmit -p tsconfig.json` na maszynie użytkownika —
  0 nowych błędów; jedyne błędy w wyjściu to preexisting `bot/observer.ts`
  (niezgodność typów viem, plik poza zakresem tej sesji) i `node_modules/ox/**`.
  Po drodze złapane i naprawione dwa błędy TS specyficzne dla tej sesji: literalny
  `/* ... */` wewnątrz komentarza blokowego w MorningCockpit.tsx (przedwcześnie
  zamykał komentarz) i typ `fee` (uint24 → `number`, nie `bigint`, w argumentach
  wywołania `getPool`, mimo że `positions()` dekoduje te same pola jako `bigint`
  — niespójność w typach viem między ABI zapisu a odczytu, obejście: osobne
  zmienne `feeRaw`/`fee`).
- **Nie zrobione / poza zakresem tej sesji**: `git pull` nie mógł się wykonać
  (piaskownica device_bash bez dostępu do sieci — 403 z proxy) — lokalne pliki
  i tak są aktualne, bo poprzednie sesje piszą bezpośrednio na dysk, nie przez
  git; jeśli inna sesja terminalowa (Claude Code) wypchnęła coś na GitHub czego
  nie ma lokalnie, wymaga to `git pull` uruchomionego ręcznie przez właściciela.
- **Następny krok**: obejrzeć kokpit na żywo (localhost:3000) z realnym portfelem;
  jeśli `homos-server` już działa na Windows (patrz sesja Windows w dzienniku
  niżej), wpisać `http://192.168.1.8:8787` + token w ⚙ i sprawdzić panel
  propozycji end-to-end.

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

### 2026-08-10 — Sesja: usługi Windows (NSSM) zamiast pm2-windows-startup
Wykonano TASKS-WINDOWS-ADDENDUM.md (boty niewidoczne, bez okien konsoli):
- Usunięto autostart `pm2-windows-startup` (`pm2-startup uninstall`, wpis w `HKCU\...\Run` zniknął).
- Zainstalowano NSSM (`winget install nssm`) — na tę sesję pod pełną ścieżką w `AppData\Local\Microsoft\WinGet\Packages\...\win64\nssm.exe` (PATH doda się po restarcie terminala).
- Dodano `import 'dotenv/config'` na górze `bot/observer.ts` i `bot/server.ts` — wcześniej **nie ładowały `.env`** przy starcie przez `tsx` (działało tylko przypadkiem, jeśli zmienne były już w środowisku).
- Zarejestrowano dwie usługi Windows: `homos-bot` (bot/observer.ts) i `homos-server` (bot/server.ts), `AppDirectory=C:\Projects\homos`, logi w `.bot\pm2\*.log`, `AppRestartDelay=5000`.
- Uruchomione i zweryfikowane: `Get-Service` → Running, procesy w Session 0 (Services, brak okien), `curl localhost:8787/health` → 200, `.bot/state.json` świeży.
- Stare procesy pm2 (`homos-bot`/`homos-server`, id 0/1) zatrzymane (`pm2 stop`), nie usunięte — do ewentualnego `pm2 delete` później, na razie nieużywane.
- Zarejestrowano `schtasks /Create /TN HomosPipeline` — codziennie 07:30 jako SYSTEM, `npm run pipeline >> data\pipeline-task.log`.
- **NIE wykonano (wymaga decyzji/potwierdzenia użytkownika):** test pełnego restartu komputera (krok 6 addendum) — usługi *powinny* wstać same (Automatic startup type domyślny w NSSM), ale nie zweryfikowano fizycznym rebootem.
- **Firewall DOKOŃCZONY** (był zawieszony z poprzedniej sesji, brak uprawnień admina): `New-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)" -Direction Inbound -Protocol TCP -LocalPort 8787 -RemoteAddress 192.168.1.0/24,10.8.0.0/24 -Action Allow` — wykonane i zweryfikowane (`Get-NetFirewallRule` → RemoteAddress poprawny). TASKS-WINDOWS.md krok 7 zaktualizowany. Pozostaje do zrobienia przez użytkownika: test `http://192.168.1.8:8787/health` z Maca/iPhone'a przez LAN/VPN.
- **TEST Z MACA ZALICZONY** (Fable, przez Chrome użytkownika): http://192.168.1.8:8787/health → {"fresh":true} — serwer osiągalny po LAN, stan bota świeży. Pozostał wyłącznie test fizycznego rebootu (przy okazji najbliższego restartu komputera). EKOSYSTEM KOMPLETNY: bot-usługi niewidoczne 24/7 + API po LAN/VPN + pipeline codziennie 7:30 + aplikacja na Macu + repo GitHub jako oś koordynacji.

### 2026-08-10 — Sesja planistyczna
- Przeanalizowano legacy (`src/utils/liquidityManagement.ts`, `uniswap.ts`, README, docs) — zdiagnozowano przyczyny rozjazdu wyliczeń z Uniswap (float zamiast bigint, złe wzory, hardkody, brak testów).
- Ustalono parametry projektu z właścicielem (kapitał, sieć TBD, hedging etapami, pół-auto).
- Utworzono PLAN.md (analiza braków, funkcja celu, architektura, fazy 0–4, podział na agentów) i niniejszy CONTEXT.md.
- **Następny krok:** Faza 0 — setup monorepo, `core/math` na bigint, test referencyjny na realnej pozycji mainnet.

### 2026-08-10 — Sesja 3i: domknięcie danych + weryfikacja IL w warstwie selekcji
- **mainnet-usdc-weth-030 (pula użytkownika): pobrane tylko 11 dni** (resztka stanu po porannej awarii providerów — state.json wskazał zły punkt startu). Nawet w 11 dniach werdykt jasny: pula MARTWA (3608 swapów, fees $5–76 przy $10k, wszystko przegrywa z HODL) — potwierdza rotację z tej puli. TODO (terminal/Claude Code): usunąć data/cache/mainnet-usdc-weth-030.{ndjson,state.json} i przefetchować pulę w całości (`npx tsx scripts/fetch-swaps.ts mainnet-usdc-weth-030`).
- **Werdykt IL z DefiLlamy: pole il7d BEZUŻYTECZNE dla pul uniswap-v3** (null/0 w ~100% wierszy; wariant [minus IL] identyczny z bazowym przy il-cov ~50% liczonym z zer). Wniosek metodologiczny: rozstrzygnięcie majors-vs-egzotyki wymaga NASZEGO tick-level na egzotycznych pulach — TODO: dodać 1-2 top egzotyki (np. DORY-USDC Arbitrum) do POOLS w fetch-swaps i porównać pełny PnL z majors. selection.ts rozszerzony o mechanizm [minus IL] (zostaje — zadziała, gdyby źródło danych IL się pojawiło).
- **Kolejka badawcza (pipeline, bez AI):** (1) refetch mainnet-030 pełne 90d, (2) egzotyki tick-level, (3) dłuższa historia Base 0.3% (180–365d) pod walk-forward i badanie timingu rebalansu (kruchość 1–3 decyzji — główny front), (4) codzienny pipeline 7:30 już zaplanowany na Windows.
- Sesja UI (Sonnet) partia 2 ODEBRANA: poranny kokpit + panel propozycji + PWA + kropka zdrowia — zweryfikowane na żywo (Mainnet, token, zielony status, "Brak aktywnych propozycji" = poprawne przy 2/2 in-range).

### 2026-08-10 — Sesja 3j: WALK-FORWARD — kluczowa lekcja pokory (odpowiedź na "czy dane już wystarczą")
- **`backtest/walkforward.ts`** (npx tsx backtest/walkforward.ts <pool> [okno] [krok]): rozkład vsHODL na przesuwanych oknach; kryterium algorytmu: %wygranych ≥65 i najgorsze okno > −3.
- **WYNIK (base-030, okna 30d co 15d, 4 okna): WSZYSTKIE strategie wygrywają z HODL tylko w 25% okien** (śr. −2 do −3.7 vsHODL/okno). Pełny przebieg 90d (+3.77) był efektem konkretnego układu okresów, NIE stabilnej przewagi miesięcznej.
- Interpretacja (ważne niuanse): (a) krótkie okna systematycznie karzą LP — koszt wejścia (~0.15–0.3%) i niezamortyzowany IL nie mają czasu się zwrócić w 30 dni; (b) mimo to rozrzut −10…+3 na oknach pokazuje, że przewaga jest reżimowo-zależna i statystycznie nieugruntowana przy 90 dniach.
- **WERDYKT dla pytania użytkownika**: selekcja pul — dane WYSTARCZAJĄ (4.4y, wiele reżimów); odbiór fees — czysty rachunek progowy (zbieraj gdy fees > ~50× gaz; Base ~$2–5, mainnet ~$50+; zysk z compoundingu ~1–2 p.p./rok); **algorytm zakresu/rebalansu — dane NIE wystarczają** (jeden reżim, 25% win-rate na oknach) → wymagane 365d + okna 45–60d + badanie timingu.
- Fetch config: dodano `base-weth-usdc-030-365d` (świeży id = czysty stan, 365 dni; ~30–60 min pobierania na Base). TODO terminal: `npx tsx scripts/fetch-swaps.ts base-weth-usdc-030-365d` (albo pełny pipeline).
- Plan analizy po 365d: walk-forward okna 45/60d + podział na reżimy (trend up/down/flat po EWMA) + warianty triggera rebalansu (histereza vs bufor cenowy vs odwrót momentum) + amortyzacja kosztu wejścia. Dopiero po tym: zamrożenie parametrów algorytmu w ALGORITHM.md i porównywanie z sygnałami bota z okresu OBSERWUJ.

### 2026-08-10 — Sesja Fable: ODBIÓR Partii 3 UI (weryfikacja na żywo w Chrome)
- Kokpit zweryfikowany end-to-end na localhost:3000 (Mainnet, 2 pozycje):
  karty pozycji z akcjami [Zbierz fees]/[Zamknij]/[Rebalans ręczny], sekcja
  "Zarządzaj (zaawansowane)" (zwinięta, w środku Uniswap V3 Pools + Transaction
  History), Telemetria bota (3 pule, dane <1 min, vol/fee-yield/sugerowane
  zakresy), modal "Surowy JSON" (dane z useBotApi — fix 401 działa), zero
  błędów w konsoli.
- Modal [Zamknij #953465] policzony POPRAWNIE: 26.385 USDC + 0.032 WETH
  = $86.55 (zgadza się z wartością karty co do centa), min-po-slippage,
  fees w kroku collect, "2 podpisy w Rabby".
- [Zbierz fees] szare — POPRAWNE przy progu 8× gaz (mainnet ~$64; fees $0.61
  i $3.74 poniżej). Na Base próg ~$0.64 — tam przycisk będzie się aktywował.
- [Rebalans ręczny]: tryb "Doradca (brak danych)" wyszarzony — frontendowy
  doradca nie miał statystyk (RPC/getLogs na mainnecie), fallback "Własny
  zakres" działa (prefill ±15%). SUGESTIA do Partii 4: gdy frontendowy doradca
  nie ma danych, a bot ma świeżą `suggestion` dla tej puli w state.json —
  użyć zakresu bota jako prefillu trybu "Doradca (z bota)". Dane już są
  w useBotApi, zero nowych zapytań.
- Kosmetyka (niekrytyczne): tekst w modalu "Surowy JSON" renderuje się
  wyśrodkowany — dodać `text-align: left` do <pre> w BotTelemetry.
- Odnotowany postęp danych: mainnet-030 90d DONE (49210 swapów) → B6 gotowe
  do puszczenia; base-030-365d dalej się pobiera (wolne darmowe RPC).

### 2026-08-10 — Sesja Fable: WARSTWA SELEKCJI w bocie (propozycje OTWÓRZ/ROTUJ) + spec Partii 4
Decyzja użytkownika (AskUserQuestion): budujemy warstwę propozycji JUŻ TERAZ na
roboczych parametrach (każdą propozycję i tak zatwierdza człowiek w Rabby);
parametry podmienimy po zamrożeniu ALGORITHM.md (365d walk-forward).
- **`bot/selector.ts` (nowy)**: raz dziennie po 8:00 (gdy dane pipeline'u <26h)
  ranking pul z data/llama wg polityki z meta-backtestu (Top5, śr. 7d apyBase,
  persystencja 3d w strefie 2N, majors-only, TVL≥$3M, tylko uniswap-v3,
  chain mainnet/Base) → propozycje: OPEN (max 2/d, cooldown odrzuconych 7d;
  zakres z sugestii doradcy gdy pula w BOT_POOLS, inaczej note "dopisz do
  konfiguracji") i ROTATE (najsłabsza nasza pozycja → najlepszy kandydat, tylko
  gdy edge pokrywa koszt przejścia 0.3% w ≤10 dni; max 1/d). Stan streaka/dat:
  .bot/selector-state.json. Telegram+log jak przy REBALANCE.
- **`bot/observer.ts`**: schemat Proposal rozszerzony (kind REBALANCE/OPEN/ROTATE,
  symbol/chain/apy7d/heldApy7d/breakEvenDays/note; suggestedRange/costUsd/
  paybackDays teraz OPCJONALNE). Selektor wpięty: run po starcie + co godzinę
  (sam pilnuje "raz dziennie po 8:00"). Typecheck: czysto (poza preexisting
  viem-owym TS2719 na linii createPublicClient, znany).
- **TASKS-UI.md Partia 4** dopisana dla Sonneta: karty propozycji wg kind
  (OPEN/[Otwórz→], ROTATE/[1. Zamknij→][2. Otwórz→] interim, REBALANCE/[Modyfikuj→]),
  fallback sugestii bota w modalu rebalansu, text-align fix modalu JSON, typy
  BotProposal. Docelowy [Zatwierdź] z sekwencją tx czeka na rebalanceBuilder
  (moje następne zadanie, UX-COCKPIT §3).
- RESEARCH-QUEUE: nowa sekcja E (wdrożenia dla CC: commit+push, pull+restart
  homos-bot na Windows, obserwacja observer.log po 8:00).
- Tabela 5 pul (B6, CC) ODEBRANA — interpretacja: bramka F1 zaliczona na 5/5 pul;
  reżim spadkowy potwierdza plan portfela (Base aktywnie k2h24, mainnet pasywnie
  szeroko/wcale, cbBTC jedyny dodatni absolutnie — sleeve pasywny ±15%). Zapis
  zgodny z PAIRS.md — bez zmian decyzji.

### 2026-08-10 — Sesja Fable: rebalanceBuilder (UX-COCKPIT §3) GOTOWY
- **`src/utils/rebalanceBuilder.ts` (nowy, czysty moduł bez Reacta/RPC)**:
  planRebalance → sekwencja: (1) multicall decrease(100%)+collect(MAX) na NFT
  managerze — jedna tx zamiast dwóch z Partii 3; (2) swap wyrównujący
  exactInputSingle na SwapRouter02 W TEJ SAMEJ PULI (mainnet
  0x68b3…Fc45 [poprawny checksum, zweryfikowany viem getAddress], Base
  0x2626…e481), pomijany gdy odchylenie proporcji <2% wartości; (3) mint —
  w planie ESTYMATA do podglądu, wykonawczo buildMintStep z faktycznych sald
  (uczciwe wobec poślizgu swapa). Approvals jako lista z calldata (UI filtruje
  po allowance). Postęp sekwencji w localStorage (saveProgress/loadProgress) —
  "dokończ krok 2/3" po odświeżeniu. Failure-safety: po kroku 1 środki w cash.
- Test numeryczny (tsx, mock Pool USDC/WETH @1880): pozycja 50/50 → swap
  POMINIĘTY, withdraw z fees $103.43 ✓; pozycja 100% USDC → swap 0to1 ~połowy
  (23.0069 USDC → min 0.012140 WETH = spot minus 0.3% fee minus 0.5% slippage) ✓.
  Typecheck czysty (jedyny błąd repo to preexisting viem TS2719 w bot/observer).
- TASKS-UI.md: dopisana Partia 4b (wpięcie buildera pod [Zatwierdź] po P4);
  Sonnet robi P4 RÓWNOLEGLE — bez konfliktu (builder w src/utils, poza jego
  zakresem zapisu; koordynacja przez appendy do plików md).
- Do RESEARCH-QUEUE E: commit obu porcji kodu (selector+observer, builder) — CC.

### 2026-08-10 — Sesja Fable: weryfikacja przed jutrem + selector v1.1 (zimny start)
- Odbiór P4/4b Sonneta w dziennikach ✓ (typecheck 0 w src/). ROTATE cross-pool
  słusznie zostawione jako TODO — planRebalance zakłada jedną pulę; wariant
  cross-pool = moje zadanie (razem z orientacją cen nie-USD par, patrz kolejka).
- **BUG złapany przed jutrem: zimny start persystencji** — selektor wymagał 3 dni
  streaka liczonego od dziś, więc pierwsze propozycje wyszłyby dopiero 13.08.
  Fix v1.1: przy braku selector-state.json streaki zasiewane trzema przebiegami
  historycznymi rankingu (te same pliki historii, okna przesunięte o 3/2/1 dni).
- **DRY-RUN na realnych danych** (kontener, prawdziwe data/llama + realne pozycje
  użytkownika): eligible top5 = WETH-CBBTC@Base 35.1%, WETH-USDC@Base 25.8%,
  USDC-WETH@ETH 19.7%, WETH-USDT@ETH 14.3%, USDC-WETH@ETH 12.7%. Propozycje:
  2× OPEN (cbBTC z notą "spoza konfiguracji", base-030 z zakresem doradcy)
  + ROTATE #953427 ($2 dust, mainnet 4.7% → cbBTC 35.1%, zwrot kosztu ~3.6d).
  W 100% zgodne z PAIRS.md i tabelą 5 pul — selektor mówi to, co nasza analiza.
- Wdrożenie na Windows (pull + del selector-state + restart) → kolejka sekcja E.
- Nieskomitowane prace UI Sonneta (13 plików) → kolejka (nie blokuje jutra).

### 2026-08-10 — Sesja Fable: B5 DOMKNIĘTE — werdykt egzotyki (WTAO-WETH tick-level)
Dane od CC (90.3d, 10 750 swapów — pula niskoaktywna), backtest odpalony w moim
kontenerze na zsynchronizowanym cache. Liczby w RESEARCH-QUEUE B5. Interpretacja:
- Reklamowane 60–80% fee-APR egzotyków NIE przeżywa zderzenia z tick-level:
  realny fee-yield pasywnej pozycji ~5–20%/r, a wynik puli zdominowany betą
  tokena (HODL +74.9% APR — WTAO akurat rosło; równie dobrze mogło −70%).
- Wąskie zakresy na trendującym egzotyku = maszynka do realizowania IL
  (±5%: fees $1,316 ale −33.8 p.p. vs HODL przy $248 gazu).
- DECYZJA (rekomendacja): sleeve egzotyczny **0%** — zostajemy przy PAIRS.md
  (rdzeń Base 0.3% aktywnie + cbBTC/WETH pasywnie ±15% + mainnet pasywnie).
  Ekspozycja na egzotyki to zakład o token, nie strategia LP — poza mandatem.
- Filtr majors-only w selektorze potwierdzony trzecim niezależnym testem
  (meta-backtest selekcji, tabela 5 pul, teraz tick-level egzotyka).

### 2026-08-10 — Sesja Fable: protokół kooperacji agentów (HANDOFF.md)
Pytanie użytkownika o "rozmawiające agenty": sprawdzono empirycznie (ListAgents)
— sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej
sesji (osobne aplikacje). Decyzja: zostajemy przy plikach repo jako szynie
komunikacji (dziś: 4 sesje równolegle, zero kolizji), dodając HANDOFF.md jako
lekką skrzynkę per agent ("zrobione, odbierz") — redukuje rolę Rafała jako
routera. Sesje czytają swoją sekcję NA STARCIE i usuwają odebrane wpisy.
Do promptów startowych sesji dopisać jedną linijkę: "przeczytaj swoją sekcję
w HANDOFF.md". Moje pobudki (send_later) sprawdzają HANDOFF + git log same.

### 2026-08-10 — Sesja Fable: zdalny wykonawca przez git (dostęp z iPhone'a)
Problem: Rafał często ma tylko iPhone'a (ta sesja chmurowa) — nie może nic
uruchomić w CC na Macu/Windows. Rozwiązanie: `scripts/agent-runner-git.ts` —
trzecia usługa NSSM na Windows, poll brancha `agent-queue` co 3 min, wykonuje
zadania z .agent-queue/pending/ (TYLKO whitelist, lustro agent-runner.ts
+ nowy wpis "scan"), wyniki commituje do .agent-queue/done/. Pętla:
iPhone → Fable (chmura) → commit zadania → Windows wykonuje → wynik gitem →
Fable raportuje. Main czysty (osobny branch). BRAKUJĄCY ELEMENT po stronie
chmury: fine-grained PAT GitHub (tylko repo HOMOS, contents RW) — Rafał
utworzy i wklei w sesji chmurowej, wtedy mogę klonować/commitować z kontenera.
Wdrożenie: HANDOFF @CC (branch+package.json) i @Windows (usługa NSSM).

### 2026-08-11 — Sesja Fable: cbBTC/WETH w bocie (orientacja cen per pula) + start kolejki
- **bot/config.ts**: BotPool rozszerzony o t0/t1 (adresy tokenów), quote
  ('USD'|'WETH') i usdRefPoolId; DOPISANA pula `base-cbbtc-weth-005`
  (0x7AeA2E8A…6dabD1, quote WETH, referencja base-weth-usdc-030).
- **bot/observer.ts**: (1) refreshPrices liczy pule USD najpierw, dla quote:'WETH'
  ethUsd = USD za token bazowy (cena w WETH × kurs referencyjny) — pole ethUsd
  znaczy teraz "USD za token bazowy puli"; (2) dopasowanie pozycji NFT po
  ADRESACH tokenów (t0/t1) z fallbackiem chain+fee — koniec ryzyka pomyłki
  przy 2 parach na tym samym tierze; (3) wspólny helper tickToUsd (propozycje
  doradcy i selektora dają poprawne USD też dla par WETH-owych).
- **src/config/botPools.ts**: wpis cbBTC (lustro konfiguracji dla UI) —
  karta OPEN "WETH-CBBTC" dostanie działający [Otwórz →] po restarcie bota.
- Typecheck czysty (poza preexisting TS2719). WYMAGA: restart homos-bot na
  Windows po pull. UWAGA dla Sonneta (nie-blokujące): nagłówek kolumny
  telemetrii "ETH/USD" → "cena USD" (dla cbBTC pokaże ~$115k za cbBTC).
- Kolejka: pierwsze zadanie `scan` czeka w .agent-queue/pending/ (commit+push
  uruchomi test pętli, gdy usługa homos-runner wstanie na koncie użytkownika).

### 2026-08-11 — Sesja Fable-DESKTOP: bootstrap sukcesji wykonany (z odchyleniami od planu)
Nowa sesja analityczna wstała jako **Cowork DESKTOP na Macu** (folder HOMOS
zamontowany), NIE jako sesja chmurowa z repo w źródłach. Konsekwencje:
- **Git push/pull z tej sesji NIEMOŻLIWY** — sandbox bez poświadczeń GitHub
  (fetch: "could not read Username"). Decyzja Rafała (AskUserQuestion):
  push zostaje przy CC-Mac; Fable pisze pliki na dysk Maca bezpośrednio.
- **Test pętli kolejki przygotowany, nie domknięty**: plik
  `.agent-queue/pending/fable-20260811-testmath.json` (test:math) na dysku,
  commit+push zlecone CC-Mac przez HANDOFF. Pętla była już potwierdzona
  rano (scan2 wykonany przez runnera 08:41, wynik wrócił commitem).
- **Pobudki odtworzone jako zadania harmonogramu Cowork** (nie send_later):
  „homos-poranny-brief" 07:50 codziennie + „homos-checklista-1330"
  jednorazowa 11.08 13:30 (A2/walk-forward/scan). UWAGA: działają tylko przy
  otwartej aplikacji Claude na Macu — jeśli Rafał potrzebuje niezawodności
  24/7/iPhone, i tak trzeba sesji chmurowej.
- **Postęp A2 sprawdzony (09:10)**: base-030-365d nextBlock 39 634 570 z
  zakresu 34 023 593→49 791 593 ≈ **36%**, ndjson 59 MB, żywy. Przy tym
  tempie ETA późne popołudnie/wieczór — walk-forward 45/60d dopiero po tym
  (albo po przejęciu przez HyperSync, test u CC-Mac w kolejce).
- **Scan2 odebrany CZĘŚCIOWO**: ogon ucięty — brak stable-stable i większości
  eth-lst; wyłuskane ustalenia (TBTC-WBTC 0.01% v/tvl 10.52 jako kandydat F)
  w RESEARCH-QUEUE F. Pełny skan: CC-Mac `npm run scan` (nie da się z sandboksa
  Fable — proxy blokuje yields.llama.fi; sprawdzone empirycznie, 403).
- Nauka dla przyszłych sesji: sandbox desktop-Cowork ma proxy z allowlistą
  (RPC/DefiLlama/GitHub poza nią) — analizy na lokalnych danych działają
  (tsx zainstalowany w /tmp obchodzi darwin-owy esbuild z node_modules),
  sieć praktycznie nie.

### 2026-08-11 — Sesja Fable-desktop: BEZPIECZNIK TRENDU — iteracja 1 (sweep na base-030-365d, okna 45/15)
Implementacja `volAdaptiveTrend` w strategies.ts: detektor = EMA log-ceny
względnej (HL 7d), sygnał DOWN przy gap < −5% (histereza: gaśnie przy −2.5%);
opcje: bramka vol (fast>1.4×slow-EMA-10d), drugi próg bezwarunkowy t2 (grind),
powrót dopiero nad EMA; tryby obrony: widen ×2 / exit-do-cash-50/50 (uczciwie:
½ gazu na stronę + swap wyrównujący) / block. Wyniki (vsHODL na oknach; pełne
liczby w walkforward-*-45d.json po runach CC):
- **widen ×2: BEZ EFEKTU** (down −3.23 vs baseline −2.76) — w chwili rebalansu
  IL już zrealizowany, szerzej = mniej fees. ODRZUCONY.
- **block: SZKODZI** (down −6.68, najgorsze −16.6) — trzymanie pozycji poza
  zakresem = worek spadającego tokena. ODRZUCONY.
- **exit: MECHANIZM DZIAŁA na ogon** — down: śr. −2.76→+0.08, najgorsze
  −12.33→−2.25, %wygr 20→50. Ale detektor odpala też we flat: +4.03→+0.24.
- **bramka vol (vg1.4): naprawia flat w 100%** (najgorsze okno +0.69!), ale
  ślepa na GRIND spadkowy (tegoroczne downy to osuwanie bez vol-spike'a) —
  down wraca do −4.22. Dwupoziomowy (vg1.4 + t2=10%): kompromis — down
  najgorsze −6.02, flat 75%, up 75%, śr. +0.32.
- **WNIOSEK STRUKTURALNY**: detektor przyczynowy nie odróżni okna down −13%
  od flat −9% (granica reżimu ±10% jest arbitralna, zjawisko ciągłe). Exit
  to wymiana kilku p.p. średniej we flat na obcięcie ogona z −12 do −2…−6 —
  poprawa risk-adjusted, nie darmowy lunch (LP = short gamma).
- 3 PROFILE-KANDYDACI do cross-walidacji (zestaw kanoniczny w walkforward.ts):
  (1) exit HL7/5% czysty [max ochrona ogona], (2) +vg1.4+t2=10% [balans],
  (3) +re>ema [ostrzejszy powrót]. Runy na 5 pulach (365d×2 okna + cbBTC-365d
  + base-005 + mainnet-005) delegowane do CC-Mac (HANDOFF ~11:00) — te same
  configi wszędzie, out-of-sample. Kierunek od Rafała: maksymalizacja zysku
  Z generalizacją; następnie rozszerzenie na nowe pary (F.A: 5 pul spiętych
  przez HyperSync, potem koszyki skanera).

### 2026-08-11 — Sesja Fable-desktop: FIX WYCENY PAR WETH-owych W SILNIKU + B2 (reżimy) — PRZEŁOMOWA SESJA ANALITYCZNA
**1. BUG KRYTYCZNY silnika backtestu naprawiony**: `unitPrices` zakładał parę
ETH/stable (nie-ETH-owa noga = $1). Dla par kwotowanych w WETH (cbBTC/WETH,
WTAO/WETH) WSZYSTKIE dotychczasowe wyniki absolutne (APR/fees$/maxDD) były
w bezsensownych jednostkach — dotyczy B5 (WTAO), B6 kolumny cbBTC, "teza
obalona" CC z 11.08 rano. Naprawa: `PoolSpec.quote:'USD'|'WETH'` +
`usdPerEth(block)` — cena USD-za-WETH po blokach z równoległego cache
USDC/WETH tej samej sieci (join po numerze bloku, step-function co 100 swapów).
Nowy WSPÓLNY loader `backtest/load.ts` (deduplikacja loadPool z run/
walkforward/sweep; mapa QUOTE_WETH_REF). Weryfikacja: validate 14/14,
regresja zero-diff na puli USD (mainnet-030 identyczne co do centa).
**2. cbBTC/WETH-365d POPRAWNIE (1.46M swapów, pełny rok, USD)**: HODL 50/50
−51.5% APR (maxDD 61.5%!) — para spadła z całym kryptem (obie nogi crypto =
pełna beta, ŻADNEJ poduszki stable). Ale LP vs HODL: **adapt k2h24 +11.42**
(fees $2126 ≈ 21%/r), sztywny±15 +6.26, pasywny±50 +5.95 — NAJWIĘKSZA alfa
LP-vs-HODL ze wszystkich naszych pul. Werdykt dwustronny: (a) teza par
skorelowanych DZIAŁA w wymiarze alfa (niska zmienność względna → fees >
IL względny); (b) "łagodny reżim/jedyny dodatni" z B6 był artefaktem —
absolutnie to podwójna beta krypto. Miejsce w portfelu zależy od decyzji
o ekspozycji/hedge (F4), nie od jakości LP. Uwaga: na tej parze k2 > k3
(węższa zmienność względna).
**3. WTAO-WETH POPRAWNIE**: HODL −70.5% APR w USD (stary "+74.9% reżim
wzrostowy" mierzył w jednostkach WTAO — było DOKŁADNIE ODWROTNIE, WTAO
runęło). vsHODL też się odwraca: k3h24 +7.31, k2h12 +5.64. Wniosek B5
zrewidowany: egzotyk NIE dlatego zły, że "LP przegrywa z HODL w trendzie",
tylko dlatego, że beta tokena (−70%/r) miażdży każdą alfę LP (+7 p.p.).
Filtr majors-only zostaje — uzasadnienie skorygowane.
**4. B2 — WALK-FORWARD Z REŻIMAMI (±10% zmiany ceny w oknie), 365d base-030:**
- 45d/15d: 22 okna (4 up / 10 down / 8 flat) · 60d/15d: 21 okien (3/12/6) —
  rok był głównie spadkowy.
- **HIPOTEZA Z B1 POTWIERDZONA W 100%: wszystkie najgorsze okna (−7…−12) to
  okna DOWN.** We FLAT wszystko wygrywa: adapt k3h24 100%wygr/najgorsze +2.66
  (45d) — przechodzi pełne kryterium WEWNĄTRZ reżimu; pasywny±50 100%wygr
  w obu oknach. W UP (60d): k3h24 i k2h24 100%wygr. W DOWN: 20-42%wygr,
  wszystkie średnie ujemne.
- **Bramka PLAN.md (wygrana w ≥2 reżimach): adapt k3h24 i pasywny±50
  PRZECHODZĄ (up+flat), przegrywają tylko down.**
- WNIOSEK STRATEGICZNY: strojenie k/h wyczerpane — brakujący element to
  BEZPIECZNIK TRENDU SPADKOWEGO (detekcja trendu → poszerz/wyjdź do stable/
  hedge). To jest nowy główny front (przed wariantami triggera z B3, które
  stają się drugorzędne). Format wyników: walkforward-<id>-<okno>d.json
  (fix nadpisywania), w json pełne windowMeta + byRegime.
Pliki zmienione (commit → CC): backtest/{engine,load,run,walkforward,sweep}.ts.

### 2026-08-11 — Sesja Fable-desktop: HyperSync PRZEJĄŁ dane (rok w 13 min) + INTERPRETACJA B1 (walk-forward 365d)
- **HyperSync zweryfikowany i wdrożony**: compare 1:1 z RPC zgodny, pełny rok
  base-030 pobrany w ~13 min (~17k bl/s vs 150 bl/s RPC; 1 880 449 swapów).
  A2 DONE; A3 (cbBTC 365d) w toku. ⚠️ Wpisy cbBTC w POOLS nadal mają odwróconą
  orientację (ethIsToken0: false, a token0=WETH) — przed backtestem A3 poprawić
  cfg w POOLS + obu meta.json (zadanie CC z sekcji F; ndjson surowy = OK).
- **B1 (walk-forward 365d, okna 45/15 i 60/15) — INTERPRETACJA**
  (liczby: RESEARCH-QUEUE B):
  1. **Bramka (%wygr ≥65 ∧ najgorsze >−3) NIE przechodzi dla ŻADNEJ strategii**
     — ale nie przez średnie (Adapt k3h24: +0.55/+1.02 śr., 55/62% wygr.),
     tylko przez ogon: najgorsze okno −7…−12 U KAŻDEJ, także pasywnych.
  2. **Hipoteza (do testu w B2): najgorsze okna = reżimy silnego trendu**, gdzie
     KAŻDY LP w zakresie strukturalnie przegrywa z HODL (LVR) — dokładnie to
     pokazał niezależnie WTAO (w trendzie nawet full-range ledwo remisuje).
     Jeśli B2 to potwierdzi, to poprawa NIE leży w strojeniu k/h (klasa
     "zawsze-w-LP" ma ten ogon wbudowany), tylko w komponencie strukturalnym:
     bezpiecznik trendowy (poszerz/wyjdź przy wykrytym trendzie) i/lub hedge
     (F4 — plan przewidywał to od początku).
  3. **Baza robocza: Adapt k=3 h=24** — jedyna z dodatnią śr.+med. w obu
     oknach. k=2 gorsze wszędzie na roku → kandydat na podmianę w
     ADVISOR_PARAMS (k 2→3), decyzja przy zamrażaniu ALGORITHM.md, nie hotfix.
  4. Sztywny ±15% ma najłagodniejszy ogon (−7.0/−7.8) przy słabym %wygr —
     wskazówka dla B3: szerzej = płytszy ogon; sprawdzić hybrydę "adaptacyjny
     k3 z podłogą szerokości ±15%".
  5. **Kolejność prac: B2 (tagowanie reżimów w walkforward.ts) PRZED B3** —
     B2 rozstrzyga, czy trigger w ogóle może naprawić ogon; potem B3 sweep
     wariantów triggera na 365d; bramka ponownie, per reżim (jak w PLAN.md).
- Scan-universe: pełna analiza koszyków spiętych → RESEARCH-QUEUE F
  (lista 5 pul do fetch 365d HyperSynciem; wniosek: yieldy "3%/tydz" na
  pegged NIE istnieją na v3 — top pegged żyje na aerodrome/curve).

### 2026-08-11 — Sesja Fable: fix cbBTC potwierdzony ($63k w telemetrii) + przygotowanie sukcesji
- Pętla kolejki POTWIERDZONA end-to-end: scan2 exit 0 (Windows wykonał zadanie
  zlecone plikiem z chmury), wynik wrócił commitem. Selektor dzienny zagrał
  (2 nowe OPEN: USDC-WETH 0.01% mainnet 20.0%, WETH-USDT 0.05% 15.1%).
- Orientacja cbBTC naprawiona i zweryfikowana na żywo (~$63k; wcześniej $0).
  Przeliczenie kolumny cbBTC w tabeli 5 pul → kolejka (dane surowe OK).
- Przygotowanie do przesiadki na nową sesję chmurową z repo w źródłach GitHub:
  bootstrap w HANDOFF @Fable (test pusha, pobudki, zasady); backlog ulepszeń
  runnera w RESEARCH-QUEUE G. Ta sesja ma jeszcze pobudkę ~13:30 (walk-forward
  po A2) — wyniki zapisze do plików, nie tylko do czatu.
