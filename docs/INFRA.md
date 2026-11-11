# INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN/VPN

> Decided 10 Aug 2026: the server is the owner's Windows desktop running 24/7; the Mac and
> the iPhone reach it over the LAN, and from outside the home only through the existing home
> VPN. This document is the architecture and security overview; the step-by-step
> installation is in [`deploy/setup-windows.md`](../deploy/setup-windows.md).

## 1. Architecture (as built)

```
┌────────────────────────── WINDOWS (server, 24/7) ──────────────────────────┐
│  NSSM service homos-bot      bot/observer.ts — prices, signals, proposals  │
│  NSSM service homos-server   bot/server.ts — REST API + static UI (public/)│
│  Task Scheduler              nightly pipeline, 07:30 morning report, backup│
│  State: .bot/*.json + *.ndjson (proposals, history, paper, tx ledger)      │
└────────────────────────────────┬───────────────────────────────────────────┘
                     LAN / VPN (no public exposure)
        ┌────────────────────────┼───────────────────────────┐
   Mac (browser)           iPhone (Safari)              Telegram (push alerts)
   + Rabby for signing     read + approve
                           proposals
```

- **Runtime**: Node 22 natively (no WSL, which avoids LAN networking problems).
- **Process management**: two Windows services managed by NSSM, `homos-bot` and
  `homos-server`. They run outside the user session, start at boot and restart after a
  crash. pm2 was used only on the first day; `deploy/ecosystem.config.js` is the unused
  pm2 legacy.
- **Data**: the bot writes JSON state and append-only ndjson files in `.bot/` (untracked).
  The transaction ledger (`bot/ledger.ts`) reads position events from the chain and is
  exported as CSV through `/api/ledger.csv`. A SQLite database was designed
  ([`DB-SCHEMA.md`](DB-SCHEMA.md)) but never implemented.
- **Backup**: a daily copy of `.bot/` state to `%USERPROFILE%\HomosBackup` (`deploy/backup.ps1`),
  30 days retained.
- **Power and clock**: sleep disabled, power-on after power loss set in the BIOS, NTP
  synchronisation enabled (the ledger depends on timestamps).

## 2. Network and security

- The API listens on port 8787, and the Windows Firewall admits only the home LAN and VPN
  subnets. **There is no port forwarding on the router; remote access is only through the
  VPN.**
- Despite the VPN, every `/api/*` route requires a bearer token (`BOT_API_TOKEN`), so that
  guests on the home Wi-Fi cannot see the finances. `/health` stays open for monitoring.
- **Keys**: the stack never held a private key. The bot only proposes; every transaction is
  built in the UI and signed in the browser wallet (Rabby on the Mac, a WalletConnect wallet
  on the iPhone). An AUTO mode with an operating wallet key on the server (stored encrypted
  with Windows DPAPI, never in the repo or the UI) was planned but not implemented.
- HTTPS: a service worker on the iPhone needs HTTPS (self-signed certificate or mkcert);
  over plain HTTP through the VPN the UI works, just without the offline PWA cache.

## 3. Code flow: Mac (development) → Windows (server)

- Git is the deployment channel: the Mac pushes to GitHub, the server pulls.
  `deploy/deploy.ps1` runs `git pull`, `npm ci`, `npm run build`, restarts the NSSM services
  only when `bot/`, the dependencies or `deploy/` changed (the UI is served from disk), and
  checks `/health`.
- Code reaches the server only by a manual `git pull`. An auto-pull runner was tried and
  withdrawn on 18 Aug (see [`DECISION-LOG.md`](DECISION-LOG.md)); the only automated git
  action is the morning report committing itself.
- `scripts/agent-runner.ts` (`npm run agent`) is a job queue that lets an AI session without
  terminal access start whitelisted npm scripts (data fetches, backtests) and read their logs.
- *(Not implemented)* A Claude desktop session on the server itself, managing the bot without
  RDP. In practice a Claude Code session on the server played this role (see
  [`AI-WORKFLOW.md`](AI-WORKFLOW.md)).

## 4. iPhone and alerts

- The responsive UI, added to the Home Screen, shows the full morning view and lets the
  owner approve proposals; signatures go through WalletConnect.
- Alerts go from the bot to Telegram: instant, free, and available without the VPN.

## 5. Rollout (planned vs actual)

The planned order was: repository on GitHub → Node, clone and services on Windows → the bot
in OBSERVE mode plus the API/UI server → firewall, token and an iPhone test over the VPN →
PROPOSE → AUTO along the trust path. Everything up to PROPOSE was built; PROPOSE mode was
used for the whole live period (27 Aug – 21 Sep 2026). AUTO was never enabled.

## 6. Inference box (since Nov 2026)

After the project closed, this machine became the local inference server for the AI layer; see [`inference/README.md`](../inference/README.md).
