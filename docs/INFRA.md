# INFRA.md — infrastructure: bot on Windows, Mac/iPhone clients over LAN/VPN

> Date: 2026-08-10 · Decision: server = the user's Windows desktop (24/7),
> access from the Mac and iPhone over LAN, from outside the home via the existing home VPN.

## 1. Target architecture

```
┌────────────────────────── WINDOWS (server, 24/7) ──────────────────────────┐
│  pm2 ── bot-daemon (packages/bot)      loops: monitor/signals/execution    │
│      └─ api+ui server (Express)        REST+WebSocket + static UI build    │
│  SQLite (ledger, signals, proposals)   operating wallet key (AUTO)         │
└────────────────────────────────┬───────────────────────────────────────────┘
                     LAN / VPN (no public exposure!)
        ┌────────────────────────┼───────────────────────────┐
   Mac (browser)           iPhone (PWA in Safari)        Telegram (push alerts)
   + Rabby for signing     read + approve
   in PROPOSE mode         proposals
```

## 2. Windows server — specifics

- **Runtime**: Node 22 natively (no WSL — fewer LAN networking problems) + `pm2`
  with `pm2-windows-startup` (autostart after reboot) or NSSM as a Windows service.
- **pm2 processes**: `homos-bot` (daemon), `homos-server` (API + static UI from
  `webpack --mode production`; a seed `server.js` is already in the repo).
- **Database**: SQLite file in the data directory + **backup**: a daily copy to a
  synced folder (OneDrive/Syncthing) — the tax ledger must not be lost.
- **Power**: disable sleep (powercfg), resume after power loss in BIOS
  (Restore on AC Power), pm2 auto-restart after a crash.
- **Clock**: NTP enabled (ledger timestamps).

## 3. Network and security

- The server listens ONLY on the LAN interface (e.g. `0.0.0.0:8443` behind the Windows
  firewall restricted to the home subnet + the VPN subnet). **Zero port-forwarding
  on the router — remote access exclusively via the existing VPN.**
- Despite the VPN: a simple access token in the UI (header/cookie) — guests on the
  home Wi-Fi should not see finances.
- **Keys**: the operating wallet key (AUTO mode) only on Windows, in a DPAPI-encrypted
  env (`npx dpapi-cli` / credential manager), never in the repo, never in the UI.
  PROPOSE mode does not require a key on the server — the bot builds the transaction
  and Rabby on the Mac / WalletConnect on the iPhone signs it.
- Local HTTPS: self-signed cert or mkcert (the iPhone PWA requires https for service
  workers; as a last resort http over the VPN also works, without the PWA cache).

## 4. Code flow: Mac (dev) → Windows (server)

- **Git as the deployment channel**: private repo (GitHub) — the Mac pushes, Windows pulls.
  Script `deploy.ps1` on Windows: `git pull && npm ci && npm run build && pm2 restart all`.
- Alternative to consider: **Claude desktop on Windows as well** — a Cowork session
  with the server folder attached could manage the bot directly (the agent-runner
  works identically there). Then remote diagnostics/repair without RDP.

## 5. iPhone

- Responsive UI as a PWA (Add to Home Screen) — the full morning brief + approving
  proposals; transaction signatures via WalletConnect (Rabby mobile/another wallet)
  only in PROPOSE mode, unnecessary in AUTO.
- Alerts: bot → Telegram (instant, free, works everywhere without the VPN).

## 6. Rollout order (extends steps A–F from docs/UI-VISION.md)

1. **Now**: repo → private GitHub (backup + deployment channel).
2. Windows: Node + pm2 + repo clone + `npm run agent` as the first service
   (the task bridge works right away; data fetching can grind on the server instead of the Mac).
3. `packages/bot` in OBSERVE mode (step C of the vision) as a pm2 service + API/UI server.
4. Firewall + token + test from the iPhone over the VPN.
5. PROPOSE → AUTO according to the trust path.
