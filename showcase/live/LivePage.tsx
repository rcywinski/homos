/**
 * The "Live" page (phase 5, step 5.3, first cut): the original cockpit shell, its financial summary turned to the
 * virtual portfolio (verdict B in ai/APP-PLAN.md section 12.1), the original paper-trading panel unchanged, and the
 * demonstration notice. Telemetry, observation analysis and the rankings come in 5.4 and 5.5.
 * Nothing here can act: no wallet, no settings, no buttons that send anything.
 */
import type { FC } from 'react';
import ExpandableSection from '../../src/components/ExpandableSection';
import PaperTradingPanel from '../../src/components/PaperTradingPanel';
import type { PaperData, UseBotApi } from '../../src/hooks/useBotApi';
import { useLiveBot } from './useLiveBot';

const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface PaperSummary {
  totalUsd: number;
  startUsd: number;
  inRange: number;
  pools: number;
  feesUsd: number;
}

/** The three summary stats from the paper data: latest equity per pool, pools in range now, fees accrued. */
export function paperSummary(paper: PaperData): PaperSummary {
  const ids = Object.keys(paper.state.positions ?? {});
  let totalUsd = 0;
  let inRange = 0;
  let feesUsd = 0;
  for (const id of ids) {
    const p = paper.state.positions[id];
    let last: PaperData['history'][number] | undefined;
    for (const h of paper.history) if (h.poolId === id && (!last || h.ts > last.ts)) last = h;
    totalUsd += last?.equityUsd ?? p.capitalUsd ?? paper.state.capitalPerPoolUsd;
    // Same rule as the panel's status icon: an open position counts as in range unless its latest sample says out.
    if (p.status === 'open' && last?.inRange !== false) inRange++;
    feesUsd += p.feesUsd ?? 0;
  }
  return { totalUsd, startUsd: ids.length * paper.state.capitalPerPoolUsd, inRange, pools: ids.length, feesUsd };
}

const Notice: FC<{ startedAt: string | null }> = ({ startedAt }) => (
  <>
    <div className="live-notice" role="note">
      <strong>Demonstration.</strong> A simulated portfolio of $10,000 per pool, run by the same algorithm on live market
      data. No wallet is connected and no transaction is ever sent: every position, fee and cost on this page is computed,
      not real.{startedAt ? ` Simulation started ${new Date(startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.` : ''}{' '}
      The real-capital history of the project is on the Archive page.
    </div>
    {__LIVE_PREVIEW__ && (
      <div className="live-notice live-preview" role="note">
        <strong>Local preview.</strong> These positions come from a short test run on a development machine and will be
        thrown away; the demonstration starts fresh when it goes live.
      </div>
    )}
  </>
);

export const LivePage: FC = () => {
  const live = useLiveBot();
  const summary = live.paper ? paperSummary(live.paper) : null;
  // The panel reads only `paper` and `paperStatus`; the rest of the cockpit hook (token, address, actions) has no
  // counterpart here on purpose.
  const bot = { paper: live.paper, paperStatus: live.paperStatus } as Pick<UseBotApi, 'paper' | 'paperStatus'> as UseBotApi;
  return (
    <div className="app live-app">
      <nav className="live-switch" aria-label="Pages">
        <a href="/">Archive</a>
        <span aria-current="page">Live</span>
      </nav>
      <h1 className="live-title">Live: paper trading on current market data</h1>
      <Notice startedAt={live.paper?.state.startedAt ?? null} />
      <div className="morning-cockpit">
        <div className="morning-body">
          <div className="morning-summary">
            <div className="morning-stat">
              <span className="morning-stat-value">{summary ? fmtUsd(summary.totalUsd) : '…'}</span>
              <span className="morning-stat-label">
                Total value of the virtual portfolio{summary ? ` (start ${fmtUsd(summary.startUsd)})` : ''}
              </span>
            </div>
            <div className="morning-stat">
              <span className="morning-stat-value">{summary ? `${summary.inRange}/${summary.pools}` : '…'}</span>
              <span className="morning-stat-label">Paper positions in range</span>
            </div>
            <div className="morning-stat">
              <span className="morning-stat-value">{summary ? fmtUsd(summary.feesUsd) : '…'}</span>
              <span className="morning-stat-label">Fees accrued (estimate from the fee model)</span>
            </div>
          </div>
          <ExpandableSection title="📊 Paper trading" defaultExpanded={true}>
            <PaperTradingPanel bot={bot} />
          </ExpandableSection>
          {live.updatedAt && <div className="live-stat-note">Data read {new Date(live.updatedAt).toLocaleTimeString('en-GB')}, refreshed every minute.</div>}
        </div>
      </div>
    </div>
  );
};
