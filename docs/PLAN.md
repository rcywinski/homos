# HOMOS v2 — Project plan: Automated Liquidity Manager (ALM)

> Created: 2026-08-10
> Status: PLAN — approved direction, before implementation starts
> Parameters agreed with the owner: capital $5k–$25k · network: to be chosen after backtesting · hedging: in stages · execution: semi-auto → full-auto

---

## 1. Project goal

An application for automated liquidity management in pairs such as WETH/USDC on Uniswap (v3/v4), used privately, generating profit from LP fees by:

1. Setting price ranges algorithmically (width depending on volatility),
2. Rebalancing only when it is mathematically worthwhile,
3. Automatically collecting and reinvesting rewards (compounding),
4. (Later phase) delta-neutral hedging limiting exposure to ETH declines.

**Overriding principle: backtesting first, production code second.** A strategy that does not beat the HODL 50/50 benchmark on historical data does not go to mainnet.

---

## 2. Critical section: why the old application computed wrong numbers

Analysis of the code in `src/utils/` showed that the discrepancy against the Uniswap interface **was not a matter of "BigInt plugins"**, but of systematically computing Uniswap v3 math on floating-point numbers instead of integers. The specific bugs:

### 2.1. Overflow when converting sqrtPriceX96 (README, UniswapPool)

```ts
const sqrtPriceX96 = JSBI.toNumber(pool.sqrtRatioX96); // BUG
```

`sqrtPriceX96` is a number of up to 160 bits. A JavaScript `Number` safely holds only 53 bits (`Number.MAX_SAFE_INTEGER ≈ 9×10^15`). For the WETH/USDC pair sqrtPriceX96 is of the order `10^27`–`10^33` — the `toNumber` conversion loses precision or corrupts the value entirely. On top of that, the formula in the README **does not account for the decimals correction at all** (USDC has 6, WETH has 18 — a difference of 10^12!), so the result was meaningless regardless of precision.

### 2.2. A hand-written "PositionLike" instead of the SDK (`liquidityManagement.ts:createPosition`)

The biggest problem. The code creates its own position object and computes liquidity with the formula:

```ts
const liquidityValue = Number(parsedAmount1) / (sqrtUpperPrice - sqrtLowerPrice); // BUG x4
```

Four bugs in one line:
- `Number(parsedAmount1)` — converting wei (18 decimals) to float loses precision above 2^53,
- the formula is **incomplete**: the correct v3 formula depends on where the current price sits relative to the range — when the price is in range, `L = min(L₀, L₁)` where `L₀ = amount0·(√P·√Pᵤ)/(√Pᵤ−√P)` and `L₁ = amount1/(√P−√Pₗ)`. The code ignores the current price entirely,
- it mixes **raw units** (wei, 6-decimal USDC) with **human-readable prices** after the decimals correction — the units do not match,
- `CurrencyAmount.fromRawAmount(pool.token0, Number(parsedAmount0))` — float again.

Effect: `mintAmounts` inconsistent with what the contract would compute → transactions reverted → and hence…

### 2.3. The 20–25% slippage "patch" (proof that the amounts were wrong)

`prepareAddLiquidityTransaction` contains a special path for USDC/WETH with a **minimum slippage of 20%** ("USDC/WETH pair requires much higher slippage"). This is a classic symptom: the mint amounts were computed wrong, so the only way to get the contract to accept the transaction was to effectively disable slippage protection. The real USDC/WETH pair has the deepest liquidity in the world — a correctly computed transaction goes through with 0.1–0.5% slippage.

### 2.4. `calculateOptimalAmounts` — wrong proportion formula

`amount1 = amount0 · (√Pᵤ − √Pₗ)` — the current price √P is missing from the formula (correctly: the proportion depends on `(√P−√Pₗ)` and `(1/√P − 1/√Pᵤ)`); moreover raw units with different decimals are multiplied together and "clipped" with an arbitrary 2x cap. That is why the auto-fill of the second token showed different values than Uniswap.

### 2.5. Hard-coded price and no tests

- `calculatePoolPrice` for Sepolia returns a hard-coded `1900`,
- `package.json`: `"test": "echo \"Error: no test specified\""` — zero tests on financial code.

### 2.6. Conclusions for v2

1. **All math exclusively on `bigint`** (native in ES2020; JSBI unnecessary). Float allowed only in the display layer.
2. **Do not reimplement v3 formulas.** Use `@uniswap/v3-sdk`: `Position.fromAmounts()`, `Position.fromAmount0()`, `pool.token0Price` — the SDK computes identically to the contract and to the Uniswap interface. Own formulas only in the backtesting simulator — and there tested 1:1 against the SDK.
3. **Unit tests with reference values**: for known on-chain positions (tokenId → amounts) the result of our code must equal, to 1 wei, what Uniswap shows. That is the definition of "it works".
4. The UI/UX layer of the old application is conceptually worth keeping (ranges, gas estimate, positions), but the component code is entangled with the broken math — cheaper to rewrite on a clean core.

---

## 3. What was missing from the previous AI's suggestions

The suggestions (delta-neutral, rebalance cost > IL+gas, L2, backtesting) are correct but incomplete. The gaps, ordered from most important:

### 3.1. LVR — naming the enemy properly

The LP's main adversary is not "IL" in general, but **LVR (Loss-Versus-Rebalancing)**: the loss to arbitrageurs who trade against your position at a stale price on every market move. Research shows that most LPs in ETH/stablecoin pairs **lose to simple HODL**, because fees do not cover LVR. Practical conclusion: profitability depends on the **quality of flow in the specific pool** (the ratio of "organic" to arbitrage volume), not just on the APR displayed in the interface. Pool selection = the first algorithmic decision, before any range.

### 3.2. Choosing the fee tier and pool is a separate optimisation problem

WETH/USDC exists in the 0.05% and 0.3% tiers (and on v4 in variants with hooks). The metric to compare: **fees generated daily / TVL in the active range** (not total TVL). The 0.05% tier usually has several times more volume — it often wins despite the lower rate. This must be computed by the backtest, not by intuition.

### 3.3. Uniswap v4 and competing DEXes

The suggestions only mentioned v3. In 2026 **Uniswap v4** is live (singleton architecture — cheaper gas on rebalances, hooks, native ETH without wrapping). Also worth considering: Aerodrome (Base) or PancakeSwap v3. The v3 vs v4 decision will go into the backtest; the SDK APIs are similar. *(The state of liquidity in individual pools to be verified on live data in Phase 1.)*

### 3.4. Funding rate is not only a cost — it can be income

In a delta-neutral strategy a short on perps **receives** funding when the market is bullish (positive funding — and historically it is positive most of the time). A well-designed hedge can be a second source of income, not a cost. But the AI omitted hedge risks: **liquidation of the short position** on a pump (margin management!), basis risk, venue risk. With $5k–25k of capital the sensible venue choices are Hyperliquid / GMX / CEX — to be compared on funding, fees and minimum sizes *(verification in Phase 4)*.

### 3.5. MEV and execution

Rebalance = swap → the bot will be sandwiched regularly if it sends transactions through the public mempool. Required: private RPC / protected transactions, slippage limits computed from the current pool depth, deadlines. On L2 the problem is smaller than on mainnet, but non-zero.

### 3.6. The rebalance policy is richer than "went out of range → move it"

Gaps in the proposed profitability condition:
- **Hysteresis / buffer zones**: rebalance only when the price exceeds the range by X% or stays outside it for T minutes (protection against whipsaw),
- **Market regime filter**: in a strong trend it is better to *wait* outside the range (a position 100% in one token pays no fees, but also realises no further IL on the return); in a sideways trend rebalance faster,
- **Range asymmetry**: the range does not have to be symmetric around the price — it can be shifted in line with the expected drift,
- **Width ∝ volatility**: range width scaled by realised volatility (e.g. EWMA/ATR), not a rigid ±5%,
- **Compounding frequency**: collecting fees also costs gas — the optimal interval depends on position size (for $10k on L2 probably every few days, to be computed).

### 3.7. Backtest quality decides everything

The biggest trap: **a backtest on candles (OHLC) systematically overstates LP profits**, because it does not see the price path inside the candle nor the actual volume distribution across ticks. Requirements:
- simulation on **swap-by-swap** data (`Swap` events from the pool — available via subgraph/RPC/public datasets) at least for final validation; candles acceptable for preliminary strategy selection,
- modelling our own impact: our fee = our liquidity's share of the active tick (at $5–25k in a deep pool negligible, but this has to be known, not assumed),
- costs in the simulation: gas (real L2 prices), swap fee on rebalance, slippage, (in F4) funding,
- **walk-forward, not curve-fitting**: parameters tuned on period A, validated on B; tested across different regimes (2024 bull run, declines, sideways),
- mandatory benchmarks: HODL 50/50, HODL 100% ETH, passive full-range, passive wide ±50%, and public results of ALMs (Arrakis/Gamma/Charm) as the "was it worth building at all" check.

### 3.8. Operational risks omitted entirely

- RPC failure / blind bot → provider redundancy + watchdog + alerts (Telegram/push),
- **kill-switch**: global stop + "exit to stablecoin" mode,
- USDC depeg risk (March 2023!) — monitoring the stablecoin price as a stop condition,
- key security: dedicated hot wallet with operating capital, minimal approvals (permit2 / approvals for exact amounts), the rest of the capital on a separate wallet,
- Polish taxes: every swap/rebalance transaction is a taxable event — the bot must log everything to CSV (rate, date, fee) from day one.

### 3.9. Realistic expectations

With $5k–25k in WETH/USDC on L2, a well-managed concentrated position realistically yields **mid-teens to 30% gross fee APR** in good conditions; net of LVR/costs noticeably less. Delta-neutral with positive funding can improve this. The backtest will verify the numbers — but we do not plan for "100% APR", because that leads to excessive concentration and losing to whipsaw.

---

## 4. Where the profit comes from — the objective function

```
Net profit = LP fees
           + Funding from the hedge (may be ±)
           − LVR / realised IL
           − Gas (rebalance, collect, compound)
           − Slippage of rebalancing swaps
           − Hedge venue costs
```

Levers of maximisation, in order of impact:
1. **Pool/tier selection** (fee-per-TVL-in-range, flow quality) — the biggest lever, zero cost,
2. **Concentration** (narrow range = fee multiplier, but also an IL multiplier and more frequent rebalances) — the optimum is determined by the backtest per volatility regime,
3. **Rebalance policy** (hysteresis + profitability condition + trend filter) — protects against giving fees back,
4. **Compounding** at the optimal interval,
5. **Hedge** — reduces the variance of the result (and drawdowns), with a chance of positive funding.

---

## 5. Target architecture

Monorepo (pnpm workspaces), TypeScript everywhere — one language, shared types and **one math module** used by the backtest, the bot and the UI (no more discrepancies between layers):

```
homos/
├── CONTEXT.md               ← living project journal (section 8) — private working journal, not published
├── PLAN.md                  ← this document (now docs/PLAN.md)
├── packages/
│   ├── core/                ← F0: v3/v4 math, bigint ONLY, zero UI dependencies
│   │   ├── src/math/        (tick↔price, liquidity, amounts, fee growth)
│   │   ├── src/strategy/    (range width, rebalance conditions, hedge sizing)
│   │   └── test/            (tests vs SDK and on-chain reference values)
│   ├── data/                ← F1: data fetching (subgraph, RPC, prices, gas, funding)
│   │   └── cache/           (local cache — never download the same thing twice)
│   ├── backtest/            ← F1: swap-by-swap simulator + HTML reports
│   ├── bot/                 ← F2/F3: 24/7 keeper (monitor → decision → proposal/execution)
│   └── ui/                  ← F2: dashboard (positions, PnL vs benchmarks, bot proposals)
└── docs/
```

**Architectural decisions:**
- **No own smart contract / vault** at this capital size. Positions as standard Uniswap NFTs on our own wallet. An own vault = audit costs and risk disproportionate to $5–25k. Revisit only if the strategy required atomicity (rebalance+hedge in one tx).
- **Semi-auto execution (F3):** the bot builds a ready transaction → notification → signature in Rabby (WalletConnect). We will check the Rabby↔Claude integration as an approval channel — if it works, it shortens the loop.
- **Full-auto (F4):** dedicated hot wallet (key in env on the bot machine), per-transaction and per-day amount limits, kill-switch, minimal approvals.
- Bot backend: Node/TS as a simple daemon (pm2/systemd) on any VPS or home machine; database: SQLite (sufficient).

---

## 6. Implementation phases

### Phase 0 — Mathematical foundation (no risk, no funds)
**Goal: a core we trust to 1 wei.**
- [ ] Monorepo setup, move the old code to `legacy/` (reference, not foundation),
- [ ] `packages/core/math`: tick↔price (bigint), liquidity↔amounts (full v3 formulas with the current price), fee growth, position value in USD,
- [ ] Tests: 1:1 agreement with `@uniswap/v3-sdk` + verification on real mainnet positions (on-chain read → comparison with the Uniswap interface),
- [ ] **Exit gate: values identical to app.uniswap.org for your existing positions.**

### Phase 1 — Data + backtesting (the most important phase of the project)
**Goal: proof (or refutation) of the strategy's profitability before spending 1 cent on gas.**
- [ ] `packages/data`: fetching swap and fee history for candidate pools (Arbitrum, Base, mainnet; tiers 0.05/0.3; v3 and v4) — subgraph + RPC events + local cache,
- [ ] Simulator: a virtual position walks through the swap history; accrues fees, IL, gas, slippage,
- [ ] Strategies to compare: (a) passive benchmarks, (b) rigid ±X% with simple rebalance, (c) width ∝ volatility + hysteresis + profitability condition, (d) variant with trend filter and asymmetry,
- [ ] Walk-forward + report: net APR, max drawdown, number of rebalances, parameter sensitivity,
- [ ] **Exit gate: a chosen network+pool+strategy with a result better than HODL 50/50 in ≥2 market regimes.** If nothing beats the benchmark — we stop and think instead of deploying.

### Phase 2 — Dashboard + live monitoring (read-only)
- [ ] UI: your real positions (you already have open pools — we will connect them right away), PnL vs benchmarks, range vs price chart, hedge health (later),
- [ ] Bot in **observer** mode: computes signals live and logs "what it would do" (paper trading) — comparison with the backtest,
- [ ] Telegram alerts: price at the range edge, rebalance signal, anomalies.

### Phase 3 — Semi-automatic execution
- [ ] Transaction builder (mint/increase/decrease/collect/swap) + `eth_call` simulation before sending,
- [ ] Flow: signal → ready tx with rationale and numbers → approval in Rabby → tracking,
- [ ] Accounting: every move to SQLite + CSV export (taxes),
- [ ] After 2–4 weeks of paper-trading agreeing with reality → F4.

### Phase 4 — Full-auto + delta-neutral hedging
- [ ] Dedicated hot wallet, limits, kill-switch, watchdog, RPC redundancy,
- [ ] Hedge module: venue choice (Hyperliquid vs GMX vs CEX — comparison of funding/fees/min size on current data), dynamic delta matching with a tolerance band (rehedge only at deviation > threshold — cost vs accuracy), margin management with an anti-liquidation buffer,
- [ ] Backtest of the combined strategy (LP + hedge + funding) before launch,
- [ ] Gradual capital increase: start ~$2k, scale after a month of clean results.

---

## 7. Division of work among agents (and token discipline)

Structure follows the packages — each agent has a narrow scope and its own context file:

| Agent | Scope | Context files |
|---|---|---|
| **Core/Math** | `packages/core` — formulas, reference tests | `CONTEXT.md` + `packages/core/NOTES.md` |
| **Data/Backtest** | `packages/data`, `packages/backtest` — data, simulator, reports | `packages/backtest/NOTES.md` |
| **Bot/Execution** | `packages/bot` — keeper, tx builder, alerts, hedge | `packages/bot/NOTES.md` |
| **UI** | `packages/ui` — dashboard | `packages/ui/NOTES.md` |
| **Reviewer** | cross-reviews: math correctness, tx security, tests | — |

(`CONTEXT.md` was the private working journal, not published.)

Token-saving rules:
1. **CONTEXT.md is the single source of truth about the project state** — every session starts by reading it (not by re-exploring the repo) and ends with an entry: what was done, what broke, next step (private working journal, not published),
2. Working sessions = one task from one phase; no "while I'm at it I'll fix the UI",
3. An agent reads only its own package + `core` (interfaces),
4. The Reviewer is invoked selectively (before phase gates), not continuously,
5. Large data downloads → once, into `packages/data/cache/`, never again.

---

## 8. Main risks (summary)

| Risk | Mitigation |
|---|---|
| Strategy does not beat HODL | Gate after F1 — we do not deploy; cost = time, not capital |
| Whipsaw eats capital through rebalances | Hysteresis + profitability condition + daily rebalance limits |
| Hedge liquidation on a pump | Margin buffer, auto-deleverage, alerts; hedge only in F4 |
| Stablecoin depeg | Monitoring + kill-switch to exit |
| Hot wallet key leak | Operating capital limited, limits, separate wallet for the rest |
| Backtest overfitting | Walk-forward, ≥2 market regimes, "round" parameters not tuned to the 4th decimal place |
| Bot/RPC failure | Watchdog, redundancy, position safe even without the bot (wider range in F2/F3) |

---

## 9. First steps (next working session)

1. Monorepo setup + moving legacy,
2. `core/math`: tick↔price + liquidity↔amounts on bigint,
3. Reference test on your real mainnet position (NFT position address → our numbers == Uniswap UI),
4. Entry in the project journal (private working journal, not published).
