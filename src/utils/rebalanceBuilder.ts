/**
 * rebalanceBuilder.ts — rebalance transaction sequence (UX-COCKPIT.md §3).
 *
 * Confirming a proposal = 2-3 signatures in Rabby, sequentially:
 *   1. multicall on the NFT manager: decreaseLiquidity(100%) + collect(MAX)
 *      — ONE transaction (the manager supports multicall); closes the old position
 *      and collects the capital + accrued fees.
 *   2. swap balancing the proportions for the new range (SwapRouter02, exactInputSingle
 *      IN THE SAME POOL where we provide LP — best liquidity for this pair,
 *      and the fee paid partially flows back to this pool's LPs) — SKIPPED when
 *      the proportions are closer than SWAP_SKIP_PCT.
 *   3. mint of the new range — built AFTER steps 1-2 from the ACTUAL wallet
 *      balances (buildMintStep), not from estimates — estimates are for preview only.
 *
 * Failure mid-sequence = safe state: after step 1 the funds are in cash in the
 * wallet (or in the position's tokensOwed, collectable via collect), after step 2
 * only in different proportions. The UI saves progress (saveProgress) and shows
 * "finish step 2/3" on return.
 *
 * Pure module (no React, no RPC) — all inputs are supplied by the UI
 * (usePortfolio has pool/liquidity/ticks/fees; balances via readBalanceAndAllowance).
 * Sending and pre-send simulation (client.call) — on the hook side, as
 * in useCockpitActions.openPositionAtRange.
 */
import { Pool, Position } from '@uniswap/v3-sdk';
import { Fraction, Percent } from '@uniswap/sdk-core';
import { Address, Hex, encodeFunctionData, erc20Abi } from 'viem';
import { getAmountsForLiquidity, MAX_UINT128 } from './v3math';
import { POSITION_MANAGER_ADDRESSES } from './liquidityManagement';

// SwapRouter02 (official Uniswap; NOT the old SwapRouter — different exactInputSingle ABI)
export const SWAP_ROUTER_02: Record<number, Address> = {
  1: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  8453: '0x2626664c2603336E57B271c5C0b26F421741e481',
  // Arbitrum: canonical SwapRouter02 deployment at THE SAME address as mainnet
  // (Base is the exception). Added 2026-08-11 (Fable) after Arbitrum entered the UI;
  // before the first real [Confirm] sequence on Arbitrum: sanity-check
  // with an eth_call simulation (the builder does it before the mint anyway).
  42161: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
};

/** below this proportion deviation (as % of position value) the swap step is skipped */
export const SWAP_SKIP_PCT = 2;

// --- ABI (only the functions used) ---
const MULTICALL_ABI = [
  {
    name: 'multicall', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
] as const;

const DECREASE_ABI = [
  {
    name: 'decreaseLiquidity', type: 'function', stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        { name: 'tokenId', type: 'uint256' }, { name: 'liquidity', type: 'uint128' },
        { name: 'amount0Min', type: 'uint256' }, { name: 'amount1Min', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    }],
    outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }],
  },
] as const;

const COLLECT_ABI = [
  {
    name: 'collect', type: 'function', stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        { name: 'tokenId', type: 'uint256' }, { name: 'recipient', type: 'address' },
        { name: 'amount0Max', type: 'uint128' }, { name: 'amount1Max', type: 'uint128' },
      ],
    }],
    outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }],
  },
] as const;

const EXACT_INPUT_SINGLE_ABI = [
  {
    // SwapRouter02: ExactInputSingleParams WITHOUT the deadline field (unlike SwapRouter v1)
    name: 'exactInputSingle', type: 'function', stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' },
        { name: 'fee', type: 'uint24' }, { name: 'recipient', type: 'address' },
        { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
    }],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

const MINT_ABI = [
  {
    name: 'mint', type: 'function', stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        { name: 'token0', type: 'address' }, { name: 'token1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickLower', type: 'int24' }, { name: 'tickUpper', type: 'int24' },
        { name: 'amount0Desired', type: 'uint256' }, { name: 'amount1Desired', type: 'uint256' },
        { name: 'amount0Min', type: 'uint256' }, { name: 'amount1Min', type: 'uint256' },
        { name: 'recipient', type: 'address' }, { name: 'deadline', type: 'uint256' },
      ],
    }],
    outputs: [
      { name: 'tokenId', type: 'uint256' }, { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

// --- plan types ---
export interface PlannedTx {
  to: Address;
  data: Hex;
  value: bigint;
}
export interface RebalanceStep {
  /** 1-based; when the swap is skipped the numbering stays contiguous (1..2) */
  index: number;
  kind: 'decreaseCollect' | 'swap' | 'mint';
  label: string;
  /** for kind='mint' this is only an ESTIMATE for preview — before sending, rebuild
   *  via buildMintStep from the actual balances (see file header) */
  tx: PlannedTx;
  detail: string;
}
export interface RequiredApproval {
  token: Address;
  spender: Address;
  /** the amount the approve must cover (UI compares with allowance and skips satisfied ones) */
  amount: bigint;
  tx: PlannedTx;
  label: string;
}
export interface RebalancePlan {
  chainId: number;
  tokenId: string;
  steps: RebalanceStep[];
  approvals: RequiredApproval[];
  swapSkipped: boolean;
  /** estimates for preview in the card/modal (human units) */
  preview: {
    withdraw0: number; withdraw1: number; // from step 1 (capital + fees)
    swapDirection: '0to1' | '1to0' | null;
    swapIn: number; swapOutMin: number;
    mint0: number; mint1: number; // estimated mint input
  };
}

const raw = (x: number, decimals: number): bigint => {
  if (!isFinite(x) || x <= 0) return 0n;
  return BigInt(Math.floor(x * 10 ** decimals));
};
const human = (x: bigint, decimals: number): number => Number(x) / 10 ** decimals;

/**
 * Builds the full rebalance plan (step 1 exact, steps 2-3 estimated).
 * `feesOwed0/1` — uncollected fees from the static collect simulation (UI already has it).
 */
export function planRebalance(params: {
  pool: Pool;
  chainId: number;
  tokenId: string;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  newTickLower: number;
  newTickUpper: number;
  feesOwed0: bigint;
  feesOwed1: bigint;
  recipient: Address;
  slippageBps: number; // 50 = 0.5%
  deadlineSeconds?: number;
}): RebalancePlan {
  const {
    pool, chainId, tokenId, liquidity, tickLower, tickUpper,
    newTickLower, newTickUpper, feesOwed0, feesOwed1, recipient, slippageBps,
  } = params;
  const deadlineSeconds = params.deadlineSeconds ?? 1800;
  const manager = POSITION_MANAGER_ADDRESSES[chainId] as Address | undefined;
  const router = SWAP_ROUTER_02[chainId];
  if (!manager || !router) throw new Error(`Unsupported chain: ${chainId}`);
  const bips = Math.min(Math.max(Math.round(slippageBps), 5), 500);
  const keep = new Fraction(10_000 - bips, 10_000);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const d0 = pool.token0.decimals;
  const d1 = pool.token1.decimals;

  // ---- STEP 1: multicall(decrease 100% + collect MAX) — exact ----
  const position = new Position({ pool, tickLower, tickUpper, liquidity: liquidity.toString() });
  const amount0Min = BigInt(position.amount0.multiply(keep).quotient.toString());
  const amount1Min = BigInt(position.amount1.multiply(keep).quotient.toString());
  const decreaseData = encodeFunctionData({
    abi: DECREASE_ABI, functionName: 'decreaseLiquidity',
    args: [{ tokenId: BigInt(tokenId), liquidity, amount0Min, amount1Min, deadline }],
  });
  const collectData = encodeFunctionData({
    abi: COLLECT_ABI, functionName: 'collect',
    args: [{ tokenId: BigInt(tokenId), recipient, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
  });
  const step1Data = encodeFunctionData({ abi: MULTICALL_ABI, functionName: 'multicall', args: [[decreaseData, collectData]] });

  const withdraw0 = BigInt(position.amount0.quotient.toString()) + feesOwed0;
  const withdraw1 = BigInt(position.amount1.quotient.toString()) + feesOwed1;

  // ---- STEP 2: balancing swap (estimate; float — the mins protect) ----
  // target raw a1/a0 proportion for the new range at the current price
  const sqrtP = BigInt(pool.sqrtRatioX96.toString());
  // literal instead of `10n ** 18n` — babel transpiles `**` to Math.pow() without
  // distinguishing the type, which throws at runtime for BigInts (see hedgeBuilder.ts)
  const PROBE_L = 1_000_000_000_000_000_000n; // 10n ** 18n
  const probe = getAmountsForLiquidity(sqrtP, newTickLower, newTickUpper, PROBE_L);
  const pRaw = (Number(sqrtP) / 2 ** 96) ** 2; // token1_raw per token0_raw
  const h0 = Number(withdraw0);
  const h1 = Number(withdraw1);
  const totalV1 = h0 * pRaw + h1; // total value in token1_raw

  let target0: number;
  if (probe.amount0 === 0n) target0 = 0; // price above the range → token1 only
  else if (probe.amount1 === 0n) target0 = totalV1 / pRaw; // below the range → token0 only
  else {
    const r = Number(probe.amount1) / Number(probe.amount0); // a1/a0 raw
    target0 = totalV1 / (pRaw + r);
  }
  const target1 = totalV1 - target0 * pRaw;

  const feeFrac = pool.fee / 1_000_000;
  const imbalanceV1 = Math.abs(h0 - target0) * pRaw; // shortfall/excess in token1_raw
  const swapNeeded = totalV1 > 0 && (imbalanceV1 / totalV1) * 100 > SWAP_SKIP_PCT;

  let swapDirection: '0to1' | '1to0' | null = null;
  let swapInRaw = 0n, swapOutMinRaw = 0n, swapOutEstRaw = 0n;
  let swapTx: PlannedTx | null = null;
  let est0AfterSwap = h0, est1AfterSwap = h1;

  if (swapNeeded) {
    if (h0 > target0) {
      swapDirection = '0to1';
      swapInRaw = raw(h0 - target0, 0);
      swapOutEstRaw = raw((h0 - target0) * pRaw * (1 - feeFrac), 0);
      est0AfterSwap = target0;
      est1AfterSwap = h1 + Number(swapOutEstRaw);
    } else {
      swapDirection = '1to0';
      swapInRaw = raw(h1 - target1, 0);
      swapOutEstRaw = raw(((h1 - target1) / pRaw) * (1 - feeFrac), 0);
      est0AfterSwap = h0 + Number(swapOutEstRaw);
      est1AfterSwap = target1;
    }
    swapOutMinRaw = (swapOutEstRaw * BigInt(10_000 - bips)) / 10_000n;
    const tokenIn = (swapDirection === '0to1' ? pool.token0.address : pool.token1.address) as Address;
    const tokenOut = (swapDirection === '0to1' ? pool.token1.address : pool.token0.address) as Address;
    swapTx = {
      to: router,
      data: encodeFunctionData({
        abi: EXACT_INPUT_SINGLE_ABI, functionName: 'exactInputSingle',
        args: [{
          tokenIn, tokenOut, fee: pool.fee, recipient,
          amountIn: swapInRaw, amountOutMinimum: swapOutMinRaw, sqrtPriceLimitX96: 0n,
        }],
      }),
      value: 0n,
    };
  }

  // ---- STEP 3 (ESTIMATE for preview): mint from est. balances after the swap ----
  // safety margin on the swap leg (the actual out may be lower);
  // the executable mint is built by buildMintStep from real balances.
  const SAFETY = 0.998;
  const estMint0 = raw(est0AfterSwap * (swapDirection === '1to0' ? SAFETY : 1), 0);
  const estMint1 = raw(est1AfterSwap * (swapDirection === '0to1' ? SAFETY : 1), 0);
  const mintStep = buildMintStep({
    pool, chainId, newTickLower, newTickUpper,
    amount0: estMint0, amount1: estMint1, recipient, slippageBps: bips, deadlineSeconds,
  });

  // ---- approvals (UI filters by actual allowance) ----
  const approvals: RequiredApproval[] = [];
  const addApproval = (token: Address, spender: Address, amount: bigint, label: string) => {
    if (amount <= 0n) return;
    approvals.push({
      token, spender, amount, label,
      tx: { to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, amount] }), value: 0n },
    });
  };
  if (swapTx && swapDirection) {
    addApproval(
      (swapDirection === '0to1' ? pool.token0.address : pool.token1.address) as Address,
      router, swapInRaw, `Approve ${swapDirection === '0to1' ? pool.token0.symbol : pool.token1.symbol} for the router (swap)`
    );
  }
  addApproval(pool.token0.address as Address, manager, estMint0, `Approve ${pool.token0.symbol} for the NFT manager (mint)`);
  addApproval(pool.token1.address as Address, manager, estMint1, `Approve ${pool.token1.symbol} for the NFT manager (mint)`);

  // ---- plan assembly ----
  const steps: RebalanceStep[] = [];
  const total = swapTx ? 3 : 2;
  steps.push({
    index: 1, kind: 'decreaseCollect',
    label: `Step 1/${total}: close old position #${tokenId} (decrease + collect in one tx)`,
    tx: { to: manager, data: step1Data, value: 0n },
    detail: `you will receive ~${human(withdraw0, d0).toFixed(6)} ${pool.token0.symbol} + ${human(withdraw1, d1).toFixed(6)} ${pool.token1.symbol} (capital + fees; min. after slippage on the capital)`,
  });
  if (swapTx && swapDirection) {
    steps.push({
      index: 2, kind: 'swap',
      label: `Step 2/${total}: swap balancing the proportions (in the same pool)`,
      tx: swapTx,
      detail: swapDirection === '0to1'
        ? `${human(swapInRaw, d0).toFixed(6)} ${pool.token0.symbol} → min. ${human(swapOutMinRaw, d1).toFixed(6)} ${pool.token1.symbol}`
        : `${human(swapInRaw, d1).toFixed(6)} ${pool.token1.symbol} → min. ${human(swapOutMinRaw, d0).toFixed(6)} ${pool.token0.symbol}`,
    });
  }
  steps.push({
    index: total, kind: 'mint',
    label: `Step ${total}/${total}: mint new position [${newTickLower}, ${newTickUpper}]`,
    tx: mintStep.tx,
    detail: `ESTIMATE: ~${human(estMint0, d0).toFixed(6)} ${pool.token0.symbol} + ${human(estMint1, d1).toFixed(6)} ${pool.token1.symbol} — rebuild from actual balances before sending (buildMintStep)`,
  });

  return {
    chainId, tokenId, steps, approvals,
    swapSkipped: !swapTx,
    preview: {
      withdraw0: human(withdraw0, d0), withdraw1: human(withdraw1, d1),
      swapDirection,
      swapIn: swapDirection === '0to1' ? human(swapInRaw, d0) : human(swapInRaw, d1),
      swapOutMin: swapDirection === '0to1' ? human(swapOutMinRaw, d1) : human(swapOutMinRaw, d0),
      mint0: human(estMint0, d0), mint1: human(estMint1, d1),
    },
  };
}

/**
 * Executable mint step — called AFTER steps 1-2 are confirmed, with ACTUAL
 * balances (readBalanceAndAllowance), not estimates. Uses Position.fromAmounts
 * internally (the SDK picks the maximum L that fits the given amounts) + mins after slippage
 * — the same path as prepareAddLiquidityTransaction in AddLiquidity.tsx.
 */
export function buildMintStep(params: {
  pool: Pool;
  chainId: number;
  newTickLower: number;
  newTickUpper: number;
  amount0: bigint;
  amount1: bigint;
  recipient: Address;
  slippageBps: number;
  deadlineSeconds?: number;
}): { tx: PlannedTx; position: Position } {
  const { pool, chainId, newTickLower, newTickUpper, amount0, amount1, recipient, slippageBps } = params;
  const manager = POSITION_MANAGER_ADDRESSES[chainId] as Address | undefined;
  if (!manager) throw new Error(`Unsupported chain: ${chainId}`);
  const bips = Math.min(Math.max(Math.round(slippageBps), 5), 500);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.deadlineSeconds ?? 1800));

  const position = Position.fromAmounts({
    pool, tickLower: newTickLower, tickUpper: newTickUpper,
    amount0: amount0.toString(), amount1: amount1.toString(), useFullPrecision: true,
  });
  const { amount0: min0, amount1: min1 } = position.mintAmountsWithSlippage(new Percent(bips, 10_000));

  const data = encodeFunctionData({
    abi: MINT_ABI, functionName: 'mint',
    args: [{
      token0: pool.token0.address as Address, token1: pool.token1.address as Address,
      fee: pool.fee, tickLower: newTickLower, tickUpper: newTickUpper,
      amount0Desired: BigInt(position.mintAmounts.amount0.toString()),
      amount1Desired: BigInt(position.mintAmounts.amount1.toString()),
      amount0Min: BigInt(min0.toString()), amount1Min: BigInt(min1.toString()),
      recipient, deadline,
    }],
  });
  return { tx: { to: manager, data, value: 0n }, position };
}

// ---------------------------------------------------------------------------
// ROTATE cross-pool (20.08, closing the TODO from Batch 4b): old and new position
// in DIFFERENT pools. v1 limitations (deliberate):
//  - THE SAME network (a tx sequence will not bridge; cross-chain rotations stay
//    on the manual steps 1/2 as before — the UI must communicate this),
//  - pairs: identical (tier change, e.g. mainnet 030→005) or with ONE
//    shared token (e.g. WETH/USDC → cbBTC/WETH via the shared WETH);
//    disjoint pairs → throw (swap route selection is a different class of problem,
//    and no such case occurs in BOT_POOLS).
// Sequence: 1) decrease+collect in the old pool → 2) a "bridging" swap of
// the ENTIRE unique token of the old pair into the shared one (in the OLD pool — that
// is where the liquidity for this pair is) → 3) swap balancing the proportions for the new range
// (in the NEW pool) → 4) mint in the new pool. Steps 2/3 are skipped when unnecessary
// (same pair → balancing only; one-sided range → no balancing).
// Failure mid-way = funds in cash in the wallet (safe state, as in
// planRebalance); the executable mint must be rebuilt via buildMintStep from
// ACTUAL balances (same rules as the base plan).
// ---------------------------------------------------------------------------

export interface RotatePlan {
  chainId: number;
  tokenId: string;
  steps: RebalanceStep[];
  approvals: RequiredApproval[];
  /** the pool we mint in (for buildMintStep after the swap steps) */
  mintPool: 'new';
  preview: {
    withdraw0: number; withdraw1: number; // tokens of the OLD pool
    bridgeSwap: string | null;  // description of the unique→shared swap (null when same pair)
    balanceSwap: string | null; // description of the balancing swap in the new pool
    mint0: number; mint1: number; // ESTIMATE of the mint input (tokens of the NEW pool)
  };
}

const addrEq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function planRotate(params: {
  oldPool: Pool;
  newPool: Pool;
  chainId: number;
  tokenId: string;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  newTickLower: number;
  newTickUpper: number;
  feesOwed0: bigint;
  feesOwed1: bigint;
  recipient: Address;
  slippageBps: number;
  deadlineSeconds?: number;
}): RotatePlan {
  const {
    oldPool, newPool, chainId, tokenId, liquidity, tickLower, tickUpper,
    newTickLower, newTickUpper, feesOwed0, feesOwed1, recipient, slippageBps,
  } = params;
  const manager = POSITION_MANAGER_ADDRESSES[chainId] as Address | undefined;
  const router = SWAP_ROUTER_02[chainId];
  if (!manager || !router) throw new Error(`Unsupported chain: ${chainId}`);
  if (oldPool.chainId !== newPool.chainId) {
    throw new Error('planRotate: pools on different networks — a cross-chain rotation requires manual steps (close → move → open)');
  }
  const bips = Math.min(Math.max(Math.round(slippageBps), 5), 500);
  const keep = new Fraction(10_000 - bips, 10_000);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.deadlineSeconds ?? 1800));

  // ---- STEP 1: decrease 100% + collect in the OLD pool (exact) ----
  const position = new Position({ pool: oldPool, tickLower, tickUpper, liquidity: liquidity.toString() });
  const step1Data = encodeFunctionData({
    abi: MULTICALL_ABI, functionName: 'multicall',
    args: [[
      encodeFunctionData({
        abi: DECREASE_ABI, functionName: 'decreaseLiquidity',
        args: [{
          tokenId: BigInt(tokenId), liquidity,
          amount0Min: BigInt(position.amount0.multiply(keep).quotient.toString()),
          amount1Min: BigInt(position.amount1.multiply(keep).quotient.toString()),
          deadline,
        }],
      }),
      encodeFunctionData({
        abi: COLLECT_ABI, functionName: 'collect',
        args: [{ tokenId: BigInt(tokenId), recipient, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
      }),
    ]],
  });
  const withdraw0 = BigInt(position.amount0.quotient.toString()) + feesOwed0;
  const withdraw1 = BigInt(position.amount1.quotient.toString()) + feesOwed1;

  // ---- token mapping old→new pair ----
  const o = [oldPool.token0, oldPool.token1];
  const n = [newPool.token0, newPool.token1];
  const feeFracOld = oldPool.fee / 1_000_000;
  const feeFracNew = newPool.fee / 1_000_000;
  const pRawOld = (Number(BigInt(oldPool.sqrtRatioX96.toString())) / 2 ** 96) ** 2; // o1_raw per o0_raw
  const pRawNew = (Number(BigInt(newPool.sqrtRatioX96.toString())) / 2 ** 96) ** 2; // n1_raw per n0_raw

  const samePair =
    (addrEq(o[0].address, n[0].address) && addrEq(o[1].address, n[1].address)) ||
    (addrEq(o[0].address, n[1].address) && addrEq(o[1].address, n[0].address));

  const approvals: RequiredApproval[] = [];
  const addApproval = (token: Address, symbol: string | undefined, spender: Address, amount: bigint, what: string) => {
    if (amount <= 0n) return;
    approvals.push({
      token, spender, amount, label: `Approve ${symbol} ${what}`,
      tx: { to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, amount] }), value: 0n },
    });
  };
  const mkSwapTx = (tokenIn: Address, tokenOut: Address, fee: number, amountIn: bigint, outMin: bigint): PlannedTx => ({
    to: router,
    data: encodeFunctionData({
      abi: EXACT_INPUT_SINGLE_ABI, functionName: 'exactInputSingle',
      args: [{ tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum: outMin, sqrtPriceLimitX96: 0n }],
    }),
    value: 0n,
  });

  // working balances in the NEW pool's tokens (raw, float — the mins protect)
  let bal0 = 0; // n0
  let bal1 = 0; // n1
  let bridgeSwapDesc: string | null = null;
  const swapSteps: Array<Omit<RebalanceStep, 'index' | 'label'> & { shortLabel: string }> = [];

  if (samePair) {
    // map the balances onto the new pool's token order
    if (addrEq(o[0].address, n[0].address)) { bal0 = Number(withdraw0); bal1 = Number(withdraw1); }
    else { bal0 = Number(withdraw1); bal1 = Number(withdraw0); }
  } else {
    // shared token: exactly one
    const sharedIdxOld = addrEq(o[0].address, n[0].address) || addrEq(o[0].address, n[1].address) ? 0
      : addrEq(o[1].address, n[0].address) || addrEq(o[1].address, n[1].address) ? 1 : -1;
    if (sharedIdxOld === -1) {
      throw new Error(`planRotate: pairs ${o[0].symbol}/${o[1].symbol} and ${n[0].symbol}/${n[1].symbol} have no shared token — manual rotation (2 steps)`);
    }
    const shared = o[sharedIdxOld];
    const uniqueOld = o[1 - sharedIdxOld];
    const uniqueIn = [Number(withdraw0), Number(withdraw1)][1 - sharedIdxOld];
    let sharedBal = [Number(withdraw0), Number(withdraw1)][sharedIdxOld];

    // STEP: the entire unique old token → shared, in the OLD pool
    if (uniqueIn > 0) {
      // price of shared per unique in the old pool (raw): account for orientation
      const sharedPerUnique = sharedIdxOld === 1 ? pRawOld : 1 / pRawOld;
      const outEst = uniqueIn * sharedPerUnique * (1 - feeFracOld);
      const inRaw = raw(uniqueIn, 0);
      const outMinRaw = (raw(outEst, 0) * BigInt(10_000 - bips)) / 10_000n;
      swapSteps.push({
        kind: 'swap',
        shortLabel: 'swap: old pair → shared token (in the old pool)',
        tx: mkSwapTx(uniqueOld.address as Address, shared.address as Address, oldPool.fee, inRaw, outMinRaw),
        detail: `${human(inRaw, uniqueOld.decimals).toFixed(6)} ${uniqueOld.symbol} → min. ${human(outMinRaw, shared.decimals).toFixed(6)} ${shared.symbol}`,
      });
      addApproval(uniqueOld.address as Address, uniqueOld.symbol, router, inRaw, 'for the router (swap to the shared token)');
      sharedBal += outEst;
      bridgeSwapDesc = `${uniqueOld.symbol}→${shared.symbol} in the old pool`;
    }
    // everything in the shared token — assign to the right leg of the new pool
    if (addrEq(shared.address, n[0].address)) { bal0 = sharedBal; bal1 = 0; }
    else { bal0 = 0; bal1 = sharedBal; }
  }

  // ---- BALANCING swap for the new range (in the NEW pool) — same logic as planRebalance ----
  const sqrtPNew = BigInt(newPool.sqrtRatioX96.toString());
  const probe = getAmountsForLiquidity(sqrtPNew, newTickLower, newTickUpper, 1_000_000_000_000_000_000n); // 10n ** 18n
  const totalV1 = bal0 * pRawNew + bal1;
  let target0: number;
  if (probe.amount0 === 0n) target0 = 0;
  else if (probe.amount1 === 0n) target0 = totalV1 / pRawNew;
  else target0 = totalV1 / (pRawNew + Number(probe.amount1) / Number(probe.amount0));
  const target1 = totalV1 - target0 * pRawNew;

  let balanceSwapDesc: string | null = null;
  let est0 = bal0;
  let est1 = bal1;
  const imbalanceV1 = Math.abs(bal0 - target0) * pRawNew;
  if (totalV1 > 0 && (imbalanceV1 / totalV1) * 100 > SWAP_SKIP_PCT) {
    const zeroToOne = bal0 > target0;
    const inHuman = zeroToOne ? bal0 - target0 : bal1 - target1;
    const outEst = zeroToOne ? inHuman * pRawNew * (1 - feeFracNew) : (inHuman / pRawNew) * (1 - feeFracNew);
    const inRaw = raw(inHuman, 0);
    const outMinRaw = (raw(outEst, 0) * BigInt(10_000 - bips)) / 10_000n;
    const tin = zeroToOne ? n[0] : n[1];
    const tout = zeroToOne ? n[1] : n[0];
    swapSteps.push({
      kind: 'swap',
      shortLabel: 'swap balancing the proportions (in the new pool)',
      tx: mkSwapTx(tin.address as Address, tout.address as Address, newPool.fee, inRaw, outMinRaw),
      detail: `${human(inRaw, tin.decimals).toFixed(6)} ${tin.symbol} → min. ${human(outMinRaw, tout.decimals).toFixed(6)} ${tout.symbol}`,
    });
    addApproval(tin.address as Address, tin.symbol, router, inRaw, 'for the router (balancing swap)');
    if (zeroToOne) { est0 = target0; est1 = bal1 + outEst; }
    else { est0 = bal0 + outEst; est1 = target1; }
    balanceSwapDesc = `${tin.symbol}→${tout.symbol} in the new pool`;
  }

  // ---- mint in the NEW pool (ESTIMATE — executable via buildMintStep from real balances) ----
  const SAFETY = 0.998; // margin on the legs fed by swaps (the real out may be lower)
  const estMint0 = raw(est0 * SAFETY, 0);
  const estMint1 = raw(est1 * SAFETY, 0);
  const mintStep = buildMintStep({
    pool: newPool, chainId, newTickLower, newTickUpper,
    amount0: estMint0, amount1: estMint1, recipient, slippageBps: bips,
    deadlineSeconds: params.deadlineSeconds,
  });
  addApproval(n[0].address as Address, n[0].symbol, manager, estMint0, 'for the NFT manager (mint)');
  addApproval(n[1].address as Address, n[1].symbol, manager, estMint1, 'for the NFT manager (mint)');

  // ---- step assembly ----
  const total = 1 + swapSteps.length + 1;
  const steps: RebalanceStep[] = [{
    index: 1, kind: 'decreaseCollect',
    label: `Step 1/${total}: close old position #${tokenId} (${o[0].symbol}/${o[1].symbol}, decrease + collect)`,
    tx: { to: manager, data: step1Data, value: 0n },
    detail: `you will receive ~${human(withdraw0, o[0].decimals).toFixed(6)} ${o[0].symbol} + ${human(withdraw1, o[1].decimals).toFixed(6)} ${o[1].symbol} (capital + fees)`,
  }];
  swapSteps.forEach((s, i) => steps.push({
    index: 2 + i, kind: s.kind, label: `Step ${2 + i}/${total}: ${s.shortLabel}`, tx: s.tx, detail: s.detail,
  }));
  steps.push({
    index: total, kind: 'mint',
    label: `Step ${total}/${total}: mint position in the NEW pool ${n[0].symbol}/${n[1].symbol} [${newTickLower}, ${newTickUpper}]`,
    tx: mintStep.tx,
    detail: `ESTIMATE: ~${human(estMint0, n[0].decimals).toFixed(6)} ${n[0].symbol} + ${human(estMint1, n[1].decimals).toFixed(6)} ${n[1].symbol} — rebuild from actual balances before sending (buildMintStep, pool=NEW)`,
  });

  return {
    chainId, tokenId, steps, approvals, mintPool: 'new',
    preview: {
      withdraw0: human(withdraw0, o[0].decimals), withdraw1: human(withdraw1, o[1].decimals),
      bridgeSwap: bridgeSwapDesc, balanceSwap: balanceSwapDesc,
      mint0: human(estMint0, n[0].decimals), mint1: human(estMint1, n[1].decimals),
    },
  };
}

// ---------------------------------------------------------------------------
// Sequence progress — survives a page refresh ("finish step 2/3").
// localStorage like homos_api_base; key per position.
// ---------------------------------------------------------------------------
export interface RebalanceProgress {
  tokenId: string;
  chainId: number;
  newTickLower: number;
  newTickUpper: number;
  totalSteps: number;
  /** indices of steps CONFIRMED on-chain (receipt), e.g. [1] or [1,2] */
  completed: number[];
  txHashes: Record<number, string>;
  updatedAt: string;
}

const progressKey = (chainId: number, tokenId: string) => `homos_rebalance_${chainId}_${tokenId}`;

export const saveProgress = (p: RebalanceProgress): void => {
  try { localStorage.setItem(progressKey(p.chainId, p.tokenId), JSON.stringify(p)); } catch { /* in-memory only */ }
};
export const loadProgress = (chainId: number, tokenId: string): RebalanceProgress | null => {
  try {
    const v = localStorage.getItem(progressKey(chainId, tokenId));
    return v ? (JSON.parse(v) as RebalanceProgress) : null;
  } catch { return null; }
};
export const clearProgress = (chainId: number, tokenId: string): void => {
  try { localStorage.removeItem(progressKey(chainId, tokenId)); } catch { /* noop */ }
};
