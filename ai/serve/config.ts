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
  /** 'cloudflare' only when the tunnel is in front (step 4.9): then CF-Connecting-IP is the client address. */
  trustProxy: 'none' | 'cloudflare';
  /** Request log directory (gitignored). */
  logDir: string;
  /** While this file exists the chat is paused (CC-Win creates it before using the GPU for other work). */
  pauseFile: string;
  /** Dry run only: delay of each fake answer, to show the queue in the browser suite. */
  fakeDelayMs: number;
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
  const v = raw || '24h';
  if (!/^(-1|\d+(s|m|h))$/.test(v)) throw new ConfigError('SERVE_KEEP_ALIVE must look like 24h, 90m, 3600s or -1');
  return v;
}

function trustProxy(raw: string | undefined): 'none' | 'cloudflare' {
  if (!raw || raw === 'none') return 'none';
  if (raw === 'cloudflare') return 'cloudflare';
  throw new ConfigError('SERVE_TRUST_PROXY must be none or cloudflare');
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
    trustProxy: trustProxy(env.SERVE_TRUST_PROXY),
    logDir: env.SERVE_LOG_DIR || path.join('ai', 'serve', 'logs'),
    pauseFile: env.SERVE_PAUSE_FILE || path.join('ai', 'serve', 'PAUSED'),
    fakeDelayMs: int(env, 'SERVE_FAKE_DELAY_MS', 0, 0, 60_000),
    keepAlive: keepAlive(env.SERVE_KEEP_ALIVE),
    embedModel: 'bge-m3',
    walletFile: env.SERVE_WALLET_FILE || path.join('data', 'showcase', 'wallet.json'),
  };
}
