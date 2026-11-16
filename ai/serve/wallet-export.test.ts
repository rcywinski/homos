/**
 * Tests for the sanitized wallet export (phase 4, step 4.1b). Offline.
 *   1. A synthetic raw folder with traps (an excluded position, a pre-project entry, a URL with a key and a private
 *      address in an extra field, an unknown address, a private-key-shaped hex string): none may reach the export.
 *   2. The audit itself catches each kind of leak.
 *   3. The real raw files, when present on this machine (they are gitignored and absent in CI).
 * Run: npx tsx ai/serve/wallet-export.test.ts
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { auditWallet, buildWallet, EXCLUDED_POSITIONS, KNOWN_TOKENS, PROJECT_START, RAW_DIR } from './wallet-export';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const OWNER = '0x1111111111111111111111111111111111111111';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const WETH = '0x4200000000000000000000000000000000000006';
const TX = (n: number) => '0x' + String(n).padStart(64, 'a');
const KEYLIKE = '0x' + 'b'.repeat(64);

// --- 1. Synthetic raw folder with traps -------------------------------------------------------------------------
const dir = mkdtempSync(path.join(os.tmpdir(), 'homos-wallet-'));
try {
  const w = (f: string, body: string) => writeFileSync(path.join(dir, f), body);
  w(
    'ledger-state.json',
    JSON.stringify({
      chains: { base: { nextBlock: 1, rpc: 'https://base.example/v2/SECRETKEY' } },
      tokens: {
        'base:100': { token0: WETH, token1: USDC, fee: 3000, sym0: 'WETH', sym1: 'USDC' },
        'mainnet:953427': { token0: USDC, token1: WETH, fee: 3000, sym0: 'USDC', sym1: 'WETH' },
      },
    }),
  );
  w(
    'closed-positions.json',
    JSON.stringify([
      { chain: 'mainnet', tokenId: '953427', sym0: 'USDC', sym1: 'WETH', openedAt: '2025-03-24T13:45:23.000Z', closedAt: '2026-08-25T07:54:23.000Z', inUsd: 2.42, outUsd: 3.04, txCount: 4 },
      { chain: 'base', tokenId: '100', sym0: 'WETH', sym1: 'USDC', openedAt: '2026-08-27T09:43:00.000Z', closedAt: '2026-09-18T14:07:00.000Z', inUsd: 3504.56, outUsd: 3545.04, txCount: 2, note: 'see http://192.168.1.8:8787/?key=abc', owner: '0x9999999999999999999999999999999999999999' },
    ]),
  );
  w(
    'tx-ledger.ndjson',
    [
      { ts: '2025-03-24T13:45:23.000Z', chain: 'mainnet', tokenId: '953427', kind: 'MINT', a0h: 0, a1h: 0, sym0: 'USDC', sym1: 'WETH', usd: null, txHash: TX(1) },
      { ts: '2026-08-25T07:54:23.000Z', chain: 'mainnet', tokenId: '953427', kind: 'COLLECT', a0h: 1, a1h: 0, sym0: 'USDC', sym1: 'WETH', usd: 1, txHash: TX(2) },
      { ts: '2026-08-27T09:43:00.000Z', chain: 'base', tokenId: '100', kind: 'MINT', a0h: 0, a1h: 0, sym0: 'WETH', sym1: 'USDC', usd: null, txHash: TX(3) },
      { ts: '2026-08-27T09:43:00.000Z', chain: 'base', tokenId: '100', kind: 'INCREASE', a0h: 0.66, a1h: 1826.99, sym0: 'WETH', sym1: 'USDC', usd: 3504.56, txHash: TX(3), privateKey: KEYLIKE, from: '0x9999999999999999999999999999999999999999' },
      { ts: '2026-09-18T14:07:00.000Z', chain: 'base', tokenId: '100', kind: 'DECREASE', a0h: 0.64, a1h: 1857.07, sym0: 'WETH', sym1: 'USDC', usd: 3517.87, txHash: TX(4) },
      { ts: '2026-09-18T14:07:00.000Z', chain: 'base', tokenId: '100', kind: 'COLLECT', a0h: 0.65, a1h: 1870.45, sym0: 'WETH', sym1: 'USDC', usd: 3545.04, txHash: TX(4) },
    ]
      .map((x) => JSON.stringify(x))
      .join('\n'),
  );
  w('tx-costs.json', JSON.stringify({ [TX(3)]: { chain: 'base', gasEth: 0.000001, block: 1 }, [TX(4)]: { chain: 'base', gasEth: 0.000002, block: 2 } }));
  w(
    'positions-history.ndjson',
    [
      { ts: '2026-08-20T11:54:12.896Z', tokenId: '953427', poolId: 'mainnet-usdc-weth-030', valueUsd: 2.28, hodlUsd: 2.28, inRange: true },
      { ts: '2026-08-27T10:00:00.000Z', tokenId: '100', poolId: 'base-weth-usdc-030', valueUsd: 3500, hodlUsd: 3501, inRange: true, lo: 1, hi: 2 },
      { ts: '2026-08-27T20:00:00.000Z', tokenId: '100', poolId: 'base-weth-usdc-030', valueUsd: 3510, hodlUsd: 3505, feesUsd: 2, inRange: true },
    ]
      .map((x) => JSON.stringify(x))
      .join('\n'),
  );
  w('paper-state.json', JSON.stringify({ startedAt: '2026-08-18T13:13:05.955Z', capitalPerPoolUsd: 10000, rpcUrl: 'https://rpc.example/?apikey=XYZ' }));
  w('paper-events.ndjson', JSON.stringify({ ts: '2026-08-18T13:14:30.849Z', poolId: 'base-weth-usdc-030', kind: 'OPEN', tickLower: 1, debug: 'http://10.8.0.2/' }));
  w(
    'paper-history.ndjson',
    [
      { ts: '2026-08-18T13:30:54.303Z', poolId: 'base-weth-usdc-030', status: 'open', equityUsd: 10000, hodlUsd: 10000, feesUsd: 0, costsUsd: 0, rebalances: 0 },
      { ts: '2026-08-19T13:30:54.303Z', poolId: 'base-weth-usdc-030', status: 'open', equityUsd: 10010, hodlUsd: 10020, feesUsd: 1, costsUsd: 0.5, rebalances: 0, secret: 'sk-ant-xxx' },
    ]
      .map((x) => JSON.stringify(x))
      .join('\n'),
  );

  const data = buildWallet(dir);
  const text = JSON.stringify(data);
  check('the excluded position is not in the export', !text.includes('953427'));
  check('excluded transactions are not counted; same-hash entries make one row', data.totals.transactions === 2 && data.transactions.length === 2, JSON.stringify(data.totals));
  check('mint and deposit in one transaction: one "opened" row', data.transactions[0].action === 'opened' && data.transactions[0].amount1 === 1826.99);
  check('decrease and collect in one transaction: one "withdrawn" row with the fee part', data.transactions[1].action === 'withdrawn' && data.transactions[1].amount1 === 1870.45 && data.transactions[1].fees1 === 13.38, JSON.stringify(data.transactions[1]));
  check('gas counted once per transaction', data.totals.gasEth === 0.000003, String(data.totals.gasEth));
  check('position counts transactions, not ledger entries', data.positions[0].transactions === 2);
  check('against holding before fees from recorded values', data.positions[0].againstHoldingBeforeFeesUsd === 5 && data.positions[0].againstHoldingWithFeesUsd === 7, JSON.stringify(data.positions[0]));
  check('deposited and withdrawn tokens from the ledger', data.positions[0].depositedTokens?.a1 === 1826.99 && data.positions[0].withdrawnTokens?.a1 === 1870.45);
  check('one real position kept', data.positions.length === 1 && data.positions[0].tokenId === '100');
  check('extra raw fields are dropped (URL, private address, key parameter)', !/https?:|192\.168|10\.8\.0|key=|apikey/i.test(text), text.slice(0, 200));
  check('an unknown address in an extra field is dropped', !text.includes('0x9999'));
  check('a private-key-shaped field is dropped', !text.includes(KEYLIKE));
  check('other extra fields are dropped', !text.includes('sk-ant') && !text.includes('tickLower') && !text.includes('"lo"'));
  check('the daily series keeps the last sample of each day', data.positions[0].daily.length === 1 && data.positions[0].daily[0].valueUsd === 3510);
  check('gas joined by transaction hash', data.transactions[0].gasEth === 0.000001 && data.transactions[1].gasEth === 0.000002);
  check('the synthetic export passes the audit', auditWallet(text, OWNER).length === 0, auditWallet(text, OWNER).join('; '));
  check('the page note names the exclusion without the position numbers', data.excluded.note.includes('Two manual positions'));
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// --- 2. The audit catches each kind of leak -------------------------------------------------------------------
const catches = (text: string, needle: string, owner = '') => auditWallet(text, owner).some((p) => p.includes(needle));
check('audit: URL', catches('{"a":"https://x.example/v1"}', 'URL'));
check('audit: key parameter', catches('{"a":"rpc?apikey=1"}', 'key parameter'));
check('audit: private address', catches('{"a":"192.168.1.8"}', 'private network'));
check('audit: unknown address', catches(`{"a":"0x${'2'.repeat(40)}"}`, 'unknown address'));
check('audit: owner wallet allowed', !catches(`{"a":"${OWNER}"}`, 'unknown address', OWNER));
check('audit: known tokens allowed', auditWallet(JSON.stringify(Object.keys(KNOWN_TOKENS))).length === 0);
check('audit: 64-digit hex outside txHash', catches(`{"note":"${KEYLIKE}"}`, 'outside a txHash'));
check('audit: 64-digit hex inside txHash allowed', auditWallet(`{"txHash":"${KEYLIKE}"}`).length === 0);
check('audit: excluded position', catches('{"tokenId":"953465"}', 'excluded position'));
check('audit: excluded position inside a longer string', catches('{"note":"mainnet:953427"}', 'excluded position'));
check('audit: a longer number that contains the digits is fine', !catches('{"block":"19534271"}', 'excluded position'));
check('audit: date before the project', catches('{"ts":"2025-03-24T13:45:23.000Z"}', 'before the project'));
check('audit: project start constant', PROJECT_START === '2026-08-10' && EXCLUDED_POSITIONS.length === 2);

// --- 2b. The browser-test fixture is made up, marked as such, and passes the same audit ------------------------
{
  const fixture = JSON.parse(readFileSync(path.join('showcase', 'e2e', 'fixtures', 'wallet.fixture.json'), 'utf8')) as { fixture?: string; positions: { tokenId: string }[] };
  const text = JSON.stringify(fixture);
  check('fixture is marked as made up', typeof fixture.fixture === 'string' && fixture.fixture.includes('made-up'));
  check('fixture passes the audit', auditWallet(text).length === 0, auditWallet(text).join('; '));
  check('fixture uses made-up position numbers', fixture.positions.every((p) => p.tokenId.startsWith('9000')));
}

// --- 3. The real raw files, when present ----------------------------------------------------------------------
if (existsSync(RAW_DIR)) {
  const real = buildWallet();
  const text = JSON.stringify(real);
  const problems = auditWallet(text, process.env.SHOWCASE_WALLET_ADDRESS ?? '');
  check('real export passes the audit', problems.length === 0, problems.join('; '));
  check('real export: four project positions', real.positions.length === 4, String(real.positions.length));
  check('real export: no trace of #953427 or #953465', !text.includes('953427') && !text.includes('953465'));
  check('real export: eight project transactions, one row each', real.transactions.length === 8 && new Set(real.transactions.map((t) => t.txHash)).size === 8, String(real.transactions.length));
  check('real export: every transaction is an opening or a withdrawal', real.transactions.every((t) => t.action === 'opened' || t.action === 'withdrawn'));
  check('real export: against holding with fees = before fees + fees, per position', real.positions.every((p) => p.againstHoldingWithFeesUsd === null || Math.abs((p.againstHoldingBeforeFeesUsd ?? 0) + (p.lastFeesUsd ?? 0) - p.againstHoldingWithFeesUsd) < 0.011));
  check('real export: totals are the sums of the positions', Math.abs((real.totals.feesUsd ?? 0) - real.positions.reduce((s, p) => s + (p.lastFeesUsd ?? 0), 0)) < 0.011);
  check('real export: token amounts present where dollars are missing', real.positions.every((p) => p.depositedUsd !== null || p.depositedTokens !== null));
  check('real export: six paper pools', real.paper.length === 6);
  check('real export: every date in the project period', real.transactions.every((t) => t.ts >= PROJECT_START) && real.positions.every((p) => p.openedAt >= PROJECT_START));
  console.log(`wallet: real raw files checked (${(text.length / 1024).toFixed(0)} KB export)`);
} else console.log(`wallet: ${RAW_DIR} not present, real-data checks skipped`);

console.log(`wallet: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
