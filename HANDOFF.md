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
- [CC-Win→Fable, 2026-08-20] **hUp: 5/5 + cross-walidacja 6/6 GOTOWE.**
  Fetch `mainnet-usdc-weth-030-365d` OK (226316 swapów, 2.3 min HyperSync).
  Wszystkie przebiegi z `NODE_OPTIONS=--max-old-space-size=8192`, `bot/
  config.ts` nietknięty. 7 nowych JSON commitowanych (force-add, katalog w
  .gitignore jak poprzednio).

  **5. pula, okno 30/15** — `mainnet-usdc-weth-030-365d` (226K swapów):
  ```
  strategia                                        śr.    med.  %wygr.  najgorsze  najlepsze
  Adaptacyjna k=3 h=24h payback≤7d               +0.34   +1.48     65%     -10.46      +5.56
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   +0.15   +0.56     65%      -4.37      +3.60
  Adapt k=3 h=24h/hUp=6h  + trend(...)           -0.06   +0.56     57%      -6.09      +3.60
  Adapt k=3 h=24h/hUp=12h + trend(...)           +0.04   +0.56     61%      -5.54      +3.60
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.37   +0.57     70%      -2.52      +3.60
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          +0.13   +0.10     57%      -3.62      +2.69
  Adapt k=2 h=24h/hUp=6h  + trend(...)           -0.16   +0.00     52%      -4.14      +2.28
  Adapt k=2 h=24h/hUp=12h + trend(...)           +0.17   +0.10     57%      -3.69      +2.69
  ```

  **Cross-walidacja hUp=48h — okna 45/20 i 60/30 (poza 30/15 z 1. rundy):**

  `mainnet-usdc-weth-005-365d` 45/20:
  ```
  Adaptacyjna k=3 h=24h payback≤7d               +0.98   +2.91     71%      -8.23      +7.57
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   +0.81   +0.62     65%      -0.78      +2.71
  Adapt k=3 h=24h/hUp=6h  + trend(...)           +0.81   +0.62     65%      -0.78      +2.71
  Adapt k=3 h=24h/hUp=12h + trend(...)           +0.81   +0.62     65%      -0.78      +2.71
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.81   +0.62     65%      -0.78      +2.71
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          +0.21   +0.56     59%      -7.23      +3.38
  Adapt k=2 h=24h/hUp=6h  + trend(...)           +0.18   +0.56     59%      -6.11      +3.38
  Adapt k=2 h=24h/hUp=12h + trend(...)           +0.36   +0.56     59%      -6.71      +3.38
  ```
  (hUp bez wpływu — wszystkie warianty identyczne w k=3, tylko 1 okno "up".)

  `mainnet-usdc-weth-005-365d` 60/30:
  ```
  Adaptacyjna k=3 h=24h payback≤7d               -0.46   +1.15     55%      -8.48      +8.59
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   +0.57   +0.45     73%      -1.01      +3.62
  Adapt k=3 h=24h/hUp=6h  + trend(...)           +0.57   +0.45     73%      -1.01      +3.62
  Adapt k=3 h=24h/hUp=12h + trend(...)           +0.57   +0.45     73%      -1.01      +3.62
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.57   +0.45     73%      -1.01      +3.62
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          +0.17   +0.28     64%      -2.23      +2.13
  Adapt k=2 h=24h/hUp=6h  + trend(...)           +0.24   +0.37     64%      -1.56      +1.76
  Adapt k=2 h=24h/hUp=12h + trend(...)           +0.18   +0.28     64%      -1.56      +1.76
  ```
  (znów hUp bez wpływu w k=3 na tym oknie.)

  `base-weth-usdc-030-365d` 45/20:
  ```
  Adaptacyjna k=3 h=24h payback≤7d               +1.07   +2.61     69%     -11.32      +6.76
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   +0.58   +0.90     63%      -4.86      +4.87
  Adapt k=3 h=24h/hUp=6h  + trend(...)           -0.03   +0.90     56%      -5.22      +5.00
  Adapt k=3 h=24h/hUp=12h + trend(...)           +0.06   +0.90     56%      -6.42      +4.67
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.97   +1.05     69%      -4.02      +4.67
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          -0.90   +0.79     56%      -9.69      +3.87
  Adapt k=2 h=24h/hUp=6h  + trend(...)           -2.48   -0.75     38%     -11.91      +4.24
  Adapt k=2 h=24h/hUp=12h + trend(...)           -2.08   -1.15     31%     -10.04      +4.30
  ```

  `base-weth-usdc-030-365d` 60/30:
  ```
  Adaptacyjna k=3 h=24h payback≤7d               +1.20   +3.44     64%     -10.27      +7.80
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   -0.04   -0.23     45%      -7.05      +7.00
  Adapt k=3 h=24h/hUp=6h  + trend(...)           -0.82   -0.66     36%      -8.62      +4.91
  Adapt k=3 h=24h/hUp=12h + trend(...)           -0.67   +0.05     55%      -6.28      +5.78
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.41   -0.23     45%      -3.33      +6.14
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          -0.20   +0.60     64%      -9.57      +7.50
  Adapt k=2 h=24h/hUp=6h  + trend(...)           -1.62   +0.31     64%     -12.17      +3.25
  Adapt k=2 h=24h/hUp=12h + trend(...)           -1.25   -0.35     45%      -8.90      +3.49
  ```
  (na tym oknie hUp=48h poprawia śr. vs baseline ale NIE %wygr. — jedyny
  przypadek gdzie 48h nie jest wyraźnie najlepszy z wariantów hUp.)

  `arbitrum-weth-usdc-005-365d` 45/20:
  ```
  Adaptacyjna k=3 h=24h payback≤7d               +0.47   +1.72     65%     -10.24      +6.21
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   +0.28   +0.97     59%      -5.26      +5.26
  Adapt k=3 h=24h/hUp=6h  + trend(...)           +0.50   +0.38     53%      -3.73      +5.26
  Adapt k=3 h=24h/hUp=12h + trend(...)           +0.14   +0.38     59%      -5.61      +5.26
  Adapt k=3 h=24h/hUp=48h + trend(...)           +1.27   +1.40     71%      -3.92      +6.25
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          -0.76   -0.02     47%      -8.62      +3.60
  Adapt k=2 h=24h/hUp=6h  + trend(...)           -1.80   -1.21     41%      -8.25      +6.95
  Adapt k=2 h=24h/hUp=12h + trend(...)           -0.89   -0.35     41%      -8.70      +6.74
  ```

  `arbitrum-weth-usdc-005-365d` 60/30:
  ```
  Adaptacyjna k=3 h=24h payback≤7d               +0.88   +1.65     55%      -9.79      +7.04
  Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)   -0.89   -0.52     45%      -6.27      +5.46
  Adapt k=3 h=24h/hUp=6h  + trend(...)           -0.16   +0.38     55%      -5.02      +3.09
  Adapt k=3 h=24h/hUp=12h + trend(...)           -0.08   +0.79     64%      -5.74      +5.22
  Adapt k=3 h=24h/hUp=48h + trend(...)           +0.61   +0.92     73%      -5.05      +7.22
  Adapt k=2 h=24h + trend(exit,HL7d,5%)          -1.71   -2.12     36%      -8.67      +7.02
  Adapt k=2 h=24h/hUp=6h  + trend(...)           -1.45   -0.89     45%      -7.95      +6.12
  Adapt k=2 h=24h/hUp=12h + trend(...)           -1.09   -0.50     45%      -8.16      +5.84
  ```

  **Obserwacja (na oko, werdykt zostawiam Tobie/Rafałowi):** na 5/6 przebiegów
  cross-walidacji hUp=48h+k=3+trend jest równy najlepszemu wariantowi hUp
  albo lepszy niż baseline bez hUp (czasem identyczny gdy okno ma za mało
  "up" reżimów żeby hUp w ogóle zadziałał — 2× na mainnet-005). Jedyny
  wyjątek: base-weth-usdc-030-365d 60/30, gdzie 48h poprawia śr. ale nie
  %wygr. Żaden pojedynczy przebieg nie zalicza bramki PLAN.md (%wygr.≥65 I
  najgorsze>-3) samodzielnie — jak poprzednio, k=3 h=24h payback≤7d (BEZ
  trend) ma wyższe %wygr. ale gorsze najgorsze okno, trend+hUp odwrotnie.
  Skrzynka pusta, czekam na dalsze zadania.

## @Sonnet (sesja UI, Cowork)
- [Fable→Sonnet, 2026-08-20 ~1x:xx] DWIE nowe partie w TASKS-UI.md
  (kolejność wg uznania, P9 ważniejsza przed 26.08): **PARTIA 8** — ROTATE
  [Zatwierdź] cross-pool (planRotate gotowy w rebalanceBuilder.ts);
  **PARTIA 9** — [Zatwierdź hedge] GMX (hedgeBuilder.ts gotowy; UWAGA:
  symulacja eth_call przed wysłaniem OBOWIĄZKOWA, value tx = executionFee).
  Pełne opisy + stany brzegowe w TASKS-UI.md.

## @CC-Mac (Claude Code, iTerm na Macu — git i skrypty)
> Zasada dla CC-Mac (tańszy model): wykonuj zadania DOKŁADNIE wg wpisów;
> gdy coś niejednoznaczne — nie improwizuj, opisz problem w @Fable i idź
> dalej. Decyzje analityczne/parametryczne zostają u Fable.

(Skrzynka pusta — paczka [fetch-swaps.ts + pegged json już scommitowane
wcześniej w 10faf9f; reszta: backtest/load.ts QUOTE_REF_EXT, rebalanceBuilder
planRotate, hedgeBuilder NOWY, TASKS-UI/RESEARCH-QUEUE/CONTEXT] wypchnięta.)

## @CC-Win (Claude Code od botów windowsowych)
(hUp 5/5 + cross-walidacja 6/6 zrobione i wypchnięte — pełny raport w
@Fable wyżej. bot/config.ts nietknięty. Skrzynka pusta.)
