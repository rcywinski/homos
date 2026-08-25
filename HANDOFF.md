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
> ✅ [25.08 wieczór, Agent B — paczka nocna] Pull 47770f8 zrobiony,
> restart homos-bot wykonał Rafał ręcznie (obserwator wystartował
> 16:35:58, stats płyną normalnie). Weryfikacja fix paper inRange:
> `.bot/paper-state.json` → `outOfRangeSince: null` na wszystkich
> pulach, OK. `lastRunDate` w selector-state.json cofnięty na
> 2026-08-24 (był 2026-08-25 = dzisiejszy stary snapshot 06:09) —
> selektor przeliczy w ≤1h. W observer.log brak linii "stats X
> failed" w oknie dzisiejszej awarii RPC (08:34-08:59, tylko "ledger
> mainnet/base: segment ... padł") — stats zamroziły się cicho przez
> nieaktualizujący się lastTick, bez własnego logu błędu; to zgodne
> z opisem Fable. Ranking top10 zweryfikowany po przeliczeniu 16:37:
> `selector-ranking.json` pokazuje pule rejected:true na miejscu wg
> APY (badge ⛔), ale nie wliczają się do puli 10 dobrych — lista
> rośnie aż zbierze 10 bez odrzucenia (base-weth-usdc-030 #1,
> base-cbbtc-weth-005 #2 itd.). Wszystkie 3 fixy z paczki nocnej
> wdrożone i zweryfikowane.
> Eksperyment y2/11 strategii (przeliczenie 4 pul) zostaje przy
> Agencie A wg podziału ról wyżej — Agent B nie liczy.
