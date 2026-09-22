# HOMOS — case study

*One engineer, six weeks, ~$6k of real capital, and a question that got a clear answer.*

## 1. The question

Uniswap v3 lets a liquidity provider concentrate capital in a price range and earn a larger
share of fees while the price stays inside it. Every LP dashboard shows attractive APRs.
The question I wanted to answer with my own money was narrower than "can you make money as an
LP": **is there a rules-based strategy — no discretion, no forecasting — that beats holding the
same two tokens 50/50, after fees, slippage, gas and impermanent loss, across market regimes?**

If yes, it is a product. If no, every APR on those dashboards is compensation for a risk you are
taking anyway.

## 2. What I built (August 2026)

The repository had existed since 2024 as a hobby UI for adding liquidity on Sepolia. In August
2026 I audited it and found the math was wrong in every layer: prices computed on JavaScript
floats (precision lost above 2^53), liquidity formulas that ignored where the current price sat
relative to the range, raw and human units mixed — all masked by a hard-coded 20–25 % slippage
tolerance. Decision #1 was a rewrite of the core rather than a repair.

Over the next four weeks, working with four specialised AI sessions coordinated through the repo
(see `AI-WORKFLOW.md`), I built:

- **`v3math.ts`**: tick ↔ sqrtPrice ↔ liquidity ↔ amounts on `bigint`, verified against
  `@uniswap/v3-sdk` bit-for-bit on 2 925 generated cases. This module is shared by the backtester,
  the bot and the UI, so there is exactly one implementation of the math.
- **A swap-level data layer**: HyperSync pulled a year of a pool's swaps in ~13 minutes; DefiLlama
  supplied APY/TVL history for pool selection. Everything is cached and reproducible.
- **A backtesting engine** with an explicit *validation gate*: a strategy passes only if, on
  walk-forward windows over 720 days plus a recent-90-day condition, it beats HODL 50/50 in a
  sufficient share of windows with a bounded worst window. The gate was designed before the
  strategies, so it could not be tuned to them.
- **An observer bot** running 24/7 on a Windows machine: prices, position tracking, a
  volatility estimator, a flat-regime detector, a trend circuit breaker, a daily pool selector,
  a paper-trading harness and a transaction ledger — all in *propose-only* mode. Proposals are
  cards in a cockpit UI; the owner signs in a wallet or dismisses. The bot never held a key.
- **Operations**: NSSM services, a nightly pipeline, a 07:30 morning report committed to the
  repo and mirrored to Telegram, an emergency runbook, and a tranche balance panel that
  reconciled on-chain positions, wallet buffer and entry costs to the cent.

## 3. What the backtests said

The first calibration (365 days of data, a mostly sideways-to-down year) produced a frozen
`ALGORITHM.md v1`: narrow ranges at k×σ, rebalance when out of range for 24 h with payback ≤ 7 days,
exit on a 5 % break below the 7-day EMA. It passed the gate on one pool.

Then two things happened that I consider the most valuable part of the project:

1. **The volatility estimator was measuring pool microstructure, not the asset.** The same ETH
   produced σ estimates that differed 4.5× between pools. Every k calibrated in those units was
   calibrated in broken units. The fix (a 15-minute sampling grid) and a full recalibration had to
   be done together.
2. **Extending the window to 720 days killed the strategy.** On the longer history, which
   included a strong uptrend, **0 of 21 configurations passed the gate**. The 365-day year had
   flattered range-bound strategies. Five independent ways of measuring it (13 pool scan,
   an analytical "wide score", Monte Carlo, a daily model, and full-period replays) agreed:
   a passive wide range ≈ HODL + fees − a little IL, and narrowing added variance without
   adding expectancy at the flat-episode lengths actually observed (median 7.7 days).

At this point the honest engineering conclusion was already available. The rest of the project
was about verifying it with real capital under real operational constraints — which I think was
worth doing once, at a size where a mistake costs a dinner, not a car.

## 4. Live capital (27 Aug – 21 Sep 2026)

I deposited 6 092 USDC on Base and, rather than the frozen narrow strategy, ran the hybrid the
data supported: **FlatWide** — wide passive ranges (±50 % WETH/USDC, ±40 % WETH/cbBTC) that
narrow to ±5 % only in a confirmed flat. Rules I set before entering and wrote down:

- The bot proposes; I sign only between 09:00 and 20:00 on weekdays. The trend-breaker alarm
  runs 24/7.
- A weekly review with a written decision log. Every parameter change needs evidence from the
  backtester, not from the last few days of live PnL.
- An exit rule, decided while calm, with a date.

What actually happened:

- **The narrowing experiment (31 Aug → 11 Sep).** The flat detector fired on the cbBTC leg. I signed
  the narrowing as an explicit n = 1 operational experiment (the backtests said it should not
  pay). It sat in range for 11 days and earned ≈ $8.6 in fees, then the trend breaker closed it at
  −$32 versus HODL. The backtests were right; the live system worked exactly as designed,
  including a two-transaction rebalance whose first attempt reverted on a slippage check because
  the UI had priced the mint from a stale pool state — found, fixed, and documented the same day.
- **The tranche balance had to be built.** The cockpit initially showed PnL from position anchors,
  which under-stated the tranche by the wallet buffer and entry costs. I added a reconciliation
  from the deposit down to gas, then found and diagnosed a $35 drift caused by a ten-minute
  sampling gap around a rebalance. Accounting is where most of the "bugs" in this kind of system
  live.
- **The exit rule was revised three times in one week**, each time in the direction of the
  current market mood: on 2 Sep "exit on 24 Sep regardless, or earlier at +5 %"; on 16 Sep, the
  day after a drop, "exit at break-even, 24 Sep is a review, floor at −10 %"; on 18 Sep, when
  break-even was hit and the LP was unwound at **+0.6 %**, "keep the tokens as a spot bet with a
  −5 % floor and a 24 Oct review"; on 21 Sep, in a short-squeeze rally with BTC at a widely
  flagged resistance, "sell everything today". I sold. The tranche closed at **+5.5 %** in 25
  days, of which the strategy contributed +0.6 % and three days of unhedged beta the rest.

I am recording that sequence because it is the most instructive part of the case study.
Every revision was documented at the time, with a note that it was being made under the bias it
was being made under, and the AI session I used for analysis pushed back on each one in writing.
The outcome was good. The process was not a method, and the decision log says so.

## 5. Conclusions

**On the strategy.** For ETH/stable and ETH/BTC pairs, concentrated liquidity did not beat
HODL 50/50 out of sample. The fee income is real but it is paid for with convexity: you sell
into rallies and buy into drawdowns, and in a trending year that costs more than fees earn.
A wide passive range is an acceptable *wrapper* for exposure you want anyway (it is HODL plus a
few percent a year of fees), but it is not a source of alpha, and narrowing to chase APR is
negative expectancy unless flat episodes are much longer than the ones observed.

**On methodology.** Three things saved this project from becoming an expensive lesson instead of
a cheap one: a validation gate defined before the strategies; extending the backtest window until
the result stopped flattering the idea; and refusing to let live PnL change parameters. The one
place discipline slipped — the exit rule — is exactly where discretion crept back in, and it is
worth noticing that it slipped in the direction of "hold" both after a drop and after a rise.

**On engineering.** The parts I would reuse anywhere: a single wei-exact math module shared by
every layer, reference tests against the canonical implementation, a propose-only execution
model with a human signature as the last step, a reconciliation panel that starts from the
deposit rather than from positions, and a decision log that records the *reason* and the
*evidence* next to each decision.

**On the AI-assisted workflow.** Four Claude sessions with distinct roles, coordinated through
a living journal and hand-off inboxes in the repo, let one person run analysis, coding, a
Windows server and a UI in parallel. It worked because the roles were narrow and every session
had to read the journal before acting and write to it after. It failed in small, instructive
ways when a session skipped that step. Details in `AI-WORKFLOW.md`.

## 6. What I would do differently

- Start with 720 days of data and the gate, before writing a single strategy.
- Build the tranche reconciliation on day one, from the deposit down.
- Write the exit rule with a date **and** a floor **and** a ceiling before deploying capital, and
  make changing it require a written note that names the direction of the change.
- Skip the narrow-range product entirely; if I wanted LP exposure, run the wide range and treat
  the fees as a small yield on a HODL position.

## 7. Numbers, for the record

| Item | Value |
|---|---|
| Capital deployed | 6 092 USDC on Base, 27 Aug 2026 |
| LP phase result (27 Aug – 18 Sep) | +0.6 % (+$38), ≈ $29 of it fees |
| Narrowing experiment | 11 days, ≈ $8.6 fees, −$32 vs HODL at close |
| Post-LP spot exposure (18 – 21 Sep) | ≈ +$300 |
| Final (21 Sep, in EUR on exchange) | ≈ +5.5 % (+$336), 25 days |
| Total round-trip costs (gas, swaps, exchange fees) | ≈ $25 |
| Backtest verdict | 0 / 21 configurations pass the 720-day gate |
| Reference tests | 2 925 (v3 math) + 14 (backtest engine) |
| Commits | ~580 over 15 months, ~500 of them in Aug–Sep 2026 |
