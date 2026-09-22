# UX-COCKPIT.md — information architecture and user actions (v1)

> Design principle: the application is built around ONE daily cycle
> (a morning glance + an occasional decision), not around Uniswap's features.
> Everything that executes a transaction ALWAYS ends with a signature in Rabby
> with a readable summary (amounts, minimum after slippage, cost) — the UI
> sends nothing on its own. Full automation will come with the bot (AUTO mode), not with the UI.

## 1. Screen hierarchy (from the top)

### A. COCKPIT (always visible, expanded)
1. **Financial bar**: total value · PnL 24h/7d (once the ledger exists) · fees
   to collect · bot health dot.
2. **Bot proposals** — a proposal card with TWO buttons:
   - **[Approve]** → a sequence of rebalance transactions to sign in Rabby
     (see §3 — requires a new builder, PROPOSE phase),
   - **[Reject]** → dismiss (already works).
3. **Positions — cards with inline actions** (moved from the MyPositions tab):
   - range bar + value + advisor recommendation (exists),
   - **[💰 Collect fees]** — active when fees > the profitability threshold (50× gas;
     below the threshold the button is grey with the tooltip "not worthwhile: fees $X < threshold $Y"),
   - **[⏹ Close]** — modal: % slider (25/50/100), preview "you will receive ~A USDC
     + B WETH (min. after slippage: …)", option "swap everything to USDC" (an extra
     swap = an extra signature), confirmation → Rabby,
   - **[🔄 Manual rebalance]** — prefill the Add Liquidity form with the advisor's range
     (until the builder from §3 exists: close + open as two separate operations).
4. **Bot telemetry** (collapsible — Batch 3).

### B. MANAGE (collapsed by default — the former sections, demoted, NOT deleted)
- **Open a new position** = the current AddLiquidity (needed until the bot
  enters pools on its own; also for manual sleeves),
- **Pool browser** (the current Uniswap V3 Pools + Top Pools) = an exploratory
  tool — stays, because it is the only place to choose a pool for a new position,
- **Transaction History** — stays temporarily; ULTIMATELY replaced by the Ledger
  read from the bot's SQLite (full history with rates, CSV export for taxes) —
  then the old component is deleted.

### C. SETTINGS (⚙ — exists) + ultimately the Autopilot panel (modes per pool,
limits, KILL-SWITCH "close everything to USDC" with double confirmation).

## 2. Inventory of user actions (complete list)

| Action | Where | Status |
|---|---|---|
| Collect fees (manually) | position card | exists in MyPositions → move to the cockpit + profitability threshold |
| Close position % / whole | position card → modal | logic exists (Remove) → new modal with amount preview |
| Exit fully to USDC | close modal (swap option) | NEW (swap via router after decrease) |
| Approve rebalance proposal | proposal card | NEW — builder §3 (start of the PROPOSE phase) |
| Reject proposal | proposal card | works |
| Open new position | Manage → AddLiquidity | works |
| Manual rebalance per advisor | position card | prefill AddLiquidity (simple) |
| Kill-switch | Settings/cockpit | AUTO phase (requires the executor bot) |
| Auto-collect fees | bot (AUTO mode) | future; until then the manual button |

## 3. Rebalance builder (work for the analytical session — NOT for the UI session)
Approving a proposal = 2–3 signatures in Rabby, sequentially with a progress bar:
1. `multicall` on the NFT manager: `decreaseLiquidity` + `collect` (one tx —
   the manager supports multicall),
2. a swap equalising the proportions for the new range (router, exact-in, min-out
   from slippage) — skipped when the proportions are already close enough,
3. `mint` of the new range (ticks from the bot's proposal).
After every tx: write to the ledger. A failure in the middle of the sequence = a safe state
(funds in cash on the wallet), the UI shows "finish step 2/3".

## 4. What we do NOT do (deliberately)
- No button that sends a transaction without Rabby (until the AUTO phase
  with a dedicated operating wallet on the server).
- We do not delete old sections before replacing them with their equivalents (Ledger).
- We do not add price charts to the cockpit (a sparkline is planned in positions —
  level 2); the cockpit must be readable in 30 seconds.

## 5. Rollout order
1. (UI/Sonnet — Batch 3): telemetry + moving the Collect/Close actions onto
   the cockpit cards + close modal with amount preview + manual rebalance prefill.
2. (Fable): rebalance builder §3 + collect thresholds + writing to the ledger (SQLite on
   the bot side, endpoint POST /api/ledger).
3. (UI/Sonnet — Batch 4): Ledger in the UI (table + CSV) → removal of the old
   Transaction History; the "exit to USDC" option.
4. (after the OBSERVE period): the [Approve] button moves from "prepare tx"
   to the full PROPOSE sequence.
