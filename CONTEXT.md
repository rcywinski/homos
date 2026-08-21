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
| 2026-08-11 | ALGORITHM.md v1 ZAMROŻONE: k=3 (ETH/stable; cbBTC k=2), h=24, payback≤7d, bezpiecznik trendu = czysty exit(HL7d,5%) | Walk-forward 365d + cross-walidacja 5 runów out-of-sample; decyzja Rafała (profil exit — najlepszy poza pulą strojenia, najmniej parametrów) |
| 2026-08-11 | REWIZJA v1.1 (§4): powrót po spadku = re>EMA (ETH/stable); cbBTC zostaje przy czystym exit | Pełne 365d base-005/mainnet-005 (po 22 okna) odwróciły ranking: re>EMA wygrywa 4/5 pul, na base-005 PIERWSZE pełne przejście bramki (68% wygr, worst −2.52); poranny wybór opierał się na 4-oknowych runach 90d |
| 2026-08-18 | Runner auto-pull na Windows WYCOFANY (usługa agent-runner-git + kolejka .agent-queue); zmiany kodu na Windows tylko ręcznym `git pull` CC-Win; jedyny automat gitowy = push porannego raportu 08:45 | Kolejka nieużywana od 11.08; reset --hard co 3 min = klasa ryzyka z incydentu 17.08; mniej ruchomych części |
| 2026-08-17 | REWIZJA v1.2 (§4): base-030 → bezpiecznik HEDGE-EXCESS (short perp nadwyżki ETH >50%, LP zostaje); wykonawczo po integracji venue perp, do tego czasu EXIT_TREND jako fallback | F4: jedyna konfiguracja domykająca bramkę na base-030 na obu oknach (73%/−2.88, 81%/−2.74); funding historycznie +2.9%/r dla shorta; hedge-full i hedge na mainnet/005 odrzucone |
| 2026-08-19 | `public/bundle.js` → untracked (`git rm --cached`); build artefakt żyje tylko na dysku | Tracked bundle (stary eb1c772, mimo .gitignore) blokował auto-push porannego raportu na Windows po każdym buildzie (3× pad 19.08) |
| 2026-08-19 | Po KAŻDEJ naprawie pipeline'u: ręczna weryfikacja TEGO SAMEGO DNIA (`npm run pipeline -- --only fetch` na Windows, iterować aż przejdzie) — automat 07:30 to rutyna, nie jedyny test | 3 dni z rzędu pipeline padał na czymś innym (ENOENT → shell:true → brak node_modules); debug raz na dobę przez poranny automat = za wolna pętla |
| 2026-08-19 | `@envio-dev/hypersync-client` PIN **1.0.0** repo-wide (dokładny, bez karetki) | Envio nie publikuje binarki win32 po 1.0.0 (^1.4.0 = wrapper bez natywki → twardy throw na Windows); darwin idzie do 1.4.0, stąd działało na Macu. API używane przez nas identyczne w 1.0.0 (diff CC-Win); zweryfikowane w npm registry przez Fable. Wspólny lockfile > nieużywane helpery 1.x |

## 3. Rzeczy do zweryfikowania na aktualnych danych (nie z pamięci AI)

- [ ] Płynność i wolumeny kandydujących pul WETH/USDC (Arbitrum/Base/mainnet, tiery 0.05/0.3, v3 vs v4)
- [ ] Aktualne endpointy subgraph / źródła danych historycznych swap-po-swapie
- [ ] Venue hedge: funding, opłaty, min size (Hyperliquid / GMX / CEX) — dopiero przy F4
- [ ] Integracja Rabby ↔ Claude jako kanał zatwierdzania transakcji (F3)
- [ ] Istniejące otwarte pozycje użytkownika w Uniswap (podpiąć w F2 jako pierwsze dane żywe)

## 4. Dziennik sesji

### 2026-08-20 — Sesja analityczna (Fable) — odbiór nocy: PIERWSZY CZYSTY AUTOMAT + fix OOM
Noc 20.08 = potwierdzenie wczorajszej roboty: pipeline 07:30 **19/19 kroków
hs-* exit 0, zero asysty** (pierwszy w pełni czysty przebieg automatu w
historii projektu), cache OK=[19] BRAKI=[], observer/state żywe (08:18–08:23).
Selector 06:02Z: WETH-CBBTC@Base 46.7%, WETH-USDC@Base 43.6%, WETH-USDT@ETH
33.1%, USDC-WETH@ETH 33.0%; pyłek #953427 poprawnie pominięty ($2.26<$25).
Jedyna usterka nocy: `backtest-run` exit 134 (OOM, Node ~4GB heap) na
`arbitrum-usdc-usdt-001` (685k swapów/365d) — nie-HyperSync, czysty brak
pamięci; selection i sweep przeszły. Decyzja Rafała: **heap 8GB teraz**.
Fix (Fable, na dysku): `scripts/pipeline.ts` — runStep z `extraEnv`,
backtest-run dostaje `NODE_OPTIONS=--max-old-space-size=8192` (doklejane,
nie nadpisuje). tsc czysty (poza preexisting observer:42). Commit u CC-Mac,
weryfikacja tego samego dnia (`--only backtest`) u CC-Win — wpisy w HANDOFF.

DOGRYWKA ~09:3x — pytania Rafała o noc, zbadane NA ŻYWYCH danych (API bota
przez Chrome, token z localStorage kokpitu; .bot/ na Macu stale z 17.08):
(1) Telegram 23:04 PL = paper EXIT_TREND base-cbbtc-weth-005 (19.08
21:04Z): ETH +16% nad EMA7d, BTC nie nadążył → cena WZGLĘDNA cbBTC/WETH
gap −5%+ pod EMA → czysty exit wg v1.1. Zamknięte $11 084 → cash $11 079
(+10.8% od startu 18.08, koszt $5.62). Gap rano wciąż −7.9% → re-entry
(half, > −2.5%) nieaktywny — cash czeka ZGODNIE z algorytmem.
(2) HODL > bot na 5/5 (−305…−682 na $10k): ETH +18.7% od otwarcia
(~1897→2253) — LP short gamma, 3 pule ETH/stable poza zakresem W GÓRĘ od
9–11h (100% w USDC), rebalans zablokowany histerezą h=24 → najwcześniej
dziś wieczorem, jeśli payback≤7d przejdzie. Nominalnie WSZYSTKIE pozycje
na plusie. To oczekiwane zachowanie na reżimie trendu, nie bug — bramka
wymaga bicia HODL na ≥2 reżimach łącznie, nie w każdym oknie.
(3) Do agendy analizy ~26.08 dopisane (RESEARCH-QUEUE nietknięty, lista tu):
a) asymetria histerezy / reakcja na trend UP (np. krótsze h przy wyjściu
górą albo bezpiecznik UP), b) parking cash w stables na yield podczas
exit (teraz cash leży bezczynnie), c) seria sweep-base030. ZASADA
podtrzymana: zero strojenia po 2 dniach paper tradingu, zmiany tylko
przez walkforward. Raportu morning-2026-08-20.md nie zweryfikowano
(GitHub 404 w profilu Chrome — repo prywatne/brak logowania; dane wzięte
prosto z API).

~noc — ZAMKNIĘCIE DNIA 20.08: wieczorna paczka wdrożona na Windows W
CAŁOŚCI (CC-Win: hotfix hooks na 8787 ✓ — crash z produkcji zszedł;
homos-bot z GMX Readerem ✓, state.hedge=null zgodnie z prawdą on-chain;
rebuild czysty). Po drodze hotfix krytyczny: useEffect z P11 pod wczesnym
returnem w MorningCockpit → "Rendered more hooks" przy podłączeniu bota;
LEKCJA (druga dziś klasy "u autora działa"): hooki ZAWSZE nad każdym
wczesnym returnem. Bilans dnia: pierwszy w historii pipeline zielony
end-to-end (8GB heap), eksperyment hUp policzony+cross-walidacja (werdykt
48h czeka na 26.08), tbtc-wbtc domknięty (pegged: NIE), ROTATE cross-pool
+ hedge GMX zbudowane i hedge przetestowany bojowo ($15 E2E), realne
pozycje i hedge śledzone przez bota z wykresami w UI, konto Kraken
założone (on-ramp ~0,6–0,8%), agenda DECYZJE-2026-08-26.md gotowa.
Jutro 07:30/08:45: automat z 20 pulami (w tym nowa mainnet-030-365d).

~późny wieczór — HEDGE WIDOCZNY W SYSTEMIE (uwaga Rafała po teście: short
istniał tylko na GMX i w localStorage jednej przeglądarki — bot ślepy,
zero wykresów/raportu/telefonu/alertu o sierocie). Zrobione (Fable, tsc
czysty): observer czyta pozycje konta z GMX Readera co cykl (ABI Position.
Props wg MAIN — 10 pól numbers z pendingImpactAmount; sanity-check skal
łapie ew. zmianę ABI) → `state.hedge` (size/entry/PnL/equity) + próbki
positions-history pod 'gmx-eth-short' (benchmark hodlUsd=collateral,
czyli "cash bez shorta") + Telegram na open/close + ostrzeżenie ~1/dobę
gdy short wisi bez sygnału DOWN. Adresy reader/dataStore dopisane do
GMX_ARBITRUM w hedgeBuilder. UI = TASKS-UI PARTIA 11 (karta hedge z
state.hedge, [Zamknij short] z danych on-chain, localStorage tylko
fallback). Wymaga restartu homos-bot u CC-Win po commicie.

~wieczór — TEST E2E HEDGE GMX ZALICZONY (Rafał, realne $15 na Arbitrum).
Pełna pętla przez naszą apkę: [Testowy short ~$15] → symulacja → podpis
Rabby → keeper wykonał (short ETH/USD 1×, size $15.00, collateral 14.99
USDC, entry $2274.43) → [Zamknij short →] → executeOrder zwrócił +14.96
USDC i +0.0006 ETH (nadpłata keepera), pozycja zniknęła na GMX; przy
okazji claim $0.06 z 18.08 odebrany. Koszt testu ~$0.40. Wnioski: (1)
builder (adresy/ABI/jednostki/acceptable) ZWERYFIKOWANY BOJOWO — bezpiecznik
hedge-excess base-030 wykonawczo GOTOWY jednym podpisem (fallback
EXIT_TREND przestaje być jedyną opcją); (2) BUG WYKRYTY I NAPRAWIONY w
useHedgeExecution: Rabby zwrócił hash, którego publicnode nie przyjął w
eth_getTransactionReceipt → hook rzucał PO wysłaniu i nie zapisywał stanu
shorta; fix: walidacja formatu hasha + receipt-wait jako best-effort
(nigdy nie failuje przepływu po podpisie). LEKCJA repo-wide: po
sendTransaction tx JEST wysłana — dalsze kroki degradować łagodnie.
Przycisk testowy USUNIĘTY po zaliczeniu.

~wieczór — DOMKNIĘCIE hUp + AGENDA 26.08. CC-Win: 5/5 przebiegów + pełna
cross-walidacja 6/6 (okna 45/20 i 60/30). WERDYKT: hUp=48h (profil
ETH/stable k=3+trend) lepszy/równy v1.1 na 9/9 przebiegów z efektem,
najgorsze okno poprawione W KAŻDYM (do −4.37→−2.52); mainnet-030 30/15
z hUp48 jedyny w eksperymencie zalicza pełną bramkę (70%/−2.52);
hUp 6/12h odrzucone (szum/szkoda); cbBTC k=2 bez zmian. DECYZJA RAFAŁA:
obserwacje ZAPISANE, algorytm v1.2 NIE ruszany — decyzja 26.08. Powstał
`DECYZJE-2026-08-26.md`: 8 punktów agendy (kapitał, v1.3/hUp48, cbBTC
k2/k3, wykluczenie mainnet-001, parking cash, pyłki, seria sweep,
obserwacja PROPONUJ) + jakie dane zbierają się do tego czasu. Sesje
przed 26.08: dopisywać dane do agendy, NIE podejmować decyzji z listy.

~1x:xx (późne popołudnie) — REDESIGN KART POZYCJI (pomysł Rafała) + P8/P9
odebrane od Sonneta. Decyzje Rafała (AskUserQuestion): equity/HODL realnych
pozycji śledzi BOT od teraz (nie rekonstrukcja w UI); fees realne na razie
tylko "nieodebrane" (indeksowanie Collect później). Pytanie Rafała "czemu
nie użyć HODL z paper dla #953465/#953427 (ta sama pula)": NIE wprost —
HODL to kwoty zamrożone w chwili otwarcia, paper kotwiczył $10k 50/50
18.08 @ ~1898, realne pozycje mają inne kwoty/moment; wspólna jest seria
cen, mechanizm ten sam. Zrobione (Fable, tsc czysty): observer — kotwice
`.bot/positions-hodl.json` (pierwsze zauważenie pozycji; dla starych
pozycji = od wdrożenia, nie od otwarcia) + próbki `.bot/
positions-history.ndjson` co 5 min (kształt jak paper-history + tokenId);
server — GET /api/positions-history. UI = TASKS-UI PARTIA 10 (karty jak
paper przez WSPÓLNE komponenty, hamburger ⋮ zamiast przycisków, rozdział
fees: nieodebrane na realnych + feesUsd/feesSinceRebalance na paper,
dopisek "HODL od <data kotwicy>").

~1x:xx (popołudnie) — SPRINT 4/5/6 (decyzja Rafała: "róbmy teraz"):
(1) TBTC-WBTC DOMKNIĘTE: QUOTE_REF_EXT w backtest/load.ts (USD-za-WBTC
z wbtc-usdc-030, jawny assetIsToken0), pegged.ts policzony przez Fable
w kontenerze: HODL −44.7% APR (rok spadkowy BTC), najlepsza strategia
+2.0–2.3 p.p. vsHODL — "3%/tydz" na v3 pegged ostatecznie NIE istnieje;
rekomendacja F.C (NIE dla sleeve pegged) stoi z kompletem danych.
(2) ROTATE CROSS-POOL: `planRotate()` w rebalanceBuilder.ts (ta sama sieć;
ta sama para=zmiana tieru albo 1 wspólny token: zamknij→swap unikalny→
wspólny w starej puli→swap wyrównujący w nowej→mint; pary rozłączne/
cross-chain=throw z komunikatem). UI = TASKS-UI Partia 8.
(3) HEDGE GMX: `src/utils/hedgeBuilder.ts` (planHedgeOpen/Close, short 1×
ETH/USD Arbitrum, multicall sendWnt+sendTokens+createOrder; adresy
zweryfikowane 20.08: ExchangeRouter 0x1C3f…6A41 z contracts.json, rynek
0x70d9…6336 z api.gmxinfra, struct IBaseOrderUtils z main — z autoCancel/
dataList). UI = TASKS-UI Partia 9 (symulacja eth_call OBOWIĄZKOWA, pierwszy
test ~$15). tsc czysty po wszystkich trzech. NADTO: reboot Windows
potwierdzony przez Rafała (D odhaczone; zostało auto-power-on w BIOS
po awarii prądu — ręcznie Rafał).

~1x:xx — WYNIKI DNIA (odbiór od CC-Win): (1) HEAP FIX: cały pipeline
(fetch+backtest+sweep) pierwszy raz zielony end-to-end (backtest-run 52 min,
peak ~8GB RSS przy 24GB wolnych — zero presji). (2) EKSPERYMENT hUp, 4/5
pul (23 okna 30d/15d; mainnet-030-365d BRAK CACHE — luka po stronie Fable,
definicja dodana do fetch-swaps.ts, fetch+run u CC-Win): WYNIK ODWROTNY DO
INTUICJI — krótsza histereza górą (6/12h) nic nie daje albo szkodzi
(hUp12 najgorsze, niemonotoniczność 6>12<48 = szum), za to hUp=48h
poprawia v1.1 na WSZYSTKICH 3 pulach ETH/stable równocześnie w śr./
%wygr./najgorszym oknie: mainnet-005 −0.23→+0.09 / 52→57% / −5.38→−1.73;
base-030 +0.11→+0.50 / 52→61% / −6.10→−2.86; arb-005 +0.18→+0.54 /
52→57% / −3.59→−2.85. Mechanizm spójny: nie kupować szczytu zaraz po
pompie, poczekać na cofkę. cbBTC (k=2): hUp bez wpływu (78%/−1.66 bez
zmian). Bramka: worst >−3 hUp48 przechodzi na 3/3, %wygr. ≥65 wciąż NIE
(57–61). Zlecona cross-walidacja hUp48 na oknach 45/20 i 60/30 (3 pule,
procedura jak przy zamrażaniu v1) + 5. pula po fetchu. v1.2 ZAMROŻONY —
ewentualna zmiana h→h/hUp48 dopiero po walidacji, decyzją Rafała (agenda
~26.08 razem z serią paper tradingu).

~10:1x — EKSPERYMENT ASYMETRYCZNEJ HISTEREZY zlecony (decyzja Rafała po
analizie HODL>bot na pompie): `hysteresisUpSec` w volAdaptive i
volAdaptiveTrend (kierunek wyjścia w cenie względnej bazy: ethIsToken0 →
górą=t≥hi, inaczej t<lo), zestaw `WF_SET=hup` w walkforward.ts — referencje
zamrożone v1.1 (k=3, re>EMA) i profil cbBTC (k=2, czysty exit) vs hUp=6/12/48h
(hipoteza dwustronna: szybciej zbiera fees vs kupuje szczyt po pompie).
Smoke test na Macu (3 okna, base-030): działa; sygnał wstępny — k=2+krótkie
hUp w oknie up −5.6% (chase). Pełne 5×22 okna u CC-Win na świeżym cache
(z pompą 19–20.08). Werdykt u Fable/Rafała; v1.2 zamrożony do decyzji.
Uwaga warsztatowa: node_modules w repo jest darwin — w kontenerze Linux
tsx odpalać z zewnętrznej instalacji (/tmp), NIE robić npm install w repo.

~09:5x — WIDOCZNOŚĆ ZAKRESU NA WYKRESACH PAPER (pomysł Rafała): historia
paper nie zapisywała ceny ani granic zakresu, więc na sparkline'ach nie
widać KIEDY pozycja wypadła. Zrobione (Fable): `bot/paper.ts` — próbki
history dostają `price` + `lo`/`hi` (human; lo/hi tylko przy open); tsc
czysty. Zlecone: TASKS-UI.md PARTIA 7 (Sonnet) — cieniowanie okresów
poza-zakresem/cash na equity-vs-HODL (działa też na starej historii z pól
inRange/status), mini-wykres cena vs pasmo zakresu (segmenty per lo/hi),
znaczniki EXIT_TREND/REENTRY/REBALANCE. HODL celowo bez zakresów (50/50
zawsze — nie ma czego rysować). CC-Mac: commit paczki; CC-Win: restart
homos-bot + sanity nowych pól.

### 2026-08-19 — Sesja analityczna (Fable) — odbiór nocy: root cause pipeline'u, ranking dnia #2, decyzje
Pipeline 07:30 padł na wszystkich 19 krokach hs-*, ale NIE przez shell:true —
ten fix działa (kroki się odpalają, fetch-llama przeszedł, universe.json 1.2h).
Root cause (trafna diagnoza CC-Win): `@envio-dev/hypersync-client` w
package.json od 11.08 (d17a878), ale nigdy `npm install` na Windows — brak
pakietu to twardy throw PRZED fallbackiem RPC. Naprawione (`npm install`);
pierwszy w pełni czysty przebieg spodziewany 20.08 07:30. Selektor mimo to
zadziałał (nie zależy od swap-fetchu): ranking 19.08 zanotowany w
SELECTOR-LOG.md, rotacja pyłka #953427 poprawnie pominięta progiem $25
(fix z 18.08 potwierdzony na żywo 1. dnia). Paper trading dzień 1: $50 179
(+$179), vs HODL ~0 — bez wniosków, fees dopiero kapią.
Decyzje Rafała: (1) untrack `public/bundle.js` (tabela §2; zadanie CC-Mac,
CC-Win po pullu musi od razu build+restart — plik zniknie z dysku);
(2) kandydat selektora USDC-WETH 0.01% mainnet (21.9% 7d, 6 dni w topie) →
walidacja tick-level przez lejek (zadanie CC-Mac; prior sceptyczny jak przy
WETH-USDT 0.01% odrzuconym 17.08).
Anomalie wyłapane w raporcie, do wyjaśnienia: (a) `observer-tail.log` martwy
od 17.08 — sekcja selektora w morning-report.ts czyta zły plik (fix u CC-Mac);
(b) `trend-state.json` lastTs=12.08 08:08 UTC na WSZYSTKICH 5 pulach —
bezpiecznik trendu może nie aktualizować EMA od tygodnia (pytanie u CC-Win,
rozstrzygnięcie danymi z observer.log); (c) `.agent-queue/runner-status.json`
wciąż się aktualizuje mimo usunięcia runnera 18.08 — CC-Win bada, kto pisze.

KOREKTA ~11:4x (po ręcznej weryfikacji CC-Win — nowa zasada "nie czekamy na
automat" zadziałała pierwszego dnia): root cause NIE był "brak npm install".
Prawdziwa przyczyna: `@envio-dev/hypersync-client@^1.4.0` nie ma binarki
win32 (Envio publikuje ją tylko do 1.0.0; darwin do 1.4.0 — dlatego Mac
działał). Zweryfikowane niezależnie w npm registry przez Fable. Po lokalnym
`--no-save` 1.0.0 na Windows: pełny `--only fetch` **18/18 pul exit 0** —
pierwszy w pełni czysty przebieg fetchu od startu automatu. Decyzje Fable:
pin 1.0.0 repo-wide (tabela §2) + `sweep-base030` przepięty na cache
`-365d` (stary, osobny bug: krok wołał id żywej puli, której nic nie
fetchuje — ta sama pula on-chain co wariant badawczy). Zadania u CC-Mac.

DOMKNIĘCIE ~12:0x — zagadka trend-state.json rozwiązana KODEM (bez
czekania na CC-Win): `saveTrend()` był wołany tylko przy seedzie puli i
flipie sygnału; EMA liczyła się poprawnie w pamięci (bezpiecznik NIE był
ślepy na żywo), ale każdy restart homos-bot wczytywał z dysku kotwicę z
12.08 — przy ~4 restartach od 18.08 pierwsze cykle po starcie liczyły gap
na zdegradowanej EMA (np. realny spadek −8% od kotwicy ≈ gap −4% < próg
−5% → sygnał DOWN mógłby nie paść, gdy powinien). Fix (Fable, na dysku):
okresowy zapis z dławikiem 15 min w updateTrend. tsc czysty (poza
preexisting observer:42 viem/ox). Commit w paczce CC-Mac; wymaga
`nssm restart homos-bot` u CC-Win. CC-Win doszedł do tej samej diagnozy
niezależnie (~12:5x) z konkretem: restart 18.08 15:39 = jednorazowy
sztuczny skok EMA ~47% w stronę spotu (dt≈6.3d vs τ≈10.1d).

~13:1x — `runner-status.json` wyjaśniony przez CC-Win: to NIE zombie,
tylko martwy niescommitowany diff sprzed usunięcia runnera (ostatni zapis
18.08 08:40, tuż przed dekomisją; nssm/schtasks czyste). Domknięcie
decyzji z 18.08: `.agent-queue/` (9 plików), `scripts/agent-runner-git.ts`
i skrypt npm `runner:git` USUNIĘTE z repo (+ `.agent-queue/` w
.gitignore); historia w gicie. CC-Win przed pullem musi odrzucić lokalny
diff (`git checkout -- .agent-queue/runner-status.json`).

~14:0x — DOMKNIĘCIE DNIA. (1) WERDYKT kandydata #2: USDC-WETH 0.01%
mainnet **ODRZUCONA bramką** (walkforward 365d/22 okna, 135a155: najlepsza
strategia 55% wygr. vs próg ≥65, worst −18.0 vs próg >−3; warianty z
bezpiecznikiem 0% wygr.) — wzorzec identyczny jak WETH-USDT 0.01% z 17.08;
obserwacja w SELECTOR-LOG: 2/2 kandydatów mainnet tier 0.01% odpada mimo
top headline APY, po 3. odrzuceniu rozważyć wykluczenie mainnet-001 z
propozycji OPEN (decyzja Rafała). (2) E2E po paczce: wdrożenie CC-Win
czyste (hypersync 1.0.0 z binarką, sanity exit 0, build+2 restarty);
raport na sucho 13:07 PRZESZEDŁ — auto-push bez blokady bundle.js
(c85c9aa) i sekcja selektora z observer.log z pełną historią rankingów =
oba fixy potwierdzone na żywo TEGO SAMEGO dnia. Trend-state po restarcie:
świeży lastTs na 1/5 pul w snapshot 13:07 — oczekiwane (globalny throttle:
pierwszy zapis łapie pozostałe pule ze stanem sprzed ich 1. cyklu),
potwierdzenie 5/5 u CC-Win. Kosmetyka do naprawy przy okazji: sekcja
"pipeline.log (ostatni przebieg)" raportu pokazuje blok z 17.08 (zadanie
niskiego priorytetu u CC-Mac).

~15:0x — BIAŁA STRONA (zgłoszenie Rafała 18.08, wróciło 19.08) ROZWIĄZANA
(Fable, diagnoza na żywo przez Chrome z Maca): bundle z Windows rzucał na
starcie `TypeError: Cannot convert a BigInt value to a number` w
`Math.pow(2n,7n)` — babel przepisywał `2n ** 7n` z viem na Math.pow, bo
(a) exclude w webpack.config.js zakładał separator `/` a Windows ma `\` →
transpilowane było CAŁE node_modules (na Macu poprawnie pomijane — dlatego
buildy z Maca działały, z Windows nie), (b) preset-env w opcjach webpacka
był bez targets (=najstarsze przeglądarki; .babelrc z targetami jest w
.gitignore, więc na Windows go nie ma). Fix e63856c: `[\\/]` w exclude +
jawne targets es2020 (chrome 80/safari 14/ff 78) w preset-env. Build na
Macu czysty, zero `Math.pow(2n` w bundlu. LEKCJA: regexy ścieżek w
konfigach buildów zawsze `[\\/]`, nigdy samo `/`. Decyzje kapitałowe
(KAPITAL-REKOMENDACJA.md) ODŁOŻONE decyzją Rafała — zbieramy dane +
paper trading, analiza za tydzień (~26.08).

~15:5x — MOBILE DOMKNIĘTE: iPhone ma pełny dostęp (Rabby przez
WalletConnect + kokpit z danymi bota). Po drodze 3 fixy klasy "działa
tylko na serwerze": (1) webpack nie czytał .env → WALLET_CONNECT_PROJECT_ID
pusty → brak WalletConnect na iOS (1a99ddf: require('dotenv') w
webpack.config.js); (2) domyślny adres API = localhost → puste panele na
każdym urządzeniu poza serwerem (ba04a21: default = origin strony);
(3) normalizacja adresu przy zapisie — trailing slash = //api = 404
(54a7dee). Finalna przeszkoda na iPhone: źle przepisany token (human
error). CC-Win ma 1 zaległy niepilny rebuild (łapie ba04a21+54a7dee).

~14:2x — ZAMKNIĘCIE: checklista E2E CC-Win **5/5 zielona**. Trend-state
5/5 świeży lastTs dokładnie na granicy okna dławika (fix działa jak
projektowany); sweep-base030 pierwszy raz w historii przechodzi (1. tabela:
lider "Sztywny ±30%" +15.0 vsHODL — ODNOTOWANE bez akcji: jedna tabela
sweep to nie powód do otwierania zamrożonego ALGORITHM v1.2; sweep od
jutra zbiera się codziennie, wrócimy do tego z serią); raport pushuje bez
blokady; /health, /api/ranking 200, strona bez białego ekranu. Bilans dnia
19.08: root cause pipeline'u znaleziony i naprawiony NA PEWNO (binarka
win32), 2 realne bugi bezpieczników wykryte i naprawione (trend-state,
sweep), 1 kandydat selektora odrzucony danymi, cała ścieżka automatu
przetestowana żywcem tego samego dnia. Jutro 07:30/08:45 = formalność.

### 2026-08-18 — Sesja UI (Sonnet) — Partia 5: wizualizacja paper-tradingu ✅
Wykonana cała Partia 5 z TASKS-UI.md (zlecona przez Fable ~11:3x, kod
bot/paper.ts + /api/paper wpięte przez CC-Mac/CC-Win równolegle). Zakres:
wyłącznie src/**, bot/** nietknięty (nawet nie czytany poza kształtem
odpowiedzi z opisu zadania).

1. **`src/hooks/useBotApi.ts` rozszerzony**: nowy stan `paper`/`paperStatus`
   — `GET {base}/api/paper?hours=168`, poll co 5 min (`PAPER_POLL_MS`, OSOBNY
   od istniejącego 60s pollera `/api/state` — zero zmian w tamtym). Typy
   `PaperData`/`PaperStateShape`/`PaperPosition`/`PaperHistoryPoint`/
   `PaperEvent`/`PaperHedge` jeden do jednego z kształtem JSON wklejonym do
   zadania. `503` → `paperStatus: 'not-started'` (odróżnione od `'error'`,
   żeby panel pokazał właściwy, spokojny komunikat zamiast "błąd").
2. **`src/components/PaperTradingPanel.tsx`** (nowy): nagłówek łączny (suma
   equity, PnL $+% od startu, vs HODL $), karty per pula (status 🟢/💤/⏳,
   badge ⛔ przy `trendDown`, equity/PnL/**vs HODL** (wyróżnione)/fees/koszty/
   rebalanse, linia hedge gdy `position.hedge` niepusty), sparkline SVG
   equity-vs-HODL (inline polyline, bez bibliotek — wzorzec `PoolHistoryChart`
   z ObservationAnalysis.tsx), lista ostatnich 10 zdarzeń z ikoną wg `kind`,
   disclaimer. Decyzja projektowa: "teraz" equity/hodl per pula liczone z
   OSTATNIEGO punktu `history` tej puli (niesie `hodlUsd`, którego
   `state.positions[poolId]` nie ma), fallback na `position.capitalUsd` gdy
   historia jeszcze pusta (pula świeżo `pending`).
3. **Wpięcie**: `MorningCockpit.tsx` → `<ExpandableSection title="📊 Paper
   trading" defaultExpanded={true}>` nad `BotTelemetry` — jedyna sekcja w
   środku kokpitu domyślnie rozwinięta (zgodnie ze zleceniem: Rafał chce to
   widzieć codziennie, reszta telemetrii zostaje zwinięta jak dotychczas).
4. **Stany brzegowe**: 503 → "Paper trading wystartuje po najbliższym
   restarcie bota"; błąd sieci/serwera → notka wyciszona; pula z <2 punktami
   historii → karta bez sparkline'a (tekst zamiast wykresu, jak przy braku
   historii w ObservationAnalysis).
5. **CSS**: nowa sekcja `paper-*` w styles.css (spójna z `morning-*`/
   `telemetry-*`/`forecast-*`; reużyte `.forecast-negative` dla wartości
   ujemnych, nowa `.paper-positive` dla dodatnich).

Zero przycisków akcji (to symulacja), zero nowego pollera `/api/state`, zero
zmian w bot/** — zgodnie z zakresem zadania.

Typecheck (`npx tsc --noEmit -p tsconfig.json`, w kontenerze): 0 błędów w
`src/`. Pozostałe błędy (bot/observer.ts — niezgodność typów viem w
`getBlock`, node_modules/ox) preexisting, poza zakresem tej sesji.

**Do zweryfikowania na żywo:** panel wobec REALNEJ odpowiedzi `/api/paper`
(ta sesja pracowała wyłącznie z kształtem JSON opisanym w TASKS-UI.md —
serwer z endpointem wdraża równolegle CC-Win) — zwłaszcza czy `history[]`
faktycznie zawiera `hodlUsd` per punkt (kluczowe dla "vs HODL"), i czy
sortowanie `ts` jako string ISO parsuje się poprawnie (Sparkline/latestFor
używają `Date.parse`, defensywnie jak `tsSeconds()` w ObservationAnalysis.tsx
po buchu z 17.08 — ts tam też okazał się stringiem, nie liczbą).

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

### 2026-08-11 ~15:40 — Sesja Fable-desktop: F.B FINAŁ (interpretacja pegged mainnet) — teza "3%/tydz" OSTATECZNIE obalona na v3
Odbiór od CC-Mac (commity 627cc38/8636d63/602c644): pegged usdc-usdt +
wsteth-weth policzone w OBU modelach fee (maxL=konserwatywny / endL=górna
granica; prawda pomiędzy). Interpretacja (Fable, pełne JSON-y w backtest/results/):
1. **mainnet-usdc-usdt-001** (485k swapów, kontrola $33M): najlepsze warianty
   z histerezą — ±0.10% h6: **+1.4% (maxL) … +12.4% (endL)**; ±0.20% h24:
   +1.1% … +14.1%. Model konserwatywny ≈ zgodny z rankingiem (mean30d 1.0%) —
   duża pula rozcieńcza fees dokładnie tak, jak przewidywał skan. Wszystkie
   rebalanse natychmiastowe głęboko ujemne (gaz mainnet + chasing pegu:
   ±0.05% → −99%). Wniosek: kontrola potwierdza metodę i tezę.
2. **mainnet-wsteth-weth-001** (158k swapów, jedyna żywa LST na v3): metryka
   = vsHODL (USD zdominowane betą ETH: HODL −54%/r w tym oknie danych!).
   Najlepszy wariant ±0.20% h24: **−1.8% (maxL) … +10.9% (endL)** vsHODL.
   Konserwatywnie CAŁA drabinka ujemna vs HODL; wąskie natychmiastowe
   = zagłada (±0.05–0.10%: −100%, gaz $5–9k/rok, 630–1168 rebalansów).
   **Teza LST-sleeve na v3 mainnet: ODRZUCONA konserwatywnie** — a pozycja
   i tak niesie pełną betę ETH (to nie jest "stabilny" sleeve w USD).
3. **WERDYKT F.B (4 pule, oba modele)**: "3.1%/tydz jak u znajomego" nie
   istnieje na uniswap-v3 pegged przy $10–25k. Najczystszy wynik: Arbitrum
   USDC-USDT ±0.10% h24 **+1.5–2.2%/r netto** (modele zbieżne, gaz ~0).
   Mainnet: gaz zabija wszystko poza histerezą, a histereza daje 1–3%/r
   konserwatywnie. Rekomendacja do C: **świadome NIE dla sleeve'u pegged
   na v3** (ew. mała pozycja arb-usdc-usdt jako parking, decyzja Rafała).
4. Zostaje TBTC-WBTC (rekord v/tvl 10.5) — wymaga generalizacji QUOTE_REF
   na USD/BTC; referencja mainnet-wbtc-usdc-030 POBRANA (105k swapów).
   Zadanie Fable (kod), potem run pegged.
5. Status NOWYCH SIECI: fetch DOJECHAŁ (arbitrum-weth-usdc-005-365d 1.67GB
   ~15:23, optimism-weth-usdc-030-365d 75MB ~15:26); walkforwardy 45/15
   u CC-Mac w toku — ocena bramki (≥65% wygr ∧ worst >−3; benchmark
   base-005: 68%/−2.52) po dojechaniu JSON-ów.

### 2026-08-17 (~14:40) — F4-op: WYBÓR VENUE PERP DLA HEDGE (research, decyzja dwuetapowa)
Kandydaci zbadani pod nasz tryb (pół-auto, hedge $1–5k notional):
- **GMX v2 (Arbitrum)**: open/close 4–6 bps (oracle pricing, bez orderbooku),
  ale UWAGA: **borrowing fee** (ciągły koszt, rośnie z utylizacją puli —
  konfiguracje rzędu kilkunastu–65%/r przy 100% utylizacji; przy naszym duty
  cycle ~20–40% czasu w sygnale szacunkowo ~1–1.5% portfela/r w złym
  scenariuszu). PLUS operacyjny: TEN SAM wallet i flow Rabby co Uniswap,
  sieć już w stacku — zero nowego modelu powierniczego.
- **Hyperliquid**: taker 4.5 bps, zero gas, czysty funding (bez borrowing
  fee — taniej w utrzymaniu), agent wallet = łatwa pełna automatyzacja.
  MINUSY dla pół-auto: własny L1 (bridge USDC = kapitał wydzielony z
  portfela), zatwierdzanie przez Rabby NIE działa, klucz agenta na serwerze
  to nowy wektor ryzyka.
**DECYZJA (rekomendacja Fable): dwuetapowo — START na GMX v2** (pół-auto,
spójny z całym flow projektu; monitorować borrowing fee ETH na żywo — jeśli
w praktyce >15%/r w naszych oknach, rewizja), **Hyperliquid przy przejściu
na full-auto** (tań szy w utrzymaniu, wymaga decyzji o agent-key).
NASTĘPNE KROKI F4-op: (1) ręczna pozycja testowa Rafała na GMX ($100–200
short ETH, przejście pełnego flow + odczyt realnego borrowing fee);
(2) bot: propozycja kind HEDGE dla base-030 (rozmiar = nadwyżka ETH >50%,
link do GMX) zamiast czystego EXIT_TREND — implementacja po teście ręcznym;
(3) uproszczenia modelu backtestu do pamiętania: borrowing fee GMX NIE był
modelowany (model = taker 5 bps + funding Binance — bliższy Hyperliquid).

### 2026-08-17 (~20:00) — PIERWSZY WERDYKT LEJKA SELEKTORA: WETH-USDT 0.01% mainnet = NIE
Walidacja tick-level kandydata z dzisiejszego żywego rankingu (5.74M swapów,
365d, 22 okna): **ODRZUCONY** — wszystkie strategie z ujemną średnią vsHODL
(pasywny −0.81, k2 −0.78, k3 −1.46), worst −10…−12, zero konfiguracji
w pobliżu bramki. Zgodne z priorem (mainnet gaz + tier 0.01%). Headline
11% APR z rankingu ≠ osiągalny wynik LP — kolejne potwierdzenie, że lejek
(ranking → tick-level → bramka) jest konieczny. Do dziennika trafności:
propozycja OPEN z 17.08 oceniona jako poprawnie ODRZUCONA przez walidację.
BONUS: walidacja wykryła buga silnika — probe-swapy (sondy przez puste
ticki, ±13–20k ticków) wybijały fałszywy sygnał trendu i warianty exit
"traciły" −100%. Fix: filtr probe-swapów w loadPool (>1000 ticków od
rolling-mediany; na głębokich pulach no-op — zweryfikowane na mainnet-030:
0 odrzuconych). Baseline'y puli były policzone poprawnie — werdykt stoi.

### 2026-08-17 (~wieczór) — POWIADOMIENIA TELEGRAM AKTYWNE + backlog mobilny
Rafał założył bota Telegram, przetestował sendMessage (dochodzi na telefon),
wpisał TG_TOKEN/TG_CHAT do .env na Windows i zrestartował homos-bot —
**kanał push działa**: każda propozycja (REBALANCE/OPEN/ROTATE/EXIT_TREND/
HEDGE) leci teraz alertem na telefon. Do sekcji H dopisane pomysły:
zatwierdzanie z telefonu (deep-link z TG do karty PWA + WalletConnect →
Rabby mobile — 2 partie Sonnet), moduł shortów kierunkowych (własna bramka
przed budową), portfel sprzętowy (przez Rabby, zero zmian w kodzie),
automatyzacja hedge 3-stopniowa. Zlecona walidacja pierwszego kandydata
z żywego rankingu selektora (WETH-USDT 0.01% mainnet — CC-Mac, prior
sceptyczny). Otwarte na jutro: odczyt borrow/funding z testowego shorta
GMX + zamknięcie (Rafał), brief 07:50 (pierwszy pełny cykl po naprawie
pipeline), start dziennika trafności selektora.

### 2026-08-18 ~09:00 — Fable: PORANNA ANALIZA — diagnoza CC-Win + 2 bugi naprawione + start dziennika trafności
Odpowiedź CC-Win odebrana (HANDOFF, commit 29a7991), Telegram potwierdzony
na żywo (Rafał: 3 propozycje na telefonie 08:24). USTALENIA I DZIAŁANIA:
1. **Pipeline 07:30 NADAL pada — ale z innej przyczyny niż sądziliśmy.**
   Naprawa konta SYSTEM→elo (17.08) nie pomogła, bo root cause to
   `spawn('npx')` bez `shell:true` w `scripts/pipeline.ts:38` — na Windows
   spawn() nie uruchamia plików .cmd (npx=npx.cmd) → ENOENT niezależnie od
   konta. Diagnoza CC-Win zweryfikowana w kodzie: TRAFNA. **FIX (Fable, na
   dysku, czeka na commit CC-Mac):** `shell: process.platform==='win32'` w
   pipeline.ts — DOKŁADNIE ten wzorzec, który już działa w agent-runner-git.ts:79
   na tym samym serwerze. Ten sam guard dopisany do agent-runner.ts:93
   (stary mostek, spawn('npm') — ta sama klasa błędu). Lekcja do kolekcji
   "Node na Windows": spawn dowolnego .cmd/.bat wymaga shell:true — to już
   CZWARTA odsłona tej klasy (pm2 npx → tsx cli, NSSM SYSTEM→elo, schtask
   konto, teraz spawn bez shell).
2. **Selektor mimo to ZADZIAŁAŁ** (dane z ręcznego fetch:llama CC-Win,
   18h < 26h): ranking dnia = WETH-CBBTC@Base 25.2%, USDC-WETH@Ethereum
   21.5%, WETH-USDC@Base 20.0%, WETH-USDT@Ethereum 13.2/11.0. 3 propozycje
   (Telegram 08:24): OPEN WETH-CBBTC 0.05 Base, OPEN WETH-USDC 0.3 Base,
   ROTATE #953427→WETH-CBBTC "payback 4.8d".
3. **BUG EKONOMII ROTATE złapany 1. dnia pomiaru trafności**: propozycja
   rotacji pozycji-pyłka #953427 ($2.08, mainnet) z "paybackiem 4.8d" —
   breakEvenDays liczony był CZYSTO PROCENTOWO (SWITCH_COST_PCT/edge),
   bez wartości USD pozycji i bez stałego gazu; realny koszt (~$8 gaz
   mainnet) to 4× wartość pozycji. **FIX (Fable, bot/selector.ts, na
   dysku):** koszt przejścia w USD (0.3% proporcjonalnie + gaz per sieć
   8/0.1/0.2 jak w backtest/engine.ts, po połowie cyklu na zamknięcie
   i otwarcie) / dzienna przewaga w USD na TEJ pozycji + próg
   MIN_ROTATE_USD=$25 (pyłki pomijane z logiem). Dla #953427: payback
   ~10 000 dni → poprawnie odrzucane. Typecheck czysty (tylko preexisting
   observer.ts/getBlock).
4. **Dziennik trafności selektora WYSTARTOWAŁ**: nowy plik SELECTOR-LOG.md
   (wpisy 17.08 WETH-USDT odrzucona ✓ i 18.08 — 3 propozycje z oceną).
5. **Ocena propozycji dnia**: WETH-CBBTC 0.05 Base — pula w pełni
   zwalidowana (bramka PASS), propozycja merytorycznie OK, wykonanie =
   decyzja kapitałowa (wciąż OBSERWUJ). WETH-USDC 0.3 Base — zwalidowana
   warunkowo (bramka tylko z hedge-excess v1.2; hedge wykonawczo
   niezintegrowany → fallback EXIT_TREND). ROTATE — błędna (pkt 3).
6. **RYZYKO NA JUTRO** (za CC-Win): universe.json przekroczy 26h przed
   pipeline 07:30 19.08 — jeśli fix nie wejdzie na Windows do wieczora,
   selektor odmówi ("stęchłe dane"). Ścieżka: CC-Mac commit+push (wpis w
   HANDOFF) → CC-Win pull + restart homos-bot; fallback: ręczny fetch:llama
   CC-Win wieczorem.
OTWARTE dziś (Rafał): odczyt borrow/funding z testowego shorta GMX ($150,
otwarty 17.08 ~16:00) + zamknięcie — główna niewiadoma kosztowa hedge.

### 2026-08-18 ~11:3x — PAPER TRADING ZBUDOWANY (decyzja Rafała: "rozpiszmy i zbudujmy")
Nowy moduł `bot/paper.ts` — wirtualny portfel prowadzony przez ALGORITHM
v1.2 na żywych danych, $10k na każdą pulę BOT_POOLS (PAPER_CAPITAL_USD env).
Odpowiada na pytanie "jak algorytm zachowałby się na prawdziwym kapitale":
- Model UCZCIWIE udokumentowany w nagłówku pliku: otwarcie w zakresie
  doradcy (k per pula), fees = trailing fee-yield pasma × udział szerokości
  × Δt (TA SAMA formuła co payback doradcy — nie per-swap replay), rebalans
  = poza zakresem ≥24h + payback ≤7d (histereza z ALGORITHM), koszty jak
  w backteście (gas per chain + pół obrotu × fee+slippage), bezpiecznik
  per pula: exit→cash/reentry lub hedge-excess (wirtualny short, taker
  5 bps, funding +2.9%/r), benchmark HODL 50/50 zamrożony na wejściu,
  wycena respektuje quote:'WETH'.
- Integracja: paperTick() po każdym cyklu statystyk observera (15 min);
  stan .bot/paper-state.json, księga paper-events.ndjson, próbki equity
  paper-history.ndjson (gitignored — jak reszta .bot).
- Telegram: milestony 📊 PAPER (START/REBALANS/EXIT_TREND/REENTRY/HEDGE
  open+close) — informacyjne, zero Rabby (symulacja niczego nie podpisuje).
- Dzienny digest: morning-report.ts (08:45 Windows) dostał sekcję PAPER
  (tabela equity/PnL/vs HODL per pula + RAZEM) i wysyła skrót Telegramem.
- API: GET /api/paper?hours=N (server.ts) — stan+historia+księga dla UI.
- UI: PARTIA 5 w TASKS-UI.md dla Sonneta (PaperTradingPanel: karta per pula
  z equity/vs HODL/sparkline SVG, nagłówek łączny, lista zdarzeń, disclaimer).
Typecheck czysty (poza preexisting observer/getBlock). Wdrożenie: commit
CC-Mac → pull + restart homos-bot i homos-server na Windows (CC-Win).
Po restarcie paper wystartuje sam przy pierwszym cyklu statystyk.
INTERPRETACJA za ~tydzień: paper vs HODL na żywo = najmocniejszy argument
przy decyzji kapitałowej (sekcja C RESEARCH-QUEUE) i bramce PROPONUJ.
**URUCHOMIONY NA ŻYWO ~15:xx 18.08** — CC-Win pull+restart, Rafał potwierdza
"📊 PAPER: START" na Telegramie. Licznik bije; t0 pomiaru = 18.08 po południu.

### 2026-08-18 ~09:3x — F4-op: ODCZYT KOSZTÓW TESTOWEGO SHORTA GMX (po ~17h)
Zrzut z GMX (Rafał): margin $149.92, **borrow fee $0.00, negative funding
fee $0.00** po ~17h utrzymania; PnL −$0.39 (−0.25% = ruch ceny ETH, nie
koszt). ODCZYT: koszty CIĄGŁE utrzymania shorta na tym rynku/w tym oknie
≈ zero (przy $150 nawet 15%/r dawałoby ~$0.06/dzień — wyświetliłoby się;
zaokrąglenie w dół możliwe, ale rząd wielkości potwierdzony). Obawa o
borrowing fee GMX (jedyna niemodelowana pozycja kosztowa) na razie NIE
potwierdza się — próbka 17h, niska utylizacja; przy realnym hedge
monitorować dalej (UI GMX pokazuje bieżący "Borrow Fee/Day" per rynek —
odczytywać przy otwarciu, nie czekać dnia). Struktura kosztów przy tej
skali: dominują STAŁE keeper fees ($0.39 otwarcie + ~$0.39 zamknięcie =
~52 bps przy $150; przy docelowych $1.5–3k → 3–5 bps, pomijalne) — zgodnie
z notą z 17.08. WNIOSEK: GMX jako venue hedge POTWIERDZONY kosztowo na
poziomie testu; flow + koszty realne ≈ model (taker 4 bps, funding/borrow
~0 w oknie testu). Pozycję można zamknąć — cel testu osiągnięty.

### 2026-08-18 ~10:0x — F4-op: TEST GMX DOMKNIĘTY (short zamknięty, pełny bilans round-trip)
Rafał zamknął testowy short (100% market, received 149.35 USDC z marginu
149.92). PEŁNY BILANS CYKLU ($149.91 notional, ~18h):
- **Koszty ciągłe: borrow $0.00, funding +$0.06 DLA NAS** (short DOSTAŁ
  funding — kierunkowo zgodne z historią Binance +2.9%/r dla shorta;
  $0.06/18h na $150 ≈ +2.0%/r annualizowane ✓ model). Claim +$0.06 na GMX
  do odebrania przy okazji (drobiazg, nie gonić).
- **Koszty stałe (keeper/network): $0.39 otwarcie + $0.41 zamknięcie =
  $0.80/cykl** — przy $150 to ~53 bps, przy docelowych $1.5–3k → 3–5 bps.
- **Koszty zmienne: otwarcie fee 4 bps + impact 0; zamknięcie fee 6 bps
  + net price impact −12.8 bps** — razem ~23 bps/cykl vs model ~10–15
  (taker 5+slippage 5). ⚠️ Impact przy ZAMKNIĘCIU (−0.128%) jedyna pozycja
  wyraźnie ponad model — obserwować przy realnym sizingu $1.5–3k (GMX
  liczy impact od skew OI, nie od rozmiaru vs książka; może być i lepiej,
  i gorzej). PnL cenowy −$0.31 (ETH lekko w górę) — poza rachunkiem kosztów.
- **RAZEM koszty round-trip bez ceny: ~$1.08 (~72 bps @ $150) → przy
  $2k szacunkowo ~25–30 bps/cykl + funding zwykle NA PLUS.**
WERDYKT F4-op: **GMX v2 zatwierdzony operacyjnie jako venue hedge-excess
dla base-030** (flow Rabby ✓, koszty ≈ model ✓, borrow ≈ 0 ✓, funding
dodatni ✓). Do ALGORITHM przy następnej rewizji: (1) stała rezerwa USDC
+ gaz ETH na Arbitrum (lekcja z 17.08), (2) korekta modelu kosztów hedge:
+6 bps close fee i impact do obserwacji, keeper $0.80/cykl stały.
NASTĘPNY KROK F4: propozycje HEDGE bota (już emitowane dla base-030) mają
realną, przetestowaną ścieżkę wykonania — zostaje decyzja kapitałowa
(wejście LP w base-030) zanim hedge będzie miał co zabezpieczać.

### 2026-08-18 07:5x — Sesja Fable (poranny brief): brak śladów pipeline'u/selektora z dziś
Rutyna: git log bez zmian od `a67ff78` (17.08 18:16) — zero nowych commitów
runnera/CC; `.agent-queue/done/` bez nowych plików (ostatnie z 11.08).
`.bot/*` NA MACU ISTNIEJE (inaczej niż zakładała poprzednia notatka), ale to
STARY snapshot sprzed naprawy: ostatni wpis `observer-tail.log` 17.08 08:38,
`selector-state.json` `lastRunDate: 2026-08-17`, ostatnia linia `selector:`
z 06:09 to jeszcze komunikat o STĘCHŁYCH danych (157.9h) — sprzed przepięcia
pipeline'u na konto elo. **Brak jakiegokolwiek śladu pierwszego pełnego cyklu
07:30 na koncie elo (miał być dziś, 18.08) ani rankingu/propozycji z dziś** —
niemożliwe do stwierdzenia stąd, czy pipeline w ogóle odpalił, czy selektor
coś zaproponował. Dopisana prośba do @CC-Win (HANDOFF) o tail
`observer.log`/`observer-tail.log` (linie `selector:` + `ranking dnia`)
i `data\pipeline-task.log` z dzisiejszego przebiegu.
**Pomiar trafności selektora**: brak nowej propozycji do zalogowania —
dziennik (data / pula / APY z rankingu) ruszy dopiero gdy przyjdzie
potwierdzenie świeżego rankingu z 18.08 lub później.
**Brief dla Rafała**: system bez zmian od wczoraj wieczór (18:16) — żadnych
nowych commitów ani propozycji. Nie widzę stąd, czy dzisiejszy pipeline
07:30 (pierwszy od naprawy na koncie elo) w ogóle wystartował — poproszony
CC-Win o wklejenie logów z Windows, sam sprawdzę jak dojdą. Nic nie wymaga
Twojej decyzji teraz.

### 2026-08-17 (~18:20) — PROGNOZA ZYSKU v2 (per pogoda rynku) — WDROŻONA end-to-end
Cykl domknięty w jeden wieczór (Fable spec+kod → CC-Mac rerun+forecast →
Sonnet RegimeTable + fix NaN wykresów → CC-Win rebuild UI). Kluczowa decyzja
projektowa: v1 (jedna mediana APR) ODRZUCONA — mieszała zasługę algorytmu
z kierunkiem rynku spadkowej próbki ("typowo −$69/mies" przy algorytmie
bijącym HODL w 73% okien). v2 pokazuje per pula tabelę reżimową
[spada/stoi/rośnie] × [algorytm vs HODL] w $/mies od kwoty użytkownika.
Odczyt z danych (na $5k, mediany okien 45d): we FLAT algorytm +$12…+189/mies
vs HODL −35…+38 (główna przewaga); w DOWN równo lub odrobinę lepiej (hedge
base-030: −277 vs −277 — bez cudów, ale bez pogorszenia); w UP przeważnie
lepiej (005-ki), na base-030 hedge oddaje część wzrostu (+532 vs +607 —
koszt ubezpieczenia) — wszystko zgodne z konstrukcją strategii. LEKCJA
do powtarzania: liczby "dla laika" muszą rozdzielać betę rynku od alfy
algorytmu, inaczej kłamią w obie strony.

### 2026-08-17 (~16:00) — F4-op: PIERWSZY TESTOWY HEDGE OTWARTY NA GMX (flow zweryfikowany)
Rafał przeszedł pełny flow ręczny: bridge USDC ETH→Arbitrum (Across, ~1 min,
koszt ~$0.42) + bridge 0.003 WETH→ETH na gaz → approve USDC OGRANICZONY do
$200 (nie unlimited — higiena jak przy Uniswap) → short ETH/USD 1× $149.91
@ $1,897.31, likwidacja $3,780 (2× spot), wejście: fee $0.06 (4 bps ✓ model),
impact 0.000%, network fee $0.39 (keeper — koszt STAŁY per zlecenie: przy
$150 to 26 bps, przy docelowych $1.5–3k → 1–3 bps, pomijalne; DOPISAĆ do
modelu korekt). Pozycja trzymana do jutra → odczyt borrow/funding fee
(GMX ma borrowing fee ZALEŻNY od utylizacji, którego model nie zawierał —
to główna niewiadoma kosztowa). LEKCJA OPERACYJNA do ALGORITHM przy
następnej rewizji: hedge wymaga STAŁEJ rezerwy USDC + odrobiny ETH na
Arbitrum (bridge w środku spadku = antywzorzec).

### 2026-08-17 (~14:00) — F4 HEDGE: WYNIKI I WERDYKT — base-030 PRZECHODZI BRAMKĘ
Funding ETH-perp (Binance, 400d): średnio **+2.9%/r DLA shorta** (26% okresów
ujemnych) — koszt hedge'a NIE jest deal-breakerem. 5 runów WF_SET=hedge:
1. **PRZEŁOM: base-030 + hedge-excess ZALICZA BRAMKĘ NA OBU OKNACH** —
   45d: +1.39 śr / 73% wygr / worst −2.88; 60d: +2.24 / 81% / −2.74.
   Najtrudniejsza pula projektu (dotąd worst −8…−12) domknięta: LP zostaje
   w rynku i zbiera fees, short niweluje tylko nadwyżkę ETH ponad 50%.
2. **hedge-full = quasi-makro-short**: down fenomenalny (+6…+10 śr.,
   83–100% wygr), ale up ujemny i ogon zostaje (worst −3.9…−11.8);
   wysokie średnie (+3…+7) są w dużej mierze artefaktem PRÓBKI (rok
   spadkowy: 10–13/22 okien down). NIE jako domyślny — zbyt kierunkowy.
3. **mainnet: hedge ODPADA** (whipsaw — flat −3.2, up −4.9; excess 0% wygr
   w down) — tam zostaje exit-re>ema (+0.66/+1.07, worst −1.7…−2.2).
4. Anomalia odnotowana (bez dociekania — nie stroimy na siłę): excess słaby
   na pulach 005 (down −1.8…−2.3) mimo sukcesu na base-030.
5. Uproszczenia modelu (przy wnioskach pamiętać): brak depozytu/likwidacji,
   PnL do nogi stable, taker 5 bps, funding wg historii Binance.
REKOMENDACJA (→ decyzja Rafała): ALGORITHM v1.2 — dla base-weth-usdc-030
bezpiecznik docelowo 'hedge-excess' (zamiast exit); reszta pul bez zmian
(exit-re>ema; cbBTC czysty exit). WYKONAWCZO hedge wymaga integracji z venue
perp (Hyperliquid/GMX — research F4-op) — do tego czasu bot w OBSERWUJ dalej
emituje EXIT_TREND, a docelowa akcja dla base-030 zapisana jako hedge.

### 2026-08-17 (~12:30) — INCYDENT .bot/pipeline DOMKNIĘTY (wzorowa koordynacja 3 sesji)
Przebieg: Fable wykrył ryzyko (śledzony .bot + runner reset --hard = nadpisywanie
żywych danych co 3 min) → CC-Win krok 0 (backup robocopy + stop runnera) +
diagnoza HomosPipeline (**SYSTEM → `spawn npx ENOENT`** — trzecia iteracja
lekcji "wszystko co dotyka node/npm/git na tym Windowsie musi chodzić jako
konto elo") + przepięcie na elo + ręczny fetch:llama → CC-Mac WSTRZYMAŁ
untrack do potwierdzenia kroku 0 (deadlock potwierdzenia rozcięty przez
Fable — CC-Win zapisał potwierdzenie lokalnie bez pusha) → untrack f18f50e →
CC-Win: pull, restore backupu, start runnera, restart bota. Zero utraty danych.
DO POTWIERDZENIA (następny kontakt/pull): ranking selektora z 17.08 po
resecie selector-state + jutrzejszy automatyczny pipeline 07:30 (pierwszy
raz na koncie elo). Pomiar trafności selektora startuje od dziś na świeżych
rankingach (potrzebny ~tydzień).

### 2026-08-17 — Fable: ANALIZA 5 DNI OBSERWUJ (12–17.08) + awaria pipeline + TTL propozycji
Dane: jednorazowy snapshot .bot/* z Windows (2395 snapshotów history, log,
propozycje, stany). WYNIKI:
1. **Zbieranie danych: wzorowe** — 479 snapshotów × 5 pul co 15 min, 1 luka
   >40 min/pulę przez 5 dni (~99.8%). Wycena cbBTC zdrowa ($62.5–64k).
2. **Bezpiecznik na żywo: zero fałszywych alarmów** w płaskim tygodniu (ETH
   1864–1915, ±1.3%; gap EMA −1.5…+1.2%, daleko od progu −5%) — zgodne
   z obietnicą backtestu dla flat. Czułość na realny spadek: jeszcze nie
   przetestowana (nie było spadku).
3. **Szerokości doradcy zgodne z v1.1**: mediana 23–35% pełnej szerokości
   przy vol 1.5–2.1%/d = dokładnie k·σ·√7d (k=3; cbBTC węziej — k=2 ✓).
4. **AWARIA: HomosPipeline (schtask 07:30) nie działa najpewniej OD ZAŁOŻENIA
   (10.08)** — brak data\pipeline.log, dane DefiLlamy zestarzały się do 158h,
   selektor codziennie 6:09 uczciwie odmawiał ("nie proponuję ze stęchłych
   danych" — failsafe zadziałał wzorowo). SKUTEK: zero nowych propozycji
   selektora przez 5 dni → trafności selektora NIE zmierzymy z tego okresu.
   Naprawa: CC-Win (podejrzenie: zadanie jako SYSTEM — klasa lekcji DPAPI;
   przepiąć na .\elo) + ręczny fetch:llama + del selector-state + restart.
5. **Fix bota (Fable): TTL 48h dla propozycji OPEN/ROTATE** (wpisy z 10-11.08
   wisiały "open" tydzień; ranking sprzed dni to nie rekomendacja).
   REBALANCE/EXIT_TREND bez TTL (bazują na stanie pozycji).
6. **LEKCJA INFRA (ważna!): NIE force-addować żywych plików .bot do gita** —
   runner robi reset --hard co 3 min i NADPISUJE żywe pliki wersją z repo
   (złapane w porę; sekwencja naprawcza: backup → untrack → restore, wpisy
   w HANDOFF). Przyszłe snapshoty do analizy: kopiować pod INNĄ nazwą
   (np. .bot-snapshot/) zamiast force-add oryginałów.
WNIOSEK OGÓLNY: warstwa obserwacji i bezpiecznik produkcyjnie OK; wąskim
gardłem jest niezweryfikowana automatyka Windows (pipeline). Po naprawie
liczymy trafność selektora od nowa (potrzebne ~tydzień świeżych propozycji).

### 2026-08-12 — Fable: INTERPRETACJA PEŁNEJ MACIERZY 45/60 × 7 pul (finał kalibracji)
13 runów (nocna partia CC-Mac + wcześniejsze), format mean/win%/worst, profil
v1.1 = exit+re>EMA:
1. **Profil v1.1 POTWIERDZONY na pełnej macierzy**: dodatnia średnia w 12/13
   runów (jedyny minus: odrzucony OP), najlepsza/blisko-najlepszej średnia
   w 11/13, ogon NIGDY gorszy niż −8.1 (baseline k3: do −13.9). Wyjątek cbBTC
   (czysty exit ≥ re>EMA) też potwierdzony — konfiguracja per klasa zostaje.
2. **Bramka (win≥65 ∧ worst>−3) FORMALNIE ZALICZONA NA 3 PULACH**:
   cbBTC-005 (OBA okna: 82%/−1.8 i 76-81%/−1.4…−2.1), base-005 45d
   (68%/−2.5), mainnet-005 60d (71%/−2.2…−2.4). Arbitrum-005 o włos (45d:
   73%/−3.5). NAJTRUDNIEJSZA pozostaje base-030 (worst −7.8…−8.1 mimo
   profilu) — tier 0.3% + głębokie trendy; to główny argument za F4.
3. Okna 60d systematycznie słabsze dla profili trendowych (długi trend mieści
   się w oknie) — bezpiecznik nie zastąpi hedge'a na wielomiesięczny bear.
4. Arbitrum: 005 >> 030 (030: 48-64% win, worst −6) — selektor i tak
   preferuje wyższe APY, ale przy równych APY wybierać głębszą pulę 005.
**KALIBRACJA ZAMKNIĘTA.** ~~Do 16.08 tryb OSZCZĘDNY~~ (WYGASŁO 17.08 — limit
odnowiony, wracamy do normalnej pracy; w dniach 12–16.08 maszyny zbierały
dane OBSERWUJ zgodnie z planem).

### 2026-08-12 — Sesja Fable-desktop: ALGORITHM v1.1 WDROŻONY DO ŻYWEGO BOTA
Zaplanowana sesja botowa wykonana w całości (typecheck: tylko znane
preexisting; smoke-test serwera lokalnie OK, traversal zablokowany):
1. **Bezpiecznik EXIT_TREND w observerze**: EMA log-ceny WZGLĘDNEJ pary
   (HL 7d, konfig TREND w bot/config.ts), aktualizacja w pętli cen 60s,
   stan persystowany w `.bot/trend-state.json` (restart nie zeruje EMA;
   zimny start seeduje EMA bieżącą ceną — brak fałszywego sygnału).
   Sygnał DOWN (gap<−5%) → propozycja kind='EXIT_TREND' per posiadana
   pozycja w puli (dedup: 1 otwarta per pozycja; dosyłana też gdy pozycja
   pojawi się w trakcie sygnału) + Telegram. Powrót per pula:
   trendReentry 'aboveEma' (domyślny) / 'half' (cbBTC — czysty exit).
   PoolLive ma trendGapPct/trendDown (dla UI).
2. **Historia obserwacji**: snapshot per pula co cykl statystyk 15 min →
   `.bot/history.ndjson` {ts,poolId,price,volDaily,feeYieldDaily,rangeLo,
   rangeHi,emaGapPct,trendDown}; server: `GET /api/history?hours=N` +
   `GET /api/results/:name` (whitelist regex, Last-Modified; konwencja nazw
   Sonneta uhonorowana) — dashboard "Analiza obserwacji" ożyje po deployu.
3. **Arbitrum w BOT_POOLS**: arbitrum-weth-usdc-005 (WETH t0 zweryfikowane
   sortowaniem adresów + zgodne z meta fetcha), klient viem arbitrum, NFT
   manager 42161 (kanoniczny adres mainnetowy), RPC list; lustro w
   src/config/botPools.ts. advisor.ts: BLOCK_TIME/GAS_USD 42161 + chunk
   getLogs per chain (Arbitrum 10k bloków — inaczej ~350 wywołań/cykl).
4. **k per klasa (v1.1)**: ADVISOR_PARAMS.k 2→3; BotPool.advisorK=2 dla
   cbBTC; observer przekazuje override do suggestRange.
Deploy: commit CC-Mac + restart OBU usług na Windows (wpisy w HANDOFF).

### 2026-08-11 (~19:00) — CC-Win: wdrożenia domknięte + lekcja DPAPI
Restart homos-bot (Arbitrum w selektorze od jutrzejszego rankingu, health 200)
+ usługa homos-runner działa. **LEKCJA INFRA (do zapamiętania przy KAŻDEJ
przyszłej usłudze Windows używającej gita): usługa musi mieć ObjectName
`.\elo`, NIE LocalSystem** — git-credential-manager trzyma poświadczenia
w DPAPI konta użytkownika; pod SYSTEM git wisi w nieskończoność (potwierdzone
empirycznie). Pełna pętla koordynacji chmura↔Windows jest teraz usługowa 24/7.

### 2026-08-11 — Sesja Fable-desktop (~16:15): WERDYKT NOWYCH SIECI — Arbitrum TAK, Optimism NIE
Walkforwardy 365d/45d od CC-Mac (commit 62bbfeb), moja ocena bramki:
- **Arbitrum WETH/USDC 0.05% (12.6M swapów, 22 okna): PRAKTYCZNIE PASS** —
  profil v1.1 (re>EMA): **73% wygr (najwyższy w projekcie), worst −3.49**
  (0.49 pod progiem), down-reżim 80% wygr (+0.5). Czysty exit: 64%/−3.00.
  Zachowuje się jak Base. **DECYZJA: Arbitrum dodany do selektora**
  (CHAIN_MAP w bot/selector.ts; fetch-llama już zbierał Arbitrum).
- **Optimism WETH/USDC 0.3% (544k swapów, $4.3M TVL): NIE** — żaden wariant
  nie łapie bramki (najlepszy: czysty exit 59%/−4.06), re>EMA wręcz ujemny
  (−0.13) — profil niestabilny na cienkiej puli. Obserwować, nie wchodzić;
  infra OP w skryptach zostaje (koszt utopiony ~0, może TVL urośnie).
- Nuans do zapamiętania: re>EMA świetny na głębokich pulach (Base, Arbitrum),
  odwraca się na płytkiej (OP) — głębokość puli to realny warunek brzegowy
  algorytmu, nie tylko "chain tani gazowo".
- FOLLOW-UP (nie zrobione): pula arb do BOT_POOLS/botPools.ts + wsparcie
  chainu 42161 w observerze (RPC, NFT manager) — bez tego propozycje OPEN
  na Arbitrum pokażą się z uczciwą notą "spoza konfiguracji". Zadanie: Fable.

### 2026-08-11 — Sesja Fable-desktop: REWIZJA v1.1 (re>EMA) + START F.B (pary spięte) + fee-path v2 w silniku
1. **REWIZJA ALGORITHM v1.1 (decyzja Rafała ~14:30)**: powrót po spadku =
   re>EMA dla ETH/stable (cbBTC zostaje czysty exit). Powód: pełne 365d
   base-005/mainnet-005 (po 22 okna) odwróciły poranny werdykt — re>EMA
   wygrywa 4/5 pul, na base-005 **PIERWSZE pełne przejście bramki projektu**
   (mean +1.20, 68% wygr, worst −2.52). Lekcja: nie decydować na 4 oknach.
2. **Silnik: naliczanie fee v2 (ścieżkowe)**: kredyt proporcjonalny do
   nakładania się ścieżki swapu [prevTick→tick] z zakresem pozycji × share
   po Lpool = max(L przed, L po) [konserwatywnie; env FEE_SHARE_L=end daje
   górną granicę]. Na ETH/stable wyniki IDENTYCZNE co do centa (zweryfikowane
   mainnet-030); na pulach spiętych stary model kredytował całe wycieczki
   przez puste ticki (fees zawyżone ×10+). validate 14/14.
3. **pegged.ts (bateria F.B)** + filtr outlierów (rolling-mediana 201 swapów,
   próg 300 ticków; DAI-USDT miał 52 probe-swapy do +643% od pega ważące
   absurdalnie na wycenie — HODL stabli "miał" 69% maxDD przed filtrem).
4. **Wyniki F.B (częściowe)**:
   - **arbitrum-usdc-usdt-001** (716k swapów, czysta pula, modele zbieżne):
     najlepszy **±0.10% h=24h: +1.5…+2.2%/r netto** ($10k; fees $177-247,
     gas ~0, 4 rebalanse, w7d 0.1%). Natychmiastowe rebalanse ujemne nawet
     przy gazie ~0 (chasing). ±0.05% ujemne zawsze.
   - **mainnet-dai-usdt-001**: gaz $8 wyklucza wszystko poza histerezą;
     ±0.1% h24: **+2.6% (model konserw.) … +46% (optymist.)** — rozrzut =
     niepewność silnika na puli, gdzie ekonomię robią wycieczki przez puste
     ticki (95% wolumenu przy pegu z ogromnym L, ale fee-nośne są ekskursje).
     Ground truth wymagałby feeGrowth on-chain (pomysł na przyszłość).
   - WNIOSEK kierunkowy: **"3.1%/tydz jak u znajomego" NIE istnieje na
     uniswap-v3 pegged przy $10k** — realnie ~1.5–4%/r netto (Arbitrum
     najczyściej), spójne ze skanem (yieldy pegged żyją na aerodrome/curve).
5. TBTC-WBTC odroczony: para kwotowana w WBTC — silnik potrzebuje referencji
   USD/BTC (fetch WBTC/USDC → zadanie CC).

### 2026-08-11 — Sesja Fable-desktop: DECYZJA PROFILU + ALGORITHM.md v1 ZAMROŻONE
- Spot-check werdyktu pętli 10-min na JSON-ach: liczby się zgadzają. KOREKTA
  rekomendacji: pętla wskazała exit+re>EMA, ale na pulach SPOZA strojenia
  (cbBTC/base-005/mainnet-005) czysty exit ≥ re>EMA (cbBTC +0.88 vs +0.61,
  down +0.25; reszta remis) — re>EMA wygrywa tylko na puli strojenia (base-030).
- **Decyzja Rafała (AskUserQuestion): czysty exit(HL7d,5%) domyślnym profilem.**
- **ALGORITHM.md v1 utworzone i zamrożone** — selekcja (7d+persyst.3d+majors),
  zakres k=3 (cbBTC k=2), trigger h24+payback7d, bezpiecznik exit, collect 8×gaz,
  portfel po rewizji. Znane ograniczenia w §8 (ogon ~2× mniejszy, nie zero →
  F4; base/mainnet-005 tylko 4 okna). Wdrożenie parametrów do advisor/bot =
  osobne zadanie (E) — advisor wymaga per-pula k i stanu EMA w observerze.

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

### 2026-08-11 — Sesja Fable-desktop: CROSS-WALIDACJA BEZPIECZNIKA TRENDU (5 runów out-of-sample) — WERDYKT
Dane: kod c64f8ba, runy 10fd366 (CC-Mac), pełne JSON-y z byRegime w
backtest/results/walkforward-*.json. Porównanie: A3 czysta (k=3 h=24) vs 3
profile bezpiecznika: T-exit (exit,HL7d,5%), T-vg (dwupoziomowy vg1.4+t2=10%),
T-re (exit + re-entry >EMA). Parametry NIEZMIENIONE między pulami (test
generalizacji).
1. **BEZPIECZNIK GENERALIZUJE JAKO REDUKTOR OGONA — 5/5 runów.** W każdym
   runie każdy profil trendowy ma lepszy down-mean i lepszy worst niż A3.
   Średnio po 5 runach (mean okien / down-mean / najgorszy worst):
   A3 −0.91 / −3.41 / −12.33 · T-exit **−0.28 / −0.39 / −7.93** ·
   T-re **−0.22** / −1.01 / −8.13 · T-vg −0.51 / −1.89 / −8.24 ·
   pasywny±50 −0.75 / −2.52 / −12.74.
2. **T-vg (dwupoziomowy) — zwycięzca sweepa in-sample — NIE GENERALIZUJE:**
   najsłabszy z trzech profili cross-pool, a na mainnet-005 wyraźnie najgorszy
   (−3.02 vs −1.6/−1.7 pozostałych). Klasyczny overfit do base-030. ODRZUCIĆ.
3. **Najlepiej generalizują T-re i T-exit** (praktycznie remis):
   T-re najlepsza średnia cross-pool i najlepszy profil na obu runach
   base-030 (45d +0.46, 60d +0.47; up 100%wygr na 45d); T-exit najlepszy
   down (jedyny dodatni down-mean na base-030-45d: +0.08, i na cbbtc: +0.25)
   i najpłytszy ogon (min worst −4.95 na base-030-45d). Na cbbtc (płytkie
   reżimy, 15×flat) T-exit +0.88 bije nawet czystą A3 (+0.81) — bezpiecznik
   tam prawie darmowy.
4. **Koszt ubezpieczenia widoczny tylko na base-030:** czysta A3 ma tam wyższą
   mean (45d +0.55 vs +0.46 T-re; 60d +1.02 vs +0.47) — bezpiecznik płaci
   ~0.1–0.55 pp/okno za cięcie worst z −12 do −5…−8 i down z −2.8 do −0.8.
   Cross-pool trend jednak WYGRYWA z A3, bo w słabych okresach chroni więcej
   niż kosztuje. Na oknach 60d redukcja ogona słabsza niż na 45d (długi trend
   „mieści się" w oknie mimo wyjść).
5. **REKOMENDACJA (do decyzji Rafała przy zamrażaniu ALGORITHM.md):**
   profil **exit(HL7d,5%) + re-entry >EMA** jako domyślny; prosty exit jako
   wariant konserwatywny (lepszy down/worst, minimalnie gorsza średnia).
   Dwupoziomowy odrzucony.
6. Zastrzeżenia: (a) bramka PLAN.md (%wygr≥65 ∧ worst>−3) nadal globalnie NIE
   przechodzi — ogon zmniejszony ~2×, nie usunięty; hedge (F4) pozostaje
   otwartym frontem. (b) base-005 i mainnet-005 to tylko 4 okna (90d danych,
   0×flat) — kierunkowo zgodne (trend tnie stratę A3 z −3…−4 do −1…−1.7),
   ale mała moc; po dociągnięciu 365d HyperSynciem powtórzyć.

### 2026-08-11 ~13:14 — Sesja Fable-desktop (poll): raport ALGORITHM v1 od CC-Mac odebrany
- ALGORITHM.md v1 wypchnięty (32b5121); POOLS +7 pul wypchnięte (6a834cf),
  fetch HyperSynciem 365d w toku (sekwencyjnie): 2× kanoniczne 005-365d
  (base-weth-usdc-005-365d, mainnet-usdc-weth-005-365d) + 5 pul F.A.
- **F.A: 5 par spiętych z adresami zweryfikowanymi on-chain (token0()/token1(),
  lekcja cbBTC)** — pełna lista adresów przeniesiona do RESEARCH-QUEUE F.A.
  Istotne: na Arbitrum istnieje pula USDC **natywnego** (nie USDC.e) z USDT.
- Następne kroki (po sygnale „dane gotowe" od CC-Mac): (1) powtórka
  cross-walidacji bezpiecznika na 005-365d (CC-Mac puszcza walkforward 45 15,
  ja interpretuję), (2) projekt baterii F.B — strategie ultra-wąskie na parach
  spiętych (±ticki, rebalans przy wyjściu, zachowanie w dni stresu pegu,
  próg kapitału vs gaz mainnet).

### 2026-08-11 ~13:30 — Sesja Fable-desktop (pobudka popołudniowa): checklista odhaczona
- **A2 base-030-365d: FETCH ZAKOŃCZONY** (state nextBlock 49 791 594 > cel
  49 791 593; ndjson zamknięty 09:45). Walk-forwardy 45/15 i 60/15 na tej puli
  JUŻ zrobione (runy 10fd366) i ZINTERPRETOWANE w ramach cross-walidacji
  bezpiecznika (wpis wyżej „CROSS-WALIDACJA… WERDYKT"); kryterium %wygr≥65 ∧
  worst>−3 globalnie nadal nie przechodzi (ogon ~2× mniejszy, nie zerowy) —
  rekomendacja ws. ALGORITHM.md skonsumowana przy zamrożeniu v1 (32b5121).
  Nowych zleceń walk-forward NIE wystawiam — zlecenie na 005-365d już siedzi
  w skrzynce @CC-Mac (wpis ~11:35, pkt 2).
- **Fetch Części 2 + F.A w toku (sekwencyjnie, HyperSync)**: teraz
  base-weth-usdc-005-365d ~64% (nextBlock 44.2M / cel 49.83M, ~7.4k bl/s ⇒
  ETA ~14:00). Potem mainnet-005-365d (~2.6M bloków ⇒ minuty–kilkanaście) i
  5 pul F.A. ⚠️ arbitrum-usdc-usdt-001: rok Arbitrum ≈ 126M bloków
  (0.25 s/blok) — przy 7–17k bl/s to 2–5 h; spodziewany finisz całości
  późne popołudnie/wieczór, arbitrum na końcu ogona.
- **Kolejka: diagnoza odrzutu fable-20260811-testmath** (done/ 09:41, exit −1,
  „undefined spoza białej listy"): runner czyta pole `task` (WHITELIST[task.task]),
  a plik miał `script` → undefined. Scan2 działał, bo miał `task`. Naprawa:
  nowy plik pending/fable-20260811-testmath2.json z poprawnym polem (retest
  ścieżki; commit → CC-Mac). Lekcja do formatu zadań: zawsze `task` + `args`.
- **Scan-universe: potwierdzam odbiór pełnego pliku** (backtest/results/
  scan-universe.json od CC) — analiza koszyków była już zrobiona (sekcja F);
  wybór pul spiętych domknięty wcześniej: 5 pul F.A (w tym TBTC-WBTC 0.01%
  v/tvl7d 10.52) w POOLS (6a834cf). Bez zmian.
- Porządki: RESEARCH-QUEUE A2 → [x]. Następny krok czeka na sygnał „dane
  gotowe" od CC-Mac → interpretacja walkforwardów 005-365d + projekt baterii
  F.B (ultra-wąskie na parach spiętych).

### 2026-08-12 07:50 — Sesja Fable-desktop (poranny brief): INTERPRETACJA NOCNEJ PARTII db2e3e5 (walkforwardy 60/15 + arbitrum-030)
Rutyna: health 192.168.1.8:8787 nieosiągalny z sandboksa (brak trasy do LAN —
to NIE jest diagnoza serwera); brak nowych commitów runnera i plików w done/
po 11.08 wieczór; weryfikacja pipeline'u 07:30 z tej sesji NIEMOŻLIWA (data/
żyje na Windows, nie w repo) → sprawdzi CC-Win/Rafał przez /health lub
data\pipeline.log. Fetch base-030-365d potwierdzone DONE (walkforwardy 45/60
zrobione wcześniej — zlecenie z checklisty bezprzedmiotowe).

**1. WALKFORWARDY 60/15 (4 pule) — WZMACNIAJĄ REWIZJĘ v1.1.** Liczby per
reżim w walkforward-*-60d.json; skrót (mean / %wygr / worst, vsHODL):
- **mainnet-005-365d: PEŁNE PRZEJŚCIE BRAMKI (%wygr≥65 ∧ worst>−3) przez OBA
  profile trendowe** — re>EMA **+1.07 / 71% / −2.16**, czysty exit +0.74 /
  71% / −2.39. Po base-005-45d (68%/−2.52) to DRUGA pula z pełnym pass —
  i pierwsza na mainnecie (gas $8 nie zabija: exit rzadko strzela).
- **base-005: re>EMA najlepszy** (+1.70 / 62% / **−1.94**) — worst przechodzi
  z zapasem, %wygr o 3 p.p. pod progiem. Kierunkowo potwierdza 45d.
- **cbBTC: czysty exit PRZECHODZI bramkę** (+1.11 / **81% / −1.36**) —
  potwierdza zamrożony profil cbBTC (exit). ⚠️ Napięcie: w walk-forwardzie
  k3 > k2 (adapt k3h24 +1.14/76%/−3.41 vs k2h24 +0.76/57%/−4.97), a v1 zamroził
  k=2 dla cbBTC na podstawie pełnorocznego pojedynczego runu (+11.42 — pojedynczy
  przebieg, nie rozkład okien). NIE zmieniam v1.1 hotfixem; kandydat do rewizji
  v1.2 przy następnym przeglądzie (walk-forward > single-run, lekcja z 11.08).
- **arbitrum-005: 60d NIE potwierdza 45d** (exit +0.58/62%/−4.15; re>EMA
  +0.19/52%/−6.42 vs 73%/−3.49 na 45d). Decyzja "Arbitrum w selektorze" zostaje
  (45d była podstawą i nadal jest najlepszym oknem projektu), ale status
  Arbitrum spada z "praktycznie pass" do "kierunkowo OK, niestabilny w oknie".

**2. arbitrum-030 (nowa pula, 45d+60d): bramka NIE PRZECHODZI.** Najlepsze:
45d pasywny±50 73% wygr ale worst −10.31; profile trendowe worst −5…−8.
Wniosek operacyjny: na Arbitrum gramy 005, nie 030 (spójne z lekcją OP:
głębokość/aktywność puli to warunek brzegowy). Ciekawostka do obserwacji,
NIE do decyzji: odrzucony jako overfit profil vg1.4+t2 wygrywa na arb-030
oba okna (45d +1.25, 60d +1.37/71%) — na chainach z płytszymi pulami bramka
vol może mieć wartość; wrócić przy większej próbce, nie otwieram ponownie.

**3. Wniosek przekrojowy**: profile trendowe (exit / re>EMA) tną worst-okno
do −1.4…−4.2 na WSZYSTKICH czterech pulach 60d (czyste adaptacyjne: −5.7…−18).
Podział ról z v1.1 (re>EMA dla ETH/stable, czysty exit dla cbBTC) trzyma się
też na 60d — każdy profil wygrywa dokładnie tam, gdzie go przypisaliśmy.
Bramka globalna: 2 pule pass (base-005-45d, mainnet-005-60d) + cbBTC pass
(60d) — hedge F4 wciąż otwarty front, ale ogon systematycznie maleje.

### 2026-08-19 07:50 — Sesja Fable-desktop (poranny brief): za wcześnie na weryfikację, HANDOFF wysprzątany
Rutyna: git log bez nowych commitów od wczoraj 17:40 (666736c/4b9e4b2 —
tylko ranking TOP 10 + docs z 18.08 wieczorem); `.agent-queue/done/` bez
zmian od 11.08 (zgodnie z decyzją o wycofaniu runnera). `.bot/` na Macu
nadal STALE (17.08 10:43) — potwierdza, że żywe dane bota żyją na
Windows, nie w repo Maca. `reports/` puste w repo — **to oczekiwane**:
pierwszy pełny przebieg pipeline'u z fixem shell:true+HyperSync (konto
elo) miał start 07:30 lokalnie, ale jedyny automat gitowy na Windows
(push raportu) odpala się dopiero o 08:45 — ta sesja startuje wcześniej,
więc brak śladu w gicie NIE jest anomalią, tylko kwestią czasu. Poprosiłem
@CC-Win (wpis w HANDOFF) o wklejenie tail `pipeline-task.log` + linii
`selector:`/„ranking dnia" po tym jak oba schtaski (07:30, 08:45) się
wykonają — potrzebne do SELECTOR-LOG.md (pomiar trafności od 17.08, dziś
brak jeszcze wpisu). Porządki: sekcja @Fable w HANDOFF.md wyczyszczona z
historii 11–18.08 (wszystko było już odebrane/pusta, pełny zapis zostaje
w gicie) — zostawiony tylko nagłówek + notka o stanie tej sesji.

**Brief dla Rafała:** System bez zmian od wczorajszego wieczora — ostatnie
commity to ranking TOP 10 (18.08 ~17:40), wszystkie zadania z wczoraj
domknięte. Za wcześnie, by ocenić dzisiejszy pierwszy pełny przebieg
pipeline'u (fix shell:true + HyperSync, start 07:30) — raport z Windows
wpada dopiero o 08:45, poprosiłem @CC-Win o potwierdzenie i świeży ranking
selektora po tym fakcie. Nic nie wymaga Twojej decyzji teraz; jeśli
pipeline padnie tym samym błędem co poprzednio, dostaniesz sygnał osobno.

### 2026-08-20 07:5x — Sesja Fable-desktop (poranny brief): brak śladów dzisiejszego przebiegu, ponowna prośba do CC-Win
Rutyna: `git log` bez nowych commitów od wczoraj 14:48 (ba04a21/54a7dee/
4b95fe1/041b872 — fixy API-adresu na Macu/iPhone + porządki RESEARCH-QUEUE,
mobile domknięte). `.agent-queue/` już nie istnieje w repo (reorganizacja
struktury — bez znaczenia dla briefu, ostatnio i tak nieużywana od 11.08).
HANDOFF @Fable: zastałem pustą skrzynkę, ale @CC-Win miał nieodebrane
potwierdzenie wdrożenia fixu API-adresu (deploy OK, `curl` 200) — odebrane
i skasowane. KLUCZOWE (pkt 3 rutyny): wg SELECTOR-LOG z 19.08 dzisiejszy
przebieg 07:30 miał być pierwszym w pełni czystym testem po fixie
HyperSync (`npm install @envio-dev/hypersync-client` na Windows) — ale
`.bot/` na Macu nadal STALE z 17.08 10:43 i `data/pipeline.log` bez wpisu
nowszego niż 17.08 (repo Maca nie ma żywych danych bota, to oczekiwane).
Brak commitów/wpisów CC-Win potwierdzających wynik dzisiejszego testu —
dopisałem do @CC-Win prośbę o wklejenie ogona observer.log
(linie "selector:"/"ranking dnia") + tail pipeline-task.log. Brak nowej
propozycji OPEN/ROTATE do zalogowania w SELECTOR-LOG — najnowsza znana
to WETH-USDT 0.05% @ Ethereum z 19.08 (13.1% APY, bez walidacji, obserwacja).

**Brief dla Rafała:** Bez zmian technicznych od wczorajszego popołudnia
(ostatnie commity to fixy mobile/WalletConnect, wszystko domknięte).
Nie mam jeszcze potwierdzenia, czy dzisiejszy pierwszy pełny test fixu
HyperSync na Windows (start 07:30) przeszedł czysto — poprosiłem @CC-Win
o wklejenie logów po przebiegu, bo repo na Macu nie widzi danych bota
na żywo. Nic nie wymaga Twojej decyzji teraz; jeśli test padnie, dostaniesz
sygnał osobno po odpowiedzi CC-Win.

### 2026-08-21 07:5x — Sesja Fable-desktop (poranny brief): fix HyperSync POTWIERDZONY, pierwszy ranking w pełni ze świeżych danych; nowa anomalia backtest-run exit 134
Rutyna: git bez commitów od wczoraj 15:21 (hotfix hooks-order); HANDOFF
wszystkie skrzynki puste (nic do odbioru). KLUCZOWE — raport
`reports/morning-2026-08-20.md` (push 11:19, wpadł PO wczorajszym briefie)
zamyka wątek z 19–20.08: pipeline 20.08 05:40Z przeszedł CZYSTO przez
wszystkie kroki hs-* (exit 0, swap cache 0.9h, BRAKI=[]) — fix
shell:true + `npm install @envio-dev/hypersync-client` DZIAŁA. Selektor
06:02Z wydał ranking ze świeżych danych: top5 WETH-CBBTC@Base 46.7%,
WETH-USDC@Base 43.6%, WETH-USDT@Eth 33.1%, USDC-WETH@Eth 33.0%,
WETH-USDT@Eth 27.2% — APY wyraźnie wyżej niż na stęchłych danych z 17.08
(25.2% → 46.7% dla lidera; skok to efekt świeżego 7d-okna, nie bug).
Nowa propozycja OPEN: WETH-USDT 0.3% @ Ethereum 33.1% (pula SPOZA
BOT_POOLS, bez walidacji) — zalogowana w SELECTOR-LOG wraz z pominiętą
rotacją ($2.26<$25, 2. dzień działania progu). NOWA ANOMALIA: backtest-run
padł 2×2 z exit 134 (prawd. OOM/abort node'a) — pipeline poszedł dalej,
ale krok wymaga diagnozy; dopiszę do @CC-Win po dzisiejszym raporcie
(08:45), by nie dublować pingów. Paper trading (start 18.08): $52456
(+$2456), wszystkie pule na plusie nominalnie, vs HODL −$2592 (rynek
rośnie — LP w górkę traci do HODL, oczekiwane). Dzisiejszy przebieg
07:30: za wcześnie (raport 08:45).

### 2026-08-21 (Fable, po briefie) — FIX: zamrożony `latest` w fetch-swaps-hypersync.ts (cichy stop całego swap-cache)
Zgłoszenie CC-Win potwierdzone co do joty: 18/18 pul miało w meta.json
`latest` zamrożony, a `state.json.nextBlock == latest+1` (sprawdzone na
plikach w data/cache — np. arbitrum-usdc-usdt-001 latest=493413610 /
nextBlock=493413611). Mechanizm: `latest` czytany z meta TYLKO przy
pierwszym uruchomieniu puli → gdy kursor dogonił ówczesny chain tip
(20.08, podczas weryfikacji heap-fixu), zakres `[fromBlock, latest+1)`
stał się pusty NA ZAWSZE; HyperSync zwracał `nextBlock == fromBlock`,
skrypt czytał to jako "przerwane" i kończył exit 0 → pipeline codziennie
raportował `porażki: BRAK` na całkowicie martwym fetchu. Wniosek
metodologiczny: "zielony pipeline" 20.08 opisany w briefie wyżej był
prawdziwy TYLKO dla tego jednego przebiegu — od 21.08 był już fałszywy.

Wdrożone w `scripts/fetch-swaps-hypersync.ts` (4 zmiany):
1. `latest` odświeżany `client.getHeight()` przy KAŻDYM uruchomieniu
   (`latest = max(meta.latest, tip)`); `startBlock` nadal z meta — okno
   rośnie tylko z prawej, anchory i interpolacja czasu nienaruszone.
2. `anchorSpan` (nowe pole meta) zamraża siatkę 11 anchorów na PIERWOTNYM
   oknie — bez tego rosnące `blocksBack` przesuwałoby `anchorMarks` co dzień
   i anchory z różnych dni opisywałyby różne punkty osi czasu.
   Dodatkowo anchor "ogonowy" (próg 1% anchorSpan, ~max 100 szt.) dla
   świeżych bloków, żeby backtest/load.ts interpolował, a nie ekstrapolował.
3. Brak postępu `nextBlock` = ANOMALIA → `exit 1` (był exit 0). Koniec
   fałszywego zielonego: pipeline policzy to jako porażkę kroku.
4. Nowy wczesny exit 0 "na bieżąco" (kursor ≥ tip) — legalny brak pracy
   odróżniony od awarii; + domknięcie strumienia ndjson przed `process.exit`
   (inaczej exit ucina niezflushowany bufor).
Typecheck: `npx tsc --noEmit` bez błędów w tym pliku (pozostałe błędy repo
— bot/observer.ts viem, node_modules/ox — sprzed zmiany, nietknięte).
Ryzyko duplikatów przy dociąganiu luki: brak (kursor idzie do przodu, a
load.ts i tak deduplikuje). Do potwierdzenia po przebiegu na Windows:
liczba swapów > 0 dla wszystkich 18 pul i BRAKI=[] we freshness-check.

**Uzupełnienie (Fable, po pytaniu Rafała o ręczny ranking):** przy pisaniu
zlecenia dla CC-Win wyszło rozróżnienie, którego wcześniej nie mieliśmy
zapisanego wprost — **„ranking dnia" selektora NIE zależy od swap cache'u**.
`bot/selector.ts:buildRanking` liczy apy7d z `data/llama/history/<uuid>.json`
(apyBase, okno 7d) + `universe.json`; swapy karmią wyłącznie warstwę
backtest/selection/sweep. Skutki: (a) ręczny przelicz po fixie HyperSync ma
sens tylko dla backtestu, nie dla rankingu; (b) skok APY 20.08 (25.2%→46.7%),
opisany w porannym briefie jako „efekt świeżego 7d-okna po fixie HyperSync",
był przypisany do złej przyczyny — HyperSync nie mógł na to wpłynąć.
NOWA ANOMALIA (do CC-Win): ranking 21.08 06:23 jest co do cyfry identyczny
z 20.08 06:02 na wszystkich 5 pulach, mimo `universe.json` świeżego 1.2h.
Przy oknie kroczącym 7d to praktycznie niemożliwe → hipoteza: `fetch-llama`
odświeża universe.json, ale nie dopisuje punktów do history/*.json (drugi
cichy zamrożony strumień, ten sam wzorzec co HyperSync). Weryfikacja: data
ostatniego wpisu w `series` dla uuid z topu. Danych nie sprawdzę u siebie —
`data/llama` w repo na Macu jest z 10.08 (żywe dane tylko na Windows).
PUŁAPKA na przyszłość: ręczny bieg selektora tego samego dnia ZAWYŻA
`streaks` (inkrementacja przy każdym `buildRanking`), więc psuje próg
persystencji ≥3d — wymaga kopii i przywrócenia `.bot/selector-state.json`.

**Weryfikacja fixu HyperSync (Fable, 21.08) — co jest sprawdzone, a co NIE.**
Sieci do hypersync.xyz z sesji Fable nie ma, więc zamiast zapewnień: test
offline na atrapie klienta (`/tmp`, kopia zamrożonej puli — produkcyjny
cache nietknięty, `git status` czysty poza CONTEXT/HANDOFF/skryptem).
SPRAWDZONE (4 ścieżki + dry-run, wszystkie zielone):
 1. zamrożony kursor + tip wyższy o dobę → okno przesunięte
    (49791593→49834793), swapy dopisane, `anchorSpan` zamrożony na
    pierwotnym oknie (15768000 = dokładnie stare `latest-startBlock`),
    liczba anchorów bez zmian (11);
 2. API nie przesuwa kursora → `exit 1` + jasny log ANOMALIA (dawniej
    cichy exit 0 = fałszywy zielony);
 3. brak nowych bloków → `exit 0`, ndjson bit-w-bit nietknięty;
 4. świeża pula bez meta → okno 90d policzone poprawnie, 11 anchorów.
 5. `--dry-run` (NOWE, na prośbę Rafała): liczy wszystko, md5 wszystkich
    trzech plików cache'u bez zmian.
NIESPRAWDZONE (i tylko to zostaje do potwierdzenia na Windows): realny
kształt odpowiedzi HyperSync — atrapa zwraca to, co skrypt zakłada
(`res.nextBlock`, `data.logs[].blockNumber`). Ta warstwa działała przed
20.08, więc ryzyko małe, ale to jedyne miejsce, gdzie test niczego nie
dowodzi. Stąd instrukcja dla CC-Win: najpierw `--dry-run`, potem zapis.
RYZYKO NA PRZÓD (nie blokuje, ale wróci): okno rośnie teraz codziennie z
prawej, więc backtest dostaje co dzień więcej swapów — a `backtest-run`
padał 20.08 z exit 134 (OOM) już przy 8GB heap. Diagnoza tego kroku jest
osobnym zadaniem u CC-Win; jeśli OOM wróci, trzeba będzie przyciąć okno
od lewej (rolling window zamiast rosnącego) — decyzja parametryczna, nie
techniczna.

### 2026-08-21 09:1x — Brief z przebiegów nocnych (raport 08:45): PIERWSZE 3 REBALANSE w paper tradingu
Źródło: `reports/morning-2026-08-21.md` (push 08:45). Żywych danych bota nie
ruszę z sesji Fable — bot siedzi na Windows za LAN/VPN bez port-forwardingu,
a `.bot/` w repo na Macu jest z 17.08; raport 08:45 to najświeższa prawda.
PIPELINE 05:30–06:30: 18/18 hs-* exit 0 w ~1.2s każdy = zero swapów (znany
bug, dziś naprawiony); freshness OK=[2] BRAKI=[16]; backtest-run 52 min
exit 0 — **anomalia exit 134 z 20.08 NIE powtórzyła się**, ale liczyła na
zamrożonych (czyli mniejszych) danych, więc OOM może wrócić po odmrożeniu
okna; selection OK, sweep 7 min OK. universe.json 1.2h, swap cache 21.2h.
PAPER TRADING (start 18.08): equity $52456 → **$52724** (+$268/+0.5%).
Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC
(mainnet 0.30, mainnet 0.05, base 0.30): histereza 24h poza zakresem
dobiegła i payback wyszedł ≤7d. Fee-flow wyraźnie przyspieszył po
re-centrowaniu (mainnet-030 $5.09→$8.76, base-030 $3.65→$8.57), ale equity
per pula urosło tylko +$69/+$93/+$87 — koszt rebalansu zjadł resztę.
vs HODL: −$2592 → **−$4328** (−$1736 w dobę, największa dzienna rozbieżność
od startu; rynek rośnie, LP zostaje w tyle — mechanicznie oczekiwane).
cbBTC-WETH: 2. dobę w `cash` po EXIT_TREND (jedyna pula z `down:true`,
brak `trendAction:'hedge'` w config → domyślne 'exit'). Equity zamrożone
$11079, ale vs HODL −253 → −1020: **samo siedzenie w gotówce kosztowało
~$767 w dobę**, i to na puli #1 rankingu (46.7%). Materiał wprost do agendy
przeglądu 26.08 (hUp/v1.2) — zgodnie z decyzją NIE ruszam v1.2 do tego czasu.
WAŻNE: paper trading NIE jest skażony bugiem HyperSync — `refreshStats`
liczy z `fetchRecentSwaps(...24h)` po RPC, nie ze swap cache'u. Bug dotyka
wyłącznie backtest/selection/sweep.
SELEKTOR: ranking bez zmian (znana anomalia, patrz wpis wyżej), streaki 8d
stabilne, rotacja pominięta 3. dzień ($2.29 < $25), 3 propozycje OPEN wiszą
(19.08 ×2, 20.08 ×1) — wszystkie SPOZA BOT_POOLS, każda wymaga dopisania
puli do `bot/config.ts` przed otwarciem. Do decyzji Rafała.
