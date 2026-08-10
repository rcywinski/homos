# deploy/deploy.ps1 — wdrożenie/aktualizacja HOMOS na serwerze Windows.
# Uruchamiaj z katalogu głównego repo (tam gdzie jest package.json):
#   cd C:\Sciezka\Do\homos
#   .\deploy\deploy.ps1
#
# Kolejność: pobierz najnowszy kod -> zainstaluj zależności dokładnie wg
# package-lock.json -> zbuduj UI produkcyjnie -> przeładuj procesy pm2 bez
# przerwy w działaniu (startOrReload) -> zapisz listę procesów, żeby
# `pm2 resurrect` po restarcie Windows przywrócił dokładnie ten stan.

$ErrorActionPreference = 'Stop'

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    Set-Location $repoRoot
    Write-Host "Katalog repo: $repoRoot"

    Write-Step "1/5 Pobieranie najnowszych zmian (git pull)"
    git pull
    if ($LASTEXITCODE -ne 0) { throw "git pull nie powiodło się (kod $LASTEXITCODE)" }

    Write-Step "2/5 Instalacja zależności (npm ci)"
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci nie powiodło się (kod $LASTEXITCODE)" }

    Write-Step "3/5 Budowanie UI produkcyjnie (npm run build)"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build nie powiodło się (kod $LASTEXITCODE)" }

    Write-Step "4/5 Przeładowanie procesów pm2 (startOrReload)"
    pm2 startOrReload deploy/ecosystem.config.js
    if ($LASTEXITCODE -ne 0) { throw "pm2 startOrReload nie powiodło się (kod $LASTEXITCODE)" }

    Write-Step "5/5 Zapis stanu pm2 (pm2 save) — potrzebne dla autostartu po reboocie"
    pm2 save
    if ($LASTEXITCODE -ne 0) { throw "pm2 save nie powiodło się (kod $LASTEXITCODE)" }

    Write-Host ""
    Write-Host "Wdrożenie zakończone pomyślnie." -ForegroundColor Green
    pm2 status
}
catch {
    Write-Host ""
    Write-Host "BŁĄD WDROŻENIA: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Procesy pm2 sprzed wdrożenia nadal działają (startOrReload nie zdążył ich zatrzymać w razie błędu wcześniej w skrypcie)." -ForegroundColor Yellow
    exit 1
}
