/**
 * Sanitized wallet and paper-trading export for the showcase (phase 4, step 4.1b).
 *
 * Input: the eight raw files CC-Win copied from the box's `.bot/` into `data/showcase-raw/` (gitignored, never
 * committed; SHA-256 sums checked against CC-Win's list on 16 Nov 2026). Output: one JSON with only the fields the
 * wallet and paper-trading views need, copied field by field (nothing is passed through as a whole object), and only
 * the project period.
 *
 * Owner decisions (16 Nov 2026): amounts and the owner's wallet address may be public; the two manual positions opened
 * before the project (mainnet #953427 and #953465, opened 24 Mar 2025, closed 25 Aug 2026) are excluded entirely,
 * from every list and every total, and the page says so.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { hasPrivateAddress } from './mask';
import type { WalletData, WalletPaperPool, WalletPosition, WalletTx } from './showcase-data';

export const RAW_DIR = path.join('data', 'showcase-raw');

/** Manual positions opened before the project; excluded by the owner's decision. */
export const EXCLUDED_POSITIONS = ['mainnet:953427', 'mainnet:953465'];
/** The project ran from the first observation on 10 Aug 2026; nothing earlier is exported. */
export const PROJECT_START = '2026-08-10';

/** Public ERC-20 token contracts that appear in the ledger (the only addresses in the raw files). */
export const KNOWN_TOKENS: Record<string, string> = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC (Ethereum)',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH (Ethereum)',
  '0x4200000000000000000000000000000000000006': 'WETH (Base)',
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC (Base)',
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 'cbBTC (Base)',
};

interface RawClosed {
  chain: string;
  tokenId: string;
  sym0: string;
  sym1: string;
  openedAt: string;
  closedAt: string;
  inUsd: number | null;
  outUsd: number | null;
  txCount: number;
}
interface RawTx {
  ts: string;
  chain: string;
  tokenId: string;
  kind: string;
  a0h: number;
  a1h: number;
  sym0: string;
  sym1: string;
  usd: number | null;
  txHash: string;
}
interface RawHistory {
  ts: string;
  tokenId: string;
  poolId: string;
  valueUsd: number;
  hodlUsd: number;
  feesUsd?: number;
  inRange: boolean;
}
interface RawPaperHistory {
  ts: string;
  poolId: string;
  status: string;
  equityUsd: number;
  hodlUsd: number;
  feesUsd: number;
  costsUsd: number;
  rebalances: number;
}
interface RawPaperEvent {
  ts: string;
  poolId: string;
  kind: string;
}
interface RawLedgerState {
  tokens: Record<string, { token0: string; token1: string; fee: number; sym0: string; sym1: string }>;
}
interface RawPaperState {
  startedAt: string;
  capitalPerPoolUsd: number;
}

const ndjson = <T>(file: string): T[] =>
  readFileSync(file, 'utf8')
    .replace(/\r\n/g, '\n')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);

const round = (x: number | null | undefined, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? null : Number(x.toFixed(d)));
const day = (ts: string) => ts.slice(0, 10);

/** Last sample of each UTC day, in time order. */
function daily<T extends { ts: string }>(rows: T[]): T[] {
  const byDay = new Map<string, T>();
  for (const r of [...rows].sort((a, b) => a.ts.localeCompare(b.ts))) byDay.set(day(r.ts), r);
  return [...byDay.values()];
}

export function buildWallet(dir = RAW_DIR): WalletData {
  const file = (f: string) => path.join(dir, f);
  const keep = (chain: string, tokenId: string) => !EXCLUDED_POSITIONS.includes(`${chain}:${tokenId}`);

  const ledger = JSON.parse(readFileSync(file('ledger-state.json'), 'utf8')) as RawLedgerState;
  const closed = (JSON.parse(readFileSync(file('closed-positions.json'), 'utf8')) as RawClosed[]).filter((p) => keep(p.chain, p.tokenId) && p.openedAt >= PROJECT_START);
  const txs = ndjson<RawTx>(file('tx-ledger.ndjson')).filter((t) => keep(t.chain, t.tokenId) && t.ts >= PROJECT_START);
  const costs = JSON.parse(readFileSync(file('tx-costs.json'), 'utf8')) as Record<string, { chain: string; gasEth: number }>;
  const kept = new Set(closed.map((p) => p.tokenId));
  const history = ndjson<RawHistory>(file('positions-history.ndjson')).filter((h) => kept.has(h.tokenId) && h.ts >= PROJECT_START);

  const positions: WalletPosition[] = closed
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt))
    .map((p) => {
      const meta = ledger.tokens[`${p.chain}:${p.tokenId}`];
      const series = daily(history.filter((h) => h.tokenId === p.tokenId));
      const last = series[series.length - 1];
      return {
        chain: p.chain,
        tokenId: p.tokenId,
        pair: `${p.sym0}/${p.sym1}`,
        feeTierPct: meta ? meta.fee / 10_000 : null,
        openedAt: p.openedAt,
        closedAt: p.closedAt,
        depositedUsd: round(p.inUsd),
        withdrawnUsd: round(p.outUsd),
        lastValueUsd: round(last?.valueUsd),
        lastHodlUsd: round(last?.hodlUsd),
        lastFeesUsd: round(last?.feesUsd),
        transactions: txs.filter((t) => t.chain === p.chain && t.tokenId === p.tokenId).length,
        daily: series.map((h) => ({ date: day(h.ts), valueUsd: round(h.valueUsd) ?? 0, hodlUsd: round(h.hodlUsd) ?? 0, inRange: h.inRange })),
      };
    });

  const transactions: WalletTx[] = txs
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .map((t) => ({
      ts: t.ts,
      chain: t.chain,
      tokenId: t.tokenId,
      kind: t.kind,
      amount0: round(t.a0h, 8) ?? 0,
      amount1: round(t.a1h, 8) ?? 0,
      sym0: t.sym0,
      sym1: t.sym1,
      usd: round(t.usd),
      txHash: t.txHash,
      gasEth: round(costs[t.txHash]?.gasEth, 8),
    }));

  const paperState = JSON.parse(readFileSync(file('paper-state.json'), 'utf8')) as RawPaperState;
  const paperHistory = ndjson<RawPaperHistory>(file('paper-history.ndjson')).filter((h) => h.ts >= PROJECT_START);
  const paperEvents = ndjson<RawPaperEvent>(file('paper-events.ndjson')).filter((e) => e.ts >= PROJECT_START);
  const pools = [...new Set(paperHistory.map((h) => h.poolId))].sort();
  const paper: WalletPaperPool[] = pools.map((poolId) => {
    const series = daily(paperHistory.filter((h) => h.poolId === poolId));
    const last = series[series.length - 1];
    return {
      poolId,
      capitalUsd: paperState.capitalPerPoolUsd,
      status: last.status,
      lastEquityUsd: round(last.equityUsd) ?? 0,
      lastHodlUsd: round(last.hodlUsd) ?? 0,
      feesUsd: round(last.feesUsd) ?? 0,
      costsUsd: round(last.costsUsd) ?? 0,
      rebalances: last.rebalances,
      lastSampleAt: last.ts,
      events: paperEvents.filter((e) => e.poolId === poolId).map((e) => ({ ts: e.ts, kind: e.kind })),
      daily: series.map((h) => ({ date: day(h.ts), equityUsd: round(h.equityUsd) ?? 0, hodlUsd: round(h.hodlUsd) ?? 0 })),
    };
  });

  const gas = transactions.reduce((s, t) => s + (t.gasEth ?? 0), 0);
  return {
    period: { from: PROJECT_START, paperStartedAt: paperState.startedAt },
    excluded: { note: 'Two manual positions opened before the project (March 2025) are excluded from every list and total.' },
    tokens: Object.entries(KNOWN_TOKENS).map(([address, label]) => ({ address, label })),
    totals: {
      positions: positions.length,
      transactions: transactions.length,
      gasEth: round(gas, 6) ?? 0,
      paperPools: paper.length,
    },
    positions,
    transactions,
    paper,
  };
}

/**
 * Audit of the exported text, run before it is written and in the tests. Returns every problem found:
 *   - any URL (the raw files hold none; a URL could carry an API key);
 *   - any private network address;
 *   - any 0x address of 40 hex digits other than the known token contracts and the owner's wallet;
 *   - any 0x string of 64 hex digits outside a "txHash" field (a private key has the same shape);
 *   - any trace of an excluded position;
 *   - any date before the project start.
 */
export function auditWallet(text: string, ownerWallet = ''): string[] {
  const problems: string[] = [];
  if (/https?:\/\/|wss?:\/\//i.test(text)) problems.push('contains a URL');
  if (/[?&](api[-_]?key|key|token|apikey)=/i.test(text)) problems.push('contains a key parameter');
  if (hasPrivateAddress(text)) problems.push('contains a private network address');
  const allowed = new Set([...Object.keys(KNOWN_TOKENS), ownerWallet.toLowerCase()].filter(Boolean));
  for (const m of text.matchAll(/0x[0-9a-fA-F]+/g)) {
    const hex = m[0];
    if (hex.length === 42 && !allowed.has(hex.toLowerCase())) problems.push(`unknown address ${hex.slice(0, 10)}...`);
    if (hex.length === 66) {
      const before = text.slice(Math.max(0, (m.index ?? 0) - 12), m.index);
      if (!/"txHash":"$/.test(before)) problems.push(`64-digit hex outside a txHash field ${hex.slice(0, 10)}...`);
    }
    if (hex.length !== 42 && hex.length !== 66) problems.push(`hex string of unexpected length ${hex.length - 2}`);
  }
  for (const id of EXCLUDED_POSITIONS) if (new RegExp(`(?<!\\d)${id.split(':')[1]}(?!\\d)`).test(text)) problems.push(`excluded position ${id} present`);
  for (const m of text.matchAll(/"(?:ts|date|openedAt|closedAt|lastSampleAt)":"(\d{4}-\d{2}-\d{2})/g)) if (m[1] < PROJECT_START) problems.push(`date before the project: ${m[1]}`);
  return [...new Set(problems)];
}
