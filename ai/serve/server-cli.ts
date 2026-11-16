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
import { existsSync } from 'fs';
import path from 'path';
import { LocalGenerator } from '../answer/local';
import { loadCorpus } from '../corpus/load';
import { createApp, type BoxProbe } from './app';
import type { AskDeps } from './ask';
import { ConfigError, loadServeConfig } from './config';
import { DryRunGenerator, FAKE_ENGINE, fakeRetrieval } from './fake-engine';
import { FileLog } from './log';
import { GpuQueue } from './queue';
import { RateLimiter } from './ratelimit';
import { IndexMismatch, loadCheckedIndex, localRetrieval, servedIndexPath } from './retrieve';

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

async function main() {
  const cfg = loadServeConfig();
  let deps: AskDeps;
  let probe: BoxProbe;
  if (cfg.engine === 'fake') {
    // The dry run never needs the index, but it reports on it, so CC-Win can check a copied index before step 4.8.
    const chunks = loadCorpus();
    const file = servedIndexPath(chunks);
    if (existsSync(file)) {
      loadCheckedIndex(chunks);
      console.log(`[serve] dry run: ${file} matches the corpus`);
    } else console.log(`[serve] dry run: ${file} not present; the real engine would refuse to start`);
    deps = { retrieval: await fakeRetrieval(), generator: new DryRunGenerator(), engine: FAKE_ENGINE, k: cfg.preset.k };
    probe = { up: async () => true };
  } else {
    deps = {
      retrieval: localRetrieval(cfg.inferenceUrl, cfg.rerankUrl),
      generator: new LocalGenerator({ ...cfg.preset.generator, baseUrl: cfg.inferenceUrl, timeoutMs: cfg.generateTimeoutMs }),
      engine: { id: cfg.preset.id, label: cfg.preset.label },
      k: cfg.preset.k,
    };
    probe = boxProbe(cfg.inferenceUrl, cfg.rerankUrl);
  }
  const app = createApp(deps, {
    maxQuestionChars: cfg.maxQuestionChars,
    queue: new GpuQueue(cfg.queueMax, cfg.jobDeadlineMs),
    limiter: new RateLimiter(cfg.limits),
    log: new FileLog(cfg.logDir),
    probe,
    trustProxy: cfg.trustProxy,
    paused: () => existsSync(cfg.pauseFile),
    staticDir: existsSync(path.join('showcase', 'public', 'app.js')) ? path.join('showcase', 'public') : undefined,
  });
  if (!existsSync(path.join('showcase', 'public', 'app.js'))) console.log('[serve] showcase not built (npm run showcase:build): API only');
  const server = app.listen(cfg.port, cfg.host, () => {
    const a = server.address();
    const port = a && typeof a === 'object' ? a.port : cfg.port;
    console.log(`[serve] ready on http://${cfg.host}:${port}, engine ${deps.engine.id}, retrieval ${deps.retrieval.name}`);
  });
}

main().catch((e: unknown) => {
  console.error(e instanceof ConfigError || e instanceof IndexMismatch ? `[serve] refusing to start: ${e.message}` : e);
  process.exit(1);
});
