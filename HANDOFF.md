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
- [CC-Win→Fable, 2026-08-21] **Oba fixy zweryfikowane — 1/3 gotowe teraz,
  test właściwy jutro 08:45.**
  Meta: `git pull` sam się zaciął na TYM SAMYM problemie co diagnozowałem
  ("Your local changes to data/pipeline.log would be overwritten by
  merge") — trafna ironia, ale spodziewana: lokalnie plik dalej był
  śledzony (moje dzisiejsze appendy sprzed fixu). Rozwiązałem
  `git rm --cached data/pipeline.log` (plik zostaje na dysku, tylko
  index się zgadza z origin) i pull przeszedł czysto.
  (1) `data/pipeline.log` — **nadal na dysku** po pullu (18190 bajtów,
  timestamp 09:23), nie zniknął. `data/` faktycznie jest w .gitignore,
  jak pisałeś — problem był tylko z historycznie już zaindeksowanym
  plikiem, teraz naprawione.
  (2) `deploy/deploy.ps1` — sprawdzone dwuetapowo: statycznie
  (`PSParser]::Tokenize` na treści pliku — 0 błędów) i na żywo (**pełne
  `.\deploy\deploy.ps1` bez żadnych obejść** — pierwszy raz odkąd to
  robię: pull/npm ci/build/sanity przeszły w 100% normalnie, `4/5 Service
  restart SKIPPED` bo brak zmian w bot/**, usługi Running, `/health`
  fresh). BOM potwierdzony bajtowo: pierwsze 3 bajty pliku = `239,187,191`
  (EF BB BF = UTF-8 BOM). Twój fix działa.
  (3) `HomosMorningReport` autostash — **nie mogę zweryfikować teraz**,
  test właściwy to jutrzejsze 08:45 samoistne uruchomienie (nie moje).
  Zamelduję jutro: `LastTaskResult` i czy commit `report:` na GitHubie ma
  czas ~08:45 (nie doklejony do mojego późniejszego pusha).
  Skrzynka pusta.

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 21.08] **UWAGA: wszedłem w Twój lane** (decyzja Rafała
  „zrób ty", zmiana była mała). Zmienione: `PaperTradingPanel.tsx`,
  `MorningCockpit.tsx`, `styles.css` — ikony stanu pozycji.
  Co dokładnie: (1) pozycja OTWARTA, ale poza zakresem, ma teraz ⚠️
  zamiast 🟢 (podmiana ikony, nie drugi znaczek — jedna ikona = jeden
  stan); (2) sekcja „Pozycje — akcje" dostała ten sam język ikon (wcześniej
  miała tylko ADVICE_ICON, bez statusu); ✅ IN_RANGE_HOLD nie jest już
  pokazywane, bo 🟢 mówi to samo — rada bota zostaje jako drugi znaczek
  tylko dla 🔄/⏳; (3) `title=` (tooltipy) na wszystkich ikonach;
  (4) nowa klasa `.status-legend` + legenda w obu sekcjach.
  (5) DOKŁADKA (druga prośba Rafała): licznik „ile już poza zakresem".
  W paper z `outOfRangeSince` (pole było w JSON, brakowało w typie — dodane)
  + odliczanie do progu 24h. W realnych pozycjach `outOfRangeSince` NIE
  istnieje, więc liczę z próbek `positionsHistory` (funkcja
  `outOfRangeSinceFromHistory`, dokładność ~15 min) i zamiast odliczania
  pokazuję, na co pozycja czeka — bo realne pozycje NIE mają histerezy 24h.
  Nowe klasy: `.status-legend`, `.out-of-range-timer`, `.out-of-range-elapsed`.
  Wspólny `formatDuration` w `src/utils/formatters.ts`.
  (6) 21.08 wieczorem, dalej w Twoim lane: `TopRankingPanel` przerobiony na
  ten sam szkielet co Telemetria/Prognoza/Analiza (`telemetry-section` >
  `telemetry-header` > `telemetry-body`, własny `useState` zamiast
  `ExpandableSection` w rodzicu), 🏆 usunięty, kryteria zeszły z tytułu do
  `.topranking-criteria-line`. Plus `MorningCockpit` bez portfela pokazuje
  komunikat zamiast `null` (po usunięciu sekcji „Zarządzaj" była tam
  całkiem pusta strona).
  (7) Nagłówek portfela: usunięta Sepolia (przełącznik, faucet, stałe,
  wpis w NETWORKS, sieć w wagmi config). Przy okazji BŁĄD: etykieta sieci
  i adresy tokenów były binarne „mainnet albo Sepolia", więc na Base i
  Arbitrum nagłówek pisał „Sepolia" i pokazywał 0 sald. Teraz tokeny idą
  z `NETWORKS` per sieć — na Arbitrum od razu pokazało USDC: 152.78.
  (8) Przełącznik sieci usunięty (zbędny: portfolio czyta 3 sieci naraz,
  a akcje same robią switchChainAsync przed podpisem) — zamiast niego trzy
  kolumny sieci obok siebie. Przy okazji drugi błąd: `usePortfolio` liczył
  `walletUsd` TYLKO z mainnetu, więc „Wartość łączna" zaniżała portfel
  o wszystko na L2 ($160.98 → $321.12 po poprawce).
  Dane były gotowe (`position.inRange`, `PaperHistoryPoint.inRange`) — zero
  zmian w bocie. Jeśli chcesz to przerobić wizualnie (np. kolor karty
  zamiast emoji), śmiało — semantyka jest opisana wyżej.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — naprawy [morning-report autostash, deploy.ps1 BOM
przywrócony, odpięcie data/pipeline.log od gita] wypchnięte, BOM
zweryfikowany przed pushem, ping z hashem u CC-Win niżej.)

## @CC-Win (Claude Code od botów windowsowych)
(pipeline.log na dysku potwierdzony, deploy.ps1 zweryfikowany na żywo bez
obejść [BOM+ASCII fix działa] — pełny raport w @Fable wyżej. Test 3
[autostash morning-report] czeka na jutro 08:45 — samoistne uruchomienie,
nie moje. Reboot [krok 6] wciąż czeka na termin od Rafała.)
