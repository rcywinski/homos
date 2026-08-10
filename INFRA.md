# INFRA.md — infrastruktura: bot na Windows, klienci Mac/iPhone przez LAN/VPN

> Data: 2026-08-10 · Decyzja: serwer = stacjonarny Windows użytkownika (24/7),
> dostęp z Maca i iPhone'a po LAN, spoza domu przez istniejący VPN domowy.

## 1. Architektura docelowa

```
┌────────────────────────── WINDOWS (serwer, 24/7) ──────────────────────────┐
│  pm2 ── bot-daemon (packages/bot)      pętle: monitor/sygnały/egzekucja    │
│      └─ api+ui server (Express)        REST+WebSocket + statyczny build UI │
│  SQLite (księga, sygnały, propozycje)  klucz portfela operacyjnego (AUTO)  │
└────────────────────────────────┬───────────────────────────────────────────┘
                     LAN / VPN (bez ekspozycji publicznej!)
        ┌────────────────────────┼───────────────────────────┐
   Mac (przeglądarka)      iPhone (PWA w Safari)        Telegram (alerty push)
   + Rabby do podpisów     odczyt + zatwierdzanie
   w trybie PROPONUJ       propozycji
```

## 2. Serwer Windows — konkrety

- **Runtime**: Node 22 natywnie (bez WSL — mniej problemów z siecią LAN) + `pm2`
  z `pm2-windows-startup` (autostart po reboocie) lub NSSM jako usługa Windows.
- **Procesy pm2**: `homos-bot` (daemon), `homos-server` (API + statyczne UI z
  `webpack --mode production`; zalążek `server.js` już jest w repo).
- **Baza**: plik SQLite w katalogu danych + **backup**: codzienny kopia do folderu
  synchronizowanego (OneDrive/Syncthing) — księga podatkowa nie może zginąć.
- **Energia**: wyłączyć usypianie (powercfg), wznawianie po zaniku prądu w BIOS
  (Restore on AC Power), auto-restart pm2 po crashu.
- **Zegar**: NTP włączony (timestampy księgi).

## 3. Sieć i bezpieczeństwo

- Serwer słucha TYLKO na interfejsie LAN (np. `0.0.0.0:8443` za firewallem
  Windows ograniczonym do podsieci domowej + podsieci VPN). **Zero port-forwardingu
  na routerze — dostęp zdalny wyłącznie przez istniejący VPN.**
- Mimo VPN: prosty token dostępu w UI (nagłówek/cookie) — goście w domowym Wi-Fi
  nie powinni widzieć finansów.
- **Klucze**: klucz portfela operacyjnego (tryb AUTO) tylko na Windows, w env
  szyfrowanym DPAPI (`npx dpapi-cli` / credential manager), nigdy w repo, nigdy
  w UI. Tryb PROPONUJ nie wymaga klucza na serwerze — transakcję buduje bot,
  a podpisuje Rabby na Macu / WalletConnect na iPhonie.
- HTTPS lokalnie: self-signed cert lub mkcert (iPhone PWA wymaga https dla
  service workerów; w ostateczności http po VPN też zadziała bez PWA-cache).

## 4. Przepływ kodu: Mac (dev) → Windows (serwer)

- **Git jako kanał wdrożeń**: prywatne repo (GitHub) — Mac pushuje, Windows pulluje.
  Skrypt `deploy.ps1` na Windows: `git pull && npm ci && npm run build && pm2 restart all`.
- Alternatywa do rozważenia: **Claude desktop także na Windows** — sesja Cowork
  z podpiętym folderem serwera mogłaby zarządzać botem bezpośrednio (agent-runner
  działa tam identycznie). Wtedy zdalna diagnostyka/naprawa bez RDP.

## 5. iPhone

- UI responsywne jako PWA (Add to Home Screen) — pełny poranny brief + zatwierdzanie
  propozycji; podpisy transakcji przez WalletConnect (Rabby mobile/inny portfel)
  dopiero w trybie PROPONUJ, w AUTO niepotrzebne.
- Alerty: bot → Telegram (natychmiastowe, darmowe, działa wszędzie bez VPN).

## 6. Kolejność wdrożenia (rozszerza kroki A–F z UI-VISION.md)

1. **Teraz**: repo → prywatny GitHub (backup + kanał wdrożeń).
2. Windows: Node + pm2 + klon repo + `npm run agent` jako pierwsza usługa
   (mostek zadań działa od razu; fetch danych może mielić na serwerze zamiast Maca).
3. `packages/bot` w trybie OBSERWUJ (krok C wizji) jako usługa pm2 + serwer API/UI.
4. Firewall + token + test z iPhone'a przez VPN.
5. PROPONUJ → AUTO zgodnie ze ścieżką zaufania.
