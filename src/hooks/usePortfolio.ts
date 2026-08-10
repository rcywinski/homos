/**
 * usePortfolio.ts — shared portfolio-wide summary for the morning cockpit
 * (UI-VISION.md §3.1) and any other screen that needs cross-pool numbers.
 *
 * Unlike MyPositions.tsx (scoped to whatever single pool is open), this walks
 * ALL of the connected wallet's Uniswap V3 NFT positions across every chain
 * we support (mainnet + Base — see POSITION_MANAGER_ADDRESSES), reusing the
 * exact same math (v3math, advisor.ts) the rest of the app already uses —
 * no new formulas introduced here.
 *
 * Perf note: 24h advisor stats (swap history) are only fetched for pools the
 * wallet actually holds a position in, not for every OBSERVED_PAIRS entry —
 * doing that for all configured pools would multiply RPC load for no benefit
 * to this screen.
 *
 * Valuation note: a position is priced in USD only when the pair has a
 * stablecoin leg (or a WETH leg valued via a stable/WETH pool we can read) —
 * pairs like cbBTC/WETH have no reliable USD price without an extra feed, so
 * they're counted (position totals, in/out-of-range) but excluded from the
 * USD totals. `hasUnknownValue` tells the UI to show a footnote instead of
 * silently under-reporting the total.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { NETWORKS, POOL_FACTORY_ABI, POOL_ABI } from '../utils/uniswap';
import { POSITION_MANAGER_ADDRESSES } from '../utils/liquidityManagement';
import { OBSERVED_PAIRS } from '../config/pools';
import { getAmountsForLiquidity, humanPriceQuotePerBase, MAX_UINT128 } from '../utils/v3math';
import { fetchRecentSwaps, computeStats, assessPosition, RebalanceAssessment } from '../utils/advisor';

const CHAIN_IDS = [1, 8453] as const;
const CHAIN_LABEL: Record<number, string> = { 1: 'Ethereum', 8453: 'Base' };
const FACTORY: Record<number, Address> = {
  1: NETWORKS.MAINNET.poolFactoryAddress,
  8453: NETWORKS.BASE.poolFactoryAddress,
};

const POSITIONS_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'positions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'nonce', type: 'uint96' },
      { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
  },
  {
    name: 'collect',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'amount0Max', type: 'uint128' },
          { name: 'amount1Max', type: 'uint128' },
        ],
      },
    ],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

export interface PortfolioPosition {
  tokenId: string;
  chainId: number;
  poolLabel: string;
  valueUsd: number | null;
  feesUsd: number;
  inRange: boolean;
  advice: RebalanceAssessment['action'] | null;
  paybackDays: number | null;
}

export interface PortfolioSummary {
  connected: boolean;
  loading: boolean;
  error: string | null;
  walletUsd: number;
  positionsUsd: number;
  totalUsd: number;
  feesUsd: number;
  positionsInRange: number;
  positionsOutOfRange: number;
  hasUnknownValue: boolean;
  positions: PortfolioPosition[];
  refresh: () => void;
}

const knownTokenMap = (chainId: number): Map<string, { symbol: string; decimals: number }> => {
  const map = new Map<string, { symbol: string; decimals: number }>();
  for (const pair of OBSERVED_PAIRS) {
    if (pair.chainId !== chainId) continue;
    map.set(pair.token0.address.toLowerCase(), { symbol: pair.token0.symbol || '?', decimals: pair.token0.decimals });
    map.set(pair.token1.address.toLowerCase(), { symbol: pair.token1.symbol || '?', decimals: pair.token1.decimals });
  }
  return map;
};

const isStable = (sym: string) => sym.includes('USD') || sym.includes('DAI');
const isEth = (sym: string) => sym.includes('ETH');

/** USD value from a pair's amounts — null when the pair has no stable/ETH leg we can price. */
const usdValueOf = (amount0: number, amount1: number, sym0: string, sym1: string, ethUsd: number | null): number | null => {
  const s0 = isStable(sym0);
  const s1 = isStable(sym1);
  if (s0 && s1) return amount0 + amount1;
  if (s0 && isEth(sym1) && ethUsd !== null) return amount0 + amount1 * ethUsd;
  if (s1 && isEth(sym0) && ethUsd !== null) return amount1 + amount0 * ethUsd;
  return null;
};

export function usePortfolio(): PortfolioSummary {
  const { address, isConnected } = useAccount();
  const clientMainnet = usePublicClient({ chainId: 1 });
  const clientBase = usePublicClient({ chainId: 8453 });
  const clients: Record<number, ReturnType<typeof usePublicClient>> = { 1: clientMainnet, 8453: clientBase };

  // Mirrors CompactWalletInfo's balance fetch (mainnet ETH/WETH/USDC) — kept
  // separate from that component since it's presentational, this is data.
  const { data: ethBal } = useBalance({ address, chainId: 1 });
  const { data: wethBal } = useBalance({ address, token: NETWORKS.MAINNET.tokens.WETH.address, chainId: 1 });
  const { data: usdcBal } = useBalance({ address, token: NETWORKS.MAINNET.tokens.USDC.address, chainId: 1 });

  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!isConnected || !address) {
      setPositions([]);
      setEthUsd(null);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const allPositions: PortfolioPosition[] = [];
        let derivedEthUsd: number | null = null;

        for (const chainId of CHAIN_IDS) {
          const client = clients[chainId];
          const manager = POSITION_MANAGER_ADDRESSES[chainId] as Address | undefined;
          if (!client || !manager) continue;

          const balance = await client.readContract({
            address: manager,
            abi: POSITIONS_ABI,
            functionName: 'balanceOf',
            args: [address],
          });
          const count = Number(balance);
          if (count === 0) continue;

          const tokenIds = await Promise.all(
            Array.from({ length: count }, (_, i) =>
              client.readContract({ address: manager, abi: POSITIONS_ABI, functionName: 'tokenOfOwnerByIndex', args: [address, BigInt(i)] })
            )
          );

          const raws = await Promise.all(
            tokenIds.map((id) => client.readContract({ address: manager, abi: POSITIONS_ABI, functionName: 'positions', args: [id] }))
          );

          const known = knownTokenMap(chainId);
          const poolCache = new Map<string, { sqrtPriceX96: bigint; tick: number }>();
          const statsCache = new Map<string, ReturnType<typeof computeStats>>();

          for (let i = 0; i < raws.length; i++) {
            // viem decodes all Solidity uintN/intN (including uint24/int24) as bigint —
            // same as MyPositions.tsx's fetchPositions, which this mirrors.
            const [, , token0, token1, feeRaw, tickLowerRaw, tickUpperRaw, liquidity] = raws[i] as unknown as [
              bigint, string, Address, Address, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint
            ];
            if (liquidity <= 0n) continue;
            const fee = Number(feeRaw);
            const tickLower = Number(tickLowerRaw);
            const tickUpper = Number(tickUpperRaw);

            const poolKey = `${token0.toLowerCase()}-${token1.toLowerCase()}-${fee}`;
            let poolInfo = poolCache.get(poolKey);
            let poolAddress: Address | null = null;
            if (!poolInfo) {
              try {
                poolAddress = (await client.readContract({
                  address: FACTORY[chainId],
                  abi: POOL_FACTORY_ABI,
                  functionName: 'getPool',
                  args: [token0, token1, fee],
                })) as Address;
                if (poolAddress === '0x0000000000000000000000000000000000000000') continue;
                const slot0 = (await client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'slot0' })) as readonly [
                  bigint, number, number, number, number, number, boolean
                ];
                poolInfo = { sqrtPriceX96: slot0[0], tick: slot0[1] };
                poolCache.set(poolKey, poolInfo);
              } catch (e) {
                console.warn('usePortfolio: pool lookup failed', poolKey, e);
                continue;
              }
            }

            const tok0 = known.get(token0.toLowerCase());
            const tok1 = known.get(token1.toLowerCase());
            const sym0 = tok0?.symbol ?? '?';
            const sym1 = tok1?.symbol ?? '?';
            const d0 = tok0?.decimals ?? 18;
            const d1 = tok1?.decimals ?? 18;

            const { amount0, amount1 } = getAmountsForLiquidity(poolInfo.sqrtPriceX96, tickLower, tickUpper, liquidity);
            const amt0 = Number(amount0) / 10 ** d0;
            const amt1 = Number(amount1) / 10 ** d1;
            const inRange = poolInfo.tick >= tickLower && poolInfo.tick < tickUpper;

            // Track a reference ETH/USD from any stable/ETH pool we touch — reused for wallet valuation.
            if (derivedEthUsd === null && tok0 && tok1) {
              const eth0 = isEth(sym0);
              const eth1 = isEth(sym1);
              if ((isStable(sym0) && eth1) || (isStable(sym1) && eth0)) {
                const p = humanPriceQuotePerBase(poolInfo.sqrtPriceX96, d0, d1, eth0);
                if (isFinite(p) && p > 0) derivedEthUsd = p;
              }
            }

            const valueUsd = tok0 && tok1 ? usdValueOf(amt0, amt1, sym0, sym1, derivedEthUsd) : null;

            // Unclaimed fees — same static-collect trick as MyPositions.tsx.
            let feesUsd = 0;
            try {
              const { result } = await client.simulateContract({
                address: manager,
                abi: POSITIONS_ABI,
                functionName: 'collect',
                args: [{ tokenId: tokenIds[i], recipient: address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
                account: address,
              });
              const [owed0, owed1] = result as unknown as [bigint, bigint];
              const fee0 = Number(owed0) / 10 ** d0;
              const fee1 = Number(owed1) / 10 ** d1;
              feesUsd = tok0 && tok1 ? usdValueOf(fee0, fee1, sym0, sym1, derivedEthUsd) ?? 0 : 0;
            } catch {
              // best-effort — leave feesUsd at 0 rather than fail the whole position
            }

            // Advisor stats, once per unique pool actually held.
            let stats = statsCache.get(poolKey);
            if (stats === undefined) {
              try {
                const pair = OBSERVED_PAIRS.find(
                  (p) => p.chainId === chainId && p.feeTiers.includes(fee) &&
                    ((p.token0.address.toLowerCase() === token0.toLowerCase() && p.token1.address.toLowerCase() === token1.toLowerCase()) ||
                      (p.token0.address.toLowerCase() === token1.toLowerCase() && p.token1.address.toLowerCase() === token0.toLowerCase()))
                );
                if (pair && poolAddress) {
                  const swaps = await fetchRecentSwaps(client, poolAddress, chainId, 24);
                  const spacing = { 100: 1, 500: 10, 3000: 60, 10000: 200 }[fee] ?? 60;
                  stats = computeStats(swaps, chainId, d0, d1, fee / 1_000_000, spacing);
                } else {
                  stats = null;
                }
              } catch (e) {
                console.warn('usePortfolio: advisor stats failed', poolKey, e);
                stats = null;
              }
              statsCache.set(poolKey, stats);
            }

            let advice: RebalanceAssessment['action'] | null = null;
            let paybackDays: number | null = null;
            if (stats && valueUsd !== null) {
              try {
                const assessment = assessPosition({ tickLower, tickUpper, valueUsd }, stats, chainId, fee, fee / 1_000_000, d0, d1);
                advice = assessment.action;
                paybackDays = assessment.paybackDays;
              } catch {
                advice = null;
              }
            }

            allPositions.push({
              tokenId: tokenIds[i].toString(),
              chainId,
              poolLabel: `${sym0}/${sym1} ${(fee / 10_000).toFixed(2)}% · ${CHAIN_LABEL[chainId]}`,
              valueUsd,
              feesUsd,
              inRange,
              advice,
              paybackDays,
            });
          }
        }

        if (!cancelled) {
          setPositions(allPositions);
          setEthUsd(derivedEthUsd);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, tick]);

  const walletUsd =
    ethUsd !== null
      ? Number(ethBal?.formatted ?? 0) * ethUsd + Number(wethBal?.formatted ?? 0) * ethUsd + Number(usdcBal?.formatted ?? 0)
      : Number(usdcBal?.formatted ?? 0); // no ETH price yet — still show stablecoin balance

  const positionsUsd = positions.reduce((sum, p) => sum + (p.valueUsd ?? 0), 0);
  const feesUsd = positions.reduce((sum, p) => sum + p.feesUsd, 0);
  const positionsInRange = positions.filter((p) => p.inRange).length;
  const positionsOutOfRange = positions.length - positionsInRange;
  const hasUnknownValue = positions.some((p) => p.valueUsd === null);

  return {
    connected: isConnected,
    loading,
    error,
    walletUsd,
    positionsUsd,
    totalUsd: walletUsd + positionsUsd,
    feesUsd,
    positionsInRange,
    positionsOutOfRange,
    hasUnknownValue,
    positions,
    refresh,
  };
}
