# SELECTOR-LOG.md — dziennik trafności selektora pul

> Cel: po ~2 tyg. ocenić, czy propozycje selektora (ranking DefiLlama 7d →
> lejek tick-level → bramka) są trafne, zanim przejdziemy z OBSERWUJ do
> PROPONUJ (RESEARCH-QUEUE §C). Wpis = data, propozycja, APY z rankingu,
> werdykt walidacji/decyzja, ocena po czasie (uzupełniana później).

| Data | Propozycja | APY 7d (ranking) | Werdykt / decyzja | Ocena po czasie |
|---|---|---|---|---|
| 2026-08-17 | OPEN WETH-USDT 0.01% mainnet | 11.0% | ODRZUCONA przez walidację tick-level (365d, 22 okna: wszystkie strategie ujemne vs HODL, worst −10…−12) — lejek zadziałał | ✅ poprawnie odrzucona (walidacja danymi) |
| 2026-08-18 | OPEN WETH-CBBTC 0.05% @ Base | 25.2% | Pula JUŻ zwalidowana (bramka PASS oba okna, profil czysty exit k=2) — propozycja spójna z walidacją; wykonanie = decyzja kapitałowa (faza OBSERWUJ) | — |
| 2026-08-18 | OPEN WETH-USDC 0.3% @ Base | 20.0% | Pula zwalidowana WARUNKOWO (bramka tylko z hedge-excess, v1.2); wykonawczo hedge niezintegrowany → fallback EXIT_TREND | — |
| 2026-08-18 | ROTATE #953427 (mainnet-030, $2.08) → WETH-CBBTC Base, "payback 4.8d" | 25.2% | BŁĘDNA — bug paybacku (liczony %-owo, bez wartości USD pozycji i gazu; realny koszt ~$8 gaz mainnet > 4× wartość pozycji). Fix w bot/selector.ts 18.08 (koszt w USD + próg MIN_ROTATE_USD=$25) | ✅ bug złapany 1. dnia pomiaru |
| 2026-08-19 | OPEN USDC-WETH 0.01% @ Ethereum | 21.9% | **ODRZUCONA przez walidację tick-level** (walkforward 365d, 22 okna, commit 135a155): najlepsza strategia 55% wygr. (próg ≥65), najgorsze okno −18.0 (próg >−3); warianty z bezpiecznikiem 0% wygr. Ten sam wzorzec co WETH-USDT 0.01% z 17.08 | ✅ lejek odrzucił 2. kandydata (2/2 mainnet 0.01% odpada mimo top APY) |
| 2026-08-19 | OPEN WETH-USDT 0.05% @ Ethereum | 13.1% | BEZ walidacji na razie — jeden kandydat naraz; niższe APY od USDC-WETH 0.01%, ten sam mainnet-gaz handicap. Obserwacja | — |
| 2026-08-19 | ROTATE #953427 — sam POMINIĘTY przez selektor | — | "$2.07 < $25" (próg MIN_ROTATE_USD z fixu 18.08) — wczorajszy bug już się nie powtarza | ✅ próg ekonomiczny działa 1. dnia po fixie |

Uwagi:
- Ranking 18.08 identyczny jak 17.08 (te same dane źródłowe — ręczny fetch:llama
  CC-Win z 17.08 12:11; pipeline 07:30 padł, patrz CONTEXT 18.08).
- Kanał Telegram potwierdzony na żywo 18.08 08:24 (3 propozycje na telefonie).
- Ranking 19.08 (06:41Z) — top5: WETH-CBBTC@Base 25.5%, USDC-WETH@Ethereum 21.9%,
  WETH-USDC@Base 19.3%, WETH-USDT@Ethereum 13.1%, WETH-USDT@Ethereum 12.2%.
  PIERWSZY ranking na świeżych danych z automatu (universe.json 1.2h —
  fetch-llama w pipeline przeszedł dzięki fixowi shell:true). Swap-fetch
  HyperSync padł (brak @envio-dev/hypersync-client w node_modules na Windows —
  naprawione `npm install`, pierwszy pełny test 20.08). Streak=6 dla całego
  top10. `.bot/selector-ranking.json` istnieje → /api/ranking żywe.
- Wzorzec po 2 walidacjach (17.08 WETH-USDT 0.01%, 19.08 USDC-WETH 0.01%):
  headline APY pul mainnet tier 0.01% NIE przeżywa walidacji tick-level
  (wąski tier = ciągłe wypadanie z zakresu + gaz mainnet zjada rebalanse).
  Po ewentualnym 3. takim odrzuceniu → propozycja parametryczna: wykluczyć
  mainnet 0.01% z propozycji OPEN selektora (decyzja Rafała, nie teraz).
