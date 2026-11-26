/**
 * Test-only page (never shipped): the original BotTelemetry and ObservationAnalysis rendered WITHOUT the Live page's
 * optional props, against the stand-in bot's data (same origin). harness.spec.ts compares its HTML with a snapshot
 * taken from the unchanged src/ before the 5.4 follow-ups, so "renders as before" is checked in a real browser.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import BotTelemetry from '../../../src/components/BotTelemetry';
import ObservationAnalysis from '../../../src/components/ObservationAnalysis';
import TopRankingPanel from '../../../src/components/TopRankingPanel';
import type { BotStateShape, UseBotApi } from '../../../src/hooks/useBotApi';

function Harness() {
  const [bot, setBot] = useState<UseBotApi | null>(null);
  useEffect(() => {
    const get = async (p: string) => (await fetch(p)).json();
    void Promise.all(['/api/state', '/api/ranking', '/api/wide-ranking', '/api/wide-daily', '/api/wide-backtests', '/api/candidates'].map(get)).then(
      ([state, ranking, wideRanking, wideDaily, wideBacktests, candidates]) =>
        setBot({
          state: state as BotStateShape,
          apiBase: '',
          apiToken: '',
          ranking,
          rankingStatus: 'ok',
          wideRanking,
          wideRankingStatus: 'ok',
          wideDaily,
          wideBacktests,
          candidates,
        } as unknown as UseBotApi),
    );
  }, []);
  if (!bot) return <div>loading</div>;
  return (
    <div id="sections">
      <BotTelemetry bot={bot} />
      <ObservationAnalysis bot={bot} />
      <TopRankingPanel bot={bot} />
      <TopRankingPanel bot={bot} variant="wide" />
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Harness />);
