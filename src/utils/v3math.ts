/**
 * v3math.ts — Exact Uniswap V3 math on native bigint.
 *
 * RULES (see PLAN.md / CONTEXT.md):
 *  - All on-chain quantities (sqrtPriceX96, liquidity, token amounts in raw units)
 *    are computed EXCLUSIVELY with bigint — bit-for-bit identical to the contracts.
 *  - JS `number` (float) is allowed ONLY at the display boundary
 *    (converting an exact value to a human-readable price string).
 *
 * The tick→sqrtPrice function is a direct port of TickMath.sol from v3-core.
 * The liquidity→amounts functions are direct ports of LiquidityAmounts.sol /
 * SqrtPriceMath.sol (round-down variants, i.e. what you receive on burn —
 * this is exactly what the Uniswap interface displays for a position).
 *
 * Correctness is enforced by test/v3math.test.ts which compares every function
 * against @uniswap/v3-sdk over a large randomized sample.
 */

export const Q32 = 1n << 32n;
export const Q96 = 1n << 96n;
export const Q128 = 1n << 128n;
export const Q192 = 1n << 192n;

export const MIN_TICK = -887272;
export const MAX_TICK = 887272;
export const MAX_UINT128 = (1n << 128n) - 1n;
const MAX_UINT256 = (1n << 256n) - 1n;

/**
 * Exact port of TickMath.getSqrtRatioAtTick (v3-core).
 * Returns sqrt(1.0001^tick) * 2^96 as bigint.
 */
export function getSqrtRatioAtTick(tick: number): bigint {
  const absTick = tick < 0 ? -tick : tick;
  if (absTick > MAX_TICK) throw new Error(`Tick out of bounds: ${tick}`);

  let ratio: bigint =
    (absTick & 0x1) !== 0
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n;

  if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) ratio = MAX_UINT256 / ratio;

  // Round up to Q64.96 and cast down
  return (ratio >> 32n) + (ratio % Q32 === 0n ? 0n : 1n);
}

/** amount0 received for `liquidity` between two sqrt prices (round down — burn semantics). */
export function getAmount0ForLiquidity(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint
): bigint {
  let [a, b] = sqrtRatioAX96 <= sqrtRatioBX96 ? [sqrtRatioAX96, sqrtRatioBX96] : [sqrtRatioBX96, sqrtRatioAX96];
  if (a <= 0n) throw new Error('sqrtRatio must be positive');
  // ((L << 96) * (b - a) / b) / a
  return (((liquidity << 96n) * (b - a)) / b) / a;
}

/** amount1 received for `liquidity` between two sqrt prices (round down — burn semantics). */
export function getAmount1ForLiquidity(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint
): bigint {
  let [a, b] = sqrtRatioAX96 <= sqrtRatioBX96 ? [sqrtRatioAX96, sqrtRatioBX96] : [sqrtRatioBX96, sqrtRatioAX96];
  return (liquidity * (b - a)) / Q96;
}

/**
 * Token amounts currently backing a position (what the Uniswap UI shows).
 * Exact port of LiquidityAmounts.getAmountsForLiquidity.
 */
export function getAmountsForLiquidity(
  sqrtRatioX96: bigint,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint
): { amount0: bigint; amount1: bigint } {
  const sqrtLower = getSqrtRatioAtTick(tickLower);
  const sqrtUpper = getSqrtRatioAtTick(tickUpper);

  let amount0 = 0n;
  let amount1 = 0n;

  if (sqrtRatioX96 <= sqrtLower) {
    // Current price below range → position is 100% token0
    amount0 = getAmount0ForLiquidity(sqrtLower, sqrtUpper, liquidity);
  } else if (sqrtRatioX96 < sqrtUpper) {
    // In range → split
    amount0 = getAmount0ForLiquidity(sqrtRatioX96, sqrtUpper, liquidity);
    amount1 = getAmount1ForLiquidity(sqrtLower, sqrtRatioX96, liquidity);
  } else {
    // Above range → 100% token1
    amount1 = getAmount1ForLiquidity(sqrtLower, sqrtUpper, liquidity);
  }

  return { amount0, amount1 };
}

/** Liquidity for a given amount0 between two sqrt prices (mint semantics). */
export function getLiquidityForAmount0(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount0: bigint
): bigint {
  let [a, b] = sqrtRatioAX96 <= sqrtRatioBX96 ? [sqrtRatioAX96, sqrtRatioBX96] : [sqrtRatioBX96, sqrtRatioAX96];
  const intermediate = (a * b) / Q96;
  return (amount0 * intermediate) / (b - a);
}

/** Liquidity for a given amount1 between two sqrt prices (mint semantics). */
export function getLiquidityForAmount1(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount1: bigint
): bigint {
  let [a, b] = sqrtRatioAX96 <= sqrtRatioBX96 ? [sqrtRatioAX96, sqrtRatioBX96] : [sqrtRatioBX96, sqrtRatioAX96];
  return (amount1 * Q96) / (b - a);
}

/** Exact port of LiquidityAmounts.getLiquidityForAmounts. */
export function getLiquidityForAmounts(
  sqrtRatioX96: bigint,
  tickLower: number,
  tickUpper: number,
  amount0: bigint,
  amount1: bigint
): bigint {
  const sqrtLower = getSqrtRatioAtTick(tickLower);
  const sqrtUpper = getSqrtRatioAtTick(tickUpper);

  if (sqrtRatioX96 <= sqrtLower) {
    return getLiquidityForAmount0(sqrtLower, sqrtUpper, amount0);
  } else if (sqrtRatioX96 < sqrtUpper) {
    const l0 = getLiquidityForAmount0(sqrtRatioX96, sqrtUpper, amount0);
    const l1 = getLiquidityForAmount1(sqrtLower, sqrtRatioX96, amount1);
    return l0 < l1 ? l0 : l1;
  } else {
    return getLiquidityForAmount1(sqrtLower, sqrtUpper, amount1);
  }
}

// ---------------------------------------------------------------------------
// Display boundary — float allowed from here on, computed from exact bigints.
// ---------------------------------------------------------------------------

/**
 * Human-readable price of token0 in units of token1 (token1 per token0),
 * adjusted for decimals. E.g. for mainnet USDC(6)/WETH(18) this returns
 * "WETH per USDC" (a small number ~0.0003); invert for USD per ETH.
 *
 * Precision: Number(bigint) rounds to the nearest double (relative error
 * ≤ 2^-53 ≈ 1e-16) regardless of magnitude — safe for display at any price.
 * (The legacy bug was JSBI.toNumber + a missing decimal adjustment, not
 * the float conversion itself.)
 */
export function sqrtPriceX96ToHumanPrice(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number
): number {
  const s = Number(sqrtPriceX96) / 2 ** 96; // sqrt of raw price, exact to 1 ulp
  return s * s * Math.pow(10, token0Decimals - token1Decimals);
}

/** Human price from a tick (token1 per token0, decimal-adjusted). Display only. */
export function tickToHumanPrice(
  tick: number,
  token0Decimals: number,
  token1Decimals: number
): number {
  return sqrtPriceX96ToHumanPrice(getSqrtRatioAtTick(tick), token0Decimals, token1Decimals);
}

/** Closest tick for a human price (token1 per token0, decimal-adjusted). */
export function humanPriceToTick(
  price: number,
  token0Decimals: number,
  token1Decimals: number
): number {
  // raw price = human price * 10^(dec1-dec0); tick = log_1.0001(raw)
  const rawPrice = price * Math.pow(10, token1Decimals - token0Decimals);
  return Math.round(Math.log(rawPrice) / Math.log(1.0001));
}

/**
 * Orientation helper: returns the price expressed as "quote per base"
 * (e.g. USD per ETH) regardless of token ordering in the pool.
 * `baseIsToken0` — whether the base asset (e.g. WETH) is token0.
 */
export function humanPriceQuotePerBase(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number,
  baseIsToken0: boolean
): number {
  const p = sqrtPriceX96ToHumanPrice(sqrtPriceX96, token0Decimals, token1Decimals);
  return baseIsToken0 ? p : 1 / p;
}
