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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { Pool } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { NETWORKS, POOL_FACTORY_ABI, POOL_ABI } from '../utils/uniswap';
import { POSITION_MANAGER_ADDRESSES } from '../utils/liquidityManagement';
import { OBSERVED_PAIRS } from '../config/pools';
import { findBotPoolByAddress } from '../config/botPools';
import { getAmountsForLiquidity, humanPriceQuotePerBase, MAX_UINT128 } from '../utils/v3math';
import { fetchRecentSwaps, computeStats, assessPosition, suggestRange, ADVISOR_PARAMS, RebalanceAssessment, RangeSuggestion } from '../utils/advisor';
import { UseBotApi } from './useBotApi';

const CHAIN_IDS = [1, 8453, 42161] as const;
const CHAIN_LABEL: Record<number, string> = { 1: 'Ethereum', 8453: 'Base', 42161: 'Arbitrum' };
const FACTORY: Record<number, Address> = {
  1: NETWORKS.MAINNET.poolFactoryAddress,
  8453: NETWORKS.BASE.poolFactoryAddress,
  42161: NETWORKS.ARBITRUM.poolFactoryAddress,
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
  // --- Partia 3 (TASKS-UI.md): dane surowe potrzebne dla akcji na kartach
  // kokpitu (Zbierz fees / Zamknij / Rebalans ręczny — zob. useCockpitActions.ts).
  // Wszystko poniżej pochodzi z odczytów już wykonanych powyżej w tej pętli —
  // żadnych dodatkowych zapytań RPC.
  positionManager: Address;
  poolAddress: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string; // bigint (płynność TEJ pozycji, nie całej puli) jako string
  token0: { address: Address; symbol: string; decimals: number };
  token1: { address: Address; symbol: string; decimals: number };
  /** SDK Pool zbudowany raz tutaj — używany przez prepareRemoveLiquidityTransaction
   *  / createPosition w useCockpitActions.ts. null gdy budowa się nie powiodła
   *  (np. brakujące metadane tokenu) — akcje wymagające Pool są wtedy wyłączone. */
  pool: Pool | null;
  amount0: number; // aktualne kwoty w pozycji (human units)
  amount1: number;
  feeAmount0: number; // nieodebrane fee (human units, nie USD)
  feeAmount1: number;
  /** Te same nieodebrane fee co feeAmount0/1, ale jako bigint (string) w
   *  jednostkach raw — Partia 4b: rebalanceBuilder.ts's planRebalance()
   *  chce feesOwed0/1 dokładnie (bigint), nie zaokrąglone Number(). '0' gdy
   *  odczyt fee się nie powiódł (patrz catch niżej — feeAmount0/1 też wtedy 0). */
  feesOwed0Raw: string;
  feesOwed1Raw: string;
  suggestion: RangeSuggestion | null; // sugerowany zakres doradcy — do rebalansu ręcznego
  /** PARTIA 20 pkt 1: skąd pochodzi `suggestion` — 'bot' gdy pula jest
   *  ŚLEDZONA przez bota i mieliśmy jego gotową sugestię (bot.state.pools[].suggestion,
   *  ta sama liczba co bot faktycznie gra, SIGMA_MODE bota włącznie); 'ui-estimate'
   *  gdy to własne liczenie tego hooka (suggestRange/assessPosition, estymator
   *  swapowy przeglądarki) — jedyny wypadek TERAZ to pula spoza konfiguracji
   *  bota (findBotPoolByAddress nic nie znalazł). `null` = brak sugestii w ogóle. */
  suggestionSource: 'bot' | 'ui-estimate' | null;
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
  /** Referencyjny kurs ETH/USD wyprowadzony z pierwszej napotkanej puli
   *  stable/ETH wśród pozycji (patrz `derivedEthUsd` niżej) — null, gdy
   *  użytkownik nie ma żadnej takiej pozycji. Reużywany przez
   *  useCockpitActions.ts (Fix 25.08: żywy próg [Zbierz fees]) zamiast
   *  osobnego odczytu kursu. */
  ethUsd: number | null;
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

/**
 * FIX 01.09 (Fable): wycena przez KURS PULI dla par bez ścieżki w usdValueOf
 * (np. cbBTC/WETH — brak nogi stabilnej). Objaw: karta kokpitu pokazywała
 * „Fee narosłe $0.00" na wąskiej nodze eksperymentu (#5908083), podczas gdy
 * bot i Uniswap widziały ~$0.7 — feesUsd robiło `?? 0` na null z usdValueOf.
 * Nieznaną nogę sprowadzamy kursem puli (sqrtPriceX96) do nogi ETH/stabilnej,
 * potem do USD. Naprawia też wartość pozycji (znika fallback „(wycena bota)").
 * Uwaga: gałęzie ETH wymagają derivedEthUsd — wyprowadzanego z wcześniej
 * przetworzonej puli stable/ETH (kolejność pętli, jak dotychczas).
 */
const usdValueViaPool = (
  amount0: number,
  amount1: number,
  sym0: string,
  sym1: string,
  ethUsd: number | null,
  sqrtPriceX96: bigint,
  d0: number,
  d1: number
): number | null => {
  const direct = usdValueOf(amount0, amount1, sym0, sym1, ethUsd);
  if (direct !== null) return direct;
  // Noga ETH + noga niewyceniana (cbBTC/WETH): drugą nogę przeliczamy kursem puli na ETH.
  if (isEth(sym0) && ethUsd !== null) {
    const p1InEth = humanPriceQuotePerBase(sqrtPriceX96, d0, d1, false); // ETH (token0) za 1 token1
    return (amount0 + amount1 * p1InEth) * ethUsd;
  }
  if (isEth(sym1) && ethUsd !== null) {
    const p0InEth = humanPriceQuotePerBase(sqrtPriceX96, d0, d1, true); // ETH (token1) za 1 token0
    return (amount1 + amount0 * p0InEth) * ethUsd;
  }
  // Noga stabilna + noga niewyceniana (np. WBTC/USDC): kurs puli daje USD wprost.
  if (isStable(sym0)) {
    const p1InUsd = humanPriceQuotePerBase(sqrtPriceX96, d0, d1, false);
    return amount0 + amount1 * p1InUsd;
  }
  if (isStable(sym1)) {
    const p0InUsd = humanPriceQuotePerBase(sqrtPriceX96, d0, d1, true);
    return amount1 + amount0 * p0InUsd;
  }
  return null;
};

export function usePortfolio(bot?: UseBotApi): PortfolioSummary {
  const { address, isConnected } = useAccount();
  const clientMainnet = usePublicClient({ chainId: 1 });
  const clientBase = usePublicClient({ chainId: 8453 });
  const clientArbitrum = usePublicClient({ chainId: 42161 });
  const clients: Record<number, ReturnType<typeof usePublicClient>> = { 1: clientMainnet, 8453: clientBase, 42161: clientArbitrum };

  // Salda portfela — WSZYSTKIE TRZY SIECI.
  // BŁĄD ZNALEZIONY 21.08: do tej pory liczony był wyłącznie mainnet (komentarz
  // brzmiał „Mirrors CompactWalletInfo's balance fetch (mainnet ETH/WETH/USDC)"),
  // podczas gdy pozycje czytamy z mainnet+Base+Arbitrum. Efekt: „Wartość łączna"
  // w kokpicie ZANIŻAŁA stan portfela o wszystko, co leży na L2 — u Rafała
  // ukrywało to 152 USDC na Arbitrum.
  // Hooki wypisane jawnie (nie w pętli): ich liczba musi być stała między
  // renderami — patrz dwa dzisiejsze crashe „Rendered more hooks…".
  const { data: ethBalM } = useBalance({ address, chainId: 1 });
  const { data: wethBalM } = useBalance({ address, token: NETWORKS.MAINNET.tokens.WETH.address, chainId: 1 });
  const { data: usdcBalM } = useBalance({ address, token: NETWORKS.MAINNET.tokens.USDC.address, chainId: 1 });
  const { data: ethBalB } = useBalance({ address, chainId: 8453 });
  const { data: wethBalB } = useBalance({ address, token: NETWORKS.BASE.tokens.WETH.address, chainId: 8453 });
  const { data: usdcBalB } = useBalance({ address, token: NETWORKS.BASE.tokens.USDC.address, chainId: 8453 });
  const { data: ethBalA } = useBalance({ address, chainId: 42161 });
  const { data: wethBalA } = useBalance({ address, token: NETWORKS.ARBITRUM.tokens.WETH.address, chainId: 42161 });
  const { data: usdcBalA } = useBalance({ address, token: NETWORKS.ARBITRUM.tokens.USDC.address, chainId: 42161 });

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
          const poolCache = new Map<string, { address: Address; sqrtPriceX96: bigint; tick: number; liquidity: bigint }>();
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
            if (!poolInfo) {
              try {
                const poolAddr = (await client.readContract({
                  address: FACTORY[chainId],
                  abi: POOL_FACTORY_ABI,
                  functionName: 'getPool',
                  args: [token0, token1, fee],
                })) as Address;
                if (poolAddr === '0x0000000000000000000000000000000000000000') continue;
                const [slot0, poolLiquidity] = await Promise.all([
                  client.readContract({ address: poolAddr, abi: POOL_ABI, functionName: 'slot0' }) as Promise<
                    readonly [bigint, number, number, number, number, number, boolean]
                  >,
                  client.readContract({ address: poolAddr, abi: POOL_ABI, functionName: 'liquidity' }) as Promise<bigint>,
                ]);
                poolInfo = { address: poolAddr, sqrtPriceX96: slot0[0], tick: slot0[1], liquidity: poolLiquidity };
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

            const valueUsd = tok0 && tok1
              ? usdValueViaPool(amt0, amt1, sym0, sym1, derivedEthUsd, poolInfo.sqrtPriceX96, d0, d1)
              : null;

            // Unclaimed fees — same static-collect trick as MyPositions.tsx.
            let feesUsd = 0;
            let feeAmount0 = 0;
            let feeAmount1 = 0;
            let feesOwed0Raw = 0n;
            let feesOwed1Raw = 0n;
            try {
              const { result } = await client.simulateContract({
                address: manager,
                abi: POSITIONS_ABI,
                functionName: 'collect',
                args: [{ tokenId: tokenIds[i], recipient: address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
                account: address,
              });
              const [owed0, owed1] = result as unknown as [bigint, bigint];
              feesOwed0Raw = owed0;
              feesOwed1Raw = owed1;
              feeAmount0 = Number(owed0) / 10 ** d0;
              feeAmount1 = Number(owed1) / 10 ** d1;
              feesUsd = tok0 && tok1
                ? usdValueViaPool(feeAmount0, feeAmount1, sym0, sym1, derivedEthUsd, poolInfo.sqrtPriceX96, d0, d1) ?? 0
                : 0;
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
                if (pair) {
                  const swaps = await fetchRecentSwaps(client, poolInfo.address, chainId, 24);
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
            // Sugerowany zakres doradcy — liczony gdy mamy statystyki, niezależnie
            // od tego, czy dało się wycenić pozycję w USD (rebalans ręczny nadal
            // ma sens, tylko bez oceny opłacalności/payback).
            // PARTIA 20 pkt 1: to liczenie (suggestRange/assessPosition, estymator
            // swapowy przeglądarki — SIGMA_MODE bota tu NIE obowiązuje) jest teraz
            // TYLKO fallbackiem dla pul spoza konfiguracji bota. Dla pul ŚLEDZONYCH
            // przez bota nadpisujemy `suggestion` gotową liczbą z bot.state.pools[]
            // niżej (w useMemo po tej pętli, żeby nie triggerować ponownego RPC
            // przy każdym pollu /api/state — patrz komentarz przy `positionsWithBotSuggestion`).
            let suggestion: RangeSuggestion | null = null;
            if (stats) {
              // SPÓJNOŚĆ PROGNOZY cbBTC (HANDOFF Fable→Sonnet 26.08/28.08 rano):
              // ADVISOR_PARAMS.k=3 to domyślne dla par ETH/stable — pary
              // skorelowane (cbBTC/WETH) grają na żywo z zamrożonym profilem
              // v1.2 bota, k=2 (bot/config.ts BotPool.advisorK). Ten hook był
              // JEDYNYM call site'em suggestRange/assessPosition w całej UI
              // (Doradca ±X% w RebalanceModal, REBALANCE/WAIT_NOT_PROFITABLE
              // na kartach) i zawsze spadał na globalne k=3, nawet dla cbBTC —
              // do czasu rekalibracji UI ma pokazywać to, co faktycznie gra
              // bot, nie osobną (bardziej agresywną) matematykę. Override
              // per pula przez BOT_POOL_META.advisorK (duplikat bot/config.ts,
              // ta sama konwencja co reszta botPools.ts), zero nowych requestów.
              const botMeta = findBotPoolByAddress(chainId, poolInfo.address);
              const advisorParams = botMeta?.advisorK ? { ...ADVISOR_PARAMS, k: botMeta.advisorK } : ADVISOR_PARAMS;
              try {
                suggestion = suggestRange(stats, fee, d0, d1, advisorParams);
              } catch {
                suggestion = null;
              }
              if (valueUsd !== null) {
                try {
                  const assessment = assessPosition({ tickLower, tickUpper, valueUsd }, stats, chainId, fee, fee / 1_000_000, d0, d1, advisorParams);
                  advice = assessment.action;
                  paybackDays = assessment.paybackDays;
                  suggestion = assessment.suggestion;
                } catch {
                  advice = null;
                }
              }
            }

            // SDK Pool — zbudowany raz tutaj z danych już odczytanych powyżej,
            // reużywany przez useCockpitActions.ts (Zamknij/Rebalans) bez
            // dodatkowych zapytań RPC ani duplikowania konstrukcji Pool.
            let sdkPool: Pool | null = null;
            try {
              const t0Token = new Token(chainId, token0, d0, sym0 || undefined);
              const t1Token = new Token(chainId, token1, d1, sym1 || undefined);
              sdkPool = new Pool(t0Token, t1Token, fee, poolInfo.sqrtPriceX96.toString(), poolInfo.liquidity.toString(), poolInfo.tick);
            } catch (e) {
              console.warn('usePortfolio: building SDK Pool failed', poolKey, e);
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
              positionManager: manager,
              poolAddress: poolInfo.address,
              fee,
              tickLower,
              tickUpper,
              liquidity: liquidity.toString(),
              token0: { address: token0, symbol: sym0, decimals: d0 },
              token1: { address: token1, symbol: sym1, decimals: d1 },
              pool: sdkPool,
              amount0: amt0,
              amount1: amt1,
              feeAmount0,
              feeAmount1,
              feesOwed0Raw: feesOwed0Raw.toString(),
              feesOwed1Raw: feesOwed1Raw.toString(),
              suggestion,
              suggestionSource: suggestion ? 'ui-estimate' : null,
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

  // PARTIA 20 pkt 1: override sugestii dla pul ŚLEDZONYCH przez bota — osobny
  // useMemo NAD efektem z RPC, nie w jego zależnościach, żeby poll /api/state
  // (co 60s, useBotApi) NIE triggerował ponownego przejścia po wszystkich
  // pozycjach on-chain (drogie RPC) — tylko przelicza istniejące `positions`
  // z najświeższym bot.state.pools[].suggestion. Zero nowych requestów: dane
  // z bota już są w pamięci (useBotApi), tu tylko dopasowanie po adresie puli.
  const positionsWithBotSuggestion = useMemo<PortfolioPosition[]>(() => {
    const botPools = bot?.state?.pools;
    if (!botPools || !botPools.length) return positions;
    return positions.map((p) => {
      const botMeta = findBotPoolByAddress(p.chainId, p.poolAddress);
      if (!botMeta) return p; // pula spoza konfiguracji bota — zostaje własna estymata (albo brak)
      const botLive = botPools.find((pl) => pl.id === botMeta.id);
      if (!botLive?.suggestion) return p; // bot jeszcze nie ma świeżej sugestii dla tej puli — zostaje fallback
      return { ...p, suggestion: { ...botLive.suggestion }, suggestionSource: 'bot' as const };
    });
  }, [positions, bot?.state?.pools]);

  const num = (b?: { formatted: string }) => Number(b?.formatted ?? 0);
  // ETH i WETH sumujemy przez wszystkie sieci (ten sam kurs), USDC to 1:1 USD.
  // cbBTC na Base świadomie POMINIĘTE — wymagałoby kursu BTC, którego UI nie
  // ma (bot liczy go przez pulę referencyjną). Jeśli kiedyś trzymamy tam realny
  // kapitał, trzeba dociągnąć cenę, inaczej „Wartość łączna" znów będzie zaniżać.
  const ethLike = num(ethBalM) + num(wethBalM) + num(ethBalB) + num(wethBalB) + num(ethBalA) + num(wethBalA);
  const stables = num(usdcBalM) + num(usdcBalB) + num(usdcBalA);
  const walletUsd = ethUsd !== null ? ethLike * ethUsd + stables : stables; // bez kursu ETH pokazujemy chociaż stablecoiny

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
    positions: positionsWithBotSuggestion,
    refresh,
    ethUsd,
  };
}
