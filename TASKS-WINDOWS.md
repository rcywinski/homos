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

- [ ] **1. Kod na maszynie**: jeśli folder repo jest już podpięty do sesji — pracuj
  w nim. Jeśli repo nie ma na dysku: `git clone <adres-prywatnego-repo>` (adres da
  użytkownik; jeśli repo GitHub jeszcze nie istnieje — patrz "Przygotowanie na Macu"
  na dole i poproś użytkownika o wykonanie tamtych 4 komend na Macu).
- [ ] **2. Środowisko**: `node --version` (wymagane v22.x; brak → `winget install OpenJS.NodeJS.LTS`),
  potem w repo `npm ci`. Sprawdź `npx tsx --version`.
- [ ] **3. Konfiguracja**: skopiuj `.env.example` → `.env`; ustaw BOT_WATCH_ADDRESS
  (adres portfela obserwowanego — jest w CONTEXT.md), BOT_API_PORT=8787,
  BOT_API_TOKEN=<wygeneruj losowy 32-znakowy>. TG_TOKEN/TG_CHAT zostaw puste
  (użytkownik uzupełni po założeniu bota na Telegramie).
- [ ] **4. Test ręczny**: `npm run bot` — po ~1 min ma powstać `.bot/state.json`
  z cenami 3 pul i pozycjami; obejrzyj log, zweryfikuj że ceny wyglądają sensownie
  (ETH ~$1900-2000). Ctrl+C. Potem `npm run bot:server` + `curl http://localhost:8787/health`.
- [ ] **5. pm2 jako usługa**: wg `deploy/setup-windows.md` (npm i -g pm2 +
  pm2-windows-startup, `pm2 startOrReload deploy/ecosystem.config.js`, `pm2 save`,
  `pm2-startup install`). Sprawdź `pm2 status` — oba procesy online.
- [ ] **6. Zasilanie**: `powercfg /change standby-timeout-ac 0` i
  `powercfg /change hibernate-timeout-ac 0` (komputer nie może usypiać).
- [ ] **7. Firewall**: reguła z setup-windows.md (port 8787 tylko podsieć domowa
  + podsieć VPN — zapytaj użytkownika o zakresy adresów, np. 192.168.1.0/24).
- [ ] **8. Test z zewnątrz**: poproś użytkownika, by z Maca otworzył
  `http://<IP-windows>:8787/health` (podaj mu IP: `ipconfig`). Ma być {"fresh":true}.
- [ ] **9. Backup**: zadanie harmonogramu wg deploy/backup.ps1 + setup-windows.md.
- [ ] **10. Raport**: wpis do CONTEXT.md (co działa, IP serwera, port, ewentualne
  problemy) + commit + push. Odhacz kroki w tym pliku.

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
