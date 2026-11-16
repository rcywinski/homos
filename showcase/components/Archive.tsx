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
const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The daily reports, as written (Polish), rendered from Markdown. */
export function Archive() {
  const loaded = useReports();
  const [selected, setSelected] = useState(DEFAULT_REPORT);
  const strip = useRef<HTMLElement | null>(null);
  // On a phone the dates are one scrolling row: keep the open report's date in view.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (strip.current && el) strip.current.scrollLeft = el.offsetLeft - strip.current.offsetLeft - strip.current.clientWidth / 2 + el.clientWidth / 2;
  }, [selected, loaded.state]);
  if (loaded.state === 'loading') return <p className="state-note">Loading the reports.</p>;
  if (loaded.state === 'error') return <p className="state-note error">The reports could not be loaded ({loaded.message}).</p>;
  const reports = loaded.data.reports;
  const current = reports.find((r) => r.date === selected) ?? reports[0];
  return (
    <section className="archive" aria-labelledby="archive-title">
      <h2 id="archive-title" className="section-title">
        Daily reports
      </h2>
      <p className="lede">
        Every morning the system wrote a report on its positions, its profit and loss against simply holding, and the freshness of its data. These
        are the originals, in Polish, from {dayLabel(reports[0].date)} to {dayLabel(reports[reports.length - 1].date)} 2026. Real capital was in
        liquidity positions from 27 Aug to 18 Sep. Long logs are folded; private network addresses are hidden.
      </p>
      <nav className="days" aria-label="Report date" ref={strip}>
        {reports.map((r) => (
          <button key={r.date} type="button" className="chip" aria-pressed={r.date === current.date} onClick={() => setSelected(r.date)}>
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
        </header>
        <div lang="pl">
          <Markdown text={current.text} skipTitle />
        </div>
        <p className="path">{current.file}</p>
      </article>
    </section>
  );
}
