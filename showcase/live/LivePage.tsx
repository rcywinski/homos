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
import TopRankingPanel from '../../src/components/TopRankingPanel';
import type { BotStateShape, PaperData, UseBotApi } from '../../src/hooks/useBotApi';
import { feeYieldExample, statsAgeCell, statsNote, strategyLabel } from './labels';
import { CrossLink, SiteHeader } from '../site-header';
import { SectionBoundary } from './SectionBoundary';
import { useLiveBot, useLiveRankings } from './useLiveBot';

/** The network of a paper pool, from its id (mainnet-, base-, arbitrum-). */
export const networkOf = (poolId: string): string =>
  poolId.startsWith('mainnet-')
    ? 'Ethereum'
    : poolId.startsWith('base-')
      ? 'Base'
      : poolId.startsWith('arbitrum-')
        ? 'Arbitrum'
        : '';
const withNetwork = (poolId: string, label: string) => (networkOf(poolId) ? `${label} · ${networkOf(poolId)}` : label);

/** The page uses the panel's formats: dates pl-PL, dollar amounts en-US. */
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
      <strong>Demonstration.</strong> A simulated portfolio of $10,000 per pool, run by the project's ALGORITHM v1.2 on
      live market data. No wallet is connected and no transaction is ever sent: every position, fee and cost on this
      page is computed, not real.{startedAt ? ` Simulation started ${fmtDateTime(startedAt)}.` : ''} The real-capital
      history of the project is in the research archive.
    </div>
    {__LIVE_PREVIEW__ && (
      <div className="live-notice live-preview" role="note">
        <strong>Local preview.</strong> These positions come from a short test run on a development machine and will be
        thrown away; the demonstration starts fresh when it goes live.
      </div>
    )}
  </>
);

/** Inside both ranking sections, under their own footnotes. */
const RankingNote: FC = () => (
  <div className="live-section-note live-ranking-note">
    365d and 720d: three numbers, in percent of the starting capital over the window ending today: the wide band as an
    LP position / holding the two tokens 50/50 / the difference between the two. The daily ranking is recomputed every
    morning from DefiLlama data, the WIDE ranking and these columns every night. The candidate verdicts (status column)
    are fixed results of the research period, dated 17.08.2026 and 19.08.2026; the full-run results of the period are
    not part of this copy, so that column is left out. &quot;Played by the bot&quot; marks the six pools of the
    simulation above.
  </div>
);

/** Under the telemetry table: which rule its suggestion shows, and the fee-yield rule worked out on one row. */
const TelemetryNotes: FC<{ pools: NonNullable<BotStateShape['pools']> }> = ({ pools }) => {
  const row = pools.map((p) => ({ p, ex: feeYieldExample(p) })).find((x) => x.ex);
  return (
    <div className="live-section-note live-telemetry-note">
      The suggested range for the two product pools (WETH/USDC 0.30% and WETH/cbBTC 0.05%, both on Base) and the
      walk-forward tables below show the FlatWide hybrid, the project's later strategy; the simulation above does not
      play it. Fee yield of the active tick: fees per day earned by liquidity sitting exactly at the current price, one
      tick spacing wide; a position W ticks wide earns about that × 2 × spacing / W. &quot;Data age&quot; is the age of
      the price (read every minute); &quot;Statistics age&quot; is the age of the last 24 h swap read behind the
      volatility, the fee yield and the suggested range (every 15 minutes).
      {row?.ex && (
        <>
          {' '}
          Example, {withNetwork(row.p.id, row.p.id)}: {row.ex.tickPct.toFixed(3)}%/day × 2 × {row.ex.spacing} /{' '}
          {row.ex.width.toLocaleString('en-US')} ticks = {row.ex.rangePct.toFixed(3)}%/day for the suggested range.
        </>
      )}
    </div>
  );
};

export const LivePage: FC = () => {
  const live = useLiveBot();
  const rankings = useLiveRankings();
  const summary = live.paper ? paperSummary(live.paper) : null;
  // The panel reads only `paper` and `paperStatus`; the rest of the cockpit hook (token, address, actions) has no
  // counterpart here on purpose.
  // Telemetry and observation analysis read `state`, `apiBase` and `apiToken`: the base is this page's forward and the
  // token is empty (the forward needs none), so they fetch /live/api/history and /live/api/results only.
  const bot = {
    paper: live.paper,
    paperStatus: live.paperStatus,
    state: live.state,
    apiBase: '/live',
    apiToken: '',
    ...rankings,
  } as Pick<UseBotApi, 'paper' | 'paperStatus' | 'state' | 'apiBase' | 'apiToken' | keyof typeof rankings> as UseBotApi;
  return (
    <>
      <SiteHeader current="live" liveOn />
      <div className="app live-app">
        <h1 className="live-title">Live: paper trading on current market data</h1>
        <Notice startedAt={live.paper?.state.startedAt ?? null} />
        <CrossLink
          href="/"
          testId="crosslink-archive"
          title="What came of it"
          text="The real-capital results and the conclusion of the research are in the research archive."
        />
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
            <div className="live-section-note live-rule-note">
              How the simulation decides: paper trading plays ALGORITHM v1.2 on all six pools, with k×σ ranges from the
              advisor, a rebalance after 24 h out of range when the cost pays back from fees within 7 days, and an exit
              to cash on the trend signal. The research run of August and September 2026 played the same rule.
            </div>
            <ExpandableSection title="📊 Paper trading" defaultExpanded={true}>
              <SectionBoundary name="Paper trading">
                <PaperTradingPanel
                  bot={bot}
                  poolLabel={withNetwork}
                  showStartDate
                  showValueRange
                  poolNote={(id) =>
                    statsNote(
                      live.state?.pools?.find((p) => p.id === id),
                      live.paper?.state.positions[id]?.status ?? 'pending',
                    )
                  }
                />
              </SectionBoundary>
              <div className="live-section-note live-fee-note">
                The simulated fees are an upper estimate: the fee model scales its measured yield to a position width in a
                way that gives about twice what the measurement itself implies. The archive&apos;s backtests and real-capital
                figures do not depend on it.
              </div>
            </ExpandableSection>
            <SectionBoundary name="Bot telemetry">
              <BotTelemetry
                bot={bot}
                hideRawState
                hideWatchedPositions
                feeYieldLabel="Fee yield of the active tick, %/day"
                extraColumn={{ header: 'Statistics age', cell: (p) => statsAgeCell(p) }}
                footer={<TelemetryNotes pools={live.state?.pools ?? []} />}
              />
            </SectionBoundary>
            <SectionBoundary name="Observation analysis">
              <ObservationAnalysis
                bot={bot}
                poolLabel={withNetwork}
                strategyLabel={strategyLabel}
                showScale
                footer={
                  <div className="live-section-note live-walkforward-note">
                    These walk-forward tables are research-period results (720 days of history, 30-day steps), computed
                    on 22.09.2026 and fixed; they are not recomputed on live data. WETH/cbBTC 0.30% · Base has no table:
                    it was computed only as a candidate run, under another file name.
                  </div>
                }
              />
            </SectionBoundary>
            <SectionBoundary name="Daily ranking">
              <TopRankingPanel bot={bot} hideFullRun footer={<RankingNote />} />
            </SectionBoundary>
            <SectionBoundary name="WIDE ranking">
              <TopRankingPanel bot={bot} variant="wide" hideFullRun footer={<RankingNote />} />
            </SectionBoundary>
            {live.updatedAt && (
              <div className="live-stat-note">
                Data read {new Date(live.updatedAt).toLocaleTimeString('pl-PL')}, refreshed every minute.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
