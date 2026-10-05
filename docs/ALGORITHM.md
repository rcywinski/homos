# ALGORITHM.md — v1.2 (frozen 11 Aug 2026; §4 revisions: v1.1 11 Aug, v1.2 17 Aug)

> The single source of truth for strategy parameters. Changes only via an entry
> in the project decision log (see [`DECISION-LOG.md`](DECISION-LOG.md)) with a data-backed
> justification. Empirical sources: selection meta-backtest (4.4y, 231 pools),
> tick-level 5 pools (90d) + 2 pools 365d (1.88M + 1.46M swaps), walk-forward
> with regimes, cross-validation of the trend breaker (5 out-of-sample runs).
> Details: working journal entries of 10–11 Aug and research queue section B.
>
> **Final status.** v1.2 was fully implemented (§7). The 26 Aug recalibration (σ on a
> 15-minute grid, 720-day validation gate) found no configuration that passed, and the live
> tranche ran the FlatWide hybrid instead: wide passive ranges that narrow only in a
> confirmed flat (see [`DECISION-LOG.md`](DECISION-LOG.md) and
> [`CASE-STUDY.md`](CASE-STUDY.md)).

## 1. Pool selection (selector layer — bot/selector.ts)

- Ranking: **7d average apyBase** (not yesterday's top — 74.8% vs 43.0% fee-APR
  in the meta-backtest), **persistence ≥3d** in the 2N zone.
- Filter: **majors-only** (confirmed 3×: meta-backtest, 5-pool table,
  tick-level WTAO — exotic beta of −70%/yr crushes the LP alpha of +7 pp),
  TVL ≥ $3M, uniswap-v3, chain mainnet/Base.
- Rotation: max 1/day; only when the edge covers the 0.3% switching cost
  within ≤10 days. OPEN: max 2/day, 7d cooldown for rejected candidates.
- Exotic sleeve: **0%** (decision of 10 Aug, confirmed after the units fix).

## 2. Position range (advisor — src/utils/advisor.ts)

- Width: **w = k · σ_daily · √7d**, where **k = 3** for ETH/stable pairs
  (365d walk-forward: k3 h24 the only configuration with positive mean+median
  in both windows; gate ≥2 regimes passed). Clamp: 1%–60%.
- **Correlated-pair exception (cbBTC/WETH): k = 2** (365d: k2h24 +11.4 pp vs HODL
  vs k3 +5.5 pp — narrower relative volatility justifies a narrower range).
- Mainnet with capital ≤$25k: prefer passive wide (±50%) or nothing at all —
  $8 gas per cycle eats active management (5-pool table).

## 3. Rebalance trigger

- Out of range for **≥24h** (hysteresis; h24 > h12 on 4/5 pools) AND
- payback: the rebalance cost (gas + swap) must be recovered from trailing
  fee-yield within **≤7 days**.

## 4. Trend breaker for downtrends (new in v1; owner's decision of 11 Aug)

- Profile (v1.1, ETH/stable): **exit(HL7d, 5%) + return above EMA (re>EMA)**.
  Detector: EMA of the pair's relative log-price, half-life 7d; DOWN signal
  when log(P/EMA) < −5%. Action: **close the position to cash 50/50**; return
  to LP only once the price is back above the EMA (confirmed rebound).
- cbBTC/WETH exception: pure exit (signal clears at −2.5%, no above-EMA
  condition) — on the correlated pair a faster return won (+0.88 vs +0.61).
- Decision history: on the morning of 11 Aug pure exit was chosen based on
  90d runs (4 windows — too little statistical power); after pulling 365d for
  base-005 and mainnet-005 (22 windows each) re>EMA wins on 4/5 pools by mean
  and tail (base-005: +1.20 / 68% win rate / worst −2.52 — **the first full
  pass of the gate win rate ≥65 ∧ worst >−3 in the project**; mainnet-005:
  +0.73/59%/−1.74). Revision approved by the owner ~14:30.
- Rejected: widen (no effect), block (harmful), two-level vg+t2
  (overfit to base-030).
- **v1.2 (17 Aug, owner's decision): for base-weth-usdc-030 the trend
  breaker = hedge-excess** — on a DOWN signal the LP position stays (keeps
  collecting fees) and a short ETH-perp neutralises the ETH excess above 50%
  of value (adjustments at deviation >15%, taker ~5 bps, funding per market —
  historically +2.9%/yr in favour of the short). Rationale: the only
  configuration that closes the gate on base-030 in both windows
  (45d: 73%/−2.88; 60d: 81%/−2.74; previously worst −8…−12).
  Rejected: hedge-full (quasi-macro-short — down 83–100% win rate, but up
  negative, tail remains, means inflated by a down-skewed sample); hedge on
  mainnet (whipsaw) and on the 005 pools (excess weak there — anomaly noted).
  Operationally this required a perp venue (Phase 4 operational research:
  Hyperliquid/GMX — account, minimum size, liquidation risk); until then the bot
  emitted EXIT_TREND for base-030 as well (exit = the executable fallback for the
  hedge). Final state: a one-signature GMX v2 short builder (tested end to end on 20 Aug) exists and
  base-030 runs with `trendAction: 'hedge'` in `bot/config.ts` (propose-only).
- Accepted cost: the later return misses the start of the rebound (a few
  tenths of a pp on some pools). The tail is not fully removed; the full
  delta-neutral hedge (Phase 4) was never completed.

## 5. Fee collection (collect)

- Collect when uncollected fees > **8× the gas cost of collect** (UI
  threshold; threshold arithmetic — compounding yields ~1–2 pp/yr).
  Originally 50×, lowered after practice (decision of 10 Aug).

## 6. Portfolio (revision of 11 Aug; the original candidate list is in [`PAIRS.md`](PAIRS.md))

- Core: WETH/USDC 0.3% Base — active (k=3, h24, trend breaker; hedge-excess from v1.2).
- cbBTC/WETH 0.05% Base — active k=2. Note: the pair is 100% crypto beta
  (HODL −51%/yr in 2025/26), so the sleeve size is a decision about exposure, not
  about LP quality (+11.4 pp vs HODL, the best of all pools).
- Mainnet: passive ±50% only, or nothing.
- Pegged pairs (stable-stable/LST/BTC-BTC): researched (`backtest/pegged.ts`) but never
  added; the live tranche (27 Aug – 21 Sep) used only the two Base pools above.

## 7. Parameter rollout (single source of truth)

All three places were updated:

- `backtest/strategies.ts` — `volAdaptive(k3,h24,pb7)` + `volAdaptiveTrend(exit)`.
- `src/utils/advisor.ts` — `ADVISOR_PARAMS.k = 3`; the per-pool override is the
  `advisorK` field in the pool configuration (k=2 for the cbBTC pairs).
- `bot/config.ts` / `bot/observer.ts` — the same values per pool, the trend breaker on the
  bot side (per-pool EMA state) with `trendAction` (`exit` | `hedge`) and `trendReentry`.

## 8. Known limitations of v1

- The absolute gate (win rate ≥65 ∧ worst >−3 across windows) does not pass
  globally — it passes within regimes (flat/up). The down tail is reduced
  ~2×, not to zero.
- base-005/mainnet-005 validated on only 4 windows (90d) at freeze time; to be repeated
  after the 365d refetch (HyperSync, minutes).
- 60d windows: weaker tail reduction (a long trend fits inside the window) —
  the trend breaker does not protect against a multi-month bear market;
  that was meant to be the role of the Phase 4 hedge.
