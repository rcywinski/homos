# deploy/backup.ps1 — daily backup of HOMOS state (Windows server, 24/7).
# Copies .bot/*.json (bot state, proposals, ledger state) and any SQLite file to
# %USERPROFILE%\HomosBackup\<date>\.
# Note: the *.json filter does not match the append-only ndjson files in .bot/
# (e.g. the transaction ledger tx-ledger.ndjson, see bot/ledger.ts).
# Registration in Windows Task Scheduler: see deploy/setup-windows.md §6.
#
# Manual run:
#   powershell -NoProfile -ExecutionPolicy Bypass -File deploy\backup.ps1

$ErrorActionPreference = 'Stop'

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $dateStamp = Get-Date -Format 'yyyy-MM-dd'
    $backupRoot = Join-Path $env:USERPROFILE 'HomosBackup'
    $destDir = Join-Path $backupRoot $dateStamp

    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Write-Host "Backup to: $destDir"

    # --- Bot state (.bot/*.json: state.json, proposals.json, etc.) ---
    $botDir = Join-Path $repoRoot '.bot'
    if (Test-Path $botDir) {
        $jsonFiles = Get-ChildItem -Path $botDir -Filter '*.json' -File -ErrorAction SilentlyContinue
        if ($jsonFiles) {
            $botDestDir = Join-Path $destDir '.bot'
            New-Item -ItemType Directory -Path $botDestDir -Force | Out-Null
            foreach ($f in $jsonFiles) {
                Copy-Item -Path $f.FullName -Destination $botDestDir -Force
                Write-Host "  copied: .bot\$($f.Name)"
            }
        } else {
            Write-Host "  WARNING: no .json files in .bot\ — the bot has not run yet or the directory is empty."
        }
    } else {
        Write-Host "  WARNING: the .bot\ directory does not exist — skipping (bot not started yet)."
    }

    # --- SQLite database — designed (docs/DB-SCHEMA.md) but never implemented;
    # the ledger shipped as ndjson/json. The search below stays defensive and
    # copies any *.sqlite / *.db found in the repo outside node_modules. ---
    $dbFiles = Get-ChildItem -Path $repoRoot -Recurse -Include '*.sqlite', '*.sqlite3', '*.db' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\node_modules\\' }

    if ($dbFiles) {
        foreach ($f in $dbFiles) {
            Copy-Item -Path $f.FullName -Destination $destDir -Force
            Write-Host "  copied database: $($f.Name)"
        }
    } else {
        Write-Host "  INFO: no SQLite file found (expected: the ledger is ndjson/json)."
    }

    # --- Cleanup of old backups: keep the last 30 days ---
    $cutoff = (Get-Date).AddDays(-30)
    Get-ChildItem -Path $backupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        ForEach-Object {
            Write-Host "  removing old backup: $($_.Name)"
            Remove-Item -Path $_.FullName -Recurse -Force
        }

    Write-Host "Backup completed successfully ($dateStamp)." -ForegroundColor Green
}
catch {
    Write-Host "BACKUP ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
