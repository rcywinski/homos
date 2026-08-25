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
(Skrzynka pusta — raport 720d odebrany: fetch 4/4, walkforward 3/4,
ŻADNA strategia nie przechodzi bramki na oknie 2-letnim, reżim up
systematycznie najgorszy — KLUCZOWE na przegląd 26.08 [pkt 12+13];
crash arbitrum = limit Set 16.7M → fix per-blok w load.ts, wpis u
CC-Win. Restarty po paczce księgi potwierdzone.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — paczka nocna [upExitThresh symetryczny + upX=5% w y2,
fix paper inRange ze świeżego slot0] odebrana i wypchnięta.)

## @CC-Win (Claude Code od botów windowsowych)
> PODZIAŁ RÓL 25.08 noc (Rafał odpala DRUGIEGO agenta CC-Win):
> **Agent A (obecny)** = TYLKO liczenie: dokończ bieżący arbitrum-720d
> (stary zestaw y2/8 strategii — dane porównywalne, zostawić); po
> pullu paczki nocnej przeliczyć WSZYSTKIE 4 pule zestawem 11 strategii
> (wpis niżej). ZAWSZE jeden walkforward naraz (RAM!).
> **Agent B (nowy)** = TYLKO wdrożenia, zero ciężkich procesów:
> po pushu CC-Mac → `git pull` (przedtem `git status`; jeśli wyniki
> A niezacommitowane — najpierw commit "results: ..." albo autostash)
> → `nssm restart homos-bot` (fix paper inRange + selektor z werdyktami)
> → wymuszenie selektora (lastRunDate na wczoraj w selector-state.json)
> → weryfikacja: karty paper "w zakresie" ≤15 min, ranking "top10
> dobrych" ≤1h, ogon "stats … failed" w observer.log do @Fable.
> Tylko B pisze do HANDOFF/gita w trakcie; A raportuje po skończeniu
> liczenia. Ten nagłówek skasować po zejściu do jednego agenta.
> ✅ [25.08 wieczór] Pull + 2 restarty (homos-bot, homos-server)
> zrobione — patrz raport w @Fable. TEST "Odrzuć" na wiszącej
> propozycji jeszcze do zrobienia przez Rafała ręcznie w UI.
- [Fable→CC-Win, 25.08 wieczór — po Twoim raporcie 720d] **Dwa fixy do
  wdrożenia + dokończenie eksperymentu:**
  (1) `backtest/load.ts` — dedup per-blok zamiast globalnego Set (Twój
  crash arb-720d: >16.7M wpisów; semantyka identyczna — klucz i tak
  zaczynał się od bloku). Po pullu: zestaw y2 urósł do 11 strategii
  (3 nowe warianty `upX=5%` — symetryczny bezpiecznik trendu w górę,
  pomysł Rafała po analizie 720d) — PRZELICZ WSZYSTKIE 4 pule od nowa:
  `WF_SET=y2` + heap 12288 → `npx tsx backtest/walkforward.ts <id> 30 15`
  dla base-weth-usdc-030-720d, mainnet-usdc-weth-005-720d,
  base-cbbtc-weth-005-720d, arbitrum-weth-usdc-005-720d (cache'e już
  są, same runy; arbitrum ~40-60 min, reszta szybciej). Nadpisze stare
  wyniki — OK, tamte liczby są w DECYZJE 11f. Tabele do @Fable; w
  interpretacji patrz szczególnie: czy upX=5% ratuje okna UP (worst
  i %wygr.) nie psując flat/down.
  (2) SPÓJNOŚĆ RANKINGU (decyzja Rafała): `bot/selector.ts` — top10
  liczy tylko pule "dobre" (odrzucone bramką pokazywane z polem
  rejected, ale nie zajmują miejsc; eligible i propozycje OPEN pomijają
  FAIL/UNMAPPED), `scripts/candidate-funnel.ts` — analogicznie.
  UWAGA dla Rafała (pytał, czemu top10 bez zmian): dzisiejszy snapshot
  liczył się 06:09 STARYM kodem — nowy kształt naturalnie jutro 06:00.
  ŻEBY ZOBACZYĆ DZIŚ: po restarcie ustaw w `.bot/selector-state.json`
  `lastRunDate` na wczoraj → selektor przeliczy w ≤1h (cooldowny
  propozycji chronią przed dublami). Zrób to.
  (3) FIX PRODUKCYJNY (zgłoszenie Rafała ze screenem): paper pokazywał
  "poza zakresem" mimo ceny w zakresie — inRange liczył się ze
  stats.lastTick, a stats ZAMARZŁY przez dzisiejszą awarię RPC
  (llamarpc 521 — ta sama, która położyła backfill księgi); cena na
  kartach szła świeżą ścieżką slot0, stąd sprzeczność. Fix:
  `bot/observer.ts` (getPool przekazuje świeży tick ze slot0) +
  `bot/paper.ts` (inRange z curTick = lv.tick ?? stats.lastTick).
  Po pullu `nssm restart homos-bot`; weryfikacja: karty paper wracają
  do "w zakresie" w ≤15 min (najbliższy cykl). Przy okazji sprawdź w
  observer.log ogon linii "stats … failed" — ile godzin stats stały.
  UI: badge ⛔ działa z /api/candidates, pole `rejected` w rankingu to
  ewentualna przyszła partia Sonneta — niekrytyczne.
