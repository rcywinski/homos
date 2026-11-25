/**
 * Test-only page (never shipped): the original BotTelemetry and ObservationAnalysis rendered WITHOUT the Live page's
 * optional props, against the stand-in bot's data (same origin). harness.spec.ts compares its HTML with a snapshot
 * taken from the unchanged src/ before the 5.4 follow-ups, so "renders as before" is checked in a real browser.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import BotTelemetry from '../../../src/components/BotTelemetry';
import ObservationAnalysis from '../../../src/components/ObservationAnalysis';
import type { BotStateShape, UseBotApi } from '../../../src/hooks/useBotApi';

function Harness() {
  const [state, setState] = useState<BotStateShape | null>(null);
  useEffect(() => {
    void fetch('/api/state').then(async (r) => setState((await r.json()) as BotStateShape));
  }, []);
  if (!state) return <div>loading</div>;
  const bot = { state, apiBase: '', apiToken: '' } as Pick<UseBotApi, 'state' | 'apiBase' | 'apiToken'> as UseBotApi;
  return (
    <div id="sections">
      <BotTelemetry bot={bot} />
      <ObservationAnalysis bot={bot} />
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Harness />);
