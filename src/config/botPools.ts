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
  /** Override mnożnika k doradcy dla tej puli — powielone z BotPool.advisorK
   *  (bot/config.ts), ta sama konwencja duplikacji co reszta tego pliku.
   *  ALGORITHM v1.1: ETH/stable k=3 (domyślne z utils/advisor.ts
   *  ADVISOR_PARAMS), pary skorelowane (cbBTC/WETH) k=2 — bot gra ten
   *  zamrożony profil v1.2 na żywo; UI liczyło swoją "Doradca" sugestię
   *  zawsze z globalnym k=3, bo nic dotąd nie czytało tego pola tutaj
   *  (SPÓJNOŚĆ PROGNOZY cbBTC, HANDOFF Fable→Sonnet 26.08/28.08 rano —
   *  fix w usePortfolio.ts, jedyny call site suggestRange/assessPosition). */
  advisorK?: number;
  /** Partia 17: szerokość postury "wide" (idle) produktu FlatWide — powielone
   *  z BotPool.productIdleWidthPct (bot/config.ts). Ustawione TYLKO na pulach
   *  produktowych (dziś: base-weth-usdc-030=50, base-cbbtc-weth-005=40) —
   *  `undefined` gdzie indziej = pula nie-produktowa, karta nie ma linii
   *  CYKLU (feature-detect, spójne z BotWatchedPosition.posture w
   *  useBotApi.ts, który jest tym samym sygnałem od strony bota). */
  productIdleWidthPct?: number;
}

export const BOT_POOL_META: BotPoolMeta[] = [
  { id: 'mainnet-usdc-weth-030', chainId: 1, address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', feeBps: 3000, sym0: 'USDC', sym1: 'WETH' },
  { id: 'mainnet-usdc-weth-005', chainId: 1, address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', feeBps: 500, sym0: 'USDC', sym1: 'WETH' },
  // productIdleWidthPct=50: pula produktowa (hybryda FlatWide, bot/config.ts
  // BOT_POOLS['base-weth-usdc-030'].productIdleWidthPct) — Partia 17 linia CYKLU.
  { id: 'base-weth-usdc-030', chainId: 8453, address: '0x6c561B446416E1A00E8E93E221854d6eA4171372', feeBps: 3000, sym0: 'WETH', sym1: 'USDC', productIdleWidthPct: 50 },
  // cbBTC/WETH Base 0.05% — dopisane 2026-08-11 razem z wpisem w bot/config.ts
  // (pula kwotowana w WETH; bot liczy USD przez kurs z base-weth-usdc-030)
  // productIdleWidthPct=40: druga pula produktowa (Partia 17 linia CYKLU).
  { id: 'base-cbbtc-weth-005', chainId: 8453, address: '0x7AeA2E8A3843516afa07293a10Ac8E49906dabD1', feeBps: 500, sym0: 'WETH', sym1: 'cbBTC', advisorK: 2, productIdleWidthPct: 40 },
  // WETH/cbBTC Base 0.3% — dopisane 2026-08-26 (przegląd: pierwszy PASS
  // auto-lejka → BOT_POOLS jako paper) razem z wpisem w bot/config.ts
  { id: 'base-weth-cbbtc-030', chainId: 8453, address: '0x8c7080564B5A792A33Ef2FD473fbA6364d5495e5', feeBps: 3000, sym0: 'WETH', sym1: 'cbBTC', advisorK: 2 },
  // Arbitrum WETH/USDC 0.05% — dopisane 2026-08-11 razem z wpisem w bot/config.ts
  // (walk-forward pass; USDC natywny 0xaf88…5831)
  { id: 'arbitrum-weth-usdc-005', chainId: 42161, address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', feeBps: 500, sym0: 'WETH', sym1: 'USDC' },
];

export const findBotPoolByAddress = (chainId: number, address: string): BotPoolMeta | undefined =>
  BOT_POOL_META.find((b) => b.chainId === chainId && b.address.toLowerCase() === address.toLowerCase());

export const findBotPoolById = (id: string): BotPoolMeta | undefined => BOT_POOL_META.find((b) => b.id === id);
