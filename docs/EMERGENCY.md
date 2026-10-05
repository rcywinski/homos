_Historical runbook. The product was wound down in September 2026; kept as documentation of the operating procedure._

# EMERGENCY.md — emergency procedure for the FlatWide product ("red button")

> Owner's decision, evening of 27 Aug 2026 (working journal of that day):
> the DOWN signal on the product pools is not muted, but it is also not a
> recommendation — the FlatWide hybrid **deliberately holds beta**. This document
> says when to sign what, how much it costs and in what order to act.
> Everything runs in PROPOSE mode: the bot executes nothing on its own.

## 0. First: which signal is firing?

| Signal | What it measures | What it means |
|---|---|---|
| DOWN on **WETH/USDC** (base-030) | the ETH price in USD | **A USD crash that affects both legs.** WETH and cbBTC share a common beta to USD; this is the proper crash sensor for the whole tranche |
| DOWN on **cbBTC/WETH** (leg B) | the relative price of cbBTC vs WETH | only relative weakness of BTC vs ETH — the USD value of the portfolio may even be rising. This is **not** a crash sensor |

Example: on 19 Aug EXIT_TREND fired on cbBTC/WETH because ETH was up 16 % and BTC was not
keeping up — no crash, a purely relative effect.

## 1. Default reaction: sign nothing

Data (26–27 Aug, 40+ walk-forward and full-period runs):
- exiting on the trend signal on average **worsens** the result compared with holding the
  wide LP (late signal + costs + missed rebounds);
- cash/exit wins only in strong, long crashes (−28 … −41 %), which cannot be recognised in
  advance — in the other regimes it loses;
- the FlatWide hybrid was chosen with that beta included (hybrid ≥ passive wide ≥ HODL on
  the gate; USDC worst in up windows).

The DOWN signal by itself is information, not an order.

## 2. Option A — delta-neutral hedge (preferred: reversible, the LP stays)

Card "EMERGENCY OPTION A" in the cockpit (amounts computed from the live position).

- **What:** a 1× short on GMX v2 (Arbitrum) for the full exposure of the position's
  volatile leg. WETH/USDC → short ETH/USD (**one signature in the cockpit**; the builder
  was tested end to end with $15 on 20 Aug). The cbBTC leg → short BTC/USD manually on
  app.gmx.io (the one-signature builder handles only ETH/USD).
- **Cost:** open + close ≈ $0.5–1 in gas/keeper fees, plus funding (ETHUSDT over 750 days:
  on average +4.8 %/yr in favour of the short, negative in 20 % of periods), plus
  spread/impact on entry.
- **When to close:** once the signal clears (WETH/USDC: price back above the EMA; cbBTC:
  gap > −2.5 %). The bot watches for orphans: a warning about once a day while a short is
  open without a DOWN signal.
- **What to expect:** full-hedge backtests protect the DOWN regime (66–87 % win rate)
  entirely at the expense of UP (0–25 %) — hence only on a signal, never as a permanent
  posture.

## 3. Option B — exit to cash 50/50 (last resort)

Card "EMERGENCY OPTION B" in the cockpit.

- **Cost:** ≈ 0.15–0.3 % of value (swapping half + slippage) + Base gas ≈ $0.1–1, plus the
  cost of re-entering after the return signal; the full out-and-back cycle costs
  ≈ 0.4–0.7 % of the position value.
- **Sign only on hard criteria** (at least one):
  1. a USDC depeg or a systemic event on Base or in Uniswap
     (then exit preferably to ETH on L1, not to USDC),
  2. loss of trust in the venue or contract (exploit, withdrawals halted),
  3. a deliberate portfolio decision by the owner to take risk off (not a reaction to a
     single signal),
  4. the hedge is unavailable (GMX down, no collateral) and the crash scenario looks real.
- **Return:** WETH/USDC — price back above the 7-day EMA; cbBTC — half (gap > −2.5 %).
  The bot generates the proposals.

## 4. Red-button checklist

1. Check which signal is firing (section 0). A relative signal on cbBTC/WETH without one on
   WETH/USDC is usually ignored (optionally short BTC, section 2).
2. USD crash (DOWN on WETH/USDC): **option A** first — short ETH for the combined WETH
   exposure of both legs (amounts on the cards; both pools have a WETH leg). Reversible,
   cheap, and the LP keeps collecting fees.
3. **Option B** only on the criteria in section 3.
4. Once the signal clears, close the short (one signature). The ledger measures the cost of
   signature delay; sign during operating hours, the alarm runs 24/7.
5. Record it in the working journal (what, when, why, cost) — every use of the red button is
   data for the review.

## 5. What this document does not cover

FLAT_NARROW / FLAT_WIDEN (narrowing and widening within the product) are not emergency
procedures; they are the normal FlatWide cycle. FLAT_WIDEN is protective (a narrow position
in a trend accumulates IL), but it is signed through the normal proposal flow, not the red
button.

## 6. Off-ramp lessons

Not an emergency, but recorded here because they apply to every capital exit (the tranche
was closed to EUR on 18–21 Sep 2026):

- **Closing the LP** with "Remove liquidity" (100 %) in the Uniswap UI runs
  `decreaseLiquidity` + `collect` in one multicall, so fees come out with the position and
  a separate collect is unnecessary. Gas on Base was about $0.01 per position.
- **L1 vs L2 finality.** USDC deposited to the exchange from Base was tradable within
  minutes, but a fiat withdrawal of those funds was held until L1 finality (hours); funds
  deposited from Arbitrum cleared immediately. Plan the bank withdrawal for the next day,
  and send a small test transfer before the full amount.
- **Convert vs limit order.** The exchange's one-click "Convert" cost about 2.4 % in total
  (a worse rate plus a fee), against about 0.2 % for a limit order on the spot USDC/EUR
  book. A limit order that fills immediately at the bid is charged as a taker (0.40 %);
  pricing one tick above the best bid ("post only") pays the maker fee.
- Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax
  return, PIT-38); export the exchange ledger as CSV and keep it with the on-chain
  transaction history from the exit day.
