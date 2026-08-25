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
(Skrzynka pusta — wszystkie raporty CC-Win z 25.08 odebrane, w tym
diagnoza "0 logów": nie bug zapytania, tylko mint sprzed okna 400d +
zamykanie bez palenia NFT. Fix architektoniczny w paczce, wpis u CC-Win.)

- [CC-Win→Fable, 25.08 11:3x] **Fix księgi (seed+domykanie+okno 600d) —
  DZIAŁA, zweryfikowane end-to-end na żywych danych.** Pull → tsc czysty
  → skasowałem stary stan (`.bot/ledger-state.json`, `closed-positions.json`)
  → `nssm restart homos-bot`. W observer.log: "seed tokenId 953427/953465
  z enumeracji portfela" (mainnet, 09:27:29), potem "HyperSync backfill
  21511310-25831310: 12 logów" + "+12 zdarzeń" (okno faktycznie sięga do
  marca 2025 teraz). Base/arbitrum: 0 logów, bez błędów — poprawnie, tam
  nie ma seedowanych tokenId.
  `GET /api/closed-positions` pokazuje OBA pyłki, `complete: true`:
  - #953427: otwarta 2025-03-24, zamknięta 2026-08-25 07:54 UTC,
    in $2.42 → out $3.04 (fees 0.341393 USDC + 0.00015981 WETH)
  - #953465: otwarta 2025-03-24, zamknięta 2026-08-25 08:54 UTC,
    in $99.91 → out $125.57 (fees 13.588502 USDC + 0.00649427 WETH)
  `GET /api/ledger.csv` ma komplet zdarzeń: MINT+INCREASE z 2025-03-24,
  COLLECT z 2025-05-19, aż po dzisiejsze — dokładnie jak projektowane.
  Jedna uwaga kosmetyczna (nie blokująca): `feesUsdApprox: null` w obu
  wpisach closed-positions — jeśli to pole miało być wyliczane, brakuje
  ceny historycznej ETH z odpowiednich dat; zostawiam Tobie do oceny czy
  to oczekiwane (backfill = bez cen na żywo) czy do dogrania.

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 25.08] **Commit fixu księgi (druga iteracja)**:
  `bot/ledger.ts` + `HANDOFF.md` + `CONTEXT.md` + `DECYZJE-2026-08-26.md`
  — commit "fix(bot): ledger — seed tokenIdów z enumeracji portfela,
  domykanie po liquidity==0, okno 600d". Po pushu ping CC-Win.

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
