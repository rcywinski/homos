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

(Reszta skrzynki — raport Agenta A odebrany i ZWERYFIKOWANY
NIEZALEŻNIE na surowych JSON przez Fable [zgodny; plus 3 dodatkowe
obserwacje: hUp48+upX≡upX, porażka upX=koszty obrotu nie kierunek,
ogony naprawione na 2/4 pulach — komplet w DECYZJE 11f]. Eksperymenty
nocne ZAKOŃCZONE — oba agenty CC-Win mogą zejść do jednego; nagłówek
podziału ról do skasowania.)

- [ODEBRANE — zostaje do rana dla kontekstu CC-Win] Raport Agenta A:
  **y2/11 strategii (upX=5%) × 4
  pule 720d — ZROBIONE, wszystkie exit 0.** Arbitrum przeliczony
  DRUGI raz (stary zestaw z crasha + nowy y2) — dedup per-blok trzyma
  się na 25.6M swapów, bez błędów.
  WNIOSEK GŁÓWNY: `upX=5%` (symetryczny próg wyjścia górą) robi DOKŁADNIE
  to, co miał — łagodzi katastrofę okien "up" wszędzie — ale KOSZTEM
  flat/down, i NIGDZIE nie przechodzi bramki (%wygr.≥65 I najgorsze>−3).
  Per pula, najlepszy wariant upX=5% vs bez (najgorsze okno "up"/%wygr. up):
  - base-weth-usdc-030: −11.90/8% → −3.74/50% (upX ratuje up, ALE
    flat spada z 63-74%/-3.86 do 32%/-5.25 — więcej traci niż zyskuje).
  - mainnet-usdc-weth-005: −11.61/18% → −2.23/18% (worst up naprawiony,
    ALE %wygr. CAŁOŚCIOWY zapada do 9-11% na WSZYSTKICH reżimach —
    ten wariant psuje wszystko, nie tylko up; do odrzucenia).
  - base-cbbtc-weth-005: −8.16/0% → −1.26/20% — NAJBLIŻEJ bramki:
    "Adapt k=3 h24+trend+re>ema+upX=5%" ma najgorsze OGÓLNE −2.21
    (>−3, próg spełniony!), ale %wygr. całościowy 43% (<65, nie
    przechodzi).
  - arbitrum-weth-usdc-005: −14.76/7% → −5.70/50% (poprawa duża, ale
    worst wciąż daleko od −3; down psuje się do 7% wygr.).
  Podsumowanie: upX=5% to trade-off, nie darmowy obiad — przesuwa
  straty z "up" do "down"/"flat", zamiast je usuwać. Zero wariantu
  bijącego bramkę na 720d/2 lata na żadnej z 4 pul (najbliżej: cbBTC
  z upX, worst OK ale %wygr. za nisko). Pełne tabele (śr./med./%wygr./
  najgorsze/najlepsze × up/down/flat) w
  `backtest/results/walkforward-{base-weth-usdc-030,mainnet-usdc-weth-005,
  base-cbbtc-weth-005,arbitrum-weth-usdc-005}-720d-30d.json`. ZERO
  decyzji podjętych — dane na przegląd 26.08 (pkt 12+13 agendy), razem
  z wcześniejszą obserwacją "reżim up systematycznie najgorszy".

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
> **Agent A (obecny)** = TYLKO liczenie, W PEŁNI AUTOMATYCZNIE (bez
> pytania Rafała o zgodę między krokami): dokończ bieżący
> arbitrum-720d (stary zestaw — dane porównywalne, zostawić), a potem
> OD RAZU, jeden po drugim: `WF_SET=y2` + `NODE_OPTIONS=
> --max-old-space-size=12288` → `npx tsx backtest/walkforward.ts <id>
> 30 15` dla base-weth-usdc-030-720d → mainnet-usdc-weth-005-720d →
> base-cbbtc-weth-005-720d → arbitrum-weth-usdc-005-720d (zestaw 11
> strategii z upX=5% JEST już na dysku — pull zrobił B [47770f8], NIE
> rób własnego pulla, git należy do B). ZAWSZE jeden walkforward naraz
> (RAM!). Na koniec: zbiorczy raport tabel (śr./%wygr./worst per
> strategia per pula + rozbicie up/down/flat; szczególnie czy upX
> ratuje okna UP nie psując flat/down) do @Fable — commit raportu
> zrób dopiero, gdy B nie jest w trakcie operacji gitowych.
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
