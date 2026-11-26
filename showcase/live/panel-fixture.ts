/**
 * A fixed paper data set for the panel snapshot test (showcase/live/panel.test.tsx): three pools with a position and
 * no timer-dependent state, so the rendered HTML does not depend on the clock.
 */
import type { PaperData } from '../../src/hooks/useBotApi';

const T0 = Date.parse('2026-11-20T00:00:00Z');
const iso = (h: number) => new Date(T0 + h * 3_600_000).toISOString();
const pools = [
  { id: 'mainnet-usdc-weth-030', status: 'open', price: 3000, lo: 2600, hi: 3400 },
  { id: 'base-cbbtc-weth-005', status: 'open', price: 0.033, lo: 0.031, hi: 0.035 },
  { id: 'base-weth-cbbtc-030', status: 'cash', price: 30, lo: 27, hi: 33 },
];

export const PANEL_FIXTURE: PaperData = {
  state: {
    startedAt: iso(0),
    capitalPerPoolUsd: 10_000,
    updatedAt: iso(24),
    positions: Object.fromEntries(
      pools.map((p, i) => [
        p.id,
        {
          poolId: p.id, status: p.status, tickLower: -200000, tickUpper: -190000, capitalUsd: 10_000, feesUsd: 10 + i,
          feesSinceRebalanceUsd: 2, costsUsd: 1.5, rebalances: i, hedge: null, hedgePnlRealizedUsd: 0,
          openedAt: iso(i), startedAt: iso(i), outOfRangeSince: null,
        },
      ]),
    ),
  },
  history: pools.flatMap((p, i) =>
    Array.from({ length: 9 }, (_, k) => ({
      ts: iso(k * 3), poolId: p.id, status: p.status, equityUsd: 10_000 - k * (i + 1) * 3, hodlUsd: 10_000 - k * i, feesUsd: k * 0.5,
      costsUsd: 1.5, inRange: true, trendDown: p.status === 'cash', rebalances: i, price: p.price * (1 + 0.001 * k),
      ...(p.status === 'open' ? { lo: p.lo, hi: p.hi } : {}),
    })),
  ),
  events: [
    { ts: iso(0), poolId: 'mainnet-usdc-weth-030', kind: 'OPEN' },
    { ts: iso(12), poolId: 'base-weth-cbbtc-030', kind: 'EXIT_TREND' },
  ],
};
