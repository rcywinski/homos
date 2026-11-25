import { useEffect, useState } from 'react';
import { health } from './api';
import { PROJECT_TITLE } from '../ai/serve/texts';
import { Archive } from './components/Archive';
import { Ask } from './components/Ask';
import { Comparison } from './components/Comparison';
import { About } from './components/About';
import { Notice } from './components/Notice';
import { Wallet } from './components/Wallet';
import { useWallet } from './data';

const TABS = [
  { id: 'ask', label: 'Ask the archive' },
  { id: 'compare', label: 'Cloud and local answers' },
  { id: 'reports', label: 'Daily reports' },
  { id: 'wallet', label: 'Wallet' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<Tab>('ask');
  // The Wallet tab exists only when the server has the wallet data (owner, 16 Nov 2026): never an empty or failing tab.
  const wallet = useWallet();
  const tabs = TABS.filter((t) => t.id !== 'wallet' || wallet.state === 'ready');
  // Phase 5: the Live link only when this server forwards the Live page's data (`live` in /api/health); otherwise
  // /live/ is a 404 and the archive page looks as it did before the demo.
  const [liveOn, setLiveOn] = useState(false);
  useEffect(() => {
    let alive = true;
    void health().then((h) => alive && setLiveOn('live' in h && h.live === true));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="page">
      {/* Phase 5: the two pages, the research archive (this one) and the paper-trading demonstration at /live/. */}
      {liveOn && (
        <nav className="page-switch" aria-label="Pages">
          <span aria-current="page">Archive</span>
          <a href="/live/">Live</a>
        </nav>
      )}
      <header className="masthead">
        <div className="masthead-text">
          <h1>{PROJECT_TITLE}</h1>
          <p className="tagline">
            A closed research project from 2026, with an assistant that answers from its records and checks its own quotes.
          </p>
          <details className="about-more">
            <summary>More about this project</summary>
            <About />
          </details>
        </div>
        <Notice />
      </header>
      <nav className="tabs" aria-label="Sections">
        {tabs.map((t) => (
          <button key={t.id} type="button" className="tab" aria-pressed={t.id === tab} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'ask' && <Ask />}
        {tab === 'compare' && <Comparison />}
        {tab === 'reports' && <Archive />}
        {tab === 'wallet' && wallet.state === 'ready' && <Wallet data={wallet.data} />}
      </main>
      <footer className="foot">
        <p>
          Source code and the full case study: the public repository on GitHub. The assistant runs on a home machine, so it is sometimes offline;
          the saved answers and the reports work without it.
        </p>
      </footer>
    </div>
  );
}
