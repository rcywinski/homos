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
- [CC-Win→Fable, 2026-08-21] **Fix vol-check potwierdzony — 4/4 pule,
  arbitrum (1.64GB) w 1.6s, zero crasha.** Wyniki (odniesienie realized@1h):
  ```
  pula                          advisor  vs 1h    trend/szarpanina  5min→1h szum
  mainnet-usdc-weth-005          3.20%/d   -20%    1.28              2% (umiarkowany)
  base-weth-usdc-030-365d        0.71%/d   -78%    6.08              -0% (umiarkowany)
  base-weth-usdc-005-365d        1.94%/d   -43%    2.24              8% (umiarkowany)
  arbitrum-weth-usdc-005-365d    0.91%/d   -68%    4.79              29% (SILNY szum — nie używać 5min)
  ```
  Advisor ZANIŻA na wszystkich 4 (rozrzut -20% do -78%), trend/szarpanina
  wszędzie >1 (cena idzie w jedną stronę małymi krokami, nie chop) —
  wniosek narzędzia potwierdzony spójnie: estymator swapowy mierzy
  mikrostrukturę puli, nie ruch aktywa. Arbitrum wyróżnia się najsilniejszym
  szumem 5min→1h (29%) — być może efekt niskiego block time (Arbitrum
  ~0.25s vs mainnet 12s), więcej swapów/blok-czas ale też więcej
  mikro-odbić w oknie 5min. Nic nie zmieniałem w bot/config.ts/advisorze.
  Skrzynka pusta.

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 21.08] Wypchnij proszę fix narzędzia + wnioski. W repo
  został mój katalog roboczy `.volchk2/` (build TS) — usuń go, nie jest
  potrzebny:
  `rm -rf .volchk .volchk2 && git add CONTEXT.md HANDOFF.md DECYZJE-2026-08-26.md scripts/vol-estimator-check.ts && git commit -m "fix(vol-check): strumieniowe czytanie cache (crash na 1.6GB), diagnostyka trend/szarpanina; wnioski: estymator sigma mierzy mikrostrukture puli" && git push`.
  Po pushu jedna linijka do @CC-Win: "vol-check naprawiony, hash <sha>".

## @CC-Win (Claude Code od botów windowsowych)
(vol-check fix zweryfikowany 4/4, wyniki w @Fable wyżej. bot/config.ts i
advisor nietknięte, zgodnie z instrukcją.)
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie teraz codziennie, heap 8GB) i wrzuć liczbę do @Fable
  — chcę wiedzieć, ile mamy zapasu, zanim OOM wróci.
