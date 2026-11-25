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
import { feeYieldExample, statsAgeCell, statsNote, strategyLabel } from './labels';
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

// Display labels of the Live page.
check('strategy names in English', strategyLabel('Pasywny ±50%') === 'Passive ±50%' && strategyLabel('Adaptacyjna k=3 h=24h payback≤7d') === 'Adaptive k=3 h=24h payback≤7d');
check('strategy words inside a name', strategyLabel('FlatOnly [bez swapu] wąski ±5% |gap|<2%/12h→LP') === 'FlatOnly [no swap] narrow ±5% |gap|<2%/12h→LP');
check('an unknown strategy name stays as it is', strategyLabel('Adapt k=3 h=24h + trend(exit,HL7d,5%)') === 'Adapt k=3 h=24h + trend(exit,HL7d,5%)' && strategyLabel('hodl') === 'hodl');
const ex = feeYieldExample({ id: 'mainnet-usdc-weth-005', stats: { feeYieldDaily: 0.15344 }, suggestion: { tickLower: 194000, tickUpper: 199000 } });
check('fee example: 15.344 × 2 × 10 / 5000 = 0.061', !!ex && ex.spacing === 10 && ex.width === 5000 && Math.abs(ex.rangePct - 0.061376) < 1e-9);
check('fee example needs stats and a suggestion', feeYieldExample({ id: 'arbitrum-weth-usdc-005', stats: null, suggestion: null }) === null);

// Statistics age (5.6 preparation): the cell and the card line.
const NOW = Date.parse('2026-11-25T12:00:00Z');
const at = (min: number) => new Date(NOW - min * 60_000).toISOString();
check('fresh statistics: no card line', statsNote({ statsAt: at(10), statsWindow: { at: at(10), chunks: 35, failed: 0, ok: true } }, 'open', NOW) === null);
check('stale statistics: the card line', statsNote({ statsAt: at(47), statsWindow: { at: at(2), chunks: 35, failed: 35, ok: false } }, 'open', NOW) === 'market statistics last read 47 min ago; the last 24 h read was incomplete (35 of 35 chunks failed); fees are accrued on the last known yield.');
check('fresh but incomplete: the card line', statsNote({ statsAt: at(5), statsWindow: { at: at(5), chunks: 35, failed: 3, ok: true } }, 'open', NOW)?.includes('3 of 35 chunks failed') === true);
check('pending pool: no line (its own text says it)', statsNote({ statsWindow: { at: at(1), chunks: 35, failed: 35, ok: false } }, 'pending', NOW) === null);
check('telemetry cell', statsAgeCell({ statsAt: at(3) }, NOW) === '3 min ago' && statsAgeCell({ statsAt: at(120), statsWindow: { at: at(1), chunks: 10, failed: 2, ok: true } }, NOW) === '2 h ago (last read 2 of 10 chunks failed)');
check('telemetry cell before any read', statsAgeCell({}, NOW) === '—' && statsAgeCell({ statsWindow: { at: at(1), chunks: 0, failed: 0, ok: false } }, NOW) === 'never read');
const noted = renderToStaticMarkup(<PaperTradingPanel bot={botOf(PANEL_FIXTURE)} poolNote={(id) => (id === 'mainnet-usdc-weth-030' ? 'market statistics last read 47 min ago' : null)} />);
check('the card note renders on its card only', (noted.match(/paper-pool-note/g) ?? []).length === 1);

console.log(`panel: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
