# deploy/deploy.ps1 - wdrozenie/aktualizacja HOMOS na serwerze Windows.
# Uruchamiaj z katalogu glownego repo (tam gdzie jest package.json):
#   cd C:\Projects\homos
#   .\deploy\deploy.ps1
#
# KODOWANIE (incydent 21.08, DRUGI raz w tym projekcie): ten plik MUSI byc
# zapisany jako UTF-8 Z BOM. Windows PowerShell 5.1 czyta .ps1 bez BOM w
# systemowej stronie kodowej, wiec polskie znaki rozjezdzaja cudzyslowy i
# psuja caly parser (TerminatorExpectedAtEndOfString). To samo zdarzylo sie
# 10.08 na backup.ps1/deploy.ps1 i zostalo wtedy naprawione - a ja wrocilem
# z tym bledem, pisac skrypt na Macu. Druga linia obrony: WSZYSTKIE literaly
# stringow sa tu ASCII-only, wiec nawet gdyby ktos zgubil BOM, zepsute znaki
# siedza wylacznie w komentarzach i nie ruszaja parsera.
#
# HISTORIA (zeby nie cofnac tego po raz kolejny): wersja z 10.08 konczyla sie
# `pm2 startOrReload` + `pm2 save`, ale tego samego dnia projekt przeszedl
# z pm2 na uslugi NSSM (TASKS-WINDOWS-ADDENDUM.md: "boty maja byc
# NIEWIDOCZNE" - pm2 na Windows trzyma procesy w sesji uzytkownika).
# Skrypt nie zostal wtedy zaktualizowany, wiec kazde wdrozenie po cichu
# wracalo do pm2. Od 21.08 operujemy WYLACZNIE na uslugach NSSM.
#
# Kolejnosc: pobierz kod -> zaleznosci wg lock -> build UI -> restart uslug
# TYLKO jesli zmienilo sie cos poza UI -> sanity check /health.

$ErrorActionPreference = 'Stop'

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

# NSSM bywa poza PATH (instalacja przez winget - patrz CONTEXT 10.08).
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

    # Co sie zmienilo? UI (src/**) da sie wdrozyc SAMYM buildem - bot/server.ts
    # serwuje `public/` przez express.static, czyli czyta pliki przy kazdym
    # zadaniu. Restart uslug jest potrzebny tylko dla zmian w bot/**,
    # w zaleznosciach albo w samym deployu.
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
