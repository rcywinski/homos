/**
 * cycleLine.tsx — linia CYKLU produktu FlatWide (postura SZEROKI ±N% (idle) /
 * WĄSKI k×σ (flat) + stan flatu: poza progiem / zegar od HH:MM / FLAT ✅).
 *
 * Wyekstrahowane z MorningCockpit.tsx (Partia 17) do wspólnego pliku w
 * PARTII 20 pkt 2 — BotTelemetry.tsx potrzebuje TEJ SAMEJ logiki jednostek
 * flatParams dla kolumny "Doradca" pul produktowych (żeby nie duplikować
 * konwersji ułamek→procent ani interpretacji flatSince/flatConfirmed w
 * dwóch miejscach, które mogłyby się rozjechać). MorningCockpit.tsx dalej
 * jest jedynym miejscem, które NAPĘDZA odświeżanie odliczania (nowTick, co
 * 60s) — BotTelemetry przekazuje Date.now() liczone przy renderze (sekcja
 * jest zwijana domyślnie i tak odświeża się z każdym pollem stanu bota).
 */
import React from 'react';
import { BotPoolLive } from '../hooks/useBotApi';
import { formatDuration } from '../utils/formatters';

// Fallback gdy state bota nie ma jeszcze `flatParams` (stary bot sprzed
// paczki bot-side "cykl w state", 28.08 wieczór) — te same wartości co
// bot/config.ts FLAT na dziś. Feature-detect: użyte TYLKO gdy pole całkiem
// nieobecne, nigdy nie nadpisuje żywych danych z /api/state.
// UWAGA jednostki: enterGap/exitGap to UŁAMKI (0.02 = 2%), tak jak surowe
// bot/config.ts FLAT — zweryfikowane wprost w bot/observer.ts (saveState:
// `flatParams: FLAT`, bez przeliczenia). confirmH w godzinach.
export const DEFAULT_FLAT_PARAMS = { enterGap: 0.02, exitGap: 0.05, confirmH: 12 };

/**
 * Linia CYKLU (Partia 17, TASKS-UI.md) na karcie pozycji produktowej —
 * `posture` przychodzi z bot.state.positions[].posture (feature-detect:
 * `null`/nieobecne = pula nie-produktowa, funkcja wtedy nic nie renderuje).
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
        Cykl: WĄSKI k×σ (flat) · powrót do szerokiego przy |gap|&gt;{exitPct.toFixed(0)}% (teraz {gapLabel}%)
      </div>
    );
  }

  // posture === 'wide'
  const widthLabel = typeof widthPct === 'number' ? `±${widthPct}%` : '';
  let statusNode: React.ReactNode;
  if (poolLive?.flatConfirmed) {
    statusNode = <span className="cockpit-cycle-confirmed">✅ flat potwierdzony — propozycja zwężenia w kokpicie</span>;
  } else if (poolLive?.flatSince) {
    const flatSinceMs = Date.parse(poolLive.flatSince);
    const remainingMs = flatParams.confirmH * 3600e3 - (now - flatSinceMs);
    const sinceLabel = isFinite(flatSinceMs) ? new Date(flatSinceMs).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—';
    statusNode = (
      <span>
        stabilizacja od {sinceLabel} — do propozycji zwężenia ~{remainingMs > 0 ? formatDuration(remainingMs) : 'lada moment'} (przy utrzymaniu |gap|&lt;{enterPct.toFixed(0)}%)
      </span>
    );
  } else {
    statusNode = (
      <span>
        czekam na stabilizację: |gap| {gapLabel}% (próg {enterPct.toFixed(0)}%)
      </span>
    );
  }
  return (
    <div className="cockpit-cycle-line muted">
      Cykl: SZEROKI {widthLabel} (idle) · {statusNode}
    </div>
  );
}
