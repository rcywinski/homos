/**
 * bot/config.ts — configuration of the observer bot (standalone, no UI dependencies).
 * Env:
 *   BOT_WATCH_ADDRESS  — wallet address whose positions are observed (effectively required)
 *   RPC_MAINNET / RPC_BASE — optional custom RPCs
 *   TG_TOKEN / TG_CHAT — optional Telegram for alerts
 */
export interface BotPool {
  id: string;
  chainId: number;
  chain: 'mainnet' | 'base' | 'arbitrum';
  address: `0x${string}`;
  feeBps: number;
  ethIsToken0: boolean;
  d0: number;
  d1: number;
  sym0: string;
  sym1: string;
  /** pool token addresses — for UNAMBIGUOUS matching of NFT positions
   *  (matching by chain+fee stopped being enough with >1 pair per tier) */
  t0?: `0x${string}`;
  t1?: `0x${string}`;
  /** quote currency of the pool price: 'USD' (default; ethUsd = USD per ETH)
   *  or 'WETH' (pairs like cbBTC/WETH; ethUsd = USD per base token,
   *  computed via the rate from the reference pool usdRefPoolId) */
  quote?: 'USD' | 'WETH';
  usdRefPoolId?: string;
  /** override of the advisor multiplier k for this pool (ALGORITHM v1.1: ETH/stable k=3
   *  [default from ADVISOR_PARAMS], correlated pairs k=2) */
  advisorK?: number;
  /** re-entry mode of the trend circuit breaker (ALGORITHM v1.1 §4): 'aboveEma'
   *  [default, ETH/stable] — the signal clears only when price is ABOVE the EMA;
   *  'half' [cbBTC] — clears at gap > −thresh/2 (pure exit) */
  trendReentry?: 'aboveEma' | 'half';
  /** defensive action on a DOWN signal (ALGORITHM v1.2 §4): 'exit' [default] —
   *  proposal to exit to cash 50/50; 'hedge' [base-030] — proposal of a
   *  perp short (GMX) on the ETH excess above 50% of value, LP stays */
  trendAction?: 'exit' | 'hedge';
  /** PRODUCT 27.08 — FlatWide hybrid (Rafal's decision, CONTEXT journal
   *  27.08): idle posture = WIDE passive LP of fixed width
   *  ±N% (instead of the advisor's k×σ). When set: range suggestions
   *  (OPEN in the cockpit, charts) are computed from this width. Narrowing
   *  to k×σ happens ONLY in a confirmed flat (|gap|<2% for
   *  confirmH hours — FLAT_ENTER proposal, separate logic). */
  productIdleWidthPct?: number;
  /** PRODUCT 29.08 — width of the NARROW leg in a confirmed flat
   *  (Rafal's remark: "we have a 2% gap, exit at 5%, and a 16% range —
   *  that does not hold together" — he was right).
   *  Until 29.08 the narrowing was computed by advisor v1.2 as k×σ×√7, where
   *  the 7-day horizon comes from a COMPLETELY different strategy ("the range
   *  must survive a week without rebalancing"). In the hybrid the position is
   *  protected by FLAT_WIDEN at |gap|>exitGap, so a band wider than the exit
   *  threshold is liquidity the price will never reach:
   *  at ±16% the exit signal fires after 32% of the way to the edge, at
   *  ±6% — after 83%. Hence the width is DERIVED from the exit threshold
   *  (FLAT.exitGap = 5%) plus a margin for EMA drift during the episode.
   *  VALUE 5% ON BOTH POOLS = exactly FLAT.exitGap (Rafal's decision
   *  29.08 after the sweep): the band edge coincides with the FLAT_WIDEN
   *  signal, so the position stops earning at the same moment we widen
   *  it anyway — one rule instead of two arbitrary numbers. Sweep
   *  (flatwindows, 365d, CONFIRM_H=12, ΣEV of narrowing): cbBTC ±8% $193
   *  → ±6% $334 → ±5% $442 → ±4% $570 → ±3% $685; base-030 ±8% $195
   *  → ±6% $388 → ±5% $525 → ±4% $672.
   *  EV grows monotonically toward narrower bands, but below ±5% the
   *  in-range time share breaks down (cbBTC at ±3%: 59–79% in several
   *  episodes) — hence ±5% as the point where we get almost all the EV
   *  with 85–100% in-range.
   *  CAVEAT: sweep computed on the 365d cache ending 11.08;
   *  verification on fresh 720d (including the bull) — assigned to CC-Win
   *  for the 31.08 review, together with a hybrid walkforward at THIS width
   *  (today the walkforward narrows by k×σ×√7 — see RESEARCH-QUEUE E4). */
  productNarrowWidthPct?: number;
}

/** Downtrend circuit breaker (ALGORITHM.md v1.1 §4) — single source of truth. */
export const TREND = {
  hlDays: 7, // half-life of the EMA of the pair's relative log-price
  thresh: 0.05, // DOWN signal when log(P/EMA) < −5%
};

/** PRODUCT FlatWide — flat detector FLAT_ENTER/FLAT_EXIT (28.08).
 *  Narrowing the LP to k×σ ONLY in a confirmed flat; outside the flat a wide
 *  passive ±productIdleWidthPct. Parameters from E1/flatwindows (365d Fable
 *  + 720d and cross-check CC-Win, 2 pools): confirm 12h instead of 24h ~2×
 *  more episodes caught without loss of quality (base-030 ΣEV +223%,
 *  cbBTC +13%). EMA: THE SAME as the trend circuit breaker (HL 7d, trend-state)
 *  — HL_D=5 (best on cbBTC, +18%) DEFERRED to the 1.09 review
 *  (the 12h+5d combination is untested, it would require a second EMA).
 *  The detector runs EXCLUSIVELY on product pools (productIdleWidthPct)
 *  — lesson from mainnet-wsteth-weth-001 (scan 27.08): on pairs with
 *  structurally low volatility (LST, stable/stable) the detector catches
 *  microstructure noise and generates pure costs; additionally a hard
 *  minVolDaily threshold. PROPOSE mode — nothing executes by itself. */
export const FLAT = {
  enterGap: 0.02, // |log-gap| < 2% → flat candidate (confirm clock starts)
  exitGap: 0.05, // |log-gap| > 5% → end of flat (proposal to return to wide, 24/7 alarm)
  confirmH: 12, // confirmation: continuously within threshold for N hours
  minVolDaily: 0.005, // below 0.5%/d a flat is NOT a signal (LST/stable class)
  narrowFrac: 0.6, // position is "narrow" when half-width < 0.6 × productIdleWidthPct
};

/** CAPITAL TRANCHE (29.08, Rafal's question "the math does not add up"):
 *  the cockpit panel computes PnL from position ANCHORS, so it does not show
 *  how much of the deposited USDC has really come back. The tranche balance
 *  tracks that second number: deposited → today (LP + wallet), and splits the
 *  difference into market move and "residual" (entry costs: swaps, slippage, mint gas).
 *  depositedUsd = amount put into play, NOT the sum of mints. */
export const TRANCHE = {
  id: 'transza-1',
  label: 'Tranche 1',
  depositedUsd: 6092,
  startedAt: '2026-08-27',
  /** network the tranche works on — the wallet is counted only there
   *  (mainnet/arbitrum hold only old dust, not part of the tranche) */
  chain: 'base' as const,
};

export const BOT_POOLS: BotPool[] = [
  {
    id: 'mainnet-usdc-weth-030',
    chainId: 1, chain: 'mainnet',
    address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
    feeBps: 3000, ethIsToken0: false, d0: 6, d1: 18, sym0: 'USDC', sym1: 'WETH',
    t0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', t1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  {
    id: 'mainnet-usdc-weth-005',
    chainId: 1, chain: 'mainnet',
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    feeBps: 500, ethIsToken0: false, d0: 6, d1: 18, sym0: 'USDC', sym1: 'WETH',
    t0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', t1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  {
    id: 'base-weth-usdc-030',
    chainId: 8453, chain: 'base',
    address: '0x6c561B446416E1A00E8E93E221854d6eA4171372',
    feeBps: 3000, ethIsToken0: true, d0: 18, d1: 6, sym0: 'WETH', sym1: 'USDC',
    t0: '0x4200000000000000000000000000000000000006', t1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    trendAction: 'hedge', // ALGORITHM v1.2: hedge-excess (gate 73%/−2.88 and 81%/−2.74)
    productIdleWidthPct: 50, // PRODUCT 27.08: FlatWide hybrid, idle ±50%
    productNarrowWidthPct: 5, // 29.08: narrowing ±5% = exit threshold (sweep: ΣEV $525 vs $195 at ±8%)
  },
  {
    // correlated pair (PAIRS.md: passive sleeve ±15%); price quoted in WETH,
    // USD via the ETH rate from base-weth-usdc-030.
    // NOTE token order VERIFIED on-chain via the live tick
    // (-265575 ⇒ token0=WETH: 0x4200… < 0xcbB7… in Uniswap's address sort order).
    // The configuration in scripts/fetch-swaps.ts has it REVERSED (token0Decimals: 8)
    // — bug reported to the queue, the 90d cbBTC data needs a refetch/reinterpretation.
    id: 'base-cbbtc-weth-005',
    chainId: 8453, chain: 'base',
    address: '0x7AeA2E8A3843516afa07293a10Ac8E49906dabD1',
    feeBps: 500, ethIsToken0: true, d0: 18, d1: 8, sym0: 'WETH', sym1: 'cbBTC',
    t0: '0x4200000000000000000000000000000000000006', t1: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    quote: 'WETH', usdRefPoolId: 'base-weth-usdc-030',
    advisorK: 2, trendReentry: 'half',
    productIdleWidthPct: 40, // PRODUCT 27.08: FlatWide hybrid, idle ±40%
    productNarrowWidthPct: 5, // 29.08: narrowing ±5% = exit threshold (sweep: ΣEV $442 vs $193 at ±8%; in-range 85-100%)
  },
  {
    // WETH/cbBTC 0.3% Base — added 2026-08-26 by review decision (DECISIONS
    // 11c): FIRST PASS of the auto-funnel (65.2% wins, worst −2.7; 23 windows
    // 30/15, profile "Adapt k=2 h=24h + trend(exit,HL7d,5%)"). PAPER ONLY —
    // PASS != capital; the verdict will be renewed after σ/k recalibration. CREATE2
    // address verified 2×: on-chain by CC-Win (25.08) and deterministically
    // by Fable (26.08). Profile like base-cbbtc-weth-005 (correlated pair).
    id: 'base-weth-cbbtc-030',
    chainId: 8453, chain: 'base',
    address: '0x8c7080564B5A792A33Ef2FD473fbA6364d5495e5',
    feeBps: 3000, ethIsToken0: true, d0: 18, d1: 8, sym0: 'WETH', sym1: 'cbBTC',
    t0: '0x4200000000000000000000000000000000000006', t1: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    quote: 'WETH', usdRefPoolId: 'base-weth-usdc-030',
    advisorK: 2, trendReentry: 'half',
  },
  {
    // Arbitrum — added 2026-08-11 after a passed 365d walk-forward
    // (re>EMA 73% wins — project record; CONTEXT ~16:15). Token order:
    // WETH 0x82aF… < USDC 0xaf88… ⇒ token0=WETH (consistent with the 365d fetch meta).
    id: 'arbitrum-weth-usdc-005',
    chainId: 42161, chain: 'arbitrum',
    address: '0xC6962004f452bE9203591991D15f6b388e09E8D0',
    feeBps: 500, ethIsToken0: true, d0: 18, d1: 6, sym0: 'WETH', sym1: 'USDC',
    t0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', t1: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
];

export const RPC: Record<string, string[]> = {
  mainnet: [
    ...(process.env.RPC_MAINNET ? [process.env.RPC_MAINNET] : []),
    'https://eth.drpc.org',
    'https://ethereum-rpc.publicnode.com',
    'https://eth.llamarpc.com',
  ],
  base: [
    ...(process.env.RPC_BASE ? [process.env.RPC_BASE] : []),
    'https://base.drpc.org',
    'https://base-rpc.publicnode.com',
    'https://base.llamarpc.com',
  ],
  arbitrum: [
    ...(process.env.RPC_ARBITRUM ? [process.env.RPC_ARBITRUM] : []),
    'https://arbitrum.drpc.org',
    'https://arbitrum-one-rpc.publicnode.com',
    'https://1rpc.io/arb',
  ],
};

export const NFT_MANAGER: Record<number, `0x${string}`> = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  8453: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  42161: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // canonical deploy = mainnet address
};

/** Wallet whose Uniswap v3 NFT positions the observer tracks. Set BOT_WATCH_ADDRESS in .env — there is no default. */
export const WATCH_ADDRESS = (process.env.BOT_WATCH_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
if (!process.env.BOT_WATCH_ADDRESS) {
  console.warn('[config] BOT_WATCH_ADDRESS is not set — the observer will track the zero address (no positions). Set it in .env.');
}

export const INTERVALS = {
  priceSec: 60, // slot0 of all pools
  statsSec: 15 * 60, // full advisor statistics (24h of swaps)
  positionsSec: 5 * 60, // NFT positions read
};

export const STATE_DIR = '.bot';
