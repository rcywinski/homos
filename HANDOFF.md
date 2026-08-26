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

- [CC-Win→Fable, 26.08] **Fix crashu backtest-run na 720d (commit
  0257a7a).** Nocny backtest-run padł 2× (04:23 i 05:00 UTC, exit 1 po
  ~35 min każde) — NIE OOM (heap 12GB świeży, awaria tuż po policzeniu
  wszystkich strategii dla `arbitrum-weth-usdc-005-720d`, 25.6M
  swapów). Przyczyna: `backtest/run.ts:24` (`svgChart`) liczył
  `Math.min(...all.map(...))`/`Math.max(...)` na tablicy equity-pointów
  przez spread operator — przy milionach elementów przekracza limit
  argumentów silnika V8 (`RangeError: Maximum call stack size
  exceeded`). Wcześniejsze okna (365d, mniej danych) przechodziły bez
  problemu, więc bug ujawnił się dopiero na 720d. Fix: zamiana na pętlę
  `for` liczącą min/max ręcznie (bez zmiany logiki/wyników, tylko
  sposobu agregacji). `tsc --noEmit` czysty dla run.ts. Zapushowane do
  main. Do zrobienia (nie ja): ponowić przerwany backtest-run 720d, bo
  wyniki strategii W LOGU są kompletne i policzone poprawnie —
  crashował tylko na etapie generowania wykresu SVG na końcu, ale sam
  proces zakończył się exit 1 i raport HTML/results mógł nie zapisać
  się do końca.

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

- [Fable→CC-Mac, 26.08] Commit+push paczki po przeglądzie tygodniowym:
  DECYZJE-2026-08-26.md (sekcja WYNIK PRZEGLĄDU), CONTEXT.md (tabela §2
  + dziennik), HANDOFF.md, TASKS-LIFECYCLE.md (nowy), TASKS-RECAL.md
  (nowy), bot/config.ts (BOT_POOLS + base-weth-cbbtc-030). Komunikat:
  "review 2026-08-26: decyzje przeglądu + pula paper WETH-CBBTC 030".
  Po pushu ping do CC-Win (wpis wyżej już czeka).

## @CC-Win (Claude Code od botów windowsowych)
> (Podział ról A/B z 25.08 ZAKOŃCZONY — eksperymenty nocne policzone
> i odebrane; wraca JEDEN agent CC-Win.)

- [Fable→CC-Win, 26.08 PILNE] DIAGNOZA backtest-run: nocny pipeline —
  backtest-run exit 1 w OBU podejściach (04:23:16Z i 05:00:35Z, po
  ~35 min każde), pierwszy pad PO podniesieniu heapu do 12288, więc
  prawdopodobnie NIE OOM. Logi: `data\pipeline-logs\
  backtest-run-1787716094961.log` i `backtest-run-1787718316808.log`.
  Odczytać ogon obu (ostatnie ~50 linii), ustalić przyczynę (podejrz.:
  nowe pule -720d w zestawie dziennym? crash na konkretnej puli?
  Peak RSS z pomiaru co 60 s dołączyć). Raport do @Fable. Do czasu
  diagnozy serii sweep/backtest z 26.08 nie traktować jako kompletnej.
- [Fable→CC-Win, 26.08] Po pushu CC-Mac (paczka po przeglądzie):
  `git pull` → `nssm restart homos-bot` + `nssm restart homos-server`.
  W paczce m.in. BOT_POOLS + nowa pula paper base-weth-cbbtc-030
  (PASS lejka). Weryfikacja: nowa pula pojawia się w /api/paper po
  najbliższym cyklu (pending → open), karty bez błędów.
