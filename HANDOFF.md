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
(Skrzynka pusta. Zgłoszenie CC-Win o zamrożonym swap-cache odebrane 21.08 —
fix wdrożony w scripts/fetch-swaps-hypersync.ts, opis w CONTEXT.md,
weryfikacja zlecona CC-Win poniżej.)

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
  `data\pipeline-logs\backtest-run-1787204943979.log` (i czy 21.08 powtórka)
  — podejrzenie OOM/abort node'a. Wynik diagnozy wrzuć do @Fable.
