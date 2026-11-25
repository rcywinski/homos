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

## Files to copy from the owner's Mac

Source: the main checkout, `backtest/results/` (not in git, by the owner's choice of step 2.1). Keep the file dates.
Target: `C:\HomosServe\live\results\`. Check the hashes after the copy.

| File | SHA-256 |
|---|---|
| `walkforward-mainnet-usdc-weth-030-720d-30d.json` | `99ff565d1650ba4b2f78da88d75b06d3fae76a890b1650daa604f14a6802c5d2` |
| `walkforward-mainnet-usdc-weth-005-720d-30d.json` | `fe32bf48ff91fb3b6271137764e4c4be7448b597480992d6deef5c1a0f83b871` |
| `walkforward-base-weth-usdc-030-720d-30d.json` | `e86a4f1fe7443dd79882836c4fabf771b3c4c2bcdf3cf0841a37ee2846b1b76f` |
| `walkforward-base-cbbtc-weth-005-720d-30d.json` | `0693645a3d374b666cd994fa6329f96611c99bdf0defbd5ac4098f6a9348f43a` |
| `walkforward-arbitrum-weth-usdc-005-720d-30d.json` | `2fcac414332f6aebc9a5c07da65c704b8199ca4ca7bf0161cb5ce443d2a60f9d` |

`base-weth-cbbtc-030` has no such file (only a candidate run under another name); the page says so. The full-run file
`wide-backtests.json` is not on the Mac; whether to look for it on the old box is the owner's decision.

## Task commands

```
HOMOS live observer:
cmd.exe /c "cd /d C:\HomosServe\homos && "C:\Program Files\nodejs\node.exe" --import tsx ai\serve\supervise-cli.ts -- "C:\Program Files\nodejs\node.exe" --env-file=C:\HomosServe\live.env --import tsx bot\live.ts >> C:\HomosServe\logs\live-observer.log 2>&1"

HOMOS live api:
cmd.exe /c "cd /d C:\HomosServe\homos && "C:\Program Files\nodejs\node.exe" --import tsx ai\serve\supervise-cli.ts -- "C:\Program Files\nodejs\node.exe" --env-file=C:\HomosServe\live.env --import tsx bot\server-public.ts >> C:\HomosServe\logs\live-api.log 2>&1"
```

## Outbound hosts (for the owner's approval)

Public RPCs: `eth.drpc.org`, `base.drpc.org`, `arbitrum.drpc.org`, `ethereum-rpc.publicnode.com`,
`base-rpc.publicnode.com`, `arbitrum-one-rpc.publicnode.com`, `eth.llamarpc.com`, `base.llamarpc.com`, `1rpc.io`.
DefiLlama: `yields.llama.fi` (rankings, history), `coins.llama.fi` (token prices for the WIDE ranking and the daily
model). No key, no Telegram, no HyperSync, no wallet relay. Calls are counted per host in `net-stats.json`.

## Go-live order

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
