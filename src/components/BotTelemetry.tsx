/**
 * BotTelemetry.tsx — "Telemetria bota" (TASKS-UI.md Partia 3, UX-COCKPIT.md §1.A.4).
 * Zwijana sekcja w kokpicie, domyślnie zwinięta. Pokazuje state.pools /
 * state.positions z bot/observer.ts — dane już przychodzą przez useBotApi
 * (60s polling w App.tsx), nic nowego nie jest tu fetchowane.
 *
 * Poprawka z 401 (TASKS-UI.md): zamiast linku "surowy JSON" (bezpośredni link
 * nie może nieść nagłówka Authorization, więc dla chronionego API kończyłby
 * się błędem 401) — przycisk otwierający modal z już posiadanym `bot.state`,
 * sformatowanym jako JSON. Zero dodatkowych zapytań.
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
  if (mins < 1) return 'przed chwilą';
  if (mins < 60) return `${mins} min temu`;
  return `${Math.round(mins / 60)} h temu`;
};

const ADVICE_ICON: Record<string, string> = {
  IN_RANGE_HOLD: '✅',
  REBALANCE: '🔄',
  WAIT_NOT_PROFITABLE: '⏳',
};

/**
 * suggestion.priceLower/priceUpper są w orientacji "token1 za token0" (surowej,
 * bez wiedzy który token to stable/ETH — ta metadana nie jest zapisywana w
 * state.pools). Ale wiemy `ethUsd` (już poprawnie zorientowane przez bota) —
 * i wiemy, że cena bieżąca leży między priceLower a priceUpper (sugestia
 * zawsze obejmuje aktualny tick). Więc: sprawdzamy, czy ethUsd leży bliżej
 * (w skali logarytmicznej — ceny WETH/USDC różnią się rzędami wielkości od
 * ich odwrotności) przedziału [priceLower,priceUpper] czy jego odwrotności
 * [1/priceUpper,1/priceLower], i na tej podstawie wybieramy właściwą orientację.
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
        <span className="morning-section-title telemetry-title">Telemetria bota</span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {pools.length === 0 ? (
            <div className="morning-note">Brak danych z bota (offline albo jeszcze nie zebrał pierwszej próbki).</div>
          ) : (
            <div className="telemetry-table-wrap">
              <table className="telemetry-table">
                <thead>
                  <tr>
                    <th>Pula</th>
                    <th>cena USD</th>
                    <th>Tick</th>
                    <th>Zmienność %/d</th>
                    <th>Fee-yield %/d</th>
                    <th>Sugerowany zakres $</th>
                    <th>Wiek danych</th>
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
              <div className="morning-section-title">Pozycje obserwowane przez bota</div>
              <div className="morning-advice-list">
                {positions.map((p) => {
                  // PARTIA 20 pkt 2: kolumna "Doradca" mówiła językiem v1.2
                  // (IN_RANGE_HOLD/REBALANCE) nawet dla pul PRODUKTOWYCH, gdzie
                  // bot od Partii 17 gra zupełnie inny cykl (postura SZEROKI/
                  // WĄSKI + detektor flatu) — dla nich zastąpione linią CYKLU
                  // (te same źródła i jednostki co karty pozycji w
                  // MorningCockpit.tsx, wspólny helper w cycleLine.tsx, żeby
                  // liczby się nie rozjechały). Pule nie-produktowe (posture
                  // null/nieobecne) zostają po staremu — ikona doradcy v1.2.
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
            <span className="telemetry-observe-badge">👁 OBSERWUJ — bot niczego nie wykonuje</span>
            <button className="action-button" onClick={() => setShowJson(true)} disabled={!bot.state}>
              Surowy JSON
            </button>
          </div>
        </div>
      )}

      {showJson && (
        <div className="modal-overlay" onClick={() => setShowJson(false)}>
          <div className="modal-content telemetry-json-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>state.json (surowe)</h3>
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
