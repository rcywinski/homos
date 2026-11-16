/**
 * Starts the public chat backend (phase 4). Not run before step 4.8: it needs the inference box.
 * Run: npm run serve:chat   (with INFERENCE_URL and RERANK_URL set and ANTHROPIC_API_KEY absent)
 *
 * dotenv is not loaded here on purpose: the repo's .env holds the owner's key, and this process must not see it. The
 * environment is passed explicitly by the service that starts it (step 4.8).
 */
import { LocalGenerator } from '../answer/local';
import { createApp } from './app';
import { ConfigError, loadServeConfig } from './config';
import { localRetrieval } from './retrieve';

try {
  const cfg = loadServeConfig();
  const generator = new LocalGenerator({ ...cfg.preset.generator, baseUrl: cfg.inferenceUrl, timeoutMs: cfg.generateTimeoutMs });
  const retrieval = localRetrieval(cfg.inferenceUrl, cfg.rerankUrl);
  const app = createApp({ retrieval, generator, engine: { id: cfg.preset.id, label: cfg.preset.label }, k: cfg.preset.k }, { maxQuestionChars: cfg.maxQuestionChars });
  app.listen(cfg.port, cfg.host, () => {
    console.log(`[serve] chat on http://${cfg.host}:${cfg.port}, preset ${cfg.preset.id}, retrieval ${retrieval.name}`);
  });
} catch (e) {
  console.error(e instanceof ConfigError ? `[serve] ${e.message}` : e);
  process.exit(1);
}
