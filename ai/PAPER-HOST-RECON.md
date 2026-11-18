# Hosted paper-trading copy of the original app: reconnaissance

CC-Mac, 18 Nov 2026, at the analysis session's request (`ai/APP-PLAN.md` section 11 on `app-chat`). Read only: no
code, no box, no spend. Input for the owner's decision, not a start of the work. Paths and line counts are from
`ai-layer` at the time of writing.

Goal as stated by the owner: a hosted copy of the original application with paper trading only. Live virtual
10 000 USD positions that update, rebalances, an overview across strategies (wide, narrow), charts; a mock wallet, no
signing, no live wallet.

## a) How deeply the wallet libraries are tied into `src/`

`src/` is 36 files, 9 873 lines. 18 files import `wagmi`, `connectkit` or `viem`, but they fall into three groups.

| Group | Files | What a paper-only build does with them |
|---|---|---|
| Provider shell | `App.tsx` (`WagmiConfig`, `ConnectKitProvider`, `ConnectKitButton`), `config/wallet.ts` (`createConfig`, `getDefaultConfig`, `WALLET_CONNECT_PROJECT_ID`) | drop; replace the button with a "paper mode" badge |
| Signing path | `hooks/useCockpitActions.ts` (646), `useRebalanceExecution.ts` (179), `useRotateExecution.ts` (198), `useHedgeExecution.ts` (163), `utils/rebalanceBuilder.ts` (645), `hedgeBuilder.ts` (304), `liquidityManagement.ts` (327), `uniswap.ts` (430, the only `createWalletClient`), `components/CockpitPositionActions.tsx` (771), the three modals (`Rebalance`, `Rotate`, `HedgeConfirm`, 283 together), `TransactionHistory.tsx` (175, not mounted, a write module only) | not imported at all; about 4 300 lines leave the bundle |
| Read-only use | `hooks/usePortfolio.ts` (`useAccount`, `useBalance`, `usePublicClient` on three chains), `components/WalletInfo.tsx` (`useAccount`, `useBalance`), `utils/advisor.ts` and `formatters.ts` and `config/botPools.ts` (viem types and `formatUnits` only) | `viem` stays (pure helpers, no wallet); `usePortfolio` and `WalletInfo` need a mock source |

The coupling point is `components/MorningCockpit.tsx` (1 261 lines). It calls all four signing hooks and `usePortfolio`
at the top (lines 143 to 147) and has 44 references to them in its body. Everything else the owner wants is already
wallet-free: `PaperTradingPanel.tsx` (299), `PositionCharts.tsx` (381), `TopRankingPanel.tsx` (409),
`ObservationAnalysis.tsx`, `BotTelemetry.tsx`, `ClosedPositionsPanel.tsx` import only React, `useBotApi` and pool
metadata. They read the bot API, not the chain.

What a build without the wallet would take, two ways:
- **New thin shell (recommended).** A new `App` with a paper page built from the existing wallet-free panels
  (`PaperTradingPanel`, `PositionCharts`, `TopRankingPanel`, `ObservationAnalysis`) and `useBotApi` in a read-only
  form. No `WagmiConfig`, no ConnectKit, no signing hook is imported, so none of it can run. `MorningCockpit` is left
  for the private build. Small, and safe by construction.
- **Keep the cockpit, mock the wallet.** Wrap `MorningCockpit` in a mock: a `usePortfolio` that returns the paper
  positions as if they were wallet positions, and the four hooks replaced by no-op versions behind a build flag
  (webpack alias). More of the original look survives, but every button that today builds a transaction has to be
  found and disabled, and a missed one fails at runtime, not at build time. Larger and riskier.

`TransactionHistory.tsx` uses `useTransaction` and `useWaitForTransactionReceipt`; it is not mounted, so it simply stays
out of the paper build.

## b) What `bot/paper.ts` needs to run

`paper.ts` (325 lines) has no chain access of its own. It is called from `bot/observer.ts` (`paperTick`, after every
15-minute statistics cycle) with the pool statistics and leg prices the observer computed. So "running paper" means
running the observer.

What the observer needs for paper:
- **Chain reads only.** `slot0` of each pool every 60 s and 24 h of `Swap` logs per pool every 15 min
  (`fetchRecentSwaps` in `src/utils/advisor.ts`, chunked `getLogs`). RPCs come from `bot/config.ts`: `RPC_MAINNET`,
  `RPC_BASE`, `RPC_ARBITRUM` from `.env` if set, then public fallbacks (drpc, publicnode, llamarpc, 1rpc). No key is
  required; a paid RPC key only makes the `getLogs` load reliable.
- **No wallet key.** Nothing in `bot/` signs. `BOT_WATCH_ADDRESS` is optional: without it the observer tracks the zero
  address (no real positions), which is exactly the paper-only case. The real-position parts (NFT positions, ledger,
  GMX hedge reads) then return empty.
- **State files** in `.bot/` (gitignored): `paper-state.json`, `paper-events.ndjson`, `paper-history.ndjson` for paper;
  the observer also writes `state.json`, `history.ndjson` and others. A fresh host starts from empty state: positions
  open at the next suggestion, so the charts start empty and fill at 15-minute steps. Copying the old `.bot/` paper
  files is possible but they come from the wallet-era box and would need a look first.
- **The selector** (daily ranking, `bot/selector.ts`) reads `data/llama/` (DefiLlama history and `universe.json`) from the
  repo's data directory. Without it `/api/ranking` is empty; paper itself does not need it.
- **Telegram:** `TG_TOKEN`, `TG_CHAT` optional; leave unset.

Endpoints the paper UI reads (`bot/server.ts`, all GET): `/api/paper?hours=N`, `/api/state`, `/api/history`,
`/api/ranking`, `/api/wide-ranking`, `/api/wide-daily`, `/api/wide-backtests`, `/api/candidates`,
`/api/results/:name` (backtest result files), `/health`.

**Wide and narrow.** `paper.ts` runs one strategy: per pool, the advisor's suggested range (k by pool), the v1 rebalance
rule and the trend breaker. `bot/config.ts` describes the FlatWide product (wide idle posture, narrow leg in a
confirmed flat), but `paper.ts` does not simulate it. An overview "wide against narrow" therefore needs new paper
strategies (several virtual books per pool, state keyed by strategy). That is the largest new piece of work, and it is
algorithm work, not UI work.

## c) What must be absent on a public host

Secrets and settings, none of them in the build or on the host:
- the wallet-era `.env` (it may hold keys; see `inference/README.md`, "Secrets in the pre-AI clone"), `.bot-live-backup`;
- `BOT_WATCH_ADDRESS` (the owner's address; without it nothing personal is read);
- `TG_TOKEN`, `TG_CHAT`; `HYPERSYNC_BEARER_TOKEN` or `ENVIO_API_TOKEN` (ledger backfill only);
- `WALLET_CONNECT_PROJECT_ID` (inlined into the browser bundle by webpack `DefinePlugin`; a paper build sets nothing);
- a paid RPC key, if one is used, stays server-side (the observer), never in the UI.

Write endpoints and wallet-era data:
- `POST /api/proposals/:id/dismiss` is the only write endpoint; it appends to `.bot/proposal-commands.ndjson`. Remove it
  or do not route it.
- `/api/ledger`, `/api/ledger.csv`, `/api/closed-positions`, `/api/positions-history` serve the real wallet's history.
  On a paper host with no watch address they are empty, but they should not be routed at all.
- `bot/server.ts` sets `Access-Control-Allow-Origin: *` and leaves `/api/*` open when `BOT_API_TOKEN` is unset. On a
  public host the API should be read only, same origin, behind the existing tunnel and access setup of phase 4, with
  a short allow-list of the GET routes above.

## d) Size and main risks

Rough size: **M** for a paper page with the existing single strategy (thin shell, observer with no watch address,
read-only API, hosting next to the chat server). **L** if the wide-against-narrow overview is part of the first
version, because that needs new simulation code in `paper.ts` and a decision on which strategies are compared.

Main risks:
- **Public RPC limits.** 24 h of `Swap` logs per pool every 15 min across three chains is heavy for free endpoints;
  the code already notes that public RPCs cap `getLogs` at a few thousand blocks. Expect gaps (the observer then
  freezes stats, and paper sees stale prices). A paid RPC key on the server side is the usual fix.
- **A missed signing path** if the cockpit is kept and mocked. The thin shell avoids this.
- **Honesty of the numbers.** Paper fees are an estimate (pool fee yield rescaled to the band width, no per-swap
  replay), as `paper.ts` itself states. The public page has to say so, or it overstates what a real position earned.
- **Fresh state.** The page starts empty and needs days of 15-minute samples before the charts mean anything.
- **Where it runs.** The observer is a long-running process with disk state. On the box it would sit next to the
  chat server and its GPU switch; elsewhere it needs a small always-on host. This is an owner decision.
- **Wallet-era data leaking in** through copied `.bot/` files or a copied `.env`. Start from empty state and a new
  `.env` with only the RPC settings.
