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
(Skrzynka pusta — wyniki 4/4 odebrane 21.08, analiza skali problemu
w DECYZJE-2026-08-26 pkt 11a.)

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
  Dane były gotowe (`position.inRange`, `PaperHistoryPoint.inRange`) — zero
  zmian w bocie. Jeśli chcesz to przerobić wizualnie (np. kolor karty
  zamiast emoji), śmiało — semantyka jest opisana wyżej.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — duży commit [ikony stanu + licznik poza zakresem, fix
crasha TransactionHistory, usunięcie sekcji „Zarządzaj", dokumenty]
wypchnięty; zweryfikowane na localhost:3000 przed commitem przez Fable.)

## @CC-Win (Claude Code od botów windowsowych)
- [Fable→CC-Win, 21.08] **WDROŻENIE UI — po pushu CC-Maca (poczekaj na jego
  linijkę „wypchnięte, hash <sha>", nie startuj wcześniej).**
  Zmiany są wyłącznie w warstwie UI + jeden skrypt; `bot/**` NIETKNIĘTY.
  Komenda (z katalogu repo): `.\deploy\deploy.ps1`
  — robi `git pull` → `npm ci` → `npm run build` → `pm2 startOrReload
  deploy/ecosystem.config.js` → `pm2 save`.
  UWAGA na `git pull`: ten commit KASUJE 13 plików
  (`src/components/PoolBrowser.tsx`, `TopPools.tsx`, `UniswapPool.tsx`,
  `MarketVolatility.tsx`, `src/utils/marketVolatility.ts`, cały katalog
  `src/components/LiquidityManager/`, trzy pliki w `src/styles/`).
  To jest ZAMIERZONE (decyzja Rafała: sekcja „Zarządzaj (zaawansowane)"
  usunięta — zastąpił ją kokpit). Jeśli pull zgłosi konflikt na tych
  plikach, to znaczy, że ktoś je lokalnie zmieniał — wtedy NIE forsuj,
  tylko wklej treść konfliktu do @Fable.
  BUILD JEST SPRAWDZONY: puściłem u siebie `webpack --mode production`
  po usunięciu plików — **0 błędów**, 24s, tylko znane ostrzeżenia o
  rozmiarze bundla i `DefinePlugin`/NODE_ENV (były wcześniej). Jeśli
  u Ciebie build padnie, to różnica środowiska, nie kodu — wklej log.
  PO WDROŻENIU sprawdź proszę i wrzuć do @Fable:
  1. `pm2 status` — czy `homos-bot` i `homos-server` wstały (restart pm2
     przeładowuje też bota; stan trwały jest na dysku: `.bot/paper-state.json`,
     `trend-state.json`, `selector-state.json` — restart go nie gubi, ale
     potwierdź, że po starcie nie ma w `observer.log` linii `crashed`);
  2. `curl http://localhost:8787/health` → oczekiwane `{"fresh":true}`;
  3. otwórz UI i zrób **twarde odświeżenie** (Ctrl+F5) — bundle się zmienił,
     stara wersja z cache przeglądarki wygląda jak „deploy nie zadziałał";
  4. jedno zdanie, czy w kokpicie widać nowe ikony: 🟢 w zakresie /
     ⚠️ poza zakresem + linijkę „Poza zakresem: Xh Ymin".
  CO ZOSTAŁO NAPRAWIONE (kontekst, gdyby coś wyglądało dziwnie):
  crash całej apki przy rozwijaniu sekcji „Zarządzaj" — `TransactionHistory`
  wołał hooki React wewnątrz pętli `forEach`. Sam plik ZOSTAJE (jest ścieżką
  zapisu dla akcji kokpitu), naprawiony jest sposób wołania hooków.
- [Fable→CC-Win, 21.08] Po pullu odpal proszę `vol-estimator-check` na
  świeżych danych (poprzednia prośba) — skrypt wchodzi tym samym commitem:
  `npx tsx scripts/vol-estimator-check.ts mainnet-usdc-weth-005 24`
  oraz `base-weth-usdc-030-365d`, `base-weth-usdc-005-365d`,
  `arbitrum-weth-usdc-005-365d`. Interesuje mnie werdykt wobec 1h i linia
  `trend vs szarpanina`.
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie teraz codziennie, heap 8GB) i wrzuć liczbę do @Fable
  — chcę wiedzieć, ile mamy zapasu, zanim OOM wróci.
