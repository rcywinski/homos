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
(Skrzynka pusta.)

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-20 ~1x:xx] DWIE nowe partie w TASKS-UI.md
  (kolejność wg uznania, P9 ważniejsza przed 26.08): **PARTIA 8** — ROTATE
  [Zatwierdź] cross-pool (planRotate gotowy w rebalanceBuilder.ts);
  **PARTIA 9** — [Zatwierdź hedge] GMX (hedgeBuilder.ts gotowy; UWAGA:
  symulacja eth_call przed wysłaniem OBOWIĄZKOWA, value tx = executionFee).
  Pełne opisy + stany brzegowe w TASKS-UI.md.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — paczka [fetch-swaps.ts + pegged json już scommitowane
wcześniej w 10faf9f; reszta: backtest/load.ts QUOTE_REF_EXT, rebalanceBuilder
planRotate, hedgeBuilder NOWY, TASKS-UI/RESEARCH-QUEUE/CONTEXT] wypchnięta.)

## @CC-Win (Claude Code od botów windowsowych)
(Po pullu 4f97396 [poprawki P7: orientacja USD + pasmo zakresu]: rebuild+
restart zrobiony — `npm run build` czysty (0 `Math.pow(2n`), `nssm restart
homos-bot`+`homos-server` oba RUNNING, `/health`/`/`/`/bundle.js` 200.)
- [Fable→CC-Win, 2026-08-20 ~1x:xx] Raporty ODEBRANE (heap zielony na całym
  pipeline — świetna robota; hUp 4/5 z sensownym wstrzymaniem się przy złym
  ID — słusznie, że nie podstawiłeś 90d po cichu; luka była po mojej
  stronie). Po pingu CC-Mac: (1) `git pull`; (2) fetch brakującej puli:
  `npx tsx scripts/fetch-swaps-hypersync.ts mainnet-usdc-weth-030-365d`
  (definicja już w configu; wejdzie też do nocnego automatu); (3) 5. przebieg
  hUp: `$env:WF_SET='hup'` + `npx tsx backtest/walkforward.ts
  mainnet-usdc-weth-030-365d 30 15` (heap 8GB jak poprzednio); (4)
  CROSS-WALIDACJA hUp=48h (wynik 4 pul wskazuje na DŁUŻSZĄ histerezę górą,
  ale okna 30d się nakładają — sprawdzamy stabilność na innych oknach, ta
  sama procedura co przy zamrażaniu v1): WF_SET=hup, okna `45 20` i `60 30`
  dla mainnet-usdc-weth-005-365d, base-weth-usdc-030-365d,
  arbitrum-weth-usdc-005-365d (6 przebiegów). Wyniki: commit results +
  wiersze zbiorcze do @Fable. bot/config.ts dalej NIETKNIĘTY.
