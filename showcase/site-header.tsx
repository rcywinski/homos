/**
 * The site header shared by both pages (phase 5, step 5.5b): the neutral site name and two tabs, the research archive
 * and the Live simulation, each with one line saying what it is. Its look comes only from site-header.css, so it is the
 * same on the archive (showcase styles) and on Live (the original cockpit styles).
 * The Live tab exists only when the server forwards the Live data (`liveOn`); without it the header shows the archive
 * alone, as one part.
 */
import type { FC } from 'react';

export const SITE_NAME = 'DeFi liquidity-provision trading system';

const TABS = [
  { id: 'archive', href: '/', name: 'Research archive', line: 'The closed 2026 project: real-capital results, daily reports, an AI assistant over the records' },
  { id: 'live', href: '/live/', name: 'Live simulation', line: "The same algorithm on today's market: six simulated positions, updated every 15 minutes" },
] as const;

export const SiteHeader: FC<{ current: 'archive' | 'live'; liveOn: boolean }> = ({ current, liveOn }) => (
  <header className="site-header">
    <div className="site-header-inner">
      <a className="site-header-name" href="/">
        {SITE_NAME}
      </a>
      {liveOn && (
        <nav className="site-tabs" aria-label="Site sections">
          {TABS.map((t) => (
            <a key={t.id} className="site-tab" href={t.href} aria-current={t.id === current ? 'page' : undefined}>
              <span className="site-tab-name">{t.name}</span>
              <span className="site-tab-line">{t.line}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  </header>
);

/** The card in the content that sends a reader to the other part of the site. */
export const CrossLink: FC<{ href: string; title: string; text: string; testId: string }> = ({ href, title, text, testId }) => (
  <a className="site-crosslink" href={href} data-testid={testId}>
    <span className="site-crosslink-title">{title} →</span>
    <span className="site-crosslink-text">{text}</span>
  </a>
);
