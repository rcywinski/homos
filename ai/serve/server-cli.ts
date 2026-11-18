/**
 * Starts the public chat backend (phase 4).
 *
 *   node --env-file=<serve.env> --import tsx ai/serve/server-cli.ts
 *
 * Plain `node`, no shell script, so the same command runs from a Windows scheduled task (step 4.4b and 4.8). The env
 * file lives outside the repo and holds only the SERVE_* values and the box URLs. dotenv is not loaded here on purpose:
 * the repo's .env holds the owner's key, and this process must not see it.
 *
 * SERVE_ENGINE=fake runs the dry run (fake models, no GPU). With the real engine the server refuses to start when the
 * saved index does not match the corpus on disk.
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { LocalGenerator } from '../answer/local';
import { loadCorpus } from '../corpus/load';
import { createApp, type BoxProbe } from './app';
import type { AskDeps } from './ask';
import { ConfigError, loadServeConfig } from './config';
import { DryRunGenerator, FAKE_ENGINE, FakeModelBackend, fakeRetrieval } from './fake-engine';
import { AccessVerifier } from './access';
import { OwnerSwitch } from './admin';
import { Tickets } from './guest';
import { Models } from './models-state';
import { FileLog } from './log';
import { loadWalletForServing } from './wallet-export';
import { GpuQueue } from './queue';
import { RateLimiter } from './ratelimit';
import { leftoverModels, loadedModels, OllamaModelBackend, rerankHealth, rerankProblem, residencyProblem, ResidencyError, startupProblem, type ResidencyOptions } from './residency';
import { checkCorpus, IndexMismatch, loadCheckedIndex, localRetrieval, servedIndexPath } from './retrieve';

/** Asks both model services for a sign of life, at most every 30 s; 3 s timeout each. */
function boxProbe(inferenceUrl: string, rerankUrl: string): BoxProbe {
  let last = 0;
  let value = false;
  const ping = async (url: string) => (await fetch(url, { signal: AbortSignal.timeout(3000) })).ok;
  return {
    async up() {
      if (Date.now() - last < 30_000) return value;
      last = Date.now();
      value = await Promise.all([ping(`${inferenceUrl.replace(/\/$/, '')}/api/version`), ping(`${rerankUrl.replace(/\/$/, '')}/health`)])
        .then((r) => r.every(Boolean))
        .catch(() => false);
      return value;
    },
  };
}

/** The owner switch: on only when the file exists and says "on" (step 4.10). */
function switchSaysOn(file: string): boolean {
  try {
    return readFileSync(file, 'utf8').trim().toLowerCase() === 'on';
  } catch {
    return false;
  }
}

async function main() {
  const cfg = loadServeConfig();
  let deps: AskDeps;
  let probe: BoxProbe;
  const queue = new GpuQueue(cfg.queueMax, cfg.jobDeadlineMs);
  const log = (m: string) => console.log(`[serve] ${new Date().toISOString()} ${m}`);
  // Step 4.10c: the master switch file (read-only to the server) and, with the admin page configured, the page's state.
  const ownerSwitch = new OwnerSwitch(cfg.switchFile, cfg.adminStateFile, cfg.access !== null, cfg.adminLogFile);
  // Step 4.10: the models start unloaded; a visitor loads them, if the owner switch is on (the pause file wins).
  const modelsOptions = {
    typicalMs: cfg.typicalLoadMs,
    switchOn: () => ownerSwitch.on() && !existsSync(cfg.pauseFile),
    busy: () => queue.state().running || queue.state().waiting > 0,
    cooldownMs: cfg.loadCooldownMs,
    log,
  };
  let models: Models;
  if (cfg.engine === 'fake') {
    // The dry run never needs the index, but it reports on it, so CC-Win can check a copied index before step 4.8.
    const chunks = loadCorpus();
    checkCorpus(chunks, cfg.preset);
    console.log(`[serve] dry run: corpus hash ${cfg.preset.corpusHash} (index view ${cfg.preset.indexCorpusHash}) as measured`);
    const file = servedIndexPath(chunks);
    if (existsSync(file)) {
      loadCheckedIndex(chunks);
      console.log(`[serve] dry run: ${file} matches the corpus`);
    } else console.log(`[serve] dry run: ${file} not present; the real engine would refuse to start`);
    deps = { retrieval: await fakeRetrieval(), generator: new DryRunGenerator(cfg.fakeDelayMs), engine: FAKE_ENGINE, k: cfg.preset.k };
    probe = { up: async () => true };
    models = new Models({ ...modelsOptions, backend: new FakeModelBackend(cfg.fakeLoadMs, cfg.fakeLoadFail) });
  } else {
    const residency: ResidencyOptions = {
      baseUrl: cfg.inferenceUrl,
      generator: cfg.preset.generator.model,
      numCtx: cfg.preset.generator.numCtx,
      embedder: cfg.embedModel,
      keepAlive: cfg.keepAlive,
      rerankUrl: cfg.rerankUrl,
      reranker: 'bge-reranker-v2-m3',
    };
    // Start-up checks only what does not need the GPU (4.10b): Ollama answers, both models on disk, the reranker on
    // CUDA. Nothing is loaded here; the fixed load order runs when a visitor presses "Load" (ai/serve/models-state.ts).
    const problem = await startupProblem(residency);
    if (problem) throw new ResidencyError(problem);
    console.log(`[serve] start-up check: Ollama answers, ${residency.generator} and ${residency.embedder} on disk, reranker ${residency.reranker} on cuda; nothing loaded`);
    const backend = new OllamaModelBackend(residency);
    models = new Models({ ...modelsOptions, backend });
    const m = models;
    // Models a previous server left loaded (crash, restart, swap) are released now, not after keep_alive.
    void m.releaseLeftovers(await leftoverModels(residency));
    deps = {
      retrieval: localRetrieval(cfg.inferenceUrl, cfg.rerankUrl, cfg.preset, cfg.keepAlive),
      generator: new LocalGenerator({ ...cfg.preset.generator, keepAlive: cfg.keepAlive, baseUrl: cfg.inferenceUrl, timeoutMs: cfg.generateTimeoutMs }),
      engine: { id: cfg.preset.id, label: cfg.preset.label },
      k: cfg.preset.k,
      // Before each question: the resident set is still as loaded. If not (Ollama restarted, a model evicted), nothing
      // reloads by itself: the rest is released, the state drops to idle and the visitor sees the load button again.
      beforeWork: async () => {
        const problem = residencyProblem(await loadedModels(residency), residency) ?? rerankProblem(await rerankHealth(residency), residency);
        if (problem) {
          void m.lost(problem);
          throw new ResidencyError(problem);
        }
      },
      // Guest-key retrieval (4.6a) needs bge-m3 and the reranker only.
      beforeSearch: async () => {
        const problem = await backend.check('search');
        if (problem) {
          void m.lost(problem);
          throw new ResidencyError(problem);
        }
      },
    };
    probe = boxProbe(cfg.inferenceUrl, cfg.rerankUrl);
  }
  // M1: the wallet file is served only if it is under data/ (or a test fixture in the dry run), is JSON of the right
  // shape and passes the export audit; otherwise the Wallet tab stays hidden and the log says why.
  const wallet = loadWalletForServing(cfg.walletFile, { allowFixtures: cfg.engine === 'fake' });
  console.log(wallet.ok ? `[serve] wallet data served from ${cfg.walletFile}` : `[serve] no wallet data served: ${wallet.reason}`);
  console.log(`[serve] mode ${cfg.mode}${cfg.mode === 'tunnel' ? ' (visitor = CF-Connecting-IP, listening on 127.0.0.1 only)' : ''}`);
  const app = createApp(deps, {
    maxQuestionChars: cfg.maxQuestionChars,
    queue,
    limiter: new RateLimiter(cfg.limits),
    log: new FileLog(cfg.logDir),
    probe,
    trustProxy: cfg.trustProxy,
    paused: () => existsSync(cfg.pauseFile),
    walletJson: wallet.ok ? wallet.json : undefined,
    models,
    loadLimiter: new RateLimiter(cfg.loadLimits),
    // Guest-key mode (4.6a): tickets signed with a secret drawn now and kept in memory only; verify has its own
    // limits, as many as questions, so one guest question costs one retrieval and one verification.
    ...(cfg.access
      ? {
          admin: {
            verifier: new AccessVerifier(cfg.access),
            switch: ownerSwitch,
            denyLimiter: new RateLimiter({ perHour: 20, perDay: 100, globalPerDay: 2000 }),
            htmlFile: path.join('showcase', 'admin', 'admin.html'),
            cssFile: path.join('showcase', 'admin', 'admin.css'),
            jsFile: path.join('showcase', 'admin-dist', 'admin.js'),
          },
        }
      : {}),
    guest: {
      tickets: new Tickets(cfg.preset.corpusHash),
      chunkById: (() => {
        const byId = new Map(loadCorpus().map((c) => [c.id, c]));
        return (id: string) => byId.get(id);
      })(),
      verifyLimiter: new RateLimiter(cfg.limits),
    },
    staticDir: existsSync(path.join('showcase', 'public', 'app.js')) ? path.join('showcase', 'public') : undefined,
  });
  if (!existsSync(path.join('showcase', 'public', 'app.js'))) console.log('[serve] showcase not built (npm run showcase:build): API only');
  models.startTimer();
  console.log(`[serve] models start unloaded; owner switch ${switchSaysOn(cfg.switchFile) ? 'on' : 'off'} (${cfg.switchFile}); released after 15 min without questions`);
  console.log(
    cfg.access
      ? `[serve] admin page on (Access team ${cfg.access.teamDomain}); page switch ${ownerSwitch.page()} (${cfg.adminStateFile}); models allowed: ${ownerSwitch.on() ? 'yes' : 'no'}`
      : '[serve] admin page off (no SERVE_ACCESS_* values); the switch file alone decides',
  );
  const server = app.listen(cfg.port, cfg.host, () => {
    const a = server.address();
    const port = a && typeof a === 'object' ? a.port : cfg.port;
    console.log(`[serve] ready on http://${cfg.host}:${port}, engine ${deps.engine.id}, retrieval ${deps.retrieval.name}`);
  });
}

main().catch((e: unknown) => {
  console.error(e instanceof ConfigError || e instanceof IndexMismatch || e instanceof ResidencyError ? `[serve] refusing to start: ${e.message}` : e);
  process.exit(1);
});
