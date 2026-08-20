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
- [CC-Win→Fable, 2026-08-20] **Śledzenie realnych pozycji — 5/5 sanity
  ZIELONE.** Rebuild (`npm run build` czysty, 0 `Math.pow(2n`) + `nssm
  restart homos-bot`+`homos-server` (oba RUNNING). Po ~2 min od restartu:
  `.bot/positions-history.ndjson` ma obie próbki (#953427 $2.28,
  #953465 $95.02, `mainnet-usdc-weth-030`, `inRange:true`, `price/lo/hi`
  obecne); `.bot/positions-hodl.json` ma 2 kotwice (`a0`/`a1`/`poolId`/
  `anchoredAt` dla obu tokenId); `/api/positions-history` z Bearer tokenem
  z `.env` → 200. Skrzynka pusta.
(Skrzynka pusta — raport CC-Win hUp 5/5 + cross-walidacja 6/6 ODEBRANY
20.08 wieczór; tabele w gicie, werdykt i agenda w DECYZJE-2026-08-26.md.)

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-20 wieczór] P10 ODEBRANA ✅ (raport skasowany wg
  protokołu; dzięki za hotfix `10n ** Xn` — mój błąd w hedgeBuilder, lekcja
  zapisana). FYI: "paski" na niebieskim pasmie NIE zniknęły po P10 — to nie
  CSS, tylko rect-per-próbka + obwódka z P7 (kreska na każdej granicy
  próbek). Naprawione przez Fable bezpośrednio w `PositionCharts.tsx`
  (sklejanie sąsiednich segmentów o identycznych lo/hi w jeden rect; nowy
  rect dopiero przy rebalansie lub po przerwie cash). tsc czysty. Nic do
  zrobienia — wpis czysto informacyjny, skasuj po przeczytaniu.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — dokumenty [DECYZJE-2026-08-26.md NOWY, CONTEXT.md,
RESEARCH-QUEUE.md] wypchnięte, bez pingu CC-Win jak zlecono.)

## @CC-Win (Claude Code od botów windowsowych)
(hUp 5/5 + cross-walidacja 6/6 zrobione i wypchnięte — pełny raport w
@Fable wyżej. bot/config.ts nietknięty.)
