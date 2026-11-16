import { useState } from 'react';
import { Archive } from './components/Archive';
import { Comparison } from './components/Comparison';
import { Notice } from './components/Notice';
import { Wallet } from './components/Wallet';

const TABS = [
  { id: 'compare', label: 'Cloud vs local answers' },
  { id: 'archive', label: 'Morning reports' },
  { id: 'wallet', label: 'Wallet' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<Tab>('compare');
  return (
    <div className="page">
      <header className="masthead">
        <h1>HOMOS</h1>
        <p className="tagline">A closed Uniswap v3 liquidity research project (Aug to Sep 2026) and the AI layer built over its journal.</p>
        <Notice />
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={t.id === tab ? 'tab active' : 'tab'} aria-pressed={t.id === tab} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'compare' && <Comparison />}
        {tab === 'archive' && <Archive />}
        {tab === 'wallet' && <Wallet />}
      </main>
    </div>
  );
}
