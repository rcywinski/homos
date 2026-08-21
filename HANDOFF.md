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
(Brief 21.08 07:5x: raport morning-2026-08-20.md przetworzony, ranking
20.08 zalogowany w SELECTOR-LOG, szczegóły w CONTEXT.md.)
- [CC-Win→Fable, 2026-08-21] **KRYTYCZNE: fetch-swaps-hypersync.ts ma bug —
  swap cache zamarzł na zawsze po pierwszym dogonieniu, pipeline zgłasza
  fałszywy zielony status.** Dzisiejszy przebieg 07:30: `PIPELINE KONIEC —
  porażki: BRAK`, ALE freshness-check pokazał `OK=[tylko 2 pule]
  BRAKI=[pozostałe 16]`. Sprawdziłem logi wszystkich 18 kroków `hs-*` —
  **100% z nich** ma identyczny wzorzec: `nextBlock nie postępuje —
  przerwane`, `GOTOWE: 0 swapów`, mimo `exit 0`.
  Root cause w `scripts/fetch-swaps-hypersync.ts:146`: zapytanie do
  HyperSync ma `toBlock: latest + 1`, gdzie `latest` jest odczytywane z
  `meta.json` TYLKO raz — przy pierwszym uruchomieniu tej puli (linia 121:
  `if (meta istnieje) { ...latest z meta... } else { latest =
  await client.getHeight() }`). Gdy kursor (`state.json.nextBlock`) dogoni
  tę zamrożoną wartość `latest` (co stało się wczoraj 20.08 dla wszystkich
  pul podczas mojej weryfikacji heap-fixu — każda dogoniła swój ówczesny
  chain tip), zakres zapytania `[fromBlock, toBlock)` staje się PUSTY na
  zawsze → HyperSync zwraca `nextBlock == fromBlock` → skrypt myli to z
  "przerwane, wznów" zamiast "faktycznie na bieżąco, dociągnij nowy
  latest". Efekt: **żadna pula nigdy więcej nie pobierze nowych swapów**,
  a pipeline codziennie będzie zgłaszał sukces. Backtest/selector/sweep
  będą po cichu liczyć na coraz starszych, zamrożonych danych (obecnie:
  stan na wczoraj ok. 07:30-08:00 UTC).
  NIE naprawiałem sam (poza zakresem CC-Win — kod w `scripts/`, decyzja
  jak refetchować `latest` należy do Ciebie/Rafała: albo re-`getHeight()`
  przy KAŻDYM uruchomieniu niezależnie od istnienia meta, albo osobna
  heurystyka "czy jesteśmy na końcu okna i trzeba przesunąć latest").
  bot/config.ts nietknięty. Czekam na fix + instrukcję wdrożenia.
(Zamknięte 20.08: hotfix hooks-order crash wdrożony i P11/GMX hedge
odebrana — oba potwierdzone przez CC-Win, bez dalszych działań.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 21.08] Scommituj proszę poranny brief:
  `git add CONTEXT.md SELECTOR-LOG.md HANDOFF.md && git commit -m "docs: poranny brief 21.08 (ranking 20.08 do SELECTOR-LOG, anomalia backtest-run)" && git push`.

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 21.08] W pipeline 20.08 krok `backtest-run` padł 2× z
  exit 134 (reszta kroków OK, hs-* czyste). Sprawdź proszę
  `data\pipeline-logs\backtest-run-1787204943979.log` (i czy 21.08 powtórka)
  — podejrzenie OOM/abort node'a. Wynik diagnozy wrzuć do @Fable.
