/**
 * BotTelemetry.tsx — "Bot telemetry" (TASKS-UI.md Batch 3, UX-COCKPIT.md §1.A.4).
 * Collapsible section in the cockpit, collapsed by default. Shows state.pools /
 * state.positions from bot/observer.ts — the data already arrives via useBotApi
 * (60s polling in App.tsx), nothing new is fetched here.
 *
 * Fix for 401 (TASKS-UI.md): instead of a "raw JSON" link (a direct link cannot
 * carry the Authorization header, so for a protected API it would end in a 401)
 * — a button opening a modal with the already-held `bot.state`, formatted as
 * JSON. Zero additional requests.
 */
import React, { FC, useState } from 'react';
import { UseBotApi, BotPoolLive } from '../hooks/useBotApi';
import { findBotPoolById } from '../config/botPools';
import { renderCycleLine, DEFAULT_FLAT_PARAMS } from './cycleLine';

interface Props {
  bot: UseBotApi;
}

const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });

const ageLabel = (updatedAt: string): string => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(updatedAt).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
};

const ADVICE_ICON: Record<string, string> = {
  IN_RANGE_HOLD: '✅',
  REBALANCE: '🔄',
  WAIT_NOT_PROFITABLE: '⏳',
};

/**
 * suggestion.priceLower/priceUpper are in the raw "token1 per token0" orientation
 * (without knowing which token is the stable/ETH — that metadata is not stored in
 * state.pools). But we know `ethUsd` (already correctly oriented by the bot) —
 * and we know the current price lies between priceLower and priceUpper (the
 * suggestion always covers the current tick). So: we check whether ethUsd lies
 * closer (on a log scale — WETH/USDC prices differ by orders of magnitude from
 * their inverse) to the interval [priceLower,priceUpper] or to its inverse
 * [1/priceUpper,1/priceLower], and pick the right orientation on that basis.
 */
const suggestedUsdRange = (pool: BotPoolLive): { lo: number; hi: number } | null => {
  const s = pool.suggestion;
  if (!s || !(s.priceLower > 0) || !(s.priceUpper > 0) || !(pool.ethUsd > 0)) return null;
  const mid = (s.priceLower + s.priceUpper) / 2;
  const directDist = Math.abs(Math.log(pool.ethUsd) - Math.log(mid));
  const invertedDist = Math.abs(Math.log(pool.ethUsd) - Math.log(1 / mid));
  if (directDist <= invertedDist) return { lo: s.priceLower, hi: s.priceUpper };
  return { lo: 1 / s.priceUpper, hi: 1 / s.priceLower };
};

const BotTelemetry: FC<Props> = ({ bot }) => {
  const [expanded, setExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const pools = bot.state?.pools ?? [];
  const positions = bot.state?.positions ?? [];

  return (
    <div className="telemetry-section">
      <div className="telemetry-header" onClick={() => setExpanded((e) => !e)}>
        <span className="morning-section-title telemetry-title">Bot telemetry</span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {pools.length === 0 ? (
            <div className="morning-note">No data from the bot (offline or first sample not collected yet).</div>
          ) : (
            <div className="telemetry-table-wrap">
              <table className="telemetry-table">
                <thead>
                  <tr>
                    <th>Pool</th>
                    <th>USD price</th>
                    <th>Tick</th>
                    <th>Volatility %/d</th>
                    <th>Fee-yield %/d</th>
                    <th>Suggested range $</th>
                    <th>Data age</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((p) => {
                    const range = suggestedUsdRange(p);
                    return (
                      <tr key={p.id}>
                        <td className="telemetry-pool-id">{p.id}</td>
                        <td>{fmtUsd(p.ethUsd)}</td>
                        <td>{p.tick}</td>
                        <td>{p.stats ? (p.stats.volDaily * 100).toFixed(2) : '—'}</td>
                        <td>{p.stats ? (p.stats.feeYieldDaily * 100).toFixed(3) : '—'}</td>
                        <td>{range ? `${fmtUsd(range.lo)} – ${fmtUsd(range.hi)}` : '—'}</td>
                        <td className="muted">{ageLabel(p.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {positions.length > 0 && (
            <>
              <div className="morning-section-title">Positions watched by the bot</div>
              <div className="morning-advice-list">
                {positions.map((p) => {
                  // BATCH 20 item 2: the "Advisor" column spoke the v1.2 language
                  // (IN_RANGE_HOLD/REBALANCE) even for PRODUCT pools, where the
                  // bot since Batch 17 plays a completely different cycle (posture
                  // WIDE/NARROW + flat detector) — for those it is replaced by the
                  // CYCLE line (same sources and units as the position cards in
                  // MorningCockpit.tsx, shared helper in cycleLine.tsx, so the
                  // numbers never drift apart). Non-product pools (posture
                  // null/absent) stay as before — v1.2 advisor icon.
                  const isProduct = p.posture === 'wide' || p.posture === 'narrow';
                  const botMeta = findBotPoolById(p.poolId);
                  const poolLive = pools.find((pl) => pl.id === p.poolId);
                  const flatParams = bot.state?.flatParams ?? DEFAULT_FLAT_PARAMS;
                  return (
                    <div key={`${p.poolId}-${p.tokenId}`} className="morning-advice-row-wrap">
                      <div className="morning-advice-row">
                        <span>
                          {isProduct ? '🔁' : ADVICE_ICON[p.advice] ?? '·'} #{p.tokenId} {p.poolId}
                        </span>
                        <span className="muted">
                          {fmtUsd(p.valueUsd)}
                          {!isProduct && p.paybackDays !== null && isFinite(p.paybackDays) ? ` · payback ~${p.paybackDays.toFixed(1)}d` : ''}
                        </span>
                      </div>
                      {isProduct && renderCycleLine(p.posture, poolLive, botMeta?.productIdleWidthPct, flatParams, Date.now())}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="telemetry-footer">
            <span className="telemetry-observe-badge">👁 OBSERVE — the bot executes nothing</span>
            <button className="action-button" onClick={() => setShowJson(true)} disabled={!bot.state}>
              Raw JSON
            </button>
          </div>
        </div>
      )}

      {showJson && (
        <div className="modal-overlay" onClick={() => setShowJson(false)}>
          <div className="modal-content telemetry-json-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>state.json (raw)</h3>
              <button className="close-button" onClick={() => setShowJson(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <pre className="telemetry-json-pre">{JSON.stringify(bot.state, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotTelemetry;
