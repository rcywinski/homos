/**
 * Reference tests: our bigint math MUST be bit-for-bit identical to
 * @uniswap/v3-sdk (the exact code app.uniswap.org uses).
 * Run: npx tsx test/v3math.test.ts
 */
import { TickMath, Position, Pool, FeeAmount, nearestUsableTick, TICK_SPACINGS } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';

import {
  getSqrtRatioAtTick,
  getAmountsForLiquidity,
  getLiquidityForAmounts,
  sqrtPriceX96ToHumanPrice,
  tickToHumanPrice,
  humanPriceToTick,
  MIN_TICK,
  MAX_TICK,
} from '../src/utils/v3math';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// Deterministic PRNG (no Math.random in CI for reproducibility)
let seed = 123456789;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

// ---------------------------------------------------------------------------
// 1. getSqrtRatioAtTick vs SDK TickMath — dense + random sample + edges
// ---------------------------------------------------------------------------
const tickSamples: number[] = [MIN_TICK, -887200, -500000, -200000, -100000, -1000, -1, 0, 1, 1000,
  100000, 194000, 198060, 200000, 202140, 500000, 887200, MAX_TICK];
for (let i = 0; i < 2000; i++) tickSamples.push(Math.floor((rnd() * 2 - 1) * MAX_TICK));

for (const t of tickSamples) {
  const ours = getSqrtRatioAtTick(t);
  const sdk = BigInt(TickMath.getSqrtRatioAtTick(t).toString());
  check(`getSqrtRatioAtTick(${t})`, ours === sdk, `ours=${ours} sdk=${sdk}`);
}

// ---------------------------------------------------------------------------
// 2. Position amounts vs SDK Position (USDC/WETH mainnet-like pool)
// ---------------------------------------------------------------------------
const USDC = new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC');
const WETH = new Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH');

for (let i = 0; i < 300; i++) {
  const fee = [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH][Math.floor(rnd() * 3)];
  const spacing = TICK_SPACINGS[fee];
  // current tick anywhere in a plausible USDC/WETH band
  const currentTick = Math.floor(190000 + rnd() * 20000);
  const sqrtPriceX96 = getSqrtRatioAtTick(currentTick);
  const liquidity = BigInt(Math.floor(rnd() * 1e15)) + 10n ** BigInt(Math.floor(rnd() * 8) + 6);

  // random range around (or off to one side of) current tick
  const lo = nearestUsableTick(currentTick + Math.floor((rnd() * 2 - 1.5) * 8000), spacing);
  const hi = nearestUsableTick(lo + spacing * (1 + Math.floor(rnd() * 200)), spacing);
  if (lo >= hi) continue;

  const pool = new Pool(USDC, WETH, fee, sqrtPriceX96.toString() as any, '1000000000000' as any, currentTick);
  const sdkPos = new Position({ pool, tickLower: lo, tickUpper: hi, liquidity: liquidity.toString() as any });

  const ours = getAmountsForLiquidity(sqrtPriceX96, lo, hi, liquidity);
  const sdk0 = BigInt(sdkPos.amount0.quotient.toString());
  const sdk1 = BigInt(sdkPos.amount1.quotient.toString());

  check(`amounts L=${liquidity} [${lo},${hi}] @${currentTick} amount0`, ours.amount0 === sdk0, `ours=${ours.amount0} sdk=${sdk0}`);
  check(`amounts L=${liquidity} [${lo},${hi}] @${currentTick} amount1`, ours.amount1 === sdk1, `ours=${ours.amount1} sdk=${sdk1}`);
}

// ---------------------------------------------------------------------------
// 3. getLiquidityForAmounts vs SDK Position.fromAmounts
// ---------------------------------------------------------------------------
for (let i = 0; i < 300; i++) {
  const fee = FeeAmount.MEDIUM;
  const spacing = TICK_SPACINGS[fee];
  const currentTick = Math.floor(190000 + rnd() * 20000);
  const sqrtPriceX96 = getSqrtRatioAtTick(currentTick);
  const lo = nearestUsableTick(currentTick - Math.floor(rnd() * 6000) - spacing, spacing);
  const hi = nearestUsableTick(currentTick + Math.floor(rnd() * 6000) + spacing, spacing);
  const amount0 = BigInt(Math.floor(rnd() * 5000e6)); // up to 5000 USDC
  const amount1 = BigInt(Math.floor(rnd() * 3e18));   // up to 3 WETH

  const pool = new Pool(USDC, WETH, fee, sqrtPriceX96.toString() as any, '1000000000000' as any, currentTick);
  const sdkPos = Position.fromAmounts({
    pool, tickLower: lo, tickUpper: hi,
    amount0: amount0.toString() as any,
    amount1: amount1.toString() as any,
    useFullPrecision: true,
  });

  const ours = getLiquidityForAmounts(sqrtPriceX96, lo, hi, amount0, amount1);
  const sdkL = BigInt(sdkPos.liquidity.toString());
  check(`liquidityForAmounts [${lo},${hi}] @${currentTick}`, ours === sdkL, `ours=${ours} sdk=${sdkL}`);
}

// ---------------------------------------------------------------------------
// 4. Display prices — sanity + SDK cross-check
// ---------------------------------------------------------------------------
{
  // USDC/WETH: token0Price from SDK should match our human price
  const currentTick = 195000;
  const sqrtPriceX96 = getSqrtRatioAtTick(currentTick);
  const pool = new Pool(USDC, WETH, FeeAmount.MEDIUM, sqrtPriceX96.toString() as any, '1' as any, currentTick);
  const sdkPrice = parseFloat(pool.token0Price.toSignificant(15)); // WETH per USDC
  const ourPrice = sqrtPriceX96ToHumanPrice(sqrtPriceX96, 6, 18);
  const relErr = Math.abs(sdkPrice - ourPrice) / sdkPrice;
  check('humanPrice vs SDK token0Price', relErr < 1e-12, `ours=${ourPrice} sdk=${sdkPrice} relErr=${relErr}`);

  // USD per ETH must be ~1/price and in a sane range for tick 195000
  const usdPerEth = 1 / ourPrice;
  check('USD/ETH sanity', usdPerEth > 100 && usdPerEth < 100000, `usdPerEth=${usdPerEth}`);

  // Round-trip tick -> price -> tick
  for (const t of [190000, 195000, 200000, -100000, 50000]) {
    const p = tickToHumanPrice(t, 6, 18);
    const t2 = humanPriceToTick(p, 6, 18);
    check(`roundtrip tick ${t}`, Math.abs(t2 - t) <= 1, `t2=${t2}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
