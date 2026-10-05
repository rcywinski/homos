# setup-windows.md — first installation of HOMOS on the Windows server

> Step-by-step installation on a clean Windows machine. The architecture and the
> security model behind these steps are described in [`docs/INFRA.md`](../docs/INFRA.md).
> Day-to-day updates are handled by [`deploy.ps1`](deploy.ps1).

## 1. Node.js 22 LTS

1. Install Node 22 LTS from https://nodejs.org (`.msi` installer, default options,
   with "Add to PATH" ticked).
2. Verify in a new PowerShell window:
   ```powershell
   node --version   # v22.x.x
   npm --version
   ```

## 2. Clone the repository

```powershell
mkdir C:\Projects -Force
cd C:\Projects
git clone https://github.com/rcywinski/homos.git
cd homos
npm ci
```

The rest of this guide assumes the repository lives in `C:\Projects\homos` (the path used
in `deploy.ps1`); adjust the paths if you choose a different location.

## 3. The `.env` file

Copy the template and fill in the values (every variable is described in `.env.example`):

```powershell
Copy-Item .env.example .env
notepad .env
```

The observer bot needs at least:
- `BOT_WATCH_ADDRESS` — the wallet whose positions the bot watches (read-only; the stack
  never holds a private key),
- `BOT_API_PORT` — the API port (default 8787),
- `BOT_API_TOKEN` — the API access token (required whenever the server is reachable from
  anything other than `localhost`; see step 7),
- optionally `RPC_MAINNET` / `RPC_BASE` (your own RPC endpoints instead of the public ones),
- optionally `TG_TOKEN` / `TG_CHAT` (Telegram alerts).

Both services load `.env` from their working directory, so it must sit in the repository root.

## 4. Build the UI and run once in the foreground

```powershell
npm run build
npx tsx bot/observer.ts     # first window; Ctrl+C once it starts without errors
npx tsx bot/server.ts       # second window
```

Open `http://localhost:8787/health` on the server. Right after start it returns
`{"fresh":false,...}`; after the bot's first cycle (about a minute, see `INTERVALS` in
`bot/config.ts`) it returns `{"fresh":true,...}`. Stop both processes before moving on.

## 5. Install the NSSM services

Production ran as two Windows services managed by [NSSM](https://nssm.cc): `homos-bot`
(`bot/observer.ts`) and `homos-server` (`bot/server.ts`, API + static UI). Services run
outside the user session, start at boot and are restarted by NSSM if they crash.
`deploy.ps1` restarts exactly these two service names.

```powershell
winget install NSSM.NSSM    # nssm.exe may end up outside PATH; deploy.ps1 also looks in WinGet\Packages
```

The exact service parameters used in production were not kept in the repository. The
commands below create an equivalent setup (run as Administrator). They call the tsx CLI
through `node` directly instead of `npx`, because `npx` resolves to `npx.cmd` on Windows,
which a service wrapper cannot run as a script.

```powershell
$repo = 'C:\Projects\homos'
$node = (Get-Command node).Source
New-Item -ItemType Directory -Path "$repo\.bot\logs" -Force | Out-Null

foreach ($svc in @(
    @{ Name = 'homos-bot';    Script = 'bot\observer.ts' },
    @{ Name = 'homos-server'; Script = 'bot\server.ts' })) {
  nssm install $svc.Name $node "node_modules\tsx\dist\cli.mjs $($svc.Script)"
  nssm set $svc.Name AppDirectory $repo
  nssm set $svc.Name AppStdout "$repo\.bot\logs\$($svc.Name).out.log"
  nssm set $svc.Name AppStderr "$repo\.bot\logs\$($svc.Name).err.log"
  nssm set $svc.Name Start SERVICE_AUTO_START
  nssm start $svc.Name
}

Get-Service homos-bot, homos-server   # both should be Running
```

Useful commands afterwards: `nssm restart <name>`, `nssm stop <name>`, `nssm edit <name>`
(GUI editor for the service parameters).

## 6. Scheduled tasks

Two kinds of jobs ran from Windows Task Scheduler rather than as services:

- the data/backtest pipeline (`npm run pipeline`) and the morning report
  (`npm run report:morning`, 07:30), which commits `reports/morning-YYYY-MM-DD.md` and sends
  the Telegram digest;
- the daily backup (`deploy/backup.ps1`).

Registering the backup (the other tasks follow the same pattern with a different action):

```powershell
# Run as Administrator.
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Projects\homos\deploy\backup.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
Register-ScheduledTask -TaskName "HOMOS Daily Backup" -Action $action `
  -Trigger $trigger -Settings $settings -Description "Daily backup of the HOMOS bot state (.bot/)"

# Immediate test:
Start-ScheduledTask -TaskName "HOMOS Daily Backup"
Get-ScheduledTaskInfo -TaskName "HOMOS Daily Backup"
```

## 7. Firewall: LAN and VPN only

The server must not be reachable from the public internet (no port forwarding on the
router). A Windows Firewall rule limits the API port to trusted subnets:

```powershell
# Run as Administrator. Replace the subnets with your own:
#  - the LAN subnet, e.g. <lan-subnet>
#  - the home VPN subnet, e.g. <vpn-subnet>
New-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)" `
  -Direction Inbound -Protocol TCP -LocalPort 8787 `
  -RemoteAddress <lan-subnet>,<vpn-subnet> `
  -Action Allow

# The default policy already blocks inbound traffic not covered by a rule,
# so this rule is the only exception for port 8787. Verify:
Get-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)" | Format-List
```

Also set `BOT_API_TOKEN` (step 3): the firewall alone does not protect against other
devices on the same network. The server then requires `Authorization: Bearer <token>` on
every `/api/*` route (`/health` stays open for monitoring). The UI stores the token in
`localStorage` under the key `homos_api_token`.

## 8. Power and clock

```powershell
# Disable sleep on AC power (Administrator)
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
```

Resuming after a power cut is a BIOS/UEFI setting ("Restore on AC Power" / "After Power
Loss" -> "Power On") and has to be set by hand during boot.

Make sure the clock synchronises with NTP (Settings -> Time & language -> Date & time ->
"Sync now"); the ledger and the logs depend on correct timestamps.

## 9. Test from the phone (over the VPN)

1. Connect the phone to the home VPN.
2. Open `http://<server-lan-address>:8787/health`; it should return JSON.
3. Open the UI at `http://<server-lan-address>:8787/` and add it to the Home Screen.

## 10. Post-installation checklist

```powershell
Get-Service homos-bot, homos-server                           # both Running
curl http://localhost:8787/health                             # 200, fresh:true after about a minute
Get-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)"   # the rule exists and is Enabled
Get-ScheduledTask -TaskName "HOMOS*"                          # scheduled tasks registered
```

## Updates after the first installation

Every later deployment goes through `deploy\deploy.ps1` (see its header): `git pull`,
`npm ci`, `npm run build`, a restart of the NSSM services only when `bot/`, the
dependencies or `deploy/` changed, and a `/health` check. Steps 1, 5 and 7–8 do not need
to be repeated.
