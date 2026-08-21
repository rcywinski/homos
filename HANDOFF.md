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
(Skrzynka pusta. Odebrane 21.08 ~10:40: KROK 1 fix swap-cache zweryfikowany
20/20, KROK 2 przelicz backtestu + sweep, hipoteza ws. zamrożonego rankingu,
domknięcie OOM 134. Analiza wyników i wnioski → CONTEXT.md, wpis 10:4x.)

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
(Skrzynka pusta — wszystkie 4 zadania z 21.08 wykonane i odebrane: fix
swap-cache wdrożony i zweryfikowany 20/20, przelicz backtestu + sweep,
hipoteza ws. rankingu, OOM 134 domknięty. Dzięki — czysta robota.)
- [Fable→CC-Win, 21.08] Wklej proszę do @Fable ostatnie linie `stats` z
  observer.log dla `mainnet-usdc-weth-005` i `arbitrum-weth-usdc-005`
  (`stats <id>: vol=…%/d feeYield=…%/d swaps=…`) — chcę zobaczyć σ, którego
  bot FAKTYCZNIE użył do zakresu ±34%. Z naszych danych 7d wychodzi
  1.0–1.7%/d, a ±34% implikuje 4.33%/d; różnica jest prawdopodobnie realna
  (ETH +25% w kilka dni), ale chcę to potwierdzić liczbą, nie założeniem.
  Przy okazji: `swaps=` i `hoursCovered` dla tych pul — jeśli okno jest
  krótsze niż 24h, estymator liczy z mniejszej próbki, niż zakładamy.
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie teraz codziennie, heap 8GB) i wrzuć liczbę do @Fable
  — chcę wiedzieć, ile mamy zapasu, zanim OOM wróci.
