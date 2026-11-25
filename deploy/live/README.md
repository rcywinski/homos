# Live demo on the box (phase 5, step 5.6)

Prepared on the Mac on 25 Nov 2026. **Nothing in this file has been done on the box.** Every step below needs the
owner's word at CC-Win: the outbound host list, the folders and their rights, the two tasks, the copy of the result
files and the one line in `serve.env` that makes the Live page public.

The plan and the reasons are in `ai/APP-PLAN.md` section 12. This file is the runbook.

## What runs

| Part | Where | As |
|---|---|---|
| Observer, paper step, selector, nightly data steps | `bot/live.ts` from the pinned clone `C:\HomosServe\homos` | task `HOMOS live observer`, `homos-web` |
| Read-only bot API | `bot/server-public.ts`, `127.0.0.1:8788` only, no firewall rule | task `HOMOS live api`, `homos-web` |
| Page and forward | the existing chat server: `/live/` and `/live/api/*` | task `HOMOS showcase server` (unchanged) |

Both new tasks run under the existing supervisor (`ai/serve/supervise-cli.ts`): restart with back-off, at most 10
restarts an hour. Same trigger as the other tasks: at startup with a 1 minute delay, run whether logged on or not.

## Folders and rights

| Path | homos-web | Content |
|---|---|---|
| `C:\HomosServe\live\state` | Modify | everything the demo writes: state, paper ledger, history, rankings, DefiLlama data, `observer.log` (rotated at 5 MB), `nightly-state.json`, `net-stats.json` |
| `C:\HomosServe\live\results` | RX | the five walk-forward files (below) |
| `C:\HomosServe\live.env` | RX | from `deploy/live/live.env.example`, written by cywil |
| `C:\HomosServe\logs\live-observer.log`, `live-api.log` | Modify (existing logs folder) | supervisor lines and console output, no URL (scrubbed) |

Nothing is written inside the clone: a redeploy (build and swap) replaces the clone and keeps the demo's history.

## Files to copy from the owner's Mac (the owner's manual step)

- Source, on the Mac: `/Users/rafalcywinski/WebstormProjects/HOMOS/backtest/results/` (the main checkout; these files
  are not in git, by the owner's choice of step 2.1).
- Destination, on the box: `C:\HomosServe\live\results\`
- How they travel: the earlier manual copies to the box are not recorded in the project notes, so the owner picks the
  way (a USB stick or a share he already uses). The five files are small (11 to 14 KB each). Keep their dates.
- Last line, on the box, in PowerShell: `Get-FileHash C:\HomosServe\live\results\*.json -Algorithm SHA256`, and each
  hash must equal the table below.

| File | SHA-256 |
|---|---|
| `walkforward-mainnet-usdc-weth-030-720d-30d.json` | `99ff565d1650ba4b2f78da88d75b06d3fae76a890b1650daa604f14a6802c5d2` |
| `walkforward-mainnet-usdc-weth-005-720d-30d.json` | `fe32bf48ff91fb3b6271137764e4c4be7448b597480992d6deef5c1a0f83b871` |
| `walkforward-base-weth-usdc-030-720d-30d.json` | `e86a4f1fe7443dd79882836c4fabf771b3c4c2bcdf3cf0841a37ee2846b1b76f` |
| `walkforward-base-cbbtc-weth-005-720d-30d.json` | `0693645a3d374b666cd994fa6329f96611c99bdf0defbd5ac4098f6a9348f43a` |
| `walkforward-arbitrum-weth-usdc-005-720d-30d.json` | `2fcac414332f6aebc9a5c07da65c704b8199ca4ca7bf0161cb5ce443d2a60f9d` |

`base-weth-cbbtc-030` has no such file (only a candidate run under another name); the page says so. The full-run file
`wide-backtests.json` is not on the Mac; whether to look for it on the old box is the owner's decision.

## Rights (well-known SID form, as on 18 Nov: group names are localized on this box)

```
# homos-web = *S-1-5-21-2739273501-424694354-1965777676-1003; C:\HomosServe does not inherit and gives homos-web RX.
New-Item -ItemType Directory C:\HomosServe\live\state, C:\HomosServe\live\results
icacls C:\HomosServe\live\state /grant "*S-1-5-21-2739273501-424694354-1965777676-1003:(OI)(CI)M"
icacls C:\HomosServe\live          # check: homos-web RX inherited, SYSTEM (*S-1-5-18) and Administrators (*S-1-5-32-544) F
icacls C:\HomosServe\live\state    # check: homos-web M, nothing else added
icacls C:\HomosServe\live.env       # check after writing it: homos-web RX only
```

## Task commands

```
HOMOS live observer:
cmd.exe /c "cd /d C:\HomosServe\homos && "C:\Program Files\nodejs\node.exe" --import tsx ai\serve\supervise-cli.ts -- "C:\Program Files\nodejs\node.exe" --env-file=C:\HomosServe\live.env --import tsx bot\live.ts >> C:\HomosServe\logs\live-observer.log 2>&1"

HOMOS live api:
cmd.exe /c "cd /d C:\HomosServe\homos && "C:\Program Files\nodejs\node.exe" --import tsx ai\serve\supervise-cli.ts -- "C:\Program Files\nodejs\node.exe" --env-file=C:\HomosServe\live.env --import tsx bot\server-public.ts >> C:\HomosServe\logs\live-api.log 2>&1"
```

## Outbound hosts (for the owner's approval)

Trimmed to the hosts that answered in the 5.1 measurement and the probe of 25 Nov; Live mode uses these lists
(`LIVE_RPC` in `bot/config.ts`; the default lists of the original bot are unchanged). Order per chain: the host that
serves 24 h of swap logs first, a price-only fallback second.

| Chain | First (logs and prices) | Fallback (prices; its free plan takes logs of at most 100 blocks) |
|---|---|---|
| Ethereum | `ethereum-rpc.publicnode.com` (1,000-block logs ok) | `eth.drpc.org` |
| Base | `base-rpc.publicnode.com` (1,000-block logs ok) | `base.drpc.org` |
| Arbitrum | `arb1.arbitrum.io` (Arbitrum's own public RPC, 10,000-block logs ok) | `arbitrum.drpc.org` |

DefiLlama: `yields.llama.fi` (rankings, history), `coins.llama.fi` (token prices for the WIDE ranking and the daily
model). No key, no Telegram, no HyperSync, no wallet relay. Calls are counted per host in `net-stats.json` (main
process) and `net-stats-<step>.json` (nightly steps).

Left out, with the reason measured on 25 Nov: `eth.llamarpc.com` and `base.llamarpc.com` (HTTP 525 on every call),
`arbitrum-one-rpc.publicnode.com` (HTTP 403, "Archive requests require a personal token" for any log range),
`1rpc.io` (served prices, then "reached the usage limit" for the day).

### Known limit: one logs host per chain

After the trimming, each chain has one host that serves the 24 h swap logs (publicnode for Ethereum and Base,
`arb1.arbitrum.io` for Arbitrum); drpc is the fallback for prices only (its free plan refuses log ranges over 100
blocks). If the logs host fails, nothing retries in a loop: the next attempt is the next 15-minute cycle. What the code
does in that state (bot/observer.ts refreshStats, bot/paper.ts paperTick, read on 25 Nov):
- **Prices keep updating** every 60 s through the fallback, so the position's in-range state stays current.
- **The statistics are not replaced, they freeze.** `refreshStats` writes new statistics only when they compute; on a
  failure the pool keeps the last ones. A chunk that fails inside the 24 h read is skipped silently
  (`fetchRecentSwaps`), so a partial failure can also produce statistics from an incomplete window.
- **The paper step keeps going on the frozen statistics.** While in range it still accrues fees each cycle with the
  last fee yield, and after 24 h out of range the rebalance decision uses the last statistics too. It does not pause.
- **The page does not show it.** The telemetry's "Data age" is the age of the price (60 s loop), not of the
  statistics, so frozen statistics look fresh.

Proposed for the owner (not built): record the time of the last successful statistics per pool, show it in the Live
telemetry, and let the paper step skip fee accrual and rebalance decisions when the statistics are older than, say,
two cycles. The original paper run behaved as above, so this would be a change from it, and is his decision.

### Arbitrum 0.05%: the owner's decision before go-live

On the original host list the pool never opens: in 2.2 hours, statistics in 0 of 9 cycles (price and tick fine; only
the 24 h swap-log read fails). Probe of 25 Nov, largest eth_getLogs range accepted per host:

| Host | Result |
|---|---|
| `arbitrum.drpc.org` | 100 blocks at most on the free plan: 24 h is about 345,600 blocks, so about 3,500 calls a cycle |
| `arbitrum-one-rpc.publicnode.com` | refused at every range (token required) |
| `1rpc.io/arb` | daily usage limit reached |
| `arb1.arbitrum.io/rpc` | 10,000 blocks fine; the full 24 h read (35 calls) took 11.6 s, 29,000 swaps, no failure; statistics computed (volatility 1.99%/d) |

Options:
- (a) Smaller ranges on the hosts that answer 400: only drpc gives an answer, at 100 blocks; about 3,500 calls every
  15 minutes for one pool is the tight loop 12.2 rules out and a sure way to get the address blocked. Not viable.
- (b) Arbitrum's own public RPC, `arb1.arbitrum.io`: keyless, 35 calls a cycle. Adds one host. Arbitrum documents it
  as rate-limited and not meant for production; if it refuses, the pool shows "waiting for market data" as today.
- (c) A provider key, server side only through `RPC_ARBITRUM` in `live.env`: an account with a provider (the owner's),
  adds that provider's host, and the key never leaves the box (the start refusal does not block RPC_* variables; the
  logs scrub URLs).
- (d) Go live with five pools and Arbitrum shown as waiting: no new host.

Recommendation: (b), already wired as the Live list's first Arbitrum host (so approving the list above approves it);
(d) is what happens by itself if the host refuses. (c) only if (b) proves unreliable over the first days.

## Go-live order

0. The tasks run as `homos-web`, so registering them needs that account's password. Only the owner types it, in his
   own administrator PowerShell window on the box (as in the 4.9 runbook); CC-Win prepares the two commands below and
   never sees or types the password:
   ```
   $c = Get-Credential homos-web      # the owner types the password here
   $a = New-ScheduledTaskAction -Execute cmd.exe -Argument '/c "<the observer command above>"'
   $t = New-ScheduledTaskTrigger -AtStartup; $t.Delay = 'PT1M'
   Register-ScheduledTask "HOMOS live observer" -Action $a -Trigger $t -User $c.UserName -Password $c.GetNetworkCredential().Password -RunLevel Limited
   # the same for "HOMOS live api" with the API command; then the settings of the existing tasks (restart on failure)
   ```
1. As cywil: create the two folders with the rights above, copy and hash-check the five files, write `live.env`.
2. Start `HOMOS live observer`. Cold start: the log shows "cold start: fetching the DefiLlama history" (about 9
   minutes, 223 calls to yields.llama.fi), then "LIVE loops started". The paper positions open at the first statistics
   cycle. This is the fresh start of the demo (owner's decision of 25 Nov): no history is carried over.
3. Start `HOMOS live api`. Check: `curl http://127.0.0.1:8788/api/paper?hours=24` answers JSON with six positions.
4. Only then add `SERVE_LIVE_BOT_URL=http://127.0.0.1:8788` to `C:\HomosServe\serve.env` and restart
   `HOMOS showcase server`. From this moment the archive page shows the Live link and `/live/` answers publicly.
5. Measure for a full day and more (moved here from 5.1): calls per host and hour, failures, gaps per pool, nightly
   steps (`nightly-state.json`).

Rollback: remove the `SERVE_LIVE_BOT_URL` line and restart the server task: `/live` is a plain 404 again and the
archive page looks as before. Then stop the two Live tasks; the state folder stays for later.

## Load on the box (the owner's gaming machine)

Measured on the Mac (Apple silicon), to be measured again on the box in the 5.6 report:
- Observer (`bot/live.ts`): about 1.6% of one core on average; a burst of about 12% of one core for about 15 s at each
  statistics cycle (every 15 minutes); 185 to 215 MB of memory.
- Read-only API (`bot/server-public.ts`): idle between requests; about 90 MB.
- Nightly steps, once a day after 05:00 local: the DefiLlama fetch is network-bound (about 9 minutes, 223 calls,
  little CPU); wide-score 1.1 s of CPU, 180 MB; wide-daily 0.6 s of CPU, 105 MB. No step loads a core for minutes.
- State folder: about 0.3 MB a day (history and paper history about 0.28 MB, dated score files 0.02 MB), so about
  10 MB a month; the DefiLlama folder (22 MB) and the daily model are replaced, not added to; `observer.log` is
  capped at 2 x 5 MB. The task logs (`live-observer.log`, `live-api.log`) are not rotated and grow by about 2 MB a
  month.

For the 5.6 report on the box: CPU share and memory of both processes over the first hour and during the nightly
steps (with the hour they ran), and the state folder's size after a day with the monthly growth it implies.

## Checked on the Mac (dry run, 25 Nov 2026)

The whole stack from a clean state folder, both bot processes under the supervisor with an env file and a cleared
environment, the chat server with the forward on its own port: see the step 5.6 notes in `ai/APP-PLAN.md`.

## Instruction text for CC-Win (send only after the owner's OK at CC-Win)

> Live demo, step 5.6, on the box. Pull, then check out the pinned commit the owner names, detached, and run npm ci and
> the showcase build as for every deploy. Follow `deploy/live/README.md` of that commit in order: folders and rights,
> the five files from the owner (check each SHA-256 against the table), `live.env` from the example, then the observer
> task, then the API task, each started by hand once and checked in its log. Do not add `SERVE_LIVE_BOT_URL` to
> `serve.env` until the owner says so in your session. Report: the pinned HEAD, the hashes, the first 30 lines of
> `live-observer.log` after "LIVE loops started", the answer of the curl check, and `net-stats.json` after one hour.
