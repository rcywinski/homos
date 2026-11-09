# TASKS-LIFECYCLE.md — pełny lifecycle puli (pomysł Rafała 25.08, spec 26.08)

> Decyzja przeglądu 26.08: SPEC teraz, BUDOWA dopiero PO wdrożeniu paczki
> rekalibracyjnej (TASKS-RECAL.md) — lifecycle ma działać na nowej σ,
> bramce 720d+recent90 i ujednoliconej histerezie, nie na starych.
> Dotyka: selector / candidate-funnel / paper / UI.

## Maszyna stanów puli

niezbadana → kolejka → zwalidowana (PASS) / odrzucona (FAIL)
→ probacja-paper → aktywna (propozycje OPEN) → zdegradowana

## Kroki (za 11g + uzupełnienia z dyskusji)

1. **Wejście do rankingu** (jak dziś): top wg mediany 7d apyBase,
   persystencja ≥3 dni, TVL ≥ $3M.
2. **Auto-walidacja** (jak dziś, lejek): walkforward na oknie z
   TASKS-RECAL §3 (720d + recent 90d); max 1 kandydat/noc; werdykt
   trwały z algoVersion.
3. **PASS → AUTOMATYCZNIE do paper** (dziś ręczne): paper nic nie
   ryzykuje; reguła "PASS ≠ auto-dodanie KAPITAŁU" zostaje. Limit
   slotów paper: 8, priorytet wg APY (wypychanie najsłabszej
   nieaktywnej przy przepełnieniu).
4. **Probacja operacyjna 5–7 dni** — metryka NIE-zyskowa (lekcja FOMO
   24–25.08): fees w tempie zgodnym z backtestem (np. ≥50% predykcji),
   rebalanse jak w modelu, brak anomalii danych (stats/staleness).
   Dopiero po probacji bot wystawia propozycje OPEN dla tej puli.
5. **Propozycja OPEN = wszystkie bramki NARAZ**: PASS ważny (algoVersion
   zgodny) + probacja zaliczona + wciąż eligible w rankingu + brak
   istniejącej pozycji.

## Lifecycle w dół

- Wypadnięcie z rankingu/TVL → po X dniach (default 14) pula wypada
  z paper (slot się zwalnia); pozycje realne NIE są ruszane automatem.
- Zmiana algoVersion unieważnia PASS (jest) → pula wraca do kolejki.
- FAIL re-walidacji → out.

## Rewalidacja odrzuconych (notatka Rafała 25.08, 11g.f)

- FAIL-e dzielone na STRUKTURALNE (głęboko pod bramką: winPct<50 albo
  worst<−8 — bez retestu; np. mainnet 0.01%) i GRANICZNE (winPct≥55
  albo worst>−5): graniczne dostają `retestAfter` (+30–60 dni), lejek
  retestuje automatycznie po terminie (koszt ~0 — cache przyrostowy).
- UI: ⛔ z dopiskiem "retest za Xd" dla granicznych.
- Warunek recent 90d w bramce (TASKS-RECAL §3) częściowo realizuje ten
  sam cel od strony werdyktu.

## UI (partia Sonneta, po budowie backendu)

- Stany maszyny na kartach rankingu/kandydatów (rozszerzenie Partii 12).
- Karta probacji: dni w paper, fees vs predykcja, anomalie.
