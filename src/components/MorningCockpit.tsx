/**
 * MorningCockpit.tsx — poranny kokpit (UI-VISION.md §3.1, TASKS-UI.md Partia 2 #0/#1).
 * First thing visible above "Uniswap V3 Pools": financial header (usePortfolio),
 * bot proposals (useBotApi), and a per-position advisor summary. Collapsible,
 * compact, plain CSS (see styles.css, "UI session" section, morning-* classes).
 */
import React, { FC, useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { UseBotApi } from '../hooks/useBotApi';
import BotStatusDot from './BotStatusDot';

const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ADVICE_ICON: Record<string, string> = {
  IN_RANGE_HOLD: '✅',
  REBALANCE: '🔄',
  WAIT_NOT_PROFITABLE: '⏳',
};

interface Props {
  bot: UseBotApi;
}

const MorningCockpit: FC<Props> = ({ bot }) => {
  const portfolio = usePortfolio();
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [baseInput, setBaseInput] = useState(bot.apiBase);
  const [tokenInput, setTokenInput] = useState(bot.apiToken);

  if (!portfolio.connected) return null;

  const saveSettings = () => {
    bot.setApiBase(baseInput.trim() || 'http://localhost:8787');
    bot.setApiToken(tokenInput.trim());
    bot.refresh();
    setShowSettings(false);
  };

  // state.json already only carries 'open' proposals (bot/observer.ts filters
  // on save) — filter defensively anyway in case that ever changes.
  const pendingProposals = (bot.state?.proposals ?? []).filter((p) => p.status === 'open');

  return (
    <div className="morning-cockpit">
      <div className="morning-header" onClick={() => setCollapsed((c) => !c)}>
        <h2>☀️ Poranny kokpit</h2>
        <div className="morning-header-actions">
          <BotStatusDot status={bot.status} />
          <button
            className="morning-settings-btn"
            title="Ustawienia połączenia z botem"
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings((s) => !s);
            }}
          >
            ⚙
          </button>
          <span className="morning-toggle">{collapsed ? '▶' : '▼'}</span>
        </div>
      </div>

      {showSettings && (
        <div className="morning-settings" onClick={(e) => e.stopPropagation()}>
          <label>
            Adres API bota
            <input value={baseInput} onChange={(e) => setBaseInput(e.target.value)} placeholder="http://192.168.1.8:8787" />
          </label>
          <label>
            Token dostępu
            <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="BOT_API_TOKEN" type="password" />
          </label>
          <button className="action-button primary" onClick={saveSettings}>
            Zapisz
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="morning-body">
          <div className="morning-summary">
            <div className="morning-stat">
              <span className="morning-stat-value">{portfolio.loading ? '…' : fmtUsd(portfolio.totalUsd)}</span>
              <span className="morning-stat-label">Wartość łączna{portfolio.hasUnknownValue ? '*' : ''}</span>
            </div>
            <div className="morning-stat">
              <span className="morning-stat-value">
                {portfolio.positionsInRange}/{portfolio.positionsInRange + portfolio.positionsOutOfRange}
              </span>
              <span className="morning-stat-label">Pozycje in-range</span>
            </div>
            <div className="morning-stat">
              <span className="morning-stat-value">{portfolio.loading ? '…' : fmtUsd(portfolio.feesUsd)}</span>
              <span className="morning-stat-label">Fee do zebrania</span>
            </div>
          </div>

          {portfolio.hasUnknownValue && (
            <div className="morning-note">
              * pomija pozycje bez stabilnej/ETH nogi (np. cbBTC/WETH) — brak wiarygodnej wyceny USD bez dodatkowego feeda
            </div>
          )}
          {portfolio.error && <div className="morning-note morning-error">Błąd portfela: {portfolio.error}</div>}

          <div className="morning-section-title">Propozycje bota</div>
          {bot.status === 'offline' ? (
            <div className="morning-bot-offline">
              Bot offline — uruchom usługę homos-bot na serwerze (⚙ żeby ustawić adres/token).
            </div>
          ) : pendingProposals.length > 0 ? (
            <div className="morning-proposals">
              {pendingProposals.map((p) => (
                <div key={p.id} className="morning-proposal-card">
                  <div>
                    🔄 REBALANS #{p.tokenId}
                    {p.suggestedRange && (
                      <>
                        {' '}
                        → ${p.suggestedRange.usdLo.toLocaleString()}–${p.suggestedRange.usdHi.toLocaleString()}
                      </>
                    )}
                    {typeof p.costUsd === 'number' && <> · koszt ${p.costUsd.toFixed(2)}</>}
                    {typeof p.paybackDays === 'number' && <> · payback ~{p.paybackDays.toFixed(1)} dni</>}
                  </div>
                  <button className="action-button" onClick={() => bot.dismissProposal(p.id)}>
                    Odrzuć
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="morning-note">Brak aktywnych propozycji.</div>
          )}
          {bot.status === 'stale' && <div className="morning-note">⚠ dane bota nieaktualne (starsze niż 5 min)</div>}

          <div className="morning-section-title">Skrót doradcy</div>
          <div className="morning-advice-list">
            {portfolio.loading ? (
              <div className="morning-note">Ładowanie pozycji…</div>
            ) : portfolio.positions.length === 0 ? (
              <div className="morning-note">Brak otwartych pozycji.</div>
            ) : (
              portfolio.positions.map((p) => (
                <div key={`${p.chainId}-${p.tokenId}`} className="morning-advice-row">
                  <span>
                    {ADVICE_ICON[p.advice ?? ''] ?? '·'} #{p.tokenId} {p.poolLabel}
                  </span>
                  <span className="muted">{p.valueUsd !== null ? fmtUsd(p.valueUsd) : '—'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MorningCockpit;
