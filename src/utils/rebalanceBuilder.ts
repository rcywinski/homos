/**
 * rebalanceBuilder.ts — sekwencja transakcji rebalansu (UX-COCKPIT.md §3).
 *
 * Zatwierdzenie propozycji = 2–3 podpisy w Rabby, sekwencyjnie:
 *   1. multicall na NFT managerze: decreaseLiquidity(100%) + collect(MAX)
 *      — JEDNA transakcja (manager wspiera multicall); zamyka starą pozycję
 *      i odbiera kapitał + narosłe fee.
 *   2. swap wyrównujący proporcje pod nowy zakres (SwapRouter02, exactInputSingle
 *      W TEJ SAMEJ PULI, w której robimy LP — najlepsza płynność dla tej pary,
 *      a zapłacone fee wraca częściowo do LP-ów tej puli) — POMIJANY, gdy
 *      proporcje są bliżej niż SWAP_SKIP_PCT.
 *   3. mint nowego zakresu — budowany PO krokach 1–2 z FAKTYCZNYCH sald
 *      portfela (buildMintStep), nie z estymat — estymaty służą tylko podglądowi.
 *
 * Failure w środku sekwencji = stan bezpieczny: po kroku 1 środki są w cash na
 * walletcie (albo w tokensOwed pozycji, odbieralne przez collect), po kroku 2
 * tylko w innych proporcjach. UI zapisuje postęp (saveProgress) i pokazuje
 * "dokończ krok 2/3" po powrocie.
 *
 * Moduł czysty (bez Reacta, bez RPC) — wszystkie dane wejściowe podaje UI
 * (usePortfolio ma pool/liquidity/ticki/fees; salda przez readBalanceAndAllowance).
 * Wysyłka i symulacja przed wysłaniem (client.call) — po stronie hooka, jak
 * w useCockpitActions.openPositionAtRange.
 */
import { Pool, Position } from '@uniswap/v3-sdk';
import { Fraction, Percent } from '@uniswap/sdk-core';
import { Address, Hex, encodeFunctionData, erc20Abi } from 'viem';
import { getAmountsForLiquidity, MAX_UINT128 } from './v3math';
import { POSITION_MANAGER_ADDRESSES } from './liquidityManagement';

// SwapRouter02 (Uniswap oficjalny; NIE stary SwapRouter — inne ABI exactInputSingle)
export const SWAP_ROUTER_02: Record<number, Address> = {
  1: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  8453: '0x2626664c2603336E57B271c5C0b26F421741e481',
  // Arbitrum: kanoniczny deploy SwapRouter02 pod TYM SAMYM adresem co mainnet
  // (Base jest wyjątkiem). Dodane 2026-08-11 (Fable) po wejściu Arbitrum do UI;
  // przed pierwszą realną sekwencją [Zatwierdź] na Arbitrum: sanity-check
  // symulacją eth_call (builder i tak ją robi przed mintem).
  42161: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
};

/** poniżej tego odchylenia proporcji (jako % wartości pozycji) krok swap pomijamy */
export const SWAP_SKIP_PCT = 2;

// --- ABI (tylko używane funkcje) ---
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
    // SwapRouter02: ExactInputSingleParams BEZ pola deadline (inaczej niż SwapRouter v1)
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

// --- typy planu ---
export interface PlannedTx {
  to: Address;
  data: Hex;
  value: bigint;
}
export interface RebalanceStep {
  /** 1-based, po pominięciu swapa numeracja jest ciągła (1..2) */
  index: number;
  kind: 'decreaseCollect' | 'swap' | 'mint';
  label: string;
  /** dla kind='mint' to tylko ESTYMATA do podglądu — przed wysłaniem zbuduj
   *  ponownie przez buildMintStep z faktycznych sald (patrz nagłówek pliku) */
  tx: PlannedTx;
  detail: string;
}
export interface RequiredApproval {
  token: Address;
  spender: Address;
  /** wartość, na którą approve musi opiewać (UI porównuje z allowance i pomija spełnione) */
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
  /** estymaty do podglądu w karcie/modalu (jednostki ludzkie) */
  preview: {
    withdraw0: number; withdraw1: number; // z kroku 1 (kapitał + fee)
    swapDirection: '0to1' | '1to0' | null;
    swapIn: number; swapOutMin: number;
    mint0: number; mint1: number; // estymowane wejście do minta
  };
}

const raw = (x: number, decimals: number): bigint => {
  if (!isFinite(x) || x <= 0) return 0n;
  return BigInt(Math.floor(x * 10 ** decimals));
};
const human = (x: bigint, decimals: number): number => Number(x) / 10 ** decimals;

/**
 * Buduje pełny plan rebalansu (krok 1 dokładny, kroki 2–3 estymowane).
 * `feesOwed0/1` — nieodebrane fee z symulacji statycznego collect (UI już to ma).
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

  // ---- KROK 1: multicall(decrease 100% + collect MAX) — dokładny ----
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

  // ---- KROK 2: swap wyrównujący (estymata; float — miny chronią) ----
  // docelowa proporcja raw a1/a0 dla nowego zakresu przy bieżącej cenie
  const sqrtP = BigInt(pool.sqrtRatioX96.toString());
  const PROBE_L = 10n ** 18n;
  const probe = getAmountsForLiquidity(sqrtP, newTickLower, newTickUpper, PROBE_L);
  const pRaw = (Number(sqrtP) / 2 ** 96) ** 2; // token1_raw za token0_raw
  const h0 = Number(withdraw0);
  const h1 = Number(withdraw1);
  const totalV1 = h0 * pRaw + h1; // wartość całości w token1_raw

  let target0: number;
  if (probe.amount0 === 0n) target0 = 0; // cena nad zakresem → sam token1
  else if (probe.amount1 === 0n) target0 = totalV1 / pRaw; // pod zakresem → sam token0
  else {
    const r = Number(probe.amount1) / Number(probe.amount0); // a1/a0 raw
    target0 = totalV1 / (pRaw + r);
  }
  const target1 = totalV1 - target0 * pRaw;

  const feeFrac = pool.fee / 1_000_000;
  const imbalanceV1 = Math.abs(h0 - target0) * pRaw; // niedomiar/nadmiar w token1_raw
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

  // ---- KROK 3 (ESTYMATA do podglądu): mint z est. sald po swapie ----
  // margines bezpieczeństwa na nodze z swapa (faktyczny out może być niższy);
  // wykonawczy mint budowany przez buildMintStep z realnych sald.
  const SAFETY = 0.998;
  const estMint0 = raw(est0AfterSwap * (swapDirection === '1to0' ? SAFETY : 1), 0);
  const estMint1 = raw(est1AfterSwap * (swapDirection === '0to1' ? SAFETY : 1), 0);
  const mintStep = buildMintStep({
    pool, chainId, newTickLower, newTickUpper,
    amount0: estMint0, amount1: estMint1, recipient, slippageBps: bips, deadlineSeconds,
  });

  // ---- approvals (UI filtruje po faktycznym allowance) ----
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
      router, swapInRaw, `Approve ${swapDirection === '0to1' ? pool.token0.symbol : pool.token1.symbol} dla routera (swap)`
    );
  }
  addApproval(pool.token0.address as Address, manager, estMint0, `Approve ${pool.token0.symbol} dla NFT managera (mint)`);
  addApproval(pool.token1.address as Address, manager, estMint1, `Approve ${pool.token1.symbol} dla NFT managera (mint)`);

  // ---- złożenie planu ----
  const steps: RebalanceStep[] = [];
  const total = swapTx ? 3 : 2;
  steps.push({
    index: 1, kind: 'decreaseCollect',
    label: `Krok 1/${total}: zamknij starą pozycję #${tokenId} (decrease + collect w jednej tx)`,
    tx: { to: manager, data: step1Data, value: 0n },
    detail: `otrzymasz ~${human(withdraw0, d0).toFixed(6)} ${pool.token0.symbol} + ${human(withdraw1, d1).toFixed(6)} ${pool.token1.symbol} (kapitał + fee; min. po slippage na kapitale)`,
  });
  if (swapTx && swapDirection) {
    steps.push({
      index: 2, kind: 'swap',
      label: `Krok 2/${total}: swap wyrównujący proporcje (w tej samej puli)`,
      tx: swapTx,
      detail: swapDirection === '0to1'
        ? `${human(swapInRaw, d0).toFixed(6)} ${pool.token0.symbol} → min. ${human(swapOutMinRaw, d1).toFixed(6)} ${pool.token1.symbol}`
        : `${human(swapInRaw, d1).toFixed(6)} ${pool.token1.symbol} → min. ${human(swapOutMinRaw, d0).toFixed(6)} ${pool.token0.symbol}`,
    });
  }
  steps.push({
    index: total, kind: 'mint',
    label: `Krok ${total}/${total}: otwórz nową pozycję [${newTickLower}, ${newTickUpper}]`,
    tx: mintStep.tx,
    detail: `ESTYMATA: ~${human(estMint0, d0).toFixed(6)} ${pool.token0.symbol} + ${human(estMint1, d1).toFixed(6)} ${pool.token1.symbol} — przed wysłaniem przebuduj z faktycznych sald (buildMintStep)`,
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
 * Wykonawczy krok mint — wołany PO potwierdzeniu kroków 1–2, z FAKTYCZNYMI
 * saldami (readBalanceAndAllowance), nie estymatami. Wewnątrz Position.fromAmounts
 * (SDK dobierze maksymalne L mieszczące się w podanych kwotach) + miny po slippage
 * — ta sama droga co prepareAddLiquidityTransaction w AddLiquidity.tsx.
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
// Postęp sekwencji — przeżywa odświeżenie strony ("dokończ krok 2/3").
// localStorage jak homos_api_base; klucz per pozycja.
// ---------------------------------------------------------------------------
export interface RebalanceProgress {
  tokenId: string;
  chainId: number;
  newTickLower: number;
  newTickUpper: number;
  totalSteps: number;
  /** indeksy kroków POTWIERDZONYCH on-chain (receipt), np. [1] albo [1,2] */
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
