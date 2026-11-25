/**
 * The original paper panel after the 5.4 display changes (phase 5): rendered without the new props it is the same as
 * before them (showcase/live/fixtures/paper-panel.before.html, written from the unchanged src/ on 25 Nov 2026), and
 * the two agreed changes visible in the original app hold: the pending text and fixed number formats.
 * Run: TZ=UTC npx tsx showcase/live/panel.test.tsx
 */
process.env.TZ = 'UTC';
import { readFileSync } from 'fs';
import { renderToStaticMarkup } from 'react-dom/server';
import PaperTradingPanel from '../../src/components/PaperTradingPanel';
import type { PaperData, UseBotApi } from '../../src/hooks/useBotApi';
import { networkOf } from './LivePage';
import { PANEL_FIXTURE } from './panel-fixture';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const botOf = (paper: PaperData) => ({ paper, paperStatus: 'ok' }) as Pick<UseBotApi, 'paper' | 'paperStatus'> as UseBotApi;

// The snapshot was rendered under the Mac's Polish locale, so the capital read "$10 000/pool" (any group separator);
// that one string is the agreed change of item 5 (now en-US everywhere) and is normalized; everything else must match.
const before = readFileSync('showcase/live/fixtures/paper-panel.before.html', 'utf8').replace(/simulation \$10[\s\u00a0\u202f,.]?000\/pool/, 'simulation $10,000/pool');
const now = renderToStaticMarkup(<PaperTradingPanel bot={botOf(PANEL_FIXTURE)} />) + '\n';
check('without the new props the panel renders exactly as before the change', now === before, `${now.length} vs ${before.length} characters`);

// The pending state: its own text; a pool with a position and few samples keeps the old text.
const withPending: PaperData = JSON.parse(JSON.stringify(PANEL_FIXTURE));
withPending.state.positions['arbitrum-weth-usdc-005'] = { ...withPending.state.positions['mainnet-usdc-weth-030'], poolId: 'arbitrum-weth-usdc-005', status: 'pending' };
withPending.state.positions['mainnet-usdc-weth-005'] = { ...withPending.state.positions['mainnet-usdc-weth-030'], poolId: 'mainnet-usdc-weth-005' };
const p = renderToStaticMarkup(<PaperTradingPanel bot={botOf(withPending)} />);
check('pending pool: waiting for market data', p.includes('waiting for market data from the network; no position opened yet.'));
check('open pool with no samples: too few history points', (p.match(/too few history points collected yet for this pool\./g) ?? []).length === 1);

// Fixed formats: the capital per pool reads the same whatever the process locale.
check('capital per pool in en-US', now.includes('simulation $10,000/pool'));

// The Live props.
const live = renderToStaticMarkup(<PaperTradingPanel bot={botOf(withPending)} poolLabel={(id, l) => `${l} · ${networkOf(id)}`} showStartDate showValueRange />);
check('labels carry the network', live.includes('USDC/WETH · 0.30% · Ethereum') && live.includes('WETH/cbBTC · 0.05% · Base') && live.includes('WETH/USDC · 0.05% · Arbitrum'));
check('events carry the network too', /paper-event-pool">USDC\/WETH · 0\.30% · Ethereum</.test(live));
check('start date on every card with a position', (live.match(/class="muted paper-pool-start">started 20\.11\.2026/g) ?? []).length === 4);
check('the pending card says not started', live.includes('paper-pool-start">not started yet<'));
check('value range under each equity chart', (live.match(/value shown: \$[\d,.]+ to \$[\d,.]+/g) ?? []).length === 3);
check('networkOf', networkOf('mainnet-x') === 'Ethereum' && networkOf('base-x') === 'Base' && networkOf('arbitrum-x') === 'Arbitrum' && networkOf('x') === '');

console.log(`panel: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
