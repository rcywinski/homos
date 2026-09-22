# deploy/deploy.ps1 - deployment/update of HOMOS on the Windows server.
# Run from the repo root directory (where package.json is):
#   cd C:\Projects\homos
#   .\deploy\deploy.ps1
#
# ENCODING (incident 21.08, the SECOND time in this project): this file MUST be
# saved as UTF-8 WITH BOM. Windows PowerShell 5.1 reads a .ps1 without BOM in
# the system code page, so non-ASCII characters break the quotes and
# wreck the whole parser (TerminatorExpectedAtEndOfString). The same happened
# on 10.08 to backup.ps1/deploy.ps1 and was fixed back then - and I came back
# with this bug, writing the script on a Mac. Second line of defense: ALL string
# literals here are ASCII-only, so even if someone loses the BOM, the broken characters
# sit exclusively in comments and do not touch the parser.
#
# HISTORY (so this is not reverted yet again): the 10.08 version ended with
# `pm2 startOrReload` + `pm2 save`, but the same day the project moved
# from pm2 to NSSM services (TASKS-WINDOWS-ADDENDUM.md: "bots must be
# INVISIBLE" - pm2 on Windows keeps processes in the user session).
# The script was not updated back then, so every deployment silently
# went back to pm2. Since 21.08 we operate EXCLUSIVELY on NSSM services.
#
# Order: fetch code -> dependencies per lock -> build UI -> restart services
# ONLY if something outside the UI changed -> sanity check /health.

$ErrorActionPreference = 'Stop'

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

# NSSM is sometimes outside PATH (installed via winget - see CONTEXT 10.08).
function Get-NssmPath {
    $cmd = Get-Command nssm -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter 'nssm.exe' -Recurse -ErrorAction SilentlyContinue
    if ($candidates) { return ($candidates | Select-Object -First 1).FullName }
    throw "nssm.exe not found (neither in PATH nor in WinGet\Packages). Restart services manually."
}

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    Set-Location $repoRoot
    Write-Host "Repo: $repoRoot"

    Write-Step "1/5 git pull"
    $before = (git rev-parse HEAD).Trim()
    git pull
    if ($LASTEXITCODE -ne 0) { throw "git pull failed (exit $LASTEXITCODE)" }
    $after = (git rev-parse HEAD).Trim()

    # What changed? The UI (src/**) can be deployed with JUST the build - bot/server.ts
    # serves `public/` via express.static, i.e. reads the files on every
    # request. A service restart is only needed for changes in bot/**,
    # in dependencies or in the deployment itself.
    $changed = @()
    if ($before -ne $after) { $changed = (git diff --name-only $before $after) }
    $needsRestart = $false
    foreach ($f in $changed) {
        if ($f -like 'bot/*' -or $f -like 'package*.json' -or $f -like 'deploy/*') { $needsRestart = $true }
    }

    Write-Step "2/5 npm ci"
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed (exit $LASTEXITCODE)" }

    Write-Step "3/5 npm run build (production UI)"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit $LASTEXITCODE)" }

    if ($needsRestart) {
        $nssm = Get-NssmPath
        Write-Step "4/5 Restarting NSSM services (bot/** or deps changed) - $nssm"
        foreach ($svc in @('homos-bot', 'homos-server')) {
            & $nssm restart $svc
            if ($LASTEXITCODE -ne 0) { throw "nssm restart $svc failed (exit $LASTEXITCODE)" }
        }
        Start-Sleep -Seconds 5
    }
    else {
        Write-Step "4/5 Service restart SKIPPED - UI-only change, public/ is served from disk"
    }

    Write-Step "5/5 Sanity check"
    Get-Service homos-bot, homos-server | Format-Table Name, Status -AutoSize
    try {
        $health = Invoke-RestMethod -Uri 'http://localhost:8787/health' -TimeoutSec 10
        Write-Host "health: $($health | ConvertTo-Json -Compress)"
        if (-not $health.fresh) { Write-Host "WARNING: /health reports fresh=false" -ForegroundColor Yellow }
    }
    catch {
        throw "/health did not respond: $($_.Exception.Message)"
    }

    Write-Host ""
    Write-Host "Deploy OK." -ForegroundColor Green
    Write-Host "Remember: HARD refresh in the browser (Ctrl+F5) - bundle.js has no content hash." -ForegroundColor Yellow
}
catch {
    Write-Host ""
    Write-Host "DEPLOY FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check services: Get-Service homos-bot, homos-server" -ForegroundColor Yellow
    exit 1
}
