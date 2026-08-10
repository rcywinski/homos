/**
 * liquidityManagement.ts — v2 (Phase 0 rewrite)
 *
 * All position math now goes through @uniswap/v3-sdk (Position.fromAmounts etc.)
 * or the exact bigint helpers in ./v3math. The legacy float implementation
 * (hand-rolled liquidity formulas, 20–25% slippage hacks, arbitrary caps)
 * has been removed — see PLAN.md §2 for the post-mortem.
 *
 * Public API is kept compatible with the existing components.
 */
import { Pool, Position, nearestUsableTick } from '@uniswap/v3-sdk';
import { Percent, Fraction } from '@uniswap/sdk-core';
import {
  parseUnits,
  formatUnits,
  encodeFunctionData,
  Address,
  TransactionRequest,
} from 'viem';
import {
  tickToHumanPrice,
  humanPriceToTick,
  MIN_TICK,
  MAX_TICK,
} from './v3math';

// ---------------------------------------------------------------------------
// Price <-> tick helpers (display layer)
// ---------------------------------------------------------------------------

/** Human price (token1 per token0, decimal-adjusted) for a tick. */
export const tickToPrice = (
  tick: number,
  token0Decimals: number,
  token1Decimals: number
): number => tickToHumanPrice(tick, token0Decimals, token1Decimals);

/** Closest tick for a human price (token1 per token0, decimal-adjusted). */
export const priceToTick = (
  price: number,
  token0Decimals: number,
  token1Decimals: number
): number => humanPriceToTick(price, token0Decimals, token1Decimals);

/** Nearest initializable tick for the pool's tick spacing. */
export const getValidTick = (tick: number, tickSpacing: number): number =>
  nearestUsableTick(tick, tickSpacing);

/** Formats a tick as a readable price string. */
export const formatTickPrice = (
  tick: number,
  token0Symbol: string,
  token1Symbol: string,
  token0Decimals: number,
  token1Decimals: number
): string => {
  const price = tickToPrice(tick, token0Decimals, token1Decimals);
  return `${price.toFixed(2)} ${token1Symbol} per ${token0Symbol}`;
};

// ---------------------------------------------------------------------------
// Position construction — delegated to the SDK (identical to app.uniswap.org)
// ---------------------------------------------------------------------------

/**
 * Creates an SDK Position from human-readable amounts.
 * The SDK computes liquidity and mint amounts with exact integer math —
 * results match the Uniswap interface 1:1.
 */
export const createPosition = (
  pool: Pool,
  lowerTick: number,
  upperTick: number,
  amount0: string,
  amount1: string
): Position => {
  const raw0 = parseUnits((amount0 || '0') as `${number}`, pool.token0.decimals);
  const raw1 = parseUnits((amount1 || '0') as `${number}`, pool.token1.decimals);

  return Position.fromAmounts({
    pool,
    tickLower: lowerTick,
    tickUpper: upperTick,
    amount0: raw0.toString(),
    amount1: raw1.toString(),
    useFullPrecision: true,
  });
};

/**
 * Given one amount, computes the exact counterpart amount for the range
 * (what the Uniswap UI auto-fills in the second input).
 */
export const calculateOptimalAmounts = (
  pool: Pool,
  lowerTick: number,
  upperTick: number,
  amount0?: string,
  amount1?: string
): { amount0: string; amount1: string } => {
  if (!amount0 && !amount1) {
    throw new Error('At least one token amount must be provided');
  }

  if (amount0 && !amount1) {
    const raw0 = parseUnits(amount0 as `${number}`, pool.token0.decimals);
    const pos = Position.fromAmount0({
      pool,
      tickLower: lowerTick,
      tickUpper: upperTick,
      amount0: raw0.toString(),
      useFullPrecision: true,
    });
    return {
      amount0,
      amount1: formatUnits(BigInt(pos.mintAmounts.amount1.toString()), pool.token1.decimals),
    };
  }

  if (!amount0 && amount1) {
    const raw1 = parseUnits(amount1 as `${number}`, pool.token1.decimals);
    const pos = Position.fromAmount1({
      pool,
      tickLower: lowerTick,
      tickUpper: upperTick,
      amount1: raw1.toString(),
    });
    return {
      amount0: formatUnits(BigInt(pos.mintAmounts.amount0.toString()), pool.token0.decimals),
      amount1: amount1!,
    };
  }

  // Both provided: recompute amount1 from amount0 so the pair is consistent.
  const raw0 = parseUnits(amount0 as `${number}`, pool.token0.decimals);
  const pos = Position.fromAmount0({
    pool,
    tickLower: lowerTick,
    tickUpper: upperTick,
    amount0: raw0.toString(),
    useFullPrecision: true,
  });
  return {
    amount0: amount0!,
    amount1: formatUnits(BigInt(pos.mintAmounts.amount1.toString()), pool.token1.decimals),
  };
};

// ---------------------------------------------------------------------------
// Transaction preparation
// ---------------------------------------------------------------------------

export const POSITION_MANAGER_ADDRESSES: Record<number, string> = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // mainnet
  11155111: '0x1238536071E1c677A632429e3655c799b22cDA52', // sepolia
  42161: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // arbitrum
  8453: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1', // base
};

const MINT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'amount0Desired', type: 'uint256' },
          { name: 'amount1Desired', type: 'uint256' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

const DECREASE_LIQUIDITY_ABI = [
  {
    name: 'decreaseLiquidity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'liquidity', type: 'uint128' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

/**
 * Prepares calldata for NonfungiblePositionManager.mint.
 * @param slippageToleranceBips slippage in basis points (50 = 0.5%).
 *        No pair-specific overrides: with correct math USDC/WETH mints fine
 *        at 0.5%. (The legacy 20–25% "USDC/WETH hack" masked broken amounts.)
 */
export function prepareAddLiquidityTransaction(
  position: Position,
  slippageToleranceBips: number,
  deadlineSeconds: number,
  chainId: number,
  recipient: Address
): TransactionRequest {
  const positionManagerAddress = POSITION_MANAGER_ADDRESSES[chainId] as Address | undefined;
  if (!positionManagerAddress) throw new Error(`Unsupported chain: ${chainId}`);
  if (!recipient) throw new Error('Recipient address is required');

  // Clamp to a sane window: 0.05% .. 5%
  const bips = Math.min(Math.max(Math.round(slippageToleranceBips), 5), 500);
  const slippagePercent = new Percent(bips, 10_000);

  const { amount0: amount0Min, amount1: amount1Min } =
    position.mintAmountsWithSlippage(slippagePercent);

  const mintParams = {
    token0: position.pool.token0.address as Address,
    token1: position.pool.token1.address as Address,
    fee: position.pool.fee,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    amount0Desired: BigInt(position.mintAmounts.amount0.toString()),
    amount1Desired: BigInt(position.mintAmounts.amount1.toString()),
    amount0Min: BigInt(amount0Min.toString()),
    amount1Min: BigInt(amount1Min.toString()),
    recipient,
    deadline: BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds),
  };

  const data = encodeFunctionData({
    abi: MINT_ABI,
    functionName: 'mint',
    args: [mintParams],
  });

  return { to: positionManagerAddress, data, value: BigInt(0) };
}

/**
 * Prepares calldata for NonfungiblePositionManager.decreaseLiquidity.
 * @param slippageTolerancePercent slippage as percent (0.5 = 0.5%).
 */
export const prepareRemoveLiquidityTransaction = async (
  tokenId: string,
  liquidity: string,
  slippageTolerancePercent: number,
  deadlineSeconds: number,
  chainId: number,
  positionDetails?: {
    pool: Pool;
    tickLower: number;
    tickUpper: number;
  }
) => {
  const positionManagerAddress = POSITION_MANAGER_ADDRESSES[chainId] as Address | undefined;
  if (!positionManagerAddress) throw new Error(`Unsupported chain: ${chainId}`);

  let amount0Min = BigInt(0);
  let amount1Min = BigInt(0);

  if (positionDetails) {
    // Exact expected amounts from the SDK, reduced by slippage tolerance.
    const position = new Position({
      pool: positionDetails.pool,
      tickLower: positionDetails.tickLower,
      tickUpper: positionDetails.tickUpper,
      liquidity: liquidity,
    });

    const bips = Math.min(Math.max(Math.round(slippageTolerancePercent * 100), 5), 500);
    const keep = new Fraction(10_000 - bips, 10_000);

    amount0Min = BigInt(position.amount0.multiply(keep).quotient.toString());
    amount1Min = BigInt(position.amount1.multiply(keep).quotient.toString());
  }

  const params = {
    tokenId: BigInt(tokenId),
    liquidity: BigInt(liquidity),
    amount0Min,
    amount1Min,
    deadline: BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds),
  };

  const calldata = encodeFunctionData({
    abi: DECREASE_LIQUIDITY_ABI,
    functionName: 'decreaseLiquidity',
    args: [params],
  });

  return {
    to: positionManagerAddress as Address,
    data: calldata,
    value: '0',
  };
};

// Kept for compatibility with existing imports.
export const TickMath = {
  MIN_TICK,
  MAX_TICK,
};
