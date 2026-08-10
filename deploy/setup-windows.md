# setup-windows.md — pierwsze uruchomienie HOMOS na Windows (serwer 24/7)

> Kontekst architektury: `INFRA.md`. Ten dokument to jednorazowa instrukcja
> instalacji na czystej maszynie Windows. Do codziennych aktualizacji służy
> `deploy/deploy.ps1`.

## 1. Node.js 22 LTS

1. Pobierz i zainstaluj Node 22 LTS z https://nodejs.org (instalator `.msi`,
   opcje domyślne — zaznacz "Add to PATH").
2. Zweryfikuj w nowym PowerShellu:
   ```powershell
   node --version   # v22.x.x
   npm --version
   ```

## 2. pm2 + autostart po reboocie

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

`pm2-startup install` rejestruje usługę, która po restarcie Windows odpala
`pm2 resurrect` (przywraca procesy zapisane przez `pm2 save` — patrz krok 6).

## 3. Klon repozytorium

Repo jest prywatne na GitHub (patrz INFRA.md §4) — potrzebny dostęp (SSH key
albo Personal Access Token skonfigurowany w Git Credential Manager).

```powershell
cd C:\
git clone https://github.com/<twoj-user>/homos.git
cd homos
npm ci
```

## 4. Plik `.env`

Skopiuj szablon i uzupełnij wartości (pełny opis zmiennych: `.env.example`):

```powershell
Copy-Item .env.example .env
notepad .env
```

Minimalnie do uruchomienia bota-obserwatora potrzebujesz:
- `BOT_WATCH_ADDRESS` — adres portfela, którego pozycje ma obserwować bot,
- `BOT_API_PORT` — port API (domyślnie 8787),
- `BOT_API_TOKEN` — token dostępu do API (patrz krok 7 — WYMAGANY, jeśli
  serwer ma być widoczny poza `localhost`),
- opcjonalnie `RPC_MAINNET` / `RPC_BASE` (własne RPC zamiast publicznych),
- opcjonalnie `TG_TOKEN` / `TG_CHAT` (alerty na Telegram).

## 5. Zbuduj UI i przetestuj lokalnie (bez pm2, jednorazowo)

```powershell
npm run build
npx tsx bot/observer.ts     # w jednym oknie — Ctrl+C po sprawdzeniu, że startuje bez błędów
npx tsx bot/server.ts       # w drugim oknie
```

Sprawdź w przeglądarce (na samym Windows): `http://localhost:8787/health`
powinno zwrócić `{"fresh":false,...}` od razu po starcie (świeże dopiero po
pierwszym cyklu bota — patrz `INTERVALS` w `bot/config.ts`) i `{"fresh":true,...}`
po ok. minucie. Zatrzymaj oba procesy (Ctrl+C) przed przejściem dalej.

## 6. Uruchomienie przez pm2 (docelowy tryb pracy)

```powershell
pm2 startOrReload deploy/ecosystem.config.js
pm2 save          # zapisuje bieżącą listę procesów — pm2-startup ją przywróci po reboocie
pm2 status        # oba procesy powinny być "online"
pm2 logs          # podgląd logów na żywo (Ctrl+C żeby wyjść, procesy dalej działają)
```

Logi trafiają też do plików: `.bot/pm2/homos-bot.{out,err}.log` i
`.bot/pm2/homos-server.{out,err}.log`.

## 7. Firewall — ograniczenie dostępu do LAN + VPN

Serwer NIE powinien być osiągalny z publicznego internetu (zero
port-forwardingu na routerze — patrz INFRA.md §3). Reguła firewalla Windows
ogranicza port API do zaufanych podsieci:

```powershell
# Uruchom jako Administrator. PODMIEŃ podsieci na swoje:
#  - podsieć LAN, np. 192.168.1.0/24
#  - podsieć Twojego VPN domowego, np. 10.8.0.0/24
New-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)" `
  -Direction Inbound -Protocol TCP -LocalPort 8787 `
  -RemoteAddress 192.168.1.0/24,10.8.0.0/24 `
  -Action Allow

# Domyślna polityka Windows Firewall już blokuje ruch inbound spoza reguł —
# powyższa reguła jest jedynym wyjątkiem dla portu 8787. Zweryfikuj:
Get-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)" | Format-List
```

Dodatkowo ustaw `BOT_API_TOKEN` w `.env` (patrz krok 4) — sama reguła
firewalla nie chroni przed innymi urządzeniami w tej samej sieci domowej
(goście na Wi-Fi). Serwer wymaga wtedy nagłówka `Authorization: Bearer <token>`
dla wszystkich `/api/*` (endpoint `/health` zostaje bez tokena, do monitoringu).
Klient webowy (UI) trzyma token w `localStorage` pod kluczem `homos_api_token`.

## 8. Energia i zegar (serwer 24/7)

```powershell
# Wyłącz usypianie (zasilanie sieciowe) — Administrator
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

# Wznawianie po zaniku prądu: ustawienie w BIOS/UEFI płyty głównej
# ("Restore on AC Power" / "After Power Loss" -> "Power On") — poza zasięgiem PowerShell,
# zrób to ręcznie przy starcie komputera (klawisz Del/F2 przy boocie).
```

Upewnij się, że zegar systemowy synchronizuje się z NTP (Ustawienia -> Czas
i język -> Data i godzina -> "Synchronizuj teraz") — potrzebne dla poprawnych
znaczników czasu w księdze/logach.

## 9. Test końcowy z telefonu (przez VPN)

1. Połącz iPhone z domowym VPN.
2. Wejdź na `http://<adres-LAN-serwera>:8787/health` — powinno zwrócić JSON.
3. Dodaj do ekranu głównego (Add to Home Screen) — PWA (patrz INFRA.md §5).

## 10. Weryfikacja po instalacji — checklist

```powershell
pm2 status                              # oba procesy "online", restarts ~0
curl http://localhost:8787/health       # 200 po ok. minucie działania bota
Get-NetFirewallRule -DisplayName "HOMOS API (LAN+VPN only)"   # reguła istnieje i jest Enabled
```

## 11. Codzienny backup

Patrz `deploy/backup.ps1` i sekcja "Backup" w tym pliku (dodawana przez to
zadanie) do skonfigurowania Harmonogramu zadań Windows.

### Rejestracja `deploy/backup.ps1` w Harmonogramie zadań (1x dziennie)

```powershell
# Uruchom jako Administrator. Podmień ścieżkę repo jeśli inna niż C:\homos.
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\homos\deploy\backup.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
Register-ScheduledTask -TaskName "HOMOS Daily Backup" -Action $action `
  -Trigger $trigger -Settings $settings -Description "Codzienny backup .bot/*.json i bazy HOMOS"

# Test natychmiastowy:
Start-ScheduledTask -TaskName "HOMOS Daily Backup"
Get-ScheduledTaskInfo -TaskName "HOMOS Daily Backup"
```

## Aktualizacje (po pierwszym setupie)

Wszystkie kolejne wdrożenia (nowy kod z Maca) idą przez `deploy/deploy.ps1`
— patrz jego nagłówek. Nie trzeba powtarzać kroków 1–3, 7–8 powyżej.
