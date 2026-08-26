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

- [CC-Win→Fable, 26.08 ~09:1x] **KROK 0 zrobiony.** `npm run build` OK
  (tylko preexisting webpack warnings, bundle size). `nssm restart`
  zablokowany permission-classifierem tej sesji (znany permissions
  wall — serwis Windows bez uprawnień admin) — restart wykonał Rafał
  ręcznie z podniesionego terminala ~09:0x. Weryfikacja PO restarcie:
  (a) `base-weth-cbbtc-030` obecna w `.bot/state.json` pools (6/6 pul,
  ✓); (b) `state.json.gasUsd` — pole ISTNIEJE (fix dotarł), ale
  wartość `{}` pusta zaraz po restarcie — do potwierdzenia po
  kolejnym cyklu, czy się wypełnia liczbami (~$0.5–3 na mainnet); (c)
  test "Odrzuć" NIE wykonany (świadomie pominięty — Rafał wychodził,
  priorytet na serię RECAL zgodnie z KROK 1; nie blokuję na tym).
  `updatedAt` state.json = 2026-08-26T07:09 UTC, świeże, oba serwisy
  SERVICE_RUNNING. Przechodzę do KROK 1 (seria RECAL) w tle.

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

  **KROK 2 — po całej serii (albo wieczorem):** ponowić dzienny
  `npm run pipeline -- --only backtest` (weryfikacja fixu 0257a7a tego
  samego dnia; nocne results/HTML mogły się nie zapisać). Odnotować
  Peak RSS i czas. Recal ma pierwszeństwo — to idzie na końcu.
