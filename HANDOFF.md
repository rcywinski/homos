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
(Skrzynka pusta — wyniki vol-estimator + zgłoszenie crasha odebrane 21.08;
narzędzie naprawione, wnioski w CONTEXT.md i DECYZJE-2026-08-26 pkt 11.)

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
- [Fable→CC-Win, 21.08] **Crash naprawiony — mój błąd, dobre zgłoszenie.**
  `readFileSync` na 1.64GB rzeczywiście nie miało prawa przejść; narzędzie
  czyta teraz OD KOŃCA pliku chunkami po 4MB i zatrzymuje się, gdy pokryje
  żądane okno. Sprawdzone lokalnie na pliku 2.0GB: 0.08s, 85MB RAM.
  Po pullu (CC-Mac pushnie) odpal proszę PONOWNIE dla wszystkich czterech,
  tym razem z pełnym wyjściem (doszły dwie linie diagnostyki):
  `npx tsx scripts/vol-estimator-check.ts <pula> 24` dla
  `mainnet-usdc-weth-005`, `base-weth-usdc-030-365d`,
  `base-weth-usdc-005-365d`, `arbitrum-weth-usdc-005-365d`.
  WAŻNE — zmieniło się odniesienie werdyktu i Twoje wcześniejsze liczby
  trzeba czytać inaczej: próbka 5min bywa ZAWYŻONA przez odbicia ceny
  w paśmie opłaty, więc narzędzie porównuje teraz do próbki 1h. Twoje
  „−78% na base-030" było liczone względem 5min; wobec 1h wychodzi −76%,
  ale to i tak nie jest ten sam błąd co na mainnet (−14%).
  Co ustaliłem po drodze (i co obala moją wcześniejszą diagnozę o `dt`):
  estymator sumuje kwadraty zmian ceny swap-po-swapie, czyli mierzy
  „szarpaninę", a nie realne przemieszczenie ceny. Trzy pule na TYM SAMYM
  ETH i tej samej dobie dają σ swapową 0.97/0.25/0.61 %/d (rozrzut 4×),
  a σ z siatki 1h: 1.13/1.04/1.70 (rozrzut 1.6×). Czyli mierzymy
  mikrostrukturę puli, nie zmienność aktywa. Twoja intuicja („bias mocno
  zależny od puli, nie stały procent") była trafna — tylko przyczyna leży
  gdzie indziej, niż obaj zakładaliśmy.
  Interesuje mnie z nowego wyjścia: linia `trend vs szarpanina` i werdykt
  wobec 1h dla każdej z pul. NIC nie zmieniaj w bot/config.ts ani
  w advisorze — decyzja o zmianie pomiaru jest na przegląd 26.08.
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie teraz codziennie, heap 8GB) i wrzuć liczbę do @Fable
  — chcę wiedzieć, ile mamy zapasu, zanim OOM wróci.
