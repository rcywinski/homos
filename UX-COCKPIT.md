# UX-COCKPIT.md — architektura informacji i akcje użytkownika (v1)

> Zasada projektowa: aplikacja jest zbudowana wokół JEDNEGO cyklu dziennego
> (poranny rzut oka + ewentualna decyzja), nie wokół funkcji Uniswapa.
> Wszystko, co wykonuje transakcję, ZAWSZE kończy się podpisem w Rabby
> z czytelnym podsumowaniem (kwoty, minimum po slippage, koszt) — UI niczego
> nie wysyła samo. Automat pełny przyjdzie z botem (tryb AUTO), nie z UI.

## 1. Hierarchia ekranu (od góry)

### A. KOKPIT (zawsze widoczny, rozwinięty)
1. **Pasek finansowy**: wartość łączna · PnL 24h/7d (gdy będzie księga) · fees
   do zebrania · kropka zdrowia bota.
2. **Propozycje bota** — karta propozycji z DWOMA przyciskami:
   - **[Zatwierdź]** → sekwencja transakcji rebalansu do podpisania w Rabby
     (patrz §3 — wymaga nowego buildera, faza PROPONUJ),
   - **[Odrzuć]** → dismiss (już działa).
3. **Pozycje — karty z akcjami inline** (przeniesione z zakładki MyPositions):
   - pasek zakresu + wartość + rekomendacja doradcy (jest),
   - **[💰 Zbierz fees]** — aktywny gdy fees > próg opłacalności (50× gaz;
     poniżej progu przycisk szary z tooltipem "nieopłacalne: fees $X < próg $Y"),
   - **[⏹ Zamknij]** — modal: suwak % (25/50/100), podgląd "otrzymasz ~A USDC
     + B WETH (min. po slippage: …)", opcja "zamień wszystko na USDC" (dodatkowy
     swap = dodatkowy podpis), potwierdzenie → Rabby,
   - **[🔄 Rebalans ręczny]** — prefill formularza Add Liquidity zakresem doradcy
     (do czasu buildera z §3: zamknij + otwórz jako dwie osobne operacje).
4. **Telemetria bota** (zwijana — Partia 3).

### B. ZARZĄDZAJ (zwinięte domyślnie — dawne sekcje, zdegradowane, NIE skasowane)
- **Otwórz nową pozycję** = obecny AddLiquidity (potrzebny, dopóki bot nie
  wchodzi w pule sam; także do sleeve'ów ręcznych),
- **Przeglądarka pul** (obecne Uniswap V3 Pools + Top Pools) = narzędzie
  eksploracyjne — zostaje, bo to jedyne miejsce wyboru puli dla nowej pozycji,
- **Transaction History** — zostaje tymczasowo; DOCELOWO zastąpi ją Księga
  czytana z SQLite bota (pełna historia z kursami, eksport CSV do podatków) —
  wtedy stary komponent kasujemy.

### C. USTAWIENIA (⚙ — jest) + docelowo panel Autopilota (tryby per pula,
limity, KILL-SWITCH "zamknij wszystko do USDC" z podwójnym potwierdzeniem).

## 2. Inwentarz akcji użytkownika (kompletna lista)

| Akcja | Gdzie | Status |
|---|---|---|
| Zbierz fees (ręcznie) | karta pozycji | jest w MyPositions → przenieść na kokpit + próg opłacalności |
| Zamknij pozycję % / całość | karta pozycji → modal | logika jest (Remove) → nowy modal z podglądem kwot |
| Wyjdź całkiem do USDC | modal zamknięcia (opcja swap) | NOWE (swap przez router po decrease) |
| Zatwierdź propozycję rebalansu | karta propozycji | NOWE — builder §3 (start fazy PROPONUJ) |
| Odrzuć propozycję | karta propozycji | działa |
| Otwórz nową pozycję | Zarządzaj → AddLiquidity | działa |
| Rebalans ręczny wg doradcy | karta pozycji | prefill AddLiquidity (proste) |
| Kill-switch | Ustawienia/kokpit | faza AUTO (wymaga bota-egzekutora) |
| Auto-collect fees | bot (tryb AUTO) | przyszłość; do tego czasu przycisk ręczny |

## 3. Builder rebalansu (praca dla sesji analitycznej — NIE dla sesji UI)
Zatwierdzenie propozycji = 2–3 podpisy w Rabby, sekwencyjnie z paskiem postępu:
1. `multicall` na NFT managerze: `decreaseLiquidity` + `collect` (jedna tx —
   manager wspiera multicall),
2. swap wyrównujący proporcje pod nowy zakres (router, exact-in, min-out
   ze slippage) — pomijany, gdy proporcje są wystarczająco blisko,
3. `mint` nowego zakresu (ticki z propozycji bota).
Po każdej tx: zapis do księgi. Failure w środku sekwencji = stan bezpieczny
(środki w cash na walletcie), UI pokazuje "dokończ krok 2/3".

## 4. Czego NIE robimy (świadomie)
- Żadnego przycisku, który wysyła transakcję bez Rabby (do czasu fazy AUTO
  z dedykowanym portfelem operacyjnym na serwerze).
- Nie kasujemy starych sekcji przed zastąpieniem ich odpowiednikami (Księga).
- Nie dodajemy wykresów cenowych na kokpit (jest sparkline w planach pozycji —
  poziom 2); kokpit ma być czytelny w 30 sekund.

## 5. Kolejność wdrożenia
1. (UI/Sonnet — Partia 3): telemetria + przeniesienie akcji Zbierz/Zamknij na
   karty kokpitu + modal zamknięcia z podglądem kwot + prefill rebalansu ręcznego.
2. (Fable): builder rebalansu §3 + progi collect + zapis do księgi (SQLite po
   stronie bota, endpoint POST /api/ledger).
3. (UI/Sonnet — Partia 4): Księga w UI (tabela + CSV) → usunięcie starego
   Transaction History; opcja "wyjdź do USDC".
4. (po okresie OBSERWUJ): przycisk [Zatwierdź] przechodzi z "przygotuj tx"
   na pełną sekwencję PROPONUJ.
