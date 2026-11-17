/**
 * Configuration of the public chat backend (phase 4, step 4.3).
 *
 * The served engine is a configuration value, not code (owner decision of 16 Nov 2026): phase 3 may still change which
 * local model is best. Each preset is tied to a measured run, and `ai/serve/serve.test.ts` checks that the preset
 * builds a generator whose settings equal the `generatorSettings` recorded in that run's result file, so the chat never
 * serves an unmeasured configuration by accident. A new phase 3 winner is added here as a new preset with its run.
 *
 * There is no Anthropic key on this path: `loadServeConfig` refuses to start when `ANTHROPIC_API_KEY` is set.
 */
import path from 'path';
import { LOCAL_QUOTE_SYSTEM } from '../answer/prompt-local';
import type { LocalGenOptions } from '../answer/local';

export interface ServedPreset {
  id: string;
  /** Shown to visitors next to every answer. */
  label: string;
  /** Result file of the measured run this preset reproduces (its `generatorSettings` and `retrieval`). */
  measuredRun: string;
  /** Generator options without the box URL. */
  generator: Omit<LocalGenOptions, 'baseUrl' | 'fetchFn' | 'countTokens'>;
  /** Chunks given to the generator. */
  k: number;
  /**
   * Corpus the measured run used: the project-wide corpus hash, over the plain chunks (`corpusHash(loadCorpus())`).
   * The served index stores a different value, the hash of the meta view of the same chunks (each chunk text with its
   * "[file | date | title]" header, which is what the meta index embeds); see `ai/APP-PLAN.md`, section 6.
   */
  corpusHash: string;
  /** Hash stored in the served index: `corpusHash(metaView(loadCorpus()))` of the same corpus. */
  indexCorpusHash: string;
}

export const PRESETS: Record<string, ServedPreset> = {
  'qwen-p-local': {
    id: 'qwen-p-local',
    label: 'qwen3.8:27b, local prompt, fully local retrieval',
    measuredRun: 'ai/eval/results/2026-11-16-answers-k10-local-pb1-golden-v1-4.json',
    generator: {
      model: 'qwen3.8:27b',
      tokenizerDir: 'ai/index/tokenizers/qwen3.8-27b',
      think: false,
      numCtx: 17408,
      numPredict: 2048,
      sampling: { temperature: 0.7, top_p: 0.8, top_k: 20, min_p: 0, presence_penalty: 0, repeat_penalty: 1.0, frequency_penalty: 0 } as LocalGenOptions['sampling'],
      keepAlive: '2m',
      maxNetworkRetries: 0,
      system: LOCAL_QUOTE_SYSTEM,
      systemName: 'LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts)',
    },
    k: 10,
    corpusHash: '8d7f9a3437b43594',
    indexCorpusHash: 'cb41ca39fd344c6f',
  },
};

export const DEFAULT_PRESET = 'qwen-p-local';

export interface ServeConfig {
  /** 'local' serves the preset on the box; 'fake' is the dry run of step 4.4b (no GPU, no box URLs needed). */
  engine: 'local' | 'fake';
  preset: ServedPreset;
  inferenceUrl: string;
  rerankUrl: string;
  host: string;
  port: number;
  /** Question length limit in characters, after trimming. */
  maxQuestionChars: number;
  /** Generator timeout per question (inside the job). */
  generateTimeoutMs: number;
  /** Deadline of one queued job from its start: retrieval plus generation plus verification. */
  jobDeadlineMs: number;
  /** Jobs allowed to wait behind the running one. */
  queueMax: number;
  limits: { perHour: number; perDay: number; globalPerDay: number };
  /**
   * SERVE_MODE (step 4.7, M3): 'local' takes the visitor from the socket; 'tunnel' (behind Cloudflare Tunnel, step 4.9)
   * takes the visitor from CF-Connecting-IP and requires the server to listen on 127.0.0.1 only, so nobody can reach
   * it without the tunnel and forge that header. Mapped to the app's trustProxy.
   */
  mode: 'local' | 'tunnel';
  trustProxy: 'none' | 'cloudflare';
  /** Request log directory (gitignored). */
  logDir: string;
  /** While this file exists the chat is paused (CC-Win creates it before using the GPU for other work). */
  pauseFile: string;
  /** Dry run only: delay of each fake answer, to show the queue in the browser suite. */
  fakeDelayMs: number;
  /**
   * Owner switch (step 4.10): the file says "on" or the models stay off; a missing file is "off", so a restart never
   * loads anything by itself. The pause file wins over it. Read by the dry run from 4.10a; the real engine reads it from
   * 4.10b (until then it loads at start, as in 4.8).
   */
  switchFile: string;
  /** Model loads, separately from questions: per visitor per hour and per UTC day, and for the site per UTC day. */
  loadLimits: { perHour: number; perDay: number; globalPerDay: number };
  /** Typical stage times in milliseconds, shown to the visitor while loading (measured on the box, 4.10d). */
  typicalLoadMs: { 'release-embedder': number; generator: number; embedder: number; check: number };
  /** Dry run only: duration of each fake load stage, and a stage that fails (for the browser suite). */
  /** After a failed load, no new load for this long (owner, 17 Nov 2026: 2 minutes). */
  loadCooldownMs: number;
  fakeLoadMs: number;
  fakeLoadFail: '' | 'generator' | 'embedder' | 'check';
  /**
   * keep_alive for the generator and the embedder on the box. Long, so the generator stays resident: reloading it
   * evicts bge-m3 (step 3.5). It does not shape the output, so the measured preset is unchanged.
   */
  keepAlive: string;
  /** Embedding model loaded after the generator (ai/serve/residency.ts). */
  embedModel: string;
  /** Sanitized wallet export served at /data/wallet.json when it exists (step 4.1b); missing means no Wallet tab. */
  walletFile: string;
}

export class ConfigError extends Error {}

type Env = Record<string, string | undefined>;

function int(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new ConfigError(`${name} must be an integer from ${min} to ${max}`);
  return n;
}

/** Ollama duration such as 24h, 90m or -1 (forever); a short value would let the generator unload between questions. */
function keepAlive(raw: string | undefined): string {
  // Step 4.10b: the server releases the models itself; keep_alive is only the ceiling if the server dies.
  const v = raw || '60m';
  if (!/^(-1|\d+(s|m|h))$/.test(v)) throw new ConfigError('SERVE_KEEP_ALIVE must look like 24h, 90m, 3600s or -1');
  return v;
}

function fakeLoadFail(raw: string | undefined): ServeConfig['fakeLoadFail'] {
  const v = raw ?? '';
  if (v !== '' && v !== 'generator' && v !== 'embedder' && v !== 'check') throw new ConfigError('SERVE_FAKE_LOAD_FAIL must be empty, generator, embedder or check');
  return v;
}

function serveMode(env: Env): 'local' | 'tunnel' {
  if (env.SERVE_TRUST_PROXY) throw new ConfigError('SERVE_TRUST_PROXY was replaced by SERVE_MODE (local or tunnel); remove it');
  const raw = env.SERVE_MODE || 'local';
  if (raw !== 'local' && raw !== 'tunnel') throw new ConfigError('SERVE_MODE must be local or tunnel');
  return raw;
}

export function loadServeConfig(env: Env = process.env): ServeConfig {
  if (env.ANTHROPIC_API_KEY) {
    throw new ConfigError('ANTHROPIC_API_KEY is set: the public chat must never run with the owner key in its environment. Start it with an environment that has no key.');
  }
  const presetId = env.SERVE_PRESET || DEFAULT_PRESET;
  const preset = PRESETS[presetId];
  if (!preset) throw new ConfigError(`SERVE_PRESET "${presetId}" is not one of: ${Object.keys(PRESETS).join(', ')}`);
  const engine = env.SERVE_ENGINE || 'local';
  if (engine !== 'local' && engine !== 'fake') throw new ConfigError('SERVE_ENGINE must be local or fake');
  const inferenceUrl = env.INFERENCE_URL ?? '';
  const rerankUrl = env.RERANK_URL ?? '';
  if (engine === 'local' && (!inferenceUrl || !rerankUrl)) throw new ConfigError('INFERENCE_URL and RERANK_URL must be set (see .env.example)');
  const host = env.SERVE_HOST || '127.0.0.1';
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new ConfigError('SERVE_HOST must be a loopback address: the chat is reached only through the tunnel (step 4.9)');
  }
  const mode = serveMode(env);
  if (mode === 'tunnel' && host !== '127.0.0.1') {
    throw new ConfigError('SERVE_MODE=tunnel trusts CF-Connecting-IP, so the server must listen on 127.0.0.1 only (SERVE_HOST=127.0.0.1)');
  }
  return {
    engine,
    preset,
    inferenceUrl,
    rerankUrl,
    host,
    port: int(env, 'SERVE_PORT', 8790, 0, 65535),
    maxQuestionChars: int(env, 'SERVE_MAX_QUESTION_CHARS', 500, 20, 2000),
    generateTimeoutMs: int(env, 'SERVE_GENERATE_TIMEOUT_MS', 180_000, 10_000, 600_000),
    jobDeadlineMs: int(env, 'SERVE_JOB_DEADLINE_MS', 240_000, 10_000, 900_000),
    queueMax: int(env, 'SERVE_QUEUE_MAX', 5, 0, 50),
    limits: {
      perHour: int(env, 'SERVE_LIMIT_HOUR', 5, 1, 1000),
      perDay: int(env, 'SERVE_LIMIT_DAY', 20, 1, 10_000),
      globalPerDay: int(env, 'SERVE_LIMIT_GLOBAL_DAY', 200, 1, 100_000),
    },
    mode,
    trustProxy: mode === 'tunnel' ? 'cloudflare' : 'none',
    logDir: env.SERVE_LOG_DIR || path.join('ai', 'serve', 'logs'),
    pauseFile: env.SERVE_PAUSE_FILE || path.join('ai', 'serve', 'PAUSED'),
    fakeDelayMs: int(env, 'SERVE_FAKE_DELAY_MS', 0, 0, 60_000),
    switchFile: env.SERVE_SWITCH_FILE || path.join('ai', 'serve', 'SWITCH'),
    loadLimits: {
      perHour: int(env, 'SERVE_LOAD_LIMIT_HOUR', 2, 1, 100),
      perDay: int(env, 'SERVE_LOAD_LIMIT_DAY', 6, 1, 1000),
      globalPerDay: int(env, 'SERVE_LOAD_LIMIT_GLOBAL_DAY', 30, 1, 10_000),
    },
    // Measured on the box (4.8j to 4.10d): generator 15.6 to 21.7 s (median 21.0 of five loads), bge-m3 2.6 s,
    // check 0.0 to 0.1 s. The release of bge-m3 alone is not measured yet (no public search load).
    typicalLoadMs: {
      'release-embedder': int(env, 'SERVE_TYPICAL_RELEASE_MS', 1000, 0, 600_000),
      generator: int(env, 'SERVE_TYPICAL_GENERATOR_MS', 21_000, 0, 600_000),
      embedder: int(env, 'SERVE_TYPICAL_EMBEDDER_MS', 2600, 0, 600_000),
      check: int(env, 'SERVE_TYPICAL_CHECK_MS', 200, 0, 600_000),
    },
    loadCooldownMs: int(env, 'SERVE_LOAD_COOLDOWN_MS', 120_000, 0, 3_600_000),
    fakeLoadMs: int(env, 'SERVE_FAKE_LOAD_MS', 300, 0, 60_000),
    fakeLoadFail: fakeLoadFail(env.SERVE_FAKE_LOAD_FAIL),
    keepAlive: keepAlive(env.SERVE_KEEP_ALIVE),
    embedModel: 'bge-m3',
    walletFile: env.SERVE_WALLET_FILE || path.join('data', 'showcase', 'wallet.json'),
  };
}
