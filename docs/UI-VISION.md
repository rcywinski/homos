# UI-VISION.md — target shape of the application: autopilot + morning cockpit

> Date: 2026-08-10 · Source: owner's requirements + additions
> Overriding principle: the user looks in ONCE A DAY, in the morning. Everything else
> happens by itself or waits in the decision queue. Insight from the general (finances)
> to the specific (position).

## 1. Architecture: who does what

```
┌─────────────┐   writes state  ┌──────────────┐   reads state  ┌──────────────┐
│  BOT (24/7) │ ──────────────► │ SQLite + logs│ ◄────────────── │  UI (React)  │
│  Node daemon│                 └──────────────┘                │ view only    │
│  on Mac/VPS │ ◄── proposal approvals (semi-auto) ──────────── │ + approve    │
└─────────────┘                                                 └──────────────┘
```

**KEY (missing from the requirements):** the browser cannot be the automation
engine — a closed laptop = a dead autopilot. The bot is a separate process
(`packages/bot`, Phase 3/4; today's agent-runner is its precursor). Ultimately a
small VPS (~$5/month) so as not to depend on the Mac being on.

## 2. Automation loops (requirement → mechanism)

| Frequency | Task | Notes |
|---|---|---|
| every 1 min | monitor prices/ticks of the watched pools | cheap RPC reads; the basis for "ranges kept up to date" |
| every 15 min | recompute advisor signals (vol, fee-yield, ranges) | the same formulas as advisor.ts/backtest |
| once a day (in the morning, before you log in) | ranking of the most profitable pools + rotation proposals | today's Pool Scanner, automated |
| **8:00 in the morning** | **news/market analysis → the day's "risk posture"** | risk-on: normal ranges; risk-off (FOMC, crash, depeg scare): wider ranges / larger reserve / rotation paused; implementation: a scheduled Claude task (WebSearch) writing MORNING.md + push, the bot reads the posture as a parameter |
| on signal | open/rebalance/close a position | mode A: proposal for approval; mode B: auto within limits |
| on threshold | collect rewards when fees > the gas profitability threshold | auto-compound into the position or into the reserve |
| after every action | write to the ledger (SQLite) + CSV export | Polish taxes: every action = a taxable event |

## 3. Screens (from the general to the specific)

### 3.1 MORNING BRIEF (start screen — 30 seconds of reading)
- **Financial header**: total value · PnL 24h/7d/since start · **vs HODL 50/50**
  (without this you do not know whether the automation makes any sense!) · fees collected yesterday · costs yesterday (gas+slippage).
- **Decision queue** (semi-auto mode): proposal cards "Rebalance #953465 → $1800–$2400,
  cost $0.9, payback 2.1 days [Approve] [Reject] [Details]" — in the morning you click 2–3 times and you are done.
- **Overnight alerts**: what the bot did on its own / what worried it (volatility spike, exit from range).
- **Rotation suggestions**: "cbBTC/WETH Base pays 2.3× more than your pool X — consider moving
  (switching cost $Y, pays back in Z days)" — always with the switching cost and a margin (rotation only
  when the edge > threshold, otherwise perpetual hopping).
- **Uncertainty/diversification indicator**: when volatility is high → a suggestion to shift weights
  to the stable sleeve/wider ranges; a portfolio concentration gauge (e.g. % in one pair).

### 3.2 POSITIONS (level 2)
- List of active positions: pair/network, value, range as a bar with a price marker, in-range %,
  accrued fees, position APR since opening, 24h mini-sparkline.
- Position detail: **event timeline** (opening → rebalances → collects, each with cost
  and effect), price chart with historical ranges overlaid, PnL decomposed into
  fees − IL − costs (decomposition from the backtest engine).

### 3.3 AUTOPILOT (settings and safety)
- Mode per pool: OBSERVE / PROPOSE (semi-auto) / AUTO — with separate limits.
- Global limits: max USD per transaction, max transactions/day, max % of capital in one pool.
- **KILL-SWITCH**: a big red button "close everything to stable" + auto-trigger
  on stablecoin depeg and anomalies.
- System health: bot heartbeat, data freshness, RPC status (redundancy), gas balance.

### 3.4 LEDGER (level 3)
- Full transaction history with rates from the time of execution, filters, **CSV export for the tax return (PIT)**.
- Strategy statistics: how many proposals approved/rejected, signal effectiveness
  (to calibrate the advisor's parameters with real-life results).

## 3.5 Rotation policy "weakest position → better opportunity" (clarification)

Positions ranked by **realised net APR** (fees − costs, since opening and trailing 7d).
Candidate for closing: the weakest position, if there exists a pool where
`expected_APR_new − APR_current` covers the full switching cost (exit + entry
+ slippage + gas) within ≤ N days (parameter, start: 10). Additional safeguards:
max 1 rotation per day, the new pool must have held its ranking edge for ≥3 days
(not a one-day spike), rotation paused under a risk-off posture.

On "avoiding IL": IL cannot be switched off — it is the cost of being an LP. The bot
MINIMISES it through: range width ∝ volatility, hysteresis (no rebalancing on whipsaw),
the payback condition, the correlated sleeve (cbBTC/ETH) and the stable sleeve, and
ultimately the hedge (F6). Token proportions at opening are computed by the SDK exactly
for the chosen range — "balancing the currency amounts" happens automatically on every
entry/rebalance.

## 4. What else was missing from the requirements (additions)

1. **Instant alerts (Telegram/push)** — "once a day in the morning" only works if
   emergencies wake you immediately: depeg, bot failure, a strange price move >X%,
   a failed transaction. An overnight crash cannot wait until coffee.
2. **Benchmark vs HODL everywhere** — an automaton that earns less than holding the tokens
   is a waste of time and gas; this number must be at the very top.
3. **Trust path for the automaton**: OBSERVE → PROPOSE → AUTO per pool (in line
   with the earlier decision semi-auto → full-auto). We do not enable AUTO until PROPOSE
   mode has shown for 2–4 weeks that the proposals were accurate.
4. **Rotation cost on a "better offer"**: move pools only when the edge covers
   the exit+entry cost with a margin — otherwise the bot will chase rabbits forever.
5. **Reserve management**: not 100% of capital in positions; a stable buffer for gas,
   opportunities and peace of mind (parameter, e.g. 10–15%).
6. **Tax accounting from day one** — with automation the number of transactions
   grows 10×; reconstructing history by hand after a year is a nightmare.
7. **Bot key security**: a dedicated hot wallet with operating capital,
   amount limits in the bot, the rest on a cold wallet; approvals only for known contracts.
8. **Calibrating parameters from real life**: the bot logs every signal and its outcome — after a month
   we compare with the backtest (does reality agree with the simulation).

## 5. Rollout map (consistent with docs/PLAN.md)

| Step | What | Depends on |
|---|---|---|
| A | Read-only dashboard: morning brief (data from the browser, no bot) + range bar, PnL vs HODL | UI session (Sonnet) + advisor.ts (exists) |
| B | Advisor parameters calibrated by the backtest | F1 data (being fetched) |
| C | Bot daemon in OBSERVE mode (logs signals, does nothing) | A, B |
| D | PROPOSE mode: decision queue in the UI, you approve in Rabby | C |
| E | AUTO mode within limits + kill-switch + Telegram alerts | D + 2-4 weeks of trust |
| F | Delta-neutral hedge (Phase 4 of the plan) | E |
