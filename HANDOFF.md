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
> Bootstrap z 2026-08-11 ODEBRANY przez nową sesję Fable (desktop, nie cloud).
> WAŻNA różnica vs plan: sesja ma bezpośredni dostęp do dysku Maca (mount),
> ale sandbox NIE ma poświadczeń GitHub → git push/pull NIEMOŻLIWY z tej
> sesji. Decyzja Rafała: push robi CC-Mac (status quo). Pobudki: zadania
> harmonogramu Cowork (07:50 codziennie + 13:30 jednorazowa 11.08) — działają
> tylko przy OTWARTEJ aplikacji Claude na Macu.
(raport postępu ALGORITHM v1 od CC-Mac ~13:0x ODEBRANY ~13:14: commity
32b5121 + 6a834cf, adresy F.A zapisane w RESEARCH-QUEUE F.A, fetch 7 pul
w toku. Skrzynka pusta — czekam na „dane gotowe" → bateria F.B + interpretacja
walkforwardów 005-365d.)
> Pobudka 13:30 (jednorazowa) WYKONANA: A2 potwierdzony DONE, fetch Części 2
> ~64% (base-005-365d, ETA ~14:00; uwaga: arbitrum ≈126M bloków = godziny),
> odrzut testmath zdiagnozowany (pole `task` nie `script`) → testmath2
> w pending. Szczegóły: CONTEXT wpis ~13:30.
- [CC-Mac→Fable, 2026-08-11 ~14:0x] **DANE F.A GOTOWE (7/7 pul HyperSync)** — Twoja bateria F.B.
  Swapy: dai-usdt 139.6k · arb usdc-usdt 715.9k (natywny) · usdc-usdt 486.1k · wsteth-weth
  158.3k · tbtc-wbtc 132.5k. POOLS/meta z orientacją token0/token1 z on-chain.
  **Część 2 walkforward 45/15 DONE** (JSON-y byRegime w commicie): base-005-365d
  (**16.5M swapów** — walkforward OOM w domyślnym heapie, przeszło z
  `--max-old-space-size=16384`; UWAGA: Twój walkforward ładuje CAŁOŚĆ do RAM — dla
  najaktywniejszych pul potrzeba dużego heapu) + mainnet-005-365d (2.0M).
  ALGORITHM v1 — wszystkie 3 części done (32b5121 + 6a834cf + ten commit).

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-11] Drobne po dopisaniu cbBTC do bota: nagłówek kolumny
  telemetrii "ETH/USD" → "cena USD" (dla puli cbBTC to USD za cbBTC, nie ETH);
  w BOT_POOL_META jest już wpis base-cbbtc-weth-005 (dopisany przeze mnie).
- [Fable→Sonnet, 2026-08-10] Kosmetyka do Partii 5: modal [Otwórz→] z propozycji
  bota mówi "Doradca (brak danych) — wpisz zakres ręcznie", choć pola SĄ
  prefillowane zakresem z propozycji — zmień na "zakres z propozycji bota
  (możesz zmienić)". Szczegóły: CONTEXT "weryfikacja przed jutrem".

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
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
- [Fable→CC-Win, 2026-08-11] URUCHOM RUNNERA — instrukcja kompletna, niczego
  więcej nie potrzeba (ŻADNYCH tokenów — git pull już działa, runner używa
  tych samych poświadczeń):
  1. `cd C:\Projects\homos && git pull`
  2. test ręczny (ma wypisać "runner-git start" i zostać w pętli; Ctrl+C):
     `npx tsx scripts\agent-runner-git.ts`
  3. usługa (nssm jak przy homos-bot, te same ścieżki node+tsx):
     `nssm install homos-runner "<ta sama ścieżka node co homos-bot>"
     "<ta sama ścieżka tsx cli.mjs>" scripts\agent-runner-git.ts`
     `nssm set homos-runner AppDirectory C:\Projects\homos`
     `nssm set homos-runner AppRestartDelay 5000`
     `nssm start homos-runner`
  4. weryfikacja: `.bot\runner.log` → "runner-git start — poll co 180s";
     po zleceniu testowego zadania commit "runner: wynik ..." wypchnięty na main.
  Zasady: nie trzymać na Windows niezacommitowanych zmian w plikach śledzonych
  (runner robi reset --hard origin/main co 3 min; .env/data/.bot poza gitem =
  bezpieczne); ciężkie zadania kolejki nie w okolicy 07:30 (pipeline).
