/**
 * botPools.ts — minimal metadata for the bot's configured pools (BOT_POOLS in
 * bot/config.ts), duplicated here because bot/** is read-only for this UI
 * session (TASKS-UI.md HARD SCOPE — same convention as the GAS_USD
 * duplication in useCockpitActions.ts). Keep in sync manually with
 * bot/config.ts if that list ever changes.
 *
 * Used by useCockpitActions.ts (Batch 4) to:
 *  - map a held PortfolioPosition's poolAddress → bot pool id, so the
 *    rebalance modal can fall back to the bot's live suggestion when the
 *    frontend advisor has none (findBotPoolByAddress);
 *  - resolve an on-chain Pool/token pair for a bot proposal's poolId when the
 *    user has no existing position there yet — OPEN / ROTATE step 2
 *    (findBotPoolById, used together with OBSERVED_PAIRS for token instances).
 */
import { Address } from 'viem';

export interface BotPoolMeta {
  id: string;
  chainId: number;
  address: Address;
  feeBps: number;
  sym0: string;
  sym1: string;
  /** Override of the advisor multiplier k for this pool — duplicated from BotPool.advisorK
   *  (bot/config.ts), the same duplication convention as the rest of this file.
   *  ALGORITHM v1.1: ETH/stable k=3 (default from utils/advisor.ts
   *  ADVISOR_PARAMS), correlated pairs (cbBTC/WETH) k=2 — the bot plays this
   *  frozen v1.2 profile live; the UI computed its "Advisor" suggestion
   *  always with the global k=3, because nothing here read this field until now
   *  (cbBTC FORECAST CONSISTENCY, HANDOFF Fable→Sonnet 26.08/28.08 morning —
   *  fix in usePortfolio.ts, the only call site of suggestRange/assessPosition). */
  advisorK?: number;
  /** Batch 17: width of the "wide" (idle) posture of the FlatWide product — duplicated
   *  from BotPool.productIdleWidthPct (bot/config.ts). Set ONLY on product
   *  pools (today: base-weth-usdc-030=50, base-cbbtc-weth-005=40) —
   *  `undefined` elsewhere = non-product pool, the card has no CYCLE
   *  line (feature-detect, consistent with BotWatchedPosition.posture in
   *  useBotApi.ts, which is the same signal from the bot side). */
  productIdleWidthPct?: number;
}

export const BOT_POOL_META: BotPoolMeta[] = [
  { id: 'mainnet-usdc-weth-030', chainId: 1, address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', feeBps: 3000, sym0: 'USDC', sym1: 'WETH' },
  { id: 'mainnet-usdc-weth-005', chainId: 1, address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', feeBps: 500, sym0: 'USDC', sym1: 'WETH' },
  // productIdleWidthPct=50: product pool (FlatWide hybrid, bot/config.ts
  // BOT_POOLS['base-weth-usdc-030'].productIdleWidthPct) — Batch 17 CYCLE line.
  { id: 'base-weth-usdc-030', chainId: 8453, address: '0x6c561B446416E1A00E8E93E221854d6eA4171372', feeBps: 3000, sym0: 'WETH', sym1: 'USDC', productIdleWidthPct: 50 },
  // cbBTC/WETH Base 0.05% — added 2026-08-11 together with the entry in bot/config.ts
  // (pool quoted in WETH; the bot computes USD via the price from base-weth-usdc-030)
  // productIdleWidthPct=40: second product pool (Batch 17 CYCLE line).
  { id: 'base-cbbtc-weth-005', chainId: 8453, address: '0x7AeA2E8A3843516afa07293a10Ac8E49906dabD1', feeBps: 500, sym0: 'WETH', sym1: 'cbBTC', advisorK: 2, productIdleWidthPct: 40 },
  // WETH/cbBTC Base 0.3% — added 2026-08-26 (review: first PASS of the
  // auto-funnel → BOT_POOLS as paper) together with the entry in bot/config.ts
  { id: 'base-weth-cbbtc-030', chainId: 8453, address: '0x8c7080564B5A792A33Ef2FD473fbA6364d5495e5', feeBps: 3000, sym0: 'WETH', sym1: 'cbBTC', advisorK: 2 },
  // Arbitrum WETH/USDC 0.05% — added 2026-08-11 together with the entry in bot/config.ts
  // (walk-forward pass; native USDC 0xaf88…5831)
  { id: 'arbitrum-weth-usdc-005', chainId: 42161, address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', feeBps: 500, sym0: 'WETH', sym1: 'USDC' },
];

export const findBotPoolByAddress = (chainId: number, address: string): BotPoolMeta | undefined =>
  BOT_POOL_META.find((b) => b.chainId === chainId && b.address.toLowerCase() === address.toLowerCase());

export const findBotPoolById = (id: string): BotPoolMeta | undefined => BOT_POOL_META.find((b) => b.id === id);
