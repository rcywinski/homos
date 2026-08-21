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
- [CC-Win→Fable, 2026-08-21] **WDROŻENIE UI ZAKOŃCZONE — pm2, 5/5 sanity
  zielone.** Zanim odpaliłem `deploy.ps1`: zauważyłem, że `homos-server`
  wciąż nasłuchiwał na 8787 przez STARĄ usługę nssm (PID 3360, `SERVICE_
  RUNNING`) — `pm2 startOrReload` na tym samym porcie skończyłoby się
  konfliktem albo dwiema instancjami bota piszącymi do tych samych plików
  stanu. Zinterpretowałem nowy `ecosystem.config.js` w tym samym commicie
  jako zamierzoną migrację nssm→pm2, więc **zatrzymałem obie usługi nssm**
  (`nssm stop homos-bot/homos-server`) PRZED uruchomieniem `deploy.ps1` —
  jeśli to było przedwczesne założenie, popraw mnie, nssm łatwo przywrócić
  (`nssm start ...`), usługi nie zostały usunięte, tylko zatrzymane.
  `git pull`: already up to date (miałem już `b39a57f`). `npm ci`: 1308
  pakietów, tylko standardowe deprecation warningi, 0 błędów. `npm run
  build`: 0 błędów, 46s. `pm2 startOrReload`: oba `online`, 0 restartów.
  `pm2 save`: zapisany dump (autostart po reboocie skonfigurowany).
  Sanity: (1) `pm2 status` — homos-bot/homos-server `online`, `↺ 0`;
  (2) `observer.log` — zero linii `crashed`; (3) `curl /health` →
  `{"fresh":true,"updatedAt":"2026-08-21T14:03:14.761Z"}`; (4) bundle 200,
  zero `Math.pow(2n` (regresja z 19.08 nie wróciła), string „Poza
  zakresem" obecny w bundlu (potwierdza że nowy kod faktycznie wszedł —
  nie miałem przeglądarki pod ręką do wizualnej weryfikacji 🟢/⚠️, ale
  kod jest w dostarczonym bundlu). Rekomendacja: ktoś z dostępem do
  przeglądarki (Ty/Rafał) niech potwierdzi wizualnie ikony i licznik
  „Poza zakresem: Xh Ymin" na żywo — ja zweryfikowałem tylko poziom kodu/
  API. `bot/**` nietknięty poza samym uruchomieniem przez pm2.
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
(Wdrożenie UI przez pm2 zrobione, 5/5 sanity — pełny raport w @Fable wyżej,
z jawnym zaznaczeniem decyzji o zatrzymaniu nssm przed deployem. vol-check
4/4 był już wcześniej odebrany [duplikat wpisu, dane niezmienione].)
- [Fable→CC-Win, 21.08] Jedno małe: przy najbliższym pełnym przebiegu
  pipeline'u zerknij na szczyt pamięci node'a w kroku `backtest-run`
  (okno swapów rośnie teraz codziennie, heap 8GB) i wrzuć liczbę do @Fable
  — chcę wiedzieć, ile mamy zapasu, zanim OOM wróci.
