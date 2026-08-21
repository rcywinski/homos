# deploy/deploy.ps1 — wdrożenie/aktualizacja HOMOS na serwerze Windows.
# Uruchamiaj z katalogu głównego repo (tam gdzie jest package.json):
#   cd C:\Projects\homos
#   .\deploy\deploy.ps1
#
# HISTORIA (ważne, żeby nie cofnąć tego po raz kolejny):
# Wersja z 10.08 kończyła się `pm2 startOrReload` + `pm2 save`. Ale TEGO SAMEGO
# DNIA projekt przeszedł z pm2 na usługi NSSM (TASKS-WINDOWS-ADDENDUM.md:
# „boty mają być NIEWIDOCZNE") — pm2 na Windows uruchamia procesy w sesji
# użytkownika i zostawia DWA WIDOCZNE CZARNE OKNA konsoli po każdym reboocie,
# NSSM trzyma je w Session 0, czyli bez okien. Skrypt nie został wtedy
# zaktualizowany, więc każde uruchomienie deployu po cichu wracało do pm2
# i przywracało okna (zgłoszenie Rafała 21.08: „po restarcie mam dwa puste
# terminale node, kiedyś ten problem już był").
# Od 21.08 skrypt operuje WYŁĄCZNIE na usługach NSSM. pm2 nie jest tu używane.
#
# Kolejność: pobierz kod -> zależności wg lock -> build UI -> restart usług
# TYLKO jeśli zmieniło się coś poza UI -> sanity check /health.

$ErrorActionPreference = 'Stop'

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

# NSSM bywa poza PATH (instalacja przez winget — patrz CONTEXT 10.08).
function Get-NssmPath {
    $cmd = Get-Command nssm -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter 'nssm.exe' -Recurse -ErrorAction SilentlyContinue
    if ($candidates) { return ($candidates | Select-Object -First 1).FullName }
    throw "Nie znaleziono nssm.exe (ani w PATH, ani w WinGet\Packages). Usługi trzeba zrestartować ręcznie."
}

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    Set-Location $repoRoot
    Write-Host "Katalog repo: $repoRoot"

    Write-Step "1/5 Pobieranie najnowszych zmian (git pull)"
    $before = (git rev-parse HEAD).Trim()
    git pull
    if ($LASTEXITCODE -ne 0) { throw "git pull nie powiodło się (kod $LASTEXITCODE)" }
    $after = (git rev-parse HEAD).Trim()

    # Co się zmieniło? UI (src/**) da się wdrożyć SAMYM buildem — bot/server.ts
    # serwuje `public/` przez express.static, czyli czyta pliki przy każdym
    # żądaniu. Restart usług jest potrzebny tylko dla zmian w bot/**, w
    # zależnościach albo w .env.
    $changed = @()
    if ($before -ne $after) { $changed = (git diff --name-only $before $after) }
    $needsRestart = ($before -eq $after) -eq $false -and (
        ($changed | Where-Object { $_ -like 'bot/*' -or $_ -like 'package*.json' -or $_ -like 'deploy/*' }).Count -gt 0
    )

    Write-Step "2/5 Instalacja zależności (npm ci)"
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci nie powiodło się (kod $LASTEXITCODE)" }

    Write-Step "3/5 Budowanie UI produkcyjnie (npm run build)"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build nie powiodło się (kod $LASTEXITCODE)" }

    if ($needsRestart) {
        $nssm = Get-NssmPath
        Write-Step "4/5 Restart usług NSSM (zmiany w bot/** lub zależnościach) — $nssm"
        foreach ($svc in @('homos-bot', 'homos-server')) {
            & $nssm restart $svc
            if ($LASTEXITCODE -ne 0) { throw "nssm restart $svc nie powiodło się (kod $LASTEXITCODE)" }
        }
        Start-Sleep -Seconds 5
    }
    else {
        Write-Step "4/5 Restart usług POMINIĘTY — zmiany dotyczą tylko UI, a `public/` jest serwowane z dysku"
    }

    Write-Step "5/5 Sanity check"
    Get-Service homos-bot, homos-server | Format-Table Name, Status -AutoSize
    try {
        $health = Invoke-RestMethod -Uri 'http://localhost:8787/health' -TimeoutSec 10
        Write-Host "health: $($health | ConvertTo-Json -Compress)"
        if (-not $health.fresh) { Write-Host "UWAGA: /health zwraca fresh=false — stan bota nieświeży." -ForegroundColor Yellow }
    }
    catch {
        throw "/health nie odpowiada: $($_.Exception.Message)"
    }

    Write-Host ""
    Write-Host "Wdrożenie zakończone pomyślnie." -ForegroundColor Green
    Write-Host "Pamiętaj o TWARDYM odświeżeniu przeglądarki (Ctrl+F5) — bundle się zmienił." -ForegroundColor Yellow
}
catch {
    Write-Host ""
    Write-Host "BŁĄD WDROŻENIA: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Sprawdź stan usług: Get-Service homos-bot, homos-server" -ForegroundColor Yellow
    exit 1
}
