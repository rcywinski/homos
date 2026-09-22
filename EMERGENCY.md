# EMERGENCY.md — procedura awaryjna produktu FlatWide ("czerwony przycisk")

> Decyzja Rafała 27.08 wieczór (CONTEXT dziennik 27.08, HANDOFF pkt 2):
> sygnał DOWN na pulach produktowych NIE jest wyciszony, ale też NIE jest
> rekomendacją — hybryda FlatWide **świadomie trzyma betę**. Ten dokument
> mówi, kiedy co podpisać, ile to kosztuje i w jakiej kolejności działać.
> Wszystko w trybie PROPONUJ: bot nic nie wykonuje sam.

## 0. Najpierw: KTÓRY sygnał się pali?

| Sygnał | Co mierzy | Co znaczy |
|---|---|---|
| DOWN na **WETH/USDC** (base-030) | cenę ETH w USD | **KRACH USD — dotyczy OBU nóg.** WETH i cbBTC mają wspólną betę do USD; to jest właściwy czujnik krachu dla całej transzy |
| DOWN na **cbBTC/WETH** (noga B) | cenę WZGLĘDNĄ cbBTC vs WETH | tylko relatywne osłabienie BTC vs ETH — wartość USD portfela może nawet rosnąć. To NIE jest czujnik krachu |

Przykład z historii: 19.08 EXIT_TREND na cbBTC/WETH odpalił, bo ETH
pompował +16% a BTC nie nadążał — żaden krach, czysty efekt względny.

## 1. Domyślna reakcja: NIC NIE PODPISUJ

Dane (26–27.08, ~40+ przebiegów walkforward/fullperiod):
- exit na trendzie średnio POGARSZA wynik vs trzymanie szerokiego LP
  (spóźniony sygnał + koszty + pominięte odbicia);
- cash/exit wygrywa TYLKO w silnych, długich crashach (−28…−41%),
  których nie rozpoznasz ex-ante — w pozostałych reżimach przegrywa;
- hybryda FlatWide została wybrana Z tą betą w pakiecie (hybryda ≥
  passiveW ≥ HODL na bramce; USDC najgorszy w oknach wzrostowych).

Sygnał DOWN sam w sobie = informacja, nie polecenie.

## 2. Opcja A — HEDGE delta-neutral (preferowana: ODWRACALNA, LP zostaje)

Karta „OPCJA AWARYJNA A" w kokpicie (kwoty liczone z żywej pozycji).

- **Co:** short 1× na GMX v2 (Arbitrum) na PEŁNĄ ekspozycję nogi
  zmiennej pozycji. WETH/USDC → short ETH/USD (**1 podpis w kokpicie**
  — builder przetestowany bojowo $15 E2E 20.08). Noga cbBTC → short
  BTC/USD ręcznie na app.gmx.io (builder 1-podpisowy obsługuje dziś
  tylko ETH/USD).
- **Koszt:** otwarcie+zamknięcie ~$0.5–1 gaz/keeper + funding
  (ETHUSDT hist. 750d: śr. +4.8%/r DLA shorta, 20% okresów ujemnych)
  + spread/impact przy wejściu.
- **Kiedy zamknąć:** po zgaśnięciu sygnału (WETH/USDC: cena nad EMA;
  cbBTC: gap > −2.5%). Bot pilnuje sieroty: ostrzeżenie ~1×/dobę, gdy
  short wisi bez sygnału DOWN.
- **Czego się spodziewać:** backtesty hedge(full): chroni reżim DOWN
  (66–87% wygr.) całkowicie KOSZTEM UP (0–25%) — dlatego tylko na
  sygnale, nigdy jako stała postura.

## 3. Opcja B — EXIT do cash 50/50 (ostateczność)

Karta „OPCJA AWARYJNA B" w kokpicie.

- **Koszt:** ~0.15–0.3% wartości (swap połowy + slippage) + gaz Base
  ~$0.1–1; do tego koszt ponownego wejścia po sygnale powrotu — pełny
  cykl out-and-back ~0.4–0.7% wartości pozycji.
- **Podpisuj TYLKO przy twardych kryteriach** (co najmniej jedno):
  1. depeg USDC / zdarzenie systemowe na Base lub w Uniswapie
     (wtedy exit możliwie do ETH na L1, nie do USDC),
  2. utrata zaufania do venue/kontraktu (exploit, wstrzymane wypłaty),
  3. świadoma decyzja portfelowa Rafała o zdjęciu ryzyka (nie reakcja
     na pojedynczy sygnał),
  4. hedge niedostępny (GMX nie działa, brak collateralu), a scenariusz
     krachu uznajesz za realny.
- **Powrót:** WETH/USDC — re>EMA (cena nad EMA7d); cbBTC — half
  (gap > −2.5%). Propozycje wygeneruje bot.

## 4. Kolejność czerwonego przycisku (checklist)

1. Sprawdź KTÓRY sygnał (sekcja 0). Relatywny cbBTC/WETH bez sygnału
   na WETH/USDC = zwykle ignoruj (opcjonalnie short BTC, sekcja 2).
2. Krach USD (DOWN na WETH/USDC): najpierw **opcja A** — short ETH
   na sumę ekspozycji WETH OBU nóg (kwoty na kartach; obie pule mają
   nogę WETH). Odwracalne, tanie, LP dalej zbiera fees.
3. **Opcja B** tylko przy kryteriach z sekcji 3.
4. Po zgaśnięciu sygnału: zamknij short (1 podpis). Ledger/E2 mierzy
   koszt zwłoki — podpisuj w godzinach operacyjnych, alarm działa 24/7.
5. Wpis do CONTEXT.md (co, kiedy, dlaczego, koszt) — każde użycie
   czerwonego przycisku to dane do przeglądu.

## 5. Czego ten dokument NIE obejmuje

FLAT_NARROW/FLAT_WIDEN (zwężenie/rozszerzenie w produkcie) to NIE
procedura awaryjna — to normalny cykl produktu FlatWide. FLAT_WIDEN
jest ochronny (wąska pozycja na trendzie łapie IL), ale wykonuje się
w spokojnym trybie propozycji, nie czerwonym przyciskiem.

## 6. Off-ramp: portfel → Kraken → bank (lekcje z 18.09.2026)

Nie awaryjne, ale tu, żeby było pod ręką przy każdym wyjściu kapitału.

1. **Zamknięcie LP** bezpośrednio w Uniswap („Remove liquidity" 100%)
   robi w jednym multicallu decreaseLiquidity + collect — fee wychodzą
   razem z pozycją, osobne „Collect fees" niepotrzebne. WETH wraca jako
   natywny ETH. Gaz na Base: ~$0,01 za pozycję.
2. **Depozyt na Kraken**: USDC w sieci Base i Arbitrum One księgowane
   w kilka minut, mainnet (L1) ~30–60 min. Zawsze najpierw przelew
   testowy (20 USDC), potem reszta. Ten sam adres depozytowy USDC dla
   wszystkich sieci EVM — ale sieć wybierać świadomie na ekranie
   depozytu.
3. **Wymiana USDC → EUR: TYLKO Kraken Pro → Handel → Spot → para
   USDC/EUR → zlecenie Limit** po najlepszym bidzie (opłata 0,20%,
   ~4 EUR na 2 tys.). NIE używać „Konwertuj" (Convert) — także w Pro:
   kurs gorszy o ~1,4% + opłata ~0,85% = ~2,4% łącznie (18.09: 17 EUR
   opłaty + ~25 EUR w kursie na 2 024 USDC). Nie wchodzić w „Handluj
   futures"/„Kontrakty wieczyste" — inny rynek, dźwignia.
4. **Wypłata SEPA** (Wpłata/Wypłata → Wypłać → EUR): opłata ~0,90 EUR.
   Wymaga **osobnego 2FA „dla wpłat i wypłat" (Funding 2FA)** —
   niezależnego od 2FA logowania (passkey w Hasłach Apple). Kod nie
   przychodzi SMS-em/mailem — generuje go aplikacja uwierzytelniająca
   skonfigurowana 24–25.08.2026 przy on-rampie. **Gdzie jest ten kod:
   patrz notatka we wpisie „Kraken" w Hasłach Apple** (celowo nie
   w repo). Bez tego kodu wypłata nie przejdzie; reset przez Support
   trwa 1–3 dni robocze.
5. Po sprzedaży: **Historia → Ledger → eksport CSV** (PIT-38: sprzedaż
   USDC za EUR = zdarzenie podatkowe; transfery i swapy krypto↔krypto
   nie). Zachować razem z historią tx z Rabby/Basescan z dnia wyjścia.
6. Wpis do CONTEXT.md: kwoty na wyjściu, kurs, opłaty, co zostało
   w portfelu i pod jaką regułą.
7. **Lekcje z 21.09:** depozyt z **Base** na Krakena dostaje kredyt do
   handlu w minuty, ale wypłata fiat z tych środków jest zablokowana
   („oczekiwanie na potwierdzenie sieci") do finalności L1 — godziny;
   z **Arbitrum** blokada schodzi od razu. Planować SEPA na następny
   dzień. Przy sprzedaży ETH/EUR zlecenie Limit wykonane natychmiast
   po bidzie liczy się jako **taker 0,40%** — żeby zapłacić 0,20–0,25%,
   ustawić cenę 1 tick NAD najlepszym bidem (albo „Post only") i
   poczekać kilka sekund. Na 3 000 EUR to ~6 EUR różnicy.
