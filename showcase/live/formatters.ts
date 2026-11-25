/**
 * The one helper the paper panel takes from src/utils/formatters.ts, without that file's viem import (the Live bundle
 * holds no wallet or chain library; showcase/guard.js enforces it). The Live webpack build swaps src/utils/formatters
 * for this file; showcase/live/live.test.ts checks that the two give the same output.
 */
export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
