// deploy/ecosystem.config.js — konfiguracja pm2 dla serwera Windows (INFRA.md).
// Dwa procesy: bot-obserwator (bez transakcji, patrz bot/observer.ts) i API+UI.
// Uruchamiane z katalogu głównego repo: `pm2 startOrReload deploy/ecosystem.config.js`
// (patrz deploy/deploy.ps1 i deploy/setup-windows.md dla pełnej procedury).

module.exports = {
  apps: [
    {
      name: 'homos-bot',
      script: 'npx',
      args: 'tsx bot/observer.ts',
      cwd: __dirname + '/..',
      autorestart: true,
      max_memory_restart: '300M',
      // restart daemona nie powinien się zapętlać w kółko przy trwałym błędzie —
      // pm2 i tak eskaluje backoff, ale trzymamy limit na wszelki wypadek
      max_restarts: 20,
      min_uptime: '30s',
      out_file: '.bot/pm2/homos-bot.out.log',
      error_file: '.bot/pm2/homos-bot.err.log',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'homos-server',
      script: 'npx',
      args: 'tsx bot/server.ts',
      cwd: __dirname + '/..',
      autorestart: true,
      max_memory_restart: '300M',
      max_restarts: 20,
      min_uptime: '30s',
      out_file: '.bot/pm2/homos-server.out.log',
      error_file: '.bot/pm2/homos-server.err.log',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
