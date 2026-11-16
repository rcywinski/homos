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
  },
};

export const DEFAULT_PRESET = 'qwen-p-local';

export interface ServeConfig {
  preset: ServedPreset;
  inferenceUrl: string;
  rerankUrl: string;
  host: string;
  port: number;
  /** Question length limit in characters, after trimming. */
  maxQuestionChars: number;
  /** Generator timeout per question; the queue in step 4.4 adds its own deadline. */
  generateTimeoutMs: number;
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

export function loadServeConfig(env: Env = process.env): ServeConfig {
  if (env.ANTHROPIC_API_KEY) {
    throw new ConfigError('ANTHROPIC_API_KEY is set: the public chat must never run with the owner key in its environment. Start it with an environment that has no key.');
  }
  const presetId = env.SERVE_PRESET || DEFAULT_PRESET;
  const preset = PRESETS[presetId];
  if (!preset) throw new ConfigError(`SERVE_PRESET "${presetId}" is not one of: ${Object.keys(PRESETS).join(', ')}`);
  const inferenceUrl = env.INFERENCE_URL ?? '';
  const rerankUrl = env.RERANK_URL ?? '';
  if (!inferenceUrl || !rerankUrl) throw new ConfigError('INFERENCE_URL and RERANK_URL must be set (see .env.example)');
  const host = env.SERVE_HOST || '127.0.0.1';
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new ConfigError('SERVE_HOST must be a loopback address: the chat is reached only through the tunnel (step 4.9)');
  }
  return {
    preset,
    inferenceUrl,
    rerankUrl,
    host,
    port: int(env, 'SERVE_PORT', 8790, 1024, 65535),
    maxQuestionChars: int(env, 'SERVE_MAX_QUESTION_CHARS', 500, 20, 2000),
    generateTimeoutMs: int(env, 'SERVE_GENERATE_TIMEOUT_MS', 180_000, 10_000, 600_000),
  };
}
