import { useEffect, useRef, useState } from 'react';
import { useReports } from '../data';
import { Markdown } from '../markdown';

/**
 * Opens on a day with real capital in open positions (owner: not the automatic report written after the close). The
 * liquidity positions ran from 27 Aug to 18 Sep 2026 (golden reference for dated-08).
 */
export const DEFAULT_REPORT = '2026-09-15';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/**
 * English glosses of the report sections, matched on the Polish heading. The source text is not changed; the gloss
 * is shown next to the original heading. "money" sections open by default, the technical ones are folded.
 */
const GLOSSES: { match: RegExp; gloss: string; money: boolean }[] = [
  { match: /^BILANS TRANSZY/i, gloss: 'Tranche balance: deposited, current value, result', money: true },
  { match: /^POZYCJE REALNE/i, gloss: 'Real positions', money: true },
  { match: /^PAPER TRADING/i, gloss: 'Paper trading, virtual $10,000 per pool', money: true },
  { match: /^RANKING WIDE/i, gloss: 'Ranking of pools for wide ranges, top 10', money: false },
  { match: /^propozycje OPEN/i, gloss: 'Open proposals', money: false },
  { match: /^Kandydaci/i, gloss: 'Candidate pools', money: false },
  { match: /^Świeżość danych/i, gloss: 'Data freshness', money: false },
  { match: /^pipeline\.log/i, gloss: 'Last data pipeline run (log)', money: false },
  { match: /^pipeline-task\.log/i, gloss: 'Pipeline task log', money: false },
  { match: /^selektor/i, gloss: 'Pool selector (log lines)', money: false },
  { match: /^selector-state\.json/i, gloss: 'Selector state (data)', money: false },
  { match: /^trend-state\.json/i, gloss: 'Trend state (data)', money: false },
];

function sections(text: string): { heading: string | null; gloss: string; money: boolean; body: string }[] {
  const out: { heading: string | null; gloss: string; money: boolean; body: string }[] = [];
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };
  const flush = () => {
    const body = current.lines.join('\n');
    if (current.heading === null) {
      if (body.replace(/^#\s.*$/m, '').trim()) out.push({ heading: null, gloss: '', money: false, body });
      return;
    }
    const g = GLOSSES.find((x) => x.match.test(current.heading ?? ''));
    out.push({ heading: current.heading, gloss: g?.gloss ?? 'Section', money: g?.money ?? false, body });
  };
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      flush();
      current = { heading: h[1].trim(), lines: [] };
    } else current.lines.push(line);
  }
  flush();
  return out;
}

/** The daily reports, as written (Polish), rendered from Markdown. */
export function Archive() {
  const loaded = useReports();
  const [selected, setSelected] = useState(DEFAULT_REPORT);
  const strip = useRef<HTMLElement | null>(null);
  // On a phone the dates are one scrolling row: keep the open report's date in view.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (strip.current && el)
      strip.current.scrollLeft =
        el.offsetLeft - strip.current.offsetLeft - strip.current.clientWidth / 2 + el.clientWidth / 2;
  }, [selected, loaded.state]);
  if (loaded.state === 'loading') return <p className="state-note">Loading the reports.</p>;
  if (loaded.state === 'error')
    return <p className="state-note error">The reports could not be loaded ({loaded.message}).</p>;
  const reports = loaded.data.reports;
  const current = reports.find((r) => r.date === selected) ?? reports[0];
  return (
    <section className="archive" aria-labelledby="archive-title">
      <h2 id="archive-title" className="section-title">
        Daily reports
      </h2>
      <p className="lede">
        Every morning the system wrote a report on its positions, its profit and loss against simply holding, and the
        freshness of its data. These are the originals, in Polish, from {dayLabel(reports[0].date)} to{' '}
        {dayLabel(reports[reports.length - 1].date)} 2026. Real capital was in liquidity positions from 27 Aug to 18
        Sep. Long logs are folded; private network addresses are hidden.
      </p>
      <nav className="days" aria-label="Report date" ref={strip}>
        {reports.map((r) => (
          <button
            key={r.date}
            type="button"
            className="chip"
            aria-pressed={r.date === current.date}
            onClick={() => setSelected(r.date)}
          >
            {dayLabel(r.date)}
          </button>
        ))}
      </nav>
      <article className="report" data-testid="report">
        <header className="report-head">
          <h3>{longDate(current.date)}</h3>
          <p className="meta">
            Original title, in Polish: <span lang="pl">{current.title}</span>
          </p>
          {current.note && (
            <p className="meta" data-testid="report-note">
              {current.note}
            </p>
          )}
        </header>
        <p className="report-contents">
          What a report holds: the money first (tranche balance, real positions, paper trading), then the machinery
          (data freshness, the last pipeline run, the pool selector and its state). The technical sections are folded;
          open any of them to read it.
        </p>
        {sections(current.text).map((sec, i) =>
          sec.heading === null ? (
            <div key={i} lang="pl">
              <Markdown text={sec.body} skipTitle />
            </div>
          ) : (
            <details
              key={`${current.date}-${i}`}
              className={`report-section ${sec.money ? 'money' : 'machinery'}`}
              open={sec.money}
            >
              <summary>
                <span className="section-gloss">{sec.gloss}</span>{' '}
                <span className="section-original" lang="pl">
                  {sec.heading}
                </span>
              </summary>
              <div lang="pl">
                <Markdown text={sec.body} />
              </div>
            </details>
          ),
        )}
        <p className="path">{current.file}</p>
      </article>
    </section>
  );
}
