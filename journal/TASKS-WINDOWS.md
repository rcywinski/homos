# TASKS-WINDOWS.md — brief dla sesji Claude na WINDOWSIE (serwer bota)

> Jesteś sesją Cowork uruchomioną NA komputerze Windows, który pełni rolę
> serwera 24/7 dla bota HOMOS (tryb OBSERWUJ — zero transakcji, zero kluczy).
> Najpierw przeczytaj: CONTEXT.md (stan projektu), INFRA.md (architektura),
> deploy/setup-windows.md (instrukcja przygotowana przez sesję infra).
> Po każdym kroku odhaczaj tutaj; na końcu wpis do dziennika CONTEXT.md
> ("Sesja Windows") i git commit+push (koordynacja między maszynami idzie przez git).

## Zasady bezpieczeństwa (nadrzędne)
- Tryb OBSERWUJ nie potrzebuje ŻADNYCH kluczy prywatnych — nie twórz, nie proś,
  nie zapisuj żadnych sekretów portfela. Jedyne sekrety: opcjonalny TG_TOKEN
  (Telegram) i BOT_API_TOKEN (wymyśl losowy) — wpisuje je użytkownik do .env.
- Żadnego port-forwardingu na routerze; API tylko LAN+VPN (firewall wg instrukcji).

## Kroki

- [x] **1. Kod na maszynie**: repo już podpięte do sesji w `C:\Projects\homos`.
- [x] **2. Środowisko**: Node v24.18.0 (nowszy niż wymagane v22.x LTS — celowo
  nie zainstalowano równolegle v22, v24 działa poprawnie z tym repo), `npm ci`
  wykonane, `npx tsx --version` OK (tsx v4.23.12).
- [x] **3. Konfiguracja**: `.env` utworzony z `.env.example`; BOT_WATCH_ADDRESS
  ustawiony na adres z CONTEXT.md, BOT_API_PORT=8787, BOT_API_TOKEN wygenerowany
  losowo (32 znaki). TG_TOKEN/TG_CHAT puste, PRIVATE_KEY puste (tryb OBSERWUJ).
- [x] **4. Test ręczny**: `.bot/state.json` powstał z cenami 3 pul (ETH ~$1905–1910,
  w oczekiwanym zakresie) i wykrytymi pozycjami #953427/#953465 (in range).
  `bot:server` + `curl /health` → `{"fresh":true}`. **Po drodze napotkany i naprawiony
  bug**: `bot/observer.ts` crashował przy pierwszym cyklu statystyk
  (`TypeError: Do not know how to serialize a BigInt` w `saveState()` —
  `PoolStats.lastSqrtP` to bigint). Naprawione: replacer BigInt→string w obu
  `JSON.stringify` w observer.ts.
- [x] **5. pm2 jako usługa**: zainstalowane globalnie pm2 + pm2-windows-startup.
  **Drugi napotkany i naprawiony bug**: `deploy/ecosystem.config.js` używał
  `script: 'npx'`, co na Windows pm2 crashuje (`npx.cmd` uruchamiany przez
  interpreter node → `SyntaxError: Unexpected token ':'` na nagłówku batch).
  Naprawione: script wskazuje bezpośrednio na `node_modules/tsx/dist/cli.mjs`
  (uruchamiane przez node, bez pośrednictwa npx/cmd). `pm2 status` — oba procesy
  `online`, 0 restartów. `pm2 save` + `pm2-startup install` wykonane.
- [x] **6. Zasilanie**: `powercfg standby-timeout-ac`/`hibernate-timeout-ac` = 0
  (AC). Wznawianie po zaniku prądu (BIOS "Restore on AC Power") — POZA zasięgiem
  automatyzacji, użytkownik musi ustawić ręcznie w BIOS/UEFI.
- [x] **7. Firewall**: reguła **WYKONANA** (2026-08-10, sesja z uprawnieniami
  administratora): `New-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)"
  -Direction Inbound -Protocol TCP -LocalPort 8787 -RemoteAddress
  192.168.1.0/24,10.8.0.0/24 -Action Allow`. Zweryfikowano `Get-NetFirewallRule`
  → RemoteAddress = {192.168.1.0/255.255.255.0, 10.8.0.0/255.255.255.0}.
- [x] **8. Test z zewnątrz**: IP serwera w sieci LAN: **192.168.1.8**, port 8787.
  Firewall gotowy (krok 7) — test `http://192.168.1.8:8787/health` z Maca/iPhone'a
  przez LAN/VPN pozostaje do zrobienia przez użytkownika (poza zasięgiem tej sesji).
- [x] **9. Backup**: zadanie Harmonogramu "HOMOS Daily Backup" (codziennie 3:00)
  zarejestrowane. **Trzeci napotkany i naprawiony bug**: `deploy/backup.ps1` i
  `deploy/deploy.ps1` były zapisane jako UTF-8 bez BOM — Windows PowerShell 5.1
  (nie pwsh/Core) czyta pliki bez BOM w kodowaniu systemowym, co psuło polskie
  znaki i łamało parser (`Missing string terminator`). Naprawione: pliki
  przezapisane jako UTF-8 z BOM. Test ręczny i przez harmonogram (`Start-ScheduledTask`)
  → `LastTaskResult 0`, backup w `%USERPROFILE%\HomosBackup\2026-08-10\`.
- [x] **10. Raport**: wpis do CONTEXT.md poniżej + commit + push. Kroki odhaczone.

## Przygotowanie na Macu (jeśli repo nie jest jeszcze na GitHubie)
Użytkownik wykonuje w iTerm na Macu:
```
cd ~/WebstormProjects/HOMOS
git add -A && git commit -m "HOMOS v2: math core + backtest + bot observer + deploy"
gh repo create homos --private --source=. --push   # (wymaga gh auth login)
```
(alternatywnie: utworzyć puste prywatne repo na github.com i `git remote add origin … && git push -u origin main`)

## Znane fakty środowiska (z CONTEXT.md)
- Bot: `bot/observer.ts` (pętle 60s/5min/15min), API: `bot/server.ts` :8787.
- Obserwowany portfel i pule: `bot/config.ts` (mainnet USDC/WETH 0.3%+0.05%, Base WETH/USDC 0.3%).
- RPC publiczne z fallbackiem; własne można podać w .env (RPC_MAINNET/RPC_BASE).
