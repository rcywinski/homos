/**
 * TopRankingPanel.tsx — "Daily ranking" / TOP 10 pools watched for entry
 * (TASKS-UI.md Batch 6, commissioned by Fable 18.08, owner's idea).
 *
 * Data: `bot.ranking` / `bot.rankingStatus` from useBotApi.ts (GET /api/ranking,
 * poller every 30 min — the data changes once a day, after 8:00). Shape:
 *   { day, generatedAt, criteria: {window, persistDays, minTvlUsd, filter},
 *     rows: [{rank, symbol, chain, poolMeta, apy7d, streak, eligible,
 *     tvlUsd, botPoolId, llamaUuid}] }
 *
 * This is EXCLUSIVELY observation (headline APY from the ranking ≠ achievable LP result —
 * pools enter play only after tick-level validation), hence: NO action
 * buttons, disclaimer right under the table. Section COLLAPSED by default in the cockpit
 * (not a daily decision, unlike paper trading).
 *
 * VARIANT 'wide' (TASKS-UI.md Batch 21, owner's decision 02.09 "an exact
 * copy of the ranking under the new guidelines, I want to observe", Fable's spec 02.09):
 * the same component, prop `variant`, data source `bot.wideRanking` /
 * `bot.wideRankingStatus` (GET /api/wide-ranking — EXACTLY the same
 * RankingData shape). In this ranking `apy7d` carries the SCORE %/yr (wide-band
 * fee minus volatility cost), not headline APY — hence
 * separate column labels and disclaimer. `variant` defaults to 'apy' — zero
 * behavior change for existing calls.
 *
 * COLUMNS "365d/720d" + "full run" (TASKS-UI.md Batch 22, owner's idea
 * 02.09, Fable's spec 02.09, AFTER Batch 21): two additional column
 * groups, shared by BOTH variants, after TVL and before status. Two separate
 * sources, both feature-detect (missing file/pair → "—", zero errors):
 *  - `bot.wideDaily` (GET /api/wide-daily) — daily model of the wide
 *    band for all pools of both rankings, columns "365d"/"720d"
 *    (LP/HODL/Δ from `latest` — window ending today) + "flat"
 *    (`flatPct365`, % of days in the year meeting the flat condition).
 *  - `bot.wideBacktests` (GET /api/wide-backtests) — full run of the
 *    engine (walkforward 720d) only for pools the Floor 2 collector
 *    has already fetched — a separate unit (pp/30d window), do NOT mix with the
 *    daily model (% per 365d).
 *
 * HARD SCOPE: bot/** untouched. The old `TopPools.tsx` (DefiLlama
 * client-side, session 2e) — deliberately left alone, merge decision separate.
 */
import React, { FC, useState } from 'react';
import {
  UseBotApi,
  RankingRow,
  CandidateVerdict,
  WideDailyPool,
  WideDailyWindow,
  WideBacktestEntry,
} from '../hooks/useBotApi';

const fmtTvl = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
};

// Extra fields of the WIDE ranking — one place for null/undefined handling.
const fmtPct1 = (v: number | null | undefined): string => (typeof v === 'number' ? `${v.toFixed(1)}%` : '—');
// Daily model/full run (Batch 22): signed numbers, without "%" (the unit is
// appended at the use site — pp/30d for the full run, bare points for LP/HODL/Δ).
const fmtSigned1 = (v: number | null | undefined): string =>
  typeof v === 'number' ? `${v > 0 ? '+' : ''}${v.toFixed(1)}` : '—';
const deltaClass = (v: number | null | undefined): string | undefined =>
  typeof v === 'number' ? (v > 0 ? 'paper-positive' : v < 0 ? 'forecast-negative' : undefined) : undefined;

// "365d"/"720d" — daily model (GET /api/wide-daily, Batch 22). `w` = rolling
// window (`WideDailyWindow`) from the pair `pools[llamaUuid].windows.w365/w720`;
// `error`/`stale` from one level up (`WideDailyPool`) explain a missing number.
const ModelDziennyCell: FC<{ w: WideDailyWindow | null | undefined; error: string | undefined }> = ({ w, error }) => {
  if (!w) {
    return (
      <td className="muted" title={error ?? 'history too short'}>
        —
      </td>
    );
  }
  const { latest, medLpPct, medHodlPct, medDeltaPct, worstDeltaPct, winPct, n } = w;
  const title =
    `median of rolling windows (n=${n}): LP ${fmtSigned1(medLpPct)} / HODL ${fmtSigned1(medHodlPct)} / ` +
    `Δ ${fmtSigned1(medDeltaPct)} · worst Δ ${fmtSigned1(worstDeltaPct)} · wins ${winPct}% · ` +
    `in range ${fmtPct1(latest.inRangePct)} · recenters ${latest.recenters} · fees ${fmtPct1(latest.feesPct)}`;
  return (
    <td title={title}>
      <span className="wideranking-lphodl">
        {fmtSigned1(latest.lpPct)} / {fmtSigned1(latest.hodlPct)} /{' '}
      </span>
      <span className={deltaClass(latest.deltaPct)}>{fmtSigned1(latest.deltaPct)}</span>
    </td>
  );
};

// "flat" — % of days in the last year meeting the flat condition (Batch 22).
const FlatCell: FC<{ pool: WideDailyPool | undefined }> = ({ pool }) => (
  <td
    className="muted"
    title="% of days in the last year on which the pair met our flat condition |gap|<2% — that is where narrowing has a chance to work"
  >
    {fmtPct1(pool?.flatPct365)}
  </td>
);

// "full run" — backtest engine (GET /api/wide-backtests, Batch 22),
// only pools already fetched by the Floor 2 collector. Unit pp/30d window —
// SEPARATE from the daily model (% per 365d), do not mix in one column.
const PelnyPrzebiegCell: FC<{ entry: WideBacktestEntry | undefined }> = ({ entry }) => {
  if (!entry || !entry.passive) {
    return (
      <td className="muted" title="in the collector queue / no transaction history">
        —
      </td>
    );
  }
  const { passive, hybrid } = entry;
  const title =
    `%win ${fmtPct1(passive.winPct)} / worst ${fmtSigned1(passive.worst)} / recent90 ${fmtSigned1(passive.recent90?.mean)}` +
    (hybrid ? ` · hybrid ±5%: %win ${fmtPct1(hybrid.winPct)} / worst ${fmtSigned1(hybrid.worst)}` : '');
  return (
    <td title={title}>
      <span className={deltaClass(passive.mean)}>{fmtSigned1(passive.mean)}</span> pp/30d
      {hybrid && (
        <div className="wideranking-hybrid-line muted">hybrid ±5%: {fmtSigned1(hybrid.mean)} pp/30d</div>
      )}
    </td>
  );
};

// Candidate validation verdicts (TASKS-UI.md Batch 12, owner's request):
// "outside configuration" wrongly suggested rejection. Real status per
// pool, priority top-down (the first matching state wins) — semantics
// described in the batch, do NOT change without asking @Fable.
type CandidateStatus = 'in-bot' | 'fail' | 'queued' | 'unmapped' | 'validated' | 'unresearched';

const verdictTooltip = (v: CandidateVerdict): string => {
  const parts: string[] = [];
  if (typeof v.winPct === 'number') parts.push(`${v.winPct}% win`);
  if (typeof v.worst === 'number') parts.push(`worst ${v.worst > 0 ? '+' : ''}${v.worst}`);
  if (v.testedAt) parts.push(v.testedAt);
  if (v.note) parts.push(v.note);
  return parts.join(' · ');
};

const candidateStatus = (row: RankingRow, verdict: CandidateVerdict | undefined): CandidateStatus => {
  if (row.botPoolId) return 'in-bot';
  if (!verdict) return 'unresearched';
  if (verdict.verdict === 'FAIL') return 'fail';
  if (verdict.verdict === 'QUEUED') return 'queued';
  if (verdict.verdict === 'UNMAPPED') return 'unmapped';
  if (verdict.verdict === 'PASS') return 'validated';
  return 'unresearched';
};

const StatusCell: FC<{ status: CandidateStatus; title: string | undefined }> = ({ status, title }) => (
  <td>
    {status === 'in-bot' && <span className="topranking-status-in">✅ played by the bot</span>}
    {status === 'fail' && (
      <span className="topranking-status-fail" title={title}>
        ⛔ rejected
      </span>
    )}
    {status === 'queued' && (
      <span className="topranking-status-queued" title={title}>
        🔬 in validation queue
      </span>
    )}
    {status === 'unmapped' && (
      <span className="topranking-status-unmapped" title={title}>
        ❔ needs mapping
      </span>
    )}
    {status === 'validated' && (
      <span className="topranking-status-validated" title={title}>
        ✔ validated (not played)
      </span>
    )}
    {status === 'unresearched' && <span className="muted">unresearched</span>}
  </td>
);

const RankingRowView: FC<{
  row: RankingRow;
  verdict: CandidateVerdict | undefined;
  wideDailyPool: WideDailyPool | undefined;
  backtestEntry: WideBacktestEntry | undefined;
}> = ({ row, verdict, wideDailyPool, backtestEntry }) => {
  const status = candidateStatus(row, verdict);
  const title = verdict ? verdictTooltip(verdict) : undefined;
  return (
    <tr className={row.eligible ? 'topranking-eligible' : undefined}>
      <td>{row.rank}</td>
      <td>
        {row.symbol} <span className="muted">{row.poolMeta}</span> · {row.chain}
      </td>
      <td>{row.apy7d.toFixed(1)}%</td>
      <td>{row.streak}d in top</td>
      <td>{fmtTvl(row.tvlUsd)}</td>
      <ModelDziennyCell w={wideDailyPool?.windows.w365} error={wideDailyPool?.error} />
      <ModelDziennyCell w={wideDailyPool?.windows.w720} error={wideDailyPool?.error} />
      <FlatCell pool={wideDailyPool} />
      <PelnyPrzebiegCell entry={backtestEntry} />
      <StatusCell status={status} title={title} />
    </tr>
  );
};

// WIDE row (Batch 21): `apy7d` carries the SCORE %/yr (not 7d APY), color
// >0 green / ≤0 muted (spec). `sigmaAnnPct` with a "⚠ drift" suffix +
// tooltip when `driftFlag` — peg drift > half the band width.
const WideRankingRowView: FC<{
  row: RankingRow;
  verdict: CandidateVerdict | undefined;
  wideDailyPool: WideDailyPool | undefined;
  backtestEntry: WideBacktestEntry | undefined;
}> = ({ row, verdict, wideDailyPool, backtestEntry }) => {
  const status = candidateStatus(row, verdict);
  const title = verdict ? verdictTooltip(verdict) : undefined;
  const scoreClass = row.apy7d > 0 ? 'wideranking-score-pos' : 'wideranking-score-neg';
  return (
    <tr className={row.eligible ? 'topranking-eligible' : undefined}>
      <td>{row.rank}</td>
      <td>
        {row.symbol} <span className="muted">{row.poolMeta}</span> · {row.chain}
      </td>
      <td className="muted">{row.cls ?? '—'}</td>
      <td className={scoreClass}>{row.apy7d.toFixed(1)}%</td>
      <td>{fmtPct1(row.feeAprWide)}</td>
      <td>{fmtPct1(row.dragPct)}</td>
      <td>
        {fmtPct1(row.sigmaAnnPct)}
        {row.driftFlag && (
          <span className="wideranking-drift-flag" title="peg drift >½ of the width — a drift-unaware band may fall out">
            {' '}
            ⚠ drift
          </span>
        )}
      </td>
      <td>{row.streak}d in top</td>
      <td>{fmtTvl(row.tvlUsd)}</td>
      <ModelDziennyCell w={wideDailyPool?.windows.w365} error={wideDailyPool?.error} />
      <ModelDziennyCell w={wideDailyPool?.windows.w720} error={wideDailyPool?.error} />
      <FlatCell pool={wideDailyPool} />
      <PelnyPrzebiegCell entry={backtestEntry} />
      <StatusCell status={status} title={title} />
    </tr>
  );
};

interface Props {
  bot: UseBotApi;
  variant?: 'apy' | 'wide';
}

/**
 * UNIFICATION 21.08 (owner's remark): the section had its own "bar" — it was
 * wrapped in `ExpandableSection` in MorningCockpit, which gave it a card frame
 * and a blue title, unlike its neighbors (Bot telemetry, Profit
 * forecast, Observation analysis). Now the component keeps its own collapse state
 * and uses EXACTLY the same skeleton as they do:
 * `telemetry-section` > `telemetry-header` (title + arrow) > `telemetry-body`.
 * Trophy 🏆 removed — the neighbors have no icons.
 * HOOKS NOTE: `useState` MUST stay before all early
 * returns (lesson from the "Rendered more hooks…" crash 20.08 and 21.08) —
 * that is why error/loading states now render INSIDE the section body,
 * and the header is always visible, as in Bot telemetry.
 */
const TopRankingPanel: FC<Props> = ({ bot, variant = 'apy' }) => {
  const [expanded, setExpanded] = useState(false);
  const isWide = variant === 'wide';
  const { ranking, rankingStatus, wideRanking, wideRankingStatus, candidates, wideDaily, wideBacktests } = bot;
  const data = isWide ? wideRanking : ranking;
  const status = isWide ? wideRankingStatus : rankingStatus;

  const today = new Date().toISOString().slice(0, 10);
  const isStale = !!data?.day && data.day < today;

  // Match verdicts to rows by llamaPool (uuid). candidates===null
  // (error/offline) → empty map, every row falls to 'in-bot'/'unresearched'
  // — graceful degradation, no red error (verdicts are an enrichment).
  const verdictByPool = new Map<string, CandidateVerdict>();
  for (const v of candidates ?? []) verdictByPool.set(v.llamaPool, v);

  return (
    <div className="telemetry-section">
      <div className="telemetry-header" onClick={() => setExpanded((e) => !e)}>
        <span className="morning-section-title telemetry-title">
          {isWide ? 'WIDE ranking (for the product, TOP 10)' : 'Daily ranking (TOP 10)'}
        </span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {status === 'not-started' ? (
            <div className="morning-note">
              {isWide
                ? 'The WIDE ranking will appear after the first nightly pipeline run (wide-score step).'
                : 'The ranking will appear after the first selector run (daily after 8:00).'}
            </div>
          ) : status === 'error' ? (
            <div className="morning-note muted">Ranking unavailable (network or server error).</div>
          ) : status === 'loading' || !data ? (
            <div className="morning-note muted">loading ranking…</div>
          ) : (
            <>
              <div className="muted topranking-criteria-line">
                {data.day}
                {data.criteria && (
                  <>
                    {' · '}
                    {data.criteria.window ?? ''}
                    {typeof data.criteria.persistDays === 'number' && <>, persistence ≥{data.criteria.persistDays}d</>}
                    {typeof data.criteria.minTvlUsd === 'number' && <>, TVL≥{fmtTvl(data.criteria.minTvlUsd)}</>}
                    {isWide && data.criteria.filter && <>, {String(data.criteria.filter)}</>}
                  </>
                )}
              </div>

              {isStale && (
                <div className="morning-note morning-note-warn">
                  ranking from {data.day} — today's run not generated yet.
                </div>
              )}

              {data.rows.length === 0 ? (
                <div className="morning-note muted">ranking empty.</div>
              ) : (
                <>
                  <div className="muted status-legend">
                    ✅ played by the bot · ⛔ rejected · 🔬 in validation queue · ✔ validated (not played) · unresearched
                  </div>
                  <div className="telemetry-table-wrap">
                    <table className="telemetry-table topranking-table">
                      <thead>
                        {isWide ? (
                          <tr>
                            <th>#</th>
                            <th>pair</th>
                            <th>class</th>
                            <th>score %/yr</th>
                            <th>fee wide</th>
                            <th>drag</th>
                            <th>σ/yr</th>
                            <th>streak</th>
                            <th>TVL</th>
                            <th title="daily model of the wide band (±50% ETH/stable, ±40% crypto/crypto, tight for pegged pairs) vs HODL 50/50 — window ending today">
                              365d
                            </th>
                            <th title="daily model of the wide band vs HODL 50/50 — window ending today">720d</th>
                            <th>flat</th>
                            <th title="full run = backtest engine on transaction history (the judge), pp/30d window">
                              full run
                            </th>
                            <th>status</th>
                          </tr>
                        ) : (
                          <tr>
                            <th>#</th>
                            <th>pair</th>
                            <th>APY 7d</th>
                            <th>streak</th>
                            <th>TVL</th>
                            <th title="daily model of the wide band (±50% ETH/stable, ±40% crypto/crypto, tight for pegged pairs) vs HODL 50/50 — window ending today">
                              365d
                            </th>
                            <th title="daily model of the wide band vs HODL 50/50 — window ending today">720d</th>
                            <th>flat</th>
                            <th title="full run = backtest engine on transaction history (the judge), pp/30d window">
                              full run
                            </th>
                            <th>status</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {data.rows.map((row) => {
                          const wideDailyPool = row.llamaUuid ? wideDaily?.pools[row.llamaUuid] : undefined;
                          const backtestEntry = row.llamaUuid ? wideBacktests?.[row.llamaUuid] : undefined;
                          return isWide ? (
                            <WideRankingRowView
                              key={`${row.rank}-${row.symbol}`}
                              row={row}
                              verdict={row.llamaUuid ? verdictByPool.get(row.llamaUuid) : undefined}
                              wideDailyPool={wideDailyPool}
                              backtestEntry={backtestEntry}
                            />
                          ) : (
                            <RankingRowView
                              key={`${row.rank}-${row.symbol}`}
                              row={row}
                              verdict={row.llamaUuid ? verdictByPool.get(row.llamaUuid) : undefined}
                              wideDailyPool={wideDailyPool}
                              backtestEntry={backtestEntry}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="muted topranking-disclaimer">
                {isWide
                  ? 'score = wide-band fee − volatility cost, wide-score model v1 (calibrated on live positions 01.09); OBSERVATIONAL ranking — the entry decision is manual, after the walkforward gate. The APY and WIDE rankings measure different things: the same pool may rank high in one and low in the other — that is the point.'
                  : 'Headline APY from the ranking ≠ achievable LP result; pools enter play only after tick-level validation (see WETH-USDT 0.01%: 11% in the ranking, rejected by validation).'}
              </div>
              <div className="muted topranking-disclaimer">
                365d/720d: daily model of the wide band (±50% ETH/stable, ±40% crypto/crypto, tight for pegged
                pairs) vs HODL 50/50, ±a few pp — for comparisons between pools; "full run" = backtest engine on
                transaction history (the judge).
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TopRankingPanel;
