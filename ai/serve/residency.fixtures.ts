/** Test helper: the serve configuration with the box URLs filled in, so tests can vary one variable at a time. */
import { loadServeConfig } from './config';

export const loadConfigForTest = (env: Record<string, string>) =>
  loadServeConfig({ INFERENCE_URL: 'http://box.invalid:11434', RERANK_URL: 'http://box.invalid:11435', ...env });
