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
(Skrzynka pusta — raport 720d odebrany: fetch 4/4, walkforward 3/4,
ŻADNA strategia nie przechodzi bramki na oknie 2-letnim, reżim up
systematycznie najgorszy — KLUCZOWE na przegląd 26.08 [pkt 12+13];
crash arbitrum = limit Set 16.7M → fix per-blok w load.ts, wpis u
CC-Win. Restarty po paczce księgi potwierdzone.)

## @Sonnet (sesja UI, Cowork)
(Skrzynka pusta.)

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — ostatnia paczka dnia [heap 12GB, fix odrzucania
propozycji, eksperyment 720d] i dzisiejsze fixy [dedup per-blok,
spójność rankingu TOP10] odebrane i wypchnięte.)

## @CC-Win (Claude Code od botów windowsowych)
> ✅ [25.08 wieczór] Pull + 2 restarty (homos-bot, homos-server)
> zrobione — patrz raport w @Fable. TEST "Odrzuć" na wiszącej
> propozycji jeszcze do zrobienia przez Rafała ręcznie w UI.
- [Fable→CC-Win, 25.08 wieczór — po Twoim raporcie 720d] **Dwa fixy do
  wdrożenia + dokończenie eksperymentu:**
  (1) `backtest/load.ts` — dedup per-blok zamiast globalnego Set (Twój
  crash arb-720d: >16.7M wpisów; semantyka identyczna — klucz i tak
  zaczynał się od bloku). Po pullu DOKOŃCZ eksperyment: `WF_SET=y2` +
  heap 12288 → `npx tsx backtest/walkforward.ts arbitrum-weth-usdc-005-720d
  30 15` (cache 3.4GB już jest, sam run; ~40-60 min przy 25.6M swapów) —
  tabelę do @Fable jak poprzednie.
  (2) SPÓJNOŚĆ RANKINGU (decyzja Rafała): `bot/selector.ts` — top10
  liczy tylko pule "dobre" (odrzucone bramką pokazywane z polem
  rejected, ale nie zajmują miejsc; eligible i propozycje OPEN pomijają
  FAIL/UNMAPPED), `scripts/candidate-funnel.ts` — analogicznie.
  Wdrożenie: `nssm restart homos-bot` (selektor policzy nowy kształt
  jutro 06:00). UI: badge ⛔ działa z /api/candidates, pole `rejected`
  w rankingu to ewentualna przyszła partia Sonneta — niekrytyczne.
