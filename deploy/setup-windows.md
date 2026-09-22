# setup-windows.md — first launch of HOMOS on Windows (24/7 server)

> Architecture context: `docs/INFRA.md`. This document is a one-off installation
> guide for a clean Windows machine. Day-to-day updates are handled by
> `deploy/deploy.ps1`.

## 1. Node.js 22 LTS

1. Download and install Node 22 LTS from https://nodejs.org (`.msi` installer,
   default options — tick "Add to PATH").
2. Verify in a new PowerShell:
   ```powershell
   node --version   # v22.x.x
   npm --version
   ```

## 2. pm2 + autostart after reboot

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

`pm2-startup install` registers a service which, after a Windows restart, runs
`pm2 resurrect` (restores the processes saved by `pm2 save` — see step 6).

## 3. Clone the repository

The repo is private on GitHub (see docs/INFRA.md §4) — access is required (an SSH key
or a Personal Access Token configured in Git Credential Manager).

```powershell
cd C:\
git clone https://github.com/<twoj-user>/homos.git
cd homos
npm ci
```

## 4. The `.env` file

Copy the template and fill in the values (full description of the variables: `.env.example`):

```powershell
Copy-Item .env.example .env
notepad .env
```

At minimum, to run the observer bot you need:
- `BOT_WATCH_ADDRESS` — the address of the wallet whose positions the bot should watch,
- `BOT_API_PORT` — the API port (default 8787),
- `BOT_API_TOKEN` — the API access token (see step 7 — REQUIRED if the
  server is to be reachable beyond `localhost`),
- optionally `RPC_MAINNET` / `RPC_BASE` (your own RPCs instead of public ones),
- optionally `TG_TOKEN` / `TG_CHAT` (Telegram alerts).

## 5. Build the UI and test locally (without pm2, once)

```powershell
npm run build
npx tsx bot/observer.ts     # in one window — Ctrl+C after checking that it starts without errors
npx tsx bot/server.ts       # in a second window
```

Check in a browser (on the Windows machine itself): `http://localhost:8787/health`
should return `{"fresh":false,...}` right after start (fresh only after the
bot's first cycle — see `INTERVALS` in `bot/config.ts`) and `{"fresh":true,...}`
after about a minute. Stop both processes (Ctrl+C) before moving on.

## 6. Running under pm2 (the target mode of operation)

```powershell
pm2 startOrReload deploy/ecosystem.config.js
pm2 save          # saves the current process list — pm2-startup will restore it after a reboot
pm2 status        # both processes should be "online"
pm2 logs          # live log view (Ctrl+C to exit, the processes keep running)
```

Logs also go to files: `.bot/pm2/homos-bot.{out,err}.log` and
`.bot/pm2/homos-server.{out,err}.log`.

## 7. Firewall — restricting access to LAN + VPN

The server should NOT be reachable from the public internet (zero
port-forwarding on the router — see docs/INFRA.md §3). A Windows firewall rule
restricts the API port to trusted subnets:

```powershell
# Run as Administrator. REPLACE the subnets with your own:
#  - LAN subnet, e.g. <lan-subnet>
#  - your home VPN subnet, e.g. <vpn-subnet>
New-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)" `
  -Direction Inbound -Protocol TCP -LocalPort 8787 `
  -RemoteAddress <lan-subnet>,<vpn-subnet> `
  -Action Allow

# The default Windows Firewall policy already blocks inbound traffic not covered by rules —
# the rule above is the only exception for port 8787. Verify:
Get-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)" | Format-List
```

Additionally set `BOT_API_TOKEN` in `.env` (see step 4) — the firewall rule alone
does not protect against other devices on the same home network
(guests on the Wi-Fi). The server then requires the header `Authorization: Bearer <token>`
for all `/api/*` (the `/health` endpoint stays token-free, for monitoring).
The web client (UI) keeps the token in `localStorage` under the key `homos_api_token`.

## 8. Power and clock (24/7 server)

```powershell
# Disable sleep (AC power) — Administrator
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

# Resume after power loss: a setting in the motherboard BIOS/UEFI
# ("Restore on AC Power" / "After Power Loss" -> "Power On") — out of PowerShell's reach,
# do it manually at computer startup (Del/F2 key during boot).
```

Make sure the system clock synchronises with NTP (Settings -> Time
& language -> Date & time -> "Sync now") — needed for correct
timestamps in the ledger/logs.

## 9. Final test from the phone (over the VPN)

1. Connect the iPhone to the home VPN.
2. Open `http://<server-lan-address>:8787/health` — it should return JSON.
3. Add to Home Screen — PWA (see docs/INFRA.md §5).

## 10. Post-installation verification — checklist

```powershell
pm2 status                              # both processes "online", restarts ~0
curl http://localhost:8787/health       # 200 after about a minute of bot operation
Get-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)"   # the rule exists and is Enabled
```

## 11. Daily backup

See `deploy/backup.ps1` and the "Backup" section in this file (added by that
task) for configuring the Windows Task Scheduler.

### Registering `deploy/backup.ps1` in Task Scheduler (once a day)

```powershell
# Run as Administrator. Replace the repo path if different from C:\homos.
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\homos\deploy\backup.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
Register-ScheduledTask -TaskName "HOMOS Daily Backup" -Action $action `
  -Trigger $trigger -Settings $settings -Description "Daily backup of .bot/*.json and the HOMOS database"

# Immediate test:
Start-ScheduledTask -TaskName "HOMOS Daily Backup"
Get-ScheduledTaskInfo -TaskName "HOMOS Daily Backup"
```

## Updates (after the first setup)

All subsequent deployments (new code from the Mac) go through `deploy/deploy.ps1`
— see its header. Steps 1–3 and 7–8 above do not need to be repeated.
