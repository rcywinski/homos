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
 * WARIANT 'wide' (TASKS-UI.md Partia 21, decyzja Rafała 02.09 „dokładna
 * kopia rankingu pod nowe wytyczne, chcę obserwować", spec Fable 02.09):
 * ten sam komponent, prop `variant`, źródło danych `bot.wideRanking` /
 * `bot.wideRankingStatus` (GET /api/wide-ranking — DOKŁADNIE ten sam
 * kształt RankingData). W tym rankingu `apy7d` niesie SCORE %/r (fee
 * szerokiego pasma minus koszt zmienności), nie headline APY — stąd
 * osobne etykiety kolumn i disclaimer. `variant` domyślnie 'apy' — zero
 * zmiany zachowania dla dotychczasowych wywołań.
 *
 * KOLUMNY „365d/720d" + „pełny przebieg" (TASKS-UI.md Partia 22, pomysł
 * Rafała 02.09, spec Fable 02.09, PO Partii 21): dwie dodatkowe grupy
 * kolumn, wspólne dla OBU wariantów, po TVL a przed status. Dwa osobne
 * źródła, oba feature-detect (brak pliku/pary → „—", zero błędu):
 *  - `bot.wideDaily` (GET /api/wide-daily) — model dzienny szerokiego
 *    pasma dla wszystkich pul obu rankingów, kolumny „365d"/„720d"
 *    (LP/HODL/Δ z `latest` — okno kończące się dziś) + „flat"
 *    (`flatPct365`, % dni roku spełniających warunek flatu).
 *  - `bot.wideBacktests` (GET /api/wide-backtests) — pełny przebieg
 *    silnika (walkforward 720d) tylko dla pul, które kolekcjoner Piętra 2
 *    już pobrał — osobna jednostka (pp/okno 30d), NIE mieszać z modelem
 *    dziennym (% za 365d).
 *
 * ZAKRES TWARDY: bot/** nietknięty. Stary `TopPools.tsx` (DefiLlama
 * client-side, sesja 2e) — celowo nieruszany, decyzja o scaleniu osobno.
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

// Pola dodatkowe rankingu WIDE — jedno miejsce po null/undefined.
const fmtPct1 = (v: number | null | undefined): string => (typeof v === 'number' ? `${v.toFixed(1)}%` : '—');
// Model dzienny/pełny przebieg (Partia 22): liczby ze znakiem, bez „%" (jednostka
// dopisywana przy użyciu — pp/30d dla pełnego przebiegu, gołe punkty dla LP/HODL/Δ).
const fmtSigned1 = (v: number | null | undefined): string =>
  typeof v === 'number' ? `${v > 0 ? '+' : ''}${v.toFixed(1)}` : '—';
const deltaClass = (v: number | null | undefined): string | undefined =>
  typeof v === 'number' ? (v > 0 ? 'paper-positive' : v < 0 ? 'forecast-negative' : undefined) : undefined;

// „365d"/„720d" — model dzienny (GET /api/wide-daily, Partia 22). `w` = okno
// kroczące (`WideDailyWindow`) z pary `pools[llamaUuid].windows.w365/w720`;
// `error`/`stale` z poziomu wyżej (`WideDailyPool`) tłumaczą brak liczby.
const ModelDziennyCell: FC<{ w: WideDailyWindow | null | undefined; error: string | undefined }> = ({ w, error }) => {
  if (!w) {
    return (
      <td className="muted" title={error ?? 'za krótka historia'}>
        —
      </td>
    );
  }
  const { latest, medLpPct, medHodlPct, medDeltaPct, worstDeltaPct, winPct, n } = w;
  const title =
    `mediana okien kroczących (n=${n}): LP ${fmtSigned1(medLpPct)} / HODL ${fmtSigned1(medHodlPct)} / ` +
    `Δ ${fmtSigned1(medDeltaPct)} · najgorsze Δ ${fmtSigned1(worstDeltaPct)} · wygrane ${winPct}% · ` +
    `w zakresie ${fmtPct1(latest.inRangePct)} · recentrowań ${latest.recenters} · fee ${fmtPct1(latest.feesPct)}`;
  return (
    <td title={title}>
      <span className="wideranking-lphodl">
        {fmtSigned1(latest.lpPct)} / {fmtSigned1(latest.hodlPct)} /{' '}
      </span>
      <span className={deltaClass(latest.deltaPct)}>{fmtSigned1(latest.deltaPct)}</span>
    </td>
  );
};

// „flat" — % dni ostatniego roku spełniających warunek flatu (Partia 22).
const FlatCell: FC<{ pool: WideDailyPool | undefined }> = ({ pool }) => (
  <td
    className="muted"
    title="% dni ostatniego roku, w których para spełniała nasz warunek flatu |gap|<2% — tam zwężanie ma szansę pracować"
  >
    {fmtPct1(pool?.flatPct365)}
  </td>
);

// „pełny przebieg" — silnik backtestu (GET /api/wide-backtests, Partia 22),
// tylko pule już pobrane przez kolekcjoner Piętra 2. Jednostka pp/okno 30d —
// OSOBNA od modelu dziennego (% za 365d), nie mieszać w jednej kolumnie.
const PelnyPrzebiegCell: FC<{ entry: WideBacktestEntry | undefined }> = ({ entry }) => {
  if (!entry || !entry.passive) {
    return (
      <td className="muted" title="w kolejce kolekcjonera / brak historii transakcji">
        —
      </td>
    );
  }
  const { passive, hybrid } = entry;
  const title =
    `%wygr ${fmtPct1(passive.winPct)} / worst ${fmtSigned1(passive.worst)} / recent90 ${fmtSigned1(passive.recent90?.mean)}` +
    (hybrid ? ` · hybryda ±5%: %wygr ${fmtPct1(hybrid.winPct)} / worst ${fmtSigned1(hybrid.worst)}` : '');
  return (
    <td title={title}>
      <span className={deltaClass(passive.mean)}>{fmtSigned1(passive.mean)}</span> pp/30d
      {hybrid && (
        <div className="wideranking-hybrid-line muted">hybryda ±5%: {fmtSigned1(hybrid.mean)} pp/30d</div>
      )}
    </td>
  );
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

const StatusCell: FC<{ status: CandidateStatus; title: string | undefined }> = ({ status, title }) => (
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
      <td>{row.streak}d w topie</td>
      <td>{fmtTvl(row.tvlUsd)}</td>
      <ModelDziennyCell w={wideDailyPool?.windows.w365} error={wideDailyPool?.error} />
      <ModelDziennyCell w={wideDailyPool?.windows.w720} error={wideDailyPool?.error} />
      <FlatCell pool={wideDailyPool} />
      <PelnyPrzebiegCell entry={backtestEntry} />
      <StatusCell status={status} title={title} />
    </tr>
  );
};

// Wiersz WIDE (Partia 21): `apy7d` niesie SCORE %/r (nie APY 7d), kolor
// >0 zielony / ≤0 muted (spec). `sigmaAnnPct` z dopiskiem „⚠ dryf" +
// tooltip gdy `driftFlag` — dryf pega > pół szerokości pasma.
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
          <span className="wideranking-drift-flag" title="dryf pega >½ szerokości — pasmo nieświadome dryfu może wypaść">
            {' '}
            ⚠ dryf
          </span>
        )}
      </td>
      <td>{row.streak}d w topie</td>
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
const TopRankingPanel: FC<Props> = ({ bot, variant = 'apy' }) => {
  const [expanded, setExpanded] = useState(false);
  const isWide = variant === 'wide';
  const { ranking, rankingStatus, wideRanking, wideRankingStatus, candidates, wideDaily, wideBacktests } = bot;
  const data = isWide ? wideRanking : ranking;
  const status = isWide ? wideRankingStatus : rankingStatus;

  const today = new Date().toISOString().slice(0, 10);
  const isStale = !!data?.day && data.day < today;

  // Dopasowanie werdyktów do wierszy po llamaPool (uuid). candidates===null
  // (błąd/offline) → mapa pusta, każdy wiersz spada do 'in-bot'/'unresearched'
  // — degradacja łagodna, bez czerwonego błędu (werdykty to wzbogacenie).
  const verdictByPool = new Map<string, CandidateVerdict>();
  for (const v of candidates ?? []) verdictByPool.set(v.llamaPool, v);

  return (
    <div className="telemetry-section">
      <div className="telemetry-header" onClick={() => setExpanded((e) => !e)}>
        <span className="morning-section-title telemetry-title">
          {isWide ? 'Ranking WIDE (pod produkt, TOP 10)' : 'Ranking dnia (TOP 10)'}
        </span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {status === 'not-started' ? (
            <div className="morning-note">
              {isWide
                ? "Ranking WIDE pojawi się po pierwszym nocnym przebiegu pipeline'u (krok wide-score)."
                : 'Ranking pojawi się po pierwszym przebiegu selektora (codziennie po 8:00).'}
            </div>
          ) : status === 'error' ? (
            <div className="morning-note muted">Ranking niedostępny (błąd sieci lub serwera).</div>
          ) : status === 'loading' || !data ? (
            <div className="morning-note muted">wczytywanie rankingu…</div>
          ) : (
            <>
              <div className="muted topranking-criteria-line">
                {data.day}
                {data.criteria && (
                  <>
                    {' · '}
                    {data.criteria.window ?? ''}
                    {typeof data.criteria.persistDays === 'number' && <>, persystencja ≥{data.criteria.persistDays}d</>}
                    {typeof data.criteria.minTvlUsd === 'number' && <>, TVL≥{fmtTvl(data.criteria.minTvlUsd)}</>}
                    {isWide && data.criteria.filter && <>, {String(data.criteria.filter)}</>}
                  </>
                )}
              </div>

              {isStale && (
                <div className="morning-note morning-note-warn">
                  ranking z {data.day} — dzisiejszy przebieg jeszcze nie wygenerowany.
                </div>
              )}

              {data.rows.length === 0 ? (
                <div className="morning-note muted">ranking pusty.</div>
              ) : (
                <>
                  <div className="muted status-legend">
                    ✅ gra w bocie · ⛔ odrzucona · 🔬 w kolejce walidacji · ✔ zwalidowana (nie gra) · niebadana
                  </div>
                  <div className="telemetry-table-wrap">
                    <table className="telemetry-table topranking-table">
                      <thead>
                        {isWide ? (
                          <tr>
                            <th>#</th>
                            <th>para</th>
                            <th>klasa</th>
                            <th>score %/r</th>
                            <th>fee wide</th>
                            <th>drag</th>
                            <th>σ/r</th>
                            <th>streak</th>
                            <th>TVL</th>
                            <th title="model dzienny szerokiego pasma (±50% ETH/stable, ±40% krypto/krypto, ciasne dla par spiętych) vs HODL 50/50 — okno kończące się dziś">
                              365d
                            </th>
                            <th title="model dzienny szerokiego pasma vs HODL 50/50 — okno kończące się dziś">720d</th>
                            <th>flat</th>
                            <th title="pełny przebieg = silnik backtestu na historii transakcji (sędzia), pp/okno 30d">
                              pełny przebieg
                            </th>
                            <th>status</th>
                          </tr>
                        ) : (
                          <tr>
                            <th>#</th>
                            <th>para</th>
                            <th>APY 7d</th>
                            <th>streak</th>
                            <th>TVL</th>
                            <th title="model dzienny szerokiego pasma (±50% ETH/stable, ±40% krypto/krypto, ciasne dla par spiętych) vs HODL 50/50 — okno kończące się dziś">
                              365d
                            </th>
                            <th title="model dzienny szerokiego pasma vs HODL 50/50 — okno kończące się dziś">720d</th>
                            <th>flat</th>
                            <th title="pełny przebieg = silnik backtestu na historii transakcji (sędzia), pp/okno 30d">
                              pełny przebieg
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
                  ? "score = fee szerokiego pasma − koszt zmienności, model wide-score v1 (kalibracja na żywych pozycjach 01.09); ranking OBSERWACYJNY — decyzja o wejściu ręczna, po bramce walkforward. Rankingi APY i WIDE liczą różne rzeczy: ta sama pula może być wysoko w jednym i nisko w drugim — o to chodzi."
                  : 'Headline APY z rankingu ≠ osiągalny wynik LP; pule wchodzą do gry dopiero po walidacji tick-level (patrz WETH-USDT 0.01%: 11% w rankingu, odrzucona walidacją).'}
              </div>
              <div className="muted topranking-disclaimer">
                365d/720d: model dzienny szerokiego pasma (±50% ETH/stable, ±40% krypto/krypto, ciasne dla par
                spiętych) vs HODL 50/50, ±kilka pp — do porównań między pulami; „pełny przebieg" = silnik backtestu na
                historii transakcji (sędzia).
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TopRankingPanel;
