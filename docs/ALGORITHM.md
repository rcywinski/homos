# ALGORITHM.md — v1.2 (frozen 2026-08-11; §4 revisions: v1.1 11 Aug, v1.2 17 Aug)

> The single source of truth for strategy parameters. Changes ONLY via an entry
> in the project decision log (see docs/DECISION-LOG.md) with a data-backed
> justification. Empirical sources: selection meta-backtest (4.4y, 231 pools),
> tick-level 5 pools (90d) + 2 pools 365d (1.88M + 1.46M swaps), walk-forward
> with regimes, cross-validation of the circuit breaker (5 out-of-sample runs).
> Details: project journal entries 2026-08-10/11 and research queue section B
> (private working journal, not published).

## 1. Pool selection (selector layer — bot/selector.ts)

- Ranking: **7d average apyBase** (not yesterday's top — 74.8% vs 43.0% fee-APR
  in the meta-backtest), **persistence ≥3d** in the 2N zone.
- Filter: **majors-only** (confirmed 3×: meta-backtest, 5-pool table,
  tick-level WTAO — exotic beta of −70%/yr crushes the LP alpha of +7 p.p.),
  TVL ≥ $3M, uniswap-v3, chain mainnet/Base.
- Rotation: max 1/day; only when the edge covers the 0.3% switching cost
  within ≤10 days. OPEN: max 2/day, 7d cooldown for rejected candidates.
- Exotic sleeve: **0%** (decision 2026-08-10, confirmed after the units fix).

## 2. Position range (advisor — src/utils/advisor.ts)

- Width: **w = k · σ_daily · √7d**, where **k = 3** for ETH/stable pairs
  (365d walk-forward: k3 h24 the only configuration with positive mean+median
  in both windows; gate ≥2 regimes passed). Clamp: 1%–60%.
- **Correlated-pair exception (cbBTC/WETH): k = 2** (365d: k2h24 +11.4 vsHODL
  vs k3 +5.5 — narrower relative volatility justifies a narrower range).
- Mainnet with capital ≤$25k: prefer passive wide (±50%) or nothing at all —
  $8 gas per cycle eats active management (5-pool table).

## 3. Rebalance trigger

- Out of range for **≥24h** (hysteresis; h24 > h12 on 4/5 pools) AND
- payback: the rebalance cost (gas + swap) must be recovered from trailing
  fee-yield within **≤7 days**.

## 4. Downtrend circuit breaker (NEW in v1 — owner's decision 2026-08-11)

- Profile (v1.1, ETH/stable): **exit(HL7d, 5%) + return above EMA (re>EMA)**.
  Detector: EMA of the pair's relative log-price, half-life 7d; DOWN signal
  when log(P/EMA) < −5%. Action: **close the position to cash 50/50**; return
  to LP only once the price is BACK ABOVE the EMA (confirmed rebound).
- cbBTC/WETH exception: pure exit (signal clears at −2.5%, no above-EMA
  condition) — on the correlated pair a faster return won (+0.88 vs +0.61).
- Decision history: on the morning of 11 Aug pure exit was chosen based on
  90d runs (4 windows — too little statistical power); after pulling 365d for
  base-005 and mainnet-005 (22 windows each) re>EMA wins on 4/5 pools by mean
  AND tail (base-005: +1.20 / 68% win rate / worst −2.52 — **the first full
  pass of the gate win rate ≥65 ∧ worst >−3 in the project**; mainnet-005:
  +0.73/59%/−1.74). Revision approved by the owner ~14:30.
- Rejected: widen (no effect), block (harmful), two-level vg+t2
  (overfit to base-030).
- **v1.2 (17 Aug, owner's decision): for base-weth-usdc-030 the circuit
  breaker = HEDGE-EXCESS** — on a DOWN signal the LP position STAYS (keeps
  collecting fees) and a short ETH-perp neutralises the ETH excess above 50%
  of value (adjustments at deviation >15%, taker ~5 bps, funding per market —
  historically +2.9%/yr IN FAVOUR of the short). Rationale: the only
  configuration that closes the gate on base-030 in BOTH windows
  (45d: 73%/−2.88; 60d: 81%/−2.74; previously worst −8…−12).
  Rejected: hedge-full (quasi-macro-short — down 83–100% win rate, but up
  negative, tail remains, means inflated by a down-skewed sample); hedge on
  mainnet (whipsaw) and on the 005 pools (excess weak there — anomaly noted).
  OPERATIONALLY: requires a perp venue (research F4-op: Hyperliquid/GMX —
  account, min size, liquidation risk); UNTIL THEN the bot emits EXIT_TREND
  for base-030 as well (exit = the executable fallback for the hedge).
- Accepted cost: the later return misses the start of the rebound (a few
  tenths of a p.p. on some pools). The tail is NOT fully removed — the hedge
  (F4) remains an open front.

## 5. Fee collection (collect)

- Collect when uncollected fees > **8× the gas cost of collect** (UI
  threshold; threshold arithmetic — compounding yields ~1–2 p.p./yr).
  Historically 50×, lowered after practice (decision log, 2026-08-10).

## 6. Portfolio (docs/PAIRS.md, after the 2026-08-11 revision)

- Core: WETH/USDC 0.3% Base — active (k=3, h24, exit circuit breaker).
- cbBTC/WETH 0.05% Base — active k=2; NOTE: the pair = 100% crypto beta
  (HODL −51%/yr in 2025/26), sleeve size = a decision about exposure, not
  about LP quality (alpha vsHODL +11.4, best of all pools).
- Mainnet: passive ±50% only, or nothing.
- Pegged pairs (stable-stable/LST/BTC-BTC): verdict after F.A/F.B (in progress).

## 7. Parameter rollout (single source of truth)

- [x] backtest/strategies.ts — volAdaptive(k3,h24,pb7) + volAdaptiveTrend(exit).
- [ ] src/utils/advisor.ts ADVISOR_PARAMS: k 2→3 (per-pool k=2 for cbBTC —
  requires a field in the pool configuration); circuit breaker: TODO bot-side
  (the observer needs per-pool EMA state — separate task, research queue
  section E, private working journal).
- [ ] bot/config.ts: the same values per pool.

## 8. Known limitations of v1

- The absolute gate (win rate ≥65 ∧ worst >−3 across windows) does not pass
  globally — it passes within regimes (flat/up). The down tail is reduced
  ~2×, not to zero.
- base-005/mainnet-005 validated on only 4 windows (90d) — repeat after the
  365d refetch (HyperSync, minutes).
- 60d windows: weaker tail reduction (a long trend fits inside the window) —
  the circuit breaker does not protect against a multi-month bear market;
  that is the role of F4.
