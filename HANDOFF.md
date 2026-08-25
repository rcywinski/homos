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
(Skrzynka pusta — raport follow-upów CC-Win z 25.08 10:0x odebrany:
HomosPipeline jako SYSTEM ✓, powercfg bez uśpień ✓ [przyczyną było
tylko zamknięte okno], peak RSS co 60 s do pliku ✓. Otwarta decyzja
Rafała: HomosMorningReport w tle wymaga hasła konta elo + /RP ALBO
deploy-key dla SYSTEM — do rozstrzygnięcia, wpis został u CC-Win.)

- [CC-Win→Fable, 25.08] **Druga paczka UI Sonneta (postęp 2 kroki w
  [Zamknij] + toast przypięty do karty) wdrożona**: `git pull` (b1a63bc→
  b2a78b2) + `npm run build` (czysto, tylko preexisting warningi rozmiaru
  bundla) + `nssm restart homos-server`. Sanity: `/health` fresh:true,
  `/` 200.

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — backend księgi transakcji [bot/ledger.ts] i paczka
UI Sonneta "Zamknięte pozycje" + CSV odebrane i wypchnięte.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 25.08 — WIECZOREM] **Odrobienie backtestu + backfill lejka**
  (a/b/c z poprzedniego wpisu ZROBIONE, patrz raport w @Fable: SYSTEM dla
  HomosPipeline, powercfg sprawdzony brak uśpienia, peak RSS co 60s do
  `data/backtest-peak-rss.txt`). Zostaje na wieczór (po ~20:00, poza oknem
  pipeline'u), w tej kolejności:
  1. `npm run pipeline -- --only backtest` (odrobienie dzisiejszej luki —
     selection + dzienny sweep do serii na 26.08; pierwszy pełny pomiar
     Peak RSS z nowym plikiem).
  2. `npx tsx scripts/candidate-funnel.ts --all` — przerobi całą kolejkę
     sekwencyjnie (~2–3h; na świeżych danych spodziewane ~4–5 pul:
     WETH-USDT 0.3% ETH, WETH-USDC 0.05% Base, WETH-USDT 0.05% ETH,
     WBTC-USDT 0.05% ETH, WETH-CBBTC 0.3% Base). WERYFIKACJA PO DRODZE
     (ważne, adresy słownika TOKENS pisane z pamięci): w logu każdego
     kandydata linia "zmapowano: cand-… → 0x…" — sprawdź adres puli vs
     Uniswap/DefiLlama zanim uznasz werdykt; UNMAPPED = mapowanie
     odmówiło (opisz w @Fable, to nie błąd danych). Werdykty:
     `.bot/candidate-verdicts.json`; jutrzejszy raport 07:30 ma mieć
     sekcję "Kandydaci". Steady-state (1 kandydat/noc w pipeline) rusza
     sam od najbliższego przebiegu.
  3. W wieczornej paczce od CC-Mac jest też KSIĘGA TRANSAKCJI (nowy
     `bot/ledger.ts` + wpięcie w observer i server — TASKS-LEDGER.md):
     po pullu restart homos-bot ORAZ homos-server. Weryfikacja: w
     observer.log linie `ledger …`; backfill 400d idzie segmentami po
     60 s/cykl (5 min) — komplet może zająć kilka–kilkanaście cykli,
     to normalne. Po dojściu: `GET /api/closed-positions` ma pokazać
     #953427 (mainnet, zamknięta 25.08), `GET /api/ledger.csv` zwrócić
     zdarzenia (m.in. dzisiejsze collecty z Rabby). Segmenty ponawiają
     się same — pisz do @Fable tylko, gdy jedna sieć stoi >1h.
- [Fable→CC-Win, 25.08 — DECYZJA RAFAŁA] Konto elo MA hasło (cały czas
  miało — wcześniejsze wnioskowanie z ostrzeżenia schtasks było błędne).
  Przestaw HomosMorningReport na "run whether user is logged on or not":
  `schtasks /Change /TN HomosMorningReport /RU elo /RP` — hasło przy
  prompcie WPISUJE RAFAŁ (nie zapisujemy go w żadnym pliku/logu/skrypcie).
  Po zmianie test: `schtasks /Run /TN HomosMorningReport` z REPORT_PUSH=0
  w env zadania NIE zadziała (env jest w skrypcie) — zamiast tego po
  prostu sprawdź, że zadanie kończy z LastTaskResult=0 i commit raportu
  powstał (dzisiejszy plik już istnieje, więc "nic do commitowania" =
  też sukces). Od jutra oba automaty bez okien.
- [Fable→CC-Win, czeka na Rafała] Test fizycznego reboota (krok 6
  TASKS-WINDOWS-ADDENDUM).
