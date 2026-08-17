# HANDOFF.md — skrzynki między sesjami (protokół kooperacji)

## MAPA: 4 miejsca (kto jest kim)
| Sekcja | Co to jest | Gdzie żyje | Rola |
|---|---|---|---|
| @Fable | sesja analityczna (Cowork cloud) | chmura — ZAWSZE dostępna (iPhone) | analizy, algorytmy, kod core/bot, koordynacja |
| @CC-Mac | Claude Code w iTerm na Macu | Mac (musi być otwarty) | git commit/push, odpalanie skryptów, TERAZ: nocny grind A2 |
| @CC-Win | Claude Code od botów windowsowych | Windows (24/7) | usługi NSSM, wdrożenia serwerowe, .env |
| @Sonnet | sesja UI (Claude Desktop, Cowork) | Mac (musi być otwarty) | warstwa wizualna src/components+hooks+styles |

> Zasada: KRÓTKIE przekazania ("zrobione X, odbierz Y") — pełny kontekst w
> CONTEXT.md/TASKS-*/RESEARCH-QUEUE. Sesja NA STARCIE czyta swoją sekcję
> i USUWA odebrane wpisy. Format: `- [od→do, data] treść`.

## STAN KOLEJKI ZADAŃ (agent-runner-git) — AKTUALNY, PO CLEANUPIE
Wszystko działa na MAIN. Żadnych dodatkowych branchy, patchy ani tokenów —
NIE twórz brancha agent-queue, NIE proś o żadne tokeny GitHub. Runner używa
tych samych poświadczeń gita, którymi Windows robi zwykły `git pull`.
Kolejka: .agent-queue/pending/*.json → wykonanie (whitelist) → .agent-queue/done/.

## @Fable (sesja analityczna — od 2026-08-11 DESKTOP Cowork na Macu)
(raport CC-Win ~18:4x ODEBRANY ~19:0x: bot zrestartowany [Arbitrum w selektorze
od jutra], runner-usługa działa jako .\elo — lekcja DPAPI w CONTEXT/INFRA.
Skrzynka pusta.)
> Bootstrap z 2026-08-11 ODEBRANY przez nową sesję Fable (desktop, nie cloud).
> WAŻNA różnica vs plan: sesja ma bezpośredni dostęp do dysku Maca (mount),
> ale sandbox NIE ma poświadczeń GitHub → git push/pull NIEMOŻLIWY z tej
> sesji. Decyzja Rafała: push robi CC-Mac (status quo). Pobudki: zadania
> harmonogramu Cowork (07:50 codziennie + 13:30 jednorazowa 11.08) — działają
> tylko przy OTWARTEJ aplikacji Claude na Macu.
(raport CC-Mac ~15:2x "REWIZJA v1.1 + F.B zrobione w całości" ODEBRANY ~15:37
przez pobudkę Fable: commity 627cc38/8636d63/602c644 zweryfikowane, pegged
usdc-usdt + wsteth-weth ZINTERPRETOWANE → CONTEXT dziennik ~15:40 + RESEARCH-QUEUE
F.B/C zaktualizowane. Werdykt: sleeve pegged na v3 = rekomendacja NIE.
Skrzynka pusta — czekam na walkforwardy arbitrum/optimism 45/15 → ocena bramki.)
(walkforwardy arb/op ODEBRANE ~16:15, werdykt w CONTEXT: Arbitrum → selektor,
OP → nie. Skrzynka pusta.)
(poranny brief 12.08 07:50: nocna partia db2e3e5 ODEBRANA i ZINTERPRETOWANA —
wpis CONTEXT "2026-08-12 07:50". Skrót: mainnet-005-60d PEŁNY PASS bramki
oboma profilami trendowymi; cbBTC-60d exit pass 81%/−1.36; arb-030 fail →
na Arbitrum gramy 005; arb-005 na 60d nie potwierdza 45d. Odebrane też oba
raporty Sonneta [Arbitrum w UI, EXIT_TREND, ObservationAnalysis — konwencję
nazw /api/results `walkforward-<botPoolId>-365d-45d.json` honoruję w server.ts].
Skrzynka pusta.)
(raport CC-Win 12.08 ~10:1x "wdrożenie v1.1 (3c09ade) + restart bot/server +
UI rebuild" ODEBRANY. Kontrola 13.08 ~20:0x: oba serwisy Running bez przerw,
wszystkie 5 pul (w tym arbitrum-weth-usdc-005) zbierają realne
vol/feeYield co ~15 min, ostatni wpis history.ndjson sprzed 5 min — zbieranie
danych działa poprawnie. Skrzynka pusta.)

## @Sonnet (sesja UI, Cowork)
Skrzynka pusta.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
- [Fable→CC-Mac, 2026-08-17 ~08:35] Po tym jak CC-Win wypchnie snapshot
  (wpis niżej w @CC-Win): `git pull` na Macu i krótka notka do @Fable —
  analizuję dane OBSERWUJ z 5 dni. Przy okazji: commit bieżących zmian md
  (zdjęcie trybu oszczędnego).
- [✅ ZROBIONE przez CC-Mac — commit 3c09ade, typecheck: tylko znany preexisting TS2719] (odebrane; oryginał niżej):
  WDROŻENIE v1.1 DO BOTA (sesja Fable
  zakończona, typecheck czysty [tylko znane preexisting], smoke-test endpointów
  OK). COMMIT+PUSH plików: bot/config.ts (Arbitrum w BOT_POOLS, TREND,
  advisorK/trendReentry), bot/observer.ts (bezpiecznik EXIT_TREND + EMA
  persystowana w .bot/trend-state.json + history.ndjson + klient arbitrum + k
  per pula), bot/server.ts (GET /api/history, GET /api/results/:name),
  src/utils/advisor.ts (k=3 v1.1, chunk getLogs per chain, gaz/block-time
  42161), src/config/botPools.ts (lustro arbitrum) + md-ki. Msg: "feat(bot):
  bezpiecznik EXIT_TREND + historia obserwacji + Arbitrum w BOT_POOLS
  (ALGORITHM v1.1)". Potem wpis do @CC-Win (poniżej już czeka).
- [✅ ZROBIONE przez CC-Mac] (odebrane; oryginał niżej):
  COMMIT+PUSH (małe, same docs): CONTEXT.md
  (wpis 12.08 — interpretacja nocnej partii), RESEARCH-QUEUE.md, HANDOFF.md.
  Msg: "docs: interpretacja walkforwardów 60/15 + arb-030 (poranny brief 12.08)".
  Nowych runów nie zlecam.
- [✅ ZROBIONE ~19:1x przez CC-Mac — 7/7 kroków rc=0, commit db2e3e5] (odebrane; oryginał niżej):
  NOCNA PARTIA (zero AI-decyzji, czysta
  egzekucja; można odpalić wieczorem i iść spać — łącznie ~40 min):
  1. Walkforwardy 60/15 (duży heap dla base-005/arbitrum):
     `npx tsx backtest/walkforward.ts arbitrum-weth-usdc-005-365d 60 15`
     `npx tsx backtest/walkforward.ts base-cbbtc-weth-005-365d 60 15`
     `npx tsx backtest/walkforward.ts base-weth-usdc-005-365d 60 15`
     `npx tsx backtest/walkforward.ts mainnet-usdc-weth-005-365d 60 15`
  2. Druga pula Arbitrum: POOLS += `arbitrum-weth-usdc-030-365d`
     (WETH/USDC 0.3% Arbitrum, adres przez factory getPool(WETH 0x82aF…4Bab1,
     USDC natywny 0xaf88…5831, 3000) — zweryfikuj token0/decimals on-chain),
     fetch HYPERSYNCIEM, potem walkforward 45/15 i 60/15.
  3. `git add -f backtest/results/walkforward-*.json` + commit+push wszystkiego
     + krótka notka do @Fable (poranna pobudka Fable 07:50 to odbierze).
  NIE interpretuj wyników — to robi Fable rano (oszczędzamy jego limit).
- [✅ ZROBIONE ~16:5x przez CC-Mac] (odebrane; oryginał niżej):
  COMMIT+PUSH (mały): `bot/selector.ts`
  (CHAIN_MAP + Arbitrum — werdykt walkforwardów, patrz CONTEXT ~16:15) +
  zaktualizowane CONTEXT.md/HANDOFF.md. Msg: "feat(bot): Arbitrum w selektorze
  (walk-forward pass); OP odrzucony". Potem wpis do @CC-Win: git pull +
  `nssm restart homos-bot` (selektor zobaczy Arbitrum od jutrzejszego rankingu;
  data/llama na Windows już ma pule Arbitrum — fetch-llama zbierał je od zawsze).
- [✅ ZROBIONE ~15:5x przez CC-Mac — walkforwardy arb/op done, commit 62bbfeb] (odebrane; oryginał niżej):
  Widzę, że fetch NOWYCH SIECI dojechał
  (arbitrum ~15:23, optimism ~15:26, state=komplet). Zostały z wpisu ~15:1x:
  walkforwardy `npx tsx backtest/walkforward.ts arbitrum-weth-usdc-005-365d 45 15`
  i `optimism-weth-usdc-030-365d 45 15` (duży heap — arbitrum ndjson 1.67GB!),
  potem force-add JSON-ów + commit CONTEXT/RESEARCH-QUEUE/HANDOFF (mam tu
  świeże wpisy: interpretacja F.B) + push + notka do @Fable. Sugerowany msg:
  "data(F.B finał + nowe sieci): interpretacja pegged mainnet + walkforwardy arb/op".
- [✅ ODEBRANE ~15:3x — zgodne z praktyką, fetch Arbitrum/OP już leci przez hypersync]:
  PILNE przypomnienie: do pobierania swapów
  używaj ZAWSZE `npx tsx scripts/fetch-swaps-hypersync.ts <id>` (minuty),
  NIE `fetch-swaps.ts` (RPC = godziny). Stary skrypt tylko gdy trzeba
  factory-lookupu pustego adresu (przerwij go zaraz po wpisaniu adresu do
  meta/POOLS). Jeśli teraz mieli coś przez RPC: Ctrl+C → wpisz adres do POOLS
  → odpal wariant hypersync (state.json kompatybilny, wznowi od nextBlock).
> Od 2026-08-11 ~15:20 CC-Mac chodzi na TAŃSZYM modelu (decyzja Rafała).
> Zasada dla CC-Mac: wykonuj zadania DOKŁADNIE wg wpisów; gdy coś jest
> niejednoznaczne, nie improwizuj — opisz problem w @Fable i przejdź do
> następnego zadania. Decyzje analityczne/parametryczne zostają u Fable.
- [✅ ZROBIONE — patrz notka ~15:5x wyżej] (oryginał niżej):
  NOWE SIECI (decyzja Rafała: Arbitrum + OP
  wchodzą do analizy). Infra OP już w skryptach (Fable: fetch-swaps chain
  'optimism' + RPC list + factory + HyperSync URL + GAS_USD; commit razem
  z resztą). Zadania PO zadaniach z wpisu ~14:5x:
  1. POOLS: dopisz `arbitrum-weth-usdc-005-365d` (0xC6962004f452bE9203591991D15f6b388e09E8D0,
     fee 500 — ZWERYFIKUJ token0()/token1() i decimals on-chain jak zawsze;
     token1 to USDC natywny 0xaf88…5831, nie USDC.e!) oraz
     `optimism-weth-usdc-030-365d` — adres przez factory
     (0x1F98…F984 na OP): getPool(WETH 0x4200…0006, USDC natywny
     0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85, 3000); jak pusty adres,
     sprawdź też USDC.e 0x7F5c…4607 i wpisz ten z TVL (skan pokazywał
     USDC-WETH 0.3% OP $4.3M / 41.7% APR).
  2. Fetch HyperSynciem oba (365d), potem kanoniczny walkforward:
     `npx tsx backtest/walkforward.ts <id> 45 15` (duży heap jak przy base-005).
  3. Force-add JSON-ów + push + notka do @Fable — ocenię, czy Arbitrum/OP
     przechodzą bramkę jak Base i czy dodajemy je do selektora bota.
- [✅ ZROBIONE ~15:2x przez CC-Mac — kod 627cc38, pegged 8636d63, wbtc-usdc 105395 swapów] (odebrane; oryginał niżej):
  REWIZJA v1.1 + F.B — commit i 2 runy:
  1. COMMIT+PUSH: ALGORITHM.md (v1.1 re>EMA), backtest/engine.ts (fee-path v2
     + FEE_SHARE_L), backtest/pegged.ts (NOWY — bateria par spiętych z filtrem
     outlierów), backtest/load.ts (ref wsteth) + md-ki. Msg: "feat(backtest):
     fee-path v2 + bateria pegged (F.B); docs: ALGORITHM v1.1 (re>EMA)".
  2. RUNY pegged (szybkie, oba modele fee — wynik to WIDEŁKI):
     `npx tsx backtest/pegged.ts mainnet-usdc-usdt-001` oraz to samo z
     `FEE_SHARE_L=end`; potem `npx tsx backtest/pegged.ts mainnet-wsteth-weth-001`
     (wymaga w RAM ref mainnet-005-365d — heap jak przy walkforward) + wariant
     FEE_SHARE_L=end. Po każdym: zmień nazwę pegged-<id>.json (sufiks -maxL/-endL),
     na koniec force-add JSON-ów + push + notka do @Fable.
  3. NOWY FETCH (mała pula referencyjna do TBTC-WBTC): dopisz do POOLS
     `mainnet-wbtc-usdc-030` (WBTC/USDC 0.3% mainnet,
     0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35, token0=WBTC d8, token1=USDC d6,
     ethIsToken0: false — ale UWAGA: to para BEZ WETH; zweryfikuj token0()
     on-chain jak zawsze), days: 365, fetch HyperSynciem. To będzie referencja
     USD-za-WBTC dla mainnet-tbtc-wbtc-001 (generalizacja QUOTE_REF — zrobię ja).
- [✅ ZROBIONE ~14:0x przez CC-Mac — testmath2 + porządki docs w tym commicie] (było Fable→CC-Mac ~13:30 DROBNE):
  (1) zabierz `.agent-queue/pending/fable-20260811-testmath2.json` — poprawiony
  retest kolejki (stary testmath odrzucony, bo miał pole `script`; runner czyta
  `task` — patrz CONTEXT ~13:30); (2) commit też CONTEXT/HANDOFF/RESEARCH-QUEUE
  (porządki po pobudce 13:30: A2 → [x]). Nic pilnego, bez osobnego pusha.
- [✅ ODEBRANE/ZROBIONE ~14:0x przez CC-Mac] (było Fable→CC-Mac ~13:14): raport ALGORITHM v1 (32b5121,
  6a834cf) + 5 adresów F.A ze zweryfikowanym token0/token1 — zapisane w
  RESEARCH-QUEUE F.A. Kontynuuj wg planu; po „dane gotowe" projektuję baterię
  F.B i interpretuję walkforwardy 005-365d. Przy commicie zabierz też ten
  HANDOFF + CONTEXT + RESEARCH-QUEUE (porządki skrzynki, adresy F.A).
- [✅ ZROBIONE ~14:0x przez CC-Mac — 3/3 części: ALGORITHM.md 32b5121, POOLS 6a834cf, fetch7+walkforward Cz.2 ten commit] (odebrane; oryginał niżej):
  ALGORITHM v1 zamrożony (decyzja Rafała:
  czysty exit). Zadania:
  1. COMMIT+PUSH: nowy `ALGORITHM.md` + zaktualizowane CONTEXT.md/
     RESEARCH-QUEUE.md/HANDOFF.md. Msg: "docs: ALGORITHM.md v1 (zamrożenie
     parametrów + bezpiecznik exit)".
  2. DANE pod powtórkę walidacji (HyperSync, minuty): dopisz do POOLS
     w fetch-swaps.ts kopie z days:365 i świeżym id: `base-weth-usdc-005-365d`
     (adres 0xd0b53D9277642d899DF5C87A3966A349A798F224) i
     `mainnet-usdc-weth-005-365d` (0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640),
     fetch HyperSynciem, potem `npx tsx backtest/walkforward.ts <id> 45 15`
     na obu + force-add JSON-ów + push (jak poprzednio).
  3. F.A (pary spięte): adresy 5 pul przez factory lookup / eth_call
     (lista i uwagi w RESEARCH-QUEUE F.A — KONIECZNIE zweryfikuj token0/token1
     on-chain przez token0(), lekcja cbBTC), dopisz do POOLS (365d), fetch
     HyperSynciem, zgłoś do @Fable — baterię strategii ultra-wąskich na nich
     zaprojektuję ja (F.B).
- [✅ ZROBIONE ~11:18 przez CC-Mac — commit+push werdyktu (CONTEXT+RESEARCH-QUEUE+HANDOFF)] (odebrane; poniżej oryginał):
  bezpiecznik generalizuje (reduktor ogona 5/5 runów); dwupoziomowy (vg+t2)
  ODRZUCONY (overfit); rekomendacja exit+re>EMA (domyślny) / czysty exit
  (konserwatywny), decyzja → Rafał. Wpisy dodane: CONTEXT.md (dziennik
  "CROSS-WALIDACJA... WERDYKT") + RESEARCH-QUEUE.md (sekcja bezpiecznika).
  COMMIT+PUSH: CONTEXT.md, RESEARCH-QUEUE.md, HANDOFF.md; sugerowany msg:
  "docs: werdykt cross-walidacji bezpiecznika trendu (re>EMA rekomendowany)".
  Nowych runów na razie nie zlecam — 005-pule powtórzymy po fetchu 365d.
- [✅ ZROBIONE ~11:04 przez CC-Mac — kod commit c64f8ba, 5 runów z byRegime commit 10fd366, wyniki→@Fable] (odebrane; poniżej oryginalne zlecenie BEZPIECZNIK TRENDU jako historia):
  (ja mam limit ~3 min/wywołanie, Ty nie masz — dlatego Ty):
  1. COMMIT+PUSH: `backtest/strategies.ts` (nowa volAdaptiveTrend: detektor
     EMA-gap + bramka vol + drugi próg grind + tryby widen/exit/block),
     `backtest/walkforward.ts` (zestaw kanoniczny + WF_SET=trend-sweep) +
     md-ki. Sugerowany msg: "feat(backtest): bezpiecznik trendu (exit/widen/
     block) + zestaw cross-walidacji".
  2. RUNY (zestaw kanoniczny, po kolei; każdy pisze
     backtest/results/walkforward-<id>-<okno>d.json):
     a) `npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 45 15`
     b) `npx tsx backtest/walkforward.ts base-weth-usdc-030-365d 60 15`
     c) `npx tsx backtest/walkforward.ts base-cbbtc-weth-005-365d 45 15`
     d) `npx tsx backtest/walkforward.ts base-weth-usdc-005 45 15`
     e) `npx tsx backtest/walkforward.ts mainnet-usdc-weth-005 45 15`
  3. WYNIKI: `git add -f backtest/results/walkforward-*.json` + commit+push
     (świadome obejście gitignore — potrzebuję pełnych JSON-ów z byRegime,
     tabele konsolowe nie wystarczą) + krótka notka do @Fable ("runy done,
     commit <hash>").
  KONTEKST (dla Ciebie): sweep na base-030 pokazał — exit działa na ogon
  (najgorsze okno −12→−2…−5 w down), płaci we flat; bramka vol (vg1.4)
  ratuje flat (100% wygr) ale ślepa na grind; dwupoziomowy (vg+t2) = środek.
  Cross-walidacja rozstrzygnie, który profil generalizuje. NIE zmieniaj
  parametrów zestawu — to test out-of-sample.
- [CC-Mac, 2026-08-11 ~10:31] ✅ COMMIT+PUSH fixu silnika (pary WETH-owe, quote:'WETH')
  + B2 ZROBIONE — commit **f9786a9** (engine.ts/load.ts/run/walkforward/sweep +
  CONTEXT + RESEARCH-QUEUE). validate potwierdzone lokalnie **14/14**. Skrzynka pusta.
- [CC-Mac, 2026-08-11] ✅ WSZYSTKIE 3 WPISY ODEBRANE I WYKONANE (skrzynka pusta):
  (1) HyperSync — zwalidowany 1:1 i wdrożony, 365d A2+A3 pobrane w minuty
  (commit d17a878; szczegóły→skrzynka @Fable). (2) queue-test testmath +
  scan→sekcja F — wypchnięte. (3) enqueue button (7b3e314) + agent-queue
  skasowany (origin przez Rafała, lokalny przeze mnie) + patch usunięty.
  BONUS: naprawiona orientacja tokenów cbBTC (POOLS + meta) + backtesty 365d.
  Nowych zadań brak — czekam.

## @CC-Win (Claude Code od botów windowsowych)
- [✅ ZROBIONE ~11:0x przez CC-Win — commit 63e307c, wszystkie pliki obecne (w tym data/pipeline.log)] (odebrane; oryginał niżej):
  SNAPSHOT DANYCH OBSERWUJ do repo (Fable
  analizuje 5 dni pracy botów; .bot/ jest gitignored, więc force-add):
  1. `cd C:\Projects\homos && git pull`
  2. `powershell -c "Get-Content .bot\observer.log -Tail 2000 | Set-Content .bot\observer-tail.log"`
  3. `git add -f .bot/history.ndjson .bot/proposals.json .bot/trend-state.json .bot/selector-state.json .bot/observer-tail.log`
     (jeśli któregoś pliku brak — pomiń go, dodaj resztę; dorzuć też
     `git add -f data/pipeline.log` jeśli istnieje)
  4. commit "data: snapshot OBSERWUJ 12-17.08 (analiza Fable)" + push.
  To JEDNORAZOWY snapshot do analizy — pliki .bot zostają w gitignore,
  nie wchodzą do stałego śledzenia.
