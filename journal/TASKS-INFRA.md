# TASKS-INFRA.md — zadania infrastrukturalne dla sesji Sonnet

> Przeczytaj najpierw CONTEXT.md i INFRA.md (architektura: bot na Windows,
> klienci Mac/iPhone po LAN/VPN). Zadania = przygotowanie plików wdrożeniowych.
> Wszystko piszesz na Macu w repo — uruchamiane będzie później na Windowsie.
> Po każdym zadaniu: odhacz TUTAJ + wpis do dziennika CONTEXT.md (sekcja "Sesja UI/Infra (Sonnet)").
> NIE dotykaj: src/utils/**, backtest/**, bot/observer.ts (logika). Możesz dotykać: bot/server.ts (tylko pkt 3), nowe pliki.

## Zadania

- [x] **1. `.gitignore` porządny** (przygotowanie pod GitHub): node_modules, dist,
  data/cache/, data/llama/, .agent/, .bot/, .env*, legacy-*.bak, backtest/results/,
  public/bundle.js*. Sprawdź, że .env NIE jest w historii (jest w starym .gitignore?).
- [x] **2. Pliki wdrożeniowe Windows** (nowy katalog `deploy/`):
  - `deploy/ecosystem.config.js` — pm2: dwa procesy (homos-bot → `npx tsx bot/observer.ts`,
    homos-server → `npx tsx bot/server.ts`), autorestart, max_memory_restart 300M,
    logi do `.bot/pm2/`.
  - `deploy/deploy.ps1` — PowerShell: `git pull`, `npm ci`, `npm run build`,
    `pm2 startOrReload deploy/ecosystem.config.js`, `pm2 save`.
  - `deploy/setup-windows.md` — instrukcja krok po kroku: instalacja Node 22 LTS,
    `npm i -g pm2 pm2-windows-startup`, `pm2-startup install`, klon repo,
    `.env` (BOT_WATCH_ADDRESS, RPC_*, TG_*, BOT_API_PORT), powercfg (wyłącz
    usypianie), reguła firewalla (port 8787 tylko dla podsieci LAN+VPN — komenda
    netsh z placeholderami podsieci), test `pm2 status` + `curl localhost:8787/health`.
- [x] **3. Token dostępu w bot/server.ts**: jeśli env `BOT_API_TOKEN` ustawiony,
  wymagaj nagłówka `Authorization: Bearer <token>` dla /api/* (health bez tokena).
  Zwracaj 401 bez tokena. Dopisz do setup-windows.md i do fetcha w UI (panel
  propozycji — jeśli już istnieje — czyta token z localStorage klucz `homos_api_token`).
- [x] **4. `.env.example`** zaktualizowany o wszystkie zmienne: BOT_WATCH_ADDRESS,
  RPC_MAINNET, RPC_BASE, TG_TOKEN, TG_CHAT, BOT_API_PORT, BOT_API_TOKEN,
  WALLET_CONNECT_PROJECT_ID — z komentarzami po polsku co jest czym.
- [x] **5. `README.md` sekcja "Architektura i uruchamianie"**: krótko (dev na Macu:
  npm start / npm run bot; serwer Windows: deploy/setup-windows.md; sesje AI:
  CONTEXT.md, TASKS-*.md; mostek: npm run agent). Stary README zostaw poniżej jako
  "Legacy notes".
- [x] **6. Skrypt codziennego backupu** `deploy/backup.ps1`: kopiuje .bot/*.json
  i przyszły plik SQLite do `%USERPROFILE%\HomosBackup\<data>\` + wpis w
  setup-windows.md jak dodać do Harmonogramu zadań Windows (schtasks, 1x dziennie).

## Konwencje
- PowerShell: pisz defensywnie ($ErrorActionPreference='Stop', komunikaty po polsku).
- Typecheck po zmianie server.ts: `npx tsc --noEmit -p tsconfig.json`.
