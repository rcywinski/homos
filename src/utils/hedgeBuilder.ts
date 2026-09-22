/**
 * hedgeBuilder.ts — transaction plan for a SHORT ETH-perp hedge on GMX v2 (Arbitrum).
 * Step 2 of the hedge automation plan (RESEARCH-QUEUE H, accepted in principle
 * 17.08; owner's brief 20.08): [Confirm hedge] in the cockpit = ONE signature
 * in Rabby (ExchangeRouter multicall), size from the bot's HEDGE proposal, 1×,
 * slippage limits. Closing the short with an analogous multicall (MarketDecrease).
 *
 * GMX v2 MECHANICS (synthetics): orders are TWO-PHASE — we create the order
 * (createOrder) and deposit collateral + execution fee into the OrderVault, and the GMX
 * keeper executes it in the next block at the oracle price. Hence:
 *  - acceptablePrice = our slippage limit (the keeper will not execute worse),
 *  - executionFee = ETH for the keeper (the overpayment returns to the wallet),
 *  - ONE multicall: [sendWnt(fee), sendTokens(collateral), createOrder] —
 *    the transfer and createOrder MUST be in one tx (otherwise the funds in the vault
 *    can be claimed by someone else — an explicit warning from the GMX docs).
 *
 * SOURCES (verified 2026-08-20 by Fable):
 *  - addresses: gmx-synthetics/docs/contracts.json (section "arbitrum") — commit
 *    current as of 20.08; OrderVault and Router consistent with earlier knowledge,
 *    ExchangeRouter is the LATEST deploy (the address changes between versions!),
 *  - ETH/USD market: live API https://arbitrum-api.gmxinfra.io/markets
 *    (indexToken=WETH, shortToken=native USDC),
 *  - struct CreateOrderParams: contracts/order/IBaseOrderUtils.sol @ main
 *    (version with cancellationReceiver/validFromTime/autoCancel/dataList).
 *
 * GMX v2 UNIT CONVENTIONS (easy to get wrong):
 *  - sizeDeltaUsd: USD × 1e30,
 *  - prices (triggerPrice/acceptablePrice): USD per 1 unit of the index token
 *    × 10^(30 − index_decimals) → for ETH (18 dec) = USD × 1e12,
 *  - collateral (USDC): raw 6 dec,
 *  - executionFee: wei (native ETH via sendWnt).
 *
 * SAFETY (project rules): the module ONLY builds the tx — sending goes through
 * Rabby after an EXPLICIT human click; before sending, the hook MUST run an
 * eth_call simulation (as in rebalanceBuilder) — the struct ABI is then verified
 * against the live contract; the first real test on a MINIMAL amount (~$15,
 * GMX min size ~$11 collateral at 1×).
 */
import { Address, Hex, encodeFunctionData, erc20Abi } from 'viem';

// --- addresses (Arbitrum One, chainId 42161) ---
export const GMX_ARBITRUM = {
  chainId: 42161,
  /** LATEST ExchangeRouter (contracts.json 20.08) — after a GMX update
   *  ONLY this address needs replacing (vault/router/market are stable) */
  exchangeRouter: '0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41' as Address,
  orderVault: '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5' as Address,
  /** spender for the USDC approve (Router, NOT ExchangeRouter!) */
  router: '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6' as Address,
  /** ETH/USD market [ETH-USDC] — marketToken */
  ethUsdMarket: '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336' as Address,
  usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address, // native USDC
  weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address,
  // position read (bot/observer tracks the real hedge — added 20.08 after
  // the E2E test, when it turned out the short was not visible anywhere outside GMX):
  reader: '0x470fbC46bcC0f16532691Df360A07d8Bf5ee0789' as Address,
  dataStore: '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8' as Address,
} as const;

/** default keeper fee; the overpayment returns — better to leave headroom than get stuck.
 *  The UI may override (reading the estimate from DataStore is a future improvement). */
export const DEFAULT_EXECUTION_FEE_WEI = 700_000_000_000_000n; // 0.0007 ETH

// Order.OrderType (gmx-synthetics Order.sol)
export const ORDER_TYPE = { MarketIncrease: 2, MarketDecrease: 4 } as const;
// DecreasePositionSwapType: 1 = pay out PnL in the collateral token (USDC)
const SWAP_PNL_TO_COLLATERAL = 1;

// NOTE: do NOT use `**` on BigInts — babel (transform-exponentiation-operator)
// transpiles `**` to `Math.pow()` without distinguishing operand types, and
// `Math.pow(10n, 30n)` throws "Cannot convert a BigInt value to a number" at
// runtime (build/tsc does not catch it — it fails only in the browser). The same
// bug was already fixed once elsewhere (CC-Win build, P7) — literals
// instead of `**` are immune to the problem's return here.
const USD_1E30 = 1_000_000_000_000_000_000_000_000_000_000n; // 10n ** 30n
const PRICE_1E12 = 1_000_000_000_000n; // 10n ** 12n, for an 18 dec index: 30-18

// --- ABI (only the ExchangeRouter functions in use) ---
const EXCHANGE_ROUTER_ABI = [
  {
    name: 'multicall', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
  {
    name: 'sendWnt', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'receiver', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'sendTokens', type: 'function', stateMutability: 'payable',
    inputs: [
      { name: 'token', type: 'address' }, { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'createOrder', type: 'function', stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        {
          name: 'addresses', type: 'tuple', components: [
            { name: 'receiver', type: 'address' },
            { name: 'cancellationReceiver', type: 'address' },
            { name: 'callbackContract', type: 'address' },
            { name: 'uiFeeReceiver', type: 'address' },
            { name: 'market', type: 'address' },
            { name: 'initialCollateralToken', type: 'address' },
            { name: 'swapPath', type: 'address[]' },
          ],
        },
        {
          name: 'numbers', type: 'tuple', components: [
            { name: 'sizeDeltaUsd', type: 'uint256' },
            { name: 'initialCollateralDeltaAmount', type: 'uint256' },
            { name: 'triggerPrice', type: 'uint256' },
            { name: 'acceptablePrice', type: 'uint256' },
            { name: 'executionFee', type: 'uint256' },
            { name: 'callbackGasLimit', type: 'uint256' },
            { name: 'minOutputAmount', type: 'uint256' },
            { name: 'validFromTime', type: 'uint256' },
          ],
        },
        { name: 'orderType', type: 'uint8' },
        { name: 'decreasePositionSwapType', type: 'uint8' },
        { name: 'isLong', type: 'bool' },
        { name: 'shouldUnwrapNativeToken', type: 'bool' },
        { name: 'autoCancel', type: 'bool' },
        { name: 'referralCode', type: 'bytes32' },
        { name: 'dataList', type: 'bytes32[]' },
      ],
    }],
    outputs: [{ name: 'key', type: 'bytes32' }],
  },
] as const;

const ZERO = '0x0000000000000000000000000000000000000000' as Address;
const ZERO32 = `0x${'0'.repeat(64)}` as Hex;

export interface HedgeTx { to: Address; data: Hex; value: bigint }
export interface HedgePlan {
  chainId: number;
  /** multicall to sign (value = executionFee in ETH) */
  tx: HedgeTx;
  /** approve USDC→Router, if the allowance is insufficient (the UI compares) */
  approval: { token: Address; spender: Address; amount: bigint; tx: HedgeTx } | null;
  summary: string;
  preview: {
    direction: 'open-short' | 'close-short';
    sizeEth: number; sizeUsd: number;
    collateralUsdc: number; leverage: number;
    acceptablePriceUsd: number; executionFeeEth: number;
  };
}

const raw6 = (usd: number): bigint => BigInt(Math.round(usd * 1e6));

function buildCreateOrderCall(p: {
  recipient: Address;
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
  acceptablePrice: bigint;
  executionFee: bigint;
  orderType: number;
  decreaseSwapType: number;
}): Hex {
  return encodeFunctionData({
    abi: EXCHANGE_ROUTER_ABI, functionName: 'createOrder',
    args: [{
      addresses: {
        receiver: p.recipient, cancellationReceiver: p.recipient,
        callbackContract: ZERO, uiFeeReceiver: ZERO,
        market: GMX_ARBITRUM.ethUsdMarket,
        initialCollateralToken: GMX_ARBITRUM.usdc,
        swapPath: [],
      },
      numbers: {
        sizeDeltaUsd: p.sizeDeltaUsd,
        initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
        triggerPrice: 0n, // market order
        acceptablePrice: p.acceptablePrice,
        executionFee: p.executionFee,
        callbackGasLimit: 0n,
        minOutputAmount: 0n,
        validFromTime: 0n,
      },
      orderType: p.orderType,
      decreasePositionSwapType: p.decreaseSwapType,
      isLong: false, // always short — this hedges the ETH excess
      shouldUnwrapNativeToken: false,
      autoCancel: false,
      referralCode: ZERO32,
      dataList: [],
    }],
  });
}

/**
 * OPENING a 1× short (hedge-excess from the bot's proposal).
 * `sizeEth` — from the HEDGE proposal (ETH excess >50% of the position value);
 * `ethPriceUsd` — current price (from the pool/observer); USDC collateral ≈ notional
 * (1×; GMX computes leverage from size/collateral).
 */
export function planHedgeOpen(params: {
  sizeEth: number;
  ethPriceUsd: number;
  recipient: Address;
  slippageBps?: number;       // default 30 bps
  executionFeeWei?: bigint;   // default DEFAULT_EXECUTION_FEE_WEI
  /** collateral in USD; default = notional (1× leverage) */
  collateralUsd?: number;
}): HedgePlan {
  const { sizeEth, ethPriceUsd, recipient } = params;
  if (!(sizeEth > 0) || !(ethPriceUsd > 0)) throw new Error('planHedgeOpen: sizeEth and ethPriceUsd must be > 0');
  const bips = Math.min(Math.max(Math.round(params.slippageBps ?? 30), 5), 300);
  const fee = params.executionFeeWei ?? DEFAULT_EXECUTION_FEE_WEI;
  const sizeUsd = sizeEth * ethPriceUsd;
  const collateralUsd = params.collateralUsd ?? sizeUsd; // 1×
  if (sizeUsd < 11) throw new Error(`planHedgeOpen: notional $${sizeUsd.toFixed(2)} below the GMX minimum (~$11)`);
  const collateralRaw = raw6(collateralUsd);
  const sizeDeltaUsd = BigInt(Math.round(sizeUsd * 1e6)) * (USD_1E30 / 1_000_000n);
  // short increase: execution at a price LOWER than acceptable is OK,
  // acceptable = lower limit of the entry price
  const acceptable = BigInt(Math.round(ethPriceUsd * (1 - bips / 10_000) * 1e6)) * (PRICE_1E12 / 1_000_000n);

  const calls: Hex[] = [
    encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'sendWnt', args: [GMX_ARBITRUM.orderVault, fee] }),
    encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'sendTokens', args: [GMX_ARBITRUM.usdc, GMX_ARBITRUM.orderVault, collateralRaw] }),
    buildCreateOrderCall({
      recipient, sizeDeltaUsd, initialCollateralDeltaAmount: collateralRaw,
      acceptablePrice: acceptable, executionFee: fee,
      orderType: ORDER_TYPE.MarketIncrease, decreaseSwapType: 0,
    }),
  ];
  return {
    chainId: GMX_ARBITRUM.chainId,
    tx: {
      to: GMX_ARBITRUM.exchangeRouter,
      data: encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'multicall', args: [calls] }),
      value: fee,
    },
    approval: {
      token: GMX_ARBITRUM.usdc, spender: GMX_ARBITRUM.router, amount: collateralRaw,
      tx: {
        to: GMX_ARBITRUM.usdc,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [GMX_ARBITRUM.router, collateralRaw] }),
        value: 0n,
      },
    },
    summary: `SHORT ${sizeEth.toFixed(4)} ETH (~$${sizeUsd.toFixed(0)}) @ 1× on GMX ETH/USD; collateral ${collateralUsd.toFixed(0)} USDC; acceptable ≥ $${(ethPriceUsd * (1 - bips / 10_000)).toFixed(2)}`,
    preview: {
      direction: 'open-short', sizeEth, sizeUsd,
      collateralUsdc: collateralUsd, leverage: sizeUsd / collateralUsd,
      acceptablePriceUsd: ethPriceUsd * (1 - bips / 10_000),
      executionFeeEth: Number(fee) / 1e18,
    },
  };
}

/**
 * CLOSING the short (after the trend signal fades). `sizeUsd`/`collateralUsd`
 * — from the open position (UI: reading from the GMX Reader is a future improvement;
 * until then, values from the close proposal / saved state).
 * PnL paid out in USDC (decreasePositionSwapType=1).
 */
export function planHedgeClose(params: {
  sizeUsd: number;
  collateralUsd: number;
  ethPriceUsd: number;
  recipient: Address;
  slippageBps?: number;
  executionFeeWei?: bigint;
}): HedgePlan {
  const { sizeUsd, collateralUsd, ethPriceUsd, recipient } = params;
  if (!(sizeUsd > 0) || !(ethPriceUsd > 0)) throw new Error('planHedgeClose: sizeUsd and ethPriceUsd must be > 0');
  const bips = Math.min(Math.max(Math.round(params.slippageBps ?? 30), 5), 300);
  const fee = params.executionFeeWei ?? DEFAULT_EXECUTION_FEE_WEI;
  const sizeDeltaUsd = BigInt(Math.round(sizeUsd * 1e6)) * (USD_1E30 / 1_000_000n);
  const collateralRaw = raw6(collateralUsd);
  // short decrease (buyback): execution at a price HIGHER than acceptable = a loss
  // beyond the limit — acceptable is the upper limit of the buyback price
  const acceptable = BigInt(Math.round(ethPriceUsd * (1 + bips / 10_000) * 1e6)) * (PRICE_1E12 / 1_000_000n);

  const calls: Hex[] = [
    encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'sendWnt', args: [GMX_ARBITRUM.orderVault, fee] }),
    buildCreateOrderCall({
      recipient, sizeDeltaUsd, initialCollateralDeltaAmount: collateralRaw,
      acceptablePrice: acceptable, executionFee: fee,
      orderType: ORDER_TYPE.MarketDecrease, decreaseSwapType: SWAP_PNL_TO_COLLATERAL,
    }),
  ];
  return {
    chainId: GMX_ARBITRUM.chainId,
    tx: {
      to: GMX_ARBITRUM.exchangeRouter,
      data: encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'multicall', args: [calls] }),
      value: fee,
    },
    approval: null, // closing does not deposit collateral
    summary: `CLOSE short ~$${sizeUsd.toFixed(0)} on GMX ETH/USD; acceptable ≤ $${(ethPriceUsd * (1 + bips / 10_000)).toFixed(2)}; PnL in USDC`,
    preview: {
      direction: 'close-short', sizeEth: sizeUsd / ethPriceUsd, sizeUsd,
      collateralUsdc: collateralUsd, leverage: sizeUsd / Math.max(collateralUsd, 1e-9),
      acceptablePriceUsd: ethPriceUsd * (1 + bips / 10_000),
      executionFeeEth: Number(fee) / 1e18,
    },
  };
}
