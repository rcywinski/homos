/**
 * The "Live" page (phase 5, step 5.3, first cut): the original cockpit shell, its financial summary turned to the
 * virtual portfolio (verdict B in ai/APP-PLAN.md section 12.1), the original paper-trading panel unchanged, and the
 * demonstration notice; since 5.4 the original telemetry and observation analysis (read only), the network on every
 * pool label, the start date per card, the value range under each equity chart, and the walk-forward caption.
 * The rankings come in 5.5.
 * Nothing here can act: no wallet, no settings, no buttons that send anything.
 */
import type { FC } from 'react';
import BotTelemetry from '../../src/components/BotTelemetry';
import ExpandableSection from '../../src/components/ExpandableSection';
import ObservationAnalysis from '../../src/components/ObservationAnalysis';
import PaperTradingPanel from '../../src/components/PaperTradingPanel';
import type { PaperData, UseBotApi } from '../../src/hooks/useBotApi';
import { useLiveBot } from './useLiveBot';

/** The network of a paper pool, from its id (mainnet-, base-, arbitrum-). */
export const networkOf = (poolId: string): string =>
  poolId.startsWith('mainnet-') ? 'Ethereum' : poolId.startsWith('base-') ? 'Base' : poolId.startsWith('arbitrum-') ? 'Arbitrum' : '';
const withNetwork = (poolId: string, label: string) => (networkOf(poolId) ? `${label} · ${networkOf(poolId)}` : label);

/** The page uses the panel's formats: dates pl-PL, dollar amounts en-US. */
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
      not real.{startedAt ? ` Simulation started ${fmtDateTime(startedAt)}.` : ''}{' '}
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
  // Telemetry and observation analysis read `state`, `apiBase` and `apiToken`: the base is this page's forward and the
  // token is empty (the forward needs none), so they fetch /live/api/history and /live/api/results only.
  const bot = { paper: live.paper, paperStatus: live.paperStatus, state: live.state, apiBase: '/live', apiToken: '' } as Pick<
    UseBotApi,
    'paper' | 'paperStatus' | 'state' | 'apiBase' | 'apiToken'
  > as UseBotApi;
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
            <PaperTradingPanel bot={bot} poolLabel={withNetwork} showStartDate showValueRange />
          </ExpandableSection>
          <BotTelemetry bot={bot} />
          <ObservationAnalysis bot={bot} />
          <div className="live-stat-note live-walkforward-note">
            Walk-forward tables in the observation analysis are research-period results (720 days of history, 30-day
            steps), computed on 22.09.2026 and fixed; they are not recomputed on live data. WETH/cbBTC 0.30% · Base has
            no table: it was computed only as a candidate run, under another file name.
          </div>
          {live.updatedAt && <div className="live-stat-note">Data read {new Date(live.updatedAt).toLocaleTimeString('pl-PL')}, refreshed every minute.</div>}
        </div>
      </div>
    </div>
  );
};
