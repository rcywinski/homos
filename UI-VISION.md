# UI-VISION.md — docelowy kształt aplikacji: autopilot + poranny kokpit

> Data: 2026-08-10 · Źródło: wymagania właściciela + uzupełnienia
> Zasada nadrzędna: użytkownik zagląda RAZ DZIENNIE rano. Wszystko inne dzieje się
> samo albo czeka w kolejce decyzji. Wgląd od ogółu (finanse) do szczegółu (pozycja).

## 1. Architektura: kto co robi

```
┌─────────────┐   pisze stan    ┌──────────────┐   czyta stan   ┌──────────────┐
│  BOT (24/7) │ ──────────────► │ SQLite + logi│ ◄────────────── │  UI (React)  │
│  daemon Node│                 └──────────────┘                │ tylko podgląd │
│  na Mac/VPS │ ◄── zatwierdzenia propozycji (semi-auto) ────── │ + zatwierdzaj │
└─────────────┘                                                 └──────────────┘
```

**KLUCZOWE (brakowało w wymaganiach):** przeglądarka nie może być silnikiem
automatyki — zamknięty laptop = martwy autopilot. Bot to osobny proces
(`packages/bot`, Faza 3/4; prekursorem jest dzisiejszy agent-runner). Docelowo
mały VPS (~$5/mies.) żeby nie zależeć od włączonego Maca.

## 2. Pętle automatyki (wymaganie → mechanizm)

| Częstotliwość | Zadanie | Uwagi |
|---|---|---|
| co 1 min | monitor cen/ticków obserwowanych pul | tanie odczyty RPC; podstawa "zakresów na bieżąco" |
| co 15 min | przelicz sygnały doradcy (vol, fee-yield, zakresy) | te same wzory co advisor.ts/backtest |
| raz dziennie (rano, przed Twoim wejściem) | ranking najzyskowniejszych pul + propozycje rotacji | dzisiejszy Pool Scanner, zautomatyzowany |
| **8:00 rano** | **analiza newsów/rynku → "postawa ryzyka" dnia** | risk-on: normalne zakresy; risk-off (FOMC, krach, depeg-scare): szersze zakresy / większa rezerwa / wstrzymanie rotacji; realizacja: zaplanowane zadanie Claude (WebSearch) piszące MORNING.md + push, bot czyta postawę jako parametr |
| wg sygnału | otwarcie/rebalans/zamknięcie pozycji | tryb A: propozycja do zatwierdzenia; tryb B: auto w limitach |
| wg progu | zbiór nagród (collect) gdy fees > próg opłacalności gazu | auto-compound do pozycji albo do rezerwy |
| po każdej akcji | zapis do księgi (SQLite) + eksport CSV | podatki PL: każda akcja = zdarzenie podatkowe |

## 3. Ekrany (od ogółu do szczegółu)

### 3.1 PORANNY BRIEF (ekran startowy — 30 sekund czytania)
- **Nagłówek finansowy**: wartość całkowita · PnL 24h/7d/od startu · **vs HODL 50/50**
  (bez tego nie wiesz, czy automat w ogóle ma sens!) · fees zebrane wczoraj · koszty wczoraj (gas+slippage).
- **Kolejka decyzji** (tryb semi-auto): karty propozycji "Rebalans #953465 → $1800–$2400,
  koszt $0.9, payback 2.1 dnia [Zatwierdź] [Odrzuć] [Szczegóły]" — rano klikasz 2–3 razy i po sprawie.
- **Alerty z nocy**: co bot zrobił sam / co go zaniepokoiło (spike zmienności, wyjście z zakresu).
- **Sugestie rotacji**: "cbBTC/WETH Base płaci 2.3× więcej niż Twoja pula X — rozważ przeniesienie
  (koszt przejścia $Y, zwróci się w Z dni)" — zawsze z kosztem przejścia i marginesem (rotacja tylko
  gdy przewaga > próg, inaczej wieczne skakanie).
- **Wskaźnik niepewności/dywersyfikacji**: gdy zmienność wysoka → sugestia przesunięcia wag
  do stable-sleeve/szerszych zakresów; miernik koncentracji portfela (np. % w jednej parze).

### 3.2 POZYCJE (poziom 2)
- Lista aktywnych: para/sieć, wartość, zakres jako pasek z markerem ceny, in-range %,
  fees narosłe, APR pozycji od otwarcia, mini-sparkline 24h.
- Szczegół pozycji: **oś czasu zdarzeń** (otwarcie → rebalansy → collecty, każdy z kosztem
  i skutkiem), wykres ceny z nałożonymi historycznymi zakresami, PnL rozłożony na
  fees − IL − koszty (dekompozycja z silnika backtestu).

### 3.3 AUTOPILOT (ustawienia i bezpieczeństwo)
- Tryb per pula: OBSERWUJ / PROPONUJ (semi-auto) / AUTO — z osobnymi limitami.
- Limity globalne: max USD na transakcję, max transakcji/dzień, max % kapitału w jednej puli.
- **KILL-SWITCH**: wielki czerwony przycisk "zamknij wszystko do stable" + auto-trigger
  na depeg stablecoina i anomalie.
- Zdrowie systemu: heartbeat bota, świeżość danych, status RPC (redundancja), saldo gazowe.

### 3.4 KSIĘGA (poziom 3)
- Pełna historia transakcji z kursami z chwili wykonania, filtry, **eksport CSV do PIT**.
- Statystyki strategii: ile propozycji zatwierdzonych/odrzuconych, skuteczność sygnałów
  (do kalibracji parametrów doradcy wynikami z życia).

## 3.5 Polityka rotacji "najsłabsza pozycja → lepsza okazja" (doprecyzowanie)

Ranking pozycji po **realizowanym APR netto** (fees − koszty, od otwarcia i trailing 7d).
Kandydat do zamknięcia: najsłabsza pozycja, jeśli istnieje pula, gdzie
`oczekiwany_APR_nowej − APR_obecnej` pokryje pełny koszt przejścia (wyjście + wejście
+ slippage + gas) w ≤ N dni (parametr, start: 10). Dodatkowe bezpieczniki:
max 1 rotacja dziennie, nowa pula musi mieć ranking-przewagę utrzymaną ≥3 dni
(nie jednodniowy spike), rotacja wstrzymana przy postawie risk-off.

O "unikaniu IL": IL nie da się wyłączyć — to koszt bycia LP. Bot go MINIMALIZUJE
przez: szerokość zakresu ∝ zmienność, histerezę (nie rebalansuje na whipsaw),
warunek payback, sleeve skorelowany (cbBTC/ETH) i stable, a docelowo hedge (F6).
Proporcje tokenów przy otwarciu liczy SDK dokładnie pod wybrany zakres —
"balansowanie ilości walut" dzieje się automatycznie przy każdym wejściu/rebalansie.

## 4. Czego jeszcze brakowało w wymaganiach (uzupełnienia)

1. **Alerty natychmiastowe (Telegram/push)** — "raz dziennie rano" działa tylko, jeśli
   sytuacje awaryjne budzą Cię od razu: depeg, awaria bota, dziwny ruch ceny >X%,
   nieudana transakcja. Nocny krach nie może czekać do kawy.
2. **Benchmark vs HODL wszędzie** — automat, który zarabia mniej niż trzymanie tokenów,
   to strata czasu i gazu; ta liczba musi być na samej górze.
3. **Ścieżka zaufania do automatu**: OBSERWUJ → PROPONUJ → AUTO per pula (zgodnie
   z wcześniejszą decyzją pół-auto → full-auto). Nie włączamy AUTO, dopóki tryb PROPONUJ
   nie pokaże przez 2–4 tygodnie, że propozycje były trafne.
4. **Koszt rotacji przy "lepszej ofercie"**: przenosiny puli tylko gdy przewaga pokrywa
   koszt wyjścia+wejścia z marginesem — inaczej bot będzie wiecznie gonił króliki.
5. **Zarządzanie rezerwą**: nie 100% kapitału w pozycjach; bufor stable na gaz,
   okazje i spokojny sen (parametr, np. 10–15%).
6. **Księgowość podatkowa od pierwszego dnia** — przy automacie liczba transakcji
   rośnie 10×; ręczne odtwarzanie historii po roku to koszmar.
7. **Bezpieczeństwo klucza bota**: dedykowany hot wallet z kapitałem operacyjnym,
   limity kwotowe w bocie, reszta na zimnym portfelu; approvals tylko na znane kontrakty.
8. **Kalibracja parametrów z życia**: bot loguje każdy sygnał i jego skutek — po miesiącu
   porównujemy z backtestem (czy rzeczywistość zgadza się z symulacją).

## 5. Mapa wdrożenia (spójna z PLAN.md)

| Krok | Co | Zależy od |
|---|---|---|
| A | Dashboard read-only: poranny brief (dane z przeglądarki, bez bota) + pasek zakresu, PnL vs HODL | UI-sesja (Sonnet) + advisor.ts (jest) |
| B | Parametry doradcy skalibrowane backtestem | dane F1 (w trakcie pobierania) |
| C | Bot-daemon w trybie OBSERWUJ (loguje sygnały, nic nie robi) | A, B |
| D | Tryb PROPONUJ: kolejka decyzji w UI, Ty zatwierdzasz w Rabby | C |
| E | Tryb AUTO w limitach + kill-switch + alerty Telegram | D + 2-4 tyg. zaufania |
| F | Hedge delta-neutral (Faza 4 planu) | E |
