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
import React, { FC, useState } from 'react';
import { UseBotApi, RankingRow, CandidateVerdict } from '../hooks/useBotApi';

const fmtTvl = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
};

// Werdykty walidacji kandydatów (TASKS-UI.md Partia 12, prośba Rafała):
// „poza konfiguracją" mylnie sugerowało odrzucenie. Prawdziwy status per
// pula, priorytet z góry (pierwszy dopasowany stan wygrywa) — semantyka
// opisana w partii, NIE zmieniać bez pytania w @Fable.
type CandidateStatus = 'in-bot' | 'fail' | 'queued' | 'unmapped' | 'validated' | 'unresearched';

const verdictTooltip = (v: CandidateVerdict): string => {
  const parts: string[] = [];
  if (typeof v.winPct === 'number') parts.push(`${v.winPct}% wygr.`);
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

const RankingRowView: FC<{ row: RankingRow; verdict: CandidateVerdict | undefined }> = ({ row, verdict }) => {
  const status = candidateStatus(row, verdict);
  const title = verdict ? verdictTooltip(verdict) : undefined;
  return (
    <tr className={row.eligible ? 'topranking-eligible' : undefined}>
      <td>{row.rank}</td>
      <td>
        {row.symbol} <span className="muted">{row.poolMeta}</span> · {row.chain}
      </td>
      <td>{row.apy7d.toFixed(1)}%</td>
      <td>{row.streak}d w topie</td>
      <td>{fmtTvl(row.tvlUsd)}</td>
      <td>
        {status === 'in-bot' && <span className="topranking-status-in">✅ gra w bocie</span>}
        {status === 'fail' && (
          <span className="topranking-status-fail" title={title}>
            ⛔ odrzucona
          </span>
        )}
        {status === 'queued' && (
          <span className="topranking-status-queued" title={title}>
            🔬 w kolejce walidacji
          </span>
        )}
        {status === 'unmapped' && (
          <span className="topranking-status-unmapped" title={title}>
            ❔ wymaga mapowania
          </span>
        )}
        {status === 'validated' && (
          <span className="topranking-status-validated" title={title}>
            ✔ zwalidowana (nie gra)
          </span>
        )}
        {status === 'unresearched' && <span className="muted">niebadana</span>}
      </td>
    </tr>
  );
};

interface Props {
  bot: UseBotApi;
}

/**
 * UJEDNOLICENIE 21.08 (uwaga Rafała): sekcja miała własną „belkę" — była
 * opakowana w `ExpandableSection` w MorningCockpit, przez co dostawała ramkę
 * karty i niebieski tytuł, inaczej niż sąsiadki (Telemetria bota, Prognoza
 * zysku, Analiza obserwacji). Teraz komponent sam trzyma swój stan zwinięcia
 * i używa DOKŁADNIE tego samego szkieletu co one:
 * `telemetry-section` > `telemetry-header` (tytuł + strzałka) > `telemetry-body`.
 * Puchar 🏆 usunięty — sąsiadki nie mają ikon.
 * UWAGA na hooki: `useState` MUSI zostać przed wszystkimi wczesnymi
 * returnami (lekcja z crasha „Rendered more hooks…" 20.08 i 21.08) —
 * dlatego stany błędu/ładowania renderują się teraz WEWNĄTRZ ciała sekcji,
 * a nagłówek jest widoczny zawsze, tak jak w Telemetrii bota.
 */
const TopRankingPanel: FC<Props> = ({ bot }) => {
  const [expanded, setExpanded] = useState(false);
  const { ranking, rankingStatus, candidates } = bot;

  const today = new Date().toISOString().slice(0, 10);
  const isStale = !!ranking?.day && ranking.day < today;

  // Dopasowanie werdyktów do wierszy po llamaPool (uuid). candidates===null
  // (błąd/offline) → mapa pusta, każdy wiersz spada do 'in-bot'/'unresearched'
  // — degradacja łagodna, bez czerwonego błędu (werdykty to wzbogacenie).
  const verdictByPool = new Map<string, CandidateVerdict>();
  for (const v of candidates ?? []) verdictByPool.set(v.llamaPool, v);

  return (
    <div className="telemetry-section">
      <div className="telemetry-header" onClick={() => setExpanded((e) => !e)}>
        <span className="morning-section-title telemetry-title">Ranking dnia (TOP 10)</span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {rankingStatus === 'not-started' ? (
            <div className="morning-note">Ranking pojawi się po pierwszym przebiegu selektora (codziennie po 8:00).</div>
          ) : rankingStatus === 'error' ? (
            <div className="morning-note muted">Ranking niedostępny (błąd sieci lub serwera).</div>
          ) : rankingStatus === 'loading' || !ranking ? (
            <div className="morning-note muted">wczytywanie rankingu…</div>
          ) : (
            <>
              <div className="muted topranking-criteria-line">
                {ranking.day}
                {ranking.criteria && (
                  <>
                    {' · '}
                    {ranking.criteria.window ?? ''}
                    {typeof ranking.criteria.persistDays === 'number' && <>, persystencja ≥{ranking.criteria.persistDays}d</>}
                    {typeof ranking.criteria.minTvlUsd === 'number' && <>, TVL≥{fmtTvl(ranking.criteria.minTvlUsd)}</>}
                  </>
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
                <>
                  <div className="muted status-legend">
                    ✅ gra w bocie · ⛔ odrzucona · 🔬 w kolejce walidacji · ✔ zwalidowana (nie gra) · niebadana
                  </div>
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
                          <RankingRowView
                            key={`${row.rank}-${row.symbol}`}
                            row={row}
                            verdict={row.llamaUuid ? verdictByPool.get(row.llamaUuid) : undefined}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="muted topranking-disclaimer">
                Headline APY z rankingu ≠ osiągalny wynik LP; pule wchodzą do gry dopiero po walidacji tick-level (patrz
                WETH-USDT 0.01%: 11% w rankingu, odrzucona walidacją).
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TopRankingPanel;
