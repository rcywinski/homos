_Historical runbook. The product was wound down in September 2026; kept as documentation of the operating procedure._

# EMERGENCY.md — emergency procedure for the FlatWide product ("red button")

> Owner's decision, evening of 27 Aug (project journal 27 Aug, handoff item 2 —
> private working journal, not published):
> the DOWN signal on the product pools is NOT muted, but it is also NOT a
> recommendation — the FlatWide hybrid **deliberately holds beta**. This document
> says when to sign what, how much it costs and in what order to act.
> Everything in PROPOSE mode: the bot executes nothing on its own.

## 0. First: WHICH signal is firing?

| Signal | What it measures | What it means |
|---|---|---|
| DOWN on **WETH/USDC** (base-030) | the ETH price in USD | **USD CRASH — affects BOTH legs.** WETH and cbBTC share a common beta to USD; this is the proper crash sensor for the whole tranche |
| DOWN on **cbBTC/WETH** (leg B) | the RELATIVE price of cbBTC vs WETH | only relative weakening of BTC vs ETH — the USD value of the portfolio may even be rising. This is NOT a crash sensor |

Example from history: on 19 Aug EXIT_TREND on cbBTC/WETH fired because ETH
was pumping +16% and BTC was not keeping up — no crash, a pure relative effect.

## 1. Default reaction: SIGN NOTHING

Data (26–27 Aug, ~40+ walk-forward/full-period runs):
- exiting on trend on average WORSENS the result vs holding the wide LP
  (late signal + costs + missed rebounds);
- cash/exit wins ONLY in strong, long crashes (−28…−41%),
  which you cannot recognise ex-ante — in the other regimes it loses;
- the FlatWide hybrid was chosen WITH that beta included (hybrid ≥
  passiveW ≥ HODL on the gate; USDC worst in up windows).

The DOWN signal by itself = information, not an order.

## 2. Option A — delta-neutral HEDGE (preferred: REVERSIBLE, the LP stays)

Card "EMERGENCY OPTION A" in the cockpit (amounts computed from the live position).

- **What:** a 1× short on GMX v2 (Arbitrum) for the FULL exposure of the
  position's volatile leg. WETH/USDC → short ETH/USD (**1 signature in the cockpit**
  — builder battle-tested with a $15 E2E on 20 Aug). The cbBTC leg → short
  BTC/USD manually on app.gmx.io (the 1-signature builder currently handles
  only ETH/USD).
- **Cost:** open+close ~$0.5–1 gas/keeper + funding
  (ETHUSDT hist. 750d: avg +4.8%/yr FOR the short, 20% of periods negative)
  + spread/impact on entry.
- **When to close:** once the signal clears (WETH/USDC: price above the EMA;
  cbBTC: gap > −2.5%). The bot watches for orphans: a warning ~1×/day when
  a short hangs without a DOWN signal.
- **What to expect:** hedge(full) backtests: protects the DOWN regime
  (66–87% win rate) entirely AT THE EXPENSE of UP (0–25%) — hence only on
  signal, never as a permanent posture.

## 3. Option B — EXIT to cash 50/50 (last resort)

Card "EMERGENCY OPTION B" in the cockpit.

- **Cost:** ~0.15–0.3% of value (swap of half + slippage) + Base gas
  ~$0.1–1; plus the cost of re-entering after the return signal — the full
  out-and-back cycle ~0.4–0.7% of the position value.
- **Sign ONLY on hard criteria** (at least one):
  1. USDC depeg / a systemic event on Base or in Uniswap
     (then exit preferably to ETH on L1, not to USDC),
  2. loss of trust in the venue/contract (exploit, withdrawals halted),
  3. a deliberate portfolio decision by the owner to take risk off (not a
     reaction to a single signal),
  4. hedge unavailable (GMX down, no collateral) and you consider the crash
     scenario real.
- **Return:** WETH/USDC — re>EMA (price above the 7d EMA); cbBTC — half
  (gap > −2.5%). The bot will generate the proposals.

## 4. Red-button order of operations (checklist)

1. Check WHICH signal (section 0). Relative cbBTC/WETH without a signal
   on WETH/USDC = usually ignore (optionally short BTC, section 2).
2. USD crash (DOWN on WETH/USDC): first **option A** — short ETH
   for the sum of the WETH exposure of BOTH legs (amounts on the cards; both pools have
   a WETH leg). Reversible, cheap, the LP keeps collecting fees.
3. **Option B** only on the criteria from section 3.
4. Once the signal clears: close the short (1 signature). Ledger/E2 measures
   the cost of delay — sign during operating hours, the alarm runs 24/7.
5. Entry in the project journal (what, when, why, cost) — every use of the
   red button is data for the review (private working journal, not published).

## 5. What this document does NOT cover

FLAT_NARROW/FLAT_WIDEN (narrowing/widening in the product) is NOT an
emergency procedure — it is the normal cycle of the FlatWide product. FLAT_WIDEN
is protective (a narrow position in a trend catches IL), but it executes
in the calm proposal mode, not via the red button.

## 6. Off-ramp: wallet → Kraken → bank (lessons from 18.09.2026)

Not an emergency, but kept here so it is at hand on every capital exit.

1. **Closing the LP** directly in Uniswap ("Remove liquidity" 100%)
   does decreaseLiquidity + collect in a single multicall — fees come out
   together with the position, a separate "Collect fees" is unnecessary. WETH
   comes back as native ETH. Gas on Base: ~$0.01 per position.
2. **Deposit to Kraken**: USDC on the Base and Arbitrum One networks is credited
   within minutes, mainnet (L1) ~30–60 min. Always a test transfer first
   (20 USDC), then the rest. The same USDC deposit address for all EVM
   networks — but choose the network deliberately on the deposit screen.
3. **Exchange USDC → EUR: ONLY Kraken Pro → Trade → Spot → pair
   USDC/EUR → Limit order** at the best bid (fee 0.20%,
   ~4 EUR per 2k). Do NOT use "Convert" — also in Pro:
   rate worse by ~1.4% + fee ~0.85% = ~2.4% in total (18 Sep: 17 EUR
   fee + ~25 EUR in the rate on 2,024 USDC). Do not enter "Trade
   futures"/"Perpetual contracts" — a different market, leverage.
4. **SEPA withdrawal** (Deposit/Withdraw → Withdraw → EUR): fee ~0.90 EUR.
   Requires a **separate 2FA "for deposits and withdrawals" (Funding 2FA)** —
   independent of the login 2FA. The code does not arrive by SMS/email — it is
   generated by an authenticator app configured on 24–25.08.2026 during the
   on-ramp. Without this code the withdrawal will not go through; a reset via
   Support takes 1–3 business days.
5. After the sale: **History → Ledger → CSV export** (PIT-38: selling
   USDC for EUR = a taxable event; transfers and crypto↔crypto swaps
   are not). Keep it together with the tx history from Rabby/Basescan from the exit day.
6. Entry in the project journal: amounts at exit, rate, fees, what remained
   in the wallet and under which rule (private working journal, not published).
7. **Lessons from 21 Sep:** a deposit from **Base** to Kraken gets trading
   credit within minutes, but a fiat withdrawal from those funds is blocked
   ("awaiting network confirmation") until L1 finality — hours;
   from **Arbitrum** the hold clears immediately. Plan the SEPA for the next
   day. When selling ETH/EUR, a Limit order filled immediately
   at the bid counts as **taker 0.40%** — to pay 0.20–0.25%,
   set the price 1 tick ABOVE the best bid (or "Post only") and
   wait a few seconds. On 3,000 EUR that is ~6 EUR of difference.
