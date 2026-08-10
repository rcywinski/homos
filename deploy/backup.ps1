# deploy/backup.ps1 — codzienny backup stanu HOMOS (Windows serwer, 24/7).
# Kopiuje .bot/*.json (stan bota, propozycje) i przyszłą bazę SQLite (księga
# transakcji/podatkowa — patrz PLAN.md) do %USERPROFILE%\HomosBackup\<data>\.
# Rejestracja w Harmonogramie zadań Windows: patrz deploy/setup-windows.md §11.
#
# Uruchomienie ręczne:
#   powershell -NoProfile -ExecutionPolicy Bypass -File deploy\backup.ps1

$ErrorActionPreference = 'Stop'

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $dateStamp = Get-Date -Format 'yyyy-MM-dd'
    $backupRoot = Join-Path $env:USERPROFILE 'HomosBackup'
    $destDir = Join-Path $backupRoot $dateStamp

    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Write-Host "Backup do: $destDir"

    # --- Stan bota (.bot/*.json: state.json, proposals.json, itd.) ---
    $botDir = Join-Path $repoRoot '.bot'
    if (Test-Path $botDir) {
        $jsonFiles = Get-ChildItem -Path $botDir -Filter '*.json' -File -ErrorAction SilentlyContinue
        if ($jsonFiles) {
            $botDestDir = Join-Path $destDir '.bot'
            New-Item -ItemType Directory -Path $botDestDir -Force | Out-Null
            foreach ($f in $jsonFiles) {
                Copy-Item -Path $f.FullName -Destination $botDestDir -Force
                Write-Host "  skopiowano: .bot\$($f.Name)"
            }
        } else {
            Write-Host "  UWAGA: brak plików .json w .bot\ — bot jeszcze nie działał albo katalog pusty."
        }
    } else {
        Write-Host "  UWAGA: katalog .bot\ nie istnieje — pomijam (bot jeszcze nie uruchamiany)."
    }

    # --- Baza SQLite (księga transakcji) — nazwa/ścieżka jeszcze nie ustalona
    # ostatecznie w kodzie (patrz PLAN.md/CONTEXT.md), więc szukamy defensywnie
    # wszystkich *.sqlite / *.db w repo poza node_modules. ---
    $dbFiles = Get-ChildItem -Path $repoRoot -Recurse -Include '*.sqlite', '*.sqlite3', '*.db' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\node_modules\\' }

    if ($dbFiles) {
        foreach ($f in $dbFiles) {
            Copy-Item -Path $f.FullName -Destination $destDir -Force
            Write-Host "  skopiowano baze: $($f.Name)"
        }
    } else {
        Write-Host "  INFO: nie znaleziono pliku SQLite — księga jeszcze nie istnieje (OK na wczesnym etapie projektu)."
    }

    # --- Sprzątanie starych backupów: trzymaj ostatnie 30 dni ---
    $cutoff = (Get-Date).AddDays(-30)
    Get-ChildItem -Path $backupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        ForEach-Object {
            Write-Host "  usuwam stary backup: $($_.Name)"
            Remove-Item -Path $_.FullName -Recurse -Force
        }

    Write-Host "Backup zakończony pomyślnie ($dateStamp)." -ForegroundColor Green
}
catch {
    Write-Host "BŁĄD BACKUPU: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
