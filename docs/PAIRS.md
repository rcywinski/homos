# Pair and pool analysis — LP portfolio diversification

> Date: 2026-08-10 · Data: app.uniswap.org/explore (live snapshot, block ~0x188820d)
> Status: entry to Phase 1 — candidates for backtesting, NOT investment decisions.
> Methodological note: Uniswap's "Pool APR" = fees/TVL of the whole pool, annualised
> on a 1D basis — this is the average for a passive full-range position. A concentrated
> position can earn a multiple of that APR, but a 1-day snapshot can be misleading.
> The persistence of these APRs will only be verified by a backtest on 30–90 days of data.

## 1. Key finding: your current pool is a weak choice

Both of your positions sit in **mainnet ETH/USDC v3 0.3%** — a pool that no longer even
makes the top 20 by TVL on Ethereum. Liquidity and volume have flowed to the 0.05% tier
and to v4. Comparison (same pair, same moment):

| Pool | TVL | Pool APR | 1D vol/TVL |
|---|---|---|---|
| **ETH/USDC v3 0.3% mainnet (yours)** | outside top20 | ~2-3% | low |
| ETH/USDC v3 0.05% mainnet | $98.0M | **8.53%** | 0.62 |
| ETH/USDC v3 0.3% **Base** | $120.8M | **14.92%** | 0.16 |
| ETH/USDC v3 0.05% Base | $10.6M | 4.32% | 0.32 |
| ETH/USDC v4 0.3% mainnet | $28.6M | 2.70% | 0.02 |

Conclusion no. 1: merely changing the pool (without any algorithm!) can multiply the fee APR.

## 2. Market snapshot — best candidates by category

### A. ETH/stable (core of the strategy)
| Pool | TVL | APR | vol/TVL | Comment |
|---|---|---|---|---|
| ETH/USDC v3 0.3% **Base** | $120.8M | **14.92%** | 0.16 | The strongest ETH/stable pool in the ecosystem; cheap gas |
| ETH/USDT v3 0.3% mainnet | $81.1M | **10.50%** | 0.12 | Stablecoin diversification (USDT instead of USDC) |
| ETH/USDC v3 0.05% mainnet | $98.0M | 8.53% | 0.62 | Largest absolute volume ($61M/day) |
| ETH/USDC v4 0.05% Arbitrum | $4.0M | 5.45% | 0.30 | v3 on Arbitrum has dried up (0.65%!), volume moved to v4 |

### B. Correlated BTC/ETH pairs (lower IL — correlation ~0.7–0.9)
| Pool | TVL | APR | vol/TVL | Comment |
|---|---|---|---|---|
| **cbBTC/ETH v3 0.05% Base** | $5.5M | **13.06%** | **0.95** | Best volume-to-TVL ratio in the whole set |
| cbBTC/ETH v4 0.05% Base | $2.5M | 5.51% | 0.30 | |
| WBTC/ETH v3 0.05% mainnet | $43.6M | 2.39% | 0.17 | Deep, but diluted |
| WBTC/ETH v3 0.05% Arbitrum | $33.8M | 1.74% | 0.13 | |

Why this matters: when BTC and ETH move together, the relative BTC/ETH price stays
put → the position stays in range and collects fees without realising IL. This is a
structurally different risk from ETH/stable — real diversification, not a copy of the
same exposure.

### C. Stable/stable (low-risk ballast)
| Pool | TVL | APR | vol/TVL | Comment |
|---|---|---|---|---|
| USDC/USDT v4 0.0008% Arbitrum | $1.9M | 0.87% | **2.99** | Enormous turnover relative to TVL, micro-fees |
| USDC/USDT v3 0.01% mainnet | $33.1M | 0.47% | 0.17 | Boring and safe |

IL close to zero (range ±0.01–0.05%), but the APR is low. Sensible as a "parking lot"
for part of the capital, not as a profit engine. Beware of depeg risk — the only real
risk here.

### D. Alt/ETH — high APR, high risk (NOT for now)
LINK/ETH 0.3% mainnet (4.49%), ARB/ETH 0.05% Arbitrum (8.47%), VIRTUAL/TIBBIR Base
(11.18%). Higher volatility, thinner books, toxic flow, risk of −80% on the token.
To be considered only once the bot is mature, and only with a small % of the portfolio.

## 3. Portfolio sketch to be validated in the backtest (capital $5–25k)

| Sleeve | Pool (main candidate) | Weight | Role |
|---|---|---|---|
| ETH core | ETH/USDC v3 0.3% Base | ~40% | Main fee generator, cheap gas for rebalances |
| Correlated | cbBTC/ETH v3 0.05% Base | ~25% | Fees at low IL, regime diversification |
| Core #2 | ETH/USDT v3 0.3% mainnet OR ETH/USDC 0.05% mainnet | ~20% | Network + stablecoin diversification |
| Ballast | USDC/USDT (mainnet 0.01% / arb v4) or cash reserve | ~15% | Low variance, capital for rebalances |

An honest note on diversification: two ETH/USDC pools on different networks are NOT
price-risk diversification (the same ETH exposure) — they only diversify fee streams
and network/venue risk. Real risk diversification comes from: correlated pairs (B),
stables (C) and ultimately the hedge (Phase 4).

## 4. What this changes in the application and the plan

1. **Pool configuration as data, not code** — the list of pairs/tiers/networks in one
   configuration file; PoolBrowser renders from the configuration (today: 2 pairs × 4 tiers
   hard-coded, mainnet/sepolia only).
2. **Base support** in wagmi + token addresses (cbBTC, native USDC) and Uniswap contract
   addresses per network. Arbitrum optional (v3 dried up there — low priority).
3. **v4 for later** — a separate architecture (singleton, no separate pools as
   contracts); the MVP stays on v3. Note it in the plan as Phase 5.
4. **Pool Scanner** (part of the data package from Phase 1): a daily fee/TVL-in-range
   ranking for the watched pools — i.e. exactly the table above, but computed from
   on-chain data, automatically and with history instead of a 1D snapshot.
5. **Multi-pool backtest**: independent simulations per pool + a portfolio allocator
   (weights, correlations, per-network gas costs in the model).

## 5. List of pools to fetch data for in Phase 1 (final)

- mainnet: ETH/USDC 0.05%, ETH/USDC 0.3% (baseline — your current one), ETH/USDT 0.3%,
  WBTC/ETH 0.05%, USDC/USDT 0.01%
- Base: ETH/USDC 0.3%, ETH/USDC 0.05%, cbBTC/ETH 0.05%, cbBTC/USDC 0.05%
- Arbitrum (for comparison): ETH/USDC v3 0.05%
