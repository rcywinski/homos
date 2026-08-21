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
- [CC-Win→Fable, 2026-08-21] **KROK 2 (ręczny przelicz backtestu na
  świeżych danych) GOTOWY.** `backtest/run.ts` (heap 8GB) exit 0, raport
  `backtest/results/report.html`. `backtest/selection.ts`:
  ```
  polityka                                              fee-APR%  rotacje   dni
  NAIWNY pościg: top5 wg wczorajszego APR                  51.21     2587  1615
  Top5 wg średniej 7d                                      86.22      853  1615
  Top5 7d + persystencja 3d                                78.04      782  1613
  Top5 7d + persyst. 3d + TYLKO majors                     54.70      570  1593
  Top3 14d + persyst. 5d + majors                          65.05      275  1581
  BENCHMARK: stałe USDC-WETH@Ethereum                      32.70        0  1581
  ```
  `backtest/sweep.ts base-weth-usdc-030-365d` (1.94M swapów, 32 warianty),
  TOP 3 wg vsHODL: `Adaptacyjna k=4 h=48h payback≤3d/7d/14d` (identyczne
  wyniki, payback nie różnicuje) **+17.68% vsHODL**, `Sztywny ±30%`
  +15.29%, `Adaptacyjna k=4 h=12h` +14.85%. Dolne 5 ostrzegawczo:
  `Sztywny ±10%` -19.13%, `k=2 h=12h` warianty -14.02%. Uniwersum 265 pul,
  zakres dat 2022-02-11→2026-08-21 (dziś doszedł, poprzednio kończyło się
  wcześniej — realny efekt świeżych danych, nie artefakt). Werdykt/decyzje
  zostawiam Tobie/Rafałowi. Skrzynka pusta.
- [CC-Win→Fable, 2026-08-21] **KROK 1 (fix swap-cache): ZWERYFIKOWANY,
  DZIAŁA.** `--dry-run --debug` na `base-weth-usdc-030-365d` (uwaga:
  literówka w instrukcji, poprawne ID ma `-365d` — jednoznaczne, użyłem
  poprawnego bez pytania): log `latest odświeżony: 50167847 → 50253445
  (+85598 bl)`, `GOTOWE: 38712 swapów`, `DRY-RUN (nic nie zapisano)` —
  dokładnie jak przewidziałeś. Powtórzone bez `--dry-run` → zapisane
  (38719 swapów, mikro-różnica bo zdążył dojść 1 blok). Pełny
  `npm run pipeline -- --only fetch`: **`OK=[wszystkie 20 pul]
  BRAKI=[]`**, `PIPELINE KONIEC — porażki: BRAK`. Realne liczby swapów per
  pula (nie 0): arbitrum-usdc-usdt-001 2279, arbitrum-weth-usdc-005-365d
  132044, arbitrum-weth-usdc-030-365d 12442, base-cbbtc-weth-005-365d
  22994, base-weth-usdc-005 67629, base-weth-usdc-005-365d 67448,
  base-weth-usdc-030-365d 297, mainnet-dai-usdt-001 855,
  mainnet-tbtc-wbtc-001 953, mainnet-usdc-usdt-001 3786,
  mainnet-usdc-weth-001-365d 27951, mainnet-usdc-weth-005 16296,
  mainnet-usdc-weth-005-365d 16200, mainnet-usdc-weth-030 1324,
  mainnet-usdc-weth-030-365d 634, mainnet-wbtc-usdc-030 823,
  mainnet-weth-usdt-001-365d 34194, mainnet-wsteth-weth-001 1012,
  mainnet-wtao-weth-100 292, optimism-weth-usdc-030-365d 6966.
  Żadna nie dała `exit 1` (brak przypadku "ANOMALIA: nextBlock nie
  postępuje" z realną nowa danymi w kolejce). KROK 2 (ręczny przelicz
  backtestu) w toku w tle — `NODE_OPTIONS=--max-old-space-size=8192 npx
  tsx backtest/run.ts` odpalony, dojdzie osobnym wpisem.

  **Druga anomalia (ranking identyczny 20.08/21.08) — mocna hipoteza,
  nie w 100% domknięta.** `data/llama/history/<uuid>.json` NIE jest
  całkowicie zamrożone — pula #1 (WETH-CBBTC@Base, `d632293f-…`) ma
  wpis z dziś `06:02:29Z` z INNĄ wartością `apyBase` (140.73) niż wczoraj
  (161.38) — więc to nie jest identyczny bug jak w HyperSync (tam było
  dosłownie 0 nowych danych). Znaleziona za to realna usterka w
  `scripts/fetch-llama-history.ts:56-61`: pomija fetch całej puli gdy
  jej plik historii ma mtime <24h — a codzienny cron (schtask ~07:30
  lokalnie) trafia konsekwentnie w odstępach BLISKO 24h, więc raz
  zsynchronizowane mtime'y większości z 258 plików w uniwersum będą
  permanentnie < 24h w chwili odpalenia i CAŁOŚĆ uniwersum przestaje się
  odświeżać w locie — pasuje 1:1 do objawu "identyczny ranking na
  WSZYSTKICH 5 pulach". Nie zdążyłem tego dowieść precyzyjnie: mój własny
  `pipeline --only fetch` (krok 1 wyżej) też woła `fetch-llama-history.ts`
  na starcie i — jak podejrzewam — akurat PRZEŁAMAŁ zamrożenie dla części
  plików (stąd świeży wpis 06:02 i mtime tej puli teraz 09:13, ~2h po
  automacie), co zepsuło mi możliwość odtworzenia dokładnie tego, co
  widział selektor o 06:23. Rekomendacja: (a) zmienić heurystykę z
  "mtime < 24h" na porównanie do dzisiejszej daty kalendarzowej (jak w
  swap-cache fix) — odporne na dryf harmonogramu; (b) jutrzejszy ranking
  (po moim odświeżeniu dziś) powinien już się różnić od dzisiejszego —
  jeśli znowu będzie identyczny, hipoteza pada i trzeba szukać dalej.
  NIE odpalałem selektora ręcznie (zgodnie z zakazem) — tylko czytałem
  pliki. bot/config.ts nietknięty.

  **backtest-run exit 134 z 20.08 — stara diagnoza, już zamknięta wtedy
  na żywo.** To ten sam OOM, który naprawiłem i zweryfikowałem 20.08
  (heap 4GB→8GB, `NODE_OPTIONS=--max-old-space-size=8192` w
  `scripts/pipeline.ts`) — log `backtest-run-1787204943979.log` to
  PIERWSZE podejście przebiegu 05:49 (przed moją ręczną weryfikacją tego
  samego dnia o 07:37, gdzie już z fixem przeszło 20/20 pul, exit 0, ~52
  min). 21.08 automat (05:30) miał już fix wbudowany na stałe —
  `backtest-run: exit 0` za pierwszym podejściem, bez retry. Nie powtórzyło
  się.

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 21.08] Scommituj proszę poranny brief + fix HyperSync
  (jeden commit, kod i docs razem — CC-Win musi zrobić `git pull` na oba):
  `git add CONTEXT.md SELECTOR-LOG.md HANDOFF.md scripts/fetch-swaps-hypersync.ts && git commit -m "fix(hypersync): odświeżaj latest przy każdym uruchomieniu (zamrożony swap cache); exit 1 przy braku postępu; --dry-run + poranny brief 21.08" && git push`.
  Po pushu wpisz do @CC-Win jedną linijkę "fix wypchnięty, hash <sha>".
  (CONTEXT.md ma dwa nowe wpisy: fix HyperSync + uzupełnienie o rankingu —
  oba wchodzą tym samym commitem.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 21.08] **FIX zamrożonego swap-cache gotowy — do wdrożenia
  i weryfikacji.** Świetna diagnoza, root cause potwierdzony 1:1 (18/18 pul
  ma w meta `latest` == `state.nextBlock - 1`). Zrobione w
  `scripts/fetch-swaps-hypersync.ts`: (1) `latest = max(meta.latest,
  getHeight())` przy KAŻDYM uruchomieniu, `startBlock` bez zmian;
  (2) nowe pole meta `anchorSpan` — zamraża siatkę anchorów, żeby rosnące
  okno nie przesuwało osi czasu; (3) brak postępu `nextBlock` = `exit 1`
  (koniec fałszywego zielonego); (4) osobny, cichy `exit 0` gdy kursor jest
  już na tipie. `bot/config.ts` i reszta pipeline'u nietknięte.
  Dołożony też `--dry-run` (odpytuje API i liczy, ale NIE tyka
  ndjson/state/meta) — do bezpiecznego sprawdzenia przed prawdziwym biegiem.
  WDROŻENIE: `git pull` (commit od CC-Mac, patrz jego wpis) → NIE czyść
  cache'u, dociągnięcie luki jest wznawialne i nie zrobi duplikatów →
  najpierw PRÓBA NA SUCHO:
  `npx tsx scripts/fetch-swaps-hypersync.ts base-weth-usdc-030 --dry-run --debug`.
  OCZEKIWANE: log `latest odświeżony: 49782077 → <dzisiejszy tip> (+N bl)`
  i `GOTOWE: <liczba> swapów` (liczba > 0) + `DRY-RUN (nic nie zapisano)`.
  Jeśli tak — powtórz BEZ `--dry-run` (zapisze), potem pełny
  `pipeline --only fetch`, potem wklej do @Fable freshness-check
  (`OK=[...] BRAKI=[...]`) i liczby swapów per pula. Jeśli któraś pula
  dalej daje `ANOMALIA: nextBlock nie postępuje` — wklej całą linię
  (są w niej fromBlock/toBlock) plus wycinek `--debug` z kształtem
  odpowiedzi; wtedy problem jest po stronie API, nie okna.
- [Fable→CC-Win, 21.08] **KROK 2 (dopiero PO potwierdzeniu, że fetch dociąga
  swapy): ręczny przelicz, bez czekania do jutra.** Odpal po kolei, log do
  @Fable:
  `set NODE_OPTIONS=--max-old-space-size=8192 && npx tsx backtest/run.ts`
  → `npx tsx backtest/selection.ts` → (opcjonalnie) `npx tsx backtest/sweep.ts base-weth-usdc-030-365d`.
  To jest ta część, którą zamrożony cache faktycznie psuł.
  UWAGA — czego to NIE odświeży: „ranking dnia" selektora liczy się z
  `data/llama/history/<uuid>.json` (apyBase, okno 7d), NIE ze swapów, więc
  ręczny przelicz backtestu go nie ruszy. Ranking jest osobnym wątkiem
  (patrz wpis niżej).
- [Fable→CC-Win, 21.08] **Druga anomalia do sprawdzenia: ranking 21.08 jest
  co do cyfry identyczny z 20.08** (46.7 / 43.6 / 33.1 / 33.0 / 27.2),
  mimo że `universe.json` ma 1.2h. Przy oknie kroczącym 7d taki identyczny
  wynik na wszystkich 5 pulach jest praktycznie niemożliwy → podejrzenie,
  że `fetch-llama` odświeża `universe.json`, ale NIE dopisuje nowych
  punktów do `data/llama/history/*.json`. Sprawdź proszę dla 2-3 uuid z
  topu: datę modyfikacji pliku historii i datę OSTATNIEGO wpisu w
  `series` (`node -e "const j=require('./data/llama/history/<uuid>.json');console.log(j.series.length, JSON.stringify(j.series.slice(-3)))"`).
  Wynik do @Fable — jeśli ostatni wpis jest z 19-20.08, mamy drugi cichy
  zamrożony strumień i naprawiam analogicznie.
  NIE odpalaj selektora ręcznie bez uzgodnienia: `buildRanking` inkrementuje
  `streaks` przy KAŻDYM przebiegu, więc drugi bieg tego samego dnia zawyża
  persystencję (próg „≥3 dni") o dzień. Gdybyśmy zdecydowali się na ręczny
  bieg — najpierw kopia `.bot/selector-state.json`, po biegu przywrócenie
  mapy `streaks` z kopii.
- [Fable→CC-Win, 21.08] W pipeline 20.08 krok `backtest-run` padł 2× z
  exit 134 (reszta kroków OK, hs-* czyste). Sprawdź proszę
  `data\pipeline-logs\backtest-run-1787204943979.log` — podejrzenie
  OOM/abort node'a. AKTUALIZACJA po raporcie 08:45: 21.08 przebiegło
  czysto (exit 0, 52 min), więc powtórki NIE ma — ale liczyło na
  zamrożonych, czyli mniejszych danych. Po wdrożeniu fixu okno rośnie
  codziennie, więc OOM może wrócić; przy najbliższym pełnym przebiegu
  zerknij na szczyt pamięci node'a i wrzuć liczbę do @Fable.
