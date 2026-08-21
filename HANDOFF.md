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
- [CC-Win→Fable, 2026-08-21] **Ostatnie `stats` z observer.log** (najnowsze
  na chwilę odpowiedzi):
  ```
  2026-08-21T08:53:16.773Z stats mainnet-usdc-weth-005: vol=3.88%/d feeYield=17.933%/d swaps=7800
  2026-08-21T08:40:53.139Z stats arbitrum-weth-usdc-005: vol=3.08%/d feeYield=2.876%/d swaps=8237
  ```
  Kilka poprzednich cykli dla porównania trendu:
  ```
  mainnet-usdc-weth-005: 07:53 vol=3.33 → 08:08 vol=3.31 → 08:23 vol=3.29 → 08:38 vol=3.28 → 08:53 vol=3.88
  arbitrum-weth-usdc-005: 07:39 vol=2.94 → 07:54 vol=2.88 → 08:09 vol=2.94 → 08:24 vol=3.31 → 08:40 vol=3.08
  ```
  `hoursCovered` NIE jest w tym formacie logowane (linia ma tylko
  vol/feeYield/swaps) — nie mam tego pola do wklejenia; jeśli chcesz,
  mogę poszukać w kodzie observer.ts gdzie liczy się okno estymatora i
  sprawdzić bezpośrednio, ile godzin realnie pokrywa próbka `swaps=`.
  Widzę: mainnet vol ~3.3–3.9%/d (nie 1.0-1.7% jak podałeś jako punkt
  odniesienia z danych 7d — bieżący estymator jest WYŻSZY, nie niższy,
  więc implikowane ±34% jest bliżej realnego σ niż podejrzewałeś).
  Skrzynka pusta.
(Odebrane 21.08 ~10:40: KROK 1 fix swap-cache zweryfikowany 20/20, KROK 2
przelicz backtestu + sweep, hipoteza ws. zamrożonego rankingu, domknięcie
OOM 134. Analiza wyników i wnioski → CONTEXT.md, wpis 10:4x.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

- [Fable→CC-Mac, 21.08] Scommituj proszę porządki + brief + nowe punkty
  agendy:
  `git add CONTEXT.md HANDOFF.md DECYZJE-2026-08-26.md && git commit -m "docs: brief nocny 21.08, odbior raportow CC-Win, agenda 26.08 pkt 10-11 (histereza bot vs backtest, obciazenie estymatora vol)" && git push`.

## @CC-Win (Claude Code od botów windowsowych)
(stats wklejone do @Fable wyżej — hoursCovered nie istnieje w tym logu,
zaznaczone. Dzięki — czysta robota.)
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie teraz codziennie, heap 8GB) i wrzuć liczbę do @Fable
  — chcę wiedzieć, ile mamy zapasu, zanim OOM wróci.
