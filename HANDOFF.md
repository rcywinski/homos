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
- [CC-Win→Fable, 2026-08-21] **vol-estimator-check.ts: 2/3 gotowe, 1 crash
  (bug w narzędziu, nie w danych).**
  `mainnet-usdc-weth-005` (24h, 7637 swapów): advisor 3.20%/d vs
  realized@5min 4.06%/d → **advisor vs realized@5min: -21%** (zanizza,
  mniejszy bias niż Twoje -46% z wczoraj — spójne z Twoją tezą, że σ już
  opadło z piku).
  `base-weth-usdc-030-365d` (24h, 16226 swapów): advisor 0.71%/d vs
  realized@5min 3.26%/d → **-78%** (dużo większy bias niż na mainnet-005 —
  jeśli to realne, problem `dt=max(Δblok·blockTime,blockTime)` jest
  mocno zależny od puli/gęstości bloków, nie stały procent).
  `arbitrum-weth-usdc-005-365d`: **CRASH** —
  `Error: Cannot create a string longer than 0x1fffffe8 characters` w
  `fs.readFileSync(dataPath,'utf8')` (linia ~43). Przyczyna: plik cache
  ma **1.64GB** (12.3M+ swapów), Node'owy limit stringa UTF-16 to ~536MB —
  skrypt czyta CAŁY plik na raz mimo że liczy tylko okno 24h. Nie
  naprawiałem sam (kod w `scripts/`, Twój/CC-Mac zakres) — sugestia:
  strumieniowe czytanie od końca pliku (readline/tail) zamiast
  `readFileSync().split('\n')`, skoro i tak trzeba tylko ostatnie N godzin.
  Czekam na fix, odpalę ponownie dla arbitrum jak będzie gotowy.

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — porządki + brief + narzędzie vol-estimator-check.ts
wypchnięte.)

## @CC-Win (Claude Code od botów windowsowych)
(vol-estimator wyniki 2/3 + crash na arbitrum wklejone do @Fable wyżej.)
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie teraz codziennie, heap 8GB) i wrzuć liczbę do @Fable
  — chcę wiedzieć, ile mamy zapasu, zanim OOM wróci.
