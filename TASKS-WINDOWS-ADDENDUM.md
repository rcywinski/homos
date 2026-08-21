# TASKS-WINDOWS — ADDENDUM: boty mają być NIEWIDOCZNE

> Kontekst: użytkownik zabił procesy — pm2 wystartowany przez pm2-windows-startup
> otwiera widoczne czarne okna konsoli. Docelowo: usługi systemowe bez żadnych okien.

- [x] 1. (10.08) Usunięto autostart pm2-windows-startup (`pm2-startup uninstall`) i wpis z rejestru Run, jeśli został.
- [x] 2. (10.08) Zainstalowano NSSM: `winget install nssm` (lub choco).
- [x] 3. (10.08) Zarejestrowano DWIE usługi systemowe (działają w tle, zero okien, autostart, restart po awarii):
      nssm install homos-bot "C:\Program Files\nodejs\node.exe" "C:\Projects\homos\node_modules\tsx\dist\cli.mjs" "bot\observer.ts"
      nssm set homos-bot AppDirectory C:\Projects\homos
      nssm set homos-bot AppStdout C:\Projects\homos\.bot\pm2\bot-service.log
      nssm set homos-bot AppStderr C:\Projects\homos\.bot\pm2\bot-service.err.log
      nssm set homos-bot AppRestartDelay 5000
      (analogicznie homos-server dla bot\server.ts)
      UWAGA: ścieżki zweryfikuj lokalnie (node.exe może być w innym miejscu — `where node`).
- [x] 4. (10.08) Usługi czytają .env — NSSM nie laduje .env automatycznie; najprościej: w bot/observer.ts i bot/server.ts jest już dotenv? Jeśli NIE — dodaj na górze `import 'dotenv/config';` (dotenv jest w dependencies) i zacommituj.
- [x] 5. (10.08) `nssm start homos-bot && nssm start homos-server`; sprawdź: brak okien, Menedżer zadań → Usługi → obie Running, `curl localhost:8787/health` OK, .bot/state.json się odświeża.
- [ ] 6. **NADAL NIEZROBIONE** Test reboot: restart komputera → usługi wstają same, nadal zero okien.
- [x] 7. (10.08) Pipeline w Harmonogramie zadań (ukryty): `schtasks /Create /TN HomosPipeline /TR "cmd /c cd /d C:\Projects\homos && npm run pipeline >> data\pipeline-task.log 2>&1" /SC DAILY /ST 07:30 /RU SYSTEM` — uruchamiany jako SYSTEM = bez okna. Godzina 07:30, żeby dane były świeże przed 8:00.
- [x] 8. (10.08) Wpis do CONTEXT.md + commit + push.

## NAWRÓT 21.08 — dlaczego okna wróciły

Rafał zgłosił dwa puste okna node po restarcie. Przyczyna: `deploy/deploy.ps1`
nigdy nie został zaktualizowany po migracji z 10.08 i wciąż kończył się
`pm2 startOrReload` + `pm2 save`. Każde wdrożenie po cichu przywracało pm2
(procesy w sesji użytkownika = widoczne okna) obok usług NSSM. Dziś zamknęło
się to pełnym kołem: instrukcja wdrożenia odesłała CC-Win do tego skryptu,
a on — widząc `ecosystem.config.js` w commicie — rozsądnie założył migrację
nssm→pm2 i zatrzymał usługi NSSM.

POPRAWIONE 21.08: `deploy.ps1` operuje wyłącznie na NSSM, pm2 zniknęło ze
skryptu. Dodatkowo skrypt pomija restart usług, gdy commit dotyka tylko
`src/**` — `bot/server.ts` serwuje `public/` przez `express.static`, więc
sam build wystarcza. `deploy/ecosystem.config.js` zostawiam w repo jako
historyczny artefakt, ale NIE jest już nigdzie wołany — jeśli ma zostać,
to tylko z nagłówkiem „NIEUŻYWANE".
