import { useState } from 'react';
import { PROJECT_TITLE } from '../ai/serve/texts';
import { Archive } from './components/Archive';
import { Ask } from './components/Ask';
import { Comparison } from './components/Comparison';
import { Notice } from './components/Notice';

/** The wallet view waits for step 4.1b (recovering the ledger); until then it is not offered. */
const TABS = [
  { id: 'ask', label: 'Ask the archive' },
  { id: 'compare', label: 'Cloud and local answers' },
  { id: 'reports', label: 'Daily reports' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<Tab>('ask');
  return (
    <div className="page">
      <header className="masthead">
        <h1>{PROJECT_TITLE}</h1>
        <div className="intro">
          <p>
            From August to September 2026 a small automated system provided liquidity on Uniswap v3, first on paper and then with real money,
            and kept a detailed journal of every decision. The assistant on this page answers questions about that project from its journal,
            decision log, documentation and daily reports, using a model that runs on the owner&apos;s own graphics card. Language models can
            invent quotes and figures, so code checks every quote against its source before you see it and marks every number by how well the
            sources back it.
          </p>
          <p className="how">
            Reading the marks: <span className="num num-verified">✓ verified in a quote</span>,{' '}
            <span className="num num-in-source">≈ found in the cited source</span>, <span className="num num-not-verified">? not verified</span>.
          </p>
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
