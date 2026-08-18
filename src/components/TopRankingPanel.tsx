/**
 * TopRankingPanel.tsx — "Ranking dnia" / TOP 10 pul obserwowanych do wejścia
 * (TASKS-UI.md Partia 6, zlecone przez Fable 18.08, pomysł Rafała).
 *
 * Dane: `bot.ranking` / `bot.rankingStatus` z useBotApi.ts (GET /api/ranking,
 * poller co 30 min — dane zmieniają się raz dziennie, po 8:00). Kształt:
 *   { day, generatedAt, criteria: {window, persistDays, minTvlUsd, filter},
 *     rows: [{rank, symbol, chain, poolMeta, apy7d, streak, eligible,
 *     tvlUsd, botPoolId, llamaUuid}] }
 *
 * To WYŁĄCZNIE obserwacja (headline APY z rankingu ≠ osiągalny wynik LP —
 * pule wchodzą do gry dopiero po walidacji tick-level), więc: BEZ przycisków
 * akcji, disclaimer wprost pod tabelą. Sekcja domyślnie ZWINIĘTA w kokpicie
 * (nie codzienna decyzja, jak paper trading).
 *
 * ZAKRES TWARDY: bot/** nietknięty. Stary `TopPools.tsx` (DefiLlama
 * client-side, sesja 2e) — celowo nieruszany, decyzja o scaleniu osobno.
 */
import React, { FC } from 'react';
import { UseBotApi, RankingRow } from '../hooks/useBotApi';

const fmtTvl = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
};

const RankingRowView: FC<{ row: RankingRow }> = ({ row }) => (
  <tr className={row.eligible ? 'topranking-eligible' : undefined}>
    <td>{row.rank}</td>
    <td>
      {row.symbol} <span className="muted">{row.poolMeta}</span> · {row.chain}
    </td>
    <td>{row.apy7d.toFixed(1)}%</td>
    <td>{row.streak}d w topie</td>
    <td>{fmtTvl(row.tvlUsd)}</td>
    <td>
      {row.botPoolId ? (
        <span className="topranking-status-in">✅ w konfiguracji bota</span>
      ) : (
        <span className="muted">poza konfiguracją</span>
      )}
    </td>
  </tr>
);

interface Props {
  bot: UseBotApi;
}

const TopRankingPanel: FC<Props> = ({ bot }) => {
  const { ranking, rankingStatus } = bot;

  if (rankingStatus === 'not-started') {
    return <div className="morning-note">Ranking pojawi się po pierwszym przebiegu selektora (codziennie po 8:00).</div>;
  }
  if (rankingStatus === 'error') {
    return <div className="morning-note muted">Ranking niedostępny (błąd sieci lub serwera).</div>;
  }
  if (rankingStatus === 'loading' || !ranking) {
    return <div className="morning-note muted">wczytywanie rankingu…</div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const isStale = ranking.day && ranking.day < today;

  return (
    <div className="topranking-panel">
      <div className="morning-section-title">
        Ranking dnia {ranking.day}
        {ranking.criteria && (
          <span className="muted topranking-criteria">
            {' '}
            · {ranking.criteria.window ?? ''}
            {typeof ranking.criteria.persistDays === 'number' && <>, persystencja ≥{ranking.criteria.persistDays}d</>}
            {typeof ranking.criteria.minTvlUsd === 'number' && <>, TVL≥{fmtTvl(ranking.criteria.minTvlUsd)}</>}
          </span>
        )}
      </div>

      {isStale && (
        <div className="morning-note morning-note-warn">
          ranking z {ranking.day} — dzisiejszy przebieg jeszcze nie wygenerowany.
        </div>
      )}

      {ranking.rows.length === 0 ? (
        <div className="morning-note muted">ranking pusty.</div>
      ) : (
        <div className="telemetry-table-wrap">
          <table className="telemetry-table topranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th>para</th>
                <th>APY 7d</th>
                <th>streak</th>
                <th>TVL</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {ranking.rows.map((row) => (
                <RankingRowView key={`${row.rank}-${row.symbol}`} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="muted topranking-disclaimer">
        Headline APY z rankingu ≠ osiągalny wynik LP; pule wchodzą do gry dopiero po walidacji tick-level (patrz WETH-USDT
        0.01%: 11% w rankingu, odrzucona walidacją).
      </div>
    </div>
  );
};

export default TopRankingPanel;
