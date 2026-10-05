# UI-DESIGN.md — autopilot and the morning cockpit

> Merges the original product vision (10 Aug 2026) and the cockpit information architecture
> (v1, mid-August). §1 summarises what was built; the rest is the design as written, with
> unbuilt items marked.
>
> Overriding principle: the owner looks in **once a day, in the morning**. Everything else
> happens by itself or waits in the decision queue. Information flows from the general
> (finances) to the specific (a position). Every transaction ends with a signature in the
> browser wallet (Rabby) with a readable summary (amounts, minimum after slippage, cost);
> the UI never sends anything on its own.

## 1. As built vs planned

**Built**
- A single-page **cockpit** (`MorningCockpit.tsx`) that is the whole application. The older
  "Manage" section (pool browser, manual Add Liquidity, My Positions, Top Pools) was removed
  on 21 Aug, once the cockpit covered opening, rebalancing, rotation and hedging.
- Financial header, bot proposal cards with **[Approve]** / **[Reject]**, position cards with
  range bar, charts and a ⋮ menu (Collect fees / Close / Manual rebalance), the paper-trading
  panel, and collapsible telemetry, forecast, analysis and ranking sections.
- Multi-step signing sequences for REBALANCE (decrease + collect → swap → mint), ROTATE and
  HEDGE (a GMX v2 short in one signature).
- The bot-side transaction ledger (`bot/ledger.ts`, ndjson) with a CSV export and a
  closed-positions panel; Telegram alerts; a 07:30 morning report.
- The bot as a separate 24/7 process on the Windows server (see [`INFRA.md`](INFRA.md)),
  in OBSERVE and then PROPOSE mode.

**Planned, not built**
- AUTO mode, the Autopilot settings panel (modes and limits per pool) and the kill-switch.
- The 8:00 news/market "risk posture" task (§3).
- The SQLite ledger and the PLN conversion for tax reporting ([`DB-SCHEMA.md`](DB-SCHEMA.md)).
- Auto-compounding of fees and an explicit capital reserve policy.

## 2. Architecture: who does what

```
┌─────────────┐   writes state  ┌──────────────┐   reads state  ┌──────────────┐
│  BOT (24/7) │ ──────────────► │  state/logs  │ ◄────────────── │  UI (React)  │
│  Node daemon│                 └──────────────┘                │ view only    │
│  on a server│ ◄── proposal approvals (semi-auto) ──────────── │ + approve    │
└─────────────┘                                                 └──────────────┘
```

**Key point (missing from the original requirements):** the browser cannot be the automation
engine — a closed laptop means a dead autopilot. The bot is a separate process. The vision
suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that
role.

## 3. Automation loops (requirement → mechanism)

| Frequency | Task | Notes |
|---|---|---|
| every 1 min | monitor prices/ticks of the watched pools | cheap RPC reads; keeps ranges up to date |
| every 15 min | recompute advisor signals (volatility, fee yield, ranges) | the same formulas as `advisor.ts` and the backtester |
| once a day, before the morning review | rank the most profitable pools + rotation proposals | the pool scanner, automated (`bot/selector.ts`) |
| 8:00 *(not implemented)* | news/market analysis → the day's "risk posture" | risk-on: normal ranges; risk-off (FOMC, crash, depeg scare): wider ranges, a larger reserve, rotation paused. Idea: a scheduled Claude task writing a short brief that the bot reads as a parameter |
| on signal | open/rebalance/close a position | PROPOSE: a proposal for approval; AUTO (not built): execution within limits |
| on threshold | collect fees when they exceed the gas profitability threshold | manual button in practice; auto-compounding not built |
| after every action | write to the ledger + CSV export | Polish taxes: every action is a taxable event |

## 4. Screens

### 4.1 Cockpit (start screen — 30 seconds of reading)
- **Financial header**: total value · PnL 24h/7d/since start · **vs HODL 50/50** (without it
  there is no way to tell whether the automation makes sense) · fees collected · costs
  (gas + slippage) · bot health dot.
- **Decision queue**: proposal cards such as "Rebalance #953465 → $1800–$2400, cost $0.9,
  payback 2.1 days [Approve] [Reject] [Details]" — two or three clicks in the morning and done.
- **Overnight alerts**: what the bot did or what worried it (volatility spike, exit from range).
- **Rotation suggestions**: "cbBTC/WETH on Base pays 2.3× more than pool X — consider moving
  (switching cost $Y, pays back in Z days)", always with the switching cost and a margin.
- **Uncertainty/diversification indicator** *(not implemented)*: in high volatility, suggest
  shifting weight to wider ranges or stables; a portfolio concentration gauge.
- **Bot telemetry** in collapsible sections. No large price charts on the cockpit itself:
  it must be readable in 30 seconds.

### 4.2 Positions
- Position cards: pair/network, value, range as a bar with a price marker, in-range status,
  accrued fees, the advisor's recommendation, equity and range charts.
- Inline actions per card:
  - **Collect fees** — enabled when fees exceed the profitability threshold (multiple of the
    collect gas cost, see [`ALGORITHM.md`](ALGORITHM.md) §5); below it the button is grey with
    a tooltip "not worthwhile: fees $X < threshold $Y".
  - **Close** — a modal with a 25/50/100 % slider, a preview "you will receive ~A USDC + B WETH
    (minimum after slippage: …)", then confirmation in Rabby. A planned option to swap
    everything to USDC in the same flow was not built.
  - **Manual rebalance** — prefilled with the advisor's range.
- Position detail *(not built as a separate view)*: an event timeline (open → rebalances → collects, each with
  cost and effect) and PnL decomposed into fees − IL − costs.

### 4.3 Autopilot *(not implemented)*
- Mode per pool: OBSERVE / PROPOSE / AUTO, with separate limits.
- Global limits: max USD per transaction, max transactions per day, max % of capital in one pool.
- **Kill-switch**: a large red button "close everything to stable" with double confirmation,
  plus an automatic trigger on a stablecoin depeg and on anomalies. (The manual emergency
  procedure that was used instead is in [`EMERGENCY.md`](EMERGENCY.md).)
- System health: bot heartbeat, data freshness, RPC status, gas balance.

### 4.4 Ledger
- Full transaction history with rates at execution time, filters, and a **CSV export for the
  Polish income-tax return (PIT-38)**. Built as the closed-positions panel plus
  `/api/ledger.csv`; the localStorage-based Transaction History view was retired.
- Strategy statistics: proposals approved/rejected and signal accuracy, to calibrate the
  advisor against real results. The closest built equivalent is the "Observation analysis"
  section, which checks whether the frozen parameters still win on fresh data.

## 5. Inventory of user actions

| Action | Where | Final status |
|---|---|---|
| Collect fees (manually) | position card | built, with profitability threshold |
| Close position (% or whole) | position card → modal | built, with amount preview |
| Exit fully to USDC | close modal (swap option) | not built |
| Approve rebalance proposal | proposal card | built (full sequence, below) |
| Approve rotation / hedge proposal | proposal card | built |
| Reject proposal | proposal card | built |
| Open a new position | cockpit (from a proposal) | built; the manual Add Liquidity form was removed |
| Manual rebalance per advisor | position card | built (prefill) |
| Kill-switch | Autopilot panel | not built |
| Auto-collect fees | bot (AUTO mode) | not built |

## 6. Rebalance sequence

Approving a rebalance means two or three signatures in Rabby, in order, with a progress bar:
1. a `multicall` on the NFT position manager: `decreaseLiquidity` + `collect` (one transaction),
2. a swap equalising the token proportions for the new range (router, exact-in, minimum out
   from slippage), skipped when the proportions are already close enough,
3. `mint` of the new range (ticks from the bot's proposal).

A failure in the middle of the sequence leaves a safe state (funds in the wallet), and the UI
shows "finish step 2/3". Every on-chain step ends up in the ledger, which reads position events
from the chain.

## 7. Rotation policy: weakest position → better opportunity

Positions are ranked by **realised net APR** (fees − costs, since opening and trailing 7 days).
The weakest position is a candidate for closing if there is a pool where
`expected_APR_new − APR_current` covers the full switching cost (exit + entry + slippage + gas)
within ≤ N days (start: 10). Safeguards: at most one rotation per day; the new pool must have
held its ranking edge for ≥ 3 days (not a one-day spike).

On "avoiding IL": IL cannot be switched off; it is the cost of being an LP. The bot minimises
it through range width proportional to volatility, hysteresis (no rebalancing on whipsaw), the
payback condition, the correlated and stable sleeves and, ultimately, the hedge (Phase 4).
Token proportions at opening are computed exactly for the chosen range, so "balancing the
amounts" happens automatically on every entry and rebalance.

## 8. Requirements added to the original brief

1. **Instant alerts (Telegram)** — "once a day in the morning" only works if emergencies wake
   the owner immediately: depeg, bot failure, a price move > X %, a failed transaction.
2. **Benchmark vs HODL everywhere** — automation that earns less than holding the tokens is a
   waste of time and gas; this number belongs at the very top.
3. **Trust path**: OBSERVE → PROPOSE → AUTO per pool. AUTO only after PROPOSE has shown for
   2–4 weeks that the proposals were accurate. (AUTO was never enabled.)
4. **Rotation cost**: move pools only when the edge covers the exit + entry cost with a margin;
   otherwise the bot will chase every small edge.
5. **Reserve management**: not 100 % of capital in positions; a stable buffer for gas,
   opportunities and peace of mind (e.g. 10–15 %).
6. **Tax accounting from day one** — automation multiplies the number of transactions;
   reconstructing a year of history by hand is a nightmare.
7. **Bot key security**: a dedicated hot wallet with operating capital only, amount limits in
   the bot, the rest in a cold wallet, approvals only for known contracts. (Never needed: the
   stack stayed propose-only and held no key.)
8. **Calibration from real results**: the bot logs every signal and its outcome, so live
   behaviour can be compared with the backtest after a month.

## 9. What was deliberately left out

- No button that sends a transaction without a wallet signature.
- No removal of an old section before its replacement exists (the Transaction History view
  stayed until the ledger replaced it).
- No large price charts on the cockpit.
