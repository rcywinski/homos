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

- [Fable→CC-Mac, 26.08 ~11:xx, rozszerzona ~13:xx — PACZKA #2]
  NAJPIERW `git pull` (na origin jest raport recal CC-Win — przy
  konflikcie HANDOFF zachować OBIE strony: raport CC-Win i wpisy
  Fable). Potem commit+push: bot/server.ts (filtr widoku /api/state
  o kolejkę komend — fix "odrzucone wracają po odświeżeniu"),
  src/hooks/useBotApi.ts (persist odrzuceń w localStorage TTL 15 min),
  backtest/engine.ts (clamp ticków do MIN/MAX_TICK — fix crasha
  "Tick out of bounds: -887332" z przebiegu cand-base-weth-cbbtc-030-
  720d), backtest/fullperiod.ts (NOWY — symulacja pełnookresowa $5k),
  backtest/strategies.ts (NOWE: cash100, flatOnlyLP, opcje
  hysteresisShare/upConfirmSec w volAdaptiveTrend),
  backtest/walkforward.ts (NOWY zestaw WF_SET=next — smoke OK),
  TASKS-ROTATION.md (NOWY — spec backtestu dynamicznej rotacji),
  HANDOFF.md, CONTEXT.md, DECYZJE-2026-08-26.md. Komunikat:
  "fix: dismissed-view + tick clamp; feat: fullperiod, flat-only,
  share-hysteresis, upConfirm, rotation spec".

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

  **KROK 1b — dopisane ~11:xx (paczka #2, NIE przerywać biegnącego
  walkforwardu):** między przebiegami serii: `git pull` →
  `nssm restart homos-server` (fix "odrzucone wracają po odświeżeniu" —
  zmiana tylko w server.ts, restart servera wystarczy; rebuild bundla
  może poczekać do wieczora, zmiana w useBotApi to pas-i-szelki).
  RAZEM z tym: sprawdź w observer.log, czy po dzisiejszych klikach
  Rafała (~10:4x–11:0x) są linie "proposal …: odrzucona (komenda z
  UI)". SĄ → konsument działa, temat zamknięty. NIE MA → realny bug
  backendu: przyślij do @Fable ogon observer.log (ostatnie 100 linii),
  zawartość .bot/proposal-commands.ndjson (czy rośnie) i status/uptime
  homos-bot — czy pull z krokiem 0 na pewno objął fix dual-writer
  i czy usługa faktycznie zrestartowana z nowym kodem.

  **KROK 2 — po całej serii (albo wieczorem):** ponowić dzienny
  `npm run pipeline -- --only backtest` (weryfikacja fixu 0257a7a tego
  samego dnia; nocne results/HTML mogły się nie zapisać). Odnotować
  Peak RSS i czas. Recal ma pierwszeństwo — to idzie na końcu.

- [Fable→CC-Win, 26.08 ~13:xx — po paczce #2] SERIA RECAL ODEBRANA
  (podsumowanie u Rafała; niezależna weryfikacja JSON-ów u Fable po
  syncu repo na Macu). Crash "Tick out of bounds: -887332" NAPRAWIONY
  w engine.ts (clamp zakresów pozycji i pasma fee do MIN/MAX_TICK —
  anomalne ticki z początku życia puli; v3math celowo dalej rzuca,
  granice pilnuje engine). Po pullu paczki #2 DOLICZYĆ brakujący
  przebieg: `WF_SET=recal SIGMA_MODE=grid15
  NODE_OPTIONS=--max-old-space-size=12288 npx tsx
  backtest/walkforward.ts cand-base-weth-cbbtc-030-720d 30 15`
  (cache 720d już na dysku) + raport z recent90 jak przy pozostałych.

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
