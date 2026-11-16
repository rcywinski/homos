import { useState } from 'react';
import { PROJECT_TITLE } from '../ai/serve/texts';
import { Archive } from './components/Archive';
import { Ask } from './components/Ask';
import { Comparison } from './components/Comparison';
import { About } from './components/About';
import { Notice } from './components/Notice';
import { Wallet } from './components/Wallet';

const TABS = [
  { id: 'ask', label: 'Ask the archive' },
  { id: 'compare', label: 'Cloud and local answers' },
  { id: 'reports', label: 'Daily reports' },
  { id: 'wallet', label: 'Wallet' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<Tab>('ask');
  return (
    <div className="page">
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
        {TABS.map((t) => (
          <button key={t.id} type="button" className="tab" aria-pressed={t.id === tab} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'ask' && <Ask />}
        {tab === 'compare' && <Comparison />}
        {tab === 'reports' && <Archive />}
        {tab === 'wallet' && <Wallet />}
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
