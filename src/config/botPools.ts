/**
 * botPools.ts — minimal metadata for the bot's configured pools (BOT_POOLS in
 * bot/config.ts), duplicated here because bot/** is read-only for this UI
 * session (TASKS-UI.md ZAKRES TWARDY — same convention as the GAS_USD
 * duplication in useCockpitActions.ts). Keep in sync manually with
 * bot/config.ts if that list ever changes.
 *
 * Used by useCockpitActions.ts (Partia 4) to:
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
}

export const BOT_POOL_META: BotPoolMeta[] = [
  { id: 'mainnet-usdc-weth-030', chainId: 1, address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', feeBps: 3000, sym0: 'USDC', sym1: 'WETH' },
  { id: 'mainnet-usdc-weth-005', chainId: 1, address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', feeBps: 500, sym0: 'USDC', sym1: 'WETH' },
  { id: 'base-weth-usdc-030', chainId: 8453, address: '0x6c561B446416E1A00E8E93E221854d6eA4171372', feeBps: 3000, sym0: 'WETH', sym1: 'USDC' },
  // cbBTC/WETH Base 0.05% — dopisane 2026-08-11 razem z wpisem w bot/config.ts
  // (pula kwotowana w WETH; bot liczy USD przez kurs z base-weth-usdc-030)
  { id: 'base-cbbtc-weth-005', chainId: 8453, address: '0x7AeA2E8A3843516afa07293a10Ac8E49906dabD1', feeBps: 500, sym0: 'WETH', sym1: 'cbBTC' },
  // Arbitrum WETH/USDC 0.05% — dopisane 2026-08-11 razem z wpisem w bot/config.ts
  // (walk-forward pass; USDC natywny 0xaf88…5831)
  { id: 'arbitrum-weth-usdc-005', chainId: 42161, address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', feeBps: 500, sym0: 'WETH', sym1: 'USDC' },
];

export const findBotPoolByAddress = (chainId: number, address: string): BotPoolMeta | undefined =>
  BOT_POOL_META.find((b) => b.chainId === chainId && b.address.toLowerCase() === address.toLowerCase());

export const findBotPoolById = (id: string): BotPoolMeta | undefined => BOT_POOL_META.find((b) => b.id === id);
