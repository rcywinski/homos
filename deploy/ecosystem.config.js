// deploy/ecosystem.config.js — pm2 configuration for the Windows server (INFRA.md).
// Two processes: the observer bot (no transactions, see bot/observer.ts) and API+UI.
// Run from the repo root: `pm2 startOrReload deploy/ecosystem.config.js`
// (see deploy/deploy.ps1 and deploy/setup-windows.md for the full procedure).
//
// NOTE (Windows): script is deliberately NOT 'npx' — pm2 on Windows resolves 'npx'
// to npx.cmd and tries to run it through the node interpreter, which crashes with
// "SyntaxError: Unexpected token ':'" (the first line of a .cmd is a batch comment).
// Instead we call the tsx CLI (dist/cli.mjs) directly through node.

const TSX_CLI = 'node_modules/tsx/dist/cli.mjs';

module.exports = {
  apps: [
    {
      name: 'homos-bot',
      script: TSX_CLI,
      args: 'bot/observer.ts',
      cwd: __dirname + '/..',
      autorestart: true,
      max_memory_restart: '300M',
      // a daemon restart should not loop endlessly on a persistent error —
      // pm2 escalates the backoff anyway, but we keep a limit just in case
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
      script: TSX_CLI,
      args: 'bot/server.ts',
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
