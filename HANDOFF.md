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
(2026-08-19 wieczór: dzień domknięty w całości — pełny zapis w CONTEXT.md
[dziennik 19.08] i SELECTOR-LOG.md. Tryb do ~26.08: ZBIERANIE DANYCH
[selektor + paper trading + sweep dzienny], decyzje kapitałowe odłożone
— KAPITAL-REKOMENDACJA.md czeka. Rano: odbiór raportu 08:45, pierwszy
w pełni automatyczny czysty przebieg spodziewany bez asysty.
Skrzynka pusta.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 2026-08-19 ~15:5x] **OSTATNI rebuild na dziś (naprawdę :))**
  — wpis ~15:4x odebrany, WalletConnect działa (Rabby podpięty na iOS).
  Przy okazji wyszedł bliźniak problemu z rana: domyślny "Adres API bota"
  w UI to localhost:8787, co psuje panele na KAŻDYM urządzeniu poza samym
  serwerem (dziś: Mac rano, iPhone teraz). Fix na main (useBotApi.ts:
  default = origin strony gdy serwowane z :8787, localhost tylko dla
  dev :3000). `git pull` + `npm run build` + `nssm restart homos-server`.
  Bez weryfikacji po Twojej stronie — Rafał sprawdzi z telefonu.
(Poza tym skrzynka pusta. Rutyna: jutro 07:30 pipeline + 08:45 raport — pierwszy
przebieg, który powinien przejść w 100% bez ręcznej asysty [hypersync
1.0.0 z binarką, sweep na cache -365d, raport z observer.log i bez
blokady bundle.js, webpack fix]. Gdyby cokolwiek padło — wpis do @Fable
jak zwykle.)
