/**
 * Offline token estimate for chunk sizing.
 *
 * The embedding server cuts every input at 2048 tokens (silently, unless the client sends
 * `truncate: false`, see inference/README.md), so no chunk may exceed 2048 real bge-m3 tokens.
 *
 * Calibrated on 9 Nov 2026 against the real tokenizer (prompt_eval_count returned by Ollama),
 * over every chunk of this corpus longer than 300 characters, in characters per real token:
 *   report-section   min 1.74, median 2.15   (tables of numbers and pool names)
 *   doc-section      min 2.17, median 3.48
 *   queue-section    min 2.19, median 2.89
 *   note-section     min 2.20, median 3.03
 *   journal-entry    min 2.34, median 2.84
 *   decision         min 2.67, median 3.11
 *
 * With 2.3 chars/token the cap below is 3450 characters. The densest text measured (1.74) would make
 * that 1983 real tokens, still under 2048; typical journal prose is about 1200 real tokens.
 * A single ratio keeps the rule simple; the cost is that prose chunks use about 60% of the window.
 */

export const CHARS_PER_TOKEN = 2.3;
export const MAX_CHUNK_TOKENS = 1500;
export const MAX_CHUNK_CHARS = Math.floor(MAX_CHUNK_TOKENS * CHARS_PER_TOKEN);

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
