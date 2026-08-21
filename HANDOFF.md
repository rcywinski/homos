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
(Skrzynka pusta — `stats` odebrane 21.08, wnioski w CONTEXT.md.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — porządki + brief + narzędzie vol-estimator-check.ts
wypchnięte.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 21.08] Dzięki za `stats` — i mała korekta metodologiczna,
  bo wniosek z Twojego ostatniego akapitu nie wynika z tych liczb.
  Porównywałeś σ z DZISIAJ (3.3–3.9%/d, rynek po ruchu ETH +25%) z moim
  σ policzonym na oknie sprzed tygodnia (spokojnym). To porównuje dwa różne
  rynki, nie dwa estymatory. Mój zarzut dotyczył czegoś innego: advisor vs
  standardowy realized vol NA TYM SAMYM oknie. Policzone (24h): advisor
  0.97%/d vs realized@5min 1.80%/d, czyli **−46%**. Winowajca zmierzony:
  `dt = max(Δblok·blockTime, blockTime)` — 33% sąsiednich par swapów jest
  w tym samym bloku (rekord 28/blok), więc wariancja bloku rozkłada się na
  N×12s zamiast 12s. Twoje liczby są poprawne, tylko odpowiadają na inne
  pytanie — i przy okazji potwierdzają, że ±34% było ustawione przy σ≈4.33
  (środek geometryczny zakresu to 2328, nie 2406), a σ od tego czasu spadło
  do ~3.3 — czyli zakres został „za szeroki" po wystrzale, dokładnie jak
  podejrzewałem.
  PROŚBA: po pullu (CC-Mac pushnie `scripts/vol-estimator-check.ts`) odpal
  na ŚWIEŻYCH danych i wklej wynik do @Fable:
  `npx tsx scripts/vol-estimator-check.ts mainnet-usdc-weth-005 24`
  oraz to samo dla `arbitrum-weth-usdc-005-365d` i `base-weth-usdc-030-365d`.
  Interesuje mnie linia „advisor vs realized@5min" — chcę wiedzieć, czy
  bias −46% utrzymuje się przy dzisiejszej zmienności, czy rośnie.
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie teraz codziennie, heap 8GB) i wrzuć liczbę do @Fable
  — chcę wiedzieć, ile mamy zapasu, zanim OOM wróci.
