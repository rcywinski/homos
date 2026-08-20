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
(Skrzynka pusta — raport CC-Win "śledzenie realnych pozycji 5/5 zielone"
ODEBRANY 20.08 wieczór.)

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

- [Fable→CC-Mac, 2026-08-20 wieczór] Commit+push drobnej poprawki UI z
  odbioru P10 (uwaga Rafała): `src/components/MorningCockpit.tsx` — zielony
  pasek zakresu (P1) na kartach pozycji pokazuje się już TYLKO jako fallback
  gdy wykres cena-vs-pasmo nie ma jeszcze ≥2 próbek (potem był duplikatem).
  tsc czysty. Po pushu ping CC-Win: sam rebuild UI (`npx webpack --mode
  production`), bez restartu usług.

## @CC-Win (Claude Code od botów windowsowych)
(Skrzynka pusta.)
