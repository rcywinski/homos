/**
 * CycleLine.tsx — CYCLE line of the FlatWide product (posture WIDE ±N% (idle) /
 * NARROW k×σ (flat) + flat state: above threshold / clock since HH:MM / FLAT ✅).
 *
 * Shared by MorningCockpit.tsx and BotTelemetry.tsx (position cards and the
 * "Advisor" column of product pools) — so as not to duplicate the
 * fraction→percent conversion or the flatSince/flatConfirmed interpretation
 * in two places that could drift apart. MorningCockpit.tsx remains the only
 * place that DRIVES the countdown refresh (nowTick, every 60s) — BotTelemetry
 * passes Date.now() computed at render (the section is collapsed by default
 * and refreshes with every bot state poll anyway).
 */
import React from 'react';
import { BotPoolLive } from '../hooks/useBotApi';
import { formatDuration } from '../utils/formatters';

// Fallback when the bot state does not carry `flatParams` (older bot builds) —
// mirrors bot/config.ts FLAT. Feature-detect: used ONLY when the
// field is entirely absent, never overrides live data from /api/state.
// Units: enterGap/exitGap are fractions (0.02 = 2%), just like the raw
// bot/config.ts FLAT — verified directly in bot/observer.ts (saveState:
// `flatParams: FLAT`, no conversion). confirmH in hours.
export const DEFAULT_FLAT_PARAMS = { enterGap: 0.02, exitGap: 0.05, confirmH: 12 };

/**
 * CYCLE line on a product position card —
 * `posture` comes from bot.state.positions[].posture (feature-detect:
 * `null`/absent = non-product pool, the function then renders nothing).
 */
export function renderCycleLine(
  posture: 'wide' | 'narrow' | null | undefined,
  poolLive: BotPoolLive | undefined,
  widthPct: number | undefined,
  flatParams: { enterGap: number; exitGap: number; confirmH: number },
  now: number
): React.ReactNode {
  if (posture !== 'wide' && posture !== 'narrow') return null;
  const enterPct = flatParams.enterGap * 100;
  const exitPct = flatParams.exitGap * 100;
  const gapAbs = typeof poolLive?.trendGapPct === 'number' ? Math.abs(poolLive.trendGapPct) : null;
  const gapLabel = gapAbs !== null ? gapAbs.toFixed(1) : '—';

  if (posture === 'narrow') {
    return (
      <div className="cockpit-cycle-line muted">
        Cycle: NARROW k×σ (flat) · back to wide at |gap|&gt;{exitPct.toFixed(0)}% (now {gapLabel}%)
      </div>
    );
  }

  // posture === 'wide'
  const widthLabel = typeof widthPct === 'number' ? `±${widthPct}%` : '';
  let statusNode: React.ReactNode;
  if (poolLive?.flatConfirmed) {
    statusNode = <span className="cockpit-cycle-confirmed">✅ flat confirmed — narrowing proposal in the cockpit</span>;
  } else if (poolLive?.flatSince) {
    const flatSinceMs = Date.parse(poolLive.flatSince);
    const remainingMs = flatParams.confirmH * 3600e3 - (now - flatSinceMs);
    const sinceLabel = isFinite(flatSinceMs) ? new Date(flatSinceMs).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—';
    statusNode = (
      <span>
        stabilizing since {sinceLabel} — narrowing proposal in ~{remainingMs > 0 ? formatDuration(remainingMs) : 'any moment'} (if |gap|&lt;{enterPct.toFixed(0)}% holds)
      </span>
    );
  } else {
    statusNode = (
      <span>
        waiting for stabilization: |gap| {gapLabel}% (threshold {enterPct.toFixed(0)}%)
      </span>
    );
  }
  return (
    <div className="cockpit-cycle-line muted">
      Cycle: WIDE {widthLabel} (idle) · {statusNode}
    </div>
  );
}
