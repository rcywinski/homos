# TASKS-WINDOWS — ADDENDUM: boty mają być NIEWIDOCZNE

> Kontekst: użytkownik zabił procesy — pm2 wystartowany przez pm2-windows-startup
> otwiera widoczne czarne okna konsoli. Docelowo: usługi systemowe bez żadnych okien.

- [ ] 1. Usuń autostart pm2-windows-startup (`pm2-startup uninstall`) i wpis z rejestru Run, jeśli został.
- [ ] 2. Zainstaluj NSSM: `winget install nssm` (lub choco).
- [ ] 3. Zarejestruj DWIE usługi systemowe (działają w tle, zero okien, autostart, restart po awarii):
      nssm install homos-bot "C:\Program Files\nodejs\node.exe" "C:\Projects\homos\node_modules\tsx\dist\cli.mjs" "bot\observer.ts"
      nssm set homos-bot AppDirectory C:\Projects\homos
      nssm set homos-bot AppStdout C:\Projects\homos\.bot\pm2\bot-service.log
      nssm set homos-bot AppStderr C:\Projects\homos\.bot\pm2\bot-service.err.log
      nssm set homos-bot AppRestartDelay 5000
      (analogicznie homos-server dla bot\server.ts)
      UWAGA: ścieżki zweryfikuj lokalnie (node.exe może być w innym miejscu — `where node`).
- [ ] 4. Usługi mają czytać .env — NSSM nie laduje .env automatycznie; najprościej: w bot/observer.ts i bot/server.ts jest już dotenv? Jeśli NIE — dodaj na górze `import 'dotenv/config';` (dotenv jest w dependencies) i zacommituj.
- [ ] 5. `nssm start homos-bot && nssm start homos-server`; sprawdź: brak okien, Menedżer zadań → Usługi → obie Running, `curl localhost:8787/health` OK, .bot/state.json się odświeża.
- [ ] 6. Test reboot: restart komputera → usługi wstają same, nadal zero okien.
- [ ] 7. Pipeline w Harmonogramie zadań (ukryty): `schtasks /Create /TN HomosPipeline /TR "cmd /c cd /d C:\Projects\homos && npm run pipeline >> data\pipeline-task.log 2>&1" /SC DAILY /ST 07:30 /RU SYSTEM` — uruchamiany jako SYSTEM = bez okna. Godzina 07:30, żeby dane były świeże przed 8:00.
- [ ] 8. Wpis do CONTEXT.md + commit + push.
