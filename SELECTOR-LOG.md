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

Uwagi:
- Ranking 18.08 identyczny jak 17.08 (te same dane źródłowe — ręczny fetch:llama
  CC-Win z 17.08 12:11; pipeline 07:30 padł, patrz CONTEXT 18.08).
- Kanał Telegram potwierdzony na żywo 18.08 08:24 (3 propozycje na telefonie).
